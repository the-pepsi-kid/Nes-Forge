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

# NES Forge — Authoritative Roadmap

**Current revision: October 11, 2026 — A2 independent map/collision intake.**

The application remains **2.0.0-alpha.11 / native-background-1**, schema **12**, not promoted. Its HTML SHA-256 is `4dec7048b9fdb77bcfcd46ccde3d293313e53489f4987a7a112eced8cce6fa11`. The prior measured result remains **1,617/1,617 cases across 78 suites**; it is retained evidence, not a new gate run. All 4,880 application payload hashes and the exact 4,881-file inventory were verified unchanged for this research checkpoint. Twelve browser runners remain blocked with zero checks.

Compatibility stabilization and the bounded A1 two-format background workflow have been implemented since the historical Movement Rules preface below. Explicit recipe migration now exists; the old statement that alpha.10 replay has no migration is historical. A1 browser/owner acceptance and the broader roadmap remain open.

## Current A2 work and sequence

The next dependency is a source-backed collision format, not a graphics-derived guess. HonkeyPong uses immediate arena bounds and paddle comparisons rather than tile collision records. Pepsi does not establish collision semantics, and Bridge Room remains a purpose-built control.

The selected independent input is **Double Action Blaster Guys**, upstream commit `5ecc60b6af3f726851bfeb1c2555388c5953e0c0`. The intake checkpoint preserves original sources and notices, a pinned offline build, the unmodified ROM, and original-machine-code evidence. Its NES 2.0 / CHR-RAM container, compact map commands, rendering transformations and separate full-solid/landing rules require explicit treatment. The actual loader governs interpretation when upstream format prose disagrees.

1. **A2 input checkpoint:** reproduce the original source; document native records and collision behavior; verify a real solid/empty record edit; retain the exact application candidate. See `research/native-map-intake-1/README.md` and measured reports for the completed scope and limits.
2. **Next A2 implementation:** add bounded structural discovery/decoding and a declared static solid/empty conversion through shared framework owners. Prove CHR-RAM graphics, coordinates and canonical collision before claiming scene import. Follow `planning/NATIVE_MAP_RECOVERY_CONTRACT.md`; no schema, template or collision-runtime expansion is needed for the initial supported subset.
3. **A2 application gate and acceptance:** verify canonical useful edit, Undo/save/reopen and rebuilt movement; preserve all current cases; run the full gate on a clean extraction; record browser/owner evidence separately. These remain open. A research decoder or original-code check alone does not complete A2.
4. Continue the retained Audio/fidelity/listening, source migration/gameplay, linker/runtime/raster/LiveLink/debugging and comprehensive manual requirements before integrated Hosted/network/wallet/deck milestones. Broad debugger expansion is not a newly invented prerequisite.

The owner’s full-roadmap authorization and one-bounded-item-at-a-time direction remain in force. The research checkpoint does not add an editor recovery profile or claim universal recovery. Current application documentation describes the frozen last-built candidate; this planning preface controls the next development work.

## Preserved planning history

Earlier revisions below remain verbatim as dated history. Their candidate identities and next-work statements apply to those revisions only.

---

**Current revision:** October 10, 2026 UTC (October 9, America/Denver) — Movement Rules.
**Active candidate:** **2.0.0-alpha.11 / movement-rules-1**, schema **12**, **not promoted**.
**Measured alpha.11 gate:** **1,504/1,504 cases across 68 suites, zero failures**, from a verified clean extraction, 2026-10-10T04:58:25.497Z to 2026-10-10T05:19:47.055Z. All 65 alpha.10 suites / 1,430 cases retained; 74 new movement-rule cases.
**Frozen HTML SHA-256:** `cb216a470954ac8898dcb410eadf1de0eb267287b88c4e757bec3a80284946f1` (1,612,418 bytes).
**Candidate ZIP:** `NES_Forge_2.0.0-alpha.11_Movement_Rules_Candidate.zip`; SHA-256 `26258b95f46f2712b72deea2367daaccd643743d09454b943367c5b45d094018`; 38777773 bytes; 3867 files / 3866 payload checksums.
**Browser evidence:** ten blocked current-hash runners, zero browser checks. Listening/mobile/controllers/hardware remain unverified.
**Current identity/evidence:** `CANDIDATE.json`, application `build-inputs.json`, current candidate Summary and clean-extraction proof agree.
**Preserved parent:** alpha.10 / seeded-mashup-1; HTML SHA-256 `58e53633207e9d5c259b4cea52f1da09f113877d34a3078c5f7c3c624f98e375`; verified **1,430/1,430 cases across 65 suites**. Nine parent browser runners were blocked with zero checks. Those historical results do not certify alpha.11.

## Authority and current authoring checkpoint

The owner said “continue” after discussing exaggerated traditional NES mechanics. This continues authoring through a bounded extension of existing movement settings while preserving the separate seeded-mashup workflow. Full roadmap implementation authority and the one-item-at-a-time direction continue; the full roadmap remains unfinished. Promotion, device acceptance and public or real-value deployment remain distinct.

**SCENE → Movement rules** captures the current canonical project and targets active generated World, otherwise generated single-room gameplay. Keep, Sprint, High jump, Slow fall, Heavy fall and Seeded mix presets, intensity 1–3 and four field locks choose only existing move/jump/gravity/fall values. Detached preview shows exact before/after values and validation. Confirmed Apply rechecks current state and creates one project Undo action. Candidate JSON and recipes are separate explicit downloads; exact recipe replay requires the unchanged original source project.

The legal ranges remain move 1–4, jump 1–12, gravity 1–3 and maximum fall 1–8. Preserve all other source values, including inactive runtime configuration, body/spawn, scene/World/collision structure, Audio, actors and mode flags. Refuse viewer/custom-ASM sources; do not automatically enable a runtime. Existing emitters and mashup version-1 modules/recipes remain unchanged. To combine features, apply the mashup first, then capture the resulting project for movement variation; the stages keep separate recipes and Undo actions.

This checkpoint does not implement friction, knockback, automatic death, timed escape/survival, new templates or a raw-ROM recovery profile. Existing health zero is not a demonstrated player-death mechanic. Exaggerated settings can make an existing route impossible, even when the generated ROM is technically valid.

**Known recipe compatibility boundary:** alpha.10 mashup recipes are refused by the alpha.11 UI because ordinary opening changes foundation metadata and therefore the canonical base hash. Replay with the included alpha.10 application and original sources, save the resulting project, then open that result in alpha.11. Already-saved result projects open normally. The raw v1 algorithm remains reproducible; this is not cross-release UI recipe compatibility. Add explicit recipe migration before a later release bump.

## Evidence and review

Retain every **65 alpha.10 suites / 1,430 cases**, plus declared Movement Rules suites. Require exact source/result preservation, seed/lock/recipe behavior, malformed/stale/cancel/refusal cases, bundled UI application/Undo, save/reopen and controlled actual 6502 motion evidence for both generated backends. Freeze inputs, verify staged payloads and run the full gate on one unchanged clean extraction. Only fresh reports establish alpha.11 outcomes.

Follow `app/docs/MOVEMENT_RULES.md` and `app/docs/MOVEMENT_RULES_CHECKLIST.txt`. Browser interaction/layout/native dialogs, same-device Cricket Dream 5G / Chrome A/V comparison, listening, USB-C/Bluetooth controllers and NES/deck hardware remain separately unverified unless actually measured. Blocked browser launches record zero checks. Earlier feedback and deferred A6 retain their historical scope. The full manual/PDF is not comprehensively current; supplied guides supplement it.

## Remaining sequence

Before a later release bump, resolve explicit cross-release recipe migration. Then resume A1 shared native-background recovery and editable import on independent Pepsi and source-backed HonkeyPong inputs; then A2 on suitable independent native map/collision data. Additional supported Audio coverage/fidelity, source migration/gameplay and linker/runtime/raster/LiveLink/debugging dependencies remain. Complete finite Audio/RE/runtime requirements before integrated Hosted Worlds/networking/wallet/mint/loot and portable physical-deck milestones. Existing local hosted drafts do not establish those integrations. The complete requirements history below remains in force.

## Preserved alpha.10 planning and complete prior history

The following prior document is retained verbatim. Its measured evidence belongs to alpha.10; this preface controls current candidate status and additional scope.

---

# NES Forge — Authoritative Roadmap

**Current revision:** October 8, 2026 UTC — Seeded Mashup.
**Active candidate:** **2.0.0-alpha.10 / seeded-mashup-1**, schema **12**, **not promoted**.
**Measured alpha.10 gate:** **1,430/1,430 cases across 65 suites, zero failures**, from a verified clean extraction, 2026-10-08T21:50:30.607Z to 2026-10-08T22:07:11.237Z. All 61 alpha.9 suites / 1,330 cases retained; 100 new mashup cases.
**Frozen HTML SHA-256:** `58e53633207e9d5c259b4cea52f1da09f113877d34a3078c5f7c3c624f98e375` (1,584,566 bytes).
**Candidate ZIP:** `NES_Forge_2.0.0-alpha.10_Seeded_Mashup_Candidate.zip`; SHA-256 `696732dcfa3d06b20aa2ba415998e269f46e05b47e302a768497efa41eea1ced`; 36163109 bytes; 3333 files / 3332 payload checksums.
**Browser evidence:** nine blocked current-hash runners, zero browser checks. Listening/mobile/controllers/hardware remain unverified.
**Current identity/evidence:** `CANDIDATE.json`, application `build-inputs.json`, current candidate Summary and clean-extraction proof agree.
**Preserved parent:** alpha.9 / recovery-methods-1; HTML SHA-256 `b61825396f375e1e6a4ad13822e9db163f59584d545d158ee96af731c0e74f50`; verified **1,330/1,330 cases across 61 suites**. Eight parent browser runners were blocked with zero checks. Those historical results do not certify alpha.10.

## Authority and current authoring checkpoint

The owner explicitly requested mashup implementation now, after discussing seeded cross-source combinations. This adds a bounded canonical authoring checkpoint before the next A1 native-recovery item. Full roadmap implementation authorization and the one-item-at-a-time direction continue. The complete roadmap remains unfinished. Promotion, browser/device acceptance and public or real-value deployment remain distinct.

**SCENE → Seeded mashup** combines compatible background tiles, sprite tiles, palettes and music from a frozen current project and optional Forge project JSON donors. A deterministic text seed, exact source identities, explicit donor/keep choices and locks make results reproducible and adjustable. Preview builds a detached candidate and reports validation before any confirmed application. Apply uses one project Undo action. Candidate-project and recipe downloads serve different purposes: recipes identify source hashes and selected assets but do not embed donor data.

The base project's scene/World/collision structure and existing five gameplay templates remain. Gameplay variation is opt-in and bounded to supported patrol/placement rules on existing entities. Music selection appends/rebases compatible canonical patterns/instruments, preserves existing definitions and bindings, and replaces music order/global tempo/speed; existing SFX timing can consequently change. Invalid references, unsupported capacity/formats and custom-ASM base projects receive explicit refusals. Donor code is not executed.

This checkpoint supplies no new raw-ROM resource decoder or arbitrary engine/code merging. Native content must first pass an existing supported recovery/import workflow into editable canonical content. Shared method discovery, original-driver ROM-copy editing and finite canonical Audio transcription retain their distinct evidence, confirmations and limits. Full-room assembly and broader maps/collision/gameplay composition remain separate work.

## Evidence and review

Retain all **61 alpha.9 suites / 1,330 cases** and add the current declared mashup suites. Require deterministic and lock/recipe checks, malformed/incompatible/stale/cancel cases, source/project/emulator isolation, canonical edit/Undo/save/reopen and actual generated-ROM evidence. Freeze inputs, verify every staged payload and run the complete gate on the unchanged clean extraction. Fresh reports establish results. Compiler validity alone does not prove playability, visual coherence, musical fit or device performance.

Follow `app/docs/SEEDED_MASHUP.md` and `app/docs/SEEDED_MASHUP_CHECKLIST.txt`. Browser layout/interaction, native dialogs, listening, same-device Cricket Dream 5G / Chrome A/V comparison, USB-C/Bluetooth controllers and NES/deck hardware remain separately unverified unless actually measured. A blocked browser launch records zero checks. Earlier owner feedback and deferred A6 retain their historical scope. The complete manual/PDF is not comprehensively current; supplied guides supplement it.

## Remaining sequence

Resume cross-engine native graphics/maps/collision after this requested authoring item. Further supported Audio profiles/fidelity, source migration/gameplay and linker/runtime/raster/LiveLink/debugging dependencies remain; broad debugger expansion is not a new prerequisite. Complete those finite Audio/RE/runtime requirements before integrated Hosted Worlds/networking/wallet/mint/loot and portable physical-deck milestones. Existing local hosted drafts do not establish those integrations. The complete prior requirements below remain in force.

## Preserved alpha.9 revision and complete prior history

The following saved alpha.9 revision is retained verbatim, including all prior history. Its identities, measured results and then-current next-work descriptions remain historical; the update above controls alpha.10 status.

---

# NES Forge — Authoritative Roadmap

**Current revision:** October 8, 2026 UTC — Recovery Methods.
**Active candidate:** **2.0.0-alpha.9 / recovery-methods-1**, schema **12**, **not promoted**.
**Measured alpha.9 gate:** **1,330/1,330 cases across 61 suites, zero failures**, from a verified clean extraction, 2026-10-08T20:56:41.436Z to 2026-10-08T21:11:50.540Z. All 58 alpha.8 suites / 1,263 cases retained.
**Frozen HTML SHA-256:** `b61825396f375e1e6a4ad13822e9db163f59584d545d158ee96af731c0e74f50` (1,528,428 bytes).
**Candidate ZIP:** `NES_Forge_2.0.0-alpha.9_Recovery_Methods_Candidate.zip`; SHA-256 `7ca14b4f5c660469039e857292e691d31d862bfb148dd5cb8405f46a0c772b09`; 33730319 bytes; 2838 files / 2837 payload checksums.
**Browser evidence:** eight blocked current-hash runners, zero browser checks. Listening/mobile/controllers/hardware remain unverified.
**Current identity/evidence:** `CANDIDATE.json`, application `build-inputs.json`, current candidate Summary and clean-extraction proof agree.
**Preserved parent:** alpha.8 / native-audio-import-1; HTML SHA-256 `cbd2547b2a641760045658a16f610c0197490a8493985af4e2ac9deb897423ba`; verified **1,263/1,263 cases across 58 suites**. Seven alpha.8 browser runners were blocked with zero checks. These are historical results, not alpha.9 certification.

## Authority and current dependency

The owner's full roadmap implementation authorization and one-item-at-a-time direction continue. This alpha.9 checkpoint addresses the next A0 dependency: shared recovery-method discovery and dispatch. The complete roadmap remains unfinished. Promotion, browser/device acceptance and public or real-value deployment remain distinct from authorized software implementation.

The existing physical CHR and structural FamiTone2 methods now share explicit operation declarations for inspection/decoding, native encoding/patching and canonical conversion. General ROM Analysis gains **Available recovery methods → Discover recovery methods**, showing source identity, applicability, operations, evidence and limits with routes to existing controls. Discovery and routing do not import assets, change the active project or load/run the emulator. Driver recognition does not establish readiness of a particular finite score transcription; the retained preview performs that check.

A shared contract does not recover undeclared scene/collision/audio formats. Physical CHR retains its generated grayscale/layout aids and unknown source palette/map semantics. FamiTone2 native edits retain original-driver ROM copies; finite canonical Audio transcription retains tuning/retrigger/triangle/timing differences, exclusions and explicit confirmation. Lossy conversion does not advertise a native inverse or a round-trip claim. Unknown engines remain available for general inspection.

## Evidence and review

Preserve all 58 alpha.8 suites / 1,263 cases and add the current recovery-method suites. Freeze inputs, verify staged payloads and run the complete gate from clean extraction. Require source-backed fixture and renamed/relocated/malformed/unsupported cases, real shared-operation dispatch, valid bounded evidence, source-generation safety, input isolation and project/emulator/native-session noninterference. Only fresh current reports establish alpha.9 results.

Follow `app/docs/RECOVERY_METHODS.md` and `app/docs/RECOVERY_METHODS_CHECKLIST.txt`. The full manual/PDF is not comprehensively updated; these documents supplement it. Browser layout/interaction, native dialogs, audible comparison, same-device Cricket Dream 5G / Chrome performance, USB-C/Bluetooth controllers and NES/deck hardware remain separately unverified unless actually measured. Deferred A6 and earlier user tutorial/alpha.5 results retain their original scope.

