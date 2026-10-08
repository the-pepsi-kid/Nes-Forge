# RE checkpoints, input scripts and reversible RAM experiments

This candidate adds working runtime investigation controls under **RE → Runtime investigation → Checkpoints and reversible experiments**. Load a ROM in **EMULATOR** first. These controls operate on that loaded emulator session; opening a file for static analysis remains separate.

## Named physical checkpoints

**Save checkpoint** pauses and saves CPU, PPU, mapper, logical APU, internal and cartridge RAM, controller latches, capture provenance and completed framebuffers. **Restore selected** restores that complete physical state, clears queued host audio, discards the incompatible frame-history future and leaves the emulator paused. The existing host audio callback stays live. Checkpoints do not store a screenshot as a substitute for machine state.

A checkpoint is local to the exact loaded ROM/session. Reset, successful ROM replacement, CPU instruction tracing, or project unloading invalidates it. A rejected ROM load leaves the current session intact. Checkpoints are temporary and are not written into project JSON, the ROM, or a downloadable save-state file.

There are at most **16 checkpoints**, with a separate **32 MiB stored-byte budget**. The UI shows storage usage. The budget counts encoded physical state and packed framebuffers; JavaScript object overhead and temporary codec buffers are outside that total. Checkpoint names have at most 64 characters. Saving beyond a limit rejects the operation instead of evicting another named checkpoint. Existing optional frame history retains its separate 300-state/32 MiB limit.

## Deterministic scripted input

Enter input steps as JSON, select **Restore selected checkpoint before replay**, then press **Run input script**:

```json
[
  {"frames": 30, "buttons": ["Right"]},
  {"frames": 10, "buttons": []},
  {"frames": 1, "buttons": ["A"]},
  {"frames": 20, "buttons": []}
]
```

Supported button names are `A`, `B`, `Select`, `Start`, `Up`, `Down`, `Left`, and `Right`. An empty array means neutral input. Opposite directions and duplicate buttons are rejected. Each step uses 1–600 frames, with at most 256 steps and 1800 total frames.

Replay executes the actual emulator CPU/PPU/APU with isolated scripted controller input. Keyboard, touch, gamepad, and focused editor fields do not add buttons. The operation yields between frames so **Cancel script / navigation** can stop it. Cancellation retains already executed frames; restore a checkpoint to rewind. Loading another ROM or resetting cancels the old operation before it can execute on the new session. Completion and cancellation leave the emulator paused and release scripted input.

The same checkpoint plus the same input script reproduces the emulator's deterministic physical state and PCM samples in the automated native-ROM regression. This is scoped to Forge's emulator and supported mapper behavior, not proof of hardware cycle accuracy. A script replays gameplay inputs; it does not discover stages, guarantee a stage transition, grant health, or eliminate enemies automatically.

## Reversible RAM experiments

Enter an address, byte value and a label for your hypothesis, then choose **Apply reversible RAM edit**. Decimal, `$hex`, and `0xhex` are accepted in the UI. The model supports a bounded atomic group of up to 256 byte changes; the UI exposes a single-byte edit.

Permitted targets are:

- Internal RAM `$0000–$1FFF`; mirrors normalize to `$0000–$07FF`.
- Available cartridge RAM `$6000–$7FFF`.

I/O registers, ROM bytes, mapper registers, out-of-range values, conflicting expected bytes, and duplicate addresses (including mirrors) are rejected before mutation. Edits access RAM backing arrays directly and never call CPU bus writers, so an address cannot trigger an I/O side effect. Runtime observations and the incompatible frame-history branch are cleared at mutation.

Applying an experiment saves a full **Before:** checkpoint. Play or replay inputs to investigate the result. **Restore experiment** restores the entire machine to that checkpoint, including elapsed frames and all subsequent game effects; it is not just an inverse write to one byte. **Keep emulator state** deletes the experiment checkpoint and retains the current emulator state. Neither action changes the project or original ROM. Only one reversible experiment is active at once. Its rollback checkpoint is protected from ordinary deletion through both the UI and public timeline API; Restore or Keep releases it. Reset/ROM replacement invalidates the experiment and its rollback.

The experiment's label is a user hypothesis, not a decoded or validated gameplay meaning. Finding a byte that changes during damage is useful evidence, but it does not establish a portable “damage player” control or collision format. Engine-specific stage/combat actions still require verified semantics and source identity.

## Review checks

1. Load `examples/RE_Bridge_Room/Bridge_Room.nes`, run several frames, then save a named checkpoint. Run to a different position and restore it. Check that the original view, player position and frame return while paused.
2. Run the sample input script twice from the same checkpoint. Check that both runs end at the same position/frame. Hold an unrelated keyboard/gamepad/touch control during the second run and verify that it does not affect scripted movement.
3. Cancel a longer replay. Verify that it stops, stays paused, and can return to the saved checkpoint.
4. Apply a labeled edit to a known safe RAM candidate, run a few frames, then restore the experiment. Verify that the whole machine rewinds. Repeat and choose Keep to retain the emulator state.
5. Try `$4015`, `$8000`, and byte value `256`. Each must show a validation error without changing the machine.
6. Reset or load a different ROM. Verify that the old checkpoints and active experiment disappear.
7. Repeat the controls on a real mobile browser, including native keyboard entry, responsive layout, cancel responsiveness and audio resumption after restore. Automated mock-DOM checks do not replace this device review.

## Deliberate remaining scope

This slice does not implement breakpoint stepping, read watches, value freezes, ROM shadow patches, automatic stage/combat semantics, exported/imported machine snapshots, arbitrary emulator/mapper support, or multiplayer rollback. It provides the bounded checkpoint/replay/RAM experiment foundation without making those later capabilities appear complete.
