// Only for the disposable Block 8 backend; never reads environment credentials.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
assert.equal(process.env.BLOCK8_SYNTHETIC,'true','Requires the disposable Block 8 backend');
const base='http://127.0.0.1:18088/api/v1';
function client(){const jar=new Map();return async(method,path,data)=>{
 const response=await fetch(base+path,{method,headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(data?{'Content-Type':'application/json','X-XSRF-TOKEN':decodeURIComponent(jar.get('XSRF-TOKEN')||'')}: {})},body:data?JSON.stringify(data):undefined});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 return response;
};}
async function register(call){await call('GET','/auth/csrf');const response=await call('POST','/auth/register',{fullName:'Synthetic profile Block Eight',email:randomUUID()+'@example.invalid',phone:'+573001234567',birthDate:'1990-01-01',password:'SyntheticFixture!123',confirmPassword:'SyntheticFixture!123',acceptTerms:true,acceptPrivacy:true});assert.equal(response.status,200);}
const owner=client(),other=client();await register(owner);await register(other);
const initial={monthlyIncome:3000000,fixedExpenses:1000000,availableMoney:500000,totalDeclaredDebts:1,activeStrategy:'snowball'};
assert.equal((await owner('PUT','/financial-profile',initial)).status,200);
const updated={...initial,monthlyIncome:4000000,fixedExpenses:1200000,availableMoney:600000};
assert.equal((await owner('PUT','/financial-profile',updated)).status,200);
let persisted=await(await owner('GET','/financial-profile')).json();assert.equal(persisted.monthlyIncome,4000000);assert.equal(persisted.availableMoney,600000);
const invalid=await owner('PUT','/financial-profile',{...updated,monthlyIncome:-1});assert([400,422].includes(invalid.status));
persisted=await(await owner('GET','/financial-profile')).json();assert.equal(persisted.monthlyIncome,4000000);
const foreign=await(await other('GET','/financial-profile')).json();assert.notEqual(foreign.monthlyIncome,4000000);
assert.equal((await client()('GET','/financial-profile')).status,401);
console.log(JSON.stringify({scope:'Financial profile API -> Spring -> isolated PostgreSQL',createUpdateRead:'PASS',invalidUpdatePreservesState:'PASS',ownerIsolation:'PASS',unauthenticatedRead:'REJECTED',browserE2E:false,externalProviders:false}));
