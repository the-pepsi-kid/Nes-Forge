/* Bounded row-local nibble RLE. This codec owns bytes, not game semantics. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativeRowRLE=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const need=(ok,m)=>{if(!ok)throw Error('Native RLE: '+m);};
function shape(width,height){need(Number.isInteger(width)&&width>0&&width<=256&&Number.isInteger(height)&&height>0&&width*height<=65536,'invalid dimensions');}
function decode(bytes,start,end,width,height){
 shape(width,height);need(bytes instanceof Uint8Array&&Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end<=bytes.length&&start<end,'invalid source bounds');
 const cells=[],rows=[];let p=start;
 for(let y=0;y<height;y++){rows.push(p);let x=0;while(x<width){need(p<end,'compressed map exceeds its source allocation');const v=bytes[p++],n=(v>>4)+1;need(x+n<=width,'run crosses a row boundary');for(let i=0;i<n;i++)cells.push(v&15);x+=n;}}
 return {cells,rows,start,end:p,bytes:p-start};
}
function encode(cells,width,height){
 shape(width,height);need(Array.isArray(cells)&&cells.length===width*height&&Array.from(cells).every(v=>Number.isInteger(v)&&v>=0&&v<16),'cells must be native categories 0–15');
 const bytes=[];for(let y=0;y<height;y++)for(let x=0;x<width;){const v=cells[y*width+x];let n=1;while(n<16&&x+n<width&&cells[y*width+x+n]===v)n++;bytes.push(((n-1)<<4)|v);x+=n;}return Uint8Array.from(bytes);
}
return Object.freeze({decode,encode});
});
