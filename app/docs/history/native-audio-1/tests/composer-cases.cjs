'use strict';
const {schemaFor,migratedFrames} = require('./version-expectations.cjs');
module.exports = function register({test, fresh, fixtures, assert, build}) {
  const freshComposed = () => fresh(fixtures.composedProject());
  function pixels(h, frameExpr, options = '{}') {
    h.run('window.testPixels={}; window.testCtx={fillStyle:"", fillRect(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)testPixels[xx+","+yy]=this.fillStyle;}}; Forge163.metasprites.draw(testCtx,'+frameExpr+',0,0,1,'+options+')');
    return h.json('testPixels');
  }
  test('Composer APIs and schema v6 initialize in the complete release', () => {
    const h=freshComposed();assert.ok(h.context.Forge163.metasprites);assert.ok(h.context.Forge163.animations);assert.equal(h.run('projectData().version'),schemaFor(h));
  });
  test('Composed project JSON preserves frame identities, pieces, origins, and animation bindings', () => {
    const h=freshComposed(),before=h.json('[S.metasprites,S.animations]');h.run('db_deserializeState(db_serializeState())');assert.deepEqual(h.json('[S.metasprites,S.animations]'),before);
  });
  test('Composed OAM conversion uses origin, palette, both flips, priority, and explicit lower tile', () => {
    const h=freshComposed();const oam=h.json('Forge163.metasprites.toOAM(S.metasprites[0],100,80)');
    assert.deepEqual(oam[0],{x:96,y:64,tile:1,tile2:3,attr:162,height:16,active:true});
    assert.equal(oam[1].attr,67);assert.equal(oam[1].x,104);
  });
  test('Metasprite pixels continue using their source scene after active scene changes', () => {
    const p=fixtures.composedProject(),other=fixtures.scene('other');other.sprPal=p.scenes[0].sprPal.map(row=>row.map(()=>48));p.scenes.push(other);p.activeScene=1;
    const h=fresh(p);const actual=pixels(h,'S.metasprites[0]');
    assert.equal(h.run('Forge163.metasprites.source(S.metasprites[0]).id'),'scene-a');
    h.run('S.sprPal=S.sprPal.map(row=>row.map(()=>1))');assert.deepEqual(pixels(h,'S.metasprites[0]'),actual);
  });
  test('8x16 vertical flip swaps source tiles and reverses pixels around the authored anchor', () => {
    const h=freshComposed();h.run('S.sprChr[1]=Array.from({length:8},()=>Array(8).fill(1));S.sprChr[3]=Array.from({length:8},()=>Array(8).fill(2));S.metasprites[0].pieces=S.metasprites[0].pieces.slice(0,1)');
    const p=pixels(h,'S.metasprites[0]');
    const colors=h.json('S.sprPal[2].map(c=>"rgb("+NP[c].join(",")+")")');
    assert.equal(p['-4,-16'],colors[2]);assert.equal(p['-4,-1'],colors[1]);assert.equal(Object.keys(p).length,128);
  });
  test('OAM order wins opaque overlaps and transparent pixels leave later sprites visible', () => {
    const h=freshComposed();h.run('S.sprChr[1]=Array.from({length:8},()=>Array(8).fill(1)); S.sprChr[2]=Array.from({length:8},()=>Array(8).fill(2)); S.sprChr[1][0][0]=0; Object.assign(S.metasprites[0],{spriteMode:8,originX:0,originY:0});S.metasprites[0].pieces.forEach((p,i)=>Object.assign(p,{x:0,y:0,tile:i+1,pal:0,flipH:false,flipV:false}));');
    const p=pixels(h,'S.metasprites[0]'),c=h.json('S.sprPal[0].map(v=>"rgb("+NP[v].join(",")+")")');assert.equal(p['1,0'],c[1]);assert.equal(p['0,0'],c[2]);
  });
  test('Hardware preview counts transparent OAM pieces toward eight sprites per scanline', () => {
    const h=freshComposed();h.run('S.sprChr[0]=Array.from({length:8},()=>Array(8).fill(0));S.sprChr[1]=Array.from({length:8},()=>Array(8).fill(1));Object.assign(S.metasprites[0],{spriteMode:8,originX:0,originY:0});S.metasprites[0].pieces=Array.from({length:9},(_,i)=>({id:"p"+i,tile:i===8?1:0,tile2:0,x:i*8,y:0,pal:0,flipH:false,flipV:false,behind:false}))');
    assert.equal(Object.keys(pixels(h,'S.metasprites[0]','{hardware:true}')).length,0);
    assert.equal(Object.keys(pixels(h,'S.metasprites[0]')).length,64);
    assert.equal(h.run('Forge163.metasprites.warnings(S.metasprites[0]).overflowLines.length'),8);
  });
  test('Metasprite duplication and mirroring create new identities and reflect around the origin', () => {
    const h=freshComposed();h.run('Forge163.metasprites.select("hero");Forge163.metasprites.duplicate(true)');
    const [a,b]=h.json('S.metasprites');assert.notEqual(a.id,b.id);assert.notEqual(a.pieces[0].id,b.pieces[0].id);
    assert.equal(b.pieces[1].x,2*a.originX-a.pieces[1].x-8);assert.equal(b.pieces[1].flipH,!a.pieces[1].flipH);
    h.run('undo()');assert.equal(h.run('S.metasprites.length'),1);h.run('redo()');assert.equal(h.run('S.metasprites.length'),2);
  });
  test('Mixed-size scene OAM capture expands 8x16 pairs without losing their vertical flip', () => {
    const h=freshComposed();h.run('S.oam=[{x:10,y:20,tile:1,tile2:3,height:16,attr:128,active:true},{x:30,y:20,tile:2,height:8,attr:0,active:true}];Forge163.metasprites.capture()');
    const f=h.json('S.metasprites[1]');assert.equal(f.spriteMode,8);assert.equal(f.pieces.length,3);
    assert.deepEqual(f.pieces.map(p=>[p.tile,p.y,p.flipV]),[[3,0,true],[1,8,true],[2,0,false]]);
  });
  test('Animation sources switch through the actual commands and preserve legacy tile/duration', () => {
    const h=freshComposed();h.run('S._selAnim=0;S._animFrame=0;Forge163.animations.setFrameSource("tile")');
    assert.deepEqual(h.json('S.animations[0].frames[0]'),migratedFrames(h,[{tileIdx:1,duration:8}])[0]);
    h.run('Forge163.animations.setFrameSource("metasprite","hero")');assert.equal(h.run('S.animations[0].frames[0].metaspriteId'),'hero');
    assert.equal(h.run('S.animations[0].frames[0].duration'),8);h.run('undo()');assert.equal(h.run('S.animations[0].frames[0].metaspriteId'),undefined);
  });
  test('Animation frame bounds use the explicit origin and fixed union across composed and tile frames', () => {
    const h=freshComposed();assert.deepEqual(h.json('Forge163.animations.frameBounds(S.animations[0].frames[0])'),{x:-4,y:-16,w:16,h:16});
    assert.deepEqual(h.json('Forge163.animations.animationBounds(S.animations[0])'),{x:-4,y:-16,w:16,h:20});
  });
  test('Missing animation references survive editing with a visible missing-source result and block build', () => {
    const h=freshComposed();h.run('S.metasprites=[];db_deserializeState(db_serializeState())');
    assert.equal(h.run('Forge163.animations.resolve(S.animations[0].frames[0]).kind'),'missing');assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1)||'',/missing metasprite/i);
  });
  test('MS16 checksum and declared payload length reject corrupted bytes', () => {
    const h=freshComposed();h.run('window.assetBytes=Forge163.build.encodeAssets(Forge16.build.plan())');assert.ok(h.run('assetBytes.length')>13);
    h.run('window.badAssets=new Uint8Array(assetBytes);badAssets[badAssets.length-1]^=1');assert.throws(()=>h.run('Forge163.build.decodeAssets(badAssets)'),/checksum/i);
    assert.throws(()=>h.run('Forge163.build.decodeAssets(assetBytes.slice(0,-1))'),/length/i);
  });
  test('MS16 links source tiles without mutating authoring IDs or unrelated sprite CHR', () => {
    const h=freshComposed(),before=h.json('[S.metasprites,S.animations,S.sprChr]');h.context.rom=build(h);
    assert.deepEqual(h.json('[S.metasprites,S.animations,S.sprChr]'),before);
    const parsed=h.run('Forge163.build.readRomAssets(rom)');assert.equal(parsed.frames.length,1);assert.equal(parsed.animations[0].frames[0].metaspriteId,'hero');
    const tile=h.json('decodeTiles(rom,16+16384+4096)['+parsed.frames[0].pieces[0].tile+']');assert.deepEqual(tile,before[2][1]);
  });
  test('ROM import restores composed frames with new unique IDs and remapped animation references', () => {
    const h=freshComposed();h.context.rom=build(h);assert.equal(h.run('importRom(rom,"Composed.nes")',15000),true,h.errors.join('; '));
    const ms=h.json('S.metasprites'),an=h.json('S.animations');assert.equal(ms.length,2);assert.equal(an.length,2);assert.notEqual(ms[1].id,ms[0].id);
    assert.equal(an[1].frames[0].metaspriteId,ms[1].id);assert.equal(h.run('S.scenes.some(s=>s.id===S.metasprites[1].sceneId)'),true);
    assert.notEqual(ms[1].sceneId,ms[0].sceneId);assert.equal(ms[1].pieces[0].flipV,true);assert.equal(ms[1].originY,16);
  });
  test('Portable asset export contains complete frames and their sprite sources', () => {
    const h=freshComposed();const out=h.json('Forge163.persistence.exportPayload()');assert.equal(out.metasprites[0].id,'hero');assert.equal(out.sources[0].id,'scene-a');assert.equal(out.sources[0].sprChr.length,256);
  });
  test('Out-of-range authored coordinates and duplicate frame identities reject schema v6 load', () => {
    const h=freshComposed();const p=fixtures.composedProject();p.metasprites[0].pieces[0].x=2048;h.context.bad=p;assert.throws(()=>h.run('db_deserializeState(bad)'),/Piece X/i);
    p.metasprites[0].pieces[0].x=0;p.metasprites.push({...p.metasprites[0]});h.context.bad=p;assert.throws(()=>h.run('db_deserializeState(bad)'),/duplicate/i);
  });
};
