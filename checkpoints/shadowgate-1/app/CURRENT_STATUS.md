# Current status

**2.0.0-alpha.11 · Shadowgate static pictures + Audio review**

Shadowgate imports 130 static picture-table slots with original background CHR, standard palettes, native 8×8 tile substitution and save/reopen/rebuilding. Native tile coordinates (2,4)–(15,17) form the 112×112 crop displayed at Scene (0,0). These are source picture slots, not 130 distinct gameplay rooms. Objects/doors, alternate room/palette states, UI/text, puzzle logic, animation and full gameplay remain unfinished.

Audio includes 14 music requests (13 unique headers), 20 SFX and one invalid standalone slot with playback/conversion disabled. Native audition and finite editable tracker import are installed. There is no native Audio writer. A source-guarded header-view wrapper uses MMC3 for Forge emulation while preserving the supplied legacy header in saved/rebuilt files.

Read ../reviews/shadowgate-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Every project must verify Scene and Audio. Current evidence: 386 focused compatibility checks / 25 suites, five picture verification groups and 42 Shadowgate Audio checks. Retained River City street/Audio, Lolo room/Audio and Metroid Audio checks pass on the same HTML. Owner browser listening, physical devices, the full release gate and alpha promotion remain separate and pending.
