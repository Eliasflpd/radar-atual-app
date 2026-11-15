// MODO DEMONSTRAÇÃO — imita o Supabase dentro do navegador, com dados de exemplo.
// Aplica as mesmas regras do banco real (supabase/schema.sql): contato oculto até
// o pagamento, filtro anti-contato, 3 avisos = suspensão, comissão de 10%.
import { temContato } from './filtro.js';

const CHAVE = 'contrata-demo-v11';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
const agora = (minAtras = 0) => new Date(Date.now() - minAtras * 60000).toISOString();
const r2 = (n) => Math.round(n * 100) / 100;

const CATEGORIAS = [
  ['Pedreiro', '🧱'], ['Eletricista', '💡'], ['Encanador', '🚰'], ['Pintor', '🎨'], ['Diarista / Limpeza', '🧹'],
  ['Jardineiro', '🌿'], ['Marceneiro', '🪚'], ['Serralheiro', '⚙️'], ['Mecânico', '🔧'], ['Técnico em informática', '💻'],
  ['Designer', '✏️'], ['Programador', '👨‍💻'], ['Fotógrafo', '📷'], ['Professor particular', '📚'], ['Cabeleireiro / Beleza', '💇'],
  ['Cozinheiro / Buffet', '🍳'], ['Motorista / Frete', '🚚'], ['Contador', '📊'], ['Advogado', '⚖️'], ['Cuidador / Babá', '🤝'], ['Ajudante geral', '💪'],
  ['Guia turístico', '🧭'], ['Passeios 4x4 e quadriciclo', '🚙'], ['Barqueiro / Passeio de barco', '🚤'], ['Instrutor de kitesurfe', '🪁'], ['Garçom / Atendente', '🍽️'], ['Mototáxi / Entregas', '🛵'], ['Trabalhador rural', '🌱'], ['Tratorista / Operador de máquinas', '🚜'], ['Técnico em refrigeração', '❄️'], ['Costureira', '🧵'],
  ['Outros', '🛠️'],
].map(([nome, icone], i) => ({ id: i + 1, nome, icone }));

