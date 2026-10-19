# Audio Driver Survey checkpoint

Candidate `audio-driver-survey-1`, schema 12. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html` from the repository root. The frozen RC3 tester kit retains its earlier application.

The new Runtime Investigation audio mode and writer report locate executed APU-writing instructions by physical ROM bank, preserve trace evidence, open the matching source and export JSON. See [the usage guide](../../app/docs/AUDIO_DRIVER_SURVEY.md). Whole-library identification and editable native-driver conversion remain unfinished.

## Executed verification

- Full gate: **1,888/1,888 cases, 99/99 suites**, zero failures; unchanged candidate HTML. Includes all 1,872 parent cases. [Machine-readable summary](../../app/test-results/candidate/Summary.json).
- Actual Chromium browser workflow: **6/6 checks**, zero page errors. [Report](browser/Report.json).
- Six example generators: **52/58 files byte-identical**; six receipts changed only their application hash. All 15 ROMs, 19 projects and six recipes remain byte-identical. [Comparison](Example_Regeneration.json).
- Exact parent source/test reconstruction and protected-file checks passed. No canonical Audio, project schema, compiler or emulator implementation changes.

HTML SHA-256: `16d29e4082bc0377e03a54903e13fa9129c46ee9cf5a39e7ffdced6779591417`.

Run `python3 tools/verify_reference.py` at the repository root for exact payload checksums and bundle identity. Run `FORGE_TEST_WORKERS=4 node tests/run_candidate.cjs` inside `app` to reproduce the gate. On PowerShell set `$env:FORGE_TEST_WORKERS = '4'` first, then run the Node command.

The separate private Zelda II, Ninja Gaiden and Castlevania II research archive contains game-specific catalogs and reproduction scripts. It is not part of this public application tree and is not an editable Forge-project import. Natural execution coverage, controlled native-driver checks and remaining gaps are distinguished in each catalog. Listening, hardware acceptance and complete audio-library recovery remain open.
