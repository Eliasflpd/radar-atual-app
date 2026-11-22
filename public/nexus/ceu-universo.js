// NEXUS BÍBLICO — CÉU INFINITO como UNIVERSO NAVEGÁVEL (versão de teste, 20/11/2026).
// Abre só em desenvolvimento local:  http://localhost:<porta>/nexus/?ref=João%201:1&ceu=universo
// A versão publicada (ceu.js v9) continua intacta. Mesma interface de ceu.js: criarCeu(container, estado, acoes).
//
// O UNIVERSO É UM MAPA (não é esfera nem grafo em raios). A câmera desliza sobre um plano infinito, com camadas de
// estrelas de fundo em profundidade (paralaxe). Cada estrela do NEXUS tem ENDEREÇO REAL:
//   • os 31.106 versículos da Almeida (biblia.json), cada um num ponto fixo;
//   • cada LIVRO é uma galáxia em espiral (capítulos ao longo dos braços, versículos em volta);
//   • as grandes REGIÕES são as seções do cânon (Lei, Históricos, Poéticos e Sabedoria, Profetas, Evangelhos,
//     Atos, Cartas de Paulo, Cartas Gerais, Apocalipse).
// LIGAÇÕES REAIS: ao passar o mouse num versículo, as referências cruzadas do OpenBible (público) acendem em
// sequência; ao abrir a investigação, os elementos do NEXUS (obras, autores, conceitos, termos — com PIN) entram
// como satélites da passagem, e o painel de evidências do NEXUS abre. Nada é inventado para preencher o espaço:
// nebulosas e estrelas de fundo são decorativas e geradas no aparelho, sem imagem externa.
//
// CAMADAS (20/11/2026): folhas transparentes empilhadas no MESMO sistema de coordenadas, vistas em perspectiva:
//   1. Universo (céu, Via Láctea, regiões do cânon) · 2. Bíblia (galáxias, versículos, ligações) · 3. Atlas (mapa).
// Cada camada tem liga/desliga, opacidade e identidade própria; a busca de um assunto acende as três ao mesmo tempo,
// com fios de luz entre as camadas (lugar no Atlas -> versículos na Bíblia). Para criar uma camada nova, acrescente
// uma entrada em CAMADAS (a ordem é a altura) e ponha seus objetos no grupo dela.
import * as THREE from 'three';

const SECOES = [
  { nome: 'Lei · Pentateuco', de: 0, ate: 4, cor: '#7EA6E6' },
  { nome: 'Livros Históricos', de: 5, ate: 16, cor: '#9DB8D9' },
  { nome: 'Poéticos e Sabedoria', de: 17, ate: 21, cor: '#E8C987' },
  { nome: 'Profetas Maiores', de: 22, ate: 26, cor: '#6FA3C8' },
  { nome: 'Profetas Menores', de: 27, ate: 38, cor: '#86B4C9' },
  { nome: 'Evangelhos', de: 39, ate: 42, cor: '#F2D28B' },
  { nome: 'Atos dos Apóstolos', de: 43, ate: 43, cor: '#D9C08A' },
  { nome: 'Cartas de Paulo', de: 44, ate: 56, cor: '#A9C4EE' },
  { nome: 'Cartas Gerais', de: 57, ate: 64, cor: '#B9CCE6' },
  { nome: 'Apocalipse', de: 65, ate: 65, cor: '#E9B87A' },
];
const NOME_TIPO = { passagem: 'Passagem', obra: 'Obra', autor: 'Autor', conceito: 'Conceito', verbete: 'Termo original', descoberta: 'Descoberta' };
const COR_TIPO = { obra: '#E2B65C', autor: '#C9D3E3', conceito: '#8FD3CF', verbete: '#A6D9A0', descoberta: '#F0A08C' };
const DIST_MIN = 26, DIST_MAX = 140000;   // dá para afastar muito: o universo inteiro vira um ponto de luz

function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
const chave = (b, c, v) => b * 1e6 + c * 1e3 + v;
const decompor = (k) => ({ b: Math.floor(k / 1e6), c: Math.floor((k % 1e6) / 1e3), v: k % 1e3 });
const lerId = (id) => { const m = /^p:(\d+)-(\d+)$/.exec(String(id || '')); return m ? { ini: +m[1], fim: +m[2] } : null; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };

