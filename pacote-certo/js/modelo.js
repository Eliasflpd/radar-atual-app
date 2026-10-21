// Regras do Pacote Certo, sem acesso a banco, tela ou rede.
// Mantido puro para ser testado com `node --test`.

export const LIMITE_QUANTIDADE = 200;
export const MENSAGEM_NAO_IDENTIFICADO = 'Não identificado. Preencha para continuar.';

const ABREVIACOES_LOGRADOURO = {
  r: 'rua',
  av: 'avenida',
  avn: 'avenida',
  al: 'alameda',
  tv: 'travessa',
  trav: 'travessa',
  pc: 'praca',
  estr: 'estrada',
  rod: 'rodovia',
  dr: 'doutor',
  prof: 'professor',
  sta: 'santa',
  sto: 'santo',
  jd: 'jardim',
  vl: 'vila',
  cj: 'conjunto',
};

const ABREVIACOES_COMPLEMENTO = {
  apto: 'ap',
  apt: 'ap',
  ap: 'ap',
  apart: 'ap',
  apartamento: 'ap',
  bl: 'bloco',
  bloco: 'bloco',
  casa: 'casa',
};

const colador = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function normalizarTexto(texto = '') {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trocarPrimeiraPalavra(texto, tabela) {
  const palavras = normalizarTexto(texto).split(' ').filter(Boolean);
  if (palavras.length && tabela[palavras[0]]) palavras[0] = tabela[palavras[0]];
  return palavras.join(' ');
}

export const normalizarLogradouro = (texto) => trocarPrimeiraPalavra(texto, ABREVIACOES_LOGRADOURO);
export const normalizarComplemento = (texto) => trocarPrimeiraPalavra(texto, ABREVIACOES_COMPLEMENTO);

export function normalizarNumero(numero = '', semNumero = false) {
  return semNumero ? 'sn' : normalizarTexto(numero).replace(/\s/g, '');
}

export function normalizarRastreio(rastreio = '') {
  return String(rastreio ?? '').replace(/\s/g, '').toUpperCase();
}

// Endereço só é agrupado automaticamente quando bairro, rua e número estão completos.
export function precisaRevisao(endereco) {
  return !normalizarTexto(endereco.bairro)
    || !normalizarLogradouro(endereco.logradouro)
    || !normalizarNumero(endereco.numero, endereco.semNumero);
}

export function chaveEndereco(endereco) {
  if (precisaRevisao(endereco)) return null;
  return [
    normalizarTexto(endereco.bairro),
    normalizarLogradouro(endereco.logradouro),
    normalizarNumero(endereco.numero, endereco.semNumero),
    normalizarComplemento(endereco.complemento),
  ].join('|');
}

export function compararEnderecos(a, b) {
  return colador.compare(normalizarTexto(a.bairro), normalizarTexto(b.bairro))
    || colador.compare(normalizarLogradouro(a.logradouro), normalizarLogradouro(b.logradouro))
    || (Number(Boolean(a.semNumero)) - Number(Boolean(b.semNumero)))
    || colador.compare(a.numero || '', b.numero || '')
    || colador.compare(a.complemento || '', b.complemento || '');
}

export function contarPacotes(enderecos) {
  return enderecos.reduce((total, endereco) => total + endereco.pacotes.length, 0);
}

export function resumo(enderecos) {
  const pacotes = enderecos.flatMap((endereco) => endereco.pacotes);
  const entregues = pacotes.filter((pacote) => pacote.entregue).length;
  return {
    total: pacotes.length,
    entregues,
    pendentes: pacotes.length - entregues,
    enderecos: enderecos.length,
  };
}

export function filtrarEnderecos(enderecos, filtro = 'pendentes', busca = '') {
  const termos = normalizarTexto(busca).split(' ').filter(Boolean);
  return enderecos.filter((endereco) => {
    if (filtro === 'pendentes' && !endereco.pacotes.some((pacote) => !pacote.entregue)) return false;
    if (filtro === 'entregues' && !endereco.pacotes.some((pacote) => pacote.entregue)) return false;
    const texto = normalizarTexto([
      endereco.bairro,
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      ...endereco.pacotes.flatMap((pacote) => [pacote.destinatario, pacote.rastreio]),
    ].join(' '));
    return termos.every((termo) => texto.includes(termo));
  });
}

export function agruparPorBairro(enderecos) {
  const grupos = [];
  const porBairro = new Map();
  const revisar = [];

  for (const endereco of [...enderecos].sort(compararEnderecos)) {
    if (precisaRevisao(endereco)) {
      revisar.push(endereco);
      continue;
    }
    const chave = normalizarTexto(endereco.bairro);
    if (!porBairro.has(chave)) {
      const grupo = { nome: endereco.bairro.trim(), enderecos: [] };
      porBairro.set(chave, grupo);
      grupos.push(grupo);
    }
    porBairro.get(chave).enderecos.push(endereco);
  }

  if (revisar.length) grupos.push({ nome: 'Revisar endereço', revisar: true, enderecos: revisar });
  return grupos.map((grupo) => ({ ...grupo, pacotes: contarPacotes(grupo.enderecos) }));
}

export function encontrarPacotePorRastreio(enderecos, rastreio, ignorarId = null) {
  const alvo = normalizarRastreio(rastreio);
  if (!alvo) return null;
  for (const endereco of enderecos) {
    const pacote = endereco.pacotes.find((p) => p.id !== ignorarId && normalizarRastreio(p.rastreio) === alvo);
    if (pacote) return { endereco, pacote };
  }
  return null;
}

export function validarCampos(campos, { exigirLocal = true } = {}) {
  const erros = {};
  if (exigirLocal && !String(campos.bairro ?? '').trim() && !String(campos.logradouro ?? '').trim()) {
    erros.bairro = MENSAGEM_NAO_IDENTIFICADO;
    erros.logradouro = MENSAGEM_NAO_IDENTIFICADO;
  }
  const quantidade = Number(campos.quantidade);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > LIMITE_QUANTIDADE) {
    erros.quantidade = `Informe de 1 a ${LIMITE_QUANTIDADE} pacotes.`;
  } else if (normalizarRastreio(campos.rastreio) && quantidade > 1) {
    erros.quantidade = 'Com código de rastreio, cadastre um pacote por vez.';
  }
  return erros;
}

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function criarPacotes(quantidade, { rastreio = '', destinatario = '' } = {}) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    id: novoId(),
    rastreio: indice === 0 ? normalizarRastreio(rastreio) : '',
    destinatario: String(destinatario || '').trim(),
    entregue: false,
    entregueEm: null,
  }));
}

