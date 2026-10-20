# Reproducible tests — current candidate

Run from `app/` with Node 20+ and Python 3:

```sh
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

The standard gate retains 116 predecessor suites and 2,046 cases, then runs the declared context-cleanup suites. It requires fresh case records and unchanged inputs, and keeps browser/manual results separate. See [the current test policy](../TEST_POLICY.md) and [historical coverage notes](../docs/history/context-cleanup-1/Tests_README.md).
