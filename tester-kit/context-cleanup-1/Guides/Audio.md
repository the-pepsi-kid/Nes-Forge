# Audio: compose, arrange, import, and build

**Current guide · NES Forge 2.0.0-alpha.11 / audio-tool-import-1 · project schema 12**

You can create music and sound effects in **AUDIO** without importing a song or building a ROM. The tracker, instruments, and sound effects belong to the normal Forge project. **Save Project As…** saves that complete editable project.

A dedicated **New Sound Project** command, separate audio-only project format, and named multi-song library are not available yet. The current project has one music order and one global Tempo/Speed pair. Importing a selected FamiStudio song puts it into this same editor; it does not open FamiStudio inside Forge.

Use this guide for authoring and score interchange. Native-ROM investigation and transcription have separate [native music](../Reference/Current_Release_Docs/NATIVE_AUDIO_IMPORT.md) and [native SFX](../Reference/Current_Release_Docs/NATIVE_SFX_IMPORT.md) references. Their source investigation state is different from the editable score saved in your Forge project.

## Make your first four-note melody

This exercise starts with an empty project, writes four notes, saves and reopens them, and makes a simple ROM that plays the music. You do not need character artwork or a Player entity.

### 1. Start and set the pattern length

1. Open [NES Forge](../NES_Forge.html). If the workspace contains work you want to keep, use **Save Project As…** first.
2. Click **New Project** and confirm. The scene should be **My First Room** and the project **My First NES Game**.
3. Open **AUDIO**. Set **Rows** to **16**, **Tempo** to **150**, and **Speed** to **6**. Press Tab after each number to commit it.
4. Leave **Compile Audio Runtime** off for now. Browser preview works with it off.

**Checkpoint:** The tracker has rows **000–015** and the instrument list is empty. Set Rows before writing notes: reducing it later removes rows beyond the new length from every pattern. Undo can restore a mistaken reduction.

### 2. Make an instrument

1. Click **+ Add Instrument**.
2. In **Instrument Editor**, change **Name** to **Melody** and leave **Duty** at **50%**.
3. Leave the two envelopes as created for this first pass.

The default volume envelope falls from 15 to 0. Each entered note will therefore sound like a short pluck, with silence between widely spaced notes. Instrument **00 Melody** should be selected.

### 3. Enter the notes

Click the indicated cell in **Pulse 1**, then press the indicated key. Select each row explicitly: entering a note does **not** move to the next row.

| Tracker row | Key | Expected note |
| --- | --- | --- |
| 000 | Q | C-4 |
| 004 | W | D-4 |
| 008 | E | E-4 |
| 012 | T | G-4 |
| 015 | Backspace | `===` — an explicit cut |

The number at the left of each tracker cell is **decimal**: row twelve displays **012**. Instrument and pattern identifiers elsewhere in AUDIO use hexadecimal, so instrument **00** is the first instrument. The four unused channels should remain empty; the fifth column is the unimplemented DPCM placeholder.

**Checkpoint:** Pulse 1 shows C-4, D-4, E-4, and G-4 with instrument **00**. Click the tracker again if typing changes a text field instead of entering notes.

### 4. Listen and make an edit

1. Click **Play** in **Transport**. Playback starts at the first order row and row 0, then repeats the order.
2. Listen for four ascending notes. Click **Stop**.
3. Click Pulse 1 row **004**, press **E**, and play again. The second note is now E-4.
4. Click **Stop**, then **Undo** once to restore D-4. The tracker should show the original four-note phrase.

**Checkpoint:** Play and Stop control the browser preview. A brief sound when you enter a note is only a note audition. It is not a full song playback or a ROM test.

### 5. Save and reopen the editable music

1. Click **Save Project As…** and use a name such as **My_First_Forge_Melody.json**.
2. Finish the Save As dialog with **Choose location & save…**, or use its explicit browser-download option when a location picker is unavailable. Keep the resulting file somewhere you can find again in Windows.
3. Click **Open Project**, choose that saved JSON, and return to **AUDIO**.
4. Check the four notes, **Melody** instrument, Rows 16, Tempo 150, and Speed 6. Click **Play** again.

**Checkpoint:** Your notes and instrument reopen as editable data. **Save / Load** use browser storage; they are useful conveniences but do not create this portable file. MIDI or MusicXML export is not a substitute for it.

### 6. Make a music-playing ROM

