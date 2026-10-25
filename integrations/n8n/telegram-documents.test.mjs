import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workflow=JSON.parse(await readFile(new URL('assistant-telegram.json',import.meta.url),'utf8'));
const node=name=>workflow.nodes.find(n=>n.name===name);
const code=name=>node(name).parameters.jsCode;
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function normalize(message,update_id=100){return new AsyncFunction('$input',code('Validar chat privado'))({first:()=>({json:{update_id,message}})});}
const privateMessage=extra=>({from:{id:123},chat:{id:123,type:'private'},...extra});
test('accepts PDF/DOCX/XLSX with captions and preserves file identity, not URLs',async()=>{
  const [result]=await normalize(privateMessage({document:{file_id:'opaque-file-id',file_size:100,file_name:'Extracto.pdf',mime_type:'application/pdf'},caption:'/hoja Datos'}));
  assert.equal(result.json.invalid,false);assert.equal(result.json.hasFile,true);assert.equal(result.json.isDocument,true);assert.equal(result.json.fileId,'opaque-file-id');assert.equal(result.json.body.text,'/hoja Datos');assert.equal(result.json.body.document.data,'');
});
test('rejects groups, oversized documents, executable files and photos',async()=>{
  assert.deepEqual(await normalize({from:{id:123},chat:{id:-123,type:'group'},text:'hello'}),[]);
  for(const document of [{file_id:'x',file_size:8388609,file_name:'big.pdf'},{file_id:'x',file_size:100,file_name:'bad.exe'},{file_id:'x',file_size:100}])assert.equal((await normalize(privateMessage({document})))[0].json.invalid,true);
  assert.equal((await normalize(privateMessage({photo:[{file_id:'x'}]})))[0].json.invalid,true);
});
test('keeps text and voice paths working',async()=>{
  assert.equal((await normalize(privateMessage({text:'/documentos'})))[0].json.hasFile,false);
  assert.equal((await normalize(privateMessage({voice:{file_id:'v',duration:30,file_size:100,mime_type:'audio/ogg'}})))[0].json.isAudio,true);
});
test('downloads only after binding/consent check and sends originals only after delivery check',()=>{
  const target=(from,index=0)=>workflow.connections[from].main[index].map(e=>e.node);
  assert.deepEqual(target('Es archivo adjunto'),['Comprobar vinculación']);
  assert.deepEqual(target('Comprobar vinculación'),['Cuenta vinculada']);
  assert.deepEqual(target('Cuenta vinculada'),['Preparar medio autorizado']);
  assert.deepEqual(target('Es documento autorizado'),['Descargar documento autorizado']);
  assert.deepEqual(target('Verificar entrega'),['Confirmar cuenta antes de enviar']);
  assert.deepEqual(target('Preparar original privado'),['Enviar original por Telegram']);
  assert.equal(node('Enviar original por Telegram').parameters.binaryData,true);
  assert.equal(node('Enviar original por Telegram').parameters.binaryPropertyName,'data');
  assert.equal(workflow.settings.saveDataSuccessExecution,'none');assert.equal(workflow.settings.saveDataErrorExecution,'none');
  for(const connections of Object.values(workflow.connections))for(const output of connections.main||[])for(const edge of output||[])assert.ok(node(edge.node),edge.node);
});
test('prepares original bytes as a binary Telegram attachment without a public URL',async()=>{
  const body={send:true,chatId:123,answer:'Original privado',attachment:{fileName:'documento-v1.pdf',mime:'application/pdf',data:Buffer.from('synthetic').toString('base64')}};
  const [item]=await new AsyncFunction('$input',code('Preparar original privado'))({first:()=>({json:body})});
  assert.equal(Buffer.from(item.binary.data.data,'base64').toString(),'synthetic');assert.equal(item.binary.data.fileName,'documento-v1.pdf');assert.equal(item.json.chatId,123);
  body.send=false;assert.deepEqual(await new AsyncFunction('$input',code('Preparar original privado'))({first:()=>({json:body})}),[]);
});
