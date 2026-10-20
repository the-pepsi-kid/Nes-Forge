




const _CHR=Array(4096).fill(0);
const _NT=Array(960).fill(0);
const _ATTR=Array(64).fill(0);


// ═══════════════════════════════════════════════
// NES PALETTE
// ═══════════════════════════════════════════════
const NP=[[84,84,84],[0,30,116],[8,16,144],[48,0,136],[68,0,100],[92,0,48],[84,4,0],[60,24,0],[32,42,0],[8,58,0],[0,64,0],[0,60,0],[0,50,60],[0,0,0],[0,0,0],[0,0,0],[152,150,152],[8,76,196],[48,50,236],[92,30,228],[136,20,176],[160,20,100],[152,34,32],[120,60,0],[84,90,0],[40,114,0],[8,124,0],[0,118,40],[0,102,120],[0,0,0],[0,0,0],[0,0,0],[236,238,236],[76,154,236],[120,124,236],[176,98,236],[228,84,236],[236,88,180],[236,106,100],[212,136,32],[160,170,0],[116,196,0],[76,208,32],[56,204,108],[56,180,204],[60,60,60],[0,0,0],[0,0,0],[236,238,236],[168,204,236],[188,188,236],[212,178,236],[236,174,236],[236,174,212],[236,180,176],[228,196,144],[204,210,120],[180,222,120],[168,226,144],[152,226,180],[160,214,228],[160,162,160],[0,0,0],[0,0,0]];

// ═══════════════════════════════════════════════
// CANONICAL SCENE FACTORY
// ═══════════════════════════════════════════════
// Every scene creation path must go through this to guarantee the full schema.
function makeScene(ov={}){
  const bg=clamp(ov.bgColor??ov.pal?.[0]?.[0]??15,0,63,15);
  const pal=ov.pal||[[15,0,16,48],[15,6,39,48],[15,1,33,48],[15,4,36,48]];
  const spr=ov.sprPal||[[15,32,48,32],[15,7,23,32],[15,1,17,32],[15,4,20,36]];
  return {id:String(ov.id||('sc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8))),name:String(ov.name||'Untitled').slice(0,120),
    nt:Array.from({length:960},(_,i)=>clamp(ov.nt?.[i],0,255)),attr:Array.from({length:64},(_,i)=>clamp(ov.attr?.[i],0,255)),
    pal:normalizePal(pal,bg),sprPal:normalizePal(spr,bg),oam:(ov.oam||[]).slice(0,64).map(s=>({...copyData(s),x:clamp(s.x,0,255),y:clamp(s.y,0,239),tile:clamp(s.tile,0,255),attr:clamp(s.attr,0,255)&0xE3,active:s.active!==false,height:s.height===16?16:8})),
    chr:ov.chr?normalizeTiles(ov.chr):null,sprChr:ov.sprChr?normalizeTiles(ov.sprChr):null,tileProps:ov.tileProps?Array.from({length:256},(_,i)=>clamp(ov.tileProps[i],0,7)):null,
    sceneType:['sideview','topdown','static'].includes(ov.sceneType)?ov.sceneType:'sideview',scrollDir:['none','horizontal','vertical','both'].includes(ov.scrollDir)?ov.scrollDir:'horizontal',bgColor:bg,gravity:clamp(ov.gravity??1,-1,2,1),
    view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24,...copyData(ov.view||{})},entities:copyData(ov.entities||[]),links:copyData(ov.links||[]),captureMeta:ov.captureMeta?copyData(ov.captureMeta):null};
}

// ═══════════════════════════════════════════════
// MUTABLE STATE
// ═══════════════════════════════════════════════
const S={
  chr:[], // 256 BG tiles — shared across all scenes
  sprChr:[], // 256 sprite tiles — shared across all scenes
  // Per-scene data (active scene is live-edited in these):
  nt:[..._NT],
  attr:[..._ATTR],
  pal:[[15,0,16,48],[15,6,39,48],[15,1,33,48],[15,4,36,48]],
  sprPal:[[15,32,48,32],[15,7,23,32],[15,1,17,32],[15,4,20,36]],
  oam:[],
  // Scene management:
  scenes:[makeScene({name:'Scene 1',nt:_NT,attr:_ATTR})],
  activeScene:0,
  // Selection state:
  selTile:0,
  selPixColor:1,
  selPal:0,
  selSprite:-1,
  selSprPal:0,
  chrBank:'bg',
  editTile:0,
  tab:'scene',
  // ═══ v8 additions ═══
  // Code / Assembler
  asmSource:'',
  asmErrors:[],
  asmSymbols:{},
  asmBinary:null,
  // Audio
  instruments:[],
  patterns:[{rows:Array.from({length:64},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))}],
  orderList:[[0,0,0,0,0]],
  tempo:150,
  speed:6,
  audRows:64,
  sfx:[],
  // Collision
  tileProps:new Array(256).fill(0),
  // Animation
  animations:[],
  metasprites:[],
  // Entity system
  entityTypes:[
    {id:'player',name:'Player',icon:'\u{1F9CD}',w:16,h:16,color:'#4af'},
    {id:'enemy',name:'Enemy',icon:'\u{1F47E}',w:16,h:16,color:'#f44'},
    {id:'npc',name:'NPC',icon:'\u{1F464}',w:16,h:16,color:'#4f4'},
    {id:'door',name:'Door',icon:'\u{1F6AA}',w:16,h:24,color:'#fa4',hasDest:true},
    {id:'item',name:'Item',icon:'\u{2B50}',w:8,h:8,color:'#ff4'},
    {id:'platform',name:'Platform',icon:'\u{2B1B}',w:32,h:8,color:'#888'},
    {id:'trigger',name:'Trigger',icon:'\u{26A1}',w:16,h:16,color:'#a4f'},
    {id:'spawn',name:'Spawn Point',icon:'\u{1F4CD}',w:8,h:8,color:'#4ff'}
  ],
  entPlaceTool:null,
  selEntity:-1,
  // ROM config
  mapper:0,
  mirroring:'v',
  hasSRAM:false,
  prgBanks:1,
  chrBanks:1,
  // Imported ROM preservation
  importedRom:null,        // original ROM bytes for Build & Run passthrough
  allChrBanks:[],          // all 4KB CHR banks decoded from ROM [{tiles:[256 tiles], label:'Bank 0 (BG)'}]
  chrBankIdx:0,            // currently browsed CHR bank index
  // Project
  projectName:'Untitled',
  projectId:null
};

// NES Forge 1.4 repair: shared utility and state invariants.
function clamp(v,lo,hi,fallback=lo){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,Math.trunc(v))):fallback;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function copyData(v){return JSON.parse(JSON.stringify(v));}
function inputTarget(e){return !!e.target?.closest?.('input,textarea,select,[contenteditable="true"]');}
function reportError(error){const msg=error?.message||String(error);console.error(error);showToast(msg);const el=document.getElementById('issueStatus');if(el){el.textContent='Error: '+msg;el.title=msg;el.style.color='var(--red)';}return null;}
function normalizeTiles(tiles){return Array.from({length:256},(_,i)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>clamp(tiles?.[i]?.[y]?.[x],0,3))));}
function normalizePal(pals,bg=15){return Array.from({length:4},(_,p)=>Array.from({length:4},(_,c)=>c?clamp(pals?.[p]?.[c],0,63):bg));}
function encodeTiles(tiles){const out=new Uint8Array(4096);for(let i=0;i<256;i++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const n=tiles[i][y][x];out[i*16+y]|=(n&1)<<(7-x);out[i*16+y+8]|=((n>>1)&1)<<(7-x);}return out;}
function decodeTiles(bytes,offset=0){return Array.from({length:256},(_,t)=>Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((bytes[offset+t*16+y]>>(7-x))&1)|(((bytes[offset+t*16+y+8]>>(7-x))&1)<<1))));}
function bytesToBase64(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);}
function base64ToBytes(text){if(text.length>32*1024*1024)throw new Error('ROM backup too large');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function canvasPoint(canvas,e,w=canvas.width,h=canvas.height){const r=canvas.getBoundingClientRect();return {x:Math.floor((e.clientX-r.left)*w/r.width),y:Math.floor((e.clientY-r.top)*h/r.height)};}
function rebuildAllUI(){S.selTile=clamp(S.selTile,0,Math.max(255,S.chr.length-1));S.editTile=clamp(S.editTile,0,Math.max(255,activeChr().length-1));findLastTile=-1;buildSceneSel();buildPalEditor();buildAttrGrid();sp_loadUI(S.scenes[S.activeScene]);document.getElementById('projName').textContent=S.projectName;document.getElementById('bankBg').classList.toggle('on',S.chrBank!=='spr');document.getElementById('bankSpr').classList.toggle('on',S.chrBank==='spr');document.getElementById('cfgMapper').value='0';document.getElementById('cfgMirror').value=S.mirroring==='h'?'h':'v';document.getElementById('cfgSRAM').checked=!!S.hasSRAM;const c=document.getElementById('cfgPackScenes');if(c)c.checked=S.packScenes!==false;document.getElementById('audTempo').value=S.tempo;document.getElementById('audSpeed').value=S.speed;document.getElementById('audRows').value=S.audRows;render();}
const redoStack=[];let undoBytes=0;let recoveryPending=false;let autoSaveWarning=false;
const sessionURL=new URL(location.href);const syncSession=sessionURL.searchParams.get('forgeSession')||('sess_'+Math.random().toString(36).slice(2));
const syncPeer='peer_'+Math.random().toString(36).slice(2);let syncSeq=0,syncTimer=null;const syncPeers=new Map();let syncApplying=false;
let scenePainting=false,entityDrag=null;let aud_selectedChannel=0,aud_selectedInst=-1;let previewTimeout=null;
function sceneLinks(sc){sc.links=(sc.entities||[]).flatMap((e,i)=>e.type==='door'&&Number.isInteger(e.targetScene)&&e.targetScene>=0&&e.targetScene<S.scenes.length?[{entIdx:i,targetScene:e.targetScene,targetX:clamp(e.targetX,0,255),targetY:clamp(e.targetY,0,239)}]:[]);}
function projectData(){saveCurrentScene();return {format:'NESForge',version:2,chr:S.chr,sprChr:S.sprChr,nt:S.nt,attr:S.attr,pal:S.pal,sprPal:S.sprPal,oam:S.oam,scenes:S.scenes,activeScene:S.activeScene,asmSource:document.getElementById('codeInput')?.value??S.asmSource,instruments:S.instruments,patterns:S.patterns,orderList:S.orderList,tempo:S.tempo,speed:S.speed,audRows:S.audRows,sfx:S.sfx,tileProps:S.tileProps,animations:S.animations,metasprites:S.metasprites,mapper:S.mapper,mirroring:S.mirroring,hasSRAM:S.hasSRAM,prgBanks:S.prgBanks,chrBanks:S.chrBanks,packScenes:S.packScenes!==false,projectName:S.projectName,importedRom:S.importedRom?bytesToBase64(S.importedRom):null,selTile:S.selTile,editTile:S.editTile,selSprite:S.selSprite,selEntity:S.selEntity,chrBank:S.chrBank,_selAnim:S._selAnim||0,_animFrame:S._animFrame||0};}
function markEdited(reason='edit'){saveCurrentScene();findLastTile=-1;render();buildSceneSel();broadcastState(reason);}
function asm_stripComment(line){let quote=null,escape=false;for(let i=0;i<line.length;i++){const c=line[i];if(escape){escape=false;continue;}if(c==='\\'&&quote){escape=true;continue;}if(quote){if(c===quote)quote=null;}else if(c==='"'||c==="'")quote=c;else if(c===';')return line.slice(0,i);}return line;}
function asm_splitArgs(s){if(!s.trim())return [];let q=null,escape=false,start=0,depth=0;const parts=[];for(let i=0;i<s.length;i++){const c=s[i];if(escape){escape=false;continue;}if(c==='\\'&&q){escape=true;continue;}if(q){if(c===q)q=null;}else if(c==='"'||c==="'")q=c;else if(c==='(')depth++;else if(c===')')depth--;else if(c===','&&!depth){parts.push(s.slice(start,i).trim());start=i+1;}}parts.push(s.slice(start).trim());return parts;}
function asm_string(s){if(s.length<2||!['"',"'"].includes(s[0])||s.at(-1)!==s[0])return null;let out='';for(let i=1;i<s.length-1;i++){let c=s[i];if(c===s[0])return null;if(c==='\\'){c=s[++i];if(i>=s.length-1)return null;if(c==='x'){const hex=s.slice(i+1,i+3);if(!/^[0-9a-f]{2}$/i.test(hex)||i+2>=s.length-1)return null;out+=String.fromCharCode(parseInt(hex,16));i+=2;continue;}const escapes={n:'\n',r:'\r',t:'\t','0':'\0','\\':'\\','"':'"',"'":"'"};if(!Object.hasOwn(escapes,c))return null;out+=escapes[c];}else out+=c;}return out;}
function redo(){if(!redoStack.length)return;const current=db_serializeState();undoStack.push(current);undoBytes+=current.length;db_deserializeState(redoStack.pop(),{history:true});broadcastState('redo');showToast('Redo');}
function linkedURL(view){const url=new URL(location.href);url.searchParams.set('forgeSession',syncSession);url.hash=view;return url.href;}
function project_export(){try{return download(db_serializeState(),(S.projectName||'project').replace(/[^\w-]/g,'_')+'.nesforge.json','application/json');}catch(e){reportError(e);}}
async function project_importFile(event){const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>64*1024*1024)throw new Error('Project exceeds 64 MB');db_deserializeState(await file.text());broadcastState('projectOpen');showToast('Opened '+file.name);}catch(e){reportError(e);}}

function makeViewerEngine(sceneCount){
if(sceneCount<1||sceneCount>7)throw new Error("The scene viewer supports 1–7 scenes");
const PRG=new Uint8Array(16384);
  let pc=0;
  function emit(...bs){for(const b of bs){PRG[pc]=b&0xFF;pc++}}
  function emit16(v){emit(v&0xFF,(v>>8)&0xFF)}
  function cur(){return 0xC000+pc}
  function rel(t){return((t-(cur()+1))&0xFF)}

  // Forward-ref patch list: [{off:prgOffset, type:'abs'|'rel'}]
  const fwd={};
  function markFwd(name){if(!fwd[name])fwd[name]=[];fwd[name].push({off:pc,type:'abs'})}
  function markFwdRel(name){if(!fwd[name])fwd[name]=[];fwd[name].push({off:pc,type:'rel'})}
  const lbl={};
  function patchFwd(){
    for(const[n,refs] of Object.entries(fwd)){
      const t=lbl[n];if(t===undefined){throw new Error('Unresolved engine label '+n)}
      refs.forEach(r=>{
        if(r.type==='abs'){PRG[r.off]=t&0xFF;PRG[r.off+1]=(t>>8)&0xFF}
        else{const delta=t-(0xC000+r.off+1);if(delta<-128||delta>127)throw new Error('Engine branch overflow');PRG[r.off]=delta&255}
      });
    }
  }

  // ══════════════════════════════════════
  // ZP map: $00=sceneIdx $01=sceneCnt $02=frameReady $04=joyOld $05=joyRead $06/$07=ptr
  // ══════════════════════════════════════

  // ════ RESET ════
  const RESET=cur();
  emit(0x78);        // SEI
  emit(0xA2,0xFF,0x9A); // LDX #$FF / TXS
  emit(0xD8);        // CLD
  emit(0xA9,0x00);emit(0x8D);emit16(0x2000); // disable PPU
  emit(0x8D);emit16(0x2001);

  // Vblank wait 1
  const vb1=cur();
  emit(0xAD);emit16(0x2002);emit(0x10);emit(rel(vb1));

  // Clear RAM
  emit(0xA2,0x00);
  const clr=cur();
  emit(0xA9,0x00);
  emit(0x9D);emit16(0x0000);emit(0x9D);emit16(0x0100);
  emit(0x9D);emit16(0x0300);emit(0x9D);emit16(0x0400);
  emit(0x9D);emit16(0x0500);emit(0x9D);emit16(0x0600);
  emit(0x9D);emit16(0x0700);
  emit(0xE8);emit(0xD0);emit(rel(clr));

  // Hide all sprites
  emit(0xA9,0xFF);emit(0xA2,0x00);
  const sph=cur();
  emit(0x9D);emit16(0x0200);emit(0xE8);emit(0xD0);emit(rel(sph));

  // Vblank wait 2
  const vb2=cur();
  emit(0xAD);emit16(0x2002);emit(0x10);emit(rel(vb2));

  // Init ZP
  emit(0xA9,sceneCount);emit(0x85,0x01); // $01 = sceneCount
  // Scene count marker for ROM import detection: LDA #count, STA $01
  emit(0xA9,0x00);emit(0x85,0x00); // $00 = sceneIdx = 0
  emit(0x85,0x02); // $02 = frameReady = 0
  emit(0x85,0x04); // $04 = joyOld = 0

  // JSR load_scene
  emit(0x20);markFwd('load_scene');emit16(0);

  // Enable rendering
  emit(0xA9,0x88);emit(0x8D);emit16(0x2000); // PPUCTRL: NMI + spr@$1000
  emit(0xA9,0x1E);emit(0x8D);emit16(0x2001); // PPUMASK: show all

  // ════ MAIN LOOP ════
  const mainLoop=cur();
  emit(0xA5,0x02); // LDA frameReady
  emit(0xF0);emit(rel(mainLoop)); // BEQ mainLoop (spin until NMI)
  emit(0xA9,0x00);emit(0x85,0x02); // clear flag

  // JSR read_joy
  emit(0x20);markFwd('read_joy');emit16(0);

  // Edge detect: new = (read ^ old) & read
  emit(0xA5,0x05); // LDA joyRead
  emit(0x45,0x04); // EOR joyOld
  emit(0x25,0x05); // AND joyRead → A = newly pressed
  emit(0x48);      // PHA (save new presses)
  emit(0xA5,0x05);emit(0x85,0x04); // joyOld = joyRead

  // Check Start (bit 4 = $10)
  emit(0x68);      // PLA
  emit(0x29,0x10); // AND #$10
  emit(0xF0);markFwdRel('no_start');emit(0); // BEQ no_start

  // ── Start pressed: next scene ──
  if(sceneCount>1){
    emit(0xE6,0x00); // INC sceneIdx
    emit(0xA5,0x00); // LDA sceneIdx
    emit(0xC5,0x01); // CMP sceneCount
    emit(0x90,0x04); // BCC +4 (skip wrap)
    emit(0xA9,0x00);emit(0x85,0x00); // wrap to 0
    emit(0xEA);emit(0xEA); // NOP padding for branch target alignment
  }

  // Disable rendering during reload
  emit(0xA9,0x00);emit(0x8D);emit16(0x2001);
  // JSR load_scene
  emit(0x20);markFwd('load_scene');emit16(0);
  // Re-enable rendering
  emit(0xA9,0x88);emit(0x8D);emit16(0x2000);
  emit(0xA9,0x1E);emit(0x8D);emit16(0x2001);

  lbl['no_start']=cur();
  emit(0x4C);emit16(mainLoop); // JMP mainLoop

  // ════ READ_JOY SUBROUTINE ════
  // Result in $05. Bits: A B Sel Start Up Down Left Right
  lbl['read_joy']=cur();
  emit(0xA9,0x01);emit(0x8D);emit16(0x4016); // strobe
  emit(0xA9,0x00);emit(0x8D);emit16(0x4016);
  emit(0xA2,0x08); // 8 buttons
  const jl=cur();
  emit(0xAD);emit16(0x4016); // LDA $4016
  emit(0x4A);       // LSR (bit 0 → carry)
  emit(0x26,0x05);  // ROL $05 (rotate carry into result)
  emit(0xCA);       // DEX
  emit(0xD0);emit(rel(jl)); // BNE
  emit(0x60);       // RTS

  // ════ LOAD_SCENE SUBROUTINE ════
  // Computes pointer from sceneIdx, loads palettes/NT/attr/OAM to PPU
  lbl['load_scene']=cur();
  emit(0xA9,0,0x8D,0,0x20,0x8D,1,0x20); // NMI and rendering off throughout loading

  // Compute scene data pointer: $06/$07
  // CPU addr = $D000 + sceneIdx × $0600
  // $0600 = 6 pages, so high byte = $D0 + sceneIdx*6
  // sceneIdx*6 = sceneIdx*2 + sceneIdx*4
  emit(0xA5,0x00); // LDA sceneIdx
  emit(0x0A);      // ASL (*2)
  emit(0x85,0x08); // STA temp
  emit(0x0A);      // ASL (*4)
  emit(0x18);      // CLC
  emit(0x65,0x08); // ADC temp → A = sceneIdx*6
  emit(0x18);      // CLC
  emit(0x69,0xD0); // ADC #$D0 → high byte
  emit(0x85,0x07); // STA $07
  emit(0xA9,0x00);emit(0x85,0x06); // $06 = $00

  // ── Load palettes (32 bytes at scene offset +1024) ──
  // +1024 = +$0400 → advance $07 by 4
  emit(0xAD);emit16(0x2002); // reset latch
  emit(0xA9,0x3F);emit(0x8D);emit16(0x2006);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2006); // PPU → $3F00

  emit(0xA5,0x07);emit(0x48); // PHA (save base high)
  emit(0x18);emit(0x69,0x04);emit(0x85,0x07); // $07 += 4 → palette page

  emit(0xA0,0x00); // LDY #0
  const pl=cur();
  emit(0xB1,0x06); // LDA ($06),Y
  emit(0x8D);emit16(0x2007);
  emit(0xC8);emit(0xC0,32);emit(0xD0);emit(rel(pl));

  emit(0x68);emit(0x85,0x07); // restore base high

  // ── Load nametable (960 bytes at offset +0) → PPU $2000 ──
  emit(0xAD);emit16(0x2002);
  emit(0xA9,0x20);emit(0x8D);emit16(0x2006);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2006);

  // 3 full pages (768 bytes)
  for(let pg=0;pg<3;pg++){
    emit(0xA0,0x00);
    const nl=cur();
    emit(0xB1,0x06);emit(0x8D);emit16(0x2007);
    emit(0xC8);emit(0xD0);emit(rel(nl));
    emit(0xE6,0x07); // INC high byte
  }
  // Remaining 192 bytes
  emit(0xA0,0x00);
  const nl2=cur();
  emit(0xB1,0x06);emit(0x8D);emit16(0x2007);
  emit(0xC8);emit(0xC0,192);emit(0xD0);emit(rel(nl2));

  // ── Load attributes (64 bytes at offset +960) → PPU $23C0 ──
  // After nametable loop: $07 = base+3, Y finished at 192
  // Attributes start at scene_base+960 = (base+3)*256+192 → Y=192 with current $07
  emit(0xAD);emit16(0x2002);
  emit(0xA9,0x23);emit(0x8D);emit16(0x2006);
  emit(0xA9,0xC0);emit(0x8D);emit16(0x2006);

  // Y is 192; read 64 bytes (Y goes 192..255 then wraps to 0)
  const al=cur();
  emit(0xB1,0x06);emit(0x8D);emit16(0x2007);
  emit(0xC8);emit(0xD0);emit(rel(al)); // BNE (wraps at 256)

  // ── Load OAM (sprites) ──
  // First hide all sprites
  emit(0xA9,0xFF);emit(0xA2,0x00);
  const oh=cur();
  emit(0x9D);emit16(0x0200);emit(0xE8);emit(0xD0);emit(rel(oh));

  // OAM data at scene offset +1056 = +$0420
  // $07 = base+3 after attr loop (Y wrapped to 0, so $07 was base+3)
  // Actually after the attr BNE loop ends when Y wraps from 255→0.
  // But we did 3 INC $07 during nametable, so $07 = original_base + 3.
  // We need base+4 (for the +1024 page) + offset 32 (for 1024+32=1056)
  emit(0xE6,0x07); // $07 = base+4

  // Read OAM count from offset 32 within this page
  emit(0xA0,32);    // LDY #32
  emit(0xB1,0x06);  // LDA ($06),Y = sprite count
  emit(0xF0);markFwdRel('oam_done');emit(0); // BEQ oam_done (no sprites)

  // A = sprite count, multiply by 4 for byte count
  emit(0x0A);emit(0x0A); // ASL ASL → A = count*4
  emit(0x85,0x08);       // STA $08 (byte counter)
  emit(0xA0,33);         // LDY #33 (first OAM byte)
  emit(0xA2,0x00);       // LDX #0

  const ol=cur();
  emit(0xB1,0x06);       // LDA ($06),Y
  emit(0x9D);emit16(0x0200); // STA $0200,X
  emit(0xC8); // INY
  emit(0xD0,0x02,0xE6,0x07); // if Y wrapped, advance source page
  emit(0xE8); // INX
  emit(0xC6,0x08);       // DEC byte counter
  emit(0xD0);emit(rel(ol)); // BNE

  lbl['oam_done']=cur();

  // ── Set scroll ──
  emit(0xAD);emit16(0x2002);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2005);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2005);

  emit(0x60); // RTS

  // ════ NMI HANDLER ════
  const NMI=cur();
  emit(0x48);      // PHA
  emit(0x8A);emit(0x48); // TXA PHA
  emit(0x98);emit(0x48); // TYA PHA

  emit(0xA9,0x01);emit(0x85,0x02); // frameReady = 1
  emit(0xA9,0x00,0x8D,0x03,0x20); // OAMADDR = 0
  emit(0xA9,0x02);emit(0x8D);emit16(0x4014); // OAM DMA
  emit(0xAD);emit16(0x2002);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2005);
  emit(0xA9,0x00);emit(0x8D);emit16(0x2005);

  emit(0x68);emit(0xA8); // PLA TAY
  emit(0x68);emit(0xAA); // PLA TAX
  emit(0x68);            // PLA
  emit(0x40);            // RTI

  // ════ IRQ ════
  const IRQ=cur();
  emit(0x40);

  // Patch forward references
  patchFwd();

  // ════ VECTORS ════
  const vec=0xFFFA-0xC000;
  PRG[vec]=NMI&0xFF;PRG[vec+1]=(NMI>>8)&0xFF;
  PRG[vec+2]=RESET&0xFF;PRG[vec+3]=(RESET>>8)&0xFF;
  PRG[vec+4]=IRQ&0xFF;PRG[vec+5]=(IRQ>>8)&0xFF;


