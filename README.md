# NES Forge

Standalone NES/6502 game authoring and ROM investigation, with visual editors, source tools and guided workflows.

**Development candidate: 3.0.0-alpha.1 · Shared editor and hosted-world integration.** This feature branch extends the accepted main checkpoint `6d07f18`. Source publication targets draft PR #3; this candidate has not been merged into main. Support and verification remain specific to the workflows documented below.

## Open this candidate

1. Use the supplied standalone/review kit or this development source checkout.
2. Open the supplied standalone HTML, or extract the kit and open [nes-forge.html](nes-forge.html) in its Source checkout. No build command or local server is required.
3. Use the upper toolbar's **Retro Workstation** toggle for the compact dark appearance. **Resources** and **Connected Workspace** are available independently of the appearance setting.
4. Start with the [offline project handbook](app/docs/PROJECT_HANDBOOK.html), [per-project tutorials](app/docs/projects/README.md) and [developer/asset guide](app/docs/NATIVE_RECOVERY_TUTORIAL.html). HTML guides open locally after extraction; GitHub displays their source.

The root HTML and [generated application](app/mainline/NES_Forge_2.0.0-alpha.11.html) are identical. Application SHA-256: `0be56290249d2f3b03289b1b95b977181f5e423eb357f2919bb1b87da31d90f7`.

## Native and hosted builds

Open `nes-forge.html` for native/offline work. The [hosted editor and launchers](experiments/hosted-worlds/v17.1/README_START_HERE.md) add optional localhost hosting. Both build from the same canonical source; use `python3 app/tools/bundle.py --manifest hosted-source-manifest.json` for the hosted output. The [hosted workflow tutorial](app/docs/projects/HOSTED_WORLDS.md) is also included in the offline handbook.

## Current workflows

- Connected Workspace, intake, Scene context, Area Library and native preflight now share the current backend/writer scope. Native tools opens the title’s explicit editing routes. Generated Scene packing and ROM configuration controls cannot alter native projects.
- Visual authoring includes Scenes, CHR, palettes, Metasprites, Animation, Audio, World, actors, assembly and emulator tools. The connected-workflow review tracks the remaining selection, provenance and shared-resource gaps.
- Native recovery methods are title-specific. Consult each [title tutorial](app/docs/projects/README.md) for editable assets, native writeback and unresolved scope.
- Punch-Out includes native arena tile/attribute edits, physical CHR/fight-palette editing, bounded Glass Joe replay experiments and **30 full and five explicit incremental X/Y placement views**, with a grouped idle move. Native pose controls now sit above the source preview; pose and CHR context shortcuts lead to the correct sprite buffer and physical-bank pixel writer. See the [worked tutorial](app/docs/projects/PUNCH_OUT.md) and [navigation handoff](reviews/punch-out-artwork-navigation-1/HANDOFF.md).
- Independent RE, 6502 coding, external hex editing, direct HTML changes and authored-game development are covered in the [developer guide](app/docs/NATIVE_RECOVERY_TUTORIAL.md). Update the relevant title tutorial whenever its methods change.

Punch-Out recovery remains partial. Individual native piece geometry, position-less incremental records, native animation, attack/damage/collision editing and native Audio writing are pending. The incremental C-family retains the original screen-height priority rule. Whole-pose movement changes the graphic's position and can misalign it with the original hit rules. MMC2 timing remains approximate. Browser layout/device/listening/controller/hardware acceptance and the unavailable historical full release gate remain separate from the fresh checks recorded here.

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
python3 reviews/connected-workflow-repair-1/run_checks.py
```

For the strict parsed-DOM startup/control check:

```sh
npm install --prefix /tmp/nes-forge-dom-tests --no-save --ignore-scripts jsdom@30.1.3
NODE_PATH=/tmp/nes-forge-dom-tests/node_modules node app/tests/workstation-startup-dom.cjs nes-forge.html /tmp/nes-forge-startup.json
```

This capability checkpoint reruns **104 available public checks across nine suites**, the synthetic codec lesson, **10 strict parsed-DOM startup/control checks**, and native artwork navigation on both supplied US revisions. Twelve additional parsed-DOM checks cover applicable controls, supported-writer routes, native output preservation, fresh reopen, safe refusals and Zelda II terrain continuity. Actual sheet/pixel mouse events check physical writes, Undo/Redo, save/reopen, grouped-idle composition and rejection of unsupported reference edits. Parsed DOM stubs canvas/layout/timers; browser/device acceptance remains separate. The earlier native idle/playback reports retain their own preceding HTML hash; codecs, encoders and emulator inputs are unchanged by this navigation repair. Private ROM inputs are required for native checks and are not distributed.

See the [current handoff](reviews/hosted-integration-1/HANDOFF.md), the [accepted-main promotion record](reviews/main-alpha-promotion-1/HANDOFF.md), [current candidate identity](CANDIDATE.json), and [earlier development checkpoints](DEVELOPMENT_CHECKPOINTS.md). The older [RC2.1 tutorial/tester kit](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/README.md) remains available at its pinned historical commit; its application and test counts describe that older kit.

[Send alpha feedback](https://github.com/the-pepsi-kid/Nes-Forge/issues/new?template=alpha-feedback.yml). The project-wide license remains undecided; preserve existing upstream notices and the [previous license-status record](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/LICENSE_STATUS.txt).
