// A PASTA DE ALIMENTAÇÃO DA BIBLIOTECA — roda toda noite (Agendador de Tarefas do Windows).
// Pedido do Elias, 18/10/2026: "aprender, se atualizar". Você joga um livro numa pasta e,
// de madrugada, ele vira fonte de pesquisa da voz e do Concílio — sem ninguém mexer em código.
//
//   D:\RADAR-ALIMENTAR\
//     <Autor - Obra>\            ← uma pasta por obra (o nome vira autor/obra se não houver fonte.json)
//        livro.pdf | .docx | .txt | .md
//        fonte.json (opcional)   ← { "autor", "obra", "peso": 3, "aprovado": true, "livro": "Provérbios",
//                                    "origem": "D:\\caminho\\do\\arquivo-ou-pasta", "capitulos": false,
//                                    "tipo": "historico" }  ← jornal/fonte histórica: selo próprio, nunca doutrina
//        _texto\                 ← criado aqui: o texto extraído (é isto que o indexador lê)
//     _fontes.json               ← criado aqui: a lista que o indexador acrescenta às fontes fixas
//     _registro.txt              ← o que aconteceu em cada noite
//     LACUNAS.txt                ← o que a voz não achou na biblioteca (o que falta comprar/pôr)
//
// O texto dos livros NUNCA vai pro repositório nem pra página: fica no disco D: e no Postgres.
// Uso:  node scripts/alimentar-biblioteca.mjs            (converte, indexa, sobe o que mudou)
//       node scripts/alimentar-biblioteca.mjs --seco     (só converte e mostra o plano)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = process.env.RADAR_ALIMENTAR || 'D:\\RADAR-ALIMENTAR';
const CACHE = process.env.BIBLIOTECA_CACHE || 'D:\\RADAR-BIBLIOTECA';
const SECO = process.argv.includes('--seco');
const TETO_MB = process.env.PARAR_EM_MB || '440';   // o Neon grátis tem 512 MB e é o banco do app NO AR

// 28/10/2026: UM DE CADA VEZ. A noite, o transcritor do canal do Dr. Wagner e a troca dos trechos com loop chamam
// este mesmo script; dois rodando juntos subiriam o mesmo texto duas vezes. Quem chega depois espera o outro acabar.
const TRAVA = path.join(CACHE, '_alimentar.pid');
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
for (let i = 0; ; i++) {
  const outro = +(fs.existsSync(TRAVA) && fs.readFileSync(TRAVA, 'utf8')) || 0;
  if (!outro || outro === process.pid || !vivo(outro)) break;
  if (i % 10 === 0) console.log(`(outra alimentação rodando, pid ${outro} — esperando)`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30000);
}
fs.mkdirSync(CACHE, { recursive: true });
fs.writeFileSync(TRAVA, String(process.pid));
process.on('exit', () => { try { if (+fs.readFileSync(TRAVA, 'utf8') === process.pid) fs.unlinkSync(TRAVA); } catch (_) { /* já saiu */ } });

const log = [];
const diz = (s) => { console.log(s); log.push(s); };
fs.mkdirSync(PASTA, { recursive: true });
diz(`\n══ ${new Date().toLocaleString('pt-BR')} ══`);

const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const ACEITOS = ['.pdf', '.docx', '.txt', '.md'];

function entradas(origem) {
  if (!fs.existsSync(origem)) return [];
  if (fs.statSync(origem).isFile()) return ACEITOS.includes(path.extname(origem).toLowerCase()) ? [origem] : [];
  return fs.readdirSync(origem)
    .filter((n) => ACEITOS.includes(path.extname(n).toLowerCase()) && !n.startsWith('~$'))
    .map((n) => path.join(origem, n));
}

// docx → texto: o document.xml de dentro do zip, parágrafo por parágrafo (python do sistema, modo isolado).
function textoDoDocx(arq) {
  const py = 'import sys,zipfile,re,html\nz=zipfile.ZipFile(sys.argv[1]);x=z.read("word/document.xml").decode("utf8","ignore")\n'
    + 'ps=re.findall(r"<w:p[ >].*?</w:p>",x,re.S)\nout=[]\nfor p in ps:\n t="".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>",p,re.S))\n'
    + ' if t.strip(): out.append(html.unescape(t))\nsys.stdout.buffer.write("\\n\\n".join(out).encode("utf8"))';
  return execFileSync('python', ['-I', '-c', py, arq], { maxBuffer: 1 << 28 }).toString('utf8');
}
function textoDoPdf(arq) {
  return execFileSync('pdftotext', ['-enc', 'UTF-8', arq, '-'], { maxBuffer: 1 << 28 }).toString('utf8')
    .replace(/\f/g, '\n\n');
}

