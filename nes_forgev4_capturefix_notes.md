# NES Forge v4 Capture Fix Notes

## What was changed

This update focused on the emulator-to-scene capture path so captured scenes track the emulator more closely.

### 1. Split the old capture flow into two modes
- **Capture NT**: captures the logical nametable state for editing actual NES scene data.
- **Capture Frame**: captures the visible 256x240 emulator output and rebuilds a scene from what was actually on screen.

The old single capture path was doing only a simplified PPU memory grab, which was why captures looked like the scene but not like the final emulator view.

## Capture NT fixes

### 2. Capture now uses the same nametable base as the emulator renderer
Before:
- capture always read `emu.vram[0..959]` and `emu.vram[960..1023]`

Now:
- capture starts from `const ntBase = (emu.ppuCtrl & 3) * 0x400`
- nametable and attribute bytes are read through `ppuMirror()` from that base

Result:
- the captured scene now follows the same nametable page the emulator is drawing instead of always defaulting to nametable 0.

### 3. Background CHR capture now follows the active BG pattern table
Before:
- BG capture always decoded from `emu.chrBank0Post`

Now:
- BG capture uses the pattern table selected by `ppuCtrl & 0x10`
- sprite CHR capture uses the sprite pattern selection from `ppuCtrl & 0x08`

Result:
- scenes captured from ROMs using the upper background pattern table should redraw less scrambled.

### 4. Sprite Y is normalized for editor redraw
Before:
- raw OAM Y was copied straight into scene data

Now:
- scene sprite capture stores `y + 1` for editor redraw and also keeps `rawY`

Result:
- captured sprites should line up better when the scene tab redraws them.

### 5. Capture metadata is now stored on the scene
Each captured scene now stores a `captureMeta` object with:
- frame number
- `ppuCtrl`, `ppuMask`, `ppuStatus`
- `vAddr`, `fineX`
- mirroring and mapper
- split line
- pre/post CHR bank state
- BG/sprite pattern table selection
- capture mode

Result:
- you can inspect or export scene JSON later and still know how the capture was created.

## Capture Frame implementation

### 6. Added visible-frame capture
A new **Capture Frame** button was added to the emulator toolbar.

This mode:
1. reads the current `emuCanvas` pixels
2. chooses the best BG palette row per 16x16 attribute zone
3. converts each 8x8 cell into NES color indices
4. deduplicates tiles into a 256-tile CHR set
5. builds a new nametable and attribute table from the visible frame
6. clears OAM in the captured scene so baked-in sprites do not get drawn twice

Result:
- this gives a scene that is closer to the emulator image than a raw nametable dump, especially for scenes with sprite overlays or split-era CHR changes.

## UI changes
- old **Capture** button renamed to **Capture NT**
- new **Capture Frame** button added
- both buttons are enabled when a ROM is loaded or built and run

## What is still not fixed

### Scene redraw still is not fully emulator-faithful
The scene editor still does not fully reproduce emulator rendering rules in all cases.

Remaining gaps include:
- true scroll-aware viewport reconstruction
- exact behind-background sprite masking in the scene tab
- bank-split-aware redraw inside the scene editor itself
- preserving multiple CHR states inside one captured editable scene
- smarter tile reduction when visible-frame capture exceeds 256 unique tiles

## Recommended next steps
1. Make scene redraw use emulator-style sprite priority masking.
2. Add a debug panel that shows `captureMeta` for the active scene.
3. Add a toggle to keep raw captured OAM on frame capture instead of baking sprites into BG only.
4. Add a tile-overflow report for visible-frame retile mode when the frame needs more than 256 unique tiles.
5. Add true scroll/fine-X visible viewport capture for scrolling games.

## Output artifact
- `nes_forgev4_capturefix.html`
