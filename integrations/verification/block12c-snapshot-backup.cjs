const fs=require('fs'),cp=require('child_process');
const args=['-d','Ubuntu','-u','root','--','docker','run','--rm','--pull','never','--log-driver','none','--memory','256m','--memory-swap','256m','-i','--env-file','/mnt/ceroa12c-private/block12c/source.env','pgvector/pgvector:pg17','psql','-X','-qAt','-v','ON_ERROR_STOP=1'];
const h=cp.spawn('wsl',args,{stdio:['pipe','pipe','pipe']});let started=false,buffer='';h.stderr.on('data',()=>{});let timer=setTimeout(()=>{h.kill();process.exitCode=1;console.log('SNAPSHOT_HOLDER_TIMEOUT');},180000);
h.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n');
h.stdout.on('data',chunk=>{buffer+=chunk.toString();const snapshot=buffer.trim();if(started||!/^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$/.test(snapshot))return;started=true;
const script=`set -e
base=/mnt/ceroa12c-private/block12c
sed "1a SET TRANSACTION SNAPSHOT '${snapshot}';" "$base/fingerprints.sql" > "$base/snapshot-fingerprints.sql"
sed "1a SET TRANSACTION SNAPSHOT '${snapshot}';" "$base/supplement.sql" > "$base/snapshot-inventory.sql"
docker run --rm --pull never --log-driver none --memory 512m --memory-swap 512m --env-file "$base/source.env" --mount type=bind,src=/mnt/ceroa12c-private,dst=/private --entrypoint sh pgvector/pgvector:pg17 -c 'pg_dump --snapshot=${snapshot} --format=custom --file=/private/block12c/source-snapshot.dump > /private/block12c/snapshot-dump.stdout 2>/private/block12c/snapshot-dump.stderr; result=$?; test $result = 0 || exit $result; psql -X -qAt -v ON_ERROR_STOP=1 < /private/block12c/snapshot-fingerprints.sql > /private/block12c/snapshot-fingerprints.jsonl 2>/private/block12c/snapshot-fingerprints.stderr; result=$?; test $result = 0 || exit $result; psql -X -qAt -v ON_ERROR_STOP=1 < /private/block12c/snapshot-inventory.sql > /private/block12c/snapshot-inventory.json 2>/private/block12c/snapshot-inventory.stderr'
echo SNAPSHOT_DUMP_AND_FINGERPRINTS_SUCCEEDED
`;
const task=cp.spawn('wsl',['-d','Ubuntu','-u','root','--','bash','-s'],{stdio:['pipe','pipe','pipe']});task.stdout.on('data',x=>process.stdout.write(x));task.stderr.on('data',()=>{});task.stdin.end(script);task.on('close',status=>{h.stdin.end('ROLLBACK;\n\\q\n');clearTimeout(timer);console.log(JSON.stringify({snapshotSharedAcrossDatabaseExports:status===0,sourceReadOnly:true,exitCode:status}));process.exitCode=status;});});

