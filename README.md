# NES Forge

Standalone NES/6502 game authoring and ROM investigation, with visual editors, source tools and guided workflows.

**Current development baseline: 2.0.0-alpha.11 · Retro Workstation and native Glass Joe pose positions.** The owner approved this working alpha for `main`. Support and verification remain specific to the workflows documented below.

## Open the current alpha

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
