# Gameplay, Worlds and repeatable variations

This guide explains the current generated gameplay tools in NES Forge 2.0.0-alpha.11, including the `audio-tool-import-1` application. It covers the controls that choose a runtime, place a player and actors, edit behavior, connect Worlds, and make repeatable variations. For drawing and animation construction, continue with the [main tutorial](../Tutorial.md); the [Operator Reference](../Reference/Operator_Reference.md) supplies the larger control inventory.

The kit includes [Scout_Gameplay_Core_2.0.0-alpha.11.nesforge.json](../examples/Scout_Gameplay_Core_2.0.0-alpha.11.nesforge.json). Open that **JSON** through **Open Project** for these lessons. The matching `.nes` is a playable cartridge, not the editable lesson source. **Save Project As…** makes your own portable working copy. Reopen the untouched Scout JSON before each lesson when you want the original starting point.

## Choose what the ROM will run

Three choices answer different needs. The **Gameplay** button opens the **SCENE → Gameplay** panel. **WORLD → WORLD RUNTIME** contains the multi-screen selection.

| Choice | What Build runs | What you must supply |
| --- | --- | --- |
| **ROM mode → Scene viewer / custom assembly** | The generated scene viewer when CODE is empty, or your authored assembly when it is present. The viewer's Start button cycles selected scenes. | A suitable Build Scene Set, or valid assembly and its required resources. It does not automatically turn scene entities into a game. |
| **ROM mode → Single-room platformer** | One fixed sideview room, the retained Player, an optional stationary training target, and enabled supported Gameplay Core actors in that scene. | A playable room, Player animation bindings, collision and build dependencies. |
| **Build this project as World Runtime** | Reachable World maps, screen transitions, the selected retained Player, and enabled supported Gameplay Core actors. | Explicit start World/marker and Player source selections, valid linked terrain and assets. |

Enabling World Runtime takes priority over the saved viewer/single-room selection. Those Gameplay fields become disabled and explain why. Turning World Runtime off reveals their saved settings again. Selecting a different editor scene or World does not silently change the configured runtime start.

**New Project** starts a blank project with single-room settings. It still needs an authored Player and its bindings before it can build as a playable room. A template in Gameplay Core does not supply the Player's artwork or the missing legacy Player entity.

Custom assembly conflicts with the generated single-room and World paths. Save source that you need before clearing CODE to use a generated runtime. The generated profile is mapper 0/NROM; selecting a mode does not import another game's engine.

## Single-room controls and a first play test

The panel heading **FIRST PLAYABLE ROOM** is retained in the current application.

| Control | Purpose and consequence |
| --- | --- |
| **ROM mode** | Selects viewer/custom or **Single-room platformer** while World Runtime is off. |
| **Playable room** | Selects the exact scene to execute. Include it in **Build Scene Set**. |
| **Player** | Selects a Player entity in that room. Entity Studio supplies its animation bindings. |
| **Training target** | Selects one distinct NPC/enemy, or **No training target**. This is the stationary attack demonstration, separate from generic Gameplay Core actors. |
| **Movement and collision body** | Expands six runtime fields, described below. These are the movement settings used by the generated Player. |
| **Edit room** | Opens the configured room in SCENE. |
| **Bind animations** | Opens the configured Player in ENTITY STUDIO. |
| **Build & Play** | Builds the active project and runs it in the emulator. It is the local label for the same build/run workflow. |
| **Latest build details** | Shows the captured build messages. Read the actual rejection if Build fails; a valid dropdown selection does not certify the art, collision or ROM capacity. |

| Movement field | Allowed values | Meaning |
| --- | --- | --- |
| **Move speed** | Whole number 1–4 | Horizontal pixels per game tick. |
| **Jump speed** | Whole number 1–12 | Initial upward speed on a new jump press. |
| **Gravity** | Whole number 1–3 | Downward speed change per game tick. |
| **Maximum fall** | Whole number 1–8 | Downward speed cap. |
| **Body width** | Even whole number 2–32 | Width of the terrain collision body, centered around the Player's feet X. |
| **Body height** | Whole number 2–48 | Height of that body above the feet. |

These fields are also used by World Runtime. The nominal tick rate is 60 Hz. Body dimensions govern terrain movement; animation hitboxes and hurtboxes govern the supported attack interaction. Changing an entity's older `speed` or `jumpForce` property is not a substitute for changing these runtime fields.

### Lesson: run Scout as a fixed room

