// NEXUS BÍBLICO — motor de extração de entidades (ciclo 3, PILOTO). Não grava nada: extrai de um conjunto de trechos
// e devolve entidades, menções (com a posição exata no trecho), candidatos e ambiguidades. A gravação em lote no banco
// do NEXUS (nexus_entidades / nexus_mencoes / nexus_lotes) só depois de o piloto ser validado.
//
// MÉTODOS (em ordem de confiança)
//   catalogo        — nome ou variante do CATÁLOGO curado abaixo (cada entrada tem categoria, variantes e regra de contexto)
//   escrita_original— palavra em alfabeto grego ou hebraico no texto (preserva a grafia original)
//   strong          — número de Strong (G0000/H0000) nos léxicos
//   candidato       — nome próprio recorrente que NÃO está no catálogo: vai para revisão, sem categoria nem fusão
// DESAMBIGUAÇÃO: nomes ambíguos ("João", "Maria", "Tiago", "Herodes", "Filipe") só são atribuídos quando o contexto
// tem um marcador verificável (ex.: "Batista", "Crisóstomo", "evangelista"); senão ficam como AMBÍGUOS, com as
// entidades possíveis listadas. Nada é fundido automaticamente.
// CAMADA: cada menção leva a camada do trecho (texto antigo / provável editor moderno / obra moderna), para não
// confundir o autor antigo com o editor, tradutor ou comentarista.

