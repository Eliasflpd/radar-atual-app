import {
  LIMITE_QUANTIDADE,
  agruparPorBairro,
  chaveEndereco,
  criarPacotes,
  dataHoje,
  encontrarPacotePorRastreio,
  filtrarEnderecos,
  normalizarRastreio,
  novoId,
  plural,
  precisaRevisao,
  resumo,
  textoCompartilhar,
  validarCampos,
} from './modelo.js';
import { LOJAS, criarRepositorio } from './db.js';
import { lerEtiqueta, leituraAutomaticaConfigurada } from './ocr.js';
import { prepararFoto } from './fotos.js';
import { icone } from './icones.js';
import { dadosDemonstracao } from './demo.js';

// O modo demonstração usa outro banco, para nunca misturar dados fictícios com a lista real.
const DEMO = new URLSearchParams(location.search).has('demo');
const repo = criarRepositorio(DEMO ? 'pacote-certo-demo' : 'pacote-certo');

const app = document.getElementById('app');
const avisos = document.getElementById('avisos');
const dialogo = document.getElementById('dialogo');

const estado = {
  data: dataHoje(),
  filtro: 'pendentes',
  busca: '',
  dia: [],
  ultimoBairro: '',
  rascunho: null,
  desfazer: null,
  processando: new Set(),
  miniaturas: new Map(),
  urls: [],
};

// ---------- utilidades ----------

const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const agora = () => new Date().toISOString();
const clonar = (valor) => JSON.parse(JSON.stringify(valor));
const pacotesTexto = (n) => plural(n, 'pacote', 'pacotes');

function rotaAtual() {
  const [caminho, query = ''] = location.hash.slice(1).split('?');
  return { partes: caminho.split('/').filter(Boolean), query: new URLSearchParams(query) };
}

function dataLonga(iso, comAno = false) {
  const texto = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(comAno ? { year: 'numeric' } : {}),
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const linhaRua = (e) => [e.logradouro || 'Endereço sem rua', e.semNumero ? 'sem número' : e.numero]
  .filter(Boolean)
  .join(', ');

const selo = (tipo, nome, texto) => `<span class="selo selo-${tipo}">${nome ? icone(nome) : ''}${esc(texto)}</span>`;

const aviso = (tipo, nome, conteudo) => `
  <div class="aviso-bloco ${tipo}" role="${tipo === 'erro' ? 'alert' : 'status'}">
    ${icone(nome)}<div class="aviso-corpo">${conteudo}</div>
  </div>`;

function urlTemporaria(blob) {
  const url = URL.createObjectURL(blob);
  estado.urls.push(url);
  return url;
}

// Miniaturas da leitura ficam em cache: a tela de progresso é redesenhada a cada foto lida.
async function miniatura(fotoId) {
  if (!fotoId) return null;
  if (!estado.miniaturas.has(fotoId)) {
    const imagem = await repo.obter('imagens', fotoId);
    estado.miniaturas.set(fotoId, imagem ? URL.createObjectURL(imagem.blob) : null);
  }
  return estado.miniaturas.get(fotoId);
}

let temporizadorAviso = null;

function avisar(texto, acao = null) {
  let botao = '';
  if (acao?.href) botao = `<a class="aviso-acao" href="${acao.href}">${esc(acao.rotulo)}</a>`;
  else if (acao) botao = `<button class="aviso-acao" data-acao="${acao.id}">${esc(acao.rotulo)}</button>`;
  avisos.innerHTML = `<div class="aviso" role="status"><span>${esc(texto)}</span>${botao}</div>`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { avisos.innerHTML = ''; }, 6000);
}

function abrirDialogo(html) {
  return new Promise((resolver) => {
    dialogo.innerHTML = html;
    dialogo.addEventListener('close', () => {
      const form = dialogo.querySelector('form');
      const dados = form ? Object.fromEntries(new FormData(form)) : {};
      const valor = dialogo.returnValue;
      dialogo.innerHTML = '';
      dialogo.returnValue = '';
      resolver({ valor, dados });
    }, { once: true });
    dialogo.showModal();
  });
}

async function confirmar({ titulo, texto, rotulo, perigo = false }) {
  const { valor } = await abrirDialogo(`
    <form method="dialog" class="dialogo-corpo">
      <h2>${esc(titulo)}</h2>
      <p class="secundario">${esc(texto)}</p>
      <div class="acoes-dialogo">
        <button class="botao botao-secundario" value="cancelar">Cancelar</button>
        <button class="botao ${perigo ? 'botao-perigo-cheio' : 'botao-principal'}" value="ok">${esc(rotulo)}</button>
      </div>
    </form>`);
  return valor === 'ok';
}

// ---------- renderização ----------

const TELAS = {
  entregas: telaEntregas,
  adicionar: telaAdicionar,
  historico: telaHistorico,
  endereco: telaDetalhe,
  novo: telaFormulario,
  lote: telaLote,
};

let versaoRender = 0;
let ultimoCaminho = '';

async function renderizar() {
  const minhaVersao = ++versaoRender;
  const { partes, query } = rotaAtual();
  const tela = TELAS[partes[0]] ? partes[0] : 'entregas';
  if (tela !== 'novo') estado.rascunho = null;

  // As imagens da tela anterior só são liberadas depois que a nova tela as substitui.
  const urlsAnteriores = estado.urls;
  estado.urls = [];
  const html = await TELAS[tela](partes[1], query);
  if (minhaVersao !== versaoRender) return;

  app.innerHTML = html;
  urlsAnteriores.forEach((url) => URL.revokeObjectURL(url));

  const caminho = location.hash.split('?')[0];
  if (caminho !== ultimoCaminho) {
    window.scrollTo(0, 0);
    ultimoCaminho = caminho;
  }
}

function renderizarSeLote(loteId) {
  const { partes } = rotaAtual();
  if (partes[0] === 'lote' && partes[1] === loteId) renderizar();
}

const bannerDemo = () => (DEMO
  ? '<p class="aviso-demo">Modo demonstração: dados fictícios, separados da sua lista. <a class="link" href="./">Abrir minha lista</a></p>'
  : '');

function navegacao(ativa) {
  const itens = [
    ['entregas', '#/entregas', 'list', 'Entregas'],
    ['adicionar', '#/adicionar', 'plus', 'Adicionar'],
    ['historico', '#/historico', 'history', 'Histórico'],
  ];
  return `<nav class="nav-inferior" aria-label="Navegação principal">${itens.map(([id, href, nome, rotulo]) => `
    <a class="nav-item ${ativa === id ? 'ativo' : ''}" href="${href}" ${ativa === id ? 'aria-current="page"' : ''}>
      ${icone(nome)}<span>${rotulo}</span>
    </a>`).join('')}</nav>`;
}

function telaNaoEncontrada(texto = 'Não encontramos este item.') {
  return `
    <main class="tela">
      <div class="vazio">
        ${icone('info')}
        <p>${esc(texto)}</p>
        <a class="botao botao-principal" href="#/entregas">Voltar para entregas</a>
      </div>
    </main>`;
}

// ---------- tela: entregas do dia ----------

