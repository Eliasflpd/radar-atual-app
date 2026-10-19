// Prova do ESTUDIOSO (pensar_a_fundo) e do CADERNO DE APRENDIZADO (guardar_ensino, ensinos_do_pastor, lacunas).
// Sem banco e sem rede: o fetch é simulado. Roda com:  node scripts/_provar-aprendizado.mjs
import { FERRAMENTAS, REGRA_DE_OURO, executarFerramenta, registrarLacuna, blocoDosEnsinos, refsDaPergunta }
  from '../api/_lib/voz-ferramentas.js';

let ok = 0, falhou = 0;
const prova = (nome, cond, detalhe) => { if (cond) { ok++; console.log('  ✅ ' + nome + (detalhe ? ' — ' + detalhe : '')); } else { falhou++; console.log('  ❌ ' + nome + (detalhe ? ' — ' + detalhe : '')); } };

process.env.RADAR_ADMIN_TOKEN = 'token-de-teste';
process.env.ANTHROPIC_API_KEY = 'chave-falsa-de-teste';
for (const k of Object.keys(process.env)) if (/^(GROQ|GEMINI|GOOGLE|OPENROUTER|CEREBRAS|MISTRAL|ZAI|DEEPSEEK|CF_|SAMBANOVA|TOGETHER|NVIDIA|HF_)/.test(k)) delete process.env[k];

const nomes = FERRAMENTAS[0].functionDeclarations.map((d) => d.name);
console.log('▸ declaração');
for (const n of ['pensar_a_fundo', 'guardar_ensino', 'ensinos_do_pastor']) prova(n + ' está declarada', nomes.includes(n));
const faltam = nomes.filter((n) => !REGRA_DE_OURO.includes(n));
prova('toda ferramenta declarada aparece na REGRA_DE_OURO', faltam.length === 0, faltam.join(', ') || nomes.length + ' ferramentas');
prova('a regra manda dizer "deixa eu pensar" e guardar correção', /deixa eu pensar/.test(REGRA_DE_OURO) && /guardar_ensino \(tipo correcao\)/.test(REGRA_DE_OURO));

console.log('▸ referências dentro da pergunta');
const refs = refsDaPergunta('como Romanos 9:13 se concilia com Malaquias 1:2-3 e o capítulo 3 de nada');
prova('acha as duas referências e ignora "capítulo 3"', refs.length === 2 && /Romanos 9:13/.test(refs[0]) && /Malaquias 1:2-3/.test(refs[1]), JSON.stringify(refs));

// ── o mundo simulado ─────────────────────────────────────────────────────────
const BIBLIA = [{ abbrev: 'rm', chapters: Array.from({ length: 16 }, (_, c) => Array.from({ length: 40 }, (_, v) => `Romanos ${c + 1}:${v + 1} TEXTO`)) },
  { abbrev: 'ml', chapters: Array.from({ length: 4 }, (_, c) => Array.from({ length: 20 }, (_, v) => `Malaquias ${c + 1}:${v + 1} TEXTO`)) }];
const chamadas = [];
let promptDaClaude = '', claudeResponde = 'Romanos 9:13 cita Malaquias; Keil e Delitzsch observam que amar e aborrecer ali é eleição para a missão. PARECER-OK';
let claudeDemora = 0;
globalThis.fetch = async (url, init) => {
  const u = String(url); const corpo = init && init.body ? JSON.parse(init.body) : {};
  chamadas.push({ u, corpo });
  if (u.endsWith('/biblia.json')) return { ok: true, text: async () => JSON.stringify(BIBLIA) };
  if (u.includes('fn=biblioteca')) return { ok: true, json: async () => ({ ok: true, itens: [
    { autor: 'Keil & Delitzsch', obra: 'Comentário AT', livro: 'Malaquias', secao: 'Malaquias 1', texto: 'LIVRO-SECRETO-A', peso: 3, aprovado: true, score: 0.62 },
    { autor: 'Fraco', obra: 'X', secao: 'X', texto: 'LIVRO-SECRETO-FRACO', peso: 3, aprovado: true, score: 0.2 }] }) };
  if (u.includes('fn=aprendizado')) {
    if (corpo.token !== 'token-de-teste') return { ok: true, json: async () => ({ ok: false, err: 'token' }) };
    if (corpo.acao === 'buscar' || corpo.acao === 'ler') return { ok: true, json: async () => ({ ok: true, itens: corpo.user === 'dono-provado'
      ? [{ id: 1, tipo: 'correcao', assunto: 'Esaú e Jacó em Malaquias', conteudo: 'aborrecer aqui é amar menos, linguagem hebraica de preferência', vezes: 1 }] : [] }) };
    return { ok: true, json: async () => ({ ok: true, gravado: true, apagados: 1, assuntos: ['x'] }) };
  }
  if (u.includes('api.anthropic.com')) {
    promptDaClaude = (corpo.messages || []).map((m) => m.content).join('\n');
    if (claudeDemora) await new Promise((r) => setTimeout(r, claudeDemora));
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: claudeResponde }] }) };
  }
  return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
};

