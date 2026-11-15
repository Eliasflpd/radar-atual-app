// Pix "copia e cola" e QR code no padrão do Banco Central (BR Code, EMV QRCPS-MPM).
// Gera o código com a chave Pix do dono do app (conta 99Pay) e o valor exato a pagar.

const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

function cpfValido(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

// Deixa a chave no formato que os bancos esperam (e-mail, CPF, CNPJ, celular ou aleatória)
export function normalizarChave(chave) {
  const k = String(chave || '').trim();
  if (k.includes('@')) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const d = k.replace(/\D/g, '');
  if (k.startsWith('+')) return `+${d}`;
  if (d.length === 14) return d;                          // CNPJ
  if (d.length === 11 && cpfValido(d)) return d;          // CPF
  if (d.length === 10 || d.length === 11) return `+55${d}`; // celular com DDD
  if (d.length === 13 && d.startsWith('55')) return `+${d}`;
  return k;
}
export function tipoChave(chave) {
  const k = normalizarChave(chave);
  if (k.includes('@')) return 'E-mail';
  if (k.startsWith('+')) return 'Celular';
  if (/^\d{11}$/.test(k)) return 'CPF';
  if (/^\d{14}$/.test(k)) return 'CNPJ';
  if (/^[0-9a-f-]{36}$/.test(k)) return 'Chave aleatória';
  return 'Chave Pix';
}

function crc16(txt) {
  let crc = 0xffff;
  for (let i = 0; i < txt.length; i++) {
    crc ^= txt.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

// Código "copia e cola" (também é o conteúdo do QR code)
export function codigoPix({ chave, nome, cidade, valor, txid }) {
  const limpar = (t, max) => semAcento(t).replace(/[^A-Za-z0-9 ]/g, '').trim().toUpperCase().slice(0, max);
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(chave));
  const id = semAcento(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const corpo = campo('00', '01')
    + campo('26', conta)
    + campo('52', '0000')
    + campo('53', '986')
    + (valor ? campo('54', Number(valor).toFixed(2)) : '')
    + campo('58', 'BR')
    + campo('59', limpar(nome, 25) || 'CONTRATA AI')
    + campo('60', limpar(cidade, 15) || 'BRASIL')
    + campo('62', campo('05', id))
    + '6304';
  return corpo + crc16(corpo);
}
export { crc16 };
