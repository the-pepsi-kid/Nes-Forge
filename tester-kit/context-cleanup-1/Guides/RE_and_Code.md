# Reverse engineering and 6502 source

This guide covers the **RE / DISASM** and **CODE** workspaces in NES Forge 2.0.0-alpha.11, candidate **audio-tool-import-1**. It explains what you can inspect, recover, edit, save and build. Recovery is limited to the specific formats described below. A decoded instruction, captured picture or matching routine is evidence to investigate; it is not automatically a recovered game project.

## Choose the right starting point

| You want to… | Start here | What it changes |
| --- | --- | --- |
| Inspect any ROM or raw binary | **RE / DISASM → GENERAL ROM ANALYSIS → Open for analysis** | Opens a separate immutable file snapshot; leaves the project and emulator alone |
| Observe a running NES program | **EMULATOR → Load ROM**, then **RE / DISASM → RUNTIME INVESTIGATION** | Loads emulator state; tracing is a separate explicit action |
| Inspect the exact emulator file | **Use emulator ROM for analysis** | Copies that file into general analysis without resetting the game |
| Recover graphics, a supported background/map, or native audio | Open general analysis, then **Discover recovery methods** | Reports installed method support; previews and imports remain separate actions |
| Recover the Bridge Room demonstration | **RECOVER EDITABLE PROJECT → Choose ROM** | Stages a separate known-profile project; **Import as new project** replaces the current project in one undoable operation |
| Reopen an editable Forge-generated ROM | Top-level **Open Forge ROM** | Reads supported Forge metadata/source; this is different from decoding an unfamiliar game engine |
| Capture a game's current appearance | **Import ROM**, or emulator capture controls | Adds captured or supported packed scene data; a picture does not establish native collision, gameplay or music |
| Write code for the current project | **CODE** project assembly editor | Edits assembly saved with the ordinary Forge project |
| Inspect/build a supplied source tree | **CODE → Open source workspace** | Uses an isolated multi-file document with its own save/export controls |

**Keep these four things separate:** the editable Forge project, the file opened for general analysis, the emulator's loaded ROM/state, and the temporary edited native-audio ROM copy. They have different save controls. A project save does not save all investigation sessions.

### Which examples are in this kit?

The tester kit includes the **Scout** project and ROM under `examples/`. You can use its ROM for general analysis, physical CHR inspection and runtime observations. Scout is a Forge-generated control; it is not evidence that an unrelated game engine can be reconstructed.

The built-in **Open multi-file example** needs no extra download. The following advanced examples require the **full source checkout**, with paths relative to its `app/` directory. They are not missing tester-kit files:

| Example | Full-checkout path | Purpose |
| --- | --- | --- |
| Raw counter and overlapping banks | `examples/RE_Analysis/` | Tiny static-analysis exercises |
| Bridge Room | `examples/RE_Bridge_Room/Bridge_Room.nes` | Known native room/collision/Pulse 1 recovery |
| Pepsi vending | `tests/fixtures/re-runtime/pepsi_vending_v9e.nes` | Runtime-state investigation and immediate PPU background construction |
| HonkeyPong | `examples/RE_Native_Audio/HonkeyPong-reproduced.nes` | Bounded linked FamiTone2 audio and pointer-page background profile |
| Double Action Blaster Guys | `examples/RE_Native_Map/` | Declared command-map/Empty-Solid collision subset |
| Supplied source workspaces | `examples/Source_Intake/` | Forge build control and independently supplied ca65 source intake |

## General ROM analysis: controls and meanings

Use **Choose ROM or binary**, then **Open for analysis**. Selection alone does not open the file. The identity panel records the name, byte count and SHA-256 of the opened bytes. General analysis accepts files up to 64 MiB independently of whether Forge can emulate them. Valid recognized iNES/NES 2.0 containers expose physical PRG/CHR spans. Unrecognized or malformed containers retain raw inspection with a diagnostic.

| Control or panel | Use and result |
| --- | --- |
| **Show general analysis / Show emulator disassembly** | Switches the main view between the independent file analyzer and the current emulator-mapping disassembly |
| **File offset**, **Range bytes**, **View range** | Chooses a physical byte span in the opened file; plain numbers are decimal, `$` or `0x` prefixes are hexadecimal |
| **Previous 512 bytes / Next 512 bytes** | Pages through the selected span, showing at most 512 bytes per page |
| **CPU origin (optional)**, **Bank label**, **CPU variant** | Supplies the mapping and instruction interpretation for the selected span; leave the origin blank if unknown |
| **Save mapping**, saved mapping list, **Go to mapping** | Saves and revisits an analyst-defined mapping; separate banks can map to the same CPU address |
| Hex and instruction listings | Shows original bytes alongside candidate instructions; data can resemble instructions |
| **Raw CHR patterns · grayscale** | Shows physical 8×8 CHR-ROM patterns when a trusted container identifies their location |
| **Previous 256 tiles / Next 256 tiles** | Changes the physical CHR page; colors are pattern values 0–3, not recovered game palettes |
| **Hex bytes**, **Search from file offset**, **Search** | Searches a literal byte pattern, such as `A9 01 8D`; records physical matches |
| **Cancel search**, result list, **Go to result** | Stops pending search or jumps to a selected match |
| **Labels and comments · user evidence** | Expands annotation controls: **File offset**, **Length in bytes**, **Label**, **Comment**, **Save annotation** |
| **Download inspection + notes** | Saves file identity, diagnostics, mappings and annotations as evidence JSON |

