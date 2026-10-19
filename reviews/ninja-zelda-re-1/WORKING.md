# Ninja Gaiden / Zelda II investigation

Branch: `implementation/ninja-zelda-re-2026-10-19`.
Parent: `387b99b5f4bec1e05568482c15ef5bbea1ae4527`.

Authorized goal: expand both supplied revisions across RE domains and verify actual functionality. Completion of this checkpoint must not be represented as complete game behavior reconstruction.

Work in progress:

- Ninja Gaiden: native room graphics/metatiles, source palettes/CHR mapping, enemy/lantern placement, entrances, actor parameters/dispatch, shared animation and sprite catalogs.
- Zelda II: native side-view scene table catalog, original bounded 6502 construction routines, object commands, enemy records, connections and graphics/behavior source evidence.
- Common: explicit coverage/unknowns, source addresses and linked inspection/export in the standalone app.
- Reproduced owner screenshot: Zelda II title at frame 835 has corrupted ground/tree. At frame 401 native bank 5 writes `$2006=$2A,$00` during visible line 143. Existing frame runner freezes vertical scroll/nametable for all 240 lines; the capture path shares that input. Validate a targeted visible-address-reload correction and protect all other behavior.

Research references are pinned in `app/docs/SPATIAL_RE.md`. Ninja source assembled with the pinned cc65 toolchain and matched its declared whole-ROM SHA-1. Private analysis/assembled ROMs stay outside version control. Zelda's source address comments are leads and must be checked against the supplied bytes.

No new completion or test-pass claim is made by this working note.
