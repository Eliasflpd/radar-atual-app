// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULOS 1, 2 e 3 — TESTE DE NAVEGADOR DE PONTA A PONTA (MODO REAL)
// Rodado por testes/navegador.sh. Sobe aqui mesmo um servidor local que serve public/
// e encaminha POST /api/dados?fn=jovem para a função de verdade (api/_lib/jovem.js),
// ligada ao Postgres local descartável com as migrações 001 a 004 e o seed fictício.
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
            pre: 'rk_nav_pre_dddddddddddddddddddddddddd', pastor: 'rk_nav_pastor_eeeeeeeeeeeeeeeeeeeeeeee',
            rafael: 'rk_nav_rafael_ffffffffffffffffffffffff', lucas: 'rk_nav_lucas_gggggggggggggggggggggggg' };

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
  await db.query(ler('supabase/migrations/003_circulos.sql'));
  await db.query(ler('supabase/migrations/004_eventos.sql'));
  await db.query("set cj.permitir_seed_demo = 'sim'"); await db.query(ler('supabase/seed_demo.sql'));
  await db.query('create table radar_chaves(id bigserial primary key, user_key text not null, chave_hash text not null unique)');
  const tel = { coord: '99900000002', davi: '99900000007', novo: '99900000099', pre: '21998765432', pastor: '99900000001', rafael: '99900000004', lucas: '99900000009' };
  for (const k of Object.keys(K)) await db.query('insert into radar_chaves(user_key, chave_hash) values ($1, $2)', [tel[k], sha(K[k])]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.coord), id(2)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.davi), id(7)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.pastor), id(1)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.rafael), id(4)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovem.hashVinculo(tel.lucas), id(9)]);
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
  const foto = async (pg, nome, cheia = true) => { await espera(450); return pg.screenshot({ path: path.join(TELAS, 'real-' + nome + '.png'), fullPage: cheia }); };   // espera a animação de entrada (.28 s)
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

  console.log('\n6) Módulo 2 · Círculos com o banco');
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.davi, vp);
    await pg.goto(BASE + '/jovem/#/circulo'); await pg.waitForSelector('#circ-box .hero', { timeout: 8000 });
    confere((await pg.textContent('.hero h2')).includes('Círculo Esperança'), `[${tag}] Meu Círculo real (Davi → Esperança)`);
    confere(await pg.isVisible('text=Casa de família (endereço fictício)'), `[${tag}] integrante vê o local do encontro`);
    confere(await pg.locator('.cab .demo-pill').count() === 0, `[${tag}] Meu Círculo sem selo "Demonstração"`);
    await foto(pg, `meu-circulo-${tag}`);
    await ctx.close();
  }
  {
    const { ctx, pg } = await abrir(K.davi);
    await pg.goto(BASE + '/jovem/#/circulo'); await pg.waitForSelector('[data-acao="presenca-real"][data-v="sim"]');
    await pg.click('[data-acao="presenca-real"][data-v="sim"]'); await espera(1200);
    confere((await q(`select response from cj.meeting_rsvps where meeting_id = $1 and user_id = $2`, [id(151), id(7)]))[0].response === 'sim', 'Davi confirma presença (gravado)');
    await pg.click('#tela [data-acao="propor-real"]'); await espera(300);
    const d = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
    await pg.fill('#fe-data', d); await pg.fill('#fe-tema', 'Piquenique (navegador)'); await pg.click('dialog [type=submit]'); await espera(1500);
    confere((await q(`select status from cj.circle_meetings where theme = 'Piquenique (navegador)'`))[0].status === 'proposto', 'proposta do Davi gravada como "proposto"');
    confere(await pg.isVisible('text=aguardando o líder (sua proposta)'), 'Davi vê a proposta aguardando o líder');
    await ctx.close();
  }
  {
    const { ctx, pg } = await abrir(K.lucas);
    await pg.goto(BASE + '/jovem/#/circulo'); await pg.waitForSelector('[data-acao="troca-real"]');
    await pg.click('[data-acao="troca-real"]'); await pg.fill('#c-troca-r', 'Horário (navegador)'); await pg.click('#b-troca'); await espera(1500);
    confere((await q(`select change_requested from cj.circle_members where user_id = $1 and membership_status = 'ativo'`, [id(9)]))[0].change_requested === true, 'Lucas pede troca (gravado)');
    await pg.goto(BASE + '/jovem/#/encontrar-circulo'); await pg.waitForSelector('[data-acao="pedir-circulo"]');
    confere(!(await pg.isVisible('text=Casa de família')), 'lista de círculos sem local de encontro');
    await foto(pg, 'encontrar-circulo-360x800');
    await pg.click('.cartao:has-text("Círculo Esperança") [data-acao="pedir-circulo"]'); await espera(1500);
    confere(await pg.isVisible('text=Aguardando o líder'), 'Lucas pede entrada no Esperança');
    await ctx.close();
  }
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.rafael, vp);
    await pg.goto(BASE + '/jovem/#/lider-circulo'); await pg.waitForSelector('#gc-box .info-linhas', { timeout: 8000 });
    confere(await pg.isVisible('#gc-box >> text=Lucas M.') && !(await pg.isVisible('#gc-box >> text=Pediu troca')), `[${tag}] líder vê o pedido do Lucas, sem o pedido de troca`);
    await foto(pg, `lider-${tag}`);
    if (vp.width === 360) {
      await pg.click('[data-acao="decidir-membro"][data-v="ativo"]'); await espera(1500);
      confere((await q(`select circle_id from cj.circle_members where user_id = $1 and membership_status = 'ativo'`, [id(9)]))[0].circle_id === id(101), 'líder aceita: Lucas trocou para o Esperança');
      await pg.click('.cartao:has-text("Piquenique (navegador)") [data-acao="encontro-status"][data-v="confirmado"]'); await espera(1500);
      confere((await q(`select status from cj.circle_meetings where theme = 'Piquenique (navegador)'`))[0].status === 'confirmado', 'líder confirma a proposta do Davi');
      confere(await pg.isVisible('text=1 vai'), 'líder vê a presença confirmada do Davi');
    }
    await ctx.close();
  }
  {
    const { ctx, pg } = await abrir(K.davi);
    await pg.goto(BASE + '/jovem/#/lider-circulo'); await espera(1500);
    confere(await pg.isVisible('text=Área de líderes e auxiliares'), 'membro não abre a visão do líder');
    await pg.goto(BASE + '/jovem/#/circulos'); await espera(800);
    confere(await pg.isVisible('text=Área da equipe'), 'membro não abre a gestão de círculos');
    await ctx.close();
  }
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.coord, vp);
    await pg.goto(BASE + '/jovem/#/circulos'); await pg.waitForSelector('#cg-box .cartao-link', { timeout: 8000 });
    const esperados = vp.width === 360 ? 3 : 4;   // na 2ª volta já existe o círculo criado (pausado) na 1ª
    confere(await pg.locator('#cg-box .cartao-link').count() === esperados, `[${tag}] gestão lista os ${esperados} círculos do banco`);
    await foto(pg, `circulos-${tag}`);
    if (vp.width === 360) {
      await pg.click('#tela [data-acao="novo-circulo"]'); await espera(500);
      await pg.fill('#fc-nome', 'Círculo Farol (navegador)'); await pg.click('dialog .opcao:has-text("18–21")'); await pg.fill('#fc-lim', '6');
      await pg.selectOption('#fc-lider', { label: 'Marcos Lima (demo)' }); await pg.selectOption('#fc-aux', { label: 'Camila Souza (demo)' });
      await pg.click('dialog [type=submit]'); await pg.waitForURL(/#\/circulos\/[0-9a-f-]{36}/, { timeout: 8000 }); await pg.waitForSelector('#gc-box .info-linhas');
      const c = (await q(`select id, leader_id, assistant_id, max_members from cj.circles where name = 'Círculo Farol (navegador)'`))[0];
      confere(c && c.leader_id === id(6) && c.assistant_id === id(5) && c.max_members === 6, 'gestão cria círculo com líder e auxiliar (gravado)');
      await pg.click('[data-acao="adicionar-pessoa-circ"]'); await pg.waitForSelector('dialog [data-add]');
      await foto(pg, 'adicionar-pessoa-360x800', false);
      await pg.click('dialog li:has-text("Ana Barros") [data-add]'); await espera(1500);
      confere((await q(`select circle_id from cj.circle_members where user_id = $1 and membership_status = 'ativo'`, [id(8)]))[0].circle_id === c.id, 'gestão move a Ana para o novo círculo');
      await pg.click('[data-acao="status-circulo"][data-v="pausado"]'); await pg.click('#b-st'); await espera(1500);
      confere((await q(`select status from cj.circles where id = $1`, [c.id]))[0].status === 'pausado', 'gestão pausa o círculo');
      await foto(pg, 'circulo-gestao-360x800');
    }
    await ctx.close();
  }

  console.log('\n7) Módulo 3 · Eventos com o banco');
  const FUT = id(202), VAGA = id(204);
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.davi, vp);
    await pg.goto(BASE + '/jovem/#/eventos'); await pg.waitForSelector('#evj-box .ev', { timeout: 8000 });
    const titulos = await pg.locator('#evj-box .ev b').allTextContents();
    confere(titulos.some((t) => t.includes('Futebol da Juventude')) && !titulos.some((t) => t.includes('Planejamento interno')), `[${tag}] lista real de eventos (sem rascunho)`);
    confere(await pg.locator('.cab .demo-pill').count() === 0, `[${tag}] Eventos sem selo "Demonstração"`);
    await foto(pg, `eventos-${tag}`);
    await pg.click('[data-acao="filtro"][data-v="Esporte"]'); await espera(1200);
    confere(await pg.locator('#evj-box .ev').count() === 1, `[${tag}] filtro por categoria (Esporte) no servidor`);
    await pg.goto(BASE + '/jovem/#/evento/' + FUT); await pg.waitForSelector('#evd-box .hero', { timeout: 8000 });
    if (vp.width === 360) confere(await pg.isVisible('text=24 vagas disponíveis'), `[${tag}] detalhe com vagas reais`);
    else confere(await pg.isVisible('text=Inscrição confirmada.'), `[${tag}] detalhe mostra a inscrição feita`);
    await foto(pg, `evento-detalhe-${tag}`);
    if (vp.width === 360) {
      await pg.click('[data-acao="inscrever-real"]'); await espera(300);
      confere(await pg.locator('#evd-orient[aria-invalid="true"]').count() === 1, 'pede para confirmar as orientações');
      await pg.check('#evd-orient'); await pg.click('[data-acao="inscrever-real"]'); await pg.waitForSelector('text=Inscrição confirmada.', { timeout: 8000 });
      confere((await q('select status from cj.event_registrations where event_id = $1 and user_id = $2', [FUT, id(7)]))[0].status === 'confirmada', 'inscrição gravada (status decidido pelo servidor)');
      const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }), pg.click('[data-acao="agenda-real"]')]);
      const ics = fs.readFileSync(await dl.path(), 'utf8');
      confere(/\.ics$/.test(dl.suggestedFilename()) && /BEGIN:VCALENDAR/.test(ics) && /SUMMARY:Futebol da Juventude/.test(ics), 'baixa o .ics do servidor');
      await foto(pg, 'evento-inscrito-360x800');
    }
    await ctx.close();
  }
  {
    const lucas = await abrir(K.lucas);
    await lucas.pg.goto(BASE + '/jovem/#/evento/' + VAGA); await lucas.pg.waitForSelector('[data-acao="inscrever-real"]');
    await lucas.pg.click('[data-acao="inscrever-real"]'); await lucas.pg.waitForSelector('text=Inscrição confirmada.', { timeout: 8000 });
    const davi = await abrir(K.davi);
    await davi.pg.goto(BASE + '/jovem/#/evento/' + VAGA); await davi.pg.waitForSelector('[data-acao="inscrever-real"]');
    confere(await davi.pg.isVisible('text=Entrar na lista de espera'), 'evento lotado oferece a lista de espera');
    await davi.pg.click('[data-acao="inscrever-real"]'); await davi.pg.waitForSelector('text=Você está na lista de espera (1º)', { timeout: 8000 });
    confere(true, 'Davi entra na lista de espera (1º)');
    await foto(davi.pg, 'evento-lista-espera-360x800');
    await lucas.pg.reload(); await lucas.pg.waitForSelector('[data-acao="cancelar-insc-real"]');
    await lucas.pg.click('[data-acao="cancelar-insc-real"]'); await lucas.pg.click('#b-canc-insc'); await espera(1500);
    confere((await q('select status from cj.event_registrations where event_id = $1 and user_id = $2', [VAGA, id(7)]))[0].status === 'confirmada', 'Lucas cancela → Davi sobe da lista de espera');
    await davi.pg.reload(); await davi.pg.waitForSelector('#evd-box .hero');
    confere(await davi.pg.isVisible('text=Inscrição confirmada.'), 'Davi vê que foi confirmado');
    await lucas.ctx.close(); await davi.ctx.close();
  }
  // Bia (menor, sem crachá aqui) inscrita aguardando autorização — preparado pelo dono do banco.
  await q(`insert into cj.event_registrations(event_id, user_id, status, consent_status) values ($1, $2, 'aguardando_autorizacao', 'pendente')`, [FUT, id(11)]);
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.coord, vp);
    await pg.goto(BASE + '/jovem/#/eventos-gestao'); await pg.waitForSelector('#eg-box .cartao-link', { timeout: 8000 });
    confere(await pg.isVisible('#eg-box >> text=Futebol da Juventude (demo)'), `[${tag}] gestão lista os eventos do banco`);
    if (vp.width === 360) confere(await pg.isVisible('#eg-box >> text=autorização de responsável aguardando'), `[${tag}] alerta de autorização pendente`);
    await foto(pg, `gestao-eventos-${tag}`);
    await pg.goto(BASE + '/jovem/#/eventos-gestao/' + FUT); await pg.waitForSelector('#ge-box .kpis', { timeout: 8000 });
    await foto(pg, `gestao-evento-${tag}`);
    if (vp.width === 360) {
      await pg.click('[data-acao="autorizar-ev"][data-v="sim"]'); await espera(1500);
      confere((await q('select status, consent_status from cj.event_registrations where event_id = $1 and user_id = $2', [FUT, id(11)]))[0].status === 'confirmada', 'equipe aprova a autorização do responsável');
      await pg.fill('#ge-busca', 'bia'); await espera(200);
      confere(await pg.locator('#ge-lista > li:not([hidden])').count() === 1, 'busca no check-in filtra pelo nome (sem acento/caixa)');
      await pg.click('#ge-lista li:not([hidden]) [data-acao="presenca-ev"][data-v="entrada"]'); await espera(1500);
      confere((await q('select check_in_at from cj.event_registrations where event_id = $1 and user_id = $2', [FUT, id(11)]))[0].check_in_at !== null, 'check-in gravado');
      await pg.click('#ge-lista li:not([hidden]) [data-acao="presenca-ev"][data-v="saida"]'); await pg.waitForSelector('#b-ret');
      await pg.click('#b-ret'); await espera(200);
      confere(await pg.locator('#c-ret[aria-invalid="true"]').count() === 1, 'saída de menor pede quem retirou');
      await foto(pg, 'gestao-saida-menor-360x800', false);
      await pg.fill('#c-ret', 'Mãe (navegador)'); await pg.click('#b-ret'); await espera(1500);
      const r = (await q('select check_out_at, pickup_note from cj.event_registrations where event_id = $1 and user_id = $2', [FUT, id(11)]))[0];
      confere(r.check_out_at !== null && r.pickup_note === 'Mãe (navegador)', 'check-out com "retirado por" gravado');
      await foto(pg, 'gestao-checkin-360x800');
      // Novo evento: validação e criação
      await pg.goto(BASE + '/jovem/#/eventos-gestao'); await pg.waitForSelector('#eg-box [data-acao="novo-evento"]');
      await pg.click('#eg-box [data-acao="novo-evento"]'); await pg.waitForSelector('#f-ev');
      await pg.fill('#fv-di', ''); await pg.click('dialog [type=submit]'); await espera(200);
      confere(await pg.locator('#f-ev [aria-invalid="true"]').count() >= 3, 'validação do formulário de evento');
      await foto(pg, 'gestao-form-evento-360x800', false);
      const dia = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);
      await pg.fill('#fv-tit', 'Noite de louvor (navegador)'); await pg.selectOption('#fv-cat', 'culto'); await pg.fill('#fv-di', dia); await pg.fill('#fv-hi', '19:30');
      await pg.fill('#fv-cap', '30'); await pg.fill('#fv-loc', 'Templo (fictício)'); await pg.fill('#fv-men', 'Retirada só com o responsável.');
      await pg.click('dialog [type=submit]'); await pg.waitForURL(/#\/eventos-gestao\/[0-9a-f-]{36}/, { timeout: 8000 }); await pg.waitForSelector('#ge-box .kpis');
      const nv = (await q(`select id, status, capacity, age_bands::text[] as f, minor_rules from cj.events where title = 'Noite de louvor (navegador)'`))[0];
      confere(nv && nv.status === 'rascunho' && nv.capacity === 30 && nv.f.length === 3 && nv.minor_rules, 'gestão cria evento (rascunho, gravado)');
      await pg.click('[data-acao="status-evento"][data-v="publicado"]'); await espera(1500);
      confere((await q('select status from cj.events where id = $1', [nv.id]))[0].status === 'publicado', 'gestão publica o evento');
    }
    await ctx.close();
  }
  for (const vp of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    const tag = vp.width + 'x' + vp.height;
    const { ctx, pg } = await abrir(K.rafael, vp);
    await pg.goto(BASE + '/jovem/#/eventos-gestao'); await pg.waitForSelector('#eg-box .cartao-link', { timeout: 8000 });
    const t = await pg.locator('#eg-box .cartao-link h3').allTextContents();
    confere(t.length === 1 && t[0].includes('Encontro do Círculo Esperança'), `[${tag}] líder vê só os eventos do próprio círculo`);
    await foto(pg, `lider-eventos-${tag}`);
    if (vp.width === 360) {
      await pg.click('#eg-box [data-acao="novo-evento"]'); await pg.waitForSelector('#f-ev');
      confere(await pg.locator('#fv-circ option').count() === 1 && await pg.isHidden('#fv-fx'), 'formulário do líder: só o próprio círculo (faixa do círculo)');
      const dia = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
      await pg.fill('#fv-tit', 'Lanche do círculo (navegador)'); await pg.selectOption('#fv-cat', 'circulo'); await pg.fill('#fv-di', dia);
      await pg.click('dialog [type=submit]'); await pg.waitForURL(/#\/eventos-gestao\/[0-9a-f-]{36}/, { timeout: 8000 });
      const lv = (await q(`select circle_id, age_bands::text[] as f from cj.events where title = 'Lanche do círculo (navegador)'`))[0];
      confere(lv && lv.circle_id === id(101) && lv.f.join() === '18-21', 'líder cria evento do próprio círculo (gravado)');
    }
    await ctx.close();
  }
  {
    const { ctx, pg } = await abrir(K.davi);
    await pg.goto(BASE + '/jovem/#/eventos-gestao'); await espera(1500);
    confere(await pg.isVisible('text=Área da equipe e dos líderes'), 'membro não abre a gestão de eventos');
    await ctx.close();
  }

  const aud = (await q(`select distinct action from cj.audit_logs`)).map((x) => x.action);
  for (const a of ['consultar', 'ativar_perfil', 'conceder_papel', 'pre_cadastrar', 'vincular', 'criar_perfil', 'pedir_troca', 'pedir_entrada', 'decidir_membro', 'criar_circulo', 'adicionar_ao_circulo', 'pausar_circulo', 'criar_evento', 'publicar_evento', 'aprovar_autorizacao_evento', 'presenca_entrada', 'presenca_saida', 'promover_lista_espera']) confere(aud.includes(a), 'auditoria registrou: ' + a);
  confere(erros.filter((e) => !/Failed to load resource/.test(e)).length === 0, 'sem erros de JavaScript no console (' + erros.join(' | ') + ')');

  await browser.close(); srv.close(); await db.end();
  console.log(`\nScreenshots em ${TELAS}\nResultado: ${ok} passaram, ${falhas.length} falharam.`);
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