The **6502** and **2A03** choices decode official instructions in this implementation. Unofficial opcodes and truncated instructions remain `.byte`. They are not a 65C02/65C816 decoder. Each page begins decoding from its own first byte; a page boundary need not be an instruction boundary.

**File offset** includes the header and any trainer. A **CPU address** describes where bytes are mapped when a stated mapping applies. A **physical CHR bank** describes storage, not necessarily the mapper's currently visible window. Do not exchange these three address types.

### Tutorial: inspect and annotate the supplied Scout ROM

1. Open **RE / DISASM → GENERAL ROM ANALYSIS** and choose `examples/Scout_Gameplay_Core_2.0.0-alpha.11.nes` from the kit. Select **Open for analysis**.
2. Check its displayed name, byte count and hash. Set **File offset** to `0`, **Range bytes** to `16`, and select **View range**. The first four bytes should be `4E 45 53 1A`, the NES container signature.
3. Enter `4E 45 53 1A` in **Hex bytes**, set **Search from file offset** to `0`, and select **Search**. Select the offset-zero match and **Go to result**. This locates the header; it does not identify gameplay code.
4. Expand **Raw CHR patterns · grayscale** and page through the stored graphics. Read the physical file range shown for each page.
5. Expand **Labels and comments · user evidence**. Enter offset `0`, length `4`, label `NES signature`, comment `Observed container signature`, then **Save annotation**.
6. Select **Download inspection + notes** and save the JSON. The original ROM and your authoring project remain unchanged.

**Expected result:** a repeatable physical-byte finding with source identity and a saved annotation. Inspection JSON cannot be reopened as an editable Forge project or restored as an analysis session in this version. Export before opening another analysis file or closing the page.

**Search limits:** patterns contain 1–256 bytes. Work yields between 1 MiB chunks and stops at 256 results. When capped, the start field moves to a continuation offset; search again to continue. Set the start back to `0` before a new whole-file query. A capped list does not prove later matches are absent. Up to 128 mappings and 256 annotations are retained per session; labels allow 160 characters and comments 2,000.

### Emulator disassembly

**Disassemble PRG** reads the currently mapped CPU window of the loaded emulator ROM. It follows direct control flow from RESET/NMI/IRQ, displays vectors, labels and code/data counts, and retains other bytes as data. With bank switching, this is one current mapping, not all cartridge banks.

**Download .asm** saves that listing. **Copy ASM to Code Tab** replaces project assembly after a confirmation when existing code is present, switches to CODE, and disables scene packing to avoid overlaying the copied window. Save your project before replacing code. Generated labels and hardware-register descriptions are analysis aids, not recovered original symbols, comments or filenames. Reassembling a mapped listing does not reconstruct a whole bank-switched cartridge or its source tree.

## Discover available recovery methods

In the general-analysis workspace, open **Available recovery methods** and select **Discover recovery methods**. Read each method's status, explanation, operations and limits. Discovery examines the exact original file; it does not run a game, import data or erase an edited native-audio copy.

| Status | Interpretation |
| --- | --- |
| **supported** | The method recognizes its required structure; the selected conversion still needs its own checks |
| **unknown** | The bounded probe could not establish that profile |
| **unsupported** | A declared requirement is outside the method |
| **ambiguous** | Evidence does not select one safe interpretation |
| **invalid** | A required structure is malformed or inconsistent |

**Cancel discovery** stops publication of pending results. **Download method evidence** saves the recognition report. Selecting another file invalidates results immediately: complete **Open for analysis**, then discover again.

Successful routes are **Open tile recovery tools**, **Open native background recovery**, **Open native map and collision recovery**, **Open native Audio tools**, and **Open AUDIO transcription tools**, as applicable. These reveal the appropriate panel; they do not perform the preview or import for you.

### Physical CHR: recover editable tile pixels

1. Open the Scout ROM for analysis and expand **Raw CHR patterns · grayscale**.
2. Choose the desired physical tile page, then **Preview native tile import**. Review the hash, tile indices and source-byte range.
3. Select **Import as new tile sheet**. A new scene is appended and selected; existing scenes remain.
4. Open **CHR SHEET**, edit a pixel, and **Save Project As…** to keep the editable result. **Undo** removes the import; **Redo** restores it.
5. With that imported sheet selected, use **Download active sheet CHR** for the current raw planar graphics and **Download recovery evidence** for the original import record.

**Expected result:** an editable grayscale tile sheet with preserved 2-bit pixels and source provenance. Each selected tile is checked by encoding it back to its original 16 bytes before import. The sheet is excluded from ROM builds by default. Its arrangement and grayscale palette are inspection aids, not recovered scene placement or palette choices.

This method accepts 1–256 physical CHR-ROM tiles per operation. It does not recover CHR RAM, compressed PRG graphics, sprite groups, active bank visibility, maps, collision or audio. Reimporting the same source/range is refused to prevent duplicate identities. An edited `.chr` file is not a playable ROM or an automatically safe native patch.

### Native background: recover one supported static construction

Two bounded profiles are available through **Background recovery method**:

| Method name | Full-checkout example | Recovered result and boundary |
| --- | --- | --- |
| **Immediate PPU background construction** | Pepsi vending | Approved initialization/palette/construction routines establish a static background; vending states and credits are not recovered |
| **Vector-linked pointer-page nametable loader** | HonkeyPong | Proven native pointer upload plus palette/CHR; one untouched final attribute is unknown and explicitly supplied as zero for conversion |

Both target declared NTSC mapper-0 iNES layouts with 16/32 KiB PRG, 8 KiB CHR and no trainer. A different instruction sequence can remain unknown even if it renders a similar picture. HonkeyPong's profile has a specific supported legacy-header interpretation; generic container/CHR recovery can still refuse that same original file.

