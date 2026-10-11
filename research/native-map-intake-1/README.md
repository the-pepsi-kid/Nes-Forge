# Double Action Blaster Guys — A2 source intake

This is an independently authored NES game and an evidence checkpoint for native map/collision recovery. It does not add an importer to NES Forge or complete A2 acceptance.

The original extracted files are available at `source/DABG/`. The original NovaSquirrel/DABG source at `5ecc60b6af3f726851bfeb1c2555388c5953e0c0` is preserved unchanged. Its 52 level records include actual command maps, original loader code and explicit collision predicates. The reproduced ROM is 32,784 bytes, SHA-256 `eca79b9d0b546e96c1bc73099e239539fb9c7773ff10a431bb3a9cd6763208ca`.

## Completed checkpoint

The original CPU verifier passes all 25 source map definitions (6,400 cells and 1,507 ordered writes), all 36 full-solid predicates, and a meaningful native edit. Of 52 level configuration records, 39 reference 22 of these map designs; three additional designs are unreferenced. Procedural map generation remains outside this proof.

Changing the original command byte at file offset `0x3FF4` from `0x2D` to `0x3D` turns 14 solid cells into empty cells. Under the same isolated initial state, original player movement instructions remain at X=8 before the edit and reach X=10 after it. See `runtime/README.md` and `runtime/DABG_Native_Map_CPU_Verification.json` for exact checks and limits.

The corresponding one-line upstream source patch also rebuilds to the exact altered ROM; see `variant-source/Source_Rebuild_Verification.json`. The complete original source remains intact.

The original NES 2.0 header remains intact. Forge's current public loader rejects that header; the verifier maps the original PRG into an isolated CPU harness. This is native routine evidence, not a successful frontend load, full-game boot or recovered Forge gameplay project.

The current application remains `2.0.0-alpha.11 / native-background-1`. `Application_Preservation.json` records verification of every one of its 4,880 payload hashes and the exact 4,881-file inventory. Its existing 1,617/1,617-case, 78-suite gate is retained unchanged, not rerun for this research-only update. Browser/owner acceptance remains open.

Next implementation follows `notes/NATIVE_MAP_RECOVERY_CONTRACT.md`: bounded structural discovery/decoding, independently proven CHR-RAM graphics, an explicit static solid/empty conversion, shared scene staging/import, and canonical edit/rebuild behavior. The research verifier uses source symbols and is not a production ROM recognizer.

## Reproduce

Requires Python 3, a host C compiler and GNU make. No network is needed; both immutable upstream source archives are included. From this directory run:

```sh
python3 reproduce.py --work /absolute/path/to/new-empty-directory --jobs 4
```

The script verifies archive and game source hashes, builds only ca65/ld65 from the pinned cc65 V2.19 source, assembles the unchanged game, emits labels/listing/debug metadata and verifies the exact ROM hash. The work directory must not already exist. `metadata/Reproduction.json` records a second clean extraction/build performed for this intake.

The ca65/ld65 executables self-report `V2.18 - N/A` from this V2.19 tag when built without Git metadata. The immutable commit and archive hashes identify the exact toolchain.

## License inventory

| Material | Upstream notice | Retained evidence |
| --- | --- | --- |
| DABG project and NovaSquirrel-authored source | zlib, copyright 2012–2014 NovaSquirrel | Original `LICENSE.txt` and source archive; `licenses/DABG-zlib.txt` |
| `sound.s`, `music.s` | GPL version 3 or later, copyright 2009–2011 Damian Yerrick | Original file headers; complete `licenses/GPL-3.0.txt` |
| `unpb53.s`, `unpkb.s`, `math.s`, `musicseq.h` | Permits copying/distribution with original notices retained | Complete original files and notices in source archive |
| cc65 toolchain | zlib-style notice | Complete pinned source archive; `licenses/cc65-LICENSE.txt` |

The project is mixed-license; the root zlib notice alone does not describe every included component. This inventory records upstream notices without reaching a legal conclusion. The entire source/assets/build-input set is retained. The game is an independent input, and its audio code is not incorporated into NES Forge.

## Evidence boundary

`Intake_Provenance.json` records source links, hashes, cartridge configuration, symbol addresses and source findings. `build/` contains the original reproduced cartridge and inspection metadata; intermediate objects and the compiler build tree are excluded.

The cartridge is NES 2.0 NROM-256 with 8 KiB CHR RAM. PB53-compressed graphics reside in PRG. Native maps use command records, and the original runtime separately handles horizontal/upward solids, top support, platforms, hazards and stateful blocks. PrettyLevel and RenderLevelBuf transform the visual map before play. A future adapter must honor those distinctions and existing framework boundaries.

The smallest original static map is `LevelFinal`: one horizontal run of 14 solid blocks and a spawn record. Most maps need additional behavior coverage. The prose level-format file disagrees with the actual rectangle decoder; source and executed ROM are the authority for this checkpoint.
