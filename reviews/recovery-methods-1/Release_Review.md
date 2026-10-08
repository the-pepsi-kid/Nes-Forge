# Recovery Methods release review

Candidate 2.0.0-alpha.9 / recovery-methods-1, schema 12. HTML SHA-256 `b61825396f375e1e6a4ad13822e9db163f59584d545d158ee96af731c0e74f50`.

The complete clean-extraction gate passed 1330/1330 cases across 61 suites with zero failures, 2026-10-08T20:56:41.436Z to 2026-10-08T21:11:50.540Z. Every alpha.8 suite and its 1,263 cases remains required. The three new suites contribute 28 registry, 22 adapter and 17 UI cases. Source, test, documentation and fixture inputs remained unchanged throughout the passing run.

Independent review found a real shared-encoding provenance fault: assets from one source or an unrelated span could be labelled as another source. The new dispatch boundary now checks source identity, method identity, retained evidence, span and output length. The before/fix receipts retain the reproduction; independent verification passed 4/4 on the delivered HTML. The original legacy encoder API remains unchanged.

The first clean run failed one historical source assertion because the roadmap preservation helper hashed the intentionally updated registry directly. A one-line adapter correction now supplies the exactly restored historical source to that unchanged hash assertion. Historical source hashes, delta fixtures, suite assertions and golden oracles were not renewed. The deepest reconstruction chain and the full 52-case regression passed before the fresh extraction and complete passing run. Initial failure reports remain under Initial_Gate_Source_Adapter_Failure for review.

Eight browser runners report blocked, zero passed/failed checks and empty checks arrays on the same delivered HTML hash. Missing Chromium remains a real validation gap; no browser layout, listening, phone, controller or hardware result is inferred from model tests.

Discovery and routing do not import assets or load/reset/run the emulator. Existing native edited copies remain intact. Shared dispatch provides actual physical CHR decoding/encoding and native Audio inspection, copied-ROM patching and canonical score-preview conversion. Driver recognition is distinct from selected-excerpt readiness. This does not add universal scenes, collisions or engine recovery.

The current guide and D1–D7 checklist supplement the manual. Full manual/PDF update and owner acceptance remain open. The candidate is not promoted and the complete roadmap remains unfinished. Next dependency is recorded in Next_Dependency_Review.md.
