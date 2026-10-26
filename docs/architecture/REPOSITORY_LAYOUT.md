# Repository ownership and tree plan (incremental)

The accepted `main` 2.0.0-alpha.11 editor stays intact. The original Pepsi baseline remains in `archive/original-pepsi`. This is a **non-destructive directory plan**, not a mass rename of 800+ tracked paths.

```text
nes-forge.html                     # default accepted 2.0.0-alpha.11 editor
app/                               # canonical editor modules and builds
  src/                             # authoring, gameplay, audio, native recovery
  mainline/                        # generated standalone builds
  tests/                           # Forge source / browser regressions
  docs/                            # tutorials and project guides
experiments/
  hosted-worlds/
    README.md                      # branch / lifecycle boundary
    v17.1/                         # complete runnable kit when imported
      <editor HTML, launchers, host/, tests/, forge-source/, docs>
docs/architecture/                 # interfaces, ownership and platform contracts
reviews/                           # historical acceptance/evidence, unchanged
archive/                           # originals, never edited in-place
tools/                             # existing sync / release tooling
```

## Required invariants

- `app/` owns ordinary and native ROM authoring, asset extraction, RE, build and test workflows.
- `experiments/hosted-worlds/<version>/` owns opt-in localhost server, player UI, wallet sign-in and snapshot publication; it does not change original ROMs.
- Keep each experiment's launchers, Python tests and relative file links inside its versioned directory. Never silently replace the root editor with an experiment.
- Keep exact original files and review evidence. No broad source file moves without file-by-file dependency and path audits.
- No ROMs, private keys, local SQLite databases, admin tokens or generated ZIPs in Git.
- Promote only with user approval, tested protocol/schema compatibility, documented source identity and independent regression evidence.

## Hosted-world v17.1 contract

The bundled host speaks protocol 13. Forge must accept 13 and reject protocol 12 without attempting to publish. The setup guide must not report green readiness for a mismatched host. The complete downloadable review kit's 14-check synthetic test covers this bounded workflow; native Zelda II game fidelity, ROM builds and hardware tests remain separate.

**Status:** This branch carries the repository structure and v17.1 checkpoint only. The complete v17.1 runtime/source tree is preserved in the attached review kit, **not yet transferred into this Git branch**. Do not interpret this branch as a runnable hosted-world release.