**Tutorial, full checkout required:** open the chosen source for general analysis, select its method, and **Preview background**. Inspect the thumbnail, coverage, hash, warnings and **Full source evidence and construction**. Tick the displayed limitations acknowledgement and select **Import as new scene**. The scene is appended, selected and excluded from the current build; one Undo reverses it. Alternatively choose **Download background project**, open that separate JSON, then build its static viewer.

**Download background evidence** saves the preview's provenance. **Cancel preview** abandons pending work. Source, method or project changes require a fresh preview before import. A duplicate resource is refused. The separate project download remains the original preview result; use **Save Project As…** after editing the imported scene.

**Expected result:** editable tiles, nametable, attributes and palette data for one static background. Source sprites, collision, raster behavior, scroll, later writes, music and original game code are not part of this conversion. Empty collision defaults mean “not recovered,” not verified walkable space.

### Native map and collision: the declared Empty/Solid subset

This method handles the supported Double Action Blaster Guys command-metatile representation. It does not convert every map in that game. The pinned input contains 52 level configurations; 39 reference 22 unique command maps and 13 are procedural. One referenced resource meets the current static Empty/Solid conversion subset; others show refusal reasons.

**Tutorial, full checkout required:** open `examples/RE_Native_Map/DABG-reproduced.nes` for general analysis. Use its discovery route, or choose **NES command metatile maps** in **Scene recovery method**. Select **Find maps**, choose an eligible **Native map / region**, then **Preview map**. Review geometry, collision and the conversion acknowledgement. **Import as new scene** appends an excluded scene. **Download map project** saves the independent playable adaptation; **Download map evidence** saves provenance.

For a ready-made edit exercise, open `examples/RE_Native_Map/DABG_Static_Map.nesforge.json`, then **Build & Run**. Change its floor tile properties to Empty in COLLISION, save and rebuild. The player should fall through the still-visible floor. `DABG_Static_Map_Floor_Opened.nesforge.json` provides the corresponding control.

The conversion expands a visible 16×15 native metatile area into 32×30 Forge cells. It does not collapse every nonempty native value into Solid: one-way surfaces, hazards, moving blocks, teleports and unknown cells can prevent conversion. Graphics use the proven reset palette and bounded PB53 CHR-RAM construction, omitting native random decoration and later game effects. The separate project supplies an authored test player and Forge movement; these are not recovered original physics or actors.

Where identical tile graphics have different collision meanings, linked metatile quadrant overrides take precedence over tile properties. Inspect collision after graphics/attribute changes that detach those links. Original DABG NES 2.0 static analysis support does not imply that the emulator frontend can play that original cartridge.

### Bridge Room and Forge metadata recovery

**Bridge Room, full checkout required:** under **RECOVER EDITABLE PROJECT**, use **Choose ROM → Preview editable recovery** on `examples/RE_Bridge_Room/Bridge_Room.nes`. Review **Show recovered solid collision (pink)**, raw background CHR and **Recovery limits and adaptation notes**. **Import as new project** replaces the active project in one undoable step. **Download Forge project JSON** saves the editable staged project; **Download inspection report** saves separate evidence.

This bounded profile decodes native fixed-room graphics, Empty/Solid collision, player art/spawn and sixteen constant Pulse 1 timer rows. The original demo supports left/right movement; the rebuild adapts it to Forge's player runtime, including jump/attack controls. It has no recovered original SFX, combat implementation or multi-room engine.

**Open Forge ROM** instead reads supported Forge-authored metadata/source. World WG17 builds can recover their checked embedded project source. Single-room GP16/layout-3 recovery is partial and does not restore Gameplay Core source. **Import ROM** retains its append/capture behavior; World ROMs direct you to **Open Forge ROM**. Keep native project JSON/ZIP as the complete authoring backup. **Run Original ROM** plays preserved imported bytes; **Build & Run** compiles current project edits. Editing a captured or recovered scene does not patch the preserved original ROM.

## Native audio: inspect, edit a copy, or transcribe

These are three separate operations. The native profile recognizes one structurally verified linked **FamiTone2 v1.11** configuration, including checked instruction relationships and data pointers. A familiar engine name, filename or a similar APU routine does not establish support. The current profile accepts bounded mapper-0 iNES containers; other instruction builds, banking, NES 2.0 and dynamic initialization patterns remain outside it.

### Native evidence and same-layout edits

After opening the ROM for general analysis, go to **Native audio · FamiTone2 profile → Analyze current ROM**.

| Control | Purpose |
| --- | --- |
| **Profile limits and diagnostics** | Explains recognition results and refusals |
| **Native subsong**, **Channel** | Selects native decoded records; logical rows are not necessarily video frames |
| **Editable native command** | Selects a proven one-byte note/cut or instrument-selection command |
| **Previous 100 commands / Next 100 commands** | Pages the editable command inventory |
| **Native note code · 0 cuts** | Changes a driver-native code: tonal 0–60, noise 0–16; these are not MIDI note numbers |
| **Decoded instrument** | Selects an already decoded instrument for a supported instrument command |
| **Apply native edit** | Changes the permitted existing byte in a separate ROM copy, checks aliases and decodes it again |
| **Undo native edit / Redo native edit** | Navigates this native-copy history, independently of project Undo |
| **Referenced instrument evidence** | Shows referenced records and volume/arpeggio/pitch-envelope evidence |
| **Known SFX evidence · partial inventory** | Shows statically proven effects and NTSC/PAL streams; dynamically supplied IDs can remain unknown |
| **Download native ROM copy** | Saves the current native bytes; project saving does not save this session |
| **Download native evidence** | Saves the decoded source/edit report, not the ROM or an editable Forge project |

