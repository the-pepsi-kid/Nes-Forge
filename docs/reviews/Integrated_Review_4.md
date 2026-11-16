# NES Forge · Integrated Review 4

**November 15, 2026 · Private owner candidate · GitHub push pending owner review**

Open **NES_Forge.html** for the editor. Open **ASSET_STATUS.html** for the searchable inventory covering every tracked title. **ASSET_STATUS.md** and **docs/asset-status.json** provide plain-text and structured copies.

The inventory still covers **22 titles / 28 revisions**: fourteen titles have partial native recovery, Battletoads supplies observed copies, and seven titles have no game-specific native recovery. No complete native game reconstruction is accepted. Native decoder algorithms, write spans and project schemas are unchanged in this update.

## New source packs and the shared import path

| ROM | Available in this review | Export gaps / limits |
|---|---|---|
| Ninja Gaiden | 80 editable animation project documents; 202 pose-fragment previews; source catalogs containing 44 actor records, 202 pose records, 83 scripts and 89 RAM labels. Existing 48 rooms, 423 spawn placements and 66 finite audio excerpts remain. | action_0F and action_10 lack resolved sprite-table contexts; action_59 references an unrecovered pose. All three remain visible in intake notes. No original AI/physics or native animation writer is added. |
| Zelda II | 30 Link pose-fragment previews; catalogs containing 324 contextual actor records, 252 location records, 30 poses and 20 RAM labels. Existing 258 room projects with collision values, four overworlds and 60 finite audio excerpts remain. | No complete animation project export is supplied. Complete native collision response, enemy AI, dialogue/quest rules and animation timing/state bindings remain incomplete. |

**Editable animation projects** use the normal ProjectStore loader, save and reopen path. **Sprite pose previews** are read-only fragments; their JSON contains piece placement and palettes but omits the required CHR pixels. **Source catalogs** lets the owner select individual records. Source pointers, parameters and raw flags do not automatically become authored actors or verified gameplay behavior.

The same file picker continues to accept all earlier native resource, room/map, audio-only and observed-capture archives. There is one editor entry point. Known export problems are shown even when the source report labels its overall extraction PASS.

## Verification on this exact editor

**35 of 36 suite jobs passed.** The remaining browser job is unverified because its expected Chromium executable is absent. The host returned the exact editor bytes. DOM/VM tests do not establish desktop/mobile interaction acceptance.

| Check | Result |
|---|---|
| Whole-product baseline | All 159 retained checks passed, along with the platform/domain/traversal suites, six focused intake/placement checks, extractor/inventory and eleven hosted suites. |
| New animation workflow | All 80 animation project documents preserved their animation/pose counts and all frame/Scene references through save/reopen. Read-only pose/catalog browsing left the active project unchanged. Wrong-source animation copies and malformed catalog/pose records refused. This suite passed 84/84 checks. |
| Main archive intake | All 24 supplied archives opened. Older/newer copies of the same title are included in this test count. |
| Evidence / project validation | Validated 1,546 map records, 918 room records, 1,343 native background records, two runtime snapshots, 868 collision references, 232 pose fragments, eight catalogs and 1,776 project documents (919 Scene/room, 80 animation, 11 native and 766 audio). Sixteen audio reports were also read. |
| Preview integrity | All 4,989 associated PNG members passed archive integrity and PNG-signature checks. This does not establish independent gameplay visual parity. |
| Native preservation | All 11 supplied native project documents saved/reopened and compiled to their declared original bytes without edits. Some documents repeat the same source revision. |
| Held original sources | All 14 original byte streams passed recorded intake and short embedded-emulator checks. Twenty-three archives matched a held source exactly or through a documented header substitution. Battletoads still lacks its original source for an independent check. |
| Report | All 22 title rows, coverage filtering, search, new sprite counts and visibility of the three export gaps passed report DOM checks. |

Editor SHA-256: `59ed0279fe669adb67e4d2b16d641c69fcda85835876d41b40edbc3ec026f102`. The same manifest regenerates it from 218 source parts. Current receipts are in **Evidence/index.json**.

## Owner review checklist

1. Open the new Ninja Gaiden ZIP using the main picker. Choose **Editable animation projects**; open a player action and an enemy action. Check frame art, palette, flips, timing and save/reopen.
2. Choose **Sprite pose previews** in each new pack. Inspect Ninja Gaiden poses and both Zelda II facings. Pose fragments should remain read-only.
3. Choose **Source catalogs**. Select first/last actor records, a RAM record and a Zelda II location. Confirm that browsing preserves the active project.
4. Confirm that Ninja Gaiden's three export gaps are visible in the intake notes. They are unresolved records, not silently substituted animations.
5. Recheck Zelda II's room/collision copies and a sample authored game through edit, save, reopen, Build & Run and actual audio. Complete the outstanding desktop/mobile interaction checks on the review candidate.

## GitHub handoff

No GitHub mutation was made. Read-only inspection found the existing main branch and returned the earlier public checkpoint `6ac1d59a145c0166116eae2bd94340372b3aaa06` as the latest listed repository commit. **PUSH_AFTER_REVIEW.md** records the candidate source, intended scope and public packaging boundary. Refresh current remote refs after owner review and approval before applying a push.

## Remaining release gates

Desktop/phone interaction, audible output/latency, independent visual acceptance, physical NES playback and two human wallet profiles in the original hosted Zelda II world remain open. DG-01 close-contact visual acceptance and Beacon Island's recorded visual discrepancy remain open. Full native behaviors, menus, events, transitions, collision responses and native audio score writing remain title-specific gaps in the asset inventory.

The private editor retains embedded owner recovery catalogs. Public distribution qualification and the project license decision remain open. Prior reports/receipts are preserved under **docs/reviews** and **Evidence/Review1**, **Evidence/Review2**, **Evidence/Review3**.
