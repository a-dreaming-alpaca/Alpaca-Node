(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = { online: false, data: null, fps: 15, paused: false, ambient: true, motion: true, loadBand: '' };
  const endpoint = 'http://127.0.0.1:8765/metrics';
  const clockText = date => date.toLocaleTimeString('en-GB', { hour12: false });
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

  // Build the silhouette locally: no raster assets or downloaded fonts needed.
  const mask = document.createElement('canvas'); mask.width = 480; mask.height = 540;
  const mc = mask.getContext('2d');
  function ellipse(x, y, rx, ry, color, rotation = 0) { mc.fillStyle = color; mc.beginPath(); mc.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); mc.fill(); }
  function polygon(points, color) { mc.fillStyle = color; mc.beginPath(); points.forEach(([x,y],i) => i ? mc.lineTo(x,y) : mc.moveTo(x,y)); mc.closePath(); mc.fill(); }
  // Front-facing bust inspired by the reference: upright ears, scalloped fleece,
  // wide-set eyes and a separate oval muzzle. Every visible mark is a character.
  ellipse(151,94,29,77,'#dce8cc',-.09); ellipse(329,94,29,77,'#dce8cc',.09);
  ellipse(151,95,14,55,'#293e2b',-.09); ellipse(329,95,14,55,'#293e2b',.09);
  mc.fillStyle='#cbdcb9'; mc.beginPath(); mc.moveTo(105,495);
  mc.bezierCurveTo(83,457,96,413,111,391);
  mc.bezierCurveTo(77,352,87,306,105,288);
  mc.bezierCurveTo(66,242,86,165,137,154);
  mc.bezierCurveTo(155,147,170,149,178,149);
  mc.bezierCurveTo(205,94,275,94,302,149);
  mc.bezierCurveTo(310,149,325,147,343,154);
  mc.bezierCurveTo(394,165,414,242,375,288);
  mc.bezierCurveTo(393,306,403,352,369,391);
  mc.bezierCurveTo(384,413,397,457,375,495);
  mc.quadraticCurveTo(240,524,105,495); mc.closePath(); mc.fill();
  mc.strokeStyle='#eef6dc'; mc.lineWidth=8; mc.stroke();
  // Gentle chest shading keeps the face dominant without a solid bright block.
  ellipse(240,427,112,65,'#b7c8a4');
  ellipse(240,277,68,49,'#ecf4d7');
  ellipse(240,277,57,39,'#3c5136');
  ellipse(240,275,50,31,'#74866a');
  const pixels = mc.getImageData(0,0,480,540).data;
  const points = [];
  for (let y = 8; y < 524; y += 6) for (let x = 66; x < 416; x += 4) { const i = (y * 480 + x) * 4; if (pixels[i+3] > 100) points.push({x,y,v:pixels[i]/255,seed:Math.sin(x*127.1+y*311.7)*43758.5453 % 1}); }
  const isEye = p => { const dx=p.x-(p.x<240?160:320),dy=p.y-224;return dx*dx/(24*24)+dy*dy/(27*27)<1; };
  const isMouth = p => Math.abs(p.x-240)<33 && p.y>251 && p.y<301;
  const eyePoints=points.filter(isEye), scanPoints=points.filter(p=>!isEye(p)&&!isMouth(p));
  const alpacaBase=document.createElement('canvas');
  let alpacaBaseKey='', staticAlpacaKey='';
  function paintAlpacaBase(w,h,bitmapWidth,bitmapHeight,busy){
    alpacaBase.width=bitmapWidth;alpacaBase.height=bitmapHeight;
    const ctx=alpacaBase.getContext('2d');ctx.setTransform(bitmapWidth/w,0,0,bitmapHeight/h,0,0);
    const scale=Math.min(w/480,h/540)*.94,ox=(w-480*scale)/2,oy=(h-540*scale)/2;
    ctx.font=`${6.8*scale}px Consolas,monospace`;ctx.textAlign='center';
    const ramp='.:==+*#%@';
    for(const p of points){
      if(isEye(p))continue;
      let intensity=p.v*(.70+.30*Math.sin(p.x*.19+p.y*.24)**2);
      let ch=ramp[Math.min(8,Math.floor(intensity*8))];
      if(isMouth(p)){
        const mx=p.x-240,my=p.y-266;
        const nose=my>=-7&&my<8&&Math.abs(mx)<(10-my*.55);
        const stem=Math.abs(mx)<2.5&&my>=5&&my<20;
        const smile=busy?Math.abs(my-24)<2&&Math.abs(mx)<16:Math.abs(my-(20+6*Math.sin(Math.abs(mx)/22*Math.PI)))<2.8&&Math.abs(mx)<24;
        if(nose||stem||smile){ch=nose?'@':smile?'=':'|';intensity=1;}else{ch='.';intensity=.25;}
      }
      const alpha=.42+intensity*.5;
      ctx.fillStyle=`rgba(${Math.floor(130+intensity*55)},${Math.floor(173+intensity*59)},${Math.floor(114+intensity*51)},${alpha})`;
      ctx.fillText(ch,ox+p.x*scale,oy+p.y*scale);
    }
  }
  function drawAlpaca(t) {
    const canvas=$('alpaca'),[ctx,w,h,resized]=canvasSize(canvas);
    const staticKey=`${model.online}:${model.loadBand}:${w}:${h}`;
    if(!model.motion&&!resized&&staticAlpacaKey===staticKey)return;
    staticAlpacaKey=model.motion?'':staticKey;
    const busy=model.online&&model.loadBand==='BUSY',watchful=model.online&&model.loadBand==='WATCHFUL';
    const baseKey=`${canvas.width}:${canvas.height}:${staticKey}`;
    if(baseKey!==alpacaBaseKey){paintAlpacaBase(w,h,canvas.width,canvas.height,busy);alpacaBaseKey=baseKey;}
    ctx.clearRect(0,0,w,h);
    const scale=Math.min(w/480,h/540)*.94,ox=(w-480*scale)/2,oy=(h-540*scale)/2;
    const seconds=model.motion?t/1000:0;
    const sway=model.motion?Math.sin(seconds*.6)*1.3:0,breathe=model.motion?Math.sin(seconds*1.25)*1.8:0;
    const scan=(seconds*30)%650-50,blink=model.motion&&(seconds%6.7>6.5);
    const gaze=model.online&&model.motion?(Date.now()<speakingUntil?7:Math.sin(seconds*.55)*(watchful?8:4)):0;
    ctx.save();ctx.translate(sway*scale,breathe*scale);ctx.drawImage(alpacaBase,0,0,w,h);
    ctx.font=`${6.8*scale}px Consolas,monospace`;ctx.textAlign='center';
    for(const p of eyePoints){
      const dx=p.x-(p.x<240?160:320),dy=p.y-224;
      let ch,intensity;
      if(blink||!model.online){if(Math.abs(dy-dx*dx/100)>3)continue;ch='=';intensity=.95;}
      else{
        const lid=busy?-6+(p.x<240?dx:-dx)*.35:watchful?-21:-15;
        if(dy<lid){if(dy<lid-5)continue;ch='_';intensity=.8;}
        else if((dx-gaze)**2/64+dy*dy/(watchful?225:144)<1){ch=Math.abs(dx-gaze)<4&&dy<-2?'@':'#';intensity=1;}
        else if(dx*dx/(22*22)+dy*dy/(25*25)>.80){ch='.';intensity=.45;}
        else continue;
      }
      const alpha=.42+intensity*.5;
      ctx.fillStyle=busy?'#ddbf77':`rgba(${Math.floor(130+intensity*55)},${Math.floor(173+intensity*59)},${Math.floor(114+intensity*51)},${alpha})`;
      ctx.fillText(ch,ox+p.x*scale,oy+p.y*scale);
    }
    if(model.online&&model.motion){
      let low=0,high=scanPoints.length;
      while(low<high){const mid=(low+high)>>1;if(scanPoints[mid].y<scan-6)low=mid+1;else high=mid;}
      ctx.fillStyle='#dbffbb';
      for(let i=low;i<scanPoints.length&&scanPoints[i].y<scan+6;i++){
        const p=scanPoints[i],ch='0123456789ABCDEF'[Math.abs(Math.floor(p.seed*100))%16];
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
    ctx.font='9px Consolas,monospace';ctx.fillStyle='rgba(105,155,99,0.055)';
    const chars='01.:+    /   []  10   :';
    for(let y=14;y<h;y+=28)for(let x=7;x<w;x+=21){const n=Math.abs(Math.floor(Math.sin(x*3.7+y*.29+frame*.01)*10000));ctx.fillText(chars[n%chars.length],x,y);}
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
