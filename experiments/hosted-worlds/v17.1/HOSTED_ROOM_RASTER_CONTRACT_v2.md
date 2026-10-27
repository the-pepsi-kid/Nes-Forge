# Hosted Native Room Raster v2 — experimental, project-independent transport

This transport schema accepts versioned image bytes produced by an **existing original-game recovery adapter**. The schema does not prescribe an engine's original room layout, physics, camera algorithm, or palette timing.

**Publisher:** NES Forge Author → WORLD Live (explicit publish only). **Reader:** localhost player/websocket room clients. **Authority:** host owns room occupancy/movement/HP/XP. **Image source:** original decoded ROM room raster, generated privately inside the editor using existing Forge `GameRENative`; **no ROM bytes uploaded**.

`POST /api/admin/native-scene-art` version 2 adds exactly one new field to the v1 payload:

```json
{
  "format": "nesforge.hosted-native-scene-art",
  "version": 2,
  "sourceWidth": 1024,
  "expectedRevision": "<current World revision>",
  "sourceWorldId": "<canonical World ID>",
  "sourceDigest": "<source ROM digest>",
  "x": 2,
  "y": 6,
  "sourceBank": 3,
  "sourceScene": 5,
  "sourceKind": "town",
  "evidence": "executed-original-construction:first-screen",
  "png": "data:image/png;base64,<encoded original raster>"
}
```

(The `evidence` string is a historical identifier retained for compatibility and does **not** indicate the PNG must contain only the first screen.) Validation: fixed RGBA PNG dimensions `sourceWidth × 240`, `sourceWidth ∈ {256,512,768,1024,1280,1536,1792,2048}`, CRC/chunk validation, bounded payload size, and binding to an already-published original-source room record and current World revision. No user-supplied scripts, URLs, or arbitrary CSS. v1 images remain 256×240. State `stageFrames[].widthPx` and `GET /api/stage-frame.widthPx` describe the accepted dimensions. The browser renders a client-local 256×240 crop; it never mutates the asset. In this pilot, moving beyond `side_x=31` is permitted only for an original-source-bound, wider room asset.

Zelda II **game-specific** adapter details (room selection, CHR/palette recovery, actual authored collision, entrance rules) stay outside this generic transport contract. A broader adapter/plugin contract can be developed once additional supported games prove their own decoded scenes.

**Not native Zelda II gameplay parity:** the camera is a visual crop, server movement units are provisional, Link sprites are placeholders, the combat button is a network test, and native raster effects, original scroll timing, collision and enemy logic remain unsupported. No Git or remote deployment.
