#!/usr/bin/env node
'use strict';
// Recreates Scout from an empty project through actual editor controls. The
// old Scout file is only a pixel/parameter reference: it is never loaded into
// the application or assigned to its project model. No browser QA is claimed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const {frames,state,tick,keys}=require('./gameplay165.cjs');
const root=path.resolve(__dirname,'..'),defaultHTML=path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output);
const referencePath=path.join(root,'examples/Forge_Scout_Demo_1.6.5.nesforge.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
function event(node,type,extra={}){return {type,target:node,currentTarget:node,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...extra};}
function clickNode(node,label){assert.ok(node,label+' exists');assert.notEqual(node.disabled,true,label+' enabled');assert.equal(typeof node.onclick,'function',label+' has registered onclick');return node.onclick.call(node,event(node,'click'));}
function click(h,id){return clickNode(h.get(id),id);}
function change(h,id,value){const node=h.get(id);assert.notEqual(node.disabled,true,id+' enabled');if(typeof value==='boolean')node.checked=value;else node.value=String(value);const ev=event(node,'change');if(typeof node.onchange==='function')return node.onchange.call(node,ev);assert.ok((node.listeners.get('change')||[]).length,id+' has registered change handler');return node.dispatchEvent(ev);}
function inline(h,command){assert.ok(h.html.includes('="'+command+'"'),'Inline editor action exists: '+command);return h.run(command,20000);}
function tab(h,name){return h.run('switchTab('+JSON.stringify(name)+')');}
function descendants(node){return (node.children||[]).flatMap(child=>[child,...descendants(child)]);}
function labeled(h,label){return clickNode(descendants(h.get('frameEditor164')).find(n=>n.tagName==='BUTTON'&&n.textContent===label),label);}
function mouse(h,id,x,y,w,height,button=0,type='mousedown'){
  const node=h.get(id),getRect=node.getBoundingClientRect;
  if(!getRect.call(node).width||!getRect.call(node).height)node.getBoundingClientRect=()=>({left:0,top:0,width:w,height,right:w,bottom:height});
  const r=node.getBoundingClientRect();assert.ok((node.listeners.get(type)||[]).length,id+' '+type+' registered');
  try{return node.dispatchEvent(event(node,type,{button,buttons:type==='mouseup'?0:button===2?2:1,clientX:r.left+(x+.25)*r.width/w,clientY:r.top+(y+.25)*r.height/height}));}
  finally{node.getBoundingClientRect=getRect;}
}
function sheetTile(h,tile){mouse(h,'cv',tile%16*8,Math.floor(tile/16)*8,128,128);assert.equal(h.run('S.editTile'),tile);}
function palAt(scene,tx,ty){const byte=scene.attr[(ty>>2)*8+(tx>>2)],q=((ty>>1)&1)*2+((tx>>1)&1);return byte>>(q*2)&3;}
function counts(h){return h.json('({scenes:S.scenes.length,metasprites:S.metasprites.length,animations:S.animations.length,entities:S.scenes.reduce((n,s)=>n+s.entities.length,0)})');}
function boot(h){h.context.symbols=h.run('Forge165.lastBuild.symbols');keys(h,[]);for(let i=0;i<120;i++){frames(h);if(state(h).ready&&tick(h)>=3)return state(h);}throw Error('No generated gameplay loop reached');}
function build(h){click(h,'npGameplayOpen166');assert.notEqual(click(h,'gpPlay165'),false,h.errors.join('; '));const rom=h.run('window._lastBuiltRom');assert.ok(rom instanceof Uint8Array);assert.equal(h.run('S.tab'),'emu');return Buffer.from(rom);}
async function reopen(h,rom,name){const input=h.get('npRomInput166'),bytes=Uint8Array.from(rom);input.files=[{name,size:bytes.length,arrayBuffer:async()=>bytes.buffer}];assert.equal(typeof input.onchange,'function');await input.onchange(event(input,'change'));}

async function runNativeAuthoring(htmlPath=defaultHTML,{progress=()=>{}}={}){
  const reference=JSON.parse(fs.readFileSync(referencePath,'utf8')),room=reference.scenes[0];
  const h=loadForge(htmlPath,{strictMissingIds:['frameSource163']}),trace=[],stages=[];
  const record=(action,detail={})=>{trace.push({action,...detail});progress(action);};
  click(h,'npNew166');assert.deepEqual(counts(h),{scenes:1,metasprites:0,animations:0,entities:0});
  assert.ok(h.run('S.chr.every(t=>t.every(r=>r.every(c=>c===0))) && S.sprChr.every(t=>t.every(r=>r.every(c=>c===0)))'));
  assert.ok(h.run('S.nt.every(t=>t===0)'));assert.equal(h.run('document.getElementById("codeInput").value'),'');
  record('New Project → confirm empty project',{blankAssets:true,templateLoaded:false});

  // The pixel reference stays in the host test process. Each nonzero pixel is
  // committed by the editor's original pixel-canvas mouse handler.
  tab(h,'chr');let pixelEvents=0,paletteEdits=0;
  const bgIds=[...new Set(room.nt)].sort((a,b)=>a-b),spriteIds=[...new Set(reference.metasprites.flatMap(m=>m.pieces.map(p=>p.tile)))].sort((a,b)=>a-b);
  for(const [bank,tiles,ids,palettes]of [['bg',room.chr,bgIds,room.pal],['spr',room.sprChr,spriteIds,room.sprPal]]){
    inline(h,"setChrBank('"+bank+"')");
    for(let p=0;p<4;p++)for(let color=0;color<4;color++){
      h.get('chrPalEditor').children[p].children[color+1].onclick();
      h.get('chrPalEditor').children[p].children[5].onclick();
      clickNode(h.get('npGrid').children[palettes[p][color]],'NES palette color');paletteEdits++;
    }
    for(const tile of ids){sheetTile(h,tile);for(let color=1;color<=3;color++){
      h.get('pixColorSel').children[color].onclick();
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(tiles[tile][y][x]===color){mouse(h,'chrEditCanvas',x,y,8,8);pixelEvents++;}
    }
    assert.deepEqual(h.json('S.'+(bank==='bg'?'chr':'sprChr')+'['+tile+']'),tiles[tile],'Painted '+bank+' tile '+tile+' matches reference');}
  }
  assert.deepEqual(h.json('S.pal'),room.pal);assert.deepEqual(h.json('S.sprPal'),room.sprPal);
  record('CHR SHEET: draw background and Scout pixels; edit NES palette colors',{backgroundTiles:bgIds,spriteTiles:spriteIds,pixelEvents,paletteEdits});stages.push('reference pixels and palettes painted with registered controls');

  // Choose brush tiles from CHR SHEET, then paint every room tile using SCENE.
  // This also authors the scene's palette quadrants through the paint handler.
  let roomPaints=0;
  for(const tile of bgIds){tab(h,'chr');inline(h,"setChrBank('bg')");sheetTile(h,tile);tab(h,'scene');
    for(let p=0;p<4;p++){
      h.get('palEditor').children[p].children[0].onclick();
      for(let y=0;y<30;y++)for(let x=0;x<32;x++)if(room.nt[y*32+x]===tile&&palAt(room,x,y)===p){mouse(h,'cv',x*8,y*8,256,240);roomPaints++;}
    }
  }
  assert.deepEqual(h.json('S.nt'),room.nt);assert.deepEqual(h.json('S.attr'),room.attr);
  tab(h,'collision');h.get('colPropSel').value='1';for(const tile of bgIds.filter(i=>room.tileProps[i]===1))clickNode(h.get('colTileGrid').children[tile],'Solid tile '+tile);
  assert.deepEqual(h.json('S.tileProps'),room.tileProps);
  const originalPrompt=h.context.prompt;h.context.prompt=()=>room.name;inline(h,'renameScene()');h.context.prompt=originalPrompt;
  record('SCENE / COLLISION: paint room, floor and platforms; mark solid tiles',{tilePaints:roomPaints,solidTiles:[1,2,3]});stages.push('room and collision match the reference');

  // Retain the reference's one reusable training block via METATILES controls.
  tab(h,'meta');const linkedIndex=room.metaMap.findIndex(v=>v>=0);mouse(h,'cv',(linkedIndex%16)*16,Math.floor(linkedIndex/16)*16,256,240);click(h,'mtFromCell16');
  change(h,'mtName16','Solid training block');change(h,'mtCategory16','terrain');
  assert.equal(h.run('S.scenes[0].metatiles.length'),1);assert.equal(h.run('S.scenes[0].metaMap.filter(v=>v>=0).length'),1);
  record('METATILES: create a reusable solid block from its painted room cell');

  const metaspriteIds={};tab(h,'metasprites');
  for(const source of reference.metasprites){
    click(h,'msNew163');change(h,'msName163',source.name);change(h,'msOriginX163',source.originX);change(h,'msOriginY163',source.originY);
    for(const p of source.pieces){click(h,'msAdd163');change(h,'msTile163',p.tile);change(h,'msX163',p.x);change(h,'msY163',p.y);change(h,'msPal163',p.pal);}
    const authored=h.json('Forge163.metasprites.current');metaspriteIds[source.id]=authored.id;
    const appearance=m=>({originX:m.originX,originY:m.originY,spriteMode:m.spriteMode,pieces:m.pieces.map(p=>({tile:p.tile,x:p.x,y:p.y,pal:p.pal,flipH:p.flipH,flipV:p.flipV,behind:p.behind}))});
    assert.deepEqual(appearance(authored),appearance(source));
  }
  record('METASPRITES: assemble idle, step A, step B and attack poses',{frames:4,pieces:26,origin:{x:8,y:24}});stages.push('four poses composed from the painted tiles');

  tab(h,'anim');const animationIds={};
  for(const a of reference.animations){
    inline(h,'anim_add()');h.get('animName').value=a.name;h.get('animState').value=a.state;h.get('animLoop').checked=a.loop;h.get('animFlip').checked=a.flipOnReverse;inline(h,'anim_updateProp()');
    animationIds[a.id]=h.run('S.animations[S._selAnim].id');
    for(let i=0;i<a.frames.length;i++){
      if(i)inline(h,'anim_addFrame()');const f=a.frames[i];
      // + Frame duplicates current contacts/events; delete copies with the
      // visible delete controls before entering this frame's authored content.
      while(h.run('S.animations[S._selAnim].frames[S._animFrame].hitboxes.length+S.animations[S._selAnim].frames[S._animFrame].hurtboxes.length'))labeled(h,'Delete area');
      while(h.run('S.animations[S._selAnim].frames[S._animFrame].events.length'))labeled(h,'Delete event');
      h.get('frameTile').value=String(f.tileIdx);h.get('frameDur').value=String(f.duration);inline(h,'anim_updateFrame()');
      change(h,'frameSource163','metasprite');change(h,'frameMetasprite163',metaspriteIds[f.metaspriteId]);
      for(const [kind,label]of [['hurtboxes','+ Hurt'],['hitboxes','+ Hit']])for(const box of f[kind]){
        labeled(h,label);for(const [key,suffix]of [['name','Name'],['x','X'],['y','Y'],['w','W'],['h','H']])change(h,'feBox'+suffix+'164',box[key]);
      }
      for(const e of f.events){labeled(h,'+ Event');change(h,'feEventType164',e.type);change(h,'feEventName164',e.name);change(h,'feEventValue164',e.value);}
    }
  }
  const authoredAnims=h.json('S.animations');
  function animationAppearance(list,ids){return list.map(a=>({name:a.name,state:a.state,loop:a.loop,flipOnReverse:a.flipOnReverse,frames:a.frames.map(f=>({metasprite:ids[f.metaspriteId]||f.metaspriteId,duration:f.duration,hitboxes:f.hitboxes.map(({id,...b})=>b),hurtboxes:f.hurtboxes.map(({id,...b})=>b),events:f.events.map(({id,...e})=>e)}))}));}
  assert.deepEqual(animationAppearance(authoredAnims,{}),animationAppearance(reference.animations,metaspriteIds));
  record('ANIM: build idle / walk / attack / hurt timing, contact areas and entry events',{animations:4,timelineFrames:10});stages.push('animation timing, contacts and events match the reference');

  tab(h,'entity-studio');const entityIds={};
  for(const e of room.entities){
    h.get('esEntityType164').value=e.type;h.get('esPlaceX164').value=String(e.x);h.get('esPlaceY164').value=String(e.y);click(h,'esAddEntity164');entityIds[e.id]=h.run('Forge164.model.selectedEntity().id');
    for(const binding of e.animationBinding.states){h.get('esNewState164').value=binding.state;h.get('esNewAnimation164').value=animationIds[binding.animationId];click(h,'esAssign164');}
    change(h,'esDefaultState164',e.animationBinding.defaultState);change(h,'esDefaultFacing164',e.animationBinding.facing);
    click(h,'esSceneEdit164');
    // The original properties are generated as inline onchange attributes.
    for(const [prop,value]of [['name',e.name],['sprTile',e.sprTile]]){
      assert.ok(h.get('entProps').innerHTML.includes('ent_setProp(\''+prop+'\''),'Entity '+prop+' control exists');h.run('ent_setProp('+JSON.stringify(prop)+','+JSON.stringify(value)+')');
    }
    click(h,'esOpenFromScene164');
  }
  click(h,'npGameplayOpen166');
  for(const [id,value]of [['gpMode165','single-room'],['gpSceneId165',h.run('S.scenes[0].id')],['gpPlayerId165',entityIds['scout-player']],['gpTargetId165',entityIds['scout-partner']]])change(h,id,value);
  for(const key of ['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'])change(h,'gp'+key[0].toUpperCase()+key.slice(1)+'165',reference.gameplay[key]);
  assert.equal(h.run('document.getElementById("codeInput").value'),'');
  const originalProject=h.json('projectData()'),originalCounts=counts(h);assert.deepEqual(originalCounts,{scenes:1,metasprites:4,animations:4,entities:2});
  record('ENTITY STUDIO / SCENE Gameplay: place Scout and target, bind states, choose runtime actors and physics',{counts:originalCounts,customAssembly:false});stages.push('entities bound and gameplay configured through controls');

  const originalRom=build(h),originalBoot=boot(h);assert.equal(originalBoot.playerX,48);assert.equal(originalBoot.playerY,208);assert.equal(originalBoot.grounded,1);
  frames(h,8,['ArrowRight']);assert.equal(state(h).playerX,64);
  frames(h,16,['ArrowRight','KeyZ']);const onPlatform=state(h);assert.equal(onPlatform.playerX,96);assert.equal(onPlatform.playerY,176);assert.equal(onPlatform.grounded,1);
  frames(h,12,[]);frames(h,20,['ArrowRight']);frames(h,18,[]);frames(h,25,['ArrowRight']);assert.equal(state(h).playerX,186);
  frames(h,22,['KeyX']);const afterAttack=state(h);assert.equal(afterAttack.targetHits,1);assert.ok(h.run('emu.oamMem.some(v=>v!==0)'));
  record('Build & Play: run, jump onto platform, approach target and land an attack',{boot:originalBoot,onPlatform,afterAttack,romSha256:hash(originalRom)});stages.push('actual generated 6502 moves, jumps, collides and hits');

  await reopen(h,originalRom,'Scout_Authored_in_Editor.nes');assert.deepEqual(counts(h),originalCounts);
  assert.equal(h.run('document.getElementById("codeInput").value'),'');assert.deepEqual(Buffer.from(h.run('S.importedRom')),originalRom);
  tab(h,'scene');mouse(h,'cv',8,210,256,240,2);const floor=h.run('S.selTile');mouse(h,'cv',241,201,256,240);const cell=25*32+30;assert.equal(h.run('S.nt['+cell+']'),floor);
  tab(h,'chr');inline(h,"setChrBank('bg')");sheetTile(h,floor);const priorPixel=h.run('S.chr[S.editTile][0][0]'),nextPixel=(priorPixel+1)%4;h.get('pixColorSel').children[nextPixel].onclick();mouse(h,'chrEditCanvas',0,0,8,8);
  click(h,'npGameplayOpen166');change(h,'gpMoveSpeed165',3);
  const editedProject=h.json('projectData()'),editedRom=build(h),editedBoot=boot(h);frames(h,5,['ArrowRight']);assert.equal(state(h).playerX,63);
  assert.notEqual(hash(editedRom),hash(originalRom));assert.equal(h.run('Forge165.lastBuild.spec.collision['+cell+']'),1);
  await reopen(h,editedRom,'Scout_Reopened_Edited.nes');assert.deepEqual(counts(h),originalCounts);assert.equal(h.run('Forge165.config.get().moveSpeed'),3);
  const reopenedRom=build(h);boot(h);frames(h,5,['ArrowRight']);assert.equal(state(h).playerX,63);
  record('Open ROM as Project: edit room tile, CHR pixel and speed; rebuild; reopen edited ROM again',{counts:counts(h),editedRomSha256:hash(editedRom),reopenedRomSha256:hash(reopenedRom)});stages.push('clean ROM reopening retains visual edits and rebuilt runtime');
  assert.deepEqual(h.errors,[]);
  return {h,originalProject,editedProject,originalRom,editedRom,reopenedRom,stages,evidence:{htmlSha256:hash(Buffer.from(h.html)),referenceFile:path.basename(referencePath),referenceSha256:hash(fs.readFileSync(referencePath)),
    templateLoaded:false,projectFixtureInjected:false,manualBrowserQA:false,scope:'Empty project followed by existing native editor controls and actual mouse handlers; generated 6502 ROM executed in the bundled emulator.',
    limitations:'Automated full-application VM with a mock DOM: browser layout, physical pointer/keyboard input, native file pickers and Save As dialogs are not verified. Stable IDs and nonruntime entity metadata may differ from the historical demo.',trace}};
}
module.exports={runNativeAuthoring,click,change,mouse,build,boot,reopen};
if(require.main===module)(async()=>{
  const html=path.resolve(process.argv[2]||defaultHTML),output=path.resolve(process.argv[3]||process.env.FORGE_TEST_REPORT||path.join(root,'test-results/native-authoring166.json'));
  const results=[];let result;
  try{result=await runNativeAuthoring(html,{progress:action=>console.log(action)});for(const name of result.stages)results.push({name,passed:true});}
  catch(error){results.push({name:'Empty project → native authoring → gameplay → ROM edit/rebuild',passed:false,error:error.stack});console.error(error.stack);}
  const report={suite:'native-authoring166',source:path.basename(html),sha256:hash(fs.readFileSync(html)),environment:'Full app VM with actual control handlers and bundled 6502 emulator',limitations:'Not manual browser input/layout verification.',total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(report.passed+'/'+report.total+' native authoring cases passed');if(report.failed)process.exitCode=1;
})();
