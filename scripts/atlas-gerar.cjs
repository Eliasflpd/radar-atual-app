#!/usr/bin/env node
// NEXUS BÍBLICO — gera public/nexus/atlas-dados.json (Atlas Bíblico, 20/11/2026).
// Fontes abertas (baixadas no PC, fora do repositório):
//   • OpenBible.info, Bible Geocoding Data (CC BY 4.0): https://github.com/openbibleinfo/Bible-Geocoding-Data
//       data/ancient.jsonl (lugares bíblicos, identificação e versículos) + data/modern.jsonl (coordenadas)
//   • Natural Earth (domínio público): ne_10m_land, ne_10m_rivers_lake_centerlines, ne_10m_lakes (.geojson)
// Uso: node scripts/atlas-gerar.cjs <pasta com os arquivos>
const fs = require('fs'), path = require('path');
const D = process.argv[2];
if (!D) { console.error('informe a pasta com ancient.jsonl, modern.jsonl e os .geojson do Natural Earth'); process.exit(2); }
const ler = (f) => fs.readFileSync(path.join(D, f), 'utf8');
const CAIXA = { lon0: -12, lon1: 66, lat0: 8, lat1: 48 };

// nomes em português dos lugares mais citados (os demais ficam como no OpenBible)
const PT = { Jerusalem: 'Jerusalém', Egypt: 'Egito', Israel: 'Israel', Judah: 'Judá', Babylon: 'Babilônia', Samaria: 'Samaria', Moab: 'Moabe', Assyria: 'Assíria', Jordan: 'Jordão', 'Jordan River': 'Rio Jordão', Edom: 'Edom', Zion: 'Sião', Bethel: 'Betel', Hebron: 'Hebrom', Gilead: 'Gileade', Damascus: 'Damasco', Tyre: 'Tiro', Sidon: 'Sidom', Philistia: 'Filístia', Canaan: 'Canaã', Galilee: 'Galileia', 'Sea of Galilee': 'Mar da Galileia', Nazareth: 'Nazaré', Bethlehem: 'Belém', Capernaum: 'Cafarnaum', Jericho: 'Jericó', Shechem: 'Siquém', Gaza: 'Gaza', Ashdod: 'Asdode', Ammon: 'Amom', Lebanon: 'Líbano', Sinai: 'Sinai', 'Mount Sinai': 'Monte Sinai', Horeb: 'Horebe', Rome: 'Roma', Ephesus: 'Éfeso', Corinth: 'Corinto', Antioch: 'Antioquia', 'Antioch of Syria': 'Antioquia da Síria', 'Antioch of Pisidia': 'Antioquia da Pisídia', Athens: 'Atenas', Philippi: 'Filipos', Thessalonica: 'Tessalônica', Macedonia: 'Macedônia', Achaia: 'Acaia', Asia: 'Ásia', Galatia: 'Galácia', Cyprus: 'Chipre', Crete: 'Creta', Malta: 'Malta', Tarsus: 'Tarso', Caesarea: 'Cesareia', Joppa: 'Jope', Nineveh: 'Nínive', Ur: 'Ur', Haran: 'Harã', Persia: 'Pérsia', Media: 'Média', Susa: 'Susã', Euphrates: 'Eufrates', 'Euphrates River': 'Rio Eufrates', Tigris: 'Tigre', Nile: 'Nilo', 'Red Sea': 'Mar Vermelho', 'Dead Sea': 'Mar Morto', 'Salt Sea': 'Mar Salgado', 'Mediterranean Sea': 'Mar Mediterrâneo', 'Great Sea': 'Mar Grande', Arabia: 'Arábia', Syria: 'Síria', Aram: 'Arã', Shiloh: 'Siló', Gibeah: 'Gibeá', Mizpah: 'Mispá', Ramah: 'Ramá', Beersheba: 'Berseba', Gath: 'Gate', Ekron: 'Ecrom', Ashkelon: 'Ascalom', Bethany: 'Betânia', 'Mount of Olives': 'Monte das Oliveiras', Gethsemane: 'Getsêmani', Golgotha: 'Gólgota', Emmaus: 'Emaús', Patmos: 'Patmos', Smyrna: 'Esmirna', Pergamum: 'Pérgamo', Thyatira: 'Tiatira', Sardis: 'Sardes', Philadelphia: 'Filadélfia', Laodicea: 'Laodiceia', Colossae: 'Colossos', Troas: 'Trôade', Lystra: 'Listra', Derbe: 'Derbe', Iconium: 'Icônio', Berea: 'Bereia', Midian: 'Midiã', Goshen: 'Gósen', Kadesh: 'Cades', 'Kadesh-barnea': 'Cades-Barneia', Carmel: 'Carmelo', 'Mount Carmel': 'Monte Carmelo', Hermon: 'Hermom', Bashan: 'Basã', Sodom: 'Sodoma', Gomorrah: 'Gomorra', Eden: 'Éden', Ararat: 'Ararate', Megiddo: 'Megido', Jezreel: 'Jezreel', Dan: 'Dã', Ephraim: 'Efraim', Benjamin: 'Benjamim', Manasseh: 'Manassés', Zebulun: 'Zebulom', Naphtali: 'Naftali', Gad: 'Gade', Reuben: 'Rúben', Simeon: 'Simeão', Asher: 'Aser', Issachar: 'Issacar', Cush: 'Cuxe', Ethiopia: 'Etiópia', Tarshish: 'Társis', Tekoa: 'Tecoa', Anathoth: 'Anatote', Gibeon: 'Gibeom', Ai: 'Ai', Gilgal: 'Gilgal', Paran: 'Parã', Seir: 'Seir', Elam: 'Elão', Chaldea: 'Caldeia', Spain: 'Espanha', Italy: 'Itália', Judea: 'Judeia', Decapolis: 'Decápolis', Bethsaida: 'Betsaida', Chorazin: 'Corazim', Cana: 'Caná', Sychar: 'Sicar', Siloam: 'Siloé' };

