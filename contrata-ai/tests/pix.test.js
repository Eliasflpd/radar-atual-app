import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codigoPix, crc16, normalizarChave, tipoChave } from '../public/js/pix.js';

test('CRC16 igual ao exemplo do manual do Banco Central', () => {
  const sem = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(crc16(sem), '1D3D');
});

test('código Pix com valor, nome, cidade e identificador', () => {
  const c = codigoPix({ chave: 'dono@99pay.com', nome: 'José da Conceição', cidade: 'Barreirinhas', valor: 180, txid: 'CA-1a2b3c' });
  assert.match(c, /^000201/);
  assert.ok(c.includes('0014br.gov.bcb.pix0114dono@99pay.com'));
  assert.ok(c.includes('5406180.00'));
  assert.ok(c.includes('5917JOSE DA CONCEICAO'));
  assert.ok(c.includes('6012BARREIRINHAS'));
  assert.ok(c.includes('62120508CA1a2b3c'));
  assert.equal(c.slice(-4), crc16(c.slice(0, -4)));
});

test('chaves no formato certo', () => {
  assert.equal(normalizarChave('(98) 99111-2233'), '+5598991112233');
  assert.equal(normalizarChave('529.982.247-25'), '52998224725');
  assert.equal(normalizarChave('Dono@99Pay.com'), 'dono@99pay.com');
  assert.equal(tipoChave('(98) 99111-2233'), 'Celular');
  assert.equal(tipoChave('529.982.247-25'), 'CPF');
});
