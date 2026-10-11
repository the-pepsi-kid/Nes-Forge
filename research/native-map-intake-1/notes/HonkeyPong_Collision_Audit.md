# HonkeyPong native collision audit for A2

Audited 2026-10-11. This is a source and ROM inspection record, not runtime, browser, hardware, or A2 acceptance evidence. No application or source corpus files were modified during the audit.

## Conclusion

HonkeyPong has real collision behavior, but no native tile collision table was found in its complete pinned gameplay source. Collision uses immediate coordinate bounds and dynamic paddle rectangles, independently of background tiles. Its procedural playfield is unsuitable for claiming A2 tile-map/collision recovery or a wall/traversability edit through the existing canonical tile collision model.

A possible separate feature could expose procedural arena bounds with source provenance and explicit scoring/bounce distinctions. That would require native code-operand handling or a declared behavioral conversion. It would not establish tile-map collision recovery and is not implemented here.

## Reproducible inputs

All paths below are relative to the application root (`app/` in the source repository).

- Pinned source and reproduction archive: `examples/RE_Native_Audio/NES_Forge_Native_Audio_Input_Checkpoint.zip`.
- Archive prefix: `NES_Forge_Native_Audio_Input_Checkpoint/`.
- Source root inside the archive: `HonkeyPong/`.
- Upstream: `https://github.com/HonkeyKong/HonkeyPong`.
- Pinned commit: `f9ab7ad450ffebabec15623aa811a7564f079168`.
- License: MIT; preserved in archive entry `HonkeyPong/LICENSE` and `examples/RE_Native_Audio/LICENSE-HonkeyPong.txt`.
- Reproduced ROM: `examples/RE_Native_Audio/HonkeyPong-reproduced.nes`, 24,592 bytes, SHA-256 `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`.
- Assembler symbol map: `examples/RE_Native_Audio/independent.map`; the archive also retains `HonkeyPong-reproduced.map`.
- Source verification and build commands: archive entry `HonkeyPong-provenance.json`.
- The verified `src/engine.oph` SHA-256 is `6c78492edcc1a6ed7d2e654a48f5ff12234bd24a9026924d4595b4cfeeaa5c04`.
- The verified `src/render.oph` SHA-256 is `e350415c6820524d3a11076b8daa2e9a7a529b52057b819f050b093735146e76`.
- The verified `src/main.oph` SHA-256 is `2411ef2a856881f20c4bc68588bac64282999af3250ec83194b08f7e53e28e30`.

Source references below resolve under the archive's `HonkeyPong/` source root. They do not require previously extracted scratch files. Inspect the archive members directly, the preserved map, and the reproduced ROM. The ROM is iNES mapper 0, with a 16-byte header, one 16 KiB PRG bank and one 8 KiB CHR bank. For the original assembler's CPU addresses in `$C000–$FFFF`, the physical file offset is `16 + (CPU address - $C000)`.

## Native behavior and exact ROM evidence

`src/engine.oph:4–10` defines `LEFTWALL=$0C`, `RIGHTWALL=$ED`, `TOPWALL=$24`, `BOTTOMWALL=$D4`, `PADDLETOP=$26`, `PADDLEBOTTOM=$DA`, and `PADDLELENGTH=$18`. Lines 16–17 define `PADDLE1X=$18` and `PADDLE2X=$E2`.

Each following offset is the immediate operand byte of an original `CMP #imm`, not a table record. The preceding `LDA` loads a position from zero page.

| Meaning | Source reference | Operand file offset | Operand CPU address | Value | Original instruction sequence starting three bytes before operand |
| --- | --- | --- | --- | --- | --- |
| Right scoring boundary | `src/engine.oph:178–190` | `0x09D7` | `$C9C7` | `$ED` | `A5 04 C9 ED 90 0F` |
| Left scoring boundary | `src/engine.oph:201–211` | `0x09F7` | `$C9E7` | `$0C` | `A5 04 C9 0C B0 0F` |
| Top ball bounce | `src/engine.oph:225–236` | `0x0A1C` | `$CA0C` | `$24` | `A5 05 C9 24 B0 0F` |
| Bottom ball bounce | `src/engine.oph:250–261` | `0x0A41` | `$CA31` | `$D4` | `A5 05 C9 D4 90 0F` |
| Player 1 paddle top limit | `src/engine.oph:269–282` | `0x0A5C` | `$CA4C` | `$26` | `A5 0E C9 26 90 0E` |
| Player 2 paddle top limit | `src/engine.oph:290–300` | `0x0A76` | `$CA66` | `$26` | `A5 10 C9 26 90 0C` |
| Player 1 paddle bottom limit | `src/engine.oph:308–318` | `0x0A8E` | `$CA7E` | `$DA` | `A5 0F C9 DA B0 0C` |
| Player 2 paddle bottom limit | `src/engine.oph:326–336` | `0x0AA6` | `$CA96` | `$DA` | `A5 11 C9 DA B0 0C` |
| Player 1 paddle horizontal collision limit | `src/engine.oph:338–350` | `0x0AB8` | `$CAA8` | `$18` | `A5 04 C9 18 B0 6B` |
| Player 2 paddle horizontal collision limit | `src/engine.oph:410–421` | `0x0B29` | `$CB19` | `$E2` | `A5 04 C9 E2 90 6B` |

