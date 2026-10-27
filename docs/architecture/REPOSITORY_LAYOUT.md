# NES Forge repository layout (incremental migration)

This layout preserves the accepted `main` 2.0 alpha and its existing build/test paths. Do not rename or shuffle all 800+ existing paths in one migration. New experiments are self-contained; releases are generated from immutable reviewed sources.

```text
nes-forge.html                         # accepted default standalone Forge editor
app/                                   # canonical modular editor, compiler, runtime, RE
app/src/                               # production source
app/mainline/                          # generated editor snapshots
app/tests/                             # editor regressions
app/docs/                              # tutorials and user guides
experiments/
  hosted-worlds/
    README.md
    v17.1/                             # complete independent Forge / server / client / tests
docs/architecture/                     # dependency, module, protocol, layout contracts
reviews/                               # historical review proofs and handoffs (unchanged)
archive/                               # preserved originals; archive/original-pepsi branch
tools/                                 # existing release/entry tooling
```

## Module ownership

- `app/` owns canonical authored projects, reverse-engineering, scene/audio/CHR editors, and native ROM builds.
- `experiments/hosted-worlds/<version>/` owns opt-in localhost networking, server-authoritative sessions, player client, and snapshot publication. Original ROMs are never modified by hosting.
- `reviews/` owns time-stamped validation evidence. `archive/` is not for active edits.
- ROMs, database state, tokens and generated ZIP release artifacts are ignored; source code, manifest, tests, sample *synthetic* data and plain documentation can be committed.

## Migration rules

1. Keep root `nes-forge.html`, `app/`, and existing `tools/` stable to avoid breaking external links and test scripts.
2. Add experimental work under versioned directories, each with its own launchers and README. Shared editor implementation stays in canonical app/src; the optional hosted manifest composes those inputs with hosted extensions.
3. Preserve whole, independently runnable review kits. A version folder contains the generated HTML, host/client and launchers needed to run it (except local dependencies, user ROMs and secrets); rebuilds/tests use canonical app source from the complete checkout.
4. Future extraction of shared server/client modules requires contract tests and explicit review, not broad copy/paste of title-specific logic into the editor core.
5. A Git branch or PR is experimental until accepted; keep `main` and `archive/original-pepsi` untouched until approved.

## v17.1 acceptance

`Test localhost` must show **protocol 13**, reject protocol 12 with a clear error, and load the selected World once. Hosted player state and legacy editor builds must not regress. The `tests/test_v17_world_load_compatibility.py` suite verifies 14 synthetic browser/server checks; it does **not** establish all native Zelda II mechanics are recovered.