1. Open the kit's Scout JSON and save a copy such as `Scout_single_room.nesforge.json`.
2. Open **WORLD** and uncheck **Build this project as World Runtime**.
3. Choose **Gameplay**. In **GAMEPLAY CORE · TYPED TABLES**, uncheck **Enable canonical Gameplay Core** for this retained Player/target lesson. This preserves those records while taking their generic actors out of this build.
4. Set **ROM mode** to **Single-room platformer**, **Playable room** to **Scout Training Room**, **Player** to **Scout**, and **Training target** to **Training target**. These are already saved in the supplied project; verify them explicitly.
5. Choose **Bind animations**. Confirm that Scout has `idle`, `walk` and `attack` bindings. In ANIM, `attack` must have **Loop** off. A `jump` binding is optional; without it, the retained runtime uses idle in the air. Return with **Gameplay**.
6. Choose **Build & Play**. Give the emulator keyboard focus. Use Left/Right to move, **Z** to jump, **X** to attack, and **Enter** to restart. A controller's A/B/Start perform the same actions. Jump and attack require a fresh press; holding either does not repeatedly start the action.
7. Approach the target and attack. Scout's authored attack hitbox must meet the target's hurtbox for the supported one-hit-per-swing target interaction. The target flashes and recovers; this is not a general enemy combat system.
8. Change **Move speed** from 2 to 3, then build again to compare. The previous running ROM does not update itself merely because you edited a field. Use **Undo** to restore that edit, **Redo** to reapply it, and **Save Project As…** to keep the chosen version.

Expected result: one room with Player movement, solid terrain collision, bound animation and the optional target. Reopen the original Scout JSON to return to the World lesson; the mode/checkbox edits above are separate history actions.

For your own fixed room, use **SCENE PROPERTIES → Type: Side-View**, **Scroll: None**, and a fixed 256×240 camera at 0,0 with no follow entity. Place the Player's feet above clear terrain. Include the room and every scene providing linked sprite assets in Build Scene Set. Sprite palette rows used by the Player/target must agree with the room. Empty and Solid are the supported terrain properties; Platform, Ladder, Hazard, Water and slope labels do not add those movement mechanics to this runtime.

Animation `sound` frame events can invoke a linked named SFX when Audio Runtime is enabled. Custom markers/scripts do not execute arbitrary code. Entity Studio's event log is an inspection preview; it does not perform combat or play those runtime events by itself.

## WORLD: maps, objects and navigation

A World uses a scene's **Metatile Library** as its tileset. It stores metatile IDs in a separate map. Editing a metatile definition changes every World cell that references it; painting the source Scene later does not automatically repaint an existing World.

One screen is **16×15 metatile cells**, or **256×240 pixels**. Each cell is 16×16 pixels. World marker/rectangle coordinates use cells. Gameplay actor positions use pixels; do not copy a marker coordinate directly into an actor X/Y field.

| WORLD control group | What each control does |
| --- | --- |
| World selection | The World dropdown selects the editor map. **+ World** creates one from a scene with a metatile library and initially copies its linked scene map. **⧉** duplicates the World. **✕** deletes the active one after confirmation. Check start, actor and link references after duplication or deletion. |
| World properties | **Name** changes the display name. **Tileset Scene** selects the metatile/CHR/palette source. **Width / Height** set 1–16 screens per axis; shrinking can crop map content. A changed tileset can leave unresolved IDs, which Forge preserves and reports for repair. |
| Editor view | Directional arrows pan one screen. The **1× / 2× / 3×** selector under VIEW changes World zoom. **MINIMAP / OVERVIEW** jumps the viewport when clicked. These controls move the editor view, not the runtime start or camera. |
| Brush selection | **METATILE BRUSH** chooses an ID. **METATILE PALETTE** shows visual choices; search matches name/category/hexadecimal ID, the star filter shows favorites, and each card's star toggles that preference. **Open METATILES** or **Use [scene]** helps when the selected tileset has no library. |
| **Paint / Erase / Fill / Rect** | Paint strokes place the brush; right-click eyedrops an existing cell. Erase makes cells empty. Fill replaces a connected area of matching cells. Rect paints the dragged rectangle. These change World terrain, not Scene nametable cells. |
| **Select** | Selects/moves a marker or rectangle on the canvas. Dragging a room/camera's lower-right cell resizes it; dragging its interior moves it. Dragging empty map space selects a rectangular cell region. At overlapping positions, markers are picked before cameras, then rooms. Sidebar lists show names/bounds and delete buttons; they are not object-selection buttons. |
| **REGION → Copy / Paste / Clear** | Copies selected cells to the World clipboard, pastes them into the World at the selected region/viewport position, or empties the selection. Copy is not a project file save. |
| **Room / + Current Screen** | The Room tool drag-creates a rectangle; **ROOMS / CHUNKS → + Current Screen** creates a 16×15-cell room over the viewport. Rooms give actors and persistent values an ownership region; their borders do not create collision walls. |
| **Entrance / Spawn / Exit** | The tools click-place markers. The corresponding **+ Entrance / + Spawn / + Exit** buttons add markers near the viewport center for further editing. Spawn marks a start/arrival position, not an enemy generator or a checkpoint-save system. |
| **Camera / + Current Screen Region** | The Camera tool drag-creates a region. The button creates a screen-sized region. It controls which complete screen is displayed while the Player occupies that region. |
| **SELECTION / PROPERTIES** | Edits the selected object's **Name**, **X / Y**, and rectangle **W / H** or marker **Kind**. Camera **Mode** and marker **Target World / Target Marker** appear for those object types. **Delete room**, **Delete camera**, **Delete marker**, or list **×** removes the chosen object. |
| **BUILD STATUS** | Reports used/painted metatile counts and missing definitions. A missing brush or map ID needs repair before building; this panel is not the full ROM preflight. |