The runtime position variables are reserved in `src/main.oph:40–53`: `BallX=$04`, `BallY=$05`, `BallBottom=$06`, `Paddle1YTop=$0E`, `Paddle1YBot=$0F`, `Paddle2YTop=$10`, and `Paddle2YBot=$11`. The symbol map independently confirms these locations.

Actual instructions, rather than sometimes imprecise source comments, establish these comparisons:

- Right-moving ball: after incrementing `BallX`, `BallX >= $ED` scores for player 1 and resets the playfield.
- Left-moving ball: after decrementing `BallX`, `BallX < $0C` scores for player 2 and resets the playfield.
- Up-moving ball: `BallY < $24` changes direction to down.
- Down-moving ball: `BallY >= $D4` changes direction to up.
- Paddle movement has separate top and bottom limits and uses two-pixel steps.
- Paddle contact checks horizontal position, `BallBottom` against the paddle's top, and `BallY` against its bottom; it then changes horizontal direction and may adjust vertical speed based on input.

The named side “walls” are scoring boundaries, not solid obstacles. Ball and paddle comparisons use different coordinates and thresholds. A synthesized solid tile border would not be a faithful recovery of these native rules. These semantics were established by source and machine-code inspection in this audit; no new execution comparison was performed.

## Visual playfield is a separate construction

`RenderPlayField`, `src/render.oph:111–173`, occupies CPU `$C125–$C1BF`, physical file offsets `0x0135–0x01CF`. The next routine, `RenderTitleCard`, begins at `$C1C0`. `RenderPlayField` sends bytes to the PPU directly:

- Two blank rows, a score row, another blank row, then literal top-border tile indices.
- Repeated literal side-border tiles separated by blank tiles.
- Literal bottom-border tiles.
- Sixty-four zero attribute bytes.

The blank-fill helpers are `WriteBlankRows` at CPU `$C072` (`src/render.oph:5–19`) and `WriteBlankTiles` at `$C089` (`src/render.oph:21–34`). They emit PPU bytes; physics does not read their resulting graphics or an associated collision array. `scoreRow` is text data at CPU `$CC43` (`src/engine.oph:593–594`).

`MapAddr=$15` (`src/main.oph:57`) is used by `RenderTitleScreen` (`src/render.oph:88–109`) to transfer title graphics. `TitleScreen` at CPU `$C432` / file `0x0442` includes `res/nam/title.nam` (`src/render.oph:358–361`). This is a native graphics record, not a gameplay collision record. A1's title-background recovery does not change that distinction.

The original gameplay dispatcher calls `EnginePlaying` from NMI (`src/main.oph:233–236`). The map places `EnginePlaying` at `$C946`, `CheckPaddle2` at `$CB16`, `PlayEngineDone` at `$CB87`, and `ResetPlayfield` at `$CC20`. The full `EnginePlaying` source contains no tile-map or PPU collision lookup.

## Local corpus assessment

| Input | A2 significance | Limitation |
| --- | --- | --- |
| HonkeyPong reproduced ROM | Independently authored game with source-backed procedural bounds and dynamic paddle collisions. | No native tile collision table; immediate arena bounds cannot establish wall/traversability map recovery. |
| `examples/RE_Native_Audio/relocated.nes`, `nrom32.nes` | Useful structural variants for decoder and pointer validation. | Derivatives of the same HonkeyPong engine, not additional independent engines. |
| `tests/fixtures/re-runtime/pepsi_vending_v9e.nes` | Owner-supplied independent engine with established graphics and vending/state/credit evidence. | Collision semantics remain unestablished. This audit does not claim that an exhaustive absence of collision was proven in Pepsi. The roadmap explicitly forbids inventing a collision engine for it. |
| `examples/RE_Bridge_Room/Bridge_Room.nes` | Retained positive control for the Native Room v1 collision decoder. | Purpose-built fixture; cannot establish unfamiliar independent-engine recovery. |
| Forge gameplay, movement, golden and recovered static-background ROMs | Existing framework and compatibility regression evidence. | Generated application outputs, not independent native map/collision input. |

The inspected local corpus does not establish a suitable independent native tile-map/collision input. `docs/NES_Forge_2.0_ALPHA_PLAN.md` defines A2 as agreement between native records and original behavior, followed by a wall/traversable edit that changes rebuilt behavior. It explicitly distinguishes graphics acceptance from collision support and permits adding corpus inputs when the graphics pair lacks collision examples.

## Bounded next step and limits

Select another independently authored, permitted and reproducible input containing native map records plus a real collision lookup. Record the map encoding, tile or metatile properties, original lookup semantics, physical source ranges, and expected behavior before designing the reusable adapter. Use the shared recovery and canonical import services, preserving schema and runtime contracts.

Do not label visual border tiles as recovered collision, reinterpret scoring boundaries as solid walls, count relocated variants as independent games, or modify Bridge Room to manufacture unfamiliar-engine acceptance. This audit adds evidence only and leaves A2 implementation and acceptance open.
