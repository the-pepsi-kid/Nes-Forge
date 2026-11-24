'use strict';
// NES Forge AL-EXP-02: driver for the independent emulator (FCEUX). A development and acceptance-testing harness; the
// standalone editor never needs it. FCEUX is a separate program (GPL-2.0-or-later, https://github.com/TASVideos/fceux)
// that this harness only runs: nothing of FCEUX is copied into or shipped with NES Forge.
//
// One FCEUX process per run (its Qt build loads a new cartridge only after a script yields), all on one private Xvfb
// display, each with a private HOME holding the configuration below, so no user FCEUX settings leak in.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawn, spawnSync} = require('node:child_process');
const SCRIPT = path.join(__dirname, 'fceux-capture.lua');
// SDL.RamInitMethod 2 fills CPU RAM with $00 at power-on, the same convention as NES Forge's emulator (real hardware
// leaves it undefined). Sound off. Everything else is FCEUX's default (old PPU core, NTSC, no Game Genie).
const CONFIG = Object.freeze({'SDL.RamInitMethod': '2', 'SDL.Sound': '0'});

function which(name) { for (const dir of (process.env.PATH || '').split(':').concat(['/usr/games', '/usr/bin', '/usr/local/bin'])) { const p = path.join(dir, name); try { fs.accessSync(p, fs.constants.X_OK); return p; } catch (_) {} } return null; }

function detect() {
  const fceux = process.env.FCEUX_PATH || which('fceux'), xvfb = which('Xvfb');
  if (!fceux) return {available: false, reason: 'FCEUX is not installed (set FCEUX_PATH, or install the fceux package)'};
  if (!xvfb) return {available: false, reason: 'Xvfb is not installed (FCEUX needs a display; install the xvfb package)'};
  let help = '';
  try { const display = startDisplay(xvfb); try { const r = spawnSync(fceux, ['--help'], {env: {...process.env, DISPLAY: display.name, HOME: tempHome()}, encoding: 'utf8', timeout: 20000}); help = (r.stdout || '') + (r.stderr || ''); } finally { display.stop(); } }
  catch (error) { return {available: false, reason: 'FCEUX could not start: ' + error.message}; }
  const m = (re) => (help.match(re) || [])[1] || null;
  const version = m(/Starting FCEUX (\d+(?:\.\d+)*)/);
  if (!version) return {available: false, reason: 'FCEUX did not report a version (' + help.slice(0, 120).replace(/\s+/g, ' ') + ')'};
  let packageVersion = null; try { const r = spawnSync('dpkg-query', ['-W', '-f', '${Version}', 'fceux'], {encoding: 'utf8', timeout: 5000}); if (r.status === 0) packageVersion = r.stdout.trim(); } catch (_) {}
  let license = null; try { const c = fs.readFileSync('/usr/share/doc/fceux/copyright', 'utf8'); license = /GPL-2\+|GPL-2.0\+|GPL-2.0-or-later/.test(c) ? 'GPL-2.0-or-later' : /GPL/.test(c) ? 'GPL (see /usr/share/doc/fceux/copyright)' : null; } catch (_) {}
  return {available: true, fceux, xvfb, identity: {name: 'FCEUX', version, packageVersion, source: m(/git URL: (\S+)/), commit: m(/git Rev: ([0-9a-f]{7,40})/), qt: m(/Compiled with QT version (\S+)/), sdl: m(/Linked with SDL version (\S+)/),
    license: license || 'GPL-2.0-or-later (FCEUX project)', configuration: {...CONFIG, display: 'Xvfb 640x480x24', video: 'old PPU core (default), NTSC', lua: 'Lua 5.1 (built in)'}}};
}

