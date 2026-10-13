## October 12, 2026 — source intake diagnostics candidate

Current implementation: **2.0.0-alpha.11 / source-intake-1**, schema 12. Source Workspace now provides explicit, read-only intake reports for supplied assembly trees. Reports preserve declared dialect/engine/version separately from the workspace build profile, identify current and original bytes, list literal include/binary dependencies with file/line evidence, and expose unsupported or uncertain constructs. The complete pinned DABG ca65 input and existing Forge multi-file example provide independent foreign and supported controls.

`SourceWorkspace` remains the owner of file validation, paths, preserved originals, editing, preprocessing and builds. Its new analysis facade delegates bounded inspection to `SourceIntake`; the existing CODE panel owns declarations, explicit analysis, cancellation and report download. Workspace v1 and project schema 12 remain unchanged. Reports do not execute scripts, expand foreign macros, resolve linker allocation, translate source or insert gameplay hooks. Unsupported source declarations remain ineligible for the UI build action; new workspaces reset declarations, preserving the existing default build workflow.

Retain all **1,769 parent cases across 89 suites** and append four intake suites: **93 mandatory suites**, plus 15 declared browser supplements. Current measured outcomes require matching `test-results/candidate/Summary.json` and `checkpoints/source-intake-1-clean-extraction/Reproduction.json`. Before those records agree, verification is pending. Existing six example families must regenerate with identical projects, recipes and ROMs; HTML identity receipts are the only permitted changes. See `docs/SOURCE_INTAKE.md`, its checklist and `examples/Source_Intake/` within the application package.

Next coding dependency: select one bounded source routine and document its integration hook, ABI, registers/flags, RAM/zero-page ownership, placement and timing budget before implementation and independent runtime verification. This diagnostic slice does not establish executable foreign-engine migration. Representative NESmaker source plus engine/module version and dependencies are still needed for that specific claim. Retain remaining Audio fidelity/formats, browser/listening/device acceptance, linker/runtime/raster/LiveLink/debugging and comprehensive manual work before integrated Hosted/network/wallet/deck milestones. The full roadmap remains unfinished.

Earlier entries retain their historical scope.

---

## October 12, 2026 — native SFX recovery candidate

Current implementation: **2.0.0-alpha.11 / native-sfx-1**, schema 12. The existing structural FamiTone2 profile now offers explicit single-pulse SFX transcription as well as its retained music workflow. The independent HonkeyPong input provides two supported effects and a multichannel refusal case. Conversion follows native register data and preserves the final mixed frame; nearest-pitch, retrigger and mixing differences remain explicit.

Music and SFX imports now share `RENativeAudioImport`; `ProjectStore.applyAudioImport` owns their guarded Audio-only transaction and one Undo. SFX appends patterns, instruments and definitions while preserving existing music, tempo/speed, runtime settings and event bindings. It requires an already compatible 150/1 project. Standalone Scout examples choose that timing and add an authored attack binding separately. No schema, runtime emitter, recipe algorithm or template change is needed.

All **1,694 parent cases / 84 suites** remain mandatory. Five additional suites bring the required inventory to **89**, with 14 declared browser supplements. Actual outcomes belong to the matching current `app/test-results/candidate/Summary.json` and native-sfx-1 clean-extraction proof; application-local paths omit `app/`. Browser/owner/listening/device acceptance is separate. See `app/docs/NATIVE_SFX_IMPORT.md`, its checklist and `app/examples/RE_Native_SFX/`.

Next coding direction: strengthen supplied-source migration with explicit dialect/dependency diagnostics and then a documented, independently tested integration hook. Additional native Audio fidelity/formats remain separate bounded extensions; nonzero pitch envelopes, PAL, DPCM and multichannel SFX are not implied by this checkpoint. Retain linker/runtime/raster/LiveLink/debugging and comprehensive manual requirements before integrated Hosted/network/wallet/deck work. The complete roadmap remains unfinished.

Earlier dated entries below retain their historical scope.

---

## October 12, 2026 — native map/collision candidate

