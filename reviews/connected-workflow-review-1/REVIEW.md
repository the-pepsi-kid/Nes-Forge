# NES Forge connected workflow review

Review date: October 25, 2026 · Review only · Implementation paused

Reviewed application: `2.0.0-alpha.11`, local commit `e574b5f`.
HTML SHA-256: `9ac2c6750561f3e8c2dd5f542f6c6d9930383771000f1fd3cf751d70feb09d66`.

## 1. Assessment

**The workspace has working editors and guarded native writers, but the connections between selection, provenance, editing scope, previews and building are incomplete. The next milestone should consolidate that workflow before expanding recovery.**

The user's experience is supported by reproducible findings. An editable Punch-Out project is described as inspection-only in Connected Workspace. Its native pose and physical artwork views do not fully join the common source/context graph. The CHR sheet shows a whole shared bank without accounting for the selected pose's pieces. An unrelated build-set shortcut can turn a native project that builds into one that refuses to build. A fresh reopen can restore one Scene while selecting a pose belonging to another.

These are distinct problems: misleading capability descriptions, missing relationship coverage, navigation/resume defects, and deliberate limits that the interface does not explain at the point of use. They should not all be reported as encoder failures or whole-game recovery failures.

The review did **not** establish lost canonical assets, corrupted source ROMs, or removal of the architecture owners. Native validation still refuses unsupported writes. The tested Zelda II native terrain workflow still works. The application, runtime inputs and user ROMs were not modified by this review.

## 2. Shared resources: what the user is seeing

NES ROMs contain code and data. Pointer tables, indexed resources and mapper bank switching let different objects use the same stored material. A physical bank is a storage boundary; it is not necessarily a character, room or animation boundary.

The source reader produced these first-pose bank groups on **both supported Punch-Out revisions**:

| Physical 4 KiB CHR bank | Fighters whose first full-pose records select it |
|---|---|
| 29 | Glass Joe; Don Flamenco first fight and rematch |
| 26 | Von Kaiser; Great Tiger |
| 23 | Bald Bull first fight and rematch; Mr. Sandman |
| 17 | Soda Popinski; Super Macho Man |
| 11 | Piston Honda first fight and rematch; Mike Tyson |
| 27 | King Hippo in this particular first-pose inventory |

This is a bounded source observation, not an exhaustive ownership map for every state. The review inspected 367 full-pose records reported as decodable under the reader's initial conditions per revision; 176 further records required more context. State-dependent banks, incremental updates and other uses remain outside that inventory's complete coverage.

**Bank sharing does not mean every tile edit changes every fighter in that bank.** The effect depends on which pattern bytes each consumer reads. In the inspected bank-29 full-pose examples, tile 221 was observed in Glass Joe records, tile 83 in Don Flamenco records, and tile 255 in records for both. Those examples do not prove exclusive ownership in unobserved states. Tile 255 can also represent transparent material: introducing pixels into a previously blank tile can make an otherwise invisible use visible.

For the selected Glass Joe idle `$C0` preview, the audit found **52 pieces referencing 38 distinct tile IDs**. The sheet displays the bank's 256 tiles. Don Flamenco artwork in that full sheet is therefore consistent with the source mapping; it is not sufficient evidence that Glass Joe's pose was decoded from the wrong bank.

### Other places with the same distinction

| Resource or relationship | What is shared | What the interface must distinguish |
|---|---|---|
| Native CHR bank | Physical pattern bytes read by several source paths | Selected pose's actual tile use; known other consumers; coverage gaps |
| CHR tile | Pattern pixels reused by placements and pose pieces | Pixel data versus palette, flips, priority and placement |
| Palette slot | A color used by many pixels or palette aliases | Editing a stored color versus choosing an appearance for a preview |
| Metasprite | One canonical frame reused by Animation frames | Editing the frame definition versus one animation use |
| Scene tileset | Graphics/metatiles read by one or more Worlds | Tileset changes versus terrain/layout in a particular World or room |
| Actor Definition | Components and behavior shared by Actor Instances | Definition-wide edits versus instance placement or overrides |
| Audio | Instruments, patterns, SFX and explicitly linked events | Project-wide authoring, source cue inspection, adaptation and native write support |
| Native arena | Source layout resources used in multiple fights | Shared source edits versus a copied fight-reference Scene |
| Recovered snapshot | An ordinary independent copy with source provenance | Same original physical bytes versus a shared live project object |

