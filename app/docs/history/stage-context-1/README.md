# NES Forge — Scene Resource Context

Current candidate: **2.0.0-alpha.11 / context-cleanup-1**, an unpromoted development checkpoint based on `697a998e744c7794fae5d1063748e8d83d5ffe57`. Ordinary projects write schema **12**; projects containing `nativeGame` write schema **13**. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for current identity, evidence and scope.

Open `mainline/NES_Forge_2.0.0-alpha.11.html`. Expand **Scene resources** below the toolbar, choose a World or recovered room, then choose a scene/page. Related Worlds, poses and animations open their existing canonical records; CHR, collision and Actor views use the selected scene. Audio remains project-wide. [Navigator guide](docs/SCENE_CONTEXT.md).

Native Zelda II source/recipe preservation and four supported location fields remain available. [Native build tutorial](docs/NATIVE_ENGINE_EDIT_BUILD.md). Full Stage → Scene context, native audio/art encoders and complete game reconstruction remain unfinished.

## Reproduce

```sh
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

The complete gate retains all 116 predecessor suites and adds the suites in `context-cleanup-suites.json`. Fresh results identify their tested HTML hash. Browser, listening, devices and owner acceptance are separate.

[Prior README, retained verbatim](docs/history/context-cleanup-1/README.md).
