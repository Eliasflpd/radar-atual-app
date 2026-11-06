// Currículo do profissional: campos, sugestões por área e texto pronto.
// As sugestões ajudam quem não sabe o que escrever: é só tocar para marcar.
// Atenção: nada aqui pode ter palavras que o filtro anti-contato bloqueia
// (telefone, e-mail, redes sociais, "fora do app"…).

export const EXPERIENCIA = ['Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', '6 a 10 anos', 'Mais de 10 anos'];
export const TEMPO_TRABALHO = ['Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', 'Mais de 5 anos', 'Ainda trabalho lá'];
export const ESCOLARIDADE = ['Sei ler e escrever', 'Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo',
  'Curso técnico', 'Superior incompleto', 'Superior completo', 'Pós-graduação'];
export const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Feriados', 'Atendo urgência'];
export const IDIOMAS = ['Português', 'Inglês', 'Espanhol', 'Francês', 'Italiano', 'Alemão', 'Libras'];
export const AREAS = ['Só na minha cidade', 'Cidade e povoados', 'Cidades vizinhas', 'Zona rural', 'Viajo para outras cidades'];
export const DIFERENCIAIS = ['Sou pontual', 'Deixo o local limpo', 'Dou garantia do serviço', 'Orçamento sem compromisso', 'Tenho MEI e emito nota',
  'Trabalho com equipe', 'Compro o material se o cliente quiser', 'Aceito serviço pequeno', 'Atendo empresas', 'Tenho referências de clientes'];
export const ONDE_ESTUDOU = ['SENAI', 'SENAC', 'SENAR', 'SEBRAE', 'IFMA', 'Curso on-line'];
export const TIPOS_LOCAL = ['Por conta própria', 'Casa de família', 'Construtora', 'Empresa', 'Pousada / hotel', 'Agência de turismo', 'Fazenda', 'Prefeitura'];

const GERAL = {
  area: 'serviços gerais',
  servicos: [],
  cursos: ['Primeiros socorros', 'Atendimento ao cliente'],
  equipamentos: ['Ferramentas próprias', 'Moto própria', 'Carro próprio', 'Bicicleta'],
  funcoes: ['Autônomo'],
};

