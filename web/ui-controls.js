// Shared by the tenant panel and the platform panel, including fields added later.
(()=>{
 const eye='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
 function enhance(){for(const input of document.querySelectorAll('input[type=password]:not([data-password-eye])')){input.dataset.passwordEye='true';const wrap=document.createElement('span');wrap.className='password-control';input.before(wrap);wrap.append(input);const b=document.createElement('button');b.type='button';b.className='password-eye';b.innerHTML=eye;b.setAttribute('aria-label','Mostrar senha');b.setAttribute('aria-pressed','false');b.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');b.setAttribute('aria-pressed',String(show));input.focus({preventScroll:true})};wrap.append(b)}}
 new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});enhance();
 document.addEventListener('input',e=>{const d=e.target.closest('dialog');if(d&&!e.target.closest('.password-control')?.contains(e.target.closest('button')))d.dataset.dirty='true'});
 document.addEventListener('pointerdown',e=>{const d=[...document.querySelectorAll('dialog[open]')].at(-1);if(d){const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)){if(d.dataset.dirty==='true'&&!confirm('Descartar as alterações não salvas desta janela?'))return;const cancel=new Event('cancel',{cancelable:true});if(d.dispatchEvent(cancel)){d.close();d.remove()}return}}
 for(const menu of document.querySelectorAll('details.nav-more[open],details.account[open]'))if(!menu.contains(e.target))menu.open=false;
 for(const panel of document.querySelectorAll('[data-dismiss-outside]'))if(!panel.contains(e.target))panel.remove();
 });
})();
