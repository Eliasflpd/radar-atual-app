// BROW STUDIO — cartão "Promoção" (usado na área da cliente, no agendamento online e no menu)
import { esc } from './comum.js?v=4';

export function cssPromo() {
  if (document.querySelector('link[data-promo-css]')) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/brow-studio/promocoes.css?v=1'; l.dataset.promoCss = '1';
  document.head.appendChild(l);
}
export const reais = (c) => { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
// resumo dos valores: "R$ 290,00 · sinal R$ 50,00 + R$ 240,00 no dia"
export function resumoValores(p) {
  let t = reais(p.preco_centavos);
  if (p.sinal_centavos > 0) t += ` · sinal ${reais(p.sinal_centavos)} + ${reais(p.preco_centavos - p.sinal_centavos)} no dia`;
  return t;
}
export const textoRetoque = (p) => p.retoque_centavos > 0 ? `Retoque ${reais(p.retoque_centavos)} em até ${p.retoque_dias} dias, cobrado à parte.` : '';
// cartão compacto: miniatura do cartaz + título + preço + botão
export function cartaoPromo(p, { href, botao = 'Ver promoção', id = 'promo' } = {}) {
  return `<section class="promo-card" aria-label="Promoção" id="${esc(id)}">
    ${p.imagem_url ? `<a class="promo-mini" href="${esc(href)}" aria-hidden="true" tabindex="-1"><img src="${esc(p.imagem_url)}" alt="" loading="lazy" decoding="async"></a>` : ''}
    <div class="promo-info"><span class="promo-rotulo">Promoção</span><div class="promo-titulo">${esc(p.titulo)}</div><div class="promo-preco">${esc(p.servico_nome)} · ${esc(reais(p.preco_centavos))}</div></div>
    <a class="btn btn-cheio" href="${esc(href)}">${esc(botao)}</a>
  </section>`;
}
