# General ROM and 6502 binary analysis — Alpha

Candidate **1.9.0 Alpha / `re-analysis-1a`** adds static analysis that is independent of the game engine, editable-recovery profile and emulator. Open a ROM or raw binary in **RE / DISASM → GENERAL ROM ANALYSIS**. You do not need to load it in EMULATOR or create a project first.

The analysis layer accepts byte files regardless of engine, subject to the stated resource limits. It can inspect a binary whose hardware the emulator does not support. It cannot infer which hardware or CPU variant an arbitrary file needs, prove which bytes execute as code, or reconstruct every game's scenes, collision and audio automatically. NES/Famicom remains Forge's executable game target.

## October 1 picker repair and remaining gap

In `re-analysis-1`, the general file input inherited the global `input[type=file]{display:none}` rule and had no visibility override. The recovery input explicitly used `display:block`, so that separate picker was visible. `re-analysis-1a` applies a local visible layout to the general input. The VM test's synthetic `getComputedStyle` always returned `block`, and direct file injection did not exercise a visible picker; those checks missed the defect. The browser test now requires actual visibility and a click that opens the file chooser. Its recorded result remains authoritative; a blocked browser launch is not a passed picker test.

The owner's requested result remains incomplete: there is no advance-stage command, health/enemy control, or general native scene/collision/audio recovery. EMULATOR loading does not initiate the independent analysis session. Existing frame/scene captures describe observed rendering, not decoded native scene, collision or music structures. Correcting this picker makes static inspection reachable; it does not establish those missing capabilities.

Next acceptance must start from the exact ROM the owner is trying and one concrete scenario, such as reaching the next stage or taking one hit. Use that input to demonstrate linked runtime evidence, verified state changes and any genuinely decoded resources; distinguish unknown structures. A Bridge Room-only pass cannot establish that outcome for another game.

## First walkthrough

1. Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html`, then select **RE / DISASM**. In **GENERAL ROM ANALYSIS**, use **Choose ROM or binary** to select a file of any extension, then press **Open for analysis**. This does not replace the editor project or load/run a ROM in the emulator.
2. Read the source identity and capability summary. A recognized NES container supplies header and physical-span information. An unknown engine is allowed. A malformed or unrecognized container retains raw-byte inspection with a diagnostic instead of fabricated banks or vectors.
3. In the analysis workspace, enter a **File offset** and **Range bytes**, then press **View range**. A plain number is decimal; `$` or `0x` selects hexadecimal. The hex and instruction views describe the selected original-file bytes, displaying up to 512 bytes per page. Use **Previous 512 bytes** and **Next 512 bytes** to page through the range. Each page begins decoding at its first byte; page boundaries are not verified instruction boundaries.
4. Choose the intended **CPU variant**: **6502** or **2A03**. Both decode official opcodes in this slice. Other/unofficial opcodes and truncated instructions remain visible as `.byte`. An instruction listing is a candidate interpretation of bytes, not a declaration that the span is executable code.
5. If you know where a span maps into CPU memory, enter its **CPU origin** and a **Bank label**, then use **Save mapping**. Leave the origin blank when it is unknown. Select a saved mapping and use **Go to mapping** to revisit it. Separate bank mappings may use the same CPU addresses; the file offsets and labels keep them distinct.
6. Enter a hex-byte pattern, such as `A9 01 8D`, and press **Search**. The search yields between 1 MiB chunks, stopping on completion, cancellation or 256 results. If capped, **Search from file offset** advances to the continuation point; press Search again to continue. Reset that field to `0` for a new full-file search. Review its status/results. Select a match and use **Go to result** to inspect that physical location. **Cancel search** stops pending work. A match locates bytes; it does not establish a routine's meaning.
7. Record a finding with an annotation's offset, length, **Label** and **Comment**, then choose **Save annotation**. Label uncertain ideas as hypotheses. These records are user-supplied evidence, not recovered source symbols.
8. Use **Download inspection + notes** to export the file identity, report, saved mappings and annotations. The result is `NESForgeREInspection` version 2, an evidence document. It is not a Forge project and does not replace **Save Project As** for authoring backup.
9. Use **Show emulator disassembly** / **Show general analysis** to switch workspaces when needed. Loading/running a ROM in EMULATOR and previewing editable recovery remain separate actions with their own capability limits.

Two small supplied binaries make the first checks reproducible:

| Input | Actions | Expected observation |
| --- | --- | --- |
| `examples/RE_Analysis/raw_counter.bin` | View file offset `0`, length `14`, CPU origin `$4000`; search `C6 10 D0 FC` from `0` | Raw inspection works without a NES header; matching bytes begin at file offset `$000004` |
| `examples/RE_Analysis/overlapping_banks.bin` | Save file offset `0`, length `16`, CPU origin `$8000`, label `Bank A`; then offset `16`, length `16`, same origin, label `Bank B` | Separate mappings share CPU `$8000`; their first instructions differ (`LDA #$01` and `LDA #$02`) |