**Tutorial, full checkout required:** analyze `examples/RE_Native_Audio/HonkeyPong-reproduced.nes`, select subsong `0` and a tonal channel, then choose an existing note command. Read its file/CPU location and original code. Change it by one supported native code, select **Apply native edit**, review affected aliases, and download the copy. Load the downloaded copy separately in EMULATOR to compare it with the original. **Undo native edit** restores the prior copy. The source opened for general analysis is unchanged.

Only existing supported note/cut and instrument-selection bytes can be edited. Pointer, length, timing, envelope, arbitrary-offset, DPCM and SFX-stream edits are not offered. Shared stream references can affect several events, so read the reported aliases. **Analyze current ROM** again starts a new native session from the original analysis file and discards that session's edits; export first.

### Transcribe native music into AUDIO

1. Analyze the native ROM and choose **Native subsong**.
2. Under **Transcribe native music into AUDIO**, choose **Native rows in excerpt (1–1024)**. Start with `64` on the full-checkout HonkeyPong example.
3. Select **Preview import to AUDIO** and read **Conversion evidence**, source identity, timing, pitch/envelope differences and capacity estimate.
4. Select **Transcribe music into AUDIO** and review the confirmation. This appends patterns/instruments and replaces the music order plus global tempo/speed. Existing SFX records remain, but their timing uses the new tempo/speed.
5. Open AUDIO to edit and preview. Use **Save Project As…** for the resulting score. Project **Undo/Redo** reverses/reapplies the import as one operation. **Download transcription evidence** saves the historical conversion report.

**Expected result:** a finite editable score excerpt with terminal cut/padding, using tempo 150 and speed 1 so one row is an NTSC video frame. The entire resulting order loops, including padding; the original engine's intro, loop, pause, song switching and calls are not reconstructed. Preview can refuse PAL, DPCM, nonzero pitch envelopes, short-mode noise or unsupported control/timing/data. The output is bounded to 16,384 video frames and 255 imported patterns/instruments, with existing project and build limits checked too.

Import does not enable **Compile Audio Runtime** or **Autoplay tracker order as music**, run a ROM, or switch the active tab. Set runtime options deliberately before a build. The audio-data estimate is not a complete ROM-fit guarantee. Changed source bytes, subsong, excerpt length or project content require another preview. Native-copy edits are included when the current analyzed native session is used.

### Transcribe a native SFX into AUDIO

The current project must already use **tempo 150 / speed 1**. The importer refuses incompatible timing rather than changing an existing song for you.

1. After native analysis, select **Find SFX** under **Transcribe native SFX into AUDIO**.
2. Choose **Statically proven native SFX** and select **Preview SFX transcription**.
3. Read **SFX conversion evidence** and the tuning, phase/retrigger and mixing differences. Tick the acknowledgement, then **Import SFX into AUDIO** and confirm.
4. Inspect the appended patterns, instruments and named SFX in AUDIO. Connect a gameplay/animation sound trigger separately; none is recovered automatically.
5. Save the project. Use **Download SFX evidence** for provenance, or **Cancel SFX transcription** to abandon staging.

The subset accepts one fully known pulse channel, supported controls/timers and a finite stream that fits one current pattern plus a terminal cut. On the supplied HonkeyPong input, effects 0 and 1 each have twelve audible frames and fit; effect 2 uses two pulse channels and is refused. Native mixer arbitration, simultaneous streams, exact waveform/retrigger behavior and original game triggers are not reproduced. Existing music order, timing, runtime settings and bindings remain unchanged. Duplicate source-effect imports are refused. Project Undo removes a successful import.

## Runtime investigation: observe an event

Load a supported ROM in **EMULATOR**. Return to **RE / DISASM → RUNTIME INVESTIGATION** and select **Use emulator ROM for analysis**. The displayed hash connects runtime evidence to the exact original file. Choosing another general-analysis file does not replace the emulator ROM; a mismatched **View originating code** request is refused.

| Control | What it does |
| --- | --- |
| **Show runtime investigation** | Reveals the results workspace |
| **Start trace** | Starts at the current game state, clears the prior observation set and memory A/B, retains watches |
| **Trace from reset (resets game)** | Deliberately resets and arms tracing before initialization |
| **Stop trace** | Stops collecting; does not replace a separate emulator pause action |
| **Refresh results** | Refreshes executed-code, write-event and resource lists |
| **Clear observations** | Discards observations without editing the project or ROM |
| **Executed code and originating ROM bytes** | Shows observed PCs, mapped physical offsets and execution counts |
| **Event type** | Filters All writes, PPU writes, APU writes or Watched RAM writes |
| **Previous 128 / Next 128** | Pages memory, code or write lists within their own section |
| **View originating code** | Opens the selected event/instruction's verified physical location in general analysis |
| **Export runtime evidence** | Saves source identity, bounded events, code coverage and snapshots as JSON |
| **Export observed PPU resources** | Saves observed nametable/palette/CHR-RAM bytes, known masks and their event references |

### Tutorial: locate graphics writes in Scout

1. In EMULATOR, **Load ROM** using the kit's Scout `.nes`.
2. In RE, choose **Use emulator ROM for analysis → Trace from reset (resets game)**.
3. Return to EMULATOR and **Run** long enough for the scene to appear, then pause playback.
4. Return to RE and choose **Stop trace → Refresh results**. Set **Event type** to **PPU writes**.
5. Select a write and **View originating code**. The analyzer opens a small verified byte span at its origin; extend the range only after checking the mapping.
6. Export the runtime evidence before starting a different interval.

