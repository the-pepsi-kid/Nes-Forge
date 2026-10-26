# 06 — Mintable NPCs, Defenders, Bosses and Playable Avatars

**Status:** proposed 3.x collectible and deployment contract; neither implemented nor approved as part of alpha.1. Snapshot: 2026-10-26. This proposal *refines* the earlier "mint rare equipment" discussion and may supersede the idea of giving native items and spells rarity-based power levels.

## Core idea

Keep ordinary **Zelda II items and the existing spells** at their source-defined functionality. Do **not** introduce item and spell power tiers merely because rarity tiers exist. A rare collectible instead represents a **server-verified entitlement to deploy an eligible actor/NPC**, and in some cases use its **playable avatar/visual presentation**.

Minting, NFTs and the wallet must remain optional. Non-wallet players must be able to complete native quests, use baseline healing/magic services, access travel NPCs, level to 8 and recover via PvE without a marketplace.

## Actor entitlement roles

| Entitlement | Possible hosted usage | Limit |
| --- | --- | --- |
| Decorative NPC | Populate and personalize an owned town, choose legal cosmetics/dialogue | No unapproved powers |
| Service NPC | Health restoration, magic restoration, eligible ferry/bridge access, other *verified* source NPC actions | World/prerequisite access, server cooldown/location checks; don't monopolize native quest access |
| Quest NPC | Author-approved side quest clue, favor, town HQ investigation or service hook | Source-supported, deterministic and proven solvable; cannot mint arbitrary unearned rewards |
| Ordinary or elite enemy | Place as a defender in a permitted outpost/town/palace/eligible cave site | Original AI/stats if claimed native; server caps for density and farming; no permanent public-route blockade |
| Palace guardian / boss | Host-defined palace boss encounter and conquest objective | **Palace-only boss deployment**. Native boss's original quest flags separate from repeatable hosted claims |
| Playable avatar unlock | Display actor identity (and where validated, input-mapped movement/attack animation) as player's main character | Still limited to balanced 1–8 Attack/Magic/Life; no automatic enemy/boss HP, AI powers or invulnerability |
| New hosted spell (optional) | Separate non-native spell/ruleset extension | Not part of core Zelda II spell list; requires opt-in server ruleset and balance, no pay-to-win mandatory traversal |

### Examples linked to original Zelda II

- **Blue Iron Knuckle**: prestigious elite defender using its original recognizable shield/sword combat pattern; optionally playable with an explicit player-control adapter. The NFT never gives the player the enemy's full AI, HP or damage just for selecting its appearance.
- **Link's Shadow / Dark Link**: exceptionally scarce example for a boss-role entitlement, palace encounter and selectable avatar. The *original* Dark Link final encounter remains tied to the Great Palace quest. Hosted deployable duplicates are explicitly **hosted extension instances**, never silently substituted for the native final boss.
- **Healing / magic-restoring NPCs**: native-style services inside a town, with defined usage/placement policy. Service availability in the original game's towns remains assured for normal play.
- **Saria River Man**: the original Bagu-note quest gate must remain respected. A hosted ferry operator at an author-created port may be permitted only by a separately declared, reachable transport ruleset—not by giving a token owner permission to bypass Zelda II progression.

## One collectible != one continuously spawning mob

Separate five layers:

1. **Canonical actor definition**: original/source-verified identifier, animations, states, services, AI, collision and native capability coverage.
2. **Collectible entitlement**: unique, eligible recorded acquisition and optional wallet token. This is an ownership/license record *within Forge rules*, not a grant of copyright.
3. **Deployment**: server-owned active instance with placement ID, World revision, location, owner, capabilities and health/state. Owner is constrained by placement quotas, capture rules and ruleset.
4. **Avatar mapping**: optional separate license to use a character as controlled player; source visuals mapped to a player-compatible input and animation adapter.
5. **Ruleset/profile**: explicit native-compatible behavior vs hosted extension; server-authoritative stats and access.

**Recommended default:** a collectible permits **one active deployed instance at a time**, with transfer/reclaim/cooldown and persistent placement record. Different token supplies, enemy squad capacity, and redeploy rules remain open. Owning a token doesn't mean summoning unlimited copies or farming endless XP. Server validates whether the owner still controls a deployment site.

