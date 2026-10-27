# Workspace resume: selected pose, piece and editing context

This continues the connected-resource checkpoint from public commit
`dbef9401786f74facf8f57ce55fbbe5f2df75618`. The concurrent earned-Moblin design
documents remain design-only. This change addresses audit WF-06 and the native
return shortcut needed after reopening; it adds no native write capability.

## Behavior

Save Project As, browser project save, recovery and Export's `project.json` include
an optional versioned `editorView`. A fresh application restores the selected
Metasprite, piece, core editor tab, selected World and CHR whole-bank/used-pose
preference. Existing active Scene, CHR bank/tile and Animation selection fields
retain their formats. Intentional differences between the active Scene and pose
source remain visible, and the editor World is separate from runtime start/spawn.

Old/malformed/stale hints select a pose only when one uniquely matches the active
Scene. Several matches display **Choose a pose…** with an explanation. No match
stays explicitly unselected; no unrelated library entry is silently chosen.
A deliberately empty pose selection also survives new saves. Missing canonical
references remain intact for inspection/repair. Pose/piece selection is UI state,
not a new asset store or a request to copy source graphics into another Scene.

Native physical CHR can return to a restored pose through **Open native pose
position** even in a document with no previous shortcut history. The route reads
the actual selected pose's existing source receipt and verified physical bank.
Snapshots, native pixel/palette owners and supported X/Y fields retain their
previous meaning and safety checks.

## Ownership and compatibility

- `services/editor-view.js`: bounded preference whitelist, current UI IDs and
  restore coordination over existing owners. No database/asset/encoder owner.
- `services/project-store.js`: optional capture at save boundaries and restoration
  during the existing validated commit. Internal history/sync retains valid UI
  selection; external project opening uses saved hints or the bounded fallback.
- `legacy/13-metasprites.js`: `restoreSelection` and the explicit empty chooser.
- `re/punch-out-pose-ui.js`: reconstructs the physical-bank return route from the
  current canonical native pose, with the old transient receipt as a fallback.

Default `ProjectStore.capture()` / `serialize()` omit `editorView`; authoringData
still removes it. Native signatures, raw recipe hashing, AssetRegistry,
BuildGraph/RuntimeCompiler, codecs/spans and emulator are unchanged. Ordinary
schema 12 and reader ceiling 16 remain. The preceding reader can discard the new
view fields without losing assets or changing output. A saved tab does not
restore emulator RAM or start playback.

Both builds share 188 inputs, with eleven unchanged opt-in hosted modules (199
inputs in the hosted manifest). Current docs include Punch-Out section 20 and
developer-guide section 16, with visual/JSON/source/HTML paths and a reproducible
standalone guide renderer. The twelve-chapter offline handbook is regenerated.

## Verification and reproduction

See `Verification_Summary.json` for final hashes/counts. Resume DOM checks cover
fresh documents, a non-first pose/piece, independent contexts, legacy ambiguity,
malformed/future hints, a preceding reader, unchanged runtime start/ROM, actual
export handler, Undo/Redo and both native revisions. Browser checks use actual
Save Project As/browser-download fallback and Open Project file input, real
isolated IndexedDB Save/Load, and explicit recovery restoration. Native OS picker
support is disabled in that headless test environment. Initial ROM intake uses
the existing factory. Private source projects remain temporary/in memory.

Retained checks cover both editor outputs, prior connected-resource controls,
native capability scope, Zelda II terrain continuity and hosted protocol 13.
DOM probes stub canvas/layout/timers; Chromium checks are separate. No full fight,
listening/controller/hardware, exhaustive native dependency or production hosting
acceptance is claimed. Previous reports retain their original hashes.

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 app/tools/bundle.py --manifest hosted-source-manifest.json --check
python3 reviews/workspace-resume-1/verify_source.py
NODE_PATH=/path/to/jsdom/node_modules node reviews/workspace-resume-1/verify_resume.cjs /private/rom-folder
CHROMIUM_PATH=/path/to/chromium python3 reviews/workspace-resume-1/verify_browser.py /private/rom-folder
PYTHONPATH=/path/to/python-deps python3 app/tools/render_developer_guide.py --check
```

The resume DOM test runs generic cases without private inputs. Set
`FORGE_PREVIOUS_HTML` to the preceding public HTML to include its reader check.
Use `FORGE_REVIEW_HTML`, `FORGE_RESUME_REPORT` and `FORGE_RESUME_BROWSER_REPORT` to
test another output while preserving reports. Source comparison requires Git
history containing the recorded base. Browser/dev dependencies remain those
documented by the hosted version and previous review harness.

## Remaining work

WF-06 is covered by this checkpoint's bounded resume behavior. Broader consistent
Scene/CHR/current-output previews (WF-07), actionable native build diagnosis
(WF-08), detached-source display (WF-09), and contextual in-app lessons (WF-10)
remain open. Full Punch-Out animation/geometry/combat/collision/Audio writing and
exhaustive native-use recovery remain separate work. Keep main, original Pepsi
references, existing canonical owners and independent RE/ASM/hex/HTML workflows.
Main merge, release/tag and public server deployment are separate decisions.
