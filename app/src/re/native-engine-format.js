/* One verified engine adapter over the shared packed-record codec. Recognition
 * fixes every byte except explicitly editable fields; code/header/CHR/flags and
 * the transient encounter slot remain part of the fingerprint. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativeEngineFormat=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const dep=(name,file)=>root[name]||(typeof require==='function'?require(file):null),records=()=>dep('NativeRecords','./native-records.js'),sha=bytes=>dep('FamiTone2Native','./famitone2-native.js').sha256(bytes);
const id='zelda2-locations-v1',fingerprint='3af91b66d543b01231232d5dcbcb8b198b166e9cf8d8d68e2558541c247a2ecd';
const sets=[['west','West Hyrule',1,0x861f],['death-mountain','Death Mountain',1,0xa0fc],['east','East Hyrule',2,0x861f],['maze','Maze Island',2,0xa0fc]].map(([id,name,bank,cpu])=>Object.freeze({id,name,bank,cpu,offset:16+bank*16384+cpu-0x8000}));
function layout(set){const at=set.offset;return {count:63,fields:[
 {name:'y',offset:at,stride:1,mask:127,shift:0,editable:true},
 {name:'external',offset:at,stride:1,mask:128,shift:7,editable:false},
 {name:'x',offset:at+63,stride:1,mask:63,shift:0,editable:true},
 {name:'returnOffset',offset:at+63,stride:1,mask:192,shift:6,editable:false},
 {name:'scene',offset:at+126,stride:1,mask:63,shift:0,editable:true},
 {name:'entry',offset:at+126,stride:1,mask:192,shift:6,editable:true},
 {name:'destinationRegion',offset:at+189,stride:1,mask:3,shift:0,editable:false},
 {name:'destinationWorld',offset:at+189,stride:1,mask:28,shift:2,editable:false},
 {name:'travelFlags',offset:at+189,stride:1,mask:224,shift:5,editable:false}
 ]};}
function recognizes(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==262160)return false;
 const masked=Uint8Array.from(bytes);
 for(const s of sets)for(let i=0;i<62;i++){masked[s.offset+i]&=128;masked[s.offset+63+i]&=192;masked[s.offset+126+i]=0;}
 return sha(masked)===fingerprint;
}
function validateEdits(edits){
 if(!Array.isArray(edits)||edits.length>992)throw Error('Native engine: invalid edit collection.');
 const seen=new Set();for(const e of edits){
  if(!e||Object.keys(e).sort().join(',')!=='field,index,region,value'||!sets.some(s=>s.id===e.region)||!Number.isInteger(e.index)||e.index<0||e.index>61||!['x','y','scene','entry'].includes(e.field)||!Number.isInteger(e.value)||e.value<0||e.value>({x:63,y:127,scene:62,entry:3}[e.field]))throw Error('Native engine: unsupported location edit.');
  const key=e.region+':'+e.index+':'+e.field;if(seen.has(key))throw Error('Native engine: duplicate location edit.');seen.add(key);
 }
}
function encode(bytes,edits){
 if(!recognizes(bytes))throw Error('Native engine: unsupported code, header, flags or data revision.');validateEdits(edits);
 for(const edit of edits)if(edit.field==='scene'){
  const set=sets.find(s=>s.id===edit.region),external=!!(bytes[set.offset+edit.index]&128),world=external?(bytes[set.offset+189+edit.index]>>2)&7:0;
  let bank,table;
  if(!external){bank=set.bank;table=['death-mountain','maze'].includes(set.id)?0xa000:0x8523;}
  else if(world===1||world===2){bank=3;table=0x8523;}
  else if(world===3||world===4){bank=4;table=world===4?0xa000:0x8523;}
  else if(world===5){bank=5;table=0x8523;}
  else throw Error('Native engine: this special destination context has no verified scene-selector editor.');
  const at=16+bank*16384+table-0x8000+edit.value*2,cpu=bytes[at]|bytes[at+1]<<8,start=16+bank*16384+cpu-0x8000,length=bytes[start];
  if(cpu<0x8000||cpu>=0xc000||length<4||cpu+length>0xc000)throw Error('Native engine: destination scene is unavailable in its native table context.');
 }
 let output=Uint8Array.from(bytes);for(const set of sets)output=records().encode(output,layout(set),edits.filter(e=>e.region===set.id).map(({region,...e})=>e)).bytes;
 if(!recognizes(output))throw Error('Native engine: edited output changed a protected span.');
 const changes=[];for(let i=0;i<output.length;i++)if(bytes[i]!==output[i])changes.push({fileOffset:i,before:bytes[i],after:output[i]});
 return {bytes:output,changes};
}
function decode(bytes){if(!recognizes(bytes))throw Error('Native engine: unsupported source.');return sets.flatMap(s=>records().decode(bytes,layout(s)).map(r=>({...r,region:s.id,regionName:s.name,editable:r.index<62,sourceBank:s.bank})));}
return Object.freeze({id,version:1,sets:Object.freeze(sets),fingerprint,layout,sha256:sha,recognizes,validateEdits,decode,encode});
});
