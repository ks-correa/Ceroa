const fs=require('fs'),assert=require('assert/strict');const raw=fs.readFileSync('/tmp/query.log','utf8');const execution=JSON.parse(raw.slice(raw.indexOf('{\n  "data":')));
assert.equal(execution.status,'success');const data=execution.data.resultData.runData;
assert(data['Registrar medición sin contenido']);assert(data['Revisar borrador con evidencia']);
assert.equal(data['Conservar respuesta del agente'][0].data.main[0][0].json.output.answer,'Valor {{f1}}.');
assert.equal(data['Devolver respuesta'][0].data.main[0][0].json.answer,'Valor {{f1}}.');
assert(!data['Gemini Ceroa']);console.log('PASS: native query pipeline preserves validated answer after telemetry failure; providers were fixtures.');
