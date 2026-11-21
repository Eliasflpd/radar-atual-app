// Teste da camada 4 (Tempo) e de que nada do que existia quebrou.
const { chromium } = require('playwright-core'); const fs = require('fs');
const S = process.argv[2]; const CR = fs.readFileSync(S + '/cracha-dev.txt', 'utf8').trim();
const ok = []; const falha = []; const conf = (c, m) => (c ? ok : falha).push(m);
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 860 } });
  await ctx.addInitScript((cr) => { localStorage.setItem('radar_chave', cr); sessionStorage.clear(); }, CR);
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await p.goto('http://localhost:8799/nexus/?ref=Jo%C3%A3o%201:1&ceu=universo');
  await p.waitForFunction(() => window.__ceuPrevia && window.__ceuPrevia._teste.pronto() && window.__ceuPrevia._teste.atlas(), null, { timeout: 120000 });
  const T = (f, ...a) => p.evaluate(([f, a]) => window.__ceuPrevia._teste[f](...a), [f, a]);
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('tempo'), null, { timeout: 30000 });
  await p.waitForTimeout(3000);
  let B = await p.evaluate(() => { const r = document.getElementById('ceu').getBoundingClientRect(); return { x: r.x, y: r.y }; });
  const cams = await T('camadas'); conf(cams.find((c) => c.id === 'tempo' && c.visivel), 'camada Tempo ligada no painel');
  conf(cams.find((c) => c.id === 'tempo').z > cams.find((c) => c.id === 'atlas').z, 'Tempo acima do Atlas');
  await p.screenshot({ path: S + '/camadas/t4-geral.png' });
  // busca exata de acontecimento
  conf(await T('buscar', 'Torre de Babel'), 'busca "Torre de Babel" acha'); await p.waitForTimeout(1600);
  const f1 = await T('fichaCamada'); conf(f1 && f1.id === 'tempo' && f1.versos > 0, 'ficha do acontecimento abre com versículos acesos: ' + JSON.stringify(f1));
  const txt = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/Torre de Babel/.test(txt) && /a\.C\./.test(txt) && /Theographic/.test(txt), 'ficha mostra título, data e fonte');
  await p.screenshot({ path: S + '/camadas/t4-babel.png' });
  // pairar sobre um acontecimento: informação e fios
  const r = await T('buscaCamada', 'tempo', 'Êxodo do Egito'); conf(r && r.pont === 100, 'acha Êxodo do Egito pelo nome em português');
  await T('buscar', 'Êxodo do Egito'); await p.waitForTimeout(1600);
  const pt = await T('telaCamada', 'tempo', r.i);
  if (pt) { await p.mouse.move(B.x + pt.x, B.y + pt.y); await p.waitForTimeout(400); const inf = await p.evaluate(() => { const e = document.querySelector('.cu-info'); return e.hidden ? '' : e.innerText; }); conf(/Êxodo do Egito/.test(inf), 'passar o mouse mostra o acontecimento: ' + inf.slice(0, 80)); }
  else falha.push('Êxodo fora da tela');
  await p.screenshot({ path: S + '/camadas/t4-exodo.png' });
  // CAMADA 5 · Personagens
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('personagens'), null, { timeout: 30000 });
  const rd = await T('buscaCamada', 'personagens', 'Davi'); conf(rd && rd.pont === 100, 'acha Davi em Personagens');
  conf(await T('buscar', 'Davi'), 'busca Davi'); await p.waitForTimeout(1600);
  const f5 = await T('fichaCamada'); conf(f5 && f5.id === 'personagens' && f5.versos > 100, 'ficha de Davi com versículos: ' + JSON.stringify(f5));
  const t5 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/Jessé/.test(t5) && /Salomão/.test(t5), 'família de Davi (Jessé, Salomão) na ficha');
  await p.screenshot({ path: S + '/camadas/t5-davi.png' });
  // clicar no pai abre a ficha dele (ligação dentro da camada)
  await p.evaluate(() => { const b = [...document.querySelectorAll('.cu-invest [data-camada]')].find((x) => /Jessé/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(1300);
  const t6 = await p.evaluate(() => document.querySelector('.cu-invest h3').innerText); conf(/Jessé/.test(t6), 'clicar em Jessé abre a ficha dele: ' + t6);
  // ligação Tempo -> Personagens: do Êxodo para Moisés
  await T('buscar', 'Êxodo do Egito'); await p.waitForTimeout(1300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.cu-invest [data-camada="personagens"]')].find((x) => /Moisés/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(1300);
  const t7 = await p.evaluate(() => document.querySelector('.cu-invest h3').innerText); conf(/Moisés/.test(t7), 'do Êxodo (Tempo) para Moisés (Personagens): ' + t7);
  await p.screenshot({ path: S + '/camadas/t5-moises.png' });
  conf(await T('buscar', 'Rute'), 'busca Rute'); await p.waitForTimeout(800); const cR = await T('composicao'); conf(cR.livro === 'Rute', 'nome exato de livro continua indo ao livro (Rute)');
  // CAMADA 6 · Línguas originais
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('linguas'), null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  conf(await T('buscar', 'h2617'), 'busca Strong H2617'); await p.waitForTimeout(1600);
  const f8 = await T('fichaCamada'); conf(f8 && f8.id === 'linguas' && f8.versos > 200, 'ficha de chesed com versículos acesos: ' + JSON.stringify(f8));
  const t8 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/STEPBible/.test(t8) && /hebraico/.test(t8), 'ficha diz língua e fonte: ' + t8.slice(0, 90).split(String.fromCharCode(10)).join(' '));
  await p.screenshot({ path: S + '/camadas/t6-chesed.png' });
  conf(await T('buscar', 'agape'), 'busca pela transliteração agape'); await p.waitForTimeout(1500);
  const t9 = await p.evaluate(() => document.querySelector('.cu-invest h3').innerText); conf(t9.normalize('NFC').includes('ἀγάπη'.normalize('NFC')), 'agape abre ἀγάπη: ' + t9);
  const pl = await T('telaCamada', 'linguas', (await T('fichaCamada')).i);
  B = await p.evaluate(() => { const r = document.getElementById('ceu').getBoundingClientRect(); return { x: r.x, y: r.y }; });
  if (pl) { await p.mouse.move(B.x + pl.x, B.y + pl.y); await p.waitForTimeout(400); const inf = await p.evaluate(() => { const e = document.querySelector('.cu-info'); return e.hidden ? '' : e.innerText; }); conf(/agap/i.test(inf.normalize('NFD').replace(/[̀-ͯ]/g, '')), 'passar o mouse em ἀγάπη: ' + inf.slice(0, 60).split(String.fromCharCode(10)).join(' ')); }
  await p.screenshot({ path: S + '/camadas/t6-agape.png' });
  // CAMADA 7 · História e cultura
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('historia'), null, { timeout: 30000 });
  conf(await T('buscar', 'Páscoa'), 'busca Páscoa'); await p.waitForTimeout(1600);
  const f10 = await T('fichaCamada'); conf(f10 && f10.id === 'historia' && f10.versos > 5, 'ficha da Páscoa (História): ' + JSON.stringify(f10));
  const t10 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/Easton/.test(t10) && /1897/.test(t10), 'ficha cita o Easton e o aviso de 1897');
  await p.screenshot({ path: S + '/camadas/t7-pascoa.png' });
  conf(await T('buscar', 'Siquém'), 'busca Siquém'); await p.waitForTimeout(3500); const tS = await T('terra'); conf(tS, 'nome exato de lugar (Siquém) ainda voa ao globo: ' + JSON.stringify(tS));
  await T('sairTerra'); await p.waitForTimeout(1000);
  // CAMADA 8 · Manuscritos
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('manuscritos'), null, { timeout: 30000 });
  conf(await T('buscar', 'variantes'), 'busca variantes'); await p.waitForTimeout(1600);
  const f11 = await T('fichaCamada'); conf(f11 && f11.id === 'manuscritos', 'ficha de crítica textual: ' + JSON.stringify(f11));
  const t11 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/STEPBible/.test(t11) && /Marcos 16:8/.test(t11), 'o versículo com mais diferença é Mc 16:8 (fim de Marcos): ' + t11.slice(0, 60).split(String.fromCharCode(10)).join(' '));
  await p.screenshot({ path: S + '/camadas/t8-marcos.png' });
  const i537 = await p.evaluate(() => { const c = window.__ceuPrevia._teste; return null; });
  // CAMADA 9 · Teologia
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('teologia'), null, { timeout: 30000 });
  conf(await T('buscar', 'Justificação'), 'busca Justificação'); await p.waitForTimeout(1600);
  const f12 = await T('fichaCamada'); conf(f12 && f12.id === 'teologia' && f12.versos > 5, 'ficha da Justificação (Teologia): ' + JSON.stringify(f12));
  const t12 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/reformada/.test(t12) && /interpreta/.test(t12), 'ficha avisa que é interpretação reformada do séc. XIX');
  await p.screenshot({ path: S + '/camadas/t9-justificacao.png' });
  conf(await T('buscar', 'Deus'), 'busca Deus'); await p.waitForTimeout(1500); const f13 = await T('fichaCamada'); conf(f13 && f13.id === 'teologia' && f13.versos > 1000, 'Deus na Teologia, com as menções: ' + JSON.stringify(f13));
  // CAMADA 10 · Tradição
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('tradicao'), null, { timeout: 30000 });
  conf(await T('buscar', 'Catecismo de Heidelberg'), 'busca Catecismo de Heidelberg'); await p.waitForTimeout(1600);
  const f14 = await T('fichaCamada'); conf(f14 && f14.id === 'tradicao' && f14.versos > 3, 'ficha do Catecismo de Heidelberg: ' + JSON.stringify(f14));
  const t14 = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/1563/.test(t14) && /Linha do tempo/i.test(t14) && /Credo Niceno/.test(t14), 'ficha com ano e linha do tempo (inclui o Credo Niceno)');
  await p.screenshot({ path: S + '/camadas/t10-heidelberg.png' });
  const cs = await T('camadas'); conf(cs.filter((c) => c.visivel).length >= 10, 'as 10 camadas ligadas: ' + cs.filter((c) => c.visivel).map((c) => c.id).join(','));
  // INTERLIGAÇÃO
  await p.waitForFunction(() => window.__ceuPrevia._teste.camadaPronta('linguas'), null, { timeout: 30000 }); await p.waitForTimeout(3000);
  await T('fichaVerso', 43003016); await p.waitForTimeout(1500);   // João 3:16
  const tv = await p.evaluate(() => document.querySelector('.cu-invest').innerText);
  conf(/João 3:16/.test(tv) && /Línguas originais/.test(tv) && /Tradição/.test(tv) && /Teologia/.test(tv), 'João 3:16 nas camadas (línguas, teologia, tradição): ' + tv.slice(0, 160).split(String.fromCharCode(10)).join(' | '));
  conf(/ἀγαπάω|κόσμος|μονογενής/.test(tv.normalize('NFC')), 'palavras gregas de Jo 3:16 aparecem (ἀγαπάω, κόσμος ou μονογενής)');
  conf((await T('fiosCamada')) > 5, 'fios sobem do versículo até as folhas: ' + await T('fiosCamada'));
  await p.screenshot({ path: S + '/camadas/ti-jo316.png' });
  conf(await T('buscar', 'Davi'), 'busca Davi (interligação)'); await p.waitForTimeout(1800);
  const ti = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/Ligações nas outras camadas/i.test(ti), 'ficha de Davi traz ligações nas outras camadas');
  conf((await T('fiosEntre')) > 3, 'fios de item para item entre as folhas: ' + await T('fiosEntre'));
  await p.screenshot({ path: S + '/camadas/ti-davi.png' });
  conf(await T('buscar', 'Êxodo'), 'livro Êxodo'); await p.waitForTimeout(1500); const tl = await p.evaluate(() => document.querySelector('.cu-invest').innerText); conf(/Nas outras camadas/i.test(tl), 'livro composto traz as outras camadas');
  // o que já existia continua funcionando
  conf(await T('buscar', 'Êxodo'), 'livro Êxodo ainda compõe as camadas'); await p.waitForTimeout(1500);
  const comp = await T('composicao'); conf(comp.livro === 'Êxodo' && comp.lugaresAcesos > 0, 'composição do livro: ' + JSON.stringify(comp));
  const lf = await T('lugarNaFrase', 'jesus no getsemani'); conf(lf && /Gets/.test(lf.nome), 'frase com lugar ainda acha o Getsêmani');
  await T('definirCamada', 'tempo', false); await p.waitForTimeout(300); const c2 = await T('camadas'); conf(!c2.find((c) => c.id === 'tempo').visivel, 'desligar a camada Tempo funciona');
  await T('definirCamada', 'tempo', true, 0.75);
  await T('irPara', 0, 0, 22000); await p.waitForTimeout(1500);
  const fps = await T('fpsMedio'); conf(fps >= 40, 'fps com Tempo ligado: ' + fps);
  conf(!erros.length, 'sem erros na página: ' + erros.slice(0, 3).join(' | '));
  console.log('OK', ok.length, '\n' + ok.join('\n')); console.log('FALHAS', falha.length, '\n' + falha.join('\n'));
  await b.close();
})();