console.log('▸ pensar_a_fundo com dono provado');
let r = await executarFerramenta('pensar_a_fundo', { pergunta: 'como Romanos 9:13 se concilia com Malaquias 1:2-3' }, 'http://x', { user: 'dono-provado' });
prova('devolve parecer da Claude', r.achou === true && /PARECER-OK/.test(r.parecer), r.cerebro);
prova('o prompt levou o TEXTO BÍBLICO exato das duas referências', /Romanos 9:13 TEXTO/.test(promptDaClaude) && /Malaquias 1:2 TEXTO/.test(promptDaClaude));
prova('o prompt levou a CORREÇÃO do pastor', /aborrecer aqui é amar menos/.test(promptDaClaude));
prova('o prompt levou o livro acima do corte e deixou o fraco de fora', /LIVRO-SECRETO-A/.test(promptDaClaude) && !/LIVRO-SECRETO-FRACO/.test(promptDaClaude));
prova('o texto do livro NÃO volta pro globo (só nomes)', !JSON.stringify(r).includes('LIVRO-SECRETO'), JSON.stringify(r.fontes));
prova('avisa que usou correção do pastor', r.usou_correcoes_do_pastor === 1);

console.log('▸ pensar_a_fundo sem dono provado');
chamadas.length = 0;
r = await executarFerramenta('pensar_a_fundo', { pergunta: 'como Romanos 9:13 se concilia com Malaquias 1:2-3' }, 'http://x', { user: '' });
prova('não lê caderno de ninguém', !chamadas.some((c) => c.u.includes('fn=aprendizado')) && r.achou === true);

console.log('▸ NAO SUSTENTA e demora');
claudeResponde = 'NAO SUSTENTA — o material não fala disso.';
r = await executarFerramenta('pensar_a_fundo', { pergunta: 'qual era a cor do cabelo de Abraão' }, 'http://x', {});
prova('NAO SUSTENTA vira achou:false', r.achou === false && !r.demorou);

console.log('▸ guardar_ensino');
chamadas.length = 0;
r = await executarFerramenta('guardar_ensino', { tipo: 'correcao', assunto: 'escada de Jacó', conteudo: 'a escada aponta para Cristo, João 1:51' }, 'http://x', { user: 'dono-provado' });
const grav = chamadas.find((c) => c.u.includes('fn=aprendizado'));
prova('grava com dono, tipo e token', r.guardado === true && grav && grav.corpo.user === 'dono-provado' && grav.corpo.tipo === 'correcao' && grav.corpo.acao === 'ensinar');
r = await executarFerramenta('guardar_ensino', { tipo: 'ensino', assunto: 'x', conteudo: 'o irmão Marcos me contou em sigilo que...' }, 'http://x', { user: 'dono-provado' });
prova('segredo pastoral NÃO é guardado', r.guardado === false);
chamadas.length = 0;
r = await executarFerramenta('guardar_ensino', { tipo: 'correcao', assunto: 'x y z', conteudo: 'qualquer coisa de doutrina' }, 'http://x', { user: '' });
prova('sem dono provado não grava nada', r.guardado === false && !chamadas.some((c) => c.u.includes('fn=aprendizado')));

console.log('▸ ensinos_do_pastor');
r = await executarFerramenta('ensinos_do_pastor', {}, 'http://x', { user: 'dono-provado' });
prova('lê o caderno do dono', r.achou === true && r.ensinos.length === 1);
r = await executarFerramenta('ensinos_do_pastor', { assunto: 'Esaú', apagar: true }, 'http://x', { user: 'dono-provado' });
prova('apaga quando ele pede', r.apagados === 1);

console.log('▸ lacunas');
chamadas.length = 0;
await registrarLacuna('http://x', 'pesquisar_biblioteca', { pergunta: 'o costume do levirato em Rute' }, { achou: false });
let lac = chamadas.find((c) => c.u.includes('fn=aprendizado'));
prova('busca sem apoio vira lacuna', lac && lac.corpo.acao === 'lacuna' && /levirato/.test(lac.corpo.assunto) && !lac.corpo.user);
chamadas.length = 0;
await registrarLacuna('http://x', 'pesquisar_biblioteca', { pergunta: 'x' }, { achou: true });
await registrarLacuna('http://x', 'ler_versiculo', { ref: 'Rute 1:1' }, { achou: false });
await registrarLacuna('http://x', 'pensar_a_fundo', { pergunta: 'assunto longo qualquer' }, { achou: false, demorou: true });
await registrarLacuna('http://x', 'pesquisar_biblioteca', { pergunta: 'o irmão Pedro me confessou em sigilo' }, { achou: false });
prova('não anota: achou, ferramenta que não é busca, demora, nem segredo', !chamadas.some((c) => c.u.includes('fn=aprendizado')));

console.log('▸ bloco do prompt');
const bloco = await blocoDosEnsinos('http://x', 'dono-provado');
prova('monta o bloco com a correção', /JÁ TE CORRIGIU/.test(bloco) && /CORREÇÃO/.test(bloco) && /amar menos/.test(bloco));
prova('sem dono, bloco vazio', (await blocoDosEnsinos('http://x', '')) === '');

console.log('\n' + '─'.repeat(60) + '\n✅ ' + ok + ' passaram · ❌ ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
