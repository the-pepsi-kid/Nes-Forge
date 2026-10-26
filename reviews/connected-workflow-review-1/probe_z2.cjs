'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const html=path.resolve(__dirname,'../../nes-forge.html'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function instance(){const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;}
(async()=>{
 const source=fs.readFileSync(process.argv[2]),hash=sha(source),h=instance(),w=h.window,d=h.document,s=w.Forge.services;
 try{
  assert.equal(hash,'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c');
  s.ProjectStore.load(s.NativeWorldProject.create(w.Uint8Array.from(source),'Zelda II connected review','z2:1:0'),{sync:true});
  await s.InvestigationUI.whenReady();s.NativeWorldUI.choose('z2:1:0');
  assert.equal(sha(s.NativeWorldProject.build(s.ProjectStore.capture()).rom),hash);
  s.ConnectedWorkspacePreview.openZ2();assert.equal(w.eval('S.tab'),'world');
  s.AreaLibrary.show();s.AreaLibrary.selectScope('project');d.getElementById('areaLibraryProject-native-map').click();assert.equal(w.eval('S.tab'),'world');
  const index=22+26*64,before=s.ProjectStore.capture().worlds[0].map[index],value=before===5?4:5;
  s.ProjectStore.applyNativeWorldEdit('z2:1:0',[{index,value}],{expected:{epoch:s.ProjectStore.state.epoch,snapshot:s.ProjectStore.serialize()}});
  const output=s.NativeWorldProject.build(s.ProjectStore.capture()).rom;assert.notEqual(sha(output),hash);
  const saved=s.ProjectStore.serialize({includeEditorView:true}),other=instance();
  try{other.window.Forge.services.ProjectStore.load(saved,{sync:true});
   assert.equal(sha(other.window.Forge.services.NativeWorldProject.build(other.window.Forge.services.ProjectStore.capture()).rom),sha(output));
   assert.equal(other.window.Forge.services.ProjectStore.capture().worlds[0].map[index],value);
  }finally{other.dom.window.close();}
  assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);
  const report={status:'passed',htmlSha256:sha(fs.readFileSync(html)),scope:'Fresh isolated parsed-DOM native World routes, terrain edit/build and save/reopen. No browser layout, original-engine play or hardware acceptance.',
   nativeProfile:s.ProjectStore.capture().nativeGame.profile,ribbonMode:s.ConnectedWorkspacePreview.context().mode,
   noOpOutputUnchanged:true,connectedWorkspaceRoute:true,areaLibraryRoute:true,terrainEditRebuildAndFreshReopen:true,
   originalSourceUnchanged:sha(fs.readFileSync(process.argv[2]))===hash,outputSha256:sha(output)};
  fs.writeFileSync(path.join(__dirname,'Z2_Continuity_Verification.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS native Zelda II edit/navigation/save/reopen continuity');
 }finally{h.dom.window.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
