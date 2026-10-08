# NES Forge — 2.0 Alpha Development Plan

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

# NES Forge — 2.0 Alpha Development Plan

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

## Review sequence for this candidate

1. Confirm the application matches the frozen identity and measured clean-extraction evidence above.
2. Open the supported independent input in General ROM Analysis and explicitly analyze native audio.
3. Inspect song/channel/instrument/SFX evidence and unsupported conversion declarations.
4. Change a supported native command on the isolated copy; validate Undo/Redo, identity and changed-byte evidence.
5. Export/reopen the modified ROM, compare logical runtime effects and listen in an independent emulator; retain device/phone findings separately.
6. Continue the same Audio item with faithful canonical conversion and project persistence. The finite Audio/RE gate for later integrated systems remains open.

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

## Dependency sequence from this checkpoint

1. Review and resolve the supported Audio workshop/interchange workflow, including explicit listening and device results.
2. Complete the separately started native Audio driver method through source recognition, decoded evidence and bounded canonical conversion; verify edited rebuilds and preserve unsupported cases. The independent input is available; A3 acceptance is not yet complete.
3. Review the prepared physical-CHR and runtime-investigation slices against unrelated engines and declared boundaries, then continue native maps/collision and the remaining resource/mapper/raster foundations.
4. Review canonical Behavior UX and the supported source-workspace profile; implement gameplay breadth, real dialect/runtime-hook migration and reviewer/repository readiness under their explicit contracts.
5. Integrate authoritative Hosted Worlds and ordinary items only through the required game/session bridge and finite Audio/RE acceptance gate. The local host draft is supporting work, not milestone completion.
6. Continue optional wallet/mint/settlement, deployment roles and physical deck branches with their separate contracts and actual external/hardware evidence. Keep optional mesh asynchronous and distinct from frame-synchronous gameplay.

The six-phase roadmap and its detailed acceptance requirements remain preserved below. Prepared code can reduce future implementation work; it does not establish a passed manual, independent-engine, hardware, financial or release gate.

---

## Preserved prior revision and full historical requirements

The following October 7 revision is retained verbatim. Its then-current labels, limits, results and authorization statements apply to their historical artifacts; the October 8 update above controls the current implementation status. Nothing below is deleted or silently reassigned to alpha.6.


Revision: October 7, 2026 (UTC), Audio adaptive editing candidate. Audio correctness and workflow completion precede further recovery; Sol Games remains a later architectural reference. Alpha.1 audio corrections and alpha.2 mobile playback corrections remain preserved. Active **2.0.0-alpha.5 / audio-adaptive-1** starts from alpha.4 and preserves the owner-tested direct keyboard interaction. No promotion is claimed.

## October 7 owner review and workshop preparation

Owner-reported alpha.5 A1–A5 completion includes working arpeggio and envelope editing; exact device/browser/keyboard versions and candidate hash were not supplied. A6 listening remains NOT TESTED and is deferred by the owner's latest instruction. Existing browser-runner blocks, phone performance and physical-controller gaps remain explicit; no promotion is claimed.

Proceed with the existing Audio workflow by preparing its documentation and practice inputs. `NES_Forge_2.0.0-alpha.5_Audio_Workshop.zip` carries the unchanged HTML, an explicit Open Project walkthrough, four-channel music/SFX authoring/editing, original MIDI/MusicXML import inputs, save/reopen/build steps, and deferred listening checks. Its five package-input verification scenarios are separate from the existing 990-case gate, with modeled DOM/silent Web Audio adapters and no speaker or native-picker acceptance. Examples are files, not an in-app chooser. This supplement changes no executable and creates no alpha.6. Complete supported audible workflow acceptance before implementing native audio-driver recovery; all other phase ordering remains preserved.

## Current Audio adaptive editing candidate

