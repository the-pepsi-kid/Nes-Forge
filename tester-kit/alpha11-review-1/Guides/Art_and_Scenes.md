# Art, scenes, sprites and animation

This guide covers the current **2.0.0-alpha.11 / audio-tool-import-1** editor. You can draw original NES artwork, assemble reusable terrain and character poses, animate them, and connect those assets to a supported generated game. The tabs share project data, so a change to a source tile can intentionally change many appearances.

Start with [Projects and play](Projects_and_Play.html) for opening and saving a project. Continue with [Gameplay and World](Gameplay_and_World.html) when your terrain and character are ready to run. [Audio](Audio.html) explains music, SFX and sound-event bindings; [RE and code](RE_and_Code.html) covers recovered art and native source.

## What each asset means

| Asset | What it stores | Where you use it |
| --- | --- | --- |
| CHR tile | An 8×8 grid of pixel values 0–3. It has no independent RGB colors. | Background tiles in SCENE/METATILES or sprite pieces in SPRITES/METASPRITES. |
| Palette | Four NES color entries per row. Background and sprite rows are separate. | A placement chooses a row; changing a row's color changes its uses. Sprite pixel value 0 is transparent. |
| Scene | A 256×240 background, its CHR and palettes, scene sprites, collision table and scene entities. | A room/source asset, the scene viewer, or the source tileset for a World. |
| Metatile | Four background tiles, one palette row, four collision quadrants and descriptive metadata. | Linked 16×16 placements in SCENE and terrain cells in WORLD. |
| Scene sprite | A positioned OAM-style sprite with tile, palette, flips and priority. | A static scene composition or the input to Capture scene OAM. |
| Metasprite | A named reusable pose made of sprite pieces, with a source scene and origin. | ANIM frames. Pieces still reference the source scene's sprite CHR/palettes. |
| Animation | Ordered frames with durations, optional contact areas and frame-entry events. | ENTITY STUDIO bindings and the supported game runtime. |
| Scene entity | A placed Player, Enemy, NPC or other authored scene object. | ENTITY STUDIO and retained Player/Target configuration. Gameplay Core actors use a separate model. |

Duplicating a metatile or metasprite copies its definition; it does **not** create independent CHR pixels. To change pixels for one variant, copy the source tile to a different tile slot and point the variant at that slot. A duplicated scene has independent scene art, but existing project-level assets retain their explicit source-scene references.

Coordinates begin at zero. SCENE background tile coordinates are 8×8 units; METATILES cells are 16×16 units. Entity/sprite fields use pixels. Labels such as `$10` are hexadecimal: enter **16** in an ordinary numeric tile field; `$FF` means **255**.

## Tutorial: draw terrain and make a reusable block

**Goal:** make a visible ground tile, turn it into a solid metatile, and prove that linked placements update together. This does not require a ROM or imported starter project.

1. Save any work you already have, then choose **New Project**. The initial scene is **My First Room**. Leave **CODE** empty.
2. Open **CHR SHEET → BG Bank ($0000)**. Choose tile **$01** and leave tile **$00** blank.
3. In **Editing Tile**, choose pixel color 2, 3 or 4, then click/drag on the enlarged tile to draw a brick. The keyboard keys **1–4** select pixel values **0–3**.
4. If the colors are indistinguishable, select a row in **Preview Palette**, select the color slot, then use its **✎** button to choose an NES color. This edits the actual palette. **Color preview → Selected palette** only changes the preview context.
5. Open **COLLISION**, select **1 - Solid (blocks all)** under **Active Property**, then click tile **$01** in **Tile Assignments**. Leave `$00` Empty.
6. Return to **CHR SHEET**, choose the BG tile `$01`, then open **SCENE**. Paint the top-left four tile positions: **(0,0), (1,0), (0,1), (1,1)**. The status bar reports tile coordinates as you point at the canvas. This makes one complete 16×16 sample.
7. Open **METATILES**. Set **Tool → Select cells**, click the top-left sample, then choose **+ From Selected Cell**. Name the definition **Solid Block** and, optionally, set **Category** to `terrain`.
8. Inspect **CHR QUADRANTS**: TL, TR, BL and BR should all be **1**. Inspect **COLLISION QUADRANTS**: all should be **Solid**. The collision was copied from the source tiles when the definition was created. You can also select **Solid** beside **Set all 4**, then click that button.
9. Set **Tool → Paint metatile** and paint two more cells. Change the definition's **Palette** to another row, or change one CHR quadrant. Every linked placement should update. Use **Undo** to return to the desired block.
10. Choose **Save Project As…**, complete the save, and later reopen that file with **Open Project**. The named definition, collision and linked cells should return.

