# Native Background Recovery

Candidate **2.0.0-alpha.11 / native-background-1**, schema 12. This A1 slice recovers a declared static background through the same workflow for two independent native constructions. It is not recovery of an entire game.

## Use the workflow

1. Open **RE / DISASM → General ROM Analysis**, choose a ROM, then **Open for analysis**.
2. Use **Discover recovery methods** and the background route, or scroll to **Native background recovery**. Choose **Immediate PPU background construction** for the supplied Pepsi input or **Vector-linked pointer-page nametable loader** for HonkeyPong.
3. Click **Preview background**. Review the thumbnail, source SHA-256, recovered coverage, unknowns, limitations and actual independent viewer build hash. Expand **Full source evidence and construction** for the physical ranges and construction steps. Preview does not load the original ROM in the emulator or modify the project.
4. To add the result to the current project, tick **I understand this is a static background conversion with the limitations and unknowns shown below**, then **Import as new scene**. This appends and selects one scene, excluded from the current ROM build. Existing scenes and runtime settings remain. One **Undo** removes the import and **Redo** restores it.
5. Edit tiles in **CHR**, arrangement in **SCENE**, or palette colors using the existing controls. **Save Project As** preserves the editable scene and its import evidence. Reopen the `.nesforge.json` with ordinary **Open Project**.
6. Alternatively, **Download background project** saves an independent one-scene Forge project whose background is included in a static viewer build. Open that file in a separate editor tab to review, edit, build and run it. This explicit project contains no source-ROM gameplay or music.
7. **Download background evidence** saves the successful preview's original source/conversion record. It is a historical report, not an editable project or a patch. After tile edits, use **Save Project As** for the updated project. The preview-project download intentionally remains the original preview result.

Selecting a different file or method invalidates the preview. Editing the current project after preview requires another preview before import. Cancellation, unsupported inputs and failed previews leave the project and emulator intact. Duplicate source/method/resource identities are rejected; edit the previously imported scene instead. A source hash identifies bytes, not ownership, a digital signature or general engine support.

## Exact supported subset

Both profiles require bounded NTSC mapper-0 iNES input with 16 or 32 KiB PRG, 8 KiB physical CHR and no trainer. The shared decoder rejects truncated/trailing data, unsupported mapping and unsupported header fields. Physical CHR-bank selection must be established by the native PPU-control sequence. Palette transfers honor NES universal-color mirrors. Grayscale/emphasis modes require separate support and are refused.

| Method | Native representation | Decoding boundary |
|---|---|---|
| `nes.immediate-ppu-background.v1` | Reset-linked immediate palette writes followed by a direct call to literal/counted-fill PPU construction | Approved initialization macros, forced blank and increment 1; bounded address setups, literal writes and counted loops; all 960 tiles/64 attributes established; final bank, mask and zero scroll proven |
| `nes.pointer-nametable.v1` | Vector-linked state dispatch, native palette table and four-page pointer upload loop | Coherent routine/branch/pointer structure, mapped data spans, known control helpers and selected CHR bank; exact 1,023-write loop semantics, with one retained attribute marked unknown |

These names describe narrow supported routine families. Recompilation into a different instruction sequence may be unknown even when it renders the same picture. No filename or whole-ROM hash controls recognition. Source identity is used only for integrity, provenance and stable scene IDs. The adapters read bounded bytes and interpret approved constructions; they do not execute supplied 6502 code. Actual 6502 execution in the test suite independently checks those interpretations.

The pointer profile independently accepts its source-backed legacy NROM header variant with byte 10=`$10`, while still checking all other container/mapping fields. **General Analysis continues to mark that original HonkeyPong header untrusted**, and generic physical-CHR import retains its existing refusal. Method-specific support does not change the overall container trust decision.

The pointer loop does not reset Y between pages. Its destination sequence is source indices `0..254, 511, 256..510, 767, 512..766, 1023, 768..1022`. Source index255 is never transferred, and PPU `$23FF` is never written. The original boundary bytes are zero, which can hide this distinction. Tests change them and execute the original loader; a nonzero final-attribute sentinel remains untouched. Conversion explicitly supplies zero for that one unknown attribute byte. It is an authored default, not a decoded runtime value.

## What the conversion changes

The canonical scene contains 256 background tiles, 960 nametable entries, 64 attributes and four palette rows. It preserves 2-bit pixel values and declared placement/attributes. Canonical palette rows share the final universal backdrop color; original transfer bytes and final palette RAM remain in evidence. Unused row-zero color slots do not establish four separate backdrop colors.

The independent output uses the existing Forge static scene viewer and its rendering mask. Source clipping, sprite overlays, scroll/raster behavior, later background writes and timing are not reproduced. HonkeyPong's native `$18` mask clips the leftmost eight background pixels; the editable background includes underlying tile data. Pepsi's vending-state/credit logic is outside this graphics result. No sprites, collision, actors, original audio or gameplay are inferred. There is no native encoder, original-ROM patch or lossless whole-ROM round trip.

