# DABG native map and collision CPU research

This checkpoint executes original assembled Double Action Blaster Guys machine code with the existing NES Forge CPU and memory bus. It provides independent evidence for the native map format and a concrete collision change before any application integration.

`DABG_Native_Map_CPU_Verification.json` records the exact ROM, application HTML, linked labels, assembly listing, research script and relevant original source hashes. The input ROM remains unchanged, including its NES 2.0 header. The existing public emulator parser rejects that header. The research harness maps the original PRG bytes directly into the existing CPU bus and enters source-linked subroutines; it does not claim a successful frontend load or full-game boot.

## Reproduce

When this directory is at `research/native-map-intake-1/runtime/` in the matching NES Forge source checkout, run:

```sh
node research/native-map-intake-1/runtime/verify-dabg-native-map.cjs
```

All inputs can also be passed explicitly:

```sh
node verify-dabg-native-map.cjs APP_DIRECTORY ROM_PATH LABELS_PATH SOURCE_DIRECTORY LISTING_PATH REPORT_PATH
```

The defaults use the checkpoint's `build/dabg.nes`, `build/dabg.lbl`, `build/dabg.lst` and `source/DABG/`. The app supplies `tests/harness.cjs` and the release HTML named in its source manifest. A standalone input archive therefore needs the matching NES Forge source archive to reproduce CPU verification. Node.js is the only additional runtime dependency. No browser, network or production source change is involved.

The script emits the JSON report and the explicitly altered `DABG_LevelFinal_Empty_Run_Research_Variant.nes` alongside that report. The variant is a research derivative, not an original release of Double Action Blaster Guys. NovaSquirrel's original source and license are preserved in the source checkpoint.

## What passed

- All 25 map designs defined in the unchanged original source: all 6,400 native buffer cells, 1,507 ordered writes and terminal spawn positions match a separate source-derived expansion. Twenty-two designs are referenced by 39 of the 52 level configuration records. Three additional designs are defined but unreferenced; the remaining configurations use procedural maps, which this proof does not recover.
- All 36 original metatile entries: `BlockIsSolid` returns the expected flag bit and preserves Y. This is the full-solid predicate used by horizontal player movement.
- One native map command edit: ROM file offset `0x3FF4` changes `0x2D` to `0x3D`. In `LevelFinal`, the 14-cell horizontal solid run becomes an equally long empty run. Only cells `0xE1` through `0xEE` change, from native metatile 21 to 0. The terminal player spawn stays `(4, 13)`.
- Original player horizontal movement instructions, entered at the source-listing boundary and stopped before the next gameplay section, keep X at 8 when the wall is present and advance X to 10 after the edit. Both cases begin at Y=216 with the same right input and two-pixel movement speed. No movement logic is replaced by a test stub.

## Format facts and limits

The native buffer has 16 by 16 metatile cells. The visible screen has 16 by 15 cells; the last native row is retained in this proof. Horizontal and vertical run lengths use `n+1`, and rectangle width and height nibbles also use `n+1`. The CPU's eight-bit destination index wraps; the research decoder matches its ordered writes.

The original prose file `levelformat.txt` incorrectly describes rectangle subtypes. Actual `DecodeLevelMap` code indexes `LevelData_MetaList` using the low nibble: `0xD0` fills empty cells, `0xD1` fills spikes, and `0xD4` fills solid cells. The independent CPU comparison follows assembled source behavior and records this disagreement instead of silently repairing the original documentation.

The decoded buffer is the static command output before `PrettyLevel`. Subsequent original routines add random clouds, alter grass and platform presentation, and render the screen. Top landing/platform rules and interactive blocks have separate semantics. This checkpoint proves neither full gameplay equivalence nor full collision recovery. It does not implement structural discovery, a production adapter, canonical project import, source-game rebuilding, frontend NES 2.0 support, browser acceptance, independent-emulator acceptance or hardware acceptance.
