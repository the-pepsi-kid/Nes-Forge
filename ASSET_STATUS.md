> Public build profile: native decoders use your local source ROM. Private captured Castlevania project templates and embedded raw APU/CHR/OAM evidence are excluded; captured-asset counts in this inventory describe separately supplied recovery material. See [REVIEW.md](REVIEW.md) for the publication profile and fresh checks.

# NES Forge · Per-ROM asset status

**November 16, 2026 · Integrated Review 5**

22 tracked titles / 28 revisions: 14 titles have partial native recovery, Battletoads supplies observed copies, and 7 titles remain unresolved. No complete native game reconstruction is accepted.

Direct RE ROM import now exposes the retained native catalog in Resources → ROM library. Zelda II shows all 30 Link poses and 567 room slots; available rooms and poses open in the normal editors. Ninja Gaiden exposes 202 poses and 83 scripts, with action_0F, action_10 and action_59 explicitly blocked. Other installed native resource adapters expose their full retained room/page catalogs through the same entry point. This does not add missing native AI or native encoders.

Import as new project replaces the active project. The recovered library travels with Save Project / reopen; it does not accumulate other ROMs globally. Editable working limits remain 64 Scenes, 32 Worlds, 256 poses and 256 animations. Source catalog counts are separate from the currently opened editable copies.

