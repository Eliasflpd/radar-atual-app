// Bancada de teste LOCAL do /api/concilio-wagner (não vai pro deploy — descartável).
// Os arquivos de api/ são .js e o package.json não tem "type":"module", então o Node
// os leria como CommonJS. Copiamos pra .mjs num temporário só pra poder importar aqui.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'D:/RADAR-APP';
const TMP = path.join(RAIZ, '_tmp-wagner-teste');
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, 'wagner-corpus.mjs'), fs.readFileSync(path.join(RAIZ, 'api/_lib/wagner-corpus.js'), 'utf8'));
fs.writeFileSync(
  path.join(TMP, 'concilio-wagner.mjs'),
  fs.readFileSync(path.join(RAIZ, 'api/_lib/concilio-wagner.js'), 'utf8').replace("'./wagner-corpus.js'", "'./wagner-corpus.mjs'")
);

// PROVEDOR ALTERNATIVO SÓ PRO TESTE: a conta OpenAI do RADAR está SEM CRÉDITO
// ("credit_balance_exhausted" — o /api/concilio em produção também está caindo por isso).
// Pra provar o endpoint fim a fim mesmo assim, desviamos a chamada pra outro provedor
// compatível com a API da OpenAI. O código de produção NÃO muda — o desvio é aqui.
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

const mod = await import('file:///' + path.join(TMP, 'concilio-wagner.mjs').replace(/\\/g, '/'));
const handler = mod.default;

const PERGUNTAS = [
  'me explique o corvo e a pomba na arca de Noé',
  'o que significam as cores do tabernáculo?',
  'quando vai ser o arrebatamento?',
];

const soBusca = process.argv.includes('--busca');

for (const p of PERGUNTAS) {
  console.log('\n' + '█'.repeat(78));
  console.log('PERGUNTA:', p);
  console.log('█'.repeat(78));

  const ctx = mod.buscarContexto(p, 9000);
  console.log('\n— TERMOS:', ctx.termos.join(', '));
  console.log('— CONTEXTO ACHADO:', ctx.texto.length, 'caracteres em', ctx.fontes.length, 'trechos');
  ctx.fontes.forEach((f, i) => console.log(`   ${String(i + 1).padStart(2)}. [${f.fonte}] ${f.titulo}`));
  if (soBusca) continue;

  const t0 = Date.now();
  const res = await handler(new Request('https://x/api/concilio-wagner', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: p }),
  }));
  const j = await res.json();
  console.log('\n— HTTP', res.status, '·', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (!j.ok) { console.log('ERRO:', j.erro); continue; }
  console.log('— temQuadro:', j.temQuadro, '· avisos:', JSON.stringify(j.avisos));
  console.log('\n' + j.resposta);
  if (j.quadro) console.log('\n--- QUADRO ---\n' + JSON.stringify(j.quadro, null, 1));
}

fs.rmSync(TMP, { recursive: true, force: true }); // não deixa lixo na pasta do projeto
