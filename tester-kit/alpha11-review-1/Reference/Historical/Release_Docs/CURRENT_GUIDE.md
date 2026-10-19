# Current editor guide — 1.9.0

Fresh startup remains a blank viewer scene. New Project remains the undoable blank single-room factory. Neither loads an example.

## Mobile emulator play

The Emulator tab has touch NES controls, expanded Play view, native fullscreen where available, and one OS-connected gamepad with button mapping. The same controls operate the loaded ROM from Build & Run or Run Original; no separate workshop application is introduced. See `MOBILE_PLAY.md` for the exact controls and interruption behavior.

Candidate identity is **1.9.0 Gameplay Core — Alpha / mobile-play-1**. Native fullscreen and controller exposure depend on the browser/device. Expanded view remains the fallback, and actual-device acceptance is tracked separately in `BROWSER_QA.md`.

## Gameplay Core workflow

Open GAMEPLAY CORE from the gameplay panel. Enable it explicitly, then add one of the five starter recipes. Definitions, instances, typed components/parameters, canonical states/transitions, conditions/actions and Room/World variables/bindings appear as typed table records with add/edit/remove controls. Templates are recipes; every created record remains ordinary project data. Core authoring does not require editing project JSON.

Actor Instances may be authored in a Scene, Room or World using the placement controls. Persistence still requires an explicit Room or World variable and binding. Runtime Actor position, velocity, timers, state and slot identity remain transient. A build rejects missing/cross-owner persistent references, malformed operands, invalid component fields, unknown executable operations and canonical operations unsupported by the selected generated profile. The current mapper-0 profile permits 12 executable Actor Instances total—including the Sideview compatibility Player—and 64 one-byte persistent variables. Reachable destination-World actors compile; unreachable instances remain authoring data with diagnostics.

Build & Run compiles supported generic actors into the existing single-room or World generated runtime. The Sideview Player compatibility binding selects the retained Player executor for movement, collision and animation; this is not full generic-runtime Player unification. Open `../examples/Scout_Gameplay_Core_1.9.0.nesforge.json` for an editable example using all five approved templates.

## Project actions

| Action | Behavior |
| --- | --- |
| Recovery banner | Restore/Dismiss retained recovery; pending decisions protect older recovery from autosave |
| New Project | Blank single-room configuration with World, Audio and Gameplay Core off |
| Open Project | Validate before replacement; supported older projects migrate with Gameplay Core disabled |
| Save / Save Project As | Existing guarded browser save and portable schema-12 JSON/ZIP |
| Open Forge ROM | Single-room GP16/layout-3 recovery is partial and does not restore Gameplay Core source; World WG17 recovery restores checked embedded source; original bytes are retained |
| Import ROM | Existing append/capture behavior; World ROMs require Open Forge ROM |

## Retained World and Audio

World start/player selections remain explicit. World Runtime retains whole-screen sideview traversal, solid collision and linked entrances. AUDIO retains canonical tracker/instrument/SFX authoring, generated Pulse 1/2, Triangle and Noise playback, animation sound events, and MIDI/MusicXML import into that same representation.

Current release identity is **1.9.0 — Gameplay Core** and project schema is **12**. The frozen 1.8 editor rejects current projects atomically. World layout 4/WG17 accepts checked embedded schema 10, 11 or 12 source; legacy layout-3 formats remain unchanged when Gameplay Core is unused.

## Capability and recovery matrix

| Capability | Canonical project | Generated mapper-0 profile | Single-room ROM reopen | World ROM reopen |
| --- | --- | --- | --- | --- |
| Gameplay Core records | Full schema-12 JSON/ZIP | Supported executable subset | Not recovered; opens disabled/empty with an explicit partial-recovery notice | Lossless WG17 checked-source recovery |
| Actor capacity | May retain more authored records | 12 executable Actor Instances total, including compatibility Player | Not applicable after partial recovery | Restored from embedded source |
| Persistent values | Explicit Room/World declarations | 64 one-byte in-session values | Not recovered | Restored from embedded source |
| Unsupported operations/fields | Preserved where authoring rules allow | Reject before emission | Not applicable | Restored as authoring data |
| Disabled Behavior | Canonical records retained | Actor may remain placed/rendered; no evaluator work | Not recovered | Restored from embedded source |
| Switch + Door | Canonical linked records | One-way active-state alpha; no physical blocking | Not recovered | Restored as authoring data |

ContactDamage values are authored in Behavior actions. Actor Instance bindings own persistence routing. Any retained component values are consistency-checked mirrors, not a second runtime source. `syncActiveFromPersistent` can deactivate an active actor; reversing the variable does not reactivate it until reconstruction. This limitation does not implement Door collision or a general gate system.

Automated VM, whole-ROM and bundled-emulator evidence is separate from real-browser layout, native picker behavior, audible speaker output and independent hardware acceptance. See `../CURRENT_BASELINE.md`.