| ROM | Maps / Scenes | Collision | Audio | Native output |
|---|---|---|---|---|
| 1943 | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Adventures of Lolo | 50 native room backgrounds (recorded installed adapter scope). | Complete native actor/collision interaction rules are unresolved. | 10 music cues and 24 SFX; installed native audition and finite tracker conversion. | Fixed-capacity native terrain/heart substitutions; no native audio writer. |
| Battletoads | 2 observed intro frames, at 1,100 and 1,500, preserved as editable Scene copies. | No recovered gameplay collision data. | One 30-second observed title transcription: 182 notes, 29 populated patterns (30 total including the template), 6 tracker instruments. This is not a native audio-driver catalog. | Authored asset/project copies only; no original-engine writer. |
| Castlevania | Per US PRG revision: 6 captured Scenes plus 3 decoded Stage 01 courtyard background pages. | No recovered native collision system or editable collision writer. | Per revision: 53 catalog requests, 49 playable (including 15 three-channel sequence candidates), 4 controls. Each supplied audio pack has 49 editable excerpts. | Recovered assets can be used in authored Forge games. No original Stage/score writer. |
| Castlevania II | 79 source map/category views from the supplied extraction. | Map classes are evidence. Conditional blocks and native collision remain unresolved. | 58 catalog entries: 9 music candidates, 46 effect candidates and 3 DPCM descriptors. The supplied pack has 55 editable excerpts; one effect edge remains outside the bounded decoder. | Read-only native map inspection and editable audio excerpts. No native resource writer. |
| Contra | 144 source slots; 126 available initial-state views / 133 pages; 18 unavailable graphics states. | New pack: 70 reference grids classifying open, floor, water and solid. Indoor base levels and dynamic bridges/actors use different paths. Native project tile properties remain unassigned. | No installed revision-specific native audio decoder. | Bounded native block-ID substitutions within existing capacity. Collision references are not a collision writer. |
| Double Dragon | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Final Fantasy | 61 unique standard map layouts × 2 palette contexts = 122 resource views / 2,440 pages. | No recovered native collision/movement editor. | No installed revision-specific native audio decoder. | Bounded native block substitutions for the two recorded US revisions; unsupported fields remain blocked. |
| Gun Smoke | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Hudson's Adventure Island | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Kid Niki - Radical Ninja | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Kirby's Adventure | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Kung Fu | No game-specific level/scene decoder. | Unresolved. | No installed revision-specific native audio decoder. | No game-specific native writer. |
| Mega Man | 320 initial stage-state pointer slots; 282 materializable views / 564 pages backed by 167 physical room layouts. | New pack: 282 reference grids with open, solid, ladder and special classes. Classes 3, 5 and 6 have untraced effects. These grids are separate from the native project, whose tile properties remain unassigned. | No installed revision-specific native audio decoder. | Native one-byte block substitutions, with shared normal/Wily ownership and protected spans. |
| Mega Man 2 | 616 native screen-slot/map records in the supplied extraction. | Stage-dependent native collision/category evidence is partial; it is not a complete behavior reconstruction. | 67 selectors: 33 music selectors (24 unique music headers) and 34 effects. The pack provides 67 editable excerpts. Aliases and short jingles are retained. | Map inspection and editable audio copies. No native resource writer. |
| Metroid | 193 source room slots / 191 physical room records across five areas. | Native collision-rule editing is unresolved. | 37 entries: 12 music requests, 24 SFX and one reset/control. Native audition and finite tracker conversion are available; this particular supplied pack contains the catalog/report but no exported score projects. | Single-byte native structure-index replacement. No native audio writer. |
| Mike Tyson's Punch-Out!! | Both US revisions: ring/audience recovery plus 5 static background staging contexts. | No complete hitbox/combat response editor. | Per revision: 84 entries covering music selectors, SFX, empty/control requests and startup PCM. Each supplied pack has 68 finite editable excerpts. DPCM/PCM audition and tracker conversion have different limits. | Verified physical CHR/palette writers, supported pose positions and selected Glass Joe parameters. Full fight and audio writing remain unavailable. |
| Ninja Gaiden | 48 decoded room records and 48 source map views. | Native ground/category evidence is partial. The supplied 48 room projects have no assigned nonzero tile properties; source terrain categories do not establish native player physics. | 85 command entries, including one control; 69 distinct header pointers. Latest pack supplies 66 editable excerpts. | Editable authored room/art copies. Native inverse writers for the recovered room/actor/animation domains remain pending. |
| River City Ransom | 36 cropped street segments in 13 locations; 22 special/interior locations unavailable. | Native street collision response is unresolved. | 63 entries: 19 music requests (18 unique headers), 43 effects and one control. Latest pack supplies 62 excerpts. | Shared native physical-tile ID substitutions. No native audio writer. |
| Shadowgate | 130 static picture-table slots. | Object hit/interaction regions are unresolved. | 35 catalog requests: 14 music (13 unique headers), 20 SFX and one unavailable request. Supplied pack contains 34 excerpts. | Bounded native picture-tile substitutions. No native audio writer. |
| Teenage Mutant Ninja Turtles | 20 Area 1 side-view layouts (recorded installed adapter scope). | No complete native collision-rule recovery. | No installed revision-specific native audio decoder. | Bounded native block substitutions in the supported Area 1 scope. |
| Zelda II | 4 overworld maps; 258 unique decoded rooms across 567 table slots (303 aliases, 6 unavailable). | New pack: 258 solid/open reference grids, 75,901 marked solid cells. All 258 room projects contain nonzero tile properties; 51 tile variants were split to avoid mixed collision use. Full native collision response and movement remain incomplete. | 75 catalog entries: 28 nonempty music requests, 12 empty requests, 35 effects. Latest pack supplies 60 editable excerpts. | Bounded native overworld terrain, location and supported Scene edits. No native audio writer or complete behavior writer. |

Audio counts are source requests/selectors, with aliases and controls retained. Native decoder support does not imply complete gameplay recovery.

## 1943

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- 1943 (U).nes — SHA-256 `2fd596ac4563b910a4d0a36d4a3658910fcfa822afd4f78bd62f73552e17ea00`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Adventures of Lolo

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 50 native room backgrounds (recorded installed adapter scope).
- **CHR / palettes / poses:** Room background tiles and palettes; moving actors, animation and HUD remain incomplete.
- **Actors / objects / behavior:** Enemy behavior, world travel and complete gameplay rules remain incomplete.
- **Collision:** Complete native actor/collision interaction rules are unresolved.
- **Audio:** 10 music cues and 24 SFX; installed native audition and finite tracker conversion.
- **Native writing:** Fixed-capacity native terrain/heart substitutions; no native audio writer.
- **Current note:** No original Lolo cartridge was in the current 14-source corpus. Adapter scope comes from the installed code/ledger and retained tests.