const fontes = [];
for (const d of fs.readdirSync(PASTA, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_') || d.name.startsWith('.')) continue;
  const dir = path.join(PASTA, d.name);
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(dir, 'fonte.json'), 'utf8')); } catch (_) {}
  const [autorNome, obraNome] = d.name.split(/\s+-\s+/);
  const arquivos = entradas(cfg.origem || dir);
  if (!arquivos.length) { diz(`  ⚠ ${d.name}: nenhum .pdf/.docx/.txt/.md`); continue; }

  const destino = path.join(dir, '_texto');
  fs.mkdirSync(destino, { recursive: true });
  let convertidos = 0;
  for (const arq of arquivos) {
    // O nome do .md vira o "livro" do trecho no banco. Se a obra é de um livro bíblico só, o fonte.json
    // diz qual ("livro": "Provérbios") — e a voz cita "Waltke, em Provérbios" em vez do nome do arquivo.
    const base = cfg.livro && arquivos.length === 1 ? cfg.livro : path.basename(arq, path.extname(arq));
    const alvo = path.join(destino, base.replace(/[\\/:*?"<>|]/g, ' ').trim() + '.md');
    if (fs.existsSync(alvo) && fs.statSync(alvo).mtimeMs >= fs.statSync(arq).mtimeMs) continue;
    try {
      const ext = path.extname(arq).toLowerCase();
      const t = ext === '.pdf' ? textoDoPdf(arq) : ext === '.docx' ? textoDoDocx(arq) : fs.readFileSync(arq, 'utf8');
      if (t.replace(/\s/g, '').length < 2000) { diz(`  ⚠ ${d.name}: ${path.basename(arq)} quase sem texto (PDF escaneado?) — pulei`); continue; }
      fs.writeFileSync(alvo, t);
      convertidos++;
    } catch (e) { diz(`  ✖ ${d.name}: não converti ${path.basename(arq)} (${String(e.message).slice(0, 80)})`); }
  }
  const f = {
    id: 'al-' + slug(cfg.id || d.name),
    autor: cfg.autor || autorNome || d.name,
    obra: cfg.obra || obraNome || d.name,
    peso: Number(cfg.peso) || 3,
    aprovado: cfg.aprovado !== false,
    tipo: cfg.tipo || 'comentario',
    dir: destino,
    ...(cfg.capitulos ? { capitulos: true } : {}),
    ...(cfg.semCapa ? { semCapa: true } : {}),
  };
  fontes.push(f);
  diz(`  • ${f.id}: ${f.autor} — ${arquivos.length} arquivo(s)${convertidos ? `, ${convertidos} convertido(s) agora` : ''}`
    + (f.tipo === 'historico' ? ' [FONTE HISTÓRICA]' : f.aprovado ? '' : ' [COM FILTRO]'));
}
fs.writeFileSync(path.join(PASTA, '_fontes.json'), JSON.stringify(fontes, null, 2));

// O que mudou = o selo do cache antes e depois do indexador.
const seloDe = (id) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE, id + '.idx.json'), 'utf8')).selo || ''; } catch (_) { return null; } };
const antes = Object.fromEntries(fontes.map((f) => [f.id, seloDe(f.id)]));

// As credenciais saem dos arquivos locais (cofre e .env do indexador) — nunca impressas.
const env = { ...process.env, PARAR_EM_MB: TETO_MB };
try {
  for (const l of fs.readFileSync(path.join(CACHE, '.env.indexador'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (_) {}

if (SECO || !fontes.length) {
  diz(SECO ? '  (seco: não indexei nem subi nada)' : '  nada na pasta de alimentação');
} else {
  const ids = fontes.map((f) => f.id);
  const ix = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'indexar-biblioteca.mjs'), ...ids],
    { env, encoding: 'utf8', maxBuffer: 1 << 26 });
  for (const l of String(ix.stdout || '').split('\n')) if (/✅|⚠|✖|♻|PAREI|dormindo|cota|erro/i.test(l)) diz('    ' + l.trim());
  const mudaram = ids.filter((id) => { const s = seloDe(id); return s !== null && s !== antes[id]; });
  if (!mudaram.length) diz('  nada novo para subir');
  else if (!env.RADAR_DB) diz('  ✖ sem RADAR_DB (D:\\RADAR-BIBLIOTECA\\.env.indexador) — indexei mas não subi');
  else {
    const sb = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'indexar-biblioteca.mjs'), '--subir', ...mudaram],
      { env, encoding: 'utf8', maxBuffer: 1 << 26 });
    const saida = String(sb.stdout || '') + String(sb.stderr || '');
    // 28/10/2026: são dois bancos (fonte que já está no banco 1 fica nele; fonte nova vai para o banco 2) — o
    // indexador diz "banco 1 em … MB", "banco 2: … -> … MB" e "⏭" quando um deles bateu no freio.
    for (const l of saida.split('\n')) if (/banco \d? ?em|banco \d:|PAREI|⏭|✅|✖|erro/i.test(l)) diz('    ' + l.trim());
    diz(`  ⬆ subiu: ${mudaram.join(', ')}`);
  }
}

// AS LACUNAS: o que a voz procurou e não achou. Vira um .txt que o Elias abre e vê o que falta.
if (env.RADAR_DB && !SECO) {
  try {
    const { default: pg } = await import('pg');
    const c = new pg.Client({ connectionString: env.RADAR_DB, ssl: { rejectUnauthorized: false } });
    await c.connect();
    const r = await c.query(`select assunto, ferramenta, vezes, atualizado_em from globo_aprendizado
      where user_key='' and tipo='lacuna' order by vezes desc, atualizado_em desc limit 200`).catch(() => ({ rows: [] }));
    await c.end();
    const linhas = r.rows.map((x) => `${String(x.vezes).padStart(3)}×  ${x.assunto}   (${x.ferramenta}, ${new Date(x.atualizado_em).toLocaleDateString('pt-BR')})`);
    fs.writeFileSync(path.join(PASTA, 'LACUNAS.txt'),
      'O QUE A VOZ PROCUROU E NÃO ACHOU NA BIBLIOTECA (atualizado ' + new Date().toLocaleString('pt-BR') + ')\n'
      + 'Os mais perguntados primeiro. Um livro sobre estes assuntos, posto aqui na pasta, fecha a lacuna.\n\n'
      + (linhas.join('\n') || '(nenhuma lacuna anotada ainda)') + '\n');
    diz(`  📝 LACUNAS.txt: ${linhas.length} assunto(s)`);
  } catch (e) { diz('  ✖ não li as lacunas: ' + String(e.message).slice(0, 80)); }
}

fs.appendFileSync(path.join(PASTA, '_registro.txt'), log.join('\n') + '\n');
