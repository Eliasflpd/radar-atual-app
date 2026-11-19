// NEXUS BÍBLICO — PONTEIROS DE OBRAS EXTERNAS (19/11/2026, infraestrutura do piloto do Gingrich).
//
// Uma obra que NÃO está na biblioteca de trechos (por decisão jurídica: aquisição particular sem autorização de
// reprodução integral) entra no NEXUS só com LOCALIZADORES FACTUAIS: obra, edição, página (do PDF e impressa),
// a marca impressa da referência ("At 10.28") e a referência bíblica normalizada. Nenhum verbete, definição,
// trecho ou imagem. Esses ponteiros:
//   • ficam em tabela própria (nexus_ponteiros_obra), fora de nexus_refs: sobrevivem à recriação do índice
//     patrístico, que apaga nexus_refs inteira quando muda de versão;
//   • só saem pela porta da biblioteca (crachá do aparelho ou PIN), como o resto da biblioteca;
//   • nunca entram no contexto de "Explicar com IA" nem em embeddings (o NEXUS não manda nada disto para fora);
//   • aparecem como "remissão de léxico": natureza lexical, estado direta, método identificação documental,
//     sem contar como autor independente (não aumentam o grau de nenhuma outra relação).
//
// LOTES: cada importação tem um id de lote. A gravação registra, no MESMO comando SQL, quais linhas foram
// realmente criadas por aquele lote (nexus_ponteiros_lote_linhas). A reversão apaga só essas linhas; o que já
// existia antes (de outro lote) fica intacto. A unicidade é imposta pelo banco pela identidade canônica do
// ponteiro (obra, página do PDF, versículo inicial, versículo final, marca impressa), então reexecuções e
// importações simultâneas não duplicam nada.
//
// SIMULAÇÃO: somente leitura, dentro de uma transação READ ONLY (o Postgres recusaria qualquer escrita) e
// encerrada com ROLLBACK. Não cria tabelas: se elas ainda não existem, informa que tudo seria inserido.
const crypto = require('crypto');
const R = require('./oficina-refs.js');

const TIPO = 'remissao_lexico';
const CAMPOS_ITEM = new Set(['n', 'recorte', 'pagina_pdf', 'pagina_impressa', 'nota_pagina', 'marca_impressa', 'livro_herdado', 'sequencia', 'ini', 'fim', 'rotulo', 'caixa_pdf', 'ocr']);
const CAMPOS_OBRA = ['id', 'titulo', 'autor', 'revisao', 'traducao', 'editora', 'original', 'ano_edicao_pt', 'situacao_juridica', 'paginas_pdf'];
const RE_MARCA = /^(?:[123] ?)?[A-ZÁÉÍÓÚ][a-záéíóú]{0,3} ?\d{1,3}\.\d{1,3}(?:[-–]\d{1,3})?$|^\d{1,3}\.\d{1,3}(?:[-–]\d{1,3})?$/;
const RE_LOTE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const RE_OBRA = /^[a-z0-9][a-z0-9-]{2,59}$/;
const LIMITE_ITENS = 500;      // um lote piloto; importação em massa não passa por aqui sem nova decisão

function versiculoValido(chave, bib) {
  if (!bib || !Number.isInteger(chave)) return false;
  const d = R.decompor(chave);
  const caps = bib[R.AB[d.b - 1]];
  return !!(caps && caps[d.c - 1] && d.v >= 1 && d.v <= caps[d.c - 1].length);
}

