# Consistent resource previews and actual build diagnostics

Continues published resume/design head `ac3e4a30cd40ff779adacea42751a0865bccef52`
on the existing draft PR #3. Concurrent Hosted Worlds design notes are retained
unchanged. This is a bounded WF-07/WF-08 workflow repair, with no new native writer.

## Visible behavior

- Resources Scene composition reads the existing `forgeCapture.scenePixels` path:
  BG attributes/universal color, active OAM, 8x16 halves, flips, transparency,
  priority, scanline limits and captured scanline palette/mask states. Entity
  boxes, editor guides and selection outlines remain outside this art preview.
- CHR Resources shares `forgeCHR`'s usage/palette resolver, including the active
  color mode/appearance and selected-pose context. Independently browsed buffers
  use their own automatic usage colors. Sprite transparency and atlas pages above
  tile 255 stay visible without selecting another Scene or changing assets.
- Supported Glass Joe position views have **Preview current native output**. It
  uses the same compiler entry as Build & Run, captures detached source through
  the existing planner, then decodes the exact encoded pose/CHR/fight colors.
  The source-art snapshot is not patched. A compile refusal is shown explicitly.
  Incremental preview is limited to its declared state path, not a live fight.
- Project Health separates reference counts from **Check current ROM build**.
  This invokes the full compiler without committing, downloading, or starting
  playback. A result is bound to the capture and is invalidated on later changes.
- Native owners add confirmed Scene/World/frame and field context to their real
  refusals. Recovered-page/layout mismatch and World encoder budget context come
  from the actual failed owner. PO protected-copy fields are named only after a
  reproducible detached source candidate restores the existing saved hash.
  Hash-only differences with no such proof stay explicitly unlocalized.
- Health, Code preflight and failed Build / Build & Run show available structured
  details, resource navigation and Save/Undo/correct-writer guidance. Navigation
  neither discards unsupported work nor repairs/re-signs it automatically.

## Source ownership and compatibility

Two added common inputs: `services/resource-preview.js` and
`services/build-diagnostics.js`. Ten preceding inputs change; see
`Source_Convergence.json`. There are 190 native inputs and 201 hosted inputs,
with the same eleven unchanged opt-in extensions.

ProjectStore, AssetRegistry, EditorView, StageContext, ResourceContext,
EmulatorBridge, core emulator, signature algorithm, raw recipe hashing, schemas,
all title byte codecs/spans and native engine dispatch remain unchanged. The
native resource projection function is checked byte-for-byte. Changes inside
existing native project services add diagnostic evidence or extract the same
source-view constructor; they do not grant additional writable fields. Ordinary
schema 12 and reader ceiling 16 remain. Existing visual, RE, 6502, hex, JSON and
HTML workflows are retained. Original Pepsi artifacts remain byte-identical.

## Tutorials and reproduction

Punch-Out section 21 gives the complete snapshot/output comparison, native refusal,
Save/Undo/writer repair, game verification and HTML/source paths. Developer section
17 explains shared rendering, input identity, diagnostic proof and another title's
integration. Both standalone HTML guides include all previous lessons.

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 app/tools/bundle.py --manifest hosted-source-manifest.json --check
python3 reviews/preview-build-diagnostics-1/verify_source.py
PYTHONPATH=/path/to/python-deps python3 app/tools/render_developer_guide.py --check
NODE_PATH=/path/to/jsdom/node_modules PYTHONPATH=/path/to/python-deps \
  CHROMIUM_PATH=/path/to/chromium python3 \
  reviews/preview-build-diagnostics-1/run_regressions.py \
  /private/rom-folder /private/zelda2.nes
```

Dependencies: jsdom 30.1.3; Playwright 1.64.1 with Chromium 153 in the recorded run;
markdown2 for docs; the hosted suite's existing Python requirements. `run_regressions`
extracts a genuine preceding public HTML into a temporary sibling file for reader
compatibility. Reports/logs contain boolean results and hashes, never ROM payloads.
Optional QA screenshots stay outside the checkout and kit. The source checker
requires Git history containing its recorded base. Complete runnable packaging
uses the tracked checkout, including native/hosted editors, server/client,
launchers, all tutorials and prior checkpoints; private/runtime data is excluded.

See `Verification_Summary.json` and individual exact-hash reports for final counts.
DOM probes stub canvas/layout/timers; actual Chromium compares canvas pixels and
exercises real controls. Initial native intake uses the existing factory. Resume
browser checks use actual download/open, isolated IndexedDB and explicit recovery,
with OS picker disabled for the explicit fallback test. These are not a full fight,
listening/controller/hardware, independent emulator or exhaustive native-use pass.
The unavailable historical full release gate remains unavailable; hosted original
engine fidelity and public-network hardening remain separate.

## Remaining work

Detached/current source display (WF-09) and in-app title lessons (WF-10) remain.
Current-output pose decoding is limited to existing supported Glass Joe position
views. Arbitrary historical copied snapshots cannot always be reconstructed from
a hash; the UI explicitly reports that limit. Native animation/geometry/combat,
referee/round transitions, collision and Audio writing remain separate bounded RE
and encoder work. Main merge, release/tag and public hosting are separate decisions.
