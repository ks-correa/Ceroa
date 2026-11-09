#!/bin/sh
set -eu
mkdir -p /tmp/recovery/.n8n
tar -xzf /fixtures/recovery.tar.gz -C /tmp/recovery/.n8n
node /fixtures/check.cjs
export N8N_USER_FOLDER=/tmp/recovery
n8n export:credentials --all --decrypted --output=/tmp/recovered-credentials.json >/tmp/recovery-cli.log 2>&1
node -e 'const fs=require("fs"),assert=require("assert/strict"),{DatabaseSync}=require("node:sqlite");const d=new DatabaseSync("/tmp/recovery/.n8n/database.sqlite",{readOnly:true});const rows=JSON.parse(fs.readFileSync("/tmp/recovered-credentials.json"));assert.equal(rows.length,d.prepare("SELECT count(*) n FROM credentials_entity").get().n);assert(rows.every(c=>typeof c.data==="object"));console.log(JSON.stringify({credentialDecryption:"PASS",credentials:rows.length,externalNetwork:false,n8nStarted:false}));'
