# NES Forge — Adaptive UI audit and Audio pilot scope

Date: October 7, 2026 UTC. Status: source audit completed; implementation proposal only. No executable changes or promotion.

## Current evidence

The owner reports “yeah it worked” after testing direct mobile keyboard entry in the original Audio tracker. Record this as a basic phone keyboard-entry success. The associated earlier device report is Cricket Dream 5G / Chrome; the latest message does not specify OS, browser or keyboard versions. It does not independently close composition, orientation, save/reopen, listening, performance or hardware-controller checks.

Audited baseline: **2.0.0-alpha.4 / mobile-keyboard-1**, schema 12.

| Artifact | SHA-256 |
| --- | --- |
| HTML | `4871312c2fbedc312a89d7400d669b525732e7f9fb2965b87bf74d1d75c00e42` |
| Candidate ZIP | `d8a9370d7171037c6ab77ab46a5d82427fd1698fd270c1bb8c8dce60bd34bbf1` |
| Source-control ZIP | `a8c2819be9be856b5934d1c42824f93d2d394c03ad5c89c0b8b3877309bde74f` |

Git reference: `e6dd5a726df2f1144605b631be44d63874ea5e00`. Packaged verification reports 964/964 checks across 44 suites. Its three browser runners executed zero checks because the required Chromium headless shell was unavailable. Those are retained release results, not tests rerun for this documentation audit. Alpha.3 forms remain withdrawn; alpha.4 starts from alpha.2.

This audit inspected the hash-verified candidate's shell, Audio adapter, legacy interaction bindings, editor rendering, project store, emulator input and Play view. It is a targeted architectural audit, not a new comprehensive runtime acceptance review. Source observations below do not establish behavior on an untested browser.

## Findings and priorities

| Priority | Evidence in current source | Implication and proposed action |
| --- | --- | --- |
| First | `src/legacy/02-interaction-bootstrap.js`, envelope bindings for `envVol` and `envArp`, use mouse down/move/up. The canvases are 240 × 48. | Continuous touch/pen painting has no explicit equivalent in these bindings. Compatibility mouse events may permit taps; phone failure is not established. Add pointer strokes to the existing editor, with cancellation and a single undo boundary. |
| First | `src/legacy/00-editor.js`, `renderAudio`, creates an intrinsic 650-pixel grid with five 130-pixel columns and 18-pixel rows. `src/shell-prefix.html` stacks editor panels at 850 pixels. | Layout adapts broadly, but the tracker is still dense. Preserve a usable coordinate system and explicit horizontal navigation; keep the selected cell visible when the keyboard or orientation changes. Verify actual clipping on devices before choosing dimensions. |
| First | `src/audio/audio-ui.js` already focuses a native text input after a stationary touch/pen tap and routes committed text through `aud_enterNote`. It cancels scrolling/multitouch gestures and releases focus on outside interaction, blur and tab changes. | Keep this successful direct-editing behavior. Add layout adaptation around it; do not restore the rejected forms or introduce Apply/automatic advancement. |
| Next | Audio controls include native tempo, speed, row count, instrument name/duty and SFX fields. Pattern selection uses `aud_choosePattern` and a browser prompt. | Native controls already work through normal browser input. Review the complete workflow for reachability and focus; a prompt is a workflow interruption, not proof of mobile failure. |
| Next | `aud_updateSidebar` rebuilds instrument/order lists; active name/duty values receive special handling. | Verify selection and focus survive updates. A general focus-loss defect has not been reproduced. Avoid replacing active editors during routine refreshes in the pilot. |
| Reuse | `src/services/emulator-play-ui.js` handles touch buttons, safe areas, dynamic viewport height and window/visual-viewport resizing. `emulator-input.js` provides keyboard/touch/gamepad routing, blockers and neutral release. | Reuse these interaction and layout patterns. Keep editor gestures and emulator buttons in separate contexts. Physical USB-C/Bluetooth acceptance remains pending. |
| Later | Pixel-editor bindings use mouse strokes; Scene/Sprite interaction includes right-click commands. | These need their own touch/pen review after Audio. Offer visible access to essential contextual actions before claiming full touch authoring. Do not fold every editor into the first change. |

The source already contains focus guards and input isolation. The problem is uneven coverage across workflows, not an absence of those mechanisms. Emulator controller profiles currently use an in-memory map; this is not evidence of persistent, exportable workspace presets. Existing view controls and project autosave must be accounted for before introducing new preferences.

