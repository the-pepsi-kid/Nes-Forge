'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{loadForge}=require('../../app/tests/harness.cjs');
const repo=path.resolve(__dirname,'../..'),html=path.join(repo,'app/mainline/NES_Forge_2.0.0-alpha.11.html'),input=path.resolve(process.argv[2]||'private-roms'),results=[];
const fresh=()=>loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout,clearTimeout}}),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 for(const name of fs.readdirSync(input).filter(n=>n.includes("Mike Tyson's Punch-Out"))){
  const bytes=Uint8Array.from(fs.readFileSync(path.join(input,name))),h=fresh(),s=h.context.Forge.services;
  assert.deepEqual(h.errors,[]);const project=await s.InvestigationProject.create(bytes,name),api=s.PunchOutContentRecovery,content=api.source(project);
  assert.equal(project.scenes.length,19);assert.equal(project.metasprites.length,14);assert.equal(project.nativeGame.bindings.length,5);
  let decoded=0,pending=0,empty=0,poses=0,totalPieces=0;
  for(const f of content.fights){for(const record of f.poses){poses++;if(record.status==='unavailable-slot'){empty++;assert.throws(()=>content.pose(f.index,record.selector));continue;}
   const p=content.pose(f.index,record.selector),m=s.NativeAudioMachine.create(bytes,f.bank8KiB,{mmc2FixedBank:true}),r=m.ram;
   r[3]=f.entryOffset;r[0xa0]=128;r[0xa1]=record.selector;r[0x80]=f.spriteMode;r[0x81]=f.spriteMode/8;r[0x82]=f.spriteMode===16?254:255;r[0xa9]=5;r[0xb0]=f.baseX;r[0xb1]=f.baseY;r.fill(248,512,768);m.call(0xc890);
   assert.deepEqual(plain(p.oam),Array.from(r.slice(512,768)));assert.equal(p.chrBank4KiB,r[0xa9]&31);p.status==='decoded'?decoded++:pending++;
  }}
  h.context.auditBytes=bytes;assert.deepEqual(plain(content.chr(31)),h.json('romChrBanks(auditBytes)[31].tiles'));const browser=s.ProjectStore.prepareLoad(project).chrBanks;assert.equal(browser.length,32);for(let bank=0;bank<32;bank++)assert.deepEqual(plain(content.chr(bank)),plain(browser[bank].tiles));
  for(const frame of project.metasprites){const sc=project.scenes.find(s=>s.id===frame.sceneId),f=content.fights[sc.captureMeta.punchOutContent.fight],p=content.pose(f.index,0);assert(sc.sprChr.flat(2).some(Boolean));assert.equal(sc.oam.length,p.pieces.length);assert.equal(frame.pieces.length,p.pieces.length);totalPieces+=p.pieces.length;for(let i=0;i<frame.pieces.length;i++){const piece=frame.pieces[i],original=p.pieces[i];assert.equal((piece.x+f.baseX)&255,original.x);assert.equal((piece.y-1+f.baseY)&255,original.y-1);assert.equal(piece.pal,original.attributes&3);assert.equal(piece.flipH,!!(original.attributes&64));assert.equal(piece.flipV,!!(original.attributes&128));}}
  assert.equal(hash(s.NativeResourceProject.build(project).rom),hash(bytes));assert.equal((await s.NativeAudioCatalog.inspect(bytes)).cues.length,84);
  results.push({name:name+' · source inventory / all native pose RAM outputs / complete CHR parity',passed:true,poseSlots:poses,decodedWithInitialMode:decoded,requiresAnimationContext:pending,unavailableSlots:empty,representativePieces:totalPieces,rawChrBanks:32});
  // Actual gateway preview/import and source Audio restoration.
  assert(await s.ProjectGatewayUI.openFile({name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}));assert(await s.ProjectGatewayUI.route('rom-project'));assert(s.InvestigationUI.importProject());await s.InvestigationUI.whenReady();
  assert.match(h.get('nativeAudioStatus').textContent,/Decoded 84/);assert(s.PunchOutContentUI.open());h.get('punchOutContentPose').value='2';s.PunchOutContentUI.render();assert(s.PunchOutContentUI.getState().ready);
  const before=s.ProjectStore.serialize();const added=s.PunchOutContentUI.materialize();assert.equal(added[0],'po-pose-f0-s2');const after=s.ProjectStore.serialize();assert.notEqual(after,before);assert.equal(s.ProjectStore.capture().metasprites.length,15);assert.equal(hash(s.NativeResourceProject.build(s.ProjectStore.capture()).rom),hash(bytes));
  h.run('undo()');await s.InvestigationUI.whenReady();assert.equal(s.ProjectStore.capture().metasprites.length,14);h.run('redo()');await s.InvestigationUI.whenReady();assert.equal(s.ProjectStore.capture().metasprites.length,15);
  const saved=s.ProjectStore.serialize(),other=fresh(),os=other.context.Forge.services;os.ProjectStore.load(saved);await os.InvestigationUI.whenReady();assert.equal(os.ProjectStore.capture().metasprites.length,15);assert.match(other.get('nativeAudioStatus').textContent,/Decoded 84/);assert.equal(hash(os.NativeResourceProject.build(os.ProjectStore.capture()).rom),hash(bytes));assert(os.PunchOutContentUI.open());
  const bad=os.ProjectStore.capture();bad.metasprites[0].pieces[0].x++;assert.throws(()=>os.NativeResourceProject.build(bad),/native encoder/);assert.throws(()=>os.PunchOutContentRecovery.recover(bad,{fight:0,selector:4}),/native encoder/);
  const snapshot=os.ProjectStore.serialize();other.get('punchOutContentFight').value='2';other.get('punchOutContentFight').onchange();other.get('punchOutContentPose').value='14';os.PunchOutContentUI.render();assert.equal(os.PunchOutContentUI.getState().ready,false);assert.equal(os.ProjectStore.serialize(),snapshot);
  assert.deepEqual(h.errors,[]);assert.deepEqual(other.errors,[]);results.push({name:name+' · actual gateway / UI / Undo-Redo / save-reopen / Audio / build refusal',passed:true});
 }
 const report={status:'passed',htmlSha256:hash(fs.readFileSync(html)),groups:results.length,scope:'Native source inventory, source-pose execution/CHR parity and actual headless editor entry/lifecycle. Not complete fight, animation, browser listening, native sprite/CHR/Audio writing or release acceptance.',results};fs.writeFileSync(path.join(__dirname,'Content_Verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
