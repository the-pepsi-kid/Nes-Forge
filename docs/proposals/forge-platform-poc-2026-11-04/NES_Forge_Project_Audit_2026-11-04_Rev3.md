# NES Forge — Project-Wide Baseline Audit · Revision 3

**Audit date:** November 4, 2026  
**Revision 3 scope:** Preserve Revision 2 technical findings; add the proposed hardware bridge, NES HUB research, portable cyberdeck, native 6502 cryptography, and Stellar/ForgeNet concepts as a clearly separate experimental architecture and PoC plan. No application code changes authorized.  
**Decision state:** Development paused; this document is an audit and a proposed stabilization plan, not approval to edit, merge, publish, or push anything.  
**Inspected artifact:** `NES_Forge_Consolidated_RC2_Build_5.zip` in the saved `/forge` Library collection.

## 0. Audit standards and limits

Three evidence classes are used throughout:

- **I — Independently checked in this audit:** ZIP CRC, all package SHA-256 entries, editor aliases and deterministic bundling, source manifest counts and Git bundle advertised heads. These checks apply to the saved package, not to a live Windows installation.
- **R — Retained validation evidence:** Tests and reports stored in the candidate, some pinned to the RC2 editor and some to earlier releases. Their output and recorded hashes were examined; the complete suites were **not** rerun in this audit.
- **U — Unverified/owner acceptance required:** Actual real-browser interactions in the owner's environment, hardware rendering/listening, total game recovery, original behavior parity and public-network security. This audit attempted Chromium; `file://` navigation was blocked by environment policy and an HTTP-server fallback timed out. Neither result establishes an application defect.

The archive's status statements are treated as claims scoped to their recorded tests, not as blanket completion. Private original ROMs were not included in the archive or newly supplied for this audit. **No game source, Git repository, browser save, user ROM, server state, or project file was altered** for this evaluation.

## 1. Summary verdict

**The core is real; the saved package is internally consistent; release provenance, public distribution, user-journey acceptance, and full per-game recovery remain unresolved.**

Project risk is driven primarily by unclear boundaries between (a) core NES authoring, (b) exact-ROM research and limited native editing, (c) hosted Zelda II multiplayer, and (d) separate creative demonstrations. All four have been developed in parallel, so features may exist without a reliably accepted cross-tab workflow. Freeze expansion, preserve the RC2 candidate, and qualify the canonical core before further individual-game development.

Revision 2 decisions remain in force: **image upload is core authoring and merits a gated improvement**; **DPCM/FX is a valid missing audio capability but the three supplied snippets are not mergeable**; **release/host review findings change stabilization gates rather than justify new features**. **Revision 3 adds experimental architecture and a PoC gate, not completed capabilities.** See Sections 14–21.

This is **not** an assertion that Forge is fundamentally broken. The saved candidate has valuable functionality, extensive prior work, and a meaningful integrity/preservation system. But neither a test count nor a ZIP filename can substitute for an executed acceptance journey.

## 2. Release and recovery identities

| Attribute | Inspected value |
|---|---|
| ZIP | `NES_Forge_Consolidated_RC2_Build_5.zip` |
| ZIP bytes | 46,302,037 |
| ZIP SHA-256 | `94b5533936851b0307ecc13dd16d08165c1618ab173ee574e9b629fc8228df5c` |
| Expanded file bytes | 121,353,465 |
| Package entries | 2,357 |
| Release | `forge-consolidated-rc2`, owner review build 5 |
| Branch | `integration/forge-consolidated-rc2` |
| Pinned commit | `91d9f767a8e944ff4138790e47b87faafe41aeeb` |
| Accepted public main in release | `6d07f1875074f1b3388cd647ff6177423d45acc7` |
| Editor hash | `556d50459c31bfd28da012ec3f0a0c062896637d7d6c327c287f9680755ff7b6` |
| Modular bundle parts | 214 |
| Recovery Git bundle | 1 integration tip and 6 preservation/recovery tips |

**Source of truth:** The review kit's `RELEASE.json`, `docs/recovery/STATE.md`, `docs/recovery/sources.lock.json` and canonical `app/source-manifest.json`. GitHub public `main` and the saved integration candidate must remain distinguishable. Do not promote the latter merely because it exists.

The four editor copies (`NES_Forge.html`, `nes-forge.html`, `app/mainline/NES_Forge_2.0.0-alpha.11.html`, the hosted v17.1 HTML) are byte-identical in this package. That resolves the earlier problem where someone might open two different editors in the same review kit, but it does **not** mean their separate runtime support packages or contexts are identical.

## 3. Physical inventory

| Group | What is in the kit | Audit interpretation |
|---|---|---|
| Canonical editor | `app/src/` (214 parts), `app/source-manifest.json`, generated standalone HTML | Actual platform; keep one code owner and deterministic build |
| Authoring & compile | CHR, palettes, tiles, metatiles, Scenes, World, sprites/metasprites, animations, entities, movement/gameplay, authored Audio, ROM compiler | Exists in source; global end-to-end acceptance remains needed |
| Emulator & tooling | 6502 core, emulator bridge, debugger/timeline, mapper-specific handling, PPU/APU observations, ROM-source analysis | Good foundation; not synonymous with every game's gameplay recovery |
| ROM intake | Exact-hash coverage, bank/resource inspection, general container parsing, ROM-first Project Gateway, import/provenance | 28 recorded revisions; basic identification is distinct from complete extraction |
| Native game recovery | Named adapters for Zelda II, Metroid, Ninja Gaiden, Punch-Out!!, Lolo, Shadowgate, River City and others | Highly unequal coverage and per-game native writers |
| Workspace | Resources explorer, Connected Workspace, source-context selection, recovery evidence, tutorials, layout/skins | Integration exists; UI clarity and cross-tab truth require owner verification |
| Hosted experiment | v17.1 server/client/Python launchers, optional wallets, shared rooms, Rev 8 reference and regression lab | Optional consumer, not the core editor; keep isolated |
| Supporting assets | 3 skins, 2 manuals, Teapot demonstration ZIP and an audio WAV = 7 loose assets | Registered and hashed; not a general game corpus |
| Retained histories | ~1,677 entries under `reviews/`, plus handoffs, captures, logs and immutable Git bundle | Most ZIP entries are historical test evidence, **not** separate active features |
| Original commercial ROMs | No top-level `.nes` inputs or saved host database included; synthetic Teapot ROM is inside its example ZIP | Good distribution practice; exact-source tests require owner-held originals |

A 480-row saved-input register records identities, links and fingerprints; it does not imply 480 assets are physically distributed. Current package layout is large partly because reproducible evidence was retained.

## 4. Functional pillar audit

