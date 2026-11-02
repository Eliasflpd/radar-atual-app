// BEREIA — o ajudante de pregação do RADAR (01/11/2026, pedido do Elias: "esse Bereia será o que me ajudará a criar
// minhas pregações quando você não tá por perto"). O nome vem de At 17:11: os de Bereia "examinavam cada dia nas
// Escrituras se estas coisas eram assim". É um módulo NOVO: não substitui o Preparador, o Concílio nem a Escola.
//
// O caminho de uma pregação (tudo em streaming, linha a linha em JSON, para a tela mostrar cada etapa na hora):
//   1. PLANO      — uma IA rápida lê o pedido e devolve: os textos bíblicos, 3-4 pesquisas e o assunto da notícia.
//   2. BIBLIOTECA — cada pesquisa vai à busca da Biblioteca (servidor-a-servidor, com o token). Lá dentro a
//                   JOEIRA (o reordenador, api/_lib/biblioteca.js) escolhe os trechos certeiros. A tela recebe só
//                   NOMES de autor e obra — o texto dos livros comprados nunca sai daqui ("pesquisar e citar pode;
//                   distribuir não").
//   3. NOTÍCIAS   — as manchetes do motor de notícias fiéis (/api/noticias-fieis); a IA só usa uma se servir de
//                   ilustração honesta, citando o veículo e a data.
//   4. PREGAÇÃO   — a Claude (degrau premium) escreve no estilo do Elias. A Bíblia NUNCA é digitada pela IA:
//                   ela escreve {{Gn 40:14}} e o servidor troca pelo texto da Almeida (public/biblia.json).
//   5. CONFERÊNCIA — referência inexistente, "Igreja," no começo, falta de âmago e pergunta binária viram avisos.
// Porta: só abre para quem já entra nos livros particulares (crachá do aparelho do Elias ou o PIN dele) — cada
// pregação gasta várias chamadas pagas de IA e o repositório é público.
import { iaTexto, iaStreamTexto } from './ia.js';
import { carregarBiblia, acharReferencias, textoDoVersiculo, LIVRO_NOME } from './concilio.js';
import { ehHistorico } from './celulas.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

async function liberado(origem, cracha, token) {
  try {
    const r = await fetch(origem + '/api/livro-particular', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cracha: cracha || '', token: token || '' }) });
    const d = await r.json().catch(() => ({}));
    return !!(r.ok && d && d.ok);
  } catch (_) { return false; }
}

// ── 1. O PLANO ───────────────────────────────────────────────────────────────
const SYS_PLANO = `Você planeja a pesquisa de uma pregação evangélica pentecostal (Assembleia de Deus).
Devolva SÓ um JSON, sem nada antes ou depois:
{"titulo":"título forte, curto, sem clichê","refs":["Gn 40:14","Sl 105:17-19"],"buscas":["...","...","..."],"noticia":"palavras-chave curtas ou vazio"}
- refs: 4 a 10 referências bíblicas REAIS e certeiras para o tema (formato "Livro cap:vers" ou "Livro cap:v1-v2", siglas como Gn, Ex, 1Sm, Sl, Pv, Is, Mt, Jo, Rm, Hb, Ap).
- buscas: 3 ou 4 perguntas em português natural para uma biblioteca de comentários, dicionários, história e aulas. Cada uma sobre um ângulo diferente: o texto em si, palavra no original, contexto histórico, aplicação. NÃO ponha nome de autor nem de livro de comentário na pergunta (só o assunto e a referência bíblica).
- noticia: palavras-chave de um assunto atual que poderia ilustrar o tema, em português E em inglês (ex.: "perseguição cristãos persecution christians", "Israel Jerusalém Jerusalem"), ou "" se não couber.`;

