# Reconciled source checkpoint

Both native and hosted builds use canonical `app/src` from the repository root.
See `RECONCILIATION.md` and `app/docs/projects/HOSTED_WORLDS.md` in the checkout.
The current HTML includes the newer native capability/build-control and Glass Joe
idle/CHR-navigation fixes. Launchers remain in this directory. Historical source
snapshots stay in the original uploaded archive; current regressions use this
current editor. The v17.1 host/player mechanics and protocol 13 are retained.

# NES Forge 3.0.0-alpha.1 technical candidate (internal v17.1)

This complete review kit is the proposed 3.0 hosted-world alpha. See **ALPHA_RELEASE_NOTES.md** and **ALPHA_STATUS.md**. Existing v0.17.1 guide below remains accurate for its host/editor implementation. GitHub publication is separate from local ZIP distribution.

---

# v0.17.1 — WORLD Live compatibility correction

**This is a COMPLETE review kit, not a patch.** The v0.17 Forge editor incorrectly required localhost host protocol 12 even though its bundled host advertised protocol 13. This kit aligns the editor with the v0.17 protocol-13 host, corrects the setup guide's compatibility checks, and adds a browser regression test. No change to native ROMs, project schemas, server database, or hosted multiplayer rules.

**Quick start:** Extract the entire ZIP, stop any previous localhost server with `Ctrl+C`, and run `START_LOCALHOST_WINDOWS.cmd` in THIS extracted folder. In the same folder open `NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html`. Open your Zelda II native World in Forge, enter the freshly printed admin token, use `Test localhost` (should say **protocol 13 verified**), and then `Load selected World on host`. Approve the publication confirmation. Do NOT run another kit's host at the same time. **Preserve and back up your existing `localhost-world.db`** if you want to retain hosted users/XP/camps; if your original database resides in another kit folder, copy it into THIS kit's `host/` folder while both servers are stopped. Never distribute the database or admin token.

**Validation scope:** `python tests/test_v17_world_load_compatibility.py` (14/14 checks) exercises the load button, incompatible protocol rejection, matching guide indicators, and real server World acceptance without copyrighted ROM bytes. Full native room/pose reconstruction still requires your own verified Zelda II ROM; it is not certified by the synthetic test. See RELEASE_NOTES.md for test coverage and known historical test assumptions.

---

# NES Forge 3.x — v0.17 Original Link Actions in Hosted Multiplayer

**This is a COMPLETE experimental Forge + localhost server build. It is NOT a patch.**

### What is newly implemented

- The existing, ROM-recovered 15×2 Link OAM/CHR pose atlas is rendered per hosted player using a SERVER-AUTHORITATIVE action selector. This actually displays **Upward Stab selector 8** and **Downward Stab selector 9** from the local original ROM's recovered pose records. Existing left/right pose rows and independent client cameras remain.
- Hosted side-view controls: **Space / Jump**; **X / Upward Stab**; **C / Downward Stab** (airborne); **Z / Forward Sword**; arrows/A,D for horizontal movement. Mouse/touch buttons are present too. The older **Legacy Attack (test)** button remains for earlier regression coverage.
- Both players receive the same server-owned action state, pose selector, provisional vertical offset and HP changes. The host validates the source-pose publication, attack commands, same-room targets, cooldown and geometry. Neither browser may choose a pose or submit damage.
- Upward attacks can hit a jumping player above; downward attacks can hit a player below while jumping; forward attacks retain a horizontal pilot hit check. Damage is **8 experimental HP**, no XP, logged with `provisionalHitbox:true`.
- Existing hosted players, camps, XP, wallet IDs, World snapshots and original ROM building remain compatible. Changes are confined to the localhost client/server and an updated Forge WORLD Live help guide.

### How to play-test it

1. **Stop your OLD localhost server** (`Ctrl+C`). **Back up `localhost-world.db`** if you have an ongoing World, player or camp you want to preserve. Keep the backed-up database private.
2. Extract this complete ZIP to a new folder. Use `START_LOCALHOST_WINDOWS.cmd` (Windows) or `./START_LOCALHOST_MAC_LINUX.sh` (macOS/Linux). Install Python 3.11+, `aiohttp`, and `pycryptodome` if the host's diagnostic requests them. Run only on your local computer.
3. Open **NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html**. If the server has an existing World database, use the administrator token printed by the NEW server process to connect to it in **WORLD → Live**. Do **not** republish a full World snapshot just to test attacks.
4. Load your own Zelda II ROM in Forge, select the matching hosted West Hyrule World, enter the admin token, and click **Publish original Link display poses** if the host does not already have the matching original pose atlas. Do this once; it does not reset players/XP/camps. If the host reports matching art already published, you can skip it.
5. Open `http://127.0.0.1:8765/` in two wallet-enabled browser profiles and sign in with two distinct local-test wallets. Both must enter the SAME town, cave, palace or camp area. Town (2,6) has the most verified original background evidence. Other entrances do NOT yet have guaranteed original backgrounds or native traversal.
6. In either side-view player client: press **Space** to jump; **C** during the jump for Downward Stab (source selector 9); press **X** for Upward Stab (selector 8); press **Z** for Forward Sword. Have the players close to one another. Both should see action changes; attacks only change HP if the SERVER'S provisional attack zone contains another player.
7. After observing results, verify the host's WORLD Live audit entries (`side-stab-pilot-hit`, `side-stab-pilot-miss`, `side-jump-pilot`). The app does not change the imported ROM or native game build.

### Fidelity and engineering boundaries

- **Source authenticity:** Zelda II Link's pose pixel composition and selectors 8/9 are recovered from the original local ROM using Forge `GameRENative` / `HostedPlayerPoses`.
- **NOT 1:1 gameplay:** hosted animation duration/pose timing, jump height/physics, character y geometry, sword hitboxes, HP damage, collision and enemy behavior are **TEST approximations**, NOT Zelda II's recovered native engine rules. Only the display pose assets and selectors are source-backed. Attack access is enabled for multiplayer demonstration and does not enforce earned-in-original-game technique prerequisites.
- The host uses a reversible/unmodified source-pose asset upload: no `.nes`, copyrighted raw ROM, private wallet key or Nintendo-owned tile source bytes are bundled in this package.
- Vertical motion/action flags live in the current host process; player XP, area, structures and wallets remain persisted in SQLite. Mid-jump continuity across a server restart is not promised.
- No changes to public hosting, GitHub or your private database. The server binds only `127.0.0.1`.

### Developer verification

Run from kit root:

```bash
python ../../../app/tools/bundle.py --manifest hosted-source-manifest.json --check
python tests/test_v17_hosted_stabs.py
NES_FORGE_Z2_ROM=/path/to/private/ZeldaII.nes python tests/test_v17_client_stabs.py
python tests/test_v10_pvp.py
python tests/test_v12_two_player_room_camera.py
python tests/test_shared_sideview.py
```

These tests cover actual original-ROM pose recovery, two-player browser rendering/control dispatch, authoritative up/down hit/miss gating, legacy compatibility, and 20 signed-wallet shared-area users. None of the tests certify original Zelda II physics or 1:1 combat.
