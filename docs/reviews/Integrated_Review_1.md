# NES Forge · Whole-product release review

**November 15, 2026 · Integrated Review 1 · Private owner candidate**

**Decision.** Use this candidate as the common development build. Hold public promotion. The editor, cartridge workflows and local host now have a reproducible baseline. Real desktop/mobile interaction, the private-to-public packaging change and the scope of native recovery remain open. Those are three different decisions, and each has an observable finish condition below.

**Start here.** Extract the ZIP, open **NES_Forge.html**, and use **Open ROM / project / ZIP**. Five editable sample projects live in **Examples**. **Project lessons** contains the nine-step beginner tutorial and the cartridge workshop guide. **World Live** leads to the optional local host. The downloadable report and the report inside the kit are the same review.

## What changed in this build

| Reproduced problem | Change | Evidence |
|---|---|---|
| The main file picker rejected the four native extraction ZIPs. Zelda II grows beyond the previous eager decompression limit. | The editor indexes archives and reads selected resources on demand. It validates CRCs and sizes and keeps the active project until the user explicitly opens an editable member. | All four private packs completed full resource validation. A late read, bad checksum, ambiguous documents, unsafe path, declined replacement and stale receipt have regression coverage. |
| DigiGhosts fixes and cartridge transfer lived in separate HTML editors. The workshop guide also linked to a file from its old kit. | Moved the Patch 5 changes into their owning modules, integrated both workshop scripts, and made the guides accessible inside Project lessons. One manifest builds the standalone editor. | The five examples build from the same file. Both signed Castlevania revisions were tested as donors for an independently authored World. |
| A partially recognized cartridge could be described as “unrecognized,” and a selected Forge project could detach its own intake receipt. | The intake includes exact revision-ledger identity even when only limited tools apply. A successful project replacement updates the receipt. Later changes invalidate it. | Castlevania II and Mega Man 2 are now identified at intake. The receipt and stale-source checks ran through the application handlers. |
| Sources and tile packs had separate intake conventions. | The main picker accepts project JSON/ZIP, source workspace JSON/ZIP and ordinary CHR ZIPs. It hands each to its owning editor. The source workspace has independent file history and exports. | An assembly source archive was opened, built and executed. A legacy tile pack imported its expected pixel. |
| There was no in-editor way to establish whether an extraction came from the owner’s copy of a ROM. | **Check original ROM** validates the original hash or recreates an explicitly documented header substitution on a temporary copy. A mismatch stays visible and grants no editing capability. | Three supplied packs matched the entire cartridge exactly. Mega Man 2’s reported original hash was reproduced by changing only the declared iNES header byte in memory. |
| The Windows localhost launcher enabled test-only sword techniques by default, and the player client had no direct path back to the unmodified editor. | The ordinary launchers use normal progression. The player client links to **/editor**, which serves the exact standalone editor bytes. The instrumented observer for the hosted pilot still uses its dedicated endpoint. | A live HTTP fetch verified the editor fingerprint. Two independently signed clients synchronized through the real server, then verified persistence after a restart using a synthetic world. |

## What passed on the same editor

