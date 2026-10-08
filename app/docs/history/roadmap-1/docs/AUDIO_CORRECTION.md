# Audio correction — 2.0.0-alpha.1

Candidate `audio-correction-1`, schema 12. This is a bounded review candidate, not a promoted release or completion of the full Audio workflow milestone.

## What changed

| Reproduced defect | Correction | Evidence required |
| --- | --- | --- |
| A dense music stream with 64 four-byte events could wrap its one-byte cursor before reaching its end marker, leaving the generated reader in an endless scan. SFX uses the same representation. | Carry cursor advancement into the stream pointer. Music order changes and SFX starts still reset the pointer to the original data. | Actual generated 6502 execution for 63, 64 and 128 events; music in viewer, single-room and World builds; SFX in both playable backends, including a late-row range. |
| Authored triangle A4 used pulse timer 253, giving about 220.2 Hz on triangle. | Separate triangle timer lookup with the correct waveform divisor. A4 uses timer 126, about 440.4 Hz. | Independently specified note/timer expectations, actual emitted APU writes, arpeggios and both ends of the note range across all three generated backends. |

The original 60-byte zero-page allocation and project representation remain unchanged. The separate triangle table costs 192 PRG bytes, plus the reader's carry instructions. Existing resource and PRG-capacity validation remains active. Near-capacity projects still need to fit the selected supported ROM layout.

Pulse and noise behavior is preserved. Triangle still has hardware and preview limitations: C0 through G-sharp0 saturate timer 2047, about 27.31 Hz; notes above that have normal integer-timer quantization. Arpeggios remain bounded to the existing 0–95 note range. This candidate does not redesign triangle volume, the Studio oscillator/noise preview, note-off semantics or host audio buffering.

## Evidence and reproduction

- Exact application identity: `../build-inputs.json`.
- Measured full gate: `../test-results/candidate/Summary.json`; 41 retained suites / 895 retained cases and the focused `audio-correction200` suite are required.
- Focused suite source: `../tests/audio-correction200.cjs`; expected values are specified independently of the production timer table. It executes compiled CPU/APU behavior rather than accepting a build alone.
- Clean extraction: `../checkpoints/audio-correction-1-clean-extraction/Reproduction.json` identifies the staging input, verified payload count, unchanged HTML, summary hash and measured totals.
- Frozen predecessor: `../baseline/NES_Forge_1.9.0_RE_Runtime.html`; old reports under `../checkpoints/re-runtime-1-reference/test-results/` remain evidence for those older bytes only.
- Fresh browser launch outcomes: the three `../test-results/browser-*/Report.json` records. A blocked launch means zero executed browser checks.

From the extracted package root, with Node.js 20+ and Python 3:

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

The full gate takes time because it executes compiled ROMs. A review package is emitted only after all mandatory suites pass on a clean extraction, the input provenance still matches and the fresh browser outcomes are recorded honestly. Automated register/CPU tests do not establish audible browser output, independent emulator compatibility or physical NES timing.

## Try the corrections

Follow `AUDIO_CORRECTION_CHECKLIST.txt`. Two native projects and their generated ROMs are included under `../examples/Audio_Correction_2.0.0-alpha.1/`:

| Example | Purpose |
| --- | --- |
| `Dense_128` | 128-row music plus a 128-row Pulse 1 SFX triggered by the player's attack animation. Checks that playback continues and the SFX eventually returns control to music. |
| `Pulse_Triangle` | Alternating pulse/triangle A4, then pulse/triangle A5. Checks matching pitch despite different timbres; it is not a timbre-equality test. |

`Manifest.json` ties each input project and generated ROM to this HTML. Rebuild them with `node tools/build_audio_correction_examples.cjs`. These supplied ROMs are review inputs, not claimed listening results.

## Preserved scope and next work

Canonical tracker, instruments, SFX, imports and native project persistence remain shared with RE. Preserve the five templates, schema 12, 12-actor and 64-persistent-byte limits, Door Option B, partial single-room recovery, one-way synchronization and editor/build/emulator/capture/Save As/CHR/undo contracts.

Owner review is pending. Mobile A/V lag, hardware controllers, speaker output and physical-console checks remain separately unverified. General native music recovery is not added; existing APU observations are not recovered songs. After this bounded correction review, complete the supported audio author/import/edit/build/listen/save/reopen workshop and scope any reproduced playback defects before resuming native-driver recovery.
