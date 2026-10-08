# Native Audio review inputs

Start with **HonkeyPong-reproduced.nes** in Forge's General ROM Analysis panel, then use Native Audio investigation. This is a reproduced, unchanged independent game using FamiTone2, licensed by its original author. `independent.nes` is an identical copy used by the automated suite.

Expected result: two subsongs, one referenced instrument, two envelopes, and three statically referenced SFX IDs. The second song's triangle stream uses a counted reference. One SFX uses two pulse channels. Native recovery is separate from the active project and emulator; this candidate does not convert these streams into the canonical Audio editor.

For a bounded edit test, select a pulse-channel note event and change its native note code by one step. Export a ROM copy and load that copy in an emulator. Undo/Redo belongs to the native investigation. Original files, project state and emulator should remain unchanged until you explicitly open the rebuilt ROM.

`relocated.nes` and `nrom32.nes` are explicitly modified test derivatives. The former reassembles the unchanged external driver at a new address and moves music/SFX independently; the latter reassembles the source with a 32 KiB PRG layout. They are recognition tests, not separate independent games. Their source changes, hashes and pinned assembler provenance are in `provenance.json`; maps support independent verification.

The included `NES_Forge_Native_Audio_Input_Checkpoint.zip` provides all pinned sources and reproduction instructions. Keep `LICENSE-HonkeyPong.txt` (MIT, Ryan Souders) and `FamiTone2-upstream-readme.txt` (Shiru's public-domain driver notice).

Original source: https://github.com/HonkeyKong/HonkeyPong at commit `f9ab7ad450ffebabec15623aa811a7564f079168`.

Unchanged ROM SHA-256: `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`.

## Reproduce the profile and relocation derivatives

`examples/RE_Native_Audio/NES_Forge_Native_Audio_Profile_Research.zip` (next to the input checkpoint) preserves the pure modules, 47-contract development runner, profile generator, source-reassembly scripts, relocation fixtures, provenance and development evidence. Extract it and the independent input checkpoint separately; its README gives the commands and explicit checkpoint path. The fresh application Summary remains authoritative for release acceptance; research reports retain their original candidate hashes. No host executables or caches are included.
