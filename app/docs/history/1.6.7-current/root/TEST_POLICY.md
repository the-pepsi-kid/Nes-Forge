# Test and release policy

## Evidence rules

The frozen 1.6.6 measured result is **479/479 across 17 suites**. The 1.6.7 number must come from its own required runner. Publish pass/fail/skip counts, suite/case names, exit status and candidate HTML hash. A skipped required suite is a failure. Do not count the historical unsupported 344 claim, reuse a baseline total, or combine unrelated runs into a single passing claim.

Keep every existing runnable regression suite and fixture in the release. Preserve original historical tests against their original baselines. Candidate adaptations must be narrow and documented: version/schema expectations, external fixture setup, requested blank startup and intentional validation/data-preservation changes. Keep the original behavioral assertions. Tests must not inject production layers, silently fall back to an older HTML, or repair a missing artifact under test.

Tests may use the existing VM harness for precise editor/runtime checks, but it is not a real-browser substitute. Source hashes demonstrate byte preservation, whole-ROM comparisons demonstrate output parity, emulator execution demonstrates bounded runtime behavior, and browser acceptance demonstrates actual browser behavior. Label each honestly.

## Mandatory staged gates

| Stage | Required evidence before proceeding |
| --- | --- |
| Freeze/characterize | Exact reference hashes; actual baseline schema rejection/data-loss characterization; five captured ROM oracles; reference tests retained |
| Source extraction | Byte-exact reassembly of 1.6.6; missing/duplicate source failure; applicable frozen suite run; no external runtime dependency |
| ProjectStore convergence | Applicable frozen suites plus lifecycle/schema/atomicity/unresolved-reference tests; no embedded production fixture; recovery/save races fixed at this stage |
| Build convergence | Applicable frozen suites plus golden bytes, explicit phase order, active dispatcher/preflight routing and exactly-once effects; stale-output failure checks |
| Final candidate | All required inherited and convergence suites against one identified unchanged candidate; deterministic rebuild and protected-source guards |
| Package reproduction | Fresh extraction, dependency/fixture presence, bundled source check and the supplied full runner reproduce the candidate result |

If a stage breaks parity, stop accumulating implementation changes and fix that stage. Any allowed behavior change must be explicitly authorized and named in a regression. Do not update golden bytes or protected hashes merely to make a failing implementation pass.

## Permanent convergence coverage

- Actual 1.6.6 rejects schema 9 without mutation; old v8 unresolved-reference loss is characterized; supported migration and current round trip preserve references; unsupported downgrade is explicit.
- Validation occurs before state/history/runtime/save-identity mutation. Duplicate IDs, malformed/future versions and unsupported recognized formats fail atomically.
- Blank startup has no template art, original ROM, history or false save identity. New Project retains its established separate single-room defaults.
- Recovery checking/pending blocks autosave and unload writes. Delayed/error reads and invalid recovery preserve newer work/recovery bytes. Late save completion cannot rename, rebind or mark a changed/replaced project clean.
- ProjectStore is the active serializer/load owner; snapshots are detached after explicit preparation. Direct project load and undoable replacement retain distinct history policies.
- AssetRegistry lookup/validation does not generate IDs or mutate unresolved references. BuildGraph/RuntimeCompiler own the active route and current diagnostics.
- All five whole-ROM oracles remain byte-identical without masks; final CHR follows linking, allocation follows occupied code/vector discovery, and single-room compilation consumes the linked ROM.
- Protected emulator, capture, Save As and CHR source guards remain intact; thin bridge APIs preserve built/original distinction and failed builds cannot run previous output.
- One active current docs renderer, idempotent service access, no duplicate listener/compile effects, and inactive LiveLink without timers/listeners/writes.

## Reproduction and packaging

Use `python3 tools/bundle.py --check` to compare bundled HTML to authoritative source inputs and `node tests/run_all.cjs` for the supplied required regression runner. Node 20+ and Python 3 are the supported tool requirements; record the exact versions actually measured. Production use of the standalone HTML requires neither tool.

Final evidence must be generated from a fresh package extraction, with the same included sources, fixtures and runner available to the recipient. Include the suite manifest, per-suite results/logs, hashes, exact commands and environment. Missing inputs must fail loudly before output is written. Do not substitute a clean run of the development tree for clean-package reproduction.

## Browser acceptance

Attempt actual browser acceptance where the approved environment permits it: cold blank startup; recovery banner restore/dismiss; Save and Save As including cancellation; project opening; Build & Run; Run Original; runtime capture. Record observed outcomes and failures separately from harness results.

Current standalone-file navigation was rejected by cloud security policy. Therefore all listed browser acceptance remains **unverified** here. Do not evade that boundary or claim browser approval from mocks. A later permitted manual pass may update this evidence without granting gameplay/architecture scope expansion.

## Stop condition

Once the candidate is sufficiently verified and package reproduction is complete, deliver the candidate and handoff. **Do not broaden optional testing or autonomously start a later milestone.**
