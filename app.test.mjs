import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./app.js',import.meta.url),'utf8');

// Exercise the real player handlers without adding a browser dependency.
function playerHarness() {
  const nodes=[];
  function createElement(tag) {
    const attrs=new Map(), listeners=new Map();
    const node={tag,children:[],dataset:{},paused:true,playCalls:0,
      append(...children){this.children.push(...children);},
      setAttribute(key,value){attrs.set(key,value);},
      getAttribute(key){return attrs.get(key)??null;},
      set src(value){attrs.set('src',value);},
      addEventListener(type,handler){listeners.set(type,handler);},
      async emit(type){await listeners.get(type)?.();},
      pause(){this.paused=true;},
      async play(){
        this.playCalls++;
        if(this.rejectPlay)throw new Error('Playback blocked');
        this.paused=false;
        await this.emit('play');
      },
    };
    nodes.push(node);return node;
  }
  const roots=new Map();
  const document={createElement,
    querySelector(selector){if(!roots.has(selector))roots.set(selector,createElement('root'));return roots.get(selector);},
    querySelectorAll(selector){assert.equal(selector,'video');return nodes.filter(n=>n.tag==='video');},
  };
  const context=vm.createContext({document,URL,fetch:()=>new Promise(()=>{})});
  vm.runInContext(source,context);
  function makeFilm(title,index) {
    const card=context.film({title,orientation:'portrait',collection:'Test collection',description:'Test film',
      src:`https://photos.smugmug.com/${title}.mp4`,poster:'https://photos.smugmug.com/poster.jpg',
      page:`https://jacksonharris.smugmug.com/7L-Studio-Films/i-${title}`},index);
    const [video,button]=card.children[0].children;
    return {video,button,error:card.children[1].children.at(-1)};
  }
  return {makeFilm};
}

test('film starts only on request, enables sound, and pauses the previous film',async()=>{
  const {makeFilm}=playerHarness();
  const first=makeFilm('First',0),second=makeFilm('Second',1);
  for(const {video} of [first,second]){
    assert.equal(video.getAttribute('src'),null);
    assert.equal(video.playCalls,0);
    assert.equal(video.muted,true);
  }
  await first.button.emit('click');
  assert.equal(first.video.muted,false);
  assert.equal(first.video.paused,false);
  assert.equal(first.video.controls,true);
  assert.equal(first.button.hidden,true);
  assert.equal(first.video.getAttribute('src'),'https://photos.smugmug.com/First.mp4');
  await second.button.emit('click');
  assert.equal(first.video.paused,true);
  assert.equal(second.video.muted,false);
  assert.equal(second.video.paused,false);
  // Native controls must also prevent overlap and preserve the visitor's mute choice.
  first.video.muted=true;
  await first.video.play();
  assert.equal(second.video.paused,true);
  assert.equal(first.video.muted,true);
});

test('rejected playback restores a usable Play button and retry clears the error',async()=>{
  const {video,button,error}=playerHarness().makeFilm('Retry',0);
  video.rejectPlay=true;
  await button.emit('click');
  assert.equal(button.hidden,false);
  assert.match(error.textContent,/Try again/);
  video.rejectPlay=false;
  await button.emit('click');
  assert.equal(button.hidden,true);
  assert.equal(error.textContent,'');
  assert.equal(video.paused,false);
});
