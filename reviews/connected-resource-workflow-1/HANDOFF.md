# Connected pose, Resources and native graphics workflow

This continues the owner's approved shared-source work at public checkpoint
`ca992a4209dba8a3ede669b9ae6ffd14cd36f468`, including the concurrent Moblin and
collectible design documents. It repairs the supported pose/CHR workflow without
adding native editing fields, changing schemas, or implementing those designs.

## User-visible behavior

- Both Resources entries resolve the actual selected pose, Animation, World or
  CHR tile before deriving its related context. Independent browsing and explicit
  Follow retain their existing meanings.
- Native pose/art source receipts participate in common context and Resources.
  Pose dependencies distinguish copied Scene pixels/colors, the preserved ROM,
  physical CHR and fight palette write owners. Merely browsing materializes no
  assets. Explicitly opening a missing writer uses its existing Undo transaction.
- The pose preview uses the existing canonical Metasprite renderer. CHR has whole
  bank and used-by-pose views, stable tile indices, real piece palette contexts,
  H/V appearances and 8x16 half labels. Scene OAM is not fabricated.
- The physical writer uses current native pixels with the selected pose's copied
  colors. Existing pose snapshots remain unchanged. The ROM bank chooser explains
  its independent selection and explicit copy buttons.
- Tile-level native consumers are computed on demand through bounded original
  full-pose shape execution. Bank 29 includes Glass Joe and Don Flamenco, but
  individual tiles have different observed consumers. Coverage remains partial:
  367 decoded initial-mode full poses / 176 needing other context per revision.
- Punch-Out tutorial section 19 documents assets, visual edits, independent code,
  hex offsets, standalone HTML changes and extension boundaries. It is included
  in the offline handbook.

## Ownership and compatibility

`ResourceContext` and `ResourceUsageUI` are read-only projections and disposable
editor view state. The two builds share 187 source inputs; the hosted build has
the same inputs in order plus the eleven unchanged optional extensions (198
total). No separately maintained editor snapshot is introduced.

ProjectStore, AssetRegistry, BuildGraph/RuntimeCompiler, EmulatorBridge,
StageContext, native owner/encoders, protected spans and original engine code
are unchanged. Ordinary schema 12 and reader ceiling 16 remain. Native writers
still refuse unsupported copied-art/geometry changes; navigation cannot re-sign
them. Source convergence records the exact unchanged files and both HTML hashes.

## Verification

See `Verification_Summary.json` and the individual reports for exact hashes and
counts. The public gate runs on both editor outputs. Additional checks cover
parsed-DOM startup, both supplied Punch-Out revisions, explicit source/writer
routes, used tiles/palettes/flips, known consumers, Undo/Redo, save/fresh reopen,
combined native positions/art and unsupported snapshot refusals. Capability
regression also checks the prior Zelda II terrain workflow. Hosted acceptance
tests protocol 13, host/client, persistence and multiplayer boundaries.

`Browser_Verification.json` is actual Chromium file-page interaction, including
rendered pose canvases, Resources-to-used-tiles, physical sheet/pixel clicks,
combined idle editing and fresh-page identical native builds. Project intake uses
the existing factory. DOM reports use the retained canvas/layout/timer stubs.
No full-fight, listening, controller, independent-emulator, hardware, exhaustive
native-use or production/public-hosting acceptance is claimed. Screenshots remain
private QA files and are not part of source or deliverables.

Reproduce from the repository root, with optional private inputs outside it:

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 app/tools/bundle.py --manifest hosted-source-manifest.json --check
python3 reviews/connected-resource-workflow-1/verify_source.py
NODE_PATH=/path/to/jsdom/node_modules node reviews/connected-resource-workflow-1/verify_workflow.cjs /private/rom-folder
CHROMIUM_PATH=/path/to/chromium python3 reviews/connected-resource-workflow-1/verify_browser.py /private/rom-folder
FORGE_GATE_DIR=/tmp/native-gate python3 reviews/hosted-integration-1/run_native_checks.py
python3 experiments/hosted-worlds/v17.1/tests/run_alpha_acceptance.py
```

The generic checks run without the private ROM-folder argument. Use
`FORGE_REVIEW_HTML`, `FORGE_WORKFLOW_REPORT` and `FORGE_BROWSER_REPORT` to run on
the hosted editor without replacing native reports. The existing strict startup
runner takes HTML/report paths. Python browser tests use Playwright; hosted dev
requirements are in the versioned experiment. Source-bound verification requires
Git history containing the recorded base, or an explicit `verify_source.py --base`.

## Review scope and next work

This covers WF-03/WF-04 for these supported pose/physical-art views, the selected
editor part of WF-05, and the isolated Metasprite preview part of WF-07. It does
not claim a complete native dependency graph for every title or game state.
Fresh selection resume (WF-06), broader consistent previews (WF-07), actionable
native build health (WF-08), detached-source display (WF-09), and contextual
in-app title lessons (WF-10) remain open. The original read-only audit is retained
unchanged; this later checkpoint records the implemented repairs.

Full Punch-Out recovery, geometry/animation/hit rules, other opponents' position
writers and native Audio writing remain separate work. Hosted gameplay fidelity
remains experimental. Preserve `main`, original Pepsi references, the concurrent
design documents and independent RE/ASM/hex/HTML workflows. Main merge, releases
and public server deployment remain separate decisions.