// Fotos de exemplo desenhadas em SVG (a demonstração não pode carregar imagens de fora)
function fotoExemplo(titulo, c1, c2, simbolo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <g fill="#fff" fill-opacity=".10">${Array.from({ length: 8 }, (_, i) => `<rect x="0" y="${i * 75}" width="600" height="3"/>`).join('')}</g>
    <text x="300" y="300" font-size="180" text-anchor="middle" dominant-baseline="middle">${simbolo}</text>
    <rect x="0" y="480" width="600" height="120" fill="#000" fill-opacity=".35"/>
    <text x="300" y="545" font-family="sans-serif" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">${titulo}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Documento e selfie de exemplo (para a fila de verificação do admin)
function docExemplo(tipo, lado, nome, cor) {
  const svg = lado === 'selfie'
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#cbd5e1"/>
        <circle cx="150" cy="120" r="55" fill="#e7b98f"/><circle cx="132" cy="110" r="6" fill="#333"/><circle cx="168" cy="110" r="6" fill="#333"/>
        <path d="M128 140 q22 18 44 0" stroke="#333" stroke-width="5" fill="none"/><rect x="85" y="180" width="130" height="120" rx="40" fill="${cor}"/>
        <rect x="230" y="120" width="130" height="90" rx="8" fill="#fff" stroke="#64748b" stroke-width="3"/><rect x="242" y="134" width="34" height="42" fill="#94a3b8"/>
        <rect x="284" y="138" width="64" height="7" fill="#94a3b8"/><rect x="284" y="152" width="50" height="7" fill="#94a3b8"/>
        <text x="200" y="285" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#334155">SELFIE COM DOCUMENTO (EXEMPLO)</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect x="5" y="5" width="390" height="250" rx="16" fill="${cor}" stroke="#475569" stroke-width="3"/>
        <text x="20" y="38" font-family="sans-serif" font-size="18" font-weight="700" fill="#1e293b">${tipo} · ${lado.toUpperCase()} (EXEMPLO)</text>
        ${lado === 'frente' ? `<rect x="20" y="60" width="90" height="115" fill="#94a3b8"/><circle cx="65" cy="100" r="22" fill="#e7b98f"/>
        <text x="125" y="80" font-family="sans-serif" font-size="12" fill="#475569">NOME</text>
        <text x="125" y="100" font-family="sans-serif" font-size="17" font-weight="700" fill="#0f172a">${nome.toUpperCase()}</text>
        <text x="125" y="130" font-family="sans-serif" font-size="12" fill="#475569">VALIDADE</text><text x="125" y="148" font-family="sans-serif" font-size="15" fill="#0f172a">12/2031</text>`
        : '<rect x="20" y="70" width="360" height="10" fill="#94a3b8"/><rect x="20" y="95" width="300" height="10" fill="#94a3b8"/><rect x="20" y="120" width="330" height="10" fill="#94a3b8"/>'}
        <text x="20" y="235" font-family="monospace" font-size="13" fill="#475569">DOCUMENTO FICTÍCIO PARA DEMONSTRAÇÃO</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
// CPF fictício com dígitos verificadores válidos
function cpfFicticio(base) {
  const d = String(base).padStart(9, '0').slice(0, 9).split('').map(Number);
  for (let t = 9; t < 11; t++) { let soma = 0; for (let i = 0; i < t; i++) soma += d[i] * (t + 1 - i); d.push(((soma * 10) % 11) % 10); }
  return d.join('');
}

export const PERFIS_DEMO = {
  cliente: 'u-cliente', empresa: 'u-emp1', prestador: 'u-pedro', ajudante: 'u-aj1', admin: 'u-admin',
};

function perfil(id, nome, extra = {}) {
  return {
    id, nome, cidade: '', uf: '', bio: '', foto_url: '', categoria_id: null, preco_base: null,
    is_prestador: false, is_contratante: true, is_admin: false, verificado: false, suspenso: false, avisos: 0,
    cadastur_numero: '', cadastur_status: '', cadastur_motivo: '', curriculo: {},
    avaliacao_media: 0, avaliacao_qtd: 0, criado_em: agora(60 * 24 * 90), ...extra,
  };
}

// ---------- mais profissionais: pelo menos 3 por área, em várias cidades
const CIDADES_A = [['Barreirinhas', 'MA'], ['Tuntum', 'MA'], ['São Luís', 'MA'], ['Teresina', 'PI'], ['Caxias', 'MA'], ['Imperatriz', 'MA']];
const CIDADES_B = [['São Paulo', 'SP'], ['Fortaleza', 'CE'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Salvador', 'BA'], ['Recife', 'PE']];
const CIDADES_C = [['São Luís', 'MA'], ['Brasília', 'DF'], ['Goiânia', 'GO'], ['Curitiba', 'PR'], ['Manaus', 'AM'], ['Belém', 'PA'], ['Natal', 'RN'], ['Porto Alegre', 'RS']];
const PRIMEIROS = ['Antônio', 'Francisca', 'José', 'Maria', 'Raimundo', 'Joana', 'Carlos', 'Luzia', 'Paulo', 'Rita', 'Marcelo', 'Sandra', 'Rogério', 'Vanessa', 'Fábio', 'Tereza',
  'Wesley', 'Cláudia', 'Gustavo', 'Adriana', 'Rafael', 'Simone', 'Jorge', 'Patrícia', 'Leandro', 'Aline', 'Sebastião', 'Rosângela', 'Diego', 'Camila', 'Valdir', 'Elaine',
  'Mateus', 'Jéssica', 'Edson', 'Cristiane', 'Igor', 'Daniela', 'Benedito', 'Kátia', 'Hugo', 'Larissa', 'Nilton', 'Bruna', 'Davi', 'Michele', 'Otávio', 'Priscila'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Araújo', 'Gomes', 'Barbosa', 'Rocha', 'Moraes', 'Nascimento', 'Cardoso', 'Teixeira', 'Freitas', 'Batista'];
// id da área: [símbolo, cor 1, cor 2, preço base, [3 descrições], [legendas das fotos]]
const MAIS = {
  1: ['🧱', '#d6d3d1', '#57534e', 160, ['Pedreiro de acabamento: porcelanato, rejunte, revestimento de banheiro e cozinha. Serviço caprichado.', 'Pedreiro de obra: fundação, alvenaria, laje e reboco. Trabalho com equipe e cumpro prazo.', 'Reformas em geral: troca de piso, contrapiso, reboco e pequenos reparos. Orçamento sem compromisso.'], ['Banheiro em porcelanato', 'Reboco de fachada']],
  2: ['💡', '#fef08a', '#a16207', 120, ['Eletricista residencial: tomadas, chuveiro, disjuntor e quadro de distribuição.', 'Eletricista predial e comercial com NR10. Padrão de energia e iluminação de lojas.', 'Instalação de ventilador de teto, luminárias e revisão completa da parte elétrica.'], ['Quadro novo', 'Iluminação de loja']],
  3: ['🚰', '#99f6e4', '#0f766e', 120, ['Encanador: vazamentos, troca de registro, caixa d’água e desentupimento.', 'Instalação hidráulica de banheiro e cozinha, aquecedor e bomba d’água.', 'Caça-vazamento e conserto de cano estourado. Atendo no mesmo dia.'], ['Caixa d’água', 'Banheiro novo']],
  4: ['🎨', '#bfdbfe', '#1d4ed8', 180, ['Pintor residencial: massa corrida, textura e pintura de paredes e tetos.', 'Pintura de fachada e muros, grafiato e verniz em portas e janelas.', 'Pintura comercial rápida, inclusive à noite e fim de semana.'], ['Sala pintada', 'Fachada nova']],
  5: ['🧹', '#a7f3d0', '#047857', 130, ['Diarista: limpeza de casa e apartamento, passar e organizar.', 'Faxina pesada e limpeza pós-obra. Levo produtos se precisar.', 'Camareira e limpeza de casas de temporada entre um hóspede e outro.'], ['Cozinha limpa', 'Pós-obra']],
  6: ['🌿', '#bbf7d0', '#15803d', 120, ['Jardineiro: corte de grama, poda e limpeza de quintal.', 'Paisagismo, plantio de mudas e manutenção mensal de jardins.', 'Limpeza de terreno e roçagem com roçadeira.'], ['Jardim reformado', 'Poda de árvore']],
  7: ['🪚', '#e8d5b7', '#8b5a2b', 350, ['Marceneiro: móveis planejados, armários e cozinhas sob medida.', 'Conserto de móveis, portas e janelas de madeira.', 'Montagem e desmontagem de móveis para mudança.'], ['Armário planejado', 'Mesa rústica']],
  8: ['⚙️', '#cbd5e1', '#334155', 280, ['Serralheiro: portões, grades e janelas de ferro e alumínio.', 'Estruturas metálicas, coberturas e solda em geral.', 'Conserto de portão eletrônico e fechaduras.'], ['Portão novo', 'Cobertura metálica']],
  9: ['🔧', '#fecaca', '#b91c1c', 150, ['Mecânico de carro a domicílio: revisão, freios, suspensão e óleo.', 'Mecânico de moto: revisão, corrente, freio e parte elétrica.', 'Auto elétrica: bateria, alternador, motor de partida e som.'], ['Revisão completa', 'Troca de freio']],
  10: ['💻', '#c7d2fe', '#3730a3', 100, ['Técnico de informática: formatação, vírus e computador lento.', 'Instalação de rede, Wi-Fi e câmeras de segurança.', 'Conserto de notebook e celular, troca de tela e bateria.'], ['Rede instalada', 'Notebook consertado']],
  11: ['✏️', '#fde68a', '#d97706', 300, ['Designer: logotipo e identidade visual para pequenos negócios.', 'Artes para redes sociais, cardápios e panfletos.', 'Design de fachada, banner e cartão de visita.'], ['Logo de padaria', 'Cardápio']],
  12: ['👨‍💻', '#ddd6fe', '#6d28d9', 1200, ['Programador: sites e lojas virtuais com pagamento.', 'Aplicativos e sistemas sob medida para empresas.', 'Manutenção de sites e integração com WhatsApp e redes.'], ['Loja virtual', 'Painel de vendas']],
  13: ['📷', '#fce7f3', '#9d174d', 500, ['Fotógrafo de casamento, aniversário e eventos.', 'Fotos de produtos e cardápio para redes sociais.', 'Ensaios ao ar livre e fotos de família.'], ['Casamento', 'Ensaio na praia']],
  14: ['📚', '#e0f2fe', '#0369a1', 60, ['Professora de reforço escolar do 1º ao 9º ano.', 'Aulas de matemática e física para ENEM e vestibular.', 'Aulas de inglês para iniciantes e conversação.'], ['Turma de reforço', 'Material de aula']],
  15: ['💇', '#fbcfe8', '#be185d', 60, ['Cabeleireira: corte, escova, progressiva e coloração.', 'Barbeiro: corte masculino, barba e pigmentação.', 'Manicure, pedicure e maquiagem para eventos, em domicílio.'], ['Corte e escova', 'Maquiagem de noiva']],
  16: ['🍳', '#fef3c7', '#92400e', 600, ['Buffet para festas e aniversários, salgados e bolo.', 'Cozinheira para restaurantes e pousadas, comida regional.', 'Marmitas e quentinhas para empresas e obras.'], ['Mesa de festa', 'Comida regional']],
  17: ['🚚', '#fed7aa', '#c2410c', 150, ['Frete e pequenas mudanças com caminhonete.', 'Carreto de móveis e material de construção.', 'Motorista particular para viagens e transfer de aeroporto.'], ['Mudança completa', 'Carreto de material']],
  18: ['📊', '#e2e8f0', '#334155', 200, ['Contador: abertura de empresa, MEI e imposto de renda.', 'Folha de pagamento e contabilidade para pequenos negócios.', 'Regularização de CPF e CNPJ e declarações em atraso.'], ['Escritório', 'Abertura de empresa']],
  19: ['⚖️', '#e5e7eb', '#1f2937', 300, ['Advogada trabalhista e previdenciária: aposentadoria e INSS.', 'Advogado cível: contratos, inventário e família.', 'Direito do consumidor e pequenas causas.'], ['Atendimento', 'Consultoria']],
  20: ['🤝', '#fecdd3', '#be123c', 160, ['Cuidadora de idosos com curso, plantão diurno e noturno.', 'Babá com experiência e referências, meio período ou integral.', 'Acompanhante hospitalar e de consultas.'], ['Cuidado diário', 'Acompanhamento']],
  21: ['💪', '#d6d3d1', '#44403c', 90, ['Ajudante de pedreiro: carrego material, preparo massa e limpo a obra.', 'Ajudante de mudança e carga e descarga.', 'Serviços gerais: capina, limpeza de terreno e pequenos reparos.'], ['Preparo de massa', 'Carga e descarga']],
  22: ['🧭', '#7dd3fc', '#0e7490', 160, ['Guia de turismo: roteiros culturais e históricos da cidade.', 'Guia de natureza e trilhas, com fotos durante o passeio.', 'Guia bilíngue para grupos e estrangeiros.'], ['Grupo no passeio', 'Pôr do sol']],
  23: ['🚙', '#d9f99d', '#3f6212', 200, ['Passeio de 4x4 pelas dunas e lagoas, saídas de manhã e à tarde.', 'Quadriciclo com guia pelos Pequenos Lençóis e praias.', 'Transfer 4x4 para Atins e Caburé.'], ['Travessia', 'Dunas']],
  24: ['🚤', '#99f6e4', '#115e59', 120, ['Passeio de voadeira pelo rio, com paradas nas comunidades.', 'Barco para pesca esportiva e passeio ao entardecer.', 'Transfer de barco entre vilas e praias.'], ['No rio', 'Pôr do sol no barco']],
  25: ['🪁', '#bae6fd', '#1d4ed8', 350, ['Instrutor de kitesurfe certificado, aulas para iniciantes.', 'Aulas de windsurf e stand up paddle.', 'Aluguel de equipamento e downwind guiado.'], ['Aula de kite', 'Downwind']],
  26: ['🍽️', '#fde68a', '#b45309', 90, ['Garçom para festas, casamentos e eventos.', 'Atendente de restaurante e lanchonete, fins de semana.', 'Bartender e drinks para festas.'], ['Evento', 'Drinks']],
  27: ['🛵', '#fed7aa', '#ea580c', 10, ['Mototáxi rápido no centro e bairros.', 'Entregas de encomendas, documentos e delivery.', 'Moto-frete para empresas, rotas fixas.'], ['Entrega', 'Moto pronta']],
  28: ['🌱', '#d9f99d', '#4d7c0f', 80, ['Trabalhador rural: roçado, plantio e colheita.', 'Vaqueiro: manejo de gado, vacina e cerca.', 'Diária na fazenda: cerca, capina e limpeza de pasto.'], ['Roçado', 'Manejo do gado']],
  29: ['🚜', '#fde68a', '#854d0e', 250, ['Tratorista: grade, plantio e preparo de solo.', 'Operador de retroescavadeira para valas e terraplenagem.', 'Operador de máquinas pesadas com experiência em obra.'], ['Preparo de solo', 'Retroescavadeira']],
  30: ['❄️', '#e0f2fe', '#0369a1', 150, ['Instalação e limpeza de ar-condicionado split.', 'Conserto de geladeira, freezer e máquina de lavar.', 'Manutenção de câmara fria e refrigeração comercial.'], ['Split instalado', 'Freezer consertado']],
  31: ['🧵', '#fbcfe8', '#9d174d', 40, ['Costureira: ajustes, barra e consertos de roupa.', 'Uniformes e fardamento para escolas e empresas.', 'Roupas sob medida e vestidos de festa.'], ['Fardamento', 'Vestido de festa']],
  32: ['🛠️', '#e5e7eb', '#374151', 100, ['Faz-tudo: pequenos reparos, instalação de prateleira e chuveiro.', 'Montador de móveis e instalação de cortinas.', 'Chaveiro e conserto de fechaduras.'], ['Prateleiras', 'Montagem de móvel']],
};

function semente() {
  const P = (id, nome, cat, cidade, uf, bio, preco, media, qtd, verificado = false) =>
    perfil(id, nome, { categoria_id: cat, cidade, uf, bio, preco_base: preco, is_prestador: true, is_contratante: false, avaliacao_media: media, avaliacao_qtd: qtd, verificado });
  const profiles = [
    perfil('u-admin', 'Você (Administrador)', { is_admin: true, cidade: 'São Paulo', uf: 'SP' }),
    perfil('u-cliente', 'Mariana Souza', { cidade: 'São Paulo', uf: 'SP' }),
    perfil('u-empresa', 'Construtora Alfa Ltda', { cidade: 'São Paulo', uf: 'SP' }),
    P('u-pedro', 'Pedro Almeida', 1, 'São Paulo', 'SP', 'Pedreiro há 15 anos. Reboco, contrapiso, assentamento de piso e porcelanato, pequenas reformas. Atendo zona sul e centro.', 180, 4.8, 23, true),
    P('u-ana', 'Ana Lúcia Ferreira', 5, 'Campinas', 'SP', 'Diarista com experiência em residências e escritórios. Limpeza pesada pós-obra também.', 150, 4.9, 41, true),
    P('u-joao', 'João Batista Silva', 2, 'Rio de Janeiro', 'RJ', 'Eletricista NR10. Instalação de tomadas, chuveiro, quadro de distribuição e iluminação.', 120, 4.6, 17),
    P('u-rafa', 'Rafaela Costa', 3, 'São Paulo', 'SP', 'Encanadora. Vazamentos, troca de registros, desentupimento e instalação de aquecedor.', 130, 4.7, 12, true),
    P('u-lucas', 'Lucas Moreira', 11, 'Belo Horizonte', 'MG', 'Designer gráfico: logotipo, identidade visual, cardápios e posts para redes sociais.', 350, 5.0, 8),
    P('u-carla', 'Carla Mendes', 4, 'Curitiba', 'PR', 'Pintura residencial e comercial, textura, grafiato e massa corrida.', 200, 4.5, 9),
    P('u-bruno', 'Bruno Santos', 17, 'São Paulo', 'SP', 'Fretes e pequenas mudanças com Fiorino. Ajudante incluso.', 160, 4.4, 30),
    P('u-sofia', 'Sofia Ribeiro', 14, 'Salvador', 'BA', 'Professora de matemática e física. Reforço escolar e preparatório para o ENEM.', 80, 4.9, 15, true),
    // ajudantes
    P('u-aj1', 'Marcos Vinícius', 21, 'São Paulo', 'SP', 'Ajudante de pedreiro e serviços gerais. Carrego material, preparo massa, faço limpeza de obra. Disponível de segunda a sábado.', 100, 4.7, 19),
    P('u-aj2', 'Diego Rocha', 21, 'Curitiba', 'PR', 'Ajudante de mudança, carga e descarga. Experiência em depósito e transportadora.', 90, 4.5, 11, true),
    P('u-aj3', 'Juliana Prado', 21, 'Campinas', 'SP', 'Ajudante de cozinha e auxiliar de eventos: preparo, montagem de buffet e limpeza.', 110, 4.8, 14, true),
    P('u-aj4', 'Wellington Souza', 21, 'São Paulo', 'SP', 'Ajudante geral para obra, jardim e pequenos reparos. Pontual e caprichoso.', 95, 4.3, 6),
    P('u-aj5', 'Thiago Nunes', 21, 'Rio de Janeiro', 'RJ', 'Ajudante de eletricista. Passo fiação, abro canaleta e organizo material.', 100, 4.6, 8),
    P('u-aj6', 'Kelly Cristina', 21, 'Salvador', 'BA', 'Auxiliar de limpeza e camareira, com experiência em hotel e pousada.', 100, 4.9, 22, true),
    // outros profissionais
    P('u-fer', 'Fernando Dias', 7, 'São Paulo', 'SP', 'Marceneiro: móveis planejados, armários, portas e reparos em madeira.', 400, 4.8, 27, true),
    P('u-paulo', 'Paulo Henrique', 8, 'Recife', 'PE', 'Serralheiro: portões, grades, estruturas metálicas e solda em geral.', 300, 4.6, 13),
    P('u-renato', 'Renato Gomes', 9, 'Goiânia', 'GO', 'Mecânico automotivo a domicílio: revisão, freios, suspensão e elétrica.', 150, 4.5, 21),
    P('u-camila', 'Camila Torres', 12, 'Florianópolis', 'SC', 'Programadora: sites, lojas virtuais e sistemas sob medida para pequenas empresas.', 1500, 5.0, 6, true),
    P('u-bia', 'Beatriz Lopes', 13, 'São Paulo', 'SP', 'Fotógrafa de eventos, produtos e ensaios. Entrego as fotos editadas em 7 dias.', 600, 4.9, 18, true),
    P('u-pati', 'Patrícia Alves', 15, 'Rio de Janeiro', 'RJ', 'Cabeleireira e maquiadora. Atendo em domicílio para noivas e eventos.', 120, 4.7, 35),
    P('u-chef', 'Antônio Reis', 16, 'São Paulo', 'SP', 'Cozinheiro e buffet para eventos de 20 a 200 pessoas. Cardápio personalizado.', 900, 4.8, 16, true),
    P('u-helena', 'Helena Martins', 18, 'Belo Horizonte', 'MG', 'Contadora: abertura de empresa, MEI, imposto de renda e folha de pagamento.', 250, 4.9, 29, true),
    P('u-ricardo', 'Ricardo Pires', 19, 'Brasília', 'DF', 'Advogado trabalhista e cível. Consultas e acompanhamento de processos.', 300, 4.6, 10),
    P('u-cida', 'Aparecida Oliveira', 20, 'Campinas', 'SP', 'Cuidadora de idosos com curso técnico. Plantões diurnos e noturnos.', 180, 5.0, 12, true),
    P('u-sergio', 'Sérgio Ramos', 6, 'São Paulo', 'SP', 'Jardineiro: poda, corte de grama, paisagismo e manutenção mensal.', 140, 4.6, 24),
    P('u-andre', 'André Luiz', 10, 'Rio de Janeiro', 'RJ', 'Técnico de informática: formatação, redes, câmeras e manutenção de computadores.', 120, 4.7, 31),
    // Barreirinhas (MA) — portão dos Lençóis Maranhenses
    P('u-br1', 'Raimundo Nonato', 22, 'Barreirinhas', 'MA', 'Guia de turismo credenciado. Lagoa Azul, Lagoa Bonita e circuito das lagoas. Conto a história da região e das comunidades. Falo espanhol básico.', 150, 4.9, 64, true),
    P('u-br2', 'Luana Ferreira', 22, 'Barreirinhas', 'MA', 'Guia bilíngue (português e inglês). Roteiros para estrangeiros, Atins e Caburé, nascer do sol nas dunas.', 220, 5.0, 31, true),
    P('u-br3', 'Francisco das Chagas', 23, 'Barreirinhas', 'MA', 'Motorista de 4x4 (Toyota) para o Parque Nacional dos Lençóis: travessia de balsa e circuito das lagoas. Grupos de até 10 pessoas.', 200, 4.8, 88, true),
    P('u-br4', 'Edivaldo Sousa', 24, 'Barreirinhas', 'MA', 'Barqueiro no Rio Preguiças: voadeira para Vassouras, Mandacaru e Caburé. Passeios privativos e transfer para Atins.', 120, 4.7, 52),
    P('u-br5', 'Thiago Mendes', 25, 'Barreirinhas', 'MA', 'Instrutor de kitesurfe em Atins com certificação. Aulas para iniciantes, aluguel de equipamento e downwind.', 350, 4.9, 27, true),
    P('u-br6', 'Josiane Carvalho', 26, 'Barreirinhas', 'MA', 'Garçonete e atendente com experiência em restaurante e pousada. Disponível para alta temporada e eventos.', 90, 4.6, 15),
    P('u-br7', 'Maria do Socorro', 5, 'Barreirinhas', 'MA', 'Camareira e diarista para pousadas e casas de temporada. Troca de enxoval e limpeza entre hóspedes.', 100, 4.8, 40, true),
    P('u-br8', 'Ronaldo Lima', 27, 'Barreirinhas', 'MA', 'Mototáxi e entregas no centro e na Beira-Rio. Levo encomendas para pousadas e restaurantes.', 10, 4.5, 120),
    P('u-br10', 'Cícero Araújo', 22, 'Barreirinhas', 'MA', 'Guia de turismo nascido em Barreirinhas. Circuito Lagoa Azul, Canto do Atins e comunidades de Mandacaru.', 140, 4.6, 9),
    P('u-br9', 'Antônio Cutrim', 30, 'Barreirinhas', 'MA', 'Instalação e manutenção de ar-condicionado split. Atendo pousadas, hotéis e residências.', 180, 4.7, 33),
    // Tuntum (MA) — comércio, construção e campo
    P('u-tt1', 'José Wilson', 28, 'Tuntum', 'MA', 'Trabalhador rural: roçado, plantio de milho e mandioca, cerca e diária na fazenda.', 80, 4.6, 22),
    P('u-tt2', 'Manoel Pereira', 29, 'Tuntum', 'MA', 'Tratorista com experiência em grade, plantio e preparo de solo. Opero retroescavadeira.', 250, 4.8, 18, true),
    P('u-tt3', 'Gilvan Rodrigues', 1, 'Tuntum', 'MA', 'Pedreiro: casas, muros, reboco e assentamento de bloco. Trabalho com equipe.', 150, 4.7, 36, true),
    P('u-tt4', 'Cleiton Alves', 2, 'Tuntum', 'MA', 'Eletricista residencial e rural: padrão de energia, instalação de bomba e quadro.', 120, 4.6, 19),
    P('u-tt5', 'Francisca Lima', 31, 'Tuntum', 'MA', 'Costureira: ajustes, fardamento escolar e uniformes para empresas.', 40, 4.9, 47, true),
    P('u-tt6', 'Adailton Sousa', 30, 'Tuntum', 'MA', 'Técnico em refrigeração: ar-condicionado, geladeira e freezer comercial.', 150, 4.5, 14),
    P('u-tt7', 'Erivaldo Costa', 27, 'Tuntum', 'MA', 'Mototáxi e entregas na cidade e povoados próximos.', 8, 4.4, 75),
    P('u-tt8', 'Luciano Barros', 21, 'Tuntum', 'MA', 'Ajudante de pedreiro e carga/descarga em depósito de material de construção.', 80, 4.5, 12),
    // empresários e empresas que contratam
    perfil('u-emp1', 'Construtora Horizonte', { cidade: 'São Paulo', uf: 'SP', verificado: true }),
    perfil('u-emp2', 'Restaurante Sabor da Terra', { cidade: 'Campinas', uf: 'SP' }),
    perfil('u-emp3', 'Condomínio Jardim das Flores', { cidade: 'São Paulo', uf: 'SP', verificado: true }),
    perfil('u-emp4', 'Transportadora Rota Sul', { cidade: 'Curitiba', uf: 'PR', verificado: true }),
    perfil('u-emp5', 'Hotel Recanto Azul', { cidade: 'Salvador', uf: 'BA' }),
    perfil('u-emp6', 'Roberto Lima (Casa do Construtor BH)', { cidade: 'Belo Horizonte', uf: 'MG' }),
    perfil('u-emp7', 'Clínica Bem Viver', { cidade: 'Rio de Janeiro', uf: 'RJ', verificado: true }),
    perfil('u-emp8', 'Eventos Ponto Alto', { cidade: 'São Paulo', uf: 'SP' }),
    perfil('u-emp9', 'Pousada Dunas do Preguiças', { cidade: 'Barreirinhas', uf: 'MA', verificado: true }),
    perfil('u-emp10', 'Agência Rota dos Lençóis', { cidade: 'Barreirinhas', uf: 'MA', verificado: true }),
    perfil('u-emp11', 'Restaurante Beira-Rio', { cidade: 'Barreirinhas', uf: 'MA' }),
    perfil('u-emp12', 'Fazenda Boa Esperança', { cidade: 'Tuntum', uf: 'MA' }),
    perfil('u-emp13', 'Depósito Central Materiais de Construção', { cidade: 'Tuntum', uf: 'MA', verificado: true }),
  ];
  // gera os profissionais extras de cada área
  const extrasFotos = [];
  let n = 0;
  for (const [cat, [simb, c1, c2, preco, bios, legendas]] of Object.entries(MAIS)) {
    const k = Number(cat);
    bios.forEach((bio, j) => {
      const cidade = j === 0 ? CIDADES_A[k % CIDADES_A.length] : j === 1 ? CIDADES_B[k % CIDADES_B.length] : CIDADES_C[k % CIDADES_C.length];
      const nome = `${PRIMEIROS[n % PRIMEIROS.length]} ${SOBRENOMES[(n * 7 + 3) % SOBRENOMES.length]}`;
      const id = `g-${k}-${j}`;
      const media = Math.round((4.3 + ((n * 37) % 8) / 10) * 10) / 10;
      profiles.push(P(id, nome, k, cidade[0], cidade[1], bio, Math.round(preco * (0.85 + j * 0.15)), Math.min(5, media), 3 + ((n * 13) % 80), n % 2 === 0));
      if (j < 2) extrasFotos.push([id, legendas[j], c1, c2, simb, 3 + (n % 20)]);
      n++;
    });
    // garante todas as áreas também em Barreirinhas e em Tuntum
    for (const [cid, uf] of [['Barreirinhas', 'MA'], ['Tuntum', 'MA']]) {
      if (profiles.some((p) => p.categoria_id === k && p.cidade === cid)) continue;
      const nome = `${PRIMEIROS[n % PRIMEIROS.length]} ${SOBRENOMES[(n * 7 + 3) % SOBRENOMES.length]}`;
      const media = Math.round((4.3 + ((n * 37) % 8) / 10) * 10) / 10;
      profiles.push(P(`g-${k}-${cid[0]}`, nome, k, cid, uf, bios[n % 3], preco, Math.min(5, media), 2 + ((n * 11) % 60), n % 3 === 0));
      n++;
    }
  }
  // currículos de exemplo
  const CURRICULOS = {
    'u-pedro': { experiencia: 'Mais de 10 anos', servicos: ['Reboco', 'Contrapiso', 'Assentamento de piso', 'Porcelanato', 'Alvenaria (levantar parede)', 'Pequenos reparos', 'Reforma completa'],
      trabalhos: [{ funcao: 'Pedreiro', local: 'Construtora', tempo: 'Mais de 5 anos' }, { funcao: 'Mestre de obras', local: 'Por conta própria', tempo: 'Ainda trabalho lá' }],
      escolaridade: 'Médio completo', cursos: [{ nome: 'Assentador de revestimento', onde: 'SENAI', ano: '2014' }, { nome: 'NR-35 Trabalho em altura', onde: 'SENAI', ano: '2021' }],
      equipamentos: ['Ferramentas próprias', 'Cortador de piso', 'Nível a laser'], dias: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], turnos: ['Manhã', 'Tarde'],
      areas: 'Zona sul e centro', idiomas: ['Português'], diferenciais: ['Sou pontual', 'Deixo o local limpo', 'Dou garantia do serviço', 'Orçamento sem compromisso'] },
    'u-br1': { experiencia: 'Mais de 10 anos', servicos: ['Lagoa Azul', 'Lagoa Bonita', 'Circuito Lagoas', 'Vassouras e Mandacaru', 'Grupos'],
      trabalhos: [{ funcao: 'Guia de turismo', local: 'Agência de turismo', tempo: 'Mais de 5 anos' }], escolaridade: 'Médio completo',
      cursos: [{ nome: 'Guia de turismo regional (credenciado)', onde: 'SENAC', ano: '2012' }, { nome: 'Primeiros socorros', onde: 'SENAC', ano: '2022' }],
      equipamentos: ['Kit de primeiros socorros'], dias: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], turnos: ['Manhã', 'Tarde', 'Feriados'],
      areas: 'Barreirinhas, Atins e Caburé', idiomas: ['Português', 'Espanhol'], diferenciais: ['Sou pontual', 'Tenho referências de clientes'] },
  };
  for (const p of profiles) if (CURRICULOS[p.id]) p.curriculo = CURRICULOS[p.id];
  const contatos_privados = profiles.map((p, i) => ({
    user_id: p.id, whatsapp: `11 9${String(8000 + ((i * 137) % 1999)).padStart(4, '0')}-${String(1000 + i * 71).slice(0, 4)}`,
    email: `${p.nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@exemplo.com`, chave_pix: p.is_prestador ? `${p.nome.split(' ')[0].toLowerCase()}@pix.exemplo` : '',
  }));
  const conversas = [
    { id: 'c-1', contratante_id: 'u-cliente', prestador_id: 'u-pedro', criado_em: agora(180) },
    { id: 'c-2', contratante_id: 'u-empresa', prestador_id: 'u-pedro', criado_em: agora(60 * 24 * 10) },
    { id: 'c-3', contratante_id: 'u-emp1', prestador_id: 'u-pedro', criado_em: agora(90) },
    { id: 'c-4', contratante_id: 'u-emp3', prestador_id: 'u-pedro', criado_em: agora(40) },
  ];
  let mid = 1;
  const M = (conv, autor, texto, min, bloqueada = false) => ({ id: mid++, conversa_id: conv, autor_id: autor, texto, bloqueada, criado_em: agora(min) });
  const mensagens = [
    M('c-1', 'u-cliente', 'Olá Pedro! Preciso rebocar uma parede de uns 20m² no meu apartamento. Você faz?', 175),
    M('c-1', 'u-pedro', 'Faço sim, Mariana! O material fica por sua conta ou incluo no orçamento?', 170),
    M('c-1', 'u-cliente', 'Pode ser por minha conta. Quando você poderia começar?', 165),
    M('c-1', 'u-pedro', '🚫 Mensagem bloqueada: não é permitido passar contato antes da contratação. Após o pagamento pelo app, o WhatsApp é liberado automaticamente.', 160, true),
    M('c-1', 'u-pedro', 'Desculpe! Posso começar na segunda. Vou te mandar a proposta aqui pelo app.', 158),
    M('c-2', 'u-empresa', 'Pedro, precisamos de contrapiso em 3 salas comerciais.', 60 * 24 * 10),
    M('c-2', 'u-pedro', 'Combinado, segue a proposta.', 60 * 24 * 10 - 5),
    // clientes chamando o Pedro (aparecem como mensagens novas)
    M('c-3', 'u-emp1', 'Olá! Vi seu perfil no Contrata Aí e gostaria de um orçamento.', 85),
    M('c-3', 'u-emp1', 'Temos um muro de 30 metros para levantar em Pinheiros. Consegue começar semana que vem?', 80),
    M('c-4', 'u-emp3', 'Olá! Vi seu perfil no Contrata Aí e gostaria de um orçamento.', 38),
    M('c-4', 'u-emp3', 'Precisamos trocar o piso do salão de festas do condomínio, uns 60 m².', 35),
    M('c-4', 'u-emp3', 'Pode passar aqui para medir?', 33),
  ];
  const ct = (id, conv, contratante, prestador, descricao, valor, status, extra = {}) => ({
    id, conversa_id: conv, contratante_id: contratante, prestador_id: prestador, descricao, valor, taxa_comissao: 0.1,
    status, mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora(150), entrada_pct: 100, valor_pago: 0, ...extra,
  });
  const contratacoes = [
    ct('k-1', 'c-1', 'u-cliente', 'u-pedro', 'Reboco de parede de 20m² (material por conta da cliente). 2 dias de serviço.', 1500, 'proposta', { entrada_pct: 30 }),
    ct('k-2', 'c-2', 'u-empresa', 'u-pedro', 'Contrapiso em 3 salas comerciais (60m²).', 4200, 'concluida',
      { pago_em: agora(60 * 24 * 9), concluido_em: agora(60 * 24 * 2), criado_em: agora(60 * 24 * 10), valor_pago: 4200 }),
  ];
  const avaliacoes = [
    { contratacao_id: 'k-2', prestador_id: 'u-pedro', autor_id: 'u-empresa', nota: 5, comentario: 'Serviço caprichado e entregue no prazo.', criado_em: agora(60 * 24 * 2) },
  ];
  const tentativas_burla = [
    { id: 1, user_id: 'u-pedro', conversa_id: 'c-1', onde: 'chat', texto_original: 'me chama no zap que a gente combina melhor', criado_em: agora(160) },
  ];
  profiles.find((p) => p.id === 'u-pedro').avisos = 1;
  // Cadastur: dois guias e o 4x4 já conferidos; um guia esperando o admin
  for (const [id, num, st] of [['u-br1', '21.003418.10.0001-7', 'aprovado'], ['u-br2', '21.004752.10.0002-3', 'aprovado'],
    ['u-br3', '21.002199.30.0001-5', 'aprovado'], ['u-br10', '21.006031.10.0001-2', 'pendente']]) {
    Object.assign(profiles.find((p) => p.id === id), { cadastur_numero: num, cadastur_status: st });
  }
  let fid = 1;
  const F = (user, legenda, c1, c2, simbolo, diasAtras) => ({
    id: fid++, user_id: user, url: fotoExemplo(legenda, c1, c2, simbolo), caminho: `${user}/exemplo-${fid}.svg`, legenda, criado_em: agora(60 * 24 * diasAtras),
  });
  const fotos_trabalhos = [
    F('u-pedro', 'Reboco de fachada', '#a8a29e', '#57534e', '🧱', 40), F('u-pedro', 'Porcelanato 60x60', '#d6d3d1', '#78716c', '◼️', 25),
    F('u-pedro', 'Contrapiso nivelado', '#9ca3af', '#4b5563', '📐', 12), F('u-pedro', 'Muro de bloco', '#b45309', '#78350f', '🏗️', 5),
    F('u-ana', 'Limpeza pós-obra', '#7dd3fc', '#0369a1', '✨', 20), F('u-ana', 'Cozinha impecável', '#a7f3d0', '#047857', '🧽', 8),
    F('u-lucas', 'Logo para padaria', '#fde68a', '#d97706', '🥐', 30), F('u-lucas', 'Cardápio', '#fecaca', '#b91c1c', '📋', 15),
    F('u-lucas', 'Posts Instagram', '#ddd6fe', '#6d28d9', '📱', 3),
    F('u-carla', 'Textura grafiato', '#fbcfe8', '#be185d', '🎨', 18), F('u-carla', 'Sala pintada', '#bfdbfe', '#1d4ed8', '🖌️', 6),
    F('u-rafa', 'Troca de registro', '#99f6e4', '#0f766e', '🚰', 9), F('u-joao', 'Quadro de distribuição', '#fef08a', '#a16207', '💡', 11),
    F('u-aj1', 'Preparo de massa', '#d6d3d1', '#57534e', '🪣', 14), F('u-aj1', 'Limpeza de obra', '#e7e5e4', '#78716c', '🧹', 4),
    F('u-aj2', 'Mudança completa', '#fed7aa', '#c2410c', '📦', 10), F('u-aj3', 'Buffet montado', '#fde68a', '#b45309', '🍽️', 7),
    F('u-aj6', 'Quarto de hotel', '#bae6fd', '#0369a1', '🛏️', 9), F('u-fer', 'Armário planejado', '#d9c2a6', '#7c4a1e', '🚪', 20),
    F('u-fer', 'Mesa de madeira', '#e8d5b7', '#8b5a2b', '🪵', 6), F('u-bia', 'Casamento', '#fce7f3', '#9d174d', '💍', 12),
    F('u-chef', 'Buffet de casamento', '#fef3c7', '#92400e', '🍲', 15), F('u-sergio', 'Paisagismo', '#bbf7d0', '#15803d', '🌳', 8),
    F('u-br1', 'Lagoa Azul', '#7dd3fc', '#0e7490', '🏝️', 6), F('u-br1', 'Dunas ao pôr do sol', '#fde68a', '#c2410c', '🌅', 12),
    F('u-br2', 'Grupo em Atins', '#a5f3fc', '#0369a1', '🧭', 9), F('u-br3', 'Travessia da balsa', '#d9f99d', '#3f6212', '🚙', 7),
    F('u-br4', 'Rio Preguiças', '#99f6e4', '#115e59', '🚤', 5), F('u-br5', 'Aula em Atins', '#bae6fd', '#1d4ed8', '🪁', 4),
    F('u-tt2', 'Preparo de solo', '#fde68a', '#854d0e', '🚜', 9), F('u-tt3', 'Casa entregue', '#e7e5e4', '#57534e', '🏠', 15),
    F('u-tt5', 'Fardamento escolar', '#fbcfe8', '#9d174d', '🧵', 6),
  ];
  extrasFotos.forEach(([id, leg, c1, c2, simb, dias]) => fotos_trabalhos.push(F(id, leg, c1, c2, simb, dias)));
  // verificações de identidade esperando o admin
  const docs = {};
  const V = (id, user, nome, tipo, cor, base, horasAtras, verso) => {
    const pasta = `${user}/exemplo-doc`;
    docs[`${pasta}-frente`] = docExemplo(tipo, 'frente', nome, cor);
    if (verso) docs[`${pasta}-verso`] = docExemplo(tipo, 'verso', nome, cor);
    docs[`${pasta}-selfie`] = docExemplo(tipo, 'selfie', nome, cor);
    return { id, user_id: user, cpf: cpfFicticio(base), tipo_documento: tipo, doc_frente: `${pasta}-frente`, doc_verso: verso ? `${pasta}-verso` : null,
      selfie: `${pasta}-selfie`, status: 'pendente', motivo: '', criado_em: agora(60 * horasAtras), analisado_em: null };
  };
  const verificacoes = [
    V(1, 'u-aj4', 'Wellington Souza', 'CNH', '#bbf7d0', 123456789, 5, false),
    V(2, 'u-carla', 'Carla Mendes', 'RG', '#bfdbfe', 987654321, 20, true),
    V(3, 'u-emp2', 'Restaurante Sabor da Terra', 'CNH', '#fde68a', 456123789, 30, false),
  ];
  // pedidos publicados por empresas e clientes
  const PD = (id, dono, titulo, cat, cidade, uf, vagas, orcamento, descricao, horasAtras) =>
    ({ id, contratante_id: dono, titulo, descricao, categoria_id: cat, cidade, uf, vagas, orcamento, status: 'aberto', criado_em: agora(60 * horasAtras),
      prazo: ['Esta semana', 'Próxima semana', 'Este mês', 'Urgente', 'Sem pressa'][id.length % 5] });
  const pedidos = [
    PD('pd-1', 'u-emp1', '3 ajudantes de obra por 10 dias', 21, 'São Paulo', 'SP', 3, 4500, 'Obra residencial na zona sul. Diária de R$ 150 por ajudante, das 7h às 16h. Almoço incluso.', 2),
    PD('pd-2', 'u-emp1', 'Pedreiro para acabamento de 4 apartamentos', 1, 'São Paulo', 'SP', 2, 12000, 'Assentamento de porcelanato e rejunte. Material fornecido pela construtora.', 26),
    PD('pd-3', 'u-emp2', 'Ajudante de cozinha para fins de semana', 21, 'Campinas', 'SP', 2, null, 'Sexta, sábado e domingo, das 17h às 23h. Experiência com preparo e limpeza.', 6),
    PD('pd-4', 'u-emp3', 'Pintura da fachada do condomínio', 4, 'São Paulo', 'SP', 1, 28000, 'Prédio de 8 andares. Precisa de equipe com balancinho e NR35.', 50),
    PD('pd-5', 'u-emp3', 'Jardineiro mensal para áreas comuns', 6, 'São Paulo', 'SP', 1, 900, 'Duas visitas por semana: poda, grama e jardim da entrada.', 72),
    PD('pd-6', 'u-emp4', 'Ajudantes para carga e descarga', 21, 'Curitiba', 'PR', 4, 3200, 'Turno da manhã, segunda a sexta, por 2 semanas. Necessário levantar peso.', 9),
    PD('pd-7', 'u-emp5', 'Eletricista para revisão do hotel', 2, 'Salvador', 'BA', 1, 3500, 'Revisão do quadro geral e troca de iluminação de 30 quartos.', 30),
    PD('pd-8', 'u-emp5', 'Camareira para alta temporada', 21, 'Salvador', 'BA', 3, null, 'Dezembro a fevereiro. Experiência em hotelaria.', 12),
    PD('pd-9', 'u-emp6', 'Designer para identidade visual da loja', 11, 'Belo Horizonte', 'MG', 1, 2500, 'Logotipo, fachada e cartão de visita para loja de materiais de construção.', 40),
    PD('pd-10', 'u-emp7', 'Técnico para manutenção de 12 computadores', 10, 'Rio de Janeiro', 'RJ', 1, 1800, 'Limpeza, formatação e rede da recepção e consultórios.', 18),
    PD('pd-11', 'u-emp8', 'Fotógrafo e cozinheiro para evento corporativo', 13, 'São Paulo', 'SP', 2, 5000, 'Evento para 120 pessoas no dia 20. Procuramos fotógrafo e buffet.', 4),
    PD('pd-12', 'u-cliente', 'Diarista quinzenal para apartamento', 5, 'São Paulo', 'SP', 1, 300, 'Apartamento de 2 quartos em Pinheiros. Preferência às sextas.', 3),
    PD('pd-13', 'u-emp10', 'Guias de turismo para a alta temporada', 22, 'Barreirinhas', 'MA', 4, null, 'Julho a setembro, roteiros Lagoa Azul e Lagoa Bonita. Necessário credenciamento. Inglês é diferencial.', 1),
    PD('pd-14', 'u-emp10', 'Motoristas de 4x4 com experiência no parque', 23, 'Barreirinhas', 'MA', 3, null, 'Saídas às 8h e 14h. Veículo da agência. Experiência com travessia da balsa.', 5),
    PD('pd-15', 'u-emp9', 'Camareiras para a temporada de férias', 5, 'Barreirinhas', 'MA', 2, 2600, 'Pousada com 18 quartos, de dezembro a fevereiro. Escala 6x1.', 8),
    PD('pd-16', 'u-emp9', 'Manutenção de 18 aparelhos de ar-condicionado', 30, 'Barreirinhas', 'MA', 1, 1800, 'Limpeza e revisão antes da temporada. Splits de 9 e 12 mil BTUs.', 20),
    PD('pd-17', 'u-emp11', 'Garçons para fins de semana', 26, 'Barreirinhas', 'MA', 3, null, 'Sexta a domingo, das 11h às 23h, na Beira-Rio.', 6),
    PD('pd-18', 'u-emp12', 'Trabalhadores rurais para colheita de milho', 28, 'Tuntum', 'MA', 6, 4800, 'Diária de R$ 80, 10 dias. Transporte saindo da cidade às 6h.', 4),
    PD('pd-19', 'u-emp12', 'Tratorista para preparo de solo', 29, 'Tuntum', 'MA', 1, 3000, '40 hectares. Trator da fazenda. Início na próxima semana.', 10),
    PD('pd-20', 'u-emp13', 'Ajudantes para carga e descarga no depósito', 21, 'Tuntum', 'MA', 2, null, 'Segunda a sábado, manhã. Descarga de blocos, cimento e telhas.', 7),
  ];
  return {
    users: profiles.map((p) => ({ id: p.id, email: contatos_privados.find((c) => c.user_id === p.id).email, senha: 'demo123' })),
    categorias: CATEGORIAS, profiles, contatos_privados, conversas, mensagens, contratacoes, avaliacoes, tentativas_burla, fotos_trabalhos,
    verificacoes, pedidos, docs, pagamentos: [{ id: 'pg-1', contratacao_id: 'k-2', tipo: 'total', valor: 4200, parcelas: 1, forma: 'pix', criado_em: agora(60 * 24 * 9) }], favoritos: [{ user_id: 'u-cliente', prestador_id: 'u-pedro', criado_em: agora(600) }],
    suporte_mensagens: [
      { id: 1, usuario_id: 'u-aj1', autor_id: 'u-aj1', texto: 'Boa tarde! Não sei o que escrever no meu currículo. Pode me ajudar?', lida: false, criado_em: agora(35) },
      { id: 2, usuario_id: 'u-cliente', autor_id: 'u-cliente', texto: 'Como faço para pagar parcelado no cartão?', lida: true, criado_em: agora(60 * 26) },
      { id: 3, usuario_id: 'u-cliente', autor_id: 'u-admin', texto: 'Olá, Mariana! Quando o profissional mandar a proposta, toque em Pagar e escolha Cartão. Dá para dividir em até 12x.', lida: true, criado_em: agora(60 * 25) },
    ],
    seq: { mensagens: mid, tentativas_burla: 2, fotos_trabalhos: fid, verificacoes: 4, suporte: 4 }, sessao: null,
  };
}

// ------------------------------------------------------------------ armazenamento
function carregar() {
  try { const s = localStorage.getItem(CHAVE); if (s) return JSON.parse(s); } catch { /* sem storage */ }
  // demonstração nova: conversas antigas já lidas; ficam novas só as dos clientes que acabaram de chamar o Pedro
  try {
    const lida = new Date(Date.now() - 60 * 60000).toISOString();
    localStorage.setItem('contrata-lidas-u-pedro', JSON.stringify({ 'c-1': new Date().toISOString(), 'c-2': lida }));
    localStorage.setItem('contrata-lidas-u-cliente', JSON.stringify({ 'c-1': new Date().toISOString() }));
    localStorage.setItem('contrata-lidas-u-empresa', JSON.stringify({ 'c-2': new Date().toISOString() }));
  } catch { /* sem storage */ }
  return semente();
}
let db = carregar();
// acréscimos de versões novas sem apagar o que a pessoa já fez na demonstração
db.config_pagamento ||= [{ id: 1, pix_chave: 'pix@contrataai.exemplo', pix_nome: 'Contrata Ai', pix_cidade: 'Barreirinhas' }];
db.avisos_pix ||= [];
db.seq.avisos_pix ||= 1;
let semStorage = false;
const salvar = () => {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); return true; } catch (e) {
    // sem storage (janela privada): segue só na memória; espaço cheio: avisa
    if (e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '')) return false;
    semStorage = true; return true;
  }
};
void semStorage;

