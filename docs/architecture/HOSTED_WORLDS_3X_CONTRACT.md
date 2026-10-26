# Hosted Worlds 3.x — architecture contract

**Scope:** NES Forge 3.0.0-alpha.1 *technical release candidate*. Original game content is an input to a separately authorized recovery/build workflow; the host is not a redistributable ROM, emulator, or proof of exact Zelda II physics.

## Source of truth

- **Editor/source:** accepted 2.0.0-alpha.11 remains in `app/` and root `nes-forge.html` on `main`. Keep its original build hash and original Pepsi archive intact.
- **Hosted alpha:** complete reviewed 3.x implementation belongs in `experiments/hosted-worlds/v17.1/`: root standalone editor HTML; `forge-source/`; `host/server.py`, `host/client.js`, `host/client.html`; `tests/`; launchers; `README_START_HERE.md`; `ALPHA_STATUS.md`.
- **GitHub verification:** Do not claim this branch is a runnable 3.x checkout until the actual runtime/source files are committed and inspected. A separate local review ZIP is not equivalent to a Git commit.

## Interfaces

1. The Forge editor owns ROM analysis, canonical asset recovery, source identity, native project state, and authoring/build/export.
2. The host owns authenticated player sessions, authoritative player position/actions, persistence, camp construction, and revisioned World publication.
3. The player client renders the **server-owned** World/action snapshot. Clients do not submit arbitrary damage, XP, role elevations, or native sprite evidence.
4. A World publication must be explicit/admin-authorized, source-identified, room-width-validated, and block on incompatible protocol.
5. The bundled v17.1 localhost host advertises **protocol 13**. The editor must accept this protocol, reject stale 12, and never show green readiness on mismatch. No automatic downgrade.
6. Original ROM-derived images, traces, native bytes, and keys remain private inputs unless a separate rights and evidence review approves publication. Do not commit SQLite state, admin token or wallets' private keys.
7. Preserve player records, XP, camps, world variables and monotonic revision on compatible update. All schema transitions need specific migration tests and backups.

## Fidelity boundary

Recovered original Link pose selectors and sourced display assets do **not** establish native Zelda II jump physics, scrolling, collision, hitboxes, encounter rules, spells or enemy AI. Experimental damage and timing must remain labeled as test mechanics, and be separately controlled from native game knowledge. Attack/Magic/Life have an upper limit of 8; no invented RPG statistics or native powers. Future generic adapters must be project-agnostic and not hard-wire Zelda II into `app/`.

## Version policy

- **2.0:** accepted independent standalone authoring mainline.
- **3.0.0-alpha.1:** opt-in hosted-world technical candidate, based on internal v17.1.
- A feature's existence in source is not the same as reviewed fidelity or release acceptance.
- Merge into `main` only after a complete source import, fresh checkout, all available tests, browser walkthrough, no-asset-leak review, explicit decision, and a documented rollback path.

See `docs/releases/3.0.0-alpha.1.md` and `docs/RELEASE_AND_RECOVERY.md`.

## Detailed gameplay and rendering design (proposed, not shipped)

The [3.x design index](../design/hosted-worlds-3x/README.md) captures round XP and minting, persistent territory and player-selected respawn, palace/town/cave conquest, original Hammer/Raft/Flute rules, skin and browser rendering separation, unresolved decisions and acceptance tests. These **do not** describe verified alpha.1 features. Honor the [decision register](../design/hosted-worlds-3x/04-DECISION-REGISTER.md) before changing executable contracts.
