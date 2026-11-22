// GUIA FLUTUANTE DO NEXUS: uma janela que paira sobre qualquer cena (universo, globo, templos, mundos, 360°),
// pode ser arrastada e minimizada. O que você pede, o NEXUS responde: se o pedido tem uma cena, a cena muda na hora
// (sem custo); se é um estudo, sermão ou pregação, ele prepara com o universo; o resto vira conversa com o Claude.
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// cenas que o NEXUS já tem (abrem pela pesquisa do universo)
const CENAS = [
  [/fruto proibido|queda|serpente|genesis 3\b|pecado original|arvore do conhecimento|escolha do homem|voz da mulher/, null, 'o mundo de Gênesis 3: a escolha do homem', () => window.NEXUS_MUNDO && window.NEXUS_MUNDO('queda')],
  [/(sete|7) trombetas|trombeta/, null, 'o mundo das sete trombetas (Apocalipse 8–11)', () => window.NEXUS_MUNDO && window.NEXUS_MUNDO('trombetas')],
  [/\beden\b|paraiso|jardim(?! do getsemani| das oliveiras)|arvore da vida/, 'Éden', 'o jardim do Éden: o drone desce e você anda dentro'],
  [/criacao|genesis 1\b|no principio/, null, 'a criação (Gênesis 1)', () => window.__ceuPrevia && window.__ceuPrevia._teste && window.__ceuPrevia._teste.entrarLivro(1)],
  [/templo de herodes|segundo templo|templo de jesus/, 'templo de Herodes', 'o templo de Herodes'],
  [/templo de salomao|primeiro templo|templo$/, 'templo de Salomão', 'o templo de Salomão'],
  [/getsemani|horto das oliveiras/, 'Getsêmani', 'o Getsêmani'],
  [/vale de ela|golias/, 'Vale de Elá', 'o Vale de Elá (1 Samuel 17)'],
  [/golgota|calvario|santo sepulcro/, 'Gólgota', 'o Gólgota'],
  [/lazaro/, 'túmulo de Lázaro', 'o túmulo de Lázaro em Betânia'],
  [/nazare/, 'Nazaré', 'Nazaré'], [/cafarnaum/, 'Cafarnaum', 'Cafarnaum'], [/magdala/, 'Magdala', 'Magdala'], [/mar da galileia|genezare|tiberiades/, 'Mar da Galileia', 'o Mar da Galileia'],
];
const IDS = ['queda', 'trombetas', 'eden', 'criacao', 'templo-herodes', 'templo-salomao', 'getsemani', 'ela', 'golgota', 'lazaro', 'nazare', 'cafarnaum', 'magdala', 'mar-galileia'];   // na mesma ordem de CENAS
const CHAVE = 'nexus_guia';
let hist = []; try { hist = JSON.parse(sessionStorage.getItem(CHAVE) || '[]'); } catch (_) { hist = []; }
const guardar = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(hist.slice(-30))); } catch (_) {} };
const inl = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
const par = (t) => esc(t).split(/\n\s*\n/).map((b) => { const ls = b.split('\n');
  if (ls.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l))) { const ord = /^\s*\d/.test(ls[0]); return `<${ord ? 'ol' : 'ul'}>` + ls.map((l) => '<li>' + inl(l.replace(/^\s*([-•*]|\d+[.)])\s+/, '')) + '</li>').join('') + `</${ord ? 'ol' : 'ul'}>`; }
  const h = b.match(/^(#{1,4})\s+(.+)$/); if (h && ls.length === 1) return `<h4>${inl(h[2])}</h4>`;
  return '<p>' + inl(b).replace(/\n/g, '<br>') + '</p>'; }).join('');

