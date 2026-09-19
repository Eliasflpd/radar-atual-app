/* ════════════════════════════════════════════════════════════════════════════
   TESTE DA BUSCA POR PALAVRA (plano B, sem servidor).
   Pega o JavaScript de verdade de /biblioteca/busca/index.html, finge um
   navegador SEM INTERNET, carrega a Bíblia e o índice das mensagens do disco,
   e faz perguntas. Prova que offline sai RESULTADO — e com o aviso na tela de
   que é busca simples.
   Uso: node scripts/teste-busca-palavra.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), vm = require('vm'), path = require('path');
const RAIZ = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(RAIZ, 'public/biblioteca/busca/index.html'), 'utf8');
const codigo = (html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i) || [])[1];
if (!codigo) { console.log('não achei o <script> da página'); process.exit(1); }

/* ── navegador de mentira, e SEM REDE ─────────────────────────────────────── */
const tela = {};                                  // id -> {innerHTML, value, ...}
function nó(id){ return tela[id] || (tela[id] = { id, innerHTML:'', value:'', style:{}, offsetTop:0,
  disabled:false, addEventListener(){}, focus(){}, blur(){}, classList:{add(){},remove(){},contains(){return false;}} }); }

const caixa = {
  console, setTimeout, Promise, performance,
  navigator: { onLine: false, userAgent: 'node', clipboard: null },
  location: { origin: 'https://radar-atual.vercel.app', search: '' },
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  URLSearchParams,
  window: { scrollTo(){}, isSecureContext: false },
  document: {
    getElementById: nó,
    addEventListener(){},
    createElement: () => ({ style:{}, appendChild(){}, classList:{add(){},remove(){}} }),
    body: { appendChild(){} }
  },
  fetch: async () => { throw new TypeError('Failed to fetch'); },   // SEM INTERNET
};
caixa.window.document = caixa.document;
caixa.globalThis = caixa;
vm.createContext(caixa);
try { vm.runInContext(codigo, caixa, { filename: 'busca/index.html' }); } catch (e) { /* o inicio() falha sem rede, é o esperado */ }

/* ── munição: os dados de verdade, do disco ───────────────────────────────── */
caixa.BIBTXT = require(path.join(RAIZ, 'public/biblia.json'));
caixa.ACERVO = { meta: require(path.join(RAIZ, 'public/busca/mensagens.idx.json')) };
console.log('Bíblia carregada: ' + caixa.BIBTXT.length + ' livros');
console.log('Acervo carregado: ' + caixa.ACERVO.meta.docs.length + ' mensagens · ' + caixa.ACERVO.meta.total + ' trechos\n');

let passou = 0, falhou = 0;
function conta(ok, t, d){ console.log((ok?'  OK   ':'  FALHA')+'  '+t+(d?'   → '+d:'')); ok?passou++:falhou++; }

const perguntas = [
  ['cidade de refúgio',                 'Números 35'],
  ['perdoar quem me magoou',            null],
  ['lâmpada para os meus pés',          'Salmos 119'],
  ['jejum e oração',                    null],
  ['xyzabc naoexiste',                  'DEVE_DAR_VAZIO']
];

for (const [q, esperado] of perguntas) {
  nó('saida').innerHTML = '';
  const t0 = Date.now();
  caixa.buscaPorPalavra(q);
  const ms = Date.now() - t0;
  const saida = nó('saida').innerHTML;
  const avisou = saida.includes('Busca simples, por palavra') && saida.includes('sem internet');
  const achou  = saida.includes('class="res"');
  const vazio  = saida.includes('Não achei essas palavras');

  if (esperado === 'DEVE_DAR_VAZIO') {
    conta(avisou && vazio && !achou, '"' + q + '" → diz que não achou, com aviso (' + ms + ' ms)');
  } else {
    const refs = [...saida.matchAll(/<div class="tit">([^<]+)</g)].map(m => m[1]);
    conta(avisou && achou, '"' + q + '" → achou ' + refs.length + ' resultado(s) em ' + ms + ' ms',
      refs.slice(0,3).join(' · '));
    if (esperado) conta(refs.some(r => r.includes(esperado)), '   ↳ trouxe ' + esperado, refs.slice(0,4).join(' · '));
  }
}

console.log('\n  — checagem do aviso de estado —');
nó('estado').innerHTML = '';
caixa.pintarEstado();
const est = nó('estado').innerHTML;
conta(est.includes('sem internet') && est.includes('busca por palavra'),
  'a tela avisa ANTES de digitar que a busca por significado está fora', est.replace(/<[^>]+>/g, '').slice(0, 110) + '…');

console.log('\n────────────────────────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
