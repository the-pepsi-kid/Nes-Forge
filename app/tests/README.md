# Reproducible tests — current candidate

Run from app/ with Node 20+ and Python 3:

```sh
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

The gate retains all 118 predecessor suites and 2,061 cases, then appends stage-context-suites.json. It requires fresh explicit case records on unchanged inputs, and keeps browser/manual results separate. The outer Stage context delta reconstructs the pinned complete parent HTML and all 318 protected predecessor files. Current verification is under ../../reviews/stage-context-1/.

Focused checks: node tests/stage-context.cjs and node tests/stage-context-preservation.cjs. Real Chromium interaction and native no-edit checks use the review scripts with the required installed browser and an explicitly supplied local source path. No private source or source-bearing project is committed.

[Verification policy](../TEST_POLICY.md) · [previous test notes](../docs/history/stage-context-1/Tests_README.md).
