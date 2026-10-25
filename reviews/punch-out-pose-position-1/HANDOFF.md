# Native Glass Joe full-pose positions

This checkpoint continues Punch-Out with the first bounded native opponent-pose writer. It retains the corrected Retro Workstation startup and the existing arena, physical CHR, fight-palette, Audio inspection and native replay workflows. It does not complete Punch-Out recovery.

## Workflow and scope

Open a supported US PRG0/PRG1 original or saved native project. Choose **Recovered content → Native pose positions · Glass Joe**, select one of 30 full poses and **Edit native Glass Joe pose position**. The existing Metasprites editor opens the dedicated frame. Change signed **Native X / Y** and **Apply native pose position**, then Undo/Redo, save/reopen and Build & Run or download/reimport.

The writer owns the first two bytes of each opened full-pose record. Values are signed -128 through 127, relative to the original moving opponent anchor. For pose $00, X=-16/Y=-96 are the original offsets; X=-14 moves the visual pose two pixels right. Source clipping/context checks can refuse an otherwise signed-byte-valid position. Full-pose records and incremental/delta-pose records are separate: changing a full pose does not rewrite an active idle animation's delta records. Test the selected pose's actual intro/fight context.

This changes visual placement. Original attack/damage/collision, movement logic and animation timing remain in their original code. Large visual shifts can misalign art and hit regions. Individual piece geometry, tiles/flags/order, delta poses, other opponents, complete fight coverage and native Audio writing remain separate work. Physical CHR/color writing remains available through its dedicated owner.

## Architecture and source development

- `re/punch-out-pose.js`: pure full-pose pointer/position codec. It maps uniform canonical displacement minus the frame origin to native X/Y, preserves shared pointers/streams and uses the original CPU shape reader to validate candidate OAM.
- `services/punch-out-pose-project.js`: dedicated ordinary Scene/Metasprite views, source receipts and exclusive two-byte spans. Existing snapshots retain their original meaning. ProjectStore/history owns lifecycle; NativeResourceProject owns build/signature validation.
- `re/punch-out-pose-ui.js`: explicit pose choice and position controls. Every accepted user edit is one ordinary guarded project transaction. No hidden placement store or new live emulator exists.

Two existing application modules change. `native-punch-out-resources.js` admits a derivative fingerprint covering exactly 60 position operand bytes in addition to preceding verified ranges; it does not make those bytes generic brush permissions. `native-resource-project.js` adds an optional registered `metaspriteViews` baseline projection and uses the existing exclusive span checks for encoding. Every non-owned field remains signed; the pose encoder separately refuses nonuniform/structural/art/flag edits. With no dedicated pose view, previous projection/output behavior is unchanged. Pointer/code bytes remain protected. Project schemas and native descriptor keys are unchanged.

The source-art Scene snapshots current encoded artwork when first opened. Its copied pixels are not a second CHR writer. Native pose changes, physical CHR/palette edits and arena compression compose through disjoint spans. Previous readers preserve the edited canonical frame and refuse native building when they do not have this pose encoder.

Section 16 of `app/docs/projects/PUNCH_OUT.md` gives full steps, independent RE/hex offsets and direct HTML/source modification instructions. The common developer guide adds the native metasprite connection map. `app/docs/PROJECT_HANDBOOK.html` embeds both lessons.

## Evidence

Current application SHA-256: `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322` (2,998,472 bytes).

- `Pose_Verification.json`: both revisions, all 30 original-loader no-op/movement checks, actual owner/UI lifecycle, exact changed operands, source preservation, Undo/Redo, save/reopen, derivative reimport, protected pointer rejection, unsupported-work preservation/refusal, art/palette/arena composition, safe prior-reader refusal and 84 Audio entries.
- `Pose_DOM_Verification.json`: full parsed HTML with actual click/input controls, mounted native pose/composer UI, build dispatch, Undo/Redo, save/reopen and invalid input refusal. The test's TextEncoder returns the browser realm's typed array; a Node array must not masquerade as browser byte input.
- `Pose_Playback_Verification.json`: exported bytes reimported and executed through the original opening/punch/dodge paths, with controller input and no RAM seeds. Matching original/edited frames compare live OAM translation, video hashes and unchanged native anchor/state/health paths. The edited full pose can be used during the intro rather than the later delta-based idle animation.
- `Startup_DOM_Verification.json`: retained strict startup/workstation controls on this application hash.
- `gate/Summary.json`: the available 104 public checks and synthetic tutorial exercise on the current app; not the missing historical full release gate.
- `Source_Preservation.json`: two changed preceding application inputs, three additions, original order and five supplied workstation modules retained.

Parsed DOM/canvas stubs do not certify browser layout, pointer geometry, listening, controllers or hardware. Original-engine playback runs on Forge's existing approximate MMC2 implementation; runtime Scene capture remains unsupported. No new real-browser/device/external-emulator acceptance is claimed.

## Reproduce

```bash
python3 app/tools/bundle.py --check
node reviews/punch-out-pose-position-1/verify_pose.cjs /path/to/private-roms /path/to/previous-startup-fixed.html
node reviews/punch-out-pose-position-1/verify_pose_playback.cjs /path/to/private-roms
npm install --prefix /tmp/nes-forge-dom-tests --no-save --ignore-scripts jsdom@30.1.3
NODE_PATH=/tmp/nes-forge-dom-tests/node_modules node reviews/punch-out-pose-position-1/verify_pose_dom.cjs /path/to/private-roms
NODE_PATH=/tmp/nes-forge-dom-tests/node_modules node app/tests/workstation-startup-dom.cjs
python3 reviews/punch-out-pose-position-1/run_checks.py
```

The prior startup-fixed app is available in the kit's `Baseline` directory. Private ROMs must be supplied locally. The kit contains code, tutorials and evidence only, with no ROMs, private source-bearing projects, emulator snapshots, game frames or Audio payloads. No new public Git push is part of this checkpoint.
