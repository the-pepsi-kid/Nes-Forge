# Restore the source checkpoint

The branch is local only. Its GitHub push is pending explicit owner approval after automatic approval review rejected publication during this turn.

The bundle contains the new commits and requires source parent `697a998e744c7794fae5d1063748e8d83d5ffe57`, already in the existing public repository. Clone that repository, then fetch this included bundle:

```sh
git clone https://github.com/the-pepsi-kid/Nes-Forge.git
cd Nes-Forge
git fetch origin 697a998e744c7794fae5d1063748e8d83d5ffe57
git fetch /absolute/path/to/Developer/NES_Forge_Context_Cleanup_1_Source.bundle implementation/context-cleanup-2026-10-20
git switch -c restored-context-cleanup FETCH_HEAD
cd app
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

This restores the source parts, source manifests, tests, current documentation and exact history, rather than asking the next chat to edit only a generated HTML. The complete documented user kit and matching evidence accompany it. No private ROM or native source-bearing project is included.
