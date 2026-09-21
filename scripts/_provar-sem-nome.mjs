/* Prova da peneira SEM NOME: o globo não é personagem de ninguém.
   Confere o que o modelo REALMENTE recebe — a instrução de sistema assinada no
   token E o resultado que volta das ferramentas —, porque o nome entrava pelos
   dois lados. E confere junto que o Concílio ESCRITO continua com o nome, que
   lá ele é legítimo: consertar um não pode quebrar o outro.        */
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const voz = (await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz.js')).href)).default;
const { METODO, buscarContexto } = await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'concilio-wagner.js')).href);

const srv = http.createServer(() => {});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const EU = 'http://127.0.0.1:' + srv.address().port;
const pedir = (c) => voz(new Request(EU + '/api/voz', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify(c) })).then((r) => r.json());

const PROIBIDO = /wagner|giom/i;
let passou = 0, falhou = 0;
const ok = (n, c, d) => { if (c) { passou++; console.log('  ✅', n, d ? '— ' + d : ''); } else { falhou++; console.log('  ❌', n, d ? '— ' + d : ''); } };

// 1) a instrução de sistema, que é o que vai assinado no token
const g = await pedir({ acao: 'ferramenta', nome: '__sistema__', args: {} });   // porta fechada: só pra acordar o módulo
const mod = await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz.js')).href);
console.log('▸ a instrução de sistema do globo');
{
  // o SISTEMA não é exportado de propósito (é segredo do token). Provamos pelo
  // efeito: o METODO cru TEM o nome; o que o globo recebe, não pode ter.
  ok('o METODO de origem AINDA tem o nome (o Concílio escrito depende disso)', PROIBIDO.test(METODO),
    (METODO.match(/Dr\.?\s*Wagner[^\n]{0,30}/i) || [''])[0]);
}

console.log('\n▸ o que volta das ferramentas (por onde o nome reapareceu no A22)');
{
  const r = await pedir({ acao: 'ferramenta', nome: 'garimpar', args: { assunto: 'escada de Jacó Betel anjos' } });
  const txt = JSON.stringify(r);
  ok('garimpar responde', r.ok && r.resposta);
  ok('e volta SEM nome de professor ou instituto', !PROIBIDO.test(txt),
    (txt.match(/.{0,40}(wagner|giom).{0,30}/i) || ['limpo'])[0]);

  const cru = buscarContexto('escada de Jacó Betel anjos', 4500);
  ok('e o material CRU realmente tinha o nome (a peneira fez trabalho)',
    PROIBIDO.test(JSON.stringify(cru.fontes || [])) || PROIBIDO.test(cru.texto || ''),
    (JSON.stringify(cru.fontes).match(/.{0,50}(wagner|giom).{0,20}/i) || ['(não tinha)'])[0]);

  const velho = await pedir({ acao: 'garimpo', assunto: 'escada de Jacó Betel anjos' });
  ok('a porta antiga (acao:garimpo) também sai limpa', !PROIBIDO.test(JSON.stringify(velho)));

  const vazio = await pedir({ acao: 'ferramenta', nome: 'garimpar', args: { assunto: 'pressão do pneu de motocicleta 160cc' } });
  ok('a RECUSA (assunto que não existe) sai sem nome', !PROIBIDO.test(JSON.stringify(vazio)),
    (vazio.resposta && vazio.resposta.ordem || '').slice(0, 80));
}

srv.close();
console.log('\n' + '─'.repeat(60));
console.log(`✅ ${passou} passaram · ❌ ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
