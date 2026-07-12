export const config = { runtime: 'edge' };

const RSS_FEEDS = [
  { url: 'https://www.jpost.com/rss/rssfeedsIsrael.aspx', fonte: 'Jerusalem Post' },
  { url: 'https://www.timesofisrael.com/feed/', fonte: 'Times of Israel' },
  { url: 'https://www.israelnationalnews.com/rss.aspx', fonte: 'Arutz Sheva' },
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
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(f =>
        fetch(f.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarAtual/1.0)' },
          signal: AbortSignal.timeout(9000),
        })
          .then(r => r.text())
          .then(xml => ({ xml, fonte: f.fonte }))
      )
    );

    const articles = [];
    for (const res of feedResults) {
      if (res.status !== 'fulfilled') continue;
      const { xml, fonte } = res.value;
      const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
      for (const [, item] of items.slice(0, 5)) {
        const title = decodeXml(extractTag(item, 'title'));
        const link = extractTag(item, 'link').trim();
        const pubDate = extractTag(item, 'pubDate');
        const desc = decodeXml(extractTag(item, 'description') || extractTag(item, 'content:encoded'))
          .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350);

        // Image: media:content > media:thumbnail > enclosure > og in desc
        let img = '';
        const mc = item.match(/<media:content[^>]+url="([^"]+)"/i);
        const mt = item.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
        const enc = item.match(/<enclosure[^>]+url="([^"]+)"/i);
        if (mc) img = mc[1];
        else if (mt) img = mt[1];
        else if (enc && /image/.test(item.match(/<enclosure[^>]+>/)?.[0] || '')) img = enc[1];
        // Try og:image inside description
        if (!img) {
          const ogm = item.match(/src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/)
          if (ogm) img = ogm[1];
        }

        // Extract YouTube video ID from description or link
        let ytId = '';
        const ytMatch = (desc + ' ' + link).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) ytId = ytMatch[1];

        if (title && link) {
          articles.push({ title, link, description: desc, pubDate, img, ytId: ytId || undefined, fonte });
        }
      }
    }

    // Limit to 14 articles max
    const top = articles.slice(0, 14);

    // GPT translation
    const apiKey = process.env.OPENAI_API_KEY;
    let items = top;

    if (apiKey && top.length > 0) {
      const prompt = `Você é especialista em notícias de Israel e profecias bíblicas.
Para cada notícia abaixo, retorne um JSON array com os campos:
- titulo_pt: título traduzido PT-BR (máx 85 chars, natural)
- resumo_pt: resumo em PT-BR (3 frases curtas, máx 230 chars, sem repetir o título)
- categoria: uma de [Profecia, Arqueologia, Política, Povo Judeu, Conflito, Sociedade]
- ancora: versículo bíblico relevante e preciso (ex: "Isaías 11:12" ou "Salmos 122:6")

Responda APENAS com o JSON array, sem texto antes ou depois.

Notícias (${top.length}):
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
            max_tokens: 2500,
            temperature: 0.25,
          }),
          signal: AbortSignal.timeout(28000),
        });
        const gptData = await gptRes.json();
        const content = gptData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const translations = JSON.parse(jsonMatch[0]);
          items = top.map((a, i) => ({
            ...a,
            ...(translations[i] || {}),
          }));
        }
      } catch (_) {
        // GPT failed — serve originals
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
