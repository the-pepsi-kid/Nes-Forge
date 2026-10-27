# Forge app: source context and in-app Punch-Out lessons

This checkpoint is work on the standalone Forge editor, continuing the source
workflow audit WF-09/WF-10. It adds no multiplayer gameplay and no new native
Punch-Out behavior/writer. The shared branch's pre-existing hosted XP, Zelda II
room identity and sword-technique audit are retained unchanged from
`7d182a57a7a84af78596de4cdf685b7f96a0319a`. The four concurrent replay/observation files are preserved
byte-for-byte. They change neither tested HTML nor existing runtime/test commands;
this checkpoint does not certify their separate native replay observations. See
Concurrent_Integration.json for the exact preservation proof.

## Visible editor behavior

- Project intake distinguishes the last inspected input from the active project
  source. When its original epoch/snapshot guard expires, actions visibly disable
  and the panel collapses to **detached previous input**. The report stays
  expandable; inspecting again is explicit. A delayed input cannot become ready
  after project replacement. Saved project files have their own input label.
- ROM Audio Library labels **Current project source**, **Independent source** or
  **Detached source**. Invalid session guards disable stale cue/audition/preview/
  import actions and cancel pending/staged work. Evidence remains identifiable.
- **Use current project source** reopens the preserved project ROM through the
  existing Audio loader with epoch/reference/identity guards. **Continue
  independent Audio inspection** explicitly reopens retained bytes under their
  own source session. Neither changes project assets, emulator ROM/state or
  native signatures. Tracker import still needs a fresh preview and its existing
  explicit confirmation/project/source guards.
- General RE, Area Library and the independent multi-file source workspace display
  their source role. Deliberate independent RE/source work survives project
  replacement; no unrelated source is silently adopted into the project.
- **Project lessons** opens the maintained offline handbook within Tech Docs.
  Fifteen chapters plus the synthetic exercise remain manually selectable. The
  original Tech Docs/authoring reference is retained below the reader. Resources,
  Audio and intake have contextual shortcuts. Glass Joe idle opens section 17;
  CHR footprint/writer context opens 19; Audio opens 7. A separately selected pose
  retains its proper source context. Independent RE/code/Audio help follows that
  source, and the active-project output strip stays explicitly separate.
- Reader section navigation accounts for pinned controls; 390px layout retains
  section/return controls without page overflow. Reading/returning creates no
  assets, source bindings, history entries or native write permission.

## Source ownership

`services/source-context.js` is a read-only projection over existing identity and
session guards. Its one disposable raw-ROM hash cache clears on replacement.
`ui/source-context.js` refreshes presentation at the existing investigation
lifecycle hook and UI/edit events. The gateway retains its original guarded
receipt; the original Audio loader/catalog/transcription/commit owners remain.
Prepared investigation import invalidation is visible rather than deferred to a
failed button click. SourceWorkspace itself remains unchanged and independent.

`ui/project-lessons.js` owns reading/navigation only. Generated
`docs/project-lessons-data.js` and the standalone book share one Markdown renderer,
chapter source hashes and internal anchors. Script delimiters are escaped. Edit
Markdown and regenerate; do not maintain a second copy of tutorial text in HTML.
New bounded source-page, Zelda II and Ninja lessons supplement existing title
notes without claiming full native inverse writers or whole-game acceptance.
Punch-Out section 22 and developer section 18 document the complete new workflow.

There are 194 native inputs and 205 hosted inputs (the same native inputs plus
11 unchanged optional modules). ProjectStore, AssetRegistry, BuildGraph,
RuntimeCompiler, EmulatorBridge, EditorView, StageContext, ResourceContext, native
signatures/recipes/codecs/spans, emulator and schemas remain unchanged. Ordinary
schema 12 and reader ceiling 16 stay intact. Source_Convergence.json verifies the
seven changed preceding inputs, four new inputs and preserved core/gameplay code.

## Verification and reproduction

See Verification_Summary.json for exact final hashes/counts. The new DOM probe
uses the complete parsed HTML with real source/canonical owners and guards;
canvas/layout/timers are stubbed. Actual Chromium uses real file inputs for
ROM intake, prepare/import and saved-project replacement; lesson/section/return
controls; independent native cue inspection; and 390px layout. Initial browser
ROM intake is not replaced with a factory in the new workflow probe. Older
retained browser suites retain their documented factory-input limits.

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 app/tools/bundle.py --manifest hosted-source-manifest.json --check
PYTHONPATH=/path/to/python-deps python3 app/tools/render_project_tutorials.py --check
PYTHONPATH=/path/to/python-deps python3 app/tools/render_developer_guide.py --check
python3 reviews/source-context-lessons-1/verify_source.py
NODE_PATH=/path/to/jsdom/node_modules node \
  reviews/source-context-lessons-1/verify_workflow.cjs /private/rom-folder
PYTHONPATH=/path/to/python-deps CHROMIUM_PATH=/path/to/chromium python3 \
  reviews/source-context-lessons-1/verify_browser.py /private/rom-folder
NODE_PATH=/path/to/jsdom/node_modules PYTHONPATH=/path/to/python-deps \
  CHROMIUM_PATH=/path/to/chromium python3 \
  reviews/source-context-lessons-1/run_regressions.py \
  /private/rom-folder /private/zelda2.nes
```

Recorded environment: jsdom 30.1.3, Playwright 1.64.1/Chromium 153, markdown2,
existing hosted Python requirements. Native file intake can be CPU-heavy; the
browser driver permits 90-second individual control actions, not a performance
certification. Old failed exploratory fixture/timeout attempts are superseded by
final frozen-output reruns. Reports contain boolean outcomes, names and hashes,
not ROM bytes or source-bearing project exports. Internal QA screenshots remain
outside the checkout/kit. Full fights, Audio listening, hardware/controllers,
independent emulator and exhaustive native-use acceptance remain separate.
The missing historical full release gate remains unavailable.

## Next Punch-Out work

The workflow audit's remaining source/lesson presentation is covered for these
bounded paths. Continue the native Punch-Out sequence with source-backed Glass
Joe knockdown, referee-count and round-transition recovery, then bounded writers
only where byte ownership and original-engine behavior are demonstrated. Existing
whole-pose X/Y, physical CHR/palettes and shared arena writers retain their scope.
Native animation/combat/collision/Audio writing is not completed by this UI work.
Keep this work distinct from the multiplayer game's Zelda II implementation.
Main merge, release/tag and public hosting remain separate decisions.