**Expected result:** observed writes and code locations from actual execution. An initialization trace is needed to see initialization writes; beginning later cannot recover missed history. The originating instruction may compute or decompress data, so its location is not automatically the original asset's location.

A trace stops at 2,000,000 observed instructions, 8,192 events or 4,096 executed-code records. Read the stop reason. This bounds retained evidence; it does not prove every path was visited. Frame/cycle fields reflect Forge's instruction-level emulator, not cycle-exact hardware verification. An empty APU list means no APU writes were observed in that interval, not necessarily that the cartridge contains no audio.

Observed resource bytes have a `known` mask. A zero placeholder with `known: 0` means unobserved, not verified black/empty data. Resource and runtime exports are evidence-only; they do not reopen a saved machine state or import a native scene.

### Compare RAM and watch a candidate variable

1. If tracing writes, start the trace first; starting a new trace clears old A/B snapshots.
2. Pause at a starting state and select **Save memory A**.
3. Run one short controller action in EMULATOR, then pause and select **Save memory B**.
4. Choose **RAM region**: All RAM, Internal RAM or Cartridge RAM. Choose **Comparison**: Changed, Unchanged, Increased, Decreased or After equals. For the latter, enter **After value (decimal or hex)** from 0–255. Select **Compare memory**.
5. Select a candidate and **Use selected address for watch**, or enter a known **Watch address**. Enter **Your label (optional)** and select **Add watch**.
6. Start a new trace, repeat the action, then inspect **Watched RAM writes**. **Remove selected watch** removes a watch without changing RAM.

**Expected result:** byte changes and write origins to investigate. A changing byte can be a timer or temporary value rather than the intended game state. Comparisons are unsigned: 255→0 is a decrease, not an inferred wrapped increment. Snapshots read RAM backing arrays, not I/O registers. They are observations, not restore points.

Up to eight RAM addresses can be watched. Internal mirrors normalize to `$0000–$07FF`; available cartridge RAM uses `$6000–$7FFF`. Labels are your hypotheses. Reset, successful ROM replacement, CPU Trace and history restoration invalidate incompatible observations. ROM changes also clear watches. Export useful evidence before navigation or a new trace.

## Checkpoints, scripted input and reversible RAM experiments

These controls are under **Runtime investigation → Checkpoints and reversible experiments**. They operate on the currently loaded emulator session, independently of the project and static analyzer.

### Checkpoint controls

Enter **Checkpoint name**, then **Save checkpoint**. Saving pauses the emulator and retains CPU, PPU, mapper, logical APU, RAM, controller latches and completed framebuffer state. Select a saved entry in **Saved checkpoints** and use **Restore selected** to return to it while paused, or **Delete selected** to remove it.

Up to sixteen checkpoints fit within a separate 32 MiB encoded-state budget. Names allow 64 characters. Limits reject another save rather than evicting an existing named checkpoint. These are temporary session states, not project JSON or downloadable save states. Reset, successful ROM replacement, CPU Trace and unloading invalidate them; a failed ROM load retains the current session.

### Tutorial: replay the same short input

1. Load and run Scout to a useful starting view. Save a checkpoint named `Before movement`.
2. In **Input steps**, enter:

```json
[
  {"frames": 30, "buttons": ["Right"]},
  {"frames": 10, "buttons": []}
]
```

3. Tick **Restore selected checkpoint before replay** and select **Run input script**.
4. Record the resulting frame/view. Run the same script again from the same checkpoint and compare.

**Expected result:** the same emulator state from the same checkpoint and inputs within Forge's supported implementation. Keyboard/touch/gamepad input is isolated during script replay. **Cancel script / navigation** stops further frames and leaves playback paused; executed frames remain. Restore the checkpoint to rewind them.

Buttons are `A`, `B`, `Select`, `Start`, `Up`, `Down`, `Left`, `Right`. Empty `buttons` means neutral input. Opposite directions and duplicate names are rejected. Each step uses 1–600 frames, with up to 256 steps and 1,800 frames total. Replay drives the actual emulated program; it does not automatically find a stage, enemy or health variable.

### Reversible RAM edit controls

Enter **Your hypothesis label**, **RAM address** and **Byte value**, then **Apply reversible RAM edit**. The UI exposes one byte at a time. Decimal, `$hex` and `0xhex` are accepted. Allowed addresses are internal RAM `$0000–$1FFF` with mirrors normalized, and available cartridge RAM `$6000–$7FFF`. Values must be 0–255. I/O, mapper registers and ROM are refused.

Applying creates a full **Before:** checkpoint and changes RAM directly. **Restore experiment** restores the whole machine, including time and all later effects. **Keep emulator state** discards the rollback checkpoint and retains the current state. Only one reversible experiment is active; its checkpoint is protected from ordinary deletion. Reset or ROM replacement invalidates it.

**Tutorial, full checkout required for the known-byte example:** load the exact Pepsi vending fixture, enter its product-selection state with Start, pause, and compare/watch `$0001` while A adds credit. Its known fixture meaning is credits. Once your observations confirm that relationship, apply a labeled edit to `$0001`, run briefly, then **Restore experiment**. Expect a full state rewind, not merely one inverse byte write. Do not transfer that address or meaning to other ROMs.

The tools do not currently provide breakpoints, read watches, value freezes, ROM shadow patches, arbitrary mapper support, exported/imported snapshots, or generic “change stage/health/enemies” commands.