return {prg:PRG,size:pc,reset:RESET,nmi:NMI,irq:IRQ};
}
function parseRomHeader(input){const r=input instanceof Uint8Array?input:Uint8Array.from(input||[]);if(r.length<16||r[0]!==78||r[1]!==69||r[2]!==83||r[3]!==26)throw new Error('Not a valid iNES .nes file');if((r[7]&12)===8)throw new Error('NES 2.0 is not supported by this emulator. Use an iNES 1.0 dump.');if(r[7]&3)throw new Error('VS System / PlayChoice ROMs are not supported');if(!r[4])throw new Error('ROM has no PRG bank');const prgSize=r[4]*16384,chrSize=r[5]*8192,headerSize=16+(r[6]&4?512:0),mapper=(r[6]>>4)|(r[7]&0xF0);if(headerSize+prgSize+chrSize>r.length)throw new Error('ROM is truncated');if(![0,1,2,3,4,7,11,66].includes(mapper))throw new Error('Unsupported mapper '+mapper+'. Supported: 0, 1, 2, 3, 4, 7, 11, 66.');if(mapper===0&&(prgSize>32768||chrSize>8192))throw new Error('Invalid NROM bank sizes');return {prgSize,chrSize,headerSize,mapper,mirror:r[6]&8?4:r[6]&1,battery:!!(r[6]&2),trainer:!!(r[6]&4)};}
function romChrBanks(rom){const h=parseRomHeader(rom),banks=[];for(let b=0;b<h.chrSize/4096;b++)banks.push({tiles:decodeTiles(rom,h.headerSize+h.prgSize+b*4096),label:'4 KB bank '+b});return banks;}
function expandOAM(oam){const out=[];for(const s of oam)if(s.active){if(s.height===16){const flip=!!(s.attr&0x80);out.push({...s,height:8,tile:flip?(s.tile2??s.tile+1):s.tile});if(s.y+8<240)out.push({...s,height:8,y:s.y+8,tile:flip?s.tile:(s.tile2??s.tile+1)});}else out.push({...s,height:8});}return out;}
function buildGraphicsAtlas(scenes,custom){
  const copies=copyData(scenes);if(custom){const bg=JSON.stringify(S.chr),sp=JSON.stringify(S.sprChr),props=JSON.stringify(S.tileProps);for(const sc of copies)if(JSON.stringify(sc.chr)!==bg||JSON.stringify(sc.sprChr)!==sp||JSON.stringify(sc.tileProps)!==props)throw new Error('Custom ASM uses fixed tile IDs. All packed scenes must share identical CHR and collision banks, or disable scene packing.');return {chr:S.chr,sprChr:S.sprChr,tileProps:S.tileProps,scenes:copies};}
  const bg=[],sp=[],bp=new Map(),smap=new Map(),props=[];
  function add(tile,prop,sprite){const arr=sprite?sp:bg,map=sprite?smap:bp,key=tileKeyFromData(tile)+(sprite?'':':'+prop);if(map.has(key))return map.get(key);if(arr.length>=256)throw new Error((sprite?'Sprite':'Background')+' graphics across scenes exceed 256 unique tiles. Reduce tiles/scenes; nothing was truncated.');const id=arr.length;arr.push(tile);map.set(key,id);if(!sprite)props[id]=prop;return id;}
  for(const sc of copies){const map=new Map();sc.nt=sc.nt.map(t=>{if(!map.has(t))map.set(t,add(sc.chr[t],sc.tileProps?.[t]||0,false));return map.get(t);});for(const s of sc.oam)if(s.active){const top=s.tile,bottom=s.tile2??((top+1)&255);s.tile=add(sc.sprChr[top],0,true);if(s.height===16)s.tile2=add(sc.sprChr[bottom]||blankTileData(),0,true);}for(const e of sc.entities)if(e.sprTile>=0)e.sprTile=add(sc.sprChr[e.sprTile],0,true);}
  while(bg.length<256){bg.push(blankTileData());props.push(0);}while(sp.length<256)sp.push(blankTileData());return {chr:bg,sprChr:sp,tileProps:props,scenes:copies};
}
function runImportedRom(){if(!S.importedRom)return reportError(new Error('No original imported ROM in this project'));if(emuLoadRomData(S.importedRom,'Original imported ROM')){switchTab('emu');emuToggleRun();}}
function zipCRC(data){let crc=0xFFFFFFFF;for(const v of data){crc^=v;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}return (crc^0xFFFFFFFF)>>>0;}
function emuPause(){
  emu.running=false;emu.loading=false;emu.loadGeneration=(emu.loadGeneration||0)+1;emuRunGeneration++;
  if(emu.rafId!==null){cancelAnimationFrame(emu.rafId);emu.rafId=null;}
  emuLastFrameTime=null;emuAccumulator=0;
  const btn=document.getElementById('emuRunBtn');if(btn)btn.textContent='▶ Run';
  apuSilence();emuUpdatePerformance(true);
}
function clearEmuKeys(){if(typeof emuKeys!=='undefined')for(const k of Object.keys(emuKeys))delete emuKeys[k];}
function renderEmuLine(line,baseY,baseNTY){
  if(!emu.frameBuffer){emu.frameBuffer=new Uint8ClampedArray(256*240*4);emu.bgFrameBuffer=new Uint8ClampedArray(256*240*4);}
  const opaque=emu._lineOpaque||(emu._lineOpaque=new Uint8Array(256)),colors=emu._lineColors||(emu._lineColors=new Uint8Array(256)),mask=emu.ppuMask,scrollX=(emu.tAddr&31)*8+emu.fineX,ntx=(emu.tAddr>>10)&1,worldY=baseY+line,localY=((worldY%240)+240)%240,nty=baseNTY^(Math.floor(worldY/240)&1);opaque.fill(0);colors.fill(ppuBusRead(0x3F00));
  if(mask&8)for(let x=0;x<256;x++){if(x<8&&!(mask&2))continue;const worldX=scrollX+x,localX=worldX&255,nt=(nty*2+(ntx^((worldX>>8)&1)))*1024,tr=localY>>3,tc=localX>>3,t=emu.vram[ppuMirror(nt+tr*32+tc)],a=emu.vram[ppuMirror(nt+960+(tr>>2)*8+(tc>>2))],pal=(a>>((((tr>>1)&1)*2+((tc>>1)&1))*2))&3,chr=(emu.ppuCtrl&16?4096:0)+t*16,bit=7-(localX&7),ci=((ppuBusRead(chr+(localY&7))>>bit)&1)|(((ppuBusRead(chr+(localY&7)+8)>>bit)&1)<<1);opaque[x]=ci;colors[x]=ppuBusRead(0x3F00+(ci?pal*4+ci:0));}
  function put(buffer,x,color){if(mask&1)color&=0x30;const rgb=NP[color&63]||NP[15],o=(line*256+x)*4;buffer[o]=rgb[0];buffer[o+1]=rgb[1];buffer[o+2]=rgb[2];buffer[o+3]=255;}
  for(let x=0;x<256;x++)put(emu.bgFrameBuffer,x,colors[x]);let hit=-1;const claimed=emu._lineClaimed||(emu._lineClaimed=new Uint8Array(256));claimed.fill(0);let visible=0;
  if(mask&16)for(let i=0;i<64;i++){const off=i*4,top=emu.oamMem[off]+1,height=emu.ppuCtrl&32?16:8;if(top>239||line<top||line>=top+height)continue;if(visible++>=8){emu.ppuStatus|=32;continue;}const t=emu.oamMem[off+1],at=emu.oamMem[off+2],sx=emu.oamMem[off+3],py=at&128?height-1-(line-top):line-top;const bank=height===16?(t&1)*4096:(emu.ppuCtrl&8?4096:0),ti=height===16?(t&254)+(py>>3):t,chr=bank+ti*16,p0=ppuBusRead(chr+(py&7)),p1=ppuBusRead(chr+(py&7)+8);for(let px=0;px<8;px++){const x=sx+px;if(x>=256||(x<8&&!(mask&4)))continue;const bit=at&64?px:7-px,ci=((p0>>bit)&1)|(((p1>>bit)&1)<<1);if(!ci)continue;if(i===0&&x<255&&opaque[x]&&(mask&8)&&hit<0)hit=x;if(claimed[x])continue;claimed[x]=1;if((at&32)&&opaque[x])continue;colors[x]=ppuBusRead(0x3F10+(at&3)*4+ci);}}
  for(let x=0;x<256;x++)put(emu.frameBuffer,x,colors[x]);return hit;
}
function mappedTiles(base){const bytes=Uint8Array.from({length:4096},(_,i)=>ppuBusRead(base+i));return decodeTiles(bytes);}
function captureSpriteData(){const h=emu.ppuCtrl&32?16:8,chr=h===8?mappedTiles(emu.ppuCtrl&8?4096:0):[],map=new Map(),oam=[];function add(base,t){const tile=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>((ppuBusRead(base+t*16+y)>>(7-x))&1)|(((ppuBusRead(base+t*16+y+8)>>(7-x))&1)<<1)));const key=tileKeyFromData(tile);if(map.has(key))return map.get(key);const i=chr.length;chr.push(tile);map.set(key,i);return i;}for(let i=0;i<64;i++){const o=i*4,y=emu.oamMem[o]+1,t=emu.oamMem[o+1];if(y>=240)continue;const sprite={y,x:emu.oamMem[o+3],attr:emu.oamMem[o+2],tile:t,height:h,active:true};if(h===16){const base=(t&1)*4096;sprite.tile=add(base,t&254);sprite.tile2=add(base,t|1);}oam.push(sprite);}while(chr.length<256)chr.push(blankTileData());return {chr,oam};}
function captureRuntimeData(){const ntBase=(emu.ppuCtrl&3)*1024;const sprites=captureSpriteData();return makeScene({name:'Runtime snapshot F'+emu.frameCount,nt:Array.from({length:960},(_,i)=>emu.vram[ppuMirror(ntBase+i)]),attr:Array.from({length:64},(_,i)=>emu.vram[ppuMirror(ntBase+960+i)]),chr:mappedTiles(emu.ppuCtrl&16?4096:0),sprChr:sprites.chr,oam:sprites.oam,pal:buildBgPalFromEmu(),sprPal:buildSprPalFromEmu(),bgColor:ppuBusRead(0x3F00),tileProps:new Array(256).fill(0),captureMeta:{...emuCaptureMeta('nametable'),note:'Unscrolled logical nametable. Sprite coordinates remain screen-space; use Hybrid for the visible viewport.'}});}
function quantizeFrame(data,pal){if(!data||data.length!==256*240*4)throw new Error('No complete framebuffer to capture');pal=normalizePal(pal,pal[0][0]);const scene=makeScene({pal,bgColor:pal[0][0],chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:new Array(256).fill(0)}),rgb=pal.map(p=>p.map(n=>NP[n])),tiles=[],map=new Map(),unique=new Set();let approximatedTiles=0;
  for(let zy=0;zy<15;zy++)for(let zx=0;zx<16;zx++){let best=0,error=Infinity;for(let p=0;p<4;p++){let sum=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const o=((zy*16+y)*256+zx*16+x)*4;sum+=nearestColorIndex(rgb[p],data[o],data[o+1],data[o+2]).error;}if(sum<error){error=sum;best=p;}}
    scene.attr[(zy>>1)*8+(zx>>1)]|=best<<(((zy&1)*2+(zx&1))*2);
    for(let sub=0;sub<4;sub++){const tx=zx*2+(sub&1),ty=zy*2+(sub>>1);const tile=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{const o=((ty*8+y)*256+tx*8+x)*4;return nearestColorIndex(rgb[best],data[o],data[o+1],data[o+2]).index;})),key=tileKeyFromData(tile);unique.add(key);let id=map.get(key);if(id===undefined){if(tiles.length<256){id=tiles.length;tiles.push(tile);}else{id=findNearestExistingTile(tile,tiles);approximatedTiles++;}map.set(key,id);}scene.nt[ty*32+tx]=id;}}
  let changedPixels=0;for(let y=0;y<240;y++)for(let x=0;x<256;x++){const tr=y>>3,tc=x>>3,ab=scene.attr[(tr>>2)*8+(tc>>2)],p=(ab>>((((tr>>1)&1)*2+((tc>>1)&1))*2))&3,c=tiles[scene.nt[tr*32+tc]][y&7][x&7],color=rgb[p][c],o=(y*256+x)*4;if(color[0]!==data[o]||color[1]!==data[o+1]||color[2]!==data[o+2])changedPixels++;}while(tiles.length<256)tiles.push(blankTileData());scene.chr=tiles;scene.captureMeta={changedPixels,approximatedTiles,uniqueTilesBeforeLimit:unique.size};return scene;
}
const aud_volumes=[1,1,1,1,1];
function aud_playRow(){for(let ch=0;ch<4;ch++){const cell=S.patterns[S.orderList[aud_currentOrder]?.[ch]||0]?.rows[aud_currentRow]?.[ch];if(!cell)continue;if(cell.vol>=0)aud_volumes[ch]=cell.vol/15;if(cell.note>=0)aud_triggerNote(ch,cell.note,cell.inst>=0?cell.inst:aud_activeInst[ch]>=0?aud_activeInst[ch]:0);else if(cell.note===-2)aud_cutNote(ch);}}
function aud_chooseOrder(i){aud_currentOrder=clamp(i,0,S.orderList.length-1);aud_currentRow=0;render();}
function aud_choosePattern(order,ch){const value=prompt('Pattern index for channel '+(ch+1)+' (0–255). A new index creates a blank pattern.',String(S.orderList[order][ch]));if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<0||n>255)return reportError(new Error('Pattern index must be 0–255'));snapshot();while(S.patterns.length<=n)S.patterns.push({rows:Array.from({length:S.audRows},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))});S.orderList[order][ch]=n;aud_currentOrder=order;notify('patternOrder');}
function aud_drawEnvelopes(){const inst=S.instruments[aud_selectedInst];if(!inst)return;for(const [id,key,max,min]of [['envVol','volEnv',15,0],['envArp','arpEnv',12,-12]]){const c=document.getElementById(id),x=c.getContext('2d'),env=inst[key]?.length?inst[key]:[0];x.fillStyle='#08080c';x.fillRect(0,0,c.width,c.height);const w=c.width/env.length;env.forEach((v,i)=>{const y=(max-v)/(max-min)*(c.height-1);x.fillStyle='#5ad4ff';x.fillRect(i*w+1,y,Math.max(1,w-2),c.height-y);x.fillStyle='#fff';x.font='8px monospace';x.fillText(String(v),i*w+2,10);});}}
function aud_enterNote(note){if(aud_selectedChannel===4){showToast('DPCM sample playback is not implemented');return;}if(note>=0&&!S.instruments.length){showToast('Add an instrument first');return;}snapshot();const ch=aud_selectedChannel,p=S.patterns[S.orderList[aud_currentOrder][ch]],inst=aud_selectedInst>=0?aud_selectedInst:0;p.rows[aud_currentRow][ch]={...p.rows[aud_currentRow][ch],note,inst:note>=0?inst:-1};if(note>=0){try{aud_init();aud_ctx.resume().catch(reportError);aud_triggerNote(ch,note,inst);clearTimeout(previewTimeout);if(!aud_playing)previewTimeout=setTimeout(()=>aud_cutNote(ch),250);}catch(e){reportError(e);}}else aud_cutNote(ch);notify('audioNote');}

function openSyncChannel(){try{return typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nes-forge:'+syncSession):null;}catch(e){return null;}}

// ═══════════════════════════════════════════════
// UNDO / COPY / PASTE SYSTEM
// ═══════════════════════════════════════════════
const undoStack=[];
const MAX_UNDO=80;
let clipboard=null; // {tile: [8][8]} or null
let undoPaused=false;

function snapshot(){if(undoPaused)return;const snap=db_serializeState();undoStack.push(snap);undoBytes+=snap.length;redoStack.length=0;while(undoStack.length>MAX_UNDO||(undoBytes>24*1024*1024&&undoStack.length>1))undoBytes-=undoStack.shift().length;document.getElementById('undoBtn').disabled=false;}

function undo(){if(!undoStack.length)return;redoStack.push(db_serializeState());const snap=undoStack.pop();undoBytes-=snap.length;db_deserializeState(snap,{history:true});document.getElementById('undoBtn').disabled=!undoStack.length;broadcastState('undo');showToast('Undo • '+undoStack.length+' remaining');}

function copyTile(){const isSprite=S.tab==='sprites';const tiles=isSprite?S.sprChr:S.tab==='chr'?activeChr():S.chr;const idx=isSprite?getSprEditTile():S.tab==='chr'?S.editTile:S.selTile;clipboard=tiles[idx].map(r=>[...r]);document.getElementById('pasteBtn').disabled=false;showToast('Copied '+(isSprite||(S.tab==='chr'&&S.chrBank==='spr')?'sprite':'background')+' tile $'+idx.toString(16).toUpperCase().padStart(2,'0'));}

function pasteTile(){if(!clipboard)return;snapshot();const tiles=S.tab==='sprites'?S.sprChr:S.tab==='chr'?activeChr():S.chr;const idx=S.tab==='sprites'?getSprEditTile():S.tab==='chr'?S.editTile:S.selTile;tiles[idx]=clipboard.map(r=>[...r]);notify('paste');}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._tm);
  t._tm=setTimeout(()=>t.classList.remove('show'),1400);
}

// Keyboard shortcuts


// ═══════════════════════════════════════════════
// NES COLOR PICKER
// ═══════════════════════════════════════════════
let pickerTarget=null; // {pal:int, idx:int, isSpr:bool} - which palette slot we're editing

function openPicker(palIdx, colorIdx, anchorEl, isSpr){
  pickerTarget={pal:palIdx, idx:colorIdx, isSpr:!!isSpr};
  const palArr=isSpr?S.sprPal:S.pal;
  const picker=document.getElementById('nesPicker');
  const grid=document.getElementById('npGrid');
  const curNes=palArr[palIdx][colorIdx];

  document.getElementById('npTarget').textContent='Pal '+palIdx+', Color '+colorIdx;
  document.getElementById('npCurHex').textContent='$'+curNes.toString(16).toUpperCase().padStart(2,'0');
  document.getElementById('npHoverHex').textContent='—';

  grid.innerHTML='';
  // NES 2C02 has 4 rows x 16 columns = 64 entries
  for(let i=0;i<64;i++){
    const cell=document.createElement('div');
    cell.className='np-cell'+(i===curNes?' cur':'');
    const rgb=NP[i]||[0,0,0];
    cell.style.background='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    // Dim the known-bad entries
    if(i===0x0D||i>=0x0E&&i<=0x0F||i>=0x1E&&i<=0x1F||i>=0x2E&&i<=0x2F||i>=0x3E&&i<=0x3F){
      cell.style.opacity='0.3';
    }
    const hex='$'+i.toString(16).toUpperCase().padStart(2,'0');
    cell.title=hex;
    const hexLabel=document.createElement('span');
    hexLabel.className='np-hex';hexLabel.textContent=hex;
    cell.appendChild(hexLabel);
    cell.onmouseenter=()=>{document.getElementById('npHoverHex').textContent=hex};
    cell.onclick=()=>{pickColor(i)};
    grid.appendChild(cell);
  }

  // Position near the anchor element
  const rect=anchorEl.getBoundingClientRect();
  picker.style.left=Math.min(rect.left, window.innerWidth-340)+'px';
  picker.style.top=Math.min(rect.bottom+4, window.innerHeight-260)+'px';
  picker.classList.add('show');
}

function closePicker(){document.getElementById('nesPicker')?.classList.remove('show');pickerTarget=null;}

function pickColor(nesIdx){if(!pickerTarget)return;const target={...pickerTarget};nesIdx=clamp(nesIdx,0,63);snapshot();const pal=target.isSpr?S.sprPal:S.pal;if(target.idx===0){for(const p of [...S.pal,...S.sprPal])p[0]=nesIdx;S.scenes[S.activeScene].bgColor=nesIdx;document.getElementById('spBgColor').value=nesIdx;}else pal[target.pal][target.idx]=nesIdx;closePicker();buildPalEditor();buildSprPalEditor();sp_updateBgPreview();notify('palette');showToast((target.isSpr?'SP':'P')+target.pal+'['+target.idx+'] = $'+nesIdx.toString(16).toUpperCase().padStart(2,'0'));}

// Close picker on outside click
document.addEventListener('mousedown',function(e){
  const picker=document.getElementById('nesPicker');
  if(picker.classList.contains('show')&&!picker.contains(e.target)){
    if(!e.target.classList.contains('pal-edit')) closePicker();
  }
});

// Decode CHR binary into tile arrays
function initCHR(){
  S.chr=[];
  for(let i=0;i<256;i++){
    const t=[];const b=i*16;
    for(let y=0;y<8;y++){
      const p0=_CHR[b+y],p1=_CHR[b+y+8],r=[];
      for(let x=0;x<8;x++) r.push(((p0>>(7-x))&1)|(((p1>>(7-x))&1)<<1));
      t.push(r);
    }
    S.chr.push(t);
  }
}
initCHR();

// Init empty sprite CHR bank (256 tiles, all blank)
function initSprCHR(){
  S.sprChr=[];
  for(let i=0;i<256;i++){
    const t=[];
    for(let y=0;y<8;y++) t.push([0,0,0,0,0,0,0,0]);
    S.sprChr.push(t);
  }
}
initSprCHR();

// ═══════════════════════════════════════════════
// SCENE MANAGEMENT
// ═══════════════════════════════════════════════

