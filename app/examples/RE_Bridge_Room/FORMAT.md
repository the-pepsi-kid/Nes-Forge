# Courtyard: native ROM recovery fixture, revision 1

`Bridge_Room.nes` is an original, deliberately small source-available NES homebrew. It is built by `build.py` from `main.asm` and the original art/map/tune definitions in that builder. The Python standard library is the only build dependency. The assembler is a small, original two-pass subset assembler; neither the code nor the ROM comes from Forge's runtime compiler. The ROM contains no project JSON, no Forge recovery marker, and no packed Forge authoring records.

The scene is a courtyard with a grass floor, a brick wall and one player. Left/right moves the player, and Pulse 1 plays an original 16-step tune. This is a controlled known-format recovery fixture, not evidence that arbitrary games can be decoded.

## Cartridge and physical layout

The 16-byte iNES header specifies mapper 0, 32 KiB PRG-ROM, 8 KiB CHR-ROM, horizontal mirroring, no trainer and no SRAM. CPU address `$8000` maps to file offset 16. An address `$A` in PRG maps to `16 + A - $8000`; the CHR file offset is 32784.

| CPU address | Length | Native meaning |
|---|---:|---|
| `$8000` | 2048 | Native engine code followed by `$EA` padding; profile fingerprint region |
| `$B000` | 960 | One 32×30 row-major nametable, 8-bit background tile IDs |
| `$B3C0` | 64 | Native attribute bytes, four 2-bit palette selectors per byte |
| `$C000` | 960 | One 32×30 row-major collision map; 0 empty, 1 solid |
| `$D000` | 32 | Four background and four sprite palettes in PPU order |
| `$D020` | 8 | Player configuration described below |
| `$D030` | 4 | Song configuration described below |
| `$D100` | 32 | Sixteen little-endian 11-bit Pulse 1 timer periods |
| `$FFFA` | 6 | NMI, RESET and IRQ vectors |

CHR `$0000–$0FFF` is the background bank and `$1000–$1FFF` is the sprite bank. Tiles use normal 16-byte two-plane encoding. Player art is sprite tile 0, palette 0. Unused CHR tiles are zero-filled.

`manifest.json` records the ROM hash, code fingerprint, vectors hash, physical ranges and assembler symbols. Its numbers are supporting evidence for humans/tests. The bridge must inspect and validate the actual ROM bytes and must not require this sidecar or read authoring data from it.

## Native behavior and configuration

Player bytes `$D020–$D027` are:

| Offset | Meaning | Initial value | Original engine use |
|---|---|---:|---|
| 0 | X, center of feet | 40 | Spawn/movement |
| 1 | Y, feet | 208 | Sprite placement; fixed in this native engine |
| 2 | Body width | 8 | Both horizontal collision probes and sprite offset |
| 3 | Body height | 8 | Sprite placement |
| 4 | Horizontal speed | 2 | Movement |
| 5 | Reserved jump tuning | 8 | Not executed by this original engine |
| 6 | Reserved gravity tuning | 1 | Not executed by this original engine |
| 7 | Reserved terminal fall tuning | 6 | Not executed by this original engine |

The original engine supports **horizontal movement only**, with the body at Y=200–207 and feet at 208. It probes the collision map's row 25 using the candidate body's left and right pixel edges. This is real ROM data read by the CPU during play. At the wall, columns 24–25 are solid and the player's right edge cannot reach X=192; its center stops at 188. Moving left works normally. Clearing those collision bytes, while preserving the wall graphics, lets the original engine pass through the pictured wall. `verify.cjs` exercises this distinction.

The floor occupies rows 26–29 and the wall rows 16–25. The floor's solid flags are part of the native map format, but this horizontal-only engine does not execute gravity/floor-contact behavior. The Forge adaptation uses its standard sideview controller, jump, gravity and animation hooks. Those are **declared adaptations**, not a claim that the original engine's arbitrary code was translated or its nonexistent jump behavior recovered. The reserved tuning values are interpreted as adaptation settings, not evidence of executed native motion.

Native RAM: `$00` frame-ready flag, `$01` player center X, `$02` controller bits, `$03` candidate X, `$04` song frame tick, `$05` song row, `$06–$07` upload pointer, `$08` boot-ready flag, `$09` frame count modulo 256, `$0A` half body width. Complete addresses are in the generated manifest. Input is serial NES controller order, with right at bit 0 and left at bit 1 after the read loop.

## Native music

Configuration bytes `$D030–$D033` are row count 16, frames per row 12, Pulse 1 control `$BC` (50% duty, length halt, constant volume 12), sweep `$08` (disabled). The native engine plays timer row 0 during initialization, advances once every 12 NMI frames and loops after row 15. It writes `$4002/$4003` directly; no tracker JSON is embedded. Timer values are 427, 338, 284, 213, 225, 284, 338, 380, 427, 338, 284, 253, 284, 338, 380, 427.

The original composition in the source builder uses MIDI notes 60,64,67,72,71,67,64,62,60,64,67,69,67,64,62,60. Timer generation is `round(1789773 / (16 * (440 * 2**((midi - 69) / 12))) - 1)`. The decoder must infer supported notes from the timer bytes, reject ambiguous/unsupported periods, and preserve 12-frame row timing. Forge's tracker note is MIDI minus 12. At tempo 150, speed 12 provides the same row cadence in the supported generated runtime. Audio playback phase and full sample-identical output are outside the recovery claim.

## Reproduce and verify

Run `python3 build.py` in this folder to rebuild the ROM and manifest deterministically. To run the native-engine checks against a packaged Forge source tree:

```
node verify.cjs /absolute/path/to/NES_Forge_1.9.0
```

The verifier uses the package's existing command harness and actual bundled 6502/PPU/APU emulator; it writes `verification.json` and one RGBA frame. The PNG provided alongside it is a nearest-neighbor rendering of that actual emulated frame, not a browser screenshot. This verifies CPU execution, native collision-table use and APU register changes. It does not verify physical hardware, real-browser input, sound output or mobile performance.

All engine code, pixel grids, map layout and tune in this fixture were authored for this demonstration. No commercial ROM or third-party engine content is included. Publication and licensing remain the project owner’s decision.
