# NES Forge 3.0.0-alpha.1 — Hosted Worlds

**Candidate for experimental-branch source review; not approved for main merge.** Internal runtime checkpoint: v17.1. The 2.0.0-alpha.11 mainline and original Pepsi archive remain independent.

## Contents

- Standalone v17 editor, modular Forge source and history, localhost host, player UI, Windows/macOS launchers and regression suites
- Protocol 13 World publication; administrator-only publishing, shared player World, wallet verification and persistent player/camp/XP state
- Source-backed Link display poses and selectable hosted attacks; action/collision/damage timing explicitly provisional
- Preserved owner-only ROM-derived evidence kept offline; sanitized public source excludes evidence/screenshots and private state

## Verification

Run `python tests/run_alpha_acceptance.py` from this directory. Native ROM-specific client tests separately require `NES_FORGE_Z2_ROM` with a legally owned local ROM and are not part of the public gate. This runner does **not** certify exact Zelda II movement, enemy, palette, encounter, item, spell, audio, physics, or native writeback fidelity.

This corrected candidate restores `Z2_AUTHENTICITY_GUARDRAILS.json` omitted from an earlier kit and repairs two stale test expectations in `test_authenticity_guards.py`. The game host/editor code remains unchanged from the v17.1 World-load fix. Test fixture/metadata updates do not change the native project schema or hosting database.

## GitHub status

The reconciled source uses canonical `app/src` plus the host/client in this version folder. Draft PR #3 is the source publication target. Check its current commit and publication receipt for upload status. Running a local test is not a GitHub push. Do not tag a GitHub 3.0 alpha as released until the branch contains code and clean-checkout acceptance is recorded.
