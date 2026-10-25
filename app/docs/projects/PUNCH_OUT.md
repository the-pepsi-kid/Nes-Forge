# Punch-Out: import, edit, rebuild and understand the method

This lesson covers the current Mike Tyson's Punch-Out!! US PRG0/PRG1 support. You will make a supported arena edit, preserve it in a project, build a separate ROM, inspect fighter/player/referee references, audition source Audio and find the code needed to extend the method. The bounded original-engine replay, reversible knockdown/round experiments, physical CHR/fight-palette writers and Glass Joe full-pose position writer extend that workflow. Complete fights, individual native pose geometry, native animation and Audio writers remain open.

The combined review application is `NES_Forge_Retro_Punch_Out_Native_Workflows.html`, identical to `app/mainline/NES_Forge_2.0.0-alpha.11.html`. Its SHA-256 is `cf5825b600fc8f8c028e9df0def70cc1cac483408ad49b8327715b02a4598e08`. Sections 13–15 describe the new dedicated artwork, original-engine replay and Retro Workstation controls. The preceding verified fight-reference checkpoint remains separately available at local commit `e2d94cb` (app SHA-256 `aceb8cdd70e0839b4649bc56daa39519204b660bbbae100209ad9e66bb03b89a`).

## 1. Keep the right files

Keep four distinct files: the application HTML, your original ROM, your saved Forge project JSON and your rebuilt `.nes`. The project preserves the source and supported edits; the application supplies the tools. Later application versions can open saved projects, but unsaved browser state does not move between HTML files.

| Investigated input | Bytes | SHA-256 |
|---|---:|---|
| US PRG0 | 262160 | `0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952` |
| US PRG1 | 262160 | `22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e` |

The adapter also admits bounded derivatives in its declared native edit ranges after validating their streams and protected identity. Other regions, revisions and arbitrary hacks are not established by this lesson. Use your own source; no ROM or extracted game assets are included here.

## 2. First lesson: change the shared arena

1. Open the current application in a browser. Save any current work. Choose **Open ROM / project**, choose your supported original, **Prepare recovered resources (partial)**, then **Import as new project**. If you already have a saved recovered project, open that JSON instead.
2. Open **Recovered content → Open ring and audience**. Select **Arena · ring and audience · source setup**. This is assembled placement, not a raw pattern sheet. Fighter-source Scenes can intentionally have blank backgrounds.
3. Before editing, use **Build & Run** and retain a baseline output. An unchanged native build must preserve the input exactly. The original game starts; the source Scene is an editing view, not a replacement reset screen.
4. In the arena Scene, choose an existing tile and change one ordinary ring/audience cell using the Scene tools. Use a small change that is easy to recognize. Record its zero-based column/row and original/new native tile IDs. Avoid `$FD`/`$FE` in the beginner exercise: pattern reads of those tiles control graphics-bank latches. Keep the other asset fields unchanged.
5. Test **Undo**, then **Redo**. Use **Check arena build**. The writer supports layout tile IDs and visible attribute palette IDs. Changing an attribute chooses a palette group; it does not change the four actual NES color values.
6. Use **Save Project As**. Close/reopen the JSON in a fresh application instance and confirm the intended arena edit. Use **Build & Run** and download the built ROM through the existing build controls.
7. Enter a fight in the original game and inspect the shared arena. HUD/player updates can overwrite cells; choose a stable ring/audience location and inspect multiple rows. Check that Audio remains present. External emulator play is a separate useful acceptance check.
8. Reopen the rebuilt ROM through **Open ROM / project** and prepare/import again. Supported arena derivatives should retain recognition, the arena edit, recovered source content and the Audio catalog. Preserve the project JSON as the richer editing record.

If the writer reports a capacity failure, simplify the pattern or Undo. Nothing should be silently dropped. A successful native build does not prove the edit preserves a playable fight or every later state.

## 3. Know which assets you are editing

