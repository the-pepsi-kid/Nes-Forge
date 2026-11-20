'use strict';
// The resource library keeps every file of a registered pack, across closing and reopening NES Forge, in a real
// Chromium profile on disk (IndexedDB). Repository inputs only, unless a folder of extraction packs is given:
//   node QA/library-persistence.cjs <NES_Forge.html> <report.json> [<folder of extraction ZIPs>]
// Checks: every file becomes a visible entry, also for a pack the intake rejects; registering again changes nothing;
// an interrupted import is reported, survives a restart and resumes to a complete, verified pack; notes stay apart
// from evidence; everything survives closing the browser; discard + import of an export restores the shelf;
// index-only registration keeps entries and previews and says where the data is; storage quota is reported.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, packDir] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: [], packs: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); };
const launch = dir => chromium.launchPersistentContext(dir, {headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
const open = async ctx => { const p = ctx.pages()[0] || await ctx.newPage(); p.setDefaultTimeout(1800000); await p.goto('file://' + editor); await p.waitForFunction('window.Forge?.services?.ResourceLibrary&&window.Forge.commands'); return p; };
const run = (page, name, args) => page.evaluate(async ([name, args]) => {
  if (args && args.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
  const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
const realPacks = packDir ? ['Contra_U.zip', 'Ninja_Gaiden_U.zip', 'Zelda_2_The_Adventure_of_Link_U.zip', 'Castlevania_U_PRG_0.zip'].map(f => path.join(packDir, f)).filter(f => fs.existsSync(f)) : [];
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-library-'));
  try {
    let ctx = await launch(profile), page = await open(ctx);
    const st0 = await run(page, 'library.status');
    check('IndexedDB backend, persistent, empty at first', st0.backend === 'indexeddb' && st0.persistent && st0.entries === 0, {backend: st0.backend});
    // a synthetic pack the intake does not recognise: every file must still be registered and visible
    const synthetic = await page.evaluate(async () => {
      const enc = s => new TextEncoder().encode(s);
      const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
      const files = [{name: 'Mystery/stages_art/screen_1.json', data: enc(JSON.stringify({bank16KiB: 3, cpu: 0x9abc, fileOffset: 0xdacc, tiles: [1, 2, 3]}))},
        {name: 'Mystery/stages_art/screen_1.png', data: png}, {name: 'Mystery/raw/blob.bin', data: Uint8Array.from({length: 300}, (_, i) => i * 7 & 255)},
        {name: 'Mystery/readme.txt', data: enc('found while exploring')}, {name: 'Mystery/index.html', data: enc('<p>viewer</p>')}];
      const blob = buildZip(files); const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return {b64: btoa(s), files: files.length};
    });
    const syn = await run(page, 'library.register', {__b64: synthetic.b64, name: 'mystery.zip'});
    const synList = await run(page, 'library.list', {pack: syn.packSha256});
    check('A pack the intake does not recognise keeps every file as a visible entry', synList.total === synthetic.files && syn.stats.entries === synthetic.files, {counts: synList.counts});
    const synJson = synList.items.find(i => i.path.endsWith('screen_1.json'));
    const synInspect = await run(page, 'library.inspect', {id: synJson.id});
    check('Unknown data keeps its stated ROM evidence and its preview', synInspect.entry.kind === 'unknown' && synInspect.entry.evidence.state === 'stated' && synInspect.entry.evidence.fields.fileOffset?.first === 0xdacc && !!synInspect.entry.preview);
    const again = await run(page, 'library.register', {__b64: synthetic.b64, name: 'mystery-renamed.zip'});
    const after = await run(page, 'library.status');
    check('Registering the same pack again changes nothing', again.already === true && after.entries === synthetic.files);
    if (!realPacks.length) {
      // without private packs: interrupt a 120-file synthetic pack after 30 entries, restart, resume
      const big = await page.evaluate(async () => { const files = Array.from({length: 120}, (_, i) => ({name: 'Bulk/data/item_' + i + '.json', data: new TextEncoder().encode(JSON.stringify({i, fileOffset: 0x8000 + i}))}));
        const bytes = new Uint8Array(await buildZip(files).arrayBuffer()); let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return btoa(s); });
      const stopped = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        try { await Forge.services.ResourceLibrary.register(bytes, {name: 'bulk.zip', batch: 10, onProgress: p => { if (p.done >= 30) throw Error('simulated interruption'); }}); return false; } catch (e) { return String(e.message).includes('simulated'); } }, big);
      check('An interrupted import is reported', stopped && (await run(page, 'library.status')).interrupted.length === 1);
      await ctx.close(); ctx = await launch(profile); page = await open(ctx);
      check('The interrupted import is still reported after a restart', (await run(page, 'library.status')).interrupted.length === 1);
      const resumed = await run(page, 'library.register', {__b64: big, name: 'bulk.zip'});
      const v = await run(page, 'library.verify', {pack: resumed.packSha256});
      check('Registering again resumes it to a complete, verified pack', resumed.stats.resumed >= 30 && resumed.stats.entries === 120 && v.ok && (await run(page, 'library.status')).interrupted.length === 0, {resumed: resumed.stats.resumed});
    }
    // real packs
    for (const file of realPacks.slice(0, 3)) {
      const b64 = fs.readFileSync(file).toString('base64'), t0 = Date.now();
      if (path.basename(file).startsWith('Zelda')) {
        // interrupted import: stop after 300 entries, then resume after a browser restart
        const stopped = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          try { await Forge.services.ResourceLibrary.register(bytes, {name: 'zelda.zip', onProgress: p => { if (p.done >= 300) throw Error('simulated interruption'); }}); return false; } catch (e) { return String(e.message).includes('simulated'); } }, b64);
        const st = await run(page, 'library.status');
        check('An interrupted import is reported', stopped && st.interrupted.length === 1 && st.interrupted[0].done >= 300, {interrupted: st.interrupted});
        await ctx.close(); ctx = await launch(profile); page = await open(ctx);
        const st2 = await run(page, 'library.status');
        check('The interrupted import is still reported after a restart', st2.interrupted.length === 1);
        const resumed = await run(page, 'library.register', {__b64: b64, name: path.basename(file)});
        const v = await run(page, 'library.verify', {pack: resumed.packSha256});
        const st3 = await run(page, 'library.status');
        check('Registering again resumes it to a complete, verified pack', resumed.stats.resumed >= 300 && v.ok && st3.interrupted.length === 0, {resumed: resumed.stats.resumed, problems: v.problems.slice(0, 3)});
        report.packs.push({pack: path.basename(file), ms: Date.now() - t0, ...resumed.stats});
      } else {
        const r = await run(page, 'library.register', {__b64: b64, name: path.basename(file)});
        report.packs.push({pack: path.basename(file), ms: Date.now() - t0, ...r.stats});
      }
    }
    const packs = await run(page, 'library.packs');
    for (const p of packs.filter(p => p.name !== 'mystery.zip')) {
      const l = await run(page, 'library.list', {pack: p.packSha256, limit: 1});
      check(p.name + ': one visible entry per file of the pack', l.total === p.fileCount && p.state === 'complete', {files: p.fileCount, entries: l.total, counts: l.counts});
    }
    // notes are the developer's, apart from evidence
    const note = await run(page, 'library.annotate', {id: synJson.id, notes: {name: 'Title screen?', category: 'screen', tags: ['guess'], possiblePlacements: [{stage: 'Title', confidence: 'medium', note: 'same tiles as the title'}]}});
    const ins = await run(page, 'library.inspect', {id: synJson.id});
    check('Notes are stored apart from evidence', ins.notes?.name === 'Title screen?' && ins.notes.source === 'developer' && JSON.stringify(ins.entry.evidence) === JSON.stringify(synInspect.entry.evidence));
    const before = await run(page, 'library.status');
    await ctx.close();
    // ---- restart ----
    ctx = await launch(profile); page = await open(ctx);
    const st = await run(page, 'library.status');
    check('Everything survives closing and reopening the browser', st.entries === before.entries && st.blobs === before.blobs && st.notes === before.notes && st.packs === before.packs, {before: {entries: before.entries, blobs: before.blobs, notes: before.notes}, after: {entries: st.entries, blobs: st.blobs, notes: st.notes}});
    const v = await run(page, 'library.verify');
    check('Integrity check after the restart: every stored entry matches its content hash', v.ok, {entries: v.entries, blobsChecked: v.blobsChecked, problems: v.problems.slice(0, 5)});
    check('Storage usage and quota are reported', st.storage && st.storage.quota > 0 && st.storage.usage > 0, {storage: st.storage, persisted: st.persisted});
    const ins2 = await run(page, 'library.inspect', {id: synJson.id});
    check('Notes survive the restart', ins2.notes?.possiblePlacements?.[0]?.stage === 'Title');
    // export, discard, import
    const shelf = (await run(page, 'library.list', {pack: syn.packSha256, limit: 1})).items[0].shelf;
    const ex = await run(page, 'library.export', {shelf});
    const gone = await run(page, 'library.discard', {packSha256: syn.packSha256});
    const mid = await run(page, 'library.list', {pack: syn.packSha256});
    const imp = await run(page, 'library.import', {__b64: ex.base64});
    const back = await run(page, 'library.list', {pack: syn.packSha256});
    const v2 = await run(page, 'library.verify');
    check('Export, discard and import restore the shelf exactly', gone.entriesRemoved === synthetic.files && mid.total === 0 && back.total === synthetic.files && imp.entriesAdded === synthetic.files && v2.ok);
    // index-only registration
    const cv = realPacks.find(f => /Castlevania_U_PRG_0/.test(f));
    if (cv) {
      const r = await run(page, 'library.register', {__b64: fs.readFileSync(cv).toString('base64'), name: 'cv0.zip', mode: 'index-only'});
      const l = await run(page, 'library.list', {pack: r.packSha256, limit: 2000});
      const data = l.items.find(i => i.fileType === 'json'), img = l.items.find(i => i.fileType === 'image');
      let message = ''; try { await run(page, 'library.read', {id: data.id}); } catch (e) { message = e.message; }
      check('Index-only keeps every entry visible and says the data needs the pack', l.total === r.stats.entries && data.data === 'needs-source' && /open its pack/.test(message) && (!img || img.data === 'stored'), {entries: l.total, message: message.slice(0, 160)});
    }
    await ctx.close();
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); }
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 400)));
  for (const p of report.packs) console.log(`  ${p.pack}: ${p.entries} entries, ${p.blobsStored} blobs stored (${(p.storedBytes / 1048576).toFixed(1)} MB), ${p.blobsShared} shared, ${p.unknown} unknown, ${p.rejected} rejected, ${(p.ms / 1000).toFixed(1)} s`);
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
