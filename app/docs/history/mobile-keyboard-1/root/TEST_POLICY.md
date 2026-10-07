# Test and release policy — 2.0.0-alpha.4 / mobile-keyboard-1

Retain all 940 alpha.2 cases across 43 suites and add `mobile-keyboard200`, for 44 mandatory suites. D055 supersedes alpha.3's 18 separate-form cases because the owner rejected that interface; keep their original evidence with the withdrawn artifact. Do not count alpha.3 as the behavioral base or silently omit any alpha.2 case. Actual totals belong to the measured candidate Summary, not a planned or lost intermediate run.

Freeze source, docs, examples and tests before running the complete gate from a verified clean extraction. Preserve every historical oracle; reverse only the exact declared keyboard/release delta to alpha.2 before applying the existing older source guards. Runtime tests execute the actual candidate HTML.

Require real registered input/beforeinput/composition event paths, including Android-style unidentified key events, text-event deletion, canonical data/undo/save/reopen, desktop shortcuts, tap-versus-scroll/multitouch handling, IME cancellation and cross-tab/input isolation. Multiword text, paste and autofill are not an alternate note importer. Browser automation and physical phone keyboard/layout acceptance remain separate. Three fresh browser runners must report measured checks or a blocked launch with zero checks. Final packaging verifies report hashes, exact provenance and `checkpoints/mobile-keyboard-1-clean-extraction/Reproduction.json`.

## Preserved prior policy history

# Test policy — 2.0.0-alpha.2 Mobile Playback

The mandatory gate is 43 suites: all 42 predecessor suites / 921 cases, unchanged in count, plus independently measured mobile-playback200 cases. No skipped cases, filters, injected missing modules or stale reports. Measured totals belong to test-results/candidate/Summary.json. Exact source guards reverse only the declared mobile delta and then the previous declared audio delta to the pinned historical oracles; old hashes are not regenerated.

Run on one freshly extracted staging package. Freeze sources, docs, examples and tests before the gate. Final packaging checks all provenance, each report hash, the current HTML and a clean-extraction record. Three fresh browser runners must report passed checks or a blocked launch with zero checks. CPU/APU/PPU, raster capture, CHR-RAM/bank changes, rewind, save/load, desktop input and generated-ROM behavior remain preservation requirements.

Mobile performance and listening are separately measured on the actual device. The owner's Cricket Dream 5G / Chrome is a review target, not a certified supported-device result. Use docs/MOBILE_PLAYBACK_CHECKLIST.txt and record old/new same-ROM observations. A lower operation count or synthetic 60 FPS does not establish phone performance.

## Preserved policy history

# Test and release policy — 2.0.0-alpha.1 / audio-correction-1

## Current mandatory gate

Run `python3 tools/bundle.py --check`, then `node tests/run_candidate.cjs` on a fresh extraction of an explicit staging archive. The gate contains all 41 retained suites and 895 measured cases, plus `audio-correction200`. Every case must pass, with no filtering, skipped suites, injected modules or substituted application. The report records actual totals and full input provenance.

Create a staging archive with `python3 tools/package_release.py --stage --output /absolute/path/audio-correction-staging.zip`. Verify every SHA256SUMS.txt payload after extraction, run the full gate in that extracted tree, and record matching candidate/HTML/summary identities and counts in `checkpoints/audio-correction-1-clean-extraction/Reproduction.json`. Final packaging requires those reports plus fresh browser records tied to the same HTML. Do not change provenance inputs after the full run.

Source-preservation adaptations reverse only the exact declared four-file delta (audio compiler/engine, title and ReleaseInfo) before checking historical hashes. The new runtime tests verify changed behavior independently. Historical golden bytes remain fixed. Release/foundation metadata expectations change to 2.0.0-alpha.1; the schema remains 12.

Browser launch failure is blocked and must report zero executed checks. VM/APU evidence is not a claim of audible browser output, physical controller compatibility, mobile lag improvement or NES hardware acceptance.

## Preserved policy history

The following rules and dated tranche records remain historical unless superseded by the current mandatory gate above.

## Evidence rules

Every published result must identify the actual candidate HTML hash, exact commands/environment, suite and case counts, failures/skips and exit status. A skipped required suite fails the release gate. Never combine unrelated runs or promote smoke checks to a full acceptance claim.