function tempHome() { const home = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fceux-')); fs.mkdirSync(path.join(home, '.fceux')); fs.writeFileSync(path.join(home, '.fceux', 'fceux.cfg'), Object.entries(CONFIG).map(([k, v]) => k + ' = ' + v).join('\n') + '\n'); return home; }

function startDisplay(xvfb = which('Xvfb')) {
  for (let n = 90 + (process.pid % 50); n < 400; n++) {
    if (fs.existsSync('/tmp/.X11-unix/X' + n) || fs.existsSync('/tmp/.X' + n + '-lock')) continue;
    const proc = spawn(xvfb, [':' + n, '-screen', '0', '640x480x24', '-nolisten', 'tcp'], {stdio: 'ignore'});
    const t0 = Date.now(); while (Date.now() - t0 < 5000) { if (fs.existsSync('/tmp/.X11-unix/X' + n)) return {name: ':' + n, stop: () => { try { proc.kill('SIGTERM'); } catch (_) {} }}; spawnSync('sleep', ['0.05']); }
    try { proc.kill('SIGKILL'); } catch (_) {}
  }
  throw Error('no free X display for Xvfb');
}

const luaString = s => JSON.stringify(String(s));
function luaJob(out, run) {
  const list = a => '{' + a.join(',') + '}';
  return 'return {out=' + luaString(out) + ',runs={{id=' + luaString(run.id) + ',nmiTarget=' + run.nmiTarget + ',latches=' + list(run.latches) + ',defaultMask=' + (run.defaultMask | 0) +
    ',checkpoints=' + list(run.checkpoints.map(c => '{label=' + luaString(c.label) + ',nmi=' + c.nmi + '}')) + ',maxFrames=' + run.maxFrames + ',trace=' + !!run.trace + ',maxReads=' + (run.maxReads || 200000) +
    ',chr=' + !!run.chr + ',pixels=' + !!run.pixels + ',byFrame=' + !!run.byFrame + ',ctrl=' + !!run.ctrl + '}}}\n';
}
const unhex = s => Uint8Array.from(Buffer.from(s, 'hex'));
function parse(text) {
  const result = {lua: null, runs: []}; let run = null, cp = null;
  for (const line of text.split('\n')) {
    const sp = line.indexOf(' '), tag = sp < 0 ? line : line.slice(0, sp), rest = sp < 0 ? '' : line.slice(sp + 1);
    if (tag === 'engine') result.lua = (rest.match(/lua=(.*)/) || [])[1] || null;
    else if (tag === 'run') { run = {id: rest, captures: []}; result.runs.push(run); }
    else if (tag === 'cp') { const [label, nmi, frame, latches] = rest.split(' '); cp = {label, nmi: +nmi, frame: +frame, latches: +latches}; run.captures.push(cp); }
    else if (tag === 'regs') cp.regs = {a: parseInt(rest.slice(0, 2), 16), x: parseInt(rest.slice(2, 4), 16), y: parseInt(rest.slice(4, 6), 16), s: parseInt(rest.slice(6, 8), 16), p: parseInt(rest.slice(8, 10), 16), pc: parseInt(rest.slice(10, 14), 16)};
    else if (tag === 'ram') cp.ram = unhex(rest);
    else if (tag === 'written') cp.written = Uint8Array.from(rest, c => c === '1' ? 1 : 0);
    else if (tag === 'ppu') cp.ppu = unhex(rest);
    else if (tag === 'pal') cp.palette = unhex(rest);
    else if (tag === 'chr') cp.chr = unhex(rest);
    else if (tag === 'ctrl') { const [v, state] = rest.split(' '); cp.ctrl = state === 'written' ? parseInt(v, 16) : null; }
    else if (tag === 'pix') cp.pixels = unhex(rest);
    else if (tag === 'reads') { const [count, data = ''] = rest.split(' '); cp.reads = []; for (let i = 0; i + 10 <= data.length; i += 10) cp.reads.push([parseInt(data.slice(i, i + 4), 16), parseInt(data.slice(i + 4, i + 8), 16), parseInt(data.slice(i + 8, i + 10), 16)]); cp.readCount = +count; }
    else if (tag === 'end') { const [, frames, nmis, latches, multi, remaining] = rest.split(' '); Object.assign(run, {frames: +frames, nmis: +nmis, latches: +latches, multiLatchFrames: +multi, missing: +remaining}); }
    else if (tag === 'done') result.done = true;
  }
  return result;
}

// Run one job: {id, rom: Uint8Array, nmiTarget, latches:[mask...], defaultMask, checkpoints:[{label,nmi}], maxFrames, trace, chr, pixels}.
function runJob(env, run, {timeoutMs = 120000} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fceux-run-')), home = tempHome();
  try {
    const romPath = path.join(dir, 'cartridge.nes'), jobPath = path.join(dir, 'job.lua'), outPath = path.join(dir, 'out.txt');
    fs.writeFileSync(romPath, run.rom); fs.writeFileSync(jobPath, luaJob(outPath, run));
    const t0 = Date.now();
    const r = spawnSync(env.fceux, ['--sound', '0', '--loadlua', SCRIPT, romPath], {env: {...process.env, DISPLAY: env.display, HOME: home, FORGE_JOB: jobPath}, encoding: 'utf8', timeout: timeoutMs});
    const ms = Date.now() - t0;
    const text = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    const parsed = parse(text);
    if (r.error) return {ok: false, reason: 'FCEUX did not finish: ' + r.error.message, ms, log: String(r.stdout || '').slice(-400)};
    if (!parsed.done) return {ok: false, reason: 'FCEUX ended without completing the job (exit ' + r.status + ')', ms, log: (String(r.stdout || '') + String(r.stderr || '')).slice(-600)};
    return {ok: true, ms, lua: parsed.lua, ...parsed.runs[0]};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); fs.rmSync(home, {recursive: true, force: true}); }
}

// An investigation script (Agent Lab): runs the given Lua source in FCEUX with the cartridge; FORGE_OUT names the file the
// script writes, FORGE_JOB a file holding the given job text. Returns what the script wrote.
function runLuaSource(env, {rom, lua, job = '', timeoutMs = 300000}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fceux-lua-')), home = tempHome();
  try {
    const romPath = path.join(dir, 'cartridge.nes'), luaPath = path.join(dir, 'probe.lua'), outPath = path.join(dir, 'out.txt'), jobPath = path.join(dir, 'job.txt');
    fs.writeFileSync(romPath, rom); fs.writeFileSync(luaPath, lua); fs.writeFileSync(jobPath, job);
    const r = spawnSync(env.fceux, ['--sound', '0', '--loadlua', luaPath, romPath], {env: {...process.env, DISPLAY: env.display, HOME: home, FORGE_OUT: outPath, FORGE_JOB: jobPath}, encoding: 'utf8', timeout: timeoutMs});
    const text = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    return {ok: !r.error && /\ndone\s*$/.test(text), text, ...(r.error ? {reason: r.error.message} : {})};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); fs.rmSync(home, {recursive: true, force: true}); }
}

// A session: detect, start one display, run jobs, stop.
function open() {
  const found = detect(); if (!found.available) return {available: false, reason: found.reason};
  const display = startDisplay(found.xvfb), env = {fceux: found.fceux, display: display.name};
  return {available: true, identity: found.identity, run: (job, options) => runJob(env, job, options), runLua: options => runLuaSource(env, options), close: () => display.stop()};
}
module.exports = {detect, open, parse, luaJob, CONFIG};
