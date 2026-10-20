# NES Forge 1.7 — From Scratch: Build Your First Playable World

**Target release:** NES Forge 1.7 — World Runtime  
**Starting point:** a completely blank **New Project**  
**No imported `.json`, no prebuilt Scout project, no ROM required.**

This tutorial teaches the actual authoring chain needed to turn a blank project into a running multi-screen NES World:

```text
BACKGROUND
CHR SHEET → SCENE / COLLISION → METATILES → WORLD

PLAYER
Sprite CHR → METASPRITES → ANIM → ENTITY STUDIO

GAME
WORLD + Player bindings → WORLD RUNTIME → Build & Run
```

The first goal is deliberately small: a **two-screen side-view World** with solid ground, a visible player, left/right movement, jumping, attack animation, and automatic whole-screen transition when the player walks into screen 2. After that works, the tutorial adds a **second World and an Up-activated Exit/Spawn link**, which is the same basic traversal structure used by the supplied Scout World example.

> **Important:** WORLD Runtime does not infer your Player, start marker, or animation states. You author those pieces in their normal tabs, then connect them explicitly in **WORLD → WORLD RUNTIME**.

---

## 1. What each tab contributes

You do not have to use every NES Forge tab to make a World Runtime game.

| Tab | What you use it for in this tutorial |
| --- | --- |
| **SCENE** | A source/staging scene for BG art, palettes, metatile samples, and the Player entity definition. The World map itself is authored in WORLD. |
| **CHR SHEET** | Draw 8×8 background tiles and 8×8 sprite tiles. |
| **COLLISION** | Mark source BG tiles as Empty or Solid before capturing them into metatiles. |
| **METATILES** | Turn 2×2 groups of BG tiles into reusable 16×16 terrain definitions with four collision quadrants. |
| **WORLD** | Paint multi-screen maps, place Spawn/Entrance/Exit markers, optional Rooms and Cameras, and configure World Runtime. |
| **SPRITES** | Optional for this workflow. Useful for raw OAM scene sprites, but the Player can be built directly in METASPRITES. |
| **METASPRITES** | Assemble reusable player poses from Sprite CHR pieces and define the origin/feet anchor. |
| **ANIM** | Turn metasprite poses into timed animations. World Runtime requires `idle`, `walk`, and nonlooping `attack`; `jump` is optional. |
| **ENTITY STUDIO** | Create a Player entity and bind named states to animations. |
| **ATTR MAP** | Optional. Useful for scene palette layout. A metatile captures the palette row of the source 16×16 cell. |
| **AUDIO** | Authoring exists, but World Runtime 1.7 does not yet execute tracker music/SFX. |
| **CODE** | Leave blank for World Runtime. World Runtime generates its own code. |
| **EMULATOR** | Runs the built ROM. |
| **TECH DOCS / DISASM** | Reference/debug tools, not required for this tutorial. |

The most important distinction is:

> **SCENE is the source asset/staging scene. WORLD is the actual multi-screen level.**

Painting something into SCENE does not automatically make it part of your World. SCENE supplies art, palettes, metatile definitions, entities, and animation sources. WORLD decides where those reusable terrain blocks exist in the executable map.

---

# PART I — Start completely blank

## 2. Create the project

1. Open **NES Forge 1.7**.
2. Click **New Project**.
3. Stay with the default scene, **My First Room**.
4. Make sure **CODE** is empty.

A blank New Project starts with:

- one Side-View source scene,
- no Worlds,
- no entities,
- no metasprites,
- no animations,
- blank BG CHR,
- blank Sprite CHR,
- World Runtime disabled.

You can rename the project/scene later. For the tutorial, `My First Room` is fine.

---

# PART II — Create terrain from your own CHR

If you already know how to draw CHR tiles, this section is the important bridge from **CHR** into **METATILES** and then **WORLD**.

## 3. Draw one background tile

Open **CHR SHEET**.

