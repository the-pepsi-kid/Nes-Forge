# 08 — Encounter drops, minting, deployed units and delegated control

**State:** design intent and proposed implementation, **not shipped in alpha.1**. Recorded 2026-10-26.

## Player vision

The value of a collectible is that **a real recovered World actor becomes part of the player's inventory**. It is not a skin, rarity-based attack buff, new item level, or invented spell.

Example: while fighting original enemies in PvE, a player earns a **Moblin (tier/level 1) encounter drop**. It becomes **unsecured round inventory**. The player may use its permitted round capabilities while alive. They can optionally **mint the collectible** to preserve the entitlement permanently. If they run out of all three lives before doing so, the unminted drop is lost. A minted entitlement survives Game Over and territorial defeat.

**Terminology risk:** “level 1 Moblin” here is a proposed collectible/placement tier, **not a claim that the original Zelda II Moblin has Attack, Magic or Life level 1**. Native enemy HP, AI and attack must not be silently remapped to the player's 1–8 attributes. Rarity is a different axis from placement tier or native enemy behavior. Do not invent native enemy levels.

## Roles of one collectible

| Mode | What happens | Required fidelity |
| --- | --- | --- |
| Inventory | Server records one identifiable actor entitlement and its temporary/minted state | Cannot be duplicated or client-issued |
| Place and guard | Owner places **one authorized active instance** at an eligible controlled location | Native/verified enemy behavior; room-owned placement and limits |
| Follow owner | Optional companion follows across valid room transitions and participates in combat | **Deferred** until movement, collision, AI and threat-selection are deeply recovered/validated |
| Another player controls it | Owner grants a revocable controller **session** for an actor instance; second player uses its accepted input adapter | Owner retains ownership; controller gains neither wallet custody nor unauthorized stats |
| Use as your main | If it has an approved controllable adapter, owner selects it as their avatar | Preserve capped player progression; no unearned enemy HP/damage or boss moves |
| Recover/store | Owner despawns/reclaims eligible instance to permanent collection after action completes | Server enforces no double active deployment and no raid teleport exploits |

The owner and the active controller are different fields. An NFT is **ownership entitlement**, not a magic AI or automatically playable body.

### Native enemy default vs companion AI

An enemy **animation sequence** supplies pose frames, not movement, targeting, damage, collision, attack events, or navigation. The short-term implementation target is a **bounded server-side defender** using only original/source-verified behavior where the runtime actually recovers it (e.g. idle/patrol/native spear throw, with explicit room constraints). Do not merely play attack sprites and assert combat happened.

True followers require a separate system: follow intent, pathfinding, inter-room traversal, obstacles, attack target selection, friendly fire, source-correct attack windows, player collisions, crowd limits and server tick determinism. These cannot be faked by sprite loop playback. When native recovery is incomplete, allow stationary decorative placement or clear unsupported diagnostics, not fabricated 1:1 AI.

A second connected human controlling the unit is a different **remote avatar / delegated controller** mode, not follower AI. It is potentially a good intermediate milestone after avatar input mapping and multiplayer authority are tested.

## Server-owned state model (concept, not approved schema)

- **Actor source ID:** title/project/version/source hash, verified actor type/variant, native behavior confidence, semantic action/animation IDs and collision bounds.
- **Drop ID:** unique encounter/event/world revision and issuing server; generated only by server-authoritative PvE/PvP/quest reward or controlled admin rule.
- **Entitlement ID:** unique serial and owner account/wallet reference; `temporary`, `mint_pending`, `minted`, or `lost`; avoid storing private wallet keys.
- **Placement ID:** unique instance ID, controlled territory and slot, position, active status, health and authoritative AI state.
- **Controller lease:** optional user/session, owner permission, role, expiration and revoke event. It is **not** a token transfer.
- **Avatar assignment:** references an approved playable adapter with an independent balanced PvP profile, not the enemy’s NPC damage constants.
- **Gameplay provenance:** explicit `original`, `verified-native-adapter`, or `hosted-extension`; failure/unknown remain visible.

**Suggested alpha policy:** one collectible serial may have **at most one active actor manifestation** at a time (placed defender, delegated player, or owner main). More units require additional distinct earned entitlements or a separately approved deployment blueprint mechanic. This prevents an NFT from generating unlimited defenders and XP farms.

## State transitions

