# Lolo checkpoint handoff

The owner selected the next title after the completed Metroid audio update. Lolo is the only added title in this turn. Read LOLO_REVIEW.md and the exact-hash reports before making further changes.

- Current app: `app/mainline/NES_Forge_2.0.0-alpha.11.html`, SHA-256 `c7f5e0328def5923cbe9409b2ac7cccaeedb8cb912f3f1a8ec52d159a78559ab`.
- Local branch: `implementation/lolo-recovery-1`; exact preceding source: `003ddbb3a705a03ed07e30505535ff1bba798b38`.
- GitHub destination: `the-pepsi-kid/Nes-Forge`, review branch `review/lolo-recovery-1-2026-10-23`, current snapshot under `checkpoints/lolo-recovery-1`. Keep main unchanged. Check the live ref to verify publication; an upload attempt is not proof of a reachable commit.
- Previous published checkpoint: `review/metroid-recovery-2-2026-10-22` at `01cf75b0fe7e4fa83a38153e364730cfa00d2639`.
- Current downloadable kit: `NF3.zip`, root `NF`. Original tutorial and all 127 preserved original documents remain required.

Lolo: all 50 original room transfers, decoded cells, post-setup backgrounds, initial graphics and normal/lava palettes match original CPU/PPU execution. Every room also has a verified representative edited rebuild. The writer edits only eight terrain/heart codes in existing terrain/heart cells of the 11×11 interior, within each original compressed allocation. Native player/enemy/chest/settings and all protected source bytes remain intact. No relocation, new schema, second editable source, Audio decoder or complete-game recovery is claimed.

Shared validation now separates preserved physical source/inspection checks from adapter-owned projections. Native CHR-backed room data does not also become independent physical CHR donor scenes. Generic ROM projects still enforce their CHR bindings. Native build metadata retains the actual CHR byte count. The native brush hides noneditable codes only when the adapter marks them read-only.

Validation: 220 checks across 16 focused suites pass; 8 supplied-Lolo verification groups pass; 44 retained supplied-Metroid audio checks pass. The source contract protects 141 unchanged bundle inputs and declares exactly four shared input changes plus one new adapter. The public Lolo suite has 12 checks. The previous-reader fixture is pinned to the actual pre-Lolo HTML. No full release gate or real-browser/hardware/listening acceptance is claimed.

Reproduce with `python app/tools/bundle.py --check`, `node app/tests/native-lolo-resources.cjs` and `node reviews/lolo-recovery-1/verify_lolo.cjs /path/to/Lolo.nes /path/to/report.json`. The private report saves hashes/counts only; supplied ROMs and extracted game assets stay outside source and published kits.

Wait for owner feedback or selection before starting another title. Remaining Lolo domains include moving sprites, poses, actor behavior authoring, menus, animation, live HUD, Audio, world travel and whole-game acceptance. The next title leads are retained in the batch ledger and earlier research; do not reset the queue or claim unsupported domains as recovered.
