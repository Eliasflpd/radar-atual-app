export const config = { runtime: 'edge' };

// TODA a IA deste arquivo passa pela CASCATA (Groq → Cerebras → Gemini → DeepSeek →
// OpenAI). Era aqui que doía: com uma conta só, o dia em que ela secou levou junto o
// Concílio inteiro e o Escavador de Pérolas. Ver api/_lib/ia.js.
import { respostaStream, respostaTexto, respostaErro } from './ia.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };

// 41 eruditos do Concílio — gerado a partir de public/biblioteca/concilio/eruditos.json
const ERUDITOS = [{"id": "stanley-m-horton", "nome": "Stanley M. Horton", "tag": "Decano da teologia pentecostal (AD)", "cre": "Doutrina AD clássica; batismo no Espírito com línguas; dons e sobrenatural pra hoje", "forte": "Definir a ortodoxia pentecostal com rigor de seminário; Espírito Santo; Atos; Apocalipse"}, {"id": "gordon-d-fee", "nome": "Gordon D. Fee", "tag": "Exegeta pentecostal do texto grego", "cre": "Alta visão da Escritura; o Espírito que capacita; feroz contra o evangelho da prosperidade", "forte": "Rigor no grego, crítica textual, o Espírito nas cartas de Paulo, hermenêutica séria"}, {"id": "craig-s-keener", "nome": "Craig S. Keener", "tag": "O gigante do pano de fundo e dos milagres", "cre": "Continuísta; raiz nas Assembleias de Deus; defende os milagres com erudição", "forte": "Mundo do 1º século, contexto judaico/greco-romano, Atos, defender o sobrenatural"}, {"id": "french-l-arrington", "nome": "French L. Arrington", "tag": "O dogmata do Espírito", "cre": "Pentecostal clássico; batismo no Espírito com evidência; dons pra hoje", "forte": "A doutrina do Espírito Santo com base exegética; Lucas, Atos, Coríntios"}, {"id": "roger-stronstad", "nome": "Roger Stronstad", "tag": "A chave da pneumatologia lucana", "cre": "O dom do Espírito em Lucas-Atos é capacitação pra missão, subsequente à conversão", "forte": "Defesa exegética do batismo no Espírito; 'o sacerdócio profético de todos os crentes'"}, {"id": "myer-pearlman", "nome": "Myer Pearlman", "tag": "O pai da sistemática pentecostal", "cre": "Pentecostal clássico; as grandes doutrinas ditas de forma simples e ordenada", "forte": "Panorama de cada livro da Bíblia; fundamentos de doutrina AD claros"}, {"id": "donald-c-stamps", "nome": "Donald C. Stamps", "tag": "As notas que o Brasil inteiro lê (Bíblia de Estudo Pentecostal)", "cre": "Pentecostal; batismo no Espírito, dons, cura; forte ênfase em santidade e separação do mundo", "forte": "Nota de estudo utilizável no púlpito; artigos temáticos pentecostais"}, {"id": "antonio-gilberto", "nome": "Antônio Gilberto", "tag": "O didata-mor da CPAD", "cre": "Pentecostal AD; 'erudição e piedade'; inspiração da Escritura", "forte": "COMO ensinar a Bíblia na Escola Dominical; bibliologia; formar professores"}, {"id": "esequias-soares", "nome": "Esequias Soares", "tag": "Os originais e a apologética", "cre": "Pentecostal AD; inerrância; ortodoxia trinitariana firme", "forte": "Hebraico e grego; defesa da fé contra seitas (T. de Jeová, espiritismo, modismos)"}, {"id": "elienai-cabral", "nome": "Elienai Cabral", "tag": "O expositor paulino da CPAD", "cre": "Pentecostal AD; ênfase na vida cristã, conduta e mordomia", "forte": "Exposição das cartas de Paulo (Efésios, Romanos); vida prática da igreja"}, {"id": "severino-pedro-da-silva", "nome": "Severino Pedro da Silva", "tag": "Hebreus e as últimas coisas", "cre": "Pentecostal AD; premilenista; tipologia cristocêntrica", "forte": "Hebreus verso a verso; Apocalipse; escatologia; a superioridade de Cristo"}, {"id": "frank-m-boyd", "nome": "Frank M. Boyd", "tag": "O pioneiro doutrinário da AG", "cre": "Pentecostal AD; dispensacionalista; escatologia clássica", "forte": "As eras/dispensações; arrebatamento, tribulação, milênio; panorama do plano de Deus"}, {"id": "joao-calvino", "nome": "João Calvino", "tag": "O padrão-ouro da exegese reformada", "cre": "Reformado; soberania de Deus; graça soberana; autoridade suprema da Escritura", "forte": "Exegese clara e disciplinada (brevitas); revelar a mente do autor sagrado"}, {"id": "martinho-lutero", "nome": "Martinho Lutero", "tag": "O fogo da Reforma", "cre": "Luterano; justificação só pela fé, só pela graça, só Cristo, só a Escritura", "forte": "Lei e Evangelho; Cristo no centro; graça contra mérito; Gálatas, Gênesis"}, {"id": "john-owen", "nome": "John Owen", "tag": "O teólogo dos teólogos (puritano)", "cre": "Puritano reformado; expiação definida; a obra de Cristo; mortificação do pecado", "forte": "Profundidade sem fundo num texto; Hebreus; santidade; comunhão com Deus"}, {"id": "jonathan-edwards", "nome": "Jonathan Edwards", "tag": "A mente mais penetrante da América", "cre": "Reformado; a supremacia e a beleza de Deus; graça soberana; afetos santos", "forte": "Tipologia intensa; a glória de Deus; conexões teológicas que ninguém vê"}, {"id": "matthew-henry", "nome": "Matthew Henry", "tag": "O devocional-pastoral", "cre": "Puritano; glorificar a Deus em toda a vida; a Escritura como alimento da alma", "forte": "Lição prática e devocional de cada versículo; calor pastoral; aforismos que grudam"}, {"id": "charles-spurgeon", "nome": "Charles Spurgeon", "tag": "O Príncipe dos Pregadores", "cre": "Batista reformado; graça soberana; paixão evangelística", "forte": "Achar Cristo em cada texto; imagem viva; apelo à alma; frase inesquecível"}, {"id": "john-gill", "nome": "John Gill", "tag": "O erudito hebraico e rabínico", "cre": "Batista particular (calvinista); graça soberana; línguas a serviço da fé", "forte": "O fundo judaico-rabínico do texto; o Antigo Testamento aberto com chaves judaicas"}, {"id": "j-c-ryle", "nome": "J.C. Ryle", "tag": "A clareza fiel", "cre": "Anglicano evangélico; justificação pela fé; santidade prática", "forte": "Explicar com clareza simples e viril; santidade real; franqueza contra o pecado"}, {"id": "alexander-maclaren", "nome": "Alexander Maclaren", "tag": "O Príncipe dos Expositores", "cre": "Batista evangélico; exposição fiel ao texto original", "forte": "Transformar exegese em sermão bem estruturado; as divisões naturais do texto"}, {"id": "martyn-lloyd-jones", "nome": "Martyn Lloyd-Jones", "tag": "'The Doctor'", "cre": "Reformado experimental; soberania de Deus; anseio por avivamento e poder do Espírito", "forte": "Lógica + doutrina + experiência ('logic on fire'); diagnóstico da alma"}, {"id": "john-stott", "nome": "John Stott", "tag": "O equilíbrio e a aplicação", "cre": "Anglicano evangélico; centralidade da cruz; evangelicalismo sério", "forte": "Ponte entre o texto antigo e o mundo de hoje; sempre pergunta 'e daí?'"}, {"id": "d-a-carson", "nome": "D.A. Carson", "tag": "O bisturi exegético", "cre": "Batista reformado; inerrância; unidade canônica da Escritura", "forte": "Grego, estrutura, teologia bíblica; desmontar falácias exegéticas"}, {"id": "f-f-bruce", "nome": "F.F. Bruce", "tag": "O historiador da confiabilidade", "cre": "Evangélico conservador; confiabilidade histórica do NT", "forte": "Contexto histórico; Atos; provar que os documentos do NT são confiáveis"}, {"id": "john-macarthur", "nome": "John MacArthur", "tag": "Exposição verso a verso", "cre": "Batista reformado; inerrância e suficiência; salvação senhorial (é cessacionista)", "forte": "Precisão verso a verso; contexto gramatical-histórico; doutrina firme"}, {"id": "leon-morris", "nome": "Leon Morris", "tag": "O teólogo da cruz", "cre": "Anglicano evangélico; expiação substitutiva e propiciação", "forte": "A doutrina da cruz; o significado do sangue; João; Romanos"}, {"id": "r-c-sproul", "nome": "R.C. Sproul", "tag": "A santidade de Deus", "cre": "Presbiteriano reformado; soberania e santidade de Deus; inerrância", "forte": "Explicar doutrina densa de forma clara; ensino que leva à adoração"}, {"id": "douglas-moo", "nome": "Douglas Moo", "tag": "O especialista paulino", "cre": "Evangélico reformado; justificação forense pela fé", "forte": "Romanos e a justificação; defesa da leitura clássica contra a Nova Perspectiva"}, {"id": "g-k-beale", "nome": "G.K. Beale", "tag": "O uso do AT no NT", "cre": "Reformado; unidade da Escritura; a nova criação como alvo", "forte": "Tipologia e cumprimento; temas canônicos (templo, Éden); Apocalipse pelo AT"}, {"id": "warren-wiersbe", "nome": "Warren Wiersbe", "tag": "'Seja…' — o prático", "cre": "Batista evangélico; exposição fiel e acessível pro crente comum", "forte": "Estrutura clara, pontos memoráveis, palavra-chave que amarra o capítulo"}, {"id": "william-hendriksen", "nome": "William Hendriksen", "tag": "A espinha reformada", "cre": "Reformado; graça soberana; escatologia amilenista sóbria", "forte": "Exposição reformada clara; Apocalipse sem sensacionalismo"}, {"id": "j-alec-motyer", "nome": "J. Alec Motyer", "tag": "O profeta do AT", "cre": "Anglicano evangélico; o AT cristocêntrico; o Servo Sofredor", "forte": "Isaías e os profetas; as promessas do AT cumpridas em Cristo"}, {"id": "derek-kidner", "nome": "Derek Kidner", "tag": "O cirurgião conciso", "cre": "Anglicano evangélico; sensibilidade literária; exegese conservadora", "forte": "Salmos, Gênesis, Provérbios; o essencial afiado em pouco espaço"}, {"id": "bruce-waltke", "nome": "Bruce Waltke", "tag": "O hebraísta", "cre": "Reformado; inerrância; teologia do AT cristocêntrica", "forte": "Hebraico (sintaxe, palavra); Provérbios; a sabedoria e o temor do Senhor"}, {"id": "alfred-edersheim", "nome": "Alfred Edersheim", "tag": "A lente judaica dos Evangelhos", "cre": "Judeu convertido a Cristo; alta visão da Escritura; Jesus é o Messias prometido a Israel", "forte": "O NT dentro do 2º Templo — Templo, festas, sinagoga e costumes que abrem os Evangelhos"}, {"id": "david-h-stern", "nome": "David H. Stern", "tag": "As raízes judaicas do Novo Testamento", "cre": "Judeu messiânico; crê em Yeshua; alta visão da Escritura", "forte": "Ler o NT como documento judaico; nomes hebraicos; a unidade entre o Tanakh e o NT"}, {"id": "arnold-fruchtenbaum", "nome": "Arnold Fruchtenbaum", "tag": "Israel na profecia e a mente messiânica", "cre": "Judeu messiânico; hermenêutica literal-gramatical-histórica; pré-milenista", "forte": "Israel no plano de Deus; as festas de Levítico 23 como profecia; tipologia e escatologia"}, {"id": "michael-l-brown", "nome": "Michael L. Brown", "tag": "O hebraísta que responde às objeções", "cre": "Judeu messiânico; hebraísta (PhD/NYU); continuísta/carismático", "forte": "O hebraico do AT; as profecias messiânicas; responder às objeções judaicas a Jesus"}, {"id": "michael-rydelnik", "nome": "Michael Rydelnik", "tag": "O caçador do Messias no AT", "cre": "Judeu messiânico; professor do Moody; a Bíblia Hebraica é diretamente messiânica", "forte": "A esperança messiânica; Cristo direto no Antigo Testamento (Gênesis 3:15, Salmo 22)"}, {"id": "david-flusser", "nome": "David Flusser", "tag": "O mundo do 2º Templo (usado com filtro)", "cre": "Erudito judeu de Jerusalém — NÃO cristão; honra Jesus como mestre judeu, mas nega Sua divindade", "forte": "O mundo do 2º Templo e o Jesus histórico — a Pessoa de Cristo fica com a fé cristã e o Espírito"}];

