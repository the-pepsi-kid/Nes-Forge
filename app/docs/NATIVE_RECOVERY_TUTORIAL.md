# NES Forge developer and asset workflow guide

This guide describes the current source checkpoint, using Punch-Out as a worked recovery example. It is intended for people who want to use the visual editors, investigate an unknown ROM, write an adapter, write 6502 code, patch bytes independently, or modify NES Forge itself. Game recognition is optional for general inspection. Each game's editable native output depends on the encoders actually installed for that revision.

The standalone HTML contains the application, not your subsequently saved project or an embedded commercial ROM. Keep the HTML, your project JSON, original input and any rebuilt output separately. An updated HTML can open your saved project; replacing the HTML does not transfer unsaved browser state automatically.

## 1. Choose an entry point

| Goal | Starting workflow | Result | What must be verified |
|---|---|---|---|
| Create original art or a game | Start a separate authored project; use the asset tabs and chosen Forge runtime | Canonical assets and a generated Forge ROM within that runtime's capabilities | Build backend, references, limits and play behavior |
| Inspect an unfamiliar ROM | Open ROM / project → Inspect bytes / CHR; RE / DISASM | Physical layout, byte ranges, candidate disassembly, notes and explicit gaps | Bank mapping, code/data distinction, runtime observations |
| Edit a recognized game's supported data | Prepare recovered resources → Import as new project; Area library or Recovered content | Source-preserving project, native recipes and/or editable copies | The selected field has a native encoder; save/reopen; original-engine output |
| Write 6502 code | CODE in a separate authored project; assembler templates | Assembly source, symbols and emitted bytes | Reset/NMI/IRQ vectors, memory placement and live custom build settings |
| Hex edit a ROM yourself | Export/copy bytes to your external hex editor, or use a narrow supported native-command editor | A separately patched ROM | File offsets, bank mapping, aliases, checksums, execution and recognition after patching |
| Change the app | Edit modular source and bundle, or edit a separate standalone HTML copy | A modified NES Forge executable | Syntax, UI lifecycle, saved projects, native output and retained features |
| Reuse recovered material in a different engine | Explicitly convert/import supported assets into an authored project | Forge adaptations | Conversion fidelity and the new runtime's rules; original-game patching is separate |

The general-analysis hex pane currently displays bytes; it is **not a general inline ROM hex editor**. Reversible RAM experiments affect the loaded emulator session, not the source ROM. The dedicated native command-byte Audio editor is narrow and profile-specific; it does not provide a general Punch-Out Audio writer. These are different tools with different output ownership.

## 2. Understand the three representations

1. **Source:** `importedRom` preserves the input bytes. In project JSON it is Base64; the live editor holds bytes. `nativeGame.sourceSha256` identifies those bytes. Never edit one without updating and validating the complete source descriptor and associated evidence.
2. **Evidence:** `investigation` and decoder catalogs describe observations, source ranges, profiles and gaps. They are not a second asset database or executable game source. Viewing a catalog does not mean every item has been materialized into an editing tab.
3. **Canonical authoring assets:** `scenes`, `worlds`, `metasprites`, `animations`, Audio collections and gameplay records are the editable project. Some are linked to native recipes; others are recovered copies or adaptations with no inverse writer.

A useful recovery must state separately: *recognized, decoded, materialized, editable, natively encodable, and verified in play*. A source can be recognized without complete assets. A recovered animation can be edited and saved without being patchable into the original game. A byte-preserving native build can succeed without showing that a new visual edit works.

`ProjectStore` owns serialization and lifecycle. `AssetRegistry` resolves authoring references and reports missing/duplicate IDs. `BuildGraph` and `RuntimeCompiler` choose and execute the build path. Recovery adapters use those owners rather than creating another lifecycle or replacing the editor.

## 3. Complete asset map

The fields below identify the important records, not every optional extension. Use a saved project produced by the current app as the schema example. `ProjectStore.prepareLoad()` and the relevant model validators are authoritative for exact accepted fields and limits.