**Expected result:** one scene-local library definition and several linked placements. The library card's placement count describes scene placements. Existing World maps use the same definition through their selected source scene, but raw SCENE painting does not populate an already-authored World map.

For a ground surface with air above it, use **TL=0, TR=0, BL=1, BR=1**, with **Empty, Empty, Solid, Solid** collision. To keep a sample from seeding a new World's initial map, select that scene cell and choose **Detach Selected Cell**. This retains the library definition and current pixels while breaking the scene link. Continue in [Gameplay and World](Gameplay_and_World.html) to place terrain and select a Player.

To see only the artwork in a generated ROM, open **SCENE → Gameplay**, select **Scene viewer / custom assembly**, keep CODE empty and build the selected scene set. **New Project** initially selects the single-room gameplay mode; that mode needs a configured Player and is not ready simply because the artwork exists. See [Projects and play](Projects_and_Play.html) for the build controls.

## CHR SHEET: drawing and reuse

| Control | What it does and when to use it |
| --- | --- |
| **BG Bank ($0000)** / **Sprite Bank ($1000)** | Selects the active scene's background or sprite source tiles. Drawing in the wrong bank changes a different asset. |
| Tile sheet / arrow keys | Click a tile to edit it. Arrow keys navigate the normal 256-tile sheet. Expanded capture atlases have a separate page selector. |
| **Editing Tile** pixel canvas | Paints the selected tile's 8×8 pixel values. Every reference to that source tile sees the edit. |
| **Pixel Color (1–4)** | Chooses pixel value 0, 1, 2 or 3. In Sprite Bank, value 0 appears as a transparency checkerboard. |
| **Clear Tile** | Replaces all pixels in the selected tile with zero. This also clears every appearance using that source tile. |
| **Copy Tile** / **Paste Tile** | Copies pixels to Forge's tile clipboard; Paste overwrites the selected destination slot. Use a different slot for an independent drawing. |
| **Color preview → Scene colors (auto)** | Uses each tile's scene usage to choose an appearance. One tile can legitimately appear with multiple palette rows. |
| **Color preview → Selected palette** | Previews the sheet and pixel editor using the selected row. It does not repaint existing scene placements. |
| **Color preview → Pixel values (grayscale)** | Displays raw 0–3 values without palette colors. Useful for spotting shape differences. Palette-edit pencils are disabled in this diagnostic mode. |
| **Tile appearance** | Appears when the selected tile has multiple scene appearances; choose which palette/state to inspect. This is a preview choice. |
| **Captured palette state** | In manual preview of a capture with multiple palette states, selects the state used for preview. |
| **Preview Palette** rows, swatches and **✎** | Row/swatch selection chooses a preview row and pixel value. The pencil edits an actual NES palette entry. |
| **TILE USAGE MAP** | Reports the most-used source tiles numerically. These are diagnostics, not a guarantee that the full ROM fits. |
| **Highlight in Scene** / **Auto-track** / mini-scene | Finds placements of the selected tile. Auto-track updates the result as selection changes. Sprite Bank searches active scene OAM. |
| **ROM CHR Banks**, **→ BG**, **→ Spr** | When available after ROM import, select a retained ROM bank, then explicitly copy it into the active scene's BG or Sprite source. Selecting the bank alone does not apply it. Applying replaces that source bank and affects existing references. |
| **Captured atlas page** / source hint | Browses capture atlases larger than 256 tiles and shows native-source information where available. An atlas ID above `$FF` is not automatically a buildable NROM tile index. |

**Palette changes versus tile changes:** CHR stores shapes; a palette supplies colors. A palette pencil may therefore recolor many different tiles. The background's universal color participates in NES background-color behavior; it is not four unrelated transparent colors. Use **Undo** if a palette edit affects more artwork than intended.

## SCENE and ATTR MAP: painting and scene settings

