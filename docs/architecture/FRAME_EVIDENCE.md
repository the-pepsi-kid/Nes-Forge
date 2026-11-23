# Frame-indexed evidence and checkpoint capture — assessment (2026-11-21)

Branch `dev/alpha-13-studio-restore`. Ninja Gaiden (US) is the validation reference, not a special case: the service
and the capture plan contain no game knowledge; game knowledge lives only in the plan a caller writes.

## 1. Verdict

One restored emulator checkpoint can produce a synchronized, frame-indexed set of artifacts, and it is proven equal to
independent cold boots on every emulated mapper family tested. The smallest implementation is in place:

- `Forge.services.FrameEvidence.capture()` / `emulator.frameEvidence`: a **state snapshot** of one completed frame.
- `capturePlan()` / `emulator.capturePlan`: boot once, save a physical checkpoint, restore it for each target
  (`mode: checkpoint`), or boot per target (`mode: cold`, the reference).
- `library.registerFrame`: the record on the ROM's library shelf, linked to the CHR entries it uses.
- `library.surveyStages` now boots once and restores per area.
- `QA/frame-evidence.cjs` (owner-side, real cartridges) proves it (§5).

## 2. Current capture paths (review)

| Path | Where | What it records | Data or rendering |
|---|---|---|---|
| Capture Runtime Scene | `src/legacy/03-runtime-capture.js` | renderer inputs per scanline: tile placements, native 8×8 bitplanes with their CHR ROM/RAM offsets, palettes, sprites; rebuilt image must equal the framebuffer (0 px) | **original data**, validated against the image |
| Bake Visible Frame | `src/legacy/01-emulator.js` `emuCaptureVisibleFrame` | tiles quantized from the rendered framebuffer | **rendered pixels** |
| Hybrid Capture | `emuCaptureHybrid` | background quantized from the rendered background; sprites from OAM + CHR | **mixed** |
| Extractor capture | `nes-forge-extractor/nesforge-capture.js` | one boot, plays an input schedule, keeps new screens via **Hybrid** | mixed (background is rendered) |
| Agent Lab capture | `tools/agent-lab/tools/forge_capture.cjs` | one boot, snapshots at given frames: mapper/PPU registers, palettes, OAM, CHR tiles with file offsets, PNG | data + a rendered PNG |
| Library stage survey | `src/services/library-catalog.js` | runtime sprite observations per stage | runtime observation |
| CHR Sheet bank load | `loadChrBankAsBg/AsSpr` | CHR bank bytes from the imported ROM | original data, no emulator |

Duplicated work found:
- **Repeated boots:** the stage survey booted the game once per area; QA's stage-table check booted it 22 times.
  Both now boot once (`ninja-stage-table` in QA; the survey in the product).
- **CHR mapping and file-offset arithmetic** exist three times: `physicalChr` in runtime capture, Agent Lab's
  `forge_capture.cjs`, and the library's typed locations. The frame-evidence service reuses `physicalChr`
  (now exported) instead of adding a fourth.
- **PNG encoders and "new screen" detection** are duplicated across the extractor, Agent Lab and QA scripts.
- The extractor's capture uses **Hybrid**, so its background tiles come from rendered pixels, not CHR data.

## 3. Is restoring a checkpoint safe?

`EmulatorTimeline` checkpoints copy **every own field of the emulator object** (CPU registers, RAM, SRAM, VRAM,
palette RAM, OAM, PPU registers and scroll latches, split-frame banks, all mapper registers including MMC1 shift
state, MMC3 banks/IRQ counter and the MMC2 object) **and the APU core**. The 6502 core keeps no state outside that
object. Module-level variables outside it are host timing, audio output and UI choices, not machine state.
Emulation reads the clock only for a 200 ms safety budget and uses no randomness, so a restored state plus the same
inputs is the same execution. Checkpoints are taken at frame boundaries with the emulator paused. Limits: 16
checkpoints / 32 MiB per session, in memory, cleared when another ROM is loaded.

## 4. The frame evidence record (`NESForgeFrameEvidence` v1)

A **state snapshot** of one completed frame. It does not say how the machine got there.

