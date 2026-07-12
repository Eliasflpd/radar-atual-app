export const config = { runtime: 'edge' };

const QUERIES = [
  'https://news.google.com/rss/search?q=Israel+Jerusalem+war+news&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Israel+prophecy+Bible+temple&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Israel+archaeology+ancient+discovery&hl=en&gl=US&ceid=US:en',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
  'Content-Type': 'application/json',
};

const CAT_EMOJI = {
  Profecia: '🕊️', Arqueologia: '🏺', Política: '⚖️',
  'Povo Judeu': '✡️', Conflito: '⚔️', Sociedade: '🌍',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // RSS: 3 feeds em paralelo, timeout 4s cada
  const feeds = await Promise.allSettled(
    QUERIES.map(url =>
      fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal: AbortSignal.timeout(4000),
      }).then(r => r.text())
    )
  );

  // Parseia e deduplica — máximo 6 artigos
  const seen = new Set();
  const articles = [];
  for (const res of feeds) {
    if (res.status !== 'fulfilled') continue;
    const xml = res.value;
    const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 3);
    for (const [, item] of items) {
      const rawTitle = decodeXml(extractTag(item, 'title'));
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim();
      const key = title.slice(0, 25);
      if (!title || seen.has(key)) continue;
      seen.add(key);
      const link = (item.match(/<link>([^<]+)<\/link>/) || [])[1]?.trim() || '';
      const pubDate = extractTag(item, 'pubDate');
      const fonte = decodeXml((item.match(/<source[^>]*>([^<]*)<\/source>/) || [])[1] || 'Israel News');
      const desc = decodeXml(extractTag(item, 'description') || '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      articles.push({ title, link, desc, pubDate, fonte });
      if (articles.length >= 6) break;
    }
    if (articles.length >= 6) break;
  }

  if (articles.length === 0) {
    return new Response(JSON.stringify({ ok: false, items: [], error: 'no_articles' }), { headers: CORS });
  }

  // GPT ultra-lean: só títulos entram, saída mínima, timeout 5s
  const apiKey = process.env.OPENAI_API_KEY;
  let result = articles.map(a => ({
    ...a, titulo_pt: a.title, resumo_pt: a.desc, ancora: '', categoria: 'Sociedade', emoji: '🌍',
  }));

  if (apiKey) {
    const lines = articles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');
    const prompt = `Traduza para PT-BR e dê versículo relevante. JSON array com ${articles.length} objetos: {"t":"título PT","a":"Livro cap:v","c":"Categoria","e":"emoji"}
Categorias: Profecia|Arqueologia|Política|Povo Judeu|Conflito|Sociedade

${lines}`;
    try {
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await gptRes.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || '';
      const m = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').match(/\[[\s\S]*\]/);
      if (m) {
        const tr = JSON.parse(m[0]);
        result = articles.map((a, i) => {
          const t = tr[i] || {};
          const cat = t.c || 'Sociedade';
          return { ...a, titulo_pt: t.t || a.title, resumo_pt: a.desc, ancora: t.a || '', categoria: cat, emoji: t.e || CAT_EMOJI[cat] || '🌍' };
        });
      }
    } catch (_) { /* GPT timeout — títulos em inglês */ }
  }

  return new Response(JSON.stringify({ ok: true, items: result, ts: Date.now() }), { headers: CORS });
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2] || '') : '';
}

function decodeXml(s) {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c));
}