## Audio workflow to validate

| Step | Existing route | Review evidence required |
| --- | --- | --- |
| Author/import | Audio patterns/instruments, MIDI and MusicXML file pickers | Supported fixture imports and direct authoring preserve canonical notes and instruments. |
| Edit | Tracker, native numeric/text fields, envelope canvases, order and named SFX | Keyboard, touch/pen and mouse reach the same edits; focus and undo remain stable. |
| Preview | Existing Audio play/stop and note preview | Audible output after activation; preview behavior and documented limitations recorded. |
| Build/play | Compile Audio Runtime in Audio; project Build .NES ROM / Build & Run | Compiled music/SFX behave as specified; listen in Forge and an independent emulator. |
| Persist | Existing project save/export and reopen | Canonical notes, envelopes, orders and SFX survive reopen. Desktop reopening agrees with the phone edits. |

Preview, canonical data, emitted ROM behavior and RE observations are distinct evidence paths. A phone keyboard success does not validate their audio output or timing. DPCM remains labeled unimplemented; this UI pilot does not add channels, effects, import formats or audio drivers.

## Bounded implementation proposal

First candidate: **Audio adaptive editing**, within phase 1 reliability/workflow completion.

1. Preserve the native keyboard adapter and desktop piano keys. Adapt the surrounding tracker/panels to available space, including keyboard opening and orientation changes. Keep selection visible without silently editing or scrolling to another cell.
2. Add touch/pen envelope strokes through the existing canonical instrument data, with pointer cancellation, release on blur/tab switch and one undo snapshot per stroke. Scrolling outside an active stroke remains available.
3. Increase the reachability of Audio controls in compact layouts and give clear access to order/pattern actions. Reuse native fields. Keep direct editing in the normal workspace.
4. Verify isolated input contexts: editing fields never sends emulator buttons or global shortcuts; Play input never edits Audio. Preserve ordinary desktop shortcuts, save, undo and capture.

The proposal is not production implementation authorization. Reproduce layout problems and finalize the narrow candidate boundary before modifying source. No engine, schema, ROM format or universal widget rewrite is part of this proposal.

## Device and customization approach

Keep one standalone application and canonical project model. Use viewport space and available input capabilities to choose sensible defaults, then allow an explicit user override. Avoid device-brand detection and a forced startup wizard. A phone with a keyboard or a deck with a mouse can change capabilities while the application is open.

Start with compact and spacious workspace layouts, adjustable panel visibility and input preferences. Keep these preferences separate from game data; define persistence/reset/export before calling them portable profiles. Build on existing view controls. Arbitrary panel/plugin systems and server/client bootstrap configuration are later work.

Proposed review matrix: owner Android/Chrome device; desktop Chromium and Firefox; macOS Safari and iOS Safari if those platforms are to be claimed supported; narrow and short landscape viewports with mixed inputs. Simulated deck dimensions establish layout evidence, not physical deck compatibility. USB/Bluetooth controller tests stay separate from editor input tests.

## Exit checks and sequencing

- Execute the retained automated candidate gate plus meaningful regressions for newly changed gesture/focus behavior. Do not claim source inspection as a browser pass.
- Complete phone tracker entry, envelope strokes, cancellation, keyboard opening/closing, orientation, field editing, undo and save/reopen. Confirm no duplicate notes or cross-context input.
- Compare desktop editing before/after. Retain protected Save As, CHR, capture, emulator and legacy compatibility checks.
- Complete the Audio workshop with audible compiled-ROM playback and independent-emulator evidence. Record performance using the same ROM and device; current mobile lag review remains open.
- Update the manual against the reviewed controls once the pilot settles. Printable PDFs still require actual rendering and visual validation before delivery.

Then continue native audio-driver recovery, followed by additional graphics/map recovery. Preserve universal ROM inspection as the goal while documenting which formats can actually recover editable data. Hosted worlds, optional wallets and portable hardware roles remain later phases.

Protected boundaries remain NES / 8-bit / 6502, five templates, schema 12, 12 actors, 64 persistent bytes, Door Option B, and the documented partial single-room recovery / one-way active synchronization limits. This audit supplies no new evidence to remove those limits. No public release, GitHub publication or candidate promotion is claimed.
