// Extrai o <script> de uma página e valida a sintaxe com o próprio motor do node.
const fs=require('fs'), vm=require('vm');
const alvo=process.argv[2];
const html=fs.readFileSync(alvo,'utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m,n=0,erros=0;
while((m=re.exec(html))){
  n++;
  try{ new vm.Script(m[1],{filename:alvo+'#script'+n}); }
  catch(e){ erros++; console.log('ERRO no script '+n+': '+e.message); }
}
console.log((erros?'FALHOU':'OK')+' — '+n+' bloco(s) <script> inline verificado(s) em '+alvo);
process.exit(erros?1:0);