// ── lugares ──────────────────────────────────────────────────────────────────
const modernos = new Map(ler('modern.jsonl').trim().split('\n').map((l) => JSON.parse(l)).map((m) => [m.id, m]));
const lugares = [];
let semCoord = 0;
for (const l of ler('ancient.jsonl').trim().split('\n')) {
  const a = JSON.parse(l);
  const ex = JSON.parse(a.extra || '{}');
  const assoc = (ex.associations || []).filter((x) => x.modern_id && modernos.has(x.modern_id) && modernos.get(x.modern_id).lonlat).sort((x, y) => (y.score || 0) - (x.score || 0))[0];
  if (!assoc) { semCoord++; continue; }
  const [lon, lat] = modernos.get(assoc.modern_id).lonlat.split(',').map(Number);
  if (!isFinite(lon) || !isFinite(lat)) { semCoord++; continue; }
  const versos = [...new Set((a.verses || []).map((v) => { const s = String(v.sort || ''); return s.length === 8 ? (+s.slice(0, 2)) * 1e6 + (+s.slice(2, 5)) * 1e3 + (+s.slice(5)) : null; }).filter(Boolean))].sort((x, y) => x - y);
  if (!versos.length) continue;
  const base = String(a.friendly_id).replace(/ [0-9]+$/, '');   // 'Babylon 1' -> 'Babylon' (o número só desambigua no OpenBible)
  lugares.push({ id: a.id, nome: PT[base] || base, en: a.friendly_id, tipo: (a.types || [])[0] || '', lon: +lon.toFixed(4), lat: +lat.toFixed(4), conf: assoc.score || 0, identificacao: assoc.name || '', versos });
}

// ── base do mapa: o MUNDO inteiro (Atlas infinito), com alta resolução na região bíblica ─────────────
const DETALHE = { lon0: 22, lon1: 54, lat0: 20, lat1: 42 };
const naRegiao = (p) => p[0] >= DETALHE.lon0 && p[0] <= DETALHE.lon1 && p[1] >= DETALHE.lat0 && p[1] <= DETALHE.lat1;
function simplificar(pts, tol) {   // Douglas-Peucker (iterativo)
  if (pts.length < 3) return pts.slice();
  const manter = new Uint8Array(pts.length); manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop(); let max = 0, im = -1;
    const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, L = dx * dx + dy * dy || 1e-12;
    for (let i = a + 1; i < b; i++) { let t = ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / L; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(pts[i][0] - ax - t * dx, pts[i][1] - ay - t * dy); if (d > max) { max = d; im = i; } }
    if (max > tol && im > 0) { manter[im] = 1; pilha.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => manter[i]);
}
// simplifica por trechos: fino dentro da região bíblica, grosso fora
function simplificarVar(pts, fino, grosso) {
  const out = []; let trecho = [pts[0]], dentro = naRegiao(pts[0]);
  for (let i = 1; i < pts.length; i++) { const d = naRegiao(pts[i]); trecho.push(pts[i]); if (d !== dentro || i === pts.length - 1) { const s2 = simplificar(trecho, dentro ? fino : grosso); out.push(...(out.length ? s2.slice(1) : s2)); trecho = [pts[i]]; dentro = d; } }
  return out;
}
const r3 = (p) => [+p[0].toFixed(3), +p[1].toFixed(3)];
function poligonos(geo, fino, grosso, filtro) {
  const out = [];
  for (const f of geo.features) {
    const g = f.geometry; if (!g) continue;
    const polis = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poli of polis) { const anel = poli[0]; if (!anel.some((p) => p[1] > -58)) continue; if (filtro && !filtro(anel)) continue; const s2 = simplificarVar(anel, fino, grosso).map(r3); if (s2.length >= 4) out.push(s2); }
  }
  return out;
}
function linhas(geo, fino, grosso, filtro) {
  const out = [];
  for (const f of geo.features) {
    const g = f.geometry; if (!g) continue;
    const ls = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
    for (const ln of ls) { if (filtro && !filtro(ln, f.properties || {})) continue; const s2 = simplificarVar(ln, fino, grosso).map(r3); if (s2.length >= 2) out.push({ nome: f.properties && (f.properties.name_pt || f.properties.name), pts: s2 }); }
  }
  return out;
}
const terra = poligonos(JSON.parse(ler('ne_10m_land.geojson')), 0.006, 0.09, (a) => a.length > 6);
const rios = linhas(JSON.parse(ler('ne_10m_rivers_lake_centerlines.geojson')), 0.004, 0.06, (ln, pr) => ln.some(naRegiao) || (pr.scalerank != null && pr.scalerank <= 4));
const lagos = poligonos(JSON.parse(ler('ne_10m_lakes.geojson')), 0.003, 0.06, (a) => a.some(naRegiao) || a.length > 120);

const saida = {
  gerado_em: new Date().toISOString().slice(0, 10), caixa: CAIXA,
  creditos: ['Lugares, identificações e versículos: OpenBible.info, Bible Geocoding Data (CC BY 4.0)', 'Contornos de terra, rios e lagos: Natural Earth 1:10m (domínio público)'],
  lugares, mundo: true, detalhe: DETALHE,
  terra, rios, lagos,
};
const destino = path.join(__dirname, '..', 'public', 'nexus', 'atlas-dados.json');
fs.writeFileSync(destino, JSON.stringify(saida));
console.log(`lugares com coordenadas: ${saida.lugares.length} (sem coordenada: ${semCoord}) · terra ${terra.length} · rios ${rios.length} · lagos ${lagos.length} · ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
