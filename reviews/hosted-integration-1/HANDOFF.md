# Shared editor and hosted-world source integration

The owner approved reconciling the supplied hosted alpha with the current native
editor and publishing complete source to draft PR #3. Main merge, release/tag,
public server deployment and additional gameplay development are separate work.

## Current build

Both builds use canonical `app/src`. The ordinary manifest has 185 inputs. The
hosted manifest reuses those exact inputs, in order, plus eleven opt-in modules.
There is no independently edited `forge-source/app` snapshot. Runtime host/client,
launchers, tests and contracts remain in `experiments/hosted-worlds/v17.1`.

- Native HTML SHA-256: `0be56290249d2f3b03289b1b95b977181f5e423eb357f2919bb1b87da31d90f7`.
- Hosted HTML SHA-256: `697a22717152968f3a382c6da1e271a5457db251ec0643a96024900f8328b799`.
- Native source parent: local checkpoint `130511d`.
- Hosted input: supplied v17.1 complete kit, inner ZIP SHA-256
  `9bdd852c8384610a0300b4c7a5805ea979db34dc6e322e60140a48bec7e5a738`.
- Initial publication base: PR #3 head `c026edde55161b72e9ed9e4c97473dd650785f49`.
- Concurrent design-only update `1fc0fe0e294bef5207e7469594e8dc2a14c88d68` is preserved, including six gameplay/skinning design documents and two landing-page updates. No tested runtime code changed.

The two shared-code changes imported from v17.1 are a read-only emulator-frame
trace hook and verified edited-Zelda-II recognition through the existing native
fingerprints. Native encoders, ProjectStore, AssetRegistry, BuildGraph,
StageContext, project capability projection and their schemas are unchanged from
130511d. Current Glass Joe idle/incremental positioning, physical-art navigation,
native build-control guards, Resources and Retro Workstation are retained.

The source bundler now accepts an explicit optional manifest and separate input
inventory; its default CLI/build remains intact. Rebuild native/root and hosted
outputs from the repository root:

```sh
python3 app/tools/bundle.py
python3 tools/sync_main_entry.py
python3 app/tools/bundle.py --manifest hosted-source-manifest.json
```

The supplied historical v13-v16 HTML witnesses remain in the original uploaded
archive. Imported_History.json records their identity. Retained browser suites
now target the current generated editor and canonical source paths. Two older
room fixtures needed protocol 13 plus the real health `ok` response, preserving
their assertions. Explicit rejection of protocol 12 remains in the public gate.
Native browser workflow checks use actual file URLs, matching standalone usage;
an insecure about:blank fixture cannot supply WebCrypto for full ROM intake.

## Fresh verification

- 104/104 retained native public checks across nine suites on EACH build, plus the codec lesson.
- 114/114 hosted checks across ten suites, including actual Chromium World-load
  UI, protocol rejection, shared rooms, persistence, progression, PvP and cameras.
- 12 native capability/lifecycle checks on each build: native no-op output,
  inapplicable controls, ordinary seven-Scene/Undo behavior, both Punch-Out
  revisions, grouped idle edits, safe refusals, fresh reopen and Zelda II terrain.
- Dedicated artwork checks on both Punch-Out revisions: pixel events, exact
  physical writes, Undo/Redo, save/reopen, idle/art composition and snapshot guards.
- Six actual Chromium file-page workflow checks: native capability menu,
  grouped C0 idle editing, native bank-29 route, changed native ROM output,
  fresh-page identical rebuild and no page errors. Project loading uses the
  existing factory; this is not a claim of complete intake usability acceptance.
- Supplied private Zelda II input: 16 checks of source pose graphics/selectors
  in two browser clients and 13 checks of full 1024px town-art construction,
  readback, host validation, screen-boundary movement and unchanged ROM build.
- 10/10 strict parsed-DOM startup/control checks on each build; source-convergence and offline handbook checks are recorded separately.

Browser: Chromium 153 headless. DOM probes retain their canvas/layout/timer stubs;
they are distinguished from actual browser checks. Hosted movement, attack timing,
hit zones, damage and native parity remain provisional. No full-fight, controller,
hardware, listening, public-network hardening or complete native game acceptance
is claimed. Original ROMs, media, runtime databases and personal keys are excluded.

## Run the complete kit

Extract the whole directory. `nes-forge.html` is the native/offline editor.
`START_HOSTED_WINDOWS.cmd` or `START_HOSTED.sh` starts the versioned localhost
host; open the hosted HTML in that version folder. Install its requirements first.
Use the fresh process admin token, verify protocol 13, and explicitly publish the
selected supported Zelda II World. Separate player browser profiles use test
wallets. Back up private SQLite state before moving it between stopped hosts.
The offline handbook includes the hosted workflow and existing native tutorials.

## Reproduce

```sh
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 app/tools/bundle.py --manifest hosted-source-manifest.json --check
python3 reviews/hosted-integration-1/run_native_checks.py
python3 experiments/hosted-worlds/v17.1/tests/run_alpha_acceptance.py
NODE_PATH=/path/to/jsdom/node_modules node reviews/hosted-integration-1/verify_capabilities_dom.cjs /private/rom-folder /private/ZeldaII.nes
NODE_PATH=/path/to/jsdom/node_modules node reviews/hosted-integration-1/verify_artwork_dom.cjs /private/rom-folder
CHROMIUM_PATH=/path/to/chromium python3 reviews/hosted-integration-1/verify_browser_workflow.py /private/PunchOutPRG0.nes
```

Set FORGE_REVIEW_HTML to the hosted HTML and FORGE_CAPABILITY_REPORT to a separate
filename when repeating capability checks on that build. Private hosted suites
use NES_FORGE_Z2_ROM. See requirements-dev.txt in the version folder. The tests
accept CHROMIUM_PATH or Playwright's installed Chromium. Fresh-checkout/publication
verification is reported separately after the GitHub branch is updated.

## Remaining workflow review

WF-03 through WF-10 and the rest of WF-05 remain open: exact active selection,
source/physical edit-owner links, used tiles/palettes/flips, known shared
consumers and coverage, fresh pose resume, consistent previews, actionable build
health and in-app title lessons. This integration preserves the first repair
batch; it does not claim those subsequent repairs or full Punch-Out recovery.
Preserve schema 12, reader ceiling 16, original Pepsi references and independent
RE/assembly/hex/HTML workflows while continuing them.
