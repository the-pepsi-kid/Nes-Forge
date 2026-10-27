# Ninja Gaiden: investigation, editable copies and preserved source

Choose the exact investigated revision. Decoded rooms, sprite poses, native action scripts, actor records, CHR and Audio are different resource families. Their presence in a catalog does not establish an inverse encoder for the complete game.

## Open the investigation and choose the intended output

1. Save current work. Use **Open ROM / project**, review the source SHA-256/capability report, then **Prepare investigated project → Import as new project**. The saved project retains its original ROM and recovered catalogs. A fresh reopen restores source access.
2. Open **Project investigation** or **Area library** and choose the source area, room and page. **Scene resources** aligns the matching editable context without cloning assets or changing unrelated source ownership. Stage/table membership is evidence; it does not prove runtime reachability or route order.
3. For original-engine output, inspect **Native tools**. The preserved native Ninja workflow has unchanged-source output; generic Scene/CHR/pose/actor/Audio changes have no verified native writer here. Unsupported work stays savable and the native backend refuses it. Undo such edits to return to unchanged output.
4. For an authored Forge adaptation, use the existing selected-resource conversion/export paths to obtain editable copies or a standalone ordinary project. Review conversion limits, source Scene references, unassigned collision, untimed or partial data and capacity. Author missing gameplay explicitly, check the generated backend, then build/test that adaptation. It is a new authored runtime with source provenance, not a complete rebuild of Ninja's engine.
5. In either workflow, Save Project As, reopen in a fresh app and compare intended assets/output. Use explicit **Run Original** only when you intend to play preserved source rather than current compiled edits.

## Poses, scripts, Audio and manual investigation

Metasprite pieces keep their source Scene's pixels/palette; Animation references preserve explicit frame IDs. A script preview is recovered timing evidence within its declared initial state, not complete enemy AI, combat or collision. Resources shows declared connections and snapshots without fabricating Scene OAM or song bindings.

The **ROM Audio Library** uses revision-bound cue/driver methods. Inspect a cue, audition supported native execution, and preview an editable finite score before importing into tracker assets. Source begin/reset sound requests are evidence; they do not create a new native trigger or Audio writer. A detached project catalog disables stale actions, while an explicitly chosen independent source remains available for read-only investigation and deliberate conversion.

For independent RE or external hex editing, retain the original ROM, inspect bank/physical offsets in **RE / DISASM**, export annotations, and record exact changed ranges and consumers. Do not assume a pose/script pointer is a writable decoded frame or that a familiar instruction stream establishes full source recovery. Original-source identity and native projection checks remain enforced.

For independent coding, **Code → Open source workspace** preserves multi-file source and builds its declared NROM profile separately; export that workspace before closing. It does not translate Ninja's native build/toolchain. The general developer guide covers assembler, byte/bitplane, source mapping and external patch workflows.

For application changes, inspect `re/game-re-native.js`, `re/spatial-native.js`, `re/game-re-assets.js`, `services/investigation-project.js`, ProjectStore and the native backend. In a copied HTML, search their module comments. Maintain changes in `app/src`, keep shared native/hosted manifests, regenerate both outputs and verify the preserved-source and authored-copy paths separately.
