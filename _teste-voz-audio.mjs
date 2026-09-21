// Harness de prova do motor de áudio da /biblioteca/voz — roda por node, sem navegador.
// 1) pede token efêmero na produção, 2) abre o WS do Gemini Live, 3) manda um turno de
// texto, 4) mede CADA pedaço de PCM que volta, 5) simula o agendador ANTIGO e o NOVO.
const ORIGEM = process.env.ORIGEM || 'https://radar-atual.vercel.app';
const TAXA_VOLTA = 24000;               // PCM de saída do Gemini Live
const PERGUNTA = process.argv[2] || 'Mestre, em uma resposta de uns vinte segundos: o que Tiago 1:2 ensina sobre alegria na provacao?';

const log = (...a) => console.log(...a);

async function token() {
  const r = await fetch(ORIGEM + '/api/voz', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'token', voz: 'Orus' }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'token negado');
  return j;
}

function sessao(t) {
  return new Promise((pronto, falhou) => {
    const ws = new WebSocket(t.url + '?access_token=' + encodeURIComponent(t.token));
    const pedacos = [];            // { tMs, bytes, durSeg }
    const eventos = [];
    let t0 = 0, setupEm = 0, primeiroAudio = 0;
    const fim = () => { try { ws.close(); } catch {} pronto({ pedacos, eventos, setupEm, primeiroAudio, t0 }); };
    const prazo = setTimeout(fim, 75000);

    ws.onopen = () => { t0 = Date.now(); ws.send(JSON.stringify({ setup: { model: t.modelo } })); };
    ws.onerror = (e) => { clearTimeout(prazo); falhou(new Error('erro de WS: ' + (e.message || ''))); };
    ws.onclose = (e) => { clearTimeout(prazo); eventos.push(['close', Date.now() - t0, e.code + ' ' + e.reason]); pronto({ pedacos, eventos, setupEm, primeiroAudio, t0 }); };

    ws.onmessage = async (ev) => {
      const txt = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
      let m; try { m = JSON.parse(txt); } catch { return; }
      const dt = Date.now() - t0;

      if (m.setupComplete) {
        setupEm = dt; eventos.push(['setupComplete', dt, '']);
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: PERGUNTA }] }], turnComplete: true } }));
        return;
      }
      if (m.toolCall) {
        eventos.push(['toolCall', dt, (m.toolCall.functionCalls || []).map(f => f.name).join(',')]);
        for (const fc of m.toolCall.functionCalls || []) {
          const r = await fetch(ORIGEM + '/api/voz', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acao: 'garimpo', assunto: (fc.args && fc.args.assunto) || '' }),
          }).then(r => r.json()).catch(() => ({}));
          ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { achou: !!r.achou, material: r.texto || '' } }] } }));
          eventos.push(['toolResponse', Date.now() - t0, 'achou=' + !!r.achou]);
        }
        return;
      }
      const sc = m.serverContent;
      if (sc) {
        if (sc.interrupted) eventos.push(['interrupted', dt, '']);
        for (const p of (sc.modelTurn && sc.modelTurn.parts) || []) {
          const d = p.inlineData;
          if (d && d.data) {
            const bytes = Buffer.from(d.data, 'base64').length;
            if (!primeiroAudio) primeiroAudio = dt;
            pedacos.push({ tMs: dt, bytes, durSeg: (bytes >> 1) / TAXA_VOLTA });
          }
        }
        if (sc.generationComplete) eventos.push(['generationComplete', dt, '']);
        if (sc.turnComplete) {
          eventos.push(['turnComplete', dt, 'pedacos_ate_aqui=' + pedacos.length]);
          setTimeout(fim, 1500);
        }
      }
      if (m.sessionResumptionUpdate && m.sessionResumptionUpdate.newHandle) eventos.push(['handle', dt, 'ok']);
      if (m.goAway) eventos.push(['goAway', dt, JSON.stringify(m.goAway)]);
    };
  });
}

// ── o agendador que o navegador usa: relógio do AudioContext andando em tempo real ──
function simular(pedacos, { duasSessoes = false } = {}) {
  const base = pedacos[0].tMs;
  let proximo = 0, ctx0 = base;
  const agenda = [];
  const chegadas = duasSessoes
    // duas sessões vivas = os MESMOS pedaços chegam duas vezes, com um atraso pequeno
    ? [...pedacos, ...pedacos.map(p => ({ ...p, tMs: p.tMs + 90, copia: true }))].sort((a, b) => a.tMs - b.tMs)
    : pedacos;
  for (const p of chegadas) {
    const agora = (p.tMs - ctx0) / 1000;                  // currentTime do AudioContext
    if (proximo < agora + 0.03) proximo = agora + 0.03;   // remonta a fila se atrasou
    agenda.push({ inicio: proximo, fim: proximo + p.durSeg, chegou: (p.tMs - base) / 1000, copia: !!p.copia });
    proximo += p.durSeg;
  }
  return agenda;
}

