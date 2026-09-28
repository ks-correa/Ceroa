import {readFile,writeFile} from 'node:fs/promises';
const here=new URL('.',import.meta.url);
const workflow=JSON.parse(await readFile(new URL('scheduled-reminders.json',here),'utf8'));
workflow.id='ceroaSentinel05';workflow.name='RA-N8N-005 - Centinela de sobrecapacidad';
workflow.settings.errorWorkflow='ceroaSentinelError05';
for(const node of workflow.nodes){
  if(node.type==='n8n-nodes-base.httpRequest')node.parameters.url=node.parameters.url.replaceAll('/reminder-worker/','/sentinel-worker/');
  if(node.id==='filter'){
    node.name='Aceptar alertas del backend';
    node.parameters.jsCode="return $input.all().flatMap(i=>Array.isArray(i.json)?i.json:[i.json]).filter(d=>typeof d.id==='string'&&/^[a-f0-9-]{36}$/i.test(d.id)).map(d=>({json:{id:d.id}}));";
  }
  if(node.id==='scan')node.name='Evaluar condiciones vigentes';
  if(node.id==='dispatch')node.name='Revalidar alerta antes de enviar';
  if(node.id==='success'||node.id==='failure')node.parameters.jsCode=node.parameters.jsCode.replaceAll("$('Revalidar antes de enviar')","$('Revalidar alerta antes de enviar')");
}
const renamed={};for(const [from,branches] of Object.entries(workflow.connections)){
  renamed[from==='Preparar eventos autorizados'?'Evaluar condiciones vigentes':from==='Aceptar hitos del backend'?'Aceptar alertas del backend':from==='Revalidar antes de enviar'?'Revalidar alerta antes de enviar':from]=branches;
  for(const outputs of branches.main)for(const target of outputs||[])target.node=target.node==='Preparar eventos autorizados'?'Evaluar condiciones vigentes':target.node==='Aceptar hitos del backend'?'Aceptar alertas del backend':target.node==='Revalidar antes de enviar'?'Revalidar alerta antes de enviar':target.node;
}workflow.connections=renamed;
const error=JSON.parse(await readFile(new URL('reminder-error.json',here),'utf8'));
error.id='ceroaSentinelError05';error.name='RA-N8N-005 - Error operativo sin datos personales';
error.nodes.find(n=>n.id==='safe').parameters.jsCode="console.warn('Ceroa RA-N8N-005: fallo operativo. Revisar el worker; no repetir envíos ambiguos.');return [{json:{component:'RA-N8N-005',status:'OPERATIONAL_FAILURE'}}];";
await writeFile(new URL('scheduled-sentinel.json',here),JSON.stringify(workflow,null,2)+'\n');
await writeFile(new URL('sentinel-error.json',here),JSON.stringify(error,null,2)+'\n');
console.log('RA-N8N-005 preparado, inactivo y sin envíos.');
