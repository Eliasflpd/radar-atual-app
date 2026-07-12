export const config = { runtime: 'edge' };

// Google News RSS — always accessible from Vercel edge
const QUERIES = [
  {
    url: 'https://news.google.com/rss/search?q=Israel+Jerusalem+news+today&hl=en&gl=US&ceid=US:en',
    tag: 'Israel Hoje',
  },
  {
    url: 'https://news.google.com/rss/search?q=Israel+prophecy+Bible+temple+Jerusalem&hl=en&gl=US&ceid=US:en',
    tag: 'Profecia',
  },
  {
    url: 'https://news.google.com/rss/search?q=Israel+archaeology+discovery+ancient&hl=en&gl=US&ceid=US:en',
    tag: 'Arqueologia',
  },
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
  'Content-Type': 'application/json',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // Fetch all 3 Google News feeds in parallel
    const feedResults = await Promise.allSettled(
      QUERIES.map(q =>
        fetch(q.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(10000),
        })
          .then(r => r.text())
          .then(xml => ({ xml, tag: q.tag }))
      )
    );

    const articles = [];
    const seenTitles = new Set();

    for (const res of feedResults) {
      if (res.status !== 'fulfilled') continue;
      const { xml, tag } = res.value;
      const itemMatches = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];

      for (const [, item] of itemMatches.slice(0, 6)) {
        // Extract title (Google News puts "Title - Source" format)
        const rawTitle = decodeXml(extractTag(item, 'title'));
        // Remove " - Source Name" suffix
        const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim();

        if (!title || seenTitles.has(title.slice(0, 30))) continue;
        seenTitles.add(title.slice(0, 30));

        // Google link goes through redirect — use as-is
        const link = extractTag(item, 'link').trim() ||
          (item.match(/<link>([^<]+)<\/link>/) || [])[1]?.trim() || '';

        const pubDate = extractTag(item, 'pubDate');
        const fonte = decodeXml((item.match(/<source[^>]*>([^<]*)<\/source>/) || [])[1] || tag);

        // Description (Google News usually has basic text)
        const desc = decodeXml(extractTag(item, 'description') || '')
          .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);

        // No image from Google News — will use category placeholder
        articles.push({ title, link, description: desc, pubDate, fonte, img: '', ytId: undefined });
      }
    }

    // Max 12 articles
    const top = articles.slice(0, 12);

    // GPT translation + category + âncora + image description for background
    const apiKey = process.env.OPENAI_API_KEY;
    let items = top;

    if (apiKey && top.length > 0) {
      const prompt = `Você é especialista em notícias de Israel e profecias bíblicas.
Para cada notícia abaixo, retorne um JSON array com estes campos EXATOS:
- "titulo_pt": título traduzido PT-BR (máx 85 chars, natural, envolvente)
- "resumo_pt": resumo em PT-BR (3 frases, máx 220 chars, começa com um fato concreto)
- "categoria": EXATAMENTE uma de: Profecia | Arqueologia | Política | Povo Judeu | Conflito | Sociedade
- "ancora": versículo bíblico preciso (ex: "Isaías 11:12", "Salmos 122:6", "Zacarias 14:4")
- "emoji": um emoji visual que represente bem a notícia (para card visual)

Responda APENAS com o JSON array. Sem texto extra, sem markdown, sem \`\`\`.

${top.length} notícias:
${top.map((a, i) => `${i + 1}. [${a.fonte}] ${a.title}\n${a.description}`).join('\n\n---\n\n')}`;

      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2800,
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(30000),
        });
        const gptData = await gptRes.json();
        const content = gptData.choices?.[0]?.message?.content?.trim() || '';
        // Extract JSON array even if wrapped in markdown
        const jsonMatch = content.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const translations = JSON.parse(jsonMatch[0]);
          items = top.map((a, i) => ({
            ...a,
            ...(translations[i] || {}),
          }));
        }
      } catch (_) {
        // GPT failed — serve originals (in English)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, items, ts: Date.now() }),
      { headers: CORS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message, items: [] }),
      { status: 500, headers: CORS }
    );
  }
}

function extractTag(xml, tag) {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`,
    'i'
  );
  const m = xml.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2] || '') : '';
}

function decodeXml(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
}