// categoria: pessoa_biblica · pessoa_historica · autor_antigo · autor_moderno · lugar · evento · documento ·
//            instituicao · conceito · tradicao · termo_original
const CATALOGO = [
  // pessoas bíblicas
  { id: 'moises', nome: 'Moisés', cat: 'pessoa_biblica', var: ['Moisés', 'Moysés'] },
  { id: 'abraao', nome: 'Abraão', cat: 'pessoa_biblica', var: ['Abraão', 'Abraham'] },
  { id: 'davi', nome: 'Davi', cat: 'pessoa_biblica', var: ['Davi', 'David'] },
  { id: 'salomao', nome: 'Salomão', cat: 'pessoa_biblica', var: ['Salomão'] },
  { id: 'isaias', nome: 'Isaías (profeta)', cat: 'pessoa_biblica', var: ['Isaías'], contexto: /profeta|profecia|disse|diz|escreve/i },
  { id: 'paulo', nome: 'Paulo, apóstolo', cat: 'pessoa_biblica', var: ['Paulo', 'São Paulo', 'apóstolo Paulo'] },
  { id: 'pedro', nome: 'Pedro, apóstolo', cat: 'pessoa_biblica', var: ['Pedro', 'Simão Pedro', 'São Pedro'] },
  { id: 'jesus', nome: 'Jesus Cristo', cat: 'pessoa_biblica', var: ['Jesus', 'Cristo', 'Jesus Cristo', 'Nosso Senhor'] },
  { id: 'joao-apostolo', nome: 'João, apóstolo e evangelista', cat: 'pessoa_biblica', var: ['São João', 'João Evangelista', 'evangelista João', 'apóstolo João'] },
  { id: 'joao-batista', nome: 'João Batista', cat: 'pessoa_biblica', var: ['João Batista', 'João Baptista', 'o Batista'] },
  // autores antigos
  { id: 'filon', nome: 'Fílon de Alexandria', cat: 'autor_antigo', var: ['Fílon', 'Filon', 'Filo de Alexandria', 'Philo'] },
  { id: 'josefo', nome: 'Flávio Josefo', cat: 'autor_antigo', var: ['Josefo', 'Flávio Josefo', 'Josephus'] },
  { id: 'irineu', nome: 'Irineu de Lyon', cat: 'autor_antigo', var: ['Irineu', 'Ireneu', 'Irenaeus'] },
  { id: 'justino', nome: 'Justino de Roma', cat: 'autor_antigo', var: ['Justino', 'Justin'] },
  { id: 'origenes', nome: 'Orígenes', cat: 'autor_antigo', var: ['Orígenes', 'Origenes', 'Origen'] },
  { id: 'eusebio', nome: 'Eusébio de Cesareia', cat: 'autor_antigo', var: ['Eusébio', 'Eusebius'] },
  { id: 'atanasio', nome: 'Atanásio de Alexandria', cat: 'autor_antigo', var: ['Atanásio', 'Athanasius'] },
  { id: 'agostinho', nome: 'Agostinho de Hipona', cat: 'autor_antigo', var: ['Agostinho', 'Santo Agostinho', 'Augustine', 'Agostino'] },
  { id: 'crisostomo', nome: 'João Crisóstomo', cat: 'autor_antigo', var: ['Crisóstomo', 'João Crisóstomo', 'Chrysostom'] },
  { id: 'tertuliano', nome: 'Tertuliano', cat: 'autor_antigo', var: ['Tertuliano', 'Tertullian'] },
  { id: 'clemente-alex', nome: 'Clemente de Alexandria', cat: 'autor_antigo', var: ['Clemente de Alexandria', 'Clemente Alexandrino'] },
  { id: 'platao', nome: 'Platão', cat: 'autor_antigo', var: ['Platão', 'Plato'] },
  { id: 'aristoteles', nome: 'Aristóteles', cat: 'autor_antigo', var: ['Aristóteles', 'Aristotle'] },
  { id: 'heraclito', nome: 'Heráclito', cat: 'autor_antigo', var: ['Heráclito', 'Heraclitus'] },
  // pessoas históricas e heterodoxos
  { id: 'ario', nome: 'Ário', cat: 'pessoa_historica', var: ['Ário', 'Arius'] },
  { id: 'valentim', nome: 'Valentim (gnóstico)', cat: 'pessoa_historica', var: ['Valentim', 'Valentino', 'Valentinus'] },
  { id: 'basilides', nome: 'Basílides', cat: 'pessoa_historica', var: ['Basílides', 'Basilides'] },
  { id: 'marciao', nome: 'Marcião', cat: 'pessoa_historica', var: ['Marcião', 'Marcion'] },
  { id: 'cerinto', nome: 'Cerinto', cat: 'pessoa_historica', var: ['Cerinto', 'Cerinthus'] },
  // autores modernos (comentaristas, editores citados) — ajudam a separar a camada moderna
  { id: 'dodd', nome: 'C. H. Dodd', cat: 'autor_moderno', var: ['Dodd', 'C. H. Dodd'] },
  { id: 'bultmann', nome: 'Rudolf Bultmann', cat: 'autor_moderno', var: ['Bultmann'] },
  { id: 'harnack', nome: 'Adolf von Harnack', cat: 'autor_moderno', var: ['Harnack'] },
  { id: 'westcott', nome: 'B. F. Westcott', cat: 'autor_moderno', var: ['Westcott'] },
  { id: 'lightfoot', nome: 'J. B. Lightfoot', cat: 'autor_moderno', var: ['Lightfoot'] },
  { id: 'godet', nome: 'Frédéric Godet', cat: 'autor_moderno', var: ['Godet'] },
  { id: 'meyer', nome: 'H. A. W. Meyer', cat: 'autor_moderno', var: ['Meyer'] },
  // lugares
  { id: 'alexandria', nome: 'Alexandria', cat: 'lugar', var: ['Alexandria'] },
  { id: 'jerusalem', nome: 'Jerusalém', cat: 'lugar', var: ['Jerusalém'] },
  { id: 'roma', nome: 'Roma', cat: 'lugar', var: ['Roma'] },
  { id: 'efeso', nome: 'Éfeso', cat: 'lugar', var: ['Éfeso', 'Efeso'] },
  { id: 'antioquia', nome: 'Antioquia', cat: 'lugar', var: ['Antioquia'] },
  { id: 'egito', nome: 'Egito', cat: 'lugar', var: ['Egito'] },
  { id: 'sinai', nome: 'Monte Sinai', cat: 'lugar', var: ['Sinai'] },
  { id: 'palestina', nome: 'Palestina', cat: 'lugar', var: ['Palestina'] },
  { id: 'atenas', nome: 'Atenas', cat: 'lugar', var: ['Atenas'] },
  // acontecimentos
  { id: 'criacao', nome: 'Criação do mundo', cat: 'evento', var: ['criação do mundo', 'a Criação'] },
  { id: 'exodo-ev', nome: 'Êxodo do Egito', cat: 'evento', var: ['saída do Egito', 'êxodo do Egito'] },
  { id: 'encarnacao-ev', nome: 'Encarnação do Verbo', cat: 'evento', var: ['encarnação do Verbo', 'Verbo se fez carne'] },
  { id: 'nicéia', nome: 'Concílio de Niceia (325)', cat: 'evento', var: ['Concílio de Niceia', 'Concílio de Nicéia', 'Niceia', 'Nicéia'] },
  { id: 'destr-templo', nome: 'Destruição do Templo (70 d.C.)', cat: 'evento', var: ['destruição do Templo', 'destruição de Jerusalém'] },
  // documentos e obras citadas
  { id: 'lxx', nome: 'Septuaginta (LXX)', cat: 'documento', var: ['Septuaginta', 'LXX', 'Setenta'] },
  { id: 'vulgata', nome: 'Vulgata', cat: 'documento', var: ['Vulgata'] },
  { id: 'targum', nome: 'Targum', cat: 'documento', var: ['Targum', 'Targuns', 'Targumim'] },
  { id: 'talmude', nome: 'Talmude', cat: 'documento', var: ['Talmude', 'Talmud'] },
  { id: 'mishna', nome: 'Mishná', cat: 'documento', var: ['Mishná', 'Mishnah', 'Mixná'] },
  { id: 'didaque', nome: 'Didaqué', cat: 'documento', var: ['Didaqué', 'Didaché'] },
  { id: 'qumran', nome: 'Manuscritos de Qumran', cat: 'documento', var: ['Qumran', 'Qumrã', 'Mar Morto'] },
  // instituições e comunidades
  { id: 'sinagoga', nome: 'Sinagoga', cat: 'instituicao', var: ['sinagoga', 'sinagogas'] },
  { id: 'templo', nome: 'Templo de Jerusalém', cat: 'instituicao', var: ['Templo'] },
  { id: 'sinedrio', nome: 'Sinédrio', cat: 'instituicao', var: ['Sinédrio'] },
  { id: 'fariseus', nome: 'Fariseus', cat: 'instituicao', var: ['fariseus', 'Fariseus'] },
  { id: 'essenios', nome: 'Essênios', cat: 'instituicao', var: ['essênios', 'Essênios'] },
  { id: 'igreja-alex', nome: 'Igreja de Alexandria', cat: 'instituicao', var: ['Igreja de Alexandria'] },
  // tradições interpretativas
  { id: 'trad-alexandrina', nome: 'Tradição alexandrina', cat: 'tradicao', var: ['alexandrina', 'alexandrinos', 'escola de Alexandria'] },
  { id: 'trad-antioquena', nome: 'Tradição antioquena', cat: 'tradicao', var: ['antioquena', 'escola de Antioquia'] },
  { id: 'trad-rabinica', nome: 'Tradição rabínica', cat: 'tradicao', var: ['rabínica', 'rabinos', 'rabínico'] },
  { id: 'estoicismo', nome: 'Estoicismo', cat: 'tradicao', var: ['estoicos', 'estóicos', 'estoico', 'estoicismo'] },
  { id: 'platonismo', nome: 'Platonismo', cat: 'tradicao', var: ['platônico', 'platônica', 'platonismo', 'neoplatônico'] },
  { id: 'gnosticismo', nome: 'Gnosticismo', cat: 'tradicao', var: ['gnósticos', 'gnóstico', 'gnosticismo', 'gnose'] },
  { id: 'arianismo', nome: 'Arianismo', cat: 'tradicao', var: ['arianos', 'arianismo', 'ariana'] },
];
// nomes que pedem contexto (homônimos): sem marcador, a menção fica ambígua
const AMBIGUOS = [
  { forma: 'João', opcoes: ['joao-apostolo', 'joao-batista', 'crisostomo'], regras: [[/Batista|Baptista/, 'joao-batista'], [/Crisóstomo/, 'crisostomo'], [/evangelista|apóstolo|Evangelho de João|quarto evangelho/i, 'joao-apostolo']] },
  { forma: 'Maria', opcoes: ['maria-mae', 'maria-madalena'], regras: [[/Madalena/, 'maria-madalena'], [/Virgem|mãe de Jesus|Mãe de Deus/i, 'maria-mae']] },
  { forma: 'Tiago', opcoes: ['tiago-zebedeu', 'tiago-irmao'], regras: [[/Zebedeu/, 'tiago-zebedeu'], [/irmão do Senhor/i, 'tiago-irmao']] },
  { forma: 'Herodes', opcoes: ['herodes-grande', 'herodes-antipas'], regras: [[/o Grande|Magno/, 'herodes-grande'], [/Antipas/, 'herodes-antipas']] },
  { forma: 'Filipe', opcoes: ['filipe-apostolo', 'filipe-evangelista'], regras: [[/apóstolo/i, 'filipe-apostolo'], [/evangelista|diácono/i, 'filipe-evangelista']] },
];
const EXTRAS_AMBIGUOS = {
  'maria-mae': { nome: 'Maria, mãe de Jesus', cat: 'pessoa_biblica' }, 'maria-madalena': { nome: 'Maria Madalena', cat: 'pessoa_biblica' },
  'tiago-zebedeu': { nome: 'Tiago, filho de Zebedeu', cat: 'pessoa_biblica' }, 'tiago-irmao': { nome: 'Tiago, irmão do Senhor', cat: 'pessoa_biblica' },
  'herodes-grande': { nome: 'Herodes, o Grande', cat: 'pessoa_historica' }, 'herodes-antipas': { nome: 'Herodes Antipas', cat: 'pessoa_historica' },
  'filipe-apostolo': { nome: 'Filipe, apóstolo', cat: 'pessoa_biblica' }, 'filipe-evangelista': { nome: 'Filipe, o evangelista', cat: 'pessoa_biblica' },
};
const POR_ID = Object.fromEntries(CATALOGO.map((e) => [e.id, e]).concat(Object.entries(EXTRAS_AMBIGUOS).map(([id, e]) => [id, { id, ...e, var: [] }])));