## CODE: assembly belonging to the project

The main CODE text editor holds project assembly. It uses normal text selection and keyboard editing. **Assemble (Ctrl+Enter)** checks and assembles it; the sidebar displays **Assembly Status**, code size/origin, **Errors**, **Symbol Table** and **Hex Output**. Clicking an error moves to its source line. Assembly alone does not load the emulator or prove a working cartridge.

| Control | Purpose and caution |
| --- | --- |
| **Insert template… → Minimal (vectors + loop)** | Replaces the editor after confirmation when needed; creates an intentionally blank boot program |
| **Scene Viewer (working engine)** | Generates project-scene viewer assembly with vectors; regenerate after changing the scene count |
| **Scene Constants (generated)** | Inserts packed-scene layout constants at the selection; these describe the retained packed layout, not every newer runtime's internal addresses |
| **ROM CONFIG → Mapper** | Generated cartridge target is mapper 0/NROM; importing another mapper does not add a generator for it |
| **Mirroring** | Chooses horizontal or vertical nametable arrangement for the generated header/profile |
| **Battery-backed SRAM ($6000–$7FFF)** | Declares the cartridge battery-backed RAM configuration; it does not implement a game's save system |
| **Pack scene data at $D000** | Reserves/emits the established scene payload alongside compatible assembly; overlapping code/data is an error |
| **Memory Map**, **Build Log** | Helps inspect placement and complete build diagnostics |
| Top-level **Build .NES ROM / Build & Run** | Compiles the selected project build mode; the latter loads the successful fresh result into EMULATOR |

Custom project assembly belongs to **Gameplay → Scene viewer / custom assembly** mode. The generated single-room/World runtimes have their own validated build paths; this editor is not an automatic patch point for arbitrary code into those engines. Audio Runtime cannot be inserted into custom assembly: disable it for that build, or use a generated runtime. With scene packing off, the custom build uses the active CHR banks and ignores the Build Scene Set/authoring metadata. Use the build diagnostics to resolve unsupported combinations and overlapping reserved regions.

### Assembler syntax reference

The `forge-6502-v1` dialect supports the official 6502 mnemonics/addressing modes, labels, semicolon comments, constants (`NAME = expression` or `.define NAME expression`), and integer expressions. Numbers can be decimal, `$hex`, `0xhex` or `%binary`; unary `<`/`>` select low/high bytes. `a:` forces absolute addressing when a small value would otherwise choose zero page.

| Directive | Meaning |
| --- | --- |
| `.org address` | Sets the assembly address |
| `.byte` / `.db` | Emits byte values or byte-sized quoted strings |
| `.word` / `.dw` | Emits little-endian 16-bit values |
| `.macro name parameters` … `.endm` / `.endmacro` | Defines a bounded textual macro; invocation errors use the invocation line |
| `.rsset address`, `name .rs size` | Assigns reserve symbols without emitting PRG data |
| `.enum address` … `.ende` | Provides the retained reserve-origin form |

Overlapping writes, unresolved/cyclic constants, illegal addressing modes, oversized operands and out-of-range relative branches are errors. The project editor does not directly support `.include` or `.incbin`; use the source workspace below for those. Foreign ca65/NESASM/ASM6/Ophis syntax is not automatically translated.

### Tutorial: build an intentionally blank program

1. Save your current project, then create a new project for this exercise.
2. Open **Gameplay** and select **Scene viewer / custom assembly**.
3. Open CODE and choose **Minimal (vectors + loop)**. Turn off **Pack scene data at $D000** for this standalone boot exercise. Keep Audio Runtime disabled.
4. Choose **Assemble (Ctrl+Enter)**. Expect valid vectors, symbols and no errors.
5. Select **Build & Run**, then run/step the resulting ROM in EMULATOR if it is paused.

**Expected result:** an intentionally blank display while the reset code loops. This template contains no PPU drawing or gameplay. Save with ordinary **Save Project As…** to retain project assembly. Use the multi-file example below when you want a positive RAM-write result and independent source export.

## Multi-file source workspace

Select **CODE → Open source workspace**. **Return to project assembly** switches back. The source document has its own current files, preserved original bytes, entry/build settings and exports. A successful source build does not replace the authoring project, insert generated Gameplay/Audio Runtime, or load the emulator.

| Controls | Purpose |
| --- | --- |
| **Import source files / Import source folder** | Replaces the isolated document after its confirmation; folder import retains relative folder names |
| **Open saved source workspace** | Opens `.nesforge-source.json`, restoring current and preserved original files |
| **Open multi-file example** | Loads a self-contained entry/includes/macro/binary-data/vector example |
| **Save source workspace** | Saves the editable isolated document; ordinary project save is not its backup |
| **Export source ZIP** | Saves the workspace JSON plus `current/` and `original/` file trees |
| **Entry file** | Chooses the root source file for assembly; a filename default is only a convenience |
| **PRG size** | Selects 16 or 32 KiB |
| **Mirroring** | Selects horizontal or vertical |
| **CHR source** | Selects an exactly 8,192-byte CHR file, or **CHR RAM (no CHR ROM)** |
| **Edit file** and text editor | Edits a selected text file; binary bytes remain preserved, not converted into text |
| **Build source ROM** | Preprocesses and assembles the current entry into the bounded mapper-0 profile |
| **Download source ROM** | Saves the latest valid build, which you can load explicitly in EMULATOR |
| **Export symbols and source map** | Saves assembler values and preprocessing provenance, not an instruction-level debugger map |
| **Export expanded ASM** | Saves include/binary-expanded source for inspection |