function saveCurrentScene(){const sc=S.scenes[S.activeScene];if(!sc)return;for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr','tileProps'])sc[key]=copyData(S[key]);sc.bgColor=S.pal[0][0];sceneLinks(sc);}

function loadSceneData(idx){const sc=S.scenes[idx];if(!sc)throw new Error('Scene does not exist');for(const key of ['nt','attr','pal','sprPal','oam'])S[key]=copyData(sc[key]);if(sc.chr)S.chr=copyData(sc.chr);if(sc.sprChr)S.sprChr=copyData(sc.sprChr);if(sc.tileProps)S.tileProps=[...sc.tileProps];S.selSprite=S.oam.length?0:-1;S.selEntity=-1;S.entPlaceTool=null;findLastTile=-1;if(typeof sp_loadUI==='function')sp_loadUI(sc);}

function switchScene(idx){if(!Number.isInteger(idx)||idx<0||idx>=S.scenes.length||idx===S.activeScene)return;saveCurrentScene();S.activeScene=idx;loadSceneData(idx);rebuildAllUI();broadcastState('sceneSelect');showToast('Scene: '+S.scenes[idx].name);}

function addScene(){if(S.scenes.length>=64)return reportError(new Error('Editor limit is 64 scenes; the default ROM viewer supports 7.'));snapshot();saveCurrentScene();const sc=makeScene({name:'Scene '+(S.scenes.length+1),chr:normalizeTiles(),sprChr:normalizeTiles(),tileProps:new Array(256).fill(0)});S.scenes.push(sc);S.activeScene=S.scenes.length-1;loadSceneData(S.activeScene);rebuildAllUI();broadcastState('sceneAdd');showToast('Added '+sc.name);}

function dupScene(){if(S.scenes.length>=64)return reportError(new Error('Editor scene limit reached'));snapshot();saveCurrentScene();const sc=makeScene({...copyData(S.scenes[S.activeScene]),id:null,name:S.scenes[S.activeScene].name+' copy'});S.scenes.push(sc);S.activeScene=S.scenes.length-1;loadSceneData(S.activeScene);rebuildAllUI();broadcastState('sceneDuplicate');}

function delScene(){if(S.scenes.length<=1){showToast('Keep at least one scene');return;}if(!confirm('Delete "'+S.scenes[S.activeScene].name+'"? This can be undone.'))return;snapshot();const index=S.activeScene;S.scenes.splice(index,1);S.scenes.forEach(sc=>{for(const e of sc.entities||[])if(e.type==='door'){if(e.targetScene===index)e.targetScene=-1;else if(e.targetScene>index)e.targetScene--;}sceneLinks(sc);});S.activeScene=Math.min(index,S.scenes.length-1);loadSceneData(S.activeScene);rebuildAllUI();broadcastState('sceneDelete');}

function renameScene(){const value=prompt('Scene name:',S.scenes[S.activeScene].name);if(value?.trim()){snapshot();S.scenes[S.activeScene].name=value.trim().slice(0,120);markEdited('renameScene');}}

function renderSceneThumb(sc,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const full=document.createElement('canvas');full.width=256;full.height=240;const x=full.getContext('2d'),chr=sc.chr||S.chr;const image=x.createImageData(256,240);for(let y=0;y<240;y++)for(let px=0;px<256;px++){const tc=px>>3,tr=y>>3,t=chr[sc.nt[tr*32+tc]||0],ci=t?.[y&7]?.[px&7]||0,ab=sc.attr[(tr>>2)*8+(tc>>2)]||0,p=(ab>>((((tr>>1)&1)*2+((tc>>1)&1))*2))&3;const rgb=NP[ci?sc.pal[p][ci]:sc.pal[0][0]];const o=(y*256+px)*4;image.data.set([...rgb,255],o);}x.putImageData(image,0,0);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(full,0,0,w,h);return c;}
function sceneSourceBadge(sc){
  if(!sc.captureMeta) return '<span class="st-badge authored">authored</span>';
  if(sc.captureMeta.mode==='visible-frame') return '<span class="st-badge baked">baked</span>';
  if(sc.captureMeta.mode) return '<span class="st-badge captured">captured</span>';
  return '<span class="st-badge imported">imported</span>';
}
function buildSceneSel(){
  // Hidden select kept for any code referencing it
  const sel=document.getElementById('sceneSel');
  if(sel){
    sel.innerHTML='';
    S.scenes.forEach((sc,i)=>{
      const opt=document.createElement('option');
      opt.value=i;opt.textContent=(i+1)+': '+sc.name;
      if(i===S.activeScene)opt.selected=true;
      sel.appendChild(opt);
    });
  }
  window.Forge?.services?.SceneContextUI?.refresh();
  // Thumbnail browser
  const browser=document.getElementById('sceneBrowser');
  if(!browser)return;
  browser.innerHTML='';
  S.scenes.forEach((sc,i)=>{
    const div=document.createElement('div');
    div.className='scene-thumb'+(i===S.activeScene?' active':'');
    div.onclick=()=>switchScene(i);
    const typeStr=(sc.sceneType||'sideview');
    const scrollStr=(sc.scrollDir||'none');
    div.title=sc.name+' ['+typeStr+'/'+scrollStr+']';
    try{
      const thumb=renderSceneThumb(sc,52,46);
      div.appendChild(thumb);
    }catch(e){/* thumbnail render failed, skip */}
    const nameEl=document.createElement('div');
    nameEl.className='st-name';
    nameEl.textContent=(i+1)+': '+sc.name;
    div.appendChild(nameEl);
    div.insertAdjacentHTML('beforeend',sceneSourceBadge(sc));
    browser.appendChild(div);
  });
}
buildSceneSel();

// ═══════════════════════════════════════════════
// v8: SCENE PROPERTIES / ENTITIES / LINKS
// ═══════════════════════════════════════════════
function sp_loadUI(sc){
  const el=id=>document.getElementById(id);
  if(el('spType')) el('spType').value=sc.sceneType||'sideview';
  if(el('spScroll')) el('spScroll').value=sc.scrollDir||'horizontal';
  if(el('spBgColor')) el('spBgColor').value=sc.bgColor!==undefined?sc.bgColor:15;
  if(el('spGravity')) el('spGravity').value=sc.gravity!==undefined?sc.gravity:1;
  sp_updateBgPreview();
  // View
  const v=sc.view||{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24};
  if(el('viewW')) el('viewW').value=v.w;
  if(el('viewH')) el('viewH').value=v.h;
  if(el('viewHB')) el('viewHB').value=v.hBorder;
  if(el('viewVB')) el('viewVB').value=v.vBorder;
  // Rebuild entity toolbar, list, links
  ent_buildToolbar();
  ent_buildList();
  link_buildList();
}
function sp_update(){snapshot();const sc=S.scenes[S.activeScene];sc.sceneType=document.getElementById('spType').value;sc.scrollDir=document.getElementById('spScroll').value;sc.bgColor=clamp(document.getElementById('spBgColor').value,0,63,15);sc.gravity=clamp(document.getElementById('spGravity').value,-1,2,1);for(const p of [...S.pal,...S.sprPal])p[0]=sc.bgColor;sp_updateBgPreview();buildPalEditor();notify('sceneProperties');}
function sp_updateBgPreview(){const idx=clamp(document.getElementById('spBgColor')?.value,0,63,15);const rgb=NP[idx];const el=document.getElementById('spBgPreview');if(el)el.style.background='rgb('+rgb.join(',')+')';}

// ═══════════════════════════════════════════════
// v8: ENTITY / OBJECT SYSTEM
// ═══════════════════════════════════════════════

const _defEt={name:'Unknown',icon:'?',color:'#888',w:16,h:16};
function _et(type){return (S.entityTypes||[]).find(t=>t.id===type)||(S.entityTypes||[])[0]||_defEt}

function ent_getScene(){return S.scenes[S.activeScene]}
function ent_list(){return ent_getScene().entities||[]}
function ent_ensureList(){const sc=ent_getScene();if(!sc.entities)sc.entities=[];return sc.entities}

function ent_buildToolbar(){
  const tb=document.getElementById('entToolbar');
  if(!tb)return;
  tb.innerHTML='';
  if(!S.entityTypes||!S.entityTypes.length)return;
  S.entityTypes.forEach(et=>{
    const b=document.createElement('button');
    b.textContent=et.icon+' '+et.name;
    b.title='Place '+et.name;
    b.style.borderLeftColor=et.color;b.style.borderLeftWidth='3px';
    if(S.entPlaceTool===et.id) b.classList.add('ent-active');
    b.onclick=()=>{S.entPlaceTool=S.entPlaceTool===et.id?null:et.id;ent_buildToolbar();};
    tb.appendChild(b);
  });
}

function ent_buildList(){
  const list=document.getElementById('entList');
  const countEl=document.getElementById('entCount');
  if(!list)return;
  const ents=ent_list();
  if(countEl) countEl.textContent=ents.length;
  list.innerHTML='';
  if(ents.length===0){list.innerHTML='<span style="color:var(--dim);padding:4px;display:block;font-size:8px">No entities placed yet.</span>';document.getElementById('entPropsPanel').style.display='none';return}
  ents.forEach((e,i)=>{
    const et=_et(e.type);
    const row=document.createElement('div');
    row.className='ent-slot'+(i===S.selEntity?' sel':'');
    const icon=document.createElement('div');icon.className='ent-icon';
    icon.style.background=et.color;icon.textContent=et.icon;
    row.appendChild(icon);
    const info=document.createElement('span');
    info.textContent='#'+i+' '+et.name+' ('+e.x+','+e.y+')'+(e.name?' "'+e.name+'"':'');
    info.style.flex='1';
    row.appendChild(info);
    row.onclick=()=>{S.selEntity=i;ent_buildList();ent_buildProps();render()};
    list.appendChild(row);
  });
  ent_buildProps();
}

function ent_buildProps(){
  const panel=document.getElementById('entPropsPanel');
  const pp=document.getElementById('entProps');
  if(!panel||!pp)return;
  const ents=ent_list();
  if(S.selEntity<0||S.selEntity>=ents.length){panel.style.display='none';return}
  panel.style.display='block';
  const e=ents[S.selEntity];
  const et=_et(e.type);
  let h='';
  h+='<label>Type</label><select onchange="ent_setProp(\'type\',this.value)">';
  (S.entityTypes||[]).forEach(t=>{h+='<option value="'+t.id+'"'+(t.id===e.type?' selected':'')+'>'+t.icon+' '+t.name+'</option>'});
  h+='</select>';
  h+='<label>Name</label><input type="text" value="'+esc(e.name||'')+'" onchange="ent_setProp(\'name\',this.value)" placeholder="optional">';
  h+='<label>X</label><input type="number" value="'+e.x+'" min="0" max="255" onchange="ent_setProp(\'x\',+this.value)">';
  h+='<label>Y</label><input type="number" value="'+e.y+'" min="0" max="239" onchange="ent_setProp(\'y\',+this.value)">';
  // Type-specific properties
  if(e.type==='enemy'){
    h+='<label>Variant</label><select onchange="ent_setProp(\'variant\',+this.value)">';
    ['0-Walker','1-Flyer','2-Jumper','3-Shooter','4-Boss'].forEach((v,i)=>{h+='<option value="'+i+'"'+(e.variant===i?' selected':'')+'>'+v+'</option>'});
    h+='</select>';
    h+='<label>Dir</label><select onchange="ent_setProp(\'dir\',+this.value)"><option value="0"'+(e.dir===0?' selected':'')+'>Left</option><option value="1"'+(e.dir===1?' selected':'')+'>Right</option></select>';
    h+='<label>Speed</label><input type="number" value="'+(e.speed||1)+'" min="0" max="8" onchange="ent_setProp(\'speed\',+this.value)">';
  }
  if(e.type==='item'){
    h+='<label>Item</label><select onchange="ent_setProp(\'variant\',+this.value)">';
    ['0-Coin','1-Heart','2-Key','3-Powerup','4-1UP','5-Custom'].forEach((v,i)=>{h+='<option value="'+i+'"'+(e.variant===i?' selected':'')+'>'+v+'</option>'});
    h+='</select>';
  }
  if(e.type==='door'){
    h+='<label>To Scene</label><select onchange="ent_setProp(\'targetScene\',+this.value)"><option value="-1"'+(e.targetScene<0?' selected':'')+'>Unlinked</option>';
    S.scenes.forEach((sc,si)=>{h+='<option value="'+si+'"'+(e.targetScene===si?' selected':'')+'>'+esc(sc.name)+'</option>'});
    h+='</select>';
    h+='<label>To X</label><input type="number" value="'+(e.targetX||0)+'" min="0" max="255" onchange="ent_setProp(\'targetX\',+this.value)">';
    h+='<label>To Y</label><input type="number" value="'+(e.targetY||0)+'" min="0" max="239" onchange="ent_setProp(\'targetY\',+this.value)">';
  }
  if(e.type==='trigger'){
    h+='<label>Action</label><select onchange="ent_setProp(\'action\',this.value)">';
    ['dialog','cutscene','sound','flag','custom'].forEach(a=>{h+='<option value="'+a+'"'+(e.action===a?' selected':'')+'>'+a+'</option>'});
    h+='</select>';
    h+='<label>Value</label><input type="text" value="'+esc(e.value||'')+'" onchange="ent_setProp(\'value\',this.value)" placeholder="param">';
  }
  if(e.type==='platform'){
    h+='<label>Width</label><input type="number" value="'+(e.pw||16)+'" min="8" max="128" step="8" onchange="ent_setProp(\'pw\',+this.value)">';
    h+='<label>Move</label><select onchange="ent_setProp(\'moveDir\',this.value)">';
    ['none','horizontal','vertical','circular'].forEach(d=>{h+='<option value="'+d+'"'+(e.moveDir===d?' selected':'')+'>'+d+'</option>'});
    h+='</select>';
    h+='<label>Range</label><input type="number" value="'+(e.range||32)+'" min="0" max="128" step="8" onchange="ent_setProp(\'range\',+this.value)">';
  }
  if(e.type==='npc'){
    h+='<label>Dialog</label><input type="text" value="'+esc(e.dialog||'')+'" onchange="ent_setProp(\'dialog\',this.value)" placeholder="text">';
    h+='<label>Facing</label><select onchange="ent_setProp(\'dir\',+this.value)"><option value="0"'+(e.dir===0?' selected':'')+'>Left</option><option value="1"'+(e.dir===1?' selected':'')+'>Right</option></select>';
  }
  // Sprite tile binding
  h+='<label>Sprite</label><input type="number" value="'+(e.sprTile!==undefined?e.sprTile:-1)+'" min="-1" max="255" onchange="ent_setProp(\'sprTile\',+this.value)" title="-1=use icon, 0-255=sprite CHR tile">';
  pp.innerHTML=h;
}

function ent_setProp(prop,val){const ents=ent_list();if(!ents[S.selEntity])return;const allowed=new Set(['type','name','x','y','variant','dir','speed','targetScene','targetX','targetY','action','value','pw','moveDir','range','dialog','sprTile']);if(!allowed.has(prop))return;snapshot();if(['x','targetX'].includes(prop))val=clamp(val,0,255);if(['y','targetY'].includes(prop))val=clamp(val,0,239);if(prop==='targetScene')val=clamp(val,-1,S.scenes.length-1,-1);if(prop==='sprTile')val=clamp(val,-1,255,-1);if(typeof val==='string')val=val.slice(0,1024);ents[S.selEntity][prop]=val;link_rebuild();ent_buildList();notify('entityProperty');}

function ent_place(x,y){
  if(!S.entPlaceTool)return false;
  snapshot();
  const ents=ent_ensureList();
  const e={type:S.entPlaceTool,x:x,y:y,name:''};
  if(e.type==='enemy'){e.variant=0;e.dir=0;e.speed=1}
  if(e.type==='item'){e.variant=0}
  if(e.type==='door'){e.targetScene=0;e.targetX=128;e.targetY=120}
  if(e.type==='trigger'){e.action='dialog';e.value=''}
  if(e.type==='platform'){e.pw=16;e.moveDir='none';e.range=32}
  if(e.type==='npc'){e.dialog='';e.dir=1}
  e.sprTile=-1;
  ents.push(e);
  S.selEntity=ents.length-1;
  if(e.type==='door') link_rebuild();
  ent_buildList();
  showToast('Placed '+S.entPlaceTool+' at ('+x+','+y+')');
  return true;
}

function ent_delete(){
  const ents=ent_list();
  if(S.selEntity<0||S.selEntity>=ents.length)return;
  snapshot();
  const was=ents[S.selEntity].type;
  ents.splice(S.selEntity,1);
  S.selEntity=Math.min(S.selEntity,ents.length-1);
  link_rebuild();
  ent_buildList();notify('entityDelete');
  showToast('Deleted entity');
}

function ent_hitTest(px,py){
  const ents=ent_list();
  for(let i=ents.length-1;i>=0;i--){
    const e=ents[i];
    const sz=e.type==='platform'?(e.pw||16):12;
    if(px>=e.x-sz/2&&px<e.x+sz/2&&py>=e.y-6&&py<e.y+6) return i;
  }
  return -1;
}

// Draw entities on scene canvas
function ent_drawAll(bx,z){
  const ents=ent_list();
  ents.forEach((e,i)=>{
    const et=_et(e.type);
    const x=e.x*z,y=e.y*z;
    // If bound to a sprite tile, draw that
    if(e.sprTile>=0&&e.sprTile<256){
      drawSpriteTile(bx,e.x-4,e.y-4,e.sprTile,0,z,false,false);
    }
    // Draw entity marker
    const sz=e.type==='platform'?((e.pw||16)*z):(12*z);
    const hh=12*z;
    bx.fillStyle=et.color;bx.globalAlpha=0.45;
    bx.fillRect(x-sz/2,y-hh/2,sz,hh);bx.globalAlpha=1;
    bx.strokeStyle=i===S.selEntity?'#fff':et.color;
    bx.lineWidth=i===S.selEntity?2:1;
    bx.strokeRect(x-sz/2,y-hh/2,sz,hh);
    // Icon
    bx.fillStyle='#fff';
    bx.font=Math.max(8,8*z)+'px monospace';
    bx.textAlign='center';bx.textBaseline='middle';
    bx.fillText(et.icon,x,y);
    // Label
    if(z>=2){
      bx.font=Math.max(6,5*z)+'px monospace';
      bx.fillStyle=et.color;
      bx.fillText(e.name||et.name,x,y+hh/2+4*z);
    }
    // Door: draw line to indicate connection
    if(e.type==='door'&&e.targetScene!==undefined&&e.targetScene!==S.activeScene){
      bx.setLineDash([3*z,3*z]);
      bx.strokeStyle='#48c';bx.lineWidth=1;
      bx.beginPath();bx.moveTo(x,y);bx.lineTo(x,y-20*z);bx.stroke();
      bx.setLineDash([]);
      bx.fillStyle='#48c';bx.font=Math.max(6,5*z)+'px monospace';
      bx.fillText('→'+S.scenes[e.targetScene]?.name,x,y-22*z);
    }
    // Platform: show movement range
    if(e.type==='platform'&&e.moveDir&&e.moveDir!=='none'){
      bx.setLineDash([2*z,2*z]);bx.strokeStyle='#88cccc80';bx.lineWidth=1;
      const r=(e.range||32)*z;
      if(e.moveDir==='horizontal'){bx.beginPath();bx.moveTo(x-r,y);bx.lineTo(x+r,y);bx.stroke()}
      if(e.moveDir==='vertical'){bx.beginPath();bx.moveTo(x,y-r);bx.lineTo(x,y+r);bx.stroke()}
      bx.setLineDash([]);
    }
  });
  bx.textAlign='start';bx.textBaseline='alphabetic';
}

// ═══════════════════════════════════════════════
// v8: CAMERA / VIEW OVERLAY
// ═══════════════════════════════════════════════
function view_update(){snapshot();const sc=S.scenes[S.activeScene];sc.view={...sc.view,w:clamp(document.getElementById('viewW').value,64,512,256),h:clamp(document.getElementById('viewH').value,64,480,240),hBorder:clamp(document.getElementById('viewHB').value,0,128),vBorder:clamp(document.getElementById('viewVB').value,0,120)};notify('camera');}

function view_drawOverlay(bx,z){
  if(!document.getElementById('viewShow')||!document.getElementById('viewShow').checked)return;
  const sc=S.scenes[S.activeScene];
  const v=sc.view||{x:0,y:0,w:256,h:240,hBorder:32,vBorder:24};
  // Draw viewport boundary
  bx.strokeStyle='rgba(90,212,255,0.5)';bx.lineWidth=2;
  bx.setLineDash([6,4]);
  bx.strokeRect(v.x*z,v.y*z,v.w*z,v.h*z);
  bx.setLineDash([]);
  // Draw camera follow borders
  if(v.hBorder>0||v.vBorder>0){
    bx.strokeStyle='rgba(90,212,255,0.2)';bx.lineWidth=1;
    bx.setLineDash([3,3]);
    bx.strokeRect((v.x+v.hBorder)*z,(v.y+v.vBorder)*z,(v.w-v.hBorder*2)*z,(v.h-v.vBorder*2)*z);
    bx.setLineDash([]);
  }
  // Label
  bx.fillStyle='rgba(90,212,255,0.6)';bx.font=Math.max(7,6*z)+'px monospace';
  bx.fillText('VIEW '+v.w+'x'+v.h,(v.x+2)*z,(v.y+8)*z);
  // Scene type indicator
  const sc2=S.scenes[S.activeScene];
  const typeLabel=(sc2.sceneType||'sideview').toUpperCase();
  const scrollLabel=(sc2.scrollDir||'none').toUpperCase();
  bx.fillStyle='rgba(138,245,122,0.4)';
  bx.fillText(typeLabel+' / '+scrollLabel,(v.x+2)*z,(v.y+v.h-4)*z);
}

// ═══════════════════════════════════════════════
// v8: SCENE LINKS
// ═══════════════════════════════════════════════
function link_rebuild(){sceneLinks(S.scenes[S.activeScene]);link_buildList();}

function link_buildList(){
  const el=document.getElementById('linkList');
  if(!el)return;
  const sc=S.scenes[S.activeScene];
  const links=sc.links||[];
  if(links.length===0){el.innerHTML='<span style="color:var(--dim);padding:4px;display:block;font-size:8px">No links. Add Door entities to create scene connections.</span>';return}
  el.innerHTML='';
  links.forEach((l,i)=>{
    const row=document.createElement('div');row.className='link-row';
    const tgt=S.scenes[l.targetScene];
    row.innerHTML='<span>Door #'+l.entIdx+'</span> → <span>'+esc(tgt?tgt.name:'Unlinked')+'</span> ('+l.targetX+','+l.targetY+')'+
      ' <span class="link-del" onclick="link_remove('+i+')" title="Remove link">&times;</span>';
    el.appendChild(row);
  });
}

function link_remove(idx){const sc=S.scenes[S.activeScene],link=sc.links[idx];if(!link)return;snapshot();const e=sc.entities[link.entIdx];if(e)e.targetScene=-1;link_rebuild();ent_buildProps();notify('unlink');}


// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function getPal(c,r){
  const ai=Math.floor(r/4)*8+Math.floor(c/4);
  if(ai>=S.attr.length)return 0;
  const ab=S.attr[ai],sc=Math.floor(c/2)%2,sr=Math.floor(r/2)%2;
  return(ab>>((sr*2+sc)*2))&3;
}
function setPalQuad(attrIdx,quad,palVal){
  const shift=quad*2;
  S.attr[attrIdx]=(S.attr[attrIdx]&~(3<<shift))|((palVal&3)<<shift);
}
function getZone(r){return r<4?'Sky':r<8?'Wall':r<18?'Machine':r<25?'Walk':r<27?'Gnd':'HUD'}
function tileUsage(){const u={};S.nt.forEach(t=>{u[t]=(u[t]||0)+1});return u}
function uniqueTiles(){return new Set(S.nt).size}
function metaCount(){
  const m=new Set();
  for(let mr=0;mr<15;mr++)for(let mc=0;mc<16;mc++){
    const r=mr*2,c=mc*2;
    m.add(S.nt[r*32+c]+','+S.nt[r*32+c+1]+','+S.nt[(r+1)*32+c]+','+S.nt[(r+1)*32+c+1]);
  }
  return m.size;
}

// ═══════════════════════════════════════════════
// CANVAS + RENDERING
// ═══════════════════════════════════════════════
const cv=document.getElementById('cv'),cx=cv.getContext('2d');

function drawTileAt(bx,sx,sy,ti,pi,z){const pl=S.pal[pi]||S.pal[0],tile=S.chr[ti]||S.chr[0];if(!tile)return;for(let y=0;y<8;y++)for(let x=0;x<8;x++){const ci=tile[y][x],rgb=NP[ci?pl[ci]:S.pal[0][0]]||NP[15];bx.fillStyle='rgb('+rgb.join(',')+')';bx.fillRect((sx+x)*z,(sy+y)*z,z,z);}}

// Draw a sprite tile with flip support and transparency (color 0 = transparent)
function drawSpriteTile(bx,sx,sy,ti,palIdx,z,flipH,flipV){
  const pl=S.sprPal[palIdx],tile=S.sprChr[ti];
  if(!tile)return;
  for(let py=0;py<8;py++)for(let px=0;px<8;px++){
    const ry=flipV?7-py:py, rx=flipH?7-px:px;
    const ci=tile[ry][rx];
    if(ci===0) continue; // transparent
    const nc=pl[ci],rgb=NP[nc]||[0,0,0];
    bx.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    bx.fillRect((sx+px)*z,(sy+py)*z,z,z);
  }
}

// Draw sprite tile for preview (no transparency — show color 0)
function drawSpriteTileSolid(bx,sx,sy,ti,palIdx,z){
  const pl=S.sprPal[palIdx],tile=S.sprChr[ti];
  if(!tile)return;
  for(let py=0;py<8;py++)for(let px=0;px<8;px++){
    const nc=pl[tile[py][px]],rgb=NP[nc]||[0,0,0];
    bx.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    bx.fillRect((sx+px)*z,(sy+py)*z,z,z);
  }
}

function setChrBank(bank){
  S.chrBank=bank;
  document.getElementById('bankBg').classList.toggle('on',bank==='bg');
  document.getElementById('bankSpr').classList.toggle('on',bank==='spr');
  render();
}

// ── CHR Bank Browser (for imported ROMs with multiple banks) ──
function updateChrBankBrowser(){
  const panel=document.getElementById('chrBankBrowser');
  const sel=document.getElementById('chrBankSel');
  if(!panel||!sel)return;
  if(S.allChrBanks.length<=2){panel.style.display='none';return}
  panel.style.display='block';
  sel.innerHTML='';
  S.allChrBanks.forEach((b,i)=>{
    const o=document.createElement('option');
    o.value=i;o.textContent=b.label||('Bank '+i);
    if(i===S.chrBankIdx)o.selected=true;
    sel.appendChild(o);
  });
}
function loadChrBankFromRom(idx){if(!S.allChrBanks[idx])return;S.chrBankIdx=idx;showToast('Selected '+S.allChrBanks[idx].label+' — click → BG or → Spr to apply.');}
function loadChrBankAsBg(){
  const idx=S.chrBankIdx;
  if(idx<0||idx>=S.allChrBanks.length)return;
  snapshot();
  S.chr=S.allChrBanks[idx].tiles.map(t=>t.map(r=>[...r]));
  notify('chrBankSwap');
  showToast(S.allChrBanks[idx].label+' → BG tiles');
}
function loadChrBankAsSpr(){
  const idx=S.chrBankIdx;
  if(idx<0||idx>=S.allChrBanks.length)return;
  snapshot();
  S.sprChr=S.allChrBanks[idx].tiles.map(t=>t.map(r=>[...r]));
  notify('chrBankSwap');
  showToast(S.allChrBanks[idx].label+' → Sprite tiles');
}

// Get active CHR bank array
function activeChr(){return S.chrBank==='spr'?S.sprChr:S.chr}
// Get active palette array for CHR editing
function activePalArr(){return S.chrBank==='spr'?S.sprPal:S.pal}

// Scanline overflow detection
function scanlineCheck(){const counts=new Uint8Array(240);for(const s of S.oam)if(s.active)for(let y=s.y;y<Math.min(240,s.y+(s.height===16?16:8));y++)if(y>=0)counts[y]++;return Array.from(counts, (count,line)=>({line,count})).filter(x=>x.count>8);}

function renderScene(){
  const z=+document.getElementById('oZoom').value;
  cv.width=256*z;cv.height=240*z;cx.imageSmoothingEnabled=false;
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){
    drawTileAt(cx,tc*8,tr*8,S.nt[tr*32+tc],getPal(tc,tr),z);
  }
  const sg=document.getElementById('oGrid').checked,sa=document.getElementById('oAttr').checked,sm=document.getElementById('oMeta').checked;
  if(sg){cx.strokeStyle='rgba(255,255,255,0.08)';cx.lineWidth=1;
    for(let x=0;x<=256;x+=8){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,240*z);cx.stroke()}
    for(let y=0;y<=240;y+=8){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(256*z,y*z);cx.stroke()}}
  if(sa){const ac=['rgba(40,120,255,0.18)','rgba(255,60,60,0.18)','rgba(100,255,100,0.18)','rgba(255,200,40,0.18)'];
    for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){cx.fillStyle=ac[getPal(tc,tr)];cx.fillRect(tc*8*z,tr*8*z,8*z,8*z)}
    cx.strokeStyle='rgba(255,255,0,0.35)';cx.lineWidth=2;
    for(let x=0;x<=256;x+=32){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,240*z);cx.stroke()}
    for(let y=0;y<=240;y+=32){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(256*z,y*z);cx.stroke()}}
  if(sm){cx.strokeStyle='rgba(0,255,200,0.25)';cx.lineWidth=1;
    for(let x=0;x<=256;x+=16){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,240*z);cx.stroke()}
    for(let y=0;y<=240;y+=16){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(256*z,y*z);cx.stroke()}}
  // Draw sprites on scene
  drawSpritesOnCanvas(cx,z,false);
  ent_drawAll(cx,z);view_drawOverlay(cx,z);
}

function renderCHR(){
  updateChrBankBrowser();
  const z=3;cv.width=128*z;cv.height=128*z;cx.imageSmoothingEnabled=false;
  cx.fillStyle='#000';cx.fillRect(0,0,cv.width,cv.height);
  const chrArr=activeChr();
  const palArr=activePalArr();
  const u=S.chrBank==='bg'?tileUsage():{};
  // For sprite bank, count how many OAM entries use each tile
  const sprU={};
  if(S.chrBank==='spr') S.oam.forEach(spr=>{if(spr.active) sprU[spr.tile]=(sprU[spr.tile]||0)+1});
  const usage=S.chrBank==='spr'?sprU:u;
  for(let i=0;i<256;i++){
    const tx=(i%16)*8,ty=Math.floor(i/16)*8;
    const cnt=usage[i]||0;
    for(let py=0;py<8;py++)for(let px=0;px<8;px++){
      const ci=chrArr[i][py][px];
      let r=ci*85,g=ci*85,b=ci*85;
      if(S.chrBank==='spr'){
        // Sprite bank: tint by sprite usage
        if(cnt===0){b=Math.min(255,b+25)} else if(cnt<=2){g=Math.min(255,g+25)} else {r=Math.min(255,r+20);g=Math.min(255,g+20)}
      } else {
        if(cnt<=1){r=Math.min(255,r+35)} else if(cnt<=2){r=Math.min(255,r+20);g=Math.min(255,g+20)} else {g=Math.min(255,g+25)}
      }
      cx.fillStyle='rgb('+r+','+g+','+b+')';
      cx.fillRect((tx+px)*z,(ty+py)*z,z,z);
    }
    if(i===S.editTile){cx.strokeStyle='#5ad4ff';cx.lineWidth=2;cx.strokeRect(tx*z,ty*z,8*z,8*z)}
  }
  cx.strokeStyle='rgba(80,200,255,0.12)';cx.lineWidth=1;
  for(let x=0;x<=128;x+=8){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,128*z);cx.stroke()}
  for(let y=0;y<=128;y+=8){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(128*z,y*z);cx.stroke()}
}

function renderMeta(){
  const z=+document.getElementById('oZoom').value;cv.width=256*z;cv.height=240*z;cx.imageSmoothingEnabled=false;
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++) drawTileAt(cx,tc*8,tr*8,S.nt[tr*32+tc],getPal(tc,tr),z);
  cx.fillStyle='rgba(0,0,0,0.35)';cx.fillRect(0,0,cv.width,cv.height);
  const mm={};let mi=0;const hues=[];for(let i=0;i<240;i++)hues.push((i*41)%360);
  for(let mr=0;mr<15;mr++)for(let mc=0;mc<16;mc++){
    const r=mr*2,c=mc*2,k=S.nt[r*32+c]+','+S.nt[r*32+c+1]+','+S.nt[(r+1)*32+c]+','+S.nt[(r+1)*32+c+1];
    if(!(k in mm))mm[k]=mi++;
    cx.fillStyle='hsla('+hues[mm[k]%hues.length]+',60%,45%,0.35)';
    cx.fillRect(mc*16*z,mr*16*z,16*z,16*z);
    cx.strokeStyle='rgba(0,255,200,0.35)';cx.lineWidth=1;cx.strokeRect(mc*16*z,mr*16*z,16*z,16*z);
  }
}

function renderAttr(){
  const z=+document.getElementById('oZoom').value;cv.width=256*z;cv.height=240*z;cx.imageSmoothingEnabled=false;
  const ac=[[40,120,255],[255,60,60],[100,255,100],[255,200,40]];
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){
    const pi=getPal(tc,tr),c=ac[pi];
    cx.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
    cx.fillRect(tc*8*z,tr*8*z,8*z,8*z);
  }
  cx.strokeStyle='#fff';cx.lineWidth=2;
  for(let x=0;x<=256;x+=32){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,240*z);cx.stroke()}
  for(let y=0;y<=240;y+=32){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(256*z,y*z);cx.stroke()}
}

function render(){
  if(S.tab==='scene')renderScene();
  else if(S.tab==='chr')renderCHR();
  else if(S.tab==='meta')renderMeta();
  else if(S.tab==='attr')renderAttr();
  else if(S.tab==='sprites')renderSprites();
  else if(S.tab==='code')renderCode();
  else if(S.tab==='audio')renderAudio();
  else if(S.tab==='collision')renderCollision();
  else if(S.tab==='anim')renderAnim();
  else if(S.tab==='docs')renderDocs();
  updateStats();
}

