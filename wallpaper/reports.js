(function(root) {
  'use strict';
  // DSA_QUOTE_POOL_START: refreshed by tools/sync_dsa_quotes.py.
  const DSA_QUOTES=[{"quote":"Computer science should be called computing science, for the same reason why surgery is not called knife science.","author":"E. Dijkstra","source":"01.算法概论\\01.intro.A.Compu+Algor.pdf"},{"quote":"Sometimes it is the people no one can imagine anything of who do the things no one can imagine.","author":"A. Turing","source":"01.算法概论\\01.intro.B1.Model.TM.pdf"},{"quote":"To measure is to know. If you can not measure it, you can not improve it.","author":"Lord Kelvin","source":"01.算法概论\\01.intro.B1.Model.TM.pdf"},{"quote":"Mathematics is more in need of good notations than of new theorems.","author":"A. Turing","source":"01.算法概论\\01.intro.C1.Asymp.Big_o.pdf"},{"quote":"Any time you are stuck on a problem, introduce more notation.","author":"Chris Skinner","source":"01.算法概论\\01.intro.C1.Asymp.Big_o.pdf"},{"quote":"Computational problems can be feasibly computed on some computational device only if they can be computed in polynomial time.","author":"A. Cobham & J. Edmonds","source":"01.算法概论\\01.intro.C2.Asymp.Poly+Tractable.pdf"},{"quote":"He calculated just as men breathe, as eagles sustain themselves in the air.","author":"","source":"01.算法概论\\01.intro.D1.Analysis.BOE.pdf"},{"quote":"Go To Statement Considered Harmful.","author":"E. Dijkstra, 1968","source":"01.算法概论\\01.intro.D2.Analysis.Series.pdf"},{"quote":"A good graphic is a microscope to see patterns in numbers.","author":"Edward Tufte","source":"01.算法概论\\01.intro.D3.Analysis.Vis.pdf"},{"quote":"All knowledge begins with sensory experience, and especially with sight.","author":"Leonardo. da Vinci","source":"01.算法概论\\01.intro.D3.Analysis.Vis.pdf"},{"quote":"Repetitive diligence is just another form of laziness.","author":"","source":"01.算法概论\\01.intro.F1.DP.fib.pdf"},{"quote":"Make it work, make it right, make it fast.","author":"","source":"01.算法概论\\01.intro.F2.DP.lcs.pdf"},{"quote":"A scientist discovers that which exists, an engineer creates that which never was.","author":"","source":"02.向量\\02.Vector.B1.insert+remove.pdf"},{"quote":"Outward failure may be a manifested variant of inward success.","author":"","source":"02.向量\\02.Vector.C4.binSearch_C.pdf"},{"quote":"Those too big to pass through are our friends.","author":"","source":"02.向量\\02.Vector.F2.Bitmap.app.pdf"},{"quote":"Don't lose the link.","author":"Robin Milner","source":"03.列表\\03.List.A1.call-by-posi.pdf"},{"quote":"Yessiree. We do not doubt his word, an stack ourselfs into the bus like flapjacks.","author":"","source":"04.栈与队列\\04.S+Q.B1.call_stack.principle+storage.pdf"},{"quote":"A hero is born among a hundred, a wise man is found among a thousand, but an accomplished one might not be found even among a hundred thousand men.","author":"","source":"04.栈与队列\\04.S+Q.K.MaxStack+MaxQueue.pdf"},{"quote":"Anyone who loves his father or mother more than me is not worthy of me; anyone who loves his son or daughter more than me is not worthy of me.","author":"","source":"05.二叉树\\05.Binary_Tree.B2.BinTree.Impl.pdf"},{"quote":"Two roads diverged in a yellow wood And sorry I could not travel both","author":"","source":"05.二叉树\\05.Binary_Tree.B2.BinTree.Impl.pdf"},{"quote":"Although we've come to the end of the road Still I can't let you go","author":"","source":"05.二叉树\\05.Binary_Tree.C3.Traverse.Inorder.pdf"},{"quote":"No two leaves are exactly alike.","author":"Leibniz","source":"05.二叉树\\05.Binary_Tree.C4.Traverse.Succ.pdf"},{"quote":"No matter where they take us, We'll find our own way back.","author":"","source":"05.二叉树\\05.Binary_Tree.C7.Traverse.Rebuild.pdf"},{"quote":"There's nothing in your head the sorting hat can't see. So try me on and I will tell you where you ought to be.","author":"","source":"06.二叉搜索树\\06.BST.A1.Seach.call-by-key.pdf"},{"quote":"Good order is the foundation of all good things.","author":"","source":"06.二叉搜索树\\06.BST.A2.Search.inorder.pdf"},{"quote":"The maxim \"Nothing avails but perfection\" may be spelt shorter: \"Paralysis.\"","author":"","source":"06.二叉搜索树\\06.BST.D1.AVL.Asymp_Balance.pdf"},{"quote":"Your instinct, rather than precision stabbing, is more about just random bludgeoning.","author":"","source":"07.搜索树应用\\07.BSTA.A.Int_Tree.pdf"},{"quote":"When we stand on the tops of Things And like the Trees, look down The smoke all cleared away from it And Mirrors on the scene Just laying light","author":"","source":"08.高级搜索树\\08.ABST.A1.Splay.Splay1.pdf"},{"quote":"640K ought to be enough for anybody.","author":"B. Gates, 1981","source":"08.高级搜索树\\08.ABST.B1.B-Tree.Hierarchy.pdf"},{"quote":"We are shaped by our thoughts; we become what we think.","author":"Buddha","source":"09.词典\\09.Dict.A1.hashing.Call-by-Object.pdf"},{"quote":"Man's thought is shaped by his tongue.","author":"Anonymous","source":"09.词典\\09.Dict.A1.hashing.Call-by-Object.pdf"},{"quote":"Every mistake I've ever made Has been rehashed and then replayed As I got lost along the way.","author":"","source":"09.词典\\09.Dict.C4.Solve_Collision.Insert+Rehash.pdf"},{"quote":"Don't put all your eggs in one basket.","author":"","source":"09.词典\\09.Dict.D1.Bucketsort+MaxGap.pdf"},{"quote":"God made the integers; all else is the work of man.","author":"L. Kronecker","source":"09.词典\\09.Dict.D2.Radixsort+IntSort.pdf"},{"quote":"The purpose of computing is insight, not numbers.","author":"Hamming","source":"09.词典\\09.Dict.D3.countingsort.pdf"},{"quote":"Keep it simple, stupid.","author":"K. Johnson","source":"10.图基础\\10.Graph.D.DFS.pdf"},{"quote":"And as we walk, we must make the pledge that we shall always march ahead. We cannot turn back.","author":"","source":"10.图基础\\10.Graph.E.TS.pdf"},{"quote":"Begin with the end in mind.","author":"","source":"10.图基础\\10.Graph.E.TS.pdf"},{"quote":"The hurricane seeks the shortest road by the no-road, and suddenly ends its search in the nowhere.","author":"","source":"11.图进阶\\11.Graph.B2.Dijk.SP.pdf"},{"quote":"I cannot choose the best. The best chooses me.","author":"","source":"12.优先级队列\\12.PQ.A.motivation+ADT.pdf"},{"quote":"I have scaled the peak and found no shelter in fame's bleak and barren height","author":"","source":"12.优先级队列\\12.Pq.B3.CBH.delmax.pdf"},{"quote":"We are the champions. No time for losers 'Cause we are the champions of the world","author":"","source":"12.优先级队列\\12.PQ.C2.Tournament.Loser_Tree.pdf"},{"quote":"God's right hand is gentle But terrible is his left hand","author":"","source":"12.优先级队列\\12.PQ.E1.LH.meld+vine.pdf"},{"quote":"The farther backward you can look, the farther forward you can see.","author":"","source":"13.串\\13.String.B2.Kmp.lookup-table.pdf"},{"quote":"I have learned more from my failures ... failures are much more fun to hear about afterwards; they are not so funny at the time.","author":"","source":"13.串\\13.String.C3.BM_BC.Construct_BC.pdf"},{"quote":"Wrong cannot afford defeat, but Right can.","author":"","source":"13.串\\13.String.D2.Bm_GS.Construct_GS.pdf"},{"quote":"Every entity is like a living mirror, containing an image of the universe, in its own way.","author":"Leibniz","source":"13.串\\13.String.E1.KR.Strings_are_number.pdf"},{"quote":"All things are number.","author":"Pythagoras","source":"13.串\\13.String.E1.KR.Strings_are_number.pdf"},{"quote":"God kisses the finite in his love and man the infinite.","author":"","source":"13.串\\13.String.E3.KR.bit_width.pdf"},{"quote":"The Great walks with the Small without fear. The Middle keeps aloof.","author":"","source":"14.排序\\14.Sorting.A7.Quicksort.LGU.pdf"},{"quote":"They are like the leaves which a tempest whirls up and scatters in every direction and then allows to fall.","author":"","source":"14.排序\\14.Sorting.C3.Shellsort.More_sequences.pdf"}];
  // DSA_QUOTE_POOL_END
  const SMALL_TALK=[
    'Nothing urgent. Back to imaginary grass.',
    "You do your thing. I'll watch the numbers.",
    'A quiet machine. A happy alpaca.',
    'Still grazing. Still watching.',
    'Excellent uptime. Questionable grazing opportunities.',
    'No grass detected. Monitoring will have to do.',
    'My ears are up. The numbers can relax.',
    'A little silence looks good on this terminal.',
    'One alpaca. Many numbers. Steady watch.',
    'Quiet pastures make good thinking spaces.',
    'These hooves were made for watching.',
    'I brought the ears. You brought the machine.'
  ];
  // Latest message remains visible; old messages retire for 90s after replacement.
  function historyLayout(history,now){
    return history.filter((report,index)=>index===0||now-(report.retiredAt??report.born)<90000)
      .map((report,index)=>({report,scale:[1,.87,.75][index],opacity:index===0?1:[1,.72,.38][index]*Math.min(1,Math.max(0,(90000-(now-(report.retiredAt??report.born)))/20000))}));
  }
  const PERSONALITIES={
    quiet:{wait:360000,min:480000,range:240000},
    standard:{wait:180000,min:180000,range:180000},
    chatty:{wait:60000,min:60000,range:120000}
  };
  const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const validSettings=value=>value && typeof value==='object' && !Array.isArray(value)
    && owns(PERSONALITIES,value.personality)
    && typeof value.quotesEnabled==='boolean' && typeof value.smallTalkEnabled==='boolean';
  const timestamp=value=>Number.isFinite(value)&&value>=0;
  const cooldownKey=value=>typeof value==='string' && /^(cpu|gpu|memory|disk:[^\x00-\x1f]{1,64})$/.test(value);
  // Pure decision logic; timestamps are supplied by the caller for deterministic checks.
  class AlpacaReports {
    constructor({quotes=DSA_QUOTES,random=Math.random}={}){
      this.connected=false;this.everConnected=false;this.seen=new Set();this.alerts=new Map();this.queue=[];
      this.lastSent=-Infinity;this.lastSample=0;this.random=random;this.quotes=quotes;
      this.recentQuotes=[];this.recentTalk=[];this.nextChatterAt=Infinity;this.resumePending=false;
      this.settings={personality:'standard',quotesEnabled:true,smallTalkEnabled:true};
    }
    static historyLayout(history,now){return historyLayout(history,now);}
    canChatter(){return (this.settings.quotesEnabled&&this.quotes.length>0)||this.settings.smallTalkEnabled;}
    postponeChatter(now){this.nextChatterAt=this.canChatter()?now+PERSONALITIES[this.settings.personality].wait:Infinity;}
    configure(options,now){
      if(!options || typeof options!=='object' || Array.isArray(options) || !timestamp(now))return false;
      const next={...this.settings};
      if(owns(PERSONALITIES,options.personality))next.personality=options.personality;
      for(const key of ['quotesEnabled','smallTalkEnabled'])if(typeof options[key]==='boolean')next[key]=options[key];
      if(Object.keys(next).every(key=>next[key]===this.settings[key]))return false;
      const previousEnabled=this.canChatter(),profileChanged=next.personality!==this.settings.personality;
      this.settings=next;
      if(!this.canChatter())this.nextChatterAt=Infinity;
      else if((this.connected||this.resumePending)&&(profileChanged||!previousEnabled||!Number.isFinite(this.nextChatterAt)))this.postponeChatter(now);
      return true;
    }
    snapshot(now){
      const cooldowns=[];
      for(const [key,state] of this.alerts){
        if(cooldownKey(key)&&timestamp(state.last)&&now-state.last<90000)cooldowns.push({key,last:Math.min(now,state.last)});
      }
      return {version:1,settings:{...this.settings},everConnected:this.everConnected,wasConnected:this.connected||this.resumePending,
        chatterRemainingMs:Number.isFinite(this.nextChatterAt)?Math.min(720000,Math.max(0,this.nextChatterAt-now)):null,
        recentQuotes:this.recentQuotes.slice(-10),recentTalk:this.recentTalk.slice(-5),cooldowns:cooldowns.slice(-32),
        lastSentAt:timestamp(this.lastSent)&&now-this.lastSent<8000?Math.min(now,this.lastSent):null};
    }
    restore(saved,now){
      if(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.version!==1||!timestamp(now)||!validSettings(saved.settings))return false;
      if(typeof saved.everConnected!=='boolean'||typeof saved.wasConnected!=='boolean'||(saved.wasConnected&&!saved.everConnected))return false;
      if(saved.chatterRemainingMs!==null&&(!Number.isFinite(saved.chatterRemainingMs)||saved.chatterRemainingMs<0||saved.chatterRemainingMs>720000))return false;
      if(saved.lastSentAt!==null&&!timestamp(saved.lastSentAt))return false;
      const strings=(items,max)=>Array.isArray(items)&&items.length<=max&&items.every(text=>typeof text==='string'&&text.length<=8192);
      if(!strings(saved.recentQuotes,10)||!strings(saved.recentTalk,5)||!Array.isArray(saved.cooldowns)||saved.cooldowns.length>32)return false;
      if(!saved.cooldowns.every(item=>item&&typeof item==='object'&&cooldownKey(item.key)&&timestamp(item.last)))return false;
      this.settings={personality:saved.settings.personality,quotesEnabled:saved.settings.quotesEnabled,smallTalkEnabled:saved.settings.smallTalkEnabled};this.connected=false;this.everConnected=saved.everConnected;this.resumePending=saved.wasConnected;
      this.lastSample=0;this.seen=new Set();this.queue=[];this.alerts=new Map();
      // Persist only completed alert cooldowns, never evidence of continuous load or a recovery to announce.
      for(const item of saved.cooldowns){
        const last=Math.min(now,item.last);
        if(now-last<90000)this.alerts.set(item.key,{since:null,sent:false,last});
      }
      const knownQuotes=new Set(this.quotes.map(item=>item.quote));
      this.recentQuotes=saved.recentQuotes.filter(text=>knownQuotes.has(text));
      this.recentTalk=saved.recentTalk.filter(text=>SMALL_TALK.includes(text));
      this.nextChatterAt=this.canChatter()&&saved.chatterRemainingMs!==null?now+saved.chatterRemainingMs:Infinity;
      this.lastSent=saved.lastSentAt===null?-Infinity:Math.min(now,saved.lastSentAt);
      return true;
    }
    resetEvidence(){
      for(const state of this.alerts.values()){state.since=null;state.sent=false;}
      this.queue=this.queue.filter(item=>item.kind==='event');
    }
    chatter(now){
      if(!this.canChatter())return [];
      let report;
      const canQuote=this.settings.quotesEnabled&&this.quotes.length>0;
      if(canQuote&&(!this.settings.smallTalkEnabled||this.random()<.7)){
        const available=this.quotes.filter(q=>!this.recentQuotes.includes(q.quote));
        const quote=(available.length?available:this.quotes)[Math.floor(this.random()*(available.length||this.quotes.length))];
        this.recentQuotes.push(quote.quote);this.recentQuotes=this.recentQuotes.slice(-10);
        report={text:quote.quote,author:quote.author,source:quote.source,kind:'quote',time:now};
      }else{
        const available=SMALL_TALK.filter(text=>!this.recentTalk.includes(text));
        const text=available[Math.floor(this.random()*available.length)];
        this.recentTalk.push(text);this.recentTalk=this.recentTalk.slice(-5);
        report={text,kind:'chatter',time:now};
      }
      const profile=PERSONALITIES[this.settings.personality];
      this.nextChatterAt=now+profile.min+Math.floor(this.random()*profile.range);
      this.lastSent=now;
      return [report];
    }
    connection(online,now){
      if(online===this.connected)return [];
      this.connected=online;
      if(!online){this.resetEvidence();this.queue=[];this.lastSample=0;this.nextChatterAt=Infinity;this.resumePending=false;return [{text:"I've lost my telemetry link. I can't see current readings.",kind:'link',time:now}];}
      if(this.resumePending){
        this.resumePending=false;
        if(this.canChatter()&&!Number.isFinite(this.nextChatterAt))this.postponeChatter(now);
        return [];
      }
      const text=this.everConnected?"I'm connected again. I can see your machine now.":"I'm connected. I'll keep an eye on your machine.";
      this.everConnected=true;this.lastSent=now;this.postponeChatter(now);return [{text,kind:'link',time:now}];
    }
    sample(data,now){
      const sampleAt=Date.parse(data.timestamp);
      if(!Number.isFinite(sampleAt)||sampleAt===this.lastSample)return [];
      const gap=this.lastSample && (sampleAt-this.lastSample>10000||sampleAt<this.lastSample);
      if(gap){this.resetEvidence();this.postponeChatter(now);}
      const initial=!this.lastSample;this.lastSample=sampleAt;
      const items=data.events?.items||[];
      for(const event of [...items].reverse()){
        if(this.seen.has(event.key))continue;
        this.seen.add(event.key);
        if(initial || now-Date.parse(event.timestamp)>60000)continue;
        const phrases={'Network connected':"The network just connected. I've noted it.",'Network disconnected':"A network connection just dropped. I've noted it.",'Campus network disconnected':"Your campus connection just went offline. I'm watching for its return.",'Campus network reconnected':"AutoConnect restored your campus connection.",'Resumed from sleep':"You're back. I saw Windows wake from sleep.",'Entered sleep':"Windows recorded a sleep event.",'Windows started':"Windows has started. I'm on watch."};
        const text=phrases[event.message];
        if(text && !this.queue.some(q=>q.text===text))this.queue.push({text,kind:'event',time:Date.parse(event.timestamp),expires:now+45000});
      }
      if(this.seen.size>200)this.seen=new Set([...this.seen].slice(-100));
      const gpu=data.gpu||{}, mem=data.memory?.percent;
      const rules=[
        ['cpu',data.cpu,80,65,()=>`CPU has stayed busy at ${Math.round(data.cpu)}%. I'm watching the load.`],
        ['gpu',gpu.utilization,90,75,()=>`Your GPU is working hard at ${Math.round(gpu.utilization)}%. I'm watching it.`],
        ['memory',mem,85,78,()=>`Memory is getting crowded at ${Math.round(mem)}%. I'm keeping watch.`],
      ];
      for(const volume of data.volumes||[])if(volume.total>0)rules.push(['disk:'+volume.name,100-volume.free/volume.total*100,90,85,()=>`${volume.name} has only ${(volume.free/1073741824).toFixed(1)} GiB free. A little cleanup may help.`]);
      const eligible=[];
      for(const [key,value,high,low,message] of rules){
        let state=this.alerts.get(key);
        if(!Number.isFinite(value)){if(state){state.since=null;state.sent=false;}continue;}
        if(!state){state={since:null,sent:false,last:-Infinity};this.alerts.set(key,state);}
        if(value>=high){
          this.queue=this.queue.filter(q=>q.key!==key);
          if(state.since===null)state.since=sampleAt;
          if(sampleAt-state.since>=8000 && now-state.last>=90000)eligible.push({key,state,text:message(),kind:'load',time:now});
        }else if(value<=low){
          if(state.sent && !this.queue.some(q=>q.key===key))this.queue.push({key,text:key.startsWith('disk:')?`${key.slice(5)} has more free space now.`:`${{cpu:'CPU load',gpu:'GPU load',memory:'Memory pressure'}[key]} has eased. Looking better.`,kind:'recovery',time:now,expires:now+30000});
          state.since=null;state.sent=false;
        }else if(!state.sent){state.since=null;}
      }
      this.queue=this.queue.filter(q=>q.expires>now);
      if(now-this.lastSent<8000)return [];
      let report=this.queue.shift();
      if(!report && eligible.length){const alert=eligible.sort((a,b)=>a.state.last-b.state.last)[0];alert.state.sent=true;alert.state.last=now;report={text:alert.text,kind:alert.kind,time:now};}
      if(report){this.lastSent=now;this.postponeChatter(now);return [report];}
      // A small reserved GPU memory pool filling up is normal on an iGPU.
      // Keep displaying memory usage, but do not alert or suppress chatter for it.
      const busy=data.cpu>=65 || gpu.utilization>=75 || mem>=85;
      if(busy || this.queue.length){this.postponeChatter(now);return [];}
      if(this.connected && now>=this.nextChatterAt && Math.abs(now-sampleAt)<=10000)return this.chatter(now);
      return [];
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=AlpacaReports;
  else root.AlpacaReports=AlpacaReports;
})(typeof window!=='undefined'?window:globalThis);
