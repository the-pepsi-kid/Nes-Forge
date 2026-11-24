#!/usr/bin/env node
'use strict';
// CAD-PORT-01 translator. Reads a local checkout of CadEditor (https://github.com/spiiin/CadEditor, MIT, Copyright (c)
// 2018 spiiin) and writes Forge-native recovery definitions: the offsets, counts, geometry, decoder families and
// constant palettes its NES configurations state. It copies no CadEditor code and reads none of the checkout's binary
// files (*.bin: CHR, palettes and RAM captured from emulators, which are cartridge-derived payloads).
//
//   node tools/cad-port/translate.cjs <cadeditor checkout> [--out app/src/re/cad-port-catalog.js] [--json out.json]
//
// The output is deterministic: the same checkout gives the same bytes.
const fs = require('node:fs'), path = require('node:path'), {execFileSync} = require('node:child_process');
const titles = require('./titles.cjs');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const CAD = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out' && args[args.indexOf(a) - 1] !== '--json');
if (!CAD) { console.error('usage: translate.cjs <cadeditor checkout> [--out file.js] [--json file.json]'); process.exit(2); }
const OUT = opt('--out') || path.join(__dirname, '../../app/src/re/cad-port-catalog.js'), JSON_OUT = opt('--json');
const NES = path.join(CAD, 'CadEditor/settings_nes');
const commit = (() => { try { return execFileSync('git', ['-C', CAD, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(); } catch (_) { return null; } })();

// ---- integer expressions as configs write them (hex, decimal, + - * / << >> parentheses) ----
function evalInt(expr) {
  const src = String(expr).replace(/\s+/g, '');
  if (!/^[0-9a-fA-FxX+\-*/()<>]+$/.test(src)) return null;
  const tokens = src.match(/0[xX][0-9a-fA-F]+|\d+|<<|>>|[+\-*/()]/g); if (!tokens || tokens.join('') !== src) return null;
  let i = 0;
  const prim = () => { const t = tokens[i++]; if (t === '(') { const v = shift(); if (tokens[i++] !== ')') throw 0; return v; } if (t === '-') return -prim(); if (/^0[xX]/.test(t)) return parseInt(t, 16); if (/^\d+$/.test(t)) return parseInt(t, 10); throw 0; };
  const prod = () => { let v = prim(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++], r = prim(); v = op === '*' ? v * r : Math.floor(v / r); } return v; };
  const sum = () => { let v = prod(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++], r = prod(); v = op === '+' ? v + r : v - r; } return v; };
  const shift = () => { let v = sum(); while (tokens[i] === '<<' || tokens[i] === '>>') { const op = tokens[i++], r = sum(); v = op === '<<' ? v << r : v >> r; } return v; };
  try { const v = shift(); return i === tokens.length && Number.isSafeInteger(v) ? v : null; } catch (_) { return null; }
}
function splitArgs(s) { const out = []; let depth = 0, cur = ''; for (const c of s) { if ('({['.includes(c)) depth++; if (')}]'.includes(c)) depth--; if (c === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur); return out.map(x => x.trim()); }
function offsetRec(expr) {
  const m = /^new\s+OffsetRec\s*\((.*)\)$/s.exec(String(expr).trim()); if (!m) return null;
  const a = splitArgs(m[1]).map(evalInt); if (a.length < 3 || a.slice(0, 3).some(v => v === null)) return null;
  return {begin: a[0], count: a[1], size: a[2], width: a[3] ?? 0, height: a[4] ?? 0};
}
function offsetRecs(expr) {
  const one = offsetRec(expr); if (one) return [one];
  const m = /^new\s*(?:OffsetRec)?\s*\[\s*\]\s*\{(.*)\}$/s.exec(String(expr).trim()); if (!m) return null;
  const list = splitArgs(m[1]).map(offsetRec); return list.length && list.every(Boolean) ? list : null;
}
// ---- members of a class: "return <expr>;" bodies, and whole method bodies by name ----
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/(?!css_include).*$/gm, '$1');
function returns(text) {
  const out = {}, re = /public\s+(?:static\s+|virtual\s+|override\s+)*([\w<>\[\],\s]+?)\s+(\w+)\s*\(\s*\)\s*\{\s*return\s+([\s\S]*?);\s*\}/g; let m;
  while ((m = re.exec(text))) out[m[2]] = m[3].trim();
  return out;
}
function bodies(text) { // name -> body of every method (balanced braces)
  const out = {}, re = /(?:public|private|protected|internal)?\s*(?:static\s+)?[\w<>\[\],]+\s+(\w+)\s*\(([^)]*)\)\s*\{/g; let m;
  while ((m = re.exec(text))) { let depth = 1, i = re.lastIndex; for (; i < text.length && depth; i++) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; } out[m[1]] = {params: m[2], body: text.slice(re.lastIndex, i - 1)}; }
  return out;
}
const squash = s => s.replace(/\s+/g, '');

