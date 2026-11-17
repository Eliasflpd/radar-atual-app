// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 1 — TESTE DE NAVEGADOR DE PONTA A PONTA (MODO REAL)
// Rodado por testes/navegador.sh. Sobe aqui mesmo um servidor local que serve public/
// e encaminha POST /api/dados?fn=jovem para a função de verdade (api/_lib/jovem.js),
// ligada ao Postgres local descartável com as migrações 001 + 002 e o seed fictício.
// O "crachá do Radar" é posto no localStorage do Chromium, como o Radar faz.
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Pacote "playwright" não encontrado (ponha no NODE_PATH).'); process.exit(2); }
if (!process.env.CJ_PGHOST) { console.error('Rode pelo testes/navegador.sh.'); process.exit(2); }

const RAIZ = path.resolve(__dirname, '..');
const PUBLICO = path.resolve(RAIZ, '..', 'public');
const TELAS = process.env.CJ_TELAS || fs.mkdtempSync('/tmp/cj-telas-');
fs.mkdirSync(TELAS, { recursive: true });
const CONEXAO = { host: process.env.CJ_PGHOST, port: Number(process.env.CJ_PGPORT), user: 'postgres', database: 'cj_nav' };
process.env.CJ_VINCULO_SEGREDO = 'segredo-de-teste-local-com-mais-de-32-caracteres';
const jovem = require(path.resolve(RAIZ, '..', 'api/_lib/jovem.js'));

const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const chaveFalsa = {
  sha,
  segredoLimpo: (v) => (/^rk_[A-Za-z0-9_-]{20,120}$/.test(String(v || '').trim()) ? String(v).trim() : ''),
  daRequisicao(req) { return this.segredoLimpo((req.headers || {})['x-radar-chave']); },
  pareceTelefone: (k) => /^\d{8,}$/.test(String(k || ''))
};
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
// Crachás e telefones FICTÍCIOS (prefixo 999 não existe).
const K = { coord: 'rk_nav_coord_aaaaaaaaaaaaaaaaaaaaaaaa', davi: 'rk_nav_davi_bbbbbbbbbbbbbbbbbbbbbbbbb', novo: 'rk_nav_novo_cccccccccccccccccccccccc',
            pre: 'rk_nav_pre_dddddddddddddddddddddddddd', pastor: 'rk_nav_pastor_eeeeeeeeeeeeeeeeeeeeeeee' };

let ok = 0; const falhas = [];
function confere(c, nome) { if (c) { ok++; console.log('  ✔ ' + nome); } else { falhas.push(nome); console.log('  ✘ ' + nome); } }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

async function prepararBanco() {
  const adm = new Client({ ...CONEXAO, database: 'postgres' });
  await adm.connect(); await adm.query('drop database if exists cj_nav'); await adm.query('create database cj_nav'); await adm.end();
  const db = new Client(CONEXAO); await db.connect();
  const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
  await db.query('set client_min_messages = warning');
  await db.query(fs.readFileSync(path.join(__dirname, '00_supabase_minimo.sql'), 'utf8'));
  await db.query(ler('supabase/migrations/001_conexao_jovem.sql'));
  await db.query(ler('supabase/migrations/002_gestao_pessoas.sql'));
  await db.query("set cj.permitir_seed_demo = 'sim'"); await db.query(ler('supabase/seed_demo.sql'));
  await db.query('create table radar_chaves(id bigserial primary key, user_key text not null, chave_hash text not null unique)');
  const tel = { coord: '99900000002', davi: '99900000007', novo: '99900000099', pre: '21998765432', pastor: '99900000001' };
  for (const k of Object.keys(K)) await db.query('insert into radar_chaves(user_key, chave_hash) values ($1, $2)', [tel[k], sha(K[k])]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.coord), id(2)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.davi), id(7)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.pastor), id(1)]);
  return db;
}

function servidor() {
  const h = jovem.criarHandler({ chave: chaveFalsa, conectar: async () => { const c = new Client(CONEXAO); await c.connect(); return c; } });
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/dados' && url.searchParams.get('fn') === 'jovem') {
      let corpo = '';
      req.on('data', (d) => { corpo += d; });
      req.on('end', () => {
        const r = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return this; }, json(b) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return this; } };
        h({ method: req.method, headers: req.headers, body: corpo }, r);
      });
      return;
    }
    let arq = path.join(PUBLICO, decodeURIComponent(url.pathname));
    if (!arq.startsWith(PUBLICO)) { res.statusCode = 403; res.end(); return; }
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
    if (!fs.existsSync(arq)) { res.statusCode = 404; res.end('não encontrado'); return; }
    res.setHeader('Content-Type', TIPOS[path.extname(arq)] || 'application/octet-stream');
    fs.createReadStream(arq).pipe(res);
  });
}