Owner “ok, continue” authorizes the scoped Audio pilot. Add compact panels and tracker selection visibility around viewport/keyboard changes, plus touch/pen strokes on existing envelope canvases. The added device-width viewport declaration also activates existing narrow layouts in other tabs; review that explicitly. Preserve all 964 alpha.4 cases plus 26 new gesture/layout cases, for 45 suites. Actual fresh measured outcomes and browser/device limitations belong to the packaged reports. No schema, audio engine, compiler, import, emulator or broader editor rewrite is included. Use `docs/AUDIO_ADAPTIVE_CHECKLIST.txt`; then finish the Audio workflow/listening workshop and proceed to native audio-driver recovery.

## Preserved direct mobile keyboard correction

D055 supersedes D054 following the owner's request to bring up the keyboard on mobile and enter values as on PC. Tap the original tracker to request native keyboard focus; map committed text through the existing piano keys and canonical note-entry path. There is no separate form, Apply action or new envelope editor. Original envelope painting, desktop controls, undo/persistence and previous playback fixes remain unchanged.

Retain all 940 alpha.2 cases / 43 suites plus `mobile-keyboard200`, for 44 mandatory suites. The 18 withdrawn alpha.3 form cases are explicitly superseded, with their original source and results preserved historically. Actual fresh totals belong to the candidate Summary. Use `docs/MOBILE_KEYBOARD_CHECKLIST.txt` for physical keyboard, composition, focus and save/reopen review; VM checks are separate. Alpha.2 gameplay/audio-performance comparison remains pending.

Owner report October 7 UTC: “yeah it worked” confirms basic direct phone keyboard entry. Composition, focus/orientation, persistence, listening, hardware-controller and mobile performance acceptance remain separately pending.

The bounded source audit is complete: see `NES_Forge_Adaptive_UI_Audit_2026-10-07.md`. Its first implementation proposal is Audio adaptive editing: tracker/panel layout, selected-cell visibility with the native keyboard, and touch/pen envelope strokes through existing edits. No executable was changed. The proposal does not authorize a production rewrite or reorder approved work. Continue the supported Audio workshop, then native driver recovery.

## Preserved mobile playback correction

Owner direction October 5: “Ok, address them,” after mobile lag feedback and Cricket Dream 5G / Chrome identification. Candidate **2.0.0-alpha.2 / mobile-playback-1**, schema 12, addresses bounded frame scheduling, exact native capture work and a Play performance readout. CPU/APU/PPU behavior, capture fidelity, audio queue policy and desktop contracts remain protected.

Retain all 921 existing tests / 42 suites and add the mobile regression suite. Full clean-extraction results and exact source identity are packaged separately from blocked browser launches, phone testing and listening. Use `docs/MOBILE_PLAYBACK_CHECKLIST.txt` to compare the same unchanged ROM on old/new HTML. The owner's recorded app hash was not visible; phone improvement is pending measurement. This correction is phase 1 reliability work, followed by the supported audio workflow workshop, then native audio-driver recovery.

## Preserved audio correction candidate

**2.0.0-alpha.1 / audio-correction-1**, schema 12. HTML SHA-256 `4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0`. Dense music/SFX cursor advancement and channel-correct triangle timers are implemented. The required gate retains 895 cases and adds a focused audio-correction suite, for 42 suites. Actual outcomes and exact test provenance belong to the candidate reports and clean-extraction proof.

Review `docs/AUDIO_CORRECTION_CHECKLIST.txt` and the two projects under `examples/Audio_Correction_2.0.0-alpha.1/`. Automated CPU/APU execution does not establish speaker output, independent-emulator acceptance or mobile performance. Owner acceptance is pending. The next implementation scope is the audio workflow/listening workshop after the current bounded mobile correction review; new native RE adapters remain later.

## Starting reference

| Item | Exact reference |
| --- | --- |
| Application | 1.9.0 Alpha / re-runtime-1 / schema 12 |
| HTML SHA-256 | `e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d` |
| ZIP SHA-256 | `8cc66184914c21422b346bcbf60af19eb5da69046e13aeeea0aa9fa65037b0d0` |
| Automated result | 895/895 cases across 41 suites; 846 retained and 49 new runtime-investigation cases |
| Current manual review | R1–R6 in `app/docs/RE_RUNTIME_CHECKLIST.txt`; pending |
| Browser evidence | All three packaged browser runners blocked before any checks ran |

