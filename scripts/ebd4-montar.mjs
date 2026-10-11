// EBD Adultos 4º tri 2026 — monta as páginas novas de cada lição a partir de JSON limpo.
//   node scripts/ebd4-montar.mjs <subsidio|professor|devocional> <pasta-dos-json>
// Gera public/ebd/adulto4/html/<tipo>-NN.html no mesmo molde das lições (texto grande, tela cheia,
// hifenização, versículos tocáveis .bref). Só mexe nos arquivos do próprio tipo.
//   subsidio   = Revista Cristão Alerta (blocos extraídos de cris-blocos.json)
//   professor  = Material do Professor (Revista Lições Bíblicas – Professor)
//   devocional = Comunhão – Leitura Diária (7 devocionais por lição)
import fs from 'fs';
import path from 'path';

const [,, tipo, pastaJson] = process.argv;
if (!['subsidio', 'professor', 'devocional'].includes(tipo) || !pastaJson) { console.error('uso: node scripts/ebd4-montar.mjs <subsidio|professor|devocional> <pasta-json>'); process.exit(1); }
const DEST = path.resolve(import.meta.dirname, '../public/ebd/adulto4/html');
const molde = fs.readFileSync(DEST + '/licao-01.html', 'utf8');
const TELA_CHEIA = molde.slice(molde.indexOf('/*tela-cheia-2026-10-11b*/'), molde.indexOf('</style>'));
const ROD = molde.slice(molde.search(/<script>\s*document\.addEventListener\('touchstart'/));

// ───────── texto → HTML seguro (só <b> e <i>) + versículos tocáveis ─────────
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/<(\/?)([bi])>/g, '\u0001$1$2\u0002').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u0001(\/?)([bi])\u0002/g, '<$1$2>');
const LIVRO = '(?:[123]\\s?)?(?:Gn|Êx|Ex|Lv|Nm|Dt|Js|Jz|Rt|Sm|Rs|Cr|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mc|Lc|Jo|At|Rm|Co|Gl|Ef|Fp|Cl|Ts|Tm|Tt|Fm|Hb|Tg|Pe|Jd|Ap)';
const VERS = '\\d{1,3}(?:\\s?[-–]\\s?\\d{1,3})?(?:\\s?,\\s?\\d{1,3}(?:\\s?[-–]\\s?\\d{1,3})?)*';
const REF = new RegExp(`(?<![A-Za-zÀ-ÿ0-9])(${LIVRO})\\s(\\d{1,3})[.:](${VERS})((?:;\\s?(?:${LIVRO}\\s)?\\d{1,3}[.:]${VERS})*)`, 'g');
const MAPA_OK = new Set(['Gn','Êx','Ex','Lv','Nm','Dt','Js','Jz','Rt','1Sm','2Sm','1Rs','2Rs','1Cr','2Cr','Ed','Ne','Et','Jó','Sl','Pv','Ec','Ct','Is','Jr','Lm','Ez','Dn','Os','Jl','Am','Ob','Jn','Mq','Na','Hc','Sf','Ag','Zc','Ml','Mt','Mc','Lc','Jo','At','Rm','1Co','2Co','Gl','Ef','Fp','Cl','1Ts','2Ts','1Tm','2Tm','Tt','Fm','Hb','Tg','1Pe','2Pe','1Jo','2Jo','3Jo','Jd','Ap']);
function ligarRefs(html) {
  return html.split(/(<[^>]+>)/).map(seg => {
    if (seg.startsWith('<')) return seg;
    return seg.replace(REF, (m, livro) => {
      const lv = livro.replace(/\s/g, ''); if (!MAPA_OK.has(lv === 'Ex' ? 'Êx' : lv) && !MAPA_OK.has(lv)) return m;
      const dr = m.replace(/(\d)\s?:\s?(\d)/g, '$1.$2').replace(/\s*([-–])\s*/g, '-').replace(/\s*,\s*/g, ',').replace(/;\s*/g, '; ');
      return `<span class="bref" data-ref="${dr}">${m}</span>`;
    });
  }).join('');
}
// arruma espaços soltos da extração: "( Dt 1:8 , NAA)" → "(Dt 1:8, NAA)"; "1.19 -22" → "1.19-22"
const arruma = s => String(s ?? '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+([,;:.!?])(?=\s|$|<)/g, '$1').replace(/(\d)\s+[-–]\s*(\d)/g, '$1-$2').replace(/(\d)\s*[-–]\s+(\d)/g, '$1-$2').replace(/\s{2,}/g, ' ').trim();
const T = s => ligarRefs(esc(arruma(s)));

// ───────── CSS-base (mesma tipografia das lições do 4º tri) + paleta por tipo ─────────
const BASE = `body{margin:0;padding:12px 11px 56px;background:#fff;font-family:Georgia,serif;font-size:21px;line-height:1.75;color:#1a1a1a;text-align:justify}
p{margin:0 0 12px}
strong,b{font-weight:900}
ul,ol{margin:4px 0 14px 0;padding:0 0 0 20px}
li{margin-bottom:8px;text-align:justify}
.titulo{text-align:center;font-size:25px;font-weight:900;line-height:1.3;margin:10px 0 2px;padding:0 4px}
.data{text-align:center;font-size:16px;font-weight:600;letter-spacing:.5px;margin-bottom:18px}
.subpoint{text-align:justify;margin-bottom:12px}
.bref{font-weight:700;text-decoration:underline dotted;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.faixa{display:block;font-size:13px;font-weight:900;letter-spacing:2.5px;text-transform:uppercase;text-align:center}
`;
const PALETA = {
  // Revista Lições Bíblicas – Professor (azul-marinho, azul, vinho e creme da revista)
  professor: `:root{--t:#0c2055;--a:#1458ad;--v:#962030;--cr:#f9f5da;--pb:#e8effa;--mu:#5b6b92}
.titulo{color:var(--t)}.data{color:var(--mu)}.bref{color:var(--a)}
.sec-head{text-align:center;font-size:17px;font-weight:900;color:#fff;background:var(--t);letter-spacing:2px;margin:26px 0 12px;padding:9px 10px;border-radius:6px}
.sec-head.vinho{background:var(--v)}
.chave{display:inline-block;background:var(--pb);color:var(--t);border:1.5px solid var(--a);border-radius:999px;padding:2px 14px;font-size:15px;font-weight:900;letter-spacing:1px;margin:0 0 12px}
.hinos{background:var(--a);color:#fff;border-radius:8px;padding:10px 14px;margin:6px 0 12px;font-size:18px;line-height:1.5;text-align:left}
.hinos b{color:#fff}
.roman-head{font-weight:900;color:var(--t);font-size:20px;margin:22px 0 6px;padding:8px 12px;background:var(--pb);border-left:4px solid var(--a);border-radius:0 6px 6px 0;text-align:left}
.sinopse{background:var(--pb);border:1.5px solid var(--a);border-radius:8px;padding:0 14px 12px;margin:14px 0;overflow:hidden;color:var(--t)}
.sinopse .faixa{background:var(--a);color:#fff;margin:0 -14px 10px;padding:6px 14px}
.aux{border:1.5px solid var(--t);border-radius:8px;margin:16px 0;overflow:hidden}
.aux .cab{background:var(--t);color:#fff;padding:8px 14px;text-align:center}
.aux .cab small{display:block;font-size:12px;font-weight:900;letter-spacing:2.5px;color:#f9f5da}
.aux .cab strong{display:block;font-size:19px;line-height:1.3}
.aux .corpo{padding:12px 14px 2px;background:#f6f8fd}
.aux .fonte{font-size:15px;color:var(--mu);text-align:right;margin:-4px 0 10px}
.qa{margin:0 0 14px}.qa .p{font-weight:900;color:var(--t);margin:0 0 4px}
.qa .r{margin:0;padding-left:12px;border-left:4px solid var(--a)}
.leitura{background:var(--cr);border-radius:8px;padding:10px 14px;margin:0 0 12px}
.leitura b{color:var(--v)}`,
  // Comunhão – Leitura Diária (laranja → terracota da revista)
  devocional: `:root{--l:#d08030;--t:#a05030;--m:#b06030;--cr:#fbf0e0;--mu:#8a6a4a}
.titulo{color:var(--t)}.data{color:var(--mu)}.bref{color:#a04a1e}
.sec-head{text-align:center;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(90deg,var(--l),var(--m));letter-spacing:2px;margin:26px 0 12px;padding:9px 10px;border-radius:6px}
.dia{margin:34px 0 8px}
.dia .cab{display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,var(--l),var(--t));color:#fff;border-radius:10px;padding:8px 14px}
.dia .cab .n{font-size:22px;font-weight:900;line-height:1.1;flex:0 0 auto}
.dia .cab .d{font-size:16px;font-weight:700;line-height:1.3;text-align:left}
.dia .cab .d small{display:block;font-size:13px;font-weight:600;opacity:.92;letter-spacing:.5px}
.vers{background:var(--cr);border-left:5px solid var(--l);border-radius:0 8px 8px 0;padding:10px 14px;margin:14px 0 10px;font-style:italic;color:#5a3a1a}
.vers .ref{display:block;font-style:normal;font-weight:900;font-size:15px;color:var(--t);text-align:right;margin-top:4px}
.dia h3{font-size:21px;font-weight:900;color:var(--t);text-align:center;text-transform:uppercase;letter-spacing:.5px;line-height:1.3;margin:16px 4px 10px}`,
  // Revista Cristão Alerta (azul-marinho e azul da capa, caixas turquesa e laranja da abertura)
  subsidio: `:root{--n:#102040;--b:#306090;--tq:#30a0c0;--tq2:#3090a0;--lj:#f08020;--am:#ffe14d;--mu:#5b6b92}
.titulo{color:var(--n)}.data{color:var(--mu)}.bref{color:var(--b)}
.abre{display:flex;flex-direction:column;gap:10px;margin:8px 0 14px}
.cx{border-radius:16px;padding:12px 16px;color:#fff;text-align:center;line-height:1.5}
.cx .lbl{display:block;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.cx.leit{background:linear-gradient(160deg,#30b0d0,#3090a0)}.cx.leit .lbl{color:var(--am)}
.cx.leit .ref{font-size:22px;font-weight:700}
.cx.vers{background:var(--lj);font-size:19px}.cx.vers .lbl{background:var(--n);color:#fff;margin:-12px -16px 8px;padding:6px;border-radius:16px 16px 0 0}
.cx .bref{color:#fff}
.cx.pens{background:linear-gradient(160deg,#30b0d0,#3090a0);font-size:19px}.cx.pens .lbl{color:var(--am);font-size:20px;letter-spacing:.5px;text-transform:none;border-bottom:1px solid rgba(255,255,255,.55);padding-bottom:4px}
.sec-head{text-align:center;font-size:19px;font-weight:900;color:#fff;background:var(--b);letter-spacing:1.5px;margin:26px 0 12px;padding:8px 10px;border-radius:4px}
.roman-head{font-weight:900;color:var(--n);font-size:20px;margin:24px 0 8px;padding:8px 12px;background:#e7eff7;border-left:5px solid var(--b);border-radius:0 6px 6px 0;text-align:left}
.extra-head{font-weight:900;color:#fff;background:var(--lj);font-size:18px;margin:22px 0 8px;padding:7px 12px;border-radius:6px;text-align:left}
.h2{font-weight:900;color:var(--n);font-size:19px;margin:18px 0 6px;text-align:left}
.h3{font-weight:900;color:var(--b);font-size:20px;margin:14px 0 6px;text-align:left}
.aviso{font-size:14px;line-height:1.5;color:#7a8499;text-align:center;border-top:1px solid #dde3ee;margin-top:30px;padding-top:12px}`,
};

const pagina = (corpo, titulo) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>${esc(titulo)}</title><style>${BASE}${PALETA[tipo]}${TELA_CHEIA}</style></head><body>${corpo}${ROD}`;
const nn = n => String(n).padStart(2, '0');
const lerJson = n => JSON.parse(fs.readFileSync(path.join(pastaJson, `${nn(n)}.json`), 'utf8'));
// título e data da lição (os mesmos da página da lição no RADAR)
function infoLicao(n) {
  const h = fs.readFileSync(`${DEST}/licao-${nn(n)}.html`, 'utf8');
  return { titulo: (h.match(/class="titulo">LIÇÃO \d+\s*[-–]\s*([^<]*)</) || [])[1] || '', data: (h.match(/class="data">([^<]*)</) || [])[1] || '' };
}
const caixa = s => (s || '').toString();

// ───────── montadores por tipo ─────────
function montarProfessor(j) {
  const L = infoLicao(j.n); const o = [];
  o.push(`<p class="titulo">MATERIAL DO PROFESSOR<br>LIÇÃO ${nn(j.n)}</p><p class="data">${esc(L.titulo)}</p>`);
  if (j.palavraChave) o.push(`<p style="text-align:center"><span class="chave">Palavra-chave: ${esc(j.palavraChave)}</span></p>`);
  if (j.hinos) o.push(`<div class="hinos"><b>Hinos sugeridos:</b> ${esc(j.hinos)}</div>`);
  if (j.plano?.length) { o.push('<p class="sec-head">PLANO DE AULA</p>'); for (const s of j.plano) { o.push(`<p class="roman-head">${esc(s.titulo)}</p>`); for (const p of s.paras || []) o.push(`<p class="subpoint">${T(p)}</p>`); } }
  if (j.sinopses?.length) { o.push('<p class="sec-head">SINOPSES DOS TÓPICOS</p>'); for (const s of j.sinopses) o.push(`<div class="sinopse"><span class="faixa">${esc(s.rotulo)}</span>${T(s.texto)}</div>`); }
  if (j.auxilios?.length) { o.push('<p class="sec-head">AUXÍLIOS PARA A AULA</p>'); for (const a of j.auxilios) { o.push(`<div class="aux"><div class="cab"><small>${esc(a.rotulo)}</small>${a.titulo ? `<strong>${esc(a.titulo)}</strong>` : ''}</div><div class="corpo">${(a.paras || []).map(p => `<p class="subpoint">${T(p)}</p>`).join('')}${a.fonte ? `<p class="fonte">${T(a.fonte)}</p>` : ''}</div></div>`); } }
  if (j.extras?.length) for (const e of j.extras) { o.push(`<p class="sec-head">${esc(e.rotulo || e.titulo || 'COMPLEMENTO')}</p>`); for (const p of e.paras || (e.texto ? [e.texto] : [])) o.push(`<p class="subpoint">${T(p)}</p>`); }
  if (j.revisao?.length) { o.push('<p class="sec-head">REVISANDO O CONTEÚDO — RESPOSTAS</p>'); j.revisao.forEach((q, i) => o.push(`<div class="qa"><p class="p">${i + 1}. ${T(q.p)}</p><p class="r">${T(q.r)}</p></div>`)); }
  if (j.leituras?.length) { o.push('<p class="sec-head vinho">LEITURAS PARA APROFUNDAR</p>'); for (const l of j.leituras) o.push(`<div class="leitura"><p style="margin:0 0 4px"><b>${esc(l.titulo)}</b></p><p style="margin:0">${T(l.texto)}</p></div>`); }
  o.push(`<p class="aviso">Material de apoio ao professor — Revista Lições Bíblicas Adultos (Professor), 4º trim. 2026, CPAD. Use como apoio e adquira a revista original.</p>`);
  return pagina(o.join(''), `Material do Professor — Lição ${j.n}`);
}
const MESES = { janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
const SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function diaSemana(data) { const m = String(data).match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i); if (!m) return ''; return SEMANA[new Date(+m[3], MESES[m[2].toLowerCase()], +m[1]).getDay()]; }
function montarDevocional(j) {
  const L = infoLicao(j.n); const o = [];
  o.push(`<p class="titulo">DEVOCIONAL<br>LIÇÃO ${nn(j.n)}</p><p class="data">${esc(L.titulo)}<br>Comunhão — Leitura Diária · 4º trimestre 2026</p>`);
  j.dias.forEach((d, i) => {
    o.push(`<div class="dia"><div class="cab"><span class="n">${i + 1}</span><span class="d">${esc(diaSemana(d.data))}<small>${esc(d.data)}</small></span></div>`);
    o.push(`<div class="vers">“${T(d.versiculo)}” <span class="ref">${T(d.ref)}</span></div><h3>${esc(d.titulo)}</h3>`);
    for (const p of d.paras) o.push(`<p class="subpoint">${T(p)}</p>`);
    o.push('</div>');
  });
  o.push(`<p class="aviso">Devocional “Comunhão — Leitura Diária”, O Deus da Aliança, Silas Daniel, 4º trim. 2026, CPAD. Use como apoio e adquira a revista original.</p>`);
  return pagina(o.join(''), `Devocional — Lição ${j.n}`);
}
function montarSubsidio(j) {
  const o = [];
  o.push(`<p class="titulo">LIÇÃO ${nn(j.n)} - ${esc(j.titulo.toUpperCase())}</p><p class="data">Revista Cristão Alerta · 4º Trimestre 2026 — Subsídios</p>`);
  o.push(`<div class="abre"><div class="cx leit"><span class="lbl">Leitura bíblica</span><span class="ref">${T(j.leitura)}</span></div><div class="cx vers"><span class="lbl">Versículo chave</span>${T(j.versiculo)}</div><div class="cx pens"><span class="lbl">Pensamento Cristão</span>${T(j.pensamento)}</div></div>`);
  let lista = false; const fechaLista = () => { if (lista) { o.push('</ul>'); lista = false; } };
  for (const b of j.blocos) {
    if (b.t === 'item') { if (!lista) { o.push('<ul>'); lista = true; } o.push(`<li>${T(b.texto)}</li>`); continue; }
    fechaLista();
    if (b.t === 'h') {
      if (b.nivel === 1) {
        if (/^[IVX]+\.\s/.test(b.texto)) o.push(`<p class="roman-head">${esc(b.texto.replace(/^([IVX]+)\.\s*/, '$1 — '))}</p>`);
        else if (/^(INTRODUÇÃO|CONCLUSÃO)/i.test(b.texto)) o.push(`<p class="sec-head">${esc(b.texto)}</p>`);
        else o.push(`<p class="extra-head">${esc(b.texto)}</p>`);
      } else o.push(`<p class="${b.nivel === 2 ? 'h2' : 'h3'}">${esc(b.texto)}</p>`);
    } else o.push(`<p class="subpoint">${T(b.texto)}</p>`);
  }
  fechaLista();
  o.push(`<p class="aviso">Subsídios da Revista Cristão Alerta, 4º trimestre de 2026 (www.cristaoalerta.com.br). Use como apoio e adquira a revista original.</p>`);
  return pagina(o.join(''), `Cristão Alerta — Lição ${j.n}`);
}

let n0 = 0;
for (let n = 1; n <= 13; n++) {
  const arq = path.join(pastaJson, `${nn(n)}.json`); if (!fs.existsSync(arq)) { console.log(`(sem ${nn(n)}.json — pulado)`); continue; }
  const j = lerJson(n); const html = tipo === 'professor' ? montarProfessor(j) : tipo === 'devocional' ? montarDevocional(j) : montarSubsidio(j);
  fs.writeFileSync(`${DEST}/${tipo}-${nn(n)}.html`, html, 'utf8'); n0++; console.log(`${tipo}-${nn(n)}.html  ${(html.length / 1024).toFixed(1)} KB`);
}
console.log(`${n0} páginas geradas em ${DEST}`);
