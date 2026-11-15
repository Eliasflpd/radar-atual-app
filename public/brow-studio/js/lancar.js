// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — LANÇAR AGENDAMENTOS (vários de uma vez)
// Etapa 1: colar o texto (uma linha por agendamento). Etapa 2: conferência
// validada no servidor (ag_lote_validar, não grava). Etapa 3: gravar
// (ag_lote_criar, revalida tudo e não duplica). Pensado também para o
// Claude no Chrome: campo único, rótulos claros e botões com texto fixo.
// ═══════════════════════════════════════════════════════════════════════════
import { $, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, avisoHTML, focarTitulo, ir } from './comum.js?v=4';

const BASE = '/brow-studio/agenda/';
const L = BASE + 'lancar/';
const CH = 'ag:lote';
const EXEMPLO = 'Maria Silva; (11) 98888-7777; Design com henna; 15/11; 09:00\nJoana Prado; 11 97777-6666; Design de sobrancelha; amanhã; 14h30; Rychelma; primeira vez';
const app = document.getElementById('app');
const passou = () => document.documentElement.scrollHeight > window.innerHeight + 1;
function cabem(el, altura, abaixo = 82, min = 2) { const topo = el.getBoundingClientRect().top + window.scrollY; return Math.max(min, Math.min(14, Math.floor((window.innerHeight - topo - abaixo + 10) / (altura + 10)))); }
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
function navPaginas() {
  return `<nav class="paginacao" id="nav" aria-label="Páginas" hidden><button type="button" class="btn btn-linha" data-ir="-1" aria-label="Página anterior">${SETA} Anterior</button>
    <span class="pag-info" aria-live="polite"></span><button type="button" class="btn btn-linha" data-ir="1" aria-label="Próxima página">Próxima <span aria-hidden="true">→</span></button></nav>`;
}
function paginar(itens, desenhar, alturaItem = 76, abaixo = 82 + 60) {
  let pg = 1, por = 0;
  const d = () => {
    const el = $('#lista'); const nav = $('#nav');
    if (!por) por = cabem(el, alturaItem, abaixo, 1);
    const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    el.innerHTML = itens.slice((pg - 1) * por, pg * por).map(desenhar).join('');
    nav.hidden = paginas <= 1;
    nav.querySelector('.pag-info').innerHTML = `<strong>${pg}</strong> de ${paginas}<span class="pag-total"> · ${itens.length} linhas</span>`;
    const [a, z] = nav.querySelectorAll('[data-ir]'); a.disabled = pg <= 1; z.disabled = pg >= paginas;
    a.onclick = () => { pg--; d(); }; z.onclick = () => { pg++; d(); };
  };
  d();
  // linhas longas quebram: reduz itens por página até caber (sem cortar conteúdo).
  // Roda de novo depois das fontes carregarem, porque a altura muda.
  const ajustar = () => { while (passou() && por > 1) { por--; pg = 1; d(); } };
  ajustar();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(ajustar, 30));
}
const linhaHTML = (x) => {
  const ok = x.pronto && (!x.resultado || x.resultado === 'criado' || x.resultado === 'repetido');
  const titulo = `${esc(x.nome || '(sem nome)')}${x.data ? ` · ${dataBR(x.data)} ${esc(x.inicio || '')}` : ''}`;
  const det = x.problemas && x.problemas.length && !ok
    ? `<span class="lote-problema">${esc(x.problemas.join(' '))}</span>`
    : `${esc(x.servico || '')}${x.profissional ? ' · ' + esc(x.profissional) : ''} · ${x.cliente === 'existente' ? 'cliente já cadastrada' + (x.cliente_nome && x.cliente_nome !== x.nome ? ` (${esc(x.cliente_nome)})` : '') : 'cliente nova'}`;
  const selo = x.resultado === 'criado' ? '<span class="selo-est ok">Lançado</span>' : x.resultado === 'repetido' ? '<span class="selo-est neutro">Já lançado</span>'
    : x.resultado === 'indisponivel' ? '<span class="selo-est perigo">Ocupado agora</span>' : x.resultado === 'fora' || !x.pronto ? '<span class="selo-est perigo">Com problema</span>' : '<span class="selo-est ok">Pronto</span>';
  return `<li class="item lote-item${ok ? '' : ' lote-erro'}" data-linha="${x.n}"><div class="item-info"><div class="item-nome"><small>Linha ${x.n}</small> ${titulo}</div>
    <div class="item-extra item-extra-quebra">${det} <span class="selos">${selo}</span></div></div></li>`;
};

