// Personal preference, scoped to this company and user; never changes message contents.
function conversationAppearance(stream,tools){
 const key='vexora:chat-background:'+ME.tid+':'+ME.id;
 const themes=[['default','Padrão'],['whatsapp','WhatsApp · areia'],['mint','WhatsApp · menta'],['instagram','Instagram · aurora'],['sunset','Instagram · pôr do sol'],['lavender','Lavanda'],['ocean','Oceano'],['sand','Areia'],['slate','Grafite'],['night','Noite']];
 let selected='default';try{const saved=localStorage.getItem(key);if(themes.some(x=>x[0]===saved))selected=saved}catch{}
 const apply=value=>{selected=value;stream.dataset.background=value;try{localStorage.setItem(key,value)}catch{}};
 apply(selected);
 tools.append(UX.button('◐',()=>UX.tool('Fundo da conversa',f=>{
  f.append(h('p',{class:'mu'},'Escolha seu fundo. Esta preferência é só sua nesta empresa e neste navegador. As mensagens usam tons e sobretons do fundo escolhido, com contraste próprio para manter a leitura confortável.'));
  const grid=h('div',{class:'conversation-background-grid',role:'group','aria-label':'Fundos disponíveis'});
  const draw=()=>grid.replaceChildren(...themes.map(([value,label])=>UX.button(h('span',{},h('span',{class:'background-preview','data-background':value},h('span',{},'Olá!')),h('small',{},label)),()=>{apply(value);draw()},'g',{'aria-pressed':String(value===selected),'aria-label':label,title:label})));
  draw();f.append(grid);
 }),'g',{'aria-label':'Personalizar fundo da conversa',title:'Personalizar fundo da conversa',class:'composer-icon'}));
}
