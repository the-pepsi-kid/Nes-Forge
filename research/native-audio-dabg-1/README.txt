DABG native audio recovery research — first usable lead-stem proof

Result: an editable schema-12 NES Forge project and generated mapper-0 scene-viewer
ROM recovered from the original DABG ROM's first 32 source rows of Pulse 1 music.
The scene is an intentionally blank authored carrier. It is not recovered DABG
gameplay or graphics. Open the JSON in current NES Forge, choose AUDIO, then Play
or edit. Build & Run produces the audio-enabled viewer. The original excerpt has
13 note attacks and 6 rests/cuts over 214 NTSC-update frames. A terminal cut and
42 padding frames fill four 64-row patterns; the canonical order then repeats.

Generated files are in results/:
  DABG_Morning_Mood_Lead_32_Rows.nesforge.json
  DABG_Morning_Mood_Lead_32_Rows.nes
  DABG_Morning_Mood_Lead_32_Rows_Edited.nesforge.json
  DABG_Morning_Mood_Lead_32_Rows_Edited.nes
  Original_DABG_Audio_Observation.json
  Lead_Recovery_Comparison.json

The reproduction scripts observe.cjs and decode-lead.cjs are beside this README.

Reproduce from the repository root using Node 20 or newer. The application is
the unchanged audio-tool-import-1 build (original implementation commit
ffb57eab61d2e69ae0b92838c7b55748423b3140; documentation base a77bebc):

  node research/native-audio-dabg-1/observe.cjs
  node research/native-audio-dabg-1/decode-lead.cjs

Both scripts resolve the repository from their own location and default to the
results/ subdirectory. Optionally pass an output-directory argument to BOTH
commands. No network, external assembler or source rebuild is needed. Exact
source-ROM, app and linked-label hash guards fail closed when their pins change;
this deliberately source-specific probe is research, not a reusable recognizer.
Reproduction.json records two runs in separate output directories: all six
generated artifacts were byte-identical, with byte lengths and SHA-256 hashes.

The first command executes original linked audio subroutines. The second reads
the ROM's conductor, duration table, pattern bytes, instrument and period tables,
creates canonical AUDIO data, saves through ProjectStore and builds through
RuntimeCompiler. It compares actual generated audio-subroutine execution against
the separately recorded original output. No original driver source is inserted
into the Forge app. No application code or original ROM bytes are changed.

Source input:
  app/examples/RE_Native_Map/DABG-reproduced.nes
  32,784 bytes; 16-byte NES 2.0 header, mapper 0, 32 KiB PRG, 8 KiB CHR RAM
  SHA256 eca79b9d0b546e96c1bc73099e239539fb9c7773ff10a431bb3a9cd6763208ca
  Header 4e45531a020000080000000700000000

Independent source oracle:
  research/native-map-intake-1/source/DABG/
  source commit 5ecc60b6af3f726851bfeb1c2555388c5953e0c0
  pinned cc65 commit 555282497c3ecf8b313d87d5973093af19c35bd5
  source/build proof app/examples/RE_Native_Map/Input_Provenance.json
  original linked symbols research/native-map-intake-1/build/dabg.lbl
  exact source/code listing research/native-map-intake-1/build/dabg.lst

The actual engine identifies itself in sound.s/music.s as Damian Yerrick's
LJ65 / Concentration Room / Thwaite sound engine, 2009–2011. Do not infer a later
Pently version. Those source files retain GPL-3.0-or-later notices; the complete
mixed-notice upstream source/toolchain checkpoint already lives at:
  app/examples/RE_Native_Map/NES_Forge_A2_Native_Map_Input_Checkpoint.zip
  checkpoint SHA256 6dc4c6cadaa5774ef347b8dca22041fc9221c0d268e92fa258b25dc38075ac68

Addresses for this source-linked build (CPU -> physical file):
  init_sound       D33B -> 534B
  start_sound      D37A -> 538A
  update_sound     D3CE -> 53DE
  update_one_ch    D3E0 -> 53F0
  periodTableLo    D456 -> 5466
  periodTableHi    D4A6 -> 54B6
  durations        D4FC -> 550C
  init_music       D504 -> 5514
  stop_music       D554 -> 5564
  update_music     D55A -> 556A
  startPattern     D6AE -> 56BE
  update_music_ch  D6C9 -> 56D9
  psg_sound_table  D71E -> 572E
  drumSFX          D8B6 -> 58C6
  instrumentTable  D8BC -> 58CC
  songTable        D8D8 -> 58E8
  pattern table    D8DA -> 58EA
  morning_mood     D8E8 -> 58F8
  first lead       D938 -> 5948
  drum pattern     D9A4 -> 59B4
  Formula: fileOffset = cpuAddress - 8000 + 10 (hex).
  psg_sfx_state zero-page base 0020; soundBSS RAM base 030E.

