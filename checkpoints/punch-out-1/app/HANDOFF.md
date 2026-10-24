## Punch-Out player background correction

The owner’s scrambled live HUD/crowd/ring was reproduced with the untouched ROM. The native arena writer was not required to trigger it. Forge’s MMC2 renderer fetched only visible background tiles; Punch-Out uses a tile beyond the visible edge to select the correct graphics bank for the next row. The renderer now performs all 34 background pattern fetches per scanline while drawing only visible pixels. Sprite-only rendering also retains those background bus reads.

Open `NES_Forge_Punch_Out_Player_Fix.html` and load the saved Forge project, then Build & Run again. No re-import or lost arena edits are required. Native arena encoding and capacity limits are unchanged. This corrects the reproduced background-bank corruption; the broader CPU/sprite/raster timing model remains approximate and MMC2 runtime capture still refuses.

Both US revisions reproduce the prior failure on the untouched ROM. The same native state now matches all 14,336 checked HUD pixels against original bank-0 patterns (previous player: 11,501 mismatches). The retained 90 checks plus 14 synthetic offscreen-fetch checks pass. Original-engine build/save/reopen/Undo/Redo/Audio checks are rerun on this HTML. See `reviews/punch-out-arena-runtime-1/` for evidence. Only the MMC2 renderer changes among the preceding 168 bundled inputs. No ROM, decoded art, screenshot or commercial source project is distributed.

## Punch-Out arena native rebuilding

The recovered arena now supports ordinary Scene tile placement and attribute palette-ID edits in the original engine. Open a saved project (including a project already painted in the preceding HTML), use **Recovered content → Open ring and audience**, then **Check arena build** and **Build & Run**. Save Project As preserves the original ROM and the edited canonical Scene. Build & Run starts the original game; enter a fight to inspect the shared arena layout.

The writer recompresses the two setup pages within their original 381-byte data area and updates four owned stream pointers. Busy patterns can exceed capacity and refuse with a size message; no edits are silently dropped. CHR artwork, palette colors, sprites, collision and Audio changes still have no corresponding native writer. $FD/$FE are CHR-latch tiles; edits involving them receive a live-graphics warning. HUD/player drawing can overwrite cells during play.

See `reviews/punch-out-arena-build-1/HANDOFF.md`, `Build_Verification.json`, `Source_Preservation.json` and `gate/Summary.json`. The source remains one ROM plus canonical Scene edits, with the existing native build and project lifecycle owners. Ordinary schema 12 / reader ceiling 16 remain unchanged. No commercial ROM or decoded asset payload is distributed.

## Punch-Out arena recovery checkpoint

The missing fight background was outside the five intro/staging contexts. This additive checkpoint executes original arena programs 1 and 2 on a bounded private PPU bus, then assembles their two nametables at NT1 / scroll $B0 with setup CHR bank 0 and the Glass Joe setup palette. A named **Arena · ring and audience · source setup** Scene is appended on fresh import. Earlier saved projects use **Recovered content → Open ring and audience**, in one Undo transaction.

This is a static setup reference. Health-bar fields retain original setup placeholders; live scores/clock, moving camera, Little Mac, opponent and referee layers remain separate. The original 163 application inputs remain unchanged. Existing background recipes, boxer/metasprite/state tools and Audio are retained; unsupported arena edits save but refuse native ROM building. The original source ROM remains the only native owner.

See `reviews/punch-out-arena-1/HANDOFF.md`, `Arena_Verification.json`, `Source_Preservation.json` and `gate/Summary.json`. No commercial ROM, decoded art, sample, screenshot or source-bearing project is distributed.

## Punch-Out state excerpts checkpoint

The current candidate adds original state/shape execution and explicit timed recovery into Animation. The 365-state matrix per revision yields 119 sprite-size-changing excerpts and establishes 81 previously contextual pose entries. Source sound requests link to the existing Audio library. All 160 preceding runtime modules remain byte-identical. These are bounded observed state paths, not complete fights or native animation/Audio writers. See `reviews/punch-out-states-1/HANDOFF.md` and its fresh verification reports.


## Punch-Out source content checkpoint

The current candidate adds the source-content browser and materializes five preceding background pages plus representative sprite sources/placements/metasprites for 14 fight configurations. All 32 raw CHR banks remain available. Full recovery is **not complete**: animation context, Little Mac/referee states, transitions/collision/AI and native sprite/CHR/Audio writers remain open. See `reviews/punch-out-content-1/HANDOFF.md`, the fresh content/lifecycle evidence and 90-check gate. All 157 original application inputs remain byte-identical.

# Current checkpoint: Punch-Out static backgrounds + Audio

Read ../reviews/punch-out-1/HANDOFF.md and ../reviews/PROJECT_VERIFICATION.md. Both supplied US revisions now have five static source backgrounds and the original bank-8 Audio driver. Whole-game recovery, fighter sprites, dynamic states, native Audio writing, MMC2 runtime capture and owner listening/hardware acceptance remain unresolved. The bank-6 startup PCM is cataloged and auditionable, with PCM tracker editing still unavailable. Every project must verify both Scene and Audio.

## Earlier handoff

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
