// Patch only verified integration defects in authoritative exported workflows.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export function patchBlock5(workflows){
 const selected=[];
 for(const [id,role] of Object.entries({ceroaFinancialAgent30:'FINANCIAL',ceroaKnowledgeAgent30:'RAG',ceroaSupportAgent30:'SUPPORT'})){
  const w=structuredClone(workflows.find(w=>w.id===id));assert(w,'Missing existing specialist');
  const parser=w.nodes.find(n=>n.type.endsWith('.outputParserStructured'));assert(parser);
  const schema=JSON.parse(parser.parameters.inputSchema);
  schema.properties.schemaVersion={type:'string',pattern:'^1[.]1$'};
  schema.properties.role={type:'string',pattern:'^'+role+'$'};
  if(schema.properties.advisoryProposal)schema.properties.advisoryProposal.oneOf.find(v=>v.type==='object').properties.status={type:'string',pattern:'^PROPOSED$'};
  parser.parameters.inputSchema=JSON.stringify(schema);
  const a=w.nodes.find(n=>n.type.endsWith('.agent'));assert(a);
  a.parameters.options.systemMessage=a.parameters.options.systemMessage.replace('sources contiene únicamente claves dID recuperadas.','sources contiene únicamente claves dID recuperadas de conocimiento público, como d1. Las rutas source de facts son procedencia interna, nunca claves sources: para evidencia financiera privada devuelve sources=[] y conserva solo los fID en evidenceRefs.');
  if(!a.parameters.options.systemMessage.includes('nunca un objeto vacío'))a.parameters.options.systemMessage+=' Cuando no hay propuesta de asesoría, advisoryProposal debe ser null, nunca un objeto vacío. evidenceRefs incluye únicamente fID realmente entregados: si solo recuperaste conocimiento público, evidenceRefs=[] y sources contiene sus dID. No inventes marcadores para texto documental.';
  selected.push(w);
 }
 const drive=structuredClone(workflows.find(w=>w.id==='ceroaWorkspaceDrive40'));assert(drive&&!drive.active,'Drive must remain inactive');
 const validate=drive.nodes.find(n=>n.id==='validate');assert(validate?.parameters.jsonBody.includes('size:Number($json.size)'));
 validate.parameters.jsonBody=validate.parameters.jsonBody.replace('size:Number($json.size)}})','size:Number($json.size)} })');selected.push(drive);
 return selected;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,out]=process.argv.slice(2);assert(input&&out);fs.mkdirSync(out,{recursive:true});
 for(const w of patchBlock5(JSON.parse(fs.readFileSync(input))))fs.writeFileSync(path.join(out,w.id+'.json'),JSON.stringify(w,null,2),{mode:0o600});
}
