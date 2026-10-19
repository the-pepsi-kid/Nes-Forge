# Your first NES game in Forge

**Desktop first-session tutorial · NES Forge 2.0.0-alpha.11 / audio-tool-import-1**

Create your own terrain and a small character, build a two-screen World, then save and reopen the editable project. Work through steps 1–9. This exercise uses established World Runtime controls; the newer source-intake and native-recovery features are separate optional workflows.

This tutorial accompanies the `NES_Forge.html` in this kit. If a control or result differs from the instructions, note the step, what you expected and what you saw in the feedback form.

For composing music or looking up a workspace, use the [current user guide](Guide.html). This first-game tutorial remains a deliberately silent exercise.

## Before you begin

1. Extract the package into a normal folder. Open **[NES_Forge.html](NES_Forge.html)** in your browser and keep this tutorial or its [printable PDF](Tutorial.pdf) beside it.
2. If Forge restores previous work, use **Save Project As…** to preserve it first.
3. Click **New Project** and confirm replacing the current workspace. The scene should be **My First Room**. The default project name is **My First NES Game**.
4. Check these settings in their separate locations (the two checkboxes are **not in CODE**):

| Location | Setting for this tutorial |
| --- | --- |
| **CODE** tab | Confirm the code editor is empty. |
| **AUDIO** tab → **NES Runtime** | Leave **Compile Audio Runtime** unchecked. |
| **SCENE** tab → **Gameplay** → **GAMEPLAY CORE · TYPED TABLES** | Leave **Enable canonical Gameplay Core** unchecked. Scroll the sidebar and expand the section if needed. |

You will enable **World Runtime** later in the **WORLD** tab.

**Checkpoint:** One source scene; no Worlds, entities, metasprites, or animations; blank background and sprite artwork. If you see old art or populated libraries, stop and confirm that you started a new project.

**A useful habit:** After changing a text or number field, press Tab or click outside it to commit the edit. Scroll the right sidebar when controls appear missing. Several important sections are below the first screenful.

### What the tabs contribute

| You make | In these tabs | Where it becomes playable |
| --- | --- | --- |
| Terrain | CHR SHEET, COLLISION, SCENE, METATILES | WORLD |
| Character artwork and animation | CHR SHEET, METASPRITES, ANIM | ENTITY STUDIO bindings |
| Starting position and movement | WORLD → WORLD RUNTIME | Build & Run → EMULATOR |

SCENE will serve as a small source-art workbench. WORLD will contain the actual level. A preview in an authoring tab is not a live view of the running ROM.

## 1. Draw a background tile

1. Open **CHR SHEET** and choose **BG Bank ($0000)**.
2. Click tile **$01**, the second tile in the top row. Confirm that the **Editing Tile** label says **$01**.
3. In **Pixel Color (1–4)**, select the second or third swatch. Draw a visible brick or ground pattern in the enlarged 8×8 editor. For a simple first tile, fill the square with one color and add a different color along its top edge.
4. Leave tile **$00**, the first tile, blank.
5. Use **Preview Palette** row 0 for this exercise. If the colors are hard to distinguish, use its pencil controls to choose contrasting NES colors. Clicking a palette row selects it; the pencil changes the actual color.

**Checkpoint:** $01 visibly contains your drawing. $00 remains empty-looking. You have edited real tile pixels, not merely changed a preview setting.

## 2. Give that tile solid collision

1. Open **COLLISION**.
2. Under **Active Property**, select **1 - Solid (blocks all)**.
3. In **Tile Assignments**, click tile **$01**. Leave $00 as **0 - Empty**.

We will capture this collision into the metatiles next. The first World uses only Empty and Solid terrain collision.

## 3. Make two reusable terrain blocks

A metatile combines four 8×8 tiles into one 16×16 block. The first block leaves its upper half empty; the second is entirely solid.

### Make Ground Surface

1. Return to **CHR SHEET → BG Bank ($0000)** and select $01 again so it is the current Scene brush.
2. Open **SCENE**. Turn on the top toolbar's **Grid** checkbox if needed.
3. At the very top-left corner, leave the first two tiles in the first row blank. Paint $01 into the first two tiles of the second row. These are tile coordinates **(0,1)** and **(1,1)**; counting begins at zero.
4. Open **METATILES**. Set **Tool** to **Select cells** and click the top-left 16×16 cell containing that sample.
5. Click **+ From Selected Cell**. Under **SELECTED METATILE**, set **Name** to **Ground Surface**.
6. Check the quadrant fields against this table:

