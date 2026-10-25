'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('../../app/tests/harness.cjs');
const root=path.resolve(__dirname,'../..'),html=path.join(root,'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const Art=require('../../app/src/re/punch-out-art.js'),Fight=require('../../app/src/re/punch-out-fight.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v));
const fresh=()=>loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout,clearTimeout}});
(async()=>{const results=[];for(let rev=0;rev<2;rev++){
 const name=`Mike Tyson's Punch-Out!! (U) (PRG ${rev}).nes`,bytes=new Uint8Array(fs.readFileSync(path.join(process.argv[2],name))),original=sha(bytes),model=Art.open(bytes),h=fresh(),s=h.context.Forge.services;
 for(let bank=0;bank<32;bank++){const b=model.bank(bank);assert.deepEqual(Art.packChr(b.chr),bytes.slice(b.offset,b.offset+4096));}
 for(let fight=0;fight<14;fight++){const p=model.palette(fight);assert.deepEqual(Art.paletteBytes(p,bytes.slice(p.offset,p.offset+32)),bytes.slice(p.offset,p.offset+32));}
 await s.ProjectGatewayUI.openFile({name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer});await s.ProjectGatewayUI.route('rom-project');assert(s.InvestigationUI.importProject());await s.InvestigationUI.whenReady();assert(h.get('punchOutContentOpen').onclick());
 assert.equal(h.get('punchOutArtBank').children.length,32);assert.equal(h.get('punchOutArtPalette').children.length,14);
 const before=s.ProjectStore.serialize(),id=s.PunchOutArtUI.open('chr',0);assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom),original);
 h.run('undo()',30000);await s.InvestigationUI.whenReady();assert(!s.ProjectStore.capture().scenes.some(sc=>sc.id===id));h.run('redo()',30000);await s.InvestigationUI.whenReady();assert(s.ProjectStore.capture().scenes.some(sc=>sc.id===id));
 h.run('snapshot();S.chr[1][0][0]^=1;notify("nativeArtPixel")');let project=s.ProjectStore.capture(),built=s.NativeResourceProject.build(project);assert.equal(built.metadata.changes.length,1);assert.equal(built.metadata.changes[0].offset,0x20020);assert.equal(sha(bytes),original);
 h.run('undo()',30000);assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom),original);h.run('redo()',30000);await s.InvestigationUI.whenReady();
 const paletteId=s.PunchOutArtUI.open('palette',0);h.run('snapshot();S.pal[0][1]=33;notify("nativeArtColor")');project=s.ProjectStore.capture();built=s.NativeResourceProject.build(project);assert.equal(built.rom[4807],33);assert.equal(built.metadata.changes.length,2);
 // Actual shared project serialization must retain both independent owners.
 const saved=s.ProjectStore.serialize(),r=fresh(),t=r.context.Forge.services;t.ProjectStore.load(saved,{sync:true});await t.InvestigationUI.whenReady();assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom),sha(built.rom));assert.match(r.get('nativeAudioStatus').textContent,/Decoded 84/);
 assert.equal(t.NativeResourceProject.recognizes(built.rom).id,project.nativeGame.adapter);const derived=await t.NativeResourceProject.create(built.rom,'Native art derivative');assert.equal(sha(t.NativeResourceProject.build(derived).rom),sha(built.rom));
 assert.equal(derived.scenes.find(sc=>sc.id===t.PunchOutArenaRecovery.sceneId).chr[1][0][0],project.scenes.find(sc=>sc.id===id).chr[1][0][0]);
 const reference=t.PunchOutFightRecovery.preview(t.ProjectStore.capture(),{mac:0,referee:144});assert.equal(reference.context.outputHash,sha(built.rom));assert.equal(reference.frame.palette[1],33);
 const wrong=t.ProjectStore.capture();wrong.scenes.find(sc=>sc.id===paletteId).chr[0][0][0]^=1;assert.doesNotThrow(()=>t.ProjectStore.prepareLoad(wrong));assert.throws(()=>t.NativeResourceProject.build(wrong),/native encoder/);assert.throws(()=>t.PunchOutArtProject.prepare(wrong,'chr',2),/native encoder/);
 const unrelated=bytes.slice();unrelated[100]^=1;assert.equal(t.NativeResourceProject.recognizes(unrelated),null);const malformed=built.rom.slice();malformed[4806+4]^=1;assert.equal(t.NativeResourceProject.recognizes(malformed),null);const high=built.rom.slice();high[4807]=128;assert.equal(t.NativeResourceProject.recognizes(high),null);
 const bad=model.palette(0);bad.pal[1][0]=4;assert.throws(()=>Art.paletteBytes(bad),/aliases/);assert.throws(()=>Art.packChr([[]]));
 // Arena compression composes over art, without changing code or native Audio.
 assert(t.PunchOutArenaUI.open());r.run('snapshot();S.selTile=36;S.selPal=0;paintScenePoint(96,152);');const combined=t.NativeResourceProject.build(t.ProjectStore.capture()).rom;assert.equal(combined[4807],33);assert.equal(combined[0x20020],built.rom[0x20020]);assert.notEqual(sha(combined),sha(built.rom));assert.equal(t.NativeResourceProject.recognizes(combined).id,project.nativeGame.adapter);
 for(const [a,b]of [[0xc010,0xe010],[0x10010,0x12010],[0x1a010,0x20010]])assert.deepEqual(combined.slice(a,b),bytes.slice(a,b),'Audio/fixed code changed');
 assert.deepEqual(h.errors,[]);assert.deepEqual(r.errors,[]);
 results.push({revision:name,passed:true,physicalChrBanksRoundtripped:32,paletteTablesRoundtripped:14,unchangedOutput:true,oneUndoRedo:true,pixelChangesOneByte:true,colorChangesOneByte:true,saveReopen:true,derivativeRecognitionReimport:true,arenaComposition:true,referenceUsesCurrentOutput:true,unsupportedEditsPreservedAndRefused:true,protectedBytesAndMalformedPalettesRejected:true,audioEntries:84});console.log('PASS '+name+' native CHR/palette lifecycle');
 }
 fs.writeFileSync(path.join(__dirname,'Art_Verification.json'),JSON.stringify({status:'passed',htmlSha256:sha(fs.readFileSync(html)),scope:'Actual UI/lifecycle and physical codec/native build checks; full engine rendering is covered by Replay_Verification separately.',results},null,2)+'\n');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