## Remaining sequence

Next comes the roadmap's cross-engine native graphics/maps/collision slice. Further supported Audio coverage/fidelity, source migration/gameplay and linker/runtime/raster/LiveLink/debugging dependencies remain; a broad debugger rewrite is not an added prerequisite. Complete the finite Audio/RE and runtime requirements before integrated Hosted Worlds/networking/wallet/mint/loot and portable physical-deck milestones. Existing local hosted drafts do not establish those integrations. Consult the complete requirements history below and the current application capability ledger; no other area becomes complete through this A0 foundation.

## Preserved alpha.8 revision and complete prior history

The following saved alpha.8 revision is retained verbatim, including its complete prior history. Its identities, measured results and then-current next-work descriptions remain historical; the update above controls alpha.9 status.

---

# NES Forge — Authoritative Roadmap

**Current revision:** October 8, 2026 UTC — Native Audio Score Import.
**Active candidate:** **2.0.0-alpha.8 / native-audio-import-1**, schema **12**, **not promoted**.
**Measured alpha.8 gate:** **1,263/1,263 cases across 58 suites, zero failures**, from a verified clean extraction, 2026-10-08T18:46:11.681Z to 2026-10-08T19:00:50.684Z. All 55 alpha.7 suites / 1,191 cases retained.
**Frozen HTML SHA-256:** `cbd2547b2a641760045658a16f610c0197490a8493985af4e2ac9deb897423ba` (1,489,496 bytes).
**Candidate ZIP:** `NES_Forge_2.0.0-alpha.8_Native_Audio_Import_Candidate.zip`; SHA-256 `09f2b42d89ff992e3acde1348ae917aa1664a2ace6cc9f47fd9279aea8d9e981`; 31286523 bytes; 2256 files / 2255 payload checksums.
**Browser evidence:** seven blocked runners, zero browser checks. Listening/mobile/controllers/hardware remain unverified.
**Next coding dependency:** A0 shared recovery-profile discovery and dispatch, aligning the existing physical CHR and FamiTone2 tools under declared inspect/decode, native-edit and canonical-conversion operations. Follow with the roadmap’s cross-engine native graphics/maps/collision slice; general debugger or gameplay expansion is not a new prerequisite.
**Current identity/evidence:** use `CANDIDATE.json`, application `build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/native-audio-import-1-clean-extraction/Reproduction.json`; these records must agree. The retained alpha.7 result is **1,191/1,191 across 55 suites**; that historical pass is not an alpha.8 result.

## Authority and current position

The owner requested full roadmap implementation, directed work one item at a time, and instructed “Ok continue” after being told that alpha.7 was an intermediate checkpoint. Implementation authorization continues without repeated coding permission. This alpha.8 update advances the next Audio dependency; the **complete roadmap remains unfinished**. Promotion, physical acceptance and public or real-value deployment remain distinct from software implementation.

## Implemented scope and explicit fidelity limits

After opening and analyzing a supported ROM in **RE / DISASM → General ROM Analysis**, select **Native subsong**, choose **Native rows in excerpt (1–1024)** and use **Preview import to AUDIO**. The preview reports source identity, conversion evidence, warnings, limits and refusals. **Transcribe music into AUDIO** explicitly confirms replacement of the current music order. It appends canonical patterns/instruments, replaces order/tempo/speed in one ordinary Undo action, and retains existing patterns, instruments, SFX and runtime settings. Save Project As/reopen preserves the editable score. The original ROM and emulator stay unchanged; compilation remains the existing explicit Audio Runtime build workflow.

This is **editable score transcription**, not a lossless native sound-engine replacement. Native timer tuning, pulse retrigger/phase, triangle controls, envelope clocks and timing need declared conversion behavior or refusal. The finite NTSC excerpt does not recover the native song loop, SFX, DPCM, gameplay triggers or the entire game's audio behavior. The retained alpha.7 workflow still edits validated native command bytes on an isolated ROM copy using the original external driver; those native edits have their own Undo/Redo and ROM/evidence exports. Save Project As preserves canonical transcription, not that separate native edit session.

Recognition remains a declared structural FamiTone2 instruction/data profile with validated mapping and initialization evidence. HonkeyPong is the independent permitted source control, not a filename/hash allowlist. Unknown engines still open for binary inspection; unsupported transcription is an explicit nonmutating outcome. More drivers, native resource domains and complete Alpha A3 acceptance remain open.

## Evidence, review and next work

Retain all 55 alpha.7 suites and 1,191 cases, then add the three declared import suites. Freeze inputs and run the full gate from a verified clean extraction; actual fresh Summary counts and reports establish new results. Require canonical edit/Undo/save/reopen/rebuild and actual generated-ROM evidence, with independent conversion fixtures and stale/cancel/noninterference checks. Do not transfer a previous candidate's pass to new bytes or treat a planned test count as a result.

Follow `app/docs/NATIVE_AUDIO_IMPORT.md` and `app/docs/NATIVE_AUDIO_IMPORT_CHECKLIST.txt`. Browser rendering/interaction, native file dialogs, listening, same-device Cricket Dream 5G / Chrome A/V comparison, USB-C/Bluetooth controllers and physical NES/deck tests remain separate evidence. An unavailable Chromium launch records zero checks, not success. Alpha.5 owner A1–A5 feedback and deferred A6 remain attached to that earlier build. The full manual/PDF has not been comprehensively updated; these new documents supplement it.

Continue the remaining Audio fidelity/profile and acceptance work, broader native map/collision recovery, gameplay/linker/debugger/raster/LiveLink/migration dependencies, and then integrated Hosted Worlds/wallet/deck requirements. The complete existing ledger below remains requirements history; no unrelated later area becomes complete through this bounded Audio item.

## Capability change relative to alpha.7

| Area | Alpha.8 checkpoint | Still open |
| --- | --- | --- |
| Alpha A3 canonical Audio editing | Explicit finite native score transcription into editable canonical music, with project Undo/persistence and existing compiler path | Lossless native-engine equivalence, original loops/SFX/DPCM, broader profiles and listening/device acceptance |
| Native ROM-copy editor | Retained independent session and original-driver edits | No full-game source or universal audio recovery claim |
| Earlier alpha.6/alpha.7 workflows | Preserved by the mandatory current gate | Their prior missing browser/device/manual acceptance remains missing |
| Rest of roadmap | Existing implementations/drafts and unimplemented areas retain their individual states | Complete roadmap remains unfinished |

---

The transcription uses global tempo 150 and speed 1. Existing SFX definitions and bindings are preserved, but their playback timing can change with those global settings. Review existing SFX after import; Undo restores the previous music settings.

**Download transcription evidence** saves the last successful preview/import report, including source identities, options and conversion evidence. It is a historical snapshot, not an importable project, native edit session or proof that the current workspace still matches it. Save Project As is the editable-score backup; the evidence report does not embed the full ROM or project. A new preview clears/replaces the previous report.

## Preserved alpha.7 revision and complete prior history

The following saved alpha.7 revision is retained verbatim. Its identities, results and then-current next-work descriptions belong to alpha.7; the current update above controls alpha.8 status. No previous evidence is relabeled as an alpha.8 pass.

# NES Forge — Authoritative Roadmap

**Current revision:** October 8, 2026 UTC — independent native Audio investigation.
**Candidate:** **2.0.0-alpha.7 / native-audio-1**, schema **12**, **not promoted**.
**Frozen HTML SHA-256:** `ca801e999fa94e5bc124637cd43d14d595fb1e8eebe5a1a4c453356d8de8ba19` (1,457,965 bytes).
**Measured full gate:** **1191/1191 cases, 55 suites, zero failures.**
**Browser results:** **six blocked runners, zero browser checks run.**
**Final candidate ZIP:** `NES_Forge_2.0.0-alpha.7_Native_Audio_Investigation_Candidate.zip`; SHA-256 `80f262895881229a681e0e3528578086a9c09ee1494f26e71dc17ea488ef41b3`; 29,148,136 bytes; 1,815 files / 1,814 verified payload hashes.
**Clean gate interval:** October 8, 2026 UTC, `06:04:27.617Z`–`06:20:29.113Z`.

## Implementation authority and position

The owner authorized the complete roadmap and subsequently directed implementation **one item at a time**. That authority continues. This candidate stays within the next native Audio item; the whole roadmap remains unfinished. The preserved alpha.6 candidate, its measured results and its six earlier workflows are not retroactively changed by this work. Release promotion, hardware acceptance, external publication or a real-value launch are not implied.

Audio interchange/workshop and deferred A6 listening remain open acceptance work. The separate independent HonkeyPong/FamiTone2 input checkpoint has now supplied a source-backed driver profile for a bounded native investigation implementation. The scope is useful **partial Alpha A3**, not completion of general audio recovery or faithful canonical conversion.

## Current native profile and editing boundary

The candidate adds one linked **FamiTone2 v1.11 profile** for statically mapped iNES NROM with 16/32 KiB PRG, CHR RAM or one 8 KiB CHR ROM bank, and an optional trainer (41,488-byte maximum). Recognition validates instruction/data structure and pointer mapping; source SHA-256 is evidence identity, not a game allowlist. Renamed and appropriately relocated supported inputs must remain supported, while unmatched or ambiguous structures remain explicit outcomes with general inspection available.

The implementation decodes bounded native music headers and streams, referenced instruments/envelopes, source ranges and the statically established subset of SFX IDs/streams. A known SFX subset is not an assertion of the engine's complete dynamically selected inventory. Native timer codes, accumulator timing, frame envelopes, shared byte uses and conversion limits remain visible evidence.

The editable result is an **isolated copy of the original ROM**. Supported one-byte native music note/cut and existing-instrument commands can be changed without relocating data. Each edit is redecoded, supports native-session Undo/Redo, and can be exported as a native ROM copy with a source/changes/evidence report. This is not reconstruction or recompilation of the game's entire source. It is not an external source-workspace build or an automatic emulator change. Starting another native analysis clears the native edit session, so export first.

**Canonical AUDIO import is unimplemented.** Native analysis does not create Forge tracker patterns, replace the active project or modify the loaded emulator. Native ROM exports are the durable edited artifact; ordinary Save Project As does not save this isolated edit history, and an evidence report is not an importable Forge project. DPCM recovery/edits, SFX byte editing, native control-flow/stream-length changes, arbitrary driver variants and automatic game-wide scene/collision recovery are outside this profile.

## Independent source input

The independent control is the MIT-licensed third-party **HonkeyPong**, upstream commit `f9ab7ad450ffebabec15623aa811a7564f079168`, with the retained public-domain FamiTone driver notice and source-backed reproduction record. The 24,592-byte mapper 0 ROM SHA-256 is `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`.

Its upstream game, driver and score remain the reference. Separately identified host-converter compatibility changes belong to the reproduced-input checkpoint. Original-ROM music/SFX calls and logical APU observations established this input before the decoder. Recognition must not depend on this filename, whole-ROM hash or fixed code/data addresses.

## Verification and manual acceptance

The complete fresh clean-extraction gate passed **1191/1191 cases across 55 suites**, with **zero failures**, for the unchanged frozen HTML above. It retains **1126/1126 alpha.6 cases across all 53 prior suites** and adds **52 native profile/runtime cases plus 13 native UI cases**. Focused development runs are not used as a substitute for this complete result.

All **six browser runners were blocked before any checks ran**: mobile play, general RE analysis, RE runtime, Audio adaptive UI, the retained roadmap workflows and native Audio. These are six explicit blocked records, not browser passes. The full gate, source provenance and browser records belong to this candidate's packaged evidence.

The logical native-ROM comparison exercised **180 natural gameplay/title frames per ROM**, with **2,462 APU writes each**. A supported native music edit changed **one ROM byte** while keeping the driver intact. **Nineteen Pulse 1 timer-low writes changed as expected (timer 569 → 537), at the same frames; every other APU value and frame in the tested window stayed identical.** The modified control ROM SHA-256 is `4f47f0c0192490d18f0e17a502f4f9abcdae5c5f7c52d468d33298c6e7d3db33`. This is bounded executable/register evidence; it does not establish listening quality, every in-game path, physical hardware behavior or canonical tracker conversion.

The source branch is `implementation/native-audio-2026-10-08`, based on preserved alpha.6 commit `bcd97d740faaf206ec1e6265c5719d18e64e4ff7`. Prior candidate identities and evidence remain attached to their own history.


Human review must verify the visible analysis/edit/export path; native note change and Undo/Redo; unchanged project and emulator; exported ROM reload and sound behavior; unknown/refused inputs; mobile keyboard/focus and cancellation. Automated logical APU output does not establish speaker quality or phone latency. USB-C/Bluetooth controllers, physical NES behavior, the Cricket Dream 5G / Chrome performance comparison and complete alpha.7 manual/PDF coverage remain separately open.

## Next same-item Audio work

Complete owner listening and device review, then define and implement a faithful canonical AUDIO conversion subset. Preserve explicit unknown/refusal outcomes where native fixed-point timing, frame-based envelopes, pitch/noise semantics, DPCM or multi-channel native SFX cannot be represented. Conversion needs canonical edit/Undo/save/reopen/rebuild and independent audible evidence; native ROM patching alone does not meet that acceptance gate. Broader driver coverage and the remaining roadmap follow their declared dependencies.

## Current capability changes relative to alpha.6

| Area | Alpha.7 native investigation scope | Still open |
| --- | --- | --- |
| Alpha A3 independent native Audio | Structural decoder, original-byte evidence, same-layout native music command edits, native Undo/Redo and ROM/evidence export | Canonical tracker conversion/persistence, listening, additional drivers and complete A3 acceptance |
| Alpha A0 / 2.2 method/evidence foundations | A declared independent driver profile with validated mapping and unsupported/ambiguous outcomes | General method breadth and every unknown engine remain open |
| Earlier alpha.6 workflows | Retained, subject to the new full gate | Prior browser/listening/hardware/manual acceptance is not transferred automatically |
| Later gameplay, linker/raster/LiveLink, migration, Hosted Worlds/wallet and deck areas | No completion claim added by this native Audio slice | The detailed alpha.6 ledger and full roadmap requirements below remain in force |

---

## Preserved alpha.6 checkpoint and complete prior history

The following saved alpha.6 revision is retained verbatim. Its identities and measured results belong to alpha.6. The native Audio scope above has its own measured evidence; nothing below is relabeled as an alpha.7 pass.


**Current revision:** October 8, 2026 UTC — Roadmap Workbench implementation checkpoint.
**Active candidate:** **2.0.0-alpha.6 / roadmap-1**, schema **12**, **not promoted**.
**Frozen HTML SHA-256:** `ea16ded043216063572f5ba708e4efeea2f1f84d6a594b0393a8a5e1711783f9`.
**Candidate ZIP SHA-256:** `9ca9df396e5b4b35254e29566f9976cb95b095f28a6c6937370c0fb104724d37` (1,602 files; 1,601 payload checksums).

The complete roadmap remains unfinished. This update records working, bounded implementations and their measured evidence. It does not turn prepared later work into accepted milestones.

## Current authority and review order

The owner explicitly authorized **“Implement the roadmap completely”** and subsequently directed work **one item at a time**. Full implementation authorization remains active; integration and review proceed in dependency order with **Audio first**, followed by reusable native Audio recovery and the remaining roadmap. Earlier entries restricting implementation to their then-current slice are preserved historical decisions, superseded for implementation by this authorization. Neither the authorization nor this checkpoint implies release promotion, external publication, hardware acceptance or a real-value launch.

Independently prepared graphics, runtime investigation, Behavior, source migration and local-host drafts are available for bounded review. They do not waive the finite Audio/RE acceptance gate or reorder acceptance of integrated Hosted Worlds and wallet/deck capabilities.

## Measured evidence for these exact bytes

- **1126/1126 cases across 53 suites passed**, with zero failures, on a fresh clean extraction of unchanged alpha.6 candidate bytes.
- This retains **990/990 alpha.5 cases across all 45 suites**, plus **136 cases in eight additional suites**. Historical references and their preservation checks remain mandatory.
- **Five browser runners were blocked with zero checks run**: mobile play, general RE analysis, RE runtime, Audio adaptive UI and the new roadmap workflows. A blocked launch is not a browser pass.
- Alpha.5 owner-reported A1–A5 success remains evidence for that earlier candidate. Deferred **A6 listening**, alpha.6 browser/mobile/device behavior, the Cricket Dream 5G / Chrome A/V comparison, USB-C/Bluetooth controllers and physical NES acceptance remain open.
- The fresh packaged `test-results/candidate/Summary.json`, matching source provenance and browser reports are the evidence. A changed HTML needs new evidence.

