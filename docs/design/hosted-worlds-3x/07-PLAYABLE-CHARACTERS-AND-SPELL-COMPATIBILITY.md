# 07 — Playable Moblins, source-compatible magic and restrained new abilities

**Status: player design preference / proposed technical contract (2026-10-26), not an implemented or verified feature.**

## Intent: recognizable characters, not stat inflation

A collectible Moblin should feel like a **Moblin you control**, not Link wearing a Moblin costume, and not a boosted “+20% damage” NFT with an invented premium moveset. The same applies to Iron Knuckles, Dark Link and other source-verified actors.

For all players, Attack/Magic/Life remain capped at 8. Collectible scarcity and entitlement unlock **identity / legal placement / playable role**, not greater base damage, magical advantage, additional levels, automatic spell mastery or superior health. Cosmetic vanity and new super-spells are *not* the foundation of the design.

## Three separate contracts

1. **Native character source profile.** Verified animations, movement, weapons, attacks, defensive behavior, collision, magic compatibility where source exists, and unknown/incomplete recovery data. A Moblin's recognizable spear throwing is sourced from Zelda II; the original enemy does not thereby become a native spellcasting protagonist.
2. **Playable control adapter.** Maps user input and accepted actions to that actor's reachable states without pretending unrecovered native control logic exists. Avatar-specific appearance/animation must not modify authoritative damage or progression simply because art differs.
3. **Spell compatibility profile.** For each of Zelda II's existing eight spells, explicitly identify canonical spell **effect**, prerequisites/cost/progression, casting animation/effects support, critical quest reachability and fairness. A player having learned a spell does not mean every avatar's body can automatically represent its original effect without an adapter.

## Default rule: original spell effect first

- **Preferred:** same unlocks, MP cost, authoritative outcome and progression conditions; adapt casting pose/visual FX to character anatomy.
- **If visual presentation is unusual but gameplay semantics work:** use a legible neutral FX/temporary native transformation. Example: Fairy is a **complete transformation** into its special travel form; don't slap tiny wings on a Moblin and call it native Fairy.
- **If action mechanics do not fit:** explicitly mark the compatibility gap and test a source-faithful variant, temporary allowed form swap, or a **ruleset-defined** alternative that does not bypass the original requirement. A missing sprite/animation alone is *never* grounds to invent a new spell.
- **If a spell is essential to original quest completion:** ensure each eligible main/avatar has a legitimate way to perform the original progression action. Don't make a rare avatar trap players in an unwinnable quest or require an NFT for access.
- **Any genuinely new spell:** optional **Hosted Worlds extension**, independently balanced, server-authoritative, declared in ruleset metadata, never misrepresented as native Zelda II or sold as mandatory access to power.

### Moblin prototype compatibility matrix (design hypotheses)

| Native spell | Moblin initial mapping | Follow-up |
| --- | --- | --- |
| Shield | Potentially compatible as the **same defensive effect** using a visual ward; not a literal carried shield | Validate no unapproved combat modifications |
| Jump | Potentially compatible: same high-jump effect with Moblin jump/control adapter | Validate geometry, platform reach and sprite collision |
| Life | Compatible in concept: same MP expenditure and healing | Match native heal ceiling/timing |
| Fairy | Needs **full native-style Fairy form**, not a Moblin-with-wings cosmetic | Ensure transitions, doors and returned form remain canonical |
| Fire | **Unresolved**: native Fire is tied to sword projectiles; don't silently create flaming thrown spears with different range | Model native projectile semantics or explicit hosted-only variant |
| Reflect | **Unresolved**: Link's shield has original interaction; Moblin lacks an established shield animation | Determine whether adapted native reflection is equitable or requires legal form/action |
| Spell | **Unresolved**: original world/actor effects and critical quest use must be retained | Source-verified outcomes and state gating needed |
| Thunder | May preserve native MP/area effect, but **raid-wide area effects require special balance and authoritative targeting** | Source vs hosted crowd behavior clearly separated |

This is **not** a blanket approval to grant all eight spells to all enemy avatars automatically. User intent is to **reuse existing spells where they make sense**, evaluate remaining spells case by case, and introduce a new one only if a real character/action problem makes that worthwhile. The alternative must not block native game completion.

## Combat fairness

- A controlled Moblin can look/attack like a Moblin and, when authored and validated, use source-inspired spear attacks; it doesn't inherit original enemy-only HP/damage or add damage simply from owning the character.
- Authoritative server applies capped player stats, verified weapon/action recovery and a versioned competitive ruleset. A different weapon style may require an explicit balance profile, not a stealth damage buff.
- An elite enemy or final boss collectible used as a **main** does not itself grant the original boss's AI, invulnerability, quest flags or health.
- In PvE and PvP, preserve readable hitboxes, tells and action timings; skin choice cannot produce invisible attacks or avoid server collision checks.
- Rarity tier remains supply/ownership distinction, **never intrinsic power**.

## Proposed tests

- Recovered Moblin remains recognizable in movement/attack poses and cannot fabricate unrecovered native states.
- With identical Attack/Magic/Life/MP, changing playable avatar does not change unapproved base damage or game state.
- Shield, Jump, Life retain the same server-owned spell effect; Moblin visuals differ but durations/costs do not.
- Fairy transformation has consistent entrance/door traversal and back-transition; no arbitrary skin-only bypass.
- Fire, Reflect, Spell and Thunder remain explicitly blocked/diagnosed until real compatibility paths are verified; original Zelda II mandatory quest route remains achievable.
- Server rejects client-proposed magic costs, unearned spells, unsupported actor transitions and illegal raid effects.
- No collectible or extra spell is required to complete base Zelda II quests; no new hosted spell is claimed NES-native by default.

## Open decisions

Should all playable actors share the same eight learned spell **effects** with adapted visuals, or should some be replaced by mechanically equivalent (and fully validated) actor-specific moves in Hosted Worlds? What exact baseline weapon damage, range and attack-rate fairness rules should compare Moblin spear, Link sword and Iron Knuckle sword/shield? Do playable bosses get only cosmetic identity or a small number of explicitly balanced source-authentic moves? Hold these choices until actual native recovery and controlled play tests.
