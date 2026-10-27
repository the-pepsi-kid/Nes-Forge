# 01 — Round lifecycle, permanent XP, spawn and collectibles

**Status:** design intent, with recommendations/open issues labeled. **NOT implemented/verified in alpha.1.**

## Guiding rules

1. **No permanent lockout.** Losing every structure and spawn returns the player to a safe shoreline (“beach noob”) spawn with an accessible PvE recovery path.
2. **Character progression is durable.** Attack / Magic / Life are capped at **8** and retained after three lives are exhausted. Mythical “level F” was discussed but is **deferred/not part of baseline**.
3. **Unspent XP survives Game Over.** XP decreases only through explicit, authorized spending; death/territory loss is not an XP debit. XP already spent on buildings must be earned again if those buildings are destroyed or captured. Retain transaction history and atomic balances.
4. **Territory is lost only when actually captured or destroyed**, not simply because its owner loses a round. Owned, active spawn-eligible palaces/towns/bases/outposts remain available until seized.
5. **Wallet minting is opt-in** and preserves ownership of eligible collected discoveries, not infinite consumable gameplay powers or original quest shortcuts.

### Important native distinction

Original Zelda II **retains acquired Attack/Magic/Life levels** on Game Over, but normally resets unspent XP progress toward the next level. **Keeping all unspent XP** is a deliberate Hosted Worlds override; do not label it native behavior. Zelda II originals, item and spell acquisition, and ordinary quest progression should not be destroyed by the hosted round-loot penalty. The original extra-life behavior likewise remains authoritative in native mode.

## Three-life round

- Start a round with the configured original-style three lives; original Link Doll / 1-UP locations and functional effects remain available, plus transparently configured admin placements or imported project-defined locations.
- Losing one life uses the active legal Fairy checkpoint or other eligible round respawn.
- Losing the last life triggers **Game Over** and a new round. Forfeit only **unsecured hosted round collectibles** and expiring temporary effects. Preserve durable levels, unspent XP, wallet entitlement records, native quest progress and territory not actually conquered.
- At new-round spawn selection, display only accessible/active locations controlled by this player and reachable under the World/ruleset: designated palace, town, cave outpost, base, eligible camp, etc. Cannot select an enemy-controlled or physically invalid tile.
- If no controlled spawn exists, choose a protected, navigable **shoreline fallback** rather than arbitrary ocean coordinates. Initial anti-camping grace, non-blocking exit, available enemies and acquisition paths are mandatory.
- **Fairy Camp scope:** proposed camp structure remains in the World after death, while a *temporary Fairy respawn binding* may expire at Game Over. Whether it can be immediately reactivated or selected as a durable camp spawn is **open**. Do not conflate it with original Zelda II Fairy spell.

### PvE recovery guarantee

An undefeated level-8 veteran with no structures may grind original enemies again, earn additional **spendable** XP and rebuild. Spawn safety and progression-path validator prevent hostile factions from permanently sealing all PvE access. Being homeless does **not** reset permanent XP/level. PvE play without connecting a wallet remains viable.

## XP accounting

Persist character level progress and spendable XP with server-authoritative atomic transactions. Proposal: record source (enemy reward, quest, authorized admin grant), amount, balance, spend purpose, transaction ID and replay/idempotency key. A client may request a purchase; it cannot award itself XP. Balance cannot underflow on concurrent build/buy requests. Attack/Magic/Life all hard-cap at 8.

**Open economy decision:** Zelda II’s original leveling thresholds and Hosted construction spending can either draw from one canonical XP balance with carefully specified spend events, or from *separately accounted portions* of earned XP. The player expressed “XP only lost by spending”; avoid inventing a second grind currency or changing level thresholds without a deliberate rule contract. Existing tentative **20 XP Fairy Camp** price is a proposal, not yet final balance.

## Discovery → secure → preserve (optional wallet)

| Stage | Server-owned state | Outcome |
| --- | --- | --- |
| Discover | Eligibility verified from authoritative enemy/quest/World event | New eligible item recorded for this round |
| Carry | Item still unsecured | Lost on Game Over according to hosted round policy |
| Secure | Reach allowed town/safe mint point and complete server checks | Player can choose to mint |
| Mint | Uniqueness, wallet control, finality and replay rules verified | Durable ownership/entitlement record |
| Redeem | New round attempts authorized use | May require original item/quest prerequisites; cannot spawn infinite lives or bypass progression |

Wallet connect must prove address control with a signed, scoped, expiring nonce; never request a seed phrase/private key. Public token metadata must avoid embedding proprietary Nintendo assets or misrepresenting IP rights. Chain fees, mint permissions, failure/retry behavior, ownership transfers, token binding to game accounts and off-chain reconciliation remain **open**. A wallet is not a prerequisite for ordinary gameplay.

**Eight rarity tiers**: proposed 1–3 common, 4–5 uncommon, 6–7 very rare, 8 exceptional. Rarity primarily governs collectible scarcity/visual distinctions and eligibility; it does *not* become a combat stat, permanent 1-UP generator, or higher-level Hammer. NPC/native quest items retain native functionality.


## Leveled collectible enemies and server-mode refinement (2026-10-26)

Actor collectible **levels 1–8** are a **hosted extension**, distinct from native Zelda II character stats and source enemy combat values. The server awards a fixed level when an eligible actor is found; odds are weighted by the player's existing progression and encounter conditions. **Actor levels 6–8 are incredibly rare even for advanced players.** Minting preserves the awarded actor/level and does not upgrade it. For enemy collectibles, level-linked scarcity is the default; avoid inventing an unrelated second rarity roll. Drop percentages are **not settled**. The original eight collectible color/rarity ideas remain visual classifications only until owner-approved supply rules exist. A No-Mint Quick Raid mode uses the same XP/drop/combat algorithms but no chain connection or durable NFTs; match XP persistence is pending. [See full specification](09-LEVELED-DROPS-XP-AND-SERVER-MODES.md).

## Colored item variants

Palette variants, a consistent small badge/outline, and optional **browser-only** sparkle can signal rarity. Native NES sprite hardware offers four sprite palettes per frame, each with three visible colors and transparency; a full set of eight distinct simultaneously assigned sprite palettes cannot be assumed compatible. Hardware export uses strict palette validation; browser skins may offer more colors but should retain recognizable silhouettes and non-color cues.

## Boundary tests (to be created, not claimed passing)

- Three lives exhausted; levels 1–8 and unspent XP untouched; spent funds deducted exactly once.
- Last-life Game Over loses unsecured eligible loot, retains minted entitlements and native quest items.
- Territory remains owned after death; location transfers only by completed conquest; valid spawn choices update.
- All locations lost gives reachable protected shoreline spawn; no permanent PvE denial.
- 1-UP pickup and respawn limits have deterministic, non-farmable policy; offline/reconnect duplication blocked.
- Mint requires server discovery/eligibility, authenticated wallet control, and nonrepeatable claim; chain reorg/failure handled.
- Two clients with distinct skins see identical inventory state, ownership, earned XP and combat results.
