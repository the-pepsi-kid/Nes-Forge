## Current: Forge source context and in-app Punch-Out lessons

Read `../reviews/source-context-lessons-1/HANDOFF.md`, Punch-Out section 22 and
developer section 18. The standalone Forge app now labels current/independent/
detached sources, disables and collapses stale intake, cancels stale Audio/import
previews, and offers explicit current-project/independent Audio source routes.
Project lessons embeds the maintained handbook in Tech Docs, with exact resource,
Audio, RE and source-workspace context. Original Tech Docs and offline guides stay.

There are 194 shared native inputs plus eleven unchanged optional hosted modules
(205 total). Existing canonical owners, native codecs/signatures/spans, schemas
and multiplayer gameplay are unchanged. This adds no new native Punch-Out behavior.
Next: source-backed Glass Joe knockdown, referee count and round-transition work.
Main and original Pepsi references remain protected; promotion/deployment are
separate decisions.

## Previous: resource preview consistency and build diagnostics

Read `../reviews/preview-build-diagnostics-1/HANDOFF.md`, Punch-Out section 21 and
developer section 17. Resources shares the existing Scene/CHR/pose renderers.
Supported native poses can explicitly preview exact current compiled pixels/colors
without changing source snapshots. Project Health runs the actual compiler and
separates that result from reference health; native owners surface confirmed
resource/field context and Save/Undo/correct-writer guidance. Unlocalizable hash
changes remain explicit. Preflight and failed builds share those error details.

Both outputs share 190 inputs plus eleven unchanged opt-in hosted extensions
(201 total). ProjectStore, resume, AssetRegistry, emulator, signature algorithms,
byte codecs/spans and schemas retain their owners and contracts. New verification,
full tutorials and complete runnable kit are in the handoff. Detached-source display
and in-app title lessons remain next; no new native write capability is claimed.
Main/original Pepsi references and concurrent design notes are preserved.

## Previous: workspace resume and connected native resources

Read `../reviews/workspace-resume-1/HANDOFF.md`, Punch-Out section 20 and developer
guide section 16. Optional save preferences restore the selected pose/piece, core
editor tab, World and CHR view. Independent contexts survive reopening. Older or
stale hints select a unique matching pose or show an explicit choice; no unrelated
first boxer is silently chosen. Native CHR can return to the restored pose in a
fresh document. Save/load/history remain owned by ProjectStore.

Default authoring/build captures exclude this metadata. Native signatures,
encoders/spans, runtime/recipe algorithms and schemas are unchanged. Both outputs
share 188 inputs plus eleven opt-in hosted extensions (199 total). Fresh report
hashes and bounded compatibility/browser checks are in the handoff. Current native
workflows, Retro Workstation, Resources, original Pepsi artifacts and concurrent
design documents are retained. Main merge, tags and public deployment remain
separate decisions.

## Previous: connected pose, Resources and native graphics workflow

Read `../reviews/connected-resource-workflow-1/HANDOFF.md` and Punch-Out tutorial
section 19. Resources follows the actual selected pose/clip/tile; supported native
views expose their source identity and separate physical CHR/palette writers.
CHR's pose footprint uses canonical pieces, real palette/flips and stable indices,
without fabricating Scene OAM. Known native tile consumers disclose partial
coverage. Pose previews use the existing canonical renderer. Earlier snapshots
remain copied art and native writers still reject unsupported edits.

Both outputs share 187 inputs, with eleven unchanged optional hosted extensions.
Core project/build/emulator owners, native codecs/spans, schemas and original
Pepsi artifacts are unchanged. Fresh verification and remaining review items are
in the new handoff. The hosted server/client remain experimental. Source work
continues on the experimental PR; main merge, tags and public deployment are
separate decisions.

## Previous: shared editor and hosted-world integration

Read `../reviews/hosted-integration-1/HANDOFF.md`. Native and hosted editors now use
one canonical `app/src` tree, with separate manifests/output inventories. The
hosted version adds eleven opt-in modules and retains current native build scope,
Glass Joe idle/incremental, CHR routing and Retro Workstation work. Original
engine fidelity and public hosting remain bounded as documented. The main branch
and original Pepsi archive are preserved; publication targets draft PR #3.

## Previous: connected native workflows, first repair batch

Read `../reviews/connected-workflow-repair-1/HANDOFF.md` first. The shared read-only capability projection follows BuildGraph’s existing backend and registered native writers. Punch-Out is labeled bounded native editing and exposes source-page, pose, physical-art and arena routes. Intake, Scene context, Area Library and native preflight agree. Inapplicable Scene selection/order and generated ROM configuration controls cannot mutate a native project. The authored Gameplay shortcut opens its actual panel. Root and generated app are identical, SHA-256 `4e316191f5b1046841530d225372072663412f1f399c08ecf79b018441e8799c`.

