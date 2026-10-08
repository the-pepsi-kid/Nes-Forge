# NES Forge — Roadmap Workbench review candidate

2.0.0-alpha.6 / roadmap-1, schema 12. This checkpoint adds Audio MIDI/MusicXML export and built-in examples, physical CHR-ROM tile import, named emulator checkpoints and reversible RAM experiments, a canonical Gameplay Core graph, and a separate multi-file 6502 source workspace. An isolated local hosted-inventory prototype is included under app/hosted/. It is not integrated with cartridge gameplay.

Open app/mainline/NES_Forge_2.0.0-alpha.6.html and follow app/docs/ROADMAP_REVIEW_GUIDE.md. Fresh verified extraction passed 1,126/1,126 cases across 53 suites, retaining all 990 predecessor cases. The app tree exactly matches the delivered candidate ZIP. All five browser runners were blocked before checks by the missing Chromium download; browser, phone, audio-listening, physical-controller and hardware acceptance remain pending. No promotion or publication.

The full roadmap is in progress, not complete. Current implementation coverage and limitations are in app/docs/ROADMAP_IMPLEMENTATION_STATUS.md. The next sequential item is native Audio recovery using an independently reproduced FamiTone2 game; the alpha.6 app does not contain that decoder. The separate native Audio input checkpoint records provenance and reproducible build/runtime evidence.

Current roadmap and plan are under planning/. Historical branches and the annotated reference/re-runtime-1 tag are preserved. REFERENCE.json describes the frozen older main branch; CANDIDATE.json identifies this branch's current app. Run python3 tools/verify_reference.py to verify the delivered tree; --full-gate runs tests in a disposable copy. License remains UNDECIDED.