| Product area | Direct result | Remaining work before claiming full support |
|---|---|---|
| Editor and persistence | All 15 primary tabs selected their named views. Connected Workspace, Resources, World workshop, Hosted setup and lessons opened. Scene rename, undo, redo, portable save, reopen and deterministic rebuild passed. | Desktop and phone interactions, native file dialogs, browser storage after a restart, and full first-time tutorial walkthrough on the release package. |
| Scene, CHR, sprites, animation, entities and World | Asset links, duplicate local identifiers, dangling bindings, pose/animation selection, collision and traversal regression checks passed. Three independent cartridge routes passed from cold boot through their finish screen and Start restart. | Visual editing on real devices, image drag-and-drop, simultaneous actors under scanline pressure and the owner’s live close-contact review. |
| Gameplay and compiler | All five sample projects compiled and reopened to the same ROM. A blank single-room build rejected a missing Player. The blank scene built after selecting Scene viewer. Runtime coverage includes AI pursuit/recovery, controller-driven traversal, NROM allocation and MMC2 latch behavior. | Broader rule combinations, mapper coverage and physical cartridge/flashcart testing. A general editable behavior-sequence designer remains roadmap work. |
| Assembly | The source workspace expanded two text includes and one binary include, reported source locations, assembled NROM, and executed the expected byte value 70 in RAM. A missing include produced an error without changing the game project. | Other assembler dialects, banked toolchains and large external codebases need their own declared support and fixtures. |
| Audio | A one-note MIDI fixture passed through the actual import handler, became tracker rows and four runtime channel records, survived saving, and executed a pulse timer write in an independent emulator. The native audio library and title-specific regression suites also passed. | Listening and latency on actual devices, full title-specific scores, DPCM coverage and native music writeback where the ledger lists gaps. |
| Native extraction and editing | The four uploaded packages, eight original cartridges, two Castlevania recovery catalogs and three native writer cases have fresh evidence. The code also retains the 28-revision ledger with explicit per-domain limits. | Full level, actor, collision, sound and native output parity for any commercial title remains unproven. |
| Hosted Worlds | Eleven suites covered wallet signatures, origin-specific challenges, two WebSocket clients, Rev 8 frame presentation, authority, XP, progression, PvP feedback, restart and respawn. The two-client test ran against the real server with a synthetic world and temporary identities. | Two physical browser profiles with actual wallets and the owner’s original Zelda II world, especially grounding, crouch, jump, attack, reconnect and room transitions. |
| Batch inventory and bank extraction | Fifteen multi-format inventory tests and the physical bank extractor self-test passed. Both tools are included for local batch use. | Batch analysis of UNIF/FDS and bank dumps still uses the included command-line tools. A single graphical batch-import flow is an integration gap. |
| Distribution | A deterministic build regenerates one HTML file from 218 source parts. The captured evidence and source are in the same private ZIP. | A public-safe distribution profile must reproduce the candidate’s supported workflows on user-supplied inputs. The repository records its project-wide license as undecided. |

**Test boundaries.** The 13 retained suites passed 159/159 checks. Nine platform workflows, six integration workflows and three independent stage-route checks also passed. DOM tests use jsdom or the existing VM harness. The cartridge tests use the actual compiled bytes, controller input and emulated video/audio. Of 33 requested suite jobs, 32 passed. The desktop-and-touch browser job reached the real host and verified the HTML hash, but Chromium exited before it rendered a page. The available managed desktop also blocked local file URLs. Mobile hardware, real file dialogs, physical NES playback and two human wallet profiles therefore remain open. A reader can run the optional browser suite on their machine.

## Authoring fixtures and reference cartridges

| Fixture | What the integrated build did | Comparison with the earlier material |
|---|---|---|
| Two-stage Workshop | Built 40,976 bytes. Traversed Worlds 0, 1, 2 and restarted at 0 in 216 frames. | Matches the published digest in the workshop build record. |
| Eight-stage Workshop | Built 40,976 bytes. Visited all eight stages and the finish screen, then restarted in 768 frames. | Byte-identical to Field Series. |
| DigiGhosts | Built the editable 16-screen fixture to 40,976 bytes. Ran the pursuit/recovery and AI regressions. | Byte-identical to the preserved Patch 5 cartridge. Close contact, legibility and sprite pressure still need human review. |
| HTTP 418 Teapot | Rebuilt the custom assembly project to 24,592 bytes. The independent 100-frame run produced 77 distinct frames. | Byte-identical to the archived Teapot cartridge. |
| Beacon Island | Fresh builds from both the old workshop editor and this editor are byte-identical to each other. Both the rebuilt and archived cartridges completed all nine screens and restarted in 768 frames. | The archived, hand-modified cartridge differs from the project rebuild in 5,953 bytes. Five of 100 sampled video frames differ under identical input. Sampled audio matched. Keep both fingerprints until the art and behavior are accepted. |

The Beacon Island comparison includes the first differing frame at **Evidence/beacon-frame4.png** and numeric output in **Evidence/beacon-parity.json**. The reference and rebuilt cartridge are labeled separately. The sample project remains a regression case for the compiler.

## Original cartridges and owner-supplied extractions

