# Native Resource Import checkpoint

The native investigation now connects to editable Forge assets. A selected room's initial art, palettes and complete paged layout plus selected poses or a supported Ninja clip can be previewed, appended to the current project in one Undo step, downloaded as a self-contained resource bundle, or opened as a standalone Forge project. Bundle import does not require the original ROM. [User guide](../../app/docs/NATIVE_RESOURCE_IMPORT.md).

The first imported page joins the existing Scene Build Set and supplies sprite art; other pages initially stay excluded. Existing ROM limits and gameplay/world settings remain. Native collision responses, physics, AI, quest state, source integration, transitions and audio event bindings are not inferred. Zelda display poses stay untimed. Original content origins are recorded while art is adapted to Y=0.

## Partial resources and a corrected sprite-table binding

The shared animation stream does not identify its sprite table. Native throwing-star/windmill callers select scripts 13/14, and original `draw_thrown_pic` uses player shapes/attributes. The previous preview's enemy-table choice for these clips was corrected. The new native probe runs that original routine for all four frames and compares its pointers and OAM output. Other imported native poses are checked for exact pixels, piece order, offsets, palettes and flips.

Of 83 nonempty Ninja streams, 80 have a supported editable adaptation. Selectors 15/16 have unresolved sprite-table context. Selector 89 (`action_59`) references native pose entries 135/138 with shape and attribute pointers `$FFFF`. These three entries remain visible as partial, with playback/import unavailable and raw frame/source evidence exportable. Script 89's runtime reachability remains unresolved. No placeholder art or blank frames were invented. [Bounded source investigation](Partial_Script_Investigation.json).

## Measured evidence

Completed: **112 suites / 2,010 cases**, retaining all 110 prior suites / 1,989 cases. **30 browser checks** pass. All **609 available native scene views / 111,935,488 background pixels**, **202 Ninja poses**, **30 untimed Zelda poses** and **80 supported Ninja clips** passed adaptation checks. Three Ninja streams remain explicitly partial.

All current claims require matching app hashes in [CANDIDATE.json](../../CANDIDATE.json), the immutable [full gate](../../app/test-results/candidate/Summary.json), [browser workflow checks](Browser_Verification.json), [retained native browser checks](browser/Report.json), [native adaptation checks](ROM_Verification.json), [projectile binding proof](Projectile_Binding_Verification.json) and [production preservation](Production_Preservation.json).

The previous complete review kit remains at its original checkpoint and does not contain this importer. Use this branch's standalone HTML for the new workflow. No commercial ROM or reusable extracted commercial asset bundle is committed. Browser captures show the tested UI; they are not an asset library.

## Reproduce

Run `node app/tests/run_candidate.cjs` with Node 22 and `FORGE_TEST_WORKERS=1`. The gate retains the previous 110 suites / 1,989 cases and appends resource-import and preservation cases. It reconstructs the exact prior application and 295 protected test/suite files; earlier preservation boundaries remain.

The final gate adds 21 cases (19 asset cases plus two preservation checks) for 112 suites / 2,010 cases. Set `NES_FORGE_ROM_DIR` to the private-input folder, then run `node reviews/native-game-import-1/verify-roms.cjs`, `verify-projectiles.cjs`, `investigate-partial-script.cjs`, `verify-browser.cjs` and `verify-retained-game-browser.cjs`. Browser scripts use the installed Playwright package and `FORGE_CHROMIUM` when supplied. No private input is downloaded by these scripts.

`Initial_ROM_Verification.json` preserves the first verifier's incorrect assumption that every nonempty stream was importable; the app correctly refused missing poses. `Initial_Refusal_Assertion.json` records a subsequent cross-realm array assertion error in the verifier, fixed without changing application behavior. An intermediate private run was superseded after the original projectile reader exposed the table-binding correction. Current reports identify the final tested app and enumerate explicit refusal cases.

Headless Linux Chromium and shared CPU-instruction checks do not establish physical Windows/mobile, listening, hardware timing or complete game recovery. Historical audio/oracle/example acceptance remains labeled with its original checkpoint.

The first complete run stopped at an existing two-second VM limit in `project166`; the affected suite passed in isolation and in the single-worker run. That second run then caught the stale parent app hash in a retained example receipt. All 58 example outputs were independently regenerated; 52 outputs remain exact and six identity receipts were refreshed before the next complete run. Failed attempts remain recorded separately.

Final full acceptance completed with Node 22.23.3 and one worker, after refreshing the six example identity receipts. Tests, per-case time limits and the candidate HTML remained unchanged throughout that final complete run. The two earlier failed full-run records are retained in `initial-full-gate/` and `second-full-gate/`; they are not counted as passing runs.