// Confere o lote inteiro sem tocar em banco nenhum. Devolve os itens normalizados (só localizadores) e os rejeitados.
function validarLote(lote, bib) {
  const erros = [];
  if (!lote || typeof lote !== 'object') return { ok: false, erros: ['lote ausente'] };
  const id = String(lote.id || '');
  if (!RE_LOTE.test(id)) erros.push('id do lote inválido (use letras minúsculas, números e hífen)');
  const o = lote.obra || {};
  if (!RE_OBRA.test(String(o.id || ''))) erros.push('obra.id inválido');
  if (!o.titulo || !o.editora) erros.push('obra sem título ou editora');
  const extras = Object.keys(o).filter((k) => !CAMPOS_OBRA.includes(k));
  if (extras.length) erros.push('campos não permitidos na obra: ' + extras.join(', '));
  for (const k of CAMPOS_OBRA) if (o[k] != null && String(o[k]).length > 300) erros.push('obra.' + k + ' longo demais');
  const paginas = Number.isInteger(o.paginas_pdf) && o.paginas_pdf > 0 ? o.paginas_pdf : 5000;
  if (!Array.isArray(lote.itens) || !lote.itens.length) erros.push('lote sem itens');
  else if (lote.itens.length > LIMITE_ITENS) erros.push(`lote acima de ${LIMITE_ITENS} itens: importação em massa exige outra decisão`);
  if (erros.length) return { ok: false, erros };

  const validos = [], rejeitados = [], vistos = new Set();
  for (const x of lote.itens) {
    const e = [];
    const proibidos = Object.keys(x || {}).filter((k) => !CAMPOS_ITEM.has(k));
    if (proibidos.length) e.push('campo não permitido: ' + proibidos.join(', '));
    const marca = String((x && x.marca_impressa) || '').trim();
    if (marca.length > 20) e.push('marca longa demais (risco de texto da obra)');
    else if (!RE_MARCA.test(marca)) e.push('marca impressa fora do padrão de referência');
    const pp = x && x.pagina_pdf;
    if (!Number.isInteger(pp) || pp < 1 || pp > paginas) e.push('página do PDF fora da obra');
    const pi = x && x.pagina_impressa;
    if (pi != null && (!Number.isInteger(pi) || pi < 1 || pi > paginas + 50)) e.push('página impressa inválida');
    const nota = x && x.nota_pagina != null ? String(x.nota_pagina) : null;
    if (nota && nota.length > 120) e.push('nota de página longa demais');
    if (!versiculoValido(x && x.ini, bib) || !versiculoValido(x && x.fim, bib) || x.fim < x.ini) e.push('referência inexistente na Almeida');
    const chave = [o.id, pp, x && x.ini, x && x.fim, marca].join('|');
    if (!e.length && vistos.has(chave)) e.push('repetido dentro do lote');
    if (e.length) { rejeitados.push({ n: x && x.n, erros: e }); continue; }
    vistos.add(chave);
    validos.push({ n: x.n, pagina_pdf: pp, pagina_impressa: pi == null ? null : pi, nota_pagina: nota, marca, ini: x.ini, fim: x.fim });
  }
  const sha = crypto.createHash('sha256').update(JSON.stringify(validos.map((v) => [o.id, v.pagina_pdf, v.pagina_impressa, v.ini, v.fim, v.marca]))).digest('hex');
  const obra = Object.fromEntries(CAMPOS_OBRA.filter((k) => o[k] != null).map((k) => [k, k === 'paginas_pdf' ? o[k] : String(o[k])]));
  return { ok: true, id, obra, validos, rejeitados, sha };
}

async function existe(db, tabela) {
  const r = await db.q('n', 'select to_regclass($1) is not null as ok', [tabela]);
  return !!(r[0] && r[0].ok);
}

