// NEXUS BÍBLICO — camada de IA (19/11/2026). Usa a integração que o RADAR já tem (api/_lib/ia.js, a mesma chave
// ANTHROPIC_API_KEYS do servidor); não cria outra. Nada aqui vai para o navegador.
//
// PRINCÍPIO: o grafo e os algoritmos DESCOBREM (custo zero). A IA só INTERPRETA e EXPLICA o que já foi achado,
// citando as evidências. Por isso só há chamada de IA quando a pessoa pede (botão), nunca ao abrir o mapa.
//
// O QUE ESTE MÓDULO GARANTE
//   1. Modelo conforme a tarefa: leve (Haiku 5.5) · padrão (Sonnet 5.5) · profundo (Opus 5.5). Trocáveis por env.
//   2. Orçamento: limite por mês e por investigação (tabela nexus_ia_config; padrão US$ 30/mês e US$ 1/investigação).
//   3. Registro de cada chamada com modelo, tokens e custo (nexus_ia_uso), somável por investigação.
//   4. Reaproveitamento: a mesma tarefa com o mesmo pacote de evidências não paga duas vezes (nexus_ia_cache, 30 dias).
//   5. Rebaixamento: se o orçamento não comporta, desce profundo → padrão → leve → cascata gratuita do RADAR
//      (Groq/Gemini). Quando os créditos promocionais acabarem, basta ajustar o orçamento: nada quebra.
//   6. Outros fornecedores entram como mais um degrau em ia.js; aqui só muda a tabela de preços.
//   7. Sem chamadas redundantes: o pacote de evidências é montado UMA vez pelo motor e servido a todas as tarefas.
const crypto = require('crypto');

// US$ por milhão de tokens (entrada, saída, leitura de cache). Tabela da Anthropic de 03/11/2026.
const PRECOS = {
  'claude-haiku-5-5': { e: 0.10, s: 0.50, c: 0.01 },
  'claude-sonnet-5-5': { e: 2, s: 10, c: 0.10 },
  'claude-sonnet-5': { e: 2, s: 10, c: 0.20 },
  'claude-opus-5-5': { e: 4, s: 20, c: 0.20 },
};
const MODELO = {
  leve: process.env.NEXUS_IA_MODELO_LEVE || 'claude-haiku-5-5',
  padrao: process.env.NEXUS_IA_MODELO_PADRAO || 'claude-sonnet-5-5',
  profundo: process.env.NEXUS_IA_MODELO_PROFUNDO || 'claude-opus-5-5',
};
const DESCIDA = { profundo: ['profundo', 'padrao', 'leve'], padrao: ['padrao', 'leve'], leve: ['leve'] };
// As tarefas que realmente exigem IA. Tudo o mais é algoritmo.
const TAREFAS = {
  explicar: { nivel: 'padrao', max: 1400, effort: 'medium', nome: 'Explicar as evidências' },
  resumir: { nivel: 'leve', max: 500, effort: 'low', nome: 'Resumo da investigação' },
  conversar: { nivel: 'padrao', max: 1100, effort: 'low', nome: 'Conversa com o Claude (barra lateral)' },
};
const PADRAO = {
  ligado: true,
  orcamento_mensal_usd: Number(process.env.NEXUS_IA_ORCAMENTO_MENSAL || 30),
  limite_investigacao_usd: Number(process.env.NEXUS_IA_LIMITE_INVESTIGACAO || 1),
};

