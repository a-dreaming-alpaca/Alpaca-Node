const assert=require('node:assert/strict');
const Reports=require('./wallpaper/reports.js');
const start=Date.parse('2026-09-30T00:00:00Z');
function sample(seconds,cpu=20,events=[]){return {timestamp:new Date(start+seconds*1000).toISOString(),cpu,memory:{percent:50},gpu:{utilization:10},events:{items:events},volumes:[]};}
const r=new Reports();
assert.equal(r.connection(true,start).length,1);
assert.equal(r.connection(true,start+1000).length,0);
assert.equal(r.sample(sample(0,90),start).length,0);
assert.equal(r.sample(sample(4,90),start+4000).length,0);
assert.match(r.sample(sample(8,90),start+8000)[0].text,/CPU has stayed busy/);
assert.equal(r.sample(sample(10,90),start+10000).length,0);
assert.match(r.sample(sample(16,20),start+16000)[0].text,/has eased/);
const event={key:'network:1',timestamp:new Date(start+24000).toISOString(),message:'Network connected'};
assert.match(r.sample(sample(24,20,[event]),start+24000)[0].text,/network just connected/);
assert.equal(r.sample(sample(32,20,[event]),start+32000).length,0);
assert.equal(r.connection(false,start+33000).length,1);
assert.equal(r.connection(false,start+34000).length,0);
assert.match(r.connection(true,start+35000)[0].text,/connected again/);
const fresh=new Reports();fresh.connection(true,start);
assert.equal(fresh.sample(sample(0,20,[event]),start).length,0,'do not replay old event history at startup');
const gap=new Reports();gap.connection(true,start);gap.sample(sample(0,90),start);
assert.equal(gap.sample(sample(30,90),start+30000).length,0,'a sampling gap must not count as sustained load');
const campus=new Reports();campus.connection(true,start);campus.sample(sample(0),start);
const campusLoss={key:'campus:loss',timestamp:new Date(start+60000).toISOString(),message:'Campus network disconnected'};
const campusReturn={key:'campus:return',timestamp:new Date(start+65000).toISOString(),message:'Campus network reconnected'};
assert.match(campus.sample(sample(60,20,[campusLoss]),start+60000)[0].text,/campus connection just went offline/);
assert.equal(campus.sample(sample(65,20,[campusReturn,campusLoss]),start+65000).length,0,'space reports eight seconds apart');
assert.match(campus.sample(sample(68,20,[campusReturn,campusLoss]),start+68000)[0].text,/AutoConnect restored/);
console.log('PASS: sustained load, cooldown, recovery, event deduplication, startup history, short campus outage, sampling gaps.');

const pool=Array.from({length:12},(_,i)=>({quote:`Test quotation ${i}.`,author:'Test author',source:'test.pdf'}));
const chat=new Reports({quotes:pool,random:()=>0});chat.connection(true,start);
for(let sec=0;sec<180;sec+=2)assert.equal(chat.sample(sample(sec),start+sec*1000).length,0,'wait for three quiet minutes');
const firstChat=chat.sample(sample(180),start+180000)[0];
assert.equal(firstChat.kind,'quote');assert.equal(firstChat.author,'Test author');assert.equal(firstChat.source,'test.pdf');
const spoken=[firstChat.text];
for(let sec=182;sec<=1980;sec+=2){
  const items=chat.sample(sample(sec),start+sec*1000);
  for(const item of items){assert(!spoken.slice(-10).includes(item.text),'avoid the ten most recent quotations');spoken.push(item.text);}
}
assert.equal(spoken.length,11);
const talk=new Reports({random:()=>.99});talk.connection(true,start);
for(let sec=0;sec<=180;sec+=2){const items=talk.sample(sample(sec),start+sec*1000);if(sec===180)assert.equal(items[0].kind,'chatter');}
assert(talk.nextChatterAt>=start+360000&&talk.nextChatterAt<=start+540000,'random interval is three to six minutes');
const busyChat=new Reports({quotes:pool,random:()=>0});busyChat.connection(true,start);
for(let sec=0;sec<=190;sec+=2)assert.equal(busyChat.sample(sample(sec,70),start+sec*1000).length,0,'defer idle talk while the machine is busy');
const integratedGpu=new Reports({quotes:pool,random:()=>0});integratedGpu.connection(true,start);
for(let sec=0;sec<=180;sec+=2){
  const data=sample(sec);
  data.gpu={utilization:10,memoryUsed:253*1048576,memoryTotal:256*1048576,sharedUsed:2*1073741824,sharedTotal:8*1073741824};
  const items=integratedGpu.sample(data,start+sec*1000);
  if(sec<180)assert.equal(items.length,0,'a nearly full dedicated iGPU pool must not trigger a memory alert');
  else assert.equal(items[0].kind,'quote','dedicated GPU memory pressure must not suppress otherwise idle chatter');
}
const freedGpu=sample(190);freedGpu.gpu={utilization:10,memoryUsed:32*1048576,memoryTotal:256*1048576};
assert.equal(integratedGpu.sample(freedGpu,start+190000).length,0,'dedicated GPU memory changes do not produce recovery reports');
const priorityChat=new Reports({quotes:pool,random:()=>0});priorityChat.connection(true,start);
for(let sec=0;sec<180;sec+=2)priorityChat.sample(sample(sec),start+sec*1000);
const chatEvent={key:'event:chat-priority',timestamp:new Date(start+180000).toISOString(),message:'Network disconnected'};
assert.equal(priorityChat.sample(sample(180,20,[chatEvent]),start+180000)[0].kind,'event','events take priority over due chatter');
priorityChat.connection(false,start+181000);
assert.equal(priorityChat.sample(sample(400),start+400000).length,0,'no chatter while telemetry is offline');
const sleepChat=new Reports({quotes:pool,random:()=>0});sleepChat.connection(true,start);sleepChat.sample(sample(0),start);
assert.equal(sleepChat.sample(sample(200),start+200000).length,0,'do not chatter immediately after a sampling gap');
assert.equal(new Reports().quotes.length,51,'all extracted quotations are bundled locally');
const latest={born:start,retiredAt:null},older={born:start,retiredAt:start+100000};
assert.equal(Reports.historyLayout([latest],start+3600000)[0].opacity,1,'latest report remains fully visible indefinitely');
assert.equal(Reports.historyLayout([latest,older],start+175000).length,2,'old report fades from replacement time');
assert.equal(Reports.historyLayout([latest,older],start+190000).length,1,'old report expires while the latest remains');
console.log('PASS: idle timing, quote attribution, repetition control, random intervals, event priority, busy/offline/sleep suppression, dedicated GPU memory neutrality, persistent latest report.');