// Sugestões por área (nome da categoria igual ao do banco)
const POR_AREA = {
  Pedreiro: {
    area: 'obras e reformas',
    servicos: ['Reboco', 'Contrapiso', 'Assentamento de piso', 'Porcelanato', 'Azulejo e revestimento', 'Alvenaria (levantar parede)', 'Fundação e baldrame',
      'Laje', 'Telhado', 'Muro', 'Calçada', 'Pequenos reparos', 'Reforma completa', 'Fossa e caixa d\'água'],
    cursos: ['Pedreiro de alvenaria (SENAI)', 'Assentador de revestimento', 'NR-35 Trabalho em altura', 'NR-18 Segurança na construção', 'Leitura de projeto'],
    equipamentos: ['Ferramentas próprias', 'Betoneira', 'Andaime', 'Cortador de piso', 'Nível a laser', 'Furadeira e martelete'],
    funcoes: ['Pedreiro', 'Mestre de obras', 'Encarregado', 'Ajudante de pedreiro'],
  },
  Eletricista: {
    area: 'instalações elétricas',
    servicos: ['Instalação de tomadas e interruptores', 'Chuveiro elétrico', 'Quadro de distribuição', 'Disjuntores', 'Iluminação e luminárias', 'Ventilador de teto',
      'Fiação nova', 'Padrão de energia', 'Curto-circuito', 'Aterramento', 'Instalação de ar-condicionado (parte elétrica)', 'Energia solar'],
    cursos: ['NR-10 Segurança em eletricidade', 'Eletricista predial (SENAI)', 'NR-35 Trabalho em altura', 'Instalador de energia solar'],
    equipamentos: ['Ferramentas próprias', 'Multímetro', 'Alicate amperímetro', 'Escada', 'Furadeira'],
    funcoes: ['Eletricista', 'Eletricista predial', 'Ajudante de eletricista'],
  },
  Encanador: {
    area: 'encanamento e hidráulica',
    servicos: ['Vazamentos', 'Desentupimento', 'Troca de registro', 'Instalação de pia e torneira', 'Vaso sanitário', 'Caixa d\'água', 'Bomba d\'água',
      'Aquecedor', 'Esgoto e fossa', 'Encanamento novo'],
    cursos: ['Instalador hidráulico (SENAI)', 'Bombeiro hidráulico', 'NR-35 Trabalho em altura'],
    equipamentos: ['Ferramentas próprias', 'Máquina de desentupir', 'Caça-vazamento', 'Escada'],
    funcoes: ['Encanador', 'Bombeiro hidráulico', 'Ajudante'],
  },
  Pintor: {
    area: 'pintura',
    servicos: ['Pintura interna', 'Pintura externa e fachada', 'Massa corrida', 'Textura e grafiato', 'Verniz e esmalte', 'Pintura de portão e grade',
      'Impermeabilização', 'Pintura de muro', 'Efeito decorativo'],
    cursos: ['Pintor de obras (SENAI)', 'NR-35 Trabalho em altura', 'Textura e efeitos decorativos'],
    equipamentos: ['Ferramentas próprias', 'Rolos e pincéis', 'Andaime', 'Escada', 'Compressor / pistola de pintura', 'Lixadeira'],
    funcoes: ['Pintor', 'Encarregado de pintura', 'Ajudante de pintor'],
  },
  'Diarista / Limpeza': {
    area: 'limpeza e organização',
    servicos: ['Faxina completa', 'Limpeza semanal', 'Limpeza quinzenal', 'Limpeza pós-obra', 'Passar roupa', 'Lavar roupa', 'Organização de armários',
      'Limpeza de pousada', 'Limpeza de escritório', 'Limpeza de vidros', 'Cozinhar o básico'],
    cursos: ['Camareira (SENAC)', 'Organização residencial', 'Higiene e limpeza'],
    equipamentos: ['Levo meus produtos de limpeza', 'Aspirador', 'Lavadora de alta pressão'],
    funcoes: ['Diarista', 'Doméstica', 'Camareira', 'Auxiliar de limpeza'],
  },
  Jardineiro: {
    area: 'jardinagem',
    servicos: ['Corte de grama', 'Poda de árvores', 'Limpeza de terreno', 'Plantio', 'Montagem de jardim', 'Adubação', 'Controle de pragas', 'Horta', 'Irrigação'],
    cursos: ['Jardinagem (SENAR)', 'Paisagismo', 'Uso seguro de roçadeira'],
    equipamentos: ['Ferramentas próprias', 'Roçadeira', 'Cortador de grama', 'Motosserra', 'Soprador'],
    funcoes: ['Jardineiro', 'Caseiro', 'Auxiliar de jardinagem'],
  },
  Marceneiro: {
    area: 'marcenaria',
    servicos: ['Móveis planejados', 'Guarda-roupa', 'Cozinha', 'Portas e janelas', 'Conserto de móveis', 'Montagem de móveis', 'Prateleiras', 'Deck e pergolado', 'Telhado de madeira'],
    cursos: ['Marceneiro (SENAI)', 'Desenho de móveis', 'Montador de móveis'],
    equipamentos: ['Ferramentas próprias', 'Oficina própria', 'Serra circular', 'Tupia', 'Parafusadeira'],
    funcoes: ['Marceneiro', 'Carpinteiro', 'Montador de móveis'],
  },
  Serralheiro: {
    area: 'serralheria',
    servicos: ['Portão', 'Grade de janela', 'Corrimão', 'Estrutura metálica', 'Cobertura e toldo', 'Solda e conserto', 'Porta de aço', 'Escada de ferro'],
    cursos: ['Soldador (SENAI)', 'Serralheiro', 'NR-35 Trabalho em altura'],
    equipamentos: ['Ferramentas próprias', 'Máquina de solda', 'Esmerilhadeira', 'Oficina própria'],
    funcoes: ['Serralheiro', 'Soldador', 'Ajudante de serralheiro'],
  },
  'Mecânico': {
    area: 'mecânica',
    servicos: ['Mecânica de carro', 'Mecânica de moto', 'Troca de óleo', 'Freio', 'Suspensão', 'Motor', 'Parte elétrica do carro', 'Revisão', 'Socorro na estrada', 'Mecânica de trator'],
    cursos: ['Mecânico de automóveis (SENAI)', 'Mecânico de motos', 'Injeção eletrônica', 'Mecânica diesel'],
    equipamentos: ['Ferramentas próprias', 'Oficina própria', 'Scanner automotivo', 'Macaco hidráulico', 'Atendo no local'],
    funcoes: ['Mecânico', 'Auxiliar de mecânico', 'Eletricista de autos'],
  },
  'Técnico em informática': {
    area: 'informática',
    servicos: ['Formatação', 'Conserto de computador', 'Conserto de notebook', 'Instalação de programas', 'Remoção de vírus', 'Rede e roteador', 'Impressora',
      'Câmeras de segurança', 'Montagem de computador', 'Recuperação de arquivos'],
    cursos: ['Técnico em informática', 'Manutenção de computadores', 'Redes de computadores', 'Instalação de câmeras'],
    equipamentos: ['Ferramentas próprias', 'Atendo em domicílio', 'Bancada própria'],
    funcoes: ['Técnico de informática', 'Suporte técnico', 'Auxiliar de TI'],
  },
  Designer: {
    area: 'design gráfico',
    servicos: ['Logotipo', 'Identidade visual', 'Cardápio', 'Artes para redes sociais', 'Banner e faixa', 'Cartão de visita', 'Panfleto', 'Fachada', 'Convite'],
    cursos: ['Design gráfico', 'Photoshop e Illustrator', 'Canva profissional', 'Marketing digital'],
    equipamentos: ['Computador próprio', 'Programas de design'],
    funcoes: ['Designer gráfico', 'Social media', 'Arte-finalista'],
  },
  Programador: {
    area: 'programação e sites',
    servicos: ['Site', 'Loja virtual', 'Aplicativo', 'Sistema para empresa', 'Planilhas e automação', 'Manutenção de site', 'Cardápio digital'],
    cursos: ['Análise e desenvolvimento de sistemas', 'Programação web', 'Banco de dados'],
    equipamentos: ['Computador próprio'],
    funcoes: ['Programador', 'Desenvolvedor', 'Analista de sistemas'],
  },
  'Fotógrafo': {
    area: 'fotografia',
    servicos: ['Casamento', 'Aniversário', 'Ensaio', 'Evento', 'Fotos de produtos', 'Fotos de pousada', 'Fotos com drone', 'Vídeo', 'Batizado'],
    cursos: ['Fotografia', 'Edição de fotos', 'Piloto de drone', 'Edição de vídeo'],
    equipamentos: ['Câmera profissional', 'Drone', 'Iluminação', 'Computador para edição'],
    funcoes: ['Fotógrafo', 'Videomaker', 'Assistente de fotografia'],
  },
  'Professor particular': {
    area: 'aulas particulares',
    servicos: ['Reforço escolar', 'Alfabetização', 'Matemática', 'Português', 'Inglês', 'Preparação para o ENEM', 'Aula de música', 'Ajuda com tarefa de casa'],
    cursos: ['Licenciatura', 'Magistério', 'Pedagogia', 'Curso de inglês'],
    equipamentos: ['Material próprio', 'Aula na casa do aluno', 'Aula on-line'],
    funcoes: ['Professor', 'Professor particular', 'Monitor'],
  },
  'Cabeleireiro / Beleza': {
    area: 'beleza',
    servicos: ['Corte feminino', 'Corte masculino', 'Escova', 'Coloração', 'Progressiva', 'Manicure e pedicure', 'Maquiagem', 'Sobrancelha', 'Penteado para festa', 'Barba'],
    cursos: ['Cabeleireiro (SENAC)', 'Manicure', 'Maquiagem', 'Barbeiro', 'Design de sobrancelha'],
    equipamentos: ['Material próprio', 'Atendo em domicílio', 'Salão próprio'],
    funcoes: ['Cabeleireiro', 'Manicure', 'Maquiador', 'Barbeiro'],
  },
  'Cozinheiro / Buffet': {
    area: 'cozinha e eventos',
    servicos: ['Almoço e jantar', 'Buffet para festa', 'Salgados', 'Bolos e doces', 'Marmitas', 'Churrasco', 'Comida regional', 'Café da manhã de pousada', 'Cozinha para eventos'],
    cursos: ['Cozinheiro (SENAC)', 'Boas práticas na manipulação de alimentos', 'Confeitaria', 'Panificação'],
    equipamentos: ['Utensílios próprios', 'Forno industrial', 'Freezer', 'Transporte da comida'],
    funcoes: ['Cozinheiro', 'Auxiliar de cozinha', 'Confeiteiro', 'Churrasqueiro'],
  },
  'Motorista / Frete': {
    area: 'transporte e fretes',
    servicos: ['Frete', 'Mudança', 'Entrega de material', 'Transporte de passageiros', 'Viagem para outras cidades', 'Transfer para aeroporto', 'Carreto'],
    cursos: ['Direção defensiva', 'Transporte de passageiros', 'Carteira de motorista categoria D'],
    equipamentos: ['Carro próprio', 'Caminhonete', 'Caminhão', 'Carrinho de carga', 'Ajudante incluso'],
    funcoes: ['Motorista', 'Motorista de caminhão', 'Entregador'],
  },
  Contador: {
    area: 'contabilidade',
    servicos: ['Abrir MEI', 'Declaração do MEI', 'Imposto de renda', 'Abertura de empresa', 'Folha de pagamento', 'Contabilidade mensal', 'Regularização'],
    cursos: ['Ciências contábeis', 'Técnico em contabilidade', 'Registro no CRC'],
    equipamentos: ['Escritório próprio', 'Atendimento on-line'],
    funcoes: ['Contador', 'Auxiliar contábil', 'Assistente fiscal'],
  },
  Advogado: {
    area: 'advocacia',
    servicos: ['Aposentadoria e INSS', 'Direito de família', 'Trabalhista', 'Inventário', 'Contratos', 'Direito do consumidor', 'Regularização de terra'],
    cursos: ['Direito', 'Registro na OAB', 'Pós-graduação em Direito'],
    equipamentos: ['Escritório próprio', 'Atendimento on-line'],
    funcoes: ['Advogado', 'Estagiário de Direito'],
  },
  'Cuidador / Babá': {
    area: 'cuidado de pessoas',
    servicos: ['Cuidador de idoso', 'Babá', 'Acompanhante em hospital', 'Dar remédio na hora certa', 'Banho e higiene', 'Cuidar à noite', 'Levar à escola'],
    cursos: ['Cuidador de idosos', 'Primeiros socorros', 'Técnico de enfermagem', 'Babá / cuidado infantil'],
    equipamentos: ['Disponível para dormir no local'],
    funcoes: ['Cuidador', 'Babá', 'Acompanhante', 'Técnico de enfermagem'],
  },
  'Ajudante geral': {
    area: 'serviços gerais',
    servicos: ['Ajudante de pedreiro', 'Carga e descarga', 'Limpeza de terreno', 'Mudança', 'Preparar massa', 'Limpeza de obra', 'Ajudante de cozinha', 'Ajudante em eventos', 'Pequenos consertos'],
    cursos: ['NR-35 Trabalho em altura', 'Primeiros socorros', 'Auxiliar de serviços gerais'],
    equipamentos: ['Ferramentas próprias', 'Carrinho de mão', 'Moto própria', 'Bicicleta'],
    funcoes: ['Ajudante geral', 'Servente de obra', 'Auxiliar de serviços gerais', 'Carregador'],
  },
  'Guia turístico': {
    area: 'turismo',
    servicos: ['Lagoa Azul', 'Lagoa Bonita', 'Circuito Lagoas', 'Rio Preguiças', 'Vassouras e Mandacaru', 'Atins', 'Caburé', 'Trilhas', 'Passeio a pé pelas dunas',
      'Roteiro de 1 dia', 'Roteiro de vários dias', 'Grupos', 'Turistas estrangeiros'],
    cursos: ['Guia de turismo regional (credenciado)', 'Primeiros socorros', 'Condutor de turismo', 'Inglês para turismo', 'Espanhol para turismo'],
    equipamentos: ['Kit de primeiros socorros', 'Veículo 4x4', 'Rádio comunicador'],
    funcoes: ['Guia de turismo', 'Condutor', 'Recepcionista de agência'],
  },
  'Passeios 4x4 e quadriciclo': {
    area: 'passeios de 4x4 e quadriciclo',
    servicos: ['Passeio de 4x4', 'Quadriciclo', 'Lagoa Azul', 'Lagoa Bonita', 'Atins', 'Travessia da balsa', 'Transfer', 'Passeio privativo'],
    cursos: ['Direção off-road', 'Primeiros socorros', 'Condutor de turismo', 'Carteira de motorista categoria D'],
    equipamentos: ['Veículo 4x4 próprio', 'Quadriciclo próprio', 'Kit de primeiros socorros'],
    funcoes: ['Motorista de 4x4', 'Condutor de turismo', 'Guia'],
  },
  'Barqueiro / Passeio de barco': {
    area: 'passeios de barco',
    servicos: ['Passeio pelo Rio Preguiças', 'Lancha voadeira', 'Travessia', 'Pescaria', 'Passeio ao pôr do sol', 'Transporte de turistas'],
    cursos: ['Arrais-amador (Marinha)', 'Marinheiro auxiliar de convés', 'Primeiros socorros', 'Salvamento aquático'],
    equipamentos: ['Barco próprio', 'Lancha', 'Coletes salva-vidas'],
    funcoes: ['Barqueiro', 'Piloto de lancha', 'Marinheiro'],
  },
  'Instrutor de kitesurfe': {
    area: 'kitesurfe',
    servicos: ['Aula para iniciantes', 'Aula avançada', 'Aluguel de equipamento', 'Downwind', 'Resgate de barco'],
    cursos: ['Instrutor credenciado de kitesurfe', 'Primeiros socorros', 'Salvamento aquático'],
    equipamentos: ['Equipamento completo', 'Rádio na aula', 'Barco de apoio'],
    funcoes: ['Instrutor de kitesurfe', 'Assistente de escola de kite'],
  },
  'Garçom / Atendente': {
    area: 'atendimento',
    servicos: ['Garçom', 'Atendente de balcão', 'Caixa', 'Barman', 'Recepção de pousada', 'Eventos e festas', 'Copeiro'],
    cursos: ['Garçom (SENAC)', 'Atendimento ao cliente', 'Inglês básico', 'Bartender'],
    equipamentos: ['Uniforme próprio'],
    funcoes: ['Garçom', 'Atendente', 'Recepcionista', 'Barman'],
  },
  'Mototáxi / Entregas': {
    area: 'mototáxi e entregas',
    servicos: ['Mototáxi', 'Entrega de comida', 'Entrega de documentos', 'Compras no mercado', 'Pagamento de contas', 'Entrega para comércio'],
    cursos: ['Curso de mototaxista', 'Direção defensiva', 'Carteira de motorista categoria A'],
    equipamentos: ['Moto própria', 'Baú de entrega', 'Capacete para passageiro'],
    funcoes: ['Mototaxista', 'Entregador', 'Motoboy'],
  },
  'Trabalhador rural': {
    area: 'trabalho no campo',
    servicos: ['Roça e capina', 'Plantio', 'Colheita', 'Cuidar de gado', 'Ordenha', 'Cerca', 'Farinhada', 'Horta', 'Limpeza de pasto'],
    cursos: ['Cursos do SENAR', 'Aplicação segura de defensivos', 'Manejo de gado', 'Inseminação'],
    equipamentos: ['Ferramentas próprias', 'Roçadeira', 'Animal de carga', 'Moto própria'],
    funcoes: ['Trabalhador rural', 'Vaqueiro', 'Caseiro', 'Diarista na roça'],
  },
  'Tratorista / Operador de máquinas': {
    area: 'operação de máquinas',
    servicos: ['Preparo de solo', 'Gradagem', 'Plantio mecanizado', 'Terraplanagem', 'Retroescavadeira', 'Limpeza de terreno', 'Abertura de estrada', 'Açude'],
    cursos: ['Operador de trator (SENAR)', 'Operador de retroescavadeira', 'NR-12 Máquinas', 'Carteira de motorista categoria C ou E'],
    equipamentos: ['Trator próprio', 'Retroescavadeira própria', 'Grade e arado'],
    funcoes: ['Tratorista', 'Operador de máquinas', 'Motorista'],
  },
  'Técnico em refrigeração': {
    area: 'refrigeração e ar-condicionado',
    servicos: ['Instalação de ar-condicionado', 'Limpeza de ar-condicionado', 'Carga de gás', 'Conserto de geladeira', 'Freezer', 'Câmara fria', 'Bebedouro', 'Manutenção para pousada'],
    cursos: ['Refrigeração e climatização (SENAI)', 'NR-10 Segurança em eletricidade', 'NR-35 Trabalho em altura'],
    equipamentos: ['Ferramentas próprias', 'Bomba de vácuo', 'Manifold', 'Lavadora para ar-condicionado'],
    funcoes: ['Técnico em refrigeração', 'Instalador de ar-condicionado', 'Ajudante'],
  },
  Costureira: {
    area: 'costura',
    servicos: ['Ajustes e consertos', 'Barra de calça', 'Roupa sob medida', 'Fardamento', 'Cortinas', 'Roupa de festa', 'Bordado', 'Peças de artesanato em buriti'],
    cursos: ['Corte e costura (SENAC)', 'Modelagem', 'Bordado'],
    equipamentos: ['Máquina de costura', 'Máquina overloque', 'Ateliê próprio'],
    funcoes: ['Costureira', 'Modelista', 'Bordadeira'],
  },
};

