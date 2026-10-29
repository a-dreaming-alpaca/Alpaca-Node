// Exercise the actual browser scripts through public wallpaper callbacks and DOM output.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Reports=require('./wallpaper/reports.js');
const key='alpaca-node.memory.v1';
const epoch=Date.parse('2026-10-29T00:00:00Z');

class Element {
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.hidden=false;this.text='';this.parentElement=null;
    this.offsetHeight=48;this.offsetWidth=500;this.width=420;this.height=560;
    const names=new Set();
    this.classList={toggle:(name,on)=>{if(on===undefined)on=!names.has(name);if(on)names.add(name);else names.delete(name);},remove:name=>names.delete(name)};
    this.style={setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];}};
  }
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text+this.children.map(item=>item.textContent).join('');}
  append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}}
  prepend(item){item.parentElement=this;this.children.unshift(item);}
  replaceChildren(...items){this.children=[];this.text='';this.append(...items);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(item=>item!==this);}
  getBoundingClientRect(){return {x:0,y:0,top:100,left:0,right:500,bottom:600,width:500,height:500};}
  getContext(){
    if(!this.context){
      this.context={canvas:this,getImageData:()=>({data:new Uint8ClampedArray(420*560*4)})};
      for(const name of ['beginPath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath','stroke','fill','ellipse','setTransform','clearRect','fillRect','fillText','save','restore','translate','drawImage'])this.context[name]=()=>{};
    }
    return this.context;
  }
}

function storage(seed){
  const values=new Map(seed?[[key,JSON.stringify(seed)]]:[]);
  return {getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,String(value)),removeItem:name=>values.delete(name)};
}
function savedMemory(){
  const reporter=new Reports();reporter.connection(true,epoch);
  return {version:1,savedAt:epoch+120000,core:reporter.snapshot(epoch+120000),
    latest:{text:'A quiet remembered quotation.',kind:'quote',author:'Course author',source:'lesson.pdf',time:epoch+100000}};
}
async function harness({saved=savedMemory(),store=storage(saved),at=epoch+3600000,manual=false}={}){
  const clock={now:at},elements=new Map(),selectors=new Map(),listeners=new Map(),timers=new Map(),pending=[];
  let timerId=0;
  const html=fs.readFileSync('wallpaper/index.html','utf8');
  for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))elements.set(id,new Element(id==='alpaca'||id==='ambient'?'canvas':'div'));
  elements.get('vram').parentElement=new Element('strong');
  for(const selector of ['main','.report-column','.telemetry-grid .stat-row','.workspace','.telemetry-grid','.session-info','.system-events'])selectors.set(selector,new Element());
  const body=new Element('body');
  const document={body,hidden:false,getElementById:id=>elements.get(id),querySelector:selector=>selectors.get(selector),createElement:tag=>new Element(tag),
    fonts:{ready:Promise.resolve()},addEventListener:(name,callback)=>listeners.set('document:'+name,callback)};
  const window={localStorage:store,innerWidth:1920,innerHeight:1080,devicePixelRatio:1,addEventListener:(name,callback)=>listeners.set('window:'+name,callback)};
  class TestDate extends Date {constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
  const math=Object.create(Math);math.random=()=>0;
  const environment={manual,events:[],cpu:20};
  const metrics=()=>({timestamp:new Date(clock.now).toISOString(),hostname:'Test-Alpaca',cpu:environment.cpu,cores:[20,20],memory:{percent:50,total:8*1073741824,used:4*1073741824},
    gpu:{source:'test',name:'Test GPU',utilization:10,memoryUsed:1073741824,memoryTotal:4*1073741824},network:{rx:0,tx:0},disk:{read:0,write:0},uptime:7200,volumes:[],events:{available:true,items:environment.events}});
  const schedule=(callback,delay,period=0)=>{const id=++timerId;timers.set(id,{callback,at:clock.now+delay,period});return id;};
  const fetch=(_url,{signal}={})=>{
    if(!environment.manual)return Promise.resolve({ok:true,json:async()=>metrics()});
    return new Promise((resolve,reject)=>{
      const request={resolve:data=>resolve({ok:true,json:async()=>data}),reject};pending.push(request);
      signal?.addEventListener('abort',()=>{const index=pending.indexOf(request);if(index>=0)pending.splice(index,1);reject(new Error('aborted'));},{once:true});
    });
  };
  const scope={document,window,Date:TestDate,Math:math,console,AbortController,fetch,
    getComputedStyle:()=>({getPropertyValue:()=>''}),ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,
    setTimeout:(callback,delay)=>schedule(callback,delay),clearTimeout:id=>timers.delete(id),
    setInterval:(callback,delay)=>schedule(callback,delay,delay),clearInterval:id=>timers.delete(id)};
  vm.createContext(scope);
  for(const file of ['reports.js','memory.js','app.js'])vm.runInContext(fs.readFileSync('wallpaper/'+file,'utf8'),scope,{filename:file});
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  await flush();
  const advance=async(milliseconds)=>{
    const target=clock.now+milliseconds;
    while(true){
      const entry=[...timers.entries()].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry)break;
      const [id,timer]=entry;clock.now=timer.at;
      if(timer.period)timer.at+=timer.period;else timers.delete(id);
      timer.callback();await flush();
    }
    clock.now=target;await flush();
  };
  return {clock,elements,environment,store,pending,advance,flush,listener:window.wallpaperPropertyListener,
    latest:()=>elements.get('report-stream').children[0],state:()=>JSON.parse(store.getItem(key)),
    respond:async(data=metrics())=>{assert(pending.length,'expected an in-flight telemetry request');pending.shift().resolve(data);await flush();},
    reject:async()=>{assert(pending.length,'expected an in-flight telemetry request');pending.shift().reject(new Error('offline'));await flush();},
    event:name=>listeners.get(name)?.({persisted:true})};
}

