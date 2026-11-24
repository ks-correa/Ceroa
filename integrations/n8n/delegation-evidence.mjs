// Document selection already travels in context. A document UUID is not an
// issued evidence reference; preserve all other values for backend validation.
export const delegationEvidenceExpression='={{ $fromAI("evidenceRefs","Authorized fID or dID evidence keys separated by commas; never a document UUID; empty string when absent", "string", "").split(",").map(x=>x.trim()).filter(x=>x && x !== $("Preparar texto").first().json.selectedDocument?.id) }}';
export const delegationEvidenceInstruction=' El ID de selectedDocument identifica el archivo y solo viaja en context; nunca lo incluyas en evidenceRefs. evidenceRefs contiene exclusivamente claves fID o dID emitidas como evidencia; antes de recuperar evidencia del documento, utiliza una lista vacía.';
export function fixDelegationEvidence(workflow){
 for(const node of workflow.nodes){
  if(node.id?.startsWith('delegate-'))node.parameters.workflowInputs.value.evidenceRefs=delegationEvidenceExpression;
  if(node.id==='agent'||node.name==='NEXUS'||node.name==='Analizar finanzas'){
   const options=node.parameters?.options;
   if(options?.systemMessage&&!options.systemMessage.includes(delegationEvidenceInstruction))options.systemMessage+=delegationEvidenceInstruction;
  }
 }
 return workflow;
}