Fresh **New Project** uses **Single-room platformer** settings even though it has no Player. Change that build mode for this simple music-only exercise:

1. Open **SCENE**, expand **Gameplay**, and set **ROM mode** to **Scene viewer / custom assembly**.
2. Open **CODE** and confirm that the assembly editor is empty. This exercise uses the generated viewer, not authored custom assembly.
3. Return to **AUDIO → NES Runtime**. Enable **Compile Audio Runtime**, then enable **Autoplay tracker order as music**.
4. Click the top-level **Build & Run**. This builds the current project and opens the resulting ROM in **EMULATOR**.
5. Expect a blank visual scene accompanied by the music. You have not drawn a game screen in this exercise. Use the emulator's playback/audio controls if it is paused or muted.
6. Use **Build .NES ROM** when you want the downloadable `.nes` output. Save the Forge project again to keep your runtime and build-mode choices.

**Checkpoint:** The generated ROM plays the authored melody. The `.nes` file is an output for playing and testing; retain your JSON for editing. Browser preview and compiled NES playback are different implementations, so compare both after significant sound changes.

## What the AUDIO controls do

### Tracker, transport, and timing

| Control or display | Purpose and use |
| --- | --- |
| **Pulse 1 / Pulse 2** | Two independent pitched voices with selectable pulse duty. Use separate notes and patterns for melody and accompaniment. |
| **Triangle** | A pitched triangle voice, commonly useful for bass. The generated hardware channel does not have the same amplitude behavior as a pulse voice. |
| **Noise** | A percussion/noise voice. Its note values select noise behavior; they are not another normally tuned melodic voice. |
| **DPCM (not implemented)** | A visible placeholder. Note entry reports that sample playback is unavailable. It is not a sample importer. |
| Highlighted tracker cell | The row and channel that receive keyboard notes. Each channel displays the pattern selected for it in the current order row. |
| `---` | No note event in that cell. It does not itself stop a previously sounding note. |
| `===` | Explicitly cuts the channel at that row. |
| Instrument number / `..` | The hexadecimal instrument index stored with the note, or no explicit instrument. Choose the desired instrument before entering a new note. Selecting an instrument alone does not reassign existing notes. |
| **Play** | Starts browser preview at order 0, row 0. The whole order repeats. It does not resume from the selected cell. |
| **Stop** | Stops browser preview and silences its channels. |
| **Row / Ord** | Current preview row and order position. |
| **Tempo** | Global tempo, 30–300. Higher values make ticks faster. |
| **Speed** | Global ticks per row, 1–15. Larger values make rows last longer at the same tempo. |
| **Rows** | Global pattern length, 16–128. Changing it resizes every pattern. Increasing adds empty rows; decreasing discards later rows. Check SFX ranges after changing it. |

At Tempo 150 and Speed 6, a row lasts 0.1 seconds in the logical tracker schedule. Tempo 150 and Speed 1 means one row per NTSC video frame for the frame-based import profiles. There is no separate tempo per pattern or per named SFX.

The visible tracker edits notes and their selected instrument. Imported data can also contain supported per-cell volume values. There is no separate visible volume/effect-column editor in this candidate. Runtime effect commands and DPCM are unsupported; the build reports unsupported executable data rather than silently treating it as working audio.

### Keyboard and touch input

Click or tap a tracker cell first. Text and number fields keep their normal keyboard behavior.

| Keys | Notes or action |
| --- | --- |
| Z, S, X, D, C, V, G, B, H, N, J, M | C3, C#3, D3, D#3, E3, F3, F#3, G3, G#3, A3, A#3, B3 |
| Q, 2, W, 3, E, R, 5, T, 6, Y, 7, U | C4, C#4, D4, D#4, E4, F4, F#4, G4, G#4, A4, A#4, B4 |
| Up / Down | Select the previous or next row. |
| Left / Right | Select the previous or next channel. |
| Delete | Clear the selected note event to `---`. This differs from a cut. |
| Backspace | Enter an explicit `===` cut. |
| Space | Start or stop browser preview while AUDIO has keyboard focus. |
| Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y | Undo / Redo on Windows. |

The current PC piano mapping covers C3–B4. Imported/project note data can cover the wider supported C0–B7 range; there is no visible octave-shift control in this keyboard workflow.

On a phone or tablet, tap a cell to request the native text keyboard, then use the same letters. **Done / Enter** closes that keyboard. Entry stays in the selected cell. The tracker can scroll horizontally to the other channels and vertically to later rows. Playback does not force it to follow the current row. Scroll the workspace to reach the controls beneath it.

