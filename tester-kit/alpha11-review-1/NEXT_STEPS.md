# Optional second session

Complete the desktop tutorial first and save a new native JSON checkpoint.
These options are separate experiments; you do not need them to finish the
first-session assignment.

## Give the character another piece

1. In **CHR SHEET**, select **Sprite Bank ($1000)** and draw visible pixels in
   another tile (for example `$11`; enter `17` in a decimal field). Pixel
   value zero is transparent; one piece has three visible colors.
2. In **METASPRITES**, select **Hero Stand** and click **+ Piece**. Select the
   new item in **PIECES · OAM ORDER**. Set **Tile / lower** to `17`, **X / Y**
   to `8 / 0`, and choose **Sprite palette 0**. The two pieces form a 16×8
   pose. Use **Set origin at feet** or enter an origin that makes sense for
   your character. The cyan cross is the anchor, not a collision body.
3. In **ANIM**, inspect the frame that refers to Hero Stand. In **ENTITY
   STUDIO**, choose the Player and the bound `idle` state. The studio previews
   the bound pose and facing; it does not run your World. Build & Run to see
   changes in the generated ROM. If the visible width changed, revisit the
   **WORLD → WORLD RUNTIME → Movement and collision body** settings deliberately.
4. Save another native JSON, reopen it, and compare the pose. If any piece is
   blank, check the sprite bank, tile number (hex `$11` versus decimal `17`),
   palette, nonzero pixels, source scene, frame selection and state binding.

## Inspect a prebuilt actor

Open `examples/Scout_Gameplay_Core_2.0.0-alpha.11.nesforge.json` with **Open
Project** after saving your own project. Inspect SCENE, METASPRITES, ANIM and
ENTITY STUDIO, then find the **GAMEPLAY CORE · TYPED TABLES** panel in SCENE's
Gameplay section. The **BEHAVIOR GRAPH** is another view over those same
behavior records, not a second rules engine. Build & Run, note what actually
executes, then reopen your own saved project. The accompanying `.nes` is a
known built example, not an editable backup.

## Further paths

- **Audio:** Follow [Make a sound project in Forge](Guides/Audio.md) to compose notes, create instruments and SFX, save/reopen, and build a music-playing ROM. The first-game tutorial is silent. Record real listening separately from automated audio checks.
- **Source Workspace:** **Analyze source** inventories files and gives lexical diagnostics. **Build source ROM** separately assembles supported `forge-6502-v1` source into a mapper 0 ROM. Foreign source is not automatically translated. Use **Save source workspace** for its separate `.nesforge-source.json` backup; ordinary project JSON does not include it. See the [current source workspace guide](Reference/Current_Release_Docs/SOURCE_WORKSPACE.html).
- **Recovery:** only documented profiles can become editable native assets.
  General ROM analysis and running an original cartridge are distinct actions.
- **Mobile/controller:** optional device-specific results; record versions,
  delivery method, output device and a hash of the tested ROM.

Save a fresh checkpoint before each experiment and use the feedback form to
record where actual behavior differs from these instructions.

For linked Worlds, exits, Rooms/Cameras and extended authoring workshops, continue with the [full manual](Manual.html). Read its alpha.11 update notes before the preserved 1.9.0 chapters.