Rooms and camera regions may be authored freely, but the current executable profile requires screen alignment: X and W multiples of 16 cells, Y and H multiples of 15, positive dimensions and containment within the World. Rooms cannot overlap rooms; cameras cannot overlap cameras. A room and camera may cover the same space.

### Start and link controls

In **WORLD RUNTIME**, check **Build this project as World Runtime**, then choose **Start world**, **Start marker**, **Player source scene**, and **Player**. Forge does not guess these references. **Movement and collision body** expands the six fields already described. **Build & Run** validates and runs the generated game.

The start marker must be a **Spawn** or **Entrance**. Marker `(x,y)` places centered feet at pixel `(16x+8,16y+8)`. The entire body must fit the World and avoid Solid terrain. Forge rejects an obstructed start/arrival rather than moving it to a nearby space. World boundaries block movement.

For a traversable Entrance/Exit, select it and fill **both** **Target World** and **Target Marker**. The destination must be a **Spawn or Entrance**, even if a broader marker list is visible in the authoring control. An Exit is not a valid runtime arrival target. Both fields empty means no transition; one field without the other is an error. Multiple traversable markers in the same cell are refused.

During play, press **Up** while the Player's feet occupy the link's cell. Activation uses the last occupied body row, just above the feet, so a link immediately above a floor remains usable after landing. A fresh Up press is required; holding Up does not bounce indefinitely across reciprocal links. Arrival resets transient movement/action state.

### Camera mode reference

| Mode | Screen shown while inside the camera region |
| --- | --- |
| `follow` | Player's screen column and row. |
| `horizontal` | Player's screen column and the region's first row. |
| `vertical` | Region's first column and Player's screen row. |
| `locked` | Region's first/top-left screen. |
| No region | Player's current World screen. |

The change is a whole-screen transition, not smooth pixel scrolling. Cameras do not constrain movement. With a locked/axis-limited camera covering several screens, the Player can leave the displayed screen; its sprite is clipped rather than wrapped onto the camera view.

### Lesson: inspect and traverse the supplied Worlds

1. Open the original kit Scout JSON. In WORLD RUNTIME, verify **Start world: Scout Ridge**, **Start marker: spawn-a**, **Player source scene: Scout Training Room**, and **Player: Scout**. Leave World Runtime enabled.
2. Select **Scout Ridge** in the editor's World dropdown. Its room spans 32×15 cells, two screens wide. Use the view arrow or overview to inspect the second screen.
3. Choose **Select**, pan right one screen, and click marker **exit-a** at World cell `(25,12)` (column 9, row 12 within that viewport). Its inspector target is **Scout Courtyard → spawn-b**. Do not change it yet.
4. Select **Scout Courtyard** in the World dropdown and click its marker at `(4,12)` with Select. The selected **exit-b** targets **Scout Ridge → spawn-a**. Its arrival Spawn and return Exit share a cell; only the Exit is traversable.
5. Choose **Build & Run**. Move through Scout Ridge, using Z to jump and avoiding contact hazards. Cross the first screen boundary: the camera changes by one complete screen. At exit-a, release and press **Up** to enter Scout Courtyard. Release and press Up again at its return marker to return to Scout Ridge.
6. Save a copy, then select **Scout Ridge**, choose **Select** and click inside its camera away from a marker, such as cell `(0,0)`. Change **Mode** in SELECTION / PROPERTIES, rebuild, and compare the four modes with the reference above. **Undo** restores the authored change; rebuilding is required to see that restoration in the ROM.

Expected result: linked World traversal with explicit start and arrival markers. The source Player's scene X/Y is not the World starting position. Press Enter/Start to restart at the configured start marker.

### Lesson: add a room, terrain and a safe start to your own World

Use a saved project with a metatile library and a bound Player; the main tutorial explains how to author those assets. You can practice on a copy of Scout.

1. Choose **+ World**. Name it and select its **Tileset Scene** deliberately. Inspect the map: creation can seed linked cells from that scene, so it need not be blank. Erase unwanted cells.
2. Select a metatile whose collision quadrants are Solid. With **Paint** or **Rect**, draw a floor. Leave clear space above it for the entire Player body. Empty map cells are passable; tile pictures alone do not define collision.
3. Use **+ Current Screen** under ROOMS / CHUNKS for an aligned room. Use **+ Current Screen Region** for an aligned camera, then choose `follow` or `locked` in its inspector. Do not add a second overlapping room/camera of the same type.
4. Choose the **Spawn** tool and click clear space above the floor. Set its exact X/Y in SELECTION / PROPERTIES. For a floor beginning at cell row 13, a Spawn at `(3,12)` puts feet at `(56,200)` with room to fall onto that floor, provided the cells above are clear.
5. Enable World Runtime and explicitly choose the new World, new Spawn, existing Player source scene and Player. Build & Run. Read any capacity, missing-ID, obstructed-body or region-alignment error before proceeding.
6. For a second destination, author another World/start marker and an Exit linking to it. Add a separate reciprocal link if return travel is wanted; links are not automatically bidirectional.
7. Save the JSON, reopen it and verify those references before distributing a ROM.

