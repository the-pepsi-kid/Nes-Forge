# Placement index follow-up — PR #10

Existing Agent Lab v0.3 has deterministic physical bank verification and investigated GameRENative catalogs. This increment joins them into a **private evidence index**, not another editor asset database.

After independently verifying PRG/CHR bank bytes, if an exact-revision GameRENative inspected catalog was recovered, the pipeline appends source-checked scene records to `private/<rom+editor>/placement.json`. The records include original scene IDs, bounded source spans, geometry, native enemy/lantern trigger data, source-context audio cues, and indexed room connections. A pointer's CPU label is verified only as a physical bank annotation, never an observed runtime bank mapping.

Every placement field retains the correct confidence: catalogued source triggers are not proven world-space positions, the orientation of Zelda II page connections is not inferred, and scene rendering, sprite ordering, enemy AI, music timing, editor bindings and original-ROM writers remain unverified.

The step rejects wrong ROM identity, missing independently checked PRG banks, out-of-bank source spans, duplicate scene IDs, bad source CPU labels, and unresolved actor catalog references. On refusal, the raw physical bank ledger remains available, and the batch is not promoted to full native support.

`private/<rom+editor>/inventory.json` now also reports catalogued scene/spawn counts, while `NEXT_ACTIONS.json` gets a deterministic placement-parity review request. All game-derived details stay private. No modification is made to the canonical Forge HTML, ProjectStore, multiplayer host, audio UI, or build targets.

## Test and review gates

- Synthetic Python suite `tools/agent-lab/tests/test_catalog_placement.py` has eight offline cases. Run it and the existing seven Agent Lab tests on the exact branch checkout.
- Test against user-supplied original Ninja Gaiden and Zelda II ROMs using the matching reviewed Forge HTML and harness; verify private placement report counts and independent scene/raster parity.
- A future editor-integration PR must reuse `ProjectStore` / `InvestigationLibrary` source receipts, without duplicating editable assets.
- Preserve offline classic NES output as the default. Enhanced and hosted runtimes, wallets, and marketplace systems are opt-in, not a requirement for physical cartridge builds.

**Scope note:** No actual-ROM end-to-end check, browser check, or hardware compatibility recheck is claimed by this document.