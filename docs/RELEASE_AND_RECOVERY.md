# Release, Git history and recovery policy

NES Forge's original Pepsi artifact and the owner-approved 2.0 editor are protected baselines. No automatic promotion of 3.x experimental source to `main`, no history rewriting and no force push.

## Branch roles

- `main`: accepted 2.0.0-alpha.11 editor, stable standalone entry.
- `archive/original-pepsi` plus `original-pepsi` release: initial Pepsi vending-machine artifact.
- `experiment/hosted-worlds-layout-v17-1`: staged isolated hosted 3.x alpha, PR #3 (**draft until source import and validation**).
- `reviews/`: previous evidence, handoffs and independent audit records; never silently delete.

## Safe development workflow

1. Develop under `app/src/` for canonical editor/native tooling; under `experiments/hosted-worlds/<version>/` for optional hosted-world full kits.
2. Before commit: check source identity and manifest, detect accidental ROMs/secrets/SQLite, run applicable focused tests, describe skipped private-ROM checks.
3. Commit source, generated runnable editor, launchers, player/client, tests, docs and manifest together. Don't substitute patches for complete runnable kits while alpha contracts are changing.
4. Review the file diff, generated editor checksum and runtime protocol/schema compatibility. Publish to a review branch; open draft PR.
5. Promote only by an explicit owner-reviewed merge. Record SHA, date, test summaries and known limitations; keep rollback commit/tag and original archive.
6. Each downloadable kit must reproduce a fresh checkout's launch path. In the event of a broken regression or connection interruption, resume from the last verified Git commit and a complete kit, not an undocumented chat-only change.

## Actual publishing blocker for v17.1

The local review ZIP can be staged and validated, but the GitHub connector in this conversation does not accept a local ZIP/file path or stream a multi-megabyte directory as a commit, and the execution environment has no direct GitHub network connectivity. The full source therefore must be pushed with an authenticated Git-capable environment (for example the verified Windows publishing script provided in the complete alpha publish package). The absence of a source push is a release blocker, **not** a successful alpha Git publication.

## Recheck after push

Use a fresh checkout of the PR branch and inspect `experiments/hosted-worlds/v17.1/host/server.py`, `host/client.html`, `host/client.js`, the v17 editor HTML, `forge-source/` and `tests/`. Require editor/host SHA checks, clean synthetic test results, and no private artifacts. Only then remove the Git publishing blocker.
