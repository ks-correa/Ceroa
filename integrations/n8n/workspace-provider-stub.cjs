const http=require('http'),fs=require('fs'),assert=require('assert/strict');let state;const persist=()=>fs.writeFileSync('/tmp/workspace-trace.json',JSON.stringify(state));
http.createServer(async(req,res)=>{try{let raw='';for await(const c of req)raw+=c;const b=raw?JSON.parse(raw):{};const send=x=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(x));};
 if(req.url.endsWith('/claim')){state={scenario:b.scenario,providerAttempts:0,outcome:null};persist();send(b.scenario==='empty'?[]:[{id:'00000000-0000-4000-8000-000000000001',leaseToken:'00000000-0000-4000-8000-000000000002',channel:'GMAIL',kind:'WELCOME',recipient:'controlled@example.invalid',payload:{templateVersion:1},attempt:1}]);return;}
 if(req.url.endsWith('/dispatch')){assert.equal(b.leaseToken,'00000000-0000-4000-8000-000000000002');send(state.scenario==='changed'?null:{id:'00000000-0000-4000-8000-000000000001',recipient:'controlled@example.invalid'});return;}
 if(req.url==='/provider/gmail'){assert.equal(b.recipient,'controlled@example.invalid');assert.equal(b.subject,'Bienvenido a Ceroa');assert(b.message.includes('registrada correctamente'));state.providerAttempts++;persist();if(state.scenario==='ambiguous'){res.writeHead(503);res.end('{}');}else send({id:'gmail-synthetic-id'});return;}
 if(req.url.endsWith('/outcome')){state.outcome=b.status;persist();res.writeHead(204);res.end();return;}
 throw Error('Unexpected route');
}catch(e){fs.writeFileSync('/tmp/workspace-stub-error.txt',e.stack);res.writeHead(500);res.end('{}');}}).listen(18080,'127.0.0.1');
