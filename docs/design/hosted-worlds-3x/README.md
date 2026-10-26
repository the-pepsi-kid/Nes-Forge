# NES Forge 3.x — Hosted Worlds design index

**Design snapshot:** 2026-10-26. **Status:** design contracts / proposals, NOT assertions that alpha.1 implements these systems.

## Core direction

NES Forge began with a Pepsi vending-machine game, evolved into an NES-native authoring, reverse-engineering and ROM-editing platform, and now has an experimental browser-hosted multiplayer runtime. The Forge project is **a game engine and data model first**; artwork, audio, effects and user-interface presentation are swappable. Original-ROM fidelity is a separate, explicitly testable compatibility mode.

The 3.x Hosted Worlds direction explored here uses **Zelda II** as its leading integration example, without making the core engine Zelda-II-specific. Keep original game assets, rules, NPCs, enemy/boss identities, items, spells, terrain, and level progression authoritative where native behavior is claimed. Browser-only multiplayer extensions must declare their deviations.

## Documents

| Document | Contents |
| --- | --- |
| [01 — Round lifecycle, XP and collectible minting](01-ROUND-ECONOMY-AND-COLLECTIBLES.md) | Three lives, recovery, wallet, minting, rarity, respawn, original-game differences |
| [02 — Territory, conquest and travel](02-TERRITORY-CONQUEST-AND-TRAVERSAL.md) | Palaces, towns, caves, quests, raids, boulders, raft, flute, spawn control |
| [03 — Engine, skins and browser rendering](03-ENGINE-RENDERER-AND-SKINS.md) | Assetless simulation, native/browser renderer separation, alternate skins, rulesets |
| [04 — Decisions and unresolved questions](04-DECISION-REGISTER.md) | Agreed intent, recommended proposals, deferred questions and explicit safeguards |
| [05 — Roadmap and test contracts](05-ROADMAP-AND-ACCEPTANCE.md) | Safe implementation sequence, deterministic tests, compatibility gates |
| [06 — Mintable NPCs, defenders and playable avatars](06-MINTABLE-ACTORS-AND-AVATARS.md) | Character/NPC service entitlements, elite defenders, palace-only bosses, playable avatars and native-item preservation |
| [07 — Playable characters and magic compatibility](07-PLAYABLE-CHARACTERS-AND-SPELL-COMPATIBILITY.md) | Play as Moblins and other actors, retain existing spells when sensible, avoid rarity power creep and invented spells |
| [08 — Encounter drops, deployments and delegated control](08-ENCOUNTER-DROPS-AND-ALLY-CONTROL.md) | Earn a Moblin in-world, optionally mint it, deploy native-style defenders, and later delegate control or add follower AI |
| [09 — Leveled drops, XP and server modes](09-LEVELED-DROPS-XP-AND-SERVER-MODES.md) | Level-weighted enemy collection (6–8 exceptionally rare), XP ledger and quick-raid vs persistent server configuration |

## Vocabulary and status

- **Design intent** = the desired player experience expressed by the project owner; does not imply implemented code.
- **Recommendation** = proposed implementation details requiring acceptance.
- **Open** = ambiguous design choice; implement behind an explicit config or defer.
- **Implemented and verified** = only after reviewing source/tests from a real commit or reproducible local kit.
- **Native** = behavior verified against original title / console timing and capabilities.
- **Hosted extension** = browser/server mechanic distinct from native ROM behavior.
- **Presentation skin** = maps canonical entities/events to graphics, sound, effects and UI; cannot silently change physics.
- **Ruleset modifier** = separately versioned and server-enforced modification of gameplay behavior.

## Release/source reality as of the snapshot

- GitHub **main**: owner-accepted NES Forge 2.0.0-alpha.11, not replaced.
- GitHub draft **PR #3**: 3.x directory structure, architecture and release documentation; the *complete multiplayer source had not yet been committed to GitHub* when this design snapshot was written.
- A complete local v17.1 / proposed 3.0.0-alpha.1 kit and publish package were prepared and synthetic tests reported, but they are not proof of original Zelda II native parity, public-network readiness or this new gameplay scope.
- Original Pepsi artifact archived and retained. Neither the ROMs nor proprietary artwork should enter the public repository without independent rights review.

This design archive must not silently upgrade the release status or change the working 2.0 editor.
