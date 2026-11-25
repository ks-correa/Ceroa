import {fixDelegationEvidence} from './delegation-evidence.mjs';
import {specialistFailureExpression} from './specialist-failure.mjs';
const financialInstructions=' Para el porcentaje de ingresos comprometido en cuotas, consulta summary una sola vez y usa monthlyDebtServicePercent directamente; ya está calculado como porcentaje, no lo multipliques por cien ni dividas saldos por ingresos. Usa la etiqueta Porcentaje de ingresos destinado a cuotas: {{fID}}%. Si debtServiceStatus es INSUFFICIENT_DATA, explica debtServiceReason. Para capacidad usa las etiquetas en oraciones separadas: Presupuesto: {{fID}}. Cuotas exigibles: {{fID}}. Faltante: {{fID}}. No confundas presupuesto con ingresos ni déficit con saldo. Antes de simular un abono adicional, el usuario debe identificar la deuda y confirmar que es un abono único en el primer período. Si falta alguno, pregunta y devuelve requiresClarification=true, status PARTIAL y coverage PARTIAL; no elijas una deuda, no asumas periodicidad y no llames al simulador todavía. Si el simulador devuelve NEEDS_CLARIFICATION, transmite reason sin reintentar la misma llamada. Comparar las estrategias guardadas no calcula el ahorro de un nuevo abono. Reutiliza la evidencia disponible y reserva una iteración para tu respuesta final.';
function financialPrompt(text){
 return text.replace(/Cuando la pregunta pide cuánto ahorraría,[\s\S]*?Para cualquier cifra/,'Para comparar las estrategias registradas sin nuevos abonos, consulta comparison. Para calcular el ahorro de un abono adicional usa el simulador autorizado con los supuestos explícitos del usuario. Para cualquier cifra');
}
// Reconcile required delegation inputs without replacing live credentials or graph nodes.
export function repairAssistantContracts(workflows) {
 for (const w of workflows) {
  if(['ceroaFinancialAgent30','ceroaKnowledgeAgent30','ceroaSupportAgent30'].includes(w.id)){
   const failure=w.nodes.find(n=>n.id==='fail');
   if(failure)failure.parameters.jsonBody=specialistFailureExpression;
  }
  if (w.id === 'ceroaHybridQuery20') {
   fixDelegationEvidence(w);
   for (const n of w.nodes.filter(n => n.id?.startsWith('delegate-'))) {
   if(n.id==='delegate-FINANCIAL'){
    n.parameters.description=financialPrompt(n.parameters.description);
    if(!n.parameters.description.includes(financialInstructions))n.parameters.description+=financialInstructions;
   }
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
  if(w.id==='ceroaFinancialAgent30'){
   agent.parameters.options.systemMessage=financialPrompt(agent.parameters.options.systemMessage);
   if(!agent.parameters.options.systemMessage.includes(financialInstructions))agent.parameters.options.systemMessage+=financialInstructions;
  }
 }
 return workflows;
}