**Recorded revisions:**

- Adventures of Lolo (U) [!].nes — SHA-256 `914c676959612fc6738a297b6b799dff848e43de4e9bd3c9f3c6783efd059e01`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Battletoads

**Status:** observed copies.

- **Where in Forge:** Supplied extraction ZIP → observed intro captures / Audio project. Direct RE import does not recover gameplay stages or a native sprite/animation catalog.
- **Scenes / World:** 2 observed intro frames, at 1,100 and 1,500, preserved as editable Scene copies.
- **CHR / palettes / poses:** Captured CHR-RAM, BG/sprite palette and OAM state for those frames. No native level decoder or complete sprite/animation catalog.
- **Actors / objects / behavior:** Captured sprite placements are not recovered game entities, AI or animation sequences.
- **Collision:** No recovered gameplay collision data.
- **Audio:** One 30-second observed title transcription: 182 notes, 29 populated patterns (30 total including the template), 6 tracker instruments. This is not a native audio-driver catalog.
- **Native writing:** Authored asset/project copies only; no original-engine writer.
- **Current note:** The supplied README reports black video/silence when gameplay starts in the Forge emulator. That is a pack-author observation, not a fresh gameplay reproduction in this review. No original Battletoads ROM is held here to independently verify the declared source fingerprint.

**Recorded revisions:**

- Battletoads (U).nes — SHA-256 `677330f45a1249d24d003792a4674c93f836be57fd18b57125306efe82f3cda8`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Castlevania

**Status:** partial native.

- **Where in Forge:** Supported recovery intake loads the bounded captured Scene/pose/animation set. Resources also exposes courtyard source pages, CHR upload groups, native Audio and retained execution evidence. This is a bounded recovery, not every stage.
- **Scenes / World:** Per US PRG revision: 6 captured Scenes plus 3 decoded Stage 01 courtyard background pages.
- **CHR / palettes / poses:** Per revision: 9 editable metasprite poses, 6 animation records, 23 distinct courtyard 32px metatiles / 144 placements; 12 CHR-RAM upload lists with 26 source transfers.
- **Actors / objects / behavior:** Observed pose/animation assets are editable. Original enemy behavior, full animation state rules and collision are incomplete.
- **Collision:** No recovered native collision system or editable collision writer.
- **Audio:** Per revision: 53 catalog requests, 49 playable (including 15 three-channel sequence candidates), 4 controls. Each supplied audio pack has 49 editable excerpts.
- **Native writing:** Recovered assets can be used in authored Forge games. No original Stage/score writer.
- **Code / RAM evidence:** Earlier execution evidence traces 649 APU writes to 12 original CPU instruction sites per revision.
- **Project-copy boundary:** Captured Scenes/poses and decoded courtyard pages are bounded evidence. They do not include every stage, the castle interior or complete scrolling/transition logic.

**Recorded revisions:**

- Castlevania US PRG 0 — SHA-256 `55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8`.
- Castlevania US PRG 1 — SHA-256 `0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53`.

**Source verification:** 2 revision(s) inspected in the current held-source corpus.

## Castlevania II

**Status:** partial native.

- **Where in Forge:** Supplied extraction ZIP → native map/category views and Audio project documents. Direct generic ROM investigation does not turn these map records into full canonical Scene/actor/pose libraries. A supported native Audio driver is linked from Resources; source spatial inspection and archive map views remain separate workflows.
- **Scenes / World:** 79 source map/category views from the supplied extraction.
- **CHR / palettes / poses:** Native layout/table evidence and raw tile categories. Original runtime graphics contexts and conditional substitutions remain incomplete.
- **Actors / objects / behavior:** Actor behavior, sprite animation, collision response and gameplay/event links are unresolved.
- **Collision:** Map classes are evidence. Conditional blocks and native collision remain unresolved.
- **Audio:** 58 catalog entries: 9 music candidates, 46 effect candidates and 3 DPCM descriptors. The supplied pack has 55 editable excerpts; one effect edge remains outside the bounded decoder.
- **Native writing:** Read-only native map inspection and editable audio excerpts. No native resource writer.

