// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — REGISTRO DE ATENDIMENTOS E FOTOS (10/11/2026)
// Chamado por api/_lib/brow-studio.js para ações "rg_*" (mesma rota /api/brow,
// mesma trava de acesso, mesma conexão). Tabelas brow_registros,
// brow_registro_fotos, brow_registro_retificacoes + histórico (tipo 'registro').
//
// FOTOS: no banco (bytea), privadas, sem link público. Chegam já reduzidas no
// aparelho (máx. 1600 px, sem filtros). Cada foto é enviada SEPARADA do texto:
// falha numa foto não perde o registro nem a outra foto.
//
// UM REGISTRO POR ATENDIMENTO: índice único em (estab, agendamento_id).
// FINALIZADO = imutável (texto, produtos e fotos). Correções entram como
// retificação/complemento (data, autoria, motivo), mostradas junto.
// Finalizar NÃO mexe na agenda nem em pagamento.
// O servidor não interpreta, não recomenda e não preenche nada técnico.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const ETAPAS = ['cliente', 'atendimento', 'procedimento', 'tecnica', 'produtos', 'fotos', 'observacoes', 'conferencia'];
const MAX_FOTO = 1600 * 1024;

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_registros(
    id text primary key, estab text not null,
    cliente_id text not null, cliente_nome text not null, servico_id text, servico_nome text,
    profissional_id text, profissional_nome text, data date, agendamento_id text,
    tecnica text, observacoes text, produtos jsonb not null default '[]'::jsonb,
    situacao text not null default 'rascunho' check (situacao in ('rascunho','finalizado')),
    etapa_atual text not null default 'cliente',
    criado_por text, finalizado_por text, finalizado_em timestamptz, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_rg_envio on brow_registros(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_rg_agendamento on brow_registros(estab, agendamento_id) where agendamento_id is not null`);
  await c.query(`create index if not exists brow_rg_cliente on brow_registros(estab, cliente_id)`);
  await c.query(`create table if not exists brow_registro_fotos(
    estab text not null, registro_id text not null, tipo text not null check (tipo in ('antes','depois')),
    imagem bytea not null, largura integer, altura integer, bytes integer, atualizado_em timestamptz not null default now(),
    primary key (registro_id, tipo))`);
  await c.query(`create table if not exists brow_registro_retificacoes(
    id text primary key, estab text not null, registro_id text not null,
    tipo text not null check (tipo in ('retificacao','complemento')), motivo text not null, texto text not null,
    autor text, chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_rgr_envio on brow_registro_retificacoes(estab, chave_envio) where chave_envio is not null`);
}

const txt = (v, max) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
function dataValida(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
async function historico(c, estab, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, 'registro', id, acao, det ? JSON.stringify(det) : null]);
}
function lerProdutos(v) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).map(p => p && typeof p === 'object' ? {
    id: txt(p.id, 40) || crypto.randomUUID(), produto: txt(p.produto, 80), marca: txt(p.marca, 60), cor: txt(p.cor, 60),
    lote: txt(p.lote, 40), validade: dataValida(p.validade) ? p.validade : null
  } : null).filter(p => p && (p.produto || p.marca || p.cor || p.lote));
}
function jpegDe(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { erro: 'formato' };
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 500) return { erro: 'formato' };
  if (buf.length > MAX_FOTO) return { erro: 'tamanho' };
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return { erro: 'formato' };
  // dimensões (SOF) para mostrar com a proporção certa
  let i = 2, w = null, h = null;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const mk = buf[i + 1];
    if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { buf, w, h };
}
const SEL = `select *, to_char(data,'YYYY-MM-DD') as data from brow_registros`;

module.exports = async function registros(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;

  if (acao === 'rg_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let filtro = '';
    const add = (cond, v) => { params.push(v); filtro += ` and ${cond.replace('$?', '$' + params.length)}`; };
    if (q.cliente) add('cliente_id=$?', String(q.cliente));
    if (q.agendamento) add('agendamento_id=$?', String(q.agendamento));
    if (q.servico) add('servico_id=$?', String(q.servico));
    if (dataValida(q.data)) add('data=$?', q.data);
    const termo = txt(q.q, 60);
    if (termo) add(`translate(lower(cliente_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $?`, '%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
    const tot = await c.query(`select count(*)::int n from brow_registros where estab=$1${filtro}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, cliente_id, cliente_nome, servico_nome, profissional_nome, to_char(data,'YYYY-MM-DD') data, situacao,
        (select count(*)::int from brow_registro_fotos f where f.registro_id=r.id) fotos
      from brow_registros r where estab=$1${filtro} order by situacao='rascunho' desc, coalesce(data, criado_em::date) desc, atualizado_em desc
      limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }
  if (acao === 'rg_por_agendamento') {
    const r = await c.query(`select id, situacao from brow_registros where estab=$1 and agendamento_id=$2`, [estab, String(q.agendamento || '')]);
    res.status(200).json({ ok: true, registro: r.rows[0] || null });
    return;
  }
  if (acao === 'rg_ver') {
    const r = await c.query(`${SEL} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    const g = r.rows[0];
    const f = await c.query(`select tipo, largura, altura, bytes, atualizado_em from brow_registro_fotos where estab=$1 and registro_id=$2`, [estab, g.id]);
    const rt = await c.query(`select id, tipo, motivo, texto, autor, criado_em from brow_registro_retificacoes where estab=$1 and registro_id=$2 order by criado_em`, [estab, g.id]);
    const h = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='registro' and ref_id=$2 order by id`, [estab, g.id]);
    res.status(200).json({ ok: true, registro: g, fotos: f.rows, retificacoes: rt.rows, historico: h.rows });
    return;
  }
  if (acao === 'rg_foto') {
    const r = await c.query(`select imagem, largura, altura from brow_registro_fotos where estab=$1 and registro_id=$2 and tipo=$3`, [estab, String(q.id || ''), String(q.tipo || '')]);
    if (!r.rows.length) return erro(res, 404, 'sem_foto', 'Foto não encontrada.');
    res.status(200).json({ ok: true, foto: `data:image/jpeg;base64,${Buffer.from(r.rows[0].imagem).toString('base64')}`, largura: r.rows[0].largura, altura: r.rows[0].altura });
    return;
  }

  if (req.method === 'POST' && acao === 'rg_salvar') {
    const b = corpo(req);
    const finalizar = b.finalizar === true;
    const erros = {};
    const cl = (await c.query('select id, nome from brow_clientes where estab=$1 and id=$2', [estab, String(b.cliente_id || '')])).rows[0];
    if (!cl) erros.cliente_id = 'Escolha a cliente.';
    let sv = null, pr = null, ag = null;
    if (b.servico_id) { sv = (await c.query('select id, nome from brow_servicos where estab=$1 and id=$2', [estab, String(b.servico_id)])).rows[0]; if (!sv) erros.servico_id = 'Serviço não encontrado.'; }
    if (b.profissional_id) { pr = (await c.query('select id, nome from brow_profissionais where estab=$1 and id=$2', [estab, String(b.profissional_id)])).rows[0]; if (!pr) erros.profissional_id = 'Profissional não encontrada.'; }
    if (b.agendamento_id) { ag = (await c.query('select id, cliente_id from brow_agendamentos where estab=$1 and id=$2', [estab, String(b.agendamento_id)])).rows[0]; if (!ag) erros.agendamento_id = 'Atendimento não encontrado.'; else if (cl && ag.cliente_id !== cl.id) erros.agendamento_id = 'Esse atendimento é de outra cliente.'; }
    if (b.data && !dataValida(b.data)) erros.data = 'Data inválida.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os dados.', { erros });
    const tecnica = txt(b.tecnica, 600), observacoes = txt(b.observacoes, 2000), produtos = lerProdutos(b.produtos);
    if (finalizar) {
      const p = {};
      if (!sv) p.servico_id = 'Escolha o serviço.';
      if (!b.data) p.data = 'Informe a data.';
      if (!pr) p.profissional_id = 'Informe a profissional responsável.';
      if (!tecnica) p.tecnica = 'Informe a técnica utilizada.';
      if (Object.keys(p).length) return erro(res, 422, 'incompleto', 'Para finalizar, complete: ' + Object.values(p).join(' '), { erros: p });
    }
    const etapa = ETAPAS.includes(b.etapa_atual) ? b.etapa_atual : 'cliente';
    await c.query('begin');
    try {
      let id = b.id ? String(b.id) : null;
      if (id) {
        const r0 = await c.query('select situacao from brow_registros where estab=$1 and id=$2 for update', [estab, id]);
        if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.'); }
        if (r0.rows[0].situacao === 'finalizado') { await c.query('rollback'); return erro(res, 409, 'finalizado', 'Registro finalizado não é alterado. Use retificação ou complemento.'); }
      } else {
        const chave = txt(b.chave_envio, 64);
        if (!chave) { await c.query('rollback'); return erro(res, 400, 'chave_envio', 'Pedido incompleto.'); }
        const novo = crypto.randomUUID();
        const ins = await c.query(`insert into brow_registros(id,estab,cliente_id,cliente_nome,chave_envio,criado_por) values($1,$2,$3,$4,$5,$6)
          on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, [novo, estab, cl.id, cl.nome, chave, usuario]);
        if (ins.rows.length) { id = novo; await historico(c, estab, id, 'criado', null); }
        else { id = (await c.query('select id from brow_registros where estab=$1 and chave_envio=$2 for update', [estab, chave])).rows[0].id; }
      }
      // um registro por atendimento da agenda
      if (ag) {
        const outro = await c.query('select id from brow_registros where estab=$1 and agendamento_id=$2 and id<>$3', [estab, ag.id, id]);
        if (outro.rows.length) { await c.query('rollback'); return erro(res, 409, 'duplicado', 'Já existe um registro para este atendimento.', { id: outro.rows[0].id }); }
      }
      await c.query(`update brow_registros set cliente_id=$3, cliente_nome=$4, servico_id=$5, servico_nome=$6, profissional_id=$7, profissional_nome=$8, data=$9, agendamento_id=$10,
          tecnica=$11, observacoes=$12, produtos=$13, etapa_atual=$14, atualizado_em=now(),
          situacao = case when $15 then 'finalizado' else 'rascunho' end,
          finalizado_em = case when $15 then now() else null end, finalizado_por = case when $15 then $16 else null end
        where estab=$1 and id=$2`,
        [estab, id, cl.id, cl.nome, sv ? sv.id : null, sv ? sv.nome : null, pr ? pr.id : null, pr ? pr.nome : null, b.data || null, ag ? ag.id : null,
          tecnica, observacoes, JSON.stringify(produtos), finalizar ? 'conferencia' : etapa, finalizar, usuario]);
      await historico(c, estab, id, finalizar ? 'finalizado' : 'rascunho_salvo', finalizar ? { produtos: produtos.length } : { etapa });
      await c.query('commit');
      res.status(200).json({ ok: true, id, situacao: finalizar ? 'finalizado' : 'rascunho' });
      return;
    } catch (e) {
      await c.query('rollback');
      if (e && e.code === '23505' && String(e.constraint || '').includes('agendamento')) {
        const o = await c.query('select id from brow_registros where estab=$1 and agendamento_id=$2', [estab, String(b.agendamento_id)]);
        return erro(res, 409, 'duplicado', 'Já existe um registro para este atendimento.', { id: o.rows[0] && o.rows[0].id });
      }
      throw e;
    }
  }

  if (req.method === 'POST' && (acao === 'rg_foto_salvar' || acao === 'rg_foto_remover')) {
    const b = corpo(req);
    const id = String(b.id || ''), tipo = b.tipo;
    if (!['antes', 'depois'].includes(tipo)) return erro(res, 400, 'tipo', 'Tipo de foto inválido.');
    const r0 = await c.query('select situacao from brow_registros where estab=$1 and id=$2', [estab, id]);
    if (!r0.rows.length) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    if (r0.rows[0].situacao === 'finalizado') return erro(res, 409, 'finalizado', 'Fotos de registro finalizado não são alteradas.');
    if (acao === 'rg_foto_remover') {
      await c.query('delete from brow_registro_fotos where estab=$1 and registro_id=$2 and tipo=$3', [estab, id, tipo]);
      await historico(c, estab, id, 'foto_removida', { tipo });
      res.status(200).json({ ok: true }); return;
    }
    const f = jpegDe(b.imagem);
    if (f.erro) return erro(res, 422, f.erro, f.erro === 'tamanho' ? 'A foto ficou grande demais para enviar. Tente outra.' : 'Arquivo de imagem inválido.');
    await c.query(`insert into brow_registro_fotos(estab,registro_id,tipo,imagem,largura,altura,bytes) values($1,$2,$3,$4,$5,$6,$7)
      on conflict (registro_id, tipo) do update set imagem=excluded.imagem, largura=excluded.largura, altura=excluded.altura, bytes=excluded.bytes, atualizado_em=now()`,
      [estab, id, tipo, f.buf, f.w, f.h, f.buf.length]);
    await historico(c, estab, id, 'foto_salva', { tipo, largura: f.w, altura: f.h });
    res.status(200).json({ ok: true, largura: f.w, altura: f.h }); return;
  }

  if (req.method === 'POST' && acao === 'rg_retificar') {
    const b = corpo(req);
    const r0 = await c.query('select situacao from brow_registros where estab=$1 and id=$2', [estab, String(b.id || '')]);
    if (!r0.rows.length) return erro(res, 404, 'nao_encontrado', 'Registro não encontrado.');
    if (r0.rows[0].situacao !== 'finalizado') return erro(res, 409, 'rascunho', 'Registro em rascunho: corrija diretamente antes de finalizar.');
    const erros = {};
    if (!['retificacao', 'complemento'].includes(b.tipo)) erros.tipo = 'Escolha o tipo.';
    const motivo = txt(b.motivo, 300); if (!motivo) erros.motivo = 'Informe o motivo.';
    const texto = txt(b.texto, 2000); if (!texto) erros.texto = 'Escreva a correção ou o complemento.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    const nid = crypto.randomUUID();
    const ins = await c.query(`insert into brow_registro_retificacoes(id,estab,registro_id,tipo,motivo,texto,autor,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, [nid, estab, String(b.id), b.tipo, motivo, texto, usuario, chave]);
    if (ins.rows.length) await historico(c, estab, String(b.id), b.tipo === 'retificacao' ? 'retificado' : 'complementado', { motivo });
    res.status(200).json({ ok: true, repetido: !ins.rows.length }); return;
  }

  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { lerProdutos, jpegDe };
module.exports.garantirTabelas = garantirTabelas;
