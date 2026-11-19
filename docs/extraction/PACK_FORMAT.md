# NES Forge extraction pack format (what the editor accepts)

Written from the editor's own intake code (`app/src/services/extraction-pack.js`) and checked with
`tools/check_extraction_pack.cjs`. Every tool that produces a pack (local extraction scripts, Qwen, other assistants, Agent Lab) should
follow this and run the checker before handing a pack over:

```
node tools/check_extraction_pack.cjs <pack.zip or folder>
```

## 1. The ZIP

| Rule | Limit | What the editor says otherwise |
|---|---|---|
| Files in the ZIP | at most **2,048** | "Invalid ZIP directory" |
| ZIP size | at most **64 MB** | "ZIP exceeds 64 MB" |
| ZIP64 | not supported | "ZIP64 is unsupported" |
| Layout | one top folder per game, e.g. `Mega_Man_2_U/...` | |

## 2. Root report (exactly one per pack)

A JSON file at the top of the game folder whose `format` is one of:

| `format` | File name used by our tools |
|---|---|
| `NESForgeNativeExtraction` | `native_report.json` |
| `NESForgeNativeResourceExtraction` | `resources_report.json` (must name its native project in `project`) |
| `NESForgeNativeAudioExtraction` / `NESForgeAudioCapture` | audio-only and observed-capture packs |
| `NESForgeSMB1Extraction` / `SMB2` / `SMB3` | `smb1_report.json`, `smb2_report.json`, `smb3_report.json` |

Required: `rom.sha256`, the 64-hex SHA-256 of the exact source ROM file. The editor binds everything to it.

## 3. Folders the editor reads (relative to the game folder)

| Path | Shown as | Notes |
|---|---|---|
| `maps/*.json` (+ same-name `.png`) | Maps | preview PNG required |
| `rooms/*.json` (+ `.png`) | Room evidence | `NESForgeNativeSceneEvidence` (or the Castlevania II `cv2:` room form) |
| `resources/<group>/*.json` (+ `.png`) | Native background layouts | |
| `resources/.../<name>_collision.png` | Collision references | needs `collision.width`, `collision.height` and `pages` (or `cells`) whose length is width x height, values 0-255 |
| `projects/*.nesforge.json` | Editable scenes / rooms | **must be top level `projects/`**; a nested `stages_art/projects/` is not listed |
| `sprites/**/*.json` / `sprites/**/*.nesforge.json` (+ `.png`) | Pose previews / animation projects | |
| `actors.json`, `poses.json`, `animations.json`, `locations.json`, `ram.json` | Source catalogs | |
| `audio/*.nesforge.json`, `audio/audio_report.json` | Audio | |
| Mario only: `areas/*_objects.json`, `levels/*_objects.json` (+ level `.png`) | Original object placements | `objects[]` of `{object, x, y, page, column, row, number, romAddress "$hex"}` |
| `objects_report.json`, `placement_audit.json`, `collision_check_against_game.json`, `mm2_report.json`, `stage_art_report.json` | Extraction audits | at most 2 MB each |

Anything else in the ZIP (index.html, READMEs, extra images) is ignored by the editor but still counts
toward the 2,048-file limit.

## 4. Forge projects inside a pack

* Every entity needs an **`id`**: non-empty text, unique across all scenes of the project
  (e.g. `obj_0001`). Without it the editor rejects the whole project.
* Entity `type` is one of `player, enemy, npc, door, item, platform, trigger, spawn`; `x` 0-255, `y` 0-239.
* At most 64 scenes, 32 worlds, 256 metasprites and 256 animations per project.

## 5. Native projects (the ones that rebuild the original ROM)

* Leave them **exactly as the adapter produced them**. Changing tile properties, scenes, CHR or palettes
  outside the adapter's own writers makes the editor refuse to build ("A recovered Scene differs from its
  native recipe"). Put collision and other findings in separate reference files instead.
* The checker builds each native project unchanged and requires the original ROM's SHA-256 back.

## 6. What a pack cannot do

A pack can carry editable copies and evidence. It cannot by itself make an edit land in the original ROM:
only the editor's native writers can, and only for the fields they own (see the editor's per-ROM asset
report). For example, Punch-Out's art writer accepts edits made in its "physical CHR bank" view; edits
made to the same graphics in an ordinary Scene or Metasprite are saved but refused at native build.

## 7. Proposed next: per-asset ledger (not implemented yet)

From the Batch 1 spike (`NF-101`/`NF-102`): each pack would also carry one ledger row per source resource so
every reported count reconciles to rows or a named gap. Proposed fields: `source_sha256`, `asset_type`,
`source_record_id`, `archive_path`, `source_span`, `placement`, `reported_status`, `browse_status`,
`preview_status`, `edit_status`, `writeback_status`, `game_context`, `remaining_work`. Aliases must not inflate
unique counts, and the ledger must not become a second writable project model (ProjectStore stays canonical).
Until the editor reads it, the checker treats a ledger file as an ordinary ignored file.
