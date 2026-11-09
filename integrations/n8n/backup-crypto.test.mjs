import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('./backup-crypto.mjs',import.meta.url));
test('backup authenticates round trip, rejects tampering and a different key without plaintext output',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-backup-test-'));
 const file=name=>path.join(directory,name);
 const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',windowsHide:true});
 try {
  const content=Buffer.from('synthetic secret fixture only');fs.writeFileSync(file('input'),content);
  assert.equal(run('encrypt',file('input'),file('sealed'),file('key')).status,0);
  assert.equal(run('decrypt',file('sealed'),file('plain'),file('key')).status,0);
  assert.deepEqual(fs.readFileSync(file('plain')),content);
  const corrupt=fs.readFileSync(file('sealed'));corrupt[corrupt.length-1]^=1;fs.writeFileSync(file('tampered'),corrupt);
  assert.equal(run('decrypt',file('tampered'),file('never-created'),file('key')).status,1);
  assert.equal(fs.existsSync(file('never-created')),false);
  fs.writeFileSync(file('other-key'),'x'.repeat(43));
  assert.equal(run('decrypt',file('sealed'),file('wrong-key-output'),file('other-key')).status,1);
  assert.equal(fs.existsSync(file('wrong-key-output')),false);
 } finally {
  const resolved=path.resolve(directory),temporary=path.resolve(os.tmpdir())+path.sep;
  assert(resolved.startsWith(temporary)&&path.basename(resolved).startsWith('ceroa-backup-test-'));
  fs.rmSync(resolved,{recursive:true,force:true});
 }
});
