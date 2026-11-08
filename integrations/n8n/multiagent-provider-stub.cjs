// Disposable, synthetic test provider/backend. Never connects to real accounts or APIs.
const http=require('http'),fs=require('fs'),assert=require('assert/strict');
const traces=[];const grants=new Map();let counter=0;
const backendTraces=[];const backendTrace=value=>{backendTraces.push(value);fs.writeFileSync('/tmp/backend-traces.json',JSON.stringify(backendTraces));};
const response=(res,value)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{try{
 const chunks=[];for await(const c of req)chunks.push(c);const body=chunks.length?JSON.parse(Buffer.concat(chunks)):{};
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/v1/chat/completions'){
 const tools=body.tools??[],names=tools.map(t=>t.function.name);const root=body.model==='fixture-root',legacy=body.model==='fixture-legacy';
  const messages=body.messages;const results=messages.filter(m=>m.role==='tool');
  const decoded=[];const decode=value=>{if(typeof value==='string'){try{decode(JSON.parse(value));}catch{}}else if(Array.isArray(value))value.forEach(decode);else if(value&&typeof value==='object'){decoded.push(value);Object.values(value).forEach(decode);}};results.forEach(r=>decode(r.content));
  const freshFacts=decoded.find(x=>x.facts&&Object.values(x.facts).some(f=>f.source?.endsWith('/balance')))?.facts;
  const balanceRef=freshFacts?Object.keys(freshFacts).find(k=>freshFacts[k].source?.endsWith('/balance')):'f1';
  const specialistResult=decoded.find(x=>x.schemaVersion==='1.1'&&x.answer&&x.role);
  const scenario=JSON.stringify(messages).match(/SCENARIO_([A-Z]+)/)?.[1]??'COMPOSITE';
  traces.push({model:body.model,scenario,tools:names,results:results.length});fs.writeFileSync('/tmp/provider-traces.json',JSON.stringify(traces));
  let tool,args,output;
  if(legacy){
   const count=scenario==='COMPOSITE'?2:1;
   if(results.length<count){tool=scenario==='RAG'?names.find(n=>/documentaci/i.test(n)):scenario==='EXTRACTS'||scenario==='COMPOSITE'&&results.length===0?names.find(n=>/documentos_financieros/i.test(n)):names.find(n=>/datos_financieros/i.test(n));args=/documentos_financieros/i.test(tool)?{intent:'FACT_ANALYSIS',question:'Saldo documental',identificationType:'',documentType:'BANK_STATEMENT',periodFrom:'',periodToExclusive:'',offset:0}:/datos_financieros/i.test(tool)?{dataset:'debts',year:2026,month:11,offset:0}:{query:'Uso de Ceroa'};}
   else output={answer:scenario==='RAG'?'Consulta la documentación aprobada.':'Saldo registrado {{'+balanceRef+'}}.',mode:scenario==='RAG'?'documentary':'personal',sources:scenario==='RAG'?['d1']:[]};
  }else if(root){
   const count=scenario==='UNKNOWN'?0:scenario==='COMPOSITE'?2:1;
   if(results.length<count){const target=scenario==='COMPOSITE'?(results.length===0?'RAG':'FINANCIAL'):scenario==='EXTRACTS'?'RAG':scenario;
    tool=names.find(n=>target==='RAG'?/Conocimiento|RAG/i.test(n):target==='SUPPORT'?/Soporte/i.test(n):/Financiero/i.test(n));args={task:'SCENARIO_'+scenario+' '+(results.length===0?'Resolver parte especializada':'Interpretar evidencia compartida'),evidenceRefs:results.length===0?'':'f1'};}
   else output={answer:scenario==='UNKNOWN'?'No tengo información aprobada suficiente para responder esa pregunta':scenario==='SUPPORT'||scenario==='RAG'?'Consulta la documentación aprobada.':specialistResult?.answer??'Resultado parcial {{f1}}.',mode:scenario==='RAG'||scenario==='SUPPORT'||scenario==='UNKNOWN'?'documentary':'personal',sources:scenario==='RAG'||scenario==='SUPPORT'?['d1']:[]};
  }else{
   if(!results.length){tool=scenario==='SUPPORT'||scenario==='RAG'?names.find(n=>/documentaci/i.test(n)):body.model.includes('Financial')?names.find(n=>/datos_financieros/i.test(n)):names.find(n=>/documentos_financieros/i.test(n));
    args=/documentos_financieros/i.test(tool)?{intent:'FACT_ANALYSIS',question:'Saldo documental',identificationType:'',documentType:'BANK_STATEMENT',periodFrom:'',periodToExclusive:'',offset:0}: /datos_financieros/i.test(tool)?{dataset:'debts',year:2026,month:11,offset:0}:{query:'Uso de Ceroa'};
   }else output={schemaVersion:'1.1',role:body.model.includes('Financial')?'FINANCIAL':body.model.includes('Support')?'SUPPORT':'RAG',status:'PARTIAL',answer:scenario==='SUPPORT'||scenario==='RAG'?'Consulta la documentación aprobada.':'Saldo registrado {{'+balanceRef+'}}.',evidenceRefs:scenario==='SUPPORT'||scenario==='RAG'?[]:[balanceRef],sources:scenario==='SUPPORT'||scenario==='RAG'?['d1']:[],coverage:'PARTIAL',missingData:['Cobertura sintética parcial'],requiresConfirmation:false};
  }
  if(output){const final=names.find(n=>n==='format_final_json_response');if(final){tool=final;args={output};}}
  if(!tool&&!output)throw Error('No matching tool '+JSON.stringify(names));
  const message=tool?{role:'assistant',content:null,tool_calls:[{id:'call_'+(++counter),type:'function',function:{name:tool,arguments:JSON.stringify(args)}}]}:{role:'assistant',content:JSON.stringify(output)};
  response(res,{id:'fixture-'+counter,object:'chat.completion',created:1,model:body.model,choices:[{index:0,message,finish_reason:tool?'tool_calls':'stop'}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}});return;
 }
 if(url.pathname.endsWith('/begin')){const role=url.pathname.split('/').at(-2);const token='00000000-0000-4000-8000-'+String(++counter).padStart(12,'0');grants.set(token,role);backendTrace({event:'begin',role});response(res,{requestId:'00000000-0000-4000-8000-000000000001',correlationId:'00000000-0000-4000-8000-000000000001',role,scopeToken:token,task:body.task,maxIterations:4,remainingMs:60000,maxContextCharacters:16000,cached:null,evidence:body.evidenceRefs?.length?{f1:{source:'syntheticDocument/balance',value:42}}:{}});return;}
 if(url.pathname.endsWith('/complete')){assert.equal(body.schemaVersion,'1.1');assert.equal(body.role,grants.get(url.pathname.split('/').at(-2)));backendTrace({event:'complete',role:body.role,status:body.status});response(res,body);return;}
 if(url.pathname.endsWith('/fail'))throw Error('Specialist failed '+JSON.stringify(body));
 if(url.pathname.endsWith('/financial-documents')){assert(url.searchParams.get('scope'));response(res,{status:'PARTIAL',evidence:{facts:{f1:{source:'synthetic',value:42}}},snippets:[]});return;}
 if(url.pathname.endsWith('/data')){assert(url.searchParams.get('scope'));backendTrace({event:'tool',tool:'data'});response(res,{facts:{f1:{source:'debts/2026/11/0/items/0/balance',value:42},f2:{source:'debts/2026/11/0/items/0/name',value:'Obligación sintética'},f3:{source:'debts/2026/11/0/hasMore',value:false},f4:{source:'debts/2026/11/0/items/0/normalizedRate/available',value:false},f5:{source:'debts/2026/11/0/items/0/minimumPayment',value:null},f6:{source:'debts/2026/11/0/coverage',value:'PARTIAL'}}});return;}
 if(url.pathname.endsWith('/documents')){assert(url.searchParams.get('scope'));backendTrace({event:'tool',tool:'documents'});response(res,{status:'COMPLETE',sources:{d1:{title:'Ayuda aprobada sintética',content:'Para registrar un pago abre Deudas, selecciona la obligación, elige Registrar pago, revisa importe y fecha y confirma. El asistente solo orienta y no registra pagos.',version:1,chunkId:'synthetic-approved-chunk'}}});return;}
 throw Error('Unexpected '+url.pathname);
}catch(e){fs.appendFileSync('/tmp/provider-error.log',e.stack+'\n');res.writeHead(500);res.end(JSON.stringify({error:'FIXTURE_FAILED'}));}});
server.listen(18080,'127.0.0.1',()=>console.log('Synthetic provider ready'));
