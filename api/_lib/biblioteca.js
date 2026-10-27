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
      else if (r.status === 429) {
        // cota DO DIA acabou (não é limite do minuto): insistir só atrasa a voz; vai direto para a busca por termo
        const corpo = await r.text().catch(() => '');
        if (/daily free allocation|neurons/i.test(corpo)) return null;
      }
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
  // 25/10/2026: livro dividido por capítulo ou verbete (Kittel "agápē — amor", Edersheim "Livro III, cap. II — …",
  // Keil "Rute 4", Wood "O leão (Mamíferos)") guarda o LUGAR na seção: devolve esse lugar, não só o nome da obra.
  // O " / agape / agapao" do fim é só para a busca por palavra e não vai para a tela.
  if (!m) {
    const titulo = s.split(' / ')[0].trim();
    return titulo && titulo.toLowerCase() !== base.toLowerCase() && titulo.length > 2 ? titulo.slice(0, 90) : base;
  }
  const chave = base.toLowerCase().replace(/^[123]\s+/, '');
  const teto = CAPS[chave];
  // sem livro reconhecido, ou capítulo/versículo fora do que o livro comporta:
  // a "referência" é ruído de OCR. Devolve só o livro, que esse é confiável.
  if (!teto || +m[1] < 1 || +m[1] > teto || +m[2] < 1 || +m[2] > 176) return base;
  return base + ' ' + m[1] + ':' + m[2];
}

// Palavras da pergunta que NÃO servem pra busca por palavra (comuns demais ou só enquadram a pergunta).
const PARADAS = new Set(['palavra', 'palavras', 'grega', 'grego', 'gregas', 'gregos', 'hebraica', 'hebraico', 'sentido', 'significa',
  'significado', 'carrega', 'neste', 'novo', 'testamento', 'antigo', 'sobre', 'como', 'qual', 'quais', 'porque', 'entre', 'desta',
  'deste', 'esta', 'esse', 'essa', 'isso', 'pela', 'pelo', 'para', 'mais', 'muito', 'biblia', 'biblico', 'biblica', 'texto',
  'versiculo', 'capitulo', 'verso', 'quando', 'onde', 'tambem', 'aquele', 'aquela', 'dizer', 'quer', 'tudo', 'cada', 'usado',
  'usada', 'termo', 'original', 'letra', 'letras', 'fala', 'falar', 'explique', 'explica', 'diz', 'seja', 'sao', 'foi', 'ser',
  'dizem', 'falam', 'ensina', 'ensinam', 'escreve', 'escreveu', 'comenta', 'compare', 'concordam', 'acham', 'pensam']);