**Recorded revisions:**

- Castlevania II · investigated US revision — SHA-256 `f045d72683d3156555eccbb56090888f03a15e5b25e59db49dca7a87330472d3`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Contra

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 144 source slots; 126 available initial-state views / 133 pages; 18 unavailable graphics states.
- **CHR / palettes / poses:** Initial stage background tiles and palettes. Palette cycling, sprites and dynamic graphics/events are incomplete.
- **Actors / objects / behavior:** Enemy placement/behavior and stage rules are unresolved in the installed native adapter.
- **Collision:** New pack: 70 reference grids classifying open, floor, water and solid. Indoor base levels and dynamic bridges/actors use different paths. Native project tile properties remain unassigned.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** Bounded native block-ID substitutions within existing capacity. Collision references are not a collision writer.
- **Current note:** The new grids are now browsable in the main picker; they are not applied automatically to game physics.

**Recorded revisions:**

- Contra (U).nes — SHA-256 `26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Double Dragon

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Double Dragon (U).nes — SHA-256 `eaeef33de58b18f3dcfa283c48c1fba7b70b3e522c84dee000cc8c1110156982`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Final Fantasy

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 61 unique standard map layouts × 2 palette contexts = 122 resource views / 2,440 pages.
- **CHR / palettes / poses:** Standard-map background tile definitions and normal/room palette states.
- **Actors / objects / behavior:** Actor movement, events, battle systems, menus and overworld reconstruction remain unresolved.
- **Collision:** No recovered native collision/movement editor.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** Bounded native block substitutions for the two recorded US revisions; unsupported fields remain blocked.

**Recorded revisions:**

- Final Fantasy (U) [a1].nes — SHA-256 `fafb45c017ebfcc1af8149c2a61001ea2b0b134c1cbf0139c10b0597ba46c47c`.
- Final Fantasy (U).nes — SHA-256 `d360beeee19a69d1c92d02292167c57f2d3ca8405b79101fc8c2f39dea549667`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Gun Smoke

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Gun Smoke (U).nes — SHA-256 `4ad9629a2bacc158a7f50975869c7dfe533567ae399a5bdc5df2240286df259f`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Hudson's Adventure Island

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Hudson's Adventure Island (U).nes — SHA-256 `b5cb5eb40e5926403be364bd151ef98fa433a5aa82b24470e483f2fd90f48956`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Kid Niki - Radical Ninja

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Kid Niki - Radical Ninja (U) (PRG 0).nes — SHA-256 `01eae135185618291dca0fc0b19861a38c8e2af7dfb0efba4642ead612f79aaf`.
- Kid Niki - Radical Ninja (U) (PRG 1) [!].nes — SHA-256 `327481ad7cbcd120ac4d139bfee9971498d0878101506e7ed25f840adc2752df`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Kirby's Adventure

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Kirby's Adventure (U) (PRG 0).nes — SHA-256 `102309c351308638bdbfa13e96cae55b8a95b30429b561b41c651807fb905789`.
- Kirby's Adventure (U) (PRG 1) [!].nes — SHA-256 `34afcebaf04d57a42c2436fb95b933c7841e1621f1dc3be482380baef33ec3d8`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Kung Fu

**Status:** unresolved.

- **Where in Forge:** Generic RE investigation preserves the source and physical CHR when present. A title-specific room/actor/animation library is not recovered; a raw tile sheet is not a reconstructed Scene.
- **Scenes / World:** No game-specific level/scene decoder.
- **CHR / palettes / poses:** Preserved container and physical PRG inspection. Stored CHR-ROM can be inspected when present; runtime CHR-RAM still needs decoding or capture.
- **Actors / objects / behavior:** No recovered actor, pose, animation, menu, event or object catalogs.
- **Collision:** Unresolved.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** No game-specific native writer.

**Recorded revisions:**

- Kung Fu (U) [a1].nes — SHA-256 `9e8383b3bd99ccf9bc972c57d37599604e969aebab7a8f0c9428112fafb6b82d`.
- Kung Fu (U).nes — SHA-256 `ba57badd19db565481c5d9d7f86bfa0a919725a9661144d69925f501c9a0f4a1`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Mega Man

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 320 initial stage-state pointer slots; 282 materializable views / 564 pages backed by 167 physical room layouts.
- **CHR / palettes / poses:** Stage-dependent initial background CHR, block definitions and palettes. Unused slots, dynamic objects and changing graphics contexts remain incomplete.
- **Actors / objects / behavior:** Moving platforms, disappearing blocks, enemies, boss doors, sprite animation and stage-travel rules are unresolved.
- **Collision:** New pack: 282 reference grids with open, solid, ladder and special classes. Classes 3, 5 and 6 have untraced effects. These grids are separate from the native project, whose tile properties remain unassigned.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** Native one-byte block substitutions, with shared normal/Wily ownership and protected spans.
- **Current note:** 282 available views include aliases/context changes; this does not mean 282 distinct playable levels.

**Recorded revisions:**

- Mega Man (U).nes — SHA-256 `1c8885892051d79db757746e2281f417cd5b156a86988b0010ad95d7bd4276c5`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Mega Man 2

**Status:** partial native.

- **Where in Forge:** Supplied extraction ZIP → native map/category views and Audio project documents. Direct generic ROM investigation does not turn these map records into full canonical Scene/actor/pose libraries. A supported native Audio driver is linked from Resources; source spatial inspection and archive map views remain separate workflows.
- **Scenes / World:** 616 native screen-slot/map records in the supplied extraction.
- **CHR / palettes / poses:** Native screen/category evidence with initial graphics contexts; complete actor/platform placement remains unresolved.
- **Actors / objects / behavior:** Actor and moving-platform placement, stage-transition graph and native movement rules remain incomplete.
- **Collision:** Stage-dependent native collision/category evidence is partial; it is not a complete behavior reconstruction.
- **Audio:** 67 selectors: 33 music selectors (24 unique music headers) and 34 effects. The pack provides 67 editable excerpts. Aliases and short jingles are retained.
- **Native writing:** Map inspection and editable audio copies. No native resource writer.
- **Current note:** The supplied extraction documents a 16-byte header substitution. Its payload match is verified separately from the whole-file fingerprint.

**Recorded revisions:**

- Mega Man 2 · investigated US revision — SHA-256 `49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Metroid

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 193 source room slots / 191 physical room records across five areas.
- **CHR / palettes / poses:** Ordered native background structures, initial CHR and palettes, including overlap attribute behavior.
- **Actors / objects / behavior:** Doors, world connections, enemies, items and player/collision rules remain incomplete.
- **Collision:** Native collision-rule editing is unresolved.
- **Audio:** 37 entries: 12 music requests, 24 SFX and one reset/control. Native audition and finite tracker conversion are available; this particular supplied pack contains the catalog/report but no exported score projects.
- **Native writing:** Single-byte native structure-index replacement. No native audio writer.

