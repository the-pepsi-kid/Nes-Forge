# Current review candidate — Mobile Audio Entry

| Item | Record |
| --- | --- |
| Release / candidate | 2.0.0-alpha.3 / mobile-audio-entry-1 |
| Project schema | 12, unchanged |
| HTML | mainline/NES_Forge_2.0.0-alpha.3.html; exact hash in build-inputs.json |
| Reference | 2.0.0-alpha.2 / mobile-playback-1, HTML SHA-256 27c436d1b7356fc8d2ce4c22396a0b768c4c2f3e6b2754f1be14e5db00389782 |
| Scope basis | October 6 owner report: mobile audio note values cannot be entered; D054 |
| Changes | Native tracker-cell and instrument-envelope editing controls; existing canonical Audio data |
| Full gate | test-results/candidate/Summary.json; retain 940 cases / 43 suites plus mobile-audio-entry200 |
| Clean extraction | checkpoints/mobile-audio-entry-1-clean-extraction/Reproduction.json |
| Phone target | Owner-reported Cricket Dream 5G + Chrome; actual keyboard/picker and layout review pending |
| Browser evidence | Separate fresh test-results/browser-* records; blocked launch executes zero checks |
| Acceptance | Review candidate; not promoted |

The source diagnosis establishes a missing native touch-entry path: the canvas does not raise a mobile keyboard and note insertion was keyboard-only. It does not establish a physical-phone fix before owner testing. The earlier mobile playback comparison and audio listening checks remain open.

Preserve CPU/APU/PPU semantics, audio queue and scheduling, exact capture behavior, generated Audio/Gameplay compilers, schema 12, five templates, 12 actors, 64 persistent bytes, Door Option B, partial single-room recovery, one-way synchronization, Save As, CHR and undo. The change is bounded to Audio authoring UI plus release identity.
