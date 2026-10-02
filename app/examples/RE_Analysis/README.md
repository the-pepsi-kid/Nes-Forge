# Original byte-analysis examples

These short diagnostic sequences were authored for this candidate. They are raw binaries with no NES header, graphics or recovery metadata. They are not complete games and are not intended for Load ROM or Build & Run. Use RE / DISASM → general analysis. The manifest records exact sizes and SHA-256 identity.

## raw_counter.bin

Open the 14-byte file for analysis. Choose file offset `0`, length `14`, CPU address `$4000`, and the NMOS 6502 policy. The selected CPU origin is an analysis mapping, not a declaration of NES cartridge placement. Expected instruction candidates:

| File offset | CPU address | Bytes | Interpretation |
| --- | --- | --- | --- |
| 0 | $4000 | A9 03 | LDA #$03 |
| 2 | $4002 | 85 10 | STA $10 |
| 4 | $4004 | C6 10 | DEC $10 |
| 6 | $4006 | D0 FC | BNE $4004 |
| 8 | $4008 | 4C 00 40 | JMP $4000 |
| 11 | $400B | 02 | Undocumented under the official-opcode policy; preserve as a byte |
| 12 | $400C | EA | NOP |
| 13 | $400D | 60 | RTS |

Search for `C6 10 D0 FC`; the match begins at physical file offset 4. Add a note such as “Counter decrement candidate; execution not observed” and export the analysis report. The report is evidence/notes, not an editable Forge project. Do not assume every byte after the unconditional jump is executed code.

## overlapping_banks.bin

Create two mappings:

| Label | Physical file offset | Length | CPU start |
| --- | --- | --- | --- |
| Bank A | 0 | 16 | $8000 |
| Bank B | 16 | 16 | $8000 |

Both views begin at CPU $8000, but Bank A begins `LDA #$01` and Bank B begins `LDA #$02`. Physical offsets and bank labels distinguish them. This synthetic example declares no actual mapper or automatic switch behavior.

## Existing independent NES example

`../RE_Bridge_Room/Bridge_Room.nes` has a valid NES container and can be inspected without running or recovering it. The separate recovery section recognizes that one documented native engine. Other binaries remain eligible for general inspection even when recovery is unavailable.
