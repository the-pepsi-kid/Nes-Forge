# Current application and baseline

Current candidate: **2.0.0-alpha.11 / context-cleanup-1**, an unpromoted development checkpoint based on `697a998e744c7794fae5d1063748e8d83d5ffe57`. Ordinary projects write schema **12**; projects containing `nativeGame` write schema **13**. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for current identity, evidence and scope.

The preserved parent is **native-transition-edit-1**, HTML SHA-256 `b0ca1de0b112612c34bfc3d006e1854194a097e9ee1a4fde86fbfaf0b5b84b73`. Its supplied evidence records 2,046 passing cases across 116 suites using durable bounded workers, with retries, plus 30 matching-app browser checks. These are retained parent results, not new-run results.

`context-cleanup-1` adds navigation over existing asset references and reconciles stale current headings. It changes neither runtime algorithms nor native encoder coverage. Current app identity is in `build-inputs.json` and repository-root `CANDIDATE.json`; fresh verification is under `../reviews/context-cleanup-1/`. No release promotion or main merge is implied.

[Historical baseline statements](docs/history/context-cleanup-1/CURRENT_BASELINE.md).
