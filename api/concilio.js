export const config = { runtime: 'edge' };

const CORS = { 'Access-Control-Allow-Origin': '*' };

// 41 eruditos do Concílio — gerado a partir de public/biblioteca/concilio/eruditos.json
const ERUDITOS = [{"id": "stanley-m-horton", "nome": "Stanley M. Horton", "tag": "Decano da teologia pentecostal (AD)", "cre": "Doutrina AD clássica; batismo no Espírito com línguas; dons e sobrenatural pra hoje", "forte": "Definir a ortodoxia pentecostal com rigor de seminário; Espírito Santo; Atos; Apocalipse"}, {"id": "gordon-d-fee", "nome": "Gordon D. Fee", "tag": "Exegeta pentecostal do texto grego", "cre": "Alta visão da Escritura; o Espírito que capacita; feroz contra o evangelho da prosperidade", "forte": "Rigor no grego, crítica textual, o Espírito nas cartas de Paulo, hermenêutica séria"}, {"id": "craig-s-keener", "nome": "Craig S. Keener", "tag": "O gigante do pano de fundo e dos milagres", "cre": "Continuísta; raiz nas Assembleias de Deus; defende os milagres com erudição", "forte": "Mundo do 1º século, contexto judaico/greco-romano, Atos, defender o sobrenatural"}, {"id": "french-l-arrington", "nome": "French L. Arrington", "tag": "O dogmata do Espírito", "cre": "Pentecostal clássico; batismo no Espírito com evidência; dons pra hoje", "forte": "A doutrina do Espírito Santo com base exegética; Lucas, Atos, Coríntios"}, {"id": "roger-stronstad", "nome": "Roger Stronstad", "tag": "A chave da pneumatologia lucana", "cre": "O dom do Espírito em Lucas-Atos é capacitação pra missão, subsequente à conversão", "forte": "Defesa exegética do batismo no Espírito; 'o sacerdócio profético de todos os crentes'"}, {"id": "myer-pearlman", "nome": "Myer Pearlman", "tag": "O pai da sistemática pentecostal", "cre": "Pentecostal clássico; as grandes doutrinas ditas de forma simples e ordenada", "forte": "Panorama de cada livro da Bíblia; fundamentos de doutrina AD claros"}, {"id": "donald-c-stamps", "nome": "Donald C. Stamps", "tag": "As notas que o Brasil inteiro lê (Bíblia de Estudo Pentecostal)", "cre": "Pentecostal; batismo no Espírito, dons, cura; forte ênfase em santidade e separação do mundo", "forte": "Nota de estudo utilizável no púlpito; artigos temáticos pentecostais"}, {"id": "antonio-gilberto", "nome": "Antônio Gilberto", "tag": "O didata-mor da CPAD", "cre": "Pentecostal AD; 'erudição e piedade'; inspiração da Escritura", "forte": "COMO ensinar a Bíblia na Escola Dominical; bibliologia; formar professores"}, {"id": "esequias-soares", "nome": "Esequias Soares", "tag": "Os originais e a apologética", "cre": "Pentecostal AD; inerrância; ortodoxia trinitariana firme", "forte": "Hebraico e grego; defesa da fé contra seitas (T. de Jeová, espiritismo, modismos)"}, {"id": "elienai-cabral", "nome": "Elienai Cabral", "tag": "O expositor paulino da CPAD", "cre": "Pentecostal AD; ênfase na vida cristã, conduta e mordomia", "forte": "Exposição das cartas de Paulo (Efésios, Romanos); vida prática da igreja"}, {"id": "severino-pedro-da-silva", "nome": "Severino Pedro da Silva", "tag": "Hebreus e as últimas coisas", "cre": "Pentecostal AD; premilenista; tipologia cristocêntrica", "forte": "Hebreus verso a verso; Apocalipse; escatologia; a superioridade de Cristo"}, {"id": "frank-m-boyd", "nome": "Frank M. Boyd", "tag": "O pioneiro doutrinário da AG", "cre": "Pentecostal AD; dispensacionalista; escatologia clássica", "forte": "As eras/dispensações; arrebatamento, tribulação, milênio; panorama do plano de Deus"}, {"id": "joao-calvino", "nome": "João Calvino", "tag": "O padrão-ouro da exegese reformada", "cre": "Reformado; soberania de Deus; graça soberana; autoridade suprema da Escritura", "forte": "Exegese clara e disciplinada (brevitas); revelar a mente do autor sagrado"}, {"id": "martinho-lutero", "nome": "Martinho Lutero", "tag": "O fogo da Reforma", "cre": "Luterano; justificação só pela fé, só pela graça, só Cristo, só a Escritura", "forte": "Lei e Evangelho; Cristo no centro; graça contra mérito; Gálatas, Gênesis"}, {"id": "john-owen", "nome": "John Owen", "tag": "O teólogo dos teólogos (puritano)", "cre": "Puritano reformado; expiação definida; a obra de Cristo; mortificação do pecado", "forte": "Profundidade sem fundo num texto; Hebreus; santidade; comunhão com Deus"}, {"id": "jonathan-edwards", "nome": "Jonathan Edwards", "tag": "A mente mais penetrante da América", "cre": "Reformado; a supremacia e a beleza de Deus; graça soberana; afetos santos", "forte": "Tipologia intensa; a glória de Deus; conexões teológicas que ninguém vê"}, {"id": "matthew-henry", "nome": "Matthew Henry", "tag": "O devocional-pastoral", "cre": "Puritano; glorificar a Deus em toda a vida; a Escritura como alimento da alma", "forte": "Lição prática e devocional de cada versículo; calor pastoral; aforismos que grudam"}, {"id": "charles-spurgeon", "nome": "Charles Spurgeon", "tag": "O Príncipe dos Pregadores", "cre": "Batista reformado; graça soberana; paixão evangelística", "forte": "Achar Cristo em cada texto; imagem viva; apelo à alma; frase inesquecível"}, {"id": "john-gill", "nome": "John Gill", "tag": "O erudito hebraico e rabínico", "cre": "Batista particular (calvinista); graça soberana; línguas a serviço da fé", "forte": "O fundo judaico-rabínico do texto; o Antigo Testamento aberto com chaves judaicas"}, {"id": "j-c-ryle", "nome": "J.C. Ryle", "tag": "A clareza fiel", "cre": "Anglicano evangélico; justificação pela fé; santidade prática", "forte": "Explicar com clareza simples e viril; santidade real; franqueza contra o pecado"}, {"id": "alexander-maclaren", "nome": "Alexander Maclaren", "tag": "O Príncipe dos Expositores", "cre": "Batista evangélico; exposição fiel ao texto original", "forte": "Transformar exegese em sermão bem estruturado; as divisões naturais do texto"}, {"id": "martyn-lloyd-jones", "nome": "Martyn Lloyd-Jones", "tag": "'The Doctor'", "cre": "Reformado experimental; soberania de Deus; anseio por avivamento e poder do Espírito", "forte": "Lógica + doutrina + experiência ('logic on fire'); diagnóstico da alma"}, {"id": "john-stott", "nome": "John Stott", "tag": "O equilíbrio e a aplicação", "cre": "Anglicano evangélico; centralidade da cruz; evangelicalismo sério", "forte": "Ponte entre o texto antigo e o mundo de hoje; sempre pergunta 'e daí?'"}, {"id": "d-a-carson", "nome": "D.A. Carson", "tag": "O bisturi exegético", "cre": "Batista reformado; inerrância; unidade canônica da Escritura", "forte": "Grego, estrutura, teologia bíblica; desmontar falácias exegéticas"}, {"id": "f-f-bruce", "nome": "F.F. Bruce", "tag": "O historiador da confiabilidade", "cre": "Evangélico conservador; confiabilidade histórica do NT", "forte": "Contexto histórico; Atos; provar que os documentos do NT são confiáveis"}, {"id": "john-macarthur", "nome": "John MacArthur", "tag": "Exposição verso a verso", "cre": "Batista reformado; inerrância e suficiência; salvação senhorial (é cessacionista)", "forte": "Precisão verso a verso; contexto gramatical-histórico; doutrina firme"}, {"id": "leon-morris", "nome": "Leon Morris", "tag": "O teólogo da cruz", "cre": "Anglicano evangélico; expiação substitutiva e propiciação", "forte": "A doutrina da cruz; o significado do sangue; João; Romanos"}, {"id": "r-c-sproul", "nome": "R.C. Sproul", "tag": "A santidade de Deus", "cre": "Presbiteriano reformado; soberania e santidade de Deus; inerrância", "forte": "Explicar doutrina densa de forma clara; ensino que leva à adoração"}, {"id": "douglas-moo", "nome": "Douglas Moo", "tag": "O especialista paulino", "cre": "Evangélico reformado; justificação forense pela fé", "forte": "Romanos e a justificação; defesa da leitura clássica contra a Nova Perspectiva"}, {"id": "g-k-beale", "nome": "G.K. Beale", "tag": "O uso do AT no NT", "cre": "Reformado; unidade da Escritura; a nova criação como alvo", "forte": "Tipologia e cumprimento; temas canônicos (templo, Éden); Apocalipse pelo AT"}, {"id": "warren-wiersbe", "nome": "Warren Wiersbe", "tag": "'Seja…' — o prático", "cre": "Batista evangélico; exposição fiel e acessível pro crente comum", "forte": "Estrutura clara, pontos memoráveis, palavra-chave que amarra o capítulo"}, {"id": "william-hendriksen", "nome": "William Hendriksen", "tag": "A espinha reformada", "cre": "Reformado; graça soberana; escatologia amilenista sóbria", "forte": "Exposição reformada clara; Apocalipse sem sensacionalismo"}, {"id": "j-alec-motyer", "nome": "J. Alec Motyer", "tag": "O profeta do AT", "cre": "Anglicano evangélico; o AT cristocêntrico; o Servo Sofredor", "forte": "Isaías e os profetas; as promessas do AT cumpridas em Cristo"}, {"id": "derek-kidner", "nome": "Derek Kidner", "tag": "O cirurgião conciso", "cre": "Anglicano evangélico; sensibilidade literária; exegese conservadora", "forte": "Salmos, Gênesis, Provérbios; o essencial afiado em pouco espaço"}, {"id": "bruce-waltke", "nome": "Bruce Waltke", "tag": "O hebraísta", "cre": "Reformado; inerrância; teologia do AT cristocêntrica", "forte": "Hebraico (sintaxe, palavra); Provérbios; a sabedoria e o temor do Senhor"}, {"id": "alfred-edersheim", "nome": "Alfred Edersheim", "tag": "A lente judaica dos Evangelhos", "cre": "Judeu convertido a Cristo; alta visão da Escritura; Jesus é o Messias prometido a Israel", "forte": "O NT dentro do 2º Templo — Templo, festas, sinagoga e costumes que abrem os Evangelhos"}, {"id": "david-h-stern", "nome": "David H. Stern", "tag": "As raízes judaicas do Novo Testamento", "cre": "Judeu messiânico; crê em Yeshua; alta visão da Escritura", "forte": "Ler o NT como documento judaico; nomes hebraicos; a unidade entre o Tanakh e o NT"}, {"id": "arnold-fruchtenbaum", "nome": "Arnold Fruchtenbaum", "tag": "Israel na profecia e a mente messiânica", "cre": "Judeu messiânico; hermenêutica literal-gramatical-histórica; pré-milenista", "forte": "Israel no plano de Deus; as festas de Levítico 23 como profecia; tipologia e escatologia"}, {"id": "michael-l-brown", "nome": "Michael L. Brown", "tag": "O hebraísta que responde às objeções", "cre": "Judeu messiânico; hebraísta (PhD/NYU); continuísta/carismático", "forte": "O hebraico do AT; as profecias messiânicas; responder às objeções judaicas a Jesus"}, {"id": "michael-rydelnik", "nome": "Michael Rydelnik", "tag": "O caçador do Messias no AT", "cre": "Judeu messiânico; professor do Moody; a Bíblia Hebraica é diretamente messiânica", "forte": "A esperança messiânica; Cristo direto no Antigo Testamento (Gênesis 3:15, Salmo 22)"}, {"id": "david-flusser", "nome": "David Flusser", "tag": "O mundo do 2º Templo (usado com filtro)", "cre": "Erudito judeu de Jerusalém — NÃO cristão; honra Jesus como mestre judeu, mas nega Sua divindade", "forte": "O mundo do 2º Templo e o Jesus histórico — a Pessoa de Cristo fica com a fé cristã e o Espírito"}];

