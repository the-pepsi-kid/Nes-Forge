# Current RE and emulator navigation evidence
Final candidate: `re-navigation-1`. HTML SHA-256 `e4ac5e66dcd49aa965dab7c1c678399b47ef31ff579aa6c5d83a859855af3e16`.
The complete clean-extraction gate passed **788/788 across 35 suites**.
Both runtime reports and logs in this folder are copied from that exact full run.

`emulator-timeline-runtime.json` identifies the exact tested HTML by SHA-256 and
records nine independent runtime cases. These tests execute the application's
CPU, PPU and APU. The DOM is a test harness; browser interaction and device
performance are not established by this report.

The test covers both the independent Native Room source ROM and the generated
Scout World ROM. It records an earlier machine state, executes later frames,
restores the earlier state, and verifies complete machine equality. Resuming the
same inputs reproduces the later CPU/PPU/APU state, framebuffers, capture trace
and all 3,994 generated PCM samples across the tested five-frame continuation.
The PCM check establishes deterministic emulated continuation; it is not a
listening test or a browser audio-latency measurement.

Two additional original bytecode fixtures are embedded in the test itself. Their
NMI code changes SRAM, CHR-RAM, palettes and OAM. MMC1 partial serial state and
MMC3 bank/IRQ state are exercised along with active DMC playback and a partially
shifted controller latch. Rewind restores those states, and subsequent actual
execution reproduces the original continuation.

The review also verifies:

- Recording is off by default and does not change project, undo or source ROM.
- Historical Runtime Capture uses the restored trace and reproduces the old
  completed frame with zero background or composite pixel errors.
- Both real-ROM cases retain 69 states and successfully restore frame 16 from
  frame 76 with a 60-frame backward command. Encoded storage is 16,796,246 bytes
  for Native Room and 19,377,281 bytes for Scout World, within the 32 MiB cap.
- Forward through retained history performs no CPU instructions.
- Resuming from an earlier state discards the former future.
- Unsupported live state rejects restoration without changing physical state.
- Loading a replacement ROM cancels a pending forward operation, preventing
  stale execution from entering the new ROM session.

Reproduce from the candidate source directory:

```sh
FORGE_TEST_REPORT=/absolute/output/emulator-timeline-runtime.json \
node tests/emulator-timeline-runtime.cjs mainline/NES_Forge_1.9.0_Gameplay_Core.html
```

The retained span depends on real encoded snapshot sizes. The service has both
a state-count ceiling and a stored-byte ceiling; neither promises a fixed number
of seconds. Heap overhead and temporary codec buffers are additional memory.
Rewinding does not discover unrecorded history, infer game logic or guarantee
hardware-level emulation accuracy.

## Integrated recovery proof

`re-bridge-runtime.json` records nine end-to-end cases for the independent
Native Room v1 fixture. It verifies native graphics/palettes, all 960 collision
cells, sixteen Pulse 1 notes, the original and rebuilt programs, ordinary
collision editing, changed CHR pixels, changed APU note periods, native project
save/reload and unchanged original ROM bytes.

`original.png`, `rebuilt.png`, `edited-collision.png` and `edited-chr.png` are
actual emulator framebuffers generated during this full run. The comparison PNG
is reproduced with `render_comparison.py`; it is not a browser screenshot. The
recovered `.nesforge.json` is a real editable project and the rebuilt `.nes` is
its compiled demonstration ROM. Recovery supports this one engine profile,
adds Forge sideview behavior to the original horizontal-only engine, and does
not claim cycle-exact engine/audio reconstruction or SFX recovery.

All browser, audible-output, device performance, controller and physical-console
acceptance boundaries described above remain open.
