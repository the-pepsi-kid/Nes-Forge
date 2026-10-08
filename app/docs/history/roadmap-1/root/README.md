# NES Forge 2.0.0-alpha.6 — Roadmap Workbench

Candidate `roadmap-1`, schema 12. Open `mainline/NES_Forge_2.0.0-alpha.6.html`.

This is an implementation checkpoint in the complete roadmap, not completion of the whole roadmap or a promoted release. The previous alpha.5 is preserved under baseline. The owner authorized the full roadmap and requested that items be completed and verified one at a time.

Start with `docs/ROADMAP_REVIEW_GUIDE.md`. New supported workflows:

- AUDIO: MIDI/MusicXML score export and channel/timing-aware reimport, with explicit conversion limits. Built-in editable Audio workshop examples are in the Audio sidebar.
- RE / DISASM: generic physical CHR recovery into editable tile sheets, persisted source evidence and raw edited CHR export. This does not infer maps, collisions or music.
- RE runtime: named full-machine checkpoints, scripted controller input and reversible RAM experiments. This does not discover game-specific stage or combat meanings.
- Gameplay Core: a graph editor over the existing canonical Behavior/state/transition records, with diagnostics and reference navigation.
- CODE: a separate multi-file source workspace, literal includes/binary inserts, preserved originals, a declared assembler dialect, independent NROM builds and source exports.
- `hosted/`: a separately runnable local ordinary-item server draft and two-client demo. It is not connected to cartridge execution and is not a completed Hosted Worlds milestone.

All 990 retained cases across 45 suites remain mandatory, plus every suite in `roadmap-suites.json`. Exact measured outcomes are in `test-results/candidate/Summary.json`. That gate includes the explicitly separate hosted profile. Browser runners record either executed checks or a blocked launch with zero checks; viewport simulation and VM tests are not physical-device, speaker or controller acceptance.

Schema 12, the existing five templates, 12-actor runtime profile, 64 persistent-byte limit and Door Option B remain unchanged. Original CPU/PPU/APU algorithms, captures, Save As and historical golden ROMs remain protected. The source delta reverses to the exact immutable alpha.5 HTML before applying earlier guards.

## Reproduction

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

Use a disposable extraction. The full gate takes several minutes and produces fresh reports. To make a staging package, use `python3 tools/package_release.py --stage --output /absolute/path/roadmap-staging.zip`. Final packaging requires verified clean-extraction proof and five fresh browser reports tied to the current HTML.

Read `docs/ROADMAP_IMPLEMENTATION_STATUS.md` for implemented subsets and remaining work. No public deployment, wallet connection, asset mint, real-value combat, hardware certification, universal native-ROM recovery, or full manual/PDF completion is claimed by this candidate.
