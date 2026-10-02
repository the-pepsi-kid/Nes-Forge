# Historical comparison copies

These files preserve selected original 1.6.6 test/harness contents for review of candidate adaptations. Their relative imports and fixture paths belong to the original release tree; this comparison directory is not a self-contained alternate runner.

For an independently runnable original suite, extract the complete frozen 1.6.6 release ZIP from `../../baseline/` into a separate directory, then run its own `node tests/run_all.cjs`. That archive retains all original tests, fixtures, baseline HTML, source layers, tools and `work/` scripts. Its measured reference result is 479/479 across 17 suites.

For the current candidate, use `node tests/run_all.cjs` from the 1.6.7 release root. The current runner owns the candidate result. Do not inject these old source layers into a failing candidate or change the application under test to a historical fallback.
