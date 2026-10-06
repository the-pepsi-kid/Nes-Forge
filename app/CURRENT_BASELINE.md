# Current review candidate — Mobile Keyboard

| Item | Record |
| --- | --- |
| Release / candidate | 2.0.0-alpha.4 / mobile-keyboard-1 |
| Project schema | 12, unchanged |
| HTML | mainline/NES_Forge_2.0.0-alpha.4.html; exact hash in build-inputs.json |
| Reference | 2.0.0-alpha.2 / mobile-playback-1, HTML SHA-256 27c436d1b7356fc8d2ce4c22396a0b768c4c2f3e6b2754f1be14e5db00389782 |
| Scope basis | October 6 owner rejection of alpha.3 forms and request for the mobile keyboard with PC-style entry; D055 supersedes D054 |
| Changes | Native text-input bridge for the original tracker, canonical PC note mapping, guarded focus/composition and input isolation |
| Withdrawn interface | Alpha.3 tracker/envelope forms; historical source and evidence remain preserved |
| Full gate | test-results/candidate/Summary.json; retain 940 cases / 43 suites plus mobile-keyboard200, for 44 suites |
| Clean extraction | checkpoints/mobile-keyboard-1-clean-extraction/Reproduction.json |
| Phone target | Owner-reported Cricket Dream 5G + Chrome; actual keyboard and layout review pending |
| Browser evidence | Separate fresh test-results/browser-* records; blocked launch executes zero checks |
| Acceptance | Review candidate; not promoted |

The bridge requests native keyboard focus from the tap gesture and handles committed text events as well as physical key controls. VM event checks can establish model and handler behavior; they cannot establish that a real phone showed its keyboard. Current measured evidence must match the delivered HTML and source. Earlier intermediate keyboard results cannot certify restored or changed files. The alpha.2 mobile playback comparison and audio listening checks remain open.

Preserve CPU/APU/PPU semantics, audio queue and scheduling, exact capture behavior, generated Audio/Gameplay compilers, schema 12, five templates, 12 actors, 64 persistent bytes, Door Option B, partial single-room recovery, one-way synchronization, Save As, CHR and undo. This correction is bounded to Audio tracker input plus release identity; envelope painting remains unchanged.
