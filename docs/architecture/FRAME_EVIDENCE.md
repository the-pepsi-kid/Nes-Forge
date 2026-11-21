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
| `nametables`, `palette`, `oam` | 2 KiB VRAM, 32-byte palette RAM, 256-byte OAM; `sprites`: decoded OAM with each pattern's CHR offset |
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
| Punch-Out!! | 9 (MMC2) | ROM | yes | offsets match the file | **unverified**: MMC2 renders outside the runtime trace, so no rebuild check; the latch-switched CHR mapping is not independently verified |
| CNROM (3), mappers 11/66 as intended | — | — | not tested (no cartridge in the set) | — | — |

**Genuinely reusable (any emulated mapper):** checkpoints, capture plans, the evidence record, PRG location by
content, CHR offsets for CHR ROM, synchronization by rebuild (all except MMC2), and trace on demand.
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
5. MMC2 frames cannot be synchronization-checked (§5).
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
| NROM via a damaged header (Super Mario Bros reads as mapper 66) | runs; the worker reports "damaged header suspected" and does not repair it |
| MMC2 (Punch-Out!!) | runs; frames are **not** synchronization-checked (renderer outside the runtime trace); no scene artifact is produced |
| CNROM (mapper 3) | **unverified**: no cartridge in the test set |
| Mappers the emulator does not run | the job fails with that reason; nothing is claimed |
| Reaching places in a game | game knowledge in a plan: Ninja Gaiden's restart plan only; other games get the generic first look |
| Sprite → pose/actor | not established automatically (listed as unresolved) |

## 9. Remaining issues

- Forge reads Super Mario Bros' dirty iNES header as mapper 66 (GxROM). It runs only because the game never writes a
  bank register. Header cleaning belongs in ROM intake.
- MMC2 (Punch-Out!!) rendering bypasses the runtime trace: no synchronization check, and the latch-aware CHR mapping
  is unverified.
- Linking OAM sprites to pose records needs game knowledge (Ninja Gaiden: enemy slots); generic tile matching would
  only give candidates.
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
- MMC2 synchronization;
- CNROM (untested);
- malformed headers (reported, never repaired);
- incomplete sprite → actor relationships.

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