// ═════════════════════════════════════════════════════════════════════════════
// CITAR A FONTE — o que separa este Concílio de um concorrente de graça
// ═════════════════════════════════════════════════════════════════════════════
// O problema: a resposta saía no método do mestre, mas sem dizer DE ONDE VEM.
// A solução NÃO pode ser "mande a IA citar" — IA solta inventa obra, capítulo e
// página com a maior cara de santa. Então a fonte não é escrita pela IA: ela é
// escrita por NÓS. A IA só aponta, com um marcador ([O2], [F3]), para um item de
// uma lista fechada que mandamos no prompt; o servidor troca o marcador pelo
// texto real da fonte. Marcador fora da lista some e vira aviso.
//
// ⚖️ LIMITE DE DIREITO AUTORAL: citamos a REFERÊNCIA (autor, obra, aula), NUNCA o
// texto do autor. O corpus é material de estudo privado do pastor; o que vai pra
// tela é a etiqueta da fonte, não o parágrafo dela.

// As OBRAS REAIS de cada servo. Fonte de verdade: o campo `obras_reais` das fichas
// em C:\Users\mc1ar\.claude\commands\expositores\agents\*.md.
// ⚠️ Esta lista é a ÚNICA coisa que o Concílio pode citar como obra. Não tem item
// aqui? Então o mestre diz que está aplicando o MÉTODO dele — e não cita nada.
// ⚠️ SEM PARÊNTESES nos rótulos: o front acha a fonte por "(📚 ... )" e um parêntese
// no meio do rótulo cortaria a etiqueta pela metade.
const OBRAS = {
  'stanley-m-horton': ['Teologia Sistemática — perspectiva pentecostal', 'Doutrinas Bíblicas, com W. Menzies', 'O que a Bíblia diz sobre o Espírito Santo', 'Isaías: o Profeta Messiânico', 'O Livro de Atos: o Vento do Espírito'],
  'gordon-d-fee': ['1 Coríntios — NICNT', 'Filipenses — NICNT', "God's Empowering Presence: o Espírito nas cartas de Paulo", 'Entendes o que lês?, com Douglas Stuart', 'The Disease of the Health and Wealth Gospels'],
  'craig-s-keener': ['Acts: An Exegetical Commentary, 4 vols.', 'Comentário do Contexto Bíblico — Novo Testamento, IVP', 'Comentário de João', 'Miracles, 2 vols.', 'Spirit Hermeneutics'],
  'french-l-arrington': ['Encountering the Holy Spirit', 'Christian Doctrine: A Pentecostal Perspective, 3 vols.', 'Comentários de Lucas, Atos, 1-2 Coríntios e 1 Timóteo'],
  'roger-stronstad': ['The Charismatic Theology of St. Luke', 'The Prophethood of All Believers'],
  'myer-pearlman': ['Conhecendo as Doutrinas da Bíblia', 'Através da Bíblia Livro por Livro', 'O Dom Celestial'],
  'donald-c-stamps': ['Bíblia de Estudo Pentecostal — notas de estudo', 'Bíblia de Estudo Pentecostal — os 77 artigos temáticos'],
  'antonio-gilberto': ['Manual da Escola Dominical', 'A Bíblia Através dos Séculos', 'Crescimento em Cristo', 'A Prática do Evangelismo Pessoal', 'Verdades Pentecostais'],
  'esequias-soares': ['Manual de Apologética Cristã', 'Heresias e Modismos', 'Como Responder às Testemunhas de Jeová', 'Estudo nos Evangelhos Sinóticos', 'Teologia Sistemática Pentecostal — capítulo A Doutrina de Deus'],
  'elienai-cabral': ['Comentário Bíblico de Efésios', 'Comentário Bíblico de Romanos', 'A Defesa do Apostolado de Paulo', 'Parábolas de Jesus', 'O Tabernáculo', 'O Pregador Eficaz', 'Mordomia Cristã'],
  'severino-pedro-da-silva': ['Comentário Bíblico — Epístola aos Hebreus', 'Apocalipse Versículo por Versículo', 'Escatologia — Doutrina das Últimas Coisas', 'Homilética', 'O Pregador e o Sermão', 'A Existência e a Pessoa do Espírito Santo'],
  'frank-m-boyd': ['Ages and Dispensations — As Eras e Dispensações', 'Studies in the Revelation of Jesus Christ', 'Estudos do Antigo Testamento, 3 vols.'],
  'joao-calvino': ['Comentários bíblicos de Calvino — quase toda a Bíblia', 'Harmonia dos Evangelhos Sinóticos', 'Institutas da Religião Cristã'],
  'martinho-lutero': ['Comentário à Epístola aos Gálatas — preleções de 1531', 'Comentário sobre Gênesis', 'A Liberdade do Cristão'],
  'john-owen': ['An Exposition of the Epistle to the Hebrews, 7 vols.', 'A Mortificação do Pecado', 'Sobre a Comunhão com Deus', 'A Glória de Cristo'],
  'jonathan-edwards': ['Notes on Scripture', 'a Blank Bible — mais de 5.000 anotações', 'A Dissertation Concerning the End for Which God Created the World', 'Afetos Religiosos', 'Pecadores nas Mãos de um Deus Irado'],
  'matthew-henry': ['Comentário Bíblico de Matthew Henry — Exposition of the Old and New Testaments'],
  'charles-spurgeon': ['The Treasury of David — comentário dos Salmos', 'Metropolitan Tabernacle Pulpit — os sermões', 'Lectures to My Students', 'Commenting and Commentaries', 'All of Grace'],
  'john-gill': ['An Exposition of the Entire Bible, 9 vols.', 'A Body of Doctrinal and Practical Divinity'],
  'j-c-ryle': ['Expository Thoughts on the Gospels, 7 vols.', 'Santidade — Holiness', 'Practical Religion'],
  'alexander-maclaren': ['Expositions of Holy Scripture'],
  'martyn-lloyd-jones': ['Estudos em Romanos, 14 vols.', 'Estudos em Efésios, 8 vols.', 'Estudos no Sermão do Monte', 'Depressão Espiritual', 'Pregação e Pregadores'],
  'john-stott': ['Série A Bíblia Fala Hoje — Romanos, Atos, Gálatas, Efésios, Sermão do Monte', 'Cristianismo Básico', 'A Cruz de Cristo'],
  'd-a-carson': ['The Gospel According to John — PNTC', "Comentário de Mateus — Expositor's Bible Commentary", 'New Bible Commentary, como coeditor', 'Exegetical Fallacies'],
  'f-f-bruce': ['The Book of the Acts — NICNT', 'The Epistle to the Hebrews — NICNT', 'Comentário de Gálatas — NIGTC', 'Os Documentos do Novo Testamento: São Confiáveis?'],
  'john-macarthur': ['The MacArthur New Testament Commentary, 34 vols.', 'Bíblia de Estudo MacArthur'],
  'leon-morris': ['The Gospel According to John — NICNT', 'Comentário de Romanos — PNTC', 'The Apostolic Preaching of the Cross'],
  'r-c-sproul': ['A Santidade de Deus', 'Eleitos por Deus', 'Todos são Teólogos', "Comentário de Romanos — série St. Andrew's"],
  'douglas-moo': ['The Epistle to the Romans — NICNT', 'Comentário de Tiago — PNTC', 'Colossenses e Filemom — PNTC'],
  'g-k-beale': ['The Book of Revelation — NIGTC', 'A New Testament Biblical Theology', 'Handbook on the New Testament Use of the Old Testament'],
  'warren-wiersbe': ['Série Seja / Be — 50 vols. cobrindo toda a Bíblia', 'The Bible Exposition Commentary'],
  'william-hendriksen': ['New Testament Commentary — série NTC', 'Mais que Vencedores — Apocalipse'],
  'j-alec-motyer': ['The Prophecy of Isaiah', 'A Mensagem de Amós — série A Bíblia Fala Hoje', 'The Message of Exodus'],
  'derek-kidner': ['Salmos — Tyndale, 2 vols.', 'Gênesis — Tyndale', 'Provérbios — Tyndale', 'Esdras e Neemias — Tyndale', 'A Mensagem de Jeremias'],
  'bruce-waltke': ['The Book of Proverbs — NICOT, 2 vols.', 'An Old Testament Theology', 'Genesis: A Commentary', 'An Introduction to Biblical Hebrew Syntax'],
  'alfred-edersheim': ['A Vida e os Tempos de Jesus, o Messias', 'O Templo: seu ministério e seus serviços no tempo de Jesus', 'Esboços da Vida Social Judaica', 'Bible History: Old Testament'],
  'david-h-stern': ['Novo Testamento Judaico', 'Comentário Judaico do Novo Testamento', 'Bíblia Judaica Completa', 'Restoring the Jewishness of the Gospel'],
  'arnold-fruchtenbaum': ['Israelology: The Missing Link in Systematic Theology', 'As Pegadas do Messias — The Footsteps of the Messiah', 'Messianic Christology', "Ariel's Bible Commentary", 'The Feasts and Fasts of Israel', 'Yeshua: The Life of Messiah'],
  'michael-l-brown': ['Answering Jewish Objections to Jesus, 5 vols.', "Israel's Divine Healer", "Comentário de Jeremias — Expositor's Bible Commentary", 'Verbetes no NIDOTTE', 'The Real Kosher Jesus'],
  'michael-rydelnik': ['The Messianic Hope: Is the Hebrew Bible Really Messianic?', 'The Moody Bible Commentary, como coeditor', 'The Moody Handbook of Messianic Prophecy, como editor-geral'],
  'david-flusser': ['Jesus — reeditado como The Sage from Galilee', 'Judaism and the Origins of Christianity', 'Judaism of the Second Temple Period', 'The Didache'],
};

// Parêntese dentro do rótulo quebraria a etiqueta "(📚 …)" que o front desenha.
const limparRotulo = (s) => String(s || '').replace(/\s*\(/g, ' — ').replace(/\)/g, '').replace(/\s{2,}/g, ' ').trim();

/**
 * Monta o bloco de prompt que ENSINA a citar e entrega a lista fechada de fontes.
 * @param {string} letra  'O' para obra de mestre, 'F' para pedaço do acervo do Wagner
 * @param {string[]} rotulos  os rótulos já prontos, na ordem (índice 0 = marcador 1)
 * @param {string} cabeca  a frase que apresenta a lista
 * @param {string} semFonte  o que escrever quando NÃO houver fonte apontável
 */