// Draw all active sprites on a canvas context
function drawSpritesOnCanvas(bx,z,showSelection){
  const claimed=new Uint8Array(256*240),lines=new Uint8Array(240);
  for(let i=0;i<S.oam.length;i++){const s=S.oam[i];if(!s.active)continue;const height=s.height===16?16:8,pl=S.sprPal[s.attr&3];for(let py=0;py<height;py++){const y=s.y+py;if(y<0||y>=240)continue;if(lines[y]++>=8)continue;const fy=s.attr&0x80?height-1-py:py,ti=fy>=8?(s.tile2??((s.tile+1)&255)):s.tile;const tile=S.sprChr[ti];if(!tile)continue;for(let px=0;px<8;px++){const x=s.x+px;if(x<0||x>=256)continue;const ci=tile[fy&7][s.attr&0x40?7-px:px];if(!ci)continue;const o=y*256+x;if(claimed[o])continue;claimed[o]=1;const bg=S.chr[S.nt[(y>>3)*32+(x>>3)]]?.[y&7]?.[x&7]||0;if((s.attr&0x20)&&bg)continue;bx.fillStyle='rgb('+(NP[pl[ci]]||NP[15]).join(',')+')';bx.fillRect(x*z,y*z,z,z);}}}
  if(showSelection&&S.oam[S.selSprite]){const s=S.oam[S.selSprite];bx.strokeStyle='#ffff33';bx.lineWidth=2;bx.strokeRect(s.x*z,s.y*z,8*z,(s.height===16?16:8)*z);}
}

function renderSprites(){
  const z=+document.getElementById('oZoom').value;
  cv.width=256*z;cv.height=240*z;cx.imageSmoothingEnabled=false;
  // Draw BG scene first
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){
    drawTileAt(cx,tc*8,tr*8,S.nt[tr*32+tc],getPal(tc,tr),z);
  }
  // Slight dim BG to make sprites stand out
  cx.fillStyle='rgba(0,0,0,0.15)';cx.fillRect(0,0,cv.width,cv.height);
  // Draw sprites with selection
  drawSpritesOnCanvas(cx,z,true);
  // Draw grid if enabled
  const sg=document.getElementById('oGrid').checked;
  if(sg){cx.strokeStyle='rgba(255,255,255,0.05)';cx.lineWidth=1;
    for(let x=0;x<=256;x+=8){cx.beginPath();cx.moveTo(x*z,0);cx.lineTo(x*z,240*z);cx.stroke()}
    for(let y=0;y<=240;y+=8){cx.beginPath();cx.moveTo(0,y*z);cx.lineTo(256*z,y*z);cx.stroke()}}
  // Scanline overflow indicators
  const overflows=scanlineCheck();
  if(overflows.length>0){
    cx.fillStyle='rgba(255,0,0,0.25)';
    overflows.forEach(o=>{cx.fillRect(0,o.line*z,256*z,z)});
  }
  // Update sidebar
  updateSpritesSidebar();
}

// ═══════════════════════════════════════════════
// SIDEBAR UPDATES
// ═══════════════════════════════════════════════
function updateStats(){
  const u=tileUsage(),ut=uniqueTiles(),mc=metaCount();
  const s1=Object.values(u).filter(v=>v===1).length;
  const s2=Object.values(u).filter(v=>v===2).length;
  document.getElementById('bUniq').textContent=ut;
  document.getElementById('bFree').textContent=256-ut;
  document.getElementById('bMeta').textContent=mc;
  document.getElementById('bUndo').textContent=undoStack.length;
  document.getElementById('bClip').textContent=clipboard?'$'+S.editTile.toString(16).toUpperCase().padStart(2,'0'):'—';

  // Live stats panel
  const ls=document.getElementById('liveStats');
  if(ls) ls.innerHTML=
    '<div class="st"><span>Unique Tiles</span><span class="'+(ut>200?'w':'v')+'">'+ut+' / 256</span></div>'+
    '<div class="st"><span>Free Slots</span><span class="'+(256-ut<30?'w':'v')+'">'+(256-ut)+'</span></div>'+
    '<div class="st"><span>Metatiles</span><span class="'+(mc>100?'w':'v')+'">'+mc+'</span></div>'+
    '<div class="st"><span>1x Tiles</span><span class="'+(s1>50?'w':'v')+'">'+s1+'</span></div>'+
    '<div class="st"><span>2x Tiles</span><span>'+s2+'</span></div>'+
    '<div class="st"><span>Reuse Ratio</span><span class="'+(960/ut<5?'w':'v')+'">'+(960/ut).toFixed(1)+'x</span></div>';

  // Update selected tile preview
  const stc=document.getElementById('selTilePreview').getContext('2d');
  stc.imageSmoothingEnabled=false;stc.clearRect(0,0,48,48);
  drawTileAt(stc,0,0,S.selTile,S.selPal,6);
  document.getElementById('selTileId').textContent='$'+S.selTile.toString(16).toUpperCase().padStart(2,'0');
  document.getElementById('selTileUsage').textContent='Used '+(u[S.selTile]||0)+'x';

  // Palette hex readout
  const phr=document.getElementById('palHexReadout');
  if(phr){
    phr.innerHTML=S.pal.map((p,i)=>'<div style="'+(i===S.selPal?'color:var(--acc)':'')+
      '">P'+i+': '+p.map(c=>'$'+c.toString(16).toUpperCase().padStart(2,'0')).join(' ')+'</div>').join('');
  }

  // CHR editor stats
  if(S.tab==='chr'){
    const cs=document.getElementById('chrUsageStats');
    if(cs){
      let h='';
      const top=Object.entries(u).sort((a,b)=>b[1]-a[1]).slice(0,10);
      top.forEach(([t,c])=>{h+='<div class="st"><span>$'+Number(t).toString(16).toUpperCase().padStart(2,'0')+'</span><span class="v">'+c+'x</span></div>'});
      cs.innerHTML='<h3>Top 10 Used Tiles</h3>'+h;
    }
    updateCHREditor();
    // Auto-track: update find-in-scene when selected tile changes
    const autoEl=document.getElementById('findAutoTrack');
    if(autoEl&&autoEl.checked&&S.editTile!==findLastTile) findTileInScene();
  }

  // Meta stats
  if(S.tab==='meta'){
    document.getElementById('metaStats').innerHTML=
      '<div class="st"><span>Unique Metatiles</span><span class="'+(mc>100?'w':'v')+'">'+mc+' / 240</span></div>'+
      '<div class="st"><span>NG Target</span><span class="v">45-60</span></div>'+
      '<p style="margin-top:6px;color:var(--dim)">Each colored block = one unique 16x16 metatile. Same color = same 4-tile combination reused.</p>';
  }

  // Attr stats
  if(S.tab==='attr'){
    const pc=[0,0,0,0];
    for(let r=0;r<30;r++)for(let c=0;c<32;c++) pc[getPal(c,r)]++;
    document.getElementById('attrStats').innerHTML=
      '<div class="st"><span>Pal 0 zones</span><span>'+pc[0]+' / 960</span></div>'+
      '<div class="st"><span>Pal 1 zones</span><span>'+pc[1]+' / 960</span></div>'+
      '<div class="st"><span>Pal 2 zones</span><span>'+pc[2]+' / 960</span></div>'+
      '<div class="st"><span>Pal 3 zones</span><span>'+pc[3]+' / 960</span></div>';
  }
}

// ═══════════════════════════════════════════════
// PALETTE EDITOR
// ═══════════════════════════════════════════════
function buildPalEditor(){
  const pe=document.getElementById('palEditor');pe.innerHTML='';
  S.pal.forEach((pl,pi)=>{
    const row=document.createElement('div');row.className='pr';
    const lb=document.createElement('span');lb.className='pl';lb.textContent='P'+pi;
    lb.style.cursor='pointer';
    lb.onclick=()=>{S.selPal=pi;buildPalEditor();render()};
    if(pi===S.selPal)lb.style.color='var(--acc)';
    row.appendChild(lb);
    pl.forEach((ci,idx)=>{
      const s=document.createElement('div');s.className='ps'+(pi===S.selPal&&idx===S.selPixColor?' sel':'');
      const c=NP[ci]||[0,0,0];s.style.background='rgb('+c[0]+','+c[1]+','+c[2]+')';
      s.title='$'+ci.toString(16).toUpperCase().padStart(2,'0');
      s.onclick=()=>{S.selPal=pi;S.selPixColor=idx;buildPalEditor()};
      row.appendChild(s);
    });
    // Edit button per row — opens picker for currently selected color in this palette
    const eb=document.createElement('span');eb.className='pal-edit';eb.textContent='\u270E';
    eb.title='Edit selected color in P'+pi;
    (function(p){eb.onclick=()=>{S.selPal=p;openPicker(p,S.selPixColor,eb)}})(pi);
    row.appendChild(eb);
    pe.appendChild(row);
  });
}

// ═══════════════════════════════════════════════
// ATTRIBUTE GRID EDITOR
// ═══════════════════════════════════════════════
function buildAttrGrid(){
  const g=document.getElementById('attrGrid');g.innerHTML='';
  const ac=['rgba(40,120,255,0.7)','rgba(255,60,60,0.7)','rgba(100,255,100,0.7)','rgba(255,200,40,0.7)'];
  for(let ar=0;ar<8;ar++)for(let ac2=0;ac2<8;ac2++){
    const ai=ar*8+ac2,ab=S.attr[ai];
    // Show dominant palette for this byte
    const pals=[ab&3,(ab>>2)&3,(ab>>4)&3,(ab>>6)&3];
    const cell=document.createElement('div');cell.className='attr-cell';
    // Show as 2x2 mini grid
    cell.style.display='grid';cell.style.gridTemplateColumns='1fr 1fr';cell.style.padding='0';
    for(let q=0;q<4;q++){
      const qd=document.createElement('div');
      qd.style.background=ac[pals[q]];qd.style.width='100%';qd.style.height='100%';
      qd.title='Attr['+ai+'] Q'+q+' = Pal '+pals[q];
      qd.style.cursor='pointer';
      qd.onclick=()=>{snapshot();setPalQuad(ai,q,(pals[q]+1)%4);buildAttrGrid();notify('attr')};
      cell.appendChild(qd);
    }
    g.appendChild(cell);
  }
}

// ═══════════════════════════════════════════════
// CHR TILE PIXEL EDITOR
// ═══════════════════════════════════════════════
function updateCHREditor(){
  const ec=document.getElementById('chrEditCanvas'),ex=ec.getContext('2d');
  ex.imageSmoothingEnabled=false;ex.clearRect(0,0,128,128);
  const chrArr=activeChr();
  const palArr=activePalArr();
  const tile=chrArr[S.editTile],pl=palArr[S.selPal];
  const sz=16;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const ci=tile[y][x],nc=pl[ci],rgb=NP[nc]||[0,0,0];
    ex.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    ex.fillRect(x*sz,y*sz,sz,sz);
    ex.strokeStyle='rgba(255,255,255,0.1)';ex.strokeRect(x*sz,y*sz,sz,sz);
  }
  document.getElementById('chrEditId').textContent=(S.chrBank==='spr'?'SPR ':'BG ')+'Tile $'+S.editTile.toString(16).toUpperCase().padStart(2,'0');
  // Pixel color selector - click=select, edit button=pick NES color
  const pcs=document.getElementById('pixColorSel');pcs.innerHTML='';
  for(let i=0;i<4;i++){
    const s=document.createElement('div');s.className='ps'+(i===S.selPixColor?' sel':'');
    const nc=palArr[S.selPal][i],rgb=NP[nc]||[0,0,0];
    s.style.background='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    s.title='Color '+i+' = $'+nc.toString(16).toUpperCase().padStart(2,'0');
    (function(ci){s.onclick=()=>{S.selPixColor=ci;updateCHREditor()}})(i);
    pcs.appendChild(s);
  }
  // Edit button for pixel colors
  const peb=document.createElement('span');peb.className='pal-edit';peb.textContent='\u270E';
  peb.title='Edit selected pixel color';
  peb.onclick=()=>{openPicker(S.selPal,S.selPixColor,peb,S.chrBank==='spr')};
  pcs.appendChild(peb);
  // Show hex label under swatches
  let hexRow=document.getElementById('pixHexRow');
  if(!hexRow){hexRow=document.createElement('div');hexRow.id='pixHexRow';hexRow.style.cssText='font-size:7px;color:var(--dim);margin-top:2px';pcs.parentNode.insertBefore(hexRow,pcs.nextSibling)}
  hexRow.textContent=palArr[S.selPal].map(c=>'$'+c.toString(16).toUpperCase().padStart(2,'0')).join(' ');

  // CHR sidebar palette selector - shows the active bank's palette array
  const cpe=document.getElementById('chrPalEditor');
  if(cpe){
    cpe.innerHTML='';
    palArr.forEach((pl,pi)=>{
      const row=document.createElement('div');row.className='pr';
      const lb=document.createElement('span');lb.className='pl';lb.textContent='P'+pi;
      lb.style.cursor='pointer';
      lb.onclick=()=>{S.selPal=pi;buildPalEditor();updateCHREditor();render()};
      if(pi===S.selPal)lb.style.color='var(--acc)';
      row.appendChild(lb);
      pl.forEach((ci,idx)=>{
        const s=document.createElement('div');s.className='ps'+(pi===S.selPal&&idx===S.selPixColor?' sel':'');
        const c=NP[ci]||[0,0,0];s.style.background='rgb('+c[0]+','+c[1]+','+c[2]+')';
        s.title='$'+ci.toString(16).toUpperCase().padStart(2,'0');
        (function(myPi,myIdx){
          s.onclick=()=>{S.selPal=myPi;S.selPixColor=myIdx;buildPalEditor();updateCHREditor()};
        })(pi,idx);
        row.appendChild(s);
      });
      const eb=document.createElement('span');eb.className='pal-edit';eb.textContent='\u270E';
      eb.title='Edit selected color in '+(S.chrBank==='spr'?'SP':'P')+pi;
      (function(p){eb.onclick=()=>{S.selPal=p;openPicker(p,S.selPixColor,eb,S.chrBank==='spr')}})(pi);
      row.appendChild(eb);
      cpe.appendChild(row);
    });
  }
}

let chrPainting=false;


document.addEventListener('mouseup',function(){
  if(chrPainting){chrPainting=false;broadcastState('chrEditDone')}
});

function clearSelectedTile(){
  snapshot();
  for(let y=0;y<8;y++)for(let x=0;x<8;x++) activeChr()[S.editTile][y][x]=0;
  updateCHREditor();notify('clearTile');
}

// ═══════════════════════════════════════════════
// TILE SEARCH / FIND IN SCENE
// ═══════════════════════════════════════════════
let findLastTile=-1;

function findTileInScene(){
  const ti=S.editTile;
  findLastTile=ti;
  const mc=document.getElementById('findMiniScene');
  const mx=mc.getContext('2d');
  mx.imageSmoothingEnabled=false;

  // Render full scene at 1x
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){
    drawTileAt(mx,tc*8,tr*8,S.nt[tr*32+tc],getPal(tc,tr),1);
  }

  // Dim the whole thing
  mx.fillStyle='rgba(0,0,0,0.65)';
  mx.fillRect(0,0,256,240);

  // Find all positions and highlight them
  const positions=[];
  for(let tr=0;tr<30;tr++)for(let tc=0;tc<32;tc++){
    if(S.nt[tr*32+tc]===ti) positions.push([tc,tr]);
  }

  // Redraw matched tiles bright + colored border
  positions.forEach(([tc,tr])=>{
    drawTileAt(mx,tc*8,tr*8,ti,getPal(tc,tr),1);
    mx.strokeStyle='#ff3';mx.lineWidth=1;
    mx.strokeRect(tc*8+0.5,tr*8+0.5,7,7);
  });

  // Update results text
  const hex='$'+ti.toString(16).toUpperCase().padStart(2,'0');
  document.getElementById('findTileHex').textContent=hex.slice(1);
  const rd=document.getElementById('findResults');
  if(positions.length===0){
    rd.innerHTML='<span style="color:var(--red)">Tile '+hex+' not used in scene</span>';
  } else {
    const zoneCount={};
    positions.forEach(([tc,tr])=>{
      const z=getZone(tr);
      zoneCount[z]=(zoneCount[z]||0)+1;
    });
    const zoneTxt=Object.entries(zoneCount).map(([z,c])=>z+':'+c).join(' · ');
    rd.innerHTML='<span style="color:var(--grn)">'+positions.length+' placement'+(positions.length>1?'s':'')+'</span> — '+zoneTxt;
    // List first few coordinates
    if(positions.length<=12){
      rd.innerHTML+='<br>'+positions.map(([c,r])=>'('+c+','+r+')').join(' ');
    }
  }
}

// Click mini scene to jump to that tile in scene view
document.getElementById('findMiniScene').addEventListener('click',function(e){
  const rect=this.getBoundingClientRect();
  const scaleX=256/rect.width, scaleY=240/rect.height;
  const px=Math.floor((e.clientX-rect.left)*scaleX);
  const py=Math.floor((e.clientY-rect.top)*scaleY);
  const tc=Math.floor(px/8),tr=Math.floor(py/8);
  if(tc>=0&&tc<32&&tr>=0&&tr<30){
    // Select the clicked tile index and switch to scene view
    const clickedTile=S.nt[tr*32+tc];
    S.selTile=clickedTile;
    switchTab('scene');
    showToast('Jumped to ('+tc+','+tr+') — tile $'+clickedTile.toString(16).toUpperCase().padStart(2,'0'));
  }
});

// ═══════════════════════════════════════════════
// CANVAS CLICK HANDLERS
// ═══════════════════════════════════════════════
let sprDragging=false, sprDragIdx=-1, sprDragOff={x:0,y:0};




cv.addEventListener('contextmenu',e=>e.preventDefault());

// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════
function switchTab(t){const map={scene:'sideScene',chr:'sideChr',meta:'sideMeta',attr:'sideAttr',sprites:'sideSprites',code:'sideCode',audio:'sideAudio',collision:'sideCollision',anim:'sideAnim',docs:'sideDocs',emu:'sideEmu',disasm:'sideDisasm'};if(!map[t])t='scene';if(t!==S.tab){scenePainting=false;entityDrag=null;sprDragging=false;clearEmuKeys();if(t!=='audio')aud_stop();if(t!=='anim')anim_stopPreview();}S.tab=t;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===t));for(const [key,id]of Object.entries(map))document.getElementById(id).style.display=key===t?'block':'none';document.getElementById('codeEditorWrap').style.display=t==='code'?'flex':'none';document.getElementById('codeEditorWrap').classList.toggle('active',t==='code');document.getElementById('emuView').style.display=t==='emu'?'flex':'none';document.getElementById('disasmView').style.display=t==='disasm'?'flex':'none';cv.style.display=['code','docs','emu','disasm'].includes(t)?'none':'block';document.getElementById('leftP').style.display=t==='docs'?'none':'flex';document.getElementById('rightP').style.width=t==='docs'?'100%':'';if(t==='emu'){renderEmu();updateEmuSidebar();}if(t==='disasm'&&emu.loaded&&!disasm_output)disasm_run();render();}

// ═══════════════════════════════════════════════
// IMAGE UPLOAD + NES CONVERSION
// ═══════════════════════════════════════════════
function handleUpload(e){const file=e.target.files[0];e.target.value='';if(!file)return;const reader=new FileReader();reader.onerror=()=>reportError(new Error('Image could not be read'));reader.onload=()=>convertImage(reader.result);reader.readAsDataURL(file);}

// Drag and drop




function convertImage(dataUrl){const img=new Image();img.onerror=()=>reportError(new Error('Could not decode this image'));img.onload=()=>{try{const c=document.createElement('canvas');c.width=256;c.height=240;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(img,0,0,256,240);const scene=quantizeFrame(x.getImageData(0,0,256,240).data,S.pal);scene.name='Image '+(S.scenes.length+1);scene.captureMeta.mode='image';pushSceneFromCapture(scene,{target:'new'});}catch(e){reportError(e);}};img.src=dataUrl;}

// ═══════════════════════════════════════════════
// ZIP PACK LOADER
// ═══════════════════════════════════════════════
function handleZipUpload(e){const file=e.target.files[0];e.target.value='';if(!file)return;file.arrayBuffer().then(b=>loadZipPack(new Uint8Array(b))).catch(reportError);}

// Also support .zip in drag-and-drop
const _origDrop=document.ondrop;


// Minimal ZIP reader — handles STORED and DEFLATE entries
// Emulator cache / junk file extensions to skip
const CACHE_EXTS=new Set(['.sav','.srm','.state','.st0','.st1','.st2','.st3','.st4','.st5',
  '.st6','.st7','.st8','.st9','.bak','.tmp','.pyc','.pyo','.log','.swp','.swo',
  '.ds_store','.thumbs.db','.gitignore','.gitattributes']);
const CACHE_DIRS=['__pycache__/','.git/','.svn/','.hg/','node_modules/','.cache/',
  '.vs/','.vscode/','.idea/','thumbs.db','.ds_store'];

function isJunkFile(name){
  const lower=name.toLowerCase();
  // Skip directory entries
  if(lower.endsWith('/')) return true;
  // Skip known cache/emulator extensions
  for(const ext of CACHE_EXTS) if(lower.endsWith(ext)) return true;
  // Skip files in junk directories
  for(const dir of CACHE_DIRS) if(lower.includes(dir)) return true;
  // Skip emulator-specific patterns
  if(lower.match(/\.(fc[0-9]|ns[0-9]|zsnes|zst|fcs|fm2|bk2|movie|replay)$/)) return true;
  return false;
}

function parseZip(input){const data=input instanceof Uint8Array?input:new Uint8Array(input);if(data.length>64*1024*1024)throw new Error('ZIP exceeds 64 MB');const v=new DataView(data.buffer,data.byteOffset,data.byteLength);let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(v.getUint32(i,true)===0x06054B50&&i+22+v.getUint16(i+20,true)===data.length){end=i;break;}if(end<0)throw new Error('ZIP central directory is missing or truncated');if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw new Error('Multi-disk ZIP is unsupported');const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);if(count===65535||start===0xFFFFFFFF)throw new Error('ZIP64 is unsupported');if(count>2048||start+size>end)throw new Error('Invalid ZIP directory');const out=Object.create(null);let pos=start,total=0;for(let n=0;n<count;n++){if(pos+46>data.length||v.getUint32(pos,true)!==0x02014B50)throw new Error('Corrupt ZIP entry');const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),crc=v.getUint32(pos+16,true),compressed=v.getUint32(pos+20,true),uncompressed=v.getUint32(pos+24,true),nameLen=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),offset=v.getUint32(pos+42,true);if(pos+46+nameLen+extra+comment>start+size)throw new Error('ZIP entry outside central directory');const name=new TextDecoder().decode(data.subarray(pos+46,pos+46+nameLen));pos+=46+nameLen+extra+comment;if(isJunkFile(name))continue;if(flags&1)throw new Error('Encrypted ZIP is unsupported');if(![0,8].includes(method))throw new Error('Unsupported ZIP compression method '+method);total+=uncompressed;if(uncompressed>32*1024*1024||total>64*1024*1024)throw new Error('ZIP expands beyond the safety limit');if(offset+30>start||v.getUint32(offset,true)!==0x04034B50)throw new Error('Invalid ZIP local header');const begin=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);if(begin+compressed>start)throw new Error('Truncated ZIP payload');if(Object.hasOwn(out,name))throw new Error('Duplicate ZIP filename '+name);const bytes=data.slice(begin,begin+compressed);out[name]={bytes,method,size:uncompressed,crc};}return out;}