World builds follow links reachable from the configured start and link required Player/tileset assets independently of Build Scene Set. Unreachable worlds remain authoring data. Gameplay actors outside the reachable World/player-source set are reported as authoring-only. Stored authoring data can still consume ROM source-record capacity.

## Gameplay Core: definitions, instances and templates

Open **Gameplay → GAMEPLAY CORE · TYPED TABLES**. **Enable canonical Gameplay Core** controls whether supported generalized actors participate in the generated single-room/World build. This does not replace the retained Player executor.

An **Actor Definition** is a reusable set of components, parameters and a Behavior reference. An **Actor Instance** places one definition and supplies its own parameter overrides and persistence bindings. A **Behavior** contains states, ordered operations and transitions. Changing a shared definition/Behavior can affect several instances; editing an instance override affects that instance.

| Control group | What to use it for |
| --- | --- |
| Placement dropdowns | Before **Add template**, **New Actor Instance** or **New persistent variable**, select `scene`, `room` or `world` and the actual owner. Room requires an authored Room. These selectors set creation context; they do not move existing records. |
| Template dropdown / **Add template** | Inserts ordinary editable records for one of the five templates below. It does not turn the feature on automatically or author artwork for you. |
| **Actor Definitions** | **New Actor Definition** creates a definition and, if needed, a Behavior. The table edits **Name** and **Behavior**. **Edit** selects it for components/parameters; **×** removes it only when the resulting references validate. IDs identify records even after names change. |
| **Actor Instances / Placement / Bindings** | **New Actor Instance** creates an instance of the first definition; choose the wanted **Definition** afterward. Edit **Placement**, **X**, **Y**, and **Facing**. **Edit** selects its overrides/bindings. **×** removes the instance. Changing Definition clears its old parameter overrides. |
| **Overrides** | Changes a selected instance's typed parameter value. **Default** removes that override so it follows the definition again. |
| **Persistence bindings** | **Add binding** requires a variable owned by that placement. Choose **Variable** and a **Purpose**, or remove with **×**. The instance bindings are the authoritative links to persistent state. |
| **Typed parameters** | **Add parameter** creates an ID, type, default and bounds/enum choices. Types are `boolean`, `uint`, `int`, `enum`, `text`, `asset`. Numeric ranges and declared enum choices are validated. Remove with **×** after repairing users of that parameter. |
| **Components** | **Add component** adds a selected capability to the selected definition. Choose its **Type**, edit offered fields, use **Enabled** to control it, or remove it. A disabled Behavior is inert. Merely adding a component does not implement a future engine feature. |

For an instance placed in a Scene, X/Y are scene pixels. For World placement, they are World pixels. For Room placement, they are pixels relative to that Room's top-left; compilation adds the Room's cell origin ×16. The single-room profile requires positions within 256×240. World-source Scene instances are not a substitute for placing generic actors in the World or Room.

| Template | Current behavior and its boundary |
| --- | --- |
| **Sideview Player** | Binds Gameplay Core to the already selected retained Player. It needs that Player and its assets; it does not create them. Its canonical graph is a compatibility record, not a programmable replacement for Player movement. |
| **Ground Patrol Enemy** | Moves between authored `minX`/`maxX` bounds using `speed` 1–4 and applies supported contact damage. Its initial Hurt/Dead state records have no automatic transitions or full combat AI. |
| **Stationary Contact Hazard** | Uses contact damage while in its active behavior state, with an explicitly owned enabled variable. It is an actor; it does not implement the tile property named Hazard. |
| **Collectible Pickup** | On Player overlap, sets its declared collected variable and despawns. The binding carries collection across supported reconstruction within the running game. |
| **Switch + Door** | Creates two definitions/instances sharing one variable. Overlap the switch and make a new Up press to set it; the door's alpha behavior changes its active/visible state. Physical door blocking and a general reversible gate are not implemented. |

### Component field reference

| Component | Current editable meaning |
| --- | --- |
| `Transform` / `Spawn` | Capability records with no separate value fields in this panel. Instance placement/X/Y supplies position. Spawn is not a general spawn-operation implementation. |
| `Render` | `sourceSceneId`, `tile` 0–255, `palette` 0–3 and `behind` choose the generic actor's sprite source. The generic renderer is separate from the retained Player's multi-piece metasprite animation. |
| `Animation` / `Physics` | Capability records with no additional typed values here. They do not grant the unsupported generic animation/physics operations listed below. |
| `Collider` | `width` and `height` 1–64 for supported actor overlap checks. These do not replace the Player terrain body's separate dimensions. |
| `Input` | `adapter: legacyPlayer` identifies the retained Sideview Player binding. Only one such binding is supported. |
| `Health` | `maximum` 0–255 is bounded actor health data. Adding it does not wire Hurt/Dead transitions or implement generic `changeHealth`. |
| `ContactDamage` | Capability and legacy mirror values for damage/cooldown. The Behavior's `contactDamage` operands are authoritative. Conflicting mirrors are errors, not another independent damage setting. |
| `Behavior` | Enables execution of supported state/transition records for a generic actor. |
| `Pickup` / `Switch` / `Door` | Role/capability records used by the supported templates. Their Behavior and persistence records supply the actions. Door does not imply collision blocking. |
| `PersistenceBinding` | Enables persistent behavior use. A legacy `variableId` mirror must agree with the authoritative Actor Instance bindings. |