**Recorded revisions:**

- Metroid (U).nes — SHA-256 `c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Mike Tyson's Punch-Out!!

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** Both US revisions: ring/audience recovery plus 5 static background staging contexts.
- **CHR / palettes / poses:** Latch-aware CHR, fight palettes, source-linked boxer poses, bounded pose-position editing and dedicated physical art writers.
- **Actors / objects / behavior:** Selected Glass Joe count/health parameters and bounded state excerpts. Complete opponent AI, fight reconstruction and native animation-sequence writing remain incomplete.
- **Collision:** No complete hitbox/combat response editor.
- **Audio:** Per revision: 84 entries covering music selectors, SFX, empty/control requests and startup PCM. Each supplied pack has 68 finite editable excerpts. DPCM/PCM audition and tracker conversion have different limits.
- **Native writing:** Verified physical CHR/palette writers, supported pose positions and selected Glass Joe parameters. Full fight and audio writing remain unavailable.
- **Current note:** Native image/parameter edits have constrained byte-diff and save/reopen evidence; this does not establish all fight mechanics.

**Recorded revisions:**

- Mike Tyson's Punch-Out!! (U) (PRG 0).nes — SHA-256 `0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952`.
- Mike Tyson's Punch-Out!! (U) (PRG 1).nes — SHA-256 `22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e`.

**Source verification:** 2 revision(s) inspected in the current held-source corpus.

## Ninja Gaiden

**Status:** partial native.

- **Where in Forge:** Direct ROM → RE Import → Resources → ROM library. Choose Scene / Metasprite / Animation / Native actor record / CHR / Audio. Available room, pose and supported script entries open working copies in the main editors. Maps and read-only code/parameter evidence retain their source inspection routes.
- **Scenes / World:** 48 decoded room records and 48 source map views.
- **CHR / palettes / poses:** 32 physical CHR-bank records; room-specific initial palettes; 202 source pose records and exported pose-fragment previews.
- **Actors / objects / behavior:** 44 actor table records, 423 room enemy spawn placements, entrances and lantern records. Enemy AI, hitboxes and complete transition conditions remain incomplete.
- **Collision:** Native ground/category evidence is partial. The supplied 48 room projects have no assigned nonzero tile properties; source terrain categories do not establish native player physics.
- **Audio:** 85 command entries, including one control; 69 distinct header pointers. Latest pack supplies 66 editable excerpts.
- **Native writing:** Editable authored room/art copies. Native inverse writers for the recovered room/actor/animation domains remain pending.
- **Code / RAM evidence:** 1,992 symbol records and 89 RAM labels. Native catalog has 83 shared animation/script records; a separate spatial decoder exposes the first 13 Ryu action scripts. These counts have different scopes.
- **Project-copy boundary:** Resources → ROM library exposes 48 rooms, 202 source poses and 83 timed scripts after direct RE import. Supported records open as canonical editable working copies with room-specific graphics context; three unresolved scripts stay blocked. The supplied pack separately contains 48 room projects with 193 split Scene pages / 48 Worlds and 80 editable animation projects. No automatically translated Gameplay Actors, AI, hitboxes or original gameplay state transitions are added.
- **Current note:** Three source scripts failed export: action_0F and action_10 have unresolved sprite-table contexts; action_59 references an unrecovered pose. The intake notes preserve these gaps. The earlier screenshot placement issue was resolved by using the correct ROM revision.

**Recorded revisions:**

- Ninja Gaiden · investigated US revision — SHA-256 `07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## River City Ransom

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 36 cropped street segments in 13 locations; 22 special/interior locations unavailable.
- **CHR / palettes / poses:** Original initial street background CHR and palettes with shared physical tile ownership.
- **Actors / objects / behavior:** HUD, actors, sprite animation and full gameplay logic remain unresolved.
- **Collision:** Native street collision response is unresolved.
- **Audio:** 63 entries: 19 music requests (18 unique headers), 43 effects and one control. Latest pack supplies 62 excerpts.
- **Native writing:** Shared native physical-tile ID substitutions. No native audio writer.

