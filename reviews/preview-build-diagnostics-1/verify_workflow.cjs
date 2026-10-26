'use strict';
// Parsed full app; actual codecs and compiler, stubbed canvas/layout/timers.
// Private source bytes stay in memory. Chromium pixel checks are separate.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const root=path.resolve(__dirname,'../..'),html=path.resolve(process.env.FORGE_REVIEW_HTML||path.join(root,'nes-forge.html'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v)),checks=[],identity=sha(fs.readFileSync(html));
const instance=()=>{const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;};
const get=(h,id)=>{const node=h.document.getElementById(id);assert(node?.isConnected,id);return node;};
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name);}
function assets(s){const p=s.ProjectStore.capture();for(const key of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps','activeScene','selTile','editTile','selSprite','selEntity','chrBank','_selAnim','_animFrame'])delete p[key];return sha(JSON.stringify(p));}
function clean(h){assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);}
(async()=>{
 const h=instance(),w=h.window,s=w.Forge.services;
 try{
  await check('Generated compiler check preserves canonical source and committed build/emulator state',()=>{
   s.ProjectStore.capture();const before=assets(s),last=s.RuntimeCompiler.lastArtifact,rom=w._lastBuiltRom,loaded=w.eval('emu.loaded');
   const report=s.BuildGraph.checkCurrent();assert(report.ok);assert.equal(report.backend,'packed');assert.equal(report.outputSha256,sha(s.RuntimeCompiler.compile().rom));
   assert.equal(assets(s),before);assert.equal(s.RuntimeCompiler.lastArtifact,last);assert.equal(w._lastBuiltRom,rom);assert.equal(w.eval('emu.loaded'),loaded);
  });
  await check('Health distinguishes reference integrity, compiler result and stale result',()=>{
   s.ConnectedWorkspacePreview.open('health');assert.match(get(h,'fcw-build-report').textContent,/No current compiler result/);
   get(h,'fcw-check-build').click();assert.match(get(h,'fcw-panel-health').textContent,/Compiler passed/);
   w.eval('S.chr[0][0][0]=1');s.ConnectedWorkspacePreview.refresh();assert.match(get(h,'fcw-panel-health').textContent,/Check again/);
   assert.match(get(h,'fcw-build-report').textContent,/No current compiler result/);s.ConnectedWorkspacePreview.close();
  });
  await check('Generated failure is the real compiler refusal and unsupported work stays savable',()=>{
   w.eval('S.oam=[{x:10,y:0,tile:0,attr:0,height:8,active:true}]');const before=assets(s),r=s.BuildGraph.checkCurrent();assert(!r.ok);
   assert.match(r.diagnostics[0].message,/Y=0/);assert.equal(assets(s),before);w.eval('S.oam=[]');
  });
  await check('Independent Scene CHR preview uses its own usage and does not select the Scene/bank',()=>{
   const p=s.ProjectStore.capture(),sc=w.makeScene({id:'preview-other',name:'Other palette',nt:Array(960).fill(8),attr:Array(64).fill(255),
    pal:[[15,1,2,3],[15,4,5,6],[15,7,8,9],[15,10,11,12]],oam:[],buildInclude:false});p.scenes.push(sc);s.ProjectStore.load(p,{sync:true});
   const before=assets(s),index=w.eval('S.activeScene'),bank=w.eval('S.chrBank'),v=s.ResourcePreview.chr(sc.id,'bg');
   assert.equal(v.resolve(8).pal,3);assert.deepEqual(plain(w.forgeCHR.palette(v.resolve(8),v.scene,'bg')),[15,10,11,12]);
   s.ResourceRelationshipPreview.openAt('chr:bg:'+sc.id);assert(get(h,'frx-preview').querySelector('canvas'));
   assert.equal(w.eval('S.activeScene'),index);assert.equal(w.eval('S.chrBank'),bank);assert.equal(assets(s),before);s.ResourceRelationshipPreview.close();
  });
  await check('Active CHR Resources resolver retains manual and raw-index display modes',()=>{
   w.switchTab('chr');get(h,'chrPreviewMode').value='indices';get(h,'chrPreviewMode').dispatchEvent(new w.Event('change',{bubbles:true}));
   let v=s.ResourcePreview.chr(s.ProjectStore.capture().scenes[w.eval('S.activeScene')].id,'bg');assert.equal(v.mode,'indices');
   get(h,'chrPreviewMode').value='manual';get(h,'chrPreviewMode').dispatchEvent(new w.Event('change',{bubbles:true}));w.eval('S.selPal=2');
   v=s.ResourcePreview.chr(s.ProjectStore.capture().scenes[w.eval('S.activeScene')].id,'bg');assert.equal(v.mode,'manual');assert.equal(v.resolve(0).pal,2);clean(h);
  });
 }finally{h.dom.window.close();}
 if(process.argv[2])for(let revision=0;revision<2;revision++){
  const h=instance(),w=h.window,s=w.Forge.services,original=fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`));
  const prefix='PRG'+revision+' ',build=()=>s.RuntimeCompiler.compile().rom;let pid,sid,saved;
  try{
   s.ProjectStore.load(await s.NativeResourceProject.create(w.Uint8Array.from(original),'Preview verification'),{sync:true});await s.InvestigationUI.whenReady();
   await check(prefix+'native view materialization and diagnostic metadata preserve original output',()=>{
    s.PunchOutPoseUI.open(192);pid=w.Forge163.metasprites.current.id;sid=w.Forge163.metasprites.current.sceneId;
    assert.equal(sha(build()),sha(original));saved=s.ProjectStore.capture();
   });
   await check(prefix+'current output is compiled through all native owners without canonical changes',()=>{
    const before=assets(s),last=s.RuntimeCompiler.lastArtifact,view=s.ResourcePreview.nativePose(pid);
    assert.equal(view.outputSha256,sha(original));assert.equal(view.bank,29);assert.equal(view.frame.pieces.length,52);assert.equal(assets(s),before);
    assert.equal(s.RuntimeCompiler.lastArtifact,last);assert.match(view.scope,/Declared native state path/);
   });
   await check(prefix+'physical pixel and fight palette changes appear in output while snapshots remain byte-identical',()=>{
    const source=s.ProjectStore.capture().scenes.find(sc=>sc.id===sid),snapshot=sha(JSON.stringify(source));
    s.PunchOutArtUI.open('chr',29);const tile=w.Forge163.metasprites.current.pieces[0].tile;
    w.eval('S.chr['+tile+'][0][0]=(S.chr['+tile+'][0][0]+1)%4');
    s.PunchOutArtUI.open('palette',0);w.eval('S.sprPal[0][1]=(S.sprPal[0][1]+1)%64');
    const p=s.ProjectStore.capture(),out=s.ResourcePreview.nativePose(pid);assert.equal(out.outputSha256,sha(build()));assert.notEqual(out.outputSha256,sha(original));
    assert.equal(out.scene.sprChr[tile][0][0],p.scenes.find(sc=>sc.captureMeta?.punchOutArt?.kind==='chr').chr[tile][0][0]);
    assert.equal(out.scene.sprPal[0][1],p.scenes.find(sc=>sc.captureMeta?.punchOutArt?.kind==='palette').sprPal[0][1]);
    assert.equal(sha(JSON.stringify(p.scenes.find(sc=>sc.id===sid))),snapshot);
   });
   await check(prefix+'output preview refuses invalid live pixels that a project loader would normalize',()=>{
    s.ProjectStore.load(saved,{sync:true});s.SceneContext.selectScene(sid);
    const location=w.eval('(()=>{for(let t=0;t<S.sprChr.length;t++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(S.sprChr[t][y][x]===3)return [t,y,x];})()');assert(location);
    w.eval('S.sprChr['+location[0]+']['+location[1]+']['+location[2]+']=255');assert.throws(()=>s.ResourcePreview.nativePose(pid));
    assert(!s.BuildGraph.checkCurrent().ok);s.ProjectStore.load(saved,{sync:true});
   });
   await check(prefix+'source artwork edit identifies exact protected Scene and pixel field without re-signing',()=>{
    s.ProjectStore.load(saved,{sync:true});s.SceneContext.selectScene(sid);w.eval('S.sprChr[8][0][0]=(S.sprChr[8][0][0]+1)%4');
    const before=assets(s),signature=s.ProjectStore.capture().nativeGame.projectionSha256,r=s.BuildGraph.checkCurrent(),d=r.diagnostics[0];assert(!r.ok);
    assert.equal(d.assetId,sid);assert.equal(d.field,'sprChr');assert.match(d.path,/sprChr\[8\]\[0\]\[0\]/);assert.match(d.evidence,/restores.*hash/);assert.match(d.repair,/Physical CHR/);
    assert.equal(assets(s),before);assert.equal(s.ProjectStore.capture().nativeGame.projectionSha256,signature);assert.throws(()=>s.ResourcePreview.nativePose(pid));
   });
   await check(prefix+'preflight and Project Health surface the same refusal with exact resource navigation',()=>{
    assert.equal(s.BuildGraph.preflight(),null);assert.match(get(h,'forge15Preflight').textContent,/sprChr\[8\]/);
    s.ConnectedWorkspacePreview.open('health');get(h,'fcw-check-build').click();assert.match(get(h,'fcw-build-report').textContent,/protected artwork snapshot/);
    const b=get(h,'fcw-build-report').querySelector('button');assert(b);b.click();assert.equal(s.ResourceRelationshipPreview.summary().selected,'scene:'+sid);
    s.ResourceRelationshipPreview.close();
   });
   await check(prefix+'several protected fields can be identified only with a complete saved-hash proof',()=>{
    w.eval('S.sprPal[0][1]=(S.sprPal[0][1]+1)%64');const d=s.BuildGraph.checkCurrent().diagnostics[0];
    assert.equal(d.relatedFields.length,2);assert(d.relatedFields.some(d=>d.field==='sprChr'));assert(d.relatedFields.some(d=>d.field==='sprPal'));
   });
   await check(prefix+'unsupported individual geometry identifies native frame and whole-pose repair',()=>{
    s.ProjectStore.load(saved,{sync:true});w.Forge163.metasprites.select(pid);w.Forge163.metasprites.current.pieces[0].x++;
    const r=s.BuildGraph.checkCurrent();assert(!r.ok);assert.equal(r.diagnostics[0].assetId,pid);assert.match(r.diagnostics[0].repair,/complete-pose X\/Y/);
   });
   await check(prefix+'recipe mismatch identifies the real source page and first differing field',()=>{
    s.ProjectStore.load(saved,{sync:true});const sc=s.ProjectStore.capture().scenes[0];s.SceneContext.selectScene(sc.id);w.eval('S.nt[0]=(S.nt[0]+1)%256');
    const r=s.BuildGraph.checkCurrent();assert(!r.ok);assert.equal(r.diagnostics[0].assetId,sc.id);assert.equal(r.diagnostics[0].field,'nt');assert.match(r.diagnostics[0].repair,/Native source pages/);
   });
   await check(prefix+'physical writer misuse names the writer and its owned BG buffer',()=>{
    s.ProjectStore.load(saved,{sync:true});s.PunchOutArtUI.open('chr',29);w.eval('S.sprChr[8][0][0]=1');
    const r=s.BuildGraph.checkCurrent();assert(!r.ok);assert.equal(r.diagnostics[0].assetId,'po-native-art-chr-29');assert.equal(r.diagnostics[0].field,'sprChr');assert.match(r.diagnostics[0].repair,/BG CHR buffer only/);
   });
   await check(prefix+'unrecoverable hash differences stay explicit instead of guessing a field',()=>{
    s.ProjectStore.load(saved,{sync:true});w.eval('S.tempo=151');const r=s.BuildGraph.checkCurrent();assert(!r.ok);assert.equal(r.diagnostics[0].field,'protected project projection');assert(!r.diagnostics[0].assetId);assert.match(r.diagnostics[0].repair,/cannot locate/);
   });
   await check(prefix+'restoring source returns compiler eligibility and leaves runtime untouched',()=>{
    s.ProjectStore.load(saved,{sync:true});const before=assets(s),r=s.BuildGraph.checkCurrent();assert(r.ok);assert.equal(r.outputSha256,sha(original));assert.equal(assets(s),before);clean(h);
   });
  }finally{h.dom.window.close();}
 }
 assert.equal(sha(fs.readFileSync(html)),identity);
 const report={status:'passed',htmlSha256:sha(fs.readFileSync(html)),checks,scope:'Real parsed app/compiler/codecs; canvas/layout/timers stubbed. Native source inputs remain local; no full-fight or hardware acceptance.'};
 fs.writeFileSync(process.env.FORGE_PREVIEW_REPORT||path.join(__dirname,'Workflow_DOM.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