This resolves review WF-01/WF-02 and the Gameplay part of WF-05. The wider selection/provenance/resource-usage, fresh-resume, preview, health-diagnosis and contextual-lesson work remains open. No new native writer, schema, asset store or emulator was added. Preserve the original Pepsi archive, current project owners and independent RE/ASM/hex/HTML workflows. This checkpoint is local; GitHub publication is separate.

## Previous: pose and native artwork navigation repair

Read `../reviews/punch-out-artwork-navigation-1/HANDOFF.md` and the Punch-Out handbook section 17. The native pose picker is expanded above the source reference preview. Metasprites links directly to sprite CHR and the existing physical-bank writer; CHR Sheet shows a contextual strip. Pose entry selects Sprite Bank, physical artwork entry selects BG Bank, and explicit toggles still work within the current sheet. Reference art remains a snapshot; unsupported edits cannot be re-signed through navigation. Three of 184 runtime inputs change from bb264f4; core codecs, native encoders, emulator, schemas and all five workstation inputs remain identical. Application SHA-256: `9ac2c6750561f3e8c2dd5f542f6c6d9930383771000f1fd3cf751d70feb09d66`. This remains a local development candidate on the existing feature branch.

## Previous checkpoint: native idle and incremental pose positions

Read `../reviews/punch-out-incremental-pose-1/HANDOFF.md` and section 17 of `docs/projects/PUNCH_OUT.md`. This development candidate extends accepted main 6d07f18 on a feature branch. It retains 30 full poses, adds five explicit incremental X/Y records, and moves the three idle records together in one canonical transaction. Preceding OAM and the observed anchor are required; C-family priority follows original OAM Y=$50. Physical flags/pointers/geometry/code remain protected, and unsupported manual fields still refuse. Application SHA-256: `3cf862ba5210fabe972f1d5c3f7eda32a0e6f7db08b718d35b829de00fb273fc`. Four of 184 runtime inputs change; all five workstation modules, core owners, schemas and emulator remain unchanged. No new public Git push is part of this checkpoint.

## Previous accepted repository baseline: working alpha on main

The owner approved preserving original main as `archive/original-pepsi` and `original-pepsi`, then promoting the accepted alpha into `main`. Read `../reviews/main-alpha-promotion-1/HANDOFF.md`, `../CANDIDATE.json` and `../README.md` first. Root `nes-forge.html` and the source-owned generated app have the same SHA-256 `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322`. All 184 runtime inputs are unchanged; this promotion updates repository entry points, metadata and documentation. From the repository root, rebuild with the existing bundler and run `python3 tools/sync_main_entry.py`. The historical sections below describe their own recorded checkpoints, including failures that have since been fixed; they do not override the current baseline.

## Current: native Glass Joe full-pose placement

Read `../reviews/punch-out-pose-position-1/HANDOFF.md` and section 16 of `docs/projects/PUNCH_OUT.md`. Three additive modules expose 30 full-pose X/Y records through ordinary Scene/Metasprite assets and the existing native build owner. A registered optional metasprite projection masks only this codec's position fields; encoding still proves unchanged piece identity/order/art/flags and uniform translation. Recognition admits only the two position operands of each supported record, with pointers/shared streams/code protected. Preserve schema and previous source/asset owners, the compact workstation, startup repair and all independent workflows. This is visual pose placement, not a damage/attack/collision editor, delta-pose writer, complete animation/fight recovery or native Audio writer.

## Previous: startup repair for the adopted workstation

Read `../reviews/workstation-startup-fix-1/HANDOFF.md` first. The preceding combined HTML threw `NotFoundError` before reaching any adopted UI module: replay UI tried to insert into `emuView` using the canvas after Play view had reparented it. The repaired insertion uses the view's direct containing child. Keep the existing Play view/canvas owner and supplied appearance/resource scripts intact. The tiny regression DOM now refuses invalid anchors once nodes have been mounted; a new jsdom check executes the complete delivered HTML with strict ancestry and actual events, reproduces the broken delivery and verifies the repaired controls. It also covers unavailable local-file preference storage and restoring stored appearance. This is DOM execution evidence, not browser layout, listening or device acceptance.

## Previous combined workstation/native workflow candidate

Read `../reviews/punch-out-native-workflows-1/HANDOFF.md` first. The owner resumed work and adopted the supplied Retro Workstation v0.5 kit. Its five UI modules are source-manifest inputs; the native-overworld routes and metasprite refresh are exact supplied ports. The native artwork factory now initializes canonical collision properties before signing, resolving the paused build failure. Dedicated CHR/fight-palette writes, both-revision Glass Joe replay/seeded phase experiments, Audio, safe prior-reader refusal and retained checks have current reports. Keep the compact retro skin, opt-out fallback, advanced controls, existing owners and per-title tutorials. Do not claim complete fights, native pose/animation/Audio writers, hardware accuracy or a fresh browser layout/listening pass.

