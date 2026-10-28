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