// O que dá pra casar por PALAVRA: números de Strong ("G26", "g0026") e termos em letras latinas ou gregas.
// Tudo sem acento e em minúsculas, igual ao que o indexador gravou na `secao` dos verbetes.
function termosDaPergunta(q) {
  const base = String(q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const strongs = [...base.matchAll(/\bg0*(\d{1,4})\b/g)].map((m) => 'G' + m[1].padStart(4, '0'));
  const latinas = (base.match(/[a-z]{4,}/g) || []).filter((w) => !PARADAS.has(w));
  const gregas = base.match(/[α-ω]{3,}/g) || [];
  return { strongs: [...new Set(strongs)], termos: [...new Set([...latinas, ...gregas])].slice(0, 8) };
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

  // CATÁLOGO: "o que a biblioteca tem?" — só NOMES e CONTAGENS, nunca texto de livro.
  // É daqui que o globo de voz sabe, de verdade e sempre atualizado, quais obras e autores
  // estão indexados (ferramenta meu_conhecimento). Sem isto ele só repetia uma lista escrita à mão.
  if (b.catalogo || q.catalogo) {
    const csCat = (process.env.RADAR_DB_DATABASE_URL||process.env.RADAR_DB);
    if (!csCat) { res.status(200).json({ ok: false, off: true, err: 'db não configurado' }); return; }
    const cCat = new Client({ connectionString: csCat, ssl: { rejectUnauthorized: false } });
    try {
      await cCat.connect();
      const rc = await cCat.query(
        `select autor, obra, tipo, peso, aprovado, count(*)::int as trechos
           from biblioteca_trechos
          group by autor, obra, tipo, peso, aprovado
          order by peso, autor, obra`);
      res.status(200).json({ ok: true, total: rc.rows.reduce((s, x) => s + x.trechos, 0), obras: rc.rows });
    } catch (_) {
      res.status(200).json({ ok: false, err: 'catálogo indisponível agora' });
    } finally { try { await cCat.end(); } catch (_) { /* já fechou */ } }
    return;
  }

  const pergunta = String(b.q || q.q || '').trim().slice(0, 500);
  if (pergunta.length < 3) { res.status(400).json({ ok: false, err: 'pergunta curta' }); return; }
  const quantos = Math.min(parseInt(b.n || q.n || '6', 10) || 6, 12);
  // 21/10/2026: busca SÓ num autor (a voz abre "as aulas do Dr. Wagner" sem misturar comentarista).
  const soAutor = String(b.autor || '').trim().slice(0, 80);

  const cs = (process.env.RADAR_DB_DATABASE_URL||process.env.RADAR_DB);
  if (!cs) { res.status(200).json({ ok: false, off: true, err: 'db não configurado' }); return; }

  // 25/10/2026: sem o vetor da pergunta (a cota grátis diária da Cloudflare acabou, ou ela caiu), a busca NÃO
  // morre: cai na BUSCA POR TERMO, direto no banco, sem acento e sem serviço de fora. É mais pobre que a busca por
  // sentido (só acha a palavra escrita), por isso o resultado diz `modo: 'termo'` e quem chama pode avisar.
  const v = await embutirPergunta(pergunta);
  const vec = v ? '[' + v.map((x) => x.toFixed(6)).join(',') + ']' : null;
  const termosBusca = termosDaPergunta(pergunta).termos.filter((t) => /^[a-z]{4,}$/.test(t)).slice(0, 8);
  if (!vec && !termosBusca.length) { res.status(200).json({ ok: false, err: 'não consegui transformar a pergunta em busca' }); return; }

  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    if (!vec) {
      const DE = 'áàâãäéèêëíìîïóòôõöúùûüçāēīōūḗṓǵ', PARA = 'aaaaaeeeeiiiiooooouuuucaeioueog';
      // nome de autor na pergunta ("o que o Kittel diz") não é assunto: vira preferência por aquele autor
      const NOMES = /^(kittel|thayer|keil|delitzsch|edersheim|champlin|owens|waltke|kidner|spurgeon|henry|moldenke|wood|duewel|foster|wiersbe|macdonald|hartley|mesquita|merkh|gill|wagner|cordeiro|mouser|broadman|moody|beacon|eetad)$/;
      const autoresPedidos = termosBusca.filter((t) => NOMES.test(t));
      const assunto = termosBusca.filter((t) => !NOMES.test(t));
      const usar = assunto.length ? assunto : termosBusca;
      // Rápido o bastante para a voz (medido em 25/10/2026: a 1ª versão varria 55 mil textos e levava 50–70 s):
      // o texto sem acento é calculado UMA vez por trecho (não uma vez por palavra); com autor na pergunta, só os
      // trechos daquele autor entram; e a consulta tem teto de 9 s (estourou, a busca diz que falhou — não trava a voz).
      await c.query('set statement_timeout = 9000');
      const rt = await c.query(
        `with base as materialized (
           select autor, obra, livro, secao, tipo, texto, peso, aprovado,
                  translate(lower(texto), $3, $4) as t, translate(lower(coalesce(secao, '')), $3, $4) as s
             from biblioteca_trechos
            where ($2 = '' or autor = $2)
              and (cardinality($5::text[]) = 0 or translate(lower(autor), $3, $4) like any (select '%' || a || '%' from unnest($5::text[]) a))
              -- sem autor na pergunta: primeiro filtra pelos TÍTULOS (capítulo, verbete, livro — colunas pequenas), e só esses
              -- trechos têm o texto aberto. Varrer o texto dos 86 mil trechos passava de 9 s (26/10/2026); um índice de texto
              -- custaria 30–50 MB num banco já em 400 de 512 MB, por isso ficou assim.
              and (cardinality($5::text[]) > 0 or translate(lower(coalesce(secao, '') || ' ' || coalesce(livro, '') || ' ' || coalesce(obra, '')), $3, $4)
                   like any (select '%' || x || '%' from unnest($1::text[]) x))
         ), c as (
           select autor, obra, livro, secao, tipo, texto, peso, aprovado,
                  (select count(*) from unnest($1::text[]) x where t like '%' || x || '%')::float
                  + (select count(*) from unnest($1::text[]) x where s ~ ('(^|[^a-z])' || x || '($|[^a-z])'))::float * 2
                  + case when cardinality($5::text[]) > 0 then 3 else 0 end as hits
             from base
         ) select autor, obra, livro, secao, tipo, texto, peso, aprovado, hits from c where hits > 0 order by hits desc, peso limit 60`,
        [usar, soAutor, DE, PARA, autoresPedidos]);
      const vistosT = new Set(), melhores = [], resto = [];
      for (const x of rt.rows) { (vistosT.has(x.autor) ? resto : melhores).push(x); vistosT.add(x.autor); }
      const maxHits = usar.length * 3 + 3;
      const itensT = [...melhores, ...resto].slice(0, quantos).map((x) => ({ autor: x.autor, obra: x.obra, livro: rotuloLimpo(x.livro),
        secao: secaoLimpa(x.secao, x.livro), tipo: x.tipo, texto: x.texto, peso: x.peso, aprovado: x.aprovado !== false,
        score: Math.round((0.46 + 0.4 * Math.min(1, x.hits / maxHits)) * 1000) / 1000 }));
      res.status(200).json({ ok: true, total: itensT.length, itens: itensT, modo: 'termo', termos: usar, autores_pedidos: autoresPedidos });
      return;
    }
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
                (1 - (emb <=> $1::halfvec)) + case peso when 2 then 0.04 when 3 then 0.02 when 4 then -0.03 else 0 end as posto
           from biblioteca_trechos
          where emb is not null and ($3 = '' or autor = $3)
          order by emb <=> $1::halfvec
          limit 60
       ), porautor as (
         select distinct on (autor) * from perto order by autor, posto desc
       )
       select * from (
         select * from porautor
         union all
         select * from perto
       ) t order by posto desc limit $2`, [vec, quantos + 8, soAutor]);

    // BUSCA POR PALAVRA, além da busca por sentido. Só por sentido, "ágape" trazia o verbete de Ágabo e a
    // palavra grega certa nem aparecia (medido em 18/10/2026): o léxico guarda a palavra em letras gregas e quem
    // pergunta digita em latinas. O indexador grava na `secao` do verbete "G0026 · αγαπη · agape / agape";
    // aqui casamos o que foi digitado (ou um número de Strong, "G26") com esse campo e pomos o verbete exato
    // no topo. É um complemento: se não casar nada, o resultado é o de sempre.
    let achados = [], erroLex = null;
    try {
      const lex = termosDaPergunta(pergunta);
      if (!soAutor && (lex.strongs.length || lex.termos.length)) {
        // 25/10/2026: um verbete por DICIONÁRIO (distinct on autor). Antes as 3 vagas iam para 3 pedaços do mesmo
        // verbete do Thayer e o Kittel, que voltou ao banco nesse dia, ficava fora do topo.
        const rl = await c.query(
          `select autor, obra, livro, secao, tipo, texto, peso, aprovado from (
             select distinct on (autor) autor, obra, livro, secao, tipo, texto, peso, aprovado, id
               from biblioteca_trechos
              where tipo = 'verbete'
                and (livro = any($1::text[])
                     or exists (select 1 from unnest($2::text[]) t where secao ~* ('(^|[ /·])' || t || '($| /)')))
              order by autor, peso, id) x
            order by peso, id limit 3`, [lex.strongs, lex.termos]);
        achados = rl.rows.map((x) => ({ ...x, score: 1 }));
      }
    } catch (e) { achados = []; erroLex = String((e && e.message) || e).slice(0, 160); }

    // Sem deduplicar, o union all devolve o mesmo trecho duas vezes.
    // 19/10/2026: autor COM FILTRO (aprovado=false: Champlin, Witness Lee, Kaung…) entra no máximo UM por
    // pesquisa. Com os comentários de Provérbios as notas ficam coladas (0,73 x 0,71) e, sem este teto, os
    // de filtro ocupavam metade das vagas e Waltke/Kidner nem chegavam ao redator.
    const vistos = new Set(), itens = [];
    let comFiltro = 0, historicos = 0;
    for (const x of [...achados, ...r.rows]) {
      const k = x.autor + '|' + x.texto.slice(0, 60);
      if (vistos.has(k)) continue;
      // 27/10/2026: o jornal (tipo 'historico') tem o próprio teto, 2: não disputa a vaga do Champlin nem enche a resposta.
      if (x.tipo === 'historico') { if (historicos >= 2) continue; historicos++; }
      else if (x.aprovado === false) { if (comFiltro >= 1) continue; comFiltro++; }
      vistos.add(k);
      itens.push({ autor: x.autor, obra: x.obra, livro: rotuloLimpo(x.livro),
        secao: secaoLimpa(x.secao, x.livro), tipo: x.tipo, texto: x.texto,
        peso: x.peso, aprovado: x.aprovado !== false,
        score: Math.round(x.score * 1000) / 1000 });
      if (itens.length >= quantos) break;
    }
    // DIAGNÓSTICO (só quando pedido): números e contagens, nunca texto de livro. Serve para comparar o que a
    // produção enxerga com o que o teste local enxerga (banco, vetor da pergunta, busca por palavra).
    let diag;
    if (b.diag) {
      try {
        const lex = termosDaPergunta(pergunta);
        const dbn = await c.query(`select current_database() db,
            (select count(*)::int from biblioteca_trechos) total,
            (select count(*)::int from biblioteca_trechos where tipo = 'verbete' and secao like '% · %') verbetes_com_translit,
            (select secao from biblioteca_trechos where livro = 'G0026' order by id limit 1) g26`);
        const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        diag = { versao: 'diag-2026-10-18', db: dbn.rows[0], lex: { termos: lex.termos, strongs: lex.strongs, achados: achados.length, erro: erroLex },
          emb: { dims: v.length, norma: Math.round(norma * 1000) / 1000, primeiros: v.slice(0, 4).map((x) => Math.round(x * 10000) / 10000) } };
      } catch (e) { diag = { erro: String((e && e.message) || e).slice(0, 160) }; }
    }
    res.status(200).json({ ok: true, total: itens.length, itens, diag });
  } catch (e) {
    res.status(200).json({ ok: false, err: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};
