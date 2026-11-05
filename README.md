# NES Forge

Standalone NES/6502 game authoring and ROM investigation, with visual editors, source tools and guided workflows.

## Start here — your first NES game

New to Forge? Begin with **[Your First NES Game](docs/getting-started/Your_First_NES_Game.md)** — a hands-on nine-step walkthrough from drawing a tile to compiling a playable ROM. An [offline HTML edition](docs/getting-started/Your_First_NES_Game.html) ships in the repository download.

The lesson was originally written for alpha.11. It is restored as part of RC2 onboarding, but its controls **still require RC2 compatibility testing**. Keep the [original version-matched tutorial kit](https://github.com/the-pepsi-kid/Nes-Forge/blob/415cf1926169c2426481fa75ddc4b885658687bd/tester-kit/alpha11-review-1/START_HERE.md) for historical comparisons.

## RC2 Build 5 — current public alpha review

**[Download RC2 Build 5 — Grounded Wallet Review Candidate 3](public-review/rc2-build5/NES_Forge_RC2_Build_5_Grounded_Wallet_Review_Candidate_3.zip)** · [Release and local multiplayer instructions](public-review/rc2-build5/wallet/README_GROUNDED_REVIEW.md)

**Verified download:** 2,437,650 bytes · SHA-256 `d1c685d5023508bcd139c3faabc91a3f8a7354e870ce78dc24971e241961ebcf`. [Passing build and grounded-player smoke tests](https://github.com/the-pepsi-kid/Nes-Forge/actions/runs/41966312280).

This is the newer **sanitized RC2 Build 5** editor, packaged with the corrected local multiplayer server and wallet clients. The host now includes source-stage **visual floor alignment**, Rev 8 bounded frame-continuity, held-direction/crouch recovery, and original-ROM-source artwork preparation using **your own local ROM**. These are experimental hosted mechanics, **not certified original Zelda II physics or collision**.

To get started:

1. Extract the ZIP. Read **`NES_Forge_Public_Review/START_HERE.md`** and open `NES_Forge.html` in Chrome/Edge.
2. For a two-wallet local test on Windows, run `01_START_MULTIPLAYER_SERVER_WINDOWS.cmd` from that folder, optionally run `02_PREPARE_PRIVATE_ROM_WINDOWS.cmd` for a **fresh** World, and open `03_OPEN_MULTIPLAYER_WINDOWS.cmd`. Python 3.11+, `aiohttp`, `pycryptodome`, and (for local ROM art preparation) Playwright Chromium are needed.
3. Use **two different wallet-enabled browser profiles** and test wallets; neither private keys nor original ROM bytes are shipped. Wallet signing is an EVM message, not a blockchain transaction.
4. Follow the [first-game beginner tutorial](docs/getting-started/Your_First_NES_Game.md), also available offline inside the download at `docs/getting-started/Your_First_NES_Game.html`.

**[Candidate 2 — previous wallet/server smoke build](public-review/rc2-build5/NES_Forge_RC2_Build_5_Public_Wallet_Review_Candidate_2.zip)** and **[Candidate 1 — editor-only](public-review/rc2-build5/NES_Forge_RC2_Build_5_Public_Review_Candidate_1.zip)** are retained for audit and rollback. [Candidate 3 validation](https://github.com/the-pepsi-kid/Nes-Forge/actions/workflows/rc2-grounded-wallet-release.yml) includes synthetic source-floor/Rev8 motion tests, real localhost HTTP, archive identity, and the offline tutorial. Full two-browser/wallet and native-ROM fidelity acceptance remain separate.

**This is a sanitized derivative, not the original 46.3 MB private RC2 Build 5.** Known proprietary recovery catalogs were removed or disabled, including Castlevania exact-match snapshot import. The deterministic build and starter-ROM smoke checks passed; full Chromium workflow acceptance, native editing parity, hardware, and remaining redistribution rights **have not been established**. This is an experimental alpha candidate, **not a production release**.

The top-level [`nes-forge.html`](nes-forge.html) still contains the previously accepted **2.0.0-alpha.11** editor. It has *not* been silently replaced with RC2. Use Candidate 3 above for the newer editor and grounded local multiplayer pilot until its root entry is promoted after full acceptance.

## Previous alpha: 2.0.0-alpha.11 (retained on main)

1. Download **Code → Download ZIP** from `main`, or clone this repository.
2. Extract the ZIP and open [nes-forge.html](nes-forge.html) in a browser. No build command or local server is required.
3. Use the upper toolbar's **Retro Workstation** toggle for the compact dark appearance. **Resources** and **Connected Workspace** are available independently of the appearance setting.
4. Start with the [offline project handbook](app/docs/PROJECT_HANDBOOK.html), [per-project tutorials](app/docs/projects/README.md) and [developer/asset guide](app/docs/NATIVE_RECOVERY_TUTORIAL.html). HTML guides open locally after extraction; GitHub displays their source.

The root HTML and [generated application](app/mainline/NES_Forge_2.0.0-alpha.11.html) are identical. Application SHA-256: `90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322`.

## Current workflows

- Visual authoring and existing project owners remain connected across Scenes, CHR, palettes, Metasprites, Animation, Audio, World, actors, assembly and emulator tools.
- Native recovery methods are title-specific. Consult each [title tutorial](app/docs/projects/README.md) for editable assets, native writeback and unresolved scope.
- Punch-Out includes native arena tile/attribute edits, physical CHR/fight-palette editing, bounded Glass Joe replay experiments and **30 full-pose X/Y placement views**. See the [worked tutorial](app/docs/projects/PUNCH_OUT.md) and [pose-position handoff](reviews/punch-out-pose-position-1/HANDOFF.md).
- Independent RE, 6502 coding, external hex editing, direct HTML changes and authored-game development are covered in the [developer guide](app/docs/NATIVE_RECOVERY_TUTORIAL.md). Update the relevant title tutorial whenever its methods change.

Punch-Out recovery remains partial. Individual native piece geometry, delta poses, native animation, attack/damage/collision editing and native Audio writing are pending. Whole-pose movement changes the graphic's position and can misalign it with the original hit rules. MMC2 timing remains approximate. Browser layout/device/listening/controller/hardware acceptance and the unavailable historical full release gate remain separate from the fresh checks recorded here.

## Original Pepsi artifact

The original NES Forge / Pepsi vending machine version is preserved exactly:

- [Original Pepsi archive branch](https://github.com/the-pepsi-kid/Nes-Forge/tree/archive/original-pepsi)
- [original-pepsi tag and historical download](https://github.com/the-pepsi-kid/Nes-Forge/releases/tag/original-pepsi)
- [Original standalone HTML](archive/original-pepsi.html), retained byte-for-byte in the current checkout

Both references point to former `main` commit `61dee20c4c36886c3fac143c0258d7fac27d5ff7`. Existing historical HTML files, archive files, feedback template and documentation are retained. The original main README is saved in the [promotion record](reviews/main-alpha-promotion-1/Previous_Main_README.md).

## Develop and verify

Edit the modular files under `app/src/`, then rebuild and refresh the standalone entry:

```sh
python3 app/tools/bundle.py
python3 tools/sync_main_entry.py
python3 app/tools/bundle.py --check
python3 tools/sync_main_entry.py --check
python3 reviews/punch-out-pose-position-1/run_checks.py
```

For the strict parsed-DOM startup/control check:

```sh
npm install --prefix /tmp/nes-forge-dom-tests --no-save --ignore-scripts jsdom@30.1.3
NODE_PATH=/tmp/nes-forge-dom-tests/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html /tmp/nes-forge-startup.json
```

The promotion reruns **104 available public checks across nine suites**, the synthetic codec lesson, **10 strict parsed-DOM startup/control checks**, native pose lifecycle checks on both supplied US revisions, native artwork lifecycle checks on both revisions, and the parsed-DOM pose workflow. Private ROM inputs are required for native lifecycle checks and are not distributed. Recorded live original-engine playback evidence remains linked to the same application hash; it is not a new hardware or complete-fight acceptance claim.

See the [promotion handoff](reviews/main-alpha-promotion-1/HANDOFF.md), [current candidate identity](CANDIDATE.json), and [earlier development checkpoints](DEVELOPMENT_CHECKPOINTS.md). The older [RC2.1 tutorial/tester kit](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/README.md) remains available at its pinned historical commit; its application and test counts describe that older kit.

[Send alpha feedback](https://github.com/the-pepsi-kid/Nes-Forge/issues/new?template=alpha-feedback.yml). The project-wide license remains undecided; preserve existing upstream notices and the [previous license-status record](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/LICENSE_STATUS.txt).
