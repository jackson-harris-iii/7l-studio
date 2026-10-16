const inquiryForm=document.querySelector('#inquiry-form');
const inquiryStatus=document.querySelector('#inquiry-status');
const inquirySubmit=inquiryForm.querySelector('button[type="submit"]');
const showInquiryStatus=(message)=>{inquiryStatus.textContent=message;inquiryStatus.focus();};
for(const link of document.querySelectorAll('[data-package]'))link.addEventListener('click',()=>{
  inquiryForm.elements.service.value=link.dataset.package;
});
const isLiveInquiry=['7lstudio.com','www.7lstudio.com'].includes(location.hostname);
if(!isLiveInquiry){inquirySubmit.disabled=true;inquiryStatus.textContent='Preview only. Send your inquiry from 7lstudio.com.';}
inquiryForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(inquirySubmit.disabled||!inquiryForm.reportValidity())return;
  const fields=new FormData(inquiryForm);
  const token=fields.get('cf-turnstile-response')||'';
  if(!token){showInquiryStatus('Please wait for the security check. If it does not load, refresh the page or message Jackson on Instagram.');return;}
  const payload=Object.fromEntries(['name','email','service','date','location','budget','details','website'].map(key=>[key,fields.get(key)||'']));
  payload.token=token;
  inquirySubmit.disabled=true;inquirySubmit.textContent='Sending…';inquiryStatus.textContent='Sending your inquiry…';
  try{
    const response=await fetch('/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw new Error(result.error||'We could not confirm delivery. Your details are still here. Please try again or message Jackson on Instagram.');
    inquiryForm.reset();
    showInquiryStatus('Thanks — your inquiry has been sent. Jackson will reply by email to discuss the details. Your date is not reserved yet.');
  }catch(error){
    showInquiryStatus(error.name==='TimeoutError'||error.name==='TypeError'?'We could not confirm delivery. Your details are still here. Please try again shortly or message Jackson on Instagram.':error.message);
  }finally{
    inquirySubmit.disabled=false;inquirySubmit.textContent='Send inquiry ↗';
    if(window.turnstile)window.turnstile.reset();
  }
});
