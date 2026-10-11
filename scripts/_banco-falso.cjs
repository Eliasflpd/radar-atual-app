// Banco de dados FALSO em memória, só para testes locais do cadastro (api/cadastros.js + api/_lib/chave.js).
// Responde às poucas consultas que esses arquivos fazem. Nada de rede, nada de banco de verdade.
// Uso:  const { db, instalar } = require('./_banco-falso.cjs');  instalar();  // ANTES de require('../api/cadastros.js')
const Module = require('module');

const db = { cadastros: [], chaves: [], desconhecidas: [] };
let idSeq = 1;
const dig = v => String(v || '').replace(/\D/g, '');

class ClienteFalso {
  async connect() {} async end() {}
  async query(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (s.startsWith('create ') || s.startsWith('alter ')) return { rows: [], rowCount: 0 };
    if (s.startsWith('select id from radar_cadastros')) { const r = db.cadastros.filter(x => dig(x.whatsapp) === p[0]).slice(0, 1).map(x => ({ id: x.id })); return { rows: r, rowCount: r.length }; }
    if (s.startsWith('select 1 from radar_cadastros')) { const n = db.cadastros.filter(x => dig(x.whatsapp) === p[0]).length ? 1 : 0; return { rows: n ? [{}] : [], rowCount: n }; }
    if (s.startsWith('insert into radar_cadastros')) { db.cadastros.push({ id: idSeq++, nome: p[0], cargo: p[1], whatsapp: p[2] }); return { rows: [], rowCount: 1 }; }
    if (s.startsWith('update radar_cadastros set nome')) { const x = db.cadastros.find(x => x.id === p[2]); if (x) { x.nome = p[0]; x.cargo = p[1]; } return { rows: [], rowCount: x ? 1 : 0 }; }
    if (s.includes('select count(*)::int as n from radar_chaves')) return { rows: [{ n: db.chaves.filter(k => k.user_key === p[0]).length }], rowCount: 1 };
    if (s.startsWith('delete from radar_chaves where user_key')) { db.chaves = db.chaves.filter(k => k.user_key !== p[0]); return { rows: [], rowCount: 0 }; }
    if (s.startsWith('insert into radar_chaves')) { db.chaves.push({ id: idSeq++, user_key: p[0], chave_hash: p[1] }); return { rows: [], rowCount: 1 }; }
    if (s.startsWith('delete from radar_chaves where id in')) return { rows: [], rowCount: 0 };
    if (s.startsWith('select id, user_key from radar_chaves where chave_hash')) { const k = db.chaves.find(k => k.chave_hash === p[0]); return { rows: k ? [{ id: k.id, user_key: k.user_key }] : [], rowCount: k ? 1 : 0 }; }
    if (s.startsWith('update radar_chaves set usado_em')) return { rows: [], rowCount: 1 };
    db.desconhecidas.push(s.slice(0, 90));
    return { rows: [], rowCount: 0 };
  }
}

function instalar() {
  process.env.RADAR_DB = process.env.RADAR_DB || 'postgres://falso';
  const original = Module._load;
  Module._load = function (req, ...r) { return req === 'pg' ? { Client: ClienteFalso } : original.call(this, req, ...r); };
}
module.exports = { db, instalar, ClienteFalso };