The last row is central. Two recovered Scenes can originate from bank 29 while holding independent copied arrays. Editing one reference copy is not the physical native-bank writer. Editing that writer changes the built game's uses of those bytes; earlier reference copies stay snapshots. Identical pixels or similar names alone must never be used to infer a writable connection.

The labels `BG Bank ($0000)` and `Sprite Bank ($1000)` also need to identify their role as editor buffers. They are not ROM file offsets or a complete statement of an arbitrary mapper's live PPU mapping. Expert RE/hex views should show the separate physical bank, file range and declared execution context.

## 3. How the review was performed

| Evidence | Fresh checks in this review | Limits |
|---|---|---|
| Supplied desktop screenshot | Compared selected pose, shared sheet, bank selector and visible context | One supplied viewport; no fresh mobile/layout acceptance |
| Synthetic ordinary project | Two Scenes, two poses, Animation, World and Gameplay Render relationships; navigation and fresh reopen | Isolated parsed DOM; no real browser rendering |
| Punch-Out US PRG 0 | Native import/pose/art navigation, capability text, context/graph, build-set action, unsupported-reference save/reopen and health | No new full native fight or listening pass |
| Punch-Out US PRG 0 and PRG 1 | First-pose bank groups and selected full-pose tile-use summaries | Source-model observations; incomplete state coverage |
| Zelda II supported source | Native World routes, no-op build, terrain edit, build and fresh reopen | No new independent-emulator or hardware play |
| All 15 editor tabs | Actual tab activation in a synthetic project, with no uncaught DOM/console errors | Mount/navigation smoke only, not full feature acceptance |
| Architecture comparison | 184 source inputs; 179 identical to accepted main's local tree, five changed | Source equality does not date every existing workflow gap |
| Existing verification | Current-hash 104 retained checks and ten startup checks inspected; prior native lifecycle/playback evidence retained with its original hash | These were not rerun merely to increase this audit's count; missing historical full gate remains missing |

The audit recorded **18 workflow observations**, including 13 gaps and five working/limited-smoke observations, plus a separate fresh Zelda II continuity check. These are not 18 independent whole-product acceptance tests.

The local browser automation library was available, but its Chromium executable was absent. Full browser launch did not succeed. The executable probes use the delivered HTML in jsdom with canvas/layout/timer stubs. Screen-space and device acceptance remain separate. No new ROM, private project, game image/audio or emulator snapshot is included in the review package.

## 4. Prioritized findings

Priority here describes workflow impact, not security severity. P1 blocks normal native work or prevents a user from knowing the edit's scope. P2 causes misleading navigation, incomplete diagnosis or avoidable recovery effort.

| Finding | Priority | Main problem | Evidence |
|---|---|---|---|
| WF-01 | P1 | Authored-viewer build controls can invalidate a native project | R08 |
| WF-02 | P1 | Editable native projects get inspection-only and Zelda-II-centered guidance | R04, R06 |
| WF-03 | P1 | Native view provenance and write owners are missing from common context/relationships | R06, R07, R09 |
| WF-04 | P1 | Selected pose, used tiles, shared bank, palette and snapshot are insufficiently delineated | R05, P04, P05 |
| WF-05 | P2 | Current-editor shortcuts can lose focus or stop before the intended editor | R01, R03 |
| WF-06 | P2 | Fresh reopen can pair an active Scene with the wrong selected pose | R02 |
| WF-07 | P2 | Resources previews do not provide consistent assembled/contextual previews | R13; renderer inspection |
| WF-08 | P2 | Health does not connect current native build refusal to a repairable asset/field | R10 |
| WF-09 | P2 | Old intake/catalog context remains visible after project replacement | R11 |
| WF-10 | P2 | Current title workflows are absent from in-app Tech Docs | R12 |

### WF-01. A normal-looking native-project action breaks build eligibility

**Observed:** an unchanged Punch-Out native project built byte-for-byte. Clicking **Include first 7** changed Scene build flags/order. The next build refused with “A recovered Scene differs from its native recipe.” Undo restored the exact original output.

