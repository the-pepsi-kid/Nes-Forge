/* NES Forge — original-emulator animation evidence, project-independent frame sampler.
 * For Zelda II, source-backed RAM names come from GameREIndex and GameRENative;
 * no selector-to-action mapping or animation timing is presumed. Trace remains
 * PRIVATE in editor unless owner explicitly exports a file. */
(()=>{'use strict';
 const maxFrames=3600,maxMarks=128;let recording=false,frames=[],marks=[],error='',source='',sourceRom=null,atlas=null,atlasSource='',last=-1;
 const $=id=>document.getElementById(id);
 const z2=()=>{try{return emu.loaded&&emu.lastBuiltRom&&window.ZeldaOverworld?.recognizes?.(emu.lastBuiltRom)}catch{return false}};
 const cleanHex=v=>Number.isInteger(v)?'$'+v.toString(16).toUpperCase().padStart(2,'0'):'—';
 const nowSource=()=>emu.romName||'Unknown';
 function update(){const status=$('nf-trace-status');if(!status)return;
  const latest=frames[frames.length-1];status.textContent=(recording?'● Recording':'Paused')+' · '+frames.length+' / '+maxFrames+' frame(s) · '+(new Set(frames.map(r=>r.pose+':'+r.facing))).size+' observed pose states · '+marks.length+' mark(s)'+(error?' · '+error:'');
  const raw=$('nf-trace-values');if(raw){raw.textContent=latest?('FRAME '+latest.frame+'   INPUT '+cleanHex(latest.input)+'   POSE $80 '+cleanHex(latest.pose)+'   FACING $9F '+cleanHex(latest.facing)+'   SWORD $400 '+cleanHex(latest.sword)+'   JUMP $479 '+cleanHex(latest.jump)+'   X '+latest.x+'   Y '+latest.y):'Load original Zelda II ROM, run its Emulator, then record native gameplay frames.';}
  const btn=$('nf-trace-toggle');if(btn)btn.textContent=recording?'Stop trace':'Record trace';
  if(latest)showPose(latest);
 }
 function showPose(latest){const canvas=$('nf-trace-pose'),note=$('nf-trace-pose-label');if(!canvas)return;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,80);ctx.imageSmoothingEnabled=false;
  if(!atlas||!Number.isInteger(latest.pose)||latest.pose<0||latest.pose>=15||![1,2].includes(latest.facing)){
   if(note)note.textContent='No comparable OAM display selector / atlas (not a verified gameplay animation)';return;
  }
  const sx=latest.pose*32,sy=(latest.facing-1)*40;
  ctx.drawImage(atlas,sx,sy,32,40,0,0,64,80);
  if(note)note.textContent='Original OAM display pose '+latest.pose+' facing '+latest.facing+' · palette/CHR mapping provisional';
 }
 function prepareAtlas(){
   try{
    if(!z2())return;
    const src=emu.lastBuiltRom;if(atlasSource===src)return;
    const payload=window.Forge?.services?.HostedPlayerPoses?.build?.(src);if(!payload)return;
    atlasSource=src;const pic=new Image();pic.onload=()=>{if(atlasSource===src){atlas=pic;const cur=frames[frames.length-1];if(cur)showPose(cur);}};pic.src=payload.png;
   }catch(e){error='OAM preview unavailable: '+String(e.message||e)}
 }
 function sample(machine,input){
   if(!recording)return;
   if(!machine.loaded||machine.lastBuiltRom!==sourceRom){disable('Emulator ROM changed; trace stopped');return;}
   if(machine.frameCount<=last){disable('Emulator reset; start a new recording');return;}
   if(frames.length>=maxFrames){disable('Frame limit reached');return;}
   const ram=machine.ram; // Original emulator $0000-$07FF; no private key or ROM bytes.
   frames.push({frame:machine.frameCount,input,pose:ram[0x80],facing:ram[0x9f],sword:ram[0x400],jump:ram[0x479],
    x:ram[0x4d]+ram[0x3b]*256,y:ram[0x29],velocityX:ram[0x70],velocityY:ram[0x57d],contact:ram[0xa7],
    scene:ram[0x561],region:ram[0x706],worldContext:ram[0x707],chrBank0:machine.chrBank0,chrBank1:machine.chrBank1});
   last=machine.frameCount;if(frames.length%5===0||frames.length===1)update();
 }
 function disable(reason){recording=false;if(reason)error=reason;update();}
 function start(){if(!z2())throw Error('Load Zelda II in Emulator before recording.');
  if(!emu.loaded)throw Error('Emulator ROM not loaded.');frames=[];marks=[];last=-1;error='';source=nowSource();sourceRom=emu.lastBuiltRom;recording=true;prepareAtlas();update();}
 function mark(kind){const latest=frames[frames.length-1];if(!latest)throw Error('Record gameplay frames before adding evidence marks');
   if(marks.length>=maxMarks)throw Error('Too many marks');
   if(!['idle','walk','jump','duck','sword','stab-up','stab-down','duck-attack','shield','damage','other'].includes(kind))throw Error('Unsupported mark');
   marks.push({frame:latest.frame,observedActivity:kind,pose:latest.pose,facing:latest.facing,annotationOnly:true});update();}
 function report(){const histogram={},changes=[];let prior=null;
   for(const row of frames){const key=row.pose+':'+row.facing;histogram[key]=(histogram[key]||0)+1;
    if(!prior||row.pose!==prior.pose||row.facing!==prior.facing||row.sword!==prior.sword||row.jump!==prior.jump){
      changes.push({frame:row.frame,pose:row.pose,facing:row.facing,sword:row.sword,jump:row.jump,input:row.input});}
    prior=row;}
   return {format:'nesforge.native-gameplay-observation',version:1,profile:'zelda2-us',sourceLabel:source,frameCount:frames.length,
    evidence:'original-ROM emulator RAM sampled after completed frames',limits:['This is recorded emulator observation, not a verified animation-state machine.',
     'RAM names are from the existing z2disassembly reference; address values can be context dependent.',
     'Activity labels are observer annotations; do not import into hosted combat as authoritative rules.',
     'NES Forge emulator PPU/APU timing is approximate; compare on hardware or a second emulator.'],
    histogram,changes,marks:[...marks],frames:[...frames]};}
 function download(){if(!frames.length)throw Error('No recorded frames to export');const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NES_Forge_Z2_Native_Animation_Trace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function install(){const view=$('emuView');if(!view||$('nf-trace-panel'))return;
 const panel=document.createElement('section');panel.id='nf-trace-panel';panel.style.cssText='margin:10px 0;padding:10px;border:1px solid #518e9b;background:#10242e;color:#c8e8de;font:12px monospace;max-width:820px';
 panel.innerHTML='<div style="color:#87e2bc;font-weight:bold;margin-bottom:6px">NATIVE LINK ANIMATION EVIDENCE · ORIGINAL EMULATOR</div><div style="opacity:.82;margin-bottom:6px">Play an original Zelda II side-view scene in EMULATOR. Record while walking, jumping or swinging. Evidence samples come from game RAM, not invented hosted animation rules.</div><button type="button" id="nf-trace-toggle">Record trace</button><select id="nf-trace-mark"><option value="walk">Observed walking</option><option value="idle">Standing</option><option value="jump">Jump</option><option value="duck">Duck</option><option value="sword">Sword / general attack</option><option value="stab-up">Observed upward stab (annotation)</option><option value="stab-down">Observed downward stab (annotation)</option><option value="duck-attack">Observed crouch attack (annotation)</option><option value="shield">Observed shield/block (annotation)</option><option value="damage">Damage</option><option value="other">Other</option></select><button type="button" id="nf-trace-mark-button">Mark activity</button><button type="button" id="nf-trace-export">Export evidence JSON</button><div id="nf-trace-status" role="status" style="padding:7px 0">Not recording</div><pre id="nf-trace-values" style="white-space:pre-wrap;background:#07151f;padding:8px"></pre><div style="display:flex;align-items:center;gap:12px"><canvas id="nf-trace-pose" width="64" height="80" style="width:64px;height:80px;image-rendering:pixelated;border:1px solid #47707a"></canvas><span id="nf-trace-pose-label">Original ROM OAM preview · not authenticated gameplay timing</span></div>';
 for(const control of panel.querySelectorAll('button,select'))control.style.cssText='background:#18384b;color:#d0ede3;border:1px solid #56889a;border-radius:3px;padding:6px 9px;margin:3px 5px 4px 0;font:11px monospace;cursor:pointer';
 const log=view.querySelector('#emuLog');(log||view).insertAdjacentElement('afterend',panel);
 const wrap=fn=>()=>{try{fn()}catch(e){error=e.message||String(e);update()}};
 $('nf-trace-toggle').onclick=wrap(()=>recording?disable():start());
 $('nf-trace-mark-button').onclick=wrap(()=>mark($('nf-trace-mark').value));
 $('nf-trace-export').onclick=wrap(download);update();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};
 window.Forge.services.NativeAnimationTrace=Object.freeze({sample,disable,report,start,mark,stop:()=>disable(),get recording(){return recording},get frames(){return frames.length}});
})();
