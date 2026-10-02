# 1.6.6 format compatibility

No ROM format or project schema changed in 1.6.6. Project `foundation` is now `1.6.6`; `version` remains 8. Native editor controls use the existing project data model. Open Forge ROM decodes validated GP16/MS16 and scene/world records into a fresh project; packed tile indices may differ from the pre-build project. JSON/ZIP remain the complete authoring backup. The original ROM bytes are retained separately for original playback.

# 1.6.5 format and runtime notes

Project schema v8 adds `gameplay` with mode, room/player/target IDs, movement speed, jump speed, gravity, maximum fall speed, and movement-body width/height. Missing legacy settings default to viewer mode. Invalid supplied fields are rejected before the existing loader changes state or history. Portable ZIP includes the authoritative project JSON and a `gameplay.json` manifest.

| CPU region | Use in a playable-room ROM |
| --- | --- |
| `$8000–$9FFF` | Generated 6502 code, bounded to 8 KB. |
| `$A000–$B7FF` | 960-cell collision map, animation descriptors, poses, contact rectangles, event masks; bounded to 6 KB. |
| `$B800–$BFFF` | Reserved GP16 configuration record. |
| `$C000–$CFFF` | Existing viewer bytes and NFEX/MT16/WR16/MS16 metadata, including the marker at `$CFF0`. |
| `$D000 + n × $0600` | Existing packed scene blocks and following tile-property table. |
| `$FFFA–$FFFF` | Updated NMI/reset/IRQ vectors pointing to the gameplay code. |

GP16 begins at the exact address `$B800`. Its header is four ASCII magic bytes `GP16`, one version byte `1`, a little-endian u32 payload byte length, and a little-endian u32 CRC32. The payload is strict UTF-8 JSON:

```json
{
  "format": "NESForgeGameplay",
  "version": 1,
  "sceneIndex": 0,
  "playerIndex": 0,
  "targetIndex": 1,
  "moveSpeed": 2,
  "jumpSpeed": 9,
  "gravity": 1,
  "maxFallSpeed": 6,
  "bodyWidth": 12,
  "bodyHeight": 22
}
```

`targetIndex=-1` means no target. Indices refer to the existing packed build order and entity order, not the editor's current array selections. Reader checks header/CRC/payload limits, scalar ranges, compatible packed metadata, and actual entity roles/identities before invoking the importer. The complete GP16 header and payload must fit 2,048 reserved bytes. Import maps these indices to appended stable project IDs.

Existing metadata remains MS16 v2, WR16 v3, MT16 v1, and NFEX v3. This release does not expand the existing 3,568-byte authoring-metadata allocation window. Runtime code/data capacity and authoring-metadata capacity are checked separately; neither silently truncates data.

Runtime pieces use global hardware 8×8 mode with the sprite pattern table at `$1000`; 8×16 source pieces expand into two explicit tile records. Facing reflects X about the entity feet origin and toggles horizontal pixel flip. Relative signed positions are checked before OAM writes to prevent byte wrapping. Movement collision samples the new leading edge for each one-pixel movement, using empty/solid cells and room boundaries.

Event masks: attack_start=1, attack_end=2, footstep=4, sound=8, custom=16. The complete ordered event records still live in authoring metadata. The small runtime mask is observational; damage comes from current attack-frame hitboxes and is latched to one hit per swing. No audio or arbitrary script execution is attached to these markers.
