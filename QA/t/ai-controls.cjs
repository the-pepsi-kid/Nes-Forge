'use strict';
// The real editor handlers, serializer, compiler and embedded 6502/PPU run here.
// A DOM stub supplies controls; no browser layout or physical input is certified.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('./u/harness-fast.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'Forge.html'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'p/game.json'))),cases=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>JSON.parse(JSON.stringify(v));
function fresh(){const h=loadForge(html);h.context.fixture=structuredClone(fixture);h.run(`Forge.services.ProjectStore.load(fixture);Forge164.studio.open(fixture.scenes[0].id,fixture.scenes[0].entities.find(e=>e.type==='enemy').id);`,60000);assert.deepEqual(h.errors,[]);return h;}
function change(h,id,value){const c=h.get(id);c.value=String(value);c.onchange();assert.deepEqual(h.errors,[]);}
function config(h){return h.json("S.scenes[0].entities.find(e=>e.type==='enemy').ai.config");}
function compile(h){return Buffer.from(h.run('Forge.services.RuntimeCompiler.commit(Forge.services.RuntimeCompiler.compile())',60000));}
function test(name,fn){try{cases.push({name,passed:true,evidence:fn()});console.log('PASS '+name);}catch(e){cases.push({name,passed:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}

test('Entity Studio AI edits survive Save/Open and compile to the same cartridge',()=>{
 const h=fresh(),before=h.json('projectData()');
 for(const [id,v] of Object.entries({esAiSpeed:4,esAiDetectX:112,esAiDetectY:96,esAiRetreat:100,esAiHurt:90,esAiHover:16,esAiPathMode:'once',esAiPathWait:12}))change(h,id,v);
 h.get('esAiBounce').checked=true;h.get('esAiBounce').onchange();
 const expected={...fixture.scenes[0].entities.find(e=>e.type==='enemy').ai.config,speedTicks:4,detectX:112,detectY:96,retreatTicks:100,hurtTicks:90,hoverTicks:16,pathMode:'once',pathWait:12,contactBounce:true};
 assert.deepEqual(config(h),expected);
 const edited=h.json('projectData()'),first=compile(h),saved=h.run('Forge.services.ProjectStore.serialize()');
 for(const key of ['animations','metasprites','worlds'])assert.deepEqual(edited[key],before[key],key);
 assert.deepEqual(edited.scenes[0].entities.find(e=>e.type==='enemy').ai.path,before.scenes[0].entities.find(e=>e.type==='enemy').ai.path);
 h.context.savedSource=JSON.parse(saved);h.run('Forge.services.ProjectStore.load(savedSource)');assert.deepEqual(config(h),expected);assert.deepEqual(compile(h),first);
 const source=plain(h.run('Forge.services.WorldRom.inspect(new Uint8Array(Forge.services.WorldCompiler.lastBuild.rom)).source'));
 assert.deepEqual(source.scenes[0].entities.find(e=>e.type==='enemy').ai.config,expected);
 return {config:expected,romSha256:sha(first),sourceAndRebuildMatch:true,assetsPreserved:true};
});
test('Undo and Redo of an AI control restore their exact ROMs',()=>{
 const h=fresh(),original=compile(h);assert.equal(sha(original),sha(fs.readFileSync(path.join(root,'r/game.nes'))));
 change(h,'esAiSpeed',2);assert.equal(config(h).speedTicks,2);const changed=compile(h);assert.notEqual(sha(changed),sha(original));
 h.run('undo()');assert.equal(config(h).speedTicks,1);assert.deepEqual(compile(h),original);
 h.run('redo()');assert.equal(config(h).speedTicks,2);assert.deepEqual(compile(h),changed);
 return {originalSha256:sha(original),editedSha256:sha(changed),undoAndRedoByteExact:true};
});

for(const [speed,retreat,hurt] of [[1,8,120],[2,70,50],[4,180,8],[8,70,50]])test(`RAM-injected contact: Move every ${speed}, Retreat ${retreat}, Invulnerable ${hurt} rearms safely`,()=>{
 const h=fresh();change(h,'esAiSpeed',speed);change(h,'esAiRetreat',retreat);change(h,'esAiHurt',hurt);
 const bytes=compile(h);h.context.currentRom=new Uint8Array(bytes);
 const evidence=plain(h.run(`(()=>{if(!emuLoadRomData(currentRom,'Current project build',0))throw Error('ROM load failed');for(let i=0;i<90;i++)emuRunFrame();
 const z=emu._dgAiDebugSymbols,r=emu.ram;r[z.screen]=0;r[z.playerX]=90;r[z.playerY]=200;r[z.velocityY]=0;r[z.grounded]=1;r[z.enemyScreen]=0;r[z.enemyX]=90;r[z.enemyY]=182;r[z.enemyPhase]=1;r[z.hurtTimer]=0;
 let hit=null,rearmed=null;const phases=[];let previous=-1;
 for(let i=0;i<400;i++){emuRunFrame();const phase=r[z.enemyPhase];if(phase!==previous)phases.push({frame:emu.frameCount,phase,hurt:r[z.hurtTimer]});previous=phase;
  if(hit===null&&r[z.hurtTimer]>0)hit=emu.frameCount;
  if(hit!==null&&(phase===0||phase===1)){if(r[z.hurtTimer]!==0)throw Error('Rearmed while invulnerable');rearmed=emu.frameCount;break;}}
 if(hit===null)throw Error('Injected contact never triggered');if(rearmed===null)throw Error('Contact recovery remained latched');return {hitFrame:hit,rearmFrame:rearmed,phases};})()`,120000));
 assert.ok(evidence.phases.some(p=>p.phase===2));assert.ok(evidence.phases.some(p=>p.phase===3));assert.ok(evidence.rearmFrame-evidence.hitFrame>=hurt);assert.deepEqual(h.errors,[]);
 return {parameters:{speed,retreat,hurt},...evidence};
});

const report={suite:'AI editor controls and recovery configuration',htmlSha256:sha(fs.readFileSync(html)),environment:'Node DOM stub, actual control handlers and shipped compiler/6502/PPU; injected contacts explicitly named',passed:cases.filter(c=>c.passed).length,total:cases.length,cases};
fs.writeFileSync(process.argv[3]||path.join(__dirname,'f/ai-controls.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.passed+'/'+report.total+' passed');process.exitCode=report.passed===report.total?0:1;
