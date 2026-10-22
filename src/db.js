import pg from 'pg';import fs from 'fs';import {als} from './ctx.js';
pg.types.setTypeParser(1082,x=>x); // DATE vem como 'YYYY-MM-DD' (sem fuso)
const ADMIN=process.env.DATABASE_URL,au=new URL(ADMIN);const APPPW=process.env.APP_DB_PASSWORD||'troque-app';
au.username='vexora_app';au.password=APPPW;
const admin=new pg.Pool({connectionString:ADMIN,max:4}),app=new pg.Pool({connectionString:au.toString(),max:20});
export const adm=(t,p)=>admin.query(t,p); // superusuário: só migração, painel da plataforma e backup
// q(): com tenant no contexto roda numa transação com app.tenant definido ⇒ RLS filtra tudo. Sem tenant ⇒ RLS não devolve nada (falha fechada).
export const q=async(t,p)=>{const s=als.getStore();if(!s?.tenant)return app.query(t,p);const c=await app.connect();
 try{await c.query('begin');await c.query("select set_config('app.tenant',$1,true)",[String(s.tenant)]);await c.query("select set_config('app.actor',$1,true)",[String(s.actor||'')]);const r=await c.query(t,p);await c.query('commit');return r}
 catch(e){await c.query('rollback').catch(()=>{});throw e}finally{c.release()}};
let C={};export async function cols(t){if(C[t])return C[t];const r=await q("select column_name c,data_type d from information_schema.columns where table_schema='public' and table_name=$1",[t]);return C[t]=Object.fromEntries(r.rows.map(x=>[x.c,x.d]))}
export async function migrate(){for(let i=0;i<40;i++){try{await adm('select 1');break}catch{await new Promise(r=>setTimeout(r,2000))}}
 // Rename the previous internal role, preserving grants and ownership on upgrades.
 await adm(`do $$ begin if exists(select from pg_roles where rolname='nexora_app') and not exists(select from pg_roles where rolname='vexora_app') then alter role nexora_app rename to vexora_app; end if; end $$`);
 await adm(`do $$ begin if not exists(select from pg_roles where rolname='vexora_app') then create role vexora_app login nosuperuser nobypassrls; end if; end $$`);
 await adm(`alter role vexora_app password '${APPPW.replace(/'/g,"''")}'`);
 await adm('create table if not exists _migrations(name text primary key,at timestamptz default now())');
 const dir=new URL('../db/migrations/',import.meta.url);
 for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()){if((await adm('select 1 from _migrations where name=$1',[f])).rowCount)continue;
  const c=await admin.connect();try{await c.query('begin');await c.query(fs.readFileSync(new URL(f,dir),'utf8'));await c.query('insert into _migrations(name) values($1)',[f]);await c.query('commit')}catch(e){await c.query('rollback');throw e}finally{c.release()}}
 await adm(`grant usage on schema public to vexora_app;grant select,insert,update,delete on all tables in schema public to vexora_app;
  revoke insert,update,delete on tenants from vexora_app;revoke all on _migrations from vexora_app;grant usage,select on all sequences in schema public to vexora_app;
  grant execute on function resolve_tenant(text,text),login_lookup(text),channel_tenant(int),resolve_site_widget(text),resolve_commerce_hook(text) to vexora_app;`);
 await adm('revoke all on platform_provider_settings,managed_social_accounts from vexora_app');
 if(!(await adm('select 1 from tenants limit 1')).rowCount){const {createTenant}=await import('./tenants.js');await createTenant({name:'Principal',slug:'principal'})}}


// One connection and one tenant context for an entire atomic operation.
export async function tenantTransaction(tenant,fn){const c=await app.connect();try{await c.query('begin');await c.query("select set_config('app.tenant',$1,true)",[String(tenant)]);await c.query("select set_config('app.actor',$1,true)",[String(als.getStore()?.actor||'')]);const result=await fn((t,p)=>c.query(t,p));await c.query('commit');return result}catch(e){await c.query('rollback');throw e}finally{c.release()}}
export async function adminTransaction(fn){const c=await admin.connect();try{await c.query('begin');const result=await fn((t,p)=>c.query(t,p));await c.query('commit');return result}catch(e){await c.query('rollback');throw e}finally{c.release()}}

// A small dedicated pool keeps slow channel sends from exhausting the application's query pool.
const processingLocks=new pg.Pool({connectionString:au.toString(),max:Math.max(4,Math.min(32,Number(process.env.PROCESSING_LOCK_POOL_SIZE)||12))});
export async function withConversationLock(id,fn){const tenant=als.getStore()?.tenant;if(!tenant)throw Error('Empresa ausente');const c=await processingLocks.connect();try{await c.query('select pg_advisory_lock(hashtextextended($1,0))',[tenant+':process:'+id]);return await fn()}finally{try{await c.query('select pg_advisory_unlock_all()')}finally{c.release()}}}
