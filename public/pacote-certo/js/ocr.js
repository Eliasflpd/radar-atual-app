// Integração de leitura de etiquetas. Fica isolada aqui para trocar o serviço sem mexer nas telas.
//
// Contrato esperado do serviço (POST, JSON):
//   envio:   { "imagem": "data:image/jpeg;base64,...", "cidade": "Tuntum - MA", "ruasConhecidas": ["Rua X - Bairro", ...], "bairrosConhecidos": ["Centro", ...] }
//   resposta: { "dados": { bairro, logradouro, numero, semNumero, complemento, destinatario,
//               rastreio, cidade, estado, cep, observacoes }, "incertos": ["numero", ...] }
//
// Nenhuma chave secreta fica neste arquivo. Se o serviço exigir chave, ela fica no servidor.
import { OCR_ENDPOINT } from '../config.js';

export class ErroLeitura extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.codigo = codigo;
  }
}

export const leituraAutomaticaConfigurada = () => Boolean(OCR_ENDPOINT);

export async function lerEtiqueta(blob, { cidade = '', ruasConhecidas = [], bairrosConhecidos = [] } = {}) {
  if (!OCR_ENDPOINT) throw new ErroLeitura('nao-configurado', 'Leitura automática não configurada.');
  if (!navigator.onLine) throw new ErroLeitura('offline', 'Sem conexão.');

  const imagem = await lerComoDataUrl(blob);
  let resposta;
  try {
    resposta = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem, cidade, ruasConhecidas: ruasConhecidas.slice(0, 300), bairrosConhecidos: bairrosConhecidos.slice(0, 150) }),
    });
  } catch {
    throw new ErroLeitura('offline', 'Sem conexão com o serviço de leitura.');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    if (corpo.erro === 'nao-configurado') throw new ErroLeitura('nao-configurado', 'Serviço de leitura sem chave.');
    throw new ErroLeitura('servico', `Serviço de leitura respondeu ${resposta.status}.`);
  }

  const json = await resposta.json();
  if (!json || typeof json.dados !== 'object' || json.dados === null) {
    throw new ErroLeitura('servico', 'Resposta do serviço sem dados.');
  }
  return {
    dados: limparDados(json.dados),
    incertos: Array.isArray(json.incertos) ? json.incertos.filter((campo) => typeof campo === 'string') : [],
  };
}

function limparDados(dados) {
  const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
  return {
    bairro: texto(dados.bairro),
    logradouro: texto(dados.logradouro),
    numero: texto(dados.numero),
    semNumero: dados.semNumero === true,
    complemento: texto(dados.complemento),
    destinatario: texto(dados.destinatario),
    rastreio: texto(dados.rastreio),
    cidade: texto(dados.cidade),
    estado: texto(dados.estado),
    cep: texto(dados.cep),
    observacoes: texto(dados.observacoes),
  };
}

function lerComoDataUrl(blob) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result);
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}
