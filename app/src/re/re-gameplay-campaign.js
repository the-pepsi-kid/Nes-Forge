/* NES Forge v0.16 — bulk source-index RE campaign and reversible Zelda II experiments.
 * Index records are research annotations, not decoded/executable mechanics.
 * No ROM writes, project mutation or hosted authority. */
(()=>{'use strict';
const F=window.Forge=window.Forge||{}, services=F.services=F.services||{};
const PROFILE='zelda2-us', REFERENCE_SHA='ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c';
const ANCHORS=Object.freeze([
 {id:'up-stab-permission',bank:0,cpu:0x9574,offset:0x1584,hex:'AD 96 07 29 04 F0 07 A5 F7 29 08',meaning:'Read $0796 bit $04; animation selector $08 candidate'},
 {id:'down-stab-permission',bank:0,cpu:0x958c,offset:0x159c,hex:'AD 96 07 29 10 F0 08 A5 17 D0 04 A9 09 85 80',meaning:'Read $0796 bit $10; animation selector $09 candidate'},
 {id:'up-stab-display',bank:7,cpu:0xece6,offset:0x1ecf6,hex:'C9 08 D0 18 A6 11 B5 15 B4 9F',meaning:'Display path checks pose $08'},
 {id:'down-stab-display',bank:7,cpu:0xed04,offset:0x1ed14,hex:'B5 80 C9 09 D0 11 20 EA EC',meaning:'Display path checks pose $09'}
]);
const categories=Object.freeze([
 ['Player, movement and animation',/(link|jump|walk|run|fall|duck|crouch|st[a-z]*b|sword|slash|player|sprite|oam|shield|collision|velocity)/i],
 ['Combat, enemies and bosses',/(enemy|boss|damage|health|attack|hit|knock|death|invuln|experience|projectile|weapon|battle)/i],
 ['Spells, items and progression',/(spell|magic|mana|item|inventory|candle|glove|raft|hammer|flute|fairy|life|level|power|points|technique|thunder|fire|reflect)/i],
 ['Worlds, rooms and transitions',/(town|cave|palace|overworld|world|room|scene|area|map|scroll|screen|entrance|exit|location|door|bridge|warp|pointer|background)/i],
 ['Graphics, audio and tables',/(chr|ppu|tile|pattern|palette|color|music|audio|sound|apu|table|sprite|graphics|animation)/i]
]);
const toHex=(n,len=4)=>'$'+n.toString(16).toUpperCase().padStart(len,'0');
const sourceIndex=()=>{const o=window.GameREIndex?.[PROFILE];if(!o?.symbols||!Array.isArray(o.ram))throw Error('Bundled Zelda II source index unavailable.');return o;};
function indexedCatalog(){const ix=sourceIndex(),groups={};for(const [name] of categories)groups[name]={total:0,code:0,data:0};groups['Other indexed symbols']={total:0,code:0,data:0};
 const entries=ix.symbols.map(([bank,cpu,name,type,path,line],i)=>{const group=categories.find(([,re])=>re.test(name))?.[0]||'Other indexed symbols';groups[group].total++;if(type==='code')groups[group].code++;else groups[group].data++;
 const base=bank===7?0xc000:0x8000,off=Number.isInteger(bank)&&bank>=0&&bank<8&&cpu>=base&&cpu<base+0x4000?16+bank*0x4000+cpu-base:null;
 return {id:i,bank,cpu,address:toHex(cpu),fileOffset:off,symbol:name,kind:type,group,reference:path+':'+line};});
 return {profile:PROFILE,indexedCount:entries.length,codeCount:entries.filter(x=>x.kind==='code').length,dataCount:entries.filter(x=>x.kind==='data').length,ramIndex:ix.ram.map(([address,label])=>({address,hex:toHex(address),label})),groups,entries,sourceReference:ix.reference,claim:'These are preexisting research annotations with mapped source offsets, not independently recovered behavior or verified sprite/metasprite/collision mechanics.'};}
function lookupCatalog({term='',group='all',limit=100}={}){const q=String(term).trim().toLowerCase().slice(0,100);if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Limit must be 1–1000');const cat=indexedCatalog();const found=cat.entries.filter(e=>(group==='all'||e.group===group)&&(!q||[e.symbol,e.kind,e.reference,e.address,e.bank.toString()].some(v=>String(v).toLowerCase().includes(q))));return {total:found.length,rows:found.slice(0,limit),groups:cat.groups};}
function loadedROM(){const service=services.RERuntime;if(!service?.getROMSnapshot)throw Error('Forge RE Runtime unavailable.');return service.getROMSnapshot();}
function inspect(bytes){if(!(bytes instanceof Uint8Array))throw Error('ROM must be Uint8Array');const h=bytes,layout=h.length===262160&&h[0]===0x4e&&h[1]===0x45&&h[2]===0x53&&h[3]===0x1a&&h[4]===8&&h[5]===16&&((h[6]>>4)|(h[7]&0xf0))===1;
 const digest=typeof window.FamiTone2Native?.sha256==='function'?window.FamiTone2Native.sha256(bytes):null;
 const knownRevision=digest===REFERENCE_SHA,verifiedEdited=(!knownRevision&&layout)?!!window.ZeldaOverworld?.recognizes?.(bytes):false;
 const anchors=ANCHORS.map(a=>{const expected=a.hex.split(' ').map(x=>parseInt(x,16)),actual=Array.from(bytes.slice(a.offset,a.offset+expected.length));return {...a,verified:actual.length===expected.length&&actual.every((v,i)=>v===expected[i]),length:expected.length};});
 const safe=!!layout&&(knownRevision||verifiedEdited)&&anchors.every(x=>x.verified);
 return {format:'nesforge.re-source-attestation',version:1,profile:PROFILE,romByteLength:bytes.length,romSha256:digest,layoutVerified:layout,knownRevision,verifiedEdited,anchors,sourceGuard:safe?'verified-for-technique-test':'refused-unverified-source',explanation:safe?'Original engine anchors verified. Runtime intervention is still experimental and not gameplay parity.':'Source failed exact/verified-edited profile or protected routine byte checks. No RAM experiments permitted.'};}
function scanLoaded(){const source=loadedROM(),sourceAttestation=inspect(source.bytes),catalog=indexedCatalog();return {format:'nesforge.re-gamewide-campaign',version:1,source:{name:source.name,...sourceAttestation},indexed:{total:catalog.indexedCount,code:catalog.codeCount,data:catalog.dataCount,groups:catalog.groups,ramEntries:catalog.ramIndex.length,reference:catalog.sourceReference},anchors:sourceAttestation.anchors,
 recoveredStatus:{sourceIndex:'research-indexed',engineAnchors:sourceAttestation.sourceGuard==='verified-for-technique-test'?'byte-verified':'rejected',chrTiles:'raw-patterns-present-not-metasprite-mapping',movement:'source-routines-indexed-not-parity-verified',collision:'unverified',specialStabs:'permission-and-display-anchors-verified-not-combat-verified',enemyAI:'indexed-not-decoded-to-canonical',worldExits:'partial-native-catalog-needs-entrance-verification',multiplayer:'not-authorized'},
 nextActions:['Use a verified side-view checkpoint; never warp by patching scene RAM blindly.','Apply reversible original-technique unlock flags only with explicit test consent.','Collect isolated emulator OAM/RAM/CPU traces; verify collision and animation against the original.','Review canonical gameplay mappings before any multiplayer execution.'],romIncluded:false,runtimeEligibility:'blocked-unverified'};}
let experiment=null;
const status=()=>({active:!!experiment,sourceSha256:experiment?.sourceSha256||null,session:experiment?.session??null,patch:experiment?.patch||null,mode:experiment?.mode||null,events:experiment?.events?experiment.events.slice():[]});
function clearIfExpired(){if(experiment&&!services.EmulatorTimeline.status().loaded)experiment=null;}
function grantStabs(){clearIfExpired();if(experiment)throw Error('An RE technique experiment is already active; restore it first.');
 const source=loadedROM(),proof=inspect(source.bytes);if(proof.sourceGuard!=='verified-for-technique-test')throw Error('Source engine not verified for safe technique flag injection. No bytes changed.');
 const timeline=services.EmulatorTimeline;if(!timeline?.saveOwnedCheckpoint||!timeline?.patchRAM)throw Error('Reversible physical emulator checkpoints unavailable.');
 const before=timeline.readRAM(0x0796);let owned=null;
 try{owned=timeline.saveOwnedCheckpoint('RE Z2 source-verified techniques');const after=before.value|0x14;const patch=timeline.patchRAM([{address:0x0796,value:after,expected:before.value}]);
  experiment={owned,sourceSha256:proof.romSha256,session:timeline.status().session,patch,mode:'emulator-ram-only',events:[{operation:'grant-up-and-down-stab',address:'$0796',before:before.value,after,orMask:0x14,sourceSha256:proof.romSha256,frame:timeline.status().current}],claim:'Verified ability permission flag injection, not verified animation or attack activation.'};
  return status();
 }catch(error){if(owned){try{owned.restore();}catch{}try{owned.release();}catch{}}throw error;}
}
function restore(){if(!experiment)throw Error('No active RE technique experiment.');const e=experiment;let ok=false;try{e.owned.restore();ok=true;return {restored:true,sourceSha256:e.sourceSha256,note:'Physical emulator checkpoint restored; ROM and Forge project unchanged.'};}finally{if(ok){try{e.owned.release();}catch{}experiment=null;}}}
async function probe(type){if(!experiment)throw Error('Grant reversible technique flags first.');if(!['up','down'].includes(type))throw Error('Choose up/down');const timeline=services.EmulatorTimeline,trace=services.NativeAnimationTrace;
 if(!trace?.start||!timeline?.runScript)throw Error('Existing trace and input automation unavailable.');if(timeline.status().session!==experiment.session)throw Error('ROM/emulator session changed; restore or restart experiment.');
 const keys=type==='up'?['Up','B']:['Down','B'];const script=[{frames:6,buttons:[]},{frames:2,buttons:['A']},{frames:7,buttons:['A',...keys]},{frames:14,buttons:keys},{frames:12,buttons:[]}];
 if(trace.recording)throw Error('Stop the currently active manual trace before probing.');
 // Scripted input is guarded by Forge's emulator tab lifecycle. Navigate first
 // so leaving EMULATOR cannot silently cancel the input playback mid-run.
 if(typeof switchTab==='function')switchTab('emu');let result;
 trace.start();try{result=await timeline.runScript(script);}finally{trace.stop();}
 const evidence=trace.report();const summary={type,executedFrames:result.executedFrames,completed:result.completed,sourceSha256:experiment.sourceSha256,intervention:experiment.events[0],observedFrames:evidence.frameCount,frameRange:[evidence.frames[0]?.frame??null,evidence.frames.at(-1)?.frame??null],notes:['Actions were probed from the current emulator state; this is not a validated ability-ready scene or confirmed upward/downward stab.','Original ROM is unchanged; technique permission bits were injected into isolated emulator RAM.','Compare OAM and code/collision execution before upgrading recovery status.']};
 experiment.events.push({operation:'input-probe',...summary});return summary;
}
services.REGameplayCampaign=Object.freeze({indexedCatalog,lookupCatalog,inspect,scanLoaded,grantStabs,restore,probe,status,anchors:ANCHORS});
})();
