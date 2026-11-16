import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyRuntimeProfile,readRuntimeProfile} from './block8-runtime-profile.mjs';
test('deployment profile preserves specialist security contracts and keeps unconfigured MCP absent',()=>{
 const profile=readRuntimeProfile();assert.equal(profile.workflows.length,4);
 for(const file of ['testing/fixtures/financial-agent.json','testing/fixtures/knowledge-agent.json','testing/fixtures/support-agent.json','testing/fixtures/multiagent-query.json']) {
  const original=JSON.parse(fs.readFileSync(new URL(file,import.meta.url)));const before=structuredClone(original);
  const w=applyRuntimeProfile(original,profile);assert.deepEqual(original,before);
  assert.equal(w.nodes.filter(n=>n.type.endsWith('.agent')).length,1);
  assert.equal(w.nodes.find(n=>n.type.endsWith('.agent')).parameters.options.systemMessage,original.nodes.find(n=>n.type.endsWith('.agent')).parameters.options.systemMessage);
  if(file==='testing/fixtures/support-agent.json')assert(!w.nodes.some(n=>n.id==='mcp-public'));
  if(file==='testing/fixtures/multiagent-query.json') {
   assert.equal(w.nodes.find(n=>n.id==='supabase-config').type,'n8n-nodes-base.supabase');
   assert(w.nodes.some(n=>n.id==='failure-supabase-check'));assert.equal(w.nodes.filter(n=>n.type.endsWith('.toolWorkflow')).length,3);
  }
 }
 assert(!JSON.stringify(profile).includes('"credentials"'));
});
