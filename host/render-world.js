/* NES Forge hosted visual parity renderer v1. Identical in standalone Forge and localhost client. */
(function(root){'use strict';
const palette=['#89b7a0','#4b4436','#9683a5','#c7bb83','#b9ab60','#6f9464','#356d44','#4d7e5b','#9d9674','#afaa70','#ce704b','#5d5c54','#47739f','#679fa1','#777475','#8f7353'];
let url='',image=null,loading=false;
function artReady(art,onReady){
 const next=art?.format==='png-atlas-16x16-v1'&&typeof art.png==='string'?art.png:'';
 if(!next){url='';image=null;loading=false;return false;}
 if(next!==url){url=next;image=null;loading=true;const loader=new Image();
   loader.onload=()=>{if(url===next&&loader.naturalWidth===256&&loader.naturalHeight===16){image=loader;loading=false;onReady?.();}};
   loader.onerror=()=>{if(url===next){image=null;loading=false;onReady?.();}};
   loader.src=next;
 }
 return !!image&&url===next;
}
function drawBase(canvas,world,onReady){
 const ctx=canvas.getContext('2d'),size=16;
 canvas.width=world.width*size;canvas.height=world.height*size;ctx.imageSmoothingEnabled=false;
 const hasArt=artReady(world.art,onReady);
 for(let i=0;i<world.terrain.length;i++){
   const tile=world.terrain[i],x=(i%world.width)*size,y=Math.floor(i/world.width)*size;
   if(hasArt)ctx.drawImage(image,tile*16,0,16,16,x,y,16,16);
   else{ctx.fillStyle=palette[tile]||'#ff00ff';ctx.fillRect(x,y,16,16);}
 }
 return hasArt;
}
function draw(canvas,state,options={}){
 const w=state?.world;if(!w)return false;
 const ctx=canvas.getContext('2d'),hasArt=drawBase(canvas,w,options.onArtReady);
 const sz=16;
 const target=options.target;
 if(target){ctx.strokeStyle='#fff2ab';ctx.lineWidth=2;ctx.strokeRect(target.x*sz+.5,target.y*sz+.5,sz-1,sz-1);}
 for(const struct of state.structures||[]){const x=struct.x*sz,y=struct.y*sz;
   ctx.fillStyle=struct.kind==='camp'?'#e8c977':struct.kind==='boss'?'#b995e7':'#dc9771';
   ctx.fillRect(x+3,y+3,10,10);ctx.strokeStyle='#1a1a25';ctx.strokeRect(x+3.5,y+3.5,9,9);
   ctx.fillStyle='#15202b';ctx.font='bold 8px monospace';ctx.fillText(struct.kind==='camp'?'C':struct.kind==='boss'?'B':'D',x+5,y+11);
 }
 for(const [i,p] of (state.players||[]).entries()){if(!p.online)continue;
   const x=p.x*sz,y=p.y*sz;
   // Deliberately provisional adventurer silhouette. Replace with verified Link metasprite frames,
   // palette and animation timing from the original engine; do not claim this is native Link art.
   const tint=p.id===options.playerId?'#aaf6ff':i%2?'#f4b47e':'#f69fa9';
   ctx.fillStyle='#172a23';ctx.fillRect(x+3,y+2,11,13);
   ctx.fillStyle='#a1ba79';ctx.fillRect(x+4,y+2,8,3);ctx.fillRect(x+3,y+4,5,2);
   ctx.fillStyle='#e5ca9c';ctx.fillRect(x+6,y+6,6,4);
   ctx.fillStyle='#428854';ctx.fillRect(x+5,y+10,8,3);
   ctx.fillStyle='#615042';ctx.fillRect(x+5,y+13,3,2);ctx.fillRect(x+10,y+13,3,2);
   ctx.strokeStyle=tint;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,15,15);
 }
 return hasArt;
}
/* Camera is presentation-only. Authoritative player coords and collision remain on the host.
 * One 256x240 client viewport follows one character, while WORLD Live retains the complete map.
 * This is a project-independent crop, not yet verified native Zelda II scroll timing. */
const makeCamera=(world,player)=>{
 const size=16,px=player?player.x*size+size/2:128,py=player?player.y*size+size/2:120;
 const maxX=Math.max(0,world.width*size-256),maxY=Math.max(0,world.height*size-240);
 return {x:Math.max(0,Math.min(maxX,Math.round(px-128))),y:Math.max(0,Math.min(maxY,Math.round(py-120)))};
};
let backing=null;
function drawViewport(canvas,state,options={}){
 if(!state?.world)return null;
 if(!backing)backing=document.createElement('canvas');
 const hasArt=draw(backing,state,{target:options.target,playerId:options.playerId,onArtReady:options.onArtReady});
 const me=(state.players||[]).find(p=>p.id===options.playerId),camera=makeCamera(state.world,me);
 canvas.width=256;canvas.height=240;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#101b22';ctx.fillRect(0,0,256,240);
 ctx.drawImage(backing,camera.x,camera.y,Math.min(256,backing.width-camera.x),Math.min(240,backing.height-camera.y),0,0,Math.min(256,backing.width-camera.x),Math.min(240,backing.height-camera.y));
 return {hasArt,cameraX:camera.x,cameraY:camera.y,playerX:me?.x??null,playerY:me?.y??null};
}
root.ForgeHostedRenderer=Object.freeze({draw,drawBase,drawViewport,makeCamera,artReady,palette});
})(typeof window!=='undefined'?window:globalThis);
