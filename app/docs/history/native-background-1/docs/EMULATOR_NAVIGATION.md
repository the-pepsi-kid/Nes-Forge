# Emulator frame navigation — Alpha

Candidate **`re-analysis-1a`** retains the short, optional emulator history buffer introduced by `re-navigation-1` for playtesting and RE analysis. It works on the current loaded ROM in the existing emulator, including original ROM playback and Forge builds. Project schema remains 12. This feature preserves emulator states; it does not automatically decode a game's assets or reverse its 6502 instructions.

## First try

1. Open **EMULATOR → Load ROM**, choose a ROM, and wait for initialization. Loading leaves playback paused. Open **Playback tools** in the player controls.
2. Press **Record history: off** to turn recording on. History begins from the current state; it cannot recover earlier time from before recording was enabled.
3. Press **Run**, move the player for a short section, then pause. The status shows the current frame, retained oldest/newest frames, state count and stored size.
4. Press **Back 1** to inspect the preceding retained state. Press it again or use **−60 frames** to go farther back. The displayed framebuffer and emulator state/readouts change together.
5. Press **Forward 1** to revisit recorded future. **+60 frames** moves ahead in a batch. Once at the newest recorded state, forward navigation executes actual frames with neutral controls and muted output. Every navigation leaves playback paused.
6. If batch navigation is still running, press **Cancel navigation**. Work yields between groups of frames so cancellation can take effect; any already completed navigation remains visible.
7. To play a different outcome, return to an earlier state and press **Run**. This discards the old future and begins a new branch. The ordinary **Frame** action also branches when executed from the past. Back/Forward navigation alone preserves the recorded future.
8. When finished, turn **Record history** off. This drops the temporary buffer. Forward navigation still works, but Back has no discarded history to restore.

For the supplied `Bridge_Room.nes`, enable history, Run toward the wall, pause, then Back through the approach. Returning forward to the recorded wall contact lets you inspect the same machine state again. Use `docs/RE_BRIDGE.md` for the separate supported data-recovery/import workflow.

## Controls

| Control | Behavior |
| --- | --- |
| Playback tools | Opens/closes the extra controls; initially closed |
| Record history: off/on | Enables recording or disables it and drops history; initially off |
| Back 1 | Restores one retained earlier frame |
| −60 frames | Moves back up to 60 retained frames, stopping at the oldest available state |
| Forward 1 | Restores one recorded future frame, or executes one neutral muted frame at the live edge |
| +60 frames | Advances up to 60 frames, restoring recorded future before executing beyond it |
| Cancel navigation | Requests cancellation while asynchronous batch navigation is active |
| Run / ordinary Frame | Executes normally; from the past this discards the old future and starts a new branch |

The controls are part of the shared player presentation and remain inside expanded Play/native fullscreen. Navigation does not hold game controls or resume automatically. Forward stepping works even when recording is off. These are frame/batch actions; there is no continuous 2× speed mode.

## Why Forward does not select the next stage

Forward advances normal simulation. At the live edge it deliberately supplies neutral input; it provides no command to press Start or force a chosen stage, damage event or enemy defeat. Timed events can still occur through the game's own logic. A game can stay on the same title screen or room for many advancing frames. To observe a transition now, enable history, press **Run**, play through the event with normal controls, pause, then revisit the retained frames.

Health, enemy status and stage progression belong to each game's program and data. This candidate has no commands to force those events, no runtime memory scanner, and no breakpoint/watchpoint tools. Changing an arbitrary byte cannot be assumed to run all required game logic. Discovering and verifying those state/routine relationships is future debugger work, separate from frame navigation.

The new **GENERAL ROM ANALYSIS** panel opens original bytes without running them; see `RE_ANALYSIS.md`. It provides no gameplay event controls. General binary inspection remains available when the emulator cannot execute a particular ROM.

## How much history is available?

Both limits apply at once: **300 stored states** and **32 MiB of serialized stored data**. Older states are evicted when either limit is reached. The available range therefore depends on the size of this ROM's machine and capture state. Read the displayed oldest/newest frame numbers; there is no guaranteed five-second window.

