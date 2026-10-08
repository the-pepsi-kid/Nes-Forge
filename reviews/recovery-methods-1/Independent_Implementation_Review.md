# Independent Recovery Methods Review

Scope: alpha.9 / recovery-methods-1. Source review of the shared registry, native Audio adapter, discovery UI, analysis-source lifecycle additions, and browser supplement assertions. Independent executable checks use the complete assembled HTML in the existing VM harness; application functions are not replaced.

## Finding and correction

The first shared legacy CHR encode implementation accepted a decoded tile object from physical source A while the active operation used source B. It emitted a successful conversion result whose evidence was relabeled to B. It also allowed a caller to replace a tile's original encoded span with an unrelated header or PRG span. No project, emulator or original ROM mutation occurred, but the emitted provenance was false.

The correction binds shared encoding to the decoded object's original source identity, method/version, retained physical evidence and encoded span. An explicit span override must agree with the decoded span, and encoded output must preserve its length. The older raw encoder remains source-agnostic for its existing authoring use.

Independent reproduction before correction: 1/4 passed; three unsafe substitutions reproduced. The original source-snapshot HTML was temporary and removed. Its exact SHA-256 is recorded in Independent_Provenance_Before.json.

Independent verification after correction: **4/4 passed** on assembled HTML SHA-256 `b61825396f375e1e6a4ad13822e9db163f59584d545d158ee96af731c0e74f50`. The runner checks that this file remains byte-identical throughout the run.

1. Reject source-A decoded tiles under source-B analysis.
2. Reject a one-byte header override for a 16-byte source tile.
3. Reject a same-length unrelated PRG-span override.
4. Preserve ordinary same-source edited-tile encoding as a detached 16-byte copy, with project/history/emulator/original bytes unchanged.

Run: `node reviews/recovery-methods-1/Independent_Provenance_Review.cjs app/mainline/NES_Forge_2.0.0-alpha.9.html <report-path>` from the source-history repository root.

## Other reviewed contracts

- New profile operations are independently declared. Canonical conversion has no manufactured encoder, inverse, or native round-trip proof.
- Actual native patching reuses the existing independently redecoded model and alias protections. The shared adapter verifies the inspected source hash, returns detached output bytes, and distinguishes input and output identities.
- FamiTone2 recognition remains one bounded driver profile; successful recognition does not establish a selected song's canonical representability. Unknown engines remain available for byte analysis.
- Source identity, generation and pending-selection checks prevent stale discovery results from enabling routes or exporting a report for another selected source. Cancelled work cannot overwrite a newer operation.
- Routes focus/reveal existing controls without pressing Analyze, Preview, Import or Run. Existing native edits are preserved and explicitly identified as a separate copy.
- Canonical preview evidence explicitly labels its first 100 command sources as a bounded evidence excerpt; the full conversion provenance remains in the preview result.
- Legacy discovery applicability evidence is marked inferred and explicitly does not claim all physical bytes were inspected.
- Actual HonkeyPong's nonzero reserved header byte is preserved: general-analysis CHR extraction refuses that container while the independent native driver profile can recognize it. Browser and VM fixtures use Bridge_Room for the ordinary CHR route; no original ROM header was silently rewritten.
- Browser supplement assertions were read-reviewed for mount/discovery, correct mixed capability outcomes, actual focus targets, explicit CHR preview routing, unchanged application state and invalidation after opening another source. This is a code review, not browser execution or visual acceptance.

## Acceptance boundary

No remaining concrete blocker was identified in this review after the provenance correction. This statement is limited to the reviewed operations and recorded focused evidence; it is not the final clean-extraction regression gate. The complete retained suite and packaging checks remain the release owner's responsibility. Browser layout, audible output, phone performance, controllers and physical hardware were not validated by this review. This checkpoint does not claim universal native ROM semantic recovery or completion of the overall roadmap.