const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LETRA = 'A-Za-zÀ-ÿ';
// um padrão por variante (palavra inteira), maior primeiro: "João Batista" ganha de "João"
const PADROES = CATALOGO.flatMap((e) => e.var.map((v) => ({ e, v, re: new RegExp(`(?<![${LETRA}])${escRe(v)}(?![${LETRA}])`, 'g') })))
  .sort((a, b) => b.v.length - a.v.length);
const RE_GREGO = /[Ͱ-Ͽἀ-῿]{3,}(?:\s[Ͱ-Ͽἀ-῿]{2,}){0,2}/g;
const RE_HEBRAICO = /[֐-׿]{2,}(?:\s[֐-׿]{2,}){0,2}/g;
const RE_STRONG = /\b([GH])0*(\d{1,4})\b/g;
const RE_PROPRIO = new RegExp(`(?<=[${LETRA},;:] )([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]{3,}(?: (?:de |da |do )?[A-ZÁÉÍÓÚ][a-záéíóúâêôãõç]{2,})?)`, 'g');
const LIVROS_BIBLIA = new Set(['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', 'Samuel', 'Reis', 'Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias', 'Mateus', 'Marcos', 'Lucas', 'Atos', 'Romanos', 'Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', 'Tessalonicenses', 'Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', 'Judas', 'Apocalipse']);
const COMUNS_MAIUSC = new Set(['Palavra', 'Logos', 'Sabedoria', 'Criador', 'Salvador', 'Vida', 'Trindade', 'Espirito', 'Jeová', 'Deus', 'Senhor', 'Espírito', 'Pai', 'Filho', 'Verbo', 'Igreja', 'Escritura', 'Escrituras', 'Evangelho', 'Lei', 'Livro', 'Capítulo', 'Antigo', 'Novo', 'Testamento', 'Santo', 'Santa', 'Sagrada', 'Cristão', 'Cristãos', 'Ele', 'Ela', 'Eles', 'Este', 'Esta', 'Aqui', 'Portanto', 'Assim', 'Também', 'Porém', 'Mas', 'Quando', 'Então', 'Nota', 'Notas', 'Introdução', 'Cap', 'Vol', 'Salmo', 'Salmos']);

