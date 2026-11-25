# AL-REC-01: persistent ROM recovery and reconstruction

Status: implemented and tested (`QA/al-rec-01.cjs`). Related: [CAD-PORT](CAD_PORT.md),
[Agent Lab experiments](AGENT_LAB_EXPERIMENTS.md), [Frame evidence](FRAME_EVIDENCE.md),
[Emulator compatibility](EMULATOR_COMPATIBILITY.md).

Recovery used to be bounded: a fixed investigation plan ran once per ROM and build, a ROM whose results were in the
library was not investigated again, and graphics counted only when they were established completely. AL-REC-01 makes
recovery persistent and incremental. Investigating a ROM before does not mean it has been recovered completely, and
a ROM whose results are already in the library can still have more to find.

## 1. Restrictions, and what replaced them

| Restriction (where) | Why it existed | Replacement |
|---|---|---|
| Experiments only on synthetic fixtures (`ExperimentRunner.run`, `MetatileDiscovery.discover`, experiment panel) | Slice 1 did not handle commercial cartridges: their banking, private data or approval | `contract.authorize`: a synthetic fixture as before; or a locally supplied cartridge that meets all of these: privacy `"private"`, a supported mapper (0, 1, 2, 3, 4, 7), and the user's explicit approval for that cartridge's SHA-256. The bus observer translates bank-switched PRG addresses to file offsets. Archaic headers are read by the shared rule. Trials still run temporary variants of the immutable original. |
| Sandbox NROM only (`experiment-sandbox.js`) | as above | Supported mappers. Recovery runs (`explore` requests) accept any mapper the emulator loads. |
| A ROM whose results are in the library is not investigated again (`investigation-panel.js`) | To avoid repeating identical work | An explicit option, *Keep recovering ROMs already in the library*. With it, Forge queues a continuation plan. Without it, the notice says how to continue. A manual *Investigate selected ROM* of an already investigated ROM continues instead of returning the finished job. |
| Job reuse when the ROM, plan and build match (`capture_worker.cjs`) | Deduplication | Kept for identical work. A continuation plan names the exploration archive it starts from, so new evidence makes a new plan. A converged exploration completes, with its stop reason. |
| Fixed plans (`plans/*.json`) | No evidence to plan from | Generated continuation plans (`--plan continue`, `--plan deep`, or `plan: "continue"` from Forge) with `explore` targets. In the editor, every run plans from the ledger: it resumes the archive, and earlier signatures are not new again. |
| CAD-PORT `PROJECT_PAGES = 12` | A Forge scene carries its own 256-tile sheet, so project memory grows with pages | Every page with established graphics is editable, in linked project parts of 12 pages. The resource lists its parts. TMNT: 157 editable pages before, 308 after. |
| Graphics only from a completely established CHR table (`graphicsOf`, all 256 tiles) | A partial table cannot draw every page | Used tile by tile: a page is drawn when every tile it uses is established. Runtime captures also give translated screens *captured graphics* (below). |
| No editable copies from partially recovered resources | Same | Partial tables, captured graphics, and every runtime capture (a validated editable scene) give editable copies. Each says which kind of graphics it has. |

## 2. The recovery ledger (`src/services/recovery-ledger.js`)

There is one record per cartridge (by SHA-256), in its own IndexedDB database (`nes-forge-recovery`). Investigation
jobs are recorded apart from it. A finished job or run never marks the cartridge recovered. The record holds:

- **Known signatures:**
  - nametable 8×8-tile blocks (with attributes);
  - CHR RAM tiles, or CHR ROM 1 KiB banks;
  - palettes;
  - sprite patterns;
  - translated screens seen.
- **Observations:** library entry ids, with why each was new, whether it rebuilt without difference, and which
  translated screens it shows.
- **Graphics:** traced CHR RAM captures, with per-tile classes, the routines that wrote them, and the tiles writable
  to PRG.
- **Investigations:** every run, with its mode, budget, the states it resumed from, its stop reason and what it added.
- **Sessions:** gameplay recordings.
- **Other records:** experiments, failed hypotheses, blocking conditions, and the recommended next investigations
  with the reason for each.
- **Separate stores:**
  - *archives*: machine states of distinct game situations, as starting points, with the input path from power-on
    where one is known;
  - *displayed*: what frames displayed when translated screens were seen in them.

