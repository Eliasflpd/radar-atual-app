// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — FICHA DE ANAMNESE (10/11/2026)
// Chamado por api/_lib/brow-studio.js para ações "an_*" (mesma rota /api/brow,
// mesma trava de acesso, mesma conexão). Tabela brow_anamneses + histórico em
// brow_historico (tipo 'anamnese'). Nada do RADAR é tocado.
//
// DADOS SENSÍVEIS (saúde): ficam só no banco, atrás da trava de acesso; nada
// de link público. O servidor só REGISTRA o relato — não interpreta, não gera
// contraindicação nem "procedimento liberado".
//
// REGRAS:
//  • Perguntas com resposta nula = "não respondida" (nunca vira "Não").
//  • Rascunho aceita respostas incompletas (exige só a cliente).
//  • "Conferida" exige: cliente, serviço, profissional, data, as duas perguntas
//    respondidas, detalhe quando "Sim" e confirmacao === true.
//  • Ficha CONFERIDA é registro histórico: nunca é alterada. Para atualizar,
//    cria-se uma NOVA ficha ligada à anterior (anterior_id), com as respostas
//    copiadas e marcadas como "copiada" — só valem depois de nova conferência.
//  • Autoria: criado_por / conferido_por vêm do login (hoje nulo); criado_em e
//    conferida_em sempre gravados.
//  • "modelo" guarda qual conjunto de perguntas foi usado (padrao_v1) — permite
//    perguntas diferentes por procedimento no futuro sem perder as antigas.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const RESP = ['sim', 'nao', 'nao_sabe'];
const ETAPAS = ['cliente', 'atendimento', 'procedimento', 'alergias', 'medicamentos', 'historico', 'observacoes', 'conferencia'];
const MAX = { detalhe: 600, procedimentos_anteriores: 600, pele: 400, observacoes: 1000 };

async function garantirTabela(c) {
  await c.query(`create table if not exists brow_anamneses(
    id text primary key, estab text not null, modelo text not null default 'padrao_v1',
    cliente_id text not null, cliente_nome text not null,
    servico_id text, servico_nome text, profissional_id text, profissional_nome text,
    data date, agendamento_id text,
    respostas jsonb not null default '{}'::jsonb,
    situacao text not null default 'rascunho' check (situacao in ('rascunho','conferida')),
    etapa_atual text not null default 'cliente',
    conferida_em timestamptz, chave_envio text,
    anterior_id text, versao integer not null default 1, copiada boolean not null default false,
    criado_por text, conferido_por text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_an_envio on brow_anamneses(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_an_cliente on brow_anamneses(estab, cliente_id)`);
  // tabela criada pela versão anterior deste módulo: acrescenta as colunas novas
  for (const col of ["anterior_id text", "versao integer not null default 1", "copiada boolean not null default false", "criado_por text", "conferido_por text"])
    await c.query(`alter table brow_anamneses add column if not exists ${col}`);
  await c.query(`create unique index if not exists brow_an_rascunho_derivado on brow_anamneses(estab, anterior_id) where anterior_id is not null and situacao = 'rascunho'`);
}

const txt = (v, max) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
function dataValida(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
async function historico(c, estab, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, 'anamnese', id, acao, det ? JSON.stringify(det) : null]);
}

// Normaliza as respostas (só os campos conhecidos do modelo padrao_v1).
function lerRespostas(r) {
  r = r && typeof r === 'object' ? r : {};
  const pergunta = (x) => {
    x = x && typeof x === 'object' ? x : {};
    const resposta = RESP.includes(x.resposta) ? x.resposta : null;      // nulo = não respondida
    return { resposta, detalhe: resposta === 'sim' ? txt(x.detalhe, MAX.detalhe) : null };
  };
  const h = r.historico && typeof r.historico === 'object' ? r.historico : {};
  return {
    alergias: pergunta(r.alergias),
    medicamentos: pergunta(r.medicamentos),
    historico: { procedimentos_anteriores: txt(h.procedimentos_anteriores, MAX.procedimentos_anteriores), pele: txt(h.pele, MAX.pele) },
    observacoes: txt(r.observacoes, MAX.observacoes)
  };
}
// O que falta para poder marcar como conferida (lista vazia = completa).
function pendencias(f) {
  const p = {};
  if (!f.servico_id) p.servico_id = 'Escolha o serviço.';
  if (!f.profissional_id) p.profissional_id = 'Informe a profissional responsável.';
  if (!f.data) p.data = 'Informe a data.';
  const r = f.respostas;
  if (!r.alergias.resposta) p.alergias = 'Responda se a cliente relata alergia.';
  else if (r.alergias.resposta === 'sim' && !r.alergias.detalhe) p.alergias_detalhe = 'Descreva as alergias ou reações relatadas.';
  if (!r.medicamentos.resposta) p.medicamentos = 'Responda se a cliente relata uso de medicamentos.';
  else if (r.medicamentos.resposta === 'sim' && !r.medicamentos.detalhe) p.medicamentos_detalhe = 'Descreva os medicamentos relatados.';
  return p;
}
const SEL = `select *, to_char(data,'YYYY-MM-DD') as data from brow_anamneses`;