// ---- shared block formats (CadEditor's library functions, by name) ----
const BLOCKS = {
  'Utils.getBlocksFromTiles16Pal1': {format: 'tiles16-attribute-byte'},
  'BlockUtils.getBlocksLinear2x2Masked': {format: 'linear-2x2-palette-array', mask: 3},
  'BlockUtils.getBlocksLinear2x2': {format: 'linear-2x2-palette-array', mask: 255},
  'BlockUtils.getBlocksLinear2x2MaskedTransposed': {format: 'linear-2x2-palette-array', mask: 3, transpose: true},
  'Utils.getBlocksLinear2x2withoutAttrib': {format: 'linear', width: 2, height: 2},
  'BlockUtils.getBlocksLinear2x2WithoutAttribs': {format: 'linear', width: 2, height: 2},
  'Utils.getBlocksLinear4x2withoutAttrib': {format: 'linear', width: 4, height: 2},
  'BlockUtils.getBlocksFromAlignedArrays': {format: 'aligned-arrays-2x2'},
};
const BIG = {'Utils.getBigBlocksCapcomDefault': {format: 'linear-2x2'}};
// ---- game-specific helpers that are parameterised uses of the shared formats (recognised by their whole body) ----
function helperBlocks(body, all) {
  const b = squash(body);
  let m = /^returnUtils\.readBlocksLinear\(Globals\.romdata,ConfigScript\.getTilesAddr\(\w+\),(\d+),(\d+),ConfigScript\.getBlocksCount\(\w+\),(true|false)(?:,(true|false))?\);$/.exec(b);
  if (m) return {format: 'linear', width: +m[1], height: +m[2], transpose: m[4] === 'true', ...(m[3] === 'true' ? {attributes: 'trailing'} : {})};
  // 17-byte records: one attribute byte, then 16 tiles (the configured address is that of the first tile)
  m = /^return(\w+)\(Globals\.romdata,ConfigScript\.getTilesAddr\(\w+\),ConfigScript\.getBlocksCount\(\w+\)\);$/.exec(b);
  if (m && all[m[1]]) { const h = squash(all[m[1]].body);
    if (/intBLOCK_W=4;intBLOCK_H=4;/.test(h) && /Utils\.readBlocksLinear\(romdata,addr,BLOCK_W,BLOCK_H,count,false,false,1\)/.test(h) && /intpalBytesAddr=addr-1\+i\*17;/.test(h) && /newint\[\]\{\(palByte>>0\)&3,\(palByte>>2\)&3,\(palByte>>4\)&3,\(palByte>>6\)&3\}/.test(h))
      return {format: 'tiles16-attribute-interleaved', offsetAdjust: -1}; }
  // blocks whose tiles are computed from the block number (no table in the cartridge)
  m = /^varobjects=newObjRec\[(?:ConfigScript\.)?getBlocksCount\(\w*\)\];for\(inti=0;i<objects\.Length;i\+\+\)\{varindexes=newint\[4\];varpalBytes=newint\[1\];intbi=(?:i\*(\d+)|\(i\/(\d+)\)\*(\d+)\+i%(\d+)\*(\d+));((?:indexes\[[0-3]\]=bi(?:\+\d+)?;){4})objects\[i\]=newObjRec\(2,2,0,indexes,palBytes\);\}returnobjects;$/.exec(b);
  if (m && (!m[2] || m[2] === m[4])) { const offsets = [null, null, null, null]; for (const x of m[6].matchAll(/indexes\[([0-3])\]=bi(?:\+(\d+))?;/g)) offsets[+x[1]] = +(x[2] || 0);
    if (offsets.every(v => v !== null)) return {format: 'computed-2x2', ...(m[1] ? {step: +m[1]} : {rowLength: +m[2], rowStride: +m[3], step: +m[5]}), offsets}; }
  return null;
}
function helperBig(body, all) {
  let b = squash(body);
  // the four 2-bit palettes of one colour byte per big block, read through a helper or directly
  const colour = name => { const h = all[name]; if (!h) return null; const x = squash(h.body); return /^returnGlobals\.romdata\[ConfigScript\.getPalBytesAddr\(0\)\+\w+\];$/.test(x) ? 'palette-byte' : null; };
  b = b.replace(/varb=bb\[i\];/, '').replace(/(^|[^A-Za-z0-9_])b\.(indexes|palBytes)/g, '$1bb[i].$2').replace(/refb\.indexes/g, 'refbb[i].indexes');
  const out = {format: 'linear-2x2'};
  const read = /^vardata=Utils\.readLinearBigBlockData\(0,\w+(?:,4)?\);varbb=Utils\.unlinearizeBigBlocks<BigBlockWithPal>\(data,2,2\);/;
  const capcom = /^returnUtils\.getBigBlocksCapcomDefault\(\w+\);$/;
  if (capcom.test(b)) return out;
  if (!read.test(b)) return null; b = b.replace(read, '');
  const mask = /for\(intii=0;ii<bb\[i\]\.indexes\.Length;ii\+\+\)\{bb\[i\]\.indexes\[ii\]=bb\[i\]\.indexes\[ii\]&0x([0-9A-Fa-f]+);\}/.exec(b); if (mask) { out.mask = parseInt(mask[1], 16); b = b.replace(mask[0], ''); }
  for (const sw of [/vari1=bb\[i\]\.indexes\[1\];vari2=bb\[i\]\.indexes\[2\];bb\[i\]\.indexes\[1\]=i2;bb\[i\]\.indexes\[2\]=i1;/, /Utils\.swap\(refbb\[i\]\.indexes\[1\],refbb\[i\]\.indexes\[2\]\);/]) if (sw.test(b)) { out.swapMiddle = true; b = b.replace(sw, ''); }
  const pal = /intpalByte=(?:(\w+)\(i\)|Globals\.romdata\[(?:ConfigScript\.)?getPalBytesAddr\(\w*\)\+i\]);bb\[i\]\.palBytes\[0\]=palByte>>0&0x3;bb\[i\]\.palBytes\[1\]=palByte>>2&0x3;bb\[i\]\.palBytes\[2\]=palByte>>4&0x3;bb\[i\]\.palBytes\[3\]=palByte>>6&0x3;/.exec(b);
  if (pal) { if (pal[1] && !colour(pal[1])) return null; out.palette = 'byte-per-big-block'; b = b.replace(pal[0], ''); }
  if (b !== 'for(inti=0;i<bb.Length;i++){}returnbb;' && b !== 'returnbb;') return null;
  if (!out.swapMiddle) out.swapMiddle = false;
  return out;
}
// a constant palette: getPalFunc returns a method whose body returns one literal byte array (16 or 32 entries)
function constantPalette(name, all) {
  const h = all[name]; if (!h) return null;
  const m = /^\s*var\s+\w+\s*=\s*new\s+byte\s*\[\s*\]\s*\{([^}]*)\}\s*;\s*return\s+\w+\s*;\s*$/s.exec(h.body) || /^\s*return\s+new\s+byte\s*\[\s*\]\s*\{([^}]*)\}\s*;\s*$/s.exec(h.body);
  if (!m) return null;
  const v = m[1].split(',').map(x => x.trim()).filter(Boolean).map(evalInt);
  return (v.length === 16 || v.length === 32) && v.every(x => x !== null && x >= 0 && x < 64) ? v : null;
}

