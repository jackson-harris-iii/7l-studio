import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./inquiry-ui.js',import.meta.url),'utf8');
function ui(fetcher,{hostname='7lstudio.com',token='token'}={}){
  let submit,resets=0,challengeResets=0,focused=false;
  const button={disabled:false,textContent:'Send inquiry ↗'};
  const status={textContent:'',focus:()=>{focused=true;}};
  const form={elements:{service:{value:''}},querySelector:()=>button,reportValidity:()=>true,addEventListener:(_,fn)=>{submit=fn;},reset:()=>{resets++;}};
  const fields=new Map([['name','Client'],['details','A project description'],['cf-turnstile-response',token]]);
  vm.runInNewContext(source,{document:{querySelector:s=>s==='#inquiry-form'?form:status,querySelectorAll:()=>[]},location:{hostname},FormData:class {get(key){return fields.get(key);}},fetch:fetcher,AbortSignal,window:{turnstile:{reset:()=>{challengeResets++;}}}});
  return {button,status,submit:()=>submit({preventDefault(){}}),state:()=>({resets,challengeResets,focused})};
}
test('failed delivery preserves details, resets challenge, and restores submit button',async()=>{
  const page=ui(async()=>({ok:false,json:async()=>({error:'Delivery failed; try again.'})}));
  await page.submit();assert.equal(page.state().resets,0);assert.equal(page.state().challengeResets,1);assert.equal(page.button.disabled,false);assert.match(page.status.textContent,/Delivery failed/);assert.equal(page.state().focused,true);
});
test('confirmed success clears form only once and prevents duplicate in-flight submissions',async()=>{
  let accept,calls=0;const pending=new Promise(resolve=>{accept=resolve;});const page=ui(async()=>{calls++;return pending;});
  const sending=page.submit();assert.equal(page.button.disabled,true);await page.submit();assert.equal(calls,1);assert.equal(page.state().resets,0);
  accept({ok:true,json:async()=>({ok:true})});await sending;assert.equal(page.state().resets,1);assert.match(page.status.textContent,/not reserved/);
});
test('preview and missing challenge cannot claim delivery',async()=>{
  let calls=0;const fetcher=async()=>{calls++;};
  const preview=ui(fetcher,{hostname:'127.0.0.1'});await preview.submit();assert.match(preview.status.textContent,/Preview only/);
  const page=ui(fetcher,{token:''});await page.submit();assert.match(page.status.textContent,/security check/);assert.equal(calls,0);
});
