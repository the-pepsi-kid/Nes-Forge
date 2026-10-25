'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{loadForge}=require('../../app/tests/harness.cjs');
const html=path.resolve(__dirname,'../../app/mainline/NES_Forge_2.0.0-alpha.11.html'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const h=loadForge(html),s=h.context.Forge.services,before=s.ProjectStore.serialize(),original=s.RuntimeCompiler.compile().rom;
assert.equal(original.length,24592);assert.equal(sha(original),'08c95a83d9137dc349b70d20afbf3d1a3f3c3daf8f0cd85a1cd9bbc00e2615f7');
assert.equal(h.context.NFWorkstationAppearance.status().enabled,false);
h.get('nf-skin-toggle').click();assert.equal(h.context.NFWorkstationAppearance.status().enabled,true);assert.equal(s.ProjectStore.serialize(),before);assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(original));
h.get('nf-density').value='comfortable';h.get('nf-density').dispatchEvent({type:'change'});assert.equal(h.context.NFWorkstationAppearance.status().density,'comfortable');assert.equal(s.ProjectStore.serialize(),before);
s.ResourceRelationshipPreview.open();s.ResourceRelationshipPreview.refresh();s.ResourceRelationshipPreview.close();assert.equal(s.ProjectStore.serialize(),before);assert(s.ResourceRelationshipPreview.liveGraph().nodes.size>0);
s.ConnectedWorkspacePreview.open();s.ConnectedWorkspacePreview.refresh();s.ConnectedWorkspacePreview.close();assert.equal(s.ProjectStore.serialize(),before);
for(const tab of ['scene','chr','sprites','collision','metasprites','anim','audio','code','world','emu','disasm']){h.context.requestedTab=tab;h.run('switchTab(requestedTab)');assert.equal(h.run('S.tab'),tab);}
h.get('nf-skin-toggle').click();assert.equal(h.context.NFWorkstationAppearance.status().enabled,false);assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(original));
assert.equal(h.storage.get('nesforge.appearance.skin'),'off');assert.equal(h.storage.get('nesforge.appearance.density'),'comfortable');
// Context indicator must describe the actual pose owner, not invent a binding.
h.run("S.metasprites.push({id:'pose-test',name:'Explicit pose',sceneId:S.scenes[0].id,spriteMode:8,originX:0,originY:0,pieces:[]});Forge163.metasprites.select('pose-test');");assert.equal(h.context.NFContext04.describe().matches,true);
assert.deepEqual(h.errors,[]);
const blocked=loadForge(html,{environment:{localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){}}}});blocked.get('nf-skin-toggle').click();assert.equal(blocked.context.NFWorkstationAppearance.status().enabled,true);assert.deepEqual(blocked.errors,[]);
fs.writeFileSync(path.join(__dirname,'Workstation_Verification.json'),JSON.stringify({status:'passed',htmlSha256:sha(fs.readFileSync(html)),scope:'Headless actual UI/service entry points, source port and semantic checks; no fresh browser layout/device acceptance.',defaultOff:true,densities:['compact','comfortable'],appearanceDoesNotChangeProject:true,starterBuildSha256:sha(original),starterBuildBytes:original.length,resourcesAndConnectedWorkspacePreserveProject:true,existingTabsReachable:true,metaspriteContextOwner:true,blockedStorageGraceful:true,browserLayoutAcceptance:false},null,2)+'\n');console.log('PASS modular Retro Workstation / Resources / Connected Workspace preservation');
