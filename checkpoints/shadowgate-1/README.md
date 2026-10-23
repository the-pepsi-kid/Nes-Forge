# NES Forge · Shadowgate static pictures + Audio review

Partial native recovery: 130 static picture-table slots with original background CHR, standard palettes, native 8×8 tile substitution, save/reopen and native rebuilding. Each view is a 112×112 crop; table slots are not 130 distinct gameplay rooms. Object/door overlays, alternate states, UI/text, puzzle logic, animation and whole-game recovery remain unresolved.

Audio: 14 music requests/13 unique headers, 20 SFX and one explicitly unavailable request. Native audition and finite editable tracker import use the existing Audio Library. Request 24 has an invalid standalone header; playback/conversion is disabled. No native Audio writer is installed. Tracker edits remain savable but refuse native ROM output; Undo restores native picture rebuilding.

The source-guarded header-view wrapper uses proven MMC3 mapping for Forge execution, while saved/rebuilt files retain every original header byte. Arbitrary legacy-header files do not receive this exception.

Read reviews/shadowgate-1/SHADOWGATE_REVIEW.md, Owner_Checklist.md and reviews/PROJECT_VERIFICATION.md. Every project must verify Scene and Audio.

Build: python3 app/tools/bundle.py --check. Public checks: node app/tests/shadowgate.cjs and node app/tests/native-audio-library.cjs. The focused run_checks.py gate requires the full recovered historical test tree; this snapshot contains the current rebuildable source and public decoder/UI tests. Supplied-input verification scripts require your own ROM.

Frozen evidence: 386 compatibility checks / 25 suites, 5 picture groups (130 original/130 edited native comparisons), 42 Shadowgate Audio checks and two 120-frame headless boots. Retained River City street/Audio, Lolo room/Audio and Metroid Audio checks pass. Browser listening, physical devices, full-game acceptance, the complete release gate and alpha promotion remain open.

No commercial ROM, recovered score, sample payload, screenshot or source-bearing commercial project is included. Main and previous review checkpoints are preserved.