Paste is not a multi-note entry method. If your keyboard does not appear, try a direct tap on the cell and note the device/browser in feedback. Physical-device keyboard and audio behavior still need device-specific review.

### Instruments and envelopes

| Control | Purpose and result |
| --- | --- |
| **+ Add Instrument** | Creates and selects a new instrument. Its initial volume envelope decays to silence, its duty is 50%, and its arpeggio steps are zero. |
| Instrument list | Selects the instrument to edit and to assign when entering notes. Existing notes keep their stored instrument index. |
| **Name** | Labels the instrument; up to 80 characters. |
| **Duty** | Selects 12.5%, 25%, 50%, or 75% pulse duty. This affects pulse timbre, not the triangle/noise waveform. |
| **Volume Envelope** | Paints the selected instrument's existing amplitude steps, 0–15. Time runs left to right; the top is louder. |
| **Arpeggio Envelope** | Paints existing pitch-offset steps from −12 to +12 semitones. Zero retains the base note, +12 is one octave higher, and −12 is one octave lower. |

Click or drag on an envelope with the mouse, touch, or pen. A touch/pen stroke is one undoable edit when it changes values. Scroll beside the canvas rather than dragging over it when you want to move the panel. A cancelled gesture stops further painting; points already painted remain Undo-able.

Envelope steps advance on tracker ticks. A nonlooping volume envelope becomes silent after its last step. Imported instruments can retain supported loop metadata, but the current sidebar does **not** provide loop-point, envelope-length, pitch-envelope, or instrument-delete controls. Painting changes the existing points. Do not look for an Apply button or assume that drawing to the right adds more points.

### Pattern Order: reuse and variation

One order row chooses a pattern for each channel. A pattern is stored data, while an order entry is a reference to that data. Reusing a pattern means later edits affect every order entry that references that same pattern/channel.

| Control | Purpose and result |
| --- | --- |
| Order row outside its buttons | Selects that order row and returns the tracker selection to row 0. |
| Channel's pattern button | Opens a prompt for a pattern index from 0–255. Enter a decimal integer; a new index creates a blank pattern. The displayed button labels are hexadecimal. |
| **+ Add Order Row** | Appends a copy of the last order's pattern references and selects it. The new row initially repeats existing material; it does not duplicate the pattern's notes into independent data. |

To repeat the first exercise's phrase, click **+ Add Order Row**. Both Pulse 1 buttons initially refer to pattern 0. To make the second phrase different, click its Pulse 1 pattern button and enter **1** in the fresh project, then write notes in the newly blank Pulse 1 pattern. The other channels can keep referencing pattern 0. Play starts from the first order and visits both phrases.

The current sidebar has no order-delete, reorder, pattern-duplicate, or named-song controls. Use Undo immediately after an unwanted addition. Save a checkpoint before restructuring a longer arrangement.

## Add a named sound effect

A named SFX points to a row range in one channel of one tracker pattern. It does not contain another independent sound recording.

| Control | Purpose and result |
| --- | --- |
| **+ Add SFX** | Creates a named definition with a generated stable ID. |
| SFX list | Selects the definition to edit. |
| **Name** | Human-readable name, up to 80 characters. |
| **ID** | Read-only stable reference for an animation `sound` event. Prefer this when names might be duplicated or renamed. |
| **Channel** | Pulse 1, Pulse 2, Triangle, or Noise. Only this pattern channel plays for the SFX. |
| **Pattern** | Decimal pattern index, 0–255. That pattern must exist. |
| **Start row / End row** | Inclusive row range. Both must fit the current Rows value; End must not precede Start. |
| **Delete SFX** | Removes the definition. It does not erase its pattern. Check animation events that referenced the deleted ID; unresolved references will prevent the relevant build. |

### Make and trigger a short effect

Use a copy of the four-note project before adding the arrangement variation above, so pattern 1 is still unused:

