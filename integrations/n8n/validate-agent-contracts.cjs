// Validate with the same Ajv major available in the installed n8n runtime.
const fs=require('fs'),assert=require('assert/strict');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const pkg=fs.readdirSync(root).find(x=>x.startsWith('ajv@8.'));
if(!pkg)throw Error('Installed Ajv 8 required');
const Ajv=require(root+pkg+'/node_modules/ajv/dist/2020').default;
const ajv=new Ajv({allErrors:true});ajv.addFormat('uuid',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const dir=__dirname+'/contracts/';
const validate=ajv.compile(JSON.parse(fs.readFileSync(dir+'agent-task.schema.json','utf8')));
const task={schemaVersion:'1.0',requestId:'00000000-0000-4000-8000-000000000001',correlationId:'00000000-0000-4000-8000-000000000001',role:'RAG',task:'Consultar evidencia',budget:{maxIterations:6,maxToolCalls:10,maxLibraryCalls:4,maxContextCharacters:30000,deadlineMs:90000}};
assert(validate(task),JSON.stringify(validate.errors));
assert(!validate({...task,userId:'foreign'}));assert(!validate({...task,budget:{...task.budget,maxIterations:99}}));assert(!validate({...task,role:'ADMIN'}));
const result=ajv.compile(JSON.parse(fs.readFileSync(dir+'agent-result.schema.json','utf8')));
const output={schemaVersion:'1.0',requestId:task.requestId,correlationId:task.correlationId,role:'RAG',status:'SUCCESS',answer:'Valor {{f1}}',evidenceRefs:['f1'],error:null};
assert(result(output));assert(!result({...output,evidenceRefs:['f1','f1']}));assert(!result({...output,error:{code:'SECRET_MESSAGE',retryable:true}}));assert(!result({...output,paymentCreated:true}));
console.log('8 schema validations passed using installed Ajv; identity overrides, extra writes and oversized budgets rejected.');
