'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const {NES,Controller}=require('jsnes');
const {loadForge}=require('./t/u/harness-fast.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={editorSha256:hash(fs.readFileSync(editor)),checks:[]};
function traverse(rom,project) {
  const nes=new NES();nes.loadROM(rom);
  const controls=[[Controller.BUTTON_RIGHT,'right'],[Controller.BUTTON_UP,'up'],[Controller.BUTTON_START,'start']];
  const held=new Set(),pathTaken=[];
  let finishedAt=null,frame=0;
  for(;frame<2000;frame++){
    const cpu=nes.cpu.mem,screen=cpu[6],x=cpu[8],active=frame>20&&screen<project.worlds.length;
    const requested=new Set();
    if(active) {
      if(pathTaken.at(-1)!==screen)pathTaken.push(screen);
      const world=project.worlds[screen],gate=world.markers.find(mark=>mark.kind==='exit');
      if(world.id==='win'){
        if(finishedAt===null)finishedAt=frame;
        if(frame-finishedAt===14)requested.add('start');
      }else if(gate){
        if(x<(gate.x*16+4))requested.add('right');
        else if(frame%4===0)requested.add('up');
      }
      if(finishedAt!==null&&screen===0)break;
    }
    for(const [button,name] of controls){
      if(requested.has(name)&&!held.has(name)){nes.buttonDown(1,button);held.add(name);}
      if(!requested.has(name)&&held.has(name)){nes.buttonUp(1,button);held.delete(name);}
    }
    nes.frame();
  }
  assert.deepEqual(pathTaken,[...project.worlds.map((_,index)=>index),0]);
  return {worldSequence:pathTaken,frames:frame,romSha256:hash(rom)};
}
for(const name of ['TwoStages','EightStages','BeaconIsland']){
 try{
  const doc=fs.readFileSync(path.join(root,'Examples',name+'.nesforge.json'),'utf8'),project=JSON.parse(doc);
  const harness=loadForge(editor);harness.context.documentText=doc;
  harness.run('Forge.services.ProjectStore.load(JSON.parse(documentText),{intent:"qa-independent-route"})',60000);
  const current=Buffer.from(harness.run('Forge.services.RuntimeCompiler.compile().rom',60000));
  const row={name,current:traverse(current,project)};
  const ref=path.join(root,'QA','r',name+'.nes');
  if(fs.existsSync(ref)&&hash(fs.readFileSync(ref))!==hash(current))row.archived=traverse(fs.readFileSync(ref),project);
  row.passed=true;report.checks.push(row);
 }catch(e){report.checks.push({name,passed:false,error:e.message});}
}
report.ok=report.checks.every(item=>item.passed);report.total=report.checks.length;report.passed=report.checks.filter(item=>item.passed).length;
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));process.exitCode=report.ok?0:1;