1. Select **BG Bank ($0000)**.
2. Select tile **$01**.
3. Draw any visible 8×8 ground/brick pattern.
4. Leave tile **$00** blank. We will use `$00` as empty/background space.

Your artwork does not have to match Scout. Mechanically, we only need:

- `$00` = empty-looking tile,
- `$01` = visible ground tile.

Choose/edit a BG palette so `$01` is visible.

### Checkpoint

You should now have at least one visible BG tile in CHR SHEET.

---

## 4. Tell NES Forge that tile $01 is solid

Open **COLLISION**.

1. Under **Active Property**, choose **1 - Solid (blocks all)**.
2. In **Tile Assignments**, click BG tile **$01**.
3. Leave `$00` as **0 - Empty**.

For World Runtime 1.7, executable terrain may use **Empty** and **Solid** collision. Other authored collision types are retained by NES Forge but are not currently valid for World Runtime terrain.

---

## 5. Build a 16×16 “Ground Surface” sample in SCENE

A metatile is four 8×8 BG tiles:

```text
TL  TR
BL  BR
```

We are going to make a useful Scout-style ground surface whose top 8 pixels are empty and bottom 8 pixels are solid:

```text
$00  $00      collision: Empty  Empty
$01  $01                 Solid  Solid
```

### In CHR SHEET

1. Select **BG Bank**.
2. Click tile `$01` so it becomes the current Scene brush.

### In SCENE

At the **top-left 16×16 cell** of the Scene:

1. Leave the top-left 8×8 tile as `$00`.
2. Leave the top-right 8×8 tile as `$00`.
3. Paint `$01` into the bottom-left 8×8 position.
4. Paint `$01` into the bottom-right 8×8 position.

You have just created a temporary 16×16 source sample.

---

## 6. Convert that sample into a reusable metatile

Open **METATILES**.

1. Use **Select cells**.
2. Click the 16×16 sample cell you just made.
3. Click **+ From Selected Cell**.
4. Rename it **Ground Surface**.
5. Set Category to `terrain` if desired.

The Selected Metatile should represent:

```text
CHR QUADRANTS
TL = $00
TR = $00
BL = $01
BR = $01

COLLISION QUADRANTS
TL = Empty
TR = Empty
BL = Solid
BR = Solid
```

Because `$01` was marked Solid in COLLISION before the metatile was created, NES Forge should capture that collision into the bottom quadrants.

### Detach the sample cell

Click **Detach Selected Cell**.

This is useful for a from-scratch workflow: it keeps **Ground Surface** in the Metatile Library, but prevents this temporary source sample from automatically seeding the first World when you press **+ World**.

> If you do not detach sample cells, that is not data loss or a bug. A new World is initially seeded from the source scene's linked 16×15 `metaMap`, so those linked sample cells can appear in the first World. You can simply erase them there. Detaching first gives you a cleaner blank World.

---

## 7. Create a full Solid Block metatile

We also want a completely solid 16×16 block.

### In SCENE

Use `$01` to turn the same temporary 16×16 source cell into:

```text
$01  $01
$01  $01
```

### In METATILES

1. Select that same 16×16 cell.
2. Click **+ From Selected Cell**.
3. Rename the new definition **Solid Block**.
4. Confirm all four Collision Quadrants are **Solid**.
5. Click **Detach Selected Cell** again.

You now have a real reusable tileset even though the Scene itself is only acting as a source/staging area.

### Checkpoint

In METATILES you should have at least:

- **Ground Surface** — bottom half Solid,
- **Solid Block** — all four quadrants Solid.

The Scene's linked map can be empty; the **library definitions remain available**.

---

# PART III — Build the actual multi-screen World

## 8. Create your first World

Open **WORLD**.

Click **+ World**.

Then explicitly verify/set:

- **Name:** `My First World`
- **Tileset Scene:** `My First Room`
- **Width:** `2` screens
- **Height:** `1` screen