### Lesson: change one patrol without changing the definition

1. Open the original Scout JSON. Keep World Runtime and canonical Gameplay Core enabled.
2. In **Actor Instances / Placement / Bindings**, find ID `example-patrol` and choose **Edit**.
3. Under **Overrides · example-patrol**, change `speed` to **2**. Leave `minX` and `maxX` at their current defaults. The Ground Patrol Enemy definition still has default speed 1.
4. Build & Run. Compare the patrol motion in Scout Ridge. This is an actor speed change, distinct from the Player's Move speed.
5. Return to the instance and choose **Default** beside speed to remove its override, or Undo the edit. Save a separate JSON if you want to keep the faster patrol.

## Behavior Graph and canonical tables

**BEHAVIOR GRAPH** is another view of the same Behavior records shown in **Canonical State Table**. It does not save a second graph or run a separate visual scripting engine.

| Graph or table control | Meaning |
| --- | --- |
| **Actor Definition / Behavior** selectors | Choose which shared Behavior to inspect/edit. |
| **Duplicate for selected Actor Definition** | Copies that definition's Behavior and assigns the copy only to that definition, in one Undo action. Instances of that definition still share the copy. |
| **Refresh graph** | Redraws the view and diagnostics. Layout/selection are temporary; this is not a save or build action. |
| **Add state** | Adds a state with empty action lists. Select its card and edit **State name**. **Make initial** changes the initialization state. |
| **onEnter / onTick / onExit** | Ordered actions on entering the state, each tick, or leaving it. **Add action**, **Type**, and operand fields edit an operation; **Earlier / Later / Remove** changes its order or removes it. |
| **Add transition from state** | Creates a canonical transition. Choose **From state**, **To state**, **Priority (higher first)**, `conditions` and `actions` in its inspector. New transitions initially use `always`; replace that when an event is intended. |
| **Transitions (table order)** | Selects a transition and its drawn connection. **Earlier in table / Later in table** controls equal-priority ties. Higher priority is checked first; the first matching transition wins. At most one transition commits per actor tick. |
| **References** | Navigates to connected canonical records. |
| **Behavior diagnostics** | Buttons select the implicated record/operation. Warnings include unreachable states and transitions hidden by earlier unconditional ones. Structural reachability does not prove a game condition will occur. |
| **Remove state / Remove transition** | Explicit deletion. Choose another initial state and remove/retarget connected transitions before removing a state. |
| Canonical table controls | **New Behavior**, the selector/name field, **Remove Behavior**, **Add behavior parameter**, **Add state**, **Initial**, and **Add transition** edit the same data. The table's operation fields follow the same runtime restrictions. |

Conditions on one transition are combined with AND. A generic state tick executes its `onTick` actions before transition evaluation; a transition runs source `onExit`, transition actions, then destination `onEnter`. Keep this order in mind when a state both causes contact damage and then transitions away.

### Operations that compile now

| Supported condition | What it tests |
| --- | --- |
| `always` | True without an operand. |
| `inputHeld` | NES button `a`, `b`, `select`, `start`, `up`, `down`, `left` or `right` is held. |
| `inputEdge` | A new press of the selected NES button. |
| `timerDone` | The supported timer named **`main`** has expired. |
| `overlapPlayer` | Generic actor overlaps the retained Player. |
| `persistentCompare` | Owned variable equals (`eq`) or differs from (`ne`) its typed value. Other comparison operators do not compile in this profile. |

| Supported action | What it changes and where it is allowed |
| --- | --- |
| `setTimer` | Sets **`main`**, 0–255 ticks. Other timer names are refused. |
| `persistentSet` | Assigns a declared, correctly owned variable a valid typed value. |
| `despawn` | Deactivates the actor. Persistence must be modeled explicitly if that result should survive reconstruction. |
| `moveWithinBounds` | **onTick only.** Uses `minX`, `maxX`, `speed` literals or the corresponding definition parameters, one source per value. Speed is 1–4. |
| `contactDamage` | **onTick only.** Current emitted profile supports **amount 1**, a bounded cooldown, an enabled ContactDamage component and one Sideview Player compatibility binding. |
| `syncActiveFromPersistent` | **onTick only.** Synchronizes active state using an owned variable and `whenTrue`; its current alpha deactivation behavior is not a reversible general gate. |

The graph marks these other operations **authoring only**, and an executable build refuses them: conditions `grounded`, `airborne`, `compare`, `healthCompare`, `animationComplete`, `animationEvent`, `triggerReceived`; actions `selectAnimation`, `setFacing`, `setVelocity`, `accelerate`, `changeHealth`, `spawnActor`, `persistentChange`, `emitTrigger`. Saving their canonical records does not make them executable.

Do not add graph operations/transitions to the **Sideview Player** compatibility Behavior: the compiled profile refuses them because its movement still runs through the retained Player implementation.

### Lesson: make Select pause and resume the patrol

This is an editing exercise for the generic Ground Patrol Enemy, not the Player.