export function blocoDeFontes(letra, rotulos, cabeca, semFonte) {
  if (!rotulos || !rotulos.length) {
    return `\n\n════ CITAR A FONTE ════\nNesta resposta você NÃO tem nenhuma fonte catalogada em mãos. Então NÃO cite obra, aula, página nem minuto de coisa nenhuma — você inventaria. Escreva "${semFonte}" quando a afirmação for fruto do método, e sustente tudo na referência bíblica, que continua obrigatória.`;
  }
  const lista = rotulos.map((r, i) => `[${letra}${i + 1}] ${r}`).join('\n');
  return `\n\n════ CITAR A FONTE — é isto que separa este Concílio de um chute ════
${cabeca}
${lista}

COMO CITAR (leia devagar):
• Depois de uma afirmação de peso que venha de um desses itens, escreva SÓ o marcador, colado no fim da frase: [${letra}1]. Nada além do marcador.
• EXEMPLO do jeito CERTO:  "A figura só fecha porque a função é a mesma, e não a imagem. [${letra}1]"
  EXEMPLO do jeito ERRADO: "Como se vê na obra tal, página 42, ele afirma que…"  ← inventado, proibido.
• NÃO escreva o nome da obra/aula você mesmo. O sistema troca o marcador pela fonte real. Se você escrever de cabeça, vira invenção.
• 📌 OBRIGATÓRIO: a resposta tem que sair com PELO MENOS UM marcador — e no máximo 4. Marcador é para o que sustenta, não para enfeitar. Escolha o item da lista que realmente sustenta o seu ponto mais forte e marque ali.

⛔ PROIBIDO (isto é pior do que não citar):
• Inventar obra, aula, capítulo, página, ano, tomo, edição ou "minuto tal". Se não está na lista acima, não existe.
• Usar marcador com número que não está na lista.
• 🚫 PÔR FRASE ENTRE ASPAS COMO SE FOSSE DO AUTOR. Nenhuma. Zero. Você NÃO tem o texto dele na mão, então qualquer "frase dele" que você escrever é inventada, por mais que soe com a cara dele. Diga o PENSAMENTO com as suas palavras e marque a fonte — isso é citar. Aspas com nome em cima é falsificação.
• Reproduzir parágrafo, trecho ou sentença do autor ou do material de apoio. O que vai pra tela é a REFERÊNCIA, nunca o texto dele.

✅ QUANDO NÃO HOUVER FONTE: escreva com todas as letras "${semFonte}" e NÃO use marcador nenhum. Isso é honestidade, e o pastor confia mais nisso do que numa citação bonita e falsa.
✅ A referência bíblica (livro capítulo:versículo) continua obrigatória e vale sempre — ela é a fonte que nunca falta.`;
}

/**
 * Troca [O2] / [F7] pelo texto real da fonte. Marcador fora da lista é APAGADO
 * (nunca chega ao pastor) e sai contado em `inventados`.
 */
