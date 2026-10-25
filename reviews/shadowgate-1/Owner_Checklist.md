# Shadowgate owner review

Extract NF6.zip into a short folder such as C:\NF6. Open NF/START_HERE.html, then this kit's NES_Forge.html. Use your own original Shadowgate ROM.

- [ ] Import as recovered resources. Area library → Investigated source lists 130 picture slots. Confirm representative pictures, including 0, 75, 76 and 129. Only the 112×112 crop belongs to the resource; objects/doors and room-state overlays remain unresolved.
- [ ] Select an original native tile ID, replace a cell, Undo/Redo, Save Project As, reopen, Build & Run, and reimport the output. Confirm the edited picture and unchanged surrounding native behavior. The legacy source header remains unchanged.
- [ ] Open Audio → ROM Audio Library immediately after import and again after reopening. Confirm 35 entries and the installed Shadowgate driver. Request 13 is selected initially.
- [ ] Inspect and listen to representative music requests and SFX. Request 24 must remain inspectable with playback/conversion disabled because its standalone header is invalid. Automated PCM/register checks do not replace this listening step.
- [ ] Preview editable music, review the listed adaptation losses, import, Undo/Redo, save/reopen and audition the tracker. For a short single-channel effect try request 21 with 16 updates and Single-channel SFX.
- [ ] Confirm native building refuses after importing editable Audio; Undo the import to resume native picture rebuilding. No native Audio encoder is available.
- [ ] Rebuild a native picture edit and confirm the Audio driver/catalog still loads and auditions from the rebuilt file.
- [ ] Record browser, OS, controller/touch and full-game findings separately. No automated report establishes these acceptances.

Open domains: alternate room/palette states, object/door overlays, UI/text, puzzle logic and interactions, animation, full gameplay and native Audio writing.