The control belongs to the generated NROM viewer's build set. The native backend preserves the game's original layout and does not use those controls to select seven source screens. The visible helper text still advertises the NROM limit alongside native resources.

Source: `app/src/legacy/05-foundation.js:111`; native backend routing in `app/src/services/build-services.js`.

**Repair:** make action availability and help depend on the real build backend. Retain authored-viewer controls in authored mode. Native views should expose their applicable encoder operations and fixed constraints. Advanced unsupported experiments can remain savable, with an explicit scope indication.

**Acceptance:** every default build/sidebar action offered on a no-op native project either performs a supported operation or leaves project data unchanged. Native output remains identical until a supported edit is made. The ordinary seven-Scene viewer and its door remapping still pass.

### WF-02. Capability labels disagree with working native writers

**Observed:** the tested Punch-Out project had `native-resource-project-v1` and a native pose writer, but the ribbon said **Investigated source · inspection**. Overview offered **Edit Zelda II terrain**. The Native tab described Zelda II overworld editing. Area Library labeled sprites/animation “Unresolved / Native encoder pending” without reflecting the bounded pose-position writer.

The top-level mode prioritizes `S.investigation` before a general native-project description, with a special exception for Zelda II. Area Library's version-4 table and the shared native scope string do not enumerate newer registered writer capabilities.

Sources: `app/src/ui/connected-workspace.js:32`, `:73`; `app/src/services/area-library.js:28`; `app/src/services/native-resource-project.js`.

**Repair:** derive the mode and per-domain support from existing project/adapter/encoder owners. A useful statement is “Native Punch-Out · bounded edits,” followed by exact supported fields. Keep unresolved AI, collision, animation and Audio writers distinct from supported art and position fields. The general workspace should be title-agnostic; native World editing should appear where a verified map adapter applies.

**Acceptance:** opening an ordinary project, Punch-Out native project, Zelda II native World or inspection-only ROM produces accurate, different next actions. Labels agree across intake, ribbon, Area Library, Resources and preflight.

### WF-03. New native views do not fully participate in common context

**Observed:** the native Glass Joe pose Scene produced `source=null`, `stage=null` and `canOpenSource=false` in SceneContext. Its frame still had an explicit Scene edge, but there was no graph connection to the dedicated physical-bank writer. The art Scene's `punchOutArt` marker carried a source hash, yet Resources had no art-Scene-to-source edge. The original five source background pages did have their provenance edges.

The shared services primarily understand `captureMeta.nativeAssets`. New native views use distinct markers such as `punchOutIncrementalPose` and `punchOutArt`. Those markers are appropriate ownership evidence, but the common navigation layer does not consume them consistently.

After awaiting source restoration, the Audio catalog was current and contained 84 entries. Resources exposed one project-wide Audio node and SceneContext had no verified source-event binding for this pose. **That does not mean the decoder failed, and a pose must not be assigned an invented song.** It means cue availability, observed source requests, editable adaptation and actual runtime event bindings need separate discoverable relationships.

Sources: `app/src/services/stage-context.js:7`; `app/src/services/scene-context.js`; `app/src/services/scene-audio.js`; `app/src/ui/resource-relationships.js:106`.

**Repair:** provide read-only projections of existing source markers and writer ownership to common context, capability and relationship services. Link physical origin, canonical asset references and observed native uses with distinct relation types. Preserve unknown links and incomplete coverage. Do not create a second asset store or an inferred runtime binding.

**Acceptance:** from a native pose or physical-bank view, the user can discover its source, applicable writer, related logical selection and known consumers. Generic authored links, original background-page receipts and Zelda II routes still work.

### WF-04. Whole-bank display is presented without the selected pose's footprint

**Observed:** `$C0` had 52 pieces and 38 referenced tile IDs, while its dedicated Scene's OAM list was empty. CHR's appearance/usage index reads Scene OAM, so it reported an unused-tile preview. The raw ROM browser still displayed **4 KB bank 0** while the pose context identified native bank 29. The browser is a separate selection that needs an explicit apply action, but its distinction from the displayed Scene buffer is unclear.

