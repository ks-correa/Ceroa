const names={ceroaHybridQuery20:['NEXUS','Supervisor & Router'],ceroaFinancialAgent30:['ATLAS','Financial Intelligence'],ceroaKnowledgeAgent30:['ORACLE','Knowledge & RAG'],ceroaSupportAgent30:['LUMEN','Customer Experience & Support']};
const rename={'Analizar finanzas':'NEXUS','Agente Financiero':'ATLAS','Agente Conocimiento y RAG':'ORACLE','Agente Soporte':'LUMEN','Delegar a Financiero':'Delegar a ATLAS','Delegar a Conocimiento y RAG':'Delegar a ORACLE','Delegar a Soporte':'Delegar a LUMEN'};
// Rewrite keys, connection targets and expressions together, after all legacy extensions.
// Internal roles, IDs, endpoints and runtime settings remain untouched.
export function identifyCeroa(workflows){
 return workflows.map(source=>{
  const identity=names[source.id];if(!identity)return structuredClone(source);
  const walk=v=>typeof v==='string'?Object.entries(rename).reduce((s,[from,to])=>s.replaceAll(from,to),v):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[Object.entries(rename).reduce((s,[from,to])=>s.replaceAll(from,to),k),walk(x)])):v;
  const w=walk(source);w.name=`CEROA AI | ${identity[0]} — ${identity[1]}`;
  const agent=w.nodes.find(n=>n.type.endsWith('.agent'));agent.notes=`${identity[0]} — ${identity[1]}. Alcances y evidencia autorizados por AEGIS en Spring Boot.`;agent.notesInFlow=true;
  const sections=[['entry','Entrada y autenticación','Contexto autorizado por Spring Boot; no agregar memoria compartida.',-120,-480,580],['agent',identity.join(' — '),'Agente nativo, Gemini y contrato estructurado. Solo herramientas del dominio.',520,-480,700],['governance','AEGIS — Seguridad y gobernanza','Validación determinista de identidad, alcance, evidencia y resultados. HITL fuera del LLM.',1300,-480,650],['result','Validación, errores y respuesta final','Resultado validado o fallo recuperable; conservar requestId y cobertura.',2050,-480,650]];
  if(identity[0]==='LUMEN')sections.push(['chronos','CHRONOS — Integraciones externas','Calendar/Meet: gateway REST y nodos Calendar. MCP: frontera separada y controlada. Propuesta no equivale a confirmación.',700,760,1000]);
  for(const [id,title,body,x,y,width] of sections)if(!w.nodes.some(n=>n.id==='ceroa-identity-'+id))w.nodes.push({id:'ceroa-identity-'+id,name:'CEROA AI · '+title,type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[x,y],parameters:{content:`## ${title}\n${body}`,height:180,width,color:5}});
  return w;
 });
}
