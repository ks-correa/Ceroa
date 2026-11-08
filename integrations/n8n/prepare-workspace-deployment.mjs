import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {extendWorkspaceAgents} from './extend-workspace-agents.mjs';
import {mailWorkflow,sheetsWorkflow} from './workspace-workflows.mjs';import {driveWorkflow} from './workspace-drive.mjs';import {calendarWorkflow} from './workspace-calendar.mjs';import {mcpServerWorkflow,mcpBackendWorkflow,mcpClientWorkflow,scopedMcpClientWorkflow} from './workspace-mcp.mjs';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Published export and private output directory required');
const published=JSON.parse(fs.readFileSync(input,'utf8'));const ids=['ceroaHybridQuery20','ceroaFinancialAgent30','ceroaSupportAgent30'];
const originals=ids.map(id=>{const w=published.find(w=>w.id===id);assert(w,'Existing specialist missing');assert(w.nodes.some(n=>n.type==='@n8n/n8n-nodes-langchain.agent'));return structuredClone(w);});
const updated=extendWorkspaceAgents(originals);const support=updated.find(w=>w.id==='ceroaSupportAgent30');
// User omitted external test resources. Install the client wrapper as a draft;
// do not advertise an unconfigured external connection in the live specialist.
support.nodes=support.nodes.filter(n=>n.id!=='mcp-public');delete support.connections['Consultar capacidad externa MCP'];
const additions=[mailWorkflow(),sheetsWorkflow(),driveWorkflow(),calendarWorkflow(),mcpServerWorkflow(),mcpBackendWorkflow(),mcpClientWorkflow(),scopedMcpClientWorkflow()];
fs.mkdirSync(out,{recursive:true});
for(const w of [...updated,...additions]){assert(!w.nodes.some(n=>n.id?.startsWith('workspace-')&&n.type.endsWith('.code')));fs.writeFileSync(path.join(out,w.id+'.json'),JSON.stringify(w,null,2)+'\n');}
console.log(JSON.stringify({updated:ids,inactiveUnconfigured:additions.map(w=>w.id),externalMcpAdvertised:false}));