export function sugestoes(nomeCategoria) {
  const a = POR_AREA[nomeCategoria] || {};
  const juntar = (k) => [...new Set([...(a[k] || []), ...GERAL[k]])];
  return { area: a.area || (nomeCategoria && nomeCategoria !== 'Outros' ? nomeCategoria.toLowerCase() : GERAL.area),
    servicos: a.servicos || GERAL.servicos, cursos: juntar('cursos'), equipamentos: juntar('equipamentos'), funcoes: juntar('funcoes') };
}

// Garante o formato (vem do banco como objeto livre)
export function normalizar(c) {
  const o = c && typeof c === 'object' ? c : {};
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
  const itens = (v, campos) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object')
    .map((x) => Object.fromEntries(campos.map((k) => [k, String(x[k] ?? '').trim()])))
    .filter((x) => campos.some((k) => x[k])) : []);
  return {
    experiencia: typeof o.experiencia === 'string' ? o.experiencia : '',
    servicos: lista(o.servicos),
    trabalhos: itens(o.trabalhos, ['funcao', 'local', 'tempo']),
    escolaridade: typeof o.escolaridade === 'string' ? o.escolaridade : '',
    cursos: itens(o.cursos, ['nome', 'onde', 'ano']),
    equipamentos: lista(o.equipamentos),
    dias: lista(o.dias),
    turnos: lista(o.turnos),
    areas: typeof o.areas === 'string' ? o.areas.trim() : '',
    idiomas: lista(o.idiomas),
    diferenciais: lista(o.diferenciais),
  };
}