1. Open the original Scout JSON and save a working copy. Open **BEHAVIOR GRAPH**, choose **Actor Definition: Ground Patrol Enemy**, then **Duplicate for selected Actor Definition** to keep the original Behavior available.
2. Choose **Add state** and change **State name** to `Paused`. Leave its action lists empty. Keep **Patrol** as the initial state.
3. Select the **Patrol** state card and choose **Add transition from state**. Change **To state** to **Paused**. In `conditions`, change the existing operation **Type** from `always` to `inputEdge`, then **key** to `select`. Leave transition actions empty.
4. Select **Paused**, add a transition from it, and set **To state: Patrol**. Replace its `always` with `inputEdge`, **key: select**, again.
5. Read Behavior diagnostics. Scout's unused Hurt/Dead states can remain structurally unreachable; resolve any error introduced by your edits. In particular, confirm neither new transition still says `always`.
6. Build & Run and focus the emulator. Press and release **Shift** (NES Select): the patrol stops because Paused has no movement or contact-damage tick actions. Press and release Shift again: patrol resumes. A held button is not a stream of new presses.
7. Save the JSON and reopen it. The new state/transitions remain; automatic graph layout and selected card need not. Each ordinary edit is Undoable. The Behavior duplication itself is one Undo action, while the subsequent edits have their own entries.

Expected result follows the current supported `inputEdge` and state-action contracts. This walkthrough is source-audited guidance; it is not a claim that every browser, controller or physical console has been manually tested.

## Persistent values and ownership

**Room / World Persistent Variables** defines data that survives supported actor reconstruction during the current running game. It is not a disk save, battery-backed progress system or a global variable scope. Power/reset begins from authored defaults.

| Control | Purpose |
| --- | --- |
| **New persistent variable** | Creates a variable using the current placement context: Scene or Room gives room scope; World gives world scope. |
| **Name / Scope / Owner** | Name is a display label; stable ID identifies the variable. Scope is `room` or `world`; Owner selects the exact Scene/Room/World. A room-scoped variable can be owned by a fixed Scene or an authored World Room. |
| **Type** | `boolean`, `uint` or `enum`. The compiled representation is one byte per variable. |
| **Default / bounds / enum** | Sets the startup value, uint min/max or declared enum choices. Changing type resets its type-specific defaults; inspect the resulting row. |
| **×** | Removes the variable only when remaining references are valid. Repair instance bindings and Behavior operations first. |

A World actor may use variables of its World; a Room actor may additionally use variables of that exact Room. Cross-owner references are errors. The **PersistenceBinding** component and the **Actor Instance → Persistence bindings** table work together; an operation mentioning a variable is not sufficient by itself.

To inspect a complete example, select Scout's `example-pickup` instance. Its `collected` binding points to `example-pickup-state`, owned by Scout Ridge. Its overlap transition sets that value and despawns. Scout's switch and door share `example-switch-door-state`; inspect both bindings and the switch's new-Up-press condition. These examples explain the saved model without claiming arbitrary save-game logic.

The current compiled Gameplay Core limit is **12 applicable Actor Instances**, including a canonical Sideview Player binding, and **64 persistent one-byte values**. The authoring tables can store larger collections; that does not enlarge ROM execution capacity. There is no generic actor streaming to bypass the runtime limit.

## Movement rules: repeatable Player changes

Open **SCENE → Movement rules**. This changes only the active generated runtime's Move speed, Jump speed, Gravity and Maximum fall. It leaves body dimensions, runtime selection, actors, maps and audio as authored.

| Control | Purpose |
| --- | --- |
| **Use current project** | Captures the exact current editable project as a detached base; clears previous movement locks/preview. Requires an enabled compatible World or single-room runtime. |
| **Source identity** | Shows the chosen runtime and canonical project SHA-256. It identifies project content, not JSON whitespace/file-byte formatting. |
| **Seed (text or numbers)** | 1–128 characters used for repeatable choices. |
| **Movement preset / Intensity** | Chooses a named absolute target, or Seeded mix. Intensity offers **1 · Mild**, **2 · Strong**, **3 · Full supported range**. |
| Four **Lock** boxes | Retain run speed, jump speed, gravity or maximum fall from the last successful preview. Preview once before locking. |
| **Preview rules** | Checks a detached candidate and shows each Before/After value plus validation. Does not edit or play the active project. |
| **Shuffle unlocked** | Advances the seed and selects Seeded mix, retaining locked values. A different seed can still produce the same values. |
| **Apply rules** | Asks you to confirm the exact values, then commits one Undo action. |
| **Download candidate project** | Saves previewed Forge JSON without applying it to the active editor. |
| **Download recipe** | Saves the versioned decisions/source identity, not the project's maps, graphics or music. |
| **Open saved movement recipe (exact original project required)** | Verifies/replays the recipe against its original captured base, then leaves a preview for explicit Apply/download. |

