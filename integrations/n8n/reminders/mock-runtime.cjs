// Isolated workflow acceptance harness: synthetic data, loopback-only fake Telegram.
const fs=require('fs'),http=require('http');
const port=18094,base='http://127.0.0.1:'+port;
if(process.argv[2]==='prepare'){
  const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
  const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
  const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
  const creds=[{id:'ceroaReminderMockHeader04',name:'Ceroa mock reminder header',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Reminders',value:'mock-only-not-a-real-secret'})},
    {id:'ceroaReminderMockTelegram04',name:'Ceroa mock Telegram loopback',type:'telegramApi',data:cipher.encrypt({accessToken:'000000:mock',baseUrl:base})}];
  fs.writeFileSync('/tmp/ceroa-reminder-mock-creds.json',JSON.stringify(creds));
  const workflow=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/scheduled-reminders.json','utf8'));
  workflow.id='ceroaReminderMock04';workflow.name='RA-N8N-004 - Prueba sintética sin envíos reales';delete workflow.settings.errorWorkflow;
  for(const n of workflow.nodes){
    if(n.type==='n8n-nodes-base.scheduleTrigger'){n.type='n8n-nodes-base.manualTrigger';n.typeVersion=1;n.parameters={};}
    if(n.type==='n8n-nodes-base.httpRequest'){n.parameters.url=n.parameters.url.replaceAll('http://backend:8080',base);n.credentials={httpHeaderAuth:{id:creds[0].id,name:creds[0].name}};}
    if(n.type==='n8n-nodes-base.telegram')n.credentials={telegramApi:{id:creds[1].id,name:creds[1].name}};
  }fs.writeFileSync('/tmp/ceroa-reminder-mock-workflow.json',JSON.stringify(workflow));console.log('Prueba aislada preparada.');
}else if(process.argv[2]==='serve'){
  let scenario='success',sent=0,scans=0,attempts=0,outcomes=[];
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,base);let data='';for await(const c of req)data+=c;const body=data?JSON.parse(data):{};
    res.setHeader('Content-Type','application/json');const reply=(value,code=200)=>{res.statusCode=code;res.end(JSON.stringify(value));};
    if(url.pathname==='/scenario'){scenario=url.searchParams.get('case');sent=0;scans=0;attempts=0;outcomes=[];return reply({ready:true});}
    if(url.pathname==='/report')return reply({scenario,sent,scans,attempts,outcomes});
    if(url.pathname==='/shutdown'){reply({stopped:true});setTimeout(()=>server.close(),20);return;}
    if(url.pathname.endsWith('/scan')){scans++;const page=Number(url.searchParams.get('page'));return reply({processed:1,hasMore:page===0,nextPage:page+1});}
    if(url.pathname.endsWith('/candidates'))return reply([{id:'11111111-1111-1111-1111-111111111111',kind:'REMINDER',milestone:'SEVEN_DAYS'}]);
    if(url.pathname.endsWith('/reserve'))return reply({reserved:true,id:'11111111-1111-1111-1111-111111111111',token:'a'.repeat(43)});
    if(url.pathname.endsWith('/dispatch'))return reply({send:scenario!=='revoked',id:'11111111-1111-1111-1111-111111111111',token:'a'.repeat(43),chatId:42,text:'Ceroa: prueba <segura> por 50.000 COP.',validatedAt:'2026-09-27T09:00:00-05:00'});
    if(url.pathname.endsWith('/outcome')){attempts++;outcomes.push(body);if(scenario==='result-retry'&&attempts===1)return reply({available:false},503);return reply({status:body.result});}
    if(url.pathname.endsWith('/sendMessage')){
      sent++;
      if(body.text.includes('<segura>'))return reply({ok:false,error_code:400,description:'Unescaped HTML'},400);
      if(scenario==='rate-limit')return reply({ok:false,error_code:429,description:'Too Many Requests: retry after 600',parameters:{retry_after:600}},429);
      if(scenario==='server-error')return reply({ok:false,error_code:503,description:'Service unavailable'},503);
      if(scenario==='permanent')return reply({ok:false,error_code:403,description:'Forbidden: bot was blocked by the user'},403);
      if(scenario==='timeout'){req.socket.destroy();return;}
      return reply({ok:true,result:{message_id:123,chat:{id:42},text:body.text}});
    }
    reply({notFound:true},404);
  }).listen(port,'127.0.0.1');
}else if(process.argv[2]==='scenario'){
  fetch(base+'/scenario?case='+encodeURIComponent(process.argv[3])).then(r=>{if(!r.ok)process.exitCode=1;});
}else if(process.argv[2]==='shutdown'){
  fetch(base+'/shutdown').catch(()=>{});
}else if(process.argv[2]==='check'){
  fetch(base+'/report').then(r=>r.json()).then(report=>{
    const expected={success:'SENT','result-retry':'SENT','rate-limit':'RETRY','server-error':'RETRY',permanent:'FAILED',timeout:'AMBIGUOUS',revoked:null}[report.scenario];
    if(report.scans!==2||report.sent!==(expected?1:0)||report.outcomes.some(o=>o.result!==expected)||expected&&!report.outcomes.length)throw Error('Contrato del workflow incorrecto: '+JSON.stringify(report));
    if(report.scenario==='rate-limit'&&report.outcomes[0].retryAfter!==600)throw Error('retry_after no conservado: '+JSON.stringify(report));
    if(report.scenario==='result-retry'&&(report.attempts!==2||JSON.stringify(report.outcomes[0])!==JSON.stringify(report.outcomes[1])))throw Error('El resultado no se reintentó de forma idéntica');
    console.log(JSON.stringify({scenario:report.scenario,telegramCalls:report.sent,result:expected,recordAttempts:report.attempts,passed:true}));
  }).catch(e=>{console.log(e.message);process.exitCode=1;});
}