| Asset | Canonical location and meaning | Editor workflow | Code to inspect first | Native-ROM implication |
|---|---|---|---|---|
| Scene | `scenes[]`: stable ID, name, background, sprites, palette, entities, links, settings | Select a Scene, edit its resources, save; use Area library for source pages | `legacy/05-foundation.js`, `services/scene-context.js`, `services/area-library.js` | Only the adapter's supported fields become native edits |
| Background CHR | `scene.chr[tile][y][x]`: 8×8 pixel indices 0–3 | CHR editor; select background bank and tile; change pixels | `legacy/04-saveas-chr.js`, `re/re-native-assets.js` | Copied pixels are not a physical ROM patch without a CHR encoder |
| Sprite CHR | `scene.sprChr`: separate sprite pixel bank | Select sprite graphics in CHR; check the sprite palette and frame using it | Same CHR owners; `re/punch-out-content.js` for native banks | Physical bank/latch context and shared uses must be resolved before writing |
| Background arrangement | `scene.nt`: 960 tile references, 32×30 | SCENE paint, fill and eyedrop tools; choose the correct selected Scene | `legacy/00-editor.js`, native resource/arena modules | Native tile IDs may differ from projected CHR atlas indices |
| Attribute bytes | `scene.attr`: 64 bytes selecting background palette IDs by 16×16 quadrants | Paint palette IDs with tiles; inspect neighboring cells | Scene paint code; arena projection/encoder | This selects an existing palette; it does not change palette colors |
| Palette colors | `scene.pal`, `scene.sprPal`: four color groups | Palette picker, then inspect tiles and scenes sharing those colors | Scene/CHR renderers and native decoder palette provenance | Color-table writing is separate from attribute writing |
| Sprite placements | `scene.oam[]`: x/y, tile/tile2, attribute, height, active, optional provenance | Sprite/Scene tools; verify flips, priority and size | `legacy/00-editor.js`, `re/punch-out-content.js` | Original OAM is runtime state; editing a copied placement is not editing original animation code |
| Metatile definitions | `scene.metatiles[]`: groups of CHR tiles, palette/collision data | Build/edit a metatile library, then place it on a map | `legacy/07-metatiles.js` | A native game's block format may require an adapter-specific mapping |
| Metatile map | `scene.metaMap`: 16×15 metatile references for a Scene | Edit using the metatile tools; verify underlying tile projection | Same metatile owner | Do not assume a visual block equals a native record |
| Collision properties | `scene.tileProps` and applicable per-cell/metatile extensions | COLLISION; assign properties and inspect runtime behavior | Metatile/World compilers; `services/build-services.js` | No collision meaning can be inferred reliably from tile appearance alone |
| Metasprite pose | `metasprites[]`: ID, `sceneId`, size, origin, pieces with offsets/palette/flips | METASPRITES; assemble pieces from sprite CHR | `legacy/13-metasprites.js`, `services/punch-out-content-recovery.js` | A pose copy can be editable without a native pose writer |
| Animation | `animations[]`: timed frames, pose references, loop/state, boxes/events | ANIMATION; edit frames/durations and preview transitions | `legacy/14-composed-animation.js`, `legacy/16-model.js` | Native timing/control-flow translation needs a separate writer |
| Hitboxes/hurtboxes | Animation frame `hitboxes` / `hurtboxes` | Edit contact boxes at the relevant frame and test runtime support | `legacy/16-model.js`, gameplay compiler/engine | Editor boxes are not automatically the native game's collision routine |
| Frame events | Frame `events[]` with typed marker information | Add/reorder events; inspect when the consuming runtime triggers them | Same model plus Audio/gameplay runtime | Observed native sound-request metadata is not an authored event by itself |
| Scene entities | `scene.entities[]`: placed authoring objects and animation bindings | Entity tools; place objects, bind states and destinations | `legacy/18-entity-studio.js`, `legacy/16-model.js` | Native object placement/AI formats are separate recovery work |
| Gameplay actors | `gameplayCore.actorDefinitions`, `actorInstances`, `behaviors` | Gameplay editor; choose supported components and typed behavior operations | `gameplay/gameplay-model.js`, compiler/engine/UI | Available authoring operations exceed the bounded compiled runtime subset; validate the backend |
| Persistent variables | `gameplayCore.persistentVariables` plus instance bindings | Define type/scope, bind actors and test room/world transitions | Gameplay model/compiler/engine | Native save flags and RAM addresses require an explicit mapping |
| Scene links / doors | `scene.links`, entity destinations and corresponding World markers | Connect scenes; verify destination IDs and build inclusion | Scene, entity and World services | A destination coordinate alone does not establish reachable/safe native travel |
| World | `worlds[]`: dimensions, `tilesetSceneId`, metatile map, rooms/markers/cameras | WORLD; choose tileset, paint, configure rooms and test transitions | `world/`, `legacy/08-world.js`, `legacy/09-world-codec.js` | A source-native World adapter and a Forge-authored World are different build paths |
| Runtime settings | `gameplay`, `gameplayCore`, `worldRuntime`, `audioRuntime` | Select the intended mode and enable only supported runtime features | Config/model modules; `services/build-services.js` | These do not rewrite a preserved game's engine without an encoder |
| Instruments | `instruments[]`: duty/volume/arpeggio/pitch envelope data | AUDIO instrument editor; audition in context | `audio/audio-engine.js`, UI/compiler/import modules | A native envelope table may not have an equivalent canonical instrument |
| Patterns | `patterns[].rows[row][channel]`: notes, instruments, volume, effects fields | AUDIO tracker note entry; inspect rows/channels and preview | `audio/audio-ui.js`, engine/compiler | Supported effects depend on the preview/compiler; storing fields does not imply execution |
| Order list | `orderList`: pattern selections over song sequence positions | AUDIO sequence/order editing | Audio engine/compiler | Native loops, section dispatch and channel arbitration may not map 1:1 |
| Tempo/speed | `tempo`, `speed`, `audRows` | AUDIO timing controls; compare expected musical timing | Audio model/compiler | Native update timing and per-driver duration tokens may differ |
| SFX | `sfx[]` plus runtime scheduling/event references | AUDIO SFX tools; inspect priority and channel use | Audio compiler/engine/config | Procedural native effects cannot always be represented as tracker notes |
| Native Audio cues | Source-owned catalog, stream descriptors and sample references | AUDIO → ROM Audio Library → inspect/audition/explicit conversion | `re/native-audio-*`, `re/punch-out-audio.js` | Native audition, canonical adaptation and native rewriting are distinct |
| DPCM / direct PCM | Original sample bytes and/or DAC-producing native routine | Native audition where installed | `re/native-audio-machine.js`, Punch-Out Audio module | No generic tracker PCM/sample authoring or Punch-Out native Audio writer |
| Assembly | `asmSource`; live assembler emits symbols/binary/write addresses | CODE; assemble, inspect errors/symbols and build in supported custom mode | `legacy/00-editor.js`, `services/build-services.js` | Disassembly of native bytes is not a rebuildable assembly project |
| Code/byte evidence | Analysis sessions, annotations, ranges, candidate symbols | RE / DISASM; choose offsets, CPU origin and bank labels | `re/re-analysis.js`, UI, source workspace modules | General analysis is read-only; exports/evidence do not patch ROMs |
| Raster state | Optional Scene `raster` and capture/source metadata | Inspect whether recovery preserved bank/scroll/palette changes | `legacy/03-runtime-capture.js`, native renderers | Mid-frame behavior must remain modeled or explicitly unsupported |
| Native recipes | `nativeGame.edits` plus bindings and registered Scene writers | Native brush or declared supported Scene edits | `services/native-resource-project.js` | Recipes refer to physical operands; aliases must agree |
| Source metadata | `captureMeta`, `investigation`, source hashes | Inspect provenance and limits; preserve on save | ProjectStore and adapter validation | Changing evidence/hashes to silence an error is not implementing an encoder |

For a Scene currently selected in the UI, `S.chr`, `S.nt`, palettes and other top-level working arrays mirror its content. `saveCurrentScene()` synchronizes them before capture. Editing a detached project JSON is different from changing the live `S` buffers; avoid creating competing versions of the same Scene.