## Implemented workflows in this candidate

1. **Audio:** MIDI/MusicXML score export and bounded reimport, plus an in-app workshop example chooser. Native JSON remains the full project backup; score interchange does not preserve NES timbre/envelopes, SFX bindings or gameplay.
2. **Native graphics:** a versioned method/evidence registry and generic physical CHR ROM decode/import/edit/export. Generated grayscale tile sheets are explicit conversions, not recovered scenes. Palettes, bank visibility, maps/collision, CHR RAM and compressed resource semantics remain unknown without a suitable method.
3. **Runtime investigation:** named complete machine checkpoints, bounded scripted inputs and reversible RAM experiments, including service-level protection of active rollback checkpoints. This does not infer health, enemies or stages.
4. **Behavior UX:** a graph over the existing canonical typed state/transition records, with diagnostics and reference navigation. No new runtime operations, templates, memory budget or schema are implied.
5. **Source migration:** an isolated, byte-preserving multi-file Forge-6502/NROM workspace, literal includes/incbin, native text editing, source/JSON/ZIP/ROM exports and actual preprocessing maps/symbols. Foreign dialect translation and generated-gameplay/Audio Runtime hooks remain absent.
6. **Local hosted reference:** a separate loopback ordinary-item authority draft with durable receipts, item races, issuer policy and offline backup/restore. It is not connected to cartridge execution and contains no wallet or financial-loot mechanism.

## Audio next step and independent input checkpoint

Begin review with **Audio workshop examples** and **Export Score Data**. Complete supported author/import/edit/export/reimport/build/listen/save/reopen, including prior A6 and independent-emulator listening. Preserve project data and state conversion omissions explicitly. The new review checklist is `NES_Forge_Alpha6_Review_Checklist.txt`; the brief measured handoff is `NES_Forge_Alpha6_Progress.txt`.

The missing independent Audio input is now materially advanced: **HonkeyPong**, an existing MIT-licensed third-party game using FamiTone2, has a separately preserved source-backed reproduction and runtime checkpoint. The 24,592-byte ROM SHA-256 is `cce7bf2f71eb9e63de0dba15098679dde06a1da9d7553f2319aa60ea57a1193b`. Its unmodified upstream game/driver/score sources were retained; a separately identified host-converter compatibility patch is documented. Build and runtime reports verify reproduction, natural music/SFX calls and logical APU activity.

This checkpoint does **not** implement Forge native Audio recovery or establish sound fidelity. A reusable FamiTone2-compatible structural decoder is **underway separately and is not in frozen alpha.6**. Recognition must use validated structures and mapping, not a filename, whole-ROM hash or fixed addresses. Timers, frame-based envelopes, fixed-point tempo, changing speeds and multi-channel native SFX require explicit fidelity decisions and refusal of unrepresentable conversion. The next bounded result needs original-byte evidence, independent source validation, supported canonical conversion, edited save/reopen/rebuild evidence and human listening. A new decoder changes the executable and must receive its own candidate hash and complete gate.

## Remaining acceptance and documentation boundaries

The full manual/PDF editions have not been comprehensively updated for alpha.6; the new guide/checklist supplement them. Hardware controller tests, phone listening/performance, target-browser usability, physical deck work and external deployment/chain acceptance require actual environment evidence. The finite acceptance gate for later integrated systems is still open. “Unimplemented,” “draft,” “partial” and “not tested” remain distinct states.

## Current capability ledger

| Roadmap area | Status in this candidate | Remaining work / evidence |
|---|---|---|
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
| Alpha A0 / 2.2 recovery contracts and methods | Physical-source method registry and provenance implemented | More drivers/domains, signatures, decoders, encoders and independent validation |
| Alpha A3 native Audio recovery | No new driver decoder in frozen alpha.6; verified independent HonkeyPong/FamiTone2 input checkpoint now available separately | Reusable structural decoding is underway outside this candidate; canonical conversion, edit/rebuild proof and listening remain required |
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


---

## Preserved prior revision and full historical requirements

The following October 7 revision is retained verbatim. Its then-current labels, limits, results and authorization statements apply to their historical artifacts; the October 8 update above controls the current implementation status. Nothing below is deleted or silently reassigned to alpha.6.

**Revision date:** 2026-10-07 (UTC), Audio adaptive editing review candidate
**Status:** Audio Adaptive Editing candidate **2.0.0-alpha.5 / audio-adaptive-1**, based on alpha.4. Basic phone keyboard entry was owner-reported successful on alpha.4. New layout/envelope changes require their own review; listening, mobile performance, hardware controllers and promotion remain pending.

## October 7 owner review and Audio workflow supplement

The owner reports completion of A1–A5 on alpha.5 and explicitly reports arpeggio and envelope editing working as expected. This is owner-reported checklist evidence; no device/OS/browser/keyboard versions or candidate hash were supplied with that result. A6 was not performed and is deferred at the owner's direction: “ok let's continue and we will circle back to that”. Audio listening, phone playback/performance, physical controllers and promotion remain pending.

A documentation/example supplement, `NES_Forge_2.0.0-alpha.5_Audio_Workshop.zip`, prepares the existing Audio workflow while A6 remains open. It includes the unchanged alpha.5 HTML, exact Open Project / Save Project As… / MIDI / MusicXML controls, two retained audio controls, an editable four-channel music/SFX project, and original four-note MIDI/MusicXML practice files. The accompanying `NES_Forge_2.0.0-alpha.5_Audio_Workshop.txt` provides the sequence. Open Project loads editable `.nesforge.json`; AUDIO score imports load `.mid` / uncompressed `.musicxml`; EMULATOR Load ROM plays `.nes`. Examples live in the package and have no in-app example chooser.

Five package-input scenarios verify canonical load/build, exact retained ROM reproduction, import/edit/persistence/undo and a limited bundled-emulator smoke. They are separate from the unchanged 990/990 release gate and do not establish speakers, native file pickers, browser layout or phone performance. No application source changed; this is not alpha.6, promotion, a full manual/PDF delivery, or authorization to start later milestones. Complete the listening/workflow gate before native audio-driver recovery.

## Active Audio adaptive editing candidate

Owner “ok, continue” authorizes the bounded Audio pilot following the source audit. Alpha.5 preserves alpha.4 direct native tracker entry and desktop mouse strokes; it adds responsive Audio panels, selected-cell scrolling on selection/viewport changes, and touch/pen painting on the original volume/arpeggio canvases. The previously missing device-width viewport declaration is added: it enables the existing narrow layouts across tabs and therefore requires cross-tab device review. Project schema and CPU/APU/PPU, compiler, import, capture and persistence sources remain unchanged.

All 964 alpha.4 cases across 44 suites plus the 26-case `audio-adaptive200` suite are mandatory, for 45 suites. Actual fresh results belong to `test-results/candidate/Summary.json`; browser rendering and physical-device outcomes stay separate. Source guards reconstruct the exact alpha.4 reference and then the older correction references; no historical oracle is regenerated.

Use `docs/AUDIO_ADAPTIVE_CHECKLIST.txt` and `docs/AUDIO_ADAPTIVE_GUIDE.md`. This is an Audio UI review candidate, not completion of the audio/listening workshop or the whole adaptive UI program. After review, complete supported author/import/edit/build/listen/save/reopen, then native audio-driver recovery. No promotion or later milestone implementation is authorized by this candidate.

## Preserved direct mobile keyboard correction

The owner rejected the separate native tracker/envelope forms: “I should be able to bring up the keyboard on mobile and enter the values like I do on PC”. D055 supersedes D054. Alpha.4 starts from alpha.2 and requests the phone keyboard when an ordinary tracker cell is tapped, using the same PC piano keys and canonical note-entry/undo/persistence path. There is no separate form, Apply action, automatic row advance or new envelope editor. Existing envelope painting remains unchanged.

Review `docs/MOBILE_KEYBOARD_CHECKLIST.txt`. Retain all 940 alpha.2 cases / 43 suites plus `mobile-keyboard200`, for 44 mandatory suites. Alpha.3's 18 form-specific cases are explicitly superseded and preserved as historical evidence. Actual fresh totals belong to the current Summary; earlier intermediate runs do not validate restored or changed files. VM events do not establish physical keyboard opening or phone layout. The alpha.2 gameplay/audio-performance comparison on Cricket Dream 5G / Chrome remains open.

This is phase 1 Audio usability/reliability work. On October 7 UTC, the owner reported ‘yeah it worked’ for direct phone keyboard entry. This closes only the basic reported interaction, not the entire checklist or the separate playback/performance review.

The bounded source audit is complete: see `NES_Forge_Adaptive_UI_Audit_2026-10-07.md`. It proposes an Audio pilot for tracker/panel layout, native keyboard visibility and touch/pen envelope strokes through existing canonical edits. The audit makes no production changes, supplies no new browser pass and does not authorize a rewrite. Complete the supported author/import/edit/build/listen/save/reopen workshop, then native audio-driver recovery; the six-phase order remains unchanged.

## Preserved mobile playback correction

The owner reports gameplay/audio lag on **Cricket Dream 5G + Chrome**, with desktop-browser playback satisfactory. The supplied recording shows irregular gameplay updates and PCM gaps; those are recorder measurements, not direct emulator FPS or proof of a device fault. The exact recorded application hash was not visible. The current alpha.1 source independently reproduced scheduler time discard under slower callbacks and substantial native capture allocation overhead.

The bounded alpha.2 correction preserves CPU/APU/PPU semantics, the existing audio queue, exact completed-frame captures and schema 12. Review `docs/MOBILE_PLAYBACK_CHECKLIST.txt`. All 921 retained cases / 42 suites plus the new mobile suite are mandatory; actual results belong to `test-results/candidate/Summary.json`. Browser and device evidence remain separately labeled. No claim of improved phone speed is made before the same-device comparison.

This preserved correction remains part of phase 1; the current entry correction is described above. The supported audio workflow/listening workshop and then native audio-driver recovery remain next; it does not reopen unrelated milestones or promote alpha.1.


## Preserved audio correction reference

**2.0.0-alpha.1 / audio-correction-1**, schema 12, corrects dense music/SFX event-stream advancement and triangle timer values. HTML SHA-256: `4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0`. The package requires all 895 retained checks and the new audio-correction regression suite across 42 suites; consult its measured `test-results/candidate/Summary.json` and clean-extraction proof for outcomes. Browser/listening/device evidence is separate. The review entry point is `docs/AUDIO_CORRECTION_CHECKLIST.txt`, with two editable audio examples. No promotion is claimed.

After the current bounded mobile correction review, continue the supported audio author/import/edit/build/listen/save/reopen workshop before another recovery adapter. The frozen starting reference below remains unchanged.

## Frozen starting reference

NES Forge is a functional NES authoring alpha with early 2.x reverse-engineering tools already integrated into the same standalone application. RE was deliberately brought forward. That sequencing change has not completed Gameplay Expansion, Behavior UX, the full resource linker, the raster model or comprehensive editable recovery.

| Item | Current evidence / status |
| --- | --- |
| Frozen application | **1.9.0 Alpha / re-runtime-1**, schema **12**; review candidate, not promoted. |
| Reference HTML | SHA-256 `e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d`. |
| Reference ZIP | SHA-256 `8cc66184914c21422b346bcbf60af19eb5da69046e13aeeea0aa9fa65037b0d0`; 1,009 payload checksums verified. |
| Automated evidence | **895/895 cases across 41 suites** on a clean extraction: 846 retained cases and 49 new runtime-investigation cases. |
| Owner/browser acceptance | The current **R1–R6** walkthrough remains pending. All three packaged browser runners recorded blocked launch with zero checks; device/controller and physical-console claims remain separate. |
| Earlier owner evidence | Tutorial steps 1–9, an independently emulated tutorial ROM, mobile touch, and prior T1–T6 analysis checks were reported successful on their respective earlier builds. Those results are retained without being reassigned to changed bytes. |
| Reference audio defects | Dense-pattern music-reader loop and triangle pitch mismatch, reproduced October 2. The preserved audio correction addresses both; the frozen reference remains unchanged. |
| Planning/source control | Local Git history, frozen reference tag, portable bundle and audio reproduction scripts prepared; remote destination remains unselected. |
| Sol Games v0.2 | Source reviewed for architectural fit on October 4. Separate prototype; no integration, live-chain validation or FCEUX execution performed in this consideration review. |

The frozen reference report remains attached to the earlier delivered package. Its application, source, hash and result are unchanged; the active candidate has separate reports and acceptance.

## Implemented capabilities and remaining gaps

| Capability | Position at this revision |
| --- | --- |
| Create/edit → build → play | Functional alpha over the existing World, Audio and Gameplay Core models. Mobile A/V lag and physical-controller evidence remain open. |
| General ROM analysis | Bounded independent byte inspection, explicit mappings, offline documented-NMOS-6502/NES-2A03 disassembly, search, CHR inspection and notes. Unknown engines and unsupported emulator mappers can retain static inspection. |
| Runtime investigation | Opt-in instruction coverage, before/after RAM comparisons, up to eight labeled RAM-write watches, PPU/APU write observations, verified physical source links and evidence exports. Requires a ROM the existing NES emulator can execute. |
| Execution navigation | Bounded frame history and backward/forward restoration; no automatic stage selection. |
| Editable recovery | One declared Native Room v1 / Bridge Room profile demonstrates graphics, room/collision and Pulse 1 melody conversion. It does not establish general engine recovery or preserve the original engine's behavior. |
| Further 2.x work | Native resource decoding for additional engines, richer debugger control, source migration, required linker/profile/raster foundations and controlled live editing remain incomplete. |

A/B RAM snapshots are observations, not restorable full-machine checkpoints. An observed PPU write identifies runtime storage and its writer; it does not establish the original compressed data format. APU writes are sound-chip commands, not recovered tracker songs. Analysis reports are not editable Forge projects.

## Execution roadmap

The sequence below is the current delivery order. Detailed numbered sections retain capability definitions and earlier decisions; they do not override this sequence. Dates identify decisions, not promised delivery deadlines. Complete one bounded candidate at a time, with a usable result and explicit evidence, before broadening its scope.

| Phase | Priority and deliverable | Completion evidence |
| --- | --- | --- |
| **1. Audio and alpha reliability** | **Active priority.** Retain the implemented dense-pattern and triangle-pitch corrections. Correct direct mobile tracker-keyboard entry, retain the pending phone review of scheduling/capture, then close supported four-channel authoring, imports, SFX, persistence and listening. | Focused failures become passing regressions, complete candidate gate, author/import → edit → build → audible playback → save/reopen workshop, Forge plus independent-emulator listening, and separately labeled device evidence. |
| **2. Reusable RE recovery** | **Next.** Recover supported native audio into canonical Audio, then graphics/maps/collision into editable Forge content. Build shared discovery/evidence/import interfaces and reusable format adapters. | Declared native records, preview/import, useful edit and rebuilt behavior. Unknown engines retain inspection. First graphics pipeline requires two unrelated independently authored engines beyond Forge/Bridge Room controls. No universal-recovery claim. |
| **3. Creator portability and review readiness** | **After audio; coordinate with bounded RE slices.** Prove a representative ASM migration through declared hooks, usable import/export, accurate manual/workshops and reviewer packaging. Select gameplay/behavior work from the preserved backlog only when needed. | A supported external source example builds and behaves as documented; native data and references survive save/reopen; a reviewer can reproduce the supported workflow from the supplied package. Full 1.9.1/1.9.2 completion is not required for every later slice. |
| **4. Hosted Worlds and ordinary items** | **After the finite audio/RE gate.** Define the host bridge and server-authoritative actions, persistent World state, stable item instances and inventory rules. Start without blockchain dependence. | Two clients interact with one item; conflicting pickup, retries, reconnect and server restart preserve one accepted outcome and consistent inventories. Each client's projected state stays within its declared NES runtime budgets. |
| **5. Optional wallet ownership and earned loot** | **After authoritative items.** Evaluate Sol Games components; add wallet authentication and test-network ownership/issuance. Separately prove mint/reconcile, then explicit opt-in loot-loss settlement. | A server-verified earned item maps to one eligible claim, can be held/reconciled and used after reconnect without duplication. Transfer authorization and combat authority remain separate. Any real-value launch requires its own accepted evidence and decision. |
| **6. Portable roles, then tech-deck hardware** | **Branches after accepted hosted foundations; may overlap phase 5.** Prove development-kit, client and server roles on existing hardware, including build/deploy from the device. Then choose custom hardware from measured requirements. | Reproducible install/build/deploy, declared capacity, backup/recovery and connectivity results. Wi-Fi/cellular and optional constrained mesh have separate tested profiles. Wallet launch, voice and large-match features are not prerequisites. |

