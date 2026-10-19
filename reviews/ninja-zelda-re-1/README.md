# Ninja Gaiden / Zelda II native RE checkpoint

Branch: `implementation/ninja-zelda-re-2026-10-19`, based on Spatial RE parent `387b99b5f4bec1e05568482c15ef5bbea1ae4527`.

The final complete gate passed **1,989/1,989 cases across 110 suites** on Node **22.23.3**, Linux, two workers, with the unchanged application SHA-256 `f12c1cac282bd081c60d25e1b62a99ddce3e578d82573ecca5e930d95af5c233`. All 107 prior suites/1,970 cases are retained. Native comparisons and 67 current browser workflow checks separately passed at that same application hash.

The actual standalone application adds a connected native resource catalog inside **RE / DISASM → Open spatial RE workbench**. Choose the investigated source once. Original initial scene art, geometry, objects, actor parameters/dispatch, scripts/poses, CHR banks, code annotations and RAM leads are connected to physical source evidence and export.

Read `app/docs/NINJA_ZELDA_RE.md` for all controls, exact coverage, source identities/references, semantics and remaining gaps. This checkpoint is read-only; full physics/AI/collision/quest behavior, complete animation state bindings and playable conversion are not implemented. Source labels are research annotations, not semantic certification.

Zelda II's supplied title-screen ground/tree corruption is corrected by honoring visible second PPUADDR writes. Subsequent scanline rendering and runtime capture share the corrected coordinates. CPU instruction implementation, APU, native audio, capture implementation, canonical project/schema, compiler and runtime emitters are unchanged. This remains an approximate scanline emulator.

Reproduce the application and checks:

- `python app/tools/bundle.py --check`
- `node reviews/ninja-zelda-re-1/verify-roms.cjs /path/to/private/roms`
- `NES_FORGE_ROM_DIR=/path/to/private/roms node reviews/ninja-zelda-re-1/verify-browser.cjs`
- `FORGE_TEST_WORKERS=2 node app/tests/run_candidate.cjs` (verified on Node 22.23.3)

Private native verification uses a separate bus/harness with the shared CPU instruction core. It executes unmodified original readers/builders and checks all available scene outputs, visible Ninja tile columns, initial palettes, spawn values, shared script timing and sprite pieces. It does not claim an independent CPU oracle, physical timing, full engine reconstruction or every game-state combination.

`Production_Preservation.json` and the source reversal preserve exact earlier production/test inputs around the reviewed changes. The 107 prior suite scripts retain their case inventories; three retained test edits update release identity only. The complete gate adds lifecycle/source guards, the targeted PPU reload tests and the new preservation boundary.

The first isolated gate also found six stale example build receipts; they were updated byte-exact to the regenerated receipt output while all project/ROM payloads remained unchanged. That failed attempt is retained under `initial-stale-example-receipts`.

The failed concurrent validation attempt is retained under `initial-concurrent-validation`. It hit the original composer VM time limit and the original title-frame safety budget while CPU-intensive checks competed. No test or production time limit was widened. Final verification is rerun separately and reported at its measured application hash.

A later two-worker gate also reached the retained regression suite's original VM time limit; that report is preserved under `initial-two-worker-timeout`. The same regression suite passed 52/52 when run alone. Subsequent single-worker attempts retained every limit and case inventory.

The first single-worker run reached RE bridge runtime before two VM timeouts (including a fresh-load timeout). That failure is preserved under `initial-serial-runtime-timeout`; an isolated rerun passed all nine runtime cases at the same application hash, recorded in `Isolated_RE_Runtime_Verification.json`. The final complete run has no concurrent uploads, batch shell reads or other verification jobs. The specific source of the scheduling delay is not established.

Further Node 24.19.0 attempts, including an idle single-worker run and a 1 GiB heap-limit run, are retained under `initial-idle-regression-timeout` and `initial-node24-heap-limit-timeout`. Paired diagnostics found the same median startup time (about 412 ms) for the parent and candidate in that sample; they do not establish the timeout root cause. The final full gate passed under the supported Node 22 runtime, without source changes, retries within the gate, skipped cases, or widened limits. `Node22_Runtime.json` identifies the official downloaded runtime/checksum. Node 24 timeout behavior remains unresolved.

Review-kit construction uses the complete committed predecessor ZIP. Every predecessor file remains unchanged or is archived byte-exact under RC5; original RC3 content is retained. The actual application and the new guide are included. Names and extraction paths are checked conservatively for Windows. `Package_Browser_Verification.json` exercises the fresh ZIP's real start page and native catalogs. Those checks do not constitute native Windows extraction testing.

Finalization and packaging:

Install `zopfli==0.4.3` in the packaging Python environment. The kit uses standard ZIP Deflate, optimizing large text streams with five Zopfli iterations. This preserves every uncompressed file while keeping the connector's base64 upload request below 16 MiB. `Compression_Only_Verification.json` compares all 454 payloads byte-for-byte against the first verified ZIP. No application change was made for compression.

1. Finish all measured native, retained/new browser and complete gate checks at the same application hash.
2. Run `python reviews/ninja-zelda-re-1/finalize-checkpoint.py`.
3. Run `python reviews/ninja-zelda-re-1/build-review-kit.py` twice; the ZIP hashes must match.
4. Run `python reviews/ninja-zelda-re-1/verify-package.py` and the corresponding browser verifier with `NES_FORGE_ROM_DIR` set.
5. Commit the complete ZIP under `tester-kit/ninja-zelda-re-1`, publish the development branch, then verify a fresh GitHub fetch and the committed ZIP/app hashes.

Commercial inputs, assembled reference ROMs, decoded map/sprite data files and PCM are not included in the repository. The reference index stores symbolic labels/addresses only, with research attribution/license notes. Screenshots are UI/verification illustrations, not bundled asset libraries.
