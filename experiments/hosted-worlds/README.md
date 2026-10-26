# Hosted Worlds — 3.x experiment

This directory is reserved for independently runnable, versioned 3.x hosted-world experiments. The accepted Forge 2.0 mainline remains in the top-level `app/` and `nes-forge.html`.

## Folder contract

Each version (for example `v17.1/`) must contain the entire reviewed distribution: standalone HTML editor, Windows and macOS/Linux launcher, `host/server.py`, `host/client.html` and `host/client.js`, Forge source, synthetic fixtures, tests, docs, and checksum manifest. Do not commit local ROMs, secrets, private SQLite data or generated ZIPs.

Runtime execution should remain localhost-only and opt-in. An administrator must explicitly approve World publication. A host protocol mismatch must block publication. Experimental multiplayer action physics and provisional combat do not constitute 1:1 recovered original Zelda II gameplay.

**Current GitHub status:** Layout/checkpoint staged on this review branch; the v17.1 **complete source-bearing kit is not checked into GitHub yet**. The full runnable version is delivered separately in the user-facing v17.1 repo-ready review ZIP. This branch does not claim to contain a runnable hosted server.

## Proposed game modes and visuals

[Hosted Worlds 3.x design documents](../../docs/design/hosted-worlds-3x/README.md) record the persistent XP/three-life loop, palette rarity, wallet minting, “beach noob” fallback, palace/town/cave conquests, shared traversal, and engine/skin separation. These are proposals for later verified runtime increments, not claims that the currently staged v17.1 source implements them.