The active scene is selected by the top **Scene** menu or the sidebar thumbnails. Top scene buttons provide **New scene (+)**, **Duplicate scene**, **Delete scene** and **Rename scene**; their tooltips identify the icon buttons. The editor retains at least one scene and supports up to 64. Scene deletion can leave references in other assets needing repair; save a checkpoint before reorganizing source scenes.

| Control | Purpose and effect |
| --- | --- |
| SCENE canvas | Click/drag paints the selected 8×8 BG tile and palette row. Right-click eyedrops both. A selected entity tool places entities instead; press **Escape** to leave placement mode. Clicking an existing entity selects/drags it. |
| **Selected Tile** | Shows the current raw tile brush and its scene usage. Choose a new brush in CHR SHEET. |
| **Palette Selector** | Chooses the background row used when painting. Its pencils edit the owning scene's palette data. |
| **METATILE BRUSH** / **Enable 16×16 Brush** | Chooses and paints complete linked metatiles. Right-click eyedrops a linked definition. Toggle it off, or press Escape, to return to raw tile painting. |
| **LIVE STATS** | Shows tile reuse, unique/free tiles and related scene counts. Run build preflight for actual output capacity. |
| **ATTR EDITOR** | Cycles a 16×16 quadrant through P0→P1→P2→P3. All four 8×8 tiles in that quadrant share the row. A raw palette change can detach a linked metatile if it no longer matches its definition. |
| **ATTR MAP** canvas | Shows palette assignments with 32×32 attribute boundaries. Left-click a quadrant to cycle its palette. The scene ATTR EDITOR and this view edit the same attributes. |
| Top **Grid**, **Attr**, **Meta**, **Zoom** | Changes drawing overlays or display scale where applicable. These controls do not add gameplay behavior. |
| **Type** | Stores Side-View, Top-Down or Static Screen scene intent. Selecting Top-Down does not install a top-down game engine. |
| **Scroll** | Stores None, Horizontal, Vertical or Both. Current World gameplay uses screen transitions; this dropdown alone does not enable smooth scrolling. |
| **BG Color** | Sets an NES color index from 0–63 for the scene background. |
| Scene **Gravity** | Stores None, Down, Heavy or Up metadata. The generated Player's actual physics are configured in Gameplay/World Runtime. |
| **Build** / **Order** | Includes the scene in the retained viewer/single-room build set and chooses its order. World Runtime follows its own saved world/player dependencies. |
| **CAMERA / VIEW → Show** | Toggles the scene camera overlay. |
| **View X / View Y / View W / View H** | Stores scene view position and dimensions. These are separate from WORLD Camera Regions. |
| **Follow** | Stores which scene entity the authored camera references, or None. It is not a universal camera runtime switch. |
| **H Border / V Border** | Stores camera border margins. The generated mode still validates its own camera restrictions. |
| **SCENE LINKS** | Displays links derived from scene Door entities. World Entrance/Exit links are authored separately in WORLD. |

In **Build Scene Set** in the shared lower sidebar (visible from CODE, SCENE and other tabs), each scene has an inclusion checkbox and numeric build order. **Include first 7** selects the first seven workspace scenes; **Preflight Build** checks the selected output path. The retained NROM scene viewer supports at most seven selected scenes and constrained shared BG/Sprite tile banks. A scene can remain editable and saved while excluded from that ROM. A door to an excluded build scene is a reference error to resolve.

For native raster captures, **VERIFIED RUNTIME CAPTURE** shows fidelity recorded at capture time, the retained palette states, **Preserve captured PPU sprite clipping / grayscale**, and **Create lossless static copy**. Editing the capture intentionally changes its image; the old fidelity record is not a new test of your edits. A lossless static conversion can be refused when the frame cannot be represented by a conventional static NES background. See [RE and code](RE_and_Code.html) for capture choices and recovery boundaries.

| Capture or conversion | What the result means for artwork |
| --- | --- |
| **Capture Runtime Scene** / **Hybrid Capture** | Current native capture paths preserve source tiles, scanline placement/palettes and separate sprites from a completed emulator frame. They validate background and composite pixels before insertion. This fidelity is relative to the bundled emulator. |
| **Bake Visible Frame** | Converts the visible image into a constrained background and flattens the sprites into it. It can approximate colors or tiles; it does not retain separate editable sprite objects. |
| **Raw Nametable** | Inspects unscrolled end-of-frame memory. It is not a promise to match the visible scrolled picture. |
| **Create lossless static copy** | Attempts to turn an existing native capture into a conventional static scene while preserving its image. It refuses unrepresentable raster effects instead of silently treating a bake as lossless. |

