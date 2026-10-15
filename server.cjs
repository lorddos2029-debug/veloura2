const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const zlib=require('node:zlib');
const {createTracker}=require('./tracking.cjs');
const COLORS=['off-white','azul-medio','preto','azul-claro','cafe'];
function validCPF(value){const s=String(value||'').replace(/\D/g,'');if(s.length!==11||/^(\d)\1{10}$/.test(s))return false;for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(s[i])*(n+1-i);let d=(sum*10)%11;if(d===10)d=0;if(d!==Number(s[n]))return false}return true}
function createApp({root=__dirname,apiKey='',fetchImpl=fetch,dataDir=path.join(__dirname,'.runtime')}={}){

 root=path.resolve(root);
 const cleanEnv=name=>String(process.env[name]||'').trim().replace(/^['"]|['"]$/g,'');
 const redisPairs=[['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'],['KV_REST_API_URL','KV_REST_API_TOKEN']];
 for(const name of Object.keys(process.env).sort()){if(name.endsWith('_KV_REST_API_URL'))redisPairs.push([name,name.replace(/_URL$/,'_TOKEN')]);if(name.endsWith('_UPSTASH_REDIS_REST_URL'))redisPairs.push([name,name.replace(/_URL$/,'_TOKEN')])}
 const pair=redisPairs.find(([url,token])=>cleanEnv(url)&&cleanEnv(token))||redisPairs[0];
 const redisURL=cleanEnv(pair[0]);const redisToken=cleanEnv(pair[1]);
 const cloud=process.env.VERCEL==='1';
 const orders=new Map();
 if(!cloud&&!redisURL){fs.mkdirSync(dataDir,{recursive:true});for(const name of fs.readdirSync(dataDir).filter(n=>n.endsWith('.json'))){try{const o=JSON.parse(fs.readFileSync(path.join(dataDir,name),'utf8'));orders.set(o.evento_id,o)}catch{}}}
 const redis=async command=>{const response=await fetchImpl(redisURL,{method:'POST',headers:{Authorization:'Bearer '+redisToken,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});const d=await response.json();if(!response.ok||d.error)throw Error('STORAGE');return d.result};
 const eventKey=id=>'veloura:order:'+crypto.createHash('sha256').update(id).digest('hex');
 const getOrder=async id=>{if(redisURL&&redisToken){const raw=await redis(['GET',eventKey(id)]);return raw?JSON.parse(raw):null}return orders.get(id)};
 const receiptKey=crypto.createHash('sha256').update('veloura:pix-receipt:'+apiKey).digest();
 const seal=o=>{const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',receiptKey,iv);const {token,...snapshot}=o;const data=zlib.deflateSync(Buffer.from(JSON.stringify({...snapshot,receipt_expires:Date.now()+7*86400000})));const encrypted=Buffer.concat([cipher.update(data),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url')};
 const unseal=token=>{try{const bytes=Buffer.from(token,'base64url');if(bytes.length<29)return null;const decipher=crypto.createDecipheriv('aes-256-gcm',receiptKey,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));const data=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]);const o=JSON.parse(zlib.inflateSync(data,{maxOutputLength:24000}));if(!o.charge||o.receipt_expires<Date.now())return null;const cached=orders.get(o.evento_id);return cached&&cached.charge?.venda_id===o.charge.venda_id?cached:o}catch{return null}};
 const save=async o=>{if(redisURL&&redisToken){await redis(['SET',eventKey(o.evento_id),JSON.stringify(o)]);return}if(cloud){orders.set(o.evento_id,o);return}fs.writeFileSync(path.join(dataDir,o.token+'.json'),JSON.stringify(o))};
 const claim=async o=>{if(redisURL&&redisToken){const result=await redis(['SET',eventKey(o.evento_id),JSON.stringify(o),'NX']);if(result!=='OK')return false;await redis(['SET','veloura:token:'+o.token,o.evento_id]);return true}if(orders.has(o.evento_id))return false;orders.set(o.evento_id,o);await save(o);return true};
 const byToken=async token=>{if(redisURL&&redisToken){const id=await redis(['GET','veloura:token:'+token]);return id?getOrder(id):null}return (cloud?unseal(token):null)||[...orders.values()].find(o=>o.token===token&&o.charge)};
 const track=createTracker({fetchImpl,redis:redisURL&&redisToken?redis:null,save,cloud});
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 const api=async(route,options={})=>{const r=await fetchImpl('https://uruspaypagamentos.com/api/v1/'+route,{...options,headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});let d;try{d=await r.json()}catch{throw Error('UPSTREAM')}if(!r.ok||d.ok!==true)throw Error('UPSTREAM');return d};
 const publicOrder=o=>({ok:true,venda_id:o.charge.venda_id,pix_code:o.charge.pix_code,qr_code_url:o.charge.qr_code_url,expira_em:o.charge.expira_em,valor:o.amount/100,status:o.charge.status||'pending',evento_id:o.evento_id,check_status_url:'/api/pix/status/'+(cloud&&!(redisURL&&redisToken)?seal(o):o.token)});
 return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
 if(pathname.startsWith('/api/')){
 if(!apiKey)return json(res,503,{error:'O pagamento Pix ainda não foi configurado. Entre em contato com a loja.'});
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Origem não permitida.'});
 if(req.method==='POST'&&pathname==='/api/pix/charge'){
 let b;try{
 if(req.body!==undefined&&req.body!==null){
  if(Buffer.isBuffer(req.body))b=JSON.parse(req.body.toString('utf8'));
  else if(typeof req.body==='string')b=JSON.parse(req.body);
  else if(typeof req.body==='object')b=req.body;
  else throw Error('INVALID_BODY');
 }else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>24000)return json(res,413,{error:'Dados excedem o tamanho permitido.'})}b=JSON.parse(raw)}
 if(!b||Array.isArray(b)||typeof b!=='object')throw Error('INVALID_BODY');
 if(Buffer.byteLength(JSON.stringify(b))>24000)return json(res,413,{error:'Dados excedem o tamanho permitido.'});
 }catch{return json(res,400,{error:'Dados inválidos. Atualize a página e tente novamente.'})}
 if(!validCPF(b.cpf)||typeof b.nome!=='string'||b.nome.trim().length<3||b.nome.length>160||!/^\S+@\S+\.\S+$/.test(b.email||'')||String(b.email).length>200||!/^ev_[a-zA-Z0-9_-]{10,100}$/.test(b.evento_id||''))return json(res,400,{error:'Confira nome, e-mail e CPF.'});
 if(!Array.isArray(b.cart)||!b.cart.length||b.cart.length>35||!['free','sedex'].includes(b.shipping)||b.cart.some(i=>!COLORS.includes(i.color)||![34,36,38,40,42,44,46].includes(i.size)||!Number.isInteger(i.qty)||i.qty<1||i.qty>20))return json(res,400,{error:'Revise os itens e o frete da sacola.'});
 const address=b.address;if(!address||!/^\d{8}$/.test(String(address.cep||'').replace(/\D/g,''))||['address','number','district','city','state'].some(k=>typeof address[k]!=='string'||!address[k].trim()||address[k].length>200))return json(res,400,{error:'Confira o endereço de entrega.'});
 const amount=b.cart.reduce((n,i)=>n+5990*i.qty,0)+(b.shipping==='sedex'?1390:0);const fingerprint=crypto.createHash('sha256').update(JSON.stringify({cart:b.cart,shipping:b.shipping,cpf:b.cpf.replace(/\D/g,''),email:b.email,address})).digest('hex');const existing=await getOrder(b.evento_id);
 if(existing){if(existing.fingerprint!==fingerprint)return json(res,409,{error:'Esta tentativa pertence a outro pedido. Recarregue o checkout.'});if(existing.charge){await track(existing);return json(res,200,publicOrder(existing))}return json(res,409,{error:'A geração anterior ainda precisa ser confirmada. Não refaça o pagamento; entre em contato com a loja.'})}
 const o={evento_id:b.evento_id,token:crypto.randomBytes(24).toString('hex'),fingerprint,amount,cart:b.cart,shipping:b.shipping,address,buyer:{nome:b.nome.trim(),email:b.email,cpf:b.cpf.replace(/\D/g,''),telefone:String(b.telefone||'').replace(/\D/g,'')},created_at:new Date().toISOString(),status:'creating'};if(!await claim(o))return json(res,409,{error:'Este pedido já está sendo processado. Aguarde antes de tentar novamente.'});
 o.client_ip=cloud?String(req.headers['x-forwarded-for']||'').split(',')[0].trim():req.socket.remoteAddress;o.user_agent=req.headers['user-agent']||'';o.source_url='https://veloura2.vercel.app/checkout/';o.attribution={};for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck','fbp','fbc'])if(typeof b[key]==='string')o.attribution[key]=b[key].slice(0,500);await save(o);
 const payload={valor:amount/100,...o.buyer,descricao:'Calça Pool Jeans barrel cintura média feminina — Veloura',itens:b.cart.map(i=>({id:'barrel-'+i.color+'-'+i.size,nome:'Calça Pool Jeans barrel — '+i.color+' / '+i.size,quantidade:i.qty,preco_unitario:59.9})),evento_id:o.evento_id,user_agent:req.headers['user-agent']||'',ip:o.client_ip};if(b.shipping==='sedex')payload.itens.push({id:'frete-sedex',nome:'Frete Sedex (3–5 dias)',quantidade:1,preco_unitario:13.9});
 for(const [key,value]of Object.entries(o.attribution))payload[key]=value;
 if(cloud&&redisURL&&redisToken)payload.webhook_url='https://veloura2.vercel.app/api/pix/webhook/'+o.token;
 try{const d=await api('charge',{method:'POST',body:JSON.stringify(payload)});if(!d.venda_id||!d.pix_code||!d.qr_code_url||!/^https:\/\//.test(d.qr_code_url)||Math.round(Number(d.valor)*100)!==amount)throw Error('UPSTREAM');o.charge={venda_id:d.venda_id,pix_code:d.pix_code,qr_code_url:d.qr_code_url,expira_em:d.expira_em,status:d.status};o.status='pending';o.native_tracking=d.rastreamento||{};await save(o);await track(o);return json(res,200,publicOrder(o))}catch{o.status='uncertain';await save(o);return json(res,502,{error:'Não foi possível confirmar a geração do Pix. Evite novas tentativas e consulte a loja para verificar se a cobrança foi criada.'})}
 }
 if((req.method==='GET'&&/^\/api\/pix\/status\/[A-Za-z0-9_-]{48,12000}$/.test(pathname))||(req.method==='POST'&&/^\/api\/pix\/webhook\/[A-Za-z0-9_-]{48,12000}$/.test(pathname))){const token=pathname.split('/').pop();const o=await byToken(token);if(!o)return json(res,404,{error:'Cobrança não encontrada.'});try{const d=await api('status/'+encodeURIComponent(o.charge.venda_id));if(String(d.venda_id)!==String(o.charge.venda_id)||Math.round(Number(d.valor)*100)!==o.amount)throw Error('UPSTREAM');o.status=d.pago===true||d.status==='paid'?'paid':d.status;o.pago_em=d.pago_em||null;if(o.status==='paid'&&!o.confirmed_at)o.confirmed_at=new Date().toISOString();await save(o);await track(o,d.rastreamento||{});return json(res,200,{ok:true,status:o.status,pago:o.status==='paid',pago_em:o.pago_em,valor:o.amount/100})}catch{return json(res,502,{error:'Não conseguimos consultar o pagamento agora. A verificação continuará automaticamente.'})}}
 return json(res,404,{error:'Rota não encontrada.'});
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 let file=path.resolve(root,'.'+pathname);if((!file.startsWith(root+path.sep)&&file!==root)||pathname.split('/').some(s=>s.startsWith('.'))){res.writeHead(403);return res.end('Forbidden')}
 if(pathname.endsWith('/')||!path.extname(pathname))file=path.join(file,'index.html');const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};if(!types[path.extname(file)]||file.endsWith('server.cjs')){res.writeHead(404);return res.end('Not found')}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data)});
 }catch{if(!res.headersSent)json(res,500,{error:'Não foi possível processar a solicitação. Tente novamente mais tarde.'});else res.end()}})
}
if(require.main===module){const envFile=path.join(__dirname,'.env');if(fs.existsSync(envFile)){for(const line of fs.readFileSync(envFile,'utf8').replace(/^\\uFEFF/,'').split(/\r?\n/)){const m=line.trim().match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim()}}createApp({root:process.env.STOREFRONT_ROOT||__dirname,apiKey:process.env.URUSPAY_API_KEY||''}).listen(Number(process.env.PORT)||3000,()=>console.log('Veloura: http://localhost:'+(process.env.PORT||3000)))}module.exports={createApp,validCPF};



