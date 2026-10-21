const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function setup(overrides={}) {
  let session='12|secret', user=5, granted=true, native=true, permissionCalls=0, gpsTokenCalls=0;
  const saved=new Map(), calls=[];
  const api={post:async(url,body)=>{calls.push({url,body});},delete:async(url,options)=>{calls.push({url,options});},get:async url=>{calls.push({url});return {data:{data:{id:'notice',data:{delivery_id:7,assignment_id:9}}}};},...overrides.api};
  const notifications={setNotificationHandler(){},getPermissionsAsync:async()=>({granted}),requestPermissionsAsync:async()=>{permissionCalls++;return {granted};},setNotificationChannelAsync:async()=>{},AndroidImportance:{HIGH:4},
    getExpoPushTokenAsync:async()=>{gpsTokenCalls++;return {data:'ExpoPushToken[phone]'};},
    addNotificationResponseReceivedListener:()=>({remove(){}}),addPushTokenListener:()=>({remove(){}}),getLastNotificationResponse:()=>null,clearLastNotificationResponse(){},...overrides.notifications};
  const module={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,'../src/services/push.ts'),'utf8');
  const modules={'expo-notifications':notifications,'expo-constants':{executionEnvironment:overrides.go?'storeClient':'bare',easConfig:{projectId:'3b3cb10a-c7c1-4ec1-922b-70c5795dc322'}},'expo-device':{isDevice:native},'expo-secure-store':{getItemAsync:async k=>saved.get(k)??null,setItemAsync:async(k,v)=>saved.set(k,v),deleteItemAsync:async k=>saved.delete(k)},'react-native':{Platform:{OS:'android'}},'./api':api,'./authStorage':{getAuthToken:async()=>session},'./auth':{getCurrentUser:async()=>({id:user})},'./notifications':{notificationTarget:(item,role)=>({pathname:role==='driver'?'/driver/assignments/[id]':'/merchant/deliveries/[id]',params:{id:String(role==='driver'?item.data.assignment_id:item.data.delivery_id)}}),markNotificationAsRead:async()=>{}}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>{if(!modules[n])throw Error(n);return modules[n];},setTimeout,clearTimeout});
  return {s:module.exports,calls,saved,setSession:v=>{session=v;},deny:()=>{granted=false;},get prompts(){return permissionCalls;},get tokens(){return gpsTokenCalls;}};
}
test('push stays opt-in and never prompts during automatic registration',async()=>{
 const h=setup();await h.s.syncPush('ar');assert.equal(h.calls.length,0);assert.equal(h.prompts,0);assert.equal(h.tokens,0);
 await h.s.syncPush('ar',true);assert.equal(h.calls[0].body.session_id,12);assert.equal(h.calls[0].body.platform,'android');assert.equal(h.calls[0].body.language,'ar');assert.equal(h.saved.get('deliveryhub_push_5'),'true');
});
test('denied permission never registers a token and removes any existing session registration',async()=>{
 const h=setup();h.deny();await assert.rejects(h.s.syncPush('en',true),/PUSH_PERMISSION_REQUIRED/);assert.equal(h.prompts,1);assert.equal(h.tokens,0);assert.equal(h.calls[0].url,'/push/device');assert.equal(h.saved.size,0);
});
test('logout during token acquisition prevents late registration under another session',async()=>{
 let resolve;const h=setup({notifications:{getExpoPushTokenAsync:()=>new Promise(r=>{resolve=r;})}});
 const pending=h.s.syncPush('en',true);while(!resolve)await new Promise(r=>setImmediate(r));h.setSession('13|other');resolve({data:'ExpoPushToken[old]'});await pending;assert.equal(h.calls.length,0);assert.equal(h.saved.size,0);
});
test('disable is serialized after an in-flight enable and does not erase consent on network failure',async()=>{
 let resolve;const h=setup({notifications:{getExpoPushTokenAsync:()=>new Promise(r=>{resolve=r;})}});
 const enable=h.s.syncPush('en',true);while(!resolve)await new Promise(r=>setImmediate(r));const disable=h.s.disablePush();resolve({data:'ExpoPushToken[phone]'});await enable;await disable;assert.equal(h.calls.length,2);assert.equal(h.saved.size,0);
 const failed=setup({api:{delete:async()=>{throw Error('offline');}}});failed.saved.set('deliveryhub_push_5','true');await assert.rejects(failed.s.disablePush());assert.equal(failed.saved.size,1);
});
test('push taps resolve owned notifications rather than trusting an arbitrary destination',async()=>{
 const h=setup();assert.equal(await h.s.pushTarget({url:'https://evil.test'},'merchant'),null);
 assert.equal(await h.s.pushTarget({notification_id:'../admin'},'driver'),null);assert.equal(h.calls.length,0);
 const target=await h.s.pushTarget({notification_id:'3b3cb10a-c7c1-4ec1-922b-70c5795dc322',url:'https://evil.test'},'driver');assert.equal(target.params.id,'9');assert.match(h.calls[0].url,/^\/notifications\/[0-9a-f-]+$/);
});
test('Expo Go and cancelled requests cannot register or request permission',async()=>{
 const go=setup({go:true});await assert.rejects(go.s.syncPush('en',true),/BUILD_REQUIRED/);assert.equal(go.prompts,0);
 const h=setup();const controller=new AbortController();controller.abort();await h.s.syncPush('en',true,controller.signal);assert.equal(h.calls.length,0);assert.equal(h.prompts,0);
});