Phase 3 does not create an indefinite tool-completeness gate: only the creator/runtime interfaces needed by a selected hosted slice are dependencies. Traditional netplay/rollback, richer gameplay, visual behavior graphs, voice, collaboration, universal decoder coverage and custom hardware remain distinct branches. Preserve them without letting them displace the active candidate.

Review of the existing R1–R6 candidate, device checks, source-control setup and documentation may continue alongside the active implementation. Local history is ready; a private GitHub destination, CI and eventual public-release materials are development infrastructure, not a reason to delay audio correction. Reuse the owner's completed tutorial evidence against its original build; do not require a new from-scratch general tutorial merely to begin audio work.

## Delivery and acceptance rules

1. **One active implementation candidate:** state its reference hash, concrete outcome, included changes and exit checks. Ideas are recorded for the relevant phase; they do not silently expand current work.
2. **Complete the workflow:** each feature connects input → edit/use → persistence/output → verification. An inspector, picture, register trace or mock-only pass cannot stand in for the claimed editable or audible result.
3. **Label evidence:** distinguish implemented, reproduced defect, verified, owner-accepted, blocked and planned. Keep automated results separate from browser, listening, controller and physical-console evidence.
4. **Preserve the reference:** isolate changes, retain provenance and protected behavior, package a reproducible candidate, and update the manual/checklist with the actual controls. Promotion follows acceptance of that candidate's stated scope.
5. **Keep support finite and extensible:** declare supported hardware/formats and unknowns. Neither a single-ROM demonstration nor a promise to understand every ROM is an adequate completion criterion.

**Active executable deliverable:** `2.0.0-alpha.5 / audio-adaptive-1`, bounded to Audio layout, selected-cell visibility and touch/pen strokes on existing envelopes while preserving direct native keyboard entry, with focused regressions and the full clean-extraction gate. Broader preview/import/mobile findings must be reproduced and scoped separately. The subsequent audio workflow candidate closes the listening/manual evidence.

## Version policy

Use **2.0 Alpha — RE development and required foundations** for subsequent RE development. The bounded audio-correction reference uses **2.0.0-alpha.1**; the mobile playback reference uses **2.0.0-alpha.2**; the withdrawn separate-form Audio entry follow-up uses **2.0.0-alpha.3**, the direct-keyboard replacement uses **2.0.0-alpha.4**, and the bounded adaptive Audio follow-up uses **2.0.0-alpha.5**. This label identifies an alpha review candidate; it does not imply completion of 2.0 or release promotion. Keep all existing 1.9.0 package names, candidate tags, hashes and evidence unchanged.

The numbered sections below are capability and dependency identifiers. They are not a requirement to finish every 1.9.x feature before continuing RE, and they are not a claim that a feature is complete because it appears in a 2.0 Alpha build. The 2.0.1–2.0.5 foundation work and 2.1–2.5 RE scope remain visible; the new Alpha track draws bounded work from those areas as needed. A version-label change alone does not require a project-schema change.

## Immediate audio priority and recovery sequence

**Latest owner direction, October 2:** audio comes first because development has moved between areas. Close the supported audio workflow and align it with the existing RE foundation before expanding graphics/map recovery. Preserve the 1.8 runtime and existing MIDI/MusicXML/SFX services; audit actual gaps rather than treating those capabilities as absent. Keep authored/imported/recovered audio in one canonical model. The 1.9.3 capability identifier remains useful, while integrated candidate versioning stays under the 2.0 Alpha policy above.

First establish audio preview/compiled-ROM correctness, repeatable author/import/edit/build/save/reopen behavior and listening evidence, including the reported mobile playback issue. Then extend reusable native audio-driver recovery with explicit supported scope. The detailed bounded sequence and acceptance checks are in `docs/NES_Forge_2.0_ALPHA_PLAN.md`. General ROM inspection and APU observations are available; they do not mean comprehensive audio RE is complete.

The focused October 2 audit identified two first correction targets in the frozen starting reference: a generated music-reader loop on an accepted dense 64-event pattern, reproduced against a 63-event control, and triangle pitch one octave below Studio preview because runtime uses pulse timer values. These findings supplement the historical passing suite; the preserved audio correction supplies the implementation and separate regression evidence. Reproduction evidence and the bounded correction criteria accompany the development plan.

The **runtime-investigation candidate** still needs its **`docs/RE_RUNTIME_CHECKLIST.txt`** review, which may overlap audio work. R1–R6 cover shared ROM identity, background initialization, a Pepsi mode change, credit-write provenance, positive audio observation on Bridge Room, and export/lifecycle behavior. Do not require the Pepsi program to contain stages, damage, enemies, collision or music that its investigation did not identify.

**Owner scope clarification, October 2:** RE is intended for user-supplied ROMs across engines. Pepsi is one test case and must not become the basis of a one-ROM recovery feature. The shared discovery, evidence, resource, preview and import interfaces must remain independent of game identity. Reusable format/engine/driver adapters extend them; unknown engines retain inspection and annotation. No filename or whole-ROM hash allowlist may substitute for interpreting and validating a declared format.

Recovery milestones must produce editable canonical content from documented native representations through that shared pipeline. Native audio now precedes additional graphics/maps: select an independent driver with actual music/SFX data and retain Bridge Room as a control. A first driver establishes only its declared subset. When graphics recovery resumes, require at least two independently authored ROMs from unrelated engines beyond Forge/Bridge Room controls before accepting that pipeline. Pepsi may be one graphics input. Record each corpus, hashes, mapping, supported records, unknowns and expected behavioral adaptations before claiming decoder acceptance. Include valid-data modifications, false-positive recognition and unknown-engine fallback checks so identity matching cannot masquerade as format support.

Acceptance requires an explicit preview/import boundary, useful edits inside Forge, native-project save/reopen, a rebuilt ROM and a comparison against the original for the declared supported behavior. Broad analysis across NES ROMs and supported raw 6502 inputs, alongside progressively wider native-resource recovery, remains the direction. Automatic editable recovery depends on verified format support; execution and rebuild also depend on hardware/runtime support. Static analysis remains available where execution or editable recovery is unsupported.

**Standing limits:** NES/Famicom remains the authored game target; broader raw-6502 inspection does not provide other machines' emulation. Preserve schema 12 unless a separately justified compatibility decision requires otherwise, the five templates, 12-actor/64-persistent-byte limits, Door Option B, one-way synchronization and the protected editor/build/emulator/capture/Save As/CHR/undo behavior. Existing historical decisions remain below and in the dated history appendix.

---

# 1. Product vision

NES Forge is an **8-bit NES / 6502-class game-development, runtime, reverse-engineering, and hosted-world environment**.

Its purpose is to let developers:

- create original NES games from scratch;
- author CHR, metatiles, Worlds, sprites/metasprites, animation, gameplay, audio, and runtime behavior;
- compile those projects into real NES-compatible ROMs;
- run, inspect, debug, and eventually live-edit those ROMs;
- reverse engineer user-supplied NES ROMs into canonical NES Forge concepts;
- accumulate reusable knowledge about historical NES development methods;
- eventually connect NES games into multiplayer and persistent Hosted Worlds;
- let developers define server inventories, earned items, optional wallet ownership and explicit loot-loss rules;
- eventually develop, build, deploy, play and host from a portable tech deck.

The game target remains intentionally constrained to the NES class of hardware and presentation.

## Accessible NES/6502 developer tools

Owner direction, September 30: aim to provide the tools the NES/6502 developer community needs, including capabilities developers struggle to access because of cost, fragmented workflows or stalled development. This is a product objective, not a claim that every competing tool is paid or incomplete, or that Forge already provides every capability.

Evaluate the complete workflow: graphics and World creation; assembler/build/link/export paths; audio composition and interchange; bank-aware disassembly; breakpoints/watchpoints; CPU/PPU/APU inspection; tracing/coverage/profiling; asset and audio recovery; controlled live editing; reproducible examples and extensibility. Map each request to an existing capability, a verified gap or a separately scoped proposal. Broad community interest does not expand the game target beyond NES/8-bit/6502.

Use actual developer interviews, issue reports and reproducible examples to prioritize gaps. Track requested behavior, available alternatives, access/licensing barriers, effort/dependencies and acceptance evidence. Favor portable projects, documented formats, usable export and reproducible builds so developers can retain their work. Affordability and access are design requirements; final licensing, source-publication policy and pricing remain explicit owner decisions, not implicit commitments in this revision.

## Source migration and scripting — September 30 recommendation

The owner identified custom ASM, Lua and other scripts as important for developers moving from NESmaker and other tools. Treat source portability as a first-class product requirement alongside RE. When original source is supplied, preserve its comments, labels, files and dependencies directly. ROM inspection and source migration have different inputs and acceptance criteria.

**Recommended separately scoped authoring priority after audio closeout: bounded ASM intake and integration coordinated with continued RE development.** This records the requirement and proposed sequence; no NESmaker adapter, Lua runtime or universal script-import capability has been implemented by this update.

The current Forge source already contains a custom 6502 assembler and custom NROM build path. That is a foundation, not established compatibility with third-party engines or assembler dialects. Its assembler consumes one source text, explicitly rejects `.incbin`, and does not implement a general multi-file include workflow. The current build service rejects custom ASM combined with Audio Runtime or generated single-room gameplay. Migration must resolve those integration contracts without silently changing existing build behavior.

1. **ASM source intake:** Preserve user-supplied `.asm`, includes, macros, binary assets and folder structure. Ask for or confirm the assembler dialect and source engine/module version. Produce an actionable dependency report for unresolved symbols, unsupported directives, external engine routines and declared resource needs; do not silently rewrite unknown code.
2. **Bounded executable integration:** Define supported entry points, inputs/outputs, register/flag clobbers, engine hooks, bank placement, RAM/zero-page allocation and timing assumptions. Initially validate one independently testable gameplay routine in a Forge-built ROM. Detectable overlap checks and declared budgets do not prove arbitrary imported code has no other memory effects.
3. **NESmaker profiles:** Select a named engine/module version using real developer-provided examples. Implement adapters for proven hooks and dependencies, and report compatible / requires adaptation / unsupported with reasons. File acceptance alone is not successful migration.
4. **Lua host tooling:** Add a separately scoped runtime for emulator/debugger automation, memory inspection, overlays and test scripts. Choose a named API compatibility profile. FCEUX documents emulator-specific APIs; supporting Lua syntax alone does not establish FCEUX script compatibility. Host scripts do not automatically become cartridge-resident gameplay code.
5. **Other languages/toolchains:** Add explicit adapters based on demonstrated user needs and reproducible samples. Preserve separate identities for editable source, ROM inspection evidence and host scripts. Avoid a universal-import promise.

**First migration acceptance case:** take one representative user-owned custom script plus its includes/macros/assets and source engine/version, preserve the original files, report its dependencies, adapt it through a documented supported hook, build a ROM and demonstrate the expected behavior in an external emulator. Check the same behavior in Forge and preserve existing project/build regression coverage. Under the current priority decision, implementation follows audio closeout and can then proceed alongside bounded RE slices without waiting for full RE, hosted Worlds or wallet work. Unsupported integration combinations remain explicit until their own contracts are implemented.

