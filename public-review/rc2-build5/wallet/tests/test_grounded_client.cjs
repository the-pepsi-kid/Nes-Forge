/* Copyright-free synthetic-only ground-alignment regression for public Forge review. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const root=process.argv[2]||path.resolve(__dirname,'../host');
const client=fs.readFileSync(path.join(root,'client.js'),'utf8');
const motion=fs.readFileSync(path.join(root,'playability.js'),'utf8');
assert(client.includes('const floorY=stageGroundY(img)'), 'Client must anchor all actors to source floor');
assert(client.includes('Math.round(floorY-36-rise)'), 'Link feet must be placed against floor');
assert(!client.includes(',151-rise,'), 'Historic floating sprite constant reintroduced');
const start=client.indexOf(' function stageGroundY(img){');
const end=client.indexOf('\n const hitEffects=',start);
assert(start>0&&end>start,'Source-ground detection implementation missing');
const chunk=client.slice(start,end);
const w=1024,h=240;
const rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=(y*w+x)*4;
 let r=112,g=114,b=228;
 if(y>=208){const major=y%4!==1;r=major?160:12;g=major?170:12;b=0;}
 else if(x<150&&y>110){r=200;g=110;b=80;}
 rgba[i]=r;rgba[i+1]=g;rgba[i+2]=b;rgba[i+3]=255;
}
const img={naturalWidth:w};
let draws=0,reads=0;
const sandbox={sourceFloors:new WeakMap(),document:{createElement:()=>({getContext:()=>({drawImage:()=>{draws++},getImageData:()=>{reads++;return {data:rgba}}})})}};
vm.runInNewContext(chunk+'\nthis.measure=stageGroundY;',sandbox);
assert.equal(sandbox.measure(img),208,'Synthetic scene should ground at y=208');
assert.equal(sandbox.measure(img),208,'Floor result must be stable across frames');
assert.equal(draws,1,'Floor detector must cache image scan');
assert.equal(reads,1,'Floor detector must not scan per frame');
assert.equal(sandbox.measure(null),208,'Missing stage uses documented fallback floor');
const motionEnv={window:{},performance:{now:()=>clock}};
let clock=0;
vm.runInNewContext(motion,motionEnv);
const smoother=motionEnv.window.ForgePlayableMotion.create(()=>clock);
const p={id:'test',mode:'sideview',area_id:'rauru',side_x:8,side_px:64,side_velocity_observed_adapter:24,side_air_px:12,side_air_next_px:9};
smoother.ingest({players:[p]});
assert.equal(smoother.sample(p).side_px,64);
clock=1000/60.0988/2;
assert(Math.abs(smoother.sample(p).side_px-64.75)<0.00001);
assert(Math.abs(smoother.sample(p).side_air_px-10.5)<0.00001);
clock+=1000;
assert(Math.abs(smoother.sample(p).side_px-65.5)<0.00001,'Prediction must stop after one source frame');
console.log(JSON.stringify({passed:true,tests:['visually-grounded-floor-208','cached-floor-detection','no-floating-constant','one-frame-bounded-prediction','next-frame-rise']},null,2));
