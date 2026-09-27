import {readFile,writeFile} from 'node:fs/promises';
const schema=JSON.parse(await readFile(new URL('document-ingestion/draft.schema.json',import.meta.url),'utf8'));
const prompt=await readFile(new URL('document-ingestion/extraction-prompt.md',import.meta.url),'utf8');
const nodes=[],connections={};
const add=(id,name,type,version,pos,parameters)=>nodes.push({id,name,type,typeVersion:version,position:pos,parameters});
const link=(from,to,kind='main')=>connections[from]={[kind]:[[{node:to,type:kind,index:0}]]};
add('document-entry','Recibir documento','n8n-nodes-base.webhook',2,[0,0],{httpMethod:'POST',path:'ceroa-document-draft-v1',authentication:'headerAuth',responseMode:'responseNode',options:{}});
nodes[0].webhookId='ceroa-document-private';
add('source','Validar fuente','n8n-nodes-base.code',2,[230,0],{jsCode:`const body=$input.first().json.body;
if(body.schemaVersion!=='debt-draft-v1'||!/^[a-f0-9-]{36}$/.test(body.requestId)||!Array.isArray(body.segments)||!body.segments.length||body.segments.length>2000)throw new Error('Fuente inválida');
let size=0;for(const s of body.segments){if(typeof s.location!=='string'||typeof s.text!=='string')throw new Error('Fuente inválida');size+=s.text.length;}
if(size>80000)throw new Error('Fuente demasiado extensa');return [{json:{requestId:body.requestId,segments:body.segments}}];`});
add('extract','Extraer borrador sin herramientas','@n8n/n8n-nodes-langchain.chainLlm',1.7,[470,0],{promptType:'define',text:'={{ JSON.stringify({documentoNoConfiable:$json.segments}) }}',hasOutputParser:true,messages:{messageValues:[{type:'SystemMessagePromptTemplate',message:prompt+'\nUsa como location exactamente el identificador suministrado en cada segmento. No devuelvas ubicación nula. Solo una obligación; si identificas varias obligaciones, deja todos los datos financieros en null y explica que se necesita un documento por obligación. Los números literales en las citas deben corresponder al valor propuesto sin cálculos. name solo si existe un nombre personalizado explícito, no lo inventes.'}]},batching:{batchSize:1}});
add('model','Gemini documentos','@n8n/n8n-nodes-langchain.lmChatGoogleGemini',1,[430,250],{modelName:'models/gemini-3.5-flash-lite',options:{temperature:0,maxOutputTokens:8000}});
add('parser','Contrato fijo de borrador','@n8n/n8n-nodes-langchain.outputParserStructured',1.3,[660,250],{schemaType:'manual',inputSchema:JSON.stringify(schema),autoFix:false});
add('contract','Preparar verificación de evidencia','n8n-nodes-base.code',2,[730,0],{jsCode:`const item=$input.first().json;let output=item.output??item.text??item;if(typeof output==='string')output=JSON.parse(output);
if(!output?.draft||!Array.isArray(output.evidence)||!Array.isArray(output.warnings))throw new Error('Contrato inválido');
return [{json:{requestId:$('Validar fuente').first().json.requestId,output}}];`});
add('validate','Verificar evidencia en Ceroa','n8n-nodes-base.httpRequest',4.2,[970,0],{method:'POST',url:'={{ "http://backend:8080/api/v1/document-tools/requests/" + $json.requestId + "/complete" }}',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.output) }}',options:{timeout:15000}});
add('reply','Finalizar borrador','n8n-nodes-base.respondToWebhook',1.4,[1200,0],{respondWith:'json',responseBody:'={{ {ok:true} }}',options:{responseCode:200}});
add('failed','Informar fallo sin contenido','n8n-nodes-base.respondToWebhook',1.4,[970,350],{respondWith:'json',responseBody:'={{ {ok:false} }}',options:{responseCode:503}});
link('Recibir documento','Validar fuente');link('Validar fuente','Extraer borrador sin herramientas');link('Extraer borrador sin herramientas','Preparar verificación de evidencia');link('Preparar verificación de evidencia','Verificar evidencia en Ceroa');link('Verificar evidencia en Ceroa','Finalizar borrador');link('Gemini documentos','Extraer borrador sin herramientas','ai_languageModel');link('Contrato fijo de borrador','Extraer borrador sin herramientas','ai_outputParser');
for(const name of ['Validar fuente','Extraer borrador sin herramientas','Preparar verificación de evidencia','Verificar evidencia en Ceroa']){nodes.find(n=>n.name===name).onError='continueErrorOutput';connections[name].main[1]=[{node:'Informar fallo sin contenido',type:'main',index:0}];}
await writeFile(new URL('document-ingestion.json',import.meta.url),JSON.stringify({id:'ceroaDocuments02',name:'RA-N8N-002 - Borrador desde documentos',active:false,nodes,connections,settings:{executionOrder:'v1',executionTimeout:100,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}},null,2)+'\n');
