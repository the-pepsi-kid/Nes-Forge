# NES Forge 1.6.7 — Architecture Convergence

Open `mainline/NES_Forge_1.6.7_Architecture_Convergence.html` in a browser. It is a standalone editor; no server, package installation or development tools are needed to use it.

This release preserves the existing editor and generated runtime while consolidating project lifecycle/serialization, build planning/dispatch and current documentation. It introduces no new gameplay, World/Audio runtime, mapper target, reverse-engineering functionality or Live Edit. 1.6.6 remains the frozen behavioral reference.

## Start and author

Fresh startup is blank: one empty viewer scene with blank graphics. An available recovery uses the existing Restore/Dismiss banner. Recovery checking and pending decisions protect the previous recovery data from autosave.

Use the existing CHR SHEET, SCENE, COLLISION, METASPRITES, ANIM and ENTITY STUDIO tabs. **New Project** creates the established blank single-room project through the normal editor; Undo can restore the previous workspace. Gameplay settings remain in the SCENE sidebar. There is no embedded Scout starter, wizard or popup workflow.

To inspect an existing example:

1. Choose **Open Project** and load `examples/Scout_Authored_in_Editor_1.6.6.nesforge.json`.
2. Inspect/change pixels, room tiles, collision, poses, animation frames/contact boxes and entity bindings in their ordinary tabs.
3. Use **Build & Run**. Arrows move, **Z** jumps, **X** attacks and **Enter** restarts in this example.

Build & Run always builds the currently open project; the example is not automatically loaded. Scout is an external editable example and bounded proof of concept. Its reference values are in `docs/SCOUT_REFERENCE.md`.

## Save and reopen

Use the existing Save and Save Project As/Export controls for project backups. Project JSON and portable ZIP retain full authoring data. **Build .NES ROM** produces the current generated ROM. **Open Forge ROM** performs a checked, clean project replacement for supported Forge playable ROMs, retains the original bytes and provides Undo. **Import ROM** keeps its separate append/capture behavior. **Run Original** uses the retained original ROM; Build & Run uses the current project build.

New saves use **project schema 9**. Supported older projects, including v8 examples, can be opened. Unresolved authored references are preserved for repair and rejected at build rather than silently erased on load. The actual frozen 1.6.6 editor rejects schema 9. Downgrade to schema 8 is unsupported; keep older source backups if needed. Do not manually lower a schema number. ROM formats remain unchanged; see `docs/FORMATS.md`.

The existing runtime supports the viewer/custom assembler paths and one fixed 256×240 Player/optional Target room. Authored worlds, camera information, tracker data and other entities remain persistent where they are not executed by that runtime. Other supported ROMs retain existing playback, capture and inspection; general reconstruction of original game logic is not claimed. The historical experimental RE branch stays separate inside the frozen 1.6.6 release archive.

## Verify the supplied release

With Node.js 20+ and Python 3, run these from the extracted release directory. No dependency installation or network access is needed:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

**Measured candidate result: 559/559 across 23 suites, reproduced from a clean extraction.** The runner reports its own result and writes `test-results/candidate/Summary.json` with the tested HTML hash. `CURRENT_BASELINE.md` identifies frozen, staged and final evidence separately. Do not reuse the historical 479/479 baseline count as the candidate result. `TEST_POLICY.md` and `tests/README.md` explain the evidence and retained regression coverage.

Real-browser acceptance remains **unverified** for blank startup, recovery banner, Save, Save As, project opening, Build & Run, Run Original and runtime capture. Cloud Browser URL security policy rejected standalone-file navigation. The complete-app VM, source guards and real bundled-emulator checks are separate evidence, not a manual browser pass. See `docs/BROWSER_QA.md`.

## Develop and hand off

Authoritative sources are ordered by `source-manifest.json`. Run `python3 tools/bundle.py` to bundle them into the standalone HTML. The complete frozen 1.6.6 release ZIP under `baseline/` retains its original tests, tools, `work/` scripts and separate RE branch for historical reproduction. Its old assembly scripts do not build the current candidate. Historical code, baselines, fixtures and docs remain reference material.

Read the root `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `ROADMAP.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `HANDOFF.md`. Scope ends with the tested 1.6.7 candidate and handoff. **Do not autonomously expand this milestone or begin 1.7.**
