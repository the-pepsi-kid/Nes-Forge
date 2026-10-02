# Manual browser verification — pending

Standalone HTML navigation was blocked. No workaround or manual browser pass is claimed. Automated tests use the complete application with a mock DOM and actual bundled NES emulator.

- Confirm the title says VISUAL WORKSPACE and there is no Workflow popup/button/checklist.
- Inspect New Project, Open Forge ROM, Gameplay and the SCENE gameplay section at desktop/narrow widths. Verify keyboard focus, scrolling and native confirmation.
- Create a blank project, draw BG/sprite pixels, paint the room, mark floor collision, compose poses, create animations/contact boxes and bind/place actors using the ordinary tabs. Build and verify the changes in the running ROM.
- Open the included authored Scout with Open Project; inspect/edit every asset through those same tabs. Check movement, jump landings, attack direction, target recovery and restart.
- Inspect bound character selection/dragging, feet origin, movement-body overlay, missing/transparent art and left-facing poses.
- Save JSON, ZIP and ROM through the actual native Save As/browser download controls. Cancel saves and project/ROM replacement. Undo replacement and verify unrelated browser saves are not overwritten.
- Reopen a Forge playable ROM, edit and rebuild repeatedly without duplicate assets. Try corrupt/foreign ROM input and confirm the workspace stays intact on rejection/cancellation.
- Recheck viewer/custom assembly, runtime capture, CHR colors and IndexedDB save/recovery/reload.
- Run generated ROMs in an independent emulator or NES-compatible setup before claiming broader hardware compatibility.
