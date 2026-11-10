// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — RELATÓRIOS (10/11/2026)
// Ações "rl_*" via api/_lib/brow-studio.js. SOMENTE LEITURA: nenhuma consulta
// altera agenda, caixa, estoque ou sessões.
//
// Cada relatório tem UMA definição de conjunto (fonte()) usada igualmente pelo
// resumo, pelos detalhes paginados e pela exportação — totais = soma dos
// detalhes, sempre sobre todos os registros filtrados (nunca só a página).
//
// • Financeiro: recebido/pago = brow_fin_movimentos NÃO estornados, pela DATA
//   EFETIVA do movimento. A receber = lançamentos de receita não cancelados com
//   VENCIMENTO no período e saldo pendente HOJE. Dinheiro só existe em
//   movimentos financeiros: agenda, aprovação de proposta e sessão de pacote
//   nunca viram recebimento (sem dupla contagem). Profissional = a do
//   lançamento de origem; sem vínculo entra só em "Todas" (sem rateio).
// • Atendimentos: brow_agendamentos pela DATA PREVISTA, cada um uma vez, na
//   situação real. Encaixe aguardando não conta; encaixe efetivado conta pelo
//   agendamento gerado.
// • Serviços / Clientes: execuções = agendamentos CONCLUÍDOS (data do
//   atendimento concluído) + registros de atendimento finalizados SEM
//   agendamento (data do registro). Sessão de pacote aponta para o mesmo
//   agendamento: não duplica. Cliente identificada pelo ID.
// • PERMISSÃO: relatório financeiro passa por podeFinanceiro(usuario) — com o
//   login, checar a função. Hoje só o modo de teste local passa pela trava.
// ═══════════════════════════════════════════════════════════════════════════
const TIPOS = { financeiro: 'Financeiro', atendimentos: 'Atendimentos', servicos: 'Serviços', clientes: 'Clientes' };
const SIT_AG = { agendado: 'Agendado', confirmado: 'Confirmado', chegou: 'Chegou', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', falta: 'Falta' };
const CAT_FIN = { recebimentos: 'Recebimentos', despesas: 'Despesas pagas', a_receber: 'A receber' };
const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', transferencia: 'Transferência' };
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];
const podeFinanceiro = (usuario) => true;   // login pendente: ver cabeçalho
const MAX_DIAS = 1100;

