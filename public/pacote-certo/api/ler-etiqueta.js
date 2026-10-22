// Função da Vercel que lê a foto de uma etiqueta com o Claude e devolve os campos do endereço.
// A chave fica só no servidor (variável ANTHROPIC_API_KEY do projeto na Vercel).
// Contrato com o app: ver o topo de js/ocr.js.
import Anthropic from '@anthropic-ai/sdk';

const MODELO = process.env.OCR_MODEL || 'claude-opus-5-5';

const CAMPOS = ['bairro', 'logradouro', 'numero', 'complemento', 'destinatario', 'rastreio', 'cidade', 'estado', 'cep', 'observacoes'];

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...CAMPOS, 'semNumero', 'incertos'],
  properties: {
    ...Object.fromEntries(CAMPOS.map((campo) => [campo, { type: 'string' }])),
    semNumero: { type: 'boolean' },
    incertos: { type: 'array', items: { type: 'string', enum: [...CAMPOS, 'semNumero'] } },
  },
};

const INSTRUCOES = `Você lê fotos de etiquetas de entrega no Brasil para um entregador. As fotos são tiradas na rua, às vezes tortas, com reflexo ou cortadas. Mercado Livre, Shein, TikTok Shop, Shopee, Amazon, Correios, J&T, Loggi, Jadlog, Total Express e outras transportadoras.

Extraia SÓ os dados do DESTINATÁRIO, quem vai receber o pacote:
- Procure blocos com "Destinatário", "Para", "Entregar para", "DEST", "Comprador" ou o nome da pessoa seguido do endereço.
- Ignore o REMETENTE ("Remetente", "De", "REM", "Vendedor", "Devolução", nome de loja, CNPJ, centro de distribuição, "Agência"). Etiquetas do Mercado Livre e Shein trazem os dois; o do remetente costuma ser menor, em cima ou no rodapé.
- Se não der para saber com segurança qual endereço é do destinatário, deixe os campos de endereço vazios e marque-os em "incertos".

Campos:
- logradouro: tipo por extenso + nome, com a grafia correta mais provável ("Rua dos Andrades", "Avenida Brasil", "Travessa Orfileno Leda"). Escreva TV como Travessa, Av como Avenida, R como Rua. Não inclua número, bairro nem complemento aqui.
- numero: só o número do imóvel (ex.: "12", "450-A"). Não confunda com CEP, número do pedido, apto ou quantidade.
- semNumero: true só se estiver escrito "S/N", "SN", "sem número" ou equivalente.
- complemento: apto, bloco, casa, fundos, loja, andar, ponto de referência curto. Ex.: "Apto 202 Bl B".
- bairro: o bairro do destinatário (às vezes aparece depois do complemento, separado por " - " ou ","). Nunca use a cidade como bairro.
- cidade, estado (sigla UF de 2 letras), cep (formato 00000-000).
- destinatario: nome de quem recebe.
- rastreio: o código de rastreio do pacote (ex.: "BR1234567890", "SHNBR...", "LGI...", "NX123456789BR", "AM..."). Prefira o código impresso junto ao código de barras principal. Sem espaços. Não use número de pedido, NF ou CEP.
- observacoes: só instrução útil de entrega escrita na etiqueta (ex.: "deixar na portaria"). Senão, vazio.

Regras:
- Nunca invente nem complete dado ilegível ou ausente: deixe a string vazia.
- Se receber uma lista de ruas já cadastradas e a rua da etiqueta for a mesma de uma delas (mesmo com letra trocada, faltando ou tipo diferente, como "TV" x "Rua"), use EXATAMENTE o nome da lista. Só crie um nome novo se for outra rua de verdade.
- "incertos" é só para dúvida real sobre o valor de um campo: um dígito do número que pode ser outro (1/7, 0/8, 5/6), letras borradas ou cortadas que mudam o nome. Foto torta, com reflexo ou com fundo bagunçado, mas legível, NÃO é dúvida. Campos vazios não entram. Na maioria das etiquetas a lista deve ficar vazia.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'metodo' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ erro: 'nao-configurado' });
    return;
  }

  const imagem = typeof req.body?.imagem === 'string' ? req.body.imagem : '';
  const ruasConhecidas = (Array.isArray(req.body?.ruasConhecidas) ? req.body.ruasConhecidas : [])
    .filter((rua) => typeof rua === 'string' && rua.trim())
    .map((rua) => rua.trim().slice(0, 120))
    .slice(0, 200);
  const pedido = ruasConhecidas.length
    ? `Ruas já cadastradas hoje (rua - bairro):\n${ruasConhecidas.map((rua) => `- ${rua}`).join('\n')}\n\nLeia esta etiqueta e devolva os dados do destinatário.`
    : 'Leia esta etiqueta e devolva os dados do destinatário.';
  const partes = imagem.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!partes) {
    res.status(400).json({ erro: 'imagem' });
    return;
  }

  try {
    const cliente = new Anthropic();
    const resposta = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: partes[1], data: partes[2] } },
          { type: 'text', text: pedido },
        ],
      }],
    });

    if (resposta.stop_reason === 'refusal' || resposta.stop_reason === 'max_tokens') {
      res.status(422).json({ erro: 'leitura' });
      return;
    }
    const texto = resposta.content.find((bloco) => bloco.type === 'text')?.text ?? '';
    const { incertos, ...dados } = JSON.parse(texto);
    res.status(200).json({ dados, incertos });
  } catch (erro) {
    // Sem endereços nem imagem no log: só o tipo e o status do erro.
    console.error('ler-etiqueta:', erro?.name, erro?.status ?? '');
    res.status(502).json({ erro: 'servico' });
  }
}