module.exports = async function anamnese(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabela(c);
  const q = req.query || {};

  if (acao === 'an_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let filtro = '';
    if (q.cliente) { params.push(String(q.cliente)); filtro += ` and cliente_id=$${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) {
      params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
      filtro += ` and translate(lower(cliente_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $${params.length}`;
    }
    const tot = await c.query(`select count(*)::int n from brow_anamneses where estab=$1${filtro}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, cliente_id, cliente_nome, servico_nome, to_char(data,'YYYY-MM-DD') data, situacao, etapa_atual, atualizado_em
      from brow_anamneses where estab=$1${filtro} order by coalesce(data, criado_em::date) desc, atualizado_em desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, limite, itens: r.rows });
    return;
  }

  if (acao === 'an_ver') {
    const r = await c.query(`${SEL} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrada', 'Ficha não encontrada.');
    const f = r.rows[0];
    f.respostas = lerRespostas(f.respostas);
    const h = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='anamnese' and ref_id=$2 order by id`, [estab, f.id]);
    const ant = f.anterior_id ? (await c.query(`select id, to_char(data,'YYYY-MM-DD') data, conferida_em from brow_anamneses where estab=$1 and id=$2`, [estab, f.anterior_id])).rows[0] || null : null;
    const pos = (await c.query(`select id, to_char(data,'YYYY-MM-DD') data, situacao from brow_anamneses where estab=$1 and anterior_id=$2 order by criado_em desc limit 1`, [estab, f.id])).rows[0] || null;
    res.status(200).json({ ok: true, ficha: f, pendencias: pendencias(f), historico: h.rows, anterior: ant, posterior: pos });
    return;
  }

  // Atendimentos da cliente para vincular (mais recentes primeiro; cancelados ficam de fora)
  if (acao === 'an_atendimentos') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 6, 1), 30);
    const params = [estab, String(q.cliente || '')];
    const tot = await c.query(`select count(*)::int n from brow_agendamentos where estab=$1 and cliente_id=$2 and situacao <> all('{cancelado,falta}')`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, to_char(data,'YYYY-MM-DD') data, inicio_min, servico_id, servico_nome, profissional_id, profissional_nome, situacao
      from brow_agendamentos where estab=$1 and cliente_id=$2 and situacao <> all('{cancelado,falta}')
      order by data desc, inicio_min desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }

  if (req.method === 'POST' && acao === 'an_salvar') {
    const b = corpo(req);
    const erros = {};
    const cl = (await c.query('select id, nome from brow_clientes where estab=$1 and id=$2', [estab, String(b.cliente_id || '')])).rows[0];
    if (!cl) erros.cliente_id = 'Escolha a cliente.';
    let sv = null, pr = null, ag = null;
    if (b.servico_id) { sv = (await c.query('select id, nome from brow_servicos where estab=$1 and id=$2', [estab, String(b.servico_id)])).rows[0]; if (!sv) erros.servico_id = 'Serviço não encontrado.'; }
    if (b.profissional_id) { pr = (await c.query('select id, nome from brow_profissionais where estab=$1 and id=$2', [estab, String(b.profissional_id)])).rows[0]; if (!pr) erros.profissional_id = 'Profissional não encontrada.'; }
    if (b.agendamento_id) {
      ag = (await c.query('select id, cliente_id from brow_agendamentos where estab=$1 and id=$2', [estab, String(b.agendamento_id)])).rows[0];
      if (!ag) erros.agendamento_id = 'Atendimento não encontrado.';
      else if (cl && ag.cliente_id !== cl.id) erros.agendamento_id = 'Esse atendimento é de outra cliente.';
    }
    if (b.data && !dataValida(b.data)) erros.data = 'Data inválida.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os dados.', { erros });
    const etapa = ETAPAS.includes(b.etapa_atual) ? b.etapa_atual : 'cliente';
    const f = { cliente_id: cl.id, cliente_nome: cl.nome, servico_id: sv ? sv.id : null, servico_nome: sv ? sv.nome : null,
      profissional_id: pr ? pr.id : null, profissional_nome: pr ? pr.nome : null, data: b.data || null, agendamento_id: ag ? ag.id : null,
      respostas: lerRespostas(b.respostas) };
    const conferir = b.conferir === true;
    if (conferir) {
      const pend = pendencias(f);
      if (Object.keys(pend).length) return erro(res, 422, 'incompleta', 'Para salvar como conferida, complete: ' + Object.values(pend).join(' '), { erros: pend });
      if (b.confirmacao !== true) return erro(res, 422, 'sem_confirmacao', 'Marque “Respostas conferidas com a cliente” para salvar como conferida.', { erros: { confirmacao: 'Confirmação obrigatória para salvar como conferida.' } });
    }
    const situacao = conferir ? 'conferida' : 'rascunho';

    await c.query('begin');
    try {
      let id = b.id ? String(b.id) : null;
      let antes = null;
      if (id) {
        const r0 = await c.query(`${SEL} where estab=$1 and id=$2 for update`, [estab, id]);
        if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrada', 'Ficha não encontrada.'); }
        antes = r0.rows[0]; antes.respostas = lerRespostas(antes.respostas);
        if (antes.situacao === 'conferida') { await c.query('rollback'); return erro(res, 409, 'conferida', 'Fichas conferidas são registros históricos e não podem ser alteradas. Para atualizar, crie uma nova ficha a partir desta.'); }
      } else {
        const chave = txt(b.chave_envio, 64);
        if (!chave) { await c.query('rollback'); return erro(res, 400, 'chave_envio', 'Pedido incompleto.'); }
        // toques simultâneos com a mesma chave: o segundo espera o primeiro e reaproveita a mesma ficha
        const novo = crypto.randomUUID();
        const ins = await c.query(`insert into brow_anamneses(id,estab,cliente_id,cliente_nome,chave_envio,criado_por) values($1,$2,$3,$4,$5,$6)
          on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, [novo, estab, f.cliente_id, f.cliente_nome, chave, req.brow_usuario || null]);
        if (ins.rows.length) { id = novo; await historico(c, estab, id, 'criada', null); }
        else {
          const r0 = await c.query(`${SEL} where estab=$1 and chave_envio=$2 for update`, [estab, chave]);
          id = r0.rows[0].id; antes = r0.rows[0]; antes.respostas = lerRespostas(antes.respostas);
          if (antes.situacao === 'conferida') { await c.query('rollback'); res.status(200).json({ ok: true, id, situacao: 'conferida', repetido: true }); return; }
        }
      }
      const mudou = antes && (JSON.stringify(antes.respostas) !== JSON.stringify(f.respostas) ||
        ['cliente_id', 'servico_id', 'profissional_id', 'data', 'agendamento_id'].some(k => (antes[k] || null) !== (f[k] || null)));
      await c.query(`update brow_anamneses set cliente_id=$3, cliente_nome=$4, servico_id=$5, servico_nome=$6, profissional_id=$7, profissional_nome=$8,
          data=$9, agendamento_id=$10, respostas=$11, situacao=$12, etapa_atual=$13,
          conferida_em = case when $12='conferida' then now() else null end,
          conferido_por = case when $12='conferida' then $14 else null end,
          copiada = case when $12='conferida' then false else copiada end, atualizado_em=now()
        where estab=$1 and id=$2`,
        [estab, id, f.cliente_id, f.cliente_nome, f.servico_id, f.servico_nome, f.profissional_id, f.profissional_nome, f.data, f.agendamento_id,
          JSON.stringify(f.respostas), situacao, conferir ? 'conferencia' : etapa, req.brow_usuario || null]);
      void mudou;
      await historico(c, estab, id, conferir ? 'conferida' : 'rascunho_salvo', conferir ? { confirmacao: 'Respostas conferidas com a cliente (não é assinatura nem autorização)' } : { etapa });
      await c.query('commit');
      res.status(200).json({ ok: true, id, situacao });
      return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // NOVA FICHA A PARTIR DE UMA CONFERIDA (a anterior fica intacta como registro histórico)
  if (req.method === 'POST' && acao === 'an_nova_versao') {
    const b = corpo(req);
    await c.query('begin');
    try {
      const r0 = await c.query(`${SEL} where estab=$1 and id=$2 for update`, [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrada', 'Ficha não encontrada.'); }
      const a = r0.rows[0];
      if (a.situacao !== 'conferida') { await c.query('rollback'); return erro(res, 409, 'nao_conferida', 'Só fichas conferidas geram uma nova ficha. Esta ainda é rascunho: continue o preenchimento.'); }
      // já existe um rascunho derivado desta ficha? devolve ele (toque repetido não cria cópias)
      const ja = await c.query(`select id from brow_anamneses where estab=$1 and anterior_id=$2 and situacao='rascunho'`, [estab, a.id]);
      if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
      const cfg = (await c.query('select fuso from brow_config where estab=$1', [estab])).rows[0];
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: (cfg && cfg.fuso) || 'America/Sao_Paulo' }).format(new Date());
      const id = crypto.randomUUID();
      await c.query(`insert into brow_anamneses(id,estab,modelo,cliente_id,cliente_nome,servico_id,servico_nome,profissional_id,profissional_nome,data,
          respostas,situacao,etapa_atual,anterior_id,versao,copiada,criado_por)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'rascunho','cliente',$12,$13,true,$14)`,
        [id, estab, a.modelo, a.cliente_id, a.cliente_nome, a.servico_id, a.servico_nome, a.profissional_id, a.profissional_nome, hoje,
          JSON.stringify(lerRespostas(a.respostas)), a.id, (a.versao || 1) + 1, req.brow_usuario || null]);
      await historico(c, estab, id, 'criada_a_partir', { anterior_id: a.id, observacao: 'respostas copiadas; exigem nova conferência' });
      await historico(c, estab, a.id, 'nova_ficha_criada', { nova_id: id });
      await c.query('commit');
      res.status(201).json({ ok: true, id });
      return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { lerRespostas, pendencias };