| Native extraction pack | Checked maps | Room records | Editable room / audio projects | Original cartridge check |
|---|---:|---:|---:|---|
| Castlevania II | 79 | 0 | 0 / 0 | Exact whole-file hash. Its native map data and previews can be inspected. |
| Mega Man 2 | 616 | 0 | 0 / 0 | Identical PRG/CHR payload verified. The original pack documents a mirroring-bit difference in header byte 6. Both full-file hashes are retained. |
| Ninja Gaiden | 48 | 48 | 48 / 0 | Exact whole-file hash. A selected editable room opened in the project store. |
| Zelda II | 4 | 258 | 258 / 2 | Exact whole-file hash. The pack also includes one audio report. |

All 1,053 corresponding PNG data members passed entry CRC and PNG-signature checks. All 308 editable Forge projects passed the project loader’s validation. The suite opened one room through the displayed control in each pack that carried rooms. It did not turn every recovered room into a newly verified original level. Extraction records and the current game have distinct lifecycles, so browsing a map preserves the open project.

Eight owner-held original cartridges each passed intake fingerprinting and ran for 45 frames in Forge’s embedded emulator. For both Castlevania PRG revisions the recovery returned six scenes, nine poses, six animations and a retained trace of 649 APU writes across 12 instruction sites. In the workshop, a source-matched background detail from each revision was transferred to the two-stage authored World. The destination markers survived, the project rebuilt after reopening, and a duplicate transfer was refused. Donor evidence and output hashes are recorded privately in the numeric receipt.

For both Punch-Out!! revisions, a Glass Joe count/health edit was saved and reopened. Each native build changed exactly one byte at file offset `0x13D7`, from `0x1C` to `0x28`, and reopened in the mapper 9 emulator. Zelda II produced identical original bytes before editing. One terrain-cell substitution survived native encode, project reopen and fresh map decode. The compressed native table changed 514 bytes. Those tests establish specific writers and leave broader fight, collision and game-engine parity open.

## How to finish the all-in-one product

| Priority | Work inside this same candidate | Evidence that closes it |
|---|---|---|
| 1 · Qualify the public editor | Build a public distribution from the same manifest, using the existing public candidate’s source-on-demand behavior or a reviewed replacement for the embedded private catalogs. Record the project license and the origin of shipped example assets. | A clean public ZIP with one launch file opens an authored sample, opens an owner-supplied ROM and extraction, imports a resource, saves, reopens, builds and plays. Run the full suite against the public artifact’s own hash. |
| 2 · Test what users actually touch | Run the supplied browser smoke test, then complete the nine-step first-game path on desktop and the mobile controls on a phone. Check a normal save/restart/reopen, actual sound, a cartridge played outside Forge and Beacon Island’s differing frames. | Record device/browser, cartridge hash, steps and expected/observed result. Resolve or explicitly scope any user-visible blocker in the candidate. |
| 3 · Finish the shared recovery workflow | Use the same Resources view and project model for each revision. Prioritize a complete resource journey such as original cartridge → native room → reusable art/actor/audio → authored World → saved project → playable cartridge. Add an exact-source fixture for each new writer. | An owner can tell which resources can be inspected, reused, edited and written back. Every supported edit has a save/reopen test and, for native output, a constrained byte diff plus playback evidence. Close the read-only-to-editable gaps in the table below as each domain earns support. |
| 4 · Qualify the hosted target in place | Keep native cartridge limits in the authoring build and expose expanded server rules through World Live. Align remaining batch-only commands with the main graphical workflows. | Two fresh profiles join the same original-source room, stay grounded, see each other’s actions, retain progression after reconnect and restart, and can return to the same editor. An authored cartridge still rebuilds to its approved digest after the hosted change. |

**Roadmap scope.** The eight-stage sample runs one authored engine. Recovered game AI, boss logic, collision and audio need their own adapters before they can be reused across games. The 1.7 World, 1.8 Audio, 1.9.x gameplay, 2.x recovery and 3.x hosted tracks can share the same editor. The cyberdeck, physical bridge and ForgeNet remain design work outside this build.

**Release practice.** Keep one accepted candidate, one editor entry and one command that tests the whole product. Each feature lands in the tool that owns its data, with a fixture from more than one project when it has cross-project effects. Move a capability to public support when its user-facing path passes. Keep unsupported native domains visible in the product. No change was pushed or published in this review.

## Revision ledger

