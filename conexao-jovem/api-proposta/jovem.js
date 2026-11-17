// ═══════════════════════════════════════════════════════════════════════════════
// CONEXÃO JOVEM — a função proposta na Fase 2 virou o arquivo de verdade:
//   api/_lib/jovem.js   (registrado como fn=jovem em api/dados.js, Módulo 1)
// Este arquivo só reaponta para lá, para não existirem duas cópias divergentes.
// Os testes (conexao-jovem/testes/rls.test.js) usam o arquivo de api/_lib/.
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
module.exports = require('../../api/_lib/jovem.js');