Raw CHR banks contain patterns. A sprite sheet is a view of those patterns; OAM places them; a metasprite assembles a pose; an animation sequences poses; an actor combines appearance and behavior; a complete scene adds background, UI, palette/bank/raster context and runtime relationships. Recovering one layer never proves the others exist.

## 4. Visual asset editing, end to end

### Backgrounds, tiles and palettes

1. Save a baseline project. Select the actual target Scene or source page. A fighter-source Scene intentionally has a blank background; an intro Scene is not the fight arena.
2. Inspect its CHR and palette. If source graphics are banked, record physical bank and runtime latch/scroll context. Do not replace missing placement data with a tile sheet and call it a recovered scene.
3. Paint the Scene layout, or edit CHR pixels deliberately. Palette-ID painting changes attributes; the color picker changes palette colors. These require different native writers.
4. For a native project, check the declared supported fields. Punch-Out arena `nt`/visible attribute edits are encodable. For native artwork/color edits, open the dedicated physical CHR or fight-palette views described in section 15; direct edits to copied arena/fight-reference art remain unsupported. Unsupported edits remain savable but block native builds.
5. Undo, Redo, save, reopen and rebuild. Enter the game state that uses the data. Test neighboring rows, page seams, offscreen dependencies and shared uses.
6. Re-import the rebuilt ROM if continuing from it. This checkpoint restores Punch-Out recognition for bounded arena derivatives; arbitrary patches outside recognized ranges still need adapter investigation.

Background CHR pixel 0 is the background color selection; sprite pixel 0 is transparent. Sprite/background palettes and bank selection are separate. Some projected source Scenes can use more than 256 logical tiles to preserve bank-dependent rows; those logical indices cannot be written directly to an 8-bit native tile stream.

### Sprites, metasprites and animation

Open **Recovered content** for source poses or the regular editors for authored work. Select fight/pose, preview, then explicitly open a supported pose in Metasprites. Verify the pose's source Scene, sprite size, origin, piece order, flips, palette and CHR bank.

For timed source recovery: **State animation excerpts → Trace state → Open recovered animation**. Inspect assumptions and stop conditions. Frames changing size must retain the native tile stride; incremental poses must retain the preceding OAM. Adjust canonical frame timing or pieces, preview, save and reopen. This does not yet encode those changes into Punch-Out's original animation streams.

When creating authored animation, keep stable metasprite IDs, reference their Scenes, set duration/loop behavior and bind entity states to animation IDs. Test hitboxes, hurtboxes and events in the intended runtime; the editor preview alone does not establish compiled behavior. Do not delete a referenced Scene or pose to make room without reviewing the references reported by AssetRegistry.

### Worlds, collision, actors and interactions

For an authored World, establish the tileset Scene and metatile library before painting its map. Define rooms, markers, destinations and camera regions; test travel in both directions and after room reload. Enable the intended World/runtime settings. A saved marker is not evidence that a native game's original travel code uses it.

For authored collision, choose properties based on intended mechanics, then test actor movement/contact. Verify per-cell overrides and metatile projection where applicable. For actors, distinguish a reusable definition from placed instances. Keep variables typed and scoped, use only operations supported by the compiled backend, and test deterministic transition priority, spawn/despawn, slot reuse and persistence across rooms. Refer to `GameplayModel.runtimeProfile` for the bounded native runtime subset rather than assuming every UI operation is compiled.

For native projects, recover these domains from original tables/code independently. Tile appearance, pose geometry and enemy labels cannot establish physics, damage, AI or save-state semantics.

### Audio

On every project verify driver detection, cue inventory, native audition, explicit editable conversion where supported, save/reopen and preservation after Scene rebuilding. Empty/stop/unavailable cue slots should be labeled rather than counted as sounding music.

Native audition runs original driver code with native sample sources. Tracker conversion makes finite canonical patterns/instruments where representable; listen for differences in envelopes, pitch slides, channel ownership, noise, loops and DPCM. Save the project, reopen, audition again and compare Scene-edited output. Audio writing requires its own native encoder.

Punch-Out's startup PCM runs a separate one-shot routine across continuous CPU-cycle windows, with native bell writes. Select at least 199 updates for full isolated playback. Shorter windows report truncation. It is auditionable, but PCM tracker editing and native sample rewriting remain open.

## 5. Manual RE workflow

1. **Identify the input.** Record size, full hash, header, trainer/trailing data and physical PRG/CHR layout. Preserve the input unchanged. A legacy header can disagree with observed bank-switching code; keep the disagreement explicit.
2. **Choose an explicit range.** General analysis accepts physical file offsets, length, CPU origin when known, and bank labels. File offset and CPU address are not interchangeable.
3. **Separate code from data.** Linear disassembly is a hypothesis. Check reset/NMI/IRQ vectors, reachable calls, indirect pointers, bank changes and data reads. Label uncertain ranges.
4. **Find consumers.** Trace PPU writes for backgrounds/palettes, OAM construction for sprites, APU writes for sound and RAM/state routines for behavior. The code consuming a record establishes its meaning.
5. **Make a reproducible observation.** Save an emulator checkpoint, replay scripted input or apply a reversible RAM experiment. Record starting state and stopping condition. Runtime experiments do not patch the ROM or authored project.
6. **Retain evidence.** Record bank + CPU address + physical offset, operand width/endian order, bounds, aliases, decoded meaning and unknown context. Export notes/report separately from project changes.
7. **Implement only an established claim.** A private decoder can return a read-only catalog before any visual import or writer exists. Unknown sources remain inspectable without a guessed adapter.

For 8 KiB banks in a standard header/no-trainer example:

```text
fileOffset = 16 + physicalBank * 8192 + (cpuAddress - windowStart)
```

This formula requires a known mapped window. A trainer changes the payload start; NES 2.0 and other layouts need their actual container description. Read the container/layout owner instead of hard-coding 16 for an arbitrary game.

## 6. Worked native codec lesson

Run the included exercise with Node:

```bash
node app/docs/native-codec-exercise.cjs
```

It defines an original teaching format, not a commercial ROM. A header points to fixed-capacity `[count, tile]` RLE data describing eight cells. Read its `decode`, `encode` and `exercise` functions in order.