| Quadrant | CHR tile number | Collision |
| --- | ---: | --- |
| TL | 0 | Empty |
| TR | 0 | Empty |
| BL | 1 | Solid |
| BR | 1 | Solid |

7. Click **Detach Selected Cell**. This keeps the library definition and the visible source drawing, but removes the cell's link so it will not seed the new World.

### Make Solid Block

1. Return to **SCENE** with $01 selected. Paint the first two tiles in the first row too. The same top-left sample now contains four $01 tiles.
2. Return to **METATILES**, select the same top-left cell, and click **+ From Selected Cell**.
3. Name the new definition **Solid Block**. Its four CHR quadrant fields must all read **1**, and its four collision quadrants must all be **Solid**.
4. Click **Detach Selected Cell** again.

**Checkpoint:** The Metatile Library contains **Ground Surface** and **Solid Block**. The first has collision only in its bottom half. The second is fully solid. The sample art still visible in SCENE is expected.

**Save checkpoint 1:** Click **Save Project As…**. Save a portable JSON file such as **My_First_NES_Game_01_Terrain.json**. Finish the Save As dialog using **Choose location & save…** or its explicit browser-download option. Browser **Save** is useful too, but the portable file is your backup.

## 4. Paint a two-screen World

1. Open **WORLD** and click **+ World**.
2. Explicitly select **Tileset Scene: My First Room**.
3. Fill in three **separate fields** in the World sidebar:
   - **Name:** enter only `My First World`.
   - **Width:** enter `2`, then press Tab to commit it.
   - **Height:** enter `1`, then press Tab.

   Confirm the VIEW status reads **2×1 screens · 32×15 metatiles · view cell 0,0**. Writing “Width: 2” in the Name field does not resize the World.
4. Confirm that the World sidebar reports **2 metatiles available**. If its brush is empty, check Tileset Scene and the library you just made before proceeding.

The World has two screens side by side. Each screen contains **16 columns × 15 rows** of metatiles. Coordinates begin at zero: its rows are 0–14. The World editor displays one screen at a time.

### Paint screen 1

1. In **WORLD TOOLS**, choose **Paint**.
2. Choose **Ground Surface** in **METATILE BRUSH** or **METATILE PALETTE**.
3. Paint all 16 cells of **row 12**, the third row from the bottom.
4. Choose **Solid Block** and paint every cell of **rows 13 and 14**, the bottom two rows.

### Paint screen 2

1. Use the **→** View button to move to the second screen. The view cell should begin at **16,0**.
2. Repeat the same floor: Ground Surface across row 12; Solid Block across rows 13 and 14.
3. Use **←** to return to the first screen, view cell **0,0**.

**Checkpoint:** A continuous floor spans both screens, with blank sky above. This paints **96 cells**: 16 columns × 3 rows × 2 screens. You do not need an empty metatile to fill the sky.

### Place the starting marker

1. Choose **WORLD TOOLS → Spawn**.
2. Click the **fourth column from the left, third row from the bottom** on screen 1: cell **X=3, Y=12**.
3. Choose **Select** and click the marker. Under **SELECTION / PROPERTIES**, verify **Kind: spawn** and **X / Y: 3 / 12**. You may name it **Player Start**.
4. Leave **Target World** and **Target Marker** at none. This is a starting Spawn, not a travel link.

The marker places the center of the Player's feet at pixel **(56,200)**. The upper half of the Ground Surface cell is empty, so the tiny Player can stand directly above its solid lower half.

**Save checkpoint 2:** Save as **My_First_NES_Game_02_World.json**.

## 5. Draw your character and compose its pose

### Draw one sprite tile

1. Open **CHR SHEET** and select **Sprite Bank ($1000)**.
2. Select tile **$10**: first column of the second row.
3. Draw a small 8×8 character or icon. Use the second, third, or fourth pixel swatch; sprite color index 0 is transparent.
4. Use **Sprite palette 0** for this exercise and choose contrasting colors if necessary.

**Sprite color limit:** Each sprite piece uses three visible colors plus transparency. The first pixel swatch is transparent; the other three select colors from its sprite palette. Additional pieces can use different palettes in a larger metasprite, but use one tile and Sprite palette 0 for this first pass.

