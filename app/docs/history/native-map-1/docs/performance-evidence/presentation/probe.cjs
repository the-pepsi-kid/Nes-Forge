#!/usr/bin/env node
'use strict';
// Read-only call counts against the complete unchanged candidate. DOM stubs
// observe requests; they do not establish browser timing, layout cost or audio.
// Usage: node probe.cjs [SOURCE_ROOT | HTML_FILE] [SOURCE_ROOT_FOR_HTML]
// Without arguments, locate the adjacent packaged source tree.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const supplied=process.argv[2]?path.resolve(process.argv[2]):null;
const suppliedHtml=supplied&&fs.statSync(supplied).isFile()?supplied:null;
function inferRoot(...locations){
  for(const location of locations.filter(Boolean)){
    let current=path.resolve(location);
    for(let depth=0;depth<5;depth++){
      for(const candidate of [current,path.join(current,'NES_Forge_1.9.0')])if(fs.existsSync(path.join(candidate,'tests/harness.cjs')))return candidate;
      const parent=path.dirname(current);if(parent===current)break;current=parent;
    }
  }
  throw Error('Cannot find packaged tests/harness.cjs; pass the NES_Forge_1.9.0 source root.');
}
const root=process.argv[3]?path.resolve(process.argv[3]):supplied&&!suppliedHtml?supplied:inferRoot(suppliedHtml&&path.dirname(suppliedHtml),__dirname,process.cwd());
const html=suppliedHtml||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html');
const {loadForge}=require(root+'/tests/harness.cjs');
const intervals=[];let counts={};
const hit=name=>counts[name]=(counts[name]||0)+1;
const h=loadForge(html,{environment:{navigator:{getGamepads:()=>{hit('getGamepads');return[];},clipboard:{writeText:async()=>{}}},setInterval:(fn,ms)=>{intervals.push(ms);return intervals.length;}}});
assert.deepEqual(h.errors,[]);
const document=h.context.document,get=document.getElementById,proxies=new Map();
document.getElementById=id=>{
  hit('getElementById');const el=get(id);if(!proxies.has(id))proxies.set(id,new Proxy(el,{set(target,key,value){if(key==='textContent')hit('textContentWrites');if(id==='emuPalView'&&key==='innerHTML'){hit('paletteRebuilds');counts.paletteSpanRequests=(counts.paletteSpanRequests||0)+(value.match(/<span/g)||[]).length;}return Reflect.set(target,key,value);}}));return proxies.get(id);
};
const screen=h.get('emuCanvas').parentNode,rect=screen.getBoundingClientRect;
screen.getBoundingClientRect=function(){hit('screenLayoutReads');return rect.call(this);};
const panel=h.get('emuPlayPanel');panel.style.setProperty=()=>hit('canvasStyleWrites');
const canvasContext=h.get('emuCanvas').getContext('2d'),putImageData=canvasContext.putImageData;
canvasContext.putImageData=function(...args){hit('canvasUploads');return putImageData.apply(this,args);};
const dpad=h.get('emuPlayDpad');dpad.getBoundingClientRect=()=>{hit('dpadLayoutReads');return {left:0,top:0,width:132,height:132};};
const source=new Uint8Array(16+16384+8192);source.set([78,69,83,26,1,1]);source.set([0x4c,0,0xc0],16);for(const offset of[0x3ffa,0x3ffc,0x3ffe])source.set([0,0xc0],16+offset);
h.context.probeRom=source;assert.equal(h.run('emuLoadRomData(probeRom,"probe",0)'),true);h.run('S.tab="emu";emu.running=true');
const input=h.context.Forge.services.EmulatorInput,play=h.context.Forge.services.EmulatorPlay;
const results=[];
function measure(name,n,fn){counts={};for(let i=0;i<n;i++)fn();results.push({name,invocations:n,counts:{...counts}});}
input.poll();
measure('stable input poll; no physical controller',60,()=>input.poll());
measure('existing controller latch input snapshot',60,()=>h.run('emuReadJoyState()'));
play.enter();
measure('expanded UI tick; playing',5,()=>play.tick());
h.run('emu.running=false');
measure('expanded UI tick; paused',5,()=>play.tick());
h.run('emu.running=true');
measure('inherited canvas and sidebar presentation; expanded play',60,()=>h.run('renderEmu()'));
play.setTouchVisible(true);
const event=(type,x)=>({type,pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:60,preventDefault(){},stopPropagation(){}});
dpad.dispatchEvent(event('pointerdown',120));
measure('held direction pointermove at unchanged coordinates',60,()=>dpad.dispatchEvent(event('pointermove',120)));
assert.equal(h.run('emuReadJoyState()'),128);
measure('return from expanded play',1,()=>play.exit());
measure('repeated exit after return',1,()=>play.exit());
h.run('switchTab("scene")');measure('UI ticks outside emulator',5,()=>play.tick());assert.equal(h.run('emuReadJoyState()'),0);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={sourceRoot:root,html,sha256:hash(html),probeSha256:hash(__filename),scope:'Actual bundled app with mock DOM; call counts only. No layout/performance/audio measurement or physical hardware validation.',intervalsRequestedAtStartup:intervals,results,errors:h.errors};
console.log(JSON.stringify(report,null,2));