const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
function dataValida(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100; }
const dataBR = (s) => s ? s.split('-').reverse().join('/') : '';
const reais = (c) => { c = Number(c) || 0; const s = String(Math.abs(c)).padStart(3, '0'); return `${c < 0 ? '-' : ''}R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
const hhmm = (m) => m == null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
async function config(c, estab) {
  const r = await c.query('select nome_estudio, fuso from brow_config where estab=$1', [estab]).catch(() => ({ rows: [] }));
  const cfg = r.rows[0] || {}; return { nome: cfg.nome_estudio || 'Brow Studio', fuso: FUSOS.includes(cfg.fuso) ? cfg.fuso : 'America/Sao_Paulo' };
}
function hojeEm(fuso) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; }

// filtros comuns validados no servidor
async function lerFiltros(c, estab, q) {
  const tipo = TIPOS[q.tipo] ? q.tipo : null;
  if (!tipo) return { erro: 'Relatório desconhecido.' };
  if (!dataValida(q.de) || !dataValida(q.ate)) return { erro: 'Informe datas válidas.', campo: 'datas' };
  if (q.ate < q.de) return { erro: 'A data final deve ser igual ou posterior à inicial.', campo: 'ate' };
  if ((new Date(q.ate) - new Date(q.de)) / 864e5 > MAX_DIAS) return { erro: 'Período máximo de 3 anos.', campo: 'ate' };
  let prof = null;
  if (q.prof) { prof = (await c.query('select id, nome from brow_profissionais where estab=$1 and id=$2', [estab, String(q.prof)])).rows[0] || null; if (!prof) return { erro: 'Profissional não encontrada.', campo: 'prof' }; }
  return { tipo, de: q.de, ate: q.ate, prof };
}

// ─── DEFINIÇÕES DOS CONJUNTOS (mesma regra para resumo, detalhes e exportação) ──
// retorna { sql, params } de um SELECT com colunas padronizadas
function fonte(estab, f, sub) {
  const P = [estab, f.de, f.ate]; const add = (v) => { P.push(v); return `$${P.length}`; };
  if (f.tipo === 'financeiro') {
    const profL = f.prof ? ` and l.profissional_id=${add(f.prof.id)}` : '';
    if (sub === 'recebimentos' || sub === 'despesas') {
      const tipo = sub === 'recebimentos' ? 'receita' : 'despesa';
      return { params: P, sql: `select m.id, to_char(m.data,'YYYY-MM-DD') data, l.id lancamento_id, l.descricao, l.pessoa_nome, l.profissional_nome, m.valor_centavos valor, m.forma,
          case when l.cancelado then 'Cancelado' when (select coalesce(sum(x.valor_centavos),0) from brow_fin_movimentos x where x.estab=l.estab and x.lancamento_id=l.id and not x.estornado) >= l.total_centavos then 'Quitado' else 'Parcial' end situacao
        from brow_fin_movimentos m join brow_fin_lancamentos l on l.estab=m.estab and l.id=m.lancamento_id
        where m.estab=$1 and not m.estornado and l.tipo='${tipo}' and m.data between $2 and $3${profL}` };
    }
    // a receber: vencimento no período, saldo pendente agora
    return { params: P, sql: `select * from (select l.id, to_char(l.vencimento,'YYYY-MM-DD') data, l.id lancamento_id, l.descricao, l.pessoa_nome, l.profissional_nome,
        l.total_centavos - coalesce((select sum(x.valor_centavos) from brow_fin_movimentos x where x.estab=l.estab and x.lancamento_id=l.id and not x.estornado),0) valor, null::text forma,
        l.total_centavos total
      from brow_fin_lancamentos l where l.estab=$1 and l.tipo='receita' and not l.cancelado and l.vencimento between $2 and $3${profL}) z where z.valor > 0` };
  }
  if (f.tipo === 'atendimentos') {
    let w = ''; if (f.prof) w += ` and a.profissional_id=${add(f.prof.id)}`;
    if (sub && SIT_AG[sub]) w += ` and a.situacao=${add(sub)}`;
    return { params: P, sql: `select a.id, to_char(a.data,'YYYY-MM-DD') data, a.inicio_min, a.cliente_id, a.cliente_nome, a.servico_nome, a.profissional_nome, a.situacao, a.encaixe_id
      from brow_agendamentos a where a.estab=$1 and a.data between $2 and $3${w}` };
  }
  // execuções (serviços e clientes)
  const pa = f.prof ? ` and a.profissional_id=${add(f.prof.id)}` : '';
  const pg = f.prof ? ` and g.profissional_id=$${P.length}` : '';
  let sql = `select * from (
      select 'agenda' origem, a.id, to_char(a.data,'YYYY-MM-DD') data, a.fim_real_min hora, a.cliente_id, a.cliente_nome, coalesce(a.servico_id, 'nome:' || a.servico_nome) servico_chave, a.servico_nome, a.profissional_nome
        from brow_agendamentos a where a.estab=$1 and a.situacao='concluido' and a.data between $2 and $3${pa}
      union all
      select 'registro', g.id, to_char(g.data,'YYYY-MM-DD'), null, g.cliente_id, g.cliente_nome, coalesce(g.servico_id, 'nome:' || coalesce(g.servico_nome,'(sem serviço)')), coalesce(g.servico_nome,'(sem serviço)'), g.profissional_nome
        from brow_registros g where g.estab=$1 and g.situacao='finalizado' and g.agendamento_id is null and g.data between $2 and $3${pg}
    ) e where true`;
  if (sub && sub.servico) sql += ` and e.servico_chave=${add(sub.servico)}`;
  if (sub && sub.cliente) sql += ` and e.cliente_id=${add(sub.cliente)}`;
  return { params: P, sql };
}

async function resumo(c, estab, f, hj) {
  if (f.tipo === 'financeiro') {
    const tot = async (sub) => { const s = fonte(estab, f, sub); const r = await c.query(`select count(*)::int n, coalesce(sum(valor),0)::bigint v from (${s.sql}) t`, s.params); return { quantidade: r.rows[0].n, centavos: Number(r.rows[0].v) }; };
    const rec = await tot('recebimentos'), desp = await tot('despesas'), arec = await tot('a_receber');
    let semVinculo = null;
    if (f.prof) { const r = await c.query(`select count(*)::int n from brow_fin_movimentos m join brow_fin_lancamentos l on l.estab=m.estab and l.id=m.lancamento_id where m.estab=$1 and not m.estornado and l.tipo='despesa' and l.profissional_id is null and m.data between $2 and $3`, [estab, f.de, f.ate]); semVinculo = r.rows[0].n; }
    const est = await c.query(`select count(*)::int n from brow_fin_movimentos m join brow_fin_lancamentos l on l.estab=m.estab and l.id=m.lancamento_id where m.estab=$1 and m.estornado and m.data between $2 and $3${f.prof ? ' and l.profissional_id=$4' : ''}`, f.prof ? [estab, f.de, f.ate, f.prof.id] : [estab, f.de, f.ate]);
    return { recebimentos: rec, despesas: desp, a_receber: arec, resultado_centavos: rec.centavos - desp.centavos, despesas_gerais_excluidas: semVinculo, estornados: est.rows[0].n, hoje: hj };
  }
  if (f.tipo === 'atendimentos') {
    const s = fonte(estab, f);
    const r = await c.query(`select situacao, count(*)::int n from (${s.sql}) t group by situacao`, s.params);
    const por = Object.fromEntries(Object.keys(SIT_AG).map(k => [k, 0])); let outros = 0;
    for (const x of r.rows) { if (por[x.situacao] != null) por[x.situacao] = x.n; else outros += x.n; }
    const enc = await c.query(`select count(*)::int n from brow_encaixes e where e.estab=$1 and e.data between $2 and $3 and e.situacao in ('aguardando','chamado') and e.agendamento_id is null${f.prof ? ' and e.profissional_id=$4' : ''}`, f.prof ? [estab, f.de, f.ate, f.prof.id] : [estab, f.de, f.ate]);
    return { total: r.rows.reduce((a, x) => a + x.n, 0), por_situacao: por, outros, encaixes_aguardando: enc.rows[0].n };
  }
  const s = fonte(estab, f);
  const t = await c.query(`select count(*)::int execucoes, count(distinct cliente_id)::int clientes from (${s.sql}) t`, s.params);
  return { execucoes: t.rows[0].execucoes, clientes: t.rows[0].clientes };
}
// listas do resumo (ranking de serviços / clientes) — agrupamento sobre o conjunto inteiro
function agrupado(estab, f) {
  const s = fonte(estab, f);
  if (f.tipo === 'servicos') return { params: s.params, sql: `select servico_chave chave, (array_agg(servico_nome order by data desc))[1] nome, count(*)::int quantidade from (${s.sql}) t group by servico_chave`, ordem: 'quantidade desc, lower(nome)' };
  return { params: s.params, sql: `select cliente_id chave, (array_agg(cliente_nome order by data desc))[1] nome, count(*)::int quantidade from (${s.sql}) t group by cliente_id`, ordem: 'quantidade desc, lower(nome), chave' };
}

// ─── EXPORTAÇÃO ─────────────────────────────────────────────────────────────
const csvCampo = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csvValor = (c) => (Number(c) / 100).toFixed(2).replace('.', ',');
async function linhasExportacao(c, estab, f) {
  // devolve { cabecalho, linhas, totais(texto[]) } com TODOS os registros filtrados
  if (f.tipo === 'financeiro') {
    const linhas = []; const tot = [];
    for (const sub of Object.keys(CAT_FIN)) {
      const s = fonte(estab, f, sub); const r = await c.query(`${s.sql} order by data, descricao`, s.params);
      let soma = 0;
      for (const x of r.rows) { soma += Number(x.valor); linhas.push([CAT_FIN[sub], dataBR(x.data), x.descricao, x.pessoa_nome || '', x.profissional_nome || '', sub === 'a_receber' ? 'saldo pendente' : (FORMAS[x.forma] || ''), x.situacao || (sub === 'a_receber' ? (Number(x.valor) < Number(x.total) ? 'Parcial' : 'Pendente') : ''), Number(x.valor)]); }
      tot.push(`${CAT_FIN[sub]}: ${r.rows.length} registro(s), ${reais(soma)}`);
    }
    return { cabecalho: ['Categoria', 'Data', 'Descrição', 'Cliente/fornecedor', 'Profissional', 'Forma', 'Situação', 'Valor (R$)'], linhas, totais: tot, valorCol: 7 };
  }
  if (f.tipo === 'atendimentos') {
    const s = fonte(estab, f); const r = await c.query(`${s.sql} order by data, inicio_min, cliente_nome`, s.params);
    const res = await resumo(c, estab, f);
    return { cabecalho: ['Data', 'Horário', 'Cliente', 'Serviço', 'Profissional', 'Situação'], linhas: r.rows.map(x => [dataBR(x.data), hhmm(x.inicio_min), x.cliente_nome, x.servico_nome, x.profissional_nome, SIT_AG[x.situacao] || x.situacao]),
      totais: [`Total de agendamentos: ${res.total}`, ...Object.entries(res.por_situacao).filter(([, n]) => n).map(([k, n]) => `${SIT_AG[k]}: ${n}`), `Encaixes aguardando (fora do total): ${res.encaixes_aguardando}`] };
  }
  const g = agrupado(estab, f); const r = await c.query(`select * from (${g.sql}) g order by ${g.ordem}`, g.params);
  const res = await resumo(c, estab, f);
  if (f.tipo === 'servicos') return { cabecalho: ['Serviço', 'Quantidade realizada'], linhas: r.rows.map(x => [x.nome, x.quantidade]), totais: [`Procedimentos realizados: ${res.execucoes}`] };
  return { cabecalho: ['Cliente', 'Visitas concluídas'], linhas: r.rows.map(x => [x.nome, x.quantidade]), totais: [`Clientes únicas: ${res.clientes}`, `Atendimentos concluídos: ${res.execucoes}`] };
}
const CRITERIO = {
  financeiro: 'Recebido e pago: data efetiva de cada movimento (estornos não entram). A receber: vencimento no período, saldo pendente na data da geração.',
  atendimentos: 'Data prevista de cada agendamento, contado uma vez na situação atual. Encaixes aguardando não entram no total.',
  servicos: 'Somente atendimentos concluídos (data do atendimento concluído) e registros finalizados sem agendamento.',
  clientes: 'Clientes pelo cadastro (ID), com atendimentos concluídos no período.'
};

module.exports = async function relatorios(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;
  const cfg = await config(c, estab); const hj = hojeEm(cfg.fuso);

  if (acao === 'rl_inicio') {
    const pr = await c.query('select id, nome, ativo from brow_profissionais where estab=$1 order by ativo desc, lower(nome)', [estab]);
    const mes = hj.slice(0, 8) + '01'; const fim = new Date(Date.UTC(+hj.slice(0, 4), +hj.slice(5, 7), 0)).toISOString().slice(0, 10);
    res.status(200).json({ ok: true, hoje: hj, padrao: { de: mes, ate: fim }, profissionais: pr.rows, fuso: cfg.fuso, financeiro_permitido: podeFinanceiro(usuario) }); return;
  }
  const f = await lerFiltros(c, estab, q);
  if (f.erro) return erro(res, 422, 'filtros', f.erro, { campo: f.campo });
  if (f.tipo === 'financeiro' && !podeFinanceiro(usuario)) return erro(res, 403, 'sem_permissao', 'Sua função não tem acesso ao relatório financeiro.');
  const filtrosTxt = { tipo: TIPOS[f.tipo], de: f.de, ate: f.ate, profissional: f.prof ? f.prof.nome : 'Todas', criterio: CRITERIO[f.tipo] };

  if (acao === 'rl_resumo') {
    const r = await resumo(c, estab, f, hj);
    let lista = null;
    if (f.tipo === 'servicos' || f.tipo === 'clientes') {
      const L = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
      const g = agrupado(estab, f);
      const total = (await c.query(`select count(*)::int n from (${g.sql}) t`, g.params)).rows[0].n;
      const paginas = Math.max(1, Math.ceil(total / L)); const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
      const it = await c.query(`select * from (${g.sql}) g order by ${g.ordem} limit ${L} offset ${(pg - 1) * L}`, g.params);
      lista = { total, pagina: pg, paginas, itens: it.rows.map((x, i) => ({ ...x, posicao: (pg - 1) * L + i + 1 })) };
    }
    res.status(200).json({ ok: true, filtros: filtrosTxt, resumo: r, lista }); return;
  }

  if (acao === 'rl_detalhes') {
    const L = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    let s, ordem, soma = false;
    if (f.tipo === 'financeiro') { if (!CAT_FIN[q.cat]) return erro(res, 422, 'filtros', 'Categoria desconhecida.'); s = fonte(estab, f, q.cat); ordem = 'data desc, descricao'; soma = true; }
    else if (f.tipo === 'atendimentos') { s = fonte(estab, f, q.situacao || null); ordem = 'data, inicio_min, cliente_nome'; }
    else if (f.tipo === 'servicos') { if (!q.servico) return erro(res, 422, 'filtros', 'Escolha o serviço.'); s = fonte(estab, f, { servico: String(q.servico) }); ordem = 'data desc, cliente_nome'; }
    else { if (!q.cliente) return erro(res, 422, 'filtros', 'Escolha a cliente.'); s = fonte(estab, f, { cliente: String(q.cliente) }); ordem = 'data desc'; }
    const t = (await c.query(`select count(*)::int n${soma ? ', coalesce(sum(valor),0)::bigint v' : ''} from (${s.sql}) t`, s.params)).rows[0];
    const paginas = Math.max(1, Math.ceil(t.n / L)); const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select * from (${s.sql}) t order by ${ordem} limit ${L} offset ${(pg - 1) * L}`, s.params);
    const itens = r.rows.map(x => {
      if (f.tipo === 'financeiro') return { id: x.id, data: x.data, descricao: x.descricao, pessoa: x.pessoa_nome, profissional: x.profissional_nome, valor_centavos: Number(x.valor), forma: FORMAS[x.forma] || null,
        situacao: x.situacao || (Number(x.valor) < Number(x.total) ? 'Parcial' : 'Pendente') + (x.data < hj ? ' · vencido' : ''), origem: `/brow-studio/financeiro/ver/?id=${encodeURIComponent(x.lancamento_id)}` };
      if (f.tipo === 'atendimentos') return { id: x.id, data: x.data, horario: hhmm(x.inicio_min), cliente: x.cliente_nome, servico: x.servico_nome, profissional: x.profissional_nome, situacao: SIT_AG[x.situacao] || x.situacao, encaixe: !!x.encaixe_id, origem: `/brow-studio/agenda/atendimento/?id=${encodeURIComponent(x.id)}` };
      return { id: x.id, data: x.data, horario: hhmm(x.hora), cliente: x.cliente_nome, cliente_id: x.cliente_id, servico: x.servico_nome, profissional: x.profissional_nome, fonte: x.origem,
        origem: x.origem === 'agenda' ? `/brow-studio/agenda/atendimento/?id=${encodeURIComponent(x.id)}` : `/brow-studio/registros/ver/?id=${encodeURIComponent(x.id)}` };
    });
    let titulo = '';
    if (f.tipo === 'servicos') titulo = r.rows[0] ? r.rows[0].servico_nome : '';
    if (f.tipo === 'clientes') titulo = r.rows[0] ? r.rows[0].cliente_nome : '';
    res.status(200).json({ ok: true, filtros: filtrosTxt, total: t.n, soma_centavos: soma ? Number(t.v) : null, pagina: pg, paginas, itens, titulo }); return;
  }

  if (acao === 'rl_exportar') {
    const formato = q.formato === 'pdf' ? 'pdf' : q.formato === 'csv' ? 'csv' : null;
    if (!formato) return erro(res, 422, 'formato', 'Formato inválido.');
    const ex = await linhasExportacao(c, estab, f);
    const gerado = new Intl.DateTimeFormat('pt-BR', { timeZone: cfg.fuso, dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    const cab = [`${cfg.nome} — Relatório: ${TIPOS[f.tipo]}`, `Período: ${dataBR(f.de)} a ${dataBR(f.ate)} (dias inteiros, fuso ${cfg.fuso})`, `Profissional: ${f.prof ? f.prof.nome : 'Todas'}${f.tipo === 'financeiro' && f.prof ? ' (despesas gerais sem profissional não incluídas)' : ''}`,
      `Critério: ${CRITERIO[f.tipo]}`, `Gerado em: ${gerado}`];
    const nomeArq = `relatorio-${f.tipo}-${f.de}-a-${f.ate}`;
    if (formato === 'csv') {
      const fmt = (l) => l.map((v, i) => i === ex.valorCol && typeof v === 'number' ? csvValor(v) : csvCampo(v)).join(';');
      const corpo = [...cab.map(x => csvCampo(x)), ...ex.totais.map(csvCampo), '', ex.cabecalho.map(csvCampo).join(';'), ...ex.linhas.map(fmt)].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArq}.csv"`);
      res.status(200).end('﻿' + corpo); return;
    }
    const blocos = [{ texto: cab[0], tamanho: 14, negrito: true }, ...cab.slice(1).map(t => ({ texto: t, tamanho: 9 })), { texto: 'Totais', tamanho: 11, negrito: true, espaco: 10 }, ...ex.totais.map(t => ({ texto: t, tamanho: 10 })),
      { texto: `Registros (${ex.linhas.length})`, tamanho: 11, negrito: true, espaco: 10 }, { texto: ex.cabecalho.join(' | '), tamanho: 8, negrito: true }];
    for (const l of ex.linhas) blocos.push({ texto: l.map((v, i) => i === ex.valorCol && typeof v === 'number' ? reais(v) : String(v == null ? '' : v)).join(' | '), tamanho: 8 });
    if (!ex.linhas.length) blocos.push({ texto: 'Nenhum registro no período e filtros escolhidos.', tamanho: 9 });
    const pdf = require('./brow-termos.js')._teste.gerarPdf(blocos.map(b => ({ ...b, texto: b.texto.replace(/[−—]/g, '-') })), null);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArq}.pdf"`);
    res.status(200).end(pdf); return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { csvCampo };
