/* CONEXÃO JOVEM — protótipo navegável (Fase 1 · 17/11/2026)
   SPA simples com rotas por hash (#/inicio, #/circulo...). Sem backend: o que o jovem faz fica só
   no localStorage deste aparelho, sempre com aviso de demonstração. Dados fictícios em dados-demo.js.
   Fase 2: login igual ao do Radar (código pelo WhatsApp), banco com RLS, papéis e auditoria (ver dossiê). */
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
        '<div class="bv-topo"><a class="btn btn-claro" href="/?capa" style="min-height:44px;padding:0 14px 0 10px">' + ic('left', 'ic-sm') + 'Capa</a><span class="demo-pill">Demonstração</span></div>' +
        '<div class="bv-arte">' + bvArte() + '</div>' +
        '<div class="bv-marca"><div class="logo">' + LOGO + '</div><h1>Conexão<b>Jovem</b></h1><p class="ass">Mais que uma igreja. Uma família em Cristo.</p></div>' +
        '<ul class="bv-lista">' +
          '<li><span>' + ic('home') + '</span>Pertencimento</li><li><span>' + ic('users') + '</span>Amizade verdadeira</li>' +
          '<li><span>' + ic('book') + '</span>Crescimento na fé</li><li><span>' + ic('heartHandshake') + '</span>Missão na prática</li></ul>' +
        '<p class="bv-texto">Um lugar para jovens de 15 a 25 anos encontrarem pessoas com quem caminhar, crescerem na fé e descobrirem formas concretas de servir. O app é ponte: o melhor acontece nos encontros.</p>' +
        '<div class="bv-acoes"><a class="btn btn-ouro" href="#/entrar">Entrar ou criar cadastro</a>' +
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
        aviso('<b>Fase 2:</b> o login será o mesmo do Radar Atual (código pelo WhatsApp), com uma única conta para os dois. Nesta demonstração nada é enviado e nenhum dado sai do seu aparelho.', '', 'info') +
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
      '<div class="topo-inicio"><p class="data"><span>' + esc(D.hoje) + '</span><span class="demo-pill" title="Dados fictícios de demonstração">Demonstração</span></p><h2 class="saudacao">Que bom ter você aqui, <b>' + esc(E.perfil.nome) + '</b>.</h2><p>Vamos caminhar juntos na presença de Deus.</p></div>' +
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
          '<li><button type="button" data-acao="troca"><span class="ic-caixa">' + ic('repeat') + '</span><span class="li-t"><b>Pedir troca de círculo</b><span>' + (E.trocaPedida ? 'Pedido enviado à liderança' : 'Sem constrangimento, sem explicação obrigatória') + '</span></span>' + ic('right', 'ic seta') + '</button></li></ul></div>' +
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
        '<a class="cartao cartao-link" href="#/perfil">' + av(E.perfil.nome, '#2462D2') + '<div><h3>' + esc(E.perfil.nome) + '</h3><p>' + FAIXAS[E.perfil.faixa] + ' · ver perfil e preferências</p></div>' + ic('right', 'ic seta') + '</a>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          it('#/talentos', 'sparkles', 'Talentos e Serviço', 'Indique onde quer servir') +
          it('#/acolhimento', 'heart', 'Acolhimento', 'Pedido de oração e conversa') +
          it('#/jornada', 'compass', 'Minha Jornada', '90 dias, no seu ritmo') +
          it('#/missao', 'target', 'Missão da Semana', D.missao.titulo) +
          it('#/circulo', 'users', 'Meu Círculo', D.circulo.nome) + '</ul></div>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          it('#/lideranca', 'chart', 'Painel de liderança', 'Prévia com dados fictícios') +
          '<li><button type="button" data-acao="regras"><span class="ic-caixa">' + ic('shield') + '</span><span class="li-t"><b>Regras da comunidade</b><span>Respeito, cuidado e proteção</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          '<li><button type="button" data-acao="politica"><span class="ic-caixa">' + ic('lock') + '</span><span class="li-t"><b>Privacidade</b><span>Como cuidamos dos seus dados</span></span>' + ic('right', 'ic seta') + '</button></li>' +
          it('#/boas-vindas', 'home', 'Rever boas-vindas', 'Tela de apresentação') + '</ul></div>' +
        '<div class="cartao"><ul class="lista lista-link">' +
          '<li><a href="/?radar"><span class="ic-caixa ouro">' + ic('radar') + '</span><span class="li-t"><b>Ir para o Radar Atual</b><span>Bíblia, pregações e mais</span></span>' + ic('right', 'ic seta') + '</a></li>' +
          '<li><a href="/?capa"><span class="ic-caixa ouro">' + ic('left') + '</span><span class="li-t"><b>Voltar à capa</b><span>Escolher entre Radar e Conexão Jovem</span></span>' + ic('right', 'ic seta') + '</a></li></ul></div>' +
        AV_DEMO +
        '<p class="peq" style="text-align:center;letter-spacing:.04em">CONEXÃO JOVEM · protótipo Fase 1</p>' +
      '</div>' };
  };

  /* 14 · Painel de liderança (prévia) */
  T.lideranca = function () {
    var L = D.lideranca;
    return { cab: 'normal', voltar: '#/mais', nav: 'mais', titulo: 'Painel de liderança', html:
      '<div class="sec pt">' +
        aviso('<b>Prévia com números fictícios.</b> Na Fase 2, só papéis autorizados acessam, com registro de auditoria. O painel mostra dados agregados: nunca diário espiritual nem o conteúdo de pedidos de oração.', '', 'info') +
        '<h2 class="tit-sec" style="margin-top:8px">Integração · últimos 30 dias</h2>' +
        '<div class="kpis">' + L.kpis.map(function (k) { return '<div class="kpi"><small>' + esc(k.rot) + '</small><b>' + esc(k.val) + '</b><span>' + esc(k.meta) + '</span></div>'; }).join('') + '</div>' +
        '<div class="cartao"><h3>Continuidade por janela</h3><p>Participaram de ao menos uma experiência presencial (coorte de setembro). Interpretar o contexto, sem rotular ausentes.</p>' +
          '<div class="barras" role="list">' + L.continuidade.map(function (c) { return '<div class="barra-l" role="listitem" aria-label="' + c.rot + ': ' + c.val + '%"><span>' + c.rot + '</span><span class="barra-trilho"><span class="barra-cheia" style="width:' + c.val + '%;display:block"></span></span><b>' + c.val + '%</b></div>'; }).join('') + '</div></div>' +
        '<h2 class="tit-sec">Alertas operacionais</h2>' +
        '<div class="cartao"><ul class="lista">' + L.alertas.map(function (a) { var ok = E.alertasOk.indexOf(a.id) >= 0;
          return '<li style="align-items:flex-start"><span class="ic-caixa ' + (ok ? 'verde' : 'ouro') + '">' + ic(ok ? 'check' : a.ic) + '</span><span class="li-t"><b>' + esc(a.titulo) + '</b><span>' + esc(a.texto) + '</span><br><button class="btn btn-txt" type="button" data-acao="alerta" data-v="' + a.id + '" style="padding-left:0">' + (ok ? 'Encaminhado · desfazer' : 'Marcar como encaminhado') + '</button></span></li>'; }).join('') + '</ul></div>' +
        '<h2 class="tit-sec">Círculos</h2>' +
        '<div class="cartao"><ul class="lista">' + D.outrosCirculos.map(function (c) { return li('users', esc(c.nome) + (c.alerta ? ' <span class="selo selo-alerta">Atenção</span>' : ''), esc(c.faixa + ' · ' + c.membros + ' integrantes · ' + c.encontro)); }).join('') + '</ul></div>' +
        '<h2 class="tit-sec">Conteúdos e pedidos</h2>' +
        '<div class="cartao"><ul class="lista">' + L.conteudos.map(function (c) { return li('file', esc(c.titulo), esc(c.status)); }).join('') +
          li('lock', 'Pedidos de oração e conversa', 'Visíveis só para a equipe designada. Aqui aparecem apenas contagens.') + '</ul></div>' +
        '<div class="cartao"><h3>Gestão</h3><div class="btns">' +
          '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('plus', 'ic-sm') + 'Criar evento</button>' +
          '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('megaphone', 'ic-sm') + 'Novo comunicado</button>' +
          '<button class="btn btn-sec btn-cheio" type="button" disabled>' + ic('shield', 'ic-sm') + 'Papéis e permissões</button></div>' +
          fase2('Disponível na Fase 2, com login, papéis (líder, auxiliar, administrador, pastor, proteção), RLS no banco e registro de auditoria.') + '</div>' +
      '</div>' };
  };

  T.erro = function () {
    return { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Não encontrado', html:
      '<div class="sec pt-l"><div class="vazio">' + ic('compass') + '<b>Esta tela não existe</b><p>O link pode estar errado ou ter mudado.</p><a class="btn btn-pri" href="#/inicio" style="margin-top:14px">Voltar ao início</a></div></div>' };
  };

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
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    var f = A[el.getAttribute('data-acao')];
    if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-chave');
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
  var VITRINE = [['boas-vindas', 'Boas-vindas'], ['entrar', 'Entrar / cadastro'], ['consentimento', 'Consentimento e idade'], ['inicio', 'Início'], ['circulo', 'Meu Círculo'], ['jornada', 'Minha Jornada'], ['missao', 'Missão da Semana'], ['eventos', 'Eventos'], ['palavra', 'Palavra / Devocional'], ['comunidade', 'Comunidade'], ['talentos', 'Talentos e Serviço'], ['acolhimento', 'Acolhimento'], ['perfil', 'Perfil e preferências'], ['lideranca', 'Painel de liderança']];
  function rotaAtual() {
    var h = location.hash.replace(/^#\/?/, ''), q = {}, partes = h.split('?');
    (partes[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
    var seg = partes[0].split('/');
    return { nome: seg[0] || '', param: seg[1], q: q };
  }
  var app, tela, ultimaRota = '';
  function render(manterRolagem) {
    var r = rotaAtual();
    if (!r.nome) { location.replace('#/' + (E.entrou ? 'inicio' : 'boas-vindas')); return; }
    var fn = T[r.nome] || T.erro, v;
    try { v = fn(r.param, r.q); } catch (err) { console.error(err); v = { cab: 'normal', voltar: '#/inicio', nav: 'inicio', titulo: 'Algo deu errado', html: '<div class="sec pt-l"><div class="vazio">' + ic('alert') + '<b>Não foi possível abrir esta tela</b><p>Tente novamente. Se continuar, volte ao início.</p><a class="btn btn-pri" href="#/inicio" style="margin-top:14px">Voltar ao início</a></div></div>' }; }
    var chaveRota = location.hash.split('?')[0], mudou = chaveRota !== ultimaRota; ultimaRota = chaveRota;
    var y = window.scrollY;
    var cab = '';
    if (v.cab === 'marca') cab = '<header class="cab"><div class="cab-marca"><span class="logo">' + LOGO + '</span><span class="logo-t">CONEXÃO<br><b>JOVEM</b></span></div>' +
      '<button class="cab-bt" type="button" data-acao="avisos" aria-label="Avisos">' + ic('bell') + '</button><a class="avatar-bt" href="#/perfil" aria-label="Meu perfil">' + av(E.perfil.nome, '#2462D2', 'av-sm') + '</a></header>';
    else if (v.cab === 'normal') cab = '<header class="cab">' + (v.voltar ? '<a class="cab-bt" href="' + v.voltar + '" aria-label="Voltar">' + ic('left') + '</a>' : '') + '<h1>' + esc(v.titulo) + '</h1><span class="demo-pill" title="Dados fictícios de demonstração">Demonstração</span>' + (v.direita || '') + '</header>';
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
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
