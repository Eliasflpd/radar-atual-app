// Gerador de páginas de Sermão (Escavador) — template fiel + reconstrução de trechos cortados
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const HEAD = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>__TITLE__ — Escavador de Pérolas Bíblicas</title>
<style>
  :root{--branco:#ffffff;--texto:#1c2230;--navy:#0f3d5c;--teal:#0f6d78;--dourado:#a9791c;--vinho:#8a1c1c}
  *{box-sizing:border-box;-webkit-text-size-adjust:100%}
  html{font-size:17px}
  body{margin:0 auto;max-width:820px;background:var(--branco);color:var(--texto);font-family:'Segoe UI',system-ui,Arial,sans-serif;line-height:1.7;padding:16px 13px calc(46px + env(safe-area-inset-bottom));-webkit-font-smoothing:antialiased}
  .voltar{display:inline-block;margin:0 0 14px;background:#1c2230;color:#fff;border:none;border-radius:999px;padding:9px 17px;font-size:.95rem;font-weight:700;font-family:inherit;cursor:pointer}
  .selo{text-align:center;color:var(--teal);font-size:.82rem;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
  h1{font-family:Georgia,'Times New Roman',serif;text-align:center;color:var(--navy);font-size:1.85rem;line-height:1.22;font-weight:800;margin:2px 0 4px}
  .ref{text-align:center;color:var(--dourado);font-weight:800;font-size:1.1rem;margin-bottom:16px}
  .divisor{height:3px;width:64px;background:var(--dourado);border-radius:3px;margin:0 auto 22px}
  .intro{background:#f2f7f8;border:1px solid #d5e6e8;border-radius:14px;padding:16px;margin-bottom:26px}
  .intro p{margin:0}
  p{font-size:1.12rem;margin:0 0 16px;text-align:justify;text-justify:inter-word}
  strong{color:var(--vinho);font-weight:800}
  em{color:var(--navy);font-style:italic}
  h2.sec{font-family:Georgia,serif;text-align:center;color:var(--navy);font-size:1.28rem;font-weight:800;line-height:1.35;margin:30px 0 14px;padding-top:18px;border-top:1px solid #e8e8ee}
  h2.sec .num{display:inline-block;background:var(--navy);color:#fff;border-radius:50%;width:1.7em;height:1.7em;line-height:1.7em;font-size:.85rem;margin-right:6px;font-family:inherit}
  ul{list-style:none;margin:0 0 16px;padding:0}
  ul li{position:relative;padding:0 0 0 22px;margin:0 0 10px;font-size:1.1rem;text-align:left}
  ul li::before{content:"\\25C6";color:var(--dourado);position:absolute;left:2px;top:0}
  ul li strong{color:var(--vinho)}
  .final{background:#fbf6ea;border:2px solid #ecd9ad;border-radius:16px;padding:18px 16px;margin-top:24px}
  .final h2.sec{margin-top:0;border-top:none;padding-top:0}
  .assinatura{text-align:center;color:var(--teal);font-weight:700;font-size:.95rem;margin-top:22px}
</style>
</head>
<body>
  <button class="voltar" onclick="if(history.length>1){history.back()}else{location.href='./'}">← Sermões</button>
  <div class="selo">✦ Escavador de Pérolas Bíblicas ✦</div>
  <h1>__TITLE__</h1>
  <div class="ref">__REF__</div>
  <div class="divisor"></div>
  <div class="intro"><p>__INTRO__</p></div>
`;

function sec(s){
  const head = '<h2 class="sec"><span class="num">'+s.n+'</span>'+s.label+'</h2>';
  let body = '';
  if(s.ul) body = '<ul>'+s.ul.map(li=>'<li>'+li+'</li>').join('')+'</ul>';
  else body = '<p>'+s.p+'</p>';
  return head + body;
}

function build(m){
  let html = HEAD.replace(/__TITLE__/g,m.title).replace('__REF__',m.ref).replace('__INTRO__',m.intro);
  m.secs.forEach((s,i)=>{
    if(i === m.secs.length-1){ html += '\n  <div class="final">'+sec(s)+'</div>\n'; }
    else { html += '\n  '+sec(s)+'\n'; }
  });
  html += '\n  <div class="assinatura">✦ Análise selada pelo Escavador de Pérolas Bíblicas ✦</div>\n</body>\n</html>\n';
  return html;
}

// ────────────────────────────── SERMÕES ──────────────────────────────
const SERMOES = [
{
  file:'leis-da-natureza.html', emoji:'🌌',
  title:'Quando Deus Suspende as Leis da Natureza',
  ref:'A Soberania do Criador sobre o Natural',
  card:'Do sol parado em Josué ao machado que flutua: Deus não quebra leis — Ele exerce uma Lei Superior, e o milagre é a Sua assinatura na matéria.',
  intro:'O Escavador de Pérolas Bíblicas sonda agora as águas da soberania divina. Quando Deus suspende as leis da física, da química ou da biologia, Ele não está sendo "anárquico" — está revelando que a Criação é apenas o estrado dos Seus pés.',
  secs:[
    {n:1,label:'📖 Contexto Histórico-Cultural',p:'Na cosmovisão do Antigo Oriente Médio, as leis naturais eram atribuídas a divindades menores — o deus do trovão, a deusa da fertilidade, o deus do sol. Quando as Escrituras narram Deus parando o sol (Josué 10) ou abrindo o mar (Êxodo 14), a audiência original não via apenas um "milagre", mas um ato de <strong>guerra teológica</strong>: Javé demonstrava que os deuses das nações eram meros escravos de elementos que Ele mesmo fabricou.'},
    {n:2,label:'🔤 Análise Linguística',p:'A palavra hebraica para "sinal/maravilha" é <strong>’Ot</strong> (אות). Curiosamente, no hebraico essa mesma palavra também designa "letra" — a assinatura de Deus. Quando Ele atua acima da lei natural, está "escrevendo" o Seu nome na matéria: o milagre não é um fim em si mesmo, mas a assinatura do Autor enfatizando uma frase na história humana. No grego, o termo é <strong>Dunamis</strong> (poder intrínseco), de onde vem "dinamite". A lei natural é a estrutura; o poder de Deus é o agente que pode implodir essa estrutura para revelar o Eterno.'},
    {n:3,label:'💎 Pérolas Ocultas',p:'Quando Jesus caminha sobre as águas (Mateus 14), Ele não está apenas economizando tempo de viagem. Em Jó 9:8 diz-se que somente Deus "pisa sobre as ondas do mar". Ao andar sobre a água, Jesus emitia um código visual: <em>"Eu sou o Deus que existia antes da fundação das leis da gravidade e da densidade."</em>'},
    {n:4,label:'🔗 Conexões Intertextuais',ul:[
      '<strong>O machado que flutua (2 Reis 6):</strong> a gravidade é suspensa para recuperar uma ferramenta emprestada — figura da redenção: o que caiu no fundo é trazido à superfície pelo poder profético.',
      '<strong>A sarça ardente (Êxodo 3):</strong> a lei da combustão é suspensa. Deus se revela como a Fonte de energia autoexistente, que não depende do que é criado para brilhar.'
    ]},
    {n:5,label:'🎯 Aplicação Profética',p:'O domínio sobre as leis naturais aponta para o Estado Eterno (o Novo Céu e a Nova Terra). Os milagres de Jesus eram "amostras grátis" do Reino vindouro, onde a morte e a entropia não mais existirão. A ressurreição de Cristo é a maior quebra da lei natural da história, inaugurando a física da eternidade.'},
    {n:6,label:'💥 Detalhes Demolidores',p:'Você sabia que, se a Terra parasse de girar subitamente, a inércia arremessaria tudo para o leste a mais de 1.600 km/h? Quando Deus "para o sol" (Josué 10), Ele não apenas detém o astro: sustenta cada átomo, cada gota de água e cada molécula de ar ao mesmo tempo, para que a inércia não destrua o planeta. <strong>Deus não suspende uma lei sem sustentar todas as outras.</strong>'},
    {n:7,label:'⚔️ Batalha Espiritual',p:'O inimigo tenta nos convencer de que estamos presos às "leis das circunstâncias" — falta de recursos, doenças, hereditariedade. A batalha é reconhecer que o Reino de Deus tem <strong>jurisdição superior</strong>. A fé não nega a lei natural; ela apela para a Suprema Corte do Espírito, onde a sentença da natureza pode ser revogada.'},
    {n:8,label:'👑 Caráter de Deus',p:'Aqui vemos o atributo da <strong>transcendência aliada à imanência</strong>. Deus é transcendente — está acima da natureza e, por isso, pode alterá-la; mas é também imanente — está presente nela, sustentando cada átomo. Por isso Ele jamais é apanhado numa armadilha "natural": o Criador nunca fica preso àquilo que criou.'},
    {n:9,label:'🙏 Aplicação Prática',ul:[
      '<strong>Identifique a "lei" que te limita:</strong> é uma sentença médica? uma estatística econômica?',
      '<strong>Submeta-a ao Legislador:</strong> ore declarando que a Palavra de Deus é a lei fundamental que governa a sua vida.',
      '<strong>Caminhe sobre a Palavra:</strong> como Pedro, não olhe para a densidade da água (os problemas), mas para a voz dAquele que te chama acima delas.'
    ]},
    {n:10,label:'💭 Meditação Profunda',p:'Se Deus criou as leis naturais para manter a ordem, por que as quebraria por você? Porque <strong>você vale mais para Ele do que a mecânica do universo</strong>. O sol pode parar, o mar pode abrir e o ferro pode flutuar — mas a promessa dEle para você não pode falhar.'},
    {n:11,label:'🔥 Declarações de Fé',ul:[
      '"Eu não sou escravo das estatísticas humanas; sou súdito do Reino do sobrenatural."',
      '"O mesmo Deus que fez o ferro flutuar (2 Reis 6) faz emergir aquilo que na minha vida já tinha afundado."',
      '"Aquele que sustenta as galáxias tem controle total sobre os átomos da minha situação."'
    ]},
    {n:12,label:'📚 Tesouros Adicionais',p:'A física moderna revela que a matéria não é tão sólida quanto parece: é composta de energia e de vastos espaços vazios. Isso ilustra a verdade teológica — o "sólido" é apenas a vontade de Deus manifestada de forma constante. Se a matéria só existe porque Ele a sustenta a cada instante, não é "difícil" para Ele fazê-la se comportar de outra maneira, como quando Jesus atravessa paredes ou caminha sobre o mar.'},
    {n:13,label:'✨ Pérola Final',p:'As leis naturais são as regras da <strong>casa</strong>; o milagre é a presença do <strong>Dono da casa</strong>. Nunca confunda a manutenção do universo com a limitação do Criador. Deus não quebra leis — Ele exerce uma <strong>Lei Superior</strong>: a do Seu amor redentor, que sempre terá a última palavra sobre a matéria.'}
  ]
},
{
  file:'ninguem-vai-se-esconder.html', emoji:'🔦',
  title:'O Dia em Que Ninguém Mais Conseguirá Se Esconder',
  ref:'Apocalipse 6:16 · Hebreus 4:13',
  card:'Do Éden ao Grande Trono Branco: a última sombra será removida. Quem se deixa expor pela Graça hoje não será exposto pelo Juízo amanhã.',
  intro:'O Escavador sonda a realidade escatológica do Grande Trono Branco (Apocalipse 20:11-12). Desde o Éden, o homem se esconde — mas vem o Dia em que a última sombra será removida.',
  secs:[
    {n:1,label:'📖 Contexto Histórico-Cultural',p:'Desde o Éden, o homem tenta se esconder: Adão buscou refúgio entre as árvores e cobriu-se com folhas de figueira (Gênesis 3:8). Na Bíblia, o "esconder-se" é a tentativa de evitar a citação divina; na cultura antiga, o réu que fugia da presença do rei já era tido como culpado. O clímax dessa verdade está em <strong>Apocalipse 6:15-17</strong>, escrito por João na Ilha de Patmos, sob perseguição romana, descrevendo o terror dos poderosos da terra diante da face dAquele que se assenta no trono.'},
    {n:2,label:'🔤 Análise Linguística',ul:[
      '<strong>Krupto (grego):</strong> de onde vem "criptografia" — esconder, encobrir, manter secreto. No Dia do Senhor, a "criptografia" da alma será quebrada.',
      '<strong>Gymnos (grego):</strong> "nu". Hebreus 4:13 diz que todas as coisas estão <em>nuas</em> e <em>expostas</em> (tetrachelisména) diante dEle — termo que descrevia o animal com o pescoço puxado para trás no altar, pronto para o sacrifício.',
      '<strong>Phaneroo (grego):</strong> manifestar plenamente. Não é apenas "ser visto"; é ter a essência tornada visível.'
    ]},
    {n:3,label:'💎 Pérolas Ocultas',p:'Eles pedirão às rochas: <em>"Caí sobre nós e escondei-nos"</em> (Apocalipse 6:16). Aqui está a <strong>ironia da idolatria final</strong>: os que rejeitaram a "Rocha da Salvação" agora imploram às rochas da criação que os protejam do Criador. Preferem a morte por esmagamento à exposição diante da Santidade — o esconderijo vira sepultura voluntária.'},
    {n:4,label:'🔗 Conexões Intertextuais',ul:[
      '<strong>Amós 9:2-3:</strong> ainda que cavem até o abismo ou subam ao céu, a mão de Deus os alcança; se se esconderem no fundo do mar, Ele ordena à serpente que os morda.',
      '<strong>Salmo 139:</strong> o contraponto do justo — enquanto o ímpio teme a exposição, o salmista a deseja: <em>"Sonda-me, ó Deus."</em> O que é terror para um é purificação para o outro.',
      '<strong>2 Coríntios 5:10:</strong> o Tribunal (<em>Bema</em>) de Cristo, onde o "esconder-se" é substituído pelo "prestar contas".'
    ]},
    {n:5,label:'🎯 Aplicação Profética',p:'Vivemos a era da "privacidade digital", onde o homem pensa que o anonimato atrás das telas o protege. O mundo caminha para uma centralização em que nada será oculto — o sistema do Anticristo, simulacro satânico da onisciência de Deus. O Dia em que ninguém se esconderá marcará o fim da <strong>dualidade humana</strong>: quem você é <em>vs.</em> quem você finge ser.'},
    {n:6,label:'💥 Detalhes Demolidores',p:'No tribunal romano, quando o crime era tão hediondo que o réu não podia encarar o juiz, cobria-se a sua cabeça com um pano. No Grande Dia não haverá panos nem advogados — e, mais perturbador: <strong>a própria consciência do homem será a testemunha de acusação</strong>. A luz de Deus não brilhará apenas <em>sobre</em> o homem, mas <em>através</em> dele, tornando-o transparente como vidro.'},
    {n:7,label:'⚔️ Batalha Espiritual',p:'O diabo é o "mestre das sombras"; opera no oculto. A estratégia de guerra é a <strong>exposição antecipada</strong>: o pecado escondido é fortaleza do inimigo, mas quando confessamos, trazemos à luz e destruímos a base legal do adversário. Quem se deixa expor pela Graça hoje não será exposto pelo Juízo amanhã.'},
    {n:8,label:'👑 Caráter de Deus',p:'Revela-se a <strong>justiça incorruptível</strong>. Deus não se deixa subornar por aparências; Ele é a Luz do mundo. Sua santidade é de tal ordem que as trevas não apenas fogem — elas deixam de existir na Sua presença. Onde Ele está, não há sombra em que um segredo possa habitar.'},
    {n:9,label:'🙏 Aplicação Prática',ul:[
      '<strong>Viver <em>Coram Deo</em>:</strong> viver diante da face de Deus. Aja em particular como se estivesse no palco do universo.',
      '<strong>Confissão radical:</strong> não guarde segredos de Deus. Ele já os conhece, mas a confissão te livra do peso de se esconder.',
      '<strong>Integridade:</strong> seja a mesma pessoa em todos os ambientes.'
    ]},
    {n:10,label:'💭 Meditação Profunda',p:'Se a porta do seu coração fosse aberta e todos os seus pensamentos dos últimos dez anos fossem projetados num telão para toda a humanidade ver, você conseguiria ficar de pé? Se a resposta é "não", você entende a urgência da cobertura do Sangue do Cordeiro — o único véu que Deus aceita para cobrir a nossa nudez.'},
    {n:11,label:'🔥 Declarações de Fé',ul:[
      '"Eu não temo a luz, pois ando na Luz de Cristo."',
      '"Nenhum segredo me escraviza, pois a Verdade me libertou."',
      '"No Grande Dia não serei julgado pelas minhas falhas ocultas, mas reconhecido pelo Sangue que me cobriu."'
    ]},
    {n:12,label:'📚 Tesouros Adicionais',p:'Nas catacumbas de Roma, os cristãos pintavam com frequência o Bom Pastor buscando a ovelha perdida. Enquanto o Império os caçava para matá-los, eles celebravam que Deus os havia "achado" no seu esconderijo de pecado. O esconderijo do homem é o medo; o encontro com Deus é a vida.'},
    {n:13,label:'✨ Pérola Final',p:'O Dia em que ninguém mais conseguirá se esconder será o mais aterrorizante para quem viveu nas sombras — e o mais glorioso para quem já foi encontrado por Deus. Não tema a luz; tema o isolamento das sombras. O único esconderijo que resiste àquele Dia é estar escondido <em>em Cristo</em> (Colossenses 3:3).'}
  ]
},
{
  file:'quando-o-dinheiro.html', emoji:'🪙',
  title:'Quando o Dinheiro Deixar de Ser Dinheiro',
  ref:'Ezequiel 7:19 · Ageu 2:8',
  card:'A falência do sistema e a economia do maná: quando a moeda cai, a obediência é a única moeda com poder de compra.',
  intro:'O Escavador mergulha na falência dos sistemas monetários humanos e na transição para a economia do Reino: o que acontece quando o dinheiro deixa de ser dinheiro?',
  secs:[
    {n:1,label:'📖 Contexto Histórico-Cultural',p:'O dinheiro evoluiu do escambo para os metais preciosos e, depois, para o papel e o crédito. No mundo bíblico, a economia de Canaã se baseava em sementes, gado e pesos de prata. A crise de Gênesis 47:15 — <em>"Acabando-se, pois, o dinheiro na terra do Egito"</em> — é o protótipo da falência sistêmica que precede a dependência total de um governo centralizado (o sistema de José sob Faraó prefigurando o sistema do Anticristo).'},
    {n:2,label:'🔤 Análise Linguística',p:'A palavra que Jesus usa para dinheiro é <strong>Mamom</strong> (<em>Mammonas</em>): não é só "moeda", mas uma entidade — vem da raiz aramaica <em>aman</em> ("confiança"), pervertida. Quando o dinheiro deixa de ser dinheiro, o que cai é o <em>Mamom</em>: a confiança no suporte material. No hebraico, "prata" é <strong>Keseph</strong>, ligada à ideia de "desejo ardente" — a profecia anuncia o fim do objeto do desejo carnal.'},
    {n:3,label:'💎 Pérolas Ocultas',p:'A maior pérola está em <strong>Ezequiel 7:19</strong>: <em>"A sua prata lançarão pelas ruas, e o seu ouro será como imundície."</em> O dinheiro não desaparece — ele perde o <strong>valor de troca</strong> e se torna peso morto. A segurança do homem estava depositada em algo que, no dia da ira, vira estorvo físico, barreira para a fuga.'},
    {n:4,label:'🔗 Conexões Intertextuais',ul:[
      '<strong>Tiago 5:1-3:</strong> o ouro e a prata enferrujados como testemunho contra os ricos.',
      '<strong>Apocalipse 13:17:</strong> a transição da moeda física para o controle centralizado — "ninguém pode comprar ou vender" sem a marca.',
      '<strong>Ageu 2:8:</strong> <em>"Minha é a prata, e meu é o ouro, diz o Senhor dos Exércitos."</em> Deus reivindica o lastro universal antes da sacudida final.'
    ]},
    {n:5,label:'🎯 Aplicação Profética',p:'Vivemos a transição do <em>dinheiro-objeto</em> para o <em>dinheiro-controle</em>. A falência do sistema global é o gatilho para a economia da Besta. Para a Igreja, porém, é o convite à <strong>economia do maná</strong>: provisão sobrenatural que não pode ser acumulada, apenas recebida diariamente do céu.'},
    {n:6,label:'💥 Detalhes Demolidores',p:'Você sabia que "talento" era uma unidade de peso? Ao falar dos talentos, Jesus usa linguagem monetária para descrever responsabilidade espiritual. O detalhe demolidor: <strong>o céu não aceita a moeda da terra, mas a terra é governada pelo crédito do céu</strong>. Quando o dinheiro falha, o "crédito de fidelidade" é a única moeda que compra milagres.'},
    {n:7,label:'⚔️ Batalha Espiritual',p:'A guerra não é contra a inflação, mas contra o espírito de escassez e o medo do futuro. O sistema mundial usa a moeda para escravizar (Provérbios 22:7). Quebrar o poder do dinheiro sobre a alma é um ato de guerra: quem não adora o dinheiro não pode ser comprado pelo sistema final.'},
    {n:8,label:'👑 Caráter de Deus',p:'Aqui Deus se revela como <strong>Jeová-Jiré</strong> — o Senhor que provê e vê adiante. Quando a moeda do homem falha, o caráter provedor de Deus se destaca ainda mais: a Sua provisão é imutável, não indexada a nenhum sistema humano.'},
    {n:9,label:'🙏 Aplicação Prática',ul:[
      '<strong>Desapego radical:</strong> comece a investir em pessoas e no Reino — tesouros no céu.',
      '<strong>Diversificação espiritual:</strong> não confie na conta bancária, mas na sua aliança com Deus.',
      '<strong>Generosidade estratégica:</strong> o dinheiro perde poder sobre você quando você o libera voluntariamente.'
    ]},
    {n:10,label:'💭 Meditação Profunda',p:'Se todo o seu dinheiro desaparecesse amanhã, o que sobraria do seu valor como pessoa? Você é definido pelo que possui ou por Quem te possui? A falta de dinheiro é uma crise; a falta de fé é uma tragédia.'},
    {n:11,label:'🔥 Declarações de Fé',ul:[
      '"Minha provisão não vem do sistema deste mundo, mas do trono da graça."',
      '"Eu não sou escravo de Mamom; sou um despenseiro do Altíssimo."',
      '"Ainda que a moeda caia, o Reino de Deus em mim permanece inabalável."'
    ]},
    {n:12,label:'📚 Tesouros Adicionais',p:'Os primeiros cristãos de Jerusalém viveram o "dinheiro deixando de ser dinheiro" voluntariamente (Atos 4:32-34): venderam tudo <em>antes</em> da destruição de Jerusalém no ano 70 d.C. Transformaram bens temporais em tesouro eterno, provando que o dinheiro só tem o valor que a nossa fé recusa dar-lhe.'},
    {n:13,label:'✨ Pérola Final',p:'Quando o dinheiro deixar de ser dinheiro, a obediência será a única moeda com poder de compra. O mundo entrará em pânico porque o seu deus morreu; a Igreja entrará em glória porque o seu Provedor se manifestou. Não acumule o que enferruja — torne-se rico Naquele que é o Ouro Puro.'}
  ]
},
{
  file:'o-mundo-se-posicionando.html', emoji:'🌍',
  title:'O Mundo Não Está Desmoronando — Está Se Posicionando',
  ref:'2 Tessalonicenses 2 · Apocalipse 13',
  card:'A convergência entre atualidade e profecia: o tabuleiro sendo montado para o xeque-mate final — e o Cordeiro que já venceu.',
  intro:'O Escavador analisa a convergência entre a atualidade e a profecia. O mundo não está apenas mudando — está sendo "configurado".',
  secs:[
    {n:1,label:'📖 Contexto Histórico-Cultural',p:'Vivemos a era da <strong>hiperconectividade e da dissolução de fronteiras</strong>. Nunca houve uma infraestrutura global — tecnológica, financeira e política — capaz de sustentar um governo mundial unificado. O que antes era logisticamente impossível hoje é norma. E o "relativismo pós-moderno" rejeita a verdade absoluta, preparando o terreno para a aceitação de uma "nova verdade" global.'},
    {n:2,label:'🔤 Análise Linguística',p:'<strong>Apostasia</strong> (2 Tessalonicenses 2:3) não significa apenas "pecar", mas <em>apostasis</em>: uma revolta, o abandono deliberado de uma posição anterior — o mundo vive um <em>apostasis</em> institucional. Outro termo é <strong>Pharmakeia</strong> (Apocalipse 18:23), traduzido como "feitiçaria", que no original remete ao controle por substâncias e à manipulação da mente e do corpo.'},
    {n:3,label:'💎 Pérolas Ocultas',p:'Apocalipse 13 diz que "toda a terra se maravilhou após a besta". A pérola é o mecanismo da <strong>engenharia de consentimento</strong>: o sistema do Anticristo não se imporá só pela força bruta, mas pela sedução de "soluções" para crises globais (pandemias, guerras, colapsos). O mundo está sendo adestrado a trocar liberdade por segurança.'},
    {n:4,label:'🔗 Conexões Intertextuais',p:'Há um paralelo direto entre a <strong>Torre de Babel</strong> (Gênesis 11) e o sistema global final. Em Babel a humanidade disse: <em>"Façamos para nós um nome"</em> — unidade sem Deus. O sistema atual é a "Babel digital", onde a tecnologia busca a "imortalidade" (transumanismo) e a onisciência (inteligência artificial), repetindo o pecado original de querer ser "como Deus".'},
    {n:5,label:'🎯 Aplicação Profética',ul:[
      '<strong>Cumprimento histórico:</strong> o renascimento de Israel em 1948 (o florescer da figueira) é lido por muitos como o disparo do cronômetro final.',
      '<strong>Relevância escatológica:</strong> a transição da "economia de dinheiro" para a "economia de dados e rastreamento"; as moedas digitais de bancos centrais (CBDCs) formam o esqueleto técnico para Apocalipse 13:17.'
    ]},
    {n:6,label:'💥 Detalhes Demolidores',p:'A maioria espera um vilão óbvio, com chifres. O detalhe demolidor é que o sistema final será apresentado como <strong>utópico, sustentável e inclusivo</strong>: agendas globais com terminologia benevolente que, no entanto, centralizam o controle total da vida humana — exatamente como a Bíblia predisse sobre um sistema que domina até o direito de subsistir.'},
    {n:7,label:'⚔️ Batalha Espiritual',p:'A luta não é contra carne e sangue, mas contra <strong>ideologias de cativeiro</strong>. O sistema tenta capturar a mente pelo medo; a autoridade do crente está no discernimento de espíritos. O Anticristo é o "iníquo" (o sem-lei), e a batalha atual é a destruição dos limites morais e biológicos estabelecidos pelo Criador.'},
    {n:8,label:'👑 Caráter de Deus',p:'Em meio ao caos, Deus se revela como o <strong>Soberano sobre o tempo (El Olam)</strong>. Ele não está surpreso: ter descrito estes eventos há dois mil anos prova a Sua onisciência e o Seu cuidado em avisar os Seus filhos. É o Juiz justo que permite ao mal atingir a plenitude para que a Sua justiça se manifeste de forma definitiva.'},
    {n:9,label:'🙏 Aplicação Prática',ul:[
      '<strong>Desintoxicação sistêmica:</strong> depender menos do sistema mundial e mais da provisão divina.',
      '<strong>Vigilância espiritual:</strong> não se deixe levar por narrativas de medo; filtre tudo pela Palavra.',
      '<strong>Santidade intencional:</strong> num mundo de confusão, mantenha a mente sóbria e o coração puro.'
    ]},
    {n:10,label:'💭 Meditação Profunda',p:'Se o cenário para o governo do Anticristo está quase pronto, quão mais próxima está a manifestação do Rei dos reis? Se as sombras estão tão definidas, quão brilhante é a Luz prestes a romper as nuvens?'},
    {n:11,label:'🔥 Declarações de Fé',ul:[
      '"Não sou guiado pelo medo do sistema, mas pela fé no Soberano."',
      '"Minha cidadania não é desta terra; pertenço ao Reino que não pode ser abalado."',
      '"O Espírito que habita em mim é maior do que o que opera no mundo."'
    ]},
    {n:12,label:'📚 Tesouros Adicionais',p:'O termo "Nova Ordem Mundial" ecoa o <em>Novus Ordo Seclorum</em>. A Bíblia chama isso de "o mistério da injustiça", que já operava nos dias de Paulo mas que agora perde os seus freios contentores (2 Tessalonicenses 2:7).'},
    {n:13,label:'✨ Pérola Final',p:'O mundo não está desmoronando — está se <strong>posicionando</strong>. As peças do tabuleiro profético estão sendo movidas para o xeque-mate final. Para o mundo, é o fim; para a Igreja, é o <strong>levantamento da cabeça</strong>, pois a nossa redenção se aproxima. O palco está montado — mas quem encerrará a história não é o Anticristo: é o <strong>Cordeiro que venceu</strong>.'}
  ]
}
];

// grava as páginas
SERMOES.forEach(m=>{
  fs.writeFileSync(path.join(DIR,m.file), build(m), 'utf8');
  console.log('página:', m.file);
});

// atualiza o index.html (insere cards novos no topo do array SERMOES, sem duplicar)
const idxPath = path.join(DIR,'index.html');
let idx = fs.readFileSync(idxPath,'utf8');
const marker = 'var SERMOES = [';
const pos = idx.indexOf(marker);
if(pos<0){ console.log('!! marcador SERMOES não achado'); process.exit(1); }
const insertAt = pos + marker.length;
// ordem: mais recente em cima (mundo, dinheiro, esconder, leis)
const novos = ['o-mundo-se-posicionando.html','quando-o-dinheiro.html','ninguem-vai-se-esconder.html','leis-da-natureza.html'];
let bloco = '';
novos.forEach(f=>{
  if(idx.indexOf("arquivo:'"+f+"'")>=0){ console.log('já existe no index:', f); return; }
  const m = SERMOES.find(s=>s.file===f);
  bloco += "\n    {\n      arquivo:'"+m.file+"',\n      titulo:"+JSON.stringify(m.title)+",\n      ref:"+JSON.stringify(m.ref)+",\n      emoji:'"+m.emoji+"',\n      desc:"+JSON.stringify(m.card)+"\n    },";
});
if(bloco){
  idx = idx.slice(0,insertAt) + bloco + idx.slice(insertAt);
  fs.writeFileSync(idxPath, idx, 'utf8');
  console.log('index.html atualizado com', novos.length, 'cards');
} else {
  console.log('nada novo pra inserir no index');
}
console.log('OK');
