export function connectionInput(b){
 const u=new URL(String(b.url||''));if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port&&u.port!=='443')throw Error('Use um endereço HTTPS público sem credenciais');
 if(!String(b.name||'').trim()||!['GET','POST'].includes(b.method))throw Error('Informe nome e método GET ou POST');
 const parameters=b.parameters||[];if(!Array.isArray(parameters)||parameters.length>30||parameters.some(x=>!/^\w{1,60}$/.test(x.name)||['__proto__','constructor','prototype'].includes(x.name)||String(x.description||'').length>500)||new Set(parameters.map(x=>x.name)).size!==parameters.length)throw Error('Parâmetros inválidos');
 return {name:String(b.name).trim().slice(0,100),description:String(b.description||'').slice(0,2000),url:u.href,method:b.method,parameters:parameters.map(x=>({name:x.name,description:String(x.description||'')})),active:b.active!==false};
}
