// Keep channel triggers separate from the single worker that owns job leases.
export function shareDocumentProcessor(ingestion, sync) {
  const copy = value => structuredClone(value);
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const normalized=w=>{
    const result=copy(w);
    for(const n of result.nodes){
      delete n.position;
      if(n.type==='@n8n/n8n-nodes-langchain.chainLlm')for(const message of n.parameters.messages?.messageValues??[])message.type??='SystemMessagePromptTemplate';
      if(n.type==='@n8n/n8n-nodes-langchain.outputParserStructured')n.parameters.autoFix??=false;
      if(n.type==='n8n-nodes-base.supabase')n.parameters.returnAll??=false;
    }
    return result;
  };
  const body = original => {const w=normalized(original);return canonical({nodes:w.nodes.filter(n=>n.id!=='entry'),connections:Object.fromEntries(Object.entries(w.connections).filter(([name])=>name!==w.nodes.find(n=>n.id==='entry').name))});};
  if(JSON.stringify(body(ingestion))!==JSON.stringify(body(sync)))throw Error('Document workers differ; reconcile before extracting');
  const worker=copy(ingestion);
  worker.id='ceroaDocumentProcessor22';worker.name='Ceroa - Biblioteca - Procesador compartido';worker.active=false;
  const entry=worker.nodes.find(n=>n.id==='entry');
  const oldName=entry.name;
  Object.assign(entry,{name:'Procesar cola autorizada',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1.1,parameters:{inputSource:'passthrough'}});
  delete entry.webhookId;delete entry.credentials;
  worker.connections[entry.name]=worker.connections[oldName];delete worker.connections[oldName];
  const adapters=[ingestion,sync].map(original=>{
    const w=copy(original),trigger=w.nodes.find(n=>n.id==='entry');
    w.nodes=[trigger,{id:'process-queue',name:'Ejecutar procesador compartido',type:'n8n-nodes-base.executeWorkflow',typeVersion:1.3,position:[300,0],parameters:{source:'database',workflowId:{__rl:true,value:worker.id,mode:'id'},mode:'once',options:{waitForSubWorkflow:true}}}];
    w.connections={[trigger.name]:{main:[[{node:'Ejecutar procesador compartido',type:'main',index:0}]]}};
    w.active=false;return w;
  });
  return {worker,adapters};
}