async function inflateData(compressed,expectedSize){if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot inflate ZIP files. Use a stored ZIP or current browser.');let stream;try{stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch(e){throw new Error('Raw DEFLATE is unavailable in this browser');}const reader=stream.getReader(),chunks=[];let size=0;try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>expectedSize||size>32*1024*1024){await reader.cancel();throw new Error('Inflated ZIP entry exceeds its declared size');}chunks.push(item.value);}}finally{reader.releaseLock();}if(size!==expectedSize)throw new Error('Inflated ZIP size mismatch');const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;}

async function loadZipPack(data){try{const raw=parseZip(data),files=Object.create(null);for(const [name,entry]of Object.entries(raw)){const bytes=entry.method===8?await inflateData(entry.bytes,entry.size):entry.bytes;if(bytes.length!==entry.size||zipCRC(bytes)!==entry.crc)throw new Error('ZIP checksum or size failed: '+name);files[name]=bytes;}
  const exact=name=>{const matches=Object.keys(files).filter(k=>k.split('/').at(-1).toLowerCase()===name);if(matches.length>1)throw new Error('Ambiguous ZIP asset '+name);return matches.length?files[matches[0]]:null;};
  const project=exact('project.json');if(project){db_deserializeState(new TextDecoder().decode(project));broadcastState('zipProject');showToast('Complete project restored from ZIP');return true;}
  const chr=exact('tiles.chr')||Object.entries(files).find(([n])=>/\.chr$/i.test(n)&&!/sprites\.chr$/i.test(n))?.[1];if(!chr||chr.length<4096)throw new Error('ZIP needs project.json or a BG .chr file with at least 4096 bytes');const sceneFile=exact('scenes.json');let scenes,active=0;const sprites=exact('sprites.chr');const pal=exact('palettes.pal'),sprPal=exact('sprite_palettes.pal');const nt=exact('nametable.bin')||exact('nametable_with_attributes.bin'),attr=exact('attributes.bin')||exact('attribute_table.bin');const oam=exact('oam.bin');if(nt&&![960,1024].includes(nt.length))throw new Error('Nametable must be 960 or 1024 bytes');if(attr&&attr.length!==64)throw new Error('Attribute table must be 64 bytes');if((pal&&pal.length<16)||(sprPal&&sprPal.length<16))throw new Error('Palette needs 16 bytes');if(oam&&(oam.length%4||oam.length>256))throw new Error('Invalid OAM byte count');if(sceneFile){const d=JSON.parse(new TextDecoder().decode(sceneFile));if(!Array.isArray(d.scenes)||!d.scenes.length)throw new Error('Invalid scenes.json');scenes=d.scenes;active=d.activeScene||0;}else scenes=[{name:'Imported tile pack',nt:nt?Array.from(nt.slice(0,960)):undefined,attr:attr?Array.from(attr):nt?.length===1024?Array.from(nt.slice(960)):undefined,pal:pal?Array.from({length:4},(_,p)=>Array.from(pal.slice(p*4,p*4+4))):undefined,sprPal:sprPal?Array.from({length:4},(_,p)=>Array.from(sprPal.slice(p*4,p*4+4))):undefined,oam:oam?Array.from({length:oam.length/4},(_,i)=>({y:oam[i*4]+1,tile:oam[i*4+1],attr:oam[i*4+2],x:oam[i*4+3],active:oam[i*4]<239})).filter(s=>s.active):[]}];
  const state={version:2,format:'NESForge',projectName:'Imported tile pack',activeScene:active,chr:decodeTiles(chr),sprChr:sprites?decodeTiles(sprites):chr.length>=8192?decodeTiles(chr,4096):normalizeTiles(),scenes};db_deserializeState(state);broadcastState('zipAssets');showToast('Tile pack restored');return true;
}catch(e){reportError(e);return false;}}

// ═══════════════════════════════════════════════
// ROM IMPORT — Extract data from any .NES file
// ═══════════════════════════════════════════════
function handleRomImport(e){const file=e.target.files[0];e.target.value='';if(!file)return;file.arrayBuffer().then(buf=>importRom(new Uint8Array(buf),file.name)).catch(reportError);}

function importRom(rom,name='Imported ROM'){
  try{const h=parseRomHeader(rom);const extracted=extractScenes(rom.slice(h.headerSize,h.headerSize+h.prgSize),h.prgSize,{});if(S.scenes.length+(extracted.length||1)>64)throw new Error('Import would exceed 64 editor scenes');if(!emuLoadRomData(rom,name))return false;snapshot();saveCurrentScene();S.importedRom=new Uint8Array(rom);S.mapper=h.mapper;S.prgBanks=h.prgSize/16384;S.chrBanks=h.chrSize/8192;S.mirroring=h.mirror===1?'v':'h';S.hasSRAM=h.battery;S.allChrBanks=romChrBanks(rom);S.chrBankIdx=0;
    if(extracted.length){if(S.scenes.length+extracted.length>64)throw new Error('Import would exceed 64 editor scenes');const shift=S.scenes.length;for(const sc of extracted){sc.chr=decodeTiles(rom,h.headerSize+h.prgSize);sc.sprChr=decodeTiles(rom,h.headerSize+h.prgSize+4096);for(const e of sc.entities)if(e.type==='door'&&e.targetScene>=0)e.targetScene+=shift;S.scenes.push(sc);}S.activeScene=shift;loadSceneData(shift);rebuildAllUI();broadcastState('import');}else{const scene=captureRuntimeData();scene.name=name.replace(/\.nes$/i,'')+' snapshot';pushSceneFromCapture(scene,{target:'new',noSnapshot:true});}
    document.getElementById('issueStatus').textContent='Imported '+name+' • Run Original plays the game; Build & Run builds edits';showToast('Imported '+name+' without replacing existing scenes');return true;
  }catch(e){reportError(e);return false;}
}

function extractPalettes(prg){
  // Method 1 (best): Find PPU $3F00 address setup, then read palette bytes via indirect loop
  // Pattern: LDA #$3F / STA $2006 / LDA #$00 / STA $2006
  // = A9 3F 8D 06 20 A9 00 8D 06 20
  for(let i=0;i<prg.length-10;i++){
    if(prg[i]===0xA9&&prg[i+1]===0x3F&&prg[i+2]===0x8D&&prg[i+3]===0x06&&prg[i+4]===0x20&&
       prg[i+5]===0xA9&&prg[i+6]===0x00&&prg[i+7]===0x8D&&prg[i+8]===0x06&&prg[i+9]===0x20){
      // Found $3F00 PPU address write. Now look for palette data writes nearby
      // Method 1a: Scan for sequential LDA #xx / STA $2007 writes after this point
      const palBytes=[];
      for(let j=i+10;j<Math.min(i+400,prg.length-5)&&palBytes.length<32;j++){
        if(prg[j]===0xA9&&prg[j+2]===0x8D&&prg[j+3]===0x07&&prg[j+4]===0x20){
          palBytes.push(prg[j+1]);
          j+=4;
        }
      }
      if(palBytes.length>=16){
        const bg=[[palBytes[0],palBytes[1],palBytes[2],palBytes[3]],
                  [palBytes[4],palBytes[5],palBytes[6],palBytes[7]],
                  [palBytes[8],palBytes[9],palBytes[10],palBytes[11]],
                  [palBytes[12],palBytes[13],palBytes[14],palBytes[15]]];
        const spr=palBytes.length>=32?
          [[palBytes[16],palBytes[17],palBytes[18],palBytes[19]],
           [palBytes[20],palBytes[21],palBytes[22],palBytes[23]],
           [palBytes[24],palBytes[25],palBytes[26],palBytes[27]],
           [palBytes[28],palBytes[29],palBytes[30],palBytes[31]]]:null;
        return{bg,spr};
      }
      // Method 1b: Palette loaded via indirect addressing (loop with LDA ($xx),Y / STA $2007)
      // The palette data is stored as a table. Find it by looking for the pointer.
      // Pattern: LDY #$00 ... LDA ($xx),Y / STA $2007 / INY / CPY #$20 (32)
      for(let j=i+10;j<Math.min(i+100,prg.length-6);j++){
        if(prg[j]===0xB1&&prg[j+2]===0x8D&&prg[j+3]===0x07&&prg[j+4]===0x20){
          // Found indirect palette load. The pointer ZP addr is prg[j+1]
          // Look backwards for where the pointer was set up (LDA #lo / STA zp / LDA #hi / STA zp+1)
          const zpAddr=prg[j+1];
          for(let k=Math.max(0,i-60);k<j;k++){
            if(prg[k]===0xA9&&prg[k+2]===0x85&&prg[k+3]===zpAddr&&
               prg[k+4]===0xA9&&prg[k+6]===0x85&&prg[k+7]===zpAddr+1){
              const lo=prg[k+1],hi=prg[k+5];
              const palAddr=lo|(hi<<8);
              // Convert CPU address to PRG offset
              let palOff=palAddr-0xC000;
              if(palOff<0) palOff=palAddr-0x8000;
              if(palOff>=0&&palOff+32<=prg.length){
                const p=Array.from(prg.slice(palOff,palOff+32));
                // Validate: all values should be valid NES colors (0-63)
                if(p.every(v=>v<=0x3F)){
                  return{
                    bg:[[p[0],p[1],p[2],p[3]],[p[4],p[5],p[6],p[7]],[p[8],p[9],p[10],p[11]],[p[12],p[13],p[14],p[15]]],
                    spr:[[p[16],p[17],p[18],p[19]],[p[20],p[21],p[22],p[23]],[p[24],p[25],p[26],p[27]],[p[28],p[29],p[30],p[31]]]
                  };
                }
              }
            }
          }
          break;
        }
      }
      // Method 1c: LDA abs,X / STA $2007 loop (common pattern: LDX #$00 ... LDA table,X / STA $2007 / INX / CPX #$20)
      for(let j=i+10;j<Math.min(i+100,prg.length-6);j++){
        if(prg[j]===0xBD&&prg[j+3]===0x8D&&prg[j+4]===0x07&&prg[j+5]===0x20){
          const tableAddr=prg[j+1]|(prg[j+2]<<8);
          let palOff=tableAddr-0xC000;
          if(palOff<0) palOff=tableAddr-0x8000;
          if(palOff>=0&&palOff+32<=prg.length){
            const p=Array.from(prg.slice(palOff,palOff+32));
            if(p.every(v=>v<=0x3F)&&p.some(v=>v>0)){
              return{
                bg:[[p[0],p[1],p[2],p[3]],[p[4],p[5],p[6],p[7]],[p[8],p[9],p[10],p[11]],[p[12],p[13],p[14],p[15]]],
                spr:p.length>=32?[[p[16],p[17],p[18],p[19]],[p[20],p[21],p[22],p[23]],[p[24],p[25],p[26],p[27]],[p[28],p[29],p[30],p[31]]]:null
              };
            }
          }
        }
        // LDA abs,Y / STA $2007 pattern
        if(prg[j]===0xB9&&prg[j+3]===0x8D&&prg[j+4]===0x07&&prg[j+5]===0x20){
          const tableAddr=prg[j+1]|(prg[j+2]<<8);
          let palOff=tableAddr-0xC000;
          if(palOff<0) palOff=tableAddr-0x8000;
          if(palOff>=0&&palOff+32<=prg.length){
            const p=Array.from(prg.slice(palOff,palOff+32));
            if(p.every(v=>v<=0x3F)&&p.some(v=>v>0)){
              return{
                bg:[[p[0],p[1],p[2],p[3]],[p[4],p[5],p[6],p[7]],[p[8],p[9],p[10],p[11]],[p[12],p[13],p[14],p[15]]],
                spr:p.length>=32?[[p[16],p[17],p[18],p[19]],[p[20],p[21],p[22],p[23]],[p[24],p[25],p[26],p[27]],[p[28],p[29],p[30],p[31]]]:null
              };
            }
          }
        }
      }
    }
  }

  // Method 2: Our multi-scene format stores palettes at scene_base+$0400
  // Check if scene data exists at PRG $1000
  const sceneBase=0x1000;
  if(sceneBase+1056<=prg.length){
    const palOff=sceneBase+1024;
    const p=Array.from(prg.slice(palOff,palOff+32));
    if(p.some(v=>v>0)&&p.every(v=>v<=0x3F)){
      return{
        bg:[[p[0],p[1],p[2],p[3]],[p[4],p[5],p[6],p[7]],[p[8],p[9],p[10],p[11]],[p[12],p[13],p[14],p[15]]],
        spr:[[p[16],p[17],p[18],p[19]],[p[20],p[21],p[22],p[23]],[p[24],p[25],p[26],p[27]],[p[28],p[29],p[30],p[31]]]
      };
    }
  }

  // Method 3: Brute-force scan for 16-byte region where all values <=0x3F
  // Common BG color 0 values: 0x0F (black), 0x0D, 0x1D, 0x2D, 0x3D (near-black)
  // Also 0x30 (white bg) is used in some games
  const commonBg=[0x0F,0x0D,0x1D,0x2D,0x3D,0x30,0x00,0x20];
  let bestPalOff=-1,bestPalScore=0;
  for(let i=0;i<prg.length-32;i++){
    const chunk=prg.slice(i,i+32);
    const allValid=Array.from(chunk).every(v=>v<=0x3F);
    if(!allValid) continue;
    let score=0;
    // Bonus for common BG color at positions 0, 4, 8, 12 (palette group starts)
    if(commonBg.includes(chunk[0])) score+=10;
    if(chunk[4]===chunk[0]) score+=5; // shared BG color
    if(chunk[8]===chunk[0]) score+=5;
    if(chunk[12]===chunk[0]) score+=5;
    // Color variety within each 4-color palette group
    for(let g=0;g<4;g++){
      const grp=new Set([chunk[g*4],chunk[g*4+1],chunk[g*4+2],chunk[g*4+3]]);
      if(grp.size>=3) score+=3;
      if(grp.size>=2) score+=1;
    }
    // Total unique colors
    const unique=new Set(chunk).size;
    if(unique>=6&&unique<=24) score+=5;
    if(unique>=4) score+=2;
    // Penalize runs of identical bytes (likely data, not palette)
    let maxRun=1,curRun=1;
    for(let j=1;j<32;j++){if(chunk[j]===chunk[j-1])curRun++;else{maxRun=Math.max(maxRun,curRun);curRun=1;}}
    maxRun=Math.max(maxRun,curRun);
    if(maxRun>8) score-=10;
    if(score>bestPalScore){bestPalScore=score;bestPalOff=i;}
  }
  if(bestPalOff>=0&&bestPalScore>=8){
    const p=Array.from(prg.slice(bestPalOff,bestPalOff+32));
    return{
      bg:[[p[0],p[1],p[2],p[3]],[p[4],p[5],p[6],p[7]],[p[8],p[9],p[10],p[11]],[p[12],p[13],p[14],p[15]]],
      spr:[[p[16],p[17],p[18],p[19]],[p[20],p[21],p[22],p[23]],[p[24],p[25],p[26],p[27]],[p[28],p[29],p[30],p[31]]]
    };
  }

  return{bg:null,spr:null};
}

function extractNametable(prg,prgSize){
  // For our ROMs: nametable is at PRG offset $1000 ($D000 - $C000)
  const ntOff=prgSize>=16384?0x1000:0;

  // Score a candidate nametable region (higher = more likely real nametable)
  function scoreNT(data){
    const unique=new Set(data).size;
    if(unique<2) return 0; // Too uniform (all blank)
    if(unique>230) return 0; // Random noise
    let score=0;
    // Variety bonus (5-200 unique tiles is typical for game screens)
    if(unique>=3&&unique<=200) score+=15;
    if(unique>=8&&unique<=150) score+=10;
    if(unique>=15&&unique<=100) score+=5;
    // Structural check: NES nametables often have repeated rows (status bars, floors, ceilings)
    let repeatedRows=0;
    for(let r=1;r<30;r++){
      let same=true;
      for(let c=0;c<32;c++){
        if(data[r*32+c]!==data[(r-1)*32+c]){same=false;break;}
      }
      if(same) repeatedRows++;
    }
    if(repeatedRows>=1&&repeatedRows<=15) score+=10; // Some repetition is normal
    if(repeatedRows>=2&&repeatedRows<=8) score+=5; // Sweet spot for game screens
    // Common tile check: tile 0 often appears frequently (empty/background)
    const zeros=data.filter(v=>v===0).length;
    if(zeros>30&&zeros<800) score+=10;
    if(zeros>100&&zeros<600) score+=5;
    // Low tile IDs used frequently is typical for many games
    const lowTiles=data.filter(v=>v<128).length;
    if(lowTiles>data.length*0.3) score+=5;
    // Check for horizontal runs (common in floors, ceilings, walls)
    let hRuns=0;
    for(let r=0;r<30;r++){
      let run=1;
      for(let c=1;c<32;c++){
        if(data[r*32+c]===data[r*32+c-1]) run++;
        else{if(run>=4) hRuns++;run=1;}
      }
      if(run>=4) hRuns++;
    }
    if(hRuns>=2&&hRuns<=40) score+=8;
    // Check for sequential tile IDs (common in text/alphabet areas)
    let sequential=0;
    for(let i=1;i<data.length;i++){
      if(data[i]===data[i-1]+1) sequential++;
    }
    if(sequential>=4&&sequential<=60) score+=5;
    // Penalize if too many high values (unlikely in most game nametables)
    const highTiles=data.filter(v=>v>=0xF0).length;
    if(highTiles>data.length*0.5) score-=15;
    return score;
  }

  // Try the expected offset first
  if(ntOff+960<=prg.length){
    const candidate=Array.from(prg.slice(ntOff,ntOff+960));
    if(scoreNT(candidate)>=15){
      return{nt:candidate,offset:ntOff};
    }
  }

  // Scan PRG for best nametable candidate
  let bestOff=-1,bestScore=0;
  for(let off=0;off<prg.length-1024;off+=16){
    const slice=Array.from(prg.slice(off,off+960));
    const s=scoreNT(slice);
    if(s>bestScore){bestScore=s;bestOff=off;}
  }
  if(bestOff>=0&&bestScore>=15){
    return{nt:Array.from(prg.slice(bestOff,bestOff+960)),offset:bestOff};
  }
  return{nt:new Array(960).fill(0),offset:-1};
}

function extractAttributes(prg,prgSize,ntOffset){
  // Attributes follow nametable (64 bytes)
  if(ntOffset>=0&&ntOffset+960+64<=prg.length){
    return Array.from(prg.slice(ntOffset+960,ntOffset+960+64));
  }
  return new Array(64).fill(0);
}

function extractOam(prg,prgSize){
  // For our multi-scene ROMs: OAM at scene_base + 0x0420 (count at +0x0420, data at +0x0421)
  // For single scene: try offset 0x1420 (= 0x1000 + 0x0420)
  const oam=[];
  const tryOffsets=[0x1420,0x1800,0x0420];
  for(const oamOff of tryOffsets){
    if(oamOff+5>prg.length) continue;
    const count=prg[oamOff];
    if(count===0||count>63) continue;
    let valid=true;
    const candidates=[];
    for(let i=0;i<count;i++){
      const off=oamOff+1+i*4;
      if(off+4>prg.length){valid=false;break;}
      const y=prg[off],tile=prg[off+1],attr=prg[off+2],x=prg[off+3];
      if(y>=240&&y!==0xFF){valid=false;break;}
      candidates.push({y,tile,attr,x,active:y!==0xFF});
    }
    if(valid&&candidates.length>0){
      return candidates.filter(s=>s.active&&s.y<240);
    }
  }
  // Fallback: scan for OAM-like data (sequences of 4-byte entries with valid Y coords)
  for(let off=0x1000;off<prg.length-16;off+=4){
    const y=prg[off],tile=prg[off+1],attr=prg[off+2],x=prg[off+3];
    if(y>0&&y<240&&x>0&&x<255&&(attr&0xE0)<=0xE0){
      // Found a potential OAM entry, try reading a batch
      for(let i=0;i<64;i++){
        const o=off+i*4;
        if(o+4>prg.length)break;
        const sy=prg[o],st=prg[o+1],sa=prg[o+2],sx=prg[o+3];
        if(sy===0xFF||sy===0)break;
        if(sy<240) oam.push({y:sy,tile:st,attr:sa,x:sx,active:true});
      }
      if(oam.length>0) return oam;
    }
  }
  return oam;
}

function extractScenes(prg,prgSize,palettes){const base=prgSize===32768?0x4000:0;if(prgSize!==16384&&prgSize!==32768)return [];const marker=base+0xFF0;if(new TextDecoder().decode(prg.slice(marker,marker+8))!=='NFORGE14'||prg[marker+8]!==2)return [];const count=prg[marker+9];if(count<1||count>7||base+0x1000+count*0x600>prg.length-6)return [];const scenes=[];for(let i=0;i<count;i++){const o=base+0x1000+i*0x600,M=o+0x530,E=o+0x540;const bg=Array.from({length:4},(_,p)=>Array.from(prg.slice(o+1024+p*4,o+1028+p*4))),sp=Array.from({length:4},(_,p)=>Array.from(prg.slice(o+1040+p*4,o+1044+p*4)));if([...bg.flat(),...sp.flat()].some(v=>v>63))return [];const oam=Array.from({length:Math.min(64,prg[o+1056])},(_,j)=>({y:prg[o+1057+j*4]+1,tile:prg[o+1058+j*4],attr:prg[o+1059+j*4],x:prg[o+1060+j*4],active:true}));const entities=Array.from({length:Math.min(16,prg[M+4])},(_,j)=>{const k=E+j*8;return {type:['player','enemy','npc','door','item','platform','trigger','spawn'][prg[k]]||'trigger',x:prg[k+1],y:prg[k+2],w:prg[k+3],h:prg[k+4],targetScene:prg[k+5]===255?-1:prg[k+5],targetX:prg[k+6],targetY:prg[k+7],sprTile:-1};});scenes.push(makeScene({name:'Imported scene '+(i+1),nt:Array.from(prg.slice(o,o+960)),attr:Array.from(prg.slice(o+960,o+1024)),pal:bg,sprPal:sp,oam,entities,sceneType:['sideview','topdown','static'][prg[M]],scrollDir:['none','horizontal','vertical','both'][prg[M+1]],gravity:prg[M+3]>127?prg[M+3]-256:prg[M+3],bgColor:prg[M+2],view:{w:prg[M+6]|prg[M+7]<<8,h:prg[M+8]|prg[M+9]<<8,hBorder:prg[M+10],vBorder:prg[M+11]},tileProps:Array.from(prg.slice(base+0x1000+count*0x600,base+0x1000+count*0x600+256)),captureMeta:{mode:'forge-rom',layoutVersion:2}}));}return scenes;}

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════
function exportAll(){try{saveCurrentScene();const entries=[{name:'project.json',data:new TextEncoder().encode(db_serializeState())},{name:'tiles.chr',data:encodeTiles(S.chr)},{name:'sprites.chr',data:encodeTiles(S.sprChr)},{name:'nametable.bin',data:Uint8Array.from(S.nt)},{name:'attributes.bin',data:Uint8Array.from(S.attr)},{name:'palettes.pal',data:Uint8Array.from(S.pal.flat())},{name:'sprite_palettes.pal',data:Uint8Array.from(S.sprPal.flat())},{name:'scenes.json',data:new TextEncoder().encode(JSON.stringify({version:2,activeScene:S.activeScene,scenes:S.scenes}))}];const oam=expandOAM(S.oam);if(oam.length<=64)entries.push({name:'oam.bin',data:Uint8Array.from(oam.flatMap(s=>[(s.y-1)&255,s.tile,s.attr,s.x]))});return download(buildZip(entries),(S.projectName||'project').replace(/[^\w-]/g,'_')+'.nesforge.zip','application/zip');}catch(e){reportError(e);}}

function buildZip(files){
  // Minimal ZIP builder using STORED method (method=0, no compression)
  // CRC-32 table
  const crcTab=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crcTab[i]=c}
  function crc32(data){let c=0xFFFFFFFF;for(let i=0;i<data.length;i++)c=crcTab[(c^data[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0}

  const localHeaders=[];const centralHeaders=[];let offset=0;
  const enc=new TextEncoder();

  files.forEach(f=>{
    const nameBytes=enc.encode(f.name);
    const crc=crc32(f.data);
    const sz=f.data.length;

    // Local file header (30 + nameLen + data)
    const lh=new Uint8Array(30+nameBytes.length);
    const lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true); // signature
    lv.setUint16(4,20,true);         // version needed
    lv.setUint16(6,0,true);          // flags
    lv.setUint16(8,0,true);          // method = STORED
    lv.setUint16(10,0,true);         // mod time
    lv.setUint16(12,0,true);         // mod date
    lv.setUint32(14,crc,true);       // crc32
    lv.setUint32(18,sz,true);        // compressed size
    lv.setUint32(22,sz,true);        // uncompressed size
    lv.setUint16(26,nameBytes.length,true);
    lv.setUint16(28,0,true);         // extra length
    lh.set(nameBytes,30);

    // Central directory header (46 + nameLen)
    const ch=new Uint8Array(46+nameBytes.length);
    const cv2=new DataView(ch.buffer);
    cv2.setUint32(0,0x02014b50,true); // signature
    cv2.setUint16(4,20,true);         // version made by
    cv2.setUint16(6,20,true);         // version needed
    cv2.setUint16(8,0,true);          // flags
    cv2.setUint16(10,0,true);         // method
    cv2.setUint16(12,0,true);         // mod time
    cv2.setUint16(14,0,true);         // mod date
    cv2.setUint32(16,crc,true);
    cv2.setUint32(20,sz,true);
    cv2.setUint32(24,sz,true);
    cv2.setUint16(28,nameBytes.length,true);
    cv2.setUint16(30,0,true);         // extra length
    cv2.setUint16(32,0,true);         // comment length
    cv2.setUint16(34,0,true);         // disk number
    cv2.setUint16(36,0,true);         // internal attrs
    cv2.setUint32(38,0,true);         // external attrs
    cv2.setUint32(42,offset,true);    // local header offset
    ch.set(nameBytes,46);

    localHeaders.push({header:lh,data:f.data});
    centralHeaders.push(ch);
    offset+=lh.length+f.data.length;
  });

  // End of central directory
  const cdOffset=offset;
  let cdSize=0;centralHeaders.forEach(c=>cdSize+=c.length);
  const eocd=new Uint8Array(22);
  const ev=new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(4,0,true);ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true);
  ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);
  ev.setUint32(16,cdOffset,true);
  ev.setUint16(20,0,true);

  // Concatenate all parts
  const parts=[];
  localHeaders.forEach(lh=>{parts.push(lh.header);parts.push(lh.data)});
  centralHeaders.forEach(ch=>parts.push(ch));
  parts.push(eocd);

  return new Blob(parts,{type:'application/zip'});
}
function download(data,name,type='application/octet-stream'){const blob=data instanceof Blob?data:new Blob([data],{type});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

// ═══════════════════════════════════════════════
// TECH DOCS (live)
// ═══════════════════════════════════════════════
function renderDocs(){const d=document.getElementById('sideDocs');d.innerHTML='<div class="doc"><h2>NES Forge 1.4.1 — Emulator Hotfix</h2><p>A self-contained NES graphics editor, assembler, scene-viewer ROM builder and experimental emulator. No network dependencies.</p><h3>Working with scenes</h3><p>Every scene owns its background tiles, sprite tiles, palettes, tile properties, nametable, OAM and metadata. Capturing or importing another scene no longer replaces graphics in existing scenes. Duplicate makes an independent copy. Undo/Redo includes scenes, entities, links, collision, audio and animation edits. Code fields keep their native text shortcuts.</p><h3>Save and recover</h3><p>Save/Load uses browser IndexedDB. Download Project creates a complete portable JSON backup including the original imported ROM. Export produces a ZIP with project.json and binary assets. Open Project or drag a JSON/ZIP here to restore. Legacy projects migrate active-scene edits. Recovery is never overwritten while its Restore/Dismiss banner is pending. Browser storage is not a substitute for a downloaded backup.</p><h3>Build versus Run Original</h3><p><b>Build &amp; Run always builds your current editor project.</b> Run Original ROM explicitly plays the preserved imported ROM without applying edits. Builds support NROM (mapper 0), 16 or 32 KB PRG and 8 KB CHR. The default viewer supports up to 7 scenes; START cycles scenes. Graphics used across scenes are deduplicated into 256 BG and 256 sprite tiles. Capacity and code/data overlaps are errors, not silent truncation.</p><p>Scene data is at $D000, with stride $0600. NT: +$0000; attributes: +$03C0; BG palettes: +$0400; sprite palettes: +$0410; OAM count: +$0420; up to 64 OAM entries: +$0421; metadata: +$0530; up to 16 entities: +$0540; up to 16 links: +$05C0. A 256-byte collision table follows the scenes. The editor uses screen Y; exported OAM stores Y-1. Editor row 0 sprites cannot be represented by normal NES OAM and are rejected during a build.</p><h3>Assembler and disassembly</h3><p>Official 6502 instructions, constants, labels, macros, .org, .byte/.word, .rsset/.rs and .enum/.ende. Integer expressions support arithmetic, bitwise operators, parentheses and unary &lt; / &gt; low/high bytes. a:$0010 forces absolute addressing. Instruction sizes never shrink after label layout. .org segments and vectors retain exact addresses. Disassembly uses the current mapped CPU window for bank-switched ROMs; it is not a reconstruction of a whole game source tree. Disable scene packing to rebuild a disassembly.</p><h3>Captures</h3><p>Runtime Snapshot reads the current logical nametable, attributes and mapped CHR/OAM; it is unscrolled PPU data, not a claim to match the whole visible screen. Bake Visible Frame converts the current rendered screen to constrained background tiles and clears sprites. Hybrid converts the background-only frame, then retains editable sprites, avoiding doubled sprites. Conversion reports pixel changes and tile-capacity approximations. Captures cannot preserve every raster effect, palette change or scrolling boundary in a single static NES tilemap.</p><h3>Honest limits</h3><p>The emulator has scanline-based rendering and mapper support for 0, 1, 2, 3, 4, 7, 11 and 66, but is not a cycle-accurate compatibility reference. The 1.4.1 hotfix fixes negative-timestamp lockups and replaces wall-clock oscillators with CPU-clocked pulse, triangle, noise and DMC audio, envelopes, length/linear counters, sweep and bounded PCM buffering. MMC3 IRQ, raster and DMC bus alignment remain approximate. Audio gaps and processing time are shown below the emulator toolbar. Unsupported mapper/format input is rejected. No universal commercial-ROM compatibility claim is made.</p><p>Entities, links, camera settings and collision metadata are authoring data. The default ROM is a scene viewer, not an automatically generated platformer/RPG. Tracker playback is a browser preview (four synthesized channels); tracker DPCM authoring, effect commands and automatic ROM music/animation/gameplay generation are not implemented. Those data are preserved in project backups.</p><h3>Controls</h3><p>Editor: Ctrl/Cmd+Z Undo, Ctrl/Cmd+Shift+Z Redo, Ctrl/Cmd+C/V tile copy/paste outside text fields. CHR: 1–4 colors, arrows select tiles. Scene: click/drag paint, right-click eyedrop tile and palette. Entity tools place objects; click existing objects to select and drag. Emulator: Z=A, X=B, Shift=Select, Enter=Start, arrows=D-pad. Input is released on blur/tab changes. Audio: click a channel/row, use Z–M / Q–U piano keys, arrows navigate, Delete clears, Backspace cuts a note.</p><h3>Validation</h3><p>Malformed projects and ZIPs are checked before application; decompression errors are never treated as valid raw bytes. Build failures clear the previous build so an old ROM cannot masquerade as a successful new build.</p></div>';}

// ═══════════════════════════════════════════════
// SPRITE MANAGEMENT
// ═══════════════════════════════════════════════

function hitTestSprite(px,py){for(let i=0;i<S.oam.length;i++){const s=S.oam[i];if(s.active&&px>=s.x&&px<s.x+8&&py>=s.y&&py<s.y+(s.height===16?16:8))return i;}return -1;}

// Find the next sprite tile ID not already used by another OAM entry
function nextFreeSprTile(){
  const used=new Set(S.oam.filter(s=>s.active).map(s=>s.tile));
  for(let i=0;i<256;i++){if(!used.has(i))return i}
  return 0; // all 256 in use, fall back to 0
}

function addSprite(){
  if(S.oam.length>=64){showToast('OAM full — 64 sprites max');return}
  snapshot();
  const tile=nextFreeSprTile();
  S.oam.push({y:120,tile:tile,attr:0,x:128,active:true});
  S.selSprite=S.oam.length-1;
  notify('sprAdd');
  showToast('Added sprite #'+S.selSprite+' (tile $'+tile.toString(16).toUpperCase().padStart(2,'0')+')');
}

function deleteSprite(){
  if(S.selSprite<0||S.selSprite>=S.oam.length)return;
  snapshot();
  S.oam.splice(S.selSprite,1);
  S.selSprite=Math.min(S.selSprite,S.oam.length-1);
  notify('sprDelete');
  showToast('Deleted sprite');
}

function updateSprProp(){
  if(S.selSprite<0||S.selSprite>=S.oam.length)return;
  snapshot();
  const spr=S.oam[S.selSprite];
  spr.tile=Math.max(0,Math.min(255,+document.getElementById('sprPropTile').value||0));
  spr.x=Math.max(0,Math.min(255,+document.getElementById('sprPropX').value||0));
  spr.y=Math.max(0,Math.min(239,+document.getElementById('sprPropY').value||0));
  const palVal=+document.getElementById('sprPropPal').value;
  const flipH=document.getElementById('sprPropFH').checked?0x40:0;
  const flipV=document.getElementById('sprPropFV').checked?0x80:0;
  const behind=document.getElementById('sprPropBG').checked?0x20:0;
  spr.attr=(palVal&3)|flipH|flipV|behind;
  notify('sprProp');
}

function updateSpritesSidebar(){
  document.getElementById('sprCount').textContent=S.oam.filter(s=>s.active).length;

  // OAM slot list
  const list=document.getElementById('sprList');
  list.innerHTML='';
  S.oam.forEach((spr,i)=>{
    const row=document.createElement('div');
    row.className='spr-slot'+(i===S.selSprite?' sel':'')+(spr.active?'':' inactive');
    // Mini preview canvas
    const pc=document.createElement('canvas');pc.width=8;pc.height=8;pc.className='spr-preview';
    const pcx=pc.getContext('2d');pcx.imageSmoothingEnabled=false;
    const palIdx=spr.attr&3;
    drawSpriteTileSolid(pcx,0,0,spr.tile,palIdx,1);
    row.appendChild(pc);
    const info=document.createElement('span');
    info.textContent='#'+i+' T:$'+spr.tile.toString(16).toUpperCase().padStart(2,'0')+' ('+spr.x+','+spr.y+') P'+palIdx;
    info.style.flex='1';
    row.appendChild(info);
    row.onclick=()=>{S.selSprite=i;populateSprProps();render()};
    list.appendChild(row);
  });

  // Show/hide delete button
  document.getElementById('sprDelBtn').style.display=S.selSprite>=0?'block':'none';

  // Populate props for selected sprite
  populateSprProps();

  // Scanline warnings
  const overflows=scanlineCheck();
  const warnEl=document.getElementById('scanlineWarn');
  if(overflows.length>0){
    const worst=overflows.reduce((a,b)=>b.count>a.count?b:a);
    warnEl.innerHTML='<div class="scanline-warn">⚠ Scanline overflow: '+overflows.length+' lines exceed 8-sprite limit (worst: line '+worst.line+' has '+worst.count+' sprites). Extra sprites are hidden on these lines.</div>';
  } else {
    warnEl.innerHTML='';
  }

  // Update sprite CHR picker
  renderSprChrPicker();

  // Update sprite tile preview
  if(S.selSprite>=0&&S.selSprite<S.oam.length){
    const spr=S.oam[S.selSprite];
    const stc=document.getElementById('sprTilePreview').getContext('2d');
    stc.imageSmoothingEnabled=false;stc.clearRect(0,0,48,48);
    drawSpriteTileSolid(stc,0,0,spr.tile,spr.attr&3,6);
  }

  // Update inline sprite pixel editor
  updateSprPixelEditor();

  // Update sprite palette editor
  buildSprPalEditor();
}

function populateSprProps(){
  if(S.selSprite<0||S.selSprite>=S.oam.length)return;
  const spr=S.oam[S.selSprite];
  document.getElementById('sprPropTile').value=spr.tile;
  document.getElementById('sprPropX').value=spr.x;
  document.getElementById('sprPropY').value=spr.y;
  document.getElementById('sprPropPal').value=spr.attr&3;
  document.getElementById('sprPropFH').checked=!!(spr.attr&0x40);
  document.getElementById('sprPropFV').checked=!!(spr.attr&0x80);
  document.getElementById('sprPropBG').checked=!!(spr.attr&0x20);
}

function renderSprChrPicker(){
  const pc=document.getElementById('sprChrPicker');
  if(!pc)return;
  const pcx=pc.getContext('2d');
  pcx.imageSmoothingEnabled=false;
  const z=3; // 16 tiles × 8px × 3 = 384
  pcx.fillStyle='#000';pcx.fillRect(0,0,384,384);
  const palIdx=(S.selSprite>=0&&S.selSprite<S.oam.length)?(S.oam[S.selSprite].attr&3):0;
  for(let i=0;i<256;i++){
    const tx=(i%16)*8,ty=Math.floor(i/16)*8;
    drawSpriteTileSolid(pcx,tx,ty,i,palIdx,z);
  }
  // Highlight selected tile
  if(S.selSprite>=0&&S.selSprite<S.oam.length){
    const ti=S.oam[S.selSprite].tile;
    const tx=(ti%16)*8*z,ty=Math.floor(ti/16)*8*z;
    pcx.strokeStyle='#ff3';pcx.lineWidth=2;pcx.strokeRect(tx,ty,8*z,8*z);
  }
  // Grid
  pcx.strokeStyle='rgba(80,200,255,0.08)';pcx.lineWidth=1;
  for(let x=0;x<=128;x+=8){pcx.beginPath();pcx.moveTo(x*z,0);pcx.lineTo(x*z,128*z);pcx.stroke()}
  for(let y=0;y<=128;y+=8){pcx.beginPath();pcx.moveTo(0,y*z);pcx.lineTo(128*z,y*z);pcx.stroke()}
}

// Click sprite CHR picker to set tile
document.getElementById('sprChrPicker').addEventListener('click',function(e){
  if(S.selSprite<0||S.selSprite>=S.oam.length)return;
  const rect=this.getBoundingClientRect();
  const z=rect.width/128; // actual pixel scale
  const px=Math.floor((e.clientX-rect.left)/z),py=Math.floor((e.clientY-rect.top)/z);
  const ti=Math.floor(px/8)+Math.floor(py/8)*16;
  if(ti>=0&&ti<256){
    snapshot();
    S.oam[S.selSprite].tile=ti;
    notify('sprTilePick');
    showToast('Sprite tile = $'+ti.toString(16).toUpperCase().padStart(2,'0'));
  }
});

// ═══════════════════════════════════════════════
// SPRITE TILE PIXEL EDITOR (inline in SPRITES tab)
// ═══════════════════════════════════════════════
let sprPixPainting=false;
let sprPixColor=1; // selected pixel color 0-3

function getSprEditTile(){
  if(S.selSprite>=0&&S.selSprite<S.oam.length) return S.oam[S.selSprite].tile;
  return 0;
}
function getSprEditPal(){
  if(S.selSprite>=0&&S.selSprite<S.oam.length) return S.oam[S.selSprite].attr&3;
  return 0;
}

function updateSprPixelEditor(){
  const ec=document.getElementById('sprPixelEditor');
  if(!ec)return;
  const ex=ec.getContext('2d');
  ex.imageSmoothingEnabled=false;ex.clearRect(0,0,128,128);
  const ti=getSprEditTile();
  const palIdx=getSprEditPal();
  const tile=S.sprChr[ti],pl=S.sprPal[palIdx];
  const sz=16;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const ci=tile[y][x],nc=pl[ci],rgb=NP[nc]||[0,0,0];
    ex.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    ex.fillRect(x*sz,y*sz,sz,sz);
    // Checkerboard pattern for color 0 (transparent) indication
    if(ci===0){
      ex.fillStyle='rgba(255,255,255,0.08)';
      if((x+y)%2===0) ex.fillRect(x*sz,y*sz,sz/2,sz/2);
      if((x+y)%2===1) ex.fillRect(x*sz+sz/2,y*sz+sz/2,sz/2,sz/2);
    }
    ex.strokeStyle='rgba(255,255,255,0.08)';ex.strokeRect(x*sz,y*sz,sz,sz);
  }
  // Update tile hex label
  const hexEl=document.getElementById('sprEditTileHex');
  if(hexEl) hexEl.textContent='$'+ti.toString(16).toUpperCase().padStart(2,'0');

  // Pixel color selector
  const pcs=document.getElementById('sprPixColorSel');
  if(pcs){
    pcs.innerHTML='';
    for(let i=0;i<4;i++){
      const s=document.createElement('div');s.className='ps'+(i===sprPixColor?' sel':'');
      const nc=pl[i],rgb=NP[nc]||[0,0,0];
      s.style.background='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
      s.title=(i===0?'Transparent':'Color '+i)+' = $'+nc.toString(16).toUpperCase().padStart(2,'0');
      (function(ci){s.onclick=()=>{sprPixColor=ci;updateSprPixelEditor()}})(i);
      pcs.appendChild(s);
    }
    // Edit button
    const eb=document.createElement('span');eb.className='pal-edit';eb.textContent='\u270E';
    eb.title='Edit this palette color';
    eb.onclick=()=>{openPicker(getSprEditPal(),sprPixColor,eb,true)};
    pcs.appendChild(eb);
  }
  // Hex readout
  const hr=document.getElementById('sprPixHexRow');
  if(hr) hr.textContent=pl.map(c=>'$'+c.toString(16).toUpperCase().padStart(2,'0')).join(' ');
}

