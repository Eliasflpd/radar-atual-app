// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — RETORNOS E RETOQUES (10/11/2026)
// Ações "rt_*" via api/_lib/brow-studio.js.
//
// • Acompanhamento ligado a um atendimento REALIZADO da agenda (origem). No
//   máximo 1 acompanhamento aberto por (atendimento de origem, tipo).
// • Data prevista é da profissional: nenhum prazo clínico é sugerido.
//   Planejar NÃO reserva horário.
// • SITUAÇÃO É DERIVADA da Agenda (nunca de uma cópia que pode desatualizar):
//     cancelado / concluido (explícitos) → reserva ativa vinculada = agendado
//     → encaixe ativo vinculado = encaixe → senão pendente.
//   Horário cancelado na Agenda ⇒ o planejamento volta a pendente (mantido).
//   Remarcar na Agenda atualiza a MESMA reserva (sem reserva nova).
// • O vínculo com a reserva/encaixe nasce DENTRO da transação de ag_criar /
//   enc_criar (função vincular), que recusa uma segunda reserva ativa.
// • Data passada só é destacada: não vira falta, cancelamento nem conclusão.
// • Cobrança: a_definir | sem_cobranca | cobrado (centavos inteiros). Receita
//   só por ação explícita, uma por acompanhamento (e uma por reserva).
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const TIPOS = { avaliacao: 'Avaliação', manutencao: 'Manutenção', retoque: 'Retoque' };
const COBRANCAS = { a_definir: 'A definir', sem_cobranca: 'Sem cobrança', cobrado: 'Cobrado' };
const SITUACOES = { pendente: 'Pendente', encaixe: 'Aguardando encaixe', agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };
const AG_ATIVO = ['agendado', 'confirmado', 'chegou', 'em_atendimento'];
const ENC_ATIVO = ['aguardando', 'chamado'];
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_retornos(
    id text primary key, estab text not null,
    cliente_id text not null, cliente_nome text not null,
    origem_agendamento_id text not null, origem_servico_id text, origem_servico_nome text not null, origem_data date not null,
    profissional_id text, profissional_nome text,
    tipo text not null check (tipo in ('avaliacao','manutencao','retoque')),
    data_prevista date not null, whatsapp text,
    servico_retorno_id text, servico_retorno_nome text,
    cobranca text not null default 'a_definir' check (cobranca in ('a_definir','sem_cobranca','cobrado')),
    valor_centavos integer check (valor_centavos is null or valor_centavos > 0),
    politica text, politica_versao text, observacoes text,
    agendamento_id text, encaixe_id text, registro_id text, lancamento_id text,
    cancelado boolean not null default false, cancel_motivo text, cancelado_em timestamptz,
    concluido boolean not null default false, concluido_em timestamptz,
    criado_por text, chave_envio text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
    check (cobranca <> 'cobrado' or valor_centavos > 0))`);
  await c.query(`create unique index if not exists brow_rt_envio on brow_retornos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_rt_aberto on brow_retornos(estab, origem_agendamento_id, tipo) where not cancelado and not concluido`);
  await c.query(`create index if not exists brow_rt_cliente on brow_retornos(estab, cliente_id)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');
