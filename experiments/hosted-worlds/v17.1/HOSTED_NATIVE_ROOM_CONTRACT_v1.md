# NES Forge hosted native-room RECORD contract v1

**Experimental read-only provenance/inspection contract. Not a playable room or collision contract.** It is separate from the v0.7 stage-frame image contract, the canonical Forge project, and the authoritative multiplayer simulation.

### Recovery direction

1. The editor validates its locally imported Zelda II source using its verified native adapter.
2. It obtains the current canonical location records, including approved edited destination selectors, and decodes the referenced room records from the user's original ROM bytes locally.
3. Explicit **Load selected World** first publishes the normal hosted terrain/art snapshot; it then submits a bounded location/room catalog to `POST /api/admin/native-rooms`, with administrator authorization, the source identity/digest and the exact current hosted World revision.
4. The host validates structure, coordinates and bounds; stores catalog records keyed by source World ID and **original location index**, not by coordinates alone; journals the operation; and broadcasts only compact metadata summaries.
5. A player at `(x,y)` in a shared side-view mode may query `GET /api/native-rooms?x=...&y=...` to inspect the decoded data. The normal client renders reference markers, **not original Zelda II art or collision geometry**. Multiple records at one coordinate are returned separately.

### Host publication example (illustrative, not actual ROM-derived content)

```json
{
  "format": "nesforge.z2.native-room-catalog",
  "version": 1,
  "sourceWorldId": "z2:1:0",
  "sourceDigest": "<64 lowercase hex chars>",
  "expectedRevision": "<64 lowercase hex chars>",
  "stages": [
    {
      "format": "nesforge.z2.native-room-record",
      "version": 1,
      "location": {"index": 0, "x": 5, "y": 6, "globalY": 36, "external": 0, "entry": 0, "terrainSource": "z2:1:0"},
      "source": {"bank": 1, "table": 34083, "scene": 0, "cpu": 32768, "fileOffset": 16400, "length": 4, "kind": "overworld"},
      "header": {"objectSet": 0, "screenCount": 1, "grass": false, "bushes": false, "flags": 0, "ground": 0, "groundTileSet": 0, "initialGroundPosition": 0, "ceilingDisabled": false, "palette": 0, "backgroundPalette": 0, "backMap": 0},
      "exits": [
        {"side":"left", "map":63,"screen":0,"outside":true},
        {"side":"down", "map":63,"screen":0,"outside":true},
        {"side":"up", "map":63,"screen":0,"outside":true},
        {"side":"right", "map":63,"screen":0,"outside":true}
      ],
      "objects": [],
      "evidence": "Illustrative synthetic read-only record; does not prove visual, collision, or gameplay parity.",
      "nativeSceneVerified": false,
      "originalEnginePlayable": false
    }
  ],
  "skipped": []
}
```

The host publishes `nativeRooms` summaries with only `locationIndex`, `x`, `y`, and a `digest`. `GET /api/native-rooms` responds with zero or more bounded records for the requested map square and explicitly returns `nativeSceneVerified:false`. Host accepts no scripts, ROM bytes, sprite atlases, arbitrary URLs, audio, or gameplay commands through this route. A snapshot revision change clears the room catalog; a validated terrain-only patch retains it when the source identity still matches. A failed catalog upload must not destroy the preceding committed catalog.

### Gameplay adapter contract for future projects

A future generic hosted `SourceAreaAdapter` should provide typed `projectId`, `resourceId`, `entryId`, `geometry`, `collision`, `renderResources`, `transitions`, `enemies`, `actors`, `stateRules`, and provenance, with **independent verification gates for each**. This v1 record catalog is deliberately NOT that adapter. Its Zelda II-specific raw fields remain in a domain-bound inspection format and must not be globally interpreted as collision/movement rules.