## 3. Incremental investigation

The **explorer** (`src/services/recovery-explorer.js`) runs in an isolated copy of the editor (the experiment sandbox,
or an Agent Lab page). It refuses the editor's own emulator, and it stops the page's emulation loop, so that input
paths replay exactly.

**Starting points.** On a cartridge's first run, five power-on input scripts are played from reset and sampled every
30 frames. Later runs start from the archive.

**Each step:**
1. Choose a state, favouring rarely visited and recently productive ones.
2. Restore it.
3. Play an input macro: walk, run, jump, climb, menus, or seeded random input.

**What counts as new:**
- 3 or more new layout blocks;
- 8 or more new CHR RAM tiles, or a new CHR ROM bank;
- a new palette;
- 4 or more new sprite patterns;
- a translated screen not seen before.

Each new observation is recorded with Forge's frame evidence: a state snapshot, plus an editable scene rebuilt from it
and compared with the rendered frame pixel for pixel.

**Budgets:** frames, wall time, states, observations and state bytes.

**Stop reasons:**
- a budget is exhausted;
- the user paused or cancelled;
- *converged*: many steps in a row found nothing new. This is reported as a stop reason, not as complete recovery.

**Controls** (ROM recovery panel, and the `recovery.*` commands):

| Control | What it does |
|---|---|
| Continue Recovery | 20,000 frames |
| Investigate Missing Resources | 30,000 frames, more states |
| Deep Recovery | 90,000 frames, with CHR RAM tracing |
| Retry Unresolved Resources | Another seed, with tracing |
| Investigate Current Emulator State | Captures what the user's emulator shows and keeps the state as a starting point. It never advances or restarts the user's emulator. |
| Record Gameplay for Recovery | While the user plays, new situations become observations and starting points. Bank changes and area transitions are counted. When recording starts at power-on, the starting points are replayable and traceable. |
| Pause | Keeps the states |
| Resume | Continues from the kept states |
| Cancel | Keeps what was found |

After a run, the cartridge's CAD-PORT pack is rebuilt with the new evidence, and it replaces the earlier pack.

## 4. Dynamic CHR RAM recovery (`src/re/recovery-trace.js`, `src/re/chr-provenance.js`)

The tracer wraps the instruction step, CPU read, CPU write and PPU write in the isolated copy. It follows the origin
of every byte value through:
- registers, including the carry flag (bit-stream decoders move data through it);
- internal and cartridge RAM;
- code running in RAM (Battletoads uploads graphics from RAM-resident routines);
- operands patched into that code.

For every CHR RAM byte it keeps:
- the origin of the byte's value;
- the routine that wrote it;
- how often it was written;
- how many contents the tile slot held.

It also logs upload batches and mapper writes. A capture associates the CHR RAM with what the PPU shows at that moment:
nametables, attribute tables, palettes, PPU registers and scroll, and the PRG and CHR banks with file offsets.

**Tile classes:**

| Class | Meaning |
|---|---|
| direct | Copied from PRG: one 16-byte run, two 8-byte planes, or decoded bit by bit and equal to PRG bytes |
| transformed | Inverted or mirrored copies, or 1 bpp graphics expanded with a constant plane |
| compressed | Run-length, literal bytes with generated runs, VRAM back-references, or arithmetic on PRG data |
| procedural | Generated without PRG data |
| assembled | Mixed origins in one tile |
| untraced | Written before tracing; located by content where possible |

A *rewritten* flag marks slots that held several contents during the trace.

**Writeback** (`chr-provenance.writeback`):
- Direct tiles are written into PRG whole.
- Some copied bytes are also tested by the decoder: compared with a value, bit-tested, or branched on as zero or sign.
  Battletoads' level graphics are such an escape-coded stream. These tiles are marked *checked*, and an edit is written
  only if every tested property of each byte is kept. Otherwise it is refused, with the byte and the test named. In the
  acceptance probe, the three edits that turned a byte into an escape value (`$5B` or `$5D`) broke the stream before
  this rule; with it they are refused, and the seven accepted edits all reach the game's CHR RAM.
