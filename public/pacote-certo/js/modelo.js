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

// Endereço só é agrupado automaticamente quando rua e número estão completos.
// O bairro ajuda a separar ruas de mesmo nome, mas muitas etiquetas não o trazem legível.
export function precisaRevisao(endereco) {
  return !normalizarLogradouro(endereco.logradouro)
    || !normalizarNumero(endereco.numero, endereco.semNumero);
}

const TIPOS_LOGRADOURO = new Set([
  'rua', 'r', 'avenida', 'av', 'avn', 'travessa', 'tv', 'trav', 'tr', 'alameda', 'al', 'estrada', 'estr',
  'rodovia', 'rod', 'praca', 'pc', 'pca', 'largo', 'lg', 'beco', 'viela', 'passagem', 'servidao', 'ladeira',
]);

// Nome da rua sem o tipo (Rua, TV, Av...), sem acentos e sem espaços: "TV Orfileno Leda" -> "orfilenoleda".
export function nomeDaRua(logradouro = '') {
  const palavras = normalizarTexto(logradouro).split(' ').filter(Boolean);
  while (palavras.length > 1 && TIPOS_LOGRADOURO.has(palavras[0])) palavras.shift();
  return palavras.join('');
}

function distancia(a, b) {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// A leitura da foto erra letras ("Orfleno", "ofi eno") e o tipo da via (TV x Rua).
// Nomes curtos precisam ser iguais, para não juntar "Bahia" com "Baia".
export function ruasParecidas(a, b) {
  const na = nomeDaRua(a);
  const nb = nomeDaRua(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const maior = Math.max(na.length, nb.length);
  if (maior < 6) return false;
  return distancia(na, nb) <= Math.max(1, Math.floor(maior * 0.2));
}

const bairrosCompativeis = (a, b) => !normalizarTexto(a) || !normalizarTexto(b) || normalizarTexto(a) === normalizarTexto(b);

// Usa a grafia da rua (e o bairro, se faltar) de um endereço do dia que seja da mesma rua.
export function canonizarRua(campos, enderecosDoDia) {
  if (!normalizarLogradouro(campos.logradouro)) return campos;
  const igual = enderecosDoDia.find((e) => ruasParecidas(e.logradouro, campos.logradouro) && bairrosCompativeis(e.bairro, campos.bairro));
  if (!igual) return campos;
  return { ...campos, logradouro: igual.logradouro, bairro: String(campos.bairro ?? '').trim() || igual.bairro || '' };
}

export function chaveEndereco(endereco) {
  if (precisaRevisao(endereco)) return null;
  return [
    normalizarTexto(endereco.bairro),
    nomeDaRua(endereco.logradouro),
    normalizarNumero(endereco.numero, endereco.semNumero),
    normalizarComplemento(endereco.complemento),
  ].join('|');
}

function compararNumeros(a, b) {
  return (Number(Boolean(a.semNumero)) - Number(Boolean(b.semNumero)))
    || colador.compare(a.numero || '', b.numero || '')
    || colador.compare(a.complemento || '', b.complemento || '');
}

export function destinatariosDe(endereco) {
  return [...new Set(endereco.pacotes.map((p) => String(p.destinatario ?? '').trim()).filter(Boolean))];
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
  const semBairro = [];

  for (const endereco of [...enderecos].sort(compararEnderecos)) {
    if (precisaRevisao(endereco)) {
      revisar.push(endereco);
      continue;
    }
    if (!normalizarTexto(endereco.bairro)) {
      semBairro.push(endereco);
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

  if (semBairro.length) grupos.push({ nome: 'Sem bairro', enderecos: semBairro });
  if (revisar.length) grupos.push({ nome: 'Revisar endereço', revisar: true, enderecos: revisar });
  return grupos.map((grupo) => ({ ...grupo, pacotes: contarPacotes(grupo.enderecos), ruas: agruparPorRua(grupo.enderecos) }));
}

// Dentro de um bairro, cada rua aparece uma vez só, com os números embaixo.
export function agruparPorRua(enderecos) {
  const ruas = [];
  const porRua = new Map();
  for (const endereco of enderecos) {
    const nome = String(endereco.logradouro ?? '').trim();
    let rua = nome ? ruas.find((r) => r.nome && ruasParecidas(r.nome, nome)) : porRua.get('');
    if (!rua) {
      rua = { nome, enderecos: [] };
      if (!nome) porRua.set('', rua);
      ruas.push(rua);
    }
    rua.enderecos.push(endereco);
  }
  return ruas.map((rua) => ({
    ...rua,
    nome: rua.nome || 'Endereço sem rua',
    enderecos: [...rua.enderecos].sort(compararNumeros),
    pacotes: contarPacotes(rua.enderecos),
  }));
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

export function descreverNumero(endereco) {
  const numero = endereco.semNumero ? 's/n' : (String(endereco.numero ?? '').trim() || 'sem número informado');
  return [numero, endereco.complemento].filter(Boolean).join(' — ');
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
    for (const rua of agruparPorRua(itens.map((item) => item.endereco))) {
      linhas.push(rua.nome);
      for (const endereco of rua.enderecos) {
        const { contados } = itens.find((item) => item.endereco === endereco);
        const marca = endereco.pacotes.every((p) => p.entregue) ? '[x]' : '[ ]';
        const nomes = destinatariosDe(endereco).join(', ');
        linhas.push(`${marca} ${descreverNumero(endereco)}${nomes ? ` — ${nomes}` : ''} — ${plural(contados, 'pacote', 'pacotes')}`);
        pacotes += contados;
        areas += 1;
      }
    }
  }

  linhas.push('', `Total: ${plural(pacotes, 'pacote', 'pacotes')} · ${plural(areas, 'endereço', 'endereços')}`);
  return linhas.join('\n');
}
