# ROM Audio Library

**Current increment: 2.0.0-alpha.11 / megaman2-audio-1 · project schema 12**

Mega Man 2 US now has a native cue decoder. See [its tutorial and format explanation](MEGAMAN2_AUDIO.md). The earlier catalogs and all controls below remain available.

Load a supported ROM and its recovered audio catalog appears directly inside **AUDIO**. You can inspect the native structure, audition a selected cue, preview its conversion and import editable tracker data. You do not need another desktop tool, a Windows export, a JSON transfer or a network connection.

## Start here

1. Open `mainline/NES_Forge_2.0.0-alpha.11.html`. In **AUDIO**, choose **ROM Audio Library**, then **Open NES ROM…**. Loading the same ROM through EMULATOR or Import ROM also triggers discovery. Opening it through this Audio chooser loads the emulator without importing scenes into your project.
2. Wait for the catalog. The title identifies the investigated revision. The three counters describe **native cue/control entries**, **envelope entries** and **DPCM descriptors**. They are not claims about distinct songs or instruments.
3. Choose a native cue. Unnamed cues keep their source IDs. Empty request slots and global controls are explicitly labeled; they are inspectable but are not standalone sounds.
4. Choose **Inspect cue**. Open **Native commands**, **Envelopes**, **DPCM** or **Driver & banks** to explore the source. Use Previous/Next to read all retained records. A procedural sound effect can have an entry point and table references rather than an independent note stream.
5. Set a native-update window, initially 256. Choose **Play native** to render and play the selected driver from a controlled initial state. **Stop** stops the sound; **Cancel operation** stops pending work. This playback includes the modeled native noise and DPCM paths.
6. Click the activity timeline to inspect a particular update. The four ordinary rows show frame-end channel volumes; the DPCM row shows fetch-active status. The exact channel periods, volume, duty/noise state and retained APU writes appear below. **View writer source** opens an observed physical instruction in RE/DISASM. **Live mapper snapshot** instead reads the currently loaded emulator's mapping, clearly separate from controlled playback.
7. Choose **Preview editable score**. Read the note/pattern/instrument counts, tuning differences, byte estimate, omitted features and timing explanation. Preview changes neither your project nor the loaded game.
8. Choose **Import into tracker** after reviewing the preview. **Tracker** returns to the existing editor. Edit notes or envelopes, audition the adapted score, and use **Save Project As…** to keep the editable project. One Undo restores the project before import; Redo reapplies it.

## What is supported

| Investigated ROM revision | Catalog contents | Meaning |
| --- | --- | --- |
| Zelda II, US | 40 music request slots, including 12 empty slots; 64 decoded sections; 35 procedural SFX cases; four pulse envelope regions; six DPCM descriptors | 75 request/effect entries. A section is not a whole song; complete-song count remains unknown. |
| Ninja Gaiden, US | 85 command slots, 69 distinct headers, 23 envelope table entries, two unique DPCM spans | Includes aliases and a global fade control. Music/SFX names and a reliable semantic split are not asserted. |
| Mega Man 2, US | 33 music selectors (24 distinct headers), 34 effects, 124 source streams, 31 referenced modulation records; no DPCM descriptors in this format | 67 selectors, including aliases. Separate music/effect command formats; physical bank 12 / fixed bank 15 playback. |
| Castlevania II, US | Nine music-group candidates, 46 effect-group candidates, 93 channel records, 48 volume and 32 pitch envelope pointers, three DPCM configurations | 58 group/sample entries. One effect jump outside the identified region remains unresolved. |

These are **known revisions**, checked by SHA-256 and decoded again from their current physical bytes. A renamed, translated, modified, PAL or other revision can remain unknown. This is not generalized driver-family recognition. Unknown does not mean the ROM contains no audio. The retained FamiTone2/native import and general Runtime Investigation workflows remain available.

ROM files, samples and precomputed commercial-game catalogs are not embedded in the application. Everything shown is read or derived locally from the ROM you supply.

## Native playback versus editable conversion

