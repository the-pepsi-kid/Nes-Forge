# NES Forge 1.9.0 — Gameplay Core — Alpha

Candidate: **`mobile-play-1`**, the September 28 authorized Mobile Play & Controller Support follow-up. Implementation authorization does not promote the build; physical-device and owner acceptance remain pending.

Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html` in a browser. NES Forge remains one standalone HTML editor; no server or installation is required.

## Mobile play and controllers

The Emulator tab adds touch D-pad, B/A, Select/Start controls, an expanded Play view, native fullscreen where available with a usable expanded-view fallback, and one local OS-recognized USB/Bluetooth gamepad with button mapping. Connect or pair controllers in the device operating system; NES Forge does not perform Bluetooth or USB pairing. Keyboard controls remain available.

Use the same player for Build & Run and Run Original. Play-view changes preserve the loaded ROM and its current state. Interruption handling clears held inputs and requires safe reactivation. See `docs/MOBILE_PLAY.md` for controls, mapping and current limits, and `docs/BROWSER_QA.md` for actual-device checks. Controller exposure and native fullscreen depend on the browser/device; no universal compatibility claim is made.

## Gameplay Core

1.9.0 adds the canonical generalized gameplay foundation:

- reusable Actor Definitions and authored Actor Instances;
- ephemeral generation-tagged Runtime Actors;
- typed components and bounded parameters;
- structured state-table behaviors with deterministic priority/authored-order transitions;
- explicit Room/World persistent variables, separate from transient actor memory;
- a non-destructive legacy Player/Target compatibility binding to the retained Player executor;
- complete bounded table authoring and generated single-room/World runtime execution;
- schema 12 with atomic rejection by the frozen 1.8 editor.

The template list is exactly **Sideview Player**, **Ground Patrol Enemy**, **Stationary Contact Hazard**, **Collectible Pickup**, and **Switch + Door**. Templates create ordinary editable canonical records; the runtime does not use a separate template model. Operation operands are typed and validated before emission, and the selected generated profile rejects canonical operations it cannot execute rather than compiling no-ops. The mapper-0 profile supports at most 64 one-byte persistent values.

The corrected candidate also links generic actors from every reachable destination World/Room, enforces the 12-actor executable-plan limit including the compatibility Player, validates component values through the same schema used by the typed UI, makes disabled Behavior components fully inert, and emits boundary-safe unsigned overlap checks. Unreachable actors remain authored with diagnostics.

Open `examples/Scout_Gameplay_Core_1.9.0.nesforge.json` to inspect the editable example. Its matching ROM and build record are supplied. Older World and Audio examples remain separate external projects.

## Preserved systems

The 1.8 Audio pipeline remains intact: NES Forge tracker/instruments/SFX compile to Pulse 1/2, Triangle and Noise runtime playback, and animation `sound` events start SFX. MIDI and MusicXML still import into the same canonical Audio representation. The 1.7 World Runtime retains sideview traversal, solid collision, screen transitions and linked entrances.

Current projects use schema 12. Supported older projects load with Gameplay Core disabled. Legacy layout families and the five pinned ROM outputs remain byte-identical when Gameplay Core is unused. Failed builds cannot publish or run a stale artifact.

Opening a single-room layout-3/GP16 ROM is partial recovery: Gameplay Core source is not embedded, so it reopens disabled/empty while the original bytes remain available to Run Original. Use native JSON/ZIP for complete authoring recovery. World WG17 reopening remains lossless for its checked embedded source. Switch + Door still has one-way active-state alpha semantics and no physical blocking contract.

## Verify

With Node.js 20+ and Python 3:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

`CURRENT_BASELINE.md` points to this candidate's identity in `build-inputs.json`, required results in `test-results/candidate/Summary.json`, browser evidence in `test-results/browser-mobile/Report.json`, and clean-extraction record in `checkpoints/1.9.0-clean-extraction/Reproduction.json`. Historical 658/658 results belong only to the corrected reference. Automated VM and bundled-emulator checks do not establish real-browser layout/native picker acceptance, audible speaker output or independent NES hardware timing.

Read `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `ROADMAP.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `HANDOFF.md` before continuing. Scope ends at the 1.9.0 Alpha `mobile-play-1` candidate. The expanded manual PDF editions and final documentation ZIP remain separate unfinished work. **Do not begin 1.9.1 or 1.9.2 without explicit authorization.**
