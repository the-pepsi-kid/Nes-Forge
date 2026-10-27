# Zelda II: native terrain, location fields and source context

This lesson describes the existing bounded editor workflows. Hosted multiplayer source-room identity, transitions and combat have their own versioned contracts; multiplayer behavior is not certified by editing an overworld map.

## Edit the supported native overworld

1. Save your current project, then choose **Open ROM / project** and the investigated Zelda II revision. Review source identity, capabilities and limits. Choose **Open editable native overworld**. The separate native World entry uses the same terrain owner.
2. Select **West Hyrule** in the native World selector. The selected terrain becomes a canonical World with one shared terrain tileset. East Hyrule, Death Mountain and Maze Island use their own source records and compressed budgets; open them explicitly when needed.
3. Pick a native terrain brush and paint a small supported change. Undo and Redo. The terrain encoder checks the original compressed allocation before accepting a stroke; simplify runs if it refuses. Native terrain behavior stays in the source engine.
4. **Save Project As**, reopen in a fresh app and select the same World. **Check current ROM build** verifies current eligibility. **Build & Run** runs the edited native engine; reach the changed terrain, then inspect the exported ROM in another emulator. A selected editor World does not select the runtime start/spawn of an authored World project.

## Location fields and recovered references

**Connected Workspace → Native tools** lists supported location controls. The verified location writer covers X/Y, scene selector and entry code only. Moving a location does not repaint its terrain or icon, establish a safe/reachable entrance, or recover quest progression. Follow the original source table and its packed flags; unsupported contexts must refuse.

**Project investigation**, **Area library** and **Resources** expose source evidence, reference art, copied poses and ordinary project assets. Native source bindings keep their original owner. Generic art, actor, collision, Audio and runtime edits without a registered encoder remain savable but can block native output. A reference-room World is not the whole overworld.

Use **ROM Audio Library** for a matching source catalog, native audition and explicit finite tracker conversion where supported. Scene-event evidence is not a new native song/trigger writer. Source cue inspection and authored Audio remain distinct. Inspect source/current/detached labels when opening another file or project.

## Work with code, hex or HTML

Use independent **RE / DISASM** for physical source bytes, CPU-bank interpretation and annotations. Source actor/animation/collision evidence is incomplete and must not be upgraded into runtime claims. Keep a ROM backup and saved native project. External patches need exact bank/offset, packed-field masks, original compressed-map capacity and a verified derivative-recognition path; never edit the projection hash to bypass a refusal.

The terrain path connects `re/zelda-overworld.js` → `services/native-world-project.js` → canonical World → `world/native-world-ui.js` → the existing BuildGraph/native backend. Location records use `re/native-engine-format.js` and `services/native-engine-project.js`. ProjectStore owns persistence/Undo; reference navigation uses SceneContext/AreaLibrary. None is a second World or source store.

For a copied standalone HTML experiment, search those module comments or `nativeWorldOpen`. For maintained changes, edit `app/src`, regenerate the native/root and optional hosted outputs, and run native terrain/save/reopen regressions. The comprehensive developer guide and original Tech Docs cover independent 6502 assembly, source exports, CHR, actor and authored-game workflows. Original characters, spells, items and native stats must not be replaced with invented rules merely to connect an editor.