| Pillar | What exists | Judgment | Missing acceptance |
|---|---|---|---|
| New Forge game | World, Scene, CHR, metatiles, collision, player, animation, Gameplay Core | Implemented, maturity not fully qualified | Blank project → edit → build `.nes` → actual emulator → save/reopen → rebuild must all pass together |
| Authoring UX | Source/resources/context navigation, dense workstation UI, skins | Integrated but complex | Every tab must edit its intended canonical resource; no hidden/uncommitted changes or stale previews |
| Image upload (background Scene) | Legacy canvas import exists; proposed aspect-aware, palette-aware, cost-optimized importer reviewed | Core usability gap, candidate patch not promoted | File upload and drag/drop, aspect/palette choices, 256-tile behavior, undo/save/reopen, real ROM output and emulator capture regression |
| Project persistence | Typed projects, schema versions, project store, import/export, Undo/Redo paths | Multiple bounded tests retained | Complete cross-domain state roundtrip without losing identities, audio or native changes |
| Compiler/build | Native authored game compiler; per-game narrow native writers | Two distinct output modes | Capability display must distinguish authored ROM build vs modifying a commercial ROM; unsupported paths refuse safely |
| Emulator | 6502/mapper/PPU/APU infrastructure, playback and tracing | Functional foundation | Correct visual/audio behavior and input on local devices; cross-emulator results for authored ROMs |
| ROM intake | iNES-family structural detection and registered exact revisions | Broad metadata identification | No unsupported file should be mislabeled as reconstructed game; preserved source identities and derivatives |
| Reverse engineering | Static and runtime traces, source-linked resources, game-specific adapters | Rich but partial | Each inferred/observed resource must carry provenance and evidence; reconstruct original topology/collision where possible |
| Audio | Authored Audio Runtime; multiple native cue/driver profiles | Source playback and adapters, not universal recovery | For each game: driver identify, cue test, owner listening, edit/reopen, explicit writer capability |
| Audio DPCM/FX expansion | Current executable authored runtime supports four synthesis channels; DPCM native observation is not an editable sample score | Valid future requirement; owner-proposed patches are technically incomplete | Executable DPCM sample placement, 6502 register use, 5-channel event contract, trigger and loop behavior, safe sample data, and independent listening |
| Multiplayer | Zelda II hosted v17.1, wallets, shared-world state, server-owned combat/collision experiments | Experimental; significant work | Genuine original motion/animation/combat parity, state-safe setup/resume, uninterrupted two-client playtest |
| Documentation | Project handbook, manual, recovery lessons, title-specific guides, code/RE workflows | Extensive but scattered | A single official starting point, current capability map and per-project quickstart |
| Packaging & provenance | Deterministic four-entry build, release hashes, source-lock refs, git bundle, checksum list | Strong in saved candidate | Independent fresh restore on owner's Windows machine; verify future changes using same gates |

## 5. Recorded recovery coverage

The authoritative coverage ledger has **22 title groups and 28 original ROM revisions**. Of 28 revisions, **17 partial** and **11 unresolved**; the ledger explicitly sets `fullRecoveryComplete: false`. No revision is recorded as fully recovered.

| Domain | Partial revisions | Unresolved revisions |
|---|---:|---:|
| Areas/scenes | 17 | 11 |
| Graphics | 17 | 11 |
| Menus | 0 | 28 |
| Animation | 5 | 23 |
| Collision | 2 | 26 |
| Actors | 2 | 26 |
| Audio | 12 | 16 |
| Objects/text/flags | 0 | 28 |
| Resource relationships | 17 | 11 |
| Resource lifecycle | 14 | 14 |
| Native ROM writer | 12 | 16 |
| Executable behavior | 6 | 22 |

**Interpretation:** A "partial" entry can be as narrow as a one-byte native edit, a table reader or a captured frame. It is not a percentage of game completion. Supported game names should never be represented as all 22 games being editable or playable end-to-end.

### Title-by-title register (first revision summarized; all revisions covered by ledger)

| Game | Revisions | Recorded status | Native writer | Bounded integrated work |
|---|---:|---|---|---|
| 1943 | 1 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Adventures of Lolo | 1 | partial | partial | 50 native room backgrounds, fixed-capacity terrain/heart substitution and verified original CPU/PPU comparisons |
| Battletoads | 1 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Castlevania | 2 | partial | unresolved | 6 source-linked captured scenes, 9 editable metasprites and 6 animation records |
| Castlevania II | 1 | partial | unresolved | Native layout tables, raw tile categories and revision-bound Audio inspection/playback. |
| Contra | 1 | partial | partial | 144 source slots, 126 available initial-state resources, 18 unavailable states, bounded native block writer. |
| Double Dragon | 1 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Final Fantasy | 2 | partial | partial | 61 standard maps, normal/room palette states, 2440 pages, bounded native block writer |
| Gun Smoke | 1 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Hudson's Adventure Island | 1 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Kid Niki - Radical Ninja | 2 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Kirby's Adventure | 2 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Kung Fu | 2 | unresolved | unresolved | Preserved source and physical CHR inspection only; game resources and native edits unresolved. |
| Mega Man | 1 | partial | partial | 167 native room records; 320 initial stage-state pointer slots, 282 materializable / 564 pages; native one-byte block substitutions, shared normal/Wily ownership, guarded lifecycle and source-byte … |
| Mega Man 2 | 1 | partial | unresolved | Native screen slots, stage-dependent collision categories and revision-bound Audio inspection/playback. |
| Metroid | 1 | partial | partial | 193 source room slots / 191 physical room records across five areas; ordered native background projection, initial graphics/palettes and single-byte native structure replacement |
| Mike Tyson's Punch-Out!! | 2 | partial | partial | Both US revisions: ring and audience layouts, latch-aware CHR and fight palettes; source-linked poses and bounded position editing; Glass Joe count/health recipes with save/reopen, native build/exp… |
| Ninja Gaiden | 1 | partial | unresolved | Native rooms and ground kinds, 13 player animation scripts, source-linked resource inspection and Audio catalog. |
| River City Ransom | 1 | partial | partial | 36 cropped native street segments in 13 locations, shared physical-tile editing and Audio catalog/playback/transcription |
| Shadowgate | 1 | partial | partial | 130 static picture-table slots with original background CHR, standard palettes, bounded native tile editing and save/reopen/rebuild |
| Teenage Mutant Ninja Turtles | 1 | partial | partial | 20 Area 1 side-view layouts, initial background/palette and bounded native block writer. |
| Zelda II | 1 | partial | partial | Four native overworld terrain maps, bounded terrain/location/scene writers, source resource and Audio catalogs. |

### Evidence examples, not completed game claims

