# NES Forge 1.9.0 — Gameplay Core — Alpha

Candidate: **`re-bridge-1`**, the September 30 bounded integrated RE example (D048), based on the separately verified `mobile-play-2` candidate. Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html` in a browser. NES Forge remains one standalone HTML editor; no server or installation is required. Implementation authorization does not promote this candidate.

## Try the integrated RE workflow

Open **RE / DISASM → RECOVER EDITABLE PROJECT**, choose `examples/RE_Bridge_Room/Bridge_Room.nes`, and press **Analyze ROM**. Inspect the room, recovered solid-collision overlay, CHR and music summary. Choose **Import as new project** to enter the ordinary editor, or **Download Forge project JSON** for a portable editable project. **Download inspection report** is a separate evidence export and cannot be opened as a project.

The supplied ROM is independently authored homebrew with its own 6502 machine code, room/collision tables and pulse driver. It contains no embedded Forge project JSON. The decoder recognizes this one engine profile and reads native ROM data; this demonstrates format-specific recovery rather than a Forge metadata round trip. Other ROMs reject explicitly instead of receiving invented scenes or collision.

This slice recovers background/sprite CHR, one fixed room, palettes, 960 Empty/Solid collision cells, a player spawn and one 16-row Pulse 1 melody at 12 frames per row. Collision uses ordinary tile properties where consistent and linked metatile quadrant overrides where needed; music becomes ordinary editable Audio Studio tracker data. Import is undoable and retains the original ROM for **Run Original ROM**. Read `docs/RE_BRIDGE.md` for the edit/build/play tutorial and exact limitations.

The original game only moves left/right. A rebuild uses Forge's existing sideview player, adding jump and attack animation states; it does not reproduce the original game engine or ROM bytes. Attack has no damage hitboxes. No SFX is present or recovered in this example. General commercial-ROM recovery, NESmaker project/ASM migration, Lua compatibility, other sound drivers and source reconstruction are not implemented.

## Preserved mobile play

The Emulator tab retains touch D-pad, B/A, Select/Start, expanded Play, native fullscreen where available with expanded-view fallback, keyboard input and one local OS-recognized USB/Bluetooth gamepad with button mapping. Pair/connect controllers in the operating system. Controls apply to the existing emulator, including Build & Run and Run Original. Interruption handling clears held input and requires safe reactivation.

The prior presentation follow-up defers the obscured sidebar while expanded Play is open and refreshes it once on exit; observer/event canvas fitting avoids equal-size writes and retains a timer fallback. These measured operation reductions do not establish that reported mobile audio/video lag is fixed. See `docs/MOBILE_PLAY.md`, `docs/MOBILE_PERFORMANCE_REVIEW.md` and `docs/BROWSER_QA.md`. Physical controllers and current-candidate browser/device acceptance remain pending.

## Gameplay and Audio contracts

Schema 12 retains Actor Definitions/Instances, generation-tagged Runtime Actors, typed components/parameters, canonical deterministic state tables and explicit Room/World variables. Exactly five templates remain: **Sideview Player**, **Ground Patrol Enemy**, **Stationary Contact Hazard**, **Collectible Pickup**, and **Switch + Door**. The executable plan remains limited to 12 actors including the compatibility Player and 64 one-byte persistent values. Reachable destination-World actors, strict component validation, disabled Behavior and boundary-safe overlap corrections remain protected.

The retained Audio pipeline compiles tracker music/instruments/SFX into Pulse 1/2, Triangle and Noise playback. Animation `sound` events start SFX; MIDI and MusicXML import into the same canonical Audio representation. RE recovery uses this existing pipeline without adding another song model or changing the driver. World Runtime retains mapper-0 sideview traversal, solid collision, screen transitions and linked entrances.

Opening a Forge single-room layout-3/GP16 ROM remains partial recovery: Gameplay Core source is not embedded. Native JSON/ZIP is the complete authoring backup. World WG17 reopening retains its checked embedded source. Switch + Door keeps one-way active-state alpha semantics and no physical blocking contract. LiveLink remains inactive.

## Verify and review

With Node.js 20+ and Python 3:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

Use `build-inputs.json` for this HTML identity, `test-results/candidate/Summary.json` for actual hash/totals and all required suite results, and `checkpoints/re-bridge-1-clean-extraction/Reproduction.json` for package reproduction. The 28 retained suites and four new RE/report-import suites must run on the same frozen candidate. Historical `mobile-play-2` passed 708/708; that result does not certify changed bytes. No current total is predicted here.

Browser walkthrough remains pending because the available Playwright Chromium executable is missing. Automated VM and bundled-emulator checks do not establish native picker behavior, visible browser layout, audible speakers, physical controllers or independent NES hardware timing. See `docs/BROWSER_QA.md`.

Read `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `ROADMAP.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `HANDOFF.md` before continuing. Prior active documents are archived at `docs/history/mobile-play-2/`. The comprehensive manual PDFs and Alpha Review Kit remain separate documentation deliverables; this package adds the RE tutorial. The workshop is performed in the existing editor. ASM/Lua migration remains proposed roadmap work, not implemented compatibility. Broader RE, 1.9.1/1.9.2, hosted/wallet and hardware work require separate scope. No GitHub repository or public release was created by this candidate.