function planoReserva(pedido) {
  const refs = acharReferencias(pedido).slice(0, 8).map((r) => r.bruto);
  return { titulo: '', refs, buscas: [pedido.slice(0, 300)], noticia: '' };
}
async function planejar(pedido) {
  try {
    const r = await iaTexto({ sys: SYS_PLANO, user: pedido, temperature: 0.3, max_tokens: 700, tag: 'bereia-plano' });
    const j = JSON.parse(String(r.texto || '').replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1'));
    const p = {
      titulo: String(j.titulo || '').slice(0, 120),
      refs: (Array.isArray(j.refs) ? j.refs : []).map(String).slice(0, 12),
      buscas: (Array.isArray(j.buscas) ? j.buscas : []).map(String).filter(Boolean).slice(0, 4),
      noticia: String(j.noticia || '').slice(0, 80),
    };
    if (!p.buscas.length) p.buscas = [pedido.slice(0, 300)];
    return p;
  } catch (_) { return planoReserva(pedido); }
}

// ── 2. A BIBLIOTECA (com a Joeira lá dentro) ─────────────────────────────────
async function pesquisar(origem, q) {
  const tk = process.env.RADAR_ADMIN_TOKEN || '';
  if (!tk) return [];
  try {
    const r = await fetch(origem + '/api/dados?fn=biblioteca', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: String(q).slice(0, 400), n: 5, token: tk }), signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    return ((d && d.ok && d.itens) || []).filter((x) => x && x.texto);
  } catch (_) { return []; }
}
async function bibliotecaToda(origem, buscas) {
  const listas = await Promise.all(buscas.map((q) => pesquisar(origem, q)));
  // intercala: o 1º de cada pesquisa, depois o 2º de cada… — cada ângulo do plano ganha voz
  const vistos = new Set(), out = [];
  for (let i = 0; i < 5; i++) for (const l of listas) {
    const x = l[i]; if (!x) continue;
    const k = x.autor + '|' + x.texto.slice(0, 60);
    if (vistos.has(k)) continue;
    vistos.add(k); out.push(x);
  }
  return out.slice(0, 10);
}
const selo = (x) => ehHistorico(x) ? 'fonte histórica (jornal antigo): só ilustração, nunca doutrina'
  : x.autor === 'Flávio Josefo' ? 'historiador judeu do séc. I: diga "segundo Josefo"'
  : /rashi|midrash|rabbah/i.test(x.autor + ' ' + (x.obra || '')) ? 'TRADIÇÃO JUDAICA, não Escritura: diga de onde vem'
  : x.peso === 2 ? 'fonte primária (sentido da palavra no original)'
  : x.aprovado === false ? 'com filtro: só grego e estudo de palavra, nunca ponto disputado'
  : 'autor aprovado';

