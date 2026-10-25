/* BEGIN WR16 STABILIZATION CODEC — pure functions used by the editor and regression tests. */
const WorldCodec1621=(()=>{
'use strict';
const E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true}),KINDS=['entrance','spawn','exit'],MODES=['follow','locked','horizontal','vertical'];
function fail(message){throw Error('WR16: '+message)}
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)fail(label+' must be an integer from '+min+' through '+max);return v}
function bytesText(s,label,maxChars=255,required=false){if(typeof s!=='string'||s.length>maxChars||(required&&!s.length))fail(label+' is invalid');const b=E.encode(s);if(b.length>255||D.decode(b)!==s)fail(label+' must fit 255 valid UTF-8 bytes');return b}
function array(a,max,label){if(!Array.isArray(a)||a.length>max)fail(label+' exceeds '+max+' entries or is not an array');return a}
function validate(worlds,{identities=true,links=true}={}){
  array(worlds,32,'World list');const ids=new Set();
  for(const w of worlds){if(!w||typeof w!=='object')fail('Invalid world');
    if(identities){bytesText(w.id,'World ID',255,true);if(ids.has(w.id))fail('Duplicate world ID '+w.id);ids.add(w.id)}
    bytesText(w.name,'World name',100,identities);integer(w.widthScreens,1,16,'World width');integer(w.heightScreens,1,16,'World height');
    const cols=w.widthScreens*16,rows=w.heightScreens*15;array(w.map,61440,'World map');if(w.map.length!==cols*rows)fail('World map length does not match its dimensions');
    for(const v of w.map)integer(v,-1,254,'World metatile ID');
    for(const [key,max] of [['rooms',128],['markers',256],['cameraRegions',128]]){array(w[key],max,key);const seen=new Set();for(const o of w[key]){
      if(!o||typeof o!=='object')fail('Invalid '+key+' entry');if(identities){bytesText(o.id,key+' ID',255,true);if(seen.has(o.id))fail('Duplicate '+key+' ID '+o.id);seen.add(o.id)}
      bytesText(o.name,key+' name',80,identities);integer(o.x,0,cols-1,key+' X');integer(o.y,0,rows-1,key+' Y');
      if(key==='markers'){if(!KINDS.includes(o.kind))fail('Unknown marker kind');bytesText(o.targetWorldId,'Target world ID');bytesText(o.targetMarkerId,'Target marker ID')}
      else {integer(o.w,1,cols-o.x,key+' width');integer(o.h,1,rows-o.y,key+' height');if(key==='cameraRegions'&&!MODES.includes(o.mode))fail('Unknown camera mode')}
    }}
  }
  if(identities&&links){const byId=new Map(worlds.map(w=>[w.id,w]));for(const w of worlds)for(const m of w.markers){
    if(m.targetMarkerId&&!m.targetWorldId)fail('Marker "'+m.name+'" has a destination marker but no destination world');
    if(m.targetWorldId){const target=byId.get(m.targetWorldId);if(!target)fail('Marker "'+m.name+'" targets a missing world');if(m.targetMarkerId&&!target.markers.some(x=>x.id===m.targetMarkerId))fail('Marker "'+m.name+'" targets a missing marker')}
  }}
  return worlds;
}
function encode(worlds,plan){
  validate(worlds);if(!plan||!Array.isArray(plan.entries))fail('Missing build scene plan');const sceneToBuild=new Map(plan.entries.map((e,i)=>[e.sc.id,i])),a=[87,82,49,54,3,worlds.length];
  const text=s=>{const b=bytesText(s,'World text');a.push(b.length,...b)},u16=v=>a.push(v&255,v>>8);
  for(const w of worlds){const bi=sceneToBuild.get(w.tilesetSceneId);if(bi===undefined)fail('World "'+w.name+'" uses a tileset scene excluded from this build. Include that scene or change the world tileset.');integer(bi,0,254,'Build scene index');
    const src=plan.entries[bi].sc,present=new Set((src.metaMap||[]).filter(v=>v>=0)),used=new Set(w.map.filter(v=>v>=0)),missing=[...used].filter(id=>!present.has(id));
    if(missing.length)fail('World "'+w.name+'" uses metatile '+missing.slice(0,8).map(id=>'$'+id.toString(16).toUpperCase().padStart(2,'0')).join(', ')+' not linked in its tileset scene. Place each world-used metatile at least once in that scene so MT16 can preserve its definition.');
    text(w.id);text(w.name);a.push(bi,w.widthScreens,w.heightScreens);u16(w.map.length);for(const v of w.map)a.push(v<0?255:v);
    a.push(w.rooms.length);for(const r of w.rooms){text(r.id);text(r.name);u16(r.x);u16(r.y);u16(r.w);u16(r.h)}
    u16(w.markers.length);for(const m of w.markers){text(m.id);a.push(KINDS.indexOf(m.kind));text(m.name);u16(m.x);u16(m.y);text(m.targetWorldId);text(m.targetMarkerId)}
    a.push(w.cameraRegions.length);for(const r of w.cameraRegions){text(r.id);text(r.name);u16(r.x);u16(r.y);u16(r.w);u16(r.h);a.push(MODES.indexOf(r.mode))}
  }
  return Uint8Array.from(a);
}
function decode(b,start=0){
  if(!(b instanceof Uint8Array))fail('Expected a byte array');integer(start,0,b.length,'Record offset');let p=start;
  const need=n=>{if(!Number.isInteger(n)||n<0||p+n>b.length)fail('Truncated world metadata at byte '+p)},u8=()=>{need(1);return b[p++]},u16=()=>u8()|(u8()<<8),text=()=>{const n=u8();need(n);let s;try{s=D.decode(b.subarray(p,p+n))}catch(_){fail('Invalid UTF-8 at byte '+p)}p+=n;return s};
  need(6);if(b[p++]!==87||b[p++]!==82||b[p++]!==49||b[p++]!==54)fail('Missing world signature');const version=u8();if(![1,2,3].includes(version))fail('Unsupported world metadata version '+version);
  const count=u8();integer(count,0,32,'World count');const worlds=[];
  for(let wi=0;wi<count;wi++){
    const w={};if(version>=3)w.id=text();w.name=text();if(version===1)w.tilesetSceneId=text();else w.buildSceneIndex=u8();w.widthScreens=u8();w.heightScreens=u8();const n=u16();need(n);w.map=Array.from(b.subarray(p,p+n),v=>v===255?-1:v);p+=n;
    w.rooms=[];let count=u8();integer(count,0,128,'Room count');for(let ri=0;ri<count;ri++){const r={};if(version>=3)r.id=text();r.name=text();r.x=u16();r.y=u16();r.w=u16();r.h=u16();w.rooms.push(r)}
    w.markers=[];count=u16();integer(count,0,256,'Marker count');for(let mi=0;mi<count;mi++){const m={};if(version>=3)m.id=text();const kind=u8();integer(kind,0,2,'Marker kind');m.kind=KINDS[kind];m.name=text();m.x=u16();m.y=u16();m.targetWorldId=text();m.targetMarkerId=text();w.markers.push(m)}
    w.cameraRegions=[];count=u8();integer(count,0,128,'Camera count');for(let ci=0;ci<count;ci++){const r={};if(version>=3)r.id=text();r.name=text();r.x=u16();r.y=u16();r.w=u16();r.h=u16();const mode=u8();integer(mode,0,3,'Camera mode');r.mode=MODES[mode];w.cameraRegions.push(r)}worlds.push(w);
  }
  validate(worlds,{identities:version>=3,links:version>=3});const warnings=[];
  if(version<3&&worlds.some(w=>w.markers.some(m=>m.targetWorldId||m.targetMarkerId)))warnings.push('WR16 v'+version+' did not store world or marker identities. Its saved destination references are retained, but cannot be reliably resolved. Re-select marker destinations before rebuilding.');
  return {worlds,version,bytesRead:p-start,end:p,warnings};
}
function inspectRom(prg,prgSize){
  const empty={worlds:[],version:0,warnings:[],end:0,extension:null,extensionOffset:0,sceneCount:0};if(![16384,32768].includes(prgSize))return empty;
  if(!(prg instanceof Uint8Array)||prg.length!==prgSize)fail('Truncated PRG data');const base=prgSize===32768?0x4000:0,marker=base+0xFF0,ascii=(b,p,s)=>[...s].every((c,i)=>b[p+i]===c.charCodeAt(0));
  if(!ascii(prg,marker,'NFORGE15')||prg[marker+8]!==3)return empty;
  const addr=prg[marker+10]|prg[marker+11]<<8,len=prg[marker+12]|prg[marker+13]<<8,off=base+addr-0xC000;
  if(addr<0xC000||off<0||len<8||off+len>prgSize)fail('Runtime extension pointer is outside PRG');const b=prg.subarray(off,off+len);
  if(!ascii(b,0,'NFEX')||b[4]!==1)fail('Invalid NFEX runtime extension');const count=b[5],header=8+count*4;if(!count||count!==prg[marker+9]||header>b.length)fail('Invalid NFEX scene table');
  let end=header;const ranges=[];for(let i=0;i<count;i++){const q=8+i*4,start=b[q]|b[q+1]<<8,size=b[q+2]|b[q+3]<<8,stop=start+size;if(start<header||size<17||stop>b.length)fail('NFEX scene record is outside its extension');for(const r of ranges)if(start<r[1]&&stop>r[0])fail('Overlapping NFEX scene records');ranges.push([start,stop]);end=Math.max(end,stop)}
  const info={...empty,end,extension:b,extensionOffset:off,sceneCount:count};
  // WR16 is a trailer after bounded NFEX scene records, never a byte pattern inside text.
  while(end+4<=b.length&&ascii(b,end,'WR16')){const record=decode(b,end);if(record.version>=2)for(const w of record.worlds)integer(w.buildSceneIndex,0,count-1,'World build scene index');Object.assign(info,record);end=record.end;}
  return info;
}
return {validate,encode,decode,inspectRom};
})();
window.ForgeWorldCodec1621=WorldCodec1621;
/* END WR16 STABILIZATION CODEC */

