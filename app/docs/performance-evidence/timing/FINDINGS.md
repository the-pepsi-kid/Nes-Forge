# Host timing and audio audit

**The reported phone lag remains unmeasured.** These are source findings and synthetic tests of the shipped scheduler and audio queue. The application source was not modified. Controlled frame/render costs and a simulated AudioContext replace those boundaries only within an isolated Node VM.

Reference application SHA-256: `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`.

| Callback cadence / synthetic frame cost | Frames in 10 seconds | Dropped frame debt | Audio underruns |
|---|---:|---:|---:|
| 30 Hz / 4 ms | 600 | 0 | 0 |
| 30 Hz / 11 ms | 300 | 300 | 99 |
| 50 Hz / 11 ms | 500 | 100 | 38 |
| 60, 90, 120 or 144 Hz / 4 ms | 600 each | 0 | 0 |

The 10 ms per-callback work budget discards pending emulation time once the budget is reached. At 30 Hz and 11 ms per frame, this forces half-speed emulation and inadequate audio production even though two frames could fit within 33.3 ms before other costs. **This conditional scheduler limitation is not a reproduction on the user's phone.** Changing the scheduler requires real device evidence and a separate bounded review; this pass does not change it.

Other findings:

- Existing frame-cost HUD excludes audio scheduling and display/sidebar rendering. A synthetic 4 ms frame plus 5 ms render still reports 4 ms.
- Audio deliberately schedules 45 ms ahead. Its queue reading excludes device output latency; muting changes gain while continuing audio computation and buffer scheduling.
- Every displayed frame rebuilds a 32-swatch palette and inspector fields, including during expanded Play view when they are hidden. Cost on the affected phone is unknown.
- Source already anchors emulation to elapsed time, bounds catch-up, clears audio on pause, and pauses when the document is hidden. High refresh rates did not cause doubled game speed in these tests.
- The host scheduler, audio output, and pause blocks are unchanged from the corrected pre-mobile reference. See `timing-baseline-comparison.json`.

Next evidence needed: device/browser, ROM identity, display callback cadence, actual emulation speed, frame/render/audio scheduling costs, queue depth, audio state and gap/resync changes. Compare the same ROM in embedded and expanded Play view.

## Reproduce

Node 20+ and the supplied source tree's existing `tests/harness.cjs` are required. No browser or dependency installation is used. The probe accepts explicit file paths and writes `probe-results.json` next to itself:

```sh
node probe.cjs /path/to/NES_Forge.html /path/to/NES_Forge_1.9.0/tests/harness.cjs
```

Local command used for the original candidate:

```sh
node /workspace/scratch/eed3f92a7165/mobile-stabilization-2026-09-30/timing-audit/probe.cjs /workspace/scratch/eed3f92a7165/mobile-play/NES_Forge_1.9.0_Alpha_Mobile_Play.html /workspace/scratch/eed3f92a7165/mobile-play/NES_Forge_1.9.0/tests/harness.cjs
```

`probe-results.json` records the actual application and harness hashes. `audit.txt` provides detailed source locations and conditional findings. No browser, Bluetooth/USB controller, or physical NES hardware pass is claimed.
