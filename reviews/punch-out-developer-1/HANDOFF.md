# Punch-Out derivative round trip and developer workflows

Owner scope: continue the existing Punch-Out checkpoint; explain the code and its NES Forge connections; provide a tutorial covering visual assets, independent RE, 6502 coding, external hex work and standalone HTML changes. The intervening owner messages expand the documentation scope; they do not authorize replacing the working editor or claiming full game recovery.

## Application change

An arena edit built correctly but its output no longer matched NativeResourceProject's existing static-background-only identity mask. The derivative fell back to generic ROM-project intake. The correction adds a distinct immutable identity covering the preceding recipe ranges plus the four arena stream pointer words and the exclusive 381-byte arena data range. Recipe ownership remains unchanged; existing Scene-writer span validation still applies.

The native adapter also interprets the current arena programs with explicit stream bounds, 8-bit Y termination and exact two-page initialization checks. Hash masking alone is insufficient. Header/code/Audio/CHR changes remain protected. The shared Open ROM / project path now prepares supported arena derivatives, retains the edits/fighter samples and restores all 84 Audio entries. Further edits and save/reopen are verified.

## Developer documentation

- `app/docs/NATIVE_RECOVERY_TUTORIAL.md`: complete asset map, visual edit/save/build workflows, manual RE, source/CPU bank mapping, a codec lesson, encoder integration, 6502, external hex editing, direct HTML changes, modular builds and verification/debugging.
- `app/docs/native-codec-exercise.cjs`: original runnable RLE teaching format with decode/edit/encode, capacity, bounds, preservation, JSON reopen and derivative checks. It is not commercial-game support evidence.
- HTML developer map at the top of `shell-prefix.html`.
- 17 Punch-Out/MMC2/native-owner modules formatted for reading, with detailed ownership/connection comments; additional shared-owner connection comments. Existing legacy modules are preserved.

General analysis remains read-only. External hex patching, reversible runtime RAM edits, profile-specific native command editing, canonical asset editing, custom assembly and HTML changes are distinct documented paths. No general hex-editor UI or universal native writer was added.

## Evidence

`Source_Preservation.json` compares the candidate with local baseline c66b774 (the previous public checkpoint is b99edcd). Among 168 inputs, 142 remain byte-identical; 22 JS inputs change only comments/formatting; three contain the bounded executable change; shell-prefix adds only an HTML comment. No source-manifest order or project schema changes.

`gate/Summary.json`: current nine-suite retained/synthetic gate (104 checks), plus the tutorial exercise. This is not the missing historical complete release gate.

`Reimport_Verification.json`: both supplied revisions through actual shared gateway prepare/import, mixed native recipe + arena edits, unchanged derivative output, further editing, saved reopen, Audio restoration, malformed arena rejection and unrelated byte rejection.

`Build_Verification.json` and `Runtime_Verification.json`: retained original-loader/build and player comparisons rerun on this candidate. Test scripts take the private input directory and the indicated preceding standalone HTML. No ROM or decoded asset payload is included.

Full fights, Little Mac/referee state recovery, native sprite/animation/CHR/palette-color/Audio writers, mapper-9 runtime capture, browser listening and hardware acceptance remain open. Broad PPU timing remains approximate. Keep using the saved Forge JSON for source plus authoring intent.