## Historical paused WIP

Owner requested pause and GitHub backup at usage limits. Read `../PAUSE_HANDOFF_2026-10-24.md` first. Current source adds unfinished native artwork modules and two shared seams; unchanged building after opening the first art view fails a projection signature check. No passing native artwork lifecycle report or replay service/UI exists yet. Last verified app SHA-256 remains `aceb8cdd70e0839b4649bc56daa39519204b660bbbae100209ad9e66bb03b89a`; the current bundled WIP is separate. Continue the authorized Glass Joe sequence, knockdown/count/round and native CHR/palette scope after the owner resumes.

## Current tutorial requirement

The owner requires a method-specific tutorial for each imported/supported title, alongside the common NES Forge tutorial. Use `docs/projects/README.md`, `docs/projects/PROJECT_TUTORIAL_TEMPLATE.md` and the worked `docs/projects/PUNCH_OUT.md`. `docs/PROJECT_HANDBOOK.html` is one offline book containing these, the full general guide, earlier available title steps and the synthetic exercise. Older title lessons awaiting expansion are explicitly listed; do not claim all tutorials or games are complete. Update the title lesson with each scope/method change and retain independent RE, assembly, hex, HTML and authored-game workflows.

This documentation checkpoint changes no application input, schema, native writer or gameplay behavior. The next implementation milestone remains a verified short concurrent Glass Joe sequence before larger fight phases or new native art writers.

## Current: Glass Joe fight-context recovery

Read `../reviews/punch-out-fight-context-1/HANDOFF.md` and section 14 of `docs/NATIVE_RECOVERY_TUTORIAL.md` first. Recovered content now includes Mac/referee/HUD command/state reference composition. Preserve the source-defined opening position and declared state assumptions; do not label this full fight recovery or runtime capture. Three additive modules use the existing canonical raster/Scene lifecycle. Native arena painting and Audio remain authoritative; other native writers remain open. All 168 preceding application parts are unchanged.

## Current developer/derivative checkpoint

Read `docs/NATIVE_RECOVERY_TUTORIAL.md` and `../reviews/punch-out-developer-1/HANDOFF.md` first. Preserve all independent workflows: visual asset authoring, manual RE, custom assembly, external hex work and direct HTML development. Existing adapter support is not a prerequisite for general byte investigation. Canonical editing, source evidence and native encoders remain distinct.

This checkpoint fixes bounded native arena derivative recognition and adds readable source comments plus the asset/workflow tutorial. It does not add a universal hex editor, native Audio writer or full Punch-Out recovery. The current available gate is 104 checks, not the absent historical full release gate. Ordinary schema 12 and native-source schema 16 remain unchanged.

## Punch-Out player background correction

The owner’s scrambled live HUD/crowd/ring was reproduced with the untouched ROM. The native arena writer was not required to trigger it. Forge’s MMC2 renderer fetched only visible background tiles; Punch-Out uses a tile beyond the visible edge to select the correct graphics bank for the next row. The renderer now performs all 34 background pattern fetches per scanline while drawing only visible pixels. Sprite-only rendering also retains those background bus reads.

Open `NES_Forge_Punch_Out_Player_Fix.html` and load the saved Forge project, then Build & Run again. No re-import or lost arena edits are required. Native arena encoding and capacity limits are unchanged. This corrects the reproduced background-bank corruption; the broader CPU/sprite/raster timing model remains approximate and MMC2 runtime capture still refuses.

Both US revisions reproduce the prior failure on the untouched ROM. The same native state now matches all 14,336 checked HUD pixels against original bank-0 patterns (previous player: 11,501 mismatches). The retained 90 checks plus 14 synthetic offscreen-fetch checks pass. Original-engine build/save/reopen/Undo/Redo/Audio checks are rerun on this HTML. See `reviews/punch-out-arena-runtime-1/` for evidence. Only the MMC2 renderer changes among the preceding 168 bundled inputs. No ROM, decoded art, screenshot or commercial source project is distributed.

## Punch-Out arena native rebuilding

The recovered arena now supports ordinary Scene tile placement and attribute palette-ID edits in the original engine. Open a saved project (including a project already painted in the preceding HTML), use **Recovered content → Open ring and audience**, then **Check arena build** and **Build & Run**. Save Project As preserves the original ROM and the edited canonical Scene. Build & Run starts the original game; enter a fight to inspect the shared arena layout.

