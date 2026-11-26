// gera LODs leves de um modelo Poly Haven: folhas simplificadas e raleadas (as que ficam crescem), galhos e tronco simplificados, texturas webp
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, dedup, flatten, join, textureCompress, compactPrimitive, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer'; import sharp from 'sharp';
const [src, out, cfgS] = process.argv.slice(2); const cfg = JSON.parse(cfgS);
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(src);
await doc.transform(dedup(), flatten(), join({ keepMeshes: true, keepNamed: false }), weld());
const tipo = (m) => { const n = (m?.getName() || '').toLowerCase(); if (/leaves|leaf|twig|petal|flower/.test(n) || (m && m.getAlphaMode() !== 'OPAQUE' && cfg.planta !== true)) return 'folha'; if (/branch/.test(n)) return 'galho'; return cfg.planta ? 'folha' : 'tronco'; };
function rarear(p, keep, cresce, seed = 1) {
  const idxA = p.getIndices(), idx = idxA.getArray(), pos = p.getAttribute('POSITION').getArray(), n = pos.length / 3; const par = new Int32Array(n).map((_, i) => i);
  const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let i = 0; i < idx.length; i += 3) { const a = f(idx[i]); par[f(idx[i + 1])] = a; par[f(idx[i + 2])] = a; }
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const fica = new Map();
  const novo = []; const cent = new Map();
  for (let i = 0; i < idx.length; i += 3) { const r = f(idx[i]); if (!fica.has(r)) fica.set(r, rnd() < keep); if (fica.get(r)) novo.push(idx[i], idx[i + 1], idx[i + 2]); }
  // centro de cada folha que ficou
  const soma = new Map(); for (let v = 0; v < n; v++) { const r = f(v); if (!fica.get(r)) continue; const c = soma.get(r) || [0, 0, 0, 0]; c[0] += pos[v * 3]; c[1] += pos[v * 3 + 1]; c[2] += pos[v * 3 + 2]; c[3]++; soma.set(r, c); }
  for (let v = 0; v < n; v++) { const r = f(v); if (!fica.get(r)) continue; const c = soma.get(r); for (let k = 0; k < 3; k++) { const m = c[k] / c[3]; pos[v * 3 + k] = m + (pos[v * 3 + k] - m) * cresce; } }
  p.getAttribute('POSITION').setArray(pos); idxA.setArray(new Uint32Array(novo));
}
const root = doc.getRoot(); let tot = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const t = tipo(p.getMaterial()), c = cfg[t]; if (!c) continue;
  const antes = p.getIndices().getCount() / 3;
  if (c.simp && c.simp < 1) { const d2 = new (doc.constructor)(); }
  if (c.keep && c.keep < 1) rarear(p, c.keep, c.cresce || 1 / Math.sqrt(c.keep));
}
// simplificação por tipo (cada um no seu primitivo)
for (const t of ['folha', 'galho', 'tronco']) { const c = cfg[t]; if (!c || !c.simp || c.simp >= 1) continue;
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => tipo(p.getMaterial()) === t);
  for (const p of prims) { const idx = p.getIndices().getArray(), pos = p.getAttribute('POSITION').getArray(); const alvo = Math.floor(idx.length * c.simp / 3) * 3;
    const [res] = MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(pos), 3, alvo, c.erro || 0.02, c.borda ? ['LockBorder'] : []); p.getIndices().setArray(new Uint32Array(res)); } }
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { tot += p.getIndices().getCount() / 3; console.log('  ', tipo(p.getMaterial()), p.getMaterial()?.getName(), p.getIndices().getCount() / 3); }
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) compactPrimitive(p);
await doc.transform(prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.tex || 512, cfg.tex || 512], quality: 82 }));
await io.write(out, doc); console.log('TOTAL tris', tot, '->', out);
