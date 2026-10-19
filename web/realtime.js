// One reconnecting socket per page. A transport failure must never reload the application.
(function(root){
 function connectRealtime(options){let socket=null,timer=null,heartbeat=null,attempt=0,stopped=false,connectedBefore=false,generation=0;
  const clear=()=>{clearTimeout(timer);clearInterval(heartbeat);timer=heartbeat=null};
  const state=(name)=>options.onstate?.(name);
  async function retry(current){if(stopped||current!==generation)return;clear();state(navigator.onLine===false?'offline':'reconnecting');
   try{if(options.checkSession&&await options.checkSession()===false){stop();options.onexpired?.();return}}catch{}
   if(stopped||current!==generation)return;const delay=Math.min(30000,1000*2**Math.min(attempt++,5))*(.85+Math.random()*.3);timer=setTimeout(open,delay);
  }
  function open(){if(stopped)return;clear();const current=++generation;state(navigator.onLine===false?'offline':connectedBefore?'reconnecting':'connecting');
   try{socket=new WebSocket(options.url())}catch{retry(current);return}
   socket.onopen=()=>{if(stopped||current!==generation){socket.close();return}attempt=0;state('connected');if(connectedBefore)options.onreconnect?.();connectedBefore=true;heartbeat=setInterval(()=>{if(socket?.readyState===1)socket.send(JSON.stringify({type:'ping'}))},25000)};
   socket.onmessage=event=>{if(stopped||current!==generation)return;try{const message=JSON.parse(event.data);if(message.t!=='pong')options.onmessage?.(message)}catch(error){options.onerror?.(error)}};
   socket.onerror=()=>{if(!stopped&&current===generation)state('reconnecting')};
   socket.onclose=()=>retry(current);
  }
  function online(){if(stopped)return;clear();generation++;if(socket){socket.onclose=null;socket.close()}attempt=0;open()}
  function offline(){if(!stopped)state('offline')}
  function stop(){if(stopped)return;stopped=true;generation++;clear();if(socket){socket.onclose=null;socket.close()}root.removeEventListener('online',online);root.removeEventListener('offline',offline);root.removeEventListener('pagehide',stop)}
  root.addEventListener('online',online);root.addEventListener('offline',offline);root.addEventListener('pagehide',stop,{once:true});open();return {close:stop,reconnect:online,get readyState(){return socket?.readyState??3}};
 }
 root.NexoraRealtime={connect:connectRealtime};
})(window);
