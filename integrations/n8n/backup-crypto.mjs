import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,pbkdf2Sync,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';

// Standalone portable encryption for an explicitly authorized local credential backup.
// Usage: node backup-crypto.mjs encrypt|encrypt-existing|decrypt INPUT OUTPUT KEY_FILE
const [action,input,output,keyPath]=process.argv.slice(2);
const magic=Buffer.from('CEROA_BACKUP_V1\n');
const derive=(password,salt)=>pbkdf2Sync(password,salt,600000,32,'sha256');
function open(bytes,password){
  if(bytes.length<magic.length+44||!bytes.subarray(0,magic.length).equals(magic))throw Error('Invalid backup');
  let offset=magic.length;const salt=bytes.subarray(offset,offset+=16),iv=bytes.subarray(offset,offset+=12),tag=bytes.subarray(offset,offset+=16);
  const decipher=createDecipheriv('aes-256-gcm',derive(password,salt),iv);decipher.setAAD(magic);decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(bytes.subarray(offset)),decipher.final()]);
}
try {
  if(!['encrypt','encrypt-existing','decrypt'].includes(action)||!input||!output||!keyPath)throw Error('Invalid arguments');
  const bytes=await readFile(input);
  if(action!=='decrypt'){
    const password=action==='encrypt-existing'?(await readFile(keyPath,'utf8')).trim():randomBytes(32).toString('base64url'),salt=randomBytes(16),iv=randomBytes(12);
    if(password.length<32)throw Error('Invalid key');
    const cipher=createCipheriv('aes-256-gcm',derive(password,salt),iv);cipher.setAAD(magic);
    const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);const sealed=Buffer.concat([magic,salt,iv,cipher.getAuthTag(),ciphertext]);
    // Verify authenticated round trip before creating the transfer artifact.
    if(!timingSafeEqual(open(sealed,password),bytes))throw Error('Verification failed');
    if(action==='encrypt')await writeFile(keyPath,password+'\n',{flag:'wx',mode:0o600});await writeFile(output,sealed,{flag:'wx',mode:0o600});
    console.log('Encrypted backup created and verified. Key stored in the requested private file. No credentials printed.');
  }else{
    const password=(await readFile(keyPath,'utf8')).trim();const clear=open(bytes,password);
    await writeFile(output,clear,{flag:'wx',mode:0o600});console.log('Backup decrypted and authenticated. Extract the ZIP locally.');
  }
}catch{console.error('Backup operation failed. Check arguments, key and destination; no secrets printed.');process.exitCode=1;}
