/* CONEXÃO JOVEM — DADOS DE DEMONSTRAÇÃO (Fase 1)
   TUDO AQUI É FICTÍCIO: nomes, círculos, eventos, números e publicações foram inventados para o protótipo.
   Nenhuma pessoa real. Na Fase 2 isto sai daqui e vem do banco (com RLS), conforme o dossiê. */
window.CJ_DEMO = {
  hoje: 'Terça, 17 de novembro',

  circulo: {
    nome: 'Círculo Esperança',
    faixa: '18–21 anos',
    descricao: 'Um grupo pequeno para caminhar junto: conversa, oração, amizade e serviço. Encontros quinzenais em casas de família, sempre com líder e auxiliar presentes.',
    integrantes: [
      { nome: 'Rafael T.', papel: 'Líder', cor: '#2462D2' },
      { nome: 'Camila S.', papel: 'Auxiliar', cor: '#8A6D2A' },
      { nome: 'Ana B.', cor: '#1E7A4F' },
      { nome: 'Lucas M.', cor: '#7A3EB1' },
      { nome: 'Júlia R.', cor: '#B4436C' },
      { nome: 'Pedro H.', cor: '#0E7C86' },
      { nome: 'Sara L.', cor: '#9A5B00' }
    ],
    encontro: { quando: 'Sábado, 21 de novembro · 16h', onde: 'Casa de família (endereço só para integrantes)', duracao: 'cerca de 1h30' },
    tema: { titulo: 'Como ser presença na vida de alguém?', texto: 'Vamos conversar sobre amizade que cuida, a partir de Lucas 10:25-37 (o bom samaritano). Traga sua Bíblia ou use a do Radar.' },
    materiais: [
      { titulo: 'Roteiro do encontro', texto: 'Acolhida e lanche (15 min) · Leitura de Lucas 10:25-37 (10 min) · Conversa em duplas: "Quem foi presença na minha vida?" (20 min) · Oração uns pelos outros (15 min) · Combinados da próxima missão (10 min).' },
      { titulo: 'Perguntas para a conversa', texto: '1. Quem já parou por você num momento difícil? 2. O que nos impede de parar pelos outros? 3. Que passo pequeno posso dar esta semana?' }
    ]
  },

  outrosCirculos: [
    { nome: 'Círculo Renovo', faixa: '15–17 anos', membros: 9, encontro: 'Sem encontro planejado', alerta: true },
    { nome: 'Círculo Esperança', faixa: '18–21 anos', membros: 8, encontro: 'Sáb, 21/11 · 16h' },
    { nome: 'Círculo Caminho', faixa: '18–21 anos', membros: 7, encontro: 'Sex, 20/11 · 20h' },
    { nome: 'Círculo Raízes', faixa: '22–25 anos', membros: 10, encontro: 'Dom, 22/11 · 18h' },
    { nome: 'Círculo Farol', faixa: '15–17 anos', membros: 6, encontro: 'Sáb, 28/11 · 15h' }
  ],

  jornada: {
    dia: 12,
    etapas: [
      { id: 'e1', dias: 'Dias 1–7', titulo: 'Acolhimento', resumo: 'Conhecer a comunidade e ser bem-vindo.',
        acoes: ['Conversar com quem fez seu acolhimento', 'Conhecer o líder do seu círculo', 'Ler Salmos 23 com calma'],
        leitura: 'Salmos 23', encontro: 'Um café depois do culto de quinta' },
      { id: 'e2', dias: 'Dias 8–30', titulo: 'Vínculos', resumo: 'Construir amizades e participar das atividades do círculo.',
        acoes: ['Ir a um encontro do círculo', 'Convidar alguém para um lanche', 'Ler Lucas 10:25-37', 'Participar de uma atividade presencial (esporte, estudo ou ação social)'],
        leitura: 'Lucas 10', encontro: 'Encontro do Círculo Esperança (sábado)' },
      { id: 'e3', dias: 'Dias 31–60', titulo: 'Fundamentos da fé', resumo: 'Aprofundar na Palavra e nos fundamentos, com espaço para perguntas.',
        acoes: ['Ler o Evangelho de Marcos no seu ritmo', 'Levar uma pergunta sincera para o estudo', 'Conversar com um mentor sobre o que tem aprendido'],
        leitura: 'Evangelho de Marcos', encontro: 'Estudo bíblico de sexta' },
      { id: 'e4', dias: 'Dias 61–90', titulo: 'Participação e serviço', resumo: 'Descobrir seus dons e servir com a gente.',
        acoes: ['Indicar seus talentos e disponibilidade', 'Acompanhar uma equipe de serviço por um dia', 'Dar um retorno sobre seus 90 dias'],
        leitura: 'Romanos 12', encontro: 'Ação solidária do mês' }
    ]
  },

  missao: {
    semana: '17 a 23 de novembro',
    titulo: 'Ninguém caminha sozinho',
    objetivo: 'Ser presença, de forma simples e segura, na vida de alguém da igreja que está mais afastado ou passando por um momento difícil.',
    acoes: ['Escolha alguém que você já conhece para conversar', 'Ouça com atenção, sem pressa e sem julgamento', 'Se fizer sentido, ore com a pessoa e convide para o próximo encontro'],
    seguranca: ['Converse com quem você já conhece; não aborde desconhecidos sozinho.', 'Se tem menos de 18 anos, prefira lugares públicos ou a presença de um responsável.', 'Respeite se a pessoa não quiser conversar.', 'Se ouvir algo grave (risco, violência, abuso), procure um líder: você não precisa resolver sozinho.'],
    responsavel: 'Rafael T. (líder do círculo) · demonstração'
  },

  eventos: [
    { id: 'culto-quinta', cat: 'Culto', titulo: 'Conexão de Quinta', data: 'Qui, 19/11', hora: '19h30', local: 'Templo Sede · salão principal', resp: 'Equipe de jovens', faixa: 'Todas as idades', vagas: null, autorizacao: false, arte: 'palco',
      descricao: 'Culto dos jovens com louvor, Palavra e um tempo de comunhão no final. Chegue cedo para o café de boas-vindas.', acess: 'Entrada sem degraus pela lateral; intérprete de Libras na primeira fileira.', orient: 'Não é preciso inscrição. Se for sua primeira vez, procure a recepção (camiseta azul).' },
    { id: 'futebol', cat: 'Esporte', titulo: 'Futebol da Juventude', data: 'Sáb, 21/11', hora: '8h', local: 'Quadra da igreja', resp: 'Pedro H. (demonstração)', faixa: '15–25 anos', vagas: 24, autorizacao: true, arte: 'campo',
      descricao: 'Futebol misto, sem placar oficial, com oração no início e lanche no final. Venha jogar ou torcer.', acess: 'Arquibancada coberta acessível.', orient: 'Leve água e roupa confortável. Menores precisam de autorização do responsável.' },
    { id: 'circulo-sab', cat: 'Círculo', titulo: 'Encontro do Círculo Esperança', data: 'Sáb, 21/11', hora: '16h', local: 'Casa de família (só integrantes)', resp: 'Rafael T. e Camila S.', faixa: '18–21 anos', vagas: 10, autorizacao: false, arte: 'lar',
      descricao: 'Encontro quinzenal do círculo. Tema: como ser presença na vida de alguém.', acess: 'Combine com o líder se precisar de apoio para chegar.', orient: 'O endereço é enviado só para integrantes confirmados.' },
    { id: 'acao-social', cat: 'Ação social', titulo: 'Mãos que Servem', data: 'Dom, 22/11', hora: '8h', local: 'Comunidade local (ponto de encontro: Templo Sede)', resp: 'Equipe de ação social', faixa: '15–25 anos', vagas: 30, autorizacao: true, arte: 'maos',
      descricao: 'Montagem e entrega de cestas para famílias atendidas pela igreja, sempre em equipes com um adulto responsável.', acess: 'Há tarefas sentadas na montagem das cestas.', orient: 'Use roupa confortável. Menores: autorização e transporte combinados com a equipe. Não é permitido fotografar as famílias.' },
    { id: 'estudo-sexta', cat: 'Estudo', titulo: 'Estudo: Perguntas sinceras', data: 'Sex, 27/11', hora: '20h', local: 'Templo Sede · sala 3', resp: 'Liderança de jovens', faixa: '18–25 anos', vagas: 40, autorizacao: false, arte: 'estudo',
      descricao: 'Um espaço seguro para levar dúvidas sobre fé e vida, com estudo da Palavra e conversa respeitosa.', acess: 'Sala no térreo.', orient: 'Traga sua pergunta; pode ser anônima, numa caixinha na entrada.' },
    { id: 'ensaio', cat: 'Ensaio', titulo: 'Ensaio do louvor jovem', data: 'Sáb, 28/11', hora: '14h', local: 'Templo Sede · salão principal', resp: 'Ministério de louvor', faixa: '15–25 anos', vagas: 20, autorizacao: true, arte: 'musica',
      descricao: 'Ensaio aberto para quem já participa ou quer conhecer o ministério de louvor.', acess: 'Entrada lateral sem degraus.', orient: 'Quem quer começar: indique seu interesse em Talentos e Serviço antes.' },
    { id: 'acampamento', cat: 'Acampamento', titulo: 'Acampa Conexão', data: 'Sex a Dom, 4–6/12', hora: 'Saída 18h', local: 'Sítio parceiro (informado aos inscritos)', resp: 'Liderança de jovens', faixa: '15–25 anos (grupos por idade)', vagas: 60, autorizacao: true, arte: 'tenda',
      descricao: 'Fim de semana de comunhão, Palavra, esporte e descanso. Dormitórios separados por idade e sexo, com responsáveis identificados.', acess: 'Informe necessidades na inscrição.', orient: 'Menores: autorização assinada, regras de transporte, uso de imagem e entrega/retirada conforme a política da igreja.' }
  ],
  categorias: ['Culto', 'Estudo', 'Esporte', 'Ação social', 'Círculo', 'Acampamento', 'Ensaio', 'Treinamento'],

  devocionais: [
    { id: 'd1', data: 'Hoje, 17/11', titulo: 'Permanecendo em Cristo', ref: 'João 15:4', verso: 'Fiquem unidos a mim, e eu ficarei unido a vocês. O ramo não dá fruto sozinho, se não estiver ligado à videira.',
      reflexao: 'Permanecer é mais do que aparecer de vez em quando. É ficar perto, todos os dias, mesmo quando a semana está corrida. Jesus usa a imagem da videira: o ramo não precisa se esforçar para dar fruto; ele precisa continuar ligado. Hoje, a pergunta não é "quanto eu fiz?", mas "eu fiquei perto?".',
      pergunta: 'Em que área da sua vida você sente que precisa ficar mais perto de Deus?',
      oracao: 'Senhor, me ajuda a ficar perto de Ti hoje, no meio das coisas simples. Amém.',
      leitura: ['João 15:1-8', 'João 15:9-17', 'Salmos 1', 'Gálatas 5:22-26', 'Colossenses 2:6-7'] },
    { id: 'd2', data: 'Ontem, 16/11', titulo: 'Deus cuida de você', ref: 'Salmos 23:1', verso: 'O Senhor é o meu pastor; nada me faltará.',
      reflexao: 'Um pastor conhece suas ovelhas pelo nome, vai à frente, procura quem se perdeu. Antes de qualquer coisa que você faça, Deus já cuida de você. Isso não tira as dificuldades do caminho, mas muda com quem você caminha.',
      pergunta: 'Onde você já viu o cuidado de Deus nesta semana?',
      oracao: 'Pai, obrigado por cuidar de mim. Me ensina a confiar. Amém.',
      leitura: ['Salmos 23', 'João 10:11-16', 'Lucas 15:1-7', 'Isaías 40:11', '1 Pedro 5:6-7'] },
    { id: 'd3', data: 'Dom, 15/11', titulo: 'Ninguém caminha sozinho', ref: 'Eclesiastes 4:9-10', verso: 'Dois juntos vivem melhor do que um só. Se um cair, o outro ajuda a levantar.',
      reflexao: 'Deus nunca planejou uma fé solitária. Amizades verdadeiras na igreja são presente e também responsabilidade: levantar quem caiu e deixar-se ser levantado.',
      pergunta: 'Quem caminha com você? Por quem você poderia caminhar?',
      oracao: 'Senhor, me dá amigos de verdade e me faz um amigo de verdade. Amém.',
      leitura: ['Eclesiastes 4:9-12', 'Atos 2:42-47', 'Hebreus 10:24-25', 'Romanos 12:9-16', '1 Samuel 18:1-4'] }
  ],

  posts: {
    circulo: [
      { id: 'p1', autor: 'Ana B.', cor: '#1E7A4F', onde: 'Círculo Esperança', quando: 'há 2 h', texto: 'Galera, como vocês têm se organizado para ler a Bíblia durante a semana? Estou tentando ler à noite, antes de dormir.' },
      { id: 'p2', autor: 'Camila S.', cor: '#8A6D2A', onde: 'Auxiliar · Círculo Esperança', quando: 'há 5 h', texto: 'Lembrando: sábado tem encontro às 16h. Quem puder, traga um lanche para dividir. Quem não puder vir, avise no "Não poderei ir", sem problema nenhum.' }
    ],
    geral: [
      { id: 'p3', autor: 'Lucas M.', cor: '#7A3EB1', onde: 'Comunidade', quando: 'ontem', texto: 'O culto de quinta foi muito especial. Obrigado à equipe da recepção pelo café e pelo cuidado com quem chegou pela primeira vez.' },
      { id: 'p4', autor: 'Equipe de jovens', cor: '#142544', onde: 'Aviso oficial', quando: 'ontem', texto: 'Inscrições abertas para o Acampa Conexão (4 a 6/12). Vagas limitadas e grupos separados por idade. Veja em Eventos.' },
      { id: 'p5', autor: 'Júlia R.', cor: '#B4436C', onde: 'Comunidade', quando: 'dom', texto: 'Alguém mais vai na ação social de domingo? É minha primeira vez e queria ir junto com alguém.' }
    ],
    testemunhos: [
      { id: 'p6', autor: 'Pedro H.', cor: '#0E7C86', onde: 'Testemunho · publicado com consentimento', quando: 'há 3 dias', texto: 'Cheguei sem conhecer ninguém. Em duas semanas alguém do círculo me chamou para o futebol e hoje tenho amigos com quem oro junto. Deus usa pessoas.' }
    ]
  },
  comentarios: {
    p1: [{ autor: 'Sara L.', texto: 'Eu leio de manhã, no ônibus. Uso o plano de leitura do Radar!' }],
    p5: [{ autor: 'Ana B.', texto: 'Eu vou! Vamos juntas.' }]
  },

  talentos: [
    { id: 'louvor', nome: 'Louvor e canto', ic: 'mic' },
    { id: 'instrumentos', nome: 'Instrumentos', ic: 'music' },
    { id: 'midia', nome: 'Mídia e redes', ic: 'megaphone' },
    { id: 'foto', nome: 'Fotografia', ic: 'camera' },
    { id: 'video', nome: 'Vídeo', ic: 'video' },
    { id: 'recepcao', nome: 'Recepção', ic: 'smile' },
    { id: 'esporte', nome: 'Esporte', ic: 'bola' },
    { id: 'teatro', nome: 'Teatro e artes', ic: 'sparkles' },
    { id: 'social', nome: 'Ação social', ic: 'heartHandshake' },
    { id: 'ensino', nome: 'Ensino', ic: 'grad' },
    { id: 'missoes', nome: 'Missões', ic: 'globe' }
  ],
  disponibilidade: ['Sábado de manhã', 'Sábado à tarde', 'Domingo', 'Durante a semana, à noite'],

  lideranca: {
    kpis: [
      { rot: 'Tempo médio até o acolhimento', val: '41 h', meta: 'meta: até 72 h úteis' },
      { rot: 'Conectados a um círculo', val: '74%', meta: 'dos que desejaram · meta 80%' },
      { rot: 'Primeiro encontro em 30 dias', val: '61%', meta: 'novos participantes' },
      { rot: 'Vínculo percebido', val: '68%', meta: '"alguém me conhece" · respostas voluntárias' },
      { rot: 'Denúncias respondidas no prazo', val: '100%', meta: '2 de 2 no mês' },
      { rot: 'Pedidos de conversa abertos', val: '2', meta: 'conteúdo só para equipe autorizada' }
    ],
    continuidade: [
      { rot: '30 dias', val: 72 },
      { rot: '60 dias', val: 58 },
      { rot: '90 dias', val: 49 }
    ],
    alertas: [
      { id: 'a1', ic: 'user', titulo: 'Novo participante sem contato de acolhimento', texto: 'Chegou há 2 dias · faixa 18–21 · aguardando o primeiro contato humano' },
      { id: 'a2', ic: 'calendar', titulo: 'Círculo Renovo sem encontro planejado', texto: 'Último encontro há 3 semanas · conversar com o líder' },
      { id: 'a3', ic: 'message', titulo: '2 pedidos de conversa aguardando retorno', texto: 'O mais antigo há 30 h · janela de retorno: 72 h úteis' }
    ],
    conteudos: [
      { titulo: 'Devocional "Permanecendo em Cristo"', status: 'Publicado' },
      { titulo: 'Devocional "Fé nas pequenas coisas"', status: 'Aguardando aprovação pastoral' },
      { titulo: '3 publicações no mural', status: 'Em moderação' }
    ]
  }
};