// ------------------------------------------------------------------ regras (como no banco)
const uid = () => db.sessao;
const eu = () => db.profiles.find((p) => p.id === uid());
const isAdmin = () => !!eu()?.is_admin;
const conversa = (id) => db.conversas.find((c) => c.id === id);
const participa = (convId) => { const c = conversa(convId); return c && [c.contratante_id, c.prestador_id].includes(uid()); };
const liberado = (a, b) => db.contratacoes.some((x) => ['paga', 'concluida'].includes(x.status)
  && ((x.contratante_id === a && x.prestador_id === b) || (x.contratante_id === b && x.prestador_id === a)));
const comCalculados = (x) => ({ ...x, comissao: r2(x.valor * x.taxa_comissao), valor_prestador: r2(x.valor - r2(x.valor * x.taxa_comissao)) });

const VISIVEL = {
  contatos_privados: (r) => r.user_id === uid() || isAdmin(),
  conversas: (r) => [r.contratante_id, r.prestador_id].includes(uid()) || isAdmin(),
  mensagens: (r) => participa(r.conversa_id) || isAdmin(),
  contratacoes: (r) => [r.contratante_id, r.prestador_id].includes(uid()) || isAdmin(),
  tentativas_burla: () => isAdmin(),
  verificacoes: (r) => r.user_id === uid() || isAdmin(),
  pedidos: (r) => r.status === 'aberto' || r.contratante_id === uid() || isAdmin(),
  favoritos: (r) => r.user_id === uid(),
  suporte_mensagens: (r) => r.usuario_id === uid() || isAdmin(),
  config_pagamento: () => !!uid(),
  avisos_pix: (r) => isAdmin() || db.contratacoes.some((c) => c.id === r.contratacao_id && [c.contratante_id, c.prestador_id].includes(uid())),
  pagamentos: (r) => isAdmin() || db.contratacoes.some((c) => c.id === r.contratacao_id && [c.contratante_id, c.prestador_id].includes(uid())),
};
const EDITAVEL = {
  profiles: ['nome', 'cidade', 'uf', 'bio', 'foto_url', 'categoria_id', 'preco_base', 'is_prestador', 'is_contratante', 'curriculo'],
  contatos_privados: ['whatsapp', 'chave_pix'],
  pedidos: ['status'],
};

