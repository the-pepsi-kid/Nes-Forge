# Spatial RE checkpoint

Development branch: `implementation/spatial-re-2026-10-19`, based on Mega Man 2 Audio commit `d1f3ef5dd3be5150431d74b478fb9a38db300f6e`.

The standalone app adds **RE / DISASM → Open spatial RE workbench**. Exact-revision decoders expose native map/collision/category evidence for the four supplied titles and 13 Ninja Gaiden player animation scripts. This is a read-only evidence milestone. It does not import playable scenes, native movement/actor logic, complete transitions or universal unknown-ROM recovery.

See `app/docs/SPATIAL_RE.md` for every control, source references, geometry, semantics and limitations. Reports describe measured checks only. No supplied ROM, decoded map/sprite payload or native PCM is stored in the review artifacts.

Reproduction:

- `python app/tools/bundle.py --check`
- `node reviews/spatial-re-1/verify-roms.cjs /path/to/private/roms`
- `NES_FORGE_ROM_DIR=/path/to/private/roms node reviews/spatial-re-1/verify-browser.cjs`
- `FORGE_TEST_WORKERS=4 node app/tests/run_candidate.cjs`

Native checks execute the original unpatched subroutines on a separate bounded bus. Browser checks launch the shipped HTML and use real file/download controls. The full gate preserves all 105 parent suites and 1,958 cases; only release identity expectations are adjusted in two retained suites. The source reversal restores the exact previous HTML and all protected tests before the earlier preservation chain runs.

`regenerate-examples.py` reproduces the six retained example families in a disposable copy: 52 of 58 files remain byte-identical; six receipt files change only the application hash. None of the generated project/ROM payloads change.

The review-kit builder preserves every predecessor file at its original path or in RC4 when metadata/the launch app is replaced. The complete original alpha kit remains in RC3. ZIP verification checks hashes, local documentation links and conservative Windows path lengths. Fresh-extraction browser verification launches the actual application and exercises spatial RE plus earlier native audio.

Packaging: run `python reviews/spatial-re-1/finalize-checkpoint.py`, then `build-review-kit.py`, `verify-package.py` and `verify-package-browser.cjs` from this directory. The builder uses Python 3 and Pandoc; if the predecessor kit is absent, it rebuilds it from the pinned parent Git commit.
