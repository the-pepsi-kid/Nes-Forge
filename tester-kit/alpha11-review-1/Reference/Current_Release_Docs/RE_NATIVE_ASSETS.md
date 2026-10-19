# Native CHR recovery and method contracts

This candidate adds editable native graphics recovery to **RE / DISASM → General ROM Analysis → Raw CHR patterns → Preview native tile import**.

1. Choose a ROM and click **Open for analysis**.
2. Expand **Raw CHR patterns**. Page to the physical tiles you want.
3. Click **Preview native tile import**. Check the filename, SHA-256, physical tile range and file range.
4. Click **Import as new tile sheet**. This adds a scene and selects it; existing scenes remain. Open **CHR** to edit its background tiles.
5. **Save Project As** preserves the editable tiles and their recovery evidence. **Undo** removes the import; **Redo** restores it.
6. Return to the recovery controls and use **Download active sheet CHR** to export the edited tiles as raw NES planar bytes. Select the imported scene first. **Download recovery evidence** exports its source and conversion record.

The sheet is deliberately excluded from ROM builds by default. Its tile arrangement and grayscale palette are authored inspection aids. Reuse the tiles in your authored scene, or deliberately include the sheet in the appropriate build. An exported `.chr` is graphics data, not a playable ROM or an automatically safe patch for the source game.

## Supported scope

The `nes.physical-chr.v1` method decodes 1–256 physical CHR-ROM tiles per operation from a validated iNES 1.0 or NES 2.0 container. The UI uses the current 256-tile page. An unsupported mapper or unknown engine does not prevent extraction: no CPU execution, engine fingerprint, filename or source-hash allowlist is used. Headers must pass the existing container bounds and reserved-field checks.

Each NES tile has eight low-plane bytes followed by eight high-plane bytes. The decoder preserves its 2-bit pattern values. Before an import is offered, encoding those values must reproduce every selected original byte. This establishes a **byte round-trip for the selected physical graphics**, not a complete game reconstruction.

Not recovered by this method:

- CHR RAM contents or compressed graphics stored in PRG;
- the mapper's currently visible CHR window, except the existing static NROM mapping;
- original palettes, sprite groupings, nametables, scene connections, collision or gameplay;
- audio or a sound-driver format.

Raw or truncated containers remain available to general analysis but cannot provide a trusted automatic CHR range. Multiple physical banks are distinct even if their bytes are identical. Palette index zero and the other pixel values are preserved without inventing background/sprite usage.

## Persistent provenance

The added scene has a deterministic ID containing the complete source SHA-256 and selected tile range. Tile identities combine the same source hash with their absolute physical CHR indices. Per-tile records include file offset, physical 4 KiB bank number, and index within that bank; those bank numbers describe physical grouping, not observed mapper selection.

`scene.captureMeta.recovery` stores the versioned method descriptor, original file identity, physical range, tile IDs, evidence statuses, explicit unknowns and limitations. This uses the existing scene metadata field and schema 12 serialization. JSON save/reopen, Undo and Redo preserve it. A downloaded evidence report carries the same record. The source ROM is not copied into the active project's `importedRom` or overwritten by this operation.

Recovery evidence describes the original import. Later tile edits do not rewrite the original-source claim. Source identity is an integrity reference; a hand-edited project JSON is not a digitally authenticated recovery record. Edited `.chr` exports contain the current tile pixels and leave the immutable inspection source unchanged.

The import guards both project epoch and serialized project content. A project edit after preview requires another preview; a changed inspected ROM also invalidates the UI import. Reimporting an identical tile range is rejected to avoid duplicate deterministic IDs. Imports validate the prepared project before adding a single Undo entry. Native CHR and evidence export reject malformed source hashes, range/tile identity mismatches, unsupported metadata versions and recovery records larger than 256 KiB. Other project content remains editable; a malformed optional recovery record is not grounds to discard the project.

## Reusable registry

`Forge.services.REMethods` provides versioned trusted-code method registration, immutable descriptors, capability probes, decoders, encoders and selected-span byte-round-trip validation. It also validates evidence status, a SHA-256 source identity and in-bounds physical ranges. The statuses are explicit labels, not automatic confidence promotion:

- `unknown`: no semantic recovery claim;
- `observed`: a recorded observation tied to bytes;
- `inferred`: an interpretation that still needs verification;
- `decoded`: a declared representation decoded from bytes;
- `round-trip-validated`: encoding reproduced the specified source span;
- `converted`: an intentional representation or runtime adaptation.

Methods are JavaScript modules installed as trusted Forge source. This registry does not execute code supplied by a ROM, load arbitrary plugins or manufacture support for unrecognized audio/map formats. A new method must declare limitations, evidence, decoder and encoder together. A source byte round-trip cannot prove that collision or gameplay semantics are correct; those require separate runtime evidence.

## Audio recovery status

This slice does not add a general sound-driver decoder. The available Bridge Room fixture exercises the existing bounded constant Pulse 1 control; it does not establish independent real-driver support. The supplied Pepsi fixture and generic container/CHR data do not establish a verified music/SFX format, song roots or effect semantics. Inferring a song from arbitrary APU-looking bytes would create false recovery claims.

To complete the next native-audio milestone, select a permitted independent ROM with known music and SFX and retain its exact bytes, driver implementation/version or a verified native-format description, NTSC/PAL timing and a reference playback. Implement format recognition based on actual structure, decode song/instrument/effect data with explicit unknowns, edit/save/rebuild it, and compare runtime APU events and audible playback. Driver names alone are insufficient; different versions and export settings can change format semantics.

## Evidence in this candidate

`tests/re-native-assets.cjs` covers registry bounds, several mapper/header layouts, partial NES 2.0 CHR banks, malformed/oversized persisted evidence, arbitrary engine names, the supplied Pepsi bytes and a changed source hash, CHR-RAM rejection, exact bitplane round-trip, stable IDs, nonmutating preview, import preservation, Undo/Redo, edit/save/reopen/export, stale/forged/duplicate rejection and UI event handlers. These VM checks do not count as physical-device, visual browser or audible acceptance.
