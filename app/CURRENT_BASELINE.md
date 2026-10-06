# Current review candidate — Mobile Playback

| Item | Record |
| --- | --- |
| Release / candidate | 2.0.0-alpha.2 / mobile-playback-1 |
| Project schema | 12, unchanged |
| HTML | mainline/NES_Forge_2.0.0-alpha.2.html; exact hash in build-inputs.json |
| Reference | 2.0.0-alpha.1 / audio-correction-1, HTML SHA-256 4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0 |
| Authority | October 5 owner: “Ok, address them.” D053 |
| Changes | Bounded frame scheduling, exact capture optimization, Play performance readout |
| Full gate | test-results/candidate/Summary.json; retain 921 cases / 42 suites plus mobile-playback200 |
| Clean extraction | checkpoints/mobile-playback-1-clean-extraction/Reproduction.json |
| Phone target | Owner-reported Cricket Dream 5G + Chrome; exact browser/OS versions and physical retest pending |
| Browser evidence | Separate fresh test-results/browser-* records; blocked launch executes zero checks |
| Acceptance | Review candidate; not promoted |

The recording establishes a reported mobile issue, not a measured device root cause or an alpha.1 acceptance. Its visible update rate and PCM gaps are capture measurements. CPU/APU/PPU semantics, audio buffering, native project data, five templates, 12 actors, 64 persistent bytes, Door Option B, partial single-room recovery, one-way synchronization, Save As, CHR, capture fidelity and undo remain protected.
