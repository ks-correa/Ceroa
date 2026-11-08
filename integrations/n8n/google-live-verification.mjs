import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {native,edge,workspaceSettings,sheetsWorkflow} from './workspace-workflows.mjs';
// Explicitly authorized test operations only. No automatic schedule or provider retry.
export function googleVerification(operation,config){
 if(!['drive-folder','sheets-tab','gmail-send'].includes(operation))throw Error('Unsupported verification');
 const entry=native('entry','Prueba manual autorizada','n8n-nodes-base.manualTrigger',1,{},0);let steps=[];
 const credential=(type,name)=>({[type]:config.credentials[name]});
 if(operation==='drive-folder'){
  const folder=native('folder','Drive crear carpeta de prueba','n8n-nodes-base.googleDrive',3,{resource:'folder',operation:'create',name:'Ceroa - Pruebas Bloque 4',driveId:{__rl:true,mode:'list',value:'My Drive'},folderId:{__rl:true,mode:'id',value:'root'},options:{}},220);folder.credentials=credential('googleDriveOAuth2Api','drive');steps=[folder];
 }else if(operation==='sheets-tab'){
  if(!/^[A-Za-z0-9_-]{20,100}$/.test(config.spreadsheetId))throw Error('Approved spreadsheet required');
  const documentId={__rl:true,mode:'id',value:config.spreadsheetId},sheetName={__rl:true,mode:'name',value:'Pruebas Bloque 4'};
  const create=native('tab','Sheets crear pestana de prueba','n8n-nodes-base.googleSheets',4.7,{resource:'sheet',operation:'create',documentId,title:'Pruebas Bloque 4',options:{}},220);create.alwaysOutputData=true;
  const fields=['executionId','workflow','event','at','status','durationMs','result','sourceEventId'];
  const header=native('headers','Inicializar encabezados de prueba','n8n-nodes-base.httpRequest',4.2,{method:'PUT',url:'https://sheets.googleapis.com/v4/spreadsheets/'+config.spreadsheetId+'/values/'+encodeURIComponent("'Pruebas Bloque 4'!A1:H1"),authentication:'predefinedCredentialType',nodeCredentialType:'googleSheetsOAuth2Api',sendQuery:true,queryParameters:{parameters:[{name:'valueInputOption',value:'RAW'}]},sendBody:true,specifyBody:'json',jsonBody:JSON.stringify({values:[fields]}),options:{timeout:15000}},440);
  const parameters=structuredClone(sheetsWorkflow().nodes.find(n=>n.id==='sheets').parameters);Object.assign(parameters,{documentId,sheetName});parameters.columns.value=Object.fromEntries(fields.map(k=>[k,({executionId:'ceroa-workspace-live-test-41',workflow:'ceroaGoogleVerification41',event:'AUTHORIZED_CONNECTION_TEST',at:config.at,status:'VERIFIED',durationMs:'0',result:'Synthetic operational row; no financial data',sourceEventId:'ceroa-workspace-live-test-41'})[k]]));
  const append=native('upsert','Sheets insertar o actualizar prueba','n8n-nodes-base.googleSheets',4.7,parameters,660),again=native('upsert-again','Sheets verificar upsert idempotente','n8n-nodes-base.googleSheets',4.7,structuredClone(parameters),880),read=native('read','Sheets leer prueba','n8n-nodes-base.googleSheets',4.7,{resource:'sheet',operation:'read',documentId,sheetName,options:{}},1100);steps=[create,header,append,again,read];for(const n of steps)n.credentials=credential('googleSheetsOAuth2Api','sheets');
 }else{
  if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(config.recipient))throw Error('Authorized test recipient required');
  const send=native('send','Gmail enviar prueba autorizada','n8n-nodes-base.gmail',2.2,{resource:'message',operation:'send',sendTo:config.recipient,subject:'Ceroa - prueba autorizada de Gmail - Bloque 4',emailType:'text',message:'Mensaje de prueba autorizado para verificar Gmail en n8n. Contiene solamente datos sinteticos. No activa notificaciones automaticas ni confirma operaciones financieras. Referencia: ceroa-workspace-live-test-41.',options:{appendAttribution:false,senderName:'Ceroa'}},220);send.credentials=credential('gmailOAuth2','gmail');steps=[send];
 }
 const nodes=[entry,...steps],connections={};for(let i=0;i<nodes.length-1;i++)connections[nodes[i].name]={main:[[edge(nodes[i+1].name)]]};return{id:'ceroaGoogleVerification41',name:'Ceroa - Prueba Google autorizada (manual)',active:false,nodes,connections,settings:workspaceSettings};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const [operation,configFile,out]=process.argv.slice(2);fs.writeFileSync(out,JSON.stringify(googleVerification(operation,JSON.parse(fs.readFileSync(configFile,'utf8'))),null,2)+'\n',{mode:0o600});}
