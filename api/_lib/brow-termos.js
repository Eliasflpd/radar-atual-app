// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — TERMOS E AUTORIZAÇÕES (10/11/2026)
// Chamado por api/_lib/brow-studio.js para ações "tm_*" (mesma rota /api/brow,
// mesma trava de acesso, mesma conexão). Tabelas brow_termo_textos e
// brow_termos + histórico em brow_historico (tipo 'termo'). Nada do RADAR.
//
// TEXTOS: cada versão aprovada é IMUTÁVEL (corrigir = nova versão). Sem texto
// aprovado, o app mostra um texto de DEMONSTRAÇÃO (id "demo-*") e o servidor
// RECUSA finalizar documento com ele. Ao finalizar, a cópia exata do texto é
// gravada no próprio documento (título, versão e conteúdo).
//
// DECISÕES: procedimento (prosseguir | nao_prosseguir) e divulgação de imagem
// (autoriza | nao_autoriza) são independentes. Recusa nunca vira autorização.
// Aceite do termo NÃO é avaliação de aptidão — o servidor não infere nada.
//
// ASSINATURA: desenhada (imagem JPEG no banco) | aceite_identificado (nome
// digitado + confirmação) | recusa_sem_assinatura (só quando não prossegue).
// Nunca é chamada de certificada/GOV.BR. A assinatura vale para um conjunto
// exato de escolhas: "assinatura_ref" = SHA-256 de textos+versões+decisões+
// canais+finalidade+nome+modalidade. Mudou qualquer coisa, o servidor recusa
// e pede nova assinatura.
//
// FINALIZADO = imutável. Correção = nova versão ligada (anterior_id).
// Retirada da autorização de imagem: registra data/responsável/motivo sem
// mexer na decisão original nem no aceite do procedimento.
// PDF: gerado aqui, sem biblioteca externa, só do que está salvo.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const CANAIS = { instagram: 'Instagram do estúdio', portfolio: 'Portfólio do estúdio' };
const MODALIDADES = { desenhada: 'Assinatura desenhada na tela', aceite_identificado: 'Aceite identificado (nome digitado e confirmado, sem desenho)', recusa_sem_assinatura: 'Recusa registrada sem assinatura' };
const DECISAO = { prosseguir: 'Deseja prosseguir', nao_prosseguir: 'Não deseja prosseguir' };
const DEC_IMG = { autoriza: 'Autoriza a divulgação', nao_autoriza: 'Não autoriza a divulgação' };

