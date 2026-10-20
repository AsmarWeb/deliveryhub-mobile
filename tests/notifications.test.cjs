const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function service(api) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/notifications.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,
    {module,exports:module.exports,require: () => api});
  return module.exports;
}
const item = data => ({id:'notice-1',data,read_at:null,created_at:'2026-10-20T12:00:00Z'});
test('delivery notifications explain the offer and tracking number in both languages', () => {
  const s=service({});
  assert.match(s.notificationMessage(item({status:'assigned',tracking_number:'DH-123'}),'driver','en'), /New delivery offer.*DH-123/);
  assert.match(s.notificationMessage(item({status:'matching'}),'merchant','ar'), /البحث عن سائق/);
  assert.match(s.notificationMessage(item({status:'cancelled'}),'merchant','en'), /cancelled/);
  assert.equal(s.notificationMessage(item({message:'Legacy notice'}),'merchant','en'), 'Legacy notice');
});
test('driver opens the original offer; legacy alerts fall back to own orders', () => {
  const s=service({});
  const notice=item({delivery_id:12,assignment_id:34});
  assert.equal(s.notificationTarget(notice,'driver').params.id,'34');
  assert.equal(s.notificationTarget(notice,'merchant').params.id,'12');
  assert.equal(s.notificationTarget(item({delivery_id:12}),'driver').pathname,'/driver/(tabs)/orders');
  for(const value of ['../admin',0,-1,'https://evil.test',Number.MAX_SAFE_INTEGER+1])
    assert.equal(s.notificationTarget(item({delivery_id:value}),'merchant'),null);
});
test('notification reads carry cancellation signals and pagination', async () => {
  const signal = new AbortController().signal; let calls=0;
  const s=service({get: async (url,options) => {
    assert.equal(options.signal,signal); calls++;
    if(url==='/notifications') { assert.equal(options.params.page,2); return {data:{data:[]}}; }
    return {data:{unread_count:7}};
  }});
  await s.getNotifications(2,signal); assert.equal(await s.getUnreadNotificationCount(signal),7); assert.equal(calls,2);
});
test('successful read actions refresh subscribers; failed actions do not fake a read', async () => {
  let updates=0; let fail=false;
  const s=service({patch:async url => {assert.equal(url,'/notifications/a%2Fb/read');if(fail)throw Error('offline');},post:async()=>{}});
  const off=s.onNotificationsChanged(()=>updates++);
  await s.markNotificationAsRead('a/b'); await s.markAllNotificationsAsRead(); assert.equal(updates,2);
  fail=true; await assert.rejects(s.markNotificationAsRead('a/b')); assert.equal(updates,2);
  off(); await s.markAllNotificationsAsRead(); assert.equal(updates,2);
});
function unreadHook() {
  let cleanup, timer, appChange, changed, value=null, calls=[];
  const app = {currentState:'active',addEventListener:(_,fn)=>{appChange=fn;return {remove(){}};}};
  const notifications={getUnreadNotificationCount:signal=>new Promise((resolve,reject)=>calls.push({signal,resolve,reject})),onNotificationsChanged:fn=>{changed=fn;return ()=>{};}};
  const module={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,'../src/hooks/useUnreadNotifications.ts'),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {module,exports:module.exports,AbortController,setInterval:fn=>{timer=fn;return 1;},clearInterval(){},
     require:name=>name==='react'?{useCallback:fn=>fn,useState:()=>[null,v=>{value=v;}]}:name==='expo-router'?{useFocusEffect:fn=>{cleanup=fn();}}:name==='react-native'?{AppState:app}:notifications});
  module.exports.useUnreadNotifications();
  return {calls,get value(){return value;},tick:()=>timer(),change:state=>{app.currentState=state;appChange(state);},changed:()=>changed(),stop:()=>cleanup()};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('unread polling pauses in background and ignores aborted or unmounted responses',async()=>{
  const hook=unreadHook();assert.equal(hook.calls.length,1);
  hook.change('background');assert.equal(hook.calls[0].signal.aborted,true);
  hook.tick();assert.equal(hook.calls.length,1);
  hook.calls[0].resolve(99);await flush();assert.equal(hook.value,null);
  hook.change('active');assert.equal(hook.calls.length,2);
  hook.calls[1].resolve(4);await flush();assert.equal(hook.value,4);
  hook.tick();hook.stop();hook.calls[2].resolve(20);await flush();assert.equal(hook.value,4);
});
test('a failed count refresh preserves last count and read actions invalidate old requests',async()=>{
  const hook=unreadHook();hook.calls[0].resolve(6);await flush();
  hook.tick();hook.calls[1].reject(Error('offline'));await flush();assert.equal(hook.value,6);
  hook.tick();hook.changed();assert.equal(hook.calls[2].signal.aborted,true);
  hook.calls[2].resolve(99);hook.calls[3].resolve(0);await flush();assert.equal(hook.value,0);hook.stop();
});