The exercise demonstrates: strict bounds; a canonical grid; edits on a detached copy; run compression; capacity refusal; preservation of unrelated bytes; decoding the candidate; JSON save/reopen; and byte-identical unchanged derivative output. Extend it by adding a second shared view, then ensure editing a shared operand updates both views. Next add attributes as a separate record and reject mismatched ownership spans.

In Punch-Out, the method becomes:

1. `punch-out-layout.js` independently interprets native PPU commands and records which output cells share literal operands.
2. `native-punch-out-resources.js` projects static backgrounds while retaining actual CHR-latch row context. The physical operand, not each visible cell, owns a native literal recipe.
3. `punch-out-arena.js` executes the original setup loader on a private bus, recovers two raw nametables, then projects a viewport using NT1 and scroll `$B0`.
4. Each visible cell retains `cellSources`: its source nametable and native cell. This is the inverse map required by the writer.
5. `punch-out-arena-encoder.js` copies raw pages, applies supported tile/attribute changes back through that map, compresses into four streams, and stays inside the original 381-byte area plus four pointer words.
6. The encoder executes the original loader again on the candidate and compares all raw pages and the visible projection. Oversized or unrepresentable edits refuse with a useful error.
7. `punch-out-arena-writer.js` registers the encoder with the existing native build owner. It masks only `nt`/`attr` during projection-signature validation; CHR, colors, actors and unrelated settings remain protected.
8. The shared native owner composes literal recipes with arena writes, rejects overlapping claims, checks every changed byte and returns an artifact to the existing RuntimeCompiler.

The compressor searches native literal, repeat, increment and repeated-sequence operations. Each page has two streams indexed by an 8-bit Y register: command bytes plus a terminating zero must fit before wrap. Minimal encoded byte cost and successful stream partitioning are different requirements; both must be checked. No general relocation/expansion is implemented.

The 2026-10-24 derivative correction adds a separate immutable identity for those supported arena write ranges. Recognition may ignore only declared mutable data and must still decode bounded valid programs. This does **not** grant the literal brush ownership of the arena. Current stream pointers must stay in the owned area, terminate without Y wrap and initialize exactly both pages. Changes to header, code, Audio or CHR remain outside that identity.

## 7. Installing another decoder or encoder

Keep four responsibilities separate:

| Layer | Inputs and outputs | Project side effects |
|---|---|---|
| Decoder/model | Source bytes → bounded records, geometry, provenance and gaps | None |
| Projection/recovery service | Validated records → canonical Scenes/poses/Animation and bindings | Returns a prepared copy; does not commit UI state |
| UI | Selection → preview → validated, guarded import | One existing snapshot/ProjectStore transaction |
| Encoder | Preserved bytes + supported edit intent → candidate bytes + diagnostics | Returns a copy; never mutates source in place |

Add your module at the correct place in `app/source-manifest.json`. Dependencies must execute before their consumers, and `composition.js` initializes the application after services/UI registration. Existing Punch-Out recovery wraps prior `NativeResourceProject.create` implementations; capture the preceding function instead of recursively calling the newly installed service.

For a Scene writer the current registration contract is:

```js
// Sketch of the existing interface; provide real implementations and verified
// source ranges for your adapter. This is not a universal encoder.
owner.registerSceneEncoder({
  id: 'your-verified-scene-format-v1',
  matches(project, info) { /* identify supported project and Scene */ },
  views(project, info) { /* [{id, nt: sourceNT, attr: sourceAttr}] */ },
  spans(project, info) { /* [{offset, length}] exclusively owned ROM bytes */ },
  encode(bytes, project, info) { /* {bytes: candidate, diagnostics: []} */ }
});
```

`views` controls supported-field signature comparison. It must not hide unrelated changed fields or accept Scenes from another source. `spans` declares writes, not generic permissions to modify the ROM. `encode` must preserve all preceding disjoint edits and reject anything it cannot represent. Dedicated Punch-Out art views now use explicitly bounded `chr`, `pal`, `sprPal` and `bgColor` masks through that same owner. Unknown fields and duplicate claims refuse; unrelated Scene state stays protected.

Before rebasing `projectionSha256` when adding recovered assets, validate the preceding project's native build. Otherwise unsupported user edits can accidentally become accepted baseline data. Re-sign only deliberate, validated source-derived additions. Do not hand-edit the hash to bypass a refusal.

## 8. Writing 6502 code yourself

Use a separate authored project for custom assembly. Save the native recovery project first. In CODE choose the Minimal boot ROM or Scene viewer template; inspect the code before replacing any existing source. Use Assemble / Ctrl+Enter and review errors, symbols, origin and emitted bytes.

The assembler supports the implemented syntax including labels, `.org`, `.byte`, `.word` and supported instructions/addressing modes. Consult `asm_assemble` for exact syntax. Overlapping addresses, out-of-range branches and unresolved operands must be fixed before output.

A minimal boot template intentionally shows no graphics: it disables rendering, establishes a stack and loops, with reset/NMI/IRQ vectors. Add PPU initialization, graphics upload, NMI updates and controls deliberately. Use a complete live custom project build and test the emitted reset path.

`BuildGraph.backendFor` selects `native-engine` when a preserved native descriptor is present. Writing text into CODE does not turn that descriptor into a safe arbitrary native code patch. For authored custom output, use the matching viewer/custom settings; `packScenes=false` plus assembly and no conflicting gameplay/World mode selects unpacked custom output. Runtime Audio cannot be automatically injected into custom assembly. Detached compilation cannot invoke the live assembler.

For editing an existing game's code, assemble the replacement with your toolchain or the supported assembler, map CPU writes into the correct physical bank, reserve/verify owned space, and produce a separate patched ROM. Recover relocations, callers, vectors and timing as needed. Re-import for inspection; adding native adapter recognition/build support is a separate step. A disassembly listing alone is not complete linkable source.

## 9. Hex editing yourself

Create a copy and record the exact original hash. Locate the physical offset using the active bank and container layout; verify expected original bytes before a patch. Change one field, export a distinct ROM and compare all changed ranges. Preserve your patch recipe separately so it can be reapplied and reviewed.