let PRONTO = false;
async function tabelas(db) {
  if (PRONTO) return true;
  if (!db.temNexus()) return false;
  await db.q('n', `create table if not exists nexus_ia_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz not null default now())`);
  await db.q('n', `create table if not exists nexus_ia_uso (
      id bigserial primary key, quando timestamptz not null default now(), dono text, investigacao text, tarefa text not null,
      nivel text, modelo text, provedor text, tokens_entrada int default 0, tokens_saida int default 0, tokens_cache int default 0,
      custo_usd numeric(10,6) not null default 0, reaproveitado boolean not null default false, rebaixado boolean not null default false, motivo text)`);
  await db.q('n', 'create index if not exists nexus_ia_uso_quando on nexus_ia_uso (quando)');
  await db.q('n', 'create index if not exists nexus_ia_uso_inv on nexus_ia_uso (investigacao)');
  await db.q('n', `create table if not exists nexus_ia_cache (chave text primary key, tarefa text not null, modelo text, resposta jsonb not null, criado_em timestamptz not null default now())`);
  PRONTO = true;
  return true;
}
async function config(db) {
  const cfg = { ...PADRAO };
  if (!(await tabelas(db).catch(() => false))) return cfg;
  const linhas = await db.q('n', 'select chave, valor from nexus_ia_config').catch(() => []);
  for (const l of linhas) if (l.chave in cfg) cfg[l.chave] = l.valor;
  return cfg;
}
async function salvarConfig(db, novo) {
  if (!(await tabelas(db).catch(() => false))) return { ok: false, err: 'banco do NEXUS não ligado' };
  const ok = {};
  if (typeof novo.ligado === 'boolean') ok.ligado = novo.ligado;
  if (isFinite(novo.orcamento_mensal_usd) && novo.orcamento_mensal_usd >= 0 && novo.orcamento_mensal_usd <= 500) ok.orcamento_mensal_usd = +novo.orcamento_mensal_usd;
  if (isFinite(novo.limite_investigacao_usd) && novo.limite_investigacao_usd >= 0 && novo.limite_investigacao_usd <= 50) ok.limite_investigacao_usd = +novo.limite_investigacao_usd;
  for (const [k, v] of Object.entries(ok)) {
    await db.q('n', `insert into nexus_ia_config (chave, valor) values ($1, $2::jsonb) on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`, [k, JSON.stringify(v)]);
  }
  return { ok: true, config: await config(db) };
}
async function gastos(db, investigacao) {
  if (!(await tabelas(db).catch(() => false))) return { mes: 0, investigacao: 0, chamadas: 0 };
  const m = (await db.q('n', `select coalesce(sum(custo_usd),0)::float mes, count(*)::int n from nexus_ia_uso where quando >= date_trunc('month', now())`).catch(() => [{ mes: 0, n: 0 }]))[0];
  const i = investigacao ? (await db.q('n', `select coalesce(sum(custo_usd),0)::float v from nexus_ia_uso where investigacao = $1`, [String(investigacao)]).catch(() => [{ v: 0 }]))[0].v : 0;
  return { mes: m.mes, chamadas: m.n, investigacao: i };
}
function custoDe(modelo, usos) {
  const p = PRECOS[modelo];
  if (!p || !usos) return 0;
  const e = usos.input_tokens || 0, s = usos.output_tokens || 0, c = usos.cache_read_input_tokens || 0;
  return (e * p.e + s * p.s + c * p.c) / 1e6;
}
function estimativa(modelo, chars, max) {
  const p = PRECOS[modelo] || PRECOS['claude-sonnet-5-5'];
  return ((chars / 3.2) * p.e + max * p.s) / 1e6;
}
const MEMORIA = new Map();

