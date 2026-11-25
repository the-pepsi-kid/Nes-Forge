# Emulator compatibility: cartridge headers and forced-blank scrolling

Status: implemented and tested. Regression suites: `QA/ines-header.cjs` and `QA/emulation-forced-blank.cjs`, both part
of the full regression. Related: [CAD-PORT](CAD_PORT.md), [Agent Lab verification](AGENT_LAB_VERIFICATION.md).

Both were found by CAD-PORT-01's runtime observation, which ran the same cartridges in NES Forge's emulator and in
FCEUX. Both are fixed in the general emulation path. There is no per-game code, and no instruction is bypassed.

## 1. Cartridge headers: one recognizer (`app/src/re/ines-header.js`)

**Finding.** "Mega Man (U)" carries the text `DiskDude!` in header bytes 7–15, written there by an old dumping tool.
NES Forge's emulator read byte 7 as the high nibble of the mapper number. It got mapper 66 (GxROM) instead of 2
(UNROM), and the game never reached its NMI handler. FCEUX ignores those bytes. Forge also had an exact-ROM exception
for another cartridge with the same contamination (Shadowgate, `shadowgate-mapping.js`).

**Rule** (NESdev wiki, iNES / NES 2.0 identification):

| Condition | Reading |
|---|---|
| byte 7 AND `$0C` = `$08`, and the NES 2.0 sizes fit in the file | NES 2.0: 12-bit mapper, submapper, exponent sizes, RAM sizes, console type and timing |
| byte 7 AND `$0C` = `$04` | archaic iNES |
| byte 7 AND `$0C` = `$00`, and bytes 12–15 are zero | iNES 1.0 |
| anything else | archaic iNES: only bytes 0–6 are trusted, and bytes 7–15 are reported (with any text they hold) and never interpreted |

**One recognizer for every reader:**
- the emulator's `parseRomHeader` (which now also loads valid NES 2.0 headers whose mapper it supports);
- the intake analysis (`REAnalysis`). Its `header` record still states what the header bytes declare, because stored
  ROM projects compare that record exactly when they are reopened. The recognizer's reading goes in a separate
  `headerReading` (format, effective mapper, which bytes were ignored, and any text in them), and the intake warning
  says which mapper is used;
- the library's cartridge layout.

The Shadowgate exception is removed: the general rule gives the same mapper.

**Original bytes.** The recognizer only reads. `normalizedHeader()` and `view()` return copies. The cartridge's
SHA-256 stays its identity, and the bytes given to the emulator are the user's file as it is. AL-EXP-01's experiment
contract still refuses NES 2.0 and dirty header tails by design; that slice accepts only clean synthetic NROM.

**Local cartridges (19):**

| Reading | Cartridges | Effect |
|---|---|---|
| iNES 1.0 | 13 | — |
| archaic iNES, "DiskDude!" | Mega Man, Shadowgate | mapper 2 and 4; read naively, 66 and 68 |
| archaic iNES, harmless tails | Castlevania PRG 1 and Metroid ("NI 1.3"), Punch-Out PRG 1 ("MJR"), TMNT ("aster") | byte 7 is zero, so the mapper is unchanged |

**Regression (`QA/ines-header.cjs`, 6 checks):**
- synthetic iNES 1.0, NES 2.0, contaminated and size-inconsistent headers;
- the original bytes are unchanged;
- every local cartridge is read as expected;
- the emulator, the intake's reading and the library agree on the mapper, and the intake's declared record is unchanged;
- Mega Man runs in the emulator unmodified: the NMI handler ran 233 times in 240 frames, where before it never ran.

## 2. Vertical scroll when rendering is turned on mid-frame

**Finding (Battletoads).** With the same input, NES Forge's emulator stopped at the start of Level 1. The game loops
at `$863C`: `LDA #$40` / `BIT $2002` / `BEQ`, waiting for a sprite-0 hit. FCEUX passes the same point.

**Investigation.** `tools/agent-lab/independent/divergence.cjs` compares CPU RAM at every NMI between the engines.
Probes then looked at the first entry into the wait loop in each engine:
- **Same state in both:** sprite 0 at y 28, x 254, flipped horizontally, and the same nametable rows.
- **FCEUX:** leaves the loop about 5,875 cycles after NMI, around scanline 30.
- **The game's PPU writes, logged in FCEUX for that frame:**
  - `$2001 = 0`: rendering off from the start of vertical blank;
  - VRAM uploads;
  - `$2006 = $00, $60`, so the VRAM address `v = $0060`;
  - `$2005 = 0, 0`, which writes only the temporary address `t`;
  - `$2001 = $08`, then `$18`, around scanline 15.

On hardware, the pre-render line copies the vertical scroll from `t` into `v` only while rendering is on. Here
rendering was off, so it resumes from `v`. Nametable row 3 is drawn from line 15, which puts the only opaque pixels
under sprite 0 (the last line of tile `$FF` in row 4) at about line 30, where the hit occurs.

NES Forge's scanline renderer took each frame's vertical scroll from `t` at the start of the frame, whether or not
rendering was on. It reloaded it from `v` only on a `$2006` write while rendering was already on. In Battletoads the
writes happen during forced blank, so the opaque pixels landed below the sprite and the hit never came.

The leads NESdev lists for Battletoads' first-stage hang (sprite-0 hit, PPU timing, scrolling, mirroring) were each
checked against this evidence:
- **Sprite-0 hit:** the hit logic itself was correct. It allows a hit at x = 254 and excludes x = 255.
- **Mirroring:** AxROM's one-screen page selection was correct.
- **Scrolling:** the scroll source was the cause.

**Fix** (`app/src/legacy/01-emulator.js`, `emuRunFrame`):
1. At the start of a frame, the vertical scroll comes from `t` only if rendering is on.
2. Otherwise, the first scanline rendered continues from `v`.
3. When rendering stops mid-frame, `v` keeps the vertical position it reached.

Frames that keep rendering on, nearly every frame of every game, take exactly the same path as before.

**Regression (`QA/emulation-forced-blank.cjs`).** Three synthetic NROM cartridges are built by the suite (none is
stored). Each runs in NES Forge's emulator and in FCEUX, and the result is read from CPU RAM:

| Case | Setup | Expected | NES Forge | FCEUX |
|---|---|---|---|---|
| `v-row4` | rendering off at pre-render, `v` at row 4, on mid-frame | hit | 27 of 27 frames | 27 of 27 |
| `v-row0` (control) | as above, `v` at row 0 | no hit | 0 | 0 |
| `t-scroll` | rendering stays on, Y scroll from `t` | hit | 28 of 28 | 27 of 27 |

The pre-fix build fails `v-row4` with 0 hits. With the local cartridge, the suite also checks that Battletoads reaches
Level 1: the NMI handler runs 384 times in frames 2600–3000, where before it stopped.

**Not changed, and open.** With every NMI compared, the engines' first RAM difference on Battletoads is at the 2nd
NMI, before any input. It is one byte, `$0075` (NES Forge 220, FCEUX 113). It persists, but the game behaves the same
in both engines: both reach Level 1 and draw the same screens at nearly the same frames (2674 and 2677). The
inference, not traced instruction by instruction, is that it is a value the game's idle loop advances while it waits
for vertical blank. It would then depend on how many CPU cycles pass between power-on and the first NMI, which differs
between emulators and between power-ons of real hardware. It is recorded, not corrected. NES Forge's PPU remains a
scanline renderer: changes in the middle of a scanline take effect at scanline granularity.