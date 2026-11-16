
/* Offline companion for the Build 5 workshop. Converts one recovered background
   into a tileset for one authored World. Original source ROM bytes are never copied. */
'use strict';
const WorkshopTransfer = (() => {
  const cv = new Set(['55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8','0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53']);
  const profiles = {
    'contra-us-prg-layout-v1':'26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519',
    'megaman-us-prg-layout-v1':'1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5',
    'tmnt-us-area1-blocks-v1':'9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083'
  };
  const copy = x => JSON.parse(JSON.stringify(x));
  function check(ok, message) { if (!ok) throw Error(message); }
  const zeros = n => Array(n).fill(0);
  const emptyTile = () => Array.from({length:8}, () => zeros(8));
  const list = (value, length, max) => Array.isArray(value) && value.length===length && value.every(n=>Number.isInteger(n)&&n>=0&&n<=max);
  function receipt(scene) {
    const m=scene?.captureMeta;
    if (!m || scene.raster || scene.sceneType!=='static') return null;
    const castle=m.castlevaniaGraphics;
    if (castle?.kind==='cv-courtyard' && cv.has(castle.sourceSha256) && Number.isInteger(castle.index) && castle.index>=0 && castle.index<3)
      return {sourceSha256:castle.sourceSha256,resource:'cv-courtyard',page:castle.index};
    const page=m.nativeResource || m.nativeLayout;
    if (page && Object.hasOwn(profiles,page.adapter) && profiles[page.adapter]===page.sourceSha256)
      return {sourceSha256:page.sourceSha256,resource:page.resource??('area1-screen-'+page.screen),page:page.page??0};
    return null;
  }
  function sources(p) {
    check(p?.format==='NESForge' && Array.isArray(p.scenes),'Choose a donor project saved in Forge after opening its recovered page.');
    return p.scenes.map((s,index)=>({index,name:s.name,receipt:receipt(s)})).filter(s=>s.receipt);
  }
  function destinations(p) {
    check(p?.format==='NESForge' && !p.nativeGame && !p.investigation && !p.importedRom && p.worldRuntime?.enabled && p.mapper===0 && !String(p.asmSource||'').trim(),'Choose a saved, independently authored NROM World project. The two workshop checkpoints both qualify.');
    check(Array.isArray(p.scenes) && Array.isArray(p.worlds),'The project is missing Scenes or Worlds.');
    return p.worlds.map((w,index)=>({index,id:w.id,name:w.name,usable:w.widthScreens===1 && w.heightScreens===1 && w.id!=='win'})).filter(x=>x.usable);
  }
  function transfer(donor, sceneIndex, campaign, worldIndex, region='full') {
    check(sources(donor).some(s=>s.index===sceneIndex),'Choose a recovered static page listed for this donor.');
    check(destinations(campaign).some(w=>w.index===worldIndex),'Choose a one-screen destination World.');
    check(['full','detail'].includes(region),'Unknown page region.');
    const src=donor.scenes[sceneIndex], proof=receipt(src), p=copy(campaign), w=p.worlds[worldIndex];
    const prev=p.scenes.find(sc=>sc.id===w.tilesetSceneId);
    check(prev && Array.isArray(prev.metatiles) && Array.isArray(w.map) && w.map.length===240,'The destination World has invalid terrain.');
    check(!prev.captureMeta?.workshopPage,'This World already has a workshop transfer. Use your pre-transfer save to try a different page there.');
    check(p.scenes.length<64,'Forge has no free Scene slot.');
    check(list(src.nt,960,255)&&list(src.attr,64,255)&&Array.isArray(src.chr)&&src.chr.length===256&&Array.isArray(src.pal)&&src.pal.length===4&&src.pal.every(r=>list(r,4,63)),'The recovered page needs a standard nametable, attributes, palette, and 256 background patterns.');
    const defs=new Map(prev.metatiles.map(m=>[m.id,m]));
    const blank=emptyTile(), used=[blank], graphics=new Map([[JSON.stringify(blank),0]]), ids=new Map(), mapped=zeros(960);
    const blockIds=new Map(), meta=[], map=[], attr=zeros(64);
    const sourceArea=region==='full'?{x:0,y:0,w:16,h:15}:{x:4,y:4,w:8,h:6};
    function pattern(raw) {
      if(ids.has(raw))return ids.get(raw);
      const tile=src.chr[raw];check(Array.isArray(tile)&&tile.length===8&&tile.every(r=>list(r,8,3)),'Invalid source tile pixels.');
      const k=JSON.stringify(tile);if(!graphics.has(k)){graphics.set(k,used.length);used.push(copy(tile));}const id=graphics.get(k);ids.set(raw,id);return id;
    }
    for(let y=0;y<15;y++)for(let x=0;x<16;x++) {
      const i=y*16+x, collision=w.map[i]===-1?[0,0,0,0]:defs.get(w.map[i])?.collision;
      check(list(collision,4,1),'World Runtime needs an authored Empty/Solid collision layout.');
      const selected=x>=sourceArea.x&&x<sourceArea.x+sourceArea.w&&y>=sourceArea.y&&y<sourceArea.y+sourceArea.h;
      const ai=(y>>1)*8+(x>>1), shift=((y%2)*2+x%2)*2, pal=selected?(src.attr[ai]>>shift)&3:0, nt=y*64+x*2;
      const ts=[0,1,32,33].map(delta=>mapped[nt+delta]=selected?pattern(src.nt[nt+delta]):0);
      attr[ai]|=pal<<shift;
      if(ts.every(t=>!t)&&collision.every(v=>!v)&&pal===0){map.push(-1);continue;}
      const key=[...ts,pal,...collision].join(',');
      if(!blockIds.has(key)){
        const id=meta.length;check(id<255,'The page exceeds the Forge metatile limit.');blockIds.set(key,id);
        meta.push({id,name:'B'+id,category:'',tiles:ts,pal,collision:collision.slice(),flags:0});
      }
      map.push(blockIds.get(key));
    }
    const unique=used.length;while(used.length<256)used.push(emptyTile());
    let id='ws-page-'+(worldIndex+1);while(p.scenes.some(s=>s.id===id))id+='x';
    const copied={
      id,name:src.name.slice(0,100),nt:mapped,attr,pal:copy(src.pal),sprPal:copy(prev.sprPal),oam:[],chr:used,
      sprChr:Array.from({length:256},emptyTile),tileProps:zeros(256),sceneType:'static',scrollDir:'none',bgColor:src.pal[0][0],gravity:0,
      view:{x:0,y:0,w:256,h:240,followEnt:-1,hBorder:32,vBorder:24},entities:[],links:[],captureMeta:{workshopPage:{...proof,sourceArea,collision:'Destination World'}},
      raster:null,buildInclude:false,buildOrder:p.scenes.length,metatiles:meta,metaMap:map.slice()
    };
    p.scenes.push(copied);w.tilesetSceneId=id;w.map=map;
    return {project:p,tiles:unique,blocks:meta.length,receipt:proof,sourceArea};
  }
  return Object.freeze({sources,destinations,transfer});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WorkshopTransfer;



/* Eight-stage workshop extension. Uses the installed Build 5 project store,
   source decoders, World compiler and emulator. */
(() => {
  'use strict';
  const s=window.Forge.services,store=s.ProjectStore, T=WorkshopTransfer;
  const panel=document.createElement('details');
  panel.id='wsEightStage';
  const create=(tag,text,parent)=>{
    const element=document.createElement(tag);if(text)element.textContent=text;if(parent)parent.appendChild(element);return element;
  };
  const summary=create('summary','Eight-stage workshop · bring in a recovered page',panel);
  summary.style.cssText='cursor:pointer;font-weight:bold;padding:8px 0;color:var(--hi)';
  panel.style.cssText='border:1px solid var(--bdr);margin:10px 0;padding:6px 9px;font-size:10px;line-height:1.5';
  create('p','Add a source-linked background to one World. The collision and doors come from your campaign. The World compiler checks the proposed cartridge before applying the page.',panel);
  const guide=create('button','Open workshop guide',panel);guide.type='button';guide.id='wsOpenLesson';
  guide.addEventListener('click',()=>s.ProjectLessons.open({chapter:'cartridge-workshop'}));
  function field(label,tag){
    const row=create('label',label,panel);row.style.cssText='display:block;margin:8px 0';
    const input=create(tag,'',row);input.style.cssText='display:block;max-width:100%;width:100%;font:inherit;margin-top:3px';return input;
  }
  const file=field('1. Original NES ROM or saved donor project','input');file.type='file';file.accept='.nes,.json';
  const src=field('2. Recovered page','select'), dest=field('3. Destination World','select');
  const area=field('4. Source area','select');
  function option(el,value,label){const o=create('option',label,el);o.value=String(value);return o;}
  option(area,'full','Full page · 256 × 240 canvas');option(area,'detail','Center detail · 128 × 96 at its original position');area.value='full';
  const apply=create('button','Check & add page to World',panel);apply.type='button';
  const status=create('p','Open an authored World project, then choose one of the four supported donors.',panel);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const anchor=document.getElementById('wrPanel170');if(!anchor?.parentNode)return;anchor.parentNode.insertBefore(panel,anchor);
  let catalog=null,generation=0,working=false,choiceSignature='';
  const message=t=>{status.textContent=t;};
  function refresh(){
    const data={format:'NESForge',worldRuntime:S.worldRuntime,nativeGame:S.nativeGame,importedRom:S.importedRom,investigation:S.investigation,mapper:S.mapper,asmSource:S.asmSource,worlds:S.worlds,scenes:S.scenes};
    let worlds=[];try{worlds=T.destinations(data);}catch(_){}
    const signature=JSON.stringify(worlds);
    if(signature!==choiceSignature){
      const before=dest.value;dest.replaceChildren();for(const w of worlds)option(dest,w.id,w.name);
      dest.value=worlds.some(w=>w.id===before)?before:(worlds[0]?.id??'');choiceSignature=signature;
    }
    apply.disabled=working||!catalog?.pages.length||!worlds.length;file.disabled=working;src.disabled=working||!catalog?.pages.length;dest.disabled=working||!worlds.length;area.disabled=working;
  }
  function staticEntry(scene){return {format:'NESForge',scenes:[scene]};}
  async function readFile(input){
    if(!input||!Number.isSafeInteger(input.size)||input.size<1||input.size>64*1024*1024)throw Error('Choose a local .nes or Forge donor project up to 64 MiB.');
    if(/\.json$/i.test(input.name)){
      const p=JSON.parse(await input.text()), rows=T.sources(p);
      if(!rows.length)throw Error('No supported recovered page in this save. Open a courtyard or native page in Scene, then save the donor project again.');
      return {name:input.name,pages:rows.map(r=>({name:r.name,read:()=>staticEntry(p.scenes[r.index])})),initial:Math.max(0,rows.findIndex(r=>r.index===p.activeScene))};
    }
    const bytes=new Uint8Array(await input.arrayBuffer());
    const digest=NativeEngineFormat.sha256(bytes);
    const names={
      '55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8':'cv',
      '0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53':'cv',
      '26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519':'contra',
      '1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5':'megaman',
      '9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083':'tmnt'
    };
    const title=names[digest];if(!title)throw Error('This workshop accepts the two US Castlevania revisions and the verified US originals of Contra, Mega Man and TMNT. Open other ROMs in Forge’s normal intake for their extraction status.');
    if(title==='cv'){
      const source=CastlevaniaGraphics.open(bytes);
      return {name:input.name,pages:Array.from({length:source.pageCount},(_,index)=>{
        const record=source.page(index);
        return {name:record.label,read:()=>staticEntry({name:record.label,sceneType:'static',nt:record.nt,attr:record.attr,pal:record.pal,chr:decodeTiles(record.background),
          captureMeta:{castlevaniaGraphics:{sourceSha256:digest,kind:'cv-courtyard',index}}})};
      }),initial:0};
    }
    if(title==='tmnt'){
      const p=await s.NativeLayoutProject.create(bytes,input.name);
      return {name:input.name,pages:T.sources(p).map(r=>({name:r.name,read:()=>staticEntry(p.scenes[r.index])})),initial:0};
    }
    const p=await s.NativeResourceProject.create(bytes,input.name);
    const info=s.NativeResourceProject.validate(p), data=info.catalog;
    const available=data.resources.filter(r=>r.available);
    const pages=available.flatMap(resource=>
      Array.from({length:Math.ceil(resource.width/256)*Math.ceil(resource.height/240)},(_,page)=>({
        name:resource.label+' · page '+page,read:()=>{
          const addition=s.NativeResourceProject.addPage(p,resource.id,page);
          return staticEntry(addition.scenes[addition.activeScene]);
        }
      })));
    if(!pages.length)throw Error('No completed background pages for this source.');
    return {name:input.name,pages,initial:title==='contra'?Math.max(0,pages.findIndex(r=>r.name.startsWith('Level 2 · table slot 0 ·'))):0};
  }
  async function open(input){
    if(working)return false;
    const token=++generation;catalog=null;src.replaceChildren();refresh();message('Reading the donor locally…');
    try{
      const value=await readFile(input);if(token!==generation)return false;
      catalog=value;value.pages.forEach((row,i)=>option(src,i,row.name));src.value=String(value.initial);
      message(value.pages.length+' recovered background page(s). Choose the receiving World and check the page.');return true;
    }catch(error){if(token===generation)message(error.message||String(error));return false;}
    finally{if(token===generation)refresh();}
  }
  function add(){
    if(working || !catalog)return null;
    const selected=Number(src.value),wi=S.worlds.findIndex(w=>w.id===dest.value);
    if(!catalog.pages[selected]||wi<0){message('Choose a source page and a destination World.');return null;}
    working=true;refresh();
    try{
      const before=store.capture({includeEditorView:true}), id=before.worlds[wi]?.id;
      const transferred=T.transfer(catalog.pages[selected].read(),0,before,wi,area.value);
      const p=transferred.project;
      // Detached full compilation checks the live board budget and leaves the current project untouched on failure.
      const proof=s.RuntimeCompiler.compile(s.BuildGraph.planDetached(p));
      const prepared=store.prepareLoad(p);
      if(snapshot()===false)throw Error('Save a project checkpoint and try again.');
      store.commit(prepared,{intent:'workshop-import-page',sync:true});
      // Select the destination map without switching the active source-art Scene.
      // Build 5 also serializes the active Scene's mirrors into its ROM source record.
      const worlds=Forge161.worlds;
      worlds.state.selected=S.worlds.findIndex(w=>w.id===id);
      worlds.state.panX=worlds.state.panY=0;
      if(S.tab!=='world')switchTab('world');
      worlds.renderUI();render();notify('workshopPage');panel.open=true;
      message('Added '+catalog.pages[selected].name+' to '+p.worlds[wi].name+'. '+transferred.tiles+' page patterns. World build passed ('+proof.rom.length+' bytes). Save Project As, then Build & Run.');
      return {world:id,receipt:transferred.receipt,tiles:transferred.tiles,blocks:transferred.blocks,bytes:proof.rom.length};
    }catch(error){message('Page could not be added. '+(error.message||String(error)));return null;}
    finally{working=false;refresh();}
  }
  panel.addEventListener('toggle',refresh);dest.addEventListener('focus',refresh);apply.addEventListener('click',add);
  file.addEventListener('change',()=>{const choice=file.files?.[0];file.value='';if(choice)void open(choice);});
  const actions={openFile:open,addPage:add,refresh,choices:()=>({source:src,destination:dest,area,status})};
  s.EightStageWorkshop=Object.freeze(actions);refresh();
})();

