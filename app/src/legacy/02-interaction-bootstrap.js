const DASM_OPS=['BRK','ORA','???','???','???','ORA','ASL','???','PHP','ORA','ASL','???','???','ORA','ASL','???','BPL','ORA','???','???','???','ORA','ASL','???','CLC','ORA','???','???','???','ORA','ASL','???','JSR','AND','???','???','BIT','AND','ROL','???','PLP','AND','ROL','???','BIT','AND','ROL','???','BMI','AND','???','???','???','AND','ROL','???','SEC','AND','???','???','???','AND','ROL','???','RTI','EOR','???','???','???','EOR','LSR','???','PHA','EOR','LSR','???','JMP','EOR','LSR','???','BVC','EOR','???','???','???','EOR','LSR','???','CLI','EOR','???','???','???','EOR','LSR','???','RTS','ADC','???','???','???','ADC','ROR','???','PLA','ADC','ROR','???','JMP','ADC','ROR','???','BVS','ADC','???','???','???','ADC','ROR','???','SEI','ADC','???','???','???','ADC','ROR','???','???','STA','???','???','STY','STA','STX','???','DEY','???','TXA','???','STY','STA','STX','???','BCC','STA','???','???','STY','STA','STX','???','TYA','STA','TXS','???','???','STA','???','???','LDY','LDA','LDX','???','LDY','LDA','LDX','???','TAY','LDA','TAX','???','LDY','LDA','LDX','???','BCS','LDA','???','???','LDY','LDA','LDX','???','CLV','LDA','TSX','???','LDY','LDA','LDX','???','CPY','CMP','???','???','CPY','CMP','DEC','???','INY','CMP','DEX','???','CPY','CMP','DEC','???','BNE','CMP','???','???','???','CMP','DEC','???','CLD','CMP','???','???','???','CMP','DEC','???','CPX','SBC','???','???','CPX','SBC','INC','???','INX','SBC','NOP','???','CPX','SBC','INC','???','BEQ','SBC','???','???','???','SBC','INC','???','SED','SBC','???','???','???','SBC','INC','???'];
const DASM_MODES=[1,7,0,0,0,3,3,0,1,2,1,0,0,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0,5,7,0,0,3,3,3,0,1,2,1,0,5,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0,1,7,0,0,0,3,3,0,1,2,1,0,5,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0,1,7,0,0,0,3,3,0,1,2,1,0,10,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0,0,7,0,0,3,3,3,0,1,0,1,0,5,5,5,0,9,8,0,0,4,4,4,0,1,6,1,0,0,6,0,0,2,7,2,0,3,3,3,0,1,2,1,0,5,5,5,0,9,8,0,0,4,4,4,0,1,6,1,0,6,6,6,0,2,7,0,0,3,3,3,0,1,2,1,0,5,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0,2,7,0,0,3,3,3,0,1,2,1,0,5,5,5,0,9,8,0,0,0,4,4,0,1,6,0,0,0,6,6,0];
// Modes: 0=implied,1=implied,2=imm,3=zp,4=zpx,5=abs,6=abx,7=izx,8=izy,9=rel,10=ind
const DASM_SIZES=[1,1,2,2,2,3,3,2,2,2,3];
const HW_REGS={0x2000:'PPUCTRL',0x2001:'PPUMASK',0x2002:'PPUSTATUS',0x2003:'OAMADDR',0x2004:'OAMDATA',0x2005:'PPUSCROLL',0x2006:'PPUADDR',0x2007:'PPUDATA',0x4000:'SQ1_VOL',0x4001:'SQ1_SWEEP',0x4002:'SQ1_LO',0x4003:'SQ1_HI',0x4004:'SQ2_VOL',0x4005:'SQ2_SWEEP',0x4006:'SQ2_LO',0x4007:'SQ2_HI',0x4008:'TRI_LINEAR',0x400A:'TRI_LO',0x400B:'TRI_HI',0x400C:'NOISE_VOL',0x400E:'NOISE_LO',0x400F:'NOISE_HI',0x4010:'DMC_FREQ',0x4011:'DMC_RAW',0x4012:'DMC_START',0x4013:'DMC_LEN',0x4014:'OAM_DMA',0x4015:'APU_STATUS',0x4016:'JOY1',0x4017:'JOY2'};

