#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   A TRAVA DO RADAR — o porteiro que NÃO DEIXA PUBLICAR APP QUEBRADO.

   POR QUE EXISTE (21/09/2026, pedido do Elias):
   Até hoje o único freio entre "mexi no código" e "o irmão abre o app quebrado"
   era eu tomar cuidado. Isso falhou no mesmo dia: um `git add -A` mandou 1.546
   arquivos de node_modules pro repositório sem ninguém perceber.
   Cuidado não escala. Porteiro escala.

   A REGRA DE OURO: publicação BLOQUEADA é sempre melhor que app QUEBRADO.
   Quando este arquivo diz NÃO, ele diz em português, dizendo o que consertar.

   BLOQUEIA (erro nosso, certeza):      AVISA (pode ser o provedor, não trava):
     · arquivo .js com erro de sintaxe    · API de IA lenta ou fora do ar
     · arquivo essencial sumido           · arquivo crescendo sem explicação
     · versão do app ≠ versão do sw       · chave nova nunca vista
     · chave de API dentro do código
     · node_modules na lista de envio

   Uso:  node scripts/guarda.mjs          (checagem local, antes de enviar)
   ════════════════════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARCOS = join(RAIZ, 'scripts', '_marcos.json');   // tamanhos conhecidos e aprovados

const erros = [];
const avisos = [];
const ok = [];
const falha = (m) => erros.push(m);
const avisa = (m) => avisos.push(m);
const passou = (m) => ok.push(m);

const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
const tamanho = (p) => (existsSync(join(RAIZ, p)) ? statSync(join(RAIZ, p)).size : 0);

/* ── 1. SINTAXE ────────────────────────────────────────────────────────────
   Um ponto-e-vírgula fora do lugar no app.js deixa a TELA BRANCA. É o erro
   mais bobo e o mais caro. Aqui ele morre antes de sair do PC.             */
function checarSintaxe() {
  const arquivos = [
    'public/assets/app.js', 'public/assets/lupa.js', 'public/sw.js', 'public/_uso.js',
    ...execSync('git ls-files api', { cwd: RAIZ }).toString().trim().split('\n').filter(f => f.endsWith('.js')),
  ].filter(f => existsSync(join(RAIZ, f)));

  for (const f of arquivos) {
    // `node --check` é o MESMO analisador que vai rodar o arquivo de verdade.
    // Tentar validar com `new Function()` não serve: quebra em todo arquivo que
    // usa import/export ou await no topo (aprendi na marra — deu 13 falso-alarme).
    // Aqui: primeiro como script comum; se reclamar, tenta de novo como módulo.
    const caminho = join(RAIZ, f);
    try {
      execSync(`node --check "${caminho}"`, { stdio: 'pipe' });
      passou(`sintaxe ok: ${f}`);
    } catch {
      try {
        execSync(`node --input-type=module --check`, { input: ler(f), stdio: ['pipe', 'pipe', 'pipe'] });
        passou(`sintaxe ok: ${f} (módulo)`);
      } catch (e2) {
        const msg = (e2.stderr?.toString() || e2.message).split('\n').find(l => /Error|error/.test(l)) || 'erro de sintaxe';
        falha(`SINTAXE QUEBRADA em ${f} → ${msg.trim()}`);
      }
    }
  }
}

/* ── 2. OS ARQUIVOS QUE NÃO PODEM SUMIR ────────────────────────────────────
   Sem um destes o app não é app. Já aconteceu de um índice sumir num
   `git clean` e ninguém ver até o irmão abrir a busca.                      */