| Preset | Intensity 1 | Intensity 2 | Intensity 3 |
| --- | --- | --- | --- |
| **Keep current** | Captured base | Captured base | Captured base |
| **Sprint** | Run 2 | Run 3 | Run 4 |
| **High jump** | Jump 10, gravity 1 | Jump 11, gravity 1 | Jump 12, gravity 1 |
| **Slow fall** | Maximum fall 4, gravity 1 | Maximum fall 2, gravity 1 | Maximum fall 1, gravity 1 |
| **Heavy fall** | Gravity 2, maximum fall 6 | Gravity 2, maximum fall 7 | Gravity 3, maximum fall 8 |
| **Seeded mix** | Each value within ±1 of base, bounded | Within ±2, bounded | Full supported ranges |

Unmentioned values keep the captured base value unless locked from a prior preview. Higher intensity means a stronger named effect, not a guarantee of higher difficulty or a playable level.

### Lesson: make Scout jump higher

1. Open the original Scout JSON. Open **SCENE → Movement rules → Use current project**.
2. Choose **High jump**, **3 · Full supported range**, and seed `scout-high-jump-1`.
3. Choose **Preview rules**. For this supplied base, Jump speed should change from 9 to 12 and gravity remain 1. Review all four rows and the detached ROM validation.
4. Choose **Apply rules**, confirm, then **Build & Run**. Compare a jump from rest, a running jump, ceiling contact and landing. A compiled change can make later jumps harder or impossible.
5. Undo once to restore the original four settings, or Redo to return to the variation. Save the chosen project. Keep the original base separately if you download its recipe.

Any project edit/reopen makes an earlier capture stale. Recapture with **Use current project** and preview again. **No effective changes** disables Apply but still permits candidate/recipe download. Recipes require the unchanged original base, not the already-applied candidate. Source projects are limited to 8 MiB of canonical JSON and recipes to 64 KiB. Reviewed foundation-metadata migration is supported where reported; arbitrary source changes still refuse. See [Movement rules](../Reference/Current_Release_Docs/MOVEMENT_RULES.md) and [Compatibility stabilization](../Reference/Current_Release_Docs/COMPATIBILITY_STABILIZATION.md).

## Seeded mashup: combine editable assets

Open **SCENE → Seeded mashup**. The current project supplies the game's structure, collision, links, Player and runtime settings. Donors supply compatible editable assets; their code does not execute. Raw ROMs need a supported recovery/capture/authoring path before they can become donor Forge projects.

| Control | Purpose |
| --- | --- |
| **Use current project** | Captures the base. To use another base, Open Project first. Recapture after an edit; loaded donors can remain. |
| **Add donor Forge project JSON files (up to eight)** | Loads canonical compatible editable projects. Raw ROMs, ZIPs and recipe/report JSON are not donor projects. A rejected donor batch leaves the previous pool intact. |
| **Clear donors** | Removes donor snapshots from the session without editing the project. |
| **Source identities** | Lists each source and its canonical content hash for reproducibility. |
| **Target scene** | Chooses the base scene receiving the selected graphic banks/palettes. Worlds using its library can also change appearance. |
| **Seed** | Sets repeatable selection input, 1–128 characters. |
| **Background tiles / Sprite tiles / Palettes / Music** | Choose **Keep current**, **Random source (preview checks fit)** or an explicit source for each domain. Whole graphic banks retain the base's tile indices; a compatible bank can still look wrong for that map. |
| Four asset **Lock** boxes | Retain prior preview source choices while shuffling. Before the first preview, an explicit source can be locked; a random lock establishes its choice on that first successful preview. |
| **Vary patrol speed (1–4, within authored bounds)** | Varies supported existing patrol instance parameters; it does not change Player movement or add mechanics. |
| **Shuffle compatible existing enemy/pickup slots** | Permutes supported existing slots within checked ownership/screen/role/collider/bounds groups. It does not create actors or move the Player. Unsupported/unsafe cases are reported. |
| **Lock gameplay choices from the previous preview** | Keeps prior successful gameplay choices. Requires that preview. |
| **Preview mashup** | Produces a detached candidate, source choices and compatibility report. The canvas is only a static background preview, without sprites, gameplay or audio playback. |
| **Shuffle unlocked** | Advances the seed and returns unlocked domain choices to Random. Locked choices remain. |
| **Apply mashup** | Confirms, revalidates and applies supported changes as one Undo action. It does not start playback. |
| **Download candidate project / Download recipe** | Saves the editable result or reproducibility decisions. Neither download applies the candidate. A recipe contains no donor assets. |
| **Open saved mashup recipe (exact original sources required)** | Replays against the original base and all original donor content, leaving a detached preview. |

### Lesson: try an asset change using your own donor

1. Save a base copy of your current editable project, then choose **Use current project** in Seeded mashup.
2. Add another compatible Forge JSON that you own as a donor. Select a base **Target scene**. Set Background tiles, Sprite tiles and Music to **Keep current**; choose the donor explicitly for **Palettes**. Leave both gameplay options off for this first comparison.
3. Choose **Preview mashup** and inspect the static background and compatibility report. If the palettes are identical, **No effective changes** is expected; select a donor with different colors rather than assuming Apply is broken.
4. Choose **Apply mashup** only after reviewing the result. Build & Run to inspect sprites, gameplay and any audio. Undo once restores the applied project change. Save the version you want.
5. Download a recipe if needed, but also keep the unchanged base and every unchanged donor. To replay, reopen that original base, capture it, reload those donors, then open the recipe. File names may change; canonical content identities must match.