// Quanto do currículo está preenchido (0 a 100)
export function itensFaltando(c, bio = '') {
  const x = normalizar(c);
  return [
    [!!x.experiencia, 'Tempo de experiência'],
    [x.servicos.length >= 3, 'Serviços que você faz (marque pelo menos 3)'],
    [x.trabalhos.length >= 1, 'Onde você já trabalhou'],
    [!!x.escolaridade || x.cursos.length >= 1, 'Estudo e cursos'],
    [x.dias.length >= 1, 'Dias que você pode trabalhar'],
    [!!x.areas, 'Onde você atende'],
    [x.diferenciais.length >= 1, 'Seus diferenciais'],
    [String(bio || '').trim().length >= 60, 'Texto de apresentação'],
  ];
}
export function pctCurriculo(c, bio) {
  const it = itensFaltando(c, bio);
  return Math.round(it.filter(([ok]) => ok).length / it.length * 100);
}

const juntarE = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
// Põe a primeira letra em minúscula só em palavras comuns ("Reboco" → "reboco"); nomes próprios ("Lagoa Azul") ficam como estão
const minusc = (s) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) && !/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(s.slice(1)) ? s[0].toLowerCase() + s.slice(1) : s);
const LOCAIS = { 'Por conta própria': 'por conta própria', 'Casa de família': 'em casa de família', Construtora: 'em construtora', Empresa: 'em empresa',
  'Pousada / hotel': 'em pousada e hotel', 'Agência de turismo': 'em agência de turismo', Fazenda: 'em fazenda', Prefeitura: 'na prefeitura' };
