# Navigate scene resources

This is a bounded context navigator over existing project assets, available in `context-cleanup-1`. Expand **Scene resources** below the toolbar.

1. Choose **World / recovered room**. Worlds list their declared tileset scene; recovered rooms group pages by exact source hash, profile and native room ID. **All project scenes** remains available. A native room/context is not assumed to be a complete stage.
2. Choose **Scene / page**. CHR, Scene, collision and Entity Studio use that canonical scene. Live edits are saved through the existing scene-switch operation.
3. **Open World** opens a World that declares this scene as its tileset. A World whose tileset is missing cannot be selected through this navigator.
4. Choose a related sprite pose or animation, then open it. Shared animation clips retain their other scene references. The animation opens at the first frame referencing the active scene; legacy tile frames without explicit sources follow the active scene. Navigation does not clone or rebind assets.
5. **Audio (project)** opens the existing tracker. Scene/event-to-cue bindings are unresolved; the navigator does not choose a song, change timing, enable playback or import anything.
6. **Open matching RE scene** works only when the exact source hash is already loaded in the native investigation catalog. Otherwise open that ROM in RE first. Navigation uses the receipt's native scene ID; it does not replace the investigated source or import resources.

Save/reopen retains existing scenes, references and recovery receipts. Context groups are derived again; no new project fields or schema are introduced. A source-bearing native project retains its original native-build limits: only the four supported location fields currently encode back into the original game.

Full shared Stage → Scene context, complete scene/event-to-Audio links, cross-scene dependency editing and new native encoders remain future work. Unknown relationships stay explicit.
