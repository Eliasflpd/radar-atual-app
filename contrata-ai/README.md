# Contrata Aí

Marketplace de serviços (PWA) que conecta **prestadores** de qualquer área (pedreiro, eletricista, diarista, designer...) a **contratantes** (pessoas e empresas). O administrador recebe **10% de cada contratação, descontados do prestador**.

## Como funciona

```
Busca → Chat interno → Proposta do prestador → Cliente paga no app (Mercado Pago)
      → WhatsApp liberado para os dois → Serviço → Cliente confirma → Avaliação
      → Admin repassa 90% ao prestador via Pix
```

- **Qualquer pessoa maior de 18 anos se cadastra.** A mesma conta pode contratar e oferecer serviços.
- **O contato fica oculto até o pagamento.** O WhatsApp e o e-mail ficam numa tabela separada e só são entregues depois que existe uma contratação paga entre as duas pessoas. Essa regra é garantida no banco de dados.
- **Filtro anti-burla.** Telefone (inclusive escrito por extenso ou com espaços), e-mail, links, "zap", "insta", "me liga" e "por fora" são bloqueados no chat, no perfil e nas propostas. Cada tentativa gera um aviso, e no 3º a conta é **suspensa automaticamente**.
- **Avaliações** só valem para serviços pagos e concluídos pelo app.
- **Fotos dos trabalhos:** o prestador envia até 12 fotos, reduzidas no celular antes do envio, que aparecem na busca e no perfil (Supabase Storage). Também dá para colocar foto de perfil.
- **Verificação de identidade:** CPF (com conferência dos dígitos), foto do documento (CNH, RG ou RNE) e selfie segurando o documento, guardados em área privada. O admin aprova ou rejeita com motivo, e quem é aprovado ganha o selo ✔. Um CPF só pode estar em uma conta.
- **Pedidos:** empresas e clientes publicam o que precisam (ex.: 3 ajudantes de obra). Profissionais tocam em "Tenho interesse" e a conversa abre no chat.
- **Painel do admin:** comissão acumulada, repasses pendentes com a chave Pix do prestador, tentativas de burla, verificação e suspensão de usuários.

## Colocar no ar (cerca de 20 minutos)

1. **Supabase** (banco e login), em [supabase.com](https://supabase.com):
   - Crie um projeto, abra **SQL Editor** e rode o arquivo `supabase/schema.sql` inteiro.
   - Em **Authentication > URL Configuration**, coloque a URL do site.
   - Copie a URL e as chaves em **Project Settings > API**.
2. **Mercado Pago**, em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers):
   - Crie uma aplicação e copie o **Access Token** (use o de teste primeiro).
   - Em **Webhooks**, aponte para `https://SEU-SITE/api/webhook-mp` com o evento **Pagamentos**.
3. **Vercel**: importe este repositório e cadastre as variáveis do `.env.example`.
4. Crie sua conta no app e rode no SQL Editor:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'SEU-EMAIL');
   ```

No celular, abra o site e toque em **"Adicionar à tela inicial"** para instalar o app.

## Estrutura

| Pasta | O que é |
|---|---|
| `public/` | App (HTML, CSS, JS, PWA) |
| `public/demo.html` | Demonstração sem servidor (dados de exemplo) |
| `public/js/filtro.js` | Detecção de contato (aviso antes de enviar) |
| `api/` | Funções do servidor: config, pagamento, webhook do Mercado Pago |
| `supabase/schema.sql` | Tabelas, regras de segurança, filtro no banco, comissão |
| `tests/` | Testes do filtro (`npm test`) |

## Próximos passos sugeridos

- Leitura de texto em imagens (OCR) para bloquear números escritos em fotos
- Repasse automático com split (Mercado Pago Marketplace ou Asaas)
- Notificações push de nova mensagem
- Revisar os Termos de Uso com um advogado