const TURISMO = ['Guia turístico', 'Passeios 4x4 e quadriciclo', 'Barqueiro / Passeio de barco'];

function diasTexto(dias) {
  const ordem = DIAS.filter((d) => dias.includes(d));
  if (ordem.length === 7) return 'todos os dias';
  const uteis = DIAS.slice(0, 5);
  if (uteis.every((d) => ordem.includes(d)) && ordem.length === 6 && ordem.includes('Sábado')) return 'de segunda a sábado';
  if (uteis.every((d) => ordem.includes(d)) && ordem.length === 5) return 'de segunda a sexta';
  return juntarE(ordem.map((d) => d.toLowerCase()));
}

// Texto de apresentação montado com as respostas (para quem não sabe o que escrever)
export function textoSugerido(c, { categoria, cidade }) {
  const x = normalizar(c);
  const s = sugestoes(categoria);
  const frases = [];
  let f1 = `Trabalho com ${s.area}`;
  if (cidade) f1 += ` em ${cidade}`;
  if (x.experiencia) f1 += x.experiencia === 'Menos de 1 ano' ? ', começando agora e com muita vontade de trabalhar' : ` há ${x.experiencia.toLowerCase()}`;
  frases.push(f1 + '.');
  if (x.servicos.length) {
    frases.push(TURISMO.includes(categoria) ? `Passeios e roteiros: ${juntarE(x.servicos.slice(0, 8))}.` : `Serviços que faço: ${juntarE(x.servicos.slice(0, 8).map(minusc))}.`);
  }
  const trabalhos = x.trabalhos.slice(0, 3).map((w) => [w.funcao ? `como ${minusc(w.funcao)}` : 'trabalhei', w.local && (LOCAIS[w.local] || `em ${w.local}`)].filter(Boolean).join(' '));
  if (trabalhos.length) frases.push(`Já trabalhei ${juntarE(trabalhos)}.`.replace('trabalhei trabalhei', 'trabalhei'));
  if (x.cursos.length) frases.push(`Tenho curso de ${juntarE(x.cursos.slice(0, 4).map((k) => k.nome).filter(Boolean))}.`);
  if (x.equipamentos.length) frases.push(`Tenho ${juntarE(x.equipamentos.slice(0, 4).map(minusc))}.`);
  if (x.idiomas.filter((i) => i !== 'Português').length) frases.push(`Falo ${juntarE(x.idiomas.map((i) => i.toLowerCase()))}.`);
  const periodos = x.turnos.filter((t) => ['Manhã', 'Tarde', 'Noite'].includes(t)).map((t) => ({ Manhã: 'de manhã', Tarde: 'à tarde', Noite: 'à noite' }[t]));
  const quando = [x.dias.length && diasTexto(x.dias), periodos.length && juntarE(periodos)].filter(Boolean).join(', ');
  if (quando) frases.push(`Trabalho ${quando}${x.turnos.includes('Feriados') ? ', inclusive feriados' : ''}.`);
  if (x.turnos.includes('Atendo urgência')) frases.push('Também atendo urgência.');
  if (x.areas) frases.push(`Região onde atendo: ${x.areas}.`);
  if (x.diferenciais.length) frases.push(`${juntarE(x.diferenciais.map((d, i) => (i ? minusc(d) : d)))}.`);
  frases.push('Faça seu orçamento pelo app sem compromisso!');
  return frases.join(' ').replace(/\s+/g, ' ').replace(/\.\./g, '.');
}

