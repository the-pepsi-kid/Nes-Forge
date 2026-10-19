# Compatibility stabilization — alpha.11

Candidate `compatibility-stabilization-1` retains project schema 12 and the existing movement/runtime behavior. It addresses the four integration issues recorded in D063 before further feature expansion. Open `mainline/NES_Forge_2.0.0-alpha.11.html`.

## Historical recipes

Use the ordinary Seeded mashup workflow with the original base project and every original donor, then choose **Open saved mashup recipe**. The current editor can verify the shipped alpha.10 recipe even though opening the base updates its `foundation` release metadata. A successful migration displays an explicit notice; preview and migration do not apply anything. Review and confirm Apply normally. Download the reissued recipe to retain its current source identity.

`RecipeIdentity` contract version 1 uses method `exact-v1-foundation-reissue-1`. Direct exact-source replay remains the first path. Migration considers only the reviewed `2.0.0-alpha.10` and `2.0.0-alpha.11` foundation values, preserving every other canonical field. It reconstructs and verifies complete original source SHA-256 identities (and mashup source byte lengths), reproduces the original recipe result, remaps source-bound asset choices, and verifies current replay differs only in foundation metadata. The provenance record identifies original/current sources, recipes and results. The original recipe and sources remain unchanged.

This adapter also supports the corresponding foundation-only Movement Rules recipe boundary. It does not authorize arbitrary release, schema or behavior migration. A changed name, art, audio, movement value, donor, recipe decision or result hash is not a metadata migration. Missing, ambiguous and incompatible sources refuse without changing project/history/emulator state. Raw mashup and movement v1 algorithms and formats remain unchanged.

## Shared validation and complete previews

The existing single-room configuration service owns immutable physics limits. World configuration, the single-room controls and Movement Rules consume those limits. Single-room reference validation accepts an explicit detached project, matching the existing World validation pattern, so a preview cannot validate against an unrelated live scene.

`BuildGraph.planDetached(project)` and `RuntimeCompiler.compileDetached(project)` accept current-schema generated World or single-room projects. They validate detached input and run the ordinary linking/allocation/compiler path with explicit source parameters. They do not swap live state, execute custom ASM, publish a built artifact, change Undo history, load the emulator or play Audio. Both Movement Rules preview backends now report a full compiled ROM hash and byte count; capacity errors refuse before Apply.

Compilation does not prove level reachability, movement feel, visual/music quality, browser rendering or hardware timing. The ordinary Build action remains how the user produces the active project's downloadable/playable ROM.

## Project-owned application

`ProjectStore.applySettingsEdit(changes, {expected, intent})` owns a bounded synchronous edit of existing `gameplay`/`worldRuntime` scalar settings. `expected` is the captured epoch and serialized project. The store validates a detached candidate, rejects stale/reentrant/paused-history edits, records one snapshot and installs only requested configuration values. Unrelated authored data is not replaced or normalized. A failed snapshot/install rolls back owned settings/history; notification failures after a committed edit are reported as presentation warnings while the successful edit remains Undoable.

Movement Rules owns its four-field projection, preview, options and confirmation; it delegates mutation/history to ProjectStore. This checkpoint does not rewrite every older authoring tool or expand the transaction into arbitrary project replacement.

## Verification and remaining acceptance

The parent 1,504 cases across 68 suites remain required. Added tests cover recipe UI migration/refusal, settings transaction failure/Undo behavior, shared validation and complete detached compilation. Exact source/test deltas reconstruct the original pinned alpha.11 before older preservation checks; original ROM goldens remain unchanged.

Current measured outcomes belong to `test-results/candidate/Summary.json`, the compatibility clean-extraction proof and current-hash browser reports. A blocked browser reports zero checks. Browser/native dialogs, listening, phone A/V performance, controllers, NES hardware, full manual completion and owner promotion remain separate acceptance items.

After this checkpoint, the feature roadmap resumes at A1 native-background recovery/import and then A2 on suitable independent map/collision inputs.
