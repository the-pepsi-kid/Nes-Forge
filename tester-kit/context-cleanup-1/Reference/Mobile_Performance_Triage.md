# Mobile performance triage

**2.0.0-alpha.11 / source-intake-1**

Use this guide when gameplay, input or sound feels wrong on a phone or tablet. It records observations for the actual candidate and device; it does not assume a cause or carry forward historical pass/fail results. Send findings with [Feedback_Template.txt](../Feedback_Template.txt).

The September 30 guide is preserved as historical source. Later playback and presentation corrections changed the scheduler, capture work and expanded-view diagnostics. Its old fixed 10 ms scheduling description and instruction to leave Play to read every metric must not be treated as current behavior.

## Describe the symptom

| Symptom | What to record |
| --- | --- |
| Slow gameplay | Whether movement/game time seems slow even without touching controls |
| Uneven motion | Visible stutter, freezes or repeated frames, and whether sound also changes |
| Input delay | The control/combination and delay between press and visible response |
| Sound delay | Delay relative to a visible event; record speaker/wired/Bluetooth output |
| Audio gaps or crackle | Whether intermittent or continuous; note gaps/resync counters |
| Audio/video drift | Whether alignment gets worse over time or changes after pause/resume |
| UI/input fault | Cropped controls, unwanted notes, stuck buttons or keyboard blocking the editor |

Record phone model, OS/browser versions, local file versus hosted/embedded page, app/ROM identity, orientation, power-saving state, sound-output route and when the symptom begins. A device name alone is not a benchmark.

## Read the current Play diagnostics

The compact diagnostic readout is available in expanded Play as well as the ordinary view. Record a start and end reading without resetting between them.

| Reading | Meaning and limitation |
| --- | --- |
| FPS / 60.1 | Approximate completed emulation frames per real second. It is not the display or screen-recorder frame rate. |
| F / frame ms | Current emulated frame and most recent frame-processing time, including capture work. It excludes later canvas and audio-scheduling work. |
| Audio state / ms queued | Browser audio state and scheduled sound ahead of its audio clock. This is not measured speaker/Bluetooth latency. |
| Gaps / resyncs | Queue underruns/resynchronizations since load/reset. Record whether they keep increasing during steady play. |
| Backlog ms | Pending emulation time, including fractional frame phase. A small changing remainder can be normal. |
| Timing discards | Time dropped by bounded overload protection. A steadily rising count indicates the host is not keeping pace. |

The display uses sampled readings. A single fast or slow frame does not characterize a whole session. Sound off changes output gain; CPU-clocked Audio work continues, so mute is not an Audio CPU-cost isolation test.

## Small controlled comparison

Choose one known ROM and the same short repeatable route. A silent tutorial ROM cannot establish speaker continuity. Start each trial from Reset, keep unrelated settings constant, and record observations before enabling screen capture because recording can itself add load. Leave frame history and explicit RE tracing off for the initial baseline, then test them separately if you use them.

| Trial | Compare | What it can clarify |
| --- | --- | --- |
| 1 | Current app, ordinary Emulator versus expanded Play | Whether the symptom follows a presentation mode |
| 2 | Expanded Play versus native Fullscreen, if available | Whether actual fullscreen changes the result; record a fallback separately |
| 3 | Same route, portrait versus landscape | Layout reachability and orientation-related behavior |
| 4 | Same route, idle/keyboard versus repeated touch combinations | Whether active touch input changes the symptom |
| 5 | Same route/output, sound on versus muted | Audible symptom and visible behavior; mute does not remove emulated Audio cost |
| 6 | Touch versus one physical controller, if available | Input route on the same device/ROM/view; record wired and Bluetooth separately |
| 7 | History/tracing off versus the exact optional feature you use | Whether that additional recording work changes behavior |

If comparing to an earlier application, record both exact versions/hashes and use one unchanged ROM, route, output and loading method. An old kit's generated ROM or automatic test count is not a same-device baseline by itself.

Run a short steady interval and a longer repeat if heat or time changes the symptom. Do not change buffering, browser flags, runtime code or multiple settings to make the result disappear before recording the original case.

## Check interruption and recovery

- Pause/resume, switch apps and return, then confirm sound/input resume appropriately.
- Release held controls during interruption; confirm no old held action persists unexpectedly.
- Rotate, enter/exit expanded Play and try native fullscreen or its fallback.
- Disconnect/reconnect a selected physical controller if that route is being tested.
- Return to the editor and confirm fields, Save As and other tabs remain usable.

Record each route actually tried. A working expanded fallback is useful, but it does not mean native fullscreen succeeded. A successful keyboard test does not certify touch or controller behavior.

## Observation form

Copy once per trial or use [Feedback_Template.txt](../Feedback_Template.txt).

- Tester/date:
- Application version / SHA-256 if available:
- Device model / OS / browser and version:
- Standalone browser or embedded view:
- Local file or hosted URL:
- ROM filename / SHA-256 if known:
- Repeatable scene/route:
- View: ordinary / expanded Play / native Fullscreen / fallback:
- Orientation / display refresh setting if known:
- Input: idle / touch / keyboard / physical controller:
- Controller model / wired or Bluetooth / adapter:
- Sound output: speaker / wired / Bluetooth:
- Sound on or muted:
- History/tracing settings:
- Duration / already warm? / power-saving state:
- Exact actions and expected behavior:
- Observed symptom and when it starts:
- Start readings: FPS / frame ms / audio state / queued ms / gaps / resyncs / backlog / timing discards:
- End readings: FPS / frame ms / audio state / queued ms / gaps / resyncs / backlog / timing discards:
- Screenshot/recording/trace, if available:
- Result: Pass / Fail / Blocked / Not tested:
- Retest notes:

## Interpreting a finding

Treat the readings as clues. High queued audio is not proof of device latency; a rising discard counter is not proof of a particular rendering or input bug. Frame history, RE tracing, browser scheduling, presentation work, emulation and device sound output can contribute differently.

A useful report identifies one repeatable comparison. A later fix should be verified on that same case plus affected save/build/input behavior. Browser automation or source-level checks cannot certify speakers, physical controllers or physical NES timing.

Technical background is preserved in [Mobile playback](Current_Release_Docs/MOBILE_PLAYBACK.html). Its original feature-candidate heading and measured development probes are historical context for inherited behavior, not measured performance of your current phone session. For the rest of the test flow, return to [Reviewer Checklist](Reviewer_Checklist.html).
