// Apply to either a portable template or an exported published workflow.
// Never reconstruct unrelated nodes or replace existing credential associations.
export function extendDocumentQuery(original){
 const w=structuredClone(original),agent=w.nodes.find(n=>n.name==='Analizar finanzas');
 if(!agent)throw Error('Published assistant agent missing');
 if(w.nodes.some(n=>n.id==='agent-observation'))throw Error('Query instrumentation already present');
 agent.parameters.options.returnIntermediateSteps=true;
 agent.parameters.options.maxIterations='={{ Math.min(12, Math.max(2, $("Recibir consulta").first().json.body.executionBudget?.maxIterations ?? 8)) }}';
 agent.parameters.options.systemMessage+='\nPERSISTED DOCUMENT FACTS: For explicit documentary balances, minimum payments, installments or rate comparisons, first use Consultar documentos financieros with FACT_ANALYSIS and the same authorized filters. This retrieves typed source-backed facts and deterministic comparisons without embeddings. Use returned comparisons.delta fact IDs; never subtract in prose. complete=false or PARTIAL requires textual retrieval or a clarification. FACT_ANALYSIS supports one clearly requested field; unsupported layouts and missing values remain unknown. An unlinked obligation, unknown currency/modality, conflicting values, overlapping periods or incomplete pages cannot establish a complete comparison. movementTotals are signed subtotals of verified referenced documentary movements ONLY; they are never all payments or registered Ceroa payments. Do not add balances across periods. Reuse a retrieved result rather than repeat an identical tool call. Selected documents may use FACT_ANALYSIS for the supported field; otherwise HYBRID_SEARCH. No extraction or embedding regeneration during fact queries.';
 const tool=w.nodes.find(n=>n.name==='Consultar documentos financieros');
 tool.parameters.toolDescription+=' FACT_ANALYSIS reads persisted typed evidence and backend differences first for numerical documentary comparisons; on PARTIAL use the existing retrieval path. No writes.';
 tool.parameters.url=tool.parameters.url.replace('One of METADATA_SEARCH,','One of FACT_ANALYSIS, METADATA_SEARCH,');
 const prepare=w.nodes.find(n=>n.name==='Preparar contexto en Spring Boot');
 const originalNext=structuredClone(w.connections[prepare.name].main[0]);
 w.nodes.push({id:'agent-timing-start',name:'Iniciar medición del agente',type:'n8n-nodes-base.set',typeVersion:3.4,position:[1100,-180],parameters:{mode:'raw',jsonOutput:'={{ JSON.stringify({...$json,_agentStartedAt:Date.now()}) }}',options:{}}});
 w.connections[prepare.name].main[0]=[{node:'Iniciar medición del agente',type:'main',index:0}];
 w.connections['Iniciar medición del agente']={main:[originalNext]};
 const next=structuredClone(w.connections[agent.name].main[0]);
 const credentials=prepare.credentials?structuredClone(prepare.credentials):undefined;
 w.nodes.push({id:'agent-observation',name:'Registrar medición sin contenido',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[1650,-180],onError:'continueRegularOutput',...(credentials?{credentials}:{}),parameters:{method:'POST',url:'={{ "http://backend:8080/api/v1/assistant-tools/requests/" + $("Preparar texto").first().json.requestId + "/observe" }}',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({executionId:String($execution.id),agentElapsedMs:Math.max(0,Date.now()-$("Iniciar medición del agente").first().json._agentStartedAt),modelCallsLowerBound:1,iterations:null,toolActions:Array.isArray($json.intermediateSteps)?$json.intermediateSteps.length:null}) }}',options:{timeout:5000}}});
 w.nodes.push({id:'agent-output-restore',name:'Conservar respuesta del agente',type:'n8n-nodes-base.set',typeVersion:3.4,position:[1840,-180],parameters:{mode:'raw',jsonOutput:'={{ JSON.stringify($("Analizar finanzas").first().json) }}',options:{}}});
 w.connections[agent.name].main[0]=[{node:'Registrar medición sin contenido',type:'main',index:0}];
 w.connections['Registrar medición sin contenido']={main:[[{node:'Conservar respuesta del agente',type:'main',index:0}]]};
 w.connections['Conservar respuesta del agente']={main:[next]};
 return w;
}
