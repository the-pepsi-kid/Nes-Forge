# Glass Joe pose and artwork navigation repair

The owner found the native pose picker only after navigating the source-reference
picker, then saw a blank CHR sheet for the selected incremental-pose Scene. The
sheet had retained BG Bank while that Scene's art lives in Sprite Bank. The
existing physical artwork view has the opposite ownership: its BG buffer is the
ROM pixel writer, so inheriting Sprite Bank also made that view appear empty.

## Delivered behavior

- Recovered content opens the native pose picker expanded, above the tall source
  reference preview. The native choices retain all 30 full and five incremental
  records, including the three grouped idle poses.
- Native position controls include **View pose sprite tiles** and **Edit native
  sprite artwork**. Opening a pose selects Sprite Bank. Entering CHR Sheet with
  its Scene selected also selects the correct buffer, including save/reopen or
  Scene selection while already in the sheet.
- A contextual strip beside the sheet shows the pose's verified physical bank,
  opens its existing native writer and returns to native position editing. It
  remains accessible independently of the inspector's scroll position.
- Dedicated physical CHR views select BG Bank. A deliberate buffer toggle still
  works in the current sheet. Unrelated projects keep the existing behavior.
- Reference art remains a snapshot. Navigation never copies pixels, re-signs
  unsupported fields, changes source bytes or substitutes a new native writer.
  A copied-reference pixel edit still refuses native building and cannot be
  adopted by following the new artwork shortcut.

## Architecture and scope

Three of 184 runtime inputs differ from local predecessor `bb264f4`:
`re/punch-out-pose-ui.js`, `re/punch-out-art-ui.js`, and the read-only bank metadata
returned by `services/punch-out-pose-project.js`. The native pose/art codecs,
registered encoders, ProjectStore, source recognition, schemas, emulator and all
five adopted workstation modules remain byte-identical. Ordinary schema 12 and
reader ceiling 16 are unchanged. There is no new persistence field or edit recipe.

`PunchOutPoseProject.describe` supplies `chrBank4KiB` from the verified pose
record. Pose UI uses existing SceneContext, Metasprites and CHR buffers for
preview, and `PunchOutArtUI.open` for physical edits. Existing guarded
ProjectStore preparation, history and source validation own native view creation.
The sheet banner is view state; its source-aware return link is temporary and
is not a new canonical relationship.

## Fresh verification

- `Navigation_DOM_Verification.json`: parsed delivered HTML, both supplied US
  revisions, real click and mouse handlers. Checks correct buffers, manual
  toggles, no-op output, one physical pixel's exact native offsets, Undo/Redo,
  save/reopen, existing-view reuse, reference preservation, grouped idle/art
  composition, unsupported-reference refusal, and unrelated starter output.
- `Startup_DOM_Verification.json`: 10/10 existing startup/workstation controls.
- `gate/Summary.json`: 104/104 retained public checks across nine suites; the
  synthetic codec lesson also passes.
- `Source_Preservation.json` and `Documentation_Verification.json`: exact source
  delta, identical generated/root entry, and standalone handbook/guide links.
- `Package_Verification.json`: explicit source inventory, reproduced predecessor
  input hashes, every ZIP manifest digest and CRC verified, no private payloads.

These are parsed-DOM checks with canvas/layout/timer stubs and actual native
builds. They do not establish browser layout, listening, controllers, external
emulators or hardware. Earlier native playback reports retain their own preceding
application hash; this repair does not change their codecs or emulator. Native
piece geometry, other opponents, animation/AI/collision and Audio writers remain
unfinished. No ROM, private commercial project or extracted game media is shipped.

## Reproduce

```sh
python3 app/tools/bundle.py
python3 tools/sync_main_entry.py
NODE_PATH=/path/to/jsdom/node_modules node reviews/punch-out-artwork-navigation-1/verify_navigation_dom.cjs /path/to/private-roms
NODE_PATH=/path/to/jsdom/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html /tmp/navigation-startup.json
python3 reviews/punch-out-artwork-navigation-1/run_checks.py
python3 reviews/punch-out-artwork-navigation-1/verify_docs.py
```

Use jsdom 30.1.3 and the original US PRG 0/PRG 1 files named by the test. Read
the offline handbook's Punch-Out section 17 for UI, hex and source/HTML methods.
This remains a local development candidate on
`implementation/punch-out-pose-edit-2`. This repair does not publish or merge it.
