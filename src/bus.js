let w;export const setWss=x=>w=x;
export const bus=(t,d)=>w?.clients.forEach(c=>c.readyState===1&&c.send(JSON.stringify({t,d})));
