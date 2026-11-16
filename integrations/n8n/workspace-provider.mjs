import {DatabaseSync} from 'node:sqlite';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GoogleProvider,ProviderError} from './google-provider.mjs';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export class WorkspaceProvider {
 constructor(path,google){
  this.google=google;this.db=new DatabaseSync(path);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS drafts(proposal TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, status TEXT NOT NULL, receipt TEXT);');
 }
 async draft(input){
  if(!input||typeof input.proposalId!=='string'||!input.proposalId.match(/^[a-f0-9-]{36}$/i)||typeof input.recipient!=='string'||!input.recipient.match(/^[^\s<>\r\n@]+@[^\s<>\r\n@]+$/)||typeof input.subject!=='string'||!input.subject||input.subject.length>200||/[\r\n]/.test(input.subject)||typeof input.message!=='string'||!input.message||input.message.length>10000)throw new ProviderError(400);
  const {proposalId,recipient,subject,message}=input;const fingerprint=hash({proposalId,recipient,subject,message});
  this.db.exec('BEGIN IMMEDIATE');let row;
  try{
   row=this.db.prepare('SELECT * FROM drafts WHERE proposal=?').get(proposalId);
   if(row&&row.fingerprint!==fingerprint)throw new ProviderError(409);
   if(!row)this.db.prepare("INSERT INTO drafts VALUES(?,?,'CREATING',NULL)").run(proposalId,fingerprint);
   else if(row.status==='RETRY_SAFE')this.db.prepare("UPDATE drafts SET status='CREATING' WHERE proposal=?").run(proposalId);
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
  if(row?.status==='READY')return JSON.parse(row.receipt);
  // CREATING survives crashes. Never issue a second create, even if search is empty:
  // Gmail search can lag behind the effect of an uncertain HTTP request.
  const creating=!row||row.status==='RETRY_SAFE';
  let result;
  try{result=creating?await this.google.createDraft(input):await this.google.findDraft(input);}
  catch(e){if(creating&&e instanceof ProviderError&&e.safeRetry)this.db.prepare("UPDATE drafts SET status='RETRY_SAFE' WHERE proposal=? AND status='CREATING'").run(proposalId);throw e;}
  if(!result||typeof result.id!=='string'||!result.id||result.sent!==false||result.proposalId!==proposalId)throw new ProviderError();
  this.db.prepare("UPDATE drafts SET status='READY',receipt=? WHERE proposal=?").run(JSON.stringify(result),proposalId);
  return result;
 }
 async calendar(input,readOnly=false){
  if(!input||!['availability','create','get','delete'].includes(input.operation)||readOnly&&input.operation!=='availability')throw new ProviderError(400);
  if(!Number.isFinite(Date.parse(input.start))||Date.parse(input.end)-Date.parse(input.start)!==1800000)throw new ProviderError(400);
  if(input.operation==='availability')return this.google.availability(input.start,input.end);
  if(!/^[a-f0-9]{32}$/.test(input.eventId||'')||input.operation==='create'&&!/^[^\s<>@]+@[^\s<>@]+$/.test(input.email||''))throw new ProviderError(400);
  const r=await this.google.event(input.operation,input);
  if(r===null)return {id:input.eventId,status:'not_found'};
  if(r.id!==input.eventId||!['confirmed','cancelled','tentative'].includes(r.status))throw new ProviderError();
  if(r.status==='confirmed'&&(Date.parse(r.start?.dateTime)!==Date.parse(input.start)||Date.parse(r.end?.dateTime)!==Date.parse(input.end)))throw new ProviderError(409);
  // Return only the fields consumed by the backend, never attendees or provider metadata.
  return {id:r.id,status:r.status,start:r.start,end:r.end,...(r.hangoutLink?{hangoutLink:r.hangoutLink}:{}),...(r.conferenceData?{conferenceData:{entryPoints:r.conferenceData.entryPoints?.filter(p=>p.entryPointType==='video')}}:{})};
 }
 close(){this.db.close();}
}
export function server(provider,key){
 if(typeof key!=='string'||key.length<32)throw Error('Worker key required');
 return createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  try{
   const supplied=Buffer.from(req.headers['x-ceroa-workspace']||'');const expected=Buffer.from(key);
   if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply(401,{});
   if(req.method!=='POST')return reply(405,{});
   let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>20000)throw new ProviderError(413);chunks.push(c);}
   let body;try{body=JSON.parse(Buffer.concat(chunks))}catch{throw new ProviderError(400)}
   if(req.url==='/gmail/createDraft')return reply(200,await provider.draft(body));
   if(req.url==='/calendar')return reply(200,await provider.calendar(body));
   // MCP is read-only: availability is the sole tool exposed to agents.
   if(req.url==='/mcp'){
    const result=body.method==='initialize'?{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'ceroa-google-calendar',version:'1.0.0'}}:body.method==='tools/list'?{tools:[{name:'calendar_availability',description:'Read support calendar availability',inputSchema:{type:'object',properties:{start:{type:'string'},end:{type:'string'}},required:['start','end'],additionalProperties:false}}]}:body.method==='tools/call'&&body.params?.name==='calendar_availability'?{content:[{type:'text',text:JSON.stringify(await provider.calendar({...body.params.arguments,operation:'availability'},true))}]}:null;
    if(body.method==='notifications/initialized'){res.writeHead(202);return res.end();}
    return reply(200,result?{jsonrpc:'2.0',id:body.id,result}:{jsonrpc:'2.0',id:body.id??null,error:{code:-32601,message:'Method not allowed'}});
   }
   return reply(404,{});
  }catch(e){reply(e instanceof ProviderError?e.status:503,{error:'PROVIDER_UNCONFIRMED'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const reload=process.env.GOOGLE_PROVIDER_FROM_N8N==='true'?(await import('./n8n-google-config.cjs')).default:null;
 const resolved=reload?await reload():JSON.parse(fs.readFileSync(process.env.GOOGLE_PROVIDER_CONFIG_FILE||'/run/secrets/google-provider.json','utf8'));
 const provider=new WorkspaceProvider(process.env.WORKSPACE_PROVIDER_DB||'/data/provider.sqlite',new GoogleProvider(resolved,fetch,reload));
 server(provider,resolved.workerKey).listen(3100,'0.0.0.0');
}
