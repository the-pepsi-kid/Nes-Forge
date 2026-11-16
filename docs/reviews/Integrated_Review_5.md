# NES Forge · Integrated Review 5

**November 16, 2026 · Private review candidate · GitHub push pending owner review**

Open **NES_Forge.html**. The complete per-ROM report is **ASSET_STATUS.html**, with Markdown and JSON copies in the same kit. This update repairs the direct **ROM → RE import → Resources → editor** workflow. It is a complete consolidated build.

## What was wrong

The earlier report described recovered source catalogs as though those records were already available throughout the working editors. Direct Zelda II / Ninja Gaiden RE import actually creates the first available room and first pose, and saves the larger catalog separately. Zelda II's three visible Scenes were three pages of one room; its single visible metasprite was one Link pose. Resources omitted the retained catalog, and the room picker disabled rooms without working copies. This was an integration gap, not evidence that every advertised asset was present in the editors.

## What changes in this build

**Resources → ROM library** now browses the retained source catalog independently of detached RE sessions. **Editable working copies** shows the ordinary assets already opened in the project. Browsing does not alter the project. **Edit source copy** opens supported room, pose and script data in the original Scene, Metasprites and Animation editors; a new copy is one Undo step. Existing copies are reused so their local edits survive.

| Direct RE ROM import | Available in Resources | Editable route |
|---|---|---|
| Zelda II | 567 room-table slots: 258 unique room streams, 303 aliases and 6 unavailable slots; 30 Link display poses; 324 contextual actor records; 252 locations; physical CHR, maps, RAM, code labels and 75 Audio cue/control records. | Available rooms open their split Scene pages and related room Worlds. All 30 Link poses can open as canonical metasprites sharing the original three Scene owners. Actor/routine/location records remain reference data. |
| Ninja Gaiden | 48 rooms, 202 source poses, 83 scripts, 44 actor records, physical CHR, RAM/code and 85 Audio command entries. | Supported poses and scripts open with an explicit source-room graphics/palette context. Script frame durations retain native update ticks. action_0F / action_10 lack a resolved shape-table context; action_59 references an unrecovered pose. All three remain visible and refused for editing. |
| Other installed native resource adapters | The complete retained room/page catalog appears in Resources, rather than only the first working page. Matching native Audio libraries are linked where a decoder exists. | Open a selected source page with the existing native page owner. Existing native writers retain their original scope. TMNT's installed Area 1 pages are already canonical; other unrecovered areas are not fabricated. |

The room picker now opens available source entries that previously appeared disabled as “not imported.” The Resource Viewer shows original source art before creating a working copy. Native actor records have their own **Native actor record** filter; they are not presented as authored Gameplay Actor Definitions.

## What “growing with imports” means today

The current project's library grows with the content its installed decoder recovers. **Import as new project replaces the active project.** Save/reopen preserves that ROM's source, recovered catalogs and opened working copies. Forge does not automatically learn unknown formats or maintain a permanent combined library of all previously imported ROMs. Cross-ROM reuse still uses explicit donor/workshop/asset-copy workflows.

The retained catalog can exceed the editor's working capacities: **64 Scenes, 32 Worlds, 256 metasprites and 256 animations**. These are current application capacities; the catalog itself is not truncated to them. Source previews decode on selection. A working-copy request that exceeds capacity refuses before changing the project and retains the full source catalog; individual recovered projects can also be exported through RE.

Opening an original source copy does not add a native encoder. On a clean preserved project, opening pristine copies leaves native output byte-for-byte identical. Earlier unsupported editor changes remain build-blocking when additional source resources are opened. Original pixels, recipes and local edits are never silently discarded or reclassified as encodable work.

Zelda II's **324 actor records are contextual parameter/dispatch entries**, including repeated types across areas. They are not 324 complete unique enemies, recovered enemy metasprites, translated AI or playable Gameplay Actors. Complete Zelda II enemy poses, timing/state bindings, physics, collision response, dialogue and quest recovery remain incomplete. Fresh direct ROM room copies still initialize authored collision as unassigned; the supplied collision-enriched room projects have a separate scope.

## Verification on this exact editor

**36 of 37 suite jobs passed.** The separate real-browser job remains unverified because its Chromium executable is unavailable. DOM/VM checks establish data and command behavior, not desktop/mobile visual acceptance.

The new direct-import suite passed **8/8 checks**. It opened all 30 Link poses and compared every piece's source pixels and flips; opened another Zelda II room with all pages; checked single-step Undo/Redo and save/reopen; confirmed byte-identical native output; verified that opening more assets never clears an unsupported edit; opened real player/enemy Ninja scripts and refused the three unresolved scripts; opened a previously absent Contra resource page; and allocated a separate sprite atlas for another Ninja room's graphics context, including save/reopen and copy reuse. Its DOM workflow exercised the actual ROM picker, RE import, 30-pose Resources filter, source preview, editor action, previously unavailable room picker and source Audio/map navigation.

The retained whole-product, extraction, animation-pack, native roundtrip, original-ROM, authored editor, Audio, gameplay, hosted, physical extractor and inventory checks also passed. Detailed counts and limitations are in **Evidence/index.json** and the individual receipts. Fourteen held original byte streams and 24 supplied archives were checked. The original Battletoads ROM is still unavailable for an independent source check.

Editor SHA-256: `060a700bd5a5e3371622adc0045c006cdea992f72dbb127adcf4e7f92556705f`. It regenerates from **219 source parts** with `python app/tools/bundle.py --check`. Native decoder algorithms, native write spans and project schemas are unchanged. Prior review reports and their original evidence remain under **docs/reviews** and **Evidence/Review1–Review4**.

## Owner review checklist

1. Open the correct Zelda II ROM through RE and Import as new project. In **Resources**, choose **ROM library → Metasprite**. Confirm 30 Link poses appear, including both facings. Select a later pose, inspect its source art and choose **Edit source copy in Metasprites**.
2. Select **ROM library → Scene**. Preview and open a different room. Confirm its pages have actual room layout. The Scene room picker should also let you browse available rooms without working copies.
3. Filter **Native actor record** and inspect several contexts. Check health/XP/vulnerability codes and routine addresses as reference data; do not expect them to be automatically playable enemy definitions.
4. Save Project As, reopen, and confirm both the full source catalog and opened working copies remain. Open the same pose again and confirm it reuses the existing copy. Check Undo after adding a new source room.
5. Check Ninja Gaiden player/enemy scripts with the appropriate room graphics context. Confirm the three unresolved scripts remain blocked and are not replaced with guessed frames. Check native Audio cue navigation and audition.
6. Review the per-ROM inventory and remaining native writer gaps. Desktop/phone layout, audible output/latency, original-game visual parity, physical NES playback, two-human hosted/wallet play and the recorded DigiGhosts/Beacon Island visual issues remain owner review gates.

## GitHub

No commit, branch, pull request or push was made. The owner requested this report and review first. **PUSH_AFTER_REVIEW.md** retains the earlier read-only repository snapshot and publication boundary; remote refs must be refreshed after approval. The private review kit is not the public source-on-demand Git artifact.
