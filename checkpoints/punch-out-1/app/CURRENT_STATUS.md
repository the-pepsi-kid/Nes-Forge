## Punch-Out arena recovery checkpoint

The missing fight background was outside the five intro/staging contexts. This additive checkpoint executes original arena programs 1 and 2 on a bounded private PPU bus, then assembles their two nametables at NT1 / scroll $B0 with setup CHR bank 0 and the Glass Joe setup palette. A named **Arena · ring and audience · source setup** Scene is appended on fresh import. Earlier saved projects use **Recovered content → Open ring and audience**, in one Undo transaction.

This is a static setup reference. Health-bar fields retain original setup placeholders; live scores/clock, moving camera, Little Mac, opponent and referee layers remain separate. The original 163 application inputs remain unchanged. Existing background recipes, boxer/metasprite/state tools and Audio are retained; unsupported arena edits save but refuse native ROM building. The original source ROM remains the only native owner.

See `reviews/punch-out-arena-1/HANDOFF.md`, `Arena_Verification.json`, `Source_Preservation.json` and `gate/Summary.json`. No commercial ROM, decoded art, sample, screenshot or source-bearing project is distributed.

## Punch-Out state excerpts checkpoint

The current candidate adds original state/shape execution and explicit timed recovery into Animation. The 365-state matrix per revision yields 119 sprite-size-changing excerpts and establishes 81 previously contextual pose entries. Source sound requests link to the existing Audio library. All 160 preceding runtime modules remain byte-identical. These are bounded observed state paths, not complete fights or native animation/Audio writers. See `reviews/punch-out-states-1/HANDOFF.md` and its fresh verification reports.


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
