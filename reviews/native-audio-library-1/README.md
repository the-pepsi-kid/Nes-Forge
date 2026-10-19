# Native Audio Library verified checkpoint

The Audio tab now discovers catalogs for three exact known ROM revisions, runs isolated native playback, displays APU activity and source/bank details, and previews/imports finite editable music or SFX through the existing undo transaction. Load a supported ROM directly in Audio; no Windows export is required.

Verified application SHA-256: `c3dd4d509cb0df3be1ce60404810ec6e4cc25d95d1edfbc1cda87964f4d2247e`.

- Full retained gate: 101 suites, 1,916/1,916 cases against unchanged inputs.
- Browser: 14/14, including actual file chooser, note editing, project download/reopen and ROM compilation.
- Native parity: four controlled windows, 2,003 APU writes and 204,635 Float32 samples exactly match the committed parent implementation.
- Catalog sweep: all 205 playable entries execute bounded 16-update windows without refusal.
- Examples: all 58 retained files reproduced; 52 byte-identical, six receipt-only application-hash changes.

Use `python3 tools/verify_reference.py --full-gate` from the repository root, preferably in a disposable checkout. Browser and native parity scripts in this folder require the privately supplied source ROMs and Chromium; no commercial ROM or PCM payload is included here.

The review ZIP contains the actual application, the current audio guide and the retained original tutorials/manuals, with original RC3 records archived. See Review_Kit.json for its checksum. See browser/Report.json, Native_Parity.json, Registry_Integration.json and Example_Regeneration.json for measured evidence.

Editable import is a finite adaptation: DPCM and short-mode noise remain available in native playback but are omitted from editable transcription. Original instrument structure, complete loops, generic unknown-driver recognition and natural gameplay equivalence are not claimed. Longer excerpts can exceed a selected runtime backend’s normal capacity. Collision, scene and animation RE remain future work.

Historical initial-gate failure records document corrected identity-isolation and registry-inventory issues; the current gate is app/test-results/candidate/Summary.json.