The application remains one standalone NES Forge environment. General static inspection can handle supported raw 6502 inputs independently of NES emulation. Runtime investigation depends on the existing NES emulator's execution support. Editable recovery requires a verified resource/engine contract.

## Cross-ROM architecture requirement

Forge's RE tools must be designed for arbitrary user-supplied NES ROMs and supported raw 6502 inputs, regardless of engine. Pepsi is one regression case; its layout, filenames, hash and game behavior must not define the shared recovery pipeline.

- **Shared core:** reusable discovery, source mapping, evidence/uncertainty records, resource descriptions, preview, validation and explicit canonical-project import. Unknown engines retain inspection and annotation; absence of a decoder must not prevent opening an input for analysis.
- **Reusable decoders:** implement documented resource formats, construction patterns and audio drivers through adapters with explicit inputs, validated structure and declared limits. Engine-specific knowledge belongs in adapters, not hidden game checks in the core. File identity supports provenance and regression tests; a filename or whole-ROM hash is never sufficient recognition of a supported format.
- **Breadth from the first graphics slice:** select unrelated ROMs before implementing graphics recovery. Accept the new graphics pipeline only after the same shared path works on at least two independently authored ROMs from unrelated engines, excluding Forge-generated and Bridge Room controls. Pepsi may be one input. Other native resource types require their own supported-format evidence.
- **Honest fallback:** arbitrary data can remain inspectable without being automatically understood. A finite set of decoders does not promise correct scenes, collisions, gameplay or music recovery from every ROM. Unsupported execution or ambiguous decoding must have explicit reasons and must preserve the input and active project.

This is an architectural and acceptance requirement for upcoming work, not a claim that current editable recovery is general. The delivered Native Room v1 / Bridge Room decoder remains a limited profile.

## Numbering and scope

Subsequent RE candidates belong to **2.0 Alpha — RE development and required foundations**. The first bounded audio-correction executable uses `2.0.0-alpha.1`, candidate `audio-correction-1`. Preserve old candidate names, tags, source, hashes and test records. Version numbering does not itself require a schema bump.

The roadmap's original 2.0.1–2.0.5 foundation topics and 2.1–2.5 RE topics remain capability identifiers. The Alpha track can implement bounded pieces in dependency order. It does not imply the mapper-aware resource linker, complete raster model, Method Registry or live-edit architecture has already shipped.

Gameplay Expansion (1.9.1) and Behavior UX (1.9.2) remain deferred. Audio workflow verification (1.9.3) is now the first implementation priority, followed by native audio-driver recovery within the integrated 2.0 Alpha track. These remain distinct acceptance scopes; the capability label 1.9.3 does not require downgrading the integrated application. ASM source migration, further graphics/map recovery, Hosted Worlds, wallets and physical hardware remain later work.

## Immediate actions

**Current candidate boundary:** adapt Audio layout and tracker selection visibility and add touch/pen strokes on existing envelopes, preserving direct native keyboard entry, with focused regressions and a complete clean-extraction gate. Retain the implemented audio and mobile playback corrections and their evidence. Package this as a review candidate before broadening into preview redesign, importer changes, new decoders or hosted functionality. Additional defects enter only after reproduction and explicit scope recording. The subsequent audio workflow candidate supplies the listening/workshop evidence; the whole audio phase is not claimed complete by the bounded code corrections.

