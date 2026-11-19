#!/usr/bin/env node
'use strict';
/*
 NES Forge command line: the same Forge.commands the editor, touch, controller and XR adapters use,
 without a browser. For scripts, CI and local agents (Qwen etc.). Nothing here is a second editor.

   node tools/forge-cli.cjs list
   node tools/forge-cli.cjs describe resources.list
   node tools/forge-cli.cjs run <command> ['{"json":"args"}'] [<command> [args]] ...
   node tools/forge-cli.cjs script steps.json        # [{"command":"...","args":{...},"save":"file"}]

 Argument helpers inside JSON args:
   "@bytes:path"  file contents as bytes (ROM, ZIP)      "@text:path"  file contents as text (project JSON)
 Options: --forge <NES_Forge.html> (default: repository editor), --out <dir> (write base64 results to files)
 Each command prints one JSON line: {"command","ok","result"|"error"}. Exit code 1 if any command failed.
*/
const fs = require('node:fs'), path = require('node:path');
const repo = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
function option(name, def) { const i = argv.indexOf('--' + name); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; }
const forgePath = path.resolve(option('forge', path.join(repo, 'NES_Forge.html')));
const outDir = option('out', null);
const { loadForge } = require(path.join(repo, 'QA/t/u/harness.cjs'));
const h = loadForge(forgePath);
for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = require('node:crypto').webcrypto;
h.run("Forge.commands.registerAdapter({id:'cli',kind:'cli',title:'Command line'})");

function resolveArgs(value) {
  if (typeof value === 'string' && value.startsWith('@bytes:')) return new Uint8Array(fs.readFileSync(value.slice(7)));
  if (typeof value === 'string' && value.startsWith('@text:')) return fs.readFileSync(value.slice(6), 'utf8');
  if (Array.isArray(value)) return value.map(resolveArgs);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveArgs(v)]));
  return value;
}
async function call(command, args, save) {
  h.context.__args = args == null ? null : resolveArgs(args);
  const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(command)},__args,{adapter:'cli'})`, 1800000)));
  if (r.ok && r.result && typeof r.result.base64 === 'string' && (save || outDir)) {
    const file = save || path.join(outDir, command.replace(/\W+/g, '_') + (r.result.format === 'rgba' ? '.rgba' : '.bin'));
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.result.base64, 'base64')); r.result.base64 = '(written to ' + file + ')';
  }
  if (r.ok && r.result && typeof r.result.json === 'string' && save) { fs.writeFileSync(save, r.result.json); r.result.json = '(written to ' + save + ')'; }
  console.log(JSON.stringify({ command, ok: r.ok, ...(r.ok ? { result: r.result } : { error: r.error }) }));
  return r.ok;
}
(async () => {
  const verb = argv.shift();
  let ok = true;
  if (verb === 'list') ok = await call('commands.list');
  else if (verb === 'describe') ok = await call('commands.describe', { name: argv.shift() });
  else if (verb === 'run') {
    while (argv.length) { const command = argv.shift(); let args = null; if (argv.length && argv[0].trim().startsWith('{')) args = JSON.parse(argv.shift()); ok = (await call(command, args)) && ok; }
  } else if (verb === 'script') {
    const steps = JSON.parse(fs.readFileSync(argv.shift(), 'utf8'));
    if (!Array.isArray(steps)) throw Error('A script is a JSON array of {command, args, save}');
    for (const step of steps) { ok = (await call(step.command, step.args || null, step.save)) && ok; if (!ok && step.stopOnError !== false) break; }
  } else { console.error('Usage: node tools/forge-cli.cjs list | describe <command> | run <command> [json] ... | script steps.json'); process.exit(2); }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(4); });
