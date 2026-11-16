// Isolated demo providers. No Google Calendar/Gmail credentials or outbound effects.
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),crypto=require('node:crypto');
const base='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sdk=base+fs.readdirSync(base).find(n=>n.startsWith('@modelcontextprotocol+sdk@'))+'/node_modules/@modelcontextprotocol/sdk/dist/cjs/';
const {Server}=require(sdk+'server/index.js');
const {StreamableHTTPServerTransport}=require(sdk+'server/streamableHttp.js');
const {ListToolsRequestSchema,CallToolRequestSchema}=require(sdk+'types.js');
const statePath='/data/state.json';
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{events:{},drafts:{},objects:{}};
const save=()=>fs.writeFileSync(statePath,JSON.stringify(state));
const log=(data)=>fs.appendFileSync('/data/protocol.jsonl',JSON.stringify({at:new Date().toISOString(),...data})+'\n');
const key='synthetic-workspace-only-at-least-32-characters';
function calendar(operation,b){
 if(!['availability','create','get','delete'].includes(operation))throw Error('operation');
 const start=new Date(b.start),end=new Date(b.end);
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||+end-+start!==1800000)throw Error('slot');
 if(operation==='availability')return {available:!Object.values(state.events).some(e=>e.status==='confirmed'&&+new Date(e.start.dateTime)<+end&&+new Date(e.end.dateTime)>+start),provider:'SIMULATED',start:b.start,end:b.end};
 if(!/^[a-f0-9]{32}$/.test(b.eventId||''))throw Error('id');
 if(operation==='create'){state.events[b.eventId]??={id:b.eventId,status:'confirmed',start:{dateTime:b.start},end:{dateTime:b.end},provider:'SIMULATED'};save();}
 if(operation==='delete'&&state.events[b.eventId]){state.events[b.eventId].status='cancelled';save();}
 return state.events[b.eventId]||{id:b.eventId,status:'not_found',provider:'SIMULATED'};
}
async function handle(req,res){
 try{
 let chunks=[];for await(const c of req){chunks.push(c);if(chunks.reduce((n,x)=>n+x.length,0)>10000000)throw Error('size');}const raw=Buffer.concat(chunks);
 const out=(status,b)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(b));};
 if(req.url==='/health')return out(200,{provider:'SIMULATED'});
 if(req.url.startsWith('/config'))return out(200,{id:'financial-library-v1',embedding_model:'gemini-embedding-001',dimensions:768,schema_version:21,max_file_bytes:8388608,max_pages:25,ocr_model:'gemini-3.5-flash-lite'});
 if(req.url==='/mcp'){
  if(req.headers['x-ceroa-workspace']!==key)return out(401,{});
  if(req.method!=='POST')return out(405,{});
  const body=JSON.parse(raw);log({method:body.method,tool:body.params?.name,id:body.id,transport:'streamable-http',provider:'SIMULATED'});
  const server=new Server({name:'ceroa-calendar-demo',version:'1.0.0'},{capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'calendar_availability',description:'Read synthetic calendar availability only. No creation or cancellation.',inputSchema:{type:'object',properties:{start:{type:'string'},end:{type:'string'}},required:['start','end'],additionalProperties:false}}]}));
  server.setRequestHandler(CallToolRequestSchema,async r=>{if(r.params.name!=='calendar_availability')throw Error('Tool denied');return {content:[{type:'text',text:JSON.stringify(calendar('availability',r.params.arguments))}]};});
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  await server.connect(transport);res.on('close',()=>{transport.close();server.close();});await transport.handleRequest(req,res,body);return;
 }
 if(req.url.startsWith('/calendar/')){if(req.headers['x-ceroa-workspace']!==key)return out(401,{});const b=JSON.parse(raw);log({operation:req.url,provider:'SIMULATED',eventId:b.eventId});return out(200,calendar(req.url.split('/').pop(),b));}
 if(req.url==='/gmail/createDraft'){
  if(req.headers['x-ceroa-workspace']!==key)return out(401,{});const b=JSON.parse(raw);if(!b.proposalId||!b.subject||!b.message||!b.recipient?.endsWith('@ceroa.local'))return out(400,{});
  state.drafts[b.proposalId]??={id:'draft_'+crypto.randomUUID(),proposalId:b.proposalId,subject:b.subject,message:b.message,recipient:b.recipient,provider:'SIMULATED',sent:false};save();log({operation:'gmail.createDraft',proposalId:b.proposalId,provider:'SIMULATED'});return out(200,state.drafts[b.proposalId]);
 }
 if(req.url.startsWith('/storage/v1/')){
  if(req.headers.apikey!=='synthetic-storage-key')return out(401,{});
  const path=req.url.split('?')[0].replace('/storage/v1/','');
  if(path==='bucket/financial-documents')return out(200,{public:false});
  const object=path.replace(/^object\/(authenticated\/)?financial-documents\//,'');
  if(req.method==='POST'){if(state.objects[object])return out(409,{});state.objects[object]={mime:req.headers['content-type'],base64:raw.toString('base64')};save();return out(200,{Key:object});}
  if(req.method==='GET'){const value=state.objects[object];if(!value)return out(404,{});res.writeHead(200,{'Content-Type':value.mime});res.end(Buffer.from(value.base64,'base64'));return;}
  if(req.method==='DELETE'){for(const p of JSON.parse(raw).prefixes||[])delete state.objects[p];save();return out(200,{});}
 }
 return out(404,{});
 }catch(e){if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'DEMO_ADAPTER_REJECTED'}));}
}
http.createServer(handle).listen(3100,'0.0.0.0');
https.createServer({key:fs.readFileSync('/fixtures/storage-key.pem'),cert:fs.readFileSync('/fixtures/storage-cert.pem')},handle).listen(3443,'0.0.0.0');
