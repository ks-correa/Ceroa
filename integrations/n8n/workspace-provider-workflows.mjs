import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {native,edge,workspaceSettings} from './workspace-workflows.mjs';
export function providerWorkflow(kind){
 const draft=kind==='draft';
 const hook=native('hook','Entrada autorizada','n8n-nodes-base.webhook',2,{httpMethod:'POST',path:draft?'ceroa-google-draft':'ceroa-google-calendar',authentication:'headerAuth',responseMode:'responseNode',options:{}},0);hook.webhookId=hook.parameters.path;
 const request=native('provider','Proveedor Google controlado','n8n-nodes-base.httpRequest',4.2,{method:'POST',url:'http://workspace-provider:3100/'+(draft?'gmail/createDraft':'calendar'),authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($("Entrada autorizada").first().json.body) }}',options:{timeout:14000}},500);request.onError='continueErrorOutput';
 const response=native('response','Responder resultado verificado','n8n-nodes-base.respondToWebhook',1.4,{respondWith:'json',responseBody:'={{ $json }}',options:{}},800);
 const failure=native('failure','Conservar resultado incierto','n8n-nodes-base.respondToWebhook',1.4,{respondWith:'json',responseBody:'{"error":"PROVIDER_UNCONFIRMED"}',options:{responseCode:503}},800,220);
 const nodes=[hook,request,response,failure];const connections={[hook.name]:{main:[[edge(request.name)]]},[request.name]:{main:[[edge(response.name)],[edge(failure.name)]]}};
 if(!draft){
  const gate=native('availability','Solo lectura MCP','n8n-nodes-base.if',2.2,{conditions:{options:{typeValidation:'strict',version:2},conditions:[{leftValue:'={{ $json.body.operation === "availability" }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},220);
  const mcp=native('mcp','MCP Calendar disponibilidad','@n8n/n8n-nodes-langchain.mcpClient',1.1,{serverTransport:'httpStreamable',endpointUrl:'http://workspace-provider:3100/mcp',authentication:'headerAuth',tool:{__rl:true,mode:'id',value:'calendar_availability'},inputMode:'json',jsonInput:'={{ JSON.stringify({start:$("Entrada autorizada").first().json.body.start,end:$("Entrada autorizada").first().json.body.end}) }}',options:{timeout:14000,convertToBinary:false}},500,-220);mcp.onError='continueErrorOutput';
  // n8n MCP returns the tool content. Parse only that fixed read-only tool response.
  const normalize=native('normalize','Validar disponibilidad MCP','n8n-nodes-base.set',3.4,{mode:'raw',jsonOutput:'={{ JSON.stringify($json.structuredContent ?? ($json.content ? (typeof $json.content[0].text === "string" ? JSON.parse($json.content[0].text) : $json.content[0].text) : $json)) }}',options:{}},700,-220);normalize.onError='continueErrorOutput';
  nodes.push(gate,mcp,normalize);connections[hook.name]={main:[[edge(gate.name)]]};connections[gate.name]={main:[[edge(mcp.name)],[edge(request.name)]]};connections[mcp.name]={main:[[edge(normalize.name)],[edge(failure.name)]]};connections[normalize.name]={main:[[edge(response.name)],[edge(failure.name)]]};
 }
 return {id:draft?'ceroaGoogleDraftFinal':'ceroaGoogleCalendarFinal',name:draft?'Ceroa - Gmail borrador durable':'Ceroa - CHRONOS Google Calendar MCP',active:false,nodes,connections,settings:workspaceSettings};
}
if(process.argv[1]===fileURLToPath(import.meta.url))for(const kind of ['draft','calendar'])fs.writeFileSync(new URL('workspace-provider-'+kind+'.json',import.meta.url),JSON.stringify(providerWorkflow(kind),null,2)+'\n');
