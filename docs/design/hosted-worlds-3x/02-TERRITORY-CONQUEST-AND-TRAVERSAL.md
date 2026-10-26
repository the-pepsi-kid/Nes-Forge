# 02 — Territory, full conquest campaigns and shared traversal

**Status:** proposed Hosted Worlds mechanics; none of these detailed conquest pipelines is certified as implemented in alpha.1.

## Central principle

**Game Over is not conquest.** Losing three lives does not transfer ownership. An opponent must actually seize each location or complete an explicitly defined **kingdom-scale campaign**. If all controlled eligible spawn sites fall, the former ruler respawns at the protected beach, retaining permanent levels and XP, with access to PvE rebuilding.

## Location and ownership model

Each canonical native World coordinate/entrance/room stays separate from hosted overlays:

- **Native data:** geometry, terrain effects, enemy/NPC/boss identities, original dialog, item/spell prerequisites, collision, scene/CHR/audio, door/cave/bridge/raft connectivity, quest progression.
- **Hosted location overlays:** controlling player/faction, outpost and spawn permissions, quest-objective graph, constructed defenses, siege state, claim point, timers, audit events, ownership transfer.
- **Access versus control:** holding a location is not permission to remove the public route or native progression. Some rooms inside shared caves can host player outposts while the through-passage remains traversable.

| Place | Claim method / value | Preservation rule |
| --- | --- | --- |
| **Palace** | Only structures with bosses. Complete verified palace challenge, original boss encounter and crystal objective. Strategic high-value spawn | Boss and content remain original; repeatable hosted capture state must not overwrite each player's native quest flags |
| **Player-built town** | Infiltrate by NPC clues/favors/side-quests, find concealed headquarters, clear original/authorized defenders and claim | No invented bosses. NPC quest steps must be reachable, solvable and clearly tied to the town |
| **Cave passage** | Natural passage **shared**. Optional interior outpost or constructible checkpoint may be claimed | Never privatize/seal the sole required native transit route indefinitely |
| **Base / Fairy Camp** | Construction/control rules, possible local respawn | Can be attacked/destroyed; losing one life alone does not destroy it |
| **Swamp / forest / desert** | Shared natural terrain; nearby outposts may be claimed | Preserve original movement slowdown, terrain encounters and hazards |
| **Bridge / raft dock** | Public traversal with defensible approaches | May contest a checkpoint, not nullify native crossing/item requirement |

### Palaces: special boss territory

Only **palaces** contain bosses in the proposed hosted construction model, and original Zelda II guardians remain the reference. Palace takeovers require defeating the guardian and satisfying hosted crystal-claim rules without deleting the defender's original per-player quest history. Do not invent new gameplay stats, boss species or spells to fill missing reverse-engineering data. Separate authored game support may have its own explicit rulesets.

### Town side quest / hidden headquarters

A town owner can place or designate a secret headquarters among valid structures, using project-recovered NPC dialogue, quests, entrances, spells, item interactions and other **source-supported** mechanics. Attackers discover clues through interactions; a verified prerequisite graph leads to headquarters access and a non-boss claim objective.

The authoring tool validates at publication time:
- A legal initial quest clue is discoverable by any eligible attacker.
- Every required item/spell/action exists and is achievable with the attacker's permitted game progression.
- No quest graph cycle, missing scene, inaccessible entry, falsely blocked exit or permanently hidden mandatory NPC.
- A defending player cannot dynamically move the true goal into unreachable geometry or rewrite quest completion while contested.
- If an NPC behavior has not been recovered, mark the gap and refuse native-authentic claims rather than guessing.

### Kingdom-scale campaign: “mini full Zelda II quest”

Conquering an entire player kingdom should take more than a single PvP kill. Example campaign graph:

1. Explore the claim network and discover reachable approaches.
2. Infiltrate relevant towns through native-like NPC clue/favor quests and capture their HQs.
3. Clear cave/outpost fortifications, map optional shortcuts and supply routes.
4. Complete the defending side's eligible palaces by **original boss + crystal** capture objectives.
5. Complete a final claim condition once declared campaign prerequisites have been fulfilled; transfer only contestable World ownership, never wallet entitlements or permanent character progression.

A defender can retake sites during the campaign. Total conquest requirements must be **bounded and solvable** based on holdings and actual World connectivity. **Open:** whether *every* held palace is required, or principal palace plus supporting town/cave objectives; choose as ruleset configuration only after balancing. A kingdom with no palaces must have a non-boss conquest route.

Keep online/offline fairness, siege windows, decay, safe exit, abandoned owner assets and defender notices configurable rather than silently enforcing permanent offline eviction.

## Caves, boulders and level interactions

The player suggested fortifications where a level-8 builder's rock might require level 8 to break. Better **recommended default**: require the **appropriate original tool** (e.g., Hammer against eligible rocks), while builder's *fortification tier* 1–8 affects durability/time/attack difficulty—not an absolute same-level hard lock. This preserves low-level coalition sieges and prevents an unbreakable map.

Original tools are not themselves upgradable stat blocks unless a separately approved ruleset says so. In particular:

- **Hammer** breaks native breakable boulders per source rules; player-built barricades can add hosted durability.
- **Raft** works at original eligible raft docks subject to original progression. A higher-level player's bridge does **not** automatically disable a lower-level player's raft.
- **Flute** triggers original source-verified overworld events; additional hosted objectives may observe the event but cannot secretly corrupt original quest requirements.
- **Bridge** remains functional traversal; contest the nearby guard position rather than levelling the bridge's physical usability.
- **Swamp** retains native movement penalties/encounter behavior; hosted defenses must not erase it.

**Open balance:** barricade HP and damage formula, repair costs, siege tools, multi-attacker scaling, contested structure build permissions, structural decay, and ensuring no invulnerable barrier can imprison a player. No numerical formula is approved merely because one was shown in a UI example.

## Spawn and loss conditions

Players may select *valid controlled* palaces, towns, outposts, bases or eligible camps for spawning. Captured objectives remove the former owner's privileges and may grant the victor a compatible spawn, subject to safe reachable geometry. If all eligible control points are gone, the player falls to beach spawn, not level/XP reset.

## Verification required

- Single-room and full World reachability with source-faithful terrain; doors, map transitions and return paths.
- Quest-graph completion from every permitted attacker starting state, including missing/unknown native inputs.
- No required shared bridge/cave/dock can be permanently sealed by player construction.
- Palace boss/crystal claim does not consume/delete someone else's original quest progression.
- Capturing one town changes only that town's control; losing all lives changes neither territory nor XP.
- Two concurrent attackers cannot double-claim, duplicate loot or forge an owner transition.
- Offline siege rules, reconnects, deterministic raid replay, persistence/rollback and snapshots.