1. In order 0, click the Pulse 1 pattern button and enter **1** to create a blank pattern.
2. Enter **Z** at row 000, **X** at row 002, **C** at row 004, and **Backspace** at row 006. Click **Play** to audition the pattern and then **Stop**.
3. Set the order's Pulse 1 pattern button back to **0**. Pattern 1 remains stored but is no longer the background music.
4. Click **+ Add SFX**. Set **Name: Rising beep**, **Channel: Pulse 1**, **Pattern: 1**, **Start row: 0**, and **End row: 7**. Keep the generated ID.
5. Save the project. To use this effect in a game, open the desired animation in **ANIM**, select the frame where it should begin, choose **sound** in **Frame-entry events**, and click **+ Event**. Put the SFX ID in the event's **Value** field. A unique SFX name also resolves, but the ID survives renaming.
6. Bind that animation to a supported playable runtime through your game workflow. Enable **Compile Audio Runtime** and build. Trigger the animation in the running game to test the effect.

**Checkpoint:** The animation's frame entry starts the effect once in a supported generated playable runtime. **ENTITY STUDIO** logs frame-entry markers during preview; its log is not an SFX playback test. The simple scene-viewer ROM from the melody exercise has no animation executor, so it will not trigger the event.

Generated playback supports one SFX at a time. It temporarily takes over its selected hardware channel, then restores that channel's music state. Another SFX request while one is active is ignored. A frame may request at most one `sound` event. Single-room player/target animations and World player animations have the documented sound-event execution path; arbitrary markers do not automatically create gameplay behavior.

There is no dedicated **Play SFX** button. You can audition its notes by temporarily selecting its pattern in the music order as above, then restore the music order. That auditions the pattern; the actual SFX range and trigger still need a generated-game test.

## Built-in audio workshop examples

Expand **Audio workshop examples**, choose **Four-note melody** or **Four NES channels**, and click **Add example to this project**.

The first example supplies C4, D4, E4, and G4 on Pulse 1. The second supplies notes on Pulse 1, Pulse 2, Triangle, then Noise so you can compare the voices. Both add ordinary editable patterns and instruments, replace the music order and timing, and retain existing patterns and SFX. They do not change the runtime switches. Confirm the replacement deliberately; one Undo restores the previous song.

Use **Play**, change one note, paint an envelope, save/reopen, and then build the ROM. The examples teach the same editor you use for your own work; there is no separate example-only sound engine.

## Bring in a score from another tool

Save the current project before importing. All three score-import routes append patterns and instruments and replace the music order and global tempo/speed. Existing SFX records remain, but their timing follows the new global settings. Review those effects again after an import.

### FamiStudio text

1. Obtain a UTF-8 text project export from FamiStudio 4.5.x. A native `.fms` project is not accepted by this route.
2. In **AUDIO → FamiStudio text import**, choose **Import FamiStudio…** and select the `.txt` file.
3. Choose the song in the song selector and click **Preview selected song**.
4. Read the conversion preview: note count, new patterns/instruments, timing, silent padding, converted content, omitted metadata, warnings, and Audio data estimate.
5. Click **Import selected song** and confirm only when those changes are suitable. Cancel leaves the project unchanged. A successful import is one Undo step.
6. Play and inspect the resulting score. Use **Save Project As…** for the editable result. Use **Download source + report** separately if you want to retain the original text and conversion evidence.

The supported first profile is NTSC base 2A03, with Pulse 1, Pulse 2, Triangle, and Noise. It supports a bounded set of note/cut data, constant duty, and volume envelopes. Constant FamiStudio groove converts to Tempo 150 / Speed 1; supported fixed FamiTracker tempo mode retains its corresponding tempo and speed. This is FamiStudio's tempo mode, not a FamiTracker text-file importer.

Unsupported versions, PAL/custom tuning, expansion audio, DPCM, variable grooves, nonzero loop starts, dynamic effects, slides, releases, legato, changing duty, and nonzero pitch/arpeggio envelopes are refused. Dynamic volume envelopes require Tempo 150; some volume/envelope combinations also cannot be represented. The error identifies the unsupported field and source line where available. Unselected songs and unreferenced patterns are not converted. This profile does not emulate or embed FamiStudio's driver.

The UI file limit is 1 MiB. Existing plus imported data must fit 256 patterns, 255 instruments, and 255 order entries. The active project's Rows setting determines output grouping and padding. A byte estimate is not a guarantee that the complete game will fit in ROM.

If you change the selected source/song or edit/open the project after previewing, preview again before importing. **Download source + report** produces a JSON receipt with original text, SHA-256 identity, selected song, and historical conversion report. It is available after a successful preview or import. The source is not embedded in the Forge project, and the receipt is not an editable project backup or proof that later edits still match the import.

### MIDI and MusicXML

