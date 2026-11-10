// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — CONTATOS DO ESTÚDIO (10/11/2026)
// Fornecedores, parceiros, profissionais e outros. Clientes NÃO entram aqui
// (ficam só em brow_clientes). Ações "ct_*" via api/_lib/brow-studio.js.
//
// TELEFONES guardados só com dígitos e COM o código do país (55 para Brasil):
// "(11) 98888-7777", "+55 11 98888 7777" e "5511988887777" viram o mesmo
// 5511988887777 — nunca "5555...". Número de fora precisa vir com "+".
// Contato "Profissional" pode apontar para uma profissional da agenda
// (profissional_id) — não cria cadastro paralelo nem acesso ao sistema.
// Excluir apaga só o contato; arquivar esconde sem apagar.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const CATEGORIAS = { fornecedor: 'Fornecedor', parceiro: 'Parceiro', profissional: 'Profissional', outro: 'Outro' };
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

async function garantirTabela(c) {
  await c.query(`create table if not exists brow_contatos(
    id text primary key, estab text not null, nome text not null, categoria text not null check (categoria in ('fornecedor','parceiro','profissional','outro')),
    empresa text, telefone text, whatsapp text, email text, observacoes text, profissional_id text,
    favorito boolean not null default false, arquivado boolean not null default false,
    chave_envio text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_ct_envio on brow_contatos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_ct_nome on brow_contatos(estab, lower(nome))`);
}

const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
function brValido(d) {   // d = DDD + número (10 ou 11 dígitos)
  if (d.length !== 10 && d.length !== 11) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]);
}
// Normaliza para dígitos com código do país. Devolve { ok, numero } ou { ok:false } ; vazio = { ok:true, numero:null }
function normalizarTelefone(v) {
  const bruto = String(v == null ? '' : v).trim();
  if (!bruto) return { ok: true, numero: null };
  if (/[^\d\s()+.\-]/.test(bruto)) return { ok: false };
  const mais = bruto.startsWith('+') || bruto.startsWith('00');
  let d = bruto.replace(/\D/g, '');
  if (bruto.startsWith('00')) d = d.slice(2);
  if (!mais && brValido(d)) return { ok: true, numero: '55' + d };
  if (d.startsWith('55') && brValido(d.slice(2))) return { ok: true, numero: d };
  if (mais && !d.startsWith('55') && d.length >= 8 && d.length <= 15) return { ok: true, numero: d };   // internacional
  return { ok: false };
}
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;

function lerCampos(b) {
  const out = {}, erros = {};
  const nome = txt(b.nome, 100); if (!nome || nome.length < 2) erros.nome = 'Informe o nome.'; else out.nome = nome;
  if (!CATEGORIAS[b.categoria]) erros.categoria = 'Escolha a categoria.'; else out.categoria = b.categoria;
  out.empresa = txt(b.empresa, 100);
  const t = normalizarTelefone(b.telefone); if (!t.ok) erros.telefone = 'Telefone inválido. Use DDD + número (ou + código do país).'; else out.telefone = t.numero;
  const w = normalizarTelefone(b.whatsapp); if (!w.ok) erros.whatsapp = 'WhatsApp inválido. Use DDD + número (ou + código do país).'; else out.whatsapp = w.numero;
  const e = txt(b.email, 160); if (e && !emailValido(e.toLowerCase())) erros.email = 'E-mail inválido.'; else out.email = e ? e.toLowerCase() : null;
  out.observacoes = b.observacoes == null ? null : (String(b.observacoes).trim().slice(0, 1000) || null);
  out.profissional_id = out.categoria === 'profissional' && b.profissional_id ? String(b.profissional_id) : null;
  return { out, erros };
}

