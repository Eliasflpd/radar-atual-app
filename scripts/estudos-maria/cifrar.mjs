// ═══════════════════════════════════════════════════════════════════════════
//  CIFRAR OS ESTUDOS MARIA — roda no PC do Elias, uma vez por atualização.
//
//  Por que existe: os estudos da pasta MARIA são material comprado (têm aviso de
//  direitos autorais). Igual aos livros do "Meu Estudo", eles NÃO podem ficar
//  legíveis no site nem no GitHub (o repositório é PÚBLICO). Então o texto e as
//  páginas ficam cifrados (AES-256-GCM) com a senha do Elias — a mesma do Meu
//  Estudo — e só o celular dele, com a senha, consegue ler.
//
//  Entrada:  D:\radar-atual-app\_estudos-maria-trabalho\   (gerada pelas
//            ferramentas em scripts\estudos-maria\ferramentas — texto.json,
//            paginas\pNNN.jpg e capa.jpg por estudo + manifest-fonte.json).
//            Essa pasta está no .gitignore: é o conteúdo ABERTO, nunca sobe.
//  Saída:    public\biblioteca\estudos-maria\dados\<slug>\*.enc + manifest.json
//
//  Formato de cada .enc:  [iv 12 bytes][ciphertext + tag 16 bytes]
//  Chave: PBKDF2-SHA256(senha, salt do manifest, 200000 iterações) → 32 bytes.
//  Um salt só para o módulo inteiro (fica no manifest.json): a chave é derivada
//  UMA vez no celular, e cada página abre em milissegundos. (No Meu Estudo cada
//  arquivo tem salt próprio — lá são poucos arquivos; aqui são 300+ páginas.)
//
//  Uso:  node scripts/estudos-maria/cifrar.mjs
//        (pede a senha no terminal, sem mostrar na tela; pede duas vezes)
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TRABALHO = process.env.MARIA_TRABALHO || path.join(RAIZ, '_estudos-maria-trabalho');
const SAIDA = path.join(RAIZ, 'public', 'biblioteca', 'estudos-maria');
const DADOS = path.join(SAIDA, 'dados');
const ITER = 200000;
const PROVA = 'RADAR-ESTUDOS-MARIA-OK';

function perguntarSenha(pergunta) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = rl._writeToOutput;
    rl.question(pergunta, r => { rl._writeToOutput = w; rl.close(); process.stdout.write('\n'); resolve(r); });
    rl._writeToOutput = () => {};   // não ecoa a senha
  });
}

function cifrar(chave, bytes) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const ct = Buffer.concat([c.update(bytes), c.final(), c.getAuthTag()]);
  return Buffer.concat([iv, ct]);
}
function decifrar(chave, buf) {   // só para conferir no fim
  const iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', chave, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

async function main() {
  const fonte = path.join(TRABALHO, 'manifest-fonte.json');
  if (!fs.existsSync(fonte)) { console.error('Não achei ' + fonte + '\nGere a pasta de trabalho primeiro (scripts/estudos-maria/ferramentas).'); process.exit(1); }
  const mf = JSON.parse(fs.readFileSync(fonte, 'utf8'));

  let senha = process.env.MARIA_SENHA || '';
  if (!senha) {
    console.log('\n🔒 Cifrar os Estudos MARIA com a SUA senha (a mesma do Meu Estudo).');
    senha = await perguntarSenha('Senha: ');
    const de_novo = await perguntarSenha('Repita a senha: ');
    if (!senha || senha !== de_novo) { console.error('As senhas não batem. Nada foi feito.'); process.exit(1); }
  }

  // salt novo a cada cifragem (tudo é recifrado junto, então o manifest sempre casa com os .enc)
  const salt = crypto.randomBytes(16);
  const chave = crypto.pbkdf2Sync(senha, salt, ITER, 32, 'sha256');

  if (fs.existsSync(DADOS)) fs.rmSync(DADOS, { recursive: true, force: true });
  fs.mkdirSync(DADOS, { recursive: true });

  const estudos = [];
  let totalBytes = 0, totalArq = 0;
  for (const e of mf.estudos) {
    const dir = path.join(TRABALHO, e.slug);
    const out = path.join(DADOS, e.slug); fs.mkdirSync(out, { recursive: true });
    const item = { slug: e.slug, titulo: e.titulo, sub: e.sub || '', serie: e.serie || '', ordem: e.ordem || 0, paginas: 0, texto: false, capa: false, capitulos: 0 };
    const tx = path.join(dir, 'texto.json');
    if (fs.existsSync(tx)) {
      const j = JSON.parse(fs.readFileSync(tx, 'utf8'));
      const b = cifrar(chave, Buffer.from(JSON.stringify(j), 'utf8'));
      fs.writeFileSync(path.join(out, 'texto.enc'), b); totalBytes += b.length; totalArq++;
      item.texto = true; item.capitulos = (j.capitulos || []).length;
    }
    const pg = path.join(dir, 'paginas');
    if (fs.existsSync(pg)) {
      const arqs = fs.readdirSync(pg).filter(f => /^p\d{3}\.jpg$/.test(f)).sort();
      arqs.forEach((f, i) => { const b = cifrar(chave, fs.readFileSync(path.join(pg, f))); fs.writeFileSync(path.join(out, 'p' + String(i + 1).padStart(3, '0') + '.enc'), b); totalBytes += b.length; totalArq++; });
      item.paginas = arqs.length;
    }
    const capa = path.join(dir, 'capa.jpg');
    if (fs.existsSync(capa)) { const b = cifrar(chave, fs.readFileSync(capa)); fs.writeFileSync(path.join(out, 'capa.enc'), b); totalBytes += b.length; totalArq++; item.capa = true; }
    if (!item.texto && !item.paginas) { console.warn('  (vazio, pulado) ' + e.slug); continue; }
    estudos.push(item);
    console.log('  ok  ' + e.slug.padEnd(24) + (item.paginas ? item.paginas + ' págs ' : '') + (item.texto ? item.capitulos + ' capítulos' : ''));
  }
  const prova = cifrar(chave, Buffer.from(PROVA, 'utf8'));
  fs.writeFileSync(path.join(DADOS, 'prova.enc'), prova);
  const manifest = { versao: new Date().toISOString().slice(0, 10), iter: ITER, salt: salt.toString('base64'), prova: 'dados/prova.enc', series: mf.series || [], estudos };
  fs.writeFileSync(path.join(SAIDA, 'manifest.json'), JSON.stringify(manifest, null, 1));

  // conferência: a prova volta a ser legível com a mesma chave?
  if (decifrar(chave, fs.readFileSync(path.join(DADOS, 'prova.enc'))).toString('utf8') !== PROVA) { console.error('FALHA na conferência da prova!'); process.exit(1); }
  console.log(`\n✅ ${estudos.length} estudos · ${totalArq} arquivos · ${(totalBytes / 1e6).toFixed(1)} MB cifrados em ${path.relative(RAIZ, DADOS)}`);
  console.log('   manifest: ' + path.relative(RAIZ, path.join(SAIDA, 'manifest.json')));
  console.log('   Agora: git add public/biblioteca/estudos-maria && git commit && git push');
}
main().catch(e => { console.error(e); process.exit(1); });