- **Zelda II:** Four native overworld terrain maps and bounded writers are recorded. Hosted 2-player mechanics are a separate workstream with a Rev 8 reference. Original full game mechanics do not automatically transfer.
- **Punch-Out!!:** Both original US revisions have narrow Glass Joe count/health edit and reimport workflows, ring/audience evidence and animation/replay tools. Other fighters and full engine state behavior are incomplete.
- **Castlevania:** Both original US revisions offer six captured scenes, nine metasprites, six animations and stage-01 courtyard pages; sound-request and driver observation advanced. Castle interiors, collisions, full actors and native score writeback are not complete.
- **Metroid:** Initial rooms/graphics/palettes and a constrained native structure edit exist; full gameplay/level behavior and many engine states are not reconstructed.
- **Other titles:** Lolo, Ninja Gaiden, River City Ransom, Shadowgate, Final Fantasy, Contra, Mega Man and TMNT all have distinct bounded adapters; many remaining titles are structural-intake-only.

## 6. Test and evidence audit

### Independently verified in this audit (I)

- ZIP CRC check: **pass**.
- `CHECKSUMS.sha256`: **2,356 entries, 0 missing, 0 mismatched**.
- Release JSON editor digest and `docs/recovery/rc2-results/summary.json` digest: **match**.
- Git bundle digest and seven advertised heads: **match**.
- All four generated HTML editor entry points: **same SHA-256**.
- `python app/tools/bundle.py --check`: **pass**, reporting 214 source parts.
- No top-level commercial `.nes` or persistent database file found in the extracted package. The packaged distribution scan additionally reports that 28 known commercial original ROM digests were absent.

### Recorded as passed by the RC2 evidence (R), not re-executed here

- 28 original-ROM intake identities; 17 coverage UI/identity checks.
- 104 native-profile checks.
- 13/13 RC2 regression-lab groups.
- Four Castlevania/Punch-Out browser workflow cases.
- Castlevania narrow graphics/audio tests for both US revisions, including the three courtyard pages and 49 original sound requests per revision.
- Safe hosted-world initialization and repair behavior; reported two-wallet local checks; restoration/repackaging abuse tests.
- Separate public/owner candidate evidence reports, with checksums anchored in the release receipt.

### Important evidence caveat

Some retained evidence, including `hosted-suites.json`, `renderer.json` and `observer.json`, is tied to an **earlier editor hash** (`8d46d98d...`) rather than the delivered RC2 HTML (`556d5045...`). The retained 267/267 hosted assertions must not be advertised as newly rerun against RC2. Other current reports do match RC2's hash, and the release correctly preserves older evidence as historic evidence. The acceptance dashboard should distinguish **current exact-build passes**, **retained prior passes**, and **owner/device acceptance**.

### Unverified / blocked (U)

- Fresh local user browser startup was not independently confirmed in this audit: `file://` navigation was denied by environment policy, and the localhost fallback timed out. These are execution-environment blockers, not proven Forge defects.
- Native `.nes` gameplay for a complete new game was not cold-booted in an independent NES emulator here.
- All 28 original ROMs were not retested from owner-held bytes in this pass.
- Full original-game maps, behavior, enemy AI, music arrangements, collision and stage transition parity are **not certified**.
- Physical controller/touch input, real audio listening, GPU/scanline fidelity and real Windows launcher flows are **not certified**.
- Public-network security, wallet privacy and adversarial hosted testing are **not certified**.

## 7. What went wrong organizationally/architecturally

1. **Four roadmaps occupied the same product:** an NES game authoring IDE, a game disassembler/reconstructor, commercial ROM patching tools and a persistent multiplayer world. Each is viable separately; their acceptance gates are not interchangeable.
2. **"Supported ROM" was too broad:** exact-intake success, thumbnail/capture, native import, bounded source edit and complete playable recovery have not always been distinguished in conversations.
3. **Source-of-truth drift:** multiple release ZIPs, branch tips, demo scripts and historically dated handoffs created competing definitions of "latest Forge." RC2 addresses part of this, but public `main` is intentionally behind the integration candidate.
4. **Cross-editor state ownership is the biggest remaining integration risk:** Scene/CHR/World/Audio/Resources can show different views of the same underlying data. The project must tell users precisely what is source evidence, a copy, current authored project state or active emulator state.
5. **Test quantity can hide acceptance gaps:** many synthetic, isolated and retained regressions are valuable, but they cannot certify the entire in-app workflow or an original game's frame/behavior parity.
6. **Multiplayer caused difficult regressions** (movement, idle packets, camp spawn, focused inputs); RC2 reports bounded repairs, but gameplay parity and owner acceptance remain separate.
7. **Documentation volume exceeds discoverability:** tutorials and historical reports exist, but the user needs one feature map, one current HTML, one beginner path and one developer path.
8. **No release should be certified by chat claims:** exact application commit/hash + evidence + a repeatable owner review checklist are mandatory.

## 8. Risk register

| Priority | Risk | Impact | Immediate control |
|---|---|---|---|
| P0 | No independently accepted canonical end-to-end authoring journey | Cannot confidently say Forge can make a finished original game reliably | Freeze enhancements and complete a blank-project build/save/reopen/ROM play acceptance test |
| P0 | Old releases and the local integrated candidate are conflated | Wrong build and lost feature perception | One `CURRENT_RELEASE.md` pinned to commit/hash and explicit `accepted`, `candidate`, `archive` labels |
| P0 | Partial ROM support mistaken for full native recovery | False confidence and repeated rework | In-app per-title capability matrix: supported, partial, evidence-only, unsupported |
| P1 | Project/source/evidence/current emulator ownership not always obvious | Stale asset, lost edits, invalid native writes | Shared versioned resource model and cross-tab roundtrip contracts |
| P1 | Native per-title edit proof too narrowly scoped | Unexpected corruption in other scenes/revisions | Exact-hash authorizations, safe refusal, independent ROM diffs and source trace comparison |
| P1 | Earlier hosted test report carried into current package | Overstates current multiplayer acceptance | Re-run identical current-build 2-wallet and movement scenarios, compare to Rev 8 and original ROM |
| P1 | Audio profiles / native writing gap | Audio seemingly plays but cannot save back to source format | Show separate detected, auditionable, editable, re-encodable labels |
| P1 | Proposed DPCM/FX patches would desynchronize events or misprogram the APU | Potential broken ROM builds, memory corruption or unintended silence | Do not merge; agree sample format, bank allocator, 6-byte/event ABI and hardware-backed tests first |
| P1 | Legacy background image upload stretches sources and degrades late tiles when the budget is full | Images lose proportions, captions and important content | Gate candidate importer through browser upload, CHR/attribute invariants, save/reopen, undo and independent ROM play |
| P2 | UI complexity/skin or Resources regressions | High user friction; features perceived as missing | Navigation, density, appearance, edit-state visibility smoke tests |
| P2 | Historical records crowd release and docs | Time wasted finding correct file | Move audit archive behind a clear top-level map, never delete history |
| P2 | Shipping proprietary ROM bytes or player data | Licensing/privacy problems | Preserve current private-input exclusion, license review, distribution scan |