export function trocarFontes(texto, rotulos) {
  let inventados = 0;
  const usadas = [];
  // Aceita [F3], 【F3】 e também (F3): visto em produção, o modelo troca o colchete
  // por parêntese na metade das vezes. Sem isto, "(F7)" vazava cru pra tela.
  const out = String(texto || '').replace(/[[【(]\s*([OF])\s*[-–]?\s*(\d{1,2})\s*[\]】)]/gi, (_m, _l, n) => {
    const r = rotulos && rotulos[Number(n) - 1];
    if (!r) { inventados++; return ''; }
    if (usadas.indexOf(r) < 0) usadas.push(r);
    return ` (📚 ${r})`;
  }).replace(/ {2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1');
  // Vários pedaços da MESMA aula dão a mesma etiqueta; sem isto a seção "DE ONDE VEM"
  // repetia "Aula X — transcrição" duas e três vezes seguidas. Uma linha, uma fonte.
  const semRepetir = out.split('\n').map((linha) => {
    const vistos = new Set();
    return linha.replace(/ ?\(📚 ([^)]+)\)/g, (m, r) => (vistos.has(r) ? '' : (vistos.add(r), m)));
  }).join('\n');
  return { texto: semRepetir, usadas, inventados };
}

// Rede anti-invenção: a IA pode tentar citar fonte POR FORA do marcador ("na aula de
// Escatologia ele mostra…", "página 340", "no minuto 12"). Tudo que for citação de
// fonte e não tiver a etiqueta 📚 do sistema ao lado é suspeito e vira aviso.
const SUSPEITA = [
  [/\b(?:n[ao]s?|d[ao]s?)\s+aulas?\s+(?:de|sobre|do|da)\s+\S/i, 'citou uma aula sem marcador'],
  [/\bem\s+(?:seu|sua)\s+(?:livro|obra|coment[áa]rio|tratado)\b/i, 'citou "seu livro/comentário" sem marcador'],
  [/\bp[áa]g(?:ina)?s?\.?\s*\d/i, 'citou número de página'],
  [/\bminuto\s*\d/i, 'citou minuto de aula'],
  [/\b(?:vol(?:ume)?\.?|tomo)\s*[\dIVX]/i, 'citou volume/tomo'],
];
export function conferirFontes(texto, inventados) {
  const avisos = [];
  if (inventados) avisos.push('fonte-inventada: ' + inventados + ' marcador(es) fora da lista foram apagados da resposta.');
  // Aspas longas = "frase do autor" que ninguém conferiu. Não temos o texto dele na
  // mão; o que soa como ele foi escrito pela IA. Acusa e não esconde.
  // ⚠️ Citar a ESCRITURA entre aspas é legítimo e acontece o tempo todo — por isso só
  // acusamos quando não há referência bíblica (cap:verso) por perto das aspas.
  const t = String(texto || '');
  const aspas = /[“"][^”"]{55,}[”"]/g;
  for (let m; (m = aspas.exec(t));) {
    const volta = t.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
    if (/\d+\s*[:.]\s*\d+/.test(volta)) continue;   // é versículo, não é fala de autor
    avisos.push('citacao-literal: a resposta pôs uma frase longa entre aspas como se fosse do autor — não temos o texto dele, então isso não pode ir ao púlpito sem conferir.');
    break;
  }
  for (const frase of String(texto || '').split(/(?<=[.!?\n])/)) {
    if (frase.indexOf('📚') >= 0) continue;
    for (const [re, quê] of SUSPEITA) {
      if (re.test(frase)) { avisos.push('fonte-solta: ' + quê + ' — confira antes de pregar.'); break; }
    }
    if (avisos.length > 3) break;
  }
  return avisos;
}

// ═════════════════════════════════════════════════════════════════════════════
// AS OUTRAS DUAS INVENÇÕES — a palavra no original e o versículo entre aspas
// ═════════════════════════════════════════════════════════════════════════════
// A fonte já está travada (a IA aponta um marcador, o servidor escreve a fonte).
// Provando em produção sobraram DUAS portas, e nenhuma delas se fecha com pedido
// solto no prompt — os modelos rápidos da cascata só obedecem quando a coisa vira
// seção obrigatória do formato ou quando o servidor confere depois:
//
// 1) PALAVRA NO ORIGINAL INVENTADA. Gênesis 1:1 voltou com "o grego ποιεῖν" —
//    Gênesis é HEBRAICO, e alfabeto grego é proibido na casa. Agora: a regra da
//    grafia saiu do tipo "palavra" e subiu pra LEI (vale em todos os tipos); o
//    servidor CALCULA o idioma do texto consultado e manda no prompt ("Gênesis →
//    hebraico, é proibido dizer que é grego"); e o que escapar em alfabeto grego
//    ou hebraico é TRANSLITERADO na saída, com aviso em cima.
//
// 2) VERSÍCULO ENTRE ASPAS DIZENDO O QUE NÃO ESTÁ ESCRITO. Levítico 23:10-12 saiu
//    entre aspas "listando" uvas, trigo, cevada, romãs e figas — não lista nada
//    disso. Aqui o servidor ABRE A BÍBLIA de verdade (public/biblia.json, a mesma
//    que o app usa no leitor) e confere palavra por palavra.

// ── Os 66 livros: sigla do biblia.json, nome pra tela e o testamento ──────────
// ⚠️ 'jo' é João e 'jó' é Jó — é assim no biblia.json. O desempate é o acento.
const LIVRO_NOME = {
  gn: 'Gênesis', ex: 'Êxodo', lv: 'Levítico', nm: 'Números', dt: 'Deuteronômio', js: 'Josué',
  jz: 'Juízes', rt: 'Rute', '1sm': '1 Samuel', '2sm': '2 Samuel', '1rs': '1 Reis', '2rs': '2 Reis',
  '1cr': '1 Crônicas', '2cr': '2 Crônicas', ed: 'Esdras', ne: 'Neemias', et: 'Ester', 'jó': 'Jó',
  sl: 'Salmos', pv: 'Provérbios', ec: 'Eclesiastes', ct: 'Cânticos', is: 'Isaías', jr: 'Jeremias',
  lm: 'Lamentações', ez: 'Ezequiel', dn: 'Daniel', os: 'Oséias', jl: 'Joel', am: 'Amós',
  ob: 'Obadias', jn: 'Jonas', mq: 'Miquéias', na: 'Naum', hc: 'Habacuque', sf: 'Sofonias',
  ag: 'Ageu', zc: 'Zacarias', ml: 'Malaquias', mt: 'Mateus', mc: 'Marcos', lc: 'Lucas',
  jo: 'João', atos: 'Atos', rm: 'Romanos', '1co': '1 Coríntios', '2co': '2 Coríntios',
  gl: 'Gálatas', ef: 'Efésios', fp: 'Filipenses', cl: 'Colossenses', '1ts': '1 Tessalonicenses',
  '2ts': '2 Tessalonicenses', '1tm': '1 Timóteo', '2tm': '2 Timóteo', tt: 'Tito', fm: 'Filemom',
  hb: 'Hebreus', tg: 'Tiago', '1pe': '1 Pedro', '2pe': '2 Pedro', '1jo': '1 João', '2jo': '2 João',
  '3jo': '3 João', jd: 'Judas', ap: 'Apocalipse',
};
// Novo Testamento = grego. Todo o resto é hebraico (com aramaico em pedaços de Daniel e Esdras).
const NT = new Set(['mt', 'mc', 'lc', 'jo', 'atos', 'rm', '1co', '2co', 'gl', 'ef', 'fp', 'cl',
  '1ts', '2ts', '1tm', '2tm', 'tt', 'fm', 'hb', 'tg', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd', 'ap']);
const ARAMAICO = new Set(['dn', 'ed']);

const ABREV = {
  genesis: 'gn', gn: 'gn', gen: 'gn', exodo: 'ex', ex: 'ex', levitico: 'lv', lv: 'lv', lev: 'lv',
  numeros: 'nm', nm: 'nm', num: 'nm', deuteronomio: 'dt', dt: 'dt', deut: 'dt', josue: 'js', js: 'js',
  juizes: 'jz', jz: 'jz', rute: 'rt', rt: 'rt', '1samuel': '1sm', '1sm': '1sm', '1sam': '1sm',
  '2samuel': '2sm', '2sm': '2sm', '2sam': '2sm', '1reis': '1rs', '1rs': '1rs', '2reis': '2rs', '2rs': '2rs',
  '1cronicas': '1cr', '1cr': '1cr', '2cronicas': '2cr', '2cr': '2cr', esdras: 'ed', ed: 'ed', esd: 'ed',
  neemias: 'ne', ne: 'ne', ester: 'et', et: 'et', job: 'jó', salmos: 'sl', salmo: 'sl', sl: 'sl', sal: 'sl',
  proverbios: 'pv', pv: 'pv', prov: 'pv', eclesiastes: 'ec', ec: 'ec', ecl: 'ec', cantares: 'ct',
  canticos: 'ct', cantico: 'ct', ct: 'ct', isaias: 'is', is: 'is', isa: 'is', jeremias: 'jr', jr: 'jr',
  jer: 'jr', lamentacoes: 'lm', lm: 'lm', ezequiel: 'ez', ez: 'ez', daniel: 'dn', dn: 'dn', dan: 'dn',
  oseias: 'os', os: 'os', joel: 'jl', jl: 'jl', amos: 'am', am: 'am', obadias: 'ob', ob: 'ob',
  jonas: 'jn', jn: 'jn', miqueias: 'mq', mq: 'mq', naum: 'na', na: 'na', habacuque: 'hc', hc: 'hc',
  sofonias: 'sf', sf: 'sf', ageu: 'ag', ag: 'ag', zacarias: 'zc', zc: 'zc', malaquias: 'ml', ml: 'ml',
  mateus: 'mt', mt: 'mt', mat: 'mt', marcos: 'mc', mc: 'mc', lucas: 'lc', lc: 'lc', luc: 'lc',
  joao: 'jo', atos: 'atos', at: 'atos', romanos: 'rm', rm: 'rm', rom: 'rm',
  '1corintios': '1co', '1co': '1co', '1cor': '1co', '2corintios': '2co', '2co': '2co', '2cor': '2co',
  galatas: 'gl', gl: 'gl', efesios: 'ef', ef: 'ef', filipenses: 'fp', fp: 'fp', colossenses: 'cl', cl: 'cl',
  '1tessalonicenses': '1ts', '1ts': '1ts', '2tessalonicenses': '2ts', '2ts': '2ts',
  '1timoteo': '1tm', '1tm': '1tm', '2timoteo': '2tm', '2tm': '2tm', tito: 'tt', tt: 'tt',
  filemom: 'fm', fm: 'fm', hebreus: 'hb', hb: 'hb', tiago: 'tg', tg: 'tg',
  '1pedro': '1pe', '1pe': '1pe', '2pedro': '2pe', '2pe': '2pe', '1joao': '1jo', '1jo': '1jo',
  '2joao': '2jo', '2jo': '2jo', '3joao': '3jo', '3jo': '3jo', judas: 'jd', jd: 'jd',
  apocalipse: 'ap', ap: 'ap', apoc: 'ap',
};

const semAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const chaveLivro = (num, palavra) => {
  const p = semAcentos(palavra).toLowerCase().replace(/[^a-z]/g, '');
  // "Jó" e "João" caem na mesma chave depois de tirar o acento — o acento é o desempate.
  if (p === 'jo') return /ó/i.test(palavra) ? 'jó' : 'jo';
  return (num ? String(num).replace(/[^123]/g, '') : '') + p;
};

// Referência COM versículo ("Levítico 23:10-12", "1Co 15:20", "Gn 1.1"). Só com
// versículo: é o que dá pra conferir contra o texto sagrado.
// ⚠️ O tracinho do intervalo NÃO é só o "-" do teclado: a IA escreve "João 1:1‑3"
// com hífen não-separável e "Cl 1:16—17" com travessão. Pegar só o "-" cortava o
// intervalo em 1:1, e aí a citação certa do versículo 3 era acusada de falsa.
const TRACO = '[-‐-―−]';
const RE_REF = new RegExp('(?:^|[^\\wÀ-ÿ])([123]|I{1,3})?\\s*[ªº°]?\\s*([A-Za-zÀ-ÿ]{2,16})\\.?\\s*(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?:\\s*(?:' + TRACO + '|a)\\s*(\\d{1,3}))?', 'g');

/** Toda referência bíblica resolvível dentro de um texto. */
function acharReferencias(texto) {
  const out = [];
  const t = String(texto || '');
  RE_REF.lastIndex = 0;
  for (let m; (m = RE_REF.exec(t));) {
    const romano = { i: 1, ii: 2, iii: 3 }[String(m[1] || '').toLowerCase()];
    const ab = ABREV[chaveLivro(romano || m[1], m[2])];
    if (!ab) continue;
    const bruto = m[0].replace(/^[^\wÀ-ÿ]+/, '');
    out.push({
      abbrev: ab, cap: +m[3], v1: +m[4], v2: m[5] ? +m[5] : +m[4],
      bruto, ini: m.index + (m[0].length - bruto.length), fim: m.index + m[0].length,
    });
  }
  return out;
}

/**
 * Os livros que o pedido do pastor menciona — inclusive sem versículo ("João 3",
 * "Levítico", "primícias em Gênesis"). É daqui que sai o IDIOMA do original.
 * Sigla de 2 letras só conta com número colado (senão "os", "na", "am" e "is"
 * transformariam prosa em português em citação bíblica).
 */
function livrosCitados(texto) {
  const t = String(texto || '');
  const achados = [];
  const por = (ab) => { if (ab && LIVRO_NOME[ab] && achados.indexOf(ab) < 0) achados.push(ab); };
  // Duas passadas: (1) nome por extenso, que vale sozinho; (2) sigla curta, que só
  // vale com número colado e começando em maiúscula.
  for (const re of [/(?:^|[^\wÀ-ÿ])([123]|I{1,3})?\s*[ªº°]?\s*([A-Za-zÀ-ÿ]{5,16})/g,
    /(?:^|[^\wÀ-ÿ])([123]|I{1,3})?\s*[ªº°]?\s*([A-ZÀ-Ý][a-zà-ÿ]?[A-Za-zÀ-ÿ]{0,2})\.?\s*\d{1,3}\b/g]) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(t));) {
      const romano = { i: 1, ii: 2, iii: 3 }[String(m[1] || '').toLowerCase()];
      por(ABREV[chaveLivro(romano || m[1], m[2])]);
      if (achados.length >= 6) break;
    }
  }
  return achados;
}

/**
 * O BLOCO DO ORIGINAL — a regra da grafia + o idioma CALCULADO pelo servidor.
 * Não é pedido: é fato. "Gênesis é Antigo Testamento, logo o original é hebraico,
 * logo é proibido dizer que a palavra é grega." Era exatamente por essa fresta que
 * "o grego ποιεῖν em Gênesis 1:1" passava.
 */
export function blocoDoOriginal(assunto) {
  const livros = livrosCitados(assunto);
  let alvo = '';
  if (livros.length) {
    alvo = '\nO TEXTO DESTA CONSULTA (o servidor conferiu, não é chute):\n' + livros.slice(0, 4).map((ab) => {
      const nt = NT.has(ab);
      return `• ${LIVRO_NOME[ab]} → ${nt ? 'NOVO TESTAMENTO → o original é GREGO. É PROIBIDO dizer que uma palavra deste texto é hebraica'
        : 'ANTIGO TESTAMENTO → o original é HEBRAICO' + (ARAMAICO.has(ab) ? ' (com trechos em aramaico)' : '') + '. É PROIBIDO dizer que uma palavra deste texto é grega'}.`;
    }).join('\n');
  }
  return `\n\n════ A PALAVRA NO ORIGINAL — TRAVA ════
⚠️ GRAFIA: escreva a palavra do original APENAS TRANSLITERADA em letras latinas (ex.: *bara*, *chesed*, *aparche*, *dorea*). É PROIBIDO escrever em alfabeto hebraico ou grego — o servidor translitera à força o que escapar, e uma letra trocada vira erro no púlpito.
⚠️ IDIOMA: Antigo Testamento = hebraico (aramaico em partes de Daniel e Esdras). Novo Testamento = grego. NUNCA diga que uma palavra do AT é grega, nem que uma palavra do NT é hebraica.${alvo}
⚠️ CERTEZA: só escreva palavra do original se você souber o livro, o capítulo e o versículo EXATOS onde ela está. Se não souber, NÃO escreva termo nenhum — trabalhe pelo sentido do texto em português e diga que está fazendo isso. Palavra inventada é pior do que palavra nenhuma.`;
}

// ── TRANSLITERAÇÃO FORÇADA — o que escapar em alfabeto grego/hebraico não chega
// ao pastor naquele alfabeto. Some a grafia proibida; a palavra continua legível.
const MAPA_GREGO = { α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'e', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'o', ϐ: 'b', ϑ: 'th', ϒ: 'y' };
const MAPA_HEBRAICO = { 'א': "'", 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': "'", 'פ': 'p', 'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'q', 'ר': 'r', 'ש': 'sh', 'ת': 't' };
// O hebraico é consonantal: sem os pontos vocálicos, בָּרָא viraria "br". Como o
// modelo quase sempre escreve com niqqud, lemos os pontos e devolvemos "bara".
const NIQQUD = { 'ָ': 'a', 'ַ': 'a', 'ֲ': 'a', 'ֶ': 'e', 'ֵ': 'e', 'ֱ': 'e', 'ְ': '', 'ִ': 'i', 'ֹ': 'o', 'ֳ': 'o', 'ֺ': 'o', 'ֻ': 'u', 'ׁ': '', 'ׂ': '', 'ּ': '' };
const RUN_GREGO = /[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯͅʼ'’]*/g;
const RUN_HEBRAICO = /[֐-״יִ-ﭏ][֐-״יִ-ﭏʼ'’]*/g;
const TEM_ALFABETO_ESTRANGEIRO = /[Ͱ-Ͽἀ-῿֐-״יִ-ﭏ]/;

function romanizar(run, mapa, ehGrego) {
  const cs = [...run.normalize('NFD')];
  // espírito rude (ἁ, ῥ) vira o "h" que a transliteração clássica escreve
  const rude = ehGrego && run.normalize('NFD').indexOf('̔') >= 0;
  let out = '';
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i], prox = cs[i + 1] || '';
    if (!ehGrego) {
      // ו é vav, mas com shuruq (וּ) é "u" e com holam (וֹ) é "o" — sem isto,
      // רוּחַ sairia "rvcha" em vez de "ruach".
      if (c === 'ו' && prox === 'ּ') { out += 'u'; i++; continue; }
      if (c === 'ו' && prox === 'ֹ') { out += 'o'; i++; continue; }
      // י depois de hiriq é mater lectionis: já viramos "i", não repita o "y"
      // (senão תָּמִיד vira "tamiyd" em vez de "tamid").
      if (c === 'י' && /i$/.test(out) && NIQQUD[prox] === undefined) continue;
      // patah furtivo: רוּחַ é "ruach", não "rucha" — a vogal soa ANTES da gutural.
      if (c === 'ַ' && i === cs.length - 1 && /(ch|')$/.test(out)) {
        out = out.replace(/(ch|')$/, 'a$1'); continue;
      }
      if (NIQQUD[c] !== undefined) { out += NIQQUD[c]; continue; }
      if (c >= '֑' && c <= 'ׇ') continue;    // cantilação e o que sobrou do niqqud
    } else {
      // ditongo: αυ/ευ/ου é "au/eu/ou"; υ sozinho é "y" (pneuma, não pneyma)
      if ((c === 'υ' || c === 'Υ') && /[aeo]$/.test(out)) { out += 'u'; continue; }
    }
    if (c >= '̀' && c <= 'ͯ') continue;      // acentos e espíritos: fora
    if (c === 'ͅ' || c === 'ʼ') continue;     // iota subscrito, apóstrofo modificador
    const base = mapa[c.toLowerCase()];
    if (base === undefined) { if (/[a-z0-9]/i.test(c)) out += c; continue; }
    out += (c === c.toLowerCase() ? base : base.charAt(0).toUpperCase() + base.slice(1));
  }
  out = (rude ? 'h' : '') + out;
  return out.replace(/^'+|'+$/g, '') || '';
}

/** Devolve { texto, trocou }. Roda em cima de pedaço de stream sem problema: a
 *  troca é por caractere, então marcador partido no meio não estraga nada. */
export function transliterarOriginal(texto) {
  let trocou = false;
  let t = String(texto || '');
  if (!TEM_ALFABETO_ESTRANGEIRO.test(t)) return { texto: t, trocou: false };
  t = t.replace(RUN_GREGO, (r) => { const v = romanizar(r, MAPA_GREGO, true); trocou = true; return v; });
  t = t.replace(RUN_HEBRAICO, (r) => { const v = romanizar(r, MAPA_HEBRAICO, false); trocou = true; return v; });
  return { texto: t.replace(/\*\s*\*/g, '').replace(/ {2,}/g, ' '), trocou };
}

/**
 * Confere a PALAVRA NO ORIGINAL contra o idioma do texto consultado.
 * `assunto` é o que o pastor pediu — é dali que sai o testamento.
 */
export function conferirOriginal(texto, assunto, jaTransliterou) {
  const avisos = [];
  const t = String(texto || '');
  if (jaTransliterou || TEM_ALFABETO_ESTRANGEIRO.test(t)) {
    avisos.push('grafia-original: a resposta veio com palavra em alfabeto grego/hebraico (proibido na casa). O sistema transliterou em letras latinas — mas quem escreve no alfabeto original costuma estar chutando a palavra. CONFIRA o termo antes de pregar.');
  }
  const livros = livrosCitados(assunto);
  if (!livros.length) return avisos;
  const soAT = livros.every((ab) => !NT.has(ab));
  const soNT = livros.every((ab) => NT.has(ab));
  const livrosNaResposta = livrosCitados(t);
  if (soAT && /\bgreg[oa]s?\b|\bkoin[eê]\b|\bsetuaginta\b/i.test(t)) {
    // pode ser legítimo se a resposta puxou um texto do NT pra comparar
    if (!livrosNaResposta.some((ab) => NT.has(ab))) {
      avisos.push(`lingua-do-original: o texto da consulta é ${livros.map((a) => LIVRO_NOME[a]).join(', ')} — Antigo Testamento, original em HEBRAICO —, mas a resposta falou em GREGO. Palavra grega em texto hebraico é invenção. NÃO leve ao púlpito.`);
    }
  } else if (soNT && /\bhebraic[oa]s?\b|\baramaic[oa]s?\b/i.test(t)) {
    if (!livrosNaResposta.some((ab) => !NT.has(ab))) {
      avisos.push(`lingua-do-original: o texto da consulta é ${livros.map((a) => LIVRO_NOME[a]).join(', ')} — Novo Testamento, original em GREGO —, mas a resposta falou em HEBRAICO sem citar nenhum texto do Antigo. Confira o termo.`);
    }
  }
  return avisos;
}

// ── A BÍBLIA DE VERDADE ──────────────────────────────────────────────────────
// public/biblia.json (Almeida) é a MESMA base que o leitor do app usa. Carregada
// uma vez por instância e guardada em memória do módulo; se falhar, a conferência
// simplesmente não acontece — nunca derruba a resposta do pastor.
let BIBLIA = null, BIBLIA_P = null;
export function carregarBiblia(origem) {
  if (BIBLIA) return Promise.resolve(BIBLIA);
  if (BIBLIA_P) return BIBLIA_P;
  if (!origem) return Promise.resolve(null);
  BIBLIA_P = (async () => {
    try {
      const r = await fetch(origem + '/biblia.json');
      if (!r.ok) return null;
      const arr = JSON.parse((await r.text()).replace(/^﻿/, ''));
      if (!Array.isArray(arr) || arr.length < 60) return null;
      const idx = {};
      for (const l of arr) idx[l.abbrev] = l.chapters;
      BIBLIA = idx;
      return BIBLIA;
    } catch (_) { return null; } finally { BIBLIA_P = null; }
  })();
  return BIBLIA_P;
}

/** O texto real de uma referência. null quando a referência NÃO EXISTE. */
function textoDoVersiculo(biblia, r) {
  const caps = biblia && biblia[r.abbrev];
  if (!caps || !caps[r.cap - 1]) return null;
  const vs = caps[r.cap - 1];
  if (!vs[r.v1 - 1]) return null;
  const fim = Math.min(r.v2 || r.v1, vs.length);
  return vs.slice(r.v1 - 1, fim).join(' ');
}

const VAZIAS_PT = new Set(('a o e de da do das dos que em um uma para por com sem sobre como mais nao sim se ao aos as os na no nas nos pelo pela ser estar ter foi era sao eram esta isso isto aquele este eu voce ele ela nos eles seu sua meu minha quando onde qual quem porque pois entao mas ou nem ate desde entre depois antes ainda so apenas cada todo toda todos todas outro qualquer nada tudo vez vezes dia dias deus senhor disse diz vos vossa vosso teu tua lhe lhes ha').split(' '));
const conteudo = (s) => semAcentos(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((p) => p.length >= 3 && !VAZIAS_PT.has(p));
const radical = (p) => (p.length > 5 ? p.slice(0, p.length - 2) : p);

/**
 * TRAVA DO VERSÍCULO. Três conferências, todas contra o texto sagrado de verdade:
 *  a) a referência EXISTE (capítulo e versículo dentro do livro)?
 *  b) o que está ENTRE ASPAS colado nela é mesmo o que está escrito ali?
 *  c) o assunto que a resposta diz estar naquele endereço está mesmo lá? Quando não
 *     está, e a palavra aparece em OUTRO endereço do mesmo livro, devolvemos o
 *     endereço certo — avisar é bom, apontar onde é melhor.
 */
export async function conferirVersiculos(texto, origem, assunto) {
  const t = String(texto || '');
  const refs = acharReferencias(t);
  if (!refs.length) return [];
  let biblia = null;
  try {
    biblia = await Promise.race([carregarBiblia(origem), new Promise((ok) => setTimeout(() => ok(null), 4000))]);
  } catch (_) { biblia = null; }
  if (!biblia) return [];
  const avisos = [];
  const visto = new Set();

  // a) a referência existe?
  for (const r of refs) {
    const k = r.abbrev + r.cap + ':' + r.v1 + '-' + r.v2;
    if (visto.has(k)) continue;
    visto.add(k);
    if (textoDoVersiculo(biblia, r) === null) {
      avisos.push(`versiculo-inexistente: "${r.bruto}" não existe na Bíblia (${LIVRO_NOME[r.abbrev]} não tem esse capítulo/versículo). A resposta citou um endereço que a igreja não vai achar.`);
      if (avisos.length >= 4) return avisos;
    }
  }

  // b) aspas coladas numa referência: bate com o que está escrito?
  const aspas = /[“"]([^”"\n]{25,400})[”"]/g;
  for (let m; (m = aspas.exec(t));) {
    const jan = { ini: Math.max(0, m.index - 130), fim: m.index + m[0].length + 130 };
    const perto = acharReferencias(t.slice(jan.ini, jan.fim));
    if (!perto.length) continue;
    const palavras = conteudo(m[1]);
    if (palavras.length < 4) continue;
    const casa = (txt) => {
      const bruto = ' ' + semAcentos(txt).toLowerCase().replace(/[^a-z0-9]/g, ' ') + ' ';
      return palavras.filter((p) => bruto.indexOf(' ' + radical(p)) >= 0).length / palavras.length;
    };
    let melhor = 0, alvo = perto[0];
    for (const r of perto) {
      const real = textoDoVersiculo(biblia, r);
      if (real === null) continue;
      const bate = casa(real);
      if (bate > melhor) { melhor = bate; alvo = r; }
    }
    if (melhor < 0.55) {
      // Antes de acusar: o texto está no CAPÍTULO citado, só que em outro versículo?
      // Aí não é invenção, é endereço torto — e o útil é dar o número certo.
      const caps = (biblia[alvo.abbrev] || [])[alvo.cap - 1] || [];
      let certo = 0, nCerto = 0;
      for (let v = 0; v < caps.length; v++) { const b = casa(caps[v]); if (b > certo) { certo = b; nCerto = v + 1; } }
      if (certo >= 0.6) {
        avisos.push(`versiculo-trocado: o texto entre aspas não é ${alvo.bruto} — é ${LIVRO_NOME[alvo.abbrev]} ${alvo.cap}:${nCerto}. Corrija a referência antes de pregar.`);
      } else {
        const real = textoDoVersiculo(biblia, alvo);
        avisos.push(`versiculo-nao-bate: a resposta pôs entre aspas, como sendo ${alvo.bruto}, um texto que NÃO está escrito lá. ${alvo.bruto} diz: "${String(real || '').slice(0, 190)}${(real || '').length > 190 ? '…' : ''}". Não pregue essa citação.`);
      }
      if (avisos.length >= 4) return avisos;
    }
  }

  // c) o assunto do pedido está mesmo no endereço que a resposta apontou?
  const ancoras = [...new Set(conteudo(assunto).filter((p) => p.length >= 5))].slice(0, 3);
  const VERBO = /\b(diz|dizem|fala|falam|trata|menciona|mencionam|lista|listam|cita|citam|ensina|ensinam|registra|descreve|nomeia|enumera|ordena|manda|afirma|declara|apresenta|traz|trazem|e sobre|sao sobre)\b/i;
  for (const r of refs) {
    if (avisos.length >= 4) break;
    const depois = semAcentos(t.slice(r.fim, r.fim + 90)).toLowerCase();
    if (!VERBO.test(depois)) continue;
    const real = textoDoVersiculo(biblia, r);
    if (real === null) continue;
    const alvoTxt = ' ' + semAcentos(real).toLowerCase().replace(/[^a-z0-9]/g, ' ') + ' ';
    for (const a of ancoras) {
      if (depois.indexOf(radical(a)) < 0) continue;            // não é isso que ele afirmou
      if (alvoTxt.indexOf(' ' + radical(a)) >= 0) continue;    // está lá mesmo: tudo certo
      // Está no livro, mas em OUTRO endereço? Então dá pra apontar o certo.
      const caps = biblia[r.abbrev] || [];
      const onde = [];
      for (let c = 0; c < caps.length && onde.length < 3; c++) {
        for (let v = 0; v < caps[c].length; v++) {
          if ((' ' + semAcentos(caps[c][v]).toLowerCase().replace(/[^a-z0-9]/g, ' ')).indexOf(' ' + radical(a)) >= 0) { onde.push(`${c + 1}:${v + 1}`); break; }
        }
      }
      avisos.push(`endereco-errado: a resposta diz que ${r.bruto} fala de "${a}" — e ${r.bruto} não traz isso. `
        + (onde.length ? `Em ${LIVRO_NOME[r.abbrev]} isso aparece em ${onde.map((x) => LIVRO_NOME[r.abbrev] + ' ' + x).join(', ')}. Confira o endereço antes de pregar.` : 'Confira o endereço antes de pregar.'));
      break;
    }
  }
  return avisos;
}

/** O rodapé que o pastor lê na tela quando a resposta veio em streaming. */
function rodapeAvisos(avisos) {
  if (!avisos || !avisos.length) return '';
  return '\n\n⚠️ CONFERIR ANTES DE PREGAR\n' + avisos.slice(0, 4).map((a) => '• ' + a).join('\n');
}

/**
 * Mesma troca, só que EM CIMA DO FLUXO (as telas do Concílio recebem streaming).
 * Segura um rabo de até 8 caracteres porque o marcador pode chegar partido entre
 * dois pedaços do stream — sem isso, "[O" e "2]" sairiam crus na tela do pastor.
 */
// `opts` (novo): { origem, assunto, conferir } — quando `conferir` é true, o fluxo
// guarda uma cópia do que passou e, no fim, confere a palavra no original e os
// versículos contra a Bíblia de verdade, pendurando os avisos no rodapé. Fica de
// fora só o REESCREVER, porque ali a saída substitui a mensagem do pastor na tela
// (rodapé viraria lixo dentro do texto dele) — mas a transliteração vale lá também.
export function fluxoComFontes(resp, rotulos, rodapeSeVazio, opts) {
  opts = opts || {};
  const temFonte = !!(rotulos && rotulos.length);
  if (!resp || !resp.body) return resp;
  if (!temFonte && !opts.conferir && !opts.sempre) return resp;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    const reader = resp.body.getReader();
    let buf = '', citou = false, inventados = 0, transliterou = false, tudo = '';
    const solta = async (pedaco) => {
      const t = temFonte ? trocarFontes(pedaco, rotulos) : { texto: pedaco, usadas: [], inventados: 0 };
      if (t.usadas.length) citou = true;
      inventados += t.inventados;
      // Grafia proibida NÃO chega ao pastor: alfabeto grego/hebraico vira letra
      // latina aqui mesmo, caractere por caractere (marcador partido não atrapalha).
      const g = transliterarOriginal(t.texto);
      if (g.trocou) transliterou = true;
      if (opts.conferir) tudo += g.texto;
      await writer.write(enc.encode(g.texto));
    };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let corte = buf.length;
        const i = Math.max(buf.lastIndexOf('['), buf.lastIndexOf('【'));
        if (i >= 0 && buf.length - i <= 8 && !/[\]】]/.test(buf.slice(i))) corte = i;
        if (corte > 0) { await solta(buf.slice(0, corte)); buf = buf.slice(corte); }
      }
      if (buf) await solta(buf);
      // Piso de transparência: se a IA não marcou nada, o pastor ainda vê o que foi
      // consultado. Não dizemos "isto sustenta a afirmação X" — dizemos o que entrou
      // na mesa, que é a verdade conferível.
      if (!citou && rodapeSeVazio) await writer.write(enc.encode(rodapeSeVazio));
      if (opts.conferir) {
        // A conferência da FONTE já existia mas só rodava no handler JSON do Wagner;
        // em streaming ninguém conferia. Agora as três rodam no mesmo lugar.
        const avisos = conferirFontes(tudo, inventados)
          .concat(conferirOriginal(tudo, opts.assunto || '', transliterou))
          .concat(await conferirVersiculos(tudo, opts.origem, opts.assunto || ''));
        const rod = rodapeAvisos(avisos);
        if (rod) await writer.write(enc.encode(rod));
      }
    } catch (_) {}
    try { await writer.close(); } catch (_) {}
  })();
  return new Response(readable, { status: resp.status, headers: resp.headers });
}

// O rodapé honesto: o que foi aberto no acervo pra responder. Vale quando a IA não
// apontou nada — melhor "consultei isto" do que a tela muda sobre a origem.
export function rodapeConsultado(rotulos) {
  // sem repetir: vários pedaços do mesmo bloco de tipologias dariam a mesma etiqueta
  const tres = [...new Set(rotulos || [])].slice(0, 3);
  if (!tres.length) return '';
  return '\n\n📚 CONSULTADO NO ACERVO: ' + tres.map((r) => `(📚 ${r})`).join(' ')
    + '\nEstas são as fontes que foram abertas para responder — não uma citação palavra por palavra.';
}

// Os rótulos de UM mestre: "João Calvino, Institutas da Religião Cristã".
export function rotulosDoMestre(id) {
  const e = ERUDITOS.find((x) => x.id === id);
  const obras = OBRAS[id];
  if (!e || !obras) return [];
  return obras.map((o) => limparRotulo(e.nome + ', ' + o));
}

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
- 🔤 PALAVRA NO ORIGINAL: SÓ transliterada em letras latinas (ex.: *bara*, *chesed*, *aparche*). NUNCA em alfabeto hebraico nem grego. E o idioma tem que bater com o testamento: Antigo Testamento é HEBRAICO (aramaico em partes de Daniel e Esdras), Novo Testamento é GREGO. Dizer que uma palavra de Gênesis é grega é erro grosseiro. Se você não souber o livro, capítulo e versículo exatos onde a palavra está, NÃO escreva palavra nenhuma do original.
- Todo versículo citado (Livro capítulo:versículo) tem que EXISTIR e realmente dizer o que você afirma.
- 📖 VERSÍCULO ENTRE ASPAS: se você puser um versículo entre aspas, as palavras têm que ser DAQUELA referência exata — o pastor lê no púlpito e a igreja abre a Bíblia. O servidor abre a Bíblia e confere. Na menor dúvida, NÃO transcreva: só remeta à referência e explique com as suas palavras. E não diga que um versículo "fala de" um assunto que não está escrito nele.
- NÃO copie nem reproduza trechos de livro, comentário ou sermão de ninguém. Você forja um texto NOVO e ORIGINAL, em português do Brasil, usando o MÉTODO do servo — não as palavras dele.
- NÃO finja ser a pessoa. Você não diz "eu, Spurgeon". Você escreve NO MÉTODO dele, na terceira pessoa quando precisar citá-lo.
- CRISTO SEMPRE NO CENTRO. Doutrina fiel, evangélica pentecostal (Assembleias de Deus): batismo no Espírito Santo, dons para hoje, santidade, autoridade da Escritura.
- O Espírito Santo é o verdadeiro Mestre (João 16:13). Nunca dê a impressão de que a ferramenta substitui a oração, o pastor ou a Palavra.
- Em ponto disputado, sinalize com humildade e mande confirmar com o pastor.
- Português do Brasil, prosa densa e pastoral, parágrafos de verdade (nada de lista solta sem carne). Use **negrito** só nos destaques.`;

// ── KITTEL: fonte privada do Concílio (fica no banco do pastor, nunca no navegador)
// O verbete NUNCA aparece na tela: entra no prompt como fonte e sai mensagem pronta.
async function kittelFonte(pergunta, origem, quantos) {
  if (!origem || !pergunta) return '';
  try {
    const tk = process.env.RADAR_ADMIN_TOKEN || '';
    const u = origem + '/api/estudo-busca?fn=kittel&n=' + (quantos || 2)
      + '&q=' + encodeURIComponent(String(pergunta).slice(0, 300))
      + (tk ? '&token=' + encodeURIComponent(tk) : '');
    const r = await fetch(u);
    if (!r.ok) return '';
    const d = await r.json();
    if (!d || !d.ok || !d.itens || !d.itens.length) return '';
    const partes = d.itens.map((v) =>
      '■ ' + (v.termos || []).join(' · ') + ' — ' + (v.glosas || []).join(', ')
      + '\n(Kittel, vol. ' + (v.volume || '') + ', p. ' + (v.pagina || '') + ')\n'
      + (v.texto || ''));
    return '\n\n📕 CONSULTA AO KITTEL (Dicionário Teológico do NT — material de estudo do pastor):\n"""\n'
      + partes.join('\n\n— — —\n\n')
      + '\n"""\n⚠️ Isto é FONTE, não texto pronto. NÃO copie nem parafraseie de perto: pegue o SENTIDO da palavra no original e escreva com as suas próprias palavras. Se a informação entrar no texto, pode indicar a origem assim: (Kittel, vol. X, p. Y). Se o verbete não tiver a ver com a pergunta, ignore-o por completo.';
  } catch (_) { return ''; }
}
function _origemDe(req) {
  try { return new URL(req.url).origin; } catch (_) { return ''; }
}


// ── Streaming genérico de chat (reaproveitado por consulta, sermão e mensagem) ──
// Continua com a MESMA assinatura de antes, pra nenhuma tela precisar mudar. O que
// mudou por dentro: em vez de um fetch cravado na OpenAI, agora é a cascata.
async function streamChat(SYS, user, opts) {
  opts = opts || {};
  try {
    return await respostaStream({
      sys: SYS,
      user,
      // Conversa com histórico (ação 'conversar'). Quando vem `messages`, a cascata
      // ignora o `user` — por isso as ações antigas, que não mandam nada aqui,
      // continuam exatamente como sempre foram.
      ...(Array.isArray(opts.messages) && opts.messages.length ? { messages: opts.messages } : {}),
      temperature: opts.temperature != null ? opts.temperature : 0.5,
      max_tokens: opts.max_tokens || 2200,
      tag: opts.tag || 'concilio',
    }, CORS);
  } catch (e) {
    return respostaErro(e, CORS);
  }
}

// ── CRIADOR DE SERMÕES — método "Escavador de Pérolas" (13 seções) ──
const SYS_PEROLA = `Você é o ESCAVADOR DE PÉROLAS BÍBLICAS do app RADAR, do pastor Elias (Assembleias de Deus, Brasil).

A partir do texto/tema que o pastor der, FORJE UM SERMÃO PROFUNDO no método "Escavador de Pérolas" — um estudo que cava o texto até a pérola aparecer.

Comece com estas 3 linhas, exatamente assim (cada uma na sua linha):
TÍTULO: <um título forte e original>
REFERÊNCIA: <o(s) versículo(s)-base>
INTRO: <2 a 4 frases de abertura, densas>

Depois desenvolva EXATAMENTE estas seções, cada uma com o cabeçalho em **negrito** com o emoji, e prosa densa (3 a 6 frases) — nada de tópico solto:
**📖 Contexto Histórico-Cultural**
**🔤 Análise Linguística** — 2 a 4 palavras no hebraico/grego que REALMENTE estão no texto, transliteradas em letras latinas (ex.: *shachat*, *kaphar*, *keryx*). NUNCA invente termo nem etimologia; se não tiver certeza, trabalhe pelo sentido em português e diga isso.
**💎 Pérolas Ocultas**
**🔗 Conexões Intertextuais** — pode usar bullets com "• "
**🎯 Aplicação Profética**
**💥 Detalhes Demolidores**
**⚔️ Batalha Espiritual**
**👑 Caráter de Deus**
**🙏 Aplicação Prática** — bullets com "• "
**💭 Meditação Profunda**
**🔥 Declarações de Fé** — bullets com "• ", frases em 1ª pessoa
**📚 Tesouros Adicionais**
**✨ Pérola Final** — o fecho TEM QUE QUEIMAR: sobe o tom, martela em frases curtas, chama à decisão e aterrissa em CRISTO. Proibido terminar com síntese morna.

${LEI}

Comece direto no TÍTULO (sem saudação e sem "claro!").`;

// ── CRIADOR DE MENSAGENS — skill "Mensagens para Pregar" (prosa densa) ──
const SYS_MENSAGEM = `Você escreve uma "MENSAGEM PARA PREGAR" do app RADAR, do pastor Elias (Assembleias de Deus, Brasil). Padrão-ouro: prosa densa e revelatória — NÃO é lista de tópicos, é um rio de revelação correndo.

Comece com estas 2 linhas, exatamente assim (cada uma na sua linha):
TÍTULO: <título forte e original>
REFERÊNCIA: <o texto-base>

Depois escreva a mensagem em PROSA (parágrafos de verdade), seguindo o método em ordem:
1) Pegue o texto/tema e ESCAVE até a pérola aparecer.
2) GARIMPE O ORIGINAL: 2 a 4 palavras-chave no hebraico/grego com o significado REAL e verificável, transliteradas em letras latinas. NUNCA invente etimologia; se não tiver certeza, não use.
3) REVELE A TIPOLOGIA: mostre como o texto aponta para Cristo/Evangelho, honesto ao texto, nunca forçado.
4) ENCADEIE REFERÊNCIAS que se encaixam e iluminam (livro cap:verso corretos).
5) O FINAL TEM QUE QUEIMAR: o fecho é CRESCENDO, não resumo. Frases curtas de martelo, anáfora que embala, 2ª pessoa no imperativo ("Levanta", "Entra", "Não larga"), exalta o NOME de Jesus, urgência real, e uma última linha-grito curta. PROIBIDO terminar com parágrafo calmo de síntese — se der pra ler o último parágrafo sem levantar a voz, reescreva.