function camadaDe(t) {
  if (t.camadaFonte === 'moderna') return 'obra_moderna';
  return /\[\d{1,3}\]|\bd\.\s?C\.|\bIntrodu[çc][ãa]o\b|\bNotas?\b|\bcf\.\s|\bDodd\b|\bHarnack\b/.test(t.texto + ' ' + (t.secao || '')) ? 'provavel_editor' : 'texto_antigo';
}
function janela(texto, i, n) { return texto.slice(Math.max(0, i - n), i + n); }

// extrair: trechos = [{ chave, fonte, autor, obra, secao, texto, camadaFonte: 'antiga'|'moderna' }]
function extrair(trechos, conceitos) {
  const entidades = new Map(), mencoes = [], ambiguas = [], candidatosConta = new Map();
  const toca = (id, base) => { if (!entidades.has(id)) entidades.set(id, { id, nome: base.nome, categoria: base.cat, variantes: new Set(), mencoes: 0, trechos: new Set(), fontes: new Set(), camadas: {} }); return entidades.get(id); };
  for (const t of trechos) {
    const texto = String(t.texto || '');
    const camada = camadaDe(t);
    const ocupado = [];
    const livre = (i, j) => !ocupado.some(([a, b]) => i < b && j > a);
    const registra = (id, base, i, forma, metodo, confianca, extra) => {
      const e = toca(id, base); e.variantes.add(forma); e.mencoes++; e.trechos.add(t.chave); e.fontes.add(t.fonte); e.camadas[camada] = (e.camadas[camada] || 0) + 1;
      mencoes.push({ entidade: id, trecho: t.chave, fonte: t.fonte, obra: t.obra, secao: t.secao || '', pos: i, forma, metodo, confianca, camada, contexto: janela(texto, i, 90).replace(/\s+/g, ' '), ...(extra || {}) });
    };
    // 1) catálogo
    for (const { e, v, re } of PADROES) {
      re.lastIndex = 0;
      for (let m; (m = re.exec(texto));) {
        const i = m.index, j = i + v.length;
        if (!livre(i, j)) continue;
        if (e.contexto && !e.contexto.test(janela(texto, i, 120))) continue;   // ex.: "Isaías" só como profeta, não como livro citado
        ocupado.push([i, j]);
        registra(e.id, e, i, v, 'catalogo', e.cat === 'tradicao' || e.cat === 'instituicao' ? 0.75 : 0.9);
      }
    }
    // 2) homônimos
    for (const a of AMBIGUOS) {
      const re = new RegExp(`(?<![${LETRA}])${escRe(a.forma)}(?![${LETRA}])`, 'g');
      for (let m; (m = re.exec(texto));) {
        const i = m.index, j = i + a.forma.length;
        if (!livre(i, j)) continue;
        if (/^\s*\d/.test(texto.slice(j, j + 4))) continue;      // "João 1:1" é o livro, não a pessoa
        ocupado.push([i, j]);
        const ctx = janela(texto, i, 140);
        const regra = a.regras.find(([r]) => r.test(ctx));
        if (regra) registra(regra[1], POR_ID[regra[1]], i, a.forma, 'catalogo+contexto', 0.7, { regra: String(regra[0]) });
        else ambiguas.push({ forma: a.forma, opcoes: a.opcoes.map((o) => (POR_ID[o] || {}).nome || o), trecho: t.chave, fonte: t.fonte, pos: i, contexto: ctx.replace(/\s+/g, ' ') });
      }
    }
    // 3) conceitos (o dicionário do NEXUS)
    for (const c of conceitos || []) {
      const re = new RegExp(c.re, 'g');
      for (let m; (m = re.exec(texto));) { registra('conceito:' + c.id, { nome: c.rotulo, cat: 'conceito' }, m.index, m[0], 'dicionario_conceitos', 0.8); if (re.lastIndex === m.index) re.lastIndex++; }
    }
    // 4) escrita original (grego / hebraico) — preserva a grafia
    const textoTermos = texto.replace(/([\u0370-\u03FF\u1F00-\u1FFF])[-‐]\s*([\u0370-\u03FF\u1F00-\u1FFF])/g, '$1$2');
    for (const [re, lingua] of [[RE_GREGO, 'grego'], [RE_HEBRAICO, 'hebraico']]) {
      re.lastIndex = 0;
      for (let m; (m = re.exec(textoTermos));) {
        const forma = m[0].trim();
        const id = 'termo:' + lingua + ':' + forma.normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '').toLowerCase();
        registra(id, { nome: forma, cat: 'termo_original' }, m.index, forma, 'escrita_original', 0.85, { lingua });
      }
    }
    RE_STRONG.lastIndex = 0;
    for (let m; (m = RE_STRONG.exec(texto));) {
      if (!/thayer|kittel|owens|trench/.test(t.fonte)) continue;
      registra('strong:' + m[1] + m[2].padStart(4, '0'), { nome: m[1] + m[2].padStart(4, '0') + ' (Strong)', cat: 'termo_original' }, m.index, m[0], 'strong', 0.95);
    }
    // 5) candidatos (nome próprio recorrente fora do catálogo)
    RE_PROPRIO.lastIndex = 0;
    for (let m; (m = RE_PROPRIO.exec(texto));) {
      const forma = m[1];
      if (COMUNS_MAIUSC.has(forma.split(' ')[0]) || LIVROS_BIBLIA.has(forma.split(' ')[0]) || AMBIGUOS.some((a) => a.forma === forma) || !livre(m.index, m.index + forma.length)) continue;
      const c = candidatosConta.get(forma) || { forma, n: 0, trechos: new Set(), fontes: new Set(), exemplo: '' };
      c.n++; c.trechos.add(t.chave); c.fontes.add(t.fonte); if (!c.exemplo) c.exemplo = janela(texto, m.index, 80).replace(/\s+/g, ' ');
      candidatosConta.set(forma, c);
    }
  }
  const candidatos = [...candidatosConta.values()].filter((c) => c.n >= 3 && c.fontes.size >= 2)
    .sort((a, b) => b.n - a.n).slice(0, 40).map((c) => ({ forma: c.forma, ocorrencias: c.n, trechos: c.trechos.size, fontes: [...c.fontes], exemplo: c.exemplo }));
  // relações por co-ocorrência no mesmo trecho (hipótese; a evidência é o trecho)
  const porTrecho = new Map();
  for (const m of mencoes) { if (!porTrecho.has(m.trecho)) porTrecho.set(m.trecho, new Set()); porTrecho.get(m.trecho).add(m.entidade); }
  const pares = new Map();
  for (const [ch, ids] of porTrecho) {
    const l = [...ids].filter((id) => !id.startsWith('termo:') && !id.startsWith('strong:'));
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const k = [l[i], l[j]].sort().join('|');
      const p = pares.get(k) || { a: k.split('|')[0], b: k.split('|')[1], trechos: new Set() };
      p.trechos.add(ch); pares.set(k, p);
    }
  }
  const relacoes = [...pares.values()].filter((p) => p.trechos.size >= 2).sort((x, y) => y.trechos.size - x.trechos.size).slice(0, 60)
    .map((p) => ({ de: p.a, para: p.b, tipo: 'coocorrencia', estado: 'hipotese', trechos: p.trechos.size, exemplos: [...p.trechos].slice(0, 3) }));
  const lista = [...entidades.values()].map((e) => ({ ...e, variantes: [...e.variantes], trechos: e.trechos.size, fontes: [...e.fontes] }))
    .sort((a, b) => b.mencoes - a.mencoes);
  return { entidades: lista, mencoes, ambiguas, candidatos, relacoes };
}

module.exports = { extrair, CATALOGO, AMBIGUOS };
