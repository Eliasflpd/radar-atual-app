export const config = { runtime: 'edge' };

const QUERIES = [
  'https://news.google.com/rss/search?q=Israel+Jerusalem+war+news&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Israel+prophecy+Bible+temple&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Israel+archaeology+ancient+discovery&hl=en&gl=US&ceid=US:en',
];

const CORS = { 'Access-Control-Allow-Origin':'*','Cache-Control':'public,s-maxage=21600,stale-while-revalidate=43200','Content-Type':'application/json' };

const CAT = { Profecia:'🕊️', Arqueologia:'🏺', Conflito:'⚔️', Sociedade:'🌍', Política:'⚖️', 'Povo Judeu':'✡️' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const feeds = await Promise.allSettled(
    QUERIES.map(url => fetch(url, { headers: { 'User-Agent': 'Googlebot/2.1' }, signal: AbortSignal.timeout(4000) }).then(r => r.text()))
  );
  const seen = new Set(), arts = [];
  for (const res of feeds) {
    if (res.status !== 'fulfilled') continue;
    for (const item of parseItems(res.value)) {
      const title = ent(gtag(item,'title')).replace(/ - [^-]+$/, '').trim();
      if (!title || seen.has(title.slice(0,25))) continue;
      seen.add(title.slice(0,25));
      arts.push({ title, link: btwn(item,'<link>','</link>'), fonte: ent(btwn(item,'<source','</source>').replace(/^[^>]*>/,'')) || 'Israel News', desc: ent(stripTags(gtag(item,'description'))).replace(/  +/g,' ').trim().slice(0,200), pubDate: gtag(item,'pubDate') });
      if (arts.length >= 6) break;
    }
    if (arts.length >= 6) break;
  }
  if (!arts.length) return new Response(JSON.stringify({ ok:false,items:[],error:'no_articles' }), { headers: CORS });
  let result = arts.map(a => ({ ...a, titulo_pt:a.title, resumo_pt:a.desc, ancora:'', categoria:'Sociedade', emoji:'🌍' }));
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const titles = arts.map((a,i) => (i+1)+'. '+a.title).join(' | ');
    const prompt = 'PT-BR + versículo bíblico. Responda SOMENTE JSON array com ' + arts.length + ' objetos: {"t":"título PT","a":"Livro cap:v","c":"Categoria","e":"emoji"} Categorias: Profecia|Arqueologia|Política|Povo Judeu|Conflito|Sociedade. Títulos: ' + titles;
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey},
        body: JSON.stringify({ model:'gpt-4o-mini', messages:[{role:'user',content:prompt}], max_tokens:600, temperature:0.1 }),
        signal: AbortSignal.timeout(5000),
      });
      const d = await r.json();
      const raw = (d.choices&&d.choices[0]&&d.choices[0].message ? d.choices[0].message.content : '').trim();
      const s = raw.indexOf('['), e = raw.lastIndexOf(']')+1;
      if (s>=0 && e>s) {
        const tr = JSON.parse(raw.slice(s,e));
        result = arts.map((a,i) => { const t=tr[i]||{},cat=t.c||'Sociedade'; return {...a,titulo_pt:t.t||a.title,resumo_pt:a.desc,ancora:t.a||'',categoria:cat,emoji:t.e||CAT[cat]||'🌍'}; });
      }
    } catch(err) {}
  }
  return new Response(JSON.stringify({ ok:true, items:result, ts:Date.now() }), { headers: CORS });
}

function parseItems(xml) {
  const out=[]; let pos=0;
  while (out.length<3) { const s=xml.indexOf('<item',pos); if(s<0)break; const e=xml.indexOf('</item>',s); if(e<0)break; out.push(xml.slice(xml.indexOf('>',s)+1,e)); pos=e+7; }
  return out;
}

function gtag(xml,tag) {
  const s=xml.indexOf('<'+tag); if(s<0)return'';
  const e=xml.indexOf('</'+tag+'>',s); if(e<0)return'';
  const inner=xml.slice(xml.indexOf('>',s)+1,e);
  return inner.indexOf('<![CDATA[')===0 ? inner.slice(9,inner.lastIndexOf(']]>')) : inner;
}

function btwn(xml,open,close) { const s=xml.indexOf(open); if(s<0)return''; const e=xml.indexOf(close,s); return e<0?'':xml.slice(s+open.length,e); }

function stripTags(s) { let r='',in_=false; for(let i=0;i<s.length;i++) { if(s[i]==='<')in_=true; else if(s[i]==='>')in_=false,r+=' '; else if(!in_)r+=s[i]; } return r; }

function ent(s) { return (s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&nbsp;/g,' '); }