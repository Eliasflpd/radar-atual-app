// MODO DEMONSTRAÇÃO — imita o Supabase dentro do navegador, com dados de exemplo.
// Aplica as mesmas regras do banco real (supabase/schema.sql): contato oculto até
// o pagamento, filtro anti-contato, 3 avisos = suspensão, comissão de 10%.
import { temContato } from './filtro.js';

const CHAVE = 'contrata-demo-v3';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
const agora = (minAtras = 0) => new Date(Date.now() - minAtras * 60000).toISOString();
const r2 = (n) => Math.round(n * 100) / 100;

const CATEGORIAS = [
  ['Pedreiro', '🧱'], ['Eletricista', '💡'], ['Encanador', '🚰'], ['Pintor', '🎨'], ['Diarista / Limpeza', '🧹'],
  ['Jardineiro', '🌿'], ['Marceneiro', '🪚'], ['Serralheiro', '⚙️'], ['Mecânico', '🔧'], ['Técnico em informática', '💻'],
  ['Designer', '✏️'], ['Programador', '👨‍💻'], ['Fotógrafo', '📷'], ['Professor particular', '📚'], ['Cabeleireiro / Beleza', '💇'],
  ['Cozinheiro / Buffet', '🍳'], ['Motorista / Frete', '🚚'], ['Contador', '📊'], ['Advogado', '⚖️'], ['Cuidador / Babá', '🤝'], ['Ajudante geral', '💪'], ['Outros', '🛠️'],
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
    avaliacao_media: 0, avaliacao_qtd: 0, criado_em: agora(60 * 24 * 90), ...extra,
  };
}

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
    // empresários e empresas que contratam
    perfil('u-emp1', 'Construtora Horizonte', { cidade: 'São Paulo', uf: 'SP', verificado: true }),
    perfil('u-emp2', 'Restaurante Sabor da Terra', { cidade: 'Campinas', uf: 'SP' }),
    perfil('u-emp3', 'Condomínio Jardim das Flores', { cidade: 'São Paulo', uf: 'SP', verificado: true }),
    perfil('u-emp4', 'Transportadora Rota Sul', { cidade: 'Curitiba', uf: 'PR', verificado: true }),
    perfil('u-emp5', 'Hotel Recanto Azul', { cidade: 'Salvador', uf: 'BA' }),
    perfil('u-emp6', 'Roberto Lima (Casa do Construtor BH)', { cidade: 'Belo Horizonte', uf: 'MG' }),
    perfil('u-emp7', 'Clínica Bem Viver', { cidade: 'Rio de Janeiro', uf: 'RJ', verificado: true }),
    perfil('u-emp8', 'Eventos Ponto Alto', { cidade: 'São Paulo', uf: 'SP' }),
  ];
  const contatos_privados = profiles.map((p, i) => ({
    user_id: p.id, whatsapp: `11 9${String(8000 + ((i * 137) % 1999)).padStart(4, '0')}-${String(1000 + i * 71).slice(0, 4)}`,
    email: `${p.nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@exemplo.com`, chave_pix: p.is_prestador ? `${p.nome.split(' ')[0].toLowerCase()}@pix.exemplo` : '',
  }));
  const conversas = [
    { id: 'c-1', contratante_id: 'u-cliente', prestador_id: 'u-pedro', criado_em: agora(180) },
    { id: 'c-2', contratante_id: 'u-empresa', prestador_id: 'u-pedro', criado_em: agora(60 * 24 * 10) },
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
  ];
  const ct = (id, conv, contratante, prestador, descricao, valor, status, extra = {}) => ({
    id, conversa_id: conv, contratante_id: contratante, prestador_id: prestador, descricao, valor, taxa_comissao: 0.1,
    status, mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora(150), ...extra,
  });
  const contratacoes = [
    ct('k-1', 'c-1', 'u-cliente', 'u-pedro', 'Reboco de parede de 20m² (material por conta da cliente). 2 dias de serviço.', 1500, 'proposta'),
    ct('k-2', 'c-2', 'u-empresa', 'u-pedro', 'Contrapiso em 3 salas comerciais (60m²).', 4200, 'concluida',
      { pago_em: agora(60 * 24 * 9), concluido_em: agora(60 * 24 * 2), criado_em: agora(60 * 24 * 10) }),
  ];
  const avaliacoes = [
    { contratacao_id: 'k-2', prestador_id: 'u-pedro', autor_id: 'u-empresa', nota: 5, comentario: 'Serviço caprichado e entregue no prazo.', criado_em: agora(60 * 24 * 2) },
  ];
  const tentativas_burla = [
    { id: 1, user_id: 'u-pedro', conversa_id: 'c-1', onde: 'chat', texto_original: 'me chama no zap que a gente combina melhor', criado_em: agora(160) },
  ];
  profiles.find((p) => p.id === 'u-pedro').avisos = 1;
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
  ];
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
    ({ id, contratante_id: dono, titulo, descricao, categoria_id: cat, cidade, uf, vagas, orcamento, status: 'aberto', criado_em: agora(60 * horasAtras) });
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
  ];
  return {
    users: profiles.map((p) => ({ id: p.id, email: contatos_privados.find((c) => c.user_id === p.id).email, senha: 'demo123' })),
    categorias: CATEGORIAS, profiles, contatos_privados, conversas, mensagens, contratacoes, avaliacoes, tentativas_burla, fotos_trabalhos,
    verificacoes, pedidos, docs,
    seq: { mensagens: mid, tentativas_burla: 2, fotos_trabalhos: fid, verificacoes: 4 }, sessao: 'u-cliente',
  };
}

// ------------------------------------------------------------------ armazenamento
function carregar() {
  try { const s = localStorage.getItem(CHAVE); if (s) return JSON.parse(s); } catch { /* sem storage */ }
  return semente();
}
let db = carregar();
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
};
const EDITAVEL = {
  profiles: ['nome', 'cidade', 'uf', 'bio', 'foto_url', 'categoria_id', 'preco_base', 'is_prestador', 'is_contratante'],
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
const linhas = (t) => (t === 'contratacoes' ? db.contratacoes.map(comCalculados) : db[t]);

class Consulta {
  constructor(tabela) { Object.assign(this, { t: tabela, f: [], op: 'select', sel: '*', ord: [], lim: null, um: null, dados: null }); }
  select(s = '*') { this.sel = s; return this; }
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
    if (this.t === 'profiles' && (temContato(this.dados.bio) || temContato(this.dados.nome))) {
      return erro('Não é permitido colocar contato (telefone, WhatsApp, e-mail, redes) no perfil público.');
    }
    for (const r of alvo) Object.assign(db[this.t].find((x) => x[chave] === r[chave]), this.dados);
    salvar();
    return { data: null, error: null };
  }
  apagar() {
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
    } else if (this.t === 'pedidos') {
      if (d.contratante_id !== uid() || me.suspenso) return erro('new row violates row-level security policy for table "pedidos"');
      if (temContato(d.titulo) || temContato(d.descricao)) return erro('Não é permitido colocar contato no pedido. Os profissionais falam com você pelo chat do app.');
      if (!d.titulo || d.titulo.length < 5) return erro('Descreva o pedido com pelo menos 5 letras.');
      Object.assign(d, { id: uuid(), status: 'aberto', criado_em: agora(), descricao: d.descricao || '' });
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
  admin_analisar_verificacao({ vid, aprovar, p_motivo }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const v = db.verificacoes.find((x) => x.id === vid && x.status === 'pendente');
    if (!v) throw new Error('Verificação não encontrada ou já analisada.');
    Object.assign(v, { status: aprovar ? 'aprovada' : 'rejeitada', motivo: aprovar ? '' : (p_motivo || ''), analisado_em: agora() });
    if (aprovar) db.profiles.find((p) => p.id === v.user_id).verificado = true;
  },
  enviar_proposta({ conv, p_descricao, p_valor }) {
    const c = conversa(conv);
    if (c?.prestador_id !== uid()) throw new Error('Só o prestador pode enviar proposta.');
    if (eu().suspenso) throw new Error('Conta suspensa.');
    if (temContato(p_descricao)) throw new Error('Não é permitido colocar contato na proposta.');
    if (!(p_valor >= 10)) throw new Error('O valor mínimo é R$ 10,00.');
    const k = { id: uuid(), conversa_id: conv, contratante_id: c.contratante_id, prestador_id: c.prestador_id, descricao: p_descricao,
      valor: r2(p_valor), taxa_comissao: 0.1, status: 'proposta', mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora() };
    db.contratacoes.push(k);
    emitir('contratacoes', 'INSERT', k);
    return k.id;
  },
  concluir_servico({ cid }) {
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
    };
  },
};

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
        if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return erro('Este e-mail já está cadastrado.');
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
      async pagar(cid) {
        const k = db.contratacoes.find((x) => x.id === cid);
        if (!k || k.contratante_id !== uid() || k.status !== 'proposta') throw new Error('Esta proposta não está aguardando pagamento.');
        Object.assign(k, { status: 'paga', mp_payment_id: 'DEMO-' + Date.now(), pago_em: agora() });
        salvar();
      },
      entrarComo: (id) => trocar(id),
      resetar() { db = semente(); salvar(); location.hash = '#/'; location.reload(); },
    },
  };
  montarBarra(sb);
  return sb;
}

function montarBarra(sb) {
  document.body.classList.add('demo');
  const faixa = document.createElement('div');
  faixa.className = 'demo-faixa';
  const papeis = [['cliente', 'Mariana · cliente', '#/'], ['empresa', 'Construtora Horizonte · empresa', '#/pedidos'],
    ['prestador', 'Pedro · pedreiro', '#/conversas'], ['ajudante', 'Marcos · ajudante', '#/pedidos'], ['admin', 'Você · administrador', '#/admin']];
  faixa.innerHTML = `<b>Demonstração</b>
    <label for="demo-papel">Ver como
      <select id="demo-papel">${papeis.map(([k, rot]) => `<option value="${k}">${rot}</option>`).join('')}</select></label>
    <button type="button" id="demo-reset" title="Apaga as mudanças e volta aos dados de exemplo">Recomeçar</button>`;
  const sel = faixa.querySelector('select');
  const sincronizar = () => {
    const k = Object.keys(PERFIS_DEMO).find((x) => PERFIS_DEMO[x] === db.sessao);
    if (k) sel.value = k;
  };
  sel.addEventListener('change', () => {
    const [, , destino] = papeis.find(([k]) => k === sel.value);
    sb.demo.entrarComo(PERFIS_DEMO[sel.value]);
    location.hash = destino;
  });
  faixa.querySelector('#demo-reset').addEventListener('click', () => sb.demo.resetar());
  sincronizar();
  window.addEventListener('hashchange', sincronizar);
  document.body.prepend(faixa);
}
