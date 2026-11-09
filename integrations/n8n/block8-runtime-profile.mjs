import fs from 'node:fs';
/** Reviewed deployment overlay. Credential associations are bound separately, never exported here. */
export function applyRuntimeProfile(workflow,profile) {
 const w=structuredClone(workflow),p=profile.workflows.find(p=>p.id===w.id);
 if(!p)throw Error('Missing deployment profile');
 w.nodes=w.nodes.filter(n=>!p.removedNodeIds.includes(n.id));
 for(const n of w.nodes)Object.assign(n,structuredClone(p.nodeOverrides[n.id]||{}));
 w.nodes.push(...structuredClone(p.extraNodes));
 if(p.connections)w.connections=structuredClone(p.connections);
 return w;
}
export const readRuntimeProfile=()=>JSON.parse(fs.readFileSync(new URL('./block8-runtime-profile.json',import.meta.url),'utf8'));
