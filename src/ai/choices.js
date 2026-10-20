import {prettyNumber} from '../service-entry.js';
// Native choices share the same numbered transcript on every channel.
export function aiChoices(reply,options){
 const text=String(reply||'').trim();if(!text||!Array.isArray(options)||options.length<2||options.length>10||options.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>80||/[\r\n]/.test(x)))return {body:text};
 const values=options.map(x=>x.trim());if(new Set(values.map(x=>x.toLocaleLowerCase('pt-BR'))).size!==values.length)return {body:text};
 return {body:text+'\n\n'+values.map((x,i)=>prettyNumber(i+1)+' '+x).join('\n')+'\n\nToque em uma opção ou responda com o número.',choices:{text,options:values}};
}
