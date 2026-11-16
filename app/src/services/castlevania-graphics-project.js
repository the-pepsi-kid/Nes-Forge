/* Source previews and explicit editable copies in the existing Scene and CHR
 * editors. ProjectStore owns the copy, history and persistence. */
(() => {
  'use strict';
  const services=Forge.services, hex=n=>'$'+n.toString(16).toUpperCase().padStart(4,'0');
  let cached=null, sourceRef=null;
  function catalog(digest) {
    if(!S.importedRom || services.SourceContext.project()?.sha256!==digest)
      throw Error('Open the matching original Castlevania ROM.');
    if(sourceRef!==S.importedRom || cached?.sha256!==digest) {
      const current=CastlevaniaGraphics.open(Uint8Array.from(S.importedRom));
      if(current.sha256!==digest) throw Error('The attached original changed.');
      cached=current; sourceRef=S.importedRom;
    }
    return cached;
  }
  const sheetPalette=()=>Array.from({length:4},()=>[15,0,16,48]);
  function scene(action,table) {
    const model=catalog(action.sourceSha256), index=action.index;
    const marker={sourceSha256:model.sha256,kind:action.kind,index};
    let fields;
    if(action.kind==='cv-courtyard') {
      const p=model.page(index);
      fields={name:p.label,nt:p.nt,attr:p.attr,chr:decodeTiles(p.background),pal:p.pal};
    } else {
      const set=model.groups[index], view=model.patterns(index);
      if(![0,1].includes(table) || !view.written.subarray(table*4096,(table+1)*4096).some(Boolean))
        throw Error('Choose a pattern table written by this upload.');
      marker.table=table;
      fields={name:set.label+' · PPU '+hex(table*4096),chr:decodeTiles(view.data,table*4096),pal:sheetPalette(),
        nt:Array.from({length:960},(_,i)=>(i%32<16 && i<512)?(i>>5)*16+i%32:0)};
    }
    return makeScene({...fields,id:['re',marker.sourceSha256,marker.kind,index,marker.table??'page'].join('-'),
      sprChr:normalizeTiles(),tileProps:Array(256).fill(0),sceneType:'static',scrollDir:'none',gravity:0,
      buildInclude:false,captureMeta:{mode:'source-graphics-copy',castlevaniaGraphics:marker}});
  }
  function edit(action,table) {
    const sc=scene(action,table), store=services.ProjectStore;
    const existing=S.scenes.find(s=>s.id===sc.id);
    const expected=sc.captureMeta.castlevaniaGraphics;
    if(existing && Object.keys(expected).some(k=>existing.captureMeta?.castlevaniaGraphics?.[k]!==expected[k]))
      throw Error('This Scene ID belongs to a different resource.');
    if(!existing) {
      const p=store.capture();
      if(p.scenes.length>=64) throw Error('All 64 Scene slots are in use.');
      sc.buildOrder=p.scenes.length;
      p.scenes.push(sc);
      const prepared=store.prepareLoad(p);
      if(snapshot()===false) throw Error('Save your project before adding an editable copy.');
      store.commit(prepared,{sync:true,intent:'source-graphics-import'}); notify('sourceGraphicsImport');
    }
    services.SceneContext.selectScene(sc.id);
    if(action.kind==='cv-upload') setChrBank('bg');
    switchTab(action.kind==='cv-upload'?'chr':'scene');
  }
  function preview(action,host,canvas) {
    const model=catalog(action.sourceSha256);
    const add=(tag,message)=>{const n=document.createElement(tag);n.textContent=message;host.append(n);return n;};
    const save=(title,fn)=>{const b=add('button',title);b.type='button';b.className='frx-context-shortcut';b.onclick=fn;return b;};
    const prefix='Castlevania_'+model.sha256.slice(0,10)+'_';
    if(action.kind==='cv-courtyard') {
      const page=model.page(action.index), sc=scene(action);
      const c=canvas(256,240,'min(420px, 100%)'), ctx=c.getContext('2d'), img=ctx.createImageData(256,240);
      img.data.set(forgeCapture.scenePixels(sc,false).rgba);ctx.putImageData(img,0,0);
      c.setAttribute('aria-label',page.label+' original background');host.append(c);
      add('p','48 placements in bank 4 at '+hex(page.source.cpu)+'. '+page.blocks.length+' metatile IDs on this page. The playfield occupies tile rows 6–27. HUD and actors are separate.');
      save('Export page layout JSON',()=>{
        const {background,...record}=model.page(action.index);
        download(JSON.stringify({sourceSha256:model.sha256,graphicsUpload:3,...record},null,2),prefix+'courtyard_'+(page.index+1)+'.json','application/json');
      });
      return;
    }
    const set=model.groups[action.index], view=model.patterns(set.index);
    const choose=add('select','');choose.id='frx-upload-table';choose.setAttribute('aria-label','Pattern table');
    for(const table of [0,1]) {
      const count=view.written.subarray(table*4096,(table+1)*4096).reduce((a,b)=>a+b,0)/16;
      if(!count) continue;
      const opt=document.createElement('option');opt.value=String(table);
      opt.textContent='PPU '+hex(table*4096)+' · '+count+' of 256 tiles written';choose.append(opt);
    }
    const c=canvas(128,128,'min(256px, 100%)'),ctx=c.getContext('2d');
    c.setAttribute('aria-label','Original CHR upload, unwritten slots in blue');host.append(c);
    function draw() {
      const base=Number(choose.value)*4096,tiles=decodeTiles(view.data,base);
      const shades=['#151515','#656565','#adadad','#f6f6f6'];
      for(let t=0;t<256;t++) for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
        ctx.fillStyle=view.written[base+16*t]?shades[tiles[t][y][x]]:((x+y)&4?'#183348':'#27495d');
        ctx.fillRect((t%16)*8+x,(t>>4)*8+y,1,1);
      }
    }
    choose.onchange=draw;draw();
    add('p','Blue hatching marks slots this list leaves untouched. An editable copy uses blank tiles there. Grayscale is for inspecting the bitplanes.');
    for(const [i,r] of set.records.entries()) {
      save('Save .chr · bank '+r.source.bank+' '+hex(r.source.cpu)+' → PPU '+hex(r.ppu)+' · '+r.length+' bytes',()=>{
        download(catalog(action.sourceSha256).transfer(set.index,i),prefix+'upload_'+set.index+'_transfer_'+i+'.chr');
      });
    }
  }
  services.CastlevaniaGraphicsProject=Object.freeze({catalog,edit,preview});
})();