// Textos de DEMONSTRAÇÃO — não são termos definitivos e não podem ser finalizados.
const DEMO = {
  procedimento: { id: 'demo-procedimento', tipo: 'procedimento', titulo: 'TEXTO DE DEMONSTRAÇÃO — termo do procedimento', versao: 0, demo: true,
    conteudo: 'DEMONSTRAÇÃO. Este texto existe apenas para mostrar como o termo aparecerá na tela. Ele não é um termo aprovado e não pode ser usado como documento real.\n\nO estabelecimento deve cadastrar, em “Textos dos termos”, o texto aprovado para cada procedimento, com título e versão.\n\nEnquanto este aviso aparecer, o documento pode ser preenchido para treino, mas não pode ser finalizado.' },
  imagem: { id: 'demo-imagem', tipo: 'imagem', titulo: 'TEXTO DE DEMONSTRAÇÃO — autorização de imagem', versao: 0, demo: true,
    conteudo: 'DEMONSTRAÇÃO. Este texto não é uma autorização aprovada. O estabelecimento deve cadastrar o texto aprovado de autorização de divulgação de imagem em “Textos dos termos”.' }
};

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_termo_textos(
    id text primary key, estab text not null, tipo text not null check (tipo in ('procedimento','imagem')),
    servico_id text, titulo text not null, versao integer not null, conteudo text not null,
    finalidade text, situacao text not null default 'vigente' check (situacao in ('vigente','substituido')),
    criado_por text, chave_envio text, criado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_tt_envio on brow_termo_textos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_tt_versao on brow_termo_textos(estab, tipo, coalesce(servico_id,''), versao)`);
  await c.query(`create table if not exists brow_termos(
    id text primary key, estab text not null,
    cliente_id text not null, cliente_nome text not null, servico_id text, servico_nome text,
    profissional_id text, profissional_nome text, data date, agendamento_id text,
    situacao text not null default 'pendente' check (situacao in ('pendente','finalizado')),
    etapa_atual text not null default 'cliente',
    texto_proc_id text, texto_proc_titulo text, texto_proc_versao integer, texto_proc_conteudo text,
    decisao text check (decisao is null or decisao in ('prosseguir','nao_prosseguir')),
    texto_img_id text, texto_img_titulo text, texto_img_versao integer, texto_img_conteudo text,
    imagem_decisao text check (imagem_decisao is null or imagem_decisao in ('autoriza','nao_autoriza')),
    imagem_canais jsonb, imagem_finalidade text,
    assinante_nome text, modalidade text, assinatura bytea, assinatura_ref text, assinado_em timestamptz,
    imagem_retirada_em timestamptz, imagem_retirada_por text, imagem_retirada_motivo text,
    anterior_id text, versao integer not null default 1,
    criado_por text, finalizado_por text, finalizado_em timestamptz, chave_envio text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_tm_envio on brow_termos(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create unique index if not exists brow_tm_derivado on brow_termos(estab, anterior_id) where anterior_id is not null and situacao = 'pendente'`);
  await c.query(`create index if not exists brow_tm_cliente on brow_termos(estab, cliente_id)`);
}

const txt = (v, max) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, max) : null; };
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
function dataValida(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
async function historico(c, estab, id, acao, det) {
  await c.query('insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,$2,$3,$4,$5)', [estab, 'termo', id, acao, det ? JSON.stringify(det) : null]);
}
const canaisValidos = (v) => (Array.isArray(v) ? [...new Set(v.filter(x => CANAIS[x]))].sort() : []);
// Texto canônico que a assinatura "cobre" (o aparelho calcula o mesmo SHA-256).
function textoAssinado(d) {
  return JSON.stringify([d.texto_proc_id || '', d.texto_proc_versao == null ? '' : d.texto_proc_versao, d.decisao || '',
    d.texto_img_id || '', d.texto_img_versao == null ? '' : d.texto_img_versao, d.imagem_decisao || '',
    d.imagem_decisao === 'autoriza' ? canaisValidos(d.imagem_canais) : [], d.imagem_decisao === 'autoriza' ? (d.imagem_finalidade || '').trim() : '',
    (d.assinante_nome || '').trim(), d.modalidade || '']);
}
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
function jpegValido(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 100 || buf.length > 400 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  return buf;
}
function situacaoNome(t) {
  if (t.situacao === 'pendente') return 'Pendente';
  return t.decisao === 'prosseguir' ? 'Aceito' : 'Recusado';
}
function imagemNome(t) {
  if (t.imagem_retirada_em) return 'Autorização de imagem retirada';
  if (t.imagem_decisao === 'autoriza') return 'Imagem autorizada';
  if (t.imagem_decisao === 'nao_autoriza') return 'Imagem não autorizada';
  return 'Imagem: sem decisão';
}

// Texto vigente: o do serviço; se não houver, o geral do tipo; se não houver, demonstração.
async function textoVigente(c, estab, tipo, servicoId) {
  const r = await c.query(`select * from brow_termo_textos where estab=$1 and tipo=$2 and situacao='vigente'
    and (servico_id=$3 or servico_id is null) order by (servico_id is null), versao desc limit 1`, [estab, tipo, servicoId || '']);
  return r.rows[0] ? { ...r.rows[0], demo: false } : DEMO[tipo];
}
async function textoPorId(c, estab, id) {
  if (id === DEMO.procedimento.id) return DEMO.procedimento;
  if (id === DEMO.imagem.id) return DEMO.imagem;
  const r = await c.query('select * from brow_termo_textos where estab=$1 and id=$2', [estab, String(id || '')]);
  return r.rows[0] ? { ...r.rows[0], demo: false } : null;
}

// ─── PDF mínimo (sem bibliotecas): A4, Helvetica, texto em WinAnsi e a assinatura em JPEG ───
function winAnsi(s) {
  const mapa = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  const bytes = [];
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    let b = mapa[ch] != null ? mapa[ch] : (cp < 256 ? cp : 63);
    if (b === 40 || b === 41 || b === 92) bytes.push(92);   // ( ) \ escapados
    bytes.push(b);
  }
  return Buffer.from(bytes);
}
function quebrar(texto, tamanho, largura) {
  const max = Math.floor(largura / (tamanho * 0.5));        // Helvetica: ~0,5 em por caractere (conservador)
  const linhas = [];
  for (const par of String(texto).split('\n')) {
    if (!par.trim()) { linhas.push(''); continue; }
    let atual = '';
    for (const p of par.split(/\s+/)) {
      if ((atual + ' ' + p).trim().length > max) { if (atual) linhas.push(atual); atual = p.length > max ? p.slice(0, max) : p; }
      else atual = (atual + ' ' + p).trim();
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}
function dimensoesJpeg(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function gerarPdf(blocos, assinatura) {
  // blocos: [{texto, tamanho, negrito, espaco}]
  const W = 595, H = 842, M = 50, larg = W - 2 * M;
  const paginas = []; let ops = []; let y = H - M;
  const novaPagina = () => { paginas.push(ops); ops = []; y = H - M; };
  for (const b of blocos) {
    const t = b.tamanho || 10, lh = t * 1.4;
    y -= b.espaco || 0;
    for (const l of quebrar(b.texto, t, larg)) {
      if (y - lh < M) novaPagina();
      y -= lh;
      ops.push({ tipo: 'txt', x: M, y, t, f: b.negrito ? 'F2' : 'F1', s: l });
    }
  }
  let img = null;
  if (assinatura) {
    const dim = dimensoesJpeg(assinatura);
    if (dim) {
      const w = Math.min(260, larg), h = Math.round(w * dim.h / dim.w);
      if (y - h - 20 < M) novaPagina();
      y -= h + 10;
      ops.push({ tipo: 'img', x: M, y, w, h });
      img = { buf: assinatura, ...dim };
    }
  }
  paginas.push(ops);
  // monta os objetos
  const objs = [];
  const add = (b) => { objs.push(b); return objs.length; };
  const catalogo = add(null), paginasObj = add(null);
  const f1 = add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  const f2 = add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  const imgObj = img ? add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.buf.length} >>\nstream\n`), img.buf, Buffer.from('\nendstream')])) : 0;
  const kids = [];
  paginas.forEach((pg, n) => {
    const partes = [];
    for (const o of pg) {
      if (o.tipo === 'txt') partes.push(Buffer.from(`BT /${o.f} ${o.t} Tf ${o.x} ${o.y.toFixed(1)} Td (`), winAnsi(o.s), Buffer.from(') Tj ET\n'));
      else partes.push(Buffer.from(`q ${o.w} 0 0 ${o.h} ${o.x} ${o.y.toFixed(1)} cm /Im1 Do Q\n`));
    }
    partes.push(Buffer.from(`BT /F1 8 Tf ${M} 30 Td (`), winAnsi(`Página ${n + 1} de ${paginas.length} · cópia gerada a partir do registro salvo no Brow Studio`), Buffer.from(') Tj ET\n'));
    const conteudo = Buffer.concat(partes);
    const cont = add(Buffer.concat([Buffer.from(`<< /Length ${conteudo.length} >>\nstream\n`), conteudo, Buffer.from('\nendstream')]));
    kids.push(add(Buffer.from(`<< /Type /Page /Parent ${paginasObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${imgObj ? ` /XObject << /Im1 ${imgObj} 0 R >>` : ''} >> /Contents ${cont} 0 R >>`)));
  });
  objs[catalogo - 1] = Buffer.from(`<< /Type /Catalog /Pages ${paginasObj} 0 R >>`);
  objs[paginasObj - 1] = Buffer.from(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
  const partes = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary')];
  const offsets = []; let pos = partes[0].length;
  objs.forEach((o, i) => { const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from('\nendobj\n')]); offsets.push(pos); partes.push(b); pos += b.length; });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  partes.push(Buffer.from(xref));
  return Buffer.concat(partes);
}