## 9. Recommended architectural boundary

**Core Forge** should own a single, versioned project graph and deterministic transactions: source identity, resource registry, CHR/tiles/palettes/metatiles, Scenes/Worlds, animation/metasprite/entity/audio, source workspace, native/authored build, emulator and project persistence. All UI tabs read/write the same canonical graph via explicit operations.

**Recovery adapters** should be opt-in from the ROM intake layer. They produce identified, source-linked typed resources with confidence levels (`observed`, `inferred`, `verified`, `unknown`) and clearly declare any native writers and refusals. Raw data alone never becomes canonical playable behavior.

**Hosted-world adapter** must remain optional, using verified canonical movement/actor/room rules where such rules exist. Preserve original Zelda II Rev 8 as a regression fixture; hosted XP/economy/wallets should not dictate the standalone editing model.

**Demonstration content** should be last and not an architecture dependency. A game is an acceptance fixture only if it can run entirely through supported Forge UI and build flows.

## 10. Proposed acceptance gate before feature expansion

### Gate A — Identity and stability

- [ ] Record one immutable RC2 Build 5 ZIP SHA, branch, full commit and editor digest in an owner-visible release dashboard.
- [ ] Run a clean Windows restore from the supplied Git bundle (including six recovery refs) and compare all tracked files.
- [ ] Reproduce the source manifest build and verify all four generated entry points.
- [ ] Reconcile the actual outer ZIP SHA/byte count against the mismatched distribution scan; distinguish tested-source, package-validation and final-release commits in one manifest.
- [ ] Separate editor distribution from restricted/private recovery evidence and full Git preservation bundle; no commercial CHR/scene exports in a public package without rights review.
- [ ] Run startup in desktop Edge and Chrome with no console exceptions; record exact versions and machine info.
- [ ] Load/save/reopen without a ROM, with a known Forge project and with an unsupported original ROM, confirming safe error behavior.

### Gate B — First complete original game lifecycle

- [ ] Start from **New Project**, not a prebuilt fixture.
- [ ] Create and edit a tile, palette, metatile, Scene, World, sprite/metasprite, animation, collision, player and one audio cue.
- [ ] Verify Undo/Redo and project persistence after each domain.
- [ ] Test PNG, JPEG and alpha PNG background image import with aspect retention/crop/stretch, auto/current palette, and tile budgets below/at/above 256; inspect tile and attribute integrity, resource provenance and emulator capture unchanged.
- [ ] Build an authentic `.nes` and cold-boot it in Forge and an independent emulator.
- [ ] Verify controller navigation, movement, jump/attack, state changes, scene/World transition, audio and reset.
- [ ] Save as a native project, close Forge, reopen and rebuild; compare semantic behavior and applicable hashes.
- [ ] Inspect Resources and Connected Workspace after every step: same canonical identities and edits, no stale previews or silent copies.

### Gate C — Source ROM recovery workflow

- [ ] Choose **one** known-supported title and **two** exact revisions as the bounded proof case; original files stay private.
- [ ] Identify ROM exact SHA/mapper; show precise recovery grade and unresolved domains.
- [ ] Recover one original Scene, collision datum, actor state and audio cue with source evidence where supported; do not fabricate unavailable data.
- [ ] Test a supported native edit through Undo/Redo → save/reopen → build/export → independent byte diff → reimport.
- [ ] Verify unaffected regions, native audio preservation and unsupported-writer refusal.

### Gate D — UI and release readiness

- [ ] Verify density, Retro Workstation appearance, all skins, Resources filters, Connected Workspace, native World/Area Library, scene switching, mobile viewport and shortcuts.
- [ ] Publish a single official **feature-status and limitations screen** generated from a machine-readable coverage ledger.
- [ ] Move historical test evidence to an archive index while keeping it reproducible; maintain a concise current release summary.
- [ ] Re-run affected unit/integration suites on exact release hash; separate fresh tests from retained historic evidence.
- [ ] Publish an audio capability matrix separating original APU trace, native audition, frame-sampled tracker adaptation, authored four-channel ROM playback and future DPCM sample playback.
- [ ] Prohibit shipping the owner-proposed DPCM/FX driver snippets as functional audio until Section 15 design and hardware gates pass.
- [ ] Only after A–D pass, decide whether to promote RC2 to a new accepted release.

### Gate E — Optional multiplayer acceptance (separate release)

- [ ] Verify fresh setup does not destroy saved worlds; `--repair-assets` only fills missing assets.
- [ ] Open two browser clients with separate test wallets in the same room.
- [ ] Check neutral input on blur, final idle/attack/jump packets, camp spawn and frame/position continuity.
- [ ] Compare original ROM traces and accepted Rev 8 frame traces using explicitly declared intentional deviations.
- [ ] Test cleanup, disconnect/reconnect, data retention and threat model; do not tie hosted readiness to native editor readiness.

## 11. Freeze / preserve / resume decision

**Freeze immediately:** new titles for the sake of title-count increases, additional side-game demos, speculative MMO mechanics/economy, broad visual redesign, multiple separate HTML forks, unverified "full recovery" assertions. These are **deferred**, not deleted.

**Preserve:** RC2 Build 5 ZIP and its SHA, accepted public alpha baseline, original Pepsi archive, six recovery branches, all test evidence, exact source ROM provenance records, owner saves/private ROMs and frozen Rev 8 reference. Do not push or merge without owner authorization.

**Resume first:** canonical feature/ownership map and Gate A+B (one complete blank-project game lifecycle), then Gate C (one exact-source recovery and safe native write). Only then plan more adapters or multiplayer improvements.

## 12. A concise definition of 'NES Forge works'

A user can create or import a project, see exactly what is and is not supported, edit the actual canonical resources through Forge's tabs, undo/save/reopen without loss, build a valid target ROM when permitted, run it reproducibly, inspect the outcome in the emulator and export their work. Every observed native fact is traceable to an original source and every unsupported writer refuses without corrupting data. Experimental multiplayer is optional and cannot destabilize that core journey.

That is the milestone to optimize for next, not the count of game titles, tests, branches or demos.

## 13. Inspection pointers (relative to extracted RC2 root)

