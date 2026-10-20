import {companyTimeZone} from './timezone.js';
const minute=s=>{if(s==='24:00')return 1440;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)))throw Error('Horário inválido. Use HH:MM.');return Number(s.slice(0,2))*60+Number(s.slice(3))};
export function validateBusinessHours(input={}){
 const week={};for(let day=0;day<7;day++){const periods=input.week?.[day]||[];if(!Array.isArray(periods)||periods.length>6)throw Error('Use até seis intervalos por dia');week[day]=periods.map(p=>{const start=minute(p.start),end=minute(p.end);if(start>=end)throw Error('O término deve ser posterior ao início. Divida turnos noturnos entre dois dias.');return {start:p.start,end:p.end}}).sort((a,b)=>minute(a.start)-minute(b.start));for(let i=1;i<week[day].length;i++)if(minute(week[day][i].start)<minute(week[day][i-1].end))throw Error('Há horários sobrepostos no mesmo dia')}
 const closed_dates=input.closed_dates||[];if(!Array.isArray(closed_dates)||closed_dates.length>366||closed_dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d))throw Error('Datas de fechamento inválidas');
 return {enabled:input.enabled===true,week,closed_dates:[...new Set(closed_dates)]};
}
export function businessOpen(config={},zone='America/Sao_Paulo',now=new Date()){
 if(!config.enabled)return true;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value])),date=parts.year+'-'+parts.month+'-'+parts.day;
 if(config.closed_dates?.includes(date))return false;
 const day=new Date(date+'T12:00:00Z').getUTCDay(),current=Number(parts.hour)*60+Number(parts.minute);
 return (config.week?.[day]||[]).some(p=>current>=minute(p.start)&&current<minute(p.end));
}
export async function companyBusinessOpen(query,now=new Date()){const config=(await query("select value from settings where key='business_hours'")).rows[0]?.value||{};return !config.enabled||businessOpen(config,await companyTimeZone(query),now)}
export const botScheduleAllowed=(trigger={},open=true)=>!trigger.hours||trigger.hours==='always'||trigger.hours===(open?'inside':'outside');
export const BOT_SOURCES=['manual','api','campaign','sequence','ai'];
export function validateBotStrategy(trigger={}){if(!trigger||typeof trigger!=='object'||Array.isArray(trigger))throw Error('Configuração de início inválida');if(trigger.kind&&!['attendance','automation'].includes(trigger.kind))throw Error('Tipo de chatbot inválido');if(trigger.hours&&!['always','inside','outside'].includes(trigger.hours))throw Error('Regra de horário inválida');if(trigger.sources&&(!Array.isArray(trigger.sources)||trigger.sources.some(s=>!BOT_SOURCES.includes(s))))throw Error('Origem de acionamento inválida');return trigger}
export const botSourceAllowed=(trigger={},source)=>BOT_SOURCES.includes(source)&&(trigger.sources||BOT_SOURCES).includes(source);
