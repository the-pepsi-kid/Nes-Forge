# Mobile playback: reported issue and bounded investigation

Updated September 30, 2026 · NES Forge 1.9.0 Alpha · mobile-play-1

## Current observation

The owner reports that the mobile touch controls work and that the built-in emulator has some audio and video lag on mobile. This is useful first-hand evidence, but the device, browser, ROM, delivery method and exact symptom have not yet been recorded. Physical USB/Bluetooth controllers remain untested. No performance fix or device-wide compatibility claim is included in this documentation package.

Use **functional alpha, ready for guided review** as the current description. The next useful step is to establish a reproducible mobile playback case while reviewers work through the create/build/play tutorial. Keep gameplay expansion deferred until these observations are understood.

“Hardware testing” has two separate meanings here: a physical controller connected to a phone/computer tests browser input; running an exported ROM on a physical NES tests the generated ROM and console compatibility. Neither establishes the other.

## Evidence checked for this note

- The supplied application's SHA-256 matches the existing candidate report: `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`.
- The packaged automated report records **702/702 checks passing across 28 suites**, completed September 28, 2026. Those checks do not measure this phone's frame pacing, speakers or controller.
- The packaged browser-automation report is **blocked** because its browser executable was unavailable; it contains no executed browser checks.
- The legacy editor and emulator source files containing frame scheduling, rendering and audio are byte-identical to the preserved corrected 1.9.0 reference. The Mobile Play additions still introduce input and presentation work around those functions.
- This assessment reads the current source and prior evidence. It does not reproduce, benchmark or diagnose the owner's device.

## First distinguish the symptom

| Observation | Record it as |
| --- | --- |
| The whole game progresses slowly | Slow emulation |
| Movement advances unevenly or visibly jumps | Uneven video/frame pacing |
| A button press is followed by a late response | Input-to-response delay |
| A sound happens noticeably after its visual event | Audio/video offset |
| Sound crackles, cuts out or repeatedly restarts | Audio gaps/dropouts |

More than one may occur. A low frame rate can coexist with audio gaps; a steady audio offset is a different observation from gaps. A short recording helps, but first note what happens without recording so capture overhead does not become the only evidence.

## Small comparison plan

Use one known ROM, the same device/browser and the same loading method. Start each trial from Reset and repeat the same actions. Record a short steady interval and one longer repeat if the symptom changes as the device warms. Keep unrelated settings constant; do not change several variables at once.

| Trial | Comparison | What it helps separate |
| --- | --- | --- |
| 1 | Corrected reference versus Mobile Play candidate; ordinary Emulator view, same ROM, no controller input | Existing emulator/device behavior versus an added regression. The reference has no mobile touch controls, so use an unattended sequence or a shared keyboard setup for this comparison. |
| 2 | Candidate in ordinary Emulator view versus expanded Play view | Presentation/layout cost or a Play-specific interaction. Entering Play view should preserve the current game state. |
| 3 | Expanded Play view versus native Fullscreen, where available | Any change associated with fullscreen/compositing. Record a working fallback separately from true native fullscreen. |
| 4 | Sound on versus Sound off | Whether the audible symptom disappears and whether visible behavior changes. **Sound off mutes the output; it does not turn off emulated audio processing.** This is not a clean test of audio CPU cost. |
| 5 | Candidate idle versus repeated touch direction/action combinations | Whether lag follows active touch events rather than simply running the ROM. |
| 6 | Touch versus one physical controller, when available | Input behavior for the same ROM/device/view. Record wired and Bluetooth trials separately. Do not mark the untested route passed. |

In the ordinary Emulator view, record the existing status line's **fps, frame time, audio buffered milliseconds, resyncs and gaps** at the start and end of the interval. The status line is outside the expanded player; note readings before entering and after leaving Play view, without resetting. A technical reviewer can profile the expanded interval if exact in-view timing is needed. Do not treat an after-exit fps reading as an exact average for the entire Play-view trial.

The frame-time reading covers emulator frame execution, including the new frame input poll. It does not include every canvas/DOM update, browser scheduling delay or audio scheduling operation. The buffered-audio reading is the application's scheduled queue, not a measurement of speaker latency. Treat these as clues rather than a complete responsiveness score.

## Source-grounded hypotheses for technical review

These are candidates to measure, not established causes.

