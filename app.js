const lightbox = document.querySelector('#lightbox');
const enlargedImage = document.querySelector('#lightbox-image');
const caption = document.querySelector('#lightbox-caption');
let opener;
function element(tag, className, text) {
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text)el.textContent=text;
  return el;
}
function link(url,text) {
  const a=element('a','source-link',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function photo(item,index) {
  const button=element('button',`photo ${[0,3].includes(index)?'wide':'narrow'}`);
  button.type='button';button.dataset.photo='';button.setAttribute('aria-label',`Enlarge ${item.title}`);
  const img=element('img');img.src=item.src;img.alt=item.alt;img.loading='lazy';img.decoding='async';img.width=1200;img.height=800;
  const text=element('span');text.append(element('span','',item.title),element('b','','↗'));
  button.append(img,text,element('small','',item.collection));
  button.addEventListener('click',()=>{opener=button;enlargedImage.src=item.src;enlargedImage.alt=item.alt;caption.textContent=`${item.title} — ${item.collection}`;lightbox.showModal();});
  img.addEventListener('error',()=>{button.disabled=true;text.textContent='Photograph unavailable';});
  return button;
}
function film(item,index) {
  const card=element('article',`film-card ${index===0?'feature':item.orientation}`);
  const frame=element('div','video-frame');
  const video=element('video');video.poster=item.poster;video.preload='none';video.playsInline=true;video.muted=true;video.defaultMuted=true;video.setAttribute('aria-label',item.title);
  const play=element('button','play-film',`Play ${item.title}`);play.type='button';play.setAttribute('aria-label',`Play ${item.title}`);
  const error=element('p','video-error');error.setAttribute('role','status');
  play.addEventListener('click',async()=>{
    document.querySelectorAll('video').forEach(v=>{if(v!==video)v.pause();});
    if(!video.getAttribute('src'))video.src=item.src;
    video.controls=true;play.hidden=true;error.textContent='';
    try{await video.play();}catch{play.hidden=false;error.textContent='Playback could not start. Try again or view the source below.';}
  });
  video.addEventListener('play',()=>document.querySelectorAll('video').forEach(v=>{if(v!==video)v.pause();}));
  video.addEventListener('error',()=>{play.hidden=false;error.textContent='This clip is unavailable here. View it on SmugMug below.';});
  frame.append(video,play);
  const info=element('div','film-info');info.append(element('p','eyebrow',`${String(index+1).padStart(2,'0')} / ${item.collection}`),element('h3','',item.title),element('p','film-description',item.description),link(item.page,'View source ↗'),error);
  card.append(frame,info);return card;
}
async function loadPortfolio() {
  const status=document.querySelector('#portfolio-status');
  try{
    const res=await fetch('/api/portfolio');if(!res.ok)throw new Error('unavailable');
    const data=await res.json();
    if(data.hero){const image=document.querySelector('#hero-photo');image.src=data.hero.src;image.alt=data.hero.alt;document.querySelector('#hero-caption').textContent=data.hero.title;}
    else{document.querySelector('.hero-image').hidden=true;}
    document.querySelector('#photo-grid').replaceChildren(...data.photos.map(photo));
    const ordered=[...data.videos].sort((a,b)=>Number(a.orientation==='portrait')-Number(b.orientation==='portrait'));
    document.querySelector('#video-grid').replaceChildren(...ordered.map(film));
    status.textContent=data.photos.length?'':'The selected photographs are currently unavailable. Explore the collection below.';
    document.body.dataset.mediaSource=data.source;
  }catch{
    status.textContent='Selected work is temporarily unavailable. You can still explore the collection below or inquire about a project.';
    document.querySelector('.hero-image').hidden=true;
    document.querySelector('#video-grid').append(link('https://www.instagram.com/jackson.harris___/reel/Dd8aUajTZ2d/','Watch selected work on Instagram ↗'));
  }
}
document.querySelector('#close-lightbox').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{if(event.target===lightbox){const b=lightbox.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)lightbox.close();}});
lightbox.addEventListener('close',()=>opener?.focus());
loadPortfolio();