Current implementation: **2.0.0-alpha.11 / native-map-1**, schema 12. The independent DABG command representation now feeds the existing recovery registry, shared scene preview/import lifecycle and unchanged single-room compiler. Source-backed structural decoding finds 22 referenced native map resources; one fits the initial static Empty/Solid conversion subset. Refusal reasons preserve the distinction between full-solid geometry, one-way landing, interactions, scrolling and procedural maps.

The same native-scene lifecycle now serves A1 background and A2 map conversions. Existing background APIs/outputs, guarded scene transactions, runtime emitters, recipe compatibility and project schema are retained. Exact source reversal and the full retained 1,617-case/78-suite gate remain mandatory; six new suites bring the required inventory to 84. Current measured outcomes are recorded in `app/test-results/candidate/Summary.json` (or `test-results/candidate/Summary.json` inside the application package), with matching clean-extraction and browser reports. Browser/owner acceptance is separate.

Use `app/docs/NATIVE_MAP_RECOVERY.md` and its checklist; application-local paths omit `app/`. The included original input and canonical static-map/floor-edit examples preserve complete source/license provenance. Original NES2 frontend emulation is not enabled. The native raw map image and binary collision are recovered; Forge physics and the validation player are explicitly authored adaptations.

Next: review the finite A2 workflow, then continue remaining native formats/Audio fidelity, source migration/gameplay, linker/runtime/raster/LiveLink/debugging and comprehensive manual requirements before integrated Hosted/network/wallet/deck milestones. The full roadmap remains unfinished. Broad debugger work is not a newly introduced prerequisite.

Earlier dated entries below retain their historical scope.

---

# Current implementation ledger — Native Background Recovery

Candidate **alpha.11 / native-background-1**, schema 12, follows the verified automated compatibility checkpoint. The full roadmap is incomplete.

| Area | Current implementation | Evidence still required or limitation |
|---|---|---|
| Compatibility C1–C5 | Retained recipe migration, shared limits, owned settings edits and full generated previews; exact parent source preserved | Prior browser launch blockers remain open; current automated outcomes require fresh Summary |
| A1 native background formats | Bounded reset-linked immediate/fill construction and vector-linked pointer-page loading; Pepsi and HonkeyPong | Finite static subset; unknown engines remain inspectable; no universal recovery |
| Shared workflow | REMethods discovery → shared preview → canonical scene append → edit/save/reopen → independent static viewer build | Original gameplay/sprites/collision/later writes are not reproduced; Honkey final attribute defaults0 with explicit unknown |
| Framework ownership | One ProjectStore transaction helper for settings and scene append; explicit detached viewer opt-in | Preserve all predecessor tests/goldens and fresh clean-extraction provenance |
| Review | New workflow guide/checklist and generated examples | Browser/device/owner acceptance and comprehensive manual/PDF remain unfinished |
| Next dependency | A2 native map/collision on an appropriate independent source | No collision semantics inferred from these graphics or from Bridge Room control alone |

Measured current results belong to Summary and the current clean-extraction proof. Earlier dated ledgers below are preserved history, not claims about current acceptance.

## Preserved previous record

---

# Implementation status — compatibility-stabilization-1

Current priority is the owner-authorized alpha.11 compatibility stabilization checkpoint, before new mechanics and A1. The earlier movement-rules-1 candidate is the preserved behavioral parent. Schema 12 and existing runtime/template scope remain unchanged.

| Item | Implementation target | Acceptance |
|---|---|---|
| C1 Recipe compatibility | Shared versioned foundation-only migration, exact historical verification and current recipe reissue | Fresh recipe/UI suite plus browser walkthrough |
| C2 Shared validation | Configuration-owned immutable limits and project-aware references | Fresh valid/invalid/live-versus-detached cases |
| C3 Settings transaction | ProjectStore owns mutation/history and rollback; Movement Rules UI delegates | Fresh one-Undo/Redo, stale/failure/noninterference cases |
| C4 Preview preflight | Full detached builds for World and single-room using existing shared pipeline | Fresh capacity failures and ordinary-build equivalence |
| C5 Retained behavior | Original 1,504 cases/68 suites, exact source/test reconstruction and historical goldens | Fresh current Summary and clean-extraction proof; browser evidence separate |
| Next feature dependency | A1 native-background recovery/import, then A2 and prior roadmap sequence | Not implemented by this stabilization checkpoint |

