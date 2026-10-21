import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveEndereco,
  precisaRevisao,
  agruparPorBairro,
  resumo,
  filtrarEnderecos,
  encontrarPacotePorRastreio,
  validarCampos,
  criarPacotes,
  textoCompartilhar,
  MENSAGEM_NAO_IDENTIFICADO,
  LIMITE_QUANTIDADE,
} from '../js/modelo.js';

let contador = 0;

function pacote(extra = {}) {
  contador += 1;
  return { id: `p${contador}`, rastreio: '', destinatario: '', entregue: false, entregueEm: null, ...extra };
}

function pacotes(quantidade, extra = {}) {
  return Array.from({ length: quantidade }, () => pacote(extra));
}

function endereco(extra = {}) {
  contador += 1;
  return {
    id: `e${contador}`,
    data: '2026-10-21',
    bairro: 'Centro',
    logradouro: 'Rua das Flores',
    numero: '120',
    semNumero: false,
    complemento: '',
    pacotes: [pacote()],
    fotoIds: [],
    ...extra,
  };
}

describe('chaveEndereco', () => {
  test('abreviação de rua equivale ao nome completo', () => {
    assert.equal(
      chaveEndereco(endereco({ logradouro: 'R. das Flores' })),
      chaveEndereco(endereco({ logradouro: 'Rua das Flores' })),
    );
  });

  test('acentos, maiúsculas e espaços são normalizados', () => {
    const a = endereco({ bairro: 'São João', logradouro: 'Rua São José', numero: '85' });
    const b = endereco({ bairro: '  sao   JOAO ', logradouro: 'rua  SAO jose ', numero: ' 85 ' });
    assert.equal(chaveEndereco(a), chaveEndereco(b));
  });

  test('"Apto 202" equivale a "Apartamento 202"', () => {
    assert.equal(
      chaveEndereco(endereco({ complemento: 'Apto 202' })),
      chaveEndereco(endereco({ complemento: 'Apartamento 202' })),
    );
  });

  test('apartamentos diferentes ficam separados', () => {
    assert.notEqual(
      chaveEndereco(endereco({ complemento: 'Apto 202' })),
      chaveEndereco(endereco({ complemento: 'Apto 203' })),
    );
  });

  test('sem número e semNumero false => null', () => {
    assert.equal(chaveEndereco(endereco({ numero: '', semNumero: false })), null);
  });

  test('semNumero true => chave válida', () => {
    const chave = chaveEndereco(endereco({ numero: '', semNumero: true }));
    assert.equal(typeof chave, 'string');
    assert.ok(chave.length > 0);
  });
});

describe('precisaRevisao e agruparPorBairro', () => {
  test('precisaRevisao detecta bairro, rua ou número faltando', () => {
    assert.equal(precisaRevisao(endereco()), false);
    assert.equal(precisaRevisao(endereco({ bairro: '' })), true);
    assert.equal(precisaRevisao(endereco({ logradouro: '  ' })), true);
    assert.equal(precisaRevisao(endereco({ numero: '' })), true);
    assert.equal(precisaRevisao(endereco({ numero: '', semNumero: true })), false);
  });

  test('grupos em ordem alfabética, total por grupo, incompletos no fim', () => {
    const lista = [
      endereco({ bairro: 'Centro', pacotes: pacotes(2) }),
      endereco({ bairro: '', pacotes: pacotes(1) }),
      endereco({ bairro: 'Boa Vista', logradouro: 'Avenida Brasil', numero: '450', pacotes: pacotes(3) }),
      endereco({ bairro: 'Centro', logradouro: 'Rua São José', numero: '85', pacotes: pacotes(1) }),
      endereco({ bairro: 'Centro', numero: '', pacotes: pacotes(4) }),
    ];
    const grupos = agruparPorBairro(lista);
    assert.deepEqual(grupos.map((g) => g.nome), ['Boa Vista', 'Centro', 'Revisar endereço']);
    assert.deepEqual(grupos.map((g) => g.pacotes), [3, 3, 5]);
    assert.deepEqual(grupos.map((g) => g.enderecos.length), [1, 2, 2]);
    assert.equal(grupos.at(-1).revisar, true);
    assert.ok(!grupos[0].revisar);
    assert.ok(!grupos[1].revisar);
  });

  test('sem incompletos não cria grupo de revisão', () => {
    const grupos = agruparPorBairro([endereco()]);
    assert.equal(grupos.length, 1);
    assert.ok(!grupos.some((g) => g.revisar));
  });
});

