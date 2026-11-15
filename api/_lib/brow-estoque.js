// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ESTOQUE E MATERIAIS (10/11/2026)
// Ações "es_*" via api/_lib/brow-studio.js.
//
// • QUANTIDADES em MILÉSIMOS inteiros (bigint "_mil"): 1,5 g = 1500.
//   unidade/frasco só aceitam inteiros (múltiplos de 1000); g/ml até 3 casas.
// • SALDO por lote (brow_est_lotes.saldo_mil, check >= 0) muda só dentro de
//   transação com a linha do lote travada (select … for update): duas saídas
//   simultâneas nunca deixam o lote negativo. Cada mudança gera uma linha em
//   brow_est_movimentos (histórico; nunca apagado).
// • Disponível = lotes não bloqueados e não vencidos (fuso do estabelecimento).
//   Validade ausente NÃO é validade confirmada: o lote conta, mas com alerta.
// • Correções: estorno vinculado à movimentação original (no máximo 1) ou
//   ajuste de inventário (saldo anterior, contado e diferença).
// • Atendimento: consumo só por ação explícita, com chave_envio (1 saída por
//   consumo). Nada é baixado automaticamente.
// • Financeiro: entrada NÃO é pagamento. Despesa só por ação explícita a partir
//   de uma entrada (valor + vencimento), no máximo 1 ativa por entrada.
// • PERMISSÕES: ajuste e estorno passam por podeAjustar/podeEstornar — quando o
//   login existir, checar a função da pessoa. Hoje só o modo de teste local passa.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const UNIDADES = { unidade: 'Unidade', frasco: 'Frasco', g: 'g', ml: 'ml' };
const TIPOS = { saldo_inicial: 'Saldo inicial', entrada: 'Entrada', consumo: 'Consumo em atendimento', descarte: 'Descarte/perda', ajuste: 'Ajuste de inventário', estorno: 'Estorno' };
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const MAX_MIL = 1e12;
const podeAjustar = (usuario) => true;   // login pendente: ver cabeçalho
const podeEstornar = (usuario) => true;

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_est_config(estab text primary key, dias_alerta integer not null default 30 check (dias_alerta between 1 and 365), atualizado_em timestamptz not null default now())`);
  await c.query(`create table if not exists brow_est_produtos(
    id text primary key, estab text not null, nome text not null, marca text, unidade text not null check (unidade in ('unidade','frasco','g','ml')),
    minimo_mil bigint not null default 0 check (minimo_mil >= 0), arquivado boolean not null default false,
    criado_por text, chave_envio text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_est_prod_envio on brow_est_produtos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_est_prod_nome on brow_est_produtos(estab, lower(nome))`);
  await c.query(`create table if not exists brow_est_lotes(
    id text primary key, estab text not null, produto_id text not null references brow_est_produtos(id),
    identificacao text, validade date, fornecedor_id text, fornecedor_nome text,
    saldo_mil bigint not null default 0 check (saldo_mil >= 0), bloqueado boolean not null default false, bloqueio_motivo text,
    criado_em timestamptz not null default now())`);
  await c.query(`create index if not exists brow_est_lote_prod on brow_est_lotes(estab, produto_id)`);
  await c.query(`create table if not exists brow_est_movimentos(
    id text primary key, estab text not null, produto_id text not null, lote_id text not null,
    tipo text not null check (tipo in ('saldo_inicial','entrada','consumo','descarte','ajuste','estorno')),
    qtd_mil bigint not null, saldo_antes_mil bigint not null, saldo_depois_mil bigint not null, contado_mil bigint,
    data date not null, motivo text, responsavel text,
    produto_nome text not null, lote_ident text, lote_validade date, unidade text not null,
    agendamento_id text, registro_id text, cliente_nome text,
    estorno_de text, estornado boolean not null default false, despesa_id text,
    chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_est_mov_envio on brow_est_movimentos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_est_mov_estorno on brow_est_movimentos(estab, estorno_de) where estorno_de is not null`);
  await c.query(`create index if not exists brow_est_mov_prod on brow_est_movimentos(estab, produto_id)`);
  await c.query(`create index if not exists brow_est_mov_ag on brow_est_movimentos(estab, agendamento_id)`);
  await c.query(`create index if not exists brow_est_mov_rg on brow_est_movimentos(estab, registro_id)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const inteira = (u) => u === 'unidade' || u === 'frasco';
// "2" | "1,5" | "1.250,125" → milésimos inteiros (nunca float). Unidade/frasco: só inteiros.
function qtdParaMil(v, unidade) {
  const s = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!s) return null;
  const casas = inteira(unidade) ? 0 : 3;
  const re = casas ? /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,3})?$/ : /^(\d{1,3}(\.\d{3})+|\d+)$/;
  if (!re.test(s)) return null;
  const [i, d = ''] = s.replace(/\./g, '').split(',');
  const n = parseInt(i, 10) * 1000 + parseInt((d + '000').slice(0, 3), 10);
  return Number.isSafeInteger(n) && n <= MAX_MIL ? n : null;
}
function milTexto(n, unidade) {
  n = Number(n); const neg = n < 0; n = Math.abs(n);
  const i = Math.floor(n / 1000), d = String(n % 1000).padStart(3, '0').replace(/0+$/, '');
  const num = `${neg ? '−' : ''}${String(i).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d ? ',' + d : ''}`;
  if (unidade === 'unidade') return `${num} un.`;
  if (unidade === 'frasco') return `${num} ${i === 1 && !d ? 'frasco' : 'frascos'}`;
  return `${num} ${unidade}`;
}
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}
const somaDias = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
async function hoje(c, estab) {
  let fuso = 'America/Sao_Paulo';
  try { const r = await c.query('select fuso from brow_config where estab=$1', [estab]); if (r.rows[0] && FUSOS.includes(r.rows[0].fuso)) fuso = r.rows[0].fuso; } catch (e) {}
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
async function diasAlerta(c, estab) { const r = await c.query('select dias_alerta from brow_est_config where estab=$1', [estab]); return r.rows[0] ? r.rows[0].dias_alerta : 30; }
async function historico(c, estab, id, acao, det) {
  await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'estoque_produto',$2,$3,$4)`, [estab, id, acao, det ? JSON.stringify(det) : null]);
}
const LOTE_SEL = `select l.*, to_char(l.validade,'YYYY-MM-DD') val from brow_est_lotes l`;
function lote(x, hj, lim) {
  const v = x.val || null;
  const vencido = !!v && v < hj, aVencer = !!v && !vencido && v <= lim;
  return { id: x.id, produto_id: x.produto_id, identificacao: x.identificacao, validade: v, fornecedor_id: x.fornecedor_id, fornecedor_nome: x.fornecedor_nome,
    saldo_mil: Number(x.saldo_mil), bloqueado: x.bloqueado, bloqueio_motivo: x.bloqueio_motivo, vencido, a_vencer: aVencer, sem_validade: !v,
    disponivel: !vencido && !x.bloqueado, criado_em: x.criado_em };
}
// totais e alertas de um produto a partir dos lotes
function resumoProduto(p, lotes) {
  const fisica = lotes.reduce((s, l) => s + l.saldo_mil, 0);
  const disp = lotes.filter(l => l.disponivel).reduce((s, l) => s + l.saldo_mil, 0);
  const comSaldo = lotes.filter(l => l.saldo_mil > 0);
  const alertas = [];
  if (Number(p.minimo_mil) > 0 && disp <= Number(p.minimo_mil)) alertas.push('baixo');
  else if (disp === 0 && fisica === 0) alertas.push('sem_saldo');
  if (comSaldo.some(l => l.vencido)) alertas.push('vencido');
  if (comSaldo.some(l => l.a_vencer)) alertas.push('a_vencer');
  if (comSaldo.some(l => l.sem_validade)) alertas.push('sem_validade');
  if (comSaldo.some(l => l.bloqueado)) alertas.push('bloqueado');
  return { fisica_mil: fisica, disponivel_mil: disp, indisponivel_mil: fisica - disp, alertas };
}

module.exports = async function estoque(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;
  const hj = await hoje(c, estab);
  const dias = await diasAlerta(c, estab);
  const lim = somaDias(hj, dias);

  if (acao === 'es_config_ver') { res.status(200).json({ ok: true, dias_alerta: dias, hoje: hj }); return; }
  if (req.method === 'POST' && acao === 'es_config_salvar') {
    const n = parseInt(corpo(req).dias_alerta, 10);
    if (!(n >= 1 && n <= 365)) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { dias_alerta: 'Informe de 1 a 365 dias.' } });
    await c.query(`insert into brow_est_config(estab,dias_alerta) values($1,$2) on conflict (estab) do update set dias_alerta=excluded.dias_alerta, atualizado_em=now()`, [estab, n]);
    res.status(200).json({ ok: true }); return;
  }

  // ── LISTA (alertas calculados com a data de hoje no fuso do estúdio) ──
  if (acao === 'es_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab, hj, lim]; let f = q.filtro === 'arquivados' ? ' and p.arquivado' : ' and not p.arquivado';
    const termo = txt(q.q, 60);
    if (termo) {
      params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
      const sem = (col) => `translate(lower(coalesce(${col},'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')`;
      f += ` and (${sem('p.nome')} like $${params.length} or ${sem('p.marca')} like $${params.length})`;
    }
    const base = `select p.id, p.nome, p.marca, p.unidade, p.minimo_mil, p.arquivado,
        coalesce(sum(l.saldo_mil),0)::bigint fisica_mil,
        coalesce(sum(l.saldo_mil) filter (where not l.bloqueado and (l.validade is null or l.validade >= $2::date)),0)::bigint disp_mil,
        bool_or(l.saldo_mil > 0 and l.validade < $2::date) tem_vencido,
        bool_or(l.saldo_mil > 0 and l.validade >= $2::date and l.validade <= $3::date) tem_a_vencer,
        bool_or(l.saldo_mil > 0 and l.validade is null) tem_sem_validade
      from brow_est_produtos p left join brow_est_lotes l on l.produto_id=p.id and l.estab=p.estab where p.estab=$1${f} group by p.id`;
    let ff = '';
    if (q.filtro === 'baixo') ff = ' where (minimo_mil > 0 and disp_mil <= minimo_mil) or (disp_mil = 0)';
    if (q.filtro === 'vencidos') ff = ' where tem_vencido';
    if (q.filtro === 'a_vencer') ff = ' where tem_a_vencer';
    const tot = await c.query(`select count(*)::int n from (${base}) x${ff}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select * from (${base}) x${ff} order by lower(nome) limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, dias_alerta: dias, itens: r.rows.map(x => {
      const fis = Number(x.fisica_mil), disp = Number(x.disp_mil), min = Number(x.minimo_mil); const al = [];
      if (min > 0 && disp <= min) al.push('baixo'); else if (disp === 0) al.push(fis ? 'sem_disponivel' : 'sem_saldo');
      if (x.tem_vencido) al.push('vencido'); if (x.tem_a_vencer) al.push('a_vencer'); if (x.tem_sem_validade) al.push('sem_validade');
      return { id: x.id, nome: x.nome, marca: x.marca, unidade: x.unidade, arquivado: x.arquivado, fisica_mil: fis, disponivel_mil: disp, fisica: milTexto(fis, x.unidade), disponivel: milTexto(disp, x.unidade), alertas: al };
    }) });
    return;
  }

  if (acao === 'es_ver') {
    const r = await c.query('select * from brow_est_produtos where estab=$1 and id=$2', [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Produto não encontrado.');
    const p = r.rows[0];
    const ls = (await c.query(`${LOTE_SEL} where l.estab=$1 and l.produto_id=$2`, [estab, p.id])).rows.map(x => lote(x, hj, lim));
    const n = await c.query('select count(*)::int n from brow_est_movimentos where estab=$1 and produto_id=$2', [estab, p.id]);
    const rs = resumoProduto(p, ls);
    res.status(200).json({ ok: true, hoje: hj, dias_alerta: dias, produto: { id: p.id, nome: p.nome, marca: p.marca, unidade: p.unidade, unidade_nome: UNIDADES[p.unidade], minimo_mil: Number(p.minimo_mil), arquivado: p.arquivado, criado_por: p.criado_por,
      ...rs, fisica: milTexto(rs.fisica_mil, p.unidade), disponivel: milTexto(rs.disponivel_mil, p.unidade), indisponivel: milTexto(rs.indisponivel_mil, p.unidade), minimo: milTexto(p.minimo_mil, p.unidade),
      lotes_total: ls.length, lotes_com_saldo: ls.filter(l => l.saldo_mil > 0).length, movimentos_total: n.rows[0].n } });
    return;
  }

  // ── LOTES (FEFO: válidos com vencimento mais próximo primeiro) ──
  if (acao === 'es_lotes') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const pr = await c.query('select unidade from brow_est_produtos where estab=$1 and id=$2', [estab, String(q.produto || '')]);
    if (!pr.rows.length) return erro(res, 404, 'nao_encontrado', 'Produto não encontrado.');
    const un = pr.rows[0].unidade;
    const params = [estab, String(q.produto), hj]; let f = '';
    if (q.com_saldo === '1') f += ' and l.saldo_mil > 0';
    const tot = await c.query(`select count(*)::int n from brow_est_lotes l where l.estab=$1 and l.produto_id=$2${f}`, params.slice(0, 2));
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`${LOTE_SEL} where l.estab=$1 and l.produto_id=$2${f}
      order by (l.saldo_mil > 0 and not l.bloqueado and (l.validade is null or l.validade >= $3::date)) desc, l.validade asc nulls last, l.criado_em
      limit ${limite} offset ${(pg - 1) * limite}`, params);
    // sugestão: o lote disponível com saldo e validade mais próxima (a escolha continua sendo da profissional)
    const s = await c.query(`select id from brow_est_lotes l where l.estab=$1 and l.produto_id=$2 and l.saldo_mil > 0 and not l.bloqueado and (l.validade is null or l.validade >= $3::date)
      order by l.validade asc nulls last, l.criado_em limit 1`, params);
    const sug = s.rows[0] ? s.rows[0].id : null;
    res.status(200).json({ ok: true, total, pagina: pg, paginas, hoje: hj, unidade: un, sugerido: sug,
      itens: r.rows.map(x => { const l = lote(x, hj, lim); return { ...l, saldo: milTexto(l.saldo_mil, un), sugerido: l.id === sug }; }) });
    return;
  }
  if (acao === 'es_lote_ver') {
    const r = await c.query(`${LOTE_SEL} where l.estab=$1 and l.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Lote não encontrado.');
    const p = (await c.query('select id, nome, marca, unidade, arquivado from brow_est_produtos where estab=$1 and id=$2', [estab, r.rows[0].produto_id])).rows[0];
    const l = lote(r.rows[0], hj, lim);
    res.status(200).json({ ok: true, hoje: hj, lote: { ...l, saldo: milTexto(l.saldo_mil, p.unidade) }, produto: p });
    return;
  }
  if (acao === 'es_lote_ident') {
    const ident = txt(q.ident, 60);
    if (!ident) { res.status(200).json({ ok: true, itens: [] }); return; }
    const r = await c.query(`${LOTE_SEL} where l.estab=$1 and l.produto_id=$2 and lower(l.identificacao)=lower($3)`, [estab, String(q.produto || ''), ident]);
    res.status(200).json({ ok: true, itens: r.rows.map(x => lote(x, hj, lim)) });
    return;
  }
  if (req.method === 'POST' && acao === 'es_lote_bloquear') {
    const b = corpo(req); const bloquear = b.valor === true;
    const motivo = txt(b.motivo, 200);
    if (bloquear && (!motivo || motivo.length < 3)) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { motivo: 'Informe o motivo do bloqueio.' } });
    const r = await c.query('update brow_est_lotes set bloqueado=$3, bloqueio_motivo=$4 where estab=$1 and id=$2 returning produto_id', [estab, String(b.id || ''), bloquear, bloquear ? motivo : null]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Lote não encontrado.');
    await historico(c, estab, r.rows[0].produto_id, bloquear ? 'lote_bloqueado' : 'lote_desbloqueado', { autor: usuario, lote_id: b.id, motivo });
    res.status(200).json({ ok: true }); return;
  }
  if (acao === 'es_fornecedores') {
    const termo = txt(q.q, 60); const l = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 20);
    const params = [estab]; let f = '';
    if (termo) { params.push('%' + termo.toLowerCase() + '%'); f = ' and (lower(nome) like $2 or lower(coalesce(empresa,\'\')) like $2)'; }
    const r = await c.query(`select id, nome, empresa, categoria from brow_contatos where estab=$1 and not arquivado${f} order by (categoria='fornecedor') desc, lower(nome) limit ${l}`, params);
    res.status(200).json({ ok: true, itens: r.rows });
    return;
  }

  // ── PRODUTO: criar (com lote inicial opcional) / editar (sem mexer no saldo) ──
  if (req.method === 'POST' && acao === 'es_produto_salvar') {
    const b = corpo(req); const erros = {}; const out = {};
    const nome = txt(b.nome, 100); if (!nome || nome.length < 2) erros.nome = 'Informe o nome.'; else out.nome = nome;
    out.marca = txt(b.marca, 80);
    if (!UNIDADES[b.unidade]) erros.unidade = 'Escolha a unidade de controle.'; else out.unidade = b.unidade;
    if (out.unidade) { const m = qtdParaMil(b.minimo, out.unidade); if (m === null) erros.minimo = inteira(out.unidade) ? 'Informe um número inteiro (0 ou mais).' : 'Informe 0 ou mais (até 3 casas decimais).'; else out.minimo_mil = m; }
    if (b.id) {
      if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
      await c.query('begin');
      try {
        const r = await c.query('select * from brow_est_produtos where estab=$1 and id=$2 for update', [estab, String(b.id)]);
        if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Produto não encontrado.'); }
        const a = r.rows[0];
        if (a.unidade !== out.unidade) {
          const n = await c.query('select count(*)::int n from brow_est_movimentos where estab=$1 and produto_id=$2', [estab, a.id]);
          if (n.rows[0].n) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { unidade: 'O produto já tem movimentações: a unidade não pode mudar sem um processo de conversão.' } }); }
        }
        const mud = {};
        for (const k of ['nome', 'marca', 'unidade', 'minimo_mil']) if (String(a[k] == null ? '' : a[k]) !== String(out[k] == null ? '' : out[k])) mud[k] = { de: a[k], para: out[k] };
        if (Object.keys(mud).length) {
          await c.query('update brow_est_produtos set nome=$3, marca=$4, unidade=$5, minimo_mil=$6, atualizado_em=now() where estab=$1 and id=$2', [estab, a.id, out.nome, out.marca, out.unidade, out.minimo_mil]);
          await historico(c, estab, a.id, 'editado', { autor: usuario, mudancas: mud });
        }
        await c.query('commit');
        res.status(200).json({ ok: true, id: a.id }); return;
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
    }
    // lote inicial
    const li = b.lote || {};
    let qi = 0;
    if (out.unidade) { qi = qtdParaMil(li.quantidade || '0', out.unidade); if (qi === null) erros.quantidade = inteira(out.unidade) ? 'Quantidade inteira (0 ou mais).' : 'Quantidade inválida (até 3 casas decimais).'; }
    const ident = li.sem_lote ? null : txt(li.identificacao, 60);
    if (!li.sem_lote && !ident && qi > 0) erros.identificacao = 'Informe o lote ou marque “Sem lote”.';
    const val = li.sem_validade ? null : (li.validade || null);
    if (!li.sem_validade && qi > 0 && !dataValida(val)) erros.validade = 'Informe a validade ou marque “Sem validade informada”.';
    if (val && !dataValida(val)) erros.validade = 'Data inválida.';
    if (qi > 0 && val && val < hj && li.confirmar_vencido !== true) erros.confirmar_vencido = 'Lote vencido: confirme que entra como indisponível.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    await c.query('begin');
    try {
      const id = crypto.randomUUID();
      const ins = await c.query(`insert into brow_est_produtos(id,estab,nome,marca,unidade,minimo_mil,criado_por,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning id`,
        [id, estab, out.nome, out.marca, out.unidade, out.minimo_mil, usuario, chave]);
      if (!ins.rows.length) { await c.query('rollback'); const o = await c.query('select id from brow_est_produtos where estab=$1 and chave_envio=$2', [estab, chave]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
      await historico(c, estab, id, 'criado', { autor: usuario });
      if (qi > 0) {
        let fn = null; if (li.fornecedor_id) { const f = await c.query('select nome from brow_contatos where estab=$1 and id=$2', [estab, String(li.fornecedor_id)]); fn = f.rows[0] ? f.rows[0].nome : null; }
        const lid = crypto.randomUUID();
        await c.query('insert into brow_est_lotes(id,estab,produto_id,identificacao,validade,fornecedor_id,fornecedor_nome,saldo_mil) values($1,$2,$3,$4,$5,$6,$7,$8)', [lid, estab, id, ident, val, fn ? String(li.fornecedor_id) : null, fn, qi]);
        await c.query(`insert into brow_est_movimentos(id,estab,produto_id,lote_id,tipo,qtd_mil,saldo_antes_mil,saldo_depois_mil,data,motivo,responsavel,produto_nome,lote_ident,lote_validade,unidade,chave_envio)
          values($1,$2,$3,$4,'saldo_inicial',$5,0,$5,$6,'Saldo inicial do cadastro',$7,$8,$9,$10,$11,$12)`, [crypto.randomUUID(), estab, id, lid, qi, hj, usuario, out.nome, ident, val, out.unidade, chave + ':ini']);
      }
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── MOVIMENTAÇÃO (entrada, consumo, descarte, ajuste) com saldo revalidado sob trava ──
  if (req.method === 'POST' && acao === 'es_mov_salvar') {
    const b = corpo(req); const erros = {};
    const tipo = String(b.tipo || '');
    if (!['entrada', 'consumo', 'descarte', 'ajuste'].includes(tipo)) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { tipo: 'Escolha o tipo.' } });
    if (tipo === 'ajuste' && !podeAjustar(usuario)) return erro(res, 403, 'sem_permissao', 'Sem permissão para ajuste de inventário.');
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const pr = await c.query('select * from brow_est_produtos where estab=$1 and id=$2', [estab, String(b.produto_id || '')]);
    if (!pr.rows.length) return erro(res, 404, 'nao_encontrado', 'Produto não encontrado.');
    const p = pr.rows[0];
    if (p.arquivado) return erro(res, 409, 'arquivado', 'Produto arquivado: desarquive para movimentar.');
    const data = b.data || hj;
    if (!dataValida(data)) erros.data = 'Informe a data.'; else if (data > hj) erros.data = 'A data não pode ser futura.';
    const motivo = txt(b.motivo, 300);
    if ((tipo === 'descarte' || tipo === 'ajuste') && (!motivo || motivo.length < 3)) erros.motivo = tipo === 'ajuste' ? 'Informe a justificativa do ajuste.' : 'Informe o motivo do descarte.';
    let qtd = null, contado = null;
    if (tipo === 'ajuste') { contado = qtdParaMil(b.contado, p.unidade); if (contado === null) erros.contado = inteira(p.unidade) ? 'Informe o saldo contado (inteiro).' : 'Informe o saldo contado (até 3 casas).'; }
    else { qtd = qtdParaMil(b.quantidade, p.unidade); if (!qtd) erros.quantidade = inteira(p.unidade) ? 'Informe uma quantidade inteira maior que zero.' : 'Informe uma quantidade maior que zero (até 3 casas).'; }
    // novo lote (só em entrada)
    const nl = b.novo_lote || null;
    if (nl && tipo !== 'entrada') erros.lote = 'Novo lote só em entrada.';
    if (nl) {
      if (!nl.sem_lote && !txt(nl.identificacao, 60)) erros.identificacao = 'Informe o lote ou marque “Sem lote”.';
      if (!nl.sem_validade && !dataValida(nl.validade)) erros.validade = 'Informe a validade ou marque “Sem validade informada”.';
    } else if (!b.lote_id) erros.lote = 'Escolha o lote.';
    // vínculo com atendimento (consumo)
    let ag = null, rg = null;
    if (tipo === 'consumo' && b.agendamento_id) { const a = await c.query('select id, cliente_nome from brow_agendamentos where estab=$1 and id=$2', [estab, String(b.agendamento_id)]); ag = a.rows[0] || null; if (!ag) erros.agendamento_id = 'Atendimento não encontrado.'; }
    if (tipo === 'consumo' && b.registro_id) { const a = await c.query('select id, cliente_nome, agendamento_id from brow_registros where estab=$1 and id=$2', [estab, String(b.registro_id)]).catch(() => ({ rows: [] })); rg = a.rows[0] || null; if (!rg) erros.registro_id = 'Registro não encontrado.'; }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const ja = await c.query('select id from brow_est_movimentos where estab=$1 and chave_envio=$2', [estab, chave]);
      if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
      let L;
      if (nl) {
        const ident = nl.sem_lote ? null : txt(nl.identificacao, 60);
        if (ident && nl.confirmar_ident !== true) {
          const ex = await c.query('select id from brow_est_lotes where estab=$1 and produto_id=$2 and lower(identificacao)=lower($3)', [estab, p.id, ident]);
          if (ex.rows.length) { await c.query('rollback'); return erro(res, 409, 'lote_existe', 'Já existe lote com essa identificação neste produto.', { lote_id: ex.rows[0].id }); }
        }
        let fn = null; if (nl.fornecedor_id) { const f = await c.query('select nome from brow_contatos where estab=$1 and id=$2', [estab, String(nl.fornecedor_id)]); fn = f.rows[0] ? f.rows[0].nome : null; }
        const lid = crypto.randomUUID();
        await c.query('insert into brow_est_lotes(id,estab,produto_id,identificacao,validade,fornecedor_id,fornecedor_nome) values($1,$2,$3,$4,$5,$6,$7)',
          [lid, estab, p.id, ident, nl.sem_validade ? null : nl.validade, fn ? String(nl.fornecedor_id) : null, fn]);
        L = (await c.query(`${LOTE_SEL} where l.estab=$1 and l.id=$2 for update of l`, [estab, lid])).rows[0];
      } else {
        const r = await c.query(`${LOTE_SEL} where l.estab=$1 and l.id=$2 and l.produto_id=$3 for update of l`, [estab, String(b.lote_id), p.id]);
        if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Lote não encontrado.'); }
        L = r.rows[0];
      }
      const lt = lote(L, hj, lim); const antes = Number(L.saldo_mil);
      let delta;
      if (tipo === 'entrada') {
        if (lt.vencido && b.confirmar_vencido !== true) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { confirmar_vencido: 'Lote vencido: confirme que a entrada fica indisponível para uso.' } }); }
        delta = qtd;
      } else if (tipo === 'consumo') {
        if (lt.vencido) { await c.query('rollback'); return erro(res, 409, 'lote_vencido', 'Lote vencido: não pode ser usado em atendimento. Use “Descarte/perda”.'); }
        if (lt.bloqueado) { await c.query('rollback'); return erro(res, 409, 'lote_bloqueado', 'Lote bloqueado: não pode ser usado em atendimento.'); }
        delta = -qtd;
      } else if (tipo === 'descarte') delta = -qtd;
      else { delta = contado - antes; if (delta === 0) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { contado: 'O saldo contado é igual ao do sistema: não há ajuste a fazer.' } }); } }
      if (antes + delta < 0) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { quantidade: `Passa do saldo do lote (${milTexto(antes, p.unidade)}).` }, saldo_mil: antes }); }
      await c.query('update brow_est_lotes set saldo_mil=saldo_mil+$3 where estab=$1 and id=$2', [estab, L.id, delta]);
      const mid = crypto.randomUUID();
      await c.query(`insert into brow_est_movimentos(id,estab,produto_id,lote_id,tipo,qtd_mil,saldo_antes_mil,saldo_depois_mil,contado_mil,data,motivo,responsavel,produto_nome,lote_ident,lote_validade,unidade,agendamento_id,registro_id,cliente_nome,chave_envio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [mid, estab, p.id, L.id, tipo, delta, antes, antes + delta, contado, data, motivo, usuario, p.nome, L.identificacao, L.val || null, p.unidade,
          ag ? ag.id : (rg ? rg.agendamento_id : null), rg ? rg.id : null, ag ? ag.cliente_nome : (rg ? rg.cliente_nome : null), chave]);
      await c.query('commit');
      res.status(201).json({ ok: true, id: mid, lote_id: L.id, saldo_lote_mil: antes + delta }); return;
    } catch (e) {
      await c.query('rollback').catch(() => {});
      if (e.code === '23514') return erro(res, 409, 'saldo', 'O saldo mudou e ficaria negativo. Confira e tente de novo.');
      throw e;
    }
  }

  // ── HISTÓRICO ──
  if (acao === 'es_movimentos') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const params = [estab]; let f = '';
    if (q.produto) { params.push(String(q.produto)); f += ` and m.produto_id=$${params.length}`; }
    if (q.lote) { params.push(String(q.lote)); f += ` and m.lote_id=$${params.length}`; }
    if (q.agendamento || q.registro) {
      const ors = [];
      if (q.agendamento) { params.push(String(q.agendamento)); ors.push(`m.agendamento_id=$${params.length}`); }
      if (q.registro) { params.push(String(q.registro)); ors.push(`m.registro_id=$${params.length}`); }
      f += ` and (${ors.join(' or ')}) and m.tipo='consumo'`;
    }
    if (!q.produto && !q.lote && !q.agendamento && !q.registro) return erro(res, 400, 'filtro', 'Informe o produto.');
    const tot = await c.query(`select count(*)::int n from brow_est_movimentos m where m.estab=$1${f}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select m.*, to_char(m.data,'YYYY-MM-DD') data, to_char(m.lote_validade,'YYYY-MM-DD') lote_validade from brow_est_movimentos m where m.estab=$1${f}
      order by m.criado_em desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(x => ({ id: x.id, tipo: x.tipo, tipo_nome: TIPOS[x.tipo], qtd_mil: Number(x.qtd_mil), quantidade: milTexto(x.qtd_mil, x.unidade),
      data: x.data, responsavel: x.responsavel, motivo: x.motivo, lote_ident: x.lote_ident, lote_validade: x.lote_validade, produto_id: x.produto_id, produto_nome: x.produto_nome, estornado: x.estornado, estorno_de: x.estorno_de, agendamento_id: x.agendamento_id, cliente_nome: x.cliente_nome })) });
    return;
  }
  if (acao === 'es_mov_ver') {
    const r = await c.query(`select m.*, to_char(m.data,'YYYY-MM-DD') data, to_char(m.lote_validade,'YYYY-MM-DD') lote_validade from brow_est_movimentos m where m.estab=$1 and m.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Movimentação não encontrada.');
    const m = r.rows[0];
    const est = await c.query('select id from brow_est_movimentos where estab=$1 and estorno_de=$2', [estab, m.id]);
    let despesa = null;
    if (m.despesa_id) { const d = await c.query('select id, cancelado, total_centavos from brow_fin_lancamentos where estab=$1 and id=$2', [estab, m.despesa_id]).catch(() => ({ rows: [] })); despesa = d.rows[0] || null; }
    const lt = (await c.query(`${LOTE_SEL} where l.estab=$1 and l.id=$2`, [estab, m.lote_id])).rows[0];
    res.status(200).json({ ok: true, hoje: hj, movimento: { ...m, qtd_mil: Number(m.qtd_mil), quantidade: milTexto(m.qtd_mil, m.unidade), saldo_antes: milTexto(m.saldo_antes_mil, m.unidade), saldo_depois: milTexto(m.saldo_depois_mil, m.unidade),
      contado: m.contado_mil != null ? milTexto(m.contado_mil, m.unidade) : null, tipo_nome: TIPOS[m.tipo], estorno_id: est.rows[0] ? est.rows[0].id : null, despesa, saldo_lote_mil: lt ? Number(lt.saldo_mil) : 0, saldo_lote: lt ? milTexto(lt.saldo_mil, m.unidade) : '' } });
    return;
  }

  // ── ESTORNO (vinculado; no máximo 1 por movimentação) ──
  if (req.method === 'POST' && acao === 'es_estornar') {
    const b = corpo(req); const erros = {};
    if (!podeEstornar(usuario)) return erro(res, 403, 'sem_permissao', 'Sem permissão para estornar.');
    const motivo = txt(b.motivo, 300);
    if (!motivo || motivo.length < 3) erros.motivo = 'Informe a justificativa.';
    if (b.confirmacao !== true) erros.confirmacao = 'Confirme o estorno.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('begin');
    try {
      const r = await c.query('select * from brow_est_movimentos where estab=$1 and id=$2 for update', [estab, String(b.id || '')]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Movimentação não encontrada.'); }
      const m = r.rows[0];
      if (m.tipo === 'estorno') { await c.query('rollback'); return erro(res, 409, 'estorno', 'Um estorno não pode ser estornado. Registre uma nova movimentação.'); }
      if (m.estornado) { await c.query('rollback'); const e = await c.query('select id from brow_est_movimentos where estab=$1 and estorno_de=$2', [estab, m.id]); res.status(200).json({ ok: true, id: e.rows[0] && e.rows[0].id, repetido: true }); return; }
      const L = (await c.query(`${LOTE_SEL} where l.estab=$1 and l.id=$2 for update of l`, [estab, m.lote_id])).rows[0];
      const antes = Number(L.saldo_mil), delta = -Number(m.qtd_mil);
      if (antes + delta < 0) { await c.query('rollback'); return erro(res, 409, 'saldo', `O lote tem ${milTexto(antes, m.unidade)}: estornar esta entrada deixaria o saldo negativo. Registre um descarte ou ajuste.`); }
      await c.query('update brow_est_lotes set saldo_mil=saldo_mil+$3 where estab=$1 and id=$2', [estab, L.id, delta]);
      await c.query('update brow_est_movimentos set estornado=true where estab=$1 and id=$2', [estab, m.id]);
      const id = crypto.randomUUID();
      await c.query(`insert into brow_est_movimentos(id,estab,produto_id,lote_id,tipo,qtd_mil,saldo_antes_mil,saldo_depois_mil,data,motivo,responsavel,produto_nome,lote_ident,lote_validade,unidade,agendamento_id,registro_id,cliente_nome,estorno_de)
        values($1,$2,$3,$4,'estorno',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [id, estab, m.produto_id, m.lote_id, delta, antes, antes + delta, hj, motivo, usuario, m.produto_nome, m.lote_ident, m.lote_validade, m.unidade, m.agendamento_id, m.registro_id, m.cliente_nome, m.id]);
      await c.query('commit');
      res.status(200).json({ ok: true, id, despesa_vinculada: !!m.despesa_id }); return;
    } catch (e) {
      await c.query('rollback').catch(() => {});
      if (e.code === '23505') { res.status(200).json({ ok: true, repetido: true }); return; }
      if (e.code === '23514') return erro(res, 409, 'saldo', 'O saldo mudou e ficaria negativo.');
      throw e;
    }
  }

  // ── DESPESA a partir de uma entrada (ação explícita; sem duplicar) ──
  if (req.method === 'POST' && acao === 'es_despesa_criar') {
    const b = corpo(req); const erros = {};
    const fin = require('./brow-financeiro.js');
    const valor = fin._teste.textoParaCentavos(b.valor);
    if (!valor) erros.valor = 'Informe o valor, maior que zero.';
    if (!dataValida(b.vencimento)) erros.vencimento = 'Informe o vencimento.';
    const desc = txt(b.descricao, 120); if (!desc || desc.length < 2) erros.descricao = 'Informe a descrição.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await fin.garantirTabelas(c);
    await c.query('begin');
    try {
      const r = await c.query('select * from brow_est_movimentos where estab=$1 and id=$2 for update', [estab, String(b.movimento_id || '')]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Movimentação não encontrada.'); }
      const m = r.rows[0];
      if (!['entrada', 'saldo_inicial'].includes(m.tipo) || m.estornado) { await c.query('rollback'); return erro(res, 409, 'tipo', 'Despesa só pode ser criada a partir de uma entrada ativa.'); }
      if (m.despesa_id) {
        const d = await c.query('select id, cancelado from brow_fin_lancamentos where estab=$1 and id=$2', [estab, m.despesa_id]);
        if (d.rows.length && !d.rows[0].cancelado) { await c.query('rollback'); return erro(res, 409, 'ja_existe', 'Esta entrada já tem despesa no financeiro.', { id: m.despesa_id }); }
      }
      const L = (await c.query('select fornecedor_id, fornecedor_nome from brow_est_lotes where estab=$1 and id=$2', [estab, m.lote_id])).rows[0] || {};
      const id = crypto.randomUUID();
      await c.query(`insert into brow_fin_lancamentos(id,estab,tipo,descricao,categoria,pessoa_tipo,pessoa_id,pessoa_nome,total_centavos,vencimento,observacao,criado_por)
        values($1,$2,'despesa',$3,'materiais',$4,$5,$6,$7,$8,$9,$10)`,
        [id, estab, desc, L.fornecedor_id ? 'contato' : null, L.fornecedor_id || null, L.fornecedor_nome || null, valor, b.vencimento, `Entrada de estoque: ${m.produto_nome} · ${milTexto(m.qtd_mil, m.unidade)}`, usuario]);
      await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,'criado',$3)`, [estab, id, JSON.stringify({ autor: usuario, total: valor, origem: 'estoque', movimento_id: m.id })]);
      await c.query('update brow_est_movimentos set despesa_id=$3 where estab=$1 and id=$2', [estab, m.id, id]);
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── ARQUIVAR / EXCLUIR (excluir só sem histórico) ──
  if (req.method === 'POST' && acao === 'es_arquivar') {
    const b = corpo(req);
    const r = await c.query('update brow_est_produtos set arquivado=$3, atualizado_em=now() where estab=$1 and id=$2 returning id', [estab, String(b.id || ''), b.valor === true]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Produto não encontrado.');
    await historico(c, estab, r.rows[0].id, b.valor === true ? 'arquivado' : 'desarquivado', { autor: usuario });
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && acao === 'es_excluir') {
    const b = corpo(req);
    if (b.confirmacao !== true) return erro(res, 422, 'sem_confirmacao', 'Confirme a exclusão.');
    await c.query('begin');
    try {
      const n = await c.query('select count(*)::int n from brow_est_movimentos where estab=$1 and produto_id=$2', [estab, String(b.id || '')]);
      if (n.rows[0].n) { await c.query('rollback'); return erro(res, 409, 'tem_historico', 'Produto com histórico: arquive em vez de excluir.'); }
      await c.query('delete from brow_est_lotes where estab=$1 and produto_id=$2', [estab, String(b.id || '')]);
      const r = await c.query('delete from brow_est_produtos where estab=$1 and id=$2', [estab, String(b.id || '')]);
      await c.query('commit');
      res.status(200).json({ ok: true, excluido: r.rowCount > 0 }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── ATENDIMENTO: dados para a página de materiais ──
  if (acao === 'es_atendimento') {
    let ag = null, rg = null;
    if (q.agendamento) { const a = await c.query(`select id, cliente_nome, servico_nome, profissional_nome, to_char(data,'YYYY-MM-DD') data, situacao from brow_agendamentos where estab=$1 and id=$2`, [estab, String(q.agendamento)]); ag = a.rows[0] || null; }
    if (q.registro) { const a = await c.query(`select id, cliente_nome, servico_nome, profissional_nome, to_char(data,'YYYY-MM-DD') data, agendamento_id from brow_registros where estab=$1 and id=$2`, [estab, String(q.registro)]).catch(() => ({ rows: [] })); rg = a.rows[0] || null; }
    if (!ag && !rg) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
    res.status(200).json({ ok: true, hoje: hj, agendamento: ag, registro: rg });
    return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { qtdParaMil, milTexto };
module.exports.garantirTabelas = garantirTabelas;