function registrarBurla(user, conv, onde, texto) {
  db.tentativas_burla.push({ id: db.seq.tentativas_burla++, user_id: user, conversa_id: conv, onde, texto_original: texto, criado_em: agora() });
  const p = db.profiles.find((x) => x.id === user);
  p.avisos += 1;
  if (p.avisos >= 3) p.suspenso = true;
}

const erro = (message) => ({ data: null, error: { message } });
// Confere cada texto do currículo (como public.curriculo_tem_contato no banco)
function curriculoTemContato(c) {
  if (c == null) return false;
  if (typeof c === 'string') return temContato(c);
  if (typeof c === 'object') return Object.values(c).some(curriculoTemContato);
  return false;
}

// ------------------------------------------------------------------ tempo real (mesmo navegador)
let ouvintes = [];
function emitir(table, event, row) {
  for (const o of ouvintes) {
    if (o.table !== table || (o.event !== '*' && o.event !== event)) continue;
    if (o.filter) { const [col, val] = o.filter.split('=eq.'); if (String(row[col]) !== val) continue; }
    setTimeout(() => o.cb({ new: row }), 0);
  }
}

// ------------------------------------------------------------------ select com "embeds"
function partesSelect(sel) {
  const out = []; let nivel = 0, atual = '';
  for (const ch of sel) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel--;
    if (ch === ',' && nivel === 0) { out.push(atual.trim()); atual = ''; } else atual += ch;
  }
  if (atual.trim()) out.push(atual.trim());
  return out;
}
function projetar(row, sel) {
  const partes = partesSelect(sel || '*');
  const out = {};
  for (const p of partes) {
    const m = /^(\w+):(\w+)\((.*)\)$/.exec(p);
    if (m) {
      const ref = db.profiles.find((x) => x.id === row[m[2]]);
      out[m[1]] = ref ? projetar(ref, m[3]) : null;
    } else if (p === '*') Object.assign(out, row);
    else out[p] = row[p];
  }
  return out;
}
const likeRe = (p) => new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
const linhas = (t) => (t === 'contratacoes' ? db.contratacoes.map(comCalculados) : db[t] || []);

