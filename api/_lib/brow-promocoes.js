// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — PROMOÇÕES (12/11/2026)
// Ações "pm_*" (equipe, com sessão) e "pp_*" (públicas, salão pelo ?s=) via
// api/_lib/brow-studio.js.
//
// • Promoção = serviço vinculado + preço total + sinal + retoque (valor e prazo
//   em dias) + período opcional (início/fim) + cartaz. Dinheiro em CENTAVOS.
// • Vigente = ativa E dentro do período (fuso do salão). Fora do período ela
//   some sozinha das telas públicas e não pode mais ser usada em agendamento.
// • CARTAZ: imagem publicitária (não é foto de cliente), por isso pode ser
//   pública — mas só sai por pp_imagem enquanto a promoção estiver vigente.
//   Fica no Postgres (bytea), já comprimida no aparelho; o servidor confere a
//   assinatura (jpg/png/webp) e o tamanho. A promoção-semente usa um arquivo
//   estático versionado no repositório (img/promocoes/).
// • Agendamento com promoção: aplicarPromocao() roda DENTRO da transação do
//   agendamento, confere vigência e serviço e grava uma CÓPIA dos valores
//   (mudar a promoção depois não muda horários já marcados).
// • Plano de pagamento (3 etapas) usa o Financeiro: 1 lançamento de receita
//   ligado ao atendimento (total da promoção) + movimentos (sinal, saldo).
//   O retoque vira um acompanhamento do módulo de Retornos (tipo retoque,
//   cobrança "cobrado", data limite = atendimento + prazo). Nada é cobrado
//   automaticamente: cada etapa é uma ação explícita.
// • Gestão (criar/editar/ativar/semente) e recebimentos: só a dona
//   (conferido em brow-studio.js → SO_DONA).
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', transferencia: 'Transferência' };
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const MAX_IMG = 900 * 1024;     // bytes depois de decodificar (chega comprimida do aparelho)
const MAX_VALOR = 10000000;     // R$ 100.000,00
const SEMENTE_BF = {
  semente: 'black-friday-2026',
  titulo: 'Black Friday de final de ano',
  descricao: 'Micropigmentação de Sobrancelhas · Técnica Shadow. Pagamento em 3 etapas: sinal para garantir a vaga, saldo no dia e retoque em até 40 dias.',
  preco_centavos: 29000, sinal_centavos: 5000, retoque_centavos: 8000, retoque_dias: 40,
  imagem_estatica: '/brow-studio/img/promocoes/black-friday-2026.jpg'
};

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_promocoes(
    id text primary key, estab text not null, titulo text not null, descricao text,
    servico_id text not null, servico_nome text not null,
    preco_centavos integer not null check (preco_centavos > 0),
    sinal_centavos integer not null default 0 check (sinal_centavos >= 0),
    retoque_centavos integer not null default 0 check (retoque_centavos >= 0),
    retoque_dias integer not null default 0 check (retoque_dias >= 0 and retoque_dias <= 365),
    inicio date, fim date, ativa boolean not null default true,
    imagem bytea, imagem_tipo text, imagem_estatica text, imagem_versao integer not null default 1,
    semente text, chave_envio text, criado_por text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
    check (sinal_centavos <= preco_centavos), check (fim is null or inicio is null or fim >= inicio))`);
  await c.query(`create unique index if not exists brow_promo_envio on brow_promocoes(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_promo_semente on brow_promocoes(estab, semente) where semente is not null`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function textoParaCentavos(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v >= 0 && v <= MAX_VALOR ? v : null;
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  s = s.replace(/\./g, '');
  const [inteiro, dec = ''] = s.split(',');
  const c = parseInt(inteiro, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  return Number.isSafeInteger(c) && c <= MAX_VALOR ? c : null;
}
const reais = (c) => { const s = String(Math.abs(c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
async function hoje(c, estab) {
  let fuso = 'America/Sao_Paulo';
  try { const r = await c.query('select fuso from brow_config where estab=$1', [estab]); if (r.rows[0] && FUSOS.includes(r.rows[0].fuso)) fuso = r.rows[0].fuso; } catch (e) {}
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function decodificarImagem(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { erro: 'Envie a imagem em JPG, PNG ou WEBP.' };
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) return { erro: 'Imagem vazia.' };
  if (buf.length > MAX_IMG) return { erro: 'Imagem grande demais. Use uma imagem menor.' };
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  const tipo = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : null;
  if (!tipo) return { erro: 'Envie a imagem em JPG, PNG ou WEBP.' };
  return { buf, tipo };
}
// situação calculada (nunca guardada): desativada | agendada | encerrada | ativa
function situacao(p, hj) {
  if (!p.ativa) return 'desativada';
  if (p.ini && p.ini > hj) return 'agendada';
  if (p.fimd && p.fimd < hj) return 'encerrada';
  return 'ativa';
}
const SIT_NOME = { ativa: 'No ar', agendada: 'Começa depois', encerrada: 'Encerrada', desativada: 'Desativada' };
const VIGENTE = `p.ativa and (p.inicio is null or p.inicio <= $2::date) and (p.fim is null or p.fim >= $2::date)`;
const SEL = `select p.id, p.estab, p.titulo, p.descricao, p.servico_id, p.servico_nome, p.preco_centavos, p.sinal_centavos, p.retoque_centavos, p.retoque_dias,
  to_char(p.inicio,'YYYY-MM-DD') ini, to_char(p.fim,'YYYY-MM-DD') fimd, p.ativa, (p.imagem is not null) tem_imagem, p.imagem_estatica, p.imagem_versao, p.semente,
  p.criado_em, p.atualizado_em from brow_promocoes p`;
// URL do cartaz: equipe → pm_imagem (com sessão); público → pp_imagem (só vigente)
function imagemUrl(p, publico, slug) {
  if (p.imagem_estatica) return p.imagem_estatica;
  if (!p.tem_imagem) return null;
  const q = new URLSearchParams({ acao: publico ? 'pp_imagem' : 'pm_imagem', id: p.id, v: String(p.imagem_versao) });
  if (publico && slug) q.set('s', slug);
  return '/api/brow?' + q.toString();
}
function saida(p, hj, publico, slug) {
  const sit = situacao(p, hj);
  const o = { id: p.id, titulo: p.titulo, descricao: p.descricao, servico_id: p.servico_id, servico_nome: p.servico_nome,
    preco_centavos: p.preco_centavos, sinal_centavos: p.sinal_centavos, saldo_centavos: p.preco_centavos - p.sinal_centavos,
    retoque_centavos: p.retoque_centavos, retoque_dias: p.retoque_dias, inicio: p.ini, fim: p.fimd, imagem_url: imagemUrl(p, publico, slug) };
  if (publico) return o;
  return { ...o, ativa: p.ativa, situacao: sit, situacao_nome: SIT_NOME[sit], vigente: sit === 'ativa', semente: p.semente || null };
}
async function historico(c, estab, tipo, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, tipo, id, acao, det ? JSON.stringify(det) : null]);
}

// ─── leitura e validação do formulário ──────────────────────────────────────
async function lerCampos(c, estab, b) {
  const out = {}, erros = {};
  const t = txt(b.titulo, 80); if (!t || t.length < 3) erros.titulo = 'Informe o título da promoção.'; else out.titulo = t;
  out.descricao = txt(b.descricao, 400);
  const s = b.servico_id ? (await c.query('select id, nome from brow_servicos where estab=$1 and id=$2', [estab, String(b.servico_id)])).rows[0] : null;
  if (!s) erros.servico_id = 'Escolha o serviço da promoção.'; else { out.servico_id = s.id; out.servico_nome = s.nome; }
  const preco = textoParaCentavos(b.preco); if (!preco) erros.preco = 'Informe o preço total, maior que zero. Ex.: 290,00'; else out.preco_centavos = preco;
  const sinal = b.sinal === '' || b.sinal == null ? 0 : textoParaCentavos(b.sinal);
  if (sinal == null) erros.sinal = 'Valor inválido. Ex.: 50,00'; else if (preco && sinal > preco) erros.sinal = 'O sinal não pode passar do preço total.'; else out.sinal_centavos = sinal;
  const ret = b.retoque === '' || b.retoque == null ? 0 : textoParaCentavos(b.retoque);
  if (ret == null) erros.retoque = 'Valor inválido. Ex.: 80,00'; else out.retoque_centavos = ret;
  const dias = b.retoque_dias === '' || b.retoque_dias == null ? 0 : Number(b.retoque_dias);
  if (!Number.isInteger(dias) || dias < 0 || dias > 365) erros.retoque_dias = 'Informe o prazo em dias (0 a 365).';
  else if (ret > 0 && dias < 1) erros.retoque_dias = 'Informe em até quantos dias o retoque deve ser feito.';
  else out.retoque_dias = dias;
  const ini = txt(b.inicio, 10), fim = txt(b.fim, 10);
  if (ini && !dataValida(ini)) erros.inicio = 'Data de início inválida.'; else out.inicio = ini || null;
  if (fim && !dataValida(fim)) erros.fim = 'Data de fim inválida.'; else out.fim = fim || null;
  if (out.inicio && out.fim && out.fim < out.inicio) erros.fim = 'O fim não pode ser antes do início.';
  return { out, erros };
}

// ─── aplicar promoção a um agendamento (DENTRO da transação do agendamento) ──
async function aplicarPromocao(c, estab, agendamentoId, promocaoId, servicoId) {
  await garantirTabelas(c);
  const hj = await hoje(c, estab);
  const r = await c.query(`${SEL} where p.estab=$1 and p.id=$3 and ${VIGENTE} for share of p`, [estab, hj, String(promocaoId || '')]);
  const p = r.rows[0];
  if (!p) return { ok: false, msg: 'Esta promoção não está mais disponível.' };
  if (servicoId && String(servicoId) !== p.servico_id) return { ok: false, msg: 'A promoção vale só para o serviço ' + p.servico_nome + '.' };
  await c.query(`update brow_agendamentos set promocao_id=$3, promo_titulo=$4, promo_preco_centavos=$5, promo_sinal_centavos=$6, promo_retoque_centavos=$7,
      promo_retoque_dias=$8, valor_centavos=$5, atualizado_em=now() where estab=$1 and id=$2`,
    [estab, agendamentoId, p.id, p.titulo, p.preco_centavos, p.sinal_centavos, p.retoque_centavos, p.retoque_dias]);
  await historico(c, estab, 'agendamento', agendamentoId, 'promocao', { promocao_id: p.id, titulo: p.titulo, preco: p.preco_centavos, sinal: p.sinal_centavos, retoque: p.retoque_centavos, retoque_dias: p.retoque_dias });
  return { ok: true, promocao: { id: p.id, titulo: p.titulo } };
}

// ─── plano de pagamento de um atendimento com promoção ──────────────────────
async function lerPlano(c, estab, agId) {
  const a = (await c.query(`select id, cliente_id, cliente_nome, servico_id, servico_nome, profissional_id, profissional_nome, to_char(data,'YYYY-MM-DD') data, inicio_min, situacao,
      promocao_id, promo_titulo, promo_preco_centavos, promo_sinal_centavos, promo_retoque_centavos, promo_retoque_dias, promo_retorno_id
      from brow_agendamentos where estab=$1 and id=$2`, [estab, String(agId || '')])).rows[0];
  if (!a) return null;
  let lanc = null, movs = [];
  const l = (await c.query(`select l.id, l.total_centavos, coalesce((select sum(m.valor_centavos) from brow_fin_movimentos m where m.estab=l.estab and m.lancamento_id=l.id and not m.estornado),0)::int pago
      from brow_fin_lancamentos l where l.estab=$1 and l.agendamento_id=$2 and not l.cancelado`, [estab, a.id])).rows[0];
  if (l) {
    lanc = l;
    movs = (await c.query(`select valor_centavos, forma, to_char(data,'YYYY-MM-DD') data from brow_fin_movimentos where estab=$1 and lancamento_id=$2 and not estornado order by criado_em`, [estab, l.id])).rows
      .map(m => ({ valor_centavos: m.valor_centavos, forma: FORMAS[m.forma] || m.forma, data: m.data }));
  }
  let retorno = null;
  if (a.promo_retorno_id) {
    const rt = (await c.query(`select id, to_char(data_prevista,'YYYY-MM-DD') prevista, cancelado, concluido from brow_retornos where estab=$1 and id=$2`, [estab, a.promo_retorno_id])).rows[0];
    if (rt) retorno = { id: rt.id, data_limite: rt.prevista, situacao: rt.cancelado ? 'cancelado' : rt.concluido ? 'concluido' : 'aberto' };
  }
  return { a, lanc, movs, retorno };
}
function planoSaida(x) {
  const { a, lanc, movs, retorno } = x;
  const preco = a.promo_preco_centavos, sinal = a.promo_sinal_centavos, pago = lanc ? lanc.pago : 0;
  const ativo = !['cancelado', 'falta'].includes(a.situacao);
  const retAberto = retorno && retorno.situacao !== 'cancelado';
  return {
    atendimento: { id: a.id, cliente_nome: a.cliente_nome, servico_nome: a.servico_nome, profissional_nome: a.profissional_nome, data: a.data, situacao: a.situacao },
    promocao: { id: a.promocao_id, titulo: a.promo_titulo, preco_centavos: preco, sinal_centavos: sinal, saldo_centavos: preco - sinal, retoque_centavos: a.promo_retoque_centavos, retoque_dias: a.promo_retoque_dias },
    pago_centavos: pago, falta_centavos: Math.max(0, preco - pago), lancamento_id: lanc ? lanc.id : null, movimentos: movs,
    etapas: {
      sinal: { valor_centavos: sinal, recebido: sinal === 0 || pago >= sinal, pode: ativo && sinal > 0 && pago < sinal },
      saldo: { valor_centavos: preco - sinal, recebido: pago >= preco, pode: ativo && pago < preco },
      retoque: { valor_centavos: a.promo_retoque_centavos, dias: a.promo_retoque_dias, data_limite: retAberto ? retorno.data_limite : (a.situacao === 'concluido' && a.promo_retoque_dias ? somaDias(a.data, a.promo_retoque_dias) : null),
        retorno: retorno, pode: a.situacao === 'concluido' && a.promo_retoque_centavos > 0 && !retAberto, aguardando_conclusao: a.situacao !== 'concluido' }
    }
  };
}

// ═══ AÇÕES DA EQUIPE (pm_*) ═════════════════════════════════════════════════
async function acoesEquipe(c, estab, req, res, acao, salao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const b = req.method === 'POST' ? corpo(req) : {};
  const usuario = req.brow_usuario || null;
  const hj = await hoje(c, estab);

  if (acao === 'pm_listar') {
    const r = await c.query(`${SEL} where p.estab=$1 and $2::date is not null order by p.ativa desc, p.criado_em desc`, [estab, hj]);
    const sv = (await c.query('select id, nome from brow_servicos where estab=$1 and ativo order by lower(nome)', [estab])).rows;
    const temSemente = r.rows.some(p => p.semente === SEMENTE_BF.semente);
    res.status(200).json({ ok: true, hoje: hj, itens: r.rows.map(p => saida(p, hj, false)), servicos: sv,
      semente_disponivel: estab === 'principal' && !temSemente, semente: { titulo: SEMENTE_BF.titulo, preco_centavos: SEMENTE_BF.preco_centavos, sinal_centavos: SEMENTE_BF.sinal_centavos, retoque_centavos: SEMENTE_BF.retoque_centavos, retoque_dias: SEMENTE_BF.retoque_dias } });
    return;
  }
  if (acao === 'pm_ativas') {
    const r = await c.query(`${SEL} where p.estab=$1 and ${VIGENTE} order by p.criado_em desc`, [estab, hj]);
    res.status(200).json({ ok: true, itens: r.rows.map(p => saida(p, hj, false)) }); return;
  }
  if (acao === 'pm_ver') {
    const r = await c.query(`${SEL} where p.estab=$1 and p.id=$3 and $2::date is not null`, [estab, hj, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrada', 'Promoção não encontrada.');
    const p = saida(r.rows[0], hj, false);
    // a profissional só vê o que está no ar; a dona vê tudo
    if (req.brow_funcao !== 'dona' && !p.vigente) return erro(res, 404, 'nao_encontrada', 'Esta promoção não está no ar.');
    const usos = (await c.query(`select count(*)::int n from brow_agendamentos where estab=$1 and promocao_id=$2 and situacao not in ('cancelado','falta')`, [estab, p.id])).rows[0].n;
    res.status(200).json({ ok: true, promocao: p, agendamentos: usos, link_publico: salao && salao.slug ? `/brow-studio/promocao/?s=${encodeURIComponent(salao.slug)}&id=${encodeURIComponent(p.id)}` : null }); return;
  }
  if (acao === 'pm_imagem') {
    const r = await c.query('select imagem, imagem_tipo from brow_promocoes where estab=$1 and id=$2 and imagem is not null', [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'sem_imagem', 'Sem cartaz.');
    res.setHeader('Content-Type', r.rows[0].imagem_tipo || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.status(200).end(r.rows[0].imagem); return;
  }

  if (req.method === 'POST' && acao === 'pm_salvar') {
    const { out, erros } = await lerCampos(c, estab, b);
    let img = null;
    if (b.imagem) { img = decodificarImagem(b.imagem); if (img.erro) erros.imagem = img.erro; }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    if (b.id) {
      await c.query('begin');
      try {
        const at = (await c.query('select id from brow_promocoes where estab=$1 and id=$2 for update', [estab, String(b.id)])).rows[0];
        if (!at) { await c.query('rollback'); return erro(res, 404, 'nao_encontrada', 'Promoção não encontrada.'); }
        const ks = Object.keys(out);
        const sets = ks.map((k, i) => `${k}=$${i + 3}`);
        const vals = ks.map(k => out[k]);
        if (img) { sets.push(`imagem=$${vals.length + 3}`, `imagem_tipo=$${vals.length + 4}`, 'imagem_estatica=null', 'imagem_versao=imagem_versao+1'); vals.push(img.buf, img.tipo); }
        else if (b.remover_imagem === true) sets.push('imagem=null', 'imagem_tipo=null', 'imagem_estatica=null', 'imagem_versao=imagem_versao+1');
        await c.query(`update brow_promocoes set ${sets.join(',')}, atualizado_em=now() where estab=$1 and id=$2`, [estab, at.id, ...vals]);
        await historico(c, estab, 'promocao', at.id, 'editada', { autor: usuario, ...out, imagem_nova: !!img });
        await c.query('commit');
        res.status(200).json({ ok: true, id: at.id }); return;
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
    }
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const ja = await c.query('select id from brow_promocoes where estab=$1 and chave_envio=$2', [estab, chave]);
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    const id = crypto.randomUUID();
    const r = await c.query(`insert into brow_promocoes(id,estab,titulo,descricao,servico_id,servico_nome,preco_centavos,sinal_centavos,retoque_centavos,retoque_dias,inicio,fim,ativa,imagem,imagem_tipo,chave_envio,criado_por)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14,$15,$16) on conflict do nothing returning id`,
      [id, estab, out.titulo, out.descricao, out.servico_id, out.servico_nome, out.preco_centavos, out.sinal_centavos, out.retoque_centavos, out.retoque_dias, out.inicio, out.fim, img ? img.buf : null, img ? img.tipo : null, chave, usuario]);
    if (!r.rows.length) { const o = await c.query('select id from brow_promocoes where estab=$1 and chave_envio=$2', [estab, chave]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
    await historico(c, estab, 'promocao', id, 'criada', { autor: usuario, ...out, imagem: !!img });
    res.status(201).json({ ok: true, id }); return;
  }

  if (req.method === 'POST' && acao === 'pm_ativar') {
    const ativa = b.ativa === true;
    const r = await c.query('update brow_promocoes set ativa=$3, atualizado_em=now() where estab=$1 and id=$2 and ativa<>$3 returning id', [estab, String(b.id || ''), ativa]);
    if (!r.rowCount) {
      const ex = await c.query('select 1 from brow_promocoes where estab=$1 and id=$2', [estab, String(b.id || '')]);
      if (!ex.rows.length) return erro(res, 404, 'nao_encontrada', 'Promoção não encontrada.');
      res.status(200).json({ ok: true, repetido: true }); return;
    }
    await historico(c, estab, 'promocao', String(b.id), ativa ? 'ativada' : 'desativada', { autor: usuario });
    res.status(200).json({ ok: true }); return;
  }

  // promoção do cartaz (Black Friday) — só no salão original; valores confirmados pela dona; sem data de fim
  if (req.method === 'POST' && acao === 'pm_semente') {
    if (estab !== 'principal') return erro(res, 403, 'exclusivo', 'Este recurso é exclusivo do salão original.');
    const ja = await c.query('select id from brow_promocoes where estab=$1 and semente=$2', [estab, SEMENTE_BF.semente]);
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    const s = (await c.query(`select id, nome from brow_servicos where estab=$1 and translate(lower(nome),'çã','ca') like 'micropigmentacao%sobrancelha%' order by ativo desc, criado_em limit 1`, [estab])).rows[0];
    if (!s) return erro(res, 409, 'sem_servico', 'Cadastre antes o serviço “Micropigmentação de sobrancelhas” (Serviços e valores → importar a tabela do estúdio).');
    const id = crypto.randomUUID();
    const r = await c.query(`insert into brow_promocoes(id,estab,titulo,descricao,servico_id,servico_nome,preco_centavos,sinal_centavos,retoque_centavos,retoque_dias,inicio,fim,ativa,imagem_estatica,semente,criado_por)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null,null,true,$11,$12,$13) on conflict do nothing returning id`,
      [id, estab, SEMENTE_BF.titulo, SEMENTE_BF.descricao, s.id, s.nome, SEMENTE_BF.preco_centavos, SEMENTE_BF.sinal_centavos, SEMENTE_BF.retoque_centavos, SEMENTE_BF.retoque_dias, SEMENTE_BF.imagem_estatica, SEMENTE_BF.semente, usuario]);
    if (!r.rows.length) { const o = await c.query('select id from brow_promocoes where estab=$1 and semente=$2', [estab, SEMENTE_BF.semente]); res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return; }
    await historico(c, estab, 'promocao', id, 'criada', { autor: usuario, semente: SEMENTE_BF.semente });
    res.status(201).json({ ok: true, id }); return;
  }

  // ── promoção num atendimento já marcado (ex.: marcado pela equipe) ──
  if (acao === 'pm_disponiveis') {
    const a = (await c.query(`select servico_id, promocao_id, situacao from brow_agendamentos where estab=$1 and id=$2`, [estab, String(q.agendamento_id || '')])).rows[0];
    if (!a) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
    const r = a.promocao_id || !['agendado', 'confirmado'].includes(a.situacao) ? { rows: [] } : await c.query(`${SEL} where p.estab=$1 and ${VIGENTE} and p.servico_id=$3 order by p.criado_em desc`, [estab, hj, a.servico_id]);
    res.status(200).json({ ok: true, itens: r.rows.map(p => saida(p, hj, false)) }); return;
  }
  if (req.method === 'POST' && acao === 'pm_aplicar') {
    await c.query('begin');
    try {
      const a = (await c.query(`select id, servico_id, promocao_id, situacao from brow_agendamentos where estab=$1 and id=$2 for update`, [estab, String(b.agendamento_id || '')])).rows[0];
      if (!a) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.'); }
      if (a.promocao_id === String(b.promocao_id || '')) { await c.query('rollback'); res.status(200).json({ ok: true, repetido: true }); return; }
      if (a.promocao_id) { await c.query('rollback'); return erro(res, 409, 'ja_tem', 'Este atendimento já tem uma promoção.'); }
      if (!['agendado', 'confirmado'].includes(a.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', 'Só dá para usar a promoção em horário agendado ou confirmado.'); }
      const fin = await c.query('select 1 from brow_fin_lancamentos where estab=$1 and agendamento_id=$2 and not cancelado', [estab, a.id]);
      if (fin.rows.length) { await c.query('rollback'); return erro(res, 409, 'financeiro', 'Este atendimento já tem lançamento no Financeiro. Cancele-o lá antes de usar a promoção.'); }
      const v = await aplicarPromocao(c, estab, a.id, b.promocao_id, a.servico_id);
      if (!v.ok) { await c.query('rollback'); return erro(res, 409, 'promocao', v.msg); }
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  if (acao === 'pm_plano') {
    const x = await lerPlano(c, estab, q.agendamento_id);
    if (!x) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
    if (!x.a.promocao_id) return erro(res, 404, 'sem_promocao', 'Este atendimento não tem promoção.');
    const dona = req.brow_funcao === 'dona';
    const saidaPlano = planoSaida(x);
    if (!dona) { saidaPlano.movimentos = []; saidaPlano.lancamento_id = null; }   // detalhes do caixa: só a dona
    res.status(200).json({ ok: true, ...saidaPlano, formas: FORMAS, pode_receber: dona }); return;
  }

  // ── etapas 1 e 2: sinal e saldo (Financeiro: 1 lançamento do atendimento + movimentos) ──
  if (req.method === 'POST' && acao === 'pm_receber') {
    const etapa = b.etapa === 'sinal' ? 'sinal' : b.etapa === 'saldo' ? 'saldo' : null;
    if (!etapa) return erro(res, 422, 'validacao', 'Etapa inválida.');
    if (!FORMAS[b.forma]) return erro(res, 422, 'validacao', 'Escolha a forma de pagamento.', { erros: { forma: 'Escolha a forma de pagamento.' } });
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const chaveMov = 'promo:' + chave;
    const jaMov = await c.query('select id from brow_fin_movimentos where estab=$1 and chave_envio=$2', [estab, chaveMov]);
    if (jaMov.rows.length) { res.status(200).json({ ok: true, repetido: true }); return; }
    await c.query('begin');
    try {
      const a = (await c.query(`select id, cliente_id, cliente_nome, servico_id, servico_nome, profissional_id, profissional_nome, to_char(data,'YYYY-MM-DD') data, situacao,
          promocao_id, promo_titulo, promo_preco_centavos, promo_sinal_centavos from brow_agendamentos where estab=$1 and id=$2 for update`, [estab, String(b.agendamento_id || '')])).rows[0];
      if (!a) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.'); }
      if (!a.promocao_id) { await c.query('rollback'); return erro(res, 409, 'sem_promocao', 'Este atendimento não tem promoção.'); }
      if (['cancelado', 'falta'].includes(a.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', 'Atendimento cancelado ou com falta: registre pelo Financeiro, se for o caso.'); }
      let l = (await c.query('select id, total_centavos from brow_fin_lancamentos where estab=$1 and agendamento_id=$2 and not cancelado for update', [estab, a.id])).rows[0];
      if (l && l.total_centavos !== a.promo_preco_centavos) { await c.query('rollback'); return erro(res, 409, 'valor_diferente', `Já existe um lançamento deste atendimento com outro valor (${reais(l.total_centavos)}). Ajuste pelo Financeiro.`); }
      if (!l) {
        l = { id: crypto.randomUUID(), total_centavos: a.promo_preco_centavos };
        await c.query(`insert into brow_fin_lancamentos(id,estab,tipo,descricao,categoria,pessoa_tipo,pessoa_id,pessoa_nome,agendamento_id,servico_id,servico_nome,profissional_id,profissional_nome,total_centavos,vencimento,observacao,criado_por)
          values($1,$2,'receita',$3,'atendimento','cliente',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [l.id, estab, `${a.promo_titulo} · ${a.servico_nome}`.slice(0, 120), a.cliente_id, a.cliente_nome, a.id, a.servico_id, a.servico_nome, a.profissional_id, a.profissional_nome, a.promo_preco_centavos, a.data,
            `Promoção: sinal ${reais(a.promo_sinal_centavos)} + ${reais(a.promo_preco_centavos - a.promo_sinal_centavos)} no dia. Retoque cobrado à parte.`, usuario]);
        await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,'criado',$3)`, [estab, l.id, JSON.stringify({ autor: usuario, origem: 'promocao', agendamento_id: a.id })]);
      }
      const pago = (await c.query('select coalesce(sum(valor_centavos),0)::int n from brow_fin_movimentos where estab=$1 and lancamento_id=$2 and not estornado', [estab, l.id])).rows[0].n;
      const valor = etapa === 'sinal' ? a.promo_sinal_centavos - pago : a.promo_preco_centavos - pago;
      if (valor <= 0) { await c.query('commit'); res.status(200).json({ ok: true, repetido: true, msg: etapa === 'sinal' ? 'O sinal já foi recebido.' : 'Este atendimento já está quitado.' }); return; }
      const hjEst = await hoje(c, estab);
      await c.query(`insert into brow_fin_movimentos(id,estab,lancamento_id,valor_centavos,forma,data,responsavel,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [crypto.randomUUID(), estab, l.id, valor, b.forma, hjEst, usuario, chaveMov]);
      await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'financeiro',$2,'baixa',$3)`, [estab, l.id, JSON.stringify({ autor: usuario, origem: 'promocao', etapa, valor, forma: b.forma })]);
      await historico(c, estab, 'agendamento', a.id, etapa === 'sinal' ? 'promo_sinal' : 'promo_saldo', { autor: usuario, valor, forma: b.forma });
      await c.query('commit');
      res.status(200).json({ ok: true, valor_centavos: valor }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  // ── etapa 3: retoque → acompanhamento do módulo de Retornos ──
  if (req.method === 'POST' && acao === 'pm_retoque') {
    await require('./brow-retornos.js').garantirTabelas(c);
    await c.query('begin');
    try {
      const a = (await c.query(`select a.id, a.cliente_id, a.cliente_nome, a.whatsapp, a.servico_id, a.servico_nome, a.profissional_id, a.profissional_nome, to_char(a.data,'YYYY-MM-DD') data, a.situacao,
          a.promocao_id, a.promo_titulo, a.promo_retoque_centavos, a.promo_retoque_dias, a.promo_retorno_id from brow_agendamentos a where a.estab=$1 and a.id=$2 for update`, [estab, String(b.agendamento_id || '')])).rows[0];
      if (!a) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.'); }
      if (!a.promocao_id) { await c.query('rollback'); return erro(res, 409, 'sem_promocao', 'Este atendimento não tem promoção.'); }
      if (!(a.promo_retoque_centavos > 0)) { await c.query('rollback'); return erro(res, 409, 'sem_retoque', 'Esta promoção não tem retoque.'); }
      if (a.situacao !== 'concluido') { await c.query('rollback'); return erro(res, 409, 'nao_concluido', 'O retoque é planejado depois que o procedimento é concluído na agenda.'); }
      if (a.promo_retorno_id) {
        const rt = (await c.query('select id, cancelado from brow_retornos where estab=$1 and id=$2', [estab, a.promo_retorno_id])).rows[0];
        if (rt && !rt.cancelado) { await c.query('rollback'); res.status(200).json({ ok: true, id: rt.id, repetido: true }); return; }
      }
      const limite = somaDias(a.data, a.promo_retoque_dias);
      const politica = `Promoção ${a.promo_titulo}: retoque ${reais(a.promo_retoque_centavos)} em até ${a.promo_retoque_dias} dias`.slice(0, 200);
      // já existe retoque aberto para este atendimento (feito pela tela de Retornos)? reaproveita
      let id = (await c.query(`select id from brow_retornos where estab=$1 and origem_agendamento_id=$2 and tipo='retoque' and not cancelado and not concluido`, [estab, a.id])).rows[0];
      id = id ? id.id : null;
      if (!id) {
        id = crypto.randomUUID();
        await c.query(`insert into brow_retornos(id,estab,cliente_id,cliente_nome,origem_agendamento_id,origem_servico_id,origem_servico_nome,origem_data,profissional_id,profissional_nome,
            tipo,data_prevista,whatsapp,cobranca,valor_centavos,politica,politica_versao,observacoes,criado_por,chave_envio)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'retoque',$11,$12,'cobrado',$13,$14,'promocao',$15,$16,$17)`,
          [id, estab, a.cliente_id, a.cliente_nome, a.id, a.servico_id, a.servico_nome, a.data, a.profissional_id, a.profissional_nome, limite, a.whatsapp || null,
            a.promo_retoque_centavos, politica, `Retoque da promoção “${a.promo_titulo}”: fazer até ${limite.split('-').reverse().join('/')}.`, usuario, 'promo-retoque:' + a.id]);
        await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'retorno',$2,'criado',$3)`, [estab, id, JSON.stringify({ autor: usuario, tipo: 'retoque', data_prevista: limite, cobranca: 'cobrado', valor: a.promo_retoque_centavos, origem: 'promocao' })]);
      }
      await c.query('update brow_agendamentos set promo_retorno_id=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, a.id, id]);
      await historico(c, estab, 'agendamento', a.id, 'promo_retoque', { autor: usuario, retorno_id: id, data_limite: limite });
      await c.query('commit');
      res.status(201).json({ ok: true, id, data_limite: limite }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }

  return erro(res, 400, 'acao', 'Ação desconhecida.');
}

