// ═══════════════════════════════════════════════════════════════════════════════
// A BIBLIOTECA DO ELIAS — busca por SENTIDO dentro dos livros que ele comprou.
// URL interna: POST/GET /api/dados?fn=biblioteca   (registrado em api/dados.js)
//
// ⚖️ ISTO NÃO É UMA ROTA PÚBLICA. É UM MOTOR INVISÍVEL. Leia antes de mexer.
//
// Os livros são de Champlin, Kittel, Waltke, Kidner, Pearlman, Horton, Gilberto —
// obra com dono, comprada pelo Elias. A lei aqui é simples e tem duas metades:
//   ✅ PODE ler, pesquisar, tirar conclusão própria e CITAR A FONTE.
//   ❌ NÃO PODE devolver o parágrafo do autor pra fora do servidor.
// Quem transforma o trecho em resposta ORIGINAL é quem chama esta rota
// (api/_lib/voz-ferramentas.js, do lado de dentro). O texto do livro para AQUI:
// vai do Postgres pro servidor e morre no servidor. Nunca chega no celular,
// nunca entra no repositório (que é público), nunca vira arquivo estático.
//
// POR ISSO ELA EXIGE O RADAR_ADMIN_TOKEN. Não é burocracia: sem a trava, a rota
// vira um jeito de baixar a biblioteca do homem, um pedaço por requisição.
// Quem chama é sempre servidor-pra-servidor, com o token vindo do env.
//
// POR QUE MORA EM api/_lib/ E ENTRA PELO api/dados.js: a Vercel Hobby dá 12
// funções e todas estão ocupadas. Arquivo com prefixo _ não vira função.
// E não mexemos em api/estudo-busca.js (o outro caminho com pg) de propósito:
// aquele arquivo está sendo alterado em paralelo.
//
// O ÍNDICE: tabela biblioteca_trechos, vetores halfvec(1024) do @cf/baai/bge-m3,
// gerada por scripts/indexar-biblioteca.mjs no PC do Elias. A pergunta vira vetor
// aqui, na hora, pelo MESMO modelo — se um mudar, o outro tem que mudar junto.
// ═══════════════════════════════════════════════════════════════════════════════
const { Client } = require('pg');

const MODELO = '@cf/baai/bge-m3';
const DIMS = 1024;

async function embutirPergunta(pergunta) {
  const conta = process.env.CF_ACCOUNT_ID, token = process.env.CF_AI_TOKEN;
  if (!conta || !token) return null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/${MODELO}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [pergunta] }),
      });
      if (r.ok) {
        const j = await r.json();
        const v = ((j.result && (j.result.data || j.result.response)) || [])[0];
        if (Array.isArray(v) && v.length === DIMS) return v;
      } else if (r.status !== 429 && r.status < 500) return null;
    } catch (_) { /* rede tropeçou */ }
    await new Promise((s) => setTimeout(s, 400 * (t + 1)));
  }
  return null;
}

// ─── o rótulo que o globo vai FALAR em voz alta ──────────────────────────────
// O nome do arquivo veio do Logos e é feio: "GÊNESIS- BRUCE.K. WALTKE - CULTURA
// CRISTÃ". Ninguém diz isso no meio de uma frase. Aqui fica só o livro.
// E a "seção" só vale quando parece MESMO capítulo:versículo — o indexador pega o
// primeiro número com dois pontos do trecho, e às vezes isso é número de página.
const LIVROS_BIB = /\b(g[êe]nesis|[êe]xodo|lev[íi]tico|n[úu]meros|deuteron[ôo]mio|josu[ée]|ju[íi]zes|rute|samuel|reis|cr[ôo]nicas|esdras|neemias|ester|j[óo]|salmos?|prov[ée]rbios|eclesiastes|cantares|isa[íi]as|jeremias|lamenta[çc][õo]es|ezequiel|daniel|oseias|joel|am[óo]s|obadias|jonas|miqueias|naum|habacuque|sofonias|ageu|zacarias|malaquias|mateus|marcos|lucas|jo[ãa]o|atos|romanos|cor[íi]ntios|g[áa]latas|ef[ée]sios|filipenses|colossenses|tessalonicenses|tim[óo]teo|tito|filemom|hebreus|tiago|pedro|judas|apocalipse)\b/i;

function rotuloLimpo(livro) {
  const s = String(livro || '').trim();
  if (!s) return '';
  const m = s.match(LIVROS_BIB);
  if (m) {                                   // achou nome de livro bíblico: fica só ele
    const n = s.match(/\b([123])\s*(?=\w)/);
    return ((n ? n[1] + ' ' : '') + m[0]).replace(/\s+/g, ' ').trim();
  }
  // não é livro bíblico (é obra avulsa): corta o rabo de editora/autor
  return s.split(/\s+[-–—]\s+/)[0].trim().slice(0, 40);
}

