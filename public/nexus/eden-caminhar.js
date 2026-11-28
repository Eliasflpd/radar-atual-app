// O JARDIM DO ÉDEN PARA ANDAR DENTRO: o drone desce do alto e pousa no jardim; depois o usuário anda em primeira pessoa.
// Peças visuais (árvores, animais, aves, borboletas, chão): recortes do ChatGPT a pedido do NEXUS (ilustrativos), em /nexus/eden/.
// O mundo é montado aqui: relevo, rio que sai do Éden e se divide em quatro braços (Gn 2:10), grama que balança ao vento,
// árvores com vento, animais que andam, aves que voam, borboletas, e a presença do Senhor como luz e vento, sem figura (Gn 3:8).
// Controles: PC = WASD/setas para andar (Shift corre), arrastar para olhar; tablet = joystick à esquerda, arrastar para olhar,
// toque duplo no chão para ir até lá.

const VERSOS = {
  chegada: ['Gênesis 2:8', 'Então plantou o Senhor Deus um jardim, da banda do oriente, no Éden; e pôs ali o homem que tinha formado.'],
  arvore: ['Gênesis 2:9', 'E o Senhor Deus fez brotar da terra toda qualidade de árvores agradáveis à vista e boas para comida, bem como a árvore da vida no meio do jardim, e a árvore do conhecimento do bem e do mal.'],
  cachoeira: ['Gênesis 2:6', 'Um vapor, porém, subia da terra, e regava toda a face da terra.'],
  caverna: ['Salmos 104:24', 'Ó Senhor, quão variadas são as tuas obras! Todas as coisas fizeste com sabedoria; cheia está a terra das tuas riquezas.'],
  rio: ['Gênesis 2:10', 'E saía um rio do Éden para regar o jardim; e dali se dividia e se tornava em quatro braços.'],
  animais: ['Gênesis 2:19', 'Da terra formou, pois, o Senhor Deus todos os animais o campo e todas as aves do céu, e os trouxe ao homem, para ver como lhes chamaria; e tudo o que o homem chamou a todo ser vivente, isso foi o seu nome.'],
  presenca: ['Gênesis 3:8', 'E, ouvindo a voz do Senhor Deus, que passeava no jardim à tardinha, esconderam-se o homem e sua mulher da presença do Senhor Deus, entre as árvores do jardim.'],
  bom: ['Gênesis 1:31', 'E viu Deus tudo quanto fizera, e eis que era muito bom. E foi a tarde e a manhã, o dia sexto.'],
};
const NOTAS = {
  presenca: 'O texto diz que o Senhor Deus “passeava no jardim” (3:8). Aqui a presença aparece só como luz e vento, sem figura: o texto não a descreve.',
  rio: 'Os quatro braços são Pisom, Giom, Hidequel (Tigre) e Eufrates (2:11–14). Os dois últimos são conhecidos; os dois primeiros são debatidos.',
  arvore: 'A aparência da árvore da vida é ilustrativa: o texto não a descreve.',
};

// MUNDOS ANDÁVEIS: o mesmo motor monta o Éden e os lugares de Jesus. Cada mundo tem suas peças (pasta), céu, hora do dia e textos.
export const MUNDOS_ANDAVEIS = {
  eden: { titulo: 'O jardim do Éden', sub: 'GÊNESIS 2:8–15 · ANDAR NO JARDIM', pasta: 'eden', ceu: '/livros/eden-360-montanhas.jpg', noite: false, lat: 31.0, lon: 47.4, TD: { x: -0.6, z: -0.8 },
    credito: 'Reconstituição artística: peças geradas pelo ChatGPT a pedido do NEXUS (ilustrativas). O texto bíblico não descreve a aparência do jardim.', versos: VERSOS, notas: NOTAS,
    lugar: { arvore: 'diante da árvore da vida, no meio do jardim (Gn 2:9)', rio: 'onde o rio que sai do Éden se divide em quatro braços (Gn 2:10)', animais: 'entre os animais do jardim (Gn 2:19)', presenca: 'junto da luz que representa a presença do Senhor passeando no jardim (Gn 3:8)', chegada: 'na trilha que leva à árvore da vida (Gn 2:8)', bom: 'nas partes distantes do jardim (Gn 1:31)' }, nome: 'Jardim do Éden' },
  getsemani: { titulo: 'O Getsêmani', sub: 'MATEUS 26:36–46 · NOITE DE PÁSCOA, c. 30 d.C.', pasta: 'getsemani', ceu: '/getsemani/ceu-noite-360.jpg', noite: true, lat: 31.7795, lon: 35.2398, TD: { x: -0.766, z: 0.643 },   // a trilha desce do monte; de frente para a rocha, Jerusalém fica ao fundo (como no céu 360°)
    credito: 'Reconstituição artística do olival na encosta do Monte das Oliveiras, de noite (peças do ChatGPT, ilustrativas). A Páscoa cai na lua cheia; a posição exata do jardim não é conhecida.',
    versos: {
      chegada: ['João 18:1', 'Tendo Jesus dito isto, saiu com seus discípulos para o outro lado do ribeiro de Cedrom, onde havia um jardim, e com eles ali entrou.'],
      vigiai: ['Mateus 26:38', 'Então lhes disse: A minha alma está triste até a morte; ficai aqui e vigiai comigo.'],
      rocha: ['Mateus 26:39', 'E adiantando-se um pouco, prostrou-se com o rosto em terra e orou, dizendo: Meu Pai, se é possível, passa de mim este cálice; todavia, não seja como eu quero, mas como tu queres.'],
      presenca: ['Lucas 22:43', 'Então lhe apareceu um anjo do céu, que o confortava.'],
      tochas: ['João 18:3', 'Tendo, pois, Judas tomado a corte e uns guardas da parte dos principais sacerdotes e fariseus, chegou ali com lanternas archotes e armas.'],
      cidade: ['Lucas 19:41', 'E quando chegou perto e viu a cidade, chorou sobre ela,'],
      bom: ['Mateus 26:41', 'Vigiai e orai, para que não entreis em tentação; o espírito, na verdade, está pronto, mas a carne é fraca.'],
    },
    notas: { vigiai: 'As 8 oliveiras antigas de hoje, junto à Basílica da Agonia, foram datadas em parte por carbono-14: três têm troncos dos anos 1092, 1166 e 1198 (estudo italiano de 2012, publicado em 2015); as raízes podem ser mais antigas. Aqui elas representam o olival da época, não as árvores do ano 30.', cidade: 'Do outro lado do vale do Cedrom, a uns 300 m e mais alto que o olival: Jerusalém, com o Templo de Herodes no monte do Templo, as muralhas e a porta do lado leste; ao sul, a Cidade de Davi e o Monte Sião. (Lc 19:41 se passa nesta mesma encosta, alguns dias antes.)', rocha: 'Lucas 22:44 acrescenta a agonia e o suor “como grandes gotas de sangue”. A rocha aqui é ilustrativa; a tradição a mostra na Basílica da Agonia.', presenca: 'O anjo aparece só como luz, sem figura: o texto não o descreve.', chegada: '“Getsêmani” quer dizer “prensa de azeite”.' },
    lugar: { cidade: 'no mirante do Getsêmani, olhando Jerusalém e o Templo do outro lado do vale do Cedrom', rocha: 'junto da rocha onde Jesus orou (Mt 26:39)', vigiai: 'no olival, perto de onde os discípulos dormiram (Mt 26:38–43)', presenca: 'junto da luz que representa o anjo que o confortou (Lc 22:43)', tochas: 'vendo as tochas dos guardas subindo do vale do Cedrom (Jo 18:3)', chegada: 'na trilha que sobe do ribeiro de Cedrom (Jo 18:1)', bom: 'nas partes altas do Monte das Oliveiras' }, nome: 'Jardim do Getsêmani' },
  jerusalem: { titulo: 'Jerusalém', sub: 'c. 30 d.C. · O TEMPLO DE HERODES E A CIDADE', pasta: 'jerusalem', ceu: '/ela/ceu-ela-360.jpg', noite: false, lat: 31.7780, lon: 35.2354, TD: { x: 0.625, z: 0.781 }, inicio: 128,
    credito: 'Reconstituição de Jerusalém no ano 30 d.C. a partir de Josefo, da Mishná (Middot) e da arqueologia (Ritmeyer, maquete Holyland). Muros da esplanada, vales e colinas seguem o terreno real; a planta dos pátios, a Segunda Muralha e as casas são reconstrução.',
    versos: {
      chegada: ['Salmos 122:1–2', 'Alegrei-me quando me disseram: Vamos à casa do Senhor. Os nossos pés estão dentro das tuas portas, ó Jerusalém.'],
      santuario: ['João 2:20', 'Disseram, pois, os judeus: Em quarenta e seis anos foi edificado este templo, e tu o levantarás em três dias?'],
      portaFormosa: ['Atos 3:2', 'E era trazido um varão que desde o ventre de sua mãe era coxo, o qual todos os dias punham à porta do templo, chamada Formosa, para pedir esmola aos que entravam.'],
      salomao: ['João 10:23', 'E Jesus andava passeando no templo, no alpendre de Salomão.'],
      porticoReal: ['Marcos 13:1', 'E, saindo ele do templo, disse-lhe um dos seus discípulos: Mestre, olha que pedras e que edifícios!'],
      antonia: ['Atos 21:34', 'E, não podendo saber a verdade por causa do alvoroço, mandou conduzi-lo para a fortaleza.'],
      palacio: ['Mateus 27:27', 'E logo os soldados do presidente, conduzindo Jesus à audiência, reuniram junto dele toda a coorte.'],
      siloe: ['João 9:7', 'E disse-lhe: Vai, lava-te no tanque de Siloé (que significa o Enviado). Foi, pois, e lavou-se, e voltou vendo.'],
      cidadeDavi: ['2 Samuel 5:7', 'Porém Davi tomou a fortaleza de Sião; esta é a cidade de Davi.'],
      bom: ['Lucas 19:41', 'E quando chegou perto e viu a cidade, chorou sobre ela,'],
    },
    notas: { portaFormosa: 'A localização da Porta Formosa é debatida: a leitura mais comum a põe no muro leste do Pátio das Mulheres (a porta de bronze de Corinto descrita por Josefo); outros a identificam com a Porta de Nicanor.', palacio: 'Muitos estudiosos põem o pretório de Pilatos no palácio de Herodes, na Cidade Alta; a tradição medieval o punha na Antônia.', santuario: 'Medidas do Santuário segundo Josefo e a Mishná (Middot), que divergem em detalhes.' },
    lugar: { chegada: 'no Pátio dos Gentios, na esplanada do Templo', santuario: 'diante do Santuário', portaFormosa: 'diante da Porta Formosa', salomao: 'no Pórtico de Salomão', porticoReal: 'no Pórtico Real', antonia: 'junto da fortaleza Antônia', palacio: 'diante do palácio de Herodes', siloe: 'no tanque de Siloé', cidadeDavi: 'na Cidade de Davi', bom: 'na cidade' }, nome: 'Jerusalém' },
  ela: { titulo: 'O Vale de Elá', sub: '1 SAMUEL 17 · c. 1020 a.C.', pasta: 'ela', ceu: '/ela/ceu-ela-360.jpg', noite: false, lat: 31.69, lon: 34.96, TD: { x: 0, z: -1 }, inicio: 125,
    credito: 'Reconstituição do Vale de Elá na Sefelá (peças do ChatGPT, ilustrativas). O relevo segue a geografia do vale; a posição exata dos acampamentos é debatida.',
    versos: {
      israel: ['1 Samuel 17:2–3', 'Saul, porém, e os homens de Israel se ajuntaram e acamparam no vale de Elá, e ordenaram a batalha contra os filisteus. Os filisteus estavam num monte de um lado, e os israelitas estavam num monte do outro lado; e entre eles o vale.'],
      filisteus: ['1 Samuel 17:1', 'Ora, os filisteus ajuntaram as suas forças para a guerra e congregaram-se em Socó, que pertence a Judá, e acamparam entre Socó e Azeca, em Efes-Damim.'],
      golias: ['1 Samuel 17:4', 'Então saiu do arraial dos filisteus um campeão, cujo nome era Golias, de Gate, que tinha de altura seis côvados e um palmo.'],
      ribeiro: ['1 Samuel 17:40', 'Então tomou na mão o seu cajado, escolheu do ribeiro cinco seixos lisos e pô-los no alforje de pastor que trazia, a saber, no surrão, e, tomando na mão a sua funda, foi-se chegando ao filisteu.'],
      davi: ['1 Samuel 17:45', 'Davi, porém, lhe respondeu: Tu vens a mim com espada, com lança e com escudo; mas eu venho a ti em nome do Senhor dos exércitos, o Deus dos exércitos de Israel, a quem tens afrontado.'],
      oeste: ['1 Samuel 17:52', 'Então os homens de Israel e de Judá se levantaram, e jubilaram, e seguiram os filisteus até à entrada do vale, e até às portas de Ecrom; e caíram os feridos dos filisteus pelo caminho de Saaraim até Gate e até Ecrom.'],
      bom: ['1 Samuel 17:49', 'E Davi, metendo a mão no alforje, tirou dali uma pedra e com a funda lha atirou, ferindo o filisteu na testa; a pedra se lhe cravou na testa, e ele caiu com o rosto em terra.'],
    },
    notas: { golias: 'O texto hebraico diz seis côvados e um palmo (uns 2,9 m); a Septuaginta e um manuscrito do mar Morto (4QSamᵃ) dizem quatro côvados e um palmo (uns 2 m).', ribeiro: 'O leito do ribeiro do vale ainda é cheio de seixos lisos e arredondados.', filisteus: 'Os estudiosos divergem sobre em qual encosta ficava cada exército; aqui os filisteus estão na do sul.', oeste: 'Daqui o vale se abre para o oeste: Gate (Tel Tzafit), a cidade de Golias, fica a uns 8 km; depois vem a planície costeira até Asquelom. Gaza fica a uns 50 km, perdida na névoa; o Egito não se vê daqui.' },
    lugar: { israel: 'no acampamento de Israel, na encosta norte do vale', filisteus: 'perto do acampamento filisteu, na encosta sul', golias: 'diante de Golias, no meio do vale', ribeiro: 'no ribeiro de seixos onde Davi pegou as cinco pedras', oeste: 'olhando para o oeste, para Gate e a planície costeira', davi: 'no fundo do vale de Elá', bom: 'no vale de Elá' }, nome: 'Vale de Elá' },
};

