/* NES Forge v0.15 — RE gameplay recovery workbench core.
 * Source evidence analysis ONLY; no promotion to Gameplay Core/hosted simulation.
 * Project-agnostic input contract, Zelda II v1 RAM interpretation profile.
 */
(()=>{'use strict';
const F=window.Forge=window.Forge||{};F.services=F.services||{};
const MAX_FRAMES=12000, MAX_JSON_BYTES=5000000;
const ramFields=Object.freeze({pose:'$0080',facing:'$009F',sword:'$0400',jump:'$0479',x:'$004D/$003B',y:'$0029',scene:'$0561',contact:'$00A7'});
const rowKeys=['frame','input','pose','facing','sword','jump','x','y','scene','worldContext'];
const mustInt=(v,min,max,name)=>{if(!Number.isInteger(v)||v<min||v>max)throw Error('Invalid '+name);return v;};
function validate(input){
 if(typeof input==='string'){
   if(input.length>MAX_JSON_BYTES)throw Error('Trace exceeds 5 MB');
   input=JSON.parse(input);
 }
 if(!input||typeof input!=='object'||Array.isArray(input)||input.format!=='nesforge.native-gameplay-observation'||input.version!==1)throw Error('Not a NES Forge native gameplay observation v1');
 if(input.profile!=='zelda2-us')throw Error('No interpretation profile available for this ROM. This workbench currently supports zelda2-us traces only.');
 if(!Array.isArray(input.frames)||input.frames.length<2||input.frames.length>MAX_FRAMES)throw Error('Trace must have 2–12,000 frames');
 if(input.frameCount!==input.frames.length)throw Error('Trace frame count disagrees with data');
 let last=null;
 const frames=input.frames.map((r,i)=>{
   if(!r||typeof r!=='object')throw Error('Invalid frame record '+i);
   for(const k of rowKeys)mustInt(r[k],0,k==='x'?65535:k==='frame'?2147483647:255,'frame '+i+' '+k);
   if(last!==null&&r.frame!==last+1)throw Error('Trace has skipped or duplicate frame at '+i+'; use continuous capture');
   last=r.frame;
   // Whitelist fields: never import arbitrary objects, project data or attacker-defined code.
   return Object.freeze({frame:r.frame,input:r.input,pose:r.pose,facing:r.facing,sword:r.sword,jump:r.jump,x:r.x,y:r.y,
     scene:r.scene,worldContext:r.worldContext,velocityX:Number.isInteger(r.velocityX)?r.velocityX:null,
     velocityY:Number.isInteger(r.velocityY)?r.velocityY:null,contact:Number.isInteger(r.contact)?r.contact:null});
 });
 const marks=Array.isArray(input.marks)?input.marks.filter(x=>x&&Number.isInteger(x.frame)&&typeof x.observedActivity==='string').slice(0,128).map(x=>({frame:x.frame,observedActivity:x.observedActivity,annotationOnly:true})):[];
 return Object.freeze({format:'nesforge.native-gameplay-observation',version:1,frameCount:frames.length,sourceLabel:String(input.sourceLabel||'Unlabeled emulator session').slice(0,160),profile:input.profile,frames,marks,sourceHash:typeof input.sourceSha256==='string'&&/^[a-f\d]{64}$/i.test(input.sourceSha256)?input.sourceSha256.toLowerCase():null});
}
const median=arr=>{if(!arr.length)return null;const a=[...arr].sort((a,b)=>a-b);return (a[(a.length-1)>>1]+a[a.length>>1])/2;};
const counts=list=>{const o={};for(const n of list)o[n]=(o[n]||0)+1;return o;};
const distinctTransitions=arr=>arr.filter((x,i)=>!i||x!==arr[i-1]);
function episodes(rows,predicate,minLen=1){const output=[];let start=-1;
 for(let i=0;i<=rows.length;i++){
   const on=i<rows.length&&predicate(rows[i],i);
   if(on&&start<0)start=i;
   if(start>=0&&!on){if(i-start>=minLen)output.push({startIndex:start,endIndex:i-1,startFrame:rows[start].frame,endFrame:rows[i-1].frame,duration:i-start});start=-1;}
 }
 return output;
}
const at=(rows,e)=>rows.slice(e.startIndex,e.endIndex+1);
function analyze(trace){const t=validate(trace),f=t.frames;
 // Stay within a single source scene: a room-loading frame cannot prove walking or sword rules.
 const sceneBlocks=episodes(f,()=>true).length?[]:[];
 let st=0;for(let i=1;i<=f.length;i++){if(i===f.length||f[i].scene!==f[st].scene||f[i].worldContext!==f[st].worldContext){sceneBlocks.push({scene:f[st].scene,worldContext:f[st].worldContext,startFrame:f[st].frame,endFrame:f[i-1].frame,count:i-st});st=i;}}
 const sword=episodes(f,r=>r.sword>0).map(e=>{
   const rows=at(f,e);return {...e,scene:rows[0].scene,states:distinctTransitions(rows.map(x=>x.sword)),poses:distinctTransitions(rows.map(x=>x.pose)),jumpOverlap:rows.some(x=>x.jump>0),direction:rows[0].facing,
     stateDurations:Object.entries(counts(rows.map(x=>x.sword))).map(([state,frames])=>({state:Number(state),frames}))};
 });
 const jump=episodes(f,r=>r.jump>0).map(e=>{const rows=at(f,e);return {...e,scene:rows[0].scene,states:distinctTransitions(rows.map(x=>x.jump)),poses:distinctTransitions(rows.map(x=>x.pose)),swordOverlap:rows.some(x=>x.sword>0)};});
 const walks=episodes(f,r=>((r.input&0xc0)===64||(r.input&0xc0)===128)&&r.jump===0&&r.sword===0,6)
   .filter(e=>{const rows=at(f,e);return rows.every(r=>r.scene===rows[0].scene&&r.worldContext===rows[0].worldContext&&(r.input&0xc0)===(rows[0].input&0xc0));})
   .map(e=>{const rows=at(f,e);const poseChanges=rows.filter((r,i)=>i===0||r.pose!==rows[i-1].pose);
     const intervals=poseChanges.slice(1).map((r,i)=>r.frame-poseChanges[i].frame).filter(n=>n>0&&n<=60);
     return {...e,scene:rows[0].scene,direction:(rows[0].input&64)?'right':'left',poses:distinctTransitions(rows.map(r=>r.pose)),typicalPoseFrames:median(intervals),positionDelta:rows[rows.length-1].x-rows[0].x,poseChanges:poseChanges.length};});
 const idle=episodes(f,r=>(r.input&0xc0)===0&&r.sword===0&&r.jump===0,8).map(e=>({...e,scene:f[e.startIndex].scene,poses:counts(at(f,e).map(x=>x.pose))}));
 const sceneCounts=counts(f.map(x=>x.scene));const swordFull=sword.filter(e=>[1,2,3,4].every(n=>e.states.includes(n))&&e.states.indexOf(1)<e.states.indexOf(4));
 const walkSimple=walks.filter(e=>e.poses.length>=3&&e.poses.includes(0)&&e.poses.includes(1)&&e.poses.includes(2));
 const sustainedJump=jump.filter(e=>e.duration>=8&&e.states.includes(2));
 const typicalWalk=median(walkSimple.map(e=>e.typicalPoseFrames).filter(v=>v!==null));
 const typicalSword=median(swordFull.map(e=>e.duration));
 const typicalJump=median(sustainedJump.map(e=>e.duration));
 const candidates=[
 {id:'z2.walk',label:'Directional walking poses',status:walkSimple.length>=2?'observed':'insufficient-evidence',evidenceCount:walkSimple.length,exampleFrames:walkSimple.slice(0,6).map(e=>[e.startFrame,e.endFrame]),candidate:{poses:[0,1,2],medianPoseDurationFrames:typicalWalk},limitations:['Timing changes with context; this is a sampled median, not an engine animation timer.','Movement acceleration and original collision remain unverified.']},
 {id:'z2.jump',label:'Airborne pose and jump state',status:sustainedJump.length>=2?'observed':'insufficient-evidence',evidenceCount:sustainedJump.length,exampleFrames:sustainedJump.slice(0,6).map(e=>[e.startFrame,e.endFrame]),candidate:{observedPose:6,observedJumpState:2,medianObservedDurationFrames:typicalJump},limitations:['Some jump frames display poses other than 6.','Jump velocity, gravity, collision, and landing are not established by this trace.']},
 {id:'z2.sword',label:'Sword-action phases and poses',status:swordFull.length>=2?'observed':'insufficient-evidence',evidenceCount:swordFull.length,exampleFrames:swordFull.slice(0,6).map(e=>[e.startFrame,e.endFrame]),candidate:{observedSwordStateSequence:[1,2,3,4],observedActionPoses:[4,5],medianObservedDurationFrames:typicalSword},limitations:['The sprite selector may interleave standing/jumping frames.','No sword collision volumes, damage results, blocking or multiplayer validation.']},
 {id:'z2.idle',label:'Stationary pose correlation',status:idle.length>=2?'observed':'insufficient-evidence',evidenceCount:idle.length,exampleFrames:idle.slice(0,6).map(e=>[e.startFrame,e.endFrame]),candidate:{poseCounts:counts(idle.flatMap(e=>at(f,e).map(x=>x.pose)))},limitations:['No directional input does not prove Link is idle; menus, forced motion, and transitions may contaminate observations.']}
 ];
 // Missing actions are first-class recovery targets, not silently inferred from unrelated sword poses.
 // NES input buttons: A=1, B=2, Select=4, Start=8, Up=16, Down=32, Left=64, Right=128.
 // Combinations are observations only: up+B or down+B do not prove an up/down sword mechanic.
 const chordCounts={upAttack:f.filter(r=>(r.input&18)===18).length,downAttack:f.filter(r=>(r.input&34)===34).length,
   downOnly:f.filter(r=>(r.input&32)===32).length};
 const poseCounts=counts(f.map(r=>r.pose));
 const anyContact=f.some(r=>r.contact!==null);
 const coverage=[
  {id:'actor.link-sprite',name:'Original Link graphics / pose selectors',group:'Graphics',status:'partial-source-recovery',evidence:'Original 30-pose atlas separately recovered in Forge; this trace observed pose selectors '+Object.keys(poseCounts).join(', ')+'.',next:'Validate every visible pose against live emulator OAM and sprite palette.'},
  {id:'actor.metasprite',name:'Metasprite parts and animation mapping',group:'Graphics',status:'unverified',evidence:'Pose numbers and OAM reconstruction exist; no complete timed canonical metasprite animation has been accepted.',next:'Inspect OAM tile/palette/flip ordering per frame and verify timed groups.'},
  {id:'action.walk',name:'Walking / facing',group:'Animation',status:walkSimple.length>=2?'observed':'insufficient-evidence',evidence:walkSimple.length+' stable directional windows; median pose interval '+String(typicalWalk)+' frames.',next:'Cross-check stationary-to-walk transitions and horizontal speed against emulator.'},
  {id:'action.jump',name:'Jump / land',group:'Animation',status:sustainedJump.length>=2?'observed':'insufficient-evidence',evidence:sustainedJump.length+' sustained jump-state windows.',next:'Trace Y position and velocity with grounded/airborne collision changes.'},
  {id:'action.sword',name:'Sword action (orientation unresolved)',group:'Combat',status:swordFull.length>=2?'observed':'insufficient-evidence',evidence:swordFull.length+' complete 1→2→3→4 sword state episodes.',next:'Correlate OAM, attack directions, hitboxes and hit events.'},
  {id:'action.upstab',name:'Upward stab',group:'Combat',status:'needs-targeted-evidence',evidence:chordCounts.upAttack+' input frames with Up+B; this does NOT establish the upward stab, unlock conditions or resulting attack direction.',next:'Record dedicated Up+B standing and airborne actions where the original game permits them; inspect sword geometry and attacks.'},
  {id:'action.downstab',name:'Downward stab',group:'Combat',status:'needs-targeted-evidence',evidence:chordCounts.downAttack+' input frames with Down+B; this does NOT establish downward stab or its ability prerequisites.',next:'Record dedicated downward attack during a jump after learning the original ability; observe collision on landing.'},
  {id:'action.duck',name:'Crouch / crouch stab',group:'Combat',status:'needs-targeted-evidence',evidence:chordCounts.downOnly+' Down-input frames, not proven duck poses.',next:'Record separate duck and duck+B actions, compare OAM and sword state.'},
  {id:'actor.hurt',name:'Hit reaction, knockback, death',group:'Combat',status:'unverified',evidence:'No authoritative target damage/hit confirmation in this trace.',next:'Trace HP, knockback velocities, invulnerability and object collision alongside emulator frames.'},
  {id:'collision.world',name:'Ground / platform / wall collision',group:'Collision',status:'unverified',evidence:anyContact?'Contact RAM value sampled, but its bit semantics and tile geometry are unverified.':'No contact RAM evidence.',next:'Instrument real collision routine with tile indices, contact flags and deterministic collision tests.'},
  {id:'collision.sword',name:'Sword / shield / enemy hitboxes',group:'Collision',status:'unverified',evidence:'State observations do not contain hitbox coordinates or damage events.',next:'Capture original overlap decisions, damage calculation and shield rejection.'},
  {id:'actors.enemies-npcs',name:'NPC, enemy and boss behavior',group:'Actors',status:'unverified',evidence:'This trace follows Link only.',next:'Use existing RE enemy parameter and dispatch tables; validate actor-specific states and active OAM.'},
  {id:'world.transitions',name:'Town, cave and palace exits',group:'World',status:'unverified',evidence:'Scene RAM values do not independently establish correct room/entrance bindings.',next:'Correlate scene change RAM with known native location records and return coordinates.'},
  {id:'magic.spells',name:'Original spells and item interactions',group:'Mechanics',status:'unverified',evidence:'No isolated spell casts, cost decrements, or effect-state samples.',next:'Record and correlate spell flags, item prerequisites, effects and MP changes.'},
 ];
 const report={format:'nesforge.re-gameplay-recovery-evidence',version:1,source:{profile:t.profile,label:t.sourceLabel,sha256:t.sourceHash},frameRange:[f[0].frame,f[f.length-1].frame],frameCount:f.length,sceneCounts,sceneBlocks,coverage,poseCounts,inputChordCounts:chordCounts,
   stats:{walkWindows:walks.length,walkCycles:walkSimple.length,swordActions:sword.length,completeSwordStateSequences:swordFull.length,jumpWindows:jump.length,sustainedJumps:sustainedJump.length,idleWindows:idle.length},
   candidates,episodes:{walk:walks,sword,jump,idle},marks:t.marks,
   caveats:['Observed correlations only. No verified state-machine transitions, collision, hitboxes, damage, or server gameplay authority.',
    'The imported trace does not include the original ROM fingerprint; it cannot verify compatibility with a later ROM or revision.' ,
    'Source scene IDs are source RAM observations, not confirmed town/cave/overworld entrance identities.',
    'No Gameplay Core project mutation, native code patching or hosted runtime promotion occurs.',
    'Upward/downward stab, crouch, collisions, enemies, and spells are coverage gaps; input chords are not proofs of these actions.'],
   runtimeEligibility:'blocked-unverified',proposedAdapter:'zelda2-us',ramEvidence:ramFields};
 return Object.freeze(report);
}
function compare(a,b){const A=analyze(a),B=analyze(b);
 const metrics=['walkCycles','completeSwordStateSequences','sustainedJumps'];
 return {format:'nesforge.re-gameplay-trace-comparison',version:1,sourceA:A.source,sourceB:B.source,
   checks:metrics.map(key=>({metric:key,a:A.stats[key],b:B.stats[key],note:'Counts compare observations, not game-state equivalence.'})),
   poseFrameMedians:A.candidates.map((c,i)=>({action:c.id,a:c.candidate.medianPoseDurationFrames??c.candidate.medianObservedDurationFrames??null,b:B.candidates[i].candidate.medianPoseDurationFrames??B.candidates[i].candidate.medianObservedDurationFrames??null})),
   limitations:['Different input sequences, areas, scene boundaries, and game state make metrics incomparable as frame-for-frame parity.','Replay equivalence needs identical emulator checkpoint and input sequence.']};
}
F.services.REGameplayRecovery=Object.freeze({validate,analyze,compare,ramFields});
})();
