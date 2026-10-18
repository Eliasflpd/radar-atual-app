// Prova da ligação Concílio ↔ biblioteca de estudo. Sem banco e sem rede: o fetch é simulado.
// Roda com:  node scripts/_provar-concilio-biblioteca.mjs
import { bibliotecaFonte, fontesDeEstudo } from '../api/_lib/concilio.js';

let ok = 0, falhou = 0;
const prova = (nome, cond, detalhe) => { if (cond) { ok++; console.log('  ✅ ' + nome + (detalhe ? ' — ' + detalhe : '')); } else { falhou++; console.log('  ❌ ' + nome + (detalhe ? ' — ' + detalhe : '')); } };

const ITENS = [
  { autor: 'Keil & Delitzsch', livro: 'Gênesis', secao: 'Gênesis 1', texto: 'TEXTO-FICTICIO-A '.repeat(200), peso: 3, aprovado: true, score: 0.64 },
  { autor: 'Thayer (Léxico Grego do NT)', livro: 'G4151', secao: 'G4151', texto: 'TEXTO-FICTICIO-B', peso: 2, aprovado: true, score: 0.61 },
  { autor: 'Champlin', livro: 'Mateus', secao: 'Mateus 5', texto: 'TEXTO-FICTICIO-C', peso: 4, aprovado: false, score: 0.55 },
  { autor: 'Fraco', livro: 'X', secao: 'X', texto: 'TEXTO-FICTICIO-D', peso: 3, aprovado: true, score: 0.31 },   // abaixo do corte: não pode entrar
];
const chamadas = [];
globalThis.fetch = async (url, init) => {
  chamadas.push({ url: String(url), corpo: init && init.body ? JSON.parse(init.body) : null });
  if (String(url).includes('/api/dados?fn=biblioteca')) return { ok: true, json: async () => ({ ok: true, itens: ITENS }) };
  return { ok: false, json: async () => ({}) };   // o Kittel (tabela perdida) não responde — e o Concílio segue
};

console.log('▸ sem token, nada acontece');
delete process.env.RADAR_ADMIN_TOKEN;
prova('sem RADAR_ADMIN_TOKEN devolve vazio e nem chama a rede', (await bibliotecaFonte('espírito', 'http://x', 4)) === '' && chamadas.length === 0);

console.log('▸ com token e banco respondendo');
process.env.RADAR_ADMIN_TOKEN = 'token-de-teste';
const b = await bibliotecaFonte('o que significa o Espírito pairando sobre as águas', 'http://x', 4);
prova('monta o bloco de consulta', /CONSULTA À BIBLIOTECA DE ESTUDO/.test(b));
prova('inclui os autores acima do corte', /Keil & Delitzsch/.test(b) && /Thayer/.test(b) && /Champlin/.test(b));
prova('deixa de fora o que ficou abaixo do corte de nota', !/Fraco/.test(b) && !/TEXTO-FICTICIO-D/.test(b));
prova('manda a pergunta e o token pro motor, servidor a servidor', chamadas.length === 1 && chamadas[0].corpo.token === 'token-de-teste' && /Espírito pairando/.test(chamadas[0].corpo.q));
prova('rotula a ordem de autoridade (primária / aprovado / com filtro)', /FONTE PRIMÁRIA/.test(b) && /autor aprovado/.test(b) && /COM FILTRO/.test(b));
prova('corta cada trecho em ~1300 letras (o prompt não incha)', b.length < 4 * 1500 + 1800, b.length + ' letras no total');
prova('traz a ordem de NÃO copiar e de dizer de onde veio', /NÃO copie/.test(b) && /seis palavras/.test(b) && /nome do autor/.test(b));

console.log('▸ junto com o Kittel (que hoje não responde)');
chamadas.length = 0;
const f = await fontesDeEstudo('Espírito pairando sobre as águas', 'http://x', 2);
prova('o Concílio continua funcionando mesmo com o Kittel mudo', /CONSULTA À BIBLIOTECA/.test(f) && !/KITTEL/.test(f));

console.log('▸ banco fora do ar');
globalThis.fetch = async () => { throw new Error('rede caiu'); };
prova('falha em silêncio (devolve vazio) e o Concílio segue como sempre foi', (await fontesDeEstudo('qualquer coisa', 'http://x', 2)) === '');

console.log('▸ nada do banco bate com o assunto');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, itens: [{ ...ITENS[3] }] }) });
prova('só trecho fraco → não dá fonte nenhuma', (await bibliotecaFonte('assunto sem apoio', 'http://x', 4)) === '');

console.log('\n' + '─'.repeat(60) + '\n✅ ' + ok + ' passaram · ❌ ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
