# Per-project recovery verification

Owner requirement, 2026-10-23: check the audio driver for every project as part of verification. A correct Scene alone does not close a project checkpoint.

For each supplied title and revision, record the exact source identity and the current app hash. Keep separate results for Scene and Audio. Missing or unsupported audio remains an explicit open item; do not silently mark that project verified or move to the next title without reporting it.

- [ ] Scene: assembled native placement, graphics and palettes match the source.
- [ ] Scene lifecycle: edit, Undo/Redo, save/reopen, native build and derivative reimport.
- [ ] Audio detection: the exact source has an installed driver/catalog, or an explicit unresolved result with a reason.
- [ ] Audio inventory: music/SFX cue identities, physical banks, channels and instrument/sample evidence are checked against actual bytes; names are not guessed.
- [ ] Audio native execution: every available cue produces bounded native APU activity; check representative music and SFX by listening in the owner browser. Automated PCM checks do not replace listening.
- [ ] Audio workflow: Audio tab loads the catalog directly after project import and after save/reopen; cue inspection and native preview work.
- [ ] Editable Audio: where available, preview/import representative music and SFX through Undo/Redo and save/reopen; report adaptation losses and conversion refusals explicitly.
- [ ] Combined preservation: a native Scene edit/rebuild retains audio bytes and driver detection. When derivatives are supported, prove their audio identity independently of a filename or original full-ROM hash.
- [ ] Audio writing: report whether edited scores can be encoded into the original native driver. A canonical excerpt alone is not native audio writing; unsupported native builds must refuse.
- [ ] Retained compatibility: existing importers, Audio and project persistence keep their checks. Report the tested scope and any outstanding browser, controller or gameplay checks.

A missing decoder blocks an Audio pass. Existing unsupported audio writers and other partial domains must be disclosed. Whole-game recovery remains separate from bounded Scene and Audio verification.
