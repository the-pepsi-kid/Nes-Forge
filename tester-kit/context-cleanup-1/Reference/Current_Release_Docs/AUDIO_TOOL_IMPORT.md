# FamiStudio text import

This candidate adds an importer inside the existing **AUDIO** editor. Export a
text project from FamiStudio 4.5, choose **Import FamiStudio…**, select a song,
then choose **Preview selected song**. Read the conversion report before choosing
**Import selected song**. Native `.fms` projects are not accepted by this importer.

The initial profile accepts NTSC, base 2A03 songs with supported Pulse 1, Pulse 2,
Triangle and Noise data. It reads quoted attributes, repeated pattern instances,
notes, cuts and supported instrument envelopes. A constant FamiStudio groove maps
to one frame per Forge row at tempo 150/speed 1. Fixed FamiTracker tempo mode maps
to the corresponding tracker tempo and speed. The preview reports the converted
arrangement, timing, silent padding and omitted editor metadata. This is a score
conversion; it does not install or emulate FamiStudio's sound driver.

The profile refuses unsupported versions, PAL/custom tuning, expansion audio,
DPCM, variable grooves, nonzero loop starts, dynamic effects, slides, releases,
legato, changing duty and nonzero pitch/arpeggio envelopes. Some envelope/volume
combinations also refuse when Forge cannot represent their behavior. Dynamic
volume envelopes require tempo 150. Errors identify the unsupported field and,
where available, the source line. Unknown attributes are not silently discarded.
Unselected songs and unreferenced patterns are not converted. This is a bounded
first profile, not full FamiStudio project compatibility or FamiTracker text import.

Import appends ordinary patterns and instruments and replaces the music order
and global tempo/speed. Existing SFX records remain, but their playback timing
uses that new global tempo/speed. One Undo restores the previous song. Source or
project changes invalidate the preview. Runtime switches remain under the user's
control: enable **Compile Audio Runtime** and **Autoplay tracker order as music**
when building a ROM with the imported music.

**Save Project As** saves the converted editable score in the existing schema-12
project. **Download source + report** saves a separate JSON receipt containing
the original UTF-8 text, its SHA-256 identity, selected song and historical
conversion report. Keep both files if the original export matters. The source is
not embedded in the Forge project; a receipt is not a replacement for a saved
project or proof that a later edited project still matches the import.

Files are limited to 1 MiB in the UI. Pattern rows follow the current project
(16–128); existing plus imported records must fit the canonical Audio capacities
(256 patterns, 255 instruments, 255 order entries). Import does not trim a song
to fit. The Audio byte estimate checks the score; building the complete project
checks the ROM's total capacity.

## Reproduction and review

The original four-channel test scores and their **official FamiStudio 4.5.3 CLI
exports** are in `tests/fixtures/famistudio-export/`. Read that directory's
provenance before extending the profile. Hand-authored malformed and edge cases
complement the independently exported fixtures.

1. Open `tests/fixtures/famistudio-export/forge-four-channel-famitracker-tempo.txt`
   through the importer and preview it. Expect 18 notes on four channels.
2. Import, change a tracker note, save the project, reopen it and check the edit.
3. Enable the Audio Runtime and music switches, then build and run the ROM.
4. Check Undo/Redo and receipt download separately. Listen in Forge and an
   independent emulator; logical CPU/APU checks do not establish audible or
   hardware equivalence.

Run the parser/lifecycle suites with `node tests/famistudio-text.cjs` and
`node tests/audio-tool-import.cjs` from `app/`. The real-browser supplement is
`tests/browser-audio-tool-import.cjs`; `FORGE_CHROMIUM` can select an installed
Chromium executable. Measured results belong to the current candidate's report,
not this procedure.

## Audio recognition research

`research/audio-recognition-1/` contains a separate read-only comparison and
benchmark. It compares bounded 6502 routine features with source-backed controls,
while retaining the existing strict FamiTone2 decoder as the authority for native
recovery. Similar routines are investigation leads, not permission to convert.
Relocated builds of one game are transformation tests, not independent games.
The corpus is too small to establish broad recognition accuracy or reduced
investigation time. The benchmark README records the exact corpus and limits.

References: [FamiStudio text export documentation](https://famistudio.org/doc/export/),
[official source revision](https://github.com/BleuBleu/FamiStudio/tree/70625dd09d8acaef831bbce468d416fb0b596be1).