The newly added sprite-buffer switch fixes an empty sheet. It does not make the bank exclusively Glass Joe's, connect pose-piece usage to the sheet's palette resolver, or turn a copied preview into the native pixel writer.

Sources: `app/src/legacy/04-saveas-chr.js:213`; `app/src/services/punch-out-pose-project.js`; `app/src/re/punch-out-pose-ui.js`.

**Repair:** show “used by this pose” and “whole physical bank” as explicit views. Use the actual Metasprite pieces for tile references, palette choices and flips. Show known shared consumers at tile/field granularity and label incomplete coverage. Identify a ROM-browser selection as unapplied until explicitly used. Keep the physical writer and source snapshot roles visible.

**Acceptance:** a user can explain why Don Flamenco tiles appear in the bank, identify the selected pose's own tile uses, predict which observed consumers a pixel change affects, and choose the native writer without chat guidance. No Scene OAM or copied pixels are silently added simply to make usage counts work.

### WF-05. Shortcuts do not always follow the active editor's asset

**Observed:** with Scene A active and pose B selected, **Resources** in the context ribbon selected Scene A rather than pose B. The existing mismatch banner correctly reported the independent contexts. Opening Resources at the exact pose and enabling Follow correctly selected Scene B and pose B. Separately, Overview's **Edit Gameplay** switched to Scene but left the Gameplay panel closed.

Sources: `app/src/ui/connected-workspace.js:42`; Overview actions in the same module; `app/src/ui/metasprite-context.js`.

**Repair:** resolve the active editor's selected asset before deriving its related contexts. An explicit “open related asset” operation should select the target and expose the relevant panel. Independent browsing should remain available and accurately labeled. Do not force every Scene change to reassign unrelated Frames, Worlds or actors.

**Acceptance:** Resources invoked from Metasprites opens the selected frame, from Animation the selected clip, and from CHR the selected tile/buffer. Gameplay shortcuts expose the correct Actor Definition/Instance destination. Exact-reference follow continues to work without changing canonical data.

### WF-06. Save/reopen does not restore a coherent pose selection

**Observed:** a project saved with active Scene B and selected pose B reopened in a fresh application with Scene B active but pose A selected. Both canonical poses were retained, and the selected World ID restored correctly. This is a resume-context defect, not lost pose data.

Sources: `app/src/services/project-store.js:52`, `:185`; `app/src/legacy/13-metasprites.js:31`.

**Repair:** treat optional editor resume preferences separately from build-authoritative data. Either restore a validated pose selection or choose a clearly matching frame; if several candidates exist, make the choice explicit. Existing schema/downgrade boundaries must be retained. A new canonical schema is not justified by this review alone.

**Acceptance:** reopen a project whose selected pose is not first in the collection, in a fresh app. The correct frame or an explicit unselected/matching choice appears; there is no silently unrelated pose. ROM output, unresolved references and canonical assets remain unchanged.

### WF-07. Resource Viewer is not a consistent visual handoff

**Observed:** selecting the native pose node in Resources produced “no image renderer for this type” and zero preview canvases. Renderer inspection also shows that its Scene preview draws background tiles, while the Scene editor can composite sprites, and its CHR preview uses palette row zero rather than the CHR editor's contextual appearance resolver.

The metadata-only message is honest. The gap is that the unified preview workflow is incomplete for the assets users are being asked to follow.

Source: `app/src/ui/resource-relationships.js:237`.

**Repair:** reuse the existing authoritative pose/Scene/CHR renderers through a read-only view resolver. Label partial background-only or approximate previews. Introduce an explicit source-snapshot/current-output choice where applicable; do not refresh reference assets by mutation.

**Acceptance:** the same selected pose/tile and declared palette look consistent across Metasprites, CHR, Resources and the relevant native preview. A current-output preview reads current encoded art while preserving the canonical source snapshot and unsupported-edit guards.

### WF-08. Health cannot explain an immediately failing native build

**Observed:** after an unsupported reference-pixel edit, Health showed zero relationship issues and “Not pre-certified.” Native building refused the edit. Its disclaimer was accurate, but the user received no direct connection between that refusal and the changed reference asset or proper native writer.

Sources: `app/src/ui/connected-workspace.js:81`; `app/src/services/build-services.js:117`.

