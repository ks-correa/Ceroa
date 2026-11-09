// Offline recovery verification. The caller must use --network none and a disposable container.
const fs=require('fs'),assert=require('assert/strict'),{DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('/tmp/recovery/.n8n/database.sqlite');
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
const workflows=db.prepare('SELECT id,active,activeVersionId,nodes FROM workflow_entity').all();
assert.equal(workflows.length,30);assert.equal(workflows.filter(w=>w.active).length,15);
const versions=new Set(db.prepare('SELECT versionId FROM workflow_history').all().map(v=>v.versionId));
for(const w of workflows)if(w.activeVersionId)assert(versions.has(w.activeVersionId));
const credentialIds=new Set(db.prepare('SELECT id FROM credentials_entity').all().map(c=>c.id));
for(const w of workflows)for(const n of JSON.parse(w.nodes))for(const c of Object.values(n.credentials||{}))assert(credentialIds.has(c.id));
// Preserve the original activation manifest separately. Quarantine BEFORE any CLI/start.
fs.writeFileSync('/tmp/activation-manifest.json',JSON.stringify(workflows.map(({id,active,activeVersionId})=>({id,active,activeVersionId}))));
db.exec('BEGIN; UPDATE workflow_entity SET active=0,activeVersionId=NULL; DELETE FROM webhook_entity; COMMIT;');
assert.equal(db.prepare('SELECT count(*) n FROM workflow_entity WHERE active=1 OR activeVersionId IS NOT NULL').get().n,0);
assert.equal(db.prepare('SELECT count(*) n FROM webhook_entity').get().n,0);
db.close();
console.log(JSON.stringify({offlineRestore:'PASS',workflows:workflows.length,originalActive:15,quarantinedActive:0,webhooks:0,credentialReferences:'PRESERVED',publicationManifest:'PRESERVED_SEPARATELY',productionMutation:false}));
