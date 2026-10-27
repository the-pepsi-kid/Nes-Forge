'use strict';
// Full parsed HTML and real selection/export handlers. Canvas/layout/timers use
// the retained stub. Private ROM bytes and exported source projects stay in RAM.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const root=path.resolve(__dirname,'../..'),html=path.resolve(process.env.FORGE_REVIEW_HTML||path.join(root,'nes-forge.html'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),identity=sha(fs.readFileSync(html)),checks=[];
const plain=v=>JSON.parse(JSON.stringify(v));
const get=(h,id)=>{const n=h.document.getElementById(id);assert(n?.isConnected,id);return n;};
function instance(){const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;}
const clean=h=>{assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);};
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name);}
const assets=s=>{const p=s.ProjectStore.capture();return sha(JSON.stringify({scenes:p.scenes,worlds:p.worlds,metasprites:p.metasprites,animations:p.animations,nativeGame:p.nativeGame,worldRuntime:p.worldRuntime,gameplayCore:p.gameplayCore}));};
function fixture(h){const w=h.window,s=w.Forge.services,p=s.ProjectStore.capture();
 p.projectName='Workspace resume fixture';p.scenes=['a','b','c'].map((id,i)=>w.makeScene({...p.scenes[0],id:'resume-scene-'+id,name:'Resume '+id,buildOrder:i}));
 p.metasprites=['a','b'].map(id=>({id:'resume-pose-'+id,name:'Resume pose '+id,sceneId:'resume-scene-'+id,spriteMode:8,originX:0,originY:0,
  pieces:[0,1].map(i=>({id:'piece-'+id+'-'+i,tile:i,tile2:i+1,x:i*8,y:0,pal:0,flipH:!!i,flipV:false,behind:false}))}));
 p.animations=[{id:'resume-animation',name:'Resume animation',frames:[{duration:8,metaspriteId:'resume-pose-b'},{duration:8,metaspriteId:'resume-pose-a'}]}];
 p.worlds=['a','b'].map(id=>w.Forge161.worlds.normalize({id:'resume-world-'+id,name:'Resume world '+id,tilesetSceneId:'resume-scene-'+id,widthScreens:1,heightScreens:1,
  markers:[{id:'spawn-'+id,name:'Spawn',kind:'spawn',x:2,y:2}]}));
 p.activeScene=1;return p;
}
async function reopened(saved,fn){const h=instance();try{h.window.Forge.services.ProjectStore.load(saved);await h.window.Forge.services.InvestigationUI.whenReady();await fn(h);clean(h);}finally{h.dom.window.close();}}
(async()=>{
 const h=instance(),w=h.window,s=w.Forge.services;let p,saved,expected,originalRom;
 try{
  p=fixture(h);s.ProjectStore.load(p);s.SceneContext.selectScene('resume-scene-b');w.Forge163.metasprites.select('resume-pose-b');
  get(h,'msPieces163').querySelector('[data-piece-id="piece-b-1"]').click();w.switchTab('metasprites');
  expected=assets(s);originalRom=sha(s.RuntimeCompiler.compile().rom);saved=s.ProjectStore.serialize({includeEditorView:true});
  await check('Portable preferences restore a non-first pose, exact piece and editor in a fresh app',async()=>{
   await reopened(saved,h=>{const w=h.window,s=w.Forge.services;
    assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');assert.equal(w.Forge163.metasprites.state.pieceId,'piece-b-1');assert.equal(w.eval('S.tab'),'metasprites');
    assert.equal(w.NFContext04.describe().matches,true);assert.equal(assets(s),expected);assert.equal(sha(s.RuntimeCompiler.compile().rom),originalRom);
    get(h,'fcw-relations').click();assert.equal(s.ResourceRelationshipPreview.summary().selected,'metasprite:resume-pose-b');s.ResourceRelationshipPreview.close();
   });
  });
  await check('View metadata is optional and excluded from authoring data, signatures and default capture',()=>{
   const data=s.ProjectStore.capture();assert(!Object.hasOwn(data,'editorView'));
   const withView=s.ProjectStore.capture({includeEditorView:true});assert.equal(withView.version,12);assert.equal(s.ProjectStore.maxSchema,16);
   assert.equal(sha(JSON.stringify(s.ProjectStore.authoringData(withView))),sha(JSON.stringify(data)));
   assert.equal(s.NativeEngineProject.signature(withView),s.NativeEngineProject.signature(data));
  });
  if(process.env.FORGE_PREVIOUS_HTML)await check('Previous reader safely ignores extra preferences while preserving assets and output',()=>{
   const old=load(process.env.FORGE_PREVIOUS_HTML);try{const prior=old.window.Forge.services;prior.ProjectStore.load(saved);assert.equal(assets(prior),expected);assert.equal(sha(prior.RuntimeCompiler.compile().rom),originalRom);clean(old);}finally{old.dom.window.close();}
  });
  await check('Save Project As exports the same optional resume metadata through the existing transport',async()=>{
   const transport=w.download;let text;
   try{w.download=(data)=>{text=typeof data==='string'?data:new TextDecoder().decode(data);return Promise.resolve({status:'saved'});};await w.project_export();}
   finally{w.download=transport;}
   assert.equal(JSON.parse(text).editorView.metaspriteId,'resume-pose-b');
   await reopened(text,h=>assert.equal(h.window.Forge163.metasprites.current.id,'resume-pose-b'));
  });
  await check('Independent pose, Scene and World selections reopen without rebinding assets',async()=>{
   s.SceneContext.selectScene('resume-scene-a');w.Forge163.metasprites.select('resume-pose-b');w.switchTab('metasprites');
   w.Forge161.worlds.state.selected=1;const before=assets(s),json=s.ProjectStore.serialize({includeEditorView:true});
   await reopened(json,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.eval('S.scenes[S.activeScene].id'),'resume-scene-a');assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');
    assert.equal(w.Forge161.worlds.current.id,'resume-world-b');assert.equal(w.NFContext04.describe().matches,false);assert.equal(assets(s),before);
    get(h,'fcw-relations').click();assert.equal(s.ResourceRelationshipPreview.summary().selected,'metasprite:resume-pose-b');assert.equal(w.eval('S.scenes[S.activeScene].id'),'resume-scene-a');
   });
  });
  await check('Browsing another World does not change the configured runtime start or compiled ROM',async()=>{
   const data=plain(p);data.animations[0].loop=false;
   data.scenes[0].entities=[{id:'resume-player',type:'player',x:40,y:40,w:12,h:22,sprTile:0,animationBinding:{facing:'right',defaultState:'idle',states:['idle','walk','attack'].map(state=>({state,animationId:'resume-animation'}))}}];
   data.worldRuntime={...data.worldRuntime,enabled:true,worldId:'resume-world-a',spawnId:'spawn-a',playerSceneId:'resume-scene-a',playerId:'resume-player'};
   s.ProjectStore.load(data);const rom=sha(s.RuntimeCompiler.compile().rom);w.Forge161.worlds.state.selected=1;w.switchTab('world');
   const json=s.ProjectStore.serialize({includeEditorView:true});
   await reopened(json,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.Forge161.worlds.current.id,'resume-world-b');assert.equal(s.WorldConfig.get().worldId,'resume-world-a');assert.equal(sha(s.RuntimeCompiler.compile().rom),rom);});
   s.ProjectStore.load(saved);
  });
  await check('CHR buffer, tile and used-pose view restore without pixel changes',async()=>{
   s.SceneContext.selectScene('resume-scene-b');w.Forge163.metasprites.select('resume-pose-b');w.setChrBank('spr');w.switchTab('chr');
   w.eval('S.editTile=S.selTile=1');get(h,'chrUsageScope').value='pose';get(h,'chrUsageScope').dispatchEvent(new w.Event('change',{bubbles:true}));
   const before=assets(s),json=s.ProjectStore.serialize({includeEditorView:true});
   await reopened(json,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.eval('S.tab'),'chr');assert.equal(w.eval('S.chrBank'),'spr');assert.equal(w.eval('S.editTile'),1);
    assert.equal(get(h,'chrUsageScope').value,'pose');assert.equal(s.ResourceContext.chrUsage().frame.id,'resume-pose-b');assert.equal(assets(s),before);
   });
  });
  await check('Animation frame and editor restore independently of the selected pose',async()=>{
   w.switchTab('anim');w.eval('S._selAnim=0;S._animFrame=1');const json=s.ProjectStore.serialize({includeEditorView:true});
   await reopened(json,h=>{const w=h.window;assert.equal(w.eval('S.tab'),'anim');assert.equal(w.eval('S._animFrame'),1);assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');});
  });
  await check('Legacy save without pose metadata picks the sole matching pose, not library entry zero',async()=>{
   const legacy=plain(p);delete legacy.editorView;
   await reopened(legacy,h=>{assert.equal(h.window.Forge163.metasprites.current.id,'resume-pose-b');assert.equal(assets(h.window.Forge.services),expected);});
  });
  await check('Ambiguous legacy matches require a visible choice without rewriting references',async()=>{
   const legacy=plain(p);legacy.metasprites.push({...plain(legacy.metasprites[1]),id:'resume-pose-b-2',name:'Second B pose'});
   await reopened(legacy,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.Forge163.metasprites.current,null);w.switchTab('metasprites');
    assert.equal(get(h,'msFrames163').value,'');assert.match(get(h,'msEmpty163').textContent,/2 poses use the active Scene/);
    assert.equal(s.ProjectStore.capture().metasprites.length,3);get(h,'msFrames163').value='resume-pose-b-2';get(h,'msFrames163').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b-2');
   });
  });
  await check('Legacy Scene with no matching pose remains explicitly unselected',async()=>{
   const legacy=plain(p);legacy.activeScene=2;
   await reopened(legacy,h=>{const w=h.window;assert.equal(w.Forge163.metasprites.current,null);w.switchTab('metasprites');assert.match(get(h,'msEmpty163').textContent,/No pose uses the active Scene/);});
  });
  await check('Malformed, stale and future editor hints safely preserve canonical assets',async()=>{
   for(const bad of [[],null,'invalid',{version:1,tab:'bogus',metaspriteId:{id:'x'},pieceId:[]},{version:1,metaspriteId:'removed',pieceId:'removed'},{version:999,metaspriteId:'resume-pose-a',tab:'audio'}]){
    const data={...plain(p),editorView:bad};await reopened(data,h=>{const w=h.window,s=w.Forge.services;assert.equal(assets(s),expected);assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');assert.equal(sha(s.RuntimeCompiler.compile().rom),originalRom);});
   }
  });
  await check('Explicit unselected pose survives reopen even when a matching pose exists',async()=>{
   const data={...plain(p),editorView:{version:1,metaspriteId:'',pieceId:'',tab:'metasprites'}};
   await reopened(data,h=>{assert.equal(h.window.Forge163.metasprites.current,null);assert.match(get(h,'msEmpty163').textContent,/Saved without a selected pose/);});
  });
  await check('Undo/Redo retains the selected pose and piece through canonical edit restoration',()=>{
   s.ProjectStore.load(saved);const baseline=assets(s);get(h,'msX163').value='10';get(h,'msX163').dispatchEvent(new w.Event('change',{bubbles:true}));
   const edited=assets(s);assert.notEqual(edited,baseline);w.undo();assert.equal(assets(s),baseline);assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');assert.equal(w.Forge163.metasprites.state.pieceId,'piece-b-1');
   w.redo();assert.equal(assets(s),edited);assert.equal(w.Forge163.metasprites.current.id,'resume-pose-b');clean(h);
  });
 }finally{h.dom.window.close();}
 if(process.argv[2])for(let revision=0;revision<2;revision++){
  const bytes=fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`));
  const h=instance(),w=h.window,s=w.Forge.services;let before,sourceScene,frameId,saved;
  try{
   s.ProjectStore.load(await s.NativeResourceProject.create(w.Uint8Array.from(bytes),'Punch-Out resume check'));await s.InvestigationUI.whenReady();
   s.PunchOutPoseUI.open(192);frameId=s.PunchOutPoseProject.frameId(192);sourceScene=w.eval('S.scenes[S.activeScene].id');
   await check('PRG'+revision+' native non-first idle pose restores exact context and unchanged ROM',async()=>{
    get(h,'msPieces163').querySelectorAll('[data-piece-id]')[2].click();before=assets(s);saved=s.ProjectStore.serialize({includeEditorView:true});
    await reopened(saved,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.Forge163.metasprites.current.id,frameId);assert.equal(w.eval('S.tab'),'metasprites');assert.equal(w.eval('S.scenes[S.activeScene].id'),sourceScene);
     assert.equal(assets(s),before);assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(bytes));assert.equal(w.Forge163.metasprites.state.pieceId,JSON.parse(saved).editorView.pieceId);
    });
   });
   await check('PRG'+revision+' physical writer reopens with its exact pose footprint and owned bank',async()=>{
    get(h,'punchOutPoseArtwork').click();get(h,'chrUsageScope').value='pose';get(h,'chrUsageScope').dispatchEvent(new w.Event('change',{bubbles:true}));
    const current=assets(s),json=s.ProjectStore.serialize({includeEditorView:true});
    await reopened(json,h=>{const w=h.window,s=w.Forge.services;assert.equal(w.eval('S.tab'),'chr');assert.equal(w.eval('S.chrBank'),'bg');assert.equal(w.Forge163.metasprites.current.id,frameId);
     assert.equal(s.ResourceContext.chrUsage().origin.bank,29);assert.equal(get(h,'chrUsageScope').value,'pose');assert.equal(assets(s),current);assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(bytes));assert.equal(get(h,'punchOutChrPose').hidden,false);get(h,'punchOutChrPose').click();assert.equal(w.Forge163.metasprites.current.id,frameId);assert.equal(w.eval('S.tab'),'metasprites');
    });
   });
   await check('PRG'+revision+' saved explicit pose buffer choice restores after the native entry default',async()=>{
    s.PunchOutPoseUI.open(192);get(h,'punchOutPoseTiles').click();w.setChrBank('bg');const current=assets(s),json=s.ProjectStore.serialize({includeEditorView:true});
    await reopened(json,h=>{assert.equal(h.window.eval('S.chrBank'),'bg');assert.equal(h.window.Forge163.metasprites.current.id,frameId);assert.equal(assets(h.window.Forge.services),current);});
   });
   await check('PRG'+revision+' edited idle output and snapshot refusal survive the new resume metadata',async()=>{
    s.PunchOutPoseUI.open(192);get(h,'punchOutPoseIdleGroup').checked=true;get(h,'punchOutPoseX').value='-12';get(h,'punchOutPoseApply').click();
    const built=sha(s.RuntimeCompiler.compile().rom),json=s.ProjectStore.serialize({includeEditorView:true});
    await reopened(json,h=>{const s=h.window.Forge.services;assert.equal(sha(s.RuntimeCompiler.compile().rom),built);assert.equal(h.window.Forge163.metasprites.current.id,frameId);});
    const p=s.ProjectStore.capture({includeEditorView:true});p.scenes.find(sc=>sc.id===sourceScene).sprChr[0][0][0]^=1;
    await reopened(p,h=>{assert.throws(()=>h.window.Forge.services.RuntimeCompiler.compile());assert.equal(h.window.Forge163.metasprites.current.id,frameId);});clean(h);
   });
  }finally{h.dom.window.close();}
 }
 assert.equal(sha(fs.readFileSync(html)),identity,'HTML changed during verification');
 fs.writeFileSync(path.resolve(process.env.FORGE_RESUME_REPORT||path.join(__dirname,'Resume_DOM_Verification.json')),JSON.stringify({status:'passed',htmlSha256:identity,checks,
  scope:'Parsed HTML, fresh independent app instances and real editor/export handlers. Canvas/layout/timers and Save As transport stubbed. Private ROMs remain in RAM. No browser rendering, full-fight/listening/controller/hardware claim.'},null,2)+'\n');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
