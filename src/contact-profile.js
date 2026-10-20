// Provider URLs only reach the browser; this module never fetches arbitrary avatar URLs.
export function safeAvatar(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<4000?u.href:null}catch{return null}}
export async function refreshContactProfile(query,channel,contact,drivers,incoming={}){
 const cached=contact.data||{},now=Date.now(),supplied=safeAvatar(incoming.avatar);
 if(!supplied&&now-Date.parse(cached.avatar_checked_at||0)<24*36e5)return cached;
 let profile={};try{if(supplied)profile={avatar:supplied};else if(drivers[channel.driver]?.profile)profile=await drivers[channel.driver].profile(channel,contact)||{}}catch{/* Privacy or missing permissions must not block a conversation. */}
 const patch={avatar_checked_at:new Date().toISOString(),...(safeAvatar(profile.avatar)?{avatar_url:safeAvatar(profile.avatar)}:{})};
 await query("update contacts set data=coalesce(data,'{}'::jsonb)||$2 where id=$1",[contact.id,JSON.stringify(patch)]);return {...cached,...patch};
}