function conferir(agenda, nome) {
  let sobrepostos = 0, buracos = 0, pior = 0;
  for (let i = 1; i < agenda.length; i++) {
    const d = agenda[i].inicio - agenda[i - 1].fim;
    if (d < -1e-6) { sobrepostos++; pior = Math.min(pior, d); }
    else if (d > 0.031) buracos++;
  }
  const dur = agenda.reduce((s, a) => s + (a.fim - a.inicio), 0);
  log(`\n  ${nome}`);
  log(`    pedaços agendados : ${agenda.length}`);
  log(`    áudio total       : ${dur.toFixed(2)} s`);
  log(`    fim da fila       : ${agenda[agenda.length - 1].fim.toFixed(2)} s`);
  log(`    SOBREPOSIÇÕES     : ${sobrepostos}${sobrepostos ? '  (pior: ' + pior.toFixed(3) + ' s de áudio em cima do outro)' : ''}`);
  log(`    buracos > 31 ms   : ${buracos}`);
  return { sobrepostos, dur };
}

(async () => {
  log('→ pedindo token efêmero em ' + ORIGEM + '/api/voz …');
  const t = await token();
  log('  modelo: ' + t.modelo + ' · voz: ' + t.voz + ' · token ok\n');
  log('→ abrindo WebSocket com o Google e perguntando…');
  const r = await sessao(t);

  log('\n── LINHA DO TEMPO DA SESSÃO ──');
  for (const [q, ms, obs] of r.eventos) log(`  ${String(ms).padStart(6)} ms  ${q}${obs ? '  ' + obs : ''}`);

  if (!r.pedacos.length) { log('\n  NENHUM ÁUDIO CHEGOU.'); process.exit(1); }

  const total = r.pedacos.reduce((s, p) => s + p.durSeg, 0);
  const janela = (r.pedacos[r.pedacos.length - 1].tMs - r.pedacos[0].tMs) / 1000;
  log('\n── O QUE CHEGOU ──');
  log(`  pedaços de PCM     : ${r.pedacos.length}`);
  log(`  bytes              : ${r.pedacos.reduce((s, p) => s + p.bytes, 0)}`);
  log(`  áudio contido      : ${total.toFixed(2)} s`);
  log(`  chegou em (janela) : ${janela.toFixed(2)} s  →  ${(total / Math.max(janela, .001)).toFixed(1)}× mais rápido que o tempo real`);
  const int = [];
  for (let i = 1; i < r.pedacos.length; i++) int.push(r.pedacos[i].tMs - r.pedacos[i - 1].tMs);
  int.sort((a, b) => a - b);
  log(`  intervalo entre eles: mín ${int[0]} ms · mediana ${int[int.length >> 1]} ms · máx ${int[int.length - 1]} ms`);

  log('\n── SIMULAÇÃO DO AGENDAMENTO ──');
  const a = conferir(simular(r.pedacos), 'UMA sessão, fila com nextStartTime (o correto)');
  const b = conferir(simular(r.pedacos, { duasSessoes: true }), 'DUAS sessões vivas alimentando a MESMA fila');
  log(`\n  → com duas sessões a fila fica ${(b.dur / a.dur).toFixed(2)}× mais longa: ${b.dur.toFixed(1)} s de fala`);
  log(`    para ${a.dur.toFixed(1)} s de conteúdo. É a resposta saindo DUAS VEZES, picotada.`);

  log('\n── PRIMEIRAS 12 POSIÇÕES DA FILA (uma sessão) ──');
  log('     #   chegou(s)   start(s)     fim(s)   folga p/ anterior');
  simular(r.pedacos).slice(0, 12).forEach((x, i, arr) => {
    const folga = i ? (x.inicio - arr[i - 1].fim) : 0;
    log(`   ${String(i + 1).padStart(3)}   ${x.chegou.toFixed(3).padStart(8)}   ${x.inicio.toFixed(3).padStart(8)}   ${x.fim.toFixed(3).padStart(8)}   ${(folga * 1000).toFixed(3).padStart(8)} ms`);
  });
  log('');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