Implementation and measured acceptance are separate. The current Summary/proof and browser reports provide outcomes for the exact current HTML; missing or blocked records remain open. Manual/listening/mobile/controller/hardware and complete roadmap acceptance remain pending.

## Preserved prior capability ledger

---

# Implementation status — movement-rules-1

This authoring checkpoint follows the owner's “continue” after the exaggerated traditional-mechanics discussion. The full roadmap remains in progress. Current candidate **alpha.11 / movement-rules-1**, schema 12, adds **SCENE → Movement rules** alongside the retained Seeded mashup panel.

| Area | Current implementation | Remaining scope / evidence |
|---|---|---|
| Bounded movement variation | Existing generated World or single-room move/jump/gravity/fall settings, six presets including Keep/Seeded mix, intensity 1–3, four locks, exact detached preview, source-bound recipe replay, confirmed one-Undo application and candidate JSON | Browser/mobile acceptance, actual playability and physical-device review; presets can make existing routes impossible |
| Exaggerated mechanics beyond those four settings | Not implemented by this checkpoint | Friction, knockback, health/death, timed escape/survival and new gameplay operations require their own runtime contracts; health zero does not establish player death |
| Seeded asset mashups | Retained alpha.10 version-1 workflow and recipes; may be applied before capturing a Movement Rules source | Existing donor/format/placement and aesthetic/solvability limits remain |
| Alpha A1/A2 native recovery | Existing generic physical CHR remains; movement introduces no raw-ROM decoder | Next A1: shared native-background recovery/import on independent Pepsi and source-backed HonkeyPong. Then A2: suitable independent native map/collision data |
| Remaining full roadmap | Previous capability ledger and requirements preserved below | Additional Audio, source migration/gameplay, linker/runtime/raster/LiveLink/debugging, then integrated Hosted/networking/wallet/deck work |

Only four existing fields of the active generated backend change: move 1–4, jump 1–12, gravity 1–3 and maximum fall 1–8. Mode flags, inactive configuration, body/spawn, art/layout/collision, Audio and actors stay unchanged. Viewer/custom-ASM sources are refused. Preview/cancel/refusal do not mutate the active project or emulator. Existing runtime emitters are preserved.

All **65 alpha.10 suites / 1,430 cases** remain mandatory, plus declared current suites. Actual alpha.11 evidence belongs to its fresh Summary and movement-rules clean-extraction proof; the parent's pass does not certify changed bytes. Browser/mobile, listening, controller/hardware acceptance and full manual/PDF review remain separate. Guides supplement the manual. No promotion is recorded.

## Preserved alpha.10 capability ledger and complete prior history

The following earlier ledger is retained verbatim. The current preface controls this candidate's identity and additions; unchanged remaining requirements continue to apply.

---

# Implementation status — seeded-mashup-1

This is a progress checkpoint under full roadmap implementation authorization. It is not a declaration that the complete roadmap is done. Items are reviewed in dependency order, beginning with Audio; independently prepared later work is not a substitute for missing earlier acceptance. The comprehensive roadmap remains the requirements source.

Current change: the owner explicitly requested random mashups now. **SCENE → Seeded mashup** adds bounded canonical asset mixing before the next A1 native-recovery item: captured current project plus optional Forge JSON donors, deterministic seed, target scene/domain choices, locks, detached preview/build validation and explicit one-Undo application. Candidate-project and recipe downloads are separate; recipes require matching source hashes. Gameplay variation stays within supported existing patrol/placement rules. The base scene/World/collision structure remains intact.

Whole graphic banks retain existing tile indices; a compatible combination can still look mismatched. This uses already editable content. It adds no new arbitrary-ROM recovery profile or foreign engine/code conversion. Existing method discovery, selected-excerpt Audio preview, confirmed canonical import and native ROM-copy editing remain distinct actions. Unknown engines remain open for general inspection.

The alpha.9 parent passed 1,330/1,330 cases in 61 suites. All are required again on alpha.10, with new declared mashup suites. Read the current Summary and clean-extraction proof for measured outcomes. Browser/device acceptance, visual/music quality, reachability and whole-roadmap completion are not inferred from compiler validity.

