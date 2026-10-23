# Superseded recovery notes

Current work is documented in `../lolo-recovery-1/HANDOFF.md` and `LOLO_REVIEW.md`. The Metroid source/audio checkpoint was successfully published on `review/metroid-recovery-2-2026-10-22` at `01cf75b0fe7e4fa83a38153e364730cfa00d2639`. Pending-push and approval statements below describe older interrupted attempts and are historical.

# Checkpoint update — Metroid first

Read METROID_REVIEW.md for the current result, scope and owner checklist. The following recovered Mega Man note is historical context; its full-gate expectation and GitHub status predate the Metroid integration. Current GitHub status is owned by GitHub_Checkpoint.json.

# Native Resource Recovery 2 — recovered source and Mega Man backgrounds

The supplied HTML is the authoritative starting candidate. It rebuilds byte for byte from recovered source commit `7c66042c8dde8621f042581421a584bfd959e6ea`; SHA-256 `a1624871c88079644bbdb343149706074a701257fd9e57f97f418ca15967f101`. Its complete source bundle, documented kit, tutorial, 127 preserved original documents, examples, earlier evidence and all 22 ROM input identities were recovered. The supplied HTML and ROM archive are not modified.

The goal remains accurate import → edit → save/reopen → native engine build → play for every supplied title and revision. No title is marked fully recovered. All unfinished domains remain in scope: areas/camera/routes, menus/title/start screens, graphics/palettes, metasprites/animation/timing, collision/interactions, actors/AI/physics/combat, Audio/drivers/events, objects/text/quests/flags, editor relationships, native writing and behavior verification.

## New integrated recovery

Mega Man now opens its original room layouts with their native background tiles and initial palettes through the existing ROM/project intake, Area library, Scene, CHR and native brush. A shared adapter is installed before the existing native resource project owner. There is no separate editable stage store.

- Six physical source banks contain 167 validated room records, each an 8×8 array of 32-pixel blocks. Layout bytes, block quadrants and the four 8-pixel tiles within each quadrant use their native column order. NES palette quadrant bits retain their row order.
- Ten initial stage graphics/palette states expose 320 pointer slots. Of these, 282 materialize into 564 source pages; 38 unused/unresolved slots refer outside the verified block set and refuse materialization. Counts describe catalogs and aliases, not distinct traversed rooms or proven routes.
- Normal and Wily states that share a physical room have one native edit owner. Editing one resident view updates other resident views of that same source record. Each edit is one Undo.
- A block substitution changes its original single source byte. All other bytes, including flags in block definitions, code, Audio, header and unrelated records, remain intact. Block IDs 128–191 are retained rather than truncated to the earlier codecs' 7-bit range.
- Save/reopen, Undo/Redo, native rebuild and derivative reimport preserve the supported edit. Unsupported CHR/palette/actor/Audio/ordinary Scene changes remain savable and refuse native output.

Contra, both Final Fantasy revisions, the earlier partial TMNT writer, Ninja Gaiden, Zelda II and authored workflows remain present. The 17-title ledger now has four title groups with partial integrated background/layout recovery and 13 still awaiting organized resource recovery. Remaining domains are incomplete for all four.

## Use the new Mega Man workflow

1. Open `NES_Forge.html`. Choose **Open ROM / project**, your supplied **Mega Man (U).nes**, **Prepare recovered resources (partial)**, then **Import as new project**.
2. Open **Area library → Investigated source**. Choose an initial stage graphics state, a source room and a page, then **Open selected recovered page** or **Edit scene**. Source-room IDs are pointer-table IDs, not a reconstructed stage itinerary.
3. Use **NATIVE SCREEN BLOCKS** in Scene. Select an existing source block and a cell, or enable **Paint native blocks on Scene**. For a simple reversible change, replace a block at column 1, row 0 with a different block. The brush writes the matching native coordinate, rather than its transposed position.
4. Save with **Save Project As**; reopen and build again. The second page of each resource contains only its final 16 source pixels; the remaining canvas is unused.
5. Import the rebuilt file to verify that the supported layout edit survives. The native recipe also retains edits to catalog pages that are not currently resident in the 64 working Scene slots.

### Playback remains a separate gap

The owner's Mega Man input contains a `DiskDude!` legacy header whose declared mapper is 66. Original loader research explicitly selects UxROM wiring while executing the owner's unchanged bytes. The application does not change the source header or ordinary emulator mapping. A successful native rebuild therefore does **not** establish that **Build & Run** plays this input correctly. Mapper interpretation and full gameplay remain open acceptance work; do not silently repair the header or call playback verified.

## Verification and reproduction

`MegaMan_Verification.json` records seven passing private verification groups: all ten initial pattern/palette states against original 6502 loaders; all native block assemblies; all recovered room cells against native pointer/address computation; every available projected page; intake/shared-owner history/save/reopen/reimport; the rebuilt byte read by the original loader at its intended coordinate; and persisted refusal of unsupported graphics edits.

The first research-only run deliberately preceded application integration and could not yet import a Mega Man native resource project. A subsequent test attempt called a nonexistent test helper after six successful groups. Both records are retained. The helper was corrected; no passing result is inferred from those attempts.

The full public gate retains the previous 138 suites / 2,288 checks and adds 14 checks in two suites. Consult the new gate's actual `Summary.json` for its result. Never substitute the preceding gate's result for the current candidate.

```sh
python app/tools/bundle.py --check
cd app
FORGE_TEST_WORKERS=1 node tests/run_all.cjs mainline/NES_Forge_2.0.0-alpha.11.html ../reviews/reproduced-resource-2-gate
```

Private verification uses the owner's supplied inputs without publishing ROMs, screenshots, source-bearing projects, palettes or graphics banks:

```sh
FORGE_CORPUS_DIR=/absolute/path/to/owner/roms node reviews/native-resource-recovery-2/verify_megaman.cjs
FORGE_PRIVATE_ROMS=/absolute/path/to/owner/roms node reviews/native-resource-recovery-1/verify_native.cjs
FORGE_CORPUS_DIR=/absolute/path/to/owner/roms node reviews/native-resource-recovery-2/verify_supplied.cjs
```

Mock-DOM checks do not establish real browser layout, picker/download behavior, physical controllers, touch, listening or hardware acceptance. No browser executable is installed in this environment; those checks stay unfilled.

## Continue the original set

Use `Capabilities.json` and the retained `Expanded_Set_Leads` research rather than restarting from raw CHR sheets. Metroid's five area pointer tables, Lolo's 50 room streams, River City Ransom's exact-input editor and Kirby PRG 1's payload/disassembly comparison are concrete next leads. Double Dragon, Shadowgate and the other remaining titles stay in scope. Existing Contra alternate states, TMNT areas beyond its first side-view table, Final Fantasy overworld integration and all unfinished domains also remain work.

Preserve exact revision gates, protected spans, canonical ProjectStore/Scene ownership, native-loader comparisons, ordinary schema 12 and reader ceiling 16. Older candidates reject the new adapter rather than silently discard it. Do not promote research leads, captures or physical CHR sheets to complete-game support.

## GitHub recovery status

Read and push-capable repository access was verified. The previous approved source push had not produced a reachable source commit at the recovered baseline SHA. A new review-checkpoint upload was attempted; automatic approval review rejected it because trusted authorization for the recovered payload and external destination was not established. No upload or branch creation was completed. Obtain explicit current authorization for this recovered source and `the-pepsi-kid/Nes-Forge` before retrying. Source recovery and downloadable artifacts are unaffected.
