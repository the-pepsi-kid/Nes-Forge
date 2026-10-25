## Current: Retro Workstation startup repair

The preceding combined HTML aborted during startup before creating Retro Workstation, Resources, Connected Workspace and the metasprite context. The replay panel used the emulator canvas as an insertion anchor after Play view had moved that canvas into a wrapper. The corrected panel anchors to the containing direct child of the emulator view and retains the canvas's existing owner.

Read [the startup correction and reproduction steps](reviews/workstation-startup-fix-1/HANDOFF.md). The delivered HTML is executed in a strict parsed DOM; the earlier missing controls and `NotFoundError` are reproduced, and the repaired appearance, resource browsing, workspace panels, follow selection, metasprite context and replay shortcut are checked through actual control events. This supersedes the earlier permissive startup check. Browser layout/device acceptance remains separate.

## Retro Workstation and native Punch-Out workflows

The supplied Retro Workstation v0.5 UI is ported into modular source, including Resources, Connected Workspace, the metasprite source-context indicator and the supplied native World navigation fixes. Its original opt-in fallback and density choices remain intact. Dedicated Punch-Out physical CHR/fight-palette views now build natively; the prior selection/signature failure is corrected without weakening validation.

Recovered content → Open Glass Joe native replay runs the real original opening/punch/dodge path, plus explicitly RAM-seeded knockdown/count/get-up/count-out/round-two experiments on the existing emulator/Timeline. Both investigated revisions and the available 104-check retained gate have current evidence. Native pose/animation/Audio writing, complete fights and fresh browser/device/hardware acceptance remain open. Read [the current handoff](reviews/punch-out-native-workflows-1/HANDOFF.md), [owner checklist](reviews/punch-out-native-workflows-1/Owner_Checklist.md) and [the updated Punch-Out tutorial](app/docs/projects/PUNCH_OUT.md).

## Historical paused work — 2026-10-24

Read [the pause/resume handoff](PAUSE_HANDOFF_2026-10-24.md) before using this branch. The new native artwork workflow has a known post-import signature failure and is not accepted. Concurrent Glass Joe punch/dodge and seeded knockdown/round-boundary observations are preliminary; replay UI, correct referee-count decoding, both-revision checks and exported artwork verification remain unfinished. The last verified application is recorded in the handoff. Historical passing reports apply to their recorded app hashes.

## Tutorials for each recovered project

Start with [the per-project tutorial index](app/docs/projects/README.md) and [the Punch-Out worked tutorial](app/docs/projects/PUNCH_OUT.md). The [offline handbook](app/docs/PROJECT_HANDBOOK.html) combines the general asset/developer guide, current Punch-Out lesson, earlier available title workflows and a reusable tutorial template. It covers native editing, independent RE/assembly/hex work, modifying standalone HTML and the separate authored-game path. Subsequent title checkpoints require their own method-specific tutorial; older partial guides remain marked for expansion. Documentation inclusion does not establish fresh all-title acceptance.

## Glass Joe fight-context recovery

Use Recovered content → Glass Joe fight reference · Little Mac / referee / HUD. Preview source commands or a bounded player-state path, select an observed frame, then Open selected fight reference. The initial health/hearts/stars/score/clock come from original HUD routines. Little Mac and referee graphics retain their background streams and bank/scroll context; the opponent remains separate source OAM at its configured opening position.

This adds 98 Mac and 47 referee/speech commands and 23 available player-state entries. It is an opening composition/reference and finite zero-input state observation, not a full fight simulation. Reference assets save/reopen; native Mac/referee/CHR/palette/Audio writers remain open. Use Edit native arena layout for supported ROM changes and preview again to include those current native edits. Raw CHR and prior source Animation/Audio tools remain connected.

All 168 preceding application parts are byte-identical; three new modules connect through the existing source, Scene, raster and transactional owners. See `reviews/punch-out-fight-context-1/` for current verification and [the guide](app/docs/NATIVE_RECOVERY_TUTORIAL.md#14-glass-joe-fight-references-mac-referee-and-hud) for the workflow.

## Developer workflows and arena derivative re-import

Read [the developer and asset workflow guide](app/docs/NATIVE_RECOVERY_TUTORIAL.md) for the complete asset map, visual editing, manual RE, 6502 coding, external hex work, direct HTML changes and a worked native codec lesson. Run `node app/docs/native-codec-exercise.cjs` for the synthetic exercise. The HTML starts with a developer map; Punch-Out modules have readable formatting, connection comments and native ownership contracts.

The current app also recognizes bounded Punch-Out arena builds when re-imported through Open ROM / project. This retains supported edits, recovered fighter samples and Audio while preserving existing recipe/write ownership. Malformed streams and unrelated header/code/Audio/CHR modifications remain outside support. Full recovery and native sprite/animation/Audio writing remain unfinished. See `reviews/punch-out-developer-1/` for current evidence.

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

# NES Forge · Punch-Out backgrounds + Audio

Both supplied US revisions now have five static native staging backgrounds, MMC2 latch-aware CHR row projection and bounded native literal edits. Audio installs 84 entries: 75 sounding bank-8 music/effect/DPCM selections, a Startup PCM + native bell audition, six empty slots and two stop controls.

Startup PCM runs the original bank-6 one-shot routine continuously with instruction-clocked DAC writes. Select at least 199 updates to complete it; shorter windows report truncation. It has no PCM tracker model or native sample writer. Other editable Audio excerpts are finite adaptations; unsupported tracker edits refuse native ROM output.

Read reviews/punch-out-1/PUNCH_OUT_REVIEW.md, HANDOFF.md, Owner_Checklist.md and reviews/PROJECT_VERIFICATION.md. Five static backgrounds do not establish complete fights, fighter layers, animation, game logic or full menus. MMC2 scanline timing is approximate and runtime capture explicitly refuses. Browser listening, controllers, hardware acceptance, the complete release gate and alpha promotion remain open.

Build/check: `python3 app/tools/bundle.py --check`. Run the eight available public suites with `python3 reviews/punch-out-1/run_checks.py`. Supplied-input verification uses `python3 reviews/punch-out-1/run_supplied.py /path/to/private-roms`. The historical 386-case/25-suite gate is archived; seventeen historical suite scripts were absent from the restored source snapshot and are not counted as fresh reruns.

The standalone HTML is app/mainline/NES_Forge_2.0.0-alpha.11.html. Source preservation can be checked without earlier Git history using `python3 tools/verify_punch_out_source.py`: the exact predecessor HTML and verified part boundaries are included.

No commercial ROM, recovered music/sample payload, screenshot or source-bearing commercial project is included. Previous checkpoints and main are preserved.