// ── 3. AS NOTÍCIAS FIÉIS ─────────────────────────────────────────────────────
async function noticias(origem, assunto) {
  if (!assunto) return [];
  try {
    const r = await fetch(origem + '/api/noticias-fieis', { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    const todas = ((d && d.secoes) || []).flatMap((x) => x.itens || []);
    const chaves = String(assunto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\W+/).filter((p) => p.length > 3);
    const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return todas.filter((n) => chaves.some((c) => sem((n.titulo || '') + ' ' + (n.resumo || '')).includes(c))).slice(0, 5);
  } catch (_) { return []; }
}

// ── 4. A PREGAÇÃO ─────────────────────────────────────────────────────────────
const SYS_PREGACAO = `Você é o BEREIA, o ajudante de pregação do pastor Elias (Assembleia de Deus, Cong. Monte Carmelo).
Escreve uma pregação COMPLETA, em prosa que prende, para cristãos com fome e sede da Palavra — nada raso, nada vazio, nada de autoajuda.

REGRAS DO PASTOR (obrigatórias):
1. NUNCA comece com "Igreja,". A primeira linha é uma frase de impacto com um FATO CONCRETO e verificável (cena, lugar, data, nome) que prende quem ouve.
2. Quando um lugar ou fato do mundo entrar, diga ONDE fica e cite nomes reais.
3. Tem que ter ÂMAGO: uma tese central, curta e forte, afirmada e repetida no fim.
4. PROIBIDO pergunta binária batida ("em qual das duas você está?", "você é X ou Y?"). Afirme em vez de perguntar.
5. Nunca use um versículo que puxe contra a tese.
6. Doutrina pentecostal clássica, sem teologia da prosperidade.

A BÍBLIA: você NUNCA digita o texto de um versículo. Escreva a referência entre chaves duplas — {{Gn 40:14}} ou {{Sl 105:17-19}} — e o servidor põe o texto da Almeida. Use as referências do PLANO e outras que conheça com certeza. Pode citar sem chaves só a referência entre parênteses, ex.: (Gn 37:2).

AS FONTES: use as fontes da biblioteca pelo NOME do autor ("Keil e Delitzsch observam…", "segundo Josefo…"), com as suas próprias palavras — nunca mais de seis palavras seguidas de um autor. Obedeça o selo de cada fonte. Tradição judaica (Midrash, Rashi, lendas) é dita como tradição, nunca como Bíblia. Notícia só entra se ilustrar com honestidade, citando o veículo e a data.
FATOS: só afirme o que é certo. Imagem de pregação ("imagine…") é dita como imagem. Tudo o que não for Bíblia nem fonte da biblioteca vai listado nas notas para conferir.

FORMATO (Markdown, exatamente nesta ordem):
# Título
*referências principais*
> frase de abertura (o fato concreto)
2-3 parágrafos de abertura em cena
> **ÂMAGO:** a tese central
## 1. … (4 a 5 partes com título, cada uma com 2-4 parágrafos e as referências {{…}})
## 🔥 (título de clamor)
- 4 linhas curtas para a igreja repetir
parágrafo de apelo (salvação, quebrantamento, compromisso)
## 📝 Notas para quem vai pregar
- **Fontes consultadas:** autores e obras usados
- **Fatos para conferir:** cada fato que não é Bíblia nem biblioteca
- **Tempo:** estimativa`;

function montarPedido(pedido, plano, fontes, notas, versos) {
  const p = [`PEDIDO DO PASTOR:\n${pedido}`];
  if (plano.titulo) p.push(`TÍTULO SUGERIDO: ${plano.titulo}`);
  if (versos.length) p.push('VERSÍCULOS DO PLANO (texto da Almeida, só para você entender; no texto use {{ref}}):\n'
    + versos.map((v) => `${v.ref}: ${v.texto}`).join('\n'));
  if (fontes.length) p.push('FONTES DA BIBLIOTECA (material privado: use o sentido, cite o autor, não copie):\n'
    + fontes.map((x, i) => `■ [${i + 1}] ${x.autor}${x.obra ? ' — ' + x.obra : ''}${x.secao ? ' (' + x.secao + ')' : ''} [${selo(x)}]\n${String(x.texto).slice(0, 1200)}`).join('\n\n'));
  if (notas.length) p.push('NOTÍCIAS DE FONTES FIÉIS (use no máximo uma, se ilustrar com honestidade):\n'
    + notas.map((n) => `- ${n.titulo} (${n.fonte || n.veiculo || ''}, ${n.data || ''})`).join('\n'));
  return p.join('\n\n');
}

function referenciaEmTexto(biblia, bruto) {
  const r = acharReferencias(' ' + bruto)[0];
  if (!r) return null;
  const t = textoDoVersiculo(biblia, r);
  if (!t) return null;
  const nome = LIVRO_NOME[r.abbrev] || r.abbrev;
  return `“${t}” (${nome} ${r.cap}:${r.v1}${r.v2 && r.v2 !== r.v1 ? '-' + r.v2 : ''})`;
}

// ── 5. A CONFERÊNCIA ─────────────────────────────────────────────────────────
function conferir(texto, refsRuins) {
  const avisos = [];
  const corpo = texto.replace(/^#.*$/m, '').replace(/^\*.*\*$/m, '').trim();
  if (/^>?\s*\**\s*igreja\s*,/i.test(corpo)) avisos.push('Começa com "Igreja," — troque por um fato concreto.');
  if (!/ÂMAGO/i.test(texto)) avisos.push('Não achei o âmago marcado.');
  const binarias = texto.match(/[^.!?\n]*\b(ou|qual das duas|qual dos dois)\b[^.!?\n]*\?/gi) || [];
  for (const b of binarias.slice(0, 2)) if (/\bvocê\b|\bvoce\b|\bqual\b/i.test(b)) avisos.push('Possível pergunta binária: "' + b.trim().slice(0, 120) + '"');
  for (const r of refsRuins) avisos.push('Referência que não existe na Almeida: ' + r + ' (ficou só a referência, sem texto).');
  return avisos;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('{"ok":false}', { status: 405, headers: CORS });
  const origem = new URL(req.url).origin;
  let b = {};
  try { b = await req.json(); } catch (_) { b = {}; }
  const pedido = [b.texto && `Texto bíblico: ${b.texto}`, b.tema && `Tema: ${b.tema}`, b.ideia && `Ideia / ângulo: ${b.ideia}`,
    b.tipo && `Ocasião: ${b.tipo}`].filter(Boolean).join('\n').slice(0, 1500);
  if (!pedido) return new Response(JSON.stringify({ ok: false, err: 'Escreva o texto bíblico ou o tema.' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (!(await liberado(origem, b.cracha, b.token))) {
    return new Response(JSON.stringify({ ok: false, motivo: 'particular' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const manda = (o) => w.write(enc.encode(JSON.stringify(o) + '\n'));

  (async () => {
    try {
      await manda({ t: 'etapa', id: 'plano', msg: 'Lendo o pedido e planejando a pesquisa…' });
      const [plano, biblia] = await Promise.all([planejar(pedido), carregarBiblia(origem)]);
      const versos = [];
      for (const ref of plano.refs) {
        const r = acharReferencias(' ' + ref)[0];
        const t = r && biblia && textoDoVersiculo(biblia, r);
        if (t) versos.push({ ref: ref.trim(), texto: t });
      }
      await manda({ t: 'plano', titulo: plano.titulo, refs: versos.map((v) => v.ref), buscas: plano.buscas });

      await manda({ t: 'etapa', id: 'biblioteca', msg: 'Bereia examinando a Biblioteca · Joeira separando o trigo da palha…' });
      const [fontes, notas] = await Promise.all([bibliotecaToda(origem, plano.buscas), noticias(origem, plano.noticia)]);
      await manda({ t: 'joeira', fontes: fontes.map((x) => ({ autor: x.autor, onde: x.secao || x.livro || '', obra: x.obra || '' })) });
      if (plano.noticia) await manda({ t: 'noticias', itens: notas.map((n) => ({ titulo: n.titulo, fonte: n.fonte || n.veiculo || '', data: n.data || '', link: n.link || '' })) });

      await manda({ t: 'etapa', id: 'escrita', msg: 'Escrevendo a pregação…' });
      const r = await iaStreamTexto({ sys: SYS_PREGACAO, user: montarPedido(pedido, plano, fontes, notas, versos),
        temperature: 0.8, max_tokens: 14000, tag: 'bereia', premium: true });
      await manda({ t: 'ia', modelo: r.modelo || '', provedor: r.provedorNome || r.provedor || '' });
      const reader = r.stream.getReader(), dec = new TextDecoder();
      let buf = '', tudo = '';
      const refsRuins = [];
      const solta = async (s) => { if (s) { tudo += s; await manda({ t: 'txt', d: s }); } };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // troca {{ref}} pelo texto da Almeida; segura o pedaço que pode ser um {{ partido no meio
        let out = '';
        for (;;) {
          const i = buf.indexOf('{{');
          if (i < 0) { const k = buf.endsWith('{') ? buf.length - 1 : buf.length; out += buf.slice(0, k); buf = buf.slice(k); break; }
          const f = buf.indexOf('}}', i);
          if (f < 0) { out += buf.slice(0, i); buf = buf.slice(i); if (buf.length > 60) { out += buf; buf = ''; } break; }
          const bruto = buf.slice(i + 2, f).trim();
          const t = biblia ? referenciaEmTexto(biblia, bruto) : null;
          if (!t) refsRuins.push(bruto);
          out += buf.slice(0, i) + (t || '(' + bruto + ')');
          buf = buf.slice(f + 2);
        }
        await solta(out);
      }
      await solta(buf);
      await manda({ t: 'fim', avisos: conferir(tudo, refsRuins) });
    } catch (e) {
      await manda({ t: 'erro', msg: String((e && e.message) || e).slice(0, 200) });
    }
    try { await w.close(); } catch (_) {}
  })();

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
