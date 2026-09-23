import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../music.js',import.meta.url),'utf8');
const flush = async () => { for(let i=0;i<4;i++) await new Promise(resolve=>setImmediate(resolve)); };
function app({ muted=false, direct=false, deferred=false }={}) {
  const listeners=new Map(), windowEvents=new Map(), attrs={}, sources=[], fetches=[], pending=[];
  let contexts=0, engine, click;
  const button={hidden:true,dataset:{},setAttribute:(k,v)=>attrs[k]=v,addEventListener:(name,fn)=>{if(name==='click')click=fn;}};
  const document={currentScript:{src:'https://example.test/music.js'},hidden:false,
    getElementById:id=>id==='musicToggle'?button:{inert:!direct},
    addEventListener:(name,fn)=>listeners.set(name,fn)};
  const parameter=()=>({value:0,cancelAndHoldAtTime(){},cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
  class Engine {
    constructor(){contexts++;engine=this;this.state='suspended';this.currentTime=0;this.resumes=0;this.suspends=0;}
    addEventListener(){}
    createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
    createBufferSource(){const s={connect(){},disconnect(){},start(){s.started=true;},stop(time){s.stopTime=time;}};sources.push(s);return s;}
    async resume(){this.resumes++;this.state='running';}
    async suspend(){this.suspends++;this.state='suspended';}
    async decodeAudioData(data){return {track:data};}
  }
  let saved=muted?'true':null;
  vm.runInNewContext(code,{document,window:{AudioContext:Engine,addEventListener:(n,f)=>windowEvents.set(n,f)},URL,
    sessionStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v},
    fetch:url=>{fetches.push(String(url));const response={ok:true,arrayBuffer:async()=>String(url)};
      return deferred?new Promise(resolve=>pending.push(()=>resolve(response))):Promise.resolve(response);}});
  return {button,attrs,sources,fetches,pending,document,contexts:()=>contexts,engine:()=>engine,saved:()=>saved,
    emit:(name,detail)=>listeners.get(name)?.({detail}),click:()=>click(),windowEvent:name=>windowEvents.get(name)?.()};
}
test('No audio/network before opening; opening starts a quiet looping welcome',async()=>{
  const a=app();assert.equal(a.contexts(),0);assert.equal(a.fetches.length,0);
  a.emit('invitation:opened');await flush();
  assert.equal(a.contexts(),1);assert.equal(a.button.hidden,false);assert.equal(a.sources.length,1);
  assert(a.sources[0].buffer.track.endsWith('/welcome.mp3'));assert.equal(a.sources[0].loop,true);
  assert.equal(a.button.dataset.state,'playing');assert.equal(a.attrs['aria-pressed'],'true');
});
test('Scrolling crossfades between sections and returns to cached music',async()=>{
  const a=app();a.emit('invitation:opened');await flush();
  for(const [index,name] of [[1,'moments'],[2,'ceremony'],[3,'forever'],[0,'welcome']]){
    a.emit('invitation:chapter',index);await flush();assert(a.sources.at(-1).buffer.track.endsWith(`/${name}.mp3`));
  }
  assert.equal(a.fetches.length,4);assert(a.sources[0].stopTime>0);
});
test('Muting before a download completes prevents late audio',async()=>{
  const a=app({deferred:true});a.emit('invitation:opened');await flush();a.click();a.pending[0]();await flush();
  assert.equal(a.sources.length,0);assert.equal(a.button.dataset.state,'off');assert.equal(a.saved(),'true');
  a.click();await flush();assert.equal(a.sources.length,1);assert.equal(a.saved(),'false');
});
test('Fast scrolling starts only the latest requested section',async()=>{
  const a=app({deferred:true});a.emit('invitation:opened');await flush();
  a.emit('invitation:chapter',1);a.emit('invitation:chapter',3);await flush();
  a.pending[2]();await flush();a.pending[0]();a.pending[1]();await flush();
  assert.equal(a.sources.length,1);assert(a.sources[0].buffer.track.endsWith('/forever.mp3'));
});
test('Background tabs suspend; returning while muted never restarts audio',async()=>{
  const a=app();a.emit('invitation:opened');await flush();
  a.document.hidden=true;await a.emit('visibilitychange');assert.equal(a.engine().state,'suspended');
  a.document.hidden=false;await a.emit('visibilitychange');await flush();assert.equal(a.engine().state,'running');
  a.click();a.document.hidden=true;await a.emit('visibilitychange');a.document.hidden=false;await a.emit('visibilitychange');
  assert.equal(a.engine().state,'suspended');assert.equal(a.button.dataset.state,'off');
});
test('Saved mute and direct chapter visits require an explicit Play click',async()=>{
  const muted=app({muted:true});muted.emit('invitation:opened');await flush();assert.equal(muted.contexts(),0);
  const deep=app({direct:true});deep.emit('invitation:chapter',2);deep.windowEvent('pageshow');await flush();
  assert.equal(deep.button.hidden,false);assert.equal(deep.contexts(),0);
  deep.click();await flush();assert(deep.sources[0].buffer.track.endsWith('/ceremony.mp3'));
});