(async()=>{
  const seed=savedMemory(),running=await harness({saved:seed});
  assert.equal(running.latest().children.find(item=>item.tagName==='P').textContent,'“'+seed.latest.text+'”','the first heartbeat preserves the saved latest quotation');
  const originalTime=running.latest().children.find(item=>item.tagName==='TIME').textContent;
  assert.equal(running.elements.get('connection').textContent,'TELEMETRY CONNECTED');
  running.listener.applyUserProperties({personality:{value:'standard'},quotes:{value:true},smalltalk:{value:true},memory:{value:true}});
  assert.equal(running.state().core.chatterRemainingMs,60000,'initial standard properties do not reset the saved one-minute wait');
  assert.equal(running.state().latest.time,seed.latest.time,'a restored report retains its actual timestamp');
  const reloaded=await harness({store:running.store,at:running.clock.now+20000});
  assert.equal(reloaded.latest().children.find(item=>item.tagName==='TIME').textContent,originalTime,'reloading keeps the visible timestamp');
  assert.equal(reloaded.latest().children.find(item=>item.tagName==='P').textContent,'“'+seed.latest.text+'”');

  reloaded.listener.applyUserProperties({personality:{value:'quiet'},quotes:{value:false},smalltalk:{value:false}});
  assert.deepEqual(reloaded.state().core.settings,{personality:'quiet',quotesEnabled:false,smallTalkEnabled:false},'public Wallpaper Engine properties map to core settings');
  assert.equal(reloaded.state().core.chatterRemainingMs,null);
  reloaded.listener.applyUserProperties({memory:{value:false}});
  assert.equal(reloaded.store.getItem(key),null,'disabling memory clears its only localStorage key');
  reloaded.environment.events=[{key:'integration:event',timestamp:new Date(reloaded.clock.now+2000).toISOString(),message:'Network disconnected'}];
  await reloaded.advance(6000);
  assert.match(reloaded.latest().textContent,/connection just dropped/,'real reports continue when idle speech and persistence are disabled');
  assert.equal(reloaded.store.getItem(key),null,'subsequent heartbeats and save intervals cannot recreate disabled memory');
  reloaded.listener.applyUserProperties({memory:{value:true},personality:{value:'chatty'},quotes:{value:true}});
  assert.deepEqual(reloaded.state().core.settings,{personality:'chatty',quotesEnabled:true,smallTalkEnabled:false});
  assert.equal(reloaded.state().core.chatterRemainingMs,60000);

  const paused=await harness();await paused.advance(20000);
  paused.listener.setPaused(true);
  const beforePause=paused.state();assert.equal(beforePause.core.chatterRemainingMs,40000);
  await paused.advance(600000);
  assert.equal(paused.state().core.chatterRemainingMs,40000,'a long Wallpaper Engine pause does not consume idle time');
  paused.listener.setPaused(false);await paused.flush();
  paused.listener.applyUserProperties({personality:{value:'standard'}});
  assert.equal(paused.state().core.chatterRemainingMs,40000,'resume keeps the remaining forty seconds rather than waiting three minutes again');
  await paused.advance(38000);assert.equal(paused.latest().children.find(item=>item.tagName==='P').textContent,'“'+seed.latest.text+'”');
  await paused.advance(2000);assert.notEqual(paused.latest().children.find(item=>item.tagName==='P').textContent,'“'+seed.latest.text+'”','idle speech resumes when its preserved wait expires');

  const held=await harness({manual:true});held.listener.setPaused(true);
  const heldMemory=held.store.getItem(key),heldText=held.latest().textContent;
  await held.advance(1000);held.environment.cpu=95;await held.respond();
  assert.equal(held.latest().textContent,heldText,'an in-flight success cannot speak after pause');
  assert.equal(held.store.getItem(key),heldMemory,'an in-flight success cannot replace the paused snapshot');
  assert.notEqual(held.elements.get('cpu').textContent,'95','paused telemetry results are not applied to the display');
  held.environment.manual=false;held.listener.setPaused(false);await held.flush();
  assert.equal(held.elements.get('connection').textContent,'TELEMETRY CONNECTED');

  const rejected=await harness();rejected.environment.manual=true;await rejected.advance(2000);
  rejected.listener.setPaused(true);const textBeforeRejection=rejected.latest().textContent;
  await rejected.reject();
  assert.equal(rejected.latest().textContent,textBeforeRejection,'an in-flight failure cannot replace a paused latest report with a false link-loss message');

  const hidden=await harness({manual:true});hidden.event('window:pagehide');
  const hiddenMemory=hidden.store.getItem(key),hiddenText=hidden.latest().textContent;
  await hidden.respond();
  assert.equal(hidden.store.getItem(key),hiddenMemory,'a suspended page keeps the frozen lifecycle snapshot');
  assert.equal(hidden.latest().textContent,hiddenText,'a pagehide in-flight result cannot replace its saved report');
  hidden.environment.manual=false;hidden.event('window:pageshow');await hidden.flush();
  hidden.listener.applyUserProperties({personality:{value:'standard'}});
  assert.equal(hidden.state().core.chatterRemainingMs,60000,'a restored page resumes its stored remaining wait');
  console.log('PASS: actual app memory reload, heartbeat and timestamp retention, property mapping, persistence switch, paused countdowns and in-flight request isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