**Repair:** distinguish reference integrity from current build eligibility, and expose the existing backend's diagnostics with actionable asset/field context where it can be established. Link to the proper owner or existing Undo recovery. Keep a real build as the authoritative check.

**Acceptance:** an unsupported copied-pixel change yields a clearly identified build block and an understandable route back to supported editing. “No missing references” is not presented as build readiness.

### WF-09. Intake and Audio can describe a previous project

**Observed:** after replacing the native project with an ordinary synthetic project, Project intake still showed the Punch-Out input and reported ready. Its stale action correctly refused with “The active project changed.” The Audio catalog also retained the old source and entry count with `isCurrent=false`.

These guards prevented an invalid operation. The lifecycle presentation still requires users to reconcile old and current contexts themselves.

Sources: `app/src/re/project-gateway-ui.js`; `app/src/re/investigation-ui.js:51`; `app/src/audio/native-audio-library-ui.js`.

**Repair:** explicitly separate last-inspected input from the active project's source. Invalidate/disable stale actions visibly. Clear, collapse or label detached catalogs when a project is replaced; retain deliberate independent inspection as an explicit mode. Do not remove the source-identity and epoch guards.

**Acceptance:** switch between two ROMs and an authored project. Every displayed source identifies whether it is current or detached; offered actions agree, and the guards continue to reject mismatches.

### WF-10. Current instructions are outside the active workflow

**Observed:** the current in-app Tech Docs did not contain “Punch-Out,” “Native pose positions,” “Keep idle poses together” or “Edit native CHR bank.” The offline handbook and developer guide do cover these workflows. The user nevertheless needed repeated chat directions to reach them.

The existing per-title tutorial requirement is sound. More documentation alone will not repair navigation or make a wrong action applicable.

Evidence: R12; `app/docs/projects/PUNCH_OUT.md`; `app/docs/PROJECT_HANDBOOK.html`; `reviews/PROJECT_VERIFICATION.md`.

**Repair:** make the selected project's method and current asset's role reachable from in-app help. Use exact control names and a short supported edit/save/build lesson. Keep source/hex/HTML development material as a distinct deeper path. Preserve comprehensive offline guides and original authoring tutorials.

**Acceptance:** a tester starting from the standalone app can discover the correct native edit path without asking which dropdown is intended, and can distinguish modifying game assets from modifying the application HTML.

## 5. Review by editor and workflow

| Area | Current working basis | Connection needing attention |
|---|---|---|
| Scene | Canonical layout, attributes, palettes and placements; native writers are separately bounded | A recovered reference or pose-source Scene can look like an ordinary editable level; expose role and writer |
| CHR Sheet | Background/sprite buffers, pixel editor, palette appearances; physical native writer | Active pose usage, shared consumers, physical versus editor bank selection and reference scope |
| Metatiles | Canonical Scene metatile libraries and World references | Identify actual tileset owner and consumers before a change; preserve native restrictions |
| World | Canonical tileset/rooms and verified Zelda II native terrain path | Avoid suggesting generic terrain editing for every imported ROM; show the applicable map/resource |
| Attribute Map | Active Scene attribute data | Distinguish palette-group assignment from changing palette color bytes and from native write availability |
| Sprites | Scene OAM placement editor | Native Metasprite pieces are not Scene OAM; an empty placement view is not proof of missing fighter art |
| Metasprites | Independent canonical frames with explicit source Scenes; bounded Glass Joe positions | Active-editor focus, fresh reopen, selected-pose tile footprint and physical writer links |
| Animation | Explicit Scene/Metasprite frame references; authored timeline | Source state excerpts remain snapshots; native timing/state writing is separate; surface those relations |
| Code | Authored assembly plus a separate source investigation path | Native game code is not the authored build's `asmSource`; show source bank/address scope and restrictions |
| Audio | Native catalog/inspection/adaptation and project-wide canonical tracker | Show which source is current, what can be adapted, explicit event evidence and native writer availability |
| Collision | Authored tile/metatile properties | Graphic movement does not recover or move native attack/hurt/collision rules; keep that distinction visible |
| Entity Studio | Scene-bound entities | Distinguish Scene Entity, Gameplay Actor Definition and placed Actor Instance; open the actual target |
| Gameplay | Canonical components/behavior/instances and existing five templates | Reuse of definitions and Render sources needs consumer-level context; native AI remains separate |
| Emulator | Original-engine and authored output routes; native replay experiments | Label preserved original/current build/replay state; keep preview selection distinct from live game progress |
| RE / Disasm | Preserved source, recognition, methods, banking and evidence | Match current source identity and expose routes from newer native resource views |
| Tech Docs | Current general help plus separate comprehensive offline guides | Bring the current title method into the in-app workflow |
| Area Library | Catalog versus materialized working pages; supported native World routes | Capability rows lag newer native writers; ordinary Scene counts do not express all source resources |
| Resources | Explicit authored graph, missing-reference diagnostics, exact asset follow | Native physical ownership, source-use evidence, cue coverage and previews are incomplete |
| Connected Workspace / Health | Overview, workflow shortcuts, diagnostics and import preview | Mode classification, title-specific assumptions, active asset and build eligibility need one consistent projection |
| Save / export / build | ProjectStore/history and authoritative compiler/native validation | Resume selection and actionable scope must join the visible workflow; hide inapplicable build controls |

