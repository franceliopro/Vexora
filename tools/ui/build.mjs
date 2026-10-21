import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const cli=path.join(dir,'node_modules/@tailwindcss/cli/dist/index.mjs');
const run=spawnSync(process.execPath,[cli,'-i',path.join(dir,'input.css'),'-o',path.join(root,'web/preline-ui.css'),'--minify'],{cwd:root,stdio:'inherit'});if(run.status!==0)process.exit(run.status||1);
const source=fs.readFileSync(path.join(dir,'node_modules/preline/dist/tabs-non-auto.js'),'utf8');
fs.mkdirSync(path.join(root,'web/vendor'),{recursive:true});
fs.writeFileSync(path.join(root,'web/vendor/preline-tabs.js'),'/* Preline UI 5.0.0 · see PRELINE-LICENSE.txt. Manual tabs only. */\n(()=>{const module={exports:{}};const exports=module.exports;\n'+source+'\nwindow.VexoraPrelineTabs=module.exports.default;})();\n');
fs.copyFileSync(path.join(dir,'node_modules/preline/LICENSE'),path.join(root,'web/vendor/PRELINE-LICENSE.txt'));
