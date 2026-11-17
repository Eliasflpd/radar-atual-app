// ═══════════════════════════════════════════════════════════════════════════════
// Calcula o código de vínculo (HMAC) de um WhatsApp — o mesmo que api/_lib/jovem.js usa.
// Só é preciso para o caminho B de primeiro-admin.md (cadastrar o primeiro administrador
// ANTES de ele abrir o app). Roda no SEU computador; nada vai para a internet.
//
//   CJ_VINCULO_SEGREDO='(o mesmo valor da Vercel)' node conexao-jovem/supabase/vinculo-whatsapp.js
//   (o número é pedido pelo teclado, para não ficar no histórico do terminal)
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
const path = require('path');
const { hashVinculo, telefoneCanonico } = require(path.resolve(__dirname, '../../api/_lib/jovem.js'));
if ((process.env.CJ_VINCULO_SEGREDO || '').length < 32) {
  console.error('Defina CJ_VINCULO_SEGREDO (o MESMO valor configurado na Vercel, 32+ caracteres).');
  process.exit(2);
}
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
rl.question('WhatsApp com DDD (só para calcular, não é guardado): ', (fone) => {
  rl.close();
  const d = telefoneCanonico(fone);
  if (d.length < 10 || d.length > 15) { console.error('Número inválido.'); process.exit(1); }
  console.log('\nCódigo de vínculo (cole no SQL do primeiro-admin.md):\n' + hashVinculo(d));
});