For a one-byte observation, check every consumer: compressed operands can expand into many cells; pointers can be little-endian and bank-relative; palette bits can affect four neighboring tiles; CHR patterns can be shared across unrelated Scenes. A value used as both graphics and a latch control has runtime side effects.

Reopen the patched ROM in general analysis regardless of whether a specialized adapter recognizes it. If a protected code/CHR/Audio byte changed, the adapter may correctly stop recognizing the derivative. To support it as an editable native project, establish its new identity, verify its structures and add bounded writer support. Do not relax detection to a filename, mapper number or broad checksum mask.

For RAM hypotheses use the reversible experiment controls: checkpoint, apply, replay, restore or keep. Keeping changes only that emulator session. To make the behavior persistent, identify and patch the native initialization/update code or save format separately.

The read-only analysis pane, reversible RAM editor, narrow native command editor and external hex editor remain complementary workflows. None should silently replace or modify the current saved project.

## 10. Editing the standalone HTML or modular source

### Edit the HTML directly

1. Copy the working HTML and save your project JSON. Open the HTML in a text/code editor.
2. Search for `NES FORGE DEVELOPER MAP`, then the relevant `NES FORGE MODULE:` or `NES FORGE CONNECTION:` marker. For unchanged legacy modules search the function names in the source index near the top.
3. Change one function, string, UI style or explicitly defined data structure. App JS/CSS lives in the HTML; native game assets appear only after your input is loaded. There is no hidden fixed bank of every game's assets in the application source.
4. Keep the script structure intact, avoid a literal closing script tag inside JavaScript data, and check DevTools Console after reopening the edited file. IIFE-local variables are scoped to their modules; the documented `Forge.services` APIs connect modules.
5. Test fresh startup, existing project load, the changed workflow, Undo/Redo, save/reopen, native output and Audio where applicable. Keep the last working HTML alongside the candidate.
6. Port a successful direct change back to its source module before running the bundler. Bundling regenerates the HTML from source and overwrites direct-only changes.

Changing an HTML function changes the application for future sessions. Changing a saved JSON field changes that project. Changing bytes in a rebuilt `.nes` changes the game. Pick the intended artifact rather than replacing all three.

### Edit modular source

`app/source-manifest.json` lists the ordered parts. `app/tools/bundle.py` concatenates them deterministically; it does not transpile, install packages or fetch runtime dependencies. Work in `app/src/`, then run from the repository root:

```bash
python3 app/tools/bundle.py
python3 app/tools/bundle.py --check
node app/docs/native-codec-exercise.cjs
python3 reviews/punch-out-developer-1/run_checks.py
```

The generated standalone app remains `app/mainline/NES_Forge_2.0.0-alpha.11.html`. The downloadable filename can differ while containing the identical bytes. `app/build-inputs.json` records input sizes/hashes and the generated identity. No server is required for the standalone editor; browser/device APIs still have their own capabilities.

Keep comments near decisions: source ownership, pointer mapping, private buses, work limits, stale-source checks, signature masking, alias updates, compression limits and failure behavior. Avoid comments that merely repeat a variable name. Historical metadata strings can be part of saved projection signatures; changing them may require a compatibility plan, not just a wording replacement.

### Source navigation

| Responsibility | Files below `app/src/` |
|---|---|
| Shell/CSS/static controls | `shell-prefix.html`, `shell-suffix.html` |
| Original editor/assembler/undo and historical layers | `legacy/00-editor.js` through `legacy/29-release166.js`; follow later wrappers in manifest order |
| Shared CPU instruction behavior | `services/cpu6502-core.js` |
| Persistence and reference lookup | `services/project-store.js`, `services/asset-registry.js` |
| Build planning and output | `services/build-services.js`; runtime-specific compilers |
| Project capabilities and applicable controls | `services/project-capabilities.js` projects `BuildGraph.backendFor` and native owners; encoder registrations declare their own available scope. `ui/connected-workspace.js`, intake, Scene context and Area Library display it. `legacy/05-foundation.js` guards generated build-selection controls; `legacy/00-editor.js` and the shell guard native ROM configuration. |
| Emulator/player | `legacy/01-emulator.js`, `services/emulator-*`, `services/mmc2-emulator.js`, `re/mmc2.js` |
| Input and analysis | `services/project-gateway.js`, `re/project-gateway-ui.js`, `re/re-analysis*`, `source/` |
| Native resource ownership | `services/rom-project.js`, `services/investigation-project.js`, `services/native-resource-project.js` |
| Scenes and navigation | `services/scene-context.js`, `services/stage-context.js`, `services/area-library.js` |
| Punch-Out native formats | `re/punch-out-*.js`, `re/native-punch-out-resources.js` |
| Punch-Out asset projection/build registration | `services/punch-out-*.js` |
| Native Audio catalog/playback/import | `re/native-audio-*.js`, `audio/native-audio-library-ui.js`, driver-specific modules |
| Authored Audio | `audio/` |
| Worlds and gameplay | `world/`, `gameplay/` |
| Mashup/donor conversion | `mashup/`, source asset import services |
| Final initialization | `composition.js` |

## 11. Prove the workflow, not just the helper

Begin with the current backend in **Connected Workspace**. Native tools lists the current project's registered writers, with explicit pickers for resources such as Punch-Out CHR banks and Glass Joe poses. Availability is separate from build acceptance: an unsupported copied edit can still block output. Native projects preserve their original engine configuration and do not use the generated Scene inclusion/order controls. Generated packed builds retain that selection; World output follows its saved dependencies, and unpacked custom assembly uses active CHR. No capability label changes a project signature or supplies an encoder.

A decoder and its tests can share a wrong assumption. Earlier Punch-Out tests missed an import-path difference and mirrored rendering assumptions. Test original loaders and independent observations, and exercise the actual UI entry points.

For each supported asset/field, record:

