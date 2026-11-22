// JERUSALÉM NO ANO 30 d.C. — relevo e construções do mundo andável do NEXUS.
// Eixos: x para LESTE, z para o SUL (o norte é -z). Metros. Altura 0 = esplanada do Templo (~740 m acima do mar).
// FONTES (resumo): Josefo, Guerra 5.136–247 e Antiguidades 15.380–425; Mishná, Middot; L. Ritmeyer, The Quest (2006);
// maquete Holyland (Museu de Israel); H. Geva (Primeira Muralha). O QUE É CERTO: os muros de arrimo da esplanada
// (oeste ~485 m, leste ~470 m, norte ~315 m, sul ~280 m), o vale do Cedrom a leste, o Tiropeon a oeste, a Cidade de Davi
// na crista ao sul, a colina ocidental mais alta (Cidade Alta), o palácio de Herodes com três torres a oeste, a Antônia
// no canto noroeste, o tanque de Siloé ao sul. O QUE É RECONSTRUÇÃO: o traçado exato da Segunda Muralha, a planta e a
// altura do Santuário e dos pátios (Josefo e a Mishná divergem), a forma das casas e a densidade das ruas.
// Medidas do relevo arredondadas a partir das altitudes atuais conhecidas (esplanada 740, Cedrom 680→640, Siloé ~630,
// Cidade Alta ~770, Monte das Oliveiras 818, vale de Hinom ~610 no encontro com o Cedrom).

const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const G = (x, z, cx, cz, r) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
// distância de (x,z) a uma linha quebrada; devolve [distância, posição 0..1 ao longo dela]
function distLinha(x, z, P) {
  let best = 1e9, u = 0, acc = 0, tot = 0; const seg = [];
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); tot += l; }
  for (let i = 0; i < P.length - 1; i++) { const ax = P[i][0], az = P[i][1], bx = P[i + 1][0], bz = P[i + 1][1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) { best = d; u = (acc + seg[i] * t) / tot; } acc += seg[i]; }
  return [best, u];
}
// vales: linha central, altura do fundo no começo e no fim, largura
const VALES = [
  { P: [[330, -1300], [310, -600], [295, -200], [285, 200], [262, 600], [250, 1060], [330, 1700], [500, 2300]], f0: -40, f1: -175, w: 260 },   // Cedrom
  { P: [[-120, -900], [-170, -500], [-235, -120], [-215, 300], [-150, 700], [-60, 900], [200, 1030]], f0: -14, f1: -112, w: 130 },           // Tiropeon (até Siloé)
  { P: [[-1150, -500], [-1080, 200], [-950, 700], [-700, 960], [-300, 1040], [240, 1060]], f0: -8, f1: -130, w: 210 },                        // Hinom
];
export const MURO = { x0: -150, x1: 150, z0: -242, z1: 242 };   // esplanada do Templo (retângulo aproximado)
export function hJer(x, z) {
  // colinas: Cidade Alta (oeste), Bezeta (norte), Monte das Oliveiras (leste), Monte Escopo ao norte das Oliveiras
  let h = 26 * G(x, z, -640, 140, 520) + 18 * G(x, z, -520, -420, 560) + 12 * G(x, z, 60, -700, 520)
    + 82 * G(x, z, 1120, -60, 620) + 70 * G(x, z, 1150, -1100, 700) - 0.05 * Math.max(0, z - 300) + 4 * G(x, z, 0, -60, 260);
  // a crista estreita da Cidade de Davi desce para o sul
  h -= 70 * ss(z, 250, 950) * G(x, 0, 30, 0, 260);
  for (const v of VALES) { const [d, u] = distLinha(x, z, v.P); const fundo = v.f0 + (v.f1 - v.f0) * u; const k = ss(d, 0, v.w); h = fundo + (Math.max(h, fundo) - fundo) * (0.15 * k + 0.85 * k * k); }
  // ao longe, morros da Judeia fechando o horizonte
  const r = Math.hypot(x, z); h += Math.max(0, r - 1700) * 0.08 * (0.7 + 0.3 * Math.sin(Math.atan2(z, x) * 4));
  // a esplanada é plana (muros de arrimo); a Antônia sobre a rocha a noroeste
  const dentro = x > MURO.x0 && x < MURO.x1 && z > MURO.z0 && z < MURO.z1; if (dentro) return 0;
  if (x > -150 && x < -40 && z > -300 && z < -242) return 6;
  return h;
}

