# Registro de alterações — Contrata Aí

## Currículo completo e "Fale com o administrador"
### Banco de dados (somente acréscimos)
- Coluna `profiles.curriculo` (jsonb): experiência, serviços, onde já trabalhou, escolaridade, cursos, equipamentos, dias e horários, região, idiomas e diferenciais. O filtro anti-contato confere cada texto do currículo (`curriculo_tem_contato`), inclusive quando o admin preenche.
- Tabela `suporte_mensagens` (uma conversa por pessoa com a administração), com RLS: cada um vê só a sua; o admin vê e responde todas. Funções `suporte_marcar_lidas` e `admin_salvar_curriculo`. `admin_resumo` ganhou `suporte_novas`.

### Telas
- **Meu currículo** (Minha Conta): 10 passos com sugestões por profissão (32 áreas) — é só tocar para marcar. Botão "Montar o texto para mim" escreve a apresentação com as respostas. Barra de "% preenchido" e o que falta.
- **Perfil do profissional:** mostra o currículo (serviços, onde trabalhou, estudo e cursos, equipamentos, quando e onde atende, idiomas, diferenciais) e o tempo de experiência. A busca também encontra pelos serviços e cursos do currículo.
- **Fale com o administrador:** fixo no topo de Mensagens, em Minha Conta e na Ajuda. Mensagens prontas para quem não sabe o que escrever; número de mensagens novas na aba.
- **Admin:** lista "Atendimento" (quem está esperando primeiro), perguntas prontas para montar o currículo e botão "Preencher currículo" da pessoa. Na aba Usuários, botões "Conversar" e "Currículo".

## Etapa 1 — Experiência e identidade visual
**Auditoria feita antes das mudanças.** Mantido tudo que já funcionava (cadastro, busca inteligente, chat, propostas, pagamento, verificação, Cadastur, pedidos, admin, filtro anti-burla, demonstração). Banco: só acréscimos, nenhum dado apagado.

### Banco de dados (somente acréscimos)
- Tabela `favoritos` (com RLS: cada usuário vê e altera só os seus).
- Coluna `pedidos.prazo`.

### Visual
- Paleta oficial: laranja #F45B2A / #FF784B, fundo #F7F8FA, texto #20242B / #727985, verde #198754, vermelho #D94343, bordas #E9EDF1.
- Sempre claro. Animação suave de entrada das telas, resposta ao toque, carregamento animado (esqueleto) e telas vazias com ícone e texto amigável.

### Telas
- **Início:** marca, cidade, mensagens não lidas e foto; "Olá! O que você precisa hoje?"; busca grande; cartões "Encontrar profissionais" e "Publicar um pedido"; categorias; "Em destaque" (verificados da cidade, em carrossel); "Bem avaliados"; "Oportunidades" (pedidos da cidade); aviso quando a cidade não tem profissionais.
- **Busca:** filtros Mais relevantes, Mais bem avaliados, Menor preço, Mais experiência, Verificados e Cadastur (turismo).
- **Cartões:** botão de favoritar; "Novo no app" para quem ainda não tem avaliações.
- **Perfil do profissional:** favoritar, faixa de garantias (pagamento protegido, contato após pagar, avaliações reais) e botão "Solicitar orçamento".
- **Mensagens:** lista com foto, nome, serviço, situação, horário, última mensagem e indicador de não lida.
- **Proposta:** cartão "Proposta recebida/enviada" com etapas (Proposta > Pago > Concluído), valor total, comissão de 10% e "Você recebe"; botões "Aceitar e pagar" e "Recusar".
- **Conta:** blocos Minha conta, Minha atividade, Para profissionais, Administração e Ajuda; indicador "Seu perfil está X% completo" com o próximo passo; telas Favoritos e Ajuda (perguntas frequentes).
- **Pedidos:** abas Oportunidades / Meus pedidos / Publicar; profissional já vê a própria área; campo "Para quando?" (prazo).
- **Textos:** linguagem simples ("Pronto! Seu pedido foi publicado.", "Pagamento confirmado!", "Estamos conferindo seus documentos.").
- **Demonstração:** aviso de que todos os dados são fictícios e nenhum pagamento é real.

### Próximas etapas (não feitas ainda)
- Etapa 2: revisão de RLS, webhook com idempotência, estados financeiros completos, logs administrativos, contestação de bloqueios.
- Etapa 3: agenda, comparação de propostas, destaque pago, plano empresarial, push, OCR, split.
- "Mais próximos" e "Disponíveis" dependem de localização e agenda (ainda não existem).

## Nova identidade (modelo do dono do app)
- Logo novo: capacete laranja + check azul-marinho. Cores laranja #F57C1F e azul-marinho #13284A; títulos em Poppins.
- Tela inicial igual ao modelo: topo com sino e menu ☰, faixa azul com foto do profissional, busca, quadros Construção/Reparos/Limpeza/Outros Serviços, botões Preciso de um serviço / Sou profissional.
- Barra de baixo com 5 abas: Início, Buscar, Anunciar, Mensagens, Minha Conta. Oportunidades de trabalho e Demonstração ficam no menu ☰.
- Páginas novas: grupos de serviços (/grupo/...) e Todos os serviços (/categorias).

## Entrada e parcelamento
- Proposta com forma de pagamento: à vista ou entrada de 20/30/40/50% + restante no final.
- Cliente escolhe Pix ou cartão em até 12x (no app real, o Mercado Pago mostra as parcelas e eventuais juros).
- Banco: colunas `contratacoes.entrada_pct` e `valor_pago`, tabela `pagamentos` (com proteção contra pagamento repetido), funções `proximo_pagamento` e `registrar_pagamento` (só o servidor registra).
- Conclusão do serviço só com tudo pago. Webhook registra entrada, restante ou total.
