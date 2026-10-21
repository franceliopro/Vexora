import assert from 'node:assert/strict';import pg from 'pg';
process.env.DATABASE_URL||='postgres://test:test@localhost/test';
const originalQuery=pg.Pool.prototype.query,originalFetch=globalThis.fetch;
const config={asaas:{key:'fake-company',sandbox:true,platforms:{link:{key:'fake-obsolete',sandbox:false}}}};
pg.Pool.prototype.query=async()=>({rows:[{value:config}]});
try{const {asaasConfig,samePhone,asaasDebts}=await import('../src/payments.js');assert.equal(asaasConfig(config,'link').key,'fake-company');assert.equal(asaasConfig(config,'link').sandbox,true);
 assert.equal(samePhone('+55 66 99977-6407','6699776407'),true);assert.equal(samePhone('5566999776407','6699776407'),true);assert.equal(samePhone('5566999776407','6599776407'),false);assert.equal(samePhone('6693456789','66993456789'),true);assert.equal(samePhone('6633456789','66933456789'),false);
 const requests=[];let customer=true;globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.includes('/customers?')?{data:customer?[{id:'cus_test',cpfCnpj:'52998224725',name:'Cliente Exemplo',mobilePhone:'66999776407'}]:[]}:{data:[],hasMore:false}}};
 const result=await asaasDebts('529.982.247-25',{platform:'link',verifyPhone:true,phone:'5566999776407'});assert.equal(result.found,true);assert.equal(result.name,'Cliente Exemplo');assert.ok(requests.every(r=>r.url.startsWith('https://api-sandbox.asaas.com/v3')&&r.options.headers.access_token==='fake-company'));assert.equal((await asaasDebts('52998224725',{verifyPhone:true,phone:'5565999776407'})).found,true);
 customer=false;const missing=await asaasDebts('52998224725');assert.equal(missing.found,false);assert.equal(missing.environment,'sandbox');
 console.log('OK: base Asaas única, CPF formatado, cadastro ausente distinto de sem dívida, DDD e nono dígito (API simulada).');
}finally{pg.Pool.prototype.query=originalQuery;globalThis.fetch=originalFetch}