| Roadmap area | Status in this candidate | Remaining work / evidence |
|---|---|---|
| Seeded canonical mashups (owner-requested authoring checkpoint) | Compatible background/sprite CHR, palette and music selection; reproducible seed/locks/recipes, detached preview, confirmed Undoable application; bounded existing-entity variation | Full-room assembly, broader gameplay composition, new raw-ROM semantic recovery, browser/mobile usability and aesthetic/playability review remain separate |
| Existing World, Audio Runtime and Gameplay Core baselines | Preserved by mandatory regression gate | Device listening/performance/controller review; historical documented limits remain |
| 1.9.1 gameplay breadth | Unimplemented | Projectiles/groups, moving platforms, checkpoints, NPC dialogue, traversal, physical Door semantics and typed animation events |
| 1.9.2 canonical visual behavior graph | Implemented for the existing profile | Browser/mobile usability acceptance; future operation profiles remain separate |
| 1.9.3 supported Audio workflow | MIDI/MusicXML export/reimport and built-in examples implemented | Audible comparison/external application compatibility, A6, full manual review; no DPCM/expansion/FLP/OCR claim |
| 2.0.1 linker and bank allocation | Unimplemented | Mapper-aware PRG/CHR allocation, relocations, dependency packing and streaming |
| 2.0.2 Debug/Edit versus Release outputs | Partial | External source workspace exports its actual expanded ASM/maps; generated-game assembly export and separated ROM metadata profiles remain |
| 2.0.3 runtime profiles | Existing limited profiles preserved | Additional scroll/mixed/mapper profiles and their executable contracts |
| 2.0.4 raster contracts | Existing captured evidence only | Canonical represented/compilable raster events and profile support |
| 2.0.5 incremental build/LiveLink | Unimplemented | Dependency invalidation, stable resource address mappings and safe replacement |
| General arbitrary-ROM inspection | Existing bounded independent intake retained | Execution still depends on emulator/mapper support; raw analysis does not imply semantic recovery |
| Alpha A0 / 2.2 recovery contracts and methods | Shared versioned discovery/dispatch connects physical CHR and structural FamiTone2 inspection, native encoding/patching and canonical conversion; UI reports applicability and routes to existing tools | Broader methods/domains, independent validation and complete A0 acceptance; driver recognition alone does not certify conversion of a selected excerpt |
| Alpha A3 native Audio recovery | Independent FamiTone2 evidence/native ROM-copy edits plus explicit finite NTSC score transcription into canonical AUDIO, ordinary Undo/Redo and project persistence | Lossless native-engine equivalence is not supported; broader profile/format coverage, original loops/SFX/DPCM, audible comparison and complete A3 acceptance remain open |
| Alpha A1 graphics recovery | Generic physical CHR ROM import/edit/export implemented | Independent-engine end-to-end evidence; source palette/bank-use/compressed/CHR-RAM semantics remain unknown |
| Alpha A2 scenes/maps/collision | Existing Native Room control only | Reusable native formats, independent source/behavior proof; no screenshot-derived semantic guesses |
| 2.1/2.3 runtime investigation | Existing traces plus named full checkpoints and scripted input implemented | Breakpoints/read watches, broader code/data/xrefs/structures/profiling and verified game-specific actions |
| 2.4 live experiments and patches | Reversible internal/cartridge RAM experiments implemented | Value freezes, bank-aware ROM shadow patches and safe asset/LiveLink replacement |
| 2.5 technique discovery | Ongoing research target | Cannot be declared complete for every unknown engine or program |
| ASM migration | Bounded preserved multi-file Forge-6502/NROM workspace implemented | Named external dialects, real migration corpus, generated-runtime hooks/clobbers/budgets, mapper/linker integration |
| NESmaker/Lua/other languages | Unimplemented | Named versions/profiles, user-owned sources and explicit host/cartridge boundaries |
| Public repository/reviewer readiness | Source, tests and history packaged | License choice, repository setup/publication and reviewer/device acceptance |
| 3.0 input/deterministic sessions | Existing single-controller profile plus scripted RE replay | Multi-player/peripheral profiles and deterministic hosted session protocol |
| 3.1 netplay | Unimplemented | Networking, rollback/reconnect/spectators/lobbies for declared ROM profiles |
| 3.2 authority/transport contracts | Separate local server draft | Forge/cartridge intent bridge and integrated session acceptance |
| 3.3 persistent hosted worlds | Separate durable bounded state draft | Real chunk/world projection into NES budgets and integrated multi-client play |
| 3.4 economy | Separate ordinary-item/vendor/crafting reference subset | Full inventory/currency/resources/equipment/abilities/structures/XP domains and game bridge |
| 3.4.1 earned ordinary items | Local authoritative claims, items and issuer acceptance draft | Integrated game evidence, richer cross-world opt-in and lifecycle rules |
| 3.4.2 wallet/chain adapter | Unimplemented | SolGames audit, explicit testnet adapter, authentication/ownership/transfer separation, ROM effect bindings and lifecycle |
| 3.4.3 mintable loot | Unimplemented | Reserve/idempotent mint/settlement/failure and ownership lifecycle |
| 3.4.4 real-value combat loss | Unimplemented | Consent/custody model, authoritative combat, durable settlement and independent prelaunch review |
| 3.5 competitive matches | Unimplemented | Match/team/zone/spectate/rank/history profile |
| 3.6 social/voice | Unimplemented | Friends/parties/text/voice and moderation controls outside NES determinism |
| 3.7 collaborative editing | Unimplemented | Presence/concurrent edits/conflicts/versioned shared builds |
| 4.0 portable roles | Local Node host draft only | Developer/client/server role packaging and measured resource capacity on target hardware |
| 4.1 device deployment | Local server offline backup/restore draft | Build/deploy/update/logs/rollback plus actual Wi-Fi/cellular behavior |
| 4.2 Meshtastic/LoRa | Unimplemented | Hardware adapter, asynchronous message contract and measured network constraints |
| 4.3 physical deck | Unimplemented | BOM, assembly, power/thermal/battery/suspend/loss tests and field session |