// Mouse handlers for sprite pixel editor


document.addEventListener('mouseup',function(){
  if(sprPixPainting){sprPixPainting=false}
});

function clearSprTile(){
  snapshot();
  const ti=getSprEditTile();
  for(let y=0;y<8;y++)for(let x=0;x<8;x++) S.sprChr[ti][y][x]=0;
  notify('sprClear');
  showToast('Cleared sprite tile $'+ti.toString(16).toUpperCase().padStart(2,'0'));
}

function editSprInChr(){
  S.chrBank='spr';
  S.editTile=getSprEditTile();
  document.getElementById('bankBg').classList.remove('on');
  document.getElementById('bankSpr').classList.add('on');
  switchTab('chr');
  showToast('Editing sprite tile $'+S.editTile.toString(16).toUpperCase().padStart(2,'0')+' in CHR Sheet');
}

function buildSprPalEditor(){const pe=document.getElementById('sprPalEditor');if(!pe)return;pe.innerHTML='';S.sprPal.forEach((pl,pi)=>{const row=document.createElement('div');row.className='pr';const label=document.createElement('span');label.className='pl';label.textContent='SP'+pi;row.appendChild(label);pl.forEach((n,ci)=>{const sw=document.createElement('div');sw.className='ps'+(pi===S.selSprPal&&ci===sprPixColor?' sel':'');sw.style.background='rgb('+NP[n].join(',')+')';sw.title='SP'+pi+' color '+ci+' = $'+n.toString(16);sw.onclick=()=>{S.selSprPal=pi;sprPixColor=ci;buildSprPalEditor();};sw.ondblclick=()=>openPicker(pi,ci,sw,true);row.appendChild(sw);});const edit=document.createElement('span');edit.className='pal-edit';edit.textContent='✎';edit.onclick=()=>openPicker(pi,sprPixColor,edit,true);row.appendChild(edit);pe.appendChild(row);});document.getElementById('sprPalHex').textContent=S.sprPal.map((p,i)=>'SP'+i+': '+p.map(c=>'$'+c.toString(16).padStart(2,'0')).join(' ')).join(' / ');}

// Keyboard: arrow keys nudge selected sprite


// ═══════════════════════════════════════════════
// NES ROM BUILDER — 6502 ASSEMBLER (in-browser)
// ═══════════════════════════════════════════════

// Pack scene metadata, entities, and links into STRIDE block
// This is shared between legacy and enhanced builders
const SCENE_TYPE_MAP={sideview:0,topdown:1,static:2};
const SCROLL_DIR_MAP={none:0,horizontal:1,vertical:2,both:3};
function packSceneMeta(blk,sc){const M=0x530,E=0x540,L=0x5C0;blk[M]=SCENE_TYPE_MAP[sc.sceneType]||0;blk[M+1]=SCROLL_DIR_MAP[sc.scrollDir]||0;blk[M+2]=sc.bgColor&63;blk[M+3]=sc.gravity&255;blk[M+4]=sc.entities.length;blk[M+5]=sc.links.length;blk[M+6]=sc.view.w&255;blk[M+7]=sc.view.w>>8;blk[M+8]=sc.view.h&255;blk[M+9]=sc.view.h>>8;blk[M+10]=sc.view.hBorder;blk[M+11]=sc.view.vBorder;const types=['player','enemy','npc','door','item','platform','trigger','spawn'];sc.entities.forEach((e,i)=>{const t=_et(e.type),o=E+i*8;blk[o]=Math.max(0,types.indexOf(e.type));blk[o+1]=e.x;blk[o+2]=e.y;blk[o+3]=e.type==='platform'?(e.pw||32):(e.w||t.w);blk[o+4]=e.h||t.h;blk[o+5]=e.targetScene??255;blk[o+6]=e.targetX||0;blk[o+7]=e.targetY||0;});sc.links.forEach((l,i)=>{const o=L+i*4;blk[o]=l.entIdx;blk[o+1]=l.targetScene;blk[o+2]=l.targetX;blk[o+3]=l.targetY;});}

function buildNesRom(){
  window._lastBuiltRom=null;const blog=document.getElementById('buildLog');blog.textContent='';const log=(msg,kind='bl-ok')=>{const el=document.createElement('div');el.className=kind;el.textContent=msg;blog.appendChild(el);};
  try{
    saveCurrentScene();S.asmSource=document.getElementById('codeInput').value;const custom=!!S.asmSource.trim(),pack=!custom||S.packScenes!==false;
    if(pack&&S.scenes.length>7)throw new Error('Default scene layout supports at most 7 scenes. Keep more in the project, but build a smaller scene set.');
    if(custom&&!asm_assemble())throw new Error(S.asmErrors.length?'Assembly failed — '+S.asmErrors[0].msg:'No executable code was emitted');
    const min=custom?Math.min(...S._asmWrites.map(x=>x[0])):0xC000;if(min<0x8000)throw new Error('ROM code must live at $8000–$FFFF. Use .rs for RAM variables.');const base=min<0xC000?0x8000:0xC000,prgSize=65536-base;let PRG=new Uint8Array(prgSize),engine=null;
    const writes=new Set();if(custom){for(const [addr,val]of S._asmWrites){PRG[addr-base]=val;writes.add(addr);}for(let a=0xFFFA;a<=0xFFFF;a++)if(!writes.has(a))throw new Error('Missing interrupt vectors: emit NMI, RESET and IRQ words at $FFFA.');}else{engine=makeViewerEngine(S.scenes.length);PRG=engine.prg;}
    if(!pack&&(S.chr.length>256||S.sprChr.length>256))throw Error('Unpacked custom CHR exceeds the 256-tile bank. Select/compile a static bank explicitly.');
    const atlas=pack?buildGraphicsAtlas(S.scenes,custom):{chr:S.chr,sprChr:S.sprChr,tileProps:S.tileProps,scenes:[]};
    if(pack){
      function reserve(addr,bytes){if(addr<base||addr+bytes.length>0xFFFA)throw new Error('Scene data would overlap interrupt vectors or exceed ROM capacity');for(let i=0;i<bytes.length;i++)if(writes.has(addr+i))throw new Error('Code/data overlap at $'+(addr+i).toString(16).toUpperCase()+'. Move code or disable "Pack scene data".');PRG.set(bytes,addr-base);}
      for(let si=0;si<atlas.scenes.length;si++){const sc=atlas.scenes[si];if(sc.entities.length>16||sc.links.length>16)throw new Error('Scene '+(si+1)+' exceeds 16 entities/links in the ROM layout');const oam=expandOAM(sc.oam);if(oam.length>64)throw new Error('Scene '+(si+1)+' needs '+oam.length+' 8×8 OAM entries; maximum 64');const block=new Uint8Array(1536);block.set(sc.nt);block.set(sc.attr,960);block.set(sc.pal.flat(),1024);block.set(sc.sprPal.flat(),1040);block[1056]=oam.length;oam.forEach((s,i)=>{if(s.y===0)throw new Error('Sprite at screen Y=0 cannot be exported as normal OAM. Move it to Y=1 or lower.');block.set([(s.y-1)&255,s.tile,s.attr,s.x],1057+i*4);});packSceneMeta(block,sc);reserve(0xD000+si*1536,block);}
      reserve(0xD000+atlas.scenes.length*1536,Uint8Array.from(atlas.tileProps));
      const marker=new Uint8Array(16);marker.set(new TextEncoder().encode('NFORGE14'));marker[8]=2;marker[9]=atlas.scenes.length;reserve(0xCFF0,marker);
      log('Packed '+atlas.scenes.length+' scenes; graphics remapped safely; collision table retained.');
    }
    const header=new Uint8Array(16);header.set([0x4E,0x45,0x53,0x1A,prgSize/16384,1,(S.mirroring==='v'?1:0)|(S.hasSRAM?2:0)]);const rom=new Uint8Array(16+prgSize+8192);rom.set(header);rom.set(PRG,16);rom.set(encodeTiles(atlas.chr),16+prgSize);rom.set(encodeTiles(atlas.sprChr),16+prgSize+4096);
    window._lastBuiltRom=rom;log('Built NROM: '+prgSize/1024+' KB PRG + 8 KB CHR. '+rom.length+' bytes.');log(custom?'Custom code assembled with address/overlap checks.':'Scene-viewer engine. START changes scenes; gameplay is not generated.','bl-warn');if(S.instruments.length||S.animations.length)log('Tracker/animation data remain in project backups; no automatic ROM playback engine.','bl-warn');
    if(!window._buildAndRunMode)download(rom,(S.projectName||'game').replace(/[^\w-]/g,'_')+'.nes');showToast('Build successful — '+rom.length+' bytes');return rom;
  }catch(e){log(e.message,'bl-err');reportError(e);return null;}
}

// ═══════════════════════════════════════════════
// v8: ENHANCED ROM BUILDER (wraps original + assembler)
// ═══════════════════════════════════════════════




function rom_updateMemMap(codeSize,dataSize,prgSize){
  const el=document.getElementById('memMap');
  if(!el)return;
  const maxW=200;
  const sceneCount=S.scenes.length;
  const tileDataSize=sceneCount*(960+64+32); // nt+attr+pal per scene
  const oamDataSize=sceneCount*253; // max OAM
  const metaDataSize=sceneCount*224; // metadata+entities+links
  const colSize=S.tileProps.some(p=>p>0)?256:0;
  const codePct=Math.max(2,Math.round(codeSize/prgSize*maxW));
  const tilePct=Math.max(2,Math.round(tileDataSize/prgSize*maxW));
  const metaPct=Math.max(1,Math.round((oamDataSize+metaDataSize)/prgSize*maxW));
  const colPct=colSize?Math.max(1,Math.round(colSize/prgSize*maxW)):0;
  const freePct=Math.max(2,maxW-codePct-tilePct-metaPct-colPct);
  el.innerHTML=
    '<div class="memmap-region"><div class="memmap-bar" style="width:20px;background:#446"></div><span class="memmap-label">$0000-$07FF RAM</span><span class="memmap-size">2KB</span></div>'+
    '<div class="memmap-region"><div class="memmap-bar" style="width:'+codePct+'px;background:#4a4"></div><span class="memmap-label">Code</span><span class="memmap-size">'+codeSize+'b</span></div>'+
    '<div class="memmap-region"><div class="memmap-bar" style="width:'+tilePct+'px;background:#a64"></div><span class="memmap-label">Scene tiles</span><span class="memmap-size">'+tileDataSize+'b ('+sceneCount+' scenes)</span></div>'+
    '<div class="memmap-region"><div class="memmap-bar" style="width:'+metaPct+'px;background:#6a4"></div><span class="memmap-label">OAM+entities+links</span><span class="memmap-size">'+(oamDataSize+metaDataSize)+'b</span></div>'+
    (colSize?'<div class="memmap-region"><div class="memmap-bar" style="width:'+colPct+'px;background:#a44"></div><span class="memmap-label">Collision</span><span class="memmap-size">256b</span></div>':'')+
    '<div class="memmap-region"><div class="memmap-bar" style="width:'+freePct+'px;background:#333"></div><span class="memmap-label">Free</span><span class="memmap-size">'+(prgSize-codeSize-dataSize-colSize)+'b</span></div>'+
    '<div class="memmap-region"><div class="memmap-bar" style="width:40px;background:#644"></div><span class="memmap-label">CHR</span><span class="memmap-size">8KB</span></div>';
}

// ═══════════════════════════════════════════════
// BROADCAST CHANNEL — CROSS-TAB STATE SYNC
// ═══════════════════════════════════════════════
const BC=typeof BroadcastChannel!=='undefined'?openSyncChannel():null;
let peerCount=0;
let bcThrottle=0;

function broadcastState(reason){if(!BC||syncApplying)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>{try{BC.postMessage({type:'state',session:syncSession,peer:syncPeer,seq:++syncSeq,state:projectData(),reason});}catch(e){reportError(e);}},50);}
function broadcastPing(){if(BC)BC.postMessage({type:'ping',session:syncSession,peer:syncPeer});}

// notify() = state changed by user action → render + broadcast
function notify(reason){markEdited(reason);}



function updateSyncDot(){const dot=document.getElementById('syncDot');for(const [p,t]of syncPeers)if(Date.now()-t>15000)syncPeers.delete(p);peerCount=syncPeers.size;dot.className='sync-dot '+(peerCount?'live':'solo');dot.title=peerCount?peerCount+' linked view(s) in this session':'Independent workspace; right-click a tab to open a linked view';}

// ═══════════════════════════════════════════════
// TAB CONTEXT MENU
// ═══════════════════════════════════════════════
let ctxTarget='scene';
function tabCtx(e,view){
  e.preventDefault();e.stopPropagation();
  ctxTarget=view;
  const menu=document.getElementById('tabCtxMenu');
  menu.style.left=e.clientX+'px';menu.style.top=e.clientY+'px';
  menu.classList.add('show');
}
document.addEventListener('click',()=>document.getElementById('tabCtxMenu').classList.remove('show'));
document.addEventListener('contextmenu',e=>{
  if(!e.target.classList.contains('tab'))document.getElementById('tabCtxMenu').classList.remove('show');
});

function tabCtxOpen(){window.open(linkedURL(ctxTarget),'_blank');document.getElementById('tabCtxMenu').classList.remove('show');}
function tabCtxOpenAll(){['scene','chr','meta','attr','sprites','code','audio','collision','anim','docs','emu','disasm'].forEach(v=>window.open(linkedURL(v),'_blank'));document.getElementById('tabCtxMenu').classList.remove('show');}
function tabCtxDetach(){window.open(linkedURL(ctxTarget),'nes_'+syncSession+'_'+ctxTarget,'width=1100,height=820,menubar=no,toolbar=no');document.getElementById('tabCtxMenu').classList.remove('show');}

// Middle-click on tabs opens in new tab
document.getElementById('tabBar').addEventListener('mousedown',function(e){
  if(e.button===1){// Middle click
    const btn=e.target.closest('.tab');
    if(btn){
      e.preventDefault();
      const view=btn.getAttribute('data-view');
      window.open(linkedURL(view),'_blank');
    }
  }
});

// ═══════════════════════════════════════════════
// HASH-BASED INITIAL VIEW
// ═══════════════════════════════════════════════
function getHashView(){
  const h=location.hash.replace('#','');
  if(['scene','chr','meta','attr','sprites','code','audio','collision','anim','docs','emu','disasm'].includes(h))return h;
  return 'scene';
}

// Listen for hash changes (e.g. user edits URL)
window.addEventListener('hashchange',()=>{
  switchTab(getHashView());
});

// Update hash when switching tabs locally
const _origSwitchTab=switchTab;
switchTab=function(t){
  _origSwitchTab(t);
  try{history.replaceState(null,'',location.href.split('#')[0]+'#'+t);}catch(e){/* Embedded previews may prohibit history. */}
};

// ═══════════════════════════════════════════════
// v8: RENDER STUBS FOR NEW TABS
// ═══════════════════════════════════════════════

function renderCode(){
  // Code tab uses the textarea editor, not the canvas
  // Just update syntax highlighting
  code_syncHighlight();
}

function renderAudio(){cv.width=650;cv.height=26+S.audRows*18;cx.fillStyle='#08080c';cx.fillRect(0,0,cv.width,cv.height);cx.font='11px monospace';const names=['Pulse 1','Pulse 2','Triangle','Noise','DPCM (not implemented)'];for(let ch=0;ch<5;ch++){const x=ch*130;cx.fillStyle='#5ad4ff';cx.fillText(names[ch],x+3,15);const p=S.patterns[S.orderList[aud_currentOrder]?.[ch]||0];for(let r=0;r<S.audRows;r++){const y=26+r*18,cell=p?.rows[r]?.[ch];cx.fillStyle=r===aud_currentRow&&ch===aud_selectedChannel?'#243f57':r%4===0?'#1b1b25':'#101018';cx.fillRect(x,y,128,17);const n=cell?.note??-1;const text=n===-2?'===':n<0?'---':['C-','C#','D-','D#','E-','F-','F#','G-','G#','A-','A#','B-'][n%12]+Math.floor(n/12);cx.fillStyle=ch===4?'#555':n>=0?'#8df57a':'#777';cx.fillText(String(r).padStart(3,'0')+' '+text+' '+((cell?.inst??-1)<0?'..':cell.inst.toString(16).padStart(2,'0')),x+3,y+12);}}aud_updateSidebar();}

function renderCollision(){
  // Render scene view with collision overlay
  renderScene();
  const cv=document.getElementById('cv');
  const bx=cv.getContext('2d');
  const z=+document.getElementById('oZoom').value;
  const colColors=['transparent','#ff000050','#ffff0050','#00ff0050','#ff880050','#0088ff50','#00ffff50','#ff00ff50'];
  for(let r=0;r<30;r++){
    for(let c=0;c<32;c++){
      const ti=S.nt[r*32+c];
      const prop=S.tileProps[ti];
      if(prop>0){
        bx.fillStyle=colColors[prop]||'transparent';
        bx.fillRect(c*8*z,r*8*z,8*z,8*z);
      }
    }
  }
  col_updateSidebar();
}

