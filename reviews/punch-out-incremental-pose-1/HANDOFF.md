# Glass Joe idle and explicit incremental pose positions

This development checkpoint extends the accepted main alpha on a separate feature branch. It adds five native incremental position views and a grouped idle edit. Punch-Out recovery remains partial.

## User workflow

Open a supported US PRG0/PRG1 source or saved native project. Choose **Recovered content → Native pose positions · Glass Joe → Glass Joe · incremental $C0 · idle → Edit native Glass Joe pose position**. The existing Metasprites editor opens an ordinary frame and source-art Scene. Check **Keep idle poses together**, change X=-14 to -12 and Apply. From an untouched source this changes only file offsets 490, 497 and 504, moving `$C0/$C2/$C4` two pixels right while keeping their native bob and timing. Opening the first view is an earlier transaction; group creation plus movement is one Undo step.

The picker retains all 30 full poses and adds `$84`, `$C0`, `$C2`, `$C4`, `$C6`. Uncheck the group option for individual edits. Save/reopen, Build & Run or export/reimport through the existing native owner. Each record affects all native paths using that physical record, not just the displayed source context. The source anchor/status is observational evidence, not a second live state owner.

Section 17 of `app/docs/projects/PUNCH_OUT.md` covers the full tutorial, exact flag/X/Y offsets, a three-byte external hex example, asset relationships and direct HTML/modular-code workflows. The offline handbook and common developer guide include the method.

## Native format and ownership

Five verified pairs at file offsets 479, 490, 497, 504 and 511 follow an explicit-position flag `$01`. `PunchOutStates` runs the declared source path with preceding full pose/OAM; the codec uses the actual observed moving anchor. Position-less selectors such as `$80/$82/$C8/$CA/$CC` are not invented as independently writable positions. Full-pose pointer/record identities are unchanged.

The `$C0` family calls original routine `$D043`, which derives background priority from raw OAM Y >= `$50`. Moving vertically can change which pieces appear behind ring graphics. The codec derives the same canonical `behind` flag; manual flag edits still refuse. Source attribute streams, the position flag, shared geometry, pointers and that code remain protected. Other attribute handling retains its earlier rule. Source execution checks include 15 observed priority consequences per revision rather than assuming all rendered flags stay constant after a Y edit.

The existing native pose encoder owns two bytes per opened view. Derivative recognition adds exactly ten bytes to the earlier 60 full-pose operands, with revised protected hashes for both revisions; generic literal-brush permissions do not expand. Dedicated art/palette and arena encoders keep disjoint ownership. The project/source schema and core native-resource owner remain unchanged.

Incremental Scenes use `captureMeta.punchOutIncrementalPose`; full views retain `punchOutPose` and their IDs. `moveIdle` changes three canonical Metasprites and adds missing derived views in one detached project, then validates the actual output. ProjectStore/history owns the UI commit, rollback, save/reopen and Undo/Redo. AssetRegistry sees ordinary assets. No hidden placement recipe, new native animation store or second emulator is added.

## Source and evidence

Application: `3cf862ba5210fabe972f1d5c3f7eda32a0e6f7db08b718d35b829de00fb273fc`, 3,007,415 bytes. Root `nes-forge.html` equals `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

Base: accepted public main `6d07f1875074f1b3388cd647ff6177423d45acc7`, restored local source `a6714d1`, application SHA-256 `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322`. Of 184 predecessor application inputs, 180 are byte-identical; four pose/profile inputs change. All five supplied workstation modules and the existing emulator/startup fix remain unchanged. Source order and project schemas are retained. No new GitHub push is part of this checkpoint.

- `Incremental_Verification.json`: both revisions, all 30 full and five new no-op/movement checks, 1,712 observed native update comparisons per revision, 240 source idle updates, computed-priority consequences, actual UI/native lifecycle, atomic group refusal, one Undo/Redo, save/reopen, reimport, full-pose/art/palette/arena composition, protected flags/pointers/code, unsupported-work preservation/refusal and earlier-reader preservation/refusal. Audio: 84 entries.
- `Compatibility_Verification.json`: actual accepted-main application produces a full-pose/art/palette/arena project and output; this application reopens/rebuilds it identically and recognizes/rebuilds the earlier derivative, on both revisions.
- `Incremental_DOM_Verification.json`: full parsed HTML with real click/input controls, 35 choices, grouped idle operation, derived-priority preview, history, save/reopen and invalid-group rollback.
- `Idle_Playback_Verification.json`: actual exported/reimported output, original opening/punch/dodge with real input and **no RAM seeds**, all three idle selectors, 153 matching live idle frames per revision with OAM X+2 and changed video hashes. Native anchor, Mac/opponent state, selector path and final health match baseline; Audio registers are active.
- `Startup_DOM_Verification.json`: ten retained startup, appearance/density, Resources, Connected Workspace and related controls.
- `Full_Pose_Regression.json` and `Full_Pose_DOM_Regression.json`: the retained full-pose owner/UI/compatibility assertions on this exact build, with the original thirty choices checked separately from the five additions. Historical report files retain their prior recorded hashes.
- `gate/Summary.json`: 104/104 available public checks across nine suites and synthetic codec exercise. This is not the absent historical complete release gate.
- `Source_Preservation.json`, `Documentation_Verification.json`, `Package_Verification.json`: exact source identities, offline documentation checks and package integrity.

## Reproduction

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
node reviews/punch-out-incremental-pose-1/verify_incremental.cjs /path/to/private-roms /path/to/previous-full-pose.html
node reviews/punch-out-incremental-pose-1/verify_compatibility.cjs /path/to/private-roms /path/to/previous-full-pose.html
NODE_PATH=/path/to/node_modules node reviews/punch-out-incremental-pose-1/verify_incremental_dom.cjs /path/to/private-roms
node reviews/punch-out-incremental-pose-1/verify_idle_playback.cjs /path/to/private-roms
NODE_PATH=/path/to/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html /tmp/startup.json
python3 reviews/punch-out-incremental-pose-1/run_checks.py
```

Use jsdom 30.1.3. The kit supplies the previous code-only application, source manifest and input digests under `Baseline/`, allowing source-input comparison without Git history. Supply ROMs locally. Parsed-DOM canvas/timers are stubbed; live playback uses Forge's approximate MMC2 implementation. No fresh browser layout/listening, controllers, independent-emulator or hardware acceptance is claimed. No ROM, private commercial project, emulator snapshot, game frame or Audio payload is included.

Individual geometry, position-less record writing, other opponents, native animation/control-flow/timing, AI/damage/collision and Audio writing remain open. Source state paths are bounded observations, not exhaustive full-fight recovery. The next sprite-layout work must retain pointer sharing and source context rather than treating a reference pose copy as a native encoder.