describe('resumo', () => {
  test('endereço com 3 pacotes dá total 3', () => {
    const r = resumo([endereco({ pacotes: criarPacotes(3) })]);
    assert.equal(r.total, 3);
    assert.equal(r.entregues, 0);
    assert.equal(r.pendentes, 3);
    assert.equal(r.enderecos, 1);
  });

  test('entrega parcial: 1 de 3 entregue', () => {
    const lista = criarPacotes(3);
    lista[0].entregue = true;
    const r = resumo([endereco({ pacotes: lista })]);
    assert.equal(r.total, 3);
    assert.equal(r.entregues, 1);
    assert.equal(r.pendentes, 2);
  });
});

describe('filtrarEnderecos', () => {
  const pendente = endereco({
    bairro: 'Boa Vista', logradouro: 'Avenida Brasil', numero: '450',
    pacotes: [pacote({ destinatario: 'João Conceição' })],
  });
  const entregue = endereco({
    bairro: 'Centro', logradouro: 'Rua São José', numero: '85',
    pacotes: [pacote({ entregue: true, destinatario: 'Maria' })],
  });
  const parcial = endereco({
    bairro: 'Jardim Paraíso', logradouro: 'Rua das Flores', numero: '10',
    pacotes: [pacote({ entregue: true }), pacote()],
  });
  const lista = [pendente, entregue, parcial];

  test('pendentes', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'pendentes'), [pendente, parcial]);
  });

  test('entregues', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'entregues'), [entregue, parcial]);
  });

  test('todas', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'todas'), lista);
  });

  test('busca por rua sem acento', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'todas', 'sao jose'), [entregue]);
  });

  test('busca por bairro sem acento', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'todas', 'paraiso'), [parcial]);
  });

  test('busca por destinatário sem acento', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'todas', 'conceicao'), [pendente]);
  });

  test('busca combina com filtro', () => {
    assert.deepEqual(filtrarEnderecos(lista, 'pendentes', 'sao jose'), []);
  });
});

describe('encontrarPacotePorRastreio', () => {
  const alvo = pacote({ rastreio: 'BR123456789BR' });
  const end = endereco({ pacotes: [pacote(), alvo] });
  const lista = [endereco(), end];

  test('acha ignorando espaços e minúsculas', () => {
    const achado = encontrarPacotePorRastreio(lista, ' br 123 456 789 br ');
    assert.ok(achado);
    assert.equal(achado.pacote, alvo);
    assert.equal(achado.endereco, end);
  });

  test('respeita ignorarId', () => {
    assert.equal(encontrarPacotePorRastreio(lista, 'BR123456789BR', alvo.id), null);
  });

  test('rastreio vazio não acha nada', () => {
    assert.equal(encontrarPacotePorRastreio(lista, '   '), null);
  });
});

