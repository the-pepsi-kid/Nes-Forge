# Resource library and placement model — v2, for review

Status: **proposal, not implemented.** The owner's decisions are locked (§0). Per the owner's direction, nothing in this
document is built, and no interface is redesigned, until it is reviewed. The measurements below come from:
- [the inventory audit](../../audit/2026-11-20/resource-inventory/README.md);
- [the Ninja Gaiden evidence audit](../../audit/2026-11-20/ninja-gaiden-evidence/EVIDENCE.md);
- [the Zelda II evidence audit](../../audit/2026-11-20/zelda-ii-evidence/EVIDENCE.md);
- [the library inventory of the extraction packs](../../audit/2026-11-20/library-inventory/LIBRARY_INVENTORY.md).

> NES Forge is a WYSIWYG development kit backed by a reusable resource library. **Extraction** is how resources are
> discovered. The **library** is where they are identified and organised. The **editor** is where they are used. The
> project store and command core stay as they are.

## 0. Decisions locked (owner, 2026-11-20)

| # | Decision |
|---|---|
| 1 | When a stage is selected, other stages' resources are **sorted after** it, not hidden. |
| 2 | Ninja Gaiden's stage table is decoded first. **Done**: 21 stages, Act 1-1 to 6-5, from PRG bank 0 $AF6E, confirmed for all 22 areas in the emulator. |
| 3 | **Every discovered resource is persistent and visible in the library**, whether or not Forge knows what it is or where it belongs. Pack resources survive closing and reopening Forge. They are **not** turned into editable project assets automatically. Every resource can be inspected (graphics, audio, code and unknown data) and identified by hand. The original ROM hash, bank, file offset, CPU/PPU address and mapper context are shown wherever known. The developer's annotations are kept **separate from verified findings**. |
| 4 | **Reference by default, copy explicitly.** Using another stage's or game's asset references the library resource. A separate, explicit action makes an independent editable copy, including its dependencies. Shared-resource warnings are clear. |
| 5 | **Zelda II is the next placement investigation** (§10). Before it, the Ninja Gaiden evidence audit and catalogue persistence check were to be finished. **Both are done** (§1). |

## 1. Inventory — what exists today (measured)

**ROM catalogues** (imported from the original ROM):

| Game | Catalogue | Evidence |
|---|---|---|
| Ninja Gaiden (US) | 48 rooms / 22 areas / **21 stages**, 44 actors, 202 poses, 83 animations, 128 script slots, 32 CHR banks, 48 maps, 85 music cues | **44,532 ROM locations, all inside the file and consistent with the bank layout. All 42,080 decoded values re-read from the ROM match**: pose pieces, pointers, animation frames, enemy and lantern spawns, entrances, palettes, map blocks and cells, stage bytes, music cue tables. Located-only kinds (code entry points, spans, audio stream contents) are listed in the report. |
| Zelda II (US) | 567 room slots in 9 contexts, 252 locations, 324 actor records, 1,799 enemy placements, 30 poses, 4 maps, 75 music cues | 42,428 ROM locations, all inside the file and consistent. **Value rules are not written yet**: Zelda II's encodings differ. For example, its pose sources point at the OAM-writing code, and its maps are stored as runs. Writing them is step 1 of §10. |
| Other games | Native resource pages (Contra, Mega Man, Metroid, Final Fantasy, River City Ransom, Shadowgate) or raw CHR tile sheets | — |

