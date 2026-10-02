import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {excluded,approvedURL,validateItem,createReader,selectSize,refreshPortfolio} from './smugmug.mjs';
import {makeServer} from './server.mjs';
const seed=JSON.parse(await readFile(new URL('./portfolio.json',import.meta.url),'utf8'));

test('excludes Nightshift, ADP, and Another Day Party at any path depth',()=>{
  for(const s of ['Nightshift','Night Shift','night_shift','Night-Shift','Archive/ADP-Gene-Hunt/Favorites','Another-Day-Party','NIGHT%20SHIFT'])assert.equal(excluded(s),true,s);
  assert.equal(excluded('Nora En Pure / Favorites'),false);
});
test('only approved HTTPS media collections pass, without URL credentials or query strings',()=>{
  assert.equal(approvedURL(seed.hero.src,'media'),true);
  for(const s of ['https://evil.test/Idyllwild/Edited/i-a','https://jacksonharris.smugmug.com.evil.test/Idyllwild/Edited/i-a','https://jacksonharris.smugmug.com/Family/i-a',seed.hero.page+'?token=x','https://user:secret@jacksonharris.smugmug.com/Idyllwild/Edited/i-a'])assert.equal(approvedURL(s),false);
});
test('all eight curated records validate and excluded old archive is absent',()=>{
  const items=[seed.hero,...seed.photos,...seed.videos];assert.equal(items.length,8);items.forEach(validateItem);
  assert.equal(new Set(items.map(i=>i.id)).size,8);
  assert.throws(()=>validateItem({...seed.hero,id:'wrong'}),/identity mismatch/);
});
test('size selection avoids originals and prefers a 1920-or-smaller web derivative',()=>{
  const base=seed.hero.src.slice(0,seed.hero.src.lastIndexOf('/X5/'));
  const details={Original:{Url:base+'/O/a.jpg',Width:6000},XL:{Url:base+'/XL/a.jpg',Width:1280},X5:{Url:seed.hero.src,Width:4000}};
  assert.equal(selectSize(details,false).Width,1280);
});
function response(Response,status=200){return{status,ok:status===200,json:async()=>({Response})};}
test('reader removes hidden/private content and never writes remotely',async()=>{
  const reader=createReader({apiKey:'test-only',fetcher:async(url,options)=>{assert.equal(url.origin,'https://api.smugmug.com');assert.equal(options.method,undefined);return response({Image:{Hidden:true}});}});
  assert.equal(await reader(seed.hero),null);
  const forbidden=createReader({apiKey:'test-only',fetcher:async()=>response({},403)});
  assert.equal(await forbidden(seed.hero),null);
});
test('API refresh resolves public image, album, and derivative with no key in result',async()=>{
  const item=seed.hero;
  const calls=[];
  const reader=createReader({apiKey:'test-only',fetcher:async(url)=>{
    calls.push(url.pathname);
    if(url.pathname===`/api/v2/image/${item.id}`)return response({Image:{WebUri:item.page,Hidden:false,Uris:{ImageAlbum:{Uri:'/api/v2/album/abc'},ImageSizeDetails:{Uri:`/api/v2/image/${item.id}!sizedetails`}}}});
    if(url.pathname==='/api/v2/album/abc')return response({Album:{Name:'edited',WebUri:'https://jacksonharris.smugmug.com/Idyllwild/Edited',Privacy:'Public',External:true}});
    return response({ImageSizeDetails:{X3:{Url:item.src,Width:1600}}});
  }});
  const actual=await reader(item);assert.equal(actual.src,item.src);assert.equal(calls.length,3);assert.equal(JSON.stringify(actual).includes('test-only'),false);
});
test('refresh removes unavailable items without reverting to a stale snapshot',async()=>{
  const result=await refreshPortfolio(seed,async()=>null);assert.equal(result.hero,null);assert.deepEqual(result.photos,[]);assert.deepEqual(result.videos,[]);
});
test('server exposes only site assets and sanitized portfolio, not configuration',async(t)=>{
  const server=makeServer({apiKey:''});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/.env','/server.mjs','/portfolio.json','/qa/api-application.jpg'])assert.equal((await fetch(base+path)).status,404);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  const res=await fetch(base+'/api/portfolio');const data=await res.json();assert.equal(data.source,'curated-preview');assert.equal(data.videos.length,3);
  assert.equal((await fetch(base+'/')).status,200);
});
