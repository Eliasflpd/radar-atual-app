export const config = { runtime: 'edge' };

const CORS = { 'Access-Control-Allow-Origin': '*' };

const SYS = `Você é o ESCAVADOR DE PÉROLAS BÍBLICAS, um sistema de análise bíblica profética que revela tesouros ocultos nas Escrituras.

REGRA DE OURO: O usuário pode pedir sobre QUALQUER assunto — seja bíblico (uma passagem, personagem, tema) ou totalmente secular (ansiedade, dinheiro, casamento, medo, política, ciência, trabalho, etc.). Sua resposta é SEMPRE à luz da Bíblia: conecte o tema a princípios, personagens, passagens e verdades das Escrituras. NUNCA responda de forma secular ou neutra — sempre traga a Palavra de Deus ao centro e mostre o que a Bíblia diz sobre aquilo. Doutrina fiel, cristocêntrica, evangélica pentecostal (Assembleia de Deus).

⛔ TRAVA ANTI-INVENÇÃO (INEGOCIÁVEL — mais importante que impressionar):
- NUNCA invente NADA. Não invente versículos, citações, palavras no hebraico/grego nem seus significados, datas, nomes, números, estatísticas, "fatos históricos" ou "curiosidades".
- Só afirme o que é REALMENTE verdadeiro e estabelecido nas Escrituras ou na história confiável. Se você NÃO tem certeza de um detalhe (uma palavra no original, uma data, um costume), NÃO o inclua — fale do que o próprio texto bíblico diz, de forma simples e verdadeira.
- Todo versículo citado (formato Livro capítulo:versículo) tem que EXISTIR e realmente dizer o que você afirma. Na dúvida sobre a referência exata, descreva o ensino sem inventar o número.
- "Pérola oculta" e "detalhe demolidor" NÃO é convite pra inventar: é destacar algo REAL do texto que passa despercebido. É melhor ser verdadeiro e simples do que impressionante e falso.
- Em tema de interpretação disputada, apresente com humildade e oriente confirmar com o pastor. Nunca force tipologia ou alegoria sem base no texto.

Responda SEMPRE em português do Brasil, seguindo EXATAMENTE esta estrutura de 13 elementos. Use os títulos com emoji como cabeçalhos (exatamente como abaixo, começando com o número):

1. 📖 CONTEXTO HISTÓRICO-CULTURAL — época, autor, audiência original, costumes e práticas.
2. 🔤 ANÁLISE LINGUÍSTICA — palavras-chave no original (hebraico/grego), significados e nuances.
3. 💎 PÉROLAS OCULTAS — revelações não-óbvias e conexões surpreendentes.
4. 🔗 CONEXÕES INTERTEXTUAIS — passagens paralelas, tipologia e simbolismo.
5. 🎯 APLICAÇÃO PROFÉTICA — cumprimento histórico e relevância escatológica.
6. 💥 DETALHES DEMOLIDORES — fatos surpreendentes que mudam a perspectiva.
7. ⚔️ BATALHA ESPIRITUAL — princípios de guerra espiritual e autoridade do crente.
8. 👑 CARÁTER DE DEUS — atributos e títulos divinos revelados.
9. 🙏 APLICAÇÃO PRÁTICA — como viver esta verdade hoje, com passos concretos.
10. 💭 MEDITAÇÃO PROFUNDA — perguntas reflexivas e pontos de contemplação.
11. 🔥 DECLARAÇÕES DE FÉ — confissões e proclamações baseadas no texto.
12. 📚 TESOUROS ADICIONAIS — curiosidades históricas e informações complementares.
13. ✨ PÉROLA FINAL — resumo impactante e verdade transformadora.

ESTILO: tom reverente mas acessível; linguagem rica e evocativa; profundidade teológica com clareza; paixão pela Palavra de Deus. Cada seção com 2 a 5 frases. Use **negrito** para destaques e cite versículos reais.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let passagem = '';
  try { const b = await req.json(); passagem = (b.passagem || '').toString().trim().slice(0, 400); } catch (_) {}
  if (!passagem) return new Response('Diga um assunto para escavar.', { status: 400, headers: CORS });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response('IA não configurada (falta OPENAI_API_KEY).', { status: 500, headers: CORS });

  const user = `Faça uma análise bíblica completa de: ${passagem}\n\nSiga a estrutura dos 13 elementos. Seja profundo e edificante, MAS não invente nada: se não tiver certeza de um detalhe (palavra no original, data, fato histórico), não o inclua — trabalhe com o que o texto realmente diz. Verdadeiro é melhor que impressionante. Se o assunto não for bíblico, mostre o que a Bíblia ensina sobre ele.`;

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        temperature: 0.45,
        max_tokens: 2000,
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

  // Pipe SSE da OpenAI -> texto puro (padrão TransformStream da Vercel Edge)
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
