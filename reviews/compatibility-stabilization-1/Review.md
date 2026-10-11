# Compatibility stabilization implementation review

Authority: October 10, 2026 America/Denver, owner “update roadmap and continue” following the four-priority recommendation. Candidate: alpha.11 / compatibility-stabilization-1, D063.

## Issues addressed

1. Historical alpha.10 mashup recipe loading through alpha.11 UI failed because normal opening changed foundation metadata included in the canonical hash. The shared versioned RecipeIdentity adapter verifies complete historical identities and deterministic output, then reissues only a foundation-equivalent current recipe. Raw v1 algorithms remain unchanged.
2. Movement rules duplicated physics limits and single-room reference checks. Bounds now come from the configuration owner; both configuration validators accept explicit detached project references and refuse explicitly malformed inputs instead of falling back to live state.
3. Movement Apply owned settings/history mutations directly. ProjectStore now owns the bounded settings transaction, with stale/reentrancy checks, exact one-snapshot validation and rollback. Only the selected configuration fields are installed; unrelated authored data and runtime/editor caches are preserved.
4. Single-room preview stopped at structural planning. BuildGraph/RuntimeCompiler now compile a copied generated project through shared codecs with explicit source arguments. Both movement backends perform full ROM/capacity preflight without live state swapping or artifact publication.

## Independent review

Separate implementation agents reviewed recipe/transaction and detached compiler boundaries. No remaining blocking defect was identified. Review found an explicit-null World reference fallback; it was fixed before source freeze and covered by the existing contract test case.

The transaction verifies the existing snapshot engine eviction policy, including MAX_UNDO and the retained 24 MiB limit. It does not create a second history engine. A future change to that policy must update the service's verification contract and eviction tests together; this is an explicit maintenance dependency, not an untested new retention policy.

## Evidence scope

Focused checks passed before freeze: recipe compatibility 9/9, existing mashup UI 25/25, settings transaction 14/14, Movement UI 26/26, ProjectStore 21/21, detached compilation/validation 13/13, Movement Rules 30/30 and historical whole-ROM parity 7/7. These overlap and must not be summed as a new release total. The final current Summary and clean-extraction proof own the complete measured result.

Historical source, fixture, test and golden-ROM bytes are retained. Current title/name/candidate assertions and single-room full-compilation expectations changed only through exact declared deltas; every original test can be reconstructed. The source package preserves all received Git refs under refs/archive/received-alpha11 in addition to the active branch.

All real-browser supplements attempted launch in the clean extraction but were blocked with zero checks by missing Chromium; browser download failed with an invalid/truncated archive. Browser layout/native dialogs, listening, phone performance, controllers, NES hardware and owner promotion remain unverified. The new browser compatibility runner is included for a capable environment.

## Remaining roadmap

The next feature dependency is A1 native-background recovery/import, then A2 on suitable independent map/collision inputs and the prior roadmap sequence. This checkpoint adds no mechanics/templates/schema, new raw-ROM recovery, raster/mapper capability or broader hardware claim. Full roadmap and comprehensive manual completion remain open.

## Initial clean-run correction

The first clean run stopped at the Gameplay Core current-example check: its alpha.11 build receipt still named the original Movement Rules HTML hash. The other 34 Gameplay Core cases passed, including emitted semantics and legacy golden ROMs. Inspection identified the same current-source provenance requirement in the current Seeded Mashup and Movement Rules example manifests. The current example generators were rerun after archiving original alpha.11 examples; no hash assertion or historical oracle was relaxed. The initial failed Summary and gameplay report are retained in `initial-clean-run/`. A new staging extraction and complete unchanged-input run are required after this correction.

Example regeneration compared 30 original/current files: all seven ROMs, editable projects and recipes remained byte-identical (27 files unchanged). Only three current build receipts changed to record the current HTML and full single-room preflight assurance. The corrected Gameplay Core suite passed 35/35 before re-staging; this targeted result is not substituted for the subsequent full clean gate. Comparison evidence is `app/checkpoints/compatibility-stabilization-1-examples/Regeneration.json`.