// TEXTURAS desenhadas no próprio navegador (até chegarem as do ChatGPT): blocos herodianos com moldura, pedra de casa, lajes
function texCanvas(THREE, w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const rndS = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
function blocosHerodianos(THREE) {
  const r = rndS(11); return texCanvas(THREE, 1024, 1024, (g, W, H) => {
    g.fillStyle = '#d2cab6'; g.fillRect(0, 0, W, H); const fila = 64;
    for (let y = 0; y < H; y += fila) { let x = -r() * 300; while (x < W) { const bw = 140 + r() * 260, tom = 180 + r() * 40;
      g.fillStyle = `rgb(${tom + 14},${tom + 6},${tom - 14})`; g.fillRect(x + 2, y + 2, bw - 4, fila - 4);   // moldura rebaixada
      g.fillStyle = `rgb(${tom + 24},${tom + 16},${tom - 4})`; g.fillRect(x + 12, y + 11, bw - 24, fila - 22);   // face central saliente
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,70,40' : '255,245,220'},${0.05 + r() * 0.08})`; g.fillRect(x + r() * bw, y + r() * fila, 2 + r() * 8, 1 + r() * 4); }
      g.fillStyle = 'rgba(60,45,25,.55)'; g.fillRect(x, y, 2, fila); x += bw; }
      g.fillStyle = 'rgba(60,45,25,.5)'; g.fillRect(0, y, W, 2); }
    // manchas de tempo
    for (let k = 0; k < 40; k++) { const gr = g.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 60 + r() * 160); gr.addColorStop(0, 'rgba(120,100,70,.12)'); gr.addColorStop(1, 'rgba(120,100,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  });
}
function pedraCasa(THREE) {
  const r = rndS(5); return texCanvas(THREE, 512, 512, (g, W, H) => {
    g.fillStyle = '#c9b48e'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 26 + r() * 10) { let x = -r() * 40; const fh = 22 + r() * 10; while (x < W) { const bw = 30 + r() * 50, t = 165 + r() * 50; g.fillStyle = `rgb(${t + 14},${t},${t - 30})`;
      g.beginPath(); g.roundRect ? g.roundRect(x + 2, y + 2, bw - 4, fh - 4, 5) : g.rect(x + 2, y + 2, bw - 4, fh - 4); g.fill(); x += bw; } }
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(230,220,195,${0.25 + r() * 0.35})`; g.fillRect(r() * W, r() * H, 40 + r() * 140, 20 + r() * 80); }   // reboco gasto
  });
}
function lajes(THREE) {
  const r = rndS(3); return texCanvas(THREE, 1024, 1024, (g, W, H) => {
    g.fillStyle = '#d8c9a6'; g.fillRect(0, 0, W, H); const L = 128;
    for (let y = 0; y < H; y += L) for (let x = (y / L) % 2 ? -L / 2 : 0; x < W; x += L) { const t = 200 + r() * 34; g.fillStyle = `rgb(${t + 10},${t},${t - 26})`; g.fillRect(x + 2, y + 2, L - 4, L - 4);
      for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(110,90,60,${r() * 0.07})`; g.fillRect(x + r() * L, y + r() * L, 2 + r() * 10, 1 + r() * 6); } }
  });
}
function telhado(THREE) {   // teto plano de terra batida e cal
  const r = rndS(9); return texCanvas(THREE, 256, 256, (g, W, H) => { g.fillStyle = '#bfae8a'; g.fillRect(0, 0, W, H); for (let k = 0; k < 900; k++) { const t = 150 + r() * 70; g.fillStyle = `rgba(${t + 15},${t},${t - 30},.5)`; g.fillRect(r() * W, r() * H, 2 + r() * 6, 2 + r() * 6); } });
}

// ponto dentro de polígono
const dentroPol = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
// MURALHAS no ano 30 (a Terceira Muralha é de Agripa I, uns 41–44 d.C., ainda não existia)
export const PRIMEIRA = [[-770, 40], [-790, 300], [-760, 560], [-600, 820], [-380, 930], [-140, 960], [40, 920], [170, 780], [205, 560], [190, 330], [150, 242], [150, -242], [-150, -242], [-150, -60], [-420, 20], [-770, 40]];
export const SEGUNDA = [[-560, 25], [-560, -160], [-470, -320], [-300, -360], [-150, -300], [-150, -242]];   // traçado presumido (Gênate → Antônia); o Gólgota fica FORA, a oeste
export const CIDADE = [[-770, 40], [-790, 300], [-760, 560], [-600, 820], [-380, 930], [-140, 960], [40, 920], [170, 780], [205, 560], [190, 330], [150, 242], [150, -242], [-150, -300], [-300, -360], [-470, -320], [-560, -160], [-560, 25]];
export const LUGARES = {
  santuario: [-30, -100], portaFormosa: [60, -100], salomao: [150, -60], porticoReal: [0, 228], antonia: [-95, -275], palacio: [-730, 170], torres: [-740, 45], siloe: [-40, 905], cidadeDavi: [60, 520], oliveiras: [760, -70], golgota: [-640, -230], tiropeon: [-225, 60],
};

export async function construir(THREE, cena, { altura, folga, lixo, toque, rnd }) {
  const tHer = blocosHerodianos(THREE), tCasa = pedraCasa(THREE), tLaje = lajes(THREE), tTeto = telhado(THREE); lixo.push(tHer, tCasa, tLaje, tTeto);
  const mat = (map, rep, cor = 0xffffff, rough = 0.9) => { const t = map.clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]); lixo.push(t); const m = new THREE.MeshStandardMaterial({ map: t, color: cor, roughness: rough }); lixo.push(m); return m; };
  const juntar = new Map();   // material -> geometrias já posicionadas: centenas de caixas viram poucas malhas (monta e aquece muito mais rápido)
  const fecharJuntas = () => { for (const [m, gs] of juntar) { let nv = 0, ni = 0; for (const g of gs) { nv += g.attributes.position.count; ni += g.index.count; }
      const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni); let ov = 0, oi = 0;
      for (const g of gs) { P.set(g.attributes.position.array, ov * 3); Nn.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2); const ix = g.index.array; for (let k = 0; k < ix.length; k++) I[oi + k] = ix[k] + ov; ov += g.attributes.position.count; oi += ix.length; g.dispose(); }
      const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); G.setAttribute('uv', new THREE.BufferAttribute(U, 2)); G.setIndex(new THREE.BufferAttribute(I, 1)); G.computeBoundingSphere();
      const ms = new THREE.Mesh(G, m); cena.add(ms); lixo.push(G); } juntar.clear(); };
  const caixa = (w, h, d, m, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); { const uv = g.attributes.uv, F = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * F[f][0] / 18, uv.getY(i) * F[f][1] / 18); } } g.rotateY(ry); g.translate(x, y + h / 2, z); if (!juntar.has(m)) juntar.set(m, []); juntar.get(m).push(g); };
  const obst = [];   // caixas que não se atravessa: [x0,z0,x1,z1]
  const bloco = (x0, z0, x1, z1) => obst.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);

  // 1. MUROS DE ARRIMO da esplanada: do chão do vale até a esplanada (+1,5 m de parapeito), blocos herodianos
  const { x0, x1, z0, z1 } = MURO;
  const lados = [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  for (const [ax, az, bx, bz] of lados) { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 4), P = [], U = [], I = [];
    for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, hb = Math.min(-2, altura(x + (bz - az) / L * 3, z - (bx - ax) / L * 3)) - 3; P.push(x, hb, z, x, 1.6, z); U.push(t * L / 18, hb / 9, t * L / 18, 1.6 / 9); if (i) { const a = (i - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    const t = tHer.clone(); t.needsUpdate = true; lixo.push(g, t); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide })); lixo.push(m.material); cena.add(m); }
  // chão da esplanada: lajes claras
  { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat(tLaje, [(x1 - x0) / 9, (z1 - z0) / 9], 0xffffff, 0.8)); m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); cena.add(m); lixo.push(g); }
  await folga();

  // 2. PÓRTICOS em volta da esplanada (colunas de 12 m e teto de cedro); o PÓRTICO REAL ao sul, mais alto (Josefo, Ant. 15.411–416)
  const pedra = mat(tHer, [1, 1], 0xfaf6ee, 0.8), branco = new THREE.MeshStandardMaterial({ color: 0xf1e8d6, roughness: 0.6 }), ouro = new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.85, roughness: 0.3 }), cedro = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.7 });
  lixo.push(branco, ouro, cedro);
  const colGeo = new THREE.CylinderGeometry(0.55, 0.65, 1, 14); colGeo.translate(0, 0.5, 0); lixo.push(colGeo);
  const colunas = []; // [x, z, altura]
  function portico(ax, az, bx, bz, prof, alt, fileiras = 2, passo = 5.5) {
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;   // n aponta para DENTRO da esplanada
    for (let f = 0; f < fileiras; f++) { const o = 2 + f * (prof - 4) / Math.max(1, fileiras - 1); for (let s = 3; s < L - 2; s += passo) colunas.push([ax + ux * s + nx * o, az + uz * s + nz * o, alt]); }
    // teto de cedro e muro de fundo
    const cx = (ax + bx) / 2 + nx * prof / 2, cz = (az + bz) / 2 + nz * prof / 2, ry = Math.atan2(-uz, ux);
    caixa(L, 1.4, prof, cedro, cx, alt, cz, ry); caixa(L, 0.6, prof + 0.6, pedra, cx, alt + 1.4, cz, ry);
    caixa(L, alt, 1.6, pedra, (ax + bx) / 2 + nx * 0.8, 0, (az + bz) / 2 + nz * 0.8, ry);
  }
  portico(x0 + 2, z0 + 2, x1 - 2, z0 + 2, 15, 12);       // norte
  portico(x1 - 2, z0 + 2, x1 - 2, z1 - 32, 15, 12);       // leste: o Pórtico de Salomão (Jo 10:23; At 3:11)
  portico(x0 + 2, z1 - 32, x0 + 2, z0 + 2, 15, 12);       // oeste
  portico(x1 - 2, z1 - 2, x0 + 2, z1 - 2, 32, 24, 4, 6.2); // sul: o Pórtico Real, quatro fileiras de colunas (162 colunas, Josefo)
  for (let i = 0; i < colunas.length; i += 400) { const parte = colunas.slice(i, i + 400); const im = new THREE.InstancedMesh(colGeo, branco, parte.length); const M = new THREE.Matrix4();
    parte.forEach(([x, z, a], k) => { M.makeScale(1, a, 1); M.setPosition(x, 0, z); im.setMatrixAt(k, M); }); im.frustumCulled = false; cena.add(im); lixo.push(im); }
  // a nave central do Pórtico Real é mais alta (basílica)
  caixa(x1 - x0 - 10, 6, 12, pedra, 0, 24, z1 - 17);
  await folga();

  // 3. O SANTUÁRIO e os PÁTIOS (Middot; Josefo, Guerra 5.184–237): pátio das mulheres a leste, a Porta de Nicanor, o pátio de Israel e dos sacerdotes,
  // o altar, e o Santuário de 100 côvados (~50 m) de altura e largura na frente, voltado para o leste
  const S = LUGARES.santuario; const cx = S[0], cz = S[1];
  // soreg (balaustrada que separava os gentios) e o terraço (hel) com degraus
  { const g = new THREE.BoxGeometry(1, 1, 1); lixo.push(g); const m = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 }); lixo.push(m);
    const ret = [cx - 70, cz - 62, cx + 145, cz + 62]; const pts = [[ret[0], ret[1], ret[2], ret[1]], [ret[2], ret[1], ret[2], ret[3]], [ret[2], ret[3], ret[0], ret[3]], [ret[0], ret[3], ret[0], ret[1]]];
    for (const [ax, az, bx, bz] of pts) { const L = Math.hypot(bx - ax, bz - az); const ms = new THREE.Mesh(g, m); ms.scale.set(L, 1.5, 0.4); ms.position.set((ax + bx) / 2, 0.75, (az + bz) / 2); ms.rotation.y = Math.atan2(-(bz - az), bx - ax); cena.add(ms); }
    caixa(205, 2.5, 114, pedra, cx + 37, 0, cz);   // o terraço elevado (hel) com os degraus
  }
  const yP = 2.5;
  // pátio das mulheres (135 côvados ≈ 67 m em quadra) com muros de ~12 m e torres de canto
  const muroPatio = (px0, pz0, px1, pz1, alt, y = yP) => { const e = 3; caixa(px1 - px0, alt, e, pedra, (px0 + px1) / 2, y, pz0); caixa(px1 - px0, alt, e, pedra, (px0 + px1) / 2, y, pz1); caixa(e, alt, pz1 - pz0, pedra, px0, y, (pz0 + pz1) / 2); caixa(e, alt, pz1 - pz0, pedra, px1, y, (pz0 + pz1) / 2); };
  muroPatio(cx + 68, cz - 34, cx + 135, cz + 34, 12);
  // a PORTA FORMOSA (At 3:2) no muro leste do pátio das mulheres: bronze de Corinto (identificação mais aceita; outros a põem na Porta de Nicanor)
  { const bronze = new THREE.MeshStandardMaterial({ color: 0xb8833c, metalness: 0.9, roughness: 0.32 }); lixo.push(bronze); caixa(9, 13, 1.0, bronze, cx + 137.2, yP, cz, Math.PI / 2); caixa(13, 2.2, 3.4, ouro, cx + 137.4, yP + 13, cz, Math.PI / 2); caixa(2, 15, 2.6, pedra, cx + 137.4, yP, cz - 5.6); caixa(2, 15, 2.6, pedra, cx + 137.4, yP, cz + 5.6); caixa(12, 1.6, 14, pedra, cx + 143, 0, cz); }
  // pátio de Israel e dos sacerdotes (187 × 135 côvados), muros de ~20 m
  muroPatio(cx - 62, cz - 34, cx + 68, cz + 34, 20, yP + 2);
  // a Porta de Nicanor e seus 15 degraus em semicírculo (subida do pátio das mulheres)
  caixa(14, 18, 5, ouro, cx + 68, yP + 2, cz, Math.PI / 2);
  // o altar dos holocaustos (32 côvados ≈ 16 m em quadra, 8 m de altura), com a rampa ao sul
  caixa(16, 8, 16, pedra, cx + 35, yP + 2, cz); caixa(7, 6, 18, pedra, cx + 35, yP + 2, cz + 16);
  // o SANTUÁRIO: frente (pórtico) 50 m de largura e 50 m de altura; atrás, a casa de 30 m de largura; mármore branco e ouro
  const yS = yP + 6;
  caixa(8, 3, 50, branco, cx + 21, yP + 2, cz);   // degraus (12) diante do pórtico
  caixa(11, 50, 50, branco, cx + 12, yS, cz);     // fachada em T
  caixa(54, 34, 30, branco, cx - 20, yS, cz);     // o Santo e o Santíssimo
  caixa(54, 2, 31, ouro, cx - 20, yS + 34, cz); caixa(11.4, 1.6, 50.4, ouro, cx + 12, yS + 50, cz);   // as pontas de ouro no telhado (Guerra 5.224)
  caixa(0.4, 22, 10, new THREE.MeshStandardMaterial({ color: 0x3a1f3f, roughness: 0.9 }), cx + 17.7, yS, cz);   // a grande entrada sem portas com a cortina (Guerra 5.211–212)
  caixa(0.6, 3, 14, ouro, cx + 17.8, yS + 23, cz);   // a videira de ouro acima da entrada (Guerra 5.210; Ant. 15.395)
  bloco(cx - 75, cz - 64, cx + 147, cz + 64);   // não se atravessa os muros dos pátios (por enquanto o interior é só para ver)
  await folga();

  // 4. A FORTALEZA ANTÔNIA no canto noroeste (Guerra 5.238–246): quatro torres, a do sudeste mais alta (70 côvados)
  { const A = [-150, -305, -40, -242], ya = 6, hA = 22; caixa(A[2] - A[0], hA, A[3] - A[1], pedra, (A[0] + A[2]) / 2, ya, (A[1] + A[3]) / 2);
    for (const [tx, tz, th] of [[A[0] + 7, A[1] + 7, 26], [A[2] - 7, A[1] + 7, 26], [A[0] + 7, A[3] - 7, 26], [A[2] - 7, A[3] - 7, 35]]) caixa(14, th, 14, pedra, tx, ya + hA - 6, tz);
    bloco(A[0], A[1], A[2], A[3]); }
  // 5. O PALÁCIO DE HERODES na Cidade Alta, e as três torres ao norte dele: Hípico (~40 m), Fasael (~45 m), Mariane (~25 m) (Guerra 5.161–183)
  { const hp = altura(-730, 170); caixa(130, 14, 300, pedra, -730, hp, 170); caixa(110, 2, 280, mat(tTeto, [3, 3]), -730, hp + 14, 170); bloco(-795, 20, -665, 320);
    for (const [tx, th] of [[-760, 40], [-735, 45], [-705, 25]]) { const hb = altura(tx, 40); caixa(17, th, 17, pedra, tx, hb, 40); caixa(19, 1.5, 19, pedra, tx, hb + th, 40); bloco(tx - 9, 31, tx + 9, 49); } }
  await folga();

  // 6. MURALHAS com torres (12 m; torres de 18 m a cada ~70 m)
  const muralha = (P, alt) => { const tor = []; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue; const n = Math.ceil(L / 8);
      for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, xa = ax + (bx - ax) * t0, za = az + (bz - az) * t0, xb = ax + (bx - ax) * t1, zb = az + (bz - az) * t1, xm = (xa + xb) / 2, zm = (za + zb) / 2;
        if (xm > x0 - 1 && xm < x1 + 1 && zm > z0 - 1 && zm < z1 + 1) continue; const hb = Math.min(altura(xa, za), altura(xb, zb)) - 2; caixa(L / n + 0.4, alt + 2, 4, pedra, xm, hb, zm, Math.atan2(-(zb - za), xb - xa)); }
      for (let s = 35; s < L; s += 70) tor.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L]); }
    for (const [tx, tz] of tor) { if (tx > x0 - 5 && tx < x1 + 5 && tz > z0 - 5 && tz < z1 + 5) continue; caixa(11, alt + 8, 11, pedra, tx, altura(tx, tz) - 2, tz); } };
  muralha(PRIMEIRA, 12); muralha(SEGUNDA, 11);
  await folga();

  // 7. A CIDADE: casas de pedra de teto plano, apertadas nas encostas (mais largas na Cidade Alta, dos ricos; pequenas na Cidade Baixa)
  const casas = []; const livre = (x, z, r) => !obst.some(([a, b, c, d]) => x > a - r && x < c + r && z > b - r && z < d + r);
  const ruas = [[[-225, -300], [-225, 100], [-160, 600], [-60, 900]], [[-760, 120], [-420, 60], [-155, 30]], [[-560, -200], [-150, -270]], [[-600, 500], [-200, 420], [40, 400]]];
  const naRua = (x, z) => ruas.some((P) => distLinha(x, z, P)[0] < 4.5);
  const N = toque ? 2600 : 4200; let tent = 0;
  while (casas.length < N && tent++ < N * 12) { const x = -800 + rnd() * 1010, z = -370 + rnd() * 1340; if (!dentroPol(x, z, CIDADE)) continue;
    if (x > x0 - 8 && x < x1 + 8 && z > z0 - 8 && z < z1 + 8) continue; const alta = x < -380 && z < 600, w = alta ? 12 + rnd() * 10 : 6 + rnd() * 6, d = alta ? 10 + rnd() * 9 : 6 + rnd() * 5;
    if (!livre(x, z, Math.max(w, d) / 2 + 1) || naRua(x, z)) continue; const h0 = altura(x, z); if (Math.abs(altura(x + 4, z) - h0) > 6) continue;
    casas.push([x, z, w, d, (alta ? 6 : 3.8) + rnd() * (alta ? 4 : 2.5), h0, (rnd() - 0.5) * 0.25 + (rnd() < 0.5 ? 0 : Math.PI / 2)]); if (casas.length % 600 === 0) await folga(); }
  { const gC = new THREE.BoxGeometry(1, 1, 1); gC.translate(0, 0.5, 0); const uv = gC.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i)); lixo.push(gC);
    const mC = mat(tCasa, [1, 1], 0xf2e6cc, 0.95), mT = mat(tTeto, [1, 1], 0xffffff, 1);
    const paredes = new THREE.InstancedMesh(gC, mC, casas.length), tetos = new THREE.InstancedMesh(gC, mT, casas.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sx = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const cor = new THREE.Color();
    casas.forEach(([x, z, w, d, h, h0, ry], i) => { Q.setFromAxisAngle(Y, ry); Sx.set(w, h + 3, d); P.set(x, h0 - 3, z); M.compose(P, Q, Sx); paredes.setMatrixAt(i, M); const v = 0.86 + rnd() * 0.18; cor.setRGB(v, v * (0.97 + rnd() * 0.04), v * (0.9 + rnd() * 0.08)); paredes.setColorAt(i, cor);
      Sx.set(w + 0.3, 0.35, d + 0.3); P.set(x, h0 + h, z); M.compose(P, Q, Sx); tetos.setMatrixAt(i, M); });
    paredes.frustumCulled = tetos.frustumCulled = false; cena.add(paredes, tetos); lixo.push(paredes, tetos); }
  // as casas também não se atravessa
  for (const [x, z, w, d] of casas) { const r = Math.max(w, d) / 2; obst.push([x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8]); }

  // 8. O TANQUE DE SILOÉ (Jo 9:7), no fim do Tiropeon: degraus em volta da água
  { const [sx, sz] = LUGARES.siloe, hs = altura(sx, sz); caixa(60, 0.6, 40, pedra, sx, hs - 0.3, sz); const ag = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshStandardMaterial({ color: 0x4f7f86, roughness: 0.15, metalness: 0.2 })); ag.rotation.x = -Math.PI / 2; ag.position.set(sx, hs + 0.35, sz); cena.add(ag); lixo.push(ag.geometry, ag.material); }
  // 9. OLIVEIRAS no Monte das Oliveiras e no vale (cilindro + copa simples, de longe)
  { const tronco = new THREE.CylinderGeometry(0.35, 0.5, 2.2, 6); tronco.translate(0, 1.1, 0); const copa = new THREE.IcosahedronGeometry(2.4, 1); copa.translate(0, 3.6, 0); lixo.push(tronco, copa);
    const mt = new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 1 }), mcop = new THREE.MeshStandardMaterial({ color: 0x7d8a5c, roughness: 1, flatShading: true }); lixo.push(mt, mcop);
    const pts = []; let k = 0; while (pts.length < (toque ? 700 : 1300) && k++ < 40000) { const x = 230 + rnd() * 1300, z = -1100 + rnd() * 1900; if (dentroPol(x, z, CIDADE) || Math.hypot(x - 760, z + 70) < 90 || (x > 640 && Math.abs(z + 70) < 60)) continue; pts.push([x, z, 0.8 + rnd() * 0.6]); }
    const it = new THREE.InstancedMesh(tronco, mt, pts.length), ic = new THREE.InstancedMesh(copa, mcop, pts.length), M = new THREE.Matrix4();
    pts.forEach(([x, z, s], i) => { M.makeScale(s, s, s); M.setPosition(x, altura(x, z) - 0.2, z); it.setMatrixAt(i, M); ic.setMatrixAt(i, M); }); it.frustumCulled = ic.frustumCulled = false; cena.add(it, ic); lixo.push(it, ic); }
  fecharJuntas();
  return { obst };
}