let disasm_output='';
let disasm_labels={};
let disasm_asmText='';

function disasm_one(prg,off,addr){const op=prg[off],entry=Object.entries(asm_OP).find(([,value])=>value===op),hx=(v,n=2)=>'$'+v.toString(16).toUpperCase().padStart(n,'0');if(!entry)return {asm:'.byte '+hx(op||0),size:1,mnem:'.byte',mode:'DATA',operand:hx(op||0)};const [mnem,mode]=entry[0].split('_'),size=AM_SZ[AM[mode]];if(off+size>prg.length)return {asm:'.byte '+hx(op),size:1,mnem:'.byte',mode:'DATA',operand:hx(op)};const b=prg[off+1]||0,w=b|((prg[off+2]||0)<<8);let operand='';if(mode==='ACC')operand='A';if(mode==='IMM')operand='#'+hx(b);if(mode==='ZP')operand=hx(b);if(mode==='ZPX')operand=hx(b)+',X';if(mode==='ZPY')operand=hx(b)+',Y';if(mode==='ABS')operand='a:'+hx(w,4);if(mode==='ABX')operand='a:'+hx(w,4)+',X';if(mode==='ABY')operand='a:'+hx(w,4)+',Y';if(mode==='IND')operand='('+hx(w,4)+')';if(mode==='IZX')operand='('+hx(b)+',X)';if(mode==='IZY')operand='('+hx(b)+'),Y';if(mode==='REL')operand=hx((addr+2+(b>127?b-256:b))&65535,4);return {asm:mnem+(operand?' '+operand:''),size,mnem,mode,operand};}

function disasm_run(){if(!emu.loaded)return;const base=emu.mapper===0&&emu.prgSize===16384?0xC000:0x8000;const data=Uint8Array.from({length:65536-base},(_,i)=>cpuRead(base+i));const vec=a=>data[a-base]|data[a-base+1]<<8;const reset=vec(0xFFFC),nmi=vec(0xFFFA),irq=vec(0xFFFE),labels={};for(const [a,name]of [[reset,'RESET'],[nmi,'NMI'],[irq,'IRQ']])if(a>=base&&!labels[a])labels[a]=name;const code=new Set(),queue=[reset,nmi,irq];while(queue.length){let pc=queue.pop();while(pc>=base&&pc<0xFFFA&&!code.has(pc)){code.add(pc);const inf=disasm_one(data,pc-base,pc);if(inf.mnem==='.byte')break;const target=data[pc-base+1]|(data[pc-base+2]<<8);if(inf.mnem==='JSR')queue.push(target);if(inf.mode==='REL'){const b=data[pc-base+1];queue.push(pc+2+(b>127?b-256:b));}if(inf.mnem==='JMP'){if(inf.mode==='ABS')queue.push(target);break;}if(['RTI','RTS','BRK'].includes(inf.mnem))break;pc+=inf.size;}}
  let text='; NES Forge current CPU mapping, not the entire bank-switched cartridge\n; Mapper '+emu.mapper+'; disable scene packing to rebuild this window\n.org $'+base.toString(16).toUpperCase()+'\n';let off=0,count=0,codeBytes=0;while(off<data.length){const addr=base+off;if(labels[addr])text+='\n'+labels[addr]+':\n';if(code.has(addr)){const inf=disasm_one(data,off,addr);text+='  '+inf.asm+'\n';off+=inf.size;count++;codeBytes+=inf.size;}else{let end=Math.min(off+16,data.length);for(let j=off+1;j<end;j++)if(code.has(base+j)||labels[base+j]){end=j;break;}text+='  .byte '+Array.from(data.slice(off,end),b=>'$'+b.toString(16).toUpperCase().padStart(2,'0')).join(',')+'\n';off=end;}}
  disasm_asmText=text;disasm_output=esc(text);disasm_labels=labels;document.getElementById('disasmCode').textContent=text;document.getElementById('disasmInfo').textContent='Mapped CPU window $'+base.toString(16).toUpperCase()+'–$FFFF • mapper '+emu.mapper+' • '+data.length+' bytes';document.getElementById('disasmVecs').textContent='NMI $'+nmi.toString(16)+' / RESET $'+reset.toString(16)+' / IRQ $'+irq.toString(16);for(const [id,value]of Object.entries({dCodeBytes:codeBytes,dDataBytes:data.length-codeBytes,dInstCount:count,dLabelCount:Object.keys(labels).length,dSubCount:0,disasmLblCount:Object.keys(labels).length}))document.getElementById(id).textContent=value;document.getElementById('disasmLabels').textContent=Object.entries(labels).map(([a,n])=>n+': $'+Number(a).toString(16)).join('\n');return text;}