function renderAnim(){
  const cv=document.getElementById('cv');
  const bx=cv.getContext('2d');
  cv.width=256; cv.height=240;
  bx.fillStyle='#08080c'; bx.fillRect(0,0,256,240);
  // Draw current animation frame preview centered
  if(S.animations.length>0){
    const sel=S._selAnim||0;
    const anim=S.animations[sel];
    if(anim&&anim.frames.length>0){
      const fi=S._animFrame||0;
      const frame=anim.frames[fi%anim.frames.length];
      if(frame){
        const tile=S.sprChr[frame.tileIdx];
        if(tile){
          const scale=8;
          const ox=128-32, oy=120-32;
          for(let y=0;y<8;y++){
            for(let x=0;x<8;x++){
              const c=tile[y][x];
              if(c===0) continue;
              const rgb=NP[S.sprPal[0][c]];
              bx.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
              bx.fillRect(ox+x*scale,oy+y*scale,scale,scale);
            }
          }
        }
      }
    }
  } else {
    bx.fillStyle='#556';
    bx.font='11px Courier New';
    bx.fillText('No animations defined.',80,120);
    bx.fillText('Add one in the sidebar.',76,135);
  }
  anim_updateSidebar();
}

// ═══════════════════════════════════════════════
// v8: CODE EDITOR (syntax highlight + line numbers)
// ═══════════════════════════════════════════════
function code_syncHighlight(){
  const ta=document.getElementById('codeInput');
  const hl=document.getElementById('codeHighlight');
  const ln=document.getElementById('codeLineNums');
  if(!ta||!hl)return;
  S.asmSource=ta.value;
  // Syntax highlighting
  const lines=ta.value.split('\n');
  let html='';
  for(let i=0;i<lines.length;i++){
    html+=code_highlightLine(lines[i])+'\n';
  }
  hl.innerHTML=html;
  // Line numbers
  let nums='';
  for(let i=1;i<=lines.length;i++) nums+=i+'\n';
  if(ln) ln.textContent=nums;
}

function code_highlightLine(line){const code=asm_stripComment(line),comment=line.slice(code.length);let out='',pos=0;const rx=/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\.[A-Za-z]+)|(\$[0-9a-f]+|%[01]+)|\b([A-Za-z]{3})\b/gi;for(const m of code.matchAll(rx)){out+=esc(code.slice(pos,m.index));const cls=m[1]?'hl-str':m[2]?'hl-dir':m[3]?'hl-num':asm_MNEMONICS.has(m[4].toUpperCase())?'hl-instr':null;out+=cls?'<span class="'+cls+'">'+esc(m[0])+'</span>':esc(m[0]);pos=m.index+m[0].length;}return out+esc(code.slice(pos))+(comment?'<span class="hl-comment">'+esc(comment)+'</span>':'');}

// Wire up code editor events
(function(){
  const ta=document.getElementById('codeInput');
  if(!ta)return;
  ta.addEventListener('input',()=>code_syncHighlight());
  ta.addEventListener('scroll',()=>{
    const hl=document.getElementById('codeHighlight');
    const ln=document.getElementById('codeLineNums');
    if(hl){hl.scrollTop=ta.scrollTop;hl.scrollLeft=ta.scrollLeft;}
    if(ln) ln.scrollTop=ta.scrollTop;
  });
  ta.addEventListener('keydown',(e)=>{
    // Tab key inserts 2 spaces
    if(e.key==='Tab'){
      e.preventDefault();
      const start=ta.selectionStart;
      ta.value=ta.value.substring(0,start)+'  '+ta.value.substring(ta.selectionEnd);
      ta.selectionStart=ta.selectionEnd=start+2;
      code_syncHighlight();
    }
    // Ctrl+Enter assembles
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
      e.preventDefault();
      asm_assemble();
    }
  });
})();

// ═══════════════════════════════════════════════
// v8: 6502 ASSEMBLER ENGINE (Full two-pass)
// ═══════════════════════════════════════════════

// Addressing mode constants
const AM={IMP:0,ACC:1,IMM:2,ZP:3,ZPX:4,ZPY:5,ABS:6,ABX:7,ABY:8,IND:9,IZX:10,IZY:11,REL:12};
const AM_SZ=[1,1,2,2,2,2,3,3,3,3,2,2,2];

// Full 6502 opcode table: mnemonic_MODE → opcode byte
const asm_OP={
// LDA
LDA_IMM:0xA9,LDA_ZP:0xA5,LDA_ZPX:0xB5,LDA_ABS:0xAD,LDA_ABX:0xBD,LDA_ABY:0xB9,LDA_IZX:0xA1,LDA_IZY:0xB1,
// LDX
LDX_IMM:0xA2,LDX_ZP:0xA6,LDX_ZPY:0xB6,LDX_ABS:0xAE,LDX_ABY:0xBE,
// LDY
LDY_IMM:0xA0,LDY_ZP:0xA4,LDY_ZPX:0xB4,LDY_ABS:0xAC,LDY_ABX:0xBC,
// STA
STA_ZP:0x85,STA_ZPX:0x95,STA_ABS:0x8D,STA_ABX:0x9D,STA_ABY:0x99,STA_IZX:0x81,STA_IZY:0x91,
// STX
STX_ZP:0x86,STX_ZPY:0x96,STX_ABS:0x8E,
// STY
STY_ZP:0x84,STY_ZPX:0x94,STY_ABS:0x8C,
// ADC
ADC_IMM:0x69,ADC_ZP:0x65,ADC_ZPX:0x75,ADC_ABS:0x6D,ADC_ABX:0x7D,ADC_ABY:0x79,ADC_IZX:0x61,ADC_IZY:0x71,
// SBC
SBC_IMM:0xE9,SBC_ZP:0xE5,SBC_ZPX:0xF5,SBC_ABS:0xED,SBC_ABX:0xFD,SBC_ABY:0xF9,SBC_IZX:0xE1,SBC_IZY:0xF1,
// AND
AND_IMM:0x29,AND_ZP:0x25,AND_ZPX:0x35,AND_ABS:0x2D,AND_ABX:0x3D,AND_ABY:0x39,AND_IZX:0x21,AND_IZY:0x31,
// ORA
ORA_IMM:0x09,ORA_ZP:0x05,ORA_ZPX:0x15,ORA_ABS:0x0D,ORA_ABX:0x1D,ORA_ABY:0x19,ORA_IZX:0x01,ORA_IZY:0x11,
// EOR
EOR_IMM:0x49,EOR_ZP:0x45,EOR_ZPX:0x55,EOR_ABS:0x4D,EOR_ABX:0x5D,EOR_ABY:0x59,EOR_IZX:0x41,EOR_IZY:0x51,
// CMP
CMP_IMM:0xC9,CMP_ZP:0xC5,CMP_ZPX:0xD5,CMP_ABS:0xCD,CMP_ABX:0xDD,CMP_ABY:0xD9,CMP_IZX:0xC1,CMP_IZY:0xD1,
// CPX
CPX_IMM:0xE0,CPX_ZP:0xE4,CPX_ABS:0xEC,
// CPY
CPY_IMM:0xC0,CPY_ZP:0xC4,CPY_ABS:0xCC,
// BIT
BIT_ZP:0x24,BIT_ABS:0x2C,
// INC/DEC
INC_ZP:0xE6,INC_ZPX:0xF6,INC_ABS:0xEE,INC_ABX:0xFE,
DEC_ZP:0xC6,DEC_ZPX:0xD6,DEC_ABS:0xCE,DEC_ABX:0xDE,
// ASL
ASL_ACC:0x0A,ASL_ZP:0x06,ASL_ZPX:0x16,ASL_ABS:0x0E,ASL_ABX:0x1E,
// LSR
LSR_ACC:0x4A,LSR_ZP:0x46,LSR_ZPX:0x56,LSR_ABS:0x4E,LSR_ABX:0x5E,
// ROL
ROL_ACC:0x2A,ROL_ZP:0x26,ROL_ZPX:0x36,ROL_ABS:0x2E,ROL_ABX:0x3E,
// ROR
ROR_ACC:0x6A,ROR_ZP:0x66,ROR_ZPX:0x76,ROR_ABS:0x6E,ROR_ABX:0x7E,
// Branches (all REL)
BCC_REL:0x90,BCS_REL:0xB0,BEQ_REL:0xF0,BNE_REL:0xD0,BMI_REL:0x30,BPL_REL:0x10,BVC_REL:0x50,BVS_REL:0x70,
// Jumps
JMP_ABS:0x4C,JMP_IND:0x6C,JSR_ABS:0x20,
// Returns
RTS_IMP:0x60,RTI_IMP:0x40,
// Stack
PHA_IMP:0x48,PHP_IMP:0x08,PLA_IMP:0x68,PLP_IMP:0x28,
// Transfers
TAX_IMP:0xAA,TAY_IMP:0xA8,TXA_IMP:0x8A,TYA_IMP:0x98,TSX_IMP:0xBA,TXS_IMP:0x9A,
// Flags
SEC_IMP:0x38,CLC_IMP:0x18,SED_IMP:0xF8,CLD_IMP:0xD8,SEI_IMP:0x78,CLI_IMP:0x58,CLV_IMP:0xB8,
// Misc
INX_IMP:0xE8,INY_IMP:0xC8,DEX_IMP:0xCA,DEY_IMP:0x88,NOP_IMP:0xEA,BRK_IMP:0x00
};

// Which mnemonics are branch instructions (use REL addressing)
const asm_BRANCH=new Set(['BCC','BCS','BEQ','BNE','BMI','BPL','BVC','BVS']);

// Which mnemonics are implied-only (no operand)
const asm_IMPLIED=new Set(['RTS','RTI','PHA','PHP','PLA','PLP','TAX','TAY','TXA','TYA','TSX','TXS','SEC','CLC','SED','CLD','SEI','CLI','CLV','INX','INY','DEX','DEY','NOP','BRK']);

// Which mnemonics support accumulator mode (no operand or 'A')
const asm_ACCUM=new Set(['ASL','LSR','ROL','ROR']);

// All valid mnemonics
const asm_MNEMONICS=new Set(Object.keys(asm_OP).map(k=>k.split('_')[0]));

// Parse a numeric literal: $hex, %binary, decimal
function asm_parseNum(expr,symbols={},seen=new Set()){
  try{
    const source=String(expr??'').trim();if(!source)return NaN;
    const tokens=[];let pos=0;const pattern=/\s*(\$[0-9a-f]+|%[01]+|0x[0-9a-f]+|\d+|[A-Za-z_.][\w.]*|<<|>>|[()+\-*/%&|^~<>])/iy;
    let needsOperand=true;while(pos<source.length){pattern.lastIndex=pos;let m=pattern.exec(source);if(!m)return NaN;let token=m[1];if(!needsOperand&&token.startsWith('%')&&token.length>1){pos+=m[0].length-token.length+1;token='%';}else pos=pattern.lastIndex;tokens.push(token);needsOperand=token!==')'&&['(','+','-','~','<','>','*','/','%','&','|','^','<<','>>'].includes(token);}
    let i=0;const prec={'|':1,'^':2,'&':3,'<<':4,'>>':4,'+':5,'-':5,'*':6,'/':6,'%':6};
    function unary(){const t=tokens[i++];if(t===undefined)throw 0;if(['+','-','~','<','>'].includes(t)){const v=unary();return t==='+'?v:t==='-'?-v:t==='~'?~v:t==='<'?v&255:(v>>8)&255;}if(t==='('){const v=binary(0);if(tokens[i++]!==')')throw 0;return v;}if(/^\$/.test(t))return parseInt(t.slice(1),16);if(/^%[01]+$/.test(t))return parseInt(t.slice(1),2);if(/^(?:\d+|0x[0-9a-f]+)$/i.test(t))return Number(t);if(Object.prototype.hasOwnProperty.call(symbols,t)){const v=symbols[t];if(typeof v==='number')return v;if(seen.has(t))throw 0;const next=new Set(seen);next.add(t);return asm_parseNum(v,symbols,next);}throw 0;}
    function binary(min){let a=unary();while(i<tokens.length&&prec[tokens[i]]>=min){const op=tokens[i++],b=binary(prec[op]+1);a=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?Math.trunc(a/b):op==='%'?a%b:op==='&'?a&b:op==='|'?a|b:op==='^'?a^b:op==='<<'?a<<b:a>>b;}return a;}
    const value=binary(0);return i===tokens.length&&Number.isSafeInteger(value)?value:NaN;
  }catch(e){return NaN;}
}

// Detect addressing mode from operand string
function asm_detectMode(op,symbols={},forceAbs=false){op=String(op||'').trim();if(!op)return {mode:AM.IMP,val:0};if(/^a:/i.test(op)){op=op.slice(2);forceAbs=true;}if(/^a$/i.test(op))return {mode:AM.ACC,val:0};let m,expr,mode;if(op[0]==='#'){expr=op.slice(1);mode=AM.IMM;}else if(m=op.match(/^\(\s*(.+)\s*,\s*x\s*\)$/i)){expr=m[1];mode=AM.IZX;}else if(m=op.match(/^\(\s*(.+)\s*\)\s*,\s*y$/i)){expr=m[1];mode=AM.IZY;}else if(m=op.match(/^\(\s*(.+)\s*\)$/)){expr=m[1];mode=AM.IND;}else if(m=op.match(/^(.+),\s*([xy])$/i)){expr=m[1].trim();const v=asm_parseNum(expr,symbols);const zp=Number.isFinite(v)&&v>=0&&v<=255&&!forceAbs;mode=m[2].toLowerCase()==='x'?(zp?AM.ZPX:AM.ABX):(zp?AM.ZPY:AM.ABY);}else{expr=op;const v=asm_parseNum(expr,symbols);mode=Number.isFinite(v)&&v>=0&&v<=255&&!forceAbs?AM.ZP:AM.ABS;}return {mode,val:asm_parseNum(expr,symbols),expr};}

