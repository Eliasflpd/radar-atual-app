// Armazenamento local em IndexedDB. Os dados ficam no aparelho e sobrevivem a fechar o app.
const VERSAO = 1;
export const LOJAS = ['enderecos', 'fotos', 'imagens', 'lotes', 'itens'];

export function criarRepositorio(nome) {
  const banco = new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(nome, VERSAO);
    pedido.onupgradeneeded = () => {
      for (const loja of LOJAS) {
        if (!pedido.result.objectStoreNames.contains(loja)) {
          pedido.result.createObjectStore(loja, { keyPath: 'id' });
        }
      }
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });

  function transacao(loja, modo, operacao) {
    return banco.then((db) => new Promise((resolver, rejeitar) => {
      const tx = db.transaction(loja, modo);
      let resultado;
      const pedido = operacao(tx.objectStore(loja));
      if (pedido) pedido.onsuccess = () => { resultado = pedido.result; };
      tx.oncomplete = () => resolver(resultado);
      tx.onerror = () => rejeitar(tx.error);
      tx.onabort = () => rejeitar(tx.error ?? new Error('Transação cancelada.'));
    }));
  }

  return {
    listar: (loja) => transacao(loja, 'readonly', (s) => s.getAll()),
    obter: (loja, id) => transacao(loja, 'readonly', (s) => s.get(id)),
    salvar: (loja, valor) => transacao(loja, 'readwrite', (s) => s.put(valor)),
    salvarTudo: (loja, valores) => transacao(loja, 'readwrite', (s) => {
      valores.forEach((valor) => s.put(valor));
      return null;
    }),
    remover: (loja, id) => transacao(loja, 'readwrite', (s) => s.delete(id)),
    limpar: (loja) => transacao(loja, 'readwrite', (s) => s.clear()),
  };
}
