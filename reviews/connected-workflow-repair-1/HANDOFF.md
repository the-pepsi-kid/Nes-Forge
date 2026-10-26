# Connected native workflows — first repair batch

The owner resumed after the connected-workflow review. This checkpoint resolves
WF-01 (inapplicable build controls) and WF-02 (project mode/capabilities), plus
the authored Gameplay shortcut portion of WF-05. The full ten-item review is
not closed. No GitHub push or main merge is included.

Standalone: `nes-forge.html`, identical to
`app/mainline/NES_Forge_2.0.0-alpha.11.html`.
SHA-256: `4e316191f5b1046841530d225372072663412f1f399c08ecf79b018441e8799c`.
Size: 3,024,526 bytes. Source parent: `f0d2c31`.

## Resulting behavior

- A recovered Punch-Out project reads **Punch-Out · bounded native editing**,
  even when it also retains an investigation catalog. Preserved generic ROMs
  are described as unchanged-output projects. Generated builds retain their
  existing route and requirements.
- **Native tools** shows this project's actual available writers: native source
  pages, physical CHR/fight palettes, Glass Joe whole-pose positions and shared
  arena layout. Pose/art shortcuts reveal and focus their explicit resource
  pickers without adding assets. Arena and terrain shortcuts delegate to the
  existing resource transactions; native location fields keep their owner.
- Connected Workspace, Project investigation/intake, Scene context, Area
  Library and native preflight use the same project scope. Area Library
  distinguishes a project-wide writer from ownership of a selected snapshot.
- Native projects cannot use generated **Include first 7**, Scene inclusion or
  order fields, or generated ROM configuration to invalidate a no-op build.
  Controls are disabled/hidden with an explanation, and handlers refuse stale
  or programmatic events before taking an Undo snapshot. World and unpacked
  custom builds explain why their Scene set is not used. Packed authored and
  single-room builds retain Scene selection; switching projects restores it.
- Successful native preflight now displays a recipe-validation result and its
  declared writer scope. This is not a gameplay/visual certification.
- Authored **Edit Gameplay** opens the canonical Gameplay panel in Scene.
- Punch-Out tutorial section 18 and the offline handbook explain the routes,
  ownership limits and generated/native build distinction. Independent RE,
  assembly, hex editing and direct HTML/source workflows remain documented.

## Implementation connections

`BuildGraph.backendFor` exposes the existing dispatcher without planning or
capturing the project. `ProjectCapabilities.describe` projects that route and
existing native capabilities. Native Scene encoders declare small read-only
availability descriptors at their existing registrations. Discovery is separate
from `matches`: an available writer need not have an opened editing view yet.

This adds no canonical asset store, saved capability record, schema, native
permission, hash mask or encoder. The existing native validation/build owners
still enforce source identity, recipes, owned fields and physical spans. Editing
an unsupported reference remains savable and still refuses native output.

The intake labels the older resource inventory as a native page catalog; it no longer presents that catalog’s zero pose entries as the scope of the available pose writer.

There are 185 runtime inputs: one added capability projection, 12 existing
inputs changed and 172 identical to the reviewed parent. Original input order
is retained. ProjectStore, AssetRegistry, StageContext, native pose/art/arena
codecs, Punch-Out protected-byte recognition, emulator and Audio compiler
remain identical. Native writer module changes add availability metadata only.
See `Source_Preservation.json` and `Source_Parent_Build_Inputs.json`.

## Verification and practical limits

Fresh evidence is tied to the standalone hash above:

- 104/104 available public cases across nine suites, plus the synthetic codec
  lesson: `gate/Summary.json`.
- 10/10 strict parsed-DOM startup/control checks: appearance/density,
  Resources, workspace panels, matching-pose controls and replay mounting.
- 12/12 capability/lifecycle checks: authored Scene selection and Undo, World
  and unpacked control scope, single-room availability, synthetic generic ROM
  preservation and fresh reopen, native stale-control guards, both Punch-Out
  revisions, existing pose/art/arena routes and Zelda II native terrain.
- Both Punch-Out revisions retain their decoded 84-entry native Audio catalog
  with current-source identity. Native Audio writing is not introduced.
- Both revisions: no-op output is identical, a grouped idle move builds, fresh
  reopen builds the identical edited ROM, and unsupported copied art still
  refuses. Dedicated artwork checks exercise actual pixel mouse events,
  exact physical byte changes, Undo/Redo, save/reopen, idle/art composition
  and protected reference copies.
- Zelda II: workspace/Area Library routes, no-op output, native terrain edit,
  rebuild and fresh reopen retain the same edited terrain/output.
- Offline documents have no missing/duplicate internal anchors or external
  runtime dependencies. Bundled/root application and source concatenation match.

An initial concurrent run reached four 10-second VM startup timeouts in the retained Shadowgate suite. The final verification runs one worker on frozen inputs, without raising timeouts or changing assertions; keep `Initial_Concurrent_*` as the earlier, different-hash record.

These are parsed-DOM and byte checks with canvas/layout/timer stubs. No fresh
rendered-browser layout, visible in-game witness, listening, controller, complete
fight, independent-emulator or hardware pass is claimed. The unavailable full
historical release gate remains separate. Earlier original-engine evidence
retains its own application hash; it is not relabeled as fresh playback here.

## Reproduce

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 reviews/connected-workflow-repair-1/run_checks.py
NODE_PATH=/path/to/jsdom/node_modules python3 reviews/connected-workflow-repair-1/run_verification.py /path/to/private-roms '/path/to/Zelda 2 - The Adventure of Link (U).nes'
NODE_PATH=/path/to/jsdom/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html reviews/connected-workflow-repair-1/Startup_DOM_Verification.json
NODE_PATH=/path/to/jsdom/node_modules node reviews/connected-workflow-repair-1/verify_capabilities_dom.cjs /path/to/private-roms '/path/to/Zelda 2 - The Adventure of Link (U).nes'
NODE_PATH=/path/to/jsdom/node_modules node reviews/connected-workflow-repair-1/verify_artwork_dom.cjs /path/to/private-roms
PYTHONPATH=/path/to/markdown2 python3 reviews/connected-workflow-repair-1/render_docs.py
PYTHONPATH=/path/to/markdown2 python3 app/tools/render_project_tutorials.py
python3 reviews/connected-workflow-repair-1/verify_docs.py
```

Use jsdom 30.1.3; private ROM arguments are optional for the capability probe's
public/synthetic portion. Neither private ROMs nor source-bearing commercial
projects, media, screenshots or emulator snapshots belong in the distribution.

## Next repair batch

Project selection, source snapshot, physical edit owner and known consumers
need one consistent read-only projection through existing owners. Make Resources
follow the actual selected pose, then delineate its used tiles, palettes/flips,
shared-bank consumers and coverage. A shared bank alone is not proof that every
tile edit affects every fighter. Preserve explicit independent browsing and
safe native refusal; do not populate fake Scene OAM, re-sign copied pixels or
invent runtime/audio bindings to improve a label.

WF-03/WF-04 and the remaining WF-05 navigation are next. Fresh pose resume,
consistent previews, actionable build-health diagnosis, detached-source display
and in-app title lessons remain WF-06 through WF-10. Preserve schema 12/reader
ceiling 16, native formats, the compact workstation and the original Pepsi
archive while implementing them.
