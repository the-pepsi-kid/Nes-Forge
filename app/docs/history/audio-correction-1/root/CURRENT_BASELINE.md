# Current candidate and preserved reference

| Item | Current record |
| --- | --- |
| Release / candidate | 2.0.0-alpha.1 / audio-correction-1 |
| Application | mainline/NES_Forge_2.0.0-alpha.1.html |
| Schema | 12; unchanged canonical data and format contracts |
| Authority | October 4 owner continuation after the bounded two-defect audio-correction plan; D052 |
| Change | Dense music/SFX event-stream carry and channel-correct triangle timers; release metadata |
| HTML identity | Exact SHA-256 in build-inputs.json and current measured reports |
| Full gate | test-results/candidate/Summary.json: 41 retained suites / 895 cases plus audio-correction200 |
| Clean extraction | checkpoints/audio-correction-1-clean-extraction/Reproduction.json |
| Browser evidence | test-results/browser-mobile/Report.json; browser-re-analysis/Report.json; browser-re-runtime/Report.json |
| Owner/listening/device acceptance | Pending; browser launch availability and executed checks are recorded separately |

A report applies only when its HTML hash and input provenance match this candidate. This is not a promotion or a complete audio/RE acceptance claim.

## Frozen reference

1.9.0 Alpha / re-runtime-1 HTML SHA-256: e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d.
Original ZIP SHA-256: 8cc66184914c21422b346bcbf60af19eb5da69046e13aeeea0aa9fa65037b0d0.
Its original measured result is 895/895 across 41 suites; October 2 focused probes subsequently reproduced the reader-loop and triangle-pitch defects. Both facts are retained.

The exact predecessor HTML is baseline/NES_Forge_1.9.0_RE_Runtime.html. Its current documents are archived in docs/history/re-runtime-1/root/ and its reports in checkpoints/re-runtime-1-reference/test-results/. Existing older references, oracles and examples remain historical and unchanged.

## Standing contracts

NES/Famicom / 8-bit / 6502 remains the game target. Schema 12, five templates, the 12-executable-actor and 64-persistent-byte limits, Door Option B, partial single-room recovery and one-way synchronization remain as documented. Preserve authoring, save/reopen, undo, build, emulator/capture, Save As and CHR behavior. No CPU/PPU/APU emulator rewrite, new mapper, new audio model or general decoder is included.

Audio still supports Pulse 1, Pulse 2, Triangle and Noise with one active SFX at a time. Existing MIDI/MusicXML adapters and unsupported-effect/DPCM rejection remain. Audio-off legacy builds retain their independent byte oracles; previously generated audio-enabled ROMs must be rebuilt to receive these corrections.

See docs/AUDIO_CORRECTION.md and docs/AUDIO_CORRECTION_CHECKLIST.txt for candidate-specific review. See ROADMAP.md for remaining audio workflow/listening work, native audio recovery and later phases.
