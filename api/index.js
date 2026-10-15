const {createApp}=require('../server.cjs');
let handler;
module.exports=async(req,res)=>{
 try{
  if(!handler){const app=createApp({apiKey:process.env.URUSPAY_API_KEY||''});handler=app.listeners('request')[0];}
  const url=new URL(req.url,'http://localhost');
  const route=url.searchParams.get('route');
  if(route)req.url='/api/pix/'+route;
  return await handler(req,res);
 }catch{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Serviço temporariamente indisponível. Tente novamente mais tarde.'}));}
};
