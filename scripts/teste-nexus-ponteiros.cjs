#!/usr/bin/env node
// TESTE dos ponteiros de obras externas, num Postgres de TESTE em memória (PGlite), vazio a cada execução.
// Nada toca os bancos reais: as variáveis dos bancos do RADAR ficam vazias e o "pg" é trocado pelo PGlite.
//
// Uso:  PGLITE_DIR=<pasta com node_modules/@electric-sql/pglite> node scripts/teste-nexus-ponteiros.cjs <lote.json>
//       (o lote fica no PC, fora do repositório)
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const LOTE = process.argv[2];
if (!LOTE) { console.error('informe o arquivo do lote'); process.exit(2); }
const PGLITE_DIR = process.env.PGLITE_DIR;
if (!PGLITE_DIR) { console.error('defina PGLITE_DIR'); process.exit(2); }
const RAIZ = path.resolve(__dirname, '..');

// ── ambiente de teste: nenhum banco real ─────────────────────────────────────
for (const k of Object.keys(process.env)) if (/^(RADAR_DB|NEXUS_|LIVRO_PARTICULAR|VOZ_CLAUDE)/.test(k)) delete process.env[k];
process.env.NEXUS_DATABASE_URL = 'pglite://memoria-de-teste';
const CRACHA = 'cracha-de-teste-' + crypto.randomBytes(6).toString('hex');
process.env.LIVRO_PARTICULAR_CRACHAS = crypto.createHash('sha256').update(CRACHA).digest('hex');

let PG;   // a instância PGlite (uma sessão)
class ClienteTeste {
  constructor(o) { this.cs = o && o.connectionString; }
  async connect() { if (!String(this.cs).startsWith('pglite://')) throw new Error('teste: conexão real bloqueada'); }
  async query(sql, args) { const r = await PG.query(sql, args || []); return { rows: r.rows }; }
  async end() {}
}
require.cache[require.resolve('pg', { paths: [RAIZ] })] = { id: 'pg', filename: 'pg', loaded: true, exports: { Client: ClienteTeste } };

let falhas = 0;
const ok = (cond, nome, extra) => { console.log(`${cond ? 'OK  ' : 'FALHOU'}  ${nome}${extra ? '  · ' + extra : ''}`); if (!cond) falhas++; };