const SEL = `select *, to_char(data,'YYYY-MM-DD') as data from brow_termos`;
function linhaPublica(t, comAssinatura) {
  const x = { ...t };
  delete x.assinatura;
  x.tem_assinatura = !!t.assinatura;
  if (comAssinatura && t.assinatura) x.assinatura = `data:image/jpeg;base64,${Buffer.from(t.assinatura).toString('base64')}`;
  x.situacao_nome = situacaoNome(t);
  x.imagem_nome = imagemNome(t);
  return x;
}

module.exports = async function termos(c, estab, req, res, acao, garantirOutras) {
  await garantirOutras(c);
  await garantirTabelas(c);
  const q = req.query || {};
  const usuario = req.brow_usuario || null;

  // ─── TEXTOS ───────────────────────────────────────────────────────────────
  if (acao === 'tm_textos_vigentes') {
    const proc = await textoVigente(c, estab, 'procedimento', q.servico_id);
    const img = await textoVigente(c, estab, 'imagem', null);
    const enxuto = (t) => ({ id: t.id, titulo: t.titulo, versao: t.versao, conteudo: t.conteudo, finalidade: t.finalidade || null, demo: !!t.demo });
    res.status(200).json({ ok: true, procedimento: enxuto(proc), imagem: enxuto(img) });
    return;
  }
  if (acao === 'tm_textos_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const tot = await c.query('select count(*)::int n from brow_termo_textos where estab=$1', [estab]);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select t.id, t.tipo, t.titulo, t.versao, t.situacao, t.servico_id, s.nome servico_nome, t.criado_em from brow_termo_textos t
      left join brow_servicos s on s.id=t.servico_id and s.estab=t.estab where t.estab=$1
      order by t.situacao='vigente' desc, t.tipo, coalesce(s.nome,''), t.versao desc limit ${limite} offset ${(pg - 1) * limite}`, [estab]);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows });
    return;
  }
  if (acao === 'tm_texto_ver') {
    const t = await textoPorId(c, estab, q.id);
    if (!t) return erro(res, 404, 'nao_encontrado', 'Texto não encontrado.');
    let servico_nome = null;
    if (t.servico_id) servico_nome = ((await c.query('select nome from brow_servicos where estab=$1 and id=$2', [estab, t.servico_id])).rows[0] || {}).nome || null;
    res.status(200).json({ ok: true, texto: { ...t, servico_nome } });
    return;
  }
  if (req.method === 'POST' && acao === 'tm_texto_salvar') {
    const b = corpo(req);
    const erros = {};
    if (!['procedimento', 'imagem'].includes(b.tipo)) erros.tipo = 'Escolha o tipo de texto.';
    const titulo = txt(b.titulo, 120); if (!titulo || titulo.length < 3) erros.titulo = 'Informe o título.';
    const conteudo = txt(b.conteudo, 20000); if (!conteudo || conteudo.length < 20) erros.conteudo = 'Cole o texto aprovado (mínimo de 20 caracteres).';
    let servicoId = null;
    if (b.tipo === 'procedimento' && b.servico_id) {
      const s = await c.query('select id from brow_servicos where estab=$1 and id=$2', [estab, String(b.servico_id)]);
      if (!s.rows.length) erros.servico_id = 'Serviço não encontrado.'; else servicoId = s.rows[0].id;
    }
    const finalidade = b.tipo === 'imagem' ? txt(b.finalidade, 300) : null;
    if (b.tipo === 'imagem' && !finalidade) erros.finalidade = 'Informe a finalidade da divulgação.';
    if (b.aprovado !== true) erros.aprovado = 'Confirme que este texto foi aprovado pelo estabelecimento.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    const chave = txt(b.chave_envio, 64);
    await c.query('begin');
    try {
      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`brow-tt|${estab}|${b.tipo}|${servicoId || ''}`]);
      if (chave) { const ja = await c.query('select id, versao from brow_termo_textos where estab=$1 and chave_envio=$2', [estab, chave]); if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, versao: ja.rows[0].versao, repetido: true }); return; } }
      const v = await c.query(`select coalesce(max(versao),0)+1 n from brow_termo_textos where estab=$1 and tipo=$2 and coalesce(servico_id,'')=$3`, [estab, b.tipo, servicoId || '']);
      await c.query(`update brow_termo_textos set situacao='substituido' where estab=$1 and tipo=$2 and coalesce(servico_id,'')=$3 and situacao='vigente'`, [estab, b.tipo, servicoId || '']);
      const id = crypto.randomUUID();
      await c.query(`insert into brow_termo_textos(id,estab,tipo,servico_id,titulo,versao,conteudo,finalidade,criado_por,chave_envio) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, estab, b.tipo, servicoId, titulo, v.rows[0].n, conteudo, finalidade, usuario, chave]);
      await c.query('commit');
      res.status(201).json({ ok: true, id, versao: v.rows[0].n }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────────────────
  if (acao === 'tm_listar') {
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
    const params = [estab]; let filtro = '';
    if (q.cliente) { params.push(String(q.cliente)); filtro += ` and cliente_id=$${params.length}`; }
    if (q.agendamento) { params.push(String(q.agendamento)); filtro += ` and agendamento_id=$${params.length}`; }
    const termo = txt(q.q, 60);
    if (termo) { params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%'); filtro += ` and translate(lower(cliente_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $${params.length}`; }
    const tot = await c.query(`select count(*)::int n from brow_termos where estab=$1${filtro}`, params);
    const total = tot.rows[0].n, paginas = Math.max(1, Math.ceil(total / limite));
    const pg = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), paginas);
    const r = await c.query(`select id, cliente_id, cliente_nome, servico_nome, to_char(data,'YYYY-MM-DD') data, situacao, decisao, imagem_decisao, imagem_retirada_em, versao
      from brow_termos where estab=$1${filtro} order by situacao='pendente' desc, coalesce(data, criado_em::date) desc, atualizado_em desc limit ${limite} offset ${(pg - 1) * limite}`, params);
    res.status(200).json({ ok: true, total, pagina: pg, paginas, itens: r.rows.map(t => ({ ...t, situacao_nome: situacaoNome(t), imagem_nome: imagemNome(t) })) });
    return;
  }
  // Situação ATUAL da autorização de imagem da cliente (para o perfil e para a futura seleção de fotos)
  if (acao === 'tm_imagem_cliente') {
    const r = await c.query(`select id, to_char(data,'YYYY-MM-DD') data, imagem_decisao, imagem_canais, imagem_retirada_em, finalizado_em from brow_termos
      where estab=$1 and cliente_id=$2 and situacao='finalizado' and imagem_decisao is not null order by finalizado_em desc limit 1`, [estab, String(q.cliente || '')]);
    const t = r.rows[0];
    res.status(200).json({ ok: true, situacao: !t ? 'sem_registro' : t.imagem_retirada_em ? 'retirada' : t.imagem_decisao, canais: t && !t.imagem_retirada_em && t.imagem_decisao === 'autoriza' ? t.imagem_canais : [],
      termo_id: t ? t.id : null, data: t ? t.data : null });
    return;
  }
  if (acao === 'tm_ver') {
    const r = await c.query(`${SEL} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Documento não encontrado.');
    const t = r.rows[0];
    const h = await c.query(`select acao, detalhes, criado_em from brow_historico where estab=$1 and tipo='termo' and ref_id=$2 order by id`, [estab, t.id]);
    const pos = (await c.query(`select id, situacao, to_char(data,'YYYY-MM-DD') data from brow_termos where estab=$1 and anterior_id=$2 order by criado_em desc limit 1`, [estab, t.id])).rows[0] || null;
    res.status(200).json({ ok: true, termo: linhaPublica(t, true), historico: h.rows, posterior: pos, canais: CANAIS, modalidades: MODALIDADES });
    return;
  }

  if (req.method === 'POST' && acao === 'tm_salvar') {
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
    const tp = b.texto_proc_id ? await textoPorId(c, estab, b.texto_proc_id) : null;
    const ti = b.texto_img_id ? await textoPorId(c, estab, b.texto_img_id) : null;
    if (b.texto_proc_id && !tp) erros.texto_proc_id = 'Texto do termo não encontrado.';
    if (b.texto_img_id && !ti) erros.texto_img_id = 'Texto da autorização não encontrado.';
    const decisao = DECISAO[b.decisao] ? b.decisao : null;
    const imgDec = DEC_IMG[b.imagem_decisao] ? b.imagem_decisao : null;
    const canais = imgDec === 'autoriza' ? canaisValidos(b.imagem_canais) : [];
    const finalidade = imgDec === 'autoriza' ? txt(b.imagem_finalidade, 300) : null;
    const nome = txt(b.assinante_nome, 120);
    const modalidade = MODALIDADES[b.modalidade] ? b.modalidade : null;
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os dados.', { erros });

    const d = { texto_proc_id: tp ? tp.id : null, texto_proc_versao: tp ? tp.versao : null, decisao, texto_img_id: ti ? ti.id : null, texto_img_versao: ti ? ti.versao : null,
      imagem_decisao: imgDec, imagem_canais: canais, imagem_finalidade: finalidade, assinante_nome: nome, modalidade };
    let assinaturaBuf = null;
    if (finalizar) {
      const pend = {};
      if (!sv) pend.servico_id = 'Escolha o serviço.';
      if (!pr) pend.profissional_id = 'Informe a profissional.';
      if (!b.data) pend.data = 'Informe a data.';
      if (!tp || !ti) pend.textos = 'Leia o termo e a autorização de imagem.';
      else if (tp.demo || ti.demo) return erro(res, 422, 'demonstracao', 'Este documento usa texto de DEMONSTRAÇÃO e não pode ser finalizado como documento real. Cadastre o texto aprovado em “Textos dos termos”.');
      if (!decisao) pend.decisao = 'Registre a decisão sobre o procedimento.';
      if (!imgDec) pend.imagem_decisao = 'Registre a decisão sobre a divulgação de imagem.';
      if (imgDec === 'autoriza' && !canais.length) pend.imagem_canais = 'Escolha ao menos um canal de divulgação.';
      if (imgDec === 'autoriza' && !finalidade) pend.imagem_finalidade = 'Informe a finalidade.';
      if (!nome || nome.length < 3) pend.assinante_nome = 'Informe o nome de quem assina.';
      if (!modalidade) pend.modalidade = 'Escolha a forma de assinatura ou aceite.';
      if (modalidade === 'recusa_sem_assinatura' && decisao !== 'nao_prosseguir') pend.modalidade = 'Registro sem assinatura só vale para recusa do procedimento.';
      if (modalidade === 'aceite_identificado' && (txt(b.nome_confirmado, 120) || '').toLowerCase() !== (nome || '').toLowerCase()) pend.nome_confirmado = 'Digite o nome exatamente como informado para confirmar o aceite.';
      if (modalidade === 'desenhada') { assinaturaBuf = jpegValido(b.assinatura); if (!assinaturaBuf) pend.assinatura = 'Faça a assinatura na área indicada.'; }
      if (Object.keys(pend).length) return erro(res, 422, 'incompleto', 'Para finalizar, complete: ' + Object.values(pend).join(' '), { erros: pend });
      // a assinatura precisa ter sido feita para EXATAMENTE estas escolhas
      if (b.assinatura_ref !== sha(textoAssinado(d))) return erro(res, 409, 'assinatura_invalida', 'As escolhas mudaram depois da assinatura/aceite. É preciso assinar ou confirmar de novo.');
    }
    const etapa = txt(b.etapa_atual, 30) || 'cliente';
    await c.query('begin');
    try {
      let id = b.id ? String(b.id) : null;
      if (id) {
        const r0 = await c.query(`select situacao from brow_termos where estab=$1 and id=$2 for update`, [estab, id]);
        if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Documento não encontrado.'); }
        if (r0.rows[0].situacao === 'finalizado') { await c.query('rollback'); return erro(res, 409, 'finalizado', 'Documento finalizado não é alterado. Para corrigir, crie uma nova versão.'); }
      } else {
        const chave = txt(b.chave_envio, 64);
        if (!chave) { await c.query('rollback'); return erro(res, 400, 'chave_envio', 'Pedido incompleto.'); }
        const novo = crypto.randomUUID();
        const ins = await c.query(`insert into brow_termos(id,estab,cliente_id,cliente_nome,chave_envio,criado_por) values($1,$2,$3,$4,$5,$6)
          on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, [novo, estab, cl.id, cl.nome, chave, usuario]);
        if (ins.rows.length) { id = novo; await historico(c, estab, id, 'criado', null); }
        else {
          const r0 = await c.query(`select id, situacao from brow_termos where estab=$1 and chave_envio=$2 for update`, [estab, chave]);
          id = r0.rows[0].id;
          if (r0.rows[0].situacao === 'finalizado') { await c.query('rollback'); res.status(200).json({ ok: true, id, situacao: 'finalizado', repetido: true }); return; }
        }
      }
      await c.query(`update brow_termos set cliente_id=$3, cliente_nome=$4, servico_id=$5, servico_nome=$6, profissional_id=$7, profissional_nome=$8, data=$9, agendamento_id=$10,
          texto_proc_id=$11, texto_proc_titulo=$12, texto_proc_versao=$13, texto_proc_conteudo=$14, decisao=$15,
          texto_img_id=$16, texto_img_titulo=$17, texto_img_versao=$18, texto_img_conteudo=$19, imagem_decisao=$20, imagem_canais=$21, imagem_finalidade=$22,
          assinante_nome=$23, modalidade=$24, etapa_atual=$25, atualizado_em=now(),
          situacao = case when $26 then 'finalizado' else 'pendente' end,
          assinatura = case when $26 then $27::bytea else null end,
          assinatura_ref = case when $26 then $28 else null end,
          assinado_em = case when $26 then now() else null end,
          finalizado_em = case when $26 then now() else null end,
          finalizado_por = case when $26 then $29 else null end
        where estab=$1 and id=$2`,
        [estab, id, cl.id, cl.nome, sv ? sv.id : null, sv ? sv.nome : null, pr ? pr.id : null, pr ? pr.nome : null, b.data || null, ag ? ag.id : null,
          tp ? tp.id : null, tp ? tp.titulo : null, tp ? tp.versao : null, tp ? tp.conteudo : null, decisao,
          ti ? ti.id : null, ti ? ti.titulo : null, ti ? ti.versao : null, ti ? ti.conteudo : null, imgDec, JSON.stringify(canais), finalidade,
          nome, modalidade, finalizar ? 'conferencia' : etapa, finalizar, assinaturaBuf, finalizar ? b.assinatura_ref : null, usuario]);
      await historico(c, estab, id, finalizar ? 'finalizado' : 'pendente_salvo', finalizar
        ? { decisao: DECISAO[decisao], imagem: DEC_IMG[imgDec], canais: canais.map(x => CANAIS[x]).join(', ') || null, modalidade: MODALIDADES[modalidade], texto_versao: tp.versao, autorizacao_versao: ti.versao }
        : { etapa });
      await c.query('commit');
      res.status(200).json({ ok: true, id, situacao: finalizar ? 'finalizado' : 'pendente' });
      return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // Correção = nova versão ligada (o finalizado fica intacto). Assinatura NÃO é copiada.
  if (req.method === 'POST' && acao === 'tm_nova_versao') {
    const b = corpo(req);
    await c.query('begin');
    try {
      const r0 = await c.query(`${SEL} where estab=$1 and id=$2 for update`, [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Documento não encontrado.'); }
      const a = r0.rows[0];
      if (a.situacao !== 'finalizado') { await c.query('rollback'); return erro(res, 409, 'pendente', 'Este documento ainda está pendente: continue o preenchimento.'); }
      const ja = await c.query(`select id from brow_termos where estab=$1 and anterior_id=$2 and situacao='pendente'`, [estab, a.id]);
      if (ja.rows.length) { await c.query('rollback'); res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }
      const id = crypto.randomUUID();
      await c.query(`insert into brow_termos(id,estab,cliente_id,cliente_nome,servico_id,servico_nome,profissional_id,profissional_nome,data,agendamento_id,anterior_id,versao,criado_por,etapa_atual)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'leitura')`,
        [id, estab, a.cliente_id, a.cliente_nome, a.servico_id, a.servico_nome, a.profissional_id, a.profissional_nome, a.data, a.agendamento_id, a.id, (a.versao || 1) + 1, usuario]);
      await historico(c, estab, id, 'criado_como_correcao', { anterior_id: a.id });
      await historico(c, estab, a.id, 'correcao_iniciada', { nova_id: id });
      await c.query('commit');
      res.status(201).json({ ok: true, id }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // Retirada da autorização de divulgação (preserva a decisão original e o aceite do procedimento)
  if (req.method === 'POST' && acao === 'tm_retirar_imagem') {
    const b = corpo(req);
    await c.query('begin');
    try {
      const r0 = await c.query(`select situacao, imagem_decisao, imagem_retirada_em from brow_termos where estab=$1 and id=$2 for update`, [estab, String(b.id || '')]);
      if (!r0.rows.length) { await c.query('rollback'); return erro(res, 404, 'nao_encontrado', 'Documento não encontrado.'); }
      const t = r0.rows[0];
      if (t.situacao !== 'finalizado' || t.imagem_decisao !== 'autoriza') { await c.query('rollback'); return erro(res, 409, 'sem_autorizacao', 'Só é possível retirar uma autorização de imagem que foi dada em documento finalizado.'); }
      if (t.imagem_retirada_em) { await c.query('rollback'); res.status(200).json({ ok: true, repetido: true }); return; }
      if (b.confirmacao !== true) { await c.query('rollback'); return erro(res, 422, 'sem_confirmacao', 'Confirme a retirada.', { erros: { confirmacao: 'Marque a confirmação.' } }); }
      const motivo = txt(b.motivo, 300);
      await c.query(`update brow_termos set imagem_retirada_em=now(), imagem_retirada_por=$3, imagem_retirada_motivo=$4, atualizado_em=now() where estab=$1 and id=$2`, [estab, String(b.id), usuario, motivo]);
      await historico(c, estab, String(b.id), 'imagem_retirada', { motivo, responsavel: usuario || 'login pendente', obs: 'decisão original e aceite do procedimento preservados' });
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback'); throw e; }
  }

  // Cópia em PDF — só do que está salvo; entregue direto (sem link público)
  if (acao === 'tm_pdf') {
    const r = await c.query(`${SEL} where estab=$1 and id=$2`, [estab, String(q.id || '')]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Documento não encontrado.');
    const t = r.rows[0];
    if (t.situacao !== 'finalizado') return erro(res, 409, 'pendente', 'O PDF fica disponível depois que o documento é finalizado.');
    const cfg = (await c.query('select nome_estudio, fuso from brow_config where estab=$1', [estab])).rows[0] || {};
    const fuso = cfg.fuso || 'America/Sao_Paulo';
    const dh = (d) => d ? new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' }).format(new Date(d)) : '';
    const dataBr = t.data ? t.data.split('-').reverse().join('/') : '';
    const blocos = [
      { texto: `${cfg.nome_estudio || 'Brow Studio'} — Termos e autorizações`, tamanho: 15, negrito: true },
      { texto: `Documento versão ${t.versao}${t.anterior_id ? ' (correção de documento anterior)' : ''} · finalizado em ${dh(t.finalizado_em)}`, tamanho: 9, espaco: 4 },
      { texto: 'Identificação', tamanho: 12, negrito: true, espaco: 14 },
      { texto: `Cliente: ${t.cliente_nome}\nProcedimento: ${t.servico_nome || ''}\nProfissional: ${t.profissional_nome || ''}\nData: ${dataBr}`, tamanho: 10 },
      { texto: `${t.texto_proc_titulo} (versão ${t.texto_proc_versao})`, tamanho: 12, negrito: true, espaco: 14 },
      { texto: t.texto_proc_conteudo || '', tamanho: 10 },
      { texto: 'Decisão sobre o procedimento', tamanho: 12, negrito: true, espaco: 14 },
      { texto: `${DECISAO[t.decisao]}. (Registro da decisão da cliente; não é avaliação de aptidão para o procedimento.)`, tamanho: 10 },
      { texto: `${t.texto_img_titulo} (versão ${t.texto_img_versao})`, tamanho: 12, negrito: true, espaco: 14 },
      { texto: t.texto_img_conteudo || '', tamanho: 10 },
      { texto: 'Decisão sobre divulgação de imagem', tamanho: 12, negrito: true, espaco: 14 },
      { texto: `${DEC_IMG[t.imagem_decisao]}${t.imagem_decisao === 'autoriza' ? `\nCanais: ${(t.imagem_canais || []).map(x => CANAIS[x]).join(', ')}\nFinalidade: ${t.imagem_finalidade || ''}` : ''}${t.imagem_retirada_em ? `\nAutorização RETIRADA em ${dh(t.imagem_retirada_em)}${t.imagem_retirada_motivo ? ` — motivo: ${t.imagem_retirada_motivo}` : ''}. A decisão original acima foi preservada.` : ''}`, tamanho: 10 },
      { texto: 'Assinatura / aceite', tamanho: 12, negrito: true, espaco: 14 },
      { texto: `Nome: ${t.assinante_nome}\nModalidade: ${MODALIDADES[t.modalidade]}\nRegistrado em: ${dh(t.assinado_em)}${t.modalidade === 'desenhada' ? '\nAssinatura desenhada na tela (não é assinatura certificada nem GOV.BR):' : ''}`, tamanho: 10 }
    ];
    const pdf = gerarPdf(blocos, t.modalidade === 'desenhada' && t.assinatura ? Buffer.from(t.assinatura) : null);
    await historico(c, estab, t.id, 'pdf_gerado', null);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="termo-${t.cliente_nome.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}-v${t.versao}.pdf"`);
    res.status(200).end(pdf);
    return;
  }

  return erro(res, 400, 'acao', 'Ação desconhecida.');
};
module.exports._teste = { textoAssinado, sha, gerarPdf, quebrar, DEMO };