function runUntil(reporter,from,to,{cpu=20,events=[]}={}){
  const emitted=[];
  for(let sec=from;sec<=to;sec+=2)emitted.push(...reporter.sample(sample(sec,cpu,events),start+sec*1000));
  return emitted;
}
for(const [personality,wait,minimum,maximum] of [['quiet',360,480,720],['standard',180,180,360],['chatty',60,60,180]]){
  const profile=new Reports({quotes:pool,random:()=>0});
  assert(profile.configure({personality},start)||personality==='standard');
  profile.connection(true,start);
  assert.equal(runUntil(profile,0,wait-2).length,0,`${personality} waits before the first idle message`);
  assert.equal(profile.sample(sample(wait),start+wait*1000)[0].kind,'quote');
  const remaining=profile.nextChatterAt-(start+wait*1000);
  assert(remaining>=minimum*1000&&remaining<=maximum*1000,`${personality} schedules its advertised interval`);
}
const configured=new Reports({quotes:pool,random:()=>.99});configured.connection(true,start);
const originalDeadline=configured.nextChatterAt;
assert.equal(configured.configure({personality:'standard',quotesEnabled:true,smallTalkEnabled:true},start+20000),false,'repeated Wallpaper Engine properties are idempotent');
assert.equal(configured.nextChatterAt,originalDeadline,'initial/repeated properties cannot restart a restored countdown');
assert.equal(configured.configure({smallTalkEnabled:false},start+30000),true);
assert.equal(configured.nextChatterAt,originalDeadline,'switching the allowed content type keeps the current wait');
assert.equal(runUntil(configured,0,180)[0].kind,'quote','quotes-only mode ignores the usual seventy percent split');
assert.equal(configured.configure({quotesEnabled:false},start+182000),true);
assert.equal(configured.nextChatterAt,Infinity,'both content switches off disables idle speech');
const settingsEvent={key:'settings:event',timestamp:new Date(start+190000).toISOString(),message:'Network disconnected'};
assert.equal(configured.sample(sample(190,20,[settingsEvent]),start+190000)[0].kind,'event','content switches do not disable real system reports');
assert.equal(configured.configure({smallTalkEnabled:true,personality:'chatty'},start+192000),true);
assert.equal(configured.nextChatterAt,start+252000,'reenabling speech uses the selected quiet wait');
assert.equal(configured.configure({personality:'not-a-mode',quotesEnabled:'false'},start+194000),false,'invalid property values are ignored');
assert.equal(runUntil(configured,192,252,{events:[settingsEvent]})[0].kind,'chatter','small-talk-only mode never chooses a quotation');
const emptyQuotes=new Reports({quotes:[],random:()=>0});emptyQuotes.configure({smallTalkEnabled:false},start);emptyQuotes.connection(true,start);
assert.equal(emptyQuotes.nextChatterAt,Infinity,'quotes-only mode with an empty quote pool stays quiet');

