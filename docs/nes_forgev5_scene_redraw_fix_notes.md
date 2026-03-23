# NES Forge v5 — scene redraw / capture separation fixes

This pass focused on the shared redraw bottleneck that was affecting both **Capture NT** and **Capture Frame**.

## What changed

### 1. Scene redraw now supports 8x16 sprites
The scene renderer no longer assumes every sprite is 8x8.

- It reads the active scene's `captureMeta.ppuCtrl` bit 5.
- Captured scenes now redraw sprites as **8x16** when the source frame used 8x16 mode.
- Selection boxes in the sprite layer also use the correct sprite height.
- Scanline overflow checks now count 16 scanlines for 8x16 scenes instead of always counting 8.

## 2. Behind-background sprite priority now uses a real BG opacity mask
The previous scene renderer handled behind-BG sprites mostly by draw order.

This pass changed that to use a **per-pixel background opacity mask** built from the scene tilemap:

- BG pixel color index `0` is treated as transparent for sprite priority.
- A sprite with the `behind BG` bit set only draws where the BG mask is transparent.
- This makes the scene tab behave much closer to the emulator.

## 3. Captured scenes now preserve both sprite pattern tables
Captured scenes now store:

- `sprChr0`
- `sprChr1`

This is important for 8x16 sprites, because NES 8x16 mode uses tile bit 0 to select the sprite pattern table.

Without both tables, captured sprites could redraw from the wrong bank.

## 4. Frame capture no longer bakes sprites into the background tilemap
This was the biggest frame-capture fix.

The old `Capture Frame` path:
- read the final emulator canvas,
- chopped it into tiles,
- and forced everything into BG tiles.

That meant player/enemy/projectile pixels were getting burned into the background.

The new `Capture Frame` path:
- renders a **sprite-free background pass** directly from emulator BG state,
- retile-rebuilds the BG from that clean pass,
- captures OAM separately,
- keeps sprite pattern tables separate for redraw.

So the frame scene is now:
- BG = retiled from a clean emulator BG render
- sprites = preserved from OAM

instead of flattening both layers into one dirty tilemap.

## 5. Capture metadata now matches the new redraw behavior better
Captured scenes still keep the metadata added in v4, but this pass makes that metadata more useful by actually using it for redraw decisions.

The scene tab now uses capture metadata for:
- sprite size mode
- sprite bank selection behavior
- behind-BG masking behavior

## Files changed in code

### Reworked scene-side drawing
- `scanlineCheck()`
- `drawSpritesOnCanvas()`
- `renderScene()`

### Added scene helper logic
- `sceneSpriteHeight()`
- `getActiveSceneRef()`
- `getSceneSpriteBanks()`
- `drawSceneSpriteDetailed()`
- `drawSceneBgAndBuildMask()`

### Reworked capture logic
- `emuCaptureNametable()` now stores both sprite pattern tables
- new `renderEmuBgOnlyFrame()` helper
- `emuCaptureVisibleFrame()` now rebuilds BG from a sprite-free pass and keeps OAM separate

## What is better now

These are the main expected improvements:

- hanging signs / tall captured objects should redraw more correctly in 8x16 scenes
- enemies and player sprites should stop getting permanently baked into the frame-captured BG
- behind-BG sprite behavior should look closer to emulator output
- both capture modes should diverge less at redraw time because the scene renderer itself is less lossy

## What is still not solved

### 1. True scrolling viewport reconstruction
The emulator renderer is still closer to a selected nametable page renderer than a full camera/viewport compositor.
So scrolling games can still drift.

### 2. Split-screen exactness in the scene tab
The frame capture now bakes the BG result from a sprite-free emulator pass, which helps a lot.
But the scene tab is still not a full split-aware runtime renderer.

### 3. Global CHR project model
The project still uses a mostly global CHR model rather than full per-scene CHR ownership.
So capture workflows can still collide with normal authoring workflows in edge cases.

## Best next fixes after this pass

1. Add a true **visible camera / scroll-aware BG renderer**.
2. Add an optional **Exact Captured Scene** mode that uses capture metadata even more directly.
3. Move toward **per-scene captured CHR ownership** or explicit capture banks.
4. Add a **BG-only / sprite-only debug overlay** in the emulator view so capture debugging is easier.