// Criação das tabelas: SÓ pelo modo `migrar` (fluxo administrativo, com a porta). Ler, simular e gravar não criam nada.
const TABELAS = ['public.nexus_obras_externas', 'public.nexus_ponteiros_obra', 'public.nexus_ponteiros_lotes', 'public.nexus_ponteiros_lote_linhas'];
async function criarTabelas(db) {
  await db.q('n', `create table if not exists nexus_obras_externas (
      obra text primary key, titulo text not null, autor text, revisao text, traducao text, editora text not null,
      original text, ano_edicao text, situacao_juridica text not null default 'pendente_verificacao',
      reproducao_integral_autorizada boolean not null default false check (not reproducao_integral_autorizada),
      atualizado_em timestamptz not null default now())`);
  await db.q('n', `create table if not exists nexus_ponteiros_obra (
      id bigserial primary key,
      obra text not null references nexus_obras_externas (obra),
      tipo text not null default 'remissao_lexico' check (tipo in ('remissao_lexico')),
      pagina_pdf int not null check (pagina_pdf > 0),
      pagina_impressa int check (pagina_impressa > 0),
      nota_pagina text check (length(nota_pagina) <= 120),
      marca text not null check (length(marca) between 1 and 20),
      ini int not null, fim int not null check (fim >= ini),
      criado_em timestamptz not null default now(),
      unique (obra, pagina_pdf, ini, fim, marca))`);
  await db.q('n', 'create index if not exists nexus_ponteiros_obra_ini on nexus_ponteiros_obra (ini, fim)');
  await db.q('n', `create table if not exists nexus_ponteiros_lotes (
      lote text primary key, obra text not null, sha256 text not null, itens int not null,
      criado_em timestamptz not null default now(), revertido_em timestamptz)`);
  await db.q('n', `create table if not exists nexus_ponteiros_lote_linhas (
      lote text not null references nexus_ponteiros_lotes (lote),
      ponteiro bigint primary key references nexus_ponteiros_obra (id) on delete cascade)`);
  await db.q('n', 'create index if not exists nexus_ponteiros_lote_linhas_lote on nexus_ponteiros_lote_linhas (lote)');
}

// MIGRAR — cria só a estrutura vazia (idempotente: repetir não apaga nem altera registros). Não recebe lote.
async function migrar(db) {
  await criarTabelas(db);
  const contagens = {};
  for (const t of TABELAS) contagens[t.replace('public.', '')] = (await db.q('n', `select count(*)::int n from ${t}`))[0].n;
  return { ok: true, modo: 'migrar', tabelas: contagens };
}
async function faltando(db) {
  const out = [];
  for (const t of TABELAS) if (!(await existe(db, t))) out.push(t.replace('public.', ''));
  return out;
}

// SIMULAR — somente leitura. Conta quantos seriam inseridos, ignorados (já existem) e rejeitados.
async function simular(db, lote, bib) {
  const v = validarLote(lote, bib);
  if (!v.ok) return { ok: false, erros: v.erros };
  let existentes = new Set(), tabelas = false;
  await db.q('n', 'begin transaction read only');
  try {
    tabelas = await existe(db, 'public.nexus_ponteiros_obra');
    if (tabelas && v.validos.length) {
      const linhas = await db.q('n', `select p.pagina_pdf, p.ini, p.fim, p.marca from nexus_ponteiros_obra p
          join jsonb_to_recordset($2::jsonb) as x(pagina_pdf int, ini int, fim int, marca text)
            on p.pagina_pdf = x.pagina_pdf and p.ini = x.ini and p.fim = x.fim and p.marca = x.marca
          where p.obra = $1`, [v.obra.id, JSON.stringify(v.validos)]);
      existentes = new Set(linhas.map((l) => [l.pagina_pdf, l.ini, l.fim, l.marca].join('|')));
    }
  } finally {
    await db.q('n', 'rollback');
  }
  const ignorados = v.validos.filter((x) => existentes.has([x.pagina_pdf, x.ini, x.fim, x.marca].join('|')));
  return { ok: true, modo: 'simular', escrita: false, lote: v.id, obra: v.obra.id, sha256: v.sha, tabelas_existem: tabelas,
    inseridos: v.validos.length - ignorados.length, ignorados: ignorados.length, rejeitados: v.rejeitados.length,
    detalhe_rejeitados: v.rejeitados, detalhe_ignorados: ignorados.map((x) => x.n) };
}

