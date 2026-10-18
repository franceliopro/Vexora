import bcrypt from 'bcryptjs';import {adm,q} from './db.js';import {als} from './ctx.js';import {applyVertical} from './verticals.js';
export async function createTenant({name,slug,domain,vertical='geral',owner}){
 slug=String(slug||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug)throw new Error('slug inválido');
 const t=(await adm('insert into tenants(slug,name,domain) values($1,$2,$3) returning *',[slug,name,domain||null])).rows[0];
 await als.run({tenant:t.id},async()=>{
  await q("insert into settings(key,value) values('brand',$1),('vertical','\"geral\"')",[JSON.stringify({name,color:'#2563eb',font:'Inter',logo:''})]);
  await applyVertical(vertical);
  if(owner?.email)await q("insert into users(name,email,pass,role) values($1,$2,$3,'owner')",[owner.name||name,owner.email,await bcrypt.hash(owner.pass,10)])});
 return t}