| Section | Contents |
|---|---|
| `rom` | name, SHA-256 of the loaded file, mapper the emulator uses, PRG/CHR sizes, CHR RAM or ROM |
| `cpu` | A, X, Y, SP, PC, P, cycles; `pcLocation`: the PC's cartridge file offset through the mapped PRG window |
| `memory` | 2 KiB RAM, SRAM, CHR RAM (when the game uses it) |
| `apu` | register view (the checkpoint restores the whole APU) |
| `ppu` | control, mask, status, v/t/fine-X/w latches, mirroring; sprite-0 split banks and scroll when the frame splits |
| `nametables`, `palette`, `oam` | 2 KiB VRAM, 32-byte palette RAM, 256-byte OAM, as at the snapshot (after the frame's vblank) |
| `sprites` | the sprites the frame **drew**, from its runtime trace (OAM index, position, tile, attributes as drawn). OAM at the snapshot is not used: the game's vblank code has usually already copied the next frame's sprites into it. Each sprite's CHR offset is the one in effect when it was drawn (line time; fetch time for MMC2), given only when its drawn rows equal the cartridge bytes there (`chrOffsetAt: "fetch"`). A bank switch while it was drawn, or CHR RAM, makes no location claim. `spritesFrom` and `spritePatternsAt` say which applies; without a complete trace, OAM at the snapshot is listed, labelled. |
| `mapper` | every mapper register field |
| `banks.prg` | each 8 KiB CPU window located in PRG ROM **by content** (independent of the mapper model), checked against the file |
| `banks.chr` | each 1 KiB of the pattern tables through the renderer's mapping: CHR ROM file offset, 1/4 KiB bank, checked against the file; or CHR RAM |
| `rendered` | framebuffer and background SHA-256, marked "rendered pixels, not CHR data"; pixels only on request |
| `synchronization` | the frame rebuilt from the renderer's own per-scanline trace must equal the framebuffer (0 px), plus the CHR regions its background tiles came from |
| `trace` | "not recorded", unless asked: then a deterministic replay of the frame before the snapshot from the same checkpoint, with RE runtime code coverage (instructions, PCs with file offsets) |
| `digests` | SHA-256 per section and overall, for field-by-field comparison |
| `links` | library CHR entries the mapped banks lie in (by file offset) |

**Snapshot versus execution trace.** A checkpoint fixes the machine at one moment. Explaining how it got there
needs the instructions and memory accesses before it. The record keeps them apart: `trace` is only filled by
replaying from the checkpoint with observation on. Deterministic emulation makes that replay the same execution, so
a trace can be produced on demand instead of slowing every capture.

## 5. Validation (`QA/frame-evidence.cjs`, 13/13)

- **Ninja Gaiden, all 22 areas** (the game's own time-over restart into each area's first room): checkpoint capture
  == cold-boot capture in every section. The HUD shows the catalog's stage. Every frame rebuilds from its own data
  with 0 different pixels. PRG/CHR banks are located in the file and match it. The PC maps to a file offset. CHR banks
  link to their library entries. Screenshots hash to their records' framebuffer SHA-256.
- **Library:** a registered frame's screenshot is a preview marked as rendered pixels. Its PC is a typed code
  location. Its linked CHR entries' bytes equal the cartridge's (SHA-256 of the file slice).
- **Trace:** replaying area 3's last frame from the checkpoint records the same code coverage twice, and the snapshot
  equals the one taken without tracing.
- **Survey:** booting once gives exactly the results of booting per area.
- **Other games**, generic inputs, no game knowledge: checkpoint == cold for every target; every mapped CHR ROM bank
  equals the cartridge bytes at its reported offset.

### Capability matrix

| Game | Mapper the emulator runs | CHR | Checkpoint == cold boot | Banks located in the file | Frame rebuilds at 0 px |
|---|---|---|---|---|---|
| Ninja Gaiden | 1 (MMC1) | ROM | yes (22 areas) | yes | yes |
| Super Mario Bros | 66 (dirty header; see §8) | ROM | yes | yes | yes |
| Mega Man 2 | 1 (MMC1) | RAM | yes | PRG yes; CHR is RAM | yes |
| Zelda II | 1 (MMC1) | ROM | yes | yes | yes |
| Contra | 2 (UxROM) | RAM | yes | PRG yes; CHR is RAM | yes |
| Super Mario Bros 3 | 4 (MMC3, IRQ split) | ROM | yes | yes | yes |
| Battletoads | 7 (AxROM) | RAM | yes | PRG yes; CHR is RAM | yes |
| Punch-Out!! | 9 (MMC2) | ROM | yes | offsets match the file | yes: the trace keeps each pattern fetch's latch-switched bank; an independent MMC2 model agrees on every line (§12) |
| CNROM (3), on a cartridge Forge builds (§13) | 3 | ROM | yes | yes | yes |
| Mappers 11/66 as intended | — | — | not tested (no cartridge in the set) | — | — |

**Genuinely reusable (any emulated mapper):** checkpoints, capture plans, the evidence record, PRG location by
content, CHR offsets for CHR ROM, synchronization by rebuild (every emulated mapper, MMC2 included), and trace on demand.
**Game-specific:** how to reach a place (Ninja Gaiden's RAM restart), and runtime sprite-to-pose association
(Ninja Gaiden enemy slots).

## 6. Performance (Chromium, 4-core container)

| Work | Before | After |
|---|---|---|
| QA `ninja-stage-table` (22 areas, jsdom harness) | 556 s (22 boots) | 330 s (1 boot + checkpoint) |
| Capture all 22 Ninja Gaiden areas | 76.5 s cold (22 boots, 25.4 s booting) | 51.9 s (1 boot, 1.3 s) |
| Stage survey, 3 stages | 38.4 s (3 boots) | 34.9 s (1 boot) |
| Other games, 3 targets each | 9.9–25.3 s cold | 7.1–18.2 s (≈30 % less) |

Unit costs: emulating one frame 5.7 ms (175 fps, runtime trace included); building one record 17.6 ms (rebuild check
11 ms); restoring a checkpoint 18.6 ms. What remains per Ninja Gaiden area is the game's own death-and-restart
sequence (≈350–600 frames). The next saving is a **checkpoint per reached area**, kept across sessions (§7).

## 7. Background investigation (Agent Lab) — integration points and blockers

Agent Lab (`tools/agent-lab`) already runs Forge's own code out of the user's page (jsdom harness, read-only,
private output outside Git, ROM identity by SHA-256). The pieces above make a background investigator practical:

| Integration point | Status |
|---|---|
| Run a capture plan headless against the user's ROM | `emulator.capturePlan` works in headless Chromium today; Agent Lab can call it like the QA suite does |
| Results Forge can use | `NESForgeFrameEvidence` records + digests; `library.registerFrame` stores one on the ROM's shelf |
| Identity | ROM SHA-256 and editor SHA-256 in every record and receipt |
| Evidence without ROM data in reports | digests, counts and offsets only; pixels and bytes stay in the private folder |

Blockers:
1. The emulator is global UI state (`emu`, `S`, `document`). A worker **inside the user's page** would share the
   machine with the developer. Run it out of process (Agent Lab + headless Chromium) until the core is separated.
2. Checkpoints are in-memory and per session. Persisting them ("known-good physical states" per ROM and area) needs a
   serialized form keyed by ROM SHA-256 **and emulator build** (states are not portable across emulator changes).
   The timeline's encoder already serializes the state graph.
3. There is no import of an Agent Lab result folder into the library yet; `library.registerFrame` takes one record
   from the page. An import of a folder of records (by digest, idempotent) is the missing bridge.
4. Reaching places is game knowledge. Ninja Gaiden has a RAM restart; other games need recorded input routes or
   search, each with its own evidence.
5. MMC2 frames cannot be synchronization-checked (§5). *Resolved 2026-11-22 (§12).*
6. Execution traces are bounded by RE runtime limits (2 M instructions, 4,096 coverage entries) and record writes,
   not reads. Data-flow from ROM tables ("which bytes built this frame") needs read instrumentation.

**Recommendation (smallest next step):** an Agent Lab job type `capture-plan` that:
1. loads the matching `NES_Forge.html` in headless Chromium;
2. runs a plan (generic, or a profile's) in checkpoint mode;
3. writes records, PNGs and a digest manifest to `private/<rom-sha>+<editor-sha>/frames/`;
4. is matched by a Forge import that registers those records in the library (idempotent by digest), linked to CHR and
   catalog entries, without touching the open project.

Then persist per-area checkpoints the same way. The developer keeps working; results appear in Resources › Library as
runtime captures with their evidence.

## 8. Background investigation — implemented (2026-11-21, Agent Lab v0.4)

The recommendation in §7 is built:

| Piece | Where | What it does |
|---|---|---|
| Capture worker | `tools/agent-lab/capture_worker.cjs` | persistent queue (one `job.json` per job, atomic writes); isolated headless Chromium; plans as data; per-target results (record, PNG, digests); pause/resume/cancel between targets; resume after a crash; one job at a time, lowered priority, time limit per job; local API on 127.0.0.1 with a token |
| Disk checkpoints | `EmulatorTimeline.exportCheckpoint/importCheckpoint` + worker | keyed by ROM SHA-256, editor SHA-256, mapper, header, boot plan; import fully decodes and validates before use; boot checkpoint used only if it restores to its saved state and was reproduced by a cold boot; target checkpoints must reproduce their capture digest |
| Validated import | `library.importInvestigation` | recomputes every section digest, decodes the screenshot and checks its pixels against the framebuffer SHA-256, re-renders the scene artifact; valid records become `frame` entries (idempotent), invalid ones are listed and discarded; the project is never touched |
| Navigation | Resources › Library, frame entries | Scene (open as a new Scene, undoable) → sprites with CHR file offsets → CHR bank entry → typed ROM location → CODE/RE; background CHR regions; PC → CODE/RE; every link labelled observed, verified or unverified; sprite → pose marked "not established" |
| Status in Forge | "Background investigation" panel | connect, investigate the open ROM, per-job progress, discoveries, unresolved items, failures, pause/resume/cancel, import, imported list |

Acceptance (`QA/agent-lab-background.cjs`, 11/11):

| Measurement | Result |
|---|---|
| Developer edits while the worker runs | tile clicks 45–56 ms; build 69 ms; Forge's own emulator 300 frames 1.7 s |
| Ninja Gaiden, 22 areas, first job (worker killed after 4 targets) | 67 s in total; after restart 52 s, boot restored from disk, 18 targets computed, none redone |
| Same plan again | 12.5 s: no boot, 22 target checkpoints, identical evidence digests |
| SMB3 (MMC3) and Contra (UxROM), generic plan | 3/3 frames each, all synchronization-checked |
| Import | 28 records validated and imported, 0 rejected; re-import adds 0; the project unchanged |

### Compatibility matrix (background investigation)

| Item | State |
|---|---|
| MMC1 (Ninja Gaiden, Mega Man 2, Zelda II), MMC3 (SMB3), UxROM (Contra), AxROM (Battletoads) | verified: checkpoint == cold boot, frames rebuild at 0 px |
| GxROM (Super Mario Bros. / Duck Hunt, mapper 66) | its header is correct (bytes 8-15 are zero); an earlier version of this table called it a damaged NROM header, which was wrong |
| Junk in the iNES header | reported, never repaired: junk in bytes 11-15 with byte 7 zero is a resolved note (the mapper is unaffected: Punch-Out!! PRG 1 "MJR", Metroid and Castlevania PRG 1 "NI 1.3"); junk that reaches byte 7 is "damaged header suspected" with both readings (Mega Man "DiskDude!": 66 with byte 7, 2 from byte 6 alone). A dump Forge recognizes by SHA-256 is named. |
| MMC2 (Punch-Out!!) | verified (§12): frames rebuild at 0 px with their scenes; checkpoint == cold boot; a plan reaches the Mike Tyson bout |
| CNROM (mapper 3) | verified on a cartridge Forge builds itself (§13): checkpoint == cold boot, frames rebuild at 0 px, the world's CHR bank; no commercial CNROM cartridge in the test set |
| Mappers the emulator does not run | the job fails with that reason; nothing is claimed |
| Reaching places in a game | game knowledge in a plan: Ninja Gaiden's restart plan only; other games get the generic first look |
| Sprite → pose/actor | established in Forge where the library has decoded poses for the ROM (§16, §17): every piece drawn in place, with the library's graphics or a complete layout; checked against Ninja Gaiden's and Punch-Out!!'s own pose variables. The worker itself does not link. |

## 9. Remaining issues

- ~~Forge reads Super Mario Bros' dirty iNES header as mapper 66.~~ Corrected (2026-11-22): the cartridge in the set
  is Super Mario Bros. / Duck Hunt, a GxROM (mapper 66) multicart with a correct header. The dirty header in the set is
  Mega Man's ("DiskDude!" from byte 7, so it reads as mapper 66 instead of 2). Forge reports it and does not repair it.
  Header cleaning, if wanted, belongs in ROM intake.
- ~~MMC2 (Punch-Out!!) rendering bypasses the runtime trace.~~ Resolved (§12). What remains approximate is the order of
  pattern fetches within a line (34 background fetches, then the line's sprites), which is the scanline renderer's,
  not the PPU's dot timing.
- ~~Linking OAM sprites to pose records needs game knowledge.~~ Done generically (§16) for ROMs whose catalog has
  decoded poses. The game's pose variables are used only to check it. Small poses (1-2 pieces) whose room the library
  has not established stay candidates.
- The per-scanline runtime trace runs on every emulated frame. Recording it only on frames that will be captured may
  speed bulk work (not measured).
- PPU emulation is scanline-based, not dot-exact. Mid-scanline effects are outside what a record can claim.

## 10. One ROM, no manual steps (2026-11-21, Agent Lab v0.4.1)

Once Forge is paired with the worker, with both remembered options on, importing a ROM queues its investigation, and
the finished job's validated frames enter the library on their own. The ROM's recovered catalog is registered too,
when Forge has a verified profile for it; for other ROMs Forge says there is none.
- **ROM identity**: the job is for the ROM named by the import event (project gateway, Import ROM, emulator Load ROM,
  `rom.import`), identified by SHA-256.
- **Duplicates**: the same ROM, plan, emulator build and verification reuses the existing job.
- **Statuses**: worker restarts appear as recovered interruptions, not failures. Unavailable CHR links are visibly
  disabled with their reason, and frame previews say whether the cartridge CHR data is linked.
- **Security**: pairing and signed requests ([AGENT_LAB_SECURITY.md](AGENT_LAB_SECURITY.md)).
- **Recovery**: project recovery no longer loses recent edits ([PROJECT_RECOVERY.md](PROJECT_RECOVERY.md)).
- **Acceptance**: `QA/one-rom-loop.cjs`, with Ninja Gaiden and SMB3.

The compatibility gaps in §9 are unchanged and still tracked:
- ~~MMC2 synchronization~~ (resolved, §12);
- ~~CNROM (untested)~~ (verified on a Forge-built cartridge, §13);
- malformed headers (reported, never repaired);
- ~~incomplete sprite → actor relationships~~ (sprite → pose links, §16; ROMs without decoded poses are still unlinked).

## 11. Interrupted catalog registration (2026-11-21)

A recovered catalog is registered in batches after the job's frames. Before this change, closing or killing Forge in
between left the catalog part-registered: the next tab saw the job as imported, and nothing finished it until a manual
**Import again**. The catalog now carries its own registration state, and Forge completes it on its own. There is
still one library and one ROM identity: the catalog pack (`catalog:<sha>`), its entries (`rom:<sha16>:…`), the frames
pack and the investigation receipt are the same records as before, and no separate recovery store exists.

- **Marker**: registration writes the catalog pack first with `state: "registering"`, the attempt number, the time
  and `lastError`. A finished registration rewrites it as `complete`; a failed one as `failed`, with the error.
  `library.catalogs` lists every recovered catalog as complete, incomplete, failed or missing (frames of a profiled ROM
  exist but no catalog was ever started), with attempts and the last error.
- **Resume, not redo**: completion reuses the same registration. An entry already stored with the same content hash,
  pack and evidence state (and, for poses, a rendition) is kept, not rewritten; the rest is written. The entries
  already stored are read page by page (`ResourceLibrary.entriesPage`, 1000 per page), so a catalog of any size is
  resumed; the pack records `pagesRead` and `alreadyStored`. Nothing is
  extracted or investigated again. The frames, the investigation pack and the project are not touched.
- **Triggers**: startup, a project change, a ROM import, and the Agent Lab panel's poll. The cartridge comes from the
  open investigated project, a ROM opened in this session, or the paired worker's copy of the job's ROM (verified by
  SHA-256). Without any of them the state is **needs-source**, and Resources › Library says so.
- **Bounded attempts**: at most 3 automatic attempts per catalog, across sessions. A registration counts on the
  marker. A failure before any registration starts (for example, the catalog's first record cannot be written) counts
  on a library meta record, `catalog-failures:<sha>`, which a success clears. After a failure the next attempt is scheduled 30 s later, then 120 s. After the third failure the state is
  **needs-retry**: nothing retries on its own, in that tab or a later one, and Resources › Library shows the error with
  a **Retry** button (`library.completeCatalog` with `manual: true` does the same). A completion in progress in one tab
  holds a Web Lock (`nes-forge-catalog:<sha>`), so a second tab reports "being completed in another Forge tab".
- **Visible**: every state change raises `forge:catalog-recovery`; failures and completions also appear as a toast.
  The panel's notices come from these events only: one per completion and per failed attempt. A missing cartridge is
  noticed only when the paired worker cannot supply it (not paired, unreachable, or no finished job for the ROM).
  While a catalog is incomplete, a frame's preview says so instead of saying the ROM has no catalog.
- **Test**: `QA/catalog-recovery.cjs` (owner-side, Ninja Gaiden). Registration is stopped part-way deterministically:
  after a fixed number of catalog writes, the library's entry store is held by another transaction, then the browser is
  killed (A) or the tab is closed normally (D). Phase B validates the completed catalog (590 entries, 32 CHR banks with
  the cartridge's bytes, 22 frames with their hashes, links into CHR and CODE/RE, reuse as a Scene and Metasprite in
  another project, project edits unchanged). Phase C restarts the worker and imports the ROM again, which is
  recognized without a new job or import. Phase E makes every write fail and checks the bounded attempts, the backoff
  and the manual Retry.

### Recognizing a recovered ROM

`LibraryCatalog.recognize(sha)` (command `library.recognize`) reads what the library already holds for a ROM: its
recovered catalog and state, verified frames, the investigations they came from, and other packs of the same
cartridge. It needs no worker and no ROM bytes. When a ROM is opened (any import event), Forge recognizes it first:
- a toast names what is known;
- if an investigation's verified frames are already in the library, the panel queues **no** investigation and says
  so; **Investigate selected ROM** still runs one on request;
- an incomplete catalog is completed with the imported cartridge.

`QA/library-integrity.cjs` (owner-side, Ninja Gaiden and Zelda II) checks the whole loop:
- a recovered pose copied into a new project: tiles, palettes and pieces compared with the cartridge's CHR ROM and
  the pose's own ROM bytes, also read back from the CHR Sheet's sprite bank;
- project copies stay independent of the library and of each other;
- after closing Forge and restarting the worker, the ROM is recognized without a job request, and visual and
  code-oriented resources (frames, poses, CHR, rooms, symbols, RAM map, CODE/RE at recorded offsets) open;
- Zelda II's registration is interrupted after 1120 entries and completed by the same generic recovery (two pages of
  the resume scan).

### The room each recovered pose is drawn in (catalog schema 4)

A pose's rendition, the drawing a copy receives, uses one room's tile banks and palette. Ninja Gaiden's 48 rooms
use 24 different sprite bank pairs, so the room matters: the same tile numbers give a real sprite in a room where it
appears and unrelated tiles elsewhere. Each rendition now records the room and the evidence for it (`context.basis`):

| Basis | Meaning | Ninja Gaiden | Zelda II |
|---|---|---|---|
| `decoded` | An actor's own code selects the pose: an immediate stored to the enemy slot's action (`enemy_action`, whose script lists its poses) or pose (`enemy_pose`), directly or through a subroutine that stores A there. The ROM's spawn tables place that actor in the room; the first such room in game order. | 83 | 0 |
| `runtime` | The stage survey saw it on screen in that room. A survey sighting replaces a drawing whose room is not established. | (after a survey) | — |
| `same-everywhere` | Its tiles are identical under every room's banks. | 55 | 22 |
| `default` | None of the above. Drawn in the default room and shown as "Room not established", with its number of art variants. | 64 | 8 |

- **Where it shows:** Resources › Library says "Drawn as in <room>: <evidence>" or "⚠ Room not established …". The
  provenance card of a copied sprite has a "Drawn as in" row.
- **Updating old catalogs:** a catalog registered by an earlier Forge reads as `outdated` and is updated
  automatically when its cartridge is available. Runtime observations and per-stage drawings are kept.
- **Survey evidence:** the stage survey now records, for each sighting, the room (RAM `$6E`) and the CHR banks the
  game had mapped for the play area. Ninja Gaiden sets its HUD banks in the NMI and the play area's after the
  sprite-0 split, so the banks are read from the emulator's per-scanline log at scanline 200, not between frames.
- **Validation (`QA/library-integrity.cjs`, phase G):** the survey plays five areas. At every sighting, the mapped
  bank equals the room's recorded bank for each pattern table the pose uses. The decoded actor → pose links never
  contradict the enemy type seen. Every stored stage drawing equals what the game drew.
- **Not established:**
  - poses whose actors are spawned by other actors (projectiles such as the axe), not by spawn tables;
  - poses set by shared code (the defeat animation);
  - bosses whose poses are chosen through tables;
  - Zelda II's 8 Link poses whose art differs by room.

### Status at a glance

- **Save and recovery state** is the chip in the Studio bar (`#studioState`): unsaved/saved, then the recovery state,
  coloured by level (amber when behind, red when failed). Details in `PROJECT_RECOVERY.md`.
- **ROMs in your library** (top of Resources › Library; `library.roms`): one line per ROM the library knows. It shows:
  - entries;
  - the recovered catalog's state, with attempts and the last error when it is not complete;
  - verified frames and investigations;
  - how its sprites are drawn (in their room, seen at runtime, same in every room, room not established);
  - other packs of the same cartridge.

  It follows recovery events live. **Open** selects the ROM's entries.
- **Background investigation notices** are kept for the browser profile (not only the tab). "Open in Library"
  therefore still works after closing Forge, and other open tabs show new notices at once. Older ones are marked
  "(earlier session)". A repeated notice updates its time instead of adding a line.
- **The imported-ROM list itself stays per session.** Forge stores no ROM bytes. After reopening, the ROMs Forge
  knows come from the library (the list above), not from the session's imports.

## 12. MMC2 synchronization (2026-11-22)

MMC2 (Punch-Out!!) switches CHR banks during a frame. Each pattern table has a latch, set to $FD or $FE when the PPU
reads the pattern row of tile $FD or $FE ($0FD8/$0FE8 for table 0, $1FD8-$1FDF/$1FE8-$1FEF for table 1). The latch
changes after that read, so the tile itself still comes from the bank before it. The MMC2 renderer
(`app/src/services/mmc2-emulator.js`) replaced the generic one and recorded no trace, so these frames could not be
rebuilt, checked or captured.

- **Trace.** For each line, the renderer now hands the runtime trace what it fetched:
  - the bank registers in effect at each background pattern fetch;
  - the bytes it read for each sprite row;
  - the latch state at the line's start and end, and the four CHR registers.
  The trace reads nothing again: a second read would switch the latches again. `recordLine(…, fetched)` in
  `03-runtime-capture.js` takes this instead of reading through the PPU bus.
- **Evidence.**
  - MMC2 frames rebuild like every other mapper's, and carry `synchronization: matched` and a scene artifact.
  - Sprite CHR offsets come from the trace, i.e. the bank at fetch time, and `spritePatternsAt: "fetch"` says so.
    Other mappers keep `"frame-end"`.
  - The emulator's Capture no longer refuses MMC2: it is the same validated trace capture.
- **Agent Lab.**
  - The plan `punch-out-us-prg1.json` uses recorded inputs only: title, passcode entry, and the Mike Tyson bout via
    passcode 007 373 5963. Since §19 it also reaches three more bouts by passcode.
  - Frames whose sprite locations come from fetch time are not reported as "unverified".
- **Cost.** In Chromium, Punch-Out emulation takes 5.6–6.1 ms per frame (3.0 before). That is the trace every other
  mapper already records (Ninja Gaiden: 5.7 ms), and still about three times faster than real time.

**Acceptance (`QA/mmc2-sync.cjs`, owner-side, Punch-Out!! PRG 1):**

| Check | Result |
|---|---|
| 13 frames along the route (boot, title, passcode, bout introduction, 8 frames of the bout) | all rebuild at 0 different pixels, background and composite |
| An MMC2 model written in the test from the mapper's description replays every line from its recorded start latches: 3,120 lines, 106,080 background fetches, 101,375 visible tiles, 7,176 sprite rows | 0 tile, bank, sprite-row or latch differences; every line starts with the latches the previous one ended with |
| The 1,648 tiles the traces recorded | equal the cartridge's bytes at their recorded offsets |
| Latches switch inside frames | on 20 lines; 12 of 13 frames draw pattern table $1000 from two banks |
| A bout frame captured as a Scene | 0 different pixels |
| Agent Lab, cold-boot verified: the generic plan (3 frames) and the Punch-Out plan (4 frames, the bout included; 7 frames and four bouts since §19) | 7/7 synchronization-checked, each with its scene; none reported with unverified sprite locations |

**Limits.**
- The model checks the latch and bank logic and the trace against an independent implementation, for the fetch order
  of Forge's scanline renderer. It does not check that order against the PPU's dot timing.
- Nametables and OAM are taken once the frame's last line is drawn. The game's vblank code, which runs before frame
  evidence is taken, already prepares the next frame.
- PRG 0, supplied later the same day, goes through the same route and checks. Both revisions reach the bout: 26 frames
  and 6,240 lines show 0 differences, and 3,296 tiles equal their cartridge's bytes. ~~The Agent Lab plan matches PRG 1 only.~~ PRG 0 has its own since §21.

## 13. CNROM (2026-11-22)

No CNROM cartridge is in the test set, but Forge builds CNROM itself. Worlds whose background graphics do not fit one
256-tile bank get one 8 KB CHR bank per world group (mapper 3; see `QA/t/cnrom-world.cjs`). `QA/cnrom-investigation.cjs`
investigates such a cartridge, built from repository inputs only: three worlds and synthetic art, so worlds 0 and 2
use bank 0 and world 1 uses bank 1.

| Check | Result |
|---|---|
| A capture plan visits each world (the engine's own screen variable, as a level select would) | from the boot checkpoint, every frame equals its cold-boot capture section by section and rebuilds at 0 different pixels |
| CHR | every mapped CHR window equals the cartridge's bytes at its reported file offset; world 1's frame is mapped from, and its background tiles come from, bank 1; worlds 0 and 2 from bank 0 |
| Agent Lab job, cold-boot verification (5 boots: the boot, its cold reproduction, one per world) | 3/3 frames synchronization-checked, each with its scene; no failures |
| Import into the library (Chromium) | 3 records validated (digests, screenshot pixels, scene re-render), 0 rejected; a second import adds nothing |

**Not covered:** a commercial CNROM game, whose code may switch banks in ways Forge's engine does not, such as bus
conflicts or mid-frame switches.

## 14. The sprites a frame drew, and where they were drawn from (2026-11-22)

- **One frame ahead.** Records used to list sprites from OAM at the snapshot. Most games copy the next frame's sprites
  into OAM during vblank, which runs before the snapshot. In Ninja Gaiden's area captures, only 1 of up to 16 listed
  sprites was actually in the frame (sprite 0, the status-bar split marker, which does not move).
- **What the record lists now.** The sprites the frame drew, from its trace. Each one's CHR location is the one in
  effect when it was drawn (line time, or fetch time for MMC2). It is claimed only when its drawn rows equal the
  cartridge bytes there. The rebuild check (0 different pixels, composite) already used these same traced sprites.
- **Sprites that switch their own bank.** A sprite whose rows came from more than one place lists them by row
  (`rowsFrom`), each row checked against the cartridge. Punch-Out!!'s latch sprites ($FD/$FE) do this: the first row
  comes from one bank, and the rest, read after the latch has switched, from the other.
- **The status-bar caveat.** A frame that splits at its status bar is no longer reported as "sprite pattern
  locations are unverified" when every drawn sprite has its traced location. The frame view in Resources › Library
  shows those locations.
- **Checked against the game's own data** (`QA/frame-evidence.cjs`). In all 22 Ninja Gaiden areas, every sprite drawn
  from pattern table $0000 lies in the sprite bank that the game's room table gives for the room it is in (PRG
  $AC90 + room, decoded by Forge's Ninja Gaiden decoder). For the seven other games, each drawn sprite has its traced
  location, or makes no claim (CHR RAM).

## 15. Every pack source-verified (2026-11-22)

With the original Castlevania US PRG 0 and PRG 1 and Mike Tyson's Punch-Out!! (U) PRG 0 cartridges supplied (each
matching its pack's declared SHA-256 exactly), `QA/native-corpus.cjs` passes for 19 cartridges. All 18 extraction
packs match their originals exactly, and `allPacksSourceVerified` is true. The cartridges stay private, outside the
repository.

## 16. Sprite → pose links (2026-11-22)

A captured frame now points to the library's decoded poses it draws (`Forge.services.PoseLinks`, command
`library.framePoses`), and a pose lists the captured frames that show it (`library.poseFrames`). This is generic: any
ROM whose catalog has pose records (pieces with tile, relative x/y and attributes) is matched the same way. Today that
is Ninja Gaiden (202 poses), Zelda II (30) and, since §17, Mike Tyson's Punch-Out!! (385 records per revision, §19).

- **Layout.** Every piece of a pose must be drawn: its tile, its position relative to the other pieces, and its flips.
  The whole pose may be mirrored when it has no decoded facing. A smaller pose whose pieces lie inside a larger matched
  pose is not reported.
- **Established, by layout and graphics.** Each drawn sprite's pattern is read from the cartridge CHR at the location
  it was drawn from (§14), and it equals the library's drawing of that piece.
- **Established, by layout.** The library has not established the room it draws the pose in (its drawing uses a
  default room), so other graphics are no evidence against the match. A complete layout of 3 or more pieces then
  establishes the pose, and the frame shows the CHR bank it is really drawn from.
- **Candidate.**
  - The same layout with other graphics, where the library's drawing is confirmed.
  - A 1-2 piece pose whose drawing is unconfirmed.
- **Ambiguous.** Several poses drawn exactly the same.
- **Not linked.** Older records, whose sprite list is OAM at the snapshot.

**Checked against the game itself (`QA/pose-links.cjs`).** Ninja Gaiden, 22 areas × 3 moments, 66 frames:
- **102 established links:** 90 by layout and graphics, 12 by layout. Every one of them, 36 enemy links included, is a
  pose that the game's own pose variables held in the frames that built the image (Ryu: RAM $83; enemies: the eight
  slots' pose at $438+X). **None contradicts them.**
- **Coverage.** Whenever a pose the game reported was drawn in place, Forge linked it: Ryu in 66 frames, enemies 35
  times. "Drawn in place" was found by the test's own layout search.
- **Candidates.** 13 candidates, all 1-2 piece poses with unconfirmed drawings.
- **Negative cases:**
  - one sprite moved by a pixel breaks a link;
  - a sprite pointed at another CHR bank leaves a candidate;
  - an older record is not linked;
  - Super Mario Bros. 3, which has no decoded poses, says so.
- **The library path.** Frames registered in the library give the same links. The frame view lists them, a pose opens
  from there, and the pose lists the frames that show it.

**Limits.**
- ~~Punch-Out!!'s fighter poses are not library pose entries.~~ They are now (§17).
- ~~Zelda II's matching is the same code, but it has not been checked against the game's variables.~~ Checked since §22.
- A link names the pose, not the actor slot. The game's actor tables are used only by the test.

## 17. Punch-Out!! poses in the library (2026-11-23)

Mike Tyson's Punch-Out!! (US PRG 0 and PRG 1) now has a recovered catalog in the library, so its frames link to the
fighters' poses like Ninja Gaiden's (§16). Ninja Gaiden's and Zelda II's catalogs come from the investigation's native
catalog. Punch-Out's comes from a **catalog provider** (`src/services/punch-out-library.js`), registered with
`LibraryCatalog.registerProvider`. It runs through the same registration, so the same machinery applies: automatic
completion, resumption, recognition, the status chip and Agent Lab's "add to the library".

**What is registered (per revision):**
- **499 pose entries**, one per full-pose record of the 14 fights (385 since §19, one per physical record). Several
  selectors of a fight's pose table can name one record: Mike Tyson's $08, $2E, $38, $4A and $52 are one record, and
  its entry lists all five. Without this, those would be five identical poses and could only ever be "ambiguous".
- **The 14 fights** (actors), **the 32 CHR banks** (4 KiB), and the RAM bytes the pose routine reads ($80/$81 sprite
  mode, $A1 pose selector, $A9 sprite bank, $B0/$B1 base position).

**How each pose is drawn.** Each record is drawn by running the game's own pose routine ($C890, `PunchOutContent`).
Four things found at runtime shaped this:

1. **Sprite mode per pose.** The routine's row height and tile step come from RAM $80/$81, and the game sets them per
   pose, not per fight. Mike Tyson's fight is configured for 8×16, but its poses 22, 58, 60, 70 and 72 are drawn as
   8×8 sprites with a tile step of 2. Glass Joe's are 8×8 with a step of 1. Each record is therefore drawn in all three
   modes, and each drawing is kept as a layout (`record.layouts`, drawings in `entry.layoutRenditions`). A frame is
   matched against the layouts of its own sprite height, and the link names the mode. The entry's default drawing uses
   the fight's configured mode.
2. **A base where the pose holds together.** Screen coordinates are 8-bit. The fight's configured base (Tyson: x = 220)
   makes wide poses wrap past the edge, and tall poses pin their top rows near the top of the screen. Each layout is
   therefore drawn at the base, from a grid, where the most pieces move together with the base. It is stored relative
   to that base. Every record has at least one such layout. In the 8×16 mode, 468 of 499 records do.
3. **Inherited attribute bytes.** 11 of the 543 full poses (62 pieces) never write some pieces' attribute bytes; the game
   keeps whatever the previous pose left there. The decoder now flags these pieces (`inheritsAttributes`). They are
   matched with any flips and drawn with palette 0, unflipped. Before this, the decoder reported $F8 (flipped both
   ways) for them.
4. **Records that select no CHR bank.** 59 of 499 records never set $A9. The decoder used to report its own starting
   value as their bank; it now flags this (`chrBankSelected`). The library does not draw these poses. A captured frame
   links them by a complete layout of 3 or more pieces (as with Ninja Gaiden's unconfirmed rooms, §16), and the frame
   shows the bank.

**Drawings.** Each drawn piece's pattern is read from the CHR bank the pose's tile stream selects ($A9), pattern table
$0000, with the fight's sprite palette. An 8×16 piece in the upper pattern table uses a bank the game sets elsewhere,
so it is not drawn. A pose whose drawing is incomplete cannot be used in a project; Forge says why and changes nothing.

**Matching changes (generic, in `PoseLinks`):**
- A record's layouts are matched only against sprites of their height.
- One match per entry and sprite set.
- Pieces the library cannot draw are matched by layout only.
- A layout match of 1-2 pieces with nothing to compare is not reported. Without this, a 2-piece Soda Popinski pose
  appeared as a "candidate" in 80 of Mike Tyson's frames.

**Checked against the game itself (`QA/punch-out-pose-links.cjs`, owner-side).** Each bout ran 1,800 frames, with a
frame evidence record every 6th frame. The game's pose selector is RAM $A1 (full poses below $80, delta poses from
$80).

| | Mike Tyson (PRG 1) | Mike Tyson (PRG 0) | Glass Joe (PRG 1) |
|---|---|---|---|
| Links | 144: 133 by layout and graphics, 11 by layout (pose 60, which selects no bank) | 144 (same) | 158, all by layout and graphics |
| Sprite modes linked | 8×16: 104; 8×8 step 2: 40 | same | 8×8: 158 |
| Links in frames without a delta pose: agree with $A1 / contradict it | 102 / **0** | 102 / **0** | 101 / **0** |
| Links while a delta pose was active (not checked against $A1) | 42 | 42 | 57 |
| Coverage: the game's current pose drawn in place / linked | 102 / 102 | 102 / 102 | 101 / 101 |
| Candidates, ambiguous, links to another fight | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 |

- **Coverage was checked independently.** The test decodes the game's current full pose with the game's routine, at
  the runtime base ($B0/$B1) and sprite mode ($80/$81), and finds every piece at its screen position.
- **Links while a delta pose is active.** A delta changes the previous full pose. When the result equals another full
  pose exactly, Forge links that pose; for example, pose 8 plus delta $C4 draws pose 6. $A1 then names the delta, not
  a full pose, so these links are reported separately.
- **The catalog.** Both revisions were registered through the automatic completion path, and a second completion
  found them complete. 1,042 locations, 0 inconsistent. Every drawn piece (51,242 per revision) equals the
  cartridge's bytes, which the test reads itself, and every palette equals the fight's palette bytes.
- **Negative cases:**
  - one sprite moved by a pixel breaks the link;
  - a sprite pointed at another CHR bank leaves a candidate.
- **The library path.** Frames registered in the library give the same links. The frame view lists them, a pose opens
  from there and lists the frames that show it, a complete drawing can be used in a project, and an incomplete one is
  refused.

**Limits.**
- Delta poses are not catalogued, so frames showing a delta result that equals no full pose stay unlinked.
- Which sprite mode the game draws a pose in is known only once a frame links it. The default drawing is the fight's
  configured mode, which is wrong for some poses (Tyson's 8×8 poses). Since §18, a linked frame replaces such a drawing
  with the pose as it was drawn.
- Only the Mike Tyson and Glass Joe bouts were played. The other twelve fights use the same code, but their links have
  not been checked against the game.
- Registration draws 499 records in three modes and takes about 20 s in the browser, yielding between fights.

## 18. What the frames showed, recorded on the poses (2026-11-23)

A frame that links a pose (§16, §17) is now recorded on that pose. Where the library's own drawing of the pose falls
short, the frame also gives the pose a drawing as observed. This is done by `PoseLinks.recordObservations`, the
command `library.recordObservedPoses`. It runs on its own after a frame is registered (Agent Lab imports included)
and after a ROM's catalog is registered, so frames registered before the catalog are counted too.

- **Recorded.** Each frame that establishes a pose with sprite-mode layouts (Punch-Out!!) is listed on the pose
  entry (`entry.observed`: the frame, the sprite mode, how the link was established, the CHR banks).
- **Drawn as observed.** A pose gets a drawing from the first frame that establishes it when its default drawing:
  - is incomplete (pieces in the upper pattern table);
  - is unconfirmed (no CHR bank of its own);
  - guesses palette and flips (inherited attribute bytes);
  - or is in another sprite mode than the one the game drew.

  The drawing as observed takes:
  - each piece's pattern from the cartridge, at the location its sprite was drawn from (row by row where a
    sprite's rows came from several banks, as MMC2 latch sprites' do);
  - the frame's sprite palette;
  - the flips as drawn.

  It becomes the pose's drawing (basis "runtime", "seen on screen in <frame>"), so it is what Use in project places.
  The decoded drawing is kept (`entry.decodedRendition`), and both survive a catalog upgrade.
- **Kept as they are.** A complete drawing in the mode the game drew keeps its decoded drawing; the frame is only
  recorded. Recording again changes nothing.
- **Not changed here.** Ninja Gaiden's and Zelda II's drawings depend on the room and stage, which the stage survey
  records (§11 onward), so frames do not change them.

**Checked (`QA/punch-out-pose-links.cjs`, check 7):**
- **Pose $16** (Tyson, 52 pieces). It is drawn as 8×8 sprites in a fight configured for 8×16, and its decoded 8×16
  drawing is garbled. It now has the drawing it showed in frame 3059.
- **Pose $3C** (11 pieces). It selects no CHR bank of its own, so the library could not draw it before. It now has
  the drawing it showed in frame 3707, and it can be used in a project.
- **Exactness.** In both, every pattern row equals the cartridge bytes at the location its sprite was drawn from
  (read by the test), and the palette, flips and positions are the frame's.
- **Unchanged.** Pose $00 (8×16, complete) and Glass Joe's pose $02 (8×8, complete) keep their decoded drawings, with
  the frames recorded.
- **Repeatable and persistent.** A second recording changes nothing, the result survives a page reload, and the pose
  view says "seen on screen in …".

**Limits.**
- **First frame only.** The first frame that establishes a pose gives its drawing. Later frames that show it with
  other banks or colours, such as a hit flash, are recorded but don't change it.
- **Delta poses** are still not catalogued (§17).

## 19. Five Punch-Out!! fights, and what they showed (2026-11-23)

The checks in §17 played two fights. Five can be reached without winning a bout: Glass Joe (a new game) and the
first bouts of the circuits, by passcode. The fourth passcode also needs Select+A+B held after the digits.

| Fight | Route | Sprites |
|---|---|---|
| Glass Joe | new game | 8×8 |
| Don Flamenco (first fight) | 005 737 5423 | 8×8 |
| Piston Honda (rematch) | 777 807 3454 | 8×16 and 8×8 |
| King Hippo | 135 792 4680, then Select+A+B | 8×8 |
| Mike Tyson | 007 373 5963 | 8×16 and 8×8 |

**The fights each passcode reaches were identified, not assumed.** For each one, the test checked which fight's
decoded poses the game draws.

**Two things the new fights showed**, both now handled:

1. **A fight's first bout and its rematch use the same pose records.** Don Flamenco, Piston Honda and Bald Bull
   share all of theirs (same bank, same addresses), and Von Kaiser and Great Tiger share some. With one entry per fight
   and record, every Don Flamenco and Piston Honda match was "ambiguous" (164 and 179 times, 0 links).
   - **Now:** the catalog has one entry per physical record (385 instead of 499), listing every fight and selector
     that uses it. It is drawn with the first fight's colours, and says that the other fight uses other colours.
   - **Upgrades:** this is the provider's version 2. A library that holds a version-1 catalog sees it as outdated, and
     Forge registers it again when the cartridge is available. Entries with the same id keep what frames showed, and
     the entries version 2 no longer has are removed with the old catalog.
2. **The game flips some poses after drawing them.** King Hippo's pose $24 is drawn with every piece's horizontal
   flip inverted, at the positions the pose routine gives. With the game's whole RAM in place, the routine still
   writes the unflipped bits, so other code flips the pose afterwards.
   - **Old behaviour:** the matcher, which mirrored a whole pose when the pose has no decoded facing, linked pose
     $3A mirrored, and the game's selector contradicted it.
   - **Now:** Punch-Out records say they are never mirrored as a whole (the game draws each facing from its own
     record), and that the game may flip a whole pose horizontally. A link made that way says so ("flipped
     horizontally by the game after its pose routine"), and such a pose gets its drawing as observed (§18).

**Checked against the game itself (`QA/punch-out-pose-links.cjs`, 9/9).** Six bouts, 1,800 frames each, a record
every 6th frame:

| Bout | Links | Agree with $A1 / contradict | During a delta | Coverage |
|---|---|---|---|---|
| Mike Tyson (PRG 1) | 144 | 102 / **0** | 42 | 102 / 102 |
| Glass Joe | 158 | 101 / **0** | 57 | 101 / 101 |
| Don Flamenco (first fight) | 164 | 105 / **0** | 59 | 105 / 105 |
| Piston Honda (rematch) | 179 (8×16: 125, 8×8: 54) | 104 / **0** | 75 | 104 / 104 |
| King Hippo | 143 (32 drawn flipped) | 115 / **0** | 28 | 115 / 115 |
| Mike Tyson (PRG 0) | 144 | 102 / **0** | 42 | 102 / 102 |

- **No noise.** No bout has a candidate, an ambiguous match, or a link to a fight other than the one played.
- **Drawings.** All 39,091 drawn pieces per revision equal the cartridge bytes.
- **The upgrade (a new check).** A version-1 catalog planted for PRG 0 is outdated, and is replaced on completion: the
  entry it no longer has is removed, the entry it still has keeps its observation, and one complete catalog remains.

**Agent Lab (`punch-out-us-prg1.json`).** The plan now reaches the four passcode bouts. Each is captured at a moment
when the fighter's full pose, not a delta, is on screen: 740, 600, 680 and 712 frames after the bout starts. Those
moments were found frame by frame. `QA/mmc2-sync.cjs` runs the plan cold-boot verified, and checks that each
fighting frame shows that fighter's pose drawn in place. All four do: Mike Tyson, Don Flamenco (first fight), Piston
Honda (rematch) and King Hippo. A frame imported from these jobs is linked and recorded like the ones above.

**Not covered.** ~~Nine fights can only be reached by winning bouts.~~ They are reached through the opponent
number since §20. ~~The PRG 0 plan does not exist yet.~~ It does since §21.

## 20. All 14 Punch-Out!! fights (2026-11-23)

**The opponent number.** The fight table §17 reads (bank 13, at CPU $A0D1 once mapped) is indexed by RAM $01, the
opponent number:
- **Where it is read.** At $AAED the bout's loading code does `LDA $01 / ASL / TAY / LDA $A0D1,Y` and stores the
  fight's bank and entry offset in $02 and $03.
- **Where it is set.** New Game sets it at $A47A, from the circuit-start table at $A185 (0, 3, 7, 12, $14, 13). After
  a bout, the next opponent comes from the table at $A10D.
- **The window.** Writing $01 once does not work: before New Game it is overwritten, and at the introduction the
  fight is already loaded. Written before every frame of the first 150 after New Game, it lands between the two, and
  the game plays that fight.
- **Checked.** Each of the 14 fights was identified from the poses the game then draws.

**Frame runs that write RAM.** `FrameEvidence.runFrames`, which Agent Lab plan targets and the tests use, now takes
`{from, to, ram: {address: value}}` in its input spans. The value is written before every frame of the span, and those
frames run one at a time.

**All 14 fights checked against the game (`QA/punch-out-pose-links.cjs`, 9/9).** The nine fights no passcode starts
are reached through $01 and played for 900 frames each. The six bouts of §19 run as before.

| Bout | Links | Agree with $A1 / contradict | Coverage | Drawn flipped |
|---|---|---|---|---|
| Von Kaiser | 70 | 35 / **0** | 35 / 35 | |
| Piston Honda (first fight) | 64 | 31 / **0** | 31 / 31 | |
| Great Tiger | 71 | 32 / **0** | 32 / 32 | |
| Bald Bull (first fight) | 91 | 57 / **0** | 57 / 57 | 18 |
| Soda Popinski | 103 | 75 / **0** | 74 / 74 | 18 |
| Bald Bull (rematch) | 93 | 66 / **0** | 66 / 66 | 17 |
| Don Flamenco (rematch) | 76 | 60 / **0** | 60 / 60 | |
| Mr. Sandman | 89 | 67 / **0** | 67 / 67 | 8 |
| Super Macho Man | 69 | 42 / **0** | 42 / 42 | |

- **The other fights** are as in §19: Mike Tyson (both revisions), Glass Joe, Don Flamenco (first fight), Piston Honda
  (rematch) and King Hippo, all with 0 contradictions and complete coverage.
- **No noise.** No bout has a candidate, an ambiguous match, or a link to a fight other than the one played.
- **Flips.** The horizontal flip the game applies after its pose routine (§19), found on King Hippo, also appears on
  Bald Bull (both fights), Soda Popinski and Mr. Sandman. Every such link agrees with the game.

**Agent Lab reaches every fight.** The Punch-Out plan (`punch-out-us-prg1.json`) now has 17 targets:
- the title and passcode entry;
- the Mike Tyson bout's introduction;
- one fighting frame for each of the 14 fights:
  - Glass Joe, by New Game;
  - four by passcode;
  - nine by the opponent number, written in a RAM span of the target's inputs.

Each is captured while that fighter's full pose is on screen; the offsets were found frame by frame. `QA/mmc2-sync.cjs`
runs the plan cold-boot verified (the job takes about 9 minutes on this machine), and checks that each of the 14
fighting frames shows its fighter's pose drawn in place. All 14 do. A user whose worker investigates the cartridge
therefore gets a linked frame of every fight in the library, and through §18, a drawing as seen for every pose those
frames establish.

## 21. An Agent Lab plan for Punch-Out!! PRG 0 (2026-11-23)

Until now the Agent Lab worker had a Punch-Out plan for PRG 1 only, so a PRG 0 cartridge got the generic first look.
`punch-out-us-prg0.json` now gives PRG 0 the same 17 targets, matched by PRG 0's SHA-256.

- **Same targets, checked, not assumed.** Before writing the plan, each of PRG 1's 14 fighting targets was replayed on
  PRG 0 the way the worker runs it, and each frame showed the expected fighter's full pose drawn in place. The routes
  (passcodes, Select+A+B, the opponent number in RAM $01) and the capture frames carry over unchanged.
- **Kept in step.** A unit test (`tools/agent-lab/tests/capture_worker.test.cjs`) checks that each revision's SHA-256
  chooses its own plan and that the two plans' boot and targets are identical.
- **Checked by the worker.** `QA/mmc2-sync.cjs` now also runs PRG 0's plan, cold-boot verified, when the PRG 0
  cartridge is supplied. Each revision's plan must be chosen for its own cartridge, and each of PRG 0's 14 fighting
  frames must show its fighter, decoded with PRG 0's own pose records. PRG 0's header is clean, so its job has no
  header item; PRG 1's "MJR" note is unchanged.
- **Cost.** The three cold-boot-verified jobs (generic, PRG 1, PRG 0) take about 19 minutes on this machine, against 9
  for the first two; `mmc2-sync`'s time limit in `QA/verify.py` is raised from 40 to 60 minutes. Its heartbeat every 30 s
  still keeps the 300 s silence stop meaningful.

## 22. Zelda II's links checked against the game (2026-11-23)

Zelda II's 30 library poses are Link's: 15 pose selectors × 2 facings, each the output of the game's display code run
with RAM $80 = pose and $9F = facing (§16). Their links had not been checked against the game. `QA/zelda2-pose-links.cjs`
(owner-side) now does that.

**The game's answer.** Variables alone are not enough. When Link dies, the game resets $80 and $9F while his last pose
is still on screen. So the test asks the display code itself:
- Each object is drawn at $EC02 (`LDX $11`, then the object's pose $80,X).
- The routine at $EBF0 falls into it after its own "skip" test (`LDA $048D / BNE` to an RTS). Five other callers jump
  straight to it; the death sequence is one of them.
- Each time object 0 (Link) is drawn there, the test records $80 and $9F. The hook is test-only, on the opcode fetch at
  $EC02, and does not change the game.
- A frame's image was drawn within its last three frames. When the game drew Link in none of them (a transition), the
  last pose it drew is what is on screen.

**The route.** From a fresh save: title, file select, a name registered, slot 1. Then three phases, a frame captured
every 6th frame (every 12th on the overworld):

| Phase | Frames | Links | Agree / **contradict** |
|---|---|---|---|
| A. North Palace: walking, crouching, attacks, jumps | 113 | 113 | 113 / **0** |
| B. Out of the palace and across the overworld until an encounter | 144 | 31 (still in the palace) | 31 / **0** |
| C. A forest battle: two Deelers, hits, blinking, death and restart | 235 | 199 | 199 / **0** |

- **Coverage.** Whenever a pose the game drew is drawn in place (the test's own layout search), Forge links it: 343 of
  343.
- **Frames without a link.** The 36 frames in play without a link show none of the drawn poses in place. In those,
  Link is blinking after a hit, or the screen is in a transition.
- **Every link established by layout and graphics.** 18 poses (selectors 0–7 and 10, both facings). Every link's
  sprites come from CHR bank 2.
- **No noise.** No candidates and no ambiguous matches. On the overworld (101 frames), no link.
- **Negative cases.** A sprite moved by a pixel breaks the link. A sprite pointed at another CHR bank leaves a
  candidate.
- **The library.** Registered frames give the same links through `library.framePoses`, and the frame view lists Link's
  pose.

**One wording fix.** The inspector called every runtime capture "runtime capture (Agent Lab investigation)", including
frames captured in Forge's own emulator. It now names an Agent Lab investigation only when the frame was imported from
one, with its job id, as the library's provenance card already did. The suite checks it.

**Not covered.** Poses 8, 9 and 11–14 did not occur on this route. 12–14 hold an item above Link's head. The library's
poses are Link's only: enemies are not catalogued, so their sprites stay unlinked.