async function telaEntregas() {
  const dia = (await repo.listar('enderecos')).filter((e) => e.data === estado.data);
  estado.dia = dia;
  const r = resumo(dia);
  const estatistica = (n, rotulo) => `<div class="estatistica"><strong>${n}</strong><span>${rotulo}</span></div>`;
  const filtro = (valor, rotulo) => `
    <button class="filtro" data-acao="filtro" data-valor="${valor}" aria-pressed="${estado.filtro === valor}">${rotulo}</button>`;

  return `
    <main class="tela">
      ${bannerDemo()}
      <header class="cabecalho">
        <div class="cabecalho-texto">
          <h1>Minhas entregas</h1>
          <label class="data-trocar">
            ${icone('calendar')}
            <span>${esc(dataLonga(estado.data))}</span>
            <span class="link">Trocar dia</span>
            <input type="date" class="seletor-sobreposto" value="${estado.data}" data-mudar="data" aria-label="Escolher o dia das entregas">
          </label>
          ${estado.data === dataHoje() ? '' : '<button class="link" data-acao="hoje">Voltar para hoje</button>'}
        </div>
        <button class="botao-icone" data-acao="compartilhar" aria-label="Compartilhar lista">${icone('share')}</button>
      </header>

      <section class="resumo" aria-label="Resumo do dia">
        ${estatistica(r.total, 'Total de pacotes')}
        ${estatistica(r.pendentes, 'Pendentes')}
        ${estatistica(r.entregues, 'Entregues')}
      </section>

      <button class="botao botao-principal" data-acao="escanear">${icone('camera')}Escanear etiqueta</button>
      <div class="duas-colunas">
        <button class="botao botao-secundario" data-acao="galeria">${icone('image')}Importar fotos</button>
        <a class="botao botao-secundario" href="#/novo">${icone('pencil')}Adicionar manualmente</a>
      </div>

      <label class="busca">
        ${icone('search')}
        <span class="sr">Buscar rua, bairro ou destinatário</span>
        <input class="campo" type="search" id="busca" placeholder="Buscar rua, bairro ou destinatário"
          value="${esc(estado.busca)}" autocomplete="off" enterkeyhint="search">
      </label>

      <div class="filtros" role="group" aria-label="Filtrar entregas">
        ${filtro('pendentes', 'Pendentes')}${filtro('todas', 'Todas')}${filtro('entregues', 'Entregues')}
      </div>

      <div id="lista">${listaHtml(dia)}</div>
      ${navegacao('entregas')}
    </main>`;
}

function listaHtml(dia) {
  if (!dia.length) {
    return `
      <section class="vazio">
        ${icone('package')}
        <h2>Vamos organizar suas entregas?</h2>
        <p>Fotografe uma etiqueta, importe fotos ou adicione um endereço.</p>
        <button class="botao botao-principal" data-acao="escanear">${icone('camera')}Escanear primeira etiqueta</button>
        <a class="link" href="#/novo">Adicionar manualmente</a>
      </section>`;
  }

  const lista = filtrarEnderecos(dia, estado.filtro, estado.busca);
  if (!lista.length) {
    let texto = 'Nenhuma entrega concluída neste dia.';
    if (estado.busca) texto = 'Nenhum endereço encontrado para esta busca.';
    else if (estado.filtro === 'pendentes') texto = 'Tudo entregue. Nenhum pacote pendente neste dia.';
    return `<p class="vazio-simples">${texto}</p>`;
  }

  return agruparPorBairro(lista).map((grupo) => `
    <section class="grupo">
      <div class="grupo-cabecalho">
        <h2>${esc(grupo.nome)}</h2>
        <span class="selo-neutro">${pacotesTexto(grupo.pacotes)}</span>
      </div>
      ${grupo.enderecos.map(cartaoEndereco).join('')}
    </section>`).join('');
}

function cartaoEndereco(e) {
  const total = e.pacotes.length;
  const entregues = e.pacotes.filter((p) => p.entregue).length;
  const pendentes = total - entregues;
  const destinatarios = new Set(e.pacotes.map((p) => (p.destinatario || '').trim()).filter(Boolean));
  const local = [e.complemento, e.bairro].filter(Boolean).join(' · ');

  const status = [];
  if (precisaRevisao(e)) status.push(selo('atencao', 'alert', 'Revisar endereço'));
  if (!pendentes) status.push(selo('sucesso', 'check', 'Entregue'));
  else if (entregues) status.push(`<span class="texto-status">${entregues} de ${total} entregues</span>`);

  return `
    <article class="cartao endereco ${pendentes ? '' : 'concluido'}">
      <div class="endereco-topo">
        <div class="endereco-texto">
          <h3>${esc(linhaRua(e))}</h3>
          ${local ? `<p class="secundario">${esc(local)}</p>` : ''}
          ${destinatarios.size ? `<p class="secundario">${plural(destinatarios.size, 'destinatário', 'destinatários')}</p>` : ''}
        </div>
        <span class="selo">${pacotesTexto(total)}</span>
      </div>
      ${status.length ? `<div class="linha-status">${status.join('')}</div>` : ''}
      <div class="acoes-cartao ${pendentes ? '' : 'solitario'}">
        ${pendentes ? `<button class="botao botao-secundario" data-acao="entregar-todos" data-id="${e.id}">${icone('check')}Marcar como entregue</button>` : ''}
        <a class="botao botao-secundario" href="#/endereco/${e.id}">Detalhes</a>
      </div>
    </article>`;
}

// ---------- tela: adicionar ----------

