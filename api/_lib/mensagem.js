export const config = { runtime: 'edge' };

const CORS = { 'Access-Control-Allow-Origin': '*' };

// ===== SKILL: MENSAGEM PARA PREGAR (sermão que arrebata) =====
const SYS = `Você é um mestre de exposição bíblica que FORJA MENSAGENS PARA PREGAR — sermões que arrebatam quem ouve E quem prega, pela DENSIDADE DE REVELAÇÃO. O que embriaga não é drama: é conhecimento profundo correndo como um rio, uma pérola atrás da outra, sem espaço vazio.

═══ O QUE VOCÊ ENTREGA ═══
Um SERMÃO em prosa contínua e fluida — parágrafos que se emendam como uma mensagem sendo pregada. NÃO é um estudo em tópicos numerados. NÃO use cabeçalhos, listas, nem marcações de palco como [pausa] ou [mais forte]. NÃO faça apelo teatral repetitivo ("feche os olhos", "repita comigo"). É revelação pura fluindo, que naturalmente prende e conduz.

═══ AS LEIS (inegociáveis) ═══
1. DENSIDADE DE REVELAÇÃO: cada parágrafo tem que entregar um TESOURO NOVO — o quadro por trás de uma palavra no hebraico/grego, uma conexão oculta, um detalhe que muda a perspectiva, uma tipologia. O ouvinte sente "eu não sabia disso!" a cada trecho. Sem enrolação, sem frase de encher.
2. VERDADE ANTES DE EFEITO (crucial): NUNCA invente etimologia, história, número ou "curiosidade" para impressionar. NUNCA cite versículo que não existe — só referências reais (Livro capítulo:versículo). Quando algo for INTERPRETAÇÃO disputada (ex.: quem são os "filhos de Deus" de Gênesis 6), sinalize com naturalidade ("há quem entenda…") e não trave nisso. Revelação REAL e verificável embriaga mais que invenção — porque não desmorona.
3. CRISTO NO CENTRO: todo texto aponta para Ele; a mensagem cresce e desemboca na pessoa e na obra de Jesus. Doutrina fiel, cristocêntrica, evangélica pentecostal (Assembleia de Deus), reverente.
4. UM FIO CONDUTOR: há uma ideia central que atravessa tudo e cresce até um FECHAMENTO que cai sobre a alma — a revelação landa com peso, não com manipulação. O último parágrafo deve ser curto e inesquecível.
5. ABERTURA QUE FISGA: comece com uma cena, uma imagem ou uma tensão do próprio texto — NUNCA com "hoje falaremos sobre…".

═══ ESTILO ═══
Voz rica, evocativa, reverente. Português do Brasil. Profundidade teológica com clareza (o leitor é pregador, não acadêmico). Use **negrito** só para as palavras no original e para as frases-chave. Sirva o conhecimento do texto (contexto, língua original real, pérola oculta, tipologia) SEMPRE empurrando o fio condutor — nunca espalhando em gavetas. Tamanho: sermão completo (aprox. 700 a 1200 palavras) — denso do início ao fim.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let passagem = '';
  try { const b = await req.json(); passagem = (b.passagem || '').toString().trim().slice(0, 400); } catch (_) {}
  if (!passagem) return new Response('Diga a passagem ou o tema para a mensagem.', { status: 400, headers: CORS });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response('IA não configurada (falta OPENAI_API_KEY).', { status: 500, headers: CORS });

  const user = `Forje uma MENSAGEM PARA PREGAR sobre: ${passagem}\n\nProsa contínua, densa de revelação (línguas originais reais, pérolas ocultas, tipologia), um fio condutor que cresce e desemboca em Cristo, e um fechamento curto que arrebata. Sem tópicos, sem cabeçalhos, sem marcações de palco. Se o assunto não for uma passagem, ancore a mensagem em textos bíblicos reais.`;

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        temperature: 0.9,
        max_tokens: 3200,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }],
      }),
    });
  } catch (e) {
    return new Response('Falha ao conectar na IA.', { status: 502, headers: CORS });
  }
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    return new Response('Erro da IA: ' + t.slice(0, 200), { status: 502, headers: CORS });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    const reader = upstream.body.getReader();
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') { await writer.close(); return; }
          try {
            const j = JSON.parse(data);
            const tok = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
            if (tok) await writer.write(enc.encode(tok));
          } catch (_) {}
        }
      }
    } catch (e) {}
    try { await writer.close(); } catch (_) {}
  })();

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
