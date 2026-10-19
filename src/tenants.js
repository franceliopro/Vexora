import bcrypt from 'bcryptjs';
import {adminTransaction} from './db.js';
import {normalizeBrand,text,templateSpec,installTemplate} from './product.js';
export async function createTenant({name,slug,domain,owner,brand={},template_id}){
 name=text(name,'Nome da empresa',100);slug=String(slug||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug||slug.length>80)throw new Error('Código inválido');
 domain=domain?String(domain).trim().toLowerCase():null;if(domain&&!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw new Error('Domínio inválido: informe apenas o hostname');
 const b={name,color:'#6254e8',font:'Inter',logo:'',logo_dark:'',favicon:'',...normalizeBrand(brand)};
 let user;if(owner?.email){if(typeof owner.pass!=='string'||owner.pass.length<8||owner.pass.length>128)throw new Error('Senha inicial: 8 a 128 caracteres');const email=text(owner.email,'Email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email inválido');user={name:text(owner.name||name,'Nome do responsável',100),email,pass:await bcrypt.hash(owner.pass,10)}}
 if(template_id)templateSpec(template_id);
 return adminTransaction(async query=>{const t=(await query('insert into tenants(slug,name,domain) values($1,$2,$3) returning *',[slug,name,domain])).rows[0];await query("select set_config('app.tenant',$1,true)",[String(t.id)]);
 await query("insert into settings(key,value) values('brand',$1),('modules','[]'::jsonb)",[JSON.stringify(b)]);
 for(const [pos,stage]of ['Novo','Em conversa','Qualificado','Ganho','Perdido'].entries())await query('insert into stages(name,pos,kind) values($1,$2,$3)',[stage,pos,stage==='Ganho'?'won':stage==='Perdido'?'lost':'open']);
 if(user)await query("insert into users(name,email,pass,role) values($1,$2,$3,'owner')",[user.name,user.email,user.pass]);
 if(template_id)await installTemplate(query,template_id);return t})}