```text
Server-verified enemy encounter / eligible loot event
        |
        v
Unsecured drop in the player's round inventory
        |                              |
        | optional mint success        | final life lost before mint
        v                              v
Permanent minted entitlement       Forfeited (no recovery entitlement)
        |
        +--- inventory/storage
        +--- eligible controlled placement (bounded AI)
        +--- approved player avatar or delegated-control lease
        +--- (later) follower with authoritative combat/pathfinding
```

**Failure cases:** mint failures/chain delays must not double issue a token or incorrectly consume a drop; real custody transfer should update ownership only after finality/reconciliation. Losing the final life while a mint is pending needs a deterministic rule to prevent race conditions. Normal original quest items remain governed by native progression, not the unminted hosted-drop penalty.

## Delegated player control

- Only the **owner** can explicitly grant and revoke a controller lease (and only while the owner possesses the entitlement).
- A controller signs into their own account, obeys the same server-owned Attack/Magic/Life caps and spell compatibility rules, and cannot redeploy or mint the NFT.
- The controlling player must not impersonate the unit owner or use another player's wallet. On revoke/disconnect, the unit returns to guarded idle or safe despawn following an explicit server policy.
- Enforce concurrent participation and PvP quotas: a player cannot secretly control multiple actors via alternative sessions to bypass room population limits; define fairness constraints before launch.
- The unit cannot simultaneously be a stationed guard, remote-controlled fighter, and owner's playable character.
- The server checks territory access, legal entrance/cave route, movement bounds, attack timing, combat XP, death and surrender. Never accept client-selected enemy damage or teleport.

## Balance and placement

- Placement cannot completely close essential caves, docks, crossings, original NPC quest routes, or the protected beach-to-PvE path.
- Enemy deployments consume explicit unit/room/territory slots. Native enemy AI and combat recovery determine what actions are actually supported; elite enemy or palace-guardian rights do not automatically allow special boss-like combat in a town.
- Boss encounter deployment remains **palace-only** under the proposed territory rules; minted playable boss avatar is a distinct input adapter with balanced 1–8 player stats and no native boss-only invulnerability.
- Prevent XP farming via endlessly respawning one's own defender, duplicating drops from one PvE encounter, and player-client-manufactured “kills”.
- When a placement location is captured, remove the former owner's operational permission. A minted collectible entitlement remains theirs, pending a defined recall/cooldown policy; enemies may be disabled, defeated, or returned rather than transferred as wallet tokens.

## Rights and UX

A wallet is optional for normal native Zelda II gameplay and recovery. Minting specific copyrighted Zelda II characters/artwork on a public chain may require permission and legal review. Prototype with original Forge actors or licensed identities where public publishing is planned. A unique token does not grant rights in the underlying Nintendo art/game data.

The interface should show the full lifecycle in one place: **Found → Unsecured → Minted / Lost → Stored / Deployed / Controlled**, with actor source/variant, entitlement ID, territory and controller. Do not present cosmetic NFTs or damage boosts as the feature's core proposition.

## Open choices

1. Is a defeated Moblin drop guaranteed, random, or an encounter-specific quest reward? How does placement tier 1 relate to rarity 1–8?
2. Can an **unminted** drop be used/placed in the round, or only carried until secured? If placed, how is Game Over handled?
3. Where/when may players mint, and what happens if transaction finality crosses Game Over?
4. If another player controls your actor and it dies, does that consume the deployment slot temporarily, permanently, or only for the round?
5. How many active defenders per room, base or palace? Who may occupy a boss slot? How are native enemy animations, AI, physics and hitboxes verified?
6. Can PvP players loot an **unminted** enemy entitlement, or does it simply vanish on round loss?
7. How do we reconcile off-chain collection with on-chain ownership and player account recovery?

## Minimum acceptance tests (future, not passed)

- A server-authorized Moblin kill yields exactly one eligible item serial; no direct client drop injection.
- Unminted found Moblin disappears on third lost life; minted one persists after death, restart, PvP defeat and territory capture.
- Token ownership and current controller are distinct; borrowed player control expires/revokes without transfer.
- Placed defender obeys source-verified idle/attack/collision and cannot duplicate or instantly teleport across rooms.
- Only one active manifestation exists for one entitlement; reconnect, owner+borrower actions and simultaneous placement are idempotent.
- Unsupported native AI is diagnosed and does not become fake source-authentic logic.
- Every active unit, including remotely controlled enemies, consumes server-bounded room slots and obeys hitbox/damage rules.
- No deployed unit permanently blocks original quest-critical crossings or shoreline recovery.
