// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ORÇAMENTOS, PROPOSTAS, COMBOS E CONTROLE DE SESSÕES (10/11/2026)
// Ações "or_*" via api/_lib/brow-studio.js.
//
// • Proposta: rascunho → emitida → aprovada | recusada | cancelada. Itens com
//   nome, quantidade (inteira > 0) e preço (centavos) GUARDADOS na proposta:
//   mudar o catálogo ou o modelo não muda propostas nem pacotes.
// • Aprovar (ação explícita, proposta emitida e dentro da validade) cria UM
//   pacote (índice único por proposta). Não paga, não reserva, não baixa sessão.
//   Alteração depois de aprovada = ADITIVO (outra proposta ligada ao pacote),
//   que ao ser aprovada acrescenta itens/valor sem reescrever o acordo original.
// • Saldo por item (serviço): contratadas − realizadas − reservadas.
//   Reservada = agendamento ativo (ou concluído aguardando registro) vinculado
//   ao item; cancelamento/falta na agenda libera sozinho (derivado).
//   Reserva nasce dentro da transação de ag_criar (vincularReserva) com o item
//   travado: reservas simultâneas não passam do saldo.
// • Sessão só é consumida ao REGISTRAR um atendimento realizado (agenda
//   concluída) do mesmo serviço e cliente; um atendimento baixa uma vez só.
//   Estorno: uma vez, com motivo; nada é apagado.
// • Financeiro: no máximo 1 receita por proposta aprovada (criada ou vinculada
//   por ação explícita). Sessões não geram cobrança. Nada é pago automaticamente.
// • PERMISSÕES (login pendente): podeDescontar / podeEstornar / podeExcecao.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const SITUACOES = { rascunho: 'Rascunho', emitida: 'Proposta emitida', aprovada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada' };
const RETOQUES = { incluidos: 'Retoques incluídos no pacote', nao_incluidos: 'Retoques não incluídos', nao_informado: 'Retoques: não informado' };
const AG_RESERVA = ['agendado', 'confirmado', 'chegou', 'em_atendimento', 'concluido'];
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const MAX_ITENS = 30;
const podeDescontar = () => true, podeEstornar = () => true, podeExcecao = () => true;   // login pendente

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_orc_modelos(
    id text primary key, estab text not null, nome text not null, itens jsonb not null default '[]'::jsonb,
    desconto_centavos integer not null default 0 check (desconto_centavos >= 0), condicoes text, inclui text, retoques text,
    arquivado boolean not null default false, versao integer not null default 1, criado_por text, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_orcm_envio on brow_orc_modelos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create table if not exists brow_orc_propostas(
    id text primary key, estab text not null, titulo text not null, cliente_id text not null, cliente_nome text not null, whatsapp text,
    profissional_id text, profissional_nome text, itens jsonb not null default '[]'::jsonb,
    subtotal_centavos integer not null, desconto_centavos integer not null default 0 check (desconto_centavos >= 0), total_centavos integer not null check (total_centavos >= 0),
    validade date not null, prazo_uso date, condicoes text, inclui text, retoques text not null default 'nao_informado', observacoes text,
    situacao text not null default 'rascunho', versao integer not null default 1, modelo_id text, modelo_versao integer, pacote_alvo_id text,
    criada_em date not null, emitida_em timestamptz, aprovada_em timestamptz, aprovada_por text, aprovacao_ref text,
    recusada_em timestamptz, recusa_motivo text, cancelada_em timestamptz, cancel_motivo text,
    pacote_id text, lancamento_id text, criado_por text, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
    check (desconto_centavos <= subtotal_centavos))`);
  await c.query(`create unique index if not exists brow_orcp_envio on brow_orc_propostas(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_orcp_lanc on brow_orc_propostas(estab, lancamento_id) where lancamento_id is not null`);
  await c.query(`create table if not exists brow_orc_pacotes(
    id text primary key, estab text not null, proposta_id text not null, titulo text not null, cliente_id text not null, cliente_nome text not null,
    profissional_id text, profissional_nome text, total_centavos integer not null, prazo_uso date,
    situacao text not null default 'ativo', encerrado_em timestamptz, encerrado_motivo text, criado_por text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_orcpac_prop on brow_orc_pacotes(estab, proposta_id)`);
  await c.query(`create table if not exists brow_orc_pacote_itens(
    id text primary key, estab text not null, pacote_id text not null, proposta_id text not null, servico_id text not null, servico_nome text not null,
    quantidade integer not null check (quantidade > 0), preco_centavos integer not null check (preco_centavos >= 0), criado_em timestamptz not null default now())`);
  await c.query(`create index if not exists brow_orci_pac on brow_orc_pacote_itens(estab, pacote_id)`);
  await c.query(`create table if not exists brow_orc_reservas(
    id text primary key, estab text not null, pacote_id text not null, item_id text not null, agendamento_id text not null, criado_por text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_orcr_ag on brow_orc_reservas(estab, agendamento_id)`);
  await c.query(`create table if not exists brow_orc_usos(
    id text primary key, estab text not null, pacote_id text not null, item_id text not null, agendamento_id text not null,
    servico_nome text not null, data date not null, profissional_nome text, responsavel text, excecao_prazo boolean not null default false, justificativa text,
    estornado boolean not null default false, estorno_motivo text, estornado_em timestamptz, estornado_por text, chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_orcu_ag on brow_orc_usos(estab, agendamento_id) where not estornado`);
  await c.query(`create unique index if not exists brow_orcu_envio on brow_orc_usos(estab, chave_envio) where chave_envio is not null`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const longo = (v, max) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');
function dataValida(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100; }
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function centavos(v) {
  if (Number.isInteger(v)) return v >= 0 && v <= 100000000 ? v : null;
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  const [i, d = ''] = s.replace(/\./g, '').split(',');
  const n = parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10);
  return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
}
const reais = (c) => { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
const dataBR = (s) => s ? s.split('-').reverse().join('/') : '';
async function hoje(c, estab) {
  let fuso = 'America/Sao_Paulo';
  try { const r = await c.query('select fuso from brow_config where estab=$1', [estab]); if (r.rows[0] && FUSOS.includes(r.rows[0].fuso)) fuso = r.rows[0].fuso; } catch (e) {}
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
async function historico(c, estab, tipo, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, tipo, id, acao, det ? JSON.stringify(det) : null]);
}
// itens: [{servico_id, servico_nome, quantidade, preco_centavos}] — conferidos e totalizados no servidor
async function lerItens(c, estab, lista, erros, exigir = true) {
  if (!Array.isArray(lista) || (exigir && !lista.length)) { erros.itens = 'Adicione pelo menos um serviço.'; return []; }
  if (lista.length > MAX_ITENS) { erros.itens = `No máximo ${MAX_ITENS} itens.`; return []; }
  const ids = new Set(); const out = [];
  for (const it of lista) {
    const sid = String((it && it.servico_id) || '');
    if (ids.has(sid)) { erros.itens = 'Há serviço repetido: ajuste a quantidade do item existente.'; return []; }
    ids.add(sid);
    const s = await c.query('select id, nome, valor_centavos from brow_servicos where estab=$1 and id=$2', [estab, sid]);
    if (!s.rows.length) { erros.itens = 'Serviço não encontrado no catálogo.'; return []; }
    const q = Number(it.quantidade);
    if (!Number.isInteger(q) || q < 1 || q > 999) { erros.itens = 'Quantidade de sessões deve ser inteira e maior que zero.'; return []; }
    const p = centavos(it.preco_centavos);
    if (p === null) { erros.itens = 'Preço por sessão inválido.'; return []; }
    out.push({ servico_id: sid, servico_nome: txt(it.servico_nome, 100) || s.rows[0].nome, quantidade: q, preco_centavos: p, preco_catalogo: s.rows[0].valor_centavos });
  }
  return out;
}
const subtotal = (itens) => itens.reduce((s, i) => s + i.quantidade * i.preco_centavos, 0);
const limpar = (itens) => itens.map(({ servico_id, servico_nome, quantidade, preco_centavos }) => ({ servico_id, servico_nome, quantidade, preco_centavos }));

// Texto da proposta — o MESMO conteúdo vai para o WhatsApp e para o PDF (fiel à versão salva)
function apresentacao(p, estudio) {
  const l = [`${estudio} — Proposta`, `${p.titulo} (versão ${p.versao})`, '', `Cliente: ${p.cliente_nome}`];
  if (p.profissional_nome) l.push(`Profissional responsável: ${p.profissional_nome}`);
  l.push(`Data: ${dataBR(p.criada)}`, '', 'Serviços:');
  for (const i of p.itens) l.push(`• ${i.servico_nome}: ${i.quantidade} ${i.quantidade === 1 ? 'sessão' : 'sessões'} × ${reais(i.preco_centavos)} = ${reais(i.quantidade * i.preco_centavos)}`);
  l.push('', `Subtotal: ${reais(p.subtotal_centavos)}`, `Desconto: ${reais(p.desconto_centavos)}`, `Total: ${reais(p.total_centavos)}`, '',
    `Validade da proposta (para aprovar): até ${dataBR(p.validade_s)}`, `Prazo de utilização do pacote: ${p.prazo_s ? 'até ' + dataBR(p.prazo_s) : 'sem prazo definido'}`,
    RETOQUES[p.retoques] || RETOQUES.nao_informado);
  if (p.inclui) l.push(`O que está incluído: ${p.inclui}`);
  if (p.condicoes) l.push(`Condições: ${p.condicoes}`);
  if (p.observacoes) l.push(`Observações: ${p.observacoes}`);
  l.push('', 'Esta proposta não é cobrança nem reserva de horário.');
  return l.join('\n');
}
const SELP = `select p.*, to_char(p.validade,'YYYY-MM-DD') validade_s, to_char(p.prazo_uso,'YYYY-MM-DD') prazo_s, to_char(p.criada_em,'YYYY-MM-DD') criada from brow_orc_propostas p`;
const linhaP = (p, hj) => ({ id: p.id, titulo: p.titulo, cliente_id: p.cliente_id, cliente_nome: p.cliente_nome, whatsapp: p.whatsapp, profissional_id: p.profissional_id, profissional_nome: p.profissional_nome,
  itens: p.itens, subtotal_centavos: p.subtotal_centavos, desconto_centavos: p.desconto_centavos, total_centavos: p.total_centavos, validade: p.validade_s, prazo_uso: p.prazo_s,
  condicoes: p.condicoes, inclui: p.inclui, retoques: p.retoques, observacoes: p.observacoes, situacao: p.situacao, situacao_nome: SITUACOES[p.situacao], versao: p.versao,
  modelo_id: p.modelo_id, pacote_alvo_id: p.pacote_alvo_id, criada_em: p.criada, aprovada_em: p.aprovada_em, aprovada_por: p.aprovada_por, aprovacao_ref: p.aprovacao_ref,
  recusa_motivo: p.recusa_motivo, cancel_motivo: p.cancel_motivo, pacote_id: p.pacote_id, lancamento_id: p.lancamento_id, criado_por: p.criado_por,
  vencida: ['rascunho', 'emitida'].includes(p.situacao) && p.validade_s < hj });

// contagens por item (realizadas, reservadas, disponível)
const SELI = `select i.*,
    (select count(*) from brow_orc_usos u where u.estab=i.estab and u.item_id=i.id and not u.estornado)::int realizadas,
    (select count(*) from brow_orc_reservas r join brow_agendamentos a on a.estab=r.estab and a.id=r.agendamento_id
       where r.estab=i.estab and r.item_id=i.id and a.situacao = any('{${AG_RESERVA.join(',')}}')
       and not exists (select 1 from brow_orc_usos u where u.estab=r.estab and u.agendamento_id=r.agendamento_id and not u.estornado))::int reservadas
  from brow_orc_pacote_itens i`;
const linhaI = (i) => ({ id: i.id, pacote_id: i.pacote_id, proposta_id: i.proposta_id, servico_id: i.servico_id, servico_nome: i.servico_nome, quantidade: i.quantidade, preco_centavos: i.preco_centavos,
  realizadas: i.realizadas, reservadas: i.reservadas, disponivel: i.quantidade - i.realizadas - i.reservadas });

// Chamado pela Agenda DENTRO da transação de ag_criar: reserva 1 sessão do item (sem passar do saldo)
async function vincularReserva(c, estab, itemId, { agendamentoId, clienteId, servicoId, data, autor }) {
  await garantirTabelas(c);
  const it = await c.query('select * from brow_orc_pacote_itens where estab=$1 and id=$2 for update', [estab, String(itemId)]);
  if (!it.rows.length) return { ok: false, msg: 'Item do pacote não encontrado.' };
  const pac = (await c.query(`select *, to_char(prazo_uso,'YYYY-MM-DD') prazo_s from brow_orc_pacotes where estab=$1 and id=$2`, [estab, it.rows[0].pacote_id])).rows[0];
  if (!pac || pac.situacao !== 'ativo') return { ok: false, msg: 'Pacote encerrado: não reserva sessões.' };
  if (pac.cliente_id !== clienteId) return { ok: false, msg: 'A cliente não corresponde ao pacote.' };
  if (it.rows[0].servico_id !== servicoId) return { ok: false, msg: 'O serviço do horário precisa ser o mesmo do item do pacote.' };
  if (pac.prazo_s && data > pac.prazo_s) return { ok: false, msg: `Data após o prazo de utilização do pacote (${dataBR(pac.prazo_s)}).` };
  const x = linhaI((await c.query(`${SELI} where i.estab=$1 and i.id=$2`, [estab, it.rows[0].id])).rows[0]);
  if (x.disponivel <= 0) return { ok: false, msg: 'Sem saldo de sessões disponível neste item (contando as já reservadas).' };
  await c.query('insert into brow_orc_reservas(id,estab,pacote_id,item_id,agendamento_id,criado_por) values($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), estab, pac.id, x.id, agendamentoId, autor || null]);
  await historico(c, estab, 'pacote', pac.id, 'reserva', { item: x.servico_nome, agendamento_id: agendamentoId, data });
  return { ok: true };
}

async function totaisFinanceiros(c, estab, pacoteId) {
  const props = (await c.query(`select id, titulo, total_centavos, lancamento_id, pacote_alvo_id from brow_orc_propostas where estab=$1 and pacote_id=$2 and situacao='aprovada' order by aprovada_em`, [estab, pacoteId])).rows;
  let pago = 0, lancado = 0;
  for (const p of props) {
    p.lancamento = null;
    if (!p.lancamento_id) continue;
    const l = (await c.query(`select id, cancelado, total_centavos, coalesce((select sum(valor_centavos) from brow_fin_movimentos m where m.estab=l.estab and m.lancamento_id=l.id and not m.estornado),0)::int pago
      from brow_fin_lancamentos l where l.estab=$1 and l.id=$2`, [estab, p.lancamento_id]).catch(() => ({ rows: [] }))).rows[0];
    if (l && !l.cancelado) { p.lancamento = l; pago += l.pago; lancado += l.total_centavos; }
  }
  return { propostas: props.map(p => ({ id: p.id, titulo: p.titulo, total_centavos: p.total_centavos, aditivo: !!p.pacote_alvo_id, lancamento: p.lancamento })), pago_centavos: pago, lancado_centavos: lancado };
}

module.exports = async function orcamentos(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;
  const hj = await hoje(c, estab);
  const estudio = ((await c.query('select nome_estudio from brow_config where estab=$1', [estab]).catch(() => ({ rows: [] }))).rows[0] || {}).nome_estudio || 'Brow Studio';
  const pag = (total, lim) => { const paginas = Math.max(1, Math.ceil(total / lim)); return { paginas, pg: Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas) }; };
  const lim = (pad) => Math.min(Math.max(parseInt(q.limite, 10) || pad, 1), 50);
  const semAcento = (col) => `translate(lower(coalesce(${col},'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')`;
  const termoLike = (t) => '%' + t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%';

  // ═══════════ PROPOSTAS ═══════════
  if (acao === 'or_listar') {
    const L = lim(8); const params = [estab]; let f = '';
    const termo = txt(q.q, 60);
    if (termo) { params.push(termoLike(termo)); f += ` and (${semAcento('p.cliente_nome')} like $${params.length} or ${semAcento('p.titulo')} like $${params.length})`; }
    if (SITUACOES[q.filtro]) { params.push(q.filtro); f += ` and p.situacao=$${params.length}`; }
    if (q.filtro === 'vencidas') { params.push(hj); f += ` and p.situacao in ('rascunho','emitida') and p.validade < $${params.length}`; }
    if (q.cliente) { params.push(String(q.cliente)); f += ` and p.cliente_id=$${params.length}`; }
    const total = (await c.query(`select count(*)::int n from brow_orc_propostas p where p.estab=$1${f}`, params)).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`${SELP} where p.estab=$1${f} order by p.criado_em desc limit ${L} offset ${(pg - 1) * L}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, itens: r.rows.map(p => { const x = linhaP(p, hj); return { id: x.id, titulo: x.titulo, cliente_nome: x.cliente_nome, total_centavos: x.total_centavos, situacao: x.situacao, situacao_nome: x.situacao_nome, vencida: x.vencida, aditivo: !!x.pacote_alvo_id, versao: x.versao }; }) });
    return;
  }
  if (acao === 'or_ver') {
    const r = await c.query(`${SELP} where p.estab=$1 and p.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.');
    const p = linhaP(r.rows[0], hj);
    let lanc = null;
    if (p.lancamento_id) lanc = (await c.query('select id, cancelado, total_centavos from brow_fin_lancamentos where estab=$1 and id=$2', [estab, p.lancamento_id]).catch(() => ({ rows: [] }))).rows[0] || null;
    const cl = (await c.query('select telefone, contato_pref from brow_clientes where estab=$1 and id=$2', [estab, p.cliente_id])).rows[0] || {};
    res.status(200).json({ ok: true, hoje: hj, proposta: p, lancamento: lanc, cliente: { telefone: cl.telefone || null, contato_pref: cl.contato_pref || null }, texto: apresentacao(r.rows[0], estudio) });
    return;
  }
  if (req.method === 'POST' && acao === 'or_salvar') {
    const b = corpo(req); const erros = {};
    const titulo = txt(b.titulo, 120); if (!titulo || titulo.length < 2) erros.titulo = 'Informe o título.';
    const itens = await lerItens(c, estab, b.itens, erros);
    const sub = subtotal(itens);
    const desc = centavos(b.desconto == null || b.desconto === '' ? '0' : b.desconto);
    if (desc === null) erros.desconto = 'Desconto inválido (use 0 ou mais).';
    else if (desc > sub && !erros.itens) erros.desconto = `O desconto não pode passar do subtotal (${reais(sub)}).`;
    else if (desc > 0 && !podeDescontar(usuario)) erros.desconto = 'Sem permissão para conceder desconto.';
    if (!dataValida(b.validade)) erros.validade = 'Informe a validade da proposta.';
    else if (b.validade < hj && !b.id) erros.validade = 'A validade não pode estar no passado.';
    let prazo = null; if (b.prazo_uso) { if (!dataValida(b.prazo_uso)) erros.prazo_uso = 'Data inválida.'; else if (b.validade && b.prazo_uso < b.validade) erros.prazo_uso = 'O prazo de utilização deve ser depois da validade da proposta.'; else prazo = b.prazo_uso; }
    if (!RETOQUES[b.retoques]) erros.retoques = 'Informe se retoques fazem parte do pacote.';
    const tel = digitos(b.whatsapp);
    if (tel && !(tel.length === 10 || tel.length === 11)) erros.whatsapp = 'WhatsApp inválido.';
    let prof = null; if (b.profissional_id) { prof = (await c.query('select id, nome from brow_profissionais where estab=$1 and id=$2', [estab, String(b.profissional_id)])).rows[0] || null; if (!prof) erros.profissional_id = 'Profissional não encontrada.'; }
    const out = { titulo, itens: limpar(itens), sub, desc: desc || 0, total: sub - (desc || 0), validade: b.validade, prazo, condicoes: longo(b.condicoes, 1500), inclui: longo(b.inclui, 800), retoques: b.retoques, observacoes: longo(b.observacoes, 1000), whatsapp: tel || null };
    const precoAlterado = itens.filter(i => i.preco_centavos !== i.preco_catalogo).map(i => ({ servico: i.servico_nome, catalogo: i.preco_catalogo, proposta: i.preco_centavos }));
    if (b.id) {
      if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
      await c.query('begin');
      try {
        const r = await c.query(`${SELP} where p.estab=$1 and p.id=$2 for update`, [estab, String(b.id)]);
        if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.'); }
        const a = r.rows[0];
        if (!['rascunho', 'emitida'].includes(a.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', a.situacao === 'aprovada' ? 'Proposta aprovada não é alterada: crie um aditivo no pacote.' : 'Proposta encerrada não pode ser alterada.'); }
        if (b.validade < hj) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { validade: 'Revise a validade: não pode estar no passado.' } }); }
        await c.query(`update brow_orc_propostas set titulo=$3, whatsapp=$4, profissional_id=$5, profissional_nome=$6, itens=$7, subtotal_centavos=$8, desconto_centavos=$9, total_centavos=$10,
          validade=$11, prazo_uso=$12, condicoes=$13, inclui=$14, retoques=$15, observacoes=$16, versao=versao+1, atualizado_em=now() where estab=$1 and id=$2`,
          [estab, a.id, out.titulo, out.whatsapp, prof ? prof.id : null, prof ? prof.nome : null, JSON.stringify(out.itens), out.sub, out.desc, out.total, out.validade, out.prazo, out.condicoes, out.inclui, out.retoques, out.observacoes]);
        await historico(c, estab, 'proposta', a.id, 'revisada', { autor: usuario, versao: a.versao + 1, total_de: a.total_centavos, total_para: out.total, validade_de: a.validade_s, validade_para: out.validade, precos_alterados: precoAlterado });
        if (b.emitir === true && a.situacao === 'rascunho') { await c.query(`update brow_orc_propostas set situacao='emitida', emitida_em=now() where estab=$1 and id=$2`, [estab, a.id]); await historico(c, estab, 'proposta', a.id, 'emitida', { autor: usuario }); }
        await c.query('commit');
        res.status(200).json({ ok: true, id: a.id }); return;
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
    }
    const cl = (await c.query('select id, nome from brow_clientes where estab=$1 and id=$2', [estab, String(b.cliente_id || '')])).rows[0];
    if (!cl) erros.cliente_id = 'Escolha a cliente do cadastro.';
    let alvo = null;
    if (b.pacote_alvo_id) {
      alvo = (await c.query('select id, cliente_id, situacao from brow_orc_pacotes where estab=$1 and id=$2', [estab, String(b.pacote_alvo_id)])).rows[0];
      if (!alvo || alvo.situacao !== 'ativo') erros.pacote_alvo_id = 'Pacote não encontrado ou encerrado.';
      else if (cl && alvo.cliente_id !== cl.id) erros.cliente_id = 'O aditivo precisa ser da mesma cliente do pacote.';
    }
    let modelo = null; if (b.modelo_id) modelo = (await c.query('select id, versao from brow_orc_modelos where estab=$1 and id=$2', [estab, String(b.modelo_id)])).rows[0] || null;
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64); if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    await c.query('begin');
    try {
      const id = crypto.randomUUID();
      const emitir = b.emitir === true;
      const ins = await c.query(`insert into brow_orc_propostas(id,estab,titulo,cliente_id,cliente_nome,whatsapp,profissional_id,profissional_nome,itens,subtotal_centavos,desconto_centavos,total_centavos,
          validade,prazo_uso,condicoes,inclui,retoques,observacoes,situacao,emitida_em,modelo_id,modelo_versao,pacote_alvo_id,criada_em,criado_por,chave_envio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) on conflict do nothing returning id`,
        [id, estab, out.titulo, cl.id, cl.nome, out.whatsapp, prof ? prof.id : null, prof ? prof.nome : null, JSON.stringify(out.itens), out.sub, out.desc, out.total, out.validade, out.prazo,
          out.condicoes, out.inclui, out.retoques, out.observacoes, emitir ? 'emitida' : 'rascunho', emitir ? new Date() : null, modelo ? modelo.id : null, modelo ? modelo.versao : null, alvo ? alvo.id : null, hj, usuario, chave]);
      if (!ins.rows.length) { await c.query('rollback'); const o = await c.query('select id from brow_orc_propostas where estab=$1 and chave_envio=$2', [estab, chave]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
      await historico(c, estab, 'proposta', id, 'criada', { autor: usuario, total: out.total, modelo_id: modelo ? modelo.id : null, modelo_versao: modelo ? modelo.versao : null, aditivo_de: alvo ? alvo.id : null, precos_alterados: precoAlterado });
      if (emitir) await historico(c, estab, 'proposta', id, 'emitida', { autor: usuario });
      if (alvo) await historico(c, estab, 'pacote', alvo.id, 'aditivo_criado', { autor: usuario, proposta_id: id, total: out.total });
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }
  if (req.method === 'POST' && acao === 'or_emitir') {
    const b = corpo(req);
    const r = await c.query(`update brow_orc_propostas set situacao='emitida', emitida_em=now(), atualizado_em=now() where estab=$1 and id=$2 and situacao='rascunho' and validade >= $3 returning id`, [estab, String(b.id || ''), hj]);
    if (!r.rows.length) return erro(res, 409, 'situacao', 'Só um rascunho dentro da validade pode ser emitido.');
    await historico(c, estab, 'proposta', r.rows[0].id, 'emitida', { autor: usuario });
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && (acao === 'or_recusar' || acao === 'or_cancelar')) {
    const b = corpo(req); const motivo = txt(b.motivo, 300);
    if (!motivo || motivo.length < 3) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { motivo: 'Informe o motivo.' } });
    if (b.confirmacao !== true) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { confirmacao: 'Confirme.' } });
    const rec = acao === 'or_recusar';
    const r = await c.query(`update brow_orc_propostas set situacao=$3, ${rec ? 'recusada_em=now(), recusa_motivo' : 'cancelada_em=now(), cancel_motivo'}=$4, atualizado_em=now()
      where estab=$1 and id=$2 and situacao = any($5) returning id`, [estab, String(b.id || ''), rec ? 'recusada' : 'cancelada', motivo, rec ? ['emitida'] : ['rascunho', 'emitida']]);
    if (!r.rows.length) return erro(res, 409, 'situacao', rec ? 'Só proposta emitida pode ser recusada.' : 'Só rascunho ou proposta emitida pode ser cancelada.');
    await historico(c, estab, 'proposta', r.rows[0].id, rec ? 'recusada' : 'cancelada', { autor: usuario, motivo });
    res.status(200).json({ ok: true }); return;
  }
  // ── APROVAR: cria UM pacote (ou acrescenta itens ao pacote, se aditivo) ──
  if (req.method === 'POST' && acao === 'or_aprovar') {
    const b = corpo(req); const erros = {};
    const ref = txt(b.referencia, 200); if (!ref || ref.length < 3) erros.referencia = 'Informe como a cliente aprovou (ex.: “aprovou pelo WhatsApp em 10/11”).';
    if (b.confirmacao !== true) erros.confirmacao = 'Confirme a aprovação.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r = await c.query(`${SELP} where p.estab=$1 and p.id=$2 for update`, [estab, String(b.id || '')]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.'); }
      const p = r.rows[0];
      if (p.situacao === 'aprovada') { await c.query('rollback'); res.status(200).json({ ok: true, pacote_id: p.pacote_id, repetido: true }); return; }
      if (p.situacao !== 'emitida') { await c.query('rollback'); return erro(res, 409, 'situacao', 'Só proposta emitida pode ser aprovada.'); }
      if (p.validade_s < hj) { await c.query('rollback'); return erro(res, 409, 'vencida', 'A validade da proposta passou: revise-a (nova validade) antes de aprovar.'); }
      let pacId;
      if (p.pacote_alvo_id) {
        const pac = (await c.query('select * from brow_orc_pacotes where estab=$1 and id=$2 for update', [estab, p.pacote_alvo_id])).rows[0];
        if (!pac || pac.situacao !== 'ativo') { await c.query('rollback'); return erro(res, 409, 'pacote', 'O pacote deste aditivo não está ativo.'); }
        pacId = pac.id;
        await c.query('update brow_orc_pacotes set total_centavos=total_centavos+$3, prazo_uso=coalesce($4, prazo_uso), atualizado_em=now() where estab=$1 and id=$2', [estab, pacId, p.total_centavos, p.prazo_s]);
        await historico(c, estab, 'pacote', pacId, 'aditivo_aprovado', { autor: usuario, proposta_id: p.id, total: p.total_centavos, itens: p.itens.map(i => `${i.servico_nome} ×${i.quantidade}`) });
      } else {
        pacId = crypto.randomUUID();
        await c.query(`insert into brow_orc_pacotes(id,estab,proposta_id,titulo,cliente_id,cliente_nome,profissional_id,profissional_nome,total_centavos,prazo_uso,criado_por) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [pacId, estab, p.id, p.titulo, p.cliente_id, p.cliente_nome, p.profissional_id, p.profissional_nome, p.total_centavos, p.prazo_s, usuario]);
        await historico(c, estab, 'pacote', pacId, 'criado', { autor: usuario, proposta_id: p.id, total: p.total_centavos });
      }
      for (const i of p.itens) await c.query('insert into brow_orc_pacote_itens(id,estab,pacote_id,proposta_id,servico_id,servico_nome,quantidade,preco_centavos) values($1,$2,$3,$4,$5,$6,$7,$8)',
        [crypto.randomUUID(), estab, pacId, p.id, i.servico_id, i.servico_nome, i.quantidade, i.preco_centavos]);
      await c.query(`update brow_orc_propostas set situacao='aprovada', aprovada_em=now(), aprovada_por=$3, aprovacao_ref=$4, pacote_id=$5, atualizado_em=now() where estab=$1 and id=$2`, [estab, p.id, usuario, ref, pacId]);
      await historico(c, estab, 'proposta', p.id, 'aprovada', { autor: usuario, referencia: ref, pacote_id: pacId, versao: p.versao });
      await c.query('commit');
      res.status(200).json({ ok: true, pacote_id: pacId }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') { res.status(200).json({ ok: true, repetido: true }); return; } throw e; }
  }
  if (acao === 'or_pdf') {
    const r = await c.query(`${SELP} where p.estab=$1 and p.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.');
    const p = r.rows[0];
    const linhas = apresentacao(p, estudio).split('\n');
    const blocos = [{ texto: linhas[0], tamanho: 15, negrito: true }, { texto: linhas[1], tamanho: 12, negrito: true, espaco: 4 }];
    for (const l of linhas.slice(2)) blocos.push({ texto: l || ' ', tamanho: 10, negrito: /^(Serviços:|Total:)/.test(l) });
    blocos.push({ texto: `Situação: ${SITUACOES[p.situacao]}${p.situacao === 'aprovada' && p.aprovacao_ref ? ' · ' + p.aprovacao_ref : ''}`, tamanho: 9, espaco: 10 });
    const pdf = require('./brow-termos.js')._teste.gerarPdf(blocos, null);
    await historico(c, estab, 'proposta', p.id, 'pdf_gerado', { autor: usuario, versao: p.versao });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proposta-${p.cliente_nome.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}-v${p.versao}.pdf"`);
    res.status(200).end(pdf); return;
  }
  if (acao === 'or_historico') {
    const L = lim(6); const tipo = q.tipo === 'pacote' ? 'pacote' : q.tipo === 'modelo' ? 'orc_modelo' : 'proposta'; const id = String(q.id || '');
    const total = (await c.query('select count(*)::int n from brow_historico where estab=$1 and tipo=$2 and ref_id=$3', [estab, tipo, id])).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo=$2 and ref_id=$3 order by id desc limit ${L} offset ${(pg - 1) * L}`, [estab, tipo, id]);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows }); return;
  }
  // receita (uma por proposta aprovada): cria nova ou vincula receita existente da cliente
  if (acao === 'or_receitas_cliente') {
    const p = (await c.query('select cliente_id from brow_orc_propostas where estab=$1 and id=$2', [estab, String(q.id || '')])).rows[0];
    if (!p) return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.');
    await require('./brow-financeiro.js').garantirTabelas(c);
    const r = await c.query(`select l.id, l.descricao, l.total_centavos, to_char(l.vencimento,'YYYY-MM-DD') vencimento,
        coalesce((select sum(valor_centavos) from brow_fin_movimentos m where m.estab=l.estab and m.lancamento_id=l.id and not m.estornado),0)::int pago
      from brow_fin_lancamentos l where l.estab=$1 and l.tipo='receita' and not l.cancelado and l.pessoa_tipo='cliente' and l.pessoa_id=$2 and l.agendamento_id is null
      and not exists (select 1 from brow_orc_propostas o where o.estab=l.estab and o.lancamento_id=l.id) order by l.criado_em desc limit 5`, [estab, p.cliente_id]);
    res.status(200).json({ ok: true, itens: r.rows }); return;
  }
  if (req.method === 'POST' && acao === 'or_receita') {
    const b = corpo(req); const erros = {};
    if (!b.lancamento_existente_id) {
      if (!dataValida(b.vencimento)) erros.vencimento = 'Informe o vencimento.';
      if (!txt(b.descricao, 120)) erros.descricao = 'Informe a descrição.';
    }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await require('./brow-financeiro.js').garantirTabelas(c);
    await c.query('begin');
    try {
      const p = (await c.query(`${SELP} where p.estab=$1 and p.id=$2 for update`, [estab, String(b.id || '')])).rows[0];
      if (!p) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Proposta não encontrada.'); }
      if (p.situacao !== 'aprovada') { await c.query('rollback'); return erro(res, 409, 'situacao', 'A receita é criada depois da aprovação.'); }
      if (p.total_centavos <= 0) { await c.query('rollback'); return erro(res, 409, 'zero', 'Proposta com total zero: não há receita a criar.'); }
      if (p.lancamento_id) {
        const l = (await c.query('select id, cancelado from brow_fin_lancamentos where estab=$1 and id=$2', [estab, p.lancamento_id])).rows[0];
        if (l && !l.cancelado) { await c.query('rollback'); return erro(res, 409, 'ja_existe', 'Esta proposta já tem receita no financeiro.', { id: l.id }); }
        await c.query('update brow_orc_propostas set lancamento_id=null where estab=$1 and id=$2', [estab, p.id]);
      }
      let lid;
      if (b.lancamento_existente_id) {
        const l = (await c.query(`select id from brow_fin_lancamentos where estab=$1 and id=$2 and tipo='receita' and not cancelado and pessoa_id=$3`, [estab, String(b.lancamento_existente_id), p.cliente_id])).rows[0];
        if (!l) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Receita existente não encontrada para esta cliente.'); }
        lid = l.id;
        await historico(c, estab, 'financeiro', lid, 'vinculado_pacote', { autor: usuario, proposta_id: p.id });
      } else {
        lid = crypto.randomUUID();
        await c.query(`insert into brow_fin_lancamentos(id,estab,tipo,descricao,categoria,pessoa_tipo,pessoa_id,pessoa_nome,profissional_id,profissional_nome,total_centavos,vencimento,observacao,criado_por)
          values($1,$2,'receita',$3,'venda','cliente',$4,$5,$6,$7,$8,$9,$10,$11)`,
          [lid, estab, txt(b.descricao, 120), p.cliente_id, p.cliente_nome, p.profissional_id, p.profissional_nome, p.total_centavos, b.vencimento, `${p.pacote_alvo_id ? 'Aditivo de pacote' : 'Pacote'}: ${p.titulo} (proposta v${p.versao})`, usuario]);
        await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,'criado',$3)`, [estab, lid, JSON.stringify({ autor: usuario, total: p.total_centavos, origem: 'pacote', proposta_id: p.id })]);
      }
      await c.query('update brow_orc_propostas set lancamento_id=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, p.id, lid]);
      await historico(c, estab, 'proposta', p.id, b.lancamento_existente_id ? 'receita_vinculada' : 'receita_criada', { autor: usuario, lancamento_id: lid });
      if (p.pacote_id) await historico(c, estab, 'pacote', p.pacote_id, 'receita', { autor: usuario, lancamento_id: lid, proposta_id: p.id });
      await c.query('commit');
      res.status(201).json({ ok: true, id: lid }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') return erro(res, 409, 'ja_existe', 'Essa receita já está vinculada a outra proposta.'); throw e; }
  }

  // ═══════════ MODELOS DE COMBOS ═══════════
  if (acao === 'or_modelos') {
    const L = lim(8); const params = [estab, q.arquivados === '1']; let f = '';
    const termo = txt(q.q, 60); if (termo) { params.push(termoLike(termo)); f = ` and ${semAcento('nome')} like $3`; }
    const total = (await c.query(`select count(*)::int n from brow_orc_modelos where estab=$1 and arquivado=$2${f}`, params)).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`select * from brow_orc_modelos where estab=$1 and arquivado=$2${f} order by lower(nome) limit ${L} offset ${(pg - 1) * L}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(m => ({ id: m.id, nome: m.nome, itens: m.itens.length, subtotal_centavos: subtotal(m.itens), desconto_centavos: m.desconto_centavos, arquivado: m.arquivado, versao: m.versao })) });
    return;
  }
  if (acao === 'or_modelo_ver') {
    const m = (await c.query('select * from brow_orc_modelos where estab=$1 and id=$2', [estab, String(q.id || '')])).rows[0];
    if (!m) return erro(res, 404, 'nao_encontrado', 'Modelo não encontrado.');
    // preço atual do catálogo, só como referência (o modelo guarda o preço sugerido próprio)
    res.status(200).json({ ok: true, modelo: { ...m, subtotal_centavos: subtotal(m.itens) } }); return;
  }
  if (req.method === 'POST' && acao === 'or_modelo_salvar') {
    const b = corpo(req); const erros = {};
    const nome = txt(b.nome, 100); if (!nome || nome.length < 2) erros.nome = 'Informe o nome do modelo.';
    const itens = await lerItens(c, estab, b.itens, erros);
    const sub = subtotal(itens); const desc = centavos(b.desconto == null || b.desconto === '' ? '0' : b.desconto);
    if (desc === null) erros.desconto = 'Desconto inválido.'; else if (desc > sub && !erros.itens) erros.desconto = `O desconto não pode passar do subtotal (${reais(sub)}).`;
    if (b.retoques && !RETOQUES[b.retoques]) erros.retoques = 'Opção inválida.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const vals = [nome, JSON.stringify(limpar(itens)), desc, longo(b.condicoes, 1500), longo(b.inclui, 800), b.retoques || null];
    if (b.id) {
      const r = await c.query(`update brow_orc_modelos set nome=$3, itens=$4, desconto_centavos=$5, condicoes=$6, inclui=$7, retoques=$8, versao=versao+1, atualizado_em=now() where estab=$1 and id=$2 returning id, versao`, [estab, String(b.id), ...vals]);
      if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Modelo não encontrado.');
      await historico(c, estab, 'orc_modelo', r.rows[0].id, 'editado', { autor: usuario, versao: r.rows[0].versao });
      res.status(200).json({ ok: true, id: r.rows[0].id }); return;
    }
    const chave = txt(b.chave_envio, 64); if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const id = crypto.randomUUID();
    const ins = await c.query(`insert into brow_orc_modelos(id,estab,nome,itens,desconto_centavos,condicoes,inclui,retoques,criado_por,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing returning id`, [id, estab, ...vals, usuario, chave]);
    if (!ins.rows.length) { const o = await c.query('select id from brow_orc_modelos where estab=$1 and chave_envio=$2', [estab, chave]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
    await historico(c, estab, 'orc_modelo', id, 'criado', { autor: usuario });
    res.status(201).json({ ok: true, id }); return;
  }
  if (req.method === 'POST' && acao === 'or_modelo_arquivar') {
    const b = corpo(req);
    const r = await c.query('update brow_orc_modelos set arquivado=$3, atualizado_em=now() where estab=$1 and id=$2 returning id', [estab, String(b.id || ''), b.valor === true]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Modelo não encontrado.');
    await historico(c, estab, 'orc_modelo', r.rows[0].id, b.valor === true ? 'arquivado' : 'desarquivado', { autor: usuario });
    res.status(200).json({ ok: true }); return;
  }

  // ═══════════ PACOTES E SESSÕES ═══════════
  if (acao === 'or_pacotes') {
    const L = lim(8); const params = [estab]; let f = '';
    const termo = txt(q.q, 60); if (termo) { params.push(termoLike(termo)); f += ` and (${semAcento('cliente_nome')} like $${params.length} or ${semAcento('titulo')} like $${params.length})`; }
    if (q.filtro === 'ativos') f += ` and situacao='ativo'`;
    if (q.filtro === 'encerrados') f += ` and situacao='encerrado'`;
    if (q.filtro === 'prazo') { params.push(hj); f += ` and situacao='ativo' and prazo_uso < $${params.length}`; }
    if (q.cliente) { params.push(String(q.cliente)); f += ` and cliente_id=$${params.length}`; }
    const total = (await c.query(`select count(*)::int n from brow_orc_pacotes where estab=$1${f}`, params)).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`select *, to_char(prazo_uso,'YYYY-MM-DD') prazo_s from brow_orc_pacotes where estab=$1${f} order by (situacao='ativo') desc, criado_em desc limit ${L} offset ${(pg - 1) * L}`, params);
    const itens = [];
    for (const p of r.rows) {
      const its = (await c.query(`${SELI} where i.estab=$1 and i.pacote_id=$2`, [estab, p.id])).rows.map(linhaI);
      itens.push({ id: p.id, titulo: p.titulo, cliente_nome: p.cliente_nome, total_centavos: p.total_centavos, situacao: p.situacao, prazo_uso: p.prazo_s, prazo_ultrapassado: p.situacao === 'ativo' && !!p.prazo_s && p.prazo_s < hj,
        sessoes: its.reduce((s, i) => s + i.quantidade, 0), realizadas: its.reduce((s, i) => s + i.realizadas, 0), disponivel: its.reduce((s, i) => s + i.disponivel, 0) });
    }
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, itens }); return;
  }
  if (acao === 'or_pacote_ver') {
    const p = (await c.query(`select *, to_char(prazo_uso,'YYYY-MM-DD') prazo_s from brow_orc_pacotes where estab=$1 and id=$2`, [estab, String(q.id || '')])).rows[0];
    if (!p) return erro(res, 404, 'nao_encontrado', 'Pacote não encontrado.');
    const its = (await c.query(`${SELI} where i.estab=$1 and i.pacote_id=$2 order by i.criado_em`, [estab, p.id])).rows.map(linhaI);
    const fin = await totaisFinanceiros(c, estab, p.id);
    res.status(200).json({ ok: true, hoje: hj, pacote: { id: p.id, titulo: p.titulo, proposta_id: p.proposta_id, cliente_id: p.cliente_id, cliente_nome: p.cliente_nome, profissional_nome: p.profissional_nome,
      total_centavos: p.total_centavos, prazo_uso: p.prazo_s, situacao: p.situacao, encerrado_motivo: p.encerrado_motivo, prazo_ultrapassado: p.situacao === 'ativo' && !!p.prazo_s && p.prazo_s < hj,
      itens: its, sessoes: its.reduce((s, i) => s + i.quantidade, 0), realizadas: its.reduce((s, i) => s + i.realizadas, 0), reservadas: its.reduce((s, i) => s + i.reservadas, 0), disponivel: its.reduce((s, i) => s + i.disponivel, 0),
      financeiro: req.brow_funcao === 'profissional' ? null : { ...fin, contratado_centavos: p.total_centavos, saldo_centavos: p.total_centavos - fin.pago_centavos, sem_lancamento_centavos: p.total_centavos - fin.lancado_centavos } } });
    return;
  }
  if (acao === 'or_item_ver') {
    const i = (await c.query(`${SELI} where i.estab=$1 and i.id=$2`, [estab, String(q.id || '')])).rows[0];
    if (!i) return erro(res, 404, 'nao_encontrado', 'Item não encontrado.');
    const p = (await c.query(`select id, titulo, cliente_id, cliente_nome, profissional_id, situacao, to_char(prazo_uso,'YYYY-MM-DD') prazo_s from brow_orc_pacotes where estab=$1 and id=$2`, [estab, i.pacote_id])).rows[0];
    const reservas = (await c.query(`select a.id, a.situacao, to_char(a.data,'YYYY-MM-DD') data, a.inicio_min, a.profissional_nome from brow_orc_reservas r join brow_agendamentos a on a.estab=r.estab and a.id=r.agendamento_id
      where r.estab=$1 and r.item_id=$2 and a.situacao = any($3) and not exists (select 1 from brow_orc_usos u where u.estab=r.estab and u.agendamento_id=r.agendamento_id and not u.estornado) order by a.data, a.inicio_min limit 5`, [estab, i.id, AG_RESERVA])).rows
      .map(a => ({ ...a, inicio: `${String(Math.floor(a.inicio_min / 60)).padStart(2, '0')}:${String(a.inicio_min % 60).padStart(2, '0')}` }));
    res.status(200).json({ ok: true, hoje: hj, item: linhaI(i), pacote: { ...p, prazo_uso: p.prazo_s, prazo_ultrapassado: !!p.prazo_s && p.prazo_s < hj }, reservas }); return;
  }
  // atendimentos realizados (agenda: concluído) do mesmo serviço/cliente, ainda não usados
  if (acao === 'or_candidatos') {
    const i = (await c.query('select i.*, p.cliente_id from brow_orc_pacote_itens i join brow_orc_pacotes p on p.estab=i.estab and p.id=i.pacote_id where i.estab=$1 and i.id=$2', [estab, String(q.item || '')])).rows[0];
    if (!i) return erro(res, 404, 'nao_encontrado', 'Item não encontrado.');
    const L = lim(5);
    const base = `from brow_agendamentos a where a.estab=$1 and a.cliente_id=$2 and a.servico_id=$3 and a.situacao='concluido'
      and not exists (select 1 from brow_orc_usos u where u.estab=a.estab and u.agendamento_id=a.id and not u.estornado)
      and not exists (select 1 from brow_orc_reservas r where r.estab=a.estab and r.agendamento_id=a.id and r.item_id<>$4)`;
    const params = [estab, i.cliente_id, i.servico_id, i.id];
    const total = (await c.query(`select count(*)::int n ${base}`, params)).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`select a.id, to_char(a.data,'YYYY-MM-DD') data, a.inicio_min, a.profissional_nome, a.servico_nome,
        exists (select 1 from brow_orc_reservas r where r.estab=a.estab and r.agendamento_id=a.id and r.item_id=$4) reservado ${base} order by a.data desc limit ${L} offset ${(pg - 1) * L}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows }); return;
  }
  // ── REGISTRAR SESSÃO: consome 1 sessão por atendimento realizado ──
  if (req.method === 'POST' && acao === 'or_sessao') {
    const b = corpo(req);
    const chave = txt(b.chave_envio, 64); if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    await c.query('begin');
    try {
      const ja = await c.query('select id from brow_orc_usos where estab=$1 and chave_envio=$2', [estab, chave]);
      if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
      const it = (await c.query('select * from brow_orc_pacote_itens where estab=$1 and id=$2 for update', [estab, String(b.item_id || '')])).rows[0];
      if (!it) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Item não encontrado.'); }
      const pac = (await c.query(`select *, to_char(prazo_uso,'YYYY-MM-DD') prazo_s from brow_orc_pacotes where estab=$1 and id=$2`, [estab, it.pacote_id])).rows[0];
      if (pac.situacao !== 'ativo') { await c.query('rollback'); return erro(res, 409, 'encerrado', 'Pacote encerrado: não registra sessões.'); }
      const a = (await c.query(`select id, cliente_id, servico_id, situacao, to_char(data,'YYYY-MM-DD') data, profissional_nome from brow_agendamentos where estab=$1 and id=$2`, [estab, String(b.agendamento_id || '')])).rows[0];
      if (!a) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { agendamento_id: 'Escolha o atendimento realizado.' } }); }
      if (a.situacao !== 'concluido') { await c.query('rollback'); return erro(res, 409, 'nao_realizado', 'Só atendimento registrado como realizado (concluído na agenda) consome sessão.'); }
      if (a.cliente_id !== pac.cliente_id || a.servico_id !== it.servico_id) { await c.query('rollback'); return erro(res, 409, 'divergente', 'O atendimento precisa ser da mesma cliente e do mesmo serviço do item.'); }
      const outro = await c.query('select item_id from brow_orc_reservas where estab=$1 and agendamento_id=$2', [estab, a.id]);
      if (outro.rows.length && outro.rows[0].item_id !== it.id) { await c.query('rollback'); return erro(res, 409, 'divergente', 'Este atendimento está reservado em outro item/pacote.'); }
      const usado = await c.query('select id from brow_orc_usos where estab=$1 and agendamento_id=$2 and not estornado', [estab, a.id]);
      if (usado.rows.length) { await c.query('rollback'); return erro(res, 409, 'duplicado', 'Este atendimento já baixou uma sessão.'); }
      const x = linhaI((await c.query(`${SELI} where i.estab=$1 and i.id=$2`, [estab, it.id])).rows[0]);
      const reservadoAqui = outro.rows.length > 0;   // se reservado neste item, a reserva vira a sessão (não soma duas vezes)
      if (x.realizadas + x.reservadas - (reservadoAqui ? 1 : 0) + 1 > x.quantidade) { await c.query('rollback'); return erro(res, 409, 'saldo', 'Sem saldo neste item (sessões realizadas e reservadas já somam o contratado).'); }
      let excecao = false; const just = txt(b.justificativa, 300);
      if (pac.prazo_s && a.data > pac.prazo_s) {
        if (!podeExcecao(usuario)) { await c.query('rollback'); return erro(res, 403, 'sem_permissao', 'Sem permissão para exceção de prazo.'); }
        if (!just || just.length < 3) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { justificativa: `Atendimento após o prazo do pacote (${dataBR(pac.prazo_s)}): informe a justificativa da exceção.` } }); }
        excecao = true;
      }
      const id = crypto.randomUUID();
      await c.query(`insert into brow_orc_usos(id,estab,pacote_id,item_id,agendamento_id,servico_nome,data,profissional_nome,responsavel,excecao_prazo,justificativa,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, estab, pac.id, it.id, a.id, it.servico_nome, a.data, a.profissional_nome, usuario, excecao, excecao ? just : null, chave]);
      await historico(c, estab, 'pacote', pac.id, 'sessao', { autor: usuario, item: it.servico_nome, agendamento_id: a.id, data: a.data, excecao_prazo: excecao, justificativa: excecao ? just : null });
      await c.query('commit');
      res.status(201).json({ ok: true, id, disponivel: x.disponivel - (reservadoAqui ? 0 : 1) }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') return erro(res, 409, 'duplicado', 'Este atendimento já baixou uma sessão.'); throw e; }
  }
  if (acao === 'or_usos') {
    const L = lim(6); const params = [estab]; let f = '';
    if (q.item) { params.push(String(q.item)); f = ` and item_id=$2`; } else if (q.pacote) { params.push(String(q.pacote)); f = ` and pacote_id=$2`; } else return erro(res, 400, 'filtro', 'Informe o item.');
    const total = (await c.query(`select count(*)::int n from brow_orc_usos where estab=$1${f}`, params)).rows[0].n;
    const { paginas, pg } = pag(total, L);
    const r = await c.query(`select id, item_id, agendamento_id, servico_nome, to_char(data,'YYYY-MM-DD') data, profissional_nome, responsavel, excecao_prazo, justificativa, estornado, estorno_motivo, criado_em
      from brow_orc_usos where estab=$1${f} order by data desc, criado_em desc limit ${L} offset ${(pg - 1) * L}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows }); return;
  }
  if (acao === 'or_uso_ver') {
    const u = (await c.query(`select u.*, to_char(u.data,'YYYY-MM-DD') data_s, p.cliente_nome, p.titulo from brow_orc_usos u join brow_orc_pacotes p on p.estab=u.estab and p.id=u.pacote_id where u.estab=$1 and u.id=$2`, [estab, String(q.id || '')])).rows[0];
    if (!u) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    res.status(200).json({ ok: true, uso: { id: u.id, pacote_id: u.pacote_id, item_id: u.item_id, agendamento_id: u.agendamento_id, servico_nome: u.servico_nome, data: u.data_s, profissional_nome: u.profissional_nome, responsavel: u.responsavel,
      excecao_prazo: u.excecao_prazo, justificativa: u.justificativa, estornado: u.estornado, estorno_motivo: u.estorno_motivo, estornado_por: u.estornado_por, cliente_nome: u.cliente_nome, titulo: u.titulo } }); return;
  }
  if (req.method === 'POST' && acao === 'or_estornar') {
    const b = corpo(req); const motivo = txt(b.motivo, 300);
    if (!podeEstornar(usuario)) return erro(res, 403, 'sem_permissao', 'Sem permissão para estornar.');
    if (!motivo || motivo.length < 3) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { motivo: 'Informe o motivo.' } });
    if (b.confirmacao !== true) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { confirmacao: 'Confirme o estorno.' } });
    const r = await c.query(`update brow_orc_usos set estornado=true, estorno_motivo=$3, estornado_em=now(), estornado_por=$4 where estab=$1 and id=$2 and not estornado returning pacote_id, servico_nome, agendamento_id`, [estab, String(b.id || ''), motivo, usuario]);
    if (!r.rows.length) { const ex = await c.query('select id from brow_orc_usos where estab=$1 and id=$2', [estab, String(b.id || '')]); if (ex.rows.length) { res.status(200).json({ ok: true, repetido: true }); return; } return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.'); }
    await historico(c, estab, 'pacote', r.rows[0].pacote_id, 'sessao_estornada', { autor: usuario, item: r.rows[0].servico_nome, uso_id: b.id, agendamento_id: r.rows[0].agendamento_id, motivo });
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && acao === 'or_encerrar') {
    const b = corpo(req); const motivo = txt(b.motivo, 300);
    if (!motivo || motivo.length < 3) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { motivo: 'Informe o motivo.' } });
    if (b.confirmacao !== true) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { confirmacao: 'Confirme.' } });
    const r = await c.query(`update brow_orc_pacotes set situacao='encerrado', encerrado_em=now(), encerrado_motivo=$3, atualizado_em=now() where estab=$1 and id=$2 and situacao='ativo' returning id`, [estab, String(b.id || ''), motivo]);
    if (!r.rows.length) return erro(res, 409, 'situacao', 'Pacote já encerrado ou não encontrado.');
    await historico(c, estab, 'pacote', r.rows[0].id, 'encerrado', { autor: usuario, motivo });
    res.status(200).json({ ok: true }); return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports.garantirTabelas = garantirTabelas;
module.exports.vincularReserva = vincularReserva;
module.exports._teste = { centavos, apresentacao, subtotal };
