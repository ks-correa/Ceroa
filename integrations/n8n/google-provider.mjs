import {createHash} from 'node:crypto';

export class ProviderError extends Error {
 constructor(status=503,code='GOOGLE_PROVIDER_UNAVAILABLE',safeRetry=false){super(code);this.status=status;this.safeRetry=safeRetry;}
}
function googleDateTime(value){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))throw new ProviderError(400);
 return date.toISOString();
}
export class GoogleProvider {
 constructor(config,fetcher=fetch,reload=null){this.config=config;this.fetcher=fetcher;this.reload=reload;this.tokens=new Map();}
 async request(kind,path,method='GET',body){
  let token=this.tokens.get(kind);
  if(!token||token.until<Date.now()){
   if(this.reload){try{this.config=await this.reload();}catch{throw new ProviderError(503,'GOOGLE_PROVIDER_UNAVAILABLE',true);}}
   const credential=this.config[kind];
   if(!credential?.clientId||!credential?.clientSecret||!credential?.refreshToken)throw new ProviderError(503,'GOOGLE_PROVIDER_UNAVAILABLE',true);
   let r;try{r=await this.fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:credential.clientId,client_secret:credential.clientSecret,refresh_token:credential.refreshToken}),signal:AbortSignal.timeout(10000)});}catch{throw new ProviderError(503,'GOOGLE_PROVIDER_UNAVAILABLE',true);}
   if(!r.ok){const error=await r.json().catch(()=>({}));throw new ProviderError(503,['invalid_grant','invalid_client'].includes(error.error)?'GOOGLE_OAUTH_RECONNECT_REQUIRED':'GOOGLE_PROVIDER_UNAVAILABLE',true);}const data=await r.json();
   if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in))throw new ProviderError(503,'GOOGLE_PROVIDER_UNAVAILABLE',true);
   token={value:data.access_token,until:Date.now()+Math.max(0,data.expires_in-60)*1000};this.tokens.set(kind,token);
  }
  const origin=kind==='gmail'?'https://gmail.googleapis.com/gmail/v1/users/me':'https://www.googleapis.com/calendar/v3';
  const r=await this.fetcher(origin+path,{method,headers:{Authorization:'Bearer '+token.value,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(12000)});
  if(r.status===401)this.tokens.delete(kind);
  if(r.status===404)return null;
  if(!r.ok)throw new ProviderError(r.status===409?409:503,'GOOGLE_PROVIDER_UNAVAILABLE',[400,401,403,409,429].includes(r.status));
  if(r.status===204)return {};
  return r.json();
 }
 messageId(proposalId){return `<ceroa-${createHash('sha256').update(proposalId).digest('hex')}@ceroa.invalid>`;}
 async createDraft(input){
  const raw=Buffer.from(`To: ${input.recipient}\r\nSubject: =?UTF-8?B?${Buffer.from(input.subject).toString('base64')}?=\r\nMessage-ID: ${this.messageId(input.proposalId)}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(input.message).toString('base64')}`).toString('base64url');
  const d=await this.request('gmail','/drafts','POST',{message:{raw}});
  if(!d||typeof d.id!=='string'||!d.id||!d.message?.id)throw new ProviderError();
  return {id:d.id,proposalId:input.proposalId,provider:'GOOGLE',sent:false};
 }
 async findDraft(input){
  const d=await this.request('gmail','/drafts?maxResults=100&q='+encodeURIComponent('rfc822msgid:'+this.messageId(input.proposalId)));
  if(!d||d.nextPageToken||(d.drafts?.length??0)>1)throw new ProviderError();
  const id=d.drafts?.[0]?.id;if(!id)return null;
  const draft=await this.request('gmail','/drafts/'+encodeURIComponent(id)+'?format=raw');
  if(!draft?.message?.raw)throw new ProviderError();
  const raw=Buffer.from(draft.message.raw,'base64url').toString('utf8');
  const [headers,...content]=raw.split('\r\n\r\n');
  const expectedSubject='Subject: =?UTF-8?B?'+Buffer.from(input.subject).toString('base64')+'?=';
  if(!headers.split('\r\n').includes('To: '+input.recipient)||!headers.split('\r\n').includes(expectedSubject)||Buffer.from(content.join('\r\n\r\n').replace(/\s/g,''),'base64').toString('utf8')!==input.message)throw new ProviderError(409);
  return {id,proposalId:input.proposalId,provider:'GOOGLE',sent:false};
 }
 async availability(start,end){
  const id=this.config.calendarId;if(!id)throw new ProviderError();
  const r=await this.request('calendar','/freeBusy','POST',{timeMin:googleDateTime(start),timeMax:googleDateTime(end),items:[{id}]});
  const calendar=r?.calendars?.[id];
  if(!calendar||calendar.errors?.length||!Array.isArray(calendar.busy))throw new ProviderError();
  const busy=calendar.busy.map(({start,end})=>{
   if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start))throw new ProviderError();
   return {start,end};
  });
  return {available:busy.length===0,busy,provider:'GOOGLE',start,end};
 }
 async event(operation,input){
  const base='/calendars/'+encodeURIComponent(this.config.calendarId)+'/events';
  const url=base+'/'+input.eventId;
  if(operation==='get')return this.request('calendar',url);
  if(operation==='delete'){const result=await this.request('calendar',url+'?sendUpdates=none','DELETE');if(result===null)throw new ProviderError();return {id:input.eventId,status:'cancelled'};}
  const existing=await this.request('calendar',url);
  if(existing)return existing;
  if(!(await this.availability(input.start,input.end)).available)throw new ProviderError(409);
  try{return await this.request('calendar',base+'?conferenceDataVersion=1&sendUpdates=none','POST',{id:input.eventId,summary:'Asesoria Ceroa',description:'Solicitud confirmada en Ceroa. Sin datos financieros adjuntos.',start:{dateTime:googleDateTime(input.start)},end:{dateTime:googleDateTime(input.end)},attendees:[{email:input.email}],conferenceData:{createRequest:{requestId:input.eventId,conferenceSolutionKey:{type:'hangoutsMeet'}}}});}
  catch(e){if(e.status===409)return this.request('calendar',url);throw e;}
 }
}
