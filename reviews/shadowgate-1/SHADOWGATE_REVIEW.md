# Shadowgate · static pictures + Audio

This checkpoint recovers the supplied US revision's 130 static picture-table slots with original background CHR, standard palettes and bounded 8×8 native tile substitution. Import a supplied ROM, open Area library → Investigated source, and choose a picture. Save/reopen and native rebuilding preserve the original source owner and every byte outside explicit tile recipes.

Each view is a 112×112 crop of native tile coordinates (2,4)–(15,17), displayed at Scene (0,0). The remaining canvas is unused. These are picture-table entries, not 130 distinct or fully reconstructed rooms. Object/door overlays, alternate room/palette states, text, UI, puzzle interactions, animation, entity behavior and full gameplay remain unresolved.

The supplied file has a legacy header declaring mapper 68. Its native banking routines use MMC3. A separate source-guarded header-view wrapper selects mapper 4 for Forge emulation while preserving the original header in saved/rebuilt files. Arbitrary mapper-68 files and protected-source modifications do not receive this exception. External emulators may need their own legacy-header handling.

Audio is installed at import and after reopening: 35 table slots contain 14 music requests (13 distinct headers), 20 SFX and one unavailable request. Names use native indices. Requests 2 and 3 alias a music header. Request 24 points to a header type outside the native dispatch range; inspectable evidence remains available, but playback and conversion are disabled. No invented replacement is supplied.

All 34 available requests execute the original driver in an isolated fixed-bank machine. The structural catalog records 83 channel streams and 24 referenced instrument programs. Timing, articulation and channel arbitration remain native. Editable tracker import is a finite frame-end adaptation; it loses native control flow, exact instruments and sub-frame changes. There is no native audio writer. Imported Audio remains savable but refuses native ROM output; Undo restores picture rebuilding.

Verification includes every original picture, an edited native build for every picture, lifecycle/negative/actual-predecessor checks, every available native audio request, independent live-MMC3 APU-write comparisons, Audio-tab import/reopen, editable music/SFX checks, derivative Audio identity and retained compatibility. Read the adjacent JSON reports for the frozen app identity and exact counts. This is a bounded development checkpoint; the full release gate and alpha promotion are not claimed. Owner browser listening, controller/hardware tests and full-game acceptance remain pending.

No commercial ROM, recovered score, sample payload, rendered source screenshot or source-bearing commercial project is distributed. Follow ../PROJECT_VERIFICATION.md for every project; Scene-only checks do not close verification.

Frozen verification: 386/386 compatibility checks across 25 suites; 5/5 picture groups (130 original and 130 edited native comparisons); 42/42 Shadowgate Audio checks; 2/2 bounded 120-frame boots. Retained checks: River City 5 street groups/70 Audio, Lolo 8 room groups/42 Audio, and Metroid 44 Audio. The frozen app SHA-256 is `9c276fa3c7fea42d37e43ce154249adcc78976620f8b4aa7dd1950998c9e1d2b`.
