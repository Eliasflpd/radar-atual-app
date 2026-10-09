import fs from 'fs';
const dir='D:/MEUS ESTUDOS/MARIA';
const files=fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith('.pdf')).sort();
files.forEach((f,i)=>console.log(i, JSON.stringify(f)));
