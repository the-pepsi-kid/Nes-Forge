/* 1.6.2.1 packed-ROM WR16 v3 integration. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),E=new TextEncoder(),D=new TextDecoder(),NONE=255;
const priorBuild161=buildNesRom;
function u16(a,v){a.push(v&255,(v>>8)&255)}
function text(a,s){const b=E.encode(String(s||''));if(b.length>255)throw Error('World text exceeds 255 UTF-8 bytes');a.push(b.length,...b)}
function planWorldPayload(plan){return WorldCodec1621.encode((plan.source||S).worlds||[],plan)}
function concat(a,b){const o=new Uint8Array(a.length+b.length);o.set(a);o.set(b,a.length);return o}
function findAddr(length,used){if(!Number.isInteger(length)||length<0)throw Error('Runtime metadata size must be a nonnegative integer');for(let start=0xC200;start+length<=0xCFF0;start+=16){let ok=true;for(let a=start;a<start+length;a++)if(used.has(a)){ok=false;break}if(ok)return start}throw Error('Runtime metadata + metatiles + worlds need '+length+' bytes but no contiguous space remains before $CFF0. Reduce world metadata/strings/scenes or disable scene packing.')}
function isUnpacked(){return !!$('codeInput')?.value.trim()&&S.packScenes===false}
function buildPacked(){window._lastBuiltRom=null;const blog=$('buildLog');blog.textContent='';const log=(m,k='bl-ok')=>{const d=document.createElement('div');d.className=k;d.textContent=m;blog.appendChild(d)};try{const plan=Forge16.build.plan(),wr=planWorldPayload(plan),worldExt=concat(plan.ext16,wr),ext=window.Forge163?.build?.extension?Forge163.build.extension(worldExt,plan):worldExt,{atlas,custom,pack}=plan;if(!pack)return priorBuild161();S.asmSource=$('codeInput').value;if(custom&&!asm_assemble())throw Error(S.asmErrors.length?'Assembly failed — '+S.asmErrors[0].msg:'No executable code was emitted');const min=custom?Math.min(...S._asmWrites.map(x=>x[0])):0xC000;if(min<0x8000)throw Error('ROM code must live at $8000–$FFFF. Use .rs for RAM variables.');const base=min<0xC000?0x8000:0xC000,prgSize=65536-base;let PRG=new Uint8Array(prgSize),engine=null;const writes=new Set();if(custom){for(const [addr,val]of S._asmWrites){if(addr<base||addr>0xFFFF)throw Error('Code address $'+addr.toString(16).toUpperCase()+' is outside the selected PRG window');PRG[addr-base]=val;writes.add(addr)}for(let a=0xFFFA;a<=0xFFFF;a++)if(!writes.has(a))throw Error('Missing interrupt vectors: emit NMI, RESET and IRQ words at $FFFA.')}else{engine=makeViewerEngine(atlas.scenes.length);PRG=engine.prg;for(let a=0xC000;a<0xC000+engine.size;a++)writes.add(a)}function reserve(addr,bytes,label){if(addr<base||addr+bytes.length>0xFFFA)throw Error(label+' exceeds ROM capacity');for(let i=0;i<bytes.length;i++)if(writes.has(addr+i))throw Error(label+' overlaps code at $'+(addr+i).toString(16).toUpperCase());PRG.set(bytes,addr-base);for(let i=0;i<bytes.length;i++)writes.add(addr+i)}for(let si=0;si<atlas.scenes.length;si++){const sc=atlas.scenes[si],oam=expandOAM(sc.oam),block=new Uint8Array(1536);if(oam.length>64)throw Error('Scene '+(si+1)+' exceeds 64 hardware sprites');block.set(sc.nt);block.set(sc.attr,960);block.set(sc.pal.flat(),1024);block.set(sc.sprPal.flat(),1040);block[1056]=oam.length;oam.forEach((s,i)=>{if(s.y===0)throw Error('Sprite at screen Y=0 cannot be exported as normal OAM');block.set([(s.y-1)&255,s.tile,s.attr,s.x],1057+i*4)});packSceneMeta(block,sc);reserve(0xD000+si*0x600,block,'Scene '+(si+1)+' data')}reserve(0xD000+atlas.scenes.length*0x600,Uint8Array.from(atlas.tileProps),'Collision table');const extAddr=findAddr(ext.length,writes);reserve(extAddr,ext,'Runtime metadata extension');const marker=new Uint8Array(16);marker.set(E.encode('NFORGE15'));marker[8]=3;marker[9]=atlas.scenes.length;marker[10]=extAddr&255;marker[11]=extAddr>>8;marker[12]=ext.length&255;marker[13]=ext.length>>8;reserve(0xCFF0,marker,'NES Forge marker');const header=new Uint8Array(16);header.set([0x4E,0x45,0x53,0x1A,prgSize/16384,1,(S.mirroring==='v'?1:0)|(S.hasSRAM?2:0)]);const rom=new Uint8Array(16+prgSize+8192);rom.set(header);rom.set(PRG,16);rom.set(encodeTiles(atlas.chr),16+prgSize);rom.set(encodeTiles(atlas.sprChr),16+prgSize+4096);window._lastBuiltRom=rom;let cells=(S.worlds||[]).reduce((n,w)=>n+w.map.filter(v=>v>=0).length,0);log('Packed '+atlas.scenes.length+' scene(s) + '+(S.worlds?.length||0)+' world(s) / '+cells+' painted world cells.');log('NFEX/MT16 + WR16 v3 metadata: '+ext.length+' bytes at $'+extAddr.toString(16).toUpperCase()+'.');log('Built NROM: '+prgSize/1024+' KB PRG + 8 KB CHR • '+rom.length+' bytes.');log('World maps are preserved for tooling/future runtime; the current viewer still displays selected single-screen scenes.','bl-warn');if(S.instruments.length||S.animations.length)log('Audio/animation authoring preserved; automatic ROM playback runtime remains a later milestone.','bl-warn');if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');showToast('Build successful — '+rom.length+' bytes');return rom}catch(e){const d=document.createElement('div');d.className='bl-err';d.textContent=e.message;blog.appendChild(d);reportError(e);return null}}
buildNesRom=function(){/* download() is performed by the delegated or packed builder Save As path. */return isUnpacked()?priorBuild161():buildPacked()};
function parseWorldRom(prg,prgSize){return WorldCodec1621.inspectRom(prg,prgSize).worlds}
const priorImport161=importRom;
importRom=function(rom,name='Imported ROM'){
  let info;const before=S.scenes.length;
  try{const h=parseRomHeader(rom);info=WorldCodec1621.inspectRom(rom.slice(h.headerSize,h.headerSize+h.prgSize),h.prgSize)}catch(e){reportError(e);return false}
  const ok=priorImport161(rom,name);if(!ok||!info.version)return ok;
  const warnings=[...info.warnings];S.worlds=info.worlds.map(w=>{
    let tilesetSceneId=w.tilesetSceneId;
    if(info.version>=2)tilesetSceneId=S.scenes[before+w.buildSceneIndex]?.id;
    else if(info.sceneCount===1)tilesetSceneId=S.scenes[before]?.id;
    else warnings.push('WR16 v1 omitted build scene identities. Re-select the tileset for world "'+w.name+'" before rebuilding.');
    return Forge161.worlds.normalize({...w,tilesetSceneId});
  });
  Forge161.worlds.ensure();Forge161.worlds.renderUI();if(S.tab==='world')render();
  const message='Restored '+info.worlds.length+' world map(s) from WR16 v'+info.version;
  const issue=$('issueStatus');if(issue)issue.textContent=message+(warnings.length?' · '+warnings.join(' '):'');
  showToast(warnings.length?warnings.join(' '):message);return ok;
};
const pf=window.forge15_preflight;
window.forge15_preflight=function(){const p=pf();const box=$('forge15Preflight');if(!p)return null;try{if(p.pack&&S.worlds?.length){const wr=planWorldPayload(p),total=p.ext16.length+wr.length;box.innerHTML+='<div class="ok">✓ WR16 v3 build validation: '+S.worlds.length+' world(s), '+wr.length.toLocaleString()+' bytes</div>';if(total>3500)box.innerHTML+='<div class="warn">Combined metadata is large ('+total.toLocaleString()+' bytes); final placement still checks contiguous PRG capacity.</div>';}return p}catch(e){box.innerHTML+='<div class="err">✗ '+esc(e.message)+'</div>';return null}};$('forge15PreflightBtn').onclick=window.forge15_preflight;
Forge161.build={worldPayload:planWorldPayload,parseWorldRom,inspectWorldRom:WorldCodec1621.inspectRom,decodeWorldPayload:WorldCodec1621.decode,findAddress:findAddr};
Forge161.encodeWorlds=()=>planWorldPayload(Forge16.build.plan());Forge161.decodeWorlds=bytes=>WorldCodec1621.decode(bytes).worlds;
})();