- `RELEASE.json`, `CHECKSUMS.sha256` — package identity and file-level hashes
- `START_HERE.md` — owner operational instructions
- `docs/recovery/STATE.md`, `docs/recovery/RESTORE.md`, `docs/recovery/sources.lock.json` — release history and restoration
- `app/source-manifest.json`, `app/tools/bundle.py` — canonical editor construction
- `docs/recovery/extraction-coverage.json`, `app/src/services/recovery-coverage.js` — exact revision support ledger
- `docs/recovery/rc2-results/summary.json`, `docs/recovery/rc2-results/*.json` — current/retained test receipts
- `Regression_Lab/` — Rev 8 differential checks and authority boundaries
- `docs/architecture/REPOSITORY_LAYOUT.md` — code ownership
- `Regression_Lab/Pipeline/PLATFORM_ARCHITECTURE.md` — generic ROM recovery architecture
- `reviews/PROJECT_VERIFICATION.md` — per-game Scene/Audio closeout standard
- `Recovery/Castlevania/AUDIO.md` and `GRAPHICS.md` — bounded recovery examples
- `app/docs/PROJECT_HANDBOOK.html` and `app/docs/projects/` — application lessons

**Audit outcome:** preserve RC2 as an intact, reproducible and technically promising **candidate**. Do not characterize it as finished or accept a new public release before Core Gates A–D pass. Multiplayer Gate E is independent.

---

## 14. Supplemental review — owner-provided feedback and image upload patch (November 4, 2026)

**Audit-only status:** No original RC2 archive, shipped release or GitHub branch was changed. The image patch was inspected and exercised in a disposable working tree, not promoted or accepted. The owner-supplied review includes findings not independently tested here; these are distinguished below.

### 14.1 Upload Image — existing behavior and replacement proposal

Current RC2 `app/src/legacy/00-editor.js` does have an **Upload Image** action. It reads the source through an `<img>` and canvas, stretches every input to 256×240 regardless of aspect ratio with image smoothing disabled, then calls the same `quantizeFrame()` function used by emulator capture. Quantization uses the active project's palettes and exhausts 256 background tiles in traversal order; image features later in the scan are degraded by nearest existing tile matching. It creates a new scene; it is not a general-purpose sprite, metasprite, world, or collision import. This was verified against actual RC2 source.

The supplied `image-import.patch` proposes a distinct pure `ForgeImageToNes` module and a bounded UI integration:
- Keep-aspect (default), fill/crop, or stretch geometry, plus box-filter downsampling.
- Automatic four-palette NES fitting (default) or preservation of the current palette.
- Error-minimizing tile merges within the 256-tile budget rather than first-come allocation.
- Scene provenance identifying source dimensions and chosen conversion options.
- Retaining the original emulator-capture `quantizeFrame()` intact.

The supplied `before_after.png` is a useful visible demonstration. The report claims caption-band F1 gains (e.g., 0.57 to 0.96 for a fixed geometry/palette comparison). **These figures are author-reported**, not re-scored here against the original image bytes. Independently inspected patch files match the source and test artifacts in the submitted ZIP. A separate temporary patched copy parsed with Node, passed deterministic `bundle.py --check` (215 parts, 4,252,441 generated HTML bytes), and its pure module successfully converted a generated circular image to a valid 960-entry nametable, 64-byte attribute table and 44 unique tiles. The attached 9-check jsdom suite could not be rerun in this environment because jsdom was unavailable. No real-browser Image upload, drag/drop, save/reopen, export-to-ROM or mobile UI test was performed.

**Decision:** High-value candidate for core authoring quality; **accept for isolated integration testing, not immediate promotion**. Minimum gate: actual browser upload of PNG/JPEG/transparent PNG; keep aspect, fill and stretch; palette Current vs Auto; >256 tiles, <=256 tiles and exact-limit cases; undo/redo; saved scene roundtrip; drag-drop parity; CHR/palette/nametable/attribute validity; mapper-0 ROM build/play; emulator capture unchanged; conversion latency and responsive UI. Distinguish imported *background scene* from sprite/metasprite/animation import. In future, optional text-grid alignment and protected-region masks may preserve user-important detail, but are not release prerequisites.

### 14.2 Feedback review — verified facts and claims requiring additional tests

| Observation | Basis | Audit interpretation |
|---|---|---|
| Outer archive identity differs from distribution scan receipt | Independently calculated 46,302,037-byte outer ZIP SHA `94b5533936851b0307ecc13dd16d08165c1618ab173ee574e9b629fc8228df5c`; owner-reported scan references a different byte count/digest | **Verified against actual ZIP**: physical file is intact, but external receipt mismatch must be reconciled; exact archive identity is part of release acceptance |
| Multiple editor identities and stale documents | Verified `app/source-manifest.json` release `forge-consolidated-rc2` yet output named `NES_Forge_2.0.0-alpha.11.html`, multiple current-state sections, and separate source/test/tip commit IDs | **Verified:** enforce one canonical release page, release-name-consistent output, test provenance and a single owner-facing checked artifact |
| 214 concatenated source scripts, four identical HTML aliases | Verified manifest and ZIP | **Verified:** retain deterministic builder but stop treating four copies as four primary entrypoints; bundle currently has 214 parts, temporary image patch 215 |
| Test status overgeneralizes | Verified `summary.json` has `passed: true`, and contains `retainedEvidence`; predecessor gates and active hash differ | **Verified in principle:** display fresh / retained / simulated / owner-required separately; do not treat a receipt as browser, hardware, live host or ROM playback certification |
| Frozen Rev 8 differs from live host | Independently compared SHA-256 of `server.py`, `client.js`, and `PREPARE_PRIVATE_Z2_DEMO.py` under `Regression_Lab/reference_rev8` vs live experiments; all differ | **Verified:** Rev 8 is a comparison baseline, not an identical running host. Every change should have explicit patch review and behavioral delta documentation |
| Hosted wallet flow defaults to injected wallet and Ethereum mainnet | Owner-supplied reviewer finding and code locations | **Requires UI/security walkthrough:** create local test identity as default for localhost pilot; make real wallet opt-in; avoid presenting signing as a required gameplay step |
| `--pilot-sword-techniques` is used in resume instructions | Seen in host code and owner review; distinguish demo rules from baseline | **Release UX concern:** put pilot cheats behind explicit demo mode, never default state-resume commands |
| Broadcast lock, Origin: null, side-view lock ordering | Reviewer reported source-level risks | **Requires targeted concurrency and origin tests** before calling them confirmed exploitable defects; address in independent hosted track |
| `Recovery_Evidence/` includes derived commercial Castlevania graphics | Independently confirmed archive has CHR-RAM .bin files, scene JSON, preview PNGs, and large derived scenes despite no loose `.nes` ROM | **Distribution blocker:** keep private/restricted evidence out of public editor releases absent appropriate rights; publish reproducible extraction tooling and legal/shareable synthetic tests instead |
| Size includes much historical evidence | 2,357 entries, four copies of 4,231,502-byte HTML, a 28MB Git bundle and extensive image/evidence exports | **Verified:** split editor binary, private evidence, and developer/reproducibility bundle into separate release artifacts |

