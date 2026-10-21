# Pacote Certo

## O que é

Um aplicativo para organizar as entregas do dia. Você fotografa ou digita a etiqueta de cada pacote, e o app junta os pacotes por endereço e por bairro. Na rua, você marca o que já foi entregue e vê o que falta.

Funciona no navegador do celular, também sem internet, e pode ser instalado na tela inicial como um aplicativo.

## Como abrir no computador

1. Abra o terminal na pasta do projeto e rode:

   ```
   cd pacote-certo
   python3 -m http.server 8080
   ```

2. No navegador, abra **http://localhost:8080**

**Modo demonstração:** abra **http://localhost:8080/?demo=1** para ver o app com entregas fictícias. Esses dados ficam separados e não se misturam com os seus.

## Como abrir no celular

O celular precisa abrir o app por um link com **HTTPS**. Para isso, publique a pasta `pacote-certo` como site:

- **Netlify Drop:** entre em app.netlify.com/drop e arraste a pasta `pacote-certo`. Ele cria um link na hora.
- **Vercel:** crie um projeto separado e, em *Root Directory*, coloque `pacote-certo`.

Depois:

1. Abra o link no **Chrome (Android)** ou no **Safari (iPhone)**.
2. Use **"Adicionar à tela inicial"** no menu do navegador.
3. Abra o app **uma vez com internet**. Depois disso, ele funciona offline.

## Leitura automática das etiquetas

Vem **desligada**. Para ligar, é preciso um serviço num servidor que leia a foto da etiqueta, como uma API de visão de IA.

- O endereço desse serviço vai no arquivo `config.js`, em `OCR_ENDPOINT`.
- O formato que o serviço deve receber e devolver está descrito no topo do arquivo `js/ocr.js`.
- A foto da etiqueta é **enviada para esse serviço**.
- Se o serviço usa uma chave secreta, ela fica **só no servidor**, nunca no app.

Sem esse serviço, tudo continua funcionando: você preenche os dados à mão, e as fotos ficam guardadas marcadas como "para preencher".

## Dados e privacidade

- Tudo fica **no seu aparelho**, guardado no navegador (IndexedDB). Nada vai para a internet, a não ser a foto enviada para a leitura automática, se você ligar essa função.
- **Backup:** em **Histórico** você exporta os endereços e pacotes. O backup **não leva as fotos**.
- **Apagar todos os dados:** essa opção limpa tudo do aparelho.
- **Fotos:** você pode excluir as fotos no detalhe de cada endereço.
- Se você limpar os dados do navegador, as entregas guardadas também são apagadas. Faça backup antes.

## Testes

Para quem mexe no código. Dentro da pasta `pacote-certo`, rode:

```
npm test
```

## Limitações

- Os dados ficam só no aparelho em que foram cadastrados. Não há sincronização entre aparelhos.
- O backup não leva as fotos.
- A leitura automática precisa de internet e de um serviço configurado à parte.
- Sem a leitura automática, todos os campos são preenchidos à mão.
- Endereços sem bairro, rua ou número não são agrupados: eles vão para "Revisar endereço" até serem completados.