| Domain | Current recovery/editor | Native output and limits |
|---|---|---|
| Five staging backgrounds | Original PPU programs, placement, attributes and latch-aware background rows; source pages in Scene | Dedicated native brush supports declared literal substitutions; generated/inherited and protected aliases refuse |
| Ring/audience arena | Two original setup nametables projected across the source scroll seam; ordinary Scene layout | Arena writer supports `nt` and visible attribute bits within fixed capacity; shared native arena affects its game uses |
| Background and sprite CHR | 32 physical 4 KiB banks; source banks and projected references available | Open a dedicated physical CHR view for native pixel writing; edits to copied reference art still have no reference writer |
| Palette colors | Source palettes retained for each declared context | Dedicated native fight-palette views now write color bits while preserving flags; reference copies remain protected |
| Opponents | 14 fight configurations, source pose records, separate sprite CHR/OAM and explicit Metasprite materialization | Dedicated Glass Joe full-pose views write whole-pose X/Y; copied reference poses remain snapshots; individual geometry, tiles, flags and other opponents need separate pose writers |
| Opponent animations | Bounded original state execution retains RAM/OAM, incremental poses and size changes; explicit Animation import | Observed excerpts have declared duration/initial state; no complete AI, fight timing or native animation writer |
| Little Mac | 98 bank-11 background command descriptors; bounded player-state paths | Commands can clear cells or draw fragments; not all are complete poses; native command/art writing absent |
| Referee/count/speech | 47 extended bank-11 command descriptors; available player/referee state paths | Same background system, not opponent metasprites; no native writer |
| HUD/scroll/raster | Original setup HUD routines plus declared bank/scroll context in fight references; canonical raster representation | Reference composition is savable; it is not a complete live HUD or captured fight; reference art edits block native building |
| Actors/AI/damage/collision | Pointer/state evidence and limited source observations | Complete concurrent behavior, hit/damage rules and editable native bindings remain unresolved |
| Menus/transitions/game phases | Five declared staging contexts plus separate source evidence | Complete menu graph, round controller, entrances and transitions remain unresolved |
| Worlds/entities/links | No complete boxing-game World or Forge gameplay conversion is supplied | Creating authored records does not patch original game behavior |
| Music/SFX | Original driver/catalog, native audition, finite explicit tracker adaptation | No native Punch-Out Audio writer; adapted tracker changes save but block native output |
| DPCM/startup PCM | Native sample/handler evidence and isolated audition | No generic sample tracker conversion or native Audio sample writer |
| Code/RAM | RE/disassembly plus source pointers and bounded interpreter evidence | Code and RAM experiments need their own independent patch/rebuild workflow; not automatic native code editing |

For the field-by-field canonical asset map and JavaScript transaction example, read the general developer guide, sections 3 and 13. A reference copy is an asset, but it is not the authority for writing every byte represented in the picture.

## 4. Staging backgrounds and source aliases

Use **Area library → Investigated source** to select an available staging context/page. The native block controls project a narrow physical-literal recipe. Choose the native block ID and cell through **NATIVE SCREEN BLOCKS** or its canvas brush. Ordinary unrestricted Scene painting is not a substitute for a recipe-owned staging edit.

These five contexts come from declared combinations of source programs; 84 available command programs are decoded out of 95 table slots. There are 711 writable bytes in 97 spans per revision. A repeat operand can supply many displayed cells, and several contexts can share it. The native owner updates those aliases together. Refusal for inherited/generated cells or metadata aliases protects source semantics.

Repeat the same Undo/Redo → save/reopen → build → original-engine → derivative-reimport exercise. Check the other affected contexts. Do not interpret the five staging views as five complete fights or all game menus.

## 5. Fighter poses and observed opponent animation

1. Open **Recovered content**. Choose **Fighter / fight** and **Pose**. Inspect the source bank, palette offsets and pointer evidence. The preview is centered for inspection; that centering does not change native placement and does not simulate hardware scanline clipping.
2. Choose **Open pose in Metasprites** to materialize that supported source pose, or **Recover background pages and fighter samples** for the bounded overview. It uses existing Scenes/metasprites and one Undo transaction. It does not replace the source ROM.
3. Expand **State animation excerpts**. Select a source state and a bounded **Native updates** window, then **Trace state**. Inspect observed frames, duration and sprite-size changes. Some entries require context and can refuse an isolated pose while a valid preceding trace establishes it.
4. Choose **Open recovered animation** to add the canonical excerpt. Save/reopen and inspect Animation/Metasprites. **Inspect linked sound** opens observed source Audio requests; those requests are not automatically authored runtime events.
5. Save animation/art experiments separately. Editing them is useful, but native rebuilding requires undoing unsupported changes or returning to a saved native-buildable baseline. Reopening a copied animation does not create a missing native writer.

