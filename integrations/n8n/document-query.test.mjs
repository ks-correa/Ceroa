import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {extendDocumentQuery} from './extend-document-query.mjs';
const workflow=()=>readFile(new URL('hybrid-rag-query.json',import.meta.url),'utf8').then(JSON.parse);
test('iteration budget is server-bound and clamped; telemetry contains no model content',async()=>{
 const w=await workflow(),agent=w.nodes.find(n=>n.name==='Analizar finanzas');
 const evaluate=(expression,$)=>new Function('$',`return (${expression.slice(3,-2)});`)($);
 for(const [budget,expected] of [[4,4],[10,10],[99,12],[-1,2],[undefined,8]])assert.equal(evaluate(agent.parameters.options.maxIterations,()=>({first:()=>({json:{body:{executionBudget:{maxIterations:budget}}}})})),expected);
 const n=w.nodes.find(n=>n.id==='agent-observation');assert.equal(n.onError,'continueRegularOutput');
 const body=JSON.parse(new Function('$execution','$json','$',`return (${n.parameters.jsonBody.slice(3,-2)});`)({id:123},{intermediateSteps:[{secret:'untrusted text'}]},()=>({first:()=>({json:{_agentStartedAt:Date.now()-1}})})));
 assert.equal(body.modelCallsLowerBound,1);assert.equal(body.iterations,null);assert.equal(body.toolActions,1);assert.ok(!JSON.stringify(body).includes('untrusted'));
});
test('telemetry failure cannot replace the final answer or bypass evidence validation',async()=>{
 const w=await workflow();assert.equal(w.connections['Analizar finanzas'].main[0][0].node,'Registrar medición sin contenido');
 assert.equal(w.connections['Conservar respuesta del agente'].main[0][0].node,'Validar respuesta');
 const restore=w.nodes.find(n=>n.id==='agent-output-restore').parameters.jsonOutput;
 const output={output:{answer:'{{f1}}',mode:'personal',sources:[]}};
 assert.deepEqual(JSON.parse(new Function('$',`return (${restore.slice(3,-2)});`)(()=>({first:()=>({json:output})}))),output);
 assert.equal(w.connections['Validar respuesta'].main[0][0].node,'Revisar borrador con evidencia');
});
test('extension preserves credentials, unrelated nodes and failure branches',async()=>{
 const w=await workflow();const names=new Set(['agent-timing-start','agent-observation','agent-output-restore']);
 const baseline=structuredClone(w);baseline.nodes=baseline.nodes.filter(n=>!names.has(n.id));
 const prepare=baseline.nodes.find(n=>n.name==='Preparar contexto en Spring Boot');prepare.credentials={httpHeaderAuth:{id:'synthetic-worker'}};
 baseline.connections[prepare.name].main[0]=[{node:'Analizar finanzas',type:'main',index:0}];
 baseline.connections['Analizar finanzas'].main[0]=[{node:'Validar respuesta',type:'main',index:0}];
 for(const name of ['Iniciar medición del agente','Registrar medición sin contenido','Conservar respuesta del agente'])delete baseline.connections[name];
 const extended=extendDocumentQuery(baseline);
 for(const n of baseline.nodes.filter(n=>!['Analizar finanzas','Consultar documentos financieros'].includes(n.name)))assert.deepEqual(extended.nodes.find(v=>v.id===n.id),n);
 assert.deepEqual(extended.nodes.find(n=>n.id==='agent-observation').credentials,prepare.credentials);
 assert.deepEqual(extended.connections['Analizar finanzas'].main[1],baseline.connections['Analizar finanzas'].main[1]);
});
