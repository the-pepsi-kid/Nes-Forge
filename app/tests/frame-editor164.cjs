#!/usr/bin/env node
'use strict';
// Real handlers and model transitions inside the complete release VM.
// Does not establish canvas appearance, pointer capture, or touch behavior.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {loadForge}=require('./harness.cjs');
const htmlPath=path.resolve(process.argv[2]||path.join(__dirname,'../mainline/NES_Forge_1.8_Audio_Runtime.html'));
const outputPath=path.resolve(process.argv[3]||path.join(__dirname,'frame-editor164-results.json'));
const h=loadForge(htmlPath),results=[];
function test(name,source,expected=true){try{assert.deepEqual(h.json(source),expected);results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
h.run(`S.animations=[{name:'Contact handler fixture',state:'attack',frames:[{tileIdx:0,duration:5},{tileIdx:1,duration:7}],loop:true}]; S._selAnim=0;S._animFrame=0; S.tab='anim'; Forge164.model.ensure(); Forge164.frameEditor.refresh();
var FE=Forge164.frameEditor, FM=Forge164.model, fc=document.getElementById('cv');
var box=FE.addBox('hurtboxes',{name:'Body',x:-4,y:-8,w:8,h:12}); FE.refresh();
function feEvent(type,x,y,id=42){const v=FE.state.view;return {type,button:0,pointerId:id,clientX:v.anchorX+(x+.1)*v.scale,clientY:v.anchorY+(y+.1)*v.scale,preventDefault(){},stopPropagation(){}};}
function feDispatch(type,x,y){fc.dispatchEvent(feEvent(type,x,y));}
`);
test('Overlay converts display positions into origin-relative pixels',`(()=>{const v=FE.state.view;return FE.pointFromCanvas(v.anchorX-3*v.scale,v.anchorY+5*v.scale)})()`,{x:-3,y:5});
test('Repeated refresh preserves selected area identity',`(()=>{const id=FE.state.boxId;FE.refresh();FE.refresh();return FE.state.boxId===id})()`);
test('Pointer drag previews without editing live data or adding history',`(()=>{globalThis.feBefore=undoStack.length;feDispatch('pointerdown',0,-2);feDispatch('pointermove',3,2);feDispatch('pointermove',5,4);return box.x===-4&&box.y===-8&&undoStack.length===feBefore&&FE.state.drag.box.x===1&&FE.state.drag.box.y===-2})()`);
test('Pointer release commits origin-relative movement with one undo entry',`(()=>{feDispatch('pointerup',5,4);return box.x===1&&box.y===-2&&undoStack.length===feBefore+1&&!FE.state.drag})()`);
test('Clicking an area without movement creates no undo entry',`(()=>{const n=undoStack.length;feDispatch('pointerdown',3,0);feDispatch('pointerup',3,0);return undoStack.length===n})()`);
test('Resize handle changes dimensions and creates one undo entry',`(()=>{const n=undoStack.length;feDispatch('pointerdown',9,10);feDispatch('pointermove',12,15);feDispatch('pointerup',12,15);return box.w===11&&box.h===17&&undoStack.length===n+1})()`);
test('Pointer cancellation drops the preview without history or data edits',`(()=>{const before=JSON.stringify(box),n=undoStack.length;feDispatch('pointerdown',4,2);feDispatch('pointermove',30,30);fc.dispatchEvent(feEvent('pointercancel',30,30));return JSON.stringify(box)===before&&undoStack.length===n&&!FE.state.drag})()`);
test('Escape cancels a draw without creating an area',`(()=>{FE.setTool('hitboxes');const n=undoStack.length,count=FE.current().frame.hitboxes.length;feDispatch('pointerdown',-10,-10);feDispatch('pointermove',0,0);fc.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){},stopPropagation(){}});return FE.current().frame.hitboxes.length===count&&undoStack.length===n&&!FE.state.drag&&FE.state.tool==='select'})()`);
test('Draw tool creates an inclusive rectangle even dragging up and left',`(()=>{FE.setTool('hitboxes');const n=undoStack.length;feDispatch('pointerdown',8,5);feDispatch('pointermove',2,-3);feDispatch('pointerup',2,-3);const b=FE.selectedBox();return b.x===2&&b.y===-3&&b.w===7&&b.h===9&&FE.state.kind==='hitboxes'&&undoStack.length===n+1&&FE.state.tool==='select'})()`);
test('Numeric coordinate handler edits the selected area',`(()=>{document.getElementById('feBoxX164').onchange({target:{value:'-25'}});return FE.selectedBox().x===-25})()`);
test('Invalid width handler rejects before history and restores field value',`(()=>{const b=FE.selectedBox(),n=undoStack.length;document.getElementById('feBoxW164').onchange({target:{value:'0'}});return b.w===7&&undoStack.length===n&&document.getElementById('feBoxW164').value==='7'})()`);
test('Empty numeric field cannot silently become zero',`(()=>{const b=FE.selectedBox(),n=undoStack.length;document.getElementById('feBoxX164').onchange({target:{value:''}});return b.x===-25&&undoStack.length===n})()`);
test('Shift-arrow keyboard nudge moves eight pixels',`(()=>{fc.dispatchEvent({type:'keydown',key:'ArrowRight',shiftKey:true,preventDefault(){},stopPropagation(){}});return FE.selectedBox().x===-17})()`);
test('Frame changes cancel pending drag and leave previous frame intact',`(()=>{FE.setTool('select');FE.selectBox('hurtboxes',box.id);const before=JSON.stringify(box),n=undoStack.length;FE.beginDrag({x:4,y:2});FE.updateDrag({x:8,y:5});S._animFrame=1;FE.refresh();return JSON.stringify(box)===before&&undoStack.length===n&&!FE.state.drag})()`);
test('New frames start with independent empty contact/event lists',`(()=>{const f=FE.current().frame;return f.hitboxes.length===0&&f.hurtboxes.length===0&&f.events.length===0})()`);
test('Return to edited frame retains its authored areas',`(()=>{S._animFrame=0;FE.refresh();return FE.current().frame.hitboxes.length===1&&FE.current().frame.hurtboxes.length===1})()`);
test('Area deletion is scoped to the selected kind and identity',`(()=>{FE.selectBox('hitboxes',FE.current().frame.hitboxes[0].id);FE.removeBox();FE.refresh();return FE.current().frame.hitboxes.length===0&&FE.current().frame.hurtboxes.length===1})()`);
test('Add event assigns the requested type and selects its identity',`(()=>{const e=FE.addEvent('attack_start');FE.refresh();return e.type==='attack_start'&&FE.state.eventId===e.id})()`);
test('Event inspector edits names and payloads without interpretation',`(()=>{document.getElementById('feEventName164').onchange({target:{value:'Contact opens'}});document.getElementById('feEventValue164').onchange({target:{value:'<script>literal payload</script>'}});return FE.selectedEvent().name==='Contact opens'&&FE.selectedEvent().value==='<script>literal payload</script>'})()`);
test('Event order changes preserve selected event and unrelated values',`(()=>{const first=FE.selectedEvent().id;const e=FE.addEvent('sound');FE.refresh();FE.moveEvent(-1);FE.refresh();return FE.current().frame.events[0].id===e.id&&FE.current().frame.events[1].id===first&&FE.state.eventId===e.id})()`);
test('Moving first event earlier is a no-op with no history',`(()=>{const n=undoStack.length;return FE.moveEvent(-1)===false&&undoStack.length===n})()`);
test('Event type selector applies a supported marker type',`(()=>{document.getElementById('feEventType164').onchange({target:{value:'footstep'}});return FE.selectedEvent().type==='footstep'})()`);
test('Event deletion retains the other ordered marker',`(()=>{FE.removeEvent();FE.refresh();return FE.current().frame.events.length===1&&FE.selectedEvent().type==='attack_start'})()`);
test('Drawing clamps dimensions and starting coordinates to schema limits',`FE.rectangle({x:-9999,y:-9999},{x:9999,y:9999})`,{x:-2048,y:-2048,w:2048,h:2048});
test('Changing tools stops legacy animation preview',`(()=>{_animTimer=123;FE.setTool('hurtboxes');return _animTimer===null})()`);
test('Focusing authoring controls stops preview before editing',`(()=>{_animTimer=123;document.getElementById('frameEditor164').dispatchEvent({type:'focusin'});return _animTimer===null})()`);
test('Undo cancels drag when frame identity changes at the same animation ID and index',`(()=>{FE.setTool('select');const frame=FE.current().frame,animationId=FE.current().animation.id,index=FE.current().frameIndex,b=frame.hurtboxes[0];FE.selectBox('hurtboxes',b.id);FE.updateSelectedBox({name:'Undo drag fixture'});FE.refresh();const p={x:b.x+2,y:b.y+2};if(!FE.beginDrag(p))return false;FE.updateDrag({x:p.x+5,y:p.y+5});if(!FE.state.drag)return false;undo();const c=FE.current();return c.animation.id===animationId&&c.frameIndex===index&&c.frame!==frame&&!FE.state.drag&&FE.selectedBox()===c.frame.hurtboxes[0]})()`);
const report={suite:'frame-editor164',source:path.basename(htmlPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'),environment:'Node.js full application VM with shared DOM stub',limitations:'Checks handlers, coordinates, selection, and state/history transitions; does not establish visual layout, pointer capture, or physical touch behavior.',total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
