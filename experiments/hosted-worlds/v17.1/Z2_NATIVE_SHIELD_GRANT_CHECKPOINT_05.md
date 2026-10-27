# Zelda II — Checkpoint 05: Shield learned from the actual Rauru Wise Man

**Date:** 2026-10-26. **Source:** original user-supplied US ROM, NES Forge emulator with original NES controller button state. **No ROM byte modifications, player RAM writes, location warp or auto-granted quest items.**

## Directly observed original-game progression

Full native-control route: title and player registration -> North Palace -> West Hyrule -> Rauru east (area **44**, scene **2**) -> west (scene **1**) -> woman's original B-dialog invitation ("TALK WITH MY...") -> Up through unlocked doorway -> brick house (scene **48**) -> right through the interior and past an ordinary purple house NPC ("EACH TOWN...") -> walk right off house passage into **basement scene 36** -> approach the original Wise Man.

Observed transition from house scene **48** to basement scene **36** with area still **44**, passing a brief scene-loading state, then the native blue-brick basement. **This is direct game execution, not a predicted or reconstructed hosted-world route.**

**Shield grant measured in original NES RAM:**

| Emulated frame | Area | Scene | $077B — Shield learned? | $0796 — sword techniques |
| --- | --- | --- | --- | --- |
| 4283 | 44 | 36 | 0 | 0 |
| 4293 | 44 | 36 | 0 | 0 |
| **4303** | **44** | **36** | **1** | **0** |

The transition happened while approaching the Wise Man using **Right** on the original controller, with **no RAM write**. This establishes a real source-game **NPC proximity/teaching event** as the immediate gameplay observation, not simply an available spell graphic or hardcoded reward. The subsequent original Wise Man dialogue shows "IN PARAPA DESERT USE THIS MAGIC ..." and the Shield possession state remains 1.

RAM $077B is also documented as Zelda II's Shield possession byte in https://datacrystal.tcrf.net/wiki/Zelda_II:_The_Adventure_of_Link/RAM_map ; the independently observed change directly confirms its role in this player path.

## Multi-event provenance

1. **Rauru west room entry**: source room transition (2 -> 1) observed; no item granted.
2. **Female NPC invitation**: message and authorization to enter; not itself Shield ownership.
3. **Doorway Up interaction**: scene 1 -> 48; no Shield flag.
4. **House purple hint NPC**: "EACH TOWN..." informational; **not** spell teacher.
5. **House right-edge passage**: scene 48 -> 36, originally scripted room transition; still no Shield on first basement frames.
6. **Wise Man contact in basement**: scene 36, Shield flag $077B 0 -> 1, no sword-technique changes.

These are separate entities, triggers, locations, and gameplay effects. The native-world event model should represent them separately even when rendered in the same town/canvas.

## Reproducibility and limits

**Direct original-ROM execution succeeded** with full input/RAM log, native scene screenshots, Wise Man contact and live $077B transition. Private original-game screenshots and log were delivered to the user separately; **do not commit copyrighted ROM or art**.

New fixture \`tests/native_scenarios/z2_rauru_shield_native_grant.json\` is a **50-step end-to-end replay candidate**, with independent assertions that Shield was 0 before contact and 1 afterward. It is **not yet a passing generic replay**. Two fresh generic harness attempts hit Forge's \`Frame exceeded 200 ms safety budget\` guard at earlier, unrelated frames (one before the first checkpoint, one at North Palace). This is recorded as an **emulator/harness reliability blocker**, not as a failed Shield gameplay transition. The previous invitation-only **39/39** test passed and the separate direct 4303-frame playthrough completed.

**Not verified yet:** completing teacher dialogue; selecting Shield in its original spell menu and casting with actual MP consumption; original defensive half-damage effect and spell-persistence behavior; source machine-code teaching predicate; source-rebuilt ROM parity; server implementation; native physics/hitboxes. **Do not mark those complete.**

## Next tasks

1. Capture native spell menu and cast in a safe area, with MP change and original defense semantics compared against no-Shield.
2. Improve the generic replay runner's session checkpointing and classify/reproduce its intermittent 200ms frame guard without disabling safety features or rewriting ROM state.
3. Recover NPC/door/teacher event semantics through original emulator CPU+RAM tracing and model them as an independent Zelda II game adapter. Keep the core recorder project-agnostic.
4. Hosted World: one server-authoritative NPC grant per eligible individual player, persistence and spell costs, no forged unlock messages, plus two-player consistency test.

**Review-branch documentation and fixture only.** No new hosted gameplay feature is represented as implemented.