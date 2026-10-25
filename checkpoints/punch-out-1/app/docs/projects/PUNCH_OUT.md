# Punch-Out: import, edit, rebuild and understand the method

This lesson covers the current Mike Tyson's Punch-Out!! US PRG0/PRG1 support. You will make a supported arena edit, preserve it in a project, build a separate ROM, inspect fighter/player/referee references, audition source Audio and find the code needed to extend the method. Complete concurrent fights and native art/animation/Audio writers remain open.

The current application is `NES_Forge_Punch_Out_Fight_Context.html`, identical to `app/mainline/NES_Forge_2.0.0-alpha.11.html`. Its SHA-256 is `aceb8cdd70e0839b4649bc56daa39519204b660bbbae100209ad9e66bb03b89a`; the implementation checkpoint is local commit `e2d94cbad861783fabde4e52d647e3701f78b487`. This tutorial adds documentation; it does not change that executable.

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
| Background and sprite CHR | 32 physical 4 KiB banks; source banks and projected references available | CHR pixel edits save as project work but have no native artwork writer |
| Palette colors | Source palettes retained for each declared context | Palette-ID attributes can be writable; palette color tables have no native writer |
| Opponents | 14 fight configurations, source pose records, separate sprite CHR/OAM and explicit Metasprite materialization | Pose copies are editable/savable; native sprite, pose and position writers are absent; some source poses need prior state |
| Opponent animations | Bounded original state execution retains RAM/OAM, incremental poses and size changes; explicit Animation import | Observed excerpts have declared duration/initial state; no complete AI, fight timing or native animation writer |
| Little Mac | 98 bank-11 background command descriptors; bounded player-state paths | Commands can clear cells or draw fragments; not all are complete poses; native command/art writing absent |
| Referee/count/speech | 47 extended bank-11 command descriptors; available player/referee state paths | Same background system, not opponent metasprites; no native writer |
| HUD/scroll/raster | Original setup HUD routines plus declared bank/scroll context in fight references; canonical raster representation | Reference composition is savable; it is not a complete live HUD or captured fight; reference art edits block native building |
| Actors/AI/damage/collision | Pointer/state evidence and limited source observations | Complete concurrent behavior, hit/damage rules and editable native bindings remain unresolved |
| Menus/transitions/game phases | Five declared staging contexts plus separate source evidence | Complete menu graph, round controller, entrances and transitions remain unresolved |
| Worlds/entities/links | No complete boxing-game World or Forge gameplay conversion is supplied | Creating authored records does not patch original game behavior |
| Music/SFX | Original driver/catalog, native audition, finite explicit tracker adaptation | No native Punch-Out Audio writer; adapted tracker changes save but block native output |
| DPCM/startup PCM | Native sample/handler evidence and isolated audition | No generic sample tracker conversion or native sample writer |
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