**Mint eligibility and provenance:** every claim is issued by the authoritative server from a verified quest, PvE/PvP encounter, discovery or explicit controlled administrator grant. Wallet signature proves ownership, not success of gameplay event. Duplicate/replay mint requests fail. No static private key or seed phrase is stored by Forge.

## Playable enemy and boss constraints

Playable roles require their own **input-to-actor adaptation**: stand, run, jump, crouch, attack, defense, spell usage if permitted, animation/frame events, platform hitboxes, camera and terrain interactions. An enemy sprite sheet does not automatically supply a valid controllable avatar. Unknown native frames or actions remain clear diagnostics, not guessed native fidelity.

All players remain subject to 1–8 character progression and compatible PvP hitbox rules; no avatar grants an unearned level. Native Iron Knuckle or Dark Link special moves must be explicitly modeled and balanced. A player avatar can look like Dark Link without the game's final boss invulnerability/AI or unintended special stats.

**Scarcity != combat scaling.** Eight rarity tiers may express supply and achievement difficulty. Scarcity of a blue Iron Knuckle or Dark Link entitlement does not automatically increase their attack, health, magic or block quest progress. Competitive servers may restrict rare avatars to approved cosmetic silhouettes where visual fairness matters.

## Town and palace gameplay ties

- Player-owned towns gain theme, ambience, repeatable legal NPC services and solvable quest networks for infiltrating the secret HQ.
- NPC quests and healing must remain available through native gameplay; a wealthy player cannot prevent all others from advancing by monopolizing services.
- Defensive enemy placements use verified original enemy mechanics and configured room/area quotas.
- Boss placements allowed **only in palaces**, and a boss capture event does not erase original Great Palace/Triforce progress.
- Owners can eventually lose a deployment site through a completed capture; possession of the NFT survives territorial defeat, but the right to deploy in conquered territory does not.
- Minted entitlement remains distinguishable from **unminted round loot**, which is forfeited at Game Over under the proposed round policy.

## Public-NFT rights warning

Nintendo characters, sprites, names and derived artwork do **not** become freely redistributable/commercializable just because a ROM was privately imported or the graphics were redrawn. A public NFT/marketplace using Zelda II-specific identity or artwork needs separate intellectual-property review and necessary permissions. Public demonstration and initial on-chain tests should use **original/appropriately licensed Forge actors**, while preserving an isolated private source-linked Zelda II compatibility exercise. Token ownership does not confer ownership of Nintendo IP, perpetual server support, or a right to unrelated services.

## Decisions still required

- Which encounter types and quest events earn a collectible entitlement, and how rare?
- Are non-wallet account-bound unlocks available for the same actors?
- NPCs available as player avatars, or only enemy/boss categories?
- Can one token be deployed **and** used as a player's avatar simultaneously?
- Does a token allow one active spawn at a time, a fixed number, or a durable building blueprint with controlled respawns?
- What services can minted NPCs offer without undermining normal Zelda II NPC progression?
- How do captured structures affect deployed defenders and token retrieval/redeployment?
- Should *new spells* ever be minted? If so, entirely separate hosted ruleset and balancing/copyright controls.

## Acceptance cases — not yet executed

- Mint eligibility is server-derived and unforgeable; same collectible cannot be minted twice.
- Non-wallet player can still finish every native mandatory quest, use baseline NPC services and reach all original required exits.
- Blue Iron Knuckle enemy behavior remains server-authored; playable version respects capped player stats and accurate input bindings.
- Palace-only Dark Link boss placement rejected for towns or caves; original Great Palace final boss unaffected.
- Capturing territory removes deployment privilege but neither token ownership nor character level/XP.
- Two concurrent clients can't duplicate limited placements, XP rewards or NPC service consumption.
- Skin swap and alternative playable avatar leave authoritative PvP hitboxes unchanged unless a distinct, reviewed ruleset explicitly alters them.
- Tokenized public content undergoes provenance/legal review before release.
