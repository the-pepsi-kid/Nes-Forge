# Movement Rules evidence

The authoritative alpha.11 result is **1,504/1,504 cases across 68 suites**, zero failures, on unchanged HTML `cb216a470954ac8898dcb410eadf1de0eb267287b88c4e757bec3a80284946f1`. `Clean_Gate_Summary.json` and `Clean_Extraction_Proof.json` record the final run; the application package contains each individual case report and log. `Staging_Verification.json` records all 3,716 verified extraction payloads.

The earlier focused receipts are preserved as development history. `Movement_Rules_Focused.json`, `UI_Focused.json` and the runtime focused receipts exercised the preceding `af1e258f...` bundle. The final bundle adds strict rejection of explicit null seed/preset/intensity values; its existing malformed-input cases cover that validation.

`Runtime_Focused.json` records an initial 17/18 result. The remaining test had compared the old alpha.10 raw source identity to an ordinarily opened project after its foundation migrated to alpha.11. Inspection found only that expected foundation change. The corrected assertion binds the captured current source, keeps the old mashup recipe replay requirement, and passed its separate 1/1 focused receipt. All 18 runtime cases then passed together in the final clean gate. The UI receipt also reflects correction of two viewer-mode fixtures to use the real `gameplay.mode='viewer'` setting. No production behavior was changed to satisfy those fixture corrections.

`Preservation_Review.json` separately passed four provenance checks on the final hash. Ten actual browser launch attempts were blocked by missing Chromium and executed zero checks. No browser/mobile/listening/controller/hardware acceptance is claimed.

`Recipe_Version_Boundary.json` and `recipe-version-boundary.cjs` reproduce a known limitation: ordinary alpha.11 UI opening changes the source foundation and refuses alpha.10 recipes. The matching archived application can replay/apply the recipe; opening its completed canonical result in alpha.11 and rebuilding succeeds. This is a recorded limitation with a verified handler-level workaround, not a browser or cross-release recipe compatibility pass.

`Next_Dependency.md` records the next native-background recovery/import work and its input evidence. The full roadmap remains unfinished.
