# NES Forge 2.0.0-alpha.5 — Audio Adaptive Editing

Candidate **audio-adaptive-1**, schema **12**, based on alpha.4. Open `mainline/NES_Forge_2.0.0-alpha.5.html`. Direct native tracker keyboard entry remains unchanged. The Audio workspace adapts to narrow screens and keyboard/viewport resizing; touch and pen paint the original volume/arpeggio canvases with one undo step per changed stroke. Desktop mouse painting retains its original path.

Start with `docs/AUDIO_ADAPTIVE_GUIDE.md` and `docs/AUDIO_ADAPTIVE_CHECKLIST.txt`. A device-width viewport declaration also enables the existing narrow layouts across other tabs; cross-tab phone review is required. No core audio, compiler, import, emulation, capture, persistence or schema changes are included.

All **964 retained alpha.4 cases across 44 suites** plus **26 Audio adaptive cases** are required, for **45 suites**. Measured outcomes belong to `test-results/candidate/Summary.json`; verified clean-extraction evidence belongs to `checkpoints/audio-adaptive-1-clean-extraction/Reproduction.json`. Four browser runners report executed checks or blocked launches with zero checks. No blocked browser run counts as a pass.

Alpha.4 basic keyboard entry was owner-reported successful. This candidate has its own pending phone/layout/listening/performance acceptance. It is not promoted. The standalone HTML is the application; the ZIP includes source, tests, evidence, inherited examples and review instructions. The manual/workshop still needs a full current-controls review and any printable PDF must be rendered and visually checked.

## Preserved functionality

RE / DISASM supports engine-independent binary inspection separately from editable recovery; unknown engines remain inspectable. Native scene/collision/gameplay/audio recovery is bounded by supported formats. Emulator history offers retained-state Back and frame execution Forward, not automatic stage advancement. NES / 8-bit / 6502 remains the executable target.

The five templates, schema 12, 12 actors, 64 persistent bytes and Door Option B remain protected. The documented partial single-room editable recovery and one-way active synchronization limits remain. Alpha.3 forms are withdrawn; their source history stays preserved. Original baseline documents and measured results retain their own identities under docs/history and checkpoints.

## Reproduction

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

Use a disposable extraction: these commands produce new test reports. Final packaging checks exact source/test/report hashes, every retained suite count, browser evidence and clean-extraction proof. Native keyboard presentation, Safari, hardware controllers and audible quality require separate checks.

After review complete the Audio author/import/edit/build/listen/save/reopen workshop, then native audio-driver recovery. Hosted worlds, wallets and physical deck roles remain later roadmap phases. No public publication or promotion is implied.