This is the private RC2 ledger carried into the candidate. It covers 22 title groups and 28 revisions. Seventeen revisions have partial recovery and eleven are unresolved. None are marked fully recovered. The two numeric columns count revisions with a recorded partial writer and a recorded partial audio domain, respectively. The fresh tests above identify the subset exercised against original cartridges in this review. The underlying `docs/recovery/extraction-coverage.json` lists each revision’s SHA-256, domains, evidence and limitations.

| Title | Revisions | Recovery | Writer | Audio | Next recorded gap |
|---|---:|---|---:|---:|---|
| 1943 | 1 | unresolved | 0 | 0 | Native scene reconstruction |
| Adventures of Lolo | 1 | partial | 1 | 1 | Moving actors and animation |
| Battletoads | 1 | unresolved | 0 | 0 | Native scene reconstruction |
| Castlevania | 2 | partial | 0 | 2 | Recover the Stage 01 castle interior and validate its transition, graphics and placements against original scrolling |
| Castlevania II | 1 | partial | 0 | 1 | Conditional block substitution and collision |
| Contra | 1 | partial | 1 | 0 | 18 unavailable graphics states |
| Double Dragon | 1 | unresolved | 0 | 0 | Native scene reconstruction |
| Final Fantasy | 2 | partial | 2 | 0 | Overworld reconstruction |
| Gun Smoke | 1 | unresolved | 0 | 0 | Native scene reconstruction |
| Hudson's Adventure Island | 1 | unresolved | 0 | 0 | Native scene reconstruction |
| Kid Niki - Radical Ninja | 2 | unresolved | 0 | 0 | Native scene reconstruction |
| Kirby's Adventure | 2 | unresolved | 0 | 0 | Native scene reconstruction |
| Kung Fu | 2 | unresolved | 0 | 0 | Native scene reconstruction |
| Mega Man | 1 | partial | 1 | 0 | Audio driver |
| Mega Man 2 | 1 | partial | 0 | 1 | Actor and moving-platform placement |
| Metroid | 1 | partial | 1 | 1 | Doors and world connections |
| Mike Tyson's Punch-Out!! | 2 | partial | 2 | 2 | Complete opponent behavior and fight reconstruction |
| Ninja Gaiden | 1 | partial | 0 | 1 | Actor placement and damage boxes |
| River City Ransom | 1 | partial | 1 | 1 | 22 special and interior locations |
| Shadowgate | 1 | partial | 1 | 1 | Object and door overlays |
| Teenage Mutant Ninja Turtles | 1 | partial | 1 | 0 | Remaining areas |
| Zelda II | 1 | partial | 1 | 1 | Side-view collision and native movement rules |

## Reproduction and lineage

- **Integrated editor SHA-256** `adf5c8a08ecb6ef085a7a79a579074faf42f1767730dcbc7da23d991bb6f1e8d`. Verify with `python app/tools/bundle.py --check`. The host serves these same editor bytes at `/editor`.
- **Owner build** started from private RC2 Build 5 revision `91d9f767a8e944ff4138790e47b87faafe41aeeb`. It incorporates the verified DigiGhosts Patch 5 source changes, the eight-stage workshop, and the Candidate 3 localhost host while retaining Rev 8 presentation checks. The public handoff baseline recorded `6ac1d59a145c0166116eae2bd94340372b3aaa06`. This work did not change that branch.
- **Public packaging boundary.** The historical public manifest explicitly removed the inline Castlevania scene snapshots from `app/src/re/external-recovery-catalog.js` and runtime captures from `app/src/re/recovery-evidence-catalog.js`. The owner edition retains them. Build a reviewed source-on-demand replacement and exercise its donor workflow before public promotion.
- **Previous test contracts.** An older hosted timing test reported 5/7 against Candidate 3 because it expects an 88 ms smoothing delay. The accepted Rev 8 presentation deliberately replaced it with source-frame motion. The current Rev 8 contract ran 22/22. Neither result establishes owner visual acceptance.
- **Evidence.** Open `Evidence/index.json` for the executable suite results. `platform.json`, `domains.json`, `stage-route.json`, `native-corpus.json`, `extraction.json` and `browser.json` provide individual receipts there. The old master handoff and its three size-limited volumes remain the archival record.
