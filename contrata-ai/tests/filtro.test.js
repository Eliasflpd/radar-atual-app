import { test } from 'node:test';
import assert from 'node:assert/strict';
import { temContato } from '../public/js/filtro.js';

const BLOQUEAR = [
  'meu numero é 11 98765-4321', '(11)987654321', '9 8 7 6 5 4 3 2 1',
  'nove nove oito sete seis cinco quatro tres dois', 'me chama no zap', 'chama no whats',
  'manda no wpp', 'joao@gmail.com', 'joao arroba gmail ponto com', 'wa.me/5511999999999',
  'segue meu insta @joaopedreiro', 'https://instagram.com/joao', 'me liga amanhã', 'vamos fechar por fora',
];
const LIBERAR = [
  'Bom dia! Faço reboco e assentamento de piso.', 'O valor fica R$ 1.500,00', 'Posso ir na terça às 14h',
  'São 20 m² de parede', 'faço instalação elétrica completa', 'Aceito pix ou cartão pelo app',
  'Orçamento: R$ 12.000,00 com material', 'CEP 01310-100',
];

for (const t of BLOQUEAR) test(`bloqueia: ${t}`, () => assert.equal(temContato(t), true));
for (const t of LIBERAR) test(`libera: ${t}`, () => assert.equal(temContato(t), false));
