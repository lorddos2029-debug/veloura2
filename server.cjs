const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end('Forbidden'); }
  if(pathname.endsWith('/') || !path.extname(pathname)) file = path.join(file,'index.html');
  if(!['.html','.css','.js','.png','.jpg','.svg'].includes(path.extname(file))){res.writeHead(404);return res.end('Not found');}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',types[path.extname(file)]);res.end(data);});
}).listen(Number(process.env.PORT)||3000,()=>console.log('Veloura: http://localhost:'+(process.env.PORT||3000)));
