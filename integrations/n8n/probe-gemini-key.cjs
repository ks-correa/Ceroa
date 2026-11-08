// Raw key arrives only through stdin. Never persist or print it, provider bodies or URLs containing it.
let key='';process.stdin.on('data',chunk=>key+=chunk);process.stdin.on('end',async()=>{
 try{
  key=key.trim();if(!key||key.length>1024||/[\r\n]/.test(key))throw Error();
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
  const body=await response.json();const reasons=(body.error?.details??[]).map(x=>x.reason).filter(x=>typeof x==='string'&&/^[A-Z0-9_]{1,80}$/.test(x));
  if(!response.ok){console.log(JSON.stringify({status:'REJECTED',httpStatus:response.status,providerStatus:typeof body.error?.status==='string'&&/^[A-Z_]{1,80}$/.test(body.error.status)?body.error.status:'UNKNOWN',reasons,credentialChanged:false}));return;}
  console.log(JSON.stringify({status:'MODEL_LIST_VERIFIED',httpStatus:response.status,modelCount:body.models?.length??0,credentialChanged:false}));
 }catch{console.log(JSON.stringify({status:'PROBE_FAILED',credentialChanged:false,noSecretOutput:true}));process.exitCode=1;}finally{key='';}
});
