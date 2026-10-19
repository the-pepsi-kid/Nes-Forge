# Mobile Playback — 2.0.0-alpha.2

Candidate `mobile-playback-1`, project schema 12. This bounded correction follows reported gameplay/audio lag on Cricket Dream 5G with Chrome, while desktop-browser playback was reported satisfactory. The supplied recording did not expose an application hash. Its measured screen updates and near-silent PCM intervals are recording evidence, not an instrumented phone profile.

## Corrections

**Frame scheduling.** The preceding scheduler stopped its callback after a fixed 10 ms slice and discarded remaining whole-frame time. Under slower callbacks, that could turn a recoverable delay into sustained slow emulation and audio gaps. The corrected scheduler retains pending time, including fractional frame phase. It executes up to four complete frames per callback with a callback-dependent budget from one NES frame interval to 40 ms. The 250 ms elapsed safeguard remains; long stalls cap pending work to four whole frames plus the fractional phase and count discarded time explicitly.

The budget is checked between indivisible frames. One expensive frame may exceed that budget; the original 200 ms frame safety guard remains. Genuine overload is still bounded and reported, not hidden behind an inflated FPS claim. CPU/APU/PPU execution and audio queue policy are unchanged. This does not add an unbounded catch-up loop or time-stretch sound.

**Exact capture work.** Native capture still records every visible scanline of the current completed frame. A transient per-frame CHR-ROM lookup reuses unchanged tile records instead of repeatedly allocating their byte arrays and string keys. Lookup resolves physical bank mapping first and checks all 16 current bytes, so patched data or replaced source arrays cannot be served stale. Mutable CHR-RAM retains its original live path. The cache stays outside serialized capture data and history snapshots; old/restored traces acquire it lazily.

No capture is disabled in Play. Capture does not silently advance or replay a frame, and it does not flatten raster changes into the end-of-frame state. Palette, bank, scroll, mirroring, sprite and supported raster behavior remain covered by exact reference comparisons.

**Play diagnostics.** A compact readout uses the existing Play refresh loop, with normal text refresh limited to twice per second and immediate updates for loading/running/paused state changes. It does not start audio or execute emulation. It is also visible in expanded Play, where the editor's original performance line was hidden.

| Readout | Meaning |
| --- | --- |
| FPS / 60.1 | Approximate completed emulation frames per real second; target is the existing NTSC frame rate. Not the display or screen recorder's capture rate. |
| F / frame ms | Current emulated frame and most recently measured frame processing time. This includes capture work but excludes later canvas/audio scheduling work. |
| Audio state / ms queued | Web Audio state and scheduled sound ahead of the browser audio clock. Queued milliseconds are not measured speaker or Bluetooth latency. |
| gaps / resyncs | Audio queue underruns and resynchronizations since ROM reset/load. Compare whether the counters keep rising during steady play. |
| backlog ms | Pending emulation time, including fractional frame phase. A small changing remainder is expected. |
| timing discards | Whole-frame time discarded by bounded overload protection. A steadily rising counter indicates the host is not keeping pace. |

Muting changes output gain; it does not stop CPU-clocked audio work and is not an APU performance-isolation test. History and explicit RE tracing add work when enabled; leave them off for the baseline comparison, then test them separately. Expanded Play already defers hidden palette-sidebar redraws.

## Evidence boundaries

The focused tests compare actual current source with the frozen alpha.1 HTML. Synthetic clocks reproduce the scheduling failure without claiming a phone benchmark. Actual emulated-frame probes compare capture traces, source data and pixels; operation counts measure the targeted allocation reduction. Node VM wall times are environment-specific.

The source-only capture probe measured 30 steady frames: 230,730 to 390 temporary 16-byte tile allocations. Median three-batch VM time changed from 2,047 ms to 1,329 ms. Full frame/capture content matched the reference, excluding new scene IDs generated on separate captures. These are controlled measurements; they do not promise the same phone speedup.

Mandatory evidence:

- `../test-results/candidate/Summary.json`: all 921 predecessor cases plus `mobile-playback200`, across 43 suites; exact unchanged HTML and test/source/doc provenance.
- `../test-results/candidate/mobile-playback200.json`: measured independent scheduler, raster/capture, history and diagnostic results.
- `../checkpoints/mobile-playback-1-clean-extraction/Reproduction.json`: clean staging identity, verified payloads, exact summary hash and result.
- `../test-results/browser-mobile/Report.json`, `browser-re-analysis/Report.json`, and `browser-re-runtime/Report.json`: fresh actual launch/check outcomes. A blocked launch means zero browser checks.
- `../checkpoints/mobile-playback-focused/`: paired reference/current regressions and isolated implementation probes; these supplement the full gate.

Frozen predecessor: `../baseline/NES_Forge_2.0.0-alpha.1_Audio_Correction.html`, SHA-256 `4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0`.

## Review and remaining limits

Use `MOBILE_PLAYBACK_CHECKLIST.txt`. Compare exactly the same ROM, route, sound output and optional settings in old and new HTML. Record without screen capture first because capture itself may add load. Phone/OS/Chrome versions, visible FPS/gaps/discards and observed sound/input behavior are needed to establish the practical improvement. The device name alone is not a benchmark.

The existing audio compiler corrections remain in force. Native Audio/Gameplay data and compiler code, five templates, 12-actor and 64-persistent-byte limits, Door Option B, one-way synchronization, partial single-room recovery, Save As, CHR, undo and project schema remain protected. Release metadata can change generated project/ROM identity; compare one unchanged ROM to isolate emulator playback.

The current review does not establish speaker continuity, physical controller support, physical-console timing, arbitrary-ROM compatibility or a new audio/RE driver. Owner acceptance and release promotion are pending. After the bounded mobile review, continue the supported Audio workflow/listening workshop before extending native audio recovery.