For reusable terrain from a capture, keep the original captured scene, create its static copy, inspect that copy, and then use METATILES there. **New Scene** is a capture destination; **Replace Current** overwrites the destination's captured fields. Partial **Merge Fields** is refused for raster captures because partial transfer would break their linked assets.

## METATILES and COLLISION: two related collision stores

**COLLISION** assigns a property to a BG CHR tile in the active scene. All raw scene occurrences of that tile share the property. **METATILES** stores four independent collision quadrants in each reusable definition. Creating a definition samples the tile properties at that time; later edits to the tile collision table do not rewrite those saved quadrants. When tuning World terrain, edit the metatile collision fields.

| Control | Purpose and effect |
| --- | --- |
| **Analyze Scene → Library** | Scans static 16×16 cells, reuses matching definitions and creates missing definitions without changing visible pixels. Existing named matches are retained. |
| **+ From Selected Cell** | Creates or reuses the selected scene sample's tiles, palette and collision as a definition, and links that cell. |
| **Relink Matches** | Relinks matching scene cells using tiles, palette and collision; nonmatching cells remain unlinked. |
| **Tool: Select cells / Paint metatile** | Selects a sample for inspection, or paints the chosen definition. Right-click on a linked cell selects its definition. |
| **Brush** / library cards | Chooses the definition. Cards show scene placement counts; the status reports the selected cell and linked/unlinked state. |
| **Show metatile collision overlay** | Displays the four collision classifications over scene cells. It does not change collision. |
| **Name / Category** | Describes the asset for authoring. Its numeric ID remains the reference identity. |
| **Palette / CHR QUADRANTS TL, TR, BL, BR** | Edits the definition's palette row and four tile references. Linked scene placements update, and Worlds using that definition render the revised asset. |
| **Capture Selected Cell → Definition** | Replaces the selected definition from a scene sample, affecting all references to that definition. |
| **Duplicate** | Makes a separate definition with copied references. Use it before making one terrain variant. |
| **Delete** | Removes the definition. Scene appearances stay but their links detach; World references are reconciled by World authoring. Inspect your maps and use Undo if unintended. |
| **COLLISION QUADRANTS** / **Set all 4** | Sets each quadrant, or sets all four to the chosen property in one operation. |
| **SEMANTIC FLAGS** | Stores Foreground, Destructible, Animated and Interactive flags. Checking them alone does not create those behaviors in the generated game. |
| **Detach Selected Cell** | Breaks only the selected scene cell's link while retaining its visible tiles and palette. |
| **COLLISION → Active Property** | Chooses Empty, Solid, Platform, Ladder, Hazard, Water, Slope Left or Slope Right. These are authorable classifications; runtime support is narrower. |
| **COLLISION → Tile Assignments** / scene canvas | Assigns the current property to a tile; clicking its occurrence on the collision canvas edits that tile's property too. |
| Collision legend and statistics | Explain overlay colors and report Solid/Platform/Hazard tile counts. |

**Current output boundary:** World Runtime executes **Empty and Solid** terrain and refuses other collision values in used metatiles. A red Hazard label, a Platform label or an Animated flag is not sufficient to generate the corresponding mechanic. The metatile library supports up to **255 definitions (IDs 0–254)** per scene. Exact raster captures require a static copy before metatile authoring. Unused authoring definitions can remain in the project while being omitted from ROM metadata.

## Tutorial: make a character pose, animate it and bind it

**Goal:** make a reusable two-piece pose and inspect its animation on a scene Player. Previewing it is separate from selecting a runnable gameplay mode.