function disasm_copyAsm(){if(!disasm_asmText)return;if(S.asmSource.trim()&&!confirm('Replace code with this disassembly?'))return;document.getElementById('codeInput').value=disasm_asmText;S.asmSource=disasm_asmText;S.packScenes=false;document.getElementById('cfgPackScenes').checked=false;code_syncHighlight();switchTab('code');showToast('Copied mapped disassembly; scene packing disabled');}
function disasm_exportAsm(){
  if(!disasm_asmText)return;
  const blob=new Blob([disasm_asmText],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='disasm.asm';a.click();
}

// v8: CACHE CLEANUP
// ═══════════════════════════════════════════════
function cleanCache(){if(!confirm('Clear the autosave recovery copy and stop temporary audio?\nYour open workspace and saved projects will NOT be deleted.'))return;try{localStorage.removeItem(AUTOSAVE_KEY);}catch(e){}recoveryPending=false;document.getElementById('autosaveBanner').classList.remove('show');aud_stop();emuPause();if(aud_ctx){aud_ctx.close().catch(()=>{});aud_ctx=null;aud_channels=[null,null,null,null,null];aud_gains=[null,null,null,null,null];aud_masterGain=null;aud_noiseBuffer=null;}showToast('Temporary data cleared. Saved projects preserved.');}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
// Centralized input routing: text fields keep native keyboard behavior.
document.addEventListener('keydown',e=>{
  if(inputTarget(e))return;
  const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod){if(key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(key==='y'){e.preventDefault();redo();return;}if(key==='s'){e.preventDefault();project_export();return;}if(['scene','chr','sprites','collision'].includes(S.tab)&&!(window.getSelection()?.toString())){if(key==='c'){e.preventDefault();copyTile();return;}if(key==='v'){e.preventDefault();pasteTile();return;}}return;}
  if(e.key==='Escape'){closePicker();S.entPlaceTool=null;ent_buildToolbar();return;}
  if(S.tab==='emu'){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyX','KeyA','KeyS','ShiftLeft','ShiftRight','Enter'].includes(e.code)){e.preventDefault();emuKeys[e.code]=true;}return;}
  if(S.tab==='chr'){const n=Number(e.key);if(n>=1&&n<=4){S.selPixColor=n-1;updateCHREditor();return;}const delta={ArrowRight:1,ArrowLeft:-1,ArrowUp:-16,ArrowDown:16}[e.key];if(delta){e.preventDefault();S.editTile=S.selTile=clamp(S.editTile+delta,0,255);render();}}
  if(S.tab==='sprites'){const n=Number(e.key);if(n>=1&&n<=4){sprPixColor=n-1;updateSprPixelEditor();return;}const s=S.oam[S.selSprite];if(s&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();snapshot();const step=e.shiftKey?8:1;s.x=clamp(s.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),0,255);s.y=clamp(s.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),0,239);notify('spriteMove');}if(s&&['Delete','Backspace'].includes(e.key)){e.preventDefault();deleteSprite();}}
  if(S.tab==='scene'&&S.selEntity>=0&&['Delete','Backspace'].includes(e.key)){e.preventDefault();ent_delete();}
  if(S.tab==='audio'){if(e.key===' '){e.preventDefault();aud_playing?aud_stop():aud_play();return;}const keys={z:0,s:1,x:2,d:3,c:4,v:5,g:6,b:7,h:8,n:9,j:10,m:11,q:12,'2':13,w:14,'3':15,e:16,r:17,'5':18,t:19,'6':20,y:21,'7':22,u:23};if(Object.hasOwn(keys,key)){e.preventDefault();if(!e.repeat)aud_enterNote(36+keys[key]);return;}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();aud_enterNote(e.key==='Delete'?-1:-2);return;}if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowUp')aud_currentRow=Math.max(0,aud_currentRow-1);if(e.key==='ArrowDown')aud_currentRow=Math.min(S.audRows-1,aud_currentRow+1);if(e.key==='ArrowLeft')aud_selectedChannel=Math.max(0,aud_selectedChannel-1);if(e.key==='ArrowRight')aud_selectedChannel=Math.min(4,aud_selectedChannel+1);render();}}
});
document.addEventListener('keyup',e=>{delete emuKeys[e.code];});
window.addEventListener('blur',()=>{clearEmuKeys();scenePainting=false;entityDrag=null;sprDragging=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearEmuKeys();emuPause();aud_stop();anim_stopPreview();}});
function paintScenePoint(px,py){const tc=px>>3,tr=py>>3;if(px<0||px>=256||py<0||py>=240)return;if(S.nt[tr*32+tc]===S.selTile&&getPal(tc,tr)===S.selPal)return;S.nt[tr*32+tc]=S.selTile;setPalQuad((tr>>2)*8+(tc>>2),((tr>>1)&1)*2+((tc>>1)&1),S.selPal);buildAttrGrid();notify('paint');}
cv.addEventListener('mousedown',e=>{
  if(e.button!==0&&e.button!==2)return;e.preventDefault();cv.focus({preventScroll:true});
  if(S.tab==='audio'){if(e.button!==0)return;const p=canvasPoint(cv,e);aud_selectedChannel=clamp(p.x/130,0,4);aud_currentRow=clamp((p.y-26)/18,0,S.audRows-1);render();return;}
  if(S.tab==='chr'){const p=canvasPoint(cv,e,128,128);if(p.x>=0&&p.y>=0&&p.x<128&&p.y<128){S.editTile=S.selTile=(p.y>>3)*16+(p.x>>3);render();}return;}
  const p=canvasPoint(cv,e,256,240);if(p.x<0||p.y<0||p.x>=256||p.y>=240)return;
  if(S.tab==='scene'){
    if(e.button===2){S.selTile=S.nt[(p.y>>3)*32+(p.x>>3)];S.selPal=getPal(p.x>>3,p.y>>3);buildPalEditor();render();return;}
    if(S.entPlaceTool){ent_place(p.x,p.y);notify('entityPlace');return;}
    const hit=ent_hitTest(p.x,p.y);if(hit>=0){snapshot();S.selEntity=hit;const ent=ent_list()[hit];entityDrag={index:hit,x:p.x-ent.x,y:p.y-ent.y};ent_buildList();render();return;}
    S.selEntity=-1;ent_buildList();snapshot();scenePainting=true;paintScenePoint(p.x,p.y);
  }else if(S.tab==='sprites'){
    const hit=hitTestSprite(p.x,p.y);if(e.button===2){if(hit>=0){S.selSprite=hit;deleteSprite();}return;}
    if(hit>=0){snapshot();S.selSprite=hit;sprDragging=true;sprDragIdx=hit;sprDragOff={x:p.x-S.oam[hit].x,y:p.y-S.oam[hit].y};render();}else{if(S.oam.length>=64){showToast('OAM is full');return;}snapshot();const tile=S.oam[S.selSprite]?.tile??S.editTile;S.oam.push({tile,x:p.x,y:p.y,attr:S.selSprPal&3,height:8,active:true});S.selSprite=S.oam.length-1;notify('spritePlace');}
  }else if(S.tab==='attr'){if(e.button!==0)return;snapshot();const tc=p.x>>3,tr=p.y>>3;setPalQuad((tr>>2)*8+(tc>>2),((tr>>1)&1)*2+((tc>>1)&1),(getPal(tc,tr)+1)&3);buildAttrGrid();notify('attribute');}
  else if(S.tab==='collision'){if(e.button!==0)return;col_setTileProp(S.nt[(p.y>>3)*32+(p.x>>3)]);}
});
cv.addEventListener('mousemove',e=>{if(!['scene','sprites','collision','attr'].includes(S.tab))return;const p=canvasPoint(cv,e,256,240);if(e.buttons===1){if(entityDrag){const ent=ent_list()[entityDrag.index];if(ent){ent.x=clamp(p.x-entityDrag.x,0,255);ent.y=clamp(p.y-entityDrag.y,0,239);ent_buildList();notify('entityDrag');}}else if(S.tab==='scene'&&scenePainting)paintScenePoint(p.x,p.y);else if(S.tab==='sprites'&&sprDragging&&S.oam[sprDragIdx]){const s=S.oam[sprDragIdx];s.x=clamp(p.x-sprDragOff.x,0,255);s.y=clamp(p.y-sprDragOff.y,0,239);notify('spriteDrag');}}
  if(p.x>=0&&p.x<256&&p.y>=0&&p.y<240){const tc=p.x>>3,tr=p.y>>3,t=S.nt[tr*32+tc];document.getElementById('bTile').textContent='$'+t.toString(16).padStart(2,'0');document.getElementById('bPos').textContent='('+tc+','+tr+')';document.getElementById('bPal').textContent=getPal(tc,tr);document.getElementById('bUsed').textContent=(tileUsage()[t]||0)+'x';}
});
document.addEventListener('mouseup',()=>{if(scenePainting||entityDrag||sprDragging)broadcastState('strokeEnd');scenePainting=false;entityDrag=null;sprDragging=false;sprDragIdx=-1;});
function bindPixelCanvas(id,sprite){const c=document.getElementById(id);let painting=false;function paint(e){const p=canvasPoint(c,e,8,8);if(p.x<0||p.y<0||p.x>=8||p.y>=8)return;const tiles=sprite?S.sprChr:activeChr(),idx=sprite?getSprEditTile():S.editTile,color=sprite?sprPixColor:S.selPixColor;if(tiles[idx][p.y][p.x]===color)return;tiles[idx][p.y][p.x]=color;notify('pixel');}c.addEventListener('mousedown',e=>{if(e.button!==0)return;e.preventDefault();snapshot();painting=true;paint(e);});c.addEventListener('mousemove',e=>{if(painting&&e.buttons===1)paint(e);});c.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('mouseup',()=>painting=false);}
bindPixelCanvas('chrEditCanvas',false);bindPixelCanvas('sprPixelEditor',true);
for(const [id,key,lo,hi]of [['envVol','volEnv',0,15],['envArp','arpEnv',-12,12]]){const c=document.getElementById(id);let down=false;function paint(e){const inst=S.instruments[aud_selectedInst];if(!inst)return;const p=canvasPoint(c,e);const env=inst[key];if(!env?.length)return;env[clamp(p.x/c.width*env.length,0,env.length-1)]=clamp(Math.round(hi-p.y/c.height*(hi-lo)),lo,hi);aud_drawEnvelopes();broadcastState('envelope');}c.addEventListener('mousedown',e=>{if(e.button!==0)return;snapshot();down=true;paint(e);});c.addEventListener('mousemove',e=>{if(down&&e.buttons===1)paint(e);});document.addEventListener('mouseup',()=>down=false);}
// Catch file I/O failures and route drops once, case-insensitively.
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();document.getElementById('dropZone').classList.add('show');}});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)document.getElementById('dropZone').classList.remove('show');});
document.addEventListener('drop',async e=>{e.preventDefault();document.getElementById('dropZone').classList.remove('show');const f=e.dataTransfer.files[0];if(!f)return;try{if(f.size>64*1024*1024)throw new Error('File exceeds 64 MB');const ext=f.name.toLowerCase();if(ext.endsWith('.zip'))await loadZipPack(new Uint8Array(await f.arrayBuffer()));else if(ext.endsWith('.nes'))importRom(new Uint8Array(await f.arrayBuffer()),f.name);else if(ext.endsWith('.json')){db_deserializeState(await f.text());broadcastState('projectDrop');}else if(f.type.startsWith('image/')){const r=new FileReader();r.onload=()=>convertImage(r.result);r.onerror=()=>reportError(new Error('Image read failed'));r.readAsDataURL(f);}else throw new Error('Use an image, .NES, .ZIP, or project JSON file');}catch(error){reportError(error);}});
document.getElementById('codeInput').addEventListener('input',()=>{S.asmBinary=null;S._asmWrites=null;broadcastState('code');});
// Full project sync is restricted to explicitly linked views of this workspace.
if(BC){const seen=new Map();BC.onmessage=e=>{const d=e.data;if(d.session!==syncSession||d.peer===syncPeer)return;syncPeers.set(d.peer,Date.now());updateSyncDot();if(d.type==='ping'){BC.postMessage({type:'pong',session:syncSession,peer:syncPeer});broadcastState('welcome');}else if(d.type==='state'){if((seen.get(d.peer)||0)>=d.seq)return;seen.set(d.peer,d.seq);try{syncApplying=true;db_deserializeState(d.state,{sync:true});}catch(error){reportError(error);}finally{syncApplying=false;}}};setTimeout(broadcastPing,200);setInterval(()=>{BC.postMessage({type:'heartbeat',session:syncSession,peer:syncPeer});updateSyncDot();},5000);}
window.addEventListener('beforeunload',()=>{db_autoSave();BC?.close();});
// Merge controls make every affected field explicit.
captureTargetMergeFields={nt:true,attr:true,pal:true,sprPal:true,oam:true,chr:true,sprChr:true};
const mergeUI=document.createElement('div');mergeUI.id='mergeOptions';mergeUI.style.cssText='display:none;font-size:9px;max-width:520px;flex-wrap:wrap;gap:7px';for(const k of Object.keys(captureTargetMergeFields)){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=true;check.onchange=()=>captureTargetMergeFields[k]=check.checked;label.append(check,document.createTextNode(' '+k));mergeUI.appendChild(label);}document.getElementById('emuCanvas').before(mergeUI);document.getElementById('capTarget').addEventListener('change',e=>{mergeUI.style.display=e.target.value==='merge'?'flex':'none';});
// Redo remains discoverable without consuming another row in the toolbar.
const redoButton=document.createElement('button');redoButton.className='undo-btn';redoButton.textContent='↪ Redo';redoButton.title='Ctrl/Cmd+Shift+Z';redoButton.onclick=redo;document.getElementById('undoBtn').after(redoButton);

buildPalEditor();
buildAttrGrid();
switchTab(getHashView());
// Load scene sidebar for initial scene
if(S.scenes[S.activeScene]) sp_loadUI(S.scenes[S.activeScene]);

// Request state from any existing tabs (so new tabs get current data)


// v8: Check for autosave
// Recovery checking is owned by the final ProjectStore bootstrap.

// v8: Update project name display
document.getElementById('projName').textContent=S.projectName;




