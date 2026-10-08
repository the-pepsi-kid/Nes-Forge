'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','NES_Forge_1.6.2.1_Stabilized.html'),'utf8');
const code=html.slice(html.indexOf('/* BEGIN WR16 STABILIZATION CODEC'),html.indexOf('/* END WR16 STABILIZATION CODEC */'));
const sandbox={TextEncoder,TextDecoder,Uint8Array,window:{}};vm.runInNewContext(code,sandbox,{timeout:1000});const codec=sandbox.window.ForgeWorldCodec1621;
const clone=v=>JSON.parse(JSON.stringify(v));let passed=0;const tests=[];
function test(name,fn){try{fn();passed++;tests.push({name,passed:true})}catch(error){tests.push({name,passed:false,error:error.message});throw error}}
function world(id='world_a'){return {id,name:'World '+id,tilesetSceneId:'scene_a',widthScreens:1,heightScreens:1,map:Array(240).fill(-1),rooms:[{id:'room_'+id,name:'Room',x:1,y:2,w:3,h:4}],markers:[{id:'mark_'+id,name:'Entrance',kind:'entrance',x:2,y:3,targetWorldId:'',targetMarkerId:''}],cameraRegions:[{id:'cam_'+id,name:'Camera',x:0,y:0,w:16,h:15,mode:'follow'}]}}
const plan={entries:[{sc:{id:'scene_a',metaMap:[0,1,254]}}]},a=world(),b=world('world_b');a.map[0]=254;a.markers[0].targetWorldId=b.id;a.markers[0].targetMarkerId=b.markers[0].id;b.markers[0].targetWorldId=a.id;b.markers[0].targetMarkerId=a.markers[0].id;
const worlds=[a,b],encoded=codec.encode(worlds,plan);
function decodedExpected(w,index=0){const d=clone(w);delete d.tilesetSceneId;d.buildSceneIndex=index;return d}
function fixtureLegacy(version,ws=worlds){const out=[87,82,49,54,version,ws.length],u16=v=>out.push(v&255,v>>8),txt=s=>{const bs=new TextEncoder().encode(s);out.push(bs.length,...bs)};for(const w of ws){txt(w.name);if(version===1)txt(w.tilesetSceneId);else out.push(0);out.push(w.widthScreens,w.heightScreens);u16(w.map.length);out.push(...w.map.map(x=>x<0?255:x));out.push(w.rooms.length);for(const r of w.rooms){txt(r.name);u16(r.x);u16(r.y);u16(r.w);u16(r.h)}u16(w.markers.length);for(const m of w.markers){out.push(['entrance','spawn','exit'].indexOf(m.kind));txt(m.name);u16(m.x);u16(m.y);txt(m.targetWorldId);txt(m.targetMarkerId)}out.push(w.cameraRegions.length);for(const r of w.cameraRegions){txt(r.name);u16(r.x);u16(r.y);u16(r.w);u16(r.h);out.push(['follow','locked','horizontal','vertical'].indexOf(r.mode))}}return Uint8Array.from(out)}
function fakePrg(payload,prgSize=16384,recordBytes){const prg=new Uint8Array(prgSize),base=prgSize===32768?0x4000:0,extOff=base+0x300,marker=base+0xFF0,record=recordBytes||new Uint8Array(17),nfex=new Uint8Array(12+record.length+payload.length);nfex.set([78,70,69,88,1,1]);nfex.set([12,0,record.length&255,record.length>>8],8);nfex.set(record,12);nfex.set(payload,12+record.length);prg.set(nfex,extOff);prg.set(new TextEncoder().encode('NFORGE15'),marker);prg.set([3,1,0,0xC3,nfex.length&255,nfex.length>>8],marker+8);return prg}
function invalid(mutator,pattern){const ws=clone(worlds);mutator(ws);assert.throws(()=>codec.encode(ws,plan),pattern)}
try{
 test('WR16 v3 preserves IDs and bidirectional cross-world destinations',()=>{const d=codec.decode(encoded);assert.equal(d.version,3);assert.deepEqual(clone(d.worlds),worlds.map(w=>decodedExpected(w)));assert.equal(d.end,encoded.length);assert.equal(d.warnings.length,0)});
 test('Input authoring data remains unchanged by encoding',()=>{const before=JSON.stringify(worlds);codec.encode(worlds,plan);assert.equal(JSON.stringify(worlds),before)});
 test('Build order selects the actual tileset scene index',()=>{const p={entries:[{sc:{id:'other',metaMap:[]}},{sc:plan.entries[0].sc}]};assert.equal(codec.decode(codec.encode(worlds,p)).worlds[0].buildSceneIndex,1)});
 test('Self-world destination and Unicode names remain exact',()=>{const w=world();w.name='雪の城 🐉 WR16';w.markers[0].targetWorldId=w.id;w.markers[0].targetMarkerId=w.markers[0].id;assert.deepEqual(clone(codec.decode(codec.encode([w],plan)).worlds[0]),decodedExpected(w))});
 test('Empty world list roundtrips explicitly',()=>assert.equal(codec.decode(codec.encode([],plan)).worlds.length,0));
 test('Maximum 16 by 16 world map stays exactly 61440 cells',()=>{const w=world();w.widthScreens=w.heightScreens=16;w.map=Array(61440).fill(-1);assert.equal(codec.decode(codec.encode([w],plan)).worlds[0].map.length,61440)});
 test('Map metatile values -1, 0, 1 and 254 remain distinct',()=>{const w=world();w.map.splice(0,4,-1,0,1,254);assert.deepEqual(clone(codec.decode(codec.encode([w],plan)).worlds[0].map.slice(0,4)),[-1,0,1,254])});
 test('No version 3 prefix can decode from truncated data',()=>{for(let n=0;n<encoded.length;n++)assert.throws(()=>codec.decode(encoded.subarray(0,n)),/WR16:/)});
 test('Decoder returns consumed boundary and permits following extensions',()=>{const prefixed=Uint8Array.from([4,5,...encoded,77,83,49,54,1]);const d=codec.decode(prefixed,2);assert.equal(d.end,encoded.length+2);assert.equal(d.bytesRead,encoded.length)});
 test('Unknown WR16 version is rejected',()=>{const v=encoded.slice();v[4]=4;assert.throws(()=>codec.decode(v),/Unsupported/)});
 test('Invalid UTF-8 fails instead of substitution',()=>{const v=encoded.slice();v[7]=255;assert.throws(()=>codec.decode(v),/UTF-8/)});
 for(const version of [1,2]){
  test('Legacy v'+version+' maps and original destination references are retained with warning',()=>{const d=codec.decode(fixtureLegacy(version));assert.equal(d.version,version);assert.equal(d.worlds.length,2);assert.equal(d.worlds[0].markers[0].targetMarkerId,b.markers[0].id);assert.equal(d.worlds[0].id,undefined);assert.equal(d.warnings.length,1)});
  test('Legacy v'+version+' truncation is rejected at every prefix',()=>{const f=fixtureLegacy(version);for(let n=0;n<f.length;n++)assert.throws(()=>codec.decode(f.subarray(0,n)),/WR16:/)});
 }
 test('More than 32 worlds rejected',()=>assert.throws(()=>codec.encode(Array(33).fill(a),plan),/World list/));
 test('Duplicate world identity rejected',()=>invalid(ws=>ws[1].id=ws[0].id,/Duplicate world/));
 test('Duplicate marker identity rejected',()=>invalid(ws=>ws[0].markers.push(clone(ws[0].markers[0])),/Duplicate markers/));
 test('Unknown destination world rejected',()=>invalid(ws=>ws[0].markers[0].targetWorldId='missing',/missing world/));
 test('Unknown destination marker rejected',()=>invalid(ws=>ws[0].markers[0].targetMarkerId='missing',/missing marker/));
 test('Marker-only destination rejected',()=>invalid(ws=>ws[0].markers[0].targetWorldId='',/no destination world/));
 test('World shape mismatch rejected',()=>invalid(ws=>ws[0].map.pop(),/map length/));
 test('Fractional screen count rejected',()=>invalid(ws=>ws[0].widthScreens=1.5,/World width/));
 test('Metatile byte overflow rejected',()=>invalid(ws=>ws[0].map[0]=255,/metatile ID/));
 test('Missing linked metatile definition rejected',()=>invalid(ws=>ws[0].map[0]=100,/not linked/));
 test('Excluded world tileset rejected',()=>invalid(ws=>ws[0].tilesetSceneId='excluded',/excluded/));
 test('World name exceeding normalizer character limit rejected',()=>invalid(ws=>ws[0].name='x'.repeat(101),/World name/));
 test('World text exceeding UTF-8 byte capacity rejected',()=>invalid(ws=>ws[0].name='雪'.repeat(86),/UTF-8/));
 test('Lone surrogate cannot silently become a replacement character',()=>invalid(ws=>ws[0].name='bad\uD800',/UTF-8/));
 test('Rectangle extending past world edge rejected',()=>invalid(ws=>ws[0].rooms[0].x=15,/rooms width/));
 test('Marker outside world rejected',()=>invalid(ws=>ws[0].markers[0].y=15,/markers Y/));
 test('More than 128 rooms rejected',()=>invalid(ws=>ws[0].rooms=Array(129).fill(ws[0].rooms[0]),/rooms exceeds/));
 test('More than 256 markers rejected',()=>invalid(ws=>ws[0].markers=Array(257).fill(ws[0].markers[0]),/markers exceeds/));
 test('Unknown marker kind rejected',()=>invalid(ws=>ws[0].markers[0].kind='portal',/marker kind/));
 test('Unknown camera mode rejected',()=>invalid(ws=>ws[0].cameraRegions[0].mode='invalid',/camera mode/));
 for(const size of [16384,32768])test('WR16 parsed from '+size+' byte PRG with exact boundary',()=>{const d=codec.inspectRom(fakePrg(encoded,size),size);assert.equal(d.version,3);assert.equal(d.end,29+encoded.length);assert.equal(d.extensionOffset,(size===32768?0x4000:0)+0x300)});
 test('Fake WR16 signature inside NFEX scene record is not interpreted',()=>{const record=Uint8Array.from([...new Uint8Array(17),87,82,49,54,99,...new Uint8Array(20)]);assert.equal(codec.inspectRom(fakePrg(encoded,16384,record),16384).version,3)});
 test('Legacy trailer followed by v3 resolves to the authoritative last record',()=>{const payload=Uint8Array.from([...fixtureLegacy(1),...encoded]);assert.equal(codec.inspectRom(fakePrg(payload),16384).version,3)});
 test('Zero-world ROM returns the exact boundary needed by following extensions',()=>{const payload=codec.encode([],plan),d=codec.inspectRom(fakePrg(Uint8Array.from([...payload,77,83,49,54,1,0])),16384);assert.equal(d.worlds.length,0);assert.equal(d.version,3);assert.equal(d.end,29+payload.length)});
 test('Following MS16 extension does not corrupt the world record boundary',()=>{const d=codec.inspectRom(fakePrg(Uint8Array.from([...encoded,77,83,49,54,1,0])),16384);assert.equal(d.end,29+encoded.length)});
 test('Out-of-range NFEX pointer rejected',()=>{const p=fakePrg(encoded);p[0xFFB]=0xFF;assert.throws(()=>codec.inspectRom(p,16384),/outside PRG/)});
 test('Out-of-range NFEX scene record rejected',()=>{const p=fakePrg(encoded);p[0x308]=255;p[0x309]=255;assert.throws(()=>codec.inspectRom(p,16384),/scene record/)});
 test('Invalid world build-scene index rejected before import',()=>{const w=world();const payload=codec.encode([w],{entries:[{sc:{id:'other'}},plan.entries[0]]});assert.throws(()=>codec.inspectRom(fakePrg(payload),16384),/build scene index/)});
 test('Truncated PRG fails rather than normalizing partial worlds',()=>assert.throws(()=>codec.inspectRom(fakePrg(encoded).subarray(0,16000),16384),/Truncated PRG/));
 test('Non-Forge ROM has no WR16 metadata',()=>assert.equal(codec.inspectRom(new Uint8Array(16384),16384).version,0));
 for(const name of ['findExtensionAddress','findExtAddr16','findAddr']){
  const line=html.split('\n').find(l=>l.startsWith('function '+name+'('));assert(line,name+' not found');const c={EXT_MARKER_ADDR:0xCFF0};vm.runInNewContext(line+';globalThis.alloc='+name,c);
  test(name+' advances beyond occupied aligned and unaligned bytes',()=>{assert.equal(c.alloc(16,new Set([0xC200])),0xC210);assert.equal(c.alloc(20,new Set([0xC203,0xC215])),0xC220)});
  test(name+' fails promptly when all available addresses occupied',()=>{c.used=new Set(Array.from({length:0xDF0},(_,i)=>0xC200+i));assert.throws(()=>vm.runInNewContext('alloc(32,used)',c,{timeout:200}),/no contiguous space/)});
  test(name+' accepts exact capacity and rejects oversized/invalid length',()=>{assert.equal(c.alloc(0xDF0,new Set()),0xC200);assert.throws(()=>c.alloc(0xDF1,new Set()),/no contiguous space/);assert.throws(()=>c.alloc(-1,new Set()),/nonnegative integer/);assert.throws(()=>c.alloc(1.5,new Set()),/nonnegative integer/)});
 }
 const report={suite:'WR16 stabilization codec and metadata allocators',passed,total:tests.length,tests};console.log(JSON.stringify(report,null,2));
}catch(error){console.error(JSON.stringify({passed,total:tests.length,tests},null,2));console.error(error);process.exitCode=1}
