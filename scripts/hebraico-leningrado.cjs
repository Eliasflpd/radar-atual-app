// Códice de Leningrado no NEXUS: Open Scriptures Hebrew Bible (OSHB, CC BY 4.0), baseada no
// Westminster Leningrad Codex (domínio público). Gera public/nexus/hebraico/<livro>.json com cada versículo
// palavra por palavra: [texto hebraico, Strong, morfologia].
// uso: node scripts/hebraico-leningrado.cjs <pasta wlc do morphhb>
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.join(__dirname, '..', 'NEXUS-BIBLICO', '_fontes', 'oshb', 'morphhb-master', 'wlc');
const OSIS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
const saida = path.join(__dirname, '..', 'public', 'nexus', 'hebraico'); fs.mkdirSync(saida, { recursive: true });
let total = 0, palavras = 0;
OSIS.forEach((o, i) => {
  const xml = fs.readFileSync(path.join(dir, o + '.xml'), 'utf8'); const livro = {};
  const reV = /<verse osisID="[^.]+\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g; let m;
  while ((m = reV.exec(xml))) {
    const [, c, v, corpo] = m; const ws = [];
    const reW = /<w([^>]*)>([^<]*)<\/w>/g; let w;
    while ((w = reW.exec(corpo))) {
      const at = w[1], lem = (at.match(/lemma="([^"]*)"/) || [])[1] || '', mor = (at.match(/morph="([^"]*)"/) || [])[1] || '';
      const num = (lem.match(/(\d+)\s*[a-z]?\s*$/) || [])[1];
      ws.push([w[2].replace(/\//g, ''), num ? 'H' + String(num).padStart(4, '0') : '', mor]); palavras++;
    }
    (livro[c] = livro[c] || {})[v] = ws; total++;
  }
  fs.writeFileSync(path.join(saida, (i + 1) + '.json'), JSON.stringify(livro));
});
fs.writeFileSync(path.join(saida, 'fonte.json'), JSON.stringify({ fonte: 'Open Scriptures Hebrew Bible (OSHB), CC BY 4.0 — github.com/openscriptures/morphhb', base: 'Westminster Leningrad Codex (domínio público), transcrição do Códice de Leningrado (c. 1008 d.C.)' }));
console.log(JSON.stringify({ versiculos: total, palavras }));
