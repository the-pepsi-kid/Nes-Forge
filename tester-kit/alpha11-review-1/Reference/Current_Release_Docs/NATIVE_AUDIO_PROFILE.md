# Native Audio profile: exact native evidence and bounded ROM edits

This is a partial delivery of Audio A3. It recognizes a source-backed FamiTone2 instruction variant, decodes native music/SFX evidence, and rebuilds a ROM copy through exact same-layout command-byte edits. It does not recover audio from every engine, import the recovered score into Forge's canonical Audio editor, or certify audible or hardware fidelity.

## Supported recognition and input

`FamiTone2Native` is a synchronous pure JavaScript API. Load `src/re/famitone2-driver-profile.js` before `src/re/famitone2-native.js`.

The profile covers the linked FamiTone2 v1.11 configuration in the independently published HonkeyPong source: five music channels, four SFX streams, and a no-op bank-switch macro. Recognition compares 606 actual 6502 instructions, preserves internal links, and validates relocated RAM, zero-page, code and data references. It requires a statically reachable immediate initialization call whose argument setup has no alternate branch/jump entry. No filename, whole-ROM recognition hash, HonkeyPong data pointer or fixed game address selects support.

Accepted containers are iNES mapper 0, 16 or 32 KiB PRG, CHR RAM or one 8 KiB CHR bank, and an optional 512-byte trainer. Declared and actual lengths must agree; the maximum is 41,488 bytes. NES 2.0, mapper/banking variants, other instruction builds and dynamic initialization patterns remain outside this profile. Static reachability follows direct branches/calls/jumps and stops at unknown or indirect control flow; it is a conservative support check, not proof of all runtime paths.

The original source comment reverses the region flag. Actual instructions use A=0 for PAL and nonzero for NTSC. Both stored tempo and SFX region variants are decoded; the measured emulator comparison used NTSC.

## Evidence retained

- Original complete-ROM SHA-256, container/mapping details, method version, recognition call sites, and byte/address/file-offset provenance.
- Header subsong count and all five channel pointers per song; PAL/NTSC fixed-point tempo steps, initial speed 6 and accumulator `$0600`.
- Native notes/cuts, instrument commands, blank runs, speed commands, jumps, and one-level counted references. A reference counts encoded row events, not expanded repeated rows. Intro and cycle positions are retained.
- Referenced eight-byte instruments, duty/control bytes, and signed volume/arpeggio/pitch envelopes. Instrument count is not stored, so the decoded inventory contains referenced records only.
- Envelope values −64…63, additional-frame holds, and loops with inherited value included in cycle state. Leading holds whose initial value depends on previous playback state are refused.
- Native period tables without substituting Forge's tuning. Pulse and triangle use the same native periods but different frequency divisors.
- Statically proven SFX IDs and their four-byte NTSC/PAL pointer records. SFX streams preserve register-buffer writes, frame delays and termination behavior. There is no SFX-count field, so this is explicitly a partial inventory.

Channel rows are structural logical positions, not a simulated global frame timeline. Speed commands are global and processed in pulse1/pulse2/triangle/noise/DPCM order; zero or paused speed and cross-channel changes require playback-state analysis. Envelopes run every active video frame. Native SFX use louder-or-equal pulse/noise arbitration, active-triangle replacement and later-stream tie precedence. These rules are not flattened into Forge's pattern/SFX model.

## Safety and refusal boundaries

Every pointer must map into the declared PRG region. Decoded data cannot overlap executable bytes or a different proven data role; stream jumps cannot enter operands. Channel decoding is limited to 8,192 commands and 65,536 expanded rows per channel. Envelope and SFX offsets cannot wrap their 8-bit windows. All channels, envelopes and SFX share a 16,384-event work/output budget. Unterminated streams, nonproductive loops, nested/zero-length references, invalid register opcodes, conflicting structures and malformed pointers return explicit diagnostics. Multiple initialization candidates return `ambiguous` and select nothing.

DPCM recovery remains unsupported: this particular port's four-byte sample indexing disagrees with its converter's three-byte records, and the independent fixture contains no DPCM samples. Pitch-envelope effects, native tuning differences, short-mode noise, changing speeds, intro loops, sample playback and multichannel SFX can be retained as evidence without claiming canonical representability. No automatic canonical conversion is enabled.

## Pure API

```js
const evidence = FamiTone2Native.decode(romBytes);
// status: decoded | unknown | invalid | ambiguous
const rebuilt = FamiTone2Native.patch(romBytes, evidence, [
  {song: 0, channel: 0, event: noteEventIndex, noteCode: 21}
]);
// rebuilt.rom, rebuilt.evidence, rebuilt.changes,
// rebuilt.sourceSha256, rebuilt.rebuiltSha256
```

A patch requires successful evidence matching the entire original source hash and freshly revalidates the source. Only existing one-byte note/cut commands or instrument-selection commands can change. Notes use native numeric codes: tonal 0–60, noise 0–16; zero is a cut. Instrument edits can select only already decoded instrument records. The existing empty-following-row flag is preserved. Pointer, length, timing/control, envelope, SFX and arbitrary-offset edits are refused.

Shared byte references are reported through `changes[].affected`. Every affected alias is checked: a DPCM alias refuses the edit, and a noise alias enforces its smaller note range. Duplicate requests for the same physical byte are refused. Patch results own their ROM bytes and are decoded again before being returned; source ROM, editor project and emulator are not changed by these APIs.

## Independent evidence and reproduction

`examples/RE_Native_Audio/HonkeyPong-reproduced.nes` is the unchanged independent game (also named `independent.nes` for automated contracts). Its SHA-256 is `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`. The directory includes source/license provenance, declared relocation derivatives, symbol maps and `NES_Forge_Native_Audio_Input_Checkpoint.zip` with original sources, compatibility patch, pinned assembler and reproducible build instructions.

`tests/native-audio-profile200.cjs` loads the actual bundled candidate HTML. It combines 47 positive/negative core contracts, project/emulator nonmutation, and four native CPU/APU edit/rebuild checks. Contracts include source-reassembled independent code/data relocation and NROM32, mirrored pointers, trainer offsets, malformed structures, alternate-entry ambiguity, bounds, shared-byte edits, source identity and inherited envelope state.

The measured native note-20 to note-21 edit changes one command byte while retaining every external-driver byte. Across 180 natural frames per ROM, both versions produced 2,462 APU writes; 19 pulse-low writes changed native period 569 to 537 at identical frame positions, and all other observed APU writes retained exact timing and values. This is one bounded edit with logical emulator evidence, not general sound-equivalence, listening, mobile or physical-hardware acceptance. The current release report records the exact tested HTML hash.

## Reproduce the profile and relocation derivatives

`examples/RE_Native_Audio/NES_Forge_Native_Audio_Profile_Research.zip` (next to the input checkpoint) preserves the pure modules, 47-contract development runner, profile generator, source-reassembly scripts, relocation fixtures, provenance and development evidence. Extract it and the independent input checkpoint separately; its README gives the commands and explicit checkpoint path. The fresh application Summary remains authoritative for release acceptance; research reports retain their original candidate hashes. No host executables or caches are included.