// ═══ AÇÕES PÚBLICAS (pp_*) — salão pelo endereço; só promoções VIGENTES ═════
async function acoesPublicas(c, req, res, acao, salao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const estab = salao.id;
  const hj = await hoje(c, estab);
  const cfg = (await c.query('select nome_estudio, online_ativo, whatsapp_estudio, horarios from brow_config where estab=$1', [estab])).rows[0] || {};
  const onlineOk = !!(cfg.online_ativo && cfg.horarios && Object.values(cfg.horarios).some(h => h && h.aberto));
  const vigentes = async (id) => (await c.query(`${SEL} join brow_servicos s on s.estab=p.estab and s.id=p.servico_id and s.ativo
      where p.estab=$1 and ${VIGENTE}${id ? ' and p.id=$3' : ''} order by p.criado_em desc`, id ? [estab, hj, String(id)] : [estab, hj])).rows;
  if (acao === 'pp_imagem') {
    const r = await c.query(`select p.imagem, p.imagem_tipo from brow_promocoes p where p.estab=$1 and p.id=$3 and p.imagem is not null and ${VIGENTE}`, [estab, hj, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'sem_imagem', 'Cartaz indisponível.');
    res.setHeader('Content-Type', r.rows[0].imagem_tipo || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).end(r.rows[0].imagem); return;
  }
  if (acao === 'pp_lista' || acao === 'pp_ver') {
    const rows = await vigentes(acao === 'pp_ver' ? (q.id || '-') : null);
    if (acao === 'pp_ver' && !rows.length) return erro(res, 404, 'nao_encontrada', 'Esta promoção não está mais disponível.');
    const base = { ok: true, estudio: cfg.nome_estudio || salao.nome || 'Brow Studio', salao: { slug: salao.slug, nome: salao.nome }, agendamento_online: onlineOk, whatsapp_estudio: cfg.whatsapp_estudio || null };
    if (acao === 'pp_ver') { res.status(200).json({ ...base, promocao: saida(rows[0], hj, true, salao.slug) }); return; }
    res.status(200).json({ ...base, itens: rows.map(p => saida(p, hj, true, salao.slug)) }); return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
}

// existe promoção no ar para o serviço? (tabela pode ainda não existir num salão novo)
async function temVigente(c, estab, servicoId, hj) {
  try {
    const r = await c.query(`select 1 from brow_promocoes p where p.estab=$1 and ${VIGENTE} and p.servico_id=$3 limit 1`, [estab, hj, String(servicoId || '')]);
    return r.rows.length > 0;
  } catch (e) { return false; }
}

module.exports = { garantirTabelas, aplicarPromocao, temVigente, acoesEquipe, acoesPublicas, SEMENTE_BF, _teste: { textoParaCentavos, situacao, decodificarImagem } };