Use **Browse all CHR banks** for physical patterns. Tile patterns, assembled poses and timed state execution answer different questions. The game changes sprite size and CHR context, so decoding each shape as an independent static picture can produce the wrong result.

## 6. Mac, referee and HUD composition

1. In **Recovered content**, expand **Glass Joe fight reference · Little Mac / referee / HUD**.
2. Start with Mac command 0, referee command 144 and Glass Joe source pose 0; choose **Preview pose composition**. It uses original setup health/hearts/stars/score/clock routines. The opponent is at the original configuration's upper-right opening position; this is a declared setup reference.
3. Change a **Little Mac command** or **Referee / speech command**, then preview again. Commands can update only a fragment, clear cells or change speech/count data. Do not expect every entry to be a full self-contained character.
4. Choose **Native player state**, set **Native updates** from 1 to 600 and choose **Trace player / referee state**. Select an **Observed excerpt frame**. The 23 available entries trace a declared zero-input path. `update-limit` means observation stopped at the budget; other game systems or input may be needed to progress.
5. Choose **Open selected fight reference**. This adds an ordinary Scene with separate opponent OAM and bank/scroll/raster provenance in one Undo transaction. Save/reopen it. It is labeled as a recovered source reference, not verified runtime capture.
6. Choose **Edit native arena layout** to return to the actual arena write owner. Paint there, then preview again: the composition uses the current encoded arena when native building succeeds. If unsupported work blocks building, inspection can explicitly fall back to preserved source plus existing literal recipes; read its warning.

Editing the reference's own CHR, palettes, sprites or background remains savable and blocks native building. Such work cannot be silently re-signed as unchanged source. Preview guards also reject materialization when the project changed after preview; preview again after a legitimate edit.

The trace updates source state then uploads its command immediately. It does not reproduce original NMI arbitration, concurrent opponent AI, damage or complete fight phases. Fine scroll and MMC2 reads remain modeled rather than flattened into an ordinary tile grid.

## 7. Audio, including the startup sample

1. Choose **Open source Audio**, or **AUDIO → ROM Audio Library** after import/reopen. Check that the source profile matches your revision. There are 84 entries, including six empty slots and two stop controls; a catalog entry is not always a sounding cue.
2. Select music or an effect; choose **Inspect cue**, then **Play native**. Stop playback before another experiment. The bank-8 driver supplies 23 sounding music selections, 45 procedural effects and seven DPCM selections.
3. Select **Startup PCM + native bell** and use at least 199 native updates for the full isolated routine. Shorter windows report truncation. This separate bank-6 routine produces direct DAC writes; it is not ordinary tracker music.
4. For representable music/effects, choose **Preview editable score**, review the declared losses, then explicitly import into the tracker. Check Undo/Redo and save/reopen. A music import changes the canonical order/tempo; preserve a separate experiment if you want to continue native arena building.
5. Undo an unsupported Audio import before the next native build. Reopen the arena derivative and check its native Audio catalog/audition again. Source sample bytes and original driver code should remain preserved.

The native machine executes original timing/driver requests in a repeatable isolated context. Tracker conversion is finite and frame-sampled; DPCM and short-mode noise can be omitted or conversion refused. It does not recover complete song loop structure, native instruments or game event routing. Automated APU/PCM checks do not establish browser listening quality.

## 8. How this particular format works

This investigated iNES layout has a 16-byte header, 128 KiB PRG and 128 KiB CHR. MMC2 selects PRG/CHR banks; a CPU address is not a unique file offset. For a declared 8 KiB PRG bank mapped at `$8000–$9FFF`, the physical offset is `16 + bank * 8192 + (cpuAddress - $8000)`. Fixed windows need their actual selected physical bank too.

The arena writer owns four two-byte pointers in physical bank 12 at CPU addresses `$917B`, `$917E`, `$9184`, `$9187`, plus 381 bytes at `$9190–$930C`. Their file offsets are respectively `$1918B`, `$1918E`, `$19194`, `$19197`, and the storage range is `$191A0–$1931C`. End addresses here are inclusive. These are exact-source arena ownership ranges, not general free space.