Changing files, building or exporting commits a pending text draft. Editing source/settings invalidates a prior build; build again before downloading it as current. Files remain byte-exact until edited, after which text is encoded as UTF-8. Export before replacing the workspace or closing the page. ZIP import is not offered: extract a saved source ZIP and open its workspace JSON.

### Tutorial: assemble, test and preserve supplied source

1. Select **Open multi-file example**. Note the entry and file list.
2. Select each file in **Edit file** to inspect the entry, includes and binary asset. Leave its existing settings for the first build.
3. Select **Build source ROM**, then **Download source ROM**.
4. In EMULATOR, explicitly **Load ROM** using the downloaded file. Run a few frames and pause.
5. In Runtime investigation, select **Save memory A** and **Save memory B**, choose **Internal RAM**, **After equals**, and enter `70`; choose **Compare memory**. Inspect address `$0000` among the results.
6. Return to CODE's source workspace and use **Save source workspace** and/or **Export source ZIP**. Reopen the saved workspace through **Open saved source workspace**.

**Expected result:** the sample writes decimal `70` into `$0000` then loops; its display is intentionally blank. The saved source document restores files and edits independently of the active Forge project. Do not expect loading this source-built ROM to restore editable source through **Open Forge ROM**: this profile does not embed a Forge authoring project.

### Includes, binary data and build boundaries

The workspace adds deterministic preprocessing for literal paths:

```asm
.include "src/boot.asm"
.incbin "assets/data.bin"
```

Paths are case-sensitive and relative to the including file. `../` can reach a parent within the workspace, but paths cannot escape its root. Absolute paths, drive prefixes, backslashes and control characters are rejected. `.incbin` inserts bytes into PRG at the current assembly location; selected **CHR source** supplies CHR ROM separately. Offset/length arguments and computed include paths are unsupported.

The NROM profile requires NMI/RESET/IRQ vectors that target emitted PRG. It rejects writes below `$8000`, mirrored PRG aliases, overlaps and unsupported sizes. It supplies no external linker, mapper switching, battery support, runtime hook injection or engine migration.

Workspace limits are 256 files, 1 MiB per file, 4 MiB current data and 4 MiB preserved originals. Expanded source is bounded to 1 MiB/65,536 lines, include depth 32 and 512 include visits. Each binary insertion is at most 32 KiB. Macro recursion/expansion is also bounded. A limit or build error leaves files available; it does not silently truncate the program into a successful build.

## Source intake: understand a tree before migration

The **Source intake report** section is read-only analysis of the isolated source workspace.

1. Import/open a source tree and choose its actual **Entry file** and build settings.
2. Set **Declared source dialect**: Unknown/not declared, Forge 6502 v1, ca65, Ophis, NESASM, ASM6, Lua or Other. Optionally fill **Engine** and **Engine version**. These are your declarations, not authenticated detections.
3. Select **Analyze source**. Review current/original file identities, file inventory, literal dependencies, unresolved paths, cycles, unsupported constructs and truncation notices.
4. Use **Export intake report JSON** to preserve findings. **Cancel analysis** invalidates pending report work without changing files.

**Expected result:** a bounded lexical/dependency report identifying what still needs investigation. It does not assemble, run scripts, expand foreign build systems or prove a working migration. A dependency inside a macro/conditional is a textual observation, not proof that it executes. “No known lexical blocker” is not a build pass. An **incomplete** report reached a limit; missing findings remain unverified. The screen shows bounded excerpts; JSON preserves every recorded row.

**Full-checkout exercise:** open a workspace from `examples/Source_Intake/`. For the preserved DABG source select **ca65** and its configured `dabg.s` entry. Review includes, binary assets, linker/build inputs and unsupported statements. A foreign declaration blocks **Build source ROM** in this UI. Selecting Forge afterward does not translate the source; it must actually pass the Forge assembler/profile.

Edits, settings/declarations changes, replacement or cancellation invalidate the current report. Declarations are report/session metadata and reset after a successful workspace replacement; select the proper dialect again after reopening. Save the editable workspace separately. Lua and host scripts are retained as text, never evaluated as JavaScript or cartridge code.

A later migration needs an explicit routine contract: input/output values, registers/flags, RAM and zero-page ownership, placement, call timing and resource budgets. An intake report is the preparation for that work, not automatic integration.

## Audio-pattern research: what has and has not been established

The full source checkout contains `app/research/audio-recognition-1/`, a read-only benchmark that compares normalized 6502 routines and APU-store evidence. It is not another UI importer and does not expand production decoder support.

The current corpus has nine cases from two independent external game projects. Three existing HonkeyPong variants are accepted by the unchanged strict decoder; six controls are refused. Relocation variants are the same game, not independent validation games. There are no held-out independent same-family games yet. The official FamiStudio MMC5 control tests mapper refusal, not NROM engine discrimination.

The important negative control contains a damaged driver with a perfect similarity score for an unchanged routine while the strict decoder still refuses it. Similarity is a useful investigation lead, not permission to convert. Broader recognition needs independently authored same-family inputs, other negative engines, verified format/timing rules and separate conversion tests.

**Full checkout only, from `app/`, with Node 20 or newer:**

```sh
node research/audio-recognition-1/benchmark.cjs --out audio-comparison.json
```

The report records exact input/source identities, bounded comparisons and refusals. It does not measure broad recognition accuracy, establish hardware/audio equivalence, or recover source symbols and song semantics for an unknown engine. FamiStudio text import in AUDIO is a separate documented interchange path.

## Save the right result