class Consulta {
  constructor(tabela) { Object.assign(this, { t: tabela, f: [], op: 'select', sel: '*', ord: [], lim: null, um: null, dados: null }); }
  select(s = '*', opcoes = {}) { this.sel = s; this.contar = !!opcoes.count; this.soContar = !!opcoes.head; return this; }
  eq(c, v) { this.f.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.f.push((r) => String(r[c]) !== String(v)); return this; }
  is(c, v) { this.f.push((r) => (r[c] ?? null) === v); return this; }
  in(c, arr) { const s = new Set((arr || []).map(String)); this.f.push((r) => s.has(String(r[c]))); return this; }
  ilike(c, p) { const re = likeRe(p); this.f.push((r) => re.test(r[c] || '')); return this; }
  or(expr) {
    const conds = expr.split(',').map((p) => { const [c, op, ...v] = p.split('.'); const val = v.join('.');
      return (r) => (op === 'ilike' ? likeRe(val).test(r[c] || '') : String(r[c]) === val); });
    this.f.push((r) => conds.some((fn) => fn(r))); return this;
  }
  order(c, { ascending = true } = {}) { this.ord.push([c, ascending]); return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.um = 'talvez'; return this; }
  single() { this.um = 'um'; return this; }
  insert(d) { this.op = 'insert'; this.dados = d; return this; }
  update(d) { this.op = 'update'; this.dados = d; return this; }
  delete() { this.op = 'delete'; return this; }
  then(ok, falhou) { return Promise.resolve().then(() => this.executar()).then(ok, falhou); }

