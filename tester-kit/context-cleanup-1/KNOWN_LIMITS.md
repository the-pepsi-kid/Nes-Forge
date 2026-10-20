# Scope and known limitations — alpha.11

This is a pre-release test build. The
desktop first-session exercise covers tile art, Solid collision, metatiles,
two-screen World traversal, one bound Player, a generated ROM, and native save/
reopen. Scene and Entity Studio are authoring/pose views; gameplay is observed
in the running emulator. Changes require another Build & Run.

- The current gameplay profile retains five templates, at most 12 runtime
  actors and 64 one-byte persistent values. The Sideview Player compatibility
  runtime is separate from behavior-table execution. Door Option B and the
  one-way persistent-to-active synchronization have defined limitations.
- **Analyze source** reports limited information about supplied source files. **Build source ROM** is a separate assembly workflow for the supported `forge-6502-v1` mapper 0 profile; it does not translate foreign assembler projects. Native map, background, music and SFX recovery
  cover finite documented profiles, not arbitrary games. Unsupported raster
  behavior must not be represented as successfully compiled.
- Source Workspace's generic exports can misleadingly say **“Export
  requested”** when a save service returns busy/error. Confirm an output file
  exists before reporting success. The native project JSON backs up the main editor. Use **Save source workspace** separately for source-workspace files. A ROM or diagnostic report cannot replace either editable backup.
- The first-session game you build in the tutorial is silent. Browser save
  dialogs, audio devices, emulators, phones and physical controllers can vary.
  Record your actual device and results if you try these optional paths.

For a failure, preserve your last native checkpoint and record expected result,
actual result, exact control and browser/device details in the feedback form.

## Audio and documentation boundaries

Music and SFX are authored inside a normal Forge project. A dedicated New Sound Project command, multi-song project library, audio-only save, WAV/NSF export and FamiStudio project export are not implemented. FamiStudio import accepts a bounded 4.5 text-export subset, not native `.fms` files. Keep both project JSON and the separate original-source receipt. See the [Audio guide](Guides/Audio.md).

The [current user guide](Guide.html) supersedes older version-specific manual and in-app help text. Older manuals, control rows and screenshots are retained and labeled. Current source inspection and browser smoke checks are not full device or owner acceptance.
