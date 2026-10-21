export function connectionInput(b){
 const u=new URL(String(b.url||''));if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port&&u.port!=='443')throw Error('Use um endereço HTTPS público sem credenciais');
 if(!String(b.name||'').trim()||!['GET','POST'].includes(b.method))throw Error('Informe nome e método GET ou POST');
 const parameters=b.parameters||[];if(!Array.isArray(parameters)||parameters.length>30||parameters.some(x=>!/^\w{1,60}$/.test(x.name)||['__proto__','constructor','prototype'].includes(x.name)||String(x.description||'').length>500)||new Set(parameters.map(x=>x.name)).size!==parameters.length)throw Error('Parâmetros inválidos');
 let body={};if(Object.hasOwn(b,'body_template')){if(b.body_template!==null&&(b.method!=='POST'||typeof b.body_template!=='object'||Array.isArray(b.body_template)))throw Error('Body deve ser objeto JSON para POST');if(b.body_template!==null)connectionBody(b.body_template,Object.fromEntries(parameters.map(p=>[p.name,'exemplo'])),parameters);body.body_template=b.body_template}
 return {...body,name:String(b.name).trim().slice(0,100),description:String(b.description||'').slice(0,2000),url:u.href,method:b.method,parameters:parameters.map(x=>({name:x.name,description:String(x.description||'')})),active:b.active!==false};
}
export function connectionHeaders(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>20)throw Error('Headers devem ser um objeto JSON com até 20 itens');
 const result={};for(const [name,valueText]of Object.entries(value)){const key=name.toLowerCase();if(!/^[!#$%&'*+.^_`|~0-9a-z-]{1,80}$/.test(key)||['host','content-length','connection','transfer-encoding','upgrade','te','trailer','expect','cookie','set-cookie','__proto__','constructor','prototype'].includes(key)||key.startsWith('proxy-')||typeof valueText!=='string'||valueText.length>4000||/[\r\n\0]/.test(valueText))throw Error('Header inválido: '+name);if(Object.hasOwn(result,key))throw Error('Header duplicado: '+name);Object.defineProperty(result,key,{value:valueText,enumerable:true})}if(JSON.stringify(result).length>16000)throw Error('Headers excedem 16 KB');return result;
}
export function connectionBody(template,args,parameters=[]){
 const allowed=new Set(parameters.map(p=>p.name));
 const visit=(value,depth=0)=>{if(depth>8)throw Error('Body excede 8 níveis');if(typeof value==='string'){const exact=value.match(/^\{\{(\w+)\}\}$/);const get=name=>{if(!allowed.has(name))throw Error('Variável não autorizada no body: '+name);if(!Object.hasOwn(args,name))throw Error('Parâmetro necessário no body: '+name);return args[name]};if(exact)return get(exact[1]);return value.replace(/\{\{(\w+)\}\}/g,(_,name)=>String(get(name)))}if(Array.isArray(value))return value.map(v=>visit(v,depth+1));if(value&&typeof value==='object'){const out={};for(const [k,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Chave inválida no body');out[k]=visit(v,depth+1)}return out}return value};
 const result=visit(template);if(JSON.stringify(result).length>16000)throw Error('Body excede 16 KB');return result;
}
