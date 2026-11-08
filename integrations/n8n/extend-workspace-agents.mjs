import {attachMcpSupportTool} from './workspace-mcp.mjs';
// Extend the existing specialists; preserve their models, parsers and evidence validators.
export function extendWorkspaceAgents(workflows){
 for(const w of workflows){
  const role=w.id==='ceroaFinancialAgent30'?'FINANCIAL':w.id==='ceroaSupportAgent30'?'SUPPORT':null;
  if(!role||w.nodes.some(n=>n.id==='workspace-mail-proposal'))continue;
  const agent=w.nodes.find(n=>n.type==='@n8n/n8n-nodes-langchain.agent');
  const auth=w.nodes.find(n=>n.name==='Autorizar alcance').credentials;
  const tool={id:'workspace-mail-proposal',name:'Proponer correo autorizado',type:'n8n-nodes-base.httpRequestTool',typeVersion:4.2,position:[role==='FINANCIAL'?2200:1240,420],...(auth?{credentials:structuredClone(auth)}:{}),parameters:{method:'POST',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',url:'={{ "http://backend:8080/api/v1/assistant-tools/requests/" + $("Recibir delegación").first().json.requestId + "/communications/propose" }}',toolDescription:'Prepare a persistent proposal to email the user registered address. Does not send mail. The real user must subsequently confirm using the returned instruction. Never choose recipient, supply email text, or claim Gmail delivery. '+(role==='FINANCIAL'?'Allowed FINANCIAL_SUMMARY or UPCOMING_DUES.':'Allowed SUBSCRIPTION_INFO only.'),sendQuery:true,queryParameters:{parameters:[{name:'scope',value:'={{ $("Autorizar alcance").first().json.scopeToken }}'},{name:'kind',value:role==='FINANCIAL'?'={{ $fromAI("kind","FINANCIAL_SUMMARY or UPCOMING_DUES","string") }}':'SUBSCRIPTION_INFO'}]},options:{timeout:15000}}};
  w.nodes.push(tool);w.connections[tool.name]={ai_tool:[[{node:agent.name,type:'ai_tool',index:0}]]};
  agent.parameters.options.systemMessage+=' Para enviar información al correo registrado utiliza Proponer correo autorizado. Presenta la instrucción de confirmación devuelta, requiresConfirmation=true, y conserva sus fID. Una propuesta no confirma envío, entrega ni acceso a Gmail. Nunca solicites otra dirección por decisión del modelo.';
 }
 const support=workflows.find(w=>w.id==='ceroaSupportAgent30');
 if(support&&!support.nodes.some(n=>n.id==='booking-propose')){
  const agent=support.nodes.find(n=>n.type==='@n8n/n8n-nodes-langchain.agent');
  for(const operation of ['availability','propose','get','cancel']){
   const tool={id:'booking-'+operation,name:'Asesoria '+operation,type:'n8n-nodes-base.httpRequestTool',typeVersion:4.2,position:[1600+support.nodes.length*30,600],parameters:{method:'POST',url:'={{ "http://backend:8080/api/v1/assistant-tools/requests/" + $("Recibir delegación").first().json.requestId + "/support/booking" }}',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',toolDescription:operation==='availability'?'Check real availability for a requested ISO8601 slot.':operation==='propose'?'Propose an expiring slot after checking Calendar. User must confirm in Ceroa. Never confirms a reservation.':operation==='get'?'Read own reservation status by proposal code.':'Propose cancellation of own booking. Does not cancel until user confirms in Ceroa.',sendQuery:true,queryParameters:{parameters:[{name:'scope',value:'={{ $("Autorizar alcance").first().json.scopeToken }}'},{name:'operation',value:operation},{name:'value',value:'={{ $fromAI("value","'+(['availability','propose'].includes(operation)?'Requested slot ISO8601 with timezone offset':'Owned proposal code')+'","string") }}'}]},options:{timeout:25000}}};
   const credentials=support.nodes.find(n=>n.name==='Autorizar alcance').credentials;if(credentials)tool.credentials=structuredClone(credentials);
   support.nodes.push(tool);support.connections[tool.name]={ai_tool:[[{node:agent.name,type:'ai_tool',index:0}]]};
  }
  agent.parameters.options.systemMessage+=' Para asesorias consulta disponibilidad y propone con herramientas; conserva fID y muestra la instruccion exacta de confirmacion. Solo el mensaje real del usuario puede confirmar o cancelar. Si Calendar no esta configurado, declara que no se pudo verificar disponibilidad. No inventes horarios, reservas ni enlaces Meet. Consulta los estados mediante fID; no declares cita confirmada en texto libre.';
 }
 const root=workflows.find(w=>w.id==='ceroaHybridQuery20');if(root){root.nodes.find(n=>n.name==='Analizar finanzas').parameters.options.systemMessage+=' Para enviar resúmenes financieros o vencimientos delega al financiero; información de suscripción por correo corresponde a soporte. Se prepara una propuesta persistente y el usuario confirma después. Presenta esa instrucción, sin afirmar que se envió. Las propuestas personales de comunicaciones usan mode personal y sources vacío. Delega disponibilidad y propuestas de asesoria al agente Soporte; la confirmacion corresponde a la ruta determinista del backend.';}
 if(support)attachMcpSupportTool(support);
 return workflows;
}
