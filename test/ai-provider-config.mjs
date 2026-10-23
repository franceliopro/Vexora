import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TEXT_ENDPOINTS,textModel} from '../src/ai/providers.js';

const compose=fs.readFileSync(new URL('../docker-compose.yml',import.meta.url),'utf8');
const waha=compose.split('  waha:')[1].split('  pgadmin:')[0];
assert.match(waha,/devlikeapro\/waha:noweb/);
assert.match(waha,/WAHA_API_KEY:\s*\"\$\{WAHA_KEY:\?Defina WAHA_KEY nos secrets do Dokploy\}\"/);
assert.match(compose,/WAHA_KEY:\s*\"\$\{WAHA_KEY:\?Defina WAHA_KEY nos secrets do Dokploy\}\"/,'The app and WAHA must share one required secret');
const wahaDriver=fs.readFileSync(new URL('../src/drivers/waha.js',import.meta.url),'utf8');
assert.match(wahaDriver,/c\.config\?\.key\|\|process\.env\.WAHA_KEY/,'Managed WAHA should use the shared server-side key when the inbox key is blank');
assert.match(wahaDriver,/WAHA 401: chave API inválida ou ausente/,'401 should provide an actionable authentication hint');
assert.match(waha,/WHATSAPP_DEFAULT_ENGINE:\s*\$\{WHATSAPP_DEFAULT_ENGINE:-NOWEB\}/);
assert.match(waha,/WHATSAPP_RESTART_ALL_SESSIONS/);
assert.match(waha,/127\.0\.0\.1:3000\/ping/);
assert.doesNotMatch(waha,/\n\s+ports:/,'WAHA deve permanecer privado na rede interna do Compose');

const ui=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
assert.match(ui,/llmProv=\['openai','anthropic','gemini'\]/);
assert.match(ui,/mk\('llm','LLM',llmProv\)/);
assert.match(TEXT_ENDPOINTS.gemini,/generativelanguage\.googleapis\.com\/v1beta\/openai/);

let captured;
const answer=await textModel(
  {provider:'gemini',key:'gemini-test-key',model:'gemini-3.8-flash',json_mode:true},
  'system prompt',
  [{role:'user',content:'Olá'}],
  async (url,init)=>{
    captured={url,init};
    return new Response(JSON.stringify({choices:[{message:{content:'{"reply":"Olá"}'}}]}),{
      status:200,headers:{'content-type':'application/json'}
    });
  }
);
assert.equal(answer,'{"reply":"Olá"}');
assert.equal(captured.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
assert.equal(captured.init.headers.authorization,'Bearer gemini-test-key');
assert.equal(JSON.parse(captured.init.body).model,'gemini-3.8-flash');
assert.deepEqual(JSON.parse(captured.init.body).response_format,{type:'json_object'});
console.log('Gemini provider and managed WAHA configuration: OK');