1. In **CHR SHEET → Sprite Bank ($1000)**, draw a head in `$01` and a body in `$02`. Leave pixel value 0 around the shapes for transparency. Choose visible colors with the sprite palette pencils.
2. Open **METASPRITES → + New frame**. Name it **Hero idle**. Set **Source scene** to the scene containing the art, and **Sprite size** to **8 × 8**.
3. In **SOURCE SPRITE CHR**, choose tile `$01`, click **+ Piece**, and set that piece's **X=0, Y=0**. Choose `$02`, add another piece and set **X=0, Y=8**. Double-clicking a source tile also adds a piece.
4. Click **Set origin at feet**. For this 8×16 composition, the origin becomes the bottom center, **X=4, Y=16**. Click **Fit frame** if needed. The cyan cross marks the anchor that later placements use.
5. Choose **Duplicate**, name the copy **Hero step**, then move its bottom piece one pixel to the right. The poses now have independent positions but still share their source tile pixels. Keep the same origin so the character does not jump between poses.
6. Open **ANIM → + Add Animation**. Name it **Hero idle loop**, set **State** to idle and keep **Loop** checked. Select its first frame, choose **Frame source → Metasprite**, choose **Hero idle**, and set **Duration** to **8**.
7. Click **+ Frame**. It copies the selected frame, including contacts/events if present. Change this frame's metasprite to **Hero step** and its duration to **8**. Click **Play**, then **Stop**.
8. Open **ENTITY STUDIO**. Select the source scene. Under **PLACE AN ENTITY**, choose **Player**, enter a position such as **X=128, Y=120**, and click **Add at X / Y**.
9. Under **STATES**, enter `idle`, select **Hero idle loop**, and click **Assign state**. Select idle as **Default state**. Click **Play**, **Tick +1**, or a frame timeline button to inspect it.
10. Save with **Save Project As…**. Reopen the JSON and confirm the named poses, animation frames and Player binding remain present.

**Expected result:** the Player's preview alternates two poses around one anchor. To make a playable game, configure the Player, required state bindings, collision/body and build mode in [Gameplay and World](Gameplay_and_World.html). A default `idle` binding alone does not meet every generated gameplay profile's requirements.

## SPRITES: scene placements and source art

| Control | Purpose and effect |
| --- | --- |
| **+ Add Sprite** | Adds a scene OAM entry. The editor allows up to 64 entries. |
| Canvas / **OAM Slots** | Click an existing sprite or list entry to select it; drag to move. Clicking empty canvas places a sprite. Right-click a sprite deletes it. Arrow keys nudge; Shift uses 8-pixel steps. |
| **Delete Selected** / Delete or Backspace | Removes the selected scene sprite. Its source CHR tile remains available. |
| **Tile / X / Y / Palette** | Chooses source art, screen position and SP0–SP3 palette. Normal fields accept X=0–255 and Y=0–239. Build validation can be stricter at hardware boundaries. |
| **FlipH / FlipV / Behind** | Stores horizontal/vertical flip and priority behind opaque background pixels. |
| **Size / Bottom** | Chooses an 8×8 or normalized 8×16 source sprite; Bottom selects the second tile for 8×16. Do not assume arbitrary source pairs will consume the same resources in every output backend. |
| **Draw Sprite Tile**, colors 1–4, **Clear Tile** | Edits the source tile used by the selected sprite. These are the same pixels as CHR SHEET's Sprite Bank. |
| **Open in CHR Sheet ›** | Opens the selected sprite tile in the CHR editor. |
| **Sprite CHR Picker** | Chooses a tile for the selected scene sprite. |
| **Sprite Palettes** and pencils | Selects/edits source sprite colors, affecting other users of the same row. |
| Scanline warning | Reports rows with more than eight sprites. Transparent pixels still consume sprite slots. |

Scene sprite Y is a screen coordinate; ROM OAM encodes a hardware offset. The packed scene builder rejects placements it cannot represent, including problematic top-row sprites. Correct the placement rather than treating the editor preview as proof of output validity.

## METASPRITES: reusable poses