1. Choose **Import MIDI** or **Import MusicXML** under **Import Score Data**.
2. Select the file and read the confirmation. These routes do not use the FamiStudio song-preview panel.
3. Confirm, then read the import status/warnings, inspect the channels, and play the result.
4. Undo if the conversion is unsuitable; otherwise save a new project checkpoint.

| Input | Supported scope and important limits |
| --- | --- |
| MIDI `.mid` / `.midi` | Standard MIDI format 0 or 1 with pulses-per-quarter timing. Imports note pitch/duration/velocity and uses track/program information for instrument labels. MIDI channel 10 maps to Noise. Format 2 and SMPTE timing are refused. |
| MusicXML `.musicxml` / `.xml` | Uncompressed `score-partwise` data with supported divisions, note/rest/chord durations, and backup/forward timing. Compressed `.mxl`, DTD/entity declarations, and sheet-music images are not supported. |

Generic imports quantize notes to sixteenth-note rows with Speed 6, allocate at most three simultaneous pitched voices plus Noise, and flatten later tempo changes to the initial tempo with a warning. Too many simultaneous pitched notes or overlapping noise voices are refused. Import does not recreate the external synthesizer's instruments or sound effects. Each route has a bounded approximately 4 MB input limit.

Forge's own MIDI/MusicXML exports include timing/channel hints for a more faithful score reimport. Those hints preserve supported note sequence, channel identity, cuts, note-start volume, and timing; they do not store native instruments. If an external editor removes the hints, the ordinary generic-import behavior applies. See [Audio score interchange](../Reference/Current_Release_Docs/AUDIO_INTERCHANGE.md) for the exact conversion contract.

## Export and keep the right files

| Action | What it gives you | What to keep it for |
| --- | --- | --- |
| **Save Project As…** | Complete native Forge JSON, including music, instruments, SFX, scenes, and game configuration. | Primary editable backup. |
| **Save / Load** | Browser-local project storage. | Convenient recovery on that browser; keep a portable file too. |
| Top-level **Export** | Full project/asset ZIP including `project.json`. | Portable project and asset handoff. |
| **Export Score Data → Export MIDI** | One ordered pass of the music as a standard MIDI score. | External composition/score tools. |
| **Export Score Data → Export MusicXML** | One ordered pass in uncompressed MusicXML. | External score/notation tools. |
| **Download source + report** | FamiStudio source text and conversion receipt. | Import provenance alongside the saved Forge project. |
| **Build .NES ROM** | Generated playable ROM output. | Emulator/hardware review, within supported build limits. |

Score exports show conversion warnings before downloading and do not modify the project. Repeated pattern references become a flattened sequence. SFX and game triggers, pattern sharing, infinite looping, pulse duty, and NES envelopes/timbre are not preserved as native Forge authoring data. External playback will use different instruments; Noise becomes percussion. An arpeggio envelope is not transcribed into separate score notes.

Unsupported effect/DPCM data, missing references, empty music, zero-volume note-ons, and volume changes during a sustained note can prevent score export. Fix the named problem or keep the native project. There is currently no WAV recording export, NSF export, FamiStudio `.fms`/text export, or audio-only project-save command.

## Preview, ROM playback, and practical limits

**Browser preview** is a convenient Web Audio audition. **Generated Audio Runtime** emits code and data for the NES APU in supported generated mapper-0 ROMs. **RE observations/transcriptions** concern a separately inspected ROM. Hearing or seeing a result in one does not establish equivalent behavior in the others.

**Compile Audio Runtime** adds executable music/SFX support to a generated viewer, single-room game, or World game. With it off, audio remains authoring data. **Autoplay tracker order as music** enables background music when the runtime is compiled; turn it off for an SFX-only playable build. Both settings are saved in the project. Importing music does not enable them automatically.

Generated audio cannot be inserted into authored custom assembly. Use an empty CODE editor with a generated build, or leave Audio Runtime disabled for your own assembly. The supported build layouts remain mapper 0 with 16/32 KB PRG and 8 KB CHR; the complete project must fit. Runtime limits include 255 order rows, 255 instruments, 255 named SFX, and 255 steps per compiled volume/arpeggio envelope, with actual ROM space often the tighter limit.

Pulse/triangle timer quantization and hardware channel behavior can differ from the browser preview. Very low triangle notes C0–G#0 reach the lower timer boundary rather than their requested pitches. Review edited music in the generated ROM and an independent emulator; physical NES timing and audible device performance need their own checks.