const TIPOS = {
  estudo: {
    nome: 'Estudo do texto',
    ordem: `Forje um ESTUDO do texto, no método deste servo. Estrutura:
1) 🧭 O QUE O TEXTO DIZ — a ideia central em 2 ou 3 frases, do jeito que este servo abriria.
2) ⛏️ CAVANDO — 3 a 5 pontos do texto, cada um com um subtítulo curto em negrito e 3 a 6 frases de prosa densa (nada de tópico solto).
3) ✝️ ONDE ISSO APONTA PRA CRISTO — obrigatório.
4) 🙏 PRA VIVER HOJE — 3 aplicações concretas, de pastor pra ovelha.`
  },
  sermao: {
    nome: 'Esboço de sermão',
    ordem: `Forje um ESBOÇO DE SERMÃO pregável, no método deste servo. Estrutura:
1) 📌 TÍTULO — forte, curto, do jeito deste servo.
2) 🎯 TEXTO E PROPOSIÇÃO — a frase única que o sermão prova.
3) 🚪 INTRODUÇÃO — como este servo abriria (3 a 5 frases).
4) 🔨 PONTOS (3, com numeração romana) — cada um com o versículo, a explicação (4 a 6 frases) e uma ilustração ou imagem viva.
5) ✝️ CRISTO NO CENTRO — para onde o sermão converge.
6) 🔥 APELO FINAL — o chamado à decisão.`
  },
  palavra: {
    nome: 'Palavra no original',
    ordem: `Trabalhe as PALAVRAS NO ORIGINAL deste texto, no método deste servo. Estrutura:
1) 🔤 AS PALAVRAS-CHAVE — 2 a 4 palavras do hebraico ou grego que realmente estão no texto. Para cada uma: a palavra TRANSLITERADA em letras latinas (ex.: *pentekoste*, *dorea*, *chesed*), o que significa de verdade, e o que ela ABRE no texto.
⚠️ REGRA DA GRAFIA: escreva a palavra APENAS transliterada em letras latinas. NÃO escreva no alfabeto grego nem no hebraico — um acento ou uma letra trocada vira erro, e é melhor não arriscar. ⚠️ Se você não tiver CERTEZA de que a palavra está mesmo nesse texto, DIGA que vai trabalhar pelo sentido do texto em português e NÃO invente termo nenhum.
2) 💎 O QUE ISSO MUDA — o que o leitor comum não vê e passa a ver.
3) ✝️ CRISTO — para onde aponta.
4) 🙏 APLICAÇÃO — 2 ou 3 usos práticos no púlpito ou na vida.`
  },
  duvida: {
    nome: 'Tirar uma dúvida',
    ordem: `Responda a DÚVIDA do pastor, no método deste servo. Estrutura:
1) 📖 RESPOSTA DIRETA — sem rodeio, em 3 a 5 frases.
2) 📚 A BASE NA ESCRITURA — os textos que sustentam, explicados (não só citados).
3) ⚖️ SE FOR ASSUNTO DISPUTADO — diga com honestidade que há divergência, apresente os lados com respeito e oriente confirmar com o pastor e com a Palavra.
4) ✝️ CRISTO NO CENTRO.`
  }
};

