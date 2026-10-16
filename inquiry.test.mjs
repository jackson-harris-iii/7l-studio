import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInquiry} from './inquiry.mjs';
import {makeWorker} from './worker.mjs';
const valid={name:'Test Client',email:'client@example.com',service:'both',date:'2026-11-20',location:'Sacramento',budget:'750-1500',details:'A small music event with a recap film.',website:'',token:'test-token'};
const request=(body=valid,headers={})=>new Request('https://7lstudio.com/api/inquiry',{method:'POST',headers:{Origin:'https://7lstudio.com','Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const verified=async()=>Response.json({success:true,action:'inquiry',hostname:'7lstudio.com'});
function fixture(send=async()=>({messageId:'test-message'})){return {TURNSTILE_SECRET_KEY:'test-secret',INQUIRY_TO:'owner@example.com',INQUIRY_EMAIL:{send}};}
test('inquiry sends only to configured owner with client reply-to after verification',async()=>{
  let message,verification;
  const response=await makeWorker({fetcher:async(url,options)=>{verification={url,...JSON.parse(options.body)};return verified();}}).fetch(request({...valid,to:'attacker@example.com'}),fixture(async value=>{message=value;}));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.equal(message.to,'owner@example.com');assert.equal(message.replyTo,valid.email);assert.equal(message.from.email,'inquiries@7lstudio.com');
  assert.match(message.text,/A small music event/);assert.match(message.subject,/Photo \+ film/);
  assert.equal(verification.response,'test-token');assert.equal(verification.secret,'test-secret');
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
});
test('invalid input, origin, content type and oversized streamed body never send',async()=>{
  let calls=0;const env=fixture(async()=>{calls++;});
  const cases=[
    [request(valid,{Origin:'https://other.example'}),403],
    [request(valid,{'Content-Type':'text/plain'}),415],
    [request('{'),400],[request(null),400],
    [request({...valid,website:'bot.example'}),400],
    [request({...valid,email:'a@example.com\r\nBcc: other@example.com'}),400],
    [request({...valid,email:'bad@example'}),400],
    [request({...valid,name:''}),400],[request({...valid,location:''}),400],
    [request({...valid,details:'short'}),400],[request({...valid,service:'unknown'}),400],
    [request({...valid,budget:'bad'}),400],[request({...valid,date:'2026-02-30'}),400],
    [request({...valid,details:'a'.repeat(3001)}),400],
    [request({...valid,token:''}),400],[request({...valid,name:[]}),400],
    [request('x'.repeat(12001),{'Content-Length':'1'}),413]
  ];
  for(const [req,status] of cases)assert.equal((await handleInquiry(req,env,{fetcher:verified})).status,status);
  assert.equal(calls,0);
});
test('failed, mismatched and unavailable Turnstile checks cannot send',async()=>{
  let calls=0;const env=fixture(async()=>{calls++;});
  for(const result of [{success:false},{success:true,action:'other',hostname:'7lstudio.com'},{success:true,action:'inquiry',hostname:'attacker.example'}]){
    assert.equal((await handleInquiry(request(),env,{fetcher:async()=>Response.json(result)})).status,400);
  }
  assert.equal((await handleInquiry(request(),env,{fetcher:async()=>new Response('',{status:503})})).status,503);
  assert.equal(calls,0);
});
test('missing setup and provider failures report failure without secrets or false success',async()=>{
  for(const env of [{},fixture(async()=>{throw Error('private-provider-detail');})]){
    const response=await handleInquiry(request(),env,{fetcher:verified});
    assert.equal(response.status,503);const body=await response.text();assert.doesNotMatch(body,/test-secret|owner@example|private-provider-detail|"ok":true/);
  }
  const response=await handleInquiry(new Request('https://7lstudio.com/api/inquiry'),fixture());
  assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'POST');
});
test('success waits for email provider acceptance',async()=>{
  let accept,done=false;const pending=new Promise(resolve=>{accept=resolve;});
  const delivery=handleInquiry(request(),fixture(()=>pending),{fetcher:verified}).then(response=>{done=true;return response;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(done,false);accept({messageId:'test'});
  assert.equal((await delivery).status,200);
});
