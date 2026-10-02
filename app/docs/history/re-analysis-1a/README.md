# NES Forge 1.9.0 — Gameplay Core — Alpha

Candidate: **`re-analysis-1a`**, the October 1 file-picker repair for the bounded general binary-analysis follow-up (D050), retaining emulator-history navigation (D049) and the native-ROM recovery example (D048). Open `mainline/NES_Forge_1.9.0_Gameplay_Core.html` in a browser. NES Forge remains one standalone HTML editor; no server or installation is required. Implementation authorization does not promote this candidate.

The previous candidate hid the general-analysis file input under the application's global `input[type=file]{display:none}` rule. This repair gives that input its own visible layout. The recovery picker already had that override, which explains why it appeared to be the only loading option. VM tests bypassed visible interaction and did not catch the CSS defect; browser acceptance is still recorded separately.

This repair does **not** complete the requested RE workflow. Stage/health/enemy controls and general decoding of native scenes, collisions and audio remain absent. Loading a ROM in EMULATOR does not start general analysis; visual capture does not recover those native structures. The next end-to-end acceptance must use the owner's exact ROM and a specific gameplay event, with decoded content and unknowns shown explicitly.

Manual checks with exact actions and expected results: [RE_OWNER_CHECKLIST.txt](docs/RE_OWNER_CHECKLIST.txt). Record PASS, FAIL, BLOCKED or NOT IMPLEMENTED separately.

## Analyze a ROM or raw 6502 binary

Open **RE / DISASM** and use the general binary-analysis panel. It opens files independently of the emulator and recovery decoder: an unknown engine, unsupported NES mapper, or binary from another 6502 system does not prevent byte-level inspection. It reports recognized container information where available, with raw-byte access when no supported structure can be established.

Inspect bytes by file offset, view a bounded 6502 disassembly, search byte patterns, and attach address labels/notes to the analysis. Recognized CHR ROM also has a paged grayscale pattern preview, independent of emulation. CPU addresses require an explicit mapping; a file offset is not automatically a runtime address. A disassembled byte sequence is an interpretation, not proof that those bytes execute as code. Inspection reports are evidence files, not editable Forge projects.

Read `docs/RE_ANALYSIS.md` for the exact controls, supported opcode interpretation, mapping rules, format fallbacks and finite resource limits. This implements engine-independent static analysis. Memory search during playback, watches, breakpoints, input replay and semantic actions such as changing health, defeating an enemy or advancing a stage remain future debugger work. NES/Famicom remains the executable game target; opening a binary from another platform does not add that platform's hardware emulation.

## Inspect earlier and later emulator frames

In **EMULATOR**, choose **Load ROM**, then press **Run** to play. The playback tools add optional **Record history**, one-frame Back/Forward and 60-frame batch navigation. Recording starts off; turning it off drops its buffer. Turn it on before playing the section you want to revisit; history cannot recover time before recording began.

Back restores retained full emulator states. Forward restores recorded future states or executes actual muted frames beyond the newest recorded state. Forward stepping also works with recording off. Navigation leaves playback paused and controls neutral. Resume Run or use the ordinary Frame action from an earlier state to branch from there and discard the old future. New ROM loads, reset, CPU Trace and unload invalidate/reseed history. Controls remain available inside expanded Play/fullscreen.

History is limited by both **300 stored states** and **32 MiB of serialized stored data**; the displayed retained range depends on state size. This is a short review buffer, not a promised five-second recording, persistent save-state file or instruction-by-instruction reverse debugger. Batch navigation can be cancelled between yielded work. See `docs/EMULATOR_NAVIGATION.md` for controls, capture/readout behavior and limits. The original emulator's accuracy and performance limits remain unchanged.

## Try the integrated RE workflow

Open **RE / DISASM → RECOVER EDITABLE PROJECT**, choose `examples/RE_Bridge_Room/Bridge_Room.nes`, and press **Preview editable recovery**. Inspect the room, recovered solid-collision overlay, CHR and music summary. Choose **Import as new project** to enter the ordinary editor, or **Download Forge project JSON** for a portable editable project. **Download inspection report** is a separate evidence export and cannot be opened as a project.

The supplied ROM is independently authored homebrew with its own 6502 machine code, room/collision tables and pulse driver. It contains no embedded Forge project JSON. The decoder recognizes this one engine profile and reads native ROM data; this demonstrates format-specific recovery rather than a Forge metadata round trip. Other ROMs remain available in general analysis. The recovery action rejects unsupported profiles instead of inventing scenes or collision.

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

Use `build-inputs.json` for this HTML identity, `test-results/candidate/Summary.json` for actual hash/totals and all required suite results, and `checkpoints/re-analysis-1a-clean-extraction/Reproduction.json` for package reproduction. All 35 prior navigation/RE/legacy suites remain required alongside the new general-analysis suites on the same frozen candidate. Read the current runner and matching `Summary.json` for the required suite list and measured outcomes. The historical `re-navigation-1` build passed 788/788 across 35 suites; that result does not certify changed bytes. No current total is predicted here.

Browser walkthrough remains pending because the available Playwright Chromium executable is missing. Automated VM and bundled-emulator checks do not establish native picker behavior, visible browser layout, audible speakers, physical controllers or independent NES hardware timing. See `docs/BROWSER_QA.md`.

Read `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md`, `ROADMAP.md`, `CURRENT_BASELINE.md`, `TEST_POLICY.md` and `HANDOFF.md` before continuing. The prior navigation documents are archived at `docs/history/re-navigation-1/`; earlier candidate records remain historical and identify their own source and HTML hashes. The comprehensive manual PDFs and Alpha Review Kit remain separate documentation deliverables; this package carries the general-analysis, editable-recovery and emulator-navigation tutorials. The workshop is performed in the existing editor. ASM/Lua migration remains proposed roadmap work, not implemented compatibility. The owner wants comprehensive RE; general static analysis, frame history and one native-format decoder do not complete it. Broader RE, 1.9.1/1.9.2, hosted/wallet and hardware work require their own bounded implementation scope. No GitHub repository or public release was created by this candidate.