  filtrar() {
    const vis = VISIVEL[this.t] || (() => true);
    let rs = linhas(this.t).filter((r) => vis(r) && this.f.every((fn) => fn(r)));
    for (const [c, asc] of [...this.ord].reverse()) {
      rs = [...rs].sort((a, b) => { const x = a[c], y = b[c]; const d = typeof x === 'boolean' || typeof x === 'number' ? Number(x) - Number(y) : String(x ?? '').localeCompare(String(y ?? '')); return asc ? d : -d; });
    }
    return this.lim ? rs.slice(0, this.lim) : rs;
  }
  responder(rs) {
    if (this.contar) return { data: this.soContar ? null : rs.map((r) => projetar(r, this.sel)), count: rs.length, error: null };
    const data = rs.map((r) => projetar(r, this.sel));
    if (this.um === 'um') return data.length === 1 ? { data: data[0], error: null } : erro('Registro não encontrado.');
    if (this.um === 'talvez') return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }
  executar() {
    if (!uid() && this.op !== 'select') return erro('Faça login.');
    if (this.op === 'select') return this.responder(this.filtrar());
    if (this.op === 'update') return this.atualizar();
    if (this.op === 'delete') return this.apagar();
    return this.inserir();
  }
  atualizar() {
    const cols = EDITAVEL[this.t];
    if (!cols) return erro(`permission denied for table ${this.t}`);
    const proibidas = Object.keys(this.dados).filter((k) => !cols.includes(k));
    if (proibidas.length) return erro(`permission denied for table ${this.t}`);
    const dono = { profiles: 'id', contatos_privados: 'user_id', pedidos: 'contratante_id' }[this.t];
    const chave = this.t === 'contatos_privados' ? 'user_id' : 'id';
    const alvo = this.filtrar().filter((r) => r[dono] === uid() || (this.t === 'pedidos' && isAdmin()));
    if (this.t === 'profiles' && (temContato(this.dados.bio) || temContato(this.dados.nome) || curriculoTemContato(this.dados.curriculo))) {
      return erro('Não é permitido colocar contato (telefone, WhatsApp, e-mail, redes) no perfil público.');
    }
    for (const r of alvo) Object.assign(db[this.t].find((x) => x[chave] === r[chave]), this.dados);
    salvar();
    return { data: null, error: null };
  }
  apagar() {
    if (this.t === 'favoritos') {
      const alvo = new Set(this.filtrar().filter((r) => r.user_id === uid()).map((r) => r.prestador_id));
      db.favoritos = db.favoritos.filter((r) => !(r.user_id === uid() && alvo.has(r.prestador_id)));
      salvar();
      return { data: null, error: null };
    }
    if (this.t !== 'fotos_trabalhos') return erro(`permission denied for table ${this.t}`);
    const alvo = new Set(this.filtrar().filter((r) => r.user_id === uid() || isAdmin()).map((r) => r.id));
    db.fotos_trabalhos = db.fotos_trabalhos.filter((r) => !alvo.has(r.id));
    salvar();
    return { data: null, error: null };
  }
  inserir() {
    const d = { ...this.dados };
    const me = eu();
    if (this.t === 'conversas') {
      const prest = db.profiles.find((p) => p.id === d.prestador_id);
      if (d.contratante_id !== uid() || me.suspenso || !prest?.is_prestador || prest.suspenso || d.prestador_id === uid()) {
        return erro('new row violates row-level security policy for table "conversas"');
      }
      if (db.conversas.some((c) => c.contratante_id === d.contratante_id && c.prestador_id === d.prestador_id)) return erro('Conversa já existe.');
      Object.assign(d, { id: uuid(), criado_em: agora() });
      db.conversas.push(d);
    } else if (this.t === 'mensagens') {
      if (d.autor_id !== uid() || me.suspenso || !participa(d.conversa_id)) {
        return erro(me.suspenso ? 'Sua conta está suspensa.' : 'new row violates row-level security policy for table "mensagens"');
      }
      const c = conversa(d.conversa_id);
      Object.assign(d, { id: db.seq.mensagens++, bloqueada: false, criado_em: agora() });
      if (!liberado(c.contratante_id, c.prestador_id) && temContato(d.texto)) {
        registrarBurla(d.autor_id, d.conversa_id, 'chat', d.texto);
        d.texto = '🚫 Mensagem bloqueada: não é permitido passar contato antes da contratação. Após o pagamento pelo app, o WhatsApp é liberado automaticamente.';
        d.bloqueada = true;
      }
      db.mensagens.push(d);
      emitir('mensagens', 'INSERT', d);
    } else if (this.t === 'avaliacoes') {
      const k = db.contratacoes.find((x) => x.id === d.contratacao_id);
      if (d.autor_id !== uid() || !k || k.contratante_id !== uid() || k.status !== 'concluida') return erro('Só é possível avaliar serviço concluído.');
      if (db.avaliacoes.some((a) => a.contratacao_id === d.contratacao_id)) return erro('Você já avaliou este serviço.');
      d.criado_em = agora();
      db.avaliacoes.push(d);
      const p = db.profiles.find((x) => x.id === d.prestador_id);
      const notas = db.avaliacoes.filter((a) => a.prestador_id === p.id).map((a) => a.nota);
      // mantém o histórico de exemplo na média
      const baseQtd = p.avaliacao_qtd, baseMedia = Number(p.avaliacao_media);
      p.avaliacao_qtd = baseQtd + 1;
      p.avaliacao_media = r2((baseMedia * baseQtd + d.nota) / p.avaliacao_qtd);
      void notas;
    } else if (this.t === 'verificacoes') {
      if (d.user_id !== uid()) return erro('new row violates row-level security policy for table "verificacoes"');
      if (me.verificado) return erro('Sua identidade já está verificada.');
      if (!cpfOk(d.cpf)) return erro('CPF inválido.');
      if (db.verificacoes.some((v) => v.user_id === uid() && v.status === 'pendente')) return erro('Você já tem uma verificação em análise.');
      if (db.verificacoes.some((v) => v.cpf === d.cpf && v.status !== 'rejeitada')) return erro('duplicate key value violates unique constraint "verificacoes_cpf_unico"');
      if (![d.doc_frente, d.selfie, d.doc_verso].filter(Boolean).every((c) => c.startsWith(uid() + '/'))) return erro('new row violates row-level security policy');
      Object.assign(d, { id: db.seq.verificacoes++, status: 'pendente', motivo: '', criado_em: agora(), analisado_em: null, doc_verso: d.doc_verso || null });
      db.verificacoes.push(d);
      if (!salvar()) { db.verificacoes.pop(); return erro('O espaço da demonstração neste navegador acabou. Toque em Recomeçar.'); }
      return this.responder([d]);
    } else if (this.t === 'suporte_mensagens') {
      if (d.autor_id !== uid() || !(d.usuario_id === uid() || isAdmin())) return erro('new row violates row-level security policy for table "suporte_mensagens"');
      const texto = String(d.texto || '').trim();
      if (!texto || texto.length > 2000) return erro('Escreva uma mensagem de até 2000 letras.');
      Object.assign(d, { id: db.seq.suporte++, texto, lida: false, criado_em: agora() });
      (db.suporte_mensagens ||= []).push(d);
      salvar();
      emitir('suporte_mensagens', 'INSERT', d);
      return this.responder([d]);
    } else if (this.t === 'favoritos') {
      if (d.user_id !== uid()) return erro('new row violates row-level security policy for table "favoritos"');
      if (!db.favoritos.some((f) => f.user_id === uid() && f.prestador_id === d.prestador_id)) db.favoritos.push({ ...d, criado_em: agora() });
    } else if (this.t === 'pedidos') {
      if (d.contratante_id !== uid() || me.suspenso) return erro('new row violates row-level security policy for table "pedidos"');
      if (temContato(d.titulo) || temContato(d.descricao)) return erro('Não é permitido colocar contato no pedido. Os profissionais falam com você pelo chat do app.');
      if (!d.titulo || d.titulo.length < 5) return erro('Descreva o pedido com pelo menos 5 letras.');
      Object.assign(d, { id: uuid(), status: 'aberto', criado_em: agora(), descricao: d.descricao || '', prazo: d.prazo || '' });
      db.pedidos.push(d);
    } else if (this.t === 'fotos_trabalhos') {
      if (d.user_id !== uid() || me.suspenso) return erro('new row violates row-level security policy for table "fotos_trabalhos"');
      if (db.fotos_trabalhos.filter((f) => f.user_id === uid()).length >= 12) return erro('Limite de 12 fotos atingido. Apague alguma para enviar outra.');
      if (temContato(d.legenda)) return erro('Não é permitido colocar contato na legenda da foto.');
      Object.assign(d, { id: db.seq.fotos_trabalhos++, legenda: d.legenda || '', criado_em: agora() });
      db.fotos_trabalhos.push(d);
      if (!salvar()) {
        db.fotos_trabalhos.pop();
        return erro('O espaço da demonstração neste navegador acabou. Apague algumas fotos ou toque em Recomeçar.');
      }
      return this.responder([d]);
    } else {
      return erro(`permission denied for table ${this.t}`);
    }
    salvar();
    return this.responder([d]);
  }
}

