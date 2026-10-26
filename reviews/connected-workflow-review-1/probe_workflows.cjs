'use strict';
// Review-only experiments in isolated DOM instances. Never rewrites application
// functions, private ROM inputs, user projects, or release verification reports.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const root=path.resolve(__dirname,'../..'),html=path.join(root,'nes-forge.html');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const observations=[],checks=[];let syntheticFixture;
function record(id,kind,observed){observations.push({id,kind,observed});console.log(id+' · '+kind);}
function instance(){const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;}
function fixture(w,s){
 const p=s.ProjectStore.capture(),a=w.makeScene({...p.scenes[0],id:'review-scene-a',name:'Review room A'}),b=w.makeScene({...p.scenes[0],id:'review-scene-b',name:'Review room B'});
 p.projectName='Synthetic connected workflow review';p.scenes=[a,b];p.activeScene=0;
 p.metasprites=[a,b].map((sc,i)=>({id:'review-pose-'+(i?'b':'a'),name:'Review pose '+(i?'B':'A'),sceneId:sc.id,spriteMode:8,originX:0,originY:0,pieces:[{id:'review-piece-'+i,tile:0,tile2:1,x:0,y:0,pal:0,flipH:false,flipV:false,behind:false}]}));
 p.animations=[{id:'review-animation-b',name:'Review animation B',frames:[{tileIdx:0,duration:8,metaspriteId:'review-pose-b',sceneId:b.id,events:[],hitboxes:[],hurtboxes:[]}]}];
 p.worlds=[w.Forge161.worlds.normalize({id:'review-world-b',name:'Review world B',tilesetSceneId:b.id,widthScreens:1,heightScreens:1})];
 p.gameplayCore={...s.GameplayModel.defaults(),...s.GameplayModel.template('Ground Patrol Enemy',{idPrefix:'review-actor',placement:{kind:'scene',sceneId:a.id},sourceSceneId:b.id}),enabled:false};
 return p;
}
(async()=>{
 const htmlHash=sha(fs.readFileSync(html));
 const h=instance(),w=h.window,d=h.document,s=w.Forge.services,get=id=>{const n=d.getElementById(id);assert(n,id);return n;};
 try{
  const p=fixture(w,s);syntheticFixture=JSON.parse(JSON.stringify(p));s.ProjectStore.load(p,{sync:true});
  const graph=s.ResourceRelationshipPreview.liveGraph();
  assert(graph.edges.some(e=>e.from==='metasprite:review-pose-b'&&e.to==='scene:review-scene-b'));
  assert(graph.edges.some(e=>e.from==='animation:review-animation-b'&&e.to==='metasprite:review-pose-b'));
  assert(graph.edges.some(e=>e.from==='world:review-world-b'&&e.to==='scene:review-scene-b'));
  assert(graph.edges.some(e=>e.from.startsWith('actor:')&&e.to==='scene:review-scene-b'));
  checks.push({id:'explicit-authored-references',passed:true,scope:'Metasprite, animation, World and actor Render source references are preserved in the generic graph.'});
  w.Forge163.metasprites.select('review-pose-b');w.switchTab('metasprites');w.NFContext04.refresh();
  const before=s.ProjectStore.serialize();
  get('fcw-relations').click();
  record('R01-active-resource-focus','navigation-gap',{scene:s.SceneContext.describe().scene,selectedPose:w.Forge163.metasprites.current.id,
   explorer:s.ResourceRelationshipPreview.summary(),mismatchBanner:get('nf04-meta-context').textContent});
  s.ResourceRelationshipPreview.close();assert.equal(s.ProjectStore.serialize(),before);
  s.ResourceRelationshipPreview.openAt('metasprite:review-pose-b');get('frx-follow').checked=true;get('frx-follow').dispatchEvent(new w.Event('change',{bubbles:true}));
  s.ResourceRelationshipPreview.openAt('metasprite:review-pose-b');
  record('P01-exact-resource-follow','working',{scene:s.SceneContext.describe().scene,pose:w.Forge163.metasprites.current.id,explorer:s.ResourceRelationshipPreview.summary()});
  s.ResourceRelationshipPreview.close();
  s.SceneContext.selectScene('review-scene-a');assert.throws(()=>s.SceneContext.openAsset('world','review-world-b'),/World does not use this scene/);
  s.SceneContext.selectScene('review-scene-b');s.SceneContext.openAsset('world','review-world-b');
  record('P02-related-world-validation','working',{tab:w.eval('S.tab'),scene:s.SceneContext.describe().scene,world:w.Forge161.worlds.current.id});
  s.SceneContext.selectScene('review-scene-b');w.Forge163.metasprites.select('review-pose-b');w.switchTab('metasprites');
  const saved=s.ProjectStore.serialize({includeEditorView:true}),other=instance();
  try{other.window.Forge.services.ProjectStore.load(saved,{sync:true});other.window.switchTab('metasprites');other.window.NFContext04.refresh();
   record('R02-reopen-selected-pose','resume-gap',{savedActiveScene:'review-scene-b',savedSelectedPose:'review-pose-b',
    reopened:other.window.NFContext04.describe(),world:other.window.Forge161.worlds.current.id,
    canonicalPoses:other.window.Forge.services.ProjectStore.capture().metasprites.map(f=>f.id)});
   assert.equal(other.window.Forge.services.ProjectStore.capture().metasprites.length,2);
  }finally{other.dom.window.close();}
  const gameplayPanel=get('gcPanel190');gameplayPanel.open=false;
  s.ConnectedWorkspacePreview.open();d.querySelector('[data-fcw-tab="overview"]').click();
  const action=Array.from(get('fcw-panel-overview').querySelectorAll('button')).find(b=>b.textContent==='Edit Gameplay');assert(action);action.click();
  record('R03-gameplay-shortcut','navigation-gap',{tab:w.eval('S.tab'),gameplayPanelOpen:gameplayPanel.open});
  const tabs=[];
  for(const tab of Array.from(d.querySelectorAll('.tab[data-view]'))){tab.click();await Promise.resolve();tabs.push({label:tab.textContent.trim(),requested:tab.dataset.view,actual:w.eval('S.tab')});}
  record('P03-authoring-tab-mounts','bounded-smoke',{tabs,uncaughtErrors:h.errors,consoleErrors:h.consoleErrors,domErrors:h.domErrors});
  const docs=get('sideDocs').textContent;
  record('R12-in-app-workflow-help','documentation-gap',{currentWorkflowTerms:Object.fromEntries(['Native pose positions','Keep idle poses together','Edit native CHR bank','Punch-Out'].map(term=>[term,docs.includes(term)])),
   headings:Array.from(get('sideDocs').querySelectorAll('h2')).map(n=>n.textContent).slice(0,24)});
  assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);
 }finally{h.dom.window.close();}

 const input=path.join(process.argv[2],"Mike Tyson's Punch-Out!! (U) (PRG 0).nes"),original=fs.readFileSync(input),sourceHash=sha(original);
 const n=instance(),nw=n.window,nd=n.document,ns=nw.Forge.services,ng=id=>{const node=nd.getElementById(id);assert(node,id);return node;};
 try{
  const bytes=nw.Uint8Array.from(original);await ns.ProjectGatewayUI.openFile({name:'Punch-Out review source',size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer});
  ns.ProjectStore.load(await ns.NativeResourceProject.create(bytes,'Punch-Out connected review'),{sync:true});await ns.InvestigationUI.whenReady();
  const frameId=ns.PunchOutPoseUI.open(192);await ns.InvestigationUI.whenReady();ng('punchOutPoseTiles').click();
  const project=ns.ProjectStore.capture(),scene=project.scenes[project.activeScene],frame=project.metasprites.find(f=>f.id===frameId),description=ns.SceneContext.describe();
  ns.ConnectedWorkspacePreview.open();nd.querySelector('[data-fcw-tab="overview"]').click();
  record('R04-native-mode-classification','capability-gap',{nativeProfile:project.nativeGame.profile,hasInvestigation:!!project.investigation,
   ribbon:ng('fcw-status').textContent,overview:ng('fcw-panel-overview').textContent,nativeGuide:ng('fcw-panel-native').textContent});
  ns.ConnectedWorkspacePreview.close();
  record('R05-pose-used-tile-context','mapping-gap',{pose:frame.name,posePieces:frame.pieces.length,poseDistinctTiles:new Set(frame.pieces.map(p=>p.tile)).size,
   sceneOam:scene.oam.length,usageText:ng('chrPreviewInfo').textContent,bankPicker:ng('chrBankSel').selectedOptions[0]?.textContent,
   poseBank:ns.PunchOutPoseProject.describe(project,frameId).chrBank4KiB});
  record('R06-shared-source-context','coverage-gap',{nativeProject:description.nativeProject,source:description.source,stage:description.stage,
   canOpenSource:description.canOpenSource,audio:description.audio,nativeAudio:ns.NativeAudioLibraryUI.getState(),areaResources:ns.AreaLibrary.describe().resources});
  const graph=ns.ResourceRelationshipPreview.liveGraph(),sourceNode='source:'+project.nativeGame.sourceSha256;
  record('R07-native-resource-graph','coverage-gap',{sourceEdges:graph.edges.filter(e=>e.to===sourceNode||e.from===sourceNode),
   nativeCueNodes:Array.from(graph.nodes.values()).filter(n=>n.type==='audio').map(n=>({key:n.key,scope:n.scope})),
   poseEdges:graph.edges.filter(e=>e.from==='metasprite:'+frameId),sourceNodePresent:graph.nodes.has(sourceNode),issues:graph.issues});
  ns.ResourceRelationshipPreview.openAt('metasprite:'+frameId);
  record('R13-resource-pose-preview','preview-gap',{selected:ns.ResourceRelationshipPreview.summary().selected,preview:ng('frx-preview').textContent,
   canvasCount:ng('frx-preview').querySelectorAll('canvas').length});ns.ResourceRelationshipPreview.close();
  const baseline=ns.NativeResourceProject.build(ns.ProjectStore.capture());assert.equal(sha(baseline.rom),sourceHash);
  ng('forge15IncludeFirst7').click();let includeBuild;
  try{includeBuild={built:true,outputHash:sha(ns.NativeResourceProject.build(ns.ProjectStore.capture()).rom)};}catch(error){includeBuild={built:false,error:error.message};}
  record('R08-native-build-controls','build-workflow-gap',{button:'Include first 7',result:includeBuild,
   help:ng('buildSceneSet').parentElement.textContent.slice(0,430)});
  nw.undo();await ns.InvestigationUI.whenReady();assert.equal(sha(ns.NativeResourceProject.build(ns.ProjectStore.capture()).rom),sourceHash);
  ns.PunchOutPoseUI.open(192);ng('punchOutPoseArtwork').click();
  const nativeArt=ns.ProjectStore.capture(),artScene=nativeArt.scenes[nativeArt.activeScene];
  const artGraph=ns.ResourceRelationshipPreview.liveGraph();
  record('R09-native-art-owner-discovery','coverage-gap',{scene:artScene.name,marker:artScene.captureMeta.punchOutArt,
   linkedNativePose:artGraph.edges.some(e=>(e.from.includes(frameId)&&e.to.includes(artScene.id))||(e.to.includes(frameId)&&e.from.includes(artScene.id))),
   artSourceEdges:artGraph.edges.filter(e=>e.from==='scene:'+artScene.id&&e.to===sourceNode)});
  // An unsupported copied-reference pixel edit remains savable and guarded.
  ns.PunchOutPoseUI.open(192);ng('punchOutPoseTiles').click();
  nw.eval('snapshot();S.sprChr[0][0][0]=(S.sprChr[0][0][0]+1)&3;notify("review-copy-pixel");');
  const unsupported=ns.ProjectStore.serialize();let refusal;
  try{ns.NativeResourceProject.build(ns.ProjectStore.capture());refusal='Unexpected build acceptance';}catch(error){refusal=error.message;}
  assert.notEqual(refusal,'Unexpected build acceptance');
  ns.ProjectStore.load(unsupported,{sync:true});await ns.InvestigationUI.whenReady();
  record('P04-native-reference-guard','working',{savedAndReopened:true,refusal,pixelsPreserved:ns.ProjectStore.capture().scenes.find(sc=>sc.id===frame.sceneId).sprChr[0][0][0]});
  ns.ConnectedWorkspacePreview.open();nd.querySelector('[data-fcw-tab="health"]').click();
  record('R10-health-before-build','diagnostic-gap',{health:ng('fcw-panel-health').textContent,nativeBuildRefusal:refusal});ns.ConnectedWorkspacePreview.close();
  const authored=JSON.parse(JSON.stringify(syntheticFixture));
  ns.ProjectStore.load(authored,{sync:true});await ns.InvestigationUI.whenReady();
  let guarded;try{await ns.ProjectGatewayUI.route('rom-project');guarded='Unexpected route acceptance';}catch(error){guarded=error.message;}
  record('R11-intake-lifecycle','stale-context-gap',{activeProject:ns.ProjectStore.capture().projectName,
   intakeIdentity:ng('projectGatewayIdentity').textContent,intakeVisible:!ng('projectGatewayPanel').hidden,
   intakeReady:ns.ProjectGatewayUI.getState().ready,staleActionRefusal:guarded,audio:ns.NativeAudioLibraryUI.getState()});
  assert.notEqual(guarded,'Unexpected route acceptance');
  assert.deepEqual(n.errors,[]);assert.deepEqual(n.consoleErrors,[]);assert.deepEqual(n.domErrors,[]);
 }finally{n.dom.window.close();}
 const Content=require('../../app/src/re/punch-out-content.js'),banks=[];
 for(let revision=0;revision<2;revision++){
  const bytes=new Uint8Array(fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`))),model=Content.open(bytes);
  const rows=[0,3,10].map(fight=>{const p=model.pose(fight,0);return{fight:model.fights[fight].label,bank:p.chrBank4KiB,distinctTiles:new Set(p.pieces.map(p=>p.tile)).size};});
  assert(rows.every(row=>row.bank===29));banks.push({revision,rows});
 }
 record('P05-shared-bank-explanation','working-source-mapping',{banks,scope:'Shared physical CHR identity, not exclusive character ownership. The screenshot is consistent with a full shared-bank view.'});
 assert.equal(sha(fs.readFileSync(input)),sourceHash);assert.equal(sha(fs.readFileSync(html)),htmlHash);
 const report={status:'completed',htmlSha256:htmlHash,applicationUnchanged:true,privateInputUnchanged:true,
  scope:'Review-only isolated parsed-DOM actions and source-model inspection. Canvas/layout/timers stubbed. No fresh real-browser/device acceptance.',checks,observations};
 fs.writeFileSync(path.join(__dirname,'Workflow_Observations.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Completed '+observations.length+' workflow observations; release code and private source unchanged.');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