The writer starts from original raw nametables, maps visible cells across the scroll seam through `cellSources`, updates visible attributes, compresses each page into at most two source streams, and updates the owned pointers. It refuses total-capacity or per-stream overflow and decodes the candidate with the original loader. Offscreen cells and unrelated code/CHR/Audio stay protected.

The native literal brush instead owns individual source operands. Its writer is not interchangeable with the arena compressor. Both flow through `NativeResourceProject` and the existing native backend.

MMC2 switches CHR during pattern-address reads. A tile outside the visible viewport can select the bank for a subsequent row. Rendering retains 34 background fetches per scanline; clipping pixels cannot remove those reads. Mac and referee use bank-11 nametable commands, while opponent poses use OAM/shape routines. These differences explain the separate recovery modules.

## 9. Independent RE, code and hex editing

You can investigate without using the recovery buttons. Hash a copied original; record its bank map; disassemble a declared bank at its CPU origin; follow native pointer consumers; record inputs, RAM changes, PPU/OAM writes and sound requests. Keep notes about starting state and stop conditions. General analysis is read-only; reversible RAM experiments affect an emulator session rather than the ROM.

As a read-only source exercise, run Node from the repository root. Save the following as `inspect-punch-out.cjs` there and pass your own original path. It writes only summaries to the terminal:

```js
const fs = require('node:fs');
const crypto = require('node:crypto');
const bytes = new Uint8Array(fs.readFileSync(process.argv[2]));
const hash = crypto.createHash('sha256').update(bytes).digest('hex');
const formats = require('./app/src/re/native-punch-out-resources.js');
const profile = formats.profiles.find(p => p.kind === 'punch-out' && p.sha256 === hash);
if (!profile) throw Error('Use an investigated original for this exercise.');
const content = require('./app/src/re/punch-out-content.js').open(bytes);
const arena = require('./app/src/re/punch-out-arena.js').open(bytes);
const fight = require('./app/src/re/punch-out-fight.js').open(bytes);
console.log({profile: profile.id, fights: content.fights.length,
  arenaCells: arena.nt.length, commands: fight.poses.length,
  availablePlayerStates: fight.states.filter(s => s.available).length});
```

```bash
node inspect-punch-out.cjs /path/to/original.nes
node app/docs/native-codec-exercise.cjs
```

Expected current counts are 14 fight configurations, 960 arena cells, 145 combined Mac/referee command descriptors and 23 available state entries. The second command teaches decode → edit → encode → reopen → reimport using a deliberately synthetic format. Its bytes are not Punch-Out command bytes.

For external hex work, use the mapped offsets above to inspect arena pointers and compare an app-built candidate with the exact original. Verify every changed byte falls within the declared owners for the edit you made. Those compressed bytes do not have one visual-cell-to-byte correspondence; a layout edit can change stream lengths and pointer values. Do not type a tile number into a guessed compressed offset.

For your own supported arena encoder, follow `PunchOutArenaEncoder.encode(bytes, {nt, attr})` and its `spans`/`capacity` contract on a copy, then validate with the independent original-loader checks. The service adds project-signature, alias and unsupported-field checks beyond this low-level helper. Using the helper alone is not complete project build validation.

For a code patch, identify its callers, native bank, CPU origin, owned space, vectors, stack/RAM effects and timing; assemble externally or through the supported assembler into a separate patched ROM. Verify exact expected original bytes and all changed ranges. CODE text in a preserved native project is not automatically injected. Changes outside admitted native ranges can lose specialized recognition and still be inspectable through general RE.

## 10. Modify the HTML and understand the connections

