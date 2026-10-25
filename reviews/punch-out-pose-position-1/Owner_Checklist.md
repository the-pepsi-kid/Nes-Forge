# Native pose position: owner checks

Use the new application with a supported Punch-Out source or saved native project.

- [ ] Open **Recovered content → Native pose positions · Glass Joe → pose $00 → Edit native Glass Joe pose position**.
- [ ] Confirm the dedicated frame opens in Metasprites with the native X/Y controls and the matching source banner. The source offsets initially show -16/-96 for an untouched original.
- [ ] Set X=-14, apply, Undo, Redo. Save Project As and reopen, reselect the native pose and confirm the edited offset.
- [ ] Build/download and inspect the changed full pose in the intro where it is used. Confirm the active idle animation can use separate delta records; a single full-pose edit need not move every later frame.
- [ ] Reimport the exported ROM and compare an unchanged rebuild. Check source Audio and retain source/project/output separately.
- [ ] Try another full pose. Check the actual affected game state and visual/hit-region alignment. Current position writing leaves original collision, attack and damage rules intact.
- [ ] Confirm individual piece/geometry/art/flag edits are preserved by saving and refused by native building; use the dedicated physical art views for CHR/palette changes.
- [ ] Check Compact/Comfortable, Resources, Connected Workspace, browser layout and Audio on your device. Current automated checks do not check these acceptance boxes.

This is whole-pose position writing, not a complete native sprite geometry/animation editor or complete Punch-Out support.
