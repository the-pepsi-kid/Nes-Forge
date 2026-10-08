'use strict';
// Small original test inputs, independent of commercial ROMs and external data.
function tile(seed = 0) { return Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => seed ? (x + y * seed) % 4 : 0)); }
function scene(id = 'scene-a') {
  const chr = Array.from({length: 256}, (_, i) => tile(i < 4 ? i : 0));
  const nt = Array(960).fill(0); nt[0] = 1; nt[1] = 2; nt[32] = 3; nt[33] = 1;
  return {id, name: id, chr, sprChr: chr, nt, attr: Array(64).fill(0),
    pal: [[15, 1, 17, 33], [15, 6, 22, 38], [15, 9, 25, 41], [15, 12, 28, 44]],
    sprPal: [[15, 2, 18, 34], [15, 5, 21, 37], [15, 8, 24, 40], [15, 11, 27, 43]],
    oam: [{x: 24, y: 32, tile: 1, attr: 0x43, height: 8, active: true}],
    tileProps: Array(256).fill(0), entities: [], links: [], buildInclude: true, buildOrder: 0,
    metatiles: [{id: 7, name: 'Ground', category: 'terrain', tiles: [1, 2, 3, 1], pal: 0, collision: [1, 1, 2, 2], flags: 5}],
    metaMap: [7, ...Array(239).fill(-1)],
  };
}
function world(id, tilesetSceneId = 'scene-a') {
  return {id, name: id, tilesetSceneId, widthScreens: 1, heightScreens: 1, map: [7, ...Array(239).fill(-1)],
    rooms: [{id: id + '-room', name: 'Start room', x: 0, y: 0, w: 8, h: 7}],
    markers: [], cameraRegions: [{id: id + '-camera', name: 'Locked camera', x: 0, y: 0, w: 16, h: 15, mode: 'locked'}]};
}
function project() {
  const a = world('world-a'), b = world('world-b');
  a.markers = [{id: 'exit-a', name: 'Exit to B', kind: 'exit', x: 5, y: 6, targetWorldId: b.id, targetMarkerId: 'entrance-b'},
    {id: 'entrance-a', name: 'Entrance A', kind: 'entrance', x: 1, y: 2, targetWorldId: a.id, targetMarkerId: 'exit-a'}];
  b.markers = [{id: 'entrance-b', name: 'Entrance B', kind: 'entrance', x: 2, y: 3, targetWorldId: a.id, targetMarkerId: 'entrance-a'}];
  return {format: 'NESForge', version: 5, projectName: 'Regression fixture', scenes: [scene()], activeScene: 0,
    worlds: [a, b], packScenes: true, animations: [{name: 'Walk', frames: [{tileIdx: 1, duration: 8}, {tileIdx: 2, duration: 5}]}],
    instruments: [], metasprites: [], asmSource: '', tempo: 150, speed: 6, audRows: 64};
}
const customASM = `.org $C000
reset:
  sei
  cld
loop:
  jmp loop
.org $FFFA
  .word reset, reset, reset
`;
const collisionASM = customASM.replace('.org $FFFA', '.org $C200\n  .byte $AA\n.org $FFFA');
function composedProject() {
  const p = project(); p.version = 6;
  p.metasprites = [{id: 'hero', name: 'Hero standing', sceneId: 'scene-a', spriteMode: 16, originX: 4, originY: 16,
    pieces: [{id: 'head-body', tile: 1, tile2: 3, x: 0, y: 0, pal: 2, flipH: false, flipV: true, behind: true},
      {id: 'right', tile: 2, tile2: 1, x: 8, y: 0, pal: 3, flipH: true, flipV: false, behind: false}]}];
  p.animations = [{id: 'walk', name: 'Walk', state: 'walk', loop: true, flipOnReverse: false,
    frames: [{tileIdx: 1, duration: 8, metaspriteId: 'hero'}, {tileIdx: 2, duration: 5, sceneId: 'scene-a'}]}];
  return p;
}
module.exports = {tile, scene, world, project, composedProject, customASM, collisionASM};