| Task | Owner below `app/src/` | Connection |
|---|---|---|
| Detect revision and decode staging programs | `re/native-punch-out-resources.js`, `re/punch-out-layout.js` | Source catalog → native resource recipe/Scene projection |
| Decode opponents and bounded state paths | `re/punch-out-content.js`, `re/punch-out-states.js` | Shared CPU core/private bus → source pose/state evidence |
| Materialize opponents/animations | `services/punch-out-content-recovery.js`, `services/punch-out-state-recovery.js` | Canonical Scenes/metasprites/animations → ProjectStore |
| Decode and project arena | `re/punch-out-arena.js`, `services/punch-out-arena-recovery.js` | Original setup programs → ordinary arena Scene |
| Encode arena | `re/punch-out-arena-encoder.js`, `services/punch-out-arena-writer.js` | Registered writer → NativeResourceProject → BuildGraph/RuntimeCompiler |
| Compose Mac/referee/HUD | `re/punch-out-fight.js` | Private source execution → canonical raster/CHR/OAM projection |
| Preserve source references | `services/punch-out-fight-recovery.js` | Prior-build validation → detached projection → guarded canonical addition |
| Connect buttons | `re/punch-out-content-ui.js`, `re/punch-out-states-ui.js`, `re/punch-out-arena-ui.js`, `re/punch-out-fight-ui.js` | Preview → epoch/serialization guard → snapshot → ProjectStore commit → existing editor |
| Native Audio | `re/punch-out-audio.js`, `re/native-audio-machine.js`, `audio/native-audio-library-ui.js` | Source driver/catalog → isolated native execution → explicit adaptation |
| Mapper/player | `re/mmc2.js`, `services/mmc2-emulator.js` | PRG/CHR/mirroring/latch state → existing emulator; live capture remains unsupported |

For a small worked app change, copy the HTML, search `NES FORGE MODULE: src/re/punch-out-fight-ui.js`, then locate the help paragraph that starts `Source-defined opening placement`. Change its explanatory wording without changing source evidence/signatures. Reopen the copy and check startup, Recovered content, an old saved project and Audio. This changes application help for future sessions, not game data.

For the maintained source version, make the same change in `app/src/re/punch-out-fight-ui.js`, then run:

```bash
python3 app/tools/bundle.py
python3 app/tools/bundle.py --check
```

`app/source-manifest.json` controls dependency order. The output is a complete standalone HTML; the bundler does not fetch game assets or require a server. Direct-only HTML edits disappear when you regenerate it. JavaScript inside each module has its own scope; use documented service boundaries rather than a second project store.

## 11. Build a separate standalone game

There are three distinct outcomes. The preceding native lesson produces a standalone `.nes` using the preserved original engine. The HTML lesson produces a customized standalone NES Forge application. Creating a new original game is an authored-project workflow with its own behavior and build backend.

For that new game, start a separate authored project and save it immediately. Create original or otherwise usable art; explicitly import only supported asset types through existing tools, or recreate a small asset with the editors. Select the appropriate Scene/CHR/palettes, assemble metasprites/animation, add the supported actor/behavior or custom assembly, then author collision, state transitions, Audio and persistence deliberately. Preserve referenced IDs and test the chosen runtime's compiled subset.

Recovered Mac/referee raster commands do not currently convert into a complete playable authored boxing actor. No one-click whole-Punch-Out conversion exists. Do not delete the native descriptor from a recovered JSON and assume all source relationships become authored behavior. Keep the native source project as a reference and maintain the authored project separately.

Build the authored ROM, save/reopen the project and test the ROM in another emulator. Check reset, input, animation, collisions, Audio and transitions. Browser controls, physical controllers and NES hardware require their own acceptance. The app HTML and the authored ROM remain separate deliverables.

## 12. Reproduce checks and diagnose problems

From the repository root:

```bash
python3 app/tools/bundle.py --check
node app/docs/native-codec-exercise.cjs
python3 reviews/punch-out-fight-context-1/run_checks.py
node reviews/punch-out-fight-context-1/verify_fight.cjs /path/to/private-roms
node reviews/punch-out-fight-context-1/verify_lifecycle.cjs /path/to/private-roms
node reviews/punch-out-developer-1/verify_reimport.cjs /path/to/private-roms
```

The supplied-input scripts use the investigated original filenames; read the script arguments before running against another directory. No original is bundled. `reviews/punch-out-fight-context-1/` records the application identity and scope: both revisions, 145 native command comparisons, 2,224 observed state updates and seven representative full composite comparisons per revision; lifecycle checks retain 84 Audio entries. The available public gate passed 104 checks. These are checkpoint results, not a claim that this documentation reruns every historical release test or verifies a complete fight.