The source repository additionally contains `app/examples/Seeded_Mashup_2.0.0-alpha.10/` and later generated results. Those are **source-package examples**, not a promise that the compact tester kit contains every donor named in the technical recipe guide. The Scout JSON linked at the top is included in this kit.

Compatible donor music is appended with rebased references and becomes the new music order/tempo/speed. Existing patterns and SFX remain, but changed global tempo/speed can affect SFX timing. Audio Runtime/autoplay settings remain those of the base.

The pool is limited to the base plus eight donors, each at most 8 MiB canonical JSON and 32 MiB total; recipes are at most 64 KiB. The base must use generated mapper-0 code. A World mashup receives a detached build check; other paths report their structural checks and need ordinary Build for full cartridge capacity. A preview does not establish level solvability, artistic quality or audible equivalence. See [Seeded mashups](../Reference/Current_Release_Docs/SEEDED_MASHUP.md).

To combine both panels, Apply mashup first, save that intermediate project, then capture it in Movement rules and Apply rules. These are two edits with two Undo entries and two recipes with different required bases.

## Save, build and diagnose

Use **Save Project As…** or a native project ZIP as the editable backup. A successful build makes a runtime artifact; it is not a substitute for that backup. A World WG17 ROM can carry checked embedded source, but previously imported ROM bytes are excluded. Single-room Forge ROM reopening is partial and does not restore the complete Gameplay Core source. Keep JSON/ZIP even when you also distribute `.nes` files.

Most authoring changes use normal Undo/Redo. Invalid canonical changes are rejected without committing partial data. Apply rules and Apply mashup each make one Undo action. Editor selection, panning, graph layout and detached previews are not changes to the game's saved behavior. Save/reopen the JSON to verify persistence; rebuild to verify executable behavior.

| Symptom | Check next |
| --- | --- |
| Gameplay controls are disabled | World Runtime is enabled. Turn it off only if you intend to use saved viewer/single-room settings. |
| New World has no usable brush | Select a scene with a Metatile Library or open METATILES to create one. |
| Map looks right but Player falls/stops incorrectly | Inspect Empty/Solid collision quadrants in METATILES and raw tile properties for unlinked scene terrain; pictures do not define collision. |
| Player starts at an unexpected location | World start uses Start world + Start marker, not the Player entity's scene X/Y. |
| Player disappears after a screen crossing | Check camera mode/region. An axis-limited or locked camera can intentionally leave a moving Player off screen. |
| Up does not traverse a marker | Release/repress Up, stand in the correct feet cell, and verify both targets point to an existing Spawn/Entrance. |
| Actor is absent | Check Core enabled, instance placement/reachability, pixel coordinates, Render source and active state. A source Scene instance is not a generic World placement. |
| State exists but does nothing | Check Behavior enabled, initial/reachable state, transition conditions and supported operation list. Template Hurt/Dead labels alone do not add combat transitions. |
| Build refuses a canonical operation | Use the supported profile table above; an authorable operation can still be outside the generated runtime. Do not remove validation to force it. |
| Persistence binding fails | Verify exact Room/World ownership and repair both instance bindings and behavior references. |
| Apply is unavailable | Preview first. Check stale-project status and **No effective changes**. |
| Recipe replay is refused | Reopen the original unchanged base and donors, then recapture. The generated candidate is not its original source. |
| Map is below the screen-count limit but Build fails | PRG code, map, graphics, animation and embedded source capacity have separate limits. Read the Build Log's specific resource error. |

The World profile supports up to 32 authored/reachable Worlds and 64 reachable executable screens, subject to much smaller actual ROM capacity when data is large. Output uses 32 KB PRG + 8 KB CHR; each background/sprite bank has a 256-unique-tile bound. Player animations have bounded frame, duration and hardware sprite budgets. Empty/Solid terrain, whole-screen camera changes and the explicitly supported actor operations remain the relevant execution limits. See [World Runtime](../Reference/Current_Release_Docs/WORLD_RUNTIME.md) and [Behavior Graph](../Reference/Current_Release_Docs/GAMEPLAY_GRAPH.md) for the full technical contracts.

## Source audit and verification scope

This guide was checked against the current source on 2026-10-19: `app/src/legacy/21-config165.js`, `24-ui165.js`, `28-ui166.js`, `08-world.js`, `11-world-interaction.js`; `app/src/world/world-ui.js` and World configuration/compiler; `app/src/gameplay/gameplay-model.js`, `gameplay-ui.js`, `gameplay-compiler.js`, `gameplay-graph.js`, `movement-rules.js`, `movement-rules-ui.js`; and `app/src/mashup/mashup-ui.js`/model. The supplied Scout JSON was inspected for its actual scene, World, marker, instance and binding names. Retained manual material and current World/Graph/Movement/Mashup references were compared with those handlers and compiled-profile restrictions.

Tutorial expected results describe these audited contracts. They do not claim exhaustive real-browser, touch, listening, independent-emulator or physical-hardware acceptance. Keep a failing project and its build log when reporting a discrepancy so the documented workflow can be checked against the exact candidate.
