// Run inside the installed n8n container. All database access is read-only.
// stdout contains hashes and structural metadata, never node parameters or secrets.
const {DatabaseSync}=require('node:sqlite');
const {createHash}=require('node:crypto');
const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const parse=(v,fallback)=>v?JSON.parse(v):fallback;
db.exec('BEGIN');
try {
 const rows=db.prepare('SELECT * FROM workflow_entity ORDER BY id').all();
 const credentials=new Set(db.prepare('SELECT id FROM credentials_entity').all().map(c=>c.id));
 const ids=new Set(rows.map(w=>w.id));
 const workflows=rows.map(w=>{
  const published=w.activeVersionId?db.prepare('SELECT nodes,connections FROM workflow_history WHERE versionId=? AND workflowId=?').get(w.activeVersionId,w.id):null;
  const nodes=parse(w.nodes,[]),connections=parse(w.connections,{});
  const links=nodes.flatMap(n=>n.parameters?.workflowId?[typeof n.parameters.workflowId==='object'?n.parameters.workflowId.value:n.parameters.workflowId]:[]);
  const credentialRefs=nodes.flatMap(n=>Object.values(n.credentials||{}).map(c=>c.id));
  return {id:w.id,name:w.name,active:!!w.active,published:!!published,versionId:w.versionId,activeVersionId:w.activeVersionId,
   draftDiffersFromPublished:!!published&&(hash(nodes)!==hash(parse(published.nodes,[]))||hash(connections)!==hash(parse(published.connections,{}))),
   nodesHash:hash(nodes),connectionsHash:hash(connections),settingsHash:hash(parse(w.settings,{})),
   registeredWebhooks:db.prepare('SELECT count(*) count FROM webhook_entity WHERE workflowId=?').get(w.id).count,
   subworkflows:links.map(id=>({id,exists:ids.has(id),dynamic:typeof id==='string'&&id.startsWith('=')})),
   credentialReferences:credentialRefs.length,missingCredentialReferences:credentialRefs.filter(id=>!credentials.has(id)).length,
   triggers:nodes.filter(n=>/webhook|trigger|schedule/i.test(n.type)).map(n=>({type:n.type,disabled:!!n.disabled,eligibleWhenPublished:!!w.active&&!n.disabled}))};
 });
 console.log(JSON.stringify({capturedAt:new Date().toISOString(),total:rows.length,active:rows.filter(w=>w.active).length,
  published:workflows.filter(w=>w.published).length,inactive:rows.filter(w=>!w.active).length,
  unpublished:workflows.filter(w=>!w.published).length,credentials:credentials.size,workflows},null,2));
} finally {db.exec('ROLLBACK');db.close();}
