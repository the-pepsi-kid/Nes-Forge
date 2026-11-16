/* Experimental, READ-ONLY Zelda II side-view source RECORD decoder.
 * Source interpretation: original mapper1 8x16KiB ROM, native location set,
 * map pointer tables and length-delimited object streams.
 * No framebuffer, collision, AI, enemy placement, physics, nor side-view writer.
 * No original ROM bytes are emitted to hosted server, only bounded decoded metadata.
 */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ForgeZ2NativeRooms=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BANKS={west:{bank:1,secondary:false},'death-mountain':{bank:1,secondary:true},east:{bank:2,secondary:false},maze:{bank:2,secondary:true}};
const ERROR=m=>{throw Error('Z2 native room records: '+m)};
const safeInt=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function bankOffset(bank,cpu){if(!safeInt(bank,0,6)||!safeInt(cpu,0x8000,0xbfff))ERROR('invalid banked CPU address');return 16+bank*16384+cpu-0x8000;}
function bytePair(bytes,at){if(at<16||at+1>=bytes.length)ERROR('source pointer beyond ROM');return bytes[at]|bytes[at+1]<<8;}
function destination(sourceWorldId,values){
 const match=/^z2:(1|2):([01])$/.exec(sourceWorldId||'');if(!match)ERROR('unsupported native overworld identity');
 const reg={"z2:1:0":"west","z2:1:1":"death-mountain","z2:2:0":"east","z2:2:1":"maze"}[sourceWorldId],source=BANKS[reg];
 if(!values.external)return {region:reg,bank:source.bank,table:source.secondary?0xa000:0x8523,exitTable:source.secondary?0xa1f8:0x871b,kind:'overworld'};
 const w=values.destinationWorld;
 if(w===1||w===2)return {region:reg,bank:3,table:0x8523,exitTable:0x871b,kind:'town'};
 if(w===3||w===4)return {region:reg,bank:4,table:w===4?0xa000:0x8523,exitTable:w===4?0xa1f8:0x871b,kind:'palace'};
 if(w===5)return {region:reg,bank:5,table:0x8523,exitTable:0x871b,kind:'great-palace'};
 return null; // Unknown/special context: no guessed decoder.
}
function decode(bytes,sourceWorldId,record,height){
 if(!(bytes instanceof Uint8Array)||bytes.length!==262160||bytes[0]!==0x4e||bytes[1]!==0x45||bytes[2]!==0x53||bytes[3]!==0x1a||bytes[4]!==8||bytes[5]!==16||bytes[6]>>4!==1)ERROR('supported 8PRG/16CHR mapper1 ROM required');
 const v=record?.values||record;const i=record?.index;
 if(!v||!safeInt(i,0,61)||!safeInt(v.x,0,63)||!safeInt(v.y,0,127)||!safeInt(v.scene,0,62)||!safeInt(v.entry,0,3)||!safeInt(v.external,0,1)||!safeInt(v.destinationWorld,0,7))ERROR('invalid location fields');
 const xy={x:v.x,y:v.y-30};if(!safeInt(xy.y,0,height-1))return null;
 const dst=destination(sourceWorldId,v);if(!dst)return null;
 const ptr=bankOffset(dst.bank,dst.table)+v.scene*2,addr=bytePair(bytes,ptr);
 if(!safeInt(addr,0x8000,0xbfff))ERROR('native level pointer outside bank');
 const offset=bankOffset(dst.bank,addr),len=bytes[offset];
 if(!safeInt(len,4,255)||addr+len>0xc000||offset+len>16+dst.bank*16384+16384)ERROR('native scene record length unavailable');
 const flags=bytes[offset+1],ground=bytes[offset+2],palette=bytes[offset+3];
 const screens=((flags>>5)&3)+1,limitX=16*screens,objects=[];let cursor=0;
 for(let at=offset+4;at<offset+len;){
  if(at+1>=offset+len)ERROR('truncated 2-byte native object');
  const b0=bytes[at],b1=bytes[at+1],y=b0>>4,step=b0&15,startX=cursor;
  if(y===14){cursor=step*16;objects.push({x:startX,y,code:b1,advance:step,kind:'set-cursor',newX:cursor});at+=2;continue;}
  if(y===13){objects.push({x:startX,y,code:b1,advance:step,kind:'change-ground',ground:b1});cursor+=step;at+=2;continue;}
  const extended=(y<13&&b1===15);
  if(extended&&at+2>=offset+len)ERROR('truncated 3-byte object');
  const o={x:startX,y,code:b1,advance:step,kind:y===15?'special-object':extended?'item-reference':'object'};
  if(extended)o.itemCode=bytes[at+2];
  objects.push(o);cursor+=step;at+=extended?3:2;
  if(objects.length>126)ERROR('too many objects in native scene record');
 }
 const exitPos=bankOffset(dst.bank,dst.exitTable)+4*v.scene;
 if(exitPos+4>16+(dst.bank+1)*16384)ERROR('exit table out of bank');
 const exits=['left','down','up','right'].map((side,n)=>{const packed=bytes[exitPos+n];return {side,map:packed>>2,screen:packed&3,outside:(packed>>2)===63}});
 return {
  format:'nesforge.z2.native-room-record',version:1,
  location:{index:i,x:xy.x,y:xy.y,globalY:v.y,external:v.external,entry:v.entry,terrainSource:sourceWorldId},
  source:{bank:dst.bank,table:dst.table,scene:v.scene,cpu:addr,fileOffset:offset,length:len,kind:dst.kind},
  header:{objectSet:flags>>7,screenCount:screens,grass:!!(flags&8),bushes:!!(flags&4),flags,ground,groundTileSet:(ground>>4)&7,initialGroundPosition:ground&15,ceilingDisabled:!!(ground&128),palette,backgroundPalette:(palette>>3)&7,backMap:palette&7},
  exits,objects,
  evidence:'Original ROM header, object stream, map/exit pointer table bytes. Object art, collision, physics, scrolling, enemy tables, Link sprites, and transitions NOT recovered.',
  nativeSceneVerified:false,originalEnginePlayable:false
 };
}
function catalog(bytes,sourceWorldId,records,height){
 if(!Array.isArray(records))ERROR('native location records missing');
 const expected={"z2:1:0":"west","z2:1:1":"death-mountain","z2:2:0":"east","z2:2:1":"maze"}[sourceWorldId];if(!expected)ERROR('unsupported World');
 const stages=[],skipped=[];
 for(const r of records){if(r.region!==expected||r.index>=62)continue;try{const result=decode(bytes,sourceWorldId,r,height);if(result)stages.push(result);else skipped.push({index:r.index,reason:'outside map or unknown destination context'});}catch(e){skipped.push({index:r.index,reason:String(e.message).slice(0,160)});}}
 // A source location record remains separate when two entries share coordinates.
 return {format:'nesforge.z2.native-room-catalog',version:1,sourceWorldId,stages,skipped,scope:'READ-ONLY native level headers, object bytes, pointers and exits. No art/physics/AI recovered. No ROM data transmitted.'};
}
return Object.freeze({version:1,decode,catalog,destination});
});