// GRAVAR — um único comando insere os ponteiros novos e registra, no mesmo instante, quais o lote criou.
async function gravar(db, lote, bib) {
  const v = validarLote(lote, bib);
  if (!v.ok) return { ok: false, erros: v.erros };
  if (v.rejeitados.length) return { ok: false, erros: ['o lote tem itens rejeitados; corrija antes de gravar'], detalhe_rejeitados: v.rejeitados };
  const ausentes = await faltando(db);   // a gravação nunca cria estrutura: sem migração, para antes de qualquer escrita
  if (ausentes.length) return { ok: false, erros: ['tabelas ausentes (' + ausentes.join(', ') + '): rode antes o modo migrar (node scripts/nexus-ponteiros-obra.cjs --modo migrar)'] };
  const o = v.obra;
  await db.q('n', `insert into nexus_obras_externas (obra, titulo, autor, revisao, traducao, editora, original, ano_edicao, situacao_juridica)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (obra) do update set titulo = excluded.titulo, autor = excluded.autor, revisao = excluded.revisao, traducao = excluded.traducao,
        editora = excluded.editora, original = excluded.original, ano_edicao = excluded.ano_edicao, situacao_juridica = excluded.situacao_juridica, atualizado_em = now()`,
    [o.id, o.titulo, o.autor || null, o.revisao || null, o.traducao || null, o.editora, o.original || null, o.ano_edicao_pt || null, o.situacao_juridica || 'pendente_verificacao']);
  const ja = (await db.q('n', 'select obra, sha256, revertido_em from nexus_ponteiros_lotes where lote = $1', [v.id]))[0];
  if (ja && ja.obra !== o.id) return { ok: false, erros: ['este id de lote já pertence a outra obra'] };
  await db.q('n', `insert into nexus_ponteiros_lotes (lote, obra, sha256, itens) values ($1,$2,$3,$4)
      on conflict (lote) do update set sha256 = excluded.sha256, itens = excluded.itens, revertido_em = null`, [v.id, o.id, v.sha, v.validos.length]);
  const criadas = await db.q('n', `with novos as (
        insert into nexus_ponteiros_obra (obra, tipo, pagina_pdf, pagina_impressa, nota_pagina, marca, ini, fim)
        select $1, '${TIPO}', x.pagina_pdf, x.pagina_impressa, x.nota_pagina, x.marca, x.ini, x.fim
          from jsonb_to_recordset($2::jsonb) as x(pagina_pdf int, pagina_impressa int, nota_pagina text, marca text, ini int, fim int)
        on conflict (obra, pagina_pdf, ini, fim, marca) do nothing
        returning id)
      insert into nexus_ponteiros_lote_linhas (lote, ponteiro) select $3, id from novos returning ponteiro`, [o.id, JSON.stringify(v.validos), v.id]);
  const doLote = (await db.q('n', 'select count(*)::int n from nexus_ponteiros_lote_linhas where lote = $1', [v.id]))[0].n;
  return { ok: true, modo: 'gravar', lote: v.id, obra: o.id, sha256: v.sha, inseridos: criadas.length, ignorados: v.validos.length - criadas.length, rejeitados: 0, linhas_do_lote: doLote };
}

// REVERTER — apaga só as linhas que este lote criou (registro em nexus_ponteiros_lote_linhas).
async function reverter(db, loteId) {
  const id = String(loteId || '');
  if (!RE_LOTE.test(id)) return { ok: false, erros: ['id do lote inválido'] };
  if (!(await existe(db, 'public.nexus_ponteiros_lotes'))) return { ok: false, erros: ['nenhum lote foi gravado ainda'] };
  const l = (await db.q('n', 'select lote from nexus_ponteiros_lotes where lote = $1', [id]))[0];
  if (!l) return { ok: false, erros: ['lote não encontrado'] };
  const apagados = await db.q('n', `delete from nexus_ponteiros_obra where id in (select ponteiro from nexus_ponteiros_lote_linhas where lote = $1) returning id`, [id]);
  await db.q('n', 'update nexus_ponteiros_lotes set revertido_em = now() where lote = $1', [id]);
  return { ok: true, modo: 'reverter', lote: id, removidos: apagados.length };
}

async function estado(db, loteId) {
  if (!(await existe(db, 'public.nexus_ponteiros_obra'))) return { ok: true, tabelas_existem: false, lotes: [] };
  const lotes = await db.q('n', `select l.lote, l.obra, l.sha256, l.itens, l.criado_em, l.revertido_em,
      (select count(*)::int from nexus_ponteiros_lote_linhas k where k.lote = l.lote) as linhas
      from nexus_ponteiros_lotes l ${loteId ? 'where l.lote = $1' : ''} order by l.criado_em desc limit 50`, loteId ? [String(loteId)] : []);
  const total = (await db.q('n', 'select count(*)::int n from nexus_ponteiros_obra'))[0].n;
  return { ok: true, tabelas_existem: true, total_ponteiros: total, lotes };
}