1. Review the Audio adaptive candidate and preserved direct mobile tracker-keyboard entry, then finish the separate phone playback comparison while preserving the implemented audio fixes. Continue to distinguish audio correctness across Studio preview, canonical data, compiled ROM execution and RE observations; scope any additional reproduced defects explicitly.
2. Close the supported author/import → edit → preview → build → audible playback → save/reopen workflow with a short repeatable audio workshop. Exercise the existing MIDI/MusicXML paths and music/SFX interaction. Record browser/mobile listening separately from automated register evidence.
3. Align RE audio evidence and recovery with that same canonical Audio model. Preserve the bounded Bridge Room control, then select an independent native audio-driver input and define a reusable adapter contract. Unknown drivers remain inspectable. Do not wait for graphics/map recovery to do this work.
4. Resume additional graphics/map recovery after the audio tranche is accepted, retaining the cross-engine requirements below. Add debugger features only where a concrete audio/recovery experiment needs them.

The re-runtime-1 R1–R6 review remains open and may overlap this work; prior results stay attached to their original bytes. Local Git history and the portable source bundle are already prepared. Selecting a GitHub destination or obtaining a physical controller is not a prerequisite for the audio audit. Unperformed browser/device checks remain explicit evidence gaps.

## First priority — Audio alignment and workflow completion

**Owner direction:** stabilize and connect audio before adding more unrelated functionality. Preserve the accepted 1.8 foundation while verifying its behavior in the current integrated application. RE inspection is present; broad native music/SFX recovery is not complete.

| Order | Deliverable | Acceptance evidence |
| --- | --- | --- |
| Implemented reference — Audio correctness | Resolve reproduced note/timing/envelope, sequence-length or music/SFX differences between supported preview behavior and emitted ROM behavior. Document intentional limitations. | Expected notes and event timing are independently specified; compare canonical records, emitted APU behavior and listening. Exercise Pulse 1, Pulse 2, Triangle and Noise, order/loop boundaries and gameplay sound triggers. |
| Implemented reference, phone review pending — Host playback alignment | Reproduce reported mobile A/V lag and verify audio activation, mute, pause/resume and frame-history behavior. | Record phone/OS/browser and ROM; distinguish emulation speed, host buffering and rendering/input delay. Do not infer a mobile performance pass from desktop or register-only tests. |
| Current — Mobile Keyboard, basic owner phone report passed | Tap the original tracker for native keyboard input using the PC piano-key workflow; preserve original envelope painting. | Committed-text/composition handling, input isolation, canonical undo/save/reopen and desktop preservation. Actual phone keyboard/layout evidence remains separate from VM events. |
| Current candidate — Audio adaptive editing | Scoped implementation follows the audit; adapt tracker/panels and existing envelope touch/pen gestures while preserving direct entry. | All 964 retained cases plus new 26-case suite; fresh browser/phone editing and save/reopen evidence. Physical device acceptance and promotion remain pending. |
| Next — Complete audio workflow | Author a short song and SFX; import supported MIDI and MusicXML; make an edit, build, play and save/reopen. Update the manual/workshop to match exact controls. | Native audio IDs/references survive persistence and undo; unsupported input fails explicitly. Listen in Forge and an independent emulator. Define any notation/performance export subset before claiming round-trip interchange. |
| Then — RE audio alignment | Route supported decoded native notes/instruments/music/SFX into the existing canonical Audio model through the shared recovery boundary. | Keep register observations, inferred events and verified native-driver decoding distinct. Preview, explicit import, useful edit, save/reopen and rebuilt listening must work for the declared driver subset. |

Authored audio, MIDI/MusicXML imports and verified RE recovery converge on the same tracker/instrument/SFX data. No second song model is introduced. Raw APU-write logs remain evidence; they are not automatically editable songs or source-driver recovery. Unsupported effects/channels must retain evidence and clear diagnostics rather than disappearing.

The retained `audio-runtime180` suite reports 17/17 cases against the exact starting HTML and includes mock-DOM/bundled-emulator evidence. It does not certify browser speaker output. The current executable candidate requires focused regressions for each reproduced defect, the complete clean-extraction gate, exact hashes and separately reported listening/device evidence. The correction candidate has its own full gate and does not replace the frozen application reports.

### October 2 focused audit — first correction targets

These findings concern the exact starting reference above. They supplement, rather than rewrite, its retained 17/17 audio report and 895/895 overall report. The preserved audio-correction candidate implemented these two corrections with separate reports; the findings and old reference remain preserved.