const LEI = `⛔ TRAVAS INEGOCIÁVEIS (valem mais que impressionar):
- NUNCA invente NADA: nem versículo, nem citação, nem palavra no hebraico/grego, nem data, nome, número ou "fato histórico". Se não tiver CERTEZA, não inclua — trabalhe com o que o texto realmente diz. Verdadeiro é melhor que impressionante.
- Todo versículo citado (Livro capítulo:versículo) tem que EXISTIR e realmente dizer o que você afirma.
- NÃO copie nem reproduza trechos de livro, comentário ou sermão de ninguém. Você forja um texto NOVO e ORIGINAL, em português do Brasil, usando o MÉTODO do servo — não as palavras dele.
- NÃO finja ser a pessoa. Você não diz "eu, Spurgeon". Você escreve NO MÉTODO dele, na terceira pessoa quando precisar citá-lo.
- CRISTO SEMPRE NO CENTRO. Doutrina fiel, evangélica pentecostal (Assembleias de Deus): batismo no Espírito Santo, dons para hoje, santidade, autoridade da Escritura.
- O Espírito Santo é o verdadeiro Mestre (João 16:13). Nunca dê a impressão de que a ferramenta substitui a oração, o pastor ou a Palavra.
- Em ponto disputado, sinalize com humildade e mande confirmar com o pastor.
- Português do Brasil, prosa densa e pastoral, parágrafos de verdade (nada de lista solta sem carne). Use **negrito** só nos destaques.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let id = '', passagem = '', tipo = 'estudo';
  try {
    const b = await req.json();
    id = (b.erudito || '').toString().trim().slice(0, 60);
    passagem = (b.passagem || '').toString().trim().slice(0, 400);
    tipo = (b.tipo || 'estudo').toString().trim();
  } catch (_) {}

  const e = ERUDITOS.find((x) => x.id === id);
  if (!e) return new Response('Escolha um erudito da lista.', { status: 400, headers: CORS });
  if (!passagem) return new Response('Diga o texto ou o assunto (ex.: João 3, ou "ansiedade").', { status: 400, headers: CORS });
  const t = TIPOS[tipo] || TIPOS.estudo;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response('IA não configurada (falta OPENAI_API_KEY).', { status: 500, headers: CORS });

  const filtro = e.id === 'david-flusser'
    ? `\n\n🚨 ATENÇÃO ESPECIAL: este consultor é um erudito judeu que NÃO crê na divindade de Cristo. Use SOMENTE o que ele traz de pano de fundo do 2º Templo (costumes, Templo, festas, mundo judaico). A Pessoa, a divindade e a obra de Cristo ficam com a fé cristã e a doutrina AD — NUNCA reproduza a negação dele. Deixe isso claro numa linha no fim.`
    : '';

  const SYS = `Você trabalha no CONCÍLIO DOS EXPOSITORES do app RADAR, do pastor Elias (Assembleias de Deus, Brasil).

