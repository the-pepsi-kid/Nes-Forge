
## Punch-Out source content checkpoint

The current candidate adds the source-content browser and materializes five preceding background pages plus representative sprite sources/placements/metasprites for 14 fight configurations. All 32 raw CHR banks remain available. Full recovery is **not complete**: animation context, Little Mac/referee states, transitions/collision/AI and native sprite/CHR/Audio writers remain open. See `reviews/punch-out-content-1/HANDOFF.md`, the fresh content/lifecycle evidence and 90-check gate. All 157 original application inputs remain byte-identical.

# Current status

**2.0.0-alpha.11 · Punch-Out static backgrounds + Audio review**

Both supplied US PRG revisions import five static native background contexts with MMC2 latch-aware graphics, original palettes and bounded native literal edits. Shared physical operands retain one owner; generated/inherited cells, metadata aliases and latch-control IDs refuse. Fighter/sprite layers, dynamic UI, animation, collisions and full fights remain unresolved.

Audio installs 84 entries per revision: 23 sounding music requests, 45 procedural effects, seven DPCM requests, one startup PCM routine, six empty slots and two stop controls. Native audition and finite editable tracker/SFX conversion use the existing Audio Library. No native Audio writer; DPCM is auditioned from source and omitted from canonical edits. The bank-6 startup PCM is cataloged for native audition; PCM tracker editing remains unavailable.

Read ../reviews/punch-out-1/PUNCH_OUT_REVIEW.md, HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Current checks are in gate/Summary.json and Supplied_Summary.json. This restored source snapshot contains eight public suites, so the historical 386-case/25-suite gate is not claimed as a fresh rerun. Browser listening, full fights, hardware, MMC2 runtime capture, the full release gate and alpha promotion remain pending.

## Previous checkpoint

# Current status

**2.0.0-alpha.11 · Shadowgate static pictures + Audio review**

Shadowgate imports 130 static picture-table slots with original background CHR, standard palettes, native 8×8 tile substitution and save/reopen/rebuilding. Native tile coordinates (2,4)–(15,17) form the 112×112 crop displayed at Scene (0,0). These are source picture slots, not 130 distinct gameplay rooms. Objects/doors, alternate room/palette states, UI/text, puzzle logic, animation and full gameplay remain unfinished.

Audio includes 14 music requests (13 unique headers), 20 SFX and one invalid standalone slot with playback/conversion disabled. Native audition and finite editable tracker import are installed. There is no native Audio writer. A source-guarded header-view wrapper uses MMC3 for Forge emulation while preserving the supplied legacy header in saved/rebuilt files.

Read ../reviews/shadowgate-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Every project must verify Scene and Audio. Current evidence: 386 focused compatibility checks / 25 suites, five picture verification groups and 42 Shadowgate Audio checks. Retained River City street/Audio, Lolo room/Audio and Metroid Audio checks pass on the same HTML. Owner browser listening, physical devices, the full release gate and alpha promotion remain separate and pending.
