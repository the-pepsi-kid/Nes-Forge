#!/usr/bin/env node
'use strict';
/*
 Evidence audit: does every ROM location an investigation catalog claims hold what the catalog says it holds?

   node tools/audit/evidence_audit.cjs --rom <game.nes> --out <folder> [--forge NES_Forge.html]

 The ROM is imported with InvestigationProject.create (the same path as "Prepare investigated game"). Then, in Node,
 every location record {bank16KiB, cpu, fileOffset, length} in the native and spatial catalogs and every audio
 table/header/stream address is checked:
   bounds        the bytes lie inside the file's PRG area
   mapping       file offset, bank and CPU address agree for 16 KiB PRG banking (the last bank fixed at $C000)
   value         where the decoded value sits next to its location, the bytes at that location equal it:
                 pose pieces (tile, x, y) and attributes, pose and script pointers, animation frames (duration, pose),
                 enemy spawns (column, position, type), lanterns (column, code), entrances (x, y), stage bytes
                 (act/stage BCD), area-start cues, pose extents, script slots, audio cue table pointers
 Writes <out>/evidence.json and <out>/EVIDENCE.md: counts and mismatch locations only, no ROM bytes or game data.
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const forge = path.resolve(opt('forge', path.join(repo, 'NES_Forge.html'))), romPath = path.resolve(opt('rom')), outDir = path.resolve(opt('out'));
const rom = fs.readFileSync(romPath), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const prgBanks = rom[4], prgEnd = 16 + prgBanks * 16384, lastBank = prgBanks - 1, chrEnd = prgEnd + rom[5] * 8192;
const u8 = o => rom[o], word = o => rom[o] | (rom[o + 1] << 8);

(async () => {
  const {loadForge} = require(path.join(repo, 'QA/t/u/harness.cjs'));
  const h = loadForge(forge);
  for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
  if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
  h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
  h.context.__b = new Uint8Array(rom);
  const catalogs = JSON.parse(await h.run(`(async()=>{const p=await Forge.services.InvestigationProject.create(__b,${JSON.stringify(path.basename(romPath))});return JSON.stringify(p.investigation.catalogs);})()`, 1800000));

  const rows = new Map(), mismatches = [];
  const row = p => { if (!rows.has(p)) rows.set(p, {path: p, locations: 0, outOfBounds: 0, mappingDisagrees: 0, valueChecked: 0, valueMatches: 0, valueMismatches: 0}); return rows.get(p); };
  const mapped = (bank, cpu) => 16 + bank * 16384 + (cpu & 0x3FFF);
  const windowOk = (bank, cpu) => bank === lastBank ? cpu >= 0xC000 : (cpu >= 0x8000 && cpu < 0xC000) || (bank !== lastBank && cpu >= 0xC000 && false);
  function location(p, loc) {
    const r = row(p); r.locations++;
    const end = loc.fileOffset + Math.max(1, loc.length || 1);
    // CHR banks (bank4KiB) live after the PRG area
    if (Number.isInteger(loc.bank4KiB)) { if (!(loc.fileOffset >= prgEnd && end <= chrEnd)) r.outOfBounds++; else if (loc.fileOffset !== prgEnd + loc.bank4KiB * 4096) r.mappingDisagrees++; return true; }
    if (!(loc.fileOffset >= 16 && end <= prgEnd)) { r.outOfBounds++; return false; }
    if (Number.isInteger(loc.bank16KiB) && Number.isInteger(loc.cpu) && (mapped(loc.bank16KiB, loc.cpu) !== loc.fileOffset || !windowOk(loc.bank16KiB, loc.cpu))) { r.mappingDisagrees++; }
    return true;
  }
  function value(p, loc, expected, actual, where) {
    const r = row(p); r.valueChecked++;
    if (JSON.stringify(expected) === JSON.stringify(actual)) r.valueMatches++; else { r.valueMismatches++; if (mismatches.length < 200) mismatches.push({path: p, where, fileOffset: loc.fileOffset, expected, actual}); }
  }
  const isLoc = v => v && typeof v === 'object' && Number.isInteger(v.fileOffset) && 'length' in v;
  // every location record, by path
  (function walk(v, p) {
    if (Array.isArray(v)) { for (const x of v) walk(x, p + '[]'); return; }
    if (!v || typeof v !== 'object') return;
    if (isLoc(v)) { location(p, v); return; }
    for (const [k, x] of Object.entries(v)) walk(x, p ? p + '.' + k : k);
  })({native: catalogs.native, spatial: catalogs.spatial}, '');

  // Value rules depend on each game's encoding (what a location points at: a data table, a code site, a run list).
  // They are written per verified profile; other profiles get location checks only.
  const n = catalogs.native, s8 = v => v & 255, profileId = n?.profile?.id || null;
  const VALUE_RULES = ['ninja-gaiden-us'], rulesApply = VALUE_RULES.includes(profileId);
  if (rulesApply) {
    for (const pose of n.poses || []) {
      for (const [i, piece] of (pose.pieces || []).entries()) {
        if (isLoc(piece.source)) value('native.poses[].pieces[].source', piece.source, [piece.tile, s8(piece.x), s8(piece.y)], [u8(piece.source.fileOffset), u8(piece.source.fileOffset + 1), u8(piece.source.fileOffset + 2)], pose.id + ' piece ' + i);
        if (isLoc(piece.attributeSource)) value('native.poses[].pieces[].attributeSource', piece.attributeSource, piece.attributes, u8(piece.attributeSource.fileOffset), pose.id + ' piece ' + i);
      }
      if (isLoc(pose.pointerSource) && isLoc(pose.source)) value('native.poses[].pointerSource', pose.pointerSource, pose.source.cpu, word(pose.pointerSource.fileOffset), pose.id);
      if (isLoc(pose.source)) value('native.poses[].source', pose.source, (pose.pieces || []).length, u8(pose.source.fileOffset), pose.id + ' piece count');
      if (pose.extent) {
        if (isLoc(pose.extent.source)) value('native.poses[].extent.source', pose.extent.source, pose.extent.horizontalCode, u8(pose.extent.source.fileOffset), pose.id);
        if (isLoc(pose.extent.verticalSource)) value('native.poses[].extent.verticalSource', pose.extent.verticalSource, pose.extent.verticalCode, u8(pose.extent.verticalSource.fileOffset), pose.id);
      }
    }
    for (const a of n.animations || []) {
      for (const [i, f] of (a.frames || []).entries()) if (isLoc(f.source)) value('native.animations[].frames[].source', f.source, [f.duration, f.pose], [u8(f.source.fileOffset), u8(f.source.fileOffset + 1)], a.id + ' frame ' + i);
      if (isLoc(a.pointerSource) && isLoc(a.source)) value('native.animations[].pointerSource', a.pointerSource, a.source.cpu, word(a.pointerSource.fileOffset), a.id);
    }
    for (const slot of n.scriptSlots || []) if (isLoc(slot.pointerSource)) value('native.scriptSlots[].pointerSource', slot.pointerSource, slot.pointer, word(slot.pointerSource.fileOffset), 'slot ' + slot.selector);
    for (const sc of n.scenes || []) {
      for (const e of sc.enemies || []) if (Array.isArray(e.sources) && e.sources.length === 3)
        value('native.scenes[].enemies[].sources[]', e.sources[0], [e.spawnColumn, (e.y & 240) | (e.entryXNibble & 15), e.type], e.sources.map(l => u8(l.fileOffset)), sc.id + ' enemy ' + e.id);
      for (const l of sc.lanterns || []) if (Array.isArray(l.sources) && l.sources.length === 2)
        value('native.scenes[].lanterns[].sources[]', l.sources[0], [l.spawnColumn, l.raw], l.sources.map(x => u8(x.fileOffset)), sc.id + ' lantern ' + l.id);
      for (const dir of ['forward', 'backward']) { const en = sc.entrance?.[dir]; if (!en) continue;
        if (isLoc(en.source)) value('native.scenes[].entrance.' + dir + '.source', en.source, en.x, u8(en.source.fileOffset), sc.id);
        if (isLoc(en.ySource)) value('native.scenes[].entrance.' + dir + '.ySource', en.ySource, en.y, u8(en.ySource.fileOffset), sc.id); }
      // initial palettes: background sets 1-3, sprite sets 2-3 and the backdrop come from these six bytes; each palette
      // row is the backdrop plus three colours from the set table ($B000 background, $B100 sprites, bank 0)
      const pal = sc.palettes;
      if (pal && Array.isArray(pal.sources) && pal.sources.length === 6 && pal.sources.every(isLoc)) {
        value('native.scenes[].palettes.sources[]', pal.sources[0], [...pal.backgroundSets.slice(1), ...pal.spriteSets.slice(2), pal.backdrop], pal.sources.map(l => u8(l.fileOffset)), sc.id);
        const bank0 = cpu => 16 + (cpu & 0x3FFF), rows = [...pal.background.map((c, i) => [c, 0xB000 + pal.backgroundSets[i] * 3]), ...pal.sprites.map((c, i) => [c, 0xB100 + pal.spriteSets[i] * 3])];
        value('native.scenes[].palettes (colours from set tables)', {fileOffset: bank0(0xB000)}, rows.map(([c]) => c), rows.map(([, cpu]) => [pal.backdrop, ...rom.subarray(bank0(cpu), bank0(cpu) + 3)]), sc.id);
      }
      if (sc.stage && isLoc(sc.stage.source)) value('native.scenes[].stage.source', sc.stage.source, (sc.stage.act << 4) | sc.stage.number, u8(sc.stage.source.fileOffset), sc.id);
      if (sc.audioEvent && isLoc(sc.audioEvent.source)) value('native.scenes[].audioEvent.source', sc.audioEvent.source, Number(sc.audioEvent.cueId), u8(sc.audioEvent.source.fileOffset), sc.id);
    }
    // actors: parameter codes, the dispatch pointer and every state entry pointer
    for (const a of n.actors || []) {
      if (Array.isArray(a.parameterSources) && a.parameterSources.length === 3) value('native.actors[].parameterSources[]', a.parameterSources[0], [a.healthCode, a.damageCode, a.scoreCode], a.parameterSources.map(l => u8(l.fileOffset)), a.id);
      if (isLoc(a.pointerSource) && isLoc(a.dispatch)) value('native.actors[].pointerSource', a.pointerSource, a.dispatch.cpu, word(a.pointerSource.fileOffset), a.id);
      for (const st of a.states || []) if (isLoc(st.pointerSource)) value('native.actors[].states[].pointerSource', st.pointerSource, st.entry, word(st.pointerSource.fileOffset), a.id + ' state ' + st.state);
    }
    // code references: the HUD stage reader is LDA table,X and the area-start writer is STA request
    for (const sc of n.scenes || []) {
      if (sc.stage && isLoc(sc.stage.reader)) value('native.scenes[].stage.reader', sc.stage.reader, [0xBD, sc.stage.source.cpu - sc.area & 255, (sc.stage.source.cpu - sc.area) >> 8], [0, 1, 2].map(i => u8(sc.stage.reader.fileOffset + i)), sc.id);
      if (sc.audioEvent && isLoc(sc.audioEvent.writer)) value('native.scenes[].audioEvent.writer', sc.audioEvent.writer, [0x8D, sc.audioEvent.requestAddress & 255, sc.audioEvent.requestAddress >> 8], [0, 1, 2].map(i => u8(sc.audioEvent.writer.fileOffset + i)), sc.id);
    }
    for (const st of n.stages || []) if (isLoc(st.source)) value('native.stages[].source', st.source, (n.scenes || []).filter(sc => st.areas.includes(sc.area)).map(sc => (st.act << 4) | st.number),
      (n.scenes || []).filter(sc => st.areas.includes(sc.area)).map(sc => u8(st.source.fileOffset + sc.area)), st.id);
    for (const st of n.stages || []) if (isLoc(st.reader) && isLoc(st.source)) value('native.stages[].reader', st.reader, [0xBD, st.source.cpu & 255, st.source.cpu >> 8], [0, 1, 2].map(i => u8(st.reader.fileOffset + i)), st.id);
    // spatial animations: frames and pieces, like native poses
    const sp = catalogs.spatial || {};
    for (const a of sp.animations || []) for (const [fi, f] of (a.frames || []).entries()) {
      if (isLoc(f.source)) value('spatial.animations[].frames[].source', f.source, [f.duration, f.pose], [u8(f.source.fileOffset), u8(f.source.fileOffset + 1)], (a.id || a.label) + ' frame ' + fi);
      for (const [i, piece] of (f.pieces || []).entries()) {
        if (isLoc(piece.source)) value('spatial.animations[].frames[].pieces[].source', piece.source, [piece.tile, s8(piece.x), s8(piece.y)], [0, 1, 2].map(k => u8(piece.source.fileOffset + k)), (a.id || a.label) + ' frame ' + fi + ' piece ' + i);
        if (isLoc(piece.attributeSource)) value('spatial.animations[].frames[].pieces[].attributeSource', piece.attributeSource, piece.attributes, u8(piece.attributeSource.fileOffset), (a.id || a.label) + ' frame ' + fi + ' piece ' + i);
      }
    }
    // spatial maps: the ROM stores each room's blocks column-major (6 per column); the catalog lists them row-major.
    // Each cell's class is one nibble of its source byte: the high nibble for the upper 16-pixel row of a block, the low
    // nibble for the lower one.
    for (const m of sp.maps || []) {
      const b = m.blocks;
      if (b && isLoc(b.source) && Array.isArray(b.values) && b.storage === 'column-major') {
        const W = b.width, H = b.height, raw = rom.subarray(b.source.fileOffset, b.source.fileOffset + W * H);
        value('spatial.maps[].blocks.source', b.source, b.values, b.values.map((_, i) => raw[(i % W) * H + Math.floor(i / W)]), m.id);
      }
      if (Array.isArray(m.cellSources) && Array.isArray(m.cells)) m.cellSources.forEach((l, i) => { if (!isLoc(l)) return;
        const row = Math.floor(i / m.width), byte = u8(l.fileOffset);
        value('spatial.maps[].cellSources[]', l, m.cells[i], row % 2 ? byte & 15 : byte >> 4, m.id + ' cell ' + i); });
    }
  }
  // audio: cue table entries point at their headers; header and stream addresses map to their file offsets
  const audio = catalogs.audio || {}, arow = p => row(p);
  for (const cue of audio.cues || []) {
    if (Number.isInteger(cue.tableFileOffset)) { const r = arow('audio.cues[].table'); r.locations++; if (cue.tableFileOffset < 16 || cue.tableFileOffset + 2 > prgEnd) r.outOfBounds++;
      else value('audio.cues[].table', {fileOffset: cue.tableFileOffset}, cue.headerCPU, word(cue.tableFileOffset), 'cue ' + cue.id); }
    for (const [cpu, off, p] of [[cue.headerCPU, cue.headerFileOffset, 'audio.cues[].header'], ...(cue.channels || []).map(ch => [ch.streamCPU, ch.streamFileOffset, 'audio.cues[].channels[].stream'])]) {
      if (!Number.isInteger(off)) continue; const r = arow(p); r.locations++;
      if (off < 16 || off >= prgEnd) { r.outOfBounds++; continue; }
      if (((off - 16) & 0x3FFF) !== (cpu & 0x3FFF)) r.mappingDisagrees++;
    }
  }
  // records that carry no ROM location at all, per top-level collection
  const unlocated = {};
  for (const [cat, c] of Object.entries(catalogs)) for (const [k, list] of Object.entries(c || {})) {
    if (!Array.isArray(list) || !list.length || typeof list[0] !== 'object') continue;
    const has = x => JSON.stringify(x).match(/"fileOffset"|FileOffset"/);
    unlocated[cat + '.' + k] = {records: list.length, withoutLocation: list.filter(x => !has(x)).length};
  }
  const table = [...rows.values()].sort((a, b) => a.path.localeCompare(b.path));
  const total = table.reduce((t, r) => { for (const k of ['locations', 'outOfBounds', 'mappingDisagrees', 'valueChecked', 'valueMatches', 'valueMismatches']) t[k] = (t[k] || 0) + r[k]; return t; }, {});
  const report = {rom: {file: path.basename(romPath), sha256: sha(rom), prgBanks, mapper: (rom[6] >> 4) | (rom[7] & 0xF0)}, editorSha256: sha(fs.readFileSync(forge)),
    profile: profileId, valueRules: rulesApply ? 'written for this profile' : 'not written yet for this profile: locations are checked, values are not',
    total, locations: table, unlocated, mismatches};
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(report, null, 1) + '\n');
  const md = ['# Evidence audit — ' + report.rom.file, '', `ROM SHA-256 \`${report.rom.sha256}\` · mapper ${report.rom.mapper} · ${prgBanks} × 16 KiB PRG · editor \`${report.editorSha256.slice(0, 16)}…\``, '',
    `**${total.locations}** claimed ROM locations: ${total.outOfBounds} outside the PRG area, ${total.mappingDisagrees} whose bank/CPU address disagrees with the file offset. ` +
    (rulesApply ? `**${total.valueChecked}** decoded values re-read from their locations: ${total.valueMatches} match, ${total.valueMismatches} differ.` :
      `Value rules are not written yet for profile \`${profileId}\`: its locations are checked, but no byte comparisons are made (its encodings differ from the verified profiles).`), '',
    '| Location kind | Locations | Outside PRG | Bank/CPU disagrees | Values re-read | Match | Differ |', '|---|---|---|---|---|---|---|',
    ...table.map(r => `| \`${r.path}\` | ${r.locations} | ${r.outOfBounds} | ${r.mappingDisagrees} | ${r.valueChecked} | ${r.valueMatches} | ${r.valueMismatches} |`), '',
    '## Records without any ROM location', '', '| Collection | Records | Without a location |', '|---|---|---|',
    ...Object.entries(unlocated).map(([k, v]) => `| \`${k}\` | ${v.records} | ${v.withoutLocation} |`), '',
    mismatches.length ? '## First mismatches\n\n' + mismatches.slice(0, 40).map(m => `- \`${m.path}\` ${m.where} @0x${m.fileOffset.toString(16)}: catalog ${JSON.stringify(m.expected)}, ROM ${JSON.stringify(m.actual)}`).join('\n') : '## Mismatches\n\nNone.'];
  fs.writeFileSync(path.join(outDir, 'EVIDENCE.md'), md.join('\n') + '\n');
  console.log(JSON.stringify(total));
  process.exit(0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
