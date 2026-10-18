import pg from 'pg';import fs from 'fs';
export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
export const q=(t,p)=>pool.query(t,p);
let C={};
export async function cols(t){if(C[t])return C[t];const r=await q("select column_name c,data_type d from information_schema.columns where table_schema='public' and table_name=$1",[t]);return C[t]=Object.fromEntries(r.rows.map(x=>[x.c,x.d]))}
export async function migrate(){for(let i=0;i<30;i++){try{await q('select 1');break}catch{await new Promise(r=>setTimeout(r,2000))}}
const r=await q("select to_regclass('public.users') x");
if(!r.rows[0].x){await q(fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));const {applyVertical}=await import('./verticals.js');await applyVertical('geral')}}