// Currículo como aparece para o cliente
export function htmlCurriculo(c, esc, ic) {
  const x = normalizar(c);
  const chips = (l) => `<div class="cv-chips">${l.map((v) => `<span>${esc(v)}</span>`).join('')}</div>`;
  const bloco = (icone, titulo, corpo) => `<div class="cv-bloco"><h3>${ic(icone)}${titulo}</h3>${corpo}</div>`;
  const partes = [];
  if (x.servicos.length) partes.push(bloco('ferramentas', 'Serviços que faz', chips(x.servicos)));
  if (x.trabalhos.length) {
    partes.push(bloco('pedidos', 'Onde já trabalhou', `<ul class="cv-lista">${x.trabalhos.map((t) => `<li><b>${esc(t.funcao || 'Trabalho')}</b>${t.local ? ` · ${esc(t.local)}` : ''}${t.tempo ? `<small>${esc(t.tempo)}</small>` : ''}</li>`).join('')}</ul>`));
  }
  if (x.escolaridade || x.cursos.length) {
    partes.push(bloco('livro', 'Estudo e cursos', `<ul class="cv-lista">${x.escolaridade ? `<li><b>Escolaridade</b> · ${esc(x.escolaridade)}</li>` : ''}${x.cursos.map((k) => `<li><b>${esc(k.nome || 'Curso')}</b>${k.onde ? ` · ${esc(k.onde)}` : ''}${k.ano ? `<small>${esc(k.ano)}</small>` : ''}</li>`).join('')}</ul>`));
  }
  if (x.equipamentos.length) partes.push(bloco('caixa', 'Equipamentos', chips(x.equipamentos)));
  if (x.dias.length || x.turnos.length || x.areas) {
    const quando = [x.dias.length && diasTexto(x.dias), ...x.turnos.map((t) => t.toLowerCase())].filter(Boolean);
    partes.push(bloco('relogio', 'Quando e onde atende', `<ul class="cv-lista">${quando.length ? `<li><b>Quando</b> · ${esc(juntarE(quando))}</li>` : ''}${x.areas ? `<li><b>Onde</b> · ${esc(x.areas)}</li>` : ''}</ul>`));
  }
  if (x.idiomas.length > 1 || (x.idiomas.length === 1 && x.idiomas[0] !== 'Português')) partes.push(bloco('chat', 'Idiomas', chips(x.idiomas)));
  if (x.diferenciais.length) partes.push(bloco('check', 'Diferenciais', `<ul class="cv-checks">${x.diferenciais.map((d) => `<li>${ic('check')}${esc(d)}</li>`).join('')}</ul>`));
  return partes.join('');
}
