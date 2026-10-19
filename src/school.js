import {q} from './db.js';
const tzOf=async()=>(await q("select value from settings where key='tz'")).rows[0]?.value||'America/Sao_Paulo';
const busy=async(teacher,start,minutes,skip=0)=>teacher&&(await q(`select 1 from lessons where teacher=$1 and status<>'cancelada' and id<>$4 and starts_at < $2::timestamptz+($3||' minutes')::interval and starts_at+(minutes||' minutes')::interval > $2::timestamptz limit 1`,[teacher,start,minutes,skip])).rowCount>0;
export async function addLesson(b){if(!b.student_id||!b.starts_at)throw new Error('aluno e horário são obrigatórios');const m=+b.minutes||50;
 if(await busy(b.teacher,b.starts_at,m))throw new Error('professor já tem aula nesse horário');
 return (await q('insert into lessons(student_id,starts_at,minutes,teacher,room,notes) values($1,$2,$3,$4,$5,$6) returning *',[b.student_id,b.starts_at,m,b.teacher||null,b.room||null,b.notes||null])).rows[0]}
// Gera aulas semanais (ex.: toda terça 18:00 por 12 semanas), pulando conflitos de professor.
export async function generate({student_id,weekday,time,weeks=12,minutes=50,teacher,room,start}){const tz=await tzOf();weeks=Math.min(Math.max(+weeks||1,1),104);
 if(!/^\d{2}:\d{2}$/.test(time||''))throw new Error('horário inválido (HH:MM)');let d=new Date((start||new Date().toISOString().slice(0,10))+'T00:00:00Z');if(isNaN(d))throw new Error('data inválida');
 while(d.getUTCDay()!==+weekday)d=new Date(d.getTime()+864e5);let made=0,skipped=[];
 for(let i=0;i<weeks;i++,d=new Date(d.getTime()+7*864e5)){const day=d.toISOString().slice(0,10);
  const ts=(await q('select (($1::text||$2::text)::timestamp at time zone $3::text) t',[day+' ',time,tz])).rows[0].t;
  if(await busy(teacher,ts,minutes)){skipped.push(day);continue}
  await q('insert into lessons(student_id,starts_at,minutes,teacher,room) values($1,$2,$3,$4,$5)',[student_id,ts,minutes,teacher||null,room||null]);made++}
 return {made,skipped}}
// ministradas = presente + falta (a aula aconteceu); justificada/cancelada não consomem do pacote (viram reposição).
export async function summary(){const r=(await q(`select s.id,s.status,s.total_lessons,s.teacher,ct.name student,c.name course,
 count(*) filter(where l.status='presente')::int presentes,count(*) filter(where l.status='falta')::int faltas,count(*) filter(where l.status='justificada')::int justificadas,
 count(*) filter(where l.status='agendada' and l.starts_at>now())::int agendadas,min(l.starts_at) filter(where l.status='agendada' and l.starts_at>now()) proxima
 from students s join contacts ct on ct.id=s.contact_id left join courses c on c.id=s.course_id left join lessons l on l.student_id=s.id group by s.id,ct.name,c.name order by ct.name`)).rows;
 return r.map(x=>{const dadas=x.presentes+x.faltas;return {...x,ministradas:dadas,restantes:Math.max(x.total_lessons-dadas,0),a_agendar:Math.max(x.total_lessons-dadas-x.agendadas,0),frequencia:dadas?Math.round(x.presentes/dadas*100):null}})}
export const upcoming=async days=>(await q(`select l.*,ct.name student,c.name course from lessons l join students s on s.id=l.student_id join contacts ct on ct.id=s.contact_id left join courses c on c.id=s.course_id
 where l.starts_at between now()-interval '1 day' and now()+($1||' days')::interval order by l.starts_at`,[Math.min(+days||14,90)])).rows;