A World screen is **16×15 metatile cells**. Therefore this World is:

```text
32 cells wide × 15 cells tall
512 px wide × 240 px tall
```

The World editor only shows one NES screen viewport at a time. Use the left/right View arrows or the minimap to move between screen 1 and screen 2.

### If METATILE BRUSH is empty

Stop here and check **Tileset Scene**.

The selected scene must contain a Metatile Library. The WORLD sidebar should say something like:

> `My First Room · 2 metatiles available.`

If it says **0 metas**, return to METATILES and create the library first, or choose the correct Tileset Scene.

---

## 9. Paint a floor across both screens

Use **WORLD TOOLS → Paint** or **Rect**.

A reliable beginner layout is:

- metatile row **12** = `Ground Surface`
- rows **13–14** = `Solid Block`

This mirrors the structure used by the 1.7 Scout World fixture: the playable surface is at row 12, with additional solid terrain below it.

### Screen 1

1. Choose **Ground Surface** in the Metatile Brush/Palette.
2. Paint row 12 across all 16 columns.
3. Choose **Solid Block**.
4. Paint rows 13 and 14 across all 16 columns.

### Screen 2

1. Click the **→** View button or click the second screen in the minimap.
2. Repeat the same three terrain rows.

You should now have a continuous floor spanning two NES screens.

> Empty World cells are visually blank and collision-empty. You do not need to fill the sky with an “empty” metatile.

---

## 10. Place the start Spawn

Still in WORLD:

1. Choose **WORLD TOOLS → Spawn**.
2. On screen 1, click approximately **cell X=3, Y=12**.
3. Switch back to **Select** and click the Spawn if you want to rename it, for example `Player Start`.

World Runtime uses the marker's cell to calculate the player's centered-feet position:

```text
world pixel X = cell X × 16 + 8
world pixel Y = cell Y × 16 + 8
```

For `(3,12)`, the starting feet are approximately `(56,200)` pixels in the World.

The Player body must fit inside the World and must not intersect Solid collision at the start marker.

### Important distinction

The **Spawn marker** determines where World Runtime starts the Player.

The Player entity's X/Y in ENTITY STUDIO identifies the authored source entity; it is **not** the World starting position.

---

# PART IV — Build the player from your own sprite CHR

## 11. Draw one sprite tile

Open **CHR SHEET**.

1. Choose **Sprite Bank ($1000)**.
2. Select tile **$10**.
3. Draw a simple visible 8×8 character/icon.
4. Choose/edit a Sprite palette so it is visible.

For the first successful build, one 8×8 piece is enough. You can make a larger Scout-style character afterward.

---

## 12. Turn the sprite tile into a metasprite pose

Open **METASPRITES**.

1. Click **+ New frame**.
2. Name it **Hero Stand**.
3. Confirm **Source scene = My First Room**.
4. Use **Sprite size = 8 × 8**.
5. Click **+ Piece**.
6. Set the piece:
   - Tile = `$10` / decimal `16`
   - X = `0`
   - Y = `0`
   - Palette = `Sprite palette 0` or the palette you used
7. Click **Set origin at feet**.

For a single 8×8 piece at `(0,0)`, Set origin at feet places the anchor at the horizontal center and bottom of the artwork: approximately `(4,8)`.

That cyan origin cross is important. World Runtime positions and facing are based on the reusable frame origin, not on the upper-left corner of the tile.

### Checkpoint

You should see **Hero Stand** in the Metasprite Composer and no missing-source warning.

---

# PART V — Create the required animation states

## 13. Make `idle`

Open **ANIM**.

1. Click **+ Add Animation**.
2. Name: `Hero Idle`
3. State: `idle`
4. **Loop:** On
5. Select the first frame.
6. Set Duration to about `12` ticks/frames.
7. Set **Frame source = Metasprite**.
8. Set **Metasprite = Hero Stand**.

One animation frame is enough for the first build.

