# NES Forge alpha reviewer checklist

September 30, 2026 · Gameplay Core 1.9.0 · mobile-play-1

This kit is for guided review of the current functional alpha. Begin with the tutorial in the manual, using the supplied NES Forge HTML. The workshop is a set of instructions followed inside Forge; it is not a separate application. Record where the instructions or interface leave you unsure, even if you eventually find the control.

## What is established, and what is still open

| Area | Current status |
| --- | --- |
| Automated candidate checks | Packaged September 28 report: 702/702 pass across 28 suites for the supplied candidate hash |
| Mobile touch controls | Owner reports they work; device/browser and complete touch test matrix have not yet been recorded |
| Mobile audio/video | Owner reports lag; root cause, severity and affected combinations remain open |
| Physical USB/Bluetooth controllers | Untested; simulated gamepad checks do not certify a real controller |
| Native fullscreen / mobile browser combinations | Acceptance matrix still incomplete |
| Browser automation | Packaged run blocked by missing browser executable; no executed browser checks |
| Generated ROM on an independent emulator / physical NES | Separate verification; do not infer this from built-in emulator or controller tests |
| Owner acceptance / promotion | Pending; the alpha candidate remains under review |

The owner report updates the earlier candidate package's blanket “physical mobile acceptance pending” wording only for the reported touch observation. It does not certify all phones, orientations, interruptions or controller combinations.

## Pass 1 — follow the tutorial

Use a fresh tutorial project and save your current work before replacing it. Mark each item **Pass, Fail, Blocked or Not tested**. Record the tutorial step where you stopped rather than silently working around it.

- [ ] I can find the starting controls and distinguish editing, building and playing.
- [ ] I can follow the tutorial using the visible tools without hand-editing code or project JSON.
- [ ] I can recognize my graphics, room and intended player/gameplay in the built result.
- [ ] Build & Run builds my current project; I understand that Run Original ROM plays the preserved imported ROM instead.
- [ ] I can make a visible edit, build again and observe that edit in the new ROM.
- [ ] I can save/download a native project backup, reopen it and continue editing.
- [ ] I understand that exporting a playable ROM does not replace a complete native JSON/ZIP authoring backup.
- [ ] Error messages tell me what failed; a failed build does not appear to succeed by playing an old result.
- [ ] I can describe any confusing label, missing explanation or unexpected result with its tutorial step.

## Pass 2 — play and return to editing

- [ ] Run/Pause, Sound, Play view and Exit to editor are discoverable and behave as expected.
- [ ] Holding a direction plus A or B works; releasing one finger leaves the other held control active.
- [ ] D-pad sliding, diagonal movement, Select and Start work where the chosen ROM uses them.
- [ ] Letting go, dragging outside the pad, interruption or orientation change leaves no stuck button.
- [ ] Portrait and landscape keep the game, controls and Exit reachable without cropping.
- [ ] Fullscreen works on this combination, or the expanded-view fallback remains usable. I recorded which happened.
- [ ] Entering/leaving Play view preserves the same ROM and current game state; a paused game stays paused.
- [ ] Editor fields, dialogs and keyboard shortcuts remain usable. Gameplay controls do not also edit or activate unrelated interface controls.
- [ ] After switching apps/tabs, opening settings, pausing, resetting or replacing a ROM, old held inputs do not leak into resumed play.
- [ ] Actual sound is audible; mute/unmute and pause/resume behave correctly. Any delay, crackle or slowdown is recorded using the performance form.

The ordinary Emulator status line supplies frame-rate, frame-time and audio-queue clues. See **Mobile_Performance_Triage.md** for the small comparison plan. Sound off is mute, not an audio-processing performance mode.

## Pass 3 — physical controllers, when available

Test the actual controller through the device's connection settings, then press a button and select it in Forge's **Controller** panel. Hardware compatibility is established for the tested combination, not for every device with the same connector.

- [ ] Record device/OS/browser and controller make/model, wired or Bluetooth, and any adapter.
- [ ] All eight NES actions work with the standard layout or explicit mapping.
- [ ] Opening Controller settings pauses play; captured mapping inputs do not affect the game.
- [ ] Done leaves playback paused; after releasing controls, Run and a fresh press resume cleanly.
- [ ] Disconnect while holding a direction/button: the input clears and touch remains available.
- [ ] Reconnect and select the controller again: no unexpected reassignment or stuck input.
- [ ] A second connected controller does not control the game unless selected.
- [ ] Choosing No controller disables physical input without disabling touch/keyboard.
- [ ] Mapping behavior matches the manual: retained in this page session, not saved into the project or promised across reloads.
- [ ] Repeat wired and Bluetooth separately if both are intended supported paths.

## Separate ROM verification

Physical gamepad testing is different from physical NES testing. A reviewer with an independent emulator or a suitable NES setup can test the exported ROM separately. Record the ROM hash, test environment and exact result. Do not call a successful browser session “NES hardware verified.” A browser-only issue does not automatically establish an exported-ROM defect, and the reverse is also true.

## Short feedback form

- Reviewer / date:
- App filename or candidate / hash if known:
- Device / OS / browser and version:
- Local file or hosted page:
- Tutorial chapter/step or named control:
- ROM/project used:
- Input method / controller and connection if applicable:
- Steps to reproduce:
- Expected result:
- Actual result:
- Repeatable every time, sometimes, or once?
- Screenshot/video or saved project attachment:
- Result: Pass / Fail / Blocked / Not tested:
- Impact: blocks completion / disrupts play / confusing but recoverable / cosmetic:

Please distinguish **an existing feature that fails**, **an instruction that is unclear**, and **a desired future feature**. All three are useful, but they lead to different work. The immediate priorities are reliable create/build/save/reopen, playable mobile behavior, controller verification and a tutorial that a first-time reviewer can finish. Gameplay expansion remains a later milestone.