export function iniciarGuia() {
  const el = document.createElement('div'); el.className = 'guia'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Guia do NEXUS');
  el.innerHTML = `<style>
    .guia{position:fixed;left:24px;bottom:24px;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 140px));z-index:2147483000;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(20,33,61,.34) 0%,rgba(10,18,40,.22) 45%,rgba(40,28,8,.18) 100%);border:1px solid rgba(243,211,142,.45);border-radius:16px;box-shadow:0 22px 50px rgba(0,0,0,.45);backdrop-filter:blur(5px) saturate(1.15);-webkit-backdrop-filter:blur(5px) saturate(1.15);font:15px/1.55 Inter,system-ui,sans-serif;color:#F7F3E8;overflow:hidden;text-shadow:0 1px 2px rgba(0,0,0,.55)}
    body:has(.guia:not(.min)) .p3-card,body:has(.guia:not(.min)) .tp-ficha{left:auto!important;right:24px}body:has(.guia:not(.min)) .p3-cred,body:has(.guia:not(.min)) .mt-cred,body:has(.guia:not(.min)) .lr-cred{left:420px}
    .guia.grande{left:auto!important;right:16px;top:76px!important;bottom:16px!important;width:min(620px,46vw);height:auto;font-size:16px}.guia.grande .guia-msg{max-width:96%}
    .guia-msg h4{margin:6px 0 4px;font:700 17px 'Cormorant Garamond',Georgia,serif;color:#FFE3A3}.guia-msg ul,.guia-msg ol{margin:4px 0 6px 18px;padding:0}.guia-msg li{margin:2px 0}
    .guia-digitando::after{content:'▍';animation:gpisca 1s steps(1) infinite;color:#F3D38E}@keyframes gpisca{50%{opacity:0}}
    .guia.min{height:auto;width:auto}.guia.grande.min{top:auto!important;width:auto}.guia.min .guia-corpo,.guia.min .guia-form{display:none}
    .guia-topo{display:flex;align-items:center;gap:8px;padding:10px 12px;background:linear-gradient(90deg,rgba(20,33,61,.5),rgba(201,162,78,.22));border-bottom:1px solid rgba(243,211,142,.25);color:#F3E2B3;cursor:move;user-select:none}
    .guia-topo b{font:700 15px "Cormorant Garamond",Georgia,serif;letter-spacing:.04em;flex:1}.guia-topo small{color:rgba(243,226,179,.7);font-size:11px}
    .guia-topo button{border:0;background:rgba(255,255,255,.12);color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font:700 14px Inter,sans-serif}
    .guia-corpo{flex:1;overflow:auto;padding:12px}
    .guia-msg{margin:0 0 10px;padding:9px 12px;border-radius:12px;max-width:92%}.guia-msg p{margin:0 0 6px}.guia-msg p:last-child{margin:0}
    .guia-eu{margin-left:auto;background:rgba(201,162,78,.32);border:1px solid rgba(243,211,142,.45);color:#fff}.guia-nx{background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.14);color:#F7F3E8}.guia-nx small{display:block;color:rgba(243,226,179,.75);font-size:11.5px;margin-top:4px}.guia-msg b{color:#FFE3A3}
    .guia-sug{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.guia-sug button{border:1px solid rgba(243,211,142,.55);background:rgba(0,0,0,.3);color:#FFE8B0;border-radius:999px;padding:5px 10px;font:600 12px Inter,sans-serif;cursor:pointer}
    .guia-form{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(243,211,142,.25)}.guia-form textarea{flex:1;resize:none;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;border-radius:10px;padding:8px 10px;font:14px Inter,sans-serif;height:42px}.guia-form textarea::placeholder{color:rgba(255,255,255,.6)}
    .guia-form button{border:0;background:#C9A24E;color:#1B1405;border-radius:10px;padding:0 14px;font:700 13px Inter,sans-serif;cursor:pointer}

    /* ── jeito de WhatsApp ── */
    .guia-topo{padding:8px 10px}.guia-av{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE7A8,#C9A24E 60%,#7a5a1e);display:grid;place-items:center;color:#14213D;font:700 16px Georgia,serif;flex:none;box-shadow:0 0 0 2px rgba(243,211,142,.35)}
    .guia-nome{flex:1;display:flex;flex-direction:column;line-height:1.15}.guia-nome b{flex:none!important}.guia-nome small{color:#9fe3b0!important;font-size:11px!important}
    .guia-corpo{background-color:rgba(8,14,28,.06);background-image:radial-gradient(rgba(243,211,142,.07) 1px,transparent 1.2px);background-size:18px 18px}
    .guia-msg{position:relative;border-radius:10px;padding:7px 10px 18px;box-shadow:0 1px 2px rgba(0,0,0,.35)}
    .guia-eu{border-top-right-radius:2px;background:linear-gradient(180deg,rgba(201,162,78,.42),rgba(160,120,40,.36));backdrop-filter:blur(6px)}
    .guia-eu::after{content:'';position:absolute;right:-7px;top:0;border:7px solid transparent;border-top-color:rgba(190,150,60,.42);border-left-width:0}
    .guia-nx{border-top-left-radius:2px;background:rgba(18,26,46,.5);backdrop-filter:blur(6px)}.guia-nx::before{content:'';position:absolute;left:-7px;top:0;border:7px solid transparent;border-top-color:rgba(18,26,46,.5);border-right-width:0}
    .guia-hora{position:absolute;right:8px;bottom:3px;font-size:10.5px;color:rgba(255,255,255,.6);display:flex;gap:3px;align-items:center}.guia-hora i{font-style:normal;color:#8fd3ff;letter-spacing:-3px}
    .guia-anexo{display:block;margin:2px 0 6px;border-radius:8px;overflow:hidden;max-width:260px;cursor:pointer}.guia-anexo img{display:block;width:100%;height:auto}
    .guia-doc{display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.25);border-radius:8px;padding:8px 10px;margin:2px 0 6px;font-size:13px}.guia-doc span{font-size:24px}
    .guia-form{align-items:flex-end;gap:6px;padding:8px;background:rgba(8,14,28,.2)}
    .guia-caixa{flex:1;display:flex;align-items:flex-end;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:22px;padding:2px 4px 2px 6px}
    .guia-caixa textarea{border:0!important;background:transparent!important;height:38px;max-height:120px;padding:9px 6px!important}
    .guia-clip{border:0;background:none;width:36px;height:38px;cursor:pointer;display:grid;place-items:center;text-shadow:none}
    .guia-form button[type=submit]{width:44px;height:44px;border-radius:50%;padding:0;font-size:18px;display:grid;place-items:center}
    .guia-menu{position:absolute;left:10px;bottom:62px;display:none;grid-template-columns:repeat(4,64px);gap:10px;padding:12px;background:rgba(14,22,40,.96);border:1px solid rgba(243,211,142,.35);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.5);z-index:5}
    .guia-menu.on{display:grid}.guia-menu button{border:0;background:none;color:#F7F3E8;font:600 11px Inter,sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px}.guia-menu button span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:22px}
    .guia-previa{display:none;gap:6px;padding:6px 10px 0;flex-wrap:wrap}.guia-previa.on{display:flex}.guia-previa div{position:relative;font-size:12px;background:rgba(0,0,0,.35);border-radius:8px;padding:4px 22px 4px 6px;max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.guia-previa img{height:44px;border-radius:6px;display:block}.guia-previa b{position:absolute;right:4px;top:2px;cursor:pointer;color:#fff}
  .guia-acoes{display:flex;gap:6px;margin-top:8px}.guia-acoes button{border:1px solid rgba(243,211,142,.5);background:rgba(0,0,0,.25);color:#FFE7B0;border-radius:999px;padding:4px 10px;font:600 11.5px Inter,sans-serif;cursor:pointer}
  </style>
  <div class="guia-topo"><div class="guia-av">✦</div><div class="guia-nome"><b>NEXUS</b><small>online · Claude</small></div><button type="button" data-g="limpar" title="Nova conversa" aria-label="Nova conversa">🗑</button><button type="button" data-g="grande" title="Janela grande de conversa" aria-label="Aumentar">⤢</button><button type="button" data-g="min" title="Minimizar" aria-label="Minimizar">–</button></div>
  <div class="guia-corpo" aria-live="polite"></div>
  <div class="guia-previa"></div><div class="guia-menu"><button type="button" data-anx="foto"><span style="background:#7b4fd6">🖼</span>Galeria</button><button type="button" data-anx="camera"><span style="background:#d6457b">📷</span>Câmera</button><button type="button" data-anx="doc"><span style="background:#4f6bd6">📄</span>Documento</button><button type="button" data-anx="video"><span style="background:#d68a2f">🎬</span>Vídeo</button></div><input type="file" hidden accept="image/*" multiple data-in="foto"><input type="file" hidden accept="image/*" capture="environment" data-in="camera"><input type="file" hidden accept="application/pdf" data-in="doc"><input type="file" hidden accept="video/*" data-in="video"><form class="guia-form"><div class="guia-caixa"><button type="button" class="guia-clip" title="Anexar foto, PDF ou vídeo" aria-label="Anexar"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#F3D38E" stroke-width="2" stroke-linecap="round"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5"/></svg></button><textarea name="t" placeholder="Mensagem"></textarea></div><button type="submit" aria-label="Enviar">➤</button></form>`;
  document.body.appendChild(el);
  const corpo = el.querySelector('.guia-corpo'), form = el.querySelector('.guia-form'), ta = form.querySelector('textarea'), btMin = el.querySelector('[data-g=min]');
  function desenhar() {
    if (!hist.length) { corpo.innerHTML = `<div class="guia-msg guia-nx"><p>Olá! Vamos conversar. Pergunte o que quiser sobre a Bíblia, discuta um estudo ou um sermão comigo, ou peça um lugar e o ambiente muda.</p></div><div class="guia-sug">${['Me leve ao Éden', 'Por que Deus plantou um jardim?', 'Sermão sobre Gênesis 3', 'Getsêmani', 'O que é a árvore da vida?'].map((s) => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>`; return; }
    corpo.innerHTML = hist.map((m, i) => `<div class="guia-msg ${m.eu ? 'guia-eu' : 'guia-nx'}">${(m.anexos || []).map((a, k) => a.thumb ? `<span class="guia-anexo" data-ver="${i}:${k}"><img src="${a.thumb}" alt=""></span>` : `<div class="guia-doc"><span>${a.tipo === 'pdf' ? '📄' : '🎬'}</span>${esc(a.nome || '')}</div>`).join('')}${m.eu ? esc(m.t) : par(m.t)}${m.nota ? `<small>${esc(m.nota)}</small>` : ''}${!m.eu && m.claude ? `<div class="guia-acoes">${m.rascunho ? `<button type="button" data-baixar="${i}">⬇ Baixar</button><button type="button" data-copiar="${i}">⧉ Copiar</button>` : ''}${m.gptFeito ? '' : `<button type="button" data-gpt="${i}">🤖 Segunda opinião (GPT, grátis)</button>`}</div>` : ''}<span class="guia-hora">${m.hora || ''}${m.eu ? '<i>✓✓</i>' : ''}</span></div>`).join(''); corpo.scrollTop = corpo.scrollHeight;
  }
  async function abrirCena(cena) { const [, busca, , fn] = cena;
    if ((!window.__ceuPrevia || !document.body.classList.contains('ceu-universo')) && typeof window.NEXUS_ABRIR_CEU === 'function') await window.NEXUS_ABRIR_CEU();
    for (let i = 0; i < 40 && !(window.__ceuPrevia && window.__ceuPrevia._teste && window.__ceuPrevia._teste.pronto()); i++) await new Promise((ok) => setTimeout(ok, 250));
    document.querySelectorAll('.mt-sair,.p3-sair,.lr-sair,.tp-sair,.lc-pular,.ej-sair').forEach((b) => { try { b.click(); } catch (_) {} });   // fecha a cena aberta
    await new Promise((ok) => setTimeout(ok, 700));
    try { if (fn) fn(); else window.__ceuPrevia._teste.buscar(busca); } catch (_) {} }
  const abrir3D = (url, leg) => import('/nexus/foto3d.js?v=2').then((m) => m.abrirFoto3D(url, leg)).catch((e) => console.warn('foto 3D', e));
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  async function pedir(texto, anexos) {
    texto = String(texto || '').trim(); anexos = anexos || []; if (!texto && !anexos.length) return; const q = norm(texto);
    hist.push({ eu: true, t: texto, hora: hora(), anexos: anexos.map((a) => ({ tipo: a.tipo, nome: a.nome, thumb: a.thumb })) }); desenhar();
    // foto de um lugar: vira cena 3D realista na hora (profundidade calculada no próprio aparelho)
    const foto = anexos.find((a) => a.tipo === 'imagem' && !a.video); if (foto) abrir3D(foto.url || foto.thumb, texto);
    if (anexos.length) { await conversar(texto || (foto ? 'Que lugar é este? Me conte o que você vê e a ligação com a Bíblia, se houver.' : 'Leia o anexo e me diga o essencial.'), anexos); return; }
    // dentro de um mundo, o pedido de ir a algo que está à vista segue dali mesmo (não volta ao globo)
    if (typeof window.NEXUS_MUNDO_ACAO === 'function') { const r = window.NEXUS_MUNDO_ACAO(q); if (r) { hist.push({ t: r, nota: 'no mundo · sem custo', hora: hora() }); guardar(); desenhar(); return; } }
    const pergunta = /\?$/.test(texto) || /^(o que|oque|por que|porque|pq|quem|como|qual|quais|quando|onde|sera|explique|me explica|fale|me fala|conte|me conta|voce acha)\b/.test(q);
    const comando = /\b(me leve|leve-me|me leva|leva|abra|abre|abrir|mostre|mostra|mostrar|quero ver|quero ir|quero andar|quero entrar|quero conhecer|vamos|ir para|ir ao|va para|entrar|entra|entre|visitar|visite|conhecer|passear|andar|vislumbre|visao|me de|me da|deixa eu ver|leve)\b/.test(q) || (!pergunta && q.split(/\s+/).length <= 4);
    const cena = comando || /\b(estudo|sermao|pregacao)\b/.test(q) ? CENAS.find(([re]) => re.test(q)) : null;
    if (cena) {   // a cena muda na hora (sem custo)
      const [, busca, nome, fn] = cena; await abrirCena(cena);
      const estudo = /\b(estudo|sermao|pregacao|mensagem)\b/.test(q);
      hist.push({ t: `Abrindo ${nome}.` + (estudo ? ' Agora vou preparar o texto com o universo; ele aparece aqui quando estiver pronto.' : ' Pode me perguntar sobre o que está vendo.'), nota: 'cena do NEXUS · sem custo' }); guardar(); desenhar();
      if (!estudo) return;
    }
    // estudo, sermão, pregação ou mensagem: o Claude escreve a partir do dossiê que o universo do NEXUS monta (versículos e camadas com fonte);
    // depois a conversa continua para discutir e refinar o texto
    const ehEstudo = /\b(estudo|sermao|pregacao|mensagem|esboco|devocional)\b/.test(q) && !/\b(refa|melhor|mude|troque|acrescente|tire|encurte|aumente)/.test(q);
    if (ehEstudo) {
      const tipo = /sermao/.test(q) ? 'sermao' : /pregacao|esboco/.test(q) ? 'pregacao' : /mensagem|devocional/.test(q) ? 'mensagem' : 'estudo';
      hist.push({ t: 'Montando o dossiê no universo e escrevendo com o Claude…', pend: true }); desenhar();
      let dossie = null; try { if (window.__ceuPrevia && window.__ceuPrevia.prepararDossie) dossie = window.__ceuPrevia.prepararDossie(texto); } catch (_) {}
      let jp; try { const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'preparar', tipo, tema: texto.slice(0, 160), dossie: dossie && !dossie.vazio ? dossie : null, cracha: ler('radar_chave'), token: ler('lp_token') }) }); jp = await r.json(); } catch (_) { jp = { ok: false, err: 'Sem conexão agora.' }; }
      hist.pop();
      const fonte = dossie && !dossie.vazio ? `${dossie.total_versos} versículo(s) e ${dossie.camadas.length} camada(s) do universo` : 'sem material do universo';
      hist.push(jp.ok ? { t: jp.texto, rascunho: true, claude: true, nota: (jp.modelo ? jp.modelo + ' · US$ ' + Number(jp.custo_usd || 0).toFixed(4) + ' · ' : '') + fonte + ' · peça ajustes: encurte o ponto 2, mais aplicação…' } : { t: jp.motivo === 'particular' ? 'Para escrever com o Claude, entre com o PIN (botão de acesso no alto).' : (jp.err || 'Não consegui preparar agora.') });
      guardar(); desenhar(); return;
    }
    await conversar(texto, []);
  }
  async function conversar(texto, anexos) {
    // conversa com o Claude (com o contexto da tela, o rascunho anterior e os anexos)
    hist.push({ t: 'digitando…', pend: true }); desenhar();
    let j; try { const ctx = Object.assign({}, typeof window.NEXUS_CONTEXTO === 'function' ? window.NEXUS_CONTEXTO() : {}, { cena: (typeof window.NEXUS_CENA === 'function' && window.NEXUS_CENA()) || (document.querySelector('.lc-raiz') && window.__nexusQuadro) || '' });
      const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'conversar', mensagens: hist.filter((m) => !m.pend).slice(-10).map((m) => ({ papel: m.eu ? 'eu' : 'claude', texto: m.t || texto })), anexos: anexos.map((a) => ({ tipo: a.tipo === 'pdf' ? 'pdf' : 'imagem', mime: a.mime, dados: a.dados })).filter((a) => a.dados), contexto: ctx, cracha: ler('radar_chave'), token: ler('lp_token') }) });
      j = await r.json(); } catch (_) { j = { ok: false, err: 'Sem conexão agora.' }; }
    hist.pop();
    let ordem = null; if (j.ok && j.texto) { const mm = String(j.texto).match(/\[\[CENA:([a-z-]+)\]\]/); if (mm) { ordem = mm[1]; j.texto = String(j.texto).replace(/\s*\[\[CENA:[a-z-]+\]\]\s*/g, ' ').trim(); } }
    if (ordem && IDS.includes(ordem)) abrirCena(CENAS[IDS.indexOf(ordem)]);
    const msg = j.ok ? { t: j.texto, claude: true, hora: hora(), nota: j.reaproveitado ? 'resposta reaproveitada, sem custo' : (j.modelo ? j.modelo + ' · US$ ' + Number(j.custo_usd || 0).toFixed(4) : '') } : { t: j.motivo === 'particular' ? 'Para conversar comigo, entre com o PIN (botão de acesso no alto). As cenas abrem mesmo sem PIN.' : (j.err || 'Não consegui responder agora.') };
    hist.push(msg); guardar(); if (j.ok) await digitar(msg); else desenhar();
  }
  // efeito de digitação: a resposta vai aparecendo, como num bate-papo
  async function digitar(msg) { const total = msg.t; const passo = Math.max(3, Math.ceil(total.length / 260)); msg.t = ''; desenhar(); const caixa = corpo.lastElementChild;
    for (let n = 0; n < total.length; n += passo) { msg.t = total.slice(0, n); if (caixa) { caixa.innerHTML = par(msg.t) ; caixa.classList.add('guia-digitando'); } corpo.scrollTop = corpo.scrollHeight; await new Promise((ok) => setTimeout(ok, 16)); }
    msg.t = total; desenhar(); }
  // segunda opinião: a mesma conversa (até a resposta escolhida) respondida pelo GPT aberto da OpenAI, de graça
  async function segundaOpiniao(i) {
    const conversa = hist.slice(0, i + 1).filter((m) => !m.pend && !m.gpt);
    hist.splice(i + 1, 0, { t: 'O GPT está pensando…', pend: true, gpt: true }); desenhar();
    let j; try { const ctx = { cena: (typeof window.NEXUS_CENA === 'function' && window.NEXUS_CENA()) || '' };
      const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'segunda-opiniao', mensagens: conversa.slice(-10).map((m) => ({ papel: m.eu ? 'eu' : 'claude', texto: m.t })), contexto: ctx, cracha: ler('radar_chave'), token: ler('lp_token') }) });
      j = await r.json(); } catch (_) { j = { ok: false, err: 'Sem conexão agora.' }; }
    const k = hist.findIndex((m) => m.pend && m.gpt); const nova = j.ok ? { t: '🤖 Segunda opinião: ' + j.texto, gpt: true, nota: (j.modelo || 'GPT') + ' · grátis' } : { t: j.motivo === 'particular' ? 'Para a segunda opinião, entre com o PIN.' : (j.err || 'O GPT não respondeu agora.'), gpt: true }; if (k >= 0) hist.splice(k, 1, nova);
    guardar(); desenhar();
  }
  const menu = el.querySelector('.guia-menu'), previa = el.querySelector('.guia-previa'); let fila = [];
  el.querySelector('.guia-clip').addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('on'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.guia-menu') && !e.target.closest('.guia-clip')) menu.classList.remove('on'); });
  menu.addEventListener('click', (e) => { const b = e.target.closest('[data-anx]'); if (!b) return; menu.classList.remove('on'); el.querySelector(`[data-in="${b.dataset.anx}"]`).click(); });
  const lerURL = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
  const reduzir = (url, max, q) => new Promise((ok) => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); }; im.onerror = () => ok(null); im.src = url; });
  const quadrosVideo = (f) => new Promise((ok) => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(f); const out = [];
    v.onloadedmetadata = async () => { const d = v.duration || 1; for (const p of [0.1, 0.35, 0.6, 0.85]) { await new Promise((r) => { v.onseeked = r; v.currentTime = d * p; }); const s = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement('canvas'); c.width = v.videoWidth * s; c.height = v.videoHeight * s; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); out.push(c.toDataURL('image/jpeg', 0.8)); } ok(out); };
    v.onerror = () => ok(out); });
  const desenharPrevia = () => { previa.classList.toggle('on', fila.length > 0); previa.innerHTML = fila.map((a, i) => `<div>${a.thumb ? `<img src="${a.thumb}" alt="">` : (a.tipo === 'pdf' ? '📄 ' : '🎬 ') + esc(a.nome)}<b data-tira="${i}">×</b></div>`).join(''); };
  previa.addEventListener('click', (e) => { const b = e.target.closest('[data-tira]'); if (b) { fila.splice(+b.dataset.tira, 1); desenharPrevia(); } });
  el.querySelectorAll('input[type=file]').forEach((inp) => inp.addEventListener('change', async () => {
    for (const f of [...inp.files].slice(0, 4)) {
      if (inp.dataset.in === 'doc') { if (f.size > 2.8e6) { alert('PDF grande demais para o chat (máx. 2,8 MB).'); continue; } const url = await lerURL(f); fila.push({ tipo: 'pdf', nome: f.name, mime: 'application/pdf', dados: url.split(',')[1] }); }
      else if (inp.dataset.in === 'video') { const qs = await quadrosVideo(f); qs.forEach((u, k) => fila.push({ tipo: 'imagem', nome: f.name + ' (quadro ' + (k + 1) + ')', mime: 'image/jpeg', dados: u.split(',')[1], thumb: k === 0 ? u : null, video: true })); fila = fila.filter((a, k, arr) => !a.video || a.thumb || arr.indexOf(a) === k); }
      else { const url = await lerURL(f); const g = await reduzir(url, 1568, 0.85), t = await reduzir(url, 360, 0.7); fila.push({ tipo: 'imagem', nome: f.name, mime: 'image/jpeg', dados: g && g.split(',')[1], thumb: t, url }); }
    }
    inp.value = ''; desenharPrevia(); ta.focus(); }));
  form.addEventListener('submit', (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; const an = fila; fila = []; desenharPrevia(); pedir(t, an); });
  corpo.addEventListener('click', (e) => { const v = e.target.closest('[data-ver]'); if (v) { const [i, k] = v.dataset.ver.split(':').map(Number); const a = hist[i] && hist[i].anexos && hist[i].anexos[k]; if (a && a.thumb) abrir3D(a.thumb, hist[i].t); } });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  corpo.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) pedir(b.dataset.s);
    const bx = e.target.closest('[data-baixar]'); if (bx) { const m = hist[+bx.dataset.baixar]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([m.t], { type: 'text/markdown;charset=utf-8' })); a.download = 'NEXUS-' + (m.t.split('\n')[0].replace(/[^\wÀ-ú ]+/g, '').trim().slice(0, 50) || 'estudo') + '.md'; a.click(); }
    const bg = e.target.closest('[data-gpt]'); if (bg) { const i = +bg.dataset.gpt; hist[i].gptFeito = true; segundaOpiniao(i); }
    const bc = e.target.closest('[data-copiar]'); if (bc) { try { navigator.clipboard.writeText(hist[+bc.dataset.copiar].t); bc.textContent = '✓ Copiado'; } catch (_) {} } });
  // minimizar
  const minimizar = (sim) => { el.classList.toggle('min', sim); btMin.textContent = sim ? '▢' : '–'; btMin.title = sim ? 'Abrir' : 'Minimizar'; try { localStorage.setItem('nexus_guia_min', sim ? '1' : ''); } catch (_) {} };
  btMin.addEventListener('click', (e) => { e.stopPropagation(); minimizar(!el.classList.contains('min')); });
  el.querySelector('[data-g=limpar]').addEventListener('click', (e) => { e.stopPropagation(); hist = []; guardar(); desenhar(); });
  const btGr = el.querySelector('[data-g=grande]'); const grande = (sim) => { el.classList.toggle('grande', sim); btGr.textContent = sim ? '⤡' : '⤢'; if (sim) minimizar(false); try { localStorage.setItem('nexus_guia_grande', sim ? '1' : ''); } catch (_) {} corpo.scrollTop = corpo.scrollHeight; };
  btGr.addEventListener('click', (e) => { e.stopPropagation(); grande(!el.classList.contains('grande')); }); try { if (localStorage.getItem('nexus_guia_grande')) grande(true); } catch (_) {}
  try { if (localStorage.getItem('nexus_guia_min')) minimizar(true); } catch (_) {}
  // arrastar pelo topo (mouse e dedo)
  const topo = el.querySelector('.guia-topo'); let arr = null;
  topo.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; const r = el.getBoundingClientRect(); arr = { dx: e.clientX - r.left, dy: e.clientY - r.top }; try { topo.setPointerCapture(e.pointerId); } catch (_) {} });
  topo.addEventListener('pointermove', (e) => { if (!arr) return; const x = Math.max(4, Math.min(innerWidth - 120, e.clientX - arr.dx)), y = Math.max(4, Math.min(innerHeight - 50, e.clientY - arr.dy)); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.bottom = 'auto'; });
  topo.addEventListener('pointerup', () => { arr = null; });
  desenhar();
  window.NEXUS_GUIA = pedir;
  // dentro de um mundo, o guia mostra os pontos do sermão: tocar num ponto leva a cena até ele
  window.NEXUS_MUNDO_QUADRO = (k, C) => { window.__nexusQuadro = `${C.livro} · ${C.titulo}, ponto ${k + 1}: ${(C.quadros[k] && (C.quadros[k].ponto || C.quadros[k].ref)) || ''}`; let bar = el.querySelector('.guia-pontos'); if (!bar) { bar = document.createElement('div'); bar.className = 'guia-pontos'; bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;border-bottom:1px solid rgba(243,211,142,.25);background:rgba(0,0,0,.18)'; el.insertBefore(bar, corpo); bar.addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b && window.NEXUS_MUNDO_IR) window.NEXUS_MUNDO_IR(+b.dataset.q); }); }
    bar.innerHTML = `<small style="width:100%;color:rgba(243,226,179,.8);font-size:11px;letter-spacing:.08em">${esc(C.livro)} · ${esc(C.titulo)} · PONTOS</small>` + C.quadros.map((q, i) => `<button type="button" data-q="${i}" style="border:1px solid rgba(243,211,142,${i === k ? '.9' : '.35'});background:${i === k ? 'rgba(201,162,78,.55)' : 'rgba(0,0,0,.3)'};color:#fff;border-radius:999px;padding:3px 9px;font:600 11.5px Inter,sans-serif;cursor:pointer">${i + 1}. ${esc(q.ponto || q.ref)}</button>`).join(''); };
}