| Symptom | Inspect and recover |
|---|---|
| Blank background beside a boxer | Select the actual arena or explicit fight reference; the fighter source Scene is a separate sprite resource |
| Arena compression exceeds capacity | Reduce layout complexity or Undo; preserve the experiment in a separate JSON |
| Save works but native build refuses | Read the unsupported-field diagnostic; restore the native baseline or implement the missing writer |
| Pose is unavailable/context-required | Use a valid preceding state path; do not invent missing CHR/OAM context |
| Reference preview is stale | Preview again after the project change, then materialize |
| Fight reference shows old arena | Read the build/fallback warning and check the actual arena owner; reference edits do not update it |
| Latch rows look wrong | Compare untouched source too; inspect offscreen pattern reads, banks and scrolling before blaming compression |
| Rebuilt output loses recognition | Compare protected ranges and exact stream validity; unrelated patches need separate support |
| Audio tracker import blocks build | Save the adaptation separately and Undo it in the native project; no Punch-Out Audio writer is installed |
| Startup sample stops early | Use at least 199 updates; inspect truncation and stop state |

### Learner acceptance

- [ ] I can identify my source revision, app version and separate output files.
- [ ] I can reproduce one arena edit, Undo/Redo it, save/reopen, rebuild and reimport it.
- [ ] I inspected that edit during an actual fight and checked its shared uses and Audio.
- [ ] I can distinguish raw CHR, fighter samples, opponent animation and Mac/referee background references.
- [ ] I can audition music, an effect and startup PCM; I understand tracker adaptation and native writer limits.
- [ ] I can locate the format, recovery, UI and writer owners in source or HTML.
- [ ] I can inspect my own input independently and map a declared bank address without confusing it with a file offset.
- [ ] I know which unsupported experiments are safely saved and how to return to a native-buildable baseline.
- [ ] I understand the separate steps and missing conversion work for a new authored game.

These boxes require the learner's observations. Headless command/lifecycle checks do not check browser layout, listening, controls, complete fights or hardware for you.

## 13. Edit native artwork and fight colors

The **Native artwork · CHR banks and fight palettes** section under **Recovered content** is the native write path. Existing recovered poses, arena and fight-reference Scenes retain their original snapshot ownership. Editing a copy does not automatically identify a unique physical source byte.

1. Save a native-buildable baseline. Open **Recovered content → Native artwork · CHR banks and fight palettes**.
2. Choose a physical CHR bank (0–31), then **Edit physical CHR bank**. This adds/selects an ordinary, explicitly named Scene and opens **CHR SHEET**. Its 256 patterns are a source-bank editing view, not an assembled game room. Both background and sprite art live in physical banks; use the **background CHR** buffer of this dedicated bank view to edit its native pixels.
3. Select a tile and edit a pixel using the normal CHR controls. Undo/Redo, Save Project As and reopen. The dedicated view owns exactly that 4 KiB bank's bitplanes. Its display palette is for inspection; change actual game colors through the next dedicated view.
4. Choose a fight palette from the same section, then **Edit native fight palette**. This selects a dedicated color-table Scene. Use the background/sprite palette controls for the corresponding halves. Pixel edits on this palette-only Scene remain unsupported. Universal slot-zero colors are linked across both halves.
5. Choose **Check native artwork build**, then **Build & Run**. Download the output and reimport it. The derived ROM should retain recognition, edited physical art/colors and its original Audio driver. Native arena layout edits compose with the dedicated art writes.
6. Open a new fight reference or run the native replay to inspect the current encoded output. Earlier reference Scenes retain their source snapshots. This distinction prevents a refreshed view from silently overwriting locally edited reference material.

The writer preserves original high palette flag bits and changes only the six NES color bits. For example, changing the displayed color of an original `$8F` entry retains its `$80` flags. Re-import identity also protects those upper bits and all unrelated code/pointers/Audio. Palette slots overridden by native setup/fade/game routines can look different in particular phases; the Glass Joe setup deliberately overrides slot 13. A color-table edit does not add new palettes, change palette selection rules or remove those source routines.

Physical CHR art is shared by every game use of that bank/tile. This writer changes pixels, not OAM geometry, pose commands, animation scripts, collision or actor behavior. Up to 64 Scene working slots remain the shared limit; opening an additional art view refuses when no slot is available rather than deleting work.

