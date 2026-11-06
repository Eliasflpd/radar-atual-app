# Regras do projeto Contrata Aí

Normas definidas pelo dono do app. Valem para todo trabalho neste projeto.

## Tela
- **Nada rola para o lado.** Proibido carrossel, faixas de botões ou tabelas com rolagem lateral, e caixas com rolagem própria. Use grade ou itens que quebram linha.
- **Sempre claro.** Não existe modo escuro.
- **Tela inicial = modelo enviado pelo dono** (logo capacete + check, faixa azul-marinho com "O profissional certo, perto de você!" e foto do profissional, busca "Qual serviço você precisa?", quadros Construção/Reparos/Limpeza/Outros Serviços, botões "Preciso de um serviço" e "Sou profissional"). Sem login, cabe inteira na tela, sem rolar.
- **Barra de baixo com 5 abas:** Início, Buscar, Anunciar, Mensagens, Minha Conta.
- **Cores:** laranja #F57C1F e azul-marinho #13284A, fundo claro. Fonte dos títulos: Poppins.
- **Quem precisa de um serviço não é obrigado a se cadastrar para olhar.** A conta só é pedida ao solicitar orçamento ou publicar pedido.

## Negócio
- Comissão de 10%, descontada do profissional.
- Pagamento: à vista ou entrada (20, 30, 40 ou 50%) + restante no final; pago por **Pix na conta 99Pay do dono** (QR code e copia e cola gerados pelo app; o cliente toca em "Já paguei" e o admin confere na 99Pay e confirma no painel). O dono não usa Mercado Pago. O WhatsApp é liberado com a entrada; "Serviço foi feito" só depois de pagar tudo; repasse só com tudo pago e concluído.
- WhatsApp e contato só depois do pagamento confirmado. O filtro anti-contato vale no banco, não só na tela.
- Público com pouca familiaridade com tecnologia: textos simples, botões grandes, poucos passos.

## Técnica
- HTML, CSS e JavaScript puro, sem framework. Supabase, Vercel e PWA. Pagamento por Pix (99Pay) com confirmação manual do admin.
- Mudanças no banco: só acréscimos, sem apagar dados.
- Testar no celular (390 px e 360 px) e conferir que a página não fica mais larga que a tela.
