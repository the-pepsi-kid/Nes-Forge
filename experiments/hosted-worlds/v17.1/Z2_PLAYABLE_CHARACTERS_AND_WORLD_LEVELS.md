# Zelda II Gameplay Fidelity — Player Characters, Progression, Regions

**Status:** Scoped experimental design and bounded localhost pilot, not native gameplay recovery.

## Product rule

Retain the original Zelda II content roster and mechanics. The hosted raid world's additions are networking, wallet verification, per-player state, camps/palaces, XP-funded defenses, persistence, moderation, and live deployments. Do not invent Zelda II spells, RPG attributes, NPCs, enemies, items, body rigs, level-based terrain hazards, or encounter groups. A placeholder must be marked unverified and kept out of the normal gameplay pathway.

## Original player stats and experience

- Attack, Magic and Life, each levels 1–8. Attack affects damage dealt; Magic lowers original spell costs; Life lowers damage suffered. These are *not* three max-meter capacity upgrades.
- Heart Containers and Magic Containers increase the meter capacity from the initial four containers (64 units) toward eight (128), where available through the original game progression.
- Western NES threshold table is codified in `Z2_AUTHENTICITY_GUARDRAILS.json`; note regional and Famicom revisions differ.
- The original level-up presentation has a NEXT choice, options to skip/cancel, and save/game-over XP loss. A world with persistent camp spending is necessarily an explicit hosted-world economy policy, not byte-faithful original XP accounting. Preserve already-earned stat levels separately from remaining spendable XP.
- XP rewards may be awarded only by known original enemies and point bags, with validated game-specific values. Until native room encounter mechanics are recovered, admin-granted test XP is clearly labeled a TEST action.

## Playable character policy

Link is the source reference. Candidates for later support (not enabled yet): original Moblins, Goriya, Daira, Stalfos, Iron Knuckles, Geru, and appropriately sized Fokka. Consider smaller bosses only after sprite size, animation, and capability audit. This list is **not** a claim that those entities can already be played or use Link's sword/magic.

Each playable candidate requires proof of:

1. Asset identification (original CHR bank, pattern tiles, sprite palette, animation frame arrangement, player-scale body).
2. Four-direction overworld representation or a documented approved derived version; side-view standing/walking/jumping/attacking/hit/death animation.
3. Correct native hitboxes, motion restrictions, attack types, collision and pose timing.
4. How spellcasting (Shield, Jump, Life, Fairy, Fire, Reflect, Spell, Thunder), combat techniques (Downward/Upward Thrust), acquisition events, inventory and equipment map onto that body.
5. Two-player differentiation without changing the canonical definition of the original enemy type.

Until these checks pass, multiplayer uses a **diagnostic player marker** rather than a counterfeit Link sprite or novel character archetype.

## Overworld region/encounter recovery

The original NES game uses separate step and timer mechanisms. Sources document a step counter rollover around 16 steps with special starting-area exceptions, and timer scheduling that depends on terrain; encounters spawn weak/strong icons that then resolve to side-view groups based on *both location quadrant and terrain*. Safe roads are special, and items/terrain shape progression.

**Do not** equate terrain to universal difficulty level. Forest in one region does not imply the same enemy set as forest elsewhere. Record original map region, terrain category, weak/strong icon, regional enemy group, scene address/entry/exit, drop rules, cave/palace access, item gates, and whether the rule was verified in ROM execution.

The v0.5 host does **not** implement the original timer, weak/strong encounter sprites, northwestern exception, region tables, side-view physics, native audio, or scene transitions. A deliberately fake encounter simulator remains available only behind an explicit `--simulate-encounters` developer flag. It is disabled by default and must not be used to claim Zelda II gameplay parity.

## World leveling design decision still open

**Original map:** No global numeric biome level field. Original encounter tables, item gates, enemy strength and access constraints define difficulty.

**Hosted raid extension, to design later:** Optional territory/objective entry requirements (e.g., level-gated raft crossing), retaining traversal fairness and reachability. If enabled, show requirements as authored rules separate from original ROM mechanics. Don't silently replace native raft travel or known special-item gates.

## Recovery sequence

1. Verified Link CHR/metasprite/pose, movement, collision and attack animation under emulator evidence.
2. Verified original regional overworld encounter triggers, weak/strong markers, timer/step state, side-view encounter area selection and scene dispatch.
3. Actual cave, town, palace, raft, dock, exit/return and item-gate transitions.
4. Original side-view controller, attacks, combat, spells, enemy behaviors, drops, XP and level-up choices.
5. Only then introduce a playable enemy roster on canonical actor adapters, preserving their unique attacks and original art.
6. Validate shared room/world state and player-specific progression with two signed browser clients; native-ROM build path remains independent.

## References for research; not proof of ROM recovery

- Nintendo Zelda II manual: https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAASE_en.pdf
- Z2 encounter reverse engineering notes: https://kb.speeddemosarchive.com/Zelda_II%3A_The_Adventure_of_Link
- Original enemy/encounter index: https://gamefaqs.gamespot.com/nes/563487-zelda-ii-the-adventure-of-link/faqs/76382/enemy-index
- Z2 experience thresholds: https://www.neoseeker.com/zelda-ii-the-adventure-of-link/faqs/3028884-zelda-ii-aol.html
