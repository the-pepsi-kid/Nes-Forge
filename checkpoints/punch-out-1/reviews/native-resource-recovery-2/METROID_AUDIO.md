# Metroid Audio

Open the original Metroid (U) ROM through **Open ROM / project → Open source Audio catalog**, or prepare/import its recovered project and switch to **AUDIO → ROM Audio Library**. Opening or reopening the recovered project restores the Audio source automatically. Brinstar is selected first.

1. Choose one of 12 music cues or 24 SFX in **Native audio cue**. The additional Silence/reset entry is a control, so playback/conversion is disabled for it.
2. Choose **Inspect cue**, then browse Native commands, volume envelopes and source locations. Music has 41 physical channel streams across six banks. Procedural SFX have handler/request evidence; their timed notes come from execution.
3. Choose **Play native** to audition the original driver for 1–1024 updates. Title/ending music uses bank 0; area music uses its declared bank. Playback uses cleared driver RAM, original startup random seeds $11/$FF and one native random-number update each frame. This repeatable context is not a gameplay recording. Stop ends the preview.
4. Choose **Preview editable score**, review the differences, then **Import into tracker** and confirm. This appends a finite excerpt and replaces the music order/tempo for music imports. Use **Tracker** to edit; one Undo restores the previous project. Save Project As preserves the adaptation. Single-channel SFX import requires a short, representable selection; other effects can be previewed as music excerpts.

The installed profile matches the supplied US revision, SHA-256 `c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6`. Different revisions, hacks and rebuilt ROMs with changed bytes do not silently reuse this profile. A recovered project's preserved original ROM remains the catalog source after room edits.

Native playback executes the original driver through Forge's shared CPU/APU. Static tables are decoded from the current source, with bounded stream walking and explicit music-end/loop boundaries. Human cue names and request routing follow the reviewed Metroid disassembly. Source reference: nmikstas/metroid-disassembly revision 4270d57, banks 01/07, B3B4/BBFA/BD31/BADC/BB1C and C000.

**Tracker import is a frame-sampled adaptation.** It preserves neither original engine commands nor sub-frame articulation. Nearest-pitch tuning, envelope adaptation, finite-window cuts and unsupported short-noise/DPCM are disclosed in the preview. It does not import whole song loop structure or gameplay triggers.

**Audio writing back into the original Metroid ROM remains unsupported.** If a tracker adaptation changes a native room project's Audio, native output must refuse it until undone. Keep an adaptation in a separate saved project if continuing native room edits. Native structure replacement remains the supported ROM writer.

Verification: `Metroid_Audio_Public_Tests.json` uses independent synthetic fixtures. `Metroid_Audio_Verification.json` records all 36 playable supplied-ROM cues, high-bit-first SFX dispatch, source guards, source restoration, preview/import and Undo/Redo. `audio-gate/Summary.json` records the focused shared compatibility suites. No full release regression or listening/hardware equivalence is claimed. Browser checks are explicitly blocked because this runtime has no Chromium executable; desktop/mobile controls still need owner acceptance.

Reproduction: `python3 app/tools/bundle.py --check`, then `node app/tests/metroid-audio.cjs`. Supplied-input checks: `node reviews/native-resource-recovery-2/verify_metroid_audio.cjs /path/to/Metroid.nes /path/to/report.json`. No ROM, extracted music or sample payload is included in this kit or the source checkpoint.