The `$4000` mapping is deliberately a user assumption outside a normal NES cartridge PRG window. These inputs test analysis, not emulator execution. Keep both bank mappings in the exported evidence; a repeated CPU address does not mean the original bytes are the same.

For a first comparison, inspect `examples/RE_Bridge_Room/Bridge_Room.nes` here, then use **RECOVER EDITABLE PROJECT → Preview editable recovery** on the same file. General analysis exposes bytes and evidence; the known-profile decoder reconstructs the room, collision and music. See `RE_BRIDGE.md` for that separate edit/build/play tutorial. Try an unknown-engine file next: general inspection should remain available even when editable recovery rejects it.

## What each address means

| Location | Meaning | Evidence boundary |
| --- | --- | --- |
| File offset | Position in the original file, including any header/trainer bytes | Stable physical identity for search, notes and byte spans |
| Parsed PRG/CHR span | Physical span declared by a recognized, valid NES container | Describes the file layout, not the currently selected runtime bank |
| Static NROM CPU mapping | Fixed mapping derivable from the supported mapper-0 layout | Header-derived; no execution observed |
| User CPU mapping | A chosen file span mapped to a CPU origin with a bank label | User assumption; may overlap another bank's CPU range |
| Disassembly address | CPU location under a stated mapping, when present | Does not prove that the instruction executes |

A ROM can contain multiple banks mapped to the same CPU address at different times. Unknown mapper state stays unknown. The analyzer does not treat a physical PRG position as a unique runtime address, read vectors from an assumed bank or claim to observe bank switching. File offsets remain available even when CPU mapping is absent.

## Formats and instruction interpretation

Valid recognized **iNES and NES 2.0** layouts provide bounded physical PRG/CHR spans and container diagnostics. Known static NROM layouts can supply fixed mappings and vectors. Other mapper layouts retain physical inspection and permit explicit user mappings; this feature adds no mapper emulation.

Unknown formats, unsupported header details, malformed/truncated headers or inconsistent declared sizes do not require a successful NES parse to expose raw bytes. The report describes the limitation and falls back to raw analysis. A filename extension does not establish a platform or engine. Choosing raw analysis does not repair the file or make it executable.

The implemented instruction choices are **NMOS 6502** and **NES 2A03**, using the 151 official opcodes. The CPU choice is recorded with the interpretation. Unofficial opcodes and end-of-range truncation cannot silently become another CPU's instructions. Unsupported byte sequences use `.byte`; a truncated instruction is not completed with bytes outside the requested disassembly page. Unsupported CPU-variant selections are rejected rather than silently decoded as 6502. This is not a 65C02 or 65C816 decoder, and selecting a variant does not emulate it.

Static decoding does not separate code from data reliably by itself. A tile, compressed stream or pointer table can resemble instructions. Notes should distinguish direct file evidence, user assumptions and later runtime observations. The analyzer does not recover original comments, source filenames, symbol names or assembler project structure.

## Inspect physical CHR patterns

For a recognized NES container with CHR ROM, open **Raw CHR patterns · grayscale**. The preview displays up to 256 physical 8×8 tiles per page. **Previous 256 tiles** and **Next 256 tiles** page through the file's CHR data; the status identifies the tile indices and original-file offsets.