function telefoneValido(d) { if (d.length !== 10 && d.length !== 11) return false; if (!DDD_BR.has(d.slice(0, 2))) return false; return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]); }
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function centavos(v) {
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  const [i, d = ''] = s.replace(/\./g, '').split(',');
  const n = parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10);
  return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
}
async function hoje(c, estab) {
  let fuso = 'America/Sao_Paulo';
  try { const r = await c.query('select fuso from brow_config where estab=$1', [estab]); if (r.rows[0] && FUSOS.includes(r.rows[0].fuso)) fuso = r.rows[0].fuso; } catch (e) {}
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
async function historico(c, estab, id, acao, det) {
  await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'retorno',$2,$3,$4)`, [estab, id, acao, det ? JSON.stringify(det) : null]);
}
const minHhmm = (m) => m == null ? null : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// situação derivada (reserva = a vinculada direta ou a criada ao efetivar o encaixe)
const SEL = `select r.*, to_char(r.data_prevista,'YYYY-MM-DD') prevista, to_char(r.origem_data,'YYYY-MM-DD') odata,
    a.id ag_id, a.situacao ag_sit, to_char(a.data,'YYYY-MM-DD') ag_data, a.inicio_min ag_inicio, a.fim_min ag_fim, a.profissional_nome ag_prof, a.servico_nome ag_servico,
    e.situacao enc_sit, to_char(e.data,'YYYY-MM-DD') enc_data, e.ordem enc_ordem,
    case when r.cancelado then 'cancelado' when r.concluido then 'concluido'
      when a.situacao in ('agendado','confirmado','chegou','em_atendimento','concluido') then 'agendado'
      when e.situacao in ('aguardando','chamado') and e.agendamento_id is null then 'encaixe'
      else 'pendente' end situacao
  from brow_retornos r
  left join brow_encaixes e on e.estab=r.estab and e.id=r.encaixe_id
  left join brow_agendamentos a on a.estab=r.estab and a.id=coalesce(r.agendamento_id, e.agendamento_id)`;
function linha(x, hj) {
  const aberto = ['pendente', 'encaixe'].includes(x.situacao);
  return { id: x.id, cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, origem_agendamento_id: x.origem_agendamento_id, origem_servico_nome: x.origem_servico_nome, origem_data: x.odata,
    profissional_id: x.profissional_id, profissional_nome: x.profissional_nome, tipo: x.tipo, tipo_nome: TIPOS[x.tipo], data_prevista: x.prevista, whatsapp: x.whatsapp,
    servico_retorno_id: x.servico_retorno_id, servico_retorno_nome: x.servico_retorno_nome, cobranca: x.cobranca, cobranca_nome: COBRANCAS[x.cobranca], valor_centavos: x.valor_centavos,
    politica: x.politica, politica_versao: x.politica_versao, observacoes: x.observacoes, registro_id: x.registro_id, lancamento_id: x.lancamento_id,
    cancel_motivo: x.cancel_motivo, criado_por: x.criado_por, situacao: x.situacao, situacao_nome: SITUACOES[x.situacao],
    ultrapassada: aberto && x.prevista < hj,
    reserva: x.ag_id ? { id: x.ag_id, situacao: x.ag_sit, data: x.ag_data, inicio: minHhmm(x.ag_inicio), fim: minHhmm(x.ag_fim), profissional: x.ag_prof, servico: x.ag_servico, ativa: AG_ATIVO.includes(x.ag_sit) } : null,
    encaixe: x.encaixe_id ? { id: x.encaixe_id, situacao: x.enc_sit, data: x.enc_data, ordem: x.enc_ordem, ativo: ENC_ATIVO.includes(x.enc_sit) } : null };
}

// Chamado pela Agenda DENTRO da transação de ag_criar/enc_criar.
// Recusa se o acompanhamento já tem reserva/encaixe ativo, está encerrado ou é de outra cliente.
async function vincular(c, estab, retornoId, { agendamentoId, encaixeId, clienteId }) {
  await garantirTabelas(c);
  const r = await c.query('select * from brow_retornos where estab=$1 and id=$2 for update', [estab, String(retornoId)]);
  if (!r.rows.length) return { ok: false, msg: 'Acompanhamento de retorno não encontrado.' };
  const x = r.rows[0];
  if (x.cancelado || x.concluido) return { ok: false, msg: 'Este acompanhamento já foi encerrado.' };
  if (clienteId && x.cliente_id !== clienteId) return { ok: false, msg: 'A cliente não corresponde ao acompanhamento de retorno.' };
  const s = (await c.query(`${SEL} where r.estab=$1 and r.id=$2`, [estab, x.id])).rows[0];
  if (s.ag_id && AG_ATIVO.includes(s.ag_sit)) return { ok: false, msg: 'Este retorno já tem horário ativo. Use “Remarcar” para mudar.' };
  if (s.situacao === 'encaixe' && agendamentoId) return { ok: false, msg: 'Este retorno está na lista de encaixe. Efetive ou encerre o encaixe pela Agenda.' };
  if (s.situacao === 'encaixe' && encaixeId) return { ok: false, msg: 'Este retorno já está na lista de encaixe.' };
  await c.query('update brow_retornos set agendamento_id=$3, encaixe_id=$4, atualizado_em=now() where estab=$1 and id=$2', [estab, x.id, agendamentoId || null, encaixeId || null]);
  await historico(c, estab, x.id, agendamentoId ? 'agendado' : 'encaixe', { agendamento_id: agendamentoId || null, encaixe_id: encaixeId || null });
  return { ok: true };
}

module.exports = async function retornos(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;
  const hj = await hoje(c, estab);

  if (acao === 'rt_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let f = '';
    if (q.cliente) { params.push(String(q.cliente)); f += ` and cliente_id=$${params.length}`; }
    if (q.origem) { params.push(String(q.origem)); f += ` and origem_agendamento_id=$${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) {
      params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
      f += ` and translate(lower(cliente_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $${params.length}`;
    }
    const fl = String(q.filtro || 'todos');
    if (fl === 'pendentes') f += ` and situacao in ('pendente','encaixe')`;
    if (fl === 'agendados') f += ` and situacao='agendado'`;
    if (fl === 'concluidos') f += ` and situacao='concluido'`;
    if (fl === 'cancelados') f += ` and situacao='cancelado'`;
    if (fl === 'ultrapassada') { params.push(hj); f += ` and situacao in ('pendente','encaixe') and prevista < $${params.length}`; }
    const base = `select * from (${SEL} where r.estab=$1) x where true${f}`;
    const tot = await c.query(`select count(*)::int n from (${base}) y`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`${base} order by (situacao in ('pendente','encaixe','agendado')) desc, prevista asc, criado_em limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, itens: r.rows.map(x => linha(x, hj)) });
    return;
  }

  if (acao === 'rt_ver') {
    const r = await c.query(`${SEL} where r.estab=$1 and r.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.');
    const x = linha(r.rows[0], hj);
    const cl = (await c.query('select telefone, contato_pref, lembretes from brow_clientes where estab=$1 and id=$2', [estab, x.cliente_id])).rows[0] || {};
    let lanc = null;
    if (x.lancamento_id) { const l = await c.query('select id, cancelado, total_centavos from brow_fin_lancamentos where estab=$1 and id=$2', [estab, x.lancamento_id]).catch(() => ({ rows: [] })); lanc = l.rows[0] || null; }
    const cfg = await c.query('select nome_estudio from brow_config where estab=$1', [estab]).catch(() => ({ rows: [] }));
    res.status(200).json({ ok: true, hoje: hj, retorno: x, cliente: { telefone: cl.telefone || null, contato_pref: cl.contato_pref || null }, lancamento: lanc,
      estudio: (cfg.rows[0] && cfg.rows[0].nome_estudio) || 'Brow Studio' });
    return;
  }

  // atendimentos REALIZADOS (agenda: concluído) para escolher a origem
  if (acao === 'rt_origens') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const params = [estab]; let f = '';
    if (q.cliente) { params.push(String(q.cliente)); f += ` and cliente_id=$${params.length}`; }
    if (q.id) { params.push(String(q.id)); f += ` and id=$${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) { params.push('%' + termo.toLowerCase() + '%'); f += ` and lower(cliente_nome) like $${params.length}`; }
    const tot = await c.query(`select count(*)::int n from brow_agendamentos where estab=$1 and situacao='concluido'${f}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, cliente_id, cliente_nome, whatsapp, servico_id, servico_nome, profissional_id, profissional_nome, to_char(data,'YYYY-MM-DD') data, inicio_min
      from brow_agendamentos where estab=$1 and situacao='concluido'${f} order by data desc, inicio_min desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    const ids = r.rows.map(x => x.cliente_id);
    const tel = ids.length ? (await c.query('select id, telefone from brow_clientes where estab=$1 and id = any($2)', [estab, ids])).rows : [];
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(x => ({ ...x, inicio: minHhmm(x.inicio_min), telefone_cadastro: (tel.find(t => t.id === x.cliente_id) || {}).telefone || null })) });
    return;
  }
  if (acao === 'rt_aberto') {
    const r = await c.query('select id from brow_retornos where estab=$1 and origem_agendamento_id=$2 and tipo=$3 and not cancelado and not concluido', [estab, String(q.origem || ''), String(q.tipo || '')]);
    res.status(200).json({ ok: true, id: r.rows[0] ? r.rows[0].id : null });
    return;
  }

  // ── CRIAR / EDITAR (edição exige motivo; vínculo com a origem não muda) ──
  if (req.method === 'POST' && acao === 'rt_salvar') {
    const b = corpo(req); const erros = {}; const out = {};
    if (!b.id && !TIPOS[b.tipo]) erros.tipo = 'Escolha o tipo de acompanhamento.';
    if (!dataValida(b.data_prevista)) erros.data_prevista = 'Informe a data prevista.';
    const tel = digitos(b.whatsapp);
    if (tel && !telefoneValido(tel)) erros.whatsapp = 'WhatsApp inválido. Use DDD + número.';
    out.whatsapp = tel || null;
    if (!COBRANCAS[b.cobranca]) erros.cobranca = 'Escolha a cobrança.';
    out.cobranca = b.cobranca;
    out.valor_centavos = null;
    if (b.cobranca === 'cobrado') { const v = centavos(b.valor); if (!v) erros.valor = 'Informe um valor maior que zero (até 2 casas, com vírgula).'; else out.valor_centavos = v; }
    out.politica = txt(b.politica, 200); out.politica_versao = out.politica ? txt(b.politica_versao, 40) : null;
    out.observacoes = b.observacoes == null ? null : (String(b.observacoes).trim().slice(0, 1000) || null);
    let sv = null;
    if (b.servico_retorno_id) { const s = await c.query('select id, nome from brow_servicos where estab=$1 and id=$2', [estab, String(b.servico_retorno_id)]); sv = s.rows[0] || null; if (!sv) erros.servico_retorno_id = 'Serviço não encontrado.'; }
    if (b.id) {
      const motivo = txt(b.motivo, 300);
      if (!motivo || motivo.length < 3) erros.motivo = 'Informe o motivo da alteração.';
      if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
      await c.query('begin');
      try {
        const r = await c.query(`select *, to_char(data_prevista,'YYYY-MM-DD') prevista, to_char(origem_data,'YYYY-MM-DD') odata from brow_retornos where estab=$1 and id=$2 for update`, [estab, String(b.id)]);
        if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.'); }
        const a = r.rows[0];
        if (a.cancelado || a.concluido) { await c.query('rollback'); return erro(res, 409, 'encerrado', 'Acompanhamento encerrado não pode ser alterado.'); }
        if (b.data_prevista < a.odata) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { data_prevista: 'A data prevista não pode ser anterior ao atendimento original.' } }); }
        const novo = { data_prevista: b.data_prevista, whatsapp: out.whatsapp, servico_retorno_id: sv ? sv.id : null, servico_retorno_nome: sv ? sv.nome : null, cobranca: out.cobranca, valor_centavos: out.valor_centavos, politica: out.politica, politica_versao: out.politica_versao, observacoes: out.observacoes };
        const ant = { ...a, data_prevista: a.prevista };
        const mud = {}; for (const k of Object.keys(novo)) if (String(ant[k] == null ? '' : ant[k]) !== String(novo[k] == null ? '' : novo[k])) mud[k] = { de: ant[k], para: novo[k] };
        await c.query(`update brow_retornos set data_prevista=$3, whatsapp=$4, servico_retorno_id=$5, servico_retorno_nome=$6, cobranca=$7, valor_centavos=$8, politica=$9, politica_versao=$10, observacoes=$11, atualizado_em=now() where estab=$1 and id=$2`,
          [estab, a.id, novo.data_prevista, novo.whatsapp, novo.servico_retorno_id, novo.servico_retorno_nome, novo.cobranca, novo.valor_centavos, novo.politica, novo.politica_versao, novo.observacoes]);
        let atualizouCadastro = false;
        if (b.atualizar_cadastro === true && tel) { const u = await c.query('update brow_clientes set telefone=$3, atualizado_em=now() where estab=$1 and id=$2 and coalesce(telefone,\'\')<>$3', [estab, a.cliente_id, tel]); atualizouCadastro = u.rowCount > 0; }
        await historico(c, estab, a.id, 'editado', { autor: usuario, motivo, mudancas: mud, atualizou_cadastro: atualizouCadastro });
        await c.query('commit');
        res.status(200).json({ ok: true, id: a.id }); return;
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
    }
    const o = await c.query(`select id, cliente_id, cliente_nome, servico_id, servico_nome, profissional_id, profissional_nome, to_char(data,'YYYY-MM-DD') data, situacao from brow_agendamentos where estab=$1 and id=$2`, [estab, String(b.origem_agendamento_id || '')]);
    if (!o.rows.length) erros.origem = 'Escolha o atendimento original.';
    else if (o.rows[0].situacao !== 'concluido') erros.origem = 'O atendimento original precisa estar realizado (concluído na agenda).';
    const og = o.rows[0];
    if (og && dataValida(b.data_prevista) && b.data_prevista < og.data) erros.data_prevista = 'A data prevista não pode ser anterior ao atendimento original.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    await c.query('begin');
    try {
      const id = crypto.randomUUID();
      const ins = await c.query(`insert into brow_retornos(id,estab,cliente_id,cliente_nome,origem_agendamento_id,origem_servico_id,origem_servico_nome,origem_data,profissional_id,profissional_nome,
          tipo,data_prevista,whatsapp,servico_retorno_id,servico_retorno_nome,cobranca,valor_centavos,politica,politica_versao,observacoes,criado_por,chave_envio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) on conflict do nothing returning id`,
        [id, estab, og.cliente_id, og.cliente_nome, og.id, og.servico_id, og.servico_nome, og.data, og.profissional_id, og.profissional_nome,
          b.tipo, b.data_prevista, out.whatsapp, sv ? sv.id : null, sv ? sv.nome : null, out.cobranca, out.valor_centavos, out.politica, out.politica_versao, out.observacoes, usuario, chave]);
      if (!ins.rows.length) {
        await c.query('rollback');
        const ja = await c.query('select id from brow_retornos where estab=$1 and chave_envio=$2', [estab, chave]);
        if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
        const ab = await c.query('select id from brow_retornos where estab=$1 and origem_agendamento_id=$2 and tipo=$3 and not cancelado and not concluido', [estab, og.id, b.tipo]);
        return erro(res, 409, 'ja_existe', `Já existe ${TIPOS[b.tipo].toLowerCase()} aberto para este atendimento.`, { id: ab.rows[0] ? ab.rows[0].id : null });
      }
      let atualizouCadastro = false;
      if (b.atualizar_cadastro === true && tel) { const u = await c.query('update brow_clientes set telefone=$3, atualizado_em=now() where estab=$1 and id=$2 and coalesce(telefone,\'\')<>$3', [estab, og.cliente_id, tel]); atualizouCadastro = u.rowCount > 0; }
      await historico(c, estab, id, 'criado', { autor: usuario, tipo: b.tipo, data_prevista: b.data_prevista, cobranca: out.cobranca, valor: out.valor_centavos, atualizou_cadastro: atualizouCadastro });
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── CANCELAR o acompanhamento (horário na agenda só se pedido explicitamente) ──
  if (req.method === 'POST' && acao === 'rt_cancelar') {
    const b = corpo(req); const erros = {};
    const motivo = txt(b.motivo, 300);
    if (!motivo || motivo.length < 3) erros.motivo = 'Informe o motivo.';
    if (b.confirmacao !== true) erros.confirmacao = 'Confirme o cancelamento.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r0 = await c.query('select id from brow_retornos where estab=$1 and id=$2 for update', [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.'); }
      const x = (await c.query(`${SEL} where r.estab=$1 and r.id=$2`, [estab, r0.rows[0].id])).rows[0];
      if (x.situacao === 'cancelado') { await c.query('rollback'); res.status(200).json({ ok: true, repetido: true }); return; }
      if (x.situacao === 'concluido') { await c.query('rollback'); return erro(res, 409, 'concluido', 'Retorno já concluído não pode ser cancelado.'); }
      const temHorario = x.ag_id && AG_ATIVO.includes(x.ag_sit), temEnc = x.situacao === 'encaixe';
      if ((temHorario || temEnc) && typeof b.cancelar_horario !== 'boolean') { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { cancelar_horario: 'Escolha o que fazer com o horário/encaixe.' } }); }
      if (b.cancelar_horario === true && temHorario) {
        await c.query(`update brow_agendamentos set situacao='cancelado', atualizado_em=now() where estab=$1 and id=$2 and situacao = any($3)`, [estab, x.ag_id, AG_ATIVO]);
        await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'agendamento',$2,'cancelado',$3)`, [estab, x.ag_id, JSON.stringify({ motivo: `Retorno cancelado: ${motivo}` })]);
      }
      if (b.cancelar_horario === true && temEnc) {
        await c.query(`update brow_encaixes set situacao='cancelado', atualizado_em=now() where estab=$1 and id=$2 and situacao = any($3)`, [estab, x.encaixe_id, ENC_ATIVO]);
        await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'encaixe',$2,'cancelado',$3)`, [estab, x.encaixe_id, JSON.stringify({ motivo: `Retorno cancelado: ${motivo}` })]);
      }
      await c.query('update brow_retornos set cancelado=true, cancel_motivo=$3, cancelado_em=now(), atualizado_em=now() where estab=$1 and id=$2', [estab, x.id, motivo]);
      await historico(c, estab, x.id, 'cancelado', { autor: usuario, motivo, horario_cancelado: b.cancelar_horario === true && (temHorario || temEnc), horario_mantido: b.cancelar_horario === false && (temHorario || temEnc) });
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // registros de atendimento da cliente (para vincular a realização)
  if (acao === 'rt_registros') {
    const r0 = await c.query(`select cliente_id, to_char(origem_data,'YYYY-MM-DD') odata, origem_agendamento_id from brow_retornos where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r0.rows.length) return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.');
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 5, 1), 20);
    const params = [estab, r0.rows[0].cliente_id, r0.rows[0].origem_agendamento_id];
    const base = `from brow_registros where estab=$1 and cliente_id=$2 and coalesce(agendamento_id,'') <> $3`;
    const tot = await c.query(`select count(*)::int n ${base}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, servico_nome, profissional_nome, to_char(data,'YYYY-MM-DD') data, situacao, agendamento_id ${base} order by data desc nulls last, criado_em desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }
  // ── CONCLUIR: só com registro de atendimento vinculado; nunca registra pagamento ──
  if (req.method === 'POST' && acao === 'rt_concluir') {
    const b = corpo(req);
    if (b.confirmacao !== true) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { confirmacao: 'Confirme a realização.' } });
    await c.query('begin');
    try {
      const r0 = await c.query('select id from brow_retornos where estab=$1 and id=$2 for update', [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.'); }
      const x = (await c.query(`${SEL} where r.estab=$1 and r.id=$2`, [estab, r0.rows[0].id])).rows[0];
      if (x.situacao === 'concluido') { await c.query('rollback'); res.status(200).json({ ok: true, repetido: true }); return; }
      if (x.situacao === 'cancelado') { await c.query('rollback'); return erro(res, 409, 'cancelado', 'Acompanhamento cancelado.'); }
      const g = await c.query('select id, cliente_id, agendamento_id from brow_registros where estab=$1 and id=$2', [estab, String(b.registro_id || '')]);
      if (!g.rows.length || g.rows[0].cliente_id !== x.cliente_id) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { registro_id: 'Escolha um registro de atendimento desta cliente.' } }); }
      if (g.rows[0].agendamento_id && g.rows[0].agendamento_id === x.origem_agendamento_id) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { registro_id: 'Este é o registro do atendimento original, não do retorno.' } }); }
      await c.query('update brow_retornos set concluido=true, concluido_em=now(), registro_id=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, x.id, g.rows[0].id]);
      await historico(c, estab, x.id, 'concluido', { autor: usuario, registro_id: g.rows[0].id });
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── RECEITA (só se Cobrado; uma por acompanhamento e por reserva) ──
  if (req.method === 'POST' && acao === 'rt_receita') {
    const b = corpo(req); const erros = {};
    if (!dataValida(b.vencimento)) erros.vencimento = 'Informe o vencimento.';
    const desc = txt(b.descricao, 120); if (!desc || desc.length < 2) erros.descricao = 'Informe a descrição.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await require('./brow-financeiro.js').garantirTabelas(c);
    await c.query('begin');
    try {
      const r0 = await c.query('select id from brow_retornos where estab=$1 and id=$2 for update', [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Acompanhamento não encontrado.'); }
      const x = (await c.query(`${SEL} where r.estab=$1 and r.id=$2`, [estab, r0.rows[0].id])).rows[0];
      if (x.cobranca !== 'cobrado' || !x.valor_centavos) { await c.query('rollback'); return erro(res, 409, 'cobranca', x.cobranca === 'sem_cobranca' ? 'Retorno sem cobrança: nenhuma receita é criada.' : 'Cobrança a definir: defina o valor antes de criar a receita.'); }
      if (x.lancamento_id) {
        const l = await c.query('select id, cancelado from brow_fin_lancamentos where estab=$1 and id=$2', [estab, x.lancamento_id]);
        if (l.rows.length && !l.rows[0].cancelado) { await c.query('rollback'); return erro(res, 409, 'ja_existe', 'Este retorno já tem receita no financeiro.', { id: x.lancamento_id }); }
      }
      const agId = x.ag_id && x.ag_sit !== 'cancelado' && x.ag_sit !== 'falta' ? x.ag_id : null;
      if (agId) {
        const l = await c.query('select id from brow_fin_lancamentos where estab=$1 and agendamento_id=$2 and not cancelado', [estab, agId]);
        if (l.rows.length) {   // já existe receita para este horário: vincula, não duplica
          await c.query('update brow_retornos set lancamento_id=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, x.id, l.rows[0].id]);
          await historico(c, estab, x.id, 'receita_vinculada', { autor: usuario, lancamento_id: l.rows[0].id });
          await c.query('commit');
          res.status(200).json({ ok: true, id: l.rows[0].id, existente: true }); return;
        }
      }
      const id = crypto.randomUUID();
      await c.query(`insert into brow_fin_lancamentos(id,estab,tipo,descricao,categoria,pessoa_tipo,pessoa_id,pessoa_nome,agendamento_id,servico_id,servico_nome,profissional_id,profissional_nome,total_centavos,vencimento,observacao,criado_por)
        values($1,$2,'receita',$3,'atendimento','cliente',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, estab, desc, x.cliente_id, x.cliente_nome, agId, x.servico_retorno_id, x.servico_retorno_nome || x.origem_servico_nome, x.profissional_id, x.profissional_nome, x.valor_centavos, b.vencimento,
          `${TIPOS[x.tipo]} do atendimento de ${x.odata.split('-').reverse().join('/')}${x.politica ? ` · política: ${x.politica}${x.politica_versao ? ' (v. ' + x.politica_versao + ')' : ''}` : ''}`, usuario]);
      await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,'criado',$3)`, [estab, id, JSON.stringify({ autor: usuario, total: x.valor_centavos, origem: 'retorno', retorno_id: x.id })]);
      await c.query('update brow_retornos set lancamento_id=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, x.id, id]);
      await historico(c, estab, x.id, 'receita_criada', { autor: usuario, lancamento_id: id, valor: x.valor_centavos });
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  if (acao === 'rt_historico') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30); const id = String(q.id || '');
    const tot = await c.query(`select count(*)::int n from brow_historico where estab=$1 and tipo='retorno' and ref_id=$2`, [estab, id]);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='retorno' and ref_id=$2 order by id desc limit ${limite} offset ${(pg - 1) * limite}`, [estab, id]);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports.garantirTabelas = garantirTabelas;
module.exports.vincular = vincular;
module.exports._teste = { centavos };