The writer recompresses the two setup pages within their original 381-byte data area and updates four owned stream pointers. Busy patterns can exceed capacity and refuse with a size message; no edits are silently dropped. CHR artwork, palette colors, sprites, collision and Audio changes still have no corresponding native writer. $FD/$FE are CHR-latch tiles; edits involving them receive a live-graphics warning. HUD/player drawing can overwrite cells during play.

See `reviews/punch-out-arena-build-1/HANDOFF.md`, `Build_Verification.json`, `Source_Preservation.json` and `gate/Summary.json`. The source remains one ROM plus canonical Scene edits, with the existing native build and project lifecycle owners. Ordinary schema 12 / reader ceiling 16 remain unchanged. No commercial ROM or decoded asset payload is distributed.

## Punch-Out arena recovery checkpoint

The missing fight background was outside the five intro/staging contexts. This additive checkpoint executes original arena programs 1 and 2 on a bounded private PPU bus, then assembles their two nametables at NT1 / scroll $B0 with setup CHR bank 0 and the Glass Joe setup palette. A named **Arena · ring and audience · source setup** Scene is appended on fresh import. Earlier saved projects use **Recovered content → Open ring and audience**, in one Undo transaction.

This is a static setup reference. Health-bar fields retain original setup placeholders; live scores/clock, moving camera, Little Mac, opponent and referee layers remain separate. The original 163 application inputs remain unchanged. Existing background recipes, boxer/metasprite/state tools and Audio are retained; unsupported arena edits save but refuse native ROM building. The original source ROM remains the only native owner.

See `reviews/punch-out-arena-1/HANDOFF.md`, `Arena_Verification.json`, `Source_Preservation.json` and `gate/Summary.json`. No commercial ROM, decoded art, sample, screenshot or source-bearing project is distributed.

## Punch-Out state excerpts checkpoint

The current candidate adds original state/shape execution and explicit timed recovery into Animation. The 365-state matrix per revision yields 119 sprite-size-changing excerpts and establishes 81 previously contextual pose entries. Source sound requests link to the existing Audio library. All 160 preceding runtime modules remain byte-identical. These are bounded observed state paths, not complete fights or native animation/Audio writers. See `reviews/punch-out-states-1/HANDOFF.md` and its fresh verification reports.


## Punch-Out source content checkpoint

The current candidate adds the source-content browser and materializes five preceding background pages plus representative sprite sources/placements/metasprites for 14 fight configurations. All 32 raw CHR banks remain available. Full recovery is **not complete**: animation context, Little Mac/referee states, transitions/collision/AI and native sprite/CHR/Audio writers remain open. See `reviews/punch-out-content-1/HANDOFF.md`, the fresh content/lifecycle evidence and 90-check gate. All 157 original application inputs remain byte-identical.

# Current checkpoint: Punch-Out static backgrounds + Audio

Read ../reviews/punch-out-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Both supplied US revisions now have five static source backgrounds and the original bank-8 Audio driver. Whole-game recovery, fighter sprites, dynamic states, native Audio writing, MMC2 runtime capture and owner listening/hardware acceptance remain unresolved. The bank-6 startup PCM is cataloged and auditionable, with PCM tracker editing still unavailable. Every project must verify both Scene and Audio.

## Earlier handoff

# Current checkpoint: Shadowgate static pictures + Audio

Read ../reviews/shadowgate-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. This checkpoint covers 130 static picture slots and the native Audio driver: 14 music requests, 20 SFX and one explicitly unavailable request. Object/door overlays, alternate states, UI/text, puzzle logic, animation, native Audio writing and whole-game/browser/hardware acceptance remain unresolved. Every project must verify both Scene and Audio.

## Earlier handoff

# Current checkpoint: River City street + Audio

Read ../reviews/river-city-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. This checkpoint covers 13 street locations/36 cropped backgrounds and the native Audio driver; 22 special/interior locations remain unavailable. Every project must verify both Scene and Audio.

## Earlier handoff

# Current checkpoint: Lolo Audio

Read ../reviews/lolo-audio-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. The owner accepted Lolo Scene appearance and reported its missing audio driver; this correction adds 10 music cues and 24 SFX. Every supplied project must verify Audio as well as Scene before closing a checkpoint. Unsupported drivers and native audio writers remain explicit open items.

## Earlier handoff

# Handoff

Use `python tools/bundle.py`, then `node tests/run_all.cjs` from this directory. The shared Open ROM / project entry stages capability inspection; importing or opening a native map remains explicit. Existing specialized buttons and all five gameplay templates remain available.

See `docs/PROJECT_EXPANSION.md` and `research/project-expansion-1/corpus.json` for ten-input scope, source provenance and limits. Actual private-source tests require the existing supplied Zelda II and Ninja Gaiden ROMs; these must never be distributed. Current reports live in `../reviews/project-expansion-1/`. No Git push or promotion is implied by a local review candidate.