---

## 14. Make `walk`

Create another animation:

- Name: `Hero Walk`
- State: `walk`
- Loop: **On**
- Duration: about `8`
- Frame source: **Metasprite**
- Metasprite: **Hero Stand**

For now it is okay for `walk` to reuse the exact same art as `idle`. We are proving the complete authoring chain first.

Later, create `Hero Step A` / `Hero Step B` metasprites and add multiple frames to this animation.

---

## 15. Make `attack`

Create a third animation:

- Name: `Hero Attack`
- State: `attack`
- **Loop: Off**
- Duration: about `8`
- Frame source: **Metasprite**
- Metasprite: **Hero Stand**

This detail is mandatory:

> **World Runtime requires the Player's attack animation to be nonlooping.**

World Runtime 1.7 plays this animation when you press **X / NES B**, but it does not yet apply generic World target damage.

### Optional `jump`

You may create and bind a `jump` state. If you do not, World Runtime falls back to idle artwork while airborne.

---

# PART VI — Create the Player entity and bind the animations

## 16. Add a Player in ENTITY STUDIO

Open **ENTITY STUDIO**.

Under **PLACE AN ENTITY**:

1. Type = **Player**
2. Scene X = `48`
3. Scene Y = `200`
4. Click **Add at X / Y**.

Those Scene coordinates are reasonable source-authoring values, but remember: the World Spawn determines the runtime start position.

---

## 17. Bind the required states

With the Player selected, under **STATES** create these bindings exactly:

| State name | Animation |
| --- | --- |
| `idle` | Hero Idle |
| `walk` | Hero Walk |
| `attack` | Hero Attack |

For each one:

1. Enter the lowercase State name.
2. Choose the matching Animation.
3. Click **Assign state**.

Then set:

- **Default state:** `idle`
- **Default facing:** `Right`

The state names matter. World Runtime looks specifically for:

```text
idle
walk
attack
```

and optionally:

```text
jump
```

If any required state is missing, the World build rejects instead of guessing.

---

# PART VII — Connect everything in WORLD RUNTIME

## 18. Enable World Runtime

Return to **WORLD** and find the **WORLD RUNTIME** section near the bottom of the sidebar.

Check:

> **Build this project as World Runtime**

Then explicitly choose:

- **Start world:** `My First World`
- **Start marker:** your `Player Start` / Spawn marker
- **Player source scene:** `My First Room`
- **Player:** the Player entity you created

NES Forge intentionally does **not** infer these selections from whichever object happens to be selected in another tab.

---

## 19. Set movement and body values

Expand **Movement and collision body**.

For the tiny one-piece tutorial character, use:

| Setting | Tutorial value |
| --- | ---: |
| Move speed | 2 |
| Jump speed | 9 |
| Gravity | 1 |
| Maximum fall | 6 |
| Body width | 8 |
| Body height | 8 |

A larger Scout-like player can use a larger movement body. The supplied Scout profile uses approximately:

```text
Body width  = 12
Body height = 22
```

World Runtime body width must be even because Player X is the center of the feet.

The WORLD RUNTIME status should become green and report that the start/player references are valid. Full map/collision/resource validation happens during Build & Run.

---

# PART VIII — Build and play your own World

## 20. Build & Run

Click **Build & Run** in WORLD RUNTIME or the main toolbar.

NES Forge should compile the project as the **World** backend and load the generated mapper-0 ROM in the bundled emulator.

Controls:

| Key | Action |
| --- | --- |
| Left / Right | Move |
| Z / NES A | Jump |
| X / NES B | Play attack animation |
| Up | Use a linked Entrance/Exit |
| Enter / Start | Restart at configured start marker |

Walk to the right edge of screen 1.

When the Player crosses into the second World screen, the runtime should change the displayed NES screen and continue the same World-space movement/physics.

> **1.7 uses complete 256×240 screen transitions. It does not yet do smooth pixel scrolling.**