| Control | Purpose and effect |
| --- | --- |
| **Frame** / **+ New frame** | Selects or creates a reusable pose. The library permits up to 256 frames and 128 authored pieces per frame; those authoring limits exceed the NES display budget. |
| **Capture scene OAM** | Copies the active scene's sprite arrangement into a reusable pose, keeping references to that scene's art. Mixed source sizes are normalized into 8×8 pieces. |
| **Duplicate / Mirror copy / Delete** | Copies a pose, makes a mirrored copy around its origin, or removes it. Deleting a referenced pose leaves a missing animation reference to fix. |
| **Export frames** | Saves frame data for interchange/inspection. Use the complete native project for a backup with source scenes. |
| **Name / Source scene / Sprite size** | Names the pose, chooses its source CHR/palettes, and chooses global 8×8 or 8×16 interpretation for its pieces. |
| **Origin X / Y / Set origin at feet** | Defines the anchor. Placement subtracts the origin from piece coordinates; feet sets the bottom-center anchor from current bounds. |
| **+ Piece** / source sheet | Adds the current source tile as a piece. Click the sheet to select a brush; double-click to add it. |
| Piece list / **Duplicate piece / Remove** | Selects, copies or deletes a piece. |
| **Earlier / Later** | Changes piece OAM order. Earlier pieces win overlapping sprite pixels and receive priority in the hardware-limit preview. |
| **Tile / lower / X / Y / Palette** | Sets a piece's source tile(s), pixel position and source sprite palette. Coordinate/origin bounds are −2048 to 2047. |
| **Flip H / Flip V / Behind BG** | Stores per-piece attributes. The isolated transparent preview has no background against which to show Behind BG. |
| **Mirror X at origin / Mirror Y at origin** | Mirrors only the selected piece's position and orientation around the frame origin. |
| Canvas / **Snap** | Drag a piece with 1-pixel or 8-pixel snapping. Arrows move 1 pixel; Shift moves 8. Delete removes the selected piece. |
| **Fit frame / Zoom / Grid / Boxes** | Changes only the composer view and overlays. |
| **Hardware limits / HARDWARE BUDGET** | Previews the first 64 OAM pieces and eight intersecting sprites per scanline; reports source/pair issues. Multiple runtime actors share these budgets. |

An 8×16 frame uses two tile references per piece. Hardware pairing and final CHR packing depend on the selected build path; World compilation, for example, can expand a source pair into two 8×8 output pieces. Follow the build's resource diagnostics rather than assuming the authoring preview is an exact whole-game budget.

## ANIM: timing, contact areas and events

| Control | Purpose and effect |
| --- | --- |
| **+ Add Animation** / animation list | Creates or selects an animation. |
| **Name / State** | Names the asset and selects its descriptive idle/walk/run/jump/fall/attack/hurt/custom category. Entity binding names are assigned separately. |
| **Loop / Flip on reverse** | Chooses repeating playback and reversed-facing art where supported. Flip does not create a separate pose asset. |
| Timeline / **+ Frame / - Frame** | Selects, duplicates the selected frame into a new step, or removes a step. Contacts and events are copied with an added frame. |
| **Frame source / Metasprite / Tile $** | Chooses a reusable metasprite or a legacy single-tile frame. Tile input is disabled for a metasprite source; its previous legacy value is retained. The source note identifies the scene or a missing reference. |
| **Duration** | Sets 1–255 ticks per frame; one preview tick is 1/60 second. |
| **Play / Stop** | Starts/stops animation preview. Leaving the workspace stops playback. |
| **Frame contact areas → Select / move** | Selects an area to drag or edit. Drag its lower-right square to resize. |
| **Draw hit / Draw hurt / + Hit / + Hurt** | Draws or adds red attack/hit and green vulnerable/hurt areas on the selected frame. |
| Area list; **Name / X / Y / Width / Height** | Selects and precisely edits an area relative to the frame origin. Arrows nudge, Shift uses 8 pixels, Escape cancels a drag. |
| **Delete area / Show areas** | Removes an area or toggles its overlay. Up to 16 hit and 16 hurt areas are stored per frame. |
| **Frame-entry events → New event type / + Event** | Adds an ordered event marker: attack start, attack end, footstep, sound or custom. |
| Event list; **Type / Name / Value** | Selects and edits a marker. Up to 16 events are stored per frame; names and values allow up to 255 UTF-8 bytes. |
| **↑ Earlier / ↓ Later / Delete event** | Reorders or removes events on that frame. |
| **Open Metasprite Composer** | Opens METASPRITES to edit the reusable pose assets. |

A contact area or event becomes gameplay only if the selected runtime consumes it. ENTITY STUDIO logs frame-entry markers for inspection; it does not play sound or apply damage. Supported generated runtimes can execute linked **sound** events when Audio Runtime is enabled. Use the SFX ID and the binding instructions in [Audio](Audio.html). World Runtime's attack contacts/custom events remain authoring data; do not infer combat behavior from the red box alone.