Native playback uses an isolated copy of RAM, fixed physical PRG mappings, Forge's existing 6502 instruction implementation and its existing APU model. It calls the reviewed native dispatcher/update routines, initially with cleared driver RAM, at a 29,780-cycle NTSC cadence. This allows source commands, envelopes, procedural effects and samples to execute without editing or seeking the live game. It is **controlled cue playback**, not a recording of natural gameplay or proof of real-hardware equivalence. Original game priorities, prior effects, current room state and calls from gameplay can change the original outcome.

The editable result is a **finite, frame-sampled adaptation**. Forge samples the native APU channel state at each update boundary. Pulse/triangle periods use the nearest canonical pitch, noise uses the canonical long-mode period map, volume becomes per-row volume, and duty selections become simple editable instruments. The catalog retains the original envelope/command evidence separately. A duty instrument in the imported score is not a complete recovered original instrument.

Sub-frame timing, waveform phase, repeated same-pitch note articulation and original driver control flow are not reconstructed. Nearest-pitch differences are reported in cents. DPCM lacks a canonical tracker sample model; short-mode noise also cannot be represented by the current generated Audio runtime. Both remain available in native playback, but are explicitly omitted from the editable score. Silent or unrepresentable windows refuse conversion instead of inventing notes.

Music import appends patterns and instruments, replaces the current music order and sets global tempo/speed to **150/1**. Existing records remain, but existing SFX playback timing follows the new global tempo. The finite excerpt ends with a cut and silent padding; Forge repeats that whole excerpt, not the original native loop. Runtime enablement and gameplay bindings are unchanged. The byte estimate covers Audio data only; build the complete project to check total ROM capacity.

For **Single-channel SFX**, choose a window shorter than one project pattern and containing exactly one representable sounding channel. The existing project must already use tempo 150/speed 1. Import appends one named SFX definition while preserving the music order and timing. Multichannel/long SFX can be inspected and auditioned, or explicitly adapted as a music excerpt; they are not silently flattened into a single SFX record.

## Hardware and evidence views

- **APU writes:** register address/value, native update, cycle position and originating physical instruction. These are the retained writes from the controlled instance.
- **Driver & banks:** known revision, reviewed dispatcher/parser structures, command handlers, queue behavior where decoded, fixed PRG mapping and explicit limitations.
- **Live mapper snapshot:** current mapper, PRG/CHR offsets/pages and MMC1 control state from the loaded emulator. It is a snapshot, not a bank-switch history.
- **Native commands:** source-backed section/stream commands. Native parser ticks and a static control-flow edge are not automatically video-frame timestamps.
- **Envelopes / DPCM:** recovered table definitions, pointers, delays, controls, addresses, lengths and aliases where understood. Counts represent the described records, not a promise that all unused bytes or gameplay triggers are classified.

## Limits, cancellation and ownership

A native window is 1–1,024 updates. Each instance has at most 2,000,000 executed instructions and 131,072 APU writes; each native call has at most 50,000 instructions. Unsupported PPU/controller/mapper bus operations and unknown CPU instructions refuse execution. Work yields between update batches, and cancellation or a ROM change prevents a stale result from importing. A project change after preview requires another preview.

`NativeAudioCatalog` owns pure source interpretation. The three profiles register in the existing `REMethods` registry; there is no user-loaded decoder execution or native encoder claim. `NativeAudioMachine` gives the existing shared CPU/APU implementation isolated state and a restricted fixed-bank bus. `NativeAudioRecovery` owns bounded native execution and detached frame transcription. `RENativeAudioImport` retains staging/revalidation, and `ProjectStore.applyAudioImport` remains the sole canonical mutation owner. No schema, second Audio project, scene/collision store or compiler/runtime emitter is added.

This separation is reusable for later RE: identify physical bytes, decode their native structure, check behavior in a bounded instance, preview an explicit canonical conversion, then commit through the existing project owner. Scenes, collision and animation still require their own verified interpretation and conversion; audio recovery does not recover them implicitly.
