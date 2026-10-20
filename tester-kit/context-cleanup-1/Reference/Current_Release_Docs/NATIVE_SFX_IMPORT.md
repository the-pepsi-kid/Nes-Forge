# Native sound effects into AUDIO

This bounded FamiTone2 conversion turns a supported single-pulse native sound effect into ordinary editable Forge patterns, instruments and an SFX definition. It uses the currently analyzed ROM copy, including native edits. The original ROM, emulator, music order, tempo, runtime settings and animation bindings remain unchanged by import.

## Start with the included projects

Open a project in `examples/RE_Native_SFX/` with **Open Project**, then **Build & Run**. The examples use Scout's existing World runtime and an explicitly authored B/attack sound binding:

- `HonkeyPong_SFX_0.nesforge.json` uses recovered native effect 0.
- `HonkeyPong_SFX_1.nesforge.json` uses recovered native effect 1.
- `HonkeyPong_SFX_0_Edited.nesforge.json` raises the first effect's authored notes by one semitone.

The paired `.nes` files are generated Forge ROMs. These projects demonstrate an adaptation; Scout's movement, attack binding and game are not recovered from HonkeyPong. The original input and its source/license checkpoints remain under `examples/RE_Native_Audio/`.

## Recover an effect

1. Use **RE / DISASM → General ROM Analysis** to open `examples/RE_Native_Audio/HonkeyPong-reproduced.nes` for analysis.
2. In the native FamiTone2 Audio panel, choose **Analyze current ROM**.
3. In the sound-effect section, choose **Find SFX**, select an effect, then preview its transcription. Unsupported effects retain their refusal reasons.
4. Review source identity, duration, timer differences and adaptation notes. Acknowledge the conversion differences, then import the SFX and confirm.
5. Inspect the appended pattern, instruments and SFX definition in **AUDIO**. Import does not start playback or create an animation binding. Bind the SFX through the existing authoring controls when you want a gameplay trigger.
6. Use ordinary **Save Project As**, reopen and rebuild. One project **Undo** removes the import; **Redo** restores it.

The current project must already use **tempo 150 and speed 1**, making one tracker row one NTSC video frame. An incompatible project is refused without changing its music timing. Use a separate included project to experiment at this timing; changing the tempo of an existing song is an independent authoring decision. Runtime Audio settings remain as you set them, and a complete build still checks total ROM capacity.

## Supported subset and differences

The existing structural driver decoder discovers statically referenced effects. Conversion checks actual register streams, without relying on a filename, ROM hash or known effect ID. The included original effects 0 and 1 each use one pulse channel for 12 audible frames. Effect 2 uses two pulse channels and is refused by this initial subset.

Only one fully known pulse channel, supported constant-volume/length-halt controls, proven timer bounds and a stream that fits one current tracker pattern plus its terminal cut can convert. PAL, other channel kinds, multichannel effects, unknown required state, unsupported controls, invalid timers and excessive duration or project capacity are refused. Missing effects are not inferred from unreferenced bytes.

Native timer periods are mapped to the nearest existing Forge pitch and the measured difference is reported. Volume and duty changes become ordinary canonical rows and instruments. The native final buffer mix is retained for its last frame; a following terminal row ends the Forge effect. Pulse phase and high-register writes can differ because the existing Forge driver retriggers differently.

Native FamiTone2 mixing chooses between music and effect buffers by its own channel rules. Forge's existing single-SFX runtime temporarily owns one channel, then resumes its saved music state. This conversion does not recreate native mixing, simultaneous effect streams, call timing, original game triggers or waveform equivalence. Imported effects use the same supported Forge runtime as authored effects.

## Shared ownership and evidence

Music and SFX imports share the native Audio import service. ProjectStore owns their validated Audio-only transaction and Undo. Native music retains its established finite-score behavior; SFX import appends resources while preserving the existing collection prefixes, music order, tempo/speed, settings and bindings. Duplicate source-effect IDs are refused instead of replacing an existing effect.

Changing the ROM copy, selection, project or options invalidates a staged preview. Import revalidates source identity, conversion and project state. Cancellation, unsupported input and failed validation leave the project intact. Evidence downloads are historical conversion reports, separate from editable project files and native ROM-copy exports.

The current automated Summary and clean-extraction proof identify the exact tested application. Original-driver and generated-ROM CPU/APU comparisons establish logical timing, volume, duty and measured pitch behavior for this subset. Browser layout/downloads, speaker listening, independent-emulator audio, phones/controllers and physical NES acceptance remain separately unverified until performed.
