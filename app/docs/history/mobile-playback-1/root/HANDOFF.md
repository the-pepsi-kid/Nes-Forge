# NES Forge 2.0.0-alpha.2 — mobile-playback-1 handoff

D053 follows owner mobile-lag feedback, the supplied screen recording, Cricket Dream 5G / Chrome identification, and “Ok, address them.” Scope: correct bounded host scheduling, reduce native capture allocation overhead while preserving exact completed-frame data, and surface Play diagnostics. No release promotion or broader feature work is included.

1. Read CURRENT_BASELINE.md and docs/MOBILE_PLAYBACK.md.
2. Verify build-inputs.json and test-results/candidate/Summary.json against the actual HTML. All 921 previous cases and the new mobile suite are required.
3. Read checkpoints/mobile-playback-1-clean-extraction/Reproduction.json and the three fresh browser reports. Node VM timing and synthetic clocks are not browser/phone results.
4. Use docs/MOBILE_PLAYBACK_CHECKLIST.txt for same-ROM old/new desktop and phone comparisons. Record phone/OS/browser, route, settings and the visible diagnostic counters. Mobile speed improvement and listening remain unverified until that review.
5. Preserve the exact alpha.1 reference in baseline/, its reports under checkpoints/audio-correction-1-reference/, and its historical docs. The audio-correction regressions remain mandatory.

From the application root:

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

For a new clean input archive, use `python3 tools/package_release.py --stage --output /absolute/path/mobile-playback-staging.zip`, extract to a fresh directory, verify its SHA256SUMS.txt, and run the full gate there. Final packaging rejects stale source/docs/test provenance, missing cases, stale browser hashes and absent clean-extraction proof. Test execution rewrites reports; use a disposable copy to retain delivered evidence.

The scheduler's catch-up budget is checked between indivisible frames, with the existing frame safety guard. A truly overloaded device can still slow down; backlog/discard counters remain honest. Capture uses a transient CHR-ROM cache that compares current bytes and source mapping. CHR-RAM stays on the original live path; no capture, history or raster behavior is disabled.

Next: owner review of the bounded mobile correction, then the supported audio author/import/edit/build/listen/save/reopen workshop. Native audio-driver recovery follows that foundation. RE, ASM portability, hosted/wallet and tech-deck plans retain separate scope. No GitHub destination or publication is implied.
