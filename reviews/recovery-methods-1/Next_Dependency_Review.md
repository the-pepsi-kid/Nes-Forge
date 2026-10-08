# Next dependency after recovery-methods-1

Read-only source review, October 8, 2026 UTC. The alpha.9 clean-extraction gate was running when this review was written; this document claims no gate result. No application, test, example or planning input was changed.

**Recommendation: implement one shared native-background recovery/import slice on Pepsi and HonkeyPong, then extend the same resource contract to a source-backed map/collision input.** This advances the already-selected A1/A2 sequence. Do not add a broad debugger, emulator rewrite, universal decoder or new permission checkpoint first.

## Exact remaining acceptance

The authoritative Alpha plan's “2.0-A — Native resource recovery into editable Forge content” table is the controlling contract (`planning/NES_Forge_2.0_ALPHA_PLAN.md`, lines 315–353 at review time):

| Slice | Remaining requirement after the alpha.9 implementation |
| --- | --- |
| A0 | Different adapters must feed validated preview/import, with physical provenance, resource identity, uncertainty and adaptation notes. Shared discovery/dispatch is foundation; merely listing two methods does not complete the resource-import acceptance. Failed recovery must leave the active project intact. |
| A1 | Supported CHR, palettes and native background representations must pass source explanation, preview/import, a useful edit, save/reopen and rebuilt-output checks on **at least two independently authored, unrelated engines beyond the Forge/Bridge controls**. Decoder steps and native offsets must explain construction. |
| A2 | Declared native map/collision records must agree with original behavior. Editing a wall or traversable area must change expected rebuilt behavior. Graphics acceptance cannot substitute for this evidence. |

Current plan preface, paragraph “Remaining sequence” (line 24), selects cross-engine graphics/maps/collision next. The current capability ledger (`app/docs/ROADMAP_IMPLEMENTATION_STATUS.md`, lines 21–24 and 52) still records only physical CHR and the Native Room collision control. The older audio-priority history remains acceptance history, not a fresh prohibition on the authorized next coding dependency. Listening/device evidence stays open; this review does not call A3 accepted.

## Use the existing corpus deliberately

| Input | Next useful role | Explicit boundary |
| --- | --- | --- |
| Owner-supplied Pepsi, SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a` | First independent graphics engine: prove its native background construction, palette and CHR relationships, then convert that static presentation into editable canonical assets. Existing runtime evidence supplies an independent observation to compare against. | Its title/selection/vending/sold-out behavior is not evidence of levels, health, enemies, tile collision or music. Repository publication rights are separate from private analysis. |
| Pinned MIT HonkeyPong, SHA-256 `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b` | Second independent graphics engine, already available with verified source: CHR, palette records, a stored title nametable and a procedural playfield provide different construction cases for the same import contract. Begin with one declared static background per engine. | Its Pong walls/paddle comparisons are gameplay code, not automatically a tile collision map. Relocated/NROM32 derivatives are robustness tests, not additional independent games. |
| Bridge Room | Retain the known positive control, including its original collision and editable-import behavior. | It does not count toward A1's two unfamiliar-engine requirement or independently broaden A2. |
| Additional permitted source-backed map game | Select a real existing input with native metatile/map records and a documented collision lookup. Pin its source/license, exact ROM, mapper, records and original movement behavior before the A2 adapter. | The present Pepsi/HonkeyPong pair does not establish tile-map collision recovery. Do not manufacture an extra “independent” game by editing the controls. |

Evidence behind these choices:

- Alpha plan “Corpus and independent checks,” lines 328–341, explicitly identifies Pepsi's role, excludes invented game semantics and requires another unrelated engine plus suitable later map/collision records.
- `app/tests/re-runtime-integration.cjs`, test “Pepsi boot PPU-write reconstruction matches all 1024 native background bytes and all 32 palette bytes” (line 26), checks the actual original machine at CPU `$C0DA`. It supplies a comparison point and write origins, **not yet a decoder explanation of every constructed value**. Lines 27 and `app/docs/RE_RUNTIME.md` lines 62–64 establish only the observed state/credit and silent paths.
- `research/NES_Forge_Native_Audio_Input_Checkpoint.zip`, member `NES_Forge_Native_Audio_Input_Checkpoint/HonkeyPong-provenance.json`, pins upstream commit `f9ab7ad450ffebabec15623aa811a7564f079168`, verified source bytes and the reproduced ROM. The archive's `HonkeyPong/src/render.oph` lines 88–109 define the title-copy routine; 111–173 define the playfield construction; 344–361 link palette and 1,024-byte title data. `HonkeyPong/src/ppu.oph` lines 158–166 define the 32-byte palette copy. Use these as independent expectations, not decoder-generated goldens.
- HonkeyPong's title-copy loop uses `CPY #$FF` and changes the pointer page without resetting Y (`render.oph`, 100–108). Its actual transfer order/length needs runtime verification; importing the `.nam` file as an assumed linear 1,024-byte copy could misrepresent the original. Source comments alone are insufficient.
- The archived `HonkeyPong_iNES.oph` lines 7–25 explain its header and CHR placement. Reserved byte 10 currently prevents generic physical-CHR discovery (`app/docs/RECOVERY_METHODS.md`, line 19). A future graphics profile must validate its declared layout explicitly; do not silently weaken General Analysis or “repair” original ROM bytes to obtain support.

## Concrete implementation slice and deliverable evidence

1. Add reusable bounded palette, nametable/attribute and verified construction adapters through `REMethods` v2. Keep method recognition structural and source-specific, with field-level original byte spans, mapping, decoding steps and uncertainty. Exact fixture hashes identify evidence; they must not authorize production recognition. Reuse the existing physical bitplane decoder where its validated layout applies.
2. Normalize both independent backgrounds into one detached canonical preview: CHR, palette, tile placement and attributes, with stable resource IDs and declared runtime adaptations. Do not silently invent collision, entities, world connections or source-game logic. Add the validated preview/import boundary A0 still needs for this resource class; use ProjectStore/AssetRegistry and one explicit Undo transaction rather than another game-specific editor.
3. Prove both inputs complete the same UI path: discovery → source explanation → preview → confirmed import → meaningful tile/palette/placement edit → Save Project As/reopen → Forge build. Keep the source ROM and emulator unchanged until an explicit playback request. Verify cancellation, changed source/project, malformed records, ambiguity and limits atomically.
4. Attach independently derived source maps and expected resource arrays; original PPU/register/frame observations; canonical before/after records; saved/reopened identity checks; and rendered rebuilt-output comparisons before and after the edit. Explain any differences from source timing, sprites, dynamic updates or game rules. A static Forge scene is an adaptation, not original-engine reconstruction.
5. Test renamed inputs, structurally valid native data edits, relocated roots where supported, corrupt pointers/counts/palette values, truncated spans and near-match/unknown engines. Both engines must pass the shared import path. Retain the complete frozen predecessor gate and source guards, then package a new unchanged clean-extraction candidate with exact identities and measured reports. Browser/independent-emulator/device acceptance remains separately recorded.

After this finite A1 implementation, proceed directly to the chosen map/collision format: prove the native lookup and original blocked/passable behavior, import its canonical collision representation, edit a wall, and verify the corresponding rebuilt behavior. Add only investigative tooling required by a concrete failed explanation or missing observation. The finite corpus establishes declared formats; it never establishes all-ROM semantic recovery.
