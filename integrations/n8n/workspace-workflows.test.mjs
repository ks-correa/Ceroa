import test from 'node:test';import assert from 'node:assert/strict';
import {mailWorkflow,sheetsWorkflow} from './workspace-workflows.mjs';
test('operational mail has no Code, LLM, free recipient or automatic provider retry',()=>{
 const w=mailWorkflow();assert(!w.active);assert(!w.nodes.some(n=>n.type.includes('langchain')||n.type.endsWith('.code')));
 const gmail=w.nodes.find(n=>n.type==='n8n-nodes-base.gmail');assert.equal(gmail.parameters.sendTo,'={{ $json.recipient }}');assert.equal(gmail.parameters.emailType,'text');assert(!gmail.retryOnFail);
 const dispatch=w.nodes.find(n=>n.id==='dispatch');assert.equal(w.connections[dispatch.name].main[0][0].node,'Destinatario confirmado');assert.equal(w.connections[gmail.name].main[1][0].node,'Retener resultado ambiguo');
});
test('native templates preserve exact backend values and keep untrusted names as plain text',()=>{
 const template=mailWorkflow().nodes.find(n=>n.id==='template').parameters.jsonOutput;
 const run=input=>JSON.parse(new Function('$json','return '+template.slice(3,-2))(input));
 assert.match(run({kind:'WELCOME',payload:{}}).message,/registrada correctamente/);
 const mail=run({kind:'UPCOMING_DUES',payload:{asOf:'synthetic',dues:[{name:'<script>alert(1)</script>',amount:'123.45',dueDate:'2026-11-09'}]}});
 assert(mail.message.includes('123.45'));assert(mail.message.includes('<script>'));assert.equal(mail.subject,'Tus próximos vencimientos');
 assert.equal(run({kind:'PASSWORD_RESET',payload:{}}).subject,undefined);
});
test('Sheets projection uses a stable upsert key and excludes recipient and financial payloads',()=>{
 const w=sheetsWorkflow(),sheet=w.nodes.find(n=>n.type==='n8n-nodes-base.googleSheets');assert.equal(sheet.parameters.operation,'appendOrUpdate');assert.deepEqual(sheet.parameters.columns.matchingColumns,['executionId']);
 assert(!JSON.stringify(sheet.parameters.columns).includes('recipient'));assert(!JSON.stringify(sheet.parameters.columns).includes('totalRegisteredDebt'));assert(w.nodes.some(n=>n.parameters.jsonBody?.includes('RETRY_PROJECTION')));
});
test('workspace native graph connections and interpolations are complete',()=>{
 for(const w of [mailWorkflow(),sheetsWorkflow()]){const names=new Set(w.nodes.map(n=>n.name));for(const [source,types]of Object.entries(w.connections)){assert(names.has(source));for(const branches of Object.values(types))for(const outputs of branches)for(const e of outputs)assert(names.has(e.node));}
 const walk=v=>{if(typeof v==='string'&&v.startsWith('={{'))assert.equal(v.indexOf('}}'),v.length-2,v);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};walk(w.nodes);}
});