**Tile-number reminder:** Sheet labels are hexadecimal. **$10 means decimal 16**. Enter **16** in ordinary numeric fields.

### Make Hero Stand

1. Open **METASPRITES** and click **+ New frame**.
2. Set **Name: Hero Stand**, **Source scene: My First Room**, and **Sprite size: 8 × 8 · one tile / OAM slot**.
3. Click **+ Piece**.
4. In the selected piece's properties, set the first **Tile / lower** field to **16**, **X / Y** to **0 / 0**, and **Palette** to **Sprite palette 0**. The lower-tile field is unused in 8×8 mode.
5. Click **Set origin at feet**. For one 8×8 piece at 0,0, **Origin X / Y** should become **4 / 8**.

**Checkpoint:** Your character is visible in the composer. The cyan origin marks its centered feet. If it is blank, check Sprite Bank, decimal tile 16, nontransparent pixels, and the selected palette.

## 6. Create the three required animations

You can use the same pose for all three states on this first pass. Walking will move the character, but its artwork will stay the same until you add different poses later.

Open **ANIM**. For each row below, click **+ Add Animation**, fill in **Name** and **State**, set **Loop**, select the first frame, and set **Duration**, **Frame source**, and **Metasprite**.

| Name | State | Loop | Duration | Frame source | Metasprite |
| --- | --- | --- | ---: | --- | --- |
| Hero Idle | idle | On | 12 | Metasprite | Hero Stand |
| Hero Walk | walk | On | 8 | Metasprite | Hero Stand |
| Hero Attack | attack | **Off** | 8 | Metasprite | Hero Stand |

One frame per animation is enough. **Hero Attack must be nonlooping**, even though it currently reuses the same artwork. You can leave **Flip on reverse** off for this exercise. A jump animation is optional; this build can reuse idle artwork while airborne.

**Checkpoint:** Three animations exist. Each first frame points to **Hero Stand**, and Hero Attack has Loop unchecked.

## 7. Create a Player and assign its states

1. Open **ENTITY STUDIO**. Confirm its **Scene** is **My First Room**.
2. Under **PLACE AN ENTITY**, set **Type: Player**, **Scene X / Y: 48 / 200**, and click **Add at X / Y**.
3. With that Player selected, find **STATES**. For each row, enter **State name**, select its **Animation**, and click **Assign state**:

| State name | Animation |
| --- | --- |
| idle | Hero Idle |
| walk | Hero Walk |
| attack | Hero Attack |

4. Under **ENTITY DEFAULTS**, choose **Default state: idle** and **Default facing: Right**.

The state names must be exactly **idle**, **walk**, and **attack**. Naming an animation does not automatically bind it to this Player.

**Checkpoint:** The selected Player shows all three assigned states. The Scene X/Y locates the source entity; the World Spawn determines where it starts in your level.

**Save checkpoint 3:** Save as **My_First_NES_Game_03_Player.json**.

## 8. Connect World Runtime and build

Return to **WORLD** and scroll the sidebar to **WORLD RUNTIME**.

1. Check **Build this project as World Runtime**.
2. Set **Start world: My First World**.
3. Set **Start marker** to your Spawn, either **Player Start [spawn]** or **spawn 1 [spawn]**.
4. Set **Player source scene: My First Room**.
5. Set **Player** to **Player 1**, the entity you created in ENTITY STUDIO. It is expected to be the only option when you have created only one Player.
6. Expand **Movement and collision body** and explicitly set:

| Setting | Value |
| --- | ---: |
| Move speed | 2 |
| Jump speed | 9 |
| Gravity | 1 |
| Maximum fall | 6 |
| Body width | **8** |
| Body height | **8** |

The default body is larger than this first character. Change both dimensions to 8; changing the artwork alone does not resize collision.

**Checkpoint:** Status says the start and player references are valid. This is a reference check; Build & Run still validates the map, collision, animations, and ROM capacity.

Click **Build & Run**. Forge should switch to **EMULATOR** with your compiled World running. Click the game display if the keyboard focus is still in an editor field. Use **Run** if playback is paused.

| Control | Expected result in this tutorial |
| --- | --- |
| Left / Right | Move along the floor |
| Z / NES A | Jump and land on the floor |
| X / NES B | Play the nonlooping attack state; with the same pose, no art change is visible |
| Enter / NES Start | Restart at the configured Spawn |