The displayed storage budget counts encoded state, framebuffers and per-record metadata. It does not measure all JavaScript object overhead, temporary codec memory or the rest of the editor. Recording adds work and memory use; it is off by default. No phone performance improvement or recording-performance guarantee is claimed.

History is temporary and belongs to the current emulator session. It is not exported in native project JSON, persisted across page reloads or saved as a cartridge/game save. It does not alter Actor Instance or Room/World persistence semantics.

## What gets restored?

A retained entry includes resumable CPU, mapper, PPU and APU state, audio filter/sample history, capture-trace data and completed framebuffers. The loaded ROM remains the session's immutable byte source. Host audio nodes, animation/scheduler handles, ROM-load tokens and live keyboard/touch/gamepad ownership are not restored from the snapshot.

Navigation pauses playback, releases live controls and discards queued host audio. The APU's emulated state is restored for later execution, but old buffered speaker output is not replayed. Forward execution during navigation is muted and uses neutral input. Press Run deliberately when you want ordinary playback again.

Capture and RE readouts must correspond to the restored state. You can examine the earlier picture/registers and invoke the existing capture tools on that restored state. Editing/capturing into an authoring project is still a separate action; navigating emulator history does not undo or redo editor assets.

The original emulator's mapper, raster, DMC and timing accuracy limits remain. Restoring a state does not make an unsupported mapper supported or prove cycle-accurate hardware behavior.

## Branches and lifecycle changes

| Action | History effect |
| --- | --- |
| Back/Forward through stored entries | Moves the cursor while retaining the recorded future |
| Run or ordinary Frame from the past | Drops the former future; subsequent executed frames form a new branch |
| Forward past the newest entry | Executes real frames; records them if recording is enabled |
| Turn recording off | Drops the buffer |
| Load another ROM / reset / CPU Trace / unload | Clears incompatible or untracked history; recording can seed again from a valid active state where applicable |
| Page reload | Loses the temporary buffer |
| Cancel active navigation | Stops yielded work without automatically resuming playback |

CPU Trace executes instructions outside the frame-navigation history, so it invalidates the previous buffer. The timeline is not an instruction-level debugger. Unsupported snapshot state is reported and disables/clears recording before a partial restore can be accepted.

## RE scope

The owner's goal is comprehensive RE. This tool supplies controlled access to earlier and later emulator states, which helps compare visual changes, inspect registers and capture a chosen frame. The native-room bridge supplies one known-format conversion into editable assets/collision/music.

General file inspection, bounded official-6502 disassembly, search and user annotations are now available separately. Broader engine detection, compressed-map recovery, sound-driver coverage, execution-backed code/data evidence, breakpoints/watchpoints, source migration, ASM/Lua APIs, Method Registry, mapper/raster linking and controlled live edits remain separate implementation work. Back/Forward does not recover original source, automatically explain collision or provide arbitrary-game project conversion.

## Verification and acceptance

Run the complete frozen candidate gate:

```sh
python3 tools/bundle.py --check
node tests/run_all.cjs
```

The gate retains all 35 suites from `re-navigation-1` and adds the general-analysis suites. These three retained suites cover frame history:

- `tests/emulator-timeline.cjs` → `test-results/candidate/emulator-timeline.json`
- `tests/emulator-timeline-ui.cjs` → `test-results/candidate/emulator-timeline-ui.json`
- `tests/emulator-timeline-runtime.cjs` → `test-results/candidate/emulator-timeline-runtime.json`

The model/UI/runtime evidence must cover state restoration, recorded-future restoration without CPU execution, live-edge/off-record forward execution, branching, budget/eviction, lifecycle invalidation, cancellation, safe audio/input behavior and corresponding capture/readouts. Read the actual reports and `Summary.json` for case counts/outcomes; no predicted total or previous candidate pass certifies this build. Package reproduction is recorded in `checkpoints/re-analysis-1a-clean-extraction/Reproduction.json`.

Browser walkthrough remains pending; the current Chromium dependency is unavailable. Automated model, mock-DOM and bundled-emulator evidence does not establish visual layout, native file dialogs, actual speakers, mobile performance, USB/Bluetooth interoperability or independent hardware timing. Use `docs/BROWSER_QA.md` to record those observations for the exact candidate. Owner acceptance and promotion remain pending.
