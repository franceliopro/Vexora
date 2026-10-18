import {als} from './ctx.js';
let w;export const setWss=x=>w=x;
// Só entrega a clientes da MESMA empresa.
export const bus=(t,d)=>{const id=als.getStore()?.tenant;if(!id)return;w?.clients.forEach(c=>c.tid===id&&c.readyState===1&&c.send(JSON.stringify({t,d})))};
