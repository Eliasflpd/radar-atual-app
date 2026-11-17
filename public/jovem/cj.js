/* CONEXÃO JOVEM — protótipo navegável (Fase 1 · 17/11/2026)
   SPA simples com rotas por hash (#/inicio, #/circulo...). Sem backend: o que o jovem faz fica só
   no localStorage deste aparelho, sempre com aviso de demonstração. Dados fictícios em dados-demo.js.
   Fase 2: login igual ao do Radar (código pelo WhatsApp), banco com RLS, papéis e auditoria (ver dossiê).
   Módulo 1: login pelo crachá do Radar e Pessoas. Módulo 2: Círculos (Meu Círculo real, Encontrar um círculo,
   Conduzir meu círculo e o painel Círculos), com simulador local na demonstração. */
(function () {
  'use strict';
  var D = window.CJ_DEMO;
  var CHAVE = 'cj-demo-v1', CHAVE_DIARIO = 'cj-diario-v1';

  /* ═══ estado (só neste aparelho) ═══ */
  function padrao() {
    return {
      entrou: false, consentiu: false,
      perfil: { nome: 'Davi', faixa: '18-21', sobre: 'Gosto de música, futebol e de conhecer gente nova. Quero crescer na fé com amigos de verdade.', interesses: ['Louvor', 'Esporte', 'Amizade'], nomeCompleto: false,
        notif: { palavra: false, hora: '07:00', circulo: false, missao: false } },
      menor: { responsavel: '', status: 'pendente' },
      presenca: null, propostas: [], trocaPedida: false,
      jornada: { feitos: { e1: [0, 1, 2], e2: [0] }, pausada: false },
      missao: { aceita: false, feitos: [], reflexao: '' },
      inscricoes: {}, leituras: {}, apoios: {}, envios: [], comentarios: {}, denuncias: 0, silenciados: [],
      talentos: { sel: [], disp: [], obs: '', enviado: false },
      oracoes: [], conversas: [], alertasOk: []
    };
  }
  function ler(chave, def) { try { var v = localStorage.getItem(chave); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function grava(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var E = (function () {
    var p = padrao(), s = ler(CHAVE, null);
    if (!s) return p;
    for (var k in p) if (!(k in s)) s[k] = p[k];
    for (var k2 in p.perfil) if (!(k2 in s.perfil)) s.perfil[k2] = p.perfil[k2];
    return s;
  })();
  function salva() { if (!grava(CHAVE, E)) toast('Não consegui guardar neste aparelho', 'O navegador bloqueou o armazenamento (modo privado?).'); }
  function diario() { return ler(CHAVE_DIARIO, []); }
  function menorPendente() { return E.perfil.faixa === '15-17' && E.menor.status !== 'aprovado'; }
  var FAIXAS = { '15-17': '15–17 anos', '18-21': '18–21 anos', '22-25': '22–25 anos' };

  /* ═══ ícones (traço Lucide, inline) ═══ */
  var I = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    heartHandshake: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    circle: '<circle cx="12" cy="12" r="10"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
    bola: '<circle cx="12" cy="12" r="10"/><path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94"/><path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32"/><path d="M8.56 2.75c4.37 6 6 9.42 8 17.72"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    grad: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    compass: '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    notebook: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    radar: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>',
    buoy: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
    phoneDev: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    access: '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    church: '<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7"/>',
    tent: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>'
  };
  function ic(n, cls) { return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[n] || '') + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iniciais(n) { var p = String(n).replace(/[^A-Za-zÀ-ÿ ]/g, '').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function av(nome, cor, cls) { return '<span class="av ' + (cls || '') + '" style="background:' + (cor || '#2462D2') + '" aria-hidden="true">' + esc(iniciais(nome)) + '</span>'; }
  var LOGO = ic('users');

  /* ═══ ilustrações (SVG próprio; sem fotos de pessoas reais) ═══ */
  var uid = 0;
  var CENAS = {
    palco: ['#2A1B5E', '#0D1830', '#8C6CF0'], campo: ['#0F5A3A', '#0B2E25', '#7BD88F'], lar: ['#3A2A1A', '#142544', '#F2B85B'],
    maos: ['#7A3B12', '#2A1A2E', '#F5A65B'], estudo: ['#14305E', '#0D1830', '#D6B66E'], musica: ['#3B1650', '#0D1830', '#D58CF0'],
    tenda: ['#0E1D3F', '#060D1F', '#F2B85B'], aurora: ['#E08A3C', '#142544', '#FFD27A'], livro: ['#5C3A16', '#142544', '#F6CF7E'],
    missao: ['#C76B2A', '#142544', '#FFD089'], talentos: ['#2B1A58', '#0D1830', '#F0C46B'], acolhe: ['#1D4C9E', '#0D1830', '#D6B66E']
  };
  var CENA_IC = { palco: 'music', campo: 'bola', lar: 'home', maos: 'heartHandshake', estudo: 'book', musica: 'music', tenda: 'tent', aurora: 'compass', livro: 'book', missao: 'target', talentos: 'mic', acolhe: 'heart' };
  function arte(tipo, semIcone) {
    var c = CENAS[tipo] || CENAS.estudo, id = 'a' + (++uid), extra = '';
    var estrelas = '';
    for (var i = 0; i < 14; i++) { var x = (i * 73 + 17) % 320, y = (i * 41 + 9) % 95, r = (i % 3) * .4 + .6; estrelas += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + (.25 + (i % 4) * .12) + '"/>'; }
    if (tipo === 'palco') extra = '<g opacity=".22" fill="#fff"><path d="M70 0 L40 180 L110 180Z"/><path d="M160 0 L130 180 L190 180Z"/><path d="M250 0 L215 180 L285 180Z"/></g><rect y="150" width="320" height="30" fill="' + c[2] + '" opacity=".25"/>';
    else if (tipo === 'campo') extra = '<g stroke="#fff" stroke-width="1.5" fill="none" opacity=".35"><rect x="20" y="40" width="280" height="130"/><line x1="160" y1="40" x2="160" y2="170"/><circle cx="160" cy="105" r="26"/></g>';
    else if (tipo === 'lar') extra = '<path d="M0 150 Q160 120 320 150 V180 H0Z" fill="#0D1830" opacity=".7"/><g fill="#0D1830"><path d="M190 150 V100 L230 70 L270 100 V150Z"/></g><g fill="' + c[2] + '"><rect x="203" y="108" width="14" height="14" rx="2"/><rect x="243" y="108" width="14" height="14" rx="2"/></g>' +
      '<path d="M10 40 Q90 70 170 40 T330 44" stroke="#fff" stroke-width=".8" fill="none" opacity=".5"/>' + [20, 50, 80, 110, 140, 170, 200, 230, 260, 290].map(function (x, k) { return '<circle cx="' + x + '" cy="' + (48 + Math.sin(k) * 7) + '" r="2.4" fill="' + c[2] + '"/>'; }).join('');
    else if (tipo === 'tenda') extra = '<path d="M0 160 Q160 140 320 160 V180 H0Z" fill="#050A17"/><path d="M110 160 L160 95 L210 160Z" fill="#1A2C55"/><path d="M160 95 L172 160 H148Z" fill="#0D1830"/><circle cx="245" cy="156" r="10" fill="' + c[2] + '" opacity=".55"/>';
    else if (tipo === 'aurora' || tipo === 'missao') extra = '<circle cx="230" cy="112" r="34" fill="' + c[2] + '" opacity=".75"/><path d="M0 130 L60 95 L110 122 L170 78 L230 118 L280 92 L320 112 V180 H0Z" fill="#1B2C52" opacity=".85"/><path d="M0 150 L80 120 L150 146 L220 116 L320 148 V180 H0Z" fill="#0D1830"/>' +
      (tipo === 'missao' ? '<path d="M150 180 L174 132 L182 132 L200 180Z" fill="' + c[2] + '" opacity=".35"/>' : '<path d="M140 180 Q170 150 214 128" stroke="' + c[2] + '" stroke-width="2" stroke-dasharray="4 5" fill="none" opacity=".8"/>');
    else if (tipo === 'livro') extra = '<g opacity=".25" stroke="' + c[2] + '" stroke-width="1.2">' + [0, 1, 2, 3, 4, 5, 6].map(function (k) { var a = (-80 + k * 27) * Math.PI / 180; return '<line x1="160" y1="120" x2="' + (160 + Math.sin(a) * 200) + '" y2="' + (120 - Math.cos(a) * 200) + '"/>'; }).join('') + '</g><path d="M80 140 Q120 122 160 136 Q200 122 240 140 L240 152 Q200 136 160 150 Q120 136 80 152Z" fill="#F7E7C2" opacity=".9"/>';
    else if (tipo === 'maos' || tipo === 'acolhe') extra = '<circle cx="160" cy="95" r="60" fill="' + c[2] + '" opacity=".14"/><circle cx="160" cy="95" r="38" fill="' + c[2] + '" opacity=".14"/>';
    else if (tipo === 'musica' || tipo === 'talentos') extra = '<g stroke="' + c[2] + '" fill="none" opacity=".35" stroke-width="1.4">' + [0, 1, 2, 3].map(function (k) { return '<path d="M0 ' + (120 + k * 10) + ' Q80 ' + (95 + k * 10) + ' 160 ' + (120 + k * 10) + ' T320 ' + (120 + k * 10) + '"/>'; }).join('') + '</g>';
    else if (tipo === 'estudo') extra = '<rect x="0" y="140" width="320" height="40" fill="#0A1426" opacity=".6"/><circle cx="250" cy="60" r="44" fill="' + c[2] + '" opacity=".12"/>';
    var icone = semIcone ? '' : '<g transform="translate(' + (tipo === 'lar' || tipo === 'tenda' ? 64 : 132) + ',' + (tipo === 'livro' ? 58 : 26) + ') scale(2.4)" stroke="' + c[2] + '" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".95">' + I[CENA_IC[tipo] || 'sparkles'] + '</g>';
    return '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[0] + '"/></linearGradient><radialGradient id="' + id + 'r" cx=".7" cy=".35" r=".6"><stop offset="0" stop-color="' + c[2] + '" stop-opacity=".45"/><stop offset="1" stop-color="' + c[2] + '" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="url(#' + id + 'g)"/><rect width="320" height="180" fill="url(#' + id + 'r)"/>' + estrelas + extra + icone + '</svg>';
  }

  /* ═══ toast e modal ═══ */
  function toast(msg, sub) {
    var box = document.getElementById('toasts');
    var t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = ic('checkCircle') + '<div>' + esc(msg) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }
  var dlg;
  function modal(titulo, corpo, depois) {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'modal'; dlg.setAttribute('aria-labelledby', 'modal-t');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
    dlg.innerHTML = '<div class="modal-cab"><h2 id="modal-t">' + esc(titulo) + '</h2><button class="cab-bt" type="button" data-fechar aria-label="Fechar">' + ic('x') + '</button></div><div class="modal-corpo">' + corpo + '</div>';
    dlg.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    if (dlg.open) dlg.close();
    dlg.showModal();
    if (depois) depois(dlg);
  }
  function fecha() { if (dlg && dlg.open) dlg.close(); }
  function aviso(txt, tipo, icone) { return '<div class="aviso ' + (tipo || '') + '">' + ic(icone || 'info') + '<div>' + txt + '</div></div>'; }
  var AV_DEMO = aviso('<b>Demonstração.</b> Pessoas, números e publicações são fictícios. O que você faz aqui fica guardado só neste aparelho.', '', 'info');
  function fase2(txt) { return '<p class="fase2">' + ic('hourglass') + '<span>' + txt + '</span></p>'; }
  function carregando(btn, ms, fn) { btn.classList.add('carregando'); btn.setAttribute('aria-busy', 'true'); setTimeout(function () { btn.classList.remove('carregando'); btn.removeAttribute('aria-busy'); fn(); }, ms); }
  function baixa(nome, tipo, txt) {
    var url = URL.createObjectURL(new Blob([txt], { type: tipo }));
    var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function erroCampo(input, msg) {
    var box = document.getElementById(input.getAttribute('aria-describedby').split(' ').pop());
    if (msg) { input.setAttribute('aria-invalid', 'true'); box.innerHTML = ic('alert') + esc(msg); } else { input.removeAttribute('aria-invalid'); box.innerHTML = ''; }
    return !msg;
  }
  function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }

  /* ═══ textos fixos (modais) ═══ */
  var REGRAS = '<ul class="marcadores">' + [
    'Respeito sempre: sem ofensas, piadas que humilham ou fofoca.',
    'Nada de expor ninguém: não publique fotos, telefones ou endereços de outras pessoas.',
    'Publicações passam por moderação antes de aparecer.',
    'Sem mensagens privadas entre adultos e menores: a conversa acontece em canais moderados.',
    'Viu algo errado ou preocupante? Use "Denunciar": a equipe de proteção recebe e responde.',
    'Aqui não há ranking, curtidas públicas ou rolagem infinita: o melhor acontece pessoalmente.'
  ].map(function (t) { return '<li>' + ic('check') + '<span>' + t + '</span></li>'; }).join('') + '</ul>' + fase2('Texto provisório: a versão final será aprovada pela liderança pastoral e pela equipe de proteção antes do piloto.');
  var POLITICA = '<p>Em linguagem simples, como o Conexão Jovem vai tratar seus dados:</p><ul class="marcadores">' + [
    'Coletamos o mínimo: nome de exibição, faixa etária, WhatsApp, círculo e preferências.',
    'Seu perfil não é público nem aparece em buscadores.',
    'Diário e pedidos de oração são privados por padrão; a liderança não vê o diário.',
    'Menores de 18 anos têm proteção reforçada e participação do responsável.',
    'Você pode pedir para ver, corrigir ou apagar seus dados.',
    'Não vendemos dados nem usamos publicidade.'
  ].map(function (t) { return '<li>' + ic('check') + '<span>' + t + '</span></li>'; }).join('') + '</ul>' + fase2('Rascunho de produto. A política final depende de revisão jurídica (LGPD e ECA Digital) e aprovação pastoral.');
  function abreRegras() { modal('Regras da comunidade', REGRAS); }
  function abrePolitica() { modal('Privacidade em poucas palavras', POLITICA); }

  /* ═══ telas ═══ */
  var T = {};
  var aba = { entrar: 'entrar', etapaCodigo: false, evFiltro: 'Todos', dev: 0, evCarregou: false };

  /* 01 · Boas-vindas */
  T['boas-vindas'] = function () {
    return { cab: 'nenhum', nav: false, titulo: 'Boas-vindas', html:
      '<section class="bv">' +
        '<div class="bv-topo"><a class="btn btn-claro" href="/?capa" style="min-height:48px;padding:0 14px 0 10px">' + ic('left', 'ic-sm') + 'Capa</a>' + (real() ? '' : '<span class="demo-pill">Demonstração</span>') + '</div>' +
        '<div class="bv-arte">' + bvArte() + '</div>' +
        '<div class="bv-marca"><div class="logo">' + LOGO + '</div><h1>Conexão<b>Jovem</b></h1><p class="ass">Mais que uma igreja. Uma família em Cristo.</p></div>' +
        '<ul class="bv-lista">' +
          '<li><span>' + ic('home') + '</span>Pertencimento</li><li><span>' + ic('users') + '</span>Amizade verdadeira</li>' +
          '<li><span>' + ic('book') + '</span>Crescimento na fé</li><li><span>' + ic('heartHandshake') + '</span>Missão na prática</li></ul>' +
        '<p class="bv-texto">Um lugar para jovens de 15 a 25 anos encontrarem pessoas com quem caminhar, crescerem na fé e descobrirem formas concretas de servir. O app é ponte: o melhor acontece nos encontros.</p>' +
        '<div class="bv-acoes">' + (euAtivo() ? '<a class="btn btn-ouro" href="' + (precisaRegras() ? '#/consentimento' : '#/inicio') + '">Continuar como ' + esc(primeiroNome()) + '</a>' : '<a class="btn btn-ouro" href="#/entrar">' + (real() || R.modo === 'sem_cracha' ? 'Entrar com a conta do Radar' : 'Entrar ou criar cadastro') + '</a>') +
          '<button class="btn btn-claro" type="button" data-acao="explorar">Explorar sem cadastro</button>' +
          '<a class="btn btn-txt" href="/?radar" style="color:#DCE4F4">' + ic('radar', 'ic-sm') + 'Ir para o Radar Atual</a></div>' +
        '<p class="bv-rodape">FÉ QUE APROXIMA. AMIZADES QUE FORTALECEM.</p>' +
      '</section>' };
  };
  function bvArte() {
    return '<svg viewBox="0 0 340 340" aria-hidden="true"><defs><radialGradient id="bvg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#D6B66E" stop-opacity=".35"/><stop offset="1" stop-color="#D6B66E" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="170" cy="170" r="170" fill="url(#bvg)"/>' + [150, 118, 86, 54].map(function (r, k) { return '<circle cx="170" cy="170" r="' + r + '" fill="none" stroke="#D6B66E" stroke-opacity="' + (.18 + k * .1) + '" stroke-width="1.2"/>'; }).join('') +
      [0, 1, 2, 3, 4, 5, 6].map(function (k) { var a = k / 7 * Math.PI * 2; return '<circle cx="' + (170 + Math.cos(a) * 118) + '" cy="' + (170 + Math.sin(a) * 118) + '" r="' + (k % 2 ? 5 : 7) + '" fill="#D6B66E" opacity=".8"/>'; }).join('') +
      '<path d="M170 140 v60 M150 160 h40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>';
  }

  /* 02 · Entrar / cadastro */
  T.entrar = function () {
    var cad = aba.entrar === 'cadastro';
    var corpo;
    if (aba.etapaCodigo) {
      corpo = '<form class="form" id="f-codigo" novalidate>' +
        aviso('Enviamos um código de 6 dígitos para o seu WhatsApp. <b>Demonstração:</b> nenhuma mensagem foi enviada; digite quaisquer 6 números.', 'aviso-azul', 'phoneDev') +
        '<div class="campo"><label for="c-codigo">Código de verificação</label><input class="entrada" id="c-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-describedby="e-codigo"><span class="erro-msg" id="e-codigo" role="alert"></span></div>' +
        '<button class="btn btn-pri btn-cheio" type="submit">Confirmar e continuar</button>' +
        '<button class="btn btn-txt" type="button" data-acao="voltar-tel">Trocar número</button></form>';
    } else {
      corpo = '<div class="abas" role="tablist" aria-label="Entrar ou cadastrar">' +
        '<button class="aba" role="tab" type="button" aria-selected="' + !cad + '" data-acao="aba-entrar" data-v="entrar">Entrar</button>' +
        '<button class="aba" role="tab" type="button" aria-selected="' + cad + '" data-acao="aba-entrar" data-v="cadastro">Criar cadastro</button></div>' +
        '<form class="form" id="f-entrar" novalidate style="margin-top:18px">' +
        (cad ? '<div class="campo"><label for="c-nome">Como quer ser chamado?</label><input class="entrada" id="c-nome" autocomplete="nickname" maxlength="40" placeholder="Seu nome de exibição" aria-describedby="d-nome e-nome"><span class="dica" id="d-nome">Só o seu círculo verá este nome.</span><span class="erro-msg" id="e-nome" role="alert"></span></div>' : '') +
        '<div class="campo"><label for="c-tel">Seu WhatsApp</label><input class="entrada" id="c-tel" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(00) 90000-0000" aria-describedby="d-tel e-tel"><span class="dica" id="d-tel">Com DDD. Usado para entrar e para o acolhimento.</span><span class="erro-msg" id="e-tel" role="alert"></span></div>' +
        (cad ? '<div class="campo"><label for="c-origem">Como você chegou até aqui?</label><select class="entrada" id="c-origem"><option>Convite de um jovem</option><option>QR code num culto ou evento</option><option>Código da igreja</option><option>Indicação de um líder</option></select></div>' +
          '<div class="campo"><label for="c-cod">Código da igreja <span class="peq">(opcional)</span></label><input class="entrada" id="c-cod" maxlength="12" placeholder="Ex.: JOVEM2026" autocapitalize="characters"></div>' +
          '<label class="opcao"><input type="checkbox" id="c-aceite" aria-describedby="e-aceite"><div><b>Li e aceito</b><span>as <button type="button" class="btn-txt" style="min-height:0;padding:0;display:inline;font-weight:700" data-acao="regras">regras da comunidade</button> e a <button type="button" class="btn-txt" style="min-height:0;padding:0;display:inline;font-weight:700" data-acao="politica">política de privacidade</button>.</span><span class="erro-msg" id="e-aceite" role="alert"></span></div></label>' : '') +
        '<button class="btn btn-pri btn-cheio" type="submit">' + ic('phoneDev', 'ic-sm') + 'Receber código pelo WhatsApp</button>' +
        '<button class="btn btn-txt" type="button" data-acao="recuperar">Problemas para entrar?</button></form>';
    }
    return { cab: 'normal', voltar: '#/boas-vindas', nav: false, titulo: aba.etapaCodigo ? 'Confirmar código' : (cad ? 'Criar cadastro' : 'Entrar'), html:
      '<div class="sec pt-l">' +
        '<div><h2 class="tit" style="font-size:22px">' + (aba.etapaCodigo ? 'Quase lá' : 'Que bom que você veio') + '</h2><p class="sub" style="margin-top:4px">' + (aba.etapaCodigo ? 'Digite o código para confirmar que o número é seu.' : 'Sem senha para decorar: você entra com um código pelo WhatsApp.') + '</p></div>' +
        '<div class="cartao">' + corpo + '</div>' +
        aviso('<b>Demonstração:</b> quando o módulo estiver ligado, você entra com a mesma conta do Radar Atual (código pelo WhatsApp), sem refazer cadastro. Aqui nada é enviado e nenhum dado sai do seu aparelho.', '', 'info') +
        '<p class="peq" style="text-align:center"><button type="button" class="btn btn-txt" data-acao="politica">Como cuidamos dos seus dados</button></p>' +
      '</div>',
      depois: function () {
        var f = document.getElementById('f-entrar'), fc = document.getElementById('f-codigo');
        if (f) f.addEventListener('submit', function (e) {
          e.preventDefault();
          var ok = true, tel = document.getElementById('c-tel'), nome = document.getElementById('c-nome'), aceite = document.getElementById('c-aceite');
          if (nome) ok = erroCampo(nome, nome.value.trim().length < 2 ? 'Digite como quer ser chamado (pelo menos 2 letras).' : '') && ok;
          var d = soDigitos(tel.value);
          ok = erroCampo(tel, d.length < 10 || d.length > 11 ? 'Confira o número: DDD + celular, 10 ou 11 dígitos.' : '') && ok;
          if (aceite) ok = erroCampo(aceite, aceite.checked ? '' : 'Para continuar, aceite as regras e a política.') && ok;
          if (!ok) { var inv = f.querySelector('[aria-invalid="true"]'); if (inv) inv.focus(); return; }
          if (nome) { E.perfil.nome = nome.value.trim(); salva(); }
          carregando(f.querySelector('[type=submit]'), 700, function () { aba.etapaCodigo = true; render(); });
        });
        if (fc) fc.addEventListener('submit', function (e) {
          e.preventDefault();
          var c = document.getElementById('c-codigo');
          if (!erroCampo(c, /^\d{6}$/.test(c.value.trim()) ? '' : 'O código tem 6 números.')) { c.focus(); return; }
          carregando(fc.querySelector('[type=submit]'), 600, function () {
            E.entrou = true; salva(); aba.etapaCodigo = false;
            toast('Pronto, você entrou', 'Demonstração: nenhum código foi conferido de verdade.');
            location.hash = E.consentiu ? '#/inicio' : '#/consentimento';
          });
        });
      } };
  };

  /* 03 · Consentimento e faixa etária */
  T.consentimento = function () {
    var f = E.perfil.faixa, n = E.perfil.notif;
    return { cab: 'normal', voltar: E.entrou ? '#/inicio' : '#/entrar', nav: false, titulo: 'Antes de começar', html:
      '<div class="sec pt-l">' +
        '<div><h2 class="tit" style="font-size:22px">Seus dados, explicados</h2><p class="sub" style="margin-top:4px">Leva um minuto. Você pode mudar tudo depois em Perfil.</p></div>' +
        '<div class="cartao"><h3>O que guardamos e por quê</h3><ul class="lista">' +
          li('user', 'Nome de exibição', 'Para o seu círculo saber quem você é.') +
          li('calendar', 'Faixa etária', 'Para separar grupos por idade e proteger menores.') +
          li('phoneDev', 'WhatsApp', 'Para entrar e para alguém fazer o seu acolhimento.') +
          li('sparkles', 'Interesses', 'Para sugerir um círculo e formas de servir.') +
        '</ul><p>Seu perfil não é público. Diário e pedidos de oração nunca aparecem no mural. Você pode pedir para ver ou apagar seus dados.</p></div>' +
        '<fieldset class="cartao" style="border:0"><legend class="rot" style="float:left;width:100%;margin-bottom:10px;font-size:16px;font-weight:800;color:var(--navy)">Qual é a sua faixa etária?</legend>' +
          '<div class="opcoes opcoes-3" style="clear:both">' + ['15-17', '18-21', '22-25'].map(function (v) {
            return '<label class="opcao"><input type="radio" name="faixa" value="' + v + '"' + (f === v ? ' checked' : '') + '><b>' + v.replace('-', '–') + '</b><span>anos</span></label>'; }).join('') + '</div></fieldset>' +
        '<div id="menor-box">' + (f === '15-17' ? caixaMenor() : '') + '</div>' +
        '<div class="cartao"><h3>Avisos (você escolhe)</h3><p>Tudo começa desligado. Nada de lembretes insistentes.</p>' +
          interruptor('n-palavra', 'Palavra do Dia', 'Um aviso por dia, no horário que você quiser.', n.palavra) +
          interruptor('n-circulo', 'Avisos do meu círculo', 'Quando houver encontro marcado.', n.circulo) + '</div>' +
        '<div class="cartao"><label class="opcao" style="border:0;padding:0;min-height:0"><input type="checkbox" id="c-regras" aria-describedby="e-regras"' + (E.consentiu ? ' checked' : '') + '><div><b>Concordo com as regras da comunidade</b><span>Respeito, cuidado e proteção para todos.</span><span class="erro-msg" id="e-regras" role="alert"></span></div></label>' +
          '<div class="btns-2" style="margin-top:12px"><button class="btn btn-sec" type="button" data-acao="regras">Ler regras</button><button class="btn btn-sec" type="button" data-acao="politica">Privacidade</button></div></div>' +
        '<button class="btn btn-pri btn-cheio" type="button" data-acao="consentir">Continuar</button>' +
      '</div>',
      depois: function () {
        document.querySelectorAll('input[name=faixa]').forEach(function (r) { r.addEventListener('change', function () {
          E.perfil.faixa = r.value; salva(); document.getElementById('menor-box').innerHTML = r.value === '15-17' ? caixaMenor() : ''; }); });
      } };
  };
  function caixaMenor() {
    var ap = E.menor.status === 'aprovado';
    return '<div class="cartao cartao-ouro"><div class="selos"><span class="selo ' + (ap ? 'selo-verde' : 'selo-alerta') + '">' + ic(ap ? 'checkCircle' : 'hourglass') + (ap ? 'Aprovado (simulação)' : 'Aguardando aprovação da liderança') + '</span></div>' +
      '<h3>Fluxo para quem tem 15 a 17 anos</h3><p style="color:#5E4A1C">Para sua proteção, mural, conversas do círculo e inscrições com autorização só são liberados depois destes passos:</p>' +
      '<ol class="marcadores" style="counter-reset:p">' + ['Seu responsável é informado e autoriza a participação.', 'A equipe de proteção da igreja revisa o cadastro.', 'Você entra num círculo da sua faixa etária, com líder e auxiliar aprovados.'].map(function (t, k) {
        return '<li><span class="selo selo-ouro" style="min-width:26px;justify-content:center">' + (k + 1) + '</span><span>' + t + '</span></li>'; }).join('') + '</ol>' +
      '<div class="campo"><label for="c-resp">Nome do responsável</label><input class="entrada" id="c-resp" maxlength="60" value="' + esc(E.menor.responsavel) + '" placeholder="Mãe, pai ou responsável legal"></div>' +
      '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('send', 'ic-sm') + 'Enviar pedido de autorização</button>' +
      fase2('Disponível na Fase 2. O fluxo de menores ainda precisa de aprovação da liderança e revisão jurídica (ECA Digital, LGPD) antes do piloto.') +
      '<button class="btn btn-txt btn-cheio" type="button" data-acao="simular-aprovacao">' + (ap ? 'Desfazer simulação' : 'Simular aprovação (só nesta demonstração)') + '</button></div>';
  }
  function li(i, b, s, extra) { return '<li><span class="ic-caixa">' + ic(i) + '</span><span class="li-t"><b>' + b + '</b><span>' + s + '</span></span>' + (extra || '') + '</li>'; }
  function interruptor(id, b, s, on, dis) {
    return '<div class="interruptor"><span class="li-t"><b id="' + id + '-l">' + b + '</b><span>' + s + '</span></span><span class="chave"><input type="checkbox" role="switch" id="' + id + '" data-chave="' + id + '" aria-labelledby="' + id + '-l"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><i></i></span></div>';
  }

  /* 04 · Início */
  T.inicio = function () {
    var dv = D.devocionais[0], c = D.circulo, ev = D.eventos[0];
    var prox = proximoPasso();
    return { cab: 'marca', nav: 'inicio', titulo: 'Início', html:
      '<div class="topo-inicio"><p class="data"><span>' + esc(D.hoje) + '</span><span class="demo-pill" title="Dados fictícios de demonstração">Demonstração</span></p><h2 class="saudacao">Que bom ter você aqui, <b>' + esc(primeiroNome()) + '</b>.</h2><p>Vamos caminhar juntos na presença de Deus.</p></div>' +
      '<div class="sec sobe">' +
        (menorPendente() ? aviso('<b>Cadastro de menor em análise.</b> Mural e conversas do círculo ficam bloqueados até a autorização do responsável e a aprovação da liderança. <a href="#/consentimento">Ver situação</a>', '', 'shield') : '') +
        '<a class="cartao cartao-navy cartao-link" href="#/palavra" style="display:block"><div class="selos"><span class="selo selo-navy">' + ic('sun') + 'Palavra do Dia</span></div>' +
          '<div class="citacao" style="margin-top:12px"><div><blockquote>“' + esc(dv.verso) + '”</blockquote><cite>' + esc(dv.ref) + ' · paráfrase</cite></div></div>' +
          '<p style="margin-top:12px;display:flex;align-items:center;gap:6px;color:#fff;font-weight:700">Ler o devocional ' + ic('arrow', 'ic-sm') + '</p></a>' +
        '<a class="cartao cartao-ouro cartao-link" href="#/jornada"><span class="ic-caixa ouro" style="background:#fff">' + ic('compass') + '</span><div><span class="peq" style="font-weight:800;color:var(--ouro-esc)">SEU PRÓXIMO PASSO</span><h3>' + esc(prox.acao) + '</h3><p>' + esc(prox.etapa) + ' · sem pressa, no seu ritmo</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<nav class="atalhos" aria-label="Atalhos">' +
          '<a class="atalho" href="#/circulo">' + ic('users') + 'Meu Círculo</a><a class="atalho" href="#/jornada">' + ic('compass') + 'Jornada</a>' +
          '<a class="atalho" href="#/missao">' + ic('target') + 'Missão</a><a class="atalho" href="#/acolhimento?aba=conversa">' + ic('message') + 'Pedir conversa</a></nav>' +
        '<h2 class="tit-sec">Seu círculo</h2>' +
        '<div class="cartao"><div style="display:flex;align-items:center;gap:12px"><div class="avs">' + c.integrantes.slice(0, 4).map(function (p) { return av(p.nome, p.cor, 'av-sm'); }).join('') + '<span class="av av-sm av-mais" aria-hidden="true">+' + (c.integrantes.length - 4) + '</span></div><div style="min-width:0"><h3>' + esc(c.nome) + '</h3><p class="peq">' + esc(c.faixa) + '</p></div></div>' +
          '<div class="info-linhas"><div class="info-linha">' + ic('calendar') + '<div><b>Próximo encontro</b><span>' + esc(c.encontro.quando) + '</span></div></div></div>' +
          (E.presenca === 'sim' ? aviso('Você confirmou presença. Até sábado!', 'aviso-verde', 'checkCircle') : '') +
          '<a class="btn btn-sec btn-cheio" href="#/circulo">Ver meu círculo</a></div>' +
        '<h2 class="tit-sec">Próximo evento</h2>' + cardEvento(ev) +
        '<h2 class="tit-sec">Missão da semana</h2>' +
        '<a class="cartao cartao-link" href="#/missao"><span class="ic-caixa ouro">' + ic('target') + '</span><div><h3>' + esc(D.missao.titulo) + '</h3><p>' + esc(D.missao.semana) + (E.missao.aceita ? ' · você aceitou' : ' · participação opcional') + '</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<div class="fim-lista">' + ic('heart') + '<b>Por hoje é isso.</b>Sem rolagem infinita: o melhor do Conexão Jovem acontece fora da tela. Que tal mandar uma mensagem para alguém do seu círculo?</div>' +
      '</div>' };
  };
  function proximoPasso() {
    var et = D.jornada.etapas;
    for (var i = 0; i < et.length; i++) {
      var f = E.jornada.feitos[et[i].id] || [];
      for (var j = 0; j < et[i].acoes.length; j++) if (f.indexOf(j) < 0) return { acao: et[i].acoes[j], etapa: et[i].dias + ' · ' + et[i].titulo };
    }
    return { acao: 'Você percorreu toda a jornada', etapa: 'Que tal dar um retorno à liderança?' };
  }
  function cardEvento(ev) {
    var insc = E.inscricoes[ev.id];
    return '<a class="ev" href="#/evento/' + ev.id + '"><span class="ev-arte">' + arte(ev.arte) + '</span><span class="ev-t"><small>' + esc(ev.cat) + '</small><b>' + esc(ev.titulo) + '</b><span>' + ic('calendar') + esc(ev.data + ' · ' + ev.hora) + '</span>' +
      (insc ? '<span class="selo ' + (insc === 'confirmada' ? 'selo-verde' : 'selo-alerta') + '" style="margin-top:4px;display:inline-flex">' + (insc === 'confirmada' ? 'Inscrito' : 'Aguardando autorização') + '</span>' : '') + '</span>' + ic('right', 'ic seta') + '</a>';
  }

  /* 05 · Meu Círculo */
  T.circulo = function () {
    var c = D.circulo, p = E.presenca;
    return { cab: 'normal', voltar: '#/comunidade', nav: 'comunidade', titulo: 'Meu Círculo', html:
      '<div class="hero"><div class="hero-arte">' + arte('lar', true) + '</div><div class="hero-txt"><p class="sobre">' + ic('users', 'ic-sm') + 'Meu Círculo</p><h2>' + esc(c.nome) + '</h2><p>' + esc(c.faixa) + ' · ' + (c.integrantes.length + 1) + ' integrantes com você</p></div></div>' +
      '<div class="sec pt">' +
        '<div class="cartao"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="avs">' + c.integrantes.slice(0, 5).map(function (x) { return av(x.nome, x.cor); }).join('') + '<span class="av av-mais" aria-hidden="true">+' + (c.integrantes.length - 5) + '</span></div>' +
          '<button class="btn btn-txt" type="button" data-acao="integrantes">Ver integrantes</button></div>' +
          '<p class="peq" style="display:flex;gap:6px;align-items:flex-start">' + ic('lock', 'ic-sm') + '<span>Só quem é do círculo vê esta lista. Telefones e endereços não aparecem.</span></p></div>' +
        '<div class="cartao"><h3>Próximo encontro</h3><div class="info-linhas">' +
          '<div class="info-linha">' + ic('calendar') + '<div><b>' + esc(c.encontro.quando) + '</b><span>' + esc(c.encontro.duracao) + '</span></div></div>' +
          '<div class="info-linha">' + ic('pin') + '<div><b>' + esc(c.encontro.onde) + '</b><span>O endereço chega aos confirmados.</span></div></div></div>' +
          '<div class="btns-2"><button class="btn ' + (p === 'sim' ? 'btn-pri' : 'btn-sec') + '" type="button" aria-pressed="' + (p === 'sim') + '" data-acao="presenca" data-v="sim">' + (p === 'sim' ? ic('check', 'ic-sm') : '') + 'Vou participar</button>' +
            '<button class="btn ' + (p === 'nao' ? 'btn-pri' : 'btn-sec') + '" type="button" aria-pressed="' + (p === 'nao') + '" data-acao="presenca" data-v="nao">Não poderei ir</button></div>' +
          (p === 'nao' ? '<p class="peq">Tudo bem! O líder fica sabendo, sem cobrança. Você faz falta e é sempre bem-vindo.</p>' : '') + '</div>' +
        '<div class="cartao"><span class="selo selo-ouro">' + ic('message') + 'Tema da conversa</span><h3>' + esc(c.tema.titulo) + '</h3><p>' + esc(c.tema.texto) + '</p>' +
          '<ul class="lista lista-link" style="margin-top:6px">' + c.materiais.map(function (m, k) { return '<li><button type="button" data-acao="material" data-v="' + k + '"><span class="ic-caixa">' + ic('file') + '</span><span class="li-t"><b>' + esc(m.titulo) + '</b><span>Material do encontro</span></span>' + ic('right', 'ic seta') + '</button></li>'; }).join('') + '</ul></div>' +
        '<div class="cartao"><h3>Participar do círculo</h3><ul class="lista lista-link">' +
          '<li><button type="button" data-acao="propor"><span class="ic-caixa">' + ic('plus') + '</span><span class="li-t"><b>Propor um encontro</b><span>Sugira data e tema ao líder</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          '<li>' + (menorPendente() ? '<button type="button" data-acao="bloqueado"><span class="ic-caixa">' + ic('lock') + '</span><span class="li-t"><b>Mural do círculo</b><span>Liberado após a aprovação</span></span>' : '<a href="#/comunidade?aba=circulo"><span class="ic-caixa">' + ic('message') + '</span><span class="li-t"><b>Mural do círculo</b><span>Fechado e moderado</span></span>' + ic('right', 'ic seta') + '</a>') + '</li>' +
          '<li><button type="button" data-acao="troca"><span class="ic-caixa">' + ic('repeat') + '</span><span class="li-t"><b>Pedir troca de círculo</b><span>' + (E.trocaPedida ? 'Pedido enviado à liderança' : 'Sem constrangimento, sem explicação obrigatória') + '</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          '<li><a href="#/encontrar-circulo"><span class="ic-caixa">' + ic('compass') + '</span><span class="li-t"><b>Encontrar um círculo</b><span>Como fica para quem ainda não tem</span></span>' + ic('right', 'ic seta') + '</a></li>' +
          '<li><a href="#/lider-circulo"><span class="ic-caixa">' + ic('shield') + '</span><span class="li-t"><b>Visão do líder</b><span>Pedidos de entrada, encontros e presença</span></span>' + ic('right', 'ic seta') + '</a></li></ul></div>' +
        (E.propostas.length ? '<div class="cartao"><h3>Suas propostas enviadas</h3><ul class="lista">' + E.propostas.map(function (x) { return li('calendar', esc(x.tema), esc(x.data) + ' · aguardando o líder (demonstração)'); }).join('') + '</ul></div>' : '') +
        '<div class="cartao cartao-azul"><p style="color:#1D3B78">' + esc(c.descricao) + '</p></div>' +
      '</div>' };
  };

  /* 06 · Minha Jornada */
  T.jornada = function () {
    var j = D.jornada, pct = j.dia / 90, R = 64, C = 2 * Math.PI * R;
    var atualAchada = false;
    var etapas = j.etapas.map(function (et, k) {
      var f = E.jornada.feitos[et.id] || [], feita = f.length >= et.acoes.length, atual = !feita && !atualAchada;
      if (atual) atualAchada = true;
      var st = feita ? '<span class="selo selo-verde">' + ic('check') + 'Concluída</span>' : atual ? '<span class="selo selo-ouro">Em andamento</span>' : '<span class="selo">Mais adiante</span>';
      return '<div class="etapa' + (feita ? ' feita' : '') + (atual ? ' atual' : '') + '"><button type="button" aria-expanded="' + atual + '" aria-controls="et-' + et.id + '" data-acao="etapa">' +
        '<span class="etapa-ic">' + (feita ? ic('check', 'ic-sm') : '<b>' + (k + 1) + '</b>') + '</span><span class="etapa-t"><small>' + esc(et.dias) + ' ' + st + '</small><b>' + esc(et.titulo) + '</b><span>' + esc(et.resumo) + '</span></span>' + ic('down', 'ic gira') + '</button>' +
        '<div class="etapa-corpo" id="et-' + et.id + '"' + (atual ? '' : ' hidden') + '>' +
          et.acoes.map(function (a, i) { var ok = f.indexOf(i) >= 0; return '<label class="marcar' + (ok ? ' feito' : '') + '"><input type="checkbox" data-jornada="' + et.id + '" data-i="' + i + '"' + (ok ? ' checked' : '') + '><span>' + esc(a) + '</span></label>'; }).join('') +
          '<div class="info-linhas" style="margin-top:8px"><div class="info-linha">' + ic('book') + '<div><b>Leitura sugerida</b><span>' + esc(et.leitura) + '</span></div></div><div class="info-linha">' + ic('coffee') + '<div><b>Encontro presencial sugerido</b><span>' + esc(et.encontro) + '</span></div></div></div>' +
          '<a class="btn btn-txt" href="#/acolhimento?aba=conversa" style="padding-left:0">' + ic('message', 'ic-sm') + 'Conversar sobre esta etapa</a></div></div>';
    }).join('');
    return { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Minha Jornada', html:
      '<div class="hero hero-baixo"><div class="hero-arte">' + arte('aurora', true) + '</div><div class="hero-txt" style="padding-bottom:40px"><p class="sobre">' + ic('compass', 'ic-sm') + 'Jornada de 90 dias</p><h2>Sua caminhada de acolhimento e crescimento</h2></div></div>' +
      '<div class="sec sobe">' +
        '<div class="cartao cartao-navy" style="text-align:center"><div class="anel"><svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="' + R + '" stroke="rgba(255,255,255,.14)" stroke-width="10"/><circle cx="75" cy="75" r="' + R + '" stroke="#D6B66E" stroke-width="10" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>' +
          '<div class="anel-t"><b>Dia ' + j.dia + '</b><span>de 90 · no seu ritmo</span></div></div>' +
          '<p style="margin-top:6px">Não é prova, ranking nem requisito para pertencer. São convites: faça o que fizer sentido, pause quando precisar.</p>' +
          (E.jornada.pausada ? aviso('Jornada pausada. Ninguém recebe alerta por isso; volte quando quiser.', 'aviso-azul', 'info') : '') +
          '<button class="btn btn-claro btn-cheio" type="button" data-acao="pausar">' + (E.jornada.pausada ? 'Retomar a jornada' : 'Pausar a jornada') + '</button></div>' +
        '<h2 class="tit-sec">As 4 etapas</h2><div class="etapas">' + etapas + '</div>' +
        '<div class="cartao cartao-link"><span class="ic-caixa ouro">' + ic('user') + '</span><div><h3>Quem caminha com você</h3><p>Camila S. (auxiliar do círculo, demonstração). Ela vê só em que etapa você está, nunca suas anotações ou o diário.</p></div></div>' +
        '<a class="btn btn-sec btn-cheio" href="#/acolhimento?aba=conversa">' + ic('message', 'ic-sm') + 'Pedir uma conversa</a>' +
      '</div>',
      depois: function () {
        document.querySelectorAll('[data-jornada]').forEach(function (cb) { cb.addEventListener('change', function () {
          var id = cb.getAttribute('data-jornada'), i = +cb.getAttribute('data-i'), f = E.jornada.feitos[id] || (E.jornada.feitos[id] = []);
          if (cb.checked) { if (f.indexOf(i) < 0) f.push(i); } else f.splice(f.indexOf(i), 1);
          cb.closest('.marcar').classList.toggle('feito', cb.checked);
          salva(); toast(cb.checked ? 'Marcado no seu caminho' : 'Desmarcado', 'Fica só neste aparelho. Sem pontos, sem placar.');
        }); });
      } };
  };

  /* 07 · Missão da Semana */
  T.missao = function () {
    var m = D.missao, ac = E.missao.aceita;
    return { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Missão da Semana', html:
      '<div class="hero"><div class="hero-arte">' + arte('missao', true) + '</div><div class="hero-txt"><p class="sobre">' + ic('target', 'ic-sm') + 'Missão da Semana · ' + esc(m.semana) + '</p><h2>' + esc(m.titulo) + '</h2></div></div>' +
      '<div class="sec pt">' +
        '<div class="cartao"><span class="selo selo-azul">Objetivo</span><p style="color:var(--texto);font-size:15px">' + esc(m.objetivo) + '</p></div>' +
        '<div class="cartao cartao-ouro"><h3>O que fazer</h3>' + m.acoes.map(function (a, i) { var ok = E.missao.feitos.indexOf(i) >= 0; return '<label class="marcar' + (ok ? ' feito' : '') + '"><input type="checkbox" data-missao="' + i + '"' + (ok ? ' checked' : '') + '><span>' + esc(a) + '</span></label>'; }).join('') +
          '<p class="peq" style="color:#5E4A1C">Marcar é opcional e fica só com você. Não existe placar.</p></div>' +
        '<div class="cartao"><h3 style="display:flex;gap:8px;align-items:center">' + ic('shield') + 'Segurança em primeiro lugar</h3><ul class="marcadores">' + m.seguranca.map(function (s) { return '<li>' + ic('check') + '<span>' + esc(s) + '</span></li>'; }).join('') + '</ul></div>' +
        '<div class="cartao"><div class="info-linhas">' +
          '<div class="info-linha">' + ic('calendar') + '<div><b>Quando</b><span>' + esc(m.semana) + '</span></div></div>' +
          '<div class="info-linha">' + ic('user') + '<div><b>Responsável</b><span>' + esc(m.responsavel) + '</span></div></div>' +
          '<div class="info-linha">' + ic('heart') + '<div><b>Participação</b><span>Opcional. Sem cobrança e sem culpa por não fazer.</span></div></div></div></div>' +
        '<div class="btns">' + (ac ? aviso('Você aceitou a missão desta semana. Que Deus abençoe cada conversa!', 'aviso-verde', 'checkCircle') : '') +
          '<button class="btn ' + (ac ? 'btn-sec' : 'btn-pri') + ' btn-cheio" type="button" data-acao="aceitar-missao">' + (ac ? 'Desfazer aceite' : ic('check', 'ic-sm') + 'Aceitar a missão') + '</button>' +
          '<button class="btn btn-sec btn-cheio" type="button" data-acao="reflexao">' + ic('notebook', 'ic-sm') + (E.missao.reflexao ? 'Editar minha reflexão' : 'Registrar uma reflexão (privada)') + '</button></div>' +
        '<p class="peq" style="text-align:center">No máximo um lembrete por semana, e só se você ativar em Perfil.</p>' +
      '</div>',
      depois: function () {
        document.querySelectorAll('[data-missao]').forEach(function (cb) { cb.addEventListener('change', function () {
          var i = +cb.getAttribute('data-missao'), f = E.missao.feitos;
          if (cb.checked) f.push(i); else f.splice(f.indexOf(i), 1);
          cb.closest('.marcar').classList.toggle('feito', cb.checked); salva();
        }); });
      } };
  };

  /* 08 · Eventos */
  T.eventos = function () {
    var filtro = aba.evFiltro, lista = D.eventos.filter(function (e) { return filtro === 'Todos' || e.cat === filtro; });
    var conteudo = !aba.evCarregou ? '<div aria-busy="true" aria-label="Carregando eventos"><div class="esq"></div><div class="esq"></div><div class="esq"></div></div>' :
      lista.length ? '<div style="display:grid;gap:12px">' + lista.map(cardEvento).join('') + '</div>' :
      '<div class="vazio">' + ic('calendar') + '<b>Nenhum evento de ' + esc(filtro) + ' por enquanto</b><p>Quando a liderança marcar, aparece aqui. Enquanto isso, veja todos os eventos.</p><button class="btn btn-sec" type="button" data-acao="filtro" data-v="Todos" style="margin-top:12px">Ver todos</button></div>';
    return { cab: 'normal', nav: 'eventos', titulo: 'Eventos', html:
      '<div class="sec pt">' +
        '<div class="chips" role="group" aria-label="Filtrar por categoria">' + ['Todos'].concat(D.categorias).map(function (c) { return '<button class="chip" type="button" aria-pressed="' + (c === filtro) + '" data-acao="filtro" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
        '<p class="peq" aria-live="polite">' + (aba.evCarregou ? lista.length + (lista.length === 1 ? ' evento' : ' eventos') + ' · novembro e dezembro (demonstração)' : 'Carregando…') + '</p>' +
        conteudo +
        '<div class="fim-lista">' + ic('calendar') + '<b>Esses são os próximos encontros.</b>Encontros presenciais são o coração do Conexão Jovem.</div>' +
      '</div>',
      depois: function () { if (!aba.evCarregou) setTimeout(function () { aba.evCarregou = true; if (rotaAtual().nome === 'eventos') render(true); }, 450); } };
  };
  T.evento = function (id) {
    var ev = D.eventos.filter(function (e) { return e.id === id; })[0];
    if (!ev) return T.erro();
    var insc = E.inscricoes[ev.id];
    var inscricao = ev.vagas == null ?
      '<div class="cartao"><h3>Participação</h3><p>Não precisa de inscrição: é só chegar. Se quiser, coloque na sua agenda.</p><button class="btn btn-pri btn-cheio" type="button" data-acao="agenda" data-v="' + ev.id + '">' + ic('calendar', 'ic-sm') + 'Adicionar à minha agenda</button></div>' :
      insc ? '<div class="cartao">' + (insc === 'confirmada' ? aviso('<b>Inscrição confirmada.</b> (demonstração: nada foi enviado à liderança)', 'aviso-verde', 'checkCircle') : aviso('<b>Inscrição aguardando autorização do responsável.</b> Na Fase 2 o responsável autoriza e você recebe a confirmação.', '', 'hourglass')) +
        '<button class="btn btn-pri btn-cheio" type="button" data-acao="agenda" data-v="' + ev.id + '">' + ic('calendar', 'ic-sm') + 'Adicionar à minha agenda</button><button class="btn btn-perigo btn-cheio" type="button" data-acao="cancelar-insc" data-v="' + ev.id + '">Cancelar inscrição</button></div>' :
      '<div class="cartao"><h3>Inscrição</h3><p>' + ev.vagas + ' vagas (demonstração). ' + (ev.autorizacao ? 'Menores de 18 precisam de autorização do responsável.' : '') + '</p><button class="btn btn-pri btn-cheio" type="button" data-acao="inscrever" data-v="' + ev.id + '">Fazer inscrição</button></div>';
    return { cab: 'normal', voltar: '#/eventos', nav: 'eventos', titulo: ev.cat, html:
      '<div class="hero"><div class="hero-arte">' + arte(ev.arte) + '</div><div class="hero-txt"><p class="sobre">' + esc(ev.cat) + '</p><h2>' + esc(ev.titulo) + '</h2><p>' + esc(ev.data + ' · ' + ev.hora) + '</p></div></div>' +
      '<div class="sec pt">' +
        '<div class="cartao"><div class="info-linhas">' +
          '<div class="info-linha">' + ic('calendar') + '<div><b>' + esc(ev.data + ' · ' + ev.hora) + '</b><span>Data e horário</span></div></div>' +
          '<div class="info-linha">' + ic('pin') + '<div><b>' + esc(ev.local) + '</b><span>Local</span></div></div>' +
          '<div class="info-linha">' + ic('user') + '<div><b>' + esc(ev.resp) + '</b><span>Responsável</span></div></div>' +
          '<div class="info-linha">' + ic('users') + '<div><b>' + esc(ev.faixa) + '</b><span>Faixa etária</span></div></div></div></div>' +
        '<div class="cartao"><h3>Sobre</h3><p>' + esc(ev.descricao) + '</p><h3>Orientações</h3><p>' + esc(ev.orient) + '</p></div>' +
        '<div class="cartao cartao-linha"><h3 style="display:flex;gap:8px;align-items:center">' + ic('access') + 'Acessibilidade</h3><p>' + esc(ev.acess) + '</p></div>' +
        (ev.autorizacao ? '<div class="cartao cartao-ouro"><h3 style="display:flex;gap:8px;align-items:center">' + ic('shield') + 'Autorização para menores</h3><p style="color:#5E4A1C">Para quem tem 15 a 17 anos: autorização do responsável, regras de transporte, uso de imagem e entrega/retirada conforme a política da igreja.</p>' + fase2('A autorização digital do responsável chega na Fase 2.') + '</div>' : '') +
        inscricao +
      '</div>' };
  };

  /* 09 · Palavra / Devocional */
  T.palavra = function () {
    var dv = D.devocionais[aba.dev], lidos = E.leituras[dv.id] || [], dia = diario();
    return { cab: 'normal', nav: 'palavra', titulo: 'Palavra', html:
      '<div class="sec pt"><div class="chips" role="group" aria-label="Escolher devocional">' + D.devocionais.map(function (d, k) { return '<button class="chip" type="button" aria-pressed="' + (k === aba.dev) + '" data-acao="dev" data-v="' + k + '">' + esc(d.data) + '</button>'; }).join('') + '</div></div>' +
      '<div class="sec pt">' +
        '<article class="cartao" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/7">' + arte('livro', true) + '</div><div style="padding:18px">' +
          '<span class="selo selo-ouro">' + ic('sun') + esc(dv.data) + '</span><h2 class="tit" style="font-size:22px;margin-top:10px">' + esc(dv.titulo) + '</h2>' +
          '<blockquote style="margin-top:12px;border-left:3px solid var(--ouro);padding:4px 0 4px 14px;font-size:17px;font-weight:700;color:var(--navy);line-height:1.45">“' + esc(dv.verso) + '”<cite style="display:block;font-style:normal;font-size:13px;color:var(--ouro-esc);margin-top:6px">' + esc(dv.ref) + ' · paráfrase</cite></blockquote>' +
          '<p style="margin-top:14px;color:var(--texto);font-size:15.5px;line-height:1.65">' + esc(dv.reflexao) + '</p></div></article>' +
        '<div class="cartao cartao-azul"><h3 style="display:flex;gap:8px;align-items:center">' + ic('message') + 'Para refletir</h3><p style="color:#1D3B78;font-size:15px">' + esc(dv.pergunta) + '</p></div>' +
        '<div class="cartao cartao-ouro"><h3 style="display:flex;gap:8px;align-items:center">' + ic('heart') + 'Oração</h3><p style="color:#5E4A1C;font-size:15px">' + esc(dv.oracao) + '</p></div>' +
        '<div class="cartao"><h3>Leitura da semana</h3><p>Marque o que já leu. Sem pontos e sem sequência para manter.</p>' +
          dv.leitura.map(function (l, i) { var ok = lidos.indexOf(i) >= 0; return '<label class="marcar' + (ok ? ' feito' : '') + '"><input type="checkbox" data-leitura="' + dv.id + '" data-i="' + i + '"' + (ok ? ' checked' : '') + '><span>' + esc(l) + '</span></label>'; }).join('') +
          '<a class="btn btn-sec btn-cheio" href="/?radar">' + ic('book', 'ic-sm') + 'Abrir a Bíblia no Radar Atual</a></div>' +
        '<div class="cartao" id="diario"><h3 style="display:flex;gap:8px;align-items:center">' + ic('notebook') + 'Meu diário</h3>' +
          aviso('<b>Privado de verdade:</b> fica só neste aparelho. Ninguém da liderança vê, nem na Fase 2 (privado por padrão).', 'aviso-azul', 'lock') +
          '<div class="campo"><label for="c-diario">O que Deus falou com você hoje?</label><textarea class="entrada" id="c-diario" maxlength="2000" aria-describedby="e-diario" placeholder="Escreva livremente…"></textarea><span class="erro-msg" id="e-diario" role="alert"></span></div>' +
          '<button class="btn btn-pri btn-cheio" type="button" data-acao="salvar-diario" data-v="' + dv.id + '">Guardar no meu aparelho</button>' +
          (dia.length ? '<div style="display:grid;gap:8px">' + dia.slice().reverse().map(function (x) { return '<div class="diario-item"><small><span>' + esc(x.quando) + ' · ' + esc(x.titulo) + '</span><button class="btn btn-txt" type="button" data-acao="apagar-diario" data-v="' + x.id + '" aria-label="Apagar anotação de ' + esc(x.quando) + '" style="min-height:40px;color:var(--erro)">' + ic('trash', 'ic-sm') + '</button></small><p>' + esc(x.texto) + '</p></div>'; }).join('') + '</div>' :
            '<p class="peq">Nenhuma anotação ainda. Quando escrever, aparece aqui.</p>') + '</div>' +
      '</div>',
      depois: function () {
        document.querySelectorAll('[data-leitura]').forEach(function (cb) { cb.addEventListener('change', function () {
          var id = cb.getAttribute('data-leitura'), i = +cb.getAttribute('data-i'), f = E.leituras[id] || (E.leituras[id] = []);
          if (cb.checked) f.push(i); else f.splice(f.indexOf(i), 1);
          cb.closest('.marcar').classList.toggle('feito', cb.checked); salva();
        }); });
      } };
  };

  /* 10 · Comunidade */
  T.comunidade = function (_, q) {
    var a = q.aba || 'circulo';
    var posts = (D.posts[a] || []).filter(function (p) { return E.silenciados.indexOf(p.autor) < 0; });
    var meus = E.envios.filter(function (x) { return x.aba === a; });
    var corpo;
    if (menorPendente()) {
      corpo = '<div class="cartao bloqueio"><span class="ic-caixa ouro">' + ic('lock', 'ic-lg') + '</span><h3>Mural liberado após a aprovação</h3><p>Como seu cadastro é de 15–17 anos, o mural abre depois da autorização do responsável e da aprovação da liderança. É para sua proteção.</p><a class="btn btn-sec btn-cheio" href="#/consentimento" style="margin-top:14px">Ver situação do cadastro</a></div>';
    } else {
      corpo = (a !== 'testemunhos' ? '<div class="cartao"><div class="campo"><label for="c-post">Compartilhar com ' + (a === 'circulo' ? 'o seu círculo' : 'a comunidade') + '</label><textarea class="entrada" id="c-post" maxlength="500" style="min-height:90px" aria-describedby="d-post e-post" placeholder="Uma pergunta, um agradecimento, um convite…"></textarea><span class="dica" id="d-post">Passa por moderação antes de aparecer. Não publique dados de outras pessoas.</span><span class="erro-msg" id="e-post" role="alert"></span></div><button class="btn btn-pri btn-cheio" type="button" data-acao="publicar" data-v="' + a + '">' + ic('send', 'ic-sm') + 'Enviar para moderação</button></div>' :
          '<div class="cartao cartao-linha"><p>Testemunhos só são publicados com consentimento de quem conta. Quer compartilhar o seu? Envie pelo Acolhimento e a equipe conversa com você antes.</p><a class="btn btn-sec btn-cheio" href="#/acolhimento?aba=conversa">Quero compartilhar meu testemunho</a></div>') +
        meus.map(function (x) { return '<div class="post" style="border:1.5px dashed #CAD3E4;box-shadow:none"><div class="post-cab">' + av(E.perfil.nome, '#2462D2', 'av-sm') + '<div><b>Você</b><span>agora</span></div><span class="selo selo-alerta">' + ic('hourglass') + 'Em moderação</span></div><p class="post-txt">' + esc(x.texto) + '</p></div>'; }).join('') +
        posts.map(post).join('') +
        (E.silenciados.length ? '<p class="peq" style="text-align:center">' + E.silenciados.length + ' autor(es) silenciado(s) por você. <button class="btn btn-txt" type="button" data-acao="dessilenciar">Desfazer</button></p>' : '') +
        '<div class="fim-lista">' + ic('checkCircle') + '<b>Você está em dia.</b>Não há mais publicações nesta semana. Sem rolagem infinita: até o próximo encontro!</div>';
    }
    return { cab: 'normal', nav: 'comunidade', titulo: 'Comunidade', html:
      '<div class="sec pt">' +
        '<a class="cartao cartao-link" href="#/circulo"><span class="ic-caixa">' + ic('users') + '</span><div><h3>' + esc(D.circulo.nome) + '</h3><p>Encontro, integrantes e pauta</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<div class="abas" role="tablist" aria-label="Murais">' + [['circulo', 'Meu Círculo'], ['geral', 'Geral'], ['testemunhos', 'Testemunhos']].map(function (x) { return '<a class="aba" role="tab" aria-selected="' + (a === x[0]) + '" href="#/comunidade?aba=' + x[0] + '" style="display:grid;place-items:center;text-decoration:none">' + x[1] + '</a>'; }).join('') + '</div>' +
        '<div class="cartao cartao-azul" style="display:flex;gap:12px;align-items:flex-start"><span class="ic-caixa" style="background:#fff">' + ic('shield') + '</span><div style="flex:1;min-width:0"><h3>Ambiente seguro</h3><p style="color:#1D3B78">Publicações moderadas por líderes. Respeito, edificação e nenhuma exposição.</p><button class="btn btn-txt" type="button" data-acao="regras" style="padding-left:0">Ler as regras</button></div></div>' +
        corpo +
      '</div>' };
  };
  function post(p) {
    var apoiou = !!E.apoios[p.id], nc = (D.comentarios[p.id] || []).length + ((E.comentarios[p.id] || []).length);
    return '<article class="post"><div class="post-cab">' + av(p.autor, p.cor, 'av-sm') + '<div><b>' + esc(p.autor) + '</b><span>' + esc(p.onde) + ' · ' + esc(p.quando) + '</span></div></div><p class="post-txt">' + esc(p.texto) + '</p>' +
      '<div class="post-acoes"><button class="post-acao" type="button" aria-pressed="' + apoiou + '" data-acao="apoiar" data-v="' + p.id + '">' + ic('heart', 'ic-sm') + (apoiou ? 'Você apoiou' : 'Apoiar') + '</button>' +
      '<button class="post-acao" type="button" data-acao="comentarios" data-v="' + p.id + '">' + ic('message', 'ic-sm') + 'Comentar' + (nc ? ' (' + nc + ')' : '') + '</button>' +
      '<button class="post-acao dir" type="button" data-acao="denunciar" data-v="' + p.id + '" aria-label="Denunciar publicação de ' + esc(p.autor) + '">' + ic('flag', 'ic-sm') + 'Denunciar</button></div></article>';
  }
  function acharPost(id) { var t = null; ['circulo', 'geral', 'testemunhos'].forEach(function (k) { D.posts[k].forEach(function (p) { if (p.id === id) t = p; }); }); return t; }

  /* 11 · Talentos e Serviço */
  T.talentos = function () {
    var t = E.talentos;
    var corpo = t.enviado ?
      '<div class="cartao">' + aviso('<b>Interesse enviado (demonstração).</b> Um líder autorizado vai entrar em contato para conversar, verificar preparo, idade e requisitos.', 'aviso-verde', 'checkCircle') +
        '<h3>Você indicou</h3><div class="selos">' + t.sel.map(function (id) { var x = D.talentos.filter(function (y) { return y.id === id; })[0]; return '<span class="selo selo-azul">' + ic(x.ic) + esc(x.nome) + '</span>'; }).join('') + '</div>' +
        '<p><b style="color:var(--navy)">Disponibilidade:</b> ' + esc(t.disp.join(', ') || 'a combinar') + '</p>' +
        '<button class="btn btn-sec btn-cheio" type="button" data-acao="editar-talentos">Editar meu interesse</button></div>' :
      '<div class="cartao"><h3>Onde você gostaria de servir?</h3><p>Escolha quantos quiser.</p><div class="chips chips-quebra" role="group" aria-label="Áreas de serviço">' +
        D.talentos.map(function (x) { return '<button class="chip" type="button" aria-pressed="' + (t.sel.indexOf(x.id) >= 0) + '" data-acao="talento" data-v="' + x.id + '">' + ic(x.ic) + esc(x.nome) + '</button>'; }).join('') + '</div><span class="erro-msg" id="e-talento" role="alert"></span></div>' +
      '<div class="cartao"><h3>Quando você pode?</h3>' + D.disponibilidade.map(function (d) { return '<label class="marcar"><input type="checkbox" data-disp="' + esc(d) + '"' + (t.disp.indexOf(d) >= 0 ? ' checked' : '') + '><span>' + esc(d) + '</span></label>'; }).join('') +
        '<div class="campo" style="margin-top:8px"><label for="c-obs">Quer contar algo? <span class="peq">(opcional)</span></label><textarea class="entrada" id="c-obs" maxlength="400" style="min-height:90px" placeholder="Ex.: toco violão há 2 anos; nunca fiz recepção mas quero aprender.">' + esc(t.obs) + '</textarea></div></div>' +
      aviso('Nada disso é publicado. Escalas e dados de menores não aparecem para outros jovens.', 'aviso-azul', 'lock') +
      '<button class="btn btn-pri btn-cheio" type="button" data-acao="enviar-talentos">' + ic('send', 'ic-sm') + 'Quero servir</button>';
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Talentos e Serviço', html:
      '<div class="hero"><div class="hero-arte">' + arte('talentos', true) + '</div><div class="hero-txt"><p class="sobre">' + ic('sparkles', 'ic-sm') + 'Talentos e Serviço</p><h2>Coloque seus dons a serviço</h2><p>Descubra onde servir e aprender com quem já serve.</p></div></div>' +
      '<div class="sec pt">' + corpo + '</div>' };
  };

  /* 12 · Acolhimento */
  T.acolhimento = function (_, q) {
    var a = q.aba === 'conversa' ? 'conversa' : 'oracao', corpo;
    if (a === 'oracao') {
      corpo = '<div class="cartao"><h3 style="display:flex;gap:8px;align-items:center">' + ic('heart') + 'Pedido de oração</h3><p>Compartilhe seu pedido. Ele nunca é público.</p>' +
        '<div class="campo"><label for="c-oracao" class="sr">Seu pedido</label><textarea class="entrada" id="c-oracao" maxlength="1000" aria-describedby="e-oracao" placeholder="Escreva aqui o seu pedido…"></textarea><span class="erro-msg" id="e-oracao" role="alert"></span></div>' +
        '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Quem pode ver</legend><div class="opcoes">' +
          '<label class="opcao"><input type="radio" name="vis" value="equipe" checked><div><b>Equipe de oração autorizada</b><span>Só você e a equipe pastoral designada. Recomendado.</span></div></label>' +
          '<label class="opcao"><input type="radio" name="vis" value="eu"><div><b>Só eu</b><span>Fica guardado apenas neste aparelho, como anotação pessoal.</span></div></label></div></fieldset>' +
        '<button class="btn btn-pri btn-cheio" type="button" data-acao="enviar-oracao">' + ic('send', 'ic-sm') + 'Enviar pedido</button></div>' +
        (E.oracoes.length ? '<div class="cartao"><h3>Seus pedidos (neste aparelho)</h3><ul class="lista">' + E.oracoes.slice().reverse().map(function (o) { return li(o.vis === 'eu' ? 'lock' : 'heart', esc(o.texto.slice(0, 60)) + (o.texto.length > 60 ? '…' : ''), esc(o.quando) + ' · ' + (o.vis === 'eu' ? 'só você' : 'recebido pela equipe (demonstração)')); }).join('') + '</ul></div>' : '');
    } else {
      corpo = '<div class="cartao"><h3 style="display:flex;gap:8px;align-items:center">' + ic('message') + 'Pedir uma conversa</h3><p>Precisa de orientação, apoio ou só alguém para ouvir? Um líder responde pelo canal oficial da igreja.</p>' +
        '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Com quem</legend><div class="opcoes">' +
          ['Líder do meu círculo|Rafael T. ou Camila S. (demonstração)', 'Conversa pastoral|Com o pastor ou dirigente responsável', 'Dúvidas sobre fé|Um espaço seguro para perguntas sinceras', 'Estou passando por um momento difícil|Alguém da equipe de cuidado entra em contato'].map(function (s, k) {
            var p = s.split('|'); return '<label class="opcao"><input type="radio" name="cat" value="' + esc(p[0]) + '"' + (k === 0 ? ' checked' : '') + '><div><b>' + p[0] + '</b><span>' + p[1] + '</span></div></label>'; }).join('') + '</div></fieldset>' +
        '<div class="campo"><label for="c-contato">Como prefere o retorno?</label><select class="entrada" id="c-contato"><option>WhatsApp oficial da igreja</option><option>Pessoalmente, depois do culto</option><option>Ligação telefônica</option></select></div>' +
        '<div class="campo"><label for="c-conv">Quer adiantar o assunto? <span class="peq">(opcional)</span></label><textarea class="entrada" id="c-conv" maxlength="600" style="min-height:90px" placeholder="Só se quiser."></textarea></div>' +
        '<button class="btn btn-pri btn-cheio" type="button" data-acao="enviar-conversa">' + ic('send', 'ic-sm') + 'Solicitar conversa</button>' +
        '<p class="peq">Retorno em até 72 horas úteis (meta da igreja). Nunca por mensagem privada de um adulto que você não conhece.</p></div>' +
        (E.conversas.length ? '<div class="cartao"><h3>Seus pedidos de conversa</h3><ul class="lista">' + E.conversas.slice().reverse().map(function (c) { return li('clock', esc(c.cat), esc(c.quando) + ' · aguardando retorno (demonstração)'); }).join('') + '</ul></div>' : '');
    }
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Acolhimento', html:
      '<div class="sec pt">' +
        '<div class="abas" role="tablist" aria-label="Tipo de pedido"><a class="aba" role="tab" aria-selected="' + (a === 'oracao') + '" href="#/acolhimento?aba=oracao" style="display:grid;place-items:center;text-decoration:none">Oração</a><a class="aba" role="tab" aria-selected="' + (a === 'conversa') + '" href="#/acolhimento?aba=conversa" style="display:grid;place-items:center;text-decoration:none">Conversa</a></div>' +
        corpo +
        '<div class="cartao cartao-linha"><h3 style="display:flex;gap:8px;align-items:center">' + ic('shield') + 'Limites da confidencialidade</h3><p>Tratamos o que você contar com cuidado e discrição. Mas, se houver risco à sua vida ou à de outra pessoa, abuso, violência ou exploração, a equipe precisa agir para proteger você, o que pode incluir avisar responsáveis ou serviços especializados. Por isso não prometemos sigilo absoluto.</p></div>' +
        '<div class="cartao cartao-ouro"><h3 style="display:flex;gap:8px;align-items:center">' + ic('buoy') + 'Precisa de ajuda agora?</h3><p style="color:#5E4A1C">Se você ou alguém está em perigo, não espere o retorno do app:</p>' +
          '<div class="btns-2"><a class="btn btn-sec" href="tel:188">' + ic('phone', 'ic-sm') + 'CVV 188</a><a class="btn btn-sec" href="tel:192">' + ic('phone', 'ic-sm') + 'SAMU 192</a><a class="btn btn-sec" href="tel:190">' + ic('phone', 'ic-sm') + 'Polícia 190</a><a class="btn btn-sec" href="tel:100">' + ic('phone', 'ic-sm') + 'Disque 100</a></div>' +
          '<p class="peq" style="color:#5E4A1C">CVV: apoio emocional, 24 h. Disque 100: violações de direitos, inclusive contra crianças e adolescentes. Você também pode procurar o Conselho Tutelar da sua cidade.</p></div>' +
      '</div>' };
  };

  /* 13 · Perfil e preferências */
  T.perfil = function () {
    var p = E.perfil, n = p.notif, todos = ['Louvor', 'Esporte', 'Amizade', 'Bíblia', 'Mídia', 'Missões', 'Ação social', 'Teatro'];
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Meu Perfil', direita: '<button class="cab-bt" type="button" data-acao="editar-perfil" aria-label="Editar perfil">' + ic('pencil') + '</button>', html:
      '<div class="perfil-topo">' + av(p.nome, '#2462D2', 'av-lg') + '<h2>' + esc(p.nome) + '</h2><p>' + FAIXAS[p.faixa] + ' · ' + esc(D.circulo.nome) + '</p></div>' +
      '<div class="sec sobe">' +
        '<div class="cartao"><h3>Sobre mim</h3><p>' + (p.sobre ? esc(p.sobre) : 'Conte um pouco sobre você (opcional).') + '</p><button class="btn btn-sec btn-cheio" type="button" data-acao="editar-perfil">' + ic('pencil', 'ic-sm') + 'Editar perfil</button></div>' +
        '<div class="cartao"><h3>Meus interesses</h3><div class="chips chips-quebra" role="group" aria-label="Interesses">' + todos.map(function (i) { return '<button class="chip" type="button" aria-pressed="' + (p.interesses.indexOf(i) >= 0) + '" data-acao="interesse" data-v="' + i + '">' + esc(i) + '</button>'; }).join('') + '</div></div>' +
        '<div class="cartao"><h3>Notificações</h3>' +
          interruptor('n-palavra', 'Palavra do Dia', 'Um aviso por dia. Pode pausar quando quiser.', n.palavra) +
          (n.palavra ? '<div class="campo" style="padding:0 0 12px"><label for="c-hora">Horário</label><select class="entrada" id="c-hora">' + ['06:00', '07:00', '08:00', '12:00', '19:00', '21:00'].map(function (h) { return '<option' + (h === n.hora ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></div>' : '') +
          interruptor('n-circulo', 'Avisos do meu círculo', 'Só encontros marcados do seu círculo.', n.circulo) +
          interruptor('n-missao', 'Lembrete da missão', 'No máximo um por semana, sem cobrança.', n.missao) +
          interruptor('n-evento', 'Confirmações de eventos', 'Sempre ligado: avisa mudanças nos eventos em que você se inscreveu.', true, true) +
          fase2('Nesta demonstração nenhuma notificação é enviada. Os avisos chegam na Fase 2, sem revelar conteúdo sensível na tela bloqueada.') + '</div>' +
        '<div class="cartao"><h3>Privacidade</h3>' +
          interruptor('p-nome', 'Mostrar meu nome completo ao círculo', 'Desligado: aparece só o nome de exibição.', p.nomeCompleto) +
          '<ul class="lista" style="margin-top:4px">' + li('eyeOff', 'Perfil não público', 'Não aparece em buscas nem fora do app.') + '</ul>' +
          '<a class="btn btn-sec btn-cheio" href="#/consentimento">Faixa etária e consentimento</a></div>' +
        '<div class="cartao"><h3>Seus dados</h3><p>Tudo desta demonstração está guardado só neste aparelho.</p><div class="btns">' +
          '<button class="btn btn-sec btn-cheio" type="button" data-acao="baixar-dados">' + ic('download', 'ic-sm') + 'Baixar meus dados</button>' +
          '<button class="btn btn-perigo btn-cheio" type="button" data-acao="apagar-tudo">' + ic('trash', 'ic-sm') + 'Apagar tudo deste aparelho</button></div></div>' +
        '<button class="btn btn-sec btn-cheio" type="button" data-acao="sair">' + ic('logout', 'ic-sm') + 'Sair</button>' +
      '</div>' };
  };

  /* Mais */
  T.mais = function () {
    function it(h, i, b, s) { return '<li><a href="' + h + '"><span class="ic-caixa">' + ic(i) + '</span><span class="li-t"><b>' + b + '</b><span>' + s + '</span></span>' + ic('right', 'ic seta') + '</a></li>'; }
    return { cab: 'normal', nav: 'mais', titulo: 'Mais', html:
      '<div class="sec pt">' +
        '<a class="cartao cartao-link" href="#/perfil">' + av(nomeExib(), '#2462D2') + '<div><h3>' + esc(nomeExib()) + '</h3><p>' + esc(FAIXAS[euAtivo() ? euAtivo().faixa : E.perfil.faixa] || '') + ' · ver perfil e preferências</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          it('#/talentos', 'sparkles', 'Talentos e Serviço', 'Indique onde quer servir') +
          it('#/acolhimento', 'heart', 'Acolhimento', 'Pedido de oração e conversa') +
          it('#/jornada', 'compass', 'Minha Jornada', '90 dias, no seu ritmo') +
          it('#/missao', 'target', 'Missão da Semana', D.missao.titulo) +
          it('#/circulo', 'users', 'Meu Círculo', real() ? (euAtivo() && euAtivo().circulo) || 'Encontrar um círculo' : D.circulo.nome) +
          (!real() || souLider() ? it('#/lider-circulo', 'shield', 'Conduzir meu círculo', real() ? 'Pedidos, encontros e presença' : 'Visão do líder (demonstração)') : '') + '</ul></div>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          (!real() || (euAtivo() && euAtivo().equipe) ? it('#/pessoas', 'users', 'Pessoas', real() ? 'Aprovar, cadastrar e dar papéis' : 'Gestão de pessoas (demonstração)') +
            it('#/circulos', 'heartHandshake', 'Círculos', real() ? 'Criar, líderes, integrantes e trocas' : 'Gestão de círculos (demonstração)') +
            it('#/lideranca', 'chart', 'Painel de liderança', 'Prévia com dados fictícios') : '') +
          '<li><button type="button" data-acao="regras"><span class="ic-caixa">' + ic('shield') + '</span><span class="li-t"><b>Regras da comunidade</b><span>Respeito, cuidado e proteção</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          '<li><button type="button" data-acao="politica"><span class="ic-caixa">' + ic('lock') + '</span><span class="li-t"><b>Privacidade</b><span>Como cuidamos dos seus dados</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          it('#/boas-vindas', 'home', 'Rever boas-vindas', 'Tela de apresentação') + '</ul></div>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          '<li><a href="/?radar"><span class="ic-caixa ouro">' + ic('radar') + '</span><span class="li-t"><b>Ir para o Radar Atual</b><span>Bíblia, pregações e mais</span></span>' + ic('right', 'ic seta') + '</a></li>' +
          '<li><a href="/?capa"><span class="ic-caixa ouro">' + ic('left') + '</span><span class="li-t"><b>Voltar à capa</b><span>Escolher entre Radar e Conexão Jovem</span></span>' + ic('right', 'ic seta') + '</a></li></ul></div>' +
        (real() ? aviso('<b>Conectado com a sua conta do Radar.</b> Perfil, consentimento, Pessoas e Círculos usam dados reais. As demais telas ainda mostram a demonstração.', 'aviso-azul', 'info') : AV_DEMO) +
        '<p class="peq" style="text-align:center;letter-spacing:.04em">CONEXÃO JOVEM · ' + (real() ? 'Módulos 1 e 2' : 'demonstração') + '</p>' +
      '</div>' };
  };

  /* 14 · Painel de liderança (prévia) */
  T.lideranca = function () {
    var L = D.lideranca;
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Painel de liderança', html:
      '<div class="sec pt">' +
        '<a class="cartao cartao-link" href="#/pessoas"><span class="ic-caixa">' + ic('users') + '</span><div><h3>Pessoas</h3><p>Aprovar pendentes, cadastrar pelo WhatsApp, dar e retirar papéis.</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<a class="cartao cartao-link" href="#/circulos"><span class="ic-caixa">' + ic('heartHandshake') + '</span><div><h3>Círculos</h3><p>Criar e editar círculos, escolher líder e auxiliar, integrantes, pedidos e trocas.</p></div>' + ic('right', 'ic seta') + '</a>' +
        aviso('<b>Os números abaixo são fictícios.</b> Só papéis autorizados acessam, com registro de auditoria. O painel mostra dados agregados: nunca diário espiritual nem o conteúdo de pedidos de oração.', '', 'info') +
        '<h2 class="tit-sec" style="margin-top:8px">Integração · últimos 30 dias</h2>' +
        '<div class="kpis">' + L.kpis.map(function (k) { return '<div class="kpi"><small>' + esc(k.rot) + '</small><b>' + esc(k.val) + '</b><span>' + esc(k.meta) + '</span></div>'; }).join('') + '</div>' +
        '<div class="cartao"><h3>Continuidade por janela</h3><p>Participaram de ao menos uma experiência presencial (coorte de setembro). Interpretar o contexto, sem rotular ausentes.</p>' +
          '<div class="barras" role="list">' + L.continuidade.map(function (c) { return '<div class="barra-l" role="listitem" aria-label="' + c.rot + ': ' + c.val + '%"><span>' + c.rot + '</span><span class="barra-trilho"><span class="barra-cheia" style="width:' + c.val + '%;display:block"></span></span><b>' + c.val + '%</b></div>'; }).join('') + '</div></div>' +
        '<h2 class="tit-sec">Alertas operacionais</h2>' +
        '<div class="cartao"><ul class="lista">' + L.alertas.map(function (a) { var ok = E.alertasOk.indexOf(a.id) >= 0;
          return '<li style="align-items:flex-start"><span class="ic-caixa ' + (ok ? 'verde' : 'ouro') + '">' + ic(ok ? 'check' : a.ic) + '</span><span class="li-t"><b>' + esc(a.titulo) + '</b><span>' + esc(a.texto) + '</span><br><button class="btn btn-txt" type="button" data-acao="alerta" data-v="' + a.id + '" style="padding-left:0">' + (ok ? 'Encaminhado · desfazer' : 'Marcar como encaminhado') + '</button></span></li>'; }).join('') + '</ul></div>' +
        '<h2 class="tit-sec">Círculos (prévia fictícia)</h2>' +
        '<div class="cartao"><ul class="lista">' + D.outrosCirculos.map(function (c) { return li('users', esc(c.nome) + (c.alerta ? ' <span class="selo selo-alerta">Atenção</span>' : ''), esc(c.faixa + ' · ' + c.membros + ' integrantes · ' + c.encontro)); }).join('') + '</ul></div>' +
        '<h2 class="tit-sec">Conteúdos e pedidos</h2>' +
        '<div class="cartao"><ul class="lista">' + L.conteudos.map(function (c) { return li('file', esc(c.titulo), esc(c.status)); }).join('') +
          li('lock', 'Pedidos de oração e conversa', 'Visíveis só para a equipe designada. Aqui aparecem apenas contagens.') + '</ul></div>' +
        '<div class="cartao"><h3>Gestão</h3><div class="btns">' +
          '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('plus', 'ic-sm') + 'Criar evento</button>' +
          '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('megaphone', 'ic-sm') + 'Novo comunicado</button>' +
          '<a class="btn btn-sec btn-cheio" href="#/pessoas">' + ic('shield', 'ic-sm') + 'Pessoas e papéis</a></div>' +
          fase2('Eventos e comunicados chegam nos próximos módulos. Pessoas e papéis já funcionam (com o banco, quando o módulo estiver ligado).') + '</div>' +
      '</div>' };
  };

  T.erro = function () {
    return { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Não encontrado', html:
      '<div class="sec pt-l"><div class="vazio">' + ic('compass') + '<b>Esta tela não existe</b><p>O link pode estar errado ou ter mudado.</p><a class="btn btn-pri" href="#/inicio" style="margin-top:14px">Voltar ao início</a></div></div>' };
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     MÓDULO 1 · login pelo crachá do Radar e gestão de pessoas (17/11/2026)
     Modo automático (ver cj-api.js): 'real' usa o banco; 'sem_cracha' orienta o cadastro
     no Radar; 'demo' é a Fase 1 intacta. As telas deste módulo: Entrar, Consentimento,
     Perfil e Pessoas (painel). As demais continuam em demonstração, com o selo.
     ═══════════════════════════════════════════════════════════════════════════ */
  var API = window.CJAPI || null;
  var R = { modo: API && API.cracha() ? 'verificando' : 'demo', motivo: '', eu: null };
  var VERSAO_TERMOS = '2026-11';
  var DOCS = ['termos_uso', 'privacidade', 'regras_comunidade'];
  function real() { return R.modo === 'real'; }
  function euAtivo() { return real() && R.eu && R.eu.id ? R.eu : null; }
  function verificando() { return R.modo === 'verificando'; }
  function nomeExib() { var e = euAtivo(); return e ? e.nome : E.perfil.nome; }
  function primeiroNome() { return String(nomeExib() || '').trim().split(/\s+/)[0] || 'você'; }
  var PAPEL = { member: 'Membro', circle_leader: 'Líder de círculo', assistant: 'Auxiliar', safeguarding_admin: 'Proteção', youth_admin: 'Coordenação', pastor: 'Pastor' };
  var PAPEL_DICA = { circle_leader: 'Conduz um círculo da sua faixa (só adultos).', assistant: 'Ajuda o líder a cuidar do círculo.', safeguarding_admin: 'Recebe denúncias e casos de proteção.',
    youth_admin: 'Aprova pessoas, cadastra e dá papéis de líder e auxiliar.', pastor: 'Responsável pastoral. Dá qualquer papel.' };
  var ORDEM_PAPEIS = ['circle_leader', 'assistant', 'safeguarding_admin', 'youth_admin', 'pastor'];
  var STATUS = { pendente: 'Pendente', ativo: 'Ativo', suspenso: 'Desativado', encerrado: 'Encerrado' };
  var MSG = {
    sem_permissao: 'Você não tem permissão para fazer isso.', ja_existe: 'Já existe uma pessoa com este WhatsApp.',
    nao_encontrado: 'Não encontramos esta pessoa. Atualize a lista.', offline: 'Sem conexão agora. Confira a internet e tente de novo.',
    perfil_suspenso: 'Seu acesso ao Conexão Jovem está desativado. Fale com a liderança de jovens.', sem_perfil: 'Você ainda não entrou no Conexão Jovem.',
    cracha_invalido: 'Seu login do Radar não foi reconhecido. Abra o Radar e confirme seu WhatsApp.', nao_configurado: 'O módulo ainda não está ligado.',
    dados_invalidos: 'Confira os dados e tente de novo.', erro_interno: 'Algo deu errado do nosso lado. Tente de novo em instantes.'
  };
  function msgErro(r) { r = r || {}; return r.mensagem || MSG[r.motivo] || (r.motivo && r.motivo.length > 12 && /\s/.test(r.motivo) ? r.motivo : 'Não foi possível concluir. Tente de novo.'); }
  function api(acao, dados) { return API.chamar(acao, dados).then(function (r) { if (!r.ok) throw r; return r; }); }
  function atualizarEu() { return API.atualizarEu().then(function (r) { R.eu = API.estado.eu; return r; }); }
  function ocupado(btn, sim) { if (!btn) return; btn.disabled = !!sim; btn.classList.toggle('carregando', !!sim); if (sim) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy'); }
  function caixaErro(id, msg) { var b = document.getElementById(id); if (b) b.innerHTML = msg ? aviso(esc(msg), 'aviso-erro', 'alert') : ''; }
  function precisaRegras() { var e = euAtivo(); return !!e && (e.termos || []).indexOf('regras_comunidade') < 0; }
  function telaCarregando(titulo, voltar) {
    return { cab: 'normal', voltar: voltar || '#/boas-vindas', nav: false, titulo: titulo, real: true, html:
      '<div class="sec pt-l"><div class="cartao carregando-cartao" aria-busy="true"><span class="gira-ic" aria-hidden="true"></span><div><h3>Conferindo seu cadastro</h3><p>Usamos o mesmo login do Radar Atual.</p></div></div></div>' };
  }
  function telaSemPerfil(titulo, voltar) {
    return { cab: 'normal', voltar: voltar || '#/boas-vindas', nav: false, titulo: titulo, real: true, html:
      '<div class="sec pt-l">' + (R.eu && !R.eu.id ? aviso('<b>Acesso desativado.</b> ' + esc(MSG.perfil_suspenso), 'aviso-erro', 'lock') :
      '<div class="vazio">' + ic('user') + '<b>Você ainda não entrou</b><p>Leva menos de um minuto, com a mesma conta do Radar Atual.</p><a class="btn btn-pri" href="#/entrar" style="margin-top:14px">Entrar no Conexão Jovem</a></div>') + '</div>' };
  }

  /* 02 · Entrar — real (crachá do Radar) e "sem crachá" (orienta o cadastro do Radar) */
  var entrarDemo = T.entrar;
  T.entrar = function () {
    if (verificando()) return telaCarregando('Entrar');
    if (R.modo === 'sem_cracha') return entrarRadar();
    if (!real()) return entrarDemo();
    if (R.eu && !R.eu.id) return telaSemPerfil('Entrar');
    if (R.eu) return { cab: 'normal', voltar: '#/boas-vindas', nav: false, titulo: 'Entrar', real: true, html:
      '<div class="sec pt-l"><div class="cartao">' + aviso('Você já entrou como <b>' + esc(R.eu.nome) + '</b>, com a mesma conta do Radar Atual.', 'aviso-verde', 'checkCircle') +
      '<a class="btn btn-pri btn-cheio" href="' + (precisaRegras() ? '#/consentimento' : '#/inicio') + '">Continuar</a></div></div>' };
    var ur = API.usuarioRadar(), sug = ur && ur.nome ? ur.nome.trim().split(/\s+/).slice(0, 2).join(' ') : '';
    return { cab: 'normal', voltar: '#/boas-vindas', nav: false, titulo: 'Entrar', real: true, html:
      '<div class="sec pt-l">' +
        '<div><h2 class="tit" style="font-size:22px">Que bom que você veio</h2><p class="sub" style="margin-top:4px">Você já tem cadastro no Radar Atual. Falta só isto para entrar no Conexão Jovem, sem refazer nada.</p></div>' +
        '<div class="cartao"><form class="form" id="f-entrar-real" novalidate>' +
          aviso('WhatsApp confirmado no Radar Atual. É ele que identifica você aqui.', 'aviso-verde', 'checkCircle') +
          '<div class="campo"><label for="r-nome">Como quer ser chamado?</label><input class="entrada" id="r-nome" autocomplete="nickname" maxlength="60" value="' + esc(sug) + '" aria-describedby="r-d-nome r-e-nome"><span class="dica" id="r-d-nome">Seu círculo e a liderança verão este nome.</span><span class="erro-msg" id="r-e-nome" role="alert"></span></div>' +
          '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Qual é a sua faixa etária?</legend><div class="opcoes opcoes-3">' + ['15-17', '18-21', '22-25'].map(function (v) {
            return '<label class="opcao"><input type="radio" name="r-faixa" value="' + v + '" aria-describedby="r-e-faixa"><b>' + v.replace('-', '–') + '</b><span>anos</span></label>'; }).join('') + '</div>' +
            '<span class="peq" style="display:block;margin-top:6px">Para separar os grupos por idade e proteger menores.</span><span class="erro-msg" id="r-e-faixa" role="alert"></span></fieldset>' +
          '<label class="opcao"><input type="checkbox" id="r-aceite" aria-describedby="r-e-aceite"><div><b>Li e aceito</b><span>as <button type="button" class="btn-txt" style="min-height:0;padding:0;display:inline;font-weight:700" data-acao="regras">regras da comunidade</button> e a <button type="button" class="btn-txt" style="min-height:0;padding:0;display:inline;font-weight:700" data-acao="politica">política de privacidade</button>.</span><span class="erro-msg" id="r-e-aceite" role="alert"></span></div></label>' +
          '<div id="r-erro"></div>' +
          '<button class="btn btn-pri btn-cheio" type="submit">Entrar no Conexão Jovem</button></form></div>' +
        '<p class="peq" style="text-align:center">Seu cadastro começa como "pendente" até alguém da liderança fazer o seu acolhimento.</p>' +
      '</div>',
      depois: function () {
        var f = document.getElementById('f-entrar-real');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var nome = document.getElementById('r-nome'), aceite = document.getElementById('r-aceite'), fx = f.querySelector('input[name=r-faixa]:checked');
          var ok = erroCampo(nome, nome.value.trim().length < 2 ? 'Digite como quer ser chamado (pelo menos 2 letras).' : '');
          var ef = document.getElementById('r-e-faixa'); ef.innerHTML = fx ? '' : ic('alert') + 'Escolha a sua faixa etária.'; ok = !!fx && ok;
          ok = erroCampo(aceite, aceite.checked ? '' : 'Para continuar, aceite as regras e a política.') && ok;
          if (!ok) return;
          var bt = f.querySelector('[type=submit]'); ocupado(bt, true); caixaErro('r-erro', '');
          api('entrar', { nome: nome.value.trim(), faixa: fx.value })
            .then(function () { return api('aceitar_termos', { documentos: DOCS, versao: VERSAO_TERMOS }); })
            .then(atualizarEu)
            .then(function () {
              ocupado(bt, false);
              toast('Pronto, você entrou', 'Seu cadastro aguarda o acolhimento da liderança.');
              location.hash = R.eu && R.eu.faixa === '15-17' ? '#/consentimento' : '#/inicio';
            })['catch'](function (r) { ocupado(bt, false); caixaErro('r-erro', msgErro(r)); });
        });
      } };
  };
  function entrarRadar() {
    var ur = API && API.usuarioRadar(), falta = R.motivo === 'cracha_invalido' || (ur && !ur.confirmado);
    return { cab: 'normal', voltar: '#/boas-vindas', nav: false, titulo: 'Entrar', real: true, html:
      '<div class="sec pt-l">' +
        '<div><h2 class="tit" style="font-size:22px">Entre com a sua conta do Radar Atual</h2><p class="sub" style="margin-top:4px">O Conexão Jovem usa o mesmo cadastro do Radar: um código pelo WhatsApp, sem senha.</p></div>' +
        (falta ? aviso('<b>Falta confirmar o seu WhatsApp no Radar.</b> Abra o Radar Atual, toque em "Confirmar" e digite o código que chegou no WhatsApp. Depois volte aqui.', '', 'alert') : '') +
        '<div class="cartao"><h3>' + (falta ? 'Como confirmar' : 'Ainda não tem cadastro?') + '</h3><ol class="marcadores">' +
          [falta ? 'Abra o Radar Atual neste mesmo aparelho.' : 'Abra o Radar Atual e faça o cadastro com nome e WhatsApp.', 'Digite o código que chega no seu WhatsApp.', 'Volte aqui: você entra sem refazer nada.'].map(function (t, k) {
            return '<li><span class="selo selo-azul" style="min-width:26px;justify-content:center">' + (k + 1) + '</span><span>' + t + '</span></li>'; }).join('') + '</ol>' +
          '<div class="btns"><a class="btn btn-pri btn-cheio" href="/?radar">' + ic('radar', 'ic-sm') + (falta ? 'Abrir o Radar Atual' : 'Fazer cadastro no Radar') + '</a>' +
          '<button class="btn btn-sec btn-cheio" type="button" data-acao="reverificar">Já fiz, entrar agora</button></div></div>' +
        '<div class="cartao"><h3>Só quer conhecer?</h3><p>Veja como o app funciona com dados fictícios. Nada sai deste aparelho.</p><button class="btn btn-sec btn-cheio" type="button" data-acao="explorar">Explorar a demonstração</button></div>' +
      '</div>' };
  }

  /* 03 · Consentimento e faixa etária — real */
  var consentDemo = T.consentimento;
  T.consentimento = function () {
    if (verificando()) return telaCarregando('Antes de começar', '#/entrar');
    if (!real()) return consentDemo();
    var e = euAtivo();
    if (!e) return telaSemPerfil('Antes de começar', '#/entrar');
    var n = e.notificacoes || {}, regras = (e.termos || []).indexOf('regras_comunidade') >= 0;
    return { cab: 'normal', voltar: '#/inicio', nav: false, titulo: 'Antes de começar', real: true, html:
      '<div class="sec pt-l">' +
        '<div><h2 class="tit" style="font-size:22px">Seus dados, explicados</h2><p class="sub" style="margin-top:4px">Leva um minuto. Você pode mudar os avisos depois em Perfil.</p></div>' +
        '<div class="cartao"><h3>O que guardamos e por quê</h3><ul class="lista">' +
          li('user', 'Nome de exibição', 'Para o seu círculo saber quem você é.') +
          li('calendar', 'Faixa etária', 'Para separar grupos por idade e proteger menores.') +
          li('phoneDev', 'WhatsApp (pelo Radar)', 'Só para reconhecer você. O número não fica guardado no Conexão Jovem.') +
          li('sparkles', 'Interesses', 'Para sugerir um círculo e formas de servir.') +
        '</ul><p>Seu perfil não é público. Diário e pedidos de oração nunca aparecem no mural. Você pode baixar ou apagar seus dados em Perfil.</p></div>' +
        '<div class="cartao"><h3>Sua faixa etária</h3><p style="font-size:18px;font-weight:800;color:var(--navy)">' + esc(FAIXAS[e.faixa] || e.faixa) + '</p><p>Informada no seu cadastro. Se estiver errada, fale com a liderança: ela corrige.</p></div>' +
        (e.faixa === '15-17' ? '<div id="menor-box">' + caixaMenorReal(e) + '</div>' : '') +
        '<div class="cartao"><h3>Avisos (você escolhe)</h3><p>Tudo começa desligado. Nada de lembretes insistentes.</p>' +
          interruptor('rc-palavra', 'Palavra do Dia', 'Um aviso por dia, no horário que você quiser.', n.palavra) +
          interruptor('rc-circulo', 'Avisos do meu círculo', 'Quando houver encontro marcado.', n.circulo) + '</div>' +
        '<div class="cartao"><label class="opcao" style="border:0;padding:0;min-height:0"><input type="checkbox" id="c-regras" aria-describedby="e-regras"' + (regras ? ' checked' : '') + '><div><b>Concordo com as regras da comunidade</b><span>Respeito, cuidado e proteção para todos.</span><span class="erro-msg" id="e-regras" role="alert"></span></div></label>' +
          '<div class="btns-2" style="margin-top:12px"><button class="btn btn-sec" type="button" data-acao="regras">Ler regras</button><button class="btn btn-sec" type="button" data-acao="politica">Privacidade</button></div></div>' +
        '<div id="rc-erro"></div>' +
        '<button class="btn btn-pri btn-cheio" type="button" data-acao="consentir-real">Salvar e continuar</button>' +
      '</div>',
      depois: function () { var f = document.getElementById('f-consent'); if (f) f.addEventListener('submit', enviarConsent); } };
  };
  function enviarConsent(ev) {
    ev.preventDefault();
    var f = ev.target, resp = document.getElementById('rc-resp'), cont = document.getElementById('rc-cont');
    var ok = erroCampo(resp, resp.value.trim().length < 3 ? 'Digite o nome do responsável.' : '');
    ok = erroCampo(cont, cont.value.trim().length < 8 ? 'Informe um telefone ou e-mail do responsável.' : '') && ok;
    if (!ok) return;
    var bt = f.querySelector('[type=submit]'); ocupado(bt, true); caixaErro('rc-c-erro', '');
    api('pedir_consentimento', { responsavel: resp.value.trim(), parentesco: document.getElementById('rc-par').value, contato: cont.value.trim(),
      social: document.getElementById('rc-social').checked, eventos: document.getElementById('rc-eventos').checked, imagem: document.getElementById('rc-imagem').checked, versao: VERSAO_TERMOS })
      .then(atualizarEu).then(function () { var e = euAtivo(), box = document.getElementById('menor-box'); if (box && e) box.innerHTML = caixaMenorReal(e); toast('Pedido de autorização enviado', 'A equipe vai confirmar com o seu responsável.'); })
      ['catch'](function (r) { ocupado(bt, false); caixaErro('rc-c-erro', msgErro(r)); });
  }
  function caixaMenorReal(e) {
    var c = e.consentimento || null, st = c ? c.status : '';
    if (st === 'aprovado' || st === 'pendente') {
      return '<div class="cartao cartao-ouro"><div class="selos"><span class="selo ' + (st === 'aprovado' ? 'selo-verde' : 'selo-alerta') + '">' + ic(st === 'aprovado' ? 'checkCircle' : 'hourglass') +
        (st === 'aprovado' ? 'Autorização aprovada' : 'Aguardando a equipe') + '</span></div><h3>Autorização do responsável</h3>' +
        '<p style="color:#5E4A1C">' + (st === 'aprovado' ? 'A equipe confirmou a autorização com o seu responsável.' : 'Recebemos o pedido. Alguém da equipe vai confirmar com o seu responsável antes de liberar mural, comentários e círculo.') + '</p>' +
        '<ul class="marcadores">' + [['social', 'Mural, comentários e círculo'], ['eventos', 'Inscrições em eventos'], ['imagem', 'Uso de imagem']].map(function (x) {
          return '<li>' + ic(c[x[0]] ? 'check' : 'x') + '<span>' + x[1] + (c[x[0]] ? '' : ' (não autorizado)') + '</span></li>'; }).join('') + '</ul></div>';
    }
    return '<div class="cartao cartao-ouro"><div class="selos"><span class="selo selo-alerta">' + ic('shield') + 'Autorização necessária</span></div>' +
      '<h3>Para quem tem 15 a 17 anos</h3>' + (st === 'recusado' || st === 'revogado' ? aviso('O pedido anterior não foi aprovado. Você pode enviar um novo.', 'aviso-erro', 'alert') : '') +
      '<p style="color:#5E4A1C">Mural, comentários e círculo são liberados depois que a equipe confirmar a autorização com o seu responsável. Pedir oração, pedir conversa e denunciar já funcionam.</p>' +
      '<form class="form" id="f-consent" novalidate>' +
        '<div class="campo"><label for="rc-resp">Nome do responsável</label><input class="entrada" id="rc-resp" maxlength="120" placeholder="Mãe, pai ou responsável legal" aria-describedby="rc-e-resp"><span class="erro-msg" id="rc-e-resp" role="alert"></span></div>' +
        '<div class="campo"><label for="rc-par">Parentesco</label><select class="entrada" id="rc-par"><option value="mae">Mãe</option><option value="pai">Pai</option><option value="responsavel_legal">Responsável legal</option><option value="outro">Outro</option></select></div>' +
        '<div class="campo"><label for="rc-cont">Telefone ou e-mail do responsável</label><input class="entrada" id="rc-cont" maxlength="120" aria-describedby="rc-d-cont rc-e-cont"><span class="dica" id="rc-d-cont">A equipe usa só para confirmar a autorização.</span><span class="erro-msg" id="rc-e-cont" role="alert"></span></div>' +
        '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">O que o responsável autoriza</legend>' +
          '<label class="marcar"><input type="checkbox" id="rc-social" checked><span>Mural, comentários e círculo</span></label>' +
          '<label class="marcar"><input type="checkbox" id="rc-eventos" checked><span>Inscrições em eventos</span></label>' +
          '<label class="marcar"><input type="checkbox" id="rc-imagem"><span>Uso de imagem (fotos em eventos)</span></label></fieldset>' +
        '<div id="rc-c-erro"></div>' +
        '<button class="btn btn-sec btn-cheio" type="submit">' + ic('send', 'ic-sm') + 'Enviar pedido de autorização</button></form>' +
      fase2('Texto e forma de verificação do responsável ainda dependem de aprovação da liderança e revisão jurídica (ECA Digital, LGPD).') + '</div>';
  }

  /* 13 · Perfil — real */
  var perfilDemo = T.perfil;
  var INTERESSES = ['Louvor', 'Esporte', 'Amizade', 'Bíblia', 'Mídia', 'Missões', 'Ação social', 'Teatro'];
  T.perfil = function () {
    if (verificando()) return telaCarregando('Meu Perfil', '#/mais');
    if (!real()) return perfilDemo();
    var p = euAtivo();
    if (!p) return telaSemPerfil('Meu Perfil', '#/mais');
    var n = p.notificacoes || {}, ints = p.interesses || [];
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Meu Perfil', real: true, direita: '<button class="cab-bt" type="button" data-acao="editar-perfil-real" aria-label="Editar perfil">' + ic('pencil') + '</button>', html:
      '<div class="perfil-topo">' + av(p.nome, '#2462D2', 'av-lg') + '<h2>' + esc(p.nome) + '</h2><p>' + esc(FAIXAS[p.faixa] || p.faixa) + ' · ' + esc(p.circulo || 'ainda sem círculo') + '</p></div>' +
      '<div class="sec sobe">' +
        (p.status === 'pendente' ? aviso('<b>Cadastro aguardando acolhimento.</b> Alguém da liderança vai falar com você. Enquanto isso, você já pode ler a Palavra e pedir oração.', '', 'hourglass') : '') +
        ((p.papeis || []).length ? '<div class="cartao"><h3>Meus papéis</h3><div class="selos">' + p.papeis.map(function (x) { return '<span class="selo selo-azul">' + esc(PAPEL[x] || x) + '</span>'; }).join('') + '</div>' +
          (p.equipe ? '<a class="btn btn-sec btn-cheio" href="#/pessoas">' + ic('users', 'ic-sm') + 'Gerir pessoas</a>' : '') + '</div>' : '') +
        '<div class="cartao"><h3>Sobre mim</h3><p>' + (p.sobre ? esc(p.sobre) : 'Conte um pouco sobre você (opcional).') + '</p><button class="btn btn-sec btn-cheio" type="button" data-acao="editar-perfil-real">' + ic('pencil', 'ic-sm') + 'Editar perfil</button></div>' +
        '<div class="cartao"><h3>Meus interesses</h3><div class="chips chips-quebra" role="group" aria-label="Interesses">' + INTERESSES.map(function (i) { return '<button class="chip" type="button" aria-pressed="' + (ints.indexOf(i) >= 0) + '" data-acao="interesse-real" data-v="' + esc(i) + '">' + esc(i) + '</button>'; }).join('') + '</div></div>' +
        '<div class="cartao"><h3>Notificações</h3>' +
          interruptor('r-n-palavra', 'Palavra do Dia', 'Um aviso por dia. Pode pausar quando quiser.', n.palavra) +
          (n.palavra ? '<div class="campo" style="padding:0 0 12px"><label for="r-hora">Horário</label><select class="entrada" id="r-hora">' + ['06:00', '07:00', '08:00', '12:00', '19:00', '21:00'].map(function (h) { return '<option' + (h === n.hora ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></div>' : '') +
          interruptor('r-n-circulo', 'Avisos do meu círculo', 'Só encontros marcados do seu círculo.', n.circulo) +
          interruptor('r-n-missao', 'Lembrete da missão', 'No máximo um por semana, sem cobrança.', n.missao) +
          fase2('As preferências ficam salvas. O envio dos avisos ao celular chega em um próximo módulo.') + '</div>' +
        '<div class="cartao"><h3>Privacidade</h3>' +
          interruptor('r-p-nome', 'Mostrar meu nome completo ao círculo', 'Desligado: aparece o primeiro nome e a inicial.', p.nome_completo) +
          '<ul class="lista" style="margin-top:4px">' + li('eyeOff', 'Perfil não público', 'Não aparece em buscas nem fora do app.') + '</ul>' +
          '<a class="btn btn-sec btn-cheio" href="#/consentimento">Faixa etária e consentimento</a></div>' +
        '<div class="cartao"><h3>Seus dados</h3><p>Ficam no banco do Conexão Jovem, protegidos por regras de acesso. O diário continua só neste aparelho.</p><div class="btns">' +
          '<button class="btn btn-sec btn-cheio" type="button" data-acao="baixar-dados-real">' + ic('download', 'ic-sm') + 'Baixar meus dados</button>' +
          '<button class="btn btn-perigo btn-cheio" type="button" data-acao="excluir-conta-real">' + ic('trash', 'ic-sm') + 'Excluir minha conta do Conexão Jovem</button></div></div>' +
        '<div class="cartao"><h3>Conta</h3><p>Você entrou com a mesma conta do Radar Atual (WhatsApp confirmado). Para usar outra conta, saia do Radar neste aparelho.</p><a class="btn btn-sec btn-cheio" href="/?radar">' + ic('radar', 'ic-sm') + 'Ir para o Radar Atual</a></div>' +
      '</div>' };
  };
  function salvarPerfil(dados, ok, falha) {
    return api('atualizar_perfil', dados).then(atualizarEu).then(function () { if (ok) ok(); })['catch'](function (r) { if (falha) falha(r); toast('Não foi possível salvar', msgErro(r)); });
  }

  /* Painel · Pessoas (Módulo 1) ─────────────────────────────────────────────── */
  var PS = { filtros: { status: 'todos', faixa: '', circulo: '', busca: '' }, dados: null, circulos: [], pode: [], carregando: false, erro: '', seq: 0 };
  var FILTROS_STATUS = [['todos', 'Todos'], ['pendente', 'Pendentes'], ['ativo', 'Ativos'], ['suspenso', 'Desativados'], ['nao_vinculado', 'Ainda não entraram']];
  function demoVerComo() { return E.demoVerComo === 'youth_admin' ? 'youth_admin' : 'pastor'; }
  function demoPessoas() {
    if (!Array.isArray(E.pessoasDemo)) { E.pessoasDemo = JSON.parse(JSON.stringify(D.pessoas || [])); salva(); }
    var eu = demoVerComo() === 'pastor' ? 'd01' : 'd02';
    E.pessoasDemo.forEach(function (p) { p.voce = p.id === eu; });
    return E.pessoasDemo;
  }
  function podeConceder() { return real() ? PS.pode : (demoVerComo() === 'pastor' ? ['member', 'circle_leader', 'assistant', 'youth_admin', 'safeguarding_admin', 'pastor'] : ['member', 'circle_leader', 'assistant']); }
  function souGestao() { return real() ? !!(euAtivo() && euAtivo().gestao) : true; }
  function souPastor() { return real() ? !!(euAtivo() && (euAtivo().papeis || []).indexOf('pastor') >= 0) : demoVerComo() === 'pastor'; }
  function telefoneCanon(v) { var d = soDigitos(v); if (d.length > 11 && d.indexOf('55') === 0 && (d.length === 12 || d.length === 13)) d = d.slice(2); return d; }
  function hashCurto(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'h' + (h >>> 0).toString(36); }
  function recusa(msg, motivo) { return Promise.reject({ ok: false, motivo: motivo || 'sem_permissao', mensagem: msg }); }

  // Uma só porta para as operações: banco (modo real) ou simulação local (demonstração).
  function obterPessoas() {
    var f = PS.filtros;
    if (real()) return api('pessoas', { filtros: { status: f.status, faixa: f.faixa || null, circulo: f.circulo || null, busca: f.busca || null } }).then(function (r) { return r.dados; });
    return new Promise(function (ok) { setTimeout(function () {
      var b = f.busca.trim().toLowerCase();
      var lista = demoPessoas().filter(function (p) {
        if (f.status === 'todos' ? p.status === 'encerrado' : f.status === 'nao_vinculado' ? p.vinculado : p.status !== f.status) return false;
        if (f.faixa && p.faixa !== f.faixa) return false;
        if (f.circulo && (f.circulo === 'nenhum' ? !!p.circulo_id : p.circulo_id !== f.circulo)) return false;
        return !b || p.nome.toLowerCase().indexOf(b) >= 0;
      }).sort(function (a, c) { return (a.status === 'pendente' ? 0 : 1) - (c.status === 'pendente' ? 0 : 1) || a.nome.localeCompare(c.nome, 'pt-BR'); });
      ok({ pessoas: JSON.parse(JSON.stringify(lista)), circulos: D.pessoasCirculos || [], pode_conceder: podeConceder() });
    }, 280); });
  }
  function opPessoa(acao, d) {
    if (real()) return api(acao, d);
    var lista = demoPessoas(), p = lista.filter(function (x) { return x.id === d.usuario; })[0];
    var pastoresAtivos = lista.filter(function (x) { return x.status === 'ativo' && x.papeis.indexOf('pastor') >= 0; }).length;
    var equipe = function (x) { return x.papeis.some(function (r) { return ['youth_admin', 'pastor', 'safeguarding_admin'].indexOf(r) >= 0; }); };
    return new Promise(function (ok) { setTimeout(ok, 320); }).then(function () {
      if (acao === 'pre_cadastrar') {
        var fone = telefoneCanon(d.whatsapp);
        if (fone.length < 10 || fone.length > 15) return recusa('WhatsApp inválido: use DDD + número (10 ou 11 dígitos)', 'dados_invalidos');
        E.fonesDemo = E.fonesDemo || [];
        if (E.fonesDemo.indexOf(hashCurto(fone)) >= 0) return recusa(MSG.ja_existe, 'ja_existe');
        E.fonesDemo.push(hashCurto(fone));
        lista.push({ id: 'n' + Date.now().toString(36), nome: d.nome, faixa: d.faixa, status: d.ativar === false ? 'pendente' : 'ativo', papeis: [], circulo_id: null, circulo_nome: null,
          vinculado: false, pre_cadastrado: true, regras_aceitas: false, consentimento: d.faixa === '15-17' ? 'nao_pedido' : 'nao_exigido', acolhido: false });
        salva(); return { ok: true };
      }
      if (!p) return recusa(MSG.nao_encontrado, 'nao_encontrado');
      if (acao === 'ativar_perfil' || acao === 'desativar_pessoa') {
        if (p.voce) return recusa('ninguém altera o próprio status');
        if (equipe(p) && !souPastor()) return recusa('só o pastor altera o status de quem é da equipe');
        if (acao === 'desativar_pessoa' && p.papeis.indexOf('pastor') >= 0 && p.status === 'ativo' && pastoresAtivos <= 1) return recusa('não dá para desativar o último pastor ativo', 'dados_invalidos');
        p.status = acao === 'ativar_perfil' ? 'ativo' : 'suspenso';
      } else if (acao === 'conceder_papel' || acao === 'revogar_papel') {
        if (podeConceder().indexOf(d.papel) < 0) return recusa(acao === 'conceder_papel' ? 'sem permissão para conceder este papel' : 'sem permissão para revogar este papel');
        if (acao === 'conceder_papel') {
          if (p.voce && !souPastor()) return recusa('ninguém concede papel a si mesmo');
          if (p.faixa === '15-17') return recusa('menor de idade não recebe papel de liderança', 'dados_invalidos');
          if (p.papeis.indexOf(d.papel) < 0) p.papeis.push(d.papel);
        } else {
          if (d.papel === 'pastor' && p.status === 'ativo' && pastoresAtivos <= 1) return recusa('não dá para retirar o papel do último pastor ativo', 'dados_invalidos');
          p.papeis = p.papeis.filter(function (r) { return r !== d.papel; });
        }
      } else if (acao === 'definir_faixa') {
        if (p.faixa !== d.faixa) { p.circulo_id = null; p.circulo_nome = null; if (d.faixa === '15-17') { p.papeis = []; p.consentimento = 'nao_pedido'; } else p.consentimento = 'nao_exigido'; }
        p.faixa = d.faixa;
      } else if (acao === 'registrar_acolhimento') p.acolhido = true;
      salva(); return { ok: true };
    });
  }

  T.pessoas = function () {
    var voltar = '#/lideranca';
    if (verificando()) return telaCarregando('Pessoas', voltar);
    if (real() && !(euAtivo() && euAtivo().equipe)) return { cab: 'normal', voltar: voltar, nav: 'mais', titulo: 'Pessoas', real: true, html:
      '<div class="sec pt-l"><div class="vazio">' + ic('lock') + '<b>Área da equipe</b><p>A lista de pessoas é só para a coordenação de jovens, o pastor e a equipe de proteção.</p><a class="btn btn-sec" href="#/mais" style="margin-top:14px">Voltar</a></div></div>' };
    var gestao = souGestao(), f = PS.filtros;
    return { cab: 'normal', voltar: voltar, nav: 'mais', titulo: 'Pessoas', real: true,
      direita: gestao ? '<button class="cab-bt" type="button" data-acao="cadastrar-pessoa" aria-label="Cadastrar pessoa">' + ic('plus') + '</button>' : '', html:
      '<div class="sec pt">' +
        (!real() ? aviso('<b>Demonstração.</b> Pessoas fictícias; o que você mudar fica só neste aparelho.', '', 'info') +
          '<div class="cartao"><h3>Ver a tela como</h3><div class="btns-2" role="group" aria-label="Ver a tela como">' + [['pastor', 'Pastor'], ['youth_admin', 'Coordenação']].map(function (x) {
            return '<button class="btn ' + (demoVerComo() === x[0] ? 'btn-pri' : 'btn-sec') + '" type="button" aria-pressed="' + (demoVerComo() === x[0]) + '" data-acao="ver-como" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          '<p class="peq">A coordenação dá papéis de líder e auxiliar; proteção, coordenação e pastor só o pastor concede.</p></div>' : '') +
        (real() && !gestao ? aviso('Você pode consultar a lista. Aprovar, cadastrar e dar papéis é com a coordenação de jovens e o pastor.', 'aviso-azul', 'info') : '') +
        '<div class="campo"><label for="c-busca" class="sr">Buscar pelo nome</label><input class="entrada" id="c-busca" type="search" maxlength="60" autocomplete="off" placeholder="Buscar pelo nome" value="' + esc(f.busca) + '"></div>' +
        '<div class="chips filtro-chips" role="group" aria-label="Filtrar por situação">' + FILTROS_STATUS.map(function (x) {
          return '<button class="chip" type="button" aria-pressed="' + (f.status === x[0]) + '" data-acao="filtro-pessoas" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="filtros-2"><div class="campo"><label for="c-ffaixa">Faixa etária</label><select class="entrada" id="c-ffaixa"><option value="">Todas</option>' +
          ['15-17', '18-21', '22-25'].map(function (v) { return '<option value="' + v + '"' + (f.faixa === v ? ' selected' : '') + '>' + v.replace('-', '–') + ' anos</option>'; }).join('') + '</select></div>' +
          '<div class="campo"><label for="c-fcirc">Círculo</label><select class="entrada" id="c-fcirc">' + opcoesCirculo() + '</select></div></div>' +
        (gestao ? '<button class="btn btn-pri btn-cheio" type="button" data-acao="cadastrar-pessoa">' + ic('plus', 'ic-sm') + 'Cadastrar pessoa pelo WhatsApp</button>' : '') +
        '<div id="pessoas-lista"></div>' +
      '</div>',
      depois: function () {
        var bx = document.getElementById('c-busca'), espera = null;
        bx.addEventListener('input', function () { clearTimeout(espera); espera = setTimeout(function () { PS.filtros.busca = bx.value; carregarPessoas(); }, 350); });
        document.getElementById('c-ffaixa').addEventListener('change', function (e) { PS.filtros.faixa = e.target.value; carregarPessoas(); });
        document.getElementById('c-fcirc').addEventListener('change', function (e) { PS.filtros.circulo = e.target.value; carregarPessoas(); });
        carregarPessoas();
      } };
  };
  function opcoesCirculo() {
    var f = PS.filtros.circulo;
    return '<option value="">Todos</option><option value="nenhum"' + (f === 'nenhum' ? ' selected' : '') + '>Sem círculo</option>' +
      PS.circulos.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('');
  }
  function carregarPessoas() {
    var s = ++PS.seq; PS.carregando = true; PS.erro = ''; pintarLista();
    obterPessoas().then(function (d) {
      if (s !== PS.seq) return;
      var mudouCirc = JSON.stringify(PS.circulos) !== JSON.stringify(d.circulos || []);
      PS.dados = d.pessoas || []; PS.circulos = d.circulos || []; PS.pode = d.pode_conceder || []; PS.carregando = false;
      var sel = document.getElementById('c-fcirc'); if (sel && mudouCirc) sel.innerHTML = opcoesCirculo();
      pintarLista();
    })['catch'](function (r) { if (s !== PS.seq) return; PS.carregando = false; PS.erro = msgErro(r); pintarLista(); });
  }
  function selosPessoa(p) {
    var s = [];
    if (p.status === 'pendente') s.push('<span class="selo selo-alerta">' + ic('hourglass') + 'Pendente</span>');
    if (p.status === 'suspenso') s.push('<span class="selo selo-cinza">' + ic('lock') + 'Desativado</span>');
    if (!p.vinculado) s.push('<span class="selo selo-azul">' + ic('phoneDev') + 'Ainda não entrou</span>');
    if (p.faixa === '15-17' && p.consentimento !== 'aprovado') s.push('<span class="selo selo-ouro">' + ic('shield') + 'Autorização ' + (p.consentimento === 'pendente' ? 'em análise' : 'pendente') + '</span>');
    (p.papeis || []).forEach(function (r) { if (r !== 'member') s.push('<span class="selo selo-verde">' + esc(PAPEL[r] || r) + '</span>'); });
    return s.length ? '<span class="selos">' + s.join('') + '</span>' : '';
  }
  function pintarLista() {
    var box = document.getElementById('pessoas-lista'); if (!box) return;
    if (PS.erro) { box.innerHTML = aviso('<b>Não foi possível carregar a lista.</b> ' + esc(PS.erro), 'aviso-erro', 'alert') + '<button class="btn btn-sec btn-cheio" type="button" data-acao="recarregar-pessoas" style="margin-top:10px">Tentar de novo</button>'; return; }
    if (PS.carregando && !PS.dados) { box.innerHTML = '<div class="pessoas" aria-busy="true"><p class="sr">Carregando pessoas…</p><div class="esqueleto"></div><div class="esqueleto"></div><div class="esqueleto"></div></div>'; return; }
    var lista = PS.dados || [], gestao = souGestao();
    if (!lista.length) { box.innerHTML = '<div class="vazio">' + ic('users') + '<b>Ninguém encontrado</b><p>Mude a busca ou os filtros' + (gestao ? ', ou cadastre alguém pelo WhatsApp' : '') + '.</p><button class="btn btn-sec" type="button" data-acao="limpar-filtros" style="margin-top:12px">Limpar filtros</button></div>'; return; }
    var pend = lista.filter(function (p) { return p.status === 'pendente'; }).length;
    box.innerHTML = '<p class="peq" role="status">' + lista.length + (lista.length === 1 ? ' pessoa' : ' pessoas') + (pend ? ' · ' + pend + (pend === 1 ? ' pendente' : ' pendentes') : '') + (PS.carregando ? ' · atualizando…' : '') + '</p>' +
      '<ul class="pessoas' + (PS.carregando ? ' lista-carregando' : '') + '"' + (PS.carregando ? ' aria-busy="true"' : '') + '>' + lista.map(function (p) {
        return '<li><button type="button" class="pessoa-bt" data-acao="pessoa" data-v="' + esc(p.id) + '">' + av(p.nome, p.status === 'suspenso' ? '#8A93A6' : '#2462D2', 'av-sm') +
          '<span class="li-t"><b>' + esc(p.nome) + (p.voce ? ' (você)' : '') + '</b><span>' + esc((FAIXAS[p.faixa] || p.faixa) + ' · ' + (p.circulo_nome || 'sem círculo')) + '</span>' + selosPessoa(p) + '</span></button>' +
          (gestao && p.status === 'pendente' && !p.voce ? '<button type="button" class="btn btn-pri btn-mini" data-acao="aprovar-pessoa" data-v="' + esc(p.id) + '" aria-label="Aprovar ' + esc(p.nome) + '">Aprovar</button>' : '') + '</li>';
      }).join('') + '</ul>';
  }
  function achaPessoa(id) { return (PS.dados || []).filter(function (p) { return p.id === id; })[0]; }
  function abrirPessoa(id) {
    var p = achaPessoa(id); if (!p) return;
    var gestao = souGestao(), pode = podeConceder(), menor = p.faixa === '15-17';
    var CONS = { aprovado: 'Aprovada pela equipe', pendente: 'Pedido em análise', nao_pedido: 'Ainda não pedida', recusado: 'Recusada', revogado: 'Revogada' };
    var corpo = '<div class="info-linhas">' +
      '<div class="info-linha">' + ic('calendar') + '<div><b>' + esc(FAIXAS[p.faixa] || p.faixa) + '</b><span>Faixa etária</span></div></div>' +
      '<div class="info-linha">' + ic('users') + '<div><b>' + esc(p.circulo_nome || 'Sem círculo') + '</b><span>Círculo</span></div></div>' +
      '<div class="info-linha">' + ic(p.status === 'ativo' ? 'checkCircle' : p.status === 'pendente' ? 'hourglass' : 'lock') + '<div><b>' + esc(STATUS[p.status] || p.status) + '</b><span>' + (p.status === 'pendente' ? 'Aguardando aprovação/acolhimento' : p.status === 'suspenso' ? 'Sem acesso até ser reativada. Nada foi apagado.' : 'Com acesso ao app') + '</span></div></div>' +
      '<div class="info-linha">' + ic('phoneDev') + '<div><b>' + (p.vinculado ? 'Já entrou com o WhatsApp' : 'Ainda não entrou') + '</b><span>' + (p.pre_cadastrado && !p.vinculado ? 'Pré-cadastro: liga sozinho quando ela entrar no Radar com o número informado.' : p.pre_cadastrado ? 'Cadastrada pela liderança.' : 'Entrou pelo próprio Radar.') + '</span></div></div>' +
      (menor ? '<div class="info-linha">' + ic('shield') + '<div><b>Autorização do responsável: ' + esc(CONS[p.consentimento] || p.consentimento) + '</b><span>Menores só usam mural e círculo com autorização aprovada.</span></div></div>' : '') +
      '<div class="info-linha">' + ic('heartHandshake') + '<div><b>' + (p.acolhido ? 'Acolhimento registrado' : 'Sem acolhimento registrado') + '</b><span>' + (p.regras_aceitas ? 'Aceitou as regras da comunidade.' : 'Ainda não aceitou as regras.') + '</span></div></div></div>';
    if (!gestao) corpo += aviso('Só consulta. Aprovar, desativar e dar papéis é com a coordenação de jovens e o pastor.', 'aviso-azul', 'info');
    else if (p.voce) corpo += aviso('Este é o seu perfil. Ninguém altera o próprio status' + (souPastor() ? '.' : ' nem dá papel a si mesmo.'), 'aviso-azul', 'info');
    if (gestao && !p.voce) {
      corpo += '<h3 style="margin-top:6px">Acesso</h3><div class="btns">' +
        (p.status === 'pendente' ? '<button class="btn btn-pri btn-cheio" type="button" data-op="ativar_perfil">' + ic('check', 'ic-sm') + 'Aprovar acesso</button>' : '') +
        (p.status === 'suspenso' ? '<button class="btn btn-sec btn-cheio" type="button" data-op="ativar_perfil">Reativar</button>' : '') +
        (p.status !== 'suspenso' ? '<button class="btn btn-perigo btn-cheio" type="button" data-op="desativar_pessoa">Desativar</button>' : '') +
        (!p.acolhido ? '<button class="btn btn-sec btn-cheio" type="button" data-op="registrar_acolhimento">' + ic('heartHandshake', 'ic-sm') + 'Registrar 1º contato de acolhimento</button>' : '') + '</div>';
    }
    if (gestao && (!p.voce || souPastor())) {
      var visiveis = ORDEM_PAPEIS.filter(function (r) { return pode.indexOf(r) >= 0; });
      corpo += '<h3 style="margin-top:6px">Papéis</h3>' + (menor ? aviso('Menores de idade não recebem papel de liderança.', '', 'shield') : '') +
        '<div>' + visiveis.map(function (r) {
          var tem = (p.papeis || []).indexOf(r) >= 0;
          return '<div class="interruptor"><span class="li-t"><b id="pp-' + r + '-l">' + esc(PAPEL[r]) + '</b><span>' + esc(PAPEL_DICA[r]) + '</span></span><span class="chave"><input type="checkbox" role="switch" data-papel="' + r + '" aria-labelledby="pp-' + r + '-l"' + (tem ? ' checked' : '') + (menor && !tem ? ' disabled' : '') + '><i></i></span></div>';
        }).join('') + '</div>' +
        (visiveis.length < ORDEM_PAPEIS.length ? '<p class="peq">Proteção, coordenação e pastor: só o pastor concede.</p>' : '');
      if (!p.voce) corpo += '<h3 style="margin-top:6px">Corrigir faixa etária</h3><div class="filtros-2"><select class="entrada" id="m-faixa" aria-label="Nova faixa etária">' + ['15-17', '18-21', '22-25'].map(function (v) { return '<option value="' + v + '"' + (v === p.faixa ? ' selected' : '') + '>' + v.replace('-', '–') + ' anos</option>'; }).join('') + '</select>' +
        '<button class="btn btn-sec" type="button" data-op="definir_faixa">Salvar faixa</button></div><p class="peq">Mudar a faixa tira a pessoa do círculo atual (círculos são por idade).</p>';
    }
    corpo += '<div id="m-erro" role="alert"></div>';
    modal(p.nome, corpo, function (dlg) {
      dlg.querySelectorAll('[data-op]').forEach(function (b) { b.addEventListener('click', function () {
        var op = b.getAttribute('data-op');
        if (op === 'desativar_pessoa') return confirmarDesativar(p);
        var d = { usuario: p.id };
        if (op === 'definir_faixa') { d.faixa = dlg.querySelector('#m-faixa').value; if (d.faixa === p.faixa) return; }
        executar(op, d, b, p.id);
      }); });
      dlg.querySelectorAll('[data-papel]').forEach(function (cb) { cb.addEventListener('change', function () {
        var papel = cb.getAttribute('data-papel'), on = cb.checked;
        executar(on ? 'conceder_papel' : 'revogar_papel', { usuario: p.id, papel: papel }, cb, p.id, function () { cb.checked = !on; });
      }); });
    });
  }
  var OK_OP = { ativar_perfil: 'Acesso liberado', desativar_pessoa: 'Pessoa desativada', conceder_papel: 'Papel concedido', revogar_papel: 'Papel retirado', definir_faixa: 'Faixa corrigida', registrar_acolhimento: 'Acolhimento registrado' };
  function executar(op, d, el, id, desfaz) {
    ocupado(el, true); caixaErro('m-erro', '');
    opPessoa(op, d).then(function () {
      toast(OK_OP[op] || 'Feito', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.');
      return obterPessoas().then(function (r) { PS.dados = r.pessoas; PS.pode = r.pode_conceder || PS.pode; pintarLista(); if (achaPessoa(id)) abrirPessoa(id); else fecha(); });
    })['catch'](function (r) { ocupado(el, false); if (desfaz) desfaz(); caixaErro('m-erro', msgErro(r)); });
  }
  function confirmarDesativar(p) {
    modal('Desativar ' + p.nome + '?', '<p>A pessoa perde o acesso ao Conexão Jovem até ser reativada. <b>Nada é apagado</b>: papéis e histórico ficam guardados.</p><div id="m-erro" role="alert"></div>' +
      '<div class="btns-2"><button class="btn btn-sec" type="button" id="b-nao">Cancelar</button><button class="btn btn-perigo" type="button" id="b-sim">Desativar</button></div>', function (dlg) {
      dlg.querySelector('#b-nao').addEventListener('click', function () { abrirPessoa(p.id); });
      dlg.querySelector('#b-sim').addEventListener('click', function () { executar('desativar_pessoa', { usuario: p.id }, this, p.id); });
    });
  }
  function abrirCadastro() {
    modal('Cadastrar pessoa', '<form class="form" id="f-cad" novalidate>' +
      '<p>Cadastre quem ainda não entrou. Quando a pessoa entrar no Radar Atual com este WhatsApp, o perfil dela se liga sozinho.</p>' +
      '<div class="campo"><label for="m-nome">Nome</label><input class="entrada" id="m-nome" maxlength="60" autocomplete="off" aria-describedby="m-e-nome"><span class="erro-msg" id="m-e-nome" role="alert"></span></div>' +
      '<div class="campo"><label for="m-fone">WhatsApp</label><input class="entrada" id="m-fone" type="tel" inputmode="tel" autocomplete="off" placeholder="(00) 90000-0000" aria-describedby="m-d-fone m-e-fone"><span class="dica" id="m-d-fone">Com DDD. O número não fica guardado no Conexão Jovem: vira um código que só serve para reconhecer a pessoa.</span><span class="erro-msg" id="m-e-fone" role="alert"></span></div>' +
      '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Faixa etária</legend><div class="opcoes opcoes-3">' + ['15-17', '18-21', '22-25'].map(function (v) {
        return '<label class="opcao"><input type="radio" name="m-faixa" value="' + v + '"><b>' + v.replace('-', '–') + '</b><span>anos</span></label>'; }).join('') + '</div><span class="erro-msg" id="m-e-faixa" role="alert"></span></fieldset>' +
      '<label class="opcao"><input type="checkbox" id="m-ativar" checked><div><b>Já liberar o acesso</b><span>Desmarque para deixar como pendente até o acolhimento.</span></div></label>' +
      '<div id="m-erro" role="alert"></div>' +
      '<button class="btn btn-pri btn-cheio" type="submit">Cadastrar</button></form>', function (dlg) {
      dlg.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = dlg.querySelector('#m-nome'), fone = dlg.querySelector('#m-fone'), fx = dlg.querySelector('input[name=m-faixa]:checked'), d = telefoneCanon(fone.value);
        var ok = erroCampo(nome, nome.value.trim().length < 2 ? 'Digite o nome (pelo menos 2 letras).' : '');
        ok = erroCampo(fone, d.length < 10 || d.length > 13 ? 'Confira o número: DDD + celular, 10 ou 11 dígitos.' : '') && ok;
        dlg.querySelector('#m-e-faixa').innerHTML = fx ? '' : ic('alert') + 'Escolha a faixa etária.'; ok = !!fx && ok;
        if (!ok) return;
        var bt = this.querySelector('[type=submit]'); ocupado(bt, true); caixaErro('m-erro', '');
        opPessoa('pre_cadastrar', { nome: nome.value.trim(), whatsapp: fone.value, faixa: fx.value, ativar: dlg.querySelector('#m-ativar').checked }).then(function () {
          fecha(); toast('Pessoa cadastrada', 'Quando ela entrar no Radar com esse WhatsApp, o perfil se liga sozinho.');
          carregarPessoas();
        })['catch'](function (r) { ocupado(bt, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  }

  // Depois que o modo é descoberto: ajusta a tela atual sem quebrar nada.
  function aposModo(st) {
    R.modo = st.modo; R.motivo = st.motivo; R.eu = st.eu || null;
    if (st.vinculou) toast('Encontramos o seu cadastro', 'A liderança já tinha cadastrado você. Agora está tudo ligado.');
    var r = rotaAtual().nome;
    if (real() && euAtivo() && r === 'entrar') { location.hash = precisaRegras() ? '#/consentimento' : '#/inicio'; return; }
    if (real() && !R.eu && r === 'inicio' && !E.entrou) { location.hash = '#/boas-vindas'; return; }
    render(true);
  }

  /* ═══ ações (clique delegado) ═══ */
  var A = {
    explorar: function () { E.entrou = true; E.consentiu = true; salva(); location.hash = '#/inicio'; toast('Modo exploração', 'Você está vendo o protótipo com dados fictícios.'); },
    'aba-entrar': function (el) { aba.entrar = el.getAttribute('data-v'); render(); },
    'voltar-tel': function () { aba.etapaCodigo = false; render(); },
    recuperar: function () { modal('Problemas para entrar?', '<p>Não existe senha: você entra com um código enviado ao seu WhatsApp.</p><ul class="marcadores"><li>' + ic('check') + '<span>Confira se o número tem DDD.</span></li><li>' + ic('check') + '<span>Espere 1 minuto e peça um novo código.</span></li><li>' + ic('check') + '<span>Trocou de número? Procure a liderança de jovens para atualizar seu cadastro.</span></li></ul>' + fase2('O envio real do código chega na Fase 2, igual ao do Radar Atual.') + '<button class="btn btn-pri btn-cheio" type="button" data-fechar>Entendi</button>'); },
    regras: abreRegras, politica: abrePolitica,
    'simular-aprovacao': function () { E.menor.status = E.menor.status === 'aprovado' ? 'pendente' : 'aprovado'; var r = document.getElementById('c-resp'); if (r) E.menor.responsavel = r.value; salva(); document.getElementById('menor-box').innerHTML = caixaMenor(); toast(E.menor.status === 'aprovado' ? 'Aprovação simulada' : 'Simulação desfeita', 'Só nesta demonstração.'); },
    consentir: function () {
      var cb = document.getElementById('c-regras');
      if (!erroCampo(cb, cb.checked ? '' : 'Para continuar, é preciso concordar com as regras.')) { cb.focus(); return; }
      var r = document.getElementById('c-resp'); if (r) E.menor.responsavel = r.value.trim();
      E.consentiu = true; E.entrou = true; salva();
      toast('Preferências guardadas', 'Demonstração: ficam só neste aparelho.');
      location.hash = '#/inicio';
    },
    avisos: function () { modal('Avisos', '<ul class="lista">' + li('calendar', 'Encontro do círculo no sábado', 'Círculo Esperança · 16h') + li('checkCircle', 'Acampa Conexão: inscrições abertas', 'Equipe de jovens') + '</ul>' + aviso('Avisos de demonstração. Você escolhe o que recebe em Perfil, e nada é enviado ao celular nesta fase.', '', 'info') + '<a class="btn btn-sec btn-cheio" href="#/perfil" data-fechar>Preferências de avisos</a>'); },
    presenca: function (el) { var v = el.getAttribute('data-v'); E.presenca = E.presenca === v ? null : v; salva(); render(true); toast(E.presenca === 'sim' ? 'Presença confirmada' : E.presenca === 'nao' ? 'Avisamos o líder que você não poderá ir' : 'Resposta desfeita', 'Demonstração: nada foi enviado.'); },
    integrantes: function () { var c = D.circulo; modal('Integrantes · ' + c.nome, '<ul class="lista">' + c.integrantes.map(function (p) { return '<li>' + av(p.nome, p.cor, 'av-sm') + '<span class="li-t"><b>' + esc(p.nome) + '</b><span>' + (p.papel ? p.papel + ' · aprovado pela liderança' : 'Integrante') + '</span></span></li>'; }).join('') + '<li>' + av(E.perfil.nome, '#2462D2', 'av-sm') + '<span class="li-t"><b>' + esc(E.perfil.nome) + ' (você)</b><span>Integrante</span></span></li></ul>' + aviso('Pessoas fictícias. Só nome de exibição: sem telefone, endereço ou idade exata.', '', 'lock')); },
    material: function (el) { var m = D.circulo.materiais[+el.getAttribute('data-v')]; modal(m.titulo, '<p style="color:var(--texto)">' + esc(m.texto) + '</p>'); },
    propor: function () {
      modal('Propor um encontro', '<form class="form" id="f-propor" novalidate><div class="campo"><label for="c-pdata">Data sugerida</label><input class="entrada" id="c-pdata" type="date" min="2026-11-18" aria-describedby="e-pdata"><span class="erro-msg" id="e-pdata" role="alert"></span></div>' +
        '<div class="campo"><label for="c-ptema">Tema ou atividade</label><input class="entrada" id="c-ptema" maxlength="80" placeholder="Ex.: piquenique e conversa sobre amizade" aria-describedby="e-ptema"><span class="erro-msg" id="e-ptema" role="alert"></span></div>' +
        '<p>A proposta vai para o líder e o auxiliar, que combinam local e horário com segurança.</p><button class="btn btn-pri btn-cheio" type="submit">Enviar proposta</button></form>', function (d) {
        d.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault(); var dt = d.querySelector('#c-pdata'), tm = d.querySelector('#c-ptema');
          var ok = erroCampo(dt, dt.value ? '' : 'Escolha uma data.'); ok = erroCampo(tm, tm.value.trim().length < 3 ? 'Descreva o tema em poucas palavras.' : '') && ok;
          if (!ok) return;
          E.propostas.push({ data: dt.value.split('-').reverse().join('/'), tema: tm.value.trim() }); salva(); fecha(); render(true);
          toast('Proposta enviada ao líder', 'Demonstração: guardada só neste aparelho.');
        });
      });
    },
    troca: function () {
      modal('Pedir troca de círculo', '<p>Tudo bem querer outro grupo. A liderança conversa com você com carinho, sem constrangimento.</p><div class="campo"><label for="c-troca">Quer contar o motivo? <span class="peq">(opcional)</span></label><textarea class="entrada" id="c-troca" maxlength="300" style="min-height:90px"></textarea></div>' +
        '<button class="btn btn-pri btn-cheio" type="button" id="b-troca">' + (E.trocaPedida ? 'Cancelar pedido de troca' : 'Enviar pedido') + '</button>', function (d) {
        d.querySelector('#b-troca').addEventListener('click', function () { E.trocaPedida = !E.trocaPedida; salva(); fecha(); render(true); toast(E.trocaPedida ? 'Pedido de troca enviado' : 'Pedido cancelado', 'Demonstração: nada foi enviado.'); });
      });
    },
    bloqueado: function () { toast('Liberado após a aprovação', 'Cadastro de 15–17 anos aguardando autorização e liderança.'); },
    etapa: function (el) { var c = document.getElementById(el.getAttribute('aria-controls')), ab = el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', ab); c.hidden = !ab; },
    pausar: function () { E.jornada.pausada = !E.jornada.pausada; salva(); render(true); },
    'aceitar-missao': function () { E.missao.aceita = !E.missao.aceita; salva(); render(true); toast(E.missao.aceita ? 'Missão aceita' : 'Aceite desfeito', 'Sem placar, sem cobrança.'); },
    reflexao: function () {
      modal('Minha reflexão', aviso('Privada: fica só neste aparelho.', 'aviso-azul', 'lock') + '<div class="campo"><label for="c-refl">Como foi viver esta missão?</label><textarea class="entrada" id="c-refl" maxlength="1000">' + esc(E.missao.reflexao) + '</textarea></div><button class="btn btn-pri btn-cheio" type="button" id="b-refl">Guardar</button>', function (d) {
        d.querySelector('#b-refl').addEventListener('click', function () { E.missao.reflexao = d.querySelector('#c-refl').value.trim(); salva(); fecha(); render(true); toast('Reflexão guardada', 'Só neste aparelho.'); });
      });
    },
    filtro: function (el) { aba.evFiltro = el.getAttribute('data-v'); render(true); },
    inscrever: function (el) {
      var ev = D.eventos.filter(function (e) { return e.id === el.getAttribute('data-v'); })[0], menor = E.perfil.faixa === '15-17' && ev.autorizacao;
      modal('Inscrição · ' + ev.titulo, '<div class="info-linhas"><div class="info-linha">' + ic('calendar') + '<div><b>' + esc(ev.data + ' · ' + ev.hora) + '</b><span>' + esc(ev.local) + '</span></div></div></div>' +
        (menor ? aviso('Como você tem 15–17 anos, sua inscrição fica <b>aguardando autorização do responsável</b>.', '', 'shield') + '<div class="campo"><label for="c-iresp">Nome do responsável</label><input class="entrada" id="c-iresp" maxlength="60" value="' + esc(E.menor.responsavel) + '" aria-describedby="e-iresp"><span class="erro-msg" id="e-iresp" role="alert"></span></div>' : '') +
        '<label class="opcao"><input type="checkbox" id="c-orient" aria-describedby="e-orient"><div><b>Li as orientações do evento</b><span>' + esc(ev.orient) + '</span><span class="erro-msg" id="e-orient" role="alert"></span></div></label>' +
        '<button class="btn btn-pri btn-cheio" type="button" id="b-insc">Confirmar inscrição</button>' + fase2('Demonstração: a inscrição fica só neste aparelho.'), function (d) {
        d.querySelector('#b-insc').addEventListener('click', function () {
          var o = d.querySelector('#c-orient'), r = d.querySelector('#c-iresp'), ok = erroCampo(o, o.checked ? '' : 'Confirme que leu as orientações.');
          if (r) ok = erroCampo(r, r.value.trim().length < 3 ? 'Informe o nome do responsável.' : '') && ok;
          if (!ok) return;
          var b = this; carregando(b, 600, function () { E.inscricoes[ev.id] = menor ? 'aguardando' : 'confirmada'; if (r) E.menor.responsavel = r.value.trim(); salva(); fecha(); render(true); toast(menor ? 'Inscrição aguardando autorização' : 'Inscrição confirmada', 'Demonstração.'); });
        });
      });
    },
    'cancelar-insc': function (el) { delete E.inscricoes[el.getAttribute('data-v')]; salva(); render(true); toast('Inscrição cancelada', 'Demonstração.'); },
    agenda: function (el) {
      var ev = D.eventos.filter(function (e) { return e.id === el.getAttribute('data-v'); })[0];
      var m = ev.data.match(/(\d{1,2})\/(\d{2})/), h = (ev.hora.match(/(\d{1,2})h(\d{2})?/) || [0, 19, '00']);
      var dia = (m ? ('0' + m[1]).slice(-2) : '01'), mes = m ? m[2] : '12', hh = ('0' + h[1]).slice(-2), mm = h[2] || '00';
      var ini = '2026' + mes + dia + 'T' + hh + mm + '00', fim = '2026' + mes + dia + 'T' + ('0' + (+hh + 2)).slice(-2) + mm + '00';
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Conexao Jovem//Demo//PT', 'BEGIN:VEVENT', 'UID:' + ev.id + '@conexao-jovem-demo', 'DTSTAMP:20261117T120000', 'DTSTART:' + ini, 'DTEND:' + fim, 'SUMMARY:' + ev.titulo + ' (demonstração)', 'LOCATION:' + ev.local.replace(/[,;]/g, ' '), 'DESCRIPTION:' + ev.descricao.replace(/[,;]/g, ' '), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      baixa(ev.id + '.ics', 'text/calendar', ics); toast('Arquivo de agenda baixado', 'Abra o arquivo .ics para adicionar ao seu calendário.');
    },
    dev: function (el) { aba.dev = +el.getAttribute('data-v'); render(true); },
    'salvar-diario': function (el) {
      var t = document.getElementById('c-diario');
      if (!erroCampo(t, t.value.trim().length < 2 ? 'Escreva algo antes de guardar.' : '')) { t.focus(); return; }
      var dv = D.devocionais.filter(function (d) { return d.id === el.getAttribute('data-v'); })[0], lista = diario();
      lista.push({ id: Date.now().toString(36), quando: new Date().toLocaleDateString('pt-BR'), titulo: dv.titulo, texto: t.value.trim() });
      if (!grava(CHAVE_DIARIO, lista)) { toast('Não foi possível guardar', 'O navegador bloqueou o armazenamento.'); return; }
      render(true); toast('Guardado no seu aparelho', 'Ninguém mais vê o seu diário.');
      var d = document.getElementById('diario'); if (d) d.scrollIntoView({ block: 'start' });
    },
    'apagar-diario': function (el) { var id = el.getAttribute('data-v'); grava(CHAVE_DIARIO, diario().filter(function (x) { return x.id !== id; })); render(true); toast('Anotação apagada'); },
    publicar: function (el) {
      var t = document.getElementById('c-post');
      if (!erroCampo(t, t.value.trim().length < 3 ? 'Escreva sua mensagem antes de enviar.' : '')) { t.focus(); return; }
      E.envios.push({ aba: el.getAttribute('data-v'), texto: t.value.trim() }); salva(); render(true);
      toast('Enviado para moderação', 'Aparece para os outros depois de aprovado (demonstração).');
    },
    apoiar: function (el) { var id = el.getAttribute('data-v'); if (E.apoios[id]) delete E.apoios[id]; else E.apoios[id] = 1; salva(); render(true); },
    comentarios: function (el) {
      var id = el.getAttribute('data-v'), base = D.comentarios[id] || [], meus = E.comentarios[id] || [];
      modal('Comentários', (base.length || meus.length ? '<ul class="lista">' + base.map(function (c) { return '<li style="align-items:flex-start">' + av(c.autor, '#56627A', 'av-sm') + '<span class="li-t"><b>' + esc(c.autor) + '</b><span style="color:var(--texto)">' + esc(c.texto) + '</span></span></li>'; }).join('') +
        meus.map(function (c) { return '<li style="align-items:flex-start">' + av(E.perfil.nome, '#2462D2', 'av-sm') + '<span class="li-t"><b>Você <span class="selo selo-alerta" style="margin-left:4px">Em moderação</span></b><span style="color:var(--texto)">' + esc(c) + '</span></span></li>'; }).join('') + '</ul>' : '<p>Nenhum comentário ainda.</p>') +
        '<div class="campo"><label for="c-com">Seu comentário</label><textarea class="entrada" id="c-com" maxlength="300" style="min-height:80px" aria-describedby="d-com e-com"></textarea><span class="dica" id="d-com">Comentários são moderados antes de aparecer.</span><span class="erro-msg" id="e-com" role="alert"></span></div><button class="btn btn-pri btn-cheio" type="button" id="b-com">Enviar comentário</button>', function (d) {
        d.querySelector('#b-com').addEventListener('click', function () {
          var t = d.querySelector('#c-com'); if (!erroCampo(t, t.value.trim().length < 2 ? 'Escreva um comentário.' : '')) return;
          (E.comentarios[id] = E.comentarios[id] || []).push(t.value.trim()); salva(); fecha(); render(true); toast('Comentário enviado para moderação', 'Demonstração.');
        });
      });
    },
    denunciar: function (el) {
      var p = acharPost(el.getAttribute('data-v'));
      modal('Denunciar publicação', '<p>Sua denúncia vai para a equipe de proteção, de forma sigilosa. Quem publicou não fica sabendo quem denunciou.</p><fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Motivo</legend><div class="opcoes">' +
        ['Conteúdo ofensivo ou desrespeitoso', 'Assédio ou intimidação', 'Exposição de dados pessoais ou fotos', 'Me preocupo com a segurança de alguém', 'Outro motivo'].map(function (m, k) { return '<label class="opcao"><input type="radio" name="mot" value="' + k + '"><div><b>' + m + '</b></div></label>'; }).join('') + '</div><span class="erro-msg" id="e-mot" role="alert"></span></fieldset>' +
        '<label class="marcar"><input type="checkbox" id="c-silenciar"><span>Silenciar ' + esc(p.autor) + ' para mim</span></label>' +
        aviso('Se alguém está em perigo agora, ligue 190. Para violência contra crianças e adolescentes, Disque 100.', 'aviso-erro', 'alert') +
        '<button class="btn btn-pri btn-cheio" type="button" id="b-den">Enviar denúncia</button>', function (d) {
        d.querySelector('#b-den').addEventListener('click', function () {
          var m = d.querySelector('input[name=mot]:checked'), box = d.querySelector('#e-mot');
          if (!m) { box.innerHTML = ic('alert') + 'Escolha um motivo.'; return; }
          E.denuncias++; if (d.querySelector('#c-silenciar').checked && E.silenciados.indexOf(p.autor) < 0) E.silenciados.push(p.autor);
          salva(); fecha(); render(true); toast('Denúncia enviada à equipe de proteção', 'Demonstração: nada foi enviado de verdade.');
        });
      });
    },
    dessilenciar: function () { E.silenciados = []; salva(); render(true); },
    talento: function (el) { var id = el.getAttribute('data-v'), s = E.talentos.sel, i = s.indexOf(id); if (i < 0) s.push(id); else s.splice(i, 1); el.setAttribute('aria-pressed', i < 0); salva(); },
    'enviar-talentos': function (el) {
      var t = E.talentos; t.disp = [].map.call(document.querySelectorAll('[data-disp]:checked'), function (c) { return c.getAttribute('data-disp'); }); t.obs = document.getElementById('c-obs').value.trim();
      var box = document.getElementById('e-talento');
      if (!t.sel.length) { box.innerHTML = ic('alert') + 'Escolha pelo menos uma área.'; box.scrollIntoView({ block: 'center' }); salva(); return; }
      carregando(el, 600, function () { t.enviado = true; salva(); render(); toast('Interesse enviado', 'Demonstração: guardado só neste aparelho.'); });
    },
    'editar-talentos': function () { E.talentos.enviado = false; salva(); render(true); },
    'enviar-oracao': function (el) {
      var t = document.getElementById('c-oracao');
      if (!erroCampo(t, t.value.trim().length < 5 ? 'Escreva seu pedido (pelo menos algumas palavras).' : '')) { t.focus(); return; }
      var vis = document.querySelector('input[name=vis]:checked').value;
      carregando(el, 600, function () { E.oracoes.push({ texto: t.value.trim(), vis: vis, quando: new Date().toLocaleDateString('pt-BR') }); salva(); render(true); toast(vis === 'eu' ? 'Guardado só para você' : 'Pedido enviado à equipe de oração', 'Demonstração: nada saiu do seu aparelho.'); });
    },
    'enviar-conversa': function (el) {
      var cat = document.querySelector('input[name=cat]:checked').value;
      carregando(el, 600, function () { E.conversas.push({ cat: cat, quando: new Date().toLocaleDateString('pt-BR') }); salva(); render(true); toast('Pedido de conversa enviado', 'Retorno em até 72 h úteis (meta). Demonstração.'); });
    },
    'editar-perfil': function () {
      modal('Editar perfil', '<form class="form" id="f-perfil" novalidate><div class="campo"><label for="c-pnome">Nome de exibição</label><input class="entrada" id="c-pnome" maxlength="40" value="' + esc(E.perfil.nome) + '" aria-describedby="e-pnome"><span class="erro-msg" id="e-pnome" role="alert"></span></div>' +
        '<div class="campo"><label for="c-psobre">Sobre mim</label><textarea class="entrada" id="c-psobre" maxlength="240">' + esc(E.perfil.sobre) + '</textarea></div><button class="btn btn-pri btn-cheio" type="submit">Salvar</button></form>', function (d) {
        d.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault(); var n = d.querySelector('#c-pnome');
          if (!erroCampo(n, n.value.trim().length < 2 ? 'O nome precisa de pelo menos 2 letras.' : '')) return;
          E.perfil.nome = n.value.trim(); E.perfil.sobre = d.querySelector('#c-psobre').value.trim(); salva(); fecha(); render(true); toast('Perfil atualizado', 'Só neste aparelho.');
        });
      });
    },
    interesse: function (el) { var v = el.getAttribute('data-v'), s = E.perfil.interesses, i = s.indexOf(v); if (i < 0) s.push(v); else s.splice(i, 1); el.setAttribute('aria-pressed', i < 0); salva(); },
    'baixar-dados': function () { baixa('conexao-jovem-meus-dados-demo.json', 'application/json', JSON.stringify({ aviso: 'Dados da demonstração do Conexão Jovem, guardados só neste aparelho.', estado: E, diario: diario() }, null, 2)); toast('Arquivo baixado', 'Contém só o que está neste aparelho.'); },
    'apagar-tudo': function () {
      modal('Apagar dados da demonstração?', '<p>Isso apaga perfil, inscrições, diário e tudo o que você fez neste protótipo, só neste aparelho. Não dá para desfazer.</p><div class="btns-2"><button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="button" id="b-apagar">Apagar</button></div>', function (d) {
        d.querySelector('#b-apagar').addEventListener('click', function () { try { localStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE_DIARIO); } catch (e) {} E = padrao(); fecha(); location.hash = '#/boas-vindas'; toast('Dados apagados'); });
      });
    },
    sair: function () { E.entrou = false; salva(); location.hash = '#/boas-vindas'; toast('Você saiu', 'Seus dados continuam neste aparelho.'); },
    alerta: function (el) { var id = el.getAttribute('data-v'), s = E.alertasOk, i = s.indexOf(id); if (i < 0) s.push(id); else s.splice(i, 1); salva(); render(true); }
  };
  /* ═══ ações do Módulo 1 ═══ */
  A.reverificar = function () { if (!API) return; R.modo = 'verificando'; render(true); API.iniciar().then(aposModo); };
  A['consentir-real'] = function (el) {
    var cb = document.getElementById('c-regras'), e = euAtivo(); if (!e) return;
    if (!erroCampo(cb, cb.checked ? '' : 'Para continuar, é preciso concordar com as regras.')) { cb.focus(); return; }
    var n = e.notificacoes || {}, notif = { palavra: document.getElementById('rc-palavra').checked, circulo: document.getElementById('rc-circulo').checked, missao: !!n.missao, hora: n.hora || '07:00' };
    ocupado(el, true); caixaErro('rc-erro', '');
    var faltam = DOCS.filter(function (d) { return (e.termos || []).indexOf(d) < 0; });
    (faltam.length ? api('aceitar_termos', { documentos: faltam, versao: VERSAO_TERMOS }) : Promise.resolve())
      .then(function () { return api('atualizar_perfil', { notificacoes: notif }); })
      .then(atualizarEu)
      .then(function () { ocupado(el, false); E.entrou = true; E.consentiu = true; salva(); toast('Preferências salvas'); location.hash = '#/inicio'; })
      ['catch'](function (r) { ocupado(el, false); caixaErro('rc-erro', msgErro(r)); });
  };
  A['editar-perfil-real'] = function () {
    var e = euAtivo(); if (!e) return;
    modal('Editar perfil', '<form class="form" id="f-perfil-real" novalidate><div class="campo"><label for="r-pnome">Nome de exibição</label><input class="entrada" id="r-pnome" maxlength="60" value="' + esc(e.nome) + '" aria-describedby="r-e-pnome"><span class="erro-msg" id="r-e-pnome" role="alert"></span></div>' +
      '<div class="campo"><label for="r-psobre">Sobre mim</label><textarea class="entrada" id="r-psobre" maxlength="280">' + esc(e.sobre || '') + '</textarea></div><div id="m-erro" role="alert"></div><button class="btn btn-pri btn-cheio" type="submit">Salvar</button></form>', function (d) {
      d.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault(); var n = d.querySelector('#r-pnome'), bt = this.querySelector('[type=submit]');
        if (!erroCampo(n, n.value.trim().length < 2 ? 'O nome precisa de pelo menos 2 letras.' : '')) return;
        ocupado(bt, true);
        api('atualizar_perfil', { nome: n.value.trim(), sobre: d.querySelector('#r-psobre').value.trim() }).then(atualizarEu)
          .then(function () { fecha(); render(true); toast('Perfil atualizado'); })['catch'](function (r) { ocupado(bt, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  };
  A['interesse-real'] = function (el) {
    var e = euAtivo(); if (!e) return;
    var v = el.getAttribute('data-v'), s = (e.interesses || []).slice(), i = s.indexOf(v);
    if (i < 0) s.push(v); else s.splice(i, 1);
    el.setAttribute('aria-pressed', i < 0); el.disabled = true;
    salvarPerfil({ interesses: s }, function () { el.disabled = false; }, function () { el.disabled = false; el.setAttribute('aria-pressed', i >= 0); });
  };
  A['baixar-dados-real'] = function (el) {
    ocupado(el, true);
    api('exportar').then(function (r) { ocupado(el, false); baixa('conexao-jovem-meus-dados.json', 'application/json', JSON.stringify({ exportado_em: new Date().toISOString(), dados: r.dados, diario_neste_aparelho: diario() }, null, 2)); toast('Arquivo baixado', 'Seus dados do Conexão Jovem e o diário deste aparelho.'); })
      ['catch'](function (r) { ocupado(el, false); toast('Não foi possível baixar', msgErro(r)); });
  };
  A['excluir-conta-real'] = function () {
    modal('Excluir sua conta do Conexão Jovem?', '<p>Apaga seu perfil, círculo, inscrições, pedidos e publicações do Conexão Jovem. Sua conta do Radar Atual continua. Não dá para desfazer.</p>' +
      '<div class="campo"><label for="r-conf">Para confirmar, digite EXCLUIR</label><input class="entrada" id="r-conf" autocomplete="off" autocapitalize="characters" aria-describedby="r-e-conf"><span class="erro-msg" id="r-e-conf" role="alert"></span></div><div id="m-erro" role="alert"></div>' +
      '<div class="btns-2"><button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="button" id="b-excluir">Excluir</button></div>', function (d) {
      d.querySelector('#b-excluir').addEventListener('click', function () {
        var c = d.querySelector('#r-conf'), bt = this;
        if (!erroCampo(c, c.value.trim().toUpperCase() === 'EXCLUIR' ? '' : 'Digite EXCLUIR para confirmar.')) return;
        ocupado(bt, true);
        api('excluir_conta', { confirmo: 'EXCLUIR' }).then(function () { R.eu = null; API.estado.eu = null; fecha(); location.hash = '#/boas-vindas'; toast('Conta do Conexão Jovem excluída'); })
          ['catch'](function (r) { ocupado(bt, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  };
  A['ver-como'] = function (el) { E.demoVerComo = el.getAttribute('data-v'); salva(); PS.dados = null; render(true); };
  A['filtro-pessoas'] = function (el) {
    PS.filtros.status = el.getAttribute('data-v');
    document.querySelectorAll('[data-acao="filtro-pessoas"]').forEach(function (b) { b.setAttribute('aria-pressed', b === el); });
    carregarPessoas();
  };
  A['recarregar-pessoas'] = function () { carregarPessoas(); };
  A['limpar-filtros'] = function () { PS.filtros = { status: 'todos', faixa: '', circulo: '', busca: '' }; render(true); };
  A.pessoa = function (el) { abrirPessoa(el.getAttribute('data-v')); };
  A['aprovar-pessoa'] = function (el) {
    var id = el.getAttribute('data-v');
    ocupado(el, true);
    opPessoa('ativar_perfil', { usuario: id }).then(function () { toast('Acesso liberado', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.'); carregarPessoas(); })
      ['catch'](function (r) { ocupado(el, false); toast('Não foi possível aprovar', msgErro(r)); });
  };
  A['cadastrar-pessoa'] = function () { if (souGestao()) abrirCadastro(); };

  /* ═══════════════════════════════════════════════════════════════════════════
     MÓDULO 2 · Círculos (17/11/2026) — dossiê 6.3
     Telas: Meu Círculo (real), Encontrar um círculo, Conduzir meu círculo (líder/auxiliar)
     e Círculos (painel da gestão). Uma só porta para os dados: cx() usa o banco no modo
     real e um simulador local (dados FICTÍCIOS de dados-demo.js) na demonstração.
     ═══════════════════════════════════════════════════════════════════════════ */
  var CI = { dados: null, erro: '', seq: 0 };
  var SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function quando(iso, curto) {
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    var h = d.getHours(), m = d.getMinutes(), hora = h + 'h' + (m ? ('0' + m).slice(-2) : '');
    if (curto) return SEM[d.getDay()].slice(0, 3).replace(/^./, function (c) { return c.toUpperCase(); }) + ', ' + ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + ' · ' + hora;
    return SEM[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' · ' + hora;
  }
  function souLider() { return real() ? !!(euAtivo() && (euAtivo().papeis || []).some(function (p) { return p === 'circle_leader' || p === 'assistant'; })) : true; }
  function souEquipe() { return real() ? !!(euAtivo() && euAtivo().equipe) : true; }
  var ST_ENC = { proposto: ['selo-alerta', 'Proposta'], confirmado: ['selo-verde', 'Confirmado'], realizado: ['selo-cinza', 'Realizado'], cancelado: ['selo-cinza', 'Cancelado'] };
  var ST_CIRC = { ativo: ['selo-verde', 'Ativo'], pausado: ['selo-alerta', 'Pausado'], encerrado: ['selo-cinza', 'Encerrado'] };
  function selo(par, icone) { return '<span class="selo ' + par[0] + '">' + (icone ? ic(icone) : '') + esc(par[1]) + '</span>'; }
  function caixaCarregando(txt) { return '<div class="cartao carregando-cartao" aria-busy="true"><span class="gira-ic" aria-hidden="true"></span><div><h3>' + esc(txt) + '</h3><p>Só um instante.</p></div></div>'; }
  function caixaFalha(msg, acao) { return aviso('<b>Não foi possível carregar.</b> ' + esc(msg), 'aviso-erro', 'alert') + '<button class="btn btn-sec btn-cheio" type="button" data-acao="' + acao + '" style="margin-top:10px">Tentar de novo</button>'; }
  function dataHoraIso(d, h) { var x = new Date(d + 'T' + (h || '19:00')); return isNaN(x.getTime()) ? '' : x.toISOString(); }
  function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  function cx(acao, d) { return real() ? api(acao, d || {}).then(function (r) { return r.dados; }) : simCirc(acao, d || {}); }

  /* ─── simulador da demonstração (só neste aparelho) ─────────────────────── */
  function demoCirc() {
    var s = E.circDemo;
    if (!s || s.v !== (D.circulosDemo || {}).v) {
      s = JSON.parse(JSON.stringify(D.circulosDemo));
      var dia = function (n, h) { var x = new Date(); x.setDate(x.getDate() + n); x.setHours(h || 12, 0, 0, 0); return x.toISOString(); };
      s.membros.forEach(function (m) { m.pedido_em = dia(m.dias - 1); m.entrou_em = m.situacao === 'ativo' ? dia(m.dias) : null; m.troca = !!m.troca; m.motivo = m.motivo || null; delete m.dias; });
      s.encontros.forEach(function (e) { e.quando = dia(e.dias, e.hora); delete e.dias; delete e.hora; });
      E.circDemo = s; salva();
    }
    return s;
  }
  function simCirc(acao, d) {
    var s = demoCirc(), EU = 'p-voce';
    function P(id) { return s.pessoas.filter(function (p) { return p.id === id; })[0] || (id === EU ? { id: EU, nome: (E.perfil.nome || 'Você') + ' (você)', faixa: E.perfil.faixa, papeis: [], autorizacao: !menorPendente() } : null); }
    function C(id) { return s.circulos.filter(function (c) { return c.id === id; })[0]; }
    function curto(id) { var p = P(id); if (!p) return null; var n = p.nome.replace(/\s*\(.*\)$/, '').trim().split(/\s+/); return n[0] + (n[1] ? ' ' + n[1][0] + '.' : ''); }
    function ativos(c) { return s.membros.filter(function (m) { return m.circulo === c && m.situacao === 'ativo'; }).length; }
    function M(c, u) { return s.membros.filter(function (m) { return m.circulo === c && m.usuario === u; })[0]; }
    function ativoDe(u) { return s.membros.filter(function (m) { return m.usuario === u && m.situacao === 'ativo'; })[0]; }
    function ok(v) { salva(); return v; }
    return new Promise(function (r) { setTimeout(r, 260); }).then(function () {
      var gestao = d._visao !== 'lider';
      switch (acao) {
        case 'circulos_disponiveis': {
          var eu = P(EU);
          return s.circulos.filter(function (c) { return c.status === 'ativo' && c.faixa === eu.faixa; }).map(function (c) {
            var m = M(c.id, EU);
            return { id: c.id, nome: c.nome, descricao: c.descricao, faixa: c.faixa, limite: c.limite, vagas: Math.max(c.limite - ativos(c.id), 0),
              lider: c.lider_id ? curto(c.lider_id) : null, auxiliar: c.auxiliar_id ? curto(c.auxiliar_id) : null, meu_pedido: m ? m.situacao : null, sou_integrante: !!(m && m.situacao === 'ativo') };
          });
        }
        case 'pedir_circulo': {
          var c = C(d.circulo), me = P(EU);
          if (me.faixa === '15-17' && !me.autorizacao) return recusa('Para entrar num círculo, seu cadastro precisa estar aprovado (e, para 15–17 anos, com a autorização do responsável)');
          if (!c || c.status !== 'ativo') return recusa('Este círculo não está recebendo pedidos agora', 'nao_encontrado');
          if (c.faixa !== me.faixa) return recusa('Círculos são separados por faixa etária', 'dados_invalidos');
          if (s.membros.some(function (m) { return m.usuario === EU && m.situacao === 'solicitado'; })) return recusa('Você já tem um pedido aguardando resposta. Cancele-o para pedir outro círculo', 'dados_invalidos');
          if (ativos(c.id) >= c.limite) return recusa('Este círculo está cheio no momento. Escolha outro ou fale com a coordenação', 'dados_invalidos');
          var x = M(c.id, EU); if (x) { x.situacao = 'solicitado'; x.pedido_em = new Date().toISOString(); } else s.membros.push({ circulo: c.id, usuario: EU, situacao: 'solicitado', pedido_em: new Date().toISOString(), entrou_em: null, troca: false, motivo: null });
          return ok({ circulo: c.id, membership_status: 'solicitado' });
        }
        case 'cancelar_pedido_circulo': s.membros = s.membros.filter(function (m) { return !(m.circulo === d.circulo && m.usuario === EU && m.situacao === 'solicitado'); }); return ok({ ok: true });
        case 'lider_circulos':
          return s.circulos.filter(function (c) { return c.status === 'ativo' && (c.lider_id === s.lider || c.auxiliar_id === s.lider); }).map(function (c) {
            return { id: c.id, nome: c.nome, faixa: c.faixa, limite: c.limite, meu_papel: c.lider_id === s.lider ? 'lider' : 'auxiliar', ativos: ativos(c.id),
              pedidos: s.membros.filter(function (m) { return m.circulo === c.id && m.situacao === 'solicitado'; }).length, proximo: null };
          });
        case 'gerir_circulo': {
          var ci = C(d.circulo); if (!ci) return recusa(MSG.nao_encontrado, 'nao_encontrado');
          if (!gestao && ci.lider_id !== s.lider && ci.auxiliar_id !== s.lider) return recusa(MSG.sem_permissao);
          return {
            circulo: { id: ci.id, nome: ci.nome, descricao: ci.descricao, faixa: ci.faixa, limite: ci.limite, status: ci.status, lider_id: ci.lider_id, auxiliar_id: ci.auxiliar_id,
              lider: ci.lider_id ? curto(ci.lider_id) : null, auxiliar: ci.auxiliar_id ? curto(ci.auxiliar_id) : null, conduzo: ci.lider_id === s.lider || ci.auxiliar_id === s.lider },
            integrantes: s.membros.filter(function (m) { return m.circulo === ci.id && (m.situacao === 'ativo' || m.situacao === 'solicitado'); }).map(function (m) {
              var p = P(m.usuario) || { nome: '?', faixa: ci.faixa };
              return { id: m.usuario, nome: gestao ? p.nome : curto(m.usuario), situacao: m.situacao, faixa: p.faixa, menor: p.faixa === '15-17', autorizacao_ok: p.faixa !== '15-17' || !!p.autorizacao,
                pedido_em: m.pedido_em, entrou_em: m.entrou_em, quer_trocar: gestao ? m.troca : null, motivo_troca: gestao ? m.motivo : null, papel: null };
            }).sort(function (a, b) { return (a.situacao === 'solicitado' ? 0 : 1) - (b.situacao === 'solicitado' ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'); }),
            encontros: s.encontros.filter(function (e) { return e.circulo === ci.id; }).sort(function (a, b) { var pa = new Date(a.quando) < new Date(), pb = new Date(b.quando) < new Date(); return (pa - pb) || (new Date(a.quando) - new Date(b.quando)); }).map(function (e) {
              return { id: e.id, starts_at: e.quando, theme: e.tema, place_note: e.local, status: e.status, proposto_por: curto(e.por), presencas: e.presencas.map(function (x) { return { nome: curto(x.usuario), resposta: x.resposta }; }) };
            })
          };
        }
        case 'decidir_membro': {
          var cc = C(d.circulo), mm = M(d.circulo, d.usuario);
          if (!mm) return recusa('pedido não encontrado', 'nao_encontrado');
          if ((d.status === 'ativo' || d.status === 'recusado') && mm.situacao !== 'solicitado') return recusa('Este pedido já foi respondido', 'dados_invalidos');
          if (d.status === 'removido' && mm.situacao !== 'ativo') return recusa('Esta pessoa não é integrante ativa do círculo', 'dados_invalidos');
          if (d.status === 'ativo') {
            if (ativos(cc.id) >= cc.limite) return recusa('círculo cheio', 'dados_invalidos');
            var pp = P(d.usuario); if (pp && pp.faixa === '15-17' && !pp.autorizacao) return recusa('Menor de idade só entra em círculo com a autorização do responsável aprovada', 'dados_invalidos');
            var outro = ativoDe(d.usuario);
            if (outro) { if (!outro.troca) return recusa('Esta pessoa já participa de outro círculo', 'dados_invalidos'); outro.situacao = 'saiu'; outro.troca = false; outro.motivo = null; }
            mm.entrou_em = new Date().toISOString();
          }
          mm.situacao = d.status; mm.troca = false; mm.motivo = null;
          return ok({ ok: true });
        }
        case 'propor_encontro': {
          var e = { id: 'e' + Date.now().toString(36), circulo: d.circulo, quando: d.quando, tema: d.tema || null, local: d.local || null, status: d.confirmar ? 'confirmado' : 'proposto', por: s.lider, presencas: [] };
          if (new Date(e.quando) < new Date()) return recusa('Escolha uma data futura', 'dados_invalidos');
          s.encontros.push(e); return ok({ id: e.id, status: e.status });
        }
        case 'atualizar_encontro': {
          var en = s.encontros.filter(function (x) { return x.id === d.encontro; })[0];
          if (!en) return recusa('encontro não encontrado', 'nao_encontrado');
          if ((en.status === 'cancelado' || en.status === 'realizado') && d.status && d.status !== en.status) return recusa('Este encontro já foi encerrado', 'dados_invalidos');
          if (d.status === 'confirmado' && new Date(d.quando || en.quando) < new Date()) return recusa('Escolha uma data futura para confirmar o encontro', 'dados_invalidos');
          if (d.status === 'realizado' && new Date(en.quando) > new Date()) return recusa('Só dá para marcar como realizado depois do horário do encontro', 'dados_invalidos');
          if (d.status) en.status = d.status; if (d.quando) en.quando = d.quando; if (d.tema) en.tema = d.tema; if (d.local) en.local = d.local;
          return ok({ ok: true });
        }
        case 'circulos_gestao':
          return {
            gestao: true,
            circulos: s.circulos.filter(function (c) { return c.status !== 'encerrado'; }).map(function (c) {
              var prox = s.encontros.filter(function (e) { return e.circulo === c.id && e.status === 'confirmado' && new Date(e.quando) > new Date(); }).sort(function (a, b) { return new Date(a.quando) - new Date(b.quando); })[0];
              return { id: c.id, nome: c.nome, descricao: c.descricao, faixa: c.faixa, limite: c.limite, status: c.status, lider_id: c.lider_id, auxiliar_id: c.auxiliar_id,
                lider: c.lider_id ? P(c.lider_id).nome : null, auxiliar: c.auxiliar_id ? P(c.auxiliar_id).nome : null, ativos: ativos(c.id),
                pedidos: s.membros.filter(function (m) { return m.circulo === c.id && m.situacao === 'solicitado'; }).length,
                trocas: s.membros.filter(function (m) { return m.circulo === c.id && m.situacao === 'ativo' && m.troca; }).length, proximo: prox ? prox.quando : null };
            }).sort(function (a, b) { return (a.status === 'ativo' ? 0 : 1) - (b.status === 'ativo' ? 0 : 1) || a.faixa.localeCompare(b.faixa) || a.nome.localeCompare(b.nome, 'pt-BR'); }),
            candidatos: s.pessoas.filter(function (p) { return p.faixa !== '15-17' && p.papeis.some(function (r) { return r === 'circle_leader' || r === 'assistant'; }); }).map(function (p) { return { id: p.id, nome: p.nome, faixa: p.faixa, papeis: p.papeis.slice() }; }),
            trocas: s.membros.filter(function (m) { return m.situacao === 'ativo' && m.troca; }).map(function (m) { var p = P(m.usuario), c = C(m.circulo); return { id: m.usuario, nome: p.nome, faixa: p.faixa, circulo_id: c.id, circulo: c.nome, motivo: m.motivo }; })
          };
        case 'salvar_circulo': {
          var lid = d.lider ? P(d.lider) : null, aux = d.auxiliar ? P(d.auxiliar) : null;
          if (!d.nome || d.nome.trim().length < 2) return recusa('O nome do círculo precisa ter entre 2 e 60 caracteres', 'dados_invalidos');
          if (!(d.limite >= 2 && d.limite <= 20)) return recusa('O limite de integrantes precisa ficar entre 2 e 20', 'dados_invalidos');
          if (lid && aux && lid.id === aux.id) return recusa('Líder e auxiliar precisam ser pessoas diferentes', 'dados_invalidos');
          if (lid && (lid.faixa === '15-17' || lid.papeis.indexOf('circle_leader') < 0)) return recusa('Líder precisa ser adulto, estar ativo e ter o papel de líder de círculo', 'dados_invalidos');
          if (aux && (aux.faixa === '15-17' || aux.papeis.indexOf('assistant') < 0)) return recusa('Auxiliar precisa ser adulto, estar ativo e ter o papel de auxiliar', 'dados_invalidos');
          var alvo = d.id ? C(d.id) : null;
          if (alvo) {
            var n = ativos(alvo.id);
            if (alvo.faixa !== d.faixa && s.membros.some(function (m) { return m.circulo === alvo.id && (m.situacao === 'ativo' || m.situacao === 'solicitado'); })) return recusa('Não dá para mudar a faixa de um círculo que tem integrantes ou pedidos', 'dados_invalidos');
            if (d.limite < n) return recusa('O limite não pode ficar abaixo dos ' + n + ' integrantes atuais', 'dados_invalidos');
          } else { alvo = { id: 'c' + Date.now().toString(36), status: 'ativo' }; s.circulos.push(alvo); }
          alvo.nome = d.nome.trim(); alvo.descricao = d.descricao || null; alvo.faixa = d.faixa; alvo.limite = d.limite; alvo.lider_id = d.lider || null; alvo.auxiliar_id = d.auxiliar || null;
          return ok({ id: alvo.id });
        }
        case 'status_circulo': {
          var cs = C(d.circulo); if (!cs) return recusa('círculo não encontrado', 'nao_encontrado');
          if (cs.status === 'encerrado') return recusa('Círculo encerrado não pode ser reaberto: crie um novo', 'dados_invalidos');
          if (d.status === 'encerrado') {
            s.membros.forEach(function (m) { if (m.circulo === cs.id && (m.situacao === 'ativo' || m.situacao === 'solicitado')) { m.situacao = 'removido'; m.troca = false; } });
            s.encontros.forEach(function (e) { if (e.circulo === cs.id && (e.status === 'proposto' || e.status === 'confirmado') && new Date(e.quando) > new Date()) e.status = 'cancelado'; });
          }
          cs.status = d.status; return ok({ ok: true });
        }
        case 'candidatos_circulo':
          return s.pessoas.filter(function (p) { return p.faixa === d.faixa; }).map(function (p) {
            var a = ativoDe(p.id), c = a ? C(a.circulo) : null;
            return { id: p.id, nome: p.nome, circulo_id: c ? c.id : null, circulo_nome: c ? c.nome : null, consentimento: p.faixa !== '15-17' ? 'nao_exigido' : (p.autorizacao ? 'aprovado' : 'pendente') };
          });
        case 'adicionar_ao_circulo': {
          var ca = C(d.circulo), pa = P(d.usuario);
          if (!ca || ca.status !== 'ativo') return recusa('Este círculo não está ativo', 'dados_invalidos');
          if (pa.faixa !== ca.faixa) return recusa('Círculos são separados por faixa etária', 'dados_invalidos');
          if (pa.faixa === '15-17' && !pa.autorizacao) return recusa('Menor de idade só entra em círculo com a autorização do responsável aprovada', 'dados_invalidos');
          var ja = M(ca.id, pa.id); if (ja && ja.situacao === 'ativo') return ok({ ok: true });
          if (ativos(ca.id) >= ca.limite) return recusa('Círculo cheio: aumente o limite ou escolha outro', 'dados_invalidos');
          var de = ativoDe(pa.id);
          if (de) { if (!d.mover) return recusa('Esta pessoa já participa de outro círculo', 'dados_invalidos'); de.situacao = 'saiu'; de.troca = false; de.motivo = null; }
          if (ja) { ja.situacao = 'ativo'; ja.entrou_em = new Date().toISOString(); } else s.membros.push({ circulo: ca.id, usuario: pa.id, situacao: 'ativo', pedido_em: new Date().toISOString(), entrou_em: new Date().toISOString(), troca: false, motivo: null });
          s.membros.forEach(function (m) { if (m.usuario === pa.id && m.situacao === 'solicitado' && m.circulo !== ca.id) m.situacao = 'recusado'; });
          return ok({ ok: true });
        }
      }
      return recusa('Ação não disponível na demonstração', 'dados_invalidos');
    });
  }

  /* ─── 05 · Meu Círculo (real) ─────────────────────────────────────────────── */
  var circuloDemo = T.circulo;
  T.circulo = function () {
    if (verificando()) return telaCarregando('Meu Círculo', '#/comunidade');
    if (!real()) return circuloDemo();
    if (!euAtivo()) return telaSemPerfil('Meu Círculo', '#/comunidade');
    return { cab: 'normal', voltar: '#/comunidade', nav: 'comunidade', titulo: 'Meu Círculo', real: true,
      html: '<div id="circ-box">' + (CI.dados ? '' : '<div class="sec pt">' + caixaCarregando('Carregando seu círculo') + '</div>') + '</div>',
      depois: function () { if (CI.dados) pintarMeuCirculo(); carregarMeuCirculo(); } };
  };
  function carregarMeuCirculo() {
    var s = ++CI.seq; CI.erro = '';
    cx('circulo').then(function (d) { if (s !== CI.seq) return; CI.dados = d; pintarMeuCirculo(); })
      ['catch'](function (r) { if (s !== CI.seq) return; CI.erro = msgErro(r); pintarMeuCirculo(); });
  }
  function avisoSemSocial() {
    var e = euAtivo() || {};
    if (e.status === 'pendente') return aviso('<b>Seu cadastro aguarda o acolhimento.</b> Depois que alguém da liderança falar com você, dá para pedir um círculo.', '', 'hourglass');
    if (e.faixa === '15-17') return aviso('<b>Falta a autorização do responsável.</b> Para quem tem 15–17 anos, o círculo é liberado depois que a equipe confirmar a autorização. <a href="#/consentimento">Ver situação</a>', '', 'shield');
    return aviso('<b>Falta aceitar as regras da comunidade.</b> <a href="#/consentimento">Aceitar agora</a>', '', 'shield');
  }
  function pintarMeuCirculo() {
    var box = document.getElementById('circ-box'); if (!box) return;
    if (CI.erro && !CI.dados) { box.innerHTML = '<div class="sec pt">' + caixaFalha(CI.erro, 'recarregar-circulo') + '</div>'; return; }
    var d = CI.dados; if (!d) return;
    if (!d.circulo) { box.innerHTML = '<div class="sec pt">' + htmlEncontrar(d.disponiveis || [], d.pode_social, null) + '</div>'; return; }
    var c = d.circulo, integ = d.integrantes || [], lid = d.lideres || [];
    var futuros = (d.encontros || []).filter(function (e) { return e.status !== 'cancelado'; });
    var prox = futuros.filter(function (e) { return e.status === 'confirmado'; })[0];
    var outros = (d.encontros || []).filter(function (e) { return e !== prox; });
    var p = prox ? prox.minha_resposta : null;
    var html = '<div class="hero"><div class="hero-arte">' + arte('lar', true) + '</div><div class="hero-txt"><p class="sobre">' + ic('users', 'ic-sm') + 'Meu Círculo</p><h2>' + esc(c.name) + '</h2><p>' + esc(FAIXAS[c.age_band] || c.age_band) + ' · ' + plural(integ.length, 'integrante', 'integrantes') + '</p></div></div>' +
      '<div class="sec pt">' +
      (CI.erro ? aviso(esc(CI.erro), 'aviso-erro', 'alert') : '') +
      (souLider() ? '<a class="cartao cartao-link" href="#/lider-circulo"><span class="ic-caixa ouro">' + ic('shield') + '</span><div><h3>Conduzir meu círculo</h3><p>Pedidos de entrada, encontros e presença.</p></div>' + ic('right', 'ic seta') + '</a>' : '') +
      '<div class="cartao"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="avs">' +
        integ.slice(0, 5).map(function (x) { return av(x.nome, x.eu ? '#2462D2' : '#56627A'); }).join('') + (integ.length > 5 ? '<span class="av av-mais" aria-hidden="true">+' + (integ.length - 5) + '</span>' : '') + '</div>' +
        '<button class="btn btn-txt" type="button" data-acao="integrantes-real">Ver integrantes</button></div>' +
        (lid.length ? '<p class="peq">' + lid.map(function (l) { return esc(l.papel) + ': <b>' + esc(l.nome || '—') + '</b>'; }).join(' · ') + '</p>' : aviso('Este círculo está sem líder no momento. A coordenação já foi avisada.', '', 'info')) +
        '<p class="peq" style="display:flex;gap:6px;align-items:flex-start">' + ic('lock', 'ic-sm') + '<span>Só quem é do círculo vê esta lista. Telefones e endereços não aparecem.</span></p></div>' +
      '<div class="cartao"><h3>Próximo encontro</h3>' + (prox ?
        '<div class="info-linhas"><div class="info-linha">' + ic('calendar') + '<div><b>' + esc(quando(prox.starts_at)) + '</b><span>Confirmado pelo líder</span></div></div>' +
        '<div class="info-linha">' + ic('pin') + '<div><b>' + esc(prox.place_note || 'Local a combinar') + '</b><span>Só integrantes veem o local.</span></div></div></div>' +
        '<div class="btns-2"><button class="btn ' + (p === 'sim' ? 'btn-pri' : 'btn-sec') + '" type="button" aria-pressed="' + (p === 'sim') + '" data-acao="presenca-real" data-id="' + esc(prox.id) + '" data-v="sim">' + (p === 'sim' ? ic('check', 'ic-sm') : '') + 'Vou participar</button>' +
        '<button class="btn ' + (p === 'nao' ? 'btn-pri' : 'btn-sec') + '" type="button" aria-pressed="' + (p === 'nao') + '" data-acao="presenca-real" data-id="' + esc(prox.id) + '" data-v="nao">Não poderei ir</button></div>' +
        (p === 'nao' ? '<p class="peq">Tudo bem! O líder fica sabendo, sem cobrança. Você faz falta e é sempre bem-vindo.</p>' : p === 'sim' ? '<p class="peq">Presença confirmada. Até lá!</p>' : '')
        : '<p>Ainda não há encontro confirmado. Que tal sugerir um?</p><button class="btn btn-sec btn-cheio" type="button" data-acao="propor-real">' + ic('plus', 'ic-sm') + 'Propor um encontro</button>') + '</div>' +
      (prox && prox.theme ? '<div class="cartao"><span class="selo selo-ouro">' + ic('message') + 'Tema da conversa</span><h3>' + esc(prox.theme) + '</h3></div>' : '') +
      (outros.length ? '<div class="cartao"><h3>Outros encontros</h3><ul class="lista">' + outros.map(function (e) {
        return li('calendar', esc(quando(e.starts_at, true)) + ' ' + selo(ST_ENC[e.status] || ['selo-cinza', e.status]), esc(e.theme || 'Sem tema definido') + (e.status === 'proposto' ? ' · aguardando o líder' + (e.minha_proposta ? ' (sua proposta)' : '') : ''));
      }).join('') + '</ul></div>' : '') +
      '<div class="cartao"><h3>Participar do círculo</h3><ul class="lista lista-link">' +
        '<li><button type="button" data-acao="propor-real"><span class="ic-caixa">' + ic('plus') + '</span><span class="li-t"><b>Propor um encontro</b><span>Sugira data e tema ao líder</span></span>' + ic('right', 'ic seta') + '</button></li>' +
        '<li><a href="#/comunidade?aba=circulo"><span class="ic-caixa">' + ic('message') + '</span><span class="li-t"><b>Mural do círculo</b><span>Fechado e moderado</span></span>' + ic('right', 'ic seta') + '</a></li>' +
        '<li><button type="button" data-acao="troca-real"><span class="ic-caixa">' + ic('repeat') + '</span><span class="li-t"><b>' + (c.change_requested ? 'Pedido de troca enviado' : 'Pedir troca de círculo') + '</b><span>' + (c.change_requested ? 'A coordenação vai conversar com você · tocar para desfazer' : 'Sem constrangimento, sem explicação obrigatória') + '</span></span>' + ic('right', 'ic seta') + '</button></li>' +
        (c.change_requested ? '<li><a href="#/encontrar-circulo"><span class="ic-caixa">' + ic('compass') + '</span><span class="li-t"><b>Ver outros círculos</b><span>Você pode pedir entrada num círculo da sua faixa</span></span>' + ic('right', 'ic seta') + '</a></li>' : '') +
        '<li><button type="button" data-acao="sair-circulo"><span class="ic-caixa">' + ic('logout') + '</span><span class="li-t"><b>Sair do círculo</b><span>Você pode voltar a pedir um círculo quando quiser</span></span>' + ic('right', 'ic seta') + '</button></li></ul></div>' +
      (c.description ? '<div class="cartao cartao-azul"><p style="color:#1D3B78">' + esc(c.description) + '</p></div>' : '') +
      '</div>';
    box.innerHTML = html;
  }

  /* ─── Encontrar um círculo (quem ainda não tem, ou pediu troca) ────────────── */
  var EN = { dados: null, meu: null, pode: true, erro: '', seq: 0 };
  T['encontrar-circulo'] = function () {
    if (verificando()) return telaCarregando('Encontrar um círculo', '#/circulo');
    if (real() && !euAtivo()) return telaSemPerfil('Encontrar um círculo', '#/circulo');
    return { cab: 'normal', voltar: '#/circulo', nav: 'comunidade', titulo: 'Encontrar um círculo', real: true,
      html: '<div class="sec pt">' + (!real() ? aviso('<b>Demonstração.</b> É assim que a tela aparece para quem ainda não tem círculo. Círculos fictícios; pedidos ficam só neste aparelho.', '', 'info') : '') +
        '<div id="enc-box">' + caixaCarregando('Procurando círculos da sua faixa') + '</div></div>',
      depois: carregarEncontrar };
  };
  function carregarEncontrar() {
    var s = ++EN.seq; EN.erro = '';
    var pega = real() ? cx('circulo').then(function (d) { EN.meu = d.circulo; EN.pode = d.pode_social; return d.circulo ? cx('circulos_disponiveis') : d.disponiveis; })
      : (EN.meu = null, EN.pode = !menorPendente(), cx('circulos_disponiveis'));
    pega.then(function (l) { if (s !== EN.seq) return; EN.dados = l || []; pintarEncontrar(); })
      ['catch'](function (r) { if (s !== EN.seq) return; EN.erro = msgErro(r); pintarEncontrar(); });
  }
  function pintarEncontrar() {
    var box = document.getElementById('enc-box'); if (!box) return;
    if (EN.erro) { box.innerHTML = caixaFalha(EN.erro, 'recarregar-encontrar'); return; }
    box.innerHTML = htmlEncontrar(EN.dados || [], EN.pode, EN.meu);
  }
  function htmlEncontrar(lista, pode, meu) {
    var pendente = lista.filter(function (c) { return c.meu_pedido === 'solicitado'; })[0];
    var travado = meu && !meu.change_requested;
    var topo = '<div><h2 class="tit" style="font-size:20px">' + (meu ? 'Outros círculos da sua faixa' : 'Encontre o seu círculo') + '</h2><p class="sub" style="margin-top:4px">Grupos pequenos, com líder e auxiliar aprovados, para caminhar junto. Você pede para entrar e o líder confirma.</p></div>';
    if (pode === false) topo += avisoSemSocial();
    if (travado) topo += aviso('Você já participa do <b>' + esc(meu.name) + '</b>. Para pedir outro, primeiro peça a troca em <a href="#/circulo">Meu Círculo</a>.', 'aviso-azul', 'info');
    if (pendente) topo += aviso('<b>Pedido enviado ao ' + esc(pendente.nome) + '.</b> O líder responde em breve. Você pode cancelar se mudar de ideia.', 'aviso-verde', 'checkCircle');
    if (!lista.length) return topo + '<div class="vazio">' + ic('users') + '<b>Nenhum círculo aberto na sua faixa agora</b><p>A coordenação de jovens pode abrir um novo. Peça uma conversa e conte que quer participar.</p><a class="btn btn-sec" href="#/acolhimento?aba=conversa" style="margin-top:14px">Pedir conversa</a></div>';
    return topo + lista.map(function (c) {
      var cheio = c.vagas <= 0, meuPed = c.meu_pedido === 'solicitado';
      var bt;
      if (c.sou_integrante) bt = '<span class="selo selo-verde">' + ic('check') + 'Seu círculo</span>';
      else if (meuPed) bt = '<button class="btn btn-sec btn-cheio" type="button" data-acao="cancelar-pedido-circ" data-v="' + esc(c.id) + '">Cancelar pedido</button>';
      else if (pode === false || travado) bt = '';
      else if (cheio) bt = '<button class="btn btn-sec btn-cheio" type="button" disabled>Círculo cheio</button>';
      else if (c.meu_pedido === 'removido') bt = '<p class="peq">Para voltar a este círculo, fale com a coordenação de jovens.</p>';
      else bt = '<button class="btn btn-pri btn-cheio" type="button" data-acao="pedir-circulo" data-v="' + esc(c.id) + '"' + (pendente ? ' disabled' : '') + '>Pedir para entrar</button>';
      return '<div class="cartao"><div class="selos">' + '<span class="selo selo-azul">' + esc(FAIXAS[c.faixa] || c.faixa) + '</span>' +
        (cheio ? '<span class="selo selo-cinza">Sem vagas</span>' : '<span class="selo selo-verde">' + plural(c.vagas, 'vaga', 'vagas') + '</span>') + (meuPed ? '<span class="selo selo-alerta">' + ic('hourglass') + 'Aguardando o líder</span>' : '') + '</div>' +
        '<h3 style="margin-top:8px">' + esc(c.nome) + '</h3>' + (c.descricao ? '<p>' + esc(c.descricao) + '</p>' : '') +
        '<p class="peq">' + (c.lider ? 'Líder: <b>' + esc(c.lider) + '</b>' : 'Líder a definir') + (c.auxiliar ? ' · Auxiliar: <b>' + esc(c.auxiliar) + '</b>' : '') + '</p>' +
        (bt ? '<div style="margin-top:10px">' + bt + '</div>' : '') + '</div>';
    }).join('') + '<p class="peq" style="text-align:center">Local e horário dos encontros aparecem depois que o líder confirmar a sua entrada.</p>';
  }

  /* ─── Conduzir meu círculo (líder/auxiliar) e detalhe na gestão ──────────── */
  var GC = { id: null, visao: 'lider', dados: null, erro: '', seq: 0, lista: null };
  T['lider-circulo'] = function (param) {
    if (verificando()) return telaCarregando('Conduzir meu círculo', '#/mais');
    if (real() && !euAtivo()) return telaSemPerfil('Conduzir meu círculo', '#/mais');
    if (real() && !souLider()) return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Conduzir meu círculo', real: true, html:
      '<div class="sec pt-l"><div class="vazio">' + ic('lock') + '<b>Área de líderes e auxiliares</b><p>Esta tela é para quem conduz um círculo. Se você quer servir assim, converse com a coordenação de jovens.</p><a class="btn btn-sec" href="#/circulo" style="margin-top:14px">Ir para Meu Círculo</a></div></div>' };
    GC.visao = 'lider';
    return { cab: 'normal', voltar: param ? '#/lider-circulo' : '#/mais', nav: 'mais', titulo: 'Conduzir meu círculo', real: true,
      html: '<div class="sec pt">' + (!real() ? aviso('<b>Demonstração.</b> Você está vendo como o líder Rafael T. (fictício) enxerga o círculo. O que mudar fica só neste aparelho.', '', 'info') : '') + '<div id="gc-box">' + caixaCarregando('Carregando seu círculo') + '</div></div>',
      depois: function () {
        if (param) { abrirGestaoCirculo(param); return; }
        cx('lider_circulos').then(function (l) {
          GC.lista = l || [];
          if (GC.lista.length === 1) return abrirGestaoCirculo(GC.lista[0].id);
          var box = document.getElementById('gc-box'); if (!box) return;
          box.innerHTML = !GC.lista.length ? '<div class="vazio">' + ic('users') + '<b>Nenhum círculo ativo com você</b><p>Quando a coordenação colocar você como líder ou auxiliar de um círculo ativo, ele aparece aqui.</p></div>' :
            '<ul class="pessoas">' + GC.lista.map(function (c) {
              return '<li><a class="pessoa-bt" href="#/lider-circulo/' + esc(c.id) + '" style="text-decoration:none;color:inherit">' + av(c.nome, '#142544', 'av-sm') + '<span class="li-t"><b>' + esc(c.nome) + '</b><span>' + esc((c.meu_papel === 'lider' ? 'Líder' : 'Auxiliar') + ' · ' + c.ativos + '/' + c.limite + ' integrantes') + '</span>' +
                (c.pedidos ? '<span class="selos"><span class="selo selo-alerta">' + plural(c.pedidos, 'pedido', 'pedidos') + '</span></span>' : '') + '</span></a></li>';
            }).join('') + '</ul>';
        })['catch'](function (r) { var box = document.getElementById('gc-box'); if (box) box.innerHTML = caixaFalha(msgErro(r), 'recarregar-gc'); });
      } };
  };
  // A visão vem da ROTA (#/circulos/… = gestão; #/lider-circulo = líder), nunca de uma resposta atrasada.
  function abrirGestaoCirculo(id) {
    var rota = rotaAtual().nome;
    if (rota !== 'circulos' && rota !== 'lider-circulo') return Promise.resolve();
    GC.visao = rota === 'circulos' ? 'gestao' : 'lider';
    var s = ++GC.seq; GC.id = id; GC.erro = '';
    return cx('gerir_circulo', real() ? { circulo: id } : { circulo: id, _visao: GC.visao }).then(function (d) { if (s !== GC.seq) return; GC.dados = d; pintarGestaoCirculo(); })
      ['catch'](function (r) { if (s !== GC.seq) return; GC.dados = null; GC.erro = msgErro(r); pintarGestaoCirculo(); });
  }
  function pintarGestaoCirculo() {
    var box = document.getElementById('gc-box'); if (!box) return;
    if (GC.erro) { box.innerHTML = caixaFalha(GC.erro, 'recarregar-gc'); return; }
    var d = GC.dados; if (!d || !d.circulo) return;
    var c = d.circulo, gest = GC.visao === 'gestao' && souGestao();
    var pedidos = d.integrantes.filter(function (x) { return x.situacao === 'solicitado'; }), ativos = d.integrantes.filter(function (x) { return x.situacao === 'ativo'; });
    var cheio = ativos.length >= c.limite, agora = new Date();
    var futuros = d.encontros.filter(function (e) { return new Date(e.starts_at) >= agora; }), passados = d.encontros.filter(function (e) { return new Date(e.starts_at) < agora; });
    var podeMexer = c.status === 'ativo' && (gest || c.conduzo !== false);
    var html = '<div class="cartao"><div class="selos">' + selo(ST_CIRC[c.status] || ['selo-cinza', c.status]) + '<span class="selo selo-azul">' + esc(FAIXAS[c.faixa] || c.faixa) + '</span>' + (cheio ? '<span class="selo selo-alerta">Cheio</span>' : '') + '</div>' +
      '<h3 style="margin-top:8px;font-size:19px">' + esc(c.nome) + '</h3>' + (c.descricao ? '<p>' + esc(c.descricao) + '</p>' : '') +
      '<div class="info-linhas"><div class="info-linha">' + ic('users') + '<div><b>' + ativos.length + ' de ' + c.limite + ' integrantes</b><span>' + (cheio ? 'Sem vagas: novos pedidos ficam bloqueados.' : plural(c.limite - ativos.length, 'vaga', 'vagas') + ' livres') + '</span></div></div>' +
      '<div class="info-linha">' + ic('shield') + '<div><b>' + esc(c.lider ? 'Líder: ' + c.lider : 'Sem líder') + '</b><span>' + esc(c.auxiliar ? 'Auxiliar: ' + c.auxiliar : 'Sem auxiliar') + '</span></div></div></div>' +
      (gest ? '<div class="btns-2"><button class="btn btn-sec" type="button" data-acao="editar-circulo">' + ic('pencil', 'ic-sm') + 'Editar</button>' +
        (c.status === 'ativo' ? '<button class="btn btn-sec" type="button" data-acao="status-circulo" data-v="pausado">Pausar</button>' : '<button class="btn btn-sec" type="button" data-acao="status-circulo" data-v="ativo">Reativar</button>') + '</div>' +
        (c.status === 'ativo' ? '<button class="btn btn-pri btn-cheio" type="button" data-acao="adicionar-pessoa-circ" style="margin-top:10px">' + ic('plus', 'ic-sm') + 'Adicionar pessoa</button>' : '') : '') + '</div>' +
      (c.status === 'pausado' ? aviso('Círculo pausado: ninguém pede entrada e o líder não consegue gerir até a coordenação reativar.', '', 'info') : '');

    html += '<h2 class="tit-sec">Pedidos de entrada' + (pedidos.length ? ' (' + pedidos.length + ')' : '') + '</h2>';
    html += !pedidos.length ? '<div class="cartao"><p>Nenhum pedido aguardando resposta.</p></div>' :
      (cheio ? aviso('O círculo está cheio: para aceitar alguém, a coordenação precisa aumentar o limite.', '', 'alert') : '') +
      '<ul class="pessoas">' + pedidos.map(function (x) {
        var bloq = x.menor && !x.autorizacao_ok;
        return '<li style="flex-wrap:wrap;padding:10px 12px 12px"><div class="pessoa-bt" style="padding:4px 0;min-height:48px">' + av(x.nome, '#2462D2', 'av-sm') + '<span class="li-t"><b>' + esc(x.nome) + '</b><span>Pediu ' + esc(quando(x.pedido_em, true).split(' · ')[0]) + '</span>' +
          (bloq ? '<span class="selos"><span class="selo selo-ouro">' + ic('shield') + 'Sem autorização do responsável</span></span>' : '') + '</span></div>' +
          (podeMexer ? '<div class="btns-2" style="width:100%"><button class="btn btn-sec" type="button" data-acao="decidir-membro" data-u="' + esc(x.id) + '" data-v="recusado">Recusar</button>' +
            '<button class="btn btn-pri" type="button" data-acao="decidir-membro" data-u="' + esc(x.id) + '" data-v="ativo"' + (cheio || bloq ? ' disabled' : '') + '>' + ic('check', 'ic-sm') + 'Aceitar</button></div>' : '') + '</li>';
      }).join('') + '</ul>' + '<p class="peq">Recusar não envia mensagem: a pessoa vê que o pedido não foi aceito e pode procurar outro círculo.</p>';

    html += '<h2 class="tit-sec">Integrantes (' + ativos.length + ')</h2>';
    html += !ativos.length ? '<div class="vazio">' + ic('users') + '<b>Ainda sem integrantes</b><p>' + (gest ? 'Adicione pessoas ou aguarde os pedidos de entrada.' : 'Os pedidos de entrada aparecem acima.') + '</p></div>' :
      '<ul class="pessoas">' + ativos.map(function (x) {
        return '<li><button type="button" class="pessoa-bt" data-acao="integrante-circ" data-v="' + esc(x.id) + '">' + av(x.nome, '#56627A', 'av-sm') + '<span class="li-t"><b>' + esc(x.nome) + '</b><span>' + (x.entrou_em ? 'Desde ' + esc(quando(x.entrou_em, true).split(' · ')[0]) : 'Integrante') + '</span>' +
          (x.quer_trocar ? '<span class="selos"><span class="selo selo-alerta">' + ic('repeat') + 'Pediu troca</span></span>' : '') + '</span>' + ic('right', 'ic seta') + '</button></li>';
      }).join('') + '</ul>';

    html += '<h2 class="tit-sec">Encontros</h2>' + (podeMexer ? '<button class="btn btn-pri btn-cheio" type="button" data-acao="marcar-encontro">' + ic('calendar', 'ic-sm') + 'Marcar encontro</button>' : '');
    html += !d.encontros.length ? '<div class="vazio">' + ic('calendar') + '<b>Nenhum encontro planejado</b><p>Marque o próximo: data, tema e local (só os integrantes veem o local).</p></div>' :
      futuros.concat(passados).map(function (e) {
        var vai = e.presencas.filter(function (x) { return x.resposta === 'sim'; }), nao = e.presencas.filter(function (x) { return x.resposta === 'nao'; });
        var passado = new Date(e.starts_at) < agora;
        var acoes = '';
        if (podeMexer && e.status === 'proposto' && !passado) acoes = '<div class="btns-2"><button class="btn btn-sec" type="button" data-acao="encontro-status" data-id="' + esc(e.id) + '" data-v="cancelado">Recusar</button><button class="btn btn-pri" type="button" data-acao="encontro-status" data-id="' + esc(e.id) + '" data-v="confirmado">' + ic('check', 'ic-sm') + 'Confirmar</button></div>';
        else if (podeMexer && e.status === 'confirmado' && !passado) acoes = '<button class="btn btn-sec btn-cheio" type="button" data-acao="encontro-status" data-id="' + esc(e.id) + '" data-v="cancelado">Cancelar encontro</button>';
        else if (podeMexer && e.status === 'confirmado' && passado) acoes = '<button class="btn btn-sec btn-cheio" type="button" data-acao="encontro-status" data-id="' + esc(e.id) + '" data-v="realizado">' + ic('checkCircle', 'ic-sm') + 'Marcar como realizado</button>';
        return '<div class="cartao"><div class="selos">' + selo(ST_ENC[e.status] || ['selo-cinza', e.status]) + (e.status === 'proposto' && e.proposto_por ? '<span class="selo selo-azul">Proposto por ' + esc(e.proposto_por) + '</span>' : '') + '</div>' +
          '<div class="info-linhas"><div class="info-linha">' + ic('calendar') + '<div><b>' + esc(quando(e.starts_at)) + '</b><span>' + esc(e.theme || 'Sem tema definido') + '</span></div></div>' +
          '<div class="info-linha">' + ic('pin') + '<div><b>' + esc(e.place_note || 'Local a combinar') + '</b><span>Visível só para integrantes</span></div></div>' +
          '<div class="info-linha">' + ic('checkCircle') + '<div><b>' + plural(vai.length, 'vai', 'vão') + ' · ' + plural(nao.length, 'não vai', 'não vão') + '</b><span>' + (e.presencas.length ? esc(vai.map(function (x) { return x.nome; }).join(', ') || '—') + (nao.length ? ' · não: ' + esc(nao.map(function (x) { return x.nome; }).join(', ')) : '') : 'Ninguém respondeu ainda') + '</span></div></div></div>' + acoes + '</div>';
      }).join('');
    html += '<div id="gc-erro" role="alert"></div>';
    box.innerHTML = html;
  }

  /* ─── Painel · Círculos (gestão) ───────────────────────────────────────────── */
  var CG = { dados: null, erro: '', seq: 0 };
  T.circulos = function (param) {
    var voltar = param ? '#/circulos' : '#/lideranca';
    if (verificando()) return telaCarregando('Círculos', voltar);
    if (real() && !souEquipe()) return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Círculos', real: true, html:
      '<div class="sec pt-l"><div class="vazio">' + ic('lock') + '<b>Área da equipe</b><p>A gestão de círculos é da coordenação de jovens e do pastor.</p><a class="btn btn-sec" href="#/circulo" style="margin-top:14px">Ir para Meu Círculo</a></div></div>' };
    if (param) {
      GC.visao = 'gestao';
      return { cab: 'normal', voltar: voltar, nav: 'mais', titulo: 'Círculo', real: true, html: '<div class="sec pt">' + (!real() ? aviso('<b>Demonstração.</b> Pessoas fictícias; o que você mudar fica só neste aparelho.', '', 'info') : '') + '<div id="gc-box">' + caixaCarregando('Carregando o círculo') + '</div></div>',
        depois: function () { garantirGestao().then(function () { abrirGestaoCirculo(param); }); } };
    }
    var gest = souGestao();
    return { cab: 'normal', voltar: voltar, nav: 'mais', titulo: 'Círculos', real: true,
      direita: gest ? '<button class="cab-bt" type="button" data-acao="novo-circulo" aria-label="Novo círculo">' + ic('plus') + '</button>' : '',
      html: '<div class="sec pt">' + (!real() ? aviso('<b>Demonstração.</b> Círculos e pessoas fictícios; o que você mudar fica só neste aparelho.', '', 'info') : '') +
        (real() && !gest ? aviso('Você pode consultar. Criar, editar e mover pessoas é com a coordenação de jovens e o pastor.', 'aviso-azul', 'info') : '') +
        (gest ? '<button class="btn btn-pri btn-cheio" type="button" data-acao="novo-circulo">' + ic('plus', 'ic-sm') + 'Novo círculo</button>' : '') +
        '<div id="cg-box">' + caixaCarregando('Carregando círculos') + '</div></div>',
      depois: carregarCirculosGestao };
  };
  function garantirGestao() { return CG.dados ? Promise.resolve(CG.dados) : cx('circulos_gestao').then(function (d) { CG.dados = d; return d; })['catch'](function () { return null; }); }
  function carregarCirculosGestao() {
    var s = ++CG.seq; CG.erro = '';
    cx('circulos_gestao').then(function (d) { if (s !== CG.seq) return; CG.dados = d; pintarCirculosGestao(); })
      ['catch'](function (r) { if (s !== CG.seq) return; CG.erro = msgErro(r); pintarCirculosGestao(); });
  }
  function pintarCirculosGestao() {
    var box = document.getElementById('cg-box'); if (!box) return;
    if (CG.erro) { box.innerHTML = caixaFalha(CG.erro, 'recarregar-cg'); return; }
    var d = CG.dados || { circulos: [], trocas: [] }, gest = souGestao();
    var html = '';
    if (d.trocas.length) {
      html += '<h2 class="tit-sec">Pedidos de troca (' + d.trocas.length + ')</h2><ul class="pessoas">' + d.trocas.map(function (t) {
        return '<li style="flex-wrap:wrap;padding:10px 12px 12px"><div class="pessoa-bt" style="padding:4px 0;min-height:48px">' + av(t.nome, '#9A5B00', 'av-sm') + '<span class="li-t"><b>' + esc(t.nome) + '</b><span>' + esc(t.circulo + ' · ' + (FAIXAS[t.faixa] || t.faixa)) + '</span>' +
          (t.motivo ? '<span style="color:var(--texto)">“' + esc(t.motivo) + '”</span>' : '<span>Sem motivo informado</span>') + '</span></div>' +
          (gest ? '<button class="btn btn-sec btn-cheio" type="button" data-acao="mover-troca" data-v="' + esc(t.id) + '">' + ic('repeat', 'ic-sm') + 'Mover para outro círculo</button>' : '') + '</li>';
      }).join('') + '</ul><p class="peq">O líder atual não vê estes pedidos nem os motivos: a conversa é com a coordenação.</p>';
    }
    html += '<h2 class="tit-sec">Círculos (' + d.circulos.length + ')</h2>';
    if (!d.circulos.length) html += '<div class="vazio">' + ic('users') + '<b>Nenhum círculo ainda</b><p>' + (gest ? 'Crie o primeiro: nome, faixa etária, limite e quem conduz.' : 'A coordenação ainda não criou círculos.') + '</p></div>';
    html += d.circulos.map(function (c) {
      var al = [];
      if (c.status === 'pausado') al.push(selo(ST_CIRC.pausado));
      if (!c.lider_id) al.push('<span class="selo selo-alerta">' + ic('alert') + 'Sem líder</span>');
      if (c.faixa === '15-17' && (!c.lider_id || !c.auxiliar_id)) al.push('<span class="selo selo-ouro">' + ic('shield') + 'Menores: falta 2º adulto</span>');
      if (c.status === 'ativo' && !c.proximo) al.push('<span class="selo selo-cinza">Sem encontro marcado</span>');
      if (c.pedidos) al.push('<span class="selo selo-azul">' + plural(c.pedidos, 'pedido', 'pedidos') + '</span>');
      if (c.trocas) al.push('<span class="selo selo-alerta">' + ic('repeat') + plural(c.trocas, 'troca', 'trocas') + '</span>');
      return '<a class="cartao cartao-link" href="#/circulos/' + esc(c.id) + '"><span class="ic-caixa">' + ic('users') + '</span><div style="min-width:0"><h3>' + esc(c.nome) + '</h3>' +
        '<p>' + esc((FAIXAS[c.faixa] || c.faixa) + ' · ' + c.ativos + '/' + c.limite + ' integrantes') + '</p>' +
        '<p class="peq">' + esc(c.lider ? 'Líder: ' + c.lider : 'Líder a definir') + (c.auxiliar ? ' · Auxiliar: ' + esc(c.auxiliar) : '') + (c.proximo ? '<br>Próximo encontro: ' + esc(quando(c.proximo, true)) : '') + '</p>' +
        (al.length ? '<span class="selos" style="margin-top:6px">' + al.join('') + '</span>' : '') + '</div>' + ic('right', 'ic seta') + '</a>';
    }).join('');
    box.innerHTML = html;
  }
  function formCirculo(c) {
    var cand = (CG.dados && CG.dados.candidatos) || [];
    var op = function (papel, atual) {
      return '<option value="">Nenhum por enquanto</option>' + cand.filter(function (p) { return p.papeis.indexOf(papel) >= 0; }).map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === atual ? ' selected' : '') + '>' + esc(p.nome) + '</option>'; }).join('');
    };
    var fx = c ? c.faixa : '';
    modal(c ? 'Editar círculo' : 'Novo círculo', '<form class="form" id="f-circ" novalidate>' +
      '<div class="campo"><label for="fc-nome">Nome</label><input class="entrada" id="fc-nome" maxlength="60" value="' + esc(c ? c.nome : '') + '" placeholder="Ex.: Círculo Esperança" aria-describedby="fc-e-nome"><span class="erro-msg" id="fc-e-nome" role="alert"></span></div>' +
      '<div class="campo"><label for="fc-desc">Descrição <span class="peq">(opcional)</span></label><textarea class="entrada" id="fc-desc" maxlength="600" style="min-height:90px" placeholder="Quando se encontram, o jeito do grupo">' + esc(c && c.descricao ? c.descricao : '') + '</textarea></div>' +
      '<fieldset style="border:0"><legend class="rot" style="margin-bottom:8px">Faixa etária</legend><div class="opcoes opcoes-3">' + ['15-17', '18-21', '22-25'].map(function (v) {
        return '<label class="opcao"><input type="radio" name="fc-faixa" value="' + v + '"' + (fx === v ? ' checked' : '') + '><b>' + v.replace('-', '–') + '</b><span>anos</span></label>'; }).join('') + '</div><span class="erro-msg" id="fc-e-faixa" role="alert"></span></fieldset>' +
      '<div class="campo"><label for="fc-lim">Limite de integrantes</label><input class="entrada" id="fc-lim" type="number" inputmode="numeric" min="2" max="20" value="' + (c ? c.limite : 10) + '" aria-describedby="fc-d-lim fc-e-lim"><span class="dica" id="fc-d-lim">Entre 2 e 20. Sugestão do piloto: 6 a 10.</span><span class="erro-msg" id="fc-e-lim" role="alert"></span></div>' +
      '<div class="campo"><label for="fc-lider">Líder</label><select class="entrada" id="fc-lider">' + op('circle_leader', c && c.lider_id) + '</select></div>' +
      '<div class="campo"><label for="fc-aux">Auxiliar</label><select class="entrada" id="fc-aux">' + op('assistant', c && c.auxiliar_id) + '</select><span class="dica">Aparecem só adultos ativos com o papel de líder de círculo ou auxiliar (dado em Pessoas).</span></div>' +
      aviso('Círculos de 15–17 anos: sempre dois adultos responsáveis (líder e auxiliar).', '', 'shield') +
      '<div id="m-erro" role="alert"></div><button class="btn btn-pri btn-cheio" type="submit">' + (c ? 'Salvar alterações' : 'Criar círculo') + '</button></form>', function (dlg) {
      dlg.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = dlg.querySelector('#fc-nome'), lim = dlg.querySelector('#fc-lim'), f = dlg.querySelector('input[name=fc-faixa]:checked'), n = parseInt(lim.value, 10);
        var ok = erroCampo(nome, nome.value.trim().length < 2 ? 'Dê um nome ao círculo (pelo menos 2 letras).' : '');
        ok = erroCampo(lim, !(n >= 2 && n <= 20) ? 'Use um número entre 2 e 20.' : '') && ok;
        dlg.querySelector('#fc-e-faixa').innerHTML = f ? '' : ic('alert') + 'Escolha a faixa etária.'; ok = !!f && ok;
        if (!ok) return;
        var bt = this.querySelector('[type=submit]'); ocupado(bt, true); caixaErro('m-erro', '');
        cx('salvar_circulo', { id: c ? c.id : null, nome: nome.value.trim(), descricao: dlg.querySelector('#fc-desc').value.trim(), faixa: f.value, limite: n,
          lider: dlg.querySelector('#fc-lider').value || null, auxiliar: dlg.querySelector('#fc-aux').value || null }).then(function (r) {
          fecha(); toast(c ? 'Círculo atualizado' : 'Círculo criado', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.');
          CG.dados = null;
          if (c) abrirGestaoCirculo(c.id); else location.hash = '#/circulos/' + r.id;
        })['catch'](function (r) { ocupado(bt, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  }
  function moverPessoa(pessoaId, faixa, deCirculo, nome) {
    garantirGestao().then(function (d) {
      var alvos = ((d && d.circulos) || []).filter(function (c) { return c.status === 'ativo' && c.faixa === faixa && c.id !== deCirculo; });
      modal('Mover ' + nome, '<p>Escolha o novo círculo. A saída do círculo atual fica registrada, sem constrangimento.</p>' +
        (alvos.length ? '<div class="opcoes">' + alvos.map(function (c) { var cheio = c.ativos >= c.limite;
          return '<label class="opcao"><input type="radio" name="mv-c" value="' + esc(c.id) + '"' + (cheio ? ' disabled' : '') + '><div><b>' + esc(c.nome) + '</b><span>' + (cheio ? 'Sem vagas' : plural(c.limite - c.ativos, 'vaga', 'vagas')) + (c.lider ? ' · ' + esc(c.lider) : '') + '</span></div></label>'; }).join('') + '</div>'
          : aviso('Não há outro círculo ativo nesta faixa. Crie um novo em "Novo círculo".', '', 'info')) +
        '<div id="m-erro" role="alert"></div>' + (alvos.length ? '<button class="btn btn-pri btn-cheio" type="button" id="b-mover">Mover</button>' : ''), function (dlg) {
        var b = dlg.querySelector('#b-mover'); if (!b) return;
        b.addEventListener('click', function () {
          var r = dlg.querySelector('input[name=mv-c]:checked'); if (!r) { caixaErro('m-erro', 'Escolha um círculo.'); return; }
          ocupado(b, true);
          cx('adicionar_ao_circulo', { circulo: r.value, usuario: pessoaId, mover: true }).then(function () {
            fecha(); toast('Pessoa movida', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.'); CG.dados = null;
            if (rotaAtual().nome === 'circulos' && !rotaAtual().param) carregarCirculosGestao(); else if (GC.id) abrirGestaoCirculo(GC.id);
          })['catch'](function (x) { ocupado(b, false); caixaErro('m-erro', msgErro(x)); });
        });
      });
    });
  }

  /* ─── ações do Módulo 2 ─────────────────────────────────────────────────── */
  A['recarregar-circulo'] = function () { CI.dados = null; render(true); };
  A['recarregar-encontrar'] = function () { render(true); };
  A['recarregar-gc'] = function () { render(true); };
  A['recarregar-cg'] = function () { carregarCirculosGestao(); };
  A['integrantes-real'] = function () {
    var d = CI.dados; if (!d || !d.circulo) return;
    modal('Integrantes · ' + d.circulo.name, '<ul class="lista">' + (d.lideres || []).map(function (l) { return '<li>' + av(l.nome || '?', '#142544', 'av-sm') + '<span class="li-t"><b>' + esc(l.nome || '—') + '</b><span>' + esc(l.papel) + ' · aprovado pela liderança</span></span></li>'; }).join('') +
      (d.integrantes || []).map(function (p) { return '<li>' + av(p.nome || '?', p.eu ? '#2462D2' : '#56627A', 'av-sm') + '<span class="li-t"><b>' + esc(p.nome || '—') + (p.eu ? ' (você)' : '') + '</b><span>Integrante</span></span></li>'; }).join('') + '</ul>' +
      aviso('Só nome de exibição: sem telefone, endereço ou idade exata.', '', 'lock'));
  };
  A['presenca-real'] = function (el) {
    var id = el.getAttribute('data-id'), v = el.getAttribute('data-v');
    ocupado(el, true);
    cx('responder_presenca', { encontro: id, resposta: v }).then(function () {
      (CI.dados.encontros || []).forEach(function (e) { if (e.id === id) e.minha_resposta = v; });
      pintarMeuCirculo(); toast(v === 'sim' ? 'Presença confirmada' : 'Avisamos o líder que você não poderá ir', 'O líder vê a sua resposta.');
    })['catch'](function (r) { ocupado(el, false); toast('Não foi possível responder', msgErro(r)); });
  };
  function modalEncontro(titulo, lider, enviar) {
    modal(titulo, '<form class="form" id="f-enc" novalidate>' +
      '<div class="filtros-2"><div class="campo"><label for="fe-data">Data</label><input class="entrada" id="fe-data" type="date" min="' + hojeIso() + '" aria-describedby="fe-e-data"></div>' +
      '<div class="campo"><label for="fe-hora">Horário</label><input class="entrada" id="fe-hora" type="time" value="19:00"></div></div><span class="erro-msg" id="fe-e-data" role="alert"></span>' +
      '<div class="campo"><label for="fe-tema">Tema ou atividade</label><input class="entrada" id="fe-tema" maxlength="200" placeholder="Ex.: piquenique e conversa sobre amizade" aria-describedby="fe-e-tema"><span class="erro-msg" id="fe-e-tema" role="alert"></span></div>' +
      '<div class="campo"><label for="fe-local">Local <span class="peq">(opcional)</span></label><input class="entrada" id="fe-local" maxlength="200" placeholder="' + (lider ? 'Ex.: casa da família Souza' : 'Sugestão de lugar') + '" aria-describedby="fe-d-local"><span class="dica" id="fe-d-local">Só integrantes do círculo veem o local. Não ponha telefone.</span></div>' +
      (lider ? '<label class="marcar"><input type="checkbox" id="fe-conf" checked><span>Já confirmar o encontro (avisar os integrantes)</span></label>' : '<p>A proposta vai para o líder e o auxiliar, que confirmam com segurança.</p>') +
      '<div id="m-erro" role="alert"></div><button class="btn btn-pri btn-cheio" type="submit">' + (lider ? 'Marcar encontro' : 'Enviar proposta') + '</button></form>', function (dlg) {
      dlg.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var dt = dlg.querySelector('#fe-data'), tm = dlg.querySelector('#fe-tema'), iso = dataHoraIso(dt.value, dlg.querySelector('#fe-hora').value);
        var ok = erroCampo(dt, !iso ? 'Escolha a data.' : new Date(iso) < new Date() ? 'Escolha uma data futura.' : '');
        ok = erroCampo(tm, tm.value.trim().length < 3 ? 'Descreva o tema em poucas palavras.' : '') && ok;
        if (!ok) return;
        var bt = this.querySelector('[type=submit]'); ocupado(bt, true); caixaErro('m-erro', '');
        var cf = dlg.querySelector('#fe-conf');
        enviar({ quando: iso, tema: tm.value.trim(), local: dlg.querySelector('#fe-local').value.trim() || null, confirmar: !!(cf && cf.checked) })
          ['catch'](function (r) { ocupado(bt, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  }
  A['propor-real'] = function () {
    var d = CI.dados; if (!d || !d.circulo) return;
    modalEncontro('Propor um encontro', false, function (v) {
      v.circulo = d.circulo.id; v.confirmar = false;
      return cx('propor_encontro', v).then(function () { fecha(); toast('Proposta enviada ao líder', 'Aparece como "aguardando o líder" até ele confirmar.'); carregarMeuCirculo(); });
    });
  };
  A['troca-real'] = function () {
    var d = CI.dados; if (!d || !d.circulo) return;
    var ja = !!d.circulo.change_requested;
    modal('Pedir troca de círculo', ja ? '<p>Seu pedido de troca já está com a coordenação. Se mudou de ideia, pode desfazer.</p><div id="m-erro" role="alert"></div><button class="btn btn-sec btn-cheio" type="button" id="b-troca">Desfazer pedido de troca</button>' :
      '<p>Tudo bem querer outro grupo. A coordenação de jovens conversa com você com carinho. <b>O líder do seu círculo não vê este pedido.</b></p><div class="campo"><label for="c-troca-r">Quer contar o motivo? <span class="peq">(opcional)</span></label><textarea class="entrada" id="c-troca-r" maxlength="300" style="min-height:90px"></textarea></div>' +
      '<div id="m-erro" role="alert"></div><button class="btn btn-pri btn-cheio" type="button" id="b-troca">Enviar pedido</button>', function (dlg) {
      dlg.querySelector('#b-troca').addEventListener('click', function () {
        var b = this, mt = dlg.querySelector('#c-troca-r'); ocupado(b, true);
        cx('pedir_troca', { trocar: !ja, motivo: mt ? mt.value.trim() || null : null }).then(function () {
          fecha(); toast(ja ? 'Pedido de troca desfeito' : 'Pedido de troca enviado', ja ? 'Você continua no seu círculo.' : 'Você também pode pedir entrada em outro círculo da sua faixa.'); carregarMeuCirculo();
        })['catch'](function (r) { ocupado(b, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  };
  A['sair-circulo'] = function () {
    var d = CI.dados; if (!d || !d.circulo) return;
    modal('Sair do ' + d.circulo.name + '?', '<p>Você deixa de ver os integrantes, os encontros e o mural do círculo. Pode pedir outro círculo (ou este de novo) quando quiser.</p>' +
      '<div id="m-erro" role="alert"></div><div class="btns-2"><button class="btn btn-sec" type="button" data-fechar>Ficar</button><button class="btn btn-perigo" type="button" id="b-sair">Sair do círculo</button></div>', function (dlg) {
      dlg.querySelector('#b-sair').addEventListener('click', function () {
        var b = this; ocupado(b, true);
        cx('sair_circulo', { confirmo: 'SAIR' }).then(atualizarEu).then(function () { fecha(); toast('Você saiu do círculo', 'Quando quiser, peça outro em "Encontrar um círculo".'); CI.dados = null; render(true); })
          ['catch'](function (r) { ocupado(b, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  };
  A['pedir-circulo'] = function (el) {
    var id = el.getAttribute('data-v'); ocupado(el, true);
    cx('pedir_circulo', { circulo: id }).then(function () {
      toast('Pedido enviado', 'O líder recebe o seu pedido e confirma a sua entrada.');
      if (rotaAtual().nome === 'circulo') carregarMeuCirculo(); else carregarEncontrar();
    })['catch'](function (r) { ocupado(el, false); toast('Não foi possível pedir', msgErro(r)); });
  };
  A['cancelar-pedido-circ'] = function (el) {
    var id = el.getAttribute('data-v'); ocupado(el, true);
    cx('cancelar_pedido_circulo', { circulo: id }).then(function () {
      toast('Pedido cancelado'); if (rotaAtual().nome === 'circulo') carregarMeuCirculo(); else carregarEncontrar();
    })['catch'](function (r) { ocupado(el, false); toast('Não foi possível cancelar', msgErro(r)); });
  };
  A['decidir-membro'] = function (el) {
    var u = el.getAttribute('data-u'), v = el.getAttribute('data-v'); ocupado(el, true); caixaErro('gc-erro', '');
    cx('decidir_membro', { circulo: GC.id, usuario: u, status: v }).then(function () {
      toast(v === 'ativo' ? 'Entrada aceita' : v === 'recusado' ? 'Pedido recusado' : 'Removido do círculo', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.');
      CG.dados = null; fecha(); abrirGestaoCirculo(GC.id);
    })['catch'](function (r) { ocupado(el, false); toast('Não foi possível concluir', msgErro(r)); caixaErro('gc-erro', msgErro(r)); });
  };
  A['integrante-circ'] = function (el) {
    var x = (GC.dados.integrantes || []).filter(function (p) { return p.id === el.getAttribute('data-v'); })[0]; if (!x) return;
    var gest = GC.visao === 'gestao' && souGestao(), c = GC.dados.circulo, pode = c.status === 'ativo' && (gest || c.conduzo !== false);
    modal(x.nome, '<div class="info-linhas"><div class="info-linha">' + ic('calendar') + '<div><b>' + esc(FAIXAS[x.faixa] || x.faixa) + '</b><span>' + (x.entrou_em ? 'No círculo desde ' + esc(quando(x.entrou_em).split(' · ')[0]) : 'Integrante') + '</span></div></div>' +
      (x.quer_trocar ? '<div class="info-linha">' + ic('repeat') + '<div><b>Pediu troca de círculo</b><span>' + esc(x.motivo_troca || 'Sem motivo informado') + '</span></div></div>' : '') + '</div>' +
      (gest && x.quer_trocar ? '<button class="btn btn-sec btn-cheio" type="button" id="b-mov">' + ic('repeat', 'ic-sm') + 'Mover para outro círculo</button>' : '') +
      (pode ? '<button class="btn btn-perigo btn-cheio" type="button" id="b-rem" style="margin-top:10px">Remover do círculo</button><p class="peq">Remover é para casos combinados com a coordenação. A pessoa não volta a este círculo sozinha.</p>' : '') +
      '<div id="m-erro" role="alert"></div>', function (dlg) {
      var mv = dlg.querySelector('#b-mov'); if (mv) mv.addEventListener('click', function () { moverPessoa(x.id, x.faixa, c.id, x.nome); });
      var rm = dlg.querySelector('#b-rem'); if (rm) rm.addEventListener('click', function () {
        ocupado(rm, true);
        cx('decidir_membro', { circulo: GC.id, usuario: x.id, status: 'removido' }).then(function () { fecha(); toast('Removido do círculo', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração.'); CG.dados = null; abrirGestaoCirculo(GC.id); })
          ['catch'](function (r) { ocupado(rm, false); caixaErro('m-erro', msgErro(r)); });
      });
    });
  };
  A['marcar-encontro'] = function () {
    modalEncontro('Marcar encontro', true, function (v) {
      v.circulo = GC.id;
      return cx('propor_encontro', v).then(function () { fecha(); toast(v.confirmar ? 'Encontro marcado' : 'Encontro proposto', 'Os integrantes veem data, tema e local.'); abrirGestaoCirculo(GC.id); });
    });
  };
  A['encontro-status'] = function (el) {
    var id = el.getAttribute('data-id'), v = el.getAttribute('data-v');
    var fazer = function (b) { ocupado(b, true);
      cx('atualizar_encontro', { encontro: id, status: v }).then(function () { fecha(); toast({ confirmado: 'Encontro confirmado', cancelado: 'Encontro cancelado', realizado: 'Marcado como realizado' }[v] || 'Feito'); abrirGestaoCirculo(GC.id); })
        ['catch'](function (r) { ocupado(b, false); toast('Não foi possível concluir', msgErro(r)); caixaErro('m-erro', msgErro(r)); }); };
    if (v !== 'cancelado') return fazer(el);
    modal('Cancelar este encontro?', '<p>Os integrantes veem que o encontro foi cancelado. Você pode marcar outro depois.</p><div id="m-erro" role="alert"></div><div class="btns-2"><button class="btn btn-sec" type="button" data-fechar>Voltar</button><button class="btn btn-perigo" type="button" id="b-canc">Cancelar encontro</button></div>',
      function (dlg) { dlg.querySelector('#b-canc').addEventListener('click', function () { fazer(this); }); });
  };
  A['novo-circulo'] = function () { if (!souGestao()) return; garantirGestao().then(function () { formCirculo(null); }); };
  A['editar-circulo'] = function () { var c = GC.dados && GC.dados.circulo; if (!c) return; garantirGestao().then(function () { formCirculo(c); }); };
  A['status-circulo'] = function (el) {
    var c = GC.dados && GC.dados.circulo, v = el.getAttribute('data-v'); if (!c) return;
    var fazer = function (b) { ocupado(b, true);
      cx('status_circulo', { circulo: c.id, status: v }).then(function () { fecha(); toast(v === 'ativo' ? 'Círculo reativado' : v === 'pausado' ? 'Círculo pausado' : 'Círculo encerrado', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração.'); CG.dados = null;
        if (v === 'encerrado') location.hash = '#/circulos'; else abrirGestaoCirculo(c.id); })['catch'](function (r) { ocupado(b, false); toast('Não foi possível concluir', msgErro(r)); caixaErro('m-erro', msgErro(r)); }); };
    if (v === 'ativo') return fazer(el);
    modal(v === 'pausado' ? 'Pausar ' + c.nome + '?' : 'Encerrar ' + c.nome + '?', (v === 'pausado' ? '<p>Ninguém pede entrada e o líder não gerencia até você reativar. Integrantes continuam no círculo.</p>' :
      '<p>Os integrantes ficam livres para pedir outro círculo e os próximos encontros são cancelados. <b>Não dá para reabrir.</b></p>') +
      '<div id="m-erro" role="alert"></div><div class="btns-2"><button class="btn btn-sec" type="button" data-fechar>Voltar</button><button class="btn ' + (v === 'pausado' ? 'btn-pri' : 'btn-perigo') + '" type="button" id="b-st">' + (v === 'pausado' ? 'Pausar' : 'Encerrar') + '</button></div>' +
      (v === 'pausado' ? '<button class="btn btn-txt btn-cheio" type="button" data-acao="status-circulo" data-v="encerrado">Prefiro encerrar o círculo</button>' : ''),
      function (dlg) { dlg.querySelector('#b-st').addEventListener('click', function () { fazer(this); }); });
  };
  A['adicionar-pessoa-circ'] = function () {
    var c = GC.dados && GC.dados.circulo; if (!c) return;
    modal('Adicionar ao ' + c.nome, caixaCarregando('Buscando pessoas da faixa ' + (FAIXAS[c.faixa] || c.faixa)), function () {
      cx('candidatos_circulo', { faixa: c.faixa }).then(function (l) {
        var lista = (l || []).filter(function (p) { return p.circulo_id !== c.id; });
        var corpo = !lista.length ? '<div class="vazio">' + ic('users') + '<b>Ninguém disponível nesta faixa</b><p>Só aparecem pessoas com acesso aprovado. Aprove ou cadastre em Pessoas.</p><a class="btn btn-sec" href="#/pessoas" data-fechar style="margin-top:12px">Ir para Pessoas</a></div>' :
          '<p>Pessoas ativas de ' + esc(FAIXAS[c.faixa] || c.faixa) + '. Quem já está noutro círculo é <b>movido</b> (a saída fica registrada).</p><ul class="pessoas">' + lista.map(function (p) {
            var semAut = c.faixa === '15-17' && p.consentimento !== 'aprovado';
            return '<li style="flex-wrap:wrap;padding:8px 12px 10px"><div class="pessoa-bt" style="padding:4px 0;min-height:48px">' + av(p.nome, '#2462D2', 'av-sm') + '<span class="li-t"><b>' + esc(p.nome) + '</b><span>' + esc(p.circulo_nome ? 'Hoje no ' + p.circulo_nome : 'Sem círculo') + '</span>' +
              (semAut ? '<span class="selos"><span class="selo selo-ouro">' + ic('shield') + 'Sem autorização do responsável</span></span>' : '') + '</span></div>' +
              '<button class="btn ' + (p.circulo_id ? 'btn-sec' : 'btn-pri') + ' btn-mini" type="button" data-add="' + esc(p.id) + '" data-mover="' + (p.circulo_id ? '1' : '') + '"' + (semAut ? ' disabled' : '') + '>' + (p.circulo_id ? 'Mover para cá' : 'Adicionar') + '</button></li>';
          }).join('') + '</ul>';
        if (!dlg || !dlg.open) return;
        dlg.querySelector('.modal-corpo').innerHTML = corpo + '<div id="m-erro" role="alert"></div>';
        dlg.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', function () {
          ocupado(b, true); caixaErro('m-erro', '');
          cx('adicionar_ao_circulo', { circulo: c.id, usuario: b.getAttribute('data-add'), mover: b.getAttribute('data-mover') === '1' }).then(function () {
            fecha(); toast('Pessoa adicionada ao círculo', real() ? 'Registrado no histórico (auditoria).' : 'Demonstração: só neste aparelho.'); CG.dados = null; abrirGestaoCirculo(c.id);
          })['catch'](function (r) { ocupado(b, false); caixaErro('m-erro', msgErro(r)); });
        }); });
      })['catch'](function (r) { if (dlg && dlg.open) dlg.querySelector('.modal-corpo').innerHTML = aviso(esc(msgErro(r)), 'aviso-erro', 'alert'); });
    });
  };
  A['mover-troca'] = function (el) {
    var t = ((CG.dados && CG.dados.trocas) || []).filter(function (x) { return x.id === el.getAttribute('data-v'); })[0]; if (!t) return;
    moverPessoa(t.id, t.faixa, t.circulo_id, t.nome);
  };

  function salvarPrefReal(k, on, input) {
    var e = euAtivo(); if (!e) return;
    var n = JSON.parse(JSON.stringify(e.notificacoes || {})), dados;
    if (k === 'r-p-nome') dados = { nome_completo: on };
    else { if (k === 'r-n-palavra') n.palavra = on; else if (k === 'r-n-circulo') n.circulo = on; else if (k === 'r-n-missao') n.missao = on; dados = { notificacoes: n }; }
    input.disabled = true;
    salvarPerfil(dados, function () { input.disabled = false; toast(on ? 'Ativado' : 'Desativado', 'Preferência salva na sua conta.'); if (k === 'r-n-palavra') render(true); },
      function () { input.disabled = false; input.checked = !on; });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    var f = A[el.getAttribute('data-acao')];
    if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-chave');
    if (k && k.indexOf('rc-') === 0) return;   // consentimento real: lido ao salvar
    if (k && k.indexOf('r-') === 0) { salvarPrefReal(k, e.target.checked, e.target); return; }
    if (e.target.id === 'r-hora') { var eu = euAtivo(); if (eu) { var nn = JSON.parse(JSON.stringify(eu.notificacoes || {})); nn.hora = e.target.value; salvarPerfil({ notificacoes: nn }, function () { toast('Horário da Palavra do Dia: ' + e.target.value); }); } return; }
    if (k) {
      var on = e.target.checked, n = E.perfil.notif;
      if (k === 'n-palavra') n.palavra = on; else if (k === 'n-circulo') n.circulo = on; else if (k === 'n-missao') n.missao = on; else if (k === 'p-nome') E.perfil.nomeCompleto = on;
      salva(); if (k === 'n-palavra' && rotaAtual().nome === 'perfil') render(true);
      toast(on ? 'Ativado' : 'Desativado', 'Preferência guardada neste aparelho.');
    }
    if (e.target.id === 'c-hora') { E.perfil.notif.hora = e.target.value; salva(); toast('Horário da Palavra do Dia: ' + e.target.value); }
  });

  /* ═══ roteador ═══ */
  var NAV = [['inicio', 'Início', 'home'], ['comunidade', 'Comunidade', 'users'], ['palavra', 'Palavra', 'book'], ['eventos', 'Eventos', 'calendar'], ['mais', 'Mais', 'grid']];
  var VITRINE = [['boas-vindas', 'Boas-vindas'], ['entrar', 'Entrar / cadastro'], ['consentimento', 'Consentimento e idade'], ['inicio', 'Início'], ['circulo', 'Meu Círculo'], ['jornada', 'Minha Jornada'], ['missao', 'Missão da Semana'], ['eventos', 'Eventos'], ['palavra', 'Palavra / Devocional'], ['comunidade', 'Comunidade'], ['talentos', 'Talentos e Serviço'], ['acolhimento', 'Acolhimento'], ['perfil', 'Perfil e preferências'], ['lideranca', 'Painel de liderança'], ['pessoas', 'Pessoas (liderança)'], ['encontrar-circulo', 'Encontrar um círculo'], ['lider-circulo', 'Conduzir meu círculo (líder)'], ['circulos', 'Círculos (liderança)']];
  function rotaAtual() {
    var h = location.hash.replace(/^#\/?/, ''), q = {}, partes = h.split('?');
    (partes[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
    var seg = partes[0].split('/');
    return { nome: seg[0] || '', param: seg[1], q: q };
  }
  var app, tela, ultimaRota = '';
  function render(manterRolagem) {
    var r = rotaAtual();
    if (!r.nome) { location.replace('#/' + (E.entrou || euAtivo() ? 'inicio' : 'boas-vindas')); return; }
    var fn = T[r.nome] || T.erro, v;
    try { v = fn(r.param, r.q); } catch (err) { console.error(err); v = { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Algo deu errado', html: '<div class="sec pt-l"><div class="vazio">' + ic('alert') + '<b>Não foi possível abrir esta tela</b><p>Tente novamente. Se continuar, volte ao início.</p><a class="btn btn-pri" href="#/inicio" style="margin-top:14px">Voltar ao início</a></div></div>' }; }
    var chaveRota = location.hash.split('?')[0], mudou = chaveRota !== ultimaRota; ultimaRota = chaveRota;
    var y = window.scrollY;
    var cab = '';
    if (v.cab === 'marca') cab = '<header class="cab"><div class="cab-marca"><span class="logo">' + LOGO + '</span><span class="logo-t">CONEXÃO<br><b>JOVEM</b></span></div>' +
      '<button class="cab-bt" type="button" data-acao="avisos" aria-label="Avisos">' + ic('bell') + '</button><a class="avatar-bt" href="#/perfil" aria-label="Meu perfil">' + av(nomeExib(), '#2462D2', 'av-sm') + '</a></header>';
    else if (v.cab === 'normal') cab = '<header class="cab">' + (v.voltar ? '<a class="cab-bt" href="' + v.voltar + '" aria-label="Voltar">' + ic('left') + '</a>' : '') + '<h1>' + esc(v.titulo) + '</h1>' + (v.real && (real() || R.modo === 'sem_cracha' || verificando()) ? '' : '<span class="demo-pill" title="Dados fictícios de demonstração">Demonstração</span>') + (v.direita || '') + '</header>';
    var nav = v.nav === false ? '' : '<nav class="nav-inf" aria-label="Navegação principal">' + NAV.map(function (n) { return '<a href="#/' + n[0] + '"' + (v.nav === n[0] ? ' aria-current="page"' : '') + '><span class="nav-ic">' + ic(n[2]) + '</span>' + n[1] + '</a>'; }).join('') + '</nav>';
    app.innerHTML = cab + '<main id="tela" tabindex="-1" class="' + (v.nav === false ? 'sem-nav' : '') + (mudou ? ' anima' : '') + '">' + v.html + '</main>' + nav;
    tela = document.getElementById('tela');
    document.title = v.titulo + ' · Conexão Jovem';
    document.querySelectorAll('.vitrine a[data-rota]').forEach(function (a) { if (a.getAttribute('data-rota') === r.nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v.depois) v.depois();
    if (mudou || !manterRolagem) { window.scrollTo(0, 0); if (mudou) tela.focus({ preventScroll: true }); } else window.scrollTo(0, y);
  }
  function inicia() {
    app = document.getElementById('app');
    var vit = document.getElementById('vitrine-lista');
    if (vit) vit.innerHTML = VITRINE.map(function (v, k) { return '<li><a href="#/' + v[0] + '" data-rota="' + v[0] + '"><small>' + ('0' + (k + 1)).slice(-2) + '</small>' + v[1] + '</a></li>'; }).join('');
    window.addEventListener('hashchange', function () { fecha(); if (rotaAtual().nome !== 'entrar') aba.etapaCodigo = false; render(); });
    render();
    if (API) API.iniciar().then(aposModo)['catch'](function () { aposModo({ modo: 'demo', motivo: 'erro', eu: null }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
