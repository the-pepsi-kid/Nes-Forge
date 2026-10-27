# 04 — Design decision register

**Purpose:** keep the user's gameplay intent distinguishable from assistant recommendations, speculative examples, and already-implemented alpha code. The statuses below record the **discussion**, not an acceptance or release gate sign-off.

## Agreed direction in conversation (DESIGN INTENT)

| ID | Decision intent | Consequence |
| --- | --- | --- |
| D-01 | Forge is an engine/project model; graphics, effects, audio and browser skins are replaceable | Simulation does not depend on loaded artwork |
| D-02 | NES-native authoring/ROM recovery remains a separate compatibility path | Browser enhancements do not silently become NES-safe exports |
| D-03 | Attack, Magic, Life normally hard-cap at 8 | Raids should balance skill/preparation versus progression |
| D-04 | Retain attained levels AND unspent XP after all three lives are gone | Hosted-specific difference from native Zelda II unspent-XP reset |
| D-05 | Spending XP deducts it; losing lives, territory or possessions does not | Server-authoritative spend ledger, recovery grind for *new* XP |
| D-06 | Valid controlled palaces, towns, caves, camps/bases can offer spawn choice | Only captured/destroyed locations lose control; death alone doesn't forfeit them |
| D-07 | With no owned valid spawn, reappear at the safe shore/beach | PvE and rebuilding always accessible |
| D-08 | Original 1-UPs and documented admin/project additions exist in the World | Extra lives can extend the current round; abuse bounded |
| D-09 | Optional wallet minting makes eligible finds durable; unminted hosted loot is at risk on Game Over | Token ownership distinct from equipped/consumed gameplay benefits |
| D-10 | Palaces alone host bosses in this conquest design | Original bosses + crystal objectives are central to palace takeover |
| D-11 | Town takeover uses NPC favor/clue side quests to find a concealed player HQ | Quest graph must be solvable, no boss shortcuts |
| D-12 | Conquering a kingdom is “mini full Zelda II quest” scale | Capture multiple objective types, not one-click all-asset transfer |
| D-13 | Natural terrain and cave routes are shared; player-built defenses can obstruct specific entrances/outposts | Native traversal/access preserved, no permanent lockout |
| D-14 | Skins may be completely redrawn in the browser; rulesets remain a separate layer | Players can view same World in different skins while actions remain identical |
| D-15 | The recovery/model/rendering architecture must remain project-agnostic | Zelda II is test case, not platform hardcode |
| D-16 | Players can PvE-grind again after territorial defeat | Recovery without mandatory wallet purchases or permanent character reset |

## Recommended, NOT yet formally settled

| ID | Recommendation | Why |
| --- | --- | --- |
| R-01 | Safe-zone or designated-town minting with server proof | Adds risk without instant PvP mint escape or fake items |
| R-02 | Fairy Camp physical structure survives Game Over, but temporary Fairy respawn binding may expire | Separates assets/control from round checkpoints |
| R-03 | Fortification *tier* 1–8 controls durability; correct original item is prerequisite, not strict builder-level match | Allows lower-level group sieges, prevents invulnerable level-8 gates |
| R-04 | Raft/bridge/flute continue to obey native traversal mechanics | Avoids terrain/item corruption and impossible original routes |
| R-05 | Captured palace/town/cave control cannot delete the defender's native quest progress | Separate World-owned overlays from original quest save state |
| R-06 | Anti-spawn-camping, non-blocking shore exits and persistent PvE access | No permanent player exclusion |
| R-07 | Online/offline siege protections, claim timers, auditable ownership | Avoids catastrophic offline loss and spoofed captures |
| R-08 | Cosmetic rarity indicators include shapes/badges, not just colored pixels | NES palette and accessibility |
| R-09 | A server can whitelist competitive skins | Avoids invisible enemies or unfair attack telegraphs |

## Deferred or open decisions — do not implement as silent defaults

| ID | Topic | Open choice / question |
| --- | --- | --- |
| O-01 | Mythical level F | User explicitly said it may be nixed; defer entirely unless native logic/host rules justified |
| O-02 | XP for character leveling vs construction | One canonical spendable balance or carefully reconciled accounting? Native leveling threshold compatibility? |
| O-03 | Fairy Camp price and binding duration | Prior example was 20 XP; does camp persist as spawn across rounds? |
| O-04 | Death loot categories | Exactly which found objects are temporary, native permanent, minted eligible or consumed? |
| O-05 | Mint blockchain and fees | Chain, contract, custody, royalties, metadata, reversals, transfer and recovery policy |
| O-06 | Rarity distribution | Which original objects qualify, scarcity counts, per-World versus global cap, visual mapping |
| O-07 | Complete kingdom victory | Every owned palace, or principal palace plus side-objectives? How to handle no-palace territory? |
| O-08 | Player town side quests | Native quest mapping rules, clue budget, repeatability, solvability algorithm and override controls |
| O-09 | Natural chokepoints | Limits on boulder construction, bypasses, safe egress, repair/raid windows |
| O-10 | Tool and structure levels | Proposed hard-gate vs durability recommendation; actual hit budget, Hammer interaction, raft/bridge special cases |
| O-11 | Camps, towns and palaces economy | Construction costs, upgrades, defense strength, repair price, capture benefit |
| O-12 | Offline territory and shared locations | Raid scheduling, inactive players, abandoned buildings, allied spawns, temporary peace |
| O-13 | Skin distribution | Custom art provenance/licensing, server-approved ranked skins, visual safety constraints |
| O-14 | How many raid players | Capacity only after measured server and browser load, interest management and reconciliation tests |

