# NES Forge 2.0.0-alpha.3 — mobile-audio-entry-1 handoff

D054 addresses the October 6 owner report: “On mobile i can't input values for audio notes for the instruments.” Source inspection found canvas selection with physical-keyboard-only note insertion and mouse-only envelope dragging. Supply native Audio authoring controls using the existing canonical data and undo/persistence paths. No audio-engine, compiler, emulator or broader RE changes are included.

1. Read CURRENT_BASELINE.md and docs/MOBILE_AUDIO_ENTRY.md.
2. Verify build-inputs.json and test-results/candidate/Summary.json against the delivered HTML. All 940 previous cases and the new mobile-audio-entry suite are required across 44 suites.
3. Read checkpoints/mobile-audio-entry-1-clean-extraction/Reproduction.json and the three fresh browser reports. VM event tests do not prove Android keyboard/picker behavior or visible layout.
4. Use docs/MOBILE_AUDIO_ENTRY_CHECKLIST.txt for touch note entry, instrument-envelope editing, save/reopen and desktop preservation. Keep mobile gameplay/audio-performance comparison separate under docs/MOBILE_PLAYBACK_CHECKLIST.txt.
5. Preserve alpha.2 in baseline/, its reports under checkpoints/mobile-playback-1-reference/ and historical documents. Preserve alpha.1 and earlier references too.

From the application root:

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

Create a fresh staging archive with `python3 tools/package_release.py --stage --output /absolute/path/mobile-audio-entry-staging.zip`, extract to a new directory, verify every SHA256SUMS.txt entry, and run the full gate there. Final packaging rejects stale provenance, missing cases, mismatched browser hashes and absent clean-extraction proof. Test execution rewrites reports; use a disposable copy to preserve delivered evidence.

Next: review this mobile authoring correction and the still-pending alpha.2 playback improvement on the reported phone, then complete the supported Audio author/import/edit/build/listen/save/reopen workshop. Native audio-driver recovery follows. No release promotion, hosted/wallet work or public repository is implied.