- Original-byte identity and revision; decoder bounds and explicit unresolved states.
- Native/reference output agreement, including banks, palettes, flips and timing assumptions.
- Actual Open ROM / project → prepare → import path, not only direct `create()`.
- Preview without mutation; stale preview rejection; one Undo transaction for import.
- Edit → Undo → Redo → Save Project As → reopen in a fresh app instance.
- Unchanged build preserves original bytes; changed build modifies only owned ranges.
- Original engine reload reproduces edits; derived-ROM re-import retains supported content.
- Shared operand edits affect all aliases; unsupported/overflow/malformed edits refuse clearly.
- Audio driver/cues/audition/conversion/reopen and Scene-build preservation.
- Retained core tools and other verified projects; browser appearance, listening and play acceptance separately.

For Punch-Out, preserve offscreen PPU fetch side effects. Its mapper selects CHR banks when particular pattern addresses are read, even if the fetched tile is outside the displayed viewport. The current mapper-9 renderer retains 34 background pattern fetches per scanline; clipping output pixels must not remove bus activity. The prior visual corruption also occurred with the untouched ROM, which separated the player defect from the arena writer.

This correction does not establish a cycle-accurate NES PPU. Full fights, alternate states, sprite/prefetch ordering, browser listening, controls and hardware remain separate acceptance work. MMC2 runtime capture is still explicitly unavailable.

### Current verification commands

Public synthetic/retained suites and the tutorial exercise:

```bash
python3 reviews/punch-out-developer-1/run_checks.py
```

Supplied-input workflow checks (local ROM directory required; no game assets are distributed):

```bash
node reviews/punch-out-developer-1/verify_reimport.cjs /path/to/private-roms
```

Additional retained original-loader/build and player comparison scripts live in `reviews/punch-out-arena-runtime-1/`. Their reports are dated checkpoints, not automatic evidence for later edits. The restored snapshot lacks some historical full-release suite scripts; the current available gate must not be described as the complete historical release gate.

## 12. Debugging and extending the project

| Symptom | Inspect first | What the result tells you |
|---|---|---|
| CHR sheet displayed as a scene | Selected context, layout decoder, bank/palette projection | Patterns may be recovered while placement is missing |
| Recognized original becomes generic after rebuild | Immutable identity ranges and current command validity | Output may be valid but outside the adapter's admitted derivative format |
| Correct intro but missing ring | Scene catalog vs arena source programs/scroll | Different runtime contexts must be assembled separately |
| Fighter garbled after a size change | Native sprite-size and tile-stride state, prior OAM and CHR | Independent frame decoding may have discarded required context |
| Scene edit saves but build refuses | Projection signature and registered encoder scope | Saving is working; an inverse writer is missing or edit is unsupported |
| Native load reads correct bytes but live picture is wrong | Untouched ROM, PPU bank/latch/scroll timing | The player can be the defect rather than the writer |
| Audio missing after reopen | Investigation restore lifecycle, input bytes, profile identity and catalog | Check shared loading path before inventing another driver |
| Hex patch loses recognition | Protected ranges and revised data/control flow | Investigate the new revision; do not silently weaken recognition |
| Asset changes disappear after selection | Active `S` working buffers vs Scene serialization | Update through existing owners and capture/commit consistently |
| Direct HTML changes disappear | Source module vs generated output | Port the change into `app/src` before rebundling |

A useful contribution includes a bounded claim, source references, readable module comments, owned data ranges, failure behavior, lifecycle/Audio evidence and a clear list of remaining gaps. Another developer should be able to replace the decoder, use an external toolchain, or patch a separate ROM without losing access to the rest of NES Forge.

## 13. Concrete asset edits from JavaScript or HTML

To make a deliberate one-time project change from DevTools, use a captured copy and the same transaction as the recovery UI. This example paints an existing tile in the selected Scene. Use it on an authored Scene or the supported recovered arena, with a valid tile number for that Scene:

```js
const store = Forge.services.ProjectStore;
const project = store.capture();
const scene = project.scenes[project.activeScene];
const x = 12, y = 19;
scene.nt[y * 32 + x] = 36;
const prepared = store.prepareLoad(project);
if (snapshot() === false) throw Error('History could not retain the current project');
store.commit(prepared, {sync: true, intent: 'manual-scene-tile'});
notify('manual-scene-tile');
```

The transaction preserves ordinary Undo/Redo and lets ProjectStore normalize/validate data. Save Project As to make the edit portable. A native recipe-owned intro page may refuse this direct Scene edit because its physical recipe must be changed through the native brush; the arena has its own Scene encoder. This example grants no new native writer capability.

The same detached-copy transaction can deliberately change a pixel (`scene.chr[tile][y][x] = colorIndex`), a palette color (`scene.pal[group][slot] = nesColor`), a sprite piece, or an animation duration, provided the relevant validator accepts the value and all IDs/references remain valid. Native output can still refuse when those fields lack writers. For a multi-asset change, prepare and commit the full project once instead of repeatedly mutating live arrays.

To bake an application change into HTML, edit the owner function rather than pasting project data into a random global. Examples:

| Intended change | Edit location / method | Test |
|---|---|---|
| Change button text/help | Search the control ID and its `textContent` or shell markup | Fresh load and the workflow that updates that label again |
| Change editor appearance | Relevant CSS in the shell or module's generated style | Desktop/narrow widths, scrolling and controls |
| Change a default authored asset | Find its factory such as `makeScene` or the relevant model defaults; distinguish later wrappers | New authored project plus loading an older saved project |
| Change native scene projection | The decoder's placement/palette/bank mapping; preserve provenance and inverse map | Independent original-loader/render comparisons and native edit rebuild |
| Add a recovered asset tab connection | Recovery service + explicit UI materialization through ProjectStore | Source selection, stale preview, Undo/Redo and save/reopen |
| Change an animation recovery rule | State decoder plus canonical projection, not only the preview renderer | Full observed update sequence, durations and source context |
| Change native build behavior | Existing owner/registered encoder and its exclusive write ranges | Original-engine decode, protected bytes and derivative re-import |
| Change sound recognition/playback | Driver identity/catalog or NativeAudioMachine as appropriate | Every affected cue, native register timing, cancellation and reopening |
| Patch game bytes | Separate copied ROM plus documented physical patch ranges | Binary diff and original-engine run; revised adapter identity if needed |

