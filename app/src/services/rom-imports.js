/*
 * NES FORGE MODULE: src/services/rom-imports.js
 * Entry: Forge.services.RomImports
 * Purpose: one event for "the developer imported a ROM", carrying that ROM's exact bytes, name, SHA-256 and the path
 *   it came through. Listeners (the background investigation panel) act on the ROM named by the event, never on a
 *   guess between the project's source ROM and whatever the emulator last ran.
 *   Sources: the project gateway (Open ROM / project / ZIP, when the file is a ROM), the legacy Import ROM button
 *   (when the import succeeded) and the emulator's Load ROM (when the emulator accepted it). ROMs that Forge builds
 *   itself (Build & Run) are not imports and raise no event.
 *   The last few imported ROMs are kept in memory for this tab only (never stored).
 * Bundle order: after the legacy editor and the emulator (it wraps importRom and emuLoadRom), before the panel.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,MAX=6,list=[],listeners=new Set();
const hex=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function sha256(bytes){
  if(window.NativeEngineFormat?.sha256)return window.NativeEngineFormat.sha256(bytes);
  return hex(await crypto.subtle.digest('SHA-256',bytes));
}
async function record(bytes,name,via,extra={}){
  const data=bytes instanceof Uint8Array?bytes.slice():new Uint8Array(bytes);
  const entry=Object.freeze({sha256:extra.sha256||await sha256(data),name:String(name||'rom.nes').slice(0,160),via:String(via),at:Date.now(),size:data.length,
    ines:data.length>=16&&data[0]===0x4e&&data[1]===0x45&&data[2]===0x53&&data[3]===0x1a,bytes:data});
  const i=list.findIndex(e=>e.sha256===entry.sha256);if(i>=0)list.splice(i,1);list.push(entry);while(list.length>MAX)list.shift();
  for(const fn of [...listeners])try{fn(entry);}catch(_){/* a listener never breaks an import */}
  return entry;
}
const strip=({bytes,...e})=>e;
// the legacy Import ROM button: record when the import succeeded
if(typeof importRom==='function'){
  const original=importRom;
  importRom=function(rom,name,...rest){const result=original.call(this,rom,name,...rest);
    if(result!==false&&rom&&rom.length)void record(rom instanceof Uint8Array?rom:new Uint8Array(rom),name||'Imported ROM','import-rom');return result;};
}
// the emulator's Load ROM: record when the emulator accepted the file
if(typeof emuLoadRom==='function'){
  const original=emuLoadRom;
  emuLoadRom=async function(e,...rest){
    const file=e?.target?.files?.[0],read=file?file.arrayBuffer().then(b=>new Uint8Array(b)).catch(()=>null):null;
    const result=await original.call(this,e,...rest);
    const bytes=read?await read:null;
    if(bytes&&typeof emu!=='undefined'&&emu.loaded&&emu.romName===file.name)void record(bytes,file.name,'emulator-load');
    return result;
  };
}
services.RomImports=Object.freeze({record,sha256,
  list:()=>list.map(strip),last:()=>list.length?strip(list[list.length-1]):null,
  bytes:sha=>list.find(e=>e.sha256===sha)?.bytes.slice()||null,
  subscribe(fn){if(typeof fn!=='function')throw Error('listener must be a function');listeners.add(fn);return()=>listeners.delete(fn);}});
})();
