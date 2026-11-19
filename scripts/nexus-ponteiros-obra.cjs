#!/usr/bin/env node
// NEXUS BÍBLICO — monta o pedido de SIMULAR / GRAVAR / REVERTER / ESTADO de um lote de ponteiros de obra externa.
//
// O arquivo do lote fica no PC (fora do repositório). Este script lê o lote, guarda SÓ os localizadores
// (página do PDF, página impressa, nota de página, marca impressa, versículo inicial e final) e os metadados
// da edição, e escreve o corpo do pedido para /api/nexus (ação "ponteiros-obra"). Verbete, trecho, OCR e
// caixas do PDF NÃO saem do PC.
//
// Uso:
//   node scripts/nexus-ponteiros-obra.cjs <lote.json> --lote-id <id> --modo simular|gravar|reverter|estado [--paginas N] [--saida pedido.json]
// O pedido é enviado pelo Chrome do PC (aparelho com crachá), no console de https://radar-atual.vercel.app/nexus/ :
//   fetch('/api/nexus',{method:'POST',headers:{'Content-Type':'application/json'},
//     body:JSON.stringify({...PEDIDO, cracha:localStorage.getItem('radar_chave'), token:localStorage.getItem('lp_token')})}).then(r=>r.json()).then(console.log)
const fs = require('fs');

const args = process.argv.slice(2);
const opc = (k, padrao) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : padrao; };
const arquivo = args[0] && !args[0].startsWith('--') ? args[0] : null;
const modo = opc('modo', 'simular');
const loteId = opc('lote-id', '');
if (!['simular', 'gravar', 'reverter', 'estado'].includes(modo)) { console.error('modo inválido'); process.exit(2); }
if (!loteId && modo !== 'estado') { console.error('informe --lote-id'); process.exit(2); }

function montarLote(caminho) {
  const l = JSON.parse(fs.readFileSync(caminho, 'utf8').replace(/^﻿/, ''));
  const o = l.obra || {};
  const obra = {
    id: o.id, titulo: o.titulo, autor: o.autor, revisao: o.revisao, traducao: o.traducao, editora: o.editora, original: o.original,
    ano_edicao_pt: o.ano_edicao_pt, situacao_juridica: String(o.situacao_juridica || 'pendente_verificacao').split(' ')[0],
    paginas_pdf: +(opc('paginas', o.paginas_pdf || 0)) || undefined,
  };
  Object.keys(obra).forEach((k) => obra[k] == null && delete obra[k]);
  const itens = (l.itens || []).map((x) => {
    const y = { n: x.n, pagina_pdf: x.pagina_pdf, pagina_impressa: x.pagina_impressa == null ? null : x.pagina_impressa, marca_impressa: x.marca_impressa, ini: x.ini, fim: x.fim };
    if (x.nota_pagina) y.nota_pagina = x.nota_pagina;
    return y;
  });
  return { id: loteId, obra, itens };
}

let pedido;
if (modo === 'simular' || modo === 'gravar') {
  if (!arquivo) { console.error('informe o arquivo do lote'); process.exit(2); }
  pedido = { acao: 'ponteiros-obra', modo, lote: montarLote(arquivo) };
} else pedido = { acao: 'ponteiros-obra', modo, lote_id: loteId || undefined };

const saida = opc('saida', '');
const json = JSON.stringify(pedido);
if (saida) { fs.writeFileSync(saida, json); console.error(`pedido gravado em ${saida} (${json.length} bytes, ${pedido.lote ? pedido.lote.itens.length + ' itens' : modo})`); }
else process.stdout.write(json + '\n');
module.exports = { montarLote };
