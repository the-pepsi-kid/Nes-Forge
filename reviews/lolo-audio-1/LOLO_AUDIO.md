# Lolo Audio review

This update adds the missing native Audio catalog for the supplied Adventures of Lolo US revision: 10 music cues and 24 SFX. It re-reads 76 native channel streams and 30 referenced envelope programs from your ROM. Cue labels are table indices, not verified song names.

## Use it

1. Open this kit's NES_Forge.html and import your original Lolo ROM as recovered resources. An ordinary saved Lolo project from the preceding kit also works.
2. Open Audio → ROM Audio Library. The title should say Adventures of Lolo and list 34 cues, starting with Music 01.
3. Select a cue and choose Inspect cue or Play native. Use Stop to end playback. Test at least music and SFX in your browser; automated PCM checks do not establish listening quality.
4. Choose Preview editable score to inspect a finite transcription. Import into tracker appends editable data and changes the music order/global tempo. One Undo restores the prior project; Redo and Save Project As preserve the imported rows.
5. A single-channel SFX example is SFX 01 with 16 native updates and the Single-channel SFX destination. Multichannel or overlong excerpts must be imported as music or refused by the existing SFX limits.
6. Save/reopen a native room project and return to Audio. Its original source catalog reloads. A bounded Scene edit and native rebuild retain the driver; reopening the rebuilt ROM still detects the Audio catalog because its entire header/PRG remains identical.

## Native and editable limits

Native preview runs the original driver from cleared RAM with fixed PRG banks and one update per NTSC frame window. The decoder independently validates all code/music/instrument bytes by the complete immutable header/PRG hash, so room edits in CHR do not break detection. Modified PRG, alternate revisions and unrelated drivers are refused. Source records keep each derivative's actual full-ROM hash.

The cartridge has no FDS expansion hardware. Its inherited writes to unused FDS addresses are ignored and counted in isolated playback, matching the live MMC1 path. No FDS channel is synthesized. All 34 cataloged headers use the four NES channels; no DPCM sample commands occur in their decoded streams.

Editable excerpts use the existing frame-end APU transcription: sub-frame articulation, original envelope programs, command flow and phase are not preserved. Native playback retains original scheduling and arbitration. No Lolo native audio encoder is installed. Importing an edited tracker score into a source-backed project preserves that score but refuses a native ROM build; Undo restores the native-buildable room project.

Actors, moving-sprite recovery, animation and whole-game traversal remain partial or unverified. Scene/audio checks are now required together for each project; see ../PROJECT_VERIFICATION.md.

## Evidence

Lolo_Audio_Verification.json checks every native cue, physical source evidence, independent CPU/mapper register sequence parity, Audio-tab import/reopen, music and SFX conversion, Undo/Redo, score persistence and combined room/audio preservation. gate/Summary.json records the focused compatibility scope. Retained_Lolo_Rooms.json and Retained_Metroid_Audio.json preserve earlier work on the same HTML hash. These are automated native/model checks; browser listening and physical hardware still need owner acceptance.