The new source APIs contain actual working implementations, not placeholder completion flags. The explicit unimplemented rows remain work to do. A pure code change cannot establish phone audio latency, hardware controller compatibility, independent engine recovery, cryptocurrency settlement correctness in a deployed environment, or a physical deck build.

Retained Audio workflow: analyze a supported ROM, select a native subsong, preview a finite NTSC excerpt, inspect conversion differences, then confirm Transcribe music into AUDIO. This appends patterns/instruments and replaces the music order and tempo/speed while preserving existing assets/SFX/runtime settings. The converted score uses ordinary Undo/Redo, Save Project As/reopen and the existing compiler. Native ROM-copy editing remains a separate retained workflow. Tuning, pulse retrigger, triangle controls and other declared differences prevent a lossless sound-engine claim; native SFX, DPCM, gameplay triggers and original song loops are not imported.

After the requested mashup checkpoint, the next implementation dependency remains cross-engine native graphics/maps/collision, building on shared discovery/dispatch. Additional supported Audio fidelity/profile work, source migration/gameplay and later runtime/tooling dependencies remain; broad debugger expansion is not a new prerequisite. Listening/device evidence remains independently open. The original A6 review remains deferred, and the full manual/PDF is not comprehensively current. The new SEEDED_MASHUP guide/checklist cover this canonical authoring workflow; the retained Audio guides cover their separate bounded workflows. Existing Pepsi/Bridge Room evidence and one FamiTone2 variant cannot establish universal resource recovery.

The transcription uses global tempo 150 and speed 1. Existing SFX definitions and bindings are preserved, but their playback timing can change with those global settings. Review existing SFX after import; Undo restores the previous music settings.

**Download transcription evidence** saves the last successful preview/import report, including source identities, options and conversion evidence. It is a historical snapshot, not an importable project, native edit session or proof that the current workspace still matches it. Save Project As is the editable-score backup; the evidence report does not embed the full ROM or project. A new preview clears/replaces the previous report.

Mashup music selection keeps existing pattern/instrument/SFX definitions but uses the selected music order and its global tempo/speed after rebasing compatible references. This can change existing SFX timing. Review the preview warnings and listen; a compiler pass does not establish audible equivalence. An exported recipe records exact sources and choices, while an exported candidate project contains editable canonical data. Neither represents the separate native ROM editing session.
