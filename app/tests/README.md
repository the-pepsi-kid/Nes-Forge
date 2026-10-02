# Reproducible tests — NES Forge 1.9.0

Run from a clean release extraction with Node.js 20+ and Python 3:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

The strict runner tests `mainline/NES_Forge_1.9.0_Gameplay_Core.html`, requires all 41 suites, writes fresh per-suite reports/logs and verifies that the candidate and every provenance input remain unchanged. Missing inputs, skips, filters, source injection or older-HTML fallback fail the gate.

## Retained coverage

The 17 original behavioral suites retain editor/history, codecs, metasprites, animation/entity editing, collision, single-room generation and bundled-emulator gameplay. Six architecture suites retain ProjectStore/lifecycle, whole-ROM goldens, service routing, recognized-format rejection and source convergence. The 47-case World suite retains its behavior with intentional schema-12 expectations. Audio remains a 17-case suite. Gameplay Core adds 35 explicit cases.

The five complete-ROM oracles under `fixtures/golden167/` are immutable. Builds with Gameplay Core unused must remain byte-identical. Frozen 1.6.6, 1.6.7, 1.7 and 1.8 artifacts retain their own 479, 559, 606 and 623 measured totals; those are not 1.9.0 results.

## Audio Runtime / Studio coverage

`audio-runtime180.cjs` covers retained Audio persistence and actual frozen-1.7 rejection; detached tracker/instrument/SFX planning; missing/ambiguous links; unsupported DPCM/effects/custom assembly; generated viewer, single-room and World 6502/APU execution; duty/volume/arpeggio; sound-event timing; SFX preemption/restore; World source round trip; Audio controls; MIDI and MusicXML conversion; preserved SFX indices; undo; and frozen 1.8 example provenance.

`gameplay-core190.cjs` covers the four identity boundaries, generation-safe slot reuse, deterministic state tables, explicit operation/component schemas, executable-profile parity/rejection, exact 64/max+1 persistent capacity, explicit Room/World persistence, cross-owner rejection, unknown-operation preservation/build rejection, complete typed-table authoring, UI-authored Room reconstruction, execution of all five templates, retained-Player binding behavior, linked destination-World actors, unreachable diagnostics, 12/13 whole-plan capacity, disabled-Behavior inertness/re-enable behavior, unsigned overlap boundaries in both generated backends, partial single-room recovery, one-way active-state semantics, legacy ROM parity, the editable example and actual frozen-1.8 schema-12 rejection.

The editable examples can be regenerated before the release gate:

```sh
node tools/build_world_example.cjs
node tools/build_audio_example.cjs
node tools/build_gameplay_example.cjs
```

Examples are hashed runner inputs and must not change during a measured run.

## Evidence limits

The VM harness has a mock DOM and controlled storage/timers. Bundled-emulator execution validates generated instructions and APU state under that emulator. It does not establish real-browser layout, native picker behavior, audible speaker output or independent NES hardware timing. See `../docs/BROWSER_QA.md`.

Current clean-extraction evidence belongs under `../checkpoints/re-runtime-1-clean-extraction/`; historical checkpoint names retain their original release meaning.

## Runtime investigation

The full gate retains all 38 analysis/navigation/recovery/mobile/core suites and adds `re-runtime`, `re-runtime-ui` and `re-runtime-integration`. Actual totals come from the frozen candidate report. The owner's Pepsi ROM is an exact input fixture, not a production recognition allowlist; Bridge Room supplies a sound-producing comparison. Keep model/VM/bundled-emulator evidence separate from browser/manual checks in `../docs/RE_RUNTIME_CHECKLIST.txt`.