const beforeRotation=new Reports({quotes:pool,random:()=>0});beforeRotation.connection(true,start);runUntil(beforeRotation,0,120);
const saved=JSON.parse(JSON.stringify(beforeRotation.snapshot(start+120000)));
assert.equal(saved.chatterRemainingMs,60000,'snapshot saves remaining visible idle time');
assert(!('lastSample' in saved)&&!('queue' in saved)&&!('cpu' in saved),'runtime measurements and queued events are not serialized');
const afterRotation=new Reports({quotes:pool,random:()=>0});
assert(afterRotation.restore(saved,start+3600000));
assert.equal(afterRotation.connection(true,start+3600000).length,0,'resuming a saved wallpaper does not replace its latest message with a connection greeting');
const awayEvent={key:'rotation:away',timestamp:new Date(start+3600000).toISOString(),message:'Network connected'};
assert.equal(afterRotation.sample(sample(3600,20,[awayEvent]),start+3600000).length,0,'returning establishes an event baseline without replaying unseen events');
assert.equal(runUntil(afterRotation,3602,3658,{events:[awayEvent]}).length,0,'time spent on another wallpaper does not consume the remaining wait');
assert.equal(afterRotation.sample(sample(3660,20,[awayEvent]),start+3660000)[0].kind,'quote','remaining countdown resumes instead of restarting at three minutes');

const repetitionState=JSON.parse(JSON.stringify(chat.snapshot(start+1980000)));
repetitionState.chatterRemainingMs=0;
const remembered=new Reports({quotes:pool,random:()=>0});assert(remembered.restore(repetitionState,start+2000000));remembered.connection(true,start+2000000);
const recalled=remembered.sample(sample(2000),start+2000000)[0];
assert(!repetitionState.recentQuotes.includes(recalled.text),'the previous ten quotations are avoided across reloads');
const disabledState=new Reports();disabledState.connection(true,start);disabledState.configure({quotesEnabled:false,smallTalkEnabled:false},start+10000);
const disabledResume=new Reports();assert(disabledResume.restore(disabledState.snapshot(start+12000),start+500000));
assert.equal(disabledResume.connection(true,start+500000).length,0,'disabled idle speech still silently resumes the saved latest report');
assert.deepEqual(disabledResume.settings,{personality:'standard',quotesEnabled:false,smallTalkEnabled:false});
const genuinelyOffline=new Reports();genuinelyOffline.connection(true,start);genuinelyOffline.connection(false,start+10000);
const offlineResume=new Reports();assert(offlineResume.restore(genuinelyOffline.snapshot(start+10000),start+20000));
assert.match(offlineResume.connection(true,start+20000)[0].text,/connected again/,'a saved real outage still gets a real reconnection report');

const alertMemory=new Reports();alertMemory.connection(true,start);runUntil(alertMemory,0,8,{cpu:90});
const alertSnapshot=JSON.parse(JSON.stringify(alertMemory.snapshot(start+9000)));
assert.equal(alertSnapshot.cooldowns[0].last,start+8000);
const alertResume=new Reports();assert(alertResume.restore(alertSnapshot,start+10000));alertResume.connection(true,start+10000);
assert.equal(runUntil(alertResume,10,96,{cpu:90}).length,0,'a restored alert retains its original ninety-second cooldown');
assert.equal(alertResume.sample(sample(98,90),start+98000)[0].kind,'load','a confirmed current high load can alert when its previous cooldown ends');
const noInferredRecovery=new Reports();assert(noInferredRecovery.restore(alertSnapshot,start+10000));noInferredRecovery.connection(true,start+10000);
assert.equal(noInferredRecovery.sample(sample(10,20),start+10000).length,0,'a low reading after restore is not an inferred recovery from unseen work');
const noInferredSustain=new Reports();const pendingHigh=new Reports();pendingHigh.connection(true,start);pendingHigh.sample(sample(0,90),start);
assert(noInferredSustain.restore(pendingHigh.snapshot(start+4000),start+100000));noInferredSustain.connection(true,start+100000);
assert.equal(runUntil(noInferredSustain,100,106,{cpu:90}).length,0,'away time cannot complete the eight-second high-load requirement');
assert.equal(noInferredSustain.sample(sample(108,90),start+108000)[0].kind,'load');
const observedGap=new Reports();observedGap.connection(true,start);runUntil(observedGap,0,8,{cpu:90});
assert.equal(observedGap.sample(sample(40,90),start+40000).length,0);
assert.equal(runUntil(observedGap,42,96,{cpu:90}).length,0,'a sampling gap does not discard the completed alert cooldown');
assert.equal(observedGap.sample(sample(98,90),start+98000)[0].kind,'load');
const corrupted=[null,{},[],{...saved,version:2},{...saved,chatterRemainingMs:Infinity},{...saved,settings:{personality:'standard',quotesEnabled:'yes',smallTalkEnabled:true}},{...saved,cooldowns:[{key:'__proto__',last:start}]},{...saved,lastSentAt:'yesterday'}];
for(const state of corrupted)assert.equal(new Reports().restore(state,start+4000000),false,'invalid or unsupported persisted records are rejected');
assert.deepEqual(new Reports().settings,{personality:'standard',quotesEnabled:true,smallTalkEnabled:true},'malformed records do not alter defaults');
console.log('PASS: personality intervals, content switches, idempotent settings, restored countdowns/history/cooldowns, fresh evidence, offline resumption and invalid state handling.');
