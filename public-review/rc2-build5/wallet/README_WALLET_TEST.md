# NES Forge RC2 Build 5 — wallet-enabled localhost multiplayer review

**Status: experimental compatibility candidate, not a verified RC2 multiplayer release.**
The bundled editor is the same rights-reduced RC2 public review editor. The wallet
server and player client are copied from the v17.1 experimental hosted-worlds
protocol-13 track. **Cross-build RC2 gameplay parity has not yet been accepted.**

## Start here (Windows)

1. Extract the **RC2 Build 5 Public Wallet Review Candidate 2 ZIP** in its entirety.
2. Open the extracted `NES_Forge_Public_Review` folder.
3. Double-click **`START_LOCALHOST_WINDOWS.cmd`**. It checks prerequisites and
   starts `host/server.py`. Requires Python 3.11+ with the `py` launcher and
   internet access once to install `aiohttp` and `pycryptodome`.
4. Keep the command window open. It prints a fresh **WORLD Live admin token**.
   Treat it as private. The host listens only on `127.0.0.1:8765`.
5. Open **`NES_Forge.html`** in Edge/Chrome, load your own supported Zelda II
   source/World, then go to **WORLD → Live**.
6. Enter that host's admin token, click **Test localhost**, and confirm protocol
   **13**, not merely "reachable." Then select the World and use
   **Load selected World on host**, approving publication deliberately.
7. Open **http://127.0.0.1:8765/** in two distinct wallet-enabled browser
   profiles (or two different browsers). Each profile must use a different EVM
   test wallet. Click **Connect & Sign** to sign a login message (no on-chain
   transaction). Bring both players into the same town/cave/palace area.
8. Check server-authoritative state, movement/attacks, XP persistence and
   independently visible player positions. Record the exact failing step and
   visible status if a workflow does not work.

### Windows manual commands

From the extracted `NES_Forge_Public_Review` folder:

```powershell
py -m pip install -r requirements.txt
py host\diagnose.py
py host\server.py
```

If `py` is unavailable but `python` is installed, substitute `python`.

### macOS/Linux

```sh
python3 -m pip install -r requirements.txt
sh START_LOCALHOST_MAC_LINUX.sh
```

Open `NES_Forge.html` as above and use the same local player URL.
The shell launcher itself invokes `host/diagnose.py` and `host/server.py`.

## What is actually included

- Standalone **sanitized RC2 Build 5** editor (the exact same bytes as
  Public Review Candidate 1).
- `host/server.py` — localhost-only protocol-13 authoritative prototype.
- `host/client.html`, `host/client.js`, `host/render-world.js` — browser player.
- `host/eth_verify.py` and `host/diagnose.py` — EVM signature verification and
  local prerequisite diagnostics.
- Windows/macOS launchers, `requirements.txt`, and package manifest.

**Do not mix host/editor files from other checkpoints.** Stop any existing
server on port 8765 first. Preserve your private `host/localhost-world.db`
before upgrading; the database contains persisted player/wallet/XP state. Keep
database, tokens, ROMs, personal keys, and recovery artifacts out of GitHub.

## Boundaries / acceptance status

- Only Ethereum-compatible `personal_sign` wallet identity is available here,
  using separate test wallets. This is **not** Stellar testnet rewards or minting.
- RC2's embedded hosted-world UI has not been fully accepted against this
  restored v17.1 host/client. Backend protocol 13, standalone player HTTP
  serving and malformed challenge rejection are the initial smoke gates.
- Wallet-signing success, two-player synchronization, native Zelda II graphics
  and mechanics, real hardware and public hosting all require further testing.
- The server is bound to localhost, not exposed to the LAN/internet.
- Public rights clearance applies neither to the original commercial ROMs
  nor automatically to every remaining source annotation. Do not redistribute
  private ROM-derived recovery evidence or proprietary assets.

## Verification

The repository contains `wallet/build_wallet_release.py` (deterministic
candidate packager) and `wallet/tests/test_wallet_package.py` (basic localhost
and archive-inventory smoke). The source and build history are in GitHub.
Do not treat smoke-test success as full browser or gameplay acceptance.
