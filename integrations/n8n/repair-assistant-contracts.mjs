import {fixDelegationEvidence} from './delegation-evidence.mjs';
// Reconcile required delegation inputs without replacing live credentials or graph nodes.
export function repairAssistantContracts(workflows) {
 for (const w of workflows) {
  if (w.id === 'ceroaHybridQuery20') {
   fixDelegationEvidence(w);
   for (const n of w.nodes.filter(n => n.id?.startsWith('delegate-'))) {
   const inputs=n.parameters.workflowInputs;
   inputs.value={
    requestId:'={{ $("Preparar texto").first().json.requestId }}',
    task:'={{ $fromAI("task","Tarea concreta y mínima para este especialista", "string") }}',
    context:'={{ {currentDate:$now.setZone("America/Bogota").toISODate(),timezone:"America/Bogota",year:$("Preparar texto").first().json.year,month:$("Preparar texto").first().json.month,selectedDocument:$("Preparar texto").first().json.selectedDocument} }}',
    ...inputs.value,
   };
   const schema=inputs.schema??=[];
   for(const [id,type] of [['requestId','string'],['task','string'],['evidenceRefs','array'],['context','object']])
    if(!schema.some(field=>field.id===id))schema.push({id,displayName:id,required:true,defaultMatch:false,display:true,canBeUsedToMatch:true,type});
   }
  }
  const agent=w.nodes.find(n=>n.type.endsWith('.agent'));
  if(!agent||!['ceroaFinancialAgent30','ceroaKnowledgeAgent30'].includes(w.id))continue;
  const instruction=w.id==='ceroaFinancialAgent30'
   ? ' Para evaluar si el presupuesto cubre las cuotas, usa Consultar sobrecapacidad. Explica quality, condition y reason con sus referencias. Si quality es INSUFFICIENT_DATA, indica el dato específico que falta, sin sustituirlo por una abstención sobre conocimiento público. La comparación usa presupuesto asignado a deudas, no ingresos totales.'
   : ' Para una tasa documental conserva exactamente su modalidad respaldada (EA, MV, NAMV u otra); nunca añadas EA por defecto. Si la modalidad no aparece, indica que no está especificada. Cada tasa, fecha y página debe tener su propio marcador y etiqueta en una oración separada. Si hay varios archivos y no se identifica uno, pide seleccionar el extracto en lugar de mezclar sus valores.';
  agent.parameters.options.systemMessage=agent.parameters.options.systemMessage.replace('Tasa: {{fID}}% EA.','Tasa: {{fID}}%.');
  if(!agent.parameters.options.systemMessage.includes(instruction))agent.parameters.options.systemMessage+=instruction;
 }
 return workflows;
}
