/* Private-source original Zelda II Link DISPLAY pose atlas, not native runtime
 * motion/collision/attack semantics. Reuse Forge GameRENative's OAM evidence;
 * asset never includes ROM bytes and never publishes without owner action.
 */
(()=>{'use strict';
 const cols=15,rows=2,cellWidth=32,cellHeight=40;
 const build=(rom)=>{
  if(!(rom instanceof Uint8Array)||!window.ZeldaOverworld?.recognizes?.(rom))throw Error('Verified Zelda II input required for Link display recovery.');
  const report=window.GameRENative?.inspect?.(rom,'Zelda II private source');
  if(report?.status!=='supported'||report.profile?.id!=='zelda2-us'||report.poses?.length!==30)throw Error('GameRENative did not recover 30 original Zelda II Link display poses.');
  const canvas=document.createElement('canvas');canvas.width=cols*cellWidth;canvas.height=rows*cellHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});const pixel=ctx.createImageData(canvas.width,canvas.height);
  const chrStart=16+8*16384;
  // Zelda II's initial Link physical CHR tile bank; animation-time bank and
  // sprite palette changes are NOT resolved by this isolated display trace.
  const chrBank=0;const palette=[[0,0,0,0],[222,173,106,255],[94,150,102,255],[244,222,177,255]];
  for(const pose of report.poses){
   if(pose.evidence!=='executed-original-display'||pose.spriteMode!==16||pose.pieces.length>64||pose.facing<1||pose.facing>2||pose.selector<0||pose.selector>=cols)throw Error('Unverified native pose result');
   const ox=pose.selector*cellWidth,oy=(pose.facing-1)*cellHeight;
   for(const part of pose.pieces){
    const tile=part.tile,flags=part.attributes;
    if(!Number.isInteger(tile)||tile>254||tile<0)throw Error('Invalid original OAM tile');
    for(let y=0;y<16;y++)for(let x=0;x<8;x++){
     const sx=(flags&64)?7-x:x,sy=(flags&128)?15-y:y;
     const tileNo=(tile&254)+(sy>>3),pos=chrStart+chrBank*4096+tileNo*16+(sy&7),bit=7-sx;
     const value=((rom[pos]>>bit)&1)|(((rom[pos+8]>>bit)&1)<<1);if(!value)continue;
     const dx=ox+part.x+x,dy=oy+part.y+y+4;
     if(dx<ox||dx>=ox+cellWidth||dy<oy||dy>=oy+cellHeight)continue;
     const dst=(dy*pixel.width+dx)*4;pixel.data.set(palette[value],dst);
    }
   }
  }
  ctx.putImageData(pixel,0,0);
  return {format:'nesforge.hosted-player-poses',version:1,evidence:'executed-original-display',rendering:'provisional-CHR0-palette-not-runtime-traced',cols,rows,cellWidth,cellHeight,png:canvas.toDataURL('image/png'),sourceDigest:report.source.sha256,
   limits:['Original Link pose OAM pixels; selectors are NOT verified walk/attack state bindings.','CHR bank zero and palette colors require emulator-context validation.','The atlas does not reproduce animation timing, collision, jumping, sword hitboxes or damage.']};
 };
 window.Forge=window.Forge||{};window.Forge.services=window.Forge.services||{};
 window.Forge.services.HostedPlayerPoses=Object.freeze({build});
})();
