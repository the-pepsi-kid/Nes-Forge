# Resource placement model — proposal for review

Status: **proposal, not implemented**. Per the owner's direction (2026-11-20), no further UI redesign happens until the
resource inventory and this placement workflow are reviewed. The inventory audit that this proposal builds on is in
[docs/audit/2026-11-20/resource-inventory](../../audit/2026-11-20/resource-inventory/COMPARE.md).

## 1. What the library is for

NES Forge is a WYSIWYG NES development kit. Its resource library is a developer's asset library. A recovered game is
browsed the way the game is laid out, from game to stage to screen. Each asset says:
- what it is;
- where it came from;
- where it is used;
- whether it is shared;
- what you can do with it: edit it in your project, write it back to the original ROM, or only refer to it.

## 2. What already exists — no new store is needed

One `ProjectStore` already holds two layers:

| Layer | What it holds | Example: Ninja Gaiden (US) import |
|---|---|---|
| **Source catalogue** (read-only reference, the whole game) | `investigation.catalogs.native`: scenes with area/room, actors, poses, animations, script slots, graphics. Every record carries its ROM location: 16 KB bank, CPU address, file offset, length and pointer location. Scenes also record graphics/palette selectors, enemy and lantern placements, entrance and music cue with its request address. `catalogs.spatial`: maps with per-cell sources and a certainty field. `catalogs.audio`: cues, instruments, streams. | 48 rooms in 22 areas, 44 actors, 202 poses, 83 animations, 128 script slots, 32 graphics sets, 85 music cues, 203 audio streams |
| **Working project** (editable) | scenes (64 working slots), metasprites, animations, worlds, audio, Gameplay Core. Scenes carry `captureMeta.nativeAssets`: source SHA-256, context, audio event and pose IDs. | 12 working scenes (Area 0's pages); the other rooms open on demand |

Several things are already built on top of these two layers:
- **The resource graph** (`ResourceRelationshipPreview.liveGraph`) has nodes and labelled edges over the working project. The Library, the Resource Explorer and the `resources.*` commands all read it. Because there is only one index, there is no duplicate database.
- **The Area library** navigates the catalogue by context, then room, then page, and turns pages into working scenes on demand. It is the closest thing to stage navigation today.
- **Extraction packs**: project entries load into the editor. Maps, rooms, resource pages, poses, catalogues and collision can only be browsed while the pack is open (the audit's "pack-only" class).
- **Editability levels**: build / native / copy / reference / unknown. Per-game native writers decide what can go back into the ROM. Build refuses unsupported native edits and names the asset.

**Gaps:**
- There is no *stage* level that uses the game's own layout names.
- Per-asset placement evidence is not surfaced. It sits inside catalogue records.
- Pack-only entries are gone once the pack is closed.
- There is no copy-with-provenance between stages.
- There is no list of unassigned resources.

## 3. Hierarchy

**Game → Stage → Area/Room → Screen/Page → Category → Asset**

- **Game**: the exact source (title, revision, SHA-256). Your own Forge projects appear as games too.
- **Stage**: the game's own unit, such as an Act/stage, region, fight or level. Every stage records where it came from:

  | Basis | Meaning |
  |---|---|
  | `rom-table` | decoded from the game's own stage table (verified) |
  | `runtime` | observed while the game ran (verified for that route) |
  | `pack-index` | as stated by an extraction pack (not independently verified) |
  | `author` | defined in a Forge project |

  Assets with no basis go to **Unassigned** (§6).
- **Categories**: graphics (CHR, palettes), sprites (poses/metasprites), animations, audio, collision, entities/actors, triggers/scripts, code/symbols, and maps/screens.

## 4. Placement record (per asset)

These fields are derived from existing evidence. Only facts that came from decoding are stored; the rest is computed.

| Field | Content |
|---|---|
| identity | id, type, name |
| source | ROM revision and SHA-256; bank, CPU address, file offset, length; pointer location; codec, each with its evidence reference |
| ownership | stage / room / page, `verified` and its basis (§3), or `unassigned` with the reason |
| usage | where it is placed or referenced: screen and position, pointer-table slot, runtime observation |
| dependencies | what it needs, e.g. tiles and palette, or pose → animation → actor |
| sharing | other stages that reference the same source asset |
| status | reconstructed: none / partial / complete; editable: the level; native write-back: verified writer, or refused with the reason |

## 5. Shared vs copy

- **Use here (reference)**: points at the source asset. An edit changes the source and follows its writer's rules. It shows a SHARED badge and every user of the asset.
- **Copy into my project**: creates an independent asset that records `derivedFrom`: source id, SHA-256, revision and the time of copying. Its editability is `build`. Native write-back is refused unless a writer owns that exact source asset.
- Copies keep their provenance through save/reopen. Nothing is ever copied implicitly.

## 6. Unassigned / unresolved

Every extracted asset without verified ownership is listed under the game's **Unassigned** stage, with one of these reasons:
- no stage table has been decoded;
- it was observed in several stages;
- it is pack-only;
- its codec is unknown.

Counts never imply completeness. A stage shows "N of M" only when M comes from a decoded table; otherwise it shows "N found".

## 7. One index, served through the command core

A `ResourcePlacement` service builds the stage index from three sources, on top of the existing resource graph: the catalogue, the working project and any open pack. The proposed commands are:

| Command | Returns |
|---|---|
| `resources.stages` | the game → stage tree with counts and bases |
| `resources.list {stage}` | the existing list, filtered by stage |
| `resources.placement {key}` | the §4 record |
| `resources.copy {key, toStage}` / `resources.reference {key, toStage}` | §5 |
| `resources.unassigned` | §6 |

The Library, Resource Explorer, Area library, VR/AR and agents all use these commands. No interface keeps its own asset list.

## 8. Developer workflow

1. Open a game: a ROM, a pack or a project.
2. Pick a stage. Every editor tab shows that stage's assets (whether other stages are hidden or only sorted after is a decision, §11).
3. Open another stage in a side reference panel without leaving the current one.
4. Choose **Use here** or **Copy into my project**. The asset then shows SHARED or COPY together with its source.
5. Build. A native edit without a writer is refused and the asset is named; this exists today.

## 9. Audio and VR/AR

- **Audio**: songs and instruments stay independent data. Each stage links to its cues through decoded audio events; for Ninja Gaiden, that is each area's start cue and the address that requests it. The sheet-music editor opens on the stage's cue. Native export applies only where a writer is verified.
- **VR/AR**: draws stages as clusters of screens from the same index. It keeps no asset list of its own.

## 10. Per-game stage data today

See the audit table in [COMPARE.md](../../audit/2026-11-20/resource-inventory/COMPARE.md) and the summary in §10a below.

## 11. Decisions for the owner

1. When a stage is selected, should other stages' assets be **hidden** or **sorted after**?
2. Ninja Gaiden has no stage table yet. Should it be decoded before stage navigation ships, or shown as "Area N (Act unknown)" first?
3. Pack-only entries: copy them into the project's catalogue when the pack is opened, so they survive closing it, or keep them pack-only?
4. Should **Use here** (reference) or **Copy** be the default?
5. In what order should games get decoded stage tables?

## 12. Acceptance checks

- **Inventory audit** (`tools/audit/resource_inventory.cjs`): nothing disappears between intake, load, navigation and save/reopen, and no editor build shows fewer resources than another for the same input.
- **Copy test**: copy an asset across stages. The source is unchanged, the copy carries its provenance, and both survive save/reopen.
- **Unassigned report**: the counts equal the catalogue minus verified ownership.
- **Build refusal**: an unsupported native edit is refused, and the asset is named.
