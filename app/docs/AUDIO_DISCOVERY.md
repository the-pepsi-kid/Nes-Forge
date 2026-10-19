**Current increment:** Mega Man 2 US now has a native cue decoder. Its exact revision populates Native Cue; see [Mega Man 2 audio](MEGAMAN2_AUDIO.md). Other unknown revisions still require investigation and a validated decoder. Discovery controls below are retained.

# Audio Discovery — investigate an unknown ROM

Candidate audio-discovery-1, schema 12. This adds investigation tools for audio formats without an installed catalog. It does not automatically reconstruct a full song/SFX library or enable an unknown native decoder.

## Start with the included example

Open AUDIO > ROM Audio Library. Load examples/Audio_Discovery/Discovery_NROM.nes using Open NES ROM. This original small NROM program intentionally has no installed catalog. The Audio Discovery panel appears above the known-cue controls. Its NMI handler varies pulse pitch through a PRG table and a RAM counter.

The physical PRG scan runs automatically for a ROM loaded in the emulator. For another file, choose **Open ROM for discovery…** in the Discovery panel. This chooser reads a separate file for static investigation and preserves the emulator's existing ROM. It accepts up to 8 MiB. A valid container declaration is required; rejected headers remain unavailable rather than being repaired or guessed.

Static discovery also works when the emulator does not support the mapper. Choose **Load this ROM in emulator** when you want to try runtime investigation. If loading is refused, the static report remains available. The new tool does not add a mapper implementation.

## Scan and inspect evidence

**Scan audio code** scans the declared physical PRG region. CHR and trainer data are excluded. It looks for official STA/STX/STY instructions with absolute/indexed APU-register base addresses, then finds a bounded, linearly aligned code context around each pattern. A data byte can resemble an instruction; finding a pattern does not prove that it executed or identify a function boundary.

NROM mapping follows the existing header-derived mapping, including mirrored aliases. Banked addresses are explicitly possible CPU addresses; the scanner does not invent the game's active bank state. Indirect stores and unofficial opcodes can be missed. Expansion-audio registers are outside this base-APU scan.

The three metric boxes show static writer candidates, observed APU writes and source-verified executed writer locations. These are not song, effect or instrument counts.

- **Summary:** source identity, declared layout, scanned range, work limits, trace/recording bounds and limitations.
- **Writer evidence:** paginated physical offsets, instruction bytes, possible mappings or actual observed origins, registers and counts. Unmapped origins and partial source fragments remain distinct.
- **Driver comparisons:** ranked normalized four-instruction code-context overlaps with derived reference fingerprints from the three recovered titles. A 1.0 overlap can occur in a ROM whose catalog remains unknown. It is not a calibrated confidence probability, family decision or authorization to decode.
- **Call / table / RAM leads:** direct JSR operands, indexed PRG-read operands and RAM/stream-pointer references in a candidate context. These help locate dispatchers, queue logic and data readers. They do not establish a queue's meaning, table extent, pointer format, cue count or original instrument structure. Observed JSR operands do not by themselves prove a banked call edge.

Choose a writer in the selector and **View selected writer source** to open its physical bytes in the existing RE workspace. For an observed writer, the source bytes and identity are checked against the current recorder. The surrounding linear block remains static evidence even when its writer anchor executed.

## Record a bounded execution window

**Record startup (resets game)** explicitly resets the loaded game and advances a bounded window. **Record from here** starts at its current execution state. Both pause the emulator and leave it paused afterward. Set Recording frames to 1–120, default 60. Recording replaces the prior Runtime Investigation evidence, so export that report first if needed. Stop an already running trace explicitly before starting another recording.

The tools use the existing EmulatorBridge and RERuntime collector, CPU, mapper and APU. They do not patch ROM/RAM, create a second emulator, change the project or add undo entries. They collect instructions/APU writes; the JSON report is not a waveform or an editable song.

A short startup window may contain only initialization or no audio. Run the game normally in EMULATOR, reach a menu or gameplay action, pause, return to Audio and choose Record from here. Repeat for other actions. **Use current trace** links an existing matching Runtime Investigation trace without advancing the game.

The recorder retains its existing bounds: 2,000,000 instructions, 8,192 events and 4,096 code entries. It can stop before the requested frame count, especially during startup. The report exposes the actual trace stop reason and number of completed frames. No-activity results and unvisited songs/effects remain unknown.

**Cancel discovery** cancels a pending scan/read/recording. The game may already have advanced through completed frames; cancellation does not rewind it. Reset, ROM replacement and timeline navigation invalidate executed evidence. Static evidence can remain valid for the same immutable source. Source navigation refuses stale observations.

## Export and continue recovery

**Export investigation** downloads NES_Forge_Audio_Investigation.json with source identity, static patterns, ranked comparisons, semantic leads and any linked runtime observations. Treat it as local source evidence: it can contain instruction bytes from your ROM. It is not a Forge project and cannot authorize native import.

The known-revision catalog, isolated playback and explicit finite tracker conversion remain available for the three previously supported ROM revisions. FamiTone2 recognition/import retains its separate structural contract. A similar-looking new driver still needs dispatcher/data-format validation, decoder implementation and execution comparisons before catalog or editable-score recovery can be enabled.

The scan is bounded to 1 MiB of declared PRG, 128 writer patterns and 262,144 block-decode visits. A budget stop marks the result partial. Each context is at most 128 forward bytes and 48 instructions, with 48 bytes of backward alignment search within one physical 8 KiB page. The displayed scanned range is the examined range, not the entire unvisited PRG declaration.

The reference fingerprints come from controlled native execution of four 64-update windows across the three supplied titles, covering 42 unique writer contexts. Matching those reference games is not held-out recognition evidence. The independent example tests execution/ownership boundaries; it does not establish broad engine-identification accuracy. Natural-game, hardware and independent-listening equivalence remain separate acceptance work.