A tab activation pass only established that the 15 top-level tabs mounted without uncaught errors in the synthetic case. It does not certify every row's complete editing/runtime behavior. Other supported titles received source/documentation review and retained-evidence inspection; their complete edit cycles were not freshly replayed here.

## 6. Architecture assessment

The existing owners remain the right foundation: ProjectStore for transactions/persistence, canonical Scene/Metasprite/Animation/World/Gameplay/Audio assets for authoring, NativeResourceProject and registered codecs for source writes, and the existing build/emulator owners for output and execution.

Against accepted main's local tree `a6714d1`, the five runtime inputs that changed are the native Punch-Out recognition mask, pose codec, pose-project adapter and pose/art UI. The inspected ProjectStore, BuildGraph, SceneContext, StageContext, SceneAudio, Area Library, resource/workspace UI, adopted workstation modules and MMC2 emulator input are unchanged. This supports a finding of **coverage drift between newer native capabilities and older shared UI projections**. It does not establish that every gap is newly introduced.

Capabilities and selections are currently reconstructed in several places. That duplication allows an adapter's actual support, the Area Library table, workspace mode, graph edges and instructions to disagree. Continuing to add per-feature shortcuts would add more routes around the incomplete common layer.

**Recommended boundary:** extend existing common services with a read-only selection/capability/provenance projection over current owners. Do not add a parallel Stage store, copied asset authority, hidden edit recipe or new encoder permission just to connect the interface. The native writer remains authoritative about what can build.

The shared projection should answer:

1. Which project/backend and source identity are active?
2. Which logical item and canonical asset is the current editor displaying?
3. Which source bytes and declared native context produced it?
4. Is this a source snapshot, authored asset, physical writer or current-output preview?
5. Which exact fields are supported, and which existing owner edits them?
6. Which known consumers use the selected resource, and how complete is that knowledge?
7. Where should an explicit cross-editor action land, and what is blocking a build?

These are proposed review criteria, not an implemented API or approved schema change.

## 7. Required user-facing delineation

For a selected pose, a compact context should express the equivalent of:

> Glass Joe · idle $C0 · source pose preview · 38 referenced tile IDs in this declared preview · physical CHR bank 29 · shared source uses known · native position editing available · pixels edited through the physical-bank writer.

The user should be able to open the assembled pose, inspect only its used tiles, expand to the complete bank, inspect known other uses, choose an applicable edit owner and return to the same logical selection. Raw banks, code, file offsets and manual hex workflows must remain available to expert users.

Shared-use labels must match their granularity. “Three fighters select this bank” is different from “this tile is observed in these particular poses” and from “all runtime uses have been traced.” Unknown uses stay unknown. Different palettes/flips can make one tile look different; similar-looking copies do not establish a live shared asset.

Source snapshots must retain their provenance and protection. A current-output renderer can read encoded art without overwriting those snapshots or re-signing unsupported edits. When current output is unavailable because a build is blocked, show the reason and make any source-preview fallback explicit.