Use **negrito** nas palavras do original e nas ênfases. Português do Brasil.

${LEI}

Comece direto no TÍTULO (sem saudação e sem "claro!").`;

// ── LUPA DO CONCÍLIO — o mago-mestre roteia sozinho + pesquisa na web ──
async function lupaWeb(pergunta, contexto, historico, origem) {
  const fonteK = await kittelFonte(pergunta, origem);
  const roster = ERUDITOS.map((e) => `- ${e.nome} (${e.tag}) — forte em: ${e.forte}`).join('\n');
  const SYS_MSG = `Você é o CONCÍLIO DOS EXPOSITORES do app RADAR (Assembleias de Deus, Brasil), conversando com o pastor Elias SOBRE uma mensagem/pregação que ele está lendo.

A MENSAGEM (fonte — use como base, NÃO a repita inteira):
"""
${(contexto || '').toString().slice(0, 9000)}
"""

Sua tarefa: responder as perguntas do pastor sobre ESTA mensagem, APROFUNDANDO e ENRIQUECENDO o ponto (pano de fundo histórico, palavra no original, referência cruzada, aplicação) — como quem acrescenta uma nota à margem, SEM contradizer e SEM reescrever a mensagem dele. Se ajudar, pesquise na web fontes comprometidas com a verdade.

