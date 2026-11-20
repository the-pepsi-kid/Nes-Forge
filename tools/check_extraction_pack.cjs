#!/usr/bin/env node
'use strict';
/*
 Check an extraction ZIP with NES Forge's OWN intake before handing it to anyone.

 Usage:
   node tools/check_extraction_pack.cjs <pack.zip | folder of zips> [--forge NES_Forge.html] [--json report.json]

 For each ZIP:
   1. limits NES Forge enforces when opening a ZIP: at most 2,048 entries and 64 MB, no ZIP64
   2. Forge.services.ExtractionPack.open(): root report, revision fingerprint and file grouping
   3. every listed record through pack.entry(): the same schema checks the editor applies
      (project validation, entity IDs, collision grid sizes, object lists, poses, catalogs ...)
   4. every record that the editor previews has its PNG inside the ZIP
   5. every native project rebuilds the original ROM byte-for-byte (unchanged project = original game)
 Exit code 0 only when every pack passes. Nothing is modified.

 This is the same check as QA/extraction-review.cjs and QA/native-pack-roundtrip.cjs, without a browser or jsdom.
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
function arg(n, d) { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; }
const target = process.argv[2];
if (!target || target.startsWith('--')) { console.error('Usage: node tools/check_extraction_pack.cjs <pack.zip|folder> [--forge NES_Forge.html] [--json out.json]'); process.exit(1); }
const repo = path.resolve(__dirname, '..');
const forgePath = path.resolve(arg('forge', path.join(repo, 'NES_Forge.html'))), harnessPath = path.resolve(arg('harness', path.join(repo, 'QA/t/u/harness.cjs')));
const zips = fs.statSync(target).isDirectory() ? fs.readdirSync(target).filter(n => n.toLowerCase().endsWith('.zip')).sort().map(n => path.join(target, n)) : [target];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const { loadForge } = require(harnessPath);
const forge = loadForge(forgePath);
// The editor inflates ZIP entries with the browser's DecompressionStream; Node 22 provides the same API.
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder']) if (!forge.context[k]) forge.context[k] = globalThis[k];
if (!forge.context.crypto || !forge.context.crypto.subtle) forge.context.crypto = crypto.webcrypto;

function zipLimits(bytes) {
  // Mirrors the editor's parseZip(): end-of-central-directory record, entry count, ZIP64, size.
  const problems = [];
  if (bytes.length > 64 * 1024 * 1024) problems.push('ZIP is ' + (bytes.length / 1048576).toFixed(1) + ' MB; NES Forge opens at most 64 MB.');
  let end = -1; for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) { problems.push('No ZIP directory found.'); return { entries: 0, problems }; }
  const count = bytes.readUInt16LE(end + 10);
  if (count === 0xFFFF) problems.push('ZIP64 archive; NES Forge does not open ZIP64. Use a normal ZIP.');
  else if (count > 2048) problems.push(count + ' files; NES Forge opens at most 2,048 files per ZIP (it reports "Invalid ZIP directory"). Remove ' + (count - 2048) + ' or split the pack.');
  return { entries: count, problems };
}

(async () => {
  const results = [];
  for (const zip of zips) {
    const bytes = fs.readFileSync(zip), row = { file: path.basename(zip), sha256: sha(bytes), passed: false, groups: {}, errors: [] };
    results.push(row);
    const lim = zipLimits(bytes); row.entries = lim.entries;
    if (lim.problems.length) { row.errors.push(...lim.problems.map(m => ({ check: 'limits', message: m }))); report(row); continue; }
    forge.context.__zip = new Uint8Array(bytes);
    try {
      const out = JSON.parse(await forge.run(`(async()=>{
        const S2=Forge.services,pack=await S2.ExtractionPack.open(__zip),res={game:pack.report.game,format:pack.report.format,rom:pack.report.rom.sha256,groups:{},errors:[],native:[],files:pack.files};
        const names=new Set(pack.paths||[]);
        for(const [kind,paths] of Object.entries(pack.files)){
          if(!paths.length)continue;const g={listed:paths.length,validated:0};res.groups[kind]=g;
          for(const p of paths){try{const rec=await pack.entry(p);if(rec.kind!==kind)throw Error('classified as '+rec.kind);g.validated++;}
            catch(e){res.errors.push({check:'entry',kind,path:p,message:String(e.message).slice(0,300)});}}
        }
        for(const p of pack.files.nativeProject||[]){
          const store=S2.ProjectStore,keep=store.serialize();
          try{const rec=await pack.entry(p);store.load(rec.data,{intent:'pack-check'});const rom=S2.RuntimeCompiler.compile().rom;
            const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rom))).map(x=>x.toString(16).padStart(2,'0')).join('');
            res.native.push({path:p,rebuildsOriginal:h===pack.report.rom.sha256.toLowerCase()});
            if(h!==pack.report.rom.sha256.toLowerCase())res.errors.push({check:'native-rebuild',path:p,message:'Unchanged native project does not rebuild the original ROM.'});}
          catch(e){res.native.push({path:p,rebuildsOriginal:false});res.errors.push({check:'native-rebuild',path:p,message:String(e.message).slice(0,300)});}
          finally{try{store.load(keep,{intent:'pack-check-restore'})}catch{}}
        }
        return JSON.stringify(res)})()`, 1800000));
      Object.assign(row, { game: out.game, format: out.format, romSha256: out.rom, groups: out.groups, native: out.native });
      row.errors.push(...out.errors);
      // Previews: the editor shows <record>.png (collision: the PNG itself) for these kinds.
      const listing = new Set(listZip(bytes));
      for (const kind of ['map', 'room', 'resource', 'collision', 'pose', 'animationProject', 'object']) {
        for (const p of out.files[kind] || []) {
          const png = kind === 'collision' ? p : kind === 'animationProject' ? p.replace(/\.nesforge\.json$/i, '.png') : kind === 'object' ? p.replace(/_objects\.json$/i, '.png') : p.replace(/\.json$/i, '.png');
          if (!listing.has(png)) row.errors.push({ check: 'preview', kind, path: p, message: 'Missing preview image ' + png });
        }
      }
    } catch (e) { row.errors.push({ check: 'open', message: String(e.message).slice(0, 300) }); }
    row.passed = !row.errors.length; report(row);
  }
  const ok = results.every(r => r.passed);
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ format: 'NESForgePackCheck', forgeSha256: sha(fs.readFileSync(forgePath)), passed: ok, packs: results }, null, 1));
  console.log((ok ? 'ALL PASS' : 'SOME FAIL') + ': ' + results.filter(r => r.passed).length + ' of ' + results.length + ' pack(s) open cleanly in this NES Forge build.');
  process.exit(ok ? 0 : 2);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(4); });

function report(r) {
  const groups = Object.entries(r.groups || {}).map(([k, g]) => k + ' ' + g.validated + '/' + g.listed).join(', ');
  console.log((r.passed ? 'PASS ' : 'FAIL ') + r.file + (r.game ? ' (' + r.game + ')' : '') + ' - ' + r.entries + ' files' + (groups ? '; ' + groups : '') + ((r.native || []).length ? '; native rebuild ' + r.native.filter(n => n.rebuildsOriginal).length + '/' + r.native.length : ''));
  for (const e of r.errors.slice(0, 8)) console.log('   ' + e.check + (e.path ? ' ' + e.path : '') + ': ' + e.message);
  if (r.errors.length > 8) console.log('   ... ' + (r.errors.length - 8) + ' more');
}
function listZip(bytes) {
  let end = -1; for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) return [];
  const count = bytes.readUInt16LE(end + 10); let p = bytes.readUInt32LE(end + 16); const names = [];
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) { const len = bytes.readUInt16LE(p + 28), extra = bytes.readUInt16LE(p + 30), comment = bytes.readUInt16LE(p + 32); names.push(bytes.slice(p + 46, p + 46 + len).toString('utf8')); p += 46 + len + extra + comment; }
  return names;
}