(async () => {
  const { PGlite } = await import('file://' + path.join(PGLITE_DIR, 'node_modules/@electric-sql/pglite/dist/index.js').replace(/\\/g, '/'));
  PG = new PGlite();
  // a Almeida do próprio site, servida localmente
  const servidor = http.createServer((q, s) => { s.setHeader('Content-Type', 'application/json'); fs.createReadStream(path.join(RAIZ, 'public/biblia.json')).pipe(s); });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const host = '127.0.0.1:' + servidor.address().port;
  const nexus = require(path.join(RAIZ, 'api/_lib/nexus.js'));
  const chamar = (corpo, comPorta) => new Promise((resolve, reject) => {
    const req = { method: 'POST', headers: { host }, body: { ...corpo, ...(comPorta ? { cracha: CRACHA } : {}) } };
    const res = { setHeader() {}, status() { return this; }, json: resolve };
    nexus(req, res).catch(reject);
  });
  const pedido = (modo, extra) => JSON.parse(execFileSync(process.execPath, [path.join(RAIZ, 'scripts/nexus-ponteiros-obra.cjs'), LOTE, '--lote-id', 'gingrich-piloto-20261119', '--modo', modo, '--paginas', '227', ...(extra || [])]).toString());
  const conta = async (sql, a) => (await PG.query(sql, a || [])).rows[0].n;
  const existe = async (t) => (await PG.query('select to_regclass($1) is not null as ok', [t])).rows[0].ok;

  const P = pedido('gravar');
  ok(P.lote.itens.length === 30, 'pedido montado com 30 itens');
  const campos = new Set(P.lote.itens.flatMap((x) => Object.keys(x)));
  ok([...campos].every((k) => ['n', 'pagina_pdf', 'pagina_impressa', 'nota_pagina', 'marca_impressa', 'ini', 'fim'].includes(k)), 'pedido só com localizadores', [...campos].join(','));
  ok(!/verbete|definicao|trecho|caixa_pdf|ocr/.test(JSON.stringify(P)), 'pedido sem texto, OCR ou caixas do PDF');

  // 1) porta fechada: nada administrativo
  let r = await chamar({ acao: 'ponteiros-obra', modo: 'simular', lote: P.lote }, false);
  ok(r.ok === false && r.motivo === 'particular', 'simular sem crachá/PIN é recusado');

  // 2) simulação somente leitura no destino vazio
  r = await chamar({ acao: 'ponteiros-obra', modo: 'simular', lote: P.lote }, true);
  ok(r.ok && r.inseridos === 30 && r.ignorados === 0 && r.rejeitados === 0 && r.escrita === false, 'simular no destino vazio: 30 / 0 / 0', JSON.stringify({ i: r.inseridos, g: r.ignorados, j: r.rejeitados }));
  ok(!(await existe('public.nexus_ponteiros_obra')) && !(await existe('public.nexus_obras_externas')), 'a simulação não criou tabela nenhuma (somente leitura)');
  let escreveu = true;
  try { await PG.query('begin transaction read only'); await PG.query('create table x_teste (a int)'); } catch (_) { escreveu = false; } finally { await PG.query('rollback'); }
  ok(!escreveu, 'transação READ ONLY recusa escrita (garantia usada na simulação)');

  // 2b) gravar ANTES da migração: para sem escrever nada; migrar cria a estrutura vazia; repetir é seguro
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true);
  ok(r.ok === false && /migrar/.test(r.erros.join(' ')), 'gravar antes de migrar: recusado, indica o modo migrar', r.erros && r.erros[0]);
  ok(!(await existe('public.nexus_ponteiros_obra')) && !(await existe('public.nexus_obras_externas')) && !(await existe('public.nexus_ponteiros_lotes')), 'gravar antes de migrar: nenhuma tabela criada');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'migrar' }, false);
  ok(r.ok === false && r.motivo === 'particular', 'migrar sem crachá/PIN: recusado');
  const pedM = JSON.parse(execFileSync(process.execPath, [path.join(RAIZ, 'scripts/nexus-ponteiros-obra.cjs'), '--modo', 'migrar']).toString());
  ok(pedM.acao === 'ponteiros-obra' && pedM.modo === 'migrar' && !pedM.lote, 'pedido de migrar montado sem o arquivo do lote');
  r = await chamar(pedM, true);
  ok(r.ok && Object.values(r.tabelas).every((n) => n === 0) && Object.keys(r.tabelas).length === 4, 'migrar: 4 tabelas criadas e vazias', JSON.stringify(r.tabelas));
  ok(!(await existe('public.nexus_refs')), 'migrar não cria nem toca nexus_refs');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'simular', lote: P.lote }, true);
  ok(r.ok && r.inseridos === 30 && r.tabelas_existem === true, 'simular depois de migrar (tabela vazia): 30 previstos');

  // 3) gravar: 30 inserções; repetir: zero
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true);
  ok(r.ok && r.inseridos === 30 && r.linhas_do_lote === 30, 'gravar: 30 inseridos e 30 linhas registradas no lote', JSON.stringify({ i: r.inseridos, l: r.linhas_do_lote }));
  ok((await conta('select count(*)::int n from nexus_ponteiros_obra')) === 30, 'destino com 30 ponteiros');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true);
  ok(r.ok && r.inseridos === 0 && r.ignorados === 30, 'gravar de novo: 0 inseridos, 30 ignorados');
  const [a1, a2] = await Promise.all([chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true), chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true)]);
  ok(a1.inseridos + a2.inseridos === 0 && (await conta('select count(*)::int n from nexus_ponteiros_obra')) === 30, 'duas gravações ao mesmo tempo: nada duplicado');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'simular', lote: P.lote }, true);
  ok(r.ok && r.inseridos === 0 && r.ignorados === 30, 'simular depois de gravar: 0 inseridos, 30 ignorados');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'migrar' }, true);
  ok(r.ok && r.tabelas.nexus_ponteiros_obra === 30 && r.tabelas.nexus_ponteiros_lote_linhas === 30 && (await conta('select count(*)::int n from nexus_ponteiros_obra')) === 30, 'repetir migrar com dados: os 30 registros preservados', JSON.stringify(r.tabelas));
  let dup = true;
  try { await PG.query(`insert into nexus_ponteiros_obra (obra, pagina_pdf, marca, ini, fim) select obra, pagina_pdf, marca, ini, fim from nexus_ponteiros_obra limit 1`); } catch (_) { dup = false; }
  ok(!dup, 'o banco recusa ponteiro repetido mesmo fora do fluxo (unicidade canônica)');

  // 4) lote rejeitado: itens inválidos (só no teste) impedem a gravação
  const ruim = JSON.parse(JSON.stringify(P.lote)); ruim.id = 'teste-rejeicao';
  ruim.itens = [{ n: 'x1', pagina_pdf: 999, marca_impressa: 'Jo 99.99', ini: 43099099, fim: 43099099 }, { n: 'x2', pagina_pdf: 12, marca_impressa: 'At 10.28', ini: 44010028, fim: 44010028, definicao: 'texto' }];
  r = await chamar({ acao: 'ponteiros-obra', modo: 'simular', lote: ruim }, true);
  ok(r.ok && r.rejeitados === 2 && r.inseridos === 0, 'simular lote inválido: 2 rejeitados', JSON.stringify(r.detalhe_rejeitados.map((x) => x.erros.join('; '))));
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: ruim }, true);
  ok(r.ok === false, 'gravar lote com rejeitados é recusado');

  // 5) acesso: com e sem a porta da biblioteca (inclusive cache)
  const pAt = 'p:44010028-44010028';
  const sem1 = await chamar({ acao: 'expandir', id: pAt }, false);
  const com = await chamar({ acao: 'expandir', id: pAt }, true);
  const sem2 = await chamar({ acao: 'expandir', id: pAt }, false);
  const rem = (com.arestas || []).find((a) => a.tipo === 'remissao-lexico');
  ok(sem1.ok && !(sem1.nos || []).some((n) => n.id.startsWith('x:')), 'sem crachá/PIN: At 10.28 não mostra a remissão');
  ok(!!rem, 'com crachá: At 10.28 mostra a remissão de léxico');
  ok(sem2.ok && !(sem2.nos || []).some((n) => n.id.startsWith('x:')) && sem2.total === sem1.total, 'sem crachá depois de alguém abrir: o cache não vaza (total igual)', `total sem=${sem2.total} com=${com.total}`);
  if (rem) {
    ok(rem.natRel === 'lexical' && rem.estado === 'direta' && rem.metodo === 'identificacao_documental' && rem.classe !== 'textual' && rem.independentes === 0,
      'classificação: lexical · direta · identificação documental · não textual · 0 autores independentes', `${rem.natRel}/${rem.estado}/${rem.metodo}/${rem.classe}/${rem.independentes}`);
    const ev = rem.evidencias[0];
    ok(/Vida Nova/.test(ev.obra) && /p\. 13/.test(ev.secao) && /p\. 12 do PDF/.test(ev.secao) && ev.marca === 'At 10.28' && ev.trecho === '', 'mostra obra, edição, página impressa, página do PDF e marca, sem trecho', `${ev.obra} | ${ev.secao}`);
  }
  const x = await chamar({ acao: 'expandir', id: 'x:gingrich-lexico-nt:12' }, false);
  ok(x.ok === false && x.motivo === 'particular', 'nó da página (x:) sem crachá: recusado');
  const xc = await chamar({ acao: 'expandir', id: 'x:gingrich-lexico-nt:12' }, true);
  ok(xc.ok && xc.arestas.filter((a) => a.tipo === 'remissao-lexico').length === 2, 'nó da página 12 com crachá: as 2 remissões da página (At 10.28 e 1 Pe 4.3)');
  const ef = await chamar({ acao: 'expandir', id: 'p:49005019-49005019' }, true);
  const efr = (ef.arestas || []).find((a) => a.tipo === 'remissao-lexico');
  ok(efr && /sem número impresso/.test(efr.evidencias[0].secao) && /p\. 225 do PDF/.test(efr.evidencias[0].secao), 'Ef 5.19: página sem número impresso preservada como tal', efr && efr.evidencias[0].secao);
  const mt = await chamar({ acao: 'expandir', id: 'p:40008024-40008024' }, true);
  ok((mt.arestas || []).some((a) => a.tipo === 'remissao-lexico' && a.evidencias[0].marca === '8.24'), 'Mt 8.24 (livro herdado da referência anterior) aparece com a marca impressa "8.24"');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'estado' }, false);
  ok(r.ok === false && r.motivo === 'particular', 'contagens (estado) sem crachá: recusado');
  r = await chamar({ acao: 'abrir', investigacao: 1 }, false);
  ok(r.ok === false && r.motivo === 'particular', 'reabrir investigação salva sem crachá/PIN: recusado');

  // 6) sobrevive à recriação do índice patrístico (o código apaga nexus_refs inteira quando muda de versão)
  const db = { temNexus: () => true, q: async (_, s, a) => (await PG.query(s, a || [])).rows };
  await nexus._teste.tabelasIndice(db);
  await PG.query(`insert into nexus_refs (banco, trecho, fonte, ini, fim, marca) values (2, 1, 'pat-teste', 43001001, 43001001, 'Jo 1,1')`);
  await PG.query('delete from nexus_refs');   // o mesmo comando de indexarPatristica
  ok((await conta('select count(*)::int n from nexus_refs')) === 0 && (await conta('select count(*)::int n from nexus_ponteiros_obra')) === 30, 'recriação do índice patrístico: nexus_refs zerada, os 30 ponteiros intactos');

  // 7) reversão limitada ao lote, preservando o que já existia
  r = await chamar({ acao: 'ponteiros-obra', modo: 'reverter', lote_id: 'gingrich-piloto-20261119' }, true);
  ok(r.ok && r.removidos === 30 && (await conta('select count(*)::int n from nexus_ponteiros_obra')) === 0, 'reverter: 30 removidos');
  const pre = JSON.parse(JSON.stringify(P.lote)); pre.id = 'teste-preexistente'; pre.itens = P.lote.itens.slice(0, 5);
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: pre }, true);
  ok(r.inseridos === 5, 'lote preexistente de teste: 5 ponteiros gravados antes');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'gravar', lote: P.lote }, true);
  ok(r.inseridos === 25 && r.ignorados === 5 && r.linhas_do_lote === 25, 'gravar o piloto com 5 já existentes: 25 criados e registrados como do lote', JSON.stringify({ i: r.inseridos, g: r.ignorados, l: r.linhas_do_lote }));
  r = await chamar({ acao: 'ponteiros-obra', modo: 'reverter', lote_id: 'gingrich-piloto-20261119' }, true);
  ok(r.removidos === 25 && (await conta('select count(*)::int n from nexus_ponteiros_obra')) === 5, 'reverter o piloto: remove só os 25 dele; os 5 preexistentes ficam');
  r = await chamar({ acao: 'ponteiros-obra', modo: 'estado' }, true);
  ok(r.ok && r.total_ponteiros === 5 && r.lotes.find((l) => l.lote === 'gingrich-piloto-20261119').revertido_em, 'estado: lote marcado como revertido');

  servidor.close();
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
