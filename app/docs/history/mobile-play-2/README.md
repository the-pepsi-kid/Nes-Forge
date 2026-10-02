# NES Forge 1.9.0 — Gameplay Core — Alpha

Candidate: **`mobile-play-2`**, the September 30 bounded mobile presentation stabilization follow-up (D047), retaining the September 28 Mobile Play & Controller Support contract (D046). Implementation authorization does not promote the build; physical-device and owner acceptance remain pending.

Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html` in a browser. NES Forge remains one standalone HTML editor; no server or installation is required.

## Mobile play and controllers

The Emulator tab adds touch D-pad, B/A, Select/Start controls, an expanded Play view, native fullscreen where available with a usable expanded-view fallback, and one local OS-recognized USB/Bluetooth gamepad with button mapping. Connect or pair controllers in the device operating system; NES Forge does not perform Bluetooth or USB pairing. Keyboard controls remain available.

Use the same player for Build & Run and Run Original. Play-view changes preserve the loaded ROM and its current state. Interruption handling clears held inputs and requires safe reactivation. See `docs/MOBILE_PLAY.md` for controls, mapping and current limits, and `docs/BROWSER_QA.md` for actual-device checks. Controller exposure and native fullscreen depend on the browser/device; no universal compatibility claim is made.

## Current stabilization

This follow-up defers the obscured emulator sidebar while expanded Play is open and refreshes it once on exit. Canvas sizing uses resize events and ResizeObserver, caches identical CSS sizes, and retains periodic fitting when ResizeObserver is unavailable. The original canvas upload, register display, input adapter, emulator/audio core, capture, Save As and CHR source remain intact.

The identical mock-DOM probe reduced 60 expanded-frame palette rebuilds to zero while retaining 60 canvas uploads; five stable UI ticks reduced screen bounds reads from five to zero with ResizeObserver. These are operation counts, not a measured phone speedup or a claim that reported audio/video lag is fixed. See `docs/MOBILE_PERFORMANCE_REVIEW.md` and the actual-device checklist.

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

`CURRENT_BASELINE.md` points to this candidate's identity in `build-inputs.json`, required results in `test-results/candidate/Summary.json`, browser evidence in `test-results/browser-mobile/Report.json`, and clean-extraction record in `checkpoints/1.9.0-clean-extraction/Reproduction.json`. Historical 658/658 results belong only to the corrected reference; 702/702 across 28 suites belongs only to `mobile-play-1`. Read this candidate’s report for its measured total. Automated VM and bundled-emulator checks do not establish real-browser layout/native picker acceptance, audible speaker output or independent NES hardware timing.

Read `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `ROADMAP.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `HANDOFF.md` before continuing. This application package is limited to the 1.9.0 Alpha `mobile-play-2` candidate; the separately authorized RE intake does not change these bytes. The expanded manual PDFs and revised Alpha Review Kit were completed September 30. The workshop is a tutorial performed inside the existing editor; this source package is not a replacement for that separate documentation kit. **Do not begin 1.9.1 or 1.9.2 without explicit authorization.**


The owner subsequently directed RE to start now. A separate bounded, initially read-only ROM intake/inspection track runs alongside mobile closeout, beginning with evidence-backed assets and addresses before audio-driver decoding; it does not wait for 1.9.1–1.9.3. The roadmap still requires **Audio completion** and bounded **RE acceptance** before **3.x hosted worlds and wallet items**; **4.x** is the eventual tech deck. Community accessibility means retaining an approachable standalone workflow and clear documentation; it is an ongoing design goal, not a blanket accessibility certification. A private GitHub repository is recommended after stabilization and before substantive RE development for durable source review and handoffs; it does not block read-only intake and none has been created by this candidate. Roadmap planning does not authorize later implementation.
