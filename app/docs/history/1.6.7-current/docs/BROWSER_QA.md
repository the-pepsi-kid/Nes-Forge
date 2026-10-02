# Real-browser acceptance — unverified

A genuine acceptance attempt used supported Cloud Browser Chrome navigation to the standalone candidate file URL. **Cloud Browser URL security policy rejected local HTML navigation and prohibited alternate surfaces/workarounds.** No workaround or manual browser pass is claimed. Recorded evidence: `../checkpoints/browser-acceptance.json`.

All eight requested actions remain unverified:

| Acceptance item | Status | Required observation in a permitted browser |
| --- | --- | --- |
| Blank startup | Unverified | New profile/no recovery opens blank viewer art/data; no starter or false saved identity |
| Recovery banner | Unverified | Existing recovery survives checking; Restore/Dismiss work; delayed/invalid data do not replace newer work |
| Save | Unverified | Correct project identity/data saved; edits and replacements during delayed saves stay correctly bound/dirty |
| Save As | Unverified | Actual native picker/download, user-gesture context, output bytes and cancellation remain correct |
| Project opening | Unverified | Supported files open; invalid/future input leaves workspace intact; history policy matches action |
| Build & Run | Unverified | Current selected backend's successful artifact plays; failed builds do not run stale output |
| Run Original | Unverified | Retained original imported bytes play independently of current edits/build |
| Runtime capture | Unverified | Existing completed-frame background/sprite/provenance capture appears and remains editable with correct CHR/palettes |

The complete-app VM, controlled storage harness, source-preservation checks, whole-ROM comparisons and actual bundled-emulator execution provide separate automated evidence. They do not prove browser layout, pointer/focus behavior, IndexedDB timing in a browser, native file-picker behavior or NES hardware accuracy.

When a permitted browser environment becomes available, record actual browser/OS/version, candidate hash, each action, observations and failures. Include normal editor widths, confirmations/cancellations and recovery reloads. Do not mark an item passed based on inference from a harness. Independent emulator/hardware checks also remain separate from browser acceptance.

Completing this acceptance pass does not authorize a new feature, milestone or scope expansion.