## If something does not work

| Symptom | What to check or do |
| --- | --- |
| “Add an instrument first” | Click **+ Add Instrument**, select it, then click the tracker and enter a note. |
| Typing does not enter notes | Click/tap the intended cell. A name, Tempo, Speed, or Rows field keeps normal text input. Use the mapped keys and move to the next row explicitly. |
| A blank row does not stop a note | Use **Backspace** to enter a cut. **Delete** clears the event and may let an earlier note continue. |
| Notes end sooner than expected | Inspect the volume envelope. The default instrument decays to silence; a long gap before the next note does not extend it. |
| Play repeats a phrase you thought you changed independently | Check both order entries' pattern references. Shared references edit the same underlying pattern/channel. Choose a new blank index for a new phrase. |
| Preview is silent | Check instrument and notes, click Play directly, and check browser/OS mute and output device. Hidden-page handling stops preview; return and start it again. |
| Preview works but the ROM is silent | Enable both Audio Runtime and background-music switches, then rebuild the current project. Check the emulator's audio controls separately. |
| Fresh-project build asks for a Player | For the melody exercise, choose **SCENE → Gameplay → Scene viewer / custom assembly** and leave CODE empty. A playable-room build needs its actual Player setup. |
| Build refuses custom assembly | Generated Audio Runtime cannot be inserted into authored assembly. Save the assembly separately before choosing an empty generated build, or disable Audio Runtime for the custom program. |
| SFX exists but never sounds | Check its ID in a `sound` event's Value, the playable animation binding, runtime enabled state, and the selected pattern/range. Scene viewer and Entity Studio's event log do not execute this game trigger. |
| Existing SFX feels faster after import | Tempo/Speed are project-wide. Imports retain the SFX record but replace those timing values. Undo or review/re-author the effect at the new timing. |
| FamiStudio import is refused | Read the exact field/line and supported profile. Exporting a `.fms` file under a `.txt` name will not convert it. Simplify a copy in the source tool or keep using the source project for unsupported features. |
| FamiStudio preview is stale | Preview again after changing the source, song, or project. A receipt is historical and is not a fresh preview. |
| Build or import exceeds capacity | Use a shorter arrangement/excerpt or a smaller project. An audio estimate alone cannot establish complete ROM fit. Keep the original saved project before reducing content. |
| Saved MIDI sounds different elsewhere | Expected: MIDI preserves supported score information, not the NES sound engine or native instruments. Open your Forge JSON to recover the editable original. |

## Source audit

Maintainer reference for this guide's current controls and behavior:

- `app/src/shell-prefix.html`: `sideAudio`, tracker transport fields, runtime switches, instrument/envelope panels, order list, and SFX fields.
- `app/src/legacy/00-editor.js`: `renderAudio`, `aud_enterNote`, `aud_choosePattern`, `aud_addOrder`, `aud_addInstrument`, `aud_updateRows`, and browser-preview/envelope functions. `renderAudio` prints decimal tracker rows and hexadecimal instrument indices.
- `app/src/legacy/02-interaction-bootstrap.js`: desktop AUDIO key map, cell selection, mouse envelope painting, and hidden-page preview stop.
- `app/src/audio/audio-ui.js` and `audio-adaptive-ui.js`: SFX/runtime UI, native-keyboard input, touch/pen envelopes, and narrow-screen tracker behavior.
- `app/src/services/workshop.js`: `AudioWorkshop` catalog and undoable example import.
- `app/src/audio/audio-import.js` and `audio-export.js`: MIDI/MusicXML import/export and the score-profile conversion contract.
- `app/src/audio/famistudio-text.js`, `audio-tool-import.js`, and `audio-tool-import-ui.js`: FamiStudio profile, staged conversion, UI actions, and receipt lifetime.
- `app/src/audio/audio-config.js`, `audio-compiler.js`, and `audio-engine.js`: saved switches, validation, generated APU music/SFX, and limits.
- `app/src/legacy/26-project166.js`, `28-ui166.js`, `24-ui165.js`, and `app/src/services/build-services.js`: blank-project mode, current Gameplay placement, viewer mode, and custom-assembly build restrictions.
- `app/src/legacy/17-frame-editor.js` and `18-entity-studio.js`: frame-entry event controls and preview logging boundary.

This guide describes source-audited behavior. It does not convert older documentation, logical audio tests, or a successful compile into a claim of listening acceptance on every browser, phone, or physical console.