Grayscale represents the four 2-bit pattern values, not the game's actual palette. This preview does not infer scene placement, collision, animations, active PPU banks or which tiles a game uses. An unsupported mapper can still have inspectable physical CHR ROM. A CHR-RAM cartridge has no stored runtime pattern contents to preview here. Raw files without a recognized CHR layout retain byte inspection; the tool does not invent a CHR offset for them.

## Bounded work and resource limits

| Operation | Implemented model limit |
| --- | --- |
| Input file | Up to 64 MiB; larger files receive a size-limit error |
| UI view | 512 bytes per page; a selected range may span the file or a valid mapped CPU window |
| CHR preview | Up to 256 physical tiles per page, only where a recognized container identifies CHR ROM |
| One raw-byte read | Up to 64 KiB |
| One disassembly range | Up to 4 KiB |
| Search pattern | 1–256 bytes |
| One search batch | Up to 1 MiB scanned and up to 256 matches |
| Explicit mapping | Must fit the source file and CPU address space `$0000`–`$FFFF`; up to 128 saved mappings per inspection |
| Annotations | Up to 256 per inspection; 160 characters per label and 2,000 per comment |

These limits bound work and output; they are not engine allowlists. Search is chunked, with continuation offsets that preserve matches across batch boundaries. A bounded result batch is not evidence that no later match exists. A capped search updates its start offset so Search can continue. Selecting a different pattern does not reset the start automatically; set it to `0` to scan from the beginning. Empty files can show identity/evidence, but have no bytes to view, search, map or annotate. Every range must remain inside the file; rejected inputs must not silently wrap or read fabricated bytes.

The source bytes are copied before asynchronous identity work. Subsequent changes to a caller's buffer cannot alter the inspected snapshot. Analysis, saved mappings and notes remain in the session until another file successfully opens or the page closes. Export before switching files if you need to keep them. This slice exports evidence but does not reimport saved inspection reports or notes. An inspection export is not a patched ROM or an executable build.

## Analysis, playback and recovery

| Workflow | Available now | Separate limits |
| --- | --- | --- |
| General static analysis | File identity, container diagnostics, raw bytes, physical CHR preview, official-6502 interpretation, search, explicit mappings and notes | No execution or automatic game semantics |
| Existing emulator | Run supported NES ROMs, ordinary disassembly/readouts and temporary frame history | Existing mapper, timing and platform support |
| Editable recovery | Native Room v1 profile used by Bridge Room | Requires recognized structures and supported decoded data |
| Gameplay-aware debugger | Future work | Memory comparisons, watches, breakpoints, input replay and verified stage/health/enemy actions are not implemented |

Forward frame stepping advances normal simulation with neutral input. Timed damage, enemy defeat or a transition can still occur through the game's own logic, but Forward provides no command to force a chosen stage, damage event or enemy defeat. Those commands would require game-specific state and routine knowledge. For now, play through an event with normal controls while recording history, then pause and revisit the retained frames. See `EMULATOR_NAVIGATION.md`.

Changing a health byte or stage number would not necessarily invoke all associated game logic. A future debugger must discover and verify the relevant relationships before offering named actions. This static-analysis candidate does not patch live memory, original ROM bytes or canonical project records.

## Export and verification

**Download inspection + notes** produces `NESForgeREInspection` version 2 with source identity and evidence. Recovery's **Download inspection report** produces `NESForgeRERecovery` version 1. Recovery's **Download Forge project JSON** produces the editable schema-12 authoring project. The normal project opener rejects inspection evidence with an explanation; these files are not interchangeable.

Run `python3 tools/bundle.py --check` and `node tests/run_all.cjs` from a clean extraction. All 35 prior suites remain required alongside the new general-analysis suites. Use the current runner, matching `test-results/candidate/Summary.json`, `build-inputs.json` and `checkpoints/re-analysis-1a-clean-extraction/Reproduction.json` for the complete suite list, measured results and exact artifact identity. Historical totals do not certify changed bytes.

Browser acceptance remains separate. Use `BROWSER_QA.md` to record actual opening, narrow-screen layout, literal text rendering, cancellation, download behavior and separation from editor/emulator state. A blocked browser attempt or VM-only test is not a successful visual walkthrough. Owner acceptance and release promotion remain pending.
