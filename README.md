# NES Forge

Standalone NES/6502 game authoring and ROM investigation, with visual editors, source tools, an emulator and a local multiplayer pilot.

## License

**Open source — Apache License 2.0.** Original NES Forge code and documentation
contributed under this project license may be used, modified, redistributed,
forked, and used commercially under the conditions in [LICENSE](LICENSE).
Preserve applicable attributions in [NOTICE](NOTICE) and review the
[third-party provenance inventory](docs/licensing/THIRD_PARTY_REVIEW.md).
The inventory remains under review; some third-party material has separate
terms.

This does **not** license commercial NES ROMs, imported game graphics/music,
private game captures, game trademarks or third-party content. Users bring
their own legitimately obtained material. Tokenizing or placing an asset
on-chain does not grant copyright permission.

## Open the current build

Download **Code → Download ZIP**, extract it and open **[nes-forge.html](nes-forge.html)** in Chrome or Edge. **[NES_Forge.html](NES_Forge.html)** contains exactly the same editor and is the entry served by the multiplayer host. Both are generated from one ordered source manifest.

The current development alpha is **Integrated Review 5**, including the owner-reviewed Resources and direct RE import changes. Earlier RC2 downloads are historical checkpoints. The [candidate record](CANDIDATE.json) identifies the exact current public build.

## Try it

| Task | Route |
|---|---|
| Make a game | Open **Project lessons → Your first NES game** for the integrated nine-step tutorial. |
| Try an authored project | Open a JSON from **Examples**, choose **Open Forge project**, then **Build & Run**. Click the emulator and use arrows, Z and X. Save Project As and reopen the JSON to retain work. |
| Inspect a supported ROM | Select your own ROM through the main picker or RE. Open **Resources → ROM library** to browse the retained source catalog. |
| Edit recovered assets | Select a supported source room, pose or script and choose **Edit source copy**. It opens in the existing editor; existing working copies retain local edits. |
| Inspect an extraction | Open your local extraction ZIP. Resources shows its source catalogs, previews and supported editable projects. |
| Write assembly | Use **Code → Source workspace** for multi-file 6502 source, build and export. |

Zelda II direct RE imports expose 30 Link display poses and 567 room-table slots, including aliases and unavailable entries. Ninja Gaiden exposes 202 source poses and 83 scripts, with three unresolved scripts explicitly blocked. Installed native resource adapters expose the full retained room/page catalog rather than only the first working page. Counts describe source records, not complete recovered gameplay or newly implemented native writers.

**Import as new project replaces the active project.** Save/reopen retains that project's catalog and working copies. Cross-ROM reuse uses explicit donor/workshop/asset-copy actions. Editable capacities remain 64 Scenes, 32 Worlds, 256 metasprites and 256 animations; larger source catalogs are browsed without silently truncating them.

See the [per-ROM asset report](ASSET_STATUS.md), its [offline HTML edition](ASSET_STATUS.html), and the [original Review 5 report](docs/reviews/NES_Forge_Asset_Report_Review5.md). The historical private report describes the owner's review artifact; the [public profile](REVIEW.md) identifies distribution differences and fresh checks.

## Local multiplayer

Install Python 3.11+ and run `python -m pip install -r requirements.txt`. On Windows use **01_START_MULTIPLAYER_SERVER_WINDOWS.cmd**; on macOS/Linux use `sh START_LOCALHOST_MAC_LINUX.sh`. Open `http://127.0.0.1:8765/editor` for this same editor or `http://127.0.0.1:8765/` for the player client. **World Live** contains the setup guide.

Original Zelda II art preparation uses your own local supported ROM and Playwright Chromium. Install `requirements-dev.txt`, run `python -m playwright install chromium`, then use **02_PREPARE_PRIVATE_ROM_WINDOWS.cmd**. Hosted movement remains experimental; two-human wallet play and original-game fidelity remain separate acceptance checks.

## Build and verify

Edit the modular sources under `app/src/`, then run:

```sh
python app/tools/bundle.py
python app/tools/bundle.py --check
python tools/sync_main_entry.py --check
npm --prefix QA ci --ignore-scripts
python -m pip install -r requirements-dev.txt
python QA/verify.py --jobs 1
python tools/verify_public_profile.py
```

For browser checks, install Playwright Chromium and add `--browser`. `CHROMIUM_PATH` selects an existing Chromium executable. Private extraction and original-ROM suites are opt-in through `--extractions DIR --cartridges DIR`; those inputs are not distributed. Results identify the exact tested editor hash. [Publication checks and limitations](reviews/integrated-review-5/Publication.json) distinguish fresh public checks from retained private-review evidence.

The inventory tool is `python tools/inventory/scan_rom.py --help`; physical bank extraction is `node tools/extract-cartridge.cjs --help`.

## Public distribution and known limits

Commercial source ROMs, extraction archives, private captured-project templates, embedded raw APU/CHR/OAM captures, wallet data and host databases are excluded. The two embedded private Castlevania capture catalogs are inert in this public profile, as in the preceding public RC2 package. Native decoders still read your chosen ROM locally. Castlevania's private captured-project auto-import and bundled raw evidence exports require separately supplied local recovery material; the report's captured-asset counts do not imply those assets are shipped here.

Native recovery and writeback remain partial and title-specific. Full enemy AI, collision, dialogue, quest and native Audio writing are not established across the corpus. The accepted remaining pose ordering/composition issues, DigiGhosts/Beacon Island visual issues, device/listening/hardware checks and two-human hosted acceptance remain open. This is a development alpha.

## Earlier checkpoints

- [RC2 public review downloads](public-review/rc2-build5/README.md), including the unchanged Candidate 2 and Candidate 3 archives.
- [Historical alpha.11 generated editor](app/mainline/NES_Forge_2.0.0-alpha.11.html).
- [Original Pepsi archive branch](https://github.com/the-pepsi-kid/Nes-Forge/tree/archive/original-pepsi) and [original standalone HTML](archive/original-pepsi.html).
- [Earlier beginner tutorial](docs/getting-started/Your_First_NES_Game.md) and [native recovery guides](app/docs/projects/README.md).

[Send alpha feedback](https://github.com/the-pepsi-kid/Nes-Forge/issues/new?template=alpha-feedback.yml). Preserve existing upstream notices and the repository's open-source licensing terms.

## Developer companion: Agent Lab and on-chain cartridge research

The [local Agent Lab v0.3](tools/agent-lab/README.md) verifies source-ROM bank extraction and organizes evidence by ROM identity, including Forge's separate native adapter and [GameRENative](docs/architecture/ROM_ASSET_ARCHITECTURE.md) investigated catalogs. Six specialized *logical* agent roles are defined; only a bounded local-Qwen suggestion pass is currently model-driven. This tool does **not** change the offline HTML editor or claim full native recovery, AI, physics or writeback across games.

See the [integration delivery board](docs/architecture/AGENT_LAB_DELIVERY.md) and [native on-chain cartridge research proposal](docs/proposals/FORGE_ONCHAIN_CARTRIDGE_PROTOCOL.md). The on-chain work proposes original bytecode-stored assets with optional ERC-721/6551 ownership; it is **not deployed or required** to use Forge. Never commit original commercial ROMs, raw banks, audio, rendered captures or private investigation projects.