| Area | What the current source does | Why it deserves measurement |
| --- | --- | --- |
| Frame scheduling | `emuLoop` targets about 60.1 emulated frames/s using the browser animation callback. Each callback runs at most two frames and stops additional work once its processing slice reaches 10 ms. Remaining overdue whole-frame time is discarded. | If frames or browser callbacks are slow, the bounded loop protects page responsiveness but can fall behind real time. Measure completed frames and callback delays before altering the policy. |
| CPU/video/audio work | `emuRunFrame` advances CPU execution and scans 262 lines. Visible scanlines render background/sprites; `ForgeAPU.clock` advances the audio model with CPU cycles. | The shared JavaScript thread carries substantial emulation work. The report does not establish whether this dominates on the affected phone. |
| Emulator presentation | `renderEmu` uploads the 256×240 frame and updates register/sidebar text. `updateEmuSidebar` rebuilds 32 palette swatches on every displayed frame, including when the original editor is behind expanded Play view. | Sidebar work may be avoidable at full display cadence. It exists in both the corrected reference and current candidate, so its presence alone does not prove a Mobile Play regression. |
| Audio output | `apuFlush` creates and schedules an audio buffer/source after a completed frame. Initial/recovered scheduling starts 45 ms ahead; late delivery counts a gap and rebuilds the lead. Excess queue/source counts trigger a resync. | An overloaded thread can miss delivery deadlines. The scheduling lead also contributes to delay, but it is not total device output latency. Reducing it without measurements could increase dropouts. |
| New input polling | The adapter polls available gamepads once per emulated frame, checks focus/dialog state and constructs status snapshots. Changed status notifies the player UI. | This adds work even without a selected controller. Profile it before attributing lag to polling or changing its correctness guarantees. |
| Play-view updates | A 200 ms UI timer refreshes status and, while expanded, measures the screen and writes canvas sizing properties. Resize observers also fit the canvas. Touch changes update button highlights. | Compare expanded versus ordinary view and inspect layout/paint time. This is an addition to the current candidate, but its cost is presently unmeasured. |

Source locations: `src/legacy/00-editor.js` (`renderEmuLine`), `src/legacy/01-emulator.js` (`emuLoop`, `emuUpdatePerformance`, `renderEmu`, `updateEmuSidebar`, `ForgeAPU.clock`, `apuFlush`, `emuToggleMute`), `src/services/emulator-input.js` (`poll`, `notify`, frame wrapper), and `src/services/emulator-play-ui.js` (`tick`, `refresh`, `fitCanvas`, `refreshPressed`). These files are included in the source/evidence archive for technical reviewers; tutorial users do not need to edit them.

## Recommended next bounded closeout

1. Record one repeatable mobile case and complete the six applicable comparisons above. Capture a short browser performance trace only for the identified slow case, separating script, layout/paint and audio-delivery symptoms.
2. Start any proposed fix with the measured input/presentation overhead: for example, unnecessary sidebar rebuilding or unchanged layout/status updates. Preserve the emulator model, ROM bytes and input-release rules. A timer tweak or larger audio queue is not accepted solely because it hides one symptom.
3. If measurements point to emulator execution or audio scheduling, propose that narrower change explicitly with timing/compatibility risks and acceptance criteria. Do not silently rewrite the protected core while improving mobile controls.
4. Verify the change on the same affected device and a desktop comparison, then rerun the existing source/ROM regression gates for changed application bytes. Repeat controller/focus/pause checks where the modified path overlaps them.
5. Publish the tested device/controller matrix and remaining limits, then request owner acceptance of the exact candidate. Keep 1.9.1, 1.9.2 and later roadmap work deferred during this closeout.

## Performance observation form

Copy once per comparison run.

- Tester / date:
- App filename / candidate or SHA-256:
- Device model / OS version:
- Browser and version / standalone browser or embedded browser:
- Hosted page or local file / delivery URL if relevant:
- ROM filename / SHA-256 if known / scene or repeatable route:
- View: ordinary Emulator / expanded Play / native Fullscreen / fallback:
- Orientation / refresh-rate setting if known:
- Input: idle / touch / keyboard / physical controller:
- Controller make/model / connection / adapter / firmware if known:
- Audio output: device speaker / wired headset / Bluetooth audio:
- Sound on or muted:
- Test duration / device already warm? / power-saving state if known:
- Exact actions:
- Expected result:
- Observed symptom and when it starts:
- Status line at start and end: fps / frame ms / buffered ms / resyncs / gaps:
- Recording or trace filename, if any:
- Result: Pass / Fail / Blocked / Not tested:
- Retest notes:
