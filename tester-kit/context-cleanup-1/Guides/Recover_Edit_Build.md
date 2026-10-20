# Recover, edit and build

This guide describes the **native-transition-edit-1** candidate. It adds a route through the existing controls; it does not establish a complete recovered game or a new approved baseline.

If you are learning Forge, keep the original [first-game tutorial](../Tutorial.html) open. Its first nine steps still teach the ordinary blank-project workflow. This RE exercise is a separate session. Start from [the kit launcher](../START_HERE.html), extract the entire ZIP, and keep all files together.

## Choose the result you want

Three different workflows can show similar-looking art. Their build results are different.

| Your goal | Use this path | What you get |
| --- | --- | --- |
| See the original game or investigate its data | Original playback and RE evidence | The original game running, or decoded records and observations. An evidence report is not an editable project. |
| Reuse recovered art, room geometry, poses or supported clips in Forge | Editable resource copy | Ordinary Forge assets you can edit and save. Original gameplay, collision, scene links and music triggers are not automatically recreated. |
| Retain the investigated Zelda II engine and change supported location fields | Native-preserving Zelda project | The complete source ROM plus an edit recipe. Build & Run changes only fields with a supported native encoder. |

Use your own investigated ROM. The kit does not supply private game ROMs or their extracted assets. Recognition is tied to supported source revisions; renaming an unsupported file does not make it supported.

## 1. Run the original or inspect evidence

For ordinary playback, load your ROM in **EMULATOR** and use its playback controls. When a project retains an original ROM, **Run Original ROM** plays those retained bytes. It does not apply your project edits. **Build & Run** builds the active project and then plays that output.

For investigation, open **RE / DISASM → Open spatial RE workbench**. Use **Choose investigated ROM** to select the source, or **Use emulator ROM** to copy the currently loaded input into the workbench. Choosing a file here does not replace your authoring project or start the game.

In **Scenes & objects**, select the native context and scene. **Original initial art** shows the decoded initial background; **Native ground / tile codes** shows its investigated codes. Click a cell for source information. **Show spawn triggers** displays records, not simulated enemies. Expand **Objects, connections, native execution and limits**, and read **Coverage & gaps** before drawing conclusions about gameplay.

**Scripts & poses**, **Actors & parameters**, **CHR patterns**, and **6502 & RAM** provide other views of that source. A displayed pose does not prove animation timing. A source label or ground code does not prove complete behavior.

**Export selected scene evidence** and **Export resource catalog** save investigation records. They do not create ordinary editable assets. Use the next path when you want to paint, rearrange or save a Forge project.

## 2. Make an editable resource copy

Save your current work first. The resource importer appends assets to the current project; a downloaded standalone project opens as a separate workspace.

1. In the spatial workbench, choose a supported Ninja Gaiden or Zelda II source. Select an available scene and a pose or a supported timed Ninja script.
2. Click **Prepare editable assets**. Read the preview's page, pose, clip and World counts, source identity and limitations. Preparation alone does not change the project.
3. Choose **Import into current project**. It appends the assets with new IDs in one Undo step. Alternatively, **Download standalone project** saves a separate `.nesforge.json` workspace.
4. Click **Open imported World** to see the first recovered room map. Edit tiles in **CHR SHEET**, scene composition in **SCENE**, room geometry in **WORLD**, poses in **METASPRITES**, and supported timed clips in **ANIM**.
5. Use **Save Project As…** to preserve the editable project. Also choose **Download editable bundle** if you need the complete recovery evidence. That `.nfassets.json` file reopens with **Open editable resource bundle** without the original ROM. Project saves retain editable assets and per-page source receipts, but not the entire investigation catalog.
6. Check **Build Scene Set** and the project's runtime settings before **Build & Run**. Imported resources do not automatically become the starting World, Player, collision or game rules. A build refusal is a capacity or support result to resolve; it is not permission to discard part of the room.

The imported World contains the **selected room**, potentially split into labeled segments. It is not the assembled overworld or all connected scenes. Native exits and conditions remain evidence; Forge does not invent runnable connections. Collision starts unassigned. Zelda supplies poses without established animation timing; supported Ninja clips retain their interpreted update ticks, with incomplete scripts refused.

The first imported page joins the build set and provides sprite art. Later pages initially remain excluded. World-used metatiles may require placements in their tileset scene and inclusion of that source scene before the current viewer linker can export them. Existing mapper, atlas, metadata and seven-page viewer limits still apply. Keep the project and resource bundle even when the complete imported collection cannot fit one generated ROM.

### Bring in an audio excerpt separately

From the same spatial workbench, choose **Recover / import audio**. It opens that RE source in the Audio library without replacing the live emulator ROM. Choose a native cue, set a finite native-update window, and select **Music excerpt** or **Single-channel SFX**. Use **Play native** to audition the controlled native playback, then **Preview editable score** to inspect the proposed conversion. Choose **Import into tracker** only after reading its differences and omissions.

This creates canonical Forge Audio data, not a second audio project. Music import appends patterns/instruments, replaces the music order, and sets tempo/speed to 150/1; existing SFX timing follows that global tempo. Single-channel SFX requires project tempo 150, speed 1, and a representable one-channel window fitting one pattern. Each Audio import has its own Undo, separate from the room import. Save the ordinary project after both imports; the spatial resource bundle does not contain this Audio transaction.

The conversion is a **finite excerpt**, not automatic full-song recovery or replacement of music inside the original game. It can approximate pitches, omit sub-frame behavior and cannot transcribe DPCM or short-mode Noise. It does not recover native loops, driver control flow or gameplay-to-cue bindings. Runtime enablement and gameplay bindings remain unchanged. Use an ordinary generated Forge project for authored playback; this import does not provide a native Zelda music encoder.

