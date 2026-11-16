'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {NES} = require('jsnes');
const {load} = require('../app/tests/dom-environment.cjs');
const root = path.resolve(__dirname,'..');
const editor = process.argv[2] || path.join(root,'NES_Forge.html');
const output = process.argv[3];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const dom = load(editor), w = dom.window, d = dom.document;
const s = w.Forge.services, store = s.ProjectStore, gate = s.ProjectGatewayUI;
const report = {editorSha256:sha(fs.readFileSync(editor)),checks:[]};
const pause = () => new Promise(resolve => setImmediate(resolve));
const bytes = value => w.Uint8Array.from(typeof value === 'string' ? Buffer.from(value) : value);
const file = (name, value) => ({name, size:value.length, arrayBuffer:async()=>Uint8Array.from(value).buffer});
async function test(name, action) {
  try { const evidence = await action(); report.checks.push({name,passed:true,evidence}); }
  catch (error) { report.checks.push({name,passed:false,error:error.message}); }
  console.log(name,report.checks.at(-1).passed,report.checks.at(-1).error || '');
}
async function pack(entries) {
  const archive=w.eval('buildZip')(entries.map(([name,data]) => ({name,data:bytes(data)})));
  return bytes(new Uint8Array(await archive.arrayBuffer()));
}
function projectFile(name) {
  return fs.readFileSync(path.join(root,'Examples',name+'.nesforge.json'));
}
(async () => {
  await new Promise(resolve=>setTimeout(resolve,20));
  await test('First-game tutorial is navigable inside Project lessons',() => {
    d.getElementById('projectLessonsOpen').click();
    const select = d.getElementById('projectLessonChapter'); select.value='first-game';
    select.dispatchEvent(new w.Event('change'));
    const steps = [...d.querySelectorAll('#projectLessonBody h2')].filter(h=>/^[1-9]\./.test(h.textContent.trim()));
    assert.equal(steps.length,9); d.getElementById('projectLessonReturn').click();
    d.getElementById('wsOpenLesson').click();
    assert.equal(d.getElementById('projectLessonChapter').value,'cartridge-workshop');
    d.getElementById('projectLessonReturn').click();
    return {steps:steps.length,embeddedChapters:s.ProjectLessons.chapters().length,workshopGuide:true};
  });
  await test('Exported 6502 JSON and source ZIP open in Code and retain source locations',async () => {
    const before = store.serialize(), src = s.SourceWorkspace, workspace = src.example();
    for(const [name,data] of [['workspace.nesforge-source.json',bytes(JSON.stringify(workspace))],['source-workspace.zip',src.archive(workspace)]]) {
      assert(await gate.openFile(file(name,data))); assert.equal(gate.report().kind,'source');
      assert(await gate.route('source')); assert.equal(w.eval('S.tab'),'code');
    }
    const result=src.build(s.SourceWorkspaceUI.getState().document);
    assert(result.sourceMap.dependencies.length>=3);
    assert(result.sourceMap.lineMap.some(line=>line.path==='src/boot.asm'));
    const verify=new NES();verify.loadROM(Buffer.from(result.rom));for(let i=0;i<4;i++)verify.frame();
    assert.equal(verify.cpu.mem[0],70,'The assembled ROM must load F from its included binary.');
    const broken=src.edit(workspace,'main.asm','.include "missing.inc"');
    assert.throws(()=>src.build(broken),/Missing workspace file/);
    assert.equal(store.serialize(),before);
    return {romSha256:sha(result.rom),dependencies:result.sourceMap.dependencies,executedRamByte:verify.cpu.mem[0]};
  });
  await test('Main file picker opens project ZIP and raw CHR ZIP using the established project loader',async () => {
    const project=projectFile('Teapot418'),archive=await pack([['nested/project.json',project]]);
    assert(await gate.openFile(file('wrapped.zip',archive)));assert(await gate.route('project'));
    assert.equal(store.capture().projectName,JSON.parse(project).projectName);
    const chr=Buffer.alloc(4096);chr[0]=0x80;
    const tiles=await pack([['tiles.chr',chr],['nametable.bin',Buffer.alloc(960)]]);
    assert(await gate.openFile(file('art.zip',tiles)));
    assert.equal(gate.report().profile,'chr-tile-pack');assert(await gate.route('project'));
    const result=store.capture();assert.equal(result.projectName,'Imported tile pack');assert.equal(result.scenes[0].chr[0][0][0],1);
    return {scene:result.scenes[0].name,firstPixel:result.scenes[0].chr[0][0][0]};
  });
  await test('Corrupt CRC, unsafe names and ambiguous ZIPs refuse without altering the project',async () => {
    const before=store.serialize(), json=projectFile('Teapot418');
    const crc=Uint8Array.from(await pack([['project.json',json]]));
    const i=Buffer.from(crc).indexOf(Buffer.from('"format"'));assert(i>0);crc[i+2]^=1;
    const entries=[['crc.zip',crc,/Checksum/i],['paths.zip',await pack([['../project.json',json]]),/path/i],
      ['ambiguous.zip',await pack([['a/project.json',json],['b/project.json',json]]),/Multiple/i]];
    for(const [name,data,reason] of entries) {
      assert.equal(await gate.openFile(file(name,data)),false);
      assert.match(d.getElementById('projectGatewayStatus').textContent,reason);
      assert.equal(store.serialize(),before);
    }
    return entries.map(x=>x[0]);
  });
  await test('A late file, a declined replacement and a detached receipt preserve the active project',async () => {
    const old=projectFile('BeaconIsland'),latest=projectFile('DigiGhosts');
    let finish;
    const slow=gate.openFile({name:'old.json',size:old.length,arrayBuffer:()=>new Promise(resolve=>{finish=resolve;})});
    assert(await gate.openFile(file('latest.json',latest)));finish(Uint8Array.from(old).buffer);
    assert.equal(await slow,false);assert.equal(gate.report().source.name,'latest.json');
    const before=store.serialize();w.Forge15.dirty=true;w.confirm=()=>false;
    try { assert.equal(await gate.route('project'),false);assert.equal(store.serialize(),before); }
    finally { w.confirm=()=>true; }
    assert(await gate.route('project'));assert(gate.getState().ready);
    const changed=store.capture();changed.projectName+=' edited';store.load(changed,{intent:'review-edit'});
    const edited=store.serialize();assert.equal(gate.getState().ready,false);
    await assert.rejects(gate.route('project'),/changed/);assert.equal(store.serialize(),edited);
    return {lastFile:'latest.json',declinedChangePreserved:true,staleReceiptRejected:true};
  });
  await test('MIDI file import becomes tracker rows, four native channel records and a runnable audio ROM',async () => {
    const template=JSON.parse(projectFile('TwoStages'));
    template.patterns=[];template.instruments=[];template.orderList=[];template.sfx=[];
    template.audioRuntime={enabled:false,musicEnabled:true};store.load(template,{intent:'audio-fixture'});
    const midi=Buffer.from('4d546864000000060000000100604d54726b0000000c009045646080450000ff2f00','hex');
    const parsed=s.AudioImport.parseMidi(bytes(midi));assert.equal(parsed.notes.length,1);
    const input={files:[file('one-note.mid',midi)],value:''};
    await w.audio18_importMidi(input);
    const project=store.capture();assert(project.patterns.length);project.audioRuntime={enabled:true,musicEnabled:true};
    store.load(project,{intent:'enable-audio'});
    const plan=s.AudioCompiler.plan(store.capture());assert.equal(plan.records.length,4);
    const rom=s.RuntimeCompiler.compile().rom;const nes=new NES();nes.loadROM(Buffer.from(rom));
    const observed=new Map(),write=nes.papu.writeReg.bind(nes.papu);
    nes.papu.writeReg=(addr,value)=>{observed.set(addr,(observed.get(addr)||0)+1);return write(addr,value);};
    for(let i=0;i<80;i++)nes.frame();
    assert((observed.get(0x4002)||0)>0,'No pulse timer write executed.');
    const saved=store.serialize();store.load(saved,{intent:'audio-reopen'});
    assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(rom));
    return {notes:parsed.notes.length,channels:plan.records.map(r=>r.channel),apuRegisters:[...observed.keys()].map(n=>n.toString(16)),romSha256:sha(rom)};
  });
  await pause();
  report.domErrors=[...dom.errors,...dom.consoleErrors,...dom.domErrors];
  report.passed=report.checks.filter(row=>row.passed).length;report.total=report.checks.length;
  report.ok=report.passed===report.total&&!report.domErrors.length;
  if(output) fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  w.close();process.exitCode=report.ok?0:1;
})().catch(err=>{console.error(err);process.exitCode=1;});
