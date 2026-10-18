# Alpha.11 reviewer checklist

**2.0.0-alpha.11 / source-intake-1 · schema 12**

Begin with [Tutorial](../Tutorial.html), using this kit's `NES_Forge.html`. Mark each applicable item **Pass, Fail, Blocked or Not tested**, with the device/browser and exact steps. An empty checkbox is not a pass. Record confusing instructions even if you find a workaround.

Use [Feedback_Template.txt](../Feedback_Template.txt) for findings. The [full manual](../Manual.html) restores the detailed workshop, while [Alpha.11 usage updates](Alpha11_Updates.html) identifies changes to the historical manual. The old 1.9.0 success totals and September touch observations are not current results for your session.

## Pass 1 — create, build, save and reopen

Save your current work before starting a new tutorial project.

- [ ] I can find the starting controls and distinguish authoring, building and playing.
- [ ] I can follow tutorial steps 1–9 using visible controls without manually editing code or project JSON.
- [ ] My graphics, floor, spawn and selected Player appear in the built game.
- [ ] I can walk and jump, collide with the intended surfaces, and identify unexpected behavior.
- [ ] **Build & Run** compiles my current edited project. **Run Original** plays preserved cartridge bytes and does not apply those edits.
- [ ] A visible edit appears after rebuilding; a failed build does not appear to succeed by silently playing an old result.
- [ ] I can download a native project with **Save Project As**, find the file, reopen it and continue editing.
- [ ] The reopened project's World references, Player bindings, collision and runtime settings remain correct.
- [ ] I can rebuild the reopened project and get the intended game.
- [ ] I understand that a playable ROM does not replace the complete native JSON/ZIP backup.
- [ ] A cancelled save is not reported as a completed saved file.
- [ ] Build errors identify an actionable problem; I saved the exact error text.

## Pass 2 — play and return to editing

Use a ROM with known behavior; do not infer an input works when the ROM does not use it.

- [ ] Run/Pause, Sound, expanded Play view and Exit to editor are discoverable.
- [ ] Direction plus A/B works; releasing one finger leaves the other held input active.
- [ ] D-pad sliding, diagonal input, Select and Start work where the ROM uses them.
- [ ] Releasing inputs, dragging away, interruption and rotation leave no stuck button.
- [ ] Portrait/landscape keep the game, touch controls and Exit reachable.
- [ ] Native fullscreen works, or the expanded-view fallback is usable. I recorded which occurred.
- [ ] Entering/leaving Play keeps the same ROM/state. A paused game stays paused.
- [ ] Switching tabs/apps, opening settings, pausing, resetting or replacing a ROM does not carry stale held inputs into resumed play.
- [ ] Text fields, dialogs and editor keyboard shortcuts do not also drive the game.
- [ ] Sound is actually audible on a ROM with sound; mute/unmute and pause/resume behave correctly.
- [ ] Any slow motion, uneven motion, input delay, crackle or audio/video drift is described separately.
- [ ] I can see the current Play diagnostic readings and record them when a performance issue occurs.

Use [Mobile Performance Triage](Mobile_Performance_Triage.html) for a small comparison plan. Queued audio milliseconds are not measured speaker latency. Muting does not disable emulated Audio processing.

## Pass 3 — Audio authoring and interchange

Use a saved project copy. Preview, compiled playback and exported score behavior are separate checks.

- [ ] With an instrument selected, piano-key entry updates the intended tracker cell.
- [ ] On a phone, tapping a note cell opens the keyboard where supported; committed input goes into the selected cell. Z = C3, X = D3, Q = C4, 2 = C#4.
- [ ] Done/Enter completes keyboard composition. Moving cells, leaving AUDIO or losing focus does not insert a deferred note into another cell.
- [ ] Scrolling reaches other channels/rows without unwanted notes or repeated snap-back.
- [ ] Touch/pen envelope painting updates the selected instrument; Undo restores the stroke. Scrolling outside the envelope still works.
- [ ] Tracker preview plays the authored score as expected.
- [ ] After enabling **Compile Audio Runtime** and rebuilding, the ROM plays the intended music/SFX.
- [ ] **Export Score Data → Export MIDI / Export MusicXML** gives a conversion warning and produces a usable file for supported content.
- [ ] Export leaves the native project unchanged. I keep the native project for instruments, SFX and bindings.
- [ ] In an independent MIDI/notation tool, I check pitch, timing and channel separation while expecting replacement instrument timbres.
- [ ] Reimport into a copy behaves as the conversion warning describes; Save, reopen, build and listen still work.