Recovered collision remains unknown even though an editable scene has empty tile properties. Including an imported scene in a gameplay build is an authoring choice requiring appropriate collision, actors and capacity checks. The automatically downloaded project is a static viewer only. A buildable graphic is not a playable recreation of the original game.

## Corpus and source explanation

| Independent input | Identity and provenance | Native records |
|---|---|---|
| Owner-supplied Pepsi vending | `tests/fixtures/re-runtime/pepsi_vending_v9e.nes`, 24,592 bytes, SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a`; retained user input, not a newly downloaded commercial fixture | Palette operands start at file `$48` with stride 5 for 32 writes. Constructor CPU `$C2EC` / file `$02FC`, 4,960 bytes through file `$165B`, emits 1,190 writes over1,024 distinct bytes, including 53 counted fills. Selected BG CHR file `$4010..$500F`. These offsets describe this corpus, not recognition allowlists. |
| HonkeyPong | `examples/RE_Native_Audio/HonkeyPong-reproduced.nes`, 24,592 bytes, SHA-256 `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`; MIT, Ryan Souders, 2015, source commit `f9ab7ad450ffebabec15623aa811a7564f079168` | Loader file `$010A`, entry `$08F8`, raw map `$0442` (1,024 bytes), palette transfer `$0402` (32 bytes), selected BG CHR `$4010` (4,096 bytes). The pointer loop applies the transformation above. |

HonkeyPong's pinned source and license are already packaged in `examples/RE_Native_Audio/NES_Forge_Native_Audio_Input_Checkpoint.zip`, under `NES_Forge_Native_Audio_Input_Checkpoint/HonkeyPong/`. `src/render.oph` lines 88–109 implement the loader and lines 350–361 link palette/map resources; `src/ppu.oph` defines the palette transfer, `src/engine.oph` the title entry, and `main.oph` the NMI dispatch. No external source is needed to reproduce this evidence.

| Source resource | Bytes | SHA-256 |
|---|---:|---|
| `res/nam/title.nam` | 1,024 | `2eb38137c5c2afe4affb458f8808fa8c3d1187d6b84f1b3dd9df99fe81730b93` |
| `res/pal/title.pal` | 16 | `04edffe484b6be8454303a778206cf362dfd8ea6ddcb1d2f0054688300c95bcb` |
| `res/chr/honkeypong.chr` | 8,192 | `85b9db779a87b09fe61e84199af39dec045d51cf605cfb2195a3407ec09a37a9` |

The existing relocated and 32 KiB HonkeyPong derivatives are structural tests of the same independent engine, not additional independent games. Bridge Room and Forge outputs remain controls. The two accepted construction families do not establish map/collision recovery for A2.

## Owners and persistence

Format adapters register directly in REMethods v2 with separate decode and subset-convert operations. They never claim native encoding. `RENativeBackground` validates a common result, constructs an ordinary `makeScene`, records bounded source evidence and compiles a detached independent viewer. `ProjectStore.appendScene` owns validation, stale guards, one history entry, atomic model installation and committed-warning handling for UI failures. The private transaction helper is shared with settings edits; callers cannot submit arbitrary mutators.

Evidence lives in the existing `scene.captureMeta.recovery` field with format `NESForgeNativeBackgroundRecovery`, version 1. Schema 12 remains unchanged. IDs bind source SHA-256, method and resource key. Reports are bounded to 256 KiB. The original source is not stored as the active project's `importedRom`. Later edits leave the import evidence historical. Invalid optional evidence does not delete ordinary project content; explicit evidence operations reject malformed reports.

Detached viewer compilation requires `{allowViewer:true}` and mapper 0. It uses the ordinary BuildGraph/RuntimeCompiler path; no live-project swapping, emitter copy or ROM publication is used for preview. Settings/movement preview defaults and raw recipe-v1 algorithms remain unchanged.

## Verification and remaining acceptance

`tools/build_native_background_examples.cjs` writes the two independent editable projects, static viewer ROMs and recovery records in `examples/RE_Native_Background/`. Its Manifest records exact source, application and output hashes. Focused suites cover source mutations, palette aliases, pointer ordering, bounded refusals, immutable staging, transactions, actual UI handlers, save/reopen and actual generated-ROM graphics after useful edits. Original CPU/PPU comparisons independently check both adapters.

The full release gate retains all 1,541 cases / 72 parent suites and adds the declared A1 suites. Current Summary and the native-background clean-extraction proof establish actual outcomes. Browser-native-background exercises the visible workflow separately; an unavailable Chromium launch is blocked with zero checks. VM/CPU/PPU results are not actual browser rendering, native dialog, independent-emulator, speaker, phone or physical-console acceptance. Owner acceptance of this finite A1 subset remains explicit; the complete roadmap/manual remain unfinished.
