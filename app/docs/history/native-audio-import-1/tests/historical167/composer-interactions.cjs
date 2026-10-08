#!/usr/bin/env node
'use strict';
// Repeatable authoring event-handler checks against the complete release HTML.
// This uses the shared DOM stub: it verifies real handlers and state/history,
// not browser pointer capture, visual layout, or physical touch behavior.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {loadForge} = require('./harness.cjs');
const htmlPath = path.resolve(process.argv[2] || path.join(__dirname,'../mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const outputPath = path.resolve(process.argv[3] || path.join(__dirname,'composer-interactions-results.json'));
const h = loadForge(htmlPath);
const result = h.json(`(()=>{
  const M=Forge163.metasprites;
  M.create({name:'Drag source',pieces:[{tile:1,x:0,y:0}]});
  switchTab('metasprites');
  const initial=undoStack.length,c=document.getElementById('msCanvas163');
  const event=(type,x,y)=>({type,button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
  c.dispatchEvent(event('pointerdown',68,68));
  c.dispatchEvent(event('pointermove',96,88));
  c.dispatchEvent(event('pointermove',104,92));
  c.dispatchEvent(event('pointerup',104,92));
  const moved={x:M.current.pieces[0].x,y:M.current.pieces[0].y,undoDelta:undoStack.length-initial};
  undo();
  const restored={x:M.current.pieces[0].x,y:M.current.pieces[0].y};
  const second=makeScene({name:'Other scene'});S.scenes.push(second);
  document.getElementById('msSource163').onchange({target:{value:second.id}});
  const sourceChanged=M.current.sceneId===second.id;
  const before=JSON.stringify(S.metasprites);
  for(const t of ['sprites','chr','world','anim','scene','metasprites'])switchTab(t);
  const intact=JSON.stringify(S.metasprites)===before;
  const frame=M.current;frame.pieces[0].x=2047;
  const beforeCount=frame.pieces.length,beforeUndo=undoStack.length;
  document.getElementById('msPieceDup163').onclick();
  const duplicateRejected=frame.pieces.length===beforeCount&&undoStack.length===beforeUndo;
  frame.originX=-2048;
  const oldX=frame.pieces[0].x;
  document.getElementById('msMirrorX163').onclick();
  const mirrorRejected=frame.pieces[0].x===oldX&&undoStack.length===beforeUndo;
  frame.pieces[0].y=2047;
  const oldY=frame.originY;
  document.getElementById('msFeet163').onclick();
  const feetRejected=frame.originY===oldY&&undoStack.length===beforeUndo;
  const oldName=frame.name;
  document.getElementById('msName163').onchange({target:{value:'世'.repeat(100)}});
  const longNameRejected=frame.name===oldName&&undoStack.length===beforeUndo;
  return {moved,restored,sourceChanged,intact,duplicateRejected,mirrorRejected,feetRejected,longNameRejected};
})()`);
const checks = [
  ['Pointer movement positions the piece in source pixels',()=>assert.deepEqual({x:result.moved.x,y:result.moved.y},{x:9,y:6})],
  ['Multiple pointer moves produce exactly one undo snapshot',()=>assert.equal(result.moved.undoDelta,1)],
  ['Undo restores the dragged piece position',()=>assert.deepEqual(result.restored,{x:0,y:0})],
  ['Source-scene selector commits the selected identity',()=>assert.equal(result.sourceChanged,true)],
  ['Legacy tab roundtrip preserves the frame library',()=>assert.equal(result.intact,true)],
  ['Out-of-range piece duplication makes no edit/history entry',()=>assert.equal(result.duplicateRejected,true)],
  ['Out-of-range reflection makes no edit/history entry',()=>assert.equal(result.mirrorRejected,true)],
  ['Out-of-range feet origin makes no edit/history entry',()=>assert.equal(result.feetRejected,true)],
  ['Oversized UTF-8 name makes no edit/history entry',()=>assert.equal(result.longNameRejected,true)],
  ['Event-handler run reports no application errors',()=>assert.deepEqual(h.errors,[])],
];
const results=checks.map(([name,fn])=>{try{fn();return {name,passed:true};}catch(error){return {name,passed:false,error:error.message};}});
const report={suite:'composer-interactions',source:path.basename(htmlPath),sha256:crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'),environment:'Node.js full application VM with shared DOM stub',limitations:'Does not establish browser visual layout, real pointer capture, or physical touch behavior.',total:results.length,passed:results.filter(t=>t.passed).length,failed:results.filter(t=>!t.passed).length,results};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({suite:report.suite,total:report.total,passed:report.passed,failed:report.failed,report:outputPath}));
if(report.failed)process.exitCode=1;
