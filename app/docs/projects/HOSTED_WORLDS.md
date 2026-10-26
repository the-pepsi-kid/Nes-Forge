# Hosted Worlds: shared-editor localhost workflow

The hosted editor is a second build of the canonical NES Forge editor. Its
native import/edit/build paths retain the ordinary schema and registered native
writers. The hosted build adds opt-in World publication, source inspection and
player tools. Host protocol 13 is separate from native project schema versions.

## Open and run

1. Extract the complete kit. Keep its directory structure.
2. Open `nes-forge.html` for native/offline work, or the hosted HTML under
   `experiments/hosted-worlds/v17.1` for WORLD Live tools.
3. For hosting, install Python 3.11+, then `python -m pip install aiohttp pycryptodome`.
4. Start the host with that version folder’s Windows or macOS/Linux launcher.
5. Open the hosted HTML, load a supported Zelda II native World and choose its
   intended region. WORLD Live → enter the token printed by this host process →
   Test localhost. It should verify protocol 13.
6. Load selected World on host after reviewing the explicit publication prompt.
   This publishes a snapshot; it does not patch the source ROM. Open the player
   client at the local address printed by the host, using separate browser profiles
   and test wallets for separate players.
7. Preserve the private `host/localhost-world.db` if continuing a session. Stop both
   processes before moving a database between kit folders. Keep the runtime host,
   player and editor from the same version together.

## Editing owner and impact

| Data | Owner | Result |
|---|---|---|
| Native source, terrain, CHR, poses, build recipes | Existing canonical editor services | Save Project As / bounded native ROM build |
| Published World terrain/art snapshot | Explicit editor export, validated host import | Multiplayer World revision |
| Player identity, XP, camps, shared actions | Local host and its database/session state | Server-authoritative multiplayer state |
| Recovered room records, Link art and traces | Verified local source plus read-only recovery | Evidence/display; gameplay fidelity needs separate verification |

Use the native project’s Native tools and preflight for ROM edits. Use explicit
safe terrain publication for a compatible hosted terrain change; a complete World
publication has a different revision/reset scope and asks for confirmation.
Current native editors, Resources and Retro Workstation remain available in
both builds. Punch-Out pose/art work continues through its own native writers.

## Rebuild or change HTML

Edit shared editor modules under `app/src/`. The default manifest builds the native
editor; `app/hosted-source-manifest.json` adds eleven extension modules from the
same tree. Run the default bundler, root-entry synchronizer, then the hosted
manifest build. Each output has its own build-input inventory. Avoid editing a
second source snapshot; regenerate both outputs after a shared change. Direct
HTML experiments should be made in a separate copy and ported to modular source
when retained. Host/client source remains under the versioned experiment folder.

## Current limits

Hosted movement, attack zones, damage and some traversal are experimental. Original
Link pixels and source selectors do not establish native Zelda II combat, enemies,
spells or physics parity. Wallet authentication does not mint items or deploy a
blockchain. The host binds to localhost; public internet deployment is separate
work. Source ROMs, game media, player databases, wallet keys and admin tokens are
not part of the repository or kit.
