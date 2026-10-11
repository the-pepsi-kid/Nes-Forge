# NES Forge — Compatibility Stabilization candidate

**2.0.0-alpha.11 / compatibility-stabilization-1**, schema 12. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

The owner requested compatibility safeguards, then authorized “update roadmap and continue”. The roadmap now places D063/C1–C5 stabilization before more mechanics and A1 feature expansion.

This candidate adds exact-source-verified alpha.10/alpha.11 recipe metadata migration, shared configuration-owned physics validation, a ProjectStore-owned settings transaction, and complete detached World/single-room movement preview compilation. Raw recipe v1, runtime emitters, project schema and the existing five-template scope remain unchanged.

Fresh clean-extraction gate: **1541/1541 automated cases across 72 suites**, retaining all 1,504 predecessor cases across 68 suites. All 4,117 staging payload checksums were verified. `CANDIDATE.json`, the current Summary and compatibility clean-extraction proof contain exact identities and provenance.

**11 browser runners blocked with zero checks** because Chromium is unavailable. Its attempted download did not produce a usable archive. Automated VM/ROM/handler results do not establish browser rendering, native dialogs, listening, phone A/V performance, controller or NES hardware acceptance. The candidate is not promoted or published.

Read `app/docs/COMPATIBILITY_STABILIZATION.md` and its checklist. Historical recipes require the exact original base and donor content; the adapter changes only reviewed foundation metadata after full original-source/result verification. New or altered content still refuses. The original alpha.11 application, historical source/tests/results and prior Git refs remain preserved.

Next feature dependency: A1 shared native-background recovery/import using independent Pepsi and source-backed HonkeyPong inputs, then A2 on suitable map/collision evidence, followed by the retained roadmap sequence. The complete roadmap and comprehensive manual remain unfinished. License: UNDECIDED.

Run `python3 tools/verify_reference.py` for delivered-app checksum verification; `--full-gate` reproduces in a disposable copy. `tools/package_source.py` packages a clean committed tree with portable Git history.
