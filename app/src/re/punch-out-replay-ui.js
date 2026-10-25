/* Explicit playback/experiment controls. Project assets never change here;
 * the live emulator is reset to the CURRENT native output on each Run. */
(() => {
  'use strict';
  const api = Forge.services.PunchOutReplay;
  const make = (tag, id, text) => { const e = document.createElement(tag); if (id) e.id = id; if (text !== undefined) e.textContent = text; return e; };
  const root = make('details', 'punchOutReplayPanel'), choice = make('select', 'punchOutReplayKind');
  const run = make('button', 'punchOutReplayRun', 'Load current build and replay');
  const stop = make('button', 'punchOutReplayStop', 'Stop replay'), restore = make('button', 'punchOutReplayRestore', 'Restore fight start');
  const status = make('p', 'punchOutReplayStatus'), evidence = make('pre', 'punchOutReplayEvidence');
  for (const [id, label] of [['sequence', 'Reset → opening → punch → dodge → stance'], ['opponent-down', 'Seeded opponent knockdown → count → get-up'],
    ['mac-down', 'Seeded Mac knockdown → count-out'], ['round', 'Seeded round end → round two']]) { const e = make('option', null, label); e.value = id; choice.appendChild(e); }
  choice.value = 'sequence'; status.setAttribute('role', 'status');
  root.append(make('summary', null, 'Glass Joe · native sequence and reversible experiments'),
    make('p', null, 'Run replaces the current emulator session with your current native build, then pauses at the result. The sequence uses real controller input from reset. Knockdown/round cases record explicit temporary RAM seeds after the native opening; Restore fight start returns to the physical pre-experiment checkpoint. Project edits and original source are untouched. MMC2 rendering remains approximate; runtime Scene capture is unavailable.'), choice, run, stop, restore, status, evidence);
  document.getElementById('emuView').insertBefore(root, document.getElementById('emuCanvas'));
  const launch = make('button', 'punchOutReplayOpen', 'Open Glass Joe native replay'); launch.type = 'button';
  document.getElementById('punchOutContentPanel').appendChild(launch);
  launch.onclick = () => { switchTab('emu'); root.open = true; root.scrollIntoView?.({block: 'nearest'}); };
  run.onclick = async () => { try { await api.run(choice.value); } catch (e) { status.textContent = e.message; } };
  stop.onclick = () => api.cancel(); restore.onclick = () => { try { api.restore(); } catch (e) { status.textContent = e.message; } };
  for (const b of [run, stop, restore]) b.type = 'button';
  evidence.style.cssText = 'white-space:pre-wrap;max-height:180px;overflow:auto;font-size:10px';
  root.style.cssText = 'font-size:11px;border:1px solid var(--bdr);padding:8px;max-width:900px';
  api.subscribe(s => { run.disabled = s.busy; stop.disabled = !s.busy; restore.disabled = !s.canRestore;
    status.textContent = s.report ? s.report.status + ' · ' + s.report.observedFrames + ' native frames · ' + (s.report.stop || 'original-engine playback') : 'Choose a recovered Punch-Out project, then run the declared sequence.';
    evidence.textContent = s.report ? JSON.stringify({kind: s.report.kind, last: s.report.last,
      milestones: s.report.milestones.map(m => ({name: m.name, frame: m.frame})), seeds: s.report.seeds, audio: s.report.audio}, null, 2) : ''; });
  for (const type of ['keydown', 'keyup']) root.addEventListener(type, e => e.stopPropagation?.());
})();
