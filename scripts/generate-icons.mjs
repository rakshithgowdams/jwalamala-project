import sharp from 'sharp';import {mkdir} from 'node:fs/promises';
await mkdir('public/icons',{recursive:true});
for(const size of [192,512])await sharp('public/images/jwalamala-logo.jpg').resize(Math.round(size*.78),Math.round(size*.78)).extend({top:Math.floor(size*.11),bottom:size-Math.round(size*.78)-Math.floor(size*.11),left:Math.floor(size*.11),right:size-Math.round(size*.78)-Math.floor(size*.11),background:'#ffffff'}).png().toFile('public/icons/icon-'+size+'.png');
await sharp('public/images/jwalamala-logo.jpg').resize(310,310).extend({top:101,bottom:101,left:101,right:101,background:'#ffffff'}).png().toFile('public/icons/maskable-512.png');
for(const name of ['hill','temple','detail']){try{await sharp('public/images/'+name+'-original.jpg').resize(1280,800,{fit:'cover'}).webp({quality:80}).toFile('public/images/'+name+'.webp');}catch(error){console.error(name+': '+error.message);}}
try{await sharp('public/images/hill-original.jpg').resize(1280,700,{fit:'cover',position:'south'}).webp({quality:80}).toFile('public/images/landscape.webp');}catch{}