(async () => {
  const db = await prepararBanco();
  const srv = servidor(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();
  const erros = [];
  async function abrir(cracha, vp = { width: 360, height: 800 }) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, locale: 'pt-BR' });
    if (cracha) await ctx.addInitScript((k) => { localStorage.setItem('radar_chave', k); }, cracha);
    const pg = await ctx.newPage();
    pg.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    pg.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
    return { ctx, pg };
  }
  const foto = (pg, nome, cheia = true) => pg.screenshot({ path: path.join(TELAS, 'real-' + nome + '.png'), fullPage: cheia });
  const q = async (sql, p) => (await db.query(sql, p)).rows;

  console.log('\n1) Coordenação (youth_admin) na tela Pessoas, com o banco');
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.coord, vp);
    await pg.goto(BASE + '/jovem/#/pessoas'); await pg.waitForSelector('.pessoas li', { timeout: 8000 });
    confere(await pg.locator('.pessoas li').count() === 13, `[${tag}] lista real com as 13 pessoas do seed`);
    confere(await pg.locator('.cab .demo-pill').count() === 0, `[${tag}] sem selo "Demonstração" na tela ligada ao banco`);
    await foto(pg, `pessoas-${tag}`);
    await pg.goto(BASE + '/jovem/#/perfil'); await pg.waitForSelector('.perfil-topo h2');
    confere((await pg.textContent('.perfil-topo h2')).includes('Coordenadora Lia'), `[${tag}] Perfil mostra o perfil real`);
    await foto(pg, `perfil-${tag}`);
    await ctx.close();
  }
  {
    const { ctx, pg } = await abrir(K.coord);
    await pg.goto(BASE + '/jovem/#/pessoas'); await pg.waitForSelector('.pessoas li');
    await pg.click('[data-acao="filtro-pessoas"][data-v="pendente"]'); await espera(800);
    confere(await pg.locator('.pessoas li').count() === 1, 'filtro Pendentes (banco) → Jonas');
    await pg.click('[data-acao="aprovar-pessoa"]'); await espera(1200);
    confere((await q('select status from cj.profiles where id = $1', [id(13)]))[0].status === 'ativo', 'Aprovar grava "ativo" no banco');
    await pg.click('[data-acao="filtro-pessoas"][data-v="todos"]'); await espera(900);
    await pg.click('.pessoa-bt:has-text("Ana Barros")'); await espera(400);
    confere(await pg.locator('dialog [data-papel]').count() === 2, 'coordenação vê só Líder e Auxiliar (pode_conceder do banco)');
    await pg.click('dialog .interruptor:has-text("Auxiliar") .chave'); await espera(1400);
    confere((await q(`select count(*)::int n from cj.roles where user_id = $1 and role = 'assistant'`, [id(8)]))[0].n === 1, 'papel Auxiliar gravado no banco');
    await foto(pg, 'pessoa-detalhe-coordenacao', false);
    await pg.click('dialog [data-fechar]');
    await pg.click('#tela [data-acao="cadastrar-pessoa"]'); await espera(300);
    await pg.fill('#m-nome', 'Maria Pré (teste)'); await pg.fill('#m-fone', '+55 (21) 99876-5432'); await pg.click('dialog .opcao:has-text("18–21")');
    await pg.click('dialog [type=submit]'); await espera(1500);
    confere(await pg.isVisible('.pessoa-bt:has-text("Maria Pré")'), 'pré-cadastro pelo WhatsApp aparece na lista');
    const linha = (await q(`select radar_key_hash, vinculado_em from cj.profiles where display_name = 'Maria Pré (teste)'`))[0];
    confere(linha && linha.vinculado_em === null && !/9876/.test(linha.radar_key_hash), 'banco guarda só o HMAC, sem vínculo ainda');
    await pg.click('.pessoa-bt:has-text("Pastor Samuel")'); await espera(400);
    await pg.click('dialog [data-op="desativar_pessoa"]'); await pg.click('#b-sim'); await espera(1200);
    confere(await pg.isVisible('dialog #m-erro:has-text("só o pastor")'), 'banco recusa: coordenação não desativa o pastor (mensagem clara)');
    await ctx.close();
  }

  console.log('\n2) Pessoa pré-cadastrada entra no Radar com aquele número');
  {
    const { ctx, pg } = await abrir(K.pre);
    await pg.goto(BASE + '/jovem/#/boas-vindas'); await espera(1500);
    confere(await pg.isVisible('.toast:has-text("Encontramos o seu cadastro")'), 'aviso "Encontramos o seu cadastro"');
    confere(await pg.isVisible('text=Continuar como Maria'), 'entra sem refazer cadastro');
    await foto(pg, 'pre-cadastro-vinculado', false);
    confere((await q(`select vinculado_em from cj.profiles where display_name = 'Maria Pré (teste)'`))[0].vinculado_em !== null, 'vínculo gravado');
    await pg.goto(BASE + '/jovem/#/consentimento'); await pg.waitForSelector('#c-regras');
    await pg.check('#c-regras'); await pg.click('[data-acao="consentir-real"]'); await espera(1500);
    confere((await q(`select count(*)::int n from cj.term_acceptances t join cj.profiles p on p.id = t.user_id where p.display_name = 'Maria Pré (teste)'`))[0].n === 3, 'termos aceitos gravados');
    await ctx.close();
  }

  console.log('\n3) Pessoa com cadastro no Radar e sem perfil no Conexão Jovem');
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {   // 390 primeiro: só a foto, antes de entrar
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.novo, vp);
    await pg.goto(BASE + '/jovem/#/entrar'); await pg.waitForSelector('#f-entrar-real');
    await foto(pg, `entrar-${tag}`);
    if (vp.width === 360) {
      await pg.click('#f-entrar-real [type=submit]'); await espera(200);
      confere(await pg.locator('#f-entrar-real [aria-invalid="true"]').count() >= 2, 'validação da entrada');
      await pg.fill('#r-nome', 'Jovem Novo (teste)'); await pg.click('.opcao:has-text("15–17")'); await pg.check('#r-aceite');
      await pg.click('#f-entrar-real [type=submit]'); await pg.waitForURL(/consentimento/, { timeout: 8000 });
      confere(true, 'entrou e foi para o consentimento (menor de idade)');
      await pg.waitForSelector('#f-consent');
      await pg.fill('#rc-resp', 'Responsável Fictício'); await pg.fill('#rc-cont', 'responsavel@exemplo.invalid');
      await pg.click('#f-consent [type=submit]'); await espera(1500);
      confere(await pg.isVisible('text=Aguardando a equipe'), 'pedido de autorização do responsável enviado');
      await foto(pg, `consentimento-menor-${tag}`);
      const p = (await q(`select status, age_band, vinculado_em is not null as v from cj.profiles where display_name = 'Jovem Novo (teste)'`))[0];
      confere(p && p.status === 'pendente' && p.age_band === '15-17' && p.v, 'perfil nasce pendente e vinculado');
    }
    await ctx.close();
  }

  console.log('\n4) Membro comum (Davi) não tem a tela Pessoas');
  {
    const { ctx, pg } = await abrir(K.davi);
    await pg.goto(BASE + '/jovem/#/pessoas'); await espera(1500);
    confere(await pg.isVisible('text=Área da equipe'), 'Davi vê "Área da equipe" (sem lista)');
    await pg.goto(BASE + '/jovem/#/mais'); await espera(500);
    confere(!(await pg.isVisible('#tela a[href="#/pessoas"]')), 'menu Mais sem "Pessoas" para membro');
    await ctx.close();
  }

  console.log('\n5) Pastor concede Proteção');
  {
    const { ctx, pg } = await abrir(K.pastor);
    await pg.goto(BASE + '/jovem/#/pessoas'); await pg.waitForSelector('.pessoas li');
    await pg.click('.pessoa-bt:has-text("Lucas Mendes")'); await espera(400);
    confere(await pg.locator('dialog [data-papel]').count() === 5, 'pastor vê os 5 papéis');
    await pg.click('dialog .interruptor:has-text("Proteção") .chave'); await espera(1400);
    confere((await q(`select count(*)::int n from cj.roles where user_id = $1 and role = 'safeguarding_admin'`, [id(9)]))[0].n === 1, 'Proteção gravada no banco');
    await foto(pg, 'pessoa-detalhe-pastor', false);
    await ctx.close();
  }

  const aud = (await q(`select distinct action from cj.audit_logs`)).map((x) => x.action);
  for (const a of ['consultar', 'ativar_perfil', 'conceder_papel', 'pre_cadastrar', 'vincular', 'criar_perfil']) confere(aud.includes(a), 'auditoria registrou: ' + a);
  confere(erros.filter((e) => !/Failed to load resource/.test(e)).length === 0, 'sem erros de JavaScript no console (' + erros.join(' | ') + ')');

  await browser.close(); srv.close(); await db.end();
  console.log(`\nScreenshots em ${TELAS}\nResultado: ${ok} passaram, ${falhas.length} falharam.`);
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