## Non-negotiable engineering constraints

- Source-linked native behavior must not be guessed from approximate sprites; reveal unknown import/recovery coverage and refuse unverifiable builds.
- Server handles authoritative gameplay, XP, ownership, nonce-authentication and World changes; never trust a client claim for minted items or captures.
- Do not hardcode Zelda II terminology or data into platform-level abstractions; adapters bring title-specific support.
- Old original Pepsi archive and accepted 2.0 editor remain intact; new 3.0 implementation belongs to review branch until complete source/tests uploaded and explicitly approved.
- A design document is not a shipped runtime feature, and a local ZIP is not a GitHub source commit.

## Subsequent design proposal — collectible actor rights (2026-10-26)

See [06 — Mintable NPCs, defenders and playable avatars](06-MINTABLE-ACTORS-AND-AVATARS.md).

| ID | Proposed direction | Status |
| --- | --- | --- |
| D-17 | Character/NPC minting primarily unlocks legal actor placement and optional playable roles; original items/spells have no rarity-derived combat levels | User-proposed, implementation pending |
| D-18 | Blue Iron Knuckle can be a placed elite defender and an avatar with balanced player-level stats | User-proposed, requires control adapter |
| D-19 | Shadow Link may be rare palace-only guardian and playable avatar; native Great Palace boss remains unchanged | User-proposed, hosted extension |
| D-20 | Healers, magic restorers, River Man-style services and side-quest NPCs may populate towns subject to original quest safeguards | User-proposed, placement/service policy open |
| D-21 | New spells, if pursued, are explicit non-native hosted ruleset features | Deferred |

**Unresolved:** permission to mint source-owned IP on a public blockchain, active-instance quotas, availability of free native services, boss rarity and eligibility, whether deployed entities can also be used as avatars. Do not silently implement them as agreed balance rules.

## Playable enemy magic refinement (2026-10-26)

| ID | Direction | Status |
| --- | --- | --- |
| D-22 | Distinct playable actor identity rather than bonus damage, costumes or NFT-granted stats | User-stated design intent |
| D-23 | Existing Zelda II spells should remain available when actor physiology, gameplay and source recovery make sense | User-stated design intent; per-spell mapping open |
| D-24 | Do not add spells merely to hide missing control/animation adapters; evaluate only genuine gameplay fit gaps | Proposed technical guideline |
| D-25 | Use a Moblin as first example for a source-identified spear-throwing playable enemy with capped player progression | Example, not a verified implemented adapter |

Further detail: [07 — Playable characters and spell compatibility](07-PLAYABLE-CHARACTERS-AND-SPELL-COMPATIBILITY.md).

## Encounter-to-actor entitlement refinement (2026-10-26)

| ID | Direction | Status |
| --- | --- | --- |
| D-26 | Real PvE/PvP World encounters yield eligible actor collectibles, e.g. a tier-1 Moblin | Owner design intent; drop odds/eligibility open |
| D-27 | Unminted actor collectible is forfeited upon last-life Game Over; optional mint preserves it permanently | Owner design intent; finality rules open |
| D-28 | Minted actors can be placed as defenders or used via approved playable roles; NPC/enemy identities not cosmetic stat-boost NFTs | Owner design intent; quotas pending |
| D-29 | Another player may be permitted to control an owned deployed actor without taking ownership | Owner design intent; lease model recommended |
| D-30 | Follow-and-fight AI deferred until source enemy combat, collision and traversal are understood; native animation playback alone is insufficient | Owner acknowledges dependency; technical safeguard |

See [08 — Encounter drops and ally control](08-ENCOUNTER-DROPS-AND-ALLY-CONTROL.md). **Open:** mint timing, token/placement count, drop chances, AI recovery fidelity, borrowed-unit death and XP awards. No new functionality is asserted by this document.

## Level-weighted encounter drops, XP and server configurations (2026-10-26)

| ID | Decision / proposal | Status |
| --- | --- | --- |
| D-31 | Enemy collectibles have a server-awarded hosted placement level 1–8, influenced by character progression | User-defined design intent; source RPG level distinct |
| D-32 | Above level 5 (levels 6, 7, 8) is **incredibly rare**, even for high-level players | User-defined rarity intent; exact chance open |
| D-33 | Minting locks and preserves a found enemy and its level; no mint-induced power upgrade | Recommended realization of owner intent |
| D-34 | A Quick Raid server without blockchain/minting and a longer-lived optional-mint World use the **same engine** | User-proposed mode split; match reset/config to be finalized |
| D-35 | XP system must be implemented/verified next as server-authoritative ledger retaining earned levels and unspent XP on Game Over | User-directed next design phase; XP accounting formula still open |

**Open:** drop chance separately from collectible level, Attack/Magic/Life reference function, enemy-level scaling, level-6/7/8 probabilities and supply limits, one XP ledger versus split economy, no-mint match character/XP reset, exact construction prices and reward provenance. Do not implement invented probabilities from an illustrative chart. [Detailed contract](09-LEVELED-DROPS-XP-AND-SERVER-MODES.md).