Walk all the way to the right edge of screen 1. The game should change to screen 2 and continue moving on its floor. This profile changes whole NES screens; it does not smoothly scroll.

**First-session success:** Your own terrain and Player appear; movement and jumping work; the second screen is reachable; Enter returns to the starting position. The World is deliberately silent because you have not authored or enabled sound. This is a traversal exercise, not a combat demonstration.

## 9. Save, reopen, and keep the result

1. Save the completed project as **My_First_NES_Game_04_Playable.json** using **Save Project As…**. Confirm the file actually exists in your chosen folder or browser downloads.
2. Use **Build .NES ROM** to save **My_First_NES_Game.nes** for playback testing. Keep the native JSON too; the ROM is executable output.
3. Pause the emulator. After confirming your JSON backup exists, use **Open Project** to open that saved JSON.
4. Check the two-screen World, both metatiles, Hero Stand, all three animations, and the World Runtime selections. Click **Build & Run** again.

**Checkpoint:** The reopened native project builds and plays the same authored World. You now have both an editable project backup and a generated ROM.

When you edit terrain, artwork, or settings, build again to see the change in the ROM. **Run Original ROM** plays retained cartridge bytes and does not compile your current edits.

## 10. Optional: try your result on a phone

Steps 1–9 complete the desktop assignment. A phone is optional. The ZIP includes
no hosted URL; if local access fails, mark **Blocked** and ask the kit sender
for a link to this exact build. Do not bypass a browser warning to continue.

Copy your generated `.nes` file to the phone. Open the same Forge build and
choose **EMULATOR → Load ROM**, then **Run** and **Play view**. Use **Show touch**
if needed. Test held direction plus A, release, rotation, switching away and
returning, and leaving Play view. Record model, OS, browser, delivery path and
the ROM SHA-256. Fullscreen can fall back to expanded Play view.

This tutorial ROM has no authored sound. Silence here cannot test Audio.
Use a known sound-bearing fixture supplied separately for listening or lag checks.
Do not mark physical controllers tested unless you use one.

## If a checkpoint fails

| Symptom | First thing to check |
| --- | --- |
| Right View arrow does not move | Check the actual Width field is 2, press Tab, and confirm VIEW says 2×1 screens. |
| World brush is empty | Tileset Scene must be My First Room, and its library must contain the two metatiles. |
| Source sample appears at the top of a new World | Detach the source cell before + World, or erase the unwanted placement in WORLD. |
| Player is invisible | Sprite Bank; tile number 16; visible nonzero pixels; Hero Stand source; animation frame source; Player state bindings. |
| Player starts inside terrain | Spawn cell3,12; Ground Surface collision TL/TR Empty and BL/BR Solid; body8×8; origin4,8. |
| Build asks for idle/walk/attack | Assign the exact lowercase states in ENTITY STUDIO. |
| Build rejects attack | Turn off Loop on Hero Attack. |
| Build complains about custom assembly | Save any code separately, then clear CODE for this generated World workflow. |
| You only see a static source Scene | Enable World Runtime and explicitly choose its World, marker, source scene, and Player. |
| Keys do nothing | Click the emulator display, confirm Run, and close controller settings or save dialogs. |
| Edits do not appear while playing | Use Build & Run again. Editor changes do not hot-reload the ROM. |

If it still fails, keep your last checkpoint and record the failing step, visible error text, and a screenshot. A precise first-use report is more helpful than silently changing several settings at once.

## What you built and how to share it

The World compiler generates real 6502 machine code in the ROM. It does not fill the CODE tab or export editable assembly source. Share the native JSON (or project ZIP) alongside the ROM so others can edit in Forge and rebuild. This generated World-ROM profile also embeds editable source for **Open Forge ROM** recovery; do not generalize that to every imported ROM or other build profile.

## Continue after the first successful session

See [Optional second session](NEXT_STEPS.html) for a separate multi-piece pose, animation and Entity
Studio binding exercise, plus a prebuilt Scout project to inspect. Keep your
first playable JSON as a checkpoint before doing any optional work.


Use the [full manual](Manual.html) for linked Worlds, Rooms/Cameras, larger characters and reference chapters. Its opening alpha.11 notes explain changes since the preserved 1.9.0 guide. Find individual controls in the [operator reference](Reference/Operator_Reference.html), and record results in the [review checklist](Reference/Reviewer_Checklist.html) and [feedback form](Feedback_Template.txt).
