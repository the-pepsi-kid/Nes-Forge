Implementation update, October 12, 2026: the bounded command-map/CHR-RAM adapters, shared scene lifecycle and canonical map conversion are implemented in the native-map-1 candidate. Exact current gate/browser outcomes are packaged with the application. The contract below remains the design basis; its original intake-only status is historical. Broader formats and owner acceptance remain open.

# A2 native map/collision recovery contract

Status: input and behavior investigation, October 11, 2026. This contract scopes the next adapter; it is not a claim that the editor already imports these maps.

The current application remains `2.0.0-alpha.11 / native-background-1`, schema 12. Its source, standalone HTML, examples and test reports are frozen. The new investigation belongs under `research/native-map-intake-1/` so that research code cannot silently become a production recovery method.

## Evidence before conversion

Use the independently authored Double Action Blaster Guys source at commit `5ecc60b6af3f726851bfeb1c2555388c5953e0c0` as the first A2 input. Retain the original source, notices, pinned toolchain and unchanged source build. The actual assembled loader and collision code control interpretation when prose format documentation disagrees.

The existing Pepsi and HonkeyPong graphics inputs do not establish editable tile collision. HonkeyPong compares coordinate bounds and paddle rectangles; drawing a border does not create its collision rules. Bridge Room remains a purpose-built positive control.

The input has several distinct representations: compressed native map commands, an expanded metatile buffer, rendering transformations, and collision lookups. Record which representation is recovered. Preserve command offsets, lengths, order, overwrites and actual cell values. A visual match alone cannot certify collision.

## Bounded first implementation

1. Register the format with the existing `REMethods` v2 registry. Use structural references and bounded decoding, not filename or whole-ROM-hash recognition. Source hashes identify evidence and prevent stale application; they do not replace format validation.
2. Decode commands independently of conversion. Account for stored-minus-one dimensions and actual native command-table mappings. Reject ambiguous, out-of-bounds, nonterminating and unsupported constructions explicitly.
3. Start canonical conversion with a declared static solid/empty subset. Keep original full-solid, one-way landing, hazards, cycling, moving platforms, wrapping and special interactions distinct. Do not turn every nonempty cell into Solid. Unsupported semantics must remain visible and must prevent a misleading conversion.
4. Prove the CHR-RAM upload/decompression, metatile graphics, palette and coordinate mapping before claiming an editable visual scene. The A1 NROM parser's physical-CHR requirement remains intact; this input requires its own declared container/resource interpretation. Do not weaken generic input trust or rewrite the source header to fit A1.
5. Use existing canonical scene/metatile collision fields and normal generated gameplay compilation. Declare region dimensions, origin, coordinate mapping and known collision coverage; unknown cells must never default to Empty. Disclose any crop, padded boundary, authored validation player and changes to Forge controls, physics, actors and game logic. Native-room geometry recovery does not recreate the original game.
6. Reuse ProjectStore's guarded scene transaction and the detached compiler. Extract shared preview/guard/build/hash/append mechanics only where both resource workflows actually need them. Keep existing background APIs and behavior stable. No second registry, project model, collision runtime or general-purpose arbitrary mutation API.
7. Route preview controls by declared conversion capability. A `graphics` domain alone does not identify a static-background project: the existing background picker currently makes that assumption. A map adapter must not appear in a workflow that promises background-only evidence.

## Required checks before the next application candidate

- Compare decoded native records with the original assembled loader and collision lookup. Include commands with overlaps and boundaries, valid data edits, structural variants and near matches.
- Edit an actual solid region to empty and verify the original native predicate. Separately edit the recovered Forge scene, save/reopen, and verify actual rebuilt movement against a wall and through the opening. These are different claims and need different evidence.
- Preserve exact per-cell collision where identical graphics carry different meaning. Verify collision through canonical normalization. Test and disclose the existing detachment of metatile links after raw visual edits and the resulting tile-property fallback; do not introduce a parallel collision grid to override that behavior.
- Preview, cancellation, refusal and stale application leave the active project, history, emulator and build outputs intact. Import creates one Undo action; Undo/Redo and existing scenes preserve identity.
- Preserve schema 12, five gameplay templates, actor/persistent-state limits, Door Option B, runtime emitters, recipe compatibility and all 1,617 cases across 78 existing suites. Add a narrowly scoped preservation layer for the eventual application change, then run the complete gate on a clean extraction.
- Browser, independent-emulator, listening, phone/controller and hardware results must be recorded separately. A direct CPU routine harness establishes routine behavior, not end-to-end cartridge acceptance.

The first intake checkpoint supplies evidence for implementing this contract. Production discovery, preview/import, CHR-RAM recovery, canonical edit/rebuild, browser review and owner acceptance remain open until implemented and measured.