async function lotesAbertos() {
  const [lotes, itens] = await Promise.all([repo.listar('lotes'), repo.listar('itens')]);
  return lotes
    .map((lote) => ({ ...lote, itens: itens.filter((i) => i.loteId === lote.id) }))
    .filter((lote) => lote.itens.some((i) => i.status !== 'salvo'))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

async function telaAdicionar() {
  const lotes = await lotesAbertos();
  const linhaLote = (lote) => {
    const abertos = lote.itens.filter((i) => i.status !== 'salvo').length;
    return `
      <li><a class="item-lote" href="#/lote/${lote.id}">
        <span class="miniatura">${icone('image')}</span>
        <span class="item-lote-texto">
          <strong>Leitura de ${plural(lote.itens.length, 'foto', 'fotos')}</strong>
          <span class="secundario">${abertos} para conferir ou salvar</span>
        </span>
        ${icone('chevronRight')}
      </a></li>`;
  };

  return `
    <main class="tela">
      ${bannerDemo()}
      <header class="cabecalho-texto">
        <h1>Adicionar</h1>
        <p class="secundario">Entregas de ${esc(dataLonga(estado.data).toLowerCase())}</p>
      </header>
      <div class="opcoes">
        <button class="opcao" data-acao="escanear">${icone('camera')}
          <span class="opcao-texto"><strong>Fotografar etiqueta</strong><small>Abre a câmera do celular</small></span>
        </button>
        <button class="opcao" data-acao="galeria">${icone('image')}
          <span class="opcao-texto"><strong>Importar da galeria</strong><small>Uma ou várias fotos de uma vez</small></span>
        </button>
        <a class="opcao" href="#/novo">${icone('pencil')}
          <span class="opcao-texto"><strong>Preencher manualmente</strong><small>Digite o endereço e a quantidade</small></span>
        </a>
      </div>
      ${lotes.length ? `
        <section class="grupo">
          <h2>Leituras em andamento</h2>
          <ul class="lista-simples">${lotes.map(linhaLote).join('')}</ul>
        </section>` : ''}
      <p class="nota">${icone('info')}<span>${leituraAutomaticaConfigurada()
        ? 'A leitura automática precisa de internet. A foto é enviada ao serviço de leitura configurado, e você sempre confere os dados antes de salvar.'
        : 'A leitura automática ainda não está ativa neste aplicativo. As fotos ficam guardadas e você preenche os dados. O cadastro manual funciona sem internet.'}</span></p>
      ${navegacao('adicionar')}
    </main>`;
}

// ---------- fotos e leitura ----------

async function receberFotos(input) {
  const arquivos = [...input.files];
  input.value = '';
  if (!arquivos.length) return;

  avisar(arquivos.length > 1 ? `Preparando ${arquivos.length} fotos...` : 'Preparando foto...');
  const conhecidas = new Set((await repo.listar('fotos')).map((f) => f.hash));
  const itens = [];
  let repetidas = 0;

  for (const arquivo of arquivos) {
    try {
      const { blob, hash } = await prepararFoto(arquivo);
      if (conhecidas.has(hash)) {
        repetidas += 1;
        continue;
      }
      conhecidas.add(hash);
      const fotoId = novoId();
      await repo.salvar('fotos', { id: fotoId, hash, criadoEm: agora() });
      await repo.salvar('imagens', { id: fotoId, blob });
      itens.push({ fotoId, status: 'pendente', erro: null });
    } catch {
      itens.push({ fotoId: null, status: 'falha', erro: 'imagem' });
    }
  }

  if (!itens.length) {
    avisar(repetidas > 1 ? 'Essas fotos já foram importadas e não foram contadas de novo.' : 'Esta foto já foi importada e não foi contada de novo.');
    return;
  }

  const loteId = novoId();
  await repo.salvar('lotes', { id: loteId, data: estado.data, criadoEm: agora(), repetidas });
  await repo.salvarTudo('itens', itens.map((item, ordem) => ({
    ...item, id: novoId(), loteId, ordem, dados: null, incertos: [], enderecoId: null, jaEstava: false,
  })));
  avisos.innerHTML = '';
  location.hash = `#/lote/${loteId}`;
  processarLote(loteId);
}

async function itensDoLote(loteId) {
  return (await repo.listar('itens')).filter((i) => i.loteId === loteId).sort((a, b) => a.ordem - b.ordem);
}

async function atualizarItem(itemId, mudancas) {
  const item = await repo.obter('itens', itemId);
  if (!item) return null;
  Object.assign(item, mudancas);
  await repo.salvar('itens', item);
  return item;
}

// Lê uma foto por vez e grava cada resultado na hora: uma falha não apaga as leituras anteriores.
async function processarLote(loteId) {
  if (estado.processando.has(loteId)) return;
  estado.processando.add(loteId);
  try {
    for (const item of await itensDoLote(loteId)) {
      if (item.status === 'processando') await atualizarItem(item.id, { status: 'pendente' });
    }

    for (;;) {
      const itens = await itensDoLote(loteId);
      const item = itens.find((i) => i.status === 'pendente');
      if (!item) break;

      if (!leituraAutomaticaConfigurada()) {
        for (const pendente of itens.filter((i) => i.status === 'pendente')) {
          await atualizarItem(pendente.id, { status: 'falha', erro: 'nao-configurado' });
        }
        break;
      }

      await atualizarItem(item.id, { status: 'processando' });
      renderizarSeLote(loteId);
      try {
        const imagem = await repo.obter('imagens', item.fotoId);
        if (!imagem) throw Object.assign(new Error('Foto não encontrada.'), { codigo: 'imagem' });
        const { dados, incertos } = await lerEtiqueta(imagem.blob);
        const revisar = incertos.length > 0 || precisaRevisao(dados);
        await atualizarItem(item.id, { status: revisar ? 'revisar' : 'pronto', dados, incertos, erro: null });
      } catch (erro) {
        if (erro.codigo === 'offline') {
          await atualizarItem(item.id, { status: 'pendente' });
          break;
        }
        await atualizarItem(item.id, { status: 'falha', erro: erro.codigo ?? 'servico' });
      }
      renderizarSeLote(loteId);
    }
  } finally {
    estado.processando.delete(loteId);
  }

  // Uma única foto: abre direto a conferência, sem passar pela lista.
  const itens = await itensDoLote(loteId);
  const { partes } = rotaAtual();
  const naTelaDoLote = partes[0] === 'lote' && partes[1] === loteId;
  if (naTelaDoLote && itens.length === 1 && ['pronto', 'revisar', 'falha'].includes(itens[0].status)) {
    location.hash = `#/novo?lote=${loteId}&item=${itens[0].id}`;
  } else {
    renderizarSeLote(loteId);
  }
}

async function retomarLotes() {
  const itens = await repo.listar('itens');
  const lotes = new Set(itens.filter((i) => i.status === 'pendente' || i.status === 'processando').map((i) => i.loteId));
  lotes.forEach((loteId) => processarLote(loteId));
}

async function reprocessarItem(loteId, itemId) {
  await atualizarItem(itemId, { status: 'pendente', erro: null });
  location.hash = `#/lote/${loteId}`;
  processarLote(loteId);
}

async function reprocessarLote(loteId) {
  for (const item of await itensDoLote(loteId)) {
    if (item.status === 'falha' && item.fotoId) await atualizarItem(item.id, { status: 'pendente', erro: null });
  }
  processarLote(loteId);
  renderizar();
}

function statusItem(item) {
  switch (item.status) {
    case 'pronto': return selo('sucesso', 'check', 'Pronto para salvar');
    case 'revisar': return selo('atencao', 'alert', item.erro === 'possivel-duplicado' ? 'Possível duplicado: confira' : 'Confira esta informação');
    case 'processando': return selo('cinza', 'clock', 'Lendo etiqueta...');
    case 'pendente': return selo('cinza', 'clock', navigator.onLine ? 'Na fila' : 'Aguardando internet');
    case 'salvo': return selo('sucesso', 'check', item.jaEstava ? 'Já estava na lista' : 'Salvo');
    default:
      if (item.erro === 'nao-configurado') return selo('atencao', 'pencil', 'Preencher os dados');
      return selo('erro', 'alert', item.erro === 'imagem' ? 'Imagem não abriu' : 'Não foi possível ler');
  }
}

async function telaLote(loteId) {
  const lote = loteId ? await repo.obter('lotes', loteId) : null;
  if (!lote) return telaNaoEncontrada('Esta leitura não existe mais.');

  const itens = await itensDoLote(lote.id);
  const total = itens.length;
  const ativo = estado.processando.has(lote.id);
  const conta = (status) => itens.filter((i) => i.status === status).length;
  const feitos = itens.filter((i) => i.status !== 'pendente' && i.status !== 'processando').length;
  const atual = Math.min(feitos + (ativo ? 1 : 0), total);
  const prontos = conta('pronto');
  const conferir = conta('revisar');
  const falhas = conta('falha');
  const falhasRepetiveis = itens.filter((i) => i.status === 'falha' && i.fotoId && i.erro !== 'nao-configurado').length;
  const aguardando = !ativo && conta('pendente') > 0;
  const semConfig = itens.some((i) => i.erro === 'nao-configurado');

  const linhas = await Promise.all(itens.map(async (item, indice) => {
    const url = await miniatura(item.fotoId);
    const titulo = item.dados?.logradouro ? linhaRua(item.dados) : `Etiqueta ${indice + 1}`;
    const link = item.status === 'salvo' && item.enderecoId
      ? `#/endereco/${item.enderecoId}`
      : `#/novo?lote=${lote.id}&item=${item.id}`;
    return `
      <li><a class="item-lote" href="${link}">
        ${url ? `<img class="miniatura" src="${url}" alt="">` : `<span class="miniatura">${icone('image')}</span>`}
        <span class="item-lote-texto"><strong>${esc(titulo)}</strong>${statusItem(item)}</span>
        ${icone('chevronRight')}
      </a></li>`;
  }));

  const progresso = ativo || aguardando
    ? `<div class="bloco-progresso">
        <div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${feitos}">
          <span style="width:${total ? Math.round((feitos / total) * 100) : 0}%"></span>
        </div>
        <p class="secundario">${ativo ? `Processando ${atual} de ${total} fotos` : `${feitos} de ${total} fotos lidas`}</p>
      </div>`
    : '';

  return `
    <main class="tela">
      <header class="barra-topo">
        <a class="botao-icone" href="#/adicionar" aria-label="Voltar">${icone('chevronLeft')}</a>
        <h1>Leitura das fotos</h1>
      </header>
      ${semConfig ? aviso('atencao', 'alert', '<p>A leitura automática não está configurada neste aplicativo. As fotos estão guardadas: abra cada uma e preencha os dados.</p>') : ''}
      ${aguardando && !navigator.onLine ? aviso('info', 'clock', '<p>Sem internet. As fotos ficam guardadas e serão lidas quando a conexão voltar.</p>') : ''}
      ${lote.repetidas ? aviso('info', 'info', `<p>${lote.repetidas === 1 ? '1 foto repetida não foi contada' : `${lote.repetidas} fotos repetidas não foram contadas`} de novo.</p>`) : ''}
      ${progresso}
      <div class="linha-status">
        ${selo('sucesso', 'check', `${prontos} ${prontos === 1 ? 'pronto' : 'prontos'}`)}
        ${selo('atencao', 'alert', `${conferir} para conferir`)}
        ${falhas ? selo('erro', 'alert', `${falhas} sem leitura`) : ''}
      </div>
      <ul class="lista-simples">${linhas.join('')}</ul>
      <div class="acoes-coluna">
        ${prontos ? `<button class="botao botao-principal" data-acao="salvar-prontos" data-lote="${lote.id}">${icone('check')}Salvar prontos (${prontos})</button>` : ''}
        ${falhasRepetiveis && leituraAutomaticaConfigurada() ? `<button class="botao botao-secundario" data-acao="reprocessar-lote" data-lote="${lote.id}">${icone('undo')}Tentar ler de novo as falhas</button>` : ''}
        <a class="botao botao-secundario" href="#/adicionar">Continuar depois</a>
      </div>
    </main>`;
}

async function salvarProntos(loteId) {
  const lote = await repo.obter('lotes', loteId);
  if (!lote) return;
  let salvos = 0;
  let conferir = 0;

  for (const item of (await itensDoLote(loteId)).filter((i) => i.status === 'pronto')) {
    const d = item.dados;
    const resultado = await registrarEntrega({
      data: lote.data,
      origem: 'foto',
      modo: 'lote',
      fotoId: item.fotoId,
      leitura: d,
      extras: { cidade: d.cidade, estado: d.estado, cep: d.cep },
      campos: { ...d, quantidade: 1 },
    });
    if (resultado.resultado === 'possivel-duplicado') {
      await atualizarItem(item.id, { status: 'revisar', erro: 'possivel-duplicado' });
      conferir += 1;
    } else if (resultado.resultado !== 'erro') {
      await atualizarItem(item.id, { status: 'salvo', enderecoId: resultado.enderecoId, jaEstava: resultado.resultado === 'duplicado', erro: null });
      salvos += 1;
    }
  }

  avisar(conferir
    ? `${plural(salvos, 'item salvo', 'itens salvos')}. ${plural(conferir, 'possível duplicado', 'possíveis duplicados')} para conferir.`
    : `${plural(salvos, 'item salvo', 'itens salvos')}.`);
  renderizar();
}

// ---------- tela: conferir ou cadastrar ----------

function avisoDoItem(item) {
  if (item.status === 'falha') {
    if (item.erro === 'nao-configurado') {
      return { tipo: 'atencao', texto: 'A leitura automática não está configurada neste aplicativo. Preencha os dados olhando a foto.' };
    }
    if (item.erro === 'imagem') {
      return { tipo: 'erro', texto: 'Esta imagem não pôde ser aberta. Você pode tentar outra foto ou preencher os dados.' };
    }
    return { tipo: 'erro', texto: 'Não foi possível ler esta etiqueta. Você pode tentar outra foto ou preencher os dados.', tentar: true };
  }
  if (item.erro === 'possivel-duplicado') {
    return { tipo: 'atencao', texto: 'Possível duplicado: já existe um pacote sem código de rastreio neste endereço. Confira antes de salvar.' };
  }
  return null;
}

async function montarRascunho(query) {
  const base = {
    rota: location.hash,
    modo: 'manual',
    origem: 'manual',
    titulo: 'Adicionar entrega',
    voltar: '#/adicionar',
    data: estado.data,
    enderecoId: null,
    loteId: null,
    itemId: null,
    fotoId: null,
    leitura: null,
    extras: {},
    incertos: [],
    erros: {},
    aviso: null,
    duplicado: null,
    confirmado: false,
    contexto: null,
    dicaBairro: false,
    bloqueio: null,
    campos: {
      bairro: '', logradouro: '', numero: '', semNumero: false, complemento: '',
      destinatario: '', rastreio: '', quantidade: 1, observacoes: '',
    },
  };

  if (query.has('lote')) {
    const lote = await repo.obter('lotes', query.get('lote'));
    const item = await repo.obter('itens', query.get('item') ?? '');
    if (!lote || !item || item.loteId !== lote.id) return { ...base, bloqueio: 'Esta etiqueta não está mais disponível.' };
    if (item.status === 'salvo') return { ...base, bloqueio: 'Esta etiqueta já foi salva.' };
    const d = item.dados ?? {};
    return {
      ...base,
      modo: 'lote',
      origem: 'foto',
      titulo: 'Conferir endereço',
      voltar: `#/lote/${lote.id}`,
      data: lote.data,
      loteId: lote.id,
      itemId: item.id,
      fotoId: item.fotoId,
      leitura: item.dados,
      incertos: item.incertos ?? [],
      extras: { cidade: d.cidade ?? '', estado: d.estado ?? '', cep: d.cep ?? '' },
      aviso: avisoDoItem(item),
      campos: {
        ...base.campos,
        bairro: d.bairro ?? '',
        logradouro: d.logradouro ?? '',
        numero: d.numero ?? '',
        semNumero: Boolean(d.semNumero),
        complemento: d.complemento ?? '',
        destinatario: d.destinatario ?? '',
        rastreio: d.rastreio ?? '',
        observacoes: d.observacoes ?? '',
      },
    };
  }

  const editando = query.has('editar');
  if (editando || query.has('endereco')) {
    const e = await repo.obter('enderecos', query.get(editando ? 'editar' : 'endereco') ?? '');
    if (!e) return { ...base, bloqueio: 'Este endereço não existe mais.' };
    const comum = { ...base, data: e.data, enderecoId: e.id, voltar: `#/endereco/${e.id}` };
    if (editando) {
      return {
        ...comum,
        modo: 'editar',
        titulo: 'Editar endereço',
        campos: {
          ...base.campos,
          bairro: e.bairro ?? '',
          logradouro: e.logradouro ?? '',
          numero: e.numero ?? '',
          semNumero: Boolean(e.semNumero),
          complemento: e.complemento ?? '',
          quantidade: e.pacotes.length,
          observacoes: e.observacoes ?? '',
        },
      };
    }
    return {
      ...comum,
      modo: 'pacote',
      titulo: 'Adicionar pacote',
      contexto: { bairro: e.bairro, rua: linhaRua(e), complemento: e.complemento, total: e.pacotes.length },
    };
  }

  // Cadastro manual: sugere o bairro da entrega anterior para evitar redigitar.
  return {
    ...base,
    dicaBairro: Boolean(estado.ultimoBairro),
    campos: { ...base.campos, bairro: estado.ultimoBairro },
  };
}

async function telaFormulario(_id, query) {
  if (!estado.rascunho || estado.rascunho.rota !== location.hash) {
    estado.rascunho = await montarRascunho(query);
  }
  const r = estado.rascunho;
  if (r.bloqueio) return telaNaoEncontrada(r.bloqueio);

  const previa = r.fotoId ? await miniatura(r.fotoId) : null;
  return formularioHtml(r, previa);
}

function formularioHtml(r, previa) {
  const c = r.campos;
  const erros = r.erros;
  const incertos = new Set(r.incertos);
  const mostrarEndereco = r.modo !== 'pacote';
  const mostrarPacote = r.modo !== 'editar';

  const mensagem = (nome) => {
    if (erros[nome]) return `<p class="erro-campo" id="msg-${nome}">${icone('alert')}${esc(erros[nome])}</p>`;
    if (incertos.has(nome)) return `<p class="atencao-campo" id="msg-${nome}">${icone('alert')}Confira esta informação.</p>`;
    const vazio = nome === 'numero' ? !c.numero && !c.semNumero : !c[nome];
    if (r.origem === 'foto' && vazio && ['bairro', 'logradouro', 'numero'].includes(nome)) {
      return `<p class="info-campo" id="msg-${nome}">${icone('info')}Não identificado na foto.</p>`;
    }
    return '';
  };

  const descricao = (nome) => (mensagem(nome) ? `aria-describedby="msg-${nome}"` : '');

  const campoTexto = (nome, rotulo, { opcional = false, extra = '', dica = '' } = {}) => `
    <div class="campo-grupo">
      <label class="rotulo-campo" for="f-${nome}">${rotulo}${opcional ? ' <span class="opcional">(opcional)</span>' : ''}</label>
      <input class="campo ${erros[nome] ? 'invalido' : ''}" id="f-${nome}" name="${nome}" value="${esc(c[nome])}"
        autocomplete="off" ${extra} ${descricao(nome)} ${erros[nome] ? 'aria-invalid="true"' : ''}>
      ${dica}
      ${mensagem(nome)}
    </div>`;

  let avisoHtml = '';
  if (r.duplicado) {
    avisoHtml = aviso('erro', 'alert', `
      <p>Este pacote já está na lista.</p>
      <a class="link" href="#/endereco/${r.duplicado.enderecoId}">Abrir registro existente</a>`);
  } else if (r.aviso) {
    const acoes = r.aviso.tentar && r.fotoId
      ? `<div class="acoes-aviso">
          <button type="button" class="botao botao-secundario" data-acao="reprocessar-item" data-lote="${r.loteId}" data-item="${r.itemId}">Tentar novamente</button>
          <button type="button" class="botao botao-secundario" data-acao="focar-bairro">Preencher manualmente</button>
        </div>`
      : '';
    avisoHtml = aviso(r.aviso.tipo, 'alert', `<p>${esc(r.aviso.texto)}</p>${acoes}`);
  }

  const contexto = r.contexto ? `
    <section class="cartao cartao-detalhe">
      ${r.contexto.bairro ? `<p class="bairro">${esc(r.contexto.bairro)}</p>` : ''}
      <h2>${esc(r.contexto.rua)}</h2>
      ${r.contexto.complemento ? `<p class="secundario">${esc(r.contexto.complemento)}</p>` : ''}
      <p class="secundario">Já tem ${pacotesTexto(r.contexto.total)} neste endereço.</p>
    </section>` : '';

  const dicaBairro = r.dicaBairro && c.bairro && c.bairro === estado.ultimoBairro
    ? '<p class="dica">Mesmo bairro da entrega anterior. Altere se for outro.</p>'
    : '';

  return `
    <main class="tela tela-form">
      <header class="barra-topo">
        <a class="botao-icone" href="${r.voltar}" aria-label="Voltar">${icone('chevronLeft')}</a>
        <h1>${esc(r.titulo)}</h1>
      </header>
      ${avisoHtml}
      ${previa ? `<img class="previa" src="${previa}" alt="Prévia da etiqueta fotografada">` : ''}
      <form id="formulario" class="formulario" novalidate autocomplete="off">
        ${contexto}
        ${mostrarEndereco ? `
          ${campoTexto('bairro', 'Bairro', { extra: 'autocapitalize="words" enterkeyhint="next"', dica: dicaBairro })}
          ${campoTexto('logradouro', 'Rua ou avenida', { extra: 'autocapitalize="words" enterkeyhint="next"' })}
          <div class="campo-grupo">
            <label class="rotulo-campo" for="f-numero">Número</label>
            <input class="campo" id="f-numero" name="numero" value="${esc(c.numero)}" autocomplete="off"
              enterkeyhint="next" ${c.semNumero ? 'disabled' : ''} ${descricao('numero')}>
            <label class="check"><input type="checkbox" name="semNumero" ${c.semNumero ? 'checked' : ''}> Sem número</label>
            ${mensagem('numero')}
          </div>
          ${campoTexto('complemento', 'Complemento', { opcional: true, extra: 'placeholder="Ex.: Apto 101, Casa A, Bloco 2"' })}` : ''}
        ${mostrarPacote ? `
          ${campoTexto('destinatario', 'Destinatário', { opcional: true, extra: 'autocapitalize="words"' })}
          ${campoTexto('rastreio', 'Código de rastreio', { opcional: true, extra: 'autocapitalize="characters" spellcheck="false"' })}` : ''}
        <div class="campo-grupo">
          <span class="rotulo-campo" id="rotulo-quantidade">Quantidade de pacotes</span>
          <div class="passo">
            <button type="button" class="botao-passo" data-acao="menos" aria-label="Diminuir quantidade">${icone('minus')}</button>
            <input class="campo campo-numero ${erros.quantidade ? 'invalido' : ''}" id="f-quantidade" name="quantidade"
              value="${esc(c.quantidade)}" inputmode="numeric" pattern="[0-9]*" aria-labelledby="rotulo-quantidade" ${descricao('quantidade')}>
            <button type="button" class="botao-passo" data-acao="mais" aria-label="Aumentar quantidade">${icone('plus')}</button>
          </div>
          ${mensagem('quantidade')}
        </div>
        ${mostrarEndereco ? `
          <div class="campo-grupo">
            <label class="rotulo-campo" for="f-observacoes">Observações <span class="opcional">(opcional)</span></label>
            <textarea class="campo" id="f-observacoes" name="observacoes" rows="2">${esc(c.observacoes)}</textarea>
          </div>` : ''}
        <div class="rodape-fixo">
          <button class="botao botao-principal" type="submit">${icone('check')}${r.modo === 'editar' ? 'Salvar alterações' : 'Salvar entrega'}</button>
        </div>
      </form>
    </main>`;
}

function lerCampos(form, r) {
  const valor = (nome) => form.elements[nome]?.value ?? '';
  const campos = { ...r.campos };
  if (r.modo !== 'pacote') {
    Object.assign(campos, {
      bairro: valor('bairro').trim(),
      logradouro: valor('logradouro').trim(),
      numero: valor('numero').trim(),
      semNumero: Boolean(form.elements.semNumero?.checked),
      complemento: valor('complemento').trim(),
      observacoes: valor('observacoes').trim(),
    });
  }
  if (r.modo !== 'editar') {
    Object.assign(campos, {
      destinatario: valor('destinatario').trim(),
      rastreio: normalizarRastreio(valor('rastreio')),
    });
  }
  campos.quantidade = Number(valor('quantidade').trim());
  return campos;
}

function ajustarQuantidade(delta) {
  const campo = document.getElementById('f-quantidade');
  if (!campo) return;
  const atual = Number.parseInt(campo.value, 10) || 1;
  campo.value = String(Math.min(LIMITE_QUANTIDADE, Math.max(1, atual + delta)));
}

async function enviarFormulario(form) {
  const r = estado.rascunho;
  if (!r) return;
  const campos = lerCampos(form, r);
  r.campos = campos;
  r.duplicado = null;
  r.erros = validarCampos(campos, { exigirLocal: r.modo !== 'pacote' });
  if (Object.keys(r.erros).length) {
    await renderizar();
    document.querySelector('.campo.invalido')?.focus();
    return;
  }

  if (r.modo === 'editar') {
    await salvarEdicao(r);
    return;
  }

  const resultado = await registrarEntrega({
    data: r.data,
    origem: r.origem,
    modo: r.modo,
    fotoId: r.fotoId,
    leitura: r.leitura,
    extras: r.extras,
    enderecoId: r.enderecoId,
    campos,
  }, { confirmado: r.confirmado });

  if (resultado.resultado === 'duplicado') {
    r.duplicado = { enderecoId: resultado.enderecoId };
    r.erros = { rastreio: 'Este pacote já está na lista.' };
    await renderizar();
    window.scrollTo(0, 0);
    return;
  }
  if (resultado.resultado === 'possivel-duplicado') {
    const ok = await confirmar({
      titulo: 'Possível duplicado',
      texto: 'Já existe um pacote sem código de rastreio neste endereço. Pode ser o mesmo pacote fotografado de novo. Adicionar mesmo assim?',
      rotulo: 'Adicionar mesmo assim',
    });
    if (!ok) return;
    r.confirmado = true;
    await enviarFormulario(form);
    return;
  }
  if (resultado.resultado === 'erro') {
    avisar('Não foi possível salvar. Tente de novo.');
    return;
  }

  if (campos.bairro) estado.ultimoBairro = campos.bairro;
  estado.rascunho = null;

  if (r.modo === 'lote') {
    await atualizarItem(r.itemId, { status: 'salvo', enderecoId: resultado.enderecoId, jaEstava: false, erro: null });
    const restantes = (await itensDoLote(r.loteId)).filter((i) => i.status !== 'salvo').length;
    location.hash = restantes ? `#/lote/${r.loteId}` : '#/entregas';
    avisar('Entrega salva.', restantes ? null : { rotulo: 'Adicionar outra', href: '#/adicionar' });
    return;
  }
  if (r.modo === 'pacote') {
    location.hash = `#/endereco/${r.enderecoId}`;
    avisar('Pacote adicionado.');
    return;
  }
  location.hash = '#/entregas';
  avisar('Entrega salva.', { rotulo: 'Adicionar outra', href: '#/novo' });
}

// Grava a entrega. Junta ao endereço já existente do dia só quando bairro, rua, número e
// complemento normalizados são iguais; endereços incompletos nunca são juntados.
async function registrarEntrega(entrada, { confirmado = false } = {}) {
  const { campos, modo } = entrada;
  const enderecos = await repo.listar('enderecos');
  const rastreio = normalizarRastreio(campos.rastreio);

  const achado = rastreio ? encontrarPacotePorRastreio(enderecos, rastreio) : null;
  if (achado) return { resultado: 'duplicado', enderecoId: achado.endereco.id };

  let alvo = null;
  if (modo === 'pacote') {
    alvo = enderecos.find((e) => e.id === entrada.enderecoId) ?? null;
    if (!alvo) return { resultado: 'erro' };
  } else {
    const chave = chaveEndereco(campos);
    if (chave) alvo = enderecos.find((e) => e.data === entrada.data && chaveEndereco(e) === chave) ?? null;
  }

  // Sem rastreio, uma foto do mesmo endereço pode ser o mesmo pacote: pede conferência.
  if (alvo && entrada.origem === 'foto' && !rastreio && !confirmado && alvo.pacotes.some((p) => !p.rastreio)) {
    return { resultado: 'possivel-duplicado', enderecoId: alvo.id };
  }

  const momento = agora();
  const pacotes = criarPacotes(campos.quantidade, { rastreio, destinatario: campos.destinatario });

  if (alvo) {
    alvo.pacotes.push(...pacotes);
    if (entrada.fotoId) alvo.fotoIds.push(entrada.fotoId);
    if (campos.observacoes) alvo.observacoes = [alvo.observacoes, campos.observacoes].filter(Boolean).join(' · ');
    alvo.atualizadoEm = momento;
    await repo.salvar('enderecos', alvo);
    return { resultado: 'adicionado', enderecoId: alvo.id };
  }

  const endereco = {
    id: novoId(),
    data: entrada.data,
    bairro: campos.bairro ?? '',
    logradouro: campos.logradouro ?? '',
    numero: campos.numero ?? '',
    semNumero: Boolean(campos.semNumero),
    complemento: campos.complemento ?? '',
    observacoes: campos.observacoes ?? '',
    cidade: entrada.extras?.cidade ?? '',
    estado: entrada.extras?.estado ?? '',
    cep: entrada.extras?.cep ?? '',
    pacotes,
    fotoIds: entrada.fotoId ? [entrada.fotoId] : [],
    leitura: entrada.leitura ?? null,
    criadoEm: momento,
    atualizadoEm: momento,
  };
  await repo.salvar('enderecos', endereco);
  return { resultado: 'criado', enderecoId: endereco.id };
}

async function salvarEdicao(r) {
  const campos = r.campos;
  const enderecos = await repo.listar('enderecos');
  const e = enderecos.find((x) => x.id === r.enderecoId);
  if (!e) {
    location.hash = '#/entregas';
    return;
  }

  const diferenca = campos.quantidade - e.pacotes.length;
  const pendentes = e.pacotes.filter((p) => !p.entregue);
  if (-diferenca > pendentes.length) {
    r.erros = { quantidade: 'Há pacotes já entregues. Desmarque a entrega antes de reduzir a quantidade.' };
    await renderizar();
    return;
  }
  if (diferenca < 0) {
    const removidos = new Set(pendentes.slice(pendentes.length + diferenca).map((p) => p.id));
    e.pacotes = e.pacotes.filter((p) => !removidos.has(p.id));
  } else if (diferenca > 0) {
    e.pacotes.push(...criarPacotes(diferenca));
  }

  Object.assign(e, {
    bairro: campos.bairro,
    logradouro: campos.logradouro,
    numero: campos.numero,
    semNumero: campos.semNumero,
    complemento: campos.complemento,
    observacoes: campos.observacoes,
    atualizadoEm: agora(),
  });

  const chave = chaveEndereco(e);
  const outro = chave ? enderecos.find((o) => o.id !== e.id && o.data === e.data && chaveEndereco(o) === chave) : null;
  if (outro && !r.confirmado) {
    const juntar = await confirmar({
      titulo: 'Endereço já existe',
      texto: 'Já existe um endereço igual neste dia. Juntar os pacotes dos dois endereços?',
      rotulo: 'Juntar endereços',
    });
    if (!juntar) return;
    r.confirmado = true;
    await salvarEdicao(r);
    return;
  }

  let destino = e.id;
  if (outro) {
    outro.pacotes.push(...e.pacotes);
    outro.fotoIds.push(...e.fotoIds);
    outro.atualizadoEm = agora();
    await repo.salvar('enderecos', outro);
    await repo.remover('enderecos', e.id);
    destino = outro.id;
  } else {
    await repo.salvar('enderecos', e);
  }

  estado.rascunho = null;
  location.hash = `#/endereco/${destino}`;
  avisar('Alterações salvas.');
}

// ---------- tela: detalhes do endereço ----------

async function telaDetalhe(id) {
  const e = id ? await repo.obter('enderecos', id) : null;
  if (!e) return telaNaoEncontrada('Este endereço não existe mais.');

  const pendentes = e.pacotes.filter((p) => !p.entregue).length;
  const entregues = e.pacotes.length - pendentes;
  const destinatarios = [...new Set(e.pacotes.map((p) => (p.destinatario || '').trim()).filter(Boolean))];
  const local = [e.cidade, e.estado, e.cep].filter(Boolean).join(' · ');
  const fotos = [];
  for (const fotoId of e.fotoIds) {
    const imagem = await repo.obter('imagens', fotoId);
    if (imagem) fotos.push({ fotoId, url: urlTemporaria(imagem.blob) });
  }

  const pacotes = e.pacotes.map((p, indice) => `
    <li class="pacote ${p.entregue ? 'entregue' : ''}">
      <button class="pacote-estado" data-acao="alternar-pacote" data-id="${e.id}" data-pacote="${p.id}" aria-pressed="${p.entregue}">
        ${icone(p.entregue ? 'checkCircle' : 'circle')}
        <span>
          <strong>Pacote ${indice + 1}: ${p.entregue ? 'Entregue' : 'Pendente'}</strong>
          <small>${p.rastreio ? esc(p.rastreio) : 'Sem código de rastreio'}${p.destinatario ? ` · ${esc(p.destinatario)}` : ''}</small>
          <small>${p.entregue ? 'Toque para voltar a pendente' : 'Toque para marcar como entregue'}</small>
        </span>
      </button>
      <button class="botao-icone" data-acao="editar-pacote" data-id="${e.id}" data-pacote="${p.id}" aria-label="Editar pacote ${indice + 1}">${icone('pencil')}</button>
    </li>`).join('');

  return `
    <main class="tela">
      <header class="barra-topo">
        <a class="botao-icone" href="#/entregas" aria-label="Voltar para entregas">${icone('chevronLeft')}</a>
        <span class="barra-titulo">Detalhes do endereço</span>
      </header>

      <section class="cartao cartao-detalhe">
        ${e.bairro ? `<p class="bairro">${esc(e.bairro)}</p>` : ''}
        <h1 class="titulo-rua">${esc(linhaRua(e))}</h1>
        ${e.complemento ? `<p class="secundario">${esc(e.complemento)}</p>` : ''}
        ${local ? `<p class="secundario">${esc(local)}</p>` : ''}
        ${destinatarios.length ? `<p class="secundario">Destinatários: ${esc(destinatarios.join(', '))}</p>` : ''}
        <p class="resumo-linha">${pacotesTexto(e.pacotes.length)} · ${entregues} ${entregues === 1 ? 'entregue' : 'entregues'} · ${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}</p>
      </section>

      ${precisaRevisao(e) ? aviso('atencao', 'alert', '<p>Revisar endereço: complete bairro, rua e número para que outros pacotes deste local sejam agrupados.</p>') : ''}
      ${e.observacoes ? `<section class="cartao"><h2 class="secao" style="margin:0 0 4px">Observações</h2><p>${esc(e.observacoes)}</p></section>` : ''}

      <h2 class="secao">Pacotes</h2>
      <ul class="pacotes">${pacotes}</ul>

      <div class="acoes-detalhe">
        ${pendentes ? `<button class="botao botao-principal" data-acao="entregar-todos" data-id="${e.id}">${icone('check')}Marcar todos como entregues</button>` : ''}
        <a class="botao botao-secundario" href="#/novo?endereco=${e.id}">${icone('plus')}Adicionar pacote neste endereço</a>
        <a class="botao botao-secundario" href="#/novo?editar=${e.id}">${icone('pencil')}Editar dados</a>
      </div>

      ${fotos.length ? `
        <h2 class="secao">Fotos das etiquetas</h2>
        <div class="fotos">${fotos.map((f, i) => `
          <button class="foto" data-acao="ver-foto" data-id="${e.id}" data-foto="${f.fotoId}" aria-label="Ver foto ${i + 1}">
            <img src="${f.url}" alt="">
          </button>`).join('')}
        </div>` : ''}

      <div class="acoes-detalhe">
        <button class="botao botao-perigo" data-acao="excluir-endereco" data-id="${e.id}">${icone('trash')}Excluir endereço</button>
      </div>
    </main>`;
}

function registrarDesfazer(enderecoId, antes, mensagem) {
  estado.desfazer = { enderecoId, antes };
  avisar(mensagem, { id: 'desfazer', rotulo: 'Desfazer' });
}

async function desfazer() {
  const acao = estado.desfazer;
  if (!acao) return;
  estado.desfazer = null;
  const e = await repo.obter('enderecos', acao.enderecoId);
  if (e) {
    e.pacotes = acao.antes;
    e.atualizadoEm = agora();
    await repo.salvar('enderecos', e);
  }
  avisar('Alteração desfeita.');
  renderizar();
}

async function entregarTodos(id) {
  const e = await repo.obter('enderecos', id);
  if (!e) return;
  const antes = clonar(e.pacotes);
  const momento = agora();
  e.pacotes.forEach((p) => {
    if (!p.entregue) Object.assign(p, { entregue: true, entregueEm: momento });
  });
  e.atualizadoEm = momento;
  await repo.salvar('enderecos', e);
  registrarDesfazer(e.id, antes, `${linhaRua(e)}: entregue.`);
  renderizar();
}

async function alternarPacote(enderecoId, pacoteId) {
  const e = await repo.obter('enderecos', enderecoId);
  const p = e?.pacotes.find((x) => x.id === pacoteId);
  if (!p) return;
  const antes = clonar(e.pacotes);
  p.entregue = !p.entregue;
  p.entregueEm = p.entregue ? agora() : null;
  e.atualizadoEm = agora();
  await repo.salvar('enderecos', e);
  registrarDesfazer(e.id, antes, p.entregue ? 'Pacote marcado como entregue.' : 'Pacote voltou para pendente.');
  renderizar();
}

async function editarPacote(enderecoId, pacoteId) {
  const e = await repo.obter('enderecos', enderecoId);
  const p = e?.pacotes.find((x) => x.id === pacoteId);
  if (!p) return;

  const { valor, dados } = await abrirDialogo(`
    <form method="dialog" class="dialogo-corpo">
      <h2>Editar pacote</h2>
      <div class="campo-grupo">
        <label class="rotulo-campo" for="pc-rastreio">Código de rastreio <span class="opcional">(opcional)</span></label>
        <input class="campo" id="pc-rastreio" name="rastreio" value="${esc(p.rastreio)}" autocomplete="off" autocapitalize="characters" spellcheck="false">
      </div>
      <div class="campo-grupo">
        <label class="rotulo-campo" for="pc-destinatario">Destinatário <span class="opcional">(opcional)</span></label>
        <input class="campo" id="pc-destinatario" name="destinatario" value="${esc(p.destinatario)}" autocomplete="off" autocapitalize="words">
      </div>
      <div class="acoes-dialogo acoes-coluna">
        <button class="botao botao-principal" value="salvar">Salvar</button>
        ${p.entregue ? '' : '<button class="botao botao-perigo" value="remover">Remover pacote</button>'}
        <button class="botao botao-secundario" value="cancelar">Cancelar</button>
      </div>
    </form>`);

  if (valor === 'remover') {
    if (e.pacotes.length === 1) {
      avisar('Este é o último pacote. Use "Excluir endereço" para apagar o endereço.');
      return;
    }
    const ok = await confirmar({ titulo: 'Remover este pacote?', texto: 'O pacote sai da lista deste endereço.', rotulo: 'Remover', perigo: true });
    if (!ok) return;
    e.pacotes = e.pacotes.filter((x) => x.id !== p.id);
    e.atualizadoEm = agora();
    await repo.salvar('enderecos', e);
    avisar('Pacote removido.');
    renderizar();
    return;
  }
  if (valor !== 'salvar') return;

  const rastreio = normalizarRastreio(dados.rastreio);
  if (rastreio) {
    const outro = encontrarPacotePorRastreio(await repo.listar('enderecos'), rastreio, p.id);
    if (outro) {
      avisar('Este pacote já está na lista.', { rotulo: 'Abrir registro', href: `#/endereco/${outro.endereco.id}` });
      return;
    }
  }
  p.rastreio = rastreio;
  p.destinatario = String(dados.destinatario ?? '').trim();
  e.atualizadoEm = agora();
  await repo.salvar('enderecos', e);
  avisar('Pacote atualizado.');
  renderizar();
}

async function apagarFotos(ids) {
  for (const id of ids) {
    await repo.remover('fotos', id);
    await repo.remover('imagens', id);
    estado.miniaturas.delete(id);
  }
}

async function excluirEndereco(id) {
  const e = await repo.obter('enderecos', id);
  if (!e) return;
  const ok = await confirmar({
    titulo: 'Excluir este endereço?',
    texto: `${linhaRua(e)}: ${pacotesTexto(e.pacotes.length)} e as fotos deste endereço serão apagados. Essa ação não pode ser desfeita.`,
    rotulo: 'Excluir endereço',
    perigo: true,
  });
  if (!ok) return;
  await apagarFotos(e.fotoIds);
  await repo.remover('enderecos', e.id);
  location.hash = '#/entregas';
  avisar('Endereço excluído.');
}

async function verFoto(enderecoId, fotoId) {
  const imagem = await repo.obter('imagens', fotoId);
  if (!imagem) return;
  const { valor } = await abrirDialogo(`
    <form method="dialog" class="dialogo-corpo">
      <img class="previa-grande" src="${urlTemporaria(imagem.blob)}" alt="Foto da etiqueta">
      <div class="acoes-dialogo">
        <button class="botao botao-perigo" value="excluir">${icone('trash')}Excluir foto</button>
        <button class="botao botao-principal" value="fechar">Fechar</button>
      </div>
    </form>`);
  if (valor !== 'excluir') return;
  const ok = await confirmar({ titulo: 'Excluir esta foto?', texto: 'A foto sai deste endereço. Os pacotes continuam na lista.', rotulo: 'Excluir foto', perigo: true });
  if (!ok) return;
  const e = await repo.obter('enderecos', enderecoId);
  if (e) {
    e.fotoIds = e.fotoIds.filter((f) => f !== fotoId);
    e.atualizadoEm = agora();
    await repo.salvar('enderecos', e);
  }
  await apagarFotos([fotoId]);
  avisar('Foto excluída.');
  renderizar();
}

// ---------- tela: histórico ----------

async function telaHistorico() {
  const porDia = new Map();
  for (const e of await repo.listar('enderecos')) {
    if (!porDia.has(e.data)) porDia.set(e.data, []);
    porDia.get(e.data).push(e);
  }
  const dias = [...porDia.entries()].sort(([a], [b]) => b.localeCompare(a));

  const cartoes = dias.map(([dia, lista]) => {
    const r = resumo(lista);
    const numero = (rotulo, valor) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`;
    return `
      <button class="cartao cartao-dia" data-acao="abrir-dia" data-data="${dia}">
        <span class="dia-topo"><strong>${esc(dataLonga(dia, true))}</strong>${icone('chevronRight')}</span>
        <dl class="dia-numeros">
          ${numero('Pacotes', r.total)}
          ${numero('Endereços', r.enderecos)}
          ${numero('Entregues', r.entregues)}
          ${numero('Pendentes', r.pendentes)}
        </dl>
      </button>`;
  }).join('');

  return `
    <main class="tela">
      ${bannerDemo()}
      <header class="cabecalho-texto">
        <h1>Histórico</h1>
        <p class="secundario">Toque em um dia para abrir a lista.</p>
      </header>
      ${dias.length ? cartoes : `<div class="vazio">${icone('history')}<p>Nenhum dia com entregas ainda.</p></div>`}

      <section class="cartao dados">
        <h2>Backup e dados</h2>
        <p class="secundario">O backup guarda endereços e pacotes em um arquivo. As fotos não entram no backup.</p>
        <div class="duas-colunas">
          <button class="botao botao-secundario" data-acao="exportar">${icone('download')}Exportar</button>
          <button class="botao botao-secundario" data-acao="importar">${icone('upload')}Importar</button>
        </div>
        <button class="botao botao-perigo" data-acao="apagar-tudo">${icone('trash')}Apagar todos os dados</button>
      </section>
      ${navegacao('historico')}
    </main>`;
}

async function exportarBackup() {
  const enderecos = await repo.listar('enderecos');
  const conteudo = JSON.stringify({
    app: 'pacote-certo',
    versao: 1,
    exportadoEm: agora(),
    observacao: 'Contém endereços e pacotes. As fotos não estão incluídas.',
    enderecos,
  }, null, 2);
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pacote-certo-backup-${dataHoje()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  avisar(`Backup exportado: ${plural(enderecos.length, 'endereço', 'endereços')}, sem fotos.`);
}

async function importarBackup(input) {
  const arquivo = input.files[0];
  input.value = '';
  if (!arquivo) return;

  let dados;
  try {
    dados = JSON.parse(await arquivo.text());
  } catch {
    avisar('Arquivo inválido. Escolha um backup exportado pelo Pacote Certo.');
    return;
  }
  if (dados?.app !== 'pacote-certo' || !Array.isArray(dados.enderecos)) {
    avisar('Arquivo inválido. Escolha um backup exportado pelo Pacote Certo.');
    return;
  }

  const existentes = new Set((await repo.listar('enderecos')).map((e) => e.id));
  const validos = dados.enderecos.filter((e) => e && typeof e.id === 'string' && typeof e.data === 'string' && Array.isArray(e.pacotes));
  const novos = validos.filter((e) => !existentes.has(e.id)).map((e) => ({ ...e, fotoIds: [] }));
  if (novos.length) await repo.salvarTudo('enderecos', novos);
  const repetidos = validos.length - novos.length;
  avisar(`${plural(novos.length, 'endereço importado', 'endereços importados')}${repetidos ? `, ${repetidos} já existiam` : ''}.`);
  renderizar();
}

async function apagarTudo() {
  const ok = await confirmar({
    titulo: 'Apagar todos os dados?',
    texto: 'Endereços, pacotes, fotos e leituras deste aparelho serão apagados. Exporte um backup antes, se quiser guardar.',
    rotulo: 'Apagar tudo',
    perigo: true,
  });
  if (!ok) return;
  for (const loja of LOJAS) await repo.limpar(loja);
  estado.miniaturas.clear();
  estado.desfazer = null;
  avisar('Todos os dados foram apagados.');
  renderizar();
}

// ---------- compartilhar ----------

async function compartilhar() {
  const r = resumo(estado.dia);
  if (!r.total) {
    avisar('Não há entregas neste dia para compartilhar.');
    return;
  }

  const { valor } = await abrirDialogo(`
    <form method="dialog" class="dialogo-corpo">
      <h2>Compartilhar lista</h2>
      <p class="secundario">Envia a lista em texto, organizada por bairro e rua. A ordem não é uma rota otimizada.</p>
      <div class="acoes-dialogo acoes-coluna">
        <button class="botao botao-principal" value="pendentes">Somente pendentes (${pacotesTexto(r.pendentes)})</button>
        <button class="botao botao-secundario" value="completa">Lista completa (${pacotesTexto(r.total)})</button>
        <button class="botao botao-secundario" value="cancelar">Cancelar</button>
      </div>
    </form>`);
  if (valor !== 'pendentes' && valor !== 'completa') return;
  if (valor === 'pendentes' && !r.pendentes) {
    avisar('Nenhum pacote pendente para compartilhar.');
    return;
  }

  const texto = textoCompartilhar(estado.dia, estado.data, { somentePendentes: valor === 'pendentes' });
  if (navigator.share) {
    try {
      await navigator.share({ text: texto });
      return;
    } catch (erro) {
      if (erro.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    avisar('Lista copiada. Cole no WhatsApp ou onde quiser.');
  } catch {
    await abrirDialogo(`
      <form method="dialog" class="dialogo-corpo">
        <h2>Copie a lista</h2>
        <textarea class="campo" rows="12" readonly>${esc(texto)}</textarea>
        <div class="acoes-dialogo"><button class="botao botao-principal" value="ok">Fechar</button></div>
      </form>`);
  }
}

// ---------- eventos ----------

const ACOES = {
  escanear: () => document.getElementById('entrada-camera').click(),
  galeria: () => document.getElementById('entrada-galeria').click(),
  importar: () => document.getElementById('entrada-backup').click(),
  exportar: exportarBackup,
  'apagar-tudo': apagarTudo,
  hoje: () => {
    estado.data = dataHoje();
    renderizar();
  },
  filtro: ({ valor }) => {
    estado.filtro = valor;
    renderizar();
  },
  'abrir-dia': ({ data }) => {
    estado.data = data;
    estado.filtro = 'todas';
    location.hash = '#/entregas';
  },
  compartilhar,
  desfazer,
  'entregar-todos': ({ id }) => entregarTodos(id),
  'alternar-pacote': ({ id, pacote }) => alternarPacote(id, pacote),
  'editar-pacote': ({ id, pacote }) => editarPacote(id, pacote),
  'excluir-endereco': ({ id }) => excluirEndereco(id),
  'ver-foto': ({ id, foto }) => verFoto(id, foto),
  menos: () => ajustarQuantidade(-1),
  mais: () => ajustarQuantidade(1),
  'focar-bairro': () => document.getElementById('f-bairro')?.focus(),
  'reprocessar-item': ({ lote, item }) => reprocessarItem(lote, item),
  'reprocessar-lote': ({ lote }) => reprocessarLote(lote),
  'salvar-prontos': ({ lote }) => salvarProntos(lote),
};

function tratarErro(erro) {
  // Só o tipo do erro: endereços e fotos não vão para o console.
  console.error('Pacote Certo:', erro?.name ?? 'erro');
  avisar('Algo deu errado. Tente de novo.');
}

document.addEventListener('click', (evento) => {
  const elemento = evento.target.closest('[data-acao]');
  const acao = elemento && ACOES[elemento.dataset.acao];
  if (!acao) return;
  evento.preventDefault();
  Promise.resolve().then(() => acao(elemento.dataset)).catch(tratarErro);
});

document.addEventListener('change', (evento) => {
  const alvo = evento.target;
  if (alvo.dataset.mudar === 'data' && alvo.value) {
    estado.data = alvo.value;
    renderizar();
  }
  if (alvo.name === 'semNumero') {
    const numero = document.getElementById('f-numero');
    if (numero) numero.disabled = alvo.checked;
  }
});

document.addEventListener('input', (evento) => {
  if (evento.target.id !== 'busca') return;
  estado.busca = evento.target.value;
  const lista = document.getElementById('lista');
  if (lista) lista.innerHTML = listaHtml(estado.dia);
});

document.addEventListener('submit', (evento) => {
  if (evento.target.id !== 'formulario') return;
  evento.preventDefault();
  enviarFormulario(evento.target).catch(tratarErro);
});

// Com o teclado aberto, mantém o campo ativo visível acima do botão fixo de salvar.
document.addEventListener('focusin', (evento) => {
  if (!evento.target.matches('.formulario .campo')) return;
  setTimeout(() => evento.target.closest('.campo-grupo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
});

document.getElementById('entrada-camera').addEventListener('change', (e) => receberFotos(e.target).catch(tratarErro));
document.getElementById('entrada-galeria').addEventListener('change', (e) => receberFotos(e.target).catch(tratarErro));
document.getElementById('entrada-backup').addEventListener('change', (e) => importarBackup(e.target).catch(tratarErro));

async function iniciar() {
  if (DEMO && (await repo.listar('enderecos')).length === 0) {
    await repo.salvarTudo('enderecos', dadosDemonstracao(dataHoje()));
  }
  window.addEventListener('hashchange', () => renderizar().catch(tratarErro));
  window.addEventListener('online', () => retomarLotes().catch(tratarErro));
  if (!location.hash) location.hash = '#/entregas';
  else await renderizar();
  retomarLotes().catch(tratarErro);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

iniciar().catch(tratarErro);
