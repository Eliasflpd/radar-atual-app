// Detecta tentativa de passar contato antes da contratação.
// Mesma lógica de public.tem_contato() em supabase/schema.sql — o banco é quem
// bloqueia de verdade; aqui é só para avisar o usuário antes de enviar.

const EXTENSO = [
  [/\bzero\b/g, '0'], [/\b(um|uma)\b/g, '1'], [/\b(dois|duas)\b/g, '2'],
  [/\btres\b/g, '3'], [/\bquatro\b/g, '4'], [/\bcinco\b/g, '5'],
  [/\b(seis|meia)\b/g, '6'], [/\bsete\b/g, '7'], [/\boito\b/g, '8'], [/\bnove\b/g, '9'],
];

const REGRAS = [
  /([0-9][^0-9a-z]{0,3}){9,}/,
  /[a-z0-9._-]+\s*(@|\(at\)|\barroba\b)\s*[a-z0-9-]+/,
  /(\bponto\s+com\b|\.com\b|\.com\.br|gmail|hotmail|outlook|yahoo)/,
  /(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|instagram|facebook|telegram|tiktok|linkedin)/,
  /\b(zap|zapzap|zapp|whats|whatsapp|whatsap|watsap|wats|wpp|uats|insta|telegram|tel|cel|celular|fone|telefone|email|e-mail)\b/,
  /(me\s+chama\s+(no|la|por)|me\s+liga|meu\s+(numero|contato|perfil)|fala\s+comigo\s+(no|por)|por\s+fora|fora\s+do\s+app)/,
];

export function temContato(texto) {
  let t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, d] of EXTENSO) t = t.replace(re, d);
  return REGRAS.some((re) => re.test(t));
}
