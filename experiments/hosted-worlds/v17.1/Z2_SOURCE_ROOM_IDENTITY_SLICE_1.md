# Zelda II multiplayer source-room identity: implementation slice 1

**Branch:** 3.x hosted-world experiment, protocol 13. **Status:** bounded source-identity binding, **NOT original ROM room gameplay, collision, physics or exit parity**.

## What changed
- The host selects an area using the unique `locationIndex` and exact SHA-256 digest of the published read-only Zelda II room record when exactly **one source record matches** a town, palace or cave entry at the player's map square. Multiple people selecting the same record share the same authoritative `area_id`, not a coordinate-based alias.
- Shared area state and each side-view player now expose a compact `sourceRoom` containing source World, location index, source bank/scene/kind, entry code and record digest. `nativeSceneVerified`, `originalEnginePlayable` and `destinationVerified` are always **false**.
- With **multiple** records at the same coordinate, explicit entry and automatic arrival refuse to guess; auto-entry is checked *before the server moves the player*.
- With **no published record**, the existing pilot entry IDs remain for backward compatibility. Fairy Camps also keep their existing area IDs. The source catalog cannot be overwritten while a player remains in a source-bound side-view area.
- No database schema migration, ROM binary mutation, protocol change, new asset, or gameplay damage modification. The old ZIP should not overwrite this newer branch.

## Test evidence
Local standalone review-kit host regression completed **16/16** deterministic synthetic source-identity checks; existing XP-retention **8/8**, progression **13/13**, shared side-view, PvP, hosted stabs and localhost persistence suites also passed individually. These local checks are **not** a full post-push clone acceptance. No Zelda II ROM was used; source metadata in the synthetic test is invented for protocol testing and explicitly marked **not original engine data**.

The new test is `tests/test_source_room_identity_bridge.py`, added to `tests/run_alpha_acceptance.py`. Use a fresh checkout to repeat it before releasing.

## Remaining next steps (separately gated)
1. **Disambiguation adapter:** recover original ROM entrance condition and context to select one location when the catalog yields duplicates; never use first-record-wins. Keep platform adapter interface project-agnostic.
2. **Native destination graph:** verify scene exits and safe entry side/position using a legally owned ROM and emulator traces, including all transition types, before making cross-room travel authoritative.
3. **Native collision and attacks:** original movement timings, collision boxes, damage calculations, technique prerequisites and enemy AI. Existing jumping/stab PvP remains explicitly provisional.
4. **Client presentation:** show source room reference/ambiguous candidates in Forge and browser player with clear native-verification badges; do not mistake room identity for recovered gameplay.
