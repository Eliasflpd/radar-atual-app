// HEBRAICO DO CÓDICE DE LENINGRADO, versículo por versículo e palavra por palavra.
// Texto: Open Scriptures Hebrew Bible (CC BY 4.0), baseada no Westminster Leningrad Codex (domínio público).
// Significados: dados da camada Línguas (STEPBible, CC BY), em inglês, como estão na fonte.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cache = new Map(); let lemas = null;
const CLASSE = { V: 'verbo', N: 'substantivo', A: 'adjetivo', P: 'pronome', R: 'preposição', C: 'conjunção', T: 'partícula', D: 'advérbio', S: 'sufixo' };
const TRONCO = { q: 'qal', N: 'nifal', p: 'piel', P: 'pual', h: 'hifil', H: 'hofal', t: 'hitpael' };
const ASP = { p: 'perfeito', q: 'perfeito consecutivo', i: 'imperfeito', w: 'imperfeito consecutivo (wayyiqtol)', h: 'coortativo', j: 'jussivo', v: 'imperativo', r: 'particípio', s: 'particípio passivo', a: 'infinitivo absoluto', c: 'infinitivo construto' };
function morfologia(m) {   // "HC/Vqw3fs" → "conjunção + verbo qal, imperfeito consecutivo (wayyiqtol), 3ª pessoa feminino singular"
  return String(m || '').replace(/^H/, '').split('/').map((p) => {
    if (p.startsWith('Td')) return 'artigo'; if (p.startsWith('Rd')) return 'preposição com artigo';
    const c = CLASSE[p[0]] || p[0]; if (p[0] !== 'V') return c;
    const tr = TRONCO[p[1]] || '', as = ASP[p[2]] || '', pe = /[123]/.test(p[3] || '') ? p[3] + 'ª pessoa' : '', ge = { m: 'masculino', f: 'feminino', c: 'comum' }[p[4]] || '', nu = { s: 'singular', p: 'plural', d: 'dual' }[p[5]] || '';
    return [c, tr, as, [pe, ge, nu].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }).join(' + ');
}
async function dicionario() {
  if (lemas) return lemas; lemas = new Map();
  try { const d = await (await fetch('/nexus/camadas/linguas.json?v=1')).json(); for (const l of d.lemas || []) if (l.s && l.s[0] === 'H') { const k = l.s.slice(0, 5), a = lemas.get(k); if (!a || (l.n || 0) > (a.n || 0)) lemas.set(k, l); } } catch (_) {}
  return lemas;
}
export async function versoHebraico(b, c, v) {
  if (b > 39) return null; if (!cache.has(b)) cache.set(b, fetch(`/nexus/hebraico/${b}.json?v=1`).then((r) => r.json()).catch(() => null));
  const livro = await cache.get(b); return livro && livro[c] && livro[c][v] ? livro[c][v] : null;
}
export async function abrirHebraico(b, c, v, titulo, host) {
  const ws = await versoHebraico(b, c, v); const dic = await dicionario();
  document.querySelectorAll('.hb-raiz').forEach((e) => e.remove());
  const raiz = document.createElement('div'); raiz.className = 'hb-raiz';
  raiz.innerHTML = `<style>
    .hb-raiz{position:absolute;inset:0;z-index:45;display:grid;place-items:center;background:rgba(5,10,22,.55);backdrop-filter:blur(4px);pointer-events:auto;font-family:Inter,system-ui,sans-serif}
    .hb-perg{width:min(860px,94%);max-height:88%;display:flex;flex-direction:column;filter:drop-shadow(0 20px 40px rgba(0,0,0,.6))}
    .hb-rolo{height:18px;margin:0 -8px;border-radius:9px;background:linear-gradient(180deg,#8A6430,#D7B26A 40%,#7A5626)}
    .hb-corpo{flex:1;overflow:auto;background:linear-gradient(90deg,#E8D3A2,#FBF3DD 12%,#FBF3DD 88%,#E8D3A2);padding:16px 26px;color:#2A1A08}
    .hb-cab{display:flex;align-items:center;gap:10px}.hb-cab h3{flex:1;margin:0;font:700 24px "Cormorant Garamond",Georgia,serif}.hb-cab button{border:1px solid rgba(90,60,20,.35);background:rgba(255,250,235,.8);border-radius:999px;width:32px;height:32px;cursor:pointer;font-size:15px}
    .hb-texto{direction:rtl;text-align:right;font:500 34px/1.9 "SBL Hebrew","Ezra SIL","Times New Roman",serif;margin:10px 0 6px;color:#1a0f04}
    .hb-texto span{cursor:pointer;border-radius:6px;padding:0 3px}.hb-texto span:hover,.hb-texto span.a{background:rgba(201,150,60,.3)}
    .hb-pt{font:17px/1.5 "Cormorant Garamond",Georgia,serif;color:#4a3414;margin:0 0 12px}
    .hb-tab{width:100%;border-collapse:collapse;font-size:13px}.hb-tab td{padding:6px 8px;border-top:1px solid rgba(120,80,20,.2);vertical-align:top}.hb-tab td.h{direction:rtl;font:500 22px "Times New Roman",serif;white-space:nowrap}.hb-tab tr.a{background:rgba(201,150,60,.18)}.hb-tab small{color:#7a5a2e}
    .hb-fonte{font-size:11px;color:#7a5a2e;margin-top:10px}
  </style><div class="hb-perg"><div class="hb-rolo"></div><div class="hb-corpo">
    <div class="hb-cab"><h3>${esc(titulo)} · Hebraico (Códice de Leningrado)</h3><button type="button" class="hb-x" aria-label="Fechar">✕</button></div>
    ${ws ? `<div class="hb-texto">${ws.map((w, i) => `<span data-i="${i}">${esc(w[0])}</span>`).join(' ')}</div>
    <table class="hb-tab"><tbody>${ws.map((w, i) => { const l = dic.get(w[1]); return `<tr data-i="${i}"><td class="h">${esc(w[0])}</td><td><b>${esc(l ? l.t : '')}</b> ${l ? `<small>(${esc(l.w)})</small>` : ''}<br><small>${esc(w[1])}</small></td><td>${esc(l ? l.g : '—')}<br><small>${esc(morfologia(w[2]))}</small></td></tr>`; }).join('')}</tbody></table>` : '<p>Este versículo não está no Antigo Testamento hebraico.</p>'}
    <div class="hb-fonte">Texto: Open Scriptures Hebrew Bible (CC BY 4.0), sobre o Westminster Leningrad Codex (domínio público), transcrição do Códice de Leningrado (c. 1008 d.C.). Significados em inglês, como estão na fonte (STEPBible). A numeração de alguns versículos difere da Almeida (ex.: títulos dos Salmos).</div>
  </div><div class="hb-rolo"></div></div>`;
  (host || document.body).appendChild(raiz);
  raiz.addEventListener('click', (e) => { if (e.target === raiz || e.target.closest('.hb-x')) { raiz.remove(); return; } const s = e.target.closest('[data-i]'); if (s) { const i = s.dataset.i; raiz.querySelectorAll('[data-i]').forEach((x) => x.classList.toggle('a', x.dataset.i === i)); const tr = raiz.querySelector(`tr[data-i="${i}"]`); if (tr && s.tagName === 'SPAN') tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
  return raiz;
}
