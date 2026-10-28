const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../veloura/catalog.js');
for(const color of ['preto-marrom','preto-azul','preto-preto','marrom-marrom','marrom-azul']){
 for(const size of ['P/M','G/GG']){
  const choice={product:'legging-kit',color,size,qty:1};
  assert(catalog.valid(choice));
  const item=catalog.item(choice);
  assert.equal(item.price,6990);assert.equal(item.pix,6641);
  assert(item.variant.includes(size));
  assert(fs.existsSync(path.join(__dirname,'..',item.image)));
 }
}
for(const choice of [{color:'__proto__',size:'P/M',qty:1},{color:'preto-marrom',size:36,qty:1},{color:'preto-marrom',size:'P/M',qty:21}])assert(!catalog.valid({product:'legging-kit',...choice}));
console.log('PASS: legging variants, sizes, pricing, images and invalid cart rejection');
