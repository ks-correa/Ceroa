import fs from 'node:fs';import path from 'node:path';
const [beforeFile,configFile,folderFile,runtimeFile,out]=process.argv.slice(2);const all=JSON.parse(fs.readFileSync(beforeFile,'utf8')),config=JSON.parse(fs.readFileSync(configFile,'utf8')),folder=JSON.parse(fs.readFileSync(folderFile,'utf8')),runtime=JSON.parse(fs.readFileSync(runtimeFile,'utf8'));
if(folder.status!=='VERIFIED'||!folder.folderId)throw Error('Verified authorized folder required');fs.mkdirSync(out,{recursive:true});
for(const id of ['ceroaWorkspaceMail40','ceroaWorkspaceSheets40','ceroaWorkspaceDrive40','ceroaWorkspaceCalendar40']){
 const w=all.find(w=>w.id===id);if(!w||w.active)throw Error('Expected inactive draft');
 for(const n of w.nodes){
  if(n.type==='n8n-nodes-base.gmail')n.credentials={gmailOAuth2:config.credentials.gmail};
  else if(n.type==='n8n-nodes-base.googleSheets'){n.credentials={googleSheetsOAuth2Api:config.credentials.sheets};n.parameters.documentId={__rl:true,mode:'id',value:config.spreadsheetId};n.parameters.sheetName={__rl:true,mode:'name',value:'Pruebas Bloque 4'};}
  else if(n.type==='n8n-nodes-base.googleDrive'||n.type==='n8n-nodes-base.googleDriveTrigger'||n.parameters.nodeCredentialType==='googleDriveOAuth2Api'){n.credentials={googleDriveOAuth2Api:config.credentials.drive};if(n.parameters.folderToWatch)n.parameters.folderToWatch={__rl:true,mode:'id',value:folder.folderId};}
  else if(n.type==='n8n-nodes-base.googleCalendar')n.credentials={googleCalendarOAuth2Api:runtime.calendar};
  if(n.parameters.genericAuthType==='httpHeaderAuth'||n.type==='n8n-nodes-base.webhook'&&n.parameters.authentication==='headerAuth')n.credentials={httpHeaderAuth:runtime.worker};
 }
 fs.writeFileSync(path.join(out,id+'.json'),JSON.stringify(w,null,2)+'\n',{mode:0o600});
}
console.log('Four inactive Google workflows bound. Calendar consent and approved backend source owner remain pending.');
