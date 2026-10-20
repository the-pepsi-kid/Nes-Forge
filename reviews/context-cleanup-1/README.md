# Scene Resource Context — context-cleanup-1

This increment connects existing project resources through a derived context navigator and reconciles conflicting current documentation headings. The original documents remain byte-for-byte in `app/docs/history/context-cleanup-1`; all 127 original kit documents, the nine-step tutorial, manuals, PDFs and original styling remain preserved.

Expand **Scene resources** below the toolbar. Choose a World or recovered room, then a scene/page. Open related Worlds, sprite poses and animation clips through their existing owners. A shared clip opens at the relevant frame without changing its other references. CHR, collision and actors follow the selected canonical scene. Matching source navigation requires the exact ROM hash already loaded in RE.

Selections made through the navigator follow these canonical references. Existing World and native-workbench selectors remain independently usable; complete synchronization is a later scope. Audio remains project-wide. Full source Stage → Scene synchronization, scene/event-to-cue bindings, missing native encoders and complete playable reconstruction remain unfinished. Native Zelda II builds still support the existing four location fields; ordinary projects retain schema 12 and native projects schema 13.

## Verification

- `Verification.json`: final measured summary and exact application hash.
- `full-gate/Summary.json`: complete coverage over unchanged inputs: all 116 predecessor suites plus two dedicated context suites, with recorded bounded supervision and a concurrent VM startup-timeout retry.
- `Browser_Verification.json`: desktop and narrow-viewport canonical navigation interaction.
- `Native_Context_Verification.json`: private supplied Zelda II import, matching-source navigation and byte-identical no-edit native compilation; source bytes are excluded.
- `Kit_Browser_Verification.json`: actual launcher and three guides in two viewports.
- `Parent_Kit_Browser.json`: fresh resolution of the original recovery kit's blocked browser launch.
- `Example_Receipt_Verification.json`: all 14 saved projects rebuild unchanged ROMs; six current app-identity receipts refreshed.
- `Governance_Verification.json`: ten primary historical documents remain byte-identical.

`initial-full-gate` retains the stale-example-receipt failure. `interrupted-before-fixture-fix` retains a stopped invocation before correcting an invalid new test fixture; its results are not reused. `standard-concurrent-attempt` retains a later services-suite VM startup timeout; its 20 fresh successful suites are hash-validated before bounded single-worker continuation. Any later VM command-timeout retries remain under durable-attempts and in the final summary. `Initial_Native_Context_Verification.json` retains the browser failure that exposed the stale refresh hook; current native evidence is separate.

The exact outer source delta reconstructs the native-transition-edit-1 parent and all protected predecessor test inventories. No historical ROM oracle or baseline is renewed. Browser/VM results do not establish native Windows dialogs, physical phones/controllers, listening, hardware or owner acceptance.

## Reproduce and hand off

From the repository root:

```sh
python3 app/tools/bundle.py --check
FORGE_TEST_WORKERS=2 node app/tests/run_all.cjs
```

`verify_context_browser.cjs` and `verify_native_context.cjs` require Playwright and an available Chromium executable via `CHROMIUM_EXECUTABLE`. The native check additionally takes the owner's private ROM path. It writes no source-bearing project or ROM into the distribution.

Use `build_documented_kit.py --base-kit PATH_TO_EXTRACTED_RECOVERY_1` to reproduce the documented kit. The final kit includes a Developer Git bundle of the local source commits, requiring the pinned public source parent `697a998e744c7794fae5d1063748e8d83d5ffe57`.

The branch is local only. Automatic approval review rejected the attempted GitHub push because this turn did not explicitly authorize publication; publication remains pending owner approval. No prerelease, tag, main merge or alpha promotion has occurred.
