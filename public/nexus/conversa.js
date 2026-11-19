// NEXUS BÍBLICO — barra lateral "Pergunte ao Claude" (19/11/2026).
// Conversa para tirar dúvidas de uso do NEXUS e pedir ajuda nos estudos. Passa pelo servidor (ação "conversar"),
// que usa a camada de IA do NEXUS (orçamento mensal, registro de custo, reaproveitamento). Exige a porta da
// biblioteca (crachá ou PIN), porque tem custo. Vai para a IA só o que você escreve e o NOME da passagem em foco;
// nenhum trecho da biblioteca e nenhum ponteiro de obra externa (Gingrich) é enviado.
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHAVE = 'nexus_conversa';
let historico = [];
try { historico = JSON.parse(sessionStorage.getItem(CHAVE) || '[]'); } catch (_) { historico = []; }
const guardar = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(historico.slice(-20))); } catch (_) { /* sem armazenamento */ } };

const SUGESTOES = ['Como uso o mapa e o Céu Infinito?', 'O que quer dizer "evidência direta" e "hipótese"?', 'Me ajude a estudar a passagem em foco', 'Monte um roteiro de estudo para esta semana'];

function paragrafos(t) { return esc(t).split(/\n\s*\n/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join(''); }

function montar() {
  const lado = document.createElement('aside');
  lado.className = 'conversa'; lado.id = 'conversa'; lado.hidden = true;
  lado.setAttribute('aria-label', 'Pergunte ao Claude');
  lado.innerHTML = `<div class="conversa-topo"><div><b>Pergunte ao Claude</b><small>dúvidas do NEXUS e ajuda nos estudos</small></div><button class="painel-fechar" id="conversa-fechar" aria-label="Fechar a conversa">×</button></div>
    <div class="conversa-msgs" id="conversa-msgs" aria-live="polite"></div>
    <form class="conversa-form" id="conversa-form"><textarea id="conversa-txt" rows="2" maxlength="1500" placeholder="Escreva sua pergunta…" aria-label="Sua pergunta"></textarea><button class="bt bt-ouro" type="submit">Enviar</button></form>
    <p class="conversa-nota">Respostas do Claude a partir do conhecimento geral dele, <b>não conferidas nas fontes da biblioteca</b>. Para evidências, use Descobrir e Explicar.</p>`;
  document.querySelector('.palco').appendChild(lado);
  return lado;
}

function desenhar() {
  const caixa = document.getElementById('conversa-msgs');
  if (!historico.length) {
    caixa.innerHTML = `<div class="conversa-boas">Olá! Posso explicar como usar o NEXUS ou ajudar no seu estudo. Por onde começamos?</div>` +
      SUGESTOES.map((s) => `<button class="conversa-sug" data-sug="${esc(s)}">${esc(s)}</button>`).join('');
  } else {
    caixa.innerHTML = historico.map((m) => `<div class="msg ${m.papel === 'eu' ? 'msg-eu' : 'msg-claude'}">${m.papel === 'eu' ? esc(m.texto) : paragrafos(m.texto)}${m.nota ? `<small>${esc(m.nota)}</small>` : ''}</div>`).join('');
  }
  caixa.scrollTop = caixa.scrollHeight;
}

async function enviar(texto) {
  texto = String(texto || '').trim().slice(0, 1500);
  if (!texto) return;
  historico.push({ papel: 'eu', texto });
  historico.push({ papel: 'claude', texto: 'Pensando…', pendente: true });
  desenhar();
  const ctx = typeof window.NEXUS_CONTEXTO === 'function' ? window.NEXUS_CONTEXTO() : {};
  let j;
  try {
    const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'conversar', mensagens: historico.filter((m) => !m.pendente).slice(-10).map(({ papel, texto: t }) => ({ papel, texto: t })), contexto: ctx, cracha: ler('radar_chave'), token: ler('lp_token') }) });
    j = await r.json();
  } catch (e) { j = { ok: false, err: 'Sem conexão agora.' }; }
  historico.pop();
  if (j.ok) historico.push({ papel: 'claude', texto: j.texto, nota: j.reaproveitado ? 'resposta reaproveitada, sem custo' : (j.modelo ? j.modelo + ' · US$ ' + Number(j.custo_usd || 0).toFixed(4) : '') });
  else historico.push({ papel: 'claude', texto: j.motivo === 'particular' ? 'Para conversar comigo, entre com o PIN (o botão de acesso no alto da tela).' : (j.err || 'Não consegui responder agora.') });
  guardar(); desenhar();
}

export function iniciarConversa() {
  const lado = montar();
  const bt = document.getElementById('bt-conversa');
  const abrir = (sim) => { lado.hidden = !sim; bt && bt.setAttribute('aria-pressed', String(sim)); if (sim) { desenhar(); setTimeout(() => document.getElementById('conversa-txt').focus(), 50); } };
  bt && bt.addEventListener('click', () => abrir(lado.hidden));
  document.getElementById('conversa-fechar').addEventListener('click', () => abrir(false));
  document.getElementById('conversa-form').addEventListener('submit', (e) => { e.preventDefault(); const t = document.getElementById('conversa-txt'); enviar(t.value); t.value = ''; });
  document.getElementById('conversa-txt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('conversa-form').requestSubmit(); } });
  lado.addEventListener('click', (e) => { const s = e.target.closest('[data-sug]'); if (s) enviar(s.dataset.sug); });
}
