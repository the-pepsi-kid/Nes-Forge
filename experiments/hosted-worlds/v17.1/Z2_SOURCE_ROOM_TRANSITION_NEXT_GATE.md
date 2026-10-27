# Zelda II Hosted Multiplayer — Source-Backed Room/Combat Integration Gate

**Status:** next implementation gate; audit of host source on 2026-10-26. Not a claim this gate is implemented, tested or playable. **Baseline branch:** `experiment/hosted-worlds-layout-v17-1`. Do not merge into `main` without owner approval.

## What is already working at a bounded level

- Protocol 13 publication/World load and host-authoritative multiplayer/room occupancy.
- Read-only ROM-derived *native room catalog* accepted via `POST /api/admin/native-rooms`, keyed by `(sourceWorldId,locationIndex)`; coordinate lookup by `GET /api/native-rooms?x=&y=`.
- Authenticated players can enter the same provisional side-view area (town/cave/palace/camp) and see shared state.
- Source-derived Link pose selectors 0–14 including Upward Stab 8 and Downward Stab 9 may be published as presentation assets.
- Pilot shared-room attacks and jumping run with **provisional** damage, hit regions and vertical motion; no claim of original Zelda II gameplay parity.
- The prior experimental encounter Game Over path now **retains unspent XP** (hosted override) and includes a synthetic regression.

## Exact missing bridge identified in current host source

1. `Host.area_for(player)` maps tile category and `x,y` to an area ID; it does **not select a ROM locationIndex, destination scene context, unique duplicate-location record or verified entry side**.
2. `Host.action(...,enter_area/move)` switches players to side-view and emits `sceneVerified:false`; no native room-source binding is established for the authoritative gameplay.
3. `Host.action(...,leave_area)` simply returns to the **same overworld cell**, not a recovered Zelda II native exit target.
4. `Host.validate_native_room` intentionally enforces `nativeSceneVerified:false` and `originalEnginePlayable:false`. Header/object/exit records are bounded provenance data **only**. Packed exit map/screen values are not, alone, a proven reachable destination or safe spawn.
5. `Host.action(...,side_step/side_jump/side_action)` relies on provisional 8-pixel step / 0.64-second parabolic jump / 8 HP pilot attacks. Native collision, gravity, hitboxes, attack windows, encounter AI and spell behavior still need source-backed recovery.

## First bounded implementation slice: source room selection and identity

**Target:** two players entering the **same real Zelda II West Hyrule entrance** resolve to the **same unique ROM-backed location/scene identifier** and shared hosted area, without falling back to a falsely verified stage.

1. Recover location records and entrance context from a user's **local, legally obtained** Zelda II ROM through the current Forge native adapter. Never distribute the ROM in Git.
2. Publish room catalog with exact sourceWorldId/sourceDigest/revision and locationIndex, then inspect duplicate coordinates/multiple records. Do not assume `x,y` uniquely identifies a scene.
3. Introduce a typed source room-selection result: `sourceWorldId`, `locationIndex`, `source scene/destination`, `entry code`, `source evidence`, and verification flags. Attach to current area instance **only once ambiguity is resolved**; reject incomplete/ambiguous records instead of guessing.
4. Keep existing synthetic hosted-room flow as a clearly named pilot fallback, not native gameplay. Do not break legacy saved IDs/World serialization without a migration and regression.
5. Add a deterministic two-player test for matching entry instance and different-player private quest state. Include cases with two records at same coordinates, unsupported destination, World change, reconnect and out-of-bounds entry.
6. Expand from source-identified area entry to **verified destination/exit transition graph** and safe spawn; only then wire native collision/movement/action timings and authoritative combat.

## Acceptance order and evidence

| Gate | Evidence to require | Status |
| --- | --- | --- |
| Z2-T1 Source identity | Two players select a unique published locationIndex/scene from ROM provenance, no false `nativeSceneVerified` | Not implemented |
| Z2-T2 Actual exits | Verified stage entry/exit target from ROM/emulator trace with correct round trip, no fabricated map index | Not implemented |
| Z2-T3 Physics/collision | Frame/trace comparison: grounded motion, jumps, ledges, scenery and doors; deterministic server replay | Not implemented |
| Z2-T4 Combat | Source-derived attack phases, sword/up/down collision, guard/reflect and native damage behavior | Not implemented |
| Z2-T5 World parity | Same-room and cross-room two-client scenes, XP, Life/Magic and persistence; no cross-instance hits | Not implemented |

Private original ROM validation is required for source authenticity; public synthetic tests are necessary but insufficient. Do not change source-native build outputs or flatten mapper/PPU effects to make the hosted demo seem complete. The Forge engine should remain project-agnostic; Zelda II recovery lives in the game adapter.

## First developer command and manual pilot

From the experiment folder run `python tests/run_alpha_acceptance.py` on a fresh checkout and record actual results. With the legally obtained local Zelda II ROM loaded in Forge, publish West Hyrule World/room metadata; open **two different** localhost players and enter the same known town. Verify that both clients share an area *but do not mislabel the room source or pilot collision as original*. Inspect the native-room metadata in the editor and note the intended locationIndex, entry and exit descriptors before implementing authoritative transitions.

The next coding step is **source room identity binding**, not NFT drops or big PvP raids.

## Zelda II sword-technique fidelity prerequisite (2026-10-26)

The hosted pose atlas is not a complete native technique import: original Mido/Darunia teaching events, learned capability flags and held Up/Down while airborne are not connected. The current X/C attack buttons and pilot hitboxes do not represent source-authentic Zelda II controls. See [the native sword-technique audit](Z2_NATIVE_SWORD_TECHNIQUES_AUDIT_2026-10-26.md) for required emulator traces, adapter design and acceptance tests. No gameplay implementation is claimed by this documentation.
