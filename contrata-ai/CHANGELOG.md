# Registro de alterações — Contrata Aí

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
