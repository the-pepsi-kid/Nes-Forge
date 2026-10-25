# Glass Joe fight-context recovery 1

Owner authorized continuing the next Punch-Out milestone: recover Little Mac/referee, assemble the source fight layers and verify representative contexts while preserving the existing editor, arena native writer and Audio. Native CHR/palette writers and complete fights remain later work.

## What this checkpoint adds

- 98 native Little Mac and 47 extended referee/speech background command descriptors, decoded by the original bank-11 preparation/drawing routines.
- 23 available player-state entries, traced with retained source RAM/nametables, declared zero-input initial conditions and bounded work.
- A Glass Joe opening reference combining two arena pages, source-initialized HUD, background characters and separate opponent/control OAM. The opponent is at the original configuration's upper-right opening position; it is not an active-fight simulation.
- Existing canonical raster/CHR/palette/OAM projection, preserving fine scroll, source tile provenance, MMC2 offscreen reads, sprite latch reads/order and line limits. No screenshot overlay.
- Explicit preview, observed-frame selection and one-transaction Scene materialization under Recovered content. Old source projects work without re-import. Raw CHR, prior opponent state/Animation recovery and native arena painting remain reachable.

The three modules are commented and layered: private format/interpreter (`re/punch-out-fight.js`), canonical projection/lifecycle adapter (`services/punch-out-fight-recovery.js`), and UI (`re/punch-out-fight-ui.js`). The source manifest adds them in dependency order. All 168 prior application parts remain byte-identical; no schema or project ownership changes.

## Ownership and editing

The preserved ROM remains source; existing native literal recipes plus the arena Scene remain the native write owners. Fight references are canonical copies with provenance and a projection signature. Opening a reference validates the preceding native build before re-signing the addition. Unsupported edited references remain savable and inspectable, but refuse native building and cannot be silently rebased. Preview can fall back to the preserved source plus supported literal recipes when a build refuses; its status explicitly identifies that fallback.

Use Edit native arena layout for supported native painting, then preview again to include the current encoded arena. Native Mac/referee/CHR/palette/sprite/Audio writers are not installed. Background player/referee excerpts are not imported as fake opponent metasprite Animations.

## Evidence and limits

`Source_Preservation.json`: all preceding modules byte-identical, original order retained.
`Fight_Verification.json`: both supplied revisions; 145 original CPU/mapper/PPU command comparisons, 2,224 observed state updates per revision and seven full background/composite projection comparisons per revision. Recorded counts refer to declared setup/zero-input paths, not complete fights.
`Lifecycle_Verification.json`: actual intake/import controls, detached preview, Undo/Redo, saved reopen, current native arena edits, selected state frames, raw bank navigation, prior opponent Animation tools, stale-preview rejection, unsupported edit preservation/build rejection and 84 Audio entries.
`gate/Summary.json`: retained available public gate plus tutorial exercise. The missing historical complete release gate is not claimed.

The private player-source bus does not run the complete opponent AI, damage, game phase controller or original NMI transfer schedule. Frame durations count source-state updates followed by source upload. Current mapper-9 timing remains approximate, live runtime capture still refuses, and browser/listening/controllers/hardware acceptance remain owner checks. No ROM, decoded graphics/sample payload, private screenshot or commercial source project is distributed.