const GAP = {dump: 'screens are read from a memory dump captured in an emulator, not from the cartridge', blocksExpr: 'the block table address or count is not a constant',
  blocksPal: 'the palette address of the blocks is not a constant', blocksCustom: 'the blocks are read by game-specific code that is not a parameterised shared format',
  bigExpr: 'the big-block table address is not a constant', bigCustom: 'the big blocks are read by game-specific code that is not a parameterised shared format',
  screensExpr: 'the screen addresses are not constants', screensCustom: 'the screens are read by a custom loader', objects: 'object lists are not translated yet (a later batch)',
  layout: 'level layouts are not translated yet (a later batch)', segaWords: 'two-byte (Sega-style) tile words are not an NES layout'};

function translateConfig(game, file, text, includeText) {
  const own = stripComments(text), inc = stripComments(includeText), r = {...returns(inc), ...returns(own)}, all = {...bodies(inc), ...bodies(own)};
  const d = {id: game + '/' + file.replace(/^Settings_|\.cs$/g, ''), config: file, gaps: []};
  const gap = (k, detail) => d.gaps.push(detail ? k + ':' + detail : k);
  if (/getDumpName|dumpName|Globals\.dumpdata|showDumpFileField\(\)\s*\{\s*return\s+true/.test(own + inc)) gap('dump');
  if (/true/.test(r.isUseSegaGraphics || '')) gap('segaWords');
  // blocks
  const bf = squash(r.getBlocksFunc || ''), bo = r.getBlocksOffset ? offsetRec(r.getBlocksOffset) : null, bc = r.getBlocksCount ? evalInt(r.getBlocksCount) : null, pa = r.getPalBytesAddr ? evalInt(r.getPalBytesAddr) : null;
  let fam = BLOCKS[bf] || null; const viaHelper = !fam && bf ? (() => { const name = bf.split('.').pop(); return all[name] ? helperBlocks(all[name].body, all) : null; })() : null;
  if (viaHelper) fam = {...viaHelper, helper: bf};
  if (fam) {
    const needsPal = ['tiles16-attribute-byte', 'linear-2x2-palette-array'].includes(fam.format), computed = fam.format === 'computed-2x2', {offsetAdjust = 0, ...f} = fam;
    if ((!bo && !computed) || bc === null || bc < 1 || bc > 4096) gap('blocksExpr', bf);
    else if (needsPal && pa === null) gap('blocksPal', bf);
    else d.blocks = {...f, ...(computed ? {} : {offset: bo.begin + offsetAdjust}), count: bc, ...(needsPal ? {paletteOffset: pa} : {})};
  } else if (bf) gap('blocksCustom', bf);
  // big blocks
  const gf = squash(r.getBigBlocksFunc || ''), go = r.getBigBlocksOffset ? offsetRec(r.getBigBlocksOffset) : null, gc = r.getBigBlocksCount ? evalInt(r.getBigBlocksCount) : null;
  const bigOn = !/false/.test(r.isBigBlockEditorEnabled || 'true');
  let big = BIG[gf] || null; if (!big && gf) { const name = gf.split('.').pop(); if (all[name]) { const h = helperBig(all[name].body, all); if (h) big = {...h, helper: gf}; } }
  if (big && bigOn) {
    if (!go) gap('bigExpr', gf);
    else { const count = gc ?? go.count; if (big.palette && pa === null) gap('blocksPal', gf); else d.bigBlocks = {...big, offset: go.begin, count, ...(big.palette ? {paletteOffset: pa} : {})}; }
  } else if (gf && bigOn) gap('bigCustom', gf);
  // screens
  const sr = r.getScreensOffset ? offsetRecs(r.getScreensOffset) : null;
  if (sr) d.screens = {records: sr.map(s => [s.begin, s.count, s.size, s.width, s.height]), word: r.getWordLen ? evalInt(r.getWordLen) ?? 1 : 1,
    vertical: /true/.test(r.getScreenVertical || 'false'), cells: /true/.test(r.isBuildScreenFromSmallBlocks || 'false') ? 'blocks' : 'big-blocks',
    ...(r.getScreenDataStride && evalInt(r.getScreenDataStride) > 1 ? {stride: evalInt(r.getScreenDataStride)} : {})};
  else if (r.getScreensOffset) gap('screensExpr');
  if (r.loadScreensFunc) gap('screensCustom', squash(r.loadScreensFunc));
  // graphics: a 4 KiB pattern table at a cartridge offset, read by the plain chunk reader
  const vo = r.getVideoOffset ? offsetRec(r.getVideoOffset) : null, vf = squash(r.getVideoChunkFunc || '');
  if (vo && vf === 'Utils.getVideoChunk' && vo.size === 0x1000) d.graphics = {source: 'cartridge', offset: vo.begin, count: vo.count};
  // palettes: a constant 16/32-entry palette, or a linear palette table in the cartridge
  const pf = squash(r.getPalFunc || ''), po = r.getPalOffset ? offsetRec(r.getPalOffset) : null;
  const constant = /^\w+$/.test(pf) ? constantPalette(pf, all) : null;
  if (constant) d.palette = {source: 'constant', values: constant};
  else if (po && pf === 'Utils.getPalleteLinear') d.palette = {source: 'cartridge', offset: po.begin, count: po.count, size: po.size};
  if (r.getObjectsFunc || /isEnemyEditorEnabled\(\)\s*\{\s*return\s+true/.test(own + inc)) gap('objects');
  if (r.getLayoutFunc || r.getLevelRecsFunc) gap('layout');
  d.status = !d.blocks && !d.screens ? 'untranslated' : d.screens && (d.screens.cells === 'blocks' ? d.blocks : d.bigBlocks && d.blocks) && !d.gaps.some(g => /^(dump|segaWords|screensCustom)/.test(g)) ? 'decodable' : 'partial';
  return d;
}

const list = titles.parseList(path.join(CAD, 'CadEditor/cad_editor_supported_games.txt'));
const games = fs.readdirSync(NES).filter(g => fs.statSync(path.join(NES, g)).isDirectory()).sort();
const out = {format: 'NESForgeCadPortCatalog', version: 1,
  upstream: {project: 'CadEditor', repository: 'https://github.com/spiiin/CadEditor', commit, license: 'MIT', copyright: 'Copyright (c) 2018 spiiin', scope: 'CadEditor/settings_nes (NES configurations); no code and no binary dumps copied',
    // the MIT permission notice travels with the derived data (also in the standalone HTML)
    licenseText: fs.readFileSync(path.join(CAD, 'LICENSE'), 'utf8').replace(/\r/g, '').trim()},
  gapText: GAP, games: []};
for (const g of games) {
  const dir = path.join(NES, g), files = fs.readdirSync(dir).sort(), cfgs = files.filter(f => /^Settings_.*\.cs$/.test(f));
  const definitions = [];
  for (const f of cfgs) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const incs = [...text.matchAll(/\/\/css_include\s+([^;\n]+);/g)].map(x => x[1].trim());
    const includeText = incs.map(p => { for (const base of [NES, path.join(CAD, 'CadEditor')]) { const q = path.join(base, p); if (/\.cs$/i.test(q) && fs.existsSync(q)) return fs.readFileSync(q, 'utf8'); } return ''; }).join('\n');
    definitions.push(translateConfig(g, f, text, includeText));
  }
  const t = titles.match(g, list);
  out.games.push({folder: g, title: t ? t.title : null, listed: t ? t.note || 'listed' : null, dumps: files.filter(f => /\.bin$/i.test(f)).length, definitions});
}
const all = out.games.flatMap(g => g.definitions), count = f => all.filter(f).length;
out.summary = {titlesListed: list.length, folders: out.games.length, foldersMatchedToTitles: out.games.filter(g => g.title).length, configs: all.length,
  decodable: count(d => d.status === 'decodable'), partial: count(d => d.status === 'partial'), untranslated: count(d => d.status === 'untranslated'),
  gamesWithDecodable: out.games.filter(g => g.definitions.some(d => d.status === 'decodable')).length,
  blockFormats: all.reduce((m, d) => { if (d.blocks) { const k = d.blocks.format + (d.blocks.helper && !BLOCKS[d.blocks.helper] ? ' (helper)' : ''); m[k] = (m[k] || 0) + 1; } return m; }, {}),
  bigBlockFormats: all.reduce((m, d) => { if (d.bigBlocks) { const k = d.bigBlocks.format + (d.bigBlocks.palette ? '+palette' : ''); m[k] = (m[k] || 0) + 1; } return m; }, {}),
  graphicsFromCartridge: count(d => d.graphics), constantPalettes: count(d => d.palette?.source === 'constant'), cartridgePalettes: count(d => d.palette?.source === 'cartridge'),
  gaps: all.flatMap(d => d.gaps.map(x => x.split(':')[0])).reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {})};
const sorted = v => Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
const body = JSON.stringify(sorted(out));
fs.writeFileSync(OUT, '/* GENERATED by tools/cad-port/translate.cjs from CadEditor ' + (commit || '(unknown commit)') + ' (MIT, Copyright (c) 2018 spiiin).\n' +
  ' * Knowledge only: offsets, counts, geometry, decoder families and constant palettes stated by its NES configurations.\n' +
  ' * No CadEditor code and no binary dump is included. Do not edit by hand: re-run the translator. UMD, data only. */\n' +
  '(function(root,data){if(typeof module!==\'undefined\'&&module.exports)module.exports=data;else root.CadPortCatalog=data;})(typeof globalThis!==\'undefined\'?globalThis:this,Object.freeze(' + body + '));\n');
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(sorted(out), null, 1) + '\n');
console.log(JSON.stringify(out.summary, null, 1));
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