For an HTML-only experiment, put the change inside the relevant existing module closure or at a documented service extension point. Simply appending code after the closing script does not execute it as JavaScript; installing code after application startup can also miss required registrations. Port the final change into the corresponding source module and manifest order.

Do not paste a private source-bearing project into the application template. Ordinary asset exports/imports and saved JSON provide portable asset work; the application remains reusable across projects.

## 14. Glass Joe fight references: Mac, referee and HUD

The next recovery pass adds a **Glass Joe fight reference · Little Mac / referee / HUD** section inside **Recovered content**. Open the supported original or an existing recovered project, click **Recovered content**, then expand that section.

- Choose a **Little Mac command** and a **Referee / speech command**, then **Preview pose composition**. There are 98 Mac and 47 extended referee/speech command descriptors. These are source commands: some clear cells, draw a fragment or update a count/speech bubble. They are not all self-contained full poses.
- The default combines Mac command 0, referee command 144, and Glass Joe source pose 0. The opponent starts at the source configuration's opening position near the upper right; this is a setup/reference composition, not a simulated active fight. Full initial health, hearts, stars, score and clock come from the original HUD routines.
- Choose a **Native player state**, set **Native updates** (1–600), and use **Trace player / referee state**. The 23 available state entries produce bounded zero-input paths. Pick an **Observed excerpt frame** to inspect its duration, fine scroll and graphics-bank context. A state can wait for input or another game system; `update-limit` means the excerpt is bounded, not that every branch has been recovered.
- **Open selected fight reference** adds the selected composition/frame as an ordinary Scene in one Undo transaction. Save Project As and reopen to preserve its native bitplanes, per-scanline tile/palette placement, separate opponent OAM and source metadata. This uses the existing raster representation; it does not turn the source into a screenshot overlay or a new animation schema.
- **Edit native arena layout** returns to the existing native arena Scene and writer. Paint supported tiles/attributes there, build, then make a new reference to inspect the current encoded arena beneath the characters. Changing the reference copy's CHR, palette, sprites or background remains savable but blocks native builds because those fields have no reference encoder.
- **Open source Audio** retains the original Audio library. Observed state sound requests remain source evidence; they do not become runtime bindings or native Audio edits automatically.
- **Browse all CHR banks**, from a fight reference, first selects the source arena and then opens the existing raw bank browser. The reference's raster atlas and physical CHR banks remain separate views of source graphics.

The implementation is additive: `re/punch-out-fight.js` supplies a bounded private CPU/PPU bus and source projection; `services/punch-out-fight-recovery.js` validates and prepares canonical additions; `re/punch-out-fight-ui.js` owns detached preview and guarded ProjectStore transactions. All 168 preceding application inputs remain byte-identical, in their original order.

Why background commands? Punch-Out draws Little Mac and the referee through bank-11 nametable streams. Their placement, partial updates and CHR-bank changes are different from the opponents' sprite/metasprite system. Recovery keeps those differences. The projector retains 34 background fetches per scanline, including offscreen latch controls, and the source OAM order/scanline limit. Fine scrolling is represented by raster runs rather than flattened into an inaccurate 8×8 grid.

Verification compares every catalogued command and each observed state update with the original routines through the actual emulator CPU/mapper/PPU bus. Representative compositions and fine-scroll frames also compare background and sprite composite pixels. These checks establish the declared source reference and projection; they do not establish original NMI transfer arbitration, a complete concurrent fight, cycle-accurate hardware behavior or native Mac/referee animation or Audio writers. Dedicated physical CHR/fight-palette writing is a separate path below.

```bash
node reviews/punch-out-fight-context-1/verify_fight.cjs /path/to/private-roms
node reviews/punch-out-fight-context-1/verify_lifecycle.cjs /path/to/private-roms
```

Source ROMs, source-bearing projects and decoded screenshots stay outside the repository and review deliverables. Native writing of these reference copies and complete gameplay-context recovery remain separate work; dedicated physical art/color editing is described below.

## 15. Dedicated native artwork and concurrent playback

The current combined candidate adds dedicated **Native artwork · CHR banks and fight palettes** editing and **Open Glass Joe native replay**. Read sections 13–15 of `projects/PUNCH_OUT.md` for the complete current steps, native ownership ranges, color-flag preservation, original-engine sequence, reversible knockdown/count/round experiments and adopted Retro Workstation controls. The earlier reference-copy limitations in this guide still apply to those copies; native writes belong to the dedicated physical art views.

`services/punch-out-art-project.js` registers physical CHR/color field ownership with NativeResourceProject. The source remains preserved, unknown fields remain protected and byte spans are disjoint from layout recipes. `services/punch-out-replay.js` uses the existing EmulatorBridge/Timeline, with real input, owned checkpoints and explicitly recorded temporary RAM seeds. It does not introduce a second CPU or enable MMC2 runtime Scene capture.

The supplied Resources, Connected Workspace, metasprite context and Retro Workstation modules are now source-manifest inputs under `src/ui/`. Presentation preferences remain outside canonical projects. The full asset map, independent RE, code/hex paths, standalone application edits and separate authored-game workflow remain available alongside these title-specific extensions.

### Native Glass Joe full-pose position extension

Section 16 of `projects/PUNCH_OUT.md` adds a dedicated native position view for each of Glass Joe's 30 full poses. The frame and source-art Scene are ordinary canonical assets. The signed native X/Y operands are derived from uniform piece displacement minus the frame origin, so no hidden placement recipe or alternate asset store is required. Individual pieces, shared geometry, position-less incremental records and animation remain separate writing problems. Five explicit incremental positions extend this method below.

| Owner | Responsibility | Connection |
|---|---|---|
| `re/punch-out-pose.js` | Pure pointer/position codec; validates the output through the original CPU shape reader | Source bytes → canonical placement → two signed native bytes |
| `services/punch-out-pose-project.js` | Dedicated Scene/Metasprite ownership and bounded encoding | NativeResourceProject's existing encoder registry, projection gate and disjoint-span checks |
| `re/punch-out-pose-ui.js` | Pose selection, native X/Y controls, one Undo transaction, build check and contextual artwork shortcuts | Existing Metasprites, CHR Sheet, native artwork UI, ProjectStore, history and RuntimeCompiler |

