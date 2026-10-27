## Current reconciled source candidate

The current source shares canonical `app/src` across native and hosted builds,
retaining the newer native workflow and Glass Joe fixes. Host/client and runtime
launchers remain under the versioned experiment. See
`reviews/hosted-integration-1/HANDOFF.md` and `app/hosted-source-manifest.json`.
Actual branch upload status and commit identity are recorded in PR #3 and its
publication receipt; main merge/tag remain separate decisions.

The checkpoint below is historical and describes the earlier offline-only kit.

---

# v17.1 hosted-world release checkpoint (source pending Git import)

- Experiment: NES Forge 3.x; not a native ROM patch.
- Issue: v17 Forge WORLD Live client rejected its bundled protocol-13 localhost host as incompatible protocol-12-only.
- Correction in supplied complete kit: accept only protocol 13 and report real compatibility in WORLD Live guide.
- Synthetic/browser/server checks: **14/14 passed** with `python tests/test_v17_world_load_compatibility.py`.
- Reorganized complete local review ZIP: `NES_Forge_v17_1_RepoReady_Restructured_Complete.zip` (provided separately; not a Git blob).
- Editor entry in supplied kit: `NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html`.
- Editor SHA-256: `bf89a5553ab7910e9725c6cb9e48f2deac22ec539343452de34cc3f186239c99`.
- Localhost server SHA-256: `db4aeef39a511c60ccde8164bf6a7993d2c2c9f62e0ea2d52920b5c6c9266ca0`.
- Original complete kit ZIP SHA-256: `7330362a6896ca63d65df1cb1ef7aa2bfe99e627967dab8884d74126aa786d20`.

**Important:** The actual v17.1 editor, server, player and test implementations have **not yet been pushed to this branch**. This file is a reproducibility and layout checkpoint only. No native game fidelity is asserted by the synthetic regression.
