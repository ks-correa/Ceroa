import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
const path=process.env.TELEGRAM_WEBHOOK_PATH;
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
if(!path?.startsWith('/webhook/')||!secret||secret.length<40) throw new Error('Configura el webhook privado');
const expected=Buffer.from(secret);
http.createServer((req,res)=>{
  const received=Buffer.from(String(req.headers['x-telegram-bot-api-secret-token']||''));
  if(req.method!=='POST'||req.url!==path||received.length!==expected.length||!timingSafeEqual(received,expected)) {res.writeHead(404);res.end();return;}
  let length=0;const parts=[];
  req.on('data',part=>{length+=part.length;if(length>65536){res.writeHead(413);res.end();req.destroy();}else parts.push(part);});
  req.on('end',()=>{
    if(res.writableEnded)return;
    const upstream=http.request({hostname:'n8n',port:5678,path,method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':secret},timeout:15000},reply=>{
      res.writeHead(reply.statusCode||502,{'content-type':'application/json'});reply.pipe(res);
    });
    upstream.on('timeout',()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    upstream.end(Buffer.concat(parts));
  });
}).listen(8080,'0.0.0.0');
