#!/usr/bin/env node
'use strict';
/*
 Resource inventory audit: does any resource disappear between intake, import, navigation and save/reopen, and does
 one editor build show fewer resources than another for the same input?

   node tools/audit/resource_inventory.cjs --editors prev.html,alpha12.html,branch.html --labels prev,alpha12,branch \
        --inputs <folder or files: .nes ROMs and extraction .zip packs> --out <folder> [--jobs 2] [--names]
   node tools/audit/resource_inventory.cjs --compare-only --out <folder>

 Every step uses services that every editor since Integrated Review 5 has, the same ones the intake buttons use:
   intake     ProjectGateway.inspect(bytes): the input kind and the actions the editor offers for it
   import     ROM: InvestigationProject.create ("Prepare investigated game" / rom.import) and, when the exact bytes
              have one, RecoveryCatalog.project (source-matched recovery). Pack: every entry is read through the
              pack's own validation (pack.entry); every project-type entry is loaded with ProjectStore.load, as
              "Open project" in the pack view does.
   counts     every array of records in the project, by path (scenes, worlds, metasprites, nativeGame.resources...),
              before loading (the input) and after loading (what the editor kept)
   navigate   ResourceRelationshipPreview.liveGraph() nodes by type (the Library and Resource Explorer) and the scene
              selector
   reopen     ProjectStore.serialize -> load -> the same counts and the same project JSON
 Writes <out>/runs/<label>/<input>.json and <out>/COMPARE.md + compare.json: counts, hashes and reasons only, no ROM
 bytes or decoded game data. --names also writes <out>/private/ with the names of resources that differ (game
 content: keep it out of public repositories).
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

// ---------- in-editor helpers (run inside the editor's context) ----------
const HELPERS = `(()=>{
  // Every array whose items are records, by path: through nested objects (investigation.catalogs.native.scenes ...)
  // and one level into records (scenes[].sprites, catalogs.native.scenes[].enemies ...).
  window.__inv=function(root){const out={};const walk=(v,p,od,ad)=>{
    if(Array.isArray(v)){if(v.length&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x))){out[p]=(out[p]||0)+v.length;
      if(ad<1)for(const x of v)for(const k of Object.keys(x)){const y=x[k];if(y&&typeof y==='object')walk(y,p+'[].'+k,0,ad+1);}}return;}
    if(v&&typeof v==='object'&&od<6)for(const k of Object.keys(v)){const y=v[k];if(y&&typeof y==='object')walk(y,p?p+'.'+k:k,od+1,ad);}};
    walk(root,'',0,0);return out;};
  // Identity of the top-level resources: id (or name) per collection, for naming what differs.
  window.__ids=function(root){const out={};for(const k of Object.keys(root||{})){const v=root[k];
    if(Array.isArray(v)&&v.length&&v.every(x=>x&&typeof x==='object'))out[k]=v.map(x=>String(x.id??x.name??''));}
    const nr=root?.nativeGame?.resources;if(Array.isArray(nr))out['nativeGame.resources']=nr.map(x=>String(x.id??x.name??''));return out;};
  window.__graph=function(){const g=Forge.services.ResourceRelationshipPreview?.liveGraph?.();if(!g)return null;
    const nodes=g.nodes instanceof Map?[...g.nodes.values()]:Array.isArray(g.nodes)?g.nodes:[];const by={};
    for(const n of nodes){const t=String(n.type??n.kind??String(n.key||'').split(':')[0]);by[t]=(by[t]||0)+1;}
    return {nodes:nodes.length,byType:by,edges:Array.isArray(g.edges)?g.edges.length:(g.edges?.size||0)};};
  window.__selector=function(){try{return {scenes:S.scenes.length,worlds:(S.worlds||[]).length};}catch(_){return null;}};
  // Physical CHR tile sheets (native-chr scenes kept out of the build) are shown in the graph as CHR, not as scenes.
  window.__snap=function(){const p=Forge.services.ProjectStore.capture();
    const sheets=(p.scenes||[]).filter(s=>s?.captureMeta?.mode==='native-chr'&&s.buildInclude===false).length;
    return {inv:__inv(p),ids:__ids(p),tileSheets:sheets,name:p.projectName||'',json:JSON.stringify(p)};};
})()`;

// ---------- child: one editor, one input ----------
if (argv.includes('--one')) {
  const forge = path.resolve(opt('forge')), input = path.resolve(opt('one')), outFile = opt('out-file');
  const { loadForge } = require(path.join(repo, 'QA/t/u/harness.cjs'));
  const h = loadForge(forge);
  for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
  if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
  h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
  h.context.confirm = () => true;
  const J = async (code, ms = 1800000) => JSON.parse(JSON.stringify(await h.run(code, ms) ?? null));
  (async () => {
    h.run(HELPERS);
    const bytes = fs.readFileSync(input), editorBytes = fs.readFileSync(forge);
    const rec = {editor: {sha256: sha(editorBytes), release: await J('[Forge.release?.version,Forge.release?.name].filter(Boolean).join(" · ")')},
      input: {file: path.basename(input), sha256: sha(bytes), bytes: bytes.length}, steps: [], errors: []};
    const step = async (name, fn) => { const t0 = Date.now(); try { const r = await fn(); rec.steps.push({step: name, ms: Date.now() - t0, ...r}); } catch (e) { rec.errors.push({step: name, error: String(e && e.message || e).slice(0, 400)}); } };
    h.context.__bytes = new Uint8Array(bytes); h.context.__name = path.basename(input);
    // load a project object (already in context as __p) and measure what the editor kept, shows and saves
    const loadAndMeasure = async (label, intent) => {
      const before = await J('({inv:__inv(__p),ids:__ids(__p)})');
      await J(`(async()=>{await Forge.services.ProjectStore.load(__p,{intent:${JSON.stringify(intent)}});return true;})()`);
      const after = await J('(()=>{const s=__snap();window.__json1=s.json;delete s.json;return s;})()');
      const nav = {graph: await J('__graph()'), selector: await J('__selector()')};
      const reopen = await J(`(async()=>{const text=Forge.services.ProjectStore.serialize();await Forge.services.ProjectStore.load(JSON.parse(text),{intent:'audit-reopen'});
        const s=__snap();return {inv:s.inv,identical:s.json===window.__json1,bytes:text.length};})()`);
      return {label, name: after.name, before: before.inv, after: after.inv, ids: after.ids, tileSheets: after.tileSheets, inputIds: before.ids, navigate: nav, reopen};
    };
    await step('intake', async () => {
      const r = await J(`(async()=>{const r=await Forge.services.ProjectGateway.inspect(__bytes,{name:__name});window.__receipt=r;
        return {kind:r.kind,actions:(r.actions||[]).map(a=>a.id||a),limitations:(r.limitations||[]).length};})()`);
      rec.kind = r.kind; return r;
    });
    if (rec.kind === 'extraction') {
      await step('pack', async () => {
        const groups = await J(`(()=>{const pack=Forge.services.ProjectGateway.extraction(__receipt);window.__pack=pack;
          return Object.fromEntries(Object.entries(pack.files).map(([k,v])=>[k,v.length]));})()`);
        // every entry through the pack's own validation
        const checked = await J(`(async()=>{const out={accepted:{},rejected:{},reasons:{}};for(const [kind,list] of Object.entries(__pack.files))for(const path of list){
          try{await __pack.entry(path);out.accepted[kind]=(out.accepted[kind]||0)+1;}catch(e){out.rejected[kind]=(out.rejected[kind]||0)+1;const m=String(e.message).slice(0,120);out.reasons[m]=(out.reasons[m]||0)+1;}}return out;})()`);
        return {game: await J('__pack.report?.game||null'), groups, ...checked};
      });
      const projects = await J(`['project','animationProject','nativeProject','audioProject'].flatMap(k=>(__pack.files[k]||[]).map(p=>[k,p]))`) || [];
      const totals = {projects: 0, loaded: 0, failed: 0, before: {}, after: {}, graphNodes: 0, reopenIdentical: 0, reopenDiffer: [], lostAtLoad: [], lostAtReopen: []};
      const per = [];
      for (const [kind, p] of projects) {
        totals.projects++;
        try {
          h.context.__path = p;
          await J('(async()=>{const r=await __pack.entry(__path);window.__p=r.data;return true;})()');
          const m = await loadAndMeasure(p, 'extraction-project');
          totals.loaded++;
          for (const [k, v] of Object.entries(m.before)) totals.before[k] = (totals.before[k] || 0) + v;
          for (const [k, v] of Object.entries(m.after)) totals.after[k] = (totals.after[k] || 0) + v;
          totals.graphNodes += m.navigate.graph?.nodes || 0;
          if (m.reopen.identical) totals.reopenIdentical++; else totals.reopenDiffer.push(p);
          const lost = Object.entries(m.before).filter(([k, v]) => (m.after[k] || 0) < v).map(([k, v]) => ({path: k, input: v, kept: m.after[k] || 0}));
          if (lost.length) totals.lostAtLoad.push({entry: p, lost});
          const lostR = Object.entries(m.after).filter(([k, v]) => (m.reopen.inv[k] || 0) !== v).map(([k, v]) => ({path: k, loaded: v, reopened: m.reopen.inv[k] || 0}));
          if (lostR.length) totals.lostAtReopen.push({entry: p, lost: lostR});
          per.push({entry: p, kind, name: m.name, after: m.after, graph: m.navigate.graph, selector: m.navigate.selector, ids: m.ids});
        } catch (e) { totals.failed++; rec.errors.push({step: 'project ' + p, error: String(e && e.message || e).slice(0, 300)}); }
      }
      rec.steps.push({step: 'pack-projects', ...totals}); rec.packProjects = per;
    } else {
      await step('investigated', async () => {
        await J('(async()=>{window.__p=await Forge.services.InvestigationProject.create(__bytes,__name);return true;})()');
        return await loadAndMeasure('investigated', 'audit-rom-import');
      });
      const recovery = await J(`(()=>{try{return !!Forge.services.RecoveryCatalog?.info?.(${JSON.stringify(rec.input.sha256)});}catch(_){return false;}})()`);
      if (recovery) await step('recovery', async () => {
        await J(`(async()=>{window.__p=await Forge.services.RecoveryCatalog.project(${JSON.stringify(rec.input.sha256)},__bytes);return true;})()`);
        return await loadAndMeasure('recovery', 'source-matched-recovery');
      });
    }
    fs.mkdirSync(path.dirname(outFile), {recursive: true});
    fs.writeFileSync(outFile, JSON.stringify(rec, null, 1) + '\n');
    process.exit(0);
  })().catch(e => { console.error(e && e.stack || e); process.exit(1); });
  return;
}

// ---------- parent: run every editor on every input, then compare ----------
const outDir = path.resolve(opt('out', 'resource-inventory'));
const runChild = (forge, input, outFile) => new Promise(res => execFile(process.execPath, [__filename, '--one', input, '--forge', forge, '--out-file', outFile],
  {maxBuffer: 64 * 1024 * 1024, timeout: 3 * 3600 * 1000, env: process.env}, (err, so, se) => res({ok: !err, err: err ? String(se || err.message).slice(-800) : null})));
const flat = runs => { // input file -> label -> summary
  const out = {};
  for (const [label, recs] of Object.entries(runs)) for (const r of recs) {
    const o = (out[r.input.file] ||= {}); const s = {editor: r.editor, kind: r.kind, errors: r.errors};
    for (const st of r.steps) s[st.step] = st; o[label] = s;
  }
  return out;
};
function compare(labels) {
  const runs = {};
  for (const l of labels) { const d = path.join(outDir, 'runs', l); runs[l] = fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []; }
  const byInput = flat(runs), rows = [], findings = [];
  const add = (input, label, cls, detail) => findings.push({input, editor: label, class: cls, detail});
  for (const [input, per] of Object.entries(byInput)) {
    // an input is a pack when any editor opened it as one; an editor that could not is reported, not compared as a ROM
    const kind = Object.values(per).some(x => x.kind === 'extraction') ? 'extraction' : Object.values(per)[0]?.kind;
    const sumTop = inv => Object.fromEntries(Object.entries(inv || {}).filter(([k]) => !k.includes('[]')));
    for (const label of labels) {
      const s = per[label]; if (!s) { add(input, label, 'not run', ''); continue; }
      if (kind === 'extraction' && s.kind !== 'extraction') { add(input, label, 'cannot open', 'intake: ' + ((s.errors || []).find(e => e.step === 'intake')?.error || 'not recognised as an extraction pack')); continue; }
      for (const e of s.errors || []) add(input, label, 'error', e.step + ': ' + e.error);
      if (kind === 'extraction') {
        const pk = s.pack || {}, pp = s['pack-projects'] || {};
        for (const [k, n] of Object.entries(pk.rejected || {})) add(input, label, 'dropped at intake', `${n} ${k} entr${n === 1 ? 'y' : 'ies'} rejected by validation`);
        // Accepted entries that no project carries: browsable only while the pack is open (not in the project).
        const packOnly = Object.entries(pk.accepted || {}).filter(([k]) => !['project', 'animationProject', 'nativeProject', 'audioProject', 'audit', 'audioReport'].includes(k));
        if (packOnly.length) add(input, label, 'pack-only (browsable, not imported)', packOnly.map(([k, n]) => `${n} ${k}`).join(', '));
        for (const x of pp.lostAtLoad || []) add(input, label, 'dropped at load', x.entry + ': ' + x.lost.map(l => `${l.path} ${l.input}→${l.kept}`).join(', '));
        for (const x of pp.lostAtReopen || []) add(input, label, 'lost on save/reopen', x.entry + ': ' + x.lost.map(l => `${l.path} ${l.loaded}→${l.reopened}`).join(', '));
        const scenes = (pp.after || {}).scenes || 0;
        rows.push({input, editor: label, kind, groups: pk.groups, accepted: pk.accepted, rejected: pk.rejected, projects: pp.projects, loaded: pp.loaded, failed: pp.failed,
          kept: sumTop(pp.after), graphNodes: pp.graphNodes, reopenIdentical: pp.reopenIdentical, scenes});
      } else {
        for (const route of ['investigated', 'recovery']) {
          const r = s[route]; if (!r) continue;
          const lost = Object.entries(r.before || {}).filter(([k, v]) => (r.after?.[k] || 0) < v);
          if (lost.length) add(input, label, 'dropped at load', route + ': ' + lost.map(([k, v]) => `${k} ${v}→${r.after?.[k] || 0}`).join(', '));
          const lostR = Object.entries(r.after || {}).filter(([k, v]) => (r.reopen?.inv?.[k] || 0) !== v);
          if (lostR.length) add(input, label, 'lost on save/reopen', route + ': ' + lostR.map(([k, v]) => `${k} ${v}→${r.reopen?.inv?.[k] || 0}`).join(', '));
          const sc = r.after?.scenes || 0, sel = r.navigate?.selector?.scenes, gs = r.navigate?.graph?.byType?.scene;
          // physical tile sheets (native-chr, not built) are listed as CHR in the graph; older runs lack the count
          const sheets = r.tileSheets ?? (r.ids?.scenes || []).filter(id => /^re-chr-/.test(id)).length;
          if (sel !== undefined && sel !== null && sel < sc) add(input, label, 'hidden by navigation', `${route}: scene selector shows ${sel} of ${sc} scenes`);
          if (gs !== undefined && gs + sheets < sc) add(input, label, 'hidden by navigation', `${route}: resource graph has ${gs} scene nodes and ${sheets} tile sheets for ${sc} scenes`);
          else if (gs !== undefined && gs < sc) add(input, label, 'filed under another category', `${route}: ${sc - gs} of the ${sheets} physical CHR tile sheets (layout unresolved, not built) are listed as CHR rather than as scenes`);
          rows.push({input, editor: label, kind, route, actions: s.intake?.actions, kept: sumTop(r.after), graph: r.navigate?.graph?.byType, graphNodes: r.navigate?.graph?.nodes,
            selector: r.navigate?.selector, reopenIdentical: r.reopen?.identical});
        }
      }
    }
    // cross-editor: a collection one editor keeps more of than another, for the same input and route
    const routes = kind === 'extraction' ? ['pack-projects'] : ['investigated', 'recovery'];
    for (const route of routes) {
      const kept = Object.fromEntries(labels.map(l => [l, per[l]?.[route]?.after]).filter(([, v]) => v));
      const keys = new Set(Object.values(kept).flatMap(v => Object.keys(v)));
      for (const k of keys) {
        const vals = Object.fromEntries(Object.entries(kept).map(([l, v]) => [l, v[k] || 0]));
        const max = Math.max(...Object.values(vals));
        for (const [l, v] of Object.entries(vals)) if (v < max) add(input, l, 'fewer than another editor', `${route}: ${k} ${v} (max ${max}: ${Object.entries(vals).filter(([, x]) => x === max).map(([x]) => x).join(', ')})`);
      }
      const gn = Object.fromEntries(labels.map(l => [l, per[l]?.[route]?.navigate?.graph?.nodes ?? per[l]?.[route]?.graphNodes]).filter(([, v]) => v !== undefined));
      const gmax = Math.max(0, ...Object.values(gn));
      for (const [l, v] of Object.entries(gn)) if (v < gmax) add(input, l, 'fewer navigable than another editor', `${route}: ${v} resource-graph nodes (max ${gmax})`);
    }
  }
  const counts = {}; for (const f of findings) { const k = f.editor + ' · ' + f.class; counts[k] = (counts[k] || 0) + 1; }
  const md = ['# Resource inventory audit', '',
    'Each input is opened in each editor through the same intake services; counts are records kept after loading, what the resource graph (Library / Resource Explorer) and scene selector show, and whether save/reopen returns the identical project.', '',
    '| Editor | Release | SHA-256 |', '|---|---|---|',
    ...labels.map(l => { const r = runs[l][0]; return `| ${l} | ${r?.editor.release || '?'} | \`${(r?.editor.sha256 || '').slice(0, 16)}…\` |`; }), '',
    '## Findings by class', '', '| Editor · class | Count |', '|---|---|', ...Object.entries(counts).sort().map(([k, v]) => `| ${k} | ${v} |`), '',
    '## Findings', '', '| Input | Editor | Class | Detail |', '|---|---|---|---|',
    ...findings.map(f => `| ${f.input} | ${f.editor} | ${f.class} | ${String(f.detail).replace(/\|/g, '/').slice(0, 300)} |`), '',
    '## Per input', '', ...rows.map(r => `- **${r.input}** · ${r.editor}${r.route ? ' · ' + r.route : ''}: ${JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !['input', 'editor', 'route'].includes(k))))}`)];
  fs.writeFileSync(path.join(outDir, 'COMPARE.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'compare.json'), JSON.stringify({labels, findings, rows}, null, 1) + '\n');
  if (argv.includes('--names')) privateNames(runs, labels);
  console.log(Object.entries(counts).sort().map(([k, v]) => k + ': ' + v).join('\n') || 'no findings');
}
function privateNames(runs, labels) {
  // Names of top-level resources present for one editor and absent for another (game content: private output).
  const out = [], by = flat(runs);
  for (const [input, per] of Object.entries(by)) for (const route of ['investigated', 'recovery']) {
    const ids = Object.fromEntries(labels.map(l => [l, per[l]?.[route]?.ids]).filter(([, v]) => v));
    const cols = new Set(Object.values(ids).flatMap(v => Object.keys(v)));
    for (const c of cols) for (const a of Object.keys(ids)) for (const b of Object.keys(ids)) if (a !== b) {
      const missing = (ids[a][c] || []).filter(x => !(ids[b][c] || []).includes(x));
      if (missing.length) out.push({input, route, collection: c, in: a, notIn: b, items: missing.slice(0, 200)});
    }
  }
  fs.mkdirSync(path.join(outDir, 'private'), {recursive: true});
  fs.writeFileSync(path.join(outDir, 'private', 'differing_names.json'), JSON.stringify(out, null, 1) + '\n');
}

if (argv.includes('--compare-only')) { compare(opt('labels').split(',')); return; }
(async () => {
  const editors = opt('editors').split(',').map(p => path.resolve(p)), labels = (opt('labels') || editors.map((_, i) => 'e' + i).join(',')).split(',');
  const src = opt('inputs'), jobs = Number(opt('jobs', 2));
  const inputs = src.split(',').flatMap(p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => /\.(nes|zip)$/i.test(f)).sort().map(f => path.join(p, f)) : [path.resolve(p)]);
  const work = editors.flatMap((e, i) => inputs.map(input => ({e, label: labels[i], input, out: path.join(outDir, 'runs', labels[i], path.basename(input).replace(/[^\w.-]+/g, '_') + '.json')})));
  let next = 0, done = 0;
  await Promise.all(Array.from({length: jobs}, async () => { while (next < work.length) { const w = work[next++];
    if (fs.existsSync(w.out) && argv.includes('--resume')) { done++; continue; }
    const r = await runChild(w.e, w.input, w.out); done++;
    console.log(`[${done}/${work.length}] ${w.label} ${path.basename(w.input)} ${r.ok ? 'ok' : 'FAILED ' + r.err}`); } }));
  compare(labels);
})();
