import assert from 'node:assert/strict';
import {baileysReceipt,wahaReceipt,recordReceipt} from '../src/message-receipts.js';
assert.equal(baileysReceipt(1),null);assert.equal(baileysReceipt(2),'sent');assert.equal(baileysReceipt(3),'delivered');assert.equal(baileysReceipt(4),'read');assert.equal(wahaReceipt(-1),'failed');assert.equal(wahaReceipt(2),'delivered');assert.equal(wahaReceipt(0),null);
const events=[];await recordReceipt(async(sql,args)=>sql.startsWith('insert')?{rows:[{status:args[2],updated_at:'now'}]}:{rows:[{id:10,conversation_id:20}]},(t,d)=>events.push({t,d}),1,'receipt-unit','delivered');assert.equal(events[0].d.status,'delivered');assert.equal(events[0].t,'message_delivery');
let calls=0;await recordReceipt(async()=>{calls++;return {rows:[]}},()=>{},1,'','delivered');assert.equal(calls,0);
console.log('OK: ACK distingue aceitação, entrega, leitura e falha; evento de confirmação e rejeição de identificador inválido (consulta simulada).');
