import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WorkspaceProvider,server} from './workspace-provider.mjs';
import {GoogleProvider,ProviderError} from './google-provider.mjs';
import {providerWorkflow} from './workspace-provider-workflows.mjs';
const input={proposalId:'00000000-0000-4000-8000-000000000001',recipient:'synthetic@example.invalid',subject:'Resumen Ceroa',message:'Saldo: 123 COP'};
const receipt={id:'draft-1',proposalId:input.proposalId,sent:false,provider:'GOOGLE'};
test('durable receipt survives restart and rejects changed financial content',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ceroa-provider-'));let calls=0;
 const google={createDraft:async()=>{calls++;return receipt}};
 let p=new WorkspaceProvider(join(dir,'state.sqlite'),google);
 try{assert.deepEqual(await p.draft(input),receipt);p.close();p=new WorkspaceProvider(join(dir,'state.sqlite'),google);assert.deepEqual(await p.draft(input),receipt);await assert.rejects(p.draft({...input,message:'changed'}),e=>e.status===409);assert.equal(calls,1);}finally{p.close();rmSync(dir,{recursive:true});}
});
test('uncertain creation reconciles once without ever issuing a second create',async()=>{
 let creates=0,finds=0;const p=new WorkspaceProvider(':memory:',{createDraft:async()=>{creates++;throw Error('timeout after provider effect')},findDraft:async()=>{finds++;return finds===1?null:receipt}});
 try{await assert.rejects(p.draft(input));await assert.rejects(p.draft(input));assert.deepEqual(await p.draft(input),receipt);assert.equal(creates,1);assert.equal(finds,2);}finally{p.close();}
});
test('concurrent duplicate requests cannot duplicate a provider creation',async()=>{
 let release;const pending=new Promise(r=>release=r);let creates=0;const p=new WorkspaceProvider(':memory:',{createDraft:async()=>{creates++;await pending;return receipt},findDraft:async()=>null});
 try{const first=p.draft(input);await assert.rejects(p.draft(input));release();assert.deepEqual(await first,receipt);assert.equal(creates,1);}finally{p.close();}
});
test('headers and invalid recipients are rejected before reaching Google',async()=>{
 const p=new WorkspaceProvider(':memory:',{});try{for(const change of [{subject:'hello\r\nBcc: someone@example.invalid'},{recipient:'a@example.invalid\r\nBcc: b@example.invalid'},{proposalId:'other'}, {message:''}])await assert.rejects(p.draft({...input,...change}),e=>e.status===400);}finally{p.close();}
});
test('invalid provider acknowledgements remain uncertain and cannot become success',async()=>{
 for(const change of [{sent:true},{sent:'false'},{proposalId:'other'},{id:''}]){const p=new WorkspaceProvider(':memory:',{createDraft:async()=>({...receipt,...change})});try{await assert.rejects(p.draft(input));assert.equal(p.db.prepare('SELECT status FROM drafts').get().status,'CREATING');}finally{p.close();}}
});
test('MCP authenticates, exposes availability only and rejects write tools',async()=>{
 const p=new WorkspaceProvider(':memory:',{availability:async()=>({available:true,provider:'GOOGLE'})});const key='synthetic-only-worker-key-at-least-32-characters';const s=server(p,key);await new Promise(r=>s.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+s.address().port+'/mcp';
 const call=body=>fetch(url,{method:'POST',headers:{'X-Ceroa-Workspace':key},body:JSON.stringify(body)});
 try{assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,401);assert.equal((await (await call({id:1,method:'tools/list'})).json()).result.tools[0].name,'calendar_availability');assert.equal((await (await call({id:2,method:'tools/call',params:{name:'calendar_create'}})).json()).error.code,-32601);const r=await call({id:3,method:'tools/call',params:{name:'calendar_availability',arguments:{start:'2026-11-17T09:00:00-05:00',end:'2026-11-17T09:30:00-05:00'}}});assert.equal(JSON.parse((await r.json()).result.content[0].text).available,true);}finally{await new Promise(r=>s.close(r));p.close();}
});
test('Calendar rejects a mismatched provider event or unknown availability',async()=>{
 const p=new WorkspaceProvider(':memory:',{event:async()=>({id:'wrong',status:'confirmed'})});try{await assert.rejects(p.calendar({operation:'create',eventId:'a'.repeat(32),email:input.recipient,start:'2026-11-17T09:00:00-05:00',end:'2026-11-17T09:30:00-05:00'}));}finally{p.close();}
 const g=new GoogleProvider({calendarId:'support'});g.request=async()=>({calendars:{support:{errors:[{reason:'notFound'}]}}});await assert.rejects(g.availability('start','end'));
});
test('Google transport uses refresh token and draft creation only, without message sending',async()=>{
 const requests=[];const g=new GoogleProvider({gmail:{clientId:'synthetic',clientSecret:'synthetic',refreshToken:'synthetic'}},async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify(url.includes('/token')?{access_token:'synthetic',expires_in:3600}:{id:'draft-1',message:{id:'message-1'}}),{status:200});});
 assert.equal((await g.createDraft(input)).sent,false);assert.equal(requests.length,2);assert.ok(requests[1].url.endsWith('/drafts'));const raw=Buffer.from(JSON.parse(requests[1].options.body).message.raw,'base64url').toString();assert.ok(raw.includes('Message-ID: '+g.messageId(input.proposalId)));assert.ok(!requests.some(r=>r.url.includes('/send')));
});
test('Calendar MCP accepts n8n parsed content and protocol text content without losing false availability',()=>{
 const expression=providerWorkflow('calendar').nodes.find(n=>n.id==='normalize').parameters.jsonOutput;
 const parse=input=>JSON.parse(new Function('$json','return '+expression.slice(3,-2))(input));
 const result={available:false,provider:'GOOGLE'};
 for(const input of [{content:[{type:'text',text:result}]},{content:[{type:'text',text:JSON.stringify(result)}]},{structuredContent:result}])assert.deepEqual(parse(input),result);
});
test('an absent Google event does not fabricate proof of cancellation',async()=>{
 const g=new GoogleProvider({calendarId:'synthetic'});g.request=async()=>null;
 await assert.rejects(g.event('delete',{eventId:'a'.repeat(32)}));
});
test('OAuth reconnection is picked up from the existing credential store without replaying writes',async()=>{
 let refresh='expired';const seen=[];
 const g=new GoogleProvider({},async(url,options)=>{
  if(url.endsWith('/token')){const value=options.body.get('refresh_token');seen.push(value);return new Response(JSON.stringify(value==='expired'?{error:'invalid_grant'}:{access_token:'synthetic',expires_in:3600}),{status:value==='expired'?400:200});}
  return new Response('{}');
 },async()=>({gmail:{clientId:'synthetic',clientSecret:'synthetic',refreshToken:refresh}}));
 await assert.rejects(g.request('gmail','/profile'),e=>e.message==='GOOGLE_OAUTH_RECONNECT_REQUIRED');
 refresh='reconnected';await g.request('gmail','/profile');assert.deepEqual(seen,['expired','reconnected']);
});
test('a known OAuth rejection before draft creation can retry safely after reconnection',async()=>{
 let calls=0;const p=new WorkspaceProvider(':memory:',{createDraft:async()=>{if(++calls===1)throw new ProviderError(503,'GOOGLE_OAUTH_RECONNECT_REQUIRED',true);return receipt;}});
 try{await assert.rejects(p.draft(input));assert.equal(p.db.prepare('SELECT status FROM drafts').get().status,'RETRY_SAFE');assert.deepEqual(await p.draft(input),receipt);assert.equal(calls,2);}finally{p.close();}
});
