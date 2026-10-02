# Mobile Play & Controller Support — 1.9.0 Alpha

Candidate **`mobile-play-1`** adds controls and an expanded player to the existing Emulator tab. This is the September 28 authorized follow-up (D046), not 1.9.1 Gameplay Expansion or release acceptance. Measured evidence and remaining checks are linked from `../CURRENT_BASELINE.md`.

## Start playing

1. Use **Build & Run** for the current project, **Run Original ROM** for retained original bytes, or **Load ROM** for a ROM file. All use the same emulator.
2. In the Emulator tab, select **▶ Play view** or **Play view** to expand the player. The same canvas, loaded ROM and running/paused state are retained; this does not rebuild or reset the game.
3. Select **Run** if paused. Use the on-screen NES controls or an available keyboard/controller.
4. Select **Fullscreen** for browser fullscreen. If the request is unsupported or denied, expanded play remains available inside the browser viewport. The browser may keep its address/status bars visible.
5. Use **Exit to editor** to leave expanded play. Native fullscreen exit also returns the player to the editor. Returning changes presentation and releases input; it does not reload the ROM.

**Run/Pause** controls emulator execution. NES **Start** is a game input and follows the loaded ROM's behavior. **Sound on/off** controls emulator sound; it does not change authored Audio Runtime settings. **Hide touch / Show touch** changes the on-screen controls. Controls and screen fit portrait/landscape layouts, but this release does not force orientation or require installing an app.

## Touch and keyboard

Touch the D-pad and B/A buttons with separate fingers for movement plus jumping/action. Slide within the D-pad to change direction or hold a diagonal. Select and Start are separate NES buttons. Releasing a touch, cancellation or lost pointer capture releases that input. Opposite horizontal or vertical directions cancel when sources are combined.

| NES input | Keyboard |
| --- | --- |
| A | Z or A |
| B | X or S |
| Select | Either Shift key |
| Start | Enter |
| Up / Down / Left / Right | Arrow keys |

Touch and gamepad input are active while the emulator runs. Keyboard input retains the existing paused **Frame** stepping path. A focused controller dialog or player UI control must not simultaneously send keyboard input to the game. Touch gestures are captured on the controls; ordinary editor scrolling remains available outside them.

## USB-C and Bluetooth controllers

Connect a compatible wired controller or pair a Bluetooth controller through the device's operating-system settings. NES Forge reads controllers that the browser exposes through its Gamepad API; it does not pair Bluetooth devices or open USB devices directly. A USB-C connector alone is not a compatibility guarantee. Browser exposure and controller layout must be checked on the actual device.

Press a controller button to make it visible to the browser. The first visible controller is initially selected when possible. Open **Controller** to choose another listed device or **No controller**. Only one physical controller supplies the one local NES port; this is not multiplayer or automatic player assignment. A disconnected/replaced controller clears the selection rather than silently switching to another device. Reconnect and explicitly choose the controller again.

For a browser-reported **standard** gamepad layout:

| NES input | Default physical control |
| --- | --- |
| A | South face button (browser button 0) |
| B | East face button (browser button 1) |
| Select | Back/Select (button 8) |
| Start | Start/Menu (button 9) |
| Up / Down / Left / Right | D-pad (buttons 12–15) or left stick (axes 0/1) |

Physical button lettering differs between controller brands. Defaults describe positions/browser indices, not a universal printed label. The left-stick dead zone is 0.35. A nonstandard controller starts without assumed bindings and must be mapped.

To remap, open **Controller**, select the device, then select one of the eight NES actions. Release all buttons/sticks first; press the desired button or move one stick axis. Repeat as needed, select **Done**, then **Run** to resume. **Cancel mapping** stops the current capture; **Reset mapping** restores standard defaults or the empty nonstandard mapping. Remapping a direction replaces its default stick supplement for that direction.

Mappings are retained only during the current page session, by reported device identity/layout. Reloading the page resets them. They are not stored in the project, recovery file or generated ROM. Controller settings pause play and release all sources, so configuring a button cannot also move the character.

## Interruption and resume

Input is cleared when pausing, losing focus, backgrounding the page, leaving the Emulator tab, resetting/replacing a ROM, opening controller settings, or entering/exiting expanded play. Controller inputs must return to neutral after resumed running before fresh presses can act. Release keyboard/touch controls and deliberately resume when paused. Do not expect a held stick or button to carry over an interruption.

A controller disconnect clears that controller's contribution; keyboard and touch remain independent alternatives. Switching views preserves the emulator instance and ROM state. A paused game stays paused when entering or leaving Play view. The explicit **Run** action resumes after settings or an interruption that paused execution.

## Limits and verification

This follow-up changes local input and presentation only. It preserves schema 12, five templates, the 12-actor/64-byte profile, generated-ROM behavior and protected CPU/PPU/APU, capture, Save As and CHR implementations. The application still runs as a standalone HTML. Controller/fullscreen availability may differ between local-file opening, hosted pages and embedded browsers; test the intended delivery path.

No generalized InputSource system, second local player, netplay, input recording/replay, orientation lock, PWA/service worker or new gameplay feature is included. Physical iPhone Safari, Android Chrome and actual wired/Bluetooth controller acceptance remains pending. See `BROWSER_QA.md`; browser automation and mocked gamepads cannot stand in for those observations.

The workshop remains instructions performed in normal NES Forge. Printable comprehensive-manual PDFs and the combined final documentation ZIP remain separate unfinished deliverables.
