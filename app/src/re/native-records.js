/* Source-independent fixed-size packed records. Layouts are trusted adapter
 * declarations, never executable project input. No byte outside a field mask
 * can change, and every record retains its original packed flags. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativeRecords=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const fail=m=>{throw Error('Native records: '+m);};
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const cp=v=>JSON.parse(JSON.stringify(v));
function layout(value,length){
 if(!value||typeof value!=='object'||!int(length,1,64*1024*1024)||!int(value.count,1,4096)||!Array.isArray(value.fields)||!value.fields.length||value.fields.length>32)fail('Invalid bounded layout.');
 const names=new Set(),ownership=new Map();
 for(const f of value.fields){
  if(!f||typeof f.name!=='string'||!/^[a-z][a-zA-Z0-9]{0,47}$/.test(f.name)||names.has(f.name)||!int(f.offset,0,length-1)||!int(f.stride,1,4096)||!int(f.mask,1,255)||!int(f.shift,0,7)||typeof f.editable!=='boolean')fail('Invalid or duplicate field.');
  const max=f.mask>>f.shift;if((max<<f.shift)!==f.mask||(max&(max+1))!==0)fail('Field mask must be contiguous and aligned.');
  if(f.offset+(value.count-1)*f.stride>=length)fail('Field crosses source bounds.');
  names.add(f.name);
  for(let i=0;i<value.count;i++){const at=f.offset+i*f.stride,prior=ownership.get(at)||0;if(prior&f.mask)fail('Field masks overlap.');ownership.set(at,prior|f.mask);}
 }
 return value;
}
function decode(bytes,spec){
 if(!(bytes instanceof Uint8Array))fail('Expected source bytes.');layout(spec,bytes.length);
 return Array.from({length:spec.count},(_,index)=>({index,values:Object.fromEntries(spec.fields.map(f=>[f.name,(bytes[f.offset+index*f.stride]&f.mask)>>f.shift])),sources:spec.fields.map(f=>({field:f.name,fileOffset:f.offset+index*f.stride,mask:f.mask,shift:f.shift,original:bytes[f.offset+index*f.stride]}))}));
}
function encode(bytes,spec,edits){
 if(!(bytes instanceof Uint8Array))fail('Expected source bytes.');layout(spec,bytes.length);
 if(!Array.isArray(edits)||edits.length>16384)fail('Invalid edit collection.');
 const rom=Uint8Array.from(bytes),seen=new Set();
 for(const e of edits){
  if(!e||Object.keys(e).sort().join(',')!=='field,index,value'||!int(e.index,0,spec.count-1))fail('Invalid edit record.');
  const f=spec.fields.find(f=>f.name===e.field);if(!f?.editable)fail('Field is not editable.');
  if(!int(e.value,0,f.mask>>f.shift))fail('Value exceeds its native field.');
  const key=e.index+':'+e.field;if(seen.has(key))fail('Duplicate edit.');seen.add(key);
  const at=f.offset+e.index*f.stride;rom[at]=(rom[at]&~f.mask)|(e.value<<f.shift);
 }
 const changes=[];for(let at=0;at<rom.length;at++)if(rom[at]!==bytes[at])changes.push({fileOffset:at,before:bytes[at],after:rom[at]});
 return {bytes:rom,changes};
}
return Object.freeze({version:1,layout,decode,encode});
});
