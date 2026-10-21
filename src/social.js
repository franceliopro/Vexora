import {q} from './db.js';import {D} from './core.js';
export async function publishPost(id){throw Error('Abra Postagens e revise o conteúdo no novo painel antes de publicar. O fluxo antigo foi substituído para confirmar o resultado real por rede.')}
// Meta Ads: cria campanha PAUSADA via Marketing API. settings.meta={token,ad_account:"act_123"}; ads.data={objective,daily_budget,...}
export async function publishAd(id){const a=(await q('select * from ads where id=$1',[id])).rows[0],m=(await q("select value from settings where key='meta'")).rows[0]?.value;if(!m?.token)throw new Error('configure settings.meta');
 const r=await fetch(`https://graph.facebook.com/v20.0/${m.ad_account}/campaigns`,{method:'POST',body:new URLSearchParams({name:a.name,objective:a.data.objective||'OUTCOME_ENGAGEMENT',status:'PAUSED',special_ad_categories:'[]',access_token:m.token})});
 const j=await r.json();if(!r.ok)throw new Error(JSON.stringify(j));await q("update ads set status='criada',data=data||$2 where id=$1",[id,JSON.stringify({campaign_id:j.id})])}
export async function adInsights(id){const a=(await q('select * from ads where id=$1',[id])).rows[0],m=(await q("select value from settings where key='meta'")).rows[0].value;
 return (await fetch(`https://graph.facebook.com/v20.0/${a.data.campaign_id}/insights?fields=impressions,clicks,spend,ctr&access_token=${m.token}`)).json()}
