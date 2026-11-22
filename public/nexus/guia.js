// GUIA FLUTUANTE DO NEXUS: uma janela que paira sobre qualquer cena (universo, globo, templos, mundos, 360°),
// pode ser arrastada e minimizada. O que você pede, o NEXUS responde: se o pedido tem uma cena, a cena muda na hora
// (sem custo); se é um estudo, sermão ou pregação, ele prepara com o universo; o resto vira conversa com o Claude.
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// cenas que o NEXUS já tem (abrem pela pesquisa do universo)
const CENAS = [
  [/(sete|7) trombetas|trombeta/, 'sete trombetas', 'o mundo das sete trombetas (Apocalipse 8–11)'],
  [/\beden\b|paraiso/, 'Éden', 'o jardim do Éden para sobrevoar'],
  [/criacao|genesis 1\b|no principio/, null, 'a criação (Gênesis 1)', () => window.__ceuPrevia && window.__ceuPrevia._teste && window.__ceuPrevia._teste.entrarLivro(1)],
  [/templo de herodes|segundo templo|templo de jesus/, 'templo de Herodes', 'o templo de Herodes'],
  [/templo de salomao|primeiro templo|templo$/, 'templo de Salomão', 'o templo de Salomão'],
  [/getsemani|horto das oliveiras/, 'Getsêmani', 'o Getsêmani'],
  [/golgota|calvario|santo sepulcro/, 'Gólgota', 'o Gólgota'],
  [/lazaro/, 'túmulo de Lázaro', 'o túmulo de Lázaro em Betânia'],
  [/nazare/, 'Nazaré', 'Nazaré'], [/cafarnaum/, 'Cafarnaum', 'Cafarnaum'], [/magdala/, 'Magdala', 'Magdala'], [/mar da galileia|genezare|tiberiades/, 'Mar da Galileia', 'o Mar da Galileia'],
];
const CHAVE = 'nexus_guia';
let hist = []; try { hist = JSON.parse(sessionStorage.getItem(CHAVE) || '[]'); } catch (_) { hist = []; }
const guardar = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(hist.slice(-30))); } catch (_) {} };
const par = (t) => esc(t).split(/\n\s*\n/).map((b) => '<p>' + b.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</p>').join('');

export function iniciarGuia() {
  const el = document.createElement('div'); el.className = 'guia'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Guia do NEXUS');
  el.innerHTML = `<style>
    .guia{position:fixed;left:24px;bottom:24px;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 140px));z-index:2147483000;display:flex;flex-direction:column;background:rgba(252,248,238,.97);border:1px solid rgba(201,162,78,.55);border-radius:16px;box-shadow:0 22px 50px rgba(5,10,25,.45);backdrop-filter:blur(8px);font:14px/1.5 Inter,system-ui,sans-serif;color:#1E2A44;overflow:hidden}
    body:has(.guia:not(.min)) .p3-card,body:has(.guia:not(.min)) .tp-ficha{left:auto!important;right:24px}body:has(.guia:not(.min)) .p3-cred,body:has(.guia:not(.min)) .mt-cred,body:has(.guia:not(.min)) .lr-cred{left:420px}
    .guia.min{height:auto;width:auto}.guia.min .guia-corpo,.guia.min .guia-form{display:none}
    .guia-topo{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14213D;color:#F3E2B3;cursor:move;user-select:none}
    .guia-topo b{font:700 15px "Cormorant Garamond",Georgia,serif;letter-spacing:.04em;flex:1}.guia-topo small{color:rgba(243,226,179,.7);font-size:11px}
    .guia-topo button{border:0;background:rgba(255,255,255,.12);color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font:700 14px Inter,sans-serif}
    .guia-corpo{flex:1;overflow:auto;padding:12px}
    .guia-msg{margin:0 0 10px;padding:9px 12px;border-radius:12px;max-width:92%}.guia-msg p{margin:0 0 6px}.guia-msg p:last-child{margin:0}
    .guia-eu{margin-left:auto;background:#14213D;color:#fff}.guia-nx{background:#fff;border:1px solid rgba(201,162,78,.35)}.guia-nx small{display:block;color:#8a7a5a;font-size:11px;margin-top:4px}
    .guia-sug{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.guia-sug button{border:1px solid rgba(201,162,78,.5);background:#fff;color:#14213D;border-radius:999px;padding:5px 10px;font:600 12px Inter,sans-serif;cursor:pointer}
    .guia-form{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(201,162,78,.3)}.guia-form textarea{flex:1;resize:none;border:1px solid rgba(20,33,61,.2);border-radius:10px;padding:8px 10px;font:14px Inter,sans-serif;height:42px}
    .guia-form button{border:0;background:#C9A24E;color:#1B1405;border-radius:10px;padding:0 14px;font:700 13px Inter,sans-serif;cursor:pointer}
  </style>
  <div class="guia-topo"><b>✦ Guia do NEXUS</b><small>peça e a cena muda</small><button type="button" data-g="min" title="Minimizar" aria-label="Minimizar">–</button></div>
  <div class="guia-corpo" aria-live="polite"></div>
  <form class="guia-form"><textarea name="t" placeholder="Ex.: me leve ao Getsêmani · estudo sobre as 7 trombetas · quem foi Lázaro?"></textarea><button type="submit">Enviar</button></form>`;
  document.body.appendChild(el);
  const corpo = el.querySelector('.guia-corpo'), form = el.querySelector('.guia-form'), ta = form.querySelector('textarea'), btMin = el.querySelector('[data-g=min]');
  function desenhar() {
    if (!hist.length) { corpo.innerHTML = `<div class="guia-msg guia-nx"><p>Olá! Peça um lugar, um tema ou um estudo e o NEXUS muda o ambiente. Também respondo perguntas.</p></div><div class="guia-sug">${['Me leve ao Éden', 'Estudo sobre as 7 trombetas', 'Templo de Herodes', 'Getsêmani', 'A criação'].map((s) => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>`; return; }
    corpo.innerHTML = hist.map((m) => `<div class="guia-msg ${m.eu ? 'guia-eu' : 'guia-nx'}">${m.eu ? esc(m.t) : par(m.t)}${m.nota ? `<small>${esc(m.nota)}</small>` : ''}</div>`).join(''); corpo.scrollTop = corpo.scrollHeight;
  }
  async function pedir(texto) {
    texto = String(texto || '').trim(); if (!texto) return; const q = norm(texto);
    hist.push({ eu: true, t: texto }); desenhar();
    const cena = CENAS.find(([re]) => re.test(q));
    if (cena) {   // a cena muda na hora (sem custo)
      const [, busca, nome, fn] = cena;
      if (!window.__ceuPrevia && typeof window.NEXUS_ABRIR_CEU === 'function') await window.NEXUS_ABRIR_CEU();
      for (let i = 0; i < 40 && !(window.__ceuPrevia && window.__ceuPrevia._teste && window.__ceuPrevia._teste.pronto()); i++) await new Promise((ok) => setTimeout(ok, 250));
      // fecha a cena que estiver aberta antes de abrir a nova
      document.querySelectorAll('.mt-sair,.p3-sair,.lr-sair,.tp-sair,.lc-pular').forEach((b) => { try { b.click(); } catch (_) {} });
      await new Promise((ok) => setTimeout(ok, 700));
      try { if (fn) fn(); else window.__ceuPrevia._teste.buscar(busca); } catch (_) {}
      const estudo = /\b(estudo|sermao|pregacao|mensagem)\b/.test(q);
      hist.push({ t: `Abrindo ${nome}.` + (estudo ? ' Agora vou preparar o texto com o universo; ele aparece aqui quando estiver pronto.' : ' Pode me perguntar sobre o que está vendo.'), nota: 'cena do NEXUS · sem custo' }); guardar(); desenhar();
      if (!estudo) return;
    }
    // conversa com o Claude (com o contexto da tela); estudos usam o pedido como tema
    hist.push({ t: 'Pensando…', pend: true }); desenhar();
    let j; try { const ctx = typeof window.NEXUS_CONTEXTO === 'function' ? window.NEXUS_CONTEXTO() : null;
      const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'conversar', mensagens: hist.filter((m) => !m.pend).slice(-10).map((m) => ({ papel: m.eu ? 'eu' : 'claude', texto: m.t })), contexto: ctx, cracha: ler('radar_chave'), token: ler('lp_token') }) });
      j = await r.json(); } catch (_) { j = { ok: false, err: 'Sem conexão agora.' }; }
    hist.pop();
    hist.push(j.ok ? { t: j.texto, nota: j.reaproveitado ? 'resposta reaproveitada, sem custo' : (j.modelo ? j.modelo + ' · US$ ' + Number(j.custo_usd || 0).toFixed(4) : '') } : { t: j.motivo === 'particular' ? 'Para conversar comigo, entre com o PIN (botão de acesso no alto). As cenas abrem mesmo sem PIN.' : (j.err || 'Não consegui responder agora.') });
    guardar(); desenhar();
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; pedir(t); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  corpo.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) pedir(b.dataset.s); });
  // minimizar
  const minimizar = (sim) => { el.classList.toggle('min', sim); btMin.textContent = sim ? '▢' : '–'; btMin.title = sim ? 'Abrir' : 'Minimizar'; try { localStorage.setItem('nexus_guia_min', sim ? '1' : ''); } catch (_) {} };
  btMin.addEventListener('click', (e) => { e.stopPropagation(); minimizar(!el.classList.contains('min')); });
  try { if (localStorage.getItem('nexus_guia_min')) minimizar(true); } catch (_) {}
  // arrastar pelo topo (mouse e dedo)
  const topo = el.querySelector('.guia-topo'); let arr = null;
  topo.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; const r = el.getBoundingClientRect(); arr = { dx: e.clientX - r.left, dy: e.clientY - r.top }; try { topo.setPointerCapture(e.pointerId); } catch (_) {} });
  topo.addEventListener('pointermove', (e) => { if (!arr) return; const x = Math.max(4, Math.min(innerWidth - 120, e.clientX - arr.dx)), y = Math.max(4, Math.min(innerHeight - 50, e.clientY - arr.dy)); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.bottom = 'auto'; });
  topo.addEventListener('pointerup', () => { arr = null; });
  desenhar();
  window.NEXUS_GUIA = pedir;
}
