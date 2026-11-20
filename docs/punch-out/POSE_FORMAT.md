# Punch-Out full-pose records

This is how NES Forge reads and writes a fighter's full poses (pose selectors below `$80`). It is derived from the game's own shape dispatcher at `$C890` and checked on the owner side against every full pose of the supplied PRG1 cartridge: 543 poses, 14 fights. See `QA/punch-out-pose-geometry.cjs`. No ROM bytes are reproduced here.

Code:

- `app/src/re/punch-out-pose-streams.js`: a reference interpreter and an encoder.
- `app/src/services/punch-out-pose-geometry-project.js`: the native writer.

## Record

| Byte | Meaning |
|---|---|
| 0 | dx: the first slot's X relative to the fighter's base X |
| 1 | dy: the first slot's Y relative to the fighter's base Y |
| 2–3 | Geometry stream pointer |
| 4–5 | Attribute stream pointer |
| 6 | n: the number of tile streams |
| 7… | n tile stream pointers |

Pointers are little-endian CPU addresses. A stream may live in the fighter's 8 KiB bank (`$8000-$9FFF`) or in the fixed banks (`$A000-$FFFF`).

The fighter's sprites start at OAM slot 3. Every later slot is placed relative to the slot before it.

## Geometry stream

The high nibble of each byte is the opcode and the low nibble is a count `n`.

| Op | Effect |
|---|---|
| `00` | End |
| `0n` | A head piece one row down: dx, Y + sprite height. Then `n-1` pieces at X+8 on the same row. |
| `1n` | One piece: dx, same Y. The count is ignored. |
| `2n` | `n` pieces at X+8 on the same row |
| `3n`–`7n` | A head piece at (dx, dy), then `n-1` pieces at X+8 |
| `8n` | `n` hidden slots: Y = `$F8`, blank tile. X is not written. |
| `9n` / `An` / `Bn`–`Fn` | As `0n` / `2n` / `3n`, stepping X−8 |

Two native details matter:

- **Runs:** the continuation after a head writes at most 7 pieces.
- **Carry quirk:** a `0n`/`9n` head whose Y passes 255 leaves the carry set, and the slot pointer then advances by 5 bytes instead of 4. The rest of that stream writes shifted bytes. A few original off-screen poses do this. The interpreter models it, and the encoder never emits it.

## Attribute stream

| Op | Effect |
|---|---|
| `00` | End |
| top 3 bits `000`/`001`/`010`/`011` | `n` slots (low 5 bits) of palette 0/1/2/3 |
| top bit set | `n` explicit attribute bytes |

The reader switches to its behind-background mode at the first slot whose OAM Y is at or past `$50`, and stays in it for the rest of the stream. In that mode, palette runs write `palette | $20` and explicit bytes are EORed with `$20`. Explicit bytes can therefore still put any piece on either side of the background.

## Tile streams

| Op | Effect |
|---|---|
| `00` | End of this stream |
| `0n T` | `n` tiles from T, stepping 2 in 8×16 mode or 1 in 8×8 mode. An overflow past 255 carries into the next tile, so the encoder keeps runs below 256. |
| `1_ B` | Select CHR bank B for the fighter's sprite half. This applies to the whole pose. |
| `2n` | `n` explicit tiles |
| `8n` | `n` blank tiles (`$FE` in 8×16 mode) |

## Incremental poses

Selectors `$80` and up are incremental. Each record holds:

1. An optional position: a flag, then dx and dy.
2. An attribute stream pointer, for `$80-$BF` only. `$C0` and up re-derive behind-background from the `$50` line.
3. A starting slot offset.
4. Tile streams in the format above.

An incremental pose patches slots by number on top of the full pose before it. The writer does not change incremental poses. When a full pose's layout changes, the incremental poses that follow it still patch the same slot numbers.

## How the writer uses this

### Where it writes

- An edited pose gets a new record and new streams, written into the trailing zero fill of the fighter's 8 KiB bank. Streams may also use the fixed bank's trailing fill.
- Its single entry in the fighter's full-pose table is re-pointed to the new record.
- Original records and streams are never modified, because other poses share them.

### Verification on every build

- The build decodes each edited pose through the original routine and refuses unless the result is exactly the requested layout.
- It also checks that every other full pose decodes unchanged.
- The fill space is checked to be unread by every original full pose.

### CHR tiles and banks

- Tile pairs `$00`, `$FC` and `$FE` are reserved in every pose bank:
  - Pair `$00` holds tile `$00`, which OAM slot 0 draws from the fighter's current bank. The game busy-waits for that sprite's hit on the background to split the status bar.
  - Slots 1 and 2 draw the MMC2 latch tiles `$FD` and `$FE`, which sit in pairs `$FC` and `$FE`.
- "Make half size" composes the pose and scales it by half, keeping each pixel's palette and colour. It re-tiles the result per palette into 8×16 pieces.
- It places those pieces in tile pairs that no decoded full or incremental pose of any fighter uses. It tries the pose's own bank first, then the fighter's other banks, then other fighters' pose banks.
- It writes the pixels through the physical CHR bank writer and the layout through the pose writer.

### Revisions

Writing is enabled for PRG1, the revision verified on the owner side. PRG0 needs the same checks before it is enabled.
