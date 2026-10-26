# 05 — Delivery roadmap, acceptance matrix and release gates

**Document classification:** proposed implementation plan. No check below is marked passed just because it has been documented.

## Phase 0 — Secure the existing alpha source (BLOCKING)

- [ ] Push **complete** reviewed 3.0.0-alpha.1 v17.1 editor HTML, authoritative host, browser player, canonical Forge source, launchers, docs, tests and manifests to the versioned GitHub path on draft PR #3.
- [ ] Exclude copyrighted/private ROM data, original game screen captures, local DB files, wallet keys, seed phrases, Git tokens, credentials and generated ZIPs from public commit; independent human review of staging diff.
- [ ] Fresh clone of PR branch launches Windows localhost server, editor, connected players without depending on chat ZIP.
- [ ] Re-run all packaged synthetic/server/browser tests in checked-out tree, compare runtime file hashes to signed checkpoint, record Python/browser version, actual passed/skipped counts, and test DB cleanup.
- [ ] Keep \`main\` 2.0 and \`archive/original-pepsi\` intact. Do not merge or tag release before owner approval.
- [ ] Preserve full runnable review kit as reproducible output after every milestone. No piecemeal hotfix kit as the only artifact.

**Existing local candidate check history is documented separately** under \`docs/releases/3.0.0-alpha.1*\`. It is not evidence that new contracts below are implemented.

## Phase A — Deterministic canonical engine snapshots

- [ ] Define stable source-identified World, Scene, Actor, Action, State, Item, Entry, AudioCue IDs, unknown-source markers and canonical event ordering.
- [ ] Prove debug/assetless rendering can display rooms, collision, movement and entry with no CHR/sprite content.
- [ ] Connect authoritative hosted snapshots to immutable render/event packets (including server tick / World revision).
- [ ] Verify two players using different skin settings produce identical server state and deterministic event replay.
- [ ] Document coverage of native-specific quirks, mapper/PPU timing and unrecovered game actions, never silently flatten.

## Phase B — Round / XP / spawn persistence

- [ ] Three-life lifecycle; native 1-UP locations and separately configured hosted locations; anti-duplication.
- [ ] Attack, Magic, Life cap 8; no F by default. Store stable level and XP across death, reconnect and host restart.
- [ ] Atomic spend ledger; player cannot self-issue XP; no double spend under race/reconnect.
- [ ] Ownership table and spawn validator: only actual-controlled, reachable, safe locations.
- [ ] Loss of all lives ≠ loss of property; loss of all *controlled* valid spawn sites ⇒ safe shoreline.
- [ ] PvE recovery remains available even when all territory is controlled by enemies.
- [ ] Fairy Camp persists separately from temporary checkpoint eligibility once O-03 resolved.

## Phase C — Territory and quest-driven conquest

- [ ] Implement overlay-owned claim/capture on canonical World and native scenes; separate per-player quest progression.
- [ ] Palace-only boss objective with verified original boss/crystal mechanics; no fabricated native bosses.
- [ ] Player-built town objective graph: native NPC and scene hooks, clues, HQ location, non-boss claim.
- [ ] Shared cave corridors and public bridge/raft/flute behavior; independently contestable interior outposts.
- [ ] Builder-created barriers that require appropriate original tools and can be breached with bounded durability; explicit tier rules.
- [ ] Kingdom campaign dependency graph / reversible claims; never automatically confiscate wallet entitlement on full conquest.
- [ ] Quest publication verifier catches unreachable HQ, impossible item requirements, cycles, blocked exits or unknown unrecovered native states.
- [ ] Offline raid window / defender rights; in-game contest logs, deterministic replay and atomic territory transfer.

## Phase D — Collectibles and skin presentation

- [ ] Server-verified eligible discoveries, unsecured inventory, on-Game-Over forfeiture, secure/mint flow.
- [ ] Optional signed wallet connection, nonce expiry, idempotent mint requests, failure/reorg resilience and chain metadata policy.
- [ ] 8-tier rarity and NES-inspired item palettes/badges; rarity does not alter original item function.
- [ ] Skin manifest maps semantic IDs to verified frame/action/terrain/sound UI assets. Skin swap live; no simulation reset.
- [ ] Authentic/browser/debug render mode toggles with differing art; consistent geometry/attack and original timing events.
- [ ] Ruleset changes are separate, pinned, and applied exclusively by authoritative server.
- [ ] Browser crowd rendering and room-based server interest management. Capacity claims only after measuring actual concurrency.

## Required acceptance scenarios

| ID | Scenario | Required observation |
| --- | --- | --- |
| A-01 | Two players join one World; choose different skins | Identical authoritative movement/collision/damage, distinct art only |
| A-02 | Player wins XP, spends some on base, dies three times | No unspent XP or level loss; expenses deducted exactly once |
| A-03 | Player dies but controls 2 towns and 1 palace | Selects eligible owned spawn; control preserved |
| A-04 | Opponents capture the final controlled spawn | Former owner respawns at reachable protected shore; PvE grind possible |
| A-05 | Player finds ordinary 1-UP | Round lives change as allowed, without duplicating minted consumables |
| A-06 | Player finds unminted hosted relic; Game Over | Unsecured relic forfeited, native quest items and durable XP retained |
| A-07 | Player mints eligible relic with connected wallet | Unique durable entitlement persisted; no repeat mint from replayed event |
| A-08 | Two users race to buy build/claim same coordinate | Atomic server conflict decision and consistent ledger |
| A-09 | Attack level 7 with Hammer vs tier-8 player barricade | If durability policy selected: legal damage and bounded break time; native passage not permanently blocked |
| A-10 | Raft/Flute/bridge native events near claimed land | Item prerequisites and original World access preserved |
| A-11 | Town HQ quest generated from source NPC hooks | All stages reachable with allowed items/actions; non-boss conquest |
| A-12 | Palace captured via boss and crystal | Hosted ownership changes; native per-player quest state remains intact |
| A-13 | Complete kingdom campaign | Every required claim stage verified; wallet/levels/XP not transferred |
| A-14 | Native export with browser-only crowds or rules | Clear build rejection or explicitly supported backport; no silent flattening |
| A-15 | 2 concurrent clients with skin swap mid-fight | No server hitbox, health, World tick, or game-state divergence |
| A-16 | ROM adapter missing key audio/animation/mapper recovery | Diagnostic and unsupported-native-build guard; never fabricated 1:1 claim |

### Acceptance evidence format

Each test must capture source commit SHA, game/ROM identity hash if private, fixture schema, host protocol, authoritative World revision, renderer/skin and ruleset versions, test command/runtime/browser, pass/fail and logs. Private ROM bytes never accompany public reports. Independent replay and negative authorization tests accompany happy paths.

## Default platform boundaries and safety

1. NES compatibility and hosted-browser extensions are independently declared capabilities; native builds remain faithful/verified.
2. Server is authoritative for progression, claims, damage, teleport, inventory, mint eligibility, and ownership.
3. Wallet optional; no pay-to-rebuild requirement; no private keys or user data in source repo.
4. Essential cave passages/docks/bridges and shoreline recovery cannot be permanently sealed by players.
5. Only source-recovered original bosses/abilities presented as native; any hosted changes visibly labeled.
6. Respect copyright for ROM and asset content; do not treat ROM recovery or a redrawn skin as blanket redistribution permission.
7. Full source upload and technical alpha release acceptance are **separate milestones** from future territory, NFT and skin-system implementation.

## Next owner decisions for bounded implementation

Choose and record (1) spendable-XP accounting across native levels and construction, (2) Fairy Camp respawn lifetime, (3) capture campaign completion predicate, (4) barrier tool/durability behavior, (5) which specific loot is mintable and when, and (6) enforcement of a universal accessible public route during raids. Treat all as pending until owner approval.
