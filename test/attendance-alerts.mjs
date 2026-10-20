import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const saved={},notices=[];let rows=[],fail=false;const context=vm.createContext({console,Map,Date,Number,JSON,Object,Math,setTimeout:()=>0,clearTimeout(){},ME:{tid:2,id:7},api:async()=>{if(fail)throw Error('offline');return JSON.parse(JSON.stringify(rows))},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v,removeItem:k=>delete saved[k]},navigator:{locks:{request:async(_,f)=>f()}},window:{},document:{},Notification:class{static permission='granted';constructor(title){notices.push(title)}close(){}}});
vm.runInContext(fs.readFileSync('web/attendance-alerts.js','utf8'),context);vm.runInContext("localStorage.setItem(attendanceAlertKey(),JSON.stringify({toast:false,desktop:true}));",context);
vm.runInContext('window.Notification=Notification',context);
const run=code=>vm.runInContext(code,context);
rows=[{id:1,incoming_id:10}];await run('attendanceAlertsSync(true)');assert.equal(notices.length,0);
rows=[{id:1,incoming_id:11}];await run('attendanceAlertsSync()');assert.equal(notices.length,1);await run('attendanceAlertsSync()');assert.equal(notices.length,1);
rows.push({id:2,incoming_id:12});await run('attendanceAlertsSync()');assert.equal(notices.length,2);
// Failed refresh cannot erase the baseline and create false assignments.
fail=true;await run('attendanceAlertsSync()');fail=false;await run('attendanceAlertsSync()');assert.equal(notices.length,2);
rows[0].incoming_id=13;await run('attendanceAlertsSync(true)');assert.equal(notices.length,2);
// A second tab observing the same incoming event is deduplicated.
rows[0].incoming_id=14;await run('attendanceAlertsSync()');assert.equal(notices.length,3);rows[0].incoming_id=13;await run('attendanceAlertsSync(true)');rows[0].incoming_id=14;await run('attendanceAlertsSync()');assert.equal(notices.length,3);
console.log('OK: baseline silenciosa, novas mensagens/atribuições, deduplicação e reconexão; preferências por empresa/usuário.');