- Plane expansions accept edits that keep the filled plane.
- Run-encoded tiles accept edits that keep their generated bytes.
- Other classes are refused, with the reason.

The acceptance suite writes back a traced Battletoads tile and replays the game. The tile the game uploads is the edit.

**Two kinds of editable graphics, kept apart:**
- **Captured graphics:** exact for the frame they were captured at, and editable as a scene. They are not traced to the
  cartridge.
- **Fully traced native graphics:** writable back into the cartridge.

## 5. Scenes and world organization

**Scenes.**
- Every runtime capture is a validated editable scene.
- CAD-PORT pages are split into linked parts.
- Translated screens seen at runtime get the capture's background CHR and palette, so they are drawn and editable.

**Displayed state.** The explorer samples what a frame *displayed* at the entry of the game's NMI handler. By the end of
the emulated frame, a game such as Battletoads has already started writing the next frame's nametables. Matching at
frame end missed Battletoads Level 1 entirely; at NMI entry it matches on every frame.

**World organization.** This comes from the transitions a run observed:
- **Areas:** palettes the game used.
- **Scrolling:** scroll-register changes within an area.
- **Transitions:** changes of area, with the inputs that caused them.
- **Order:** the earliest frame from power-on at which each area was reached.

Limits: areas that share a palette are not told apart, and screens are not stitched into continuous maps.

## 6. Experiments on locally supplied cartridges

The AL-EXP-02 method runs unchanged on approved local cartridges:
- immutable original;
- isolated sandbox sessions;
- temporary mutation variants;
- sealed receipts;
- repeatability checks before any claim;
- explicit approval before promotion;
- frame, wall-time and evidence budgets.

Exported evidence for private plans carries hashes, offsets and outcomes, never cartridge bytes. Supported mappers are
0, 1, 2, 3, 4 and 7. MMC2 (Punch-Out) is refused, with the reason.

Trace comparison changed in one respect. A trace capped at 100,000 events says nothing about the events after its cap,
so two traces are now compared only up to the earliest frame both recorded. Long commercial runs reach the cap, and a run
restored from a checkpoint reaches it later. Before the change, the repeatability check failed on that artefact alone.

## 7. Reconstruction report (`RecoveryLedger.assess`, command `recovery.report`)

The report covers fourteen categories:
- CHR graphics;
- palettes;
- metatiles;
- screens;
- level layouts;
- world transitions;
- sprites;
- metasprites;
- animations;
- entities;
- collision;
- audio;
- gameplay logic;
- native ROM writeback.

**Levels counted for each category:** captured, decoded, editable, independently verified and writable, each with its
basis.

**Pixel comparison:** how many runtime captures rebuild without difference.

**Graphics coverage:**
- CHR ROM: banks seen in use, against banks in the cartridge;
- CHR RAM: tiles seen, and the latest traced classification.

**Verdict:** always starts *Not reconstructed 1:1*. It names the categories with nothing recovered. A category counts
only with evidence, never because library entries exist.

## 8. Measurements

- `tools/al-rec/measure.cjs`: library, plus one Agent Lab job with the plan the worker chooses. The pre-implementation
  baseline is in `QA/fixtures/al-rec-01/baseline.json`.
- `tools/al-rec/recover.cjs`: the same cartridges after implementation, in the real editor. It runs the usual import
  and the existing extraction pack, then Continue Recovery, then a traced continuation from the first run's states.
- Both record counts and hashes only.

## 9. Limits

- **Translated layouts:** objects, level layouts and collision from CadEditor are still not translated (CAD-PORT
  limits).
- **No game-specific knowledge:** entities, collision rules and gameplay logic have no general recovery. The ledger
  lists them as blocked, with that reason.
- **Exploration finds what its inputs reach:** stages behind passwords, item requirements or skilled play need gameplay
  recording or game-specific seeds.
- **Writeback of compressed graphics** is limited to edits that keep the encoder's generated bytes. Re-encoding needs
  the game's encoder.
- **World maps** are organized by area, scrolling and transitions. Screens are not stitched.
- **Commercial discovery:** the metatile finder's hypotheses (2×2 tables) did not explain Castlevania's or Mega Man 2's
  blocks in the inputs tried. Those runs end inconclusive, every tested hypothesis falsified, and nothing is claimed.
