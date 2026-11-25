import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {repairAssistantContracts} from './repair-assistant-contracts.mjs';
test('restores lost ATLAS request/task/context and preserves evidence, credentials and graph',()=>{
 const w=JSON.parse(fs.readFileSync(new URL('./workflows/ceroaHybridQuery20.json',import.meta.url)));
 const n=w.nodes.find(n=>n.id==='delegate-FINANCIAL');
 const evidence=n.parameters.workflowInputs.value.evidenceRefs;
 n.parameters.workflowInputs.value={evidenceRefs:evidence};
 n.parameters.workflowInputs.schema=[];
 const before=structuredClone(w);repairAssistantContracts([w]);
 for(const key of ['requestId','task','context','evidenceRefs'])assert(w.nodes.find(n=>n.id==='delegate-FINANCIAL').parameters.workflowInputs.value[key]);
 assert.equal(n.parameters.workflowInputs.value.evidenceRefs,evidence);
 assert.deepEqual(n.parameters.workflowInputs.schema.map(s=>s.id),['requestId','task','evidenceRefs','context']);
 assert.deepEqual(w.connections,before.connections);assert.deepEqual(n.credentials,before.nodes.find(old=>old.id===n.id)?.credentials);
 assert.deepEqual(repairAssistantContracts([structuredClone(w)]),[w]);
});
