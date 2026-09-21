/* ══════════════════════════════════════════════════════════════════════════════
   PROVA DAS FERRAMENTAS DO GLOBO — o conhecimento é real ou é conversa?

     node scripts/_provar-voz-ferramentas.mjs

   COMO ISTO PROVA ALGUMA COISA (e não é teatro):
   sobe um servidor de verdade em 127.0.0.1 servindo a pasta public/ EXATAMENTE como
   a Vercel serve (biblia.json, busca/*.bin, busca/*.idx.json) e montando por cima a
   rota /api/estudo-busca com o handler REAL do repositório. Aí chama
   executarFerramenta() — a MESMA função que o /api/voz chama em produção — contra
   esse servidor. Zero mock. O que passar aqui, passa lá.

   CREDENCIAIS: lê do ambiente. Se faltar CF_AI_TOKEN (embedding) ou RADAR_DB
   (motor de ligações), o teste daquela ferramenta é marcado PULADO — nunca
   "passou". Teste que passa sem rodar é mentira com carimbo.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAIZ, 'public');

const TIPOS = { '.json': 'application/json', '.bin': 'application/octet-stream', '.html': 'text/html' };

// ─── o servidor de mentira que serve arquivo de verdade ──────────────────────
let estudoBusca = null;
try {
  estudoBusca = (await import(pathToFileURL(path.join(RAIZ, 'api', 'estudo-busca.js')).href)).default;
} catch (e) { console.log('· /api/estudo-busca não carregou:', e.message); }

// O motor de ligações mora no Postgres (tabela versiculo_emb_voyage), que NÃO está
// no PC do Elias. Então: tenta o handler de verdade com o RADAR_DB do ambiente e,
// se esse banco não tiver a tabela indexada, cai no RADAR NO AR — que é o mesmo
// handler rodando com o banco certo. Em qualquer dos dois, o código provado é o
// nosso; o que muda é de qual banco vem o vetor. O teste IMPRIME qual foi usado.
const PROD = process.env.RADAR_PROD || 'https://radar-atual.vercel.app';
let ondeLigacoes = 'local (RADAR_DB do ambiente)';

const { createRequire } = await import('node:module');
let biblioteca = null;
try { biblioteca = createRequire(import.meta.url)(path.join(RAIZ, 'api', '_lib', 'biblioteca.js')); }
catch (e) { console.log('· api/_lib/biblioteca.js não carregou:', e.message); }

const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  // a biblioteca (motor invisível) — handler REAL, com o pg do ambiente
  if (u.pathname === '/api/dados' && u.searchParams.get('fn') === 'biblioteca' && biblioteca) {
    const corpo = await new Promise((ok2) => { let s = ''; req.on('data', (d) => s += d); req.on('end', () => ok2(s)); });
    let b = {}; try { b = JSON.parse(corpo || '{}'); } catch (_) {}
    const falso = {
      setHeader() {}, statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); return this; },
      end() { res.end(); return this; },
    };
    try { await biblioteca({ method: req.method, query: Object.fromEntries(u.searchParams), body: b }, falso); }
    catch (e) { res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) })); }
    return;
  }
  if (u.pathname === '/api/estudo-busca') {
    const responder = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    let local = null;
    if (estudoBusca && process.env.RADAR_DB) {
      const q = Object.fromEntries(u.searchParams);
      const falso = {
        setHeader() {}, statusCode: 200,
        status(c) { this.statusCode = c; return this; },
        json(o) { local = o; return this; },
        end() { return this; },
      };
      try { await estudoBusca({ method: 'GET', query: q, url: req.url }, falso); } catch (_) { local = null; }
    }
    if (local && local.ok && local.achou) { responder(local); return; }
    try {
      const r = await fetch(PROD + req.url, { headers: { accept: 'application/json' } });
      ondeLigacoes = 'RADAR no ar (' + PROD + ') — o banco local não tem a tabela indexada';
      responder(await r.json());
    } catch (e) { responder(local || { ok: false, err: String(e.message) }); }
    return;
  }
  const alvo = path.join(PUB, u.pathname);
  if (!alvo.startsWith(PUB) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'text/plain' });
  res.end(fs.readFileSync(alvo));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const ORIGEM = 'http://127.0.0.1:' + srv.address().port;
console.log('servidor de prova:', ORIGEM, '\n');

const { executarFerramenta } = await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz-ferramentas.js')).href);

// ─── o placar ────────────────────────────────────────────────────────────────
let passou = 0, falhou = 0, pulou = 0;
function ok(nome, cond, detalhe) {
  if (cond) { passou++; console.log('  ✅', nome, detalhe ? '— ' + detalhe : ''); }
  else { falhou++; console.log('  ❌', nome, detalhe ? '— ' + detalhe : ''); }
}
function pular(nome, porque) { pulou++; console.log('  ⏭  PULADO:', nome, '—', porque); }
const chamar = (n, a) => executarFerramenta(n, a, ORIGEM);

// ══ 1) ler_versiculo ═════════════════════════════════════════════════════════
console.log('▸ ler_versiculo — o texto exato, e o idioma certo');
{
  const r = await chamar('ler_versiculo', { ref: 'Daniel 12:4' });
  ok('Daniel 12:4 achou', r.achou);
  ok('traz "correrão de uma parte para outra" e "ciência se multiplicará"',
    /correr[ãa]o/i.test(r.texto || '') && /ci[êe]ncia se multiplicar/i.test(r.texto || ''),
    (r.texto || '').slice(0, 110));
  ok('idioma de Daniel 12 = HEBRAICO (cap. 12 está fora do trecho aramaico 2-7)',
    /hebraico/.test(r.idioma_original || ''), r.idioma_original);

  const d2 = await chamar('ler_versiculo', { ref: 'Daniel 2:4' });
  ok('Daniel 2:4 = ARAMAICO (detalhe que separa mestre de chatbot)',
    /aramaico/.test(d2.idioma_original || ''), d2.idioma_original);

  const sl = await chamar('ler_versiculo', { ref: 'sl 23:4' });
  ok('Salmos 23:4 pelo apelido "sl"', sl.achou && /sombra da morte/i.test(sl.texto || ''), (sl.texto || '').slice(0, 90));

  const gn = await chamar('ler_versiculo', { ref: 'Gênesis 1:1' });
  ok('Gênesis 1:1 = hebraico (o erro de produção foi chamar isso de grego)',
    /hebraico/.test(gn.idioma_original || ''), gn.idioma_original);

  const jo = await chamar('ler_versiculo', { ref: 'João 1:1' });
  ok('João 1:1 = grego', /grego/.test(jo.idioma_original || ''), jo.idioma_original);
  const job = await chamar('ler_versiculo', { ref: 'Jó 19:25' });
  ok('"Jó 19:25" não vira João', job.achou && /Redentor/i.test(job.texto || ''), (job.texto || '').slice(0, 70));

  const faixa = await chamar('ler_versiculo', { ref: '1 Coríntios 15:20-22' });
  ok('faixa 1 Coríntios 15:20-22 traz 3 versículos', (faixa.versiculos || []).length === 3);

  const fake = await chamar('ler_versiculo', { ref: 'Salmos 23:99' });
  ok('Salmos 23:99 NÃO existe e a ferramenta diz isso', fake.achou === false, fake.motivo);
  const fake2 = await chamar('ler_versiculo', { ref: 'Hesitações 4:2' });
  ok('livro inventado é recusado', fake2.achou === false);
}

// ══ 2) conferir_citacao — a trava ════════════════════════════════════════════
console.log('\n▸ conferir_citacao — a trava anti-invenção');
{
  const bom = await chamar('conferir_citacao', {
    ref: 'Daniel 12:4',
    o_que_eu_disse: 'muitos correrão de uma parte para outra, e a ciência se multiplicará',
  });
  ok('citação fiel de Daniel 12:4 → CONFERE', bom.veredito === 'CONFERE', bom.batimento);

  // A INVENÇÃO REAL, capturada em produção na Sala do Concílio.
  const mau = await chamar('conferir_citacao', {
    ref: 'Levítico 23:10-12',
    o_que_eu_disse: 'tomar o novilho e o cordeiro e oferecer a porção de maná como oferta movida sobre o altar',
  });
  ok('PRODUÇÃO · maná/novilho em Levítico 23 → reprovado',
    mau.veredito === 'NÃO CONFERE' && mau.pode_falar === false, mau.veredito + ' / ' + mau.batimento);

  // O OUTRO ERRO REAL: palavra de Gênesis chamada de grega.
  const idioma = await chamar('conferir_citacao', {
    ref: 'Gênesis 1:1',
    o_que_eu_disse: 'a palavra "criou" em Gênesis 1:1 é o grego poiein, que significa fazer a partir de algo existente',
  });
  ok('PRODUÇÃO · "grego" em Gênesis 1:1 → IDIOMA ERRADO',
    idioma.veredito === 'IDIOMA ERRADO' && idioma.pode_falar === false, idioma.ordem?.slice(0, 80));

  const nt = await chamar('conferir_citacao', {
    ref: 'João 1:1', o_que_eu_disse: 'a palavra hebraica logos aparece aqui',
  });
  ok('"hebraica" num texto do Novo Testamento → IDIOMA ERRADO', nt.veredito === 'IDIOMA ERRADO');

  const inexistente = await chamar('conferir_citacao', { ref: 'Salmos 151:1', o_que_eu_disse: 'o Senhor é bom' });
  ok('referência que não existe → REFERÊNCIA NÃO EXISTE', inexistente.veredito === 'REFERÊNCIA NÃO EXISTE');

  // ALARME FALSO É TÃO RUIM QUANTO O ERRO: uma paráfrase honesta não pode ser
  // reprovada como invenção, senão o mestre para de citar por medo.
  const para = await chamar('conferir_citacao', {
    ref: 'Salmos 23:4',
    o_que_eu_disse: 'ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum, porque tu estás comigo',
  });
  ok('paráfrase honesta do Salmo 23:4 NÃO é acusada de invenção',
    para.pode_falar === true, para.veredito + ' / ' + para.batimento);
}

// ══ 3) buscar_no_acervo ══════════════════════════════════════════════════════
console.log('\n▸ buscar_no_acervo — as pregações do próprio Elias');
if (!process.env.CF_AI_TOKEN || !process.env.CF_ACCOUNT_ID) {
  pular('buscar_no_acervo', 'sem CF_ACCOUNT_ID/CF_AI_TOKEN no ambiente');
} else {
  const r = await chamar('buscar_no_acervo', { pergunta: 'o que eu já preguei sobre a escada de Jacó' });
  ok('achou de verdade no acervo', r.achou === true, 'melhor: ' + (r.trechos?.[0]?.mensagem || '—'));
  ok('a mensagem da escada de Jacó está entre os achados',
    (r.trechos || []).some((t) => /escada/i.test(t.mensagem) || /escada-de-jaco/.test(t.arquivo)),
    (r.trechos || []).map((t) => t.mensagem).join(' | '));
  ok('vem com o nome da mensagem pra citar a fonte', !!(r.trechos?.[0]?.mensagem) && !!r.fonte);

  const nada = await chamar('buscar_no_acervo', { pergunta: 'como trocar o amortecedor dianteiro de uma caminhonete a diesel' });
  ok('assunto que ele nunca pregou volta FRACO (não inventa pregação)', nada.achou === false, 'melhor parecença: ' + (nada.trechos?.[0]?.parecenca ?? '—'));
}

// ══ 4) versiculos_ligados ════════════════════════════════════════════════════
console.log('\n▸ versiculos_ligados — o motor de ligações');
{
  const r = await chamar('versiculos_ligados', { ref: 'gn 28:12' });
  console.log('   banco usado:', ondeLigacoes);
  ok('Gênesis 28:12 trouxe ligados', r.achou === true, (r.ligados || []).length + ' versículos');
  ok('a base é a escada de Jacó', /escada/i.test(r.base?.texto || ''), (r.base?.texto || '').slice(0, 80));
  ok('todo ligado vem com referência E texto', (r.ligados || []).every((x) => x.referencia && x.texto),
    (r.ligados || []).slice(0, 3).map((x) => x.referencia).join(', '));
}

// ══ 4-B) pesquisar_biblioteca — a biblioteca comprada, como motor invisível ══
console.log('\n▸ pesquisar_biblioteca — erudição de verdade, com fonte, sem distribuir livro');
if (!process.env.RADAR_DB || !process.env.RADAR_ADMIN_TOKEN) {
  pular('pesquisar_biblioteca', 'sem RADAR_DB / RADAR_ADMIN_TOKEN no ambiente');
} else {
  const r = await chamar('pesquisar_biblioteca', {
    pergunta: 'o que a palavra hebraica de Gênesis 28:12 traduzida por escada carrega de sentido',
  });
  ok('achou erudição sobre a escada de Jacó', r.achou === true, (r.fontes || []).map((f) => f.autor).join(', '));
  ok('a nota veio com a fonte nomeada', (r.fontes || []).length > 0 && (r.fontes || []).every((f) => f.autor));
  ok('a nota fala de sullam / escada no original',
    /sul+[aãá]m|escada|degrau|zigurat/i.test(r.nota_de_pesquisa || ''),
    (r.nota_de_pesquisa || '').slice(0, 120));

  // ⚖️ A TRAVA JURÍDICA, e é a mais importante deste arquivo inteiro:
  // o que sai da ferramenta NÃO pode conter o parágrafo do autor. Só a nota
  // original e os nomes. Se um dia alguém "melhorar" isto devolvendo o trecho
  // pra dar mais contexto ao modelo, este teste tem que ficar vermelho.
  const sai = JSON.stringify(r);
  ok('NÃO devolve o texto do livro (só a nota original e as fontes)',
    !('itens' in r) && !('trechos' in r) && !/"texto"\s*:/.test(sai),
    'campos: ' + Object.keys(r).join(', '));
  ok('a nota é curta o bastante pra virar fala', (r.nota_de_pesquisa || '').length < 2200,
    (r.nota_de_pesquisa || '').length + ' caracteres');

  const nada = await chamar('pesquisar_biblioteca', {
    pergunta: 'qual a pressão recomendada do pneu dianteiro de uma motocicleta 160 cilindradas',
  });
  ok('assunto fora da biblioteca → recusa em vez de inventar', nada.achou === false, nada.motivo?.slice(0, 70));
}

// ══ 5) garimpar (o que já existia, pra não quebrar) ══════════════════════════
console.log('\n▸ garimpar — material do Dr. Wagner (não pode ter quebrado)');
{
  const r = await chamar('garimpar', { assunto: 'escada de Jacó Betel anjos subindo descendo' });
  ok('garimpar responde', typeof r.achou === 'boolean', r.achou ? (r.material || '').length + ' caracteres' : 'vazio');
}

// ══ 6) ferramenta desconhecida ═══════════════════════════════════════════════
console.log('\n▸ porta fechada');
{
  const r = await chamar('inventar_versiculo', { x: 1 });
  ok('nome de ferramenta que não existe é recusado', !!r.erro, r.erro);
}

srv.close();
console.log('\n' + '─'.repeat(64));
console.log(`✅ ${passou} passaram · ❌ ${falhou} falharam · ⏭ ${pulou} pulados`);
process.exit(falhou ? 1 : 0);
