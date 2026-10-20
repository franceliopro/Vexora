import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import {publicAddress} from './knowledge.js';
import {seal,unseal} from './service-calendar.js';
import {skillGuard} from './ai/skills.js';
import {serviceEvent} from './operations.js';
import {connectionInput} from './connection-policy.js';
export async function requestConnection(c,args){
 const u=new URL(c.url),body=c.method==='POST'?JSON.stringify(args):null;
 if(c.method==='GET')for(const [k,v]of Object.entries(args))u.searchParams.set(k,String(v));
 const host=u.hostname.replace(/^\[|\]$/g,''),addresses=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await dns.lookup(host,{all:true});
 if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Error('Destino privado bloqueado');
 return new Promise((resolve,reject)=>{
  const headers={'accept':'application/json',...(body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{}),...(c.secret?{authorization:'Bearer '+unseal(c.secret)}:{})};
  const req=https.request(u,{method:c.method,headers,lookup:(_host,options,cb)=>{const a=addresses[0];cb(null,options?.all?[a]:a.address,a.family)}},res=>{
   if(res.statusCode<200||res.statusCode>=300){res.resume();return reject(Error('Sistema externo respondeu HTTP '+res.statusCode))}
   let size=0,chunks=[];res.on('data',b=>{size+=b.length;if(size>65536)res.destroy(Error('Resposta excedeu 64 KB'));else chunks.push(b)});res.on('error',reject);res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('Sistema externo deve responder JSON'))}});
  });req.setTimeout(8000,()=>req.destroy(Error('Tempo de consulta esgotado; confira o sistema externo antes de repetir')));req.on('error',reject);req.end(body);
 });
}
export async function callAgentConnection({query,transaction,cv,ag,action,scope}){
 const id=Number(action.connection_id);if(!(ag.skills?.connection_ids||[]).includes(id))throw Error('Conexão não autorizada');
 const c=(await query('select * from agent_connections where id=$1 and active',[id])).rows[0];if(!c)throw Error('Conexão inativa');
 const args=action.parameters||{};if(!args||typeof args!=='object'||Array.isArray(args)||JSON.stringify(args).length>16000||Object.entries(args).some(([key,v])=>!c.parameters.some(p=>p.name===key)||!['string','number','boolean'].includes(typeof v)))throw Error('Parâmetros não autorizados');
 const last=(await query("select id from messages where conversation_id=$1 and dir='in' order by id desc limit 1",[cv.id])).rows[0];
 const ordered=Object.fromEntries(Object.keys(args).sort().map(k=>[k,args[k]])),key=crypto.createHash('sha256').update(JSON.stringify([cv.id,last?.id,id,ordered,...(scope?[String(scope)]:[])])).digest('hex');
 const run=await transaction(cv.tenant_id,async q=>{await skillGuard(q,cv);return (await q('insert into agent_tool_runs(conversation_id,connection_id,run_key) values($1,$2,$3) on conflict(tenant_id,run_key) do nothing returning id',[cv.id,id,key])).rows[0]});
 if(!run){const previous=(await query('select status,result from agent_tool_runs where run_key=$1',[key])).rows[0];if(previous?.status==='completed')return previous.result;throw Error('Execução anterior sem confirmação. Um responsável deve conferir o sistema externo; não houve repetição automática.')}
 try{const result=await requestConnection(c,args);await query("update agent_tool_runs set status='completed',result=$2 where id=$1",[run.id,JSON.stringify(result)]);await serviceEvent(query,cv.id,null,'ai_api_completed',{agent_id:ag.id,connection_id:id,run_id:run.id});return result}catch(e){await serviceEvent(query,cv.id,null,'ai_api_check_required',{agent_id:ag.id,connection_id:id,run_id:run.id});throw e}
}
export function mountAgentConnections(app,{ah,adm,q}){
 app.get('/api/agent-connections/runs',adm,ah(async(req,res)=>res.json((await q('select r.id,r.conversation_id,r.status,r.at,c.name connection_name from agent_tool_runs r join agent_connections c on c.id=r.connection_id order by r.id desc limit 30')).rows)));
 app.get('/api/agent-connections',adm,ah(async(req,res)=>res.json((await q('select id,name,description,url,method,parameters,active,(secret is not null) has_key from agent_connections order by id desc')).rows)));
 const save=async(req,res)=>{const b=connectionInput(req.body),keys=Object.keys(b),values=keys.map(k=>k==='parameters'?JSON.stringify(b[k]):b[k]);if(req.body.key){if(String(req.body.key).length>4000||/[\r\n]/.test(req.body.key))throw Error('Chave inválida');keys.push('secret');values.push(seal(String(req.body.key)))}if(req.params.id){const r=await q('update agent_connections set '+keys.map((k,i)=>k+'=$'+(i+2)).join(',')+' where id=$1 returning id',[req.params.id,...values]);if(!r.rows.length)throw Error('Conexão não encontrada');res.json(r.rows[0])}else res.json((await q('insert into agent_connections('+keys.join(',')+') values('+keys.map((_,i)=>'$'+(i+1)).join(',')+') returning id',values)).rows[0])};
 app.post('/api/agent-connections',adm,ah(save));app.put('/api/agent-connections/:id',adm,ah(save));
 app.delete('/api/agent-connections/:id',adm,ah(async(req,res)=>{await q('update agent_connections set active=false where id=$1',[req.params.id]);res.json({ok:true})}));
}