## 8. Recommended repair sequence

### A. Make mode and action scope reliable

Address WF-01 and WF-02 first. Prevent irrelevant native build-set mutations; align capability language and mode-dependent actions with existing owners. Preserve native and authored no-op hashes, the Retro Workstation appearance and existing native World routes.

### B. Connect native selections through the common services

Address WF-03, WF-05 and WF-09. Project the existing native markers into provenance, write-owner and known-use relationships. Resolve current-editor focus before changing destination context. Keep independent inspection explicit and stale actions visibly unavailable.

### C. Make selected assets visually intelligible

Address WF-04 and WF-07. Add used-by-selection views, palette/flip appearances, known shared consumers and consistent read-only previews. Preserve source snapshots and show current native output through a deliberate rendering mode. Include native position, art and palette paths in one discoverable route.

### D. Finish resume, diagnosis and contextual lessons

Address WF-06, WF-08 and WF-10. Validate fresh reopen selection, link build failures to repairable context, and expose the appropriate title lesson in-app. Keep editor preferences separate from ROM source and retain schema/downgrade safeguards.

Each batch should ship as a complete runnable review kit if implemented. These recommendations do not implement or publish a change; application work remains paused after this review.

## 9. Acceptance gate before more title expansion

| Case | Required connected exercise |
|---|---|
| Original authored project | Two related Scenes; distinguish frame/clip/World/Actor ownership; edit art and an explicit sound event; save/reopen; build the configured runtime |
| Zelda II native World | Choose region; edit terrain; save/reopen; rebuild/reimport; verify the intended native result and retained Audio |
| Punch-Out native pose/art | Select Glass Joe $C0; identify its used tiles and known shared uses; edit a relevant pixel/palette and grouped position through correct owners; fresh reopen; build/reimport; confirm the exact visible change in the original engine |
| Another supported adapter | Repeat a documented native room edit with accurate capabilities and source context, without relying on Zelda-II-specific guidance |
| Expert workflows | Preserve independent RE, assembly authoring, external hex editing and direct HTML/modular-source modification, each with its distinct output and validation |

For Punch-Out, the visual witness must identify the selected tile/palette/pose and the corresponding changed native byte(s), then show the intended result in its real game context. Changing any pixel hash or seeing APU activity alone is insufficient. Shared-use effects must be checked at the established scope. Graphic offsets must not be represented as native collision/attack edits.

Also test wrong-source guards, stale asynchronous work, unsupported edits remaining savable, one-step Undo/Redo for supported transactions, source-snapshot preservation, ordinary-project output, and fresh application reopen. Do not invent runtime music, routes, AI or physical-resource uses to fill incomplete coverage.

A tester should be able to complete the core edit without asking which of two similarly named pickers is intended. Broadening the supported-title list should follow that gate rather than substitute for it.

## 10. Reproduction and handoff

The package contains the exact reviewed standalone application, complete source, offline tutorials, this review and scripts/evidence. The HTML is unchanged; this is an audit package, not a fixed release.

Run from the Source checkout using jsdom 30.1.3 and your own supported ROMs:

```sh
NODE_PATH=/path/to/jsdom/node_modules node reviews/connected-workflow-review-1/probe_workflows.cjs /path/to/private-roms
NODE_PATH=/path/to/jsdom/node_modules node reviews/connected-workflow-review-1/probe_z2.cjs /path/to/Zelda-2.nes
node reviews/connected-workflow-review-1/inspect_shared_resources.cjs /path/to/private-roms
```

`probe_workflows.cjs` names the two US Punch-Out revisions it expects. The Zelda II probe checks the supported source identity. Probes use isolated in-memory projects and do not edit the supplied source files. Their confirmed gap observations are review findings, not claims that a release gate passed.

Read `Workflow_Observations.json`, `Shared_Resource_Observations.json`, `Z2_Continuity_Verification.json` and `Architecture_Continuity.json` for evidence. `ISSUES.csv` maps repair priorities to observation IDs and acceptance criteria. `HANDOFF.md` records the paused state and constraints for the next implementation.

The original Pepsi archive and accepted main remain untouched. The review does not authorize a GitHub push, main merge, new native writer or project-schema migration.