Reference checks: [NESmaker official downloads](https://www.thenew8bitheroes.com/downloads) discusses custom scripts, engine routines and customized modules; [ca65 documentation](https://cc65.github.io/doc/ca65.html) documents dialect/include/symbol/segment features; [FCEUX Lua API introduction](https://fceux.com/web/help/LuaGettingStarted.html) explains emulator-specific functions. These references inform the proposal and do not certify any Forge compatibility.

## Source control and community sequence

RE integration has begun. The private local Git reference, exact re-runtime-1 package, immutable reference tag and portable bundle are prepared. Current planning occupies a separate directory on the main development branch. Connect a private GitHub remote once the owner/account and destination are selected. Keep the standalone HTML deliverable; source control supports its development.

Preserve the exact source, build/test commands, frozen references and release evidence; complete remote setup, regression CI and an issue backlog organized by accepted scope. Select the owner/organization and repository name before remote creation. Review what belongs in source versus release assets and exclude credentials and unrelated user files.

Public community access is a later publication decision with an explicit license, contribution guide, issue templates, supported-scope documentation and reproducible starter workflows. Check distribution rights for bundled dependencies and ROM fixtures before public publication. Private repository setup does not commit to a paid service, particular license or immediate public launch. The October 2 handoff established local version history; subsequent planning revisions preserve it. No GitHub remote or public publication is claimed; the accompanying source-control handoff records the actual local commit/tag and verification results.

---

# 2. Hard platform-scope rule

## NES Forge stays NES

NES Forge targets:

- Nintendo Entertainment System / Famicom-class runtime behavior;
- 8-bit game presentation;
- Ricoh 2A03 / 2A07 6502-derived CPU semantics;
- NES PPU graphics concepts;
- CHR / tiles / metatiles;
- NES sprites / metasprites;
- NES palette limitations;
- NES APU-style audio;
- NES-compatible mapper/runtime architectures;
- NES-style controller/input concepts;
- generated 6502-class game logic.

Modern host infrastructure may be used for:

- development tooling;
- build services;
- multiplayer transport;
- Hosted World persistence;
- matchmaking;
- account/session services;
- collaboration;
- voice/text communication;
- reverse-engineering analysis;
- Method Registry / knowledge sharing;
- testing and automation;
- wallet authentication, item issuance and ownership settlement;
- portable server/client/development hosts and deployment management;
- internet and optional constrained-mesh transport adapters.

However, those services **must not change the canonical game target into a modern engine, 3D engine, 16-bit runtime, or non-NES presentation model**.

## Explicitly out of product scope

NES Forge must not drift into:

- 3D game engines;
- modern GPU/scene-graph runtimes;
- 16-bit console output;
- SNES/65C816 runtime assumptions;
- Unity/Unreal-style client runtimes;
- “NES-looking” games that are actually modern native games under the hood.

If a future 16-bit environment is ever created, it should be a **separate product/environment** such as a future “SNES Forge,” with its own architecture, hardware model, compiler, runtime, and compatibility contract.

NES Forge itself remains 8-bit NES / 6502-class.

---

# 3. Core architecture model

NES Forge follows a **domain-oriented modular-monolith architecture**.

Major problem areas are treated as domains / bounded contexts with explicit ownership.

Current and future domains include:

- CHR / Graphics
- Metatiles
- World
- Metasprites
- Animation
- Gameplay
- Audio
- Raster / time-dependent rendering behavior
- Reverse Engineering
- Method Registry / Knowledge Base
- Hosted Session / Networking
- Hosted World persistence
- Inventory / Crafting / Economy
- Wallet / Asset Ownership integration
- Deployment / Portable Host
- Social / Voice
- Collaboration

Each domain owns its:

- canonical data model;
- validation;
- authoring behavior;
- compilation semantics;
- domain-specific tests.

Cross-domain interaction should occur through:

- stable IDs;
- typed references;
- declared dependencies;
- versioned contracts;
- events;
- explicit adapters/conversion bridges.

No domain should depend directly on another domain's private implementation.

---

# 4. Lifecycle and capability-path rules

## Domains own concepts

Example:

- Audio owns Songs/SFX/Instrument semantics.
- World owns Rooms/Entrances/Map structure.
- Gameplay owns Actors/Behaviors/Persistence semantics.
- RE owns evidence/provenance and decoding.
- Networking owns transport/session synchronization.

## Object lifecycles must be explicit

Example Actor lifecycle:

Actor Definition
→ Actor Instance
→ compiled runtime representation
→ Runtime Actor
→ transient runtime state
→ explicit persistent Room/World state
→ despawn/reconstruction

## End-to-end capability paths matter

A feature is not complete merely because an editor exists.

Example Audio capability path:

MusicXML / MIDI / manual authoring
→ NES Forge Audio
→ validation
→ AudioCompiler
→ ROM
→ NES APU runtime
→ reimport / inspection

Example World capability path:

CHR
→ Metatile
→ World placement
→ BuildGraph
→ compiled resource
→ runtime traversal/collision
→ ROM reimport

## Vertical slices prove paths

A vertical slice may span multiple domains and infrastructure layers, but must not erase domain ownership boundaries.

---

# 5. Standing architecture principles

1. **Preserve verified behavior first; simplify architecture second.**
2. **Interesting ideas are not authorization.**
3. **Do not advance later milestones automatically.**
4. **Unknown/unsupported behavior must not be silently approximated.**
5. **Forward authoring and reverse engineering converge on the same canonical NES Forge representations.**
6. **Canonical representations must eventually cover static assets and time-dependent NES behavior.**
7. **Prefer capability-based canonical abstractions over hard-coded role-specific implementations.**
8. **RE may map concrete ROM techniques upward into canonical abstractions, but must preserve implementation provenance.**
9. **Major canonical objects should have explicit supported lifecycles and end-to-end capability paths.**
10. **Cross-domain dependencies should be explicit and acyclic wherever practical.**
11. **BuildGraph coordinates dependencies; it does not own domain semantics.**
12. **Modern hosting/networking infrastructure may extend the NES experience but must not replace the NES runtime target.**

---

# 6. Current milestone status

## Product maturity — Functional alpha

NES Forge has a working create/edit → build NES ROM → run/test workflow. The owner reported a successful mobile-browser demonstration on September 28. That is useful qualitative feedback, not a substitute for a recorded device/browser acceptance matrix.

The active correction candidate is **NES Forge 2.0.0-alpha.5 / audio-adaptive-1**, pending acceptance of its bounded scope. **1.9.0 Alpha / re-runtime-1** remains the frozen predecessor. Subsequent RE development uses the **2.0 Alpha** track defined above. Earlier mobile-play builds remain dated comparison references. These labels do not promote a release or establish beta readiness.

Beta readiness should be judged by reliable, repeatable create → build → play → save → reopen workflows for new users, completion of the intended beta feature scope, accurate instructions, and documented coverage on supported browsers. Neither the alpha label nor a version increment automatically satisfies those criteria.

Application acceptance, documentation delivery, and independent NES hardware evidence remain separate status tracks.

---

## 1.7 — World Runtime
Completed baseline / closeout.

Established:

- executable World data;
- multi-screen traversal;
- World transitions;
- collision;
- player runtime;
- generated 6502 World runtime;
- editable ROM/project round-trip.

Screen-transition behavior is current. Smooth scrolling is deferred to future runtime profiles.

---

## 1.8 — Audio Runtime
Accepted baseline before 1.9.

Established:

- runtime NES music;
- runtime SFX;
- animation `sound` events;
- Pulse 1 / Pulse 2 / Triangle / Noise playback;
- MIDI import;
- MusicXML import.

### Audio interchange policy

**NES Forge Audio remains canonical.**

**MusicXML is the preferred notation-level interchange format.**

MIDI remains supported as a performance/event interchange format.

Future RE audio decoding should produce:

ROM audio
→ NES Forge Audio
→ MusicXML / MIDI / native editable project representation

NES-specific implementation details that MusicXML cannot preserve losslessly remain in native NES Forge Audio.

---

# 7. 1.9 — General Gameplay Systems

Goal:

> Turn the current playable World runtime into a generalized visual NES gameplay system.

Do not grow a privileged Player/Target model into a catalog of hard-coded roles.

Use:

- Actor Definitions;
- Actor Instances;
- Runtime Actors;
- explicit persistent state records;
- typed components;
- canonical state-table behaviors;
- capability composition.

## 1.9.0 — Gameplay Core

Current status:
**Functional alpha. The frozen re-runtime-1 predecessor introduced early 2.x analysis and runtime-investigation tools, retained by the active mobile-keyboard candidate. R1–R6 and browser/device closeout remain separately pending.**

Current evidence:

- Frozen predecessor: **re-runtime-1**, HTML SHA-256 `e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d`; **895/895 cases across 41 suites** passed on a clean extraction. Browser launch was blocked with zero checks; use `docs/RE_RUNTIME_CHECKLIST.txt` for current manual review.
- Historical presentation follow-up: **mobile-play-2**, SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`; read its packaged current test report for measured totals and its review note for remaining device checks.
- Prior comparison application: **1.9.0 Alpha / mobile-play-1**, SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`; September 28 clean-extraction suite **702/702 cases across 28 suites**. These results are retained evidence, not certification of new application bytes.
- Historical corrected reference: SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; September 17 clean-extraction audit **658/658 cases across 26 suites**, zero failures or skips.
- The corrected reference addressed reachable destination-World actors, invalid component-value emission, disabled Behavior execution, and opposite-edge overlap. The current audio-correction candidate retains that gameplay correction coverage.
- Native-browser layout/input, project lifecycle, file dialogs, and audible output still need documented closeout. The owner's mobile demonstration does not close that full checklist.
- Expanded printable documentation was completed September 30; revision 2 incorporates the owner walkthrough findings. Documentation completion is separate from application acceptance.
- Independent NES hardware timing/compatibility remains unverified. This roadmap update does not introduce a new physical-console acceptance gate.

Keep schema 12, the five-template limit, the 12-executable-actor plan limit, and the 64-persistent-byte limit. Retain the documented single-room partial editable recovery and one-way `syncActiveFromPersistent` contract. Native JSON/ZIP remains the complete project-backup path; generated-ROM recovery depends on its profile.

The September 24 audit correction withdrew the duplicate-`metaStats` finding; it is not an outstanding defect. Generic actor canvas placement and a generic animation/metasprite bridge remain proposals outside the approved 1.9.0 core and outside the mobile-play follow-up.

Approved core:

- Actor Definitions;
- Actor Instances;
- ephemeral Runtime Actor identity;
- typed components;
- typed parameters;
- canonical state-table behaviors;
- deterministic transition evaluation;
- explicit Room/World variables;
- legacy Player compatibility binding;
- table-oriented authoring;
- single-room + World integration;
- schema 12.

Exactly five templates:

1. Sideview Player
2. Ground Patrol Enemy
3. Stationary Contact Hazard
4. Collectible Pickup
5. Switch + Door

### Switch + Door policy

The 1.9.0 Door is an **alpha gameplay template** proving:

- stable identity;
- persistent linked state;
- switch control;
- active/inactive behavior;
- visual state.

It is **not yet a finalized traversal/collision contract**.

Physical blocking and richer configurable Door effects are deferred to 1.9.1.

This preserves abstraction so future Doors may support:

- solid-until-open;
- key locks;
- timed opening;
- destructibility;
- damage barriers;
- one-way traversal;
- room transitions;
- collision-group filtering;
- other NES-appropriate behaviors.

---

## 1.9.0 alpha follow-up — Mobile Play & Controller Support

**Historical implementation authority:** September 28 authorized the bounded Mobile Play follow-up (D046). Its original `mobile-play-1` result was 702/702; later candidates inherited and extended that work. The active mobile-keyboard-1 candidate inherits those capabilities; re-runtime-1 is its frozen predecessor. Device/browser and physical-controller closeout remain open and must identify the tested candidate. See the current-position record above and the candidate-specific `CURRENT_BASELINE.md`.

**Purpose:** let someone open NES Forge on a phone, run a built or loaded ROM, and control it immediately. This lives inside the **Emulator tab**. The manual and workshop explain and exercise it; they are not a separate emulator environment.

### Delivery order

1. Touch controls plus an expanded Play view and native-fullscreen support where available.
2. One-player physical-controller support through the browser Gamepad API, with controller status and basic remapping.
3. Device/browser verification, desktop regression checks, instructions, and a reviewable candidate package.

### Bounded feature scope

- Retain desktop keyboard controls. Map keyboard, touch, and one selected gamepad to the same NES A/B/Select/Start/directional input semantics.
- Provide touch D-pad, B/A, Select, and Start controls with simultaneous movement/action and A+B input. Track fingers independently, allow D-pad sliding, and release canceled or lost touches. Prevent page scrolling only over the play controls.
- Support compatible USB-C/wired and Bluetooth gamepads recognized by the device's operating system and browser. Pairing stays in OS settings; NES Forge reads the Gamepad API. Show connection state, a press-a-button detection prompt, standard mappings, and basic remapping. Publish tested combinations rather than promising every device.
- Expand the existing emulator canvas and controls together. Request native fullscreen from an explicit user action when available; use a viewport-filling Play view when unavailable or denied. The fallback may retain browser chrome and must not be described as true fullscreen.
- Fit portrait and landscape layouts, preserve aspect ratio and the 256×240 canvas backing size, respect screen safe areas, and keep Pause, Sound, and Exit/Return to editor reachable. Fullscreen and orientation lock must not be prerequisites for play.
- Preserve the loaded/running ROM and project when entering or leaving Play view. Apply the same controls to Build & Run, loaded ROMs, and Run Original ROM.
- Suspend/release input on focus loss, hidden documents, modal interruption, leaving play mode, reset, ROM replacement, and controller disconnection. Clear sources independently and require release to neutral before accepting held controller input after an interruption. Do not let polling recreate stuck input.

### Architecture and scope boundary

Use a small local host input/presentation layer for one NES controller port and a narrowly scoped connection to the existing controller reader. Physical-controller support is part of the deliverable; using it is optional for the player. Keep the existing simulation loop, controller latch semantics, CPU/PPU/APU behavior, and capture pipeline. Do not create a second emulator loop or replace the canvas used by capture.

This follow-up does not add templates, change schema or generated-ROM semantics, expand the compiler/mapper/raster/audio runtime, activate LiveLink, or start RE, multiplayer assignment, recording/replay, emulator snapshots, Hosted Worlds, controller-driven editor navigation, or a general mobile editor redesign. Preserve Save As, CHR rendering, undo, and legacy compatibility. Any intended input-hook changes must be explicit in the implementation review; protected-source checks must not be broadly disabled.

### Acceptance evidence

- Verify equivalent NES button states from keyboard, touch, and gamepad; simultaneous inputs; stick dead zones; and a documented opposite-direction policy.
- Verify no stuck input after canceled touches, app switching, focus loss, pause/resume, reset, ROM replacement, controller disconnect/reconnect, or leaving the Emulator tab. Verify controller selection remains correct if a disconnected device's index is reused.
- Verify Play/fullscreen entry, denial/fallback, rotation, and exit without ROM restart, project loss, distorted output, missing controls, or duplicate animation loops.
- Record real-device touch/play/audio results for iPhone Safari and Android Chrome, in portrait and landscape, including interruption/resume. Record actual controller model, connection type, OS, and browser for wired and Bluetooth tests. Untested combinations remain unverified.
- Preserve desktop keyboard, Build & Run/Run Original, screenshot/runtime capture, and generated-ROM output. Run the inherited full clean-extraction gate plus focused input/presentation regressions on the changed candidate; historical 658/658 evidence cannot certify new bytes.
- Package the exact candidate, hashes, changes, automated results, device observations, and remaining limitations for owner acceptance.

Native fullscreen availability must be detected at runtime. Current platform references for implementation planning: [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API), [Fullscreen API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), and [WebKit's iPhone fullscreen issue](https://bugs.webkit.org/show_bug.cgi?id=206854). These references inform the fallback; they do not replace tests of the delivered build.

### Parallel documentation and closeout

The September 30 manual, tutorial and operator-reference PDFs have been rendered and visually checked; the revised review kit has been packaged and saved. Keep those documentation results separate from browser/owner application acceptance. Further UI or control changes must update the corresponding instructions. The kit contains a dated roadmap snapshot; this standalone roadmap is the current planning authority and will be incorporated in the next kit revision.

The workshop remains a documented learning path carried out inside the normal NES Forge environment. Embedding a new workshop interface or wizard is outside this follow-up.

---

## 1.9.1 — Gameplay Expansion

Requires separate authorization.

Planned:

- Projectile;
- Moving Platform;
- Checkpoint;
- NPC/basic dialogue interaction;
- ladders;
- one-way platforms;
- richer hitbox/hurtbox combat;
- richer traversal;
- typed gameplay/animation events;
- configurable Door/traversal behavior.

### Checkpoint policy

In-session only at first.

No battery-backed save implication.

### Dialogue policy

Minimal bounded interaction/display/reference behavior first.

No branching dialogue language/system unless separately authorized.

### Projectile policy

Minimum source/self-hit/collision-group semantics only.

No faction/team/reputation system unless separately authorized.

---

## 1.9.2 — Behavior UX

Requires separate authorization.

Planned:

- visual state graph;
- better template authoring;
- behavior diagnostics;
- reference navigation.

The visual graph must edit the exact same canonical state/transition model.

No competing behavior representation.

---

## 1.9.3 — Audio Workflow Verification & Completion

**Current first priority, October 2.** Complete this capability before additional graphics/map recovery and all hosted/wallet implementation. Existing RE inspection remains available. The bounded scope is audio correctness and complete supported workflows, followed by canonical integration of native audio recovery; see `docs/NES_Forge_2.0_ALPHA_PLAN.md` for the sequence and evidence requirements.

**Starting point:** 1.8 already established runtime music, SFX, animation sound events, Pulse 1 / Pulse 2 / Triangle / Noise playback, MIDI import and MusicXML import. Preserve that baseline. First determine which authoring, import, export, editing or playback paths are incomplete; implement demonstrated gaps rather than rebuilding working services.

Planned capability path:

- author and edit a short song, instruments and SFX in canonical NES Forge Audio;
- import a small MIDI and MusicXML example with clear mapping and unsupported-feature diagnostics;
- compile to a generated ROM and verify audible music, SFX and gameplay-triggered sound, including channel contention and interruption/resume;
- save/reopen the complete native project with audio references intact;
- define supported notation/performance export before claiming interchange round-trip; preserve NES-only detail in native data and report lossy conversion;
- provide a repeatable audio workshop and reference project.

**Exit evidence:** exact app/ROM hashes, declared supported channels and import/export subset, reference inputs and expected events, automated regressions, and recorded listening results in Forge plus an independent emulator. Test physical-console audio separately and report it only when performed. Manual authoring and both existing import paths must survive save/reopen without silent changes.

Mobile emulator A/V lag retains its 1.9.0 stabilization classification and is now investigated alongside audio alignment. ROM audio-driver decoding and decoded-audio export remain supported 2.x RE adapter work, following authoring/runtime correctness. Scanned sheet music, photographic tablature, direct FL Studio project import, DPCM and expansion audio are later proposals requiring their own scope; none is implied by MIDI/MusicXML support.

---

# 8. 2.0 Alpha — RE Development and Required Foundations

This is the active direction for subsequent integrated candidates. Audio alignment now leads the implementation order, followed by reusable native audio recovery and then additional graphics/maps. The original resource linker, runtime-profile, raster and live-foundation scope is preserved in 2.0.1–2.0.5 below; existing observation tools do not complete those foundations.

Deliver the minimum resource/address identity, mapper/profile declaration, source mapping and time-dependent evidence contracts needed for a first supported RE path. Do not wait for every mapper, scrolling profile or LiveLink operation before extending the existing bounded RE bridge. Add each runtime/compiler capability behind explicit validation; unsupported captures must not be silently flattened into NROM.

## 2.0.1 — Mapper-aware Resource Linker

Introduce:

- mapper abstraction;
- PRG bank allocation;
- CHR bank allocation;
- relocatable runtime resources;
- stable runtime asset identities;
- dependency-driven packing;
- streaming support;
- mapper-aware validation.

Move beyond assuming one NROM/32 KB execution envelope.

---

## 2.0.2 — Debug/Edit ROM vs Release ROM

Debug/Edit ROM may retain:

- project metadata;
- diagnostic data;
- stable resource identity;
- source mappings;
- LiveLink metadata.

Release ROM should eventually contain only what execution requires.

Distinguish authoring metadata recovery, generated assembly source, disassembly and reconstructed source. Current ROM generation does not establish an editable assembly-export workflow. Decide and scope any such export explicitly; decoded arbitrary-ROM code is not automatically the original source.

---

## 2.0.3 — Runtime Profiles

Potential profiles:

- fixed-screen;
- screen-transition;
- horizontal scrolling;
- vertical scrolling;
- top-down scrolling;
- mixed room/scroll;
- mapper-specific profiles.

All remain NES-class runtime profiles.

---

## 2.0.4 — Canonical Raster Event Model

NES Forge must represent time-dependent NES rendering behavior.

Examples:

- `$2005` scroll changes;
- `$2006` PPU-address changes;
- palette changes;
- CHR bank switching;
- nametable/mirroring changes;
- PPU mask changes;
- mapper writes;
- sprite-0 splits;
- timed raster splits;
- MMC3/mapper IRQ effects;
- HUD/playfield separation.

Three claims remain distinct:

1. Captured
2. Represented
3. Compilable

---

## 2.0.5 — Live Play Foundation

Authoring asset
→ stable resource ID
→ compiler
→ bank/address
→ EmulatorBridge
→ running resource

Then:

- incremental compilation;
- change detection;
- controlled runtime replacement;
- initial LiveLink operations.

---

# 9. 2.1 — RE Bridge + Evidence Model

## RE Entry A — historical September 30 scope, implemented bounded subset

This bounded inspection track was brought forward alongside mobile closeout and is now represented by the delivered analysis/runtime candidates. The existing separate RE branch is an input to audit and selectively adapt, not a replacement for the current editor. It does not change the current project schema, generated-ROM formats or release number.

Original entry scope, retained for traceability:

- recover and identify the exact existing RE branch, notes, fixtures and test evidence;
- establish immutable input-ROM identity and validated header/PRG/CHR/trainer boundaries;
- distinguish physical file/bank offsets from CPU addresses; begin with an explicitly supported mapping such as NROM and label unsupported/dynamic mappings;
- expose reproducible inspection results, vectors/disassembly candidates and raw CHR data with source offsets, mapper context and evidence state;
- keep notes and analysis separate from the active authored project; loading or inspecting a ROM must not silently alter it;
- define an explicit reviewed bridge for later asset conversion, leaving unknown code/data and unsupported audio formats intact.

An early inspector does not require full live editing, general mapper linking, complete audio-driver recovery or a broad graphics/World reconstruction claim. Its exit proof is a small declared fixture corpus, deterministic evidence records, bounds/mapping rejection cases and unchanged active-project/ROM data. The larger 2.x readiness gate still applies before hosted development.

## RE Bridge demonstration — authorized September 30

The separate re-bridge-1 alpha candidate brings the first explicit conversion bridge into **RE / DISASM**. See its `docs/RE_BRIDGE.md` for the exact supported profile and tutorial. Recognition checks an immutable copy, strict iNES layout, a 6502 engine fingerprint and vectors before reading documented native records. Evidence records physical offsets and ROM identity. The decoder does not consult its fixture manifest or parse embedded Forge metadata.

Analysis does not change the active project. Explicit import uses the existing undoable project boundary; staged data becomes stale if the active project changes. A real Forge project JSON download is separate from the inspection report. Unsupported fingerprints and unrepresentable values reject with actionable errors. The old “expected 1–64 scenes” error for RE reports is replaced with a report-versus-project explanation.

This is a finite first recovery profile, not completion of the full RE or audio program. Tests must exercise original and rebuilt CPU/PPU/APU behavior, exact collision data, actual editor changes and native project save/reload. Byte-identical ROM reconstruction and preservation of original engine behavior are not claimed. The existing five Gameplay Core templates, schema 12, actor/persistence limits and protected editor/emulator pathways remain in place.

Current position: bounded independent binary/6502 analysis and runtime investigation are implemented. Complete the current review, then apply those tools to additional independently supported inputs, document their data/engine contracts, and prove the recovery/edit/rebuild chain in the 2.0 Alpha plan. Source migration remains a parallel proposal requiring representative ASM files and named engine/toolchain dependencies; Lua and universal script support remain unimplemented.

## Engine-independent 6502 analysis — owner requirement, September 30

**Requirement:** Every 6502 ROM must be eligible for general byte/code analysis regardless of the engine that produced it. Engine recognition may enable additional explanations and recovery, but must never gate basic inspection. This is the product acceptance requirement, not a claim that the delivered candidate implements universal analysis or automatic reconstruction.

This extends analysis intake to raw 6502 binaries, including binaries from other 6502 machines. NES Forge's authored game target remains NES. Running a non-NES machine requires its own hardware emulation and is not delivered by adding a disassembler. CPU variant/opcode interpretation, load addresses and bank mappings must be explicit; do not infer NES hardware merely from 6502 instructions.

**Historical gaps before general analysis was implemented:** In `re-navigation-1`, `src/re/re-ui.js` routes Analyze ROM to the Bridge Room-only `REBridge.analyze()` fingerprint check. Legacy `disasm_run()` requires an emulator-loaded ROM and examines one current CPU mapping. The separate RE Entry A inspector preserves physical bytes for its supported iNES 1.0 subset, but has no raw binary path or opcode decoder. These findings explain the subsequent re-analysis implementation. They are not current missing-intake claims. The delivered general-analysis path has a 64 MiB bound, documented opcode policy, explicit mapping and raw fallback; those limits still prevent a universal execution or automatic-recovery claim.

### Implemented bounded general analysis — retained contract

- Open a file independently of emulation and recovery. Preserve immutable original bytes, full-file identity and physical offsets. Provide bounded hex/byte reads, search and exportable analysis notes. State size/resource limits explicitly and never truncate silently.
- Treat container parsing as an additional capability. Recognized NES formats expose validated physical PRG/CHR/trainer ranges and header claims. Unsupported formats, unsupported emulator mappers and malformed headers retain an explicit raw-inspection option; malformed structures never acquire trusted boundaries or a valid-ROM claim.
- For headerless binaries, accept explicit segment/file ranges, CPU load addresses and bank labels. Keep overlapping CPU windows in different physical banks distinct. Report unknown mappings instead of inventing them.
- Disassemble selected regions offline using a declared CPU variant/opcode policy. Show physical offsets with interpreted CPU addresses. Preserve unknown bytes and code/data ambiguity; decoded instruction candidates are not proof that bytes execute as code. Entry points, labels and user annotations must retain their evidence source.
- Show separate results for general inspection, address mapping, emulation and editable recovery. “Unknown engine” must leave inspection available. Rename the existing recovery action to make its narrower role clear; a failed profile match must not erase general analysis.
- Keep opening/analysis isolated from the active project, emulator, history and source editor. Explicit validated import remains the boundary for replacing an authored project.

**Acceptance cases:** unknown-engine NROM; valid NES ROM with an emulator-unsupported mapper; NES 2.0 or other unparsed container with honest raw fallback; headerless 6502 binary at a supplied origin; two physical banks mapped to the same CPU range; malformed/truncated container; opcode interpretation differences/unknown bytes; file-selection races and project isolation. Test meaningful bounded operations on a declared corpus. Do not turn a finite corpus pass into a universal execution or recovery claim.

### Runtime state discovery — delivered subset and remaining debugger scope

The delivered re-runtime-1 candidate provides A/B snapshots of RAM backing arrays, changed/unchanged/increased/decreased/after-equals filtering, eight analyst-labeled RAM-write watches, instruction coverage, PPU/APU-write observations and verified physical source links. These are observations within the existing emulator. The A/B copies are not full restorable machine checkpoints; write watches do not include CPU read watches, automatic breaks or value freezing.

The following work remains separately bounded:

1. Restorable named machine checkpoints and reproducible scripted-input experiments with explicit timeline semantics.
2. Breakpoints, read/access watches and richer code/data relationships needed to explain unfamiliar programs.
3. Persistent interpreted discoveries tied to ROM identity and stated conditions of validity.
4. Explicit reversible RAM/ROM experiments with original state retained, visible modification status and safe restoration.
5. Named stage-transition, damage or enemy-defeat actions only after their required state/routine contract is verified. A changed byte alone does not prove that the game's complete transition routine ran.

Normal controller input and frame navigation remain available. Neither tracing nor neutral frame advancement automatically finds a later stage or invents gameplay systems. Live edits and scripted inputs must define their effect on history, capture evidence and reproducibility. Preserve original ROM bytes and keep authoring-project mutation behind its validated import boundary.

Technical references: [NESdev CPU memory map](https://www.nesdev.org/wiki/CPU_memory_map), [mapper and bank mapping](https://www.nesdev.org/wiki/Mapper), and [iNES container format](https://www.nesdev.org/wiki/INES). These explain hardware/container distinctions; they do not establish Forge compatibility.

## Comprehensive RE — staged capability path

Comprehensive RE is the product goal, not a present universal-import claim. Build these connected capabilities with declared input/mapper/engine support:

1. **Control and reproduce execution:** identify the original ROM, pause/advance frames, navigate recorded machine state and retain valid capture evidence. Add broader checkpoint/debugger control only through explicit state contracts.
2. **Understand code and addressing:** bank-aware 6502 disassembly, physical/CPU address provenance, symbols and code/data annotations. Unknown bank mappings and ambiguous regions stay visible.
3. **Observe behavior:** bounded execution coverage, named RAM-write watches and PPU/APU-write observations are implemented in re-runtime-1. Breakpoints, CPU read watches and broader debugger control remain future work. Retain each capability's own acceptance evidence; frame history alone does not implement it.
4. **Decode native resources:** engine-specific graphics/metasprites, palettes, compressed maps/scenes, collision, entities and audio drivers. Show decoded versus inferred versus unknown meaning, source offsets and unsupported features. A picture or PPU capture alone does not establish gameplay semantics.
5. **Recover editable projects and migrate source:** canonical assets and authoring data enter through explicit validated, undoable adapters. When original ASM/includes/macros are available, preserve that source and dependencies rather than claiming ROM recovery recreates them. Named toolchain/engine migration and host Lua remain separately scoped.
6. **Validate edits and outputs:** save/reopen, compile/export, compare relevant original and rebuilt behavior, preserve original input bytes and document every runtime adaptation. Follow with independent emulator and hardware checks where the supported profile requires them.

The first Native Room v1 decoder and bounded emulator navigation are the beginning of this chain. They do not complete arbitrary-ROM scene/audio recovery, full-engine reconstruction, source migration or the larger 2.x readiness gate. Retain the current runtime-investigation review; after audio workflow closeout, apply the existing analysis foundation to native audio recovery and then additional graphics/maps in the stated execution order. Add debugger capabilities where a concrete decoder experiment requires them. Another recovery adapter must never become a prerequisite for opening an unknown ROM.

## Full bridge scope

Begin deliberate integration of the separate RE branch.

Do not wholesale-merge it.

Evidence states:

- Observed
- Inferred
- Decoded
- Round-trip validated
- Converted

Unknown remains valid.

Explicit bridges may include:

- Send CHR to Project
- Send Palette to Project
- Create Metatile Library
- Create Scene
- Create World
- Create Metasprite
- Create Animation
- Create Entity data
- Import collision structures
- Send music/SFX to Audio Studio
- Export decoded music to MusicXML/MIDI
- Create Raster Schedule
- create labels/xrefs

Start with identified formats and a small declared corpus. Use Forge-generated ROMs to validate plumbing, then include a permitted independent ROM without embedded Forge source so metadata recovery is not mistaken for reverse engineering. Integrate the separate RE branch through reviewed adapters rather than adopting its current state as trusted.

---

# 10. 2.2 — Method Registry / Forge Knowledge Base

Long-term goal:

> Build a reusable library of NES development methods and techniques, not distributed third-party assets.

Potential method families:

- Mapper Methods
- CHR Methods
- Palette Methods
- Metatile Methods
- World/Map Methods
- Compression Methods
- Metasprite Methods
- Animation Methods
- Entity/Spawn Methods
- Collision Methods
- Audio Driver Methods
- Text Methods
- Raster Methods
- Runtime/state-machine Methods

Ideal method structure:

signature
→ evidence
→ decoder
→ canonical NES Forge representation
→ encoder
→ validation
→ provenance/confidence

Gold-standard validation where possible:

original binary
→ decode
→ canonical representation
→ encode
→ original representation

---

# 11. 2.3 — Integrated RE Workspace

**Delivered subset:** offline disassembly with explicit mappings, annotations, execution coverage, bounded PPU/APU write evidence and verified physical source jumps live in RE / DISASM. These tools are included in re-runtime-1 and still require its browser/owner review.

**Remaining broader scope:**

- richer automatic bank-context analysis beyond explicit/observed mappings;
- general code/data classification;
- inferred symbols and cross-references beyond analyst annotations;
- richer execution profiling beyond bounded coverage;
- mapper-state exploration;
- pointer discovery;
- compression tracing;
- native CHR/palette source-format provenance beyond observed PPU writes and physical CHR inspection;
- OAM/metasprite inspection;
- animation tracing;
- entity/spawn analysis;
- audio-driver analysis;
- World/map analysis;
- raster timeline;
- PPU/IRQ inspection;
- Method Registry matching;
- evidence/confidence visualization.

---

# 12. 2.4 — Live RE / Debugger / Hot Patch

**Delivered observation subset:** labeled RAM-write watches, actual emulator-bank provenance for recorded instructions, and bounded PPU/APU writes.

**Remaining manipulation/debugger scope:**

- runtime asset selection;
- CPU read/access watches, breakpoint behavior and explicit value freeze;
- breakpoints/watchpoints;
- bank-aware patch/experiment addresses beyond read-only recorded provenance;
- deeper CPU/PPU/APU/OAM inspection;
- CHR/palette hot replacement;
- map/metatile edits;
- entity parameter edits;
- music sequence replacement;
- Raster Schedule edits;
- bank-aware ROM shadow patches.

---

# 13. 2.5+ — Continuous Knowledge Expansion

RE is not considered “finished.”

Each ROM may:

- match existing techniques;
- reveal variants;
- introduce new methods;
- improve signatures;
- add validated decoders;
- add validated encoders.

The Method Registry should make later ROMs progressively easier to understand.

## Finite audio / RE readiness gate before 3.x

Audio and reverse engineering precede hosted/wallet work, but universal ROM recovery is not a completion requirement. Before starting 3.x implementation:

1. Accept the 1.9.3 authoring/audio workflow for its declared scope.
2. Declare supported mapper/runtime profiles and freeze a small reference corpus, including an independent source-free input; record hashes and provenance.
3. Prove inspection → decoded canonical data → edit → rebuild → runtime verification for supported graphics/World content and at least one independent supported music/SFX driver example. The graphics path must satisfy A1's two unrelated independently authored engines beyond Forge/Bridge Room controls; a control fixture alone cannot close this gate. MusicXML/MIDI export must identify supported semantics and preserve the full NES representation natively.
4. Keep Observed, Inferred, Decoded, Round-trip validated and Converted claims distinct. Preserve unknown data and refuse unsupported executable reconstruction.
5. Demonstrate the inspection/debugging tools required to diagnose those examples, plus regression evidence for original project creation, save/reopen and ROM output.
6. Record unresolved limits and obtain acceptance of that supported slice.

Bit-for-bit re-encoding and behavioral equivalence are different claims and need different evidence. Broad mapper coverage, every proposed 2.4 hot-patch tool and continuing 2.5 decoder discovery may expand after this gate; they are not infinite prerequisites for hosted work.

---

# 14. 3.x — Hosted Worlds & Networked NES Games

**Entry condition:** pass the finite audio / RE readiness gate above. Define the hosted client/server contract before adding wallet-backed ownership. A wallet connection alone is neither gameplay authority nor permission to transfer assets.

## Product intent

3.x does **not** turn NES Forge into a modern 3D/MMO engine.

It allows real NES-class 6502 games to participate in:

- persistent Hosted Worlds;
- multiplayer sessions;
- server-authoritative state;
- resource gathering;
- progression;
- crafting;
- construction;
- combat;
- economy;
- social features;
- collaborative building.

The player experience remains NES / 8-bit / 6502-class.

The host infrastructure can be modern.

Maintain an explicit compatibility distinction: ordinary exported ROMs retain their declared standalone NES profile; connected Worlds require a supported host bridge and may have unavailable features offline. A stock NES does not acquire internet or wallet capabilities from a ROM alone. Any physical-console network adapter is a separate hardware/runtime profile, not a compatibility claim inherited from emulator-based hosting.

---

## Hosted World model

Conceptually:

Hosted World
→ authoritative persistent state
→ interest/proximity projection
→ NES-compatible local state
→ 6502 runtime

A huge hosted World may contain far more data than one NES client can hold.

Each NES client receives only the local slice it needs:

- nearby map/chunks;
- relevant actors;
- inventory;
- local structures;
- combat state;
- nearby players/resources.

The NES remains the game client.

The host owns large-scale persistence/session state.

Define the boundary precisely: the 6502 runtime executes the local game representation; the server validates authoritative World actions and outcomes; the host bridge maps bounded, typed events and state into the declared NES runtime profile. Budget projected actors, memory and resources explicitly. Do not silently replace 6502 gameplay with a modern visual game engine.

---

## 3.0 — Hosted Session / Network Foundation

The earlier one-player local input adapter is a usability foundation only. This milestone remains separately scoped for generalized player assignment, networking, replay, and synchronization; local gamepad support does not start 3.x.

Establish:

- generalized InputSource abstraction;
- P1/P2/P3/P4/local controller assignment;
- deterministic simulation contract where applicable;
- emulator snapshots;
- input recording/replay;
- state hashes;
- session identity;
- player identity;
- authoritative vs peer state concepts;
- canonical network event envelopes.

No Hosted World game genre is hard-coded here.

Begin with a small declared player count. Any P3/P4 assignment needs an explicit supported controller/peripheral profile. Freeze replay/state-hash assumptions for the selected deterministic runtime; do not assume every arbitrary ROM or host timing configuration is interchangeable.

---

## 3.1 — Traditional Netplay

For conventional NES multiplayer:

- synchronized controller input;
- peer/server sessions;
- rollback where appropriate;
- reconnect;
- spectators;
- lobbies/matchmaking;
- compatibility with suitable existing ROMs.

The ROM itself does not need Internet protocol code.

This is a separate compatibility/netplay branch after 3.0. Completion of rollback for legacy ROMs is not a prerequisite for the authoritative 3.2–3.3 Hosted World path.

---

## 3.2 — Hosted Network Runtime

Introduce server-facing canonical gameplay events.

Examples:

Client-side intents:

- move/input;
- interact;
- attack;
- pickup;
- craft;
- world modification;
- inventory action.

Server-side results:

- actor spawn/despawn;
- actor state;
- world delta;
- persistent state change;
- inventory update;
- match/session event.

Gameplay owns meaning.

Networking owns transport.

---

## 3.3 — Persistent Hosted Worlds

Introduce:

- server-side World persistence;
- streamed/chunked NES-compatible local projections;
- player-owned persistent state;
- structures;
- resources;
- construction/destruction;
- authoritative inventories;
- reconnectable sessions;
- persistent bases/settlements.

This is the foundation for NES-style survival/building/RPG experiences.

**First hosted demonstration:** two clients join one small World, interact with one authoritative item, disconnect/reconnect and recover consistent World and inventory state. Retry, stale-client and simultaneous-pickup cases must not duplicate items. Restart and restore the server without losing accepted outcomes. Prove this with ordinary game items before attaching blockchain settlement.

---

## 3.4 — Economy, Crafting & Construction Services

Potential canonical hosted capabilities:

- inventories;
- currencies;
- resources;
- recipes;
- crafting;
- equipment;
- spells/abilities;
- structures;
- building materials;
- vendors/trading;
- progression/XP.

These must remain domain abstractions.

Networking must not own their gameplay semantics.

### 3.4.1 — Canonical Items, Issuance & Earned Loot

Establish stable item-instance identity, issuing-world identity, item-definition version, quantities, owners and inventory location. Define crafting/drop rules, supply policy and unique claim IDs. Support both owner-operated vendors and gameplay-earned items through the same authoritative issuance rules.

Prove earn → equip/use → trade/store → save/reconnect without duplicates. Keep game properties in a versioned canonical item model; a wallet asset is an ownership reference, not executable NES code. Receiving Worlds explicitly choose accepted issuers, allowed items, stat mappings and balance rules. Cross-world acceptance is optional.

### 3.4.2 — Existing Crypto Project Audit & Solana Test Integration

**Consideration review completed October 4:** the owner supplied `sol_games_v0.2.zip` explicitly for consideration, not implementation. Its source/documentation were inspected for architectural fit. Archive SHA-256: `070e2408345db8131398d3f1c84f78ad6ac3f44a40d9ef859ef7fb37f1dfcdc6`. No tests, FCEUX execution, live-chain calls, deployment or Forge integration were performed in that review. The supplied build report's earlier test claims remain that package's evidence, not a newly measured pass.

The prototype separates declarative item manifests, entitlement lookup, equipment slots and typed RAM effects. Its current client is FCEUX Lua with a local Python bridge and filesystem messaging. Defaults use a development inventory file, placeholder wallet and null mint addresses; ROM fingerprint enforcement and manifest signatures are optional and not enabled by the supplied configuration. It has an ownership-read provider, not a wallet login, mint/transfer service or authoritative multiplayer server.

| Concept to retain | Forge adaptation to evaluate later |
| --- | --- |
| Item manifests and equipment slots | Versioned canonical item definitions plus separate stable item-instance identity, issuing World, owner and inventory location. Item meaning remains independent of chain and transport. |
| Pluggable entitlement provider | A host service can map verified external ownership to eligible game items. Wallet authentication, ownership lookup and transfer authorization remain separate contracts. |
| Typed effects and lifecycle handling | Forge-authored games use named components, variables and gameplay events. Imported ROMs need verified game/build-specific RE mappings. Resolve bindings for the selected runtime rather than embedding one game's RAM addresses in shared definitions. |
| Request identity and validation | Preserve correlation, bounded messages and explicit failures in a supported browser/host transport. FCEUX Lua and filesystem polling are prototype adapters, not directly portable Forge browser integration. |
| Gameplay feedback | Item actions refer to canonical animation/SFX events. The prototype contributes no audio engine or native-audio recovery capability to the current audio tranche. |

General analysis must remain open to unknown ROMs. Applying an item effect is a separate, explicitly compatible operation: a RAM write may enable an existing ability but does not insert arbitrary new artwork, scenes or mechanics. The host/client contract must specify reset, rewind, ROM switching, death, save/reopen, reconnect and ownership changes; local captured RAM state cannot establish authoritative loot outcomes.

Before reuse, audit the prototype's tests, runtime behavior, deployment state and wallet/asset contracts against the actual hosted design. Its security or integration readiness is not established by this consideration review. Keep chain-specific behavior behind an adapter; do not wholesale-merge the project or create a new currency merely to enable items. Sol Games remains a reference candidate until a separately scoped integration decision.

Solana is the preferred first candidate, not a locked dependency. Use local/test-network assets initially. Define wallet authentication separately from asset-transfer authorization; normal game login must not grant blanket spending power. Keep secrets out of ROMs, project files and game servers that do not need them.

Compare unique and stackable asset representations, metadata/storage needs, account costs, priority fees, infrastructure and indexing costs. Evaluate fee sponsorship with quotas and explicit transaction validation [R2]. Show total measured user/platform cost per mint and transfer; low base fees are not the complete mint cost.

### 3.4.3 — Mint, Hold, Withdraw & Reconcile

First connected-item demonstration:

connect wallet → earn a server-verified item → claim/mint an eligible instance → confirm ownership → reconnect and use its supported game representation.

Players may keep earned items in ordinary inventory and mint eligible items under declared rules. Reserve each eligible claim so it cannot be minted twice, and define how a minted asset replaces or references the original inventory record. Handle transfers outside the game, burns, failed/delayed transactions, retries and chain confirmation before granting final ownership effects. Distinguish pending, usable and settled states.

Publish issuer identity, supply/mint rules, metadata policy and server trust assumptions. Wallet possession does not guarantee resale value, permanent server availability or use in every World.

### 3.4.4 — Consented Loot Loss & Ownership Settlement

Introduce combat loss after authoritative combat, durable inventories and test-network minting work independently. Define which items are at risk, who can receive them, the applicable World/rules version, the encounter start/end boundary, and disconnect/cancellation behavior before a player opts in.

Choose and review an enforceable custody/escrow or narrowly delegated-transfer design. The current design preference is explicitly committed encounter loot; unrelated wallet assets remain outside it. Prevent transferring the same item away while it is committed. A client or server merely announcing a win cannot by itself authorize an arbitrary wallet transfer.

Use one durable encounter result and idempotent settlement so an item has one recognized owner through retries, server crashes and network interruptions. Test double claims, replayed results, collusion/cheating assumptions, invalid issuers, withdrawals, cancellation and recovery. Explain which outcomes still require trust in a server operator; blockchain ownership does not prove that combat was fair.

**Real-value readiness gate:** a demonstrated test-network loop, independently reviewed authority/issuance/settlement design, measured fees, operational recovery and an explicit launch decision. Only then consider items with monetary value. No guaranteed liquidity, token price or earnings are promised.

---

## 3.5 — Large Match / Competitive Systems

Potential:

- battle-royale style matches;
- teams;
- match rules;
- shrinking/controlled zones;
- elimination;
- spectator mode;
- scoring;
- rankings;
- match history.

The client remains NES-class.

---

## 3.6 — Social / Voice

Separate bounded context.

Potential:

- parties;
- friends/invites;
- text chat;
- voice chat;
- mute/block;
- lobby presence;
- team/positional voice where appropriate.

Voice must remain outside deterministic NES simulation state.

A voice failure must not alter the game simulation.

---

## 3.7 — Collaborative Hosted Creation

Potential:

- shared project sessions;
- presence;
- domain-aware synchronization;
- collaborative World editing;
- concurrent work across different domains;
- change history/conflict handling;
- collaborative Build & Run;
- shared LiveLink testing;
- voice/text collaboration.

Long-term possibility:

players can build and test NES Worlds together while staying inside the NES/8-bit product model.

3.5–3.7 are optional expansion branches after their relevant hosted foundations. A physical tech-deck prototype does not need large matches, voice and collaborative editing to be complete first.

---

# 15. Hosted persistence scopes

Current gameplay scopes remain:

- Transient
- Room
- World

3.x may deliberately introduce additional scopes such as:

- Session
- Player
- Hosted World
- Account

These must not be pulled forward into 1.x/2.x prematurely.

Current explicit persistence architecture should remain backend-neutral so later Hosted World storage can reuse canonical semantics rather than redesign Gameplay.

---

# 16. Networking-domain rule

Networking must not become gameplay.

Example:

Gameplay says:

`door.stateChanged(open=true)`

Networking may transport that event.

Networking does **not** decide:

- why the Door opened;
- whether it used a key;
- how its collision works;
- what animation plays;
- what persistence variable controls it.

Likewise:

- Inventory owns item meaning.
- Crafting owns recipes.
- Economy owns trading/currency.
- World owns spatial structure.
- Gameplay owns actor behavior.
- Networking owns synchronization/transport.
- Hosted persistence owns durable remote storage.
- Asset Ownership owns wallet/chain adapters and settlement state, not combat truth.
- Deployment owns host roles and installed project versions, not item issuance rules.
- Voice owns communication transport.

---

# 17. Long-term eras

## 1.x — CREATE

Build complete original NES games visually.

## 2.x — UNDERSTAND & MANIPULATE

Link, inspect, reverse engineer, catalog techniques, debug, and live-edit NES software.

## 3.x — CONNECT

Connect NES games into multiplayer sessions, persistent Hosted Worlds, developer-defined economies and optional wallet-owned items; add social systems and collaborative creation as scoped extensions.

## 4.x — DEPLOY & CARRY

Run the development environment, player client and server on a portable host; build and deploy from the device itself. Add internet connectivity and a separately validated constrained-mesh option, then integrate physical hardware.

All four eras remain under the same hard product rule:

> **NES Forge is an NES / 8-bit / 6502-class environment.**

---

# 18. 4.x — Portable Host & Physical Tech Deck

The tech deck is a modern host for NES development, emulation, deployment and services. A physical device running an emulator is not automatically a physical NES cartridge development or flashing kit. Cartridge-programming or console-interface hardware needs a separate supported interface and acceptance scope.

The dependency for this track is a working editor/build pipeline and the accepted hosted server/client contract. A software-only role/deployment prototype may proceed after those foundations without waiting for every 3.x extension or real-value wallet launch. Custom hardware integration follows measured software requirements.

## 4.0 — Prove the Three Roles on Existing Hardware

Use ordinary supported hardware first; select no custom board or enclosure yet.

| Role | Minimum proof |
| --- | --- |
| Development kit | Create/edit assets and audio, inspect supported ROMs, build a ROM and versioned server package, test, then deploy locally or to an authorized remote host from the device. |
| Client | Join a supported World, play with verified controls/audio, recover from disconnect and handle optional wallet actions through the host. |
| Server | Start a declared World, admit clients, persist state, back up/restore, apply a reviewed update and roll back safely. |

Declare whether each role runs independently or concurrently. Measure CPU, memory, storage, power, thermal behavior and bandwidth with a stated client count; do not promise all roles simultaneously on unknown hardware.

## 4.1 — Deploy From the Device; Wi-Fi & Cellular

Provide reproducible install/update packages, versioned project/server configuration, explicit local/remote deployment targets, logs, recovery and backup controls. Distinguish deployment of a ROM from deployment of a hosted World service. Keep signing/admin authority outside distributable game content and make deployment permissions explicit.

Verify Wi-Fi and cellular paths, including tethering or a supported modem as chosen during hardware evaluation. Test connection changes, interruptions and remote reachability; document any relay or outbound-connection requirement instead of assuming a device on cellular can accept unsolicited inbound clients. Finalize item settlement only when the authoritative services are reachable and their confirmation policy is satisfied.

## 4.2 — Meshtastic Feasibility & Optional Mesh Mode

Run this investigation alongside the portable-host prototype, before committing to radio hardware. Use a compatible LoRa radio; a phone, Wi-Fi adapter or cellular modem alone is not a Meshtastic radio.

Start with compact messages, discovery, asynchronous encounters or small delayed World updates. Establish a packet and airtime budget; measure latency, losses, duplicate/reordered delivery and reconciliation under the selected devices and radio settings. Meshtastic documents low data rates and overhead from headers, hops and retries [R1].

The initial mesh proposal excludes streaming ROM/assets, voice and frame-by-frame action synchronization. Reconsider individual capabilities only with measured evidence. Offline mesh messages may record pending intents; they must not independently finalize spendable wallet ownership or create duplicate loot. A later connection to authoritative services must validate and reconcile them. The ordinary Wi-Fi/cellular experience must remain usable without mesh.

## 4.3 — Physical Prototype & Hardware Validation

Choose hardware from measured requirements: compute board, display, controls, audio, storage, battery/power, cooling, Wi-Fi, cellular option and optional LoRa radio. Validate assembly, suspend/resume, power loss, recovery, field connectivity and sustained use for each advertised role. Establish a bill of materials and cost target before custom-board work.

**Exit demonstration:** create or edit a small project on the deck, build it, deploy its hosted service from the deck, connect a second client, complete a gameplay session, and recover cleanly after interruption. Demonstrate optional mesh separately within its declared message budget. Run the deck as a server only up to the measured capacity; offer a remote server deployment path for larger Worlds.

No purchase, hardware manufacturing, mainnet deployment or service publication is authorized by this roadmap edit.

---

# 19. Future platform policy

A future 16-bit product is not ruled out.

However:

- it must not be implemented by weakening NES Forge's hardware boundaries;
- SNES support belongs in a separate environment/product;
- its canonical models may reuse conceptual lessons, but not silently reuse incompatible runtime assumptions;
- NES Forge must remain stable, authentic, and focused on 8-bit NES/6502 development.

---

# 20. Final scope statement

NES Forge may use modern infrastructure around the game.

NES Forge may provide modern tooling to understand the game.

NES Forge may host persistent online Worlds around the game.

NES Forge may support modern collaboration and voice around the game.

NES Forge may connect canonical game items to wallet ownership and explicit, consented loss rules through host services.

NES Forge may run on a portable device that develops, deploys, plays and hosts NES experiences.

But the **game itself remains NES**:

- 8-bit;
- NES-class graphics;
- NES-class audio;
- 6502-derived runtime logic;
- NES-compatible resources and cartridge/runtime profiles.

That boundary is intentional and authoritative.

---

# 21. Planning references and change record

External references inform feasibility, not proof that Forge has implemented a feature. Consulted September 30, 2026, America/Denver:

- **[R1]** [Meshtastic radio settings and data rates](https://meshtastic.org/docs/overview/radio-settings/). Supports a separately budgeted low-throughput mesh mode; quoted data-rate maxima exclude headers, hops and retransmissions.
- **[R2]** [Solana fee abstraction](https://solana.com/docs/payments/send-payments/payment-processing/fee-abstraction). Supports evaluating a separate transaction fee payer; sponsorship still needs funding, limits and transaction validation. No fixed mint-price claim is made here.

**Historical September 30 revision summary:** That revision preserved the completed 1.7/1.8 record, historical 1.9.0 evidence, five-template/schema-12 limits and protected behavior. It retains the 1.9.1/1.9.2 assignments; adds 1.9.3 audio workflow completion, a finite 2.x RE gate, ordered 3.4 item/wallet/loot stages and a 4.x portable platform track. It records accessible developer tooling and recommended private GitHub setup before RE. It corrects stale PDF-closeout wording and distinguishes the separately prepared mobile-play-2 follow-up from earlier evidence. The delivered review kit remains a dated mobile-play-1 snapshot; the new candidate is supplied separately. The existing roadmap filename is retained to preserve its identity.

**Integrated RE continuation:** This revision records the authorized re-bridge-1 demonstration and its bounded acceptance path. It preserves the preceding ASM migration proposal and all long-term dependencies; no release promotion, publication, hosted implementation or universal decoder is authorized by the demonstration.

**Emulator navigation continuation:** Owner requests on September 30 authorize the separate bounded playback/history implementation for RE analysis. This does not relax NES/8-bit/6502 limits or authorize hosted/wallet work, source publication, or universal recovery claims.

**Engine-independent analysis clarification:** The owner explicitly requires analysis of all 6502 ROMs regardless of engine and requests gameplay-event investigation beyond frame navigation. This revision records the verified intake/disassembly gaps, prioritizes general analysis ahead of another profile, and defines follow-on debugger acceptance. It is a roadmap update; no new executable, test pass, emulator platform support or release promotion is claimed.

**D050 implementation continuation:** The owner explicitly authorized the next independent-analysis slice. Candidate re-analysis-1 keeps a 64 MiB input limit and documented NMOS 6502/NES-2A03 opcode interpretation; other encodings remain bytes rather than guessed instructions. Explicit raw/physical inspection does not establish emulator compatibility or recover engine-specific resources. Use the current package's exact evidence and docs/RE_ANALYSIS.md, and stop at the review candidate before promotion.

**D051 implementation continuation:** Runtime investigation is now implemented as part of the standalone Forge RE workspace, with opt-in observation, bounded evidence and a checked identity shared with static analysis. Use the current candidate's measured reports and `docs/RE_RUNTIME_CHECKLIST.txt`; do not treat prior external investigation results as integrated-tool or new-browser acceptance.


## October 2 reconciliation — adopted direction

The owner's “Ok, proceed” follows the review of roadmap drift. This revision identifies re-runtime-1 and its measured 895/41 result as the delivered reference, corrects the current checklist, moves older sequencing updates into the dated appendix, and distinguishes delivered observation tools from remaining native recovery and live manipulation. Subsequent RE development uses the 2.0 Alpha track without retroactively renaming existing releases. The original 2.0.1–2.0.5 and 2.1–2.5 capability scopes remain visible; 1.9.1/1.9.2 remain deferred.

The companion `docs/NES_Forge_2.0_ALPHA_PLAN.md` defines the bounded next recovery path and required evidence. The source-control handoff identifies the actual local Git reference. No new executable, schema change, candidate promotion, GitHub publication, license grant, hosted/wallet implementation or hardware purchase is implied by this documentation revision.

---

## October 4 consolidation — current execution order

At the owner's request, consolidated the roadmap into six delivery phases with concrete exits, one active implementation candidate and explicit parallel support work. Audio correction remains next; audio workflow/listening closure precedes additional recovery. Clarified the independent-engine gate, corrected stale ASM/source-control sequencing and recorded the Sol Games v0.2 consideration as a later reuse evaluation, not an integration approval. Portable software can branch after hosted foundations without waiting for wallet launch. Detailed capability numbering, historical evidence and protected application behavior remain preserved.

---

# 22. Historical sequencing notes — September 28 through October 1

The following notes preserve prior instructions, proposed ordering and findings verbatim. Terms such as “current,” “next,” “latest” and checklist references in this appendix describe their original dates and are superseded by the current-position and execution-order sections above. The old picker-repair wording is retained only as historical evidence of the documentation issue corrected October 2.

**October 1 integrated ROM analysis — D051:** The owner supplied `pepsi_vending_v9e.nes`, completed the six scoped tests for the prior picker-repair candidate, and approved continuing with the investigation tools inside Forge. Candidate **re-runtime-1** implements opt-in executed-code and PPU/APU-write observations, loaded-ROM adoption into static analysis, before/after RAM comparison, up to eight named RAM-write watches, source-code links where physical mapping is known, and evidence/observed-resource exports. These are general investigation tools rather than a Pepsi-specific decoder. The new candidate has its own full 41-suite gate and manual walkthrough; historical external scripts and prior owner passes do not certify changed code.

The next acceptance demonstrates a real Pepsi state transition inside the integrated workflow and sound-register observations on an input that contains sound. Trace limits and unobserved data remain explicit. Generic scene/collision/music reconstruction, stage selection, health/enemy commands, breakpoints, controlled patches and broad mapper support are still future work. The next substantive recovery milestone must turn evidence into verified canonical content using unfamiliar ROMs and avoid a succession of fixture-only claims. This continuation does not complete comprehensive RE, promote the release or authorize hosted/wallet work.

**Historical October 1 picker correction:** The shell's global file-input CSS hid general analysis until re-analysis-1a supplied its visible override. The owner subsequently reported all T1–T6 scoped checks successful, including unknown-engine static intake and preservation of the imported editor project. Bridge Room-only recovery remains separate from general investigation. Prior roadmap sequence and protected contracts remain authoritative.

**September 30 continuation:** The owner said “Ok, let's continue” after the immediate mobile-stabilization plan. A bounded presentation follow-up, **mobile-play-2**, is prepared for review: HTML SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`. It defers hidden editor-sidebar work during expanded Play and avoids unchanged canvas sizing work. Its exact automated evidence belongs to its own `test-results/candidate/Summary.json`, not the older totals below. CPU/PPU/APU, timing and audio buffering are unchanged. Device-level lag improvement and owner acceptance are still unverified.

**September 30 review reference:** The preserved prior application is **1.9.0 Alpha / mobile-play-1**, SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`. Its September 28 suite passed **702/702 cases across 28 suites**. The owner reported working mobile touch, mobile audio/video lag, a successful guided tutorial through steps 1–9, and playback of that tutorial ROM in another emulator. The independent emulator's name/version, ROM hash and device details were not supplied; this is an owner-reported project result, not a general compatibility certificate. Physical controllers remain untested; physical NES-console testing is a separate unverified track.

**Documentation:** The expanded manual, tutorial and operator-reference PDFs were delivered after rendering and visual checks. Review-kit revision 2 corrects the tutorial's tab locations, separate World fields, palette explanation and Player selection; adds an editable feedback form and portable reproduction instructions; and records the completed owner walkthrough. The original application/source ZIP remains unchanged. Historical statements below about pending documentation are superseded by this update.

**September 30 owner direction:** Put audio and reverse engineering before the connected platform. The long-term goal now explicitly includes developer-hosted custom Worlds, server-sold and gameplay-earned mintable items, wallet ownership, opted-in loss of eligible loot in combat, and a physical tech deck that can develop/deploy, play as a client, or host a server. Wi-Fi and cellular are the primary internet paths; Meshtastic is an optional transport investigation. Solana is the preferred initial low-fee candidate, subject to review of the existing crypto project and measured total costs.

**Earlier September 30 RE-entry priority:** The owner then instructed that RE needs to start now because the authoring environment is in a good state. Bring forward **RE Entry A: branch intake and evidence-backed ROM inspection**, in parallel with remaining mobile closeout. Do not require 1.9.1, 1.9.2, 1.9.3, GitHub setup or every proposed 2.0 linker capability to finish before that bounded read-only work. This supersedes the earlier strictly sequential placement of all RE after Audio Studio completion.

**Current authorized RE demonstration:** The owner asked to see the end-to-end bridge after clarifying that an inspection report does not recover editable scenes, collision or audio. A separate **1.9.0 Alpha / re-bridge-1** candidate now implements one declared profile for the independently authored `Bridge_Room.nes`. Its own 6502 engine contains native graphics, room, collision and Pulse 1 music data; it has no embedded Forge project. The bridge stages a preview, then explicitly imports a genuine schema-12 project through the existing undoable replacement path. Original ROM bytes remain available for Run Original. The exact candidate and clean-extraction result are identified in its packaged `test-results/candidate/Summary.json`; this roadmap does not imply promotion or browser/device acceptance.

Recovered content is one room, 512 CHR tiles, palettes/attributes, a 960-cell collision map, a player spawn and a 16-row Pulse 1 melody. Rebuilding uses Forge’s existing player runtime, which adds jump/attack/gravity to the original left/right-only demo. Original engine behavior, SFX, general NESmaker support and arbitrary-ROM reconstruction are not recovered. Graphics, collision and note edits must survive native JSON save/reload and affect the rebuilt runtime. The test kit supplies source, reproduction commands and measured evidence; browser, audible output and hardware checks remain separate.

**Latest emulator/RE direction:** The owner requested forward/backward navigation for loaded ROMs, clarified its use for RE analysis, and confirmed comprehensive RE as the goal. The separately reviewed **re-navigation-1** candidate builds on re-bridge-1 with an optional playback-tools strip: existing forward-frame capability, backward/forward recorded-state navigation and bounded frame skips. History is opt-in, with up to 300 snapshots and a 32 MiB stored-snapshot budget; the actual retained frame range is displayed rather than promising a fixed number of seconds. Restored state must include CPU, PPU, mapper, logical APU, controller latches and runtime-capture evidence. Host audio queues are cleared while seeking; this is not reversed speaker playback or reverse execution of individual 6502 instructions. Original and built ROMs use the same emulator boundary. Exact implemented behavior and measured evidence belong to `docs/EMULATOR_NAVIGATION.md` and its candidate reports; release promotion and real-browser/device acceptance remain separate.

**Authorized implementation continuation:** The owner followed the engine-independent requirement with “Ok, let's implement please.” Candidate `re-analysis-1` adds independent binary inspection and offline documented-NMOS-6502/NES-2A03 disassembly, explicit mappings, bounded hex/search views, physical CHR inspection and exportable user notes. Its exact current evidence belongs to `test-results/candidate/Summary.json`; browser evidence is separate. Unknown engines and unsupported emulator mappers retain general inspection; unknown/malformed containers retain raw bytes with diagnostics. Recovery remains Native Room v1 only. Game-specific health/enemy/stage investigation is the following debugger tranche, not an implemented navigation command.

**Latest owner clarification:** “All 6502 roms should be analyzable. Regardless of engine.” General analysis must open a binary without requiring a recognized engine, successful emulator load or editable-recovery adapter. The previous re-navigation-1 candidate did not meet this requirement: its profile-gated Analyze ROM action and emulator-dependent disassembler were verified gaps. The new re-analysis-1 path separates general intake from both; the full product goal still exceeds its declared size, opcode and interpretation limits. Prioritize independent binary/6502 inspection before selecting another recovery profile; follow it with runtime state discovery and event tracing for investigating health, enemies and stage transitions. See the explicit acceptance scope in section 9.

**Proceed by dependency:** Review the bounded integrated RE demonstration and emulator-navigation follow-up alongside the remaining mobile closeout. Next establish engine-independent analysis, then use its evidence and debugger facilities to support additional recovery profiles. Keep planned gameplay/behavior improvements and Audio Studio completion as separately scoped work; integrate deeper RE adapters as their resource/profile contracts become ready. Audio and the finite supported-RE gate still precede hosted Worlds and wallet implementation. Establish authoritative hosted Worlds and inventories before mintable ownership and consented loot loss. Prove portable server/client/development roles on existing hardware before a custom tech deck. Repeating the owner's whole tutorial is not a new gate.

The initial roadmap request was planning authority. The later continuation and RE-start instructions authorize the bounded work recorded above, not wholesale integration or release promotion. Existing implementation authorization remains in force for its bounded scope. Assembly-source export is not an established current capability. Milestone numbers below are planning identifiers, not delivery dates.

| Priority | Milestone | Milestone outcome / dependency |
| --- | --- | --- |
| 1 | 1.9.0 Alpha stabilization | Reproduce/profile mobile A/V lag, document input isolation and physical-controller/device results, review the exact candidate and unresolved limits for acceptance. |
| Now, parallel | Engine-independent 6502 analysis + gameplay debugging | Open and inspect binaries without engine recognition or emulator loading. Add explicit address mapping and offline disassembly, then runtime memory discovery, watches and event tracing. Keep existing RE Bridge recovery and emulator history as separately reviewed capabilities. |
| Foundation | GitHub setup after stabilization, before substantial RE integration | Recommended private source repository, frozen reference tags, issue tracking and reproducible checks. Initial local RE intake need not wait. Public release follows an explicit licensing/contribution decision; no repository has been created. |
| 2 | 1.9.1 Gameplay Expansion | Deliver bounded gameplay capabilities, including Door traversal semantics, exercised in a small original playable game. |
| 3 | 1.9.2 Behavior UX | Author and diagnose the same canonical behaviors through a visual graph; retain table parity. |
| 4 | 1.9.3 Audio workflow verification and completion | Demonstrate author/import → edit → build → audible ROM playback → save/reopen for the declared supported audio scope. |
| 5 | 2.x Resource foundation and supported RE | Inspect, decode, edit and rebuild a declared set of assets and an audio-driver example with provenance; unknowns remain explicit. Pass the finite RE readiness gate below. |
| 6 | 3.0, 3.2–3.3 Hosted gameplay foundation | Two clients use a server-authoritative World with durable inventory and reconnect recovery. 3.1 traditional netplay is a separate optional branch. |
| 7 | 3.4.1–3.4.4 Economy and wallet items | Prove ordinary inventories and earned loot, audit the existing crypto project, validate minting on a test network, then validate consented loss settlement. |
| 8 | 4.0–4.3 Portable platform and tech deck | Branch after hosted foundations; real-value wallet launch is not a prerequisite. Prove develop/build/deploy, client and server roles on existing hardware; measure mesh feasibility; then validate a physical prototype. |

Large matches, voice, and collaborative creation remain 3.x extensions. Their milestone numbers do not make every extension a prerequisite for a tech-deck prototype. Continuous RE knowledge expansion also continues alongside later work after the bounded readiness gate passes.

**Immediate next work:** manually review the `re-runtime-1` picker repair using `docs/RE_OWNER_CHECKLIST.txt`, recording exact actions and observed results. Then use the owner's actual ROM and a specific stage/damage/enemy scenario as the next end-to-end acceptance target: connect runtime state discovery and event tracing to verified gameplay findings and genuine native audio/scene/collision decoding, while identifying unknowns. A fixture-only recovery pass or visual capture does not establish that outcome for the owner's ROM. In parallel, record the phone/OS/browser, affected ROM and reproducible steps for mobile lag; separate simulation speed, rendering, input latency and audio behavior; compare against the existing desktop reference before selecting any correction. Record physical-controller results when devices are available. These are host playback/input checks, not a restart of the accepted 1.8 Audio Runtime work. No arbitrary-ROM or NES-console compatibility claim follows from the successful tutorial ROM.

**September 28 implementation authority:** After the September 28 roadmap update, the owner instructed **“ok let's begin.”** This authorizes the bounded Mobile Play & Controller Support follow-up only, recorded in D046. Deliver **1.9.0 Gameplay Core — Alpha**, candidate **`mobile-play-1`**, with its own hash and verification. Acceptance/promotion and 1.9.1/1.9.2 or later work are not authorized by that instruction. Historical corrected-reference evidence below remains tied to its original artifact.

**September 28 update:** Record NES Forge's current maturity as a functional alpha and insert a bounded Mobile Play & Controller Support follow-up before Gameplay Expansion. Reconcile 1.9.0 status with the corrected candidate and September 17 re-audit, including its September 24 review correction. This roadmap edit records scope and priority; it does not claim implementation, build acceptance, or release promotion. The existing 1.9.1, 1.9.2, 2.x, and 3.x milestone assignments remain in place. The filename retains its original date to preserve this document's identity; the revision date above is current.
