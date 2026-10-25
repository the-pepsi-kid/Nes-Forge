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

## Per-title tutorial requirement

Owner requirement, 2026-10-24: each imported/supported title needs instructions for its own methods, alongside the general NES Forge tutorial. Use `app/docs/projects/PROJECT_TUTORIAL_TEMPLATE.md` and the current `PUNCH_OUT.md` lesson. Older guides awaiting expansion are listed in `app/docs/projects/README.md`; their inclusion does not establish a new acceptance pass.

- [ ] Exact input/application identities and a reproducible supported edit with actual control labels.
- [ ] Per-domain asset inventory, source ownership, native writer scope and explicit gaps.
- [ ] Format lesson: bank mapping, pointers, compression, raster context, aliases and capacity.
- [ ] Independent RE, assembly and external hex workflows, plus source/HTML module connections.
- [ ] Separate native rebuilt-ROM, authored-game and customized standalone-HTML outcomes.
- [ ] Audio steps, Undo/Redo, save/reopen, native rebuild/reimport and original-engine checks.
- [ ] Reproduction commands and clearly separated automated evidence and learner/device acceptance.

Update the title lesson in the same checkpoint that changes its method. A tutorial can be complete for a bounded supported workflow while unrecovered domains stay open; importing a ROM is not whole-game recovery.