// Quantos capítulos cada livro TEM de verdade. Serve pra uma coisa só, e é
// importante: o indexador adivinha a referência pegando o primeiro "n:n" que
// aparece no trecho, e em livro escaneado isso às vezes é número de página.
// "Gênesis 90:75" não existe — Gênesis tem 50 capítulos. Citação errada é pior
// que citação nenhuma: o pastor vai conferir, não vai achar, e perde a confiança.
const CAPS = {
  'gênesis': 50, 'êxodo': 40, 'levítico': 27, 'números': 36, 'deuteronômio': 34,
  'josué': 24, 'juízes': 21, 'rute': 4, 'samuel': 31, 'reis': 25, 'crônicas': 36,
  'esdras': 10, 'neemias': 13, 'ester': 10, 'jó': 42, 'salmos': 150, 'salmo': 150,
  'provérbios': 31, 'eclesiastes': 12, 'cantares': 8, 'isaías': 66, 'jeremias': 52,
  'lamentações': 5, 'ezequiel': 48, 'daniel': 12, 'oseias': 14, 'joel': 3, 'amós': 9,
  'obadias': 1, 'jonas': 4, 'miqueias': 7, 'naum': 3, 'habacuque': 3, 'sofonias': 3,
  'ageu': 2, 'zacarias': 14, 'malaquias': 4, 'mateus': 28, 'marcos': 16, 'lucas': 24,
  'joão': 21, 'atos': 28, 'romanos': 16, 'coríntios': 16, 'gálatas': 6, 'efésios': 6,
  'filipenses': 4, 'colossenses': 4, 'tessalonicenses': 5, 'timóteo': 6, 'tito': 3,
  'filemom': 1, 'hebreus': 13, 'tiago': 5, 'pedro': 5, 'judas': 1, 'apocalipse': 22,
};

function secaoLimpa(secao, livro) {
  const s = String(secao || '').trim();
  const m = s.match(/\b(\d{1,3})\s*:\s*(\d{1,3})\b/);
  const base = rotuloLimpo(livro);
  if (!m) return base;
  const chave = base.toLowerCase().replace(/^[123]\s+/, '');
  const teto = CAPS[chave];
  // sem livro reconhecido, ou capítulo/versículo fora do que o livro comporta:
  // a "referência" é ruído de OCR. Devolve só o livro, que esse é confiável.
  if (!teto || +m[1] < 1 || +m[1] > teto || +m[2] < 1 || +m[2] > 176) return base;
  return base + ' ' + m[1] + ':' + m[2];
}

module.exports = async (req, res) => {
  // Sem CORS de propósito: NINGUÉM deve chamar isto do navegador. Quem chama é o
  // /api/voz, servidor-pra-servidor. Deixar CORS aberto seria convidar o download.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(405).end(); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};
  const q = req.query || {};

  const ADM = process.env.RADAR_ADMIN_TOKEN;
  const veio = b.token || q.token;
  if (!ADM || veio !== ADM) { res.status(403).json({ ok: false, err: 'token' }); return; }

  const pergunta = String(b.q || q.q || '').trim().slice(0, 500);
  if (pergunta.length < 3) { res.status(400).json({ ok: false, err: 'pergunta curta' }); return; }
  const quantos = Math.min(parseInt(b.n || q.n || '6', 10) || 6, 12);

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(200).json({ ok: false, off: true, err: 'db não configurado' }); return; }

  const v = await embutirPergunta(pergunta);
  if (!v) { res.status(200).json({ ok: false, err: 'não consegui transformar a pergunta em busca' }); return; }
  const vec = '[' + v.map((x) => x.toFixed(6)).join(',') + ']';

  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    // Um trecho por OBRA no topo seria pobre; o que queremos é o melhor de cada
    // AUTOR — é assim que o globo consegue dizer "Champlin vê assim, Waltke assim".
    // distinct on (autor) pega o mais próximo de cada um, depois ordena o conjunto.
    // ORDEM DE AUTORIDADE dentro da própria consulta.
    // `peso` vem do indexador: 2 = Owens/Kittel (dizem QUAL é a palavra),
    // 3 = autores aprovados pelo Concílio, 4 = Champlin (reprovado, com filtro).
    // Um empurrãozinho no placar por peso faz o globo ver primeiro quem tem mais
    // autoridade — sem CENSURAR o resto, porque às vezes o Champlin é justamente
    // quem tem o dado de crítica textual que ninguém mais tem. Quem decide o que
    // fazer com isso é a instrução de sistema, não o SQL.
    const r = await c.query(
      `with perto as (
         select autor, obra, livro, secao, tipo, texto, peso, aprovado,
                1 - (emb <=> $1::halfvec) as score,
                (1 - (emb <=> $1::halfvec)) + case peso when 2 then 0.04 when 3 then 0.02 else 0 end as posto
           from biblioteca_trechos
          where emb is not null
          order by emb <=> $1::halfvec
          limit 60
       ), porautor as (
         select distinct on (autor) * from perto order by autor, posto desc
       )
       select * from (
         select * from porautor
         union all
         select * from perto
       ) t order by posto desc limit $2`, [vec, quantos]);

    // Sem deduplicar, o union all devolve o mesmo trecho duas vezes.
    const vistos = new Set(), itens = [];
    for (const x of r.rows) {
      const k = x.autor + '|' + x.texto.slice(0, 60);
      if (vistos.has(k)) continue;
      vistos.add(k);
      itens.push({ autor: x.autor, obra: x.obra, livro: rotuloLimpo(x.livro),
        secao: secaoLimpa(x.secao, x.livro), tipo: x.tipo, texto: x.texto,
        peso: x.peso, aprovado: x.aprovado !== false,
        score: Math.round(x.score * 1000) / 1000 });
      if (itens.length >= quantos) break;
    }
    res.status(200).json({ ok: true, total: itens.length, itens });
  } catch (e) {
    res.status(200).json({ ok: false, err: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};
