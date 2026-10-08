# Reproducible regression tests — 1.6.7

From a clean release extraction, run the source check and the complete required runner:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

Requires Python 3 and Node.js 20+ for verification; no npm install, network access, proprietary ROMs or downloaded fixtures are required. `npm test` invokes the same runner. The standalone editor itself needs no development tools.

The runner defaults to `mainline/NES_Forge_1.6.7_Architecture_Convergence.html`, executes required suites against the identified artifact, and writes per-suite reports/logs plus `test-results/candidate/Summary.json`. Missing candidate/source/fixtures must fail; no injection of missing production code or fallback to another release is permitted. The final candidate total is what this runner measures. The historical **479/479** is the frozen 1.6.6 result; it is not automatically the 1.6.7 total. The historical unsupported 344/344 report is not counted.

## Retained behavioral coverage

| Suites | Coverage |
| --- | --- |
| `stabilization/tests/world_codec.test.cjs`, `regression.cjs` | World corruption/compatibility, project/history behavior, metatiles/worlds, assembly/ROM round trips, original defect regressions, emulator and Save As/source guards |
| `metasprites.cjs`, `composer-interactions.cjs` | Composed sprite data, linking/import and ordinary composition controls |
| `model164.cjs`, `frame-editor164.cjs`, `entity-studio164.cjs`, `persistence164.cjs` | Stable IDs, animation/entity data, boxes/events, facing, frame/entity controls and persistence/metadata corruption rejection |
| `compiler165.cjs`, `ui165.cjs`, `persistence165.cjs` | Existing single-room compilation, gameplay settings, GP16/project/ZIP/ROM behavior |
| `gameplay165.cjs`, `engine165.cjs` | Generated 6502 ROM behavior in the real bundled emulator, machine-code timing/bounds and reserved memory |
| `project166.cjs`, `placement166.cjs`, `native-ui166.cjs`, `native-authoring166.cjs` | Project replacement, bound actor placement, existing editor controls and Scout construction from blank via actual handlers |

All 17 inherited suites and fixtures remain supplied. The complete frozen 1.6.6 release ZIP under `../baseline/` preserves the original tests, tools and dependencies: extract it into a separate directory and run its own `node tests/run_all.cjs` to reproduce the historical 479-case result. `historical166/` holds comparison copies of changed files; run the complete archive for original dependency/path semantics. Intentional candidate adaptations cover schema/release identity, external example setup, blank startup and authorized preservation/rejection behavior. `version-expectations.cjs` centralizes schema/release expectations and known missing legacy frame-array defaults. It must not discard authored data to make comparisons pass.

## Convergence coverage

The included 1.6.7 suites cover ProjectStore/lifecycle, service routing and whole-ROM parity. The required runner is authoritative for the final suite set and measured total; see `../TEST_POLICY.md` for required cases and stage gates.

`fixtures/golden167/manifest.json` pins five complete reference ROMs and input/metadata hashes. `golden-parity167.cjs` verifies those bytes without masks and tests schema 9 rejection against the actual frozen 1.6.6 HTML. Expected bytes must not be regenerated to conceal a candidate regression. `fixtures/scout166.json` is external test material; production must not embed it.

The extraction checkpoint separately passed the inherited **479/479** and golden/downgrade **7/7**, with the reconstructed HTML exactly matching the frozen 1.6.6 hash. Evidence is in `../checkpoints/01-source-extraction/`. Later stages and final clean-extraction results are recorded separately in `../CURRENT_BASELINE.md`.

An individual suite can be run against the explicit candidate:

```sh
node tests/regression.cjs mainline/NES_Forge_1.6.7_Architecture_Convergence.html
node tests/golden-parity167.cjs mainline/NES_Forge_1.6.7_Architecture_Convergence.html
```

Where supported, `FORGE_TEST_REPORT` or the positional report argument writes a machine-readable report; the aggregate runner supplies the applicable convention. Run the full runner for a release claim rather than adding unrelated partial runs together.

## Evidence limitations

`harness.cjs` evaluates the complete inline application in a Node VM with a lightweight mock DOM, controlled canvas and inactive timers. Some checks record actual drawing calls; generated-gameplay tests run actual 6502 machine code in the bundled emulator, not a JavaScript physics approximation. Controlled asynchronous storage tests verify lifecycle races independently of real browser scheduling.

`preserved-source.json` pins exact emulator/capture/Save As/CHR source. Hash equality proves retention, not comprehensive historical correctness. Real emulator execution does not establish independent NES hardware accuracy. The original 1.6.2 baseline countercheck has known failures and remains historical evidence, not an expected all-green candidate run.

All eight requested real-browser acceptance actions remain **unverified**: blank startup, recovery banner, Save, Save As, project opening, Build & Run, Run Original and runtime capture. Supported Cloud Browser URL navigation rejected the standalone file; no workaround was used. VM checks cannot substitute for browser layout, pointer/focus, native dialogs or actual IndexedDB acceptance. See `../docs/BROWSER_QA.md`.

Preserve this distinction and stop at the 1.6.7 candidate/handoff. Tests do not authorize scope expansion or later milestones.
