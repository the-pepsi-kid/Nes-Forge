# Preserved Roadmap Workbench workflows in alpha.7

For the new native Audio investigation workflow, first read `NATIVE_AUDIO_INVESTIGATION.md`. The following workflows were introduced in alpha.6 and remain available.

Use the application in `mainline/NES_Forge_2.0.0-alpha.7.html`. Preserve a portable project backup before reviewing. Each workflow below identifies a visible control, expected result and its boundary. This guide supplements the manual; it does not claim that the full manual or PDF editions have been updated.

## 1. Audio interchange and built-in workshop

Open **AUDIO → Audio workshop examples**. Choose Four-note melody or Four NES channels and click **Add example to this project**. Confirm the music-order replacement. Existing patterns and SFX remain. Play, edit a note, Undo/Redo, and Save Project As/reopen. Runtime settings remain as you set them.

Use **Export MIDI** or **Export MusicXML** near the score imports. Read the conversion warnings and complete the ordinary Save As flow. Import the result into a project copy and compare channels, row timing, cuts, volume and silence. Importing a short score into larger existing patterns can add silent padding, which is reported; it must not extend the final note. Instrument envelopes, pulse duty, SFX definitions/bindings and gameplay are not complete backups in these score files. Project JSON remains the complete authoring backup.

For a compiled-ROM test, use the included Pulse_Triangle project or a project with valid SFX bindings. Enable **Compile Audio Runtime** and build. If an existing animation references a missing SFX, define that SFX or deliberately remove its sound event; the workshop does not silently change animation bindings. Listen to preview and rebuilt ROM in an independent emulator. Test on the reported phone separately from desktop.

Expected: editable notes survive project persistence; exported supported score timing/channels survive reimport; cancelled export changes nothing. See AUDIO_INTERCHANGE.md for precise omissions and refusals.

## 2. Native graphics recovery

Open **RE / DISASM → General ROM Analysis** and select a ROM with CHR ROM. Expand **Raw CHR patterns**, select the tile page, then **Preview native tile import → Import as new tile sheet**. Open CHR, edit a tile, Save Project As/reopen, and return to **Download active sheet CHR**. Export recovery evidence as well.

Expected: the new sheet has source SHA-256, physical bank/ranges and stable IDs; old scenes remain; Undo removes it and Redo restores it. The sheet is excluded from game builds by default. The grayscale palette and sheet layout are generated authoring aids. Source palettes, map layout, collision, audio and gameplay are unknown. CHR RAM/compressed graphics need another method.

## 3. Checkpoints, input scripts and reversible RAM

Load a supported ROM in EMULATOR, pause, then open the RE runtime **Checkpoints and reversible experiments** panel. Save a named checkpoint. Run a short input script, restore, and repeat. The same checkpoint and inputs should produce the same machine outcome. Cancel a longer script; it stops paused, preserving already executed frames.

For a RAM experiment, use a RAM address whose meaning you have investigated. Apply a byte change, observe, then **Restore experiment**. Restore rewinds the complete machine, not just the edited byte. **Keep emulator state** leaves the current state only in this emulator session. I/O, ROM and mapper-register writes are refused. Reset/ROM replacement clears session checkpoints. No address is automatically labelled health, stage or enemy state.

## 4. Canonical Behavior graph

Open the existing Gameplay Core controls and expand **BEHAVIOR GRAPH** below template controls. Select a Behavior/state, add a state/transition, edit typed conditions/actions, and use the order controls. Use a diagnostic to navigate to its referenced record. Existing typed tables must show the same data immediately. Undo/Redo and Save Project As/reopen should preserve the graph because it edits the same canonical records. Compile a supported transition and test it in the ROM.

This adds no new runtime operation, Actor template, persistent memory or schema. The current five templates and execution budgets remain the selected profile.

## 5. Multi-file source workspace

Open **CODE → Open source workspace → Open multi-file example → Build source ROM**. Download and load that ROM in EMULATOR. It intentionally has no graphics; its CPU puts decimal 70 in RAM $0000 and loops. Import your own files/folder, select the entry and CHR source, edit, rebuild and export the source workspace. Original imported bytes remain preserved in JSON/ZIP exports. Save this workspace separately before closing the page.

Only the declared Forge-6502 dialect and NROM profile are supported. Includes/incbin resolve inside the workspace. Lua and NESmaker/ca65-specific translation are not implemented. Builds do not replace the active Forge project or automatically combine generated gameplay/Audio Runtime with external code. Editing during an asynchronous replacement import must preserve the edit and reject the stale replacement.

## 6. Separate local hosted draft

Read hosted/README.md. From the extracted application directory run `node hosted/server.cjs --data ./forge-hosted-data --port 8787`, then open its loopback URL in two browser tabs. Follow the two-client pickup, transfer, replay and restart checklist. Stop the server when finished. Its ordinary-item authority is separate from cartridge execution; there is no wallet, public hosting or NES projection claim.

## Acceptance record

For each workflow record application SHA-256, OS/browser/version, exact input file/hash, actions, expected/actual result and screenshot or exported output. Mark not-run checks as not run. Report regression, usability and unsupported-feature findings separately. The packaged full-gate Summary is automated evidence; blocked browser records and earlier alpha.5 owner feedback do not certify alpha.7 rendering, listening or hardware behavior.
