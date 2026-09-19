/* ════════════════════════════════════════════════════════════════════════════
   TESTE DO PACOTE OFFLINE — monta a MESMA lista que o botão
   "📥 Deixar disponível sem internet" monta no celular, e confere item por
   item contra a PRODUÇÃO. Se um endereço estiver errado, o cache quebra
   calado — que é o pior dos mundos. Aqui ele aparece.
   Uso: node scripts/teste-pacote-offline.js
   ════════════════════════════════════════════════════════════════════════════ */
const BASE = 'https://radar-atual.vercel.app';

const FIXOS = [
  '/', '/capa.jpg', '/biblia.json', '/harpa.json', '/ebd/previa.json',
  '/_pregado.js', '/busca/mensagens.idx.json',
  '/biblioteca/busca/', '/biblioteca/busca/index.html',
  '/biblioteca/mensagens/', '/biblioteca/mensagens/index.html', '/biblioteca/mensagens/_leitura.js',
  '/biblioteca/mensagens/_lupa.js', '/biblioteca/mensagens/_refs.js',
  '/biblioteca/sermoes/', '/biblioteca/sermoes/index.html', '/biblioteca/sermoes/_sermao.js'
];

// cópia fiel do licaoDaSemana() do app.js
function licaoDaSemana(){
  const start = new Date(2026, 6, 5); start.setHours(0,0,0,0);
  const d = new Date(); d.setHours(0,0,0,0);
  const dow = d.getDay();
  const prox = new Date(d); if (dow !== 0) prox.setDate(d.getDate() + (7 - dow));
  const wk = Math.round((prox.getTime() - start.getTime()) / (7*86400000));
  return Math.max(1, wk + 1);
}

async function lerIndice(url, base){
  const r = await fetch(BASE + url);
  if (!r.ok) return [];
  const t = await r.text();
  const out = [], re = /arquivo\s*:\s*['"]([^'"]+\.html)['"]/g;
  let m; while ((m = re.exec(t))) out.push(base + m[1]);
  return out;
}

function licoesDaVez(){
  const n = licaoDaSemana(), out = [];
  for (const t of ['adulto','jovem','adulto4','jovem4'])
    for (const k of [n-1, n, n+1]) {
      if (k < 1 || k > 13) continue;
      const nn = String(k).padStart(2,'0');
      out.push('/ebd/'+t+'/html/licao-'+nn+'.html');
      out.push('/ebd/'+t+'/html/apoio-'+nn+'.html');
    }
  return out;
}

(async () => {
  console.log('lição da semana calculada pelo app: ' + licaoDaSemana() + '  (hoje ' + new Date().toISOString().slice(0,10) + ')\n');

  const msgs = await lerIndice('/biblioteca/mensagens/index.html', '/biblioteca/mensagens/');
  const serm = await lerIndice('/biblioteca/sermoes/index.html', '/biblioteca/sermoes/');
  const opcionais = new Set(licoesDaVez());          // lição que não existe é pulada de propósito
  const lista = [...new Set([...FIXOS, ...msgs, ...serm, ...opcionais])];

  console.log('itens na lista: ' + lista.length
    + '  (fixos ' + FIXOS.length + ' · mensagens ' + msgs.length
    + ' · sermões ' + serm.length + ' · EBD ' + opcionais.size + ')\n');

  let total = 0, ok = 0, quebrados = [], pulados = [];
  const por = {};

  for (const u of lista) {
    const r = await fetch(BASE + u, { method: 'GET' });
    const n = Number(r.headers.get('content-length') || 0)
      || (await r.arrayBuffer().then(b => b.byteLength).catch(() => 0));
    const grupo = u.startsWith('/biblioteca/mensagens/') ? 'mensagens'
      : u.startsWith('/biblioteca/sermoes/') ? 'sermões'
      : u.startsWith('/ebd/') ? 'EBD' : 'base';
    if (r.ok) { ok++; total += n; por[grupo] = (por[grupo] || 0) + n; }
    else if (opcionais.has(u)) pulados.push(u + ' (' + r.status + ')');
    else quebrados.push(u + ' → ' + r.status);
  }

  console.log('peso por parte:');
  for (const [g, b] of Object.entries(por).sort((a,b) => b[1]-a[1]))
    console.log('  ' + g.padEnd(10) + (b/1048576).toFixed(2).padStart(6) + ' MB');
  console.log('  ' + 'TOTAL'.padEnd(10) + (total/1048576).toFixed(2).padStart(6) + ' MB   em ' + ok + ' arquivos\n');

  if (pulados.length) console.log('lições que ainda não existem (puladas sem quebrar o pacote): ' + pulados.length);
  if (quebrados.length) { console.log('\nENDEREÇOS QUEBRADOS (' + quebrados.length + '):'); quebrados.forEach(x => console.log('  ' + x)); }
  else console.log('nenhum endereço obrigatório quebrado.');

  process.exit(quebrados.length ? 1 : 0);
})();
