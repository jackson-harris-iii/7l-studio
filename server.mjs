import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createReader,refreshPortfolio,validateItem} from './smugmug.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const assets = new Map([['/',['index.html','text/html']],['/styles.css',['styles.css','text/css']],['/app.js',['app.js','text/javascript']]]);
export function makeServer({apiKey=process.env.SMUGMUG_API_KEY,fetcher=fetch}={}) {
  let cache, pending;
  const reader=apiKey?createReader({apiKey,fetcher}):null;
  async function portfolio() {
    if(cache && Date.now()-cache.time<5*60*1000)return cache.value;
    if(pending)return pending;
    pending=(async()=>{
      const seed=JSON.parse(await readFile(resolve(root,'portfolio.json'),'utf8'));
      [seed.hero,...seed.photos,...seed.videos].forEach(validateItem);
      const value=reader?await refreshPortfolio(seed,reader):{...seed,source:'curated-preview'};
      cache={value,time:Date.now()};
      return value;
    })();
    try{return await pending;}finally{pending=null;}
  }
  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://photos.smugmug.com; media-src https://photos.smugmug.com https://videos.smugmug.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
    let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);return res.end();}
    if(path==='/api/portfolio') {
      try{const value=await portfolio();res.setHeader('Content-Type','application/json');res.end(req.method==='HEAD'?'':JSON.stringify(value));}
      catch{cache=null;res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Portfolio temporarily unavailable'}));}
      return;
    }
    const file=assets.get(path);
    if(!file){res.writeHead(404);return res.end('Not found');}
    try{const body=await readFile(resolve(root,file[0]));res.setHeader('Content-Type',file[1]+'; charset=utf-8');res.end(req.method==='HEAD'?'':body);}catch{res.writeHead(500);res.end('Unavailable');}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=makeServer();server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('7L Studio preview: http://127.0.0.1:'+String(process.env.PORT||4173)));
}
