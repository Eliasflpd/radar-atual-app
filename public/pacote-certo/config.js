// Endereço do serviço que lê as etiquetas (ver js/ocr.js para o contrato).
// Deixe vazio para usar só o cadastro manual, que funciona sem internet.
// Nunca coloque chaves secretas aqui: elas ficam no servidor que recebe este endereço.
// 'api/ler-etiqueta' é a função em api/ler-etiqueta.js, publicada junto com o app na Vercel.
export const OCR_ENDPOINT = 'api/ler-etiqueta';