export function plural(quantidade, singular, plural_) {
  return `${quantidade} ${quantidade === 1 ? singular : plural_}`;
}

export function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function dataHoje(data = new Date()) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function descreverLocal(endereco) {
  const rua = [endereco.logradouro, endereco.semNumero ? 's/n' : endereco.numero].filter(Boolean).join(', ');
  return [rua, endereco.complemento].filter(Boolean).join(' — ') || 'Endereço sem identificação';
}

export function textoCompartilhar(enderecos, data, { somentePendentes = false } = {}) {
  const linhas = [`ENTREGAS — ${formatarData(data)}`];
  let pacotes = 0;
  let areas = 0;

  for (const grupo of agruparPorBairro(enderecos)) {
    const itens = grupo.enderecos
      .map((endereco) => ({
        endereco,
        contados: somentePendentes ? endereco.pacotes.filter((p) => !p.entregue).length : endereco.pacotes.length,
      }))
      .filter((item) => item.contados > 0);
    if (!itens.length) continue;

    linhas.push('', grupo.nome.toUpperCase());
    for (const { endereco, contados } of itens) {
      const marca = endereco.pacotes.every((p) => p.entregue) ? '[x]' : '[ ]';
      linhas.push(`${marca} ${descreverLocal(endereco)} — ${plural(contados, 'pacote', 'pacotes')}`);
      pacotes += contados;
      areas += 1;
    }
  }

  linhas.push('', `Total: ${plural(pacotes, 'pacote', 'pacotes')} · ${plural(areas, 'endereço', 'endereços')}`);
  return linhas.join('\n');
}
