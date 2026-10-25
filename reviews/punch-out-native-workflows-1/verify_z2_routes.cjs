'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{loadForge}=require('../../app/tests/harness.cjs');
const html=path.resolve(__dirname,'../../app/mainline/NES_Forge_2.0.0-alpha.11.html'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const bytes=new Uint8Array(fs.readFileSync(process.argv[2])),original=sha(bytes),h=loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout,clearTimeout}}),s=h.context.Forge.services;
 assert.equal(original,'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c');
 const p=s.NativeWorldProject.create(bytes,'Zelda II native route verification','z2:1:0');s.ProjectStore.load(p,{sync:true});s.NativeWorldUI.choose('z2:1:0');
 const clean=s.ProjectStore.serialize();assert.equal(sha(s.NativeWorldProject.build(s.ProjectStore.capture()).rom),original);h.get('nf-skin-toggle').click();assert.equal(s.ProjectStore.serialize(),clean);
 s.ConnectedWorkspacePreview.openZ2();assert.equal(h.run('S.tab'),'world');assert.equal(s.NativeWorldUI.getState().selected,'z2:1:0');
 s.AreaLibrary.show();s.AreaLibrary.selectScope('project');h.get('areaLibraryProject-native-map').click();assert.equal(h.run('S.tab'),'world');
 const index=22+26*64,before=s.ProjectStore.capture().worlds[0].map[index],value=before===5?4:5;s.ProjectStore.applyNativeWorldEdit('z2:1:0',[{index,value}],{expected:{epoch:s.ProjectStore.state.epoch,snapshot:s.ProjectStore.serialize()}});
 const edited=s.NativeWorldProject.build(s.ProjectStore.capture());assert.notEqual(sha(edited.rom),original);const saved=s.ProjectStore.serialize();s.ProjectStore.load(saved,{sync:true});assert.equal(sha(s.NativeWorldProject.build(s.ProjectStore.capture()).rom),sha(edited.rom));
 // The Area Library's investigated-map route must navigate the same original,
 // rather than leave an apparently editable but read-only map in World.
 await s.AreaLibrary.useSavedSource();s.AreaLibrary.selectScope('source');s.AreaLibrary.selectContext('maps');const d=s.AreaLibrary.describe();assert.equal(d.selected.kind,'map');assert(await s.AreaLibrary.editMap());assert.equal(h.run('S.tab'),'world');assert.equal(h.run('S.nativeGame.profile'),'zelda2-overworld-v1');assert.equal(sha(s.NativeWorldProject.build(s.ProjectStore.capture()).rom),sha(edited.rom));
 const spatial=s.SpatialREUI;s.SpatialREUI={...spatial,sourceSnapshot:()=>null};s.AreaLibrary.show();s.AreaLibrary.selectScope('source');s.AreaLibrary.selectContext('maps');assert(await s.AreaLibrary.editMap());assert.equal(sha(s.NativeWorldProject.build(s.ProjectStore.capture()).rom),sha(edited.rom));s.SpatialREUI=spatial;
 assert.equal(sha(bytes),original);assert.deepEqual(h.errors,[]);
 fs.writeFileSync(path.join(__dirname,'Z2_Route_Verification.json'),JSON.stringify({status:'passed',htmlSha256:sha(fs.readFileSync(html)),sourceSha256:original,nativeWorldNoOp:true,appearancePreservesProject:true,connectedWorkspaceNativeRoute:true,projectAreaLibraryRoute:true,investigatedMapNativeRoute:true,retainedSourceFallbackWithoutTransientSnapshot:true,terrainEditSaveReopen:true,sourceUnchanged:true,browserMouseLayoutAcceptance:false},null,2)+'\n');console.log('PASS native Z2 routes, no-op, terrain edit and save/reopen');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
