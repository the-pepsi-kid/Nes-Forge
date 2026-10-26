# 09 — Leveled enemy drops, XP accounting and server modes

**Date:** 2026-10-26. **Status:** gameplay design intent and proposed engineering contract. **Not a shipped, balanced or verified alpha feature.**

This design refines [01 — round economy](01-ROUND-ECONOMY-AND-COLLECTIBLES.md), [08 — encounter drops](08-ENCOUNTER-DROPS-AND-ALLY-CONTROL.md) and the [decision register](04-DECISION-REGISTER.md).

## Player intent

A player explores or raids a World, defeats an eligible native enemy, and may acquire **that enemy as a leveled collectible**. Example: a player around level 2–3 is more likely to find a level-2 Moblin than an exceptionally powerful one. They can place it to defend their World, use it as their playable character where an adapter exists, or permit another player to control it.

**Levels 6, 7 and 8 must be incredibly rare discoveries,** across the entire supported progression. Do not automatically make high-level collectibles commonplace when the character reaches level 8. A high-level find is a meaningful event, not an ordinary upgrade or a special outfit.

Unminted found units are temporary round inventory and are forfeited on final-life Game Over. Minting is an optional way to preserve a **specific earned actor and its awarded level** in permanent inventory. Minting is not a level increase or a damage buff. Wallet-specific access is not required for basic play.

## Two independent notions of level

| Field | Range | Behavior |
| --- | --- | --- |
| Player Attack, Magic and Life | 1–8 each | Native-derived progression with the Hosted Worlds persistence policy; never exceed 8 |
| Captured/deployed enemy level | 1–8 | **Hosted extension**, awarded by server on collection; controls only validated deployable defender level/scaling |
| Enemy type | Native actor identity | Moblin, Iron Knuckle, etc.; retains source animations/identity and recovered AI |
| Token ID / permanence | Unique entitlement | Tracks which actor was earned and whether it was secured by mint; does **not** change stats |
| Native enemy behavior | Source-verified, not a level | Original enemy HP, attacks, hit timings and collision remain authoritative in native mode |

A "level-3 Moblin" refers to a **hosted actor level overlay** and must not imply that the original Zelda II ROM has leveled Moblins. Hosted scaling requires an explicit, versioned combat table; native ROM and source-game balancing are not silently modified.

For enemy collectibles, **default scarcity should derive primarily from awarded level, not a second unrelated eight-rank rarity roll**. 1–5 form the regular discovery pool with relative weighting to be tuned. **6–8 are exceptionally rare**; 8 is the extreme tail. Separately tracked species eligibility (ordinary enemy versus palace guardian) and collectible serial uniqueness may further constrain acquisition. Do not add another hidden rarity multiplier without an explicit owner decision.

## Server-authoritative drop generation

For each eligible, server-verified defeated encounter:

1. Verify original actor identity, reward eligibility, encounter/kill provenance and reward recipient; prevent farmed or fabricated attacks, self-owned defender exploit rewards and repeated event claims.
2. Determine whether an actor collectible drops at all, using per-enemy/source rules. **Drop chance is distinct from awarded level.**
3. If awarded, calculate a **progression reference** from Attack/Magic/Life using an explicit published server-ruleset formula. The player did not yet decide whether it should be a maximum, average, specific stat, or other effective combat level. Record it in the event for auditing.
4. Select a collectible level 1–8 from a ruleset-controlled, deterministic, weighted distribution conditioned on (enemy species, native encounter difficulty, progression reference, World/mode, event ID and seed). Weight nearby early levels higher for early players: e.g. around level 2–3, level 2 should be a reasonable/common outcome.
5. Enforce a **strict low probability of 6, 7 and 8 at every player level**. Higher progression may improve odds without eliminating the rare tail constraint. Exact percentages, upper-level eligibility gates and rarity supply caps are **undecided**; the earlier illustrative 25/40/25/8/2 chart was not approved.
6. Issue a **single** server-signed/idempotent item entitlement with the level locked on acquisition, source actor ID and ruleset version. Do not reroll on reconnect, browser refresh, capture or minting.
7. When minted, bind the entitlement ID and locked level to permanent ownership. On final-life Game Over, forfeit only unsecured round entitlements, not native quest items, earned permanent levels/XP or successfully minted units.

**Proposed default:** drop level fixed when found; no player-paid level-ups on minted collectibles unless explicitly authorized later. A lower-level attacker may obtain a lucky higher-level unit, but deployment quotas, AI and server balancing still apply. Preserve native entity behavior where recovered; hosted level scaling must not fabricate original-ROM accuracy.

### Rarity calibration and observability

Before declaring exact rates, run deterministic simulations and gameplay tests by progression bands; publish distributions, expected findings/hour, tail frequency, expected time to first 6/7/8, and accumulation under multiple players. Measure normal PvE, boss encounters and raid farming separately. Anti-exploit protections, controlled random seed/roll audit, replay/duplicate defeat immunity and server-side inventory persistence are mandatory. Never promise blockchain rarity while an unrestricted server can issue indistinguishable entitlements.

## XP system — setup and boundaries

### Existing player intent

- Attack/Magic/Life cap at **8**.
- **Attained levels and unspent XP survive Game Over**, respawn, reconnect and loss of all territory.
- XP is deducted only by an explicit, validated player-initiated spend (e.g. legitimate level-up or hosted construction); no accidental death penalty or capture deduction.
- Original source-defined enemies and quests provide the gameplay basis for XP acquisition; hosted-world rewards and adjustments must be transparently labeled.
- PvE must remain available even after being driven to the protected beach. No wallet required for XP or leveling.

### Proposed authoritative event/ledger model