Exactly one compiled song exists. newgame.s starts ID 0; the cleared
fanfare in musicseq.s is disabled by .if 0 and is absent from the ROM.

Opening conductor bytes at D8E8:
  32 1C             tempo 540 rows/minute
  01 06 1B 01       Pulse 2 silent pattern 6, transpose 27, piano 1
  02 06 1B 00       Triangle silent melodic pattern 6
  03 00 00 00       Drum sequencer pattern 0
  00 01 1B 01       Pulse 1 lead pattern 1, transpose 27, piano 1
  20 1F             wait 32 rows

First lead bytes at D938:
  79 D0 41 D0 50 58 69 D0 41 D0 31 41 D0 50 D0 50 69 7B 43
Low 3 bits select durations [1,2,3,4,6,8,12,16]. Upper 5 bits are pitch 0–24,
tie 25 or rest 26. Native pitch adds the conductor transpose. Instrument 1 bytes
47 04 00 00 at D8C0 produce duty 1 (25%) and volume 7..0 with four frames per
step. The canonical instrument keeps that exact envelope and cell volume 15.
The source fixed-point tempo is frame-expanded to tempo 150/speed 1 so canonical
envelopes tick every video frame. Nominal tempo 135/speed 6 alone would stretch
those envelopes and fail the actual source comparison.

Important boundary: melody patterns 1–4 do not have FF terminators. The conductor
switches them after 32 rows. Scanning until FF would consume subsequent patterns.

Measured evidence:
  - Original init_sound/init_music(0), then 230 controlled update_sound calls:
    43,686 update instructions, 1,339 total APU writes including initialization,
    zero missed opcodes and no harness errors.
  - The decoded first 32 source rows last 214 frames. Actual original/generated
    Pulse 1 volume and sounding duty/period match every frame, zero mismatches.
  - Source pulses use exact current Forge periods 179,268,239,225,201,301.
  - Save -> reopen -> rebuild produces the same ROM bytes.
  - Deliberately editing first canonical note 63 -> 64 changes period 179 -> 169 on
    exactly audible frames 0..12; later audible pitches and volume/duty remain.
  - Both viewer outputs are 24,592 bytes and load through ordinary iNES frontend.

Why this is a partial lead stem:
The native song's drum events trigger paired triangle/noise SFX. The triangle
sounds despite a silent melodic pattern. The snare stream at D85A/file 586A has
noise values $84 on two frames, which select short-mode noise. Current canonical
AudioEngine emits only noise periods 0..15. Silently dropping bit 7 changes the
sound. This proof intentionally excludes all other channels/drums. It does not
claim a full-track conversion or introduce new support in the production UI.

Current recognition weakness observed:
The strict FamiTone2 decoder appropriately refuses this distinct engine (the
original also fails its iNES-only boundary). The research feature mapper can
read the original NES 2.0 NROM, but its vector/direct-call traversal does not reach
update_sound (D3CE) or update_one_ch (D3E0). It retains init_sound. Source
screens.s:96–112 dispatches through MainMenuAddrs using PHA/PHA/RTS, beyond that
traversal's direct branch/call model. The recorded graph also stops on byte $17 at
C2AD/file 42BD, which is data. Useful expansion is runtime-derived roots or a
bounded proven dispatch analysis, not treating high similarity as support.

Limits of this proof:
Locations are supplied by the source oracle. This is a working ROM-byte decoder
for one selected passage, not reusable engine-family recognition. Production
integration still needs structural recognition, bounded malformed-input checks,
profile/selection evidence and UI staging. The original NES 2.0 file is never
rewritten: its actual PRG is mapped directly for CPU subroutine calls, while the
existing frontend refusal is recorded. One update call per nominal frame tests
logical timing; it does not establish full-game call scheduling, pulse phase,
register-write equivalence, audible listening, independent emulation or hardware.
