import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {makeWorker} from './worker.mjs';
const request=(path,method='GET')=>new Request('https://7lstudio.com'+path,{method});
const env={ASSETS:{fetch:async()=>new Response('<!doctype html><title>7L Studio</title>',{headers:{'Content-Type':'text/html'}})}};

test('deployed handler serves the selection and enforces public asset boundaries',async()=>{
  const worker=makeWorker();
  const data=await (await worker.fetch(request('/api/portfolio'),env)).json();
  assert.equal(data.photos.length,4);assert.equal(data.videos.length,3);
  for(const path of ['/.env','/.git/config','/worker.mjs','/portfolio.json','/qa/api-application.jpg'])assert.equal((await worker.fetch(request(path),env)).status,404);
  const page=await worker.fetch(request('/'),env);
  assert.equal(page.status,200);assert.match(page.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  assert.equal((await worker.fetch(request('/api/portfolio','POST'),env)).status,405);
  assert.equal(await (await worker.fetch(request('/api/portfolio','HEAD'),env)).text(),'');
});
test('deployed API fails closed after cache expiry and does not expose secrets',async()=>{
  let time=0,failed=false;
  const worker=makeWorker({now:()=>time,fetcher:async()=>{
    if(failed)throw Error('private-test-secret');
    return {status:403,ok:false};
  }});
  const privateEnv={...env,SMUGMUG_API_KEY:'private-test-secret'};
  const first=await worker.fetch(request('/api/portfolio'),privateEnv);
  assert.equal(first.status,200);assert.equal((await first.json()).hero,null);
  failed=true;time=300001;
  const second=await worker.fetch(request('/api/portfolio'),privateEnv);
  assert.equal(second.status,503);assert.equal((await second.text()).includes('private-test-secret'),false);
});
test('build includes only approved public assets',async()=>{
  execFileSync(process.execPath,['build.mjs'],{cwd:new URL('.',import.meta.url)});
  assert.deepEqual((await readdir(new URL('./dist/',import.meta.url))).sort(),['app.js','index.html','styles.css']);
});
