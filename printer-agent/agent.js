#!/usr/bin/env node
// Agente de impressão térmica (roda no PC da loja, Node 18+). Sem dependências.
//   SERVER=https://crm.seudominio.com TENANT=1 KEY=chave-do-painel PRINTER_HOST=192.168.0.50 node agent.js        (impressora de rede, porta 9100)
//   ... PRINTER_FILE=/dev/usb/lp0 node agent.js                                                                  (Linux, USB)
//   ... PRINTER_FILE='\\localhost\ELGIN' node agent.js                                                           (Windows, impressora compartilhada)
const net=require('net'),fs=require('fs');const {SERVER,TENANT,KEY,PRINTER_HOST,PRINTER_FILE}=process.env,PORT=+process.env.PRINTER_PORT||9100;
if(!SERVER||!TENANT||!KEY||!(PRINTER_HOST||PRINTER_FILE)){console.error('Defina SERVER, TENANT, KEY e PRINTER_HOST ou PRINTER_FILE');process.exit(1)}
const H={'x-print-key':KEY},U=`${SERVER.replace(/\/$/,'')}/print/${TENANT}`;
const send=buf=>new Promise((ok,no)=>{if(PRINTER_FILE){try{fs.writeFileSync(PRINTER_FILE,buf);ok()}catch(e){no(e)}return}
 const s=net.connect(PORT,PRINTER_HOST,()=>s.end(buf));s.setTimeout(8000,()=>{s.destroy();no(new Error('timeout'))});s.on('close',()=>ok());s.on('error',no)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{console.log('Agente de impressão ativo →',U);
 for(;;){try{const r=await fetch(U+'/next',{headers:H});
  if(r.status===403){console.error('Chave inválida (veja Delivery → Impressora).');await sleep(15000);continue}
  if(r.status===200){const j=await r.json();await send(Buffer.from(j.data,'base64'));await fetch(`${U}/done/${j.id}`,{method:'POST',headers:H});console.log('Impresso cupom',j.id);continue}}
  catch(e){console.error('erro:',e.message);await sleep(5000)}
  await sleep(3000)}})();
