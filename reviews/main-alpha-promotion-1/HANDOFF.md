# Main alpha promotion

The owner approved preserving the original Pepsi vending machine version, adding `original-pepsi`, and merging the current working alpha into `main` while retaining history. This is an accepted development alpha; it does not complete unfinished title recovery or later roadmap milestones.

## Exact application and source

- Local implementation commit: `a648803f79c3ba194403cecd965bda409b9bc318`.
- Version: `2.0.0-alpha.11`.
- Root entry: `nes-forge.html`; source-owned output: `app/mainline/NES_Forge_2.0.0-alpha.11.html`.
- Both HTML files: 2,998,472 bytes; SHA-256 `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322`.
- All 184 source inputs remain byte-identical to the accepted implementation. Promotion changes entry points, metadata, documentation and review evidence, with no runtime or schema change.
- Existing ProjectStore, AssetRegistry, BuildGraph/RuntimeCompiler and EmulatorBridge/Timeline remain the owners described in the source comments and developer guide.

`tools/sync_main_entry.py` copies the existing bundler output to the root entry; `--check` verifies equality. Always rebuild the modular source first. The root HTML is a distributable copy, not a second source implementation.

## Original artifact and history

The exact former main is `61dee20c4c36886c3fac143c0258d7fac27d5ff7`. It is preserved on `archive/original-pepsi` and `original-pepsi`. The tag has a clearly labeled archival prerelease entry at https://github.com/the-pepsi-kid/Nes-Forge/releases/tag/original-pepsi. Its original root app also remains as `archive/original-pepsi.html`; original main documentation, historical HTML and feedback template are preserved byte-for-byte. `Previous_Main_README.md` retains the earlier entry page. The earlier local checkpoint README is retained at root as `DEVELOPMENT_CHECKPOINTS.md` so its relative links continue working.

The promotion commit joins the previous public main and the published Punch-Out checkpoint history. The source record also identifies the local implementation commit and its ordered local history, since the restored local checkout and published snapshots use distinct Git commit IDs. Merge through a review branch with a merge commit; do not rewrite or force-push main. Previous review branches remain intact.

## Verification and limits

`Public_Checks.json` records a fresh run of the nine available public suites (104/104) and synthetic codec exercise on this exact app. `Startup_DOM_Verification.json` records 10 strict parsed-DOM startup/control checks against the root entry. `Pose_Verification.json`, `Pose_DOM_Verification.json` and `Art_Verification.json` are fresh native lifecycle/control reruns on the same unchanged application. Private inputs are not included.

`Integration_Verification.json` records matching entry bytes, source-input preservation, preserved original-main blobs and local documentation links. `Implementation_History.json` records the restored local implementation history. `Original_Pepsi_Refs.json` records verified branch/tag identities. Public GitHub tag proof is kept separately from the source checkout.

The existing `../punch-out-pose-position-1/Pose_Playback_Verification.json` records original-engine playback on this same app hash: the edited full pose translates during the intro while native state/health paths remain unchanged. This promotion does not repeat that live playback or claim new browser layout, listening, controller, independent-emulator or physical-hardware acceptance. Parsed-DOM checks stub canvas/timers. The historical complete release gate is not available in this restored source snapshot.

Punch-Out remains partial: full-pose X/Y placement, physical CHR/color and arena edits are supported within their documented bounds. Individual geometry, incremental/delta pose writing, native animation, AI/damage/collision and native Audio writers are pending. The complete offline handbook and each title's current methods/limits remain under `app/docs/`.

## Reproduction

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 reviews/punch-out-pose-position-1/run_checks.py
NODE_PATH=/path/to/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html /tmp/nes-forge-startup.json
node reviews/punch-out-pose-position-1/verify_pose.cjs /path/to/private-roms /path/to/previous-startup-fixed.html
NODE_PATH=/path/to/node_modules node reviews/punch-out-pose-position-1/verify_pose_dom.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_art.cjs /path/to/private-roms
```

Use jsdom 30.1.3 for the DOM checks. The optional previous HTML argument to the pose verifier exercises prior-reader preservation/refusal. Native lifecycle verifiers write reports into their original review directories; promotion copies are retained here to distinguish this run.