export async function abrirJardim(THREE, host, { aoFechar, chegada = true, mundo = 'eden', oculto = false } = {}) {
  const folga = () => new Promise((ok) => setTimeout(ok, 0));   // montagem em pedaços: o globo continua girando liso enquanto o mundo é preparado
  const MW = MUNDOS_ANDAVEIS[mundo] || MUNDOS_ANDAVEIS.eden, E = MW === MUNDOS_ANDAVEIS.eden, G = MW === MUNDOS_ANDAVEIS.getsemani, L = MW === MUNDOS_ANDAVEIS.ela, J = MW === MUNDOS_ANDAVEIS.jerusalem, N = !!MW.noite, I = MW.inicio || 70; window.__nexusMundoAtual = MW.pasta;
  const BASES = [(window.NEXUS_MIDIA || '/nexus') + '/' + MW.pasta + '/', '/nexus/' + MW.pasta + '/'];
  let pecas = {}, base = BASES[0];
  for (const b of BASES) { try { const r = await fetch(b + 'pecas.json', { cache: 'no-cache' }); if (r.ok) { pecas = await r.json(); base = b; break; } } catch (_) {} }
  const toque = matchMedia('(pointer: coarse)').matches;
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  const raiz = document.createElement('div'); raiz.className = 'ej-raiz';
  raiz.innerHTML = `<style>
    .ej-raiz{position:absolute;inset:0;z-index:36;background:#cfc6a8;pointer-events:auto;opacity:0;transition:opacity 1.4s ease;font-family:Inter,system-ui,sans-serif;color:#fff;overflow:hidden}
    .ej-raiz.on{opacity:1}.ej-raiz canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
    .ej-cab{position:absolute;left:24px;top:18px;pointer-events:none}.ej-cab h2{margin:0;font:600 38px/1 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.7)}.ej-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.2em;color:#FFF3D0;text-shadow:0 1px 6px #000}
    .ej-bts{position:absolute;right:20px;top:18px;display:flex;gap:8px}.ej-bts button{border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.38);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .ej-card{position:absolute;left:24px;bottom:84px;width:min(440px,calc(100% - 48px));background:linear-gradient(160deg,rgba(20,33,61,.72),rgba(10,18,40,.55) 45%,rgba(40,28,8,.45));backdrop-filter:blur(12px);border:1px solid rgba(243,211,142,.35);border-radius:14px;padding:13px 16px;box-shadow:0 18px 40px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);transition:all .7s ease;pointer-events:none}
    .ej-card.v{opacity:1;transform:none}.ej-card p{margin:0 0 6px;font:17px/1.5 "Cormorant Garamond",Georgia,serif;color:#FFF8E6}.ej-card cite{font:700 11px Inter,sans-serif;color:#F3D38E;letter-spacing:.08em;text-transform:uppercase}.ej-card small{display:block;margin-top:6px;font:12px/1.45 Inter,sans-serif;color:rgba(255,240,210,.85)}
    .ej-joy{position:absolute;left:28px;bottom:28px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(6px);touch-action:none;display:${toque ? 'block' : 'none'}}
    .ej-joy b{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(243,211,142,.85);box-shadow:0 4px 14px rgba(0,0,0,.4)}
    .ej-raiz.voando .ej-joy{opacity:0;pointer-events:none}
    .ej-cred{position:absolute;right:20px;bottom:44px;max-width:420px;text-align:right;font-size:10.5px;color:rgba(255,255,255,.85);text-shadow:0 1px 4px #000}
    .ej-dica{position:absolute;right:20px;bottom:20px;font-size:12px;color:#fff;text-shadow:0 1px 4px #000}
    .ej-carga{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);padding:8px 16px;border-radius:20px;background:rgba(20,28,22,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font:500 13px system-ui,sans-serif;text-shadow:0 1px 2px #0008;pointer-events:none;opacity:0;transition:opacity .6s}
    .ej-carga.on{opacity:1}
    .ej-mira{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:rgba(255,255,255,.6);pointer-events:none}
  </style><canvas></canvas><div class="ej-mira"></div><div class="ej-carga"></div>
  <div class="ej-cab"><h2>${MW.titulo}</h2><p>${MW.sub}</p></div>
  <div class="ej-bts"><button type="button" class="ej-modo">👁 Primeira pessoa</button><button type="button" class="ej-voar">🕊 Voar</button><button type="button" class="ej-som">🔈 Som</button><button type="button" class="ej-sair">↩ Voltar</button></div>
  <div class="ej-card"></div><div class="ej-joy"><b></b></div>
  <div class="ej-cred">${MW.credito}</div>
  <div class="ej-dica">${toque ? 'Joystick para andar · arraste para olhar · toque duplo no chão para ir até lá' : 'W A S D ou setas para andar · Shift corre · arraste para olhar · duplo clique no chão para ir até lá'}</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), card = raiz.querySelector('.ej-card');
  const carga = (t) => { const el = raiz.querySelector('.ej-carga'); if (!el) return; if (t) el.textContent = t; el.classList.toggle('on', !!t); };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(toque ? 1.5 : 2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const cena = new THREE.Scene(); const NEVOA = new THREE.Color(E ? 0xbfccc9 : G ? 0x141c30 : 0xd9cfb4), DENS = E ? 0.00075 : G ? 0.0019 : 0.00055;
  cena.fog = new THREE.FogExp2(NEVOA, DENS); cena.background = NEVOA;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 9000);
  const SOL = (J ? new THREE.Vector3(0.62, 0.58, 0.5) : E ? new THREE.Vector3(-0.55, 0.42, -0.72) : G ? new THREE.Vector3(-0.188, 0.656, -0.731) : new THREE.Vector3(0.78, 0.32, -0.3)).normalize();   // sol no Éden; lua cheia no Getsêmani
  cena.add(J ? new THREE.HemisphereLight(0xdfe9ff, 0xb9a98a, 1.35) : !N ? new THREE.HemisphereLight(0xfff4dc, 0x5a5530, 1.25) : new THREE.HemisphereLight(0x8fa6d6, 0x15180e, 0.55)); const sol = J ? new THREE.DirectionalLight(0xfff3e0, 2.6) : !N ? new THREE.DirectionalLight(0xffe2b0, 2.4) : new THREE.DirectionalLight(0xc9d8ff, 1.15); sol.position.copy(SOL).multiplyScalar(500); cena.add(sol);
  // a imagem é decodificada FORA da tarefa principal (createImageBitmap): o globo segue girando liso enquanto as peças chegam
  const carregar = (n) => fetch(base + n).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
    .then((bm) => { const t = new THREE.Texture(bm); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; })
    .catch(() => new THREE.TextureLoader().loadAsync(base + n).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }).catch(() => null));
  const unif = { t: { value: 0 }, nevoa: { value: NEVOA }, dens: { value: DENS }, luz: { value: !N ? new THREE.Color(1, 1, 1) : new THREE.Color(0.36, 0.43, 0.6) } };   // luz: de noite, tudo recebe o luar frio
  const lixo = [];

  // CÉU: o 360° das montanhas do Éden ao fundo
  const ceuTex = await new THREE.TextureLoader().loadAsync((window.NEXUS_MIDIA || '/nexus') + MW.ceu).catch(() => new THREE.TextureLoader().loadAsync('/nexus' + MW.ceu).catch(() => null));
  let ceu = null;
  // ÉDEN: céu de verdade feito na placa de vídeo — azul no alto, bruma no horizonte (da mesma cor da névoa, sem emenda), brilho do sol
  // e nuvens altas que andam devagar; nada de paisagem pintada flutuando quando o drone sobe
  if (E) { const g = new THREE.SphereGeometry(4000, 64, 32); g.scale(-1, 1, 1);
    ceu = new THREE.Mesh(g, new THREE.ShaderMaterial({ depthWrite: false, fog: false, uniforms: { t: unif.t, nevoa: { value: NEVOA }, sol: { value: SOL.clone() } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float t; uniform vec3 nevoa, sol; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 6; i++) { s += a * n(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
        void main(){ vec3 d = normalize(vD); float y = d.y; vec3 zen = vec3(.18, .38, .72), meio = vec3(.46, .63, .86);
          vec3 c = mix(meio, zen, smoothstep(.05, .7, y)); c = mix(nevoa * 1.06, c, smoothstep(-.02, .2, y));
          float sd = max(dot(d, normalize(sol)), 0.); c += vec3(1., .85, .6) * (pow(sd, 8.) * .35 + pow(sd, 64.) * .6);
          if (y > 0.) { vec2 q = d.xz / (y + .12) * 1.6 + vec2(t * .004, t * .002); float nu = fbm(q) * .65 + fbm(q * 2.7 + 3.) * .35; float cob = smoothstep(.5, .78, nu) * smoothstep(.0, .18, y);
            vec3 nuvem = mix(vec3(.72, .74, .78), vec3(1.05, 1.02, .97), smoothstep(.55, .9, nu)) + vec3(1., .8, .55) * pow(sd, 6.) * .4; c = mix(c, nuvem, cob * .9); }
          c = mix(c, nevoa * 1.06, 1. - smoothstep(-.06, .06, y));
          gl_FragColor = vec4(c, 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` })); ceu.renderOrder = -1; cena.add(ceu); lixo.push(g, ceu.material); }
  else if (ceuTex) { ceuTex.colorSpace = THREE.SRGBColorSpace; const g = new THREE.SphereGeometry(4000, 64, 32); g.scale(-1, 1, 1); ceu = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ceuTex, color: E ? new THREE.Color(1.25, 1.2, 1.1) : G ? new THREE.Color(1, 1, 1.05) : new THREE.Color(1.12, 1.1, 1.05), fog: false, depthWrite: false })); ceu.renderOrder = -1; cena.add(ceu); lixo.push(ceuTex); }

  // RIOS: um rio vem do norte, passa ao lado da árvore da vida e se divide em quatro braços (Gn 2:10)
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const TD = MW.TD, TP = { x: -MW.TD.z, z: MW.TD.x };   // direção da trilha (do centro para fora) e o lado
  const T2W = (lado, s) => ({ x: TD.x * s + TP.x * lado, z: TD.z * s + TP.z * lado }); const W2T = (x, z) => ({ s: x * TD.x + z * TD.z, lado: x * TP.x + z * TP.z });
  const VT = (lado, s, y = 0) => { const w = T2W(lado, s); return new THREE.Vector3(w.x, y, w.z); };
  const FORQ = V(48, 36);
  const rios = (E ? [
    [V(-180, -2100), V(-120, -1500), V(-60, -900), V(10, -520), V(-30, -260), V(40, -110), V(30, -20), FORQ],
    [FORQ, V(160, 10), V(330, -90), V(560, -60), V(900, -180), V(1500, -420), V(2100, -380)],
    [FORQ, V(130, 150), V(260, 330), V(330, 560), V(520, 900), V(800, 1500), V(1000, 2100)],
    [FORQ, V(10, 170), V(-90, 330), V(-160, 560), V(-260, 900), V(-420, 1500), V(-520, 2100)],
    [FORQ, V(-60, 90), V(-230, 120), V(-430, 60), V(-900, 140), V(-1500, 260), V(-2100, 180)],
  ] : []).map((p, ri) => {
    // rio de verdade não corre em linha reta: meandros (curvas que se alternam), com comprimento de onda de umas 10 larguras;
    // perto da árvore da vida e da trilha as curvas são suaves, para a água não cortar o caminho
    const base = new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.5), L = base.getLength(), n = Math.max(8, Math.round(L / 22)), out = [], fase = ri * 2.1;
    for (let k = 0; k <= n; k++) { const u = k / n, q = base.getPointAt(u), tg = base.getTangentAt(u), sArc = u * L, r = Math.hypot(q.x, q.z);
      const A = (ri === 0 ? 48 : ri === 5 ? 7 : 40) * (0.4 * THREE.MathUtils.smoothstep(r, 55, 160) + 0.6 * THREE.MathUtils.smoothstep(r, 170, 520)) * THREE.MathUtils.smoothstep(sArc, 0, 45) * THREE.MathUtils.smoothstep(L - sArc, 0, 80);
      const off = A * (Math.sin(sArc / 165 + fase) + 0.45 * Math.sin(sArc / 61 + fase * 1.7) + 0.2 * Math.sin(sArc / 29 + fase * 0.6));
      out.push(new THREE.Vector3(q.x - tg.z * off, 0, q.z + tg.x * off)); }
    return new THREE.CatmullRomCurve3(out, false, 'catmullrom', 0.5); });
  const LARG = (i) => (i === 0 ? 16 : i === 5 ? 4.2 : 11);   // largura de cada curso d'água (o riacho é estreito)
  // distância ao riacho da clareira (só ele): o chão em volta vira terra escura com musgo, sem capim alto
  const ptsRiacho = []; if (E && rios[5]) for (let k = 0; k <= 160; k++) { const p = rios[5].getPointAt(k / 160); ptsRiacho.push(p.x, p.z); }
  const bbR = [1e9, -1e9, 1e9, -1e9]; for (let k = 0; k < ptsRiacho.length; k += 2) { bbR[0] = Math.min(bbR[0], ptsRiacho[k] - 40); bbR[1] = Math.max(bbR[1], ptsRiacho[k] + 40); bbR[2] = Math.min(bbR[2], ptsRiacho[k + 1] - 40); bbR[3] = Math.max(bbR[3], ptsRiacho[k + 1] + 40); }
  const dRiacho = (x, z) => { if (!ptsRiacho.length || x < bbR[0] || x > bbR[1] || z < bbR[2] || z > bbR[3]) return 1e9; let m = 1e9; for (let k = 0; k < ptsRiacho.length; k += 2) { const dx = x - ptsRiacho[k], dz = z - ptsRiacho[k + 1], q = dx * dx + dz * dz; if (q < m) m = q; } return Math.sqrt(m); };
  const amostras = []; rios.forEach((c, i) => { for (let k = 0; k <= 700; k++) { const p = c.getPointAt(k / 700); amostras.push(p.x, p.z, LARG(i)); } });
  const CEL = 60, grade = new Map(); for (let i = 0; i < amostras.length; i += 3) { const k = (Math.floor(amostras[i] / CEL) + 2048) * 4096 + Math.floor(amostras[i + 1] / CEL) + 2048; if (!grade.has(k)) grade.set(k, []); grade.get(k).push(i); }
  function distRio(x, z) { let m = 1e9, w = 11; const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const l = grade.get((cx + a + 2048) * 4096 + cz + b + 2048); if (!l) continue; for (const i of l) { const dx = x - amostras[i], dz = z - amostras[i + 1], d = dx * dx + dz * dz; if (d < m) { m = d; w = amostras[i + 2]; } } } return [m < 1e9 ? Math.sqrt(m) : 999, w]; }

  // RELEVO: colinas suaves no jardim, montanhas ao longe, leito dos rios escavado
  const hGets = (x, z) => { const sJ = -(x * MW.TD.x + z * MW.TD.z), xx = -sJ, ss = THREE.MathUtils.smoothstep;   // perfil real: o olival fica no pé do Monte das Oliveiras, uns 20 m acima do Cedrom; do outro lado o monte do Templo sobe uns 45 m acima do olival, a ~300 m
    const enc = (sJ > 0 ? -22 * ss(sJ, 15, 120) - 6 * ss(sJ, 200, 420) : 0.11 * xx + 2.5 * Math.tanh(xx / 60)) - 1.2 * Math.sin(z * 0.012) + 0.6 * Math.sin(x * 0.05 + z * 0.03); const pas = 1.6, k = enc / pas, deg = pas * (Math.floor(k) + THREE.MathUtils.smoothstep(k - Math.floor(k), 0.78, 1)); const plano = 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 6, 16); return (deg * 0.85 + enc * 0.15) * (1 - plano); };
  const ribZ = (x) => 12 * Math.sin(x / 180) + 5 * Math.sin(x / 63);   // o ribeiro serpenteia pelo fundo do vale
  const hEla = (x, z) => { const ss = THREE.MathUtils.smoothstep, az = Math.abs(z), abre = ss(x, -1700, -600), leste = Math.max(0, x - 1000) * 0.12;
    const encosta = 85 * ss(az, 70, 300) * (0.78 + 0.22 * Math.sin(x * 0.004 + (z > 0 ? 1 : 2.5))), ondula = 4 * Math.sin(x * 0.011) * Math.cos(z * 0.013) + 2 * Math.sin(x * 0.03 + z * 0.02);
    const leito = -1.6 * (1 - ss(Math.abs(z - ribZ(x)), 2.2, 7)); return encosta * abre + ondula * (0.35 + 0.65 * ss(az, 60, 220)) + leste + leito - 12 * (1 - abre); };
  const JC = J ? await import('/nexus/jerusalem-cidade.js?v=7') : null;
  const CQM = E ? await import('/nexus/eden-cachoeira.js?v=9') : null, CQ = E ? (() => { const c = rios[0]; let uu = 0.5; for (let k = 0; k <= 800; k++) { const u = k / 800, q = c.getPointAt(u); if (Math.hypot(q.x, q.z) < 420) { uu = u; break; } } const q = c.getPointAt(uu), tg = c.getTangentAt(uu); return { x: q.x, z: q.z, dx: -tg.x, dz: -tg.z, u: uu }; })() : null;   // a cachoeira fica NO rio principal, uns 420 m rio acima da árvore da vida
  const manchaMata = (x, z) => 0.5 + 0.5 * (0.55 * Math.sin(x / 170 + 1.3) * Math.cos(z / 210 - 0.7) + 0.3 * Math.sin((x + z) / 97 + 2.1) + 0.15 * Math.sin(x / 41 - z / 53));
  const hBase0 = (x, z) => { if (J) return JC.hJer(x, z); if (G) return hGets(x, z); if (L) return hEla(x, z); const r = Math.hypot(x, z), dv = Math.max(0, distRio(x, z)[0] - 18), vale = 30 * THREE.MathUtils.smoothstep(dv, 8, 300) * (0.7 + 0.3 * Math.sin(x * 0.0041 + 1.1) * Math.cos(z * 0.0037)) * THREE.MathUtils.smoothstep(r, 20, 90); return vale + 2.0 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 1.0 * Math.sin(x * 0.031 + z * 0.027) + 0.4 * Math.sin(x * 0.09 - z * 0.07) + Math.max(0, r - 1550) ** 1.25 * 0.03 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x) * 5)); };
  const CQR = CQM ? CQM.relevoCachoeira(hBase0, CQ) : null, hBase = CQR ? CQR.h : hBase0;
  const T = 4400, NS = toque ? 400 : 560;
  const geoT = new THREE.PlaneGeometry(T, T, NS, NS); geoT.rotateX(-Math.PI / 2);
  const pos = geoT.attributes.position, cores = new Float32Array(pos.count * 3), alturas = new Float32Array(pos.count), relRio = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { if (i % 3000 === 0) await folga(); const x = pos.getX(i), z = pos.getZ(i); const [d, w] = distRio(x, z); relRio[i] = d / w; const leito = (1 - THREE.MathUtils.smoothstep(d, w * 0.95, w * 1.45)) * 1.5 + 6.2 * Math.pow(Math.max(0, 1 - d / w), 1.15); const h = hBase(x, z) - leito; pos.setY(i, h); alturas[i] = h;
    const mar = THREE.MathUtils.smoothstep(d, w * 1.2, w * 2.4), longe = THREE.MathUtils.smoothstep(Math.hypot(x, z), 420, 700), v = 0.85 + 0.25 * Math.sin(x * 0.05) * Math.cos(z * 0.043);
    cores[i * 3] = (0.78 + 0.22 * (1 - mar)) * v * (1 + longe * 0.15); cores[i * 3 + 1] = (0.92 + 0.0 * mar) * v; cores[i * 3 + 2] = (0.72 + 0.18 * (1 - mar)) * v * (1 - longe * 0.1);
    const banco = 1 - THREE.MathUtils.smoothstep(d, w * 1.0, w * 1.35); if (banco > 0) { cores[i * 3] = cores[i * 3] * (1 - banco) + 0.85 * banco; cores[i * 3 + 1] = cores[i * 3 + 1] * (1 - banco) + 0.72 * banco; cores[i * 3 + 2] = cores[i * 3 + 2] * (1 - banco) + 0.55 * banco; } }
  // as montanhas em volta: cobertas de mata, azuladas pela distância (perspectiva aérea), e no fim se desfazem na névoa
  if (E) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), r = Math.max(Math.abs(x), Math.abs(z)) * 0.6 + Math.hypot(x, z) * 0.4; if (r < 1300) continue; const k = THREE.MathUtils.smoothstep(r, 1300, 1900), hh = alturas[i], fim = THREE.MathUtils.smoothstep(r, 1850, 2150);
    const alto = THREE.MathUtils.smoothstep(hh, 40, 110); cores[i * 3] = cores[i * 3] * (1 - k) + (0.30 + 0.25 * alto) * k; cores[i * 3 + 1] = cores[i * 3 + 1] * (1 - k) + (0.42 + 0.2 * alto) * k; cores[i * 3 + 2] = cores[i * 3 + 2] * (1 - k) + (0.38 + 0.3 * alto) * k; cores[i * 3] += (NEVOA.r * 0.82 - cores[i * 3]) * fim; cores[i * 3 + 1] += (NEVOA.g * 0.82 - cores[i * 3 + 1]) * fim; cores[i * 3 + 2] += (NEVOA.b * 0.82 - cores[i * 3 + 2]) * fim; }
  if (E) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), F = manchaMata(x, z), r = Math.hypot(x, z); if (r < 60) continue;
    const mata = THREE.MathUtils.smoothstep(F, 0.47, 0.62) * THREE.MathUtils.smoothstep(r, 60, 120), campo = 1 - THREE.MathUtils.smoothstep(F, 0.36, 0.48);
    cores[i * 3] *= 1 - 0.5 * mata + 0.1 * campo; cores[i * 3 + 1] *= 1 - 0.32 * mata + 0.04 * campo; cores[i * 3 + 2] *= 1 - 0.45 * mata - 0.1 * campo; }   // chão de mata fechada, escuro; campo, mais claro e dourado
  window.__clrChao = 0; if (E && ptsRiacho.length) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = dRiacho(x, z); if (d > 30) continue; window.__clrChao++; const k = 1 - THREE.MathUtils.smoothstep(d, 18, 30);
    if (d > 4) relRio[i] = Math.min(relRio[i], 1.2 + 0.6 * THREE.MathUtils.smoothstep(d, 20, 30));   // sem capim alto na clareira
    const trilha = 1 - THREE.MathUtils.smoothstep(Math.abs(d - 7.5), 0.6, 1.8), mus = 0.5 + 0.5 * Math.sin(x * 0.9) * Math.cos(z * 0.7);
    const r0 = 0.36 + 0.06 * mus, g0 = 0.40 + 0.12 * mus, b0 = 0.24, rT = 0.50, gT = 0.40, bT = 0.28;
    const R = r0 * (1 - trilha) + rT * trilha, G = g0 * (1 - trilha) + gT * trilha, B = b0 * (1 - trilha) + bT * trilha;
    cores[i * 3] += (R - cores[i * 3]) * k; cores[i * 3 + 1] += (G - cores[i * 3 + 1]) * k; cores[i * 3 + 2] += (B - cores[i * 3 + 2]) * k; }
  // na cachoeira: sem grama no poço, na laje de pedra e na boca da caverna; o chão ali é rocha escura e molhada
  if (CQ) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), u = CQ.x - x, v = z - CQ.z, r = Math.hypot(u, v); if (r > 60) continue; const a = Math.atan2(v, u);
    const pedra = r < 31 || (Math.abs(a) < 1.45 && r < 46); if (!pedra) continue; relRio[i] = 0; const v0 = 0.42 + 0.08 * Math.sin(x * 0.7) * Math.cos(z * 0.6); cores[i * 3] = v0; cores[i * 3 + 1] = v0 * 1.02; cores[i * 3 + 2] = v0 * 0.95; }
  if (J) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), v = 0.9 + 0.12 * Math.sin(x * 0.07) * Math.cos(z * 0.05) + 0.06 * Math.sin(x * 0.31 + z * 0.23), oliv = THREE.MathUtils.smoothstep(x, 300, 600) * 0.5; cores[i * 3] = (0.86 - oliv * 0.18) * v; cores[i * 3 + 1] = (0.86 - oliv * 0.04) * v; cores[i * 3 + 2] = (0.84 - oliv * 0.1) * v; }   // terra rosa e calcário; oliveiras a leste
  geoT.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geoT.computeVertexNormals();
  const chaoTex = await carregar(E ? 'chao-grama.jpg' : J ? 'chao-Diffuse.jpg' : G ? 'chao-terra.jpg' : 'chao-ela.jpg'); if (chaoTex) { chaoTex.wrapS = chaoTex.wrapT = THREE.RepeatWrapping; chaoTex.repeat.set(T / 9, T / 9); lixo.push(chaoTex); }
  const terreno = new THREE.Mesh(geoT, new THREE.MeshStandardMaterial({ map: chaoTex, color: chaoTex ? 0xffffff : 0x6f8f3a, vertexColors: true, roughness: 0.96 }));
  cena.add(terreno); lixo.push(geoT, terreno.material);
  const passo = T / NS;
  function altura(x, z) { const fx = (x + T / 2) / passo, fz = (z + T / 2) / passo, ix = Math.max(0, Math.min(NS - 1, Math.floor(fx))), iz = Math.max(0, Math.min(NS - 1, Math.floor(fz))), ax = fx - ix, az = fz - iz, n = NS + 1;
    const a = alturas[iz * n + ix], b = alturas[iz * n + ix + 1], c = alturas[(iz + 1) * n + ix], d = alturas[(iz + 1) * n + ix + 1]; return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + d * ax) * az; }
  // O ÉDEN DE VERDADE (eden-real.js): árvores, plantas, flores, pedras e chão de fotogrametria (CC0) no lugar dos recortes desenhados
  const obstR = [], ER = E ? await import('/nexus/eden-real.js?v=2').then((m) => m.criarEdenReal(THREE, cena, { base: '/nexus/eden/real/', altura, unif, toque, lixo, SOL, rnd, obst: obstR, renderer })).catch((e) => { console.warn('eden-real', e); return null; }) : null;
  if (ER) (async () => { await folga(); const ss = THREE.MathUtils.smoothstep, nrm = geoT.attributes.normal, pA = new Float32Array(pos.count * 4), pB = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { if (i % 4000 === 0) await folga(); const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), ny = nrm.getY(i), rr = relRio[i];
      const n1 = 0.5 + 0.5 * (0.6 * Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017 - 0.4) + 0.4 * Math.sin((x - z) * 0.047)), F = manchaMata(x, z);
      const mata = ss(F, 0.45, 0.6) * ss(r, 35, 80), margem = 1 - ss(rr, 1.0, 1.7), lama = (1 - ss(rr, 1.4, 2.6)) * (1 - margem);
      let rocha = 1 - ss(ny, 0.72, 0.86); rocha = Math.max(rocha, ss(alturas[i], 70, 140) * ss(r, 1300, 1600));
      if (CQ) { const u = CQ.x - x, v = z - CQ.z, rc = Math.hypot(u, v), a = Math.atan2(v, u); if (rc < 31 || (Math.abs(a) < 1.45 && rc < 46)) rocha = 1; }
      const dr = dRiacho(x, z), clr = dr < 30 ? 1 - ss(dr, 18, 30) : 0;
      let campo = (1 - mata * 0.6) * (1 - clr), musgo = mata * 0.4 + clr * 0.7, grama = campo * (0.35 + 0.65 * n1), terra = campo * (0.65 - 0.65 * n1) * 0.55 + clr * 0.2;
      const resto = (1 - rocha) * (1 - margem * 0.9); grama *= resto; terra *= resto; musgo *= resto; const lm = lama * (1 - rocha), cs = margem * (1 - rocha);
      const sum = grama + terra + musgo + cs + lm + rocha + 1e-5; pA.set([grama / sum, terra / sum, musgo / sum, cs / sum], i * 4); pB.set([lm / sum, rocha / sum], i * 2); }
    if (!(await ER.chao(terreno, pA, pB))) console.warn('chão real não carregou'); })();
  if (ER) {
    // SOMBRAS de verdade do sol (só perto de quem anda, onde as árvores são 3D)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; sol.shadow.radius = 3; sol.shadow.intensity = 0.62; sol.castShadow = true; sol.shadow.mapSize.set(toque ? 1024 : 2048, toque ? 1024 : 2048);
    { const sc = sol.shadow.camera, L = toque ? 40 : 65; sc.left = -L; sc.right = L; sc.top = L; sc.bottom = -L; sc.near = 10; sc.far = 700; sc.updateProjectionMatrix(); } sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.06; cena.add(sol.target); }

  // O RIO: largo, fundo e com correnteza forte. Raso e transparente nas margens (vê-se a areia e as pedras do fundo),
  // escuro como esmeralda no meio (a profundidade engole a luz), ondas que descem com a corrente, linhas de espuma,
  // reflexo real das árvores e do céu (espelho calculado a cada quadro) e água branca batendo nas pedras.
  const PEDRAS = []; rios.forEach((c, i) => { const w = LARG(i); for (let k = 0; k < (i === 0 ? 14 : 7); k++) { const u = 0.04 + rnd() * 0.3, p = c.getPointAt(u), tg = c.getTangentAt(u), lado = (rnd() * 2 - 1) * w * 0.85; const x = p.x - tg.z * lado, z = p.z + tg.x * lado; if (Math.hypot(x, z) < 24) continue; PEDRAS.push({ x, z, r: 0.8 + rnd() * 2.2 }); } });
  const NPED = Math.min(48, PEDRAS.length), pedU = Array.from({ length: 48 }, (_, i) => i < NPED ? new THREE.Vector3(PEDRAS[i].x, PEDRAS[i].z, PEDRAS[i].r) : new THREE.Vector3(1e5, 1e5, 0));
  const reflRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  const reflCam = new THREE.PerspectiveCamera(); const texMat = new THREE.Matrix4();
  const matAgua = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL }, refl: { value: reflRT.texture }, texMat: { value: texMat }, pedras: { value: pedU } },
    vertexShader: `uniform float t; uniform mat4 texMat; attribute vec3 tg; attribute float prof; varying vec2 vUv; varying vec3 vW, vTg; varying float vD, vProf; varying vec4 vRef;
      void main(){ vUv = uv; vTg = tg; vProf = prof; vec3 p = position; float meio = smoothstep(.0, 1.2, prof); float rap = smoothstep(.25, .85, .5 + .5 * sin(uv.y * .013) * sin(uv.y * .029 + 1.)); meio *= 1. + 1.8 * rap;
        p.y += meio * (sin(uv.y * .55 - t * 2.4 + uv.x * 2.) * .16 + sin(uv.y * 1.3 - t * 3.6 + uv.x * 5.) * .07 + sin(uv.y * .21 - t * 1.3) * .1);
        vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vRef = texMat * w; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol, pedras[48]; uniform sampler2D refl; varying vec2 vUv; varying vec3 vW, vTg; varying float vD, vProf; varying vec4 vRef;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
      float onda(vec2 q){ vec2 w = vec2(fbm(q * .15 + t * .05), fbm(q * .15 - 3.1)) * 4.; q += w; return fbm(q * vec2(.7, .3) - vec2(0., t * 1.9)) * .55 + fbm(q * vec2(2.1, 1.1) - vec2(t * .3, t * 3.1)) * .3 + fbm(q * vec2(5., 3.) - vec2(0., t * 4.5)) * .15; }
      void main(){
        vec3 tg = normalize(vTg), lado = normalize(cross(vec3(0., 1., 0.), tg));
        vec2 q = vec2((vUv.x - .5) * 30., vUv.y);   // coordenadas da corrente (atravessando, ao longo)
        float e = .35, h0 = onda(q), hx = onda(q + vec2(e, 0.)), hz = onda(q + vec2(0., e));
        float rap = smoothstep(.25, .85, .5 + .5 * sin(vUv.y * .013) * sin(vUv.y * .029 + 1.)); float forca = (.55 + .9 * smoothstep(.0, 2.5, vProf)) * (1. + 1.4 * rap);
        vec3 nl = normalize(vec3(-(hx - h0) / e * forca, 1., -(hz - h0) / e * forca));
        vec3 nn = normalize(lado * nl.x + vec3(0., 1., 0.) * nl.y + tg * nl.z);
        vec3 olho = normalize(cameraPosition - vW); float cosv = max(dot(olho, nn), 0.); float F = .02 + .98 * pow(1. - cosv, 5.);
        // o fundo visto através da água (areia e seixos), engolido pela profundidade
        vec2 fp = vW.xz * .45 + nn.xz * (.6 + vProf * .25); float sx = fbm(fp * 1.3), seixo = smoothstep(.55, .7, n(fp * 3.1));
        vec3 leito = mix(vec3(.46, .38, .26), vec3(.25, .23, .18), seixo) * (.7 + .5 * sx); float cau = pow(1. - abs(sin(fbm(fp * 1.7 + vec2(t * .25, -t * .4)) * 11.)), 7.); leito += vec3(1., .95, .75) * cau * .9 * exp(-vProf * 1.1) * max(dot(nn, sol), 0.);
        float caminho = vProf / max(cosv, .25); vec3 absorve = exp(-caminho * vec3(.62, .22, .30));
        vec3 profundo = vec3(.004, .035, .028);
        vec3 corpo = leito * absorve * 1.1 + profundo * (1. - absorve) + vec3(.006, .045, .028) * (1. - absorve.g) * (.6 + .5 * h0);
        // reflexo das árvores e do céu
        vec4 rr = vRef; rr.xy += nn.xz * 1.6 * rr.w * .06; vec3 ref = texture2DProj(refl, rr).rgb * vec3(.34, .46, .38);
        vec3 c = mix(corpo, ref, clamp(F * .85 + .03, 0., .75));
        float crista = smoothstep(.58, .82, h0); c += vec3(.012, .1, .065) * crista * (1. - absorve.g) * (1. + rap);
        float bri = pow(max(dot(reflect(-sol, nn), olho), 0.), 300.) * 9. + pow(max(dot(reflect(-sol, nn), olho), 0.), 24.) * .22; c += vec3(1., .88, .62) * bri;
        // espuma: nas margens rasas, em linhas que a corrente arrasta e nas pedras
        float linhas = smoothstep(.66, .82, fbm(q * vec2(1.6, .12) - vec2(0., t * 2.2))) * smoothstep(.4, 2., vProf) * .75 + smoothstep(.72, .9, h0) * .5;
        float margem = smoothstep(.35, .05, vProf) * smoothstep(.35, .7, fbm(q * vec2(3., 1.) - vec2(0., t * 1.5)));
        float pedra = 0.;
        for (int i = 0; i < 48; i++) { vec2 rel = vW.xz - pedras[i].xy; float r = pedras[i].z; if (r <= 0.) continue; float dd = length(rel); if (dd > r * 9.) continue;
          float ao = dot(rel, tg.xz), at = dot(rel, lado.xz); float anel = smoothstep(r * 1.6, r * .95, dd); float esteira = exp(-abs(at) / (r * .7)) * smoothstep(-r, 0., ao) * exp(-max(ao, 0.) / (r * 4.));
          pedra += (anel + esteira * .8) * smoothstep(.3, .65, fbm(q * vec2(4., 1.6) - vec2(0., t * 4.))); }
        float branca = rap * smoothstep(.5, .72, h0 + .25 * fbm(q * vec2(3., 1.2) - vec2(0., t * 5.))) * smoothstep(.5, 2., vProf);
        float esp = clamp(linhas + margem + pedra + branca * 1.2, 0., 1.); c = mix(c, vec3(.95, .97, .96) * (.75 + .3 * max(dot(nn, sol), 0.)), esp * .85);
        float a = smoothstep(0., .12, vProf) * smoothstep(0., .04, min(vUv.x, 1. - vUv.x)); a = max(a, esp * smoothstep(0., .05, vProf));
        float f = 1. - exp(-dens * dens * vD * vD); c = mix(c, nevoa, f);
        gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  const aguas = [];
  for (const [i, c] of rios.entries()) { await folga(); const N = 1700, M = 14, w = LARG(i), P = [], U = [], TG = [], PR = [], I = []; let s = 0, ant = null;
    for (let k = 0; k <= N; k++) { const u = k / N, p = c.getPointAt(u), tg = c.getTangentAt(u), lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize(); if (ant) s += p.distanceTo(ant); ant = p;
      for (let j = 0; j <= M; j++) { const a = j / M, q = p.clone().addScaledVector(lado, (a * 2 - 1) * w * 1.08), y = hBase(q.x, q.z) - 1.0; P.push(q.x, y, q.z); U.push(a, s); TG.push(tg.x, 0, tg.z); PR.push(Math.max(0, y - altura(q.x, q.z))); } }
    for (let k = 0; k < N; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('tg', new THREE.Float32BufferAttribute(TG, 3)); g.setAttribute('prof', new THREE.Float32BufferAttribute(PR, 1)); g.setIndex(I);
    const m = new THREE.Mesh(g, matAgua); m.renderOrder = 2; cena.add(m); aguas.push(m); lixo.push(g); }
  lixo.push(matAgua, reflRT);
  const CQO = CQM ? await CQM.criarCachoeira(THREE, cena, { P: CQ, hP: CQR.hP, carregar, lixo, unif, SOL, toque }) : null;
  // A MARGEM: faixa de areia molhada e cascalho dos dois lados de cada braço do rio, escurecida junto à água,
  // com a espuma que avança e recua na beira; por cima, seixos e pedras meio enterrados
  const matMargem = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, uniforms: { ...unif, sol: { value: SOL } },
    vertexShader: `attribute float m, ls; varying float vM, vS, vD; varying vec3 vW; void main(){ vM = m; vS = ls; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol; varying float vM, vS, vD; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n(p); p = p * 2.07 + 5.3; a *= .5; } return s; }
      vec3 cel(vec2 p){ vec2 i = floor(p), f = fract(p); float m1 = 9., id = 0.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = .2 + .6 * vec2(h(i + g), h(i + g + 17.)); vec2 dv = (g + o - f) * vec2(1., 1.25); float d = length(dv); if (d < m1) { m1 = d; id = h(i + g + 3.1); } } return vec3(m1, id, 0.); }
      void main(){ vec2 p = vW.xz;
        vec3 c1 = cel(p * 3.2), c2 = cel(p * 9.);
        float dsx = smoothstep(.3, .62, fbm(p * .3 + 3.)) * (1. - smoothstep(.7, 1., vM)) * .85;
        float r1 = .2 + .25 * c1.y, s1 = step(1. - dsx, fract(c1.y * 7.31)) * smoothstep(r1, r1 - .07, c1.x);
        float r2 = .15 + .2 * c2.y, s2 = step(1. - dsx * .7, fract(c2.y * 5.17)) * smoothstep(r2, r2 - .06, c2.x);
        vec3 areia = mix(vec3(.36, .31, .23), vec3(.27, .24, .19), fbm(p * .9)) * (.9 + .2 * n(p * 40.));
        vec3 pedra1 = mix(vec3(.30, .29, .26), vec3(.50, .46, .38), fract(c1.y * 13.7)) * (.8 + .4 * (1. - c1.x / max(r1, .01)));
        vec3 pedra2 = mix(vec3(.26, .24, .21), vec3(.44, .40, .33), fract(c2.y * 11.3)) * (.8 + .3 * (1. - c2.x / max(r2, .01)));
        vec3 c = mix(mix(areia, pedra2, s2), pedra1, s1); c *= mix(1., .75, smoothstep(r1 + .02, r1 - .02, c1.x) * (1. - s1) * dsx);
        // molhado junto à água: mais escuro, mais saturado, com brilho do sol
        float linha = .48 + .035 * sin(t * .9 + vS * .21) + .02 * sin(t * 1.7 + vS * .57);
        float molhado = smoothstep(linha + .22, linha - .02, vM);
        c = mix(c, c * vec3(.45, .47, .44), molhado);
        vec3 olho = normalize(cameraPosition - vW); float bri = pow(max(dot(reflect(-sol, vec3(0., 1., 0.)), olho), 0.), 40.) * molhado * .6; c += vec3(1., .9, .7) * bri;
        // espuma que avança e recua
        float esp = smoothstep(.035, .0, abs(vM - linha + .01)) * smoothstep(.35, .65, fbm(vec2(vS * .6, vM * 9.) - vec2(t * .4, 0.)));
        esp += smoothstep(.07, .0, abs(vM - linha + .05)) * .35 * smoothstep(.5, .75, fbm(vec2(vS * 1.2, t * .3)));
        c = mix(c, vec3(.92, .94, .93), clamp(esp, 0., 1.) * .8);
        float a = smoothstep(.0, .14, vM) * smoothstep(.95, .45 + .35 * fbm(p * .5), vM);
        float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  for (const [i, c] of rios.entries()) { await folga(); const w = LARG(i), N = 1700, M = 6;
    for (const lado of [-1, 1]) { const P = [], MM = [], LS = [], I = []; let s = 0, ant = null;
      for (let k = 0; k <= N; k++) { const u = k / N, p = c.getPointAt(u), tg = c.getTangentAt(u), ld = new THREE.Vector3(-tg.z, 0, tg.x).normalize(); if (ant) s += p.distanceTo(ant); ant = p;
        for (let j = 0; j <= M; j++) { const m = j / M, off = w * (0.85 + m * 0.55), q = p.clone().addScaledVector(ld, lado * off); P.push(q.x, Math.max(altura(q.x, q.z), hBase(q.x, q.z) - 1.05) + 0.2, q.z); MM.push(m); LS.push(s); } }
      for (let k = 0; k < N; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('m', new THREE.Float32BufferAttribute(MM, 1)); g.setAttribute('ls', new THREE.Float32BufferAttribute(LS, 1)); g.setIndex(I);
      const ms = new THREE.Mesh(g, matMargem); ms.renderOrder = 1; cena.add(ms); lixo.push(g); } }
  lixo.push(matMargem);
  { const gq = new THREE.IcosahedronGeometry(1, 2), pq = gq.attributes.position; for (let i = 0; i < pq.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pq, i), k = 1 + 0.18 * Math.sin(v.x * 4.1 + v.z * 3.3) * Math.cos(v.y * 3.7); pq.setXYZ(i, v.x * k * 1.3, v.y * k * 0.55, v.z * k); } gq.computeVertexNormals();
    const NQ = !rios.length ? 0 : toque ? 600 : 1300, mq = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), iq = new THREE.InstancedMesh(gq, mq, NQ), mt = new THREE.Matrix4(), qq = new THREE.Quaternion(); let k = 0;
    for (let tent = 0; k < NQ && tent < NQ * 6; tent++) { const ci = Math.floor(rnd() * rios.length), c = rios[ci], w = LARG(ci), u = rnd() * 0.75, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = w * (0.98 + rnd() * 0.4), x = p.x - tg.z * sx * d, z = p.z + tg.x * sx * d;
      if (Math.hypot(x, z) < 22) continue; const sc = 0.18 + Math.pow(rnd(), 2.5) * 0.9; qq.setFromEuler(new THREE.Euler(rnd() * 0.5, rnd() * 6.28, rnd() * 0.5)); mt.compose(new THREE.Vector3(x, Math.max(altura(x, z), hBase(x, z) - 1.15) - sc * 0.15, z), qq, new THREE.Vector3(sc, sc, sc)); iq.setMatrixAt(k, mt); iq.setColorAt(k, new THREE.Color().setHSL(0.09 + rnd() * 0.06, 0.1 + rnd() * 0.12, 0.3 + rnd() * 0.2)); k++; }
    iq.count = k; cena.add(iq); lixo.push(gq, mq); }
  // pedras grandes no rio (a água bate nelas e faz espuma)
  { const gp = new THREE.IcosahedronGeometry(1, 3), pp = gp.attributes.position; for (let i = 0; i < pp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pp, i); const k = 1 + 0.22 * Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7) + 0.08 * Math.sin(v.x * 9 + v.z * 7); pp.setXYZ(i, v.x * k * 1.25, v.y * k * 0.75, v.z * k); } gp.computeVertexNormals();
    const mp = new THREE.MeshStandardMaterial({ color: 0x6b6a5e, roughness: 0.92, metalness: 0 }); const ip = new THREE.InstancedMesh(gp, mp, NPED), mt = new THREE.Matrix4(), qq = new THREE.Quaternion();
    for (let i = 0; i < NPED; i++) { const pd = PEDRAS[i]; qq.setFromEuler(new THREE.Euler(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4)); mt.compose(new THREE.Vector3(pd.x, hBase(pd.x, pd.z) - 1.0 - pd.r * 0.15, pd.z), qq, new THREE.Vector3(pd.r, pd.r * (0.7 + rnd() * 0.5), pd.r)); ip.setMatrixAt(i, mt); ip.setColorAt(i, new THREE.Color().setHSL(0.1 + rnd() * 0.08, 0.12 + rnd() * 0.1, 0.32 + rnd() * 0.12)); }
    cena.add(ip); lixo.push(gp, mp); }
  const naAgua = (x, z) => { const [d, w] = distRio(x, z); return d < w * 1.15; };
  const fundura = (x, z) => hBase(x, z) - 1.0 - altura(x, z);
  // espelho: a cena vista de baixo da superfície, para o reflexo
  function refletir() { if (!aguas.length) return; const Y0 = hBase(camera.position.x, camera.position.z) - 1.0; if (camera.position.y - Y0 > 900) return;
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld), cpos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const alvoV = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cpos), upV = new THREE.Vector3(0, 1, 0).applyMatrix4(rot); upV.y = -upV.y;
    reflCam.position.set(cpos.x, 2 * Y0 - cpos.y, cpos.z); reflCam.up.copy(upV); reflCam.lookAt(alvoV.x, 2 * Y0 - alvoV.y, alvoV.z); reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(camera.projectionMatrix);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y0).applyMatrix4(reflCam.matrixWorldInverse); const cp = new THREE.Vector4(plano.normal.x, plano.normal.y, plano.normal.z, plano.constant);
    const pe = reflCam.projectionMatrix.elements, qv = new THREE.Vector4((Math.sign(cp.x) + pe[8]) / pe[0], (Math.sign(cp.y) + pe[9]) / pe[5], -1, (1 + pe[10]) / pe[14]);
    cp.multiplyScalar(2 / cp.dot(qv)); pe[2] = cp.x; pe[6] = cp.y; pe[10] = cp.z + 1 - 0.003; pe[14] = cp.w; reflCam.projectionMatrixInverse.copy(reflCam.projectionMatrix).invert();
    texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
    const ocultos = [...aguas, grama, polen, feixes].filter((o) => o && o.visible); ocultos.forEach((o) => { o.visible = false; });
    const pc = new THREE.Vector3().setFromMatrixPosition(reflCam.matrixWorld); if (ceu) ceu.position.copy(pc); solDisco.position.copy(pc).addScaledVector(SOL, 3500);
    renderer.setRenderTarget(reflRT); renderer.render(cena, reflCam); ocultos.forEach((o) => { o.visible = true; });
    if (ceu) ceu.position.copy(camera.position); solDisco.position.copy(camera.position).addScaledVector(SOL, 3500); }

  // JERUSALÉM: esplanada, pórticos, Santuário, Antônia, palácio, muralhas e casas (jerusalem-cidade.js)
  let caixasJ = null, quadroJ = null; if (J) { const r = await JC.construir(THREE, cena, { altura, folga, lixo, toque, rnd, carregar, renderer }); caixasJ = r.obst; quadroJ = r.quadro; window.__mundoJ = { cena, altura, r }; }
  // GRAMA ALTA que balança ao vento em volta de quem anda
  const NG = Math.round((toque ? 70000 : 150000) * (E ? (ER ? 1.7 : 1) : G ? 0.45 : J ? 0 : 0.7)), RG = 30;
  // lâmina fina, afinando até a ponta, em 5 gomos (para poder curvar)
  const lamina = new THREE.PlaneGeometry(ER ? 0.024 : 0.035, 1, 1, 5); lamina.translate(0, 0.5, 0);
  { const p = lamina.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - Math.pow(y, 1.6) * 0.96)); } }
  const matGrama = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { ...unif, centro: { value: new THREE.Vector2() }, sol: { value: SOL } },
    vertexShader: `uniform float t; uniform vec2 centro; attribute vec3 iOff; attribute float iRot, iEsc; varying float vY, vD, vFl, vX, vTr; varying vec3 vC, vFc; uniform sampler2D alt; uniform vec3 sol;
      void main(){ vec2 rel = mod(iOff.xz - centro + ${RG}.0, ${(RG * 2).toFixed(1)}) - ${RG}.0; vec2 xz = centro + rel; float dist = length(rel);
        float esc = iEsc * smoothstep(${RG}.0, ${(RG * 0.55).toFixed(1)}, dist); float ts = dot(xz, vec2(${TD.x.toFixed(3)}, ${TD.z.toFixed(3)})), tl = dot(xz, vec2(${TP.x.toFixed(3)}, ${TP.z.toFixed(3)})); if (ts > 12. && ts < 170.) esc *= smoothstep(.55, 1.25, abs(tl - 2.5 * sin(ts / 13.)));
        float r2 = fract(iRot * 7.13), r3 = fract(iEsc * 13.7 + iOff.y * 3.1);
        float y = position.y; float altL = esc * ${ER ? '(.10 + .34 * r3 * r3 + .06 * iOff.y)' : '(.18 + .42 * r3 * r3 + .12 * iOff.y)'};   // alturas variadas: muitas baixas, algumas altas
        // curva natural da lâmina (cai para um lado) e vento que vem em ondas pelo campo
        float curva = (.25 + .5 * r2) * y * y; vec3 p = vec3(position.x * (.7 + .6 * r3), y * altL, curva * altL * .9);
        float c = cos(iRot), s = sin(iRot); p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
        float onda = sin(t * 1.3 - xz.x * .11 - xz.y * .07) * .5 + .5; float vento = (onda * .7 + sin(t * 3.7 + xz.x * .9 + xz.y * .6) * .12) * y * y * altL;
        p.x += vento * .55; p.z += vento * .25; p.y -= vento * vento * .6;
        vY = y; vX = position.x / .035 + .5;
        ${ER ? 'vec3 verde = mix(vec3(.045, .09, .022), vec3(.10, .155, .035), iOff.y), amarelo = vec3(.20, .20, .07), seco = vec3(.22, .18, .09);' : 'vec3 verde = mix(vec3(.10, .24, .05), vec3(.20, .36, .07), iOff.y), amarelo = vec3(.42, .45, .14), seco = vec3(.40, .34, .17);'}
        vC = mix(verde, amarelo, r2 * r2 * .4); vC = mix(vC, seco, step(.93, r3) * .7);${G ? ' vC = mix(vC, vec3(.30, .28, .15), .6);' : L ? ' vC = mix(vC, vec3(.42, .40, .16), .3);' : ''}
        vFl = step(.965, iOff.y) * step(.82, y); vFc = iOff.y > .99 ? vec3(1.2, 1.15, 1.05) : iOff.y > .978 ? vec3(1.3, .95, .2) : vec3(1.1, .3, .45);
        vTr = pow(max(dot(normalize(vec3(xz.x, cameraPosition.y - 1.2, xz.y) - cameraPosition), sol), 0.), 3.);
        vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float dens; uniform vec3 nevoa, sol, luz; varying float vY, vD, vFl, vX, vTr; varying vec3 vC, vFc;
      void main(){ float base = smoothstep(.0, .55, vY);   // sombra na base, onde a luz não chega
        float meio = 1. - abs(vX * 2. - 1.); vec3 c = vC * (.28 + .9 * base) * (.8 + .3 * meio);
        c += vec3(.10, .16, .02) * pow(vY, 3.) * ${ER ? '.18' : '.5'};   // ponta mais clara, a luz atravessa
        c += vec3(.10, .18, .03) * vTr * vY * ${ER ? '.35' : '1.'};
        c = mix(c, vFc, vFl); c *= luz; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  // a altura do chão de cada lâmina é calculada na CPU e guardada; a lâmina "anda" junto com quem caminha
  const gramaGeo = new THREE.InstancedBufferGeometry(); gramaGeo.index = lamina.index; gramaGeo.attributes.position = lamina.attributes.position; gramaGeo.instanceCount = NG;
  const off = new Float32Array(NG * 3), rot = new Float32Array(NG), esc = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { off[i * 3] = (Math.random() * 2 - 1) * RG; off[i * 3 + 1] = Math.random(); off[i * 3 + 2] = (Math.random() * 2 - 1) * RG; rot[i] = Math.random() * 6.28; esc[i] = 0.6 + Math.random() * 0.8; }
  gramaGeo.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 3)); gramaGeo.setAttribute('iRot', new THREE.InstancedBufferAttribute(rot, 1)); gramaGeo.setAttribute('iEsc', new THREE.InstancedBufferAttribute(esc, 1));
  // para a lâmina ficar no chão, o shader precisa da altura: usamos uma textura de altura do terreno
  const altH = new Uint16Array(alturas.length * 2); for (let i = 0; i < alturas.length; i++) { altH[i * 2] = THREE.DataUtils.toHalfFloat(alturas[i]); altH[i * 2 + 1] = THREE.DataUtils.toHalfFloat(Math.min(8, relRio[i])); }
  const altTex = new THREE.DataTexture(altH, NS + 1, NS + 1, THREE.RGFormat, THREE.HalfFloatType); altTex.minFilter = altTex.magFilter = THREE.LinearFilter; altTex.needsUpdate = true;
  matGrama.uniforms.alt = { value: altTex };
  matGrama.vertexShader = matGrama.vertexShader.replace('vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.);', `vec2 uvA = (xz + ${(T / 2).toFixed(1)}) / ${T.toFixed(1)}; vec2 tA = texture2D(alt, uvA).rg; float hA = tA.r; p.y *= smoothstep(1.3, 1.75, tA.g); vec4 mv = viewMatrix * vec4(p + vec3(xz.x, hA, xz.y), 1.);`);
  const grama = new THREE.Mesh(gramaGeo, matGrama); grama.frustumCulled = false; cena.add(grama); lixo.push(gramaGeo, matGrama, altTex, lamina);

  // FIGURAS (recortes do ChatGPT) que sempre olham para quem anda, com vento no alto das árvores
  // atl: folha de quadros de um VÍDEO REAL recortado (colunas, linhas): cada animal mostra o seu quadro do passo
  const matFig = (tex, vento, atl) => new THREE.ShaderMaterial({ uniforms: { ...unif, map: { value: tex }, vento: { value: vento } },
    vertexShader: `uniform float t, vento; attribute vec3 iPos; attribute vec2 iTam; attribute float iFase, iVira; varying vec2 vUv; varying float vD;
      ${atl ? 'attribute float iQuadro;' : ''}
      void main(){ vUv = vec2(iVira > .5 ? 1. - uv.x : uv.x, uv.y);${atl ? ` float qd = floor(iQuadro); float cl = mod(qd, ${atl[0].toFixed(1)}), ln = floor(qd / ${atl[0].toFixed(1)}); vUv = vec2((cl + vUv.x) / ${atl[0].toFixed(1)}, 1. - (ln + 1. - vUv.y) / ${atl[1].toFixed(1)});` : ''}
        vec3 d3 = normalize(cameraPosition - iPos); vec3 dir = d3; dir.y = 0.; dir = normalize(dir + vec3(1e-4, 0., 0.)); vec3 dirX = vec3(dir.z, 0., -dir.x);
        float k = smoothstep(15., 140., cameraPosition.y - iPos.y) * .85; vec3 upV = normalize(mix(vec3(0., 1., 0.), cross(d3, dirX), k));
        float y = position.y; float sopro = (sin(t * 1.1 + iFase) * .6 + sin(t * 2.3 + iFase * 1.7) * .25) * vento * y * y;
        vec3 w = iPos + dirX * (position.x * iTam.x + sopro * iTam.y * .035) + upV * y * iTam.y;
        vec4 mv = viewMatrix * vec4(w, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform float dens; uniform vec3 nevoa, luz; varying vec2 vUv; varying float vD;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < .5) discard; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c.rgb * 1.04 * luz, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0); lixo.push(quad);
  const obst = obstR;   // troncos: o explorador não atravessa
  let camposManada = [];
  async function figuras(nome, lista, alturaReal, vento = 0) { await folga();
    if (CQ) lista = lista.filter((o) => CQM.fora(CQ, o.x, o.z)); if (camposManada.length && !/zebras/.test(nome)) lista = lista.filter((o) => camposManada.every((c) => Math.hypot(o.x - c.x, o.z - c.z) > 75)); const pc = pecas[nome]; if (!pc || !lista.length) return null; const tex = await carregar(nome + (pc.ext || '.png')); if (!tex) return null; lixo.push(tex);
    const asp = pc.w / pc.h, g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv; g.instanceCount = lista.length;
    const P = new Float32Array(lista.length * 3), S = new Float32Array(lista.length * 2), F = new Float32Array(lista.length), R = new Float32Array(lista.length);
    lista.forEach((o, i) => { const hR = alturaReal * (o.s || 1); P.set([o.x, altura(o.x, o.z) - 0.15 + (o.y || 0), o.z], i * 3); S.set([hR * asp, hR], i * 2); F[i] = Math.random() * 6.28; R[i] = o.vira ? 1 : 0; });
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iTam', new THREE.InstancedBufferAttribute(S, 2)); g.setAttribute('iFase', new THREE.InstancedBufferAttribute(F, 1)); g.setAttribute('iVira', new THREE.InstancedBufferAttribute(R, 1));
    if (/arvore|palmeira|sumauma|acai|bambu/.test(nome)) lista.forEach((o) => obst.push({ x: o.x, z: o.z, r: 0.35 + alturaReal * (o.s || 1) * 0.045 }));
    let Q = null; if (pc.quadros) { Q = new Float32Array(lista.length); for (let i = 0; i < Q.length; i++) Q[i] = Math.floor(Math.random() * pc.quadros); g.setAttribute('iQuadro', new THREE.InstancedBufferAttribute(Q, 1)); if (!pc.mipmaps) { tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; } }
    const m = new THREE.Mesh(g, matFig(tex, vento, pc.quadros ? [pc.cols, pc.rows] : null)); m.frustumCulled = false; cena.add(m); lixo.push(g, m.material); return { m, P, R, g, Q, pc };
  }
  // espalha posições evitando a água e o caminho de chegada
  function espalhar(n, rMin, rMax, folga = 6, evitar = []) { const out = []; let tent = 0;
    while (out.length < n && tent++ < n * 40) { const a = rnd() * 6.283, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const [d, w] = distRio(x, z); if (d < w + folga) continue; { const tt = W2T(x, z); if (Math.abs(tt.lado - 2.5 * Math.sin(tt.s / 13)) < 7 && tt.s > 8 && tt.s < 172) continue; if (G && -tt.s > 3 && Math.abs(tt.lado) < -tt.s * 0.5 + 5 && -tt.s < 420) continue; if (G && -tt.s > 105) continue; } if (evitar.some((e) => Math.hypot(e.x - x, e.z - z) < e.r)) continue; out.push({ x, z, s: 0.75 + rnd() * 0.5, vira: rnd() > 0.5 }); }
    return out; }
  const centroArv = { x: 0, z: 0, r: E ? 26 : G ? 9 : 30 };
  // PAISAGEM ORGANIZADA (Éden): cada planta no seu lugar, como na natureza — mata ciliar ao longo dos rios, campos abertos e pomares
  // nas encostas perto do centro, florestas fechadas em manchas grandes com bordas e clareiras, gigantes só no miolo da mata
  const manchaPomar = (x, z) => 0.5 + 0.5 * (0.6 * Math.sin(x / 63 + 0.4) * Math.cos(z / 71 + 1.9) + 0.4 * Math.sin((x - z) / 37));
  const zona = (x, z) => { const r = Math.hypot(x, z), F = manchaMata(x, z), [d, w] = distRio(x, z), dr = d - w;
    const nucleo = THREE.MathUtils.smoothstep(F, 0.54, 0.68), borda = THREE.MathUtils.smoothstep(F, 0.42, 0.54) * (1 - nucleo), campo = 1 - THREE.MathUtils.smoothstep(F, 0.38, 0.5);
    return { r, F, dr, nucleo, borda, campo, ciliar: 1 - THREE.MathUtils.smoothstep(dr, 6, 42), clareira: THREE.MathUtils.smoothstep(r, 55, 95), pomar: THREE.MathUtils.smoothstep(manchaPomar(x, z), 0.52, 0.7) }; };
  function zonas(n, rMin, rMax, peso, minF = 0) { const out = []; let tent = 0;
    while (out.length < n && tent++ < n * 40) { const a = rnd() * 6.283, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (minF && manchaMata(x, z) < minF) continue; if (naAgua(x, z) || dRiacho(x, z) < 10) continue; { const tt = W2T(x, z); if (Math.abs(tt.lado - 2.5 * Math.sin(tt.s / 13)) < 7 && tt.s > 8 && tt.s < 172) continue; }
      if (rnd() > peso(zona(x, z))) continue; out.push({ x, z, s: 0.75 + rnd() * 0.5, vira: rnd() > 0.5 }); }
    return out; }
  const T2 = toque ? 0.62 : 1;   // no tablet, menos plantas
  const campoManada = (dmin, dmax, ang0) => { for (let t = 0; t < 400; t++) { const a = ang0 + (rnd() - 0.5) * 1.6, r = dmin + rnd() * (dmax - dmin), x = Math.cos(a) * r, z = Math.sin(a) * r; if (naAgua(x, z) || distRio(x, z)[0] < 60) continue; const zz = zona(x, z); if (zz.campo > 0.5) return { x, z, s: 1, vira: rnd() > 0.5 }; } return null; };
  camposManada = E ? (() => { const a0 = Math.atan2(-TD.z, -TD.x); return [campoManada(180, 300, a0), campoManada(220, 360, a0 + 1.0), campoManada(200, 340, a0 - 1.1)].filter(Boolean); })() : [];
  const Z = {
    gigante: (z) => z.nucleo * z.clareira * (1 - z.ciliar) * THREE.MathUtils.smoothstep(z.r, 120, 220),
    alta: (z) => Math.max(z.nucleo, 0.45 * z.borda) * z.clareira * (1 - 0.6 * z.ciliar),
    acai: (z) => Math.max(0.9 * z.ciliar, 0.45 * z.borda) * z.clareira,
    fruto: (z) => (0.45 * z.campo + 0.8 * z.borda) * z.pomar * THREE.MathUtils.smoothstep(z.r, 35, 70) * (1 - 0.7 * z.nucleo),
    florida: (z) => (0.55 * z.campo + 0.4 * z.borda) * (1 - z.nucleo) * THREE.MathUtils.smoothstep(z.r, 30, 60),
    flores: (z) => (0.8 * z.campo + 0.35 * z.borda) * (1 - z.nucleo),
    baixa: (z) => Math.max(0.85 * z.nucleo, 0.8 * z.ciliar, 0.6 * z.borda) * THREE.MathUtils.smoothstep(z.r, 18, 40),
    heliconia: (z) => Math.max(0.9 * z.ciliar, 0.5 * z.borda, 0.4 * z.nucleo) * THREE.MathUtils.smoothstep(z.r, 18, 40),
  };
  // VALE DE ELÁ: terebintos (Elá = terebinto), carvalhos e oliveiras nas encostas; trigo no fundo do vale; os dois exércitos e Golias
  if (L) {
    const naFaixa = (n, x0, x1, z0, z1) => Array.from({ length: n }, () => ({ x: x0 + rnd() * (x1 - x0), z: z0 + rnd() * (z1 - z0), s: 0.85 + rnd() * 0.3, vira: rnd() > 0.5 }));
    const fila = (z, x0, x1, passo) => { const o = []; for (let x = x0; x <= x1; x += passo) o.push({ x: x + (rnd() - 0.5) * 3, z: z + (rnd() - 0.5) * 4, s: 0.95 + rnd() * 0.1, vira: rnd() > 0.5 }); return o; };
    await Promise.all([
      figuras('terebinto', [...espalhar(toque ? 140 : 240, 40, 900, 4, [centroArv]), ...espalhar(toque ? 140 : 260, 900, 1600, 4)], 9, 0.4),
      figuras('carvalho', espalhar(toque ? 90 : 160, 60, 1500, 4, [centroArv]), 10, 0.4),
      figuras('oliveira-ela', espalhar(toque ? 90 : 160, 60, 1300, 3, [centroArv]), 6, 0.4),
      figuras('arbusto-sefela', espalhar(toque ? 400 : 800, 12, 1300, 1.5, [centroArv]), 1.2, 0.4),
      figuras('trigo', naFaixa(toque ? 160 : 300, -900, 900, -95, 95).filter((o) => Math.abs(o.z - ribZ(o.x)) > 8 && Math.hypot(o.x, o.z - 40) > 30), 1.1, 0.6),
      figuras('tendas-filisteias', naFaixa(toque ? 18 : 30, -380, 380, 215, 300), 4.5, 0.1),
      figuras('exercito-filisteu', [...fila(160, -200, 200, 9), ...fila(172, -170, 170, 10), ...fila(184, -140, 140, 11)], 2.3, 0),
      figuras('exercito-israel', [...fila(-150, -190, -12, 9), ...fila(-150, 12, 190, 9), ...fila(-162, -160, 160, 10)], 2.2, 0),
      figuras('golias', [{ x: 0, z: 40, s: 1 }], 2.9, 0),
    ]);
    // o ribeiro de seixos no fundo do vale (1Sm 17:40)
    const sx = await carregar('seixos.jpg'); if (sx) { sx.wrapS = sx.wrapT = THREE.RepeatWrapping; lixo.push(sx); const P = [], U = [], Ix = []; let k = 0;
      for (let x = -1700; x <= 1700; x += 2) { const z = ribZ(x); for (const lz of [-2.6, 2.6]) { P.push(x, altura(x, z + lz) + 0.05, z + lz); U.push(x / 4, (lz + 2.6) / 4); } if (k) { const a = (k - 1) * 2; Ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } k++; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(Ix); g.computeVertexNormals();
      const m = new THREE.MeshStandardMaterial({ map: sx, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }); const rb = new THREE.Mesh(g, m); rb.renderOrder = 1; cena.add(rb); lixo.push(g, m); }
  }
  if (G) await Promise.all([
    figuras('rocha-oracao', [{ x: 0, z: 0, s: 1 }], 1.5, 0),
    figuras('oliveira-milenar-1', [[-8, 6], [9, 4], [13, -8]].map(([l, sx]) => { const w = T2W(l, sx); return { x: w.x, z: w.z, s: 1, vira: l > 0 }; }), 10, 0.3),
    figuras('oliveira-milenar-2', [[-11, -4], [12, -3], [-4, 14]].map(([l, sx]) => { const w = T2W(l, sx); return { x: w.x, z: w.z, s: 1, vira: l < 0 }; }), 9, 0.3),
    figuras('oliveira-1', [...espalhar(toque ? 160 : 260, 9, 300, 3, [centroArv]), ...espalhar(toque ? 300 : 520, 300, 1300, 3, [centroArv])], 7.5, 0.5),
    figuras('oliveira-2', [...espalhar(toque ? 130 : 220, 9, 300, 3, [centroArv]), ...espalhar(toque ? 250 : 420, 300, 1300, 3, [centroArv])], 6.5, 0.5),
    figuras('oliveira-3', [...espalhar(toque ? 90 : 150, 12, 320, 3, [centroArv]), ...espalhar(toque ? 180 : 300, 320, 1300, 3, [centroArv])], 8.5, 0.6),
    figuras('muro-pedra', espalhar(toque ? 90 : 160, 10, 420, 2, [centroArv]), 1.1, 0),
    figuras('arbusto-seco', [...espalhar(toque ? 300 : 520, 5, 300, 1.5, [centroArv]), ...espalhar(toque ? 300 : 600, 300, 1200, 1.5, [centroArv])], 1.0, 0.4),
    figuras('cipreste', espalhar(toque ? 50 : 90, 40, 1100, 5, [centroArv]), 15, 0.3),
  ]);
  if (E && !ER) await Promise.all([
    figuras('arvore-vida', [{ x: 0, z: 0, s: 1 }], 34, 0.5),
    figuras('arvore-fruto-1', zonas(Math.round(560 * T2), 30, 1400, Z.fruto), 15, 1),
    figuras('arvore-fruto-2', zonas(Math.round(460 * T2), 30, 1400, Z.fruto), 12, 1),
    figuras('palmeira', rios.flatMap((c) => Array.from({ length: 70 }, (_, k) => { const u = (k + 0.5) / 70, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = k % 2 ? 1 : -1, d = (LARG(rios.indexOf(c))) + 6 + rnd() * 10; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.4, vira: rnd() > 0.5 }; })).filter((o) => Math.hypot(o.x, o.z) > 24 && !naAgua(o.x, o.z)), 14, 0.8),
    figuras('arbusto-flores', zonas(Math.round(1100 * T2), 12, 1100, Z.flores), 1.6, 0.6),
    // A MATA FECHADA, em camadas: gigantes que furam a copa, árvores altas, palmeiras, bambus, samambaias e folhagens no chão
    figuras('mata-sumauma', zonas(Math.round(700 * T2), 110, 1500, Z.gigante, 0.54), 46, 0.35),
    figuras('mata-arvore-alta', zonas(Math.round(7000 * T2), 50, 1500, Z.alta, 0.42), 26, 0.6),
    figuras('mata-palmeira-acai', zonas(Math.round(2600 * T2), 30, 1400, Z.acai), 13, 0.9),
    figuras('mata-bambu', rios.flatMap((c) => Array.from({ length: 60 }, (_, k) => { const u = (k + rnd()) / 60, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = (LARG(rios.indexOf(c))) + 4 + rnd() * 8; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.5, vira: rnd() > 0.5 }; })).filter((o) => Math.hypot(o.x, o.z) > 26 && !naAgua(o.x, o.z) && !(Math.abs(o.x) < 7 && o.z > 8 && o.z < 150)), 11, 0.9),
    figuras('mata-samambaia', zonas(Math.round(1700 * T2), 14, 900, Z.baixa), 5, 0.8),
    figuras('mata-folhagem', zonas(Math.round(2600 * T2), 10, 700, Z.baixa), 2.3, 0.7),
    figuras('mata-heliconia', zonas(Math.round(1300 * T2), 10, 700, Z.heliconia), 2.1, 0.7),
    figuras('mata-arbusto', zonas(Math.round(1900 * T2), 8, 800, Z.baixa), 1.4, 0.6),
  ]);

  // TRILHA de terra batida que leva até a árvore da vida
  const trilhaX = (z) => 2.5 * Math.sin(z / 13);
  if (!J) { const P = [], U = [], I = []; let k = 0; for (let z = 170; z >= 12; z -= 0.8) { const x = trilhaX(z); for (const sx of [-1, 1]) { const w = T2W(x + sx * 0.95, z); P.push(w.x, altura(w.x, w.z) + 0.05, w.z); U.push(sx < 0 ? 0 : 1, z / 3); } if (k) { const a = (k - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } k++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    // a foto da trilha chega por trás; até lá, uma cor de terra
    const tTr = ER ? new THREE.DataTexture(new Uint8Array([120, 96, 70, 255]), 1, 1) : null; if (tTr) { tTr.needsUpdate = true; lixo.push(tTr); carregar('real/trilha.jpg').then((t) => { if (!t) return; t.wrapS = t.wrapT = THREE.RepeatWrapping; lixo.push(t); m.uniforms.tTr.value = t; }).catch(() => {}); }
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, uniforms: { ...unif, tTr: { value: tTr } }, defines: tTr ? { TRILHA_FOTO: 1 } : {},
      vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float dens; uniform vec3 nevoa, luz; uniform sampler2D tTr; varying vec2 vUv; varying float vD; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vec2(vUv.x * 2., vUv.y * 3.); float k = n(p * 3.) * .5 + n(p * 9.) * .3 + n(p * 27.) * .2; vec3 c = mix(vec3(.30, .22, .14), vec3(.52, .41, .28), k); c *= .85 + .3 * step(.78, n(p * 14.));
#ifdef TRILHA_FOTO
          c = texture2D(tTr, vec2(vUv.x * .95, vUv.y * 1.5)).rgb * vec3(.78, .74, .70) * (.85 + .3 * n(p * .7));
#endif
          c *= luz;
          float a = smoothstep(0., .28 + .15 * n(p * 4.), vUv.x) * smoothstep(1., .72 - .15 * n(p * 4. + 7.), vUv.x); float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` });
    const tr = new THREE.Mesh(g, m); tr.renderOrder = 1; cena.add(tr); lixo.push(g, m); }
  // árvores frutíferas grandes dos dois lados da trilha, emoldurando o caminho
  const moldura = []; for (let z = 30; z < 165; z += 13) { const x = trilhaX(z); for (const sx of [-1, 1]) { const w = T2W(x + sx * (6 + rnd() * 3), z + rnd() * 6), xx = w.x, zz = w.z; if (!naAgua(xx, zz)) moldura.push({ x: xx, z: zz, s: 0.9 + rnd() * 0.35, vira: rnd() > 0.5 }); } }
  if (E && !ER) await Promise.all([figuras('arvore-fruto-1', moldura.filter((_, i) => i % 2 === 0), 15, 1), figuras('arvore-fruto-2', moldura.filter((_, i) => i % 2 === 1), 12, 1)]);
  else if (G) { const pw = T2W(5.5, 42); await Promise.all([figuras('oliveira-1', moldura.filter((_, i) => i % 2 === 0), 7.5, 0.5), figuras('oliveira-2', moldura.filter((_, i) => i % 2 === 1), 6.5, 0.5), figuras('prensa-azeite', [{ x: pw.x, z: pw.z, s: 1 }], 2.2, 0)]); }
  // FLORES em camadas: à beira da trilha (perto e grandes), nas margens do rio e espalhadas; árvores floridas, romãzeiras e videiras
  const beiraTrilha = (n, a0, a1) => Array.from({ length: n }, () => { const z = 14 + rnd() * 155, sx = rnd() > 0.5 ? 1 : -1, w = T2W(trilhaX(z) + sx * (a0 + rnd() * (a1 - a0)), z); return { x: w.x, z: w.z, s: 0.7 + rnd() * 0.6, vira: rnd() > 0.5 }; }).filter((o) => !naAgua(o.x, o.z));
  const beiraRio = (n) => Array.from({ length: n }, () => { const ci = Math.floor(rnd() * rios.length), c = rios[ci], w = LARG(ci), u = rnd() * 0.7, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = w * (1.42 + rnd() * 0.5); return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.7 + rnd() * 0.6, vira: rnd() > 0.5 }; }).filter((o) => Math.hypot(o.x, o.z) > 24);
  const flores = !E || ER ? [] : [['flor-lirios', 1.1, 1], ['flor-hibisco', 1.7, 0.4], ['flor-roxa', 1.0, 1], ['flor-ave-paraiso', 1.5, 0.7], ['flor-rosa', 0.8, 1.2]];
  await Promise.all([
    ...flores.map(([nm, h, q]) => figuras(nm, [...beiraTrilha(Math.round((toque ? 40 : 70) * q), 1.25, 4.5), ...beiraRio(Math.round((toque ? 50 : 90) * q)), ...(E ? zonas(Math.round((toque ? 120 : 220) * q), 10, 700, Z.flores) : espalhar(Math.round((toque ? 40 : 80) * q), 8, 220, 2, [centroArv]))], h, 0.5)),
    E && !ER && figuras('arvore-florida', zonas(Math.round(220 * T2), 30, 1200, Z.florida), 11, 0.8),
    E && !ER && figuras('romazeira', [...beiraTrilha(toque ? 8 : 14, 5, 9), ...zonas(Math.round(140 * T2), 25, 800, Z.fruto)], 5.5, 0.7),
    E && !ER && figuras('videira', [...beiraTrilha(toque ? 8 : 14, 4.5, 8), ...zonas(Math.round(110 * T2), 25, 700, Z.fruto)], 4.2, 0.5),
  ]);
  // PLANTIO REAL (Éden): a mesma organização da paisagem (mata ciliar, campos, pomares, mata fechada em manchas), agora com plantas 3D
  // planta tudo POR TRÁS, em etapas: o jardim abre na hora com chão e grama; árvores, depois plantas, depois as árvores de perto
  if (ER) (async () => { carga('Carregando as árvores do jardim…'); await folga(); const T3 = toque ? 0.6 : 1, parte = (l, k, n) => l.filter((_, i) => i % n === k), naoAgua = (l) => l.filter((o) => !naAgua(o.x, o.z) && Math.hypot(o.x, o.z) > 22);
    const ciliar = naoAgua(rios.flatMap((c) => Array.from({ length: 70 }, (_, k) => { const u = (k + rnd()) / 70, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = LARG(rios.indexOf(c)) + 5 + rnd() * 12; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.45 }; })));
    await folga(); const alta = zonas(Math.round(9000 * T3), 40, 1500, Z.alta, 0.42); await folga(); const fruto = zonas(Math.round(1500 * T3), 30, 1400, Z.fruto); await folga();
    await Promise.all([
      ER.arvores('jac', [{ x: 0, z: 0, s: 1 }], 30),   // a árvore da vida, no meio do jardim (aparência ilustrativa: o texto não a descreve)
      ER.arvores('jac', zonas(Math.round(600 * T3), 110, 1500, Z.gigante, 0.54), 26), ER.arvores('jac', zonas(Math.round(160 * T3), 30, 1200, Z.florida), 15),
      ER.arvores('arv1', [...parte(alta, 0, 4), ...parte(fruto, 0, 2), ...moldura.filter((_, i) => i % 2 === 0)], 13), ER.arvores('arv2', [...parte(alta, 1, 4), ...parte(fruto, 1, 2), ...moldura.filter((_, i) => i % 2 === 1)], 10),
      ER.arvores('arv4', [...parte(alta, 2, 4), ...zonas(Math.round(1800 * T3), 30, 1400, Z.acai), ...parte(ciliar, 0, 2)], 15), ER.arvores('arv3', [...parte(alta, 3, 4), ...parte(ciliar, 1, 2)], 7),
    ]); ER.montarArvores(); ER.refrescar(); carga('Carregando plantas e flores…'); await folga();
    await Promise.all([
      ER.plantas('samambaia.glb', zonas(Math.round(2600 * T3), 10, 900, Z.baixa), 0.9, { raio: 55 }),
      ER.plantas('folhagem2.glb', zonas(Math.round(2200 * T3), 10, 700, Z.baixa), 0.8, { raio: 45 }), ER.plantas('folhagem3.glb', zonas(Math.round(1800 * T3), 10, 700, Z.heliconia), 1.0, { raio: 45 }),
      ER.plantas('folhagem1.glb', zonas(Math.round(1300 * T3), 10, 700, Z.heliconia), 1.9, { raio: 60, sombra: true }),
      ER.plantas('arbusto1.glb', zonas(Math.round(1600 * T3), 12, 1100, Z.flores), 1.9, { raio: 70, sombra: true }),
      ER.plantas('mato1.glb', zonas(Math.round(2200 * T3), 8, 800, Z.baixa), 0.7, { raio: 40 }), ER.plantas('mato3.glb', zonas(Math.round(1600 * T3), 8, 800, Z.baixa), 0.6, { raio: 35 }),
      ER.plantas('capim1.glb', zonas(Math.round(9000 * T3), 6, 1100, (z) => 0.4 + 0.6 * z.campo), 0.55, { raio: 38, vento: 0.5 }), ER.plantas('capim2.glb', zonas(Math.round(6000 * T3), 6, 1100, (z) => 0.4 + 0.6 * z.campo), 0.7, { raio: 38, vento: 0.5 }),
      ER.plantas('flor2.glb', [...beiraTrilha(Math.round(70 * T3), 1.2, 4.5), ...beiraRio(Math.round(200 * T3)), ...zonas(Math.round(1000 * T3), 10, 700, Z.flores)], 0.45, { raio: 40, vento: 0.4 }),
      ER.plantas('flor3.glb', [...beiraTrilha(Math.round(70 * T3), 1.2, 4), ...zonas(Math.round(900 * T3), 10, 700, Z.flores)], 0.4, { raio: 35, vento: 0.4 }),
      ER.plantas('flor4.glb', zonas(Math.round(1200 * T3), 10, 700, Z.flores), 0.3, { raio: 30, vento: 0.6 }),
      ER.plantas('pedra2.glb', rios.flatMap((c, ci) => Array.from({ length: 40 }, () => { const u = rnd() * 0.75, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = LARG(ci) * (1.05 + rnd() * 0.5); return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.6 + rnd() * 0.8 }; })).filter((o) => Math.hypot(o.x, o.z) > 20), 1.1, { raio: 90, vento: 0, sombra: true, enterra: 0.25 }),
      ER.plantas('pedra1.glb', zonas(Math.round(260 * T3), 20, 900, (z) => 0.3 + 0.7 * z.borda), 1.6, { raio: 90, vento: 0, sombra: true, enterra: 0.3 }),
    ]);
    ER.refrescar(); carga(null); window.__ER = ER; const cr = raiz.querySelector('.ej-cred'); if (cr) cr.textContent = 'Reconstituição artística: árvores, plantas, flores, pedras e chão em 3D de fotogrametria de plantas reais (Poly Haven e ambientCG, CC0). O texto bíblico não descreve a aparência do jardim.';
    await ER.subirPerto(); })().catch((e) => { console.warn('plantio do Éden', e); carga(null); });
  // FEIXES DE SOL atravessando a copa (raios de luz no ar úmido), sempre em volta de quem anda
  const NF = toque ? 18 : 30, gF = new THREE.InstancedBufferGeometry(), qF = new THREE.PlaneGeometry(1, 1); qF.translate(0, 0.5, 0); gF.index = qF.index; gF.attributes.position = qF.attributes.position; gF.attributes.uv = qF.attributes.uv; gF.instanceCount = NF;
  const iF = new Float32Array(NF * 4); for (let i = 0; i < NF; i++) iF.set([(rnd() * 2 - 1) * 45, (rnd() * 2 - 1) * 45, 1.5 + rnd() * 3.5, rnd() * 100], i * 4); gF.setAttribute('iF', new THREE.InstancedBufferAttribute(iF, 4));
  const matF = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL }, centro: { value: new THREE.Vector3() } },
    vertexShader: `uniform vec3 sol, centro; uniform float t; attribute vec4 iF; varying vec2 vUv; varying float vA;
      void main(){ vUv = uv; vec3 base = vec3(mod(iF.x - centro.x + 45., 90.) - 45. + centro.x, centro.y - 1., mod(iF.y - centro.z + 45., 90.) - 45. + centro.z);
        vec3 ax = normalize(sol); vec3 vd = normalize(cameraPosition - base); vec3 lado = normalize(cross(ax, vd)); float L = 38.;
        vec3 w = base + ax * position.y * L + lado * position.x * iF.z; vec4 mv = viewMatrix * vec4(w, 1.); float d = -mv.z;
        vA = smoothstep(3., 14., d) * smoothstep(80., 40., d) * (.6 + .4 * sin(t * .35 + iF.w)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying float vA; void main(){ float x = 1. - abs(vUv.x * 2. - 1.); float a = x * x * smoothstep(0., .25, vUv.y) * smoothstep(1., .45, vUv.y) * vA * ${!N ? (L ? '.06' : '.11') : '.05'}; gl_FragColor = vec4(${!N ? 'vec3(1.6, 1.3, .8)' : 'vec3(.6, .72, 1.1)'} * a, a); }` });
  const feixes = new THREE.Mesh(gF, matF); feixes.frustumCulled = false; cena.add(feixes); lixo.push(gF, qF, matF);

  // ANIMAIS que andam devagar pelo jardim (o leão descansa)
  // só animais tirados de VÍDEO REAL (andam de verdade); as figuras paradas saíram a pedido do Elias (22/11/2026)
  const especies = true ? [] : [
    { n: 'elefante-anda', h: 3.3, q: 3, anda: 1.0 }, { n: 'leao-anda', h: 1.3, q: 3, anda: 1.25 },
  ];
  const bichos = [];
  const PERTO = { leao: [-10, 46], cordeiro: [-6, 44], cervo: [13, 40], 'elefante-anda': [-26, 22], 'leao-anda': [-16, 50], girafa: [24, 24], pavao: [5, 53], onca: [-16, 58], anta: [18, 60], 'tigre-rugindo': [-3.2, 96], tigre: [4, 128] };   // um grupo à vista de quem pousa
  const margem = (n) => rios.flatMap((c) => Array.from({ length: n }, () => { const u = 0.05 + rnd() * 0.5, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = (LARG(rios.indexOf(c))) + 2 + rnd() * 4; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.85 + rnd() * 0.3 }; })).filter((o) => !naAgua(o.x, o.z) && Math.hypot(o.x, o.z) < 190);
  for (const e of especies) { const lista = e.rio ? margem(3).slice(0, e.q - 1) : espalhar(e.q - 1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }]); const pp0 = PERTO[e.n], pw = pp0 ? T2W(pp0[0], pp0[1]) : null, pp = pw ? [pw.x, pw.z] : null; if (pp && !naAgua(pp[0], pp[1])) lista.unshift({ x: pp[0], z: pp[1], s: 1, vira: e.n === 'leao' }); else lista.push(...espalhar(1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }])); const f = await figuras(e.n, lista, e.h, 0); if (!f) continue;
    lista.forEach((o, i) => bichos.push({ f, i, e, x: o.x, z: o.z, alvo: null, espera: rnd() * 6, fase: rnd() * 6 })); }
  function moverBichos(dt) { for (const b of bichos) { if (!b.e.anda) continue;
      if (!b.alvo) { b.espera -= dt; if (b.espera <= 0) { const a = rnd() * 6.283, r = b.e.rio ? 3 + rnd() * 6 : 8 + rnd() * 25; let x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; if (b.e.rio && distRio(x, z)[0] > 18) { b.espera = 2; continue; } const rr = Math.hypot(x, z); if (rr > 200) { x *= 180 / rr; z *= 180 / rr; } if (!naAgua(x, z)) b.alvo = { x, z }; else b.espera = 1; } continue; }
      const dx = b.alvo.x - b.x, dz = b.alvo.z - b.z, d = Math.hypot(dx, dz); if (d < 0.5) { b.alvo = null; b.espera = 3 + rnd() * 8; continue; }
      // anda em curva: o rumo vira aos poucos para o alvo, com um leve vaguear (nada de linha reta de régua)
      if (b.rumo === undefined) b.rumo = Math.atan2(dx, dz); { let alvoR = Math.atan2(dx, dz) + Math.sin(performance.now() / 3000 + b.fase) * 0.55, dr = Math.atan2(Math.sin(alvoR - b.rumo), Math.cos(alvoR - b.rumo)); b.rumo += Math.max(-0.7 * dt, Math.min(0.7 * dt, dr)); }
      const v = b.e.anda * dt * (0.75 + 0.25 * Math.sin(performance.now() / 1700 + b.fase)); let nx = b.x + Math.sin(b.rumo) * v, nz = b.z + Math.cos(b.rumo) * v; if (naAgua(nx, nz)) { b.alvo = null; b.espera = 1 + rnd() * 2; continue; } b.x = nx; b.z = nz;
      if (b.f.Q && rnd() < dt * 0.04) { b.alvo = null; b.espera = 4 + rnd() * 9; }   // às vezes para no meio do caminho
      // vira a figura conforme o lado para onde anda (em relação a quem olha)
      const dirX = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(b.x, 0, b.z)); const ladoX = new THREE.Vector3(dirX.z, 0, -dirX.x).normalize(); const vaiDireita = (Math.sin(b.rumo) * ladoX.x + Math.cos(b.rumo) * ladoX.z) > 0;
      b.f.R[b.i] = vaiDireita === !!b.e.olhaEsq ? 1 : 0; b.f.g.attributes.iVira.needsUpdate = true;
      // vídeo real: o passo avança no ritmo do vídeo enquanto o animal anda (o balanço do corpo já vem do vídeo)
      if (b.f.Q) { b.f.Q[b.i] = (b.f.Q[b.i] + dt * (0.75 + 0.25 * Math.sin(performance.now() / 1700 + b.fase)) * b.f.pc.quadros / b.f.pc.dur) % b.f.pc.quadros; b.f.g.attributes.iQuadro.needsUpdate = true; }
      b.f.P[b.i * 3] = b.x; b.f.P[b.i * 3 + 1] = altura(b.x, b.z) - 0.1 + (b.f.Q ? 0 : Math.sin(b.fase += dt * b.e.anda * 2.6) * 0.006 * b.e.h); b.f.P[b.i * 3 + 2] = b.z; b.f.g.attributes.iPos.needsUpdate = true; } }

  // MANADAS AO LONGE (vídeo real recortado): zebras pastando em campos abertos, a centenas de metros; se alguém se aproxima, a manada vai pastar mais longe
  let manadas = null;
  if (E && pecas['zebras-manada']) { const longe = (dmin, dmax, ang0) => { for (let t = 0; t < 300; t++) { const a = ang0 + (rnd() - 0.5) * 1.6, r = dmin + rnd() * (dmax - dmin), x = Math.cos(a) * r, z = Math.sin(a) * r; if (naAgua(x, z)) continue; const zz = zona(x, z); if (zz.campo > 0.6 && zz.ciliar < 0.2) return { x, z, s: 1, vira: rnd() > 0.5 }; } return { x: 300, z: 300, s: 1 }; };
    const a0 = Math.atan2(-TD.z, -TD.x); const lista = camposManada.length ? camposManada.map((c) => ({ ...c })) : [longe(230, 360, a0)];
    const f = await figuras('zebras-manada', lista, 1.75, 0); window.__manadaDbg = { f: !!f, n: lista.length, p0: lista[0] }; if (f) manadas = { f, lista, longe, a0 }; } else window.__manadaDbg = { semPeca: true, E };
  // ANIMAIS 3D (Éden): carregados por trás; aparecem já compilados, sem engasgo
  let A3D = null;
  if (E) setTimeout(() => import('/nexus/eden-animais3d.js?v=8').then((m) => m.criarAnimais3D(THREE, cena, { base, altura, naAgua, distRio, rios, rnd, lixo, toque,
      posicoesPerto: { elefante: [T2W(-26, 22).x, T2W(-26, 22).z], leoa: [T2W(-16, 50).x, T2W(-16, 50).z], tigre: [T2W(16, 58).x, T2W(16, 58).z], girafa: [T2W(24, 34).x, T2W(24, 34).z] }, troncos: obst }))
    .then(async (a) => { if (!ativo) return; a.bichos.forEach((b) => { b.raiz.visible = false; if (b.sombra) b.sombra.visible = false; }); try { if (renderer.compileAsync) await renderer.compileAsync(cena, camera); } catch (_) {} a.bichos.forEach((b) => { b.raiz.visible = true; if (b.sombra) b.sombra.visible = true; }); A3D = a; })
    .catch((e) => console.warn('animais 3D', e)), 2500);
  // A CLAREIRA DO RIACHO: pedras com musgo, samambaias, tronco caído e a pequena queda (modelos 3D reais), carregada por trás
  let CLR = null;
  // FOTO VIVA: lugares que são uma foto com volume (profundidade calculada), água, névoa e luz vivas; o jardim pausa por trás
  let fotoViva = null;
  const FOTOS_VIVAS = { clareira: { titulo: 'A clareira do riacho', sub: 'Éden · foto viva', foto: '/nexus/pessoal/clareira.jpg', prof: '/nexus/pessoal/clareira-prof.png', perto: 2.2, longe: 80, fov: 52, fluxo: [-0.12, 0.45],
    agua: [[0.562, 0.600], [0.718, 0.600], [0.825, 0.681], [1.0, 0.791], [1.0, 1.0], [0.670, 1.0], [0.616, 0.851], [0.592, 0.702]], queda: [0.712, 0.436, 0.780, 0.574],
    feixes: [[0.42, 0.05, -0.38, 1.0, 1.0, 16], [0.50, 0.04, -0.40, 0.7, 1.0, 18], [0.33, 0.08, -0.33, 1.3, 0.9, 13], [0.58, 0.05, -0.42, 0.6, 0.9, 22]],
    nevoa: [[0.745, 0.50, 0.22, 0.45], [0.60, 0.44, 0.35, 0.28], [0.40, 0.42, 0.30, 0.22], [0.78, 0.58, 0.18, 0.35]],
    saidas: [{ u: 0.36, v: 0.80, z: 6, rotulo: 'Seguir a trilha', ir: 'entrada' }, { u: 0.50, v: 0.62, z: 14, rotulo: 'Para o meio do jardim', ir: 'arvore' }] },
    // panoramas 360 (ChatGPT, profundidade calculada), servidos do R2
    entrada: { titulo: 'A entrada do jardim', sub: 'Éden · foto viva 360', foto: (window.NEXUS_MIDIA || '/nexus') + '/eden/fv-entrada.jpg', prof: (window.NEXUS_MIDIA || '/nexus') + '/eden/fv-entrada-prof.png', esfera: true, perto: 2.0, longe: 90, olhar: 0.62, aguaCor: true, sol: [0.21, 0.37], fluxo: [-0.28, -0.10],
      agua: [[0.06, 0.70], [0.14, 0.60], [0.24, 0.57], [0.31, 0.60], [0.33, 0.66], [0.29, 0.74], [0.24, 0.84], [0.14, 0.88], [0.06, 0.84]], queda: [0.240, 0.572, 0.295, 0.638],
      feixes: [[0.73, 0.24, -0.30, 1.0, 1.0, 16], [0.69, 0.27, 0.25, 0.8, 0.9, 18], [0.77, 0.26, -0.55, 0.7, 0.9, 15]],
      nevoa: [[0.66, 0.46, 0.25, 0.25], [0.27, 0.58, 0.10, 0.30], [0.15, 0.46, 0.25, 0.18]],
      saidas: [{ u: 0.645, v: 0.58, z: 9, rotulo: 'Seguir a trilha até o riacho', ir: 'clareira' }] },
    rio: { titulo: 'O rio que se divide', sub: 'Éden · foto viva 360 · Gn 2:10', foto: (window.NEXUS_MIDIA || '/nexus') + '/eden/fv-rio.jpg', prof: (window.NEXUS_MIDIA || '/nexus') + '/eden/fv-rio-prof.png', esfera: true, perto: 2.0, longe: 90, olhar: 0.5, sol: [0.31, 0.29], fluxo: [0, -0.22],
      agua: [[0.12, 0.505], [0.40, 0.495], [0.70, 0.495], [0.94, 0.50], [0.93, 0.58], [0.84, 0.64], [0.78, 0.70], [0.66, 0.76], [0.50, 0.80], [0.36, 0.76], [0.28, 0.68], [0.22, 0.61], [0.15, 0.56]],
      feixes: [[0.31, 0.30, 0.45, 1.0, 1.0, 20], [0.33, 0.31, 0.15, 0.7, 0.9, 22]],
      nevoa: [[0.70, 0.37, 0.30, 0.25], [0.36, 0.38, 0.25, 0.20], [0.86, 0.40, 0.20, 0.20], [0.55, 0.47, 0.30, 0.15]],
      saidas: [{ u: 0.06, v: 0.62, z: 6, rotulo: 'Para o meio do jardim', ir: 'arvore' }, { u: 0.88, v: 0.66, z: 6, rotulo: 'Descer pela margem', ir: 'margem' }] } };
  const fvDisp = {}; Object.entries(FOTOS_VIVAS).forEach(([k, c]) => fetch(c.foto, { method: 'HEAD' }).then((r) => { fvDisp[k] = r.ok && /image/.test(r.headers.get('content-type') || ''); }).catch(() => {}));   // só oferece a foto viva se o arquivo existir
  // abre um lugar em foto viva; as saídas (setas na foto) levam de um lugar a outro com a câmera avançando e um véu claro
  async function abrirFotoVivaEden(k, chegando) { const c = FOTOS_VIVAS[k]; if (!c) return; if (!fvDisp[k]) { try { const r = await fetch(c.foto, { method: 'HEAD' }); if (!r.ok) throw 0; } catch (_) { return; } }
    let caixa = fotoViva && fotoViva.caixa;
    if (!caixa) { caixa = document.createElement('div'); caixa.style.cssText = 'position:absolute;inset:0;z-index:30;background:#0d120e;opacity:0;transition:opacity .8s'; raiz.appendChild(caixa); fotoViva = { caixa };
      const volta = document.createElement('button'); volta.textContent = '↩ Voltar ao jardim'; volta.style.cssText = 'position:absolute;right:22px;top:20px;z-index:5;padding:8px 16px;border-radius:20px;border:1px solid #fff6;background:#0006;color:#fff;font:600 14px system-ui;cursor:pointer;backdrop-filter:blur(6px)';
      const tit = document.createElement('div'); tit.className = 'fv-tit'; tit.style.cssText = 'position:absolute;left:28px;top:22px;z-index:5;color:#fff;font:600 30px/1.1 Cormorant Garamond,Georgia,serif;text-shadow:0 2px 12px #0008;pointer-events:none';
      caixa.append(tit, volta); requestAnimationFrame(() => { caixa.style.opacity = '1'; });
      volta.onclick = () => { caixa.style.opacity = '0'; setTimeout(() => { try { fotoViva.cena.fechar(); } catch (_) {} caixa.remove(); fotoViva = null; }, 800); }; }
    else if (fotoViva.cena) { try { fotoViva.cena.fechar(); } catch (_) {} fotoViva.cena = null; }
    caixa.querySelector('.fv-tit').innerHTML = c.titulo + '<small style="display:block;font:500 12px/1.6 system-ui;letter-spacing:.18em;text-transform:uppercase;opacity:.85">' + c.sub + '</small>';
    const cfg = { ...c, chegando: !!chegando, saidas: (c.saidas || []).filter((sd) => sd.ir === 'jardim' || FOTOS_VIVAS[sd.ir]), aoSair: (ir) => { if (ir === 'jardim') caixa.querySelector('button').click(); else abrirFotoVivaEden(ir, true); } };
    try { const m = await import('/nexus/foto-viva.js?v=15'); fotoViva.cena = await m.abrirFotoViva(THREE, caixa, cfg); caixa.querySelector('canvas').style.zIndex = '0'; } catch (e) { console.warn('foto viva', e); caixa.remove(); fotoViva = null; } }
  window.__clrDbg = 'E=' + E + ' rios=' + rios.length; if (E && rios[5]) setTimeout(() => (window.__clrDbg += ' importando', import('/nexus/eden-clareira.js?v=5')).then((m) => m.criarClareira(THREE, cena, { base, altura, rio: rios[5], largura: LARG(5), carregar, lixo, toque, rnd, unif, distRio }))
    .then(async (c) => { window.__clrDbg += ' criada ' + !!c; if (!ativo || !c) return; try { if (renderer.compileAsync) await renderer.compileAsync(cena, camera); } catch (_) {} CLR = c; window.__clrDbg += ' pronta'; }).catch((e) => { window.__clrDbg += ' ERRO ' + e.message; console.warn('clareira', e); }), 4000);
  // AVES em voo circular e BORBOLETAS perto das flores: tudo calculado na placa de vídeo
  async function voadores(nome, n, tam, modo) {
    const tex = await carregar(nome + '.png'); if (!tex) return; lixo.push(tex);
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv; g.instanceCount = n; lixo.push(q);
    const C = new Float32Array(n * 4); const bandos = Array.from({ length: 8 }, () => [(rnd() * 2 - 1) * 120, 14 + rnd() * 22, (rnd() * 2 - 1) * 120, rnd() * 100]);
    for (let i = 0; i < n; i++) { if (modo === 2) { const b = bandos[i % 8]; C.set([b[0] + (rnd() - 0.5) * 8, b[1] + (rnd() - 0.5) * 4, b[2] + (rnd() - 0.5) * 8, b[3] + rnd() * 0.25], i * 4); continue; } const a = rnd() * 6.283, r = modo ? 10 + rnd() * 140 : rnd() * 160; C.set([Math.cos(a) * r, modo ? 0 : 18 + rnd() * 45, Math.sin(a) * r, rnd() * 100], i * 4); if (modo) C[i * 4 + 1] = altura(C[i * 4], C[i * 4 + 2]); }
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: false, side: THREE.DoubleSide, uniforms: { ...unif, map: { value: tex } },
      vertexShader: `uniform float t; attribute vec4 iC; varying vec2 vUv; varying float vD;
        void main(){ vUv = uv; float f = iC.w; vec3 c; vec3 vel = vec3(0.);
          ${modo === 2 ? `float fb = floor(f); float r = 40. + mod(fb, 5.) * 12.; float wv = .16 + mod(fb, 3.) * .03; float ang = t * wv + f; c = vec3(iC.x + cos(ang) * r, iC.y + sin(t * .5 + fb) * 3., iC.z + sin(ang) * r); vel = vec3(-sin(ang), 0., cos(ang));` : modo ? `c = iC.xyz + vec3(sin(t*.7+f)*3. + sin(t*1.9+f*2.)*1.2, 1.1 + sin(t*1.3+f)*.6 + sin(t*3.7+f)*.2, cos(t*.6+f*1.3)*3. + cos(t*2.3+f)*1.);` : `float r = 30. + mod(f, 7.) * 9.; float wv = .12 + mod(f, 3.) * .03; c = vec3(iC.x + cos(t*wv + f) * r, iC.y + sin(t*.4+f)*4., iC.z + sin(t*wv + f) * r);`}
          float bate = abs(sin(t * ${modo === 1 ? '14.' : modo === 2 ? '7.' : '5.'} + f * 3.)); float esc = ${tam.toFixed(2)};
          vec3 dX = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 dY = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          ${modo === 2 ? `if (dot(vel, dX) < 0.) vUv.x = 1. - vUv.x; vec3 w = c + dX * position.x * esc + dY * position.y * esc * (.55 + .45 * bate);` : `vec3 w = c + dX * position.x * esc * (.25 + .75 * bate) + dY * position.y * esc;`}
          vec4 mv = viewMatrix * vec4(w, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float dens; uniform vec3 nevoa, luz; varying vec2 vUv; varying float vD;
        void main(){ vec4 c = texture2D(map, vUv); if (c.a < .5) discard; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c.rgb * luz, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    m.frustumCulled = false; cena.add(m); lixo.push(g, m.material);
  }
  // aves e borboletas recortadas saíram (não eram realistas; pedido do Elias, 22/11/2026). Voltam quando houver versões de vídeo real.
  if (false) await Promise.all([voadores('passaro', toque ? 24 : 40, 1.6, 0), voadores('borboleta', toque ? 90 : 160, 0.22, 1), voadores('arara-vermelha', toque ? 24 : 40, 1.3, 2), voadores('arara-azul', toque ? 24 : 40, 1.3, 2)]);

  // NAS ÁRVORES: tucanos, macacos e preguiças nos galhos
  const nosGalhos = (n, yMin, yMax) => espalhar(n, 14, 140, 4, [centroArv]).map((o) => ({ ...o, y: yMin + rnd() * (yMax - yMin) }));
  if (false) await Promise.all([figuras('tucano', nosGalhos(toque ? 14 : 24, 3, 9), 0.75, 0.2), figuras('macaco', nosGalhos(toque ? 10 : 18, 2, 7), 0.7, 0.2), figuras('preguica', nosGalhos(toque ? 6 : 10, 4, 10), 1.3, 0.3)]);

  // VITÓRIAS-RÉGIAS nas margens mansas do rio
  const vrTex = E ? await carregar('vitoria-regia.png') : null;
  if (vrTex) { lixo.push(vrTex); const NV = toque ? 300 : 600, gv = new THREE.PlaneGeometry(1, 1); gv.rotateX(-Math.PI / 2); const mv = new THREE.MeshLambertMaterial({ map: vrTex, alphaTest: 0.5, transparent: false });
    const im = new THREE.InstancedMesh(gv, mv, NV), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(); let k = 0;
    for (let tent = 0; k < NV && tent < NV * 30; tent++) { const c = rios[Math.floor(rnd() * rios.length)], u = rnd() * 0.6, p = c.getPointAt(u), tg = c.getTangentAt(u), w = LARG(rios.indexOf(c)), sx = rnd() > 0.5 ? 1 : -1, d = w * (0.75 + rnd() * 0.25);
      const x = p.x - tg.z * sx * d, z = p.z + tg.x * sx * d; if (Math.hypot(x, z) < 20) continue; const sc = 1.4 + rnd() * 1.4; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); mt.compose(e.set(x, hBase(x, z) - 0.96, z), q, new THREE.Vector3(sc, 1, sc)); im.setMatrixAt(k++, mt); }
    im.count = k; im.renderOrder = 3; cena.add(im); lixo.push(gv, mv); }

  // (as cachoeiras recortadas espalhadas no horizonte saíram: ficavam soltas no meio do campo; a cachoeira de verdade fica no rio, no planalto)
  if (false && E && pecas.cachoeira) { const f = await figuras('cachoeira', Array.from({ length: 14 }, (_, i) => { const a = i / 14 * 6.283 + 0.2, rr = 1640 + rnd() * 120; return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 0.8 + rnd() * 0.5 }; }), 160, 0);
    if (f) { const tx = f.m.material.uniforms.map.value; tx.wrapT = THREE.RepeatWrapping; tx.needsUpdate = true; f.m.material.fragmentShader = f.m.material.fragmentShader.replace('vec4 c = texture2D(map, vUv);', 'vec4 c = texture2D(map, vUv); float lum = dot(c.rgb, vec3(.33)); float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); float ag = smoothstep(.62, .8, lum) * smoothstep(.22, .08, sat); vec3 c2 = texture2D(map, vec2(vUv.x, fract(vUv.y + t * .35))).rgb; c.rgb = mix(c.rgb, max(c.rgb, c2) * 1.05, ag * .7);').replace('uniform sampler2D map;', 'uniform sampler2D map; uniform float t;'); f.m.material.needsUpdate = true; } }

  // PÓLEN dourado flutuando no ar à volta de quem anda (aparece nos feixes de luz)
  const NPo = toque ? 1500 : 3000, pPo = new Float32Array(NPo * 3); for (let i = 0; i < NPo; i++) pPo.set([(rnd() * 2 - 1) * 40, rnd() * 14, (rnd() * 2 - 1) * 40], i * 3);
  const gPo = new THREE.BufferGeometry(); gPo.setAttribute('position', new THREE.BufferAttribute(pPo, 3));
  const matPo = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...unif, centro: { value: new THREE.Vector3() } },
    vertexShader: `uniform float t; uniform vec3 centro; varying float vA; void main(){ vec3 p = position; float f = p.x * 1.7 + p.z * 2.3;
      p.x += sin(t * .23 + f) * 2.; p.z += cos(t * .19 + f * 1.3) * 2.; p.y = mod(p.y + t * .15 * (.5 + fract(f)), 14.);
      vec3 w = vec3(mod(p.x - centro.x + 40., 80.) - 40. + centro.x, centro.y + p.y - 2., mod(p.z - centro.z + 40., 80.) - 40. + centro.z);
      vec4 mv = viewMatrix * vec4(w, 1.); float d = -mv.z; vA = smoothstep(40., 8., d) * (.5 + .5 * sin(t * 2. + f * 9.)); gl_PointSize = clamp(90. / d, 1., 6.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * vA; gl_FragColor = vec4(${!N ? 'vec3(1.6, 1.3, .7)' : 'vec3(.5, .6, .9)'} * a, a); }` });
  const polen = new THREE.Points(gPo, matPo); polen.frustumCulled = false; cena.add(polen); lixo.push(gPo, matPo);
  // sombras macias sob as copas
  { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const ts = new THREE.CanvasTexture(c), gs = new THREE.PlaneGeometry(1, 1); gs.rotateX(-Math.PI / 2); const ms = new THREE.MeshBasicMaterial({ map: ts, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: true });
    const ims = new THREE.InstancedMesh(gs, ms, obst.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    obst.forEach((o, i) => { const sc = Math.max(3, o.r * 9); mt.compose(v.set(o.x + SOL.x * -sc * 0.25, altura(o.x, o.z) + 0.06, o.z + SOL.z * -sc * 0.25), q, new THREE.Vector3(sc, 1, sc)); ims.setMatrixAt(i, mt); });
    ims.renderOrder = 1; cena.add(ims); lixo.push(ts, gs, ms); }
  // o sol (forte, para nascerem os feixes de luz entre as copas)
  const solDisco = new THREE.Mesh(new THREE.SphereGeometry(75, 16, 12), new THREE.MeshBasicMaterial({ color: !N ? new THREE.Color(9, 7.2, 4.5) : new THREE.Color(2.4, 2.5, 2.8), fog: false })); cena.add(solDisco); if (G) solDisco.visible = false;   // a lua já está pintada no céu 360° lixo.push(solDisco.geometry, solDisco.material);

  // A PRESENÇA: luz dourada e vento que passeiam pelo jardim, sem figura (Gn 3:8)
  const presenca = new THREE.Group(); cena.add(presenca); if (J) presenca.visible = false;
  const matColuna = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: unif,
    vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t; varying vec2 vUv; varying float vD; void main(){ float a = (1. - vUv.y) * (1. - vUv.y) * (.22 + .08 * sin(t * 1.3 + vUv.x * 25.)) * smoothstep(6., 30., vD); gl_FragColor = vec4(vec3(1., .86, .55) * a, a); }` });
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.5, 70, 32, 1, true), matColuna); coluna.position.y = 35; presenca.add(coluna); lixo.push(coluna.geometry, matColuna);
  const NP = 500, pP = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 7; pP.set([Math.cos(a) * r, rnd() * 18, Math.sin(a) * r], i * 3); }
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pP, 3));
  const matP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: unif,
    vertexShader: `uniform float t; varying float vA; void main(){ vec3 p = position; float f = p.x * 3.1 + p.z * 1.7; p.y = mod(p.y + t * (.5 + fract(f) * .6), 18.); p.x += sin(t * .8 + f) * .6; p.z += cos(t * .7 + f) * .6; vA = smoothstep(0., 2., p.y) * smoothstep(18., 11., p.y);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = clamp(260. / -mv.z, 2., 18.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA; gl_FragColor = vec4(vec3(1., .88, .58) * a, a); }` });
  presenca.add(new THREE.Points(gP, matP)); lixo.push(gP, matP);
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,220,150,.45)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); lixo.push(t); return t; })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  brilho.scale.set(26, 26, 1); brilho.position.y = 6; presenca.add(brilho); lixo.push(brilho.material); if (E) brilho.visible = false;   // no Éden a bola de luz parecia um objeto estranho: fica só a coluna de luz suave
  const caminhoPresenca = new THREE.CatmullRomCurve3(E ? [V(70, 60), V(120, -40), V(40, -120), V(-80, -90), V(-120, 20), V(-60, 110), V(30, 120)] : [V(5, 4), V(7, 0), V(5, -4), V(3, 0)], true);
  if (G) { coluna.scale.set(0.35, 0.5, 0.35); coluna.position.y = 17; brilho.scale.set(9, 9, 1); }
  if (L) presenca.visible = false;
  // JERUSALÉM do outro lado do vale do Cedrom (Getsêmani): a cidade iluminada, de frente para o olival
  let cidadeM = null;
  if (G && pecas['jerusalem-noite']) { const tx = await carregar('jerusalem-noite.png'); if (tx) { lixo.push(tx); const pc = pecas["jerusalem-noite"], L = 430, Hc = L * pc.h / pc.w, dist = 330;   // a muralha leste do monte do Templo tinha uns 470 m
    const g = new THREE.PlaneGeometry(L, Hc); g.translate(0, Hc / 2, 0); const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: tx } },   // bordas que se desfazem na noite (sem cara de cartão-postal)
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); float a = c.a * smoothstep(0., .16, vUv.x) * smoothstep(1., .84, vUv.x) * smoothstep(0., .3, vUv.y); if (a < .02) discard; gl_FragColor = vec4(c.rgb * .82, a);
#include <colorspace_fragment>
      }` });
    cidadeM = new THREE.Mesh(g, mat); const cx = -TD.x * dist, cz = -TD.z * dist; cidadeM.position.set(cx, -27, cz); cidadeM.lookAt(0, cidadeM.position.y, 0); cena.add(cidadeM); lixo.push(g, mat); } }
  // TOCHAS (Getsêmani, Jo 18:3): os guardas sobem do vale do Cedrom com lanternas e archotes, devagar, em fila
  const tochas = []; let tochaPerto = () => 1e9;
  if (G) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const gx = cv.getContext('2d'), gr = gx.createRadialGradient(32, 40, 2, 32, 36, 30); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,160,60,.9)'); gr.addColorStop(0.6, 'rgba(220,80,20,.35)'); gr.addColorStop(1, 'rgba(120,30,0,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
    const tf = new THREE.CanvasTexture(cv); lixo.push(tf);
    const JT = (l, sx) => new THREE.Vector3(-TD.x * sx + TP.x * l, 0, -TD.z * sx + TP.z * l);   // do lado de Jerusalém, subindo do Cedrom
    const rota = new THREE.CatmullRomCurve3([JT(-40, 300), JT(-30, 240), JT(-10, 170), JT(4, 120), JT(0, 80), JT(1, 40)]);   // da porta da cidade, desce ao Cedrom e sobe ao olival
    for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tf, color: new THREE.Color(3, 2.2, 1.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(1.1, 1.6, 1); cena.add(sp); lixo.push(sp.material); tochas.push({ sp, atraso: i * 0.012 + Math.random() * 0.006, lado: (Math.random() - 0.5) * 2.4, fase: Math.random() * 6 }); }
    const luzes = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff9a3c, 0, 22, 1.6); cena.add(l); return l; });
    const posT = new THREE.Vector3();
    tochas.mover = (t) => { const u0 = ((t / 260) % 1); let mn = 1e9;
      tochas.forEach((tc, i) => { const u = THREE.MathUtils.clamp(u0 - tc.atraso, 0, 1); rota.getPointAt(u, posT); const x = posT.x + tc.lado * Math.cos(i), z = posT.z + tc.lado * Math.sin(i);
        tc.sp.position.set(x, altura(x, z) + 1.9 + Math.sin(t * 2 + tc.fase) * 0.05, z); tc.sp.material.opacity = (u0 - tc.atraso > 0 && u0 - tc.atraso < 0.98 ? 1 : 0) * (0.8 + 0.2 * Math.sin(t * 17 + tc.fase)); tc.sp.scale.y = 1.6 + 0.25 * Math.sin(t * 11 + tc.fase);
        if (tc.sp.material.opacity > 0) mn = Math.min(mn, Math.hypot(x - eu.x, z - eu.z)); });
      luzes.forEach((l, k) => { const tc = tochas[k * 5]; l.position.copy(tc.sp.position); l.intensity = tc.sp.material.opacity * (7 + Math.sin(t * 13 + k) * 1.5); });
      tochaPerto = () => mn; };
  }

  const posPresenca = new THREE.Vector3();

  // O EXPLORADOR (terceira pessoa): imagem do ChatGPT -> malha 3D (Hunyuan3D-2); a roupa é projetada das fotos de frente e de costas,
  // e o passo (pernas e braços) é feito no próprio desenho da malha
  let avatar = null, matAv = null, modo = 'primeira', rumo = Math.atan2(-MW.TD.x, -MW.TD.z), fasePasso = 0;
  try {
    const resp = (pecas.explorador && new URLSearchParams(location.search).has('explorador')) ? await fetch(base + 'explorador.malha?v=1') : null;
    if (resp && resp.ok) {
      const buf = await resp.arrayBuffer(), [nv, ni] = new Uint32Array(buf, 0, 2);
      const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, 8, nv * 3), 3)); gm.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, 8 + nv * 12, ni), 1)); gm.computeVertexNormals(); lixo.push(gm);
      const modelo = new THREE.Group(); modelo.add(new THREE.Mesh(gm)); modelo.updateMatrixWorld(true);
      const cx = new THREE.Box3().setFromObject(modelo), tam = cx.getSize(new THREE.Vector3());
      const [tf, tc] = await Promise.all([carregar('explorador-frente.png'), carregar('explorador-costas.png')]); lixo.push(tf, tc);
      matAv = new THREE.ShaderMaterial({ uniforms: { ...unif, fr: { value: tf }, co: { value: tc }, bmin: { value: cx.min }, bmax: { value: cx.max }, fase: { value: 0 }, amp: { value: 0 }, sol: { value: SOL }, frenteZ: { value: pecas.explorador.frenteZ ?? 1 } },
        vertexShader: `uniform vec3 bmin, bmax; uniform float fase, amp; varying vec2 vUv; varying vec3 vN, vON; varying float vD;
          void main(){ vec3 p = position; vec3 tam = bmax - bmin; float hy = (p.y - bmin.y) / tam.y; float ux = (p.x - bmin.x) / tam.x; vUv = vec2(ux, hy); vON = normal;
            float lado = sign(ux - .5); float perna = smoothstep(.48, .02, hy) * smoothstep(.0, .06, abs(ux - .5));
            p.z += sin(fase) * lado * perna * amp * tam.y * .16; p.y += max(0., sin(fase * 2.)) * amp * tam.y * .012;
            float braco = smoothstep(.45, .58, hy) * smoothstep(.82, .7, hy) * smoothstep(.2, .32, abs(ux - .5)); p.z -= sin(fase) * lado * braco * amp * tam.y * .08;
            vN = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(p, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D fr, co; uniform vec3 sol, nevoa; uniform float dens, frenteZ; varying vec2 vUv; varying vec3 vN, vON; varying float vD;
          void main(){ vec4 a = texture2D(fr, vUv), b = texture2D(co, vec2(1. - vUv.x, vUv.y)); vec3 manto = vec3(.42,.33,.22);
            vec3 ca = mix(manto, a.rgb, step(.5, a.a)), cb = mix(manto, b.rgb, step(.5, b.a)); float k = smoothstep(-.25, .25, vON.z * frenteZ);
            vec3 c = mix(cb, ca, k) * (.62 + .55 * max(dot(normalize(vN), sol), 0.)); float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
          }` });
      modelo.traverse((o) => { if (o.isMesh) { o.material = matAv; if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); o.frustumCulled = false; } });
      const esc = 1.75 / tam.y; const piv = new THREE.Group(); modelo.scale.multiplyScalar(esc); modelo.position.set(-(cx.min.x + tam.x / 2) * esc, -cx.min.y * esc, -(cx.min.z + tam.z / 2) * esc); piv.add(modelo);
      avatar = piv; cena.add(avatar); lixo.push(matAv);
    }
  } catch (e) { console.warn('explorador', e); avatar = null; }
  if (!avatar) modo = 'primeira'; else modo = 'terceira';
  const btModo = raiz.querySelector('.ej-modo'); btModo.style.display = avatar ? '' : 'none';
  btModo.onclick = () => { modo = modo === 'terceira' ? 'primeira' : 'terceira'; btModo.textContent = modo === 'terceira' ? '👁 Primeira pessoa' : '🎥 Terceira pessoa'; if (modo === 'terceira') pitch = -0.12; camIni = false; };
  const camPos = new THREE.Vector3(), olhoAlvo = new THREE.Vector3(); let camIni = false;

  // SEGUIR ADIANTE: dentro de um mundo, o chat entende pedidos de lugar que estão à vista e leva você até lá (sem voltar ao globo)
  let indoLonge = null, rota = null;
  window.NEXUS_MUNDO_ACAO = (q) => {
    if (G && /templo|santuario|santo lugar|cidade|jerusalem|muralha|porta (oriental|dourada|formosa)/.test(q)) {
      const santo = /dentro|santo|santuario|interior/.test(q), cidade = /cidade|jerusalem|muralha/.test(q) && !/templo/.test(q);
      indoLonge = { t0: performance.now(), de: camera.position.clone(), para: new THREE.Vector3(-TD.x * 300, 60, -TD.z * 300), olhar: new THREE.Vector3(-TD.x * 340, 40, -TD.z * 340), dur: 6500,
        fim: () => { raiz.style.transition = 'opacity .8s ease'; raiz.classList.remove('on'); setTimeout(() => { fechar(); if (typeof window.NEXUS_ENTRAR_TEMPLO === 'function') window.NEXUS_ENTRAR_TEMPLO(santo ? 'santo' : cidade ? 'esplanada' : 'entrada'); }, 700); } };
      return santo ? 'Atravessando o vale do Cedrom e subindo ao Templo… vamos entrar no Santo Lugar.' : cidade ? 'Atravessando o vale do Cedrom até a cidade…' : 'Atravessando o vale do Cedrom até o Templo…';
    }
    if (/suba|subir|ver de cima|vista de cima|vista aerea/.test(q)) { subida = Math.min(LIM * 0.6, subida + 250); return 'Subindo para ver de cima.'; }
    if (/desca|descer|pousar|chao/.test(q)) { subida = 0; voarLivre = false; return 'Descendo.'; }
    if (/rocha|onde (ele|jesus) orou/.test(q) && G) { indo = new THREE.Vector3(TD.x * 3, 0, TD.z * 3); return 'Indo até a rocha onde Jesus orou.'; }
    // JERUSALÉM: 'me leve ao santuário', 'vá até a Porta Formosa', 'quero ver a Antônia'… vai a pé (num salto) e fica de frente
    if (J) { const ALVOS = [[/porta formosa|patio das mulheres/, 'portaFormosa', [62, 4], 'a Porta Formosa'], [/fachada|santuario|santo|templo|altar|nicanor/, 'santuario', [128, 0], 'o Santuário, visto do Pátio das Mulheres'], [/portico real|pedras|edificios/, 'porticoReal', [0, -40], 'o Pórtico Real'], [/salomao|alpendre/, 'salomao', [-25, 0], 'o Pórtico de Salomão'],
        [/antonia|fortaleza/, 'antonia', [40, 130], 'a fortaleza Antônia'], [/palacio|herodes|pretorio|pilatos/, 'palacio', [170, 0], 'o palácio de Herodes'], [/torre|hipico|fasael|mariane/, 'torres', [40, 60], 'as torres de Herodes'], [/siloe|tanque/, 'siloe', [0, -45], 'o tanque de Siloé'], [/cidade de davi|siao|ofel/, 'cidadeDavi', [0, 40], 'a Cidade de Davi'], [/oliveiras|ver a cidade|vista/, 'oliveiras', [0, 0], 'o Monte das Oliveiras, de onde se vê a cidade']];
      const a = ALVOS.find(([re]) => re.test(q)); if (a) { const [lx, lz] = JC.LUGARES[a[1]]; const x = lx + a[2][0], z = lz + a[2][1]; pularChegada(); voarLivre = false; subida = 0; eu.set(x, 0, z); const ox = a[1] === 'oliveiras' ? 0 : lx, oz = a[1] === 'oliveiras' ? 0 : lz; yaw = Math.atan2(-(ox - x), -(oz - z)); pitch = a[1] === 'santuario' ? 0.18 : a[1] === 'portaFormosa' ? 0.12 : a[1] === 'oliveiras' ? -0.1 : 0;
        subida = { palacio: 70, torres: 60, siloe: 50, cidadeDavi: 60, oliveiras: 40, santuario: 9, antonia: 18 }[a[1]] || 0;   // na cidade e diante dos muros altos, vê-se de um pouco acima
        if (a[1] === 'oliveiras') pitch = -0.07; else if (a[1] === 'santuario') pitch = 0.2; else if (subida > 30) pitch = -0.22; else if (subida) pitch = 0.05;
        return `Aqui está ${a[3]}.`; } }
    if (CQO && /sig(a|o)|seguir|subir|suba|acompanh/.test(q) && /rio|agua|corrente|fluxo/.test(q)) { const c = rios[0]; let u0 = 0.98, dm = 1e9; for (let k = 0; k <= 200; k++) { const u = CQ.u + (1 - CQ.u) * k / 200, p0 = c.getPointAt(u), d = Math.hypot(p0.x - eu.x, p0.z - eu.z); if (d < dm) { dm = d; u0 = u; } }
      const pts = []; for (let k = 0; k <= 40; k++) { const u = u0 + (CQ.u + 0.012 - u0) * k / 40, p0 = c.getPointAt(Math.max(0, Math.min(1, u))); pts.push(new THREE.Vector3(p0.x, hBase(p0.x, p0.z) + 9, p0.z)); }
      const [fx, fz] = CQO.frente; pts.push(new THREE.Vector3(fx, altura(fx, fz) + 4, fz)); const curva = new THREE.CatmullRomCurve3(pts); pularChegada(); subida = 0; voarLivre = false;
      rota = { curva, t0: performance.now(), dur: Math.max(9000, curva.getLength() / 14 * 1000), fim: () => { eu.set(fx, 0, fz); yaw = Math.atan2(-(CQ.x - fx), -(CQ.z - fz)); pitch = 0.3; } };
      return 'Seguindo o rio, rio acima, até onde ele despenca do planalto.'; }
    if (CQO && /cachoeira|queda d.?agua|catarata/.test(q)) { const [x, z] = CQO.frente; pularChegada(); subida = 0; voarLivre = false; eu.set(x, 0, z); yaw = Math.atan2(-(CQ.x - x), -(CQ.z - z)); pitch = 0.32; return 'Aqui está a cachoeira. A caverna fica atrás da queda: vá pela laje de pedra à esquerda ou à direita, ou me peça para entrar.'; }
    if (CQO && /caverna|gruta|atras da (agua|cachoeira|queda)/.test(q)) { const fundo = /fundo|salao|lago/.test(q); const [x, z] = fundo ? CQO.salao : CQO.boca; pularChegada(); subida = 0; voarLivre = false; eu.set(x, 0, z); CQO.entrar(); yaw = fundo ? Math.atan2(-(CQO.boca[0] - x), -(CQO.boca[1] - z)) : Math.atan2(-(CQO.salao[0] - x), -(CQO.salao[1] - z)); pitch = 0.05; return fundo ? 'No fundo da caverna, no salão com a abertura no teto e o lago.' : 'Dentro da caverna, atrás da cortina de água. Siga em frente até o salão.'; }
    // VER UM ANIMAL de perto: 'me mostre o elefante', 'quero ver o leão'
    if (E && fvDisp.rio && /quatro (bracos|rios|cabeceiras)|rio (que )?se divide|divide em quatro/.test(q)) { abrirFotoVivaEden('rio'); return 'O rio que sai do Éden e se divide em quatro braços (Gênesis 2:10). Arraste para olhar em volta.'; }
    if (E && fvDisp.entrada && /entrada do (jardim|eden)|porta do jardim|trilha (da|de) entrada/.test(q)) { abrirFotoVivaEden('entrada'); return 'A entrada do jardim: a trilha de terra entra na mata entre figueiras e romãzeiras. Atrás, a planície. Arraste para olhar em volta.'; }
    if (E && fvDisp.clareira && /riacho|clareira|corrego|regato/.test(q)) { abrirFotoVivaEden('clareira'); return 'A clareira do riacho: a água desce da pequena cachoeira entre pedras com musgo. Arraste para olhar; W e S dão alguns passos.'; }
    if (manadas && /manada|zebra/.test(q)) { const m = manadas.lista[0], a = Math.atan2(m.z, m.x), x = m.x - Math.cos(a) * 48, z = m.z - Math.sin(a) * 48; pularChegada(); voarLivre = false; eu.set(x, 0, z); subida = 3; yaw = Math.atan2(-(m.x - x), -(m.z - z)); pitch = -0.05; return 'Lá adiante, uma manada de zebras pastando no campo aberto.'; }
    if (E && A3D) { const M3 = [[/elefante/, 'elefante', 'o elefante'], [/leao|leoa|leoes/, 'leoa', 'a leoa'], [/tigre/, 'tigre', 'o tigre'], [/sucuri|anaconda|cobra|serpente/, 'sucuri', 'a sucuri'], [/girafa/, 'girafa', 'a girafa'], [/arara|passaro|ave/, 'arara', 'as araras'], [/animais|bichos|animal/, 'elefante', 'os animais']];
      const k = M3.find(([re]) => re.test(q)); if (k) { const b = A3D.encontrar(k[1]); if (b) { const voa = b.e.voa, dist = voa ? 30 : 5 + b.e.h * 3.2, ang = rnd() * 6.283; let x = b.x + Math.sin(ang) * dist, z = b.z + Math.cos(ang) * dist; if (naAgua(x, z)) { x = b.x - Math.sin(ang) * dist; z = b.z - Math.cos(ang) * dist; }
          pularChegada(); subida = 0; voarLivre = false; eu.set(x, 0, z); yaw = Math.atan2(-(b.x - x), -(b.z - z)); pitch = voa ? 0.45 : -0.05; if (!voa) A3D.fazerAndarDeLado(b, eu); return `Aqui está ${k[2]}.`; } } }
    if (E && bichos.length) { const NOMES = [[/elefante/, ['elefante-anda'], 'o elefante'], [/leao|leoa|leoes/, ['leao-anda', 'leao'], 'o leão'], [/girafa/, ['girafa'], 'a girafa'], [/tigre/, ['tigre', 'tigre-rugindo', 'tigre-deitado'], 'o tigre'], [/cervo|veado/, ['cervo'], 'o cervo'], [/onca/, ['onca'], 'a onça'], [/cordeiro|ovelha/, ['cordeiro'], 'o cordeiro'], [/pavao/, ['pavao'], 'o pavão'], [/capivara/, ['capivara'], 'a capivara'], [/anta/, ['anta'], 'a anta'], [/animais|bichos|animal/, ['elefante-anda', 'leao-anda'], 'os animais']];
      const k = NOMES.find(([re]) => re.test(q)); if (k) { let alvo = null; for (const nm of k[1]) { const lst = bichos.filter((b) => b.e.n === nm); if (lst.length) { alvo = lst.reduce((a, b) => Math.hypot(b.x - eu.x, b.z - eu.z) < Math.hypot(a.x - eu.x, a.z - eu.z) ? b : a); break; } }
        if (alvo) { const dist = 4 + alvo.e.h * 2.4, dx = eu.x - alvo.x, dz = eu.z - alvo.z, d = Math.hypot(dx, dz) || 1; let x = alvo.x + dx / d * dist, z = alvo.z + dz / d * dist; if (naAgua(x, z)) { x = alvo.x - dx / d * dist; z = alvo.z - dz / d * dist; }
          pularChegada(); subida = 0; voarLivre = false; eu.set(x, 0, z); yaw = Math.atan2(-(alvo.x - x), -(alvo.z - z)); pitch = -0.06;
          // e ele começa a andar de lado, atravessando a sua frente
          if (alvo.e.anda) { const ax = alvo.x - x, az = alvo.z - z, al = Math.hypot(ax, az) || 1; for (const sg of [1, -1]) { const tx = alvo.x + az / al * 18 * sg, tz = alvo.z - ax / al * 18 * sg; if (!naAgua(tx, tz)) { alvo.alvo = { x: tx, z: tz }; break; } } }
          return `Aqui está ${k[2]}.`; } } }
    if (/arvore da vida|meio do jardim/.test(q) && E) { indo = new THREE.Vector3(TD.x * 24, 0, TD.z * 24); return 'Indo até a árvore da vida.'; }
    if (/golias|meio do vale/.test(q) && L) { indo = new THREE.Vector3(0, 0, 25); return 'Descendo ao vale, até Golias.'; }
    if (/ribeiro|seixos|pedras/.test(q) && L) { indo = new THREE.Vector3(0, 0, ribZ(0) - 4); return 'Indo até o ribeiro dos seixos.'; }
    return null;
  };
  // RODA DO MOUSE (ou pinça): para trás o drone sobe; o lugar some lá embaixo e você sai no globo (como no Google Earth); para frente, desce
  let subida = 0, saindo = false; const LIM = E ? 1500 : 800;
  const subir = (d) => { if (saindo) return; subida = Math.max(0, Math.min(LIM + 50, subida + d)); if (subida > LIM && typeof window.NEXUS_PARA_GLOBO === 'function' && MW.lat != null) { saindo = true; raiz.style.transition = 'opacity .9s ease'; raiz.classList.remove('on'); setTimeout(() => { window.NEXUS_PARA_GLOBO(MW.lat, MW.lon); fechar(); }, 700); } };
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (voando) return; subir(e.deltaY * (0.35 + subida / 900)); }, { passive: false });
  let pin = null; canvas.addEventListener('touchmove', (e) => { if (e.touches.length !== 2) { pin = null; return; } const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pin) subir((pin - d) * (1.2 + subida / 300)); pin = d; }, { passive: true });
  canvas.addEventListener('touchend', () => { pin = null; });
  // VOAR: sobe como um drone para atravessar o jardim depressa; tocar de novo pousa
  let voarLivre = false, altVoo = 0; const btVoar = raiz.querySelector('.ej-voar');
  btVoar.onclick = () => { voarLivre = !voarLivre; btVoar.textContent = voarLivre ? '🦶 Pousar' : '🕊 Voar'; if (voarLivre) { pitch = Math.min(pitch, -0.3); if (modo === 'terceira') { modo = 'primeira'; } } };
  // CÂMERA e CONTROLES
  let yaw = Math.atan2(TD.x, TD.z), pitch = -0.05, voando = chegada; const eu = VT(2.5 * Math.sin(I / 13), I); const vel = new THREE.Vector3();
  const teclas = new Set(), joy = { x: 0, y: 0 }; let indo = null, olhar = null, ultimoToque = 0;
  const kd = (e) => { if (e.target.closest && e.target.closest('input,textarea')) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { teclas.add(k); indo = null; if (voando) pularChegada(); e.preventDefault(); } if (k === 'escape') fechar(); };
  const ku = (e) => teclas.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => { if (voando) { pularChegada(); return; } olhar = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} ligarSom();
    const ag = performance.now(); if (ag - ultimoToque < 330) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(terreno)[0]; if (hit && hit.distance < 400) indo = hit.point.clone(); } ultimoToque = ag; });
  canvas.addEventListener('pointermove', (e) => { if (!olhar || olhar.id !== e.pointerId) return; yaw -= (e.clientX - olhar.x) * 0.0042; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - olhar.y) * 0.0036)); olhar.x = e.clientX; olhar.y = e.clientY; });
  const soltar = (e) => { if (olhar && olhar.id === e.pointerId) olhar = null; }; canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);
  const joyEl = raiz.querySelector('.ej-joy'), joyB = joyEl.querySelector('b'); let joyId = null;
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; joyB.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); indo = null; ligarSom(); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyFim = (e) => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; joyB.style.transform = ''; }; joyEl.addEventListener('pointerup', joyFim); joyEl.addEventListener('pointercancel', joyFim);

  // SOM: água correndo (mais forte perto do rio), vento e cantos de pássaros, tudo sintetizado no navegador
  let audio = null, somLigado = false; const btSom = raiz.querySelector('.ej-som');
  function ligarSom() { if (somLigado || audio === false) return; try { audio = audio || criarAudio(); audio.ctx.resume(); somLigado = true; btSom.textContent = '🔊 Som'; } catch (_) { audio = false; } }
  btSom.onclick = () => { if (!somLigado) ligarSom(); else { somLigado = false; audio && audio.ctx.suspend(); btSom.textContent = '🔈 Som'; } };
  function criarAudio() { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); let ult = 0; for (let i = 0; i < n; i++) { const b = Math.random() * 2 - 1; ult = (ult + 0.02 * b) / 1.02; d[i] = ult * 3.5; }
    const ruido = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const agua = ruido(), fA = ctx.createBiquadFilter(); fA.type = 'bandpass'; fA.frequency.value = 650; fA.Q.value = 0.5; const gA = ctx.createGain(); gA.gain.value = 0; agua.connect(fA).connect(gA).connect(ctx.destination);
    const agua2 = ruido(), fA2 = ctx.createBiquadFilter(); fA2.type = 'highpass'; fA2.frequency.value = 2400; const gA2 = ctx.createGain(); gA2.gain.value = 0; agua2.connect(fA2).connect(gA2).connect(ctx.destination);
    const vento = ruido(), fV = ctx.createBiquadFilter(); fV.type = 'lowpass'; fV.frequency.value = 380; const gV = ctx.createGain(); gV.gain.value = 0.18; vento.connect(fV).connect(gV).connect(ctx.destination);
    function grilo() { const t0 = ctx.currentTime; for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), g = ctx.createGain(), a = t0 + i * 0.09; o.type = 'triangle'; o.frequency.value = 4300 + Math.random() * 300; g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.018, a + 0.01); g.gain.linearRampToValueAtTime(0, a + 0.05); o.connect(g).connect(ctx.destination); o.start(a); o.stop(a + 0.06); } }
    function piar() { if (!ativo) return; if (somLigado && N) { grilo(); setTimeout(piar, 300 + Math.random() * 900); return; } if (somLigado) { const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime, f0 = 2200 + Math.random() * 2200, k = 2 + Math.floor(Math.random() * 4); o.type = 'sine'; g.gain.value = 0; o.connect(g).connect(ctx.destination);
        for (let i = 0; i < k; i++) { const a = t0 + i * 0.13; o.frequency.setValueAtTime(f0, a); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.4), a + 0.08); g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.035, a + 0.02); g.gain.linearRampToValueAtTime(0, a + 0.1); }
        o.start(t0); o.stop(t0 + k * 0.13 + 0.1); }
      setTimeout(piar, 900 + Math.random() * 3800); }
    setTimeout(piar, 1500);
    function rugir() { const t0 = ctx.currentTime, d = 2.4; const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.setValueAtTime(70, t0); o.frequency.linearRampToValueAtTime(115, t0 + 0.5); o.frequency.exponentialRampToValueAtTime(48, t0 + d);
      o2.frequency.setValueAtTime(73, t0); o2.frequency.linearRampToValueAtTime(119, t0 + 0.5); o2.frequency.exponentialRampToValueAtTime(50, t0 + d);
      f.type = 'bandpass'; f.frequency.setValueAtTime(420, t0); f.frequency.linearRampToValueAtTime(780, t0 + 0.4); f.frequency.exponentialRampToValueAtTime(260, t0 + d); f.Q.value = 1.4;
      const rr = ruido(), gr = ctx.createGain(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 0.8; rr.connect(f2).connect(gr); gr.gain.setValueAtTime(0, t0); gr.gain.linearRampToValueAtTime(0.5, t0 + 0.25); gr.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 24; lg.gain.value = 0.35; lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.9, t0 + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(f); o2.connect(f); f.connect(g); gr.connect(g); g.connect(ctx.destination); [o, o2, lfo].forEach((x) => { x.start(t0); x.stop(t0 + d + 0.1); }); setTimeout(() => { try { rr.stop(); } catch (_) {} }, (d + 0.3) * 1000); }
    return { ctx, gA, gA2, gV, fV, rugir }; }

  // CARTÕES com o texto bíblico quando se chega perto de cada lugar
  let cartaoAtual = null;
  // MOMENTO DE CINEMA: um vídeo curto que aparece ao chegar num lugar (só se o arquivo existir; os de uso pessoal ficam só no PC)
  const momentosVistos = new Set();
  async function momento(id, url, legenda) { if (momentosVistos.has(id)) return; momentosVistos.add(id);
    try { const r = await fetch(url, { method: 'HEAD' }); if (!r.ok) return; } catch (_) { return; }
    // TELA DE CINEMA: escurece, faixas pretas entram, o vídeo ocupa a tela (com o próprio vídeo desfocado atrás), som ligado; no fim, volta ao mundo
    const d = document.createElement('div'); d.className = 'ej-cinema';
    d.innerHTML = `<style>.ej-cinema{position:absolute;inset:0;z-index:30;background:#000;opacity:0;transition:opacity 1.1s ease;overflow:hidden}.ej-cinema.v{opacity:1}
      .ej-cinema .fundo{position:absolute;inset:-40px;width:calc(100% + 80px);height:calc(100% + 80px);object-fit:cover;filter:blur(28px) brightness(.55) saturate(1.2)}
      .ej-cinema .frente{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
      .ej-cinema .faixa{position:absolute;left:0;right:0;height:9vh;background:#000;transition:transform 1.2s cubic-bezier(.2,.8,.2,1);z-index:2}.ej-cinema .t{top:0;transform:translateY(-100%)}.ej-cinema .b{bottom:0;transform:translateY(100%)}.ej-cinema.v .faixa{transform:none}
      .ej-cinema b{position:absolute;left:0;right:0;bottom:2.4vh;text-align:center;z-index:3;font:500 15px 'Cormorant Garamond',Georgia,serif;letter-spacing:.06em;color:#F3E2B3;opacity:.9}
      .ej-cinema button{position:absolute;top:2.2vh;z-index:4;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);color:#fff;border-radius:999px;padding:7px 14px;font:600 12px Inter,sans-serif;cursor:pointer}.ej-cinema .x{right:18px}.ej-cinema .som{right:190px}</style>
      <video class="fundo" src="${url}" muted playsinline></video><video class="frente" src="${url}" playsinline></video><div class="faixa t"></div><div class="faixa b"></div><b>${legenda}</b><button class="som" type="button">🔊 Som</button><button class="x" type="button">Voltar ao jardim ✕</button>`;
    raiz.appendChild(d); const vf = d.querySelector('.fundo'), v = d.querySelector('.frente');
    const sincroniza = () => { if (Math.abs(vf.currentTime - v.currentTime) > 0.2) vf.currentTime = v.currentTime; };
    v.addEventListener('timeupdate', sincroniza); let pausouMundo = false;
    const fechar = () => { d.classList.remove('v'); setTimeout(() => d.remove(), 1200); if (audio && pausouMundo) try { audio.ctx.resume(); } catch (_) {} };
    requestAnimationFrame(() => d.classList.add('v'));
    setTimeout(async () => { if (audio && audio.ctx.state === 'running') { try { await audio.ctx.suspend(); pausouMundo = true; } catch (_) {} }
      try { await v.play(); } catch (_) { v.muted = true; d.querySelector('.som').textContent = '🔇 Som'; try { await v.play(); } catch (_) {} } vf.play().catch(() => {}); }, 700);
    d.querySelector('.x').onclick = fechar; d.querySelector('.som').onclick = () => { v.muted = !v.muted; d.querySelector('.som').textContent = v.muted ? '🔇 Som' : '🔊 Som'; v.play(); };
    v.onended = () => setTimeout(fechar, 500); }
  window.NEXUS_MOMENTO = momento;
  function cartao(k) { if (cartaoAtual === k) return; cartaoAtual = k; if (!k) { card.classList.remove('v'); return; } if (!MW.versos[k]) { card.classList.remove('v'); return; } const [r, t] = MW.versos[k]; card.classList.remove('v'); setTimeout(() => { card.innerHTML = `<p>“${t}”</p><cite>${r} · Almeida</cite>${MW.notas[k] ? `<small>${MW.notas[k]}</small>` : ''}`; card.classList.add('v'); }, 350); }

  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: toque ? 0 : 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const posCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), posCena = new THREE.Scene();
  const matPos = new THREE.ShaderMaterial({ toneMapped: false, depthTest: false, depthWrite: false, uniforms: { cena: { value: rt.texture }, solTela: { value: new THREE.Vector2(0.5, 0.8) }, solVis: { value: 0 }, asp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D cena; uniform vec2 solTela; uniform float solVis, asp; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      void main(){ vec3 c = texture(cena, vUv).rgb;
        vec3 b = textureLod(cena, vUv, 3.).rgb * .45 + textureLod(cena, vUv, 5.).rgb * .35 + textureLod(cena, vUv, 7.).rgb * .3; c += max(b - .85, 0.) * .55;
        vec2 d = (solTela - vUv) / 48.; vec2 uv = vUv; float dec = 1.; vec3 gr = vec3(0.);
        for (int i = 0; i < 48; i++) { uv += d; vec3 sm = textureLod(cena, clamp(uv, 0., 1.), 2.).rgb; float l = max(dot(sm, vec3(.3, .59, .11)) - 1.15, 0.); gr += min(sm * l, vec3(4.)) * dec; dec *= .965; }
        c += gr * .022 * solVis * vec3(1., .86, .62);
        c *= ${!N ? '1.12' : '1.35'}; c = aces(c);${!N ? '' : ' c = mix(c, c * vec3(.86, .95, 1.12), .6);'}
        float lum = dot(c, vec3(.299, .587, .114)); c = mix(vec3(lum), c, 1.12); c = mix(c, c * vec3(${J ? '1.01, 1.0, .98' : '1.05, 1.0, .9'}), smoothstep(.4, 1., lum)); c = mix(c, c * vec3(.92, 1.0, 1.05), smoothstep(.45, 0., lum));
        vec2 q = vUv - .5; q.x *= asp; c *= 1. - .32 * smoothstep(.35, .95, length(q));
        gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), 1.); }` });
  posCena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matPos)); lixo.push(rt, matPos);
  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const pr = renderer.getPixelRatio(); rt.setSize(Math.max(4, Math.floor(w * pr)), Math.max(4, Math.floor(h * pr))); reflRT.setSize(Math.max(4, Math.floor(w * pr / 2)), Math.max(4, Math.floor(h * pr / 2))); matPos.uniforms.asp.value = w / Math.max(1, h); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();

  // CHEGADA DE DRONE: do alto, sobre o jardim, descendo em curva até pousar na trilha diante da árvore da vida
  const voo = new THREE.CatmullRomCurve3(J ? [new THREE.Vector3(1150, 330, -260), new THREE.Vector3(700, 220, -150), new THREE.Vector3(380, 120, -40), new THREE.Vector3(215, 105, 60), new THREE.Vector3(140, 30, 85), VT(0, I + 8, 4), VT(0, I, 0)] : E ? [VT(-600, 1500, 820), VT(-300, 900, 420), VT(-60, 420, 160), VT(30, 200, 45), VT(20, 140, 18), VT(0, 72, 0)] : G ? [VT(-160, 420, 140), VT(-80, 260, 70), VT(-20, 150, 28), VT(10, 100, 10), VT(4, 80, 3), VT(0, 66, 0)] : [VT(-1900, 40, 320), VT(-1100, 90, 190), VT(-450, 150, 95), VT(-130, 185, 40), VT(-25, I + 6, 9), VT(0, I, 0)]);
  if (avatar && E) { const a = 2.5 * Math.sin(70 / 13); voo.points[voo.points.length - 1].copy(VT(a + 0.8, 73.5, 2.0)); voo.points[voo.points.length - 2].copy(VT(14, 140, 30)); voo.updateArcLengths(); }
  const DUR = 9000; let t0 = performance.now();
  if (voando) raiz.classList.add('voando');
  function pularChegada() { if (!voando) return; voando = false; raiz.classList.remove('voando'); cartao('chegada'); }
  let ativo = true, antes = performance.now(), passoBob = 0;
  function quadro(agora) { if (!ativo) return; if (fotoViva) { antes = agora; requestAnimationFrame(quadro); return; } const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora; const t = agora / 1000; unif.t.value = t;
    if (rota) { const q = Math.min(1, (agora - rota.t0) / rota.dur), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; const p0 = rota.curva.getPointAt(e), p1 = rota.curva.getPointAt(Math.min(1, e + 0.04)); camera.position.copy(p0); camera.lookAt(p1.x, p1.y - 2, p1.z);
      if (q >= 1) { const f = rota.fim; rota = null; f(); } renderer.setRenderTarget(rt); renderer.render(cena, camera); renderer.setRenderTarget(null); renderer.render(posCena, posCam); requestAnimationFrame(quadro); return; }
    if (indoLonge) { const q = Math.min(1, (agora - indoLonge.t0) / indoLonge.dur), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; camera.position.lerpVectors(indoLonge.de, indoLonge.para, e); camera.position.y += Math.sin(q * Math.PI) * 25; camera.lookAt(indoLonge.olhar);
      if (q >= 1) { const f = indoLonge.fim; indoLonge = null; f(); } renderer.setRenderTarget(rt); renderer.render(cena, camera); renderer.setRenderTarget(null); renderer.render(posCena, posCam); requestAnimationFrame(quadro); return; }
    { const hc = camera.position.y - altura(camera.position.x, camera.position.z), kN = 1 - 0.7 * THREE.MathUtils.smoothstep(hc, 25, 260); cena.fog.density = DENS * kN; unif.dens.value = DENS * kN; }   // do alto (drone) a névoa abre: o jardim aparece inteiro, sem a tela clara
    if (voando) { const q = Math.min(1, (agora - t0) / DUR), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; const p = voo.getPointAt(e); const hc = altura(p.x, p.z); camera.position.set(p.x, Math.max(hc + 1.7, hc + p.y + 1.7), p.z);
      const olhaPara = new THREE.Vector3(0, 10 * (1 - e) + 6 * e, 0); camera.lookAt(olhaPara); const fw = new THREE.Vector3(); camera.getWorldDirection(fw); yaw = Math.atan2(-fw.x, -fw.z); pitch = Math.asin(fw.y); if (modo === 'primeira' || !avatar) eu.set(p.x, 0, p.z); else { eu.copy(VT(2.5 * Math.sin(I / 13), I)); rumo = Math.atan2(-TD.x, -TD.z); } camPos.copy(camera.position); camIni = true;
      if (q >= 1) pularChegada(); }
    else {
      // andar
      let fx = 0, fz = 0; if (teclas.has('w') || teclas.has('arrowup')) fz += 1; if (teclas.has('s') || teclas.has('arrowdown')) fz -= 1; if (teclas.has('a')) fx -= 1; if (teclas.has('d')) fx += 1;
      if (teclas.has('arrowleft')) yaw += dt * 1.6; if (teclas.has('arrowright')) yaw -= dt * 1.6;
      fx += joy.x; fz += -joy.y;
      if (indo && !(modo === 'terceira' && avatar)) { const dx = indo.x - eu.x, dz = indo.z - eu.z, d = Math.hypot(dx, dz); if (d < 1.2) indo = null; else { const alvoYaw = Math.atan2(-dx, -dz); let dy = alvoYaw - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 3); fz = Math.min(1, d / 4); } }
      const terceira = modo === 'terceira' && avatar;
      if (terceira && indo) { const dx = indo.x - eu.x, dz = indo.z - eu.z, d = Math.hypot(dx, dz); if (d < 1.2) indo = null; else { const sY = Math.sin(yaw), cY = Math.cos(yaw), ff = Math.min(1, d / 4) / d; fz = (-sY * dx - cY * dz) * ff; fx = (cY * dx - sY * dz) * ff; } }
      const corre = (teclas.has('shift') ? 2.6 : 1) * (voarLivre ? 7 : 1), vMax = (terceira ? 3.4 : 4.2) * corre; const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
      const alvoV = new THREE.Vector3((-sinY * fz + cosY * fx) * vMax, 0, (-cosY * fz - sinY * fx) * vMax); vel.lerp(alvoV, Math.min(1, dt * 6));
      const ex = eu.x, ez = eu.z; eu.addScaledVector(vel, dt); { const f1 = fundura(eu.x, eu.z); if (!voarLivre && f1 > 1.1 && f1 > fundura(ex, ez)) { eu.x = ex; eu.z = ez; vel.multiplyScalar(0.2); } }
      // não atravessa troncos nem animais
      if (caixasJ) for (const [a, b, c, d] of caixasJ) if (eu.x > a - 0.4 && eu.x < c + 0.4 && eu.z > b - 0.4 && eu.z < d + 0.4) { const e1 = eu.x - (a - 0.4), e2 = c + 0.4 - eu.x, e3 = eu.z - (b - 0.4), e4 = d + 0.4 - eu.z, m = Math.min(e1, e2, e3, e4); if (m === e1) eu.x = a - 0.4; else if (m === e2) eu.x = c + 0.4; else if (m === e3) eu.z = b - 0.4; else eu.z = d + 0.4; }
      for (const o of obst) { const dx = eu.x - o.x, dz = eu.z - o.z, d = Math.hypot(dx, dz), m = o.r + 0.35; if (d < m && d > 1e-4) { eu.x = o.x + dx / d * m; eu.z = o.z + dz / d * m; } }
      for (const b of bichos) { const dx = eu.x - b.x, dz = eu.z - b.z, d = Math.hypot(dx, dz), m = 0.3 + b.e.h * 0.45; if (d < m && d > 1e-4) { eu.x = b.x + dx / d * m; eu.z = b.z + dz / d * m; } }
      const r = Math.hypot(eu.x, eu.z); if (r > 1500) eu.multiplyScalar(1500 / r);
      if (CQO && !voarLivre) CQO.andar(eu, { x: ex, z: ez });
      const vv = vel.length(); passoBob += vv * dt * 1.9; const agua = naAgua(eu.x, eu.z), hc = CQO ? CQO.altura(altura(eu.x, eu.z)) : altura(eu.x, eu.z);
      if (terceira) {
        if (vv > 0.3) { const alvo = Math.atan2(vel.x, vel.z); let d = alvo - rumo; d = Math.atan2(Math.sin(d), Math.cos(d)); rumo += d * Math.min(1, dt * 9); }
        fasePasso += vv * dt * 2.3; matAv.uniforms.fase.value = fasePasso; matAv.uniforms.amp.value += (Math.min(1.1, vv / 3.4) - matAv.uniforms.amp.value) * Math.min(1, dt * 8);
        avatar.visible = true; avatar.position.set(eu.x, hc - 0.02, eu.z); avatar.rotation.y = rumo + (pecas.explorador.giro || 0);
        // câmera atrás do ombro, com atraso suave
        const p2 = Math.max(-0.15, Math.min(1.1, -pitch + 0.22)), D = 2.6, dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), dirX = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const des = new THREE.Vector3(eu.x + dir.x * Math.cos(p2) * D + dirX.x * 0.85, hc + 1.5 + Math.sin(p2) * D, eu.z + dir.z * Math.cos(p2) * D + dirX.z * 0.85);
        des.y = Math.max(des.y, altura(des.x, des.z) + 0.5);
        if (!camIni) { camPos.copy(des); camIni = true; } camPos.lerp(des, 1 - Math.exp(-dt * 7)); camera.position.copy(camPos);
        olhoAlvo.set(eu.x - dir.x * 4 + dirX.x * 0.85, hc + 1.4, eu.z - dir.z * 4 + dirX.z * 0.85); camera.lookAt(olhoAlvo);
      } else {
        if (avatar) avatar.visible = false;
        altVoo += (Math.max(voarLivre ? 55 : 0, subida) - altVoo) * Math.min(1, dt * 2.5); if (subida > 30) pitch += (-Math.min(1.25, 0.25 + subida / 700) - pitch) * Math.min(1, dt * 2); camera.position.set(eu.x, Math.max(hc, CQO && CQO.dentro ? hc : hBase(eu.x, eu.z) - 1.0 - 0.6) + 1.7 + altVoo + Math.sin(passoBob * 2) * 0.035 * Math.min(1, vv / 3) * (voarLivre ? 0 : 1), eu.z);
        camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch;
      }
      // cartões por proximidade
      const dArv = Math.hypot(eu.x, eu.z), dForq = Math.hypot(eu.x - FORQ.x, eu.z - FORQ.z), dPres = Math.hypot(eu.x - posPresenca.x, eu.z - posPresenca.z);
      const perto = bichos.some((b) => Math.hypot(b.x - eu.x, b.z - eu.z) < 9);
      cartao(E ? (CQO && CQO.dentro ? 'caverna' : CQO && CQO.distQueda(eu.x, eu.z) < 72 ? 'cachoeira' : dPres < 16 ? 'presenca' : dArv < 30 ? 'arvore' : dForq < 26 ? 'rio' : perto ? 'animais' : dArv < 90 ? 'chegada' : r > 300 ? 'bom' : null)
        : L ? (Math.hypot(eu.x - 0, eu.z - 40) < 25 ? 'golias' : Math.abs(eu.z - ribZ(eu.x)) < 10 && Math.abs(eu.x) < 400 ? 'ribeiro' : eu.x < -450 ? 'oeste' : eu.z < -105 ? 'israel' : eu.z > 120 ? 'filisteus' : Math.abs(eu.z) < 80 ? 'davi' : 'bom')
        : J ? (() => { let k = null, dm = 1e9; for (const [nm, [lx, lz]] of Object.entries(JC.LUGARES)) { const d = Math.hypot(eu.x - lx, eu.z - lz), lim = nm === 'santuario' ? 70 : nm === 'palacio' ? 90 : 40; if (d < lim && d < dm) { dm = d; k = nm; } } return k || (Math.abs(eu.x) < 150 && Math.abs(eu.z) < 242 ? 'chegada' : 'bom'); })()
        : (dPres < 5 ? 'presenca' : Math.hypot(eu.x + TD.x * 12, eu.z + TD.z * 12) < 7 ? 'cidade' : dArv < 10 ? 'rocha' : tochaPerto(eu.x, eu.z) < 30 ? 'tochas' : dArv < 45 ? 'vigiai' : dArv < 180 ? 'chegada' : 'bom'));
    }
    moverBichos(dt); if (A3D) A3D.atualizar(dt, t, eu);
    if (manadas) { const { f, lista } = manadas, pc = f.pc; for (let i = 0; i < lista.length; i++) { f.Q[i] = (t * pc.quadros / pc.dur + i * 11) % pc.quadros;
        if (Math.hypot(lista[i].x - eu.x, lista[i].z - eu.z) < 38) { const n = manadas.longe(240, 420, Math.atan2(lista[i].z - eu.z, lista[i].x - eu.x)); lista[i].x = n.x; lista[i].z = n.z; f.P[i * 3] = n.x; f.P[i * 3 + 1] = altura(n.x, n.z) - 0.15; f.P[i * 3 + 2] = n.z; f.g.attributes.iPos.needsUpdate = true; } }
      f.g.attributes.iQuadro.needsUpdate = true; } if (tochas.mover) tochas.mover(t); if (quadroJ) quadroJ(camera.position);
    caminhoPresenca.getPointAt(((t / 160) % 1 + 1) % 1, posPresenca); presenca.position.set(posPresenca.x, altura(posPresenca.x, posPresenca.z), posPresenca.z); brilho.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.7);
    if (voando) matGrama.uniforms.centro.value.set(camera.position.x, camera.position.z); else matGrama.uniforms.centro.value.set(eu.x, eu.z); grama.visible = camera.position.y - altura(camera.position.x, camera.position.z) < 25;
    if (avatar && voando) { avatar.visible = modo === 'terceira'; avatar.position.set(eu.x, altura(eu.x, eu.z), eu.z); avatar.rotation.y = rumo + (pecas.explorador.giro || 0); }
    if (ceu) ceu.position.copy(camera.position);
    if (audio && somLigado) { const [d, w] = distRio(camera.position.x, camera.position.z), k = Math.max(0, 1 - Math.max(0, d - w) / 60, CQO ? 1.15 - CQO.distQueda(camera.position.x, camera.position.z) / 110 : 0); audio.gA.gain.setTargetAtTime(0.95 * k * k, audio.ctx.currentTime, 0.3); audio.gA2.gain.setTargetAtTime(0.10 * k * k, audio.ctx.currentTime, 0.3);
      const dP = Math.hypot(camera.position.x - posPresenca.x, camera.position.z - posPresenca.z); audio.gV.gain.setTargetAtTime(0.14 + 0.35 * Math.max(0, 1 - dP / 40) + 0.06 * Math.sin(t * 0.3), audio.ctx.currentTime, 0.5); }
    solDisco.position.copy(camera.position).addScaledVector(SOL, 3500); matF.uniforms.centro.value.set(voando ? camera.position.x : eu.x, altura(eu.x, eu.z), voando ? camera.position.z : eu.z); feixes.visible = polen.visible; matPo.uniforms.centro.value.set(voando ? camera.position.x : eu.x, altura(eu.x, eu.z), voando ? camera.position.z : eu.z); polen.visible = !voando || camera.position.y - altura(camera.position.x, camera.position.z) < 30;
    const sp = solDisco.position.clone().project(camera), fw = new THREE.Vector3(); camera.getWorldDirection(fw); matPos.uniforms.solTela.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); matPos.uniforms.solVis.value = Math.max(0, fw.dot(SOL)) ** 1.5 * (sp.z < 1 ? 1 : 0);
    if (audio && somLigado) { const tg = bichos.find((b) => b.e.n === 'leao-anda'); if (tg && Math.hypot(tg.x - camera.position.x, tg.z - camera.position.z) < 16 && t - (window.__ultRugido || 0) > 25) { window.__ultRugido = t; audio.rugir(); } }
    if (ER) { ER.atualizar(camera.position, t); const fx = voando ? camera.position.x : eu.x, fz = voando ? camera.position.z : eu.z, px = Math.round(fx / 2) * 2, pz = Math.round(fz / 2) * 2, py = altura(px, pz); sol.target.position.set(px, py, pz); sol.position.set(px + SOL.x * 300, py + SOL.y * 300, pz + SOL.z * 300); sol.target.updateMatrixWorld(); }
    camera.updateMatrixWorld(); refletir(); renderer.setRenderTarget(rt); renderer.render(cena, camera); renderer.setRenderTarget(null); renderer.render(posCena, posCam); requestAnimationFrame(quadro); }
  const iniciar = () => requestAnimationFrame((a) => { raiz.style.pointerEvents = ''; raiz.classList.add('on'); t0 = a; antes = a; if (!voando) cartao('chegada'); quadro(a); });
  // aquecimento escondido: compila os shaders em paralelo e manda para a placa de vídeo uma peça por quadro (o globo segue liso durante o voo)
  async function aquecer() { try { const p0 = voo.getPointAt(0); camera.position.set(p0.x, altura(p0.x, p0.z) + p0.y + 1.7, p0.z); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      if (renderer.compileAsync) await renderer.compileAsync(cena, camera); const rtP = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType }); const objs = cena.children.slice(), vis = objs.map((o) => o.visible), cul = objs.map((o) => o.frustumCulled);
      objs.forEach((o) => { o.visible = false; o.frustumCulled = false; });
      for (let i = 0; i < objs.length; i++) { objs[i].visible = vis[i]; renderer.setRenderTarget(rtP); renderer.render(cena, camera); await new Promise((ok) => requestAnimationFrame(ok)); }
      // a imagem final (brilho, raios de sol, cor) também é compilada e o quadro grande alocado antes de aparecer
            if (renderer.compileAsync) await renderer.compileAsync(posCena, posCam); renderer.setRenderTarget(rt); renderer.render(cena, camera); await new Promise((ok) => requestAnimationFrame(ok)); renderer.setRenderTarget(rtP); renderer.render(posCena, posCam); await new Promise((ok) => requestAnimationFrame(ok));
      objs.forEach((o, i) => { o.frustumCulled = cul[i]; }); renderer.setRenderTarget(rt); renderer.clear(); renderer.setRenderTarget(reflRT); renderer.clear(); renderer.setRenderTarget(null); rtP.dispose(); } catch (e) { console.warn('aquecer', e); } }
  if (oculto) { raiz.style.pointerEvents = 'none'; await aquecer(); } else iniciar();   // compila os shaders sem travar (em paralelo) e sobe as texturas antes de aparecer

  function fechar() { if (!ativo) return; ativo = false; if (ER) ER.parar(); carga(null); window.NEXUS_CENA = null; window.NEXUS_MUNDO_ACAO = null; obs.disconnect(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); raiz.classList.remove('on'); if (audio) try { audio.ctx.close(); } catch (_) {}
    setTimeout(() => { lixo.forEach((o) => o && o.dispose && o.dispose()); renderer.dispose(); raiz.remove(); }, 1400); if (aoFechar) aoFechar(); }
  raiz.querySelector('.ej-sair').onclick = fechar;
  // o guia sabe onde o pastor está dentro do jardim (para conversar sobre o que ele vê)
  const LUGAR0 = { arvore: 'diante da árvore da vida, no meio do jardim (Gn 2:9)', rio: 'onde o rio que sai do Éden se divide em quatro braços (Gn 2:10)', animais: 'entre os animais do jardim (Gn 2:19)', presenca: 'junto da luz que representa a presença do Senhor passeando no jardim (Gn 3:8)', chegada: 'na trilha que leva à árvore da vida (Gn 2:8)', bom: 'nas partes distantes do jardim (Gn 1:31)' };
  const LUGAR = MW.lugar || LUGAR0;
  window.NEXUS_CENA = () => MW.nome + ' em 3D (reconstituição artística, ilustrativa), ' + (voando ? 'chegando de drone' : voarLivre ? 'voando sobre o lugar' : (LUGAR[cartaoAtual] || 'andando pelo lugar'));
  return window.__mundoW = { cena, fechar, info: () => ({ tri: renderer.info.render.triangles, calls: renderer.info.render.calls, geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures }), ir: (x, z, y_, p_) => { pularChegada(); eu.x = x; eu.z = z; if (y_ != null) yaw = y_; if (p_ != null) pitch = p_; }, voar: (h) => { subida = h; }, mostrar: () => { if (oculto) { oculto = false; iniciar(); } }, estado: () => ({ x: eu.x, z: eu.z, yaw, pitch, voando, cam: [Math.round(camera.position.x), Math.round(camera.position.y), Math.round(camera.position.z)], bichos: bichos.length, onde: bichos.map((b) => [b.e.n, Math.round(b.x), Math.round(b.z)]) }), olhar: (y, p) => { yaw = y; pitch = p; }, irPara: (x, z) => { pularChegada(); eu.set(x, 0, z); } };
}