### 14.3 Changes to the project-wide priority order

1. **P0: Truth in release identity and distribution** — one canonical editor artifact, current status, immutable outer-archive hash, self-consistent commit/test provenance, and clean separation of public code from copyrighted derived graphics and private artifacts.
2. **P0: Core editor acceptance** — clean project lifecycle, UI ownership, persistence, true browser image upload, and ROM build/play.
3. **P1: Image-import candidate** — verify the supplied patch through real-browser and real-ROM acceptance, then consider it for integration if it does not perturb emulator capture or existing scene persistence.
4. **P1: Audio correctness before expansion** — current four-channel path remains intact; DPCM sample bank layout, `$4010`–`$4015` register semantics, event stride, sample triggering and effects must be designed/tested together before enabling fifth-channel playback.
5. **Separate hosted pilot** — use Rev 8 as historical comparison, not a byte-identical guarantee; default to local identities and explicit demo rules; test saved world preservation, concurrency, origins and real two-client gameplay independently.
6. **Deferred** — new ROM titles, Stacys/anthology samples, marketplace/economy work, broad skin redesign or other additions not needed for a core acceptance gate.

**Updated decision:** RC2 remains a valuable **private development/recovery candidate**, not a cleared public distribution or fully accepted end-user editor. The image-import patch is a technically credible usability improvement and belongs in the core backlog. The external feedback is mostly aligned with concrete release and provenance problems; its live-host correctness claims still require independent reproductions.


## 15. Audio proposal review — compiler, 6502 driver and transcription (November 4, 2026)