Frozen results belong to their artifacts: 1.6.6 measured 479/479, 1.6.7 measured 559/559, 1.7 measured 606/606 and 1.8 measured 623/623. Keep those releases, tests, fixtures and five golden ROMs; never regenerate golden bytes or protected hashes to excuse a regression. The 1.9.0 runner measures its own total. The corrected-reference 658/658 across 26 suites belongs only to HTML `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; the prior Mobile Play `mobile-play-1` result was 702/702 across 28 suites for `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`. The subsequent `mobile-play-2` measured 708/708 across 28 suites for `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`. Those results and the re-navigation-1 result are historical; none certifies changed re-runtime-1 bytes. Read the current actual measured report.

The 1.9.0 candidate must be bundled and tested from a fresh extraction. Documentation, tests and examples are provenance inputs; any post-run change requires a new clean run.

For future raster-dependent work, evidence must state whether behavior is merely **Captured**, canonically **Represented**, or **Compilable** by the selected runtime profile. A rendered capture, trace or preserved source envelope cannot be promoted to a compiler-support claim. Preserve the existing conservative refusal to rebuild unsupported raster behavior; a deliberate refusal is not a regression unless an approved profile promises that behavior.

Narrow candidate adaptations may update release/schema expectations, add the `gameplay-core-link` phase and recognize schema-12 World source. Keep prior behavioral assertions and historical reproduction. Tests must not inject missing production functions, substitute an older HTML or rebuild a missing artifact silently.

## September 28 follow-up scope

D046 authorizes an additive local input/presentation adapter, including explicit lifecycle wrappers around existing entry points. Original protected source remains intact. Any necessary preservation-test adaptation must distinguish preserved source from intentional wrappers and retain behavioral guards; never update historical protection hashes or legacy ROM goldens to make the candidate pass.

Keep automated VM, browser automation, physical device/controller and owner acceptance as separate evidence categories. Synthetic Gamepad API data does not prove USB/Bluetooth support; a mobile viewport is not an iPhone or Android acceptance test. A denied/unavailable fullscreen path must remain playable in expanded view.

## September 30 bounded stabilization

D047 authorizes only the presentation follow-up: defer obscured sidebar DOM redraw during expanded Play and flush pending work once on exit; use event/observer canvas fitting with unchanged-size caching and a periodic fallback when ResizeObserver is unavailable. Existing emulator/audio/input, capture, Save As, CHR, schema and ROM contracts remain protected.

Use the identical call-count probe against both exact HTML hashes. Verify canvas uploads are retained, sidebar changes become visible on exit, repeated exits do not duplicate the flush, and native fullscreen/tab/dialog exits restore presentation. Verify the ResizeObserver path, explicit resize/touch-layout events, equal-size caching and no-observer fallback. Operation counts establish work avoided only; they are not FPS, audio latency, speaker or physical-device evidence. Continue the full required run; do not predeclare its case total from planned additions.

## September 30 integrated RE example

D048 authorizes one supported native-ROM recovery/import/edit/build slice in `re-bridge-1`. Preserve the 28 retained suites and add four mandatory suites: `re-bridge-model`, `re-bridge-ui`, `re-bridge-runtime` and `re-report-import`. Their actual JSON/log output belongs under `test-results/candidate/`; no fixed case total is claimed before the run. A new RE smoke pass does not replace the complete gate.

The input fixture must be independently authored 6502 machine code with native graphics, collision and pulse-driver tables and no embedded Forge project JSON. Reproduce its bytes with its supplied builder. Verify the decoder against those native records and execute both the original ROM and rebuilt Forge ROM in the bundled emulator. State what changed: the original has horizontal movement, while the adapted Forge player adds jump/attack animation states. Do not claim equivalent original game logic, code recovery or byte-identical rebuilding.

Recovery must preserve all decoded collision cells, including data variants where the same CHR tile has different per-cell collision. Music tests compare supported pulse timer/duty/volume/row timing, and a changed note must reach the rebuilt APU. Test a collision edit through the canonical authoring representation, CHR edits, native JSON reload, malformed/unknown input rejection, immutable source/evidence, explicit undoable import, and retention of original bytes. No SFX recovery is claimed when the fixture has none.

Inspection-report import tests must prove actionable format errors and unchanged project/history/identity/playback. Browser UI tests must cover the supported Analyze/import/export flow and asynchronous selection guards without being promoted to real file-picker or visual-browser acceptance.

## September 30 emulator-history navigation

D049 authorizes this guarded frame-history slice for loaded-ROM playtesting and RE. Retain all 32 prior suites and add `emulator-timeline`, `emulator-timeline-ui` and `emulator-timeline-runtime`: **35 required suites**, with no predicted case count. The source files are `tests/emulator-timeline.cjs`, `tests/emulator-timeline-ui.cjs` and `tests/emulator-timeline-runtime.cjs`; reports belong under `test-results/candidate/`.

Verify recording off/default behavior; one-frame and 60-frame navigation; complete machine/APU/capture-trace/frame restoration; forward restore without CPU execution; live-edge muted execution with neutral input, including recording off; always-paused completion; and real branch semantics after Run/manual Frame from the past. Prove both 300-state and 32 MiB serialized-data caps, actual retained range, eviction and turning recording off. Exercise ROM/reset/Trace/unload invalidation, cancellation/lifecycle races, input/audio handling and restored capture/readout consistency. Use actual emulator execution for runtime checks; a mocked UI alone cannot establish restoration correctness.

The inherited bridge gate exposed a preservation guard that normalized only the earlier mobile wrappers. Any adapter adjustment must match only the exact intended wrapper shape and leave original protection hashes unchanged. Do not treat that guard correction as permission to bypass emulator preservation or input regressions. All retained suites remain required.

## October 1 integrated runtime investigation

D051 retains all 38 prior suites and adds `re-runtime`, `re-runtime-ui` and `re-runtime-integration`: 41 mandatory suites with measured, unpredicted totals. Keep the prior 846-case behavior floor. Verify tracing off/default preserves machine results; opt-in coverage and events match actual executed instructions/writes; PC/file mappings are justified; unknown mappings remain unknown; lifecycle and history changes invalidate stale evidence; snapshots copy backing RAM without I/O reads; comparisons and watch limits behave correctly; event/coverage/instruction caps stop honestly; exports retain identity and observation masks. Test the real supplied Pepsi ROM for a state change and a sound-producing fixture for APU writes. Prior external scripts and the owner's previous-candidate T1–T6 passes cannot replace these new integrated checks.

Normal observation must not patch ROM/RAM/project state. Only the distinctly labeled trace-from-reset action deliberately resets playback. UI text/selection must not press game controls, and stale hashes must block originating-code navigation. Preserve exact protected-source hashes with narrow instrumentation normalization; do not change goldens to make tests pass. Browser interaction remains separate from model/VM evidence.

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
| Supported native RE | Independent fixture reproduction; recognized engine/header/vectors; exact CHR/palettes/map/collision/music decoding and provenance; unknown/malformed/ambiguous values reject; inspection does not mutate active project |
| RE transfer/UI | Explicit undoable import; real native project JSON export/reload; distinct evidence report; source-byte retention; filename safety and asynchronous selection guards; report-as-project errors atomic |
| RE build/runtime | Original native engine and adapted Forge build execute; decoded wall stops movement; canonical collision and CHR edits affect rebuild; pulse music and edited note reach APU; changed gameplay semantics documented |
| Local input | Keyboard preserved; NES bit order; simultaneous touch directions/buttons; D-pad slide; pointer cancellation/lost capture; standard gamepad mapping and explicit remap; axis dead zone; malformed/unavailable API data; one local controller port; disconnect/reconnect |
| Input lifecycle | No held input after blur, background, tab exit, pause, reset, ROM replacement, mapping dialogs or play-view exit; neutral rearm prevents a held button immediately reactivating after interruption; no uncontrolled automatic resume |
| Presentation stabilization | Same-probe baseline/candidate counts; retained canvas uploads and protected source; one deferred sidebar refresh upon leaving expanded Play; repeated exits inert; observer/events and no-observer fallback; changed and unchanged canvas dimensions |
| Play presentation | Same emulator and ROM state across expanded/fullscreen view; aspect ratio; portrait/landscape fit; safe-area-aware controls; visible pause/sound/exit; fullscreen success/denial/unavailable fallback; return to usable editor; captured pixel dimensions unchanged |
| Timeline state/runtime | Off by default; full machine/APU/capture/frame restoration; restore future without CPU; live-edge muted neutral stepping; Run/manual-step branch truncation; lifecycle invalidation; no project serialization |
| Timeline bounds/UI | 300-state and 32 MiB serialized-history caps; actual retained range/eviction; off clears history; cancellation/race safety; controls usable inline and expanded/fullscreen; no accidental game input |
| Browser and devices | Browser automation report tied to candidate hash; separate physical iPhone Safari and Android Chrome checklist with touch, rotation, speakers, wired and Bluetooth trials; exact device/controller/browser/OS versions |
| Package | Full required run on one unchanged candidate; fresh extraction; source check and runner reproduce measured result |

## Reproduction

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

Node.js 20+ and Python 3 are verification tools; standalone editor use requires neither. Include runnable suites, fixtures, frozen baselines, per-suite reports/logs and exact measured environment in the package.

## Acceptance boundaries

The complete-app VM verifies program/handler behavior. Whole-ROM comparisons verify bytes. Bundled-emulator execution verifies generated 6502/APU behavior under that emulator. None proves browser layout, native pickers, audible speaker output, timing on independent hardware or import interaction through an actual file picker.

Evidence locations are `build-inputs.json`, `test-results/candidate/Summary.json`, the retained bridge/navigation reports and new `re-analysis-model.json`, `re-analysis-ui.json` and `re-analysis-integration.json` records beside it, `test-results/browser-mobile/Report.json`, `test-results/browser-re-analysis/Report.json`, `test-results/browser-re-runtime/Report.json` and `checkpoints/re-runtime-1-clean-extraction/Reproduction.json`. Report only measured outcomes, and label absent or incomplete evidence accordingly.

Carry forward the unverified runtime-investigation browser actions in `docs/RE_RUNTIME_CHECKLIST.txt` and the unverified browser actions in `docs/BROWSER_QA.md` and include Playback tools recording/navigation/cancellation/branching, restored frame capture, the general analysis/search/mapping/notes and separate recovery/import/download workflows, Gameplay Core tables/templates, existing Audio controls, import pickers and audible output. Chromium is missing in the current environment; no browser walkthrough is claimed. Record a pass only after actual permitted interaction. Stop at the 1.9.0 candidate for independent audit. 1.9.1, 1.9.2 and later milestones require separate authorization and release-policy additions.

When the 2.0–2.4 raster work is authorized, appropriate evidence may include rendered-frame comparison, PPU-write traces, mapper-write traces and timing/scanline comparison. Those future requirements do not add implementation or test obligations to 1.8 or 1.9.


The completed September 30 manual PDFs/revised Alpha Review Kit and owner-reported prior tutorial/external-emulator success are documentation and human workflow evidence. They do not replace this candidate's full gate or pending device checks. Future 1.9.3 Audio and finite 2.x RE acceptance must precede hosted/wallet scope; 4.x hardware requires its own evidence policy. Community accessibility testing and private GitHub review workflows are recommended planning work after stabilization; no repository or formal accessibility pass exists in this candidate.


D048 brings the supported native-room bridge forward after the earlier read-only intake; D049 now adds emulator history navigation for playtesting and RE. Its evidence identifies the ROM/hash and native byte spans, separating decoded assets from adapted behavior. Future gameplay/Audio completion and private GitHub setup do not block this example. The owner wants comprehensive RE; broader decoding, instruction/debug analysis and language/toolchain migration require their own implementation and bounded evidence. Frame navigation does not certify those capabilities.

## September 30 engine-independent analysis

D050 requires the complete 35-suite re-navigation-1 floor (788 cases) plus `re-analysis-model`, `re-analysis-ui` and `re-analysis-integration`: 38 mandatory suites with measured, unpredicted new totals. Opening an unfamiliar binary must work with the emulator unloaded and must preserve project bytes, undo/redo state, original ROM, playback/history, generated ROM and editor source. A failed separate recovery request must not clear general inspection.

Verify raw binary intake; unknown engines; unsupported emulator mapper; validated NES ranges and raw fallback; trainer and trailing-byte provenance; bounds and malformed/truncated containers; explicit CPU origin; separate physical banks sharing CPU addresses; relative branches and truncated/unknown instructions under the declared CPU policy; immutable copied input during asynchronous hash; bounded search boundaries/cancel and file-selection races; literal filenames/notes; export through Save As without project mutation. All prior source files retain exact navigation-baseline hashes except the declared candidate string and one recovery-button label. Never regenerate prior golden ROMs or protection hashes.

`tests/browser-re-analysis.cjs` is a separate actual-browser gate with file intake, layout, mapping/disassembly, search/notes/export and project/input isolation checks. `test-results/browser-re-analysis/Report.json` must identify the exact HTML and either measured checks or a launch block with no executed checks. Desktop/mobile viewport checks do not establish physical touch, controllers, audible output or hardware execution.

## October 1 picker regression

The general-analysis picker must override the shell's global hidden-file-input rule. A fake computed style that always reports `block` and programmatic file injection cannot establish visibility. Retain all 38 mandatory suites and the full clean-extraction gate. Add an exact bundled CSS/input regression and real-browser visibility plus click/filechooser coverage; report missing Chromium as blocked with zero executed checks. This correction does not certify native resource recovery or gameplay-aware controls.