To inspect an event: select an animation frame, choose **custom**, click **+ Event**, set **Name** to `pose-check`, then preview that bound animation in ENTITY STUDIO. **Restart** and **Tick +1** let you check when the log records entry into the frame. Use **Clear log** to reset only the preview log; it does not delete markers from the animation.

## Scene entities and ENTITY STUDIO

In SCENE, choose an entity toolbar type and click to place it. Click the same tool again or press Escape to stop placing. **Placed Entities** selects existing objects; **Entity Properties** edits the selection, and **Open Entity Studio** opens its bindings. **Delete Entity** removes it and can invalidate a configured Player/Target reference.

| Scene entity properties | Meaning |
| --- | --- |
| Common **Type / Name / X / Y / Sprite** | Sets category, name, position and optional sprite tile. Sprite **−1** uses the editor icon. An editor icon is not generated game art. |
| **Player / Spawn Point** | Scene authoring markers used where the chosen runtime explicitly references them. World start/spawn markers have their own controls. |
| **Enemy → Variant / Dir / Speed** | Stores Walker/Flyer/Jumper/Shooter/Boss classification, facing and speed metadata. These labels do not generate five enemy systems by themselves. |
| **NPC → Dialog / Facing** | Stores text and facing intent; no general dialog engine is implied. |
| **Item → Item** | Stores Coin/Heart/Key/Powerup/1UP/Custom classification. Gameplay Core collectables are authored separately. |
| **Door → To Scene / To X / To Y** | Defines a legacy scene destination and populates SCENE LINKS. World traversal uses World entrance/exit links. |
| **Platform → Width / Move / Range** | Stores platform geometry/movement intent. It does not automatically enable moving-platform execution. |
| **Trigger → Action / Value** | Stores dialog/cutscene/sound/flag/custom metadata. Use an implemented gameplay or audio binding route for an executing effect. |

| ENTITY STUDIO control | Purpose and effect |
| --- | --- |
| **Scene / Entity** | Chooses the existing scene entity being edited. This list is separate from Gameplay Core Actor Instances. |
| **Edit in scene / Edit animation** | Navigates to the selected entity or the currently resolved animation. |
| **State name / Animation / Assign state** | Creates or updates a binding. Names start with a lowercase letter and use lowercase letters, digits, underscores or hyphens; up to 16 states. Reusing a name changes that assignment. |
| Binding rows / **Remove** | Shows and removes state-to-animation mappings. |
| **Default state / Default facing** | Saves the entity's initial binding/facing. |
| Preview **State / Facing** | Chooses the state and temporary direction to inspect. Temporary preview facing does not replace Default facing. |
| **Play / Pause / Restart / Tick +1** | Runs, pauses, restarts or advances animation preview by one 1/60-second tick. No game simulation executes here. |
| **Timeline** slider / frame buttons | Scrubs by tick or jumps to a frame's start. |
| **Boxes / Labels** | Toggles preview contact areas and labels. |
| **FRAME-ENTRY EVENTS / Clear log** | Shows the latest 200 preview event entries or clears the preview log. |
| **PLACE AN ENTITY → Type / Scene X / Y / Add at X / Y** | Creates a scene entity at exact typed coordinates. |
| **Place in scene** | Switches to SCENE with the chosen placement tool so you can click a location. |

## Bringing artwork in from files

**Upload Image** decodes an image, scales it to **256×240** without smoothing, and converts it into a **new scene** using the current background palettes. It is a scene-image conversion, not a lossless sprite-sheet importer. Colors and shapes can change because NES palettes and the 256-tile conversion budget are constrained; the conversion records changed pixels and approximated tiles. Keep the original image separately.

For a predictable image trial:

1. Save your project, then prepare a 256×240 image with simple repeated shapes and few colors.
2. Choose the intended BG palette colors in Forge before importing.
3. Click **Upload Image** and select the file. Inspect the new scene, its CHR and palette assignments.
4. Check the conversion result and correct the artwork if needed. Use **Analyze Scene → Library** only after you want those converted cells to become reusable terrain.
5. Save the editable project. A successful import does not prove the converted scene will fit every multi-scene ROM build.