| Finding | Evidence and scope | Required correction proof |
| --- | --- | --- |
| Dense-pattern music reader can fail to return | The compiler accepts a 128-row pattern with 64 note events. The generated reader's one-byte position advances in four-byte records and wraps before reaching its end marker. A focused execution at row 64 returns in 13 CPU instructions for the 63-event control, but fails to return within 20,000 instructions with 64 events. This directly exercised music; SFX shares the representation and requires its own check. | Safely handle the advertised pattern range, or reject unrepresentable data before emission with an explicit reason. Test boundary/event-density cases, music and SFX, and the shared viewer/single-room/World integration. No hanging generated reader. |
| Triangle pitch differs from authored preview | `audio-compiler.js` creates pulse timer values; `audio-engine.js` uses the same table for triangle. The bundled APU's triangle waveform has twice the pulse period at the same timer. Authored A4 previews at 440 Hz but the emitted triangle timer 253 implies approximately 220.20 Hz. Existing tests assert register activity without checking pitch. | Use channel-correct timer semantics, including arpeggio and note-range boundaries. Check actual emitted APU timing and audible pitch against independently specified expected notes. |
| Preview fidelity and mobile playback need explicit acceptance | Studio uses oscillator/white-noise preview; generated ROMs use NES APU behavior. Noise timbre, triangle amplitude limitations and envelope timing are not proven equivalent. Mobile lag has not been attributed to a specific fault. | Define supported preview agreement and label approximations. Measure original/compiled playback, pause/resume/navigation and trace/history effects on the reported device. Keep missing listening evidence distinct from code defects. |

Evidence sources: `app/src/audio/audio-compiler.js`, `audio-engine.js`, `app/src/legacy/00-editor.js`, `01-emulator.js` and `app/tests/audio-runtime180.cjs`. Reproduction files are retained under `planning/audio-audit/` in the source bundle. Native Room v1 remains a 16-row, constant-volume Pulse 1 recovery control; it does not establish multi-driver audio recovery. Existing timeline/RE tests already cover resumed PCM and trace-on/off parity, so preserve those checks rather than treating those features as absent.

Do not expand this tranche into DPCM, expansion audio, FL Studio project import, image/tablature transcription, a new synthesizer or an emulator rewrite. First make the supported four-channel workflow reliable. Hardware compatibility remains separately measured; an unavailable controller does not block audio development.

## 2.0-A — Native resource recovery into editable Forge content

**Outcome:** use one shared recovery workflow across unrelated ROMs: discover and decode supported native resources with provenance, preview and explicitly import them into canonical Forge content, make useful edits, save/reopen, rebuild and verify the relevant behavior. Format-specific adapters extend that workflow without replacing its core with game-specific paths.

| Slice | Concrete deliverable | Evidence required |
| --- | --- | --- |
| A0 — Shared recovery contracts | Define discovery results, physical source provenance, format validation, decoded resources, uncertainty, adaptation notes and validated preview/import interfaces independent of any game. | Different format adapters feed the same workflow. Unknown engines still open for inspection; unsupported or failed recovery leaves the active project intact. |
| A1 — Cross-engine graphics recovery | Recover supported CHR, palettes and native background representations through that shared workflow, using reusable format/construction adapters where needed. Pepsi is one possible test input. | At least two independently authored, unrelated engines beyond the controls pass native-source explanation, preview/import, useful edit, save/reopen and rebuilt-output checks. Source offsets and decoder steps explain construction; runtime adaptations are declared. |
| A2 — Map/collision recovery | Extend the shared resource contracts with reusable map/collision adapters for declared formats found in the selected corpus. | Actual native records and original behavior agree. Editing a wall or traversable area changes expected rebuilt behavior. Report the tested formats; graphics acceptance does not establish collision support. |
| A3 — Native audio recovery | Extend the shared workflow with a declared music/SFX driver adapter into canonical Forge Audio, covering only its verified subset. | Decoded notes/events/instruments are justified; an audio edit changes the generated ROM, with listening results and APU evidence. Unrepresentable effects remain explicit. |