### What you have built at this point

Without importing any prebuilt project, you have authored:

```text
Your BG CHR
   ↓
Your Solid collision
   ↓
Your reusable 16×16 Metatiles
   ↓
Your 2-screen World
   ↓
Your Spawn

Your Sprite CHR
   ↓
Your Metasprite pose
   ↓
Your idle / walk / attack animations
   ↓
Your Player entity bindings

All of the above
   ↓
World Runtime
   ↓
Generated 6502 NES ROM
```

That is the complete from-scratch path.

---

# PART IX — Extend it into a Scout-style linked World

The supplied Scout World example has two Worlds: a two-screen area and a one-screen area linked by markers. You can create the same structure manually.

## 21. Create World 2

In WORLD:

1. Click **+ World**.
2. Explicitly select **Tileset Scene = My First Room**.
3. Name it `Courtyard`.
4. Width = `1`.
5. Height = `1`.
6. Paint row 12 with **Ground Surface**.
7. Paint rows 13–14 with **Solid Block**.
8. Place a **Spawn** around cell `(4,12)`.
9. Rename it `Courtyard Spawn` if desired.

Your project now has two independent World maps using the same source tileset.

---

## 22. Add an Exit from World 1 to World 2

Select `My First World` in the World dropdown.

1. Move the View to screen 2.
2. Choose **WORLD TOOLS → Exit**.
3. Place it somewhere reachable on the floor, for example around global cell `(25,12)`.
4. Choose **Select** and click the Exit.
5. Under **SELECTION / PROPERTIES**, set:
   - **Target World:** `Courtyard`
   - **Target Marker:** `Courtyard Spawn`

Both destination fields are required.

The destination must be a **Spawn** or **Entrance**.

---

## 23. Optional return link

In `Courtyard`:

1. Place another **Exit** in a reachable floor cell.
2. Select it.
3. Set:
   - Target World = `My First World`
   - Target Marker = your original Player Start Spawn

Build & Run again.

Stand in the Exit cell and press a **new Up press**.

The runtime changes to the target World and positions the Player at the destination marker.

Holding Up through a reciprocal transition does not immediately bounce you back; the runtime requires a new press.

---

# PART X — Rooms and Cameras: when to use them

You do **not** need Rooms or Camera Regions for the first playable World. If no Camera Region matches the Player, World Runtime simply displays the Player's current World screen.

Once basic traversal works, add them deliberately.

## Rooms / Chunks

Rooms describe named World regions. They do not create invisible walls and do not instantiate Scene entities.

Runtime requirements for Room rectangles:

- X and width are aligned to **16 metatile cells** (whole NES screens horizontally),
- Y and height are aligned to **15 metatile cells** (whole NES screens vertically),
- rectangles stay inside the World,
- Room rectangles may not overlap other Rooms.

For a simple 2×1 World, you can use **+ Current Screen** once on screen 1 and once on screen 2.

## Camera Regions

Camera Regions are also whole-screen aligned and may not overlap other Camera Regions.

Modes:

| Mode | Behavior |
| --- | --- |
| `follow` | Display follows Player screen on both axes. |
| `horizontal` | Follows Player screen column; holds the region's first row. |
| `vertical` | Holds first column; follows Player screen row. |
| `locked` | Always shows region's first/top-left screen. |

Cameras choose the displayed screen. They do **not** prevent movement.

A player can therefore move off the displayed screen when using a locked or axis-limited Camera Region; the sprite is clipped rather than wrapped.

---

# PART XI — Turn the tiny player into a Scout-style player

Once the one-piece character works, upgrade the art without changing the World pipeline.

## 24. Build a larger metasprite

In METASPRITES, a Scout-like standing pose can be made from six 8×8 pieces arranged roughly as:

```text
[0][1]
[2][3]
[4][5]
```

That produces a 16×24-pixel character.

A convenient source coordinate layout is:

