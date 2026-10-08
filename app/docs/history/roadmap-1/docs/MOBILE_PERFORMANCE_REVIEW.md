# Mobile Play presentation review — September 30, 2026

Candidate: **1.9.0 Alpha / mobile-play-2**. This is a bounded reduction in unnecessary presentation work, not a confirmed fix for the owner's phone lag. Physical controller, browser layout, speaker timing and device performance observations remain open.

## Exact inputs

| Artifact | SHA-256 |
| --- | --- |
| Prior mobile-play-1 | `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12` |
| New mobile-play-2 | `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62` |

The prior mobile application is retained in `baseline/NES_Forge_1.9.0_Mobile_Play_1_Reference.html`. Its 702/702 result is historical. The new full clean-extraction result is recorded in `test-results/candidate/Summary.json`; only that file certifies these new application bytes.

## What changed

- While expanded Play hides the editor, defer the original sidebar's DOM redraw. Restore the latest sidebar state once when leaving Play, including tab, dialog and fullscreen exit paths.
- Fit the canvas on ResizeObserver and existing resize/view events. Keep the timer fallback when ResizeObserver is unavailable, and skip identical CSS dimension writes.
- Identify the new application as mobile-play-2.

Only `src/services/emulator-play-ui.js` and `src/services/release-info.js` changed among production source files. Input safety polling, original canvas uploads, all legacy source, CPU/PPU/APU execution, frame scheduling, audio buffering, capture, Save As, CHR rendering, project schema and generated-ROM semantics remain intact. Protected-source and whole-ROM tests remain required; their hashes/oracles were not relaxed.

## Reproduced reduction in requested DOM work

Both applications were run through the same portable probe with a mock DOM. The numbers are call counts, not elapsed time, FPS or measured phone improvement.

| Controlled operation | mobile-play-1 | mobile-play-2 |
| --- | ---: | ---: |
| Canvas uploads for 60 expanded render calls | 60 | 60 |
| Palette rebuilds for those calls | 60 | 0 |
| Palette span requests for those calls | 1,920 | 0 |
| DOM lookups for those calls | 1,800 | 540 |
| Screen bounds reads over 5 unchanged Play ticks, with ResizeObserver | 5 | 0 |
| CSS size writes over those ticks | 10 | 0 |

Leaving Play refreshes the deferred sidebar once; repeating Exit adds no work. Input/pointer call counts remain unchanged. The focused presentation suite includes six added cases covering rendering preservation, exit restoration, no pending work, observer-driven resizing, observer-unavailable fallback and paused reentry. Four new assertions fail on the prior mobile candidate and pass on the new candidate; two guard preserved behavior.

Evidence and portable probes are under `docs/performance-evidence/presentation/` and `docs/performance-evidence/timing/`. The prior-candidate regression report is in `docs/performance-evidence/baseline-regressions.json`.

## Timing finding reserved for measured follow-up

Synthetic execution of the unchanged scheduler at 30 Hz callbacks and 11 ms per emulated frame produces 300 frames instead of 600 over ten seconds, with 99 simulated audio underruns. At 30 Hz with 4 ms frames, it produces 600 frames and no underruns. This exposes a conditional interaction between the fixed 10 ms processing slice and discarded frame debt. It does **not** establish that the owner's phone encounters those conditions.

This candidate leaves scheduler/audio policies unchanged. The status line's frame time excludes rendering and audio-scheduling costs, and buffered milliseconds are not speaker latency. Muting does not stop emulated audio work. Preserve these distinctions during testing.

## Quick same-device comparison

1. Use the same phone/browser, ROM, sound output and opening method for both candidates. Note exact model, OS/browser version and whether the symptom is slow gameplay, uneven motion, late response, delayed sound or audio gaps.
2. In each build, run the same short route in ordinary Emulator view, then expanded Play view. Compare portrait/landscape and pause/resume. Record observations before screen recording, since recording can add work.
3. Capture the ordinary view's FPS, frame milliseconds, buffered audio, gap and resync readings before entering and after leaving Play. These are clues, not a precise average for the entire expanded interval.
4. Confirm that Exit restores up-to-date sidebar values; rotation/hiding touch still fits the canvas; controls release after interruptions; project save/build/capture behavior remains normal.

Use `examples/Scout_Audio_Runtime_1.8.nes` when an original supplied ROM with sound is needed, or use the exact ROM that showed the issue. Record which one was used. A silent tutorial ROM cannot establish speaker behavior.

Physical USB/Bluetooth tests and physical NES-console tests remain distinct, unperformed checks. Browser automation, if blocked, must report zero executed checks. This package does not promote the alpha.

## Reproduce the call-count probe

From the extracted source root:

```sh
node docs/performance-evidence/presentation/probe.cjs .
node docs/performance-evidence/presentation/probe.cjs baseline/NES_Forge_1.9.0_Mobile_Play_1_Reference.html .
```

The timing probe accepts the HTML and harness explicitly; it writes its result beside the probe, so run it in a scratch copy if preserving the packaged evidence unchanged:

```sh
node docs/performance-evidence/timing/probe.cjs mainline/NES_Forge_1.9.0_Gameplay_Core.html tests/harness.cjs
```
