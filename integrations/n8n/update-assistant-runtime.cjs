// Keep the installed workflow's private credentials while updating the query contract.
const fs=require('fs');
const current=JSON.parse(fs.readFileSync('/tmp/ceroa-hybrid-export.json','utf8'));
const workflows=Array.isArray(current)?current:[current];
const installed=workflows.find(workflow=>workflow.id==='ceroaHybridQuery20');
const template=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/hybrid-rag-query.json','utf8'));
if(!installed||!installed.active||template.id!==installed.id)throw new Error('Expected published assistant workflow is missing');
for(const name of ['Analizar finanzas','Consultar documentos financieros','Preparar texto','Validar respuesta','Validar evidencia en Spring Boot']){
  const oldNode=installed.nodes.find(node=>node.name===name);
  const nextNode=template.nodes.find(node=>node.name===name);
  if(!oldNode||!nextNode||name==='Consultar documentos financieros'&&!oldNode.credentials)throw new Error(`Missing credentialed node: ${name}`);
  oldNode.parameters=nextNode.parameters;
}
for(const name of ['Revisar borrador con evidencia','Borrador respaldado','Corregir referencias sin nuevas consultas','Validar respuesta corregida',...template.nodes.filter(node=>node.id.startsWith('failure-')).map(node=>node.name)]){
  const nextNode=structuredClone(template.nodes.find(node=>node.name===name));
  if(!nextNode)throw new Error(`Missing template node: ${name}`);
  if(name==='Revisar borrador con evidencia'){
    const credentials=installed.nodes.find(node=>node.name==='Validar evidencia en Spring Boot').credentials;
    if(!credentials)throw new Error('Missing completion credentials');
    nextNode.credentials=structuredClone(credentials);
  }
  const index=installed.nodes.findIndex(node=>node.name===name);
  if(index<0)installed.nodes.push(nextNode);else installed.nodes[index]=nextNode;
}
installed.connections=structuredClone(template.connections);
fs.writeFileSync('/tmp/ceroa-hybrid-updated.json',JSON.stringify([installed]),{mode:0o600});
console.log('Prepared assistant workflow update with existing credential references.');
