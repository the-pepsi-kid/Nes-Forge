# NES Forge 1.6.7 handoff

## Scope and authority

This is the **Architecture Convergence** milestone. 1.6.6 Visual Workspace remains the frozen behavioral reference. The user authorized ProjectStore lifecycle/serialization, BuildGraph/RuntimeCompiler active dispatch, current docs/status, removal of production examples, blank startup and deliberate compatibility handling. Read `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `ROADMAP.md` before changing anything.

**No autonomous scope expansion. Stop after delivering the 1.6.7 candidate. Do not begin 1.7 without new explicit user authorization.** No new gameplay, World/Audio runtime, mapper target, RE functionality or Live Edit belongs in this milestone. The existing Player/Target runtime is a bounded proof of concept.

## Candidate and development entrypoints

- User application: `mainline/NES_Forge_1.6.7_Architecture_Convergence.html`; standalone HTML remains the deliverable.
- Source: ordered `source-manifest.json` entries under `src/`; `python3 tools/bundle.py` produces the application and `--check` verifies it.
- Tests: `node tests/run_all.cjs`; retain all baseline suites and fixtures. Never inject missing source or use an older HTML to make candidate tests pass.
- Reference bytes: frozen 1.6.6 HTML and `tests/fixtures/golden167/manifest.json` with five ROM cases. The complete frozen release ZIP under `baseline/` preserves original runnable tests, source tools and the separate RE branch; extract it separately for original reproduction. Historical `work/` is not a current source route.
- Scout stays an ordinary external example/test fixture; there is no production Scout starter workflow.

## Critical decisions to preserve

1. Saves use project schema **9**, decided before implementation because unresolved-reference preservation is unsafe under v8 in actual 1.6.6. Keep the actual-baseline downgrade rejection test. Do not relabel output as v8 or offer silent lossy downgrade.
2. Cold startup is blank viewer mode unless recovery exists. New Project keeps its distinct blank single-room configuration. Recovery retains the existing banner, not a wizard.
3. Full-project opening clears history; New Project/Open Forge ROM are undoable replacements. Preserve this distinction and ordinary undo behavior. Save As remains protected.
4. ProjectStore owns lifecycle/serialization; BuildGraph and RuntimeCompiler own current dispatch and phase order; ReleaseInfo owns active current docs. AssetRegistry is lookup/validation only; EmulatorBridge is a thin façade; LiveLink is inactive and side-effect-free.
5. Emulator, capture, Save As, CHR rendering, undo engine, editor rendering and append-ROM reconstruction must not be rewritten merely for source tidiness. Protected historical wrappers may remain inert. Measure active routing and exactly-once effects.
6. ROM formats stay layout/NFORGE15 v3, NFEX payload v1, MT16 v1, WR16 v3, MS16 v2 and GP16 v1. JSON/ZIP remain full authoring backups; do not advertise ROM as a universal lossless project container.

## Measured evidence

The independent frozen 1.6.6 audit measured **479/479 cases in 17 suites**. That is not a 1.6.7 total.

| Checkpoint | Measured evidence |
| --- | --- |
| Source extraction | Exact frozen bytes; 479/479 inherited checks and separate golden/downgrade 7/7; `checkpoints/01-source-extraction/` |
| ProjectStore | HTML `e58566195ff5f997025f638e76af122987047b0e68622dc4d3046960bf574a46`; 479/479 inherited, ProjectStore 21/21, lifecycle 26/26 and golden/downgrade 7/7; `checkpoints/02-project-store/` |
| Build convergence | HTML `41babd1f2e317cf21c0777884175a31e175e78fd61c10621c4e9edbf7d09a6d5`; full strict runner **559/559 across 23 suites**, exit 0; `checkpoints/03-build-convergence/` |
| Final strict run/package | Final HTML `4fbe63a0676b903850e72004dba2ea66ae18df7f45bb366ca2688b63a8346b07`; **559/559 across 23 suites from a clean extraction; 0 failed, 0 skipped; exit 0**. The final change removes three obsolete startup version toasts only. Final report: `test-results/candidate/Summary.json`. |

Update remaining final fields in `CURRENT_BASELINE.md` only from measured evidence. Do not sum staged results into a final release total. `docs/CONVERGENCE_REPORT.md` records active ownership and retained boundaries. New/Open Forge ROM still use the existing factory/replacement/undo boundary in `src/legacy/26-project166.js`, now delegating serialization/loading to ProjectStore. The build service still calls synchronous codecs/assembler with existing global reads; it is not a pure or incremental compiler.

Five pinned golden cases cover packed viewer, packed custom ASM, unpacked custom ASM, reordered world/assets and the existing single-room runtime. Preserve full bytes and phase order; do not mask changes. Source-extraction, ProjectStore and build stages each require applicable frozen tests before continuing.

Actual browser opening of the standalone file was rejected by cloud security policy. **Blank startup, recovery banner, Save/Save As, project opening, Build & Run, Run Original and runtime capture remain unverified in a real browser here.** No workaround was used. Harness and source checks must remain separately labeled.

## Delivered release

- Final candidate HTML is identified by hash and reproducibly bundled from included sources.
- Required inherited/convergence suites and all fixtures are included; candidate runner reports its measured pass/fail/skip total.
- A clean extraction reproduces that result and the source check.
- Intentional behavior changes, retained legacy adapters and unverified browser acceptance are documented.
- Permanent governance docs and ordinary editable examples accompany the standalone HTML.
- Stop. 1.7 World Runtime is the next intended direction, not an automatically authorized task.

Final package assembly adds measured reports and finalized documentation to the clean-tested payload. The packager verifies the HTML, source bundle, every runner input and per-suite report hash. Clean-run evidence is in `checkpoints/04-clean-extraction/`; the runnable reports are in `test-results/candidate/`.
