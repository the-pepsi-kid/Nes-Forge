(()=>{'use strict';
 const $=s=>document.getElementById(s),canvas=$('world'),ctx=canvas.getContext('2d');let activeCamera=null;let provider=null,addr='',token='',pid='',ws=null,state=null,target=null,selectedCamp=null,selectedBoss=null;let poseCache=new Map(),poseLoading=new Set(),stageCache=new Map(),stageLoading=new Set(),stageErrors=new Map(),nativeCache=new Map(),nativeLoading=new Set();
 const colors=['#89b7a0','#4b4436','#9683a5','#c7bb83','#b9ab60','#6f9464','#356d44','#4d7e5b','#9d9674','#afaa70','#ce704b','#5d5c54','#47739f','#679fa1','#777475','#8f7353'];
 const log=s=>{const el=$('log');el.textContent=new Date().toLocaleTimeString()+' '+s+'\n'+el.textContent.slice(0,1600)};
 const api=async(path,body)=>{const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error((await r.text()).slice(0,280));return r.json();};
 const draw=()=>{if(!state?.world){canvas.width=256;canvas.height=240;ctx.fillStyle='#182a30';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#c8e3de';ctx.font='11px monospace';ctx.fillText('Load Z2 World from Forge',30,116);return;}
   activeCamera=window.ForgeHostedRenderer.drawViewport(canvas,state,{target,playerId:pid,onArtReady:draw});
   const a=activeCamera;
   $('cameraStatus').textContent=`Player-local camera (${a.cameraX},${a.cameraY}) px · viewport 256×240 · NES-style crop (scroll timing not verified)`;
   $('artStatus').textContent=a.hasArt?'Original Forge CHR terrain atlas · pixel-perfect viewport crop · provisional sprites':state.world.art?'Loading native CHR-derived atlas…':'Abstract terrain fallback · republish v2 art snapshot from Forge';
 };
 function render(){if(!state)return;let me=state.players.find(p=>p.id===pid);$('me').textContent=me?`Player ${pid.slice(0,8)} · (${me.x},${me.y}) · Unspent XP: ${me.xp} · A${me.attack_level}/M${me.magic_level}/L${me.life_level}`:'Not joined';
 if(me){
  const side=me.mode==='sideview',panel=$('sidePanel');panel.hidden=!side;
  $('enterArea').disabled=side;
  $('sideHint').textContent=side?('Shared area '+me.area_id+' · server authority · provisional movement'):('Overworld ('+me.x+','+me.y+'). Step onto Town / Cave / Palace / camp to enter automatically.');
  if(side)drawSide(me);
  for(const stat of ['attack','magic','life']){
   $(stat+'Level').textContent=me[stat+'_level'];const next=me.nextUpgrades?.[stat];
   const button=$('upgrade'+stat.charAt(0).toUpperCase()+stat.slice(1));
   button.textContent=stat.toUpperCase()+' ↑ '+(next??'MAX')+' XP';button.disabled=next===null||me.xp<next;
  }
  $('xpInfo').textContent='Earned '+me.earned_xp+' · Unspent '+me.xp+' XP';
  $('healthInfo').textContent='Life meter '+me.hp+' · Magic meter '+me.mp+' (pilot)';
  const tile=state.world.terrain[me.y*state.world.width+me.x];
  $('locationHint').textContent=tile===1?'Cave: automatically enter when arriving; original gameplay not hosted yet.':tile===2?'Palace: automatically enter when arriving; original gameplay not hosted yet.':tile===0?'Town: automatically enter when arriving; initial original background may be shown.':'Terrain: '+['Town','Cave','Palace','Bridge','Desert','Grass','Forest','Swamp','Graveyard','Road','Lava','Mountain','Water','Walkable water','Rock','Spider'][tile];
  $('encounterPanel').hidden=me.mode!=='encounter'||state.progression?.encountersEnabled!==true;
  if(me.mode==='encounter'){$('encounterInfo').textContent=me.encounter+' · Enemy HP '+me.enemy_hp+' · Your HP '+me.hp;drawEncounter(me);}
 }
$('roster').textContent=state.players.map((p,i)=>`P${i+1} ${p.id.slice(0,8)} ${p.online?'● online':'○ offline'} (${p.x},${p.y})`).join('\n');$('roster').style.whiteSpace='pre-line';$('netStatus').textContent=`${state.online} online · ${state.revision?.slice(0,10)||'no world'}`;draw()}
 canvas.addEventListener('click',e=>{if(!state?.world)return;const box=canvas.getBoundingClientRect();target={x:Math.floor(((e.clientX-box.left)/box.width*256+(activeCamera?.cameraX||0))/16),y:Math.floor(((e.clientY-box.top)/box.height*240+(activeCamera?.cameraY||0))/16)};if(target.x<0||target.y<0||target.x>=state.world.width||target.y>=state.world.height)return;$('target').textContent=`Target: (${target.x}, ${target.y})`;const hit=(state.structures||[]).find(a=>a.x===target.x&&a.y===target.y&&a.kind==='camp'&&a.player_id===pid);if(hit){selectedCamp=hit.id;$('camp').textContent='Selected camp: '+hit.id.slice(0,8)}const boss=(state.structures||[]).find(a=>a.x===target.x&&a.y===target.y&&a.kind==='boss'&&a.player_id===pid);if(boss)selectedBoss=boss.id;draw()});
 async function loadStageFrame(me){
   if(!state?.world)return;
   const entry=state.stageFrames?.find(f=>f.x===me.x&&f.y===me.y);
   if(!entry)return;
   const key=state.world.sourceWorldId+':'+me.x+':'+me.y+':'+entry.revision;
   if(stageCache.has(key)||stageLoading.has(key))return;
   stageLoading.add(key);
   try{
    const res=await fetch('/api/stage-frame?x='+me.x+'&y='+me.y,{cache:'no-store'});
    if(!res.ok)throw Error('Source scene not available');
    const data=await res.json();if(data.sha256!==entry.revision)throw Error('Stage revision changed');
    const img=new Image();img.onload=()=>{if(img.naturalWidth===(data.widthPx||256)&&img.naturalHeight===240){stageCache.set(key,img);stageErrors.delete(key);stageLoading.delete(key);if(state)render();}else{stageErrors.set(key,'Published image width/height mismatch: expected '+(data.widthPx||256)+'×240');stageLoading.delete(key);if(state)render();}};img.onerror=()=>{stageErrors.set(key,'Native image could not be decoded');stageLoading.delete(key);if(state)render();};img.src=data.png;
   }catch(err){stageErrors.set(key,err.message);stageLoading.delete(key);log('Stage image: '+err.message);if(state)render()}
 }
 async function loadNativeRecord(me){
   if(!state?.world)return;
   const entries=state.nativeRooms?.filter(r=>r.x===me.x&&r.y===me.y)||[];
   if(!entries.length)return;
   const key=state.world.sourceWorldId+':'+me.x+':'+me.y+':'+entries.map(e=>e.digest).join(',');
   if(nativeCache.has(key)||nativeLoading.has(key))return;
   nativeLoading.add(key);
   try{
    const res=await fetch('/api/native-rooms?x='+me.x+'&y='+me.y,{cache:'no-store'});
    if(!res.ok)throw Error('Source room records unavailable');
    const data=await res.json();
    if(data.nativeSceneVerified!==false||data.format!=='nesforge.z2.native-room-selection')throw Error('Unexpected native room response');
    nativeCache.set(key,data.rooms);if(state)render();
   }catch(err){log('Native source records: '+err.message)}finally{nativeLoading.delete(key)}
 }
 async function loadPlayerPoses(digest){
   if(!digest||poseCache.has(digest)||poseLoading.has(digest))return;
   poseLoading.add(digest);
   try{
     const result=await fetch('/api/player-poses',{cache:'no-store'});
     if(!result.ok)throw Error('Hosted original player sprite atlas unavailable');
     const data=await result.json();
     if(data.sha256!==digest||data.nativeAnimationVerified!==false||data.cellWidth!==32||data.cellHeight!==40)throw Error('Unexpected original player art asset');
     const img=new Image();img.onload=()=>{if(img.naturalWidth===480&&img.naturalHeight===80){poseCache.set(digest,img);if(state)render()}poseLoading.delete(digest)};
     img.onerror=()=>{poseLoading.delete(digest);log('Link sprite atlas decode failed')};img.src=data.png;
   }catch(error){poseLoading.delete(digest);log('Link sprite atlas: '+error.message)}
 }
 function drawSide(me){
  const c=$('sideCanvas'),g=c.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#182a30';g.fillRect(0,0,256,240);
  const ref=state.stageFrames?.find(f=>f.x===me.x&&f.y===me.y);
  const key=ref?state.world.sourceWorldId+':'+me.x+':'+me.y+':'+ref.revision:'';
  const img=key?stageCache.get(key):null;
  if(img){
    // Camera follows this player over the original decoded raster; each client has its own camera.
    // This crop is NOT proof of Zelda II's original scroll algorithm, collision or PPU behavior.
    const cameraX=Math.max(0,Math.min(img.naturalWidth-256,Math.round(me.side_x*8+4-128)));
    g.drawImage(img,cameraX,0,256,240,0,0,256,240);
    $('sideVisualStatus').textContent=ref.captureMethod==='executed-original-construction:first-screen'?'ORIGINAL ROOM ART · '+img.naturalWidth+'×240 source raster · client camera x='+cameraX+' · native scroll timing, sprites and physics still pending.':'CAPTURED SOURCE REFERENCE · 256×240 static image (not decoded room geometry).';
  }else{
    g.fillStyle='#273c48';g.fillRect(0,32,256,208);
    g.fillStyle='#a9d8d0';g.font='8px monospace';g.fillText('NATIVE ROOM ART NOT LOADED',9,52);
    if(ref){
      g.fillText('Source art published. Loading...',9,67);
      loadStageFrame(me);
      $('sideVisualStatus').textContent=stageErrors.has(key)?'ART DOWNLOAD FAILED: '+stageErrors.get(key)+' · Use WORLD Live to verify or republish the town image.':'Image published on host. Waiting for decoded 256×240 PNG.';
    }else{
      g.fillText('SOURCE ART MISSING ON HOST',9,67);
      g.fillText('NO MULTI-SCREEN SCROLL WITHOUT ART',9,110);
      const native=state.nativeRooms?.filter(r=>r.x===me.x&&r.y===me.y)||[];
      if(native.length){
        const nativeKey=state.world.sourceWorldId+':'+me.x+':'+me.y+':'+native.map(e=>e.digest).join(',');
        const decoded=nativeCache.get(nativeKey);
        const room=decoded?.[0];
        if(room){g.fillStyle='#c7d1cf';g.fillText('SOURCE MAP #'+room.source.scene+' · BANK '+room.source.bank,9,85);g.fillText('SOURCE RECORDS ONLY',9,96);}else loadNativeRecord(me);
      }
      $('sideVisualStatus').textContent='HOSTED ROOM ART MISSING at ('+me.x+','+me.y+'). Scrolling beyond the first screen is unavailable because the server has no verified source raster. In NES Forge WORLD Live, click Restore original town graphics (2,6) with your imported Z2 source. Players/XP/camps stay online.';
    }
  }
  const occupants=state.players.filter(p=>p.mode==='sideview'&&p.area_id===me.area_id&&p.online);
  for(let i=0;i<occupants.length;i++){
    const p=occupants[i],viewX=img?Math.max(0,Math.min(img.naturalWidth-256,Math.round(me.side_x*8+4-128))):0,x=p.side_x*8-viewX;
    if(x<-16||x>256)continue;g.fillStyle=p.id===pid?'#79efc7':i%2?'#f6cb87':'#b4b4fa';
    const spriteDigest=state.playerPoses?.sha256,atlas=poseCache.get(spriteDigest);
    if(spriteDigest&&!atlas)loadPlayerPoses(spriteDigest);
    if(atlas){
      // Reuse original OAM/CHR display pixels. Selector 0 is a static pose;
      // walking/attack/jump transitions are NOT inferred from movement direction.
      const facing=p.side_facing<0?2:1;
      const pose=Number.isInteger(p.side_pose)&&p.side_pose>=0&&p.side_pose<15?p.side_pose:0;
      const rise=Number.isFinite(p.side_air_px)?Math.max(0,Math.min(49,p.side_air_px)):0;
      g.drawImage(atlas,pose*32,(facing-1)*40,32,40,x-8,151-rise,32,40);
    }else{
      const rise=Number.isFinite(p.side_air_px)?Math.max(0,Math.min(49,p.side_air_px)):0;
      g.fillRect(x,176-rise,7,14);g.strokeStyle='#10151f';g.strokeRect(x+.5,176.5-rise,7,14);
    }
    g.fillStyle='#171923';g.fillRect(x-1,167,9,3);
    g.fillStyle=p.id===pid?'#6dfac1':'#f6a3a3';g.fillRect(x-1,167,Math.max(0,Math.round(9*p.hp/64)),3);
    g.fillStyle='#fff4c8';g.font='7px monospace';g.fillText('P'+(state.players.indexOf(p)+1),x-1,163);
  }
  $('sideVisualStatus').textContent+=' · '+(poseCache.has(state.playerPoses?.sha256)?'LINK OAM/CHR ART LOADED — original pose selectors 8/9 mapped to player actions; physics, timing, hitboxes and damage remain PILOT':state.playerPoses?'Original Link pose atlas loading':'Original Link sprites not yet published from Forge');
  $('sideRoster').textContent=occupants.length+' player(s) in the same server-owned room: '+occupants.map(p=>p.id.slice(0,8)+' HP '+p.hp).join(', ');
 }
 function drawEncounter(me){
 const c=$('battle'),b=c.getContext('2d');b.imageSmoothingEnabled=false;
 b.fillStyle='#15253d';b.fillRect(0,0,320,154);b.fillStyle='#798a69';b.fillRect(0,118,320,36);
 for(let i=0;i<20;i++){b.fillStyle=i%2?'#485343':'#59614a';b.fillRect(i*16,119,15,15)}
 // Block-character stand-ins only; not derived from Zelda II CHR or native engine frames.
 b.fillStyle='#a7be7a';b.fillRect(60,69,20,14);b.fillStyle='#d1b78d';b.fillRect(64,82,12,13);
 b.fillStyle='#538e5f';b.fillRect(60,95,20,19);b.fillStyle='#65594b';b.fillRect(60,114,7,12);b.fillRect(73,114,7,12);
 b.fillStyle='#eee8bc';b.fillRect(81,98,24,4);
 b.fillStyle='#c0645f';b.fillRect(234,91,19,25);b.fillStyle='#a39a8d';b.fillRect(235,77,17,14);
 b.fillStyle='#daecdc';b.font='bold 11px monospace';b.fillText('PLAYER ART UNRECOVERED',14,18);b.fillText(me.encounter.slice(0,23),180,18);
 b.fillStyle='#f6ca85';b.fillText('HP '+me.hp,14,40);b.fillText('ENEMY '+me.enemy_hp,180,40);
 }
 const send=(msg)=>{if(!ws||ws.readyState!==1){$('notice').textContent='Sign in and connect to the host first.';return}ws.send(JSON.stringify(msg))};
 const move=(dx,dy)=>{const me=state?.players?.find(p=>p.id===pid);if(me?.mode==='sideview'){if(dx)send({type:'side_step',direction:dx});return;}send({type:'move',dx,dy});};
 $('enterArea').onclick=()=>send({type:'enter_area'});
 $('sideLeft').onclick=()=>send({type:'side_step',direction:-1});
 $('sideRight').onclick=()=>send({type:'side_step',direction:1});
 $('sideForwardStab').onclick=()=>send({type:'side_action',action:'forward_stab'});
 $('pvpTestAttack').onclick=()=>send({type:'pvp_test_attack'});
 $('sideUpStab').onclick=()=>send({type:'side_action',action:'up_stab'});
 $('sideDownStab').onclick=()=>send({type:'side_action',action:'down_stab'});
 $('sideJump').onclick=()=>send({type:'side_jump'});
 $('leaveArea').onclick=()=>send({type:'leave_area'});
 for(const [id,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]])$(id).onclick=()=>move(dx,dy);
 window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase(),moves={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};if(state?.players?.find(p=>p.id===pid)?.mode==='sideview'){
  const actions={z:'forward_stab',x:'up_stab',c:'down_stab'};
  if(actions[k]){e.preventDefault();send({type:'side_action',action:actions[k]});return;}
  if(k===' '){e.preventDefault();send({type:'side_jump'});return;}
 }
 if(moves[k]){e.preventDefault();if(!($('encounterPanel')&&!$('encounterPanel').hidden))move(...moves[k])}});
 for(const [id,kind] of [['buildCamp','camp'],['buildDefense','defense'],['buildBoss','boss']])$(id).onclick=()=>{if(!target){$('notice').textContent='Select a map cell first.';return}send({type:'build',kind,x:target.x,y:target.y,parentId:selectedCamp})};
 for(const stat of ['attack','magic','life'])$('upgrade'+stat.charAt(0).toUpperCase()+stat.slice(1)).onclick=()=>send({type:'level_up',skill:stat});
 for(const [id,action] of [['attackEnemy','strike'],['guardEnemy','guard'],['fleeEnemy','flee']])$(id).onclick=()=>send({type:'encounter_action',action});
 $('upgradeBoss').onclick=()=>{if(!selectedBoss){$('notice').textContent='Select your boss marker first.';return}send({type:'boss_hp',structureId:selectedBoss})};
 function connectSocket(){if(ws)ws.close();ws=new WebSocket('ws://127.0.0.1:8765/ws');ws.onopen=()=>{ws.send(JSON.stringify({type:'authenticate',sessionToken:token}));log('Socket connected')};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(!Object.hasOwn(m,'world')&&state?.world)m.world=state.world;state=m;render()}else if(m.type==='error'){$('notice').textContent=m.error;log('Rejected: '+m.error)}else if(m.type==='authenticated'){pid=m.playerId;log('Authenticated '+pid.slice(0,8))}};ws.onclose=()=>{log('Session socket disconnected');$('netStatus').textContent='Disconnected'};ws.onerror=()=>log('WebSocket transport error')}
 function findWallet(){if(window.ethereum)return Promise.resolve(window.ethereum);return new Promise(resolve=>{let found=null;const fn=e=>{if(!found)found=e.detail?.provider};window.addEventListener('eip6963:announceProvider',fn);window.dispatchEvent(new Event('eip6963:requestProvider'));setTimeout(()=>{window.removeEventListener('eip6963:announceProvider',fn);resolve(found)},300)})}
 $('connect').onclick=async()=>{const b=$('connect');b.disabled=true;try{provider=await findWallet();if(!provider)throw Error('No injected EVM wallet found. Open in a wallet-enabled browser on 127.0.0.1.');const accounts=await provider.request({method:'eth_requestAccounts'});addr=accounts?.[0];if(!addr)throw Error('Wallet did not provide an account');const chain=await provider.request({method:'eth_chainId'});if(parseInt(chain,16)!==1)throw Error('Select Ethereum mainnet identity (no transaction or fee).');const c=await api('/api/auth/challenge',{address:addr,chainId:1});const bytes='0x'+Array.from(new TextEncoder().encode(c.message)).map(x=>x.toString(16).padStart(2,'0')).join('');const sig=await provider.request({method:'personal_sign',params:[bytes,c.address||addr]});const v=await api('/api/auth/verify',{nonce:c.nonce,signature:sig});token=v.sessionToken;pid=v.playerId;$('authStatus').textContent=`Verified ${addr.slice(0,7)}…${addr.slice(-5)} · ID ${pid.slice(0,8)}`;log('EOA wallet signature verified; no transaction');connectSocket();}catch(e){$('authStatus').textContent=e.message;log('Wallet: '+e.message)}finally{b.disabled=false}};
 $('legend').innerHTML=colors.map((c,i)=>`<span><i class="swatch" style="background:${c}"></i>${['Town','Cave','Palace','Bridge','Desert','Grass','Forest','Swamp','Graveyard','Road','Lava','Mountain','Water','Walkable water','Rock','Spider'][i]}</span>`).join('');
 const gameSection=document.querySelector('main > section');const stage=$('sidePanel');if(gameSection&&stage)gameSection.insertBefore(stage,gameSection.firstChild);
 draw();
})();
