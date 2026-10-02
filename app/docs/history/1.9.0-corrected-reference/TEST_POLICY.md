# Test and release policy — 1.9.0 Gameplay Core

## Evidence rules

Every published result must identify the actual candidate HTML hash, exact commands/environment, suite and case counts, failures/skips and exit status. A skipped required suite fails the release gate. Never combine unrelated runs or promote smoke checks to a full acceptance claim.

Frozen results belong to their artifacts: 1.6.6 measured 479/479, 1.6.7 measured 559/559, 1.7 measured 606/606 and 1.8 measured 623/623. Keep those releases, tests, fixtures and five golden ROMs; never regenerate golden bytes or protected hashes to excuse a regression. The 1.9.0 runner measures its own total.

The 1.9.0 candidate must be bundled and tested from a fresh extraction. Documentation, tests and examples are provenance inputs; any post-run change requires a new clean run.

For future raster-dependent work, evidence must state whether behavior is merely **Captured**, canonically **Represented**, or **Compilable** by the selected runtime profile. A rendered capture, trace or preserved source envelope cannot be promoted to a compiler-support claim. Preserve the existing conservative refusal to rebuild unsupported raster behavior; a deliberate refusal is not a regression unless an approved profile promises that behavior.

Narrow candidate adaptations may update release/schema expectations, add the `gameplay-core-link` phase and recognize schema-12 World source. Keep prior behavioral assertions and historical reproduction. Tests must not inject missing production functions, substitute an older HTML or rebuild a missing artifact silently.

## Required coverage

| Area | Required evidence |
| --- | --- |
| Source and preservation | Deterministic complete bundle; missing/duplicate source rejection; protected emulator/capture/Save As/CHR spans; five byte-identical legacy ROMs |
| Project lifecycle | Schema 12 output; actual frozen-1.8 rejection; older migration with Gameplay Core disabled; retained Audio/SFX identity/settings persistence; atomic malformed input; save/recovery/history policies |
| Gameplay model | Schema 12; Definition/Instance isolation; generation-safe Runtime Actor slots; one canonical UI/compiler component schema; typed components/parameters; deterministic state tables; explicit operand schemas; malformed/out-of-range/type/reference rejection; unknown authoring-operation retention and executable rejection; authoritative ContactDamage actions and Actor Instance persistence bindings |
| Gameplay persistence | Explicit Room/World variables; transient reset on reconstruction; World communication across Rooms; invalid missing/cross-owner reference rejection; exact 64/max+1 runtime-profile capacity; no automatic Runtime Actor snapshots |
| Gameplay authoring | Bounded typed tables create/edit/remove every 1.9.0 core record family; explicit Scene/World/Room placement; UI-authored Room variable and binding survive World leave/re-entry while transient state reconstructs |
| Generated Gameplay Core | Actual emitted 6502 in single-room and World paths; reachable destination-World/Room actors link and execute; unreachable actors remain diagnosed authoring data; 12/13 actor boundary including compatibility Player; disabled Behavior is inert and re-enables without record loss; unsigned overlap boundaries on both axes plus screen isolation; profile executes equivalent canonical semantics or rejects before ROM generation; all five templates execute their declared contracts; no missed opcodes |
| Audio compiler | Detached order/pattern/instrument/SFX plan; timers, envelopes and sound-event resolution; explicit effect/DPCM/custom-ASM/capacity failures |
| Generated audio | Bundled-emulator APU writes in viewer, single-room and World ROMs; pulse/triangle/noise; tempo/speed, duty/volume/arpeggio; frame-entry SFX and channel restore; no missed opcodes |
| Audio Studio/import | Runtime/SFX handlers, undo/reopen; MIDI timing/pitch/velocity/program mapping; MusicXML timing/pitch mapping; preserved SFX indices; explicit polyphony/format limits |
| Retained World | All 47 World Runtime cases, layout-4 reopening, schema-10/11/12 record checks and actual frozen-1.6.7 rejection |
| Dispatch and limits | BuildGraph/RuntimeCompiler own all modes, `audio-link` and `gameplay-core-link`; one published artifact; failed build cannot run stale output; legacy phase/output behavior retained when new runtimes are off |
| Downgrade/legacy | Actual frozen-1.8 atomic schema-12 rejection; declared retained-Player compatibility binding behavior; all five legacy whole-ROM oracles byte-identical when Gameplay Core is unused |
| ROM recovery | Single-room GP16/layout-3 explicitly reports partial restoration and retains original bytes; native JSON/ZIP retains complete source; World WG17 remains lossless; corrupt input rejection remains atomic |
| Package | Full required run on one unchanged candidate; fresh extraction; source check and runner reproduce measured result |

## Reproduction

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

Node.js 20+ and Python 3 are verification tools; standalone editor use requires neither. Include runnable suites, fixtures, frozen baselines, per-suite reports/logs and exact measured environment in the package.

## Acceptance boundaries

The complete-app VM verifies program/handler behavior. Whole-ROM comparisons verify bytes. Bundled-emulator execution verifies generated 6502/APU behavior under that emulator. None proves browser layout, native pickers, audible speaker output, timing on independent hardware or import interaction through an actual file picker.

Carry forward the unverified browser actions in `docs/BROWSER_QA.md` and include Gameplay Core tables/templates plus existing Audio controls, import pickers and audible output. Record a pass only after actual permitted interaction. Stop at the 1.9.0 candidate for independent audit. 1.9.1, 1.9.2 and later milestones require separate authorization and release-policy additions.

When the 2.0–2.4 raster work is authorized, appropriate evidence may include rendered-frame comparison, PPU-write traces, mapper-write traces and timing/scanline comparison. Those future requirements do not add implementation or test obligations to 1.8 or 1.9.
