# ROM runtime investigation — re-runtime-1

These tools run **inside NES Forge**, in **RE / DISASM → RUNTIME INVESTIGATION**. They observe the ROM loaded in the existing EMULATOR. No external investigation script, recognized game engine or Pepsi-specific adapter is required. Static analysis remains available for files the emulator cannot run; tracing requires successful execution in the existing emulator.

The first integrated slice answers concrete questions: which instructions executed, which code wrote graphics or sound registers, and which RAM bytes changed after an action? The investigator supplies a tentative meaning and tests it. Forge does not automatically identify levels, health, collision maps, instruments or complete songs.

## Connect playback to analysis

1. Save your authoring project if needed, then open **EMULATOR → Load ROM** and select the game. Loading prepares playback; press **Run** when ready to play.
2. Open **RE / DISASM → RUNTIME INVESTIGATION → Use emulator ROM for analysis**. This copies the exact loaded file into general analysis. The displayed name, byte length and SHA-256 identify the shared source; there is no second file selection and no game reset.
3. Use **Show runtime investigation** if another RE view is visible. The same page contains memory comparison, executed code, writes and export actions.

Choosing another file in GENERAL ROM ANALYSIS does not replace the emulator ROM. If the inspected and runtime files differ, **View originating code** refuses to jump. Use the emulator-ROM action again to restore a matching identity. Static opening and analysis adoption do not replace the Scene project, create authoring assets or build a ROM.

## Trace one short event

**Start trace** discards the previous observation set and RAM snapshots, preserves current watches, and starts observation at the current game state. It does not reset the game. Tracing starts off on a fresh page. Trace only the short interval needed for a question.

**Trace from reset (resets game)** is the explicit alternative for observing initialization. It restarts the loaded game and arms the trace before execution. Return to EMULATOR, press **Run**, then **Pause** once the title/background appears. Return to RE and choose **Stop trace → Refresh results**. Starting after initialization cannot reveal initialization writes that already happened.

Playback and tracing are separate: starting a trace does not press game buttons or run paused emulation; stopping a trace does not itself establish that playback is paused. Pause in EMULATOR before inspecting stable results. CPU Trace, normal reset, ROM replacement and history navigation invalidate incompatible observations. Avoid Back/Forward or batch history navigation during an interval you want to compare; finish and export that interval first.

Results include:

| Result | What it establishes | What it does not establish |
| --- | --- | --- |
| Executed code | Observed PC/opcode, execution count and first/last frame; physical ROM offset when mapped | Original symbols, unvisited paths, complete routines or recovered source |
| PPU writes | Observed PPU-memory address/value and originating instruction | An engine-native map, collision semantics or complete raster program |
| APU writes | Observed writes to sound-chip command registers and originating instruction | An editable tracker song, instrument bank, SFX definitions or audible speaker output |
| Watched RAM writes | Writes to up to eight chosen RAM addresses, prior value, new value and originating instruction | Automatic identification of what the variable means |

Choose **Event type** to filter **All writes**, **PPU writes**, **APU writes** or **Watched RAM writes**. Coverage and event lists have **Previous 128 / Next 128** controls. Choose a row and **View originating code** to open its originating instruction in general analysis, using up to three verified physically contiguous ROM bytes and clipping at bank/file boundaries. Extend the range only after checking the mapping. An unknown physical mapping stays unknown; a CPU address alone is insufficient to claim a source offset.

Event frame/cycle fields come from Forge's instruction-level emulator. They are not a claim of cycle-exact hardware timing. Resource provenance identifies the writing instruction, which may compute or decompress a value; it does not automatically identify the original ROM data byte.

## Compare memory before and after an action

1. If collecting writes too, start the trace **before** saving the first snapshot. Starting another trace clears old A/B snapshots.
2. With the game paused at the starting state, choose **Save memory A**.
3. Return to EMULATOR, Run, perform one normal controller action, then Pause.
4. Return to RE and choose **Save memory B**.
5. Select **RAM region** and **Comparison**, then **Compare memory**.

