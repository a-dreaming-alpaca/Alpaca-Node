const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Memory=require('./wallpaper/memory.js');
const key='alpaca-node.memory.v1';
let now=Date.parse('2026-10-29T00:00:00Z');
function storage(){
  const records=new Map();
  return {records,writes:0,removed:[],getItem(k){return records.get(k)??null;},setItem(k,v){this.writes++;records.set(k,v);},removeItem(k){this.removed.push(k);records.delete(k);}};
}
function report(){return {text:'A quiet machine.',kind:'chatter',time:now-1000};}
const disk=storage(),memory=new Memory({storage:disk,now:()=>now});
const core={version:1,settings:{personality:'standard',quotesEnabled:true,smallTalkEnabled:true},remainingMs:60000,recentQuotes:['One quote.']};
assert.equal(memory.save({core,latest:report()}),true);
assert.equal(disk.writes,1);
const originalTime=JSON.parse(disk.getItem(key)).savedAt;
const firstReport=report();
now+=1000;
assert.equal(memory.save({core:{recentQuotes:['One quote.'],remainingMs:60000,settings:{smallTalkEnabled:true,quotesEnabled:true,personality:'standard'},version:1},latest:firstReport}),true);
assert.equal(disk.writes,1,'equivalent data with reordered object keys is not written again');
const writes=disk.writes;
now+=1000;
assert.equal(memory.save({core,latest:firstReport}),true);
assert.equal(disk.writes,writes,'wall-clock changes alone do not write another record');
assert.equal(JSON.parse(disk.getItem(key)).savedAt,originalTime);
const restored=new Memory({storage:disk,now:()=>now});
assert.deepEqual(restored.read(),{core,latest:firstReport});
assert.equal(restored.save({core,latest:firstReport}),true);
assert.equal(disk.writes,writes,'read seeds the write deduplication cache');
const copy=restored.read();copy.core.recentQuotes.push('Changed outside storage.');
assert.deepEqual(new Memory({storage:disk,now:()=>now}).read().core.recentQuotes,['One quote.'],'read returns detached JSON data');

const htmlText='<img src=x onerror=alert(1)>';
const textOnly={text:htmlText,kind:'quote',time:now,author:'Author',source:'chapter.pdf',html:'<script>bad()</script>',cpu:99};
assert.equal(memory.save({core,latest:textOnly}),true);
assert.deepEqual(new Memory({storage:disk,now:()=>now}).read().latest,{text:htmlText,kind:'quote',time:now,author:'Author',source:'chapter.pdf'},'latest fields are whitelisted as text, never HTML');
for(const bad of [[],null,new Date(),{value:Infinity},{value:()=>{}},{value:BigInt(1)}])assert.equal(memory.save({core:bad,latest:null}),false);
const cyclic={};cyclic.self=cyclic;assert.equal(memory.save({core:cyclic}),false);
assert.equal(memory.save({core,latest:{...report(),time:now+1}}),false,'future report timestamps are rejected');
assert.equal(memory.save({core,latest:{...report(),kind:'script'}}),false);
assert.equal(memory.save({core,latest:{...report(),text:'x'.repeat(2001)}}),false);
assert.equal(memory.save({core,latest:{...report(),author:'x'.repeat(301)}}),false);
assert.equal(memory.save({core:{text:'羊'.repeat(12000)},latest:null}),false,'size cap counts UTF-8 bytes');

for(const raw of ['{broken',JSON.stringify({version:2,savedAt:now,core}),JSON.stringify({version:1,savedAt:now+60001,core}),JSON.stringify({version:1,savedAt:now-30*86400000-1,core}),JSON.stringify({version:1,savedAt:now,core:[]}),JSON.stringify({version:1,savedAt:now,core,latest:{...report(),time:now+1}}),' '.repeat(32769)]){
  disk.records.set(key,raw);
  assert.equal(new Memory({storage:disk,now:()=>now}).read(),null,'invalid, expired and oversized records are ignored');
}
disk.records.set(key,JSON.stringify({version:1,savedAt:now+60000,core,latest:null}));
assert.deepEqual(new Memory({storage:disk,now:()=>now}).read(),{core,latest:null},'small savedAt clock skew is tolerated');
disk.records.set(key,'{"version":1,"savedAt":'+now+',"core":{"__proto__":{"polluted":true}},"latest":null}');
assert.equal(new Memory({storage:disk,now:()=>now}).read(),null);
assert.equal({}.polluted,undefined);

disk.records.set('another-app','keep me');
assert.equal(memory.clear(),true);
assert.equal(disk.records.has(key),false);
assert.equal(disk.records.get('another-app'),'keep me');
assert.deepEqual(disk.removed,[key],'clear removes only this wallpaper key');
assert.equal(memory.save({core,latest:null}),true,'a fresh write is allowed after clear');
assert.equal(new Memory({storage:null}).read(),null);
assert.equal(new Memory({storage:null}).save({core}),false);
assert.equal(new Memory({storage:null}).clear(),false);
const blocked=new Memory({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('quota');},removeItem(){throw Error('blocked');}},now:()=>now});
assert.equal(blocked.read(),null);assert.equal(blocked.save({core}),false);assert.equal(blocked.clear(),false);
const quota=storage(),retry=new Memory({storage:quota,now:()=>now});
const workingSet=quota.setItem;
quota.setItem=()=>{throw Error('quota');};assert.equal(retry.save({core}),false);
quota.setItem=workingSet;assert.equal(retry.save({core}),true,'failed writes can be retried');

const context={window:{}};
Object.defineProperty(context.window,'localStorage',{get(){throw Error('Access denied');}});
vm.runInNewContext(fs.readFileSync('./wallpaper/memory.js','utf8'),context);
const noStorage=new context.window.AlpacaMemory();
assert.equal(noStorage.read(),null);assert.equal(noStorage.save({core}),false);
console.log('PASS: memory round-trip, bounded text records, UTF-8 limits, corruption/age checks, write deduplication, safe clear and unavailable storage.');
