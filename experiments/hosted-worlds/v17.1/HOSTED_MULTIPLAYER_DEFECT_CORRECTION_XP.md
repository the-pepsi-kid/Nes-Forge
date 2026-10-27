# Hosted Worlds multiplayer — XP retention integrated

**Branch candidate:** `experiment/hosted-worlds-layout-v17-1` · **Scope:** bounded synthetic/pilot behavior, not native Zelda II combat fidelity.

## Defect and correction

The existing explicitly opted-in `--simulate-encounters` combat path set `players.xp=0` upon an enemy-caused defeat. That contradicted the approved Hosted Worlds rule that earned Attack/Magic/Life levels and **unspent XP** persist after defeat and Game Over. The original Zelda II cartridge's unspent-XP behavior is different; this correction is intentionally **hosted-only**.

The updated defeat branch removes the XP reset, does not change the earned-XP ledger or attained stat levels, and journals `retainedUnspentXp` and `hostedXpRetention:true`. It does not change the DB schema, protocol 13, source ROM, browser visuals, wallet, admin auth, or project editor.

## Validation

From `experiments/hosted-worlds/v17.1/`:

```sh
python tests/test_hosted_defeat_xp_retention.py
python tests/test_progression_gameplay.py
python tests/run_alpha_acceptance.py
```

The new focused test checks eight synthetic behaviors, including retention after SQLite close/reopen, audit data, repeat-attack rejection, and default-disabled demo encounters. This test was executed on the local complete review kit before this Git integration (8/8); existing progression also passed there (13/13). **The full acceptance runner on the reconciled GitHub checkout has not been proven green by those local checks.** Run it from a fresh checkout, record the results, and keep skipped/private-ROM tests distinct.

## Remaining boundaries

- The pilot enemy simulator is disabled by default and is not source-recovered Zelda II enemy AI.
- Three-life Game Over, actual collectible enemy drops, minting, full palace conquest and native transition graph are **separate future features**.
- Link pose selectors 8/9 are source-derived art; hosted jump arcs, damage=8 and provisional hitboxes are still not recovered native mechanics.
- The main 2.0 release and original Pepsi archive remain untouched.
