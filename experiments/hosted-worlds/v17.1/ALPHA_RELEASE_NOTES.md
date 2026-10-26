# NES Forge 3.0.0-alpha.1 — Hosted Worlds release candidate

Internal host/editor implementation checkpoint **v17.1**, not a separate incompatible application line. The original standalone 2.0 alpha and Pepsi archive stay untouched on GitHub `main`.

## Testable alpha functions

- Load an explicitly selected World from Forge into a local-only Python host using protocol 13
- Sign in with separate wallet-authenticated browser players on localhost
- Preserve shared World and per-player progress/XP/camps through server restart
- Publish revised World state while retaining active player sessions where supported
- Display source-recovered Link pose selectors in a server-authoritative shared side view, using clearly labelled experimental movement and attack geometry
- Continue independent native-ROM editing and build workflows via the included Forge source/editor

## Fixes in this review candidate

- Retain the v17.1 World-load compatibility correction (accept host protocol 13; reject old 12)
- Restore the missing `Z2_AUTHENTICITY_GUARDRAILS.json` policy manifest referenced by an existing test and documentation
- Correct two test assertions to distinguish original Link reference from unverified alternate-avatar candidates, and to match the actual host's explicit non-native-combat wording
- Add `tests/run_alpha_acceptance.py`, a deterministic smoke/regression runner for 10 bounded suites

## Known limitations and controls

- Original Zelda II combat/animation/physics/enemy and full-scene parity is **NOT CERTIFIED**. Synthetic multiplayer mechanics are not native Zelda II rules.
- `tests/test_v17_client_stabs.py` requires the owner's private Zelda II ROM supplied by `NES_FORGE_Z2_ROM`; do not commit or redistribute it.
- The 3.x localhost host is a technical preview, not production-hardened internet hosting.
- Do not commit screenshots/ROM-derived evidence, player SQLite state, authentication credentials, or personal wallet keys to the **public** repository.
- GitHub PR #3 is a draft architecture/documentation branch **until the complete source is actually pushed**. A complete offline ZIP is not proof of a GitHub commit.

## Run and verify

Windows: `START_LOCALHOST_WINDOWS.cmd`, then open `NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html` from this same directory.

macOS/Linux: `./START_LOCALHOST_MAC_LINUX.sh` and the same editor HTML.

From this folder: `python tests/run_alpha_acceptance.py`.

Only after the source upload, clean-checkout test execution, acceptance review, and explicit owner approval should the PR be merged or a public 3.0 GitHub release be made.
