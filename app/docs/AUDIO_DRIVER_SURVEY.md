# Audio driver survey

Candidate **2.0.0-alpha.11 / audio-driver-survey-1**, project schema 12.

Use this tool to find the executed 6502 instructions that write audio registers in a ROM, including their physical locations when the game switches PRG banks. These observations help locate a driver and compare its behavior across game actions. Finding every song, effect, instrument and parser command still requires decoding the driver's dispatch tables and data formats.

## Try it

1. Open `mainline/NES_Forge_2.0.0-alpha.11.html` and load your ROM in **EMULATOR**.
2. Go to **RE** and choose **Use emulator ROM for analysis** under Runtime Investigation. This links source navigation to the exact loaded ROM.
3. Select the audio-focused trace scope. Choose **Start trace** to observe the current point, or **Trace from reset (resets game)** to include startup.
4. Return to EMULATOR and run or step the game. Normal controller actions can reach title music, gameplay, menus or sound effects.
5. Stop the trace, return to Runtime Investigation and refresh the results. Open **Audio driver observations**.
6. Select a writer site and view its originating code. The file offset identifies the physical ROM location; the CPU address describes its mapping at the observed moment.
7. Export the audio driver report as JSON. Repeat at another game moment to investigate other driver paths. Save each report before starting another trace, which clears the previous observations.

The trace is opt-in. Starting it does not play the game automatically. Existing project editing, Audio composition, FamiStudio text import, native recovery and ordinary all-write tracing remain available.

## What the report means

| Field | Interpretation |
| --- | --- |
| Writer site | An observed instruction location, grouped with its physical file offset, CPU address and instruction identity. It is not automatically a function entry. |
| Register/channel activity | Writes to Pulse 1, Pulse 2, Triangle, Noise, DMC and shared APU controls during this trace. Activity alone does not establish an audible note. |
| Counts and frame range | How often a location/register was written and when it was observed. Timing is from Forge's emulator. |
| DMC enable requests | Writes enabling the DMC channel. These are not unique sample counts or proof of audible playback. |
| Noise mode | Observed long/short-mode register writes. Unvisited music and effects remain unknown. |
| Unmapped writer | An origin without a verified physical ROM location, such as RAM code or an unavailable instruction context. It cannot be opened as verified ROM source. |
| Identity and trace bounds | ROM identity, runtime session, collection mode, retained evidence and reason the trace stopped. |

Two instructions at the same CPU address can belong to different physical banks; the report keeps them separate. Source navigation refuses a mismatched analyzed ROM or stale observation. Exported reports are evidence files, not editable Forge projects.

## Limits and preservation

Audio-focused mode collects APU writes and configured RAM watches while omitting PPU-write observations. It still runs the same CPU, mapper, PPU and APU behavior; omitting graphics evidence does not disable graphics emulation. Choose the normal all-write scope when graphics evidence is needed.

Each trace retains the existing bounds: at most 2,000,000 instructions, 8,192 events and 4,096 executed-code entries. Reaching a bound stops collection; this is not an indication that the game's library is complete. A new trace begins a new bounded window. Reset, ROM replacement and history restoration invalidate the previous session as before.

The report does not infer song names, cue IDs, instruments, sample boundaries, engine family or total library size. A ROM with no observed APU writes has no observed activity in that window; it has not been proved silent. Native decoding, canonical conversion and listening/hardware equivalence require their own evidence.

`RERuntime` owns collection and derives the detached `audioDriverReport()` from retained events. `RERuntimeUI` owns presentation, guarded source navigation and explicit export. No second project/audio store, project-format migration or new native-decoder acceptance is introduced.

## Next audio RE work

Use observed writer locations to trace callers, queue/dispatch logic, stream readers and tables. Catalog unique cues and aliases separately. Decode durations, loops, pitch, envelopes, channel arbitration and DPCM references with physical provenance; compare those semantics against executed traces. Convert only what the editable Audio model can preserve, and disclose unsupported voices or effects. The [routine comparison benchmark](../research/audio-recognition-1/README.md) remains separate ranking research, not automatic permission to recover a new engine.
