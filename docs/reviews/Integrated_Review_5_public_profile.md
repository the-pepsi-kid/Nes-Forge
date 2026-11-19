# Integrated Review 5 · public GitHub profile

This is the public derivative of the owner-approved **NES_Forge_Integrated_Review_5.zip**. The supplied editor is reproducible from 219 source parts and has SHA-256 `060a700bd5a5e3371622adc0045c006cdea992f72dbb127adcf4e7f92556705f` before public packaging. The [original review](docs/reviews/Integrated_Review_5.md) and [supplied asset report](docs/reviews/NES_Forge_Asset_Report_Review5.md) are retained verbatim as historical evidence.

The public derivative keeps the direct ROM → RE → Resources → editor changes, authored editor/compiler/emulator, Audio, workshop, integrated lessons and hosted pilot together. `NES_Forge.html` and `nes-forge.html` are byte-identical generated entries.

## Publication changes

- The private embedded captured-project and raw-evidence catalogs are replaced with inert services retaining their original API. Native source-on-demand decoders remain intact. This matches the preceding public RC2 exclusion boundary.
- Private Evidence images/logs, commercial ROMs, extraction ZIPs, databases and wallet data are omitted. The four `QA/r` cartridges are authored game regression fixtures from this review, not commercial source ROMs.
- Teapot418 retains its editable authored project; its redundant preserved historical ROM field is cleared. Its separately identified authored regression fixture remains under QA.
- Stale Review 1/4 identity labels now identify Review 5. The build manifest generates both launch names from the same source. The inventory/extractor uses lowercase `tools/` for compatibility with Windows checkouts.
- The QA runner accepts `--jobs 1` to avoid unrelated CPU contention against the emulator's existing per-frame safety budget. Application frame limits are unchanged.

Exact source exceptions, artifact identities and fresh check results are recorded in [Publication.json](reviews/integrated-review-5/Publication.json). Check receipts under that directory identify this public editor, not the private editor's hash.

## Remaining acceptance

Pose ordering/composition remains open as reported by the owner. Complete native recovery, expanded native encoders, original-game parity, audible output/latency, physical hardware, full device acceptance and two-human hosted/wallet play remain incomplete. The recorded DigiGhosts/Beacon Island visual issues are retained.

The private Review 5 run's 36/37 jobs, 8/8 original-ROM library checks, 14 source byte streams and 24 extraction archives are historical evidence on the private editor. They are not fresh checks on this public derivative. No commercial source ROM or extraction archive was supplied in this session.
