#!/usr/bin/env node
// NEXUS BÍBLICO — gera public/nexus/atlas-dados.json (Atlas Bíblico, 20/11/2026).
// Fontes abertas (baixadas no PC, fora do repositório):
//   • OpenBible.info, Bible Geocoding Data (CC BY 4.0): https://github.com/openbibleinfo/Bible-Geocoding-Data
//       data/ancient.jsonl (lugares bíblicos, identificação e versículos) + data/modern.jsonl (coordenadas)
//   • Natural Earth (domínio público): ne_50m_land, ne_50m_rivers_lake_centerlines, ne_10m_lakes (.geojson)
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

// ── base do mapa (recortada na região bíblica e simplificada) ─────────────────────
function simplificar(pts, tol) {   // Douglas-Peucker
  if (pts.length < 3) return pts;
  const d = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-12; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  let max = 0, i0 = 0; for (let i = 1; i < pts.length - 1; i++) { const x = d(pts[i], pts[0], pts[pts.length - 1]); if (x > max) { max = x; i0 = i; } }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return simplificar(pts.slice(0, i0 + 1), tol).slice(0, -1).concat(simplificar(pts.slice(i0), tol));
}
const dentro = (p) => p[0] >= CAIXA.lon0 - 2 && p[0] <= CAIXA.lon1 + 2 && p[1] >= CAIXA.lat0 - 2 && p[1] <= CAIXA.lat1 + 2;
const prender = (p) => [Math.max(CAIXA.lon0, Math.min(CAIXA.lon1, p[0])), Math.max(CAIXA.lat0, Math.min(CAIXA.lat1, p[1]))];
const r2 = (p) => [+p[0].toFixed(3), +p[1].toFixed(3)];
function aneis(geo, tipoAlvo) {
  const out = [];
  for (const f of geo.features) {
    const g = f.geometry; if (!g) continue;
    const polis = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poli of polis) { const anel = poli[0]; if (!anel.some(dentro)) continue; const s = simplificar(anel.map(prender), 0.04).map(r2); if (s.length >= 4) out.push(s); }
    if (tipoAlvo === 'linha') {
      const linhas = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      for (const ln of linhas) { const pts = ln.filter(dentro); if (pts.length < 2) continue; out.push({ nome: f.properties && (f.properties.name_pt || f.properties.name), pts: simplificar(pts, 0.03).map(r2) }); }
    }
  }
  return out;
}
const terra = aneis(JSON.parse(ler('ne_50m_land.geojson')));
const rios = aneis(JSON.parse(ler('ne_50m_rivers_lake_centerlines.geojson')), 'linha').filter((x) => x.pts);
const lagos = aneis(JSON.parse(ler('ne_10m_lakes.geojson'))).filter((a) => { const xs = a.map((p) => p[0]), ys = a.map((p) => p[1]); return Math.max(...xs) > 25 && Math.min(...xs) < 50 && Math.max(...ys) > 25 && Math.min(...ys) < 42; });

const saida = {
  gerado_em: new Date().toISOString().slice(0, 10), caixa: CAIXA,
  creditos: ['Lugares, identificações e versículos: OpenBible.info, Bible Geocoding Data (CC BY 4.0)', 'Contornos de terra, rios e lagos: Natural Earth (domínio público)'],
  lugares: lugares.filter((l) => l.lon >= CAIXA.lon0 && l.lon <= CAIXA.lon1 && l.lat >= CAIXA.lat0 && l.lat <= CAIXA.lat1),
  terra, rios, lagos,
};
const destino = path.join(__dirname, '..', 'public', 'nexus', 'atlas-dados.json');
fs.writeFileSync(destino, JSON.stringify(saida));
console.log(`lugares com coordenadas: ${saida.lugares.length} (sem coordenada: ${semCoord}) · terra ${terra.length} · rios ${rios.length} · lagos ${lagos.length} · ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
