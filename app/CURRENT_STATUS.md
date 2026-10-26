## Current: connected pose, Resources and native graphics workflow

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

# Current branch: idle/incremental pose position candidate

See [the current handoff](../reviews/punch-out-incremental-pose-1/HANDOFF.md) and [title lesson, section 17](docs/projects/PUNCH_OUT.md#17-edit-native-idle-and-incremental-poses). The existing native pose writer now supports 30 full and five explicit incremental records, grouped idle movement and source-derived priority previews. The original full-pose/art/palette/arena workflows remain. Source state observations, real exported/reimported idle playback, canonical lifecycle and the 104 available checks have separate reports. This is a development candidate on `implementation/punch-out-pose-edit-2`; the accepted public main baseline is recorded below.

## Accepted main baseline before this candidate

**2.0.0-alpha.11 · Retro Workstation and native Glass Joe full-pose positions.** The owner approved this development baseline for `main`, with the original Pepsi version preserved on `archive/original-pepsi` and tag `original-pepsi`. Open `../nes-forge.html`; its bytes match `mainline/NES_Forge_2.0.0-alpha.11.html` (SHA-256 `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322`).

Read [the repository entry](../README.md), [promotion handoff](../reviews/main-alpha-promotion-1/HANDOFF.md), [project handbook](docs/PROJECT_HANDBOOK.html) and [per-title methods](docs/projects/README.md). All 184 runtime inputs are unchanged by promotion. Fresh available checks comprise 104 public cases, 10 strict parsed-DOM startup/control cases, both-revision native pose/art lifecycle checks and parsed-DOM native pose editing. The unavailable full historical release gate and physical browser/device/listening/controller/hardware acceptance remain separate.

Punch-Out supports documented native arena, physical CHR/fight-palette and 30 full-pose X/Y edits, plus bounded original-engine replay experiments. Full fights, individual native geometry, delta-pose/animation writing, attack/damage/collision and native Audio writing remain pending. Preserve the existing canonical owners, source comments, compact workstation and independent RE/coding/hex/HTML workflows.

The sections below retain earlier checkpoint reports. Their old filenames, counts and pending items describe their recorded states and do not override this current baseline.

## Historical: Punch-Out player background correction

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

# Current status

**2.0.0-alpha.11 · Punch-Out static backgrounds + Audio review**

Both supplied US PRG revisions import five static native background contexts with MMC2 latch-aware graphics, original palettes and bounded native literal edits. Shared physical operands retain one owner; generated/inherited cells, metadata aliases and latch-control IDs refuse. Fighter/sprite layers, dynamic UI, animation, collisions and full fights remain unresolved.

Audio installs 84 entries per revision: 23 sounding music requests, 45 procedural effects, seven DPCM requests, one startup PCM routine, six empty slots and two stop controls. Native audition and finite editable tracker/SFX conversion use the existing Audio Library. No native Audio writer; DPCM is auditioned from source and omitted from canonical edits. The bank-6 startup PCM is cataloged for native audition; PCM tracker editing remains unavailable.

Read ../reviews/punch-out-1/PUNCH_OUT_REVIEW.md, HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Current checks are in gate/Summary.json and Supplied_Summary.json. This restored source snapshot contains eight public suites, so the historical 386-case/25-suite gate is not claimed as a fresh rerun. Browser listening, full fights, hardware, MMC2 runtime capture, the full release gate and alpha promotion remain pending.

## Previous checkpoint

# Current status

**2.0.0-alpha.11 · Shadowgate static pictures + Audio review**

Shadowgate imports 130 static picture-table slots with original background CHR, standard palettes, native 8×8 tile substitution and save/reopen/rebuilding. Native tile coordinates (2,4)–(15,17) form the 112×112 crop displayed at Scene (0,0). These are source picture slots, not 130 distinct gameplay rooms. Objects/doors, alternate room/palette states, UI/text, puzzle logic, animation and full gameplay remain unfinished.

Audio includes 14 music requests (13 unique headers), 20 SFX and one invalid standalone slot with playback/conversion disabled. Native audition and finite editable tracker import are installed. There is no native Audio writer. A source-guarded header-view wrapper uses MMC3 for Forge emulation while preserving the supplied legacy header in saved/rebuilt files.

Read ../reviews/shadowgate-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Every project must verify Scene and Audio. Current evidence: 386 focused compatibility checks / 25 suites, five picture verification groups and 42 Shadowgate Audio checks. Retained River City street/Audio, Lolo room/Audio and Metroid Audio checks pass on the same HTML. Owner browser listening, physical devices, the full release gate and alpha promotion remain separate and pending.
