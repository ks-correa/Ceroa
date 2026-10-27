// Keep the installed workflow's private credentials while updating the query contract.
const fs=require('fs');
const current=JSON.parse(fs.readFileSync('/tmp/ceroa-hybrid-export.json','utf8'));
const workflows=Array.isArray(current)?current:[current];
const installed=workflows.find(workflow=>workflow.id==='ceroaHybridQuery20');
const template=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/hybrid-rag-query.json','utf8'));
if(!installed||!installed.active||template.id!==installed.id)throw new Error('Expected published assistant workflow is missing');
for(const name of ['Analizar finanzas','Consultar documentos financieros']){
  const oldNode=installed.nodes.find(node=>node.name===name);
  const nextNode=template.nodes.find(node=>node.name===name);
  if(!oldNode||!nextNode||name==='Consultar documentos financieros'&&!oldNode.credentials)throw new Error(`Missing credentialed node: ${name}`);
  oldNode.parameters=nextNode.parameters;
}
fs.writeFileSync('/tmp/ceroa-hybrid-updated.json',JSON.stringify([installed]),{mode:0o600});
console.log('Prepared assistant workflow update with existing credential references.');
