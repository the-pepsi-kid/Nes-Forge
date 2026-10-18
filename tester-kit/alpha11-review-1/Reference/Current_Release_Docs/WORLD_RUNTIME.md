# World Runtime — 1.7

World Runtime builds one authored sideview Player into a mapper-0 NES ROM. It uses metatile worlds, explicit start/arrival markers and a camera that changes by whole screens. In 1.8 it can also host the shared Audio Runtime and execute the player's linked `sound` frame events. It does not add smooth scrolling, generic actors or target damage.

Open `../examples/Scout_World_Traversal_1.7.nesforge.json` through Open Project to inspect the editable World traversal example. Its matching `.nes` exercises playback and clean reopening. It is external example data, never an automatic startup template. The older Scout single-room example remains separate.

## Author through the editor

1. Draw background and player pixels in CHR SHEET. In METATILES, create a scene-local library; each definition has four 8×8 tiles, one palette row and four collision quadrants. Use only Empty and Solid for executable world terrain.
2. Create and paint a world in WORLD using that library. A screen contains 16×15 metatile cells; each cell is 16×16 pixels. World-used definitions need no placement in the source scene’s `metaMap`.
3. Add named Room and Camera rectangles if wanted. For runtime, X/width must be multiples of 16 cells and Y/height multiples of 15 cells. Rectangles must be contained in the world. Rooms cannot overlap other rooms; cameras cannot overlap other cameras. A room and a camera may overlap each other.
4. Place a Spawn or Entrance for the start. Author player poses in METASPRITES, frames in ANIM and a Player entity/bindings in ENTITY STUDIO. Bind `idle`, `walk` and a nonlooping `attack`; `jump` is optional and falls back to idle. The selected source entity supplies art/bindings/facing; the World marker supplies its starting position.
5. To link places, select an Entrance or Exit and set both Target World and Target Marker. The destination must be a Spawn or Entrance. Both target fields empty means no transition. Partially specified or missing destinations fail the World build.
6. In WORLD → WORLD RUNTIME, enable the mode and choose the start world, start marker, player source scene and Player. Adjust the existing movement/body parameters if needed, then use Build & Run. No start/player selection is inferred automatically.

The World build follows saved start-world links and player assets independently of legacy Build Scene Set. Unreachable worlds and unrelated entities remain in authoring backups; they are not automatically executed. The retained authoring source still consumes ROM space even when some resources do not execute.

## Controls and movement

| Control | Action |
| --- | --- |
| Left / Right | Move the player |
| Z / NES A | Jump on a new button press |
| X / NES B | Play the nonlooping attack animation; no World target damage |
| Up | Use a linked Entrance/Exit while feet occupy its cell; a new press is required |
| Enter / Start | Restart at the configured start marker |

Coordinates use the player’s centered feet. Marker `(x,y)` places the feet at world pixel `(x×16+8,y×16+8)`. The full movement body must fit world bounds and avoid Solid collision at starts and transition endpoints. Invalid placement is rejected; the compiler does not move the marker to nearby space.

Collision samples the four authored 8×8 metatile quadrants independently; an empty world cell is visually blank and collision-empty. World edges block movement. Screen-boundary crossings continue physics and update world/room/camera descriptors. Room rectangles name regions; they do not create invisible walls or instantiate copies of scene entities. Screens outside rooms use the containing world as their region.

Entrance/Exit links activate by a new Up press. Marker activation tests the last occupied row of the movement body (feet Y minus one), so a marker immediately above a full solid floor remains usable after the player lands. Arrival resets transient movement/action state at the destination. Holding Up across reciprocal links does not immediately return. Multiple traversable markers in the same cell are rejected. Spawn markers are arrival/start locations, not enemy generators or a checkpoint system.

## Camera regions

The runtime tracks the player’s physics screen separately from the displayed camera screen. Modes apply while the player’s feet are inside their region. All camera rectangles are positive, contained, non-overlapping and screen aligned; they can span several screens.

| Mode | Displayed screen |
| --- | --- |
| `follow` | The player’s current screen on both axes |
| `horizontal` | The player’s current screen column and the region’s first row |
| `vertical` | The region’s first column and the player’s current screen row |
| `locked` | The region’s first/top-left screen |
| No matching camera | The player’s current world screen |

The display changes in complete 256×240 screens. There is no pixel scrolling, interpolation or dead-zone tracking. Cameras do not restrict movement. With a locked or axis-limited camera spanning multiple screens, the player can move off the displayed screen; its sprite is clipped instead of wrapping onto the visible screen. Leaving the region applies the next matching region or world-following fallback.

## Runtime limits

| Resource | Limit or behavior |
| --- | --- |
| Output | Mapper 0; 32 KB PRG and 8 KB CHR; no trainer/new mapper |
| World authoring | Up to 32 worlds; each 1–16 screens per axis |
| Reachable executable profile | At most 32 worlds and 64 screens, with lower actual capacity imposed by code/data/source bytes |
| Background / sprite graphics | 256 unique tiles per 4 KB bank; linked by actual World/player usage |
| Player frames | 1–64 frames per animation; 1–255 ticks per frame; at most 24 hardware pieces and eight pieces on any scanline |
| Regions | Screen aligned and non-overlapping within each type; derived runtime room/camera indices are bounded |
| Collision | Empty and Solid only; other collision types reject when used by executable terrain |
| Movement | Speed 1–4; jump 1–12; gravity 1–3; max fall 1–8; body width 2–32 even; height 2–48 |
| Source record | Bounded checked compressed authoring; maximum decoded source 8 MB, with much smaller practical PRG capacity |

Screen data, code, animation and source-record capacity are checked separately. The profile’s maximum screen count does not mean that every map below it fits. A build failure identifies the relevant capacity; nothing is silently truncated.

Player sprite palette colors must match their selected source across linked animation assets. Source metasprite origins, facing and 8×16-to-8×8 expansion retain existing conventions. Attack contacts and frame events are preserved; `sound` events may execute linked 1.8 SFX, but they do not execute damage or arbitrary scripts. Other entities, hazards, ladders, moving platforms and general events remain later work.

## Backups and verification

Save Project As/Export uses schema 12. Open Forge ROM recognizes the layout-4/WG17 source record, validates its embedded schema 10, 11 or 12 source before replacement and restores authoring with Undo available. It retains the opened ROM as the new original. Previously imported ROM bytes are excluded from embedded source, so use JSON/ZIP to retain those older originals. Append Import tells you to use Open Forge ROM for this format.

The required tests and final measured candidate status are in `../TEST_POLICY.md` and `../CURRENT_BASELINE.md`. Real-browser acceptance remains unverified; generated-ROM emulator tests do not establish a native browser or independent hardware pass.
