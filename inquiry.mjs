const origins=new Set(['https://7lstudio.com','https://www.7lstudio.com']);
const services=new Map([['photography','Photography'],['film','Recap film'],['both','Photo + film'],['custom','Something else']]);
const budgets=new Set(['','under-450','450-750','750-1500','1500-plus','not-sure']);
const emailPattern=/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;
const reply=(status,error)=>Response.json(error?{error}:{ok:true},{status,headers:{'Cache-Control':'no-store'}});
export async function handleInquiry(request,env,{fetcher=fetch}={}) {
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  if(!origins.has(request.headers.get('Origin')))return reply(403,'Please submit from 7lstudio.com.');
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(415,'Please use the inquiry form.');
  let data;
  try{
    const reader=request.body?.getReader();if(!reader)return reply(400,'Please complete the required fields.');
    let length=0;const chunks=[];
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>12000){await reader.cancel();return reply(413,'Your message is too long. Please shorten it.');}chunks.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    data=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return reply(400,'Please check your details and try again.');}
  if(!data||typeof data!=='object'||Array.isArray(data))return reply(400,'Please check your details.');
  const limits={name:100,email:254,service:20,date:10,location:200,budget:20,details:3000,website:200,token:2048};
  for(const [key,max] of Object.entries(limits)){
    if(typeof data[key]!=='string'||data[key].length>max)return reply(400,'Please check your details and field lengths.');
    data[key]=data[key].trim();
  }
  if(data.website)return reply(400,'Unable to submit this inquiry.');
  if(!data.name||/[\r\n\x00-\x1f]/.test(data.name+data.email)||!emailPattern.test(data.email)||!services.has(data.service)||!data.location||data.details.length<10||!budgets.has(data.budget))return reply(400,'Please complete the required fields with a valid email and project description.');
  if(data.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||Number.isNaN(Date.parse(data.date))||new Date(data.date).toISOString().slice(0,10)!==data.date))return reply(400,'Please check the project date.');
  if(!data.token)return reply(400,'Please wait for the security check, then try again.');
  if(!env.TURNSTILE_SECRET_KEY||!env.INQUIRY_TO||!emailPattern.test(env.INQUIRY_TO)||!env.INQUIRY_EMAIL?.send)return reply(503,'Inquiries are temporarily unavailable. Please message Jackson on Instagram.');
  try{
    const verification=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.token}),signal:AbortSignal.timeout(10000)
    });
    if(!verification.ok)return reply(503,'The security check is unavailable. Please try again shortly.');
    const result=await verification.json();
    if(!result.success||result.action!=='inquiry'||!['7lstudio.com','www.7lstudio.com'].includes(result.hostname))return reply(400,'The security check expired or failed. Please try again.');
    await env.INQUIRY_EMAIL.send({
      from:{email:'inquiries@7lstudio.com',name:'7L Studio'},to:env.INQUIRY_TO,replyTo:data.email,
      subject:`7L Studio inquiry — ${services.get(data.service)}`,
      text:`New website inquiry\n\nName: ${data.name}\nEmail: ${data.email}\nService: ${services.get(data.service)}\nDate: ${data.date||'Flexible / not decided'}\nLocation: ${data.location}\nBudget: ${data.budget||'Not provided'}\n\nProject details:\n${data.details}\n\nReply directly to this email to contact the client. This inquiry does not reserve a date.`
    });
    return reply(200);
  }catch{return reply(503,'We could not confirm delivery. Your details are still here. Please try again shortly or message Jackson on Instagram.');}
}