⚖️ AUTORIDADE: a Bíblia e a sã doutrina AD (pentecostal clássica). Nada inventado — nem versículo, nem etimologia. Cristo no centro. Em ponto disputado, sinalize com humildade e mande confirmar com a Palavra.

Responda direto, em prosa pastoral, curto e denso (o pastor lê no celular). Sem cabeçalhos com emoji, sem "claro!".

${LEI}${fonteK}`;
  const SYS_BASE = contexto ? SYS_MSG : `Você é o MAGO-MESTRE do CONCÍLIO DOS EXPOSITORES do app RADAR, do pastor Elias (Assembleias de Deus, Brasil).

O pastor faz UMA pergunta. Sua tarefa:
1) ESCOLHA INTERNAMENTE, sem perguntar e sem pedir pra ele escolher, o(s) expositor(es) do Concílio mais aptos a responder. Roster disponível:
${roster}
2) PESQUISE NA WEB (obrigatório) fontes sólidas e comprometidas com a VERDADE para embasar — o texto bíblico, teologia séria, dados confiáveis. Use a busca de verdade.
3) RESPONDA de forma clara, satisfatória e pastoral, no método combinado do(s) servo(s) escolhido(s).

⚖️ AUTORIDADE FINAL: a Bíblia e a sã doutrina (Assembleias de Deus, pentecostal clássica). A web serve pra confirmar e enriquecer — NUNCA para adotar erro só porque está publicado. Se a pergunta tocar em ponto disputado (ciência x fé, datas, interpretações), diga com honestidade o que a Escritura afirma, separe o que é certeza do que é opinião, e oriente confirmar com a Palavra e o pastor.