See [Audio interchange](Current_Release_Docs/AUDIO_INTERCHANGE.html) for the declared score profile. An unsupported conversion refusal is different from a crash or silent loss.

## Pass 4 — physical controllers, when available

Connect the controller through the device's settings, press a button and select it in Forge's **Controller** panel. Record the actual device/OS/browser, controller model and wired/Bluetooth route.

- [ ] All eight NES actions work through the standard layout or explicit mapping.
- [ ] Controller settings pause play; captured mapping input does not affect the game.
- [ ] Done leaves playback paused; after releasing controls, Run and a fresh press resume cleanly.
- [ ] Disconnect while holding an input: the input clears and touch remains available.
- [ ] Reconnect and explicitly select the controller: no unexpected assignment or stuck input.
- [ ] A second connected controller does not control the game unless selected.
- [ ] No controller disables physical input without disabling touch/keyboard.
- [ ] Mapping retention matches the session-only behavior; I do not assume it is saved in the project or across reloads.
- [ ] Wired and Bluetooth are recorded separately if both were tested.

Mark unavailable hardware **Not tested**. One successful controller/browser combination does not establish every combination.

## Optional pass 5 — source workspace and intake

This is an advanced workflow; the first-project tutorial does not require assembly.

- [ ] **CODE → Open source workspace → Open multi-file example** loads the source files.
- [ ] **Build source ROM** produces the supported `forge-6502-v1` NROM build. I download and explicitly load it in EMULATOR when testing it.
- [ ] I know the built-in source example deliberately has no graphics; its expected CPU behavior is described in the source-workspace guide.
- [ ] Source building does not replace my authored project or automatically start the emulator.
- [ ] **Save source workspace** produces `.nesforge-source.json`; reopening restores current/original files and supported settings.
- [ ] Exported source ZIP contains the workspace JSON and file trees. I extract it and open the workspace JSON to restore; I do not expect direct ZIP import.
- [ ] Selecting the actual dialect then **Analyze source** reports inventory/dependencies/unsupported constructs without changing source.
- [ ] **Export intake report JSON** saves diagnostic evidence. An incomplete report is identified as incomplete.
- [ ] Editing source/settings invalidates stale results. A saved report is not presented as proof of successful build or migration.
- [ ] After reopening a source workspace, I select dialect/engine declarations again as required.

Read [Source workspace](Current_Release_Docs/SOURCE_WORKSPACE.html) and [Source intake](Current_Release_Docs/SOURCE_INTAKE.html). Ordinary project JSON does not back up this isolated source workspace.

## Optional pass 6 — variations and supported recovery

Use backups and the exact supported inputs described by the relevant guide.

- [ ] Seeded mashup/movement preview leaves the project unchanged until explicit Apply; Apply is undoable.
- [ ] Recipes are kept with exact base/donor projects and replay only when those inputs match.
- [ ] Preview/apply/build results are checked in play; technical validity is not assumed to prove level solvability or artistic/audio quality.
- [ ] Recovery methods show the declared supported subset, limitations and refusals before importing.
- [ ] A supported import appends the promised editable content and can be undone/redone.
- [ ] Save/reopen preserves the imported editable content and its evidence; later edits are not described as authentic original-ROM behavior.
- [ ] Project backup, conversion evidence and native ROM-copy export are recognized as separate file types.

## Separate ROM verification

An independent emulator and physical NES hardware are separate test environments. Record ROM identity, tool/hardware version, exact route and result. A physical gamepad attached to a browser is not a physical NES test. A browser-only symptom is not automatically a generated-ROM defect.

## Record the result

Use [Feedback_Template.txt](../Feedback_Template.txt), including tutorial/control name, project/ROM, app identity, device/browser, input route, steps, expected/actual result, repeatability and impact. Distinguish an existing feature failure, unclear documentation and a future feature request. A screenshot or saved project that reproduces the issue helps resolve it.
