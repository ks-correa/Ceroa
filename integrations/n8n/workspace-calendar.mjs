import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {native,edge,workspaceSettings} from './workspace-workflows.mjs';
export function calendarWorkflow(){
 const hook=native('hook','Operacion Calendar autorizada','n8n-nodes-base.webhook',2,{httpMethod:'POST',path:'ceroa-workspace-calendar-v4',authentication:'headerAuth',responseMode:'responseNode',options:{}},0);
 hook.webhookId='ceroa-workspace-calendar-v4';
 const gate=native('gate','Operacion permitida','n8n-nodes-base.switch',3.2,{rules:{values:['availability','create','get','delete'].map(operation=>({conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},conditions:[{leftValue:'={{ $json.body.operation }}',rightValue:operation,operator:{type:'string',operation:'equals'}}],combinator:'and'},renameOutput:true,outputKey:operation}))},options:{}},220);
 const calendar={__rl:true,mode:'id',value:'={{ $env.CEROA_SUPPORT_CALENDAR_ID }}'};
 const availability=native('availability','Calendar disponibilidad','n8n-nodes-base.googleCalendar',1.3,{resource:'calendar',operation:'availability',calendar,timeMin:'={{ $json.body.start }}',timeMax:'={{ $json.body.end }}',options:{outputFormat:'availability'}},500,0);
 const create=native('create','Calendar crear con Meet','n8n-nodes-base.googleCalendar',1.3,{resource:'event',operation:'create',calendar,start:'={{ $json.body.start }}',end:'={{ $json.body.end }}',additionalFields:{id:'={{ $json.body.eventId }}',summary:'Asesoria Ceroa',description:'Solicitud confirmada en Ceroa. Sin datos financieros adjuntos.',attendees:['={{ $json.body.email }}'],sendUpdates:'all',conferenceDataUi:{conferenceDataValues:{conferenceSolution:'hangoutsMeet'}}}},500,200);
 const get=native('get','Calendar consultar reserva','n8n-nodes-base.googleCalendar',1.3,{resource:'event',operation:'get',calendar,eventId:'={{ $json.body.eventId }}',options:{}},500,400);
 const remove=native('delete','Calendar cancelar reserva','n8n-nodes-base.googleCalendar',1.3,{resource:'event',operation:'delete',calendar,eventId:'={{ $json.body.eventId }}',options:{sendUpdates:'all'}},500,600);remove.alwaysOutputData=true;
 const result=native('result','Responder proveedor','n8n-nodes-base.respondToWebhook',1.4,{respondWith:'json',responseBody:'={{ $json }}',options:{}},800);
 return{id:'ceroaWorkspaceCalendar40',name:'Ceroa - Workspace - Calendar y Meet',active:false,nodes:[hook,gate,availability,create,get,remove,result],connections:{[hook.name]:{main:[[edge(gate.name)]]},[gate.name]:{main:[availability,create,get,remove].map(n=>[edge(n.name)])},...Object.fromEntries([availability,create,get,remove].map(n=>[n.name,{main:[[edge(result.name)]]}]))},settings:workspaceSettings};
}
if(process.argv[1]===fileURLToPath(import.meta.url))fs.writeFileSync(new URL('workspace-calendar.json',import.meta.url),JSON.stringify(calendarWorkflow(),null,2)+'\n');
