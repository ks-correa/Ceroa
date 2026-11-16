import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
export const repo=path.resolve(import.meta.dirname,'../..');
export const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
export const run=(cmd,argv,extra={})=>{const r=spawnSync(cmd,argv,{cwd:repo,encoding:'utf8',maxBuffer:64e6,...extra});if(r.status!==0){const dir=path.join(os.homedir(),'.local/share/ceroa-private');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'transfer-error.log'),(r.stdout??'')+(r.stderr??''),{mode:0o600});throw Error('Command failed: '+cmd+' '+argv[0]+'; inspect private transfer-error.log');}return r.stdout;};
export const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function outside(file){const absolute=path.resolve(file),relative=path.relative(repo,absolute);if(!relative||!relative.startsWith('..')&&!path.isAbsolute(relative))throw Error('Private output must be outside Git checkout');return absolute;}
export const stage=()=>fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-transfer-'));
export function cleanup(dir){if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('ceroa-transfer-'))throw Error('Unsafe stage');fs.rmSync(dir,{recursive:true,force:true});}
export function safeTar(file){for(const e of run('tar',['-tzf',file]).split(/\r?\n/)){if(e.startsWith('/')||/^[A-Za-z]:/.test(e)||e.replaceAll('\\','/').split('/').includes('..'))throw Error('Unsafe archive');}const listing=run('tar',['-tvzf',file]);if(listing.split(/\r?\n/).some(l=>/^[lh]/.test(l)))throw Error('Archive links not allowed');}
