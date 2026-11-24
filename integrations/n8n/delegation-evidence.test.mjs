import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {delegationEvidenceExpression,fixDelegationEvidence} from './delegation-evidence.mjs';
const evaluate=new Function('$fromAI','$','return '+delegationEvidenceExpression.slice(3,-2));
const selected='f4901971-2349-43d7-b6ed-e14983479c89';
test('selected document UUID cannot be sent as evidence; genuine references survive',()=>{
 const context=()=>({first:()=>({json:{selectedDocument:{id:selected}}})});
 assert.deepEqual(evaluate(()=>selected,context),[]);
 assert.deepEqual(evaluate(()=>` f1, ${selected}, d1 `,context),['f1','d1']);
 assert.deepEqual(evaluate(()=>'',context),[]);
});
test('unselected and unrecognized references remain subject to backend authorization',()=>{
 assert.deepEqual(evaluate(()=>'f99,foreign-id',()=>({first:()=>({json:{}})})),['f99','foreign-id']);
});
test('exported NEXUS includes the fix on every delegation without changing graph',()=>{
 const w=JSON.parse(fs.readFileSync(new URL('./workflows/ceroaHybridQuery20.json',import.meta.url)));
 for(const n of w.nodes.filter(n=>n.id.startsWith('delegate-')))assert.equal(n.parameters.workflowInputs.value.evidenceRefs,delegationEvidenceExpression);
 assert.deepEqual(fixDelegationEvidence(structuredClone(w)),w);
});