Regions are All RAM, Internal RAM and Cartridge RAM. Comparisons are Changed, Unchanged, Increased, Decreased and After equals. **After value** accepts decimal, `$hex` or `0xhex`; it must be a byte from 0 through 255. Comparisons are unsigned byte comparisons: 255 → 0 is a decrease here, not an inferred wrapped increment. Timers and temporary working bytes can change alongside the interesting variable.

Snapshots copy internal/cartridge RAM backing storage and never sweep CPU I/O registers. They are observations, not emulator save states, restore points or editable project files. The comparison displays before/after values and CPU addresses in pages of 128. A game may not use the backing cartridge-RAM region even when the emulator exposes it.

Select a result and **Use selected address for watch**, optionally enter **Your label**, then **Add watch**. Or enter a known **Watch address** directly. Internal RAM aliases normalize to their physical `$0000–$07FF` address; available cartridge RAM uses `$6000–$7FFF`. At most eight addresses can be watched. Labels are analyst-supplied hypotheses, not recovered names. Start another trace and repeat the action to collect the writes and their originating code. **Remove selected watch** removes an address without changing game RAM.

## Limits, lifecycle and exports

A trace stops at the first applicable limit: **2,000,000 observed instructions**, **8,192 event records**, or **4,096 executed-code records**. A code record distinguishes observed PC, physical mapping and opcode. The status displays the stop reason; a stopped trace is not an error or proof that all content was examined. New traces clear old trace/snapshot evidence. Export useful evidence before starting another interval. The limits bound retained records, not total browser heap or emulator work after tracing stops.

Normal reset, load/unload, CPU Trace and history navigation clear incompatible observations/snapshots and stop tracing. ROM changes also clear watches. Clear observations drops the current observation set; it does not erase project data or patch the ROM. Memory A/B must belong to the same uninterrupted runtime session. Do not compare values from different games or timeline branches as if they were one event.

**Export runtime evidence** writes `NESForgeREInspection` version 2 JSON with `kind: runtime-observation`: ROM identity, status/limits, executed code, events, memory snapshots and observed resources. **Export observed PPU resources** writes `NESForgeREInspection` version 2 JSON with `kind: observed-ppu-resources`, containing observed physical nametable/palette/CHR-RAM bytes, known masks, source-event references and the referenced PPU event records. Neither export is a Forge project. These are currently export-only records, not a session reimport/restore format.

A resource `known` mask of 0 means **unobserved**; a stored placeholder zero is not verified game data. CHR-ROM tiles remain available separately through static general analysis. A trace that saw only part of a background does not establish a complete scene. Observed PPU memory and an APU event list require further interpretation before they can become verified native-resource recovery.

## What to verify with the supplied inputs

The owner-supplied `tests/fixtures/re-runtime/pepsi_vending_v9e.nes` is 24,592 bytes, SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a`. Prior investigation established a title, product-selection, vending and sold-out state model on one background. Start enters selection; A adds credit. Runtime RAM `$0000` is the mode and `$0001` is credits in this exact file. These are known test expectations; the UI must still show actual observations rather than insert these names automatically.

Pepsi's explored paths produced no APU writes in the prior external investigation. An empty APU list on that run is expected and does not mean the observation feature failed. Use `examples/RE_Bridge_Room/Bridge_Room.nes`, which has Pulse 1 music, to check positive sound-register activity. Bridge Room's editable-recovery decoder is independent of runtime tracing. Neither fixture alone proves broad audio/collision recovery or universal emulator compatibility.

Perform `RE_RUNTIME_CHECKLIST.txt` and record each result on the exact candidate. Prior external scripts, earlier 846-case results and owner T1–T6 reports apply to their own artifacts. Current model/VM/bundled-emulator evidence, actual browser behavior, physical speakers/controllers and owner acceptance remain distinct.
