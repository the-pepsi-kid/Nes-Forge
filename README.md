# NES Forge — Native Map Recovery candidate

**2.0.0-alpha.11 / native-map-1**, schema 12. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

The authorized A2 continuation adds source-backed native map and collision recovery through the existing framework. The independent Double Action Blaster Guys input has 52 configurations referencing 22 distinct maps; one resource fits the finite static Empty/Solid conversion subset. Three additional map definitions found during source research are unreferenced and are not guessed into production discovery.

Backgrounds and maps share `RENativeScene` and one recovery panel. `REMethods` owns discovery, `ProjectStore.appendScene` owns the guarded import and Undo, and the existing detached compiler builds the separate single-room adaptation. No project schema, runtime emitter, recipe algorithm or gameplay template changed. Exact A1 background report/project/build/import/save/Undo/Redo behavior is retained for the declared parity inputs.

Fresh clean-extraction gate: **1694/1694 cases across 84 suites**, retaining all **1,617 parent cases / 78 suites**. Every one of **5,351 staging payload hashes** was verified against the archive, clean extraction and unchanged working inputs. The nine existing current example ROMs, fourteen projects and six recipes remain byte-identical; only four build-receipt HTML identity fields changed.

All 13 browser runners have current reports: **13 blocked with zero checks; 0 passed, with 0 measured checks in total**. VM and original/generated CPU/PPU results do not establish browser layout/native dialogs, full original-game boot, independent-emulator, listening, phone/controller or physical NES acceptance. Owner acceptance remains pending; the candidate is not promoted or published.

Read `app/docs/NATIVE_MAP_RECOVERY.md`, its checklist and `app/examples/RE_Native_Map/`. Open `DABG_Static_Map.nesforge.json` to build the recovered floor with an authored test player, or `DABG_Static_Map_Floor_Opened.nesforge.json` for the canonical collision edit that lets the player fall. The original native collision routines and command edits have separate CPU evidence; generated-ROM checks verify editable Forge collision and Save As/reopen/rebuild behavior.

Conversion covers the visible 16×15 native metatile region as 32×30 Forge cells, using the verified PB53 CHR-RAM upload, reset palette and raw command geometry before PrettyLevel. Native decoration, scrolling, one-way/hazard/stateful semantics, actors, goals, audio and original physics remain outside this subset. Import appends an excluded editable scene. The separate playable project supplies an authored validation player and existing Forge movement; no native encoder, ROM patch or whole-game reconstruction is claimed.

The application parent is `6cde192eee757e677376c319045944e17c3395fa`. The separate input-research checkpoint is `db13bd14c21deff5e20c110894ecbe82ffd97b75`; its source, toolchain, original-code evidence and upstream notices remain under `research/native-map-intake-1/`. The application license remains UNDECIDED; independent inputs retain their upstream notices.

This completes the bounded A2 implementation and automated gate, with owner/browser acceptance still open. Continue remaining Audio/fidelity/listening, source-migration/gameplay/runtime and comprehensive manual requirements before integrated Hosted/network/wallet/deck work. The full roadmap is not complete.

Run `python3 tools/verify_reference.py` for delivered-app verification, or `--full-gate` for a disposable reproduction. `tools/package_source.py` packages the clean committed source with portable Git history and retained refs. Exact identities and outcomes are in CANDIDATE.json and the clean-extraction proof.
