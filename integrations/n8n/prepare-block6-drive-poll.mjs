import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
/** Bounded verification only: reuse the inactive manual test slot; never publish the general connector. */
export function boundedDrivePoll(workflows){
 const original=workflows.find(w=>w.id==='ceroaBlock5DriveValidation50');
 const source=workflows.find(w=>w.id==='ceroaWorkspaceDrive40');
 assert(original&&!original.active&&source&&!source.active,'Both test slot and general connector must be inactive');
 const w=structuredClone(source);w.id=original.id;w.name='Ceroa - Bloque 6 - polling de un PDF sintetico';w.active=false;w.staticData=null;
 for(const key of ['activeVersionId','versionId','createdAt','updatedAt'])delete w[key];
 w.nodes=w.nodes.filter(n=>n.id!=='status'&&!n.type.endsWith('scheduleTrigger'));
 const names=new Set(w.nodes.map(n=>n.name));for(const name of Object.keys(w.connections))if(!names.has(name))delete w.connections[name];
 const guard={id:'block6-only',name:'Solo PDF sintetico Bloque 6',type:'n8n-nodes-base.if',typeVersion:2.2,position:[-100,0],parameters:{conditions:{options:{typeValidation:'strict',version:2},conditions:[{id:'name',leftValue:'={{ $json.name }}',rightValue:'Ceroa - Prueba integral Bloque 6.pdf',operator:{type:'string',operation:'equals'}}],combinator:'and'},options:{}}};
 w.nodes.push(guard);const triggers=w.nodes.filter(n=>n.type.endsWith('googleDriveTrigger'));assert.equal(triggers.length,2);
 for(const trigger of triggers){assert(trigger.credentials?.googleDriveOAuth2Api&&trigger.parameters.folderToWatch?.value,'Approved bound folder and credential required');trigger.parameters.pollTimes={item:[{mode:'everyMinute'}]};w.connections[trigger.name]={main:[[{node:guard.name,type:'main',index:0}]]};}
 w.connections[guard.name]={main:[[{node:w.nodes.find(n=>n.id==='metadata').name,type:'main',index:0}],[]]};
 w.settings={...w.settings,saveDataSuccessExecution:'all',saveDataErrorExecution:'all'};return w;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const [input,output]=process.argv.slice(2);assert(input&&output);fs.writeFileSync(output,JSON.stringify(boundedDrivePoll(JSON.parse(fs.readFileSync(input)))),{flag:'wx',mode:0o600});}
