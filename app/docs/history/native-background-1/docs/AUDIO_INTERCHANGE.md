# Audio score interchange — NES Forge score profile 1

In **AUDIO → Export Score Data**, choose **Export MIDI** or **Export MusicXML**. The export dialog describes the conversion before downloading. Export never modifies the active project, undo history, runtime switches, or generated ROM.

This is a score interchange workflow. Use **Save Project As** to preserve the complete native project, instruments, pattern identities, SFX, and gameplay bindings.

## Supported content

- One ordered pass of the music order, with independent Pulse 1, Pulse 2, Triangle and Noise channels.
- Tracker base notes, note retriggers, explicit cuts, rests, note-start volume and sustained notes across order boundaries.
- Tempo 30–300, speed 1–15 and 16–128 rows per pattern. Export is bounded to 255 order entries. MusicXML additionally refuses output over the importer’s 4 MB limit; shorten the order or use MIDI.
- Standard MIDI format 1: 96 ticks per quarter, conductor track and four channel tracks. Pulse 1/2/Triangle use zero-based MIDI channels 0/1/2; Noise uses channel 9 (percussion). Notes use tracker note + 12.
- Uncompressed score-partwise MusicXML 4.0: four named parts and divisions 24. A part is one implicit measure covering the ordered pass. Its durations are intended for score interchange, not finished engraving.

A tracker tick is `2.5 / tempo` seconds, so one row is `speed / 24` quarter notes. MIDI uses `4 × speed` ticks per row; MusicXML uses `speed` division units per row. MIDI tempo rounds to the nearest microsecond per quarter note, the format's precision limit. This records logical tracker timing, not emulator frame quantization or measured mobile audio latency.

## Explicit conversion boundaries

The export warning is shown on every export:

- Repeated pattern references become the played sequence. Pattern sharing, pattern identities, SFX definitions, animation/gameplay triggers and indefinite looping are not exported.
- Instruments become score instruments. NES duty, volume/arpeggio/pitch envelopes and APU timbre are not reproduced by a MIDI synthesizer or a notation program. Arpeggio/pitch-envelope use gets an additional warning. The exported pitches are the base tracker notes, not transcribed envelope steps.
- Noise becomes percussion. External instruments may sound unrelated; the Forge profile retains the original noise-note numbers for Forge reimport.
- Tracker effects, DPCM data, changing the channel volume during a sustained note, zero-volume note-ons, missing patterns/instruments and empty music are refused with an actionable error. No silent effect or unsupported-channel dropping occurs.
- Only patterns referenced by the music order are read. Unreferenced patterns and named SFX are retained in the native project.

## Reimport behavior

The files play without Forge metadata. A small, documented profile supplies timing and channel hints for loss-bounded Forge reimport; it does not embed project JSON or instruments.

The profile text is:

```
NESFORGE-SCORE:1;tempo=137;speed=7;durationRows=32
```

MIDI places it in a conductor text meta event (type 01). MusicXML places it in `identification/miscellaneous/miscellaneous-field` named `NESForgeScore`. XML part IDs are `NESFORGE_PULSE1`, `NESFORGE_PULSE2`, `NESFORGE_TRIANGLE`, and `NESFORGE_NOISE`. Noise notes have a standard `other-notation` containing `NESForgeNoise=N` (0–95). Note-start velocity is represented by MusicXML's `dynamics` attribute.

Forge reimport preserves the flattened four-channel note sequence, supported timing, cuts, note-start volume and trailing silence. It appends ordinary tracker patterns and plain instruments, replaces the music order, preserves existing SFX patterns, and is one undo step. It uses the current project's row count, so importing into a project with a different row count changes order grouping. If the score ends partway through the last target pattern, notes are cut at their original end and the remaining rows are silent padding; the import result warns about that padding. For example, a 16-row score in a 64-row project retains its cut at row 16 and adds 48 silent rows. Neither the project's row count nor existing SFX patterns are changed. Capacity checks apply before editing; a profile requiring more than 255 orders in the current row size is rejected.

The profile validates its bounded values, channel identity, monophony, tempo and row-aligned notes. An externally edited file that contradicts these hints is rejected rather than silently assigned a different meaning. Tools that remove the profile still produce an ordinary MIDI/MusicXML import: the existing generic importer allocates tonal voices, quantizes to six-tick sixteenth-note rows and may change NES channel assignments. Imported files are never evidence of native APU timbre recovery.

## Review steps

1. Open a native project with notes on all four channels and deliberate note cuts. Save it first.
2. Export MIDI and MusicXML. Read the warnings and confirm. The tracker must be unchanged.
3. Open each file in an independent MIDI/notation tool. Check pitch, channel separation and duration; expect replacement instruments and percussion sounds.
4. Import into a copy of the project through the existing **Import MIDI/MusicXML** controls. Check channel identity, order sequence, cuts and tempo/speed. Existing SFX should remain.
5. Undo, redo, save, reopen and compile the imported tracker. Listen to the native preview and ROM; automated structural tests do not replace listening or independent tool/device acceptance.

## Reference specifications

- MIDI Association, [Standard MIDI Files](https://midi.org/standard-midi-files).
- W3C MusicXML 4.0: [divisions](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/divisions/), [duration](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/), [MIDI channel](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/midi-channel/), [note](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/), and [unpitched](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/unpitched/).

`tests/audio-interchange200.cjs` executes the actual application, independently inspects MIDI track/event framing and verifies canonical round trips, protected project/build state, rejection paths and registered download controls. It does not certify notation engraving, external applications, browser file dialogs or audible output.