## 3. Preserve the Zelda engine and edit a location

This path is currently specific to the investigated Zelda II revision. It keeps its native mapper, engine, art, audio and other ROM data. It is separate from importing reusable resource copies.

1. Save the active project. Open **RE / DISASM → Open spatial RE workbench** and choose the investigated Zelda II ROM.
2. Find **Native game edit / build** and click **Prepare native edit/build project**. Review the source identity. The preview reports four location tables, 248 static editable records and four transient read-only slots. Your current project is still intact.
3. Click **Import native game as new project**. This replaces the active workspace through the ordinary project lifecycle. It retains the source ROM, supported edit recipe and one reference room World. **Open reference room World** shows that room; it is not the complete overworld.
4. Use ordinary **Build & Run** before making edits. A no-edit native build must reproduce the original source byte-for-byte. **Run Original ROM** remains available as a separate source-playback control.
5. Return to **Native game edit / build**. Set **Native region / table** to **West Hyrule**, then **Location record** to **Location 44**. Its original **Overworld X (native coordinate)** is 50. Change it to 49, then leave the field to commit the change. Check the status message and saved-field count. This is one Undo step.
6. **Build & Run again, then save and reopen.** Use the ordinary top-toolbar **Build & Run**; there is no separate native-build button. This edit produces an output differing at the supported coordinate byte. Use **Save Project As…** and confirm a native project file was created. Reopen it with **Open Project**, check that Location 44 still reads 49, and rebuild. Return X to 50 or use Undo before saving if you want the unchanged location.

Step 6 applies the recipe to a copy of the preserved source. It does not repaint a terrain tile or move the map icon. The original engine decides how the location trigger interacts with terrain, quest state and travel flags. A changed byte or a successfully built ROM does not by itself prove a reachable, safe entrance. Check the original-game behavior you intended to change.

### Supported native fields

| Exact field label | Accepted integer range | Meaning and limit |
| --- | --- | --- |
| Overworld X (native coordinate) | 0–63 | Native location coordinate; not a WORLD editor pixel position. |
| Overworld Y (native coordinate) | 0–127 | Uses the game's original coordinate convention. |
| Native scene selector | 0–62 | Requires a nonempty destination stream in a verified context. Unresolved special destination contexts are refused. |
| Native entry code | 0–3 | Packed native code with special handling; not universally a page number. |

Each table's **Location 62 · transient slot, read only** is not editable. Neighboring flags and all other ROM bytes stay protected by the current adapter. Arbitrary ROM hacks, other revisions, complete entrance/return conditions and all movement/camera/music behavior are not covered by these four fields.

### What the project saves and what it can build

The native project saves the **complete original ROM and edit recipe** along with its authored project data. Keep this project as a private source-bearing backup. The generated ROM alone is not a substitute for the editable project.

Native projects use **schema 13** because older schema-12 editors cannot preserve the native recipe safely. Those older editors must refuse the newer project before changing their workspace. Ordinary generated projects continue to save as **schema 12**; importing ordinary resource copies does not activate the native backend.

You can save art, World paint, Audio and other authoring edits in the native project, but the native build **refuses changes it cannot encode back into the original engine**. They are not silently ignored or automatically translated. For example, editing the reference room's art or importing a tracker excerpt does not yet rewrite native Zelda graphics or music. Keep a backup of that work; use a separate ordinary Forge project for reusable authored assets. A failed build must not be mistaken for a newly generated playable result.

If the source or project changes after preparation, prepare a new preview. The source identity and change detector protect against stale or accidental input changes; they are not an authenticated signature for manually modified project JSON.

## Unfinished: one Stage → Scene context across the editor

The intended workflow is to choose a Stage, then a Scene, and have the relevant authoring and investigation views follow that context. **That common-context workflow is an unfinished requirement, not a current feature claimed by this kit.**

| Intended behavior | Current boundary |
| --- | --- |
| Scene, World, CHR, metasprite, animation, actor, Audio and source views follow one selected Stage/Scene. | Existing selectors and imported copies require explicit navigation. The reference room and a selected RE scene are not a complete shared game-context model. |
| The editor shows which music/SFX cue belongs to the scene and which event plays it. | Native cue catalogs and finite Audio imports exist; complete scene/event-to-cue bindings remain unresolved. |
| Shared assets identify every context that uses them and retain source provenance through edits. | Resource imports retain receipts and evidence, but do not establish all cross-scene uses or a complete dependency-aware editing workflow. |
| Editing a recovered game and rebuilding preserves the chosen native behavior or explicitly converts it. | Only the declared resource conversions and Zelda location-field encoding are supported here. Missing encoders and unverified behavior must remain visible. |

This requirement does not imply new implementation in the recovered kit. Full connected maps, collision/AI/physics, animation timing for every actor, quest state, native art/Audio encoders and complete playable reconstruction remain unfinished.

## Before reporting a result

Record which of the three paths you used, the candidate identity, selected native context/scene or location, exact control, expected result and actual result. Keep the original ROM and last native project backup. Attach only material you have permission to share; a source-bearing project contains the original game.

Use [the feedback template](../Feedback_Template.txt). Mark untried steps **Not tested** and unavailable steps **Blocked**. A screenshot, successful evidence export, successful project save and successful ROM build are separate observations. Return to [the first-game tutorial](../Tutorial.html) for the original nine-step authored-game exercise.

The current context-cleanup-1 app retains these native workflows and adds navigation over existing project scenes, room pages, Worlds, poses and clips. Full source Stage/Scene synchronization and scene-to-cue bindings remain unfinished. See [Scene resources](Scene_Context.html).
