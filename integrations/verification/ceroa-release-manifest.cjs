// Read-only release provenance. Never includes local environments, credentials or binaries.
const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const paths = [...new Set(cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean))]
  .filter(path => /^(backend\/(src\/|\.mvn\/|pom\.xml$|mvnw|Dockerfile$|\.dockerignore$)|frontend\/(src\/|public\/|package(?:-lock)?\.json$|.*config\.[^/]+$|index\.html$|Dockerfile$)|integrations\/(n8n\/|demo\/|verification\/)|docker-compose[^/]*\.yml$|\.gitattributes$|\.gitignore$)/.test(path))
  .filter(path => fs.existsSync(path) && fs.statSync(path).isFile()).sort();
const files = paths.map(path => {
  const bytes = fs.readFileSync(path);
  return {path, sha256:hash(bytes), lfSha256:hash(bytes.toString('utf8').replace(/\r\n/g,'\n'))};
});
const output = {procedure:'Sorted paths; SHA256(path + space + file SHA256 + LF). Raw and LF-normalized hashes are separate.',
  sha256:hash(files.map(x => `${x.path} ${x.sha256}\n`).join('')),
  lfSha256:hash(files.map(x => `${x.path} ${x.lfSha256}\n`).join('')), files};
fs.writeFileSync(process.argv[2] || 'tmp/codex-release/release-manifest.json', JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({files:files.length,sha256:output.sha256,lfSha256:output.lfSha256}));
