'use strict';
// Executes the shipped compiler and 6502/PPU code, not a rewritten AI model.
// RAM-injected edge cases are explicitly named. This is not browser layout QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('./u/harness-fast.cjs');
const root=path.resolve(__dirname,'..'),html=process.argv[2]||path.join(root,'Forge.html');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'p/game.json')));
const h=loadForge(html),run=s=>{const value=h.run(s,120000);return value===undefined?value:JSON.parse(JSON.stringify(value));},cases=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function test(name,fn){try{const evidence=fn();cases.push({name,passed:true,evidence});console.log('PASS '+name);}catch(e){cases.push({name,passed:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
function setup(project=fixture){
 h.context.dgFixture=project;
 return run(`(()=>{Forge.services.ProjectStore.load(dgFixture);globalThis.dgRom=Forge.services.RuntimeCompiler.commit(Forge.services.RuntimeCompiler.compile());if(!emuLoadRomData(dgRom,'Current project build',0))throw Error('ROM load failed');S.tab='emu';return {bytes:dgRom.length,codeBytes:Forge.services.WorldCompiler.lastBuild.dataEnd-0x8000};})()`);
}
function trace(frames,input=true){
 h.context.dgFrames=frames;h.context.dgInput=input;
 return run(`(()=>{const z=emu._dgAiDebugSymbols,r=emu.ram,hits=[],phases=[],positions=[];let prevH=0,prevP=-1;
 for(let f=0;f<dgFrames;f++){
  if(dgInput){if(f===30)emuKeys.ArrowRight=true;if(f===100)delete emuKeys.ArrowRight;if(f===720)emuKeys.ArrowLeft=true;if(f===750)delete emuKeys.ArrowLeft;}
  emuRunFrame();const p=r[z.enemyPhase],v={frame:emu.frameCount,phase:p,enemyX:r[z.enemyScreen]*256+r[z.enemyX],enemyY:r[z.enemyY],playerX:r[z.screen]*256+r[z.playerX],playerY:r[z.playerY],hurt:r[z.hurtTimer]};
  if(v.hurt>prevH+1)hits.push(v);if(p!==prevP)phases.push(v);if(f%120===119)positions.push(v);prevH=v.hurt;prevP=p;
 }return {hits,phases,positions};})()`);
}
test('Controller trace resumes pursuit after recovery without leaving the old encounter area',()=>{
 const build=setup(),v=trace(960);assert.equal(build.bytes,40976);assert.equal(v.hits[0].frame,104);
 assert.ok(v.phases.some(p=>p.frame>211&&p.frame<220&&p.phase===1));assert.ok(v.hits.length>=3);
 const intervals=v.hits.slice(1).map((hit,i)=>hit.frame-v.hits[i].frame);assert.ok(intervals.every(v=>v>=109));
 return {build,hitFrames:v.hits.map(v=>v.frame),minimumHitInterval:Math.min(...intervals),resumeFrame:v.phases.find(p=>p.frame>211&&p.phase===1).frame};
});
test('Long invulnerability prevents rearming before its timer expires',()=>{
 const p=structuredClone(fixture);Object.assign(p.scenes[0].entities[1].ai.config,{retreatTicks:8,hurtTicks:120});setup(p);
 const v=trace(500);let hit=null;for(const t of v.phases){if(t.phase===2)hit=t;if(hit&&(t.phase===0||t.phase===1)){assert.equal(t.hurt,0);assert.ok(t.frame-hit.frame>=120);}}
 assert.ok(v.hits.length>=2);return {hitFrames:v.hits.map(v=>v.frame),phases:v.phases.map(v=>({frame:v.frame,phase:v.phase,hurt:v.hurt}))};
});
test('RAM injection: overlap during separation keeps escaping without another hit',()=>{
 setup();return run(`(()=>{for(let i=0;i<90;i++)emuRunFrame();const z=emu._dgAiDebugSymbols,r=emu.ram;
 r[z.playerX]=90;r[z.screen]=0;r[z.playerY]=200;r[z.grounded]=1;r[z.velocityY]=0;r[z.enemyScreen]=0;r[z.enemyX]=90;r[z.enemyY]=182;r[z.enemyPhase]=4;r[z.hurtTimer]=0;r[z.enemyRetreatVertical]=0;r[z.enemyFacing]=0;
 const seen=[];let rearmed=false;for(let f=0;f<100;f++){emuRunFrame();if(r[z.hurtTimer]&& !rearmed)throw Error('Hit while separation latch closed');if(r[z.enemyPhase]!==4){rearmed=true;seen.push({frame:f,phase:r[z.enemyPhase],x:r[z.enemyX],y:r[z.enemyY]});break;}}
 if(!rearmed)throw Error('Separation did not finish');if(r[z.enemyX]===90&&r[z.enemyY]===182)throw Error('Enemy stayed frozen');return seen;})()`);
});
for(const side of ['left','right'])for(const y of [31,189])test(`RAM injection: ${side} boundary at Y=${y} escapes and rearms`,()=>{
 setup();h.context.dgSide=side;h.context.dgY=y;
 return run(`(()=>{for(let f=0;f<90;f++)emuRunFrame();const z=emu._dgAiDebugSymbols,r=emu.ram,screen=dgSide==='left'?0:15,x=dgSide==='left'?8:248;
 r[z.screen]=screen;r[z.playerX]=x;r[z.playerY]=dgY+18;r[z.enemyScreen]=screen;r[z.enemyX]=x;r[z.enemyY]=dgY;r[z.enemyPhase]=4;r[z.hurtTimer]=0;r[z.enemyFacing]=dgSide==='left'?0:1;r[z.enemyRetreatVertical]=dgY===189?1:0;
 const start={x:r[z.enemyX],y:r[z.enemyY]};let clear=null;
 for(let f=0;f<200;f++){emuRunFrame();if(r[z.enemyPhase]!==4){clear={frame:f,x:r[z.enemyX],y:r[z.enemyY],phase:r[z.enemyPhase]};break;}}
 if(!clear)throw Error('Boundary latch stalled');if(clear.x===start.x&&clear.y===start.y)throw Error('No escape movement');return {start,clear};})()`);
});
test('RAM injection: separation compares the complete gap across a screen seam',()=>{
 setup();return run(`(()=>{for(let i=0;i<90;i++)emuRunFrame();const z=emu._dgAiDebugSymbols,r=emu.ram;
 r[z.screen]=1;r[z.playerX]=4;r[z.playerY]=200;r[z.enemyScreen]=0;r[z.enemyX]=250;r[z.enemyY]=182;r[z.enemyPhase]=4;r[z.hurtTimer]=0;r[z.enemyFacing]=0;r[z.enemyRetreatVertical]=0;
 emuRunFrame();if(r[z.enemyPhase]!==4)throw Error('False seam separation at 10px');
 r[z.playerX]=80;emuRunFrame();if(r[z.enemyPhase]!==0)throw Error('Failed seam separation at >80px');return {nearPhase:4,farPhase:r[z.enemyPhase]};})()`);
});
test('RAM injection: both actor blocks get complete scanline priority on successive DMA frames',()=>{
 setup();const v=run(`(()=>{for(let f=0;f<90;f++)emuRunFrame();const z=emu._dgAiDebugSymbols,r=emu.ram;
 r[z.screen]=0;r[z.playerX]=80;r[z.playerY]=200;r[z.velocityY]=0;r[z.grounded]=1;r[z.playerState]=0;r[z.playerFrame]=0;r[z.playerRemaining]=240;
 r[z.enemyScreen]=0;r[z.enemyX]=200;r[z.enemyY]=182;r[z.enemyPhase]=3;r[z.enemyTimer]=240;r[z.enemyFrame]=0;r[z.enemyRemaining]=240;
 const frames=[];for(let f=0;f<8;f++){emuRunFrame();const sprites=[];for(let i=0;i<256;i+=4){const y=emu.oamMem[i];if(y<239)sprites.push({y:y+1,tile:emu.oamMem[i+1],attr:emu.oamMem[i+2],x:emu.oamMem[i+3]});}frames.push({priority:r[z.oamPriority],sprites});}
 return frames;})()`);
 const last=v.slice(-4),order=last.map(f=>f.sprites[0].x<130?'player':'enemy');assert.deepEqual(order.slice(0,2).sort(),['enemy','player']);assert.equal(order[0],order[2]);assert.equal(order[1],order[3]);
 const key=p=>JSON.stringify(p),all=new Set(last[0].sprites.map(key)),visible=new Set();let peak=0;
 for(const f of last.slice(0,2)){
  assert.equal(f.sprites.length,last[0].sprites.length);assert.deepEqual(new Set(f.sprites.map(key)),all);
  for(let y=1;y<240;y++){const row=f.sprites.filter(p=>p.y<=y&&y<p.y+8);peak=Math.max(peak,row.length);for(const p of row.slice(0,8))visible.add(key(p));}
 }
 assert.ok(peak>8);assert.deepEqual(visible,all);
 for(const actor of ['player','enemy']){const sequence=f=>f.sprites.filter(p=>(p.x<130?'player':'enemy')===actor).map(key);assert.deepEqual(sequence(last[0]),sequence(last[1]));}
 return {dmaActorOrder:order,pieces:all.size,peakSpritesOnLine:peak,piecesVisibleAcrossPair:visible.size};
});
test('Controller scrolling advances priority only when OAM is transferred',()=>{
 setup();const v=run(`(()=>{for(let f=0;f<90;f++)emuRunFrame();const z=emu._dgAiDebugSymbols,r=emu.ram;let skipped=0,transferred=0;
 r[z.enemyPhase]=3;r[z.enemyTimer]=240;emuKeys.ArrowRight=true;
 for(let f=0;f<100;f++){const prior=r[z.oamPriority],before=Array.from(emu.oamMem);emuRunFrame();if(prior===r[z.oamPriority]){if(before.some((v,i)=>v!==emu.oamMem[i]))throw Error('OAM changed without priority advancement');skipped++;}else transferred++;}
 delete emuKeys.ArrowRight;return {skipped,transferred,view:r[z.viewHi]*256+r[z.viewLo]};})()`);
 assert.ok(v.skipped>0);assert.ok(v.transferred>0);assert.ok(v.view>0);return v;
});
for(const file of ['half.json','giant.json','game.json'])test('ROM/source round trip: '+file,()=>{
 const p=JSON.parse(fs.readFileSync(path.join(root,'p',file))),build=setup(p);
 const v=run(`(()=>{const original=dgRom.slice(),source=Forge.services.WorldRom.inspect(original).source;Forge.services.ProjectStore.load(source);const rebuilt=Forge.services.RuntimeCompiler.commit(Forge.services.RuntimeCompiler.compile());return {equal:rebuilt.length===original.length&&rebuilt.every((b,i)=>b===original[i]),screens:source.worlds[0].widthScreens,zpMax:Math.max(...Object.values(Forge.services.WorldCompiler.lastBuild.symbols).filter(v=>typeof v==='number'))};})()`);
 assert.equal(v.equal,true);assert.equal(v.screens,p.worlds[0].widthScreens);assert.ok(v.zpMax<128);return {build,...v};
});
for(const mode of ['loop','pingpong','once'])test('Controller idle far away preserves '+mode+' waypoint patrol',()=>{
 const p=structuredClone(fixture);p.worlds[0].markers[0].x=255;p.scenes[0].entities[1].ai.config.pathMode=mode;setup(p);
 const v=run(`(()=>{const z=emu._dgAiDebugSymbols,r=emu.ram,visited=[],screens=new Set();let prev=-1;for(let f=0;f<1400;f++){emuRunFrame();if(f<70)continue;screens.add(r[z.enemyScreen]);if(r[z.enemyPathIndex]!==prev){visited.push(r[z.enemyPathIndex]);prev=r[z.enemyPathIndex];}if(r[z.enemyPhase]!==0)throw Error('Far-away player interrupted patrol');}return {visited,screens:[...screens],finalIndex:r[z.enemyPathIndex],x:r[z.enemyX],y:r[z.enemyY]};})()`);
 assert.ok(v.screens.includes(1));assert.ok(v.visited.includes(2));if(mode==='once')assert.equal(v.finalIndex,2);if(mode==='pingpong')assert.ok(v.visited.join(',').includes('0,1,2,1,0'));if(mode==='loop')assert.ok(v.visited.join(',').includes('0,1,2,0'));return v;
});
test('Controller traversal still covers all sixteen screens in both directions',()=>{
 setup();const v=run(`(()=>{const z=emu._dgAiDebugSymbols,r=emu.ram,steps=[];emuKeys.ArrowRight=true;for(let f=0;f<2240;f++)emuRunFrame();delete emuKeys.ArrowRight;steps.push({screen:r[z.screen],x:r[z.playerX],camera:r[z.viewHi]*256+r[z.viewLo],frames:emu.frameCount});emuKeys.ArrowLeft=true;for(let f=0;f<2240;f++)emuRunFrame();delete emuKeys.ArrowLeft;steps.push({screen:r[z.screen],x:r[z.playerX],camera:r[z.viewHi]*256+r[z.viewLo],frames:emu.frameCount});return steps;})()`);
 assert.equal(v[0].screen,15);assert.equal(v[1].screen,0);return v;
});
const report={suite:'DigiGhosts recovery Patch 5',environment:'Node VM running shipped compiler and embedded NES emulator; DOM stub, no browser layout validation',htmlSha256:sha(fs.readFileSync(html)),passed:cases.filter(v=>v.passed).length,total:cases.length,applicationErrors:h.errors,cases};
fs.writeFileSync(process.argv[3]||path.join(__dirname,'f/runtime.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.passed+'/'+report.total+' passed; application errors: '+h.errors.length);process.exitCode=report.passed===report.total&&!h.errors.length?0:1;
