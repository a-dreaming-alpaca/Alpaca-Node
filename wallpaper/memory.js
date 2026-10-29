(function(root) {
  'use strict';
  const DEFAULT_KEY='alpaca-node.memory.v1';
  const MAX_BYTES=32*1024;
  const MAX_AGE=30*24*60*60*1000;
  const KINDS=new Set(['link','event','load','recovery','quote','chatter']);
  const isPlain=value=>value!==null&&typeof value==='object'&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);

  // Count UTF-8 bytes rather than UTF-16 characters, including CJK quote sources.
  function byteLength(text){
    let bytes=0;
    for(let i=0;i<text.length;i++){
      const code=text.charCodeAt(i);
      if(code<0x80)bytes++;
      else if(code<0x800)bytes+=2;
      else if(code>=0xd800&&code<=0xdbff&&i+1<text.length&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){bytes+=4;i++;}
      else bytes+=3;
      if(bytes>MAX_BYTES)return bytes;
    }
    return bytes;
  }

  // Canonical JSON prevents key insertion order from causing unnecessary writes.
  // Only data records are accepted; no prototypes, functions or object references survive.
  function copyData(value,ancestors=new Set(),depth=0){
    if(depth>24)throw new Error('Memory record is too deeply nested');
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(!Array.isArray(value)&&!isPlain(value))throw new Error('Memory record must contain JSON data');
    if(ancestors.has(value))throw new Error('Cyclic memory record');
    ancestors.add(value);
    const result=Array.isArray(value)?value.map(item=>copyData(item,ancestors,depth+1)):{};
    if(!Array.isArray(value))for(const key of Object.keys(value).sort()){
      if(key==='__proto__'||key==='prototype'||key==='constructor')throw new Error('Invalid memory key');
      result[key]=copyData(value[key],ancestors,depth+1);
    }
    ancestors.delete(value);
    return result;
  }

  function latestRecord(value,now){
    if(value===null||value===undefined)return null;
    if(!isPlain(value)||typeof value.text!=='string'||!value.text.trim()||value.text.length>2000||!KINDS.has(value.kind)||!Number.isFinite(value.time)||value.time<0||value.time>now)throw new Error('Invalid latest report');
    const latest={text:value.text,kind:value.kind,time:value.time};
    for(const field of ['author','source'])if(value[field]!==undefined){
      if(typeof value[field]!=='string'||value[field].length>300)throw new Error('Invalid report attribution');
      latest[field]=value[field];
    }
    return latest;
  }

  class AlpacaMemory {
    constructor({storage,key=DEFAULT_KEY,now=Date.now}={}){
      this.key=typeof key==='string'&&key.length>0&&key.length<=200?key:DEFAULT_KEY;
      this.now=typeof now==='function'?now:Date.now;
      this.storage=null;
      this.lastPayload=null;
      try {
        const candidate=storage===undefined?root.localStorage:storage;
        if(candidate&&typeof candidate.getItem==='function'&&typeof candidate.setItem==='function'&&typeof candidate.removeItem==='function')this.storage=candidate;
      } catch (_) { /* Private/disabled storage must never prevent the wallpaper starting. */ }
    }
    read(){
      this.lastPayload=null;
      if(!this.storage)return null;
      try {
        const now=this.now(),raw=this.storage.getItem(this.key);
        if(!Number.isFinite(now)||typeof raw!=='string'||byteLength(raw)>MAX_BYTES)return null;
        const envelope=JSON.parse(raw);
        if(!isPlain(envelope)||envelope.version!==1||!Number.isFinite(envelope.savedAt)||envelope.savedAt<0||envelope.savedAt>now+60000||now-envelope.savedAt>MAX_AGE||!isPlain(envelope.core))return null;
        const payload={core:copyData(envelope.core),latest:latestRecord(envelope.latest,now)};
        this.lastPayload=JSON.stringify(copyData(payload));
        return payload;
      } catch (_) { return null; }
    }
    save({core,latest=null}={}){
      if(!this.storage)return false;
      try {
        const now=this.now();
        if(!Number.isFinite(now)||now<0||!isPlain(core))return false;
        const payload={core:copyData(core),latest:latestRecord(latest,now)};
        const signature=JSON.stringify(copyData(payload));
        if(signature===this.lastPayload)return true;
        const raw=JSON.stringify({version:1,savedAt:now,...payload});
        if(byteLength(raw)>MAX_BYTES)return false;
        this.storage.setItem(this.key,raw);
        this.lastPayload=signature;
        return true;
      } catch (_) { return false; }
    }
    clear(){
      this.lastPayload=null;
      if(!this.storage)return false;
      try { this.storage.removeItem(this.key);return true; }
      catch (_) { return false; }
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=AlpacaMemory;
  else root.AlpacaMemory=AlpacaMemory;
})(typeof window!=='undefined'?window:globalThis);