**Recorded revisions:**

- River City Ransom (U).nes — SHA-256 `b95f8def04c0012604b7cc68cf4ed8f49b2dfe4beda6182051de4b2423bea7b1`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Shadowgate

**Status:** partial native.

- **Where in Forge:** For the supported exact ROM revision: RE Import → Resources → ROM library → Scene exposes the full installed static resource/page catalog. Edit opens its native page owner; CHR/palettes follow the selected page. A matching native Audio library link appears where a driver decoder exists. Punch-Out art, pose, state and fight tools retain their separate bounded native writers.
- **Scenes / World:** 130 static picture-table slots.
- **CHR / palettes / poses:** Original background CHR and standard palettes. Object/door overlays and alternate picture states remain unresolved.
- **Actors / objects / behavior:** Text, puzzle logic, flags, objects and door interactions remain incomplete.
- **Collision:** Object hit/interaction regions are unresolved.
- **Audio:** 35 catalog requests: 14 music (13 unique headers), 20 SFX and one unavailable request. Supplied pack contains 34 excerpts.
- **Native writing:** Bounded native picture-tile substitutions. No native audio writer.

**Recorded revisions:**

- Shadowgate (U).nes — SHA-256 `f3eeeefb3a1359cf45ad8a5033525ae4be050b9fb9cbe2105e09637aad00a9be`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

