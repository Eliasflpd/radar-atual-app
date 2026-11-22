// NEXUS BÍBLICO — barra "Preparar" (21/11/2026): sermão, pregação, mensagem ou estudo.
// Ao pedir, o UNIVERSO TRABALHA PRIMEIRO: acha os versículos do tema, reúne o que as 10 camadas dizem deles
// (acontecimentos, personagens, palavras no original, temas, doutrinas, confissões, lugares, crítica textual), acende
// tudo no Céu e monta um dossiê. Depois o Claude escreve o texto SOBRE esse dossiê (ação "preparar", com orçamento e
// registro de custo da camada de IA do NEXUS). Exige a porta (crachá ou PIN). Vai para a IA: o pedido, os versículos
// da Almeida e os nomes dos itens das camadas (dados abertos). Nenhum trecho da biblioteca particular é enviado.
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TIPOS = [['sermao', 'Sermão'], ['pregacao', 'Pregação'], ['mensagem', 'Mensagem'], ['estudo', 'Estudo bíblico']];
const CHAVE = 'nexus_preparar';
let ultimo = null; try { ultimo = JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch (_) { ultimo = null; }

function formatar(t) {   // títulos em linha própria viram cabeçalhos; listas com "-" viram itens
  return esc(t).split(/\n\s*\n/).map((bloco) => {
    const linhas = bloco.split('\n');
    if (linhas.length === 1 && linhas[0].length < 90 && !/[.!?…]$/.test(linhas[0].trim())) return `<h4>${linhas[0].replace(/^#+\s*/, '')}</h4>`;
    if (linhas.every((l) => /^\s*[-•]\s+/.test(l))) return '<ul>' + linhas.map((l) => '<li>' + l.replace(/^\s*[-•]\s+/, '') + '</li>').join('') + '</ul>';
    return '<p>' + linhas.join('<br>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</p>';
  }).join('');
}

function montar() {
  const lado = document.createElement('aside');
  lado.className = 'preparar'; lado.id = 'preparar'; lado.hidden = true; lado.setAttribute('aria-label', 'Preparar sermão, pregação, mensagem ou estudo');
  lado.innerHTML = `<div class="conversa-topo"><div><b>Preparar</b><small>sermão, pregação, mensagem ou estudo · o universo trabalha junto</small></div><button class="painel-fechar" id="preparar-fechar" aria-label="Fechar">×</button></div>
    <form class="preparar-form" id="preparar-form">
      <div class="preparar-tipos" role="radiogroup" aria-label="Tipo">${TIPOS.map(([v, n], i) => `<label><input type="radio" name="tipo" value="${v}" ${i === 0 ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
      <label class="preparar-campo">Tema ou passagem<input name="tema" maxlength="160" required placeholder="Ex.: Romanos 8, graça, Páscoa, Davi e Golias"></label>
      <div class="preparar-linha"><label class="preparar-campo">Público<select name="publico"><option>Igreja (culto)</option><option>Jovens</option><option>Célula</option><option>Escola Dominical</option><option>Mulheres</option><option>Homens</option><option>Crianças</option></select></label>
        <label class="preparar-campo">Duração<select name="duracao"><option>15 minutos</option><option selected>30 minutos</option><option>45 minutos</option><option>1 hora</option></select></label></div>
      <label class="preparar-campo">Observações (opcional)<textarea name="obs" rows="2" maxlength="500" placeholder="Ex.: ênfase em fé no meio da crise; culto de Santa Ceia"></textarea></label>
      <button class="bt bt-ouro" type="submit">✦ Preparar com o universo</button>
    </form>
    <div class="preparar-saida" id="preparar-saida" aria-live="polite"></div>
    <p class="conversa-nota">O texto é escrito pelo Claude a partir do dossiê que o universo montou (cada item tem fonte nas fichas do Céu). Confira antes de pregar.</p>`;
  document.querySelector('.palco').appendChild(lado);
  return lado;
}

function mostrar(estado) {
  const caixa = document.getElementById('preparar-saida');
  if (!estado) { caixa.innerHTML = ''; return; }
  if (estado.etapa === 'universo') { caixa.innerHTML = '<div class="preparar-etapa">✦ O universo está reunindo os versículos, as camadas e os lugares…</div>'; return; }
  if (estado.etapa === 'escrevendo') { caixa.innerHTML = `<div class="preparar-etapa">✦ Universo pronto: ${estado.resumo || ''}<br>✍️ O Claude está escrevendo… (pode levar até um minuto)</div>`; return; }
  if (estado.etapa === 'erro') { caixa.innerHTML = `<div class="preparar-etapa preparar-erro">${esc(estado.msg)}</div>`; return; }
  caixa.innerHTML = `<div class="preparar-res">${formatar(estado.texto)}</div>
    <div class="preparar-acoes"><button class="bt" type="button" data-p="copiar">Copiar</button><button class="bt" type="button" data-p="baixar">Baixar .txt</button><button class="bt" type="button" data-p="universo">✦ Ver no universo</button></div>
    <small class="preparar-custo">${esc(estado.nota || '')}</small>`;
}

async function preparar(form) {
  const f = new FormData(form), pedido = { tipo: f.get('tipo'), tema: String(f.get('tema') || '').trim(), publico: f.get('publico'), duracao: f.get('duracao'), obs: String(f.get('obs') || '').trim() };
  if (!pedido.tema) return;
  const MUNDOS = [[/trombeta/i, 'trombetas'], [/cria[cç][aã]o|g[eê]nesis\s*1\b|no princ[ií]pio/i, 1]];   // temas que têm um mundo de cinema
  const mundo = (MUNDOS.find(([re]) => re.test(pedido.tema)) || [])[1];
  if (mundo != null && typeof window.NEXUS_MUNDO === 'function') window.NEXUS_MUNDO(mundo);
  mostrar({ etapa: 'universo' });
  // 1) o universo trabalha: abre o Céu se preciso e monta o dossiê
  let dossie = null;
  try {
    if (!window.__ceuPrevia && typeof window.NEXUS_ABRIR_CEU === 'function') await window.NEXUS_ABRIR_CEU();
    for (let i = 0; i < 40 && !(window.__ceuPrevia && window.__ceuPrevia._teste && window.__ceuPrevia._teste.pronto()); i++) await new Promise((ok) => setTimeout(ok, 250));
    if (window.__ceuPrevia && window.__ceuPrevia.prepararDossie) dossie = window.__ceuPrevia.prepararDossie(pedido.tema);
  } catch (e) { dossie = null; }
  const resumo = dossie && !dossie.vazio ? `${dossie.total_versos} versículo(s) acesos, ${dossie.camadas.length} camada(s) com material${dossie.lugares.length ? ', ' + dossie.lugares.length + ' lugar(es)' : ''}` : 'nada encontrado no universo para este tema (o texto ficará mais genérico)';
  mostrar({ etapa: 'escrevendo', resumo });
  // 2) o Claude escreve sobre o dossiê
  let j;
  try {
    const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'preparar', ...pedido, dossie: dossie && !dossie.vazio ? dossie : null, cracha: ler('radar_chave'), token: ler('lp_token') }) });
    j = await r.json();
  } catch (e) { j = { ok: false, err: 'Sem conexão agora. Tente de novo.' }; }
  if (!j.ok) { mostrar({ etapa: 'erro', msg: j.motivo === 'particular' ? 'Para preparar textos com o Claude, entre com o PIN (botão de acesso no alto da tela).' : (j.err || 'Não consegui preparar agora.') }); return; }
  ultimo = { pedido, texto: j.texto, nota: (j.reaproveitado ? 'texto reaproveitado, sem custo' : (j.modelo ? j.modelo + ' · US$ ' + Number(j.custo_usd || 0).toFixed(4) : '')) + ' · base: ' + resumo };
  try { sessionStorage.setItem(CHAVE, JSON.stringify(ultimo)); } catch (_) { /* sem armazenamento */ }
  mostrar(ultimo);
}

export function iniciarPreparar() {
  const lado = montar(), bt = document.getElementById('bt-preparar');
  const abrir = (sim) => { lado.hidden = !sim; document.body.classList.toggle('preparar-aberto', sim); bt && bt.setAttribute('aria-pressed', String(sim)); if (sim) { mostrar(ultimo); setTimeout(() => lado.querySelector('[name=tema]').focus(), 50); } };
  bt && bt.addEventListener('click', () => abrir(lado.hidden));
  document.getElementById('preparar-fechar').addEventListener('click', () => abrir(false));
  document.getElementById('preparar-form').addEventListener('submit', (e) => { e.preventDefault(); preparar(e.target); });
  lado.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (!b || !ultimo) return;
    if (b.dataset.p === 'copiar') { navigator.clipboard && navigator.clipboard.writeText(ultimo.texto).then(() => { b.textContent = 'Copiado ✓'; setTimeout(() => { b.textContent = 'Copiar'; }, 1500); }).catch(() => {}); }
    if (b.dataset.p === 'baixar') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ultimo.texto], { type: 'text/plain;charset=utf-8' })); a.download = (ultimo.pedido.tipo + '-' + ultimo.pedido.tema).replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60) + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    if (b.dataset.p === 'universo' && window.__ceuPrevia && window.__ceuPrevia.prepararDossie) window.__ceuPrevia.prepararDossie(ultimo.pedido.tema);
  });
}