// executar: a única porta de IA do NEXUS.
async function executar(db, { tarefa, sys, user, dono, investigacao }) {
  const t = TAREFAS[tarefa];
  if (!t) throw new Error('tarefa de IA desconhecida');
  const chave = crypto.createHash('sha256').update(tarefa + '\n' + sys + '\n' + user).digest('hex');
  const temBanco = await tabelas(db).catch(() => false);
  const registrar = async (r) => {
    if (!temBanco) return;
    await db.q('n', `insert into nexus_ia_uso (dono, investigacao, tarefa, nivel, modelo, provedor, tokens_entrada, tokens_saida, tokens_cache, custo_usd, reaproveitado, rebaixado, motivo)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [dono || null, investigacao ? String(investigacao) : null, tarefa, r.nivel || null, r.modelo || null, r.provedor || null,
      r.usos ? (r.usos.input_tokens || r.usos.promptTokenCount || 0) : 0, r.usos ? (r.usos.output_tokens || r.usos.candidatesTokenCount || 0) : 0,
      r.usos ? (r.usos.cache_read_input_tokens || 0) : 0, r.custo || 0, !!r.reaproveitado, !!r.rebaixado, r.motivo || null]).catch(() => {});
  };

  // 1) reaproveitamento
  let guardado = MEMORIA.get(chave);
  if (!guardado && temBanco) {
    const l = (await db.q('n', `select resposta from nexus_ia_cache where chave = $1 and criado_em > now() - interval '30 days'`, [chave]).catch(() => []))[0];
    if (l) guardado = l.resposta;
  }
  if (guardado) {
    const r = { ...guardado, reaproveitado: true, custo: 0 };
    await registrar(r);
    return r;
  }

  // 2) orçamento e escolha do modelo (com rebaixamento)
  const cfg = await config(db);
  const g = await gastos(db, investigacao);
  const chars = String(sys).length + String(user).length;
  let nivel = null, motivo = '';
  if (!cfg.ligado) motivo = 'IA paga desligada na configuração';
  else {
    for (const n of DESCIDA[t.nivel]) {
      const est = estimativa(MODELO[n], chars, t.max);
      if (g.mes + est <= cfg.orcamento_mensal_usd && g.investigacao + est <= cfg.limite_investigacao_usd) { nivel = n; break; }
    }
    if (!nivel) motivo = g.mes >= cfg.orcamento_mensal_usd ? 'orçamento do mês esgotado' : 'limite desta investigação atingido';
    else if (nivel !== t.nivel) motivo = 'rebaixado para caber no orçamento';
  }

  // 3) chamada (pela integração existente)
  const { iaTexto } = await import('./ia.js');
  let rr;
  if (nivel) rr = await iaTexto({ sys, user, max_tokens: t.max, effort: t.effort, premium: true, modeloClaude: MODELO[nivel], tag: 'nexus-' + tarefa, prazoPremium: 45000 });
  else rr = await iaTexto({ sys, user, max_tokens: t.max, temperature: 0.2, tag: 'nexus-' + tarefa + '-gratis' });
  const pagoClaude = rr.provedor === 'claude';
  const r = {
    texto: rr.texto || '', provedor: rr.provedorNome || rr.provedor || '', modelo: rr.modelo || '', nivel: pagoClaude ? nivel : 'gratuito',
    usos: rr.usos || null, custo: pagoClaude ? custoDe(rr.modelo, rr.usos) : 0, rebaixado: !!motivo, motivo: motivo || (nivel && !pagoClaude ? 'Claude indisponível: usou a reserva gratuita' : ''),
  };
  await registrar(r);
  if (r.texto) {
    const salvar = { texto: r.texto, provedor: r.provedor, modelo: r.modelo, nivel: r.nivel };
    MEMORIA.set(chave, salvar);
    if (MEMORIA.size > 100) MEMORIA.delete(MEMORIA.keys().next().value);
    if (temBanco) await db.q('n', `insert into nexus_ia_cache (chave, tarefa, modelo, resposta) values ($1,$2,$3,$4::jsonb) on conflict (chave) do nothing`, [chave, tarefa, r.modelo, JSON.stringify(salvar)]).catch(() => {});
  }
  return r;
}

async function consumo(db, investigacao) {
  const cfg = await config(db);
  const g = await gastos(db, investigacao);
  let porTarefa = [];
  if (await tabelas(db).catch(() => false)) {
    porTarefa = await db.q('n', `select tarefa, modelo, count(*)::int chamadas, sum(case when reaproveitado then 1 else 0 end)::int reaproveitadas, coalesce(sum(custo_usd),0)::float custo
      from nexus_ia_uso where quando >= date_trunc('month', now()) group by 1,2 order by custo desc`).catch(() => []);
  }
  return { config: cfg, gasto_mes_usd: g.mes, chamadas_mes: g.chamadas, gasto_investigacao_usd: g.investigacao, por_tarefa: porTarefa, modelos: MODELO, banco: await tabelas(db).catch(() => false) };
}

module.exports = { executar, consumo, salvarConfig, TAREFAS, MODELO, PRECOS, custoDe };