The original WIP signature failure is corrected by initializing the dedicated view's zero collision-property array before signing it. Scene selection already installs that array; merely opening the view must not become a hidden edit. Unsupported fields still block native building and cannot be re-signed by opening another resource.

## 14. Run a concurrent Glass Joe sequence and explicit experiments

Choose **Recovered content → Open Glass Joe native replay**. The controls appear above the emulator canvas and remain available while it runs. Each UI Run loads your **current native output**, replaces the emulator session and uses the existing Timeline's bounded controller scripting. It pauses at the result. The project and preserved source remain unchanged.

| Selection | What the engine runs | Declared intervention |
|---|---|---|
| Reset → opening → punch → dodge → stance | Original startup/title/fight opening; A body punch, Right dodge and return to idle, including simultaneous opponent, HUD, CHR/scroll and Audio work | Controller input only; no RAM patch |
| Seeded opponent knockdown → count → get-up | Native hit/knockdown, referee counts 1–4 and opponent get-up | After the real opening: target HP 1, clock near the first taunt; after knockdown, explicit native get-up target 4 |
| Seeded Mac knockdown → count-out | Native opponent hit, Mac knockdown, referee counts 1–10 and loss phase | After the real opening: player target HP 1 and clock near the first attack |
| Seeded round end → round two | Original 3:00 round-end controller, break/continuation and active second round | After the real opening: set the clock to 2:59 with its declared fraction; Start pulses continue through the break |

Use **Load current build and replay**, watch the milestones and evidence summary, and use **Stop replay** to interrupt. **Restore fight start** uses the Timeline-owned physical checkpoint immediately before the experiment. The evidence panel retains the observed experiment; the emulator's frame/readout shows the restored current state. A new ROM/session invalidates the old checkpoint. The API additionally supports `run(kind, {reuseReady: true})` for repeating a case from a matching, source-guarded ready checkpoint without replaying the opening; each report records whether it was reused.

The original controller routine requires stable input across consecutive polls; a one-frame press may never become a new button-history event. The replay holds Start/A for four frames and Right for twelve. It does not write fake pose states to pretend a normal sequence happened.

Count decoding uses RAM `$C1` for the count selector: `$9A` through `$A3` mean counts 1 through 10. `$C2` is the referee's X position in this context. An earlier research note named that coordinate as the count; the original initialization/drawing routines and observed count progression resolve the distinction. Do not treat a large coordinate such as `$E3` as count four.

Temporary seed values, before/after bytes, frame numbers, state/health/clock transitions, video hashes and APU-write activity are included in the evidence. The original CPU/NMI/mapper/PPU/APU run concurrently. This is bounded playback on Forge's approximate MMC2 model, not a cycle-accurate hardware result or newly supported runtime Scene capture. Native animation/AI/damage editing and native Audio writing remain separate work.

```bash
node reviews/punch-out-native-workflows-1/verify_art.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_replay.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_art_playback.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_replay_guards.cjs /path/to/private-roms
python3 reviews/punch-out-native-workflows-1/run_checks.py
```

The export/playback check opens edited CHR/palette output as a new native source, runs its actual original opening and fight sequence, checks the live PPU pattern byte and palette entry, compares pixels and retains Audio. It does not certify all art changes, all fights, external emulators, listening or physical hardware.

## 15. Use the adopted Retro Workstation interface

Click **Retro Workstation** in the toolbar to enable the supplied skin; choose **Compact** or **Comfortable**. The default remains off and clicking again restores the original appearance. Appearance preferences are local settings, excluded from saved project data. All advanced tabs and existing controls remain accessible.

**Resources** opens the provided read-only relationship explorer; **Connected Workspace** offers context and shortcuts into the existing owners. Neither is a second asset store or a universal importer. The metasprite banner identifies the actual selected pose's source Scene; a different source is not an inferred sprite/collision assignment.

The kit's Zelda II native-overworld routes are also ported: the Area Library can reopen a linked native World or request the exact matching source when investigation has discarded its transient bytes. Revision/identity and stale-selection checks remain in place. These navigation fixes do not grant another game's missing terrain writer.

