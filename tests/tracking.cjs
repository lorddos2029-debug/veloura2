const assert=require('node:assert/strict');
const {createTracker,utmOrder,metaEvent}=require('../tracking.cjs');
(async()=>{
process.env.UTMIFY_API_TOKEN='test-utm';process.env.META_ACCESS_TOKEN='test-meta';
const calls=[];const tracker=createTracker({save:async()=>{},fetchImpl:async(url,options)=>{calls.push({url,headers:options.headers,body:JSON.parse(options.body)});return{ok:true,json:async()=>url.includes('facebook')?{events_received:1}:{success:true}}}});
const order={evento_id:'ev_tracking_test_123',created_at:'2026-10-15T12:00:00Z',amount:7380,status:'pending',charge:{venda_id:123},cart:[{color:'preto',size:38,qty:1}],shipping:'sedex',buyer:{nome:'Cliente Teste',email:'TESTE@example.com',telefone:'11999999999',cpf:'52998224725'},attribution:{utm_source:'facebook',fbp:'fb.1.example'},client_ip:'127.0.0.1',user_agent:'test'};
await tracker(order);await tracker(order);assert.equal(calls.length,1);assert.equal(calls[0].body.status,'waiting_payment');assert.equal(calls[0].headers['x-api-token'],'test-utm');assert.equal(calls[0].body.commission.totalPriceInCents,7380);assert.equal(calls[0].body.products.length,2);
order.status='paid';order.confirmed_at='2026-10-15T12:05:00Z';await tracker(order);await tracker(order);assert.equal(calls.length,3);assert.equal(calls[1].body.status,'paid');assert.equal(calls[0].body.orderId,calls[1].body.orderId);assert.equal(calls[0].body.createdAt,calls[1].body.createdAt);assert.equal(calls[2].body.data[0].event_id,order.evento_id);assert.equal(calls[2].body.data[0].custom_data.value,73.8);assert.match(calls[2].body.data[0].user_data.em[0],/^[a-f0-9]{64}$/);assert(!JSON.stringify(calls[2].body).includes('TESTE@example.com'));
await tracker({...order,evento_id:'ev_native',tracking:{},native_tracking:{utmify:'enviado',facebook:'configurado'}});assert.equal(calls.length,3);
console.log('PASS: pending/paid, stable order ID and dates, cents with freight, event ID deduplication, SHA256, no duplicate native sends.');
})().catch(e=>{console.error(e);process.exitCode=1});