export function criarCeu(container, estado, acoes) {
  const fraco = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ antialias: !fraco, powerPreference: 'high-performance' });
  if (!renderer.getContext()) { acoes.indisponivel && acoes.indisponivel(); return null; }
  const escala = Math.min(devicePixelRatio || 1, fraco ? 1.5 : 2);
  renderer.setPixelRatio(escala);
  renderer.setClearColor('#03050B');
  const canvas = renderer.domElement; canvas.className = 'cu-canvas';
  const rot = document.createElement('canvas'); rot.className = 'cu-rotulos';
  const g2 = rot.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'cu-ui';
  ui.innerHTML = `
    <div class="cu-controles" role="toolbar" aria-label="Navegação do universo">
      <button data-cu="mais" title="Aproximar" aria-label="Aproximar">+</button>
      <button data-cu="menos" title="Afastar" aria-label="Afastar">−</button>
      <button data-cu="geral" title="Visão geral do universo" aria-label="Visão geral">⌂</button>
      <button data-cu="centro" title="Centralizar na seleção" aria-label="Centralizar">◎</button>
      <button data-cu="voltar" title="Voltar à vista anterior" aria-label="Voltar">↶</button>
      <button data-cu="tela" title="Tela cheia" aria-label="Tela cheia">⛶</button>
      <button data-cu="camadas" title="Camadas: ligar, desligar e transparência" aria-label="Camadas" class="cu-bt-atlas ativo">◫</button>
      <button data-cu="terra" title="Terra: o globo como mundo próprio (imagem de satélite, dia e noite agora)" aria-label="Abrir a Terra">🌍</button>
    </div>
    <div class="cu-nivel" aria-label="Onde você está"></div>
    <div class="cu-mini" aria-label="Minimapa do universo"><canvas width="216" height="140"></canvas><div class="cu-mini-pe"><button type="button" data-mini="incl" title="Ver de cima ou inclinado (tecla T)">⟂ <span>de cima</span></button><button type="button" data-mini="teclas" title="Atalhos do teclado">⌨</button></div><div class="cu-mini-teclas" hidden><b>Teclado</b><br>Setas ou W A S D · mover<br>+ e − · aproximar e afastar<br>T · ver de cima / inclinado<br>PgUp e PgDn · inclinação fina<br>Home · visão geral<br>F · tela cheia · Esc · fechar</div></div>
    <div class="cu-dica">Arraste para navegar · roda aproxima onde está o cursor · duplo clique entra · setas e + − no teclado · T inclina · Home volta ao todo</div>
    <div class="cu-dica-toque">Um dedo navega · dois dedos aproximam · toque seleciona · toque longo abre a investigação</div>
    <div class="cu-info" hidden></div>
    <div class="cu-lugar" hidden></div>
    <div class="cu-terra" hidden><span class="cu-terra-txt"></span><button type="button" data-cu-terra="sair">↩ Voltar ao universo</button></div>
    <form class="cu-busca" autocomplete="off"><input type="search" placeholder="Pesquisar assunto: livro, lugar ou seção (ex.: Êxodo, Jerusalém)" aria-label="Pesquisar assunto nas camadas" enterkeyhint="search"><button type="submit">Buscar</button></form>
    <div class="cu-camadas"></div>
    <div class="cu-relogio"><div class="cu-hora"></div><div class="cu-tempo-bts"><button type="button" data-tempo="-60">−1h</button><button type="button" data-tempo="agora">Agora</button><button type="button" data-tempo="60">+1h</button><button type="button" data-tempo="local" title="Usar a localização deste aparelho">📍</button></div><input type="range" min="-720" max="720" value="0" step="10" data-tempo="barra" aria-label="Avançar ou voltar no tempo"></div>
    <div class="cu-invest" hidden></div>
    <div class="cu-cartao" hidden></div>
    <div class="cu-credito">Céu: HYG v4.1 (CC BY-SA) · Via Láctea ESO/S. Brunier (CC BY) · astronomy-engine (MIT) · Almeida · OpenBible (CC BY) · Natural Earth · Theographic (CC BY-SA) · STEPBible/Tyndale House (CC BY) · Easton 1897 (dom. público) · credos históricos (dom. público) · NEXUS</div>`;
  container.append(canvas, rot, ui);
  const estilo = document.createElement('style');
  estilo.textContent = `
    body.ceu-universo.modo-ceu .legenda, body.ceu-universo.modo-ceu .filtros, body.ceu-universo.modo-ceu .rotulos-grupos, body.ceu-universo.modo-ceu .zoom, body.ceu-universo.modo-ceu .ceu-ajuda, body.ceu-universo.modo-ceu .vazio{display:none!important}
    .ceu{background:#03050B}
    .cu-canvas,.cu-rotulos{position:absolute;inset:0;width:100%;height:100%;display:block}
    .cu-canvas{touch-action:none;cursor:grab}.cu-canvas.arrastando{cursor:grabbing}
    .cu-rotulos{pointer-events:none}
    .cu-ui{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#E9E4D6}
    .cu-controles{pointer-events:auto;position:absolute;left:14px;bottom:44px;display:flex;flex-direction:column;gap:6px}
    .cu-controles button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(233,210,150,.28);background:rgba(8,14,30,.72);color:#F1E6C8;font-size:17px;cursor:pointer;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
    .cu-controles .cu-bt-atlas.ativo{background:rgba(201,162,78,.35);border-color:#E9C878}
    .cu-lugar{pointer-events:auto;position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(3,8,22,.88);border:1px solid rgba(233,200,120,.55);border-radius:999px;padding:6px 8px 6px 14px;color:#FFE3A3;font:600 13px Inter,system-ui,sans-serif;display:flex;gap:10px;align-items:center;white-space:nowrap}
    .cu-terra{pointer-events:auto;position:absolute;left:50%;bottom:40px;transform:translateX(-50%);background:rgba(3,8,22,.88);border:1px solid rgba(140,190,255,.5);border-radius:999px;padding:6px 8px 6px 14px;color:#D8E8FF;font:600 12.5px Inter,system-ui,sans-serif;display:flex;gap:10px;align-items:center;white-space:nowrap;max-width:calc(100% - 120px)}
    .cu-terra[hidden]{display:none}.cu-terra-txt{overflow:hidden;text-overflow:ellipsis}
    .cu-terra button{border:1px solid rgba(140,190,255,.6);background:rgba(60,110,200,.3);color:#E8F1FF;border-radius:999px;padding:4px 12px;cursor:pointer;font:600 12.5px Inter,system-ui,sans-serif}
    body.ceu-universo.modo-terra .cu-camadas,body.ceu-universo.modo-terra .cu-dica{display:none}
    .cu-lugar button{border:0;background:rgba(201,162,78,.25);color:#FFE3A3;border-radius:999px;width:24px;height:24px;cursor:pointer}
    .cu-busca{pointer-events:auto;position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:6px;width:min(520px,calc(100% - 300px))}
    .cu-busca input{flex:1;min-width:0;background:rgba(3,8,22,.82);border:1px solid rgba(233,200,120,.45);border-radius:999px;color:#F4EEDC;padding:8px 14px;font:14px Inter,system-ui,sans-serif;outline:none}
    .cu-busca input::placeholder{color:rgba(220,226,240,.6)}
    .cu-busca button{border:1px solid rgba(233,200,120,.6);background:rgba(201,162,78,.28);color:#FFE3A3;border-radius:999px;padding:0 14px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}
    .cu-camadas{pointer-events:auto;position:absolute;right:12px;top:10px;width:236px;max-height:calc(100% - 60px);overflow:auto;background:rgba(3,8,22,.84);border:1px solid rgba(233,200,120,.35);border-radius:14px;padding:10px 12px;font:12.5px Inter,system-ui,sans-serif;color:#E9EDF8;backdrop-filter:blur(6px)}
    .cu-camadas[hidden]{display:none}
    .cu-camadas h4{margin:0 0 6px;font:700 15px "Cormorant Garamond",Georgia,serif;color:#FFE3A3;letter-spacing:.04em}
    .cu-camada{display:grid;grid-template-columns:18px 1fr;gap:2px 8px;align-items:center;margin:6px 0}
    .cu-camada label{display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:600}
    .cu-camada i{width:10px;height:10px;border-radius:50%;display:inline-block}
    .cu-camada input[type=range],.cu-sep input{grid-column:2;width:100%;accent-color:#E9C878}
    .cu-relogio{pointer-events:auto;position:absolute;right:12px;bottom:26px;width:236px;background:rgba(3,8,22,.84);border:1px solid rgba(233,200,120,.35);border-radius:14px;padding:8px 12px;color:#E9EDF8;font:12px Inter,system-ui,sans-serif}
    .cu-hora{font-weight:600;color:#FFE3A3;line-height:1.4}.cu-hora small{display:block;font-weight:400;color:rgba(210,220,240,.8)}
    .cu-tempo-bts{display:flex;gap:5px;margin:6px 0 4px}.cu-tempo-bts button{flex:1;border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.16);color:#FFE3A3;border-radius:8px;padding:4px 0;cursor:pointer;font-size:12px}
    .cu-relogio input{width:100%;accent-color:#E9C878}
    @media (max-width:760px){.cu-relogio{right:8px;bottom:22px;width:200px}}
    .cu-reservada{opacity:.5}.cu-reservada small{grid-column:2;color:rgba(200,210,230,.7);font-size:11px}
    .cu-sep{margin-top:8px;border-top:1px solid rgba(233,200,120,.2);padding-top:6px}
    .cu-invest{pointer-events:auto;position:absolute;left:62px;top:54px;width:min(340px,calc(100% - 80px));max-height:calc(100% - 110px);overflow:auto;background:rgba(3,8,22,.9);border:1px solid rgba(233,200,120,.45);border-radius:14px;padding:12px 14px;color:#EEF1FA;font:13px/1.5 Inter,system-ui,sans-serif}
    .cu-invest h3{margin:0;font:700 22px "Cormorant Garamond",Georgia,serif;color:#FFE3A3}
    .cu-invest h5{margin:10px 0 4px;font:700 11px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9FB7E8}
    .cu-invest .cu-chips{display:flex;flex-wrap:wrap;gap:5px}
    .cu-invest .cu-chips button{border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.14);color:#FFE8B0;border-radius:999px;padding:3px 9px;font-size:12px;cursor:pointer}
    .cu-invest small{color:rgba(200,212,236,.8)}
    .cu-dossie{border-top:1px solid rgba(233,200,120,.18);padding:4px 0}.cu-dossie summary{cursor:pointer;font:700 12px Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#FFE3A3;padding:6px 0;list-style-position:inside}.cu-dossie[open] summary{color:#FFF6DC}.cu-seta{color:rgba(233,200,120,.6);margin:0 2px}
    .cu-investig{pointer-events:auto;position:absolute;left:62px;top:54px;width:min(390px,calc(100% - 80px));max-height:calc(100% - 110px);overflow:auto;background:rgba(3,8,22,.93);border:1px solid rgba(233,200,120,.5);border-radius:14px;padding:12px 14px;color:#EEF1FA;font:13px/1.45 Inter,system-ui,sans-serif}
    .cu-investig[hidden]{display:none}
    .cu-pergaminho{pointer-events:auto;position:absolute;right:14px;top:14px;bottom:14px;width:min(440px,36%);display:flex;flex-direction:column;z-index:6;filter:drop-shadow(0 18px 30px rgba(0,0,0,.55))}
    .cu-pergaminho[hidden]{display:none}
    .cu-pergaminho.fixo{left:62px;right:auto;width:min(520px,42%)}
    .cu-perg-rolo{height:18px;margin:0 -8px;border-radius:9px;background:linear-gradient(180deg,#8A6430,#D7B26A 40%,#7A5626);box-shadow:0 3px 6px rgba(0,0,0,.45)}
    .cu-perg-cab,.cu-perg-texto,.cu-perg-pe{background:linear-gradient(90deg,#E8D3A2,#F7ECCF 12%,#FBF3DD 50%,#F7ECCF 88%,#E8D3A2)}
    .cu-perg-cab{display:flex;align-items:center;gap:8px;padding:10px 18px 4px}.cu-perg-cab h3{flex:1;margin:0;text-align:center;font:700 26px "Cormorant Garamond",Georgia,serif;color:#3A240C}
    .cu-perg-cab button{border:1px solid rgba(90,60,20,.35);background:rgba(255,250,235,.7);color:#4A2E0E;border-radius:999px;width:30px;height:30px;font:700 18px Georgia,serif;cursor:pointer}.cu-perg-cab button:disabled{opacity:.3}.cu-perg-x{font-size:14px!important}
    .cu-perg-texto{flex:1;overflow:auto;padding:6px 26px 10px;font:20px/1.6 "Cormorant Garamond",Georgia,serif;color:#2A1A08}
    .cu-perg-texto p{margin:0 0 8px;cursor:pointer;border-radius:6px;padding:1px 4px}.cu-perg-texto p:hover{background:rgba(160,110,40,.12)}
    .cu-perg-texto p.dest{background:rgba(201,150,60,.28);box-shadow:inset 3px 0 0 #A8742A;font-weight:600}
    .cu-perg-texto sup{font:700 11px Inter,system-ui,sans-serif;color:#8A5A1E;margin-right:5px}
    .cu-perg-pe{padding:4px 18px 8px;text-align:center;font:600 11.5px Inter,system-ui,sans-serif;color:#7A5A2E}
    .cu-jornada blockquote{background:linear-gradient(90deg,#E8D3A2,#FBF3DD 50%,#E8D3A2);color:#2A1A08!important;border-radius:10px;padding:12px 16px;box-shadow:inset 0 0 18px rgba(120,80,20,.3)}
    .cu-jornada blockquote cite{color:#7A4E14!important}
    @media (max-width:760px){.cu-pergaminho,.cu-pergaminho.fixo{left:8px;right:8px;width:auto;top:52px;bottom:auto;max-height:60%}}
    .cu-estudo{pointer-events:none;position:absolute;inset:0;background:radial-gradient(ellipse at 45% 55%,rgba(3,6,16,.35),rgba(3,6,16,.86) 75%)}
    .cu-estudo[hidden]{display:none}
    .cu-estudo>*{pointer-events:auto}
    .cu-e-cab{position:absolute;left:50%;top:10px;transform:translateX(-62%);display:flex;align-items:center;gap:12px;color:#FFE3A3;width:min(760px,60%)}
    .cu-e-marca{font-size:28px;color:#F2C86A;text-shadow:0 0 18px rgba(242,200,106,.8)}
    .cu-e-cab small{color:rgba(230,215,180,.75);letter-spacing:.12em;text-transform:uppercase;font:700 11px Inter,system-ui,sans-serif}
    .cu-e-cab h2{margin:0;font:700 30px "Cormorant Garamond",Georgia,serif;color:#FFF3D6;text-shadow:0 0 22px rgba(242,200,106,.45)}
    .cu-e-bts{margin-left:auto;display:flex;gap:6px}.cu-e-bts button{border:1px solid rgba(233,200,120,.55);background:rgba(20,16,6,.75);color:#FFE3A3;border-radius:999px;padding:6px 12px;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer}
    .cu-e-pilha{position:absolute;left:50%;top:64px;bottom:20px;transform:translateX(-62%);width:min(820px,58%);display:flex;flex-direction:column;justify-content:center;gap:6px;perspective:1300px;overflow:auto;padding:6px 10px}
    .cu-e-cartao{position:relative;transform:rotateX(24deg) translateY(0);transform-origin:center bottom;border-radius:14px;border:1.5px solid color-mix(in srgb,var(--c) 75%,#fff 10%);background:linear-gradient(100deg,rgba(10,10,20,.92),color-mix(in srgb,var(--c) 22%,rgba(10,10,20,.85)) 55%,rgba(10,10,20,.9));box-shadow:0 0 18px color-mix(in srgb,var(--c) 45%,transparent),inset 0 0 22px rgba(0,0,0,.4);cursor:pointer;animation:cuEntra .6s ease-out both;animation-delay:calc(var(--k) * .09s);transition:transform .35s,box-shadow .35s}
    .cu-e-cartao:hover{transform:rotateX(14deg) translateY(-3px);box-shadow:0 0 30px color-mix(in srgb,var(--c) 70%,transparent)}
    .cu-e-cartao.aberto{transform:none;box-shadow:0 0 34px color-mix(in srgb,var(--c) 75%,transparent)}
    .cu-e-cartao.vazio{opacity:.45;filter:saturate(.4)}
    @keyframes cuEntra{from{opacity:0;transform:rotateX(60deg) translateY(40px)}to{opacity:1}}
    .cu-e-linha{display:grid;grid-template-columns:42px 190px 120px 1fr;align-items:center;gap:10px;padding:10px 14px;min-height:46px}
    .cu-e-num{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:800 14px Inter,system-ui,sans-serif;color:#1B1405;background:radial-gradient(circle,#FFE6A6,var(--c));box-shadow:0 0 12px var(--c)}
    .cu-e-nome{font:800 16px Inter,system-ui,sans-serif;letter-spacing:.06em;color:#FFF6E0;text-shadow:0 0 10px rgba(0,0,0,.8)}
    .cu-e-resumo{font:600 13px Inter,system-ui,sans-serif;color:#F3EAD2;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cu-e-img{width:110px;height:44px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.25)}
    .cu-e-palavra{font:700 30px "Times New Roman",serif;color:#FFF3D6;text-shadow:0 0 14px var(--c);text-align:center}
    .cu-e-data{font:700 13px Inter,system-ui,sans-serif;color:#FFE3A3;text-align:center}
    .cu-e-icone{font-size:24px;text-align:center;color:#FFE3A3;filter:drop-shadow(0 0 8px var(--c))}
    .cu-e-itens{padding:0 14px 12px;max-height:260px;overflow:auto;cursor:default}
    .cu-e-fontes{position:absolute;left:62px;top:84px;width:210px;background:rgba(10,8,4,.78);border:1px solid rgba(233,200,120,.4);border-radius:14px;padding:10px 12px;color:#EDE4CC;font:12px/1.5 Inter,system-ui,sans-serif}
    .cu-e-fontes h4{margin:6px 0 4px;font:700 14px "Cormorant Garamond",Georgia,serif;color:#FFE3A3}.cu-e-fontes ul{margin:0;padding-left:16px}.cu-e-fontes p{margin:0 0 6px}
    .cu-estudo{z-index:2}body.cu-modo-estudo .cu-investig{z-index:3;left:auto;right:14px;top:14px;width:min(380px,30%);max-height:calc(100% - 28px)}
    body.cu-modo-estudo .cu-camadas,body.cu-modo-estudo .cu-relogio,body.cu-modo-estudo .cu-busca,body.cu-modo-estudo .cu-nivel,body.cu-modo-estudo .cu-dica{display:none!important}
    body.cu-modo-estudo .cu-invest{z-index:5;left:50%;right:auto;transform:translateX(-50%);top:60px;width:min(460px,46%)}
    @media (max-width:1400px){.cu-e-fontes{display:none}.cu-e-pilha,.cu-e-cab{transform:translateX(-58%)}}
    @media (max-width:1100px){.cu-e-linha{grid-template-columns:36px 1fr 90px}.cu-e-resumo{grid-column:1/-1;text-align:left;white-space:normal}.cu-e-pilha,.cu-e-cab{left:12px;transform:none;width:calc(100% - 54px - min(340px,40%))}body.cu-modo-estudo .cu-investig{width:min(340px,40%)}}
    @media (max-width:760px){.cu-e-pilha{top:56px;bottom:46%;width:calc(100% - 24px)}.cu-e-cab{width:calc(100% - 24px)}.cu-e-cab h2{font-size:22px}body.cu-modo-estudo .cu-investig{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:44%}}
    .cu-jornada{pointer-events:auto;position:absolute;right:14px;top:14px;bottom:14px;width:min(400px,34%);overflow:auto;display:flex;flex-direction:column;background:rgba(3,8,22,.94);border:1px solid rgba(233,200,120,.55);border-radius:16px;padding:12px 18px 14px;color:#EEF1FA;font:13.5px/1.5 Inter,system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.55)}
    .cu-jornada[hidden]{display:none}
    .cu-j-topo{display:flex;justify-content:space-between;align-items:center;color:rgba(200,212,236,.85)}.cu-j-topo button{border:0;background:none;color:#FFE3A3;font-size:18px;cursor:pointer}
    .cu-j-barra{height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin:6px 0 8px;overflow:hidden}.cu-j-barra span{display:block;height:100%;background:linear-gradient(90deg,#C9A24E,#FFE3A3);transition:width .5s}
    .cu-jornada h3{margin:0 0 6px;font:700 24px "Cormorant Garamond",Georgia,serif;color:#FFE3A3}
    .cu-jornada blockquote{margin:6px 0 10px;font:italic 21px/1.45 "Cormorant Garamond",Georgia,serif;color:#FFF8E6}.cu-jornada cite{display:block;font:600 12px Inter,system-ui,sans-serif;font-style:normal;color:#9FB7E8;margin-top:4px}
    .cu-j-linhas{display:grid;grid-template-columns:1fr;gap:8px}.cu-j-linhas small{color:#9FB7E8;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:10.5px}
    .cu-jornada .cu-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}.cu-jornada .cu-chips button{border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.14);color:#FFE8B0;border-radius:999px;padding:3px 10px;font-size:12.5px;cursor:pointer}
    .cu-jornada.mini>*:not(.cu-j-topo):not(.cu-j-bts):not(.cu-j-barra):not(h3){display:none}.cu-jornada.mini{top:auto;bottom:14px}
    .cu-j-caminho{margin:6px 0 0;color:#FFE3A3;font-size:12.5px}.cu-j-caminho small{color:rgba(220,210,180,.7)}
    .cu-j-pergunta{margin:10px 0 6px;color:#E6ECF8;font-style:italic}
    .cu-j-bts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;position:sticky;bottom:-14px;background:rgba(3,8,22,.97);padding:8px 0 4px;margin-top:4px}.cu-j-bts button{border:1px solid rgba(233,200,120,.5);background:rgba(201,162,78,.16);color:#FFE8B0;border-radius:10px;padding:8px 14px;font:600 13.5px Inter,system-ui,sans-serif;cursor:pointer}.cu-j-bts button:disabled{opacity:.35}.cu-j-bts .cu-j-prox{background:#C9A24E;color:#1B1405;border-color:#E9C878}
    .cu-inv-jornada,.cu-bt-jornada{display:block;width:100%;margin:6px 0 10px;border:1px solid #E9C878!important;background:#C9A24E!important;color:#1B1405!important;border-radius:10px!important;padding:9px 12px!important;font:700 13.5px Inter,system-ui,sans-serif!important;cursor:pointer}
    body.cu-em-jornada .cu-camadas,body.cu-em-jornada .cu-relogio,body.cu-em-jornada .cu-dica,body.cu-em-jornada .cu-terra{display:none!important}
    .cu-j-recolher{border:1px solid rgba(233,200,120,.4)!important;border-radius:999px;font-size:12px!important;padding:2px 9px;margin-right:6px}
    @media (max-width:760px){.cu-jornada{left:8px;right:8px;top:auto;width:auto;bottom:8px;max-height:70%}.cu-j-linhas{grid-template-columns:1fr}.cu-jornada blockquote{font-size:18px}}
    .cu-investig h3{margin:0 0 6px;font:700 24px "Cormorant Garamond",Georgia,serif;color:#FFE3A3}.cu-investig h5{margin:12px 0 5px;font:700 11px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9FB7E8}
    .cu-investig .cu-chips{display:flex;flex-wrap:wrap;gap:5px}.cu-investig .cu-chips button{border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.14);color:#FFE8B0;border-radius:999px;padding:3px 9px;font-size:12px;cursor:pointer}
    .cu-investig .cu-fechar-inv{float:right;border:0;background:none;color:#FFE3A3;font-size:18px;cursor:pointer}
    .cu-inv-barra{display:flex;gap:3px;margin:4px 0 2px}.cu-inv-barra i{flex:1;font-style:normal;text-align:center;font:700 10px Inter,system-ui,sans-serif;padding:4px 0;border-radius:6px;background:rgba(255,255,255,.06);color:rgba(220,226,240,.4);transition:all .4s}
    .cu-inv-barra i.acesa{background:color-mix(in srgb,var(--c) 40%,transparent);color:#fff;box-shadow:0 0 10px var(--c)}.cu-inv-barra i.vazia{background:rgba(255,255,255,.1);color:rgba(220,226,240,.6)}
    .cu-inv-estado{color:rgba(200,212,236,.75)}
    .cu-inv-abas{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.cu-inv-abas button{border:1px solid rgba(233,200,120,.35);background:rgba(201,162,78,.1);color:#FFE8B0;border-radius:999px;padding:3px 9px;font-size:12px;cursor:pointer}.cu-inv-abas button.ativa{background:rgba(201,162,78,.45);color:#fff}
    .cu-inv-item{display:block;width:100%;text-align:left;border:1px solid rgba(233,200,120,.18);background:rgba(255,255,255,.04);color:#F1F4FB;border-radius:10px;padding:6px 9px;margin:4px 0;cursor:pointer;font:13px Inter,system-ui,sans-serif}
    .cu-inv-item:hover{border-color:rgba(233,200,120,.6);background:rgba(201,162,78,.12)}.cu-inv-item small,.cu-inv-fonte small{display:block;color:rgba(200,212,236,.78);margin-top:2px}
    .cu-inv-folha{margin:6px 0 2px}.cu-inv-nada{color:rgba(200,212,236,.55);font-size:12px;margin:2px 0 6px}
    .cu-selo{display:inline-block;font:700 10px Inter,system-ui,sans-serif;border-radius:999px;padding:1px 7px;margin-left:4px;vertical-align:1px}
    .cu-selo-direta,.cu-selo-segura{background:#1F5E3A;color:#C8F2D4}.cu-selo-interpretacao,.cu-selo-provavel{background:#5A4A1C;color:#FFE3A3}.cu-selo-hipotese{background:#4A2E5E;color:#E6CCF5}.cu-selo-incerta{background:#6B2A1F;color:#FFD0C2}.cu-selo-tradicional{background:#2C3F5E;color:#CFE0FF}
    .cu-inv-alerta{background:rgba(107,42,31,.35);border:1px solid rgba(255,180,150,.4);border-radius:10px;padding:6px 9px}
    .cu-inv-fonte{border-left:2px solid rgba(233,200,120,.4);padding:4px 0 4px 9px;margin:6px 0}.cu-inv-fonte blockquote{margin:4px 0;font:italic 13px/1.45 "Cormorant Garamond",Georgia,serif;color:#E9ECF6}.cu-inv-fonte cite{display:block;font:11px Inter,system-ui,sans-serif;color:#9FB7E8;font-style:normal}
    .cu-inv-medidor{height:6px;background:rgba(255,255,255,.1);border-radius:3px;margin:4px 0;overflow:hidden}.cu-inv-medidor span{display:block;height:100%;background:linear-gradient(90deg,#C0563F,#E9C878,#5FB37A)}
    .cu-inv-mini{border:1px solid rgba(140,190,255,.5);background:rgba(60,110,200,.25);color:#E8F1FF;border-radius:999px;padding:2px 9px;font-size:11.5px;cursor:pointer;margin-top:3px}
    .cu-inv-nota{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(233,200,120,.35);border-radius:10px;color:#F1F4FB;padding:8px;font:14px Inter,system-ui,sans-serif;resize:vertical}
    body.cu-com-investig .cu-invest{left:auto;right:262px}
    @media (max-width:1100px){body.cu-com-investig .cu-invest{right:12px;top:96px}body.cu-com-investig .cu-camadas{display:none}body.cu-com-investig .cu-investig{width:min(360px,calc(100% - 80px));max-height:calc(100% - 130px)}}
    @media (max-width:760px){.cu-investig{left:8px;top:auto;bottom:8px;width:calc(100% - 16px);max-height:55%}body.cu-com-investig .cu-invest{left:8px;right:8px;top:52px;width:auto;max-height:40%}}
    .cu-invest .cu-fechar-inv{float:right;border:0;background:none;color:#FFE3A3;font-size:18px;cursor:pointer}
    @media (max-width:1100px){.cu-busca{left:62px;right:262px;width:auto;transform:none}.cu-nivel{top:52px}.cu-invest{top:92px}}
    @media (max-width:760px){.cu-busca{width:calc(100% - 70px);left:auto;right:8px;transform:none}.cu-camadas{top:52px;right:8px}.cu-invest{left:8px;top:52px;width:calc(100% - 16px);max-height:45%}}
    .cu-controles button:hover{background:rgba(24,44,84,.88);border-color:rgba(233,210,150,.6)}
    .cu-mini{pointer-events:auto;position:absolute;left:62px;bottom:40px;width:216px;background:rgba(3,8,22,.78);border:1px solid rgba(233,200,120,.28);border-radius:12px;overflow:visible;backdrop-filter:blur(6px);font:11.5px Inter,system-ui,sans-serif;color:#DDE3F0}
    .ceu .cu-mini canvas{position:static;inset:auto;display:block;width:216px;height:140px;touch-action:auto;cursor:crosshair;border-radius:12px 12px 0 0}
    .cu-mini-pe{display:flex;justify-content:space-between;padding:4px 6px 6px;border-top:1px solid rgba(233,200,120,.15)}
    .cu-mini-pe button{border:1px solid rgba(233,200,120,.3);background:rgba(10,18,40,.7);color:#F2DFAE;border-radius:8px;height:26px;padding:0 9px;font:600 11.5px Inter,system-ui,sans-serif;cursor:pointer}
    .cu-mini-pe button:hover{background:rgba(201,162,78,.22)}
    .cu-mini-teclas{position:absolute;left:0;bottom:calc(100% + 6px);width:216px;box-sizing:border-box;background:rgba(3,8,22,.94);border:1px solid rgba(233,200,120,.3);border-radius:10px;padding:8px 10px;line-height:1.55;color:#E9EDF8}
    .cu-mini-teclas[hidden]{display:none}
    body.ceu-universo.modo-terra .cu-mini,body.cu-em-jornada .cu-mini,body.cu-modo-estudo .cu-mini{display:none!important}
    @media (max-width:1100px),(pointer:coarse){.cu-mini{display:none}}
    .cu-nivel{pointer-events:auto}.cu-nivel button{all:unset;cursor:pointer;color:rgba(242,223,174,.85)}.cu-nivel button:hover{color:#FFF3D0;text-decoration:underline}.cu-nivel i{font-style:normal;opacity:.45;margin:0 7px}.cu-nivel em{font-style:normal;color:rgba(200,210,230,.6);font-size:12px;letter-spacing:.08em;margin-left:10px}
    .cu-nivel{position:absolute;left:14px;top:12px;font-family:"Cormorant Garamond",Georgia,serif;font-size:15px;letter-spacing:.06em;color:rgba(242,223,174,.8);text-transform:uppercase}
    .cu-dica,.cu-dica-toque{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:rgba(220,222,232,.55);font-size:12px;white-space:nowrap;max-width:calc(100% - 90px);overflow:hidden;text-overflow:ellipsis}
    .cu-dica-toque{display:none}
    @media (pointer:coarse){.cu-dica{display:none}.cu-dica-toque{display:block}}
    .cu-credito{position:absolute;bottom:2px;left:10px;color:rgba(200,205,220,.32);font-size:10px}
    .cu-info{position:absolute;max-width:300px;background:rgba(6,11,26,.86);border:1px solid rgba(233,210,150,.3);border-radius:10px;padding:8px 11px;font-size:12.5px;line-height:1.45;backdrop-filter:blur(6px);pointer-events:none}
    .cu-info b{color:#F4E3B5;font-weight:600}.cu-info em{display:block;color:rgba(225,228,240,.8);font-style:normal;margin-top:3px}
    .cu-info small{display:block;color:rgba(180,195,225,.75);margin-top:4px}
    .cu-cartao{pointer-events:auto;position:absolute;left:14px;top:40px;width:min(330px,calc(100% - 80px));background:rgba(251,248,241,.97);color:#1B2333;border-radius:14px;padding:12px 14px;box-shadow:0 14px 36px rgba(0,0,0,.45)}
    .cu-cartao small{color:#5F6672;font-size:12px}.cu-cartao b{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:21px;color:#14284B;line-height:1.2;margin:2px 0}
    .cu-cartao q{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:16px;color:#24406E;margin:6px 0}
    .cu-cartao .cu-bts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .cu-cartao button{border:1px solid #E5DFD2;background:#fff;border-radius:10px;padding:7px 11px;font-size:13px;cursor:pointer;color:#14284B}
    .cu-cartao button.cu-abrir{background:#14284B;color:#fff;border-color:#14284B}
    @media (max-width:760px){.cu-cartao{top:auto;bottom:40px;left:10px;right:58px;width:auto}.cu-controles{bottom:auto;top:40px;left:8px}}
    @media (max-width:1100px){.cu-nivel{top:56px}}`;   // no tablet o nome do nível fica abaixo da busca
  document.head.appendChild(estilo);

  // ── câmera: plano infinito, zoom em direção ao cursor, inclinação opcional ──────────────────
  const cena = new THREE.Scene();
  // ── CAMADAS: folhas transparentes empilhadas (a ordem é a altura). Nova camada = nova entrada aqui. ──────────
  const CAMADAS = [
    { id: 'universo', nome: 'Universo', cor: '#7EA6E6', grupo: new THREE.Group(), visivel: true, opacidade: 1, z: 0, animada: true },
    { id: 'biblia', nome: 'Bíblia', cor: '#F2D28B', grupo: new THREE.Group(), visivel: true, opacidade: 1, z: 0, animada: true },
    { id: 'atlas', nome: 'Atlas', cor: '#E9C878', grupo: new THREE.Group(), visivel: true, opacidade: 0.28, z: 0, propria: true },
  ];
  // camadas 4 a 10: reservadas no motor (nome, cor e altura); o conteúdo de cada uma será construído depois, uma por vez
  [['tempo', 'Tempo · cronologia', '#9FD3C7'], ['personagens', 'Personagens · genealogias', '#E8A87C'], ['linguas', 'Línguas originais', '#B5C7F2'],
   ['historia', 'História e cultura', '#D9B98C'], ['manuscritos', 'Manuscritos · crítica textual', '#C9B6E4'], ['teologia', 'Teologia · doutrinas', '#F2C6A0'],
   ['tradicao', 'Tradição · história da Igreja', '#A9D18E']].forEach(([id, nome, cor]) => CAMADAS.push({ id, nome, cor, grupo: new THREE.Group(), visivel: false, opacidade: 0.8, z: 0, reservada: true }));
  // camadas já construídas: o módulo de cada uma devolve { objetos, quadro, pegar, info, ficha, rotulos, buscar, pos, versos, realcar }
  const MODULOS_CAMADA = {
    tempo: { carregar: () => import('/nexus/camada-tempo.js?v=4').then((m) => m.criarCamadaTempo), visivel: true, opacidade: 0.75 },
    personagens: { carregar: () => import('/nexus/camada-personagens.js?v=5').then((m) => m.criarCamadaPersonagens), visivel: true, opacidade: 0.7 },
    linguas: { carregar: () => import('/nexus/camada-linguas.js?v=3').then((m) => m.criarCamadaLinguas), visivel: true, opacidade: 0.55 },
    tradicao: { carregar: () => import('/nexus/camada-tradicao.js?v=3').then((m) => m.criarCamadaTradicao), visivel: true, opacidade: 0.75 },
    teologia: { carregar: () => import('/nexus/camada-temas.js?v=2').then((m) => (THREE2, ctx) => m.criarCamadaTemas(THREE2, ctx, { id: 'teologia', arquivo: '/nexus/camadas/teologia.json?v=1', rotulo: 'Teologia', forma: 'estrela', cores: ['#FFE3A3', '#F2C6A0', '#B9E0A5', '#E8A0A0', '#B5C7F2'] })), visivel: true, opacidade: 0.75 },
    manuscritos: { carregar: () => import('/nexus/camada-manuscritos.js?v=3').then((m) => m.criarCamadaManuscritos), visivel: true, opacidade: 0.7 },
    historia: { carregar: () => import('/nexus/camada-temas.js?v=2').then((m) => (THREE2, ctx) => m.criarCamadaTemas(THREE2, ctx, { id: 'historia', arquivo: '/nexus/camadas/historia.json?v=1', rotulo: 'História e cultura', forma: 'anel', cores: ['#E6C79C', '#F2D28B', '#C9B27A', '#E9A97A', '#D98C7A', '#A9C98E'] })), visivel: true, opacidade: 0.75 },
  };
  CAMADAS.forEach((c) => { const md = MODULOS_CAMADA[c.id]; if (!md) return;
    // em tablet/celular, só Tempo e Personagens começam ligadas (as outras baixam os dados quando a pessoa liga)
    Object.assign(c, { reservada: false, modulo: true, visivel: false,   // vista limpa: acendem na pesquisa ou pelo painel de camadas
      opacidade: md.opacidade, criada: false,
      criar: async () => { const f = await md.carregar(); c.api = await f(THREE, ctxCamada(c)); return c.api.objetos; } }); });
  function ctxCamada(c) { return { escala, esc, norm: (t) => norm(t), nomeRef: (k) => nomeRef(k), textoDe: (k) => textoDe(k), fraco,
    camadaApi: (id) => { const x = camada(id); return x && x.api; }, nomeLugarPt: (nm) => { const l = atlasC && atlasC.lugares.find((x) => x.en === nm || x.nome === nm); return l ? l.nome : nm; }, lugaresDoVerso: (k) => (atlasC ? (atlasC.porVerso.get(k) || []).map((li) => atlasC.lugares[li].nome) : []),
    tela: (x, y) => tela(x, y, c.z), noPlano: (x, y) => noPlano(x, y, c.z), posVerso: (k) => { const j = vIdx.get(k); return j == null ? null : { x: vBase[j * 3], y: vBase[j * 3 + 1] }; } }; }
  // o item mais próximo do ponteiro entre todas as folhas visíveis (empate: a folha de cima)
  function pegarCamadas(x, y, raio) { let m = null; for (const c of camadasAtivas()) { const i = c.api.pegar(x, y, raio); if (i < 0) continue; const p = c.api.pos(i), q = p && tela(p.x, p.y, c.z); const d = q ? Math.hypot(q.x - x, q.y - y) : raio; if (!m || d < m.d - 0.5) m = { c, i, d }; } return m; }
  const camadasAtivas = () => (modoTerra ? [] : CAMADAS.filter((c) => c.api && c.grupo.visible && c.opacidade > 0.1).reverse());   // de cima para baixo
  // MOTOR DE CAMADAS — feito para 10 ou mais folhas sem pesar:
  //   • registrarCamada({ id, nome, cor, criar(ctx) }) acrescenta uma folha; criar() só roda quando a folha é ligada
  //     pela primeira vez (carga sob demanda) e devolve os objetos que vão no grupo dela;
  //   • folha desligada não é desenhada nem percorrida (custo zero);
  //   • a opacidade só é reaplicada quando muda (exceto nas folhas animadas);
  //   • animação pesada roda na placa de vídeo (shaders), não no processador;
  //   • orçamento de quadro: se o aparelho passar de ~22 ms por quadro, a resolução interna baixa sozinha, e volta
  //     quando sobra folga.
  function registrarCamada(def) {
    const c = { visivel: false, opacidade: 0.8, z: 0, cor: '#C8D2E6', ...def, grupo: new THREE.Group(), criada: !def.criar };
    CAMADAS.push(c); c.grupo.renderOrder = (CAMADAS.length - 1) * 10; cena.add(c.grupo); c.grupo.visible = false;
    if (typeof montarPainel === 'function') montarPainel();
    return c;
  }
  function garantirCriada(c) {   // devolve sempre a mesma promessa (quem espera, espera a carga de verdade)
    if (c.criada) return Promise.resolve(); if (c._prom) return c._prom; c.criando = true;
    c._prom = (async () => { try { const objs = await c.criar({ THREE, secoes, livros, vIdx, vBase }); (Array.isArray(objs) ? objs : [objs]).forEach((o) => o && c.grupo.add(o)); c._sujo = true; }
      catch (e) { console.warn('camada ' + c.id + ' indisponível', e); }
      finally { c.criada = true; c.criando = false; precisaOpac = true; } })();
    return c._prom;
  }
  let precisaOpac = true;
  const camada = (id) => CAMADAS.find((c) => c.id === id);
  CAMADAS.forEach((c, i) => { c.grupo.renderOrder = i * 10; cena.add(c.grupo); });
  const GU = camada('universo').grupo, GB = camada('biblia').grupo, GA = camada('atlas').grupo;
  let separacao = 1, espaco = 0, zB = 0, zA = 0;
  cena.add(new THREE.AmbientLight('#8796bf', 0.65));
  const luzSol = new THREE.DirectionalLight('#FFE7B8', 1.7); luzSol.position.set(-0.4, 0.6, 1); cena.add(luzSol);
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 200000);
  const alvo = new THREE.Vector3(0, 0, 0);
  let dist = 22000, incl = 0.62;                     // inclinação (botão direito) em radianos
  let voo = null, inercia = new THREE.Vector2();
  const historico = [];
  function posicionar() {
    dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
    incl = Math.max(0, Math.min(1.15, incl));
    camera.position.set(alvo.x, alvo.y - Math.sin(incl) * dist, alvo.z + Math.cos(incl) * dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(alvo);
    camera.near = Math.max(0.5, dist * 0.01); camera.far = dist * 20 + 40000;
    camera.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
  function noPlano(x, y, z = zB) { plano.constant = -z; ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plano, p) ? p : null; }
  function zoomEm(x, y, fator) {
    inercia.set(0, 0);
    // cursor sobre o globo: aproxima em direção ao ponto da Terra sob o cursor (ele fica parado na tela)
    if (typeof raioNoGlobo === 'function' && atlasC && !modoTerra) { const hit = raioNoGlobo(x, y); if (hit) {
      // a câmera anda em linha reta na direção do ponto (mesma orientação): o ponto fica cravado sob o cursor
      const camPos = camera.position.clone(), novoPos = hit.clone().add(camPos.sub(hit).multiplyScalar(fator));
      const ci = Math.cos(incl), d2 = (novoPos.z - zB) / Math.max(ci, 0.05);
      if (d2 >= DIST_MIN && d2 <= DIST_MAX) { dist = d2; alvo.x = novoPos.x; alvo.y = novoPos.y + Math.sin(incl) * dist; posicionar(); return; }
      // fora do limite: segue o zoom normal abaixo (antes o zoom travava aqui quando os dedos estavam sobre o globo)
    } }
    const antes = noPlano(x, y);
    dist *= fator; posicionar();
    const depois = noPlano(x, y);
    if (antes && depois) { alvo.x += antes.x - depois.x; alvo.y += antes.y - depois.y; posicionar(); }
  }
  function lembrarVista() { historico.push({ x: alvo.x, y: alvo.y, d: dist, i: incl }); if (historico.length > 30) historico.shift(); }
  function voar(x, y, d, guardar = true) {
    if (guardar) lembrarVista();
    inercia.set(0, 0);
    voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x, y, d: Math.max(DIST_MIN, Math.min(DIST_MAX, d)) }, t0: performance.now(), dur: 1100 };
  }

  // ── o endereço de cada versículo ─────────────────────────────────────────────
  let BIB = null;                       // [{abbrev,name,chapters}]
  let vSec = null, vPos = null, vCor = null, vTam = null, vBri = null, vIdx = new Map(), vChave = [];
  let livros = [], secoes = [];
  function montarUniverso(bib) {
    BIB = bib;
    const versos = bib.map((l) => l.chapters.reduce((s, c) => s + c.length, 0));
    // seções ao longo de um grande arco (AT à esquerda, NT à direita), com espaço escuro entre elas
    let acum = 0; const totalSec = SECOES.map((s) => { let n = 0; for (let i = s.de; i <= s.ate; i++) n += versos[i]; return n; });
    const larguras = totalSec.map((n) => 900 + Math.sqrt(n) * 26);
    const totalL = larguras.reduce((a, b) => a + b, 0) + (SECOES.length - 1) * 1500;
    let x = -totalL / 2;
    secoes = SECOES.map((s, i) => {
      const w = larguras[i]; const cx = x + w / 2; x += w + 1500;
      const cy = Math.sin((cx / totalL) * Math.PI * 1.6) * 3600 + (i % 2 ? 900 : -700);
      return { ...s, cx, cy, raio: w / 2, versos: totalSec[i], cor3: new THREE.Color(s.cor) };
    });
    // livros: galáxias dentro da seção (filotaxia)
    livros = [];
    secoes.forEach((s) => {
      const n = s.ate - s.de + 1;
      for (let i = s.de; i <= s.ate; i++) {
        const k = i - s.de;
        const ang = k * 2.39996 + hash(bib[i].abbrev) * 0.6, rr = n === 1 ? 0 : s.raio * 0.78 * Math.sqrt((k + 0.6) / n);
        const rb = 60 + Math.sqrt(versos[i]) * 7.5;
        livros.push({ i, num: i + 1, nome: bib[i].name, abbrev: bib[i].abbrev, sec: s, cx: s.cx + Math.cos(ang) * rr, cy: s.cy + Math.sin(ang) * rr * 0.72, raio: rb, versos: versos[i], caps: bib[i].chapters.length, rotacao: hash(bib[i].name) * Math.PI * 2 });
      }
    });
    // versículos: espiral de dois braços por livro (capítulos ao longo dos braços)
    const total = versos.reduce((a, b) => a + b, 0);
    vPos = new Float32Array(total * 3); vCor = new Float32Array(total * 3); vTam = new Float32Array(total); vBri = new Float32Array(total); vSec = new Float32Array(total);
    let j = 0;
    const branco = new THREE.Color('#FFFFFF');
    livros.forEach((lv) => {
      const caps = bib[lv.i].chapters, nc = caps.length;
      lv.capPos = [];
      caps.forEach((vs, ci) => {
        const t = nc === 1 ? 0.5 : ci / (nc - 1);
        const braco = ci % 2, ang = lv.rotacao + t * Math.PI * 2.6 + braco * Math.PI;
        const r = lv.raio * (0.12 + 0.88 * t);
        const pcx = lv.cx + Math.cos(ang) * r, pcy = lv.cy + Math.sin(ang) * r;
        const espalho = 5 + Math.sqrt(vs.length) * 2.2;
        lv.capPos.push({ x: pcx, y: pcy, c: ci + 1, n: vs.length });
        vs.forEach((_, vi) => {
          const a2 = vi * 2.39996 + hash(lv.abbrev + ci) * 6.28, r2 = espalho * Math.sqrt((vi + 0.5) / vs.length);
          vPos[j * 3] = pcx + Math.cos(a2) * r2; vPos[j * 3 + 1] = pcy + Math.sin(a2) * r2; vPos[j * 3 + 2] = 0;
          const c = lv.sec.cor3.clone().lerp(branco, 0.35 + hash(j) * 0.4);
          vCor[j * 3] = c.r; vCor[j * 3 + 1] = c.g; vCor[j * 3 + 2] = c.b;
          vTam[j] = 1.4 + hash(j * 7) * 1.4; vBri[j] = 0.55 + hash(j * 3) * 0.35; vSec[j] = secoes.indexOf(lv.sec);
          const k = chave(lv.num, ci + 1, vi + 1);
          vIdx.set(k, j); vChave.push(k);
          j++;
        });
      });
    });
    gVers.setAttribute('position', new THREE.BufferAttribute(vPos, 3).setUsage(THREE.DynamicDrawUsage));
    gVers.setAttribute('color', new THREE.BufferAttribute(vCor, 3));
    gVers.setAttribute('tam', new THREE.BufferAttribute(vTam, 1));
    gVers.setAttribute('brilho', new THREE.BufferAttribute(vBri, 1).setUsage(THREE.DynamicDrawUsage));
    gVers.setAttribute('sec', new THREE.BufferAttribute(vSec, 1));
    vBase = vPos.slice(); vBriBase = vBri.slice();
    // galáxias (brilho de cada livro) e nebulosas das seções — decorativas, sobre posições reais
    livros.forEach((lv) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGalaxia, color: lv.sec.cor3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
      sp.position.set(lv.cx, lv.cy, -2); sp.scale.set(lv.raio * 2.9, lv.raio * 2.9, 1); sp.material.rotation = lv.rotacao;
      galaxias.add(sp); lv.sprite = sp;
    });
    secoes.forEach((s, i) => {
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebulosa[k % texNebulosa.length], color: s.cor3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.16 }));
        const a = hash(s.nome + k) * 6.28, r = s.raio * 0.55 * hash(s.nome + 'r' + k);
        sp.position.set(s.cx + Math.cos(a) * r, s.cy + Math.sin(a) * r * 0.7, -40); const t = s.raio * (1.5 + hash(s.nome + 't' + k));
        sp.scale.set(t, t, 1); sp.material.rotation = a; sp.userData.secao = i; nebulosas.add(sp);
      }
    });
    precisaOpac = true;
    montarAtlas();
    pronto = true;
    setTimeout(() => CAMADAS.forEach((c) => { if (c.modulo && (c.visivel || !fraco)) garantirCriada(c); }), 1500);
    restaurarVista();
  }

  // ── texturas procedurais ──────────────────────────────────────────────────────
  function textura(desenho, n = 256) { const c = document.createElement('canvas'); c.width = c.height = n; desenho(c.getContext('2d'), n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const texGalaxia = textura((g, n) => {
    const h = n / 2;
    let gr = g.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.12, 'rgba(255,255,255,.22)'); gr.addColorStop(0.5, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 900; k++) { const t = Math.random(), braco = k % 2, a = t * Math.PI * 2.6 + braco * Math.PI, r = h * (0.08 + 0.8 * t) + (Math.random() - 0.5) * 14; g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`; g.beginPath(); g.arc(h + Math.cos(a) * r, h + Math.sin(a) * r * 0.82, 1 + Math.random() * 3.2, 0, 6.29); g.fill(); }
  });
  const texNebulosa = [0, 1, 2].map((s) => textura((g, n) => {
    const h = n / 2;
    for (let k = 0; k < 14; k++) { const x = h + (Math.random() - 0.5) * n * 0.5, y = h + (Math.random() - 0.5) * n * 0.5, r = n * (0.08 + Math.random() * 0.2); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
  }));
  const texPonto = textura((g, n) => { const h = n / 2; const gr = g.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, 64);

  // ── camadas de fundo infinitas (paralaxe) ──────────────────────────────────────
  const fundoCamadas = [];
  [[fraco ? 3500 : 8000, 0.35, 14000, -1200], [fraco ? 2200 : 5000, 0.6, 9000, -400], [fraco ? 900 : 2000, 0.85, 6000, -120]].forEach(([n, fator, T, z], ci) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), t = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = Math.random() * T; p[i * 3 + 1] = Math.random() * T; p[i * 3 + 2] = z;
      const azul = Math.random() < 0.6, br = 0.25 + Math.pow(Math.random(), 3) * 0.75;
      c[i * 3] = (azul ? 0.78 : 1) * br; c[i * 3 + 1] = (azul ? 0.86 : 0.93) * br; c[i * 3 + 2] = (azul ? 1 : 0.8) * br;
      t[i] = (0.6 + Math.pow(Math.random(), 5) * 2.4) * (ci === 2 ? 1.3 : 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('tam', new THREE.BufferAttribute(t, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { cam: { value: new THREE.Vector2() }, T: { value: T }, fator: { value: fator }, px: { value: escala }, tempo: { value: 0 }, deriva: { value: new THREE.Vector2(ci === 2 ? 9 : 3 + ci * 2, ci === 2 ? -4 : -1.2) } },
      vertexShader: `attribute float tam; uniform vec2 cam; uniform float T; uniform float fator; uniform float px; uniform float tempo; uniform vec2 deriva; varying vec3 c; varying float tw;
        void main(){ c = color; vec3 q = position; vec2 o = cam * fator - deriva * tempo; q.xy = cam + mod(q.xy - o, T) - T * 0.5;
          float fase = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
          float vel = 0.6 + fract(fase * 7.13) * 2.2;
          tw = 0.55 + 0.45 * sin(tempo * vel + fase) * sin(tempo * vel * 0.37 + fase * 1.7);
          gl_PointSize = tam * px * (0.85 + 0.3 * tw); gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0); }`,
      fragmentShader: 'uniform float opac; varying vec3 c; varying float tw; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * (0.45 + 0.55 * tw); gl_FragColor = opac * vec4(c * a, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; fundoCamadas.push(m);   // céu desenhado: substituído pelo céu real
  });
  const nebulosas = new THREE.Group(), galaxias = new THREE.Group(), viaLactea = new THREE.Group(); GU.add(nebulosas); GB.add(galaxias);

  // ── O CÉU REAL E AO VIVO (fundo da camada Universo): módulo ceu-real.js, numa cena própria desenhada antes ───
  let ceuR = null;
  import('/nexus/ceu-real.js?v=7').then((m) => { ceuR = m.criarCeuReal(THREE, { escala }); atualizarRelogio(); }).catch((e) => console.warn('céu real indisponível', e));
  renderer.autoClear = false;
  // estrela cadente (decorativa): um risco de luz de vez em quando
  const gCad = new THREE.BufferGeometry();
  gCad.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
  gCad.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array([0, 0]), 1).setUsage(THREE.DynamicDrawUsage));
  const cadente = new THREE.LineSegments(gCad, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; varying float a; void main(){ a = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; void main(){ gl_FragColor = opac * vec4(vec3(1.0, 0.96, 0.85) * a, a); }' }));
  cadente.frustumCulled = false; GU.add(cadente);
  let cad = null, proxCad = performance.now() + 4000;
  function montarViaLactea() {
    const x0 = Math.min(...secoes.map((q) => q.cx)) - 9000, x1 = Math.max(...secoes.map((q) => q.cx)) + 9000;
    const y0 = Math.min(...secoes.map((q) => q.cy)) - 9000, y1 = Math.max(...secoes.map((q) => q.cy)) + 9000;
    const ax = x0, ay = y1, bx = x1, by = y0, comp = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    const n = fraco ? 9000 : 22000, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = Math.random(), g = (Math.random() + Math.random() + Math.random() - 1.5) * 2600 * (0.6 + 0.4 * Math.sin(t * 9));
      const x = ax + (bx - ax) * t - Math.sin(ang) * g, y = ay + (by - ay) * t + Math.cos(ang) * g;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = -260;
      const quente = Math.random() < 0.35, br = 0.12 + Math.pow(Math.random(), 3) * 0.5;
      cor[i * 3] = (quente ? 1 : 0.82) * br; cor[i * 3 + 1] = (quente ? 0.9 : 0.88) * br; cor[i * 3 + 2] = (quente ? 0.75 : 1) * br;
      tam[i] = 0.7 + Math.pow(Math.random(), 6) * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { px: { value: escala }, tempo: { value: 0 } },
      vertexShader: 'attribute float tam; uniform float px; uniform float tempo; varying vec3 c; varying float tw; void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(7.13, 3.71))) * 9137.5) * 6.28; tw = 0.6 + 0.4 * sin(tempo * (1.0 + fract(f) * 2.0) + f); gl_PointSize = tam * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float opac; varying vec3 c; varying float tw; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * tw; gl_FragColor = opac * vec4(c * a, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; viaLactea.add(pts); matVia = m;
    for (let k = 0; k < 16; k++) {   // a névoa clara da faixa
      const t = (k + 0.5) / 16, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebulosa[k % 3], color: k % 3 ? '#BFD0F5' : '#F2E2C2', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
      sp.position.set(ax + (bx - ax) * t, ay + (by - ay) * t, -300); sp.scale.set(comp / 7, comp / 18, 1); sp.material.rotation = ang + (hash('v' + k) - 0.5) * 0.3; viaLactea.add(sp);
    }
  }
  let matVia = null;

  // ── versículos (as estrelas reais) ─────────────────────────────────────────────
  const gVers = new THREE.BufferGeometry();
  let vBase = null, vBriBase = null;
  const matVers = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: escala }, k: { value: 1 }, tempo: { value: 0 }, revela: { value: new Array(10).fill(0) }, longeR: { value: 1 } },
    vertexShader: `attribute float tam; attribute float brilho; attribute float sec; uniform float px; uniform float k; uniform float tempo; uniform float revela[10]; uniform float longeR; varying vec3 c; varying float b;
      void main(){ c = color; float rv = 1.0; for (int i = 0; i < 10; i++) { if (float(i) == sec) rv = revela[i]; }
        float fase = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float tw = 0.8 + 0.2 * sin(tempo * (0.8 + fract(fase * 3.7) * 2.4) + fase);
        b = brilho * (brilho > 1.1 ? 1.0 : tw) * mix(1.0, rv, brilho > 1.1 ? 0.0 : longeR);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * k * 900.0 / -mv.z; gl_PointSize = clamp(s, 0.9, 26.0) * px * (0.65 + 0.35 * b); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float opac; varying vec3 c; varying float b; void main(){ float d = length(gl_PointCoord - 0.5); float nucleo = smoothstep(0.18, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.5; float a = (nucleo + halo) * b; gl_FragColor = opac * vec4(c * a + vec3(nucleo * b * 0.35), a); }' });
  const versos = new THREE.Points(gVers, matVers); versos.frustumCulled = false; GB.add(versos);

  // ── constelação: linhas que acendem em sequência + partículas correndo por elas ─────────────
  const MAX_LIN = 64;
  const gLin = new THREE.BufferGeometry();
  gLin.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 2), 1).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('cor', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const linhas = new THREE.LineSegments(gLin, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; attribute vec3 cor; varying float a; varying vec3 c; void main(){ a = alfa; c = cor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; varying vec3 c; void main(){ gl_FragColor = opac * vec4(c * a, a); }' }));
  linhas.frustumCulled = false; GB.add(linhas);
  const MAX_PART = fraco ? 160 : 420;
  const gPart = new THREE.BufferGeometry();
  gPart.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PART * 3), 3).setUsage(THREE.DynamicDrawUsage));
  gPart.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_PART), 1).setUsage(THREE.DynamicDrawUsage));
  const particulas = new THREE.Points(gPart, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying float a; void main(){ a = alfa; gl_PointSize = 3.2 * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.0, d); gl_FragColor = opac * vec4(vec3(1.0, 0.9, 0.65) * k * a, k * a); }' }));
  particulas.frustumCulled = false; GB.add(particulas);
  // satélites: elementos do NEXUS (obras, autores, conceitos, termos) em volta das passagens abertas
  const gSat = new THREE.BufferGeometry();
  const satelites = new THREE.Points(gSat, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying vec3 c; varying float a; void main(){ c = color; a = alfa; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(5200.0 / -mv.z, 3.0, 22.0) * px; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float opac; varying vec3 c; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float anel = smoothstep(0.5, 0.36, d) * smoothstep(0.2, 0.3, d); float nucleo = smoothstep(0.22, 0.0, d); gl_FragColor = opac * vec4(c * (anel + nucleo) * a, (anel + nucleo) * a); }' }));
  satelites.frustumCulled = false; GB.add(satelites);

  let constel = null;      // { origem, idx, alvos:[{idx, k, peso}], t0, soltoEm }
  const cacheRefs = new Map();
  async function refsDe(k) {
    if (cacheRefs.has(k)) return cacheRefs.get(k);
    const p = (async () => {
      try {   // público: referências cruzadas do OpenBible (sem crachá, rápido)
        const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'expandir', id: 'p:' + k + '-' + k }) });
        const j = await r.json();
        if (!j.ok) return [];
        const vistos = new Set(), out = [];
        for (const a of j.arestas || []) {
          if (a.tipo !== 'refcruz') continue;
          const outro = a.de === 'p:' + k + '-' + k ? a.para : a.de, q = lerId(outro);
          if (!q || vistos.has(q.ini)) continue; vistos.add(q.ini);
          out.push({ k: q.ini, fim: q.fim, peso: a.peso || 1, estado: a.estado || 'interpretacao' });
        }
        return out.sort((a, b) => b.peso - a.peso).slice(0, 28);
      } catch (_) { return []; }
    })();
    cacheRefs.set(k, p);
    return p;
  }
  async function formar(k) {
    if (constel && constel.origem === k && !constel.soltoEm) return;
    const idx = vIdx.get(k); if (idx == null) return;
    const marca = Symbol();
    constel = { origem: k, idx, alvos: [], t0: performance.now(), marca, soltoEm: 0 };
    const refs = await refsDe(k);
    if (!constel || constel.marca !== marca) return;
    const agora = performance.now();
    constel.alvos = refs.map((r, i) => ({ idx: vIdx.get(r.k), k: r.k, peso: r.peso, inicio: agora + i * 75 })).filter((a) => a.idx != null).slice(0, MAX_LIN);
    // satélites do NEXUS ligados a esta passagem também entram na constelação
    mostrarInfo();
    lugaresDoVerso(k);
  }
  function soltar() { if (constel && !constel.soltoEm) constel.soltoEm = performance.now(); }

  // ── satélites a partir do grafo do NEXUS ───────────────────────────────────────
  let sats = [], assinatura = '';
  function montarSatelites() {
    const g = estado.graph; sats = [];
    const ancora = new Map();
    g.forEachNode((id, a) => {
      if (a.tipo === 'passagem' || a.tipo === 'mais' || String(id).startsWith('x:') && !g.hasNode(id)) return;
      let melhor = null, grauM = -1;
      g.forEachNeighbor(id, (v, av) => { const q = lerId(v); if (q && vIdx.has(q.ini) && g.degree(v) > grauM) { grauM = g.degree(v); melhor = q.ini; } });
      if (melhor == null) return;
      const lista = ancora.get(melhor) || []; lista.push(id); ancora.set(melhor, lista);
    });
    for (const [k, ids] of ancora) {
      const j = vIdx.get(k), bx = vBase[j * 3], by = vBase[j * 3 + 1];
      ids.forEach((id, i) => {
        const anel = Math.floor(i / 10), a = (i % 10) / 10 * Math.PI * 2 + anel * 0.5 + hash(id) * 0.2, r = 26 + anel * 20;
        const tipo = g.getNodeAttribute(id, 'tipo');
        sats.push({ id, k, x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, tipo, rotulo: g.getNodeAttribute(id, 'label') || id, cor: new THREE.Color(COR_TIPO[tipo] || '#DDE3EE') });
      });
    }
    gSat.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sats.flatMap((s) => [s.x, s.y, 1])), 3));
    gSat.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sats.flatMap((s) => [s.cor.r, s.cor.g, s.cor.b])), 3));
    gSat.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(sats.length), 1).setUsage(THREE.DynamicDrawUsage));
  }

  // ── REVELAÇÃO DAS REGIÕES: de longe só o nome da região; ao passar o mouse (ou tocar) no nome, os livros surgem ──
  const revela = new Array(10).fill(0); let secRevelada = null, revelaAte = 0, caixasRegiao = [];
  const longeR = () => Math.max(0, Math.min(1, (dist - 6000) / 3000));   // 0 perto (tudo aparece) … 1 longe (só o revelado)
  function revelar(i, ms = 1600) { if (i == null || i < 0) return; secRevelada = i; revelaAte = performance.now() + ms; }
  function regiaoNoPonto(x, y) {
    // região já revelada: o cursor em qualquer ponto dela mantém os livros à vista
    if (secRevelada != null) { const c = caixasRegiao.find((b) => b.i === secRevelada); const s2 = secoes[secRevelada]; if (c && s2) { const borda = tela(s2.cx + s2.raio * 1.15, s2.cy, zB); const r = borda ? Math.hypot(borda.x - c.cx, borda.y - c.cy) : 120; if (Math.hypot(x - c.cx, y - c.cy) < Math.max(r, 90)) return secRevelada; } }
    const cs = caixasRegiao.filter((b) => x >= b.x0 - 4 && x <= b.x1 + 4 && y >= b.y0 - 4 && y <= b.y1 + 4).sort((a, b) => Math.hypot(x - a.cx, y - a.cy) - Math.hypot(x - b.cx, y - b.cy)); return cs.length ? cs[0].i : -1;
  }
  const livroOculto = (lv) => lv && longeR() > 0.5 && revela[secoes.indexOf(lv.sec)] < 0.3;

  // ── projeção, escolha e informação ───────────────────────────────────────────
  let W = 1, H = 1;
  const tmp = new THREE.Vector3();
  function tela(x, y, z = zB) { tmp.set(x, y, z).project(camera); if (tmp.z > 1 || tmp.z < -1) return null; return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
  function versoPerto(px, py, raio) {
    if (!pronto) return -1;
    const w = noPlano(px, py); if (!w) return -1;
    const mundoPx = dist * Math.tan(camera.fov * Math.PI / 360) * 2 / H;   // unidades por pixel
    const r = raio * mundoPx;
    // só os livros próximos ao ponto (rápido)
    let melhor = -1, dm = Infinity;
    for (const lv of livros) {
      if (Math.hypot(lv.cx - w.x, lv.cy - w.y) > lv.raio * 1.2 + r) continue;
      const inicio = vIdx.get(chave(lv.num, 1, 1)), fimI = inicio + lv.versos;
      for (let j = inicio; j < fimI; j++) { const d = (vPos[j * 3] - w.x) ** 2 + (vPos[j * 3 + 1] - w.y) ** 2; if (d < dm) { dm = d; melhor = j; } }
    }
    return dm <= r * r ? melhor : -1;
  }
  function livroPerto(px, py) { const w = noPlano(px, py); if (!w) return null; let m = null, dm = Infinity; for (const lv of livros) { const d = Math.hypot(lv.cx - w.x, lv.cy - w.y); if (d < lv.raio * 1.15 && d < dm) { dm = d; m = lv; } } return m; }
  function satPerto(px, py, raio) { let m = -1, dm = raio * raio; sats.forEach((s, i) => { const p = tela(s.x, s.y, zB + 1); if (!p) return; const d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < dm) { dm = d; m = i; } }); return m; }
  const nomeRef = (k) => { const d = decompor(k); return BIB ? `${BIB[d.b - 1].name} ${d.c}:${d.v}` : String(k); };
  const textoDe = (k) => { const d = decompor(k); try { return BIB[d.b - 1].chapters[d.c - 1][d.v - 1] || ''; } catch (_) { return ''; } };
  const info = ui.querySelector('.cu-info');
  let mouse = { x: -1, y: -1 }, sobreLivro = null;
  function mostrarInfo() {
    if (foraDoCanvas) { info.hidden = true; return; }
    if (constel && !constel.soltoEm) {
      const k = constel.origem, t = textoDe(k);
      info.innerHTML = `<b>${esc(nomeRef(k))}</b><em>“${esc(t.length > 140 ? t.slice(0, 138) + '…' : t)}”</em><small>${constel.alvos.length ? constel.alvos.length + ' referência(s) cruzada(s) acesas · OpenBible (interpretação)' : 'buscando ligações…'} · clique para investigar</small>`;
    } else if (sobreLivro) {
      info.innerHTML = `<b>${esc(sobreLivro.nome)}</b><em>${sobreLivro.caps} capítulo(s) · ${sobreLivro.versos} versículos</em><small>${esc(sobreLivro.sec.nome)} · clique para entrar na galáxia</small>`;
    } else { info.hidden = true; return; }
    info.hidden = false;
    const x = Math.min(W - 310, mouse.x + 16), y = Math.min(H - 90, mouse.y + 14);
    info.style.left = Math.max(8, x) + 'px'; info.style.top = Math.max(8, y) + 'px';
  }
  // cartão de seleção (o painel completo é o do NEXUS)
  const cartao = ui.querySelector('.cu-cartao');
  let selecionado = null;
  function abrirCartao(k) {
    selecionado = k;
    const t = textoDe(k), d = decompor(k);
    cartao.innerHTML = `<small>Passagem · ${esc(livros[d.b - 1].sec.nome)}</small><b>${esc(nomeRef(k))}</b><q>${esc(t)}</q>
      <div class="cu-bts"><button class="cu-abrir" type="button">Abrir investigação</button><button class="cu-camadas-v" type="button">✦ Nas 10 camadas</button><button class="cu-aprox" type="button">Aproximar</button><button class="cu-fechar" type="button">Fechar</button></div>`;
    cartao.hidden = false;
    cartao.querySelector('.cu-abrir').onclick = () => investigar(k);
    cartao.querySelector('.cu-camadas-v').onclick = () => fichaVerso(k);
    cartao.querySelector('.cu-aprox').onclick = () => { const j = vIdx.get(k); voar(vBase[j * 3], vBase[j * 3 + 1], 160); };
    cartao.querySelector('.cu-fechar').onclick = () => { cartao.hidden = true; selecionado = null; soltar(); };
  }
  async function investigar(k) {
    const id = 'p:' + k + '-' + k;
    if (!estado.graph.hasNode(id) || !(estado.expandidos && estado.expandidos.has(id))) await acoes.expandir(id);
    if (estado.graph.hasNode(id)) acoes.selecionar(id, false, true);
    cartao.hidden = true;
  }

  // ── entrada: mouse, roda, toque ──────────────────────────────────────────────
  const ponteiros = new Map();
  let interagiu = false;
  let arrasto = null, pinca = null, moveu = false, toqueLongo = 0, ultimoToque = 0, botaoDireito = false;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    voo = null; inercia.set(0, 0); moveu = false; botaoDireito = e.button === 2; interagiu = true;
    if (ponteiros.size === 1) {
      arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      if (modoTerra) { posicionarTerra(); const pt = raioNoGlobo(e.offsetX, e.offsetY); modoTerra.agarrado = pt ? atlasC.latLonDe(pt) : null; modoTerra.vel = { lat: 0, lon: 0 }; modoTerra.ancora = null; modoTerra.cursor = null; modoTerra.ancoraPinca = false; }
      if (e.pointerType === 'touch') { clearTimeout(toqueLongo); toqueLongo = setTimeout(() => { if (!moveu) { const j = versoPerto(e.offsetX, e.offsetY, 26); if (j >= 0) { formar(vChave[j]); investigar(vChave[j]); } } }, 600); }
    }
    if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), dist, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; arrasto = null; clearTimeout(toqueLongo); }
    canvas.classList.add('arrastando');
  });
  canvas.addEventListener('pointermove', (e) => {
    mouse = { x: e.offsetX, y: e.offsetY };
    if (ponteiros.has(e.pointerId)) ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinca && ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const alvoD = pinca.dist * pinca.d / Math.max(10, d);
      if (pincaTerra(alvoD / (pinca.ultimo || pinca.dist))) { pinca.ultimo = alvoD; moveu = true; return; }
      zoomEm(pinca.cx, pinca.cy, alvoD / dist); moveu = true; return;
    }
    if (arrasto) {
      const dx = e.offsetX - arrasto.x, dy = e.offsetY - arrasto.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moveu = true; clearTimeout(toqueLongo); }
      if (modoTerra) { arrastarTerra(e.offsetX, e.offsetY); arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() }; return; }
      if (botaoDireito) { incl += dy * 0.004; posicionar(); }
      else {
        const a0 = noPlano(arrasto.x, arrasto.y), a1 = noPlano(e.offsetX, e.offsetY);
        if (a0 && a1) { alvo.x -= a1.x - a0.x; alvo.y -= a1.y - a0.y; posicionar(); const dt = Math.max(8, performance.now() - arrasto.t); inercia.set(-(a1.x - a0.x) / dt * 16, -(a1.y - a0.y) / dt * 16); }
      }
      arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      return;
    }
    if (e.pointerType === 'mouse') pairar(e.offsetX, e.offsetY);
  });
  let pairarT = 0;
  function pairar(x, y) {
    clearTimeout(pairarT);
    pairarT = setTimeout(() => {
      { const pc = pegarCamadas(x, y, 11); if (pc) { const { c, i } = pc; canvas.style.cursor = 'pointer'; info.innerHTML = c.api.info(i); info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; if (!fichaCamada) ligarCamada(c, i, false); return; } }
      if (pairCamada && !fichaCamada) limparCamada(); pairCamada = null;
      const li = lugarPerto(x, y, 10);
      if (li >= 0) { const l = atlasC.lugares[li]; const conf = l.conf >= 700 ? 'identificação segura' : l.conf >= 300 ? 'identificação provável' : 'identificação incerta'; canvas.style.cursor = 'pointer'; info.innerHTML = `<b>${esc(l.nome)}</b>${l.identificacao && l.identificacao !== l.nome ? `<em>hoje: ${esc(l.identificacao)}</em>` : ''}<small>Atlas · ${l.peso} versículo(s) · ${conf} (${l.conf}/1000) · OpenBible.info${l.nomeOrigem ? ` · nome como está na Almeida (fonte: ${esc(l.en)})` : ''} · clique para acender os versículos</small>`; info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; if (!lugarAtivo && livroAtivo == null) { atlasC.acender([li]); fios = l.versos.slice(0, 80).map((k) => ({ l: li, j: vIdx.get(k) })).filter((f) => f.j != null); } return; }
      const bV = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;   // só pega o que está visível
      const s = bV && dist < 1800 ? satPerto(x, y, 12) : -1;
      if (s >= 0) { canvas.style.cursor = 'pointer'; info.innerHTML = `<b>${esc(sats[s].rotulo)}</b><small>${esc(NOME_TIPO[sats[s].tipo] || sats[s].tipo)} · ligado a ${esc(nomeRef(sats[s].k))} · clique para ver as evidências</small>`; info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; return; }
      const j = bV && dist < 5200 ? versoPerto(x, y, 12) : -1;
      if (j >= 0) { sobreLivro = null; formar(vChave[j]); canvas.style.cursor = 'pointer'; mostrarInfo(); return; }
      if (constel && !constel.soltoEm) soltar();
      const riH = regiaoNoPonto(x, y);
      if (riH >= 0) { revelar(riH, 2200); canvas.style.cursor = 'pointer'; sobreLivro = null; info.hidden = true; return; }
      let lv = bV && dist >= 1200 ? livroPerto(x, y) : null;
      if (livroOculto(lv)) lv = null; else if (lv && longeR() > 0.5) revelar(secoes.indexOf(lv.sec), 1500);
      sobreLivro = lv; canvas.style.cursor = lv ? 'pointer' : '';
      mostrarInfo();
    }, 40);
  }
  const fim = (e) => {
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) pinca = null;
    if (ponteiros.size === 0) {
      canvas.classList.remove('arrastando'); clearTimeout(toqueLongo);
      if (!moveu && !botaoDireito) clique(e.offsetX, e.offsetY, e.pointerType);
      arrasto = null;
    }
  };
  canvas.addEventListener('pointerup', fim);
  canvas.addEventListener('pointercancel', fim);
  let foraDoCanvas = false;   // o cursor saiu do universo: nenhuma dica fica presa na tela
  canvas.addEventListener('pointerleave', () => { foraDoCanvas = true; clearTimeout(pairarT); info.hidden = true; if (!ponteiros.size) { soltar(); sobreLivro = null; } });
  canvas.addEventListener('pointerenter', () => { foraDoCanvas = false; });
  let cartaoT = 0;   // no toque, o cartão espera um instante (um segundo toque vira zoom)
  function clique(x, y, tipo) {
    const agora = performance.now(), duplo = agora - ultimoToque < 320; ultimoToque = agora;
    if (duplo && modoTerra) { posicionarTerra(); modoTerra.ancora = latLonNaTela(x, y); modoTerra.cursor = { x, y }; modoTerra.altAlvo = modoTerra.altAlvo * 0.35; return; }
    if (duplo) { clearTimeout(cartaoT); const w = noPlano(x, y); if (w) { lembrarVista(); voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: w.x, y: w.y, d: Math.max(DIST_MIN, dist * 0.35) }, t0: agora, dur: 700 }; } return; }
    { const pc = pegarCamadas(x, y, tipo === 'touch' ? 22 : 12); if (pc) { abrirFichaCamada(pc.c, pc.i); return; } }
    const li = lugarPerto(x, y, tipo === 'touch' ? 20 : 11);
    if (li >= 0) { escolherLugar(atlasC.lugares[li], !modoTerra); return; }
    if (modoTerra) return;
    if (atlasC && camada('atlas').visivel && camada('atlas').opacidade > 0.2) { const pt = raioNoGlobo(x, y); if (pt) { entrarTerra(pt); modoTerra.alt = Math.min(modoTerra.alt, RAIO_GLOBO * 1.2); return; } }
    const bV = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;
    const s = bV && dist < 1800 ? satPerto(x, y, tipo === 'touch' ? 22 : 12) : -1;
    if (s >= 0) { acoes.selecionar(sats[s].id, false, true); return; }
    const j = bV && dist < 5200 ? versoPerto(x, y, tipo === 'touch' ? 24 : 12) : -1;
    if (j >= 0) { formar(vChave[j]); clearTimeout(cartaoT); const kk = vChave[j]; if (tipo === 'touch') cartaoT = setTimeout(() => abrirCartao(kk), 330); else abrirCartao(kk); return; }
    const riC = regiaoNoPonto(x, y);
    if (riC >= 0) { if (tipo === 'touch' && (secRevelada !== riC || revela[riC] < 0.6)) { revelar(riC, 5000); return; } voar(secoes[riC].cx, secoes[riC].cy, secoes[riC].raio * 3.4); return; }
    let lv = bV ? livroPerto(x, y) : null; if (livroOculto(lv)) lv = null;
    if (lv && dist > 1500) { voar(lv.cx, lv.cy, lv.raio * 4.2); return; }
    const sec = camada('universo').visivel ? secoes.find((s2) => { const p = tela(s2.cx, s2.cy, 0); return p && Math.hypot(p.x - x, p.y - y) < 40; }) : null;
    if (sec) { voar(sec.cx, sec.cy, sec.raio * 3.4); return; }
    if (ceuR && camada('universo').visivel) { const f = ceuR.tocar(x, y, W, H, tipo === 'touch' ? 24 : 14); if (f) { mostrarFichaCeu(f); return; } }
    if (tipo === 'touch' && constel) soltar();
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); voo = null; interagiu = true;
    if (modoTerra) { if (!transicao) { posicionarTerra(); modoTerra.ancora = latLonNaTela(e.offsetX, e.offsetY); } modoTerra.cursor = { x: e.offsetX, y: e.offsetY }; modoTerra.altAlvo = Math.min(RAIO_GLOBO * 3.6, Math.max(1.5, modoTerra.altAlvo * Math.exp(e.deltaY * 0.0014))); return; }
    if (e.deltaY < 0 && atlasC && camada('atlas').visivel) { const pt = raioNoGlobo(e.offsetX, e.offsetY); if (pt && camera.position.distanceTo(atlasC.centroMundo()) < RAIO_GLOBO * 3.2) { entrarTerra(pt); modoTerra.cursor = { x: e.offsetX, y: e.offsetY }; modoTerra.altAlvo *= Math.exp(e.deltaY * 0.0014); return; } }
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; zoomSuave = { x: e.offsetX, y: e.offsetY, log: (zoomSuave ? zoomSuave.log : 0) + Math.max(-0.9, Math.min(0.9, dy * 0.0016)) }; }, { passive: false });
  let zoomSuave = null;   // { x, y, log }: o restante do zoom pedido pela roda (aplicado com amortecimento a cada quadro)
  // pinça no modo terra: aproxima do chão
  const pincaTerra = (fator) => { if (modoTerra) { modoTerra.cursor = pinca ? { x: pinca.cx, y: pinca.cy } : null; if (modoTerra.cursor && !modoTerra.ancoraPinca) { posicionarTerra(); modoTerra.ancora = latLonNaTela(modoTerra.cursor.x, modoTerra.cursor.y); modoTerra.ancoraPinca = true; } modoTerra.altAlvo = Math.min(RAIO_GLOBO * 3.6, Math.max(1.5, modoTerra.altAlvo * fator)); return true; } return false; };
  ui.querySelector('.cu-controles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cu]'); if (!b) return;
    const o = b.dataset.cu;
    if (o === 'mais') voar(alvo.x, alvo.y, dist * 0.5);
    else if (o === 'menos') voar(alvo.x, alvo.y, dist * 2);
    else if (o === 'geral') vistaGeral();
    else if (o === 'centro') centralizar(selecionado ? 'p:' + selecionado + '-' + selecionado : (estado.sel || estado.foco));
    else if (o === 'voltar') { const v = historico.pop(); if (v) { voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: v.x, y: v.y, d: v.d }, t0: performance.now(), dur: 900 }; incl = v.i; } }
    else if (o === 'camadas') { painelCamadas.hidden = !painelCamadas.hidden; b.classList.toggle('ativo', !painelCamadas.hidden); }
    else if (o === 'terra') { if (modoTerra) sairTerra(); else abrirTerra(); }
    else if (o === 'tela') { const el = container.closest('.palco') || container; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen && el.requestFullscreen().catch(() => {}); }
  });
  window.addEventListener('keydown', (e) => {
    if (!ativo || e.ctrlKey || e.metaKey || e.altKey) return; const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
    if (!container.offsetParent) return; const k = e.key; let feito = true; const passo = dist * 0.12;
    if (modoTerra && /^(Arrow|[wasdWASD]$)/.test(k)) { const m = modoTerra, f = m.alt / RAIO_GLOBO * 18; if (k === 'ArrowUp' || k === 'w' || k === 'W') m.lat = Math.min(85, m.lat + f); else if (k === 'ArrowDown' || k === 's' || k === 'S') m.lat = Math.max(-85, m.lat - f); else if (k === 'ArrowLeft' || k === 'a' || k === 'A') m.lon -= f; else m.lon += f; posicionarTerra(); e.preventDefault(); return; }
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { inercia.set(0, passo / 10); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { inercia.set(0, -passo / 10); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { inercia.set(-passo / 10, 0); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { inercia.set(passo / 10, 0); }
    else if (k === '+' || k === '=') { if (modoTerra) modoTerra.altAlvo = Math.max(1.5, modoTerra.altAlvo * 0.6); else zoomSuave = { x: W / 2, y: H / 2, log: (zoomSuave ? zoomSuave.log : 0) - 0.5 }; }
    else if (k === '-' || k === '_') { if (modoTerra) modoTerra.altAlvo = Math.min(RAIO_GLOBO * 3.6, modoTerra.altAlvo / 0.6); else zoomSuave = { x: W / 2, y: H / 2, log: (zoomSuave ? zoomSuave.log : 0) + 0.5 }; }
    else if (k === 'Home' || k === '0') vistaGeral();
    else if (k === 't' || k === 'T') { incl = incl > 0.3 ? 0 : 0.9; }
    else if (k === 'PageUp') incl = Math.max(0, incl - 0.15);
    else if (k === 'PageDown') incl = Math.min(1.15, incl + 0.15);
    else if (k === 'f' || k === 'F') { const el2 = container.closest('.palco') || container; if (document.fullscreenElement) document.exitFullscreen(); else el2.requestFullscreen && el2.requestFullscreen().catch(() => {}); }
    else if (k === 'Escape') { if (!pergaminho.hidden && pergFixo) { pergFixo = null; pergaminho.hidden = true; pergAssin = ''; } else if (!cartao.hidden) cartao.hidden = true; else if (!invest.hidden) invest.hidden = true; else if (modoTerra) sairTerra(); else feito = false; }
    else feito = false;
    if (feito) { e.preventDefault(); interagiu = true; voo = null; }
  });
  const mini = ui.querySelector('.cu-mini'), miniC = mini.querySelector('canvas'), mg = miniC.getContext('2d'); let miniEm = 0, miniCaixa = null;
  function desenharMini(t) {
    if (t - miniEm < 120 || !secoes.length || modoTerra || mini.offsetParent === null) return; miniEm = t;
    const r = window.devicePixelRatio || 1; if (miniC.width !== 216 * r) { miniC.width = 216 * r; miniC.height = 140 * r; }
    mg.setTransform(r, 0, 0, r, 0, 0); mg.clearRect(0, 0, 216, 140);
    const x0 = Math.min(...secoes.map((q) => q.cx - q.raio)), x1 = Math.max(...secoes.map((q) => q.cx + q.raio)), y0 = Math.min(...secoes.map((q) => q.cy - q.raio)), y1 = Math.max(...secoes.map((q) => q.cy + q.raio));
    const e = Math.min(200 / (x1 - x0), 124 / (y1 - y0)), ox = 108 - (x0 + x1) / 2 * e, oy = 70 + (y0 + y1) / 2 * e; miniCaixa = { e, ox, oy };
    const M = (x, y) => [ox + x * e, oy - y * e];
    secoes.forEach((q) => { const [a, b] = M(q.cx, q.cy); const g = mg.createRadialGradient(a, b, 0, a, b, q.raio * e); g.addColorStop(0, q.cor + '55'); g.addColorStop(1, q.cor + '00'); mg.fillStyle = g; mg.beginPath(); mg.arc(a, b, q.raio * e, 0, 6.29); mg.fill(); });
    livros.forEach((lv) => { const [a, b] = M(lv.cx, lv.cy); mg.fillStyle = sobreLivro === lv ? '#FFF3D0' : lv.sec.cor; mg.globalAlpha = 0.85; mg.beginPath(); mg.arc(a, b, Math.max(1.2, lv.raio * e * 0.45), 0, 6.29); mg.fill(); }); mg.globalAlpha = 1;
    // o que a câmera vê agora (o trapézio do chão visível)
    const cs = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => noPlano(x, y)).filter(Boolean);
    if (cs.length === 4) { mg.beginPath(); cs.forEach((c, i) => { const [a, b] = M(Math.max(x0 - 4000, Math.min(x1 + 4000, c.x)), Math.max(y0 - 4000, Math.min(y1 + 4000, c.y))); i ? mg.lineTo(a, b) : mg.moveTo(a, b); }); mg.closePath(); mg.fillStyle = 'rgba(243,211,142,.10)'; mg.fill(); mg.strokeStyle = '#F3D38E'; mg.lineWidth = 1.3; mg.stroke(); }
    const [ca, cb] = M(alvo.x, alvo.y); mg.fillStyle = '#FFF3D0'; mg.beginPath(); mg.arc(ca, cb, 2.6, 0, 6.29); mg.fill(); mg.strokeStyle = 'rgba(243,211,142,.9)'; mg.lineWidth = 1.2; mg.beginPath(); mg.arc(ca, cb, 7, 0, 6.29); mg.stroke();
    mg.fillStyle = 'rgba(220,226,240,.6)'; mg.font = '600 10px Inter, system-ui, sans-serif'; mg.textAlign = 'right'; mg.fillText(dist > 9000 ? 'universo inteiro' : dist > 1200 ? 'galáxias' : dist > 520 ? 'capítulos' : 'versículos', 210, 134);
    const bi = mini.querySelector('[data-mini="incl"] span'), txt = incl > 0.3 ? 'inclinado ' + Math.round(incl * 57.3) + '°' : 'de cima'; if (bi.textContent !== txt) bi.textContent = txt;
  }
  miniC.addEventListener('click', (e) => { if (!miniCaixa) return; const r = miniC.getBoundingClientRect(), x = (e.clientX - r.left - miniCaixa.ox) / miniCaixa.e, y = (miniCaixa.oy - (e.clientY - r.top)) / miniCaixa.e; voar(x, y, dist); });
  mini.addEventListener('click', (e) => { const b = e.target.closest('[data-mini]'); if (!b) return; if (b.dataset.mini === 'incl') incl = incl > 0.3 ? 0 : 0.9; else { const tk = mini.querySelector('.cu-mini-teclas'); tk.hidden = !tk.hidden; } });
  // distância que mostra todas as regiões na tela (com folga)
  function caixaGeral() {
    const x0 = Math.min(...secoes.map((s) => s.cx - s.raio)), x1 = Math.max(...secoes.map((s) => s.cx + s.raio));
    const y0 = Math.min(...secoes.map((s) => s.cy - s.raio)), y1 = Math.max(...secoes.map((s) => s.cy + s.raio));
    const t = Math.tan(camera.fov * Math.PI / 360), aspecto = W / H;
    const d = Math.max((y1 - y0) / 2 / t, (x1 - x0) / 2 / (t * aspecto)) * 1.12;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: Math.min(DIST_MAX, d) };
  }
  function mostrarFichaCeu(f) {
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Céu real · camada Universo</small><h3>${esc(f.titulo)}</h3>${f.html}${f.alvo ? '<div class="cu-chips" style="margin-top:8px"><button type="button" class="cu-apontar">🔭 Aproximar no telescópio</button><button type="button" class="cu-soltar">Voltar ao céu a olho nu</button></div>' : ''}`;
    invest.hidden = false; invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; };
    const ap = invest.querySelector('.cu-apontar'); if (ap) ap.onclick = () => { if (ceuR.apontar(f.alvo)) voar(alvo.x, alvo.y, Math.min(dist, 260)); };
    const so = invest.querySelector('.cu-soltar'); if (so) so.onclick = () => { ceuR.soltarMira(); vistaGeral(); };
  }
  // ── MODO TERRA ───────────────────────────────────────────────────────────────
  let modoTerra = null;   // { lat, lon, alt }
  function raioNoGlobo(x, y) {   // ponto do globo sob o cursor (ou null)
    if (!atlasC || !camada('atlas').visivel) return null;
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const esf = new THREE.Sphere(atlasC.centroMundo(), RAIO_GLOBO * 1.0036); const pt = new THREE.Vector3();   // altura do chão (terra em relevo), não do nível do mar
    return ray.ray.intersectSphere(esf, pt) ? pt : null;
  }
  let transicao = null;   // { pos, quat, t0 } — mistura suave entre o modo espaço e o modo Terra
  function guardarTransicao() { transicao = { pos: camera.position.clone(), quat: camera.quaternion.clone(), t0: performance.now() }; }
  function entrarTerra(ptMundo) {
    guardarTransicao();
    const c = atlasC.centroMundo(), sub = atlasC.latLonDe(camera.position.clone());   // começa olhando o ponto logo abaixo da câmera
    const alt = Math.max(20, camera.position.distanceTo(c) - RAIO_GLOBO);
    modoTerra = { lat: sub.lat, lon: sub.lon, alt, altAlvo: alt, cursor: null, vel: { lat: 0, lon: 0 }, ancora: ptMundo ? atlasC.latLonDe(ptMundo) : null };   // o ponto da Terra que estava sob o cursor
    voo = null; inercia.set(0, 0); interagiu = true;
  }
  function sairTerra() {
    if (!modoTerra) return; guardarTransicao();
    const c = atlasC.centroMundo(); modoTerra = null;
    alvo.set(c.x, c.y, zB); dist = Math.min(DIST_MAX, Math.max(RAIO_GLOBO * 3.6, camera.position.distanceTo(c))); incl = Math.min(incl, 0.5); posicionar();
  }
  function latLonNaTela(x, y) { const pt = raioNoGlobo(x, y); return pt ? atlasC.latLonDe(pt) : null; }
  const difLon = (a, b) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  // gira o centro da vista pela mesma rotação que leva o ponto 'de' até o ponto 'para' (exato na esfera)
  const vLL = (ll) => { const la = ll.lat * Math.PI / 180, lo = ll.lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)); };
  function girarCentro(de, para) {   // o ponto que está sob o cursor ('de') volta para onde estava ('para')
    const m = modoTerra, r = new THREE.Quaternion().setFromUnitVectors(vLL(de), vLL(para));
    const cn = vLL(m).applyQuaternion(r);
    m.lat = Math.asin(Math.max(-1, Math.min(1, cn.z))) * 180 / Math.PI; m.lon = Math.atan2(cn.y, cn.x) * 180 / Math.PI;
  }
  function arrastarTerra(x, y) {
    const m = modoTerra, ag = m.agarrado;
    if (ag) { posicionarTerra(); const q = latLonNaTela(x, y); if (q) { const l0 = m.lat, n0 = m.lon; girarCentro(q, ag); m.vel = { lat: m.lat - l0, lon: difLon(m.lon, n0) }; posicionarTerra(); return; } }
    const k = Math.max(m.alt, 2) / RAIO_GLOBO * 57.3 * 0.0021 * (900 / Math.max(H, 300)), dx = x - arrasto.x, dy = y - arrasto.y;
    m.lat += dy * k; m.lon -= dx * k / Math.max(0.2, Math.cos(m.lat * Math.PI / 180));
  }
  // a cada quadro: aproximação suave mantendo o ponto do cursor no lugar; inércia do arrasto; saída para o espaço
  function animarTerra() {
    const m = modoTerra;
    if (m.voo) {
      const v = m.voo, q = Math.min(1, (performance.now() - v.t0) / v.dur), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      const a = vLL(v.de), b = vLL(v.para), ang = a.angleTo(b);
      const c = ang < 1e-6 ? b : a.clone().multiplyScalar(Math.sin((1 - e) * ang)).addScaledVector(b, Math.sin(e * ang)).divideScalar(Math.sin(ang));
      m.lat = Math.asin(Math.max(-1, Math.min(1, c.z))) * 180 / Math.PI; m.lon = Math.atan2(c.y, c.x) * 180 / Math.PI;
      const la = Math.log(v.de.alt), lb = Math.log(v.para.alt), lt = Math.log(v.topo);
      const meio = Math.sin(q * Math.PI);   // sobe no meio do caminho e desce no fim
      m.alt = Math.exp(la + (lb - la) * e + Math.max(0, lt - Math.max(la, lb)) * meio * (ang > 0.02 ? 1 : 0)); m.altAlvo = m.alt;
      if (q >= 1) { m.voo = null; m.alt = m.altAlvo = v.para.alt; const f = m.aoChegar; m.aoChegar = null; f && f(); }
      return true;
    }
    if (Math.abs(m.altAlvo - m.alt) > m.alt * 0.002) {
      posicionarTerra();   // mede com a câmera exata deste quadro (antes e depois)
      const antes = m.cursor ? (m.ancora || latLonNaTela(m.cursor.x, m.cursor.y)) : null;
      m.alt += (m.altAlvo - m.alt) * 0.2; posicionarTerra();
      if (antes) for (let it = 0; it < 3; it++) { const depois = latLonNaTela(m.cursor.x, m.cursor.y); if (!depois) break; girarCentro(depois, antes); posicionarTerra(); }   // 3 passos: o ponto do cursor fica cravado
    }
    if (!arrasto && m.vel && (Math.abs(m.vel.lat) + Math.abs(m.vel.lon) > 1e-5)) { m.lat += m.vel.lat; m.lon += m.vel.lon; m.vel.lat *= 0.9; m.vel.lon *= 0.9; }
    if (m.altAlvo > RAIO_GLOBO * 3.3 && m.alt > RAIO_GLOBO * 3.1) { sairTerra(); return false; }
    return true;
  }
  function posicionarTerra() {
    const m = modoTerra; m.lat = Math.max(-85, Math.min(85, m.lat)); m.lon = ((m.lon + 540) % 360) - 180;
    m.alt = Math.max(1.5, m.alt);
    const c = atlasC.centroMundo(), d = atlasC.direcao(m.lat, m.lon), dn = atlasC.direcao(Math.min(89.9, m.lat + 0.5), m.lon);
    const norte = dn.sub(d.clone().multiplyScalar(dn.dot(d))).normalize();
    const sup = c.clone().addScaledVector(d, RAIO_GLOBO * 1.0035);
    // perto do chão a câmera inclina um pouco (como olhar o horizonte); longe, olha de cima
    const inc = Math.max(0, Math.min(0.75, (Math.log10(RAIO_GLOBO * 0.15) - Math.log10(Math.max(m.alt, 1))) * 0.42));   // longe: de cima; perto do chão: olhando o horizonte
    const pos = sup.clone().addScaledVector(d, m.alt * Math.cos(inc)).addScaledVector(norte, -m.alt * Math.sin(inc));
    camera.position.copy(pos); camera.up.copy(norte.clone().multiplyScalar(Math.cos(inc)).addScaledVector(d, Math.sin(inc))); camera.lookAt(sup);
    camera.near = Math.max(0.05, m.alt * 0.01); camera.far = camera.position.distanceTo(c) * 6 + 80000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);   // a medida sob o cursor usa a câmera deste instante
  }
  function abrirTerra(lat = 31.78, lon = 35.22) {
    if (!atlasC) return; camada('atlas').visivel = true; montarPainel();
    if (!modoTerra) entrarTerra(null);
    const m = modoTerra, de = { lat: m.lat, lon: m.lon, alt: m.alt };
    m.voo = { de, para: { lat, lon, alt: RAIO_GLOBO * 1.6 }, topo: Math.max(de.alt, RAIO_GLOBO * 1.6), t0: performance.now(), dur: 1800 }; m.cursor = null; m.ancora = null;
  }
  const faixaTerra = ui.querySelector('.cu-terra');
  faixaTerra.querySelector('[data-cu-terra="sair"]').onclick = () => { sairTerra(); vistaGeral(); };
  // Sol de agora (ou da hora escolhida no relógio): ponto subsolar aproximado (declinação + equação do tempo)
  function pontoSubsolar(ms) {
    const d = new Date(ms), ini = Date.UTC(d.getUTCFullYear(), 0, 0), N = (ms - ini) / 86400000;
    const dec = -23.44 * Math.cos(2 * Math.PI / 365 * (N + 10)), B = 2 * Math.PI * (N - 81) / 364, eq = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600; let lon = -15 * (h - 12 + eq / 60); lon = ((lon + 540) % 360) - 180;
    return { lat: dec, lon };
  }
  let solEm = 0;
  function vistaGeral() { if (modoTerra) sairTerra(); if (!secoes.length) return; const c = caixaGeral(); voar(c.x, c.y, c.d); incl = 0; }
  function centralizar(id) {
    const q = lerId(id);
    if (q && vIdx.has(q.ini)) { const j = vIdx.get(q.ini); voar(vBase[j * 3], vBase[j * 3 + 1], Math.min(dist, 260)); return; }
    const s = sats.find((x) => x.id === id); if (s) voar(s.x, s.y, Math.min(dist, 140));
  }

  // ── CAMADA ATLAS + composição de assuntos nas três camadas ──────────────────────────────
  let realceCamada = new Set(), fiosCamada = [], fichaCamada = null, pairCamada = null;
  function ligarCamada(c, i, fixo) {
    const js = (c.api.versos(i) || []).map((k) => vIdx.get(k)).filter((j) => j != null);
    realceCamada = new Set(js); const passo = Math.max(1, Math.floor(js.length / 40));   // no máximo ~40 fios (mais que isso vira emaranhado)
    fiosCamada = js.filter((_, q) => q % passo === 0).map((j) => ({ c, i, j }));
    CAMADAS.forEach((o) => o.api && o.api.realcar && o.api.realcar(o === c ? [i] : []));
    if (fixo) fichaCamada = { c, i }; else pairCamada = { c, i };
  }
  // voa até um ponto que está numa folha acima da Bíblia: a câmera fica acima da folha, com o ponto no centro da vista
  function voarAltura(x, y, z, d) { const h = Math.max(0, z - zB), ti = Math.tan(incl), ci = Math.max(0.2, Math.cos(incl)); voar(x, y + h * ti, h / ci + d); }
  // ── INTERLIGAÇÃO DAS CAMADAS: tudo se liga pelos versículos (o endereço comum das dez folhas) ──
  const indices = new Map();   // id da camada -> { m: Map(versículo -> [itens]), tam: Int32Array (versículos de cada item) }
  function indiceDe(c) {
    if (!c.api || !c.api.total || (c.api.pronto && !c.api.pronto())) return null;
    let x = indices.get(c.id); if (x) return x;
    const n = c.api.total(), m = new Map(), tam = new Int32Array(n);
    for (let i = 0; i < n; i++) { const vs = c.api.versos(i) || []; tam[i] = vs.length; for (const k of vs) { let l = m.get(k); if (!l) m.set(k, l = []); l.push(i); } }
    x = { m, tam }; indices.set(c.id, x); return x;
  }
  // itens das outras folhas que mais compartilham versículos com um conjunto (medida de semelhança: cosseno)
  function relacionados(V, origem, porCamada = 4) {
    const Vs = V instanceof Set ? V : new Set(V), out = []; if (!Vs.size) return out;
    for (const c of CAMADAS) {
      const x = indiceDe(c); if (!x) continue;
      const cont = new Map(); for (const k of Vs) for (const i of x.m.get(k) || []) cont.set(i, (cont.get(i) || 0) + 1);
      const minimo = Vs.size > 3 ? 2 : 1;
      const lista = [...cont.entries()].filter(([i, n]) => n >= minimo && !(origem && origem.c === c && origem.i === i))
        .map(([i, n]) => ({ c, i, n, sc: n / Math.sqrt(Math.max(1, x.tam[i]) * Vs.size) })).sort((a, b) => b.sc - a.sc).slice(0, porCamada);
      if (lista.length) out.push({ c, lista });
    }
    if (atlasC) { const cont = new Map(); for (const k of Vs) for (const li of atlasC.porVerso.get(k) || []) cont.set(li, (cont.get(li) || 0) + 1);
      const lista = [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, porCamada); if (lista.length) out.push({ atlas: true, lista }); }
    return out;
  }
  let fiosEntre = [];   // fios de item para item, de uma folha para outra
  function secaoLigacoes(rel, titulo) {
    if (!rel.length) return '';
    return `<h5>${titulo}</h5>` + rel.map((r) => r.atlas
      ? `<div><small>Atlas</small><div class="cu-chips">${r.lista.map(([li, n]) => `<button type="button" data-lugar-atlas="${li}">📍 ${esc(atlasC.lugares[li].nome)} · ${n}</button>`).join('')}</div></div>`
      : `<div><small>${esc(r.c.nome)}</small><div class="cu-chips">${r.lista.map((x) => `<button type="button" data-camada="${r.c.id}" data-item="${x.i}">${esc(r.c.api.nome ? r.c.api.nome(x.i) : '#' + x.i)}</button>`).join('')}</div></div>`).join('');
  }
  function ligarChips(raiz) {
    raiz.querySelectorAll('[data-busca]').forEach((b) => { if (!b.dataset.camada) b.onclick = () => buscar(b.dataset.busca); });
    raiz.querySelectorAll('[data-camada]').forEach((b) => { b.onclick = () => {
      const c2 = camada(b.dataset.camada); if (!c2 || !c2.api) { if (b.dataset.busca) buscar(b.dataset.busca); return; }
      const i2 = b.dataset.id != null ? c2.api.porId(+b.dataset.id) : +b.dataset.item; if (i2 == null || i2 < 0) return;
      c2.visivel = true; if (c2.opacidade < 0.3) c2.opacidade = 0.7; montarPainel(); abrirFichaCamada(c2, i2, true); }; });
    raiz.querySelectorAll('[data-verso]').forEach((b) => { if (!b.onclick) b.onclick = () => fichaVerso(+b.dataset.verso); });
    raiz.querySelectorAll('[data-lugar-atlas]').forEach((b) => { b.onclick = () => { camada('atlas').visivel = true; montarPainel(); voarParaLugar(atlasC.lugares[+b.dataset.lugarAtlas], []); }; });
  }
  // um versículo nas dez camadas: tudo o que cada folha diz dele, com fios de luz subindo até cada item
  function fichaVerso(k) {
    const j = vIdx.get(k); if (j == null) return;
    limparComposicao(); const partes = []; fiosCamada = []; realceCamada = new Set([j]);
    for (const c of CAMADAS.slice().reverse()) {
      const x = indiceDe(c); if (!x) continue; const is = (x.m.get(k) || []).slice(); if (!is.length) continue;
      is.sort((a, b) => x.tam[a] - x.tam[b]); const top = is.slice(0, c.id === 'linguas' ? 16 : 8);
      partes.push(`<div><small>${esc(c.nome)} (${is.length})</small><div class="cu-chips">${top.map((i) => `<button type="button" data-camada="${c.id}" data-item="${i}">${esc(c.api.nome ? c.api.nome(i) : '#' + i)}</button>`).join('')}</div></div>`);
      top.forEach((i) => fiosCamada.push({ c, i, j })); c.api.realcar && c.api.realcar(top);
    }
    const lugs = atlasC ? atlasC.porVerso.get(k) || [] : [];
    if (lugs.length) { partes.push(`<div><small>Atlas (${lugs.length})</small><div class="cu-chips">${lugs.slice(0, 8).map((li) => `<button type="button" data-lugar-atlas="${li}">📍 ${esc(atlasC.lugares[li].nome)}</button>`).join('')}</div></div>`); atlasC.acender(lugs); fios = lugs.map((li) => ({ l: li, j })); }
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Versículo nas camadas</small><h3>${esc(nomeRef(k))}</h3><p><i>“${esc(textoDe(k))}”</i></p>
      ${partes.length ? '<h5>O que cada camada diz deste versículo</h5>' + partes.join('') : '<p><small>Nenhuma das camadas tem dado ligado a este versículo ainda.</small></p>'}
      <p><small>Cada ligação vem da fonte da sua camada (mostrada na ficha de cada item). Fios de luz sobem do versículo até cada folha.</small></p>`;
    invest.hidden = false; cartao.hidden = true;
    invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; limparComposicao(); };
    ligarChips(invest);
  }
  // ── PREPARAR (sermão, pregação, mensagem, estudo): o universo inteiro trabalha a favor do tema ──
  // 1) acha os versículos do tema (passagem citada, itens das camadas com esse nome, ou palavras no texto da Almeida);
  // 2) reúne o que as 10 camadas dizem desses versículos; 3) acende tudo no universo; 4) devolve o dossiê para a IA.
  function versosDoTema(texto) {
    const q = norm(texto), V = new Set(), origem = [];
    const m = /^(.+?)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/.exec(q);
    if (m) { const lv = livros.find((l) => norm(l.nome) === m[1] || norm(l.abbrev) === m[1]) || livros.find((l) => norm(l.nome).startsWith(m[1]));
      if (lv && BIB[lv.i].chapters[+m[2] - 1]) { const cap = BIB[lv.i].chapters[+m[2] - 1], v0 = m[3] ? +m[3] : 1, v1 = m[4] ? +m[4] : m[3] ? +m[3] : cap.length;
        for (let v = v0; v <= Math.min(v1, cap.length); v++) V.add(chave(lv.num, +m[2], v)); const base = [...V];
        if (V.size < 6) { for (let v = Math.max(1, v0 - 5); v <= Math.min(cap.length, v1 + 5); v++) V.add(chave(lv.num, +m[2], v)); }   // passagem curta: entra o contexto ao redor
        origem.push(`passagem ${lv.nome} ${m[2]}${m[3] ? ':' + m[3] + (m[4] ? '-' + m[4] : '') : ''}${V.size > base.length ? ' (com o contexto ao redor)' : ''}`); return { V, origem, base }; } }
    for (const c of CAMADAS) { if (!c.api || !c.api.buscar) continue; const r = c.api.buscar(q); if (r && r.pont >= 45) { (c.api.versos(r.i) || []).slice(0, 120).forEach((k) => V.add(k)); origem.push(`${c.nome}: ${c.api.nome ? c.api.nome(r.i) : ''}`); } }
    if (atlasC) { const l = atlasC.lugares.filter((x) => norm(x.nome) === q).sort((a, b) => b.peso - a.peso)[0]; if (l) { l.versos.slice(0, 80).forEach((k) => V.add(k)); origem.push('Atlas: ' + l.nome); } }
    const palavras = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !PALAVRAS_VAZIAS.has(w));
    if (palavras.length) { let n = 0; for (let j = 0; j < vChave.length && n < 80; j++) { const t = norm(textoDe(vChave[j])); if (palavras.every((w) => t.includes(w))) { V.add(vChave[j]); n++; } } if (n) origem.push(`${n} versículo(s) da Almeida com “${palavras.join(' ')}”`); }
    return { V, origem, base: [] };
  }
  function prepararDossie(texto) {
    if (!pronto) return null;
    const { V, origem, base } = versosDoTema(texto); limparComposicao();
    if (!V.size) { chipLugar.innerHTML = `Não achei “${esc(texto)}” no universo: tente uma passagem (ex.: Romanos 8) ou um tema (ex.: graça, Páscoa, Davi). <button type="button" aria-label="Fechar">×</button>`; chipLugar.hidden = false; chipLugar.querySelector('button').onclick = () => { chipLugar.hidden = true; }; return { tema: texto, vazio: true }; }
    // versículos centrais: os que mais camadas comentam (a passagem pedida vem sempre primeiro)
    const peso = new Map(); for (const k of V) { let p = base.includes(k) ? 100 : 0; for (const c of CAMADAS) { const x = indiceDe(c); if (x && x.m.has(k)) p += 1 + Math.min(3, x.m.get(k).length / 4); } peso.set(k, p); }
    const centrais = [...V].sort((a, b) => peso.get(b) - peso.get(a) || a - b).slice(0, 24).sort((a, b) => a - b);
    const rel = relacionados(V, null, 6);
    if (base.length) for (const c of CAMADAS) {   // o que as camadas dizem da própria passagem pedida vem primeiro
      const x = indiceDe(c); if (!x) continue; const dir = [...new Set(base.flatMap((k) => x.m.get(k) || []))].sort((a, b) => x.tam[a] - x.tam[b]).slice(0, c.id === 'linguas' ? 8 : 5); if (!dir.length) continue;
      let r = rel.find((q) => q.c === c); if (!r) { r = { c, lista: [] }; rel.push(r); }
      r.lista = dir.map((i) => ({ c, i, n: 1, sc: 9 })).concat(r.lista.filter((q) => !dir.includes(q.i))).slice(0, 8);
    }
    // o universo trabalhando: versículos acesos, itens relacionados acesos em cada folha, fios dos versículos até eles
    realceCamada = new Set([...V].map((k) => vIdx.get(k)).filter((j) => j != null)); fiosCamada = [];
    rel.forEach((r) => { if (r.atlas) { atlasC.acender(r.lista.map(([li]) => li)); fios = r.lista.map(([li]) => { const k = atlasC.lugares[li].versos.find((v) => V.has(v)); return { l: li, j: vIdx.get(k) }; }).filter((f) => f.j != null); return; }
      r.c.visivel = true; r.c.api.realcar && r.c.api.realcar(r.lista.map((x) => x.i));
      r.lista.forEach((x) => { const k = (r.c.api.versos(x.i) || []).find((v) => V.has(v)); const j = vIdx.get(k); if (j != null) fiosCamada.push({ c: r.c, i: x.i, j }); }); });
    montarPainel();
    const js = [...realceCamada]; if (js.length) enquadrarXY(js.map((j) => vBase[j * 3]), js.map((j) => vBase[j * 3 + 1]), 0.7);
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>O universo trabalhando no seu preparo</small><h3>${esc(texto)}</h3>
      <p><small>Ponto de partida: ${esc(origem.join(' · '))}. ${V.size} versículo(s) acesos na Bíblia.</small></p>
      <h5>Versículos centrais</h5><div class="cu-chips">${centrais.slice(0, 12).map((k) => `<button type="button" data-verso="${k}">${esc(nomeRef(k))}</button>`).join('')}</div>
      ${secaoLigacoes(rel, 'O que as camadas trazem')}
      <p><small>Cada item vem da fonte da sua camada (veja a ficha). É este material que vai para o Claude escrever o texto.</small></p>`;
    invest.hidden = false; invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; limparComposicao(); };
    ligarChips(invest); invest.querySelectorAll('[data-verso]').forEach((b) => { b.onclick = () => fichaVerso(+b.dataset.verso); });
    return {
      tema: texto, origem, total_versos: V.size,
      versos: centrais.map((k) => ({ ref: nomeRef(k), texto: textoDe(k) })),
      camadas: rel.filter((r) => !r.atlas).map((r) => ({ camada: r.c.nome, itens: r.lista.map((x) => (r.c.api.nome ? r.c.api.nome(x.i) : '')).filter(Boolean) })),
      lugares: (rel.find((r) => r.atlas) || { lista: [] }).lista.map(([li]) => atlasC.lugares[li].nome),
    };
  }

  // ══ MOTOR ÚNICO DE DESCOBERTA: uma pesquisa, dez dimensões ═══════════════════════════════════════
  // 1) identifica o assunto (lugar, pessoa, acontecimento, palavra, tema…) e separa os homônimos;
  // 2) toma os versículos do assunto como sementes (o endereço comum das dez folhas);
  // 3) cada folha responde com o que tem DIRETAMENTE nesses versículos (evidência da fonte da folha) e, se for
  //    pouco, com itens relacionados por versículos compartilhados (marcados como hipótese calculada);
  // 4) a biblioteca entra pelo motor de descoberta que já existe (ação "descobrir": obras, autores, léxicos,
  //    patrística), com a porta (crachá/PIN); nada novo é indexado nem gravado;
  // 5) as folhas acendem uma a uma, com fios de luz, e o painel de investigação organiza tudo.
  const trl = (t) => norm(t).replace(/[^a-z0-9 ]+/g, '').replace(/sh/g, 's').replace(/ph/g, 'f').replace(/th/g, 't').replace(/ch/g, 'c').replace(/y/g, 'i').replace(/[aeo]$/, 'a');
  const TIPO_CAMADA = { tempo: 'acontecimento', personagens: 'pessoa', linguas: 'palavra original', historia: 'tema de história e cultura', teologia: 'doutrina', tradicao: 'artigo de confissão', manuscritos: 'nota textual' };
  const CONF = {   // grau de confiabilidade mostrado em cada achado
    direta: ['direta', 'evidência direta na fonte da camada'], interpretacao: ['interpretação', 'interpretação de uma obra ou tradição'],
    hipotese: ['hipótese', 'relação calculada pelo NEXUS (versículos em comum)'], incerta: ['incerta', 'identificação incerta'], provavel: ['provável', 'identificação provável'],
    tradicional: ['data tradicional', 'data da cronologia tradicional da fonte, não consenso'], segura: ['segura', 'identificação segura'] };
  const selo = (k) => `<span class="cu-selo cu-selo-${k}" title="${CONF[k][1]}">${CONF[k][0]}</span>`;
  // títulos (Rei Davi, profeta Elias, apóstolo Paulo…): pesquisa o nome e dá preferência à pessoa
  const TITULOS = /^\s*(?:o |a )?(rei|rainha|profeta|profetisa|ap[oó]stolo|sumo sacerdote|sacerdote|juiz|ju[ií]za|patriarca|s[aã]o|santo|santa|evangelista|di[aá]cono|imperador|fara[oó])\s+/i;
  function candidatosDe(texto) {
    const m = String(texto).match(TITULOS);
    if (m) { const r = candidatosBase(texto.slice(m[0].length)); r.forEach((x) => { if (x.tipo === 'pessoa') x.pont += 3; x.titulo = m[1]; }); r.sort((a, b) => b.pont - a.pont); if (r.length) return r; }
    return candidatosBase(texto);
  }
  function candidatosBase(texto) {
    const qn = norm(texto), qt = trl(texto), out = [];
    if (atlasC) for (const l of atlasC.lugares) { let p = 0; for (const nm of [l.nome, l.en]) { const a = norm(nm), b = trl(nm); p = Math.max(p, a === qn ? 100 : b === qt ? 97 : qt.length >= 5 && lev(b, qt) <= 1 ? 82 : 0); }
      if (p) out.push({ tipo: 'lugar', rot: p >= 100 ? l.nome : `${texto.trim().replace(/^./, (c) => c.toUpperCase())} (${l.nome}, no Atlas)`, desc: `lugar bíblico · ${l.versos.length} versículo(s) · ${l.conf >= 700 ? 'identificação segura' : l.conf >= 300 ? 'identificação provável' : 'localização incerta'}`, pont: p + Math.min(2.5, Math.log2(1 + l.peso) / 3), lugar: l, versos: l.versos }); }
    const cP = camada('personagens'); if (cP && cP.api && cP.api.pessoas) for (const pe of cP.api.pessoas) { const a = norm(pe.nome).replace(/ \(.*\)$/, ''), b = norm(pe.n).replace(/ \(.*\)$/, ''); const p = a === qn || b === qn ? 99 : trl(a) === qt || trl(b) === qt ? 95 : 0;
      if (p && pe.v.length) out.push({ tipo: 'pessoa', rot: pe.rotulo || pe.nome, desc: `pessoa · ${pe.qv} versículo(s)${pe.v[0] ? ' · aparece em ' + nomeRef(pe.v[0]) : ''}`, pont: p + Math.min(3, Math.log2(1 + pe.qv) / 3), c: cP, i: pe.i, versos: pe.v }); }
    for (const c of CAMADAS) { if (!c.api || !c.api.buscar || c.id === 'personagens' || c.id === 'manuscritos') continue; const r = c.api.buscar(qn); if (r && r.pont >= 95) out.push({ tipo: TIPO_CAMADA[c.id] || c.nome, rot: c.api.nome(r.i), desc: c.nome, pont: r.pont - 2, c, i: r.i, versos: c.api.versos(r.i) || [] }); }
    const cL = camada('linguas'); if (cL && cL.api && cL.api.lemas && cL.api.pronto && cL.api.pronto()) cL.api.lemas.forEach((l, i) => { if (l.t && trl(l.t) === qt && qt.length >= 4) out.push({ tipo: 'palavra original', rot: `${l.w} · ${l.t}`, desc: `${l.g} (inglês) · ${l.n} ocorrência(s)`, pont: 90, c: cL, i, versos: cL.api.versos(i) }); });
    return out.filter((x) => x.versos && x.versos.length).sort((a, b) => b.pont - a.pont);
  }
  let investigacao = null;   // { cand, outros, sementes, folhas, fontes, lugarIncerto, t0 }
  const ORDEM_FOLHAS = ['universo', 'biblia', 'atlas', 'tempo', 'personagens', 'linguas', 'historia', 'manuscritos', 'teologia', 'tradicao'];
  const CONF_CAMADA = { tempo: 'tradicional', personagens: 'direta', linguas: 'direta', historia: 'interpretacao', teologia: 'interpretacao', tradicao: 'interpretacao', manuscritos: 'direta' };
  function lugarPrincipal(cand, F) {   // o lugar do próprio assunto, ou o mais citado (com identificação ao menos provável)
    if (!atlasC) return null; if (cand.lugar) return cand.lugar;
    const x = (F.atlas || []).find((q) => atlasC.lugares[q.acao.lugar].conf >= 300); return x ? atlasC.lugares[x.acao.lugar] : null;
  }
  function folhasDa(sementes, cand) {
    const S = new Set(sementes), F = {};
    // 01 Universo: onde o assunto está no cânon
    const porSec = new Map(); for (const k of S) { const b = decompor(k).b - 1; const si = SECOES.findIndex((q) => b >= q.de && b <= q.ate); porSec.set(si, (porSec.get(si) || 0) + 1); }
    F.universo = [...porSec.entries()].sort((a, b) => b[1] - a[1]).map(([si, n]) => ({ rot: SECOES[si].nome, desc: `${n} versículo(s) do assunto nesta região do cânon`, conf: 'direta', acao: { secao: si } }));
    // 02 Bíblia: os próprios versículos
    F.biblia = (() => { const o = [...S].sort((a, b) => a - b); if (o.length <= 14) return o; const porLivro = new Map(); o.forEach((k) => { const b = decompor(k).b; if (!porLivro.has(b)) porLivro.set(b, []); porLivro.get(b).push(k); }); const out = []; let r = 0; while (out.length < 14 && r < 50) { for (const lst of porLivro.values()) if (lst[r] != null && out.length < 14) out.push(lst[r]); r++; } return out.sort((a, b) => a - b); })().map((k) => ({ rot: nomeRef(k), desc: textoDe(k), conf: 'direta', acao: { verso: k } }));
    // 03 Atlas: lugares citados nesses versículos (com a confiança da identificação)
    const cont = new Map(); if (atlasC) for (const k of S) for (const li of atlasC.porVerso.get(k) || []) cont.set(li, (cont.get(li) || 0) + 1);
    if (cand.lugar) cont.set(cand.lugar.i, 999);
    F.atlas = [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([li, n]) => { const l = atlasC.lugares[li], ck = l.conf >= 700 ? 'segura' : l.conf >= 300 ? 'provavel' : 'incerta';
      return { rot: l.nome, desc: `${l.identificacao && l.identificacao !== l.nome ? 'identificação moderna proposta: ' + l.identificacao + ' · ' : ''}confiança ${l.conf}/1000 (OpenBible) · ${n === 999 ? 'o próprio assunto' : n + ' versículo(s) em comum'}`, conf: ck, acao: { lugar: li }, conf1000: l.conf }; });
    // 04–10: o que cada folha tem DIRETAMENTE nesses versículos; se for pouco, os relacionados (hipótese).
    // Expansão de um passo: quando o assunto é lugar ou palavra, segue a pessoa principal ligada a ele (ex.: Tisba → Elias)
    let ponte = null, S2 = S;
    { const cP = camada('personagens'), xP = cP && indiceDe(cP); if (xP && cand.tipo !== 'pessoa') { const n = new Map(); for (const k of S) for (const i of xP.m.get(k) || []) n.set(i, (n.get(i) || 0) + 1);
        const top = [...n.entries()].sort((a, b) => b[1] - a[1] || xP.tam[b[0]] - xP.tam[a[0]])[0]; if (top && top[1] >= Math.min(2, S.size)) { ponte = cP.api.nome(top[0]); S2 = new Set([...S, ...(cP.api.versos(top[0]) || []).slice(0, 120)]); } } }
    for (const id of ORDEM_FOLHAS.slice(3)) {
      const c = camada(id), x = c && indiceDe(c); if (!x) { F[id] = null; continue; }
      const n = new Map(); for (const k of S) for (const i of x.m.get(k) || []) n.set(i, (n.get(i) || 0) + 1);
      const dir = [...n.entries()].filter(([i, q]) => (id !== 'linguas' || (x.tam[i] < 3000 && (q >= 2 || S.size < 12))) && !(cand.c && cand.c.id === id && cand.i === i))   // o próprio assunto não aparece como achado dele mesmo
        .sort(id === 'linguas' ? (a, b) => b[1] * Math.log(31102 / x.tam[b[0]]) ** 2 - a[1] * Math.log(31102 / x.tam[a[0]]) ** 2 : (a, b) => b[1] - a[1] || x.tam[a[0]] - x.tam[b[0]]).slice(0, id === 'linguas' ? 8 : 6).map(([i, q]) => ({ rot: c.api.nome(i), desc: `${q} versículo(s) do assunto${id === 'linguas' ? ' · ' + x.tam[i] + ' versículo(s) na Bíblia toda' : ''}`, conf: CONF_CAMADA[id], acao: { c: id, i } }));
      if (dir.length < 4 && id !== 'manuscritos' && id !== 'linguas') { const rel = relacionados(S2, cand.c ? { c: cand.c, i: cand.i } : null, 6).find((r) => r.c === c);
        if (rel) rel.lista.filter((q) => !n.has(q.i)).slice(0, 4 - dir.length).forEach((q) => dir.push({ rot: c.api.nome(q.i), desc: `${q.n} versículo(s) em comum${ponte ? ' com o assunto e com ' + ponte : ' com o assunto'}`, conf: 'hipotese', acao: { c: id, i: q.i } })); }
      F[id] = dir;
    }
    F._ponte = ponte;
    return F;
  }
  async function fontesDaBiblioteca(sementes) {   // o motor de descoberta que já existe, sem indexar nada novo
    const out = { blocos: [], porta: true };
    for (const k of [...sementes].sort((a, b) => a - b).slice(0, 2)) {
      try {
        const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'descobrir', id: 'p:' + k + '-' + k, cracha: ler('radar_chave'), token: ler('lp_token') }) });
        const j = await r.json(); if (!j.ok) { if (j.motivo === 'particular') out.porta = false; continue; }
        for (const b of j.blocos || []) if ((b.itens || []).length && !/Referências cruzadas|Caminhos/.test(b.titulo)) out.blocos.push({ verso: k, titulo: b.titulo, itens: b.itens.slice(0, 4) });
      } catch (_) { /* sem conexão: segue sem a biblioteca */ }
    }
    return out;
  }
  function investigarAssunto(texto, escolhido) {
    if (!pronto) return false;
    const cands = escolhido ? [escolhido] : candidatosDe(texto); if (!cands.length || cands[0].pont < 80) return false;
    const cand = cands[0], outros = escolhido ? (investigacao ? investigacao.outros : []) : cands.slice(1, 7);
    if (modoTerra) sairTerra();
    limparComposicao();
    const todosV = [...new Set(cand.versos)], passoS = Math.max(1, todosV.length / 2500), sementes = todosV.length > 2500 ? Array.from({ length: 2500 }, (_, q) => todosV[Math.floor(q * passoS)]) : todosV, F = folhasDa(sementes, cand);
    investigacao = { texto, cand, outros, sementes, F, fontes: null, aba: 'geral', t0: performance.now(), lugarIncerto: cand.lugar && cand.lugar.conf < 300 ? cand.lugar : null }; estudoAberto = false; cartaoAberto = null;
    // a composição: folhas afastadas e vistas em perspectiva, como lâminas
    separacao = Math.max(separacao, 2.2); sincronizarPainel();
    const js = sementes.map((k) => vIdx.get(k)).filter((j) => j != null);
    if (js.length) { const xs = js.map((j) => vBase[j * 3]), ys = js.map((j) => vBase[j * 3 + 1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      montarLaminas(cx, cy); mostrarLaminas(true);
      const principal = lugarPrincipal(cand, F);
      if (principal && atlasC) {   // como no Google Earth: o globo gira e entra direto no lugar principal do assunto
        investigacao.principal = principal.i; incl = 0.9;
        setTimeout(() => { if (!investigacao || investigacao.cand !== cand) return; voarTerraPara(principal, Math.max(8, RAIO_GLOBO * 0.035)); atlasC.acender((F.atlas || []).map((x) => x.acao.lugar)); }, 150);
      } else { incl = 0.9; voar(cx, cy + 15000, 40000); }   // sem lugar: as dez lâminas empilhadas à vista
    }
    // as folhas acendem uma a uma (a revelação progressiva)
    realceCamada = new Set(js); fiosCamada = [];
    ORDEM_FOLHAS.forEach((id, n) => setTimeout(() => { if (!investigacao || investigacao.cand !== cand) return; acenderFolha(id); desenharInvestigacao(); }, 250 + n * 330));
    desenharInvestigacao();
    fontesDaBiblioteca(sementes).then((f) => { if (investigacao && investigacao.cand === cand) { investigacao.fontes = f; desenharInvestigacao(); } });
    return true;
  }
  let laminas = null;
  let laminasModo = null;   // 'local' (investigação) ou 'global' (camadas ligadas pelo painel)
  function montarLaminas(cx, cy, w = 15000, h = 9500, modo = 'local') {   // as dez lâminas: cartões translúcidos empilhados (como na imagem de referência)
    laminasModo = modo;
    (laminas || []).forEach((l) => { l.c.grupo.remove(l.g); l.g.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); });
    laminas = []; const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    CAMADAS.forEach((c, k) => { if (k >= 10) return;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c.cor, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide }));
      pl.position.set(cx, cy, -6);
      const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, -5), new THREE.Vector3(x1, y0, -5), new THREE.Vector3(x1, y1, -5), new THREE.Vector3(x0, y1, -5)]), new THREE.LineBasicMaterial({ color: c.cor, transparent: true, opacity: 0.7, depthWrite: false }));
      const g = new THREE.Group(); g.add(pl, borda); g.visible = false; c.grupo.add(g); laminas.push({ c, g, x0, y1, num: k + 1 }); });
    precisaOpac = true; CAMADAS.forEach((c) => { c._sujo = true; });
  }
  // a cada quadro: com alguma camada 4–10 ligada (fora da investigação), as lâminas do universo inteiro aparecem
  let laminasVis = false;
  function atualizarLaminas() {
    if (investigacao || !secoes.length) return;
    const algum = CAMADAS.some((c) => c.modulo && c.visivel);
    if (algum && laminasModo !== 'global') { const x0 = Math.min(...secoes.map((q) => q.cx - q.raio)) - 1200, x1 = Math.max(...secoes.map((q) => q.cx + q.raio)) + 1200, y0 = Math.min(...secoes.map((q) => q.cy - q.raio)) - 1200, y1 = Math.max(...secoes.map((q) => q.cy + q.raio)) + 1200; montarLaminas((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 'global'); }
    if (algum !== laminasVis) mostrarLaminas(algum);
  }
  function mostrarLaminas(sim) { laminasVis = sim; (laminas || []).forEach((l) => { l.g.visible = sim; }); precisaOpac = true; CAMADAS.forEach((c) => { c._sujo = true; }); }
  function acenderFolha(id) {
    const inv = investigacao, F = inv.F[id], c = camada(id); inv.acesas = (inv.acesas || 0) + 1; inv.ultima = id;
    if (!c) return; c.visivel = true; if (c.opacidade < 0.35) c.opacidade = id === 'atlas' ? 0.35 : 0.75; montarPainel();
    if (id === 'atlas' && atlasC && F && F.length) { atlasC.acender(F.map((x) => x.acao.lugar)); fios = F.flatMap((x) => { const l = atlasC.lugares[x.acao.lugar]; const k = l.versos.find((v) => inv.sementes.includes(v)); const j = vIdx.get(k); return j == null ? [] : [{ l: x.acao.lugar, j }]; }); }
    if (F && c.api && c.api.realcar) { const is = F.map((x) => x.acao.i).filter((i) => i != null); c.api.realcar(is);
      for (const i of is) { const k = (c.api.versos(i) || []).find((v) => inv.sementes.includes(v)); const j = vIdx.get(k); if (j != null) fiosCamada.push({ c, i, j }); } }
    if (id === 'universo' && F && F[0]) secAtiva = F[0].acao.secao;
  }
  // painel de investigação: visão geral · conexões · fontes · mapas · cronologia · notas
  const painelInv = document.createElement('div'); painelInv.className = 'cu-investig'; painelInv.hidden = true; ui.appendChild(painelInv);
  const NOMES_ABAS = [['geral', 'Visão geral'], ['conexoes', 'Conexões'], ['fontes', 'Fontes'], ['mapas', 'Mapas'], ['cronologia', 'Cronologia'], ['notas', 'Notas']];
  function itemHtml(x) {
    const a = x.acao, attr = a.verso ? `data-inv-verso="${a.verso}"` : a.lugar != null ? `data-inv-lugar="${a.lugar}"` : a.secao != null ? `data-inv-secao="${a.secao}"` : `data-camada="${a.c}" data-item="${a.i}"`;
    return `<button type="button" class="cu-inv-item" ${attr}><b>${esc(x.rot)}</b> ${selo(x.conf)}<small>${esc(String(x.desc || '').slice(0, 160))}</small></button>`;
  }
  function desenharInvestigacao() {
    const inv = investigacao; if (!inv) { painelInv.hidden = true; document.body.classList.remove('cu-com-investig'); desenharEstudo(); return; }
    if (jornada) { painelInv.hidden = true; return; }   // durante a jornada o painel fica escondido
    painelInv.hidden = false; document.body.classList.add('cu-com-investig'); desenharEstudo(); ligarChips(telaEstudo);
    const F = inv.F, cand = inv.cand, n = inv.acesas || 0;
    const barra = ORDEM_FOLHAS.map((id, k) => { const c = camada(id), tem = F[id] && F[id].length; return `<i title="${esc(c ? c.nome : id)}${tem ? ': ' + F[id].length + ' achado(s)' : ': nada no acervo'}" class="${k < n ? (tem ? 'acesa' : 'vazia') : ''}" style="--c:${c ? c.cor : '#999'}">${String(k + 1).padStart(2, '0')}</i>`; }).join('');
    let corpo = '';
    if (inv.aba === 'geral') {
      const pess = (F.personagens || []).filter((x) => x.conf !== 'hipotese').slice(0, 3).map((x) => x.rot), lugs = (F.atlas || []).slice(0, 3).map((x) => x.rot);
      corpo = `${cand.tipo === 'pessoa' ? `<button type="button" class="cu-inv-jornada" data-inv-jornada="1">▶ Ver a jornada de ${esc(cand.rot.replace(/ · .*$/, ''))}, passo a passo</button><button type="button" class="cu-inv-mini" data-inv-caminho="1">🗺 Caminho no mapa</button> ` : ''}<button type="button" class="cu-inv-mini" data-inv-cartoes="1">▦ Ver as 10 camadas em cartões</button> ${inv.principal != null ? '<button type="button" class="cu-inv-mini" data-inv-universo="1">✶ Ver as lâminas no universo</button>' : ''}<p><b>${esc(cand.rot)}</b> — ${esc(cand.tipo)}. Aparece em <b>${inv.sementes.length}</b> versículo(s)${inv.sementes[0] ? ', a começar por ' + esc(nomeRef(Math.min(...inv.sementes))) : ''}.</p>
        ${(() => { const fx = faixasDeReferencia(inv.sementes), lg = (F.atlas || []).slice(0, 5), ev = (F.tempo || []).filter((x) => x.conf !== 'hipotese').slice(0, 2);
          return `${fx.length ? `<h5>📖 Principais referências</h5><div class="cu-chips">${fx.map((x) => `<button type="button" data-verso="${chave(x.b, x.c0, 1)}">${esc(x.txt)}</button>`).join('')}</div>` : ''}
          ${lg.length ? `<h5>📍 Localizações principais (Atlas)</h5><div class="cu-chips">${lg.map((x) => `<button type="button" data-inv-lugar="${x.acao.lugar}">${esc(x.rot)}${x.conf === 'incerta' ? ' (incerto)' : ''}</button>`).join('')}</div>` : ''}
          ${ev.length ? `<h5>⌛ Cronologia (Tempo)</h5><p>${ev.map((x) => esc(x.rot)).join('<br>')} <small>(data tradicional)</small></p>` : ''}`; })()}
        ${F._ponte ? `<p><small>A investigação seguiu a ligação principal: <b>${esc(F._ponte)}</b>. Itens achados por esse caminho aparecem como hipótese.</small></p>` : ''}
        ${pess.length ? `<p>Ligado diretamente a: ${esc(pess.join(', '))}${lugs.length ? '; lugares: ' + esc(lugs.join(', ')) : ''}.</p>` : ''}
        ${inv.lugarIncerto ? `<p class="cu-inv-alerta">⚠️ A localização exata de ${esc(inv.lugarIncerto.nome)} é <b>incerta</b>: a confiança da identificação é ${inv.lugarIncerto.conf}/1000 no OpenBible. No mapa ela aparece com um círculo tracejado, não como ponto comprovado.</p>` : ''}
        ${inv.outros.length ? `<h5>Outros com nome parecido</h5>${inv.outros.map((o, k) => `<button type="button" class="cu-inv-item" data-inv-outro="${k}"><b>${esc(o.rot)}</b><small>${esc(o.tipo)} · ${esc(o.desc)}</small></button>`).join('')}` : ''}
        <h5>As dez camadas</h5>${ORDEM_FOLHAS.map((id) => { const c = camada(id), L = F[id]; return `<div class="cu-inv-folha"><small style="color:${c ? c.cor : '#ccc'}">${esc(c ? c.nome : id)}</small>${L && L.length ? L.slice(0, 3).map(itemHtml).join('') : `<p class="cu-inv-nada">Nada no acervo do NEXUS para estes versículos.</p>`}</div>`; }).join('')}`;
    } else if (inv.aba === 'conexoes') {
      corpo = ORDEM_FOLHAS.filter((id) => F[id] && F[id].length).map((id) => `<h5>${esc(camada(id).nome)}</h5>${F[id].map(itemHtml).join('')}`).join('');
    } else if (inv.aba === 'fontes') {
      const f = inv.fontes;
      corpo = !f ? '<p class="cu-inv-nada">Consultando a biblioteca pelo motor de descoberta…</p>' : !f.porta ? '<p class="cu-inv-nada">As fontes da biblioteca (comentários, léxicos, patrística) aparecem com o PIN ou no aparelho liberado.</p>' : !f.blocos.length ? '<p class="cu-inv-nada">A biblioteca não tem obras ligadas a estes versículos.</p>' :
        f.blocos.map((b) => `<h5>${esc(b.titulo)} · ${esc(nomeRef(b.verso))}</h5>` + b.itens.map((it) => `<div class="cu-inv-fonte"><b>${esc(it.rotulo || '')}</b> ${selo(/patr/i.test(b.titulo) || /cita|comenta|define/.test((it.evidencias && it.evidencias[0] && it.evidencias[0].modo) || '') ? 'direta' : 'interpretacao')}<small>${esc(it.detalhe || '')}</small>${(it.evidencias || []).slice(0, 2).map((e) => `<blockquote>${esc(e.trecho || '')}<cite>${esc([e.autor, e.obra, e.secao].filter(Boolean).join(' · '))}</cite></blockquote>`).join('')}</div>`).join('')).join('');
      corpo += `<h5>Fontes das camadas</h5><small>Bíblia: Almeida · Atlas: OpenBible (CC BY) e Natural Earth · Tempo e Personagens: Theographic (CC BY-SA) · Línguas e Manuscritos: STEPBible/Tyndale House (CC BY) · História e Teologia: Easton, 1897 (domínio público) · Tradição: credos e confissões históricos (domínio público).</small>`;
    } else if (inv.aba === 'mapas') {
      corpo = (F.atlas || []).length ? F.atlas.map((x) => { const l = atlasC.lugares[x.acao.lugar]; return `<div class="cu-inv-fonte"><b>${esc(l.nome)}</b> ${selo(x.conf)}<div class="cu-inv-medidor"><span style="width:${Math.max(2, l.conf / 10)}%"></span></div><small>${esc(x.desc)}</small><button type="button" class="cu-inv-mini" data-inv-terra="${x.acao.lugar}">🌍 Ver na Terra</button></div>`; }).join('') : '<p class="cu-inv-nada">Nenhum lugar do Atlas nestes versículos.</p>';
      if (cand.tipo === 'pessoa') corpo = `<button type="button" class="cu-inv-jornada" data-inv-caminho="1">🗺 Traçar no mapa o caminho de ${esc(cand.rot.replace(/ · .*$/, ''))}</button>` + corpo;
      corpo += '<p><small>O medidor mostra a confiança da identificação do lugar (0 a 1000), segundo o OpenBible. Abaixo de 300, o NEXUS trata a localização como incerta.</small></p>';
    } else if (inv.aba === 'cronologia') {
      const ev = (F.tempo || []).map((x) => ({ x, ev: camada('tempo').api.eventos[x.acao.i] })).sort((a, b) => a.ev.a - b.ev.a);
      corpo = ev.length ? ev.map(({ x }) => itemHtml(x)).join('') + `<p><small>⚠️ ${esc(camada('tempo').api.aviso || '')}</small></p>` : '<p class="cu-inv-nada">Nenhum acontecimento datado nestes versículos.</p>';
    } else if (inv.aba === 'notas') {
      const chaveN = 'nexus_nota_' + norm(cand.rot);
      corpo = `<textarea class="cu-inv-nota" rows="9" placeholder="Suas anotações sobre ${esc(cand.rot)}…">${esc(ler(chaveN))}</textarea><p><small>Fica guardada só neste aparelho (não vai para o banco).</small></p>`;
    }
    painelInv.innerHTML = `<button class="cu-fechar-inv" type="button" data-inv-fechar aria-label="Fechar">×</button><small>Investigação multidimensional</small><h3>${esc(cand.rot)}</h3>
      <div class="cu-inv-barra">${barra}</div><small class="cu-inv-estado">${n < 10 ? `revelando a camada ${String(n + 1).padStart(2, '0')}…` : `${ORDEM_FOLHAS.filter((id) => F[id] && F[id].length).length} de 10 camadas com achados`}</small>
      <div class="cu-inv-abas">${NOMES_ABAS.map(([k, nm]) => `<button type="button" data-inv-aba="${k}" class="${inv.aba === k ? 'ativa' : ''}">${nm}</button>`).join('')}</div>
      <div class="cu-inv-corpo">${corpo}</div>`;
    ligarChips(painelInv);
    const nota = painelInv.querySelector('.cu-inv-nota'); if (nota) nota.oninput = () => { try { localStorage.setItem('nexus_nota_' + norm(cand.rot), nota.value); } catch (_) {} };
  }
  painelInv.addEventListener('click', (e) => {
    const inv = investigacao; if (!inv) return; const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.invFechar != null) { investigacao = null; desenharInvestigacao(); limparComposicao(); mostrarLaminas(false); laminasModo = null; CAMADAS.forEach((c) => { if (c.modulo) c.visivel = false; }); montarPainel(); return; }   // ao fechar, a vista volta limpa
    if (b.dataset.invAba) { inv.aba = b.dataset.invAba; desenharInvestigacao(); return; }
    if (b.dataset.invVerso) { fichaVerso(+b.dataset.invVerso); return; }
    if (b.dataset.invLugar) { const l = atlasC.lugares[+b.dataset.invLugar]; const j = vIdx.get(l.versos[0]); if (j != null) voar(vBase[j * 3], vBase[j * 3 + 1], Math.min(dist, 2400)); atlasC.acender([l.i]); return; }
    if (b.dataset.invTerra) { voarParaLugar(atlasC.lugares[+b.dataset.invTerra], []); return; }
    if (b.dataset.invSecao) { const q = secoes[+b.dataset.invSecao]; voar(q.cx, q.cy, q.raio * 3.4); return; }
    if (b.dataset.invJornada) { iniciarJornada(inv.cand.i); return; }
    if (b.dataset.invCartoes) { estudoAberto = true; desenharInvestigacao(); return; }
    if (b.dataset.invUniverso) { if (modoTerra) sairTerra(); const js = inv.sementes.map((k) => vIdx.get(k)).filter((j) => j != null); if (js.length) { const xs = js.map((j) => vBase[j * 3]), ys = js.map((j) => vBase[j * 3 + 1]); incl = 0.9; voar((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 + 15000, 40000); } return; }
    if (b.dataset.invCaminho) { if (iniciarJornada(inv.cand.i)) verCaminhoInteiro(); return; }
    if (b.dataset.invOutro) { investigarAssunto(inv.texto, inv.outros[+b.dataset.invOutro]); return; }
  });

  // ══ MODO JORNADA: a vida de uma pessoa contada passo a passo (capítulo por capítulo da narrativa) ═══════
  // Cada passo é um capítulo em que a pessoa aparece: o versículo-chave em destaque, o lugar (a câmera voa até ele no
  // globo), quem está junto, uma palavra do original e o acontecimento datado, quando houver. Tudo sai das camadas;
  // nada é inventado. Funciona para qualquer personagem (Davi, Moisés, Elias, Pedro, Paulo…).
  let jornada = null;
  const LIVROS_NARRATIVA = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 27, 32, 40, 41, 42, 43, 44]);   // Gn–2Rs, Ed, Ne, Et, Dn, Jn, Evangelhos, Atos
  function montarJornada(iPessoa) {
    const cP = camada('personagens'); if (!cP || !cP.api) return null; const pe = cP.api.pessoas[iPessoa]; if (!pe) return null;
    const xP = indiceDe(cP), xL = indiceDe(camada('linguas')), xH = indiceDe(camada('historia')), tempo = camada('tempo').api;
    const porCap = new Map(); for (const k of pe.v) { const d = decompor(k); if (!LIVROS_NARRATIVA.has(d.b)) continue; const ch = d.b * 1000 + d.c; (porCap.get(ch) || porCap.set(ch, []).get(ch)).push(k); }
    let caps = [...porCap.entries()].filter(([, ks]) => ks.length >= 2).sort((a, b) => a[0] - b[0]);
    // a jornada termina na morte da pessoa, quando a cronologia registra (depois disso o texto só a lembra)
    const morte = tempo && tempo.eventos ? tempo.eventos.find((e) => e.p && e.p.includes(pe.id) && /^Death of /.test(e.t)) : null;
    if (morte && morte.v.length) { const fim = Math.max(...morte.v.map((k) => Math.floor(k / 1000))); caps = caps.filter(([ch]) => ch <= fim); }
    // se a mesma história aparece em Samuel/Reis e em Crônicas, fica a narrativa principal (Crônicas não entra na jornada)
    const passos = caps.slice(0, 48).map(([ch, ks]) => {
      const b = Math.floor(ch / 1000), c = ch % 1000, cap = BIB[b - 1].chapters[c - 1], todos = cap.map((_, i) => chave(b, c, i + 1));
      // versículo-chave: onde a pessoa aparece junto com mais gente e lugares
      const peso = (k) => (xP && xP.m.get(k) ? xP.m.get(k).length : 0) + (atlasC && atlasC.porVerso.get(k) ? atlasC.porVerso.get(k).length * 1.5 : 0);
      const evCap = tempo && tempo.eventos ? tempo.eventos.find((e) => e.p && e.p.includes(pe.id) && e.v.length < 200 && e.v.some((k) => Math.floor(k / 1000) === ch)) : null;
      let doEv = evCap ? ks.filter((k) => evCap.v.includes(k)) : [];
      if (evCap) { const outros = (evCap.pn || []).map((x) => norm(String(x).replace(/ \(.*\)$/, ''))).filter((x) => x && x !== norm(String(pe.nome).replace(/ \(.*\)$/, '')));   // versículo em que aparece também o outro protagonista (ex.: Golias)
        const comOutro = doEv.filter((k) => outros.some((o) => norm(textoDe(k)).includes(o))); if (comOutro.length) doEv = comOutro; }
      const chaveV = (doEv.length ? doEv : ks).slice().sort((a, b2) => peso(b2) - peso(a) || a - b2)[0];
      const gente = new Map(); if (xP) for (const k of todos) for (const i of xP.m.get(k) || []) if (i !== iPessoa) gente.set(i, (gente.get(i) || 0) + 1);
      const pessoas = [...gente.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 6).map(([i]) => i);
      const lug = new Map(); if (atlasC) todos.forEach((k, ordem) => { for (const li of atlasC.porVerso.get(k) || []) { const x = lug.get(li) || { n: 0, ordem }; x.n++; lug.set(li, x); } });
      const noChave = new Set(atlasC ? atlasC.porVerso.get(chaveV) || [] : []), pesoL = (li, x) => x.n + (noChave.has(li) ? 3 : 0) + (1 - x.ordem / todos.length);   // mais citado, presente no versículo-chave, citado cedo
      const lugares = [...lug.entries()].sort((a, b2) => pesoL(b2[0], b2[1]) - pesoL(a[0], a[1])).map(([li]) => li);
      const comPessoa = new Set(atlasC ? ks.flatMap((k) => atlasC.porVerso.get(k) || []) : []);   // só lugares citados nos versículos em que a própria pessoa aparece
      const lugarVoo = lugares.find((li) => comPessoa.has(li) && atlasC.lugares[li].conf >= 300);
      let palavra = null; if (xL) { const cand = (xL.m.get(chaveV) || []).filter((i) => xL.tam[i] >= 3 && xL.tam[i] <= 400).sort((a, b2) => xL.tam[a] - xL.tam[b2]); palavra = cand[0] != null ? cand[0] : null; }
      const evs = tempo && tempo.eventos ? tempo.eventos.filter((e) => e.v.some((k) => Math.floor(k / 1000) === ch) && e.v.length < 200).sort((a, b2) => a.v.length - b2.v.length).slice(0, 2) : [];
      const temas = xH ? [...new Set(todos.flatMap((k) => xH.m.get(k) || []))].slice(0, 3) : [];
      return { b, c, ks, chaveV, pessoas, lugares: lugares.slice(0, 4), lugarVoo, palavra, evs, temas, livro: BIB[b - 1].name };
    });
    const fora = pe.v.filter((k) => !LIVROS_NARRATIVA.has(decompor(k).b));
    const rota = []; passos.forEach((P, k) => { if (P.lugarVoo != null && rota[rota.length - 1]?.li !== P.lugarVoo) rota.push({ li: P.lugarVoo, passo: k }); });
    return { pe, iPessoa, passos, fora, rota, n: 0 };
  }
  const painelJ = document.createElement('div'); painelJ.className = 'cu-jornada'; painelJ.hidden = true; ui.appendChild(painelJ);
  function voarTerraPara(l, alt) {   // a câmera voa até o lugar no globo (sem abrir a ficha)
    if (!atlasC) return; camada('atlas').visivel = true; if (!modoTerra) entrarTerra(null);
    const desloc = !jornada || W < 760 || painelJ.classList.contains('mini') ? 0 : (alt / RAIO_GLOBO) * 57.3 * 0.3 / Math.max(0.3, Math.cos(l.lat * Math.PI / 180));   // o painel ocupa a direita: o lugar fica no meio da área livre
    const alvoL = { lat: l.lat, lon: l.lon + desloc };
    const m = modoTerra, de = { lat: m.lat, lon: m.lon, alt: m.alt }, ang = Math.acos(Math.max(-1, Math.min(1, vLL(de).dot(vLL(alvoL)))));
    m.voo = { de, para: { lat: alvoL.lat, lon: alvoL.lon, alt }, topo: Math.max(de.alt, alt, RAIO_GLOBO * Math.min(1.2, ang * 1.6)), t0: performance.now(), dur: 2200 + ang * 700 }; m.cursor = null; m.ancora = null; m.aoChegar = null;
    if (l.i >= 0) atlasC.acender([l.i]);
  }
  function iniciarJornada(iPessoa) {
    const j = montarJornada(iPessoa); if (!j || !j.passos.length) { chipLugar.innerHTML = 'Esta pessoa não aparece em capítulos narrativos suficientes para uma jornada. <button type="button" aria-label="Fechar">×</button>'; chipLugar.hidden = false; chipLugar.querySelector('button').onclick = () => { chipLugar.hidden = true; }; return false; }
    jornada = j; estudoAberto = false; invest.hidden = true; painelInv.hidden = true; telaEstudo.hidden = true; document.body.classList.add('cu-em-jornada'); document.body.classList.remove('cu-modo-estudo');
    if (atlasC && j.rota.length > 1) atlasC.definirRota(j.rota.map((r) => r.li));   // o caminho no globo
    mostrarPasso(0); return true;
  }
  function sairJornada() { pergFixo = null; pergaminho.hidden = true; pergAssin = ''; jornada = null; painelJ.hidden = true; document.body.classList.remove('cu-em-jornada'); if (modoTerra) sairTerra(); limparComposicao(); if (investigacao) { estudoAberto = true; desenharInvestigacao(); } vistaGeral(); }
  function mostrarPasso(n) {
    const j = jornada; if (!j) return; painelJ.classList.remove('mini'); j.n = Math.max(0, Math.min(j.passos.length - 1, n)); const P = j.passos[j.n], cP = camada('personagens'), cL = camada('linguas');
    // o universo acompanha: versículos do capítulo acesos; a pessoa e quem está com ela acesos na lâmina de Personagens
    realceCamada = new Set(P.ks.map((k) => vIdx.get(k)).filter((x) => x != null)); fiosCamada = []; fios = [];
    if (cP.api) cP.api.realcar([j.iPessoa, ...P.pessoas]);
    // a câmera: voa até o lugar no globo; se o capítulo não tem lugar identificado, vai até o versículo na galáxia
    if (P.lugarVoo != null) { const l = atlasC.lugares[P.lugarVoo]; voarTerraPara(l, Math.max(6, RAIO_GLOBO * 0.012)); atlasC.acender(P.lugares); }
    if (atlasC && j.rota.length > 1) atlasC.definirRota(j.rota.map((r) => r.li));
    else { if (modoTerra) sairTerra(); const jj = vIdx.get(P.chaveV); if (jj != null) voar(vBase[jj * 3], vBase[jj * 3 + 1], 260); }
    const pess = P.pessoas.map((i) => `<button type="button" data-camada="personagens" data-item="${i}">${esc(cP.api.nome(i))}</button>`).join('');
    const lugs = P.lugares.map((li) => { const l = atlasC.lugares[li]; return `<button type="button" data-jl="${li}">📍 ${esc(l.nome)}${l.conf < 300 ? ' (local incerto)' : ''}</button>`; }).join('');
    const pal = P.palavra != null && cL.api ? (() => { const l = cL.api.lemas[P.palavra]; return `<button type="button" data-camada="linguas" data-item="${P.palavra}"><span dir="auto">${esc(l.w)}</span> · ${esc(l.t)} · “${esc(l.g)}” (inglês)</button>`; })() : '';
    const evs = P.evs.map((e) => `<button type="button" data-camada="tempo" data-item="${e.i}">🕰 ${esc(e.nome)} · ${e.a < 0 ? 'c. ' + -e.a + ' a.C.' : 'c. ' + e.a + ' d.C.'}</button>`).join('');
    const temas = P.temas.map((i) => `<button type="button" data-camada="historia" data-item="${i}">${esc(camada('historia').api.nome(i))}</button>`).join('');
    const ref = nomeRef(P.chaveV), nomeP = cP.api.nome(j.iPessoa).replace(/ · .*$/, '');
    painelJ.innerHTML = `<div class="cu-j-topo"><small>Jornada de ${esc(nomeP)} · passo ${j.n + 1} de ${j.passos.length}</small><span><button type="button" class="cu-j-recolher" data-j="recolher">◧ recolher</button><button type="button" data-j="sair" aria-label="Sair da jornada">✕</button></span></div>
      <div class="cu-j-barra"><span style="width:${((j.n + 1) / j.passos.length) * 100}%"></span></div>
      <h3>${esc(P.livro)} ${P.c}${P.evs[0] ? ' · ' + esc(P.evs[0].nome) : ''}</h3>
      <blockquote>“${esc(textoDe(P.chaveV))}”<cite>${esc(ref)} · Almeida</cite></blockquote>
      <div class="cu-j-linhas">
        ${lugs ? `<div><small>Onde</small><div class="cu-chips">${lugs}</div></div>` : ''}
        ${pess ? `<div><small>Quem está junto</small><div class="cu-chips">${pess}</div></div>` : ''}
        ${pal ? `<div><small>Uma palavra do original neste versículo</small><div class="cu-chips">${pal}</div></div>` : ''}
        ${evs || temas ? `<div><small>Contexto</small><div class="cu-chips">${evs}${temas}</div></div>` : ''}
      </div>
      <p class="cu-j-pergunta">✎ Para refletir: leia ${esc(P.livro)} ${P.c} inteiro. O que ${esc(nomeP)} faz aqui, e o que isso revela sobre ele e sobre Deus?</p>
      ${j.rota.length > 1 ? `<p class="cu-j-caminho">🗺 Caminho no mapa: ${j.rota.length} paradas, na ordem em que o texto cita os lugares <small>(não é uma rota histórica comprovada)</small></p>` : ''}
      <div class="cu-j-bts">${j.rota.length > 1 ? '<button type="button" data-j="caminho">🗺 Ver o caminho inteiro</button>' : ''}<button type="button" data-j="ant" ${j.n === 0 ? 'disabled' : ''}>◀ Anterior</button><button type="button" data-j="ler">📖 Ler o capítulo</button><button type="button" data-j="prox" class="cu-j-prox">${j.n === j.passos.length - 1 ? 'Concluir ✓' : 'Próximo ▶'}</button></div>`;
    painelJ.hidden = false; ligarChips(painelJ);
  }
  function verCaminhoInteiro() {   // afasta até caber o caminho todo no globo
    const j = jornada; if (!j || !j.rota.length || !atlasC) return; const ls = j.rota.map((r) => atlasC.lugares[r.li]);
    const v = ls.reduce((acc, l) => acc.add(vLL(l)), new THREE.Vector3()).normalize(), c = { lat: Math.asin(v.z) * 180 / Math.PI, lon: Math.atan2(v.y, v.x) * 180 / Math.PI };
    const raio = Math.max(...ls.map((l) => vLL(l).angleTo(vLL(c))));   // abertura do caminho (radianos)
    voarTerraPara({ ...c, i: -1 }, Math.max(RAIO_GLOBO * 0.02, RAIO_GLOBO * raio * 1.9)); atlasC.acender(j.rota.map((r) => r.li));
    painelJ.classList.add('mini');   // o painel encolhe para o caminho aparecer inteiro
  }
  function concluirJornada() {
    const j = jornada; if (!j) return; const cP = camada('personagens'), nomeP = cP.api.nome(j.iPessoa).replace(/ · .*$/, '');
    const porLivro = new Map(); for (const k of j.fora) { const b = decompor(k).b; porLivro.set(b, (porLivro.get(b) || 0) + 1); }
    painelJ.innerHTML = `<div class="cu-j-topo"><small>Jornada de ${esc(nomeP)} · concluída</small><button type="button" data-j="sair" aria-label="Sair">✕</button></div><div class="cu-j-barra"><span style="width:100%"></span></div>
      <h3>Você percorreu ${j.passos.length} capítulos da vida de ${esc(nomeP)}</h3>
      ${j.fora.length ? `<p>${esc(nomeP)} também aparece em ${j.fora.length} versículo(s) fora das narrativas:</p><div class="cu-chips">${[...porLivro.entries()].sort((a, b) => a[0] - b[0]).map(([b, n]) => `<button type="button" data-busca="${esc(BIB[b - 1].name)}">${esc(BIB[b - 1].name)} · ${n}</button>`).join('')}</div>` : ''}
      <div class="cu-j-bts"><button type="button" data-j="recomecar">↺ Recomeçar</button><button type="button" data-j="dossie">📜 Abrir o dossiê</button><button type="button" data-j="preparar" class="cu-j-prox">✦ Preparar estudo sobre ${esc(nomeP)}</button></div>`;
    ligarChips(painelJ);
  }
  painelJ.addEventListener('click', (e) => {
    const b = e.target.closest('[data-j], [data-jl]'); if (!b || !jornada) return;
    if (b.dataset.jl) { voarTerraPara(atlasC.lugares[+b.dataset.jl], Math.max(6, RAIO_GLOBO * 0.012)); return; }
    const a = b.dataset.j, j = jornada;
    if (a === 'sair') sairJornada();
    else if (a === 'ant') mostrarPasso(j.n - 1);
    else if (a === 'prox') { if (j.n >= j.passos.length - 1) concluirJornada(); else mostrarPasso(j.n + 1); }
    else if (a === 'ler') { const P = j.passos[j.n]; lerPergaminho(P.b, P.c, P.ks); }
    else if (a === 'recomecar') mostrarPasso(0);
    else if (a === 'caminho') verCaminhoInteiro();
    else if (a === 'recolher') { painelJ.classList.toggle('mini'); b.textContent = painelJ.classList.contains('mini') ? '◨ abrir' : '◧ recolher'; }
    else if (a === 'dossie') { const i = j.iPessoa; sairJornada(); abrirFichaCamada(camada('personagens'), i, true); }
    else if (a === 'preparar') { const bt = document.getElementById('bt-preparar'); const nome = camada('personagens').api.nome(j.iPessoa).replace(/ · .*$/, ''); sairJornada(); if (bt) { bt.click(); setTimeout(() => { const f = document.querySelector('#preparar [name=tema]'); const est = document.querySelector('#preparar input[value=estudo]'); if (f) f.value = nome; if (est) est.checked = true; }, 120); } }
  });


  // ══ TELA "ESTUDO": as dez camadas como cartões empilhados, cada um com o resumo do que achou ══════════════
  // (modelo visual do proprietário, 22/11/2026). Tudo sai da investigação (dados reais); as imagens são reais:
  // o recorte de satélite NASA do lugar e a palavra no original. Nada de retrato inventado.
  const ICONE = { universo: '✶', biblia: '📖', atlas: '📍', tempo: '⌛', personagens: '👥', linguas: 'א', historia: '🏛', manuscritos: '📜', teologia: '⚖', tradicao: '✝' };
  const telaEstudo = document.createElement('div'); telaEstudo.className = 'cu-estudo'; telaEstudo.hidden = true; ui.appendChild(telaEstudo);
  let estudoAberto = true, cartaoAberto = null;
  const abrevLivro = (b) => String(livros[b - 1].abbrev).replace(/^(\d)([a-z])/, '$1 $2').replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
  function faixasDeReferencia(versos) {   // "1 Sm 16–31", "2 Sm 1–24", "Sl"
    const porLivro = new Map(); for (const k of versos) { const d = decompor(k); (porLivro.get(d.b) || porLivro.set(d.b, new Map()).get(d.b)).set(d.c, ((porLivro.get(d.b).get(d.c)) || 0) + 1); }
    return [...porLivro.entries()].map(([b, caps]) => { const cs = [...caps.entries()].filter(([, n]) => n >= 2).map(([c]) => c).sort((x, y) => x - y); const n = [...caps.values()].reduce((a, x) => a + x, 0);
      return { b, n, txt: cs.length >= 2 ? `${abrevLivro(b)} ${cs[0]}–${cs[cs.length - 1]}` : cs.length === 1 ? `${abrevLivro(b)} ${cs[0]}` : abrevLivro(b), c0: cs[0] || [...caps.keys()][0] }; })
      .sort((x, y) => y.n - x.n).slice(0, 6).sort((x, y) => x.b - y.b);
  }
  function imagemSatelite(l) { if (!l) return ''; const col = Math.floor((l.lon + 180) / 4.5), lin = Math.floor((90 - l.lat) / 4.5); return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/6/${lin}/${col}.jpeg`; }
  function palavraDoNome(inv) {   // a palavra original que É o nome do assunto (ex.: דָּוִד para Davi), se estiver nos versículos
    const cL = camada('linguas'), x = cL && indiceDe(cL); if (!x || !cL.api.lemas) return null;
    const alvo = inv.cand.c && inv.cand.c.id === 'personagens' ? String(cL && camada('personagens').api.pessoas[inv.cand.i].n).replace(/ \(.*\)$/, '') : inv.cand.lugar ? inv.cand.lugar.en : null; if (!alvo) return null;
    const S = new Set(inv.sementes), cand = new Map(); for (const k of S) for (const i of x.m.get(k) || []) cand.set(i, (cand.get(i) || 0) + 1);
    let m = null; for (const [i, n] of cand) { const l = cL.api.lemas[i]; if (l && l.g && norm(l.g).replace(/[^a-z ]/g, '') === norm(alvo).replace(/[^a-z ]/g, '') && (!m || n > m.n)) m = { i, n, l }; } return m;
  }
  function desenharEstudo() {
    const inv = investigacao; if (!inv || !estudoAberto) { telaEstudo.hidden = true; document.body.classList.remove('cu-modo-estudo'); return; }
    telaEstudo.hidden = false; document.body.classList.add('cu-modo-estudo');
    const F = inv.F, cand = inv.cand, nome = cand.rot.replace(/ · .*$/, '').replace(/ \(.*\)$/, '');
    const pal = palavraDoNome(inv), lug = (F.atlas || [])[0] && atlasC.lugares[F.atlas[0].acao.lugar];
    const resumo = (id) => { const L = F[id] || []; if (id === 'manuscritos') return L.length + ' versículo(s) com diferenças entre edições: ' + L.slice(0, 3).map((x) => x.rot.replace(/:.*?: .*$/, '').replace(/: diferenças.*$/, '')).join(', '); return [...new Set(L.slice(0, 5).map((x) => x.rot.replace(/ · .*$/, '')))].slice(0, 4).join(' • '); };
    const visual = (id) => {
      if (id === 'atlas' && lug) return `<img class="cu-e-img" src="${imagemSatelite(lug)}" alt="Imagem de satélite da região de ${esc(lug.nome)} (NASA)" loading="lazy">`;
      if (id === 'linguas' && pal) return `<span class="cu-e-palavra" dir="rtl">${esc(pal.l.w)}</span>`;
      if (id === 'tempo') { const ev = (F.tempo || []).map((x) => camada('tempo').api.eventos[x.acao.i]).filter(Boolean).sort((a, b) => a.a - b.a); if (ev.length) { const a = ev[0].a, z = ev[ev.length - 1].a, f = (v) => (v < 0 ? -v + ' a.C.' : v + ' d.C.'); return `<span class="cu-e-data">c. ${a === z ? f(a) : f(a) + ' – ' + f(z)}</span>`; } }
      if (id === 'biblia') { const fx = faixasDeReferencia(inv.sementes); return `<span class="cu-e-data">${esc(fx.slice(0, 3).map((x) => x.txt).join(' · '))}</span>`; }
      return `<span class="cu-e-icone">${ICONE[id]}</span>`;
    };
    const cartoes = ORDEM_FOLHAS.slice().reverse().map((id, k) => {
      const c = camada(id), L = F[id] || [], num = ORDEM_FOLHAS.indexOf(id) + 1, aberto = cartaoAberto === id;
      return `<div class="cu-e-cartao ${L.length ? '' : 'vazio'} ${aberto ? 'aberto' : ''}" data-e-cartao="${id}" style="--c:${c ? c.cor : '#ccc'};--k:${9 - k}" role="button" tabindex="0" aria-expanded="${aberto}">
        <div class="cu-e-linha"><b class="cu-e-num">${String(num).padStart(2, '0')}</b><span class="cu-e-nome">${esc(c ? c.nome.split(' · ')[0] : id).toUpperCase()}</span>${visual(id)}<span class="cu-e-resumo">${L.length ? esc(resumo(id)) : 'nada no acervo para este assunto'}</span></div>
        ${aberto ? `<div class="cu-e-itens">${L.map(itemHtml).join('') || '<p class="cu-inv-nada">Nada no acervo do NEXUS.</p>'}</div>` : ''}</div>`;
    }).join('');
    const fx = faixasDeReferencia(inv.sementes);
    telaEstudo.innerHTML = `<div class="cu-e-cab"><span class="cu-e-marca">✦</span><div><small>Estudo multidimensional</small><h2>Estudo: ${esc(nome)}</h2></div>
        <div class="cu-e-bts">${cand.tipo === 'pessoa' ? `<button type="button" data-e="caminho">🗺 Caminho no mapa</button><button type="button" data-e="jornada">▶ Jornada</button>` : ''}<button type="button" data-e="3d">◫ Voltar ao universo</button><button type="button" data-e="fechar" aria-label="Fechar o estudo">✕</button></div></div>
      <div class="cu-e-pilha">${cartoes}</div>
      <aside class="cu-e-fontes"><h4>Como o NEXUS pesquisou</h4><p>Uma pesquisa só percorre as dez camadas, a partir dos versículos de “${esc(nome)}”.</p>
        <h4>Fontes consultadas</h4><ul><li>Bíblia Almeida</li><li>Atlas: OpenBible (CC BY), NASA</li><li>Cronologia e personagens: Theographic</li><li>Hebraico, aramaico e grego: STEPBible</li><li>Manuscritos: STEPBible (edições comparadas)</li><li>História e teologia: Easton (1897)</li><li>Tradição: credos e confissões</li><li>Biblioteca particular (motor de descoberta)</li></ul>
        <h4>Selos</h4><p>${selo('direta')} ${selo('interpretacao')} ${selo('hipotese')} ${selo('incerta')} ${selo('tradicional')}</p></aside>`;
    // o painel do assunto (abas) vai para a direita, como no modelo
    const ref = painelInv.querySelector('.cu-inv-refs'); if (!ref && fx.length) { /* desenhado em desenharInvestigacao */ }
  }
  telaEstudo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]'); if (b) { const a = b.dataset.e; if (a === 'fechar') { investigacao = null; desenharInvestigacao(); limparComposicao(); mostrarLaminas(false); laminasModo = null; CAMADAS.forEach((c) => { if (c.modulo) c.visivel = false; }); montarPainel(); desenharEstudo(); } else if (a === '3d') { estudoAberto = false; desenharEstudo(); desenharInvestigacao(); } else if (a === 'jornada') iniciarJornada(investigacao.cand.i); else if (a === 'caminho') { if (iniciarJornada(investigacao.cand.i)) verCaminhoInteiro(); } return; }
    { const v = e.target.closest('[data-inv-verso]'); if (v) { fichaVerso(+v.dataset.invVerso); return; } const l = e.target.closest('[data-inv-lugar]'); if (l) { voarTerraPara(atlasC.lugares[+l.dataset.invLugar], Math.max(8, RAIO_GLOBO * 0.02)); estudoAberto = false; desenharEstudo(); return; } const sc = e.target.closest('[data-inv-secao]'); if (sc) { const q = secoes[+sc.dataset.invSecao]; estudoAberto = false; desenharEstudo(); voar(q.cx, q.cy, q.raio * 3.4); return; } }
    if (e.target.closest('.cu-e-itens')) return;   // os itens das camadas abrem as fichas (ligarChips)
    const c = e.target.closest('[data-e-cartao]'); if (c) { cartaoAberto = cartaoAberto === c.dataset.eCartao ? null : c.dataset.eCartao; desenharEstudo(); ligarChips(telaEstudo); }
  });

  // na ficha de qualquer item aberta a partir da investigação: voltar a ela
  function voltarInvestigacao() { if (!investigacao) return; const inv = investigacao; invest.hidden = true; limparComposicao(); investigacao = inv; realceCamada = new Set(inv.sementes.map((k) => vIdx.get(k)).filter((j) => j != null)); fiosCamada = []; inv.acesas = 0; ORDEM_FOLHAS.forEach((id) => acenderFolha(id)); desenharInvestigacao(); }

  function limparCamada() { realceCamada = new Set(); fiosCamada = []; fiosEntre = []; fichaCamada = null; pairCamada = null; CAMADAS.forEach((o) => o.api && o.api.realcar && o.api.realcar([])); }
  function abrirFichaCamada(c, i, irAte = false) {
    limparComposicao(); const f = c.api.ficha(i); if (!f) return;
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>${esc(f.rotulo || c.nome)}</small><h3>${esc(f.titulo)}</h3>${f.html}
      <div class="cu-chips cu-acoes" style="margin-top:8px">${f.versos && f.versos.length ? '<button type="button" class="cu-acender">✨ Acender versículos na Bíblia</button>' : ''}<button type="button" class="cu-ir">◎ Aproximar</button></div>`;
    invest.hidden = false;
    ligarCamada(c, i, true);
    // interligação: o que as outras folhas têm em comum com este item (pelos versículos compartilhados)
    const rel = relacionados(f.versos || [], { c, i });
    if (rel.length) {
      const div = document.createElement('div'); div.innerHTML = secaoLigacoes(rel, 'Ligações nas outras camadas') + '<p><small>Itens que compartilham mais versículos com este, em cada camada (semelhança calculada pelo NEXUS a partir das fontes de cada camada).</small></p>';
      invest.insertBefore(div, invest.querySelector(':scope > .cu-acoes'));
      const lig = new Map(); rel.forEach((r) => { if (!r.atlas) lig.set(r.c, r.lista.map((x) => x.i)); });
      CAMADAS.forEach((o) => { if (o.api && o.api.realcar) o.api.realcar(o === c ? [i, ...(lig.get(o) || [])] : lig.get(o) || []); });
      fiosEntre = rel.filter((r) => !r.atlas).flatMap((r) => r.lista.map((x) => ({ c, i, c2: r.c, i2: x.i })));
      const at = rel.find((r) => r.atlas); if (at && atlasC) atlasC.acender(at.lista.map(([li]) => li));
    }
    invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; limparCamada(); if (atlasC) atlasC.acender([]); };
    invest.querySelectorAll('[data-evento]').forEach((b) => { b.onclick = () => abrirFichaCamada(c, +b.dataset.evento, true); });
    ligarChips(invest);
    const ir = () => { const p = c.api.pos(i); if (p) voarAltura(p.x, p.y, c.z, 1400); };
    invest.querySelector('.cu-ir').onclick = ir;
    const ac = invest.querySelector('.cu-acender'); if (ac) ac.onclick = () => { const js = [...realceCamada]; if (js.length) { camada('biblia').visivel = true; montarPainel(); enquadrarXY(js.map((j) => vBase[j * 3]), js.map((j) => vBase[j * 3 + 1])); } };
    if (c.id === 'personagens') { const bj = document.createElement('button'); bj.type = 'button'; bj.className = 'cu-bt-jornada'; bj.textContent = '▶ Ver a jornada de ' + String(f.titulo).replace(/ \(.*\)$/, ''); bj.onclick = () => iniciarJornada(i); invest.querySelector(':scope > .cu-acoes').prepend(bj); }
    if (investigacao) { const bv = document.createElement('button'); bv.type = 'button'; bv.textContent = '↩ Voltar à investigação'; bv.onclick = voltarInvestigacao; invest.querySelector(':scope > .cu-acoes').appendChild(bv); }
    if (irAte) ir();
  }
  let atlasC = null, lugarAtivo = null, realceLugar = new Set(), realceLivro = new Set(), livroAtivo = null, secAtiva = null, fios = [];
  const chipLugar = ui.querySelector('.cu-lugar'), invest = ui.querySelector('.cu-invest');
  async function montarAtlas() {
    try {
      const d = await (await fetch('/nexus/atlas-dados.json?v=2')).json();
      const { criarGloboAtlas } = await import('/nexus/atlas-globo.js?v=6');
      const x0 = Math.min(...secoes.map((q) => q.cx - q.raio)), x1 = Math.max(...secoes.map((q) => q.cx + q.raio));
      const y0 = Math.min(...secoes.map((q) => q.cy - q.raio)), y1 = Math.max(...secoes.map((q) => q.cy + q.raio));
      RAIO_GLOBO = Math.round((y1 - y0) * 0.22);
      atlasC = criarGloboAtlas(THREE, d, { raio: RAIO_GLOBO });
      atlasC.grupo.position.set((x0 + x1) / 2, (y0 + y1) / 2, RAIO_GLOBO * 1.15);   // a Terra no meio do universo, acima das galáxias
      GA.add(atlasC.grupo); precisaOpac = true;
    } catch (e) { console.warn('Atlas indisponível:', e); }
  }
  let RAIO_GLOBO = 2000;
  // posição na tela de um lugar do globo (null se estiver do outro lado)
  const lugarPos = (l) => atlasC.posMundo(l);
  function telaLugarV(l) { if (!atlasC.deFrente(l, camera.position)) return null; const w = lugarPos(l); tmp.copy(w).project(camera); if (tmp.z > 1) return null; return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  function limparComposicao() {
    lugarAtivo = null; realceLugar = new Set(); realceLivro = new Set(); livroAtivo = null; secAtiva = null; fios = []; limparCamada();
    chipLugar.hidden = true; invest.hidden = true;
    if (atlasC) { atlasC.acender([]); atlasC.definirRota(null); }
  }
  function enquadrarXY(xs, ys, inclinar) {
    const ext = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * (W / H), 400);
    if (inclinar != null) incl = inclinar;
    voar((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 - ext * 0.08, Math.min(DIST_MAX, ext / (2 * Math.tan(camera.fov * Math.PI / 360) * (W / H)) * 1.3));
  }
  // lugar escolhido (no Atlas ou na busca) -> versículos acesos na camada Bíblia, com fios de luz entre as camadas
  function escolherLugar(l, enquadrar = true) {
    limparComposicao();
    if (!l) return;
    lugarAtivo = l;
    for (const k of l.versos) { const j = vIdx.get(k); if (j != null) realceLugar.add(j); }
    if (atlasC) atlasC.acender([l.i]);
    const js = [...realceLugar], passo = Math.max(1, Math.floor(js.length / 140));
    fios = js.filter((_, i) => i % passo === 0).map((j) => ({ l: l.i, j }));
    const livrosLugar = new Set(l.versos.map((k) => decompor(k).b));
    chipLugar.innerHTML = `📍 ${esc(l.nome)} · ${realceLugar.size} versículo(s) acesos em ${livrosLugar.size} livro(s) <button type="button" aria-label="Apagar">×</button>`;
    chipLugar.hidden = false;
    chipLugar.querySelector('button').onclick = () => limparComposicao();
    if (enquadrar && js.length) { const c = atlasC.centroMundo(); enquadrarXY(js.map((j) => vBase[j * 3]).concat([c.x]), js.map((j) => vBase[j * 3 + 1]).concat([c.y])); }
  }
  // versículo sob o mouse -> lugares citados acendem no Atlas
  function lugaresDoVerso(k) {
    if (!atlasC || livroAtivo != null || lugarAtivo) return;
    const ids = atlasC.porVerso.get(k) || [];
    atlasC.acender(ids);
    const j = vIdx.get(k); fios = ids.map((i) => ({ l: i, j }));
  }
  // ASSUNTO = LIVRO: as três camadas se reúnem (região no Universo, livro na Bíblia, lugares e sequência no Atlas)
  function comporLivro(i) {
    limparComposicao();
    const lv = livros[i]; if (!lv) return;
    livroAtivo = i; secAtiva = SECOES.findIndex((q) => i >= q.de && i <= q.ate);
    const ini = vIdx.get(chave(lv.num, 1, 1));
    for (let j = ini; j < ini + lv.versos; j++) realceLivro.add(j);
    const cont = new Map();
    if (atlasC) for (let j = ini; j < ini + lv.versos; j++) for (const li of atlasC.porVerso.get(vChave[j]) || []) { const c = cont.get(li) || { n: 0, j }; c.n++; cont.set(li, c); }
    const ordem = [...cont.entries()].sort((a, b) => b[1].n - a[1].n);
    if (atlasC) {
      atlasC.acender(ordem.map(([li]) => li));
      const seq = [...cont.entries()].filter(([li]) => atlasC.lugares[li].conf >= 300).sort((a, b) => a[1].j - b[1].j).slice(0, 32).map(([li]) => li);
      atlasC.definirRota(seq);
      fios = ordem.slice(0, 60).map(([li, c]) => ({ l: li, j: c.j }));
    }
    const caps = new Map(); for (const [li, c] of cont) { const cc = decompor(vChave[c.j]).c; caps.set(cc, (caps.get(cc) || 0) + 1); }
    const capsTop = [...caps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Investigação nas três camadas</small><h3>${esc(lv.nome)}</h3>
      <h5>Universo</h5><div>Região: <b>${esc(lv.sec.nome)}</b></div>
      <h5>Bíblia</h5><div>${lv.caps} capítulos · ${lv.versos} versículos acesos</div>
      <div class="cu-chips">${capsTop.map(([cc, n]) => `<button type="button" data-cap="${cc}">${esc(lv.abbrev.toUpperCase())} ${cc} · ${n} lugar(es)</button>`).join('')}</div>
      <h5>Atlas</h5><div>${cont.size} lugar(es) citado(s) no livro</div>
      <div class="cu-chips">${ordem.slice(0, 14).map(([li, c]) => `<button type="button" data-lugar="${li}">${esc(atlasC.lugares[li].nome)} · ${c.n}</button>`).join('')}</div>
      <p><small>A linha tracejada no Atlas liga os lugares na ordem em que o texto os cita pela primeira vez: não é a rota histórica.</small></p>
      <div class="cu-lig-livro"></div>
      <p><small>Fontes: Almeida (texto), OpenBible.info (lugares, CC BY 4.0), Natural Earth (mapa); as das outras camadas estão na ficha de cada item.</small></p>`;
    invest.hidden = false;
    invest.querySelector('.cu-fechar-inv').onclick = () => limparComposicao();
    invest.querySelectorAll('[data-lugar]').forEach((b) => { b.onclick = () => { const l = atlasC.lugares[+b.dataset.lugar]; escolherLugar(l); }; });
    invest.querySelectorAll('[data-cap]').forEach((b) => { b.onclick = () => { const c = lv.capPos[+b.dataset.cap - 1]; if (c) voar(c.x, c.y, 200); }; });
    { const Vl = new Set(); for (let j = ini; j < ini + lv.versos; j++) Vl.add(vChave[j]); const rel = relacionados(Vl, null, 6).filter((r) => !r.atlas);
      const box = invest.querySelector('.cu-lig-livro'); if (box && rel.length) { box.innerHTML = secaoLigacoes(rel, 'Nas outras camadas'); ligarChips(box); CAMADAS.forEach((o) => { const r = rel.find((q) => q.c === o); if (o.api && o.api.realcar) o.api.realcar(r ? r.lista.map((x) => x.i) : []); }); } }
    // enquadra o livro e os lugares juntos, em perspectiva, com as folhas afastadas
    const pts = ordem.slice(0, 20).map(([li]) => atlasC.lugares[li]);
    separacao = Math.max(separacao, 1.6); sincronizarPainel();
    { const c = atlasC.centroMundo(); enquadrarXY([lv.cx - lv.raio, lv.cx + lv.raio, c.x - RAIO_GLOBO, c.x + RAIO_GLOBO], [lv.cy - lv.raio, lv.cy + lv.raio, c.y - RAIO_GLOBO, c.y + RAIO_GLOBO], 0.78); }
  }
  function comporSecao(si) {
    limparComposicao(); secAtiva = si; const q = secoes[si];
    for (let i = q.de; i <= q.ate; i++) { const lv = livros[i], ini = vIdx.get(chave(lv.num, 1, 1)); for (let j = ini; j < ini + lv.versos; j++) realceLivro.add(j); }
    voar(q.cx, q.cy, q.raio * 3.4);
  }
  // ── BUSCA DE LUGAR NA FRASE ("Jesus no Getsêmani"): acha o lugar real (mesmo com erro de digitação) e voa até ele ──
  function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
  const PALAVRAS_VAZIAS = new Set(['no', 'na', 'em', 'de', 'da', 'do', 'dos', 'das', 'o', 'a', 'os', 'as', 'e', 'com', 'para', 'monte', 'rio', 'mar', 'vale', 'jesus', 'cristo', 'deus', 'senhor']);
  function lugarNaFrase(q) {
    if (!atlasC) return null;
    const palavras = q.split(/[^a-z0-9]+/).filter(Boolean), frase = ' ' + palavras.join(' ') + ' ';
    let melhor = null;
    for (const l of atlasC.lugares) {
      for (const nome of [l.nome, l.en]) {
        const nn = norm(nome).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); if (nn.length < 3) continue;
        let pont = 0;
        if (frase.includes(' ' + nn + ' ')) pont = 100 + nn.length;   // o nome inteiro está na frase
        else if (!nn.includes(' ') && nn.length >= 5) { for (const w of palavras) { if (w.length < 5 || PALAVRAS_VAZIAS.has(w)) continue; const dd = lev(w, nn); if (dd <= (nn.length >= 8 ? 2 : 1)) pont = Math.max(pont, 60 - dd * 10 + nn.length); } }
        if (pont && (!melhor || pont > melhor.pont || (pont === melhor.pont && l.peso > melhor.l.peso))) melhor = { l, pont };
      }
    }
    return melhor ? melhor.l : null;
  }
  // voo como no Google Earth: sobe, atravessa e desce até o lugar
  function voarParaLugar(l, palavrasExtras) {
    if (!atlasC) return;
    if (!modoTerra) entrarTerra(null);
    const m = modoTerra, de = { lat: m.lat, lon: m.lon, alt: m.alt };
    const ang = Math.acos(Math.max(-1, Math.min(1, vLL(de).dot(vLL(l))))) ;
    m.voo = { de, para: { lat: l.lat, lon: l.lon, alt: Math.max(4, RAIO_GLOBO * 0.0035) }, topo: Math.max(de.alt, RAIO_GLOBO * Math.min(1.6, ang * 1.1)), t0: performance.now(), dur: 2600 + ang * 900 };
    m.cursor = null; m.ancora = null;
    m.aoChegar = () => { escolherLugar(l, false); mostrarLugarNaFrase(l, palavrasExtras); };
  }
  function mostrarLugarNaFrase(l, extras) {
    const ref = (k) => { const d = decompor(k); return BIB ? `${BIB[d.b - 1].name} ${d.c}:${d.v}` : String(k); };
    // versículos reais onde o lugar aparece; se a frase tem outras palavras (ex.: "Jesus"), ficam primeiro os que também as citam
    const ex = (extras || []).filter((w) => w.length >= 3 && !PALAVRAS_VAZIAS.has(w) || w === 'jesus');
    const comTodas = l.versos.filter((k) => ex.length && ex.every((w) => norm(textoDe(k)).includes(w)));
    const ordem = comTodas.concat(l.versos.filter((k) => !comTodas.includes(k))).slice(0, 12);
    const conf = l.conf >= 700 ? 'identificação segura' : l.conf >= 300 ? 'identificação provável' : 'identificação incerta';
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Atlas · lugar bíblico</small><h3>${esc(l.nome)}</h3>
      <p>${l.identificacao && l.identificacao !== l.nome ? `Hoje: <b>${esc(l.identificacao)}</b> · ` : ''}${conf} (${l.conf}/1000) · ${l.versos.length} versículo(s)</p>
      ${ex.length ? `<small>${comTodas.length ? `${comTodas.length} versículo(s) citam ${esc(l.nome)} e também “${esc(ex.join(' '))}”` : `Nenhum versículo cita ${esc(l.nome)} junto com “${esc(ex.join(' '))}”; abaixo, todos os que citam o lugar.`}</small>` : ''}
      ${ordem.map((k) => `<p><b>${esc(ref(k))}</b> — “${esc(textoDe(k))}”</p>`).join('')}
      <small>Fontes: OpenBible.info (lugar e versículos, CC BY 4.0) · texto da Almeida</small>`;
    invest.hidden = false; invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; };
  }
  function buscarCamadas(q, minimo) {
    let melhor = null;
    for (const c of CAMADAS) { if (!c.api || !c.api.buscar) continue; const r = c.api.buscar(q); if (r && r.pont >= minimo && (!melhor || r.pont > melhor.r.pont)) melhor = { c, r }; }
    if (!melhor) return false;
    const c = melhor.c; c.visivel = true; if (c.opacidade < 0.3) c.opacidade = 0.75; montarPainel(); abrirFichaCamada(c, melhor.r.i, true); return true;
  }
  function buscar(texto) {
    const q = norm(texto); if (!q) return false;
    { const iE = livros.findIndex((lv) => norm(lv.nome) === q || norm(lv.abbrev) === q); if (iE >= 0) { comporLivro(iE); return true; } }   // nome exato de livro (Rute, Jó, Daniel) é o livro
    if (q.split(/\s+/).length <= 4 && !/\d/.test(q)) {
      const pend = CAMADAS.filter((c) => c.modulo && !c.criada);   // no tablet as camadas só baixam quando precisam: carrega e pesquisa
      if (pend.length) { chipLugar.innerHTML = 'Preparando as dez camadas para a pesquisa…'; chipLugar.hidden = false; Promise.all(pend.map((c) => garantirCriada(c))).then(() => { chipLugar.hidden = true; buscar(texto); }); return true; }
      if (investigarAssunto(texto)) return true;
    }   // MOTOR ÚNICO: pessoa, lugar, palavra, acontecimento, tema → as dez camadas
    if (buscarCamadas(q, 100)) return true;
    { const l = q.split(/\s+/).length > 1 || !livros.some((lv) => norm(lv.nome).startsWith(q)) ? lugarNaFrase(q) : null;
      if (l) { const palavras = q.split(/[^a-z0-9]+/).filter((w) => w && !norm(l.nome).split(/\s+/).includes(w) && lev(w, norm(l.nome)) > 2); voarParaLugar(l, palavras); return true; } }
    const iL = livros.findIndex((lv) => norm(lv.nome) === q || norm(lv.abbrev) === q);
    const iL2 = iL >= 0 ? iL : livros.findIndex((lv) => q.length >= 3 && norm(lv.nome).startsWith(q));
    if (iL2 >= 0) { comporLivro(iL2); return true; }
    if (atlasC) { const cand = atlasC.lugares.filter((l) => norm(l.nome) === q || norm(l.en) === q).sort((a, b) => b.peso - a.peso); if (cand.length) { escolherLugar(cand[0]); return true; } }
    const si = SECOES.findIndex((x) => norm(x.nome).includes(q));
    if (si >= 0) { comporSecao(si); return true; }
    if (buscarCamadas(q, 1)) return true;
    chipLugar.innerHTML = `Não encontrei “${esc(texto)}” nas camadas (livro, lugar ou seção). <button type="button" aria-label="Fechar">×</button>`; chipLugar.hidden = false;
    chipLugar.querySelector('button').onclick = () => { chipLugar.hidden = true; };
    return false;
  }
  const relogio = ui.querySelector('.cu-relogio');
  function atualizarRelogio() {
    if (!ceuR) return; const e = ceuR.estado(), d = new Date(Date.now() + e.desloc);
    const fmt = d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const lua = e.luaFracao ? `Lua ${Math.round(e.luaFracao * 100)}% iluminada${e.luaAlt > 0 ? '' : ' (abaixo do horizonte)'}` : '';
    const dia = e.solAlt > 0 ? ' · é dia: o céu azul apaga as estrelas (arraste a barra para a noite)' : e.solAlt > -18 ? ' · crepúsculo' : '';
    relogio.querySelector('.cu-hora').innerHTML = `${e.desloc ? '🕒 ' : '🔴 Ao vivo · '}${fmt} · ${esc(e.local)}<small>${lua}${dia}</small>`;
  }
  relogio.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tempo]'); if (!b || !ceuR) return;
    const v = b.dataset.tempo; let ms = ceuR.desloc();
    if (v === 'agora') ms = 0;
    else if (v === 'local') { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { ceuR.local(p.coords.latitude, p.coords.longitude, 'sua localização'); atualizarRelogio(); }, () => {}, { maximumAge: 600000, timeout: 8000 }); return; }
    else ms += (+v) * 60000;
    relogio.querySelector('[data-tempo="barra"]').value = Math.round(ms / 60000); ceuR.tempo(ms); atualizarRelogio();
  });
  relogio.querySelector('[data-tempo="barra"]').addEventListener('input', (e) => { if (ceuR) { ceuR.tempo((+e.target.value) * 60000); atualizarRelogio(); } });
  setInterval(atualizarRelogio, 20000);
  ui.querySelector('.cu-busca').addEventListener('submit', (e) => { e.preventDefault(); buscar(e.target.querySelector('input').value); interagiu = true; });
  // lugar sob o ponteiro (camada Atlas, por cima)
  function lugarPerto(px, py, raio) {
    if (!atlasC || !camada('atlas').visivel || camada('atlas').opacidade < 0.08) return -1;
    let m = -1, dm = raio * raio;
    // vários lugares juntos (de longe): fica o mais citado entre os que estão sob o ponteiro
    let pm = Infinity; const pesoConta = !modoTerra || modoTerra.alt > RAIO_GLOBO * 0.15; for (const l of atlasC.lugares) { const p = telaLugarV(l); if (!p) continue; const d = (p.x - px) ** 2 + (p.y - py) ** 2; const sc = pesoConta ? d / (1 + Math.log2(1 + l.peso)) : (d + 4) * (1 + 2 / (1 + Math.log2(1 + l.peso))); if (d < dm && sc < pm) { pm = sc; m = l.i; } }
    return m;
  }
  // painel das camadas (gerado a partir de CAMADAS: uma camada nova aparece aqui sozinha)
  const painelCamadas = ui.querySelector('.cu-camadas');
  function montarPainel() {
    painelCamadas.innerHTML = '<h4>Camadas</h4>' + CAMADAS.slice().reverse().map((c) => c.reservada ? `<div class="cu-camada cu-reservada" title="Camada reservada: será construída em seguida"><input type="checkbox" disabled aria-label="${esc(c.nome)} (em construção)"><label><i style="background:${c.cor}"></i>${esc(c.nome)}</label><small>em construção</small></div>` : `<div class="cu-camada"><input type="checkbox" data-vis="${c.id}" ${c.visivel ? 'checked' : ''} aria-label="Mostrar ${esc(c.nome)}"><label><i style="background:${c.cor}"></i>${esc(c.nome)}</label><input type="range" min="0" max="100" value="${Math.round(c.opacidade * 100)}" data-op="${c.id}" aria-label="Opacidade de ${esc(c.nome)}"></div>`).join('') +
      `<div class="cu-sep">Separação das folhas<input type="range" min="0" max="300" value="${Math.round(separacao * 100)}" data-sep="1" aria-label="Separação entre as camadas"></div>`;
  }
  function sincronizarPainel() { const r = painelCamadas.querySelector('[data-sep]'); if (r) r.value = Math.round(separacao * 100); }
  painelCamadas.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.vis) camada(t.dataset.vis).visivel = t.checked;
    if (t.dataset.op) camada(t.dataset.op).opacidade = +t.value / 100;
    if (t.dataset.sep) separacao = +t.value / 100;
  });
  montarPainel();
  if (matchMedia('(max-width: 760px)').matches) painelCamadas.hidden = true;
  // fios de luz entre as camadas (lugar no Atlas -> versículo na Bíblia)
  const MAX_FIOS = 160;
  const gFio = new THREE.BufferGeometry();
  gFio.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_FIOS * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gFio.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_FIOS * 2), 1).setUsage(THREE.DynamicDrawUsage));
  const fiosObj = new THREE.LineSegments(gFio, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { tempo: { value: 0 } },
    vertexShader: 'attribute float alfa; varying float a; varying float h; void main(){ a = alfa; h = position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float a; varying float h; void main(){ gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * a, a); }' }));
  fiosObj.frustumCulled = false; fiosObj.renderOrder = 25; cena.add(fiosObj);
  function atualizarFios(t) {
    const pa = gFio.attributes.position, al = gFio.attributes.alfa; let n = 0;
    if (modoTerra) { for (let i = 0; i < MAX_FIOS; i++) { al.setX(i * 2, 0); al.setX(i * 2 + 1, 0); } al.needsUpdate = true; return; }   // na Terra não há fios para as outras folhas
    const mostrar = atlasC && camada('atlas').visivel && camada('biblia').visivel;
    if (mostrar) {
      for (const f of fios) {
        if (n >= MAX_FIOS) break; const l = atlasC.lugares[f.l]; if (!l || f.j == null) continue;
        const w = lugarPos(l); pa.setXYZ(n * 2, w.x, w.y, w.z); pa.setXYZ(n * 2 + 1, vPos[f.j * 3], vPos[f.j * 3 + 1], zB);
        const a = 0.5 * Math.min(camada('atlas').opacidade + 0.3, 1) * (0.75 + 0.25 * Math.sin(t / 300 + n));
        al.setX(n * 2, a); al.setX(n * 2 + 1, a * 0.55); n++;
      }
    }
    if (camada('biblia').visivel) for (const f of fiosCamada) {
      if (n >= MAX_FIOS) break; if (!f.c.grupo.visible) continue; const p = f.c.api.pos(f.i); if (!p) continue;
      pa.setXYZ(n * 2, p.x, p.y, f.c.z); pa.setXYZ(n * 2 + 1, vPos[f.j * 3], vPos[f.j * 3 + 1], zB);
      const a = 0.42 * Math.min(f.c.opacidade + 0.3, 1) * (0.75 + 0.25 * Math.sin(t / 300 + n)); al.setX(n * 2, a); al.setX(n * 2 + 1, a * 0.5); n++;
    }
    for (const f of fiosEntre) {
      if (n >= MAX_FIOS) break; if (!f.c.grupo.visible || !f.c2.grupo.visible) continue; const p = f.c.api.pos(f.i), q = f.c2.api.pos(f.i2); if (!p || !q) continue;
      pa.setXYZ(n * 2, p.x, p.y, f.c.z); pa.setXYZ(n * 2 + 1, q.x, q.y, f.c2.z);
      const a = 0.55 * (0.7 + 0.3 * Math.sin(t / 260 + n)); al.setX(n * 2, a); al.setX(n * 2 + 1, a * 0.8); n++;
    }
    for (let i = n; i < MAX_FIOS; i++) { al.setX(i * 2, 0); al.setX(i * 2 + 1, 0); }
    pa.needsUpdate = al.needsUpdate = true;
  }
  // aplica visibilidade, altura e opacidade de cada camada (chamado a cada quadro)
  function aplicarCamadas() {
    espaco = 1800 * separacao;   // altura fixa entre as folhas (o globo e as galáxias não andam quando se dá zoom)
    CAMADAS.forEach((c, i) => {
      c.z = i <= 2 ? i * espaco : 2 * espaco + (i - 2) * espaco * 0.5; c.grupo.position.z = c.z;   // 4 em diante: folhas mais próximas (a perspectiva não as espalha demais)
      const vis = c.visivel && c.opacidade > 0.01;
      const criada = !c.criar || c.criada;
      if (vis && !criada) garantirCriada(c);
      c.grupo.visible = vis && criada && (!modoTerra || c.id === 'atlas');   // modo Terra: um mundo à parte (só o globo e o céu)
    });
    zB = camada('biblia').z; zA = camada('atlas').z;
    for (const c of CAMADAS) {
      if (!c.grupo.visible) continue;                                     // desligada: custo zero
      if (c.propria) { if (c.id === 'atlas' && atlasC) atlasC.opacidade(modoTerra ? 1 : c.opacidade); continue; }   // na Terra o globo fica inteiro
      if (!c.animada && !c._sujo && c._op === c.opacidade) continue;       // nada mudou
      c._op = c.opacidade; c._sujo = false;
      c.grupo.traverse((o) => { const m = o.material; if (!m) return; if (m.isShaderMaterial) { if (!m.uniforms.opac) m.uniforms.opac = { value: 1 }; m.uniforms.opac.value = c.opacidade; } else { if (m.userData.base == null) m.userData.base = m.opacity; m.transparent = true; m.opacity = m.userData.base * c.opacidade; } });
    }
    if (precisaOpac) { precisaOpac = false; cena.traverse((o) => { const m = o.material; if (m && m.isShaderMaterial && !m.uniforms.opac) m.uniforms.opac = { value: 1 }; }); }
  }
  // orçamento de quadro: resolução interna adaptativa
  let somaMs = 0, nQ = 0, resAtual = escala;
  function orcamento(dt) {
    somaMs += dt; nQ++;
    if (nQ < 90) return;
    const media = somaMs / nQ; somaMs = 0; nQ = 0;
    if (media > 22 && resAtual > 1) { resAtual = Math.max(1, resAtual - 0.25); renderer.setPixelRatio(resAtual); ajustar(); }
    else if (media < 14 && resAtual < escala) { resAtual = Math.min(escala, resAtual + 0.25); renderer.setPixelRatio(resAtual); ajustar(); }
  }

  // ── rótulos em camadas (conforme o zoom e o espaço) ─────────────────────────────
  const nivelEl = ui.querySelector('.cu-nivel');
  nivelEl.addEventListener('click', (e) => { const b = e.target.closest('[data-mig]'); if (!b) return; const m = b.dataset.mig;
    if (m === 'geral') vistaGeral(); else if (m === 'sec') { const q = secoes[+b.dataset.i]; voar(q.cx, q.cy, q.raio * 3.4); } else { const lv = livros[+b.dataset.i - 1]; voar(lv.cx, lv.cy, lv.raio * 4.2); } });
  function rotulos(t) {
    g2.setTransform(escala, 0, 0, escala, 0, 0); g2.clearRect(0, 0, W, H);
    const ocup = [];
    const cabe = (b) => !ocup.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    // LEITURA: de bem perto, o capítulo inteiro aparece num painel (a Bíblia toda pode ser lida no universo); os rótulos desviam dele
    const vU = !modoTerra && camada('universo').visivel && camada('universo').opacidade > 0.1, vB = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;   // perto da Terra, só a Terra fala   // rótulos seguem a camada
    const caixaLeitura = vB || pergFixo ? leitura(t) : null; if (caixaLeitura) ocup.push(caixaLeitura);
    if (!vB && !pergFixo && !pergaminho.hidden) { pergaminho.hidden = true; pergAssin = ''; }
    const longeT = Math.max(0, (dist - 26000) / 60000), escT = Math.max(0.45, 1 - longeT * 0.6), someT = Math.max(0, 1 - longeT * 1.1);   // de muito longe as letras diminuem e somem
    const texto = (txt, x, y, fonte, cor, fundo, alfa = 1, centro = true) => {
      if (someT <= 0.02) return false; if (escT < 1) fonte = fonte.replace(/(\d+(?:\.\d+)?)px/, (m0, v) => (v * escT).toFixed(1) + 'px'); alfa *= someT;
      g2.font = fonte; const w = g2.measureText(txt).width; const x0 = centro ? x - w / 2 : x;
      const tam = parseFloat(fonte.split('px')[0].split(' ').pop()) || 12, alt = tam + 9;
      const b = { x0: x0 - 7, x1: x0 + w + 7, y0: y - alt / 2, y1: y + alt / 2 }; if (!cabe(b)) return false; ocup.push(b);
      g2.globalAlpha = alfa;
      g2.fillStyle = fundo || 'rgba(2,5,14,.62)'; g2.beginPath(); if (g2.roundRect) g2.roundRect(b.x0, b.y0, b.x1 - b.x0, alt, alt / 2); else g2.rect(b.x0, b.y0, b.x1 - b.x0, alt); g2.fill();
      g2.textAlign = 'left'; g2.textBaseline = 'middle';
      g2.lineWidth = 3; g2.strokeStyle = 'rgba(0,0,0,.85)'; g2.lineJoin = 'round'; g2.strokeText(txt, x0, y);
      g2.fillStyle = cor; g2.fillText(txt, x0, y); g2.globalAlpha = 1; return b;
    };
    // destaques primeiro: a constelação ativa
    if (constel && vB) {
      const fade = constel.soltoEm ? Math.max(0, 1 - (t - constel.soltoEm) / 2600) : 1;
      const p0 = tela(vPos[constel.idx * 3], vPos[constel.idx * 3 + 1]);
      if (p0) texto(nomeRef(constel.origem), p0.x + 10, p0.y - 12, '700 14px Inter, system-ui, sans-serif', '#FFF6DC', 'rgba(2,5,14,.78)', fade, false);
      constel.alvos.forEach((a) => { if (t < a.inicio + 300) return; const p = tela(vPos[a.idx * 3], vPos[a.idx * 3 + 1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) texto(nomeRef(a.k), p.x + 8, p.y, '600 13px Inter, system-ui, sans-serif', '#FFE8B0', null, fade, false); });
    }
    if (vB && realceLugar.size && dist < 6000) { let nL = 0; for (const j of realceLugar) { if (nL >= 28) break; const p = tela(vPos[j * 3], vPos[j * 3 + 1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(nomeRef(vChave[j]), p.x + 8, p.y, '600 12.5px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(40,28,6,.75)', 1, false)) nL++; } }
    if (atlasC && camada('atlas').visivel && camada('atlas').opacidade > 0.15) {
      const aces = atlasC.acesos();
      const fontL = '700 13px "Cormorant Garamond", Georgia, serif';
      let nA = 0; for (const li of aces) { if (nA >= 26) break; const l = atlasC.lugares[li]; const p = telaLugarV(l); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(l.nome, p.x + 8, p.y, fontL, '#FFF0C8', 'rgba(40,28,6,.8)', 1, false)) nA++; }
      if (!aces.size && (modoTerra || dist < 16000)) { if (!ordemLug) ordemLug = atlasC.lugares.slice().sort((a, b) => b.peso - a.peso); let nB = 0; const lim = modoTerra ? Math.round(10 + 3 * RAIO_GLOBO / Math.max(modoTerra.alt, 1)) : Math.round(8 + 60000 / dist); for (const l of ordemLug) { if (nB >= Math.min(lim, 40)) break; const p = telaLugarV(l); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(l.nome, p.x + 7, p.y, '600 12px "Cormorant Garamond", Georgia, serif', '#FFE3A3', 'rgba(20,14,2,.6)', 0.9 * Math.min(1, camada('atlas').opacidade + 0.2), false)) nB++; } }
    }
    if (investigacao) {   // investigação: só os achados ganham nome (sem poluição), com a cor da lâmina
      for (const id of ORDEM_FOLHAS) { const L = investigacao.F[id], c = camada(id); if (!L || !c || !c.grupo.visible) continue;
        L.slice(0, 4).forEach((x) => { let q = null; const a = x.acao;
          if (a.c) { const p0 = c.api.pos(a.i); q = p0 && tela(p0.x, p0.y, c.z); } else if (a.verso) { const j = vIdx.get(a.verso); q = j != null && tela(vPos[j * 3], vPos[j * 3 + 1]); } else if (a.lugar != null && atlasC) q = telaLugarV(atlasC.lugares[a.lugar]);
          if (q && q.x > 0 && q.x < W && q.y > 0 && q.y < H) texto(x.rot, q.x + 9, q.y - 9, '600 12.5px Inter, system-ui, sans-serif', c.cor, 'rgba(2,5,14,.78)', 1, false); }); }
    } else if (dist < 4500) for (const c of camadasAtivas()) c.api.rotulos(texto, dist, W, H);   // de longe, sem nomes soltos: só o título de cada lâmina
    // satélites (com PIN) quando perto
    const kAtivo = constel && !constel.soltoEm ? constel.origem : selecionado;
    let nSat = 0;
    if (vB && dist < 900) sats.forEach((s) => { if (nSat >= 36 || (s.k !== kAtivo && dist > 260)) return; const p = tela(s.x, s.y, zB + 1); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) { nSat++; const r = String(s.rotulo); texto(r.length > 30 ? r.slice(0, 28) + '…' : r, p.x + 9, p.y, '600 12.5px Inter, system-ui, sans-serif', '#DDF7F3', null, 1, false); } });
    if (vU && ceuR) ceuR.rotulos((txt, x, y, forte) => { if (x > 0 && x < W && y > 0 && y < H) texto(txt, x, y, forte ? '600 12.5px Inter, system-ui, sans-serif' : '500 11.5px Inter, system-ui, sans-serif', forte ? '#FFF6DC' : 'rgba(235,238,248,.85)', 'rgba(2,5,14,.55)', 0.95, false); }, W, H);
    let nivel;
    if (dist > 9000) {   // REGIÕES
      nivel = 'Universo · regiões do cânon';
      const a = Math.min(1, (dist - 9000) / 4000) * 0.55 + 0.25;
      caixasRegiao = [];
      if (vB) secoes.forEach((sc, si) => {   // livros da região revelada: surgem em roda, a partir do centro onde estava o nome
        const rv = revela[si]; if (rv < 0.15) return; const c = tela(sc.cx, sc.cy, zB); if (!c) return;
        const lvs = livros.filter((lv) => lv.sec === sc), n = lvs.length, raioT = (60 + n * 9) * (0.4 + 0.6 * rv);
        lvs.forEach((lv, k) => {
          const ang = -Math.PI / 2 + (k / n) * Math.PI * 2, lx = c.x + Math.cos(ang) * raioT * (n > 6 ? 1.25 : 1), ly = c.y + Math.sin(ang) * raioT * 0.72;
          const g = tela(lv.cx, lv.cy, zB);
          if (g) { g2.globalAlpha = rv * 0.5; g2.strokeStyle = 'rgba(233,210,150,.6)'; g2.lineWidth = 1; g2.setLineDash([2, 3]); g2.beginPath(); g2.moveTo(g.x, g.y); g2.lineTo(lx, ly); g2.stroke(); g2.setLineDash([]); g2.globalAlpha = 1; }
          texto(lv.nome, lx, ly, '600 13px Inter, system-ui, sans-serif', '#F7F2E0', 'rgba(2,5,14,.72)', Math.min(1, (rv - 0.15) / 0.6));
        });
      });
      if (vU) secoes.forEach((s, si) => { const p = tela(s.cx, s.cy, zB); if (!p) return; const some = 1 - revela[si]; g2.font = '700 19px "Cormorant Garamond", Georgia, serif'; const meia = g2.measureText(s.nome.toUpperCase()).width / 2 + 8; caixasRegiao.push({ x0: p.x - meia, x1: p.x + meia, y0: p.y - 14, y1: p.y + 14, i: si, cx: p.x, cy: p.y }); if (some < 0.03) return; texto(s.nome.toUpperCase(), p.x, p.y, '700 19px "Cormorant Garamond", Georgia, serif', '#FFE8B0', 'rgba(2,5,14,.55)', a * some); });   // o nome dissolve e os livros surgem no mesmo lugar
    } else if (dist > 2200) {   // GALÁXIAS (livros)
      nivel = 'Galáxias · livros';
      if (vB) livros.forEach((lv) => { const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p && p.x > -80 && p.x < W + 80 && p.y > -30 && p.y < H + 30) texto(lv.nome, p.x, p.y, '700 17px "Cormorant Garamond", Georgia, serif', '#FFE8B0', 'rgba(2,5,14,.7)', 1); });
      if (vU) secoes.forEach((s) => { const p = tela(s.cx, s.cy - s.raio * 1.05, 0); if (p) texto(s.nome.toUpperCase(), p.x, p.y, '700 14px "Cormorant Garamond", Georgia, serif', '#E9D6A6', 'rgba(2,5,14,.5)', 0.9); });
    } else if (dist > 520) {   // CONSTELAÇÕES (capítulos)
      nivel = 'Constelações · capítulos';
      let n = 0;
      for (const lv of livros) {
        if (!vB || Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 1.6 + lv.raio) continue;
        const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p) texto(lv.nome, p.x, p.y, '700 17px "Cormorant Garamond", Georgia, serif', '#FFE8B0', 'rgba(2,5,14,.7)', 1);
        for (const c of lv.capPos) { if (n > 46) break; const q = tela(c.x, c.y); if (q && q.x > 40 && q.x < W - 40 && q.y > 30 && q.y < H - 30 && Math.hypot(q.x - W / 2, q.y - H / 2) < Math.max(W, H) * 0.42 && texto(String(c.c), q.x, q.y - 14, '600 11.5px Inter, system-ui, sans-serif', 'rgba(240,228,196,.9)', 'rgba(2,5,14,.35)', 0.9)) n++; }
      }
    } else {   // ESTRELAS (versículos)
      nivel = 'Estrelas · versículos';
      let n = 0;
      for (const lv of livros) {
        if (!vB || Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 2 + lv.raio) continue;
        const inicio = vIdx.get(chave(lv.num, 1, 1));
        for (let j = inicio; j < inicio + lv.versos && n < 70; j++) {
          const p = tela(vPos[j * 3], vPos[j * 3 + 1]); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
          const d = decompor(vChave[j]); const tv = dist < 300 ? textoDe(vChave[j]) : '';
          const rotuloV = `${lv.abbrev.toUpperCase()} ${d.c}:${d.v}` + (tv ? '  ' + (tv.length > 46 ? tv.slice(0, 44) + '…' : tv) : '');
          if (texto(rotuloV, p.x + 8, p.y, '600 12.5px Inter, system-ui, sans-serif', '#FFFFFF', null, 1, false)) n++;
        }
      }
    }
    desenharLigacoesLivro(t, texto);
    // a passagem em foco: farol discreto
    const qf = lerId(estado.foco);
    if (vB && qf && vIdx.has(qf.ini)) {
      const j = vIdx.get(qf.ini), p = tela(vPos[j * 3], vPos[j * 3 + 1]);
      if (p) { const pulso = 9 + Math.sin(t / 380) * 3; g2.strokeStyle = 'rgba(242,214,140,.75)'; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(p.x, p.y, pulso, 0, 6.29); g2.stroke(); if (dist > 520) texto(nomeRef(qf.ini), p.x + 14, p.y - 10, '700 13px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(2,5,14,.78)', 1, false); }
    }
    if (investigacao && !jornada && modoTerra && atlasC && investigacao.F.atlas) {
      investigacao.F.atlas.forEach((x) => { const l = atlasC.lugares[x.acao.lugar], p = telaLugarV(l); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) return; const eh = l.i === investigacao.principal;
        g2.save(); g2.beginPath(); g2.arc(p.x, p.y, eh ? 12 : 8, 0, 6.29); g2.strokeStyle = eh ? '#FFE3A3' : 'rgba(233,200,120,.85)'; g2.lineWidth = eh ? 3 : 2; if (x.conf === 'incerta') g2.setLineDash([4, 4]); g2.stroke(); g2.restore();
        texto(l.nome + (x.conf === 'incerta' ? ' (incerto)' : ''), p.x + (eh ? 24 : 18), p.y, (eh ? '800 14px' : '600 12.5px') + ' Inter, system-ui, sans-serif', eh ? '#FFFFFF' : '#FFE8B0', 'rgba(20,12,2,.82)', 1, false); });
    }
    if (jornada && atlasC && camada('atlas').visivel && jornada.rota.length > 1) {
      const atual = jornada.passos[jornada.n].lugarVoo;
      jornada.rota.forEach((r, k) => { const l = atlasC.lugares[r.li], p = telaLugarV(l); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) return; const eh = r.li === atual;
        g2.save(); g2.beginPath(); g2.arc(p.x, p.y, eh ? 13 : 10, 0, 6.29); g2.fillStyle = eh ? '#FFE3A3' : 'rgba(201,162,78,.9)'; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = 'rgba(20,12,2,.9)'; g2.stroke();
        g2.fillStyle = '#1B1405'; g2.font = '800 11px Inter, system-ui, sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(String(k + 1), p.x, p.y + 0.5); g2.restore();
        texto(l.nome, p.x + 16, p.y, (eh ? '800 13px' : '600 12px') + ' Inter, system-ui, sans-serif', eh ? '#FFFFFF' : '#FFE8B0', 'rgba(20,12,2,.82)', 1, false); });
    }
    if (laminasVis && laminas) for (const l of laminas) { if (!l.c.grupo.visible) continue; const p = tela(l.x0, l.y1, l.c.z); if (p && p.x > -40 && p.x < W && p.y > 0 && p.y < H) texto(`${String(l.num).padStart(2, '0')} · ${l.c.nome.toUpperCase()}`, p.x + 10, p.y + 12, '700 12px Inter, system-ui, sans-serif', l.c.cor, 'rgba(2,5,14,.7)', 0.95, false); }
    if (investigacao && investigacao.lugarIncerto && atlasC && camada('atlas').visivel) {   // local incerto: círculo tracejado, não ponto comprovado
      const l = investigacao.lugarIncerto, p = telaLugarV(l);
      if (p) { const r = 22 + 5 * Math.sin(t / 400); g2.save(); g2.setLineDash([5, 5]); g2.lineWidth = 1.6; g2.strokeStyle = 'rgba(255,214,140,.95)'; g2.beginPath(); g2.arc(p.x, p.y, r, 0, 6.29); g2.stroke(); g2.beginPath(); g2.arc(p.x, p.y, r * 1.9, 0, 6.29); g2.strokeStyle = 'rgba(255,214,140,.4)'; g2.stroke(); g2.restore();
        texto(`${l.nome}? · localização incerta (${l.conf}/1000)`, p.x + r * 1.9 + 6, p.y, '700 12.5px Inter, system-ui, sans-serif', '#FFE3A3', 'rgba(40,24,4,.85)', 1, false); }
    }
    if (modoTerra) nivel = 'Terra · ' + (modoTerra.alt > RAIO_GLOBO * 0.6 ? 'o globo' : modoTerra.alt > RAIO_GLOBO * 0.05 ? 'regiões' : 'cidades e lugares');
    let migalha = '';
    if (!modoTerra && secoes.length) {
      const lvP = dist < 9000 ? livros.reduce((m, lv) => { const d = Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) / lv.raio; return d < 1.6 && (!m || d < m.d) ? { lv, d } : m; }, null) : null;
      const secP = lvP ? lvP.lv.sec : (dist < 16000 ? secoes.reduce((m, q) => { const d = Math.hypot(q.cx - alvo.x, q.cy - alvo.y) / q.raio; return d < 1.3 && (!m || d < m.d) ? { q, d } : m; }, null)?.q : null);
      const partes = ['<button type="button" data-mig="geral">Universo</button>'];
      if (secP) partes.push(`<button type="button" data-mig="sec" data-i="${secoes.indexOf(secP)}">${esc(secP.nome)}</button>`);
      if (lvP) partes.push(`<button type="button" data-mig="livro" data-i="${lvP.lv.num}">${esc(lvP.lv.nome)}</button>`);
      if (lvP && dist <= 520 && leituraCap && leituraCap.b === lvP.lv.num) partes.push(`<span>cap. ${leituraCap.c}</span>`);
      migalha = partes.join('<i>›</i>') + (partes.length > 1 || !/^Universo/.test(nivel) ? `<em>${esc(nivel)}</em>` : '<em>regiões do cânon</em>');
    } else migalha = esc(nivel);
    if (nivelEl.dataset.m !== migalha) { nivelEl.dataset.m = migalha; nivelEl.innerHTML = migalha; }
  }

  // livros ligados pelas mesmas pessoas (camada Personagens: Theographic, versículo a versículo)
  let pessoasPorLivro = null, ligLivroCache = new Map();
  function livrosLigados(lv) {
    const cp = camada('personagens'); if (!cp) return null;
    if (!cp.criada) { if (!cp._prom) garantirCriada(cp); return null; }
    if (!cp.api || !cp.api.pessoas) return null;
    if (!pessoasPorLivro) { pessoasPorLivro = livros.map(() => new Set()); cp.api.pessoas.forEach((pe, ip) => { for (const k of pe.v || []) { const b = decompor(k).b; if (pessoasPorLivro[b - 1]) pessoasPorLivro[b - 1].add(ip); } }); }
    if (ligLivroCache.has(lv.num)) return ligLivroCache.get(lv.num);
    const meu = pessoasPorLivro[lv.num - 1], res = [];
    livros.forEach((o) => { if (o === lv) return; let n = 0; for (const ip of pessoasPorLivro[o.num - 1]) if (meu.has(ip)) n++; if (n >= 3) res.push({ lv: o, n }); });
    res.sort((a, b) => b.n - a.n); const top = res.slice(0, 7); ligLivroCache.set(lv.num, top); return top;
  }
  function desenharLigacoesLivro(t, texto) {
    const lv = sobreLivro; if (!lv || modoTerra || dist < 1200 || longeR() > 0.5 && revela[secoes.indexOf(lv.sec)] < 0.3) return;
    const lig = livrosLigados(lv); if (!lig || !lig.length) return; const p0 = tela(lv.cx, lv.cy); if (!p0) return;
    const mx = lig[0].n;
    lig.forEach((L, k) => { const p1 = tela(L.lv.cx, L.lv.cy); if (!p1) return; const forca = 0.35 + 0.65 * L.n / mx;
      const mxp = (p0.x + p1.x) / 2, myp = (p0.y + p1.y) / 2, dx = p1.x - p0.x, dy = p1.y - p0.y, cx = mxp - dy * 0.18, cy = myp + dx * 0.18;
      g2.save(); g2.globalAlpha = 0.25 + 0.55 * forca; g2.strokeStyle = '#F3D38E'; g2.lineWidth = 1 + 2.2 * forca; g2.setLineDash([2, 6]); g2.lineDashOffset = -t / 40;
      g2.beginPath(); g2.moveTo(p0.x, p0.y); g2.quadraticCurveTo(cx, cy, p1.x, p1.y); g2.stroke(); g2.setLineDash([]);
      const f = ((t / 1800) + k / 7) % 1, u = 1 - f, px = u * u * p0.x + 2 * u * f * cx + f * f * p1.x, py = u * u * p0.y + 2 * u * f * cy + f * f * p1.y;   // partícula correndo pelo fio
      g2.globalAlpha = Math.sin(f * Math.PI); g2.fillStyle = '#FFF3D0'; g2.beginPath(); g2.arc(px, py, 2.4, 0, 6.29); g2.fill(); g2.restore();
      const dentro = p1.x > 90 && p1.x < W - 300 && p1.y > 60 && p1.y < H - 60;
      if (dentro) texto(`${L.lv.nome} · ${L.n} pessoas em comum`, p1.x, p1.y + 18, '600 12px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(2,5,14,.78)', 0.95);
      else { const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x), mx2 = Math.max(150, Math.min(W - 420, p0.x + Math.cos(ang) * 2000)), my2 = Math.max(70, Math.min(H - 70, p0.y + Math.sin(ang) * 2000)); const seta = Math.abs(Math.cos(ang)) > 0.5 ? (Math.cos(ang) > 0 ? '→' : '←') : (Math.sin(ang) > 0 ? '↓' : '↑');
        texto(`${seta} ${L.lv.nome} · ${L.n} pessoas em comum`, mx2, my2 + k * 0, '600 12px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(2,5,14,.85)', 0.95); } });
    texto(`${lv.nome}: ligado a outros livros pelas mesmas pessoas (camada Personagens)`, p0.x, p0.y + lv.raio * 0 + 34, '700 12.5px Inter, system-ui, sans-serif', '#FFFFFF', 'rgba(20,14,4,.85)', 1);
  }
  // ── leitura do capítulo (perto) ───────────────────────────────────────────────
  function quebrar(txt, largura) { const out = []; let linha = ''; for (const p of String(txt).split(' ')) { const t2 = linha ? linha + ' ' + p : p; if (g2.measureText(t2).width > largura && linha) { out.push(linha); linha = p; } else linha = t2; } if (linha) out.push(linha); return out; }
  // LEITURA EM PERGAMINHO: fundo claro, letra grande e escura (o texto bíblico precisa ser lido, não decifrado).
  // Abre sozinho quando se chega bem perto de um capítulo, ou fixo pelo botão "Ler o capítulo" (jornada, fichas).
  const pergaminho = document.createElement('div'); pergaminho.className = 'cu-pergaminho'; pergaminho.hidden = true; ui.appendChild(pergaminho);
  let pergFixo = null, pergAssin = '';
  function desenharPergaminho(b, c, destaques, fixo) {
    const lv = livros[b - 1]; if (!lv || !BIB[b - 1].chapters[c - 1]) { pergaminho.hidden = true; return; }
    const versos = BIB[b - 1].chapters[c - 1], dest = new Set(destaques || []);
    const assin = b + ':' + c + ':' + [...dest].join(',') + ':' + !!fixo; if (assin === pergAssin && !pergaminho.hidden) return; pergAssin = assin;
    pergaminho.innerHTML = `<div class="cu-perg-rolo"></div><div class="cu-perg-cab"><button type="button" data-perg="ant" aria-label="Capítulo anterior" ${c <= 1 ? 'disabled' : ''}>‹</button><h3>${esc(lv.nome)} ${c}</h3><button type="button" data-perg="prox" aria-label="Próximo capítulo" ${c >= BIB[b - 1].chapters.length ? 'disabled' : ''}>›</button>${fixo ? '<button type="button" data-perg="fechar" class="cu-perg-x" aria-label="Fechar">✕</button>' : ''}</div>
      <div class="cu-perg-texto">${versos.map((t, i) => `<p class="${dest.has(chave(b, c, i + 1)) ? 'dest' : ''}" data-perg-v="${chave(b, c, i + 1)}"><sup>${i + 1}</sup>${esc(t)}</p>`).join('')}</div>
      <div class="cu-perg-pe">Almeida · ${versos.length} versículos</div><div class="cu-perg-rolo"></div>`;
    pergaminho.hidden = false; pergaminho.classList.toggle('fixo', !!fixo); pergaminho.dataset.b = b; pergaminho.dataset.c = c;
    const d = pergaminho.querySelector('p.dest'); if (d) setTimeout(() => d.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }
  function lerPergaminho(b, c, destaques) { pergFixo = { b, c, destaques: destaques || [] }; pergAssin = ''; desenharPergaminho(b, c, pergFixo.destaques, true); }
  pergaminho.addEventListener('click', (e) => {
    const bt = e.target.closest('[data-perg]'); if (bt) { const b = +pergaminho.dataset.b, c = +pergaminho.dataset.c, a = bt.dataset.perg;
      if (a === 'fechar') { pergFixo = null; pergaminho.hidden = true; pergAssin = ''; return; }
      const nc = a === 'ant' ? c - 1 : c + 1; if (pergFixo) { pergFixo = { b, c: nc, destaques: pergFixo.destaques }; desenharPergaminho(b, nc, pergFixo.destaques, true); } else { const cp = livros[b - 1].capPos[nc - 1]; if (cp) voar(cp.x, cp.y, Math.min(dist, 200)); } return; }
    const v = e.target.closest('[data-perg-v]'); if (v) { const k = +v.dataset.pergV; formar(k); abrirCartao(k); }
  });
  function leitura(t) {
    if (pergFixo) { desenharPergaminho(pergFixo.b, pergFixo.c, pergFixo.destaques, true); const r = pergaminho.getBoundingClientRect(), rc = canvas.getBoundingClientRect(); return { x0: r.left - rc.left, x1: r.right - rc.left, y0: r.top - rc.top, y1: r.bottom - rc.top }; }
    if (dist > 230 || !BIB || modoTerra || jornada) { leituraCap = null; if (!pergaminho.hidden) { pergaminho.hidden = true; pergAssin = ''; } return null; }
    let melhor = null, dm = Infinity;
    for (const lv of livros) { if (Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > lv.raio + dist * 2) continue; for (const c of lv.capPos) { const d = Math.hypot(c.x - alvo.x, c.y - alvo.y); if (d < dm) { dm = d; melhor = { lv, c }; } } }
    if (!melhor || dm > 80 + dist) { leituraCap = null; if (!pergaminho.hidden) { pergaminho.hidden = true; pergAssin = ''; } return null; }
    const { lv, c } = melhor; leituraCap = { b: lv.num, c: c.c };
    const kDest = constel && !constel.soltoEm ? constel.origem : selecionado;
    desenharPergaminho(lv.num, c.c, kDest ? [kDest] : [], false);
    const r = pergaminho.getBoundingClientRect(), rc = canvas.getBoundingClientRect();
    return { x0: r.left - rc.left, x1: r.right - rc.left, y0: r.top - rc.top, y1: r.bottom - rc.top };
  }
  let leituraCap = null, ordemLug = null;

  // ── laço ─────────────────────────────────────────────────────────────────────
  let ativo = false, quadro = 0, ultimo = performance.now(), pronto = false;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ajustar() { W = container.clientWidth || 1; H = container.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; posicionar(); rot.width = W * escala; rot.height = H * escala; }
  const obs = new ResizeObserver(() => ativo && ajustar()); obs.observe(container);
  const corOuro = new THREE.Color('#F3D38E'), corAzul = new THREE.Color('#9FC0FF');
  function quadroDesenho(t) {
    if (!ativo) return;
    const dtReal = t - ultimo, dt = Math.min(50, dtReal); ultimo = t; orcamento(dtReal);
    if (voo) {
      const q = Math.min(1, (t - voo.t0) / voo.dur), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      alvo.x = voo.de.x + (voo.para.x - voo.de.x) * e; alvo.y = voo.de.y + (voo.para.y - voo.de.y) * e;
      dist = Math.exp(Math.log(voo.de.d) + (Math.log(voo.para.d) - Math.log(voo.de.d)) * e); posicionar();
      if (q >= 1) voo = null;
    } else if (!arrasto && inercia.lengthSq() > 1e-4) { alvo.x += inercia.x * dt / 16; alvo.y += inercia.y * dt / 16; inercia.multiplyScalar(0.92); posicionar(); }
    if (zoomSuave && !modoTerra) { const passo = zoomSuave.log * Math.min(1, dt / 85); zoomEm(zoomSuave.x, zoomSuave.y, Math.exp(passo)); zoomSuave.log -= passo; if (Math.abs(zoomSuave.log) < 0.002) zoomSuave = null; }
    aplicarCamadas(); if (modoTerra && atlasC) { if (animarTerra()) posicionarTerra(); } else { alvo.z = zB; posicionar(); }
    if (transicao) { const q = Math.min(1, (performance.now() - transicao.t0) / 650), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; if (q >= 1) transicao = null; else { camera.position.lerpVectors(transicao.pos, camera.position.clone(), e); camera.quaternion.slerpQuaternions(transicao.quat, camera.quaternion.clone(), e); camera.updateMatrixWorld(); } }
    if (ceuR) ceuR.quadro(camera, t, alvo, modoTerra ? 26000 : dist, camada('universo').opacidade, camada('universo').visivel || !!modoTerra, !modoTerra || modoTerra.alt > RAIO_GLOBO * 0.02);   // o universo é visto do espaço: estrelas reais da hora, sem o azul do dia (só perto do chão, na Terra, o céu fica azul)   // na Terra, vista do espaço: céu negro com estrelas
    if (atlasC && t - solEm > 1000) { solEm = t; const ss = pontoSubsolar(Date.now() + (ceuR ? ceuR.estado().desloc || 0 : 0)); atlasC.sol(ss.lat, ss.lon);
      if (modoTerra) { const l = modoTerra; const dLon = ((l.lon - ss.lon + 540) % 360) - 180, cz = Math.sin(l.lat * Math.PI / 180) * Math.sin(ss.lat * Math.PI / 180) + Math.cos(l.lat * Math.PI / 180) * Math.cos(ss.lat * Math.PI / 180) * Math.cos(dLon * Math.PI / 180);
        faixaTerra.querySelector('.cu-terra-txt').textContent = `🌍 Terra · ${cz > 0.05 ? 'é dia' : cz > -0.1 ? 'crepúsculo' : 'é noite'} no centro da vista (${l.lat.toFixed(1)}°, ${l.lon.toFixed(1)}°) · ${atlasC.imagemReal() ? 'imagem de satélite NASA Blue Marble' : 'carregando imagem de satélite…'} · Sol ${ceuR && ceuR.estado().desloc ? 'da hora escolhida' : 'de agora'}`; } }
    faixaTerra.hidden = !modoTerra; document.body.classList.toggle('modo-terra', !!modoTerra);
    if (atlasC) atlasC.quadro(t, modoTerra ? Math.max(0.8, Math.min(2.4, Math.pow(RAIO_GLOBO / Math.max(modoTerra.alt, 1), 0.3))) : Math.max(0.6, Math.min(2.0, Math.pow(9000 / dist, 0.3))));
    const seg = reduzido ? 0 : t / 1000;
    fundoCamadas.forEach((m) => { m.uniforms.cam.value.set(alvo.x, alvo.y); m.uniforms.tempo.value = seg; });
    matVers.uniforms.k.value = 1; matVers.uniforms.tempo.value = seg; if (matVia) matVia.uniforms.tempo.value = seg;
    if (!reduzido) {
      galaxias.children.forEach((sp, i) => { sp.material.rotation += dt * 0.000035 * (i % 2 ? 1 : -1) * (1 + (i % 5) * 0.2); });
      viaLactea.children.forEach((sp, i) => { if (sp.isSprite) sp.material.userData.base = 0.16 + 0.06 * Math.sin(seg * 0.3 + i); });
      // estrela cadente de vez em quando, dentro da vista
      if (!cad && t > proxCad) { const w = dist * 0.8, a = -0.6 - Math.random() * 0.5; cad = { x: alvo.x + (Math.random() - 0.3) * w, y: alvo.y + (Math.random() * 0.6) * w, dx: Math.cos(a) * dist * 0.5, dy: Math.sin(a) * dist * 0.5, t0: t }; }
      const ca = gCad.attributes.position, cl = gCad.attributes.alfa;
      if (cad) { const q = (t - cad.t0) / 900; if (q >= 1) { cad = null; proxCad = t + 6000 + Math.random() * 9000; cl.setX(0, 0); cl.setX(1, 0); } else { const hx = cad.x + cad.dx * q, hy = cad.y + cad.dy * q; ca.setXYZ(0, hx - cad.dx * 0.25, hy - cad.dy * 0.25, -50); ca.setXYZ(1, hx, hy, -50); cl.setX(0, 0); cl.setX(1, Math.sin(q * Math.PI) * 0.9); } ca.needsUpdate = cl.needsUpdate = true; }
    }
    // galáxias e nebulosas: fortes de longe, somem perto
    const longe = Math.min(1, Math.max(0, (dist - 900) / 6000));
    const resp = reduzido ? 1 : 1;
    if (secRevelada != null && performance.now() > revelaAte) secRevelada = null;
    for (let i = 0; i < 10; i++) revela[i] += ((secRevelada === i ? 1 : 0) - revela[i]) * Math.min(1, dt / 180);
    matVers.uniforms.longeR.value = longeR(); for (let i = 0; i < 10; i++) matVers.uniforms.revela.value[i] = revela[i];
    galaxias.children.forEach((sp, i) => { const lv = livros[i]; const rvL = revela[secoes.indexOf(lv.sec)], fatR = Math.max(0.42, 1 - longeR() * (1 - rvL)); const esc2 = lv.raio * 2.9 * (0.35 + 0.65 * fatR); sp.scale.set(esc2, esc2, 1); sp.visible = fatR > 0.02;
      const foco = sobreLivro === lv ? 0.55 : 0; const pulso = reduzido ? 0 : 0.06 * Math.sin(t / 1000 * 0.8 + i * 1.7); const bb = sp.material.userData.base ?? 0.5; sp.material.userData.base = (bb + ((0.12 + 0.5 * longe + foco + pulso + (livroAtivo === i ? 0.6 : 0)) - bb) * 0.12); sp.material.opacity = sp.material.userData.base * fatR * camada('biblia').opacidade; });
    nebulosas.children.forEach((sp, i) => { sp.material.userData.base = (0.035 + 0.1 * longe) * (reduzido ? 1 : 0.8 + 0.2 * Math.sin(t / 1000 * 0.25 + i * 0.9)) * (secAtiva != null && sp.userData.secao === secAtiva ? 3.2 : 1); });
    if (pronto) {
      // constelação: estrelas ligadas brilham e se aproximam um pouco; linhas acendem em sequência
      const lp = gLin.attributes.position, la = gLin.attributes.alfa, lc = gLin.attributes.cor;
      const pp = gPart.attributes.position, pa = gPart.attributes.alfa;
      const bri = gVers.attributes.brilho, pos = gVers.attributes.position;
      if (tocados.size) { for (const j of tocados) { vBri[j] = vBriBase[j]; vPos[j * 3] = vBase[j * 3]; vPos[j * 3 + 1] = vBase[j * 3 + 1]; } tocados.clear(); }
      if (realceLugar.size) { const pul = 1.7 + 0.25 * Math.sin(t / 260); for (const j of realceLugar) { vBri[j] = pul; tocados.add(j); } }
      if (realceLivro.size) { const pul = 1.35 + 0.12 * Math.sin(t / 400); for (const j of realceLivro) { vBri[j] = pul; tocados.add(j); } }
      if (realceCamada.size) { const pul = 1.6 + 0.2 * Math.sin(t / 300); for (const j of realceCamada) { vBri[j] = pul; tocados.add(j); } }
      let nl = 0, np = 0;
      if (constel) {
        const fade = constel.soltoEm ? Math.max(0, 1 - (t - constel.soltoEm) / 2600) : 1;
        if (fade <= 0) constel = null;
        else {
          const o = constel.idx, ox = vBase[o * 3], oy = vBase[o * 3 + 1];
          vBri[o] = 2.2; tocados.add(o);
          const forma = Math.min(1, (t - constel.t0) / 900);
          for (const a of constel.alvos) {
            const prog = Math.min(1, Math.max(0, (t - a.inicio) / 420));
            if (prog <= 0) continue;
            const j = a.idx, bx = vBase[j * 3], by = vBase[j * 3 + 1];
            const dd = Math.hypot(bx - ox, by - oy) || 1, puxa = reduzido ? 0 : Math.min(0.08 * dd, 60) * forma * fade;
            vPos[j * 3] = bx + (ox - bx) / dd * puxa; vPos[j * 3 + 1] = by + (oy - by) / dd * puxa; vBri[j] = 1.2 + 0.8 * fade; tocados.add(j);
            if (nl < MAX_LIN) {
              const ex = ox + (vPos[j * 3] - ox) * prog, ey = oy + (vPos[j * 3 + 1] - oy) * prog;
              lp.setXYZ(nl * 2, ox, oy, 0.5); lp.setXYZ(nl * 2 + 1, ex, ey, 0.5);
              const al = (0.35 + 0.45 * Math.min(1, a.peso / 40)) * fade; la.setX(nl * 2, al); la.setX(nl * 2 + 1, al * 0.7);
              const c = corOuro.clone().lerp(corAzul, Math.min(1, dd / 9000)); lc.setXYZ(nl * 2, c.r, c.g, c.b); lc.setXYZ(nl * 2 + 1, c.r, c.g, c.b);
              nl++;
              if (prog >= 1 && !reduzido) for (let q = 0; q < 3 && np < MAX_PART; q++) { const f = ((t / 1600) + q / 3 + hash(j) ) % 1; pp.setXYZ(np, ox + (vPos[j * 3] - ox) * f, oy + (vPos[j * 3 + 1] - oy) * f, 0.6); pa.setX(np, Math.sin(f * Math.PI) * fade); np++; }
            }
          }
        }
      }
      // galáxia sob o cursor: partículas vindo em direção ao centro
      if (sobreLivro && !reduzido) { const lv = sobreLivro; for (let q = 0; q < 40 && np < MAX_PART; q++) { const f = ((t / 2400) + q / 40) % 1, a = q * 2.39996 + lv.rotacao, r = lv.raio * 1.5 * (1 - f); pp.setXYZ(np, lv.cx + Math.cos(a) * r, lv.cy + Math.sin(a) * r * 0.85, 0.6); pa.setX(np, Math.sin(f * Math.PI) * 0.8); np++; } }
      for (let i = nl; i < MAX_LIN; i++) { la.setX(i * 2, 0); la.setX(i * 2 + 1, 0); }
      for (let i = np; i < MAX_PART; i++) pa.setX(i, 0);
      lp.needsUpdate = la.needsUpdate = lc.needsUpdate = pp.needsUpdate = pa.needsUpdate = true;
      bri.needsUpdate = pos.needsUpdate = true;
      // satélites aparecem quando perto (e brilham na constelação da sua passagem)
      const ass = estado.graph.order + '|' + estado.graph.size;
      if (ass !== assinatura) { assinatura = ass; montarSatelites(); precisaOpac = true; }
      if (sats.length) { const sa = gSat.attributes.alfa; const perto = Math.min(1, Math.max(0, (1800 - dist) / 1300)); const kA = constel && !constel.soltoEm ? constel.origem : selecionado; sats.forEach((s, i) => sa.setX(i, perto * (s.k === kA ? 1 : 0.45))); sa.needsUpdate = true; }
    }
    atualizarLaminas();
    for (const c of CAMADAS) if (c.api && c.grupo.visible) c.api.quadro(t);
    atualizarFios(t);
    renderer.clear();
    if (ceuR) renderer.render(ceuR.cena, ceuR.camera);   // 1º o céu real (fundo da camada Universo)
    renderer.clearDepth();
    renderer.render(cena, camera);
    rotulos(t); desenharMini(t);
    if (sobreLivro && (dist < 1200 || modoTerra)) sobreLivro = null;   // a dica de livro só vale no nível das galáxias
    if (constel || sobreLivro || foraDoCanvas) mostrarInfo();
    if (pronto && t - salvoEm > 1500) { salvoEm = t; try { sessionStorage.setItem('nexus_universo_vista', JSON.stringify({ x: alvo.x, y: alvo.y, d: dist, i: incl })); } catch (_) {} }
    quadro = requestAnimationFrame(quadroDesenho);
  }
  const tocados = new Set();
  let salvoEm = 0;
  function restaurarVista() {
    try { const v = JSON.parse(sessionStorage.getItem('nexus_universo_vista') || 'null'); if (v && isFinite(v.x)) { alvo.set(v.x, v.y, 0); dist = v.d; incl = v.i || 0; posicionar(); return; } } catch (_) {}
    const c = caixaGeral(); alvo.set(c.x, c.y, 0); dist = c.d; posicionar();
    const qf = lerId(estado.foco); if (qf && vIdx.has(qf.ini)) refsDe(qf.ini);   // a constelação da passagem em foco já fica pronta
  }

  // a Almeida do próprio site (a mesma que o NEXUS usa)
  fetch('/biblia.json').then((r) => r.text()).then((t) => montarUniverso(JSON.parse(t.replace(/^[^\[]*/, '')))).catch(() => acoes.indisponivel && acoes.indisponivel());

  let primeira = true;
  return {
    ativar(valor) {
      ativo = valor;
      document.body.classList.toggle('ceu-universo', valor);
      cancelAnimationFrame(quadro);
      if (valor) {
        ajustar();
        if (primeira) { primeira = false; const pn = document.getElementById('painel'); if (pn) pn.hidden = true; }
        ultimo = performance.now(); quadro = requestAnimationFrame(quadroDesenho);
      }
    },
    enquadrar() { if (!interagiu) vistaGeral(); },
    prepararDossie: (texto) => prepararDossie(texto),   // usado pela barra 'Preparar'   // o NEXUS pede enquadrar ao carregar; não tira a vista de quem já está navegando
    zoom(f) { voar(alvo.x, alvo.y, dist * f); },
    centralizar(id) { centralizar(id); },
    prever() {},
    descartar() {
      ativo = false; cancelAnimationFrame(quadro); obs.disconnect(); document.body.classList.remove('ceu-universo');
      cena.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
      renderer.dispose(); canvas.remove(); rot.remove(); ui.remove(); estilo.remove();
    },
    _teste: {
      pronto: () => pronto, dist: () => dist, alvo: () => ({ x: alvo.x, y: alvo.y }), nivel: () => nivelEl.textContent, mini: () => !!miniCaixa,
      telaVerso: (k) => { const j = vIdx.get(k); return j == null ? null : tela(vPos[j * 3], vPos[j * 3 + 1]); },
      mundoVerso: (k) => { const j = vIdx.get(k); return j == null ? null : { x: vBase[j * 3], y: vBase[j * 3 + 1] }; },
      irPara: (x, y, d) => { voo = null; interagiu = true; alvo.set(x, y, 0); dist = d; posicionar(); },
      constelacao: () => (constel ? { origem: constel.origem, alvos: constel.alvos.length, acesas: constel.alvos.filter((a) => performance.now() > a.inicio + 420).length, solta: !!constel.soltoEm } : null),
      cartao: () => !cartao.hidden, satelites: () => sats.length, versos: () => vChave.length, livros: () => livros.length,
      leitura: () => leituraCap, atlas: () => atlasC, lugar: () => (lugarAtivo ? { nome: lugarAtivo.nome, acesos: realceLugar.size } : null),
      camadas: () => CAMADAS.map((c) => ({ id: c.id, visivel: c.visivel, opacidade: c.opacidade, z: c.z })), definirCamada: (id, vis, op) => { const c = camada(id); if (vis != null) c.visivel = vis; if (op != null) c.opacidade = op; montarPainel(); },
      camadasTeste: (n) => { for (let k = 0; k < n; k++) registrarCamada({ id: 'teste' + k, nome: 'Teste ' + (k + 1), cor: '#8FA9D9', visivel: true, opacidade: 0.5, criar: ({ secoes: sx }) => {
          const x0 = Math.min(...sx.map((q) => q.cx - q.raio)), x1 = Math.max(...sx.map((q) => q.cx + q.raio)), y0 = Math.min(...sx.map((q) => q.cy - q.raio)), y1 = Math.max(...sx.map((q) => q.cy + q.raio));
          const N = 30000, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y0 + Math.random() * (y1 - y0); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color().setHSL(0.6 - k * 0.04, 0.5, 0.7), size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }));
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({ color: '#1C3466', transparent: true, opacity: 0.08, depthWrite: false })); pl.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
          return [pl, pts]; } }); montarPainel(); return CAMADAS.length; },
      fpsMedio: () => new Promise((r) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); })(); }),
      resolucao: () => resAtual, ceu: () => (ceuR ? ceuR.estado() : null), tempo: (min) => { ceuR && ceuR.tempo(min * 60000); atualizarRelogio(); }, tocarCeu: (x, y) => (ceuR ? ceuR.tocar(x, y, W, H, 14) : null), telaCeu: (nome) => (ceuR ? ceuR.telaDe(nome, W, H) : null), debugCeu: (n) => ceuR && ceuR._debug(n), apontarCeu: (nome) => { if (ceuR && ceuR.apontar(nome)) voar(alvo.x, alvo.y, 260); },
      separar: (v) => { separacao = v; sincronizarPainel(); }, buscar: (q) => buscar(q), incline: (v) => { incl = v; posicionar(); },
      composicao: () => ({ livro: livroAtivo != null ? livros[livroAtivo].nome : null, secao: secAtiva != null ? SECOES[secAtiva].nome : null, versosAcesos: realceLivro.size || realceLugar.size, lugaresAcesos: atlasC ? atlasC.acesos().size : 0, fios: fios.length }),
      telaLugar: (nome) => { if (!atlasC) return null; const l = atlasC.lugares.filter((x) => x.nome === nome).sort((a, b) => b.peso - a.peso)[0]; return l ? telaLugarV(l) : null; },
      terra: () => (modoTerra ? { lat: +modoTerra.lat.toFixed(2), lon: +modoTerra.lon.toFixed(2), alt: Math.round(modoTerra.alt) } : null), irTerra: (lat, lon, alt) => { if (!atlasC) return false; modoTerra = { lat, lon, alt, altAlvo: alt, cursor: null, vel: { lat: 0, lon: 0 } }; return true; }, sairTerra: () => sairTerra(), raioGlobo: () => RAIO_GLOBO, telaGlobo: () => { if (!atlasC) return null; const c = atlasC.centroMundo(); tmp.copy(c).project(camera); return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; },
      lugarNaFrase: (t) => { const l = lugarNaFrase(norm(t)); return l ? { nome: l.nome, lat: l.lat, lon: l.lon, versos: l.versos.length } : null; },
      revelacao: () => ({ sec: secRevelada, valores: revela.map((v) => +v.toFixed(2)), longe: +longeR().toFixed(2) }), caixasRegiao: () => caixasRegiao,
      pegarTeste: (x, y) => { const m = pegarCamadas(x, y, 11); return m ? { id: m.c.id, i: m.i, d: m.d, info: m.c.api.info(m.i).slice(0, 80) } : null; },
      dbgPinca: () => ({ pinca, n: ponteiros.size, dist, incl }), buscarFicha: (t) => buscarCamadas(norm(t), 1), jornada: (n) => { const cP = camada('personagens'); const i = cP && cP.api ? cP.api.pessoas.findIndex((x) => x.nome === n || x.n === n) : -1; return i >= 0 && iniciarJornada(i); }, jornadaEstado: () => (jornada ? { n: jornada.n, total: jornada.passos.length, passos: jornada.passos.map((P) => P.livro + ' ' + P.c + (P.lugarVoo != null ? ' @' + atlasC.lugares[P.lugarVoo].nome : '') + (P.evs[0] ? ' · ' + P.evs[0].nome : '')) } : null), passoJornada: (k) => mostrarPasso(k), lerCap: (b, c) => lerPergaminho(b, c, []), caminho: () => { verCaminhoInteiro(); return jornada ? jornada.rota.map((r) => atlasC.lugares[r.li].nome) : null; }, estudo: () => (telaEstudo.hidden ? null : { cartoes: telaEstudo.querySelectorAll('[data-e-cartao]').length, vazios: telaEstudo.querySelectorAll('.cu-e-cartao.vazio').length, palavra: (telaEstudo.querySelector('.cu-e-palavra') || {}).textContent || null, img: !!telaEstudo.querySelector('.cu-e-img') }), abrirCartao: (id) => { cartaoAberto = id; desenharEstudo(); ligarChips(telaEstudo); }, investigar: (t) => investigarAssunto(t), investigacao: () => (investigacao ? { cand: investigacao.cand.rot, tipo: investigacao.cand.tipo, sementes: investigacao.sementes.length, acesas: investigacao.acesas || 0, folhas: Object.fromEntries(ORDEM_FOLHAS.map((id) => [id, investigacao.F[id] ? investigacao.F[id].map((x) => x.rot + ' [' + x.conf + ']') : null])), outros: investigacao.outros.map((o) => o.rot + ' (' + o.tipo + ')'), fontes: investigacao.fontes ? investigacao.fontes.blocos.map((b) => b.titulo + ': ' + b.itens.length) : null, incerto: !!investigacao.lugarIncerto } : null), abaInvestigacao: (a) => { if (investigacao) { investigacao.aba = a; desenharInvestigacao(); } },
      fichaVerso: (k) => fichaVerso(k), fiosEntre: () => fiosEntre.length, fiosCamada: () => fiosCamada.length,
      abrirTerra: () => abrirTerra(), imagemTerra: () => (atlasC ? atlasC.imagemReal() : false), subsolar: () => pontoSubsolar(Date.now()),
      camadaPronta: (id) => !!(camada(id) && camada(id).api), telaCamada: (id, i) => { const c = camada(id); const p = c && c.api && c.api.pos(i); return p ? tela(p.x, p.y, c.z) : null; },
      fichaCamada: () => (fichaCamada ? { id: fichaCamada.c.id, i: fichaCamada.i, versos: realceCamada.size, fios: fiosCamada.length } : null), buscaCamada: (id, q) => { const c = camada(id); return c && c.api ? c.api.buscar(norm(q)) : null; },
      telaLivro: (n) => { const lv = livros[n - 1]; return lv ? tela(lv.cx, lv.cy) : null; }, incl: () => incl,
    },
  };
}
