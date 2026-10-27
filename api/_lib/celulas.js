// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// AS CÉLULAS DA VOZ (25/10/2026, ideia do Elias): a voz pesquisadora organizada como células que cooperam —
// unidades pequenas, cada uma com responsabilidade, entradas, saídas, critério de qualidade e tratamento de
// falha, que entregam resultados umas às outras. É ANALOGIA DE ORGANIZAÇÃO: nada aqui tem consciência, vida
// ou aprendizagem. A maioria das células é regra e busca (este arquivo); só a Análise usa modelo (a Claude,
// no voz-claude.js). O mapa do app (public/biblioteca/voz) acende uma célula SÓ quando chega o evento real
// dela ({t:'cel', ...}); o texto dos livros nunca vai para o celular nesses eventos.
//
//   Escuta → Intenção → Contexto → (Memória) → Pesquisa → Análise → Verificação ⟲ Análise (1 correção) → Expressão
//   Coordenação: ids da conversa/tarefa, prazo, limite de correções, e para tudo quando o pastor interrompe.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

export const LIMITES = { correcoes: 1, versiculosAuto: 2 };

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const limpo = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// ── COORDENAÇÃO: identificadores e o emissor dos eventos reais ─────────────────────────────────────────
export function idsDaTarefa(conversa) {
  const c = /^[a-z0-9_-]{4,40}$/i.test(String(conversa || '')) ? String(conversa) : 'c_' + Math.random().toString(36).slice(2, 10);
  return { conversa: c, tarefa: 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
}
export function criarEmissor(mandar, ids) {
  const t0 = Date.now(), log = [];
  return {
    log,
    cel(cel, estado, extra = {}) {
      const ev = { t: 'cel', cel, estado, conversa: ids.conversa, tarefa: ids.tarefa, ms: Date.now() - t0, ...extra };
      if (ev.resumo) ev.resumo = limpo(ev.resumo, 220);
      log.push(ev);
      mandar(ev);
    },
  };
}

// ── ESCUTA: a fala chegou inteira? ─────────────────────────────────────────────────────────────────────
// O Chrome do Android às vezes devolve certeza 0 para tudo; por isso a certeza só pesa quando vem entre 0 e 1.
export function escutar(texto, confianca) {
  const t = String(texto || '').trim();
  const c = Number(confianca);
  if (t.length < 2) return { duvida: true, motivo: 'fala vazia ou curta demais' };
  if (c > 0 && c < 0.45) return { duvida: true, motivo: 'o reconhecedor teve pouca certeza (' + c.toFixed(2) + ')' };
  if (/^(\S+)(\s+\1){2,}$/i.test(t)) return { duvida: true, motivo: 'a mesma palavra repetida — pode ser eco' };
  return { duvida: false, motivo: 'fala recebida (' + t.length + ' letras)' };
}

// ── INTENÇÃO: conversa, pergunta, pesquisa ou material? (regras, sem IA) ─────────────────────────────────
export const PEDE_MATERIAL = /\b(ger|prepar|mont|fa[zç]|escrev|cri|elabor)\w*\b[\s\S]{0,40}\b(serm[aãoõ]|prega[cç]|esbo[cç]|mensage|estudo|aula)/i;
const LIVROS_BIBLIA = 'genesis|exodo|levitico|numeros|deuteronomio|josue|juizes|rute|samuel|reis|cronicas|esdras|neemias|ester|jo|salmos?|proverbios|eclesiastes|cantares|isaias|jeremias|lamentacoes|ezequiel|daniel|oseias|joel|amos|obadias|jonas|miqueias|naum|habacuque|sofonias|ageu|zacarias|malaquias|mateus|marcos|lucas|joao|atos|romanos|corintios|galatas|efesios|filipenses|colossenses|tessalonicenses|timoteo|tito|filemom|hebreus|tiago|pedro|judas|apocalipse';
const REF = new RegExp('\\b(?:[123]\\s*)?(' + LIVROS_BIBLIA + ')\\s+\\d{1,3}(?:\\s*[:.]\\s*\\d{1,3}(?:\\s*-\\s*\\d{1,3})?)?', 'i');
const PESQUISA = /\b(segundo|o que (diz|dizem|fala|falam|ensina)|fonte|fontes|comentaris|autor|autores|livro|biblioteca|grego|hebraico|aramaico|original|significa|significado|sentido|exegese|hermeneut|contexto historic|historia|doutrina|teolog|compar|diferen[cç]a entre|kittel|thayer|keil|edersheim|champlin|owens|wagner|strong|verbete|palavra .{0,20}(grega|hebraica)|interpreta)/;
const PAPO = /^(oi|ola|bom dia|boa (tarde|noite)|tudo bem|obrigad|valeu|amem|amém|tchau|ate (logo|mais)|beleza|ok|certo|entendi|isso mesmo|pode (parar|continuar)|para|chega)\b/;
export function intencao(texto) {
  const t = semAcento(texto).trim();
  if (PEDE_MATERIAL.test(String(texto || ''))) return { tipo: 'material', motivo: 'pediu sermão, mensagem, estudo ou esboço' };
  if (REF.test(t)) return { tipo: 'pesquisa', motivo: 'citou uma referência bíblica' };
  if (PESQUISA.test(t)) return { tipo: 'pesquisa', motivo: 'pergunta de fonte, palavra original ou interpretação' };
  if (PAPO.test(t) || (t.length < 30 && !/[?]|\b(o que|quem|qual|quando|onde|como|por que|porque)\b/.test(t))) return { tipo: 'papo', motivo: 'conversa curta, sem pergunta de fonte' };
  return { tipo: 'pergunta', motivo: 'pergunta direta; a Análise decide se precisa abrir livro' };
}
export function referenciasDe(texto) {
  const out = [], re = new RegExp(REF.source, 'gi'); let m;
  const t = semAcento(texto);
  while ((m = re.exec(t)) && out.length < LIMITES.versiculosAuto) if (/\d+\s*[:.]\s*\d+/.test(m[0])) out.push(m[0].replace(/\s*\.\s*/, ':'));
  return out;
}

// ── CONTEXTO: a fala depende da anterior? ("e o Kittel?", "isso", "esse autor") ────────────────────────────
const ANAFORA = /\b(ele|ela|eles|elas|isso|isto|esse|essa|esses|essas|aquele|aquela|nele|nela|disso|desse|dessa|daquele|o mesmo|a mesma|esse autor|essa palavra|esse texto|esse versiculo|continua|continue|mais sobre|fala mais|explica melhor)\b|^\s*e\s+(o|a|os|as|no|na|sobre|quanto|quem|qual|se)\b/;
export function contextualizar(texto, anterior, tipo) {
  const a = anterior && typeof anterior === 'object' ? anterior : {};
  const temaAnterior = limpo(a.tema, 160);
  const autores = Array.isArray(a.autores) ? a.autores.map((x) => limpo(x, 60)).filter(Boolean).slice(0, 6) : [];
  const t = String(texto || '').trim();
  const refere = ANAFORA.test(semAcento(t));
  if (refere && temaAnterior) {
    return { consulta: t + ' (assunto anterior: ' + temaAnterior + ')', usouAnterior: true, tema: temaAnterior, autoresAntes: autores,
      resumo: 'ligou a fala com o assunto anterior: ' + temaAnterior };
  }
  const tema = (tipo === 'papo') ? temaAnterior : limpo(t, 160);
  return { consulta: t, usouAnterior: false, tema, autoresAntes: autores,
    resumo: refere ? 'a fala parece depender da anterior, mas não há assunto guardado' : (tipo === 'papo' ? 'conversa, mantém o assunto' : 'assunto novo') };
}

// ── FONTE HISTÓRICA (27/10/2026): o jornal Mensageiro da Paz entrou com aprovado=false e ganhava o selo do Champlin,
// "COM FILTRO (só grego…)", que não tem nada a ver com jornal. O tipo 'historico' (do fonte.json) tem selo próprio.
export const SELO_HISTORICO = 'FONTE HISTÓRICA (jornal antigo da AD: use para história, testemunho e ilustração; '
  + 'nunca como autoridade de doutrina; pode conter texto de outras correntes)';
export const ehHistorico = (x) => !!x && x.tipo === 'historico';

// ── PESQUISA: etiqueta cada evidência ([E1], [E2]…) para a Análise citar e a Verificação conferir ─────────
export function rotular(trechos, inicio = 1) {
  return (trechos || []).map((x, i) => ({ id: 'E' + (inicio + i), autor: x.autor, obra: x.obra || '', onde: x.onde || '', selo: x.selo || '', texto: x.texto || '' }));
}
export function blocoDeEvidencias(evid, versiculos) {
  const partes = [];
  for (const v of versiculos || []) partes.push(`[BÍBLIA] ${v.referencia}: ${v.texto}`);
  for (const e of evid || []) partes.push(`[${e.id}] ${e.autor}${e.obra ? ' — ' + e.obra : ''}${e.onde ? ' — ' + e.onde : ''} (${e.selo})\n${e.texto}`);
  return partes.length
    ? 'EVIDÊNCIAS DESTA PERGUNTA (vindas da Pesquisa; uso interno, o pastor não vê o texto):\n\n' + partes.join('\n\n')
    : 'EVIDÊNCIAS DESTA PERGUNTA: a Pesquisa não achou nada na biblioteca. Se precisar de autor, diga que não encontrou.';
}

// ── VERIFICAÇÃO (sem IA): o rascunho tem apoio nas evidências que vieram DESTA vez? ─────────────────────
// Confere: (1) etiqueta [E#] que não existe; (2) autor da biblioteca citado sem etiqueta, com etiqueta de outro
// autor, ou que nem foi consultado; (3) citação entre aspas que não está em nenhum trecho nem versículo lido.
// Frase que diz "não encontrei / não consegui confirmar" pode citar o autor sem etiqueta (é honestidade).
export const AUTORES_DA_BIBLIOTECA = ['Kittel', 'Thayer', 'Keil', 'Delitzsch', 'Edersheim', 'Champlin', 'Owens', 'Waltke', 'Kidner',
  'Spurgeon', 'Matthew Henry', 'Moldenke', 'Wood', 'Duewel', 'Foster', 'Wiersbe', 'MacDonald', 'Hartley', 'Mesquita', 'Merkh',
  'Pink', 'Gill', 'Witness Lee', 'Kaung', 'Mouser', 'Broadman', 'Moody', 'Wolf', 'Wagner', 'EETAD'];
const NEGA = /\b(nao|sem)\s+(encontrei|achei|tenho|consegui|localizei|confirmei|confirmar|encontra|aparece|fonte|evidencia|apoio)/;
const ETQ = /\[(E\d+(?:\s*[,;]\s*E?\d+)*)\]/g;
const idsDaEtiqueta = (m) => m.split(/[,;]/).map((x) => 'E' + x.replace(/\D/g, ''));
const chaveAutor = (nome) => semAcento(nome).split(/[^a-z]+/).filter((p) => p.length >= 4);

// autoresAntes: autores citados e CONFERIDOS na fala anterior (vêm do Contexto). Mencioná-los de novo sem etiqueta
// não é problema (o pastor pode perguntar "e o Thayer?"); etiqueta apontando para outro autor continua sendo.
export function verificar(rascunho, evid, versiculos, autoresAntes) {
  const texto = String(rascunho || '');
  const antes = (autoresAntes || []).map((a) => chaveAutor(a)).flat();
  const porId = new Map((evid || []).map((e) => [e.id, e]));
  const problemas = [], citadas = new Set();
  // (1) etiquetas
  for (const m of texto.matchAll(ETQ)) for (const id of idsDaEtiqueta(m[1])) {
    if (porId.has(id)) citadas.add(id); else problemas.push({ tipo: 'etiqueta_inexistente', resumo: `a etiqueta [${id}] não corresponde a nenhuma evidência desta pergunta` });
  }
  // (2) autores, frase por frase
  const frases = texto.split(/(?<=[.!?…])\s+/);
  const consultados = (evid || []).map((e) => chaveAutor(e.autor));
  for (const f of frases) {
    const fs = semAcento(f);
    if (NEGA.test(fs)) continue;
    const ids = [...f.matchAll(ETQ)].flatMap((m) => idsDaEtiqueta(m[1])).filter((id) => porId.has(id));
    for (const nome of AUTORES_DA_BIBLIOTECA) {
      const k = chaveAutor(nome)[0] || semAcento(nome);
      if (!new RegExp('\\b' + k + '\\b').test(fs)) continue;
      const foiConsultado = consultados.some((ps) => ps.includes(k));
      if (antes.includes(k) && !ids.length) continue;
      if (!foiConsultado) { problemas.push({ tipo: 'autor_nao_consultado', autor: nome, resumo: `atribuiu algo a ${nome}, mas ${nome} não veio na pesquisa desta pergunta` }); continue; }
      // 26/10/2026 (medido): exigir a etiqueta na MESMA frase reprovava a frase de abertura ("o Kittel faz a história da
      // palavra") mesmo com os trechos dele etiquetados logo depois. Regra justa: o autor precisa ter ALGUM trecho dele
      // etiquetado na resposta; e a frase não pode carregar só etiquetas de outro autor.
      const temNaResposta = [...citadas].some((id) => chaveAutor(porId.get(id).autor).includes(k));
      if (!ids.length) { if (!temNaResposta) problemas.push({ tipo: 'autor_sem_etiqueta', autor: nome, resumo: `citou ${nome} sem apontar nenhum trecho dele` }); continue; }
      if (!ids.some((id) => chaveAutor(porId.get(id).autor).includes(k))) problemas.push({ tipo: 'etiqueta_de_outro_autor', autor: nome, resumo: `a etiqueta junto de ${nome} aponta para outro autor` });
    }
  }
  // (3) citações entre aspas (a partir de 3 palavras)
  const fontesDeTexto = [...(evid || []).map((e) => e.texto), ...(versiculos || []).map((v) => v.texto)].map((x) => semAcento(x).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' '));
  for (const m of texto.matchAll(/[“"«]([^”"»]{8,400})[”"»]/g)) {
    const q = semAcento(m[1]).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (q.split(' ').length < 3) continue;
    if (!fontesDeTexto.some((ft) => ft.includes(q))) problemas.push({ tipo: 'citacao_sem_fonte', resumo: `a citação "${m[1].slice(0, 60)}" não aparece em nenhum trecho nem versículo lido` });
  }
  // sem duplicar o mesmo problema
  const vistos = new Set(), unicos = problemas.filter((p) => { const k = p.tipo + '|' + (p.autor || p.resumo); if (vistos.has(k)) return false; vistos.add(k); return true; });
  return { ok: unicos.length === 0, problemas: unicos.slice(0, 8), citadas: [...citadas] };
}

export function pedidoDeCorrecao(problemas) {
  return 'A VERIFICAÇÃO conferiu o seu rascunho contra as evidências desta pergunta e achou pontos sem apoio:\n'
    + problemas.map((p, i) => `${i + 1}. ${p.resumo}`).join('\n')
    + '\n\nReescreva a resposta inteira, curta e falada, só com o que as evidências sustentam: ponha a etiqueta [E#] certa junto de cada autor, '
    + 'tire o que não tem apoio, ou diga claramente "isso eu não consegui confirmar nas fontes". Pode chamar buscar_biblioteca UMA vez se faltar trecho. '
    + 'Não comente esta conferência com o pastor.';
}
export function ressalva(problemas) {
  const autores = [...new Set(problemas.map((p) => p.autor).filter(Boolean))];
  if (autores.length) return 'Uma observação: o que eu disse sobre ' + autores.join(' e ') + ' eu não consegui confirmar nas fontes desta vez.';
  return 'Uma observação: parte do que eu disse não consegui confirmar nas fontes desta vez.';
}

// ── EXPRESSÃO: etiquetas não são lidas em voz alta; na tela viram [1], [2]… ────────────────────────────────
export const semEtiquetas = (t) => String(t || '').replace(/\s?\[E\d+(?:\s*[,;]\s*E?\d+)*\]/g, '');
export const etiquetasNaTela = (t) => String(t || '').replace(ETQ, (m, g) => '[' + idsDaEtiqueta(g).map((x) => x.slice(1)).join(', ') + ']');

export const REGRAS_DAS_CELULAS = `
COMO RESPONDER COM AS CÉLULAS LIGADAS (pesquisa com verificação):
- As EVIDÊNCIAS desta pergunta vêm etiquetadas [E1], [E2]… Toda vez que disser o que um autor afirma, ponha a etiqueta do trecho logo depois, ex.: "o Kittel mostra que… [E2]". As etiquetas não são lidas em voz alta.
- Separe com palavras simples: o que a Bíblia diz (só com o versículo lido), o que cada autor afirma (com etiqueta), a sua síntese ("eu entendo que…") e o que não deu para confirmar ("isso eu não encontrei nas fontes").
- Nunca cite autor, página ou frase que não esteja nas evidências desta vez. Se as evidências discordarem, diga quem diz o quê.
- Citação entre aspas só se as palavras estiverem no trecho ou no versículo lido; no máximo seis palavras de um livro.
- Uma conferência automática (a Verificação) lê o seu rascunho antes de ele ser falado.`;
