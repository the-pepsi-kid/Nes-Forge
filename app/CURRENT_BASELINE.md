# Current review baseline — Audio Adaptive Editing

- Release: **2.0.0-alpha.5 / audio-adaptive-1**, schema **12**.
- HTML: `mainline/NES_Forge_2.0.0-alpha.5.html`.
- HTML SHA-256: `be63ce7ddd3eec76f1736b9aff78922f0dc10e945ff2a96b26139f2393fff76a`.
- Behavioral parent: alpha.4 / mobile-keyboard-1, HTML SHA-256 `4871312c2fbedc312a89d7400d669b525732e7f9fb2965b87bf74d1d75c00e42`.
- Owner authorization: “ok, continue”, following the bounded adaptive UI audit.
- Parent owner report: basic direct phone keyboard entry works; remaining checklist outcomes were not reported.

Bounded changes: shell viewport/help metadata and release identity, plus one Audio UI module. The module handles scoped panels/viewport height, selected-cell scrolling and touch/pen painting of existing envelopes. Original tracker/native keyboard, desktop mouse, engines, compiler, importers, emulator, capture and persistence sources are byte-identical to alpha.4.

Mandatory gate: all 964 retained cases / 44 suites, plus the 26-case adaptive suite, for 45 suites. Actual measured outcomes: `test-results/candidate/Summary.json`. Clean extraction: `checkpoints/audio-adaptive-1-clean-extraction/Reproduction.json`. Browser rendering: four separately hashed reports, including `test-results/browser-audio-adaptive/Report.json`.

Physical phone layout, native keyboard/IME, listening, same-device mobile performance and hardware controllers remain pending for this candidate. No promotion. Use `docs/AUDIO_ADAPTIVE_CHECKLIST.txt`. The viewport declaration also activates existing narrow layouts outside Audio and must be reviewed across tabs.
