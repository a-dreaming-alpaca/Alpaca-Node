(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = { online: false, data: null, fps: 15, paused: false, ambient: true, motion: true, loadBand: '' };
  const endpoint = 'http://127.0.0.1:8765/metrics';
  const clockText = date => date.toLocaleTimeString('en-GB', { hour12: false });
  const themeStyle=getComputedStyle(document.documentElement);
  const themeColor=(name,fallback)=>themeStyle.getPropertyValue(name).trim()||fallback;
  const palette={
    role:themeColor('--purple','#BBA0FF'),
    face:themeColor('--hero','#F3F1F7'),
    scan:themeColor('--mint','#9BE9C2'),
    muted:themeColor('--muted','#A0A6B0'),
    warning:themeColor('--warning','#FF9388')
  };
  const reporter = new window.AlpacaReports();
  const reports=[];
  let speakingUntil=0;
  // Keep the 1080p composition readable on high-resolution Wallpaper Engine desktops.
  // Scale the whole layout, while allowing wider aspect ratios to use their full width.
  const stage=document.querySelector('main');
  function fitStage(){
    const scale=Math.max(1,Math.min(window.innerWidth/1920,window.innerHeight/1080));
    if(scale<=1.001){
      for(const property of ['width','height','max-width','margin','transform','transform-origin'])stage.style.removeProperty(property);
      return;
    }
    stage.style.width=`${window.innerWidth/scale}px`;
    stage.style.height=`${window.innerHeight/scale}px`;
    stage.style.maxWidth='none';
    stage.style.margin='0';
    stage.style.transform=`scale(${scale})`;
    stage.style.transformOrigin='top left';
  }
  window.addEventListener('resize',fitStage);
  fitStage();
  function alignReports(){
    const column=document.querySelector('.report-column');
    const row=document.querySelector('.telemetry-grid .stat-row');
    const columnRect=column.getBoundingClientRect();
    const scale=columnRect.width/column.offsetWidth || 1;
    // The timestamp occupies 14px, followed by a 9px gap before the report body.
    const top=(row.getBoundingClientRect().top-columnRect.top)/scale-23;
    column.style.setProperty('--report-top',`${Math.max(0,top)}px`);
  }
  const reportAlignmentObserver=new ResizeObserver(alignReports);
  for(const selector of ['.workspace','.telemetry-grid','.session-info','.system-events']){
    reportAlignmentObserver.observe(document.querySelector(selector));
  }
  window.addEventListener('resize',alignReports);
  document.fonts.ready.then(alignReports);
  alignReports();
  function addReports(items){
    if(!items.length)return;
    for(const item of items){
      if(reports.length && reports[0].retiredAt===null)reports[0].retiredAt=Date.now();
      const el=document.createElement('article');el.className='spoken-report';
      el.dataset.kind=item.kind;
      const time=document.createElement('time');time.textContent=clockText(new Date(item.time));
      const text=document.createElement('p');text.textContent=item.kind==='quote'?`“${item.text}”`:item.text;el.append(time,text);
      if(item.author){const author=document.createElement('div');author.className='report-author';author.textContent='— '+item.author;el.append(author);}
      if(item.source)el.title='DSA course slide: '+item.source;
      $('report-stream').prepend(el);reports.unshift({el,born:Date.now(),retiredAt:null});speakingUntil=Date.now()+8000;
    }
    while(reports.length>3)reports.pop().el.remove();
    layoutReports();
  }
  function layoutReports(){
    let y=0;
    const visible=window.AlpacaReports.historyLayout(reports,Date.now());
    for(let i=reports.length-1;i>=0;i--)if(!visible.some(item=>item.report===reports[i])){reports[i].el.remove();reports.splice(i,1);}
    visible.forEach(({report,scale,opacity},i)=>{
      report.el.style.transform=`translateY(${y}px) scale(${scale})`;
      report.el.style.opacity=opacity;
      report.el.classList.toggle('latest',i===0);
      y+=report.el.offsetHeight*scale+22;
    });
  }
  setInterval(layoutReports,500);
  const percent = value => Number.isFinite(value) ? value.toFixed(0) : '--';
  const gib = value => Number.isFinite(value) ? (value / 1073741824).toFixed(1) : '--';
  function rate(bytes) {
    if (!Number.isFinite(bytes)) return '-- KB/s';
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB/s' : (bytes / 1024).toFixed(1) + ' KB/s';
  }
  function memorySize(bytes) {
    return bytes >= 1073741824 ? (bytes / 1073741824).toFixed(2) + ' GiB' : (bytes / 1048576).toFixed(0) + ' MiB';
  }
  function renderExtras(data) {
    $('device-name').textContent = data.hostname || 'LOCAL HOST';
    $('device-name').title = data.hostname || '';
    $('gpu-power').textContent = Number.isFinite(data.gpu?.power) ? data.gpu.power.toFixed(0)+' W' : '-- W';
    $('gpu-fan').textContent = Number.isFinite(data.gpu?.fan) ? data.gpu.fan.toFixed(0)+'%' : '--%';
    const volumes=$('volumes');volumes.replaceChildren();
    if(!data.volumes?.length) volumes.textContent='Capacity unavailable';
    (data.volumes || []).forEach(volume=>{
      const row=document.createElement('div'),name=document.createElement('span'),value=document.createElement('span');
      row.className='volume-row';name.textContent=volume.name;value.textContent=gib(volume.free)+' / '+gib(volume.total)+' GiB';row.append(name,value);volumes.append(row);
    });
    $('gpu-temp').textContent = Number.isFinite(data.gpu?.temperature) ? data.gpu.temperature.toFixed(0) + ' °C' : '-- °C';
    for (const direction of ['rx','tx']) $('boot-'+direction).textContent = data.bootTraffic?.available ? memorySize(data.bootTraffic[direction]) : '--';
    const now = Date.parse(data.timestamp), samples = data.cpuHistory || [];
    const blocks = '▁▂▃▄▅▆▇█';
    let trend = '';
    for (let i=0;i<30;i++) {
      const start=now-60000+i*2000;
      const recent=samples.filter(s=>Date.parse(s.timestamp)>start-4000 && Date.parse(s.timestamp)<=start+2000);
      const sample=recent[recent.length-1];
      trend += sample ? blocks[Math.min(7,Math.floor(sample.value/100*8))] : '·';
    }
    $('cpu-trend').textContent=trend;
    $('cpu-trend').title='0–100%, oldest → newest; 2-second cells hold the latest sample for at most 6s; dots = no recent sample';
    const list=$('system-events'); list.replaceChildren();
    const events=data.events?.items || [];
    if(!events.length){const row=document.createElement('li');row.className='empty';row.textContent=data.events?.available?'No recent system events':'System event log unavailable';list.append(row);}
    events.slice(0,3).forEach(event=>{
      const row=document.createElement('li'), time=document.createElement('time'), label=document.createElement('span');
      time.textContent=clockText(new Date(event.timestamp)); label.textContent=event.message; row.title=event.source+' / '+event.key;row.append(time,label);list.append(row);
    });
  }
  function renderRanking(id, rows, kind, message) {
    const list = $(id); list.replaceChildren();
    if (!Array.isArray(rows) || !rows.length) {
      const item = document.createElement('li'); item.className = 'empty'; item.textContent = message || 'No process data'; list.append(item); return;
    }
    rows.slice(0,4).forEach((row, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span'); rank.className = 'rank-number'; rank.textContent = String(index + 1).padStart(2,'0');
      const name = document.createElement('span'); name.className = 'process-name'; name.textContent = row.name; name.title = row.name;
      if (row.count > 1) { const count = document.createElement('small'); count.textContent = '×' + row.count; name.append(count); }
      const value = document.createElement('span'); value.className = 'process-value';
      value.textContent = kind === 'cpu' ? row.cpu.toFixed(1) + '%' : kind === 'memory' ? memorySize(row.memory) : rate(row.io);
      item.append(rank,name,value); list.append(item);
    });
  }
  function onlineState(online) {
    addReports(reporter.connection(online,Date.now()));
    model.online = online; document.body.classList.toggle('offline', !online);
    $('status-dot').classList.toggle('online', online);
    $('connection').textContent = online ? 'TELEMETRY CONNECTED' : 'TELEMETRY OFFLINE';
    if (!online) {
      $('gpu-power').textContent='-- W';$('gpu-fan').textContent='--%';$('volumes').textContent='Capacity unavailable';
      $('gpu-temp').textContent='-- °C'; $('boot-rx').textContent=$('boot-tx').textContent='--';
      $('cpu-trend').textContent='·'.repeat(30);
      const empty=document.createElement('li');empty.className='empty';empty.textContent='Collector offline';$('system-events').replaceChildren(empty);
      for (const id of ['cpu','memory','gpu','vram']) $(id).textContent = '--';
      for (const id of ['download','upload','disk-read','disk-write']) $(id).textContent = rate(null);
      $('memory-detail').textContent = '-- / -- GiB';
      $('vram-detail').textContent = 'DEDICATED -- / -- GiB';
      $('gpu-shared').hidden = true;
      $('gpu-name').textContent = 'NO CURRENT GPU DATA';
      $('uptime').textContent = '--d --h --m';
      $('entity-state').textContent = 'DORMANT'; $('entity-caption').textContent = 'waiting for a heartbeat';
      for (const kind of ['cpu','memory','io']) renderRanking('top-'+kind, [], kind, 'Collector offline');
      document.body.classList.remove('high-load');
    }
  }
  function update(data) {
    model.data = data; onlineState(true);
    addReports(reporter.sample(data,Date.now()));
    const cpu = data.cpu; const mem = data.memory.percent;
    renderExtras(data);
    $('cpu').textContent = percent(cpu); $('memory').textContent = percent(mem);
    $('core-count').textContent = data.cores.length + ' LOGICAL PROCESSORS';
    $('memory-detail').textContent = gib(data.memory.used) + ' / ' + gib(data.memory.total) + ' GiB';
    const gpu = data.gpu || {};
    $('gpu').textContent = percent(gpu.utilization);
    $('gpu-name').textContent = gpu.name && gpu.source !== 'unavailable' ? gpu.name : 'GPU TELEMETRY UNAVAILABLE';
    $('gpu-name').title = gpu.source || 'Restart the updated collector';
    $('vram').textContent = Number.isFinite(gpu.memoryUsed) && gpu.memoryTotal > 0 ? percent(gpu.memoryUsed / gpu.memoryTotal * 100) : '--';
    $('vram-detail').textContent = 'DEDICATED ' + (Number.isFinite(gpu.memoryUsed) ? memorySize(gpu.memoryUsed) : '--') + ' / ' + (gpu.memoryTotal > 0 ? memorySize(gpu.memoryTotal) : '--');
    $('vram').parentElement.title = 'Dedicated GPU memory usage; shared system memory is listed separately';
    $('gpu-shared').hidden = !(gpu.sharedTotal > 0);
    $('gpu-shared').textContent = 'SHARED ' + gib(gpu.sharedUsed) + ' / ' + gib(gpu.sharedTotal) + ' GiB';
    $('gpu-shared').title = 'Shared system RAM used by this GPU / Windows sharing limit. This limit is not preallocated VRAM.';
    $('download').textContent = rate(data.network.rx); $('upload').textContent = rate(data.network.tx);
    $('disk-read').textContent = rate(data.disk.read); $('disk-write').textContent = rate(data.disk.write);
    const seconds = data.uptime;
    $('uptime').textContent = Math.floor(seconds/86400)+'d '+Math.floor(seconds/3600)%24+'h '+Math.floor(seconds/60)%60+'m';
    $('sample-time').textContent = clockText(new Date(data.timestamp));
    const processes = data.processes;
    for (const kind of ['cpu','memory','io']) renderRanking('top-'+kind, processes?.available ? processes[kind] : [], kind, 'Process counters unavailable');
    const band = cpu >= 80 ? 'BUSY' : cpu >= 25 ? 'WATCHFUL' : 'GRAZING';
    model.loadBand = band;
    $('entity-state').textContent = band;
    $('entity-caption').textContent = band === 'BUSY' ? 'ears up. your machine is working.' : band === 'WATCHFUL' ? 'keeping an eye on the pasture' : 'all quiet. taking a byte of grass.';
    document.body.classList.toggle('high-load', band === 'BUSY');
  }
  let pollTimer, polling = false;
  async function poll() {
    clearTimeout(pollTimer);
    if (polling) return;
    if (model.paused) { pollTimer = setTimeout(poll, 2000); return; }
    polling = true;
    const abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error('Collector unavailable');
      const data = await response.json();
      if (!Number.isFinite(data.cpu) || !Number.isFinite(data.memory?.percent) || !Array.isArray(data.cores)) throw new Error('Invalid sample');
      update(data);
    } catch (_) { onlineState(false); }
    finally { polling = false; clearTimeout(timeout); pollTimer = setTimeout(poll, 2000); }
  }
  function canvasSize(canvas, quality = 1) {
    const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    const resized = canvas.width !== w || canvas.height !== h;
    if (resized) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'); ctx.setTransform(w / rect.width, 0, 0, h / rect.height, 0, 0); return [ctx, rect.width, rect.height, resized];
  }

  // Reuse the standalone outline study. Only strokes become body glyphs;
  // the ears, cheeks, muzzle interior and chest stay transparent.
  const alpacaWidth=420,alpacaHeight=560;
  function characterMask(){
    const canvas=document.createElement('canvas');canvas.width=alpacaWidth;canvas.height=alpacaHeight;
    const ctx=canvas.getContext('2d');
    ctx.strokeStyle=ctx.fillStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';
    return ctx;
  }
  function characterPoints(ctx){
    const pixels=ctx.getImageData(0,0,alpacaWidth,alpacaHeight).data,result=[];
    for(let y=9;y<alpacaHeight-4;y+=6)for(let x=9;x<alpacaWidth-4;x+=5){
      const alpha=pixels[(y*alpacaWidth+x)*4+3]/255;
      if(alpha>.3)result.push({x,y,alpha,bit:((x*17+y*31)>>>0)%7<3?'0':'1'});
    }
    return result;
  }
  const outline=characterMask(),muzzle=characterMask(),nose=characterMask();
  outline.lineWidth=13;outline.beginPath();
  outline.moveTo(110,180);outline.bezierCurveTo(99,142,102,47,127,43);outline.bezierCurveTo(157,39,165,113,155,154);
  outline.moveTo(310,180);outline.bezierCurveTo(321,142,318,47,293,43);outline.bezierCurveTo(263,39,255,113,265,154);outline.stroke();
  outline.lineWidth=14;outline.beginPath();outline.moveTo(116,176);
  outline.bezierCurveTo(138,179,144,158,154,145);outline.bezierCurveTo(179,111,241,111,266,145);outline.bezierCurveTo(276,158,282,179,304,176);
  outline.bezierCurveTo(354,164,379,212,367,257);outline.bezierCurveTo(364,271,356,282,348,291);outline.bezierCurveTo(342,298,344,305,350,315);
  outline.bezierCurveTo(372,347,369,387,351,410);outline.bezierCurveTo(343,421,343,428,349,440);outline.bezierCurveTo(361,467,361,500,350,520);
  outline.bezierCurveTo(298,543,122,543,70,520);outline.bezierCurveTo(59,500,59,467,71,440);outline.bezierCurveTo(77,428,77,421,69,410);
  outline.bezierCurveTo(51,387,48,347,70,315);outline.bezierCurveTo(76,305,78,298,72,291);outline.bezierCurveTo(64,282,56,271,53,257);
  outline.bezierCurveTo(41,212,66,164,116,176);outline.closePath();outline.stroke();
  muzzle.lineWidth=9;muzzle.beginPath();muzzle.ellipse(210,293,61,43,0,0,Math.PI*2);muzzle.stroke();
  nose.lineWidth=8;nose.beginPath();nose.moveTo(202,284);nose.lineTo(210,291);nose.lineTo(218,284);nose.moveTo(210,291);nose.lineTo(210,302);nose.stroke();
  const bodyLayers=[{points:characterPoints(outline),color:palette.role},{points:characterPoints(muzzle),color:palette.role},{points:characterPoints(nose),color:palette.face}];
  const scanPoints=[...bodyLayers[0].points,...bodyLayers[1].points].sort((a,b)=>a.y-b.y||a.x-b.x);
  for(const mask of [outline,muzzle,nose])mask.canvas.width=mask.canvas.height=1;
  // Cache small eye templates once; each frame only changes their position/state.
  const eyeStates={};
  for(const state of ['GRAZING','WATCHFUL','BUSY','CLOSED']){
    const eyes=characterMask();
    for(const x of [130,290]){
      eyes.beginPath();
      if(state==='CLOSED'){
        eyes.lineWidth=5.5;eyes.moveTo(x-12,251);eyes.quadraticCurveTo(x,256,x+12,251);eyes.stroke();
      }else{
        eyes.ellipse(x,251,12,state==='WATCHFUL'?16:14,0,0,Math.PI*2);eyes.fill();
      }
    }
    eyeStates[state]=characterPoints(eyes).filter(p=>state!=='BUSY'||p.y-251>=-6+(p.x<210?p.x-130:290-p.x)*.35);
    eyes.canvas.width=eyes.canvas.height=1;
  }
  const alpacaBase=document.createElement('canvas');
  let alpacaBaseKey='', staticAlpacaKey='';
  function paintAlpacaBase(w,h,bitmapWidth,bitmapHeight){
    alpacaBase.width=bitmapWidth;alpacaBase.height=bitmapHeight;
    const ctx=alpacaBase.getContext('2d');ctx.setTransform(bitmapWidth/w,0,0,bitmapHeight/h,0,0);
    const scale=Math.min(w/alpacaWidth,h/alpacaHeight)*.94,ox=(w-alpacaWidth*scale)/2,oy=(h-alpacaHeight*scale)/2;
    ctx.font=`${8*scale}px Consolas,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(const layer of bodyLayers){
      ctx.fillStyle=layer.color;
      for(const p of layer.points){
        ctx.globalAlpha=.7+.3*p.alpha;
        ctx.fillText(p.bit,ox+p.x*scale,oy+p.y*scale);
      }
    }
    ctx.globalAlpha=1;
  }
  function drawAlpaca(t) {
    const canvas=$('alpaca'),[ctx,w,h,resized]=canvasSize(canvas);
    const staticKey=`${model.online}:${model.loadBand}:${w}:${h}`;
    if(!model.motion&&!resized&&staticAlpacaKey===staticKey)return;
    staticAlpacaKey=model.motion?'':staticKey;
    const busy=model.online&&model.loadBand==='BUSY',watchful=model.online&&model.loadBand==='WATCHFUL';
    const baseKey=`${canvas.width}:${canvas.height}:${staticKey}`;
    if(baseKey!==alpacaBaseKey){paintAlpacaBase(w,h,canvas.width,canvas.height);alpacaBaseKey=baseKey;}
    ctx.clearRect(0,0,w,h);
    const scale=Math.min(w/alpacaWidth,h/alpacaHeight)*.94,ox=(w-alpacaWidth*scale)/2,oy=(h-alpacaHeight*scale)/2;
    const seconds=model.motion?t/1000:0;
    const sway=model.motion?Math.sin(seconds*.6)*1.3:0,breathe=model.motion?Math.sin(seconds*1.25)*1.8:0;
    const scan=(seconds*30)%(alpacaHeight+100)-50,blink=model.motion&&(seconds%6.7>6.5);
    const gaze=model.online&&model.motion?(Date.now()<speakingUntil?7:Math.sin(seconds*.55)*(watchful?4:2.5)):0;
    ctx.save();ctx.translate(sway*scale,breathe*scale);ctx.drawImage(alpacaBase,0,0,w,h);
    ctx.font=`${8*scale}px Consolas,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
    const eyeState=blink||!model.online?'CLOSED':busy?'BUSY':watchful?'WATCHFUL':'GRAZING';
    ctx.fillStyle=busy?palette.warning:palette.face;
    for(const p of eyeStates[eyeState]){
      ctx.globalAlpha=.7+.3*p.alpha;
      ctx.fillText(eyeState==='CLOSED'?'=':p.bit,ox+(p.x+gaze)*scale,oy+p.y*scale);
    }
    ctx.globalAlpha=1;
    if(model.online&&model.motion){
      let low=0,high=scanPoints.length;
      while(low<high){const mid=(low+high)>>1;if(scanPoints[mid].y<scan-6)low=mid+1;else high=mid;}
      ctx.fillStyle=palette.scan;
      for(let i=low;i<scanPoints.length&&scanPoints[i].y<scan+6;i++){
        const p=scanPoints[i],ch=p.bit==='0'?'1':'0';
        ctx.fillText(ch,ox+p.x*scale,oy+p.y*scale);
      }
    }
    ctx.restore();
  }
  let ambientFrame = -1, ambientEnabled = null;
  function drawAmbient(t) {
    const canvas=$('ambient');
    if(!model.ambient){
      if(canvas.width!==1 || canvas.height!==1){canvas.width=1;canvas.height=1;}
      ambientEnabled=false;
      return;
    }
    const frame=Math.floor(t/3000);
    const [ctx,w,h,resized] = canvasSize(canvas,.5);
    if(frame===ambientFrame && !resized && ambientEnabled===model.ambient)return;
    ambientFrame=frame;ambientEnabled=model.ambient;
    ctx.clearRect(0,0,w,h);if(!model.ambient)return;
    ctx.font='9px Consolas,monospace';ctx.fillStyle=palette.muted;ctx.globalAlpha=.055;
    const chars='01.:+    /   []  10   :';
    for(let y=14;y<h;y+=28)for(let x=7;x<w;x+=21){const n=Math.abs(Math.floor(Math.sin(x*3.7+y*.29+frame*.01)*10000));ctx.fillText(chars[n%chars.length],x,y);}
    ctx.globalAlpha=1;
  }
  let lastFrame=0; function animate(t){requestAnimationFrame(animate);if(model.paused||t-lastFrame<1000/model.fps)return;lastFrame=t;drawAlpaca(t);drawAmbient(t);}
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) { if(properties.ambient)model.ambient=properties.ambient.value;if(properties.motion)model.motion=properties.motion.value; },
    applyGeneralProperties(properties) { if(properties.fps)model.fps=Math.max(1,Math.min(15,properties.fps)); },
    setPaused(paused) { model.paused=paused; if(!paused)poll(); }
  };

  function tick(){const now=new Date();$('clock').textContent=clockText(now);$('date').textContent=now.toLocaleDateString('en-CA');}
  addReports([{text:"I'm here. Waiting for a telemetry heartbeat.",kind:'link',time:Date.now()}]);
  tick();setInterval(tick,1000);onlineState(false);poll();requestAnimationFrame(animate);
})();