```text
X = 0 / 8
Y = 0 / 8 / 16
```

Then use **Set origin at feet**. For a 16×24 pose beginning at `(0,0)`, the origin becomes approximately `(8,24)`.

This is the same basic anchor convention used by the Scout reference asset.

## 25. Make distinct poses

Create or duplicate frames such as:

- Hero Idle
- Hero Step A
- Hero Step B
- Hero Attack

Then change ANIM:

- `idle` → one or more Idle frames,
- `walk` → alternate Step A / Step B,
- `attack` → one or more attack frames, Loop off,
- optional `jump` → airborne pose.

You can also add per-frame hitboxes/hurtboxes/events in ANIM. World Runtime 1.7 preserves those records and exposes event masks, but generic World damage/audio/script execution is later work.

---

# PART XII — Where the other tabs fit

## ATTR MAP

Use ATTR MAP / Scene palette editing if your source 16×16 sample must use a specific BG palette row. A Metatile stores one NES palette row along with its four tile IDs.

## SPRITES

The SPRITES tab edits raw Scene OAM. For World Runtime Player authoring, you can skip it and compose frames directly in METASPRITES.

Alternatively, build a pose in SPRITES and use **METASPRITES → Capture scene OAM** to turn the visible OAM pieces into a reusable frame.

## AUDIO

You may author tracker data, but **1.7 World Runtime does not play it yet**. Do not interpret silence as a broken project.

## CODE

World Runtime generates its own code. If custom assembly exists in CODE, the WORLD RUNTIME status rejects the build and tells you to save/clear the custom assembly first.

## COLLISION

The COLLISION tab is useful when creating metatiles from Scene samples because METATILES captures the source tile properties into four 8×8 collision quadrants.

After a metatile exists, you can also edit its four collision quadrants directly in METATILES.

---

# PART XIII — Common from-scratch failures

## “Tileset has no metatiles” / empty World brush

**Cause:** The World points to a Scene with no Metatile Library.

**Fix:**

1. Open METATILES on the intended Tileset Scene.
2. Create definitions with **+ From Selected Cell** or **Analyze Scene → Library**.
3. Return to WORLD.
4. Explicitly select the correct **Tileset Scene**.

---

## My new World contains weird blocks I used only as metatile samples

**Cause:** **+ World** seeds its first screen from the source Scene's linked `metaMap`.

**Fix:** Before creating the World, use **Detach Selected Cell** on temporary source samples, or erase those cells in WORLD after creation.

The Metatile Library itself is not deleted by detaching a Scene cell.

---

## “The player needs an `idle` / `walk` / `attack` animation binding”

In ENTITY STUDIO, bind these exact lowercase state names:

```text
idle
walk
attack
```

`jump` is optional.

---

## “The player attack animation must be nonlooping”

Open ANIM → Hero Attack and turn **Loop** off.

---

## Player is invisible

Check:

1. The artwork is in **Sprite Bank**, not BG Bank.
2. The metasprite piece uses the correct Sprite CHR tile.
3. The piece uses a visible Sprite palette.
4. The animation frame source is **Metasprite**.
5. ENTITY STUDIO binds that animation to the required state.

---

## Player appears above/below where I expect

Check the Metasprite **origin** and World Runtime **body height**.

The Player's World position represents the **center of the feet**, not the top-left corner of the art.

Use **Set origin at feet** in METASPRITES as a reliable starting point.

---

## Starting spawn intersects solid collision

Move the Spawn higher or change the collision layout.

For the terrain pattern in this tutorial:

```text
row 12 = Ground Surface (top empty / bottom solid)
row 13 = Solid Block
row 14 = Solid Block
```

placing the Spawn at approximately `Y=12` is appropriate.

The compiler does not silently move an invalid Spawn to a nearby safe position; it rejects the build.

---

## I painted collision in SCENE but WORLD behaves differently

World Runtime executes the collision stored in the **Metatile definitions used by WORLD**.

