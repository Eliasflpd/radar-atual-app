// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — SERVIÇOS E VALORES (10/11/2026)
// Chamado por api/_lib/brow-studio.js quando a ação começa com "servico".
// Mesma rota (/api/brow), mesma trava de acesso e mesmo banco do cadastro de
// clientes — este arquivo só recebe a conexão já aberta e o estabelecimento
// já conferido. Tabela brow_servicos (nada do RADAR é tocado).
//
// DINHEIRO: valor guardado em CENTAVOS INTEIROS (valor_centavos integer).
// O texto "1.234,56" vira 123456 por conta de texto, sem passar por número
// com vírgula flutuante. Nada de float para dinheiro.
//
// AGENDA (módulo futuro): duração e intervalo em minutos inteiros; o tempo
// reservado é duracao_min + intervalo_min. Serviço inativo (ativo=false)
// continua no banco com o histórico; a agenda deve oferecer só os ativos.
//
// Ações:
//   GET  ?acao=servicos_listar&q=&limite=&pagina=  → { ok, itens, total, pagina, paginas, limite }
//   GET  ?acao=servico_ver&id=                     → { ok, servico }
//   POST ?acao=servico_criar     { chave_envio, nome, categoria, descricao, duracao_min, intervalo_min, valor, ativo }
//   POST ?acao=servico_atualizar&id=  { campos parciais (inclusive ativo) }
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const CATEGORIAS = {
  design: 'Design',
  henna: 'Henna/tintura',
  lamination: 'Brow lamination',
  micro: 'Micropigmentação',
  retoque: 'Retoque',
  outro: 'Outro'
};

async function garantirTabela(c) {
  await c.query(`create table if not exists brow_servicos(
    id             text primary key,
    estab          text not null,
    nome           text not null check (char_length(nome) between 2 and 80),
    categoria      text not null,
    descricao      text check (descricao is null or char_length(descricao) <= 220),
    duracao_min    integer not null check (duracao_min between 5 and 480),
    intervalo_min  integer not null default 0 check (intervalo_min between 0 and 120),
    valor_centavos integer not null check (valor_centavos >= 0),
    ativo          boolean not null default true,
    chave_envio    text,
    criado_em      timestamptz not null default now(),
    atualizado_em  timestamptz not null default now(),
    situacao_em    timestamptz
  )`);
  await c.query(`create unique index if not exists brow_servicos_envio on brow_servicos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_servicos_estab_nome on brow_servicos(estab, lower(nome))`);
}

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max + 1) : null; };