The native resource gate now accepts an optional `metaspriteViews` callback on a registered encoder. It compares declared baseline origin/piece positions while retaining every unrelated project field in the signature. The encoder separately proves uniform movement, unchanged piece identities/order/tiles/flags, signed-byte range and exact owned-byte writes. Masking a recognition range or registering a projection never grants permission to write another resource. With no native pose view present, the preceding projection and output remain unchanged.

For standalone HTML work, change these authoritative modules and re-bundle. For independent hex work, the title lesson identifies the actual position operands and validation steps. Moving a visual pose leaves the original damage/attack/collision code in place, so check alignment in the running game. Native pose editing is scoped to whole-pose placement; it is not complete fighter or animation recovery.

### Native idle and incremental position extension

Section 17 of `projects/PUNCH_OUT.md`, included in the offline handbook, covers five additional explicit X/Y pairs, the grouped `$C0/$C2/$C4` idle workflow, file offsets, external hex editing and direct HTML/source changes. The existing codec now calls `PunchOutStates` to preserve preceding OAM and the observed moving anchor; reading incremental frames independently would lose that context. All 30 earlier full-pose views retain their original identities and source ownership.

The same native encoder owns these pairs through ordinary Metasprites. Incremental views use a separate `punchOutIncrementalPose` marker so older full-pose-only readers preserve the ordinary assets and refuse unsupported native building. The idle helper adds missing derived views and changes three existing canonical frames in one guarded project transaction. It preserves their current relative displacement and original timing; it does not create a second animation/runtime store.

For the `$C0` family, source routine `$D043` derives priority from native OAM Y at the `$50` divider. `moveFrame` updates canonical `behind` flags to match that consequence of position. The encoder independently checks this exact derivation; manual flag changes still refuse. Source attribute streams, flags, pointers and code remain protected. Full-pose and other incremental attribute handling keep their earlier rules.

Derivative recognition adds exactly ten physical operand bytes; it does not widen generic recipe writes. Existing native art/palette and arena owners still encode separate spans. Tests check every earlier full pose, all five new records, observed primary-state contexts, priority consequences, one-step grouped Undo/Redo, save/reopen, older-reader refusal, composed native output and real exported/reimported idle playback. The title lesson keeps unobserved paths and complete-fight/animation/Audio writing limits explicit.

### Pose and CHR navigation

The native pose picker is expanded above the source-reference preview in Recovered content. The native position panel links to **View pose sprite tiles** and **Edit native sprite artwork**. Entering CHR Sheet with an owned pose Scene selects its sprite buffer; the sheet's contextual strip also exposes the source-verified physical bank and a return to position editing. Opening a dedicated physical CHR view selects its background buffer, which is the registered pixel writer. A deliberate bank toggle still works in the current sheet.

The reference sprite buffer and the physical writer remain separate existing assets. Navigation does not copy pixels, replace snapshots, re-sign unsupported work, patch source or create an alternate encoder. `PunchOutPoseProject.describe` returns the verified `chrBank4KiB` for UI routing. Existing native validation still runs before a physical view can be added/selected; copied-reference pixel changes refuse native building and cannot be adopted as a new baseline by following the shortcut. See the Punch-Out handbook's section 17 for the click-by-click path and save/build/reimport exercise.
## 16. Save and restore editor context without changing the game

Portable **Save Project As**, browser project saves, recovery and Export's `project.json` include optional browsing preferences. A fresh open can return to the same Metasprite and piece, core editor tab, selected World, CHR buffer/tile and used-pose view. The active Scene and selected pose remain independent when their declared source references differ. Choosing another World in the editor does not change `worldRuntime.worldId` or its spawn.

For independent JSON or HTML work, the additional metadata has this shape:

```json
{
  "editorView": {
    "version": 1,
    "worldId": "an-existing-world-id",
    "metaspriteId": "an-existing-pose-id",
    "pieceId": "a-piece-in-that-pose",
    "tab": "chr",
    "chrUsage": "pose"
  }
}
```

These are existing asset IDs and a few bounded view values, not new asset records. `chrUsage` is `pose` or `whole`; `tab` must name an available core editor. Existing top-level `activeScene`, `chrBank` and tile/Animation selections retain their current formats. A deliberately empty `metaspriteId` preserves an unselected composer. A stale or invalid ID does not bind a different Scene or regenerate assets. With no valid saved pose, a unique pose using the active Scene can be selected; several matches produce an explicit choice, and no matching pose leaves the composer unselected.

`ProjectStore.capture({includeEditorView:true})` includes this block for saves. Default `capture()` / `serialize()` and `authoringData()` keep the existing build/authoring boundaries; the latter removes view metadata. Native signatures, source bytes, encoder spans and raw recipe hashing rules are unchanged. Ordinary projects remain schema 12; existing native formats and the reader ceiling of 16 stay intact. An older reader may discard optional browsing preferences safely. Unknown future preference versions can retain the old World hint but do not introduce new navigation rules.

The implementation uses the existing owners:

- `services/editor-view.js` reads a whitelist of bounded hints, captures current UI IDs and restores them through the existing Metasprite/World/CHR editors. It owns no asset store, encoder or persistent database.
- `services/project-store.js` owns save/load/history and includes the block only at explicit save boundaries. Validation of canonical project data still runs before UI state is touched.
- `legacy/13-metasprites.js` exposes `restoreSelection` for UI IDs and an explicit chooser when fallback would be ambiguous. It adds no pieces, Scene OAM or source references.
- `re/punch-out-pose-ui.js` can resolve a native CHR return shortcut from the restored canonical pose, instead of requiring a previous click history in the same document.

To change this behavior in the standalone HTML, save a copy and locate those module comments. To maintain source, edit their files under `app/src`, rebuild the native/root and hosted outputs, and check them. Do not put view preferences into a native projection signature or refresh copied source pixels merely to align a preview. Verify fresh-document reopening, intentional mismatches, old/malformed hints, Undo/Redo, all save transports and byte-identical output. Optional metadata does not save emulator RAM, resume playback or establish a recovered runtime binding.
