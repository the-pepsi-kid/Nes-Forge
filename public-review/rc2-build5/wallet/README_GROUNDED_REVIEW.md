# NES Forge RC2 Build 5 — grounded two-wallet pilot (public review candidate 3)

**Experimental alpha.** Candidate 3 restores the later RC2 localhost-hosted movement,
visual-ground placement and frame-continuous presentation from the owner-supplied
consolidated Build 5 source. The standalone editor is the same **sanitized** public
RC2 Build 5 HTML from Candidates 1 and 2; its embedded commercial recovery
catalogs remain deliberately disabled. No ROM, game screenshots, private DB,
token, wallet key, or other copied game asset is included.

The player's original art and reference scenery are generated locally by the
user's own original ROM through Forge. They are **not downloaded from GitHub**.

## Quick start — Windows

1. Extract the *entire* Candidate 3 ZIP into a new, empty directory. Keep the
   `NES_Forge_Public_Review/` folder and its subdirectories together.
2. Install Python 3.11+. In PowerShell, from that extracted folder, run:
   `py -m pip install -r requirements.txt`
3. Run **`01_START_MULTIPLAYER_SERVER_WINDOWS.cmd`**. Keep the console open;
   copy its *fresh* WORLD Live administrator token into the editor or setup step.
   Stop older Forge servers on port 8765 first.
4. For the original Rauru demonstration on a **fresh host database**, install:
   `py -m pip install playwright` and `py -m playwright install chromium`.
   Run **`02_PREPARE_PRIVATE_ROM_WINDOWS.cmd`**, enter the absolute path to
   your **privately held, supported Zelda II US ROM** and the token.
   This publishes the original source World, scene raster and Link sprites to
   localhost only. It does not copy the ROM into GitHub or alter the ROM.
   **Do not run fresh preparation over an established database.**
5. Open **`03_OPEN_MULTIPLAYER_WINDOWS.cmd`** (or
   `http://127.0.0.1:8765/`) in *two different wallet-enabled browser
   profiles*, and connect with two separate **test** EVM wallets.
6. Sign the login message (no transaction) and enter the same town. Try
   Left/Right or A/D, hold Down then release while still holding Right, Space
   to jump, and Z to attack. Watch grounded feet and the two-player room.
7. For the Forge editor, open **`NES_Forge.html`** from this same extracted
   folder. In **WORLD → Live**, use the current host's administrator token
   and confirm **protocol 13** before attempting World publication.

If you have a populated `host/localhost-world.db` with players/XP/camps,
**back it up while the old host is stopped**. Restore only after backing up.
The script `PREPARE_PRIVATE_Z2_DEMO.py` refuses to replace an existing
different World and requires matching source identity for repair.

## Manual localhost commands

From the extracted `NES_Forge_Public_Review` folder:

```powershell
py -m pip install -r requirements.txt
py host\diagnose.py
py host\server.py
```

For an *existing* world, optional test-only sword unlocks can be enabled with
`py host\server.py --pilot-sword-techniques`; this is **not** proof that the
original Zelda II player has earned the original techniques.

### macOS/Linux

```sh
python3 -m pip install -r requirements.txt
sh START_LOCALHOST_MAC_LINUX.sh
```

To create source art locally, install Playwright and run:
`python3 PREPARE_PRIVATE_Z2_DEMO.py --rom /path/to/your/ROM.nes --admin-token YOUR_LOCAL_TOKEN`.

## What's corrected

- Link is drawn at the first verified horizontal **floor band** of the locally
  published stage image rather than at the older hard-coded floating Y position.
  This is a **visual** anchor, not recovered collision geometry.
- The camera and actor sprites use the newer bounded one-source-frame position
  sampler instead of restarting an 88ms ease on every network update.
- The host retains horizontal input through a crouch-hold/release cycle and
  broadcasts the next-frame vertical presentation endpoint for jumps.
- Wallet, shared room, server-owned HP, XP, and camp data remain server-owned.
- Local `/native-editor` is routed to the **rights-reduced RC2 HTML** included
  in this package, not a missing private entry-point filename.

## What remains incomplete

This is **not** a native ROM patch or a 1:1 multiplayer Zelda II engine. The
visual floor alignment does **not** implement original platform collision,
wall solidity, enemy AI, item/spell logic, or exact sword hitboxes. Original
room artwork/poses and first-session delivery require a supported original
ROM in the user's own possession. Signed-wallet concurrency, graphics,
and input parity need **two real browser profiles** on the owner's PC before
promotion beyond alpha. Local signing is EVM `personal_sign` (chain ID 1 for
identity only), not the separate Stellar/ForgeNet blockchain PoC.

The public source may still have game-specific research annotations needing
independent rights review. This review ZIP omits the original RC2 commercial
recovery exports and private source evidence.

## Release verification

The repository keeps the exact source-only archive hashes and independently
runs Python/JS compilation, server/API smoke, the Rev 8 frame-continuity test
with synthetic input, a ground-floor renderer check, and ZIP safety/inventory
checks. The [original nine-step beginner tutorial](../../../docs/getting-started/Your_First_NES_Game.md)
remains on GitHub `main` and still needs RC2 walkthrough compatibility checks.
