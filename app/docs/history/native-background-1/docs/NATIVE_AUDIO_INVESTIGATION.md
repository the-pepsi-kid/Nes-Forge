# Native Audio Investigation

This candidate adds **RE / DISASM → General ROM Analysis → Native audio · FamiTone2 profile**. It recognizes one supported linked FamiTone2 v1.11 driver variant, decodes its native audio data, and lets you edit supported command bytes in a separate ROM copy.

It does not import that music into Forge's AUDIO tracker. Native timing, instrument envelopes, tuning, global speed changes, DPCM and SFX mixing require separate representability work before a faithful canonical import can be offered.

## Try the included native ROM

1. Open **RE / DISASM**. In **General ROM Analysis**, choose `examples/RE_Native_Audio/HonkeyPong-reproduced.nes` and click **Open for analysis**.
2. In the central analysis workspace, find **Native audio · FamiTone2 profile** and click **Analyze current ROM**. This is an explicit action; loading a ROM into the emulator does not perform this analysis.
3. Check the original source SHA-256, current copy SHA-256, recognized driver variant and native initialization region. Expand **Profile limits and diagnostics**. The supplied fixture has two header subsongs. Instruments are the referenced records; the SFX inventory contains only statically proven call IDs and is not a complete count.
4. Choose a **Native subsong**, **Channel**, and **Editable native command**. The command list shows at most 100 entries per page. Its details identify the logical row, CPU address, physical file offset and current command byte. Inspect **Referenced instrument evidence** and **Known SFX evidence · partial inventory** for the decoded source locations.
5. Choose a note command. Enter a different whole-number native code and click **Apply native edit**. Pulse/triangle codes are 0–60; noise codes are 0–16. Zero cuts the channel. These are native driver codes, not MIDI note numbers. The original command's encoded following empty row is preserved.
6. The native engine remains in the copy. The edited byte is re-decoded and checked before it becomes current. If several events share the byte, the result lists the affected song/channel uses. Changing a shared command affects every listed use.
7. Try **Undo native edit** and **Redo native edit**. This is separate from the Forge project's Undo history. The session retains up to 32 ROM states within a 2 MiB history budget; historical states keep bytes and hashes, and are decoded again when restored.
8. Click **Download native ROM copy** and complete the existing Save As dialog. Export **Download native evidence** as a companion report. Load the exported `.nes` explicitly into an emulator when you are ready to compare it against the original. Native analysis/editing does not start playback or replace the active emulator ROM.

Instrument commands can select only instruments already decoded from the source. The supplied example has one compacted instrument, so selecting that existing instrument does not produce a changed byte. Unsupported instrument IDs, DPCM/control-flow commands and invalid values are refused. This release does not offer SFX byte editing.

## Save the native copy separately

**Export the native ROM before closing the page or starting another native analysis.** The native edit session is temporary and isolated from the editor project. **Save Project As does not save these native ROM edits.** Starting another native analysis clears the native session.

The evidence JSON is a report, not a restorable editable project/session and not canonical Audio JSON. It records the original source identity, current copy identity, net changed physical bytes and the current native evidence. To continue editing a downloaded native ROM, open that ROM for general analysis and analyze it again; it becomes the source for a new session.

The original inspection bytes are immutable. Editing a native command only changes the isolated copy. The original file on disk, editor scenes, AUDIO tracker data, generated gameplay and active emulator state remain unchanged by analysis and edits. Native fields retain ordinary text editing behavior; the central input owner blocks emulator keyboard, touch and controller input while a field is focused.

Changing the inspected ROM or file selection makes the native session stale. Edit, history and export actions refuse that stale session. Delayed analysis, patches and history restores check source identity again before publishing a result. A pending Save As request reports **busy**; it does not count as a successful export. Cancellation leaves the session available.

## Status and limitations

- **Decoded:** the supported linked driver and native data passed this profile's structural checks. This is native evidence and edit capability, not a listening result or proof that every in-game audio path was discovered.
- **Unknown:** no supported profile was found, or the container lies outside the profile. General ROM inspection remains available.
- **Ambiguous:** several plausible initializations or structures need explicit disambiguation. No editable copy is selected automatically.
- **Invalid:** the profile rejected malformed or inconsistent data. Read the diagnostics; no native edit is applied.

The profile supports a bounded NROM input: 16/32 KiB PRG, CHR RAM or one 8 KiB CHR ROM bank, and an optional trainer; the maximum input is 41,488 bytes. Recognition uses linked instruction structure and initialization evidence, not a game filename or whole-ROM hash allowlist. Other FamiTone ports, other engines and bank-switched drivers need their own supported methods.

Native music rows use a fixed-point video-frame accumulator. Instrument envelopes advance on active video frames. Speed changes are global and depend on channel processing order. Pulse and triangle can use identical native timer values while producing different pitches. The displayed native values are preserved; the UI does not relabel them as canonical tracker pitches or assume one row equals a fixed frame duration.

DPCM recovery is unsupported for this profile. SFX use register-buffer updates and native mixing/arbitration rather than Forge's single-channel pattern representation. Static call discovery cannot establish all dynamically selected pointers or SFX IDs. The UI and exported report retain these unknowns.

## Review checks

- Analysis leaves your current Forge project, project Undo history and emulator ROM unchanged.
- A supported native note edit changes the copy's SHA-256 and the intended physical command byte; source SHA-256 stays fixed.
- Undo restores the previous copy; Redo restores the edit. An edit after Undo replaces that session's redo branch.
- Downloaded evidence lists the copy's actual net byte differences and the same SHA-256 as the downloaded ROM.
- Invalid values, changed sources and stale asynchronous results are refused without replacing the current copy.
- Native note fields open the platform's normal keyboard; typing or a connected controller does not operate the emulator behind the fields.
- Compare original and modified ROM playback separately on the intended browser/device and an independent emulator. Automated structural tests do not establish audible quality, complete game compatibility or mobile performance.