SCENE tile properties help create those collision quadrants when you capture a metatile, but WORLD is not executing the SCENE nametable as the level.

---

## Build complains about custom assembly

Clear CODE. World Runtime 1.7 generates its own engine code.

---

## It changes screens instead of smooth scrolling

Expected in 1.7.

World Runtime 1.7 tracks World-space movement and changes the displayed camera by complete NES screens. Smooth scrolling is not implemented yet.

---

## My Enemy/NPC entity does nothing in World Runtime

Expected in 1.7.

The executable World profile currently runs **one bound Player**. Other entities remain authored project data for later generalized gameplay/runtime work.

---

# PART XIV — Save and reopen your work

## Save the editable source

Use normal project Save / Save Project As / Download Project workflows to preserve the complete authoring project.

## Export the ROM

Use **Build .NES ROM** when you want the generated cartridge file without immediately running it.

## Reopen a 1.7 Forge World ROM

Use **Open Forge ROM**, not append-style Import ROM, for the new World Runtime layout.

A 1.7 World ROM carries a checked compressed authoring-source record, allowing NES Forge to reconstruct the editable project when reopened.

**Run Original ROM** plays the retained opened/imported ROM bytes independently of your current edits.

---

# PART XV — The entire blank-project recipe on one page

Use this as the quick checklist after you have completed the tutorial once.

1. **New Project**.
2. **CHR SHEET / BG Bank:** draw terrain tiles.
3. **COLLISION:** mark terrain source tiles Empty/Solid.
4. **SCENE:** arrange temporary 2×2 BG tile samples.
5. **METATILES:** `+ From Selected Cell`; name definitions; confirm collision quadrants; detach temporary sample cells if you want a blank World seed.
6. **WORLD:** `+ World`; choose the Tileset Scene; choose dimensions; paint terrain.
7. **WORLD:** place at least one **Spawn** or **Entrance** for the start.
8. **CHR SHEET / Sprite Bank:** draw Player tiles.
9. **METASPRITES:** make reusable pose(s); **Set origin at feet**.
10. **ANIM:** create `idle`, `walk`, and **nonlooping** `attack`; assign metasprite frames. Optional `jump`.
11. **ENTITY STUDIO:** create a **Player**; bind `idle`, `walk`, `attack`; choose default state/facing.
12. **WORLD → WORLD RUNTIME:** Enable; choose Start World, Start Marker, Player source Scene, Player; set movement/body dimensions.
13. Leave **CODE** blank.
14. **Build & Run**.
15. After the first build works, add more screens, a second World, Exit/Entrance links, Rooms, Camera Regions, larger metasprites, and richer animation.

---

# Verification note

The minimal workflow documented above was exercised against the supplied **NES Forge 1.7 — World Runtime** release using the application's actual blank-project action and registered editor control handlers in the project's automated full-app VM harness. The scratch project was authored without loading a project fixture, compiled through the World backend into a **40,976-byte NES ROM**, booted in the bundled emulator, and the Player traversed from World screen 0 into screen 1 with no application errors.

That verification does **not** replace manual browser QA for physical mouse/keyboard behavior, layout, native file pickers, or Save As dialogs. It does establish that the documented authoring chain is accepted by the 1.7 project model/compiler/runtime rather than depending on the supplied Scout JSON.

---

## What this tutorial intentionally does not require

You did **not** need to:

- import Scout,
- import any `.nesforge.json`,
- paste project data,
- write 6502 assembly,
- manually edit project JSON,
- create Scene OAM sprites,
- create a Room or Camera Region,
- create music,
- use RE Mode.

Those systems can be introduced after the first complete authoring loop works.

The key lesson is that NES Forge 1.7 already has a complete manual chain from **blank CHR and blank project → reusable terrain and character assets → multi-screen World → generated playable NES ROM**. The tabs are not independent islands; the workflow is the set of explicit references connecting them.