**Input and status:** The owner supplied three code proposals in chat. They are not files present in the separate five-file image-import ZIP; they were assessed statically against the unmodified RC2 source. No DPCM patch was applied, compiled into a ROM, or listened to. Hardware register interpretations were cross-checked against [NESdev APU registers](https://www.nesdev.org/wiki/APU_registers), [NESdev APU DMC](https://www.nesdev.org/wiki/APU_DMC) and [NESdev CPU memory map](https://www.nesdev.org/wiki/CPU_memory_map).

### 15.1 Verified current baseline

- `app/src/audio/audio-compiler.js`: four-channel authored Pulse 1/Pulse 2/Triangle/Noise runtime; pattern channels 0–3; explicitly refuses unsupported `fx` and `fxp` and a referenced fifth-channel DPCM note. It preserves unreferenced tracker sketches rather than silently compiling an unimplemented sample.
- `app/src/audio/audio-engine.js`: emits four-channel mixer, pattern and SFX driver; existing event records are **four bytes** per event.
- `app/src/re/native-audio-recovery.js`: preserves observed native DMC activity in source/preview data, but transcription is a frame-end sampled approximation. DPCM and short-mode noise are deliberately omitted from editable tracker output. Native audition does not imply an editable DPCM score.
- **Retain the current safe refusals** until a new typed sample contract is separately validated. Existing native original-ROM audio recovery and generated authored NES audio are different output pathways.

### 15.2 Findings on the three supplied patches

| Proposal | Evidence from supplied code | Severity | Audit disposition |
|---|---|---|---|
| Patch 1 — Compiler | Adds `dpcmSamples`, five-channel order processing and `sampleId`; no sample memory allocator, padded sample length contract, sample data emission or verified sample trigger semantics | **Blocker** | Preserve as requirements sketch only |
| Patch 1 — Input/ABI validation | `s.rate || 15` silently overwrites valid rate 0; `Uint8Array.from` coerces values instead of rejecting malformed byte data; missing validation for sample object/rate/encoded length; estimates use `events.length * 5` but Patch 2 writes six bytes/event; `normalizeSfx` still limits channel to 0–3 | **High** | Define typed project schema, backward migration and exact byte-count layout before compiling |
| Patch 1 — Regressed refusal | Proposed `soundIndex()` returns sentinel 255 on missing SFX rather than rejecting as existing RC2 does; proposed code also omits the current duplicate/ambiguous-name defenses | **High** | Retain existing reference-validation guarantees |
| Patch 2 — Pattern record | Emits `[row, note, inst, vol, fx, sample]` = six bytes but `advanceEvent()` increments five; `applyEvent()` reads only five and does not execute sample references or FX; `fxp` is lost | **Blocker** | One documented event ABI and binary parser tests required |
| Patch 2 — DPCM trigger | `renderDpcm()` requires `dpcmActive`, which is initialized to zero and never activated by the proposed event flow; its `dpcmSample * 2` index addresses unpaired one-byte-per-sample tables incorrectly | **Blocker** | Implement and test an explicit fifth-channel trigger and indexed table contract |
| Patch 2 — Hardware registers | Writes loop-table data to `$4011` (7-bit DAC output level), unencoded 16-bit address bytes to `$4012`/`$4013`, and `$4015 = $10`, which disables the four non-DMC channels | **Blocker** | Correct APU control and preserve enabled synthesis channels |
| Patch 2 — Sample memory | No DPCM sample payloads are placed in mapped PRG space; `$4012` needs a 64-byte-aligned slot relative to `$C000`, `$4013` a length encoded as `16*n+1`; mapper-0 bank layout and vectors must be respected | **Blocker** | Create deterministic PRG layout and explicit overflow refusal |
| Patch 2 — Envelopes | Pitch-envelope metadata references `loopPitch`, but Patch 1 does not validate/return `loopPitch`; multi-channel envelope timing and noise approximation need separate regression tests | **High** | Stabilize envelope semantics independently of DPCM |
| Patch 3 — Transcription | Writes `sampleId: 0` whenever DMC playback is observed, but never extracts encoded sample bytes, a proper original sample identity or trigger/rate/length. In an imported project with no sample 0, this creates invalid references | **Blocker** | Retain DMC as **source-linked evidence**, not a fabricated editable sample |
| Patch 3 — Fidelity | One channel snapshot per frame cannot reconstruct sub-frame timing, DMA sample identity, original driver sequencing or complete effects. Warnings still say DPCM is not in editable score while a DPCM cell is written | **High** | Require accurate limitations and user approval before finite transcription |

NESdev confirms DMC `$4010` stores IRQ/loop/rate, `$4011` is direct output level, `$4012` encodes `$C000 + 64*A`, and `$4013` encodes `1 + 16*L` sample bytes. Starting/stopping is controlled via `$4015` bit 4. These are contractual hardware rules, not an implementation preference.

### 15.3 Required design before any merge

1. **Separate evidence and authored assets:** Define an immutable native DMC observation and a distinct validated `DpcmSample` authoring resource. A native playback trace cannot become sample bytes by assigning `sampleId: 0`. Track provenance and edits separately.
2. **Define the binary format:** Document and version the exact pattern event stride, `sampleId` encoding, FX/FX parameter encoding, order entry format, sample descriptor structure and SFX routing. Add forward/backward schema migration and invalid-reference refusal.
3. **Constrain mapper-0 playback:** Allocate encoded DPCM bytes into known CPU-visible PRG slots, align starts to 64 bytes, encode supported lengths as `16*n+1`, account for banking/vectors/code overlap, and reject impossible capacity rather than truncate. Make padding behavior explicit if supported.
4. **Correct the 6502 driver:** Decode each event with matching stride; set sample request and playback state; write rate/loop `$4010`, optional initial output `$4011`, encoded address `$4012`, encoded length `$4013`, and preserve the synth channels when manipulating `$4015`. Test retrigger, looping, priority, stop/restart, IRQ policy and multi-sample lookups.
5. **Test on three levels:** Pure compiler fixtures and size/address assertions; instruction/APU-register trace assertions in Forge's emulator; cold boot and listening in a separate NES emulator (and hardware/accurate APU reference as available). Test existing four-channel music/SFX unchanged.

**Decision:** DPCM/FX is a **P1 design and correctness gap**, not a P0 release blocker for a product that clearly advertises its four-channel limitation and refuses unsupported authored DPCM. The three snippets are **not accepted as implementation**. This is an audit change, not permission to expand scope while core stability is unresolved.

## 16. Supplemental review decisions and next release-gate adjustments

| Topic | Audit placement | Decision now | Evidence still needed |
|---|---|---|---|
| Legacy image upload degradation | **Core authoring requirement / P1 candidate fix** | Keep the attached patch as a candidate; do not merge during audit | Full browser input/drag-drop, transparent PNG, aspect/palette modes, save/reopen, undo and independent `.nes` playback; emulator capture regression |
| Image patch quality metrics | **Qualified review note** | Preserve before/after demonstration and author-reported RMSE/F1 figures as provisional evidence | Reproducible A/B scripts and reference fixtures, including the scripts named in `IMAGE_IMPORT_REPORT.md` but absent from the five-file attachment |
| DPCM/FX snippets | **P1 design-risk and blocker register** | Reject patches as written; preserve desired capability and tests in the backlog | Typed sample schema, mapper allocator, event ABI, DMC trace tests and audio acceptance |
| Native audio transcription | **Recovery accuracy/representation** | Keep approximation explicitly labeled; do not create invented DPCM samples | Source-linked native sample identification, byte proof and audition comparison before editable conversion |
| Release identity, retained tests and stale docs | **P0 release truth** | Reconcile final package bytes/hash, current release identity and fresh-versus-retained evidence | New release manifest, direct browser test evidence and correct scanned package |
| Rights and package separation | **P0 public distribution control** | Keep extracted commercial CHR/Scenes in private evidence, not public editor package absent permission | Rebuilt public editor distribution scan plus independent licensing/asset review |
| Hosted-world safety and authenticity | **Separate hosted release track** | Keep local-only pilot and Rev 8 baseline isolated; avoid mandatory real-wallet/mainnet sign-in or silent cheats | Origin/concurrency tests, data-preserving resume, explicit host rule flags and real two-client gameplay validation |

### 16.1 What this revision does **not** claim

- Neither proposed DPCM sample playback nor FX decoding has been implemented or tested in a ROM.
- The image-upload patch remains **unmerged**; its real-browser path and visual conversion acceptance have not passed here.
- The reviewer-reported host concurrency/security scenarios have not been independently reproduced merely by appearing in a review note.
- The physical package's checksum integrity does not resolve mismatched external scan receipts, private asset distribution rights, or editor readiness.
- No Git commit, hosted save, original ROM, existing release ZIP, or active Forge source tree was modified by this document revision.

**Revised execution order:** P0 release identity/distribution + core end-to-end authoring evidence; P1 image import and DPCM correctness as separately gated changes; recovery adapters only after their native-edit contracts; Zelda II hosted pilot as a separate acceptance track.

---

## 17. Revision 3 — Hardware, cyberdeck and ForgeNet concept assessment

**Status:** Concept proposed; **not implemented in RC2**. Evidence and feasibility were reviewed on November 4, 2026. These items belong in an isolated experimental track and do **not** change Gates A–D for accepting the core Forge editor. The comprehensive implementation/PoC charter is `NES_Forge_Concept_Proposal_PoC_2026-11-04.md`.

| Proposal | Evidence or feasibility | Audit disposition | Condition to elevate |
|---|---|---|---|
| Same native `.nes` in emulators and on original NES | Native NES ROM format and compatible flash carts are established; specific build/mapper not hardware-verified in this audit | **Worth pursuing as deployment PoC** | Cold boot same hashed rights-clear ROM in independent emulator and NES-001 |
| NES HUB as development expansion | Official documentation confirms BlueRetro, Four Score-style four-player support, expansion audio choices and breakout connectors; **does not establish network protocol or memory-mapped register interface** | **Research candidate, not ready-made networking adapter** | Electrical review, CPU-visible bus data path, firmware and scope captures |
| Network-enabled cartridge | Existing homebrew examples demonstrate original NES Wi-Fi with additional microcontroller/FPGA hardware | **Feasible class of system, not Forge implementation** | Prototype and emulator parity for a versioned ForgeNet transport |
| Portable Forge cyberdeck | Conventional Linux computer can plausibly host browser, compiler, emulator and network service | **Architectural concept** | Prove existing tools on a portable machine before designing custom casing/PCB |
| Cryptographic work in 6502 assembly | Basic hashing and packet checks feasible in principle; memory/cycle budget constrained; game state hashes alone are not anti-cheat proofs | **Benchmark research only** | Cycle-tested 6502 implementation + threat model + independent vectors |
| Console as game-network 'node' | Possible as network participant through compatible connected hardware | **Terminology guardrail** | Never equate NES participant with a Stellar full/consensus node |
| Game-specific Stellar assets | Stellar classic custom assets have issuer/code identities; one shared network avoids per-game blockchain operations | **Preferred experimental ledger topology** | Synthetic testnet asset and validation service, no mainnet or commercial franchises |
| Networked gameplay to tokens | Server can approve events and issue test tokens; clients cannot self-authorize valuable rewards | **Separate off-chain authority and chain settlement** | Forged-event, replay, session-expiry and idempotency tests |

**Explicit correction to speculative wording:** The NES itself can perform cryptographic operations, but the proposed design does not require it to sign transactions, hold long-lived secrets, download the ledger, verify all Stellar consensus, or route Wi-Fi packets. A connected console is a *client/participant* by default; an independent light client is a distinct, unproven milestone.

### 17.1 Revised system boundaries

1. **Forge Studio Core:** project graph, editors, emulator/compiler/build, persistence, debug. Must work without network or crypto.
2. **Recovery Adapters:** source-specific, evidence-graded, bounded native writer support; no claim of 1:1 full recovery without proofs.
3. **Hosted Worlds:** a separately versioned multiplayer service; client input never controls authoritative HP/positions/reward eligibility.
4. **Forge Hardware Bridge (proposed):** compatible ROM target profiles, flash/programmer adapters, optional physical device transport.
5. **ForgeNet (proposed):** versioned messages for game sessions and receipts; modern companion validates and bridges to services.
6. **Stellar Adapter (proposed):** game-specific asset issuance/transfer on Testnet, not on NES; cryptographic material off-console.
7. **Portable Cyberdeck (proposed):** deployment packaging of workstation + external tools, eventually optional custom hardware.

This separation directly reduces the current risk of the multiplayer and experimental economies shaping the native editor's basic resource ownership model.

## 18. New research risks and controls (non-blocking to RC2 editor)

| ID | Risk / key unknown | Impact | Required control |
|---|---|---|---|
| EXP-01 | Original NES electrical connector/crossed signals | Hardware damage | Verified NES HUB/bus pinout, voltage/direction checks, level shifting and scope traces |
| EXP-02 | Believing a USB flash-cart developer interface equals NES gameplay networking | False PoC claim | Separate ROM deployment test from actual CPU-visible data-transport test |
| EXP-03 | Wallet seed, signing key or test secret embedded in ROM/server log | Security incident | No keys in source/ROM; scan artifacts and logs, use external controlled signer |
| EXP-04 | Hash used as false gameplay attestation | Forged rewards | Game server/replay authority, nonce, authenticated session, unique event ID |
| EXP-05 | Token minting on mainnet or for copyrighted titles | Financial/IP/legal exposure | Synthetic original game, disposable Testnet, no economic value or franchise tokens |
| EXP-06 | Testnet reset or network outage | Missing/pending balances and double processing | Local event ledger, idempotency, robust `PENDING` and retry states |
| EXP-07 | Cyberdeck hardware before software proof | Scope/timeline runaway | Ordinary Linux computer first; custom chassis deferred |
| EXP-08 | Mixing original-game XP with tradeable rewards | Gameplay distortion | Separate original progression and optional off-chain/ledger rewards |
| EXP-09 | Hardware mapper/programmer mismatch | Unbootable ROM or board damage | Verify mapper, board, voltage, flash compatibility and readback |
| EXP-10 | Hosted-world incomplete authority/persistence | Unverifiable on-chain claims | No issuance from bare client claims; separately complete hosted threat model |

## 19. Revised product and PoC gating

The project-wide priority stays **P0: core acceptance**. Revision 3 adds an **experimental gate** after the existing minimum requirements:

| Gate | Status now | Evidence required | Blocks |
|---|---|---|---|
| A — Release truth and core package | Unaccepted | One SHA/commit/version, rights-safe distribution and fresh browser acceptance | Promotion |
| B — Original game authoring lifecycle | Unaccepted | Project save/reopen, valid ROM, cross-emulator play, state persistence | All PoCs depending on Forge Studio |
| C — Source-specific native recovery | Per adapter partial | Exact-source evidence, safe writers and independent ROM diffs | Full recovery claims |
| D — User experience and docs | Unaccepted | Every tab mapping, no silent copies, honest status view | Public release |
| E — Hosted Zelda II experiment | Experimental | Saved-state safety, two-client movement/input parity and security validation | Hosted-world claims only |
| F1 — Hardware execution | **Proposed** | One original rights-clear Forge ROM cold boots on original NES via compatible flash cart | Physical execution claim |
| F2 — Emulator ForgeNet bridge | **Proposed** | Versioned HELLO/event, server validation, offline/replay negative tests | Online feature claim |
| F3 — Stellar Testnet demonstration | **Proposed** | Synthetic asset, correct issuer/trustline, one approved transfer, zero duplicates | Blockchain-backed reward claim |
| F4 — Physical NES communication | **Future** | Custom cartridge/expansion interface, verified registers, logic analyzer | Physical network participant claim |
| F5 — Portable cyberdeck integration | **Future** | Reproducible setup on portable host + optional cart I/O | Cyberdeck product claim |

**Careful terminology:** Passing F1 and F3 separately does **not** prove that physical NES hardware can submit network messages. That stronger result requires F4. The first credible concept demonstration may complete F1–F3 in separate emulator/hardware paths while retaining an explicit unresolved link.

## 20. Stellar-specific scope and owner choices

- Use **XLM** only as Stellar's native fee/reserve currency. A game's asset is separately named by `(asset code, issuer)`; a `Z2TEST` or `CVTEST` code remains a hypothetical design example, not issued or authorized.
- Use a **rights-clear synthetic `FORGEDEMO` Testnet asset** to test mechanics. No smart contract is required merely to create/transfer a classic issued asset; Soroban contracts are optional for advanced rules after a need is demonstrated.
- Explicit issuer/distributor separation, recipient opt-in/trustline, possible sponsored reserves, network passphrase and separate local state ledger are part of the proof.
- Token balances should not replace original NES gameplay's XP/health/progression; valuable rewards require authoritative verification, replay controls and legal review.
- Do not require an injected Ethereum mainnet wallet for a local test. The host's existing Ethereum wallet flow must not be silently reused for a Stellar PoC.
- No testnet issuance, mainnet transaction, new wallet creation, external network side effect or contract deployment was performed during this audit.

**External references:** https://developers.stellar.org/ ; https://developers.stellar.org/docs/tools/quickstart/advanced-usage/run-command-examples ; https://github.com/time2retro/NES-Hub ; https://super-tilt-bro.com/about.html ; https://www.nesdev.org/wiki/CPU_memory_map ; https://www.nesdev.org/wiki/APU_DMC . These support hardware and blockchain feasibility, not proof of Forge integration.

## 21. Revision 3 disposition / recommended next record

**Accepted for documentation:** Hardware Bridge, ForgeNet, portable cyberdeck and Stellar assets as coherent experimental concepts and a phased PoC scope. **Not accepted as present features:** physically connected network gameplay, 6502 Stellar wallet signing, full NES blockchain nodes, universal cartridge programming or per-game token economies.

**Do not amend RC2 itself.** Keep its 46,302,037-byte archive and editor SHA untouched. Core audit Gates A–D retain precedence. Use the Concept Proposal's original rights-clear game as the sole PoC fixture, with negative/replay tests and Testnet-only credentials. Track future approved implementation in a new isolated candidate with an explicit owner-reviewed change log.

**Companion documentation:** `NES_Forge_Concept_Proposal_PoC_2026-11-04.md` and `NES_Forge_Audio_Image_Hardware_Stellar_Review_2026-11-04_Rev2.md`. Neither constitutes authorization to modify code, push Git or issue assets.