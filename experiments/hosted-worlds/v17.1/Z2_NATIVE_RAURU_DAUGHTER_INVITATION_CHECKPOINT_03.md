# Z2 Native Gameplay Discovery — Checkpoint 03: Rauru daughter invitation

**2026-10-26 | Source-game observation, original-ROM emulation | Hosted Worlds feature NOT implemented.**

## Verified observations

- Continued source-record replay from boot → North Palace → West Hyrule → Rauru Town east (area 44, scene 2) → native west passage (area 44, scene 1).
- Under original NES Left/Right and sword/talk B controller inputs, found the female NPC outside the western-town house that displays the dialogue starting **“TALK WITH MY”**. This is the invitation to speak to her father; unlike a prior, nearby villager's **“FIND THE HEART...”** hint, the two interactions have distinct proximity and actor identity.
- This behavior was reached **without RAM writes, patched ROM, teleport or artificially granted spells**.
- New scenario: \`tests/native_scenarios/z2_rauru_daughter_invitation.json\`. With the previously published project-agnostic \`tests/native_gameplay_replay.py\`, it passed **39/39 checkpoints** against the user-provided private Zelda II ROM in a local NES Forge browser emulator.
- Invitation checkpoint: executed frame **3400**, sampled \`$0748\` (area)=44, \`$0561\` (scene)=1, \`$0766\` (dialogue state)=1, \`$0796\` (sword technique flags)=0. Renderer shows original text beginning “TALK WITH MY”. \`$0766\` is **only a diagnostic message-state indicator**, not a Shield learned flag.
- The tested state transition is native-source observation only. **No player has yet obtained Shield during this playthrough**, and the hosted client does not implement the teacher quest.

## What remains pending

1. Complete the woman's actual conversation and confirm opening of the correct door.
2. Enter her house through original controller input, cross the interior, descend to basement, speak to the Wise Man.
3. Observe the **actual Shield spell grant** (before/after gameplay memory diff). Prove it through native spell menu selection, MP cost, defensive effect and persistence; identify/confirm spell-state flag via original CPU/gameplay tracing.
4. Turn the original actor + interaction/quest evidence into a source-specific gameplay adapter that exposes NPC identity, interaction radius, teacher grant, per-player learned ability, and authoritative multiplayer server rules.
5. Add integration acceptance: two players in the same town share room/world but retain independent spell unlocks, and no client can spoof NPC grants.

**Do not label the Shield spell “recovered” merely because the invitation dialogue was observed.** Native Zelda II input/scene behavior must be preserved. No source ROM bytes, private save states, screenshots or artwork are committed to GitHub.

## Reproduce privately

From \`experiments/hosted-worlds/v17.1\`:

\`\`\`sh
python tests/native_gameplay_replay.py \
  --rom "/private/zelda2.nes" \
  --html NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html \
  --scenario tests/native_scenarios/z2_rauru_daughter_invitation.json \
  --out private-rauru-invitation-evidence
\`\`\`

The private evidence ZIP provided to the owner contains actual screenshots and the full 39-step report; GitHub includes only the replay instructions, source-neutral test code, and derived diagnostics.
