# Workstation startup repair

The owner reported that all adopted UI was missing in the delivered combined HTML. This report was correct. Source fidelity did not establish successful initialization.

## Failure and bounded change

The broken app SHA-256 is `cf5825b600fc8f8c028e9df0def70cc1cac483408ad49b8327715b02a4598e08` (local commit `8cc05fa`). `EmulatorPlayUI` moves the original `emuCanvas` into `.emu-play-screen` within `emuPlayPanel`. Later, Punch-Out replay UI called `emuView.insertBefore(panel, emuCanvas)`. The canvas was no longer a direct child of `emuView`, so the DOM threw `NotFoundError`. All adopted UI modules and the application composition following that statement were skipped.

Only `app/src/re/punch-out-replay-ui.js` changes among the 181 application source inputs. It walks the canvas's ancestors to the direct child of `emuView` and inserts the replay controls before that child. It does not move or replace the canvas, change emulator state, or change project/native writers. The five supplied workstation modules remain unchanged. Default-off appearance, Compact/Comfortable, the fallback appearance and all advanced controls remain.

Fixed app SHA-256: `9d448a050dc480b165ef3ec75a7c400786c927754c395814315d1974f8afc5d0` (2,978,533 bytes). The standalone delivery is `NES_Forge_Retro_Workstation_Startup_Fixed.html`; it is identical to the generated `app/mainline/NES_Forge_2.0.0-alpha.11.html` and replaces the previously delivered combined app. Open the fresh fixed file, then use the upper toolbar's **Retro Workstation** toggle. **Resources** and **Connected Workspace** exist independently of whether the skin is enabled. Existing saved Forge projects can be opened as usual.

## Why earlier verification missed it

`app/tests/harness.cjs` previously treated a missing reference child as an append, which is not DOM behavior. The `Workstation_Verification.json` from `punch-out-native-workflows-1` therefore failed to detect the startup abort. It must not be used to claim that controls mounted in the real document. The harness now rejects invalid anchors for nodes it has actually mounted. Historical native codec/replay evidence remains evidence for the scopes and hashes it records; this correction does not retroactively certify those records on another HTML.

`app/tests/workstation-startup-dom.cjs` parses and runs the complete delivered HTML in jsdom 30.1.3, which enforces parent/child constraints and never fabricates missing queried elements. The before check reproduces the exception and absent appearance/Resources/workspace controls. Current checks exercise mounted controls, both densities and original fallback, unchanged starter build/project, resource previews/relationships, all five workspace panels, follow-selection navigation, matching metasprite context, and the replay shortcut with the original canvas owner. New documents cover stored preference restoration and unavailable local-file storage.

`Startup_DOM_Verification.json` records these checks. `Source_Preservation.json` records the exact one-module application change. `gate/Summary.json` records the retained public suites and synthetic tutorial exercise on the fixed app. None is a browser screenshot, layout/mobile/controller/listening/hardware acceptance, or the missing historical full release gate. Canvas drawing and recurring timers are stubbed in the DOM test.

## Reproduction

From the repository or the review kit's `Source` directory:

```bash
python3 app/tools/bundle.py --check
npm install --prefix /tmp/nes-forge-dom-tests --no-save --ignore-scripts jsdom@30.1.3
NODE_PATH=/tmp/nes-forge-dom-tests/node_modules node app/tests/workstation-startup-dom.cjs app/mainline/NES_Forge_2.0.0-alpha.11.html /tmp/workstation-startup.json
python3 reviews/workstation-startup-fix-1/run_checks.py
```

The DOM test accepts a fourth positional argument naming the previous broken HTML to add the before/after reproduction. The kit includes `../Baseline/NES_Forge_Broken_Workstation_Before_Fix.html` when running from `Source`; it can also be extracted from local commit `8cc05fa`. No ROM or private project is required for these checks.

The review kit includes the fixed app, modular source, current startup evidence and offline tutorials. Earlier evidence remains under its original checkpoint and hash. No commercial ROM, private saved source project, emulator snapshot, game frame or Audio payload is included. This correction has no new public Git push.
