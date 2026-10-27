# Hosted Worlds (3.x experimental track)

The optional hosted build reuses canonical `app/src` with a separate manifest. The `v17.1/` directory contains its runnable HTML, localhost host/client and launchers. The native/offline entry remains `nes-forge.html`.

## Launch v17.1

- Windows: `cd experiments\hosted-worlds\v17.1` then `START_LOCALHOST_WINDOWS.cmd`.
- macOS/Linux: `cd experiments/hosted-worlds/v17.1 && sh START_LOCALHOST_MAC_LINUX.sh`.
- In a browser open `NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html` from the **same directory**.
- Select the Zelda II World; `Test localhost` must say protocol 13 verified, then publish with `Load selected World on host`.
- Never run both old and new localhost servers on port 8765. Back up your private SQLite database before transferring hosts.
- Validation: `python tests/test_v17_world_load_compatibility.py` from within `v17.1/`.

ROMs are user-owned and must remain local; never commit ROMs, private keys, tokens, or local-world databases.

## Integration policy

Stable authoring lives in `app/`; hosted experiments live under `experiments/hosted-worlds/<version>/`. Do not promote prototype mechanics as recovered original Zelda II gameplay. All cross-track changes need explicit compatibility and native asset checks.

## Proposed game modes and visuals

[Hosted Worlds 3.x design documents](../../docs/design/hosted-worlds-3x/README.md) record the persistent XP/three-life loop, palette rarity, wallet minting, “beach noob” fallback, palace/town/cave conquests, shared traversal, and engine/skin separation. These are proposals for later verified runtime increments, not claims that the currently staged v17.1 source implements them.