These slice IDs identify capabilities, not implementation order. Following the audio-priority decision, implement the shared A0 contracts needed for A3 before resuming A1/A2. Keep A0 independent of whichever driver is first. A scoped first audio adapter establishes only its declared support, not general recovery; test structural variants, near-matches and unknown-driver fallback. Acceptance of the later A1 graphics pipeline still requires its cross-engine evidence. Neither A1 nor A3 alone closes the complete supported-RE readiness gate. Broad support grows through reusable decoders and discovery tools, not a game-name allowlist.

The Pepsi investigation found a title/selection/vending/sold-out state model and credit changes. Do not invent health, enemies, levels, a collision engine or music for that file. Recovered graphics may be adapted into a Forge runtime; this must not be presented as recreation of the original vending-game logic. These observations constrain this test case only, not the features or architecture offered to other ROMs.

## Corpus and independent checks

| Input | Role | Limitation |
| --- | --- | --- |
| `examples/RE_Bridge_Room/Bridge_Room.nes` | Retained positive control for the existing Native Room v1 decoder, collision and Pulse 1 activity. | A purpose-built fixture does not establish unfamiliar-engine recovery. |
| `tests/fixtures/re-runtime/pepsi_vending_v9e.nes` | Owner-supplied, different engine; native graphics construction and runtime state/credit evidence. SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a`. | No music/collision recovery claim follows from this input. |
| Independent audio-driver ROM — select for A3 | A permitted, independently authored input with actual music/SFX data, beyond the Forge/Bridge Room controls. Define source records and expected audio behavior before adapter implementation. | A single driver proves only its declared format. Preserve cross-engine architecture and expand tests as additional driver support is claimed; Pepsi is not a positive music-recovery fixture. |
| Additional independent ROM(s) — select before A1 implementation | At least one independently authored engine unrelated to Pepsi and the Forge/Bridge Room controls, to test the same graphics workflow with a different native representation. Include actual native map/collision and audio data in the corpus for later slices. | Record exact hash, permission/source, mapper, supported formats and expected behavior. Add more inputs if the graphics pair does not supply map/collision or audio examples. |

Keep raw inspection open for unknown engines. Profile recognition may enable a decoder, but a whole-ROM hash match must not substitute for format validation. Test valid data edits within the declared format, renamed inputs, malformed/truncated records, unsupported values and near-matching engines. A changed fixture hash must not block structurally valid data. Check an unknown-engine input reaches inspection without invented resource claims. User-supplied ROMs may be analyzed privately; permission to analyze is separate from permission to publish them as repository fixtures. Do not add unlicensed commercial ROM downloads.

Expected values must come from independently checked native records or original runtime behavior, not only from the decoder's own output. Distinguish original source, generated assembly, disassembly, native decoding and conversion to a different runtime.

## Per-slice acceptance contract

1. **Intake:** immutable original bytes and identity; static inspection remains independent of emulator or engine recognition.
2. **Native interpretation:** each recovered field identifies physical offsets, mapping and the decoding rule or observed construction routine. Compression/pointers/banks are interpreted only within the declared contract. Unknowns remain visible.
3. **Preview/import:** review supported assets and adaptation notes before an explicit validated, undoable import. Failure leaves the active project intact. Evidence JSON and editable project JSON remain distinct.
4. **Useful edit:** edit a meaningful graphic, collision property or musical event in Forge and verify the intended change. Preserve canonical IDs/references through native project save/reopen.
5. **Output:** build a ROM using the declared supported runtime. Verify the relevant original and rebuilt behavior; record differences caused by conversion. Bit-identical reconstruction and behavioral equivalence are separate claims.
6. **Breadth and preservation:** retain the existing regression suite and add independent checks for the new contract, including structurally valid data changes, false-positive recognition and unknown-engine fallback. For A1, require the cross-engine corpus above and verify both adapters use the shared recovery/import path. Run the full gate on one cleanly extracted unchanged candidate; package source, exact hashes, commands and measured reports.
7. **Review evidence:** record actual browser interaction, listening and independent-emulator results where applicable. Keep absent hardware or device evidence explicitly unverified. Obtain owner acceptance of the supported slice before calling it accepted.

A successful finite corpus establishes its declared supported scope. It does not establish universal scene, collision, gameplay or music recovery from arbitrary ROMs.

## Foundation work driven by the slice

- Use the existing ProjectStore, AssetRegistry, BuildGraph, RuntimeCompiler and EmulatorBridge boundaries.
- Add stable resource identity, source mappings and mapper/profile validation where the recovered content requires them.
- Preserve time-dependent rendering distinctions: **Captured**, **Represented**, **Compilable**. Observing writes is not a complete raster model. Refuse unsupported reconstruction instead of flattening it into a misleading static NROM output.
- Preserve schema 12; any necessary schema change requires a separate compatibility/migration decision. Retain the five templates, 12-executable-actor limit and 64-persistent-byte limit within this scope. Keep Door Option B and the documented partial recovery/one-way synchronization contracts visible.
- Preserve authoring, save/reopen, build, emulator/capture, Save As, CHR rendering and undo behavior. A new RE convenience must not implicitly modify the authored project.
- Breakpoints, CPU read watches, restorable named checkpoints, scripted input, RAM/ROM patches and verified game-specific stage/damage/enemy actions remain distinct implementation slices. A/B RAM observations do not supply those capabilities.

## Parallel work and entry to later eras

The audio-related mobile investigation is included in the first-priority tranche above. Other controller/device checks may continue independently. Further graphics/map recovery and ASM migration resume after audio closeout; ASM migration still needs representative source files, dialect/dependency preservation and declared integration hooks. Host Lua scripts are not automatically cartridge-executable 6502 code.

Before hosted/wallet implementation, pass the roadmap's finite audio/RE gate: a declared graphics/World recovery path and supported native audio-driver example, useful edits and rebuilt verification, working authoring/audio workflows, explicit limits and accepted evidence. Universal recovery and every hot-patch feature are not prerequisites. Server-authoritative worlds/inventories precede wallet settlement; portable software roles precede custom tech-deck hardware.

The authoritative roadmap now groups execution into six phases: audio/reliability; reusable RE recovery; creator portability/reviewer readiness; authoritative Hosted Worlds/items; optional wallet/earned-loot integration; and portable roles/hardware. Creator portability can coordinate with RE after audio closeout. Complete the creator/runtime contracts needed by a hosted slice without making every ASM dialect, gameplay template, visual graph or debugger tool an indefinite prerequisite. Portable software branches after accepted hosted foundations and does not wait for wallet launch, voice or large matches.

The October 4 Sol Games v0.2 source consideration informs phase 5 only. Preserve its separation of item definitions, entitlement providers and runtime application, but do not merge its FCEUX/Python/filesystem implementation into the current candidate. Forge-authored item behavior should use canonical bindings and sound events; imported games require verified mappings. See roadmap section 3.4.2 for the exact source identity, reuse candidates and unverified scope.

Keep one active implementation candidate. Documentation, candidate review and private source-control/CI setup may proceed alongside it. New ideas remain recorded under their phase until deliberately selected. All release labels remain provisional until an implemented candidate is packaged and its evidence is attached to exact bytes.

## Deliverables for each candidate

- Standalone Forge HTML and reproducible source package.
- Exact application/ROM identities and the supported input/engine contract.
- Decoder evidence, unknowns, adaptation notes and a short manual checklist.
- Complete clean-extraction automated reports plus separately labeled browser/device/listening evidence.
- Updated roadmap status and a bounded next step; no implied promotion of another milestone.

The current roadmap is `NES_Forge_ROADMAP_2026-09-15.md`. The retained filename preserves its identity; its revision date controls freshness. The local source-control handoff records actual commit/tag names and the commands needed to verify the reference.