**Load .zip Pack** gives `project.json` priority when present, restoring the complete project. A supported raw asset pack needs a BG CHR file of at least 4,096 bytes; optional recognized companions include `sprites.chr`, `palettes.pal`, `sprite_palettes.pal`, `nametable.bin` (960 or 1,024 bytes), `attributes.bin` (64 bytes), `oam.bin`, or `scenes.json`. This restores a project/asset pack; it is not an arbitrary graphics-tool project importer. Save your current project first. Use [Projects and play](Projects_and_Play.html) for archive and native-save details.

**Import ROM** and emulator captures are different from image conversion. A foreign cartridge's art may require a particular mapper/bank/runtime state, and recovered pixels do not establish recovered game behavior. Follow [RE and code](RE_and_Code.html) before choosing a recovery route.

## Troubleshooting and saved checkpoints

| Symptom | What to check |
| --- | --- |
| Painting changes several copies of a tile | They reference the same CHR slot. Copy the drawing to a new slot and change only the desired definition/placement. |
| The sprite is invisible | Check Sprite Bank, nonzero pixels, the selected SP palette, the piece's source scene, tile index and position. Pixel 0 is transparent. |
| A metatile change does not update one scene cell | It may have detached after a raw tile/attribute edit. Select it and inspect linked/unlinked status; use Relink Matches when the content matches. |
| World collision differs from COLLISION | World uses metatile quadrant collision. Inspect the used definition in METATILES. |
| A pose jumps between animation frames | Align each pose's origin; use the same feet anchor convention. |
| An animation shows a missing reference | Restore or reassign the deleted metasprite/source scene. Renaming an asset is different from deleting its identity. |
| Art exists in the editor but not the ROM | Check selected build mode, Build Scene Set or World dependencies, entity bindings and build diagnostics. Rebuild after editing; the already-running ROM does not update itself. |
| The build refuses a capture or crowded sprite frame | Read the exact resource/fidelity error. Reduce assets or use a supported static representation; preview success alone does not establish hardware capacity. |
| A reopened project lost work | Confirm that you completed the actual Save As/download and reopened that JSON, not only a ROM or standalone frame export. Browser Save/Load is a separate store. |

Useful checkpoint names are `terrain-drawn.nesforge.json`, `terrain-linked.nesforge.json`, and `character-bound.nesforge.json`. Save Project As/complete Export keeps the native editable assets and references; a compiled ROM can omit unused assets and is not your only source backup.

## Maintainer audit trail

This guide was checked against the source included in candidate **audio-tool-import-1**. The preserved historical manual remains available; current behavior takes precedence over old version banners or superseded inline hints. This source audit does not, by itself, claim a fresh browser replay of every interaction above.

| Source location | Guidance checked |
| --- | --- |
| `app/src/shell-prefix.html` | Static CHR, Scene, Sprite, Collision and Animation labels. |
| `app/src/legacy/00-editor.js`, `02-interaction-bootstrap.js` | Scene ownership, paint/eyedrop, palette/attribute editing, tile clipboard, entity fields, sprite controls, image conversion, ZIP recognition and shortcuts. |
| `app/src/legacy/03-runtime-capture.js`, `04-saveas-chr.js` | Native atlas/capture controls, static-copy boundary, actual CHR preview semantics and Save As. |
| `app/src/legacy/05-foundation.js`, `06-integration.js` | Build inclusion/order, camera X/Y/Follow, manual 8×16 scene sprites. |
| `app/src/legacy/07-metatiles.js`, `08-world.js` | Definition identity, sampling/propagation, detached cells, collision stores and World reference reconciliation. |
| `app/src/legacy/13-metasprites.js` through `19-entity-codec.js` | Composer, frame sources, contacts/events, binding validation, preview and persistence. |
| `app/src/legacy/21-config165.js`, `26-project166.js`; `app/src/world/world-compiler.js` | Fresh-project defaults, required gameplay references, current World collision/animation/output limits. |
| `app/src/audio/audio-ui.js`, `app/src/services/documentation.js` | Current runtime sound handoff and current documentation ownership. |
| `tester-kit/alpha11-review-1/Manual.md`, `Reference/Operator_Reference.md` | Existing workshop intent and retained control descriptions, reconciled with the active source. |

