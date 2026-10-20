import {spawnSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),missing=[];
function check(source,target){if(!fs.existsSync(target)||!fs.statSync(target).isFile())missing.push(path.relative(root,source)+' → '+path.relative(root,target))}
const syntaxErrors=[];function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(file.endsWith('.js')){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)syntaxErrors.push(result.stderr);for(const [,ref]of fs.readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g))if(ref.startsWith('.'))check(file,path.resolve(path.dirname(file),ref))}}}
scan(path.join(root,'src'));scan(path.join(root,'web'));
for(const name of ['index.html','platform.html']){const file=path.join(root,'web',name);for(const [,ref]of fs.readFileSync(file,'utf8').matchAll(/(?:src|href)="([^"?#]+)/g))if(!ref.includes(':')&&!ref.startsWith('#')&&ref!=='/'&&!ref.endsWith('/'))check(file,path.join(root,'web',ref))}
if(syntaxErrors.length){console.error(syntaxErrors.join('\n'));process.exitCode=1}else if(missing.length){console.error('Pacote incompleto: arquivos locais ausentes.\n'+missing.join('\n'));process.exitCode=1}else console.log('OK: imports locais do servidor e arquivos das páginas presentes no pacote.');
