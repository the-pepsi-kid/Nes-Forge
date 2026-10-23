/* Standard MMC2 banking. PPU reads return the current byte before latching.
 * CPU/APU instruction behavior is supplied by the existing Forge cores. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ForgeMMC2=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(prgBytes,chrBytes,mirror=0){if(!Number.isInteger(prgBytes)||prgBytes<32768||prgBytes>131072||prgBytes%8192||!Number.isInteger(chrBytes)||chrBytes<8192||chrBytes>131072||chrBytes%4096||![0,1].includes(mirror))throw Error('Unsupported MMC2 physical layout');return {prgBytes,chrBytes,prg:0,chr:[0,0,0,0],latch:[1,1],mirror};}
function write(s,a,v){v&=255;switch(a&0xf000){case 0xa000:s.prg=v&15;break;case 0xb000:s.chr[0]=v&31;break;case 0xc000:s.chr[1]=v&31;break;case 0xd000:s.chr[2]=v&31;break;case 0xe000:s.chr[3]=v&31;break;case 0xf000:s.mirror=(v&1)?0:1;break;}}
function cpu(s,a){if(a<0x8000||a>0xffff)throw Error('MMC2 CPU address out of range');return a<0xa000?(s.prg%(s.prgBytes/8192))*8192+(a&8191):s.prgBytes-24576+a-0xa000;}
function chr(s,a){if(a<0||a>8191)throw Error('MMC2 PPU address out of range');const half=a>>12;return (s.chr[half*2+s.latch[half]]*4096+(a&4095))%s.chrBytes;}
function latch(s,a){if(a===0xfd8)s.latch[0]=0;else if(a===0xfe8)s.latch[0]=1;else if(a>=0x1fd8&&a<=0x1fdf)s.latch[1]=0;else if(a>=0x1fe8&&a<=0x1fef)s.latch[1]=1;}
return Object.freeze({create,write,cpu,chr,latch});
});