FORMATO da resposta (use os cabeçalhos com emoji):
📖 RESPOSTA — direta, em prosa densa.
📚 O QUE SUSTENTA — os textos bíblicos (livro cap:verso corretos) e, quando útil, o que as fontes confiáveis dizem.
✝️ CRISTO NO CENTRO.
🧙 QUEM RESPONDEU — no fim, 1 linha dizendo qual(is) servo(s) do Concílio você consultou e por quê.

${LEI}`;
  // A trava do original vale igual aqui: a lupa também já devolveu palavra grega
  // em texto hebraico. O idioma é CALCULADO pelo servidor a partir do que ele pediu.
  const assunto = pergunta + ' ' + String(contexto || '').slice(0, 400);
  const SYS = SYS_BASE + blocoDoOriginal(assunto);
  // Versão do prompt para quando NÃO houver busca na web disponível (o Gemini é o
  // único provedor da cascata com busca de verdade, e ele vive estourando cota).
  // Aqui a ordem de pesquisar SAI e entra a ordem de ser honesto sobre isso —
  // mandar "pesquise" quem não pode pesquisar é pedir fonte inventada.
  const SYS_SEM_WEB = SYS
    .replace(/2\) PESQUISE NA WEB \(obrigatório\)[^\n]*\n/, '2) NÃO invente pesquisa: você NÃO tem acesso à web nesta resposta. Responda pela Escritura e pela doutrina, e NÃO cite fonte externa, site, notícia nem estatística que você não possa garantir.\n')
    .replace('⚖️ AUTORIDADE FINAL: a Bíblia e a sã doutrina (Assembleias de Deus, pentecostal clássica). A web serve pra confirmar e enriquecer — NUNCA para adotar erro só porque está publicado.', '⚖️ AUTORIDADE FINAL: a Bíblia e a sã doutrina (Assembleias de Deus, pentecostal clássica).')
    .replace('Se ajudar, pesquise na web fontes comprometidas com a verdade.', 'Você NÃO tem acesso à web nesta resposta — trabalhe com a Escritura e a doutrina, sem citar fonte externa.');

  const historicoLimpo = Array.isArray(historico)
    ? historico.slice(-6).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: (m.content || '').toString().slice(0, 2000) }))
    : [];

  try {
    return fluxoComFontes(await respostaTexto({
      sys: SYS,
      sysSemWeb: SYS_SEM_WEB,
      web: true,
      messages: [...historicoLimpo, { role: 'user', content: pergunta }],
      temperature: 0.5,
      max_tokens: 2200,
      tag: 'lupa',
    }, CORS), [], '', { conferir: true, origem, assunto });
  } catch (e) {
    return respostaErro(e, CORS);
  }
}


// ── FICHA DE UM MESTRE — o bloco que ensina a IA a trabalhar no MÉTODO dele ──
// Sempre na 3ª pessoa: a LEI já proíbe fingir ser a pessoa. O Wagner Cordeiro não
// está no array (ele tem corpus próprio), então entra por um caminho separado.
function fichaMestre(id) {
  const e = ERUDITOS.find((x) => x.id === id);
  if (!e) return null;
  const filtro = e.id === 'david-flusser'
    ? `\n🚨 ATENÇÃO: este consultor é um erudito judeu que NÃO crê na divindade de Cristo. Aproveite SÓ o pano de fundo do 2º Templo. A Pessoa e a obra de Cristo ficam com a fé cristã e a doutrina AD — NUNCA reproduza a negação dele.`
    : '';
  return {
    nome: e.nome,
    bloco: `▪ SERVO: ${e.nome}\n▪ QUEM FOI: ${e.tag}\n▪ O QUE ELE CRÊ: ${e.cre}\n▪ FORTE EM: ${e.forte}${filtro}`,
  };
}

// O Dr. Wagner tem material de verdade atrás (aulas + Caderno de Pérolas). Quando o
// pastor escolhe ele, buscamos os trechos que casam com o pedido e mandamos junto.
// Devolve { bloco, rotulos }: o bloco vai pro prompt já com os marcadores [F1], [F2]…
// e os rótulos ficam aqui pra trocar o marcador pela fonte de verdade na saída.
async function fonteWagner(pergunta) {
  try {
    const { buscarContexto } = await import('./concilio-wagner.js');
    const ctx = buscarContexto(String(pergunta || '').slice(0, 600), 6000, { marcar: true });
    if (!ctx || !ctx.texto) return null;
    return {
      rotulos: ctx.rotulos || [],
      bloco: `\n\n📗 MATERIAL DO PRÓPRIO DR. WAGNER (aulas e Caderno de Pérolas), escolhido pelo pedido. Cada pedaço vem com o marcador da sua fonte:\n"""\n${ctx.texto}\n"""\n⚠️ É MATÉRIA-PRIMA, não texto pronto: NÃO copie, reescreva com suas palavras. Se não cobrir o pedido, ignore.`,
    };
  } catch (_) { return null; }
}

// ── REESCREVER — o pastor manda mudar e diz COMO ─────────────────────────────
// ⚠️ NÃO confunda com a lupa: a lupa é PROIBIDA de mexer na mensagem (ela só
// acrescenta nota à margem). ESTA ação é o contrário — ela devolve a mensagem
// INTEIRA reescrita, pronta pra substituir a que está na tela.
async function reescreverStream(texto, instrucao, mestreId, origem) {
  const fonteK = await kittelFonte(instrucao + ' ' + String(texto).slice(0, 600), origem, 2);
  const ficha = fichaMestre(mestreId);
  const wg = mestreId === 'wagner-cordeiro' ? await fonteWagner(instrucao + ' ' + String(texto).slice(0, 600)) : null;
  const fonteW = wg ? wg.bloco : '';

  const metodo = ficha
    ? `\n\n🧙 MÉTODO PEDIDO: o pastor quer a reescrita no MÉTODO deste servo:\n${ficha.bloco}\nEscreva do jeito que ELE cavaria: o olhar dele, as perguntas dele, a ênfase dele, o tipo de aplicação dele. Na 3ª pessoa — você NÃO finge ser ${ficha.nome}, você trabalha no método dele.`
    : (mestreId === 'wagner-cordeiro'
      ? `\n\n🧙 MÉTODO PEDIDO: reescreva no método do Dr. Wagner Cordeiro — garimpo tipológico, a figura do Antigo Testamento desaguando em Cristo, detalhe do texto que ninguém repara. Na 3ª pessoa, sem fingir ser ele.`
      : '');

  const SYS = `Você é o REESCRITOR de mensagens do app RADAR, do pastor Elias (Assembleias de Deus, Brasil).

O pastor já tem uma mensagem escrita. Ele NÃO quer uma mensagem nova do zero e NÃO quer comentário sobre ela: ele quer ESTA MESMA mensagem, com a mudança que ele mandou fazer.

📌 AS 4 ORDENS:
1) OBEDEÇA A INSTRUÇÃO DELE AO PÉ DA LETRA. Se ele mandou trocar o final, troque o final. Se mandou encurtar, encurte. Se mandou tirar uma palavra, ela não pode sobrar em lugar nenhum. Se mandou acrescentar, acrescente ali onde faz sentido. A instrução dele vence o seu gosto.
2) PRESERVE TUDO QUE ELE NÃO MANDOU MUDAR. Título, referência, ordem das ideias, ilustrações, versículos e o jeito dele de falar continuam iguais. Você não "melhora" o que não foi pedido. Mexer onde não foi mandado é ERRO.
3) DEVOLVA A MENSAGEM INTEIRA, do começo ao fim, pronta pra substituir a que está na tela. Nada de trecho solto, nada de "mudei o parágrafo 3", nada de marcar o que mudou.
4) O FINAL TEM QUE QUEIMAR: o fecho é CRESCENDO, não resumo. Frases curtas de martelo, 2ª pessoa no imperativo, exalta o NOME de Jesus, e uma última linha-grito curta. (A menos que a instrução do pastor peça outra coisa — aí manda ele.)

Mantenha o padrão da casa: prosa densa em parágrafos de verdade (não vira lista), **negrito** nas palavras do original e nas ênfases, português do Brasil. Se a mensagem começa com as linhas TÍTULO: e REFERÊNCIA:, devolva essas linhas também.

${metodo}

${LEI}${blocoDoOriginal(instrucao + ' ' + String(texto || '').slice(0, 1500))}

Comece DIRETO no texto da mensagem reescrita. Sem saudação, sem "claro!", sem explicar o que você fez, sem comentário no fim.${fonteK}${fonteW}`;

  const user = `MENSAGEM ATUAL (é esta que deve ser reescrita, inteira):
"""
${String(texto || '').slice(0, 14000)}
"""

O QUE O PASTOR MANDOU MUDAR:
"""
${String(instrucao || '').slice(0, 1200)}
"""

