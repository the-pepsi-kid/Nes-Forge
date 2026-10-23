/* Materialize source poses with the established native source/recipe owner.
 * Existing projects and all other adapters retain their original intake. */
(()=>{
'use strict';
const services=Forge.services,base=services.NativeResourceProject,cp=v=>JSON.parse(JSON.stringify(v)),cache=new Map();
const matches=p=>base.matches(p)&&p.nativeGame.adapter.startsWith('punch-out-');
function source(p){if(!matches(p))throw Error('Open a recovered Punch-Out source project first.');const info=base.validate(p),key=p.nativeGame.sourceSha256;if(!cache.has(key)){if(cache.size>=2)cache.delete(cache.keys().next().value);cache.set(key,PunchOutContent.open(info.bytes));}return cache.get(key);}
function assets(p,fight,selector){
 const content=source(p),f=content.fights[fight],pose=content.pose(fight,selector);if(pose.status!=='decoded')throw Error('This pose needs its animation context: '+pose.gaps.join(' '));
 let representative;for(const record of content.fights[fight].poses){if(record.status!=='source-record')continue;const candidate=content.pose(fight,record.selector);if(candidate.status==='decoded'&&candidate.chrBank4KiB===pose.chrBank4KiB&&candidate.spriteMode===pose.spriteMode){representative=candidate;break;}}
 const sceneId='po-sprites-f'+fight+'-b'+pose.chrBank4KiB+'-m'+pose.spriteMode,frameId='po-pose-f'+fight+'-s'+selector,colors=Array.from({length:4},(_,i)=>[f.palette[16],...f.palette.slice(17+i*4,20+i*4)]),scene=makeScene({id:sceneId,name:f.label+' · sprite CHR '+pose.chrBank4KiB,chr:normalizeTiles(),sprChr:content.chr(pose.chrBank4KiB),pal:Array.from({length:4},()=>[15,0,0,0]),sprPal:colors,nt:Array(960).fill(0),attr:Array(64).fill(0),tileProps:Array(256).fill(0),oam:representative.pieces.map(piece=>({x:piece.x,y:piece.y,tile:pose.spriteMode===16?piece.tile&254:piece.tile,tile2:pose.spriteMode===16?(piece.tile&254)+1:(piece.tile+1)&255,attr:piece.attributes,height:pose.spriteMode,active:true,sourceOamIndex:piece.slot})),entities:[],links:[],buildInclude:false,buildOrder:0,gravity:0,scrollDir:'none',sceneType:'static',captureMeta:{mode:'native-sprite-source',punchOutContent:{version:1,sourceSha256:p.nativeGame.sourceSha256,fight,chrBank4KiB:pose.chrBank4KiB,spriteMode:pose.spriteMode,representativeSelector:representative.selector,scope:'Original sprite patterns and fight palette. Scene sprites show a representative source pose. Open a linked metasprite for its selected placement. This is not a complete fight scene.'}}});
 const signed=n=>((n+128)&255)-128,frame={id:frameId,name:f.label+' · pose $'+selector.toString(16).toUpperCase().padStart(2,'0'),sceneId,spriteMode:pose.spriteMode,originX:0,originY:0,pieces:pose.pieces.map(piece=>({id:'oam-'+piece.slot,tile:pose.spriteMode===16?piece.tile&254:piece.tile,tile2:pose.spriteMode===16?(piece.tile&254)+1:(piece.tile+1)&255,x:signed(piece.x-f.baseX),y:signed(piece.y-1-f.baseY)+1,pal:piece.attributes&3,flipH:!!(piece.attributes&64),flipV:!!(piece.attributes&128),behind:!!(piece.attributes&32)}))};
 return {scene,frame,pose};
}
function recover(project,{overview=false,fight=0,selector=0}={}){
 // Do not turn unsupported edits into a new accepted native baseline.
 base.validate(project,{build:true});const p=cp(project),content=source(p),choices=overview?content.fights.map(f=>[f.index,0]):[[fight,selector]];
 if(overview){for(const item of base.libraryView(p).scenes)for(const page of base.pageList(p,item.id))Object.assign(p,base.addPage(p,item.id,page.page));}
 const ids=[];for(const [fi,sel]of choices){const {scene,frame}=assets(p,fi,sel),existing=p.scenes.find(s=>s.id===scene.id),old=p.metasprites.find(m=>m.id===frame.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(scene))throw Error('The recovered sprite source has local changes. Preserve them before opening another pose.');if(old&&JSON.stringify(old)!==JSON.stringify(frame))throw Error('The recovered pose has local changes. Preserve them before recovering it again.');if(!existing)p.scenes.push(scene);if(!old)p.metasprites.push(frame);ids.push(frame.id);}
 if(p.scenes.length>64||p.metasprites.length>256)throw Error('The current project has no free Scene or metasprite slots. No source catalog entries were discarded.');
 Forge163.persistence.validate(p.metasprites,p.animations,p.scenes);
 p.nativeGame.projectionSha256=services.NativeEngineProject.signature({...p,scenes:p.scenes.filter(s=>!base.requiredScene(p,s.id))});
 base.validate(p,{build:true});return {project:p,frameIds:ids};
}
async function create(input,name){const p=await base.create(input,name);return matches(p)?recover(p,{overview:true}).project:p;}
services.NativeResourceProject=Object.freeze({...base,create});
services.PunchOutContentRecovery=Object.freeze({matches,source,assets,recover});
})();
