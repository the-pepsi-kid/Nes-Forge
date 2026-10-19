'use strict';
// Private-input oracle. Independent bus/harness, unmodified original routines.
// Reports contain identities/counts/digests, not game maps, code or sprites.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),api=require(root+'/app/src/re/game-re-native.js'),core=require(root+'/app/src/services/cpu6502-core.js'),index=require(root+'/app/src/re/game-re-index.js');
const directory=process.argv[2];assert.ok(directory,'Pass the private ROM directory');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function machine(rom,initialBank=0){
 const ram=new Uint8Array(32768),s={A:0,X:0,Y:0,PC:0,SP:253,C:0,Z:0,I:1,D:0,V:0,N:0,cycles:0};
 let bank=initialBank,shift=0,bits=0,instructions=0,statusReads=0;const mmc={ctrl:12,chr0:0,chr1:0,prg:bank};
 const read=a=>{a&=65535;if(a<8192)return ram[a&2047];if(a===0x2002)return statusReads++?64:0;if(a<0x6000)throw Error('Unexpected read '+a.toString(16));if(a<32768)return ram[a];return rom[16+(a<49152?bank:7)*16384+(a&16383)];};
 const write=(a,v)=>{a&=65535;v&=255;if(a<8192){ram[a&2047]=v;return;}if(a<0x6000){assert.ok([0x2000,0x2005].includes(a),'Unexpected native I/O write '+a.toString(16));return;}if(a<32768){ram[a]=v;return;}if(v&128){shift=bits=0;mmc.ctrl|=12;}else{shift|=(v&1)<<bits++;if(bits===5){const slot=(a>>13)&3;mmc[['ctrl','chr0','chr1','prg'][slot]]=shift;if(slot===3)bank=shift&7;shift=bits=0;}}};
 const cpu=core.create(s,read,write);
 function run(pc,stop=0x5fff,{a=0,x=0,y=0,bound=250000}={}){s.A=a;s.X=x;s.Y=y;s.PC=pc;s.SP=253;ram[0x1fe]=0xfe;ram[0x1ff]=0x5f;statusReads=0;const start=instructions;while(instructions-start<bound){if(s.PC===stop)return instructions-start;cpu.step();instructions++;}throw Error('Native instruction bound at '+s.PC.toString(16));}
 return {ram,s,mmc,read,run,setBank:b=>{bank=b;},get instructions(){return instructions;}};
}
const result={format:'NESForgeNativeGamePrivateVerification',version:1,htmlSha256:sha(fs.readFileSync(root+'/app/mainline/NES_Forge_2.0.0-alpha.11.html')),sources:[],limits:['Separate bus/harness uses the shared instruction implementation. This is not an independent CPU emulator or physical NES timing oracle.','Native routine agreement verifies bounded outputs and source interpretations, not complete AI, collision/physics, quest state, animation timing or game reconstruction.','Commercial inputs and decoded scene/sprite payloads are excluded.']};
for(const profile of api.profiles){
 const file=fs.readdirSync(directory).find(f=>f.endsWith('.nes')&&sha(fs.readFileSync(path.join(directory,f)))===profile.sha256);assert.ok(file,profile.id+' input missing');
 const bytes=new Uint8Array(fs.readFileSync(path.join(directory,file))),before=sha(bytes),session=api.open(bytes,file),catalog=session.catalog(),checks=[],digests=[],m=machine(bytes);
 let totalInstructions=0;
 if(profile.id==='ninja-gaiden-us'){
  let cells=0,tiles=0,columns=0,palettes=0,spawns=0,lanterns=0;
  for(const scene of catalog.scenes){
   const decoded=session.scene(scene.id),r=m.ram;digests.push(sha(Buffer.from(JSON.stringify([scene.id,decoded.cells,decoded.graphics.tiles,decoded.graphics.paletteIds]))));
   r.fill(0);r[0x6d]=scene.area;r[0x6e]=scene.room;m.run(0xf6b5);
   assert.deepEqual(Array.from(r.slice(0x703,0x713)),scene.palettes.background.flat(),scene.id+' background palette');
   assert.deepEqual(Array.from(r.slice(0x713,0x723)),scene.palettes.sprites.flat(),scene.id+' sprite palette');palettes+=8;
   r[0x42]=0;r[0x43]=(0xa000+scene.selector*1024)>>8;r[0x44]=0;r[0x45]=(0x8000+(scene.graphicsSelector&28)*256)>>8;r[0x46]=0;r[0x47]=(0xb000+scene.selector*256)>>8;
   for(let col=0;col<decoded.width;col++){
    const pointer=scene.source.cpu+Math.floor(col/2)*6;r[0x40]=pointer&255;r[0x41]=pointer>>8;r[0x6b]=(col&1)*2;r[0x6c]=0x21;m.run(0xf47e);
    for(let y=0;y<22;y++)for(let dx=0;dx<2;dx++){assert.equal(r[(dx?0x734:0x71b)+y],decoded.graphics.tiles[y*decoded.graphics.width+col*2+dx],scene.id+' column '+col+' tile '+y+':'+dx);tiles++;}columns++;
   }
   cells+=decoded.cells.length;
   m.setBank(2);const ptrs=[0x87c0,0x8820,0x8880].map(a=>m.read(a+scene.room*2)|(m.read(a+scene.room*2+1)<<8));
   for(const enemy of scene.enemies)for(const direction of [0,128]){
    r.fill(0);m.setBank(2);r[0x96]=ptrs[0]&255;r[0x97]=ptrs[0]>>8;r[0x98]=ptrs[1]&255;r[0x99]=ptrs[1]>>8;r[0x9a]=ptrs[2]&255;r[0x9b]=ptrs[2]>>8;r[4]=direction;
    m.run(0xe5b3,0x5fff,{y:enemy.id});assert.equal(r[0x400+7],enemy.type);assert.equal(r[0x480+7],enemy.y);assert.equal(r[0x460+7],direction?(-enemy.spawnScreenX)&255:enemy.spawnScreenX);spawns++;
   }
   for(const lantern of scene.lanterns){assert.equal(lantern.pickupCode,lantern.raw&15);assert.equal(lantern.y,lantern.raw&240);lanterns++;}
   // Run the original split routine with scripted status transitions. This
   // validates CHR selector values, not sprite-hit or scanline timing.
   r[0x5a]=scene.backgroundChrBank4KiB;r[0x57]=scene.spriteChrBank4KiB;m.run(0xf5a2);assert.equal(m.mmc.chr1,scene.backgroundChrBank4KiB);assert.equal(m.mmc.chr0,scene.spriteChrBank4KiB);
  }
  checks.push({name:'All room columns agree with original queue_column, including both native tile columns; visible rows only',scenes:catalog.scenes.length,nativeGroundCells:cells,columns,visibleTileQueries:tiles,status:'passed'});
  checks.push({name:'Original load_area_colors agrees with all eight initial palette groups in every room',paletteGroups:palettes,status:'passed'});
  checks.push({name:'Original place_enemy agrees with selector, height and both directional spawn X values',queries:spawns,lanternRecords:lanterns,status:'passed'});
  let scripts=0,ticks=0,frames=0;
  for(const a of catalog.animations){const player=a.owner==='player',r=m.ram;r.fill(0);if(player){r[0x80]=255;m.run(0xf62d,0x5fff,{a:a.selector});}else{r[0x428]=255;m.run(0xe254,0x5fff,{a:a.selector,x:0});}
   const delay=player?0x82:0x420,pose=player?0x83:0x438;
   for(const f of a.frames){assert.equal(r[delay],f.duration,a.id);assert.equal(r[pose],f.pose,a.id);frames++;for(let i=0;i<(f.updateTicks||f.duration);i++){m.run(player?0xe625:0xdfe9);ticks++;}}
   if(a.end==='player-return-to-idle')assert.equal(r[0x80],0);else assert.equal(r[pose],a.frames[0].pose,a.id+' restart');scripts++;
  }
  checks.push({name:'Original player/shared enemy animation readers agree with all nonempty scripts, frame delays and restart/idle markers',scripts,frames,ticks,status:'passed'});
  const draw=index[profile.id].symbols.find(s=>s[2]==='draw_sprite')[1];let pieces=0;
  for(const pose of catalog.poses){const r=m.ram;r.fill(0);m.setBank(2);r[0x30]=pose.source.cpu&255;r[0x31]=pose.source.cpu>>8;r[0x32]=pose.attributesSource.cpu&255;r[0x33]=pose.attributesSource.cpu>>8;r[0x36]=100;r[0x37]=112;r[0x3a]=pose.pieces.length;r[0x38]=1;m.run(draw);
   for(const [i,p]of pose.pieces.entries()){const slot=i%2===0?0x80+(i>>1)*4:4+(i>>1)*4;assert.equal(r[0x200+slot],(112+p.y)&255,pose.id);assert.equal(r[0x201+slot],p.tile,pose.id);assert.equal(r[0x202+slot],p.attributes,pose.id);assert.equal(r[0x203+slot],(100+p.x)&255,pose.id);pieces++;}
  }
  checks.push({name:'Original draw_sprite agrees with every decoded initial player/enemy pose and OAM piece',poses:catalog.poses.length,pieces,status:'passed'});
  totalInstructions=m.instructions;
 }else{
  let scenes=0,cells=0,tileQueries=0,unavailable=0,maxInstructions=0;const tsaCache=new Map();
  for(const scene of catalog.scenes){
   if(scene.status==='unavailable-slot'){assert.throws(()=>session.scene(scene.id),/no normal native scene/);unavailable++;continue;}
   const decoded=session.scene(scene.id),n=machine(bytes,scene.bank),r=n.ram;r[0x707]=scene.world;r[0x706]=scene.region;r[0x70a]=scene.alternate;r[0x56c]=scene.palace;
   n.run(0xcd40);r[0x561]=scene.slot;n.run(0xc4cb,0xc5fc);
   assert.equal(r[0xd4]|r[0xd5]<<8,scene.source.cpu,scene.id+' native pointer');
   for(let y=0;y<13;y++)for(let x=0;x<decoded.width;x++){assert.equal(r[0x6000+(x>>4)*208+y*16+(x&15)],decoded.cells[y*decoded.width+x],scene.id+' cell '+x+':'+y);cells++;}
   n.run(0xd05b);assert.deepEqual(Array.from(r.slice(0x305,0x325)),decoded.graphics.nativePalette,scene.id+' palette');
   for(let y=0;y<13;y++)for(let x=0;x<decoded.width;x++){
    const code=decoded.cells[y*decoded.width+x],key=scene.bank+':'+code;let quad=tsaCache.get(key);
    if(!quad){n.setBank(scene.bank);n.run(0xdfe4,0x5fff,{y:(code>>6)*2});n.run(0xc258,0x5fff,{x:0,y:(code&63)*4});n.run(0xc258,0x5fff,{x:1,y:(code&63)*4+2});quad=[r[0x53e],r[0x54c],r[0x53f],r[0x54d]];tsaCache.set(key,quad);}
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){assert.equal(decoded.graphics.tiles[(y*2+dy)*decoded.graphics.width+x*2+dx],quad[dx*2+dy]);tileQueries++;}
   }
   digests.push(sha(Buffer.from(JSON.stringify([scene.id,decoded.cells,decoded.graphics.tiles,decoded.graphics.nativePalette]))));maxInstructions=Math.max(maxInstructions,decoded.execution.instructions);totalInstructions+=n.instructions;scenes++;
  }
  checks.push({name:'Independent original CD40 + C4CB entry path agrees with all available native scene outputs and selected pointers',tableSlots:catalog.scenes.length,contexts:9,availableScenes:scenes,unavailableSlots:unavailable,cellQueries:cells,maxProductionInstructions:maxInstructions,status:'passed'});
  checks.push({name:'Original TSA group lookup / four-character reader and palette construction agree with every rendered scene tile',tileQueries,uniqueNativeTSAQueries:tsaCache.size,status:'passed'});
  let poses=0,pieces=0;
  for(const pose of catalog.poses){const n=machine(bytes,1),r=n.ram;n.run(0xcd40);r.fill(248,0x200,0x300);r[0x29]=100;r[0x4d]=100;r[0x19]=1;r[0xcc]=100;r[0x9f]=pose.facing;r[0x80]=pose.selector;n.run(0xebf0);const output=[];
   for(let slot=0;slot<64;slot++){const a=0x200+slot*4;if(r[a]<240)output.push({x:r[a+3]-100,y:r[a]-100,tile:r[a+1],attributes:r[a+2],nativeOAMSlot:slot});}
   assert.deepEqual(output,pose.pieces.map(({x,y,tile,attributes,nativeOAMSlot})=>({x,y,tile,attributes,nativeOAMSlot})),pose.id);pieces+=output.length;poses++;totalInstructions+=n.instructions;
  }
  checks.push({name:'Separate harness reproduces original Link display output for all 15 selectors in both facings; timing remains unclaimed',poses,pieces,status:'passed'});
 }
 assert.equal(sha(bytes),before);const source={profile:profile.id,sha256:before,sourceUnchanged:true,scenes:catalog.scenes.length,actorContextEntries:catalog.actors.length,poses:catalog.poses.length,scripts:catalog.animations.length,sourceLabels:catalog.symbols.length,checks,nativeInstructions:totalInstructions,decodedDigest:sha(Buffer.from(digests.join('\n')))};result.sources.push(source);console.log(profile.id,JSON.stringify(checks));
}
result.status='passed';fs.writeFileSync(path.join(__dirname,'ROM_Verification.json'),JSON.stringify(result,null,2)+'\n');
