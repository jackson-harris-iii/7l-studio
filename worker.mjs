import seed from './portfolio.json' with {type:'json'};
import {createReader,refreshPortfolio,validateItem} from './smugmug.mjs';

export const securityHeaders = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://photos.smugmug.com; media-src https://photos.smugmug.com https://videos.smugmug.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
const paths = new Set(['/','/index.html','/app.js','/styles.css']);
export function makeWorker({fetcher=fetch,now=Date.now}={}) {
  let cache, pending, currentKey;
  async function portfolio(key) {
    if(currentKey!==key){cache=null;pending=null;currentKey=key;}
    if(cache && now()-cache.time<300000)return cache.value;
    if(pending)return pending;
    pending=(async()=>{
      [seed.hero,...seed.photos,...seed.videos].forEach(validateItem);
      const value=key?await refreshPortfolio(seed,createReader({apiKey:key,fetcher})):{...seed,source:'curated-preview'};
      cache={value,time:now()};
      return value;
    })();
    try{return await pending;}catch(error){cache=null;throw error;}finally{pending=null;}
  }
  return {
    async fetch(request,env) {
      const url=new URL(request.url);
      const headers={...securityHeaders,'Cache-Control':'no-store'};
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
      if(url.pathname==='/api/portfolio') {
        try{
          const value=await portfolio(env.SMUGMUG_API_KEY);
          return new Response(request.method==='HEAD'?null:JSON.stringify(value),{headers:{...headers,'Content-Type':'application/json'}});
        }catch{
          return new Response(request.method==='HEAD'?null:JSON.stringify({error:'Portfolio temporarily unavailable'}),{status:503,headers:{...headers,'Content-Type':'application/json'}});
        }
      }
      if(!paths.has(url.pathname))return new Response(request.method==='HEAD'?null:'Not found',{status:404,headers});
      const asset=await env.ASSETS.fetch(request);
      const response=new Response(asset.body,asset);
      Object.entries(headers).forEach(([key,value])=>response.headers.set(key,value));
      return response;
    }
  };
}
export default makeWorker();