**Extraction packs** (18 packs, read with the intake's own rules):

| | Entries |
|---|---|
| Recognised by the intake | 4,820 |
| … loaded as projects (projects, audio projects, animation projects, native projects) | 1,418 |
| … **pack-only**, browsable only while the pack is open: resource pages 899, collision 803, maps 747, rooms 385, object placements 305, poses 232, catalogues 8, captures 2 | **3,381** |
| **Not recognised by the intake: the editor never shows them** — Mega Man 2 stage art (309 files, 308 images); Super Mario Bros 1/2/3 area and level files (315, plus their images); audio catalogues in 11 packs; 4 Battletoads title-audio and screen files; viewer pages and readmes | **678 files** |

Evidence carried by pack-only entries: every map has a file offset, CPU address and bank. Every room has a file offset and a bank, and 306 of 385 have a CPU address. Resource pages: 545 of 899 have a file offset. Object placements: CPU addresses. Poses and collision maps carry none. PPU addresses are almost never recorded.

**Persistence today**: catalogues of imported ROMs survive closing and reopening the browser, through the browser save, autosave recovery and project files. `QA/catalog-persistence.cjs` passes 5/5; the catalogues are Ninja Gaiden 4.2 MB and Zelda II 5.9 MB. **Pack-only entries and unrecognised files do not persist at all**: that is the gap decision 3 closes.

## 2. Three layers

| Layer | Owns | Store | Changes |
|---|---|---|---|
| **Discovery** | Reading sources: ROM intake and investigation, extraction packs, runtime captures | none (it produces entries) | Registers everything it reads in the library, including files it cannot classify |
| **Library** | Every discovered resource: identity, evidence, data, preview, verified findings, developer annotations, usage | **one** library store (§4) | New |
| **Editor** | Your project: authored assets, copies, references, builds | `ProjectStore` (unchanged) | Gains references to library entries |

## 3. Library entry

| Field | Content | Written by |
|---|---|---|
| `id` | stable: source SHA-256 + origin + path or slot | discovery |
| `source` | ROM SHA-256, revision, mapper, PRG/CHR layout | discovery |
| `origin` | how it was found: ROM catalogue, pack (name, SHA-256, path, extractor format) or runtime capture | discovery |
| `kind` | verified kind (map, room, CHR, palette, pose, animation, actor, song, code, table…) or `unknown` | discovery / verifier |
| `data` | the entry's data, compressed; or `needs source` with the pack's SHA-256 when it was not stored | discovery |
| `preview` | stored image, generated on demand, or none | discovery |
| `evidence` | file offset, bank, CPU/PPU address, length, pointer and codec, each with whether it is **re-read** (bytes match), **located** (bounds and bank only) or **stated** (as the pack says) | decoders and the evidence audit |
| `placement.verified` | game → stage → room → page, with its basis: `rom-table`, `runtime`, `pack-index` or `author` | decoders and verifiers only |
| `notes` | developer name, category, tags, group, free notes, **possible placements** with confidence | the developer only; never promoted automatically |
| `usage` | projects and stages that reference or copied it | the system |
| `status` | reconstructed: none / partial / complete; editable level; native write-back: verified writer, or refused with the reason | the system |

The developer's notes and the verified findings are separate fields and are always shown apart, for example *"Stage 4-2 (verified, ROM table)"* next to *"possibly the boss room (your note)"*. A note becomes verified only through a check that records its basis.

## 4. Storage — one library, projects stay self-contained

- **The library store** lives in the browser's IndexedDB, one shelf per source ROM (SHA-256). It holds the entry records, compressed data and previews. **Measured for the current 18 packs**: pack-only entries plus previews take about 26 MB; with every pack project stored too, about 63 MB. Measured compression: maps 23×, resource pages 16×, rooms 10×, projects 15×, audio projects 113×.
- **A library file** (export and import) moves shelves between machines. Re-registering a pack updates its shelf; matching entries are deduplicated by digest.
- **Projects** keep using `ProjectStore` unchanged. A reference is `{source SHA-256, entry id, entry digest}`. To keep a project portable, it also embeds a frozen snapshot of only the entries it references, so it opens on a machine without the library (decision A, §12).
- **Existing projects** keep their embedded investigation catalogues and still validate. When opened, their catalogues are registered in the library, deduplicated by digest. Nothing is migrated destructively.
- **Unrecognised files** are registered as `unknown` entries with their original path and raw bytes, viewable as hex or text. Nothing is dropped.

## 5. Inspect and identify

Every entry shows its ROM SHA-256, bank, file offset, CPU/PPU address and mapper context wherever they are known, and says plainly when they are not.

| Kind | Inspect | Identify |
|---|---|---|
| Graphics (CHR banks, tile sheets) | tiles at 8×8 or 8×16, with a chosen palette; source bank and offset | name, category, link to the rooms or poses that use it |
| Maps, rooms, screens, resource pages | rendered preview; collision and cell overlays | assign stage / room / page (verified or a guess) |
| Poses, metasprites, animations | pieces and OAM order; frame timing | owner (player, enemy, NPC), stage |
| Audio (cues, songs, SFX) | audition through the game's own driver where the cue is decoded; otherwise "not recoverable yet" | link to stages and areas |
| Code, tables, unknown data | hex and 6502 disassembly at the location, with bank and mapper context and known symbols | rename, describe, mark as table, code or data |
| Catalogues, RAM maps | tables | — |

## 6. Stage placement

The hierarchy is **game → stage → area/room → screen/page → category → resource**. Selecting a stage sorts its
resources first and the rest after (decision 1). Resources with no verified stage appear under **Unassigned**, with the
reason: no stage table decoded, seen in several stages, pack-only, or unknown codec. A stage shows "N of M" only when M
comes from a decoded table.

## 7. Reference and copy

- **Use (default): reference.** The project points at the library entry. Editing a referenced resource warns first, listing every stage, project and game that uses it. Native write-back follows that resource's writer rules.
- **Copy (explicit).** Creates independent project assets with `derivedFrom` (entry id, digest, source SHA-256, time). It includes the resource's **dependency closure**, which is listed before the copy is made:

  | Copying… | …also copies |
  |---|---|
  | a pose | its CHR tiles and palette |
  | a room | its blocks/metatiles, CHR, palettes and collision |
  | an animation | its poses |
  | an actor | its animations and poses |
  | a song | its instruments and samples |

  A copy can be edited freely; native write-back of a copy is refused unless a writer owns that exact source.

## 8. Commands (proposed, command core only)

`library.register` (ROM or pack), `library.list {game, stage, kind, status}`, `library.inspect {id}`,
`library.annotate {id, notes}`, `library.place {id, stage, guess}`, `library.reference {id}`, `library.copy {id, withDependencies}`,
`library.unassigned`, `library.export`, `library.import`.

Every interface, including VR/AR and agents, uses these commands. The existing `resources.*` commands keep working on the open project.

## 9. Audio and VR/AR

- **Audio**: songs and instruments stay independent entries. Stage links come from decoded audio events; Ninja Gaiden's link each area's start cue to the address that requests it. The sheet-music work (Sheet Music Review 3, not yet merged) attaches to these entries. Native export applies only where a writer is verified.
- **VR/AR**: draws stages as clusters of screens from the same library and placement index. It keeps no asset list of its own.

## 10. Zelda II investigation (next, after this review)

1. **Value rules** for the Zelda II profile in `tools/audit/evidence_audit.cjs`: poses through the OAM-writer code, maps through their runs. This makes its 42,428 locations re-readable like Ninja Gaiden's.
2. **Overworld regions and locations**: map the 252 location records to places (towns, palaces, caves, bridges) in the four overworld maps.
3. **Towns and palaces**: the East/West towns contexts; palaces 1–6 resolved from their location records into the palace A/B room tables.
4. **Enemies**: 324 actor records and 1,799 placements, per room and per region.
5. **Sprites**: Link's 30 poses plus enemy sprites, with their CHR banks.
6. **Audio**: 75 cues to regions, towns and palaces (12 cues lack a location today).

Each finding records its basis (ROM table or runtime) and is confirmed in the emulator, as Ninja Gaiden's stages were.

### Runtime stage survey (Ninja Gaiden)

`library.surveyStages` restarts the game in an area's first room (time over, with the area and room held in RAM set
to the area's first room from PRG bank 0 `$AF2C`, and the restart checked to land there). It then walks with the sword,
takes running jumps over obstacles (leaping off a wall it clings to) and turns around only when a direction makes no
headway. A pose becomes a verified `runtime` placement for that stage only when it is drawn on screen **and** its enemy
type is in that area's own spawn tables; everything else (projectiles, helpers) is reported but not recorded.
Stage 2-2 scrolls leftward from a wall, which is why the first right-only route saw nothing there.

## 11. Acceptance checks

| Check | State |
|---|---|
| Nothing disappears between intake, load, navigation and save/reopen, across editor builds | `tools/audit/resource_inventory.cjs`, run |
| Every claimed ROM location is consistent, and decoded values match the ROM | `tools/audit/evidence_audit.cjs`: Ninja Gaiden 42,080 / 42,080 |
| Catalogues persist across closing Forge | `QA/catalog-persistence.cjs` 5/5 |
| Every pack entry, unrecognised files included, is in the library after closing and reopening Forge, with preview and data, or a stated `needs source` | `QA/library-persistence.cjs`, `QA/library-explorer.cjs`, `QA/library-all-packs.cjs` (owner, all 18 packs) |
| Notes persist, separately from verified findings | `QA/library-explorer.cjs` |
| Reference and copy with the dependency closure; the source is unchanged; provenance survives save/reopen | `QA/library-workflow.cjs` (owner): a Stage 1-1 sprite referenced and a Stage 2-2 sprite copied into an ordinary project |
| A shared-resource warning lists every user | Partly: editing a reference asks first and declining leaves it unchanged (`QA/library-workflow.cjs`); listing every project that uses an entry needs portable snapshots |
| A build refuses an unsupported native edit and names the asset | exists today |

## 12. Questions for the owner

A. **Should projects embed a snapshot of the library entries they reference?** It keeps them portable, at the cost of
   some duplication. Recommended: yes.

B. **Where should the library live?** Proposed: browser storage plus an export file. Should it also be mirrored to a
   folder on disk where the browser allows it?

C. **Should full pack projects be stored when a pack is registered?** That is about 63 MB for all 18 packs, compressed.
   The alternative is to store their index and previews only, and say "reopen the pack to load". Recommended: store
   everything; then nothing depends on the original pack.
