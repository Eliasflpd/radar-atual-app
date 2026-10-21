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

const INSTRUCOES = `Você lê fotos de etiquetas de entrega no Brasil (Mercado Livre, Shein, TikTok Shop, Correios, transportadoras) para um entregador.

Extraia os dados do DESTINATÁRIO. Etiquetas também trazem o endereço do remetente (loja, centro de distribuição, "Remetente", "De:"): nunca use esse endereço. Se não der para saber qual endereço é o do destinatário, deixe os campos de endereço vazios e marque-os em "incertos".

Campos:
- bairro, logradouro (tipo + nome, ex.: "Rua das Flores"), numero, complemento (apto, bloco, casa, referência curta), destinatario (nome), rastreio (código de rastreio ou do pacote, sem espaços), cidade, estado (sigla UF), cep (só números com hífen, ex.: 01234-567).
- semNumero: true só se a etiqueta disser "S/N", "sem número" ou equivalente.
- observacoes: só informação útil para a entrega escrita na etiqueta (ex.: "deixar na portaria"). Caso contrário, vazio.

Regras:
- Nunca invente nem complete dados que não estão legíveis. Campo ausente ou ilegível = string vazia.
- Copie o texto como está escrito, sem corrigir nomes de rua.
- Coloque em "incertos" o nome de cada campo preenchido em que a leitura ficou duvidosa (letra borrada, corte, reflexo, dígito ambíguo).`;

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
  const partes = imagem.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!partes) {
    res.status(400).json({ erro: 'imagem' });
    return;
  }

  try {
    const cliente = new Anthropic();
    const resposta = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: partes[1], data: partes[2] } },
          { type: 'text', text: 'Leia esta etiqueta e devolva os dados do destinatário.' },
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
