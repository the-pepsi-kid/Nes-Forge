# NES Forge 2.0.0-alpha.4 — mobile-keyboard-1 handoff

D055 supersedes D054 following the owner's rejection of separate Audio forms: tapping the original tracker must request the mobile keyboard and use the PC piano-key workflow. Alpha.4 begins from alpha.2. It retains the playback corrections and original envelope painting; there is no new tracker form, Apply button or envelope editor. No audio-engine, compiler, emulator or broader RE changes are included.

1. Read CURRENT_BASELINE.md and docs/MOBILE_KEYBOARD.md.
2. Verify build-inputs.json and test-results/candidate/Summary.json against the delivered HTML. All 940 alpha.2 cases and the new mobile-keyboard suite are required across 44 suites. The 18 withdrawn alpha.3 form-specific cases are explicitly superseded under D055.
3. Read checkpoints/mobile-keyboard-1-clean-extraction/Reproduction.json and all three fresh browser reports. VM event tests do not prove Android keyboard opening, IME layout or visible browser rendering.
4. Use docs/MOBILE_KEYBOARD_CHECKLIST.txt for direct entry, composition, focus isolation, undo/redo/save and desktop preservation. Keep gameplay/audio-performance comparison separate under docs/MOBILE_PLAYBACK_CHECKLIST.txt.
5. Preserve alpha.2 in baseline/, its reports under checkpoints/mobile-playback-1-reference/ and historical documents. Preserve alpha.1 and earlier references. Withdrawn alpha.3 documents, identity and Summary are under docs/history/mobile-audio-entry-1-withdrawn/; its source branch and delivered artifacts remain historical.

From the application root:

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

Create a fresh staging archive with `python3 tools/package_release.py --stage --output /absolute/path/mobile-keyboard-staging.zip`, extract to a new directory, verify every SHA256SUMS.txt entry, and run the full gate there. Final packaging rejects stale provenance, missing cases, mismatched browser hashes and absent clean-extraction proof. Test execution rewrites reports; use a disposable copy to preserve delivered evidence.

Next: review this direct-keyboard correction and the pending alpha.2 playback improvement on the reported phone, then complete the supported Audio author/import/edit/build/listen/save/reopen workshop. Native audio-driver recovery follows. Capability-adaptive UI is a recommendation for a separately bounded audit, not authority to rewrite the interface in this candidate. No promotion, hosted/wallet work or public repository is implied.
