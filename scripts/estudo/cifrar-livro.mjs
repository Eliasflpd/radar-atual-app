// ═════════════════════════════════════════════════════════════════
//  ADICIONAR UM LIVRO AO "MEU ESTUDO" (privado) — roda no PC do Elias.
//
//  Por que existe: livro comprado tem direitos autorais e o repositório do RADAR é
//  PÚBLICO. Então o texto só sobe CIFRADO (AES-256-GCM, chave = senha do Meu Estudo
//  via PBKDF2-SHA256 200.000 iterações). Só quem sabe a senha lê.
//
//  Uso:
//    node scripts/estudo/cifrar-livro.mjs <arquivo.md> <slug> "<Título>" "<Autor>" [capa.jpg]
//  Exemplo:
//    node scripts/estudo/cifrar-livro.mjs D:\DUEWEL\fogo-do-avivamento-leitor.md fogo-do-avivamento "Fogo do Avivamento" "Wesley L. Duewel" D:\DUEWEL\capa.jpg
//
//  O que faz, nesta ordem (para nunca estragar o que já funciona):
//   1. pede a senha (digitada escondida) e CONFERE decifrando o 1º livro que já está lá;
//      se não bater, para — não cifra nada com senha errada;
//   2. cifra o livro; formato de sempre: [salt 16][iv 12][texto cifrado + tag 16];
//   3. sobe o .enc (e a capa, se houver) para o Supabase Storage (bucket midias/estudo/…);
//   4. baixa de volta e decifra para provar que subiu íntegro;
//   5. só então acrescenta o livro em public/biblioteca/estudo/estudo-manifest.json.
//  Depois é só publicar (git add/commit/push do manifest).
// ═════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = path.join(RAIZ, 'public', 'biblioteca', 'estudo', 'estudo-manifest.json');
const SUPA = 'https://tjyquvmbaaavqnpirapp.supabase.co';
const PASTA = 'espiritualidade';

const [arquivo, slug, titulo, autor, capa] = process.argv.slice(2);
if (!arquivo || !slug || !titulo || !autor) {
  console.log('Uso: node scripts/estudo/cifrar-livro.mjs <arquivo.md> <slug> "<Título>" "<Autor>" [capa.jpg]');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) { console.log('slug só pode ter letras minúsculas, números e hífen.'); process.exit(1); }

const ANON = (fs.readFileSync(path.join(RAIZ, 'api', 'videos.js'), 'utf8').match(/const ANON='(eyJ[^']+)'/) || [])[1];
if (!ANON) { console.log('Não achei a chave de envio em api/videos.js.'); process.exit(1); }

function perguntar(pergunta) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = rl._writeToOutput;
    rl.question(pergunta, r => { rl._writeToOutput = w; rl.close(); process.stdout.write('\n'); resolve(r.trim()); });
    rl._writeToOutput = () => {};
  });
}
function chave(senha, salt, iter) { return crypto.pbkdf2Sync(senha, salt, iter, 32, 'sha256'); }
function decifrar(senha, buf, iter) {
  const salt = buf.subarray(0, 16), iv = buf.subarray(16, 28), tag = buf.subarray(buf.length - 16), ct = buf.subarray(28, buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', chave(senha, salt, iter), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
function cifrar(senha, bytes, iter) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave(senha, salt, iter), iv);
  return Buffer.concat([salt, iv, c.update(bytes), c.final(), c.getAuthTag()]);
}
async function baixar(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
  return Buffer.from(await r.arrayBuffer());
}
async function subir(destino, bytes, tipo) {
  const r = await fetch(`${SUPA}/storage/v1/object/midias/${destino}`, {
    method: 'POST', body: bytes,
    headers: { Authorization: 'Bearer ' + ANON, apikey: ANON, 'Content-Type': tipo, 'x-upsert': 'true' },
  });
  if (!r.ok) throw new Error('envio falhou (' + r.status + '): ' + (await r.text()).slice(0, 120));
  return `${SUPA}/storage/v1/object/public/midias/${destino}`;
}

const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (man.livros.some(l => l.slug === slug)) { console.log('Já existe um livro com o slug "' + slug + '" no manifesto. Escolha outro.'); process.exit(1); }

const senha = await perguntar('Senha do Meu Estudo (não aparece enquanto digita): ');
if (!senha) { console.log('Sem senha, nada feito.'); process.exit(1); }

// 1. confere a senha com um livro que já existe
try { decifrar(senha, await baixar(man.livros[0].arquivo), man.iter); console.log('1/5 senha conferida.'); }
catch (e) { console.log('Senha não confere (ou o servidor não respondeu): ' + e.message + '\nNada foi enviado.'); process.exit(1); }

// 2. cifra
const texto = fs.readFileSync(arquivo);
const enc = cifrar(senha, texto, man.iter);
console.log(`2/5 cifrado: ${(texto.length / 1e6).toFixed(2)} MB de texto → ${(enc.length / 1e6).toFixed(2)} MB.`);

// 3. envia
const urlEnc = await subir(`estudo/${PASTA}/${slug}.enc`, enc, 'application/octet-stream');
let urlCapa = null;
if (capa) urlCapa = await subir(`estudo/capas/${slug}.jpg`, fs.readFileSync(capa), 'image/jpeg');
console.log('3/5 enviado.');

// 4. prova de volta
const volta = decifrar(senha, await baixar(urlEnc), man.iter);
if (!volta.equals(texto)) { console.log('A cópia enviada NÃO confere com a original. Manifesto não foi alterado.'); process.exit(1); }
console.log('4/5 conferido: o que está no servidor decifra igual ao original.');

// 5. manifesto
man.livros.push({ num: 900, titulo, autor, slug, arquivo: urlEnc });
if (urlCapa) { man.capas = man.capas || {}; man.capas[autor] = urlCapa; }
fs.writeFileSync(MANIFEST, JSON.stringify(man));
console.log('5/5 manifesto atualizado (' + man.livros.length + ' livros). Falta só publicar: avise o Claude, ou rode git add/commit/push.');
