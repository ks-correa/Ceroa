import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {bind,inspect,initialize,mayPublish} from './bootstrap.mjs';
test('explicit credential configuration does not reactivate manually disabled workflows',()=>{
 const ready={id:'one',publication:'ready'},current=[{id:'one',active:false}];
 assert.equal(mayPublish(ready,current,{blocked:[]},true),false);
 assert.equal(mayPublish(ready,current,{blocked:['one']},true),true);
 assert.equal(mayPublish({...ready,publication:'manual'},[],null,true),false);
 assert.equal(mayPublish({...ready,disabled:true},[],null,true),false);
 assert.equal(mayPublish(ready,[{id:'one',active:true}],{},false),false);
});
test('logical binding uses local IDs, rejects ambiguity and retains missing credentials unpublished',()=>{
 const w={id:'one',nodes:[{credentials:{httpHeaderAuth:{name:'logical'}},parameters:{calendar:'${CALENDAR_ID}'}}]};
 const b=bind(w,[{id:'laptop',type:'httpHeaderAuth',name:'logical'}],{CALENDAR_ID:'private'});assert.equal(b.workflow.nodes[0].credentials.httpHeaderAuth.id,'laptop');assert.equal(b.workflow.nodes[0].parameters.calendar,'private');assert.deepEqual(b.missing,[]);assert.equal(w.nodes[0].parameters.calendar,'${CALENDAR_ID}');
 assert.deepEqual(bind(w,[],{}).missing,['CALENDAR_ID','httpHeaderAuth:logical']);assert.throws(()=>bind(w,[{id:'a',type:'httpHeaderAuth',name:'logical'},{id:'b',type:'httpHeaderAuth',name:'logical'}],{}),/Duplicate/);
});
test('missing subworkflows and broken graph targets stop initialization',()=>{
 assert.throws(()=>inspect({workflows:[{id:'one',dependencies:['missing']}]},[{id:'one',nodes:[],connections:{}}]),/dependency/);
 assert.throws(()=>inspect({workflows:[{id:'one',dependencies:[]}]},[{id:'one',nodes:[{name:'entry'}],connections:{entry:{main:[[{node:'missing'}]]}}}]),/target/);
});
test('credential reconfiguration preserves existing private resource IDs unless explicitly replaced',()=>{
 const w={id:'calendar',nodes:[{id:'one',parameters:{calendar:'${CALENDAR_ID}',expression:'=${CALENDAR_ID}'}}]},current={nodes:[{id:'one',parameters:{calendar:'private-calendar',expression:'=private-calendar'}}]};
 assert.deepEqual(bind(w,[],{},current).workflow.nodes[0].parameters,current.nodes[0].parameters);
 assert.equal(bind(w,[],{CALENDAR_ID:'replacement'},current).workflow.nodes[0].parameters.calendar,'replacement');
});
test('fresh install and ordinary restart never duplicate or overwrite persisted workflows',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-bootstrap-test-'));let workflows=[],credentials=[],imports=0;const env={N8N_USER_FOLDER:dir,ASSISTANT_WORKER_KEY:'synthetic-worker-at-least-32-characters'};
 const cli=argv=>{const command=argv[0],file=argv.find(x=>x.startsWith('--output='))?.slice(9),input=argv.find(x=>x.startsWith('--input='))?.slice(8);
  if(command==='export:workflow')fs.writeFileSync(file,JSON.stringify(workflows.filter(w=>!argv.includes('--published')||w.active)));
  else if(command==='export:credentials')fs.writeFileSync(file,JSON.stringify(credentials));
  else if(command==='import:credentials')credentials.push(...JSON.parse(fs.readFileSync(input)));
  else if(command==='import:workflow'){imports++;for(const w of JSON.parse(fs.readFileSync(input))){workflows=workflows.filter(x=>x.id!==w.id);workflows.push(w);}}
  else if(command==='publish:workflow')workflows.find(w=>w.id===argv[1].slice(5)).active=true;
  else throw Error(command);
 };
 try{initialize({env,cli});assert.equal(workflows.length,21);assert.equal(credentials.length,1);assert.equal(workflows.filter(w=>w.active).length,2);workflows[0].name='Local draft preserved';initialize({env,cli});assert.equal(imports,1);assert.equal(credentials.length,1);assert.equal(workflows[0].name,'Local draft preserved');assert.equal(workflows.find(w=>w.id==='ceroaWorkspaceSheets40').active,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
