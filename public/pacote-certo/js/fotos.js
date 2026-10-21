// Reduz a foto da etiqueta antes de guardar, para ocupar pouco espaço no aparelho.
const LADO_MAXIMO = 1600;

export async function prepararFoto(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await carregarImagem(url);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(imagem.naturalWidth * escala);
    canvas.height = Math.round(imagem.naturalHeight * escala);
    canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolver, rejeitar) => {
      canvas.toBlob((b) => (b ? resolver(b) : rejeitar(new Error('Imagem sem conteúdo.'))), 'image/jpeg', 0.85);
    });
    return { blob, hash: await assinatura(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function carregarImagem(url) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error('Formato de imagem não suportado.'));
    imagem.src = url;
  });
}

// FNV-1a sobre os bytes: funciona fora de contexto seguro (ex.: IP da rede local), onde crypto.subtle não existe.
async function assinatura(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16)}-${bytes.length}`;
}
