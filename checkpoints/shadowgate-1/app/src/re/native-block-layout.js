/* Bounded linear native block formats. This decoder reads source records;
 * it never substitutes captured viewports or infers collision from graphics.
 * Format leads: CadEditor b28316d, Settings_Tmnt-1.cs / Utils.cs. Independent
 * implementation; addresses, sizes and bit layout were checked against input. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativeBlockLayout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const profiles=Object.freeze([Object.freeze({id:'tmnt-us-area1-blocks-v1',sha256:'9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083',protectedSha256:'d00c4133288d7f5599b0cb0df61dbf71c5d72fbb54af3612838c867043bd3eb9',byteLength:262160,label:'Area 1 · side-view screen table',screens:20,columns:8,rows:6,screenOffset:0x4e79,blockOffset:0xc011,blockCount:212,attributeOffset:0xcd51,chrOffset:0x35010,paletteOffset:0x1f7f3})]);
const fail=m=>{throw Error('Native block layout: '+m);};
function range(bytes,start,length){if(!(bytes instanceof Uint8Array)||!Number.isInteger(start)||!Number.isInteger(length)||start<16||length<0||start+length>bytes.length)fail('Source range is outside the selected ROM.');return bytes.slice(start,start+length);}
function inspect(bytes,profile){
 if(!profiles.includes(profile)||bytes.length!==profile.byteLength)fail('Unsupported verified format.');
 const p=profile,tiles=range(bytes,p.chrOffset,4096),blocks=Array.from({length:p.blockCount},(_,id)=>({id,tiles:Array.from(range(bytes,p.blockOffset+id*16,16)),attributes:range(bytes,p.attributeOffset+id,1)[0]}));
 const colors=range(bytes,p.paletteOffset,12);if(colors.some(c=>c>63))fail('Invalid native palette entry.');
 const palette=Array.from({length:4},(_,i)=>[15,...colors.slice(i*3,i*3+3)]);
 const chr=Array.from({length:256},(_,i)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((tiles[i*16+y]>>(7-x))&1)|(((tiles[i*16+y+8]>>(7-x))&1)<<1))));
 const screens=Array.from({length:p.screens},(_,index)=>{const offset=p.screenOffset+index*p.columns*p.rows,cells=Array.from(range(bytes,offset,p.columns*p.rows));if(cells.some(b=>b>=p.blockCount))fail('Screen references an unknown native block.');return {index,id:'native-block-screen:'+p.id+':'+index,label:p.label+' · '+index,offset,cells};});
 return {profile:p,blocks,chr,palette,screens};
}
function projectScreen(catalog,index,cells){
 const {profile:p,blocks}=catalog,s=catalog.screens[index];if(!s)fail('Unknown source screen.');cells=cells||s.cells;
 if(!Array.isArray(cells)||cells.length!==p.columns*p.rows||cells.some(b=>!Number.isInteger(b)||b<0||b>=blocks.length))fail('Invalid native screen cells.');
 // The native table covers 256x192 pixels. The final 48 canvas rows are
 // explicitly outside this resource, not a recovered HUD or menu.
 const nt=Array(960).fill(0),attr=Array(64).fill(0);
 cells.forEach((id,i)=>{const x=(i%p.columns)*4,y=Math.floor(i/p.columns)*4,b=blocks[id];for(let k=0;k<16;k++)nt[(y+(k>>2))*32+x+(k&3)]=b.tiles[k];attr[(y>>2)*8+(x>>2)]=b.attributes;});
 return {nt,attr};
}
function encode(bytes,catalog,edits){
 const p=catalog.profile;if(!Array.isArray(edits)||edits.length>p.screens*p.columns*p.rows)fail('Invalid native edit list.');
 const output=bytes.slice(),seen=new Set(),changes=[];
 for(const e of edits){if(!e||Object.keys(e).sort().join(',')!=='block,cell,screen'||!Number.isInteger(e.screen)||e.screen<0||e.screen>=p.screens||!Number.isInteger(e.cell)||e.cell<0||e.cell>=p.columns*p.rows||!Number.isInteger(e.block)||e.block<0||e.block>=p.blockCount)fail('Invalid native block edit.');const key=e.screen+':'+e.cell;if(seen.has(key))fail('Duplicate native block edit.');seen.add(key);const offset=catalog.screens[e.screen].offset+e.cell;if(output[offset]!==e.block){changes.push({offset,before:output[offset],after:e.block});output[offset]=e.block;}}
 return {bytes:output,changes};
}
return Object.freeze({profiles,inspect,projectScreen,encode});
});