const ESSENCIAIS = {
  'public/index.html':        [60_000, 400_000],
  'public/assets/app.js':     [200_000, 900_000],
  'public/assets/radar.css':  [30_000, 300_000],
  'public/sw.js':             [3_000, 40_000],
  'public/biblia.json':       [3_000_000, 6_000_000],
  'public/busca/biblia.vec.bin':    [1_000_000, 20_000_000],
  'public/busca/biblia.idx.json':   [50_000, 2_000_000],
  'public/busca/mensagens.vec.bin': [10_000, 20_000_000],
  'public/manifest.json':     [100, 20_000],
  'public/icon-192.png':      [500, 500_000],
};
function checarEssenciais() {
  for (const [f, [min, max]] of Object.entries(ESSENCIAIS)) {
    const t = tamanho(f);
    if (!t) { falha(`ARQUIVO ESSENCIAL SUMIU: ${f}`); continue; }
    if (t < min) falha(`${f} está pequeno demais (${(t / 1024).toFixed(0)} KB) — parece truncado`);
    else if (t > max) falha(`${f} está grande demais (${(t / 1024).toFixed(0)} KB) — algo entrou sem querer`);
    else passou(`${f} — ${(t / 1024).toFixed(0)} KB`);
  }
}

/* ── 3. CRESCIMENTO SEM EXPLICAÇÃO ─────────────────────────────────────────
   Guardo o tamanho aprovado da última publicação. Variação grande não é
   proibida — mas TEM que ser vista. Foi assim que o index.html chegou a
   544 KB sem ninguém notar e o app demorava pra abrir.                     */
function checarCrescimento() {
  let marcos = {};
  try { marcos = JSON.parse(readFileSync(MARCOS, 'utf8')); } catch { /* 1ª vez */ }
  const agora = {};
  for (const f of Object.keys(ESSENCIAIS)) agora[f] = tamanho(f);

  for (const [f, t] of Object.entries(agora)) {
    const antes = marcos[f];
    if (!antes || !t) continue;
    const dif = ((t - antes) / antes) * 100;
    if (Math.abs(dif) >= 25) {
      avisa(`${f} mudou ${dif > 0 ? '+' : ''}${dif.toFixed(0)}% desde a última publicação `
        + `(${(antes / 1024).toFixed(0)} KB → ${(t / 1024).toFixed(0)} KB). Foi de propósito?`);
    }
  }
  return agora;   // quem publicar de verdade grava isto como o novo marco
}

/* ── 4. A VERSÃO TEM QUE BATER ─────────────────────────────────────────────
   O index.html pede /assets/app.js?v=149 e o service worker guarda em
   'radar-v149'. Se os dois discordam, o celular do irmão serve o JS velho
   junto com o HTML novo — e o app abre torto de um jeito impossível de
   entender olhando o código.                                               */
function checarVersao() {
  const html = ler('public/index.html');
  const sw = ler('public/sw.js');
  const vSw = (sw.match(/radar-v(\d+)/) || [])[1];
  if (!vSw) { falha('não achei a versão no sw.js (const V=\'radar-vNNN\')'); return; }

  // Todo arquivo NOSSO tem que carregar a MESMA versão. Se o lupa.js ficar em
  // ?v=145 enquanto o app.js vai pra ?v=149, subir a versão não limpa o lupa
  // do cache — e o irmão roda metade novo, metade velho. Foi exatamente esse o
  // estado encontrado em 21/09 (app 149, lupa 145, _uso 1).
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+?)\?v=(\d+)"/g)].map(m => ({ arq: m[1], v: m[2] }));
  const fora = refs.filter(r => r.v !== vSw);
  if (fora.length) {
    falha(`versão desencontrada — o sw.js está em v${vSw} mas estes ainda pedem versão velha:\n`
      + fora.map(r => `        ${r.arq}?v=${r.v}`).join('\n')
      + `\n      Deixe TODOS em ?v=${vSw} (um só número manda em tudo).`);
  } else {
    passou(`versão bate: v${vSw} no service worker e nos ${refs.length} arquivos do HTML`);
  }
}

/* ── 5. CHAVE NENHUMA PODE SAIR DAQUI ──────────────────────────────────────
   Chave em arquivo público é chave rifada — qualquer um lê no navegador.
   Já vazou token de GitHub uma vez neste PC; não se repete.                */