describe('validarCampos', () => {
  test('bairro e rua vazios => erros com mensagem padrão', () => {
    const erros = validarCampos({ bairro: '', logradouro: ' ', quantidade: 1 });
    assert.equal(erros.bairro, MENSAGEM_NAO_IDENTIFICADO);
    assert.equal(erros.logradouro, MENSAGEM_NAO_IDENTIFICADO);
  });

  test('exigirLocal false não exige bairro nem rua', () => {
    const erros = validarCampos({ bairro: '', logradouro: '', quantidade: 1 }, { exigirLocal: false });
    assert.deepEqual(erros, {});
  });

  test('campos válidos não geram erro', () => {
    assert.deepEqual(validarCampos({ bairro: 'Centro', logradouro: 'Rua A', quantidade: 3 }), {});
  });

  for (const quantidade of [0, LIMITE_QUANTIDADE + 1, 'abc']) {
    test(`quantidade ${JSON.stringify(quantidade)} => erro`, () => {
      const erros = validarCampos({ bairro: 'Centro', logradouro: 'Rua A', quantidade });
      assert.ok(erros.quantidade);
    });
  }

  test('limite 201 é rejeitado e 200 aceito', () => {
    assert.ok(validarCampos({ bairro: 'C', logradouro: 'R', quantidade: 201 }).quantidade);
    assert.equal(validarCampos({ bairro: 'C', logradouro: 'R', quantidade: 200 }).quantidade, undefined);
  });

  test('rastreio + quantidade 2 => erro', () => {
    const erros = validarCampos({ bairro: 'Centro', logradouro: 'Rua A', quantidade: 2, rastreio: 'BR1' });
    assert.ok(erros.quantidade);
  });

  test('rastreio + quantidade 1 => ok', () => {
    assert.deepEqual(validarCampos({ bairro: 'Centro', logradouro: 'Rua A', quantidade: 1, rastreio: 'BR1' }), {});
  });
});

describe('criarPacotes', () => {
  test('rastreio só no primeiro, em maiúsculas e sem espaços', () => {
    const lista = criarPacotes(3, { rastreio: ' br 123 ', destinatario: '  Ana ' });
    assert.equal(lista.length, 3);
    assert.equal(lista[0].rastreio, 'BR123');
    assert.equal(lista[1].rastreio, '');
    assert.equal(lista[2].rastreio, '');
    assert.ok(lista.every((p) => p.destinatario === 'Ana' && p.entregue === false && p.entregueEm === null));
    assert.equal(new Set(lista.map((p) => p.id)).size, 3);
  });
});

describe('textoCompartilhar', () => {
  function base() {
    return [
      endereco({ bairro: 'Centro', logradouro: 'Rua São José', numero: '85', pacotes: pacotes(1) }),
      endereco({ bairro: 'Boa Vista', logradouro: 'Avenida Brasil', numero: '450', complemento: 'Apto 202', pacotes: pacotes(2) }),
      endereco({ bairro: 'Centro', logradouro: 'Rua das Flores', numero: '120', complemento: 'Casa A', pacotes: pacotes(3) }),
    ];
  }

  test('texto completo exato', () => {
    const esperado = 'ENTREGAS — 21/10/2026\n\nBOA VISTA\n[ ] Avenida Brasil, 450 — Apto 202 — 2 pacotes\n\n'
      + 'CENTRO\n[ ] Rua das Flores, 120 — Casa A — 3 pacotes\n[ ] Rua São José, 85 — 1 pacote\n\n'
      + 'Total: 6 pacotes · 3 endereços';
    assert.equal(textoCompartilhar(base(), '2026-10-21'), esperado);
  });

  test('somentePendentes exclui endereço todo entregue; lista completa marca [x]', () => {
    const lista = base();
    lista[0].pacotes.forEach((p) => { p.entregue = true; }); // Rua São José entregue
    const pendentes = textoCompartilhar(lista, '2026-10-21', { somentePendentes: true });
    assert.ok(!pendentes.includes('Rua São José'));
    assert.ok(!pendentes.includes('[x]'));
    assert.ok(pendentes.endsWith('Total: 5 pacotes · 2 endereços'));

    const completa = textoCompartilhar(lista, '2026-10-21');
    assert.ok(completa.includes('[x] Rua São José, 85 — 1 pacote'));
    assert.ok(completa.endsWith('Total: 6 pacotes · 3 endereços'));
  });

  test('somentePendentes conta só pacotes pendentes de entrega parcial', () => {
    const lista = base();
    lista[2].pacotes[0].entregue = true; // Rua das Flores: 1 de 3 entregue
    const texto = textoCompartilhar(lista, '2026-10-21', { somentePendentes: true });
    assert.ok(texto.includes('[ ] Rua das Flores, 120 — Casa A — 2 pacotes'));
    assert.ok(texto.endsWith('Total: 5 pacotes · 3 endereços'));
  });
});
