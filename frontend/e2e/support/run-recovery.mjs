// Local-only SMTP fixture and real backend runner. No external email delivery is claimed.
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
const messages = [];
const smtp = net.createServer(socket => {
  socket.write('220 localhost EP03 test SMTP\r\n');
  let buffer = '', data = false, recipient = '', lines = [];
  socket.on('error', () => {});
  socket.on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === '.') { messages.push({ recipient, content: lines.join('\n') }); lines = []; data = false; socket.write('250 accepted\r\n'); }
        else lines.push(line);
      } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n');
      else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)?.[1] || ''; socket.write('250 recipient\r\n'); }
      else if (line === 'DATA') { data = true; socket.write('354 end with dot\r\n'); }
      else if (line === 'QUIT') { socket.end('221 bye\r\n'); }
      else socket.write('250 ok\r\n');
    }
  });
});
const inbox = http.createServer((request, response) => {
  const email = new URL(request.url, 'http://127.0.0.1').searchParams.get('email');
  const message = messages.filter(item => item.recipient === email).at(-1);
  response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify({ code: message?.content.match(/\b[0-9]{8}\b/)?.[0] || null }));
});
await new Promise(resolve => smtp.listen(18084, '127.0.0.1', resolve));
await new Promise(resolve => inbox.listen(18085, '127.0.0.1', resolve));
const log = createWriteStream(fileURLToPath(new URL('../../../backend/ep03-e2e.log', import.meta.url)));
const backend = spawn('java', ['-jar', fileURLToPath(new URL('../../../backend/target/ceroa-backend-0.1.0-SNAPSHOT.jar', import.meta.url))], {
  windowsHide: true,
  env: { ...process.env, SERVER_PORT: '18083', FRONTEND_URL: 'http://localhost:3000',
    DB_URL: process.env.PG_TEST_URL || 'jdbc:postgresql://127.0.0.1:55432/ceroa_ep03',
    DB_USERNAME: process.env.PG_TEST_USERNAME || 'ceroa_ep02', DB_PASSWORD: process.env.PG_TEST_PASSWORD || '',
    MAIL_HOST: '127.0.0.1', MAIL_PORT: '18084', MAIL_FROM: 'recovery@example.com', MAIL_SMTP_AUTH: 'false', MAIL_STARTTLS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe']
});
backend.stdout.pipe(log); backend.stderr.pipe(log);
let exitCode = 1;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (backend.exitCode !== null) throw new Error('Backend exited; inspect backend/ep03-e2e.log');
    try { ready = (await fetch('http://localhost:18083/api/v1/auth/csrf')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Backend did not start');
  const test = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    windowsHide: true, stdio: 'inherit', env: { ...process.env, E2E_API_URL: 'http://localhost:18083/api/v1', EP03_SMTP_INBOX: 'http://127.0.0.1:18085' }
  });
  exitCode = await new Promise(resolve => test.on('exit', code => resolve(code ?? 1)));
} finally {
  backend.kill(); smtp.close(); inbox.close(); log.end();
}
process.exitCode = exitCode;
