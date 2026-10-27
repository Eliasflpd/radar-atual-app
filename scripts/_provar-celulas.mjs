// Prova das CÉLULAS sem IA (api/_lib/celulas.js): Escuta, Intenção, Contexto, Pesquisa (etiquetas), Verificação
// e Expressão. Roda sem rede e sem custo:  node --test scripts/_provar-celulas.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../api/_lib/celulas.js';

test('Escuta: fala vazia, certeza baixa e eco viram dúvida; certeza 0 do Android não pesa', () => {
  assert.equal(C.escutar('', 0.9).duvida, true);
  assert.equal(C.escutar('o que diz Romanos 8', 0.3).duvida, true);
  assert.equal(C.escutar('amém amém amém', 0.9).duvida, true);
  assert.equal(C.escutar('o que diz Romanos 8', 0).duvida, false);
});

test('Intenção: papo não abre livro; fonte, referência e palavra original pedem pesquisa; sermão é material', () => {
  assert.equal(C.intencao('obrigado, pastor').tipo, 'papo');
  assert.equal(C.intencao('tudo bem?').tipo, 'papo');
  assert.equal(C.intencao('o que o Kittel diz sobre ágape?').tipo, 'pesquisa');
  assert.equal(C.intencao('me explica João 3:16').tipo, 'pesquisa');
  assert.equal(C.intencao('qual o significado de graça no grego').tipo, 'pesquisa');
  assert.equal(C.intencao('prepara um sermão sobre fé').tipo, 'material');
  assert.equal(C.intencao('como a gente pode orar melhor quando está cansado?').tipo, 'pergunta');
  assert.deepEqual(C.referenciasDe('compara Romanos 8:28 com Gênesis 50.20'), ['romanos 8:28', 'genesis 50:20']);
});

test('Contexto: "e o Kittel?" liga com o assunto anterior; sem assunto guardado, segue e avisa', () => {
  const a = C.contextualizar('e o Kittel, o que fala disso?', { tema: 'o sentido de ágape em 1 Coríntios 13', autores: ['Thayer'] }, 'pesquisa');
  assert.equal(a.usouAnterior, true);
  assert.match(a.consulta, /ágape/);
  const b = C.contextualizar('e o Kittel, o que fala disso?', {}, 'pesquisa');
  assert.equal(b.usouAnterior, false);
  assert.match(b.resumo, /não há assunto guardado/);
  const c = C.contextualizar('obrigado', { tema: 'graça' }, 'papo');
  assert.equal(c.tema, 'graça');
});

const EVID = C.rotular([
  { autor: 'Kittel (TDNT)', obra: 'Dicionário', onde: 'agápē', texto: 'Amor, no AT, é um sentimento espontâneo que estimula uma pessoa a entregar-se.' },
  { autor: 'Thayer (Léxico Grego do NT)', obra: 'Léxico', onde: 'G0026', texto: 'afeição, boa vontade, amor, benevolência.' },
]);
const VERS = [{ referencia: '1 João 4:8', texto: 'Aquele que não ama não conhece a Deus, porque Deus é amor.' }];

test('Fonte histórica: o jornal tem selo próprio (história, nunca doutrina), não o "com filtro" do Champlin', () => {
  assert.equal(C.ehHistorico({ tipo: 'historico', aprovado: false, peso: 4 }), true);
  assert.equal(C.ehHistorico({ tipo: 'comentario', aprovado: false, peso: 4 }), false);
  assert.match(C.SELO_HISTORICO, /^FONTE HISTÓRICA/);
  assert.match(C.SELO_HISTORICO, /nunca como autoridade de doutrina/);
  assert.doesNotMatch(C.SELO_HISTORICO, /grego/);
});

test('Pesquisa: cada evidência ganha id na ordem', () => {
  assert.deepEqual(EVID.map((e) => e.id), ['E1', 'E2']);
  assert.match(C.blocoDeEvidencias(EVID, VERS), /\[E2\] Thayer/);
});

test('Verificação: resposta com apoio passa', () => {
  const r = C.verificar('O Kittel mostra que o amor é entrega [E1]. O Thayer resume como benevolência [E2]. Como diz a Escritura, "Deus é amor".', EVID, VERS);
  assert.equal(r.ok, true, JSON.stringify(r.problemas));
  assert.deepEqual(r.citadas.sort(), ['E1', 'E2']);
});

test('Verificação: autor não consultado, autor sem etiqueta, etiqueta inexistente e citação inventada são pegos', () => {
  const r = C.verificar('O Champlin diz que é paixão. O Kittel ensina outra coisa. Veja [E9]. Ele escreveu "o amor é um fogo que consome".', EVID, VERS);
  const tipos = r.problemas.map((p) => p.tipo).sort();
  assert.deepEqual(tipos, ['autor_nao_consultado', 'autor_sem_etiqueta', 'citacao_sem_fonte', 'etiqueta_inexistente']);
});

test('Verificação: etiqueta de outro autor é pega; "não encontrei" pode citar o autor sem etiqueta', () => {
  assert.equal(C.verificar('O Kittel diz isso [E2].', EVID, VERS).problemas[0].tipo, 'etiqueta_de_outro_autor');
  assert.equal(C.verificar('Sobre isso eu não encontrei nada no Champlin.', EVID, VERS).ok, true);
});

test('Expressão: etiquetas somem da fala e viram números na tela; ressalva nomeia o autor sem apoio', () => {
  assert.equal(C.semEtiquetas('O Kittel mostra [E1] e o Thayer [E2, E3].'), 'O Kittel mostra e o Thayer.');
  assert.equal(C.etiquetasNaTela('O Kittel [E1] e [E2, E3].'), 'O Kittel [1] e [2, 3].');
  assert.match(C.ressalva([{ autor: 'Champlin' }]), /Champlin/);
});

test('Coordenação: cada tarefa tem id próprio e o emissor carimba conversa e tarefa (isolamento)', () => {
  const a = C.idsDaTarefa('c_pastor1'), b = C.idsDaTarefa('c_pastor2');
  assert.notEqual(a.tarefa, b.tarefa);
  const saidaA = [], saidaB = [];
  const ea = C.criarEmissor((e) => saidaA.push(e), a), eb = C.criarEmissor((e) => saidaB.push(e), b);
  ea.cel('pesquisa', 'inicio'); eb.cel('pesquisa', 'inicio'); ea.cel('pesquisa', 'ok');
  assert.equal(saidaA.length, 2); assert.equal(saidaB.length, 1);
  assert.ok(saidaA.every((e) => e.conversa === 'c_pastor1' && e.tarefa === a.tarefa));
  assert.equal(C.idsDaTarefa('<script>').conversa.startsWith('c_'), true);
});

test('Verificação na continuidade: autor conferido na fala anterior pode voltar sem etiqueta; etiqueta errada continua problema', () => {
  assert.equal(C.verificar('Como o Champlin já disse antes, isso é paixão.', EVID, VERS, ['Champlin']).ok, true);
  assert.equal(C.verificar('Como o Champlin já disse antes, isso é paixão.', EVID, VERS, []).ok, false);
  assert.equal(C.verificar('O Kittel diz isso [E2].', EVID, VERS, ['Kittel (TDNT)']).problemas[0].tipo, 'etiqueta_de_outro_autor');
});
