## Punch-Out state excerpts checkpoint

The current candidate adds original state/shape execution and explicit timed recovery into Animation. The 365-state matrix per revision yields 119 sprite-size-changing excerpts and establishes 81 previously contextual pose entries. Source sound requests link to the existing Audio library. All 160 preceding runtime modules remain byte-identical. These are bounded observed state paths, not complete fights or native animation/Audio writers. See `reviews/punch-out-states-1/HANDOFF.md` and its fresh verification reports.


## Punch-Out source content checkpoint

The current candidate adds the source-content browser and materializes five preceding background pages plus representative sprite sources/placements/metasprites for 14 fight configurations. All 32 raw CHR banks remain available. Full recovery is **not complete**: animation context, Little Mac/referee states, transitions/collision/AI and native sprite/CHR/Audio writers remain open. See `reviews/punch-out-content-1/HANDOFF.md`, the fresh content/lifecycle evidence and 90-check gate. All 157 original application inputs remain byte-identical.

# NES Forge · Punch-Out backgrounds + Audio

Both supplied US revisions now have five static native staging backgrounds, MMC2 latch-aware CHR row projection and bounded native literal edits. Audio installs 84 entries: 75 sounding bank-8 music/effect/DPCM selections, a Startup PCM + native bell audition, six empty slots and two stop controls.

Startup PCM runs the original bank-6 one-shot routine continuously with instruction-clocked DAC writes. Select at least 199 updates to complete it; shorter windows report truncation. It has no PCM tracker model or native sample writer. Other editable Audio excerpts are finite adaptations; unsupported tracker edits refuse native ROM output.

Read reviews/punch-out-1/PUNCH_OUT_REVIEW.md, HANDOFF.md, Owner_Checklist.md and reviews/PROJECT_VERIFICATION.md. Five static backgrounds do not establish complete fights, fighter layers, animation, game logic or full menus. MMC2 scanline timing is approximate and runtime capture explicitly refuses. Browser listening, controllers, hardware acceptance, the complete release gate and alpha promotion remain open.

Build/check: `python3 app/tools/bundle.py --check`. Run the eight available public suites with `python3 reviews/punch-out-1/run_checks.py`. Supplied-input verification uses `python3 reviews/punch-out-1/run_supplied.py /path/to/private-roms`. The historical 386-case/25-suite gate is archived; seventeen historical suite scripts were absent from the restored source snapshot and are not counted as fresh reruns.

The standalone HTML is app/mainline/NES_Forge_2.0.0-alpha.11.html. Source preservation can be checked without earlier Git history using `python3 tools/verify_punch_out_source.py`: the exact predecessor HTML and verified part boundaries are included.

No commercial ROM, recovered music/sample payload, screenshot or source-bearing commercial project is included. Previous checkpoints and main are preserved.