// ── ETAPA 1: colar ──
function telaColar() {
  const d = lerRasc(CH) || { texto: '', lote_id: uuid() };
  const form = pagina({ titulo: 'Lançar agendamentos', etapa: 1, etapasTotal: 2, voltar: BASE, voltarTexto: 'Agenda', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">Cole vários de uma vez, um por linha.</p>
      <div class="campo"><label for="lote-texto">Agendamentos, um por linha</label>
        <textarea id="lote-texto" name="texto" rows="8" class="lote-texto" spellcheck="false" autocapitalize="off" autocorrect="off" aria-describedby="lote-formato" placeholder="${esc(EXEMPLO)}">${esc(d.texto)}</textarea>
        <span class="erro" id="texto-erro" aria-live="polite"></span></div>
      <p class="ajuda" id="lote-formato"><strong>Formato:</strong> Nome; WhatsApp; Serviço; Data; Horário; Profissional (opcional); Observação (opcional).<br>
        Data: 15/11, 15/11/2026, hoje ou amanhã. Horário: 9h, 9:00 ou 09h30. Também aceita colunas separadas por tab (planilha). Até 50 linhas.</p>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${BASE}" id="cancelar">Cancelar</a><button type="submit" class="btn btn-cheio" id="conferir">Conferir</button>` });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc(CH);
  form.texto.addEventListener('input', () => gravarRasc(CH, { ...d, texto: form.texto.value, analise: null }));
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return;
    if (!form.texto.value.trim()) { $('#texto-erro').textContent = 'Cole pelo menos uma linha.'; form.texto.focus(); return; }
    env = true; $('#conferir').disabled = true; $('#conferir').textContent = 'Conferindo…';
    const r = await api('ag_lote_validar', { corpo: { texto: form.texto.value } });
    env = false; $('#conferir').disabled = false; $('#conferir').textContent = 'Conferir';
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível conferir.'), 'erro'); return; }
    gravarRasc(CH, { ...d, texto: form.texto.value, analise: r });
    ir(L + 'conferencia/');
  };
  focarTitulo();
}

// ── ETAPA 2: conferência ──
function telaConferencia() {
  const d = lerRasc(CH); if (!d || !d.analise) return ir(L);
  const a = d.analise; const prontos = a.prontos, problema = a.total - a.prontos;
  pagina({ titulo: 'Conferir lançamento', etapa: 2, etapasTotal: 2, voltar: L, voltarTexto: 'Voltar',
    corpo: `<p class="lote-resumo" role="status"><strong>${prontos} pronto(s)</strong> · <strong>${problema} com problema</strong></p>
      ${problema ? '<p class="ajuda">As linhas com problema ficam de fora. Para corrigir, volte ao texto.</p>' : ''}
      <ul class="lista" id="lista" aria-label="Linhas conferidas"></ul>${navPaginas()}<div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${L}">${SETA} Voltar ao texto</a><button type="button" class="btn btn-cheio" id="lancar" ${prontos ? '' : 'disabled'}>Lançar os ${prontos} prontos</button>` });
  paginar(a.linhas, linhaHTML);
  let env = false;
  $('#lancar').onclick = async () => {
    if (env) return; env = true; const b = $('#lancar'); b.disabled = true; b.textContent = 'Lançando…';
    const r = await api('ag_lote_criar', { corpo: { texto: d.texto, lote_id: d.lote_id } });
    if (r.ok) { gravarRasc(CH, { ...d, resultado: r }); location.replace(L + 'resultado/'); return; }
    env = false; b.disabled = false; b.textContent = `Lançar os ${prontos} prontos`;
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível lançar.') + '<br><small>Nada foi perdido: o texto continua guardado.</small>', 'erro');
  };
  focarTitulo();
}

// ── ETAPA 3: resultado ──
function telaResultado() {
  const d = lerRasc(CH); if (!d || !d.resultado) return ir(L);
  const r = d.resultado;
  const dias = [...new Set(r.linhas.filter(x => x.resultado === 'criado' || x.resultado === 'repetido').map(x => x.data).filter(Boolean))].sort();
  const fora = r.linhas.filter(x => x.resultado !== 'criado' && x.resultado !== 'repetido').length;
  pagina({ titulo: 'Lançamento concluído', voltar: BASE, voltarTexto: 'Agenda',
    corpo: `${avisoHTML(`<strong>${r.criados} lançado(s)</strong>${r.repetidos ? ` · ${r.repetidos} já estava(m) lançado(s)` : ''}${fora ? ` · ${fora} ficou(aram) de fora` : ''}.`, r.criados || r.repetidos ? 'ok' : 'erro')}
      ${dias.length ? `<nav class="linha-acoes lote-dias" aria-label="Agenda dos dias">${dias.slice(0, 6).map(x => `<a class="btn btn-suave" href="${BASE}?data=${x}">Agenda de ${dataBR(x)}</a>`).join('')}</nav>` : ''}
      <ul class="lista" id="lista" aria-label="Resultado por linha"></ul>${navPaginas()}`,
    acoes: `<a class="btn btn-linha" href="${L}" id="novo-lote">Lançar outros</a><a class="btn btn-cheio" href="${BASE}" id="ir-agenda">Ir para a agenda</a>` });
  paginar(r.linhas, linhaHTML, 76, 82 + 60);
  const limpar = () => apagarRasc(CH);
  $('#novo-lote').onclick = limpar; $('#ir-agenda').onclick = limpar;
  focarTitulo();
}

const TELAS = { lancar: telaColar, 'lancar-conf': telaConferencia, 'lancar-res': telaResultado };
(TELAS[document.body.dataset.pagina] || telaColar)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
