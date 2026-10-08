# Native music transcription into AUDIO

This feature turns a supported FamiTone2 music excerpt into ordinary editable Forge patterns and instruments. It uses the currently analyzed native ROM copy, including any native note edits you have applied. The original ROM and the emulator remain unchanged.

This is **score transcription**, not lossless replay of the original engine. The source driver and Forge differ in timer tuning, pulse retrigger behavior and triangle control. Native SFX, gameplay sound triggers and song switching are not imported. Review the preview before confirming.

## Try the included example

1. Open **RE / DISASM → General ROM Analysis**. Select `examples/RE_Native_Audio/HonkeyPong-reproduced.nes` and choose **Open for analysis**.
2. In **Native audio · FamiTone2 profile**, choose **Analyze current ROM**. Keep **Native subsong** at `0` for the first test.
3. Find **Transcribe native music into AUDIO** below the native edit/export controls. Keep **Native rows in excerpt (1–1024)** at `64`.
4. Choose **Preview import to AUDIO**. This reads the ROM and checks the proposed Audio data without adding anything to your project. Read the warnings, limitations and **Conversion evidence**.
5. Choose **Transcribe music into AUDIO**. Confirm only after reviewing the dialog: it replaces the music order and global tempo/speed, appends new patterns and instruments, and retains the existing pattern and instrument records.
6. Open **AUDIO** yourself to inspect or edit the imported score. The import does not start playback or change the active tab. Use the normal Audio preview when ready.
7. **Save Project As** preserves the editable score in the project JSON. Reopen it normally. One project **Undo** restores the previous Audio data; **Redo** reapplies it.
8. When you choose to build, open **AUDIO → NES Runtime** and enable **Compile Audio Runtime** and **Autoplay tracker order as music**. Import preserves your current runtime settings. Complete ROM compilation still checks your scene, gameplay and ROM capacity constraints.

For the packaged reproduced input and the default 64-row pattern size:

| Selected native subsong | Native rows | Music frames | Cut/silent padding frames | Notes | New patterns | New instruments |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 64 | 413 | 35 | 19 | 7 | 1 |
| 1 | 64 | 383 | 1 | 13 | 6 | 1 |

The padding count includes the terminal cut frame. Pattern counts and padding change with the active project's pattern row size. Source identification depends on the supported linked driver and data structure, not the filename or a ROM hash allowlist.

## What changes in the project

The transcription appends new patterns and instruments and rebases their references after the existing records. It replaces the music order, tempo and speed. **Tempo 150 and speed 1 make one canonical tracker row one NTSC video frame.** The Audio Runtime enabled/music-enabled settings remain as you set them.

Existing SFX definitions and their referenced patterns are retained. **Their playback timing follows the new project-wide tempo/speed and may change.** Test existing SFX after importing; Undo restores the previous tempo and speed as well as the previous song.

The source music is flattened into a finite excerpt, cut, and padded to complete patterns. Forge repeats that entire new music order, including the padding. This does not recreate the original engine's start, intro, loop, pause, song-switching or game-call behavior.

## Supported conversion and refusals

This transcription uses the same bounded linked FamiTone2 profile as native Audio analysis. It supports the selected subsong's proven note/cut schedule and global speed changes, converted to NTSC video-frame rows. Supported volume and arpeggio envelopes become canonical envelopes. Effective source periods are mapped to nearby canonical pitches; the preview reports the changed mappings and maximum tuning difference. The sample's maximum difference is approximately 4.55 cents; other supported inputs have their own measured results.

The converter refuses data it cannot represent: unsupported profiles, PAL conversion, DPCM in the selected window, nonzero native pitch envelopes, short-mode noise, invalid or unrepresentable envelope/note data, pause/stop speed commands, and requests beyond the stated work or authoring limits. Refusal leaves the project unchanged. General ROM inspection and native-copy editing remain available independently.

Choose 1–1024 native rows. The converter also bounds the output to 16,384 video frames, 255 imported patterns and 255 instruments before considering the current project's existing content. A preview can still be refused when the existing and new data exceed the project or Audio Runtime limits, or existing Audio records cannot compile with the proposed music. Fix the reported data or use a shorter excerpt/project; the importer never silently removes existing records to make room.

The Audio Runtime data estimate shown in the preview is **not a complete ROM-fit guarantee**. The actual build also contains your graphics, scenes, gameplay and other data.

## Safe review and persistence

Changing the inspected ROM, applying or undoing a native edit, changing the native subsong, editing the project, opening another project, or changing the excerpt length makes an old preview unusable. Preview again. The importer revalidates both the ROM copy and project before confirmation and again before the single project edit.

Cancel leaves the project and history unchanged. The importer does not play, reset or load a ROM into the emulator. Text entry uses the normal device keyboard and does not feed emulator controls.

Only the resulting canonical score is added to the project. The native editing session and transcription preview are separate temporary investigation state. To keep native ROM edits, use **Download native ROM copy**; saving the Forge project alone does not save that native session. **Download transcription evidence** saves the complete last successful conversion preview or imported conversion as a JSON report. It retains the original/current native ROM hashes, options, source byte ranges, frame schedule, pitch differences and limitations. It remains historical evidence after you change the source or project; it does not prove the current project still matches that report. A new preview replaces the old report. The report is not an importable project or native session, and it contains no complete ROM image or project snapshot. The visible evidence view is bounded to 32 KiB for readability; the download contains the full report.

Automated model, UI-handler and logical APU tests are separate from real browser layout, listening, phone, controller or NES hardware acceptance. Consult the current candidate review checklist for those outstanding checks.
