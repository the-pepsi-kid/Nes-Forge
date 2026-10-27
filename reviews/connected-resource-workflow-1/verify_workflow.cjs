'use strict';
// Parsed standalone HTML with real button/selection/pixel handlers. Only canvas,
// layout and timers are stubbed by the retained DOM harness. ROM inputs stay local.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const root=path.resolve(__dirname,'../..'),html=path.resolve(process.env.FORGE_REVIEW_HTML||path.join(root,'nes-forge.html'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),checks=[],htmlIdentity=sha(fs.readFileSync(html));
const plain=v=>JSON.parse(JSON.stringify(v));
function instance(){const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;}
const get=(h,id)=>{const n=h.document.getElementById(id);assert(n?.isConnected,id);return n;};
const clean=h=>{assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);};
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name);}
// Top-level graphics are compatibility mirrors of the active Scene, and editor
// selectors intentionally change during navigation. Canonical Scene assets remain
// in scenes and are compared in full; avoid dumping private source data on failure.
function canonical(h){const p=h.window.Forge.services.ProjectStore.capture();
 for(const key of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps','activeScene','selTile','editTile','selSprite','selEntity','chrBank','_selAnim','_animFrame','editorView'])delete p[key];
 return sha(JSON.stringify(p));}

(async()=>{
 const h=instance(),w=h.window,s=w.Forge.services;
 try{
  await check('Generic 8x16 usage retains both tiles, palette, flips and displayed half without OAM',()=>{
   const frame={spriteMode:16,pieces:[{id:'p',tile:8,tile2:43,pal:2,flipH:true,flipV:true,behind:true}]};
   const usage=plain(s.ResourceContext.footprint(frame));assert.deepEqual(usage.tileIds,[8,43]);
   assert.equal(usage.uses[0].displayHalf,1);assert.equal(usage.uses[1].displayHalf,0);
   assert(usage.uses.every(use=>use.pal===2&&use.flipH&&use.flipV&&use.behind));
  });
  await check('Authored pose/animation/CHR Resources selection is exact and independent',()=>{
   const p=s.ProjectStore.capture(),a=p.scenes[0];
   const b=w.makeScene({id:'workflow-other',name:'Independent Scene',oam:[],buildInclude:false});p.scenes.push(b);
   p.metasprites=[{id:'workflow-pose',name:'Authored pose',sceneId:b.id,spriteMode:8,originX:0,originY:0,
    pieces:[{id:'piece',tile:8,tile2:9,x:0,y:0,pal:2,flipH:true,flipV:false,behind:false}]}];
   p.animations=[{id:'workflow-animation',name:'Authored clip',frames:[{metaspriteId:'workflow-pose',duration:1}]}];
   s.ProjectStore.load(p,{sync:true});s.SceneContext.selectScene(a.id);w.Forge163.metasprites.select('workflow-pose');w.switchTab('metasprites');
   const before=canonical(h),active=w.eval('S.activeScene');get(h,'fcw-relations').click();
   assert.equal(s.ResourceRelationshipPreview.summary().selected,'metasprite:workflow-pose');
   assert.equal(w.eval('S.activeScene'),active);assert.equal(canonical(h),before);
   assert(get(h,'frx-preview').querySelector('canvas'));s.ResourceRelationshipPreview.close();
   w.switchTab('anim');w.eval('S._selAnim=0');get(h,'frx-open').click();
   assert.equal(s.ResourceRelationshipPreview.summary().selected,'animation:workflow-animation');s.ResourceRelationshipPreview.close();
   w.switchTab('chr');w.eval('S.editTile=37');get(h,'fcw-relations').click();
   assert.match(s.ResourceRelationshipPreview.summary().selected,/:37$/);s.ResourceRelationshipPreview.close();
   assert.equal(s.ProjectStore.capture().version,12);clean(h);
  });
 }finally{h.dom.window.close();}
 if(process.argv[2])for(let revision=0;revision<2;revision++){
  const original=fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`));
  const h=instance(),w=h.window,s=w.Forge.services,identity=sha(original);
  let poseId,sourceSceneId,composed,saved;
  const build=()=>s.RuntimeCompiler.compile().rom;
  const active=()=>s.ProjectStore.capture().scenes[w.eval('S.activeScene')];
  try{
   s.ProjectStore.load(await s.NativeResourceProject.create(w.Uint8Array.from(original),'Punch-Out workflow verification'),{sync:true});await s.InvestigationUI.whenReady();
   await check('PRG'+revision+' pose context has source and physical owners without materializing writers',()=>{
    get(h,'punchOutContentOpen').click();get(h,'punchOutPoseChoice').value='192';get(h,'punchOutPoseOpen').click();
    poseId=s.PunchOutPoseProject.frameId(192);sourceSceneId=active().id;
    const before=canonical(h),count=s.ProjectStore.capture().scenes.length;
    const d=s.SceneContext.describe();assert.equal(d.source.sha256,identity);assert(d.canOpenSource);assert.equal(d.stage,null);
    const graph=s.ResourceRelationshipPreview.liveGraph(),key='metasprite:'+poseId;
    assert(graph.edges.some(e=>e.from===key&&e.to==='source:'+identity));
    for(const kind of ['chr','palette'])assert(graph.edges.some(e=>e.from===key&&e.to==='native:'+identity+':'+kind+':'+(kind==='chr'?29:0)));
    assert.equal(s.ProjectStore.capture().scenes.length,count);assert.equal(canonical(h),before);assert.equal(sha(build()),identity);
   });
   await check('PRG'+revision+' native pose source route opens preserved investigation without changing assets',async()=>{
    const before=canonical(h);await s.SceneContext.openAsset('source');assert.equal(w.eval('S.tab'),'disasm');
    assert.equal(canonical(h),before);assert.equal(active().id,sourceSceneId);s.PunchOutPoseUI.open(192);
   });
   await check('PRG'+revision+' C0 usage is 52 pieces / 38 tiles with real colors and no fabricated OAM',()=>{
    w.switchTab('chr');const usage=s.ResourceContext.chrUsage();
    assert.equal(usage.pieceCount,52);assert.equal(usage.tileIds.length,38);assert.equal(active().oam.length,0);
    const piece=usage.frame.pieces[0];w.eval('S.editTile='+piece.tile);w.render();
    const appearances=w.forgeCHR.appearances(piece.tile);assert(appearances.some(c=>c.pal===piece.pal));
    assert.match(get(h,'chrPreviewInfo').textContent,/Pose use/);assert(!get(h,'chrPreviewInfo').textContent.includes('Unused'));
    const resolved=w.forgeCHR.resolve(piece.tile);assert.deepEqual(plain(w.forgeCHR.palette(resolved)),plain(usage.paletteScene.sprPal[resolved.pal]));
    assert(get(h,'chrPoseAppearances').querySelector('canvas'));assert.match(get(h,'chrPoseUsageInfo').textContent,/52 pieces.*38 distinct/);
    const before=canonical(h);get(h,'chrUsageScope').value='pose';get(h,'chrUsageScope').dispatchEvent(new w.Event('change',{bubbles:true}));
    assert(w.forgeCHR.usageOnly);assert.equal(canonical(h),before);assert.equal(sha(build()),identity);
    assert.match(get(h,'chrBrowserSelectionNote').textContent,/does not select the displayed Scene buffer/);
   });
   await check('PRG'+revision+' Resources follows pose while independent Scene stays selected; Follow is explicit',()=>{
    s.SceneContext.selectScene(s.ProjectStore.capture().scenes[0].id);w.Forge163.metasprites.select(poseId);w.switchTab('metasprites');
    const before=canonical(h),index=w.eval('S.activeScene');get(h,'fcw-relations').click();
    assert.equal(s.ResourceRelationshipPreview.summary().selected,'metasprite:'+poseId);assert.equal(w.eval('S.activeScene'),index);
    assert(get(h,'frx-preview').querySelector('canvas'));assert.equal(canonical(h),before);
    get(h,'frx-follow').checked=true;get(h,'frx-follow').dispatchEvent(new w.Event('change',{bubbles:true}));
    s.ResourceRelationshipPreview.openAt('metasprite:'+poseId);assert.equal(active().id,sourceSceneId);
    assert.equal(w.Forge163.metasprites.current.id,poseId);get(h,'frx-follow').checked=false;get(h,'frx-follow').dispatchEvent(new w.Event('change',{bubbles:true}));
    s.ResourceRelationshipPreview.close();assert.equal(canonical(h),before);
   });
   await check('PRG'+revision+' native writer is an explicit Undo transaction with source links',async()=>{
    const count=s.ProjectStore.capture().scenes.length;
    s.ResourceRelationshipPreview.openAt('native:'+identity+':chr:29');get(h,'frx-open-editor').click();
    await Promise.resolve();assert.equal(active().id,s.PunchOutArtProject.sceneId('chr',29));assert.equal(w.eval('S.chrBank'),'bg');
    assert.equal(s.ProjectStore.capture().scenes.length,count+1);assert.equal(s.SceneContext.describe().source.sha256,identity);
    assert.equal(s.ResourceContext.chrUsage().frame.id,poseId);assert.equal(sha(build()),identity);
    w.undo();await s.InvestigationUI.whenReady();assert.equal(s.ProjectStore.capture().scenes.length,count);
    s.PunchOutArtUI.open('chr',29);assert.equal(sha(build()),identity);
   });
   await check('PRG'+revision+' known uses distinguish tile-level sharing and disclose coverage',()=>{
    const before=canonical(h),all=s.ResourceContext.consumers(29),glass=s.ResourceContext.consumers(29,8),don=s.ResourceContext.consumers(29,83),shared=s.ResourceContext.consumers(29,255);
    assert.equal(all.coverage.decoded,367);assert.equal(all.coverage.contextRequired,176);
    assert.deepEqual(Array.from(glass.consumers,x=>x.fight),[0]);assert.deepEqual(Array.from(don.consumers,x=>x.fight),[3,10]);
    assert.deepEqual(Array.from(shared.consumers,x=>x.fight),[0,3,10]);assert.match(shared.scope,/not exhaustively covered/);
    w.eval('S.editTile=83');w.render();get(h,'chrInspectNativeUses').click();assert.match(get(h,'chrNativeConsumers').textContent,/Don Flamenco/);
    assert.equal(canonical(h),before);assert.equal(sha(build()),identity);
   });
   await check('PRG'+revision+' fight color shortcut opens the exact palette owner without recoloring snapshots',()=>{
    const source=s.ProjectStore.capture().scenes.find(sc=>sc.id===sourceSceneId),colors=sha(JSON.stringify(source.sprPal));
    get(h,'chrNativePalette').click();assert.equal(active().captureMeta.punchOutArt.kind,'palette');assert.equal(active().captureMeta.punchOutArt.index,0);
    const graph=s.ResourceRelationshipPreview.liveGraph();assert(graph.edges.some(e=>e.from==='scene:'+active().id&&e.to==='source:'+identity));
    assert.equal(sha(build()),identity);assert.equal(sha(JSON.stringify(s.ProjectStore.capture().scenes.find(sc=>sc.id===sourceSceneId).sprPal)),colors);
    s.PunchOutArtUI.open('chr',29);
   });
   await check('PRG'+revision+' current native pixels + pose position compose, Undo and fresh reopen exactly',async()=>{
    const usage=s.ResourceContext.chrUsage(),tile=usage.tileIds[0];w.eval('S.editTile=S.selTile='+tile);w.render();
    const pixel=active().chr[tile][0][0],next=(pixel+1)%4;
    get(h,'pixColorSel').children[next].click();const canvas=get(h,'chrEditCanvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:128,height:128});
    canvas.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,button:0,clientX:8,clientY:8}));h.document.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true}));
    assert.equal(active().chr[tile][0][0],next);const art=build(),offset=0x20010+29*4096;
    const changes=Array.from(art.keys()).filter(i=>art[i]!==original[i]);assert(changes.length>0&&changes.length<=2);
    assert(changes.every(i=>[offset+tile*16,offset+tile*16+8].includes(i)));
    w.undo();await s.InvestigationUI.whenReady();assert.equal(sha(build()),identity);
    w.redo();await s.InvestigationUI.whenReady();assert.equal(sha(build()),sha(art));
    s.PunchOutPoseUI.open(192);get(h,'punchOutPoseIdleGroup').checked=true;get(h,'punchOutPoseX').value='-12';get(h,'punchOutPoseApply').click();
    composed=build();for(const i of changes)assert.equal(composed[i],art[i]);assert.equal(composed[490],244);assert.equal(composed[497],242);assert.equal(composed[504],243);
    assert.equal(active().sprChr[tile][0][0],pixel);saved=s.ProjectStore.serialize();
    const fresh=instance();try{const next=fresh.window.Forge.services;next.ProjectStore.load(saved,{sync:true});await next.InvestigationUI.whenReady();
      assert.equal(sha(next.RuntimeCompiler.compile().rom),sha(composed));clean(fresh);
    }finally{fresh.dom.window.close();}
   });
   await check('PRG'+revision+' snapshot edits remain savable and cannot be re-signed by navigation',()=>{
    const p=s.ProjectStore.capture(),snapshot=p.scenes.find(sc=>sc.id===sourceSceneId);snapshot.sprChr[8][0][0]^=1;
    s.ProjectStore.load(p,{sync:true});assert.throws(build);const before=canonical(h);
    s.ResourceRelationshipPreview.openAt('metasprite:'+poseId);s.ResourceRelationshipPreview.close();assert.equal(canonical(h),before);
    assert.throws(()=>s.PunchOutArtUI.open('chr',29));assert.equal(canonical(h),before);
    s.ProjectStore.load(saved,{sync:true});assert.equal(sha(build()),sha(composed));clean(h);
   });
  }finally{h.dom.window.close();}
 }
 assert.equal(sha(fs.readFileSync(html)),htmlIdentity,'HTML changed during verification');
 const report={status:'passed',htmlSha256:htmlIdentity,checks,
  scope:'Parsed HTML with real controls and pixel events; canvas/layout/timers stubbed. Source factory intake. No full-fight, controller, audio, hardware or exhaustive native-use acceptance.'};
 fs.writeFileSync(path.resolve(process.env.FORGE_WORKFLOW_REPORT||path.join(__dirname,'DOM_Verification.json')),JSON.stringify(report,null,2)+'\n');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
