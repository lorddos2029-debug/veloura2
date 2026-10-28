const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),catalog=require('../veloura/catalog.js');
for(const color of ['off-white','preto','marrom']){const choice={product:'bolsa-kit',color,qty:1};assert(catalog.valid(choice));const item=catalog.item(choice);assert.equal(item.price,7990);assert.equal(item.pix,7591);assert(item.variant.includes('5 peças'));assert(fs.existsSync(path.join(__dirname,'..',item.image)));}
for(const color of ['__proto__','azul',''])assert(!catalog.valid({product:'bolsa-kit',color,qty:1}));
assert(!catalog.valid({product:'bolsa-kit',color:'preto',qty:21}));console.log('PASS: bolsa colors, kit price, images, invalid color and quantity rejection');
