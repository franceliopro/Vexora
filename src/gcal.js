import {q} from './db.js';const E=process.env;
const on=()=>!!E.GCAL_REFRESH_TOKEN;
async function tok(){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:E.GCAL_CLIENT_ID,client_secret:E.GCAL_CLIENT_SECRET,refresh_token:E.GCAL_REFRESH_TOKEN,grant_type:'refresh_token'})});return (await r.json()).access_token}
const cal=()=>encodeURIComponent(E.GCAL_CALENDAR_ID||'primary');
export async function createAppt({contact_id,title,start,minutes=30}){const s=new Date(start),e=new Date(s.getTime()+minutes*6e4);if(isNaN(s))throw new Error('data inválida');
 if((await q("select 1 from appointments where status<>'cancelado' and starts_at<$2 and ends_at>$1",[s,e])).rowCount)throw new Error('horário ocupado');
 let gid=null;if(on()){const t=await tok();const h={authorization:'Bearer '+t,'content-type':'application/json'};
  const fb=await(await fetch('https://www.googleapis.com/calendar/v3/freeBusy',{method:'POST',headers:h,body:JSON.stringify({timeMin:s,timeMax:e,items:[{id:E.GCAL_CALENDAR_ID||'primary'}]})})).json();
  if(Object.values(fb.calendars||{}).some(c=>c.busy?.length))throw new Error('horário ocupado');
  gid=(await(await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal()}/events`,{method:'POST',headers:h,body:JSON.stringify({summary:title,start:{dateTime:s},end:{dateTime:e}})})).json()).id}
 return (await q('insert into appointments(contact_id,title,starts_at,ends_at,gcal_id) values($1,$2,$3,$4,$5) returning *',[contact_id,title,s,e,gid])).rows[0]}
export async function cancelAppt(id){const a=(await q("update appointments set status='cancelado' where id=$1 returning *",[id])).rows[0];if(a?.gcal_id&&on())await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal()}/events/${a.gcal_id}`,{method:'DELETE',headers:{authorization:'Bearer '+await tok()}});return a}