module.exports = async function contatos(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabela(c);
  const q = req.query || {};

  if (acao === 'ct_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let filtro = '';
    const f = String(q.filtro || 'todos');
    if (f === 'arquivados') filtro += ' and arquivado'; else filtro += ' and not arquivado';
    if (f === 'favoritos') filtro += ' and favorito';
    if (CATEGORIAS[f]) { params.push(f); filtro += ` and categoria=$${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) {
      params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
      const n = params.length;
      const sem = (col) => `translate(lower(coalesce(${col},'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')`;
      let ou = `${sem('nome')} like $${n} or ${sem('empresa')} like $${n}`;
      const dig = termo.replace(/\D/g, '');
      if (dig.length >= 3) { params.push('%' + dig + '%'); ou += ` or telefone like $${params.length} or whatsapp like $${params.length}`; }
      filtro += ` and (${ou})`;
    }
    const tot = await c.query(`select count(*)::int n from brow_contatos where estab=$1${filtro}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, nome, categoria, empresa, favorito, arquivado from brow_contatos where estab=$1${filtro}
      order by lower(nome), criado_em limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(x => ({ ...x, categoria_nome: CATEGORIAS[x.categoria] })) });
    return;
  }
  if (acao === 'ct_ver') {
    const r = await c.query(`select ct.*, p.nome profissional_nome from brow_contatos ct left join brow_profissionais p on p.id=ct.profissional_id and p.estab=ct.estab where ct.estab=$1 and ct.id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Contato não encontrado.');
    res.status(200).json({ ok: true, contato: { ...r.rows[0], categoria_nome: CATEGORIAS[r.rows[0].categoria] } });
    return;
  }
  // Possíveis duplicados pelo mesmo telefone/WhatsApp (só aviso — números podem ser compartilhados)
  if (acao === 'ct_duplicados') {
    const nums = [normalizarTelefone(q.telefone), normalizarTelefone(q.whatsapp)].filter(x => x.ok && x.numero).map(x => x.numero);
    if (!nums.length) { res.status(200).json({ ok: true, itens: [] }); return; }
    const r = await c.query(`select id, nome, categoria, telefone, whatsapp, arquivado from brow_contatos where estab=$1 and id<>$2 and (telefone = any($3) or whatsapp = any($3)) order by lower(nome) limit 5`,
      [estab, String(q.excluir || ''), nums]);
    res.status(200).json({ ok: true, itens: r.rows.map(x => ({ ...x, categoria_nome: CATEGORIAS[x.categoria] })) });
    return;
  }
  if (req.method === 'POST' && acao === 'ct_salvar') {
    const b = corpo(req);
    const { out, erros } = lerCampos(b);
    if (out.profissional_id) {
      const p = await c.query('select id from brow_profissionais where estab=$1 and id=$2', [estab, out.profissional_id]);
      if (!p.rows.length) erros.profissional_id = 'Profissional da agenda não encontrada.';
    }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    if (b.id) {
      const r = await c.query(`update brow_contatos set nome=$3, categoria=$4, empresa=$5, telefone=$6, whatsapp=$7, email=$8, observacoes=$9, profissional_id=$10, atualizado_em=now()
        where estab=$1 and id=$2`, [estab, String(b.id), out.nome, out.categoria, out.empresa, out.telefone, out.whatsapp, out.email, out.observacoes, out.profissional_id]);
      if (!r.rowCount) return erro(res, 404, 'nao_encontrado', 'Contato não encontrado.');
      res.status(200).json({ ok: true, id: b.id }); return;
    }
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const id = crypto.randomUUID();
    const ins = await c.query(`insert into brow_contatos(id,estab,nome,categoria,empresa,telefone,whatsapp,email,observacoes,profissional_id,chave_envio)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`,
      [id, estab, out.nome, out.categoria, out.empresa, out.telefone, out.whatsapp, out.email, out.observacoes, out.profissional_id, chave]);
    if (!ins.rows.length) { const o = await c.query('select id from brow_contatos where estab=$1 and chave_envio=$2', [estab, chave]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
    res.status(201).json({ ok: true, id }); return;
  }
  if (req.method === 'POST' && (acao === 'ct_favorito' || acao === 'ct_arquivar')) {
    const b = corpo(req);
    const col = acao === 'ct_favorito' ? 'favorito' : 'arquivado';
    const r = await c.query(`update brow_contatos set ${col}=$3, atualizado_em=now() where estab=$1 and id=$2`, [estab, String(b.id || ''), b.valor === true]);
    if (!r.rowCount) return erro(res, 404, 'nao_encontrado', 'Contato não encontrado.');
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && acao === 'ct_excluir') {
    const b = corpo(req);
    if (b.confirmacao !== true) return erro(res, 422, 'sem_confirmacao', 'Confirme a exclusão.');
    // apaga SÓ o contato: profissionais, clientes e registros de outros módulos não são tocados
    const r = await c.query('delete from brow_contatos where estab=$1 and id=$2', [estab, String(b.id || '')]);
    res.status(200).json({ ok: true, excluido: r.rowCount > 0 }); return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { normalizarTelefone };
module.exports.garantirTabela = garantirTabela;
