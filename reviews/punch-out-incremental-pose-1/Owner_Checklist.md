# Idle/incremental position checks

- [ ] Open the new standalone with a supported Punch-Out ROM or saved native project. Confirm Retro Workstation, density, Resources and Connected Workspace on your browser.
- [ ] Open native pose `$C0`. Confirm the state/update/anchor status and original X=-14/Y=-97 on an untouched source.
- [ ] Check **Keep idle poses together**, set X=-12 and Apply. Confirm `$C0/$C2/$C4` retain their different Y values and relative bob.
- [ ] Undo once and Redo. Save Project As, reopen and reselect the native view.
- [ ] Build/export, play the fight and inspect idle movement. Reimport the exported ROM and check an unchanged rebuild.
- [ ] Uncheck the group option for an individual incremental record. Inspect a vertical move and the original screen-height priority behavior; check alignment with the game's original hit rules.
- [ ] Confirm an invalid grouped offset refuses without partially adding/moving assets. Preserve unsupported piece/flag edits by saving; use Undo to return to a buildable position edit.
- [ ] Reopen an earlier full-pose/art/palette/arena project and compare its output. Audition source Audio and listen to edited-game playback on your device.

The automated reports do not check these owner boxes. Complete fights, native geometry/animation/Audio writers, listening, controllers and hardware remain separate work.
