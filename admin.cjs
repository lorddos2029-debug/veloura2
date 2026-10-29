const crypto=require('node:crypto'),{promisify}=require('node:util');const scrypt=promisify(crypto.scrypt);
const COOKIE='veloura_admin';
async function readBody(req){let body=req.body;if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2048)throw Error('BODY_LIMIT')}body=raw}if(Buffer.isBuffer(body))body=body.toString('utf8');if(typeof body==='string')body=JSON.parse(body);if(!body||Array.isArray(body)||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>2048)throw Error('BODY');return body;}
function createAdmin({store,cloud,passwordHash=process.env.ADMIN_PASSWORD_HASH||'',configured,testProvider}){
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const cookie=(res,value,age)=>res.setHeader('Set-Cookie',`${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${age}${cloud?'; Secure':''}`);
 const getProvider=async()=>{const saved=await store.read('payment-provider');if(!saved)return 'uruspay';if(!['uruspay','pinpay'].includes(saved.data.provider))throw Error('INVALID_PROVIDER');return saved.data.provider};
 const session=async req=>{const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';if(!/^[a-f0-9]{64}$/.test(raw))return null;const key='sessions/'+digest(raw),saved=await store.read(key);if(!saved||saved.data.expires<Date.now())return null;return {...saved.data,key}};
 const state=async csrf=>({provider:await getProvider(),csrf,providers:configured(),updatedAt:(await store.read('payment-provider'))?.data.updatedAt||null,lastFailure:(await store.read('pix-last-failure'))?.data||null});
 return {getProvider,async recordFailure(provider,error){await store.write('pix-last-failure',{provider,code:error.code||'PIX_INTERNAL',http:error.status||null,providerCode:error.providerCode||null,reason:error.reason||null,at:new Date().toISOString()})},async handle(req,res,pathname){if(!pathname.startsWith('/api/admin/'))return false;
 try{if(!passwordHash||!store.available){json(res,503,{error:'O painel ainda não foi configurado no servidor.'});return true}
 if(!['GET','POST'].includes(req.method)){json(res,405,{error:'Método não permitido.'});return true}
 if(req.method==='POST'){const origin=req.headers.origin;if(!origin||(new URL(origin)).host!==req.headers.host||!['http:','https:'].includes(new URL(origin).protocol)){json(res,403,{error:'Origem não permitida.'});return true}}
 if(pathname==='/api/admin/login'&&req.method==='POST'){
 const ip=cloud?String(req.headers['x-forwarded-for']||'unknown').split(',')[0]:req.socket.remoteAddress;const key='attempts/'+digest(ip||'unknown');const saved=await store.read(key);let record=saved?.data;if(!record||record.until<Date.now())record={count:0,until:Date.now()+15*60000};if(record.count>=8){json(res,429,{error:'Muitas tentativas. Tente novamente em 15 minutos.'});return true}record.count++;await store.write(key,record,saved?.etag);
 const b=await readBody(req),[salt,hex]=passwordHash.split(':');const expected=Buffer.from(hex||'','hex');const actual=await scrypt(typeof b.password==='string'&&b.password.length<=200?b.password:'',salt,64);if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual)){json(res,401,{error:'Senha incorreta.'});return true}
 const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex');await store.write('sessions/'+digest(token),{csrf,expires:Date.now()+8*3600000});await store.write(key,{count:0,until:Date.now()+15*60000});cookie(res,token,28800);json(res,200,await state(csrf));return true}
 const current=await session(req);if(!current){json(res,401,{error:'Entre no painel para continuar.'});return true}
 if(req.method==='POST'&&req.headers['x-csrf-token']!==current.csrf){json(res,403,{error:'Sessão inválida. Entre novamente.'});return true}
 if(pathname==='/api/admin/settings'&&req.method==='GET'){json(res,200,await state(current.csrf));return true}
 if(pathname==='/api/admin/settings'&&req.method==='POST'){const b=await readBody(req);if(!['uruspay','pinpay'].includes(b.provider)||!configured()[b.provider]){json(res,400,{error:'Selecione uma adquirente configurada.'});return true}const previous=await getProvider();await store.write('payment-provider',{provider:b.provider,previous,updatedAt:new Date().toISOString()});json(res,200,await state(current.csrf));return true}
 if(pathname==='/api/admin/test'&&req.method==='POST'){const b=await readBody(req);if(b.provider!=='pinpay'){json(res,400,{error:'Selecione PinPay para testar a conexão.'});return true}await testProvider('pinpay');json(res,200,{ok:true,message:'Conexão PinPay validada. Nenhuma cobrança foi criada.'});return true}
 if(pathname==='/api/admin/logout'&&req.method==='POST'){await store.write(current.key,{expires:0});cookie(res,'',0);json(res,200,{ok:true});return true}json(res,404,{error:'Rota não encontrada.'});return true
 }catch(e){json(res,e.message==='BODY'||e.message==='BODY_LIMIT'||e instanceof SyntaxError?400:503,{error:'Não foi possível concluir a operação. Tente novamente.'});return true}}
 };
}
module.exports={createAdmin};