// LEITURA para o mapa (chamada só quando a porta está aberta). Não cria tabela: se ainda não existe, não há nada.
let TEM_TABELA = false;
async function ponteirosDaPassagem(db, ini, fim, limite) {
  if (!db.temNexus()) return [];
  if (!TEM_TABELA) { TEM_TABELA = await existe(db, 'public.nexus_ponteiros_obra').catch(() => false); if (!TEM_TABELA) return []; }
  return db.q('n', `select p.obra, p.pagina_pdf, p.pagina_impressa, p.nota_pagina, p.marca, p.ini, p.fim,
        o.titulo, o.autor, o.revisao, o.traducao, o.editora, o.original, o.ano_edicao, o.situacao_juridica
      from nexus_ponteiros_obra p join nexus_obras_externas o on o.obra = p.obra
      where p.ini <= $2 and p.fim >= $1 order by p.obra, p.pagina_pdf limit $3`, [ini, fim, limite || 40]).catch(() => []);
}
async function ponteirosDaPagina(db, obra, pagina) {
  if (!db.temNexus() || !(await existe(db, 'public.nexus_ponteiros_obra').catch(() => false))) return [];
  return db.q('n', `select p.obra, p.pagina_pdf, p.pagina_impressa, p.nota_pagina, p.marca, p.ini, p.fim,
        o.titulo, o.autor, o.revisao, o.traducao, o.editora, o.original, o.ano_edicao, o.situacao_juridica
      from nexus_ponteiros_obra p join nexus_obras_externas o on o.obra = p.obra
      where p.obra = $1 and p.pagina_pdf = $2 order by p.ini limit 80`, [obra, pagina]).catch(() => []);
}

// Como cada ponteiro vira nó e ligação no grafo (mesmo formato do resto do NEXUS).
const paginaTexto = (p) => (p.pagina_impressa ? `p. ${p.pagina_impressa}` : 'página sem número impresso') + ` · p. ${p.pagina_pdf} do PDF`;
const edicaoTexto = (p) => [p.editora, p.traducao ? 'trad. ' + p.traducao : '', p.revisao ? 'rev. ' + p.revisao : ''].filter(Boolean).join('; ');
function idPagina(p) { return 'x:' + p.obra + ':' + p.pagina_pdf; }
function noPagina(p) {
  return { id: idPagina(p), tipo: 'obra', externa: true, rotulo: `${p.autor ? p.autor.split(' ').pop() + ', ' : ''}${p.titulo} · ${p.pagina_impressa ? 'p. ' + p.pagina_impressa : 'p. ' + p.pagina_pdf + ' do PDF'}`,
    obra: p.titulo, autor: p.autor, edicao: edicaoTexto(p), pagina_pdf: p.pagina_pdf, pagina_impressa: p.pagina_impressa };
}
const AVISO = 'Ponteiro de localização: o verbete não é reproduzido no NEXUS. Confira no seu exemplar.';
function arestaRemissao(p, passagemId, rotuloPassagem) {
  const local = paginaTexto(p) + (p.nota_pagina ? ` (${p.nota_pagina})` : '');
  return { de: idPagina(p), para: passagemId, tipo: 'remissao-lexico', natureza: 'documental', natRel: 'lexical', estado: 'direta', metodo: 'identificacao_documental',
    semGrau: true, peso: 1, externa: true,
    explica: `Remissão de léxico: ${p.titulo}${p.autor ? ', de ' + p.autor : ''} (${edicaoTexto(p)}), ${local}, remete a ${rotuloPassagem} (marca impressa "${p.marca}"). ${AVISO}`,
    evidencias: [{ autor: p.autor || '', obra: `${p.titulo} (${edicaoTexto(p)})`, secao: local, modo: 'remissão de léxico', marca: p.marca, trecho: '', aviso: AVISO, externa: true }] };
}

module.exports = { validarLote, migrar, simular, gravar, reverter, estado, ponteirosDaPassagem, ponteirosDaPagina, noPagina, arestaRemissao, idPagina, criarTabelas, _teste: { RE_MARCA, CAMPOS_ITEM } };
