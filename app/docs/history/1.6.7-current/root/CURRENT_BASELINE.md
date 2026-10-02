# Current baseline and candidate evidence

## Frozen behavioral reference

| Item | Value |
| --- | --- |
| Release | NES Forge 1.6.6; current title Visual Workspace |
| Canonical HTML | `baseline/NES_Forge_1.6.6_Visual_Workspace.html` |
| HTML SHA-256 | `d9e3c44d0349e50cca1be800a630486bba1ad9584623c99a81f84bf058df33cb` |
| Original release ZIP SHA-256 | `b03f16c3c94b7a41a0030fe5a9cb0a213e40bc0f6a3fbf1c1b7f22376b6e742a` |
| Independent audit result | 479/479 cases across 17 suites; fresh extraction, exit 0 |
| Audit runtime | Node v24.19.0; Python 3.12.14 |
| Project schema | 8 |

The complete original 1.6.6 release ZIP is retained under `baseline/`; extract it separately to run its original tests/tools with their original paths. Comparison copies in `tests/historical166/` are not a replacement for those dependencies.

The historical 344/344 claim has no supplied runnable source and is not counted. The frozen baseline remains unchanged. Historical artifacts and their tests are reference material; their old feature/status claims do not define the current candidate.

## Candidate identity

| Item | Candidate requirement/status |
| --- | --- |
| Release | NES Forge 1.6.7 — Architecture Convergence |
| Application | `mainline/NES_Forge_1.6.7_Architecture_Convergence.html` |
| Project schema | 9; unsupported downgrade to v8 rejected |
| ROM formats | Layout/NFORGE15 marker v3; NFEX payload v1; MT16 v1; WR16 v3; MS16 v2; GP16 v1 |
| Final candidate HTML SHA-256 | `4fbe63a0676b903850e72004dba2ea66ae18df7f45bb366ca2688b63a8346b07` (846,047 bytes); source check and complete clean-extraction run passed |
| Candidate regression total | **559/559 across 23 suites; 0 failed, 0 skipped; exit 0** |
| Clean-extraction reproduction | **Passed: fresh extraction with no candidate reports, all 279 input checksums verified, exact bundle reproduction, 559/559** |
| Real-browser acceptance | **Unverified; standalone file navigation rejected by cloud security policy** |

## Stage evidence

Record actual artifact hashes, commands, result paths and measured counts for each gate. Do not convert a planned gate into a passing claim.

| Gate | Measured status |
| --- | --- |
| Exact source extraction and applicable frozen regression | Passed: byte-exact 1.6.6 reassembly; 479/479 inherited checks across 17 suites; separate golden/actual-baseline downgrade suite 7/7. Evidence: `checkpoints/01-source-extraction/Summary.json` and `golden-parity.json`. |
| ProjectStore lifecycle/serialization and applicable frozen regression | Passed on `e58566195ff5f997025f638e76af122987047b0e68622dc4d3046960bf574a46`: 479/479 inherited; separate ProjectStore 21/21, lifecycle 26/26 and golden/downgrade 7/7. Reports/artifact: `checkpoints/02-project-store/`. |
| BuildGraph/RuntimeCompiler convergence and applicable frozen regression | Full strict runner passed **559/559 across 23 suites**, exit 0, on `41babd1f2e317cf21c0777884175a31e175e78fd61c10621c4e9edbf7d09a6d5`. Reports and tested HTML: `checkpoints/03-build-convergence/`. |
| Final candidate runner | **559/559**, 23 suites, exit 0, final HTML unchanged throughout the clean run. Final report: `test-results/candidate/Summary.json`. |
| Rebundle/clean-package extraction and runner | Passed; `checkpoints/04-clean-extraction/Reproduction.json` and `Summary.json`. Runtime: Node v24.19.0, Python 3.12.14 on Linux. |

Five reference ROM cases are pinned in `tests/fixtures/golden167/manifest.json`: packed-viewer; packed-custom-asm; unpacked-custom-asm; packed-world-assets-reordered; single-room-poc. Their stored bytes and metadata are comparison oracles, not a license to regenerate expected values after a regression.

Active ownership, retained adapters and limits are described in `docs/CONVERGENCE_REPORT.md`.

## Browser scope

Blank startup, recovery banner, Save/Save As, project opening, Build & Run, Run Original and runtime capture have not been genuinely accepted in a real browser in this environment. Approved standalone-file navigation was rejected by cloud security policy. Do not infer browser behavior, native picker behavior or layout correctness from the VM harness or source hashes. No browser workaround was used.

## Authority

Follow `PROJECT_CHARTER.md`, `ARCHITECTURE_CONTRACT.md`, `DECISION_LOG.md` and `TEST_POLICY.md`. **Stop after the 1.6.7 candidate and handoff; do not autonomously expand scope or begin 1.7.**

The final candidate differs from the build checkpoint only by removal of three obsolete startup version toasts. Its source/bundle identity and all 559 required cases passed from the clean extraction. Gameplay, codecs and protected implementations did not change in this final messaging cleanup.