| Record | Required fields |
| --- | --- |
| XP event | Immutable event ID, player/character ID, World/mode, source actor/quest ID, native/hosted classification, ruleset version, server tick/time, integer amount, replay/provenance hash |
| Balance snapshot | Total earned, total explicitly spent, available unspent XP, character Attack/Magic/Life levels, revision/nonce |
| XP spend | Unique idempotency key, cost, spend purpose (native level or hosted construction), precondition, resulting balance and affected persistent object |
| Enemy reward | Source enemy XP value, any explicitly labeled host modifier, recipient and anti-farm validity |
| Match scope | Persistent-player progression or round/match ledger; never silently mix histories |

**Server invariant:** available XP = cumulative validated awards − cumulative committed spends; >= 0. A death or territory capture **does not create a spend transaction**. Use atomic checks for concurrent level-up/build requests, rollback failed purchases, reject replay IDs and store deterministic audit events.

**Original Zelda II XP mechanics should remain the basis of level thresholds, rewards and upgrades.** Before implementation, recover the original per-enemy rewards, level-up thresholds and any mechanics that restart/reset XP on death, stage or level selection. Hosted XP retention after Game Over is an explicit departure from native behavior, not an accidental assumption about the ROM.

### Major pending choice: leveling and construction

**Do not encode either approach by assumption.** The user has not yet selected between:
- **Shared spendable XP:** one auditable XP balance. Native-level purchases and Forge construction draw from it using explicit costs and non-duplicating state transitions.
- **Separated accounting:** keep source-game character progression XP fully native, and account for construction access through separately tracked budgets derived from specified play activity. This might alter user expectations of one XP currency and needs deliberate approval.

Additional open balancing: Can players spend XP for a native level while character progression is pending/auto-awarded in original Zelda II? How do level thresholds interact with construction spending? Are spell access/Attack-Magic-Life stat choices native-preserved? What XP does PvP grant, if any? What are camp/town/barricade construction prices? Earlier "20 XP Fairy Camp" was an example, not an approved cost.

### Reward abuse protections

No XP from killing one's own placed Moblins, controlled friendly units, repeated replayed raid events or reward loops. PvP XP, if approved, needs anti-collusion, farming caps, contested-siege settlement and anti-AFK rules. XP must be issued by the authoritative server, not client-reported damage or animation playback. On death or reconnect, the same award is never applied twice.

## Two server configurations, one engine

| Behavior | Persistent World with optional minting | Quick Raid / No-Mint server |
| --- | --- | --- |
| Canonical Worlds/actors/combat | Shared runtime, same source-supported mechanics | Same engine and combat contracts |
| Enemy drop and level generation | Yes, server-configured | Yes, server-configured |
| Collectible inventory | Round-unsecured + permanently minted entitlements | Match-only inventory; no permanent NFT |
| Wallet | Optional for token minting; never required to play | Entirely disabled, no wallet or blockchain call |
| Territory / deployment | Persistent ownership/capture (subject to siege policy) | Temporary match-owned bases, capture and placement |
| XP / character level | Durable hosted progression per above | **Open**: match-scoped recommended; reset on match completion |
| Game Over | Unsecured unit loss and eligible controlled respawn | Match-defined respawn/forfeit without carrying tokens |
| World/ruleset version | Pinned, explicit persistence migrations | Pinned per match, disposable state |
| Cross-server inventory | **Not assumed**; ownership and portability policy required | No transfer into persistent economy by default |

**Recommended implementation order:** quick no-mint test server for encounter rewards, level distribution, XP ledger, deploy/borrow actor, default enemy combat and abuse tests. Once correct, reuse the same server-side logic in persistent worlds; add durable identity/minting/persistence in separable layers. This is an implementation dependency recommendation, not a claim the feature is built.

## Required validation (not yet passing)

- For progression references around levels 2 and 3, deterministic large-sample simulations reproduce the configured weighting; 6/7/8 remain below the eventual owner-approved exceptional-rarity thresholds even at level 8.
- A level 3 mob drops a level 2/3/other awarded Moblin; the exact item level is consistent across mint, disconnect, World switch and deployment.
- Collectible level does not affect native-mode original enemy ROM behavior; only host-declared overlay stats.
- Game Over deletes only unsecured actor entitlements and designated round state; retains unspent XP, levels, minted inventory and surviving owned locations.
- Same earned encounter cannot issue collectible or XP twice. A player cannot grind their own stationed enemy for rewards.
- Atomic simultaneous spend requests cannot produce a negative XP balance or duplicate structures/levels.
- Native XP thresholds and quest-critical items have source coverage; unsupported native claims fail visibly.
- Quick Raid starts with no wallet dependency, no old minted inventory, and no balance/actor/territory leakage into the persistent World.
- Switching server mode/config does not change canonical hitboxes, source actor identities or original Zelda II magic/level cap without a separately versioned ruleset.
- Synthetic progression and drop telemetry is documented before live tuning; RNG and payouts are server controlled.

## Decisions pending owner review

1. Effective player progression reference for drop weighting (Attack, Magic, Life are **three** levels, not one).
2. Exact rare drop chances and any hard cap on minted supply.
3. Shared XP balance versus separated character/construction accounting.
4. Match XP reset/starting stats in No-Mint raids.
5. Actual native/hosted damage and durability scaling for leveled placed actors; no undocumented damage multipliers.
6. Acquiring/spawning multiple identical units, eligible species/bosses and encounter ownership rules.
7. Mint locations, fees, finality, rights and cross-server portability.

**Public IP reminder:** independently created/licensed actors are needed for publicly minted/marketed assets absent permission for copyrighted characters. Neither the token nor its level grants Nintendo character copyrights.
