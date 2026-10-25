import {request} from '../../frontend/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
// Uses only the existing synthetic demo account. Does not create documents, modify finance or send Telegram messages.
const api=await request.newContext({baseURL:'http://localhost:8080'});
let token,logged=false;
try {
 const openapi=await api.get('/v3/api-docs');assert.equal(openapi.status(),200);
 const schema=await openapi.json();assert.ok(schema.paths['/api/v1/financial-documents/search']);
 token=(await (await api.get('/api/v1/auth/csrf')).json()).token;
 const unauthorized=await api.post('/api/v1/financial-documents/search',{headers:{'X-XSRF-TOKEN':token},data:{intent:'METADATA_SEARCH',offset:0,limit:10}});assert.equal(unauthorized.status(),401);
 const login=await api.post('/api/v1/auth/login',{headers:{'X-XSRF-TOKEN':token},data:{email:'demo@ceroa.local',password:'Demo123!'}});assert.equal(login.status(),200);logged=true;
 token=(await (await api.get('/api/v1/auth/csrf')).json()).token;
 for(const endpoint of ['/api/v1/debts','/api/v1/payments','/api/v1/financial-profile'])assert.equal((await api.get(endpoint)).status(),200);
 const library=await api.post('/api/v1/financial-documents/search',{headers:{'X-XSRF-TOKEN':token},data:{intent:'METADATA_SEARCH',offset:0,limit:10}});
 assert.equal(library.status(),503,'Library must stay disabled until private storage is provisioned');
 const worker=await api.post('/api/v1/library-tools/claim',{headers:{'X-XSRF-TOKEN':token}});assert.ok([401,403].includes(worker.status()));
 console.log(JSON.stringify({openapi:'OK',unauthenticatedLibrary:'DENIED',login:'OK',financialReads:'OK',library:'DISABLED',sessionAsWorker:'DENIED'}));
}finally{
 if(logged)await api.post('/api/v1/auth/logout',{headers:{'X-XSRF-TOKEN':token}});
 await api.dispose();
}
