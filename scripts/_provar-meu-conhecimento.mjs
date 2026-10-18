// Prova da ferramenta meu_conhecimento (o "espelho" do globo de voz). Não precisa de banco nem de rede:
// o fetch é simulado. Roda com:  node scripts/_provar-meu-conhecimento.mjs
import { FERRAMENTAS, executarFerramenta, REGRA_DE_OURO } from '../api/_lib/voz-ferramentas.js';

let ok = 0, falhou = 0;
const prova = (nome, cond, detalhe) => { if (cond) { ok++; console.log('  ✅ ' + nome + (detalhe ? ' — ' + detalhe : '')); } else { falhou++; console.log('  ❌ ' + nome + (detalhe ? ' — ' + detalhe : '')); } };

process.env.RADAR_ADMIN_TOKEN = 'token-de-teste';
const nomes = FERRAMENTAS[0].functionDeclarations.map((d) => d.name);

console.log('▸ declaração');
prova('meu_conhecimento está declarada', nomes.includes('meu_conhecimento'), nomes.length + ' ferramentas');
prova('as instruções do globo mencionam a LEI 0 e a ferramenta', /LEI 0/.test(REGRA_DE_OURO) && /meu_conhecimento/.test(REGRA_DE_OURO));
const faltam = nomes.filter((n) => !REGRA_DE_OURO.includes(n));
prova('toda ferramenta declarada aparece na lista das instruções', faltam.length === 0, faltam.join(', ') || 'todas');

console.log('▸ com o catálogo respondendo');
let chamadas = 0;
globalThis.fetch = async (url, init) => {
  chamadas++;
  const corpo = JSON.parse((init && init.body) || '{}');
  if (String(url).includes('/api/dados?fn=biblioteca') && corpo.catalogo && corpo.token === 'token-de-teste') {
    return { ok: true, json: async () => ({ ok: true, total: 21374, obras: [
      { autor: 'Keil & Delitzsch', obra: 'Comentário sobre o Antigo Testamento', tipo: 'comentario', peso: 3, aprovado: true, trechos: 20802 },
      { autor: 'Wesley L. Duewel', obra: 'Fogo do Avivamento', tipo: 'comentario', peso: 3, aprovado: true, trechos: 572 },
    ] }) };
  }
  return { ok: false, json: async () => ({}) };
};
const r = await executarFerramenta('meu_conhecimento', {}, 'http://servidor-de-teste');
prova('devolve todas as ferramentas', r.ferramentas.length === nomes.length, r.ferramentas.length + ' ferramentas');
prova('devolve as fontes fixas', r.fontes_fixas.length >= 6);
prova('biblioteca disponível com os autores reais', r.biblioteca_de_estudo.disponivel && r.biblioteca_de_estudo.autores.length === 2,
  r.biblioteca_de_estudo.autores.map((a) => a.autor).join(' | '));
prova('traz as contagens', r.biblioteca_de_estudo.total_trechos === 21374);
prova('NÃO traz texto de livro (só nomes e números)', !/"texto"/.test(JSON.stringify(r)));
prova('a ordem manda responder completo e sem inventar', /COMPLETO/.test(r.ordem) && /NÃO acrescente/.test(r.ordem));
await executarFerramenta('meu_conhecimento', {}, 'http://servidor-de-teste');
prova('segunda pergunta usa o cache (1 ida ao banco só)', chamadas === 1, chamadas + ' chamada(s)');

console.log('▸ com o catálogo fora do ar');
globalThis.fetch = async () => { throw new Error('rede caiu'); };
// zera o cache importando de novo com query diferente
const outro = await import('../api/_lib/voz-ferramentas.js?semcache=' + Date.now());
const r2 = await outro.executarFerramenta('meu_conhecimento', {}, 'http://servidor-de-teste');
prova('avisa que a lista da biblioteca não veio', r2.biblioteca_de_estudo.disponivel === false && /NÃO veio/.test(r2.ordem));
prova('mesmo assim devolve as ferramentas e as fontes fixas', r2.ferramentas.length === nomes.length && r2.fontes_fixas.length >= 6);

console.log('\n' + '─'.repeat(60) + '\n✅ ' + ok + ' passaram · ❌ ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
