# NES Forge · Punch-Out backgrounds + Audio

Both supplied US revisions now have five static native staging backgrounds, MMC2 latch-aware CHR row projection and bounded native literal edits. Audio installs 84 entries: 75 sounding bank-8 music/effect/DPCM selections, a Startup PCM + native bell audition, six empty slots and two stop controls.

Startup PCM runs the original bank-6 one-shot routine continuously with instruction-clocked DAC writes. Select at least 199 updates to complete it; shorter windows report truncation. It has no PCM tracker model or native sample writer. Other editable Audio excerpts are finite adaptations; unsupported tracker edits refuse native ROM output.

Read reviews/punch-out-1/PUNCH_OUT_REVIEW.md, HANDOFF.md, Owner_Checklist.md and reviews/PROJECT_VERIFICATION.md. Five static backgrounds do not establish complete fights, fighter layers, animation, game logic or full menus. MMC2 scanline timing is approximate and runtime capture explicitly refuses. Browser listening, controllers, hardware acceptance, the complete release gate and alpha promotion remain open.

Build/check: `python3 app/tools/bundle.py --check`. Run the eight available public suites with `python3 reviews/punch-out-1/run_checks.py`. Supplied-input verification uses `python3 reviews/punch-out-1/run_supplied.py /path/to/private-roms`. The historical 386-case/25-suite gate is archived; seventeen historical suite scripts were absent from the restored source snapshot and are not counted as fresh reruns.

The standalone HTML is app/mainline/NES_Forge_2.0.0-alpha.11.html. Source preservation can be checked without earlier Git history using `python3 tools/verify_punch_out_source.py`: the exact predecessor HTML and verified part boundaries are included.

No commercial ROM, recovered music/sample payload, screenshot or source-bearing commercial project is included. Previous checkpoints and main are preserved.
