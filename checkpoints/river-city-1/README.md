# NES Forge · River City street + Audio review

Partial native recovery: 36 cropped street segments across 13 locations, shared physical-tile editing, save/reopen and native rebuilding. The other 22 locations use a compressed interior/special path and remain unavailable. Game tile rows 4–23 are displayed at Scene rows 0–19; this is not a full gameplay screen.

Audio: 19 music requests (18 unique headers), 43 SFX and one stop control. Native audition and finite editable tracker import reuse the existing Audio Library. There is no native audio writer. Tracker edits are saved but refuse native ROM output; Undo restores native street rebuilding.

Read reviews/river-city-1/RIVER_CITY_REVIEW.md, Owner_Checklist.md and reviews/PROJECT_VERIFICATION.md. Every supplied project must verify Audio as well as Scene.

Build: python3 app/tools/bundle.py --check. Public tests: node app/tests/river-city.cjs and node app/tests/native-audio-library.cjs. The focused run_checks.py requires the recovered historical test tree; this snapshot contains the current rebuildable source and public decoder/UI tests. Supplied-input scripts require your own ROM.

Current evidence passes 378 compatibility checks, 5 street groups and 70 River City Audio checks. Retained Lolo room/Audio and Metroid Audio checks also pass on the same HTML. Browser listening, physical devices, interiors, HUD, actors, collision/exit semantics, full gameplay and alpha promotion remain open.

No commercial ROM, recovered score, sample payload, screenshot or source-bearing game project is included. Main and preceding review checkpoints are preserved.