// ------------------------------------------------------------------ funções (RPC)
function cpfOk(cpf) {
  const c = String(cpf || '').replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  return cpfFicticio(c.slice(0, 9)) === c;
}

const RPC = {
  demonstrar_interesse({ pid }) {
    const pd = db.pedidos.find((x) => x.id === pid && x.status === 'aberto');
    if (!pd) throw new Error('Pedido não encontrado ou já fechado.');
    const me = eu();
    if (me.suspenso) throw new Error('Conta suspensa.');
    if (!me.is_prestador) throw new Error('Ative "Ofereço serviços" no seu perfil para responder pedidos.');
    if (pd.contratante_id === me.id) throw new Error('Este pedido é seu.');
    let c = db.conversas.find((x) => x.contratante_id === pd.contratante_id && x.prestador_id === me.id);
    if (!c) { c = { id: uuid(), contratante_id: pd.contratante_id, prestador_id: me.id, criado_em: agora() }; db.conversas.push(c); }
    const m = { id: db.seq.mensagens++, conversa_id: c.id, autor_id: me.id, texto: `Olá! Tenho interesse no seu pedido: "${pd.titulo}".`, bloqueada: false, criado_em: agora() };
    db.mensagens.push(m);
    emitir('mensagens', 'INSERT', m);
    return c.id;
  },
  enviar_cadastur({ numero }) {
    const n = String(numero || '').trim().toUpperCase();
    if (!/^[0-9A-Z./ -]{6,30}$/.test(n) || !/[0-9]{4,}/.test(n)) throw new Error('Número do Cadastur inválido. Copie exatamente como aparece no seu certificado.');
    Object.assign(eu(), { cadastur_numero: n, cadastur_status: 'pendente', cadastur_motivo: '' });
  },
  admin_analisar_cadastur({ uid: alvo, aprovar, p_motivo }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const p = db.profiles.find((x) => x.id === alvo && x.cadastur_status === 'pendente');
    if (!p) throw new Error('Cadastur não encontrado ou já analisado.');
    Object.assign(p, { cadastur_status: aprovar ? 'aprovado' : 'rejeitado', cadastur_motivo: aprovar ? '' : (p_motivo || '') });
  },
  admin_analisar_verificacao({ vid, aprovar, p_motivo }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const v = db.verificacoes.find((x) => x.id === vid && x.status === 'pendente');
    if (!v) throw new Error('Verificação não encontrada ou já analisada.');
    Object.assign(v, { status: aprovar ? 'aprovada' : 'rejeitada', motivo: aprovar ? '' : (p_motivo || ''), analisado_em: agora() });
    if (aprovar) db.profiles.find((p) => p.id === v.user_id).verificado = true;
  },
  enviar_proposta({ conv, p_descricao, p_valor, p_entrada_pct = 100 }) {
    if (![20, 30, 40, 50, 100].includes(Number(p_entrada_pct))) throw new Error('Escolha à vista ou entrada de 20%, 30%, 40% ou 50%.');
    const c = conversa(conv);
    if (c?.prestador_id !== uid()) throw new Error('Só o prestador pode enviar proposta.');
    if (eu().suspenso) throw new Error('Conta suspensa.');
    if (temContato(p_descricao)) throw new Error('Não é permitido colocar contato na proposta.');
    if (!(p_valor >= 10)) throw new Error('O valor mínimo é R$ 10,00.');
    const k = { id: uuid(), conversa_id: conv, contratante_id: c.contratante_id, prestador_id: c.prestador_id, descricao: p_descricao,
      valor: r2(p_valor), taxa_comissao: 0.1, status: 'proposta', entrada_pct: Number(p_entrada_pct), valor_pago: 0, mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora() };
    db.contratacoes.push(k);
    emitir('contratacoes', 'INSERT', k);
    return k.id;
  },
  concluir_servico({ cid }) {
    const pend = db.contratacoes.find((x) => x.id === cid && x.contratante_id === uid() && x.status === 'paga' && Number(x.valor_pago) < Number(x.valor));
    if (pend) throw new Error('Falta pagar o restante. Pague o restante para confirmar que o serviço foi feito.');
    const k = db.contratacoes.find((x) => x.id === cid && x.contratante_id === uid() && x.status === 'paga');
    if (!k) throw new Error('Contratação não encontrada ou ainda não paga.');
    Object.assign(k, { status: 'concluida', concluido_em: agora() });
  },
  cancelar_proposta({ cid }) {
    const k = db.contratacoes.find((x) => x.id === cid && x.status === 'proposta' && [x.contratante_id, x.prestador_id].includes(uid()));
    if (!k) throw new Error('Só dá para cancelar proposta ainda não paga.');
    k.status = 'cancelada';
  },
  ver_contato({ outro }) {
    if (!(liberado(uid(), outro) || isAdmin())) throw new Error('Contato liberado só após o pagamento pelo app.');
    const c = db.contatos_privados.find((x) => x.user_id === outro);
    return c ? [{ whatsapp: c.whatsapp, email: c.email }] : [];
  },
  admin_atualizar_usuario({ uid: alvo, p_verificado, p_suspenso }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const p = db.profiles.find((x) => x.id === alvo);
    if (p.suspenso && !p_suspenso) p.avisos = 0;
    Object.assign(p, { verificado: p_verificado, suspenso: p_suspenso });
  },
  admin_salvar_curriculo({ uid: alvo, p_bio, p_curriculo }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    if (temContato(p_bio) || curriculoTemContato(p_curriculo)) throw new Error('Não é permitido colocar contato (telefone, WhatsApp, e-mail, redes) no perfil público.');
    const p = db.profiles.find((x) => x.id === alvo);
    if (p_bio != null) p.bio = p_bio;
    if (p_curriculo != null) p.curriculo = p_curriculo;
  },
  suporte_marcar_lidas({ p_usuario }) {
    for (const m of db.suporte_mensagens || []) {
      if (m.lida || m.usuario_id !== p_usuario) continue;
      if (p_usuario === uid() ? m.autor_id !== uid() : (isAdmin() && m.autor_id === p_usuario)) m.lida = true;
    }
  },
  avisar_pix({ cid }) {
    const k = db.contratacoes.find((x) => x.id === cid);
    if (!k || k.contratante_id !== uid()) throw new Error('Contratação não encontrada.');
    if (!db.config_pagamento[0].pix_chave) throw new Error('O pagamento ainda não está disponível. Fale com o administrador.');
    const prox = proximo(k);
    if (!prox) throw new Error('Não há nada a pagar nesta contratação.');
    if (db.avisos_pix.some((a) => a.contratacao_id === cid && a.status === 'pendente')) throw new Error('Seu pagamento já está em conferência. Aguarde a confirmação.');
    const a = { id: db.seq.avisos_pix++, contratacao_id: cid, autor_id: uid(), tipo: prox.tipo, valor: prox.valor, status: 'pendente', motivo: '', criado_em: agora(), analisado_em: null };
    db.avisos_pix.push(a);
    emitir('avisos_pix', 'INSERT', a);
    return a.id;
  },
  admin_analisar_pix({ p_id, aprovar, p_motivo }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const a = db.avisos_pix.find((x) => x.id === Number(p_id) && x.status === 'pendente');
    if (!a) throw new Error('Aviso de pagamento não encontrado ou já analisado.');
    if (aprovar) registrarPagamento(db.contratacoes.find((x) => x.id === a.contratacao_id), 'pix', 1, 'PIX99-' + a.id);
    Object.assign(a, { status: aprovar ? 'confirmado' : 'recusado', motivo: aprovar ? '' : (p_motivo || 'Pix não encontrado na conta'), analisado_em: agora() });
    emitir('avisos_pix', 'UPDATE', a);
  },
  admin_salvar_pix({ p_chave, p_nome, p_cidade }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    if (String(p_chave || '').trim().length < 5) throw new Error('Informe a chave Pix.');
    Object.assign(db.config_pagamento[0], { pix_chave: p_chave.trim(), pix_nome: String(p_nome || '').trim().slice(0, 25), pix_cidade: String(p_cidade || '').trim().slice(0, 15) });
  },
  admin_marcar_repasse({ cid }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const k = db.contratacoes.find((x) => x.id === cid && x.status === 'concluida' && !x.repassado_em);
    if (k) k.repassado_em = agora();
  },
  admin_resumo() {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const pagas = db.contratacoes.map(comCalculados).filter((x) => ['paga', 'concluida'].includes(x.status));
    const soma = (arr, c) => r2(arr.reduce((s, x) => s + Number(x[c]), 0));
    return {
      usuarios: db.profiles.length, prestadores: db.profiles.filter((p) => p.is_prestador).length,
      contratantes: db.profiles.filter((p) => p.is_contratante).length, contratacoes: pagas.length,
      faturado: soma(pagas, 'valor'), comissao: soma(pagas, 'comissao'),
      repasse_pendente: soma(pagas.filter((x) => x.status === 'concluida' && !x.repassado_em), 'valor_prestador'),
      tentativas: db.tentativas_burla.length,
      verificacoes_pendentes: db.verificacoes.filter((v) => v.status === 'pendente').length,
      pedidos_abertos: db.pedidos.filter((x) => x.status === 'aberto').length,
      cadastur_pendentes: db.profiles.filter((p) => p.cadastur_status === 'pendente').length,
      pix_pendentes: db.avisos_pix.filter((a) => a.status === 'pendente').length,
      suporte_novas: new Set((db.suporte_mensagens || []).filter((m) => m.autor_id === m.usuario_id && !m.lida).map((m) => m.usuario_id)).size,
    };
  },
};

