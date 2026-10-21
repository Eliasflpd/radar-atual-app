// Dados fictícios, usados só no modo demonstração (?demo=1). A lista real começa vazia.
import { novoId } from './modelo.js';

const pacote = (rastreio, destinatario, entregue = false) => {
  const momento = new Date().toISOString();
  return { id: novoId(), rastreio, destinatario, entregue, entregueEm: entregue ? momento : null };
};

export function dadosDemonstracao(data) {
  const criado = new Date().toISOString();
  const endereco = (campos, pacotes) => ({
    id: novoId(),
    data,
    bairro: '',
    logradouro: '',
    numero: '',
    semNumero: false,
    complemento: '',
    observacoes: '',
    cidade: '',
    estado: '',
    cep: '',
    fotoIds: [],
    leitura: null,
    criadoEm: criado,
    atualizadoEm: criado,
    ...campos,
    pacotes,
  });

  return [
    endereco({ bairro: 'Centro', logradouro: 'Rua das Flores', numero: '120', complemento: 'Casa A' }, [
      pacote('BR100000000001BR', 'Ana Souza'),
      pacote('', 'Carlos Lima'),
      pacote('', 'Carlos Lima', true),
    ]),
    endereco({ bairro: 'Centro', logradouro: 'Rua São José', numero: '85' }, [
      pacote('', ''),
    ]),
    endereco({ bairro: 'Centro', logradouro: 'Rua XV de Novembro', semNumero: true }, [
      pacote('BR100000000002BR', 'Mariana Alves', true),
    ]),
    endereco({ bairro: 'Boa Vista', logradouro: 'Avenida Brasil', numero: '450', complemento: 'Apto 202' }, [
      pacote('', 'Pedro Nunes'),
      pacote('', 'Pedro Nunes'),
    ]),
    endereco({ bairro: 'Boa Vista', logradouro: 'Avenida Brasil', numero: '450', complemento: 'Apto 203' }, [
      pacote('BR100000000003BR', 'Júlia Ribeiro'),
    ]),
    endereco({ bairro: 'Boa Vista', logradouro: 'Rua Pará', numero: '18' }, [
      pacote('', 'Antônio Dias', true),
    ]),
    endereco({ bairro: 'Jardim Esperança', logradouro: 'Rua das Acácias', numero: '7' }, [
      pacote('', 'Lúcia Gomes', true),
      pacote('', 'Lúcia Gomes'),
    ]),
    endereco({
      bairro: 'Jardim Esperança',
      logradouro: 'Rua Goiás',
      numero: '',
      observacoes: 'Leitura incompleta: número ilegível.',
    }, [
      pacote('BR100000000004BR', ''),
    ]),
  ];
}