Agora devolva a mensagem inteira, já com essa mudança feita.`;

  // Aqui NÃO pedimos citação (é a mensagem DELE sendo reescrita). Mas se um marcador
  // do material de apoio escapar no meio do texto, ele sai como fonte de verdade em
  // vez de "[F3]" cru na tela do pastor.
  // `sempre` (e não `conferir`): aqui a saída SUBSTITUI a mensagem do pastor na tela,
  // então rodapé de aviso viraria lixo dentro do texto dele. O que vale é a
  // transliteração — grafia proibida não entra na mensagem dele de jeito nenhum.
  return fluxoComFontes(await streamChat(SYS, user, { temperature: 0.55, max_tokens: 4000, tag: 'reescrever' }), wg ? wg.rotulos : [], '', { sempre: true });
}

// ── CONVERSAR — bate-papo fiel com UM mestre do Concílio ─────────────────────
// Ele responde DENTRO do que sabe e do que crê. Se o pastor perguntar fora da
// praia dele, ele diz que aquilo não é a praia dele em vez de chutar.
async function conversarStream(mestreId, pergunta, contexto, historico, origem) {
  const ficha = fichaMestre(mestreId);
  const ehWagner = mestreId === 'wagner-cordeiro';
  if (!ficha && !ehWagner) return lupaWeb(pergunta, contexto, historico, origem);

  const nome = ficha ? ficha.nome : 'Dr. Wagner Cordeiro';
  const bloco = ficha ? ficha.bloco
    : '▪ SERVO: Dr. Wagner Cordeiro\n▪ QUEM É: garimpeiro de tipologia — acha a figura de Cristo escondida no detalhe do Antigo Testamento\n▪ O QUE ELE CRÊ: pentecostal AD; toda a Escritura aponta pra Cristo\n▪ FORTE EM: tipologia, o detalhe do texto que ninguém repara, aplicação que arde';

  const fonteK = await kittelFonte(pergunta, origem, 2);
  // DE ONDE VEM. Pro Wagner são os pedaços do acervo dele (aulas + Caderno de Pérolas);
  // pros clássicos, as obras reais da ficha. Quem não tiver nada catalogado fica com a
  // lista vazia — e aí o bloco manda NÃO citar obra nenhuma, em vez de deixar a IA solta.
  const wg = ehWagner ? await fonteWagner(pergunta) : null;
  const rotulos = ehWagner ? (wg ? wg.rotulos : []) : rotulosDoMestre(mestreId);
  const fonteW = ehWagner && wg ? wg.bloco : '';
  const fontes = blocoDeFontes(ehWagner ? 'F' : 'O', rotulos,
    ehWagner
      ? 'Estes são os pedaços do acervo do próprio Dr. Wagner que casaram com a pergunta — aulas do GIOM e o Caderno de Pérolas do pastor Elias:'
      : `Estas são as OBRAS REAIS de ${nome}. É a ÚNICA lista de obras que você pode apontar:`,
    `aplicando o método de ${nome}`);

  const blocoCtx = contexto
    ? `\n\n📄 A MENSAGEM QUE O PASTOR ESTÁ LENDO (é sobre ELA que ele conversa — use como base e NÃO a repita inteira; você comenta, não reescreve):\n"""\n${String(contexto).slice(0, 9000)}\n"""`
    : '';

  const SYS = `Você é o CONCÍLIO DOS EXPOSITORES do app RADAR, do pastor Elias (Assembleias de Deus, Brasil), num BATE-PAPO com ele.

Nesta conversa quem responde é UM servo só, e a resposta tem que ser FIEL a ele:

${bloco}

📌 COMO RESPONDER:
- Responda com o CONHECIMENTO e a CONVICÇÃO deste servo — o que ele leu, o que ele enfatiza, o tipo de pergunta que ele faz ao texto, o tipo de aplicação que ele tira.
- Se o pastor perguntar algo FORA da praia dele, diga com honestidade que aquilo não é o forte deste servo, responda o que dá pela Escritura e sugira ouvir outro servo do Concílio.
- Na 3ª pessoa: você NÃO finge ser ${nome} e NÃO diz "eu, ${nome}". Você responde NO MÉTODO dele.
- É CONVERSA: leve em conta o que já foi dito antes, responda direto ao que ele perguntou agora, em prosa pastoral, curto e denso (o pastor lê no celular). Sem cabeçalho com emoji, sem "claro!", sem repetir a pergunta.
- ⚠️ REGRA DA GRAFIA: palavra do hebraico ou do grego SÓ transliterada em letras latinas (ex.: *tamid*, *chesed*, *dorea*). NÃO escreva no alfabeto hebraico nem no grego — um acento trocado vira erro no púlpito.

⚖️ AUTORIDADE: a Bíblia e a sã doutrina AD (pentecostal clássica). Nada inventado — nem versículo, nem etimologia. Cristo no centro. Em ponto disputado, sinalize com humildade e mande confirmar com a Palavra.${blocoCtx}

${LEI}${blocoDoOriginal(pergunta + ' ' + String(contexto || '').slice(0, 400))}${fonteK}${fonteW}${fontes}`;

  const conversa = (Array.isArray(historico) ? historico.slice(-8) : [])
    .map((m) => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) || '').slice(0, 2000) }))
    .filter((m) => m.content);

  const perguntaFinal = pergunta + (rotulos.length
    ? `\n\n(ANTES DE MANDAR: ponha pelo menos UM marcador de fonte no fim da frase que ele sustenta — só o marcador, do jeito que foi explicado. Se nada da lista sustentar, escreva "aplicando o método de ${nome}".)`
    : '');

  return fluxoComFontes(await streamChat(SYS, perguntaFinal, {
    messages: [...conversa, { role: 'user', content: perguntaFinal }],
    temperature: 0.5, max_tokens: 2200, tag: 'conversar',
  }), rotulos, '', { conferir: true, origem, assunto: pergunta });
}


export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let b = {};
  try { b = await req.json(); } catch (_) {}
  const acao = (b.acao || '').toString().trim();

  if (acao === 'perola') {
    const tema = (b.tema || b.passagem || '').toString().trim().slice(0, 400);
    if (!tema) return new Response('Diga o texto ou o tema do sermão.', { status: 400, headers: CORS });
    const origem = _origemDe(req);
    const fonteP = await kittelFonte(tema, origem);
    return fluxoComFontes(await streamChat(SYS_PEROLA + blocoDoOriginal(tema) + fonteP, 'TEXTO / TEMA DO PASTOR: ' + tema,
      { temperature: 0.6, max_tokens: 3600 }), [], '', { conferir: true, origem, assunto: tema });
  }
  if (acao === 'mensagem') {
    const tema = (b.tema || b.passagem || '').toString().trim().slice(0, 400);
    if (!tema) return new Response('Diga o texto ou o tema da mensagem.', { status: 400, headers: CORS });
    const origem = _origemDe(req);
    const fonteM = await kittelFonte(tema, origem);
    return fluxoComFontes(await streamChat(SYS_MENSAGEM + blocoDoOriginal(tema) + fonteM, 'TEXTO / TEMA DO PASTOR: ' + tema,
      { temperature: 0.65, max_tokens: 3600 }), [], '', { conferir: true, origem, assunto: tema });
  }
  if (acao === 'lupa') {
    const pergunta = (b.pergunta || b.tema || b.passagem || '').toString().trim().slice(0, 500);
    if (!pergunta) return new Response('Escreva a sua pergunta.', { status: 400, headers: CORS });
    return lupaWeb(pergunta, null, null, _origemDe(req));
  }
  if (acao === 'lupa-msg') {
    const pergunta = (b.pergunta || '').toString().trim().slice(0, 500);
    if (!pergunta) return new Response('Escreva a sua pergunta.', { status: 400, headers: CORS });
    return lupaWeb(pergunta, (b.contexto || '').toString(), b.historico, _origemDe(req));
  }
  // REESCREVER — devolve a mensagem INTEIRA já mudada do jeito que o pastor mandou.
  if (acao === 'reescrever') {
    const texto = (b.texto || b.mensagem || b.contexto || '').toString().trim();
    const instrucao = (b.instrucao || b.pedido || b.pergunta || '').toString().trim();
    if (!texto) return new Response('Não recebi a mensagem que devo reescrever.', { status: 400, headers: CORS });
    if (!instrucao) return new Response('Diga o que você quer mudar na mensagem.', { status: 400, headers: CORS });
    const mestre = (b.mestre || b.erudito || '').toString().trim().slice(0, 60);
    return reescreverStream(texto, instrucao, mestre, _origemDe(req));
  }
  // CONVERSAR — bate-papo com UM mestre específico (sem mestre, cai na lupa de hoje).
  if (acao === 'conversar') {
    const pergunta = (b.pergunta || '').toString().trim().slice(0, 1000);
    if (!pergunta) return new Response('Escreva a sua pergunta.', { status: 400, headers: CORS });
    const mestre = (b.mestre || b.erudito || '').toString().trim().slice(0, 60);
    return conversarStream(mestre, pergunta, (b.contexto || '').toString(), b.historico, _origemDe(req));
  }

  const id = (b.erudito || '').toString().trim().slice(0, 60);
  const passagem = (b.passagem || '').toString().trim().slice(0, 400);
  const tipo = (b.tipo || 'estudo').toString().trim();

  // ⚠️ O Dr. Wagner Cordeiro está no eruditos.json (42 servos) mas NÃO está nesta lista
  // embutida (41) — quem clicava nele levava "Escolha um erudito da lista." (400).
  // Além do conserto, ele não deve passar pela ficha genérica de 3 linhas: o método dele
  // é garimpo tipológico com material de verdade atrás. Vai pro handler próprio.
  if (id === 'wagner-cordeiro') {
    if (!passagem) return new Response('Diga o texto, o assunto ou a sua dúvida.', { status: 400, headers: CORS });
    const { wagnerStream } = await import('./concilio-wagner.js');
    return wagnerStream(passagem, (TIPOS[tipo] || TIPOS.estudo).ordem, _origemDe(req));
  }

  const e = ERUDITOS.find((x) => x.id === id);
  if (!e) return new Response('Escolha um erudito da lista.', { status: 400, headers: CORS });
  if (!passagem) return new Response('Diga o texto ou o assunto (ex.: João 3, ou "ansiedade").', { status: 400, headers: CORS });
  const t = TIPOS[tipo] || TIPOS.estudo;

  const filtro = e.id === 'david-flusser'
    ? `\n\n🚨 ATENÇÃO ESPECIAL: este consultor é um erudito judeu que NÃO crê na divindade de Cristo. Use SOMENTE o que ele traz de pano de fundo do 2º Templo (costumes, Templo, festas, mundo judaico). A Pessoa, a divindade e a obra de Cristo ficam com a fé cristã e a doutrina AD — NUNCA reproduza a negação dele. Deixe isso claro numa linha no fim.`
    : '';

  // DE ONDE VEM: as obras reais deste servo, e só elas.
  const rotulos = rotulosDoMestre(e.id);
  const fontes = blocoDeFontes('O', rotulos,
    `Estas são as OBRAS REAIS de ${e.nome}. É a ÚNICA lista de obras que você pode apontar:`,
    `aplicando o método de ${e.nome}`);

  const SYS = `Você trabalha no CONCÍLIO DOS EXPOSITORES do app RADAR, do pastor Elias (Assembleias de Deus, Brasil).

Sua tarefa nesta resposta é forjar um texto NOVO usando o MÉTODO de um servo específico que Deus usou:

▪ SERVO: ${e.nome}
▪ QUEM FOI: ${e.tag}
▪ O QUE ELE CRÊ: ${e.cre}
▪ FORTE EM: ${e.forte}

Escreva do jeito que ELE cavaria o texto — o olhar dele, as perguntas dele, a ênfase dele, o tipo de aplicação dele. Se o método dele for grego e estrutura, faça isso. Se for calor pastoral e frase que gruda, faça isso. Se for pano de fundo judaico, faça isso.${filtro}

${LEI}${blocoDoOriginal(passagem)}

FORMATO: use os cabeçalhos com emoji exatamente como pedidos abaixo. Comece direto no conteúdo (sem saudação e sem "claro!").${fontes}`;

  // O lembrete vai também no fim do pedido: os modelos rápidos da cascata seguem o
  // formato e esquecem a fonte quando ela fica só lá em cima, no sistema.
  const user = `${t.ordem}\n\nTEXTO / ASSUNTO DO PASTOR: ${passagem}`
    + (rotulos.length ? `\n\nANTES DE MANDAR: confira se você pôs pelo menos UM marcador de obra ([O1] … [O${rotulos.length}]) no fim da frase que ele sustenta. Se nenhuma obra da lista sustentar o ponto, escreva "aplicando o método de ${e.nome}" e não marque nada.` : '');

  // Mesmo streaming de antes, só que agora servido pela cascata (streamChat) e com
  // os marcadores de fonte já trocados pela obra real no caminho até a tela.
  // `conferir` liga a segunda trava: palavra no original e versículo conferidos
  // contra a Bíblia de verdade, com o resultado no rodapé.
  return fluxoComFontes(await streamChat(SYS, user, { temperature: 0.5, max_tokens: 2200, tag: 'concilio-erudito' }),
    rotulos, '', { conferir: true, origem: _origemDe(req), assunto: passagem });
}
