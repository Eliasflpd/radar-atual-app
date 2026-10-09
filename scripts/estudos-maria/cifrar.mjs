// ═══════════════════════════════════════════════════════════════════════════
//  CIFRAR AS "PÉROLAS DESCOBERTA" — roda no PC do Elias, uma vez por atualização.
//
//  Por que existe: os estudos da pasta MARIA são material comprado (têm aviso de
//  direitos autorais) e o repositório do RADAR é PÚBLICO. Então o texto fica
//  cifrado (AES-256-GCM) e só o celular do Elias, com a senha OU o PIN, lê.
//
//  Como funciona (09/10/2026 — pedido: "a senha continua, mas quero um PIN também"):
//  - Existe UMA chave de conteúdo, aleatória (32 bytes). Todos os texto.enc são
//    cifrados com ela.
//  - Essa chave é guardada no manifest.json "embrulhada" N vezes: uma vez com a
//    chave derivada da SENHA (PBKDF2-SHA256, 200.000 iterações) e uma vez com a
//    chave derivada do PIN (PBKDF2-SHA256, 1.000.000 iterações — o PIN é curto,
//    então custa mais caro testar). O celular tenta desembrulhar com o que foi
//    digitado; o que abrir, abriu.
//  ⚠️ Honestidade: um PIN de 4 dígitos tem só 10.000 combinações. Quem baixar o
//    repositório pode testar todas num computador em poucos minutos. A senha
//    continua forte; o PIN é conveniência. Foi decisão do Elias.
//
//  Entrada:  _estudos-maria-trabalho/  (texto.json por estudo + manifest-fonte.json;
//            pasta gitignored — conteúdo ABERTO, nunca sobe)
//  Saída:    public/biblioteca/perolas-descoberta/dados/<slug>/texto.enc + manifest.json
//  Formato de cada .enc / embrulho:  [iv 12 bytes][ciphertext + tag 16 bytes]
//
//  Uso:  node scripts/estudos-maria/cifrar.mjs      (pede senha e PIN no terminal)
//        MARIA_SENHA=... MARIA_PIN=0000 node scripts/estudos-maria/cifrar.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TRABALHO = process.env.MARIA_TRABALHO || path.join(RAIZ, '_estudos-maria-trabalho');
const SAIDA = path.join(RAIZ, 'public', 'biblioteca', 'perolas-descoberta');
const DADOS = path.join(SAIDA, 'dados');
const ITER_SENHA = 200000, ITER_PIN = 1000000;
const PROVA = 'RADAR-ESTUDOS-MARIA-OK';

function perguntar(pergunta, oculto) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = rl._writeToOutput;
    rl.question(pergunta, r => { rl._writeToOutput = w; rl.close(); process.stdout.write('\n'); resolve(r.trim()); });
    if (oculto) rl._writeToOutput = () => {};
  });
}
function cifrar(chave, bytes) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  return Buffer.concat([iv, c.update(bytes), c.final(), c.getAuthTag()]);
}
function decifrar(chave, buf) {
  const iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', chave, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

async function main() {
  const fonte = path.join(TRABALHO, 'manifest-fonte.json');
  if (!fs.existsSync(fonte)) { console.error('Não achei ' + fonte); process.exit(1); }
  const mf = JSON.parse(fs.readFileSync(fonte, 'utf8'));

  let senha = process.env.MARIA_SENHA || '', pin = process.env.MARIA_PIN;
  if (!senha) {
    console.log('\n🔒 Cifrar as Pérolas Descoberta.');
    senha = await perguntar('Senha: ', true);
    const de_novo = await perguntar('Repita a senha: ', true);
    if (!senha || senha !== de_novo) { console.error('As senhas não batem. Nada foi feito.'); process.exit(1); }
    pin = await perguntar('PIN (só números; Enter para não ter PIN): ', true);
  }
  if (pin && !/^\d{4,8}$/.test(pin)) { console.error('PIN deve ter de 4 a 8 números.'); process.exit(1); }

  // chave de conteúdo aleatória + embrulhos
  const chaveConteudo = crypto.randomBytes(32);
  const embrulhos = [];
  const embrulhar = (segredo, iter, tipo) => {
    const salt = crypto.randomBytes(16);
    const k = crypto.pbkdf2Sync(segredo, salt, iter, 32, 'sha256');
    embrulhos.push({ tipo, iter, salt: salt.toString('base64'), chave: cifrar(k, chaveConteudo).toString('base64') });
  };
  embrulhar(senha, ITER_SENHA, 'senha');
  if (pin) embrulhar(pin, ITER_PIN, 'pin');

  if (fs.existsSync(DADOS)) fs.rmSync(DADOS, { recursive: true, force: true });
  fs.mkdirSync(DADOS, { recursive: true });

  const estudos = []; let totalBytes = 0;
  for (const e of mf.estudos) {
    const tx = path.join(TRABALHO, e.slug, 'texto.json');
    if (!fs.existsSync(tx)) { console.warn('  (sem texto, pulado) ' + e.slug); continue; }
    const j = JSON.parse(fs.readFileSync(tx, 'utf8'));
    const out = path.join(DADOS, e.slug); fs.mkdirSync(out, { recursive: true });
    const b = cifrar(chaveConteudo, Buffer.from(JSON.stringify(j), 'utf8'));
    fs.writeFileSync(path.join(out, 'texto.enc'), b); totalBytes += b.length;
    estudos.push({ slug: e.slug, titulo: e.titulo, sub: e.sub || '', serie: e.serie || '', ordem: e.ordem || 0, texto: true, capitulos: (j.capitulos || []).length });
    console.log('  ok  ' + e.slug.padEnd(24) + (j.capitulos || []).length + ' capítulos');
  }
  fs.writeFileSync(path.join(DADOS, 'prova.enc'), cifrar(chaveConteudo, Buffer.from(PROVA, 'utf8')));
  const manifest = { versao: new Date().toISOString().slice(0, 10), formato: 2, embrulhos, prova: 'dados/prova.enc', series: mf.series || [], estudos };
  fs.writeFileSync(path.join(SAIDA, 'manifest.json'), JSON.stringify(manifest, null, 1));

  // conferência: senha e PIN abrem?
  for (const em of embrulhos) {
    const segredo = em.tipo === 'pin' ? pin : senha;
    const k = crypto.pbkdf2Sync(segredo, Buffer.from(em.salt, 'base64'), em.iter, 32, 'sha256');
    const cc = decifrar(k, Buffer.from(em.chave, 'base64'));
    if (decifrar(cc, fs.readFileSync(path.join(DADOS, 'prova.enc'))).toString('utf8') !== PROVA) { console.error('FALHA na conferência (' + em.tipo + ')'); process.exit(1); }
  }
  console.log(`\n✅ ${estudos.length} estudos · ${(totalBytes / 1e6).toFixed(1)} MB cifrados · abre com senha${pin ? ' e com PIN' : ''}`);
  console.log('   ' + path.relative(RAIZ, SAIDA) + '  →  git add, commit e push para publicar');
}
main().catch(e => { console.error(e); process.exit(1); });
