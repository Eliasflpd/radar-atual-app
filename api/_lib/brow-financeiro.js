// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — FINANCEIRO E CAIXA (10/11/2026)
// Registro MANUAL de receitas e despesas. Não cobra Pix/cartão, não acessa
// banco e não movimenta dinheiro. Ações "fn_*" via api/_lib/brow-studio.js.
//
// • Dinheiro em CENTAVOS INTEIROS (integer). Somas sempre no Postgres/inteiros.
// • Lançamento (brow_fin_lancamentos) = o que se deve receber/pagar, com
//   vencimento. Movimento (brow_fin_movimentos) = cada recebimento/pagamento
//   efetivo, com a SUA data (nunca futura). Situação é calculada:
//   cancelado | pendente (0 pago) | parcial | quitado. Vencido = saldo > 0 e
//   vencimento antes de hoje (fuso do estabelecimento).
// • Nada se apaga: erro de baixa → ESTORNO (marca o movimento, com motivo e
//   autoria). Cancelar só lançamento sem movimentos ativos.
// • Resumo do período conta cada movimento pela data dele (não pelo vencimento).
// • Baixa trava a linha do lançamento (select … for update) e revalida o saldo:
//   duas baixas simultâneas não passam do total. chave_envio evita repetição.
// • Vínculo com atendimento da agenda: no máximo 1 lançamento ativo por
//   agendamento (índice único). Valor contratado é copiado (não muda depois).
// • PERMISSÃO: quando o login existir, `podeFinanceiro(usuario)` deve checar a
//   função da pessoa. Hoje só o modo de teste local passa pela trava geral.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const TIPOS = { receita: 'Receita', despesa: 'Despesa' };
const CATEGORIAS = { atendimento: 'Atendimento', venda: 'Venda', materiais: 'Materiais', aluguel: 'Aluguel', servicos: 'Serviços', outros: 'Outros' };
const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', transferencia: 'Transferência' };
const SITUACOES = { pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado', cancelado: 'Cancelado' };
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const MAX = 100000000;   // R$ 1.000.000,00

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_fin_lancamentos(
    id text primary key, estab text not null, tipo text not null check (tipo in ('receita','despesa')),
    descricao text not null, categoria text not null, pessoa_tipo text, pessoa_id text, pessoa_nome text,
    agendamento_id text, servico_id text, servico_nome text, profissional_id text, profissional_nome text,
    total_centavos integer not null check (total_centavos > 0), vencimento date not null, observacao text,
    cancelado boolean not null default false, cancelado_em timestamptz, cancelado_por text, cancel_motivo text,
    criado_por text, chave_envio text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_fin_envio on brow_fin_lancamentos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_fin_ag on brow_fin_lancamentos(estab, agendamento_id) where agendamento_id is not null and not cancelado`);
  await c.query(`create index if not exists brow_fin_venc on brow_fin_lancamentos(estab, vencimento)`);
  await c.query(`create table if not exists brow_fin_movimentos(
    id text primary key, estab text not null, lancamento_id text not null references brow_fin_lancamentos(id),
    valor_centavos integer not null check (valor_centavos > 0), forma text not null, data date not null,
    responsavel text, inicial boolean not null default false,
    estornado boolean not null default false, estorno_motivo text, estornado_em timestamptz, estornado_por text,
    chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_fin_mov_envio on brow_fin_movimentos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_fin_mov_lanc on brow_fin_movimentos(estab, lancamento_id)`);
  await c.query(`create index if not exists brow_fin_mov_data on brow_fin_movimentos(estab, data)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
// "65", "65,5", "1.234,56", "R$ 0,10" → centavos inteiros (nunca float)
function textoParaCentavos(v) {
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  s = s.replace(/\./g, '');
  const [inteiro, dec = ''] = s.split(',');
  const c = parseInt(inteiro, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  return Number.isSafeInteger(c) && c <= MAX ? c : null;
}
const reais = (c) => { const s = String(Math.abs(c | 0)).padStart(3, '0'); return `${c < 0 ? '-' : ''}R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}
async function hoje(c, estab) {
  let fuso = 'America/Sao_Paulo';
  try { const r = await c.query('select fuso from brow_config where estab=$1', [estab]); if (r.rows[0] && FUSOS.includes(r.rows[0].fuso)) fuso = r.rows[0].fuso; } catch (e) {}
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
// períodos prontos, a partir do "hoje" do estabelecimento
function periodo(p, hj) {
  const d = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const fimMes = (s) => { const x = new Date(s.slice(0, 8) + '01T12:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 1); x.setUTCDate(0); return x.toISOString().slice(0, 10); };
  if (p === 'hoje') return [hj, hj];
  if (p === 'semana') return [d(hj, -6), hj];
  if (p === 'mes') return [hj.slice(0, 8) + '01', fimMes(hj)];
  if (p === 'mes_anterior') { const a = d(hj.slice(0, 8) + '01', -1); return [a.slice(0, 8) + '01', a]; }
  return null;
}
async function historico(c, estab, id, acao, det) {
  await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,$3,$4)`, [estab, id, acao, det ? JSON.stringify(det) : null]);
}
// pago (movimentos ativos) e situação calculados em SQL
const PAGO = `coalesce((select sum(m.valor_centavos) from brow_fin_movimentos m where m.estab=l.estab and m.lancamento_id=l.id and not m.estornado),0)::int`;
const SITU = `case when l.cancelado then 'cancelado' when ${PAGO} = 0 then 'pendente' when ${PAGO} < l.total_centavos then 'parcial' else 'quitado' end`;
const SEL = `select l.*, to_char(l.vencimento,'YYYY-MM-DD') venc, ${PAGO} pago_centavos, ${SITU} situacao from brow_fin_lancamentos l`;
function linha(x, hj) {
  const saldo = x.cancelado ? 0 : Math.max(0, x.total_centavos - x.pago_centavos);
  return { ...x, vencimento: x.venc, saldo_centavos: saldo, vencido: saldo > 0 && x.venc < hj, tipo_nome: TIPOS[x.tipo], categoria_nome: CATEGORIAS[x.categoria] || x.categoria, situacao_nome: SITUACOES[x.situacao] };
}
const podeFinanceiro = (usuario) => true;   // login pendente: ver cabeçalho

function lerLancamento(b) {
  const out = {}, erros = {};
  if (!TIPOS[b.tipo]) erros.tipo = 'Escolha Receita ou Despesa.'; else out.tipo = b.tipo;
  const d = txt(b.descricao, 120); if (!d || d.length < 2) erros.descricao = 'Informe a descrição.'; else out.descricao = d;
  if (!CATEGORIAS[b.categoria]) erros.categoria = 'Escolha a categoria.'; else out.categoria = b.categoria;
  const t = textoParaCentavos(b.total); if (!t || t <= 0) erros.total = 'Informe o valor total, maior que zero.'; else out.total_centavos = t;
  if (!dataValida(b.vencimento)) erros.vencimento = 'Informe a data de vencimento.'; else out.vencimento = b.vencimento;
  out.observacao = txt(b.observacao, 300);
  out.pessoa_tipo = ['cliente', 'contato', 'livre'].includes(b.pessoa_tipo) ? b.pessoa_tipo : null;
  out.pessoa_id = out.pessoa_tipo && out.pessoa_tipo !== 'livre' && b.pessoa_id ? String(b.pessoa_id) : null;
  out.pessoa_nome = out.pessoa_tipo ? txt(b.pessoa_nome, 100) : null;
  if (!out.pessoa_nome) { out.pessoa_tipo = null; out.pessoa_id = null; }
  return { out, erros };
}
function lerMovimento(b, hj, prefixo = '') {
  const out = {}, erros = {};
  const v = textoParaCentavos(b[prefixo + 'valor']);
  if (v === null) erros[prefixo + 'valor'] = 'Valor inválido. Ex.: 20,00'; else out.valor_centavos = v;
  if (v) {
    if (!FORMAS[b[prefixo + 'forma']]) erros[prefixo + 'forma'] = 'Escolha a forma.'; else out.forma = b[prefixo + 'forma'];
    const d = b[prefixo + 'data'];
    if (!dataValida(d)) erros[prefixo + 'data'] = 'Informe a data.';
    else if (d > hj) erros[prefixo + 'data'] = 'A data não pode ser futura: registre quando acontecer.';
    else out.data = d;
  }
  return { out, erros };
}

module.exports = async function financeiro(c, estab, req, res, acao, garantirOutras) {
  if (!podeFinanceiro(req.brow_usuario)) return erro(res, 403, 'sem_permissao', 'Sem permissão para o financeiro.');
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;
  const hj = await hoje(c, estab);

  // ── RESUMO DO PERÍODO (pela data de cada movimento) ──
  if (acao === 'fn_resumo') {
    const pp = periodo(q.periodo, hj);
    const de = pp ? pp[0] : (dataValida(q.de) ? q.de : hj.slice(0, 8) + '01');
    const ate = pp ? pp[1] : (dataValida(q.ate) && q.ate >= de ? q.ate : hj);
    const m = await c.query(`select l.tipo, sum(m.valor_centavos)::bigint s, count(*)::int n from brow_fin_movimentos m join brow_fin_lancamentos l on l.id=m.lancamento_id and l.estab=m.estab
      where m.estab=$1 and not m.estornado and m.data between $2 and least($3::date, $4::date) group by l.tipo`, [estab, de, ate, hj]);
    const val = (t) => { const r = m.rows.find(x => x.tipo === t); return { centavos: r ? Number(r.s) : 0, quantidade: r ? r.n : 0 }; };
    const rec = val('receita'), pag = val('despesa');
    const p = await c.query(`select tipo, sum(total_centavos - pago_centavos)::bigint s, count(*) filter (where venc < $4)::int vencidos from (${SEL} where l.estab=$1 and not l.cancelado and l.vencimento between $2 and $3) x
      where pago_centavos < total_centavos group by tipo`, [estab, de, ate, hj]);
    const pend = (t) => { const r = p.rows.find(x => x.tipo === t); return { centavos: r ? Number(r.s) : 0, vencidos: r ? r.vencidos : 0 }; };
    res.status(200).json({ ok: true, de, ate, hoje: hj, recebimentos: rec, pagamentos: pag, movimentacao_centavos: rec.centavos - pag.centavos,
      pendente_receber: pend('receita'), pendente_pagar: pend('despesa') });
    return;
  }

  // ── LISTA (filtro de VENCIMENTO, diferente do período do resumo) ──
  if (acao === 'fn_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let f = '';
    if (TIPOS[q.tipo]) { params.push(q.tipo); f += ` and tipo=$${params.length}`; }
    if (SITUACOES[q.situacao]) { params.push(q.situacao); f += ` and situacao=$${params.length}`; }
    if (q.situacao === 'vencido') { params.push(hj); f += ` and not cancelado and pago_centavos < total_centavos and venc < $${params.length}`; }
    if (dataValida(q.de)) { params.push(q.de); f += ` and venc >= $${params.length}`; }
    if (dataValida(q.ate)) { params.push(q.ate); f += ` and venc <= $${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) {
      params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
      const sem = (col) => `translate(lower(coalesce(${col},'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')`;
      f += ` and (${sem('descricao')} like $${params.length} or ${sem('pessoa_nome')} like $${params.length})`;
    }
    const base = `select * from (${SEL} where l.estab=$1) x where true${f}`;
    const tot = await c.query(`select count(*)::int n from (${base}) y`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`${base} order by venc desc, criado_em desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, itens: r.rows.map(x => { const l = linha(x, hj); return { id: l.id, descricao: l.descricao, tipo: l.tipo, tipo_nome: l.tipo_nome, total_centavos: l.total_centavos, saldo_centavos: l.saldo_centavos, vencimento: l.vencimento, situacao: l.situacao, situacao_nome: l.situacao_nome, vencido: l.vencido, pessoa_nome: l.pessoa_nome }; }) });
    return;
  }

  if (acao === 'fn_ver') {
    const r = await c.query(`${SEL} where l.estab=$1 and l.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Lançamento não encontrado.');
    const l = linha(r.rows[0], hj);
    let atendimento = null;
    if (l.agendamento_id) {
      const a = await c.query(`select id, situacao, to_char(data,'YYYY-MM-DD') data from brow_agendamentos where estab=$1 and id=$2`, [estab, l.agendamento_id]);
      atendimento = a.rows[0] || null;
    }
    const n = await c.query(`select count(*) filter (where not estornado)::int ativos, count(*)::int todos from brow_fin_movimentos where estab=$1 and lancamento_id=$2`, [estab, l.id]);
    res.status(200).json({ ok: true, hoje: hj, lancamento: { ...l, movimentos_ativos: n.rows[0].ativos, movimentos_total: n.rows[0].todos }, atendimento });
    return;
  }

  // Origem/destino: clientes e contatos já cadastrados
  if (acao === 'fn_pessoas') {
    const termo = txt(q.q, 60); const lim = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 20);
    const params = [estab]; let f = '';
    if (termo) { params.push('%' + termo.toLowerCase() + '%'); f = ` and lower(nome) like $2`; }
    const qual = q.de === 'contato' ? 'contato' : 'cliente';
    const r = qual === 'cliente'
      ? await c.query(`select id, nome, null::text extra from brow_clientes where estab=$1${f} order by lower(nome) limit ${lim}`, params)
      : await c.query(`select id, nome, coalesce(empresa, categoria) extra from brow_contatos where estab=$1 and not arquivado${f} order by lower(nome) limit ${lim}`, params);
    res.status(200).json({ ok: true, de: qual, itens: r.rows });
    return;
  }

  // Atendimento da agenda: dados para a receita + lançamento já existente
  if (acao === 'fn_por_agendamento') {
    const a = await c.query(`select id, cliente_id, cliente_nome, servico_id, servico_nome, profissional_id, profissional_nome, valor_centavos, situacao, to_char(data,'YYYY-MM-DD') data
      from brow_agendamentos where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!a.rows.length) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
    const l = await c.query(`select id from brow_fin_lancamentos where estab=$1 and agendamento_id=$2 and not cancelado limit 1`, [estab, a.rows[0].id]);
    res.status(200).json({ ok: true, atendimento: a.rows[0], lancamento_id: l.rows[0] ? l.rows[0].id : null });
    return;
  }

  if (acao === 'fn_movimentos') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const id = String(q.id || '');
    const tot = await c.query('select count(*)::int n from brow_fin_movimentos where estab=$1 and lancamento_id=$2', [estab, id]);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, valor_centavos, forma, to_char(data,'YYYY-MM-DD') data, responsavel, inicial, estornado, estorno_motivo, estornado_em, estornado_por, criado_em
      from brow_fin_movimentos where estab=$1 and lancamento_id=$2 order by data desc, criado_em desc limit ${limite} offset ${(pg - 1) * limite}`, [estab, id]);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(x => ({ ...x, forma_nome: FORMAS[x.forma] })) });
    return;
  }
  if (acao === 'fn_movimento') {
    const r = await c.query(`select m.id, m.lancamento_id, m.valor_centavos, m.forma, to_char(m.data,'YYYY-MM-DD') data, m.responsavel, m.estornado, m.estorno_motivo, l.tipo, l.descricao
      from brow_fin_movimentos m join brow_fin_lancamentos l on l.id=m.lancamento_id and l.estab=m.estab where m.estab=$1 and m.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    res.status(200).json({ ok: true, movimento: { ...r.rows[0], forma_nome: FORMAS[r.rows[0].forma] } });
    return;
  }
  if (acao === 'fn_alteracoes') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30); const id = String(q.id || '');
    const tot = await c.query(`select count(*)::int n from brow_historico where estab=$1 and tipo='financeiro' and ref_id=$2`, [estab, id]);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='financeiro' and ref_id=$2 order by id desc limit ${limite} offset ${(pg - 1) * limite}`, [estab, id]);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }

  // ── CRIAR / EDITAR ──
  if (req.method === 'POST' && acao === 'fn_salvar') {
    const b = corpo(req);
    const { out, erros } = lerLancamento(b);
    // cliente/contato vinculado precisa ser DESTE salão
    if (out.pessoa_id) {
      const tab = out.pessoa_tipo === 'cliente' ? 'brow_clientes' : 'brow_contatos';
      const ex = (await c.query(`select 1 from ${tab} where estab=$1 and id=$2`, [estab, out.pessoa_id]).catch(() => ({ rows: [] }))).rows.length;
      if (!ex) erros.pessoa_nome = out.pessoa_tipo === 'cliente' ? 'Escolha a cliente do cadastro.' : 'Escolha o contato do cadastro.';
    }
    if (b.id) {
      if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
      await c.query('begin');
      try {
        const r = await c.query(`${SEL} where l.estab=$1 and l.id=$2 for update of l`, [estab, String(b.id)]);
        if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Lançamento não encontrado.'); }
        const a = r.rows[0];
        if (a.cancelado) { await c.query('rollback'); return erro(res, 409, 'cancelado', 'Lançamento cancelado não pode ser editado.'); }
        if (out.tipo !== a.tipo && a.pago_centavos > 0) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { tipo: 'Há registros de pagamento: o tipo não pode mudar. Estorne-os antes.' } }); }
        if (out.total_centavos < a.pago_centavos) {
          await c.query('rollback');
          return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { total: `Já foram registrados ${reais(a.pago_centavos)}. Para reduzir abaixo disso, estorne o registro excedente antes.` } });
        }
        const campos = ['tipo', 'descricao', 'categoria', 'pessoa_tipo', 'pessoa_id', 'pessoa_nome', 'total_centavos', 'vencimento', 'observacao'];
        const mud = {};
        a.vencimento = a.venc;
        for (const k of campos) if (String(a[k] == null ? '' : a[k]) !== String(out[k] == null ? '' : out[k])) mud[k] = { de: a[k], para: out[k] };
        if (Object.keys(mud).length) {
          await c.query(`update brow_fin_lancamentos set tipo=$3, descricao=$4, categoria=$5, pessoa_tipo=$6, pessoa_id=$7, pessoa_nome=$8, total_centavos=$9, vencimento=$10, observacao=$11, atualizado_em=now() where estab=$1 and id=$2`,
            [estab, a.id, out.tipo, out.descricao, out.categoria, out.pessoa_tipo, out.pessoa_id, out.pessoa_nome, out.total_centavos, out.vencimento, out.observacao]);
          await historico(c, estab, a.id, 'editado', { autor: usuario, mudancas: mud });
        }
        await c.query('commit');
        res.status(200).json({ ok: true, id: a.id, alterado: Object.keys(mud).length > 0 }); return;
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
    }
    // novo (com pagamento inicial opcional)
    const mv = lerMovimento(b, hj, 'ini_');
    Object.assign(erros, mv.erros);
    if (!erros.total && mv.out.valor_centavos > out.total_centavos) erros.ini_valor = 'O valor inicial não pode passar do total.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    // vínculo com atendimento: copia o valor contratado e os dados (o cliente pode ajustar o total)
    let ag = null;
    if (b.agendamento_id) {
      const a = await c.query('select id, cliente_id, cliente_nome, servico_id, servico_nome, profissional_id, profissional_nome from brow_agendamentos where estab=$1 and id=$2', [estab, String(b.agendamento_id)]);
      if (!a.rows.length) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
      ag = a.rows[0];
    }
    await c.query('begin');
    try {
      const id = crypto.randomUUID();
      const ins = await c.query(`insert into brow_fin_lancamentos(id,estab,tipo,descricao,categoria,pessoa_tipo,pessoa_id,pessoa_nome,agendamento_id,servico_id,servico_nome,profissional_id,profissional_nome,total_centavos,vencimento,observacao,criado_por,chave_envio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) on conflict do nothing returning id`,
        [id, estab, out.tipo, out.descricao, out.categoria, out.pessoa_tipo, out.pessoa_id, out.pessoa_nome, ag ? ag.id : null, ag ? ag.servico_id : null, ag ? ag.servico_nome : null,
          ag ? ag.profissional_id : null, ag ? ag.profissional_nome : null, out.total_centavos, out.vencimento, out.observacao, usuario, chave]);
      if (!ins.rows.length) {
        await c.query('rollback');
        const o = await c.query('select id from brow_fin_lancamentos where estab=$1 and chave_envio=$2', [estab, chave]);
        if (o.rows.length) { res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
        const g = ag ? await c.query('select id from brow_fin_lancamentos where estab=$1 and agendamento_id=$2 and not cancelado', [estab, ag.id]) : { rows: [] };
        return erro(res, 409, 'ja_existe', 'Este atendimento já tem lançamento financeiro.', { id: g.rows[0] ? g.rows[0].id : null });
      }
      await historico(c, estab, id, 'criado', { autor: usuario, total: out.total_centavos, agendamento_id: ag ? ag.id : null });
      if (mv.out.valor_centavos > 0) {
        await c.query(`insert into brow_fin_movimentos(id,estab,lancamento_id,valor_centavos,forma,data,responsavel,inicial,chave_envio) values($1,$2,$3,$4,$5,$6,$7,true,$8)`,
          [crypto.randomUUID(), estab, id, mv.out.valor_centavos, mv.out.forma, mv.out.data, usuario, chave + ':ini']);
        await historico(c, estab, id, 'baixa', { autor: usuario, valor: mv.out.valor_centavos, forma: mv.out.forma, data: mv.out.data, inicial: true });
      }
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── BAIXA (recebimento/pagamento) com saldo revalidado sob trava ──
  if (req.method === 'POST' && acao === 'fn_baixar') {
    const b = corpo(req);
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const { out, erros } = lerMovimento(b, hj);
    if (!erros.valor && !(out.valor_centavos > 0)) erros.valor = 'Informe um valor maior que zero.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r = await c.query(`select id, total_centavos, cancelado from brow_fin_lancamentos where estab=$1 and id=$2 for update`, [estab, String(b.id || '')]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Lançamento não encontrado.'); }
      const l = r.rows[0];
      const ja = await c.query('select id from brow_fin_movimentos where estab=$1 and chave_envio=$2', [estab, chave]);
      if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
      if (l.cancelado) { await c.query('rollback'); return erro(res, 409, 'cancelado', 'Lançamento cancelado.'); }
      const p = await c.query('select coalesce(sum(valor_centavos),0)::int s from brow_fin_movimentos where estab=$1 and lancamento_id=$2 and not estornado', [estab, l.id]);
      const saldo = l.total_centavos - p.rows[0].s;
      if (saldo <= 0) { await c.query('rollback'); return erro(res, 409, 'quitado', 'Este lançamento já está quitado.'); }
      if (out.valor_centavos > saldo) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { valor: `O valor passa do saldo pendente (${reais(saldo)}).` }, saldo_centavos: saldo }); }
      const mid = crypto.randomUUID();
      await c.query(`insert into brow_fin_movimentos(id,estab,lancamento_id,valor_centavos,forma,data,responsavel,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [mid, estab, l.id, out.valor_centavos, out.forma, out.data, usuario, chave]);
      await c.query('update brow_fin_lancamentos set atualizado_em=now() where estab=$1 and id=$2', [estab, l.id]);
      await historico(c, estab, l.id, 'baixa', { autor: usuario, valor: out.valor_centavos, forma: out.forma, data: out.data });
      await c.query('commit');
      res.status(201).json({ ok: true, id: mid, saldo_centavos: saldo - out.valor_centavos }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── ESTORNO (não apaga; não devolve dinheiro em banco/cartão) ──
  if (req.method === 'POST' && acao === 'fn_estornar') {
    const b = corpo(req);
    const motivo = txt(b.motivo, 300);
    const erros = {};
    if (!motivo || motivo.length < 3) erros.motivo = 'Informe o motivo.';
    if (b.confirmacao !== true) erros.confirmacao = 'Confirme o estorno.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r = await c.query(`update brow_fin_movimentos set estornado=true, estorno_motivo=$3, estornado_em=now(), estornado_por=$4 where estab=$1 and id=$2 and not estornado returning lancamento_id, valor_centavos`,
        [estab, String(b.id || ''), motivo, usuario]);
      if (!r.rows.length) {
        await c.query('rollback');
        const ex = await c.query('select estornado from brow_fin_movimentos where estab=$1 and id=$2', [estab, String(b.id || '')]);
        if (ex.rows.length) { res.status(200).json({ ok: true, repetido: true }); return; }
        return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
      }
      await historico(c, estab, r.rows[0].lancamento_id, 'estorno', { autor: usuario, movimento_id: b.id, valor: r.rows[0].valor_centavos, motivo });
      await c.query('commit');
      res.status(200).json({ ok: true, lancamento_id: r.rows[0].lancamento_id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── CANCELAR (só sem movimentos ativos; o registro fica guardado) ──
  if (req.method === 'POST' && acao === 'fn_cancelar') {
    const b = corpo(req);
    const motivo = txt(b.motivo, 300);
    const erros = {};
    if (!motivo || motivo.length < 3) erros.motivo = 'Informe o motivo.';
    if (b.confirmacao !== true) erros.confirmacao = 'Confirme o cancelamento.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r = await c.query('select id, cancelado from brow_fin_lancamentos where estab=$1 and id=$2 for update', [estab, String(b.id || '')]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Lançamento não encontrado.'); }
      if (r.rows[0].cancelado) { await c.query('rollback'); res.status(200).json({ ok: true, repetido: true }); return; }
      const n = await c.query('select count(*)::int n from brow_fin_movimentos where estab=$1 and lancamento_id=$2 and not estornado', [estab, r.rows[0].id]);
      if (n.rows[0].n) { await c.query('rollback'); return erro(res, 409, 'tem_pagamentos', `Há ${n.rows[0].n} registro(s) de pagamento ativo(s). Estorne-os antes de cancelar.`); }
      await c.query('update brow_fin_lancamentos set cancelado=true, cancelado_em=now(), cancelado_por=$3, cancel_motivo=$4, atualizado_em=now() where estab=$1 and id=$2', [estab, r.rows[0].id, usuario, motivo]);
      await historico(c, estab, r.rows[0].id, 'cancelado', { autor: usuario, motivo });
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { textoParaCentavos, reais };
module.exports.garantirTabelas = garantirTabelas;
