const fs=require('node:fs'),path=require('node:path');
const root=__dirname,out=path.join(root,'public');fs.mkdirSync(out,{recursive:true});
for(const name of ['index.html','checkout.html','checkout','pix','kit','calca','legging','bolsa','escova','painel','veloura'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
console.log('Static storefront prepared in public/');