Sua tarefa nesta resposta é forjar um texto NOVO usando o MÉTODO de um servo específico que Deus usou:

▪ SERVO: ${e.nome}
▪ QUEM FOI: ${e.tag}
▪ O QUE ELE CRÊ: ${e.cre}
▪ FORTE EM: ${e.forte}

Escreva do jeito que ELE cavaria o texto — o olhar dele, as perguntas dele, a ênfase dele, o tipo de aplicação dele. Se o método dele for grego e estrutura, faça isso. Se for calor pastoral e frase que gruda, faça isso. Se for pano de fundo judaico, faça isso.${filtro}

${LEI}

FORMATO: use os cabeçalhos com emoji exatamente como pedidos abaixo. Comece direto no conteúdo (sem saudação e sem "claro!").`;

  const user = `${t.ordem}\n\nTEXTO / ASSUNTO DO PASTOR: ${passagem}`;

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        temperature: 0.5,
        max_tokens: 2200,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }],
      }),
    });
  } catch (_) {
    return new Response('Falha ao conectar na IA.', { status: 502, headers: CORS });
  }
  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => '');
    return new Response('Erro da IA: ' + txt.slice(0, 200), { status: 502, headers: CORS });
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
    } catch (_) {}
    try { await writer.close(); } catch (_) {}
  })();

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
