// NOTÍCIAS FIÉIS — manchetes do dia, só de fontes sérias (pedido do Elias, 02/11/2026: "notícias de última hora,
// fiéis e verdadeiras… esse app é para cristãos com fome e sede da Palavra; nunca algo raso").
// URL pública: /api/noticias (rewrite -> /api/dados?fn=noticias). Mora no dados.js porque o plano Hobby não comporta
// função nova.
//
// Lê os feeds RSS PÚBLICOS de cada veículo (conferidos um a um em 02/11/2026), junta e ordena por data. Devolve só
// título, veículo, data, link e um resumo curto do próprio feed — o texto da matéria fica no site do veículo.
// Fora de propósito: portal gospel de fofoca/manchete chamativa e site partidário com rótulo cristão.
// Sem feed público em 02/11 (ficaram de fora, não inventar): Portas Abertas, A Voz dos Mártires, Reuters e AP
// (Reuters e AP encerraram os feeds abertos).

const SECOES = [
  { id: 'igreja', titulo: 'Igreja no mundo', fontes: [
    { nome: 'CPAD News', url: 'https://www.cpadnews.com.br/feed', idioma: 'pt' },
    { nome: 'Ultimato', url: 'https://www.ultimato.com.br/feed', idioma: 'pt' },
    { nome: 'Christianity Today', url: 'https://www.christianitytoday.com/feed/', idioma: 'en' },
    { nome: 'WORLD', url: 'https://wng.org/rss.xml', idioma: 'en' },
  ] },
  { id: 'perseguida', titulo: 'Igreja perseguida', porFonte: 12, fontes: [
    { nome: 'Morning Star News', url: 'https://morningstarnews.org/feed/', idioma: 'en' },
  ] },
  { id: 'mundo', titulo: 'Mundo e Israel', fontes: [
    { nome: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', idioma: 'pt' },
    { nome: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml', idioma: 'pt' },
    { nome: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', idioma: 'pt' },
    { nome: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', idioma: 'en' },
  ] },
];
const POR_SECAO = 14, POR_FONTE = 5, CACHE_MS = 20 * 60e3;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ccedil: 'ç', atilde: 'ã', otilde: 'õ', aacute: 'á', eacute: 'é',
  iacute: 'í', oacute: 'ó', uacute: 'ú', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à' };
function texto(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] || m).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] || m)
    .replace(/\s+/g, ' ').trim();
}
const campo = (bloco, tag) => { const m = bloco.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i')); return m ? m[1] : ''; };
const resumir = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);

function lerFeed(xml, fonte) {
  const itens = [];
  const blocos = xml.split(/<item[\s>]|<entry[\s>]/i).slice(1);
  for (const b of blocos) {
    const titulo = texto(campo(b, 'title'));
    let link = texto(campo(b, 'link'));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const quando = Date.parse(texto(campo(b, 'pubDate') || campo(b, 'published') || campo(b, 'updated') || campo(b, 'dc:date')));
    const resumo = resumir(texto(campo(b, 'description') || campo(b, 'summary')), 240);
    if (!titulo || !/^https?:\/\//.test(link)) continue;
    itens.push({ titulo, link, data: Number.isFinite(quando) ? new Date(quando).toISOString() : null,
      fonte: fonte.nome, idioma: fonte.idioma, resumo: resumo && resumo !== titulo ? resumo : '' });
  }
  return itens;
}

async function buscar(fonte) {
  try {
    const r = await fetch(fonte.url, { headers: { 'User-Agent': 'Mozilla/5.0 (RADAR; leitor de manchetes)', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      redirect: 'follow', signal: AbortSignal.timeout(7000) });
    if (!r.ok) return { fonte: fonte.nome, itens: [], erro: 'HTTP ' + r.status };
    return { fonte: fonte.nome, itens: lerFeed(await r.text(), fonte) };
  } catch (e) { return { fonte: fonte.nome, itens: [], erro: String((e && e.name) || e) }; }
}

let memoria = null;
async function montar() {
  if (memoria && Date.now() - memoria.em < CACHE_MS) return memoria.dados;
  const secoes = await Promise.all(SECOES.map(async (s) => {
    const lidos = await Promise.all(s.fontes.map(buscar));
    const vistos = new Set(), porFonte = {}, itens = [];
    const todos = lidos.flatMap((x) => x.itens).sort((a, b) => (Date.parse(b.data) || 0) - (Date.parse(a.data) || 0));
    for (const x of todos) {
      const k = x.link.replace(/[?#].*$/, '');
      if (vistos.has(k) || (porFonte[x.fonte] || 0) >= (s.porFonte || POR_FONTE)) continue;
      vistos.add(k); porFonte[x.fonte] = (porFonte[x.fonte] || 0) + 1; itens.push(x);
      if (itens.length >= POR_SECAO) break;
    }
    return { id: s.id, titulo: s.titulo, itens, falhas: lidos.filter((x) => x.erro).map((x) => x.fonte + ': ' + x.erro) };
  }));
  const dados = { ok: true, atualizado: new Date().toISOString(), secoes };
  if (secoes.some((s) => s.itens.length)) memoria = { em: Date.now(), dados };
  return dados;
}

module.exports = async (req, res) => {
  try {
    const dados = await montar();
    res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=3600');
    res.status(200).json(dados);
  } catch (e) {
    res.status(200).json({ ok: false, err: String((e && e.message) || e).slice(0, 140) });
  }
};
module.exports.SECOES = SECOES;
module.exports.montar = montar;
