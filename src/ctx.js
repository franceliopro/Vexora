import {AsyncLocalStorage} from 'async_hooks';import crypto from 'crypto';
export const als=new AsyncLocalStorage(); // { tenant: id } — toda query roda com app.tenant = id (RLS)
const SECRET=process.env.JWT_SECRET||'dev-secret',PUB=(process.env.PUBLIC_URL||'http://localhost:3100').replace(/\/$/,'');
export const sign=s=>crypto.createHmac('sha256',SECRET).update(s).digest('hex').slice(0,24);
export const tid=()=>als.getStore()?.tenant;
export const hookUrl=(d,id)=>`${PUB}/webhook/${d}/${id}/${sign(d+':'+id)}`;
export const payHook=(p,t=tid())=>`${PUB}/webhook/pay/${p}/${t}/${sign('pay:'+t)}`;
export const orderHook=(s,t=tid())=>`${PUB}/webhook/order/${s}/${t}/${sign('order:'+t)}`;
