# NES Forge Hosted Stage Reference v1 — reusable interface

This contract is meant to support other recovered or authored projects without hardcoding the Zelda II overworld/side-scroller split into all NES Forge projects.

## Publish static visual reference

`POST /api/admin/stage-frame` — localhost administrator-token required.

```json
{
  "format": "nesforge.hosted-stage-frame",
  "version": 1,
  "sourceWorldId": "z2:1:0",
  "expectedRevision": "<64-character active world revision>",
  "x": 4,
  "y": 6,
  "captureMethod": "emulator-visible-frame",
  "png": "data:image/png;base64,<256x240 RGBA captured frame>"
}
```

- Strictly validates the exact shape, PNG dimensions, PNG chunk CRCs, and payload bounds. Neither JavaScript nor unrestricted CSS is accepted.
- Verifies active-world identity, expected revision and in-world coordinates.
- Stores SHA-256 digest and an audit entry; `GET /api/stage-frame?x=4&y=6` serves the image to local players. WebSocket state exposes metadata only, so ordinary movement does not retransmit the heavy image.
- A frame is **not a native scene decoder output**; `nativeSceneVerified: false` must remain false. Player overlays and motion are provisional.
- This first binding uses a cell `(x,y)` as the area key because Zelda II's hosted pilot uses tile-cell entrance IDs. Future game templates should add typed `sceneId`, `entryId`, layer/context mapping and graph transitions rather than treating every game as Zelda II.

## Separation

**Authoring project** → native builds and Forge project data, unmodified by captures.  
**Hosted World snapshot** → versioned terrain and source-art atlas.  
**Hosted stage reference** → separately versioned optional visual observation, keyed to an area; not gameplay authority.  
**Live player state** → server-owned modes, position, XP, sessions, camps.  

A future source-recovery module must encode background tilemap, CHR, palette, OAM metasprites, animation frames, per-frame movement and timing, collision and entrance/exit semantics separately. This capture format deliberately provides **no fake values** for those.