The supplied v0.5 browser evidence applies to that supplied HTML. The current modular integration has its own checks; any remaining browser/device acceptance is listed separately in the review notes. The source ports live under `app/src/ui/`, and the deterministic source manifest includes them. Directly replacing this app with the older review HTML would discard the new Punch-Out work, so continue from the integrated output.

## 16. Move a native Glass Joe full pose

This workflow writes the two signed position operands of a full pose. It moves the graphic relative to the original moving opponent anchor. It does not move the opponent's collision/attack rules or change animation timing. Large shifts can separate the visible boxer from those original rules; inspect the built game.

1. Open a supported Punch-Out ROM or its saved native Forge project. Choose **Recovered content → Native pose positions · Glass Joe**.
2. Select one of the 30 full poses, `$00` through `$3A` in steps of two. Choose **Edit native Glass Joe pose position**. The existing Metasprites editor opens a dedicated native frame and its source-art Scene. Opening an unchanged view produces the same ROM bytes.
3. In **NATIVE GLASS JOE POSE POSITION**, change **Native X / Y**, then **Apply native pose position**. Values are signed offsets from -128 through 127. For pose `$00`, the original values are X = -16 and Y = -96. X = -14 moves that pose two pixels right relative to its native anchor. Only game states that use this particular full-pose record change; incremental/delta poses have separate source records.
4. Apply moves every original piece together in one Undo step. Undo/Redo retains the canonical frame; after undoing creation of a frame, reselect its native shortcut to restore the browsing selection. The frame's cyan origin and ordinary coordinates remain canonical Metasprite data. A uniform move through the composer, or a frame-origin change, can also express the same position. Individual piece drags, tile changes, flips, reordering and piece insertion/deletion remain savable but refuse native building.
5. Choose **Check native pose build**, then **Build & Run** or download the built ROM. Inspect the selected pose in its actual intro/fight/knockdown context. A full-pose position does not rewrite the delta-pose records used by many active animation updates.
6. Save Project As and reopen. Reopen the native pose shortcut to see its offsets. Build again and compare the exported ROM. Import that output as a new native source: its edited offsets become the new source baseline, and an unchanged rebuild should match exactly.
7. Physical CHR/color edits and the arena writer compose with pose placement. The dedicated pose Scene snapshots current encoded art when first opened; its copied pixels/palettes are not a second art writer. Continue using the physical native art views to edit game graphics.

### Independent RE, hex and source development for pose positions

The Glass Joe full-pose pointer table is in physical PRG bank 0. A pose record starts with signed X and Y bytes; subsequent fields point to shared geometry/attribute/tile streams. For selector `$00`, the position bytes are at file offsets `$009C` and `$009D`, including the 16-byte iNES header. An external hex edit from `$F0` to `$F2` at `$009C` expresses the same two-pixel X movement. Keep the original separate, change only the verified operand, compare the binary diff, and test the actual record's game use. These file offsets are for the two supported revisions, not a universal Punch-Out format guarantee.

`re/punch-out-pose.js` reads the pointer graph, converts canonical placement to signed native operands, and executes the original shape reader to check the candidate. `services/punch-out-pose-project.js` creates the ordinary Scene/Metasprite views and registers exclusive two-byte ownership with NativeResourceProject. Its optional `metaspriteViews` hook substitutes only declared canonical positions for signature comparison; the encoder still rejects every unsupported piece edit. `re/punch-out-pose-ui.js` performs guarded ProjectStore transactions. Add these modules to the source manifest in dependency order and re-run the bundler when changing the HTML.

No schema bump, copied ROM in the HTML, alternate asset store or second live CPU is involved. Other opponents, delta poses, shared geometry streams, animation/timing, AI/damage/collision, native Audio and complete game conversion remain separate work. The original shape reader and representative live original-engine playback are different checks; neither establishes hardware or browser listening acceptance.

```bash
node reviews/punch-out-pose-position-1/verify_pose.cjs /path/to/private-roms /path/to/previous-startup-fixed.html
node reviews/punch-out-pose-position-1/verify_pose_playback.cjs /path/to/private-roms
NODE_PATH=/path/to/jsdom/node_modules node reviews/punch-out-pose-position-1/verify_pose_dom.cjs /path/to/private-roms
```
