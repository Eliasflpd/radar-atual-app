// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — AGENDA, AGENDAMENTOS E ENCAIXES (10/11/2026)
// Chamado por api/_lib/brow-studio.js para ações "ag_*" e "enc_*" (mesma rota
// /api/brow, mesma trava de acesso, mesma conexão). Tabelas brow_* — nada do
// RADAR é tocado.
//
// HORAS: tudo é guardado em "minutos do dia" no FUSO DO ESTABELECIMENTO
// (config.fuso, padrão America/Sao_Paulo) + a data local. "Hoje" e "agora" vêm
// sempre do servidor convertidos para esse fuso — nunca do relógio do aparelho.
//
// RESERVA: um agendamento ocupa [inicio_min, reserva_fim_min) da profissional,
// onde reserva_fim = término previsto + intervalo após o serviço. Situações que
// ocupam: agendado, confirmado, chegou, em_atendimento, concluido.
// Cancelado e falta liberam.
//
// SEM SOBREPOSIÇÃO, MESMO COM DOIS TOQUES AO MESMO TEMPO: toda gravação que
// reserva horário abre uma transação e pega pg_advisory_xact_lock da chave
// (estab, profissional, data). Dentro do cadeado confere a disponibilidade de
// novo e só então grava. Quem chegar depois espera e encontra o horário ocupado.
//
// ENCAIXE ≠ AGENDAMENTO: encaixe é uma espera, com chegada prevista que NÃO
// reserva nada. Só vira reserva quando a profissional EFETIVA numa oportunidade
// livre — uma vez só (agendamento_id) e sem tocar nos próximos atendimentos.
//
// TÉRMINO ANTECIPADO: ao concluir antes, reserva_fim encolhe para
// término real + intervalo. Nunca mexe no horário de outra cliente.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const OCUPA = ['agendado', 'confirmado', 'chegou', 'em_atendimento', 'concluido'];
const SIT_AG = { agendado: 'Agendado', confirmado: 'Presença confirmada', chegou: 'Chegou', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', falta: 'Faltou' };
const SIT_ENC = { aguardando: 'Aguardando', chamado: 'Chamado', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', desistiu: 'Desistiu' };
// A chegada real é um DADO do encaixe (chegada_real_min), não uma situação: quem chegou continua Aguardando.
const ENC_ATIVO = ['aguardando', 'chamado'];
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const FUSOS = ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha'];

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_config(
    estab text primary key, nome_estudio text not null default 'Brow Studio',
    fuso text not null default 'America/Sao_Paulo', passo_min integer not null default 15 check (passo_min in (5,10,15,20,30)),
    horarios jsonb, atualizado_em timestamptz not null default now())`);
  await c.query(`create table if not exists brow_profissionais(
    id text primary key, estab text not null, nome text not null, ativo boolean not null default true,
    chave_envio text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_prof_envio on brow_profissionais(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create table if not exists brow_bloqueios(
    id text primary key, estab text not null, profissional_id text not null, data date not null,
    inicio_min integer not null, fim_min integer not null check (fim_min > inicio_min),
    motivo text, removido boolean not null default false, chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_bloq_envio on brow_bloqueios(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create table if not exists brow_agendamentos(
    id text primary key, estab text not null,
    profissional_id text not null, profissional_nome text not null,
    cliente_id text not null, cliente_nome text not null, whatsapp text,
    servico_id text not null, servico_nome text not null,
    duracao_min integer not null, intervalo_min integer not null, valor_centavos integer not null check (valor_centavos >= 0),
    data date not null, inicio_min integer not null, fim_min integer not null, reserva_fim_min integer not null,
    situacao text not null default 'agendado', observacoes text,
    inicio_real_min integer, fim_real_min integer, chegada_min integer,
    remarcado boolean not null default false, encaixe_id text, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
    check (fim_min > inicio_min and reserva_fim_min >= fim_min - duracao_min))`);
  await c.query(`create unique index if not exists brow_ag_envio on brow_agendamentos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_ag_encaixe on brow_agendamentos(estab, encaixe_id) where encaixe_id is not null`);
  await c.query(`create index if not exists brow_ag_dia on brow_agendamentos(estab, data, profissional_id)`);
  await c.query(`create table if not exists brow_encaixes(
    id text primary key, estab text not null,
    cliente_id text not null, cliente_nome text not null, whatsapp text,
    servico_id text not null, servico_nome text not null, duracao_min integer not null, intervalo_min integer not null, valor_centavos integer not null,
    profissional_id text, profissional_nome text,
    data date not null, chegada_prevista_min integer not null, ordem integer not null,
    chegada_real_min integer, situacao text not null default 'aguardando', observacoes text,
    agendamento_id text, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_enc_envio on brow_encaixes(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_enc_dia on brow_encaixes(estab, data)`);
  await c.query(`create table if not exists brow_historico(
    id bigserial primary key, estab text not null, tipo text not null, ref_id text not null,
    acao text not null, detalhes jsonb, criado_em timestamptz not null default now())`);
  await c.query(`create index if not exists brow_hist_ref on brow_historico(estab, tipo, ref_id)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const digitos = (v) => (v == null ? '' : String(v)).replace(/\D/g, '');
function telefoneValido(d) {
  if (d.length !== 10 && d.length !== 11) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]);
}
const hhmmParaMin = (s) => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const minParaHhmm = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
const diaDaSemana = (data) => new Date(data + 'T12:00:00Z').getUTCDay();
function hojeAgora(fuso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { hoje: `${p.year}-${p.month}-${p.day}`, agora: (+p.hour) * 60 + (+p.minute) };
}
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const sobrepoe = (a1, b1, a2, b2) => a1 < b2 && a2 < b1;
async function historico(c, estab, tipo, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, tipo, id, acao, det ? JSON.stringify(det) : null]);
}
async function cadeado(c, estab, prof, data) { await c.query('select pg_advisory_xact_lock(hashtext($1))', [`brow|${estab}|${prof}|${data}`]); }

// horários: {"0":{aberto,inicio,fim,pausas:[{inicio,fim}]}, ... "6":{...}}  (0 = domingo)
function lerHorarioDia(h) {
  if (!h || !h.aberto) return { aberto: false };
  const i = hhmmParaMin(h.inicio), f = hhmmParaMin(h.fim);
  if (i === null || f === null || f <= i) return { aberto: false };
  const pausas = (Array.isArray(h.pausas) ? h.pausas : []).map(p => [hhmmParaMin(p.inicio), hhmmParaMin(p.fim)])
    .filter(([a, b]) => a !== null && b !== null && b > a);
  return { aberto: true, inicio: i, fim: f, pausas };
}
async function lerConfig(c, estab) {
  const r = await c.query('select * from brow_config where estab=$1', [estab]);
  const cfg = r.rows[0] || { estab, nome_estudio: 'Brow Studio', fuso: 'America/Sao_Paulo', passo_min: 15, horarios: null };
  if (!FUSOS.includes(cfg.fuso)) cfg.fuso = 'America/Sao_Paulo';
  return cfg;
}

// ─── DISPONIBILIDADE ────────────────────────────────────────────────────────
// Ocupações da profissional no dia: agendamentos que ocupam + bloqueios.
async function ocupacoes(c, estab, prof, data, ignorarId) {
  const ag = await c.query(`select id, inicio_min, reserva_fim_min, cliente_nome, situacao from brow_agendamentos
    where estab=$1 and profissional_id=$2 and data=$3 and situacao = any($4) and id <> $5 order by inicio_min`,
    [estab, prof, data, OCUPA, ignorarId || '']);
  const bl = await c.query(`select inicio_min, fim_min, motivo from brow_bloqueios where estab=$1 and profissional_id=$2 and data=$3 and not removido`, [estab, prof, data]);
  return [...ag.rows.map(x => ({ a: x.inicio_min, b: x.reserva_fim_min, tipo: 'agendamento', nome: x.cliente_nome })),
          ...bl.rows.map(x => ({ a: x.inicio_min, b: x.fim_min, tipo: 'bloqueio', nome: x.motivo }))];
}
// Motivo pelo qual um início não serve (null = livre).
function motivoOcupado(s, dur, int, dia, ocup, minInicio) {
  if (!dia.aberto) return 'O estúdio não abre neste dia.';
  if (s < dia.inicio || s + dur > dia.fim) return 'Fora do horário de funcionamento.';
  if (s < minInicio) return 'Esse horário já passou.';
  if (dia.pausas.some(([a, b]) => sobrepoe(s, s + dur, a, b))) return 'O atendimento cairia numa pausa.';
  const o = ocup.find(x => sobrepoe(s, s + dur + int, x.a, x.b));
  if (o) return o.tipo === 'bloqueio' ? 'Há um bloqueio na agenda da profissional nesse período.'
    : `Não há tempo suficiente: o próximo atendimento (${minParaHhmm(o.a)}) seria prejudicado.`;
  return null;
}
// Inícios possíveis: grade do passo + fim de cada ocupação/pausa + "agora" arredondado (5 min).
function inicios(dur, int, dia, ocup, minInicio, passo) {
  if (!dia.aberto) return [];
  const cand = new Set();
  for (let s = dia.inicio; s + dur <= dia.fim; s += passo) cand.add(s);
  ocup.forEach(o => cand.add(Math.ceil(o.b / 5) * 5));
  dia.pausas.forEach(([, b]) => cand.add(b));
  if (minInicio > dia.inicio) cand.add(Math.ceil(minInicio / 5) * 5);
  return [...cand].filter(s => !motivoOcupado(s, dur, int, dia, ocup, minInicio)).sort((x, y) => x - y);
}
function minimoDoDia(data, ha) { return data < ha.hoje ? Infinity : data === ha.hoje ? ha.agora : 0; }

async function servicoAtivo(c, estab, id) {
  const r = await c.query('select * from brow_servicos where estab=$1 and id=$2', [estab, String(id || '')]);
  return r.rows[0] || null;
}
async function profissional(c, estab, id) {
  const r = await c.query('select * from brow_profissionais where estab=$1 and id=$2', [estab, String(id || '')]);
  return r.rows[0] || null;
}
async function cliente(c, estab, id) {
  const r = await c.query('select id,nome,apelido,telefone,contato_pref from brow_clientes where estab=$1 and id=$2', [estab, String(id || '')]);
  return r.rows[0] || null;
}
function linhaAg(x) {
  return { ...x, data: typeof x.data === 'string' ? x.data : x.data.toISOString().slice(0, 10), situacao_nome: SIT_AG[x.situacao] || x.situacao,
    inicio: minParaHhmm(x.inicio_min), fim: minParaHhmm(x.fim_min), reserva_fim: minParaHhmm(x.reserva_fim_min),
    inicio_real: x.inicio_real_min != null ? minParaHhmm(x.inicio_real_min) : null, fim_real: x.fim_real_min != null ? minParaHhmm(x.fim_real_min) : null,
    chegada: x.chegada_min != null ? minParaHhmm(x.chegada_min) : null };
}
function linhaEnc(x) {
  return { ...x, data: typeof x.data === 'string' ? x.data : x.data.toISOString().slice(0, 10), situacao_nome: SIT_ENC[x.situacao] || x.situacao,
    chegada_prevista: minParaHhmm(x.chegada_prevista_min), chegada_real: x.chegada_real_min != null ? minParaHhmm(x.chegada_real_min) : null };
}
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });

// Data no formato do banco (to_char evita qualquer conversão de fuso do driver)
const SEL_AG = `select *, to_char(data,'YYYY-MM-DD') as data from brow_agendamentos`;
const SEL_ENC = `select *, to_char(data,'YYYY-MM-DD') as data from brow_encaixes`;

// ═══════════════════════════════════════════════════════════════════════════
module.exports = async function agenda(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);           // tabelas de clientes e serviços
  await garantirTabelas(c);
  const q = req.query || {};
  const b = req.method === 'POST' ? corpo(req) : {};
  const cfg = await lerConfig(c, estab);
  const ha = hojeAgora(cfg.fuso);
  const configurada = !!(cfg.horarios && Object.values(cfg.horarios).some(h => h && h.aberto));

  // ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────
  if (acao === 'ag_config_ver') {
    const pr = await c.query('select id,nome,ativo from brow_profissionais where estab=$1 order by ativo desc, lower(nome)', [estab]);
    res.status(200).json({ ok: true, config: { nome_estudio: cfg.nome_estudio, fuso: cfg.fuso, passo_min: cfg.passo_min, horarios: cfg.horarios || null },
      configurada, profissionais: pr.rows, fusos: FUSOS, hoje: ha.hoje, agora: minParaHhmm(ha.agora) });
    return;
  }
  if (req.method === 'POST' && acao === 'ag_config_salvar') {
    const erros = {};
    const nome = txt(b.nome_estudio, 60);
    if (!nome || nome.length < 2) erros.nome_estudio = 'Informe o nome do estúdio.';
    if (!FUSOS.includes(b.fuso)) erros.fuso = 'Escolha o fuso horário.';
    const passo = parseInt(b.passo_min, 10);
    if (![5, 10, 15, 20, 30].includes(passo)) erros.passo_min = 'Escolha o intervalo da grade.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query(`insert into brow_config(estab,nome_estudio,fuso,passo_min) values($1,$2,$3,$4)
      on conflict(estab) do update set nome_estudio=$2, fuso=$3, passo_min=$4, atualizado_em=now()`, [estab, nome, b.fuso, passo]);
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && acao === 'ag_horario_salvar') {
    const dia = String(b.dia);
    if (!/^[0-6]$/.test(dia)) return erro(res, 400, 'dia', 'Dia inválido.');
    const erros = {};
    let h = { aberto: false };
    if (b.aberto === true) {
      const i = hhmmParaMin(b.inicio), f = hhmmParaMin(b.fim);
      if (i === null) erros.inicio = 'Informe a abertura.';
      if (f === null) erros.fim = 'Informe o fechamento.';
      if (i !== null && f !== null && f <= i) erros.fim = 'O fechamento deve ser depois da abertura.';
      const pausas = [];
      (Array.isArray(b.pausas) ? b.pausas : []).forEach((p, k) => {
        if (!p || (!p.inicio && !p.fim)) return;
        const a = hhmmParaMin(p.inicio), z = hhmmParaMin(p.fim);
        if (a === null || z === null || z <= a) erros[`pausa${k + 1}`] = 'Pausa inválida: o fim deve ser depois do início.';
        else if (i !== null && f !== null && (a < i || z > f)) erros[`pausa${k + 1}`] = 'A pausa deve ficar dentro do horário de funcionamento.';
        else pausas.push({ inicio: minParaHhmm(a), fim: minParaHhmm(z) });
      });
      if (pausas.length === 2 && sobrepoe(hhmmParaMin(pausas[0].inicio), hhmmParaMin(pausas[0].fim), hhmmParaMin(pausas[1].inicio), hhmmParaMin(pausas[1].fim))) erros.pausa2 = 'As pausas não podem se sobrepor.';
      h = { aberto: true, inicio: b.inicio, fim: b.fim, pausas };
    }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os horários.', { erros });
    await c.query(`insert into brow_config(estab,horarios) values($1, jsonb_build_object($2::text, $3::jsonb))
      on conflict(estab) do update set horarios = coalesce(brow_config.horarios,'{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb), atualizado_em=now()`,
      [estab, dia, JSON.stringify(h)]);
    res.status(200).json({ ok: true }); return;
  }
  // HORÁRIOS DO ESTÚDIO enviados pela dona (11/11/2026): terça a sábado, 08:00–18:00 com pausa 11:00–13:00;
  // domingo e segunda fechados. Aplicados só por ação explícita da dona (botão em Horários).
  if (req.method === 'POST' && acao === 'ag_horarios_aplicar_estudio') {
    const aberto = { aberto: true, inicio: '08:00', fim: '18:00', pausas: [{ inicio: '11:00', fim: '13:00' }] };
    const hs = { 0: { aberto: false }, 1: { aberto: false }, 2: aberto, 3: aberto, 4: aberto, 5: aberto, 6: aberto };
    await c.query(`insert into brow_config(estab,horarios) values($1,$2::jsonb) on conflict(estab) do update set horarios = coalesce(brow_config.horarios,'{}'::jsonb) || $2::jsonb, atualizado_em=now()`, [estab, JSON.stringify(hs)]);
    await historico(c, estab, 'config', estab, 'horarios_estudio_aplicados', { autor: req.brow_usuario || null });
    res.status(200).json({ ok: true }); return;
  }
  if (req.method === 'POST' && acao === 'ag_prof_salvar') {
    const nome = txt(b.nome, 60);
    if (!nome || nome.length < 2) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { nome: 'Informe o nome da profissional.' } });
    const ativo = b.ativo !== false;
    if (b.id) {
      const r = await c.query('update brow_profissionais set nome=$3, ativo=$4, atualizado_em=now() where estab=$1 and id=$2', [estab, String(b.id), nome, ativo]);
      if (!r.rowCount) return erro(res, 404, 'nao_encontrada', 'Profissional não encontrada.');
      res.status(200).json({ ok: true, id: b.id }); return;
    }
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const ja = await c.query('select id from brow_profissionais where estab=$1 and chave_envio=$2', [estab, chave]);
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    const id = crypto.randomUUID();
    await c.query('insert into brow_profissionais(id,estab,nome,ativo,chave_envio) values($1,$2,$3,$4,$5) on conflict do nothing', [id, estab, nome, ativo, chave]);
    res.status(201).json({ ok: true, id }); return;
  }
  if (acao === 'ag_bloqueios_listar') {
    const data = dataValida(q.data) ? q.data : ha.hoje;
    const r = await c.query(`select b.id, b.profissional_id, p.nome profissional_nome, b.inicio_min, b.fim_min, b.motivo from brow_bloqueios b
      join brow_profissionais p on p.id=b.profissional_id where b.estab=$1 and b.data=$2 and not b.removido order by b.inicio_min`, [estab, data]);
    res.status(200).json({ ok: true, data, itens: r.rows.map(x => ({ ...x, inicio: minParaHhmm(x.inicio_min), fim: minParaHhmm(x.fim_min) })) }); return;
  }
  if (req.method === 'POST' && acao === 'ag_bloqueio_criar') {
    const erros = {};
    const p = await profissional(c, estab, b.profissional_id);
    if (!p) erros.profissional_id = 'Escolha a profissional.';
    if (!dataValida(b.data)) erros.data = 'Data inválida.';
    const i = hhmmParaMin(b.inicio), f = hhmmParaMin(b.fim);
    if (i === null) erros.inicio = 'Informe o início.';
    if (f === null || (i !== null && f <= i)) erros.fim = 'O fim deve ser depois do início.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    const ja = chave ? await c.query('select id from brow_bloqueios where estab=$1 and chave_envio=$2', [estab, chave]) : { rows: [] };
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    await c.query('begin');
    try {
      await cadeado(c, estab, p.id, b.data);
      // bloqueio não apaga reservas: se houver atendimento no período, avisa e não grava
      const conf = (await ocupacoes(c, estab, p.id, b.data)).filter(o => o.tipo === 'agendamento' && sobrepoe(i, f, o.a, o.b));
      if (conf.length) { await c.query('rollback'); return erro(res, 409, 'conflito', `Há atendimento marcado nesse período (${conf.map(o => minParaHhmm(o.a) + ' ' + o.nome).join(', ')}). Remarque ou cancele antes de bloquear.`); }
      const id = crypto.randomUUID();
      await c.query('insert into brow_bloqueios(id,estab,profissional_id,data,inicio_min,fim_min,motivo,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, estab, p.id, b.data, i, f, txt(b.motivo, 80), chave]);
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }
  if (req.method === 'POST' && acao === 'ag_bloqueio_remover') {
    await c.query('update brow_bloqueios set removido=true where estab=$1 and id=$2', [estab, String(b.id || '')]);
    res.status(200).json({ ok: true }); return;
  }

  // ─── AGENDA DO DIA ────────────────────────────────────────────────────────
  if (acao === 'ag_dia') {
    const data = dataValida(q.data) ? q.data : ha.hoje;
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab, data];
    let filtro = '';
    if (q.prof) { params.push(String(q.prof)); filtro = ` and profissional_id=$3`; }
    const tot = await c.query(`select count(*)::int n from brow_agendamentos where estab=$1 and data=$2${filtro}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`${SEL_AG} where estab=$1 and data=$2${filtro}
      order by inicio_min, case when situacao = any('{cancelado,falta}') then 1 else 0 end, criado_em limit ${limite} offset ${(pg - 1) * limite}`, params);
    const enc = await c.query(`select count(*)::int n from brow_encaixes where estab=$1 and data=$2 and situacao = 'aguardando'`, [estab, data]);
    const dia = lerHorarioDia((cfg.horarios || {})[String(diaDaSemana(data))]);
    res.status(200).json({ ok: true, data, hoje: ha.hoje, agora: minParaHhmm(ha.agora), configurada, total, pagina: pg, paginas, limite,
      aguardando: enc.rows[0].n, dia: dia.aberto ? { aberto: true, inicio: minParaHhmm(dia.inicio), fim: minParaHhmm(dia.fim), pausas: dia.pausas.map(([a, z]) => minParaHhmm(a) + '–' + minParaHhmm(z)) } : { aberto: false },
      itens: r.rows.map(linhaAg) });
    return;
  }

  // ─── DISPONIBILIDADE ──────────────────────────────────────────────────────
  if (acao === 'ag_disponibilidade') {
    const data = q.data;
    if (!dataValida(data)) return erro(res, 400, 'data', 'Data inválida.');
    const s = await servicoAtivo(c, estab, q.servico_id);
    const p = await profissional(c, estab, q.profissional_id);
    if (!s || !p) return erro(res, 404, 'nao_encontrado', 'Serviço ou profissional não encontrado.');
    const dia = lerHorarioDia((cfg.horarios || {})[String(diaDaSemana(data))]);
    const ocup = await ocupacoes(c, estab, p.id, data, q.ignorar);
    const lista = inicios(s.duracao_min, s.intervalo_min, dia, ocup, minimoDoDia(data, ha), cfg.passo_min);
    let motivo = null;
    if (!configurada) motivo = 'Os horários de funcionamento ainda não foram configurados.';
    else if (!dia.aberto) motivo = 'O estúdio não abre neste dia.';
    else if (data < ha.hoje) motivo = 'Essa data já passou.';
    else if (!lista.length) motivo = 'Não há horário livre com tempo para este serviço e o intervalo após ele.';
    res.status(200).json({ ok: true, data, motivo, duracao_min: s.duracao_min, intervalo_min: s.intervalo_min, valor_centavos: s.valor_centavos,
      horarios: lista.map(x => ({ inicio: minParaHhmm(x), inicio_min: x, fim: minParaHhmm(x + s.duracao_min), reserva_fim: minParaHhmm(x + s.duracao_min + s.intervalo_min) })) });
    return;
  }

  // ─── CRIAR AGENDAMENTO (também usado pela efetivação de encaixe) ─────────
  async function reservar({ chave, clienteId, whatsapp, atualizarCadastro, profId, servicoId, data, inicioMin, observacoes, encaixeId }) {
    const erros = {};
    const cl = await cliente(c, estab, clienteId);
    if (!cl) erros.cliente_id = 'Escolha a cliente.';
    const s = await servicoAtivo(c, estab, servicoId);
    if (!s) erros.servico_id = 'Escolha o serviço.';
    else if (!s.ativo && !encaixeId) erros.servico_id = 'Esse serviço está inativo e não pode ser agendado.';
    const p = await profissional(c, estab, profId);
    if (!p) erros.profissional_id = 'Escolha a profissional.';
    else if (!p.ativo) erros.profissional_id = 'Essa profissional está inativa.';
    if (!dataValida(data)) erros.data = 'Data inválida.';
    const tel = digitos(whatsapp);
    if (tel && !telefoneValido(tel)) erros.whatsapp = 'WhatsApp inválido. Use DDD + número.';
    if (!Number.isInteger(inicioMin) || inicioMin % 5) erros.inicio_min = 'Horário inválido.';
    if (Object.keys(erros).length) return { st: 422, j: { ok: false, erro: 'validacao', msg: 'Confira os dados.', erros } };
    const dia = lerHorarioDia((cfg.horarios || {})[String(diaDaSemana(data))]);
    await c.query('begin');
    try {
      await cadeado(c, estab, p.id, data);
      if (chave) {
        const ja = await c.query('select id from brow_agendamentos where estab=$1 and chave_envio=$2', [estab, chave]);
        if (ja.rows.length) { await c.query('rollback'); return { st: 200, j: { ok: true, id: ja.rows[0].id, repetido: true } }; }
      }
      // REVALIDA dentro do cadeado (outra pessoa pode ter reservado agora)
      const ocup = await ocupacoes(c, estab, p.id, data);
      const motivo = motivoOcupado(inicioMin, s.duracao_min, s.intervalo_min, dia, ocup, minimoDoDia(data, ha));
      if (motivo) { await c.query('rollback'); return { st: 409, j: { ok: false, erro: 'indisponivel', msg: `Esse horário não está mais disponível. ${motivo}` } }; }
      const id = crypto.randomUUID();
      await c.query(`insert into brow_agendamentos(id,estab,profissional_id,profissional_nome,cliente_id,cliente_nome,whatsapp,servico_id,servico_nome,
          duracao_min,intervalo_min,valor_centavos,data,inicio_min,fim_min,reserva_fim_min,observacoes,encaixe_id,chave_envio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [id, estab, p.id, p.nome, cl.id, cl.nome, tel || null, s.id, s.nome, s.duracao_min, s.intervalo_min, s.valor_centavos,
          data, inicioMin, inicioMin + s.duracao_min, inicioMin + s.duracao_min + s.intervalo_min, (observacoes || '').trim().slice(0, 500) || null, encaixeId || null, chave || null]);
      if (atualizarCadastro && tel && tel !== cl.telefone) {
        await c.query('update brow_clientes set telefone=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, cl.id, tel]);
      }
      await historico(c, estab, 'agendamento', id, encaixeId ? 'criado_por_encaixe' : 'criado',
        { data, inicio: minParaHhmm(inicioMin), profissional: p.nome, servico: s.nome, whatsapp_atualizou_cadastro: !!(atualizarCadastro && tel && tel !== cl.telefone), encaixe_id: encaixeId || null });
      return { st: 201, j: { ok: true, id }, transacao: true };
    } catch (e) { await c.query('rollback'); throw e; }
  }

  if (req.method === 'POST' && acao === 'ag_criar') {
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const r = await reservar({ chave, clienteId: b.cliente_id, whatsapp: b.whatsapp, atualizarCadastro: b.atualizar_cadastro === true,
      profId: b.profissional_id, servicoId: b.servico_id, data: b.data, inicioMin: b.inicio_min, observacoes: b.observacoes });
    // retorno (módulo 10): vincula a reserva ao acompanhamento NA MESMA transação; recusa 2ª reserva ativa
    if (r.transacao && b.retorno_id && !r.j.repetido) {
      const v = await require('./brow-retornos.js').vincular(c, estab, b.retorno_id, { agendamentoId: r.j.id, clienteId: String(b.cliente_id || '') });
      if (!v.ok) { await c.query('rollback'); return erro(res, 409, 'retorno', v.msg); }
      r.j.retorno_id = String(b.retorno_id);
    }
    // pacote (módulo 12): reserva 1 sessão do item NA MESMA transação; recusa se passar do saldo
    if (r.transacao && b.pacote_item_id && !r.j.repetido) {
      const v = await require('./brow-orcamentos.js').vincularReserva(c, estab, b.pacote_item_id, { agendamentoId: r.j.id, clienteId: String(b.cliente_id || ''), servicoId: String(b.servico_id || ''), data: b.data, autor: null });
      if (!v.ok) { await c.query('rollback'); return erro(res, 409, 'pacote', v.msg); }
      r.j.pacote_item_id = String(b.pacote_item_id);
    }
    if (r.transacao) await c.query('commit');
    res.status(r.st).json(r.j); return;
  }

  if (acao === 'ag_ver') {
    const r = await c.query(`${SEL_AG} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.');
    const a = linhaAg(r.rows[0]);
    const cl = await cliente(c, estab, a.cliente_id);
    const h = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='agendamento' and ref_id=$2 order by id`, [estab, a.id]);
    // atraso: término real/previsto passando do início do próximo atendimento
    let aviso = null;
    if (OCUPA.includes(a.situacao)) {
      const prox = await c.query(`select inicio_min, cliente_nome from brow_agendamentos where estab=$1 and profissional_id=$2 and data=$3
        and situacao = any($4) and id<>$5 and inicio_min >= $6 order by inicio_min limit 1`, [estab, a.profissional_id, a.data, OCUPA, a.id, a.inicio_min]);
      const fimEsperado = a.situacao === 'em_atendimento' && a.inicio_real_min != null ? a.inicio_real_min + a.duracao_min + a.intervalo_min : a.reserva_fim_min;
      if (prox.rows.length && fimEsperado > prox.rows[0].inicio_min)
        aviso = `Atenção: pelo horário real, este atendimento vai até ${minParaHhmm(fimEsperado)} e alcança o próximo (${minParaHhmm(prox.rows[0].inicio_min)} · ${prox.rows[0].cliente_nome}). O horário da outra cliente não foi alterado.`;
    }
    res.status(200).json({ ok: true, agendamento: a, cliente: cl ? { nome: cl.nome, apelido: cl.apelido, telefone: cl.telefone, contato_pref: cl.contato_pref } : null,
      historico: h.rows, aviso, hoje: ha.hoje, agora: minParaHhmm(ha.agora), estudio: cfg.nome_estudio });
    return;
  }

  // ─── SITUAÇÕES DO ATENDIMENTO ─────────────────────────────────────────────
  if (req.method === 'POST' && acao === 'ag_acao') {
    const id = String(b.id || '');
    const op = String(b.acao || '');
    const PODE = { confirmar: ['agendado'], chegou: ['agendado', 'confirmado'], iniciar: ['agendado', 'confirmado', 'chegou'],
      concluir: ['agendado', 'confirmado', 'chegou', 'em_atendimento'], falta: ['agendado', 'confirmado'], cancelar: ['agendado', 'confirmado', 'chegou'] };
    if (!PODE[op]) return erro(res, 400, 'acao', 'Ação desconhecida.');
    await c.query('begin');
    try {
      const r = await c.query(`${SEL_AG} where estab=$1 and id=$2 for update`, [estab, id]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.'); }
      const a = r.rows[0];
      await cadeado(c, estab, a.profissional_id, a.data);
      if (!PODE[op].includes(a.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', `Não é possível “${op}” um atendimento com situação “${SIT_AG[a.situacao]}”.`); }
      const hoje = a.data === ha.hoje;
      const lerHora = (campo, padrao) => {
        if (b[campo] == null || b[campo] === '') return padrao;
        return hhmmParaMin(b[campo]);
      };
      const sets = {}; const det = {};
      let aviso = null;
      if (op === 'confirmar') sets.situacao = 'confirmado';
      if (op === 'chegou') { sets.situacao = 'chegou'; sets.chegada_min = lerHora('hora', hoje ? ha.agora : a.inicio_min); det.chegada = minParaHhmm(sets.chegada_min); }
      if (op === 'falta') sets.situacao = 'falta';
      if (op === 'cancelar') { sets.situacao = 'cancelado'; det.motivo = txt(b.motivo, 200); }
      if (op === 'iniciar' || (op === 'concluir' && a.inicio_real_min == null)) {
        const ini = lerHora(op === 'iniciar' ? 'hora' : 'hora_inicio', hoje ? ha.agora : a.inicio_min);
        if (ini === null) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Horário de início inválido.', { erros: { hora_inicio: 'Use o formato HH:MM.' } }); }
        if (hoje && ini > ha.agora + 1) { await c.query('rollback'); return erro(res, 422, 'validacao', 'O início real não pode ser no futuro.', { erros: { hora_inicio: 'O início real não pode ser depois de agora.' } }); }
        sets.inicio_real_min = ini; det.inicio_real = minParaHhmm(ini);
        if (op === 'iniciar') sets.situacao = 'em_atendimento';
      }
      if (op === 'concluir') {
        const ini = sets.inicio_real_min != null ? sets.inicio_real_min : a.inicio_real_min;
        const fim = lerHora('hora', hoje ? ha.agora : a.fim_min);
        if (fim === null) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Horário de término inválido.', { erros: { hora: 'Use o formato HH:MM.' } }); }
        if (fim <= ini) { await c.query('rollback'); return erro(res, 422, 'validacao', 'O término deve ser depois do início.', { erros: { hora: `O término deve ser depois do início (${minParaHhmm(ini)}).` } }); }
        if (hoje && fim > ha.agora + 1) { await c.query('rollback'); return erro(res, 422, 'validacao', 'O término real não pode ser no futuro.', { erros: { hora: 'O término real não pode ser depois de agora.' } }); }
        sets.situacao = 'concluido'; sets.fim_real_min = fim; det.fim_real = minParaHhmm(fim);
        // reserva passa a ser: término real + intervalo. Se terminou antes, libera a sobra;
        // se atrasou, só registra e avisa — nunca mexe no horário de outra cliente.
        const novoFim = fim + a.intervalo_min;
        sets.reserva_fim_min = Math.max(novoFim, ini + 1);
        det.reserva_anterior = minParaHhmm(a.reserva_fim_min); det.reserva_nova = minParaHhmm(sets.reserva_fim_min);
        if (novoFim < a.reserva_fim_min) det.liberou = `${minParaHhmm(novoFim)}–${minParaHhmm(a.reserva_fim_min)}`;
        const conf = (await ocupacoes(c, estab, a.profissional_id, a.data, a.id)).filter(o => o.tipo === 'agendamento' && sobrepoe(ini, novoFim, o.a, o.b));
        if (conf.length) aviso = `O horário real (${minParaHhmm(ini)}–${minParaHhmm(fim)} + intervalo) alcançou o atendimento das ${minParaHhmm(conf[0].a)} (${conf[0].nome}). O horário dela foi mantido.`;
      }
      const ks = Object.keys(sets);
      await c.query(`update brow_agendamentos set ${ks.map((k, i) => `${k}=$${i + 3}`).join(',')}, atualizado_em=now() where estab=$1 and id=$2`, [estab, id, ...ks.map(k => sets[k])]);
      await historico(c, estab, 'agendamento', id, op, Object.keys(det).length ? det : null);
      // encaixe vinculado acompanha a situação do atendimento
      if (a.encaixe_id) {
        const mapa = { iniciar: 'em_atendimento', concluir: 'concluido', cancelar: 'cancelado', falta: 'desistiu' };
        if (mapa[op]) {
          await c.query('update brow_encaixes set situacao=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, a.encaixe_id, mapa[op]]);
          await historico(c, estab, 'encaixe', a.encaixe_id, 'atendimento_' + op, { agendamento_id: id });
        }
      }
      await c.query('commit');
      res.status(200).json({ ok: true, aviso }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // ─── REMARCAR: reserva o novo e libera o antigo numa única transação ─────
  if (req.method === 'POST' && acao === 'ag_remarcar') {
    const id = String(b.id || '');
    if (!dataValida(b.data) || !Number.isInteger(b.inicio_min)) return erro(res, 422, 'validacao', 'Escolha a nova data e o horário.');
    await c.query('begin');
    try {
      const r = await c.query(`${SEL_AG} where estab=$1 and id=$2 for update`, [estab, id]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Atendimento não encontrado.'); }
      const a = r.rows[0];
      if (!['agendado', 'confirmado'].includes(a.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', `Não é possível remarcar um atendimento “${SIT_AG[a.situacao]}”.`); }
      const profId = b.profissional_id ? String(b.profissional_id) : a.profissional_id;
      const p = await profissional(c, estab, profId);
      if (!p || !p.ativo) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Profissional indisponível.'); }
      // cadeados em ordem fixa (evita travamento mútuo entre duas remarcações)
      const chaves = [[a.profissional_id, a.data], [p.id, b.data]].sort((x, y) => (x.join('|') < y.join('|') ? -1 : 1));
      for (const [pp, dd] of chaves) await cadeado(c, estab, pp, dd);
      const dia = lerHorarioDia((cfg.horarios || {})[String(diaDaSemana(b.data))]);
      const ocup = await ocupacoes(c, estab, p.id, b.data, a.id);   // ignora a reserva antiga
      const motivo = motivoOcupado(b.inicio_min, a.duracao_min, a.intervalo_min, dia, ocup, minimoDoDia(b.data, ha));
      if (motivo) { await c.query('rollback'); return erro(res, 409, 'indisponivel', `Esse horário não está disponível. ${motivo} O horário anterior foi mantido.`); }
      await c.query(`update brow_agendamentos set data=$3, inicio_min=$4, fim_min=$5, reserva_fim_min=$6, profissional_id=$7, profissional_nome=$8,
        situacao='agendado', remarcado=true, atualizado_em=now() where estab=$1 and id=$2`,
        [estab, id, b.data, b.inicio_min, b.inicio_min + a.duracao_min, b.inicio_min + a.duracao_min + a.intervalo_min, p.id, p.nome]);
      await historico(c, estab, 'agendamento', id, 'remarcado', { de: `${a.data} ${minParaHhmm(a.inicio_min)} (${a.profissional_nome})`, para: `${b.data} ${minParaHhmm(b.inicio_min)} (${p.nome})` });
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // ─── ATUALIZAR WHATSAPP (página de avisos) ────────────────────────────────
  if (req.method === 'POST' && acao === 'ag_whatsapp_salvar') {
    const tel = digitos(b.whatsapp);
    if (!telefoneValido(tel)) return erro(res, 422, 'validacao', 'WhatsApp inválido.', { erros: { whatsapp: 'WhatsApp inválido. Use DDD + número.' } });
    const tabela = b.tipo === 'encaixe' ? 'brow_encaixes' : 'brow_agendamentos';
    const r = await c.query(`update ${tabela} set whatsapp=$3, atualizado_em=now() where estab=$1 and id=$2 returning cliente_id`, [estab, String(b.id || ''), tel]);
    if (!r.rowCount) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    if (b.atualizar_cadastro === true) await c.query('update brow_clientes set telefone=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, r.rows[0].cliente_id, tel]);
    await historico(c, estab, b.tipo === 'encaixe' ? 'encaixe' : 'agendamento', String(b.id), 'whatsapp_corrigido', { atualizou_cadastro: b.atualizar_cadastro === true });
    res.status(200).json({ ok: true }); return;
  }

  // ═══════════════════════════ ENCAIXES ════════════════════════════════════
  if (acao === 'enc_listar') {
    const data = dataValida(q.data) ? q.data : ha.hoje;
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const tot = await c.query(`select count(*)::int n, count(*) filter (where situacao = 'aguardando')::int ag from brow_encaixes where estab=$1 and data=$2`, [estab, data]);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`${SEL_ENC} where estab=$1 and data=$2
      order by case when situacao = any('{aguardando,chamado,em_atendimento}') then 0 else 1 end, ordem limit ${limite} offset ${(pg - 1) * limite}`, [estab, data]);
    res.status(200).json({ ok: true, data, hoje: ha.hoje, total, aguardando: tot.rows[0].ag, pagina: pg, paginas, limite, itens: r.rows.map(linhaEnc) });
    return;
  }
  if (req.method === 'POST' && acao === 'enc_criar') {
    const chave = txt(b.chave_envio, 64);
    if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const ja = await c.query('select id from brow_encaixes where estab=$1 and chave_envio=$2', [estab, chave]);
    if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
    const erros = {};
    const cl = await cliente(c, estab, b.cliente_id);
    if (!cl) erros.cliente_id = 'Escolha a cliente.';
    const s = await servicoAtivo(c, estab, b.servico_id);
    if (!s || !s.ativo) erros.servico_id = 'Escolha um serviço ativo.';
    let p = null;
    if (b.profissional_id) { p = await profissional(c, estab, b.profissional_id); if (!p || !p.ativo) erros.profissional_id = 'Profissional indisponível.'; }
    if (!dataValida(b.data)) erros.data = 'Data inválida.';
    else if (b.data < ha.hoje) erros.data = 'A data já passou.';
    const chegada = hhmmParaMin(b.chegada_prevista);
    if (chegada === null) erros.chegada_prevista = 'Informe a chegada prevista (HH:MM).';
    const tel = digitos(b.whatsapp);
    if (tel && !telefoneValido(tel)) erros.whatsapp = 'WhatsApp inválido. Use DDD + número.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os dados.', { erros });
    await c.query('begin');
    try {
      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`brow-enc|${estab}|${b.data}`]);
      const ja2 = await c.query('select id, ordem from brow_encaixes where estab=$1 and chave_envio=$2', [estab, chave]);
      if (ja2.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja2.rows[0].id, ordem: ja2.rows[0].ordem, repetido: true }); return; }
      // a mesma cliente não entra duas vezes na espera do mesmo dia (toque repetido / cadastro acidental)
      const dup = await c.query(`select ordem from brow_encaixes where estab=$1 and data=$2 and cliente_id=$3 and situacao = any($4)`, [estab, b.data, cl.id, ENC_ATIVO]);
      if (dup.rows.length) { await c.query('rollback'); return erro(res, 409, 'duplicado', `${cl.nome} já está na lista de encaixes deste dia (nº ${dup.rows[0].ordem}).`); }
      const o = await c.query('select coalesce(max(ordem),0)+1 n from brow_encaixes where estab=$1 and data=$2', [estab, b.data]);
      const id = crypto.randomUUID();
      await c.query(`insert into brow_encaixes(id,estab,cliente_id,cliente_nome,whatsapp,servico_id,servico_nome,duracao_min,intervalo_min,valor_centavos,
        profissional_id,profissional_nome,data,chegada_prevista_min,ordem,observacoes,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id, estab, cl.id, cl.nome, tel || null, s.id, s.nome, s.duracao_min, s.intervalo_min, s.valor_centavos, p ? p.id : null, p ? p.nome : null,
          b.data, chegada, o.rows[0].n, (b.observacoes || '').trim().slice(0, 500) || null, chave]);
      if (b.atualizar_cadastro === true && tel && tel !== cl.telefone) await c.query('update brow_clientes set telefone=$3, atualizado_em=now() where estab=$1 and id=$2', [estab, cl.id, tel]);
      if (b.retorno_id) {   // retorno (módulo 10): "Aguardando encaixe", nunca "Agendado"
        const v = await require('./brow-retornos.js').vincular(c, estab, b.retorno_id, { encaixeId: id, clienteId: cl.id });
        if (!v.ok) { await c.query('rollback'); return erro(res, 409, 'retorno', v.msg); }
      }
      await historico(c, estab, 'encaixe', id, 'criado', { ordem: o.rows[0].n, chegada_prevista: minParaHhmm(chegada), retorno_id: b.retorno_id || null });
      await c.query('commit');
      res.status(201).json({ ok: true, id, ordem: o.rows[0].n }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }
  if (acao === 'enc_ver') {
    const r = await c.query(`${SEL_ENC} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Encaixe não encontrado.');
    const e = linhaEnc(r.rows[0]);
    const cl = await cliente(c, estab, e.cliente_id);
    const h = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='encaixe' and ref_id=$2 order by id`, [estab, e.id]);
    let ag = null;
    if (e.agendamento_id) { const x = await c.query(`${SEL_AG} where estab=$1 and id=$2`, [estab, e.agendamento_id]); if (x.rows.length) ag = linhaAg(x.rows[0]); }
    res.status(200).json({ ok: true, encaixe: e, agendamento: ag, cliente: cl ? { nome: cl.nome, apelido: cl.apelido, telefone: cl.telefone, contato_pref: cl.contato_pref } : null,
      historico: h.rows, hoje: ha.hoje, agora: minParaHhmm(ha.agora), estudio: cfg.nome_estudio });
    return;
  }
  if (req.method === 'POST' && acao === 'enc_acao') {
    const id = String(b.id || ''); const op = String(b.acao || '');
    const PODE = { chegou: ['aguardando'], cancelar: ['aguardando', 'chamado'], desistiu: ['aguardando', 'chamado'] };
    if (!PODE[op]) return erro(res, 400, 'acao', 'Ação desconhecida.');
    await c.query('begin');
    try {
      const r = await c.query(`${SEL_ENC} where estab=$1 and id=$2 for update`, [estab, id]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Encaixe não encontrado.'); }
      const e = r.rows[0];
      if (!PODE[op].includes(e.situacao)) { await c.query('rollback'); return erro(res, 409, 'situacao', `Não é possível essa ação com o encaixe “${SIT_ENC[e.situacao]}”.`); }
      const det = {};
      if (op === 'chegou') {
        const h = b.hora ? hhmmParaMin(b.hora) : (e.data === ha.hoje ? ha.agora : e.chegada_prevista_min);
        if (h === null) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Horário inválido.'); }
        if (e.chegada_real_min != null) { await c.query('rollback'); return erro(res, 409, 'situacao', `A chegada já foi registrada às ${minParaHhmm(e.chegada_real_min)}.`); }
        await c.query(`update brow_encaixes set chegada_real_min=$3, atualizado_em=now() where estab=$1 and id=$2`, [estab, id, h]);
        det.chegada_real = minParaHhmm(h);
      } else {
        await c.query(`update brow_encaixes set situacao=$3, atualizado_em=now() where estab=$1 and id=$2`, [estab, id, op === 'cancelar' ? 'cancelado' : 'desistiu']);
        det.motivo = txt(b.motivo, 200);
        // se já tinha horário reservado pela efetivação, a reserva é liberada junto
        if (e.agendamento_id) {
          const ar = await c.query(`update brow_agendamentos set situacao='cancelado', atualizado_em=now() where estab=$1 and id=$2 and situacao = any('{agendado,confirmado,chegou}') returning id`, [estab, e.agendamento_id]);
          if (ar.rowCount) { await historico(c, estab, 'agendamento', e.agendamento_id, 'cancelar', { motivo: `Encaixe ${op === 'cancelar' ? 'cancelado' : 'desistiu'}` }); det.liberou_reserva = true; }
        }
      }
      await historico(c, estab, 'encaixe', id, op, det);
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (er) { await c.query('rollback'); throw er; }
  }
  // Oportunidades: horários livres hoje/na data, a partir de agora, com tempo para serviço + intervalo.
  if (acao === 'enc_oportunidades') {
    const r = await c.query(`${SEL_ENC} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Encaixe não encontrado.');
    const e = r.rows[0];
    const dia = lerHorarioDia((cfg.horarios || {})[String(diaDaSemana(e.data))]);
    const profs = e.profissional_id
      ? (await c.query('select id,nome from brow_profissionais where estab=$1 and id=$2 and ativo', [estab, e.profissional_id])).rows
      : (await c.query('select id,nome from brow_profissionais where estab=$1 and ativo order by lower(nome)', [estab])).rows;
    const ops = [];
    for (const p of profs) {
      const ocup = await ocupacoes(c, estab, p.id, e.data);
      inicios(e.duracao_min, e.intervalo_min, dia, ocup, minimoDoDia(e.data, ha), cfg.passo_min)
        .forEach(s => ops.push({ profissional_id: p.id, profissional_nome: p.nome, inicio_min: s, inicio: minParaHhmm(s), fim: minParaHhmm(s + e.duracao_min), reserva_fim: minParaHhmm(s + e.duracao_min + e.intervalo_min) }));
    }
    ops.sort((x, y) => x.inicio_min - y.inicio_min || x.profissional_nome.localeCompare(y.profissional_nome));
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const paginas = Math.max(1, Math.ceil(ops.length / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    let motivo = null;
    if (!dia.aberto) motivo = 'O estúdio não abre neste dia.';
    else if (!ops.length) motivo = `No momento não há tempo livre para ${e.servico_nome} (${e.duracao_min} min + ${e.intervalo_min} min de intervalo) sem prejudicar os próximos atendimentos. A cliente continua aguardando.`;
    res.status(200).json({ ok: true, encaixe: linhaEnc(e), motivo, total: ops.length, pagina: pg, paginas, itens: ops.slice((pg - 1) * limite, pg * limite) });
    return;
  }
  if (req.method === 'POST' && acao === 'enc_efetivar') {
    const id = String(b.id || '');
    await c.query('begin');
    let r;
    try {
      r = await c.query(`${SEL_ENC} where estab=$1 and id=$2 for update`, [estab, id]);
      if (!r.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Encaixe não encontrado.'); }
      const e = r.rows[0];
      if (e.agendamento_id) { await c.query('rollback'); res.status(200).json({ ok: true, id: e.agendamento_id, repetido: true }); return; }   // efetiva uma vez só
      if (e.situacao !== 'aguardando') { await c.query('rollback'); return erro(res, 409, 'situacao', `Esse encaixe está “${SIT_ENC[e.situacao]}” e não pode ser efetivado.`); }
      await c.query('commit');
      // reservar() abre a própria transação com o cadeado da profissional/dia
      const rr = await reservar({ chave: `encaixe:${e.id}`, clienteId: e.cliente_id, whatsapp: e.whatsapp, profId: b.profissional_id, servicoId: e.servico_id,
        data: e.data, inicioMin: b.inicio_min, observacoes: e.observacoes, encaixeId: e.id });
      if (!rr.transacao) {
        if (rr.st === 409) rr.j.msg += ' A cliente continua aguardando na lista de encaixes.';
        res.status(rr.st).json(rr.j); return;
      }
      // ainda dentro da transação da reserva: vincula o encaixe (só se ninguém efetivou antes)
      const v = await c.query(`update brow_encaixes set situacao='chamado', agendamento_id=$3, atualizado_em=now()
        where estab=$1 and id=$2 and agendamento_id is null and situacao = 'aguardando' returning id`, [estab, e.id, rr.j.id]);
      if (!v.rowCount) { await c.query('rollback'); return erro(res, 409, 'situacao', 'Esse encaixe já foi efetivado ou mudou de situação.'); }
      await historico(c, estab, 'encaixe', e.id, 'efetivado', { agendamento_id: rr.j.id, inicio: minParaHhmm(b.inicio_min) });
      if (e.chegada_real_min != null) await c.query('update brow_agendamentos set situacao=$3, chegada_min=$4 where estab=$1 and id=$2', [estab, rr.j.id, 'chegou', e.chegada_real_min]);
      await c.query('commit');
      res.status(201).json({ ok: true, id: rr.j.id }); return;
    } catch (er) { try { await c.query('rollback'); } catch (_) {} throw er; }
  }

  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { motivoOcupado, inicios, lerHorarioDia, hojeAgora, hhmmParaMin, minParaHhmm };
module.exports.garantirTabelas = garantirTabelas;