| Result you want to keep | Save/export action | Reopen or reuse |
| --- | --- | --- |
| Editable scenes, recovered tiles, canonical score/SFX, project assembly | **Save Project As…** or full project ZIP export | Ordinary **Open Project** / supported pack import |
| Static-analysis mappings and notes | **Download inspection + notes** | Evidence-only JSON; no analysis-session reimport |
| Recognition decisions | **Download method evidence** | Historical evidence |
| Native background/map preview project | **Download background project / Download map project** | Ordinary **Open Project**; save again after your edits |
| Native-copy audio byte edits | **Download native ROM copy** | Load as a ROM; project JSON does not contain the temporary native session |
| Audio/background/map import provenance | Corresponding **Download … evidence** action | Historical report, not editable project data or authentication of later edits |
| Runtime trace/resource observations | **Export runtime evidence / Export observed PPU resources** | Evidence-only JSON, not emulator save state |
| Current checkpoint/experiment | Session-local checkpoint controls | Restore in the same valid session; no downloadable checkpoint format |
| Isolated source tree/current edits/original bytes | **Save source workspace / Export source ZIP** | **Open saved source workspace** |
| Built source output | **Download source ROM**, expanded ASM, symbol/source map exports | Explicit ROM load or external inspection |
| Source intake findings | **Export intake report JSON** | Historical diagnostic report; save the source workspace separately |

## Common problems and next steps

| What you see | What to check |
| --- | --- |
| ROM plays but general analysis shows another file | Use **Use emulator ROM for analysis**; the sessions are deliberately separate |
| Static analysis works but playback fails | Container/mapper support differs between analyzer and emulator; analysis success does not repair the ROM |
| Recovery says unknown/unsupported | Read that method's exact reason; raw inspection and runtime observations may still be useful |
| Import preview expired | Source, selected resource, options or project changed; preview again |
| SFX import refuses timing | Existing project needs tempo 150/speed 1; make that authoring decision explicitly or use a separate project |
| Edited scene does not affect Run Original | Run Original uses preserved original bytes; build the edited project to test its adaptation |
| Native note edit vanished after analyzing again | Reanalysis starts from original bytes; export the native copy before starting a new native session |
| Trace misses background initialization | Use **Trace from reset**, then run the game; late tracing cannot see earlier writes |
| Code jump refused from a runtime event | Confirm matching ROM identity and a known physical mapping; a CPU address alone is insufficient |
| Blank screen from Minimal/source example | Those programs intentionally draw nothing; check successful assembly and the stated RAM-write expectation |
| Foreign source cannot build | The workspace preserves it but does not translate external dialects/linkers; use intake findings to plan a bounded migration |
| Project save did not retain notes or source workspace | Use the result-specific exports in the table above |

## Source audit and deeper references

This chapter was checked against the current standalone candidate's source, not only older narrative docs. Some retained feature documents describe the release when that feature first appeared; later candidate behavior and this current guide take precedence where scope has since expanded.

| Guide coverage | Audited implementation |
| --- | --- |
| Static analysis, ranges, mappings, search, annotations and CHR display | `app/src/re/re-analysis.js`, `re-analysis-ui.js` |
| Recovery discovery and method routing | `app/src/re/re-methods.js`, `recovery-methods-ui.js`, `recovery-profiles.js` |
| Tile, background, map and Bridge Room recovery | `app/src/re/re-native-assets*.js`, `re-native-background*.js`, `re-native-map.js`, `re-native-scene.js`, `native-*.js`, `re-bridge.js`, `re-ui.js` |
| Native audio evidence/copy edits and music/SFX conversion | `app/src/re/famitone2-*.js`, `re-native-audio*.js`, `re-native-sfx-ui.js` |
| Runtime tracing, snapshots, watches, experiments | `app/src/re/re-runtime*.js`, `re-experiments*.js`, and emulator timeline service |
| Project assembly, templates and mapped disassembly | `app/src/shell-prefix.html`, `app/src/legacy/00-editor.js`, `02-interaction-bootstrap.js`, current runtime compiler/build services |
| Isolated source editing/building and intake | `app/src/source/source-workspace.js`, `source-workspace-ui.js`, `source-intake.js` |
| Audio comparison research | `app/research/audio-recognition-1/README.md`, `corpus.json`, `features.cjs`, `benchmark.cjs` |

Detailed retained references: [General analysis](../Reference/Current_Release_Docs/RE_ANALYSIS.md), [Runtime investigation](../Reference/Current_Release_Docs/RE_RUNTIME.md), [Experiments](../Reference/Current_Release_Docs/RE_EXPERIMENTS.md), [Recovery discovery](../Reference/Current_Release_Docs/RECOVERY_METHODS.md), [Physical CHR](../Reference/Current_Release_Docs/RE_NATIVE_ASSETS.md), [Native backgrounds](../Reference/Current_Release_Docs/NATIVE_BACKGROUND_RECOVERY.md), [Native maps](../Reference/Current_Release_Docs/NATIVE_MAP_RECOVERY.md), [Bridge Room](../Reference/Current_Release_Docs/RE_BRIDGE.md), [Native audio profile](../Reference/Current_Release_Docs/NATIVE_AUDIO_PROFILE.md), [Music transcription](../Reference/Current_Release_Docs/NATIVE_AUDIO_IMPORT.md), [SFX transcription](../Reference/Current_Release_Docs/NATIVE_SFX_IMPORT.md), [Source workspace](../Reference/Current_Release_Docs/SOURCE_WORKSPACE.md), [Source intake](../Reference/Current_Release_Docs/SOURCE_INTAKE.md).