// "1.234,56" | "50" | "50,5" | "0" → centavos inteiros; null se inválido.
function textoParaCentavos(v) {
  if (typeof v === 'number') return null;          // o aparelho manda texto; número com vírgula flutuante é recusado
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
  s = s.replace(/\./g, '');
  const [inteiro, dec = ''] = s.split(',');
  const centavos = parseInt(inteiro, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  return Number.isSafeInteger(centavos) && centavos <= 100000000 ? centavos : null;   // teto: R$ 1.000.000,00
}
function inteiroEntre(v, min, max) {
  const s = String(v == null ? '' : v).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n >= min && n <= max ? n : null;
}

function lerCampos(b, parcial) {
  const out = {}; const erros = {};
  const tem = (k) => Object.prototype.hasOwnProperty.call(b, k);
  if (!parcial || tem('nome')) {
    const n = txt(b.nome, 80);
    if (!n || n.length < 2) erros.nome = 'Informe o nome do serviço.';
    else if (n.length > 80) erros.nome = 'O nome pode ter no máximo 80 caracteres.';
    else out.nome = n;
  }
  if (!parcial || tem('categoria')) {
    if (!CATEGORIAS[b.categoria]) erros.categoria = 'Escolha a categoria.';
    else out.categoria = b.categoria;
  }
  if (tem('descricao')) {
    const d = (b.descricao == null ? '' : String(b.descricao)).trim();
    if (d.length > 220) erros.descricao = 'A descrição pode ter no máximo 220 caracteres.';
    else out.descricao = d || null;
  }
  if (!parcial || tem('duracao_min')) {
    const n = inteiroEntre(b.duracao_min, 5, 480);
    if (n === null) erros.duracao_min = 'Informe a duração em minutos inteiros, de 5 a 480.';
    else out.duracao_min = n;
  }
  if (!parcial || tem('intervalo_min')) {
    const v = (b.intervalo_min === '' || b.intervalo_min == null) ? '0' : b.intervalo_min;
    const n = inteiroEntre(v, 0, 120);
    if (n === null) erros.intervalo_min = 'O intervalo deve ser de 0 a 120 minutos inteiros.';
    else out.intervalo_min = n;
  }
  if (!parcial || tem('valor')) {
    const c = textoParaCentavos(b.valor);
    if (c === null) erros.valor = 'Informe o valor em reais, ex.: 80 ou 80,50.';
    else out.valor_centavos = c;
  }
  if (!parcial || tem('ativo')) {
    if (typeof b.ativo !== 'boolean') erros.ativo = 'Escolha a situação.';
    else out.ativo = b.ativo;
  }
  return { out, erros };
}

function linha(x) {
  return {
    id: x.id, nome: x.nome, categoria: x.categoria, categoria_nome: CATEGORIAS[x.categoria] || x.categoria,
    descricao: x.descricao, duracao_min: x.duracao_min, intervalo_min: x.intervalo_min,
    reservado_min: x.duracao_min + x.intervalo_min, valor_centavos: x.valor_centavos, ativo: x.ativo,
    criado_em: x.criado_em, atualizado_em: x.atualizado_em, situacao_em: x.situacao_em
  };
}
const corpo = (req) => {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return (b && typeof b === 'object') ? b : {};
};

module.exports = async function servicos(c, estab, req, res, acao) {
  await garantirTabela(c);
  const q = req.query || {};

  if (req.method === 'GET' && acao === 'servicos_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const pagina = Math.max(parseInt(q.pagina, 10) || 1, 1);
    const termo = semAcento(txt(q.q, 60) || '');
    const params = [estab];
    let filtro = q.ativos === '1' ? ' and ativo' : '';   // agendamento: só serviços ativos
    if (termo) {
      params.push('%' + termo + '%');
      // categoria é buscada pelo NOME que aparece na tela ("henna", "micropigmentação"...)
      const cats = Object.entries(CATEGORIAS).filter(([, nome]) => semAcento(nome).includes(termo)).map(([k]) => k);
      filtro += ` and (translate(lower(nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $2`;
      if (cats.length) { params.push(cats); filtro += ` or categoria = any($3)`; }
      filtro += ')';
    }
    const tot = await c.query(`select count(*)::int n from brow_servicos where estab=$1${filtro}`, params);
    const total = tot.rows[0].n;
    const paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(pagina, paginas);
    const r = await c.query(`select * from brow_servicos where estab=$1${filtro}
      order by ativo desc, lower(nome), criado_em limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, limite, itens: r.rows.map(linha) });
    return;
  }

  if (req.method === 'GET' && acao === 'servico_ver') {
    const r = await c.query('select * from brow_servicos where estab=$1 and id=$2', [estab, String(q.id || '')]);
    if (!r.rows.length) { res.status(404).json({ ok: false, erro: 'nao_encontrado', msg: 'Serviço não encontrado.' }); return; }
    res.status(200).json({ ok: true, servico: linha(r.rows[0]) });
    return;
  }

  if (req.method === 'POST' && acao === 'servico_criar') {
    const b = corpo(req);
    const chave = txt(b.chave_envio, 64);
    if (!chave) { res.status(400).json({ ok: false, erro: 'chave_envio', msg: 'Pedido incompleto.' }); return; }
    const ja = await c.query('select id from brow_servicos where estab=$1 and chave_envio=$2', [estab, chave]);
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    const { out, erros } = lerCampos(b, false);
    if (Object.keys(erros).length) { res.status(422).json({ ok: false, erro: 'validacao', erros }); return; }
    const id = crypto.randomUUID();
    const cols = ['id', 'estab', 'chave_envio', ...Object.keys(out)];
    const vals = [id, estab, chave, ...Object.values(out)];
    const r = await c.query(`insert into brow_servicos(${cols.join(',')}) values(${cols.map((_, i) => '$' + (i + 1)).join(',')})
      on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, vals);
    if (!r.rows.length) {
      const o = await c.query('select id from brow_servicos where estab=$1 and chave_envio=$2', [estab, chave]);
      res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return;
    }
    res.status(201).json({ ok: true, id });
    return;
  }

  if (req.method === 'POST' && acao === 'servico_atualizar') {
    const id = String(q.id || '');
    const { out, erros } = lerCampos(corpo(req), true);
    if (Object.keys(erros).length) { res.status(422).json({ ok: false, erro: 'validacao', erros }); return; }
    const ks = Object.keys(out);
    if (!ks.length) { res.status(200).json({ ok: true, sem_mudanca: true }); return; }
    const sets = ks.map((k, i) => `${k}=$${i + 3}`);
    // registra quando a situação mudou (o registro nunca é apagado)
    const extra = 'ativo' in out ? `, situacao_em = case when ativo is distinct from $${ks.indexOf('ativo') + 3} then now() else situacao_em end` : '';
    const r = await c.query(`update brow_servicos set ${sets.join(',')}${extra}, atualizado_em=now() where estab=$1 and id=$2`,
      [estab, id, ...ks.map(k => out[k])]);
    if (!r.rowCount) { res.status(404).json({ ok: false, erro: 'nao_encontrado', msg: 'Serviço não encontrado.' }); return; }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ ok: false, erro: 'acao', msg: 'Ação desconhecida.' });
};
module.exports._teste = { textoParaCentavos, inteiroEntre, lerCampos, CATEGORIAS };
module.exports.garantirTabela = garantirTabela;
