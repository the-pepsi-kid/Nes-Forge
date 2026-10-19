# Browser and physical-device acceptance — mobile-play-1

Candidate: **NES Forge 1.9.0 Gameplay Core — Alpha / `mobile-play-1`**. Read the current HTML SHA-256 in `../build-inputs.json` and verify it against the file being tested. Owner acceptance/promotion remains separate from implementation authority.

## Evidence categories

| Evidence | Current record / boundary |
| --- | --- |
| Automated program/ROM gate | `../test-results/candidate/Summary.json`; actual candidate hash and measured cases only |
| Browser automation | `../test-results/browser-mobile/Report.json`; read its actual status, tested browser, simulated inputs and limitations. An absent/blocked/failed report is not a pass |
| Clean-extraction reproduction | `../checkpoints/1.9.0-clean-extraction/Reproduction.json` |
| User-reported mobile demo | September 28 qualitative observation of the prior build; no recorded device/controller matrix and no certification of these new controls |
| Physical iPhone / Android / controllers | **Pending**; no physical-device passes claimed |
| Native pickers / actual speakers | **Pending**; do not infer these from VM or browser automation |
| Independent NES hardware | Unverified; this follow-up introduces no new physical-console acceptance gate |
| Owner acceptance | Pending review of the exact delivered candidate and residual limitations |

The old 1.7 Cloud Browser attempt was rejected by URL security policy before inspection (`../checkpoints/1.7-browser-attempt.json`). That historical result does not describe this candidate. Prior 1.8/1.9 VM and bundled-emulator evidence does not establish actual native/browser/device behavior.

## Record a real test session

For every device trial, record: date/time, tester, candidate HTML hash, delivery URL or local-file opening, device model, OS version, browser/version, orientation, controller make/model/firmware and connection type, action performed, observed result and any screenshot/video reference. Use **Pass**, **Fail**, **Blocked** or **Not tested**. “Unavailable with working fallback” can satisfy fullscreen fallback, but does not establish native fullscreen support. A connector shape or paired-device listing does not prove game input worked.

| Device / delivery | Touch and rotation | Native fullscreen / fallback | Speakers and resume | Wired controller | Bluetooth controller |
| --- | --- | --- | --- | --- | --- |
| iPhone / Safari / hosted build | Pending | Pending | Pending | Pending | Pending |
| Android phone / Chrome / hosted build | Pending | Pending | Pending | Pending | Pending |
| Desktop / supported browser / standalone HTML | Keyboard regression pending | Pending | Pending | Pending | Pending |
| Any intended in-app/embedded browser | Pending, only if offered as a supported path | Pending | Pending | Pending | Pending |

If a controller is not exposed by one browser/device combination, record that limitation and verify that touch/keyboard still work. Do not label an untested combination compatible. On phones that need a wired adapter, include that adapter in the record.

## Mobile play checklist

Every item below starts **Pending** for physical-device acceptance.

| Area | Required observation |
| --- | --- |
| Open and play | Open the delivered build, load a known playable ROM or use Build & Run; enter Play view; Run/Pause and Sound controls work |
| Touch combinations | Hold left/right plus A, plus B, and A+B where the ROM permits; Select/Start work separately; multiple fingers do not cancel unrelated held inputs |
| D-pad motion | Slide between directions and diagonals; move outside the pad; release/cancel each touch; no direction remains stuck |
| Portrait and landscape | Rotate during running and paused play; canvas remains 256:240 without cropping/stretching; D-pad, buttons, Pause, Sound and Exit remain reachable |
| Phone safe areas | Check notches, rounded corners, home indicator and browser bars; no essential control is obscured; expanded fallback fits the visible viewport |
| Fullscreen success | If supported, a deliberate Fullscreen tap expands the complete player, including touch/Pause/Sound/Exit controls; current game state remains intact |
| Fullscreen denied/unavailable | Expanded view still plays; status describes fallback; Exit returns to a usable editor; no false native-fullscreen claim |
| Native exit / Escape | System fullscreen exit returns to editor; desktop Escape cancels mapping, closes Controller settings or exits Play view as appropriate |
| View preservation | Enter/exit expanded/fullscreen repeatedly; same ROM and gameplay state continue; a paused emulator stays paused; editor project/selection remains usable |
| Hide / show touch | Hide touch when using a controller; no stale held touch remains; Show touch restores controls |
| Focus / background | Hold a direction/button, switch apps or tabs, lock/unlock phone and return; no held movement persists; resume is deliberate and requires release-to-neutral |
| Reset / ROM replacement | Hold input, reset or load another ROM; old inputs do not leak into the new/reset ROM; neutral/new presses work after resume |
| Controller detection | OS-connect a controller, press a button, select it in Controller; standard layout works or nonstandard layout requests explicit mapping |
| One controller | Connect a second controller; only the selected device acts; choosing No controller disables physical input while keeping touch/keyboard usable |
| Mapping | Map all eight NES actions, including a stick direction; settings pause play and captured buttons do not affect the game; Cancel, Reset and Done behave as documented |
| Mapping scope | Reopen settings and reconnect the same controller in-session; verify retained mapping; reload page and verify preferences reset rather than modifying the project |
| Neutral rearm | Hold a mapped button/stick through pause/settings/background; after Run it stays inactive until released and freshly pressed |
| Disconnect / reconnect | Disconnect while holding input, then reconnect; no stuck movement or silent reassignment to another pad; choose device again; touch/keyboard remain alternatives |
| Sound | Hear actual ROM output on the phone; mute/unmute, pause/resume and background behavior are correct; no speaker claim based solely on APU register writes |
| Capture | Capture a runtime scene before/after play-view changes; same completed-frame dimensions/provenance and editable CHR/palettes; no fullscreen-scaled screenshot substituted for capture |
| Keyboard / Frame | Desktop arrows, Z/A, X/S, Shift and Enter retain existing behavior; paused Frame stepping still reads keyboard; UI/dialog controls do not also press NES buttons |
| Build paths | Build & Run and Run Original use the same controls without replacing their distinct byte sources; failed build cannot play stale output |

## Retained native-browser closeout

These prior acceptance items remain **Pending** unless actual matching-candidate evidence is recorded. Focused Mobile Play checks do not silently certify them.

| Acceptance item | Required observation |
| --- | --- |
| Blank startup | Blank viewer; World/Audio/Gameplay disabled; no starter or false identity |
| Recovery banner | Checking, Restore/Dismiss and delayed/invalid reads preserve correct state |
| Save | Correct schema-12 bytes/identity; delayed completion cannot clean a later edit |
| Save As | Native picker/download, gesture context, bytes and cancellation |
| Project/ROM opening | JSON/ZIP, legacy playable and schema-10/11/12 World ROMs; invalid input atomic; partial single-room restoration honestly reported |
| Runtime capture | Completed-frame/provenance and scene-aware CHR/palettes remain editable |
| Audio Studio | Runtime/SFX/import controls usable; correct keyboard focus; MIDI/MusicXML file selection, cancellation, import/error paths |
| Audible generated output | Viewer, single-room and World music/SFX; frame-entry sounds; tracker preview versus generated playback; mute/resume/tab changes |
| Gameplay Core tables | Typed add/edit/remove definitions, instances, parameters, components, states, transitions, conditions/actions, variables and bindings without JSON editing |
| Room-scoped World authoring | Place an Actor in a Room, bind a Room variable, leave/re-enter, observe persistence and reconstructed transient state |

Completing this checklist provides evidence for this exact candidate. It does not itself promote the build or authorize 1.9.1, 1.9.2 or later work.