const ASSINATURAS = [
  [/\bsk-ant-api03-[A-Za-z0-9_\-]{20,}/, 'chave da Anthropic'],
  [/\bsk-proj-[A-Za-z0-9_\-]{30,}/, 'chave da OpenAI'],
  [/\bgsk_[A-Za-z0-9]{40,}/, 'chave da Groq'],
  [/\bAIza[A-Za-z0-9_\-]{30,}/, 'chave do Google'],
  [/\bcfut_[A-Za-z0-9]{30,}/, 'token da Cloudflare'],
  [/\bsbp_[a-f0-9]{40}/, 'token do Supabase'],
  [/\bpa-[A-Za-z0-9_\-]{30,}/, 'chave da Voyage'],
  [/\bghp_[A-Za-z0-9]{30,}/, 'token do GitHub'],
  [/\bre_[A-Za-z0-9_]{20,}/, 'chave do Resend'],
  [/postgres(ql)?:\/\/[^\s'"]+:[^\s'"@]+@/, 'senha de banco de dados'],
];
// nome que, por si só, já cheira a segredo — mesmo que a chave lá dentro esteja
// num formato que as ASSINATURAS não conhecem.
const NOME_DE_SEGREDO = /(^|\/)\.?(env|chaves?|segredos?|credenciais?|secrets?)[.\-_]|\.(pem|key|p12|pfx)$|token/i;

function checarSegredos() {
  // ── 5a. O QUE O GIT JÁ LEVA ────────────────────────────────────────────
  // O que está no .gitignore pode ter chave à vontade: o git não leva.
  const versionados = execSync('git ls-files', { cwd: RAIZ }).toString().trim().split('\n');
  const olhar = versionados.filter(f =>
    /\.(js|mjs|cjs|json|html|css|md|txt|yml|yaml)$/i.test(f) &&
    !f.startsWith('node_modules/') && !f.includes('.bak') && tamanho(f) < 3_000_000);

  let achou = 0;
  for (const f of olhar) {
    let src;
    try { src = ler(f); } catch { continue; }
    for (const [re, nome] of ASSINATURAS) {
      const m = src.match(re);
      if (m) {
        // o cofre e a documentação de configuração são o lugar CERTO da chave,
        // mas nenhum dos dois pode estar versionado. Se estiver, é erro grave.
        falha(`${nome.toUpperCase()} DENTRO DE ARQUIVO VERSIONADO: ${f} (${m[0].slice(0, 12)}…). `
          + `Tire a chave de lá e ponha no .gitignore.`);
        achou++;
      }
    }
  }
  if (!achou) passou(`nenhuma chave nos ${olhar.length} arquivos que vão pro git`);

  // ── 5b. O QUE ESTÁ NA BEIRADA, PRESTES A ENTRAR ────────────────────────
  // Olhar só `git ls-files` deixava um buraco do tamanho do mundo: arquivo NOVO
  // com chave dentro, ainda não versionado e ainda não no .gitignore, passava
  // batido — e o `git add -A` (o mesmo que já mandou 1.546 arquivos de
  // node_modules pro repositório em 21/09/2026) engolia ele sem ninguém ver.
  // `--others --exclude-standard` é exatamente "solto E não ignorado": a lista
  // do que um `git add -A` levaria AGORA. Usa a resolução de .gitignore do
  // próprio git, então quem já está protegido nem aparece aqui.
  const soltos = execSync('git ls-files --others --exclude-standard', { cwd: RAIZ })
    .toString().trim().split('\n').filter(Boolean)
    .filter(f => !f.startsWith('node_modules/') && tamanho(f) < 3_000_000);

  let achouSolto = 0;
  for (const f of soltos) {
    let src;
    // sem filtro de extensão aqui de propósito: `.env-teste` e `.chaves-teste.json`
    // são o caso típico, e um deles nem extensão tem. Se não for texto, ler() falha
    // ou vem lixo — e lixo não casa com as ASSINATURAS.
    try { src = ler(f); } catch { continue; }

    let casou = false;
    for (const [re, nome] of ASSINATURAS) {
      const m = src.match(re);
      if (m) {
        falha(`${nome.toUpperCase()} EM ARQUIVO SOLTO E DESPROTEGIDO: ${f} (${m[0].slice(0, 12)}…). `
          + `Ele NÃO está no git ainda, mas também NÃO está no .gitignore — um `
          + `"git add -A" leva ele junto com a chave. Ponha ${f} no .gitignore agora.`);
        achouSolto++;
        casou = true;
      }
    }
    // nome suspeito sem assinatura conhecida: avisa, não trava. Pode ser chave de
    // formato que eu não conheço, pode ser arquivo inocente com "token" no nome.
    if (!casou && NOME_DE_SEGREDO.test(f)) {
      avisa(`${f} tem cara de arquivo de chave e está fora do .gitignore. `
        + `Não achei chave conhecida dentro, mas confira — se for segredo, ignore o arquivo.`);
    }
  }
  if (!achouSolto) passou(`nenhuma chave nos ${soltos.length} arquivos soltos que um "git add -A" levaria`);
}

/* ── 6. LIXO QUE NÃO PODE SUBIR ────────────────────────────────────────────
   Aconteceu HOJE: 1.546 arquivos de node_modules entraram num commit.      */
function checarLixo() {
  const versionados = execSync('git ls-files', { cwd: RAIZ }).toString();
  const proibidos = [
    ['node_modules/', 'node_modules (pasta de biblioteca, não é nosso código)'],
    ['.env', 'arquivo .env (tem chave dentro)'],
    ['.vercel/', 'pasta .vercel'],
  ];
  for (const [p, nome] of proibidos) {
    const linhas = versionados.split('\n').filter(l => l.startsWith(p) || l.includes('/' + p));
    if (linhas.length) falha(`${nome} está no git (${linhas.length} arquivo${linhas.length > 1 ? 's' : ''}). `
      + `Rode: git rm -r --cached ${p.replace(/\/$/, '')}`);
  }
  if (!erros.some(e => e.includes('node_modules'))) passou('sem lixo no git');
}

/* ── 7. AS FUNÇÕES DA VERCEL CABEM? ────────────────────────────────────────
   O plano Hobby dá 12 funções. Na 13ª o deploy INTEIRO falha, e a mensagem
   da Vercel não diz qual. Melhor descobrir aqui.                           */
function checarLimiteVercel() {
  const fns = execSync('git ls-files api', { cwd: RAIZ }).toString().trim().split('\n')
    .filter(f => /^api\/[^/]+\.js$/.test(f));
  if (fns.length > 12) falha(`${fns.length} funções em api/ — a Vercel Hobby só deixa 12. `
    + `Junte alguma em api/edge.js ou mova pra api/_lib/ (que não conta).`);
  else if (fns.length === 12) avisa(`12 de 12 funções usadas na Vercel. Não dá pra criar mais nenhuma.`);
  else passou(`${fns.length} de 12 funções da Vercel`);
}

/* ── 8. O CÓDIGO PROCURA BOTÃO QUE NÃO EXISTE MAIS? ───────────────────────
   POR QUE EXISTE (23/09/2026, custou caro):
   tirei da tela o bloco do avatar e levei junto, sem enxergar, os botões
   "Copiar" e "Encerrar". O arranque da página faz `btnEncerrar.disabled=true`.
   Bateu em null, a página MORREU inteira antes de ligar o microfone, e o Elias
   ficou horas longe do PC com o globo mudo dizendo "Não consegui começar".
   A sintaxe estava perfeita — `node --check` passou feliz. Faltava justamente
   isto: conferir se o que o JavaScript PROCURA ainda está no HTML.

   Como funciona: em cada página, junta todo id que o código busca
   (`$('x')`, `$ou('x')`, `getElementById('x')`, `querySelector('#x')`) e
   confere se existe um `id="x"` no mesmo arquivo. É burro de propósito — só
   olha o arquivo, sem montar página nenhuma — e pega exatamente o erro que
   me pegou: alguém apaga um pedaço do HTML e esquece o código que fala com ele.   */
function checarBotoesSumidos() {
  const paginas = execSync('git ls-files public', { cwd: RAIZ }).toString().trim().split('\n')
    .filter(f => f.endsWith('.html'));

  for (const f of paginas) {
    const src = ler(f);
    // só vale pra página que tem script dentro; HTML puro não procura nada
    if (!/<script[\s>]/i.test(src)) continue;

    const temNoHtml = new Set();
    for (const m of src.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) temNoHtml.add(m[1]);
    // id posto por código também conta: `el.id='x'` / `setAttribute('id','x')`
    for (const m of src.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)) temNoHtml.add(m[1]);
    for (const m of src.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([^"']+)["']/g)) temNoHtml.add(m[1]);
    // id montado em pedaços ('linha-'+n) eu não tenho como adivinhar: ignoro abaixo.

    const procurados = new Map();   // id -> como foi procurado
    const guardar = (id, como) => { if (!procurados.has(id)) procurados.set(id, como); };
    for (const m of src.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) guardar(m[1], 'getElementById');
    // ⚠️ `\$ou?\(` estaria ERRADO: exigiria a letra "o", e deixaria passar o
    // `$('encerrar')` — justamente o que derrubou o globo. Tem que ser grupo.
    // O `[,)]` no fim não é enfeite: sem ele, o `$('v-'+n)` das páginas de
    // versículo entrava como se procurasse um id chamado "v-" — 4 alarmes
    // falsos. Exigindo vírgula ou fecha-parêntese logo depois das aspas, o id
    // montado em pedaços fica de fora, que é onde eu não tenho como adivinhar.
    for (const m of src.matchAll(/\$(?:ou)?\(\s*["']([^"']+)["']\s*[,)]/g)) guardar(m[1], '$()');
    for (const m of src.matchAll(/querySelector\(\s*["']#([A-Za-z][\w-]*)["']\s*\)/g)) guardar(m[1], 'querySelector');

    const sumidos = [...procurados.keys()].filter(id => !temNoHtml.has(id));
    if (sumidos.length) {
      falha(`${f}: o código procura ${sumidos.map(i => `"${i}"`).join(', ')}, `
        + `mas não existe id="${sumidos[0]}" nessa página. `
        + `Ou o HTML foi apagado por engano, ou o código ficou pra trás.`);
    } else if (procurados.size) {
      passou(`${f}: os ${procurados.size} elementos procurados pelo código estão na tela`);
    }
  }
}

/* ── relatório ─────────────────────────────────────────────────────────── */
function main() {
  console.log('\n🚦 TRAVA DO RADAR — conferindo antes de publicar\n');
  checarSintaxe();
  checarBotoesSumidos();
  checarEssenciais();
  const marcosAgora = checarCrescimento();
  checarVersao();
  checarSegredos();
  checarLixo();
  checarLimiteVercel();

  console.log(`   ✅ ${ok.length} conferências passaram`);
  for (const a of avisos) console.log(`   ⚠️  ${a}`);

  if (erros.length) {
    console.log(`\n🛑 NÃO PODE PUBLICAR — ${erros.length} problema${erros.length > 1 ? 's' : ''}:\n`);
    erros.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    console.log('\n   Conserte e rode de novo. Nada foi enviado.\n');
    process.exit(1);
  }

  if (process.argv.includes('--gravar-marcos')) {
    writeFileSync(MARCOS, JSON.stringify(marcosAgora, null, 1));
  }
  console.log(`\n✅ PODE PUBLICAR.${avisos.length ? ` (${avisos.length} aviso${avisos.length > 1 ? 's' : ''} acima — leia, mas não impedem)` : ''}\n`);
}

main();
