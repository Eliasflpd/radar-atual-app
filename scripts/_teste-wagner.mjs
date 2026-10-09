// Bancada de teste LOCAL do /api/concilio-wagner (não vai pro deploy — descartável).
// Os arquivos de api/ são .js e o package.json não tem "type":"module", então o Node
// os leria como CommonJS. Copiamos pra .mjs num temporário só pra poder importar aqui.
//
// MODOS (nenhum precisa de servidor):
//   node scripts/_teste-wagner.mjs --busca    só a busca de contexto (o que o acervo acha)
//   node scripts/_teste-wagner.mjs --prompt   monta o prompt inteiro e imprime tamanho +
//                                             as primeiras linhas (pra conferir a VOZ sem
//                                             gastar chamada de IA)
//   node scripts/_teste-wagner.mjs            chamada fim a fim (precisa das chaves da
//                                             cascata no ambiente: GROQ_API_KEY etc.)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// A raiz é calculada a partir deste arquivo: o clone pode estar em D:\RADAR-APP,
// D:\radar-atual-app ou em qualquer outro lugar — não pode ficar fixo no código.
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const TMP = path.join(RAIZ, '_tmp-wagner-teste');
fs.mkdirSync(TMP, { recursive: true });

// concilio-wagner.js importa ia.js e concilio.js (que importa ia.js). Todos os quatro
// vão pro temporário como .mjs, com os imports relativos reescritos pra .mjs também.
for (const nome of ['wagner-corpus', 'ia', 'concilio', 'concilio-wagner']) {
  const src = fs.readFileSync(path.join(RAIZ, 'api/_lib', nome + '.js'), 'utf8')
    .replace(/from\s+'\.\/([\w-]+)\.js'/g, "from './$1.mjs'")
    .replace(/import\(\s*'\.\/([\w-]+)\.js'\s*\)/g, "import('./$1.mjs')");
  fs.writeFileSync(path.join(TMP, nome + '.mjs'), src);
}

// PROVEDOR ALTERNATIVO SÓ PRO TESTE: se a conta OpenAI estiver sem crédito, dá pra
// desviar a chamada pra outro provedor compatível com a API da OpenAI. O código de
// produção NÃO muda — o desvio é aqui.
if (process.env.TESTE_BASE) {
  const real = globalThis.fetch;
  globalThis.fetch = (url, init) => {
    if (String(url).includes('api.openai.com')) {
      const b = JSON.parse(init.body);
      b.model = process.env.TESTE_MODELO || b.model;
      return real(process.env.TESTE_BASE + '/chat/completions', { ...init, body: JSON.stringify(b) });
    }
    return real(url, init);
  };
}

const mod = await import(pathToFileURL(path.join(TMP, 'concilio-wagner.mjs')).href);
const handler = mod.default;

const PERGUNTAS = [
  'me explique o corvo e a pomba na arca de Noé',
  'o que significam as cores do tabernáculo?',
  'quando vai ser o arrebatamento?',
];

const soBusca = process.argv.includes('--busca');
const soPrompt = process.argv.includes('--prompt');
const temChave = ['GROQ_API_KEY', 'CEREBRAS_API_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
  .some((k) => process.env[k]);

if (!soBusca && !soPrompt && !temChave) {
  console.log('Sem chave de IA no ambiente (GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY).');
  console.log('Rode com --busca ou --prompt pra testar sem IA, ou exporte uma chave antes.');
}

// Conta os bordões no prompt — é o jeito rápido de ver se a VOZ está dentro do que
// as transcrições mostram (as contagens de referência estão no _PERFIL-WAGNER).
function bordoes(txt) {
  const lista = [
    ['diga o quê', /diga o qu[êe]/gi], ['me pergunte por quê', /me pergunte por qu[êe]/gi], ['diga amém', /diga am[ée]m/gi],
    ['olha pra quem está do seu lado', /quem est[áa] (do|ao) seu lado/gi], ['já foi embora', /j[áa] fo(i|ram) embora/gi],
    ['sim ou não', /sim ou n[ãa]o/gi], ['glória a Deus', /gl[óo]ria a deus/gi], ['irmão', /\birm[ãa]o/gi],
  ];
  return lista.map(([n, re]) => n + ' ' + (txt.match(re) || []).length + 'x').join(' · ');
}

for (const p of PERGUNTAS) {
  console.log('\n' + '█'.repeat(78));
  console.log('PERGUNTA:', p);
  console.log('█'.repeat(78));

  const ctx = mod.buscarContexto(p, 14000, { marcar: true });
  console.log('\n— TERMOS:', ctx.termos.join(', '));
  console.log('— CONTEXTO ACHADO:', ctx.texto.length, 'caracteres em', ctx.fontes.length, 'trechos');
  ctx.fontes.forEach((f, i) => console.log(`   ${String(i + 1).padStart(2)}. [${f.fonte}] ${ctx.rotulos[i]}`));
  if (soBusca) continue;

  if (soPrompt) {
    const { sys, user } = mod.montarPrompt(p, ctx);
    console.log('\n— PROMPT DE SISTEMA:', sys.length, 'caracteres (~' + Math.round(sys.length / 4) + ' tokens)',
      '· USUÁRIO:', user.length, 'caracteres');
    console.log('— METODO:', mod.METODO.length, '· EXEMPLOS:', mod.EXEMPLOS.length);
    console.log('— bordões citados no prompt:', bordoes(sys));
    console.log('\n' + sys.slice(0, 1800).replace(/^/gm, '   ') + '\n   […]');
    continue;
  }
  if (!temChave) continue;

  const t0 = Date.now();
  const res = await handler(new Request('https://x/api/concilio-wagner', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: p }),
  }));
  const j = await res.json();
  console.log('\n— HTTP', res.status, '·', ((Date.now() - t0) / 1000).toFixed(1) + 's', '· provedor:', j.provedor, j.modelo);
  if (!j.ok) { console.log('ERRO:', j.erro); continue; }
  console.log('— temQuadro:', j.temQuadro, '· avisos:', JSON.stringify(j.avisos));
  console.log('— bordões na resposta:', bordoes(j.resposta));
  console.log('\n' + j.resposta);
  if (j.quadro) console.log('\n--- QUADRO ---\n' + JSON.stringify(j.quadro, null, 1));
}

fs.rmSync(TMP, { recursive: true, force: true }); // não deixa lixo na pasta do projeto