## Teenage Mutant Ninja Turtles

**Status:** partial native.

- **Where in Forge:** The installed exact-revision adapter creates the 20 recovered Area 1 pages in the ordinary Scene library; Resources links their source table. Other areas and actor/animation data remain unresolved.
- **Scenes / World:** 20 Area 1 side-view layouts (recorded installed adapter scope).
- **CHR / palettes / poses:** Initial Area 1 background CHR and palettes; remaining areas are unresolved.
- **Actors / objects / behavior:** Actors, native collision and complete game rules are unresolved.
- **Collision:** No complete native collision-rule recovery.
- **Audio:** No installed revision-specific native audio decoder.
- **Native writing:** Bounded native block substitutions in the supported Area 1 scope.
- **Current note:** No original TMNT cartridge or extraction pack was in this review corpus. Scope is recorded, not freshly re-extracted here.

**Recorded revisions:**

- Teenage Mutant Ninja Turtles (U).nes — SHA-256 `9ff2693fdafb0c454d571b34bae6623a806db4a317ce2fcb2fea0f721bc04083`.

**Source verification:** No original cartridge for this title in the held-source corpus; see the recorded/observed scope.

## Zelda II

**Status:** partial native.

- **Where in Forge:** Direct ROM → RE Import → Resources → ROM library. Choose Scene / Metasprite / Animation / Native actor record / CHR / Audio. Available room, pose and supported script entries open working copies in the main editors. Maps and read-only code/parameter evidence retain their source inspection routes.
- **Scenes / World:** 4 overworld maps; 258 unique decoded rooms across 567 table slots (303 aliases, 6 unavailable).
- **CHR / palettes / poses:** 32 physical CHR-bank records; initial room BG/sprite art and palettes; 30 Link display poses. Direct ROM import now lists all 30 in Resources; opening a pose supplies its source pixels to the Metasprites editor.
- **Actors / objects / behavior:** 919 room spawn placements; 324 context-dependent actor records; 252 location records. These do not recreate enemy AI, NPC dialogue, items, spells or quests.
- **Collision:** New pack: 258 solid/open reference grids, 75,901 marked solid cells. All 258 room projects contain nonzero tile properties; 51 tile variants were split to avoid mixed collision use. Full native collision response and movement remain incomplete.
- **Audio:** 75 catalog entries: 28 nonempty music requests, 12 empty requests, 35 effects. Latest pack supplies 60 editable excerpts.
- **Native writing:** Bounded native overworld terrain, location and supported Scene edits. No native audio writer or complete behavior writer.
- **Code / RAM evidence:** 1,712 source symbol records and 20 RAM labels in the native catalog.
- **Project-copy boundary:** Fresh RE import initially opens one room as three editable pages and one Link pose. Resources → ROM library now exposes all 567 table slots (258 unique room streams), 30 poses, 324 actor records, 252 locations, CHR and Audio records. Selecting Edit creates or opens a canonical working copy, with one Undo step for new assets. All 30 poses can share the original three Scene owners. Standalone ZIP pose fragments still omit CHR; direct ROM-backed copies obtain their pixels from the retained original. Exported collision-enriched room projects have a separate scope. No complete native enemy animation or AI is recovered.
- **Current note:** Collision evidence is new; the native ledger correctly still leaves full side-view movement and collision-response recovery open.

**Recorded revisions:**

- Zelda II · investigated US revision — SHA-256 `ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c`.

**Source verification:** 1 revision(s) inspected in the current held-source corpus.