// Main assembler: two-pass
function asm_assemble(){
  const src=document.getElementById('codeInput').value;S.asmSource=src;const errors=[],symbols=Object.create(null),macros=Object.create(null),clean=[],expanded=[],ir=[];let macro=null;
  function err(line,msg){errors.push({line,msg});}
  for(const [line,text]of src.split('\n').entries()){const s=asm_stripComment(text).trim();const start=s.match(/^\.macro\s+([\w.]+)\s*(.*)$/i);if(macro){if(/^\.endm(?:acro)?$/i.test(s)){macros[macro.name]=macro;macro=null;}else macro.body.push(s);continue;}if(start){macro={name:start[1].toLowerCase(),params:asm_splitArgs(start[2]).filter(Boolean),body:[],line};continue;}clean.push({text:s,line});}if(macro)err(macro.line,'Unterminated macro '+macro.name);
  function expand(text,line,depth=0){if(depth>16){err(line,'Recursive macro expansion');return;}const label=text.match(/^([\w.]+):\s*(.*)$/);let rest=label?label[2]:text;const m=rest.match(/^([\w.]+)\s*(.*)$/);const mac=m&&macros[m[1].toLowerCase()];if(mac){if(label)expanded.push({text:label[1]+':',line});const args=asm_splitArgs(m[2]);if(args.length!==mac.params.length){err(line,'Macro '+m[1]+' expects '+mac.params.length+' argument(s)');return;}for(let body of mac.body){for(let j=0;j<mac.params.length;j++){if(!/^\w+$/.test(mac.params[j])){err(line,'Invalid macro parameter');return;}body=body.replace(new RegExp('\\b'+mac.params[j]+'\\b','g'),()=>args[j]);}expand(body,line,depth+1);}}else expanded.push({text,line});}
  clean.forEach(x=>expand(x.text,x.line));let pc=0xC000,rs=0,inEnum=false;const modeNames=Object.keys(AM);
  // Collect expression constants before instruction layout. Forward labels stay absolute.
  for(const {text,line}of expanded){const m=text.match(/^([\w.]+)\s*=\s*(.+)$/)||text.match(/^\.define\s+([\w.]+)\s+(.+)$/i);if(m){if(Object.hasOwn(symbols,m[1]))err(line,'Duplicate symbol '+m[1]);symbols[m[1]]=m[2];}}
  for(const entry of expanded){let {text,line}=entry;if(!text)continue;const label=text.match(/^([\w.]+)\s*:\s*(.*)$/);if(label){if(Object.hasOwn(symbols,label[1]))err(line,'Duplicate symbol '+label[1]);symbols[label[1]]=pc;text=label[2];if(!text)continue;}
    if(/^([\w.]+)\s*=/.test(text)||/^\.define\s/i.test(text))continue;
    const res=text.match(/^([\w.]+)\s+\.rs\s+(.+)$/i);if(res){const size=asm_parseNum(res[2],symbols);if(!Number.isFinite(size)||size<0)err(line,'Invalid reserve size');else {symbols[res[1]]=rs;rs+=size;}continue;}
    const dm=text.match(/^\.(\w+)\s*(.*)$/);if(dm){const dir=dm[1].toLowerCase(),args=dm[2];if(dir==='org'){const v=asm_parseNum(args,symbols);if(v<0||v>65535||!Number.isFinite(v))err(line,'Invalid .org '+args);else pc=v;continue;}if(['rsset','enum'].includes(dir)){const v=asm_parseNum(args,symbols);if(!Number.isFinite(v)||v<0)err(line,'Invalid reserve origin');else rs=v;inEnum=dir==='enum';continue;}if(dir==='ende'){inEnum=false;continue;}if(dir==='rs'&&label){const n=asm_parseNum(args,symbols);symbols[label[1]]=rs;if(!Number.isFinite(n)||n<0)err(line,'Invalid reserve size');else rs+=n;continue;}
      if(['byte','db','word','dw'].includes(dir)){const parts=asm_splitArgs(args);if(!parts.length){err(line,'Empty data directive');continue;}const word=['word','dw'].includes(dir);let size=0;for(const p of parts){if(!word&&/^["']/.test(p)){const str=asm_string(p);if(str===null)err(line,'Invalid string '+p);else size+=str.length;}else size+=word?2:1;}ir.push({type:'data',parts,word,pc,line});pc+=size;continue;}
      err(line,dir==='incbin'?'.incbin is not supported; use .byte or project assets':'Unknown directive .'+dir);continue;}
    const m=text.match(/^(\w+)\s*(.*)$/);if(!m){err(line,'Invalid statement');continue;}const mn=m[1].toUpperCase(),op=m[2];if(!asm_MNEMONICS.has(mn)){err(line,'Unknown instruction '+mn);continue;}
    let det=asm_BRANCH.has(mn)?{mode:AM.REL,expr:op,val:NaN}:asm_ACCUM.has(mn)&&(!op||/^a$/i.test(op))?{mode:AM.ACC,val:0}:asm_detectMode(op,symbols);
    let mode=det.mode;const promote={[AM.ZP]:AM.ABS,[AM.ZPX]:AM.ABX,[AM.ZPY]:AM.ABY};if(asm_OP[mn+'_'+modeNames[mode]]===undefined&&promote[mode]!==undefined)mode=promote[mode];
    if(asm_OP[mn+'_'+modeNames[mode]]===undefined)err(line,'Illegal addressing mode: '+mn+' '+modeNames[mode]);
    ir.push({type:'instruction',mn,mode,expr:det.expr,val:det.val,pc,line});pc+=AM_SZ[mode];if(pc>65536)err(line,'Code exceeds $FFFF');
  }
  for(const key of Object.keys(symbols)){const v=asm_parseNum(key,symbols);if(!Number.isFinite(v))err(0,'Unresolved or cyclic constant '+key);else symbols[key]=v;}
  const writes=new Map();function emit(address,value,line){if(address<0||address>65535){err(line,'Address outside 16-bit range');return;}if(writes.has(address)){err(line,'Overlapping .org/data at $'+address.toString(16));return;}writes.set(address,value&255);}
  for(const n of ir){let at=n.pc;if(n.type==='data'){for(const p of n.parts){if(!n.word&&/^["']/.test(p)){const str=asm_string(p);if(str!==null)for(const c of str){if(c.charCodeAt(0)>255)err(n.line,'Strings must contain byte-sized characters');emit(at++,c.charCodeAt(0),n.line);}}else{const v=asm_parseNum(p,symbols);if(!Number.isFinite(v))err(n.line,'Unresolved expression '+p);else if(v<(n.word?-32768:-128)||v>(n.word?65535:255))err(n.line,'Value out of range: '+p);emit(at++,v,n.line);if(n.word)emit(at++,v>>8,n.line);}}continue;}
    let v=n.expr===undefined?n.val:asm_parseNum(n.expr,symbols);if(!Number.isFinite(v)){err(n.line,'Unresolved operand '+n.expr);v=0;}if(n.mode===AM.REL){v=v-(n.pc+2);if(v<-128||v>127)err(n.line,'Branch out of range: '+v);}else if(AM_SZ[n.mode]===2&&(v<(n.mode===AM.IMM?-128:0)||v>255))err(n.line,'8-bit operand out of range');else if(AM_SZ[n.mode]===3&&(v<0||v>65535))err(n.line,'16-bit operand out of range');emit(at++,asm_OP[n.mn+'_'+modeNames[n.mode]]??0,n.line);if(AM_SZ[n.mode]>=2)emit(at++,v,n.line);if(AM_SZ[n.mode]>=3)emit(at++,v>>8,n.line);
  }
  const addresses=[...writes.keys()].sort((a,b)=>a-b),origin=addresses.length?addresses[0]:0xC000;const out=addresses.length?new Uint8Array(addresses.at(-1)-origin+1):new Uint8Array();for(const [a,v]of writes)out[a-origin]=v;
  S.asmErrors=errors;S.asmSymbols={...symbols};S.asmBinary=errors.length?null:out;S._asmOrg=origin;S._asmWrites=errors.length?null:[...writes];S._asmEmitted=addresses.length;
  asm_updatePanel();document.getElementById('asmResultOrg').textContent='$'+origin.toString(16).toUpperCase().padStart(4,'0');document.getElementById('asmStatus').textContent=errors.length?errors.length+' error(s)':addresses.length+' emitted bytes';showToast(errors.length?'Assembly failed: '+errors[0].msg:'Assembled '+addresses.length+' bytes');return !errors.length&&addresses.length>0;
}

function asm_updatePanel(){const status=document.getElementById('asmResultStatus');status.textContent=S.asmErrors.length?S.asmErrors.length+' error(s)':S.asmBinary?.length?'OK':'No output';status.className=S.asmErrors.length?'w':'v';document.getElementById('asmErrors').innerHTML=S.asmErrors.length?S.asmErrors.map(e=>'<div class="error-item" onclick="code_gotoLine('+e.line+')">Line '+(e.line+1)+': '+esc(e.msg)+'</div>').join(''):'<span>No errors</span>';document.getElementById('asmResultSize').textContent=(S._asmEmitted||0)+' emitted bytes';document.getElementById('asmSymbols').innerHTML=Object.entries(S.asmSymbols).sort((a,b)=>a[1]-b[1]).map(([n,v])=>'<div class="sym-row"><span>'+esc(n)+'</span><span class="sym-addr">$'+Number(v).toString(16).toUpperCase()+'</span></div>').join('');let text='';if(S.asmBinary)for(let i=0;i<Math.min(4096,S.asmBinary.length);i+=16)text+='$'+(S._asmOrg+i).toString(16).toUpperCase().padStart(4,'0')+': '+Array.from(S.asmBinary.slice(i,i+16),b=>b.toString(16).padStart(2,'0')).join(' ')+'\n';document.getElementById('asmHexDump').textContent=text+(S.asmBinary?.length>4096?'\nPreview limited to first 4096 bytes.':'')||'No output';}

function asm_insertTemplate(key){const ta=document.getElementById('codeInput');document.getElementById('asmTemplate').value='';if(!key)return;let text='';if(key==='sceneconstants'){text='\n; NES Forge 1.4 packed scene layout\nSCENE_DATA_BASE = $D000\nSCENE_STRIDE = $0600\nSCENE_NT = $0000\nSCENE_ATTR = $03C0\nSCENE_BGPAL = $0400\nSCENE_SPRPAL = $0410\nSCENE_OAMCNT = $0420\nSCENE_OAM = $0421\nSCENE_META = $0530\nSCENE_ENTITIES = $0540\nSCENE_LINKS = $05C0\nSCENE_COUNT = '+S.scenes.length+'\nCOLLISION_TABLE = $'+(0xD000+S.scenes.length*0x600).toString(16).toUpperCase()+'\n';const p=ta.selectionStart;ta.setRangeText(text,p,ta.selectionEnd,'end');}else{if(ta.value.trim()&&!confirm('Replace the code editor contents with this template?'))return;if(key==='minimal')text='; Minimal boot ROM — intentionally no graphics\n.org $C000\nreset:\n SEI\n CLD\n LDX #$FF\n TXS\n LDA #0\n STA $2000\n STA $2001\nloop:\n JMP loop\nnmi:\n RTI\nirq:\n RTI\n.org $FFFA\n.word nmi,reset,irq\n';else if(key==='sceneviewer'){const engine=makeViewerEngine(S.scenes.length);text='; Working NES Forge scene viewer. START cycles scenes.\n; Regenerate this template after changing the number of scenes.\n.org $C000\n';for(let off=0;off<engine.size;){const inst=disasm_one(engine.prg,off,0xC000+off);text+='  '+inst.asm+'\n';off+=inst.size;}text+='\n.org $FFFA\n.word $'+engine.nmi.toString(16)+',$'+engine.reset.toString(16)+',$'+engine.irq.toString(16)+'\n';}else return;ta.value=text;}S.asmSource=ta.value;code_syncHighlight();}

function code_gotoLine(lineIdx){
  const ta=document.getElementById('codeInput');
  if(!ta)return;
  const lines=ta.value.split('\n');
  let pos=0;
  for(let i=0;i<lineIdx&&i<lines.length;i++) pos+=lines[i].length+1;
  ta.focus();
  ta.setSelectionRange(pos,pos+((lines[lineIdx]||'').length));
}

// ═══════════════════════════════════════════════
// v8: AUDIO ENGINE (Web Audio API)
// ═══════════════════════════════════════════════
let aud_ctx=null;
let aud_playing=false;
let aud_currentRow=0;
let aud_currentOrder=0;
let aud_tickCount=0;
let aud_intervalId=null;
let aud_channels=[null,null,null,null,null]; // oscillators/sources
let aud_gains=[null,null,null,null,null];
let aud_masterGain=null;
let aud_noiseBuffer=null;
let aud_envCounters=[0,0,0,0,0]; // envelope tick counters per channel
let aud_activeInst=[-1,-1,-1,-1,-1]; // instrument index per channel
let aud_activeNote=[-1,-1,-1,-1,-1]; // current note per channel

// NES note frequency table (C-1 to B-8, NTSC)
const aud_NOTE_FREQ=[];
(function(){
  for(let n=0;n<96;n++){
    aud_NOTE_FREQ[n]=440*Math.pow(2,(n-57)/12); // A-4 = note 45
  }
})();

function aud_init(){
  if(aud_ctx) return;
  aud_ctx=new (window.AudioContext||window.webkitAudioContext)();
  aud_masterGain=aud_ctx.createGain();
  aud_masterGain.gain.value=0.3;
  aud_masterGain.connect(aud_ctx.destination);

  // Create gain nodes for each channel
  for(let ch=0;ch<5;ch++){
    aud_gains[ch]=aud_ctx.createGain();
    aud_gains[ch].gain.value=0;
    aud_gains[ch].connect(aud_masterGain);
  }

  // Pulse 1 & 2: start with square waves
  for(let ch=0;ch<2;ch++){
    const osc=aud_ctx.createOscillator();
    osc.type='square';
    osc.frequency.value=0;
    osc.connect(aud_gains[ch]);
    osc.start();
    aud_channels[ch]=osc;
  }

  // Triangle: channel 2
  const tri=aud_ctx.createOscillator();
  tri.type='triangle';
  tri.frequency.value=0;
  tri.connect(aud_gains[2]);
  tri.start();
  aud_channels[2]=tri;

  // Noise: channel 3 - white noise buffer
  const bufSize=aud_ctx.sampleRate*2;
  aud_noiseBuffer=aud_ctx.createBuffer(1,bufSize,aud_ctx.sampleRate);
  const data=aud_noiseBuffer.getChannelData(0);
  for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;

  // DPCM: channel 4 (placeholder — no source until sample loaded)
  aud_channels[4]=null;
}

function aud_setDuty(ch,duty){
  // Approximate NES duty cycles with PeriodicWave
  if(!aud_ctx||ch>1||!aud_channels[ch]) return;
  const osc=aud_channels[ch];
  const n=32; // harmonics
  const real=new Float32Array(n);
  const imag=new Float32Array(n);
  real[0]=0;imag[0]=0;
  const d=[0.125,0.25,0.5,0.75][duty]||0.5;
  for(let k=1;k<n;k++){
    imag[k]=(2/(k*Math.PI))*Math.sin(k*Math.PI*d);
  }
  const wave=aud_ctx.createPeriodicWave(real,imag,{disableNormalization:false});
  osc.setPeriodicWave(wave);
}

function aud_triggerNote(ch,note,instIdx){
  if(!aud_ctx||note<0||note>=96) return;
  const freq=aud_NOTE_FREQ[note];
  aud_activeNote[ch]=note;
  aud_activeInst[ch]=instIdx;
  aud_envCounters[ch]=0;

  if(ch<3&&aud_channels[ch]){
    aud_channels[ch].frequency.setValueAtTime(freq,aud_ctx.currentTime);
  }
  if(ch===3){
    // Noise: create a new buffer source each trigger
    if(aud_channels[3]){try{aud_channels[3].stop();}catch(e){}}
    const src=aud_ctx.createBufferSource();
    src.buffer=aud_noiseBuffer;
    src.loop=true;
    // Map note to playback rate (higher note = higher pitch noise)
    src.playbackRate.value=freq/440;
    src.connect(aud_gains[3]);
    src.start();
    aud_channels[3]=src;
  }

  // Apply instrument duty cycle for pulse channels
  if(ch<2&&instIdx>=0&&instIdx<S.instruments.length){
    const inst=S.instruments[instIdx];
    if(inst.dutyEnv&&inst.dutyEnv.length>0){
      aud_setDuty(ch,inst.dutyEnv[0]);
    }
  }

  // Set initial volume
  if(aud_gains[ch]){
    const vol=aud_getEnvVol(ch);
    aud_gains[ch].gain.setValueAtTime(vol,aud_ctx.currentTime);
  }
}

function aud_getEnvVol(ch){const inst=S.instruments[aud_activeInst[ch]];if(!inst)return 0;const env=inst.volEnv?.length?inst.volEnv:[15];let tick=aud_envCounters[ch];if(tick>=env.length){const loop=inst.loopVol;if(loop>=0&&loop<env.length)tick=loop+(tick-loop)%(env.length-loop);else return 0;}return clamp(env[tick],0,15)/15*(aud_volumes[ch]??1);}

function aud_cutNote(ch){
  aud_activeNote[ch]=-1;
  if(aud_gains[ch]) aud_gains[ch].gain.setValueAtTime(0,aud_ctx.currentTime);
}

function aud_tick(){if(!aud_playing)return;for(let ch=0;ch<4;ch++)if(aud_activeNote[ch]>=0){aud_envCounters[ch]++;aud_gains[ch]?.gain.setValueAtTime(aud_getEnvVol(ch),aud_ctx.currentTime);const inst=S.instruments[aud_activeInst[ch]];if(inst?.arpEnv?.length&&ch<3){const env=inst.arpEnv;let tick=aud_envCounters[ch];if(tick>=env.length)tick=inst.loopArp>=0&&inst.loopArp<env.length?inst.loopArp+(tick-inst.loopArp)%(env.length-inst.loopArp):env.length-1;aud_channels[ch]?.frequency.setValueAtTime(aud_NOTE_FREQ[clamp(aud_activeNote[ch]+env[tick],0,95)],aud_ctx.currentTime);}}
  if(++aud_tickCount>=S.speed){aud_tickCount=0;aud_currentRow++;if(aud_currentRow>=S.audRows){aud_currentRow=0;aud_currentOrder=(aud_currentOrder+1)%S.orderList.length;}aud_playRow();if(S.tab==='audio')renderAudio();}document.getElementById('audRow').textContent=aud_currentRow;document.getElementById('audOrd').textContent=aud_currentOrder;}

function aud_play(){try{if(!S.instruments.length){showToast('Add an instrument first');return;}aud_init();if(aud_ctx.state==='suspended')aud_ctx.resume().catch(reportError);if(aud_playing)aud_stop();aud_playing=true;aud_currentRow=0;aud_currentOrder=0;aud_tickCount=0;aud_playRow();aud_intervalId=setInterval(aud_tick,2500/S.tempo);showToast('Playing browser audio preview');}catch(e){reportError(e);}}

function aud_stop(){aud_playing=false;clearInterval(aud_intervalId);aud_intervalId=null;clearTimeout(previewTimeout);for(let ch=0;ch<5;ch++)aud_cutNote(ch);}
function aud_updateTempo(){snapshot();S.tempo=clamp(document.getElementById('audTempo').value,30,300,150);if(aud_playing){clearInterval(aud_intervalId);aud_intervalId=setInterval(aud_tick,2500/S.tempo);}notify('tempo');}
function aud_updateSpeed(){snapshot();S.speed=clamp(document.getElementById('audSpeed').value,1,15,6);notify('speed');}
function aud_updateRows(){snapshot();S.audRows=clamp(document.getElementById('audRows').value,16,128,64);for(const p of S.patterns)p.rows=Array.from({length:S.audRows},(_,r)=>p.rows[r]||Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})));aud_currentRow=Math.min(aud_currentRow,S.audRows-1);notify('rows');}

function aud_addInstrument(){snapshot();S.instruments.push({name:'Inst '+(S.instruments.length+1),volEnv:[15,14,12,10,8,6,4,2,0],dutyEnv:[2],arpEnv:[0,0,0,0,0,0,0,0],pitchEnv:[0],loopVol:-1,loopArp:-1});aud_selectInst(S.instruments.length-1);notify('instrumentAdd');}

function aud_updateInst(){const inst=S.instruments[aud_selectedInst];if(!inst)return;snapshot();inst.name=document.getElementById('instName').value.slice(0,80)||'Instrument';inst.dutyEnv=[clamp(document.getElementById('instDuty').value,0,3,2)];aud_updateSidebar();notify('instrument');}

function aud_addOrder(){snapshot();S.orderList.push([...(S.orderList.at(-1)||[0,0,0,0,0])]);aud_currentOrder=S.orderList.length-1;notify('order');}

function aud_updateSidebar(){document.getElementById('instCount').textContent=S.instruments.length;document.getElementById('instList').innerHTML=S.instruments.map((s,i)=>'<div class="inst-slot'+(i===aud_selectedInst?' sel':'')+'" onclick="aud_selectInst('+i+')">'+i.toString(16).padStart(2,'0')+' '+esc(s.name)+'</div>').join('')||'<p>No instruments; add one to start.</p>';document.getElementById('orderList').innerHTML=S.orderList.map((row,i)=>'<div class="order-row'+(i===aud_currentOrder?' sel':'')+'" onclick="aud_chooseOrder('+i+')"><span>'+i.toString(16).padStart(2,'0')+'</span> '+row.map((v,ch)=>'<button onclick="event.stopPropagation();aud_choosePattern('+i+','+ch+')" title="Channel '+(ch+1)+' pattern">'+v.toString(16).padStart(2,'0')+'</button>').join(' ')+'</div>').join('');document.getElementById('instEditor').style.display=S.instruments[aud_selectedInst]?'block':'none';const inst=S.instruments[aud_selectedInst];if(inst){if(document.activeElement.id!=='instName')document.getElementById('instName').value=inst.name;if(document.activeElement.id!=='instDuty')document.getElementById('instDuty').value=inst.dutyEnv?.[0]??2;aud_drawEnvelopes();}}

function aud_selectInst(idx){if(!S.instruments[idx])return;aud_selectedInst=idx;const inst=S.instruments[idx];document.getElementById('instName').value=inst.name;document.getElementById('instDuty').value=inst.dutyEnv?.[0]??2;aud_updateSidebar();aud_drawEnvelopes();}

// ═══════════════════════════════════════════════
// v8: COLLISION EDITOR (Phase 5)
// ═══════════════════════════════════════════════
function col_updateProp(){
  // Current property selector value
}

function col_updateSidebar(){
  // Update stats
  let solid=0,plat=0,hazard=0;
  for(let i=0;i<256;i++){
    if(S.tileProps[i]===1) solid++;
    else if(S.tileProps[i]===2) plat++;
    else if(S.tileProps[i]===4) hazard++;
  }
  const el=id=>document.getElementById(id);
  if(el('colSolid')) el('colSolid').textContent=solid;
  if(el('colPlatform')) el('colPlatform').textContent=plat;
  if(el('colHazard')) el('colHazard').textContent=hazard;
  // Build tile grid
  col_buildTileGrid();
}

function col_buildTileGrid(){const grid=document.getElementById('colTileGrid');if(!grid)return;grid.innerHTML='';const colors=['transparent','#ff000080','#ffff0080','#00ff0080','#ff880080','#0088ff80','#00ffff80','#ff00ff80'];for(let i=0;i<256;i++){const cell=document.createElement('div');cell.className='col-tile-cell';cell.title='Tile $'+i.toString(16).padStart(2,'0')+' · property '+S.tileProps[i];cell.onclick=()=>col_setTileProp(i);const c=document.createElement('canvas');c.width=8;c.height=8;drawTileAt(c.getContext('2d'),0,0,i,0,1);cell.appendChild(c);const dot=document.createElement('div');dot.className='col-dot';dot.style.background=colors[S.tileProps[i]];cell.appendChild(dot);grid.appendChild(cell);}}

function col_setTileProp(tileIdx){const prop=clamp(document.getElementById('colPropSel').value,0,7);if(S.tileProps[tileIdx]===prop)return;snapshot();S.tileProps[tileIdx]=prop;notify('collision');}

// ═══════════════════════════════════════════════
// v8: ANIMATION EDITOR (Phase 6)
// ═══════════════════════════════════════════════
if(!S._selAnim) S._selAnim=0;
if(!S._animFrame) S._animFrame=0;
let _animTimer=null;

function anim_add(){snapshot();S.animations.push({name:'Anim '+(S.animations.length+1),state:'idle',frames:[{tileIdx:0,duration:8}],loop:true,flipOnReverse:false});S._selAnim=S.animations.length-1;S._animFrame=0;notify('animationAdd');}

function anim_addFrame(){const a=S.animations[S._selAnim];if(!a)return;snapshot();a.frames.splice(S._animFrame+1,0,{...(a.frames[S._animFrame]||{tileIdx:0,duration:8})});S._animFrame++;notify('frameAdd');}

function anim_delFrame(){const a=S.animations[S._selAnim];if(!a||a.frames.length<=1)return;snapshot();a.frames.splice(S._animFrame,1);S._animFrame=Math.min(S._animFrame,a.frames.length-1);notify('frameDelete');}

function anim_updateProp(){
  if(!S.animations.length)return;
  snapshot();
  const anim=S.animations[S._selAnim];
  if(!anim)return;
  anim.name=document.getElementById('animName').value||anim.name;
  anim.state=document.getElementById('animState').value;
  anim.loop=document.getElementById('animLoop').checked;
  anim.flipOnReverse=document.getElementById('animFlip').checked;
  anim_updateSidebar();broadcastState('animationProperty');
}

function anim_updateFrame(){const frame=S.animations[S._selAnim]?.frames[S._animFrame];if(!frame)return;snapshot();frame.tileIdx=clamp(document.getElementById('frameTile').value,0,255);frame.duration=clamp(document.getElementById('frameDur').value,1,255,8);notify('animationFrame');}

function anim_updateSidebar(){
  const list=document.getElementById('animList');
  const count=document.getElementById('animCount');
  const editor=document.getElementById('animEditor');
  if(count) count.textContent=S.animations.length;
  if(list){
    list.innerHTML=S.animations.map((a,i)=>
      '<div class="anim-slot'+(i===S._selAnim?' sel':'')+'" onclick="anim_select('+i+')">'+
      '<span style="color:var(--acc)">#'+i+'</span> '+esc(a.name)+
      ' <span style="color:var(--dim)">('+a.frames.length+' frames)</span></div>'
    ).join('')||'<span style="color:var(--dim);font-size:8px;padding:4px">No animations</span>';
  }
  if(editor){
    if(S.animations.length>0&&S.animations[S._selAnim]){
      editor.style.display='block';
      const anim=S.animations[S._selAnim];
      document.getElementById('animEditName').textContent=anim.name;
      document.getElementById('animName').value=anim.name;
      document.getElementById('animState').value=anim.state;
      document.getElementById('animLoop').checked=anim.loop;
      document.getElementById('animFlip').checked=anim.flipOnReverse;
      // Timeline
      const tl=document.getElementById('animTimeline');
      if(tl){
        tl.innerHTML=anim.frames.map((f,fi)=>
          '<div class="anim-frame'+(fi===S._animFrame?' sel':'')+'" onclick="anim_selectFrame('+fi+')">'+
          '<canvas width="8" height="8"></canvas>'+
          '$'+f.tileIdx.toString(16).toUpperCase().padStart(2,'0')+'<br>'+f.duration+'f</div>'
        ).join('');
      }
      if(tl)tl.querySelectorAll('canvas').forEach((c,i)=>drawSpriteTileSolid(c.getContext('2d'),0,0,anim.frames[i].tileIdx,0,1));
      const ac=document.getElementById('animPreviewCv'),ax=ac.getContext('2d');ax.clearRect(0,0,64,64);drawSpriteTileSolid(ax,0,0,anim.frames[S._animFrame]?.tileIdx||0,0,8);
      // Frame props
      const fp=document.getElementById('frameProps');
      if(fp&&anim.frames[S._animFrame]){
        fp.style.display='grid';
        document.getElementById('frameTile').value=anim.frames[S._animFrame].tileIdx;
        document.getElementById('frameDur').value=anim.frames[S._animFrame].duration;
      }
    } else {
      editor.style.display='none';
    }
  }
}

function anim_select(idx){
  S._selAnim=idx;
  S._animFrame=0;
  render();
}

function anim_selectFrame(idx){const a=S.animations[S._selAnim];if(a&&idx>=0&&idx<a.frames.length){S._animFrame=idx;render();}}

function anim_playPreview(){anim_stopPreview();const a=S.animations[S._selAnim];if(!a?.frames.length)return;S._animFrame=0;render();let count=0;_animTimer=setInterval(()=>{if(S.animations[S._selAnim]!==a){anim_stopPreview();return;}if(++count>=clamp(a.frames[S._animFrame]?.duration,1,255,8)){count=0;if(S._animFrame===a.frames.length-1&&!a.loop){anim_stopPreview();return;}S._animFrame=(S._animFrame+1)%a.frames.length;render();}},1000/60);}

function anim_stopPreview(){
  if(_animTimer){ clearInterval(_animTimer); _animTimer=null; }
}

// ═══════════════════════════════════════════════
// v8: ROM CONFIG
// ═══════════════════════════════════════════════
function rom_updateConfig(){snapshot();S.mirroring=document.getElementById('cfgMirror').value;S.hasSRAM=document.getElementById('cfgSRAM').checked;notify('romConfig');}

// ═══════════════════════════════════════════════
// v8: PROJECT PERSISTENCE (IndexedDB)
// ═══════════════════════════════════════════════
const DB_NAME='nes-tile-studio-v8';
const DB_STORE='projects';
const DB_VER=1;

function db_open(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VER);
    req.onupgradeneeded=function(e){
      const db=e.target.result;
      if(!db.objectStoreNames.contains(DB_STORE)){
        db.createObjectStore(DB_STORE,{keyPath:'id',autoIncrement:true});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function db_serializeState(){return JSON.stringify(projectData());}

function db_deserializeState(json,options={}){
  const d=typeof json==='string'?JSON.parse(json):copyData(json);
  if(!d||typeof d!=='object'||!Array.isArray(d.scenes)||!d.scenes.length||d.scenes.length>64)throw new Error('Invalid project: expected 1–64 scenes');
  if(d.version>3)throw new Error('This project needs a newer NES Forge version');
  // Validate collection shapes before mutating any live state.
  for(const key of ['instruments','patterns','orderList','animations','metasprites','sfx'])if(d[key]!=null&&!Array.isArray(d[key]))throw new Error('Invalid project collection: '+key);
  if((d.patterns?.length||0)>256||(d.instruments?.length||0)>256||(d.orderList?.length||0)>1024)throw new Error('Project audio collections exceed supported limits');
  for(const key of ['instruments','patterns','animations'])for(const item of d[key]||[])if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Invalid '+key+' entry');
  for(const item of d.instruments||[])for(const key of ['volEnv','dutyEnv','arpEnv'])if(item[key]!=null&&!Array.isArray(item[key]))throw new Error('Invalid instrument envelope');
  for(const item of d.animations||[]){if(item.frames!=null&&!Array.isArray(item.frames))throw new Error('Invalid animation frames');for(const f of item.frames||[])if(!f||typeof f!=='object')throw new Error('Invalid animation frame');}
  for(const row of d.orderList||[])if(!Array.isArray(row))throw new Error('Invalid pattern order row');
  for(const sc of d.scenes){if(!sc||typeof sc!=='object'||Array.isArray(sc))throw new Error('Invalid scene entry');for(const key of ['entities','links','oam']){if(sc[key]!=null&&!Array.isArray(sc[key]))throw new Error('Invalid scene '+key);for(const item of sc[key]||[])if(!item||typeof item!=='object')throw new Error('Invalid scene '+key+' entry');}if((sc.oam?.length||0)>64)throw new Error('Scene exceeds 64 OAM sprites');}

  if(JSON.stringify(d).length>64*1024*1024)throw new Error('Project is too large');
  const rom=typeof d.importedRom==='string'?base64ToBytes(d.importedRom):Array.isArray(d.importedRom)?Uint8Array.from(d.importedRom):null;
  if(rom)parseRomHeader(rom);
  const scenes=d.scenes.map(sc=>makeScene({...sc,chr:sc.chr||d.chr,sprChr:sc.sprChr||d.sprChr,tileProps:sc.tileProps||d.tileProps}));
  const active=clamp(d.activeScene,0,scenes.length-1);
  // Legacy autosaves contain newer live fields than their scene record. Migrate those first.
  if(!d.version){for(const k of ['nt','attr','pal','sprPal','oam'])if(Array.isArray(d[k]))scenes[active][k]=copyData(d[k]);if(d.pal?.[0]?.[0]!==undefined)scenes[active].bgColor=d.pal[0][0];scenes[active]=makeScene(scenes[active]);}
  const patterns=Array.isArray(d.patterns)&&d.patterns.length?d.patterns.map(p=>({rows:Array.from({length:clamp(p.rows?.length||d.audRows||64,16,128,64)},(_,r)=>Array.from({length:5},(_,ch)=>({note:clamp(p.rows?.[r]?.[ch]?.note??-1,-2,95,-1),inst:clamp(p.rows?.[r]?.[ch]?.inst??-1,-1,255,-1),vol:clamp(p.rows?.[r]?.[ch]?.vol??-1,-1,15,-1),fx:clamp(p.rows?.[r]?.[ch]?.fx,0,255),fxp:clamp(p.rows?.[r]?.[ch]?.fxp,0,255)})))})):[{rows:Array.from({length:64},()=>Array.from({length:5},()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0})))}];
  if(!options.history&&!options.sync){emuPause();aud_stop();anim_stopPreview();emu.loaded=false;window._lastBuiltRom=null;disasm_output='';disasm_asmText='';undoStack.length=0;redoStack.length=0;undoBytes=0;S.projectId=null;['emuRunBtn','emuStepBtn','emuResetBtn','emuCapBtn','emuCapFrameBtn','emuCapHybridBtn','emuTraceBtn'].forEach(id=>document.getElementById(id).disabled=true);}
  S.scenes=scenes;S.activeScene=active;S.importedRom=rom;S.allChrBanks=rom?romChrBanks(rom):[];S.chrBankIdx=0;
  S.asmSource=String(d.asmSource||'');document.getElementById('codeInput').value=S.asmSource;S.asmBinary=null;S.asmErrors=[];S.asmSymbols={};S._asmWrites=null;
  S.instruments=(Array.isArray(d.instruments)?d.instruments:[]).slice(0,256).map(i=>({name:String(i.name||'Instrument').slice(0,80),volEnv:Array.from(i.volEnv?.length?i.volEnv:[15],v=>clamp(v,0,15)).slice(0,256),dutyEnv:[clamp(i.dutyEnv?.[0],0,3,2)],arpEnv:Array.from(i.arpEnv?.length?i.arpEnv:[0],v=>clamp(v,-24,24)).slice(0,256),pitchEnv:[0],loopVol:clamp(i.loopVol??-1,-1,255,-1),loopArp:clamp(i.loopArp??-1,-1,255,-1)}));S.patterns=patterns;S.orderList=(d.orderList?.length?d.orderList:[[0,0,0,0,0]]).map(row=>Array.from({length:5},(_,ch)=>clamp(row[ch],0,patterns.length-1)));
  S.tempo=clamp(d.tempo,30,300,150);S.speed=clamp(d.speed,1,15,6);S.audRows=clamp(d.audRows,16,128,64);S.sfx=copyData(d.sfx||[]);
  S.animations=(d.animations||[]).map(a=>({...a,name:String(a.name||'Animation'),frames:(a.frames?.length?a.frames:[{tileIdx:0,duration:8}]).map(f=>({tileIdx:clamp(f.tileIdx,0,255),duration:clamp(f.duration,1,255,8)}))}));S.metasprites=copyData(d.metasprites||[]);
  S.mapper=clamp(d.mapper,0,4095);S.mirroring=d.mirroring==='h'?'h':'v';S.hasSRAM=!!d.hasSRAM;S.prgBanks=clamp(d.prgBanks,1,4095,1);S.chrBanks=clamp(d.chrBanks,0,4095,1);S.packScenes=d.packScenes!==false;S.projectName=String(d.projectName||'Untitled').slice(0,120);
  loadSceneData(active);for(const k of ['selTile','editTile','selSprite','selEntity','_selAnim','_animFrame'])if(Number.isInteger(d[k]))S[k]=d[k];S._selAnim=clamp(S._selAnim,0,Math.max(0,S.animations.length-1));S._animFrame=clamp(S._animFrame,0,Math.max(0,(S.animations[S._selAnim]?.frames.length||1)-1));S.chrBank=d.chrBank==='spr'?'spr':'bg';
  for(const sc of S.scenes)sceneLinks(sc);aud_selectedInst=S.instruments.length?0:-1;aud_currentRow=0;aud_currentOrder=0;
  document.getElementById('undoBtn').disabled=!undoStack.length;rebuildAllUI();return true;
}

async function db_save(name){let db;try{name=String(name||S.projectName).trim().slice(0,120)||'Untitled';const data=projectData();data.projectName=name;db=await db_open();const id=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');const record={name,timestamp:Date.now(),state:JSON.stringify(data)};if(S.projectId)record.id=S.projectId;const req=tx.objectStore(DB_STORE).put(record);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('Save failed'));tx.onabort=()=>reject(tx.error||new Error('Save aborted'));});S.projectId=id;S.projectName=name;document.getElementById('projName').textContent=name;showToast('Saved: '+name);return id;}catch(e){reportError(new Error('Browser save failed: '+e.message+'. Use Download Project for a portable backup.'));return null;}finally{db?.close();}}

async function db_load(id){let db;try{db=await db_open();const record=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});if(!record)throw new Error('Saved project no longer exists');db_deserializeState(record.state);S.projectId=id;S.projectName=record.name;document.getElementById('projName').textContent=record.name;db_hideLoad();broadcastState('projectLoad');showToast('Loaded: '+record.name);return true;}catch(e){reportError(e);return false;}finally{db?.close();}}

async function db_list(){
  try{
    const db=await db_open();
    const tx=db.transaction(DB_STORE,'readonly');
    const store=tx.objectStore(DB_STORE);
    const req=store.getAll();
    return new Promise((resolve)=>{
      req.onsuccess=()=>{
        resolve(req.result||[]);
        db.close();
      };
      req.onerror=()=>{ resolve([]); db.close(); };
    });
  }catch(e){ return []; }
}

async function db_delete(id){if(!confirm('Permanently delete this saved project? Your open workspace will remain.'))return;let db;try{db=await db_open();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});if(S.projectId===id)S.projectId=null;await db_showLoad();}catch(e){reportError(e);}finally{db?.close();}}

function db_savePrompt(){
  const name=prompt('Project name:',S.projectName);
  if(name) db_save(name);
}

async function db_showLoad(){
  const modal=document.getElementById('projModal');
  const list=document.getElementById('projList');
  modal.classList.add('show');
  const projects=await db_list();
  if(projects.length===0){
    list.innerHTML='<span style="color:var(--dim);font-size:9px;padding:8px;display:block">No saved projects. Use Save to create one.</span>';
  } else {
    list.innerHTML=projects.sort((a,b)=>b.timestamp-a.timestamp).map(p=>
      '<div class="project-item" onclick="db_load('+p.id+')">'+
      '<span class="pi-name">'+esc(p.name)+'</span>'+
      '<span class="pi-date">'+new Date(p.timestamp).toLocaleString()+'</span>'+
      '<span class="pi-del" onclick="event.stopPropagation();db_delete('+p.id+')" title="Delete">&times;</span>'+
      '</div>'
    ).join('');
  }
}

function db_hideLoad(){
  document.getElementById('projModal').classList.remove('show');
}

// Autosave
const AUTOSAVE_KEY='nes-tile-studio-v8-autosave';
let _autoSaveTimer=null;

function db_autoSave(){if(recoveryPending)return;try{localStorage.setItem(AUTOSAVE_KEY,db_serializeState());autoSaveWarning=false;}catch(e){if(!autoSaveWarning){autoSaveWarning=true;const el=document.getElementById('issueStatus');if(el){el.textContent='Autosave unavailable — use Download Project';el.title=e.message;}}}}

function db_checkAutosave(){try{recoveryPending=!!localStorage.getItem(AUTOSAVE_KEY);document.getElementById('autosaveBanner').classList.toggle('show',recoveryPending);}catch(e){recoveryPending=false;autoSaveWarning=true;document.getElementById('issueStatus').textContent='Browser storage unavailable — Download Project still works';}}

function db_restoreAutosave(){try{const saved=localStorage.getItem(AUTOSAVE_KEY);if(saved)db_deserializeState(saved);recoveryPending=false;document.getElementById('autosaveBanner').classList.remove('show');broadcastState('restore');showToast('Recovery restored');}catch(e){reportError(e);}}

function db_dismissAutosave(){recoveryPending=false;document.getElementById('autosaveBanner').classList.remove('show');try{localStorage.removeItem(AUTOSAVE_KEY);}catch(e){reportError(e);}}

// Start autosave interval
_autoSaveTimer=setInterval(db_autoSave,30000);

// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// NES FORGE: 6502 CPU EMULATOR (from v9.1 core)
// ═══════════════════════════════════════════════
