# Current verification policy

Current candidate: **2.0.0-alpha.11 / context-cleanup-1**, an unpromoted development checkpoint based on `697a998e744c7794fae5d1063748e8d83d5ffe57`. Ordinary projects write schema **12**; projects containing `nativeGame` write schema **13**. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for current identity, evidence and scope.

Retain all **2,046 cases across 116 predecessor suites**, in their original order, and append `context-cleanup-suites.json`. The three retained identity assertions change only the declared candidate/name; their original bytes are reconstructible through the new outer source delta. Historical test oracles, fixtures, source deltas and ROM goldens are not renewed.

The standard gate hashes all inputs and rejects changes during a run. Do not infer passes, skip failures, inject modules or claim old results for a new HTML. Use `FORGE_TEST_WORKERS=1` or `2` on constrained hosts; allowed scheduling does not alter deadlines or case requirements. Record any failure or interruption as such.

Focused checks cover canonical relationship discovery, page grouping by exact provenance, existing navigation routes, live-edit preservation, shared animations, implicit legacy sources, stale IDs, lifecycle reopens and keyboard isolation. Exact reversal must reconstruct the entire parent HTML and all protected predecessor test inventories.

Real-browser launch/layout and interaction reports are separate. Missing browser prerequisites record **Blocked**, zero passed checks. Listening, native dialogs, owner acceptance, phones, controllers and hardware remain distinct. Documentation-only cleanup does not certify behavior.

[Preserved policy history](docs/history/context-cleanup-1/TEST_POLICY.md).