// Próximo pagamento devido (como public.proximo_pagamento) e registro (como public.registrar_pagamento)
function proximo(k) {
  if (!k || ['cancelada', 'concluida'].includes(k.status)) return null;
  const pago = Number(k.valor_pago || 0), total = Number(k.valor), pct = Number(k.entrada_pct || 100);
  if (pago >= total) return null;
  return pago === 0 ? { tipo: pct === 100 ? 'total' : 'entrada', valor: r2(total * pct / 100) } : { tipo: 'restante', valor: r2(total - pago) };
}
function registrarPagamento(k, forma, parcelas, ref) {
  const prox = proximo(k);
  if (!prox) throw new Error('Esta contratação não está aguardando pagamento.');
  (db.pagamentos ||= []).push({ id: uuid(), contratacao_id: k.id, tipo: prox.tipo, valor: prox.valor, parcelas, forma, mp_payment_id: ref, criado_em: agora() });
  Object.assign(k, { status: 'paga', valor_pago: r2(Number(k.valor_pago || 0) + prox.valor), mp_payment_id: k.mp_payment_id || ref, pago_em: k.pago_em || agora() });
  emitir('contratacoes', 'UPDATE', k);
}

// Arquivos enviados ficam só na memória até virarem a URL (data:) salva na foto
const arquivos = {};

// ------------------------------------------------------------------ cliente falso
export function criarDemo() {
  let aoMudar = () => {};
  const sessao = () => {
    const u = db.users.find((x) => x.id === uid());
    return u ? { user: { id: u.id, email: u.email }, access_token: 'demo' } : null;
  };
  const trocar = (id) => { db.sessao = id; salvar(); aoMudar(id ? 'SIGNED_IN' : 'SIGNED_OUT', sessao()); };

  const sb = {
    from: (t) => new Consulta(t),
    async rpc(nome, args) {
      try { const data = RPC[nome](args || {}); salvar(); return { data, error: null }; } catch (e) { return erro(e.message); }
    },
    auth: {
      async getSession() { return { data: { session: sessao() } }; },
      onAuthStateChange(cb) { aoMudar = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword({ email }) {
        const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
        if (!u) return erro('Credenciais inválidas');
        trocar(u.id); return { data: { session: sessao() }, error: null };
      },
      async signUp({ email, options }) {
        if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return erro('Este e-mail já tem conta. Toque em "Entrar" para acessar.');
        const m = options?.data || {};
        const id = uuid();
        db.users.push({ id, email, senha: '' });
        db.profiles.push(perfil(id, m.nome || '', { is_prestador: !!m.is_prestador, is_contratante: m.is_contratante !== false, criado_em: agora() }));
        db.contatos_privados.push({ user_id: id, whatsapp: m.whatsapp || '', email, chave_pix: '' });
        trocar(id);
        return { data: { session: sessao() }, error: null };
      },
      async signOut() { trocar(null); return { error: null }; },
      async resetPasswordForEmail() { return { error: null }; },
    },
    channel() {
      const ch = { regs: [], on(_tipo, opts, cb) { ch.regs.push({ ...opts, cb }); return ch; }, subscribe() { ouvintes.push(...ch.regs); return ch; } };
      return ch;
    },
    storage: {
      from(bucket) {
        const privado = bucket === 'documentos';
        return {
          async upload(caminho, blob) {
            if (!uid()) return erro('Faça login.');
            if (!caminho.startsWith(uid() + '/')) return erro('new row violates row-level security policy');
            if (blob.size > (privado ? 8 : 5) * 1024 * 1024) return erro('Foto muito grande.');
            const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
            // documentos ficam guardados (o admin precisa ver); fotos viram a URL salva na própria foto
            if (privado) db.docs[caminho] = url; else arquivos[caminho] = url;
            return { data: { path: caminho }, error: null };
          },
          getPublicUrl(caminho) { return { data: { publicUrl: privado ? '' : arquivos[caminho] || '' } }; },
          async createSignedUrl(caminho) {
            if (!(caminho.startsWith(uid() + '/') || isAdmin())) return erro('Sem permissão.');
            return { data: { signedUrl: db.docs[caminho] || '' }, error: null };
          },
          async remove(caminhos) { caminhos.forEach((c) => { delete arquivos[c]; if (privado) delete db.docs[c]; }); salvar(); return { data: null, error: null }; },
        };
      },
    },
    removeChannel(ch) { ouvintes = ouvintes.filter((o) => !ch.regs.includes(o)); },
    demo: {
      // simula o webhook do Mercado Pago: entrada, restante ou total, em Pix ou cartão até 12x
      async pagar(cid, forma = 'pix', parcelas = 1) {
        const k = db.contratacoes.find((x) => x.id === cid);
        if (!k || k.contratante_id !== uid()) throw new Error('Esta contratação não está aguardando pagamento.');
        registrarPagamento(k, forma, parcelas, 'DEMO-' + Date.now());
        salvar();
      },
      entrarComo: (id) => trocar(id),
      resetar() { db = semente(); salvar(); location.hash = '#/'; location.reload(); },
    },
  };
  montarBarra(sb);
  return sb;
}

const SEMENTE_IDS = new Set(semente().users.map((u) => u.id));

// Botão "Demo": troca de perfil sem atrapalhar a tela
function montarBarra(sb) {
  document.body.classList.add('demo');
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'demo-botao';
  botao.setAttribute('aria-haspopup', 'dialog');
  const papeis = [['cliente', 'Mariana', 'Cliente que contrata', '#/'], ['empresa', 'Construtora Horizonte', 'Empresa que publica pedidos', '#/pedidos'],
    ['prestador', 'Pedro', 'Pedreiro', '#/conversas'], ['ajudante', 'Marcos', 'Ajudante geral', '#/pedidos'], ['admin', 'Você', 'Administrador do app', '#/admin']];
  const atualizarBotao = () => {
    const p = db.profiles.find((x) => x.id === db.sessao);
    botao.innerHTML = `<span class="demo-tag">Demo</span><span class="demo-nome">${p ? p.nome.split(' ')[0] : 'Sem login'}</span>`;
    botao.setAttribute('aria-label', `Demonstração: vendo como ${p ? p.nome : 'visitante'}. Toque para trocar.`);
  };
  const abrir = () => {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo demo-fundo';
    const novas = db.users.filter((u) => !SEMENTE_IDS.has(u.id));
    const linha = (valor, nome, sub, ativo) => `<button type="button" class="demo-op ${ativo ? 'ativo' : ''}" data-v="${valor}"><b>${nome}</b><small>${sub}</small></button>`;
    fundo.innerHTML = `<div class="demo-folha" role="dialog" aria-modal="true" aria-label="Demonstração">
      <div class="demo-cab"><b>Demonstração</b><button type="button" class="demo-fechar" aria-label="Fechar">✕</button></div>
      <p class="nota">Veja o app como cada tipo de pessoa. <b>Todos os nomes, pedidos e valores são fictícios</b> e ficam só neste navegador. Nenhum pagamento é real.</p>
      <div class="demo-lista">
        ${papeis.map(([k, nome, sub]) => linha(k, nome, sub, PERFIS_DEMO[k] === db.sessao)).join('')}
        ${novas.map((u) => linha(`u:${u.id}`, db.profiles.find((p) => p.id === u.id)?.nome || u.email, 'Conta que você criou', u.id === db.sessao)).join('')}
        ${linha('novo', 'Criar uma conta nova', 'Começa pela tela de boas-vindas', !db.sessao)}
      </div>
      <button type="button" class="link-simples" data-v="reset">Recomeçar a demonstração do zero</button>
    </div>`;
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo || e.target.closest('.demo-fechar')) { fundo.remove(); return; }
      const b = e.target.closest('[data-v]');
      if (!b) return;
      const v = b.dataset.v;
      fundo.remove();
      if (v === 'reset') return sb.demo.resetar();
      if (v === 'novo') { sb.demo.entrarComo(null); try { sessionStorage.removeItem('contrata-olhou'); } catch { /* */ } location.hash = '#/bemvindo'; return; }
      if (v.startsWith('u:')) { sb.demo.entrarComo(v.slice(2)); location.hash = '#/conta'; return; }
      const [, , , destino] = papeis.find(([k]) => k === v);
      sb.demo.entrarComo(PERFIS_DEMO[v]);
      location.hash = destino;
    });
    document.body.appendChild(fundo);
    fundo.querySelector('.demo-op')?.focus();
  };
  botao.addEventListener('click', abrir);
  window.abrirDemo = abrir;
  atualizarBotao();
  window.addEventListener('hashchange', atualizarBotao);
  document.body.appendChild(botao);
}
