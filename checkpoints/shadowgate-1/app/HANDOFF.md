# Current checkpoint: Shadowgate static pictures + Audio

Read ../reviews/shadowgate-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. This checkpoint covers 130 static picture slots and the native Audio driver: 14 music requests, 20 SFX and one explicitly unavailable request. Object/door overlays, alternate states, UI/text, puzzle logic, animation, native Audio writing and whole-game/browser/hardware acceptance remain unresolved. Every project must verify both Scene and Audio.

## Earlier handoff

# Current checkpoint: River City street + Audio

Read ../reviews/river-city-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. This checkpoint covers 13 street locations/36 cropped backgrounds and the native Audio driver; 22 special/interior locations remain unavailable. Every project must verify both Scene and Audio.

## Earlier handoff

# Current checkpoint: Lolo Audio

Read ../reviews/lolo-audio-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md first. The owner accepted Lolo Scene appearance and reported its missing audio driver; this correction adds 10 music cues and 24 SFX. Every supplied project must verify Audio as well as Scene before closing a checkpoint. Unsupported drivers and native audio writers remain explicit open items.

## Earlier handoff

# Handoff

Use `python tools/bundle.py`, then `node tests/run_all.cjs` from this directory. The shared Open ROM / project entry stages capability inspection; importing or opening a native map remains explicit. Existing specialized buttons and all five gameplay templates remain available.

See `docs/PROJECT_EXPANSION.md` and `research/project-expansion-1/corpus.json` for ten-input scope, source provenance and limits. Actual private-source tests require the existing supplied Zelda II and Ninja Gaiden ROMs; these must never be distributed. Current reports live in `../reviews/project-expansion-1/`. No Git push or promotion is implied by a local review candidate.
