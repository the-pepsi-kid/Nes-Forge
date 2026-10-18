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
- Source intake reports limited information about supplied source files; it does not run or translate
  supplied assembler projects. Native map, background, music and SFX recovery
  cover finite documented profiles, not arbitrary games. Unsupported raster
  behavior must not be represented as successfully compiled.
- Source Workspace's generic exports can misleadingly say **“Export
  requested”** when a save service returns busy/error. Confirm an output file
  exists before reporting success. The native project JSON is the portable
  editable backup; a ROM or diagnostic report cannot replace it.
- The first-session game you build in the tutorial is silent. Browser save
  dialogs, audio devices, emulators, phones and physical controllers can vary.
  Record your actual device and results if you try these optional paths.

For a failure, preserve your last native checkpoint and record expected result,
actual result, exact control and browser/device details in the feedback form.
