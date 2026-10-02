# NES Forge — 2.0 Alpha Development Plan

Revision: October 2, 2026 (America/Denver). Direction adopted following the owner's “Ok, proceed,” cross-ROM clarification, and latest instruction to prioritize audio alignment. Audio correctness and workflow completion now precede further graphics/map recovery. This is the bounded working plan; no 2.0 executable or release promotion is claimed.

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

Subsequent RE candidates belong to **2.0 Alpha — RE development and required foundations**. The proposed next executable label is `2.0.0-alpha.1`; assign it when an implemented slice is ready for packaging. Preserve old candidate names, tags, source, hashes and test records. Version numbering does not itself require a schema bump.

The roadmap's original 2.0.1–2.0.5 foundation topics and 2.1–2.5 RE topics remain capability identifiers. The Alpha track can implement bounded pieces in dependency order. It does not imply the mapper-aware resource linker, complete raster model, Method Registry or live-edit architecture has already shipped.

Gameplay Expansion (1.9.1) and Behavior UX (1.9.2) remain deferred. Audio workflow verification (1.9.3) is now the first implementation priority, followed by native audio-driver recovery within the integrated 2.0 Alpha track. These remain distinct acceptance scopes; the capability label 1.9.3 does not require downgrading the integrated application. ASM source migration, further graphics/map recovery, Hosted Worlds, wallets and physical hardware remain later work.

## Immediate actions

1. Audit and reproduce audio correctness differences across Audio Studio preview, canonical data, compiled ROM execution and RE observations. Correct confirmed defects in a bounded candidate, preserving the existing services and native data model.
2. Close the supported author/import → edit → preview → build → audible playback → save/reopen workflow with a short repeatable audio workshop. Exercise the existing MIDI/MusicXML paths and music/SFX interaction. Record browser/mobile listening separately from automated register evidence.
3. Align RE audio evidence and recovery with that same canonical Audio model. Preserve the bounded Bridge Room control, then select an independent native audio-driver input and define a reusable adapter contract. Unknown drivers remain inspectable. Do not wait for graphics/map recovery to do this work.
4. Resume additional graphics/map recovery after the audio tranche is accepted, retaining the cross-engine requirements below. Add debugger features only where a concrete audio/recovery experiment needs them.

The re-runtime-1 R1–R6 review remains open and may overlap this work; prior results stay attached to their original bytes. Local Git history and the portable source bundle are already prepared. Selecting a GitHub destination or obtaining a physical controller is not a prerequisite for the audio audit. Unperformed browser/device checks remain explicit evidence gaps.

## First priority — Audio alignment and workflow completion

**Owner direction:** stabilize and connect audio before adding more unrelated functionality. Preserve the accepted 1.8 foundation while verifying its behavior in the current integrated application. RE inspection is present; broad native music/SFX recovery is not complete.

| Order | Deliverable | Acceptance evidence |
| --- | --- | --- |
| 1 — Audio correctness | Resolve reproduced note/timing/envelope, sequence-length or music/SFX differences between supported preview behavior and emitted ROM behavior. Document intentional limitations. | Expected notes and event timing are independently specified; compare canonical records, emitted APU behavior and listening. Exercise Pulse 1, Pulse 2, Triangle and Noise, order/loop boundaries and gameplay sound triggers. |
| 2 — Complete audio workflow | Author a short song and SFX; import supported MIDI and MusicXML; make an edit, build, play and save/reopen. Update the manual/workshop to match exact controls. | Native audio IDs/references survive persistence and undo; unsupported input fails explicitly. Listen in Forge and an independent emulator. Define any notation/performance export subset before claiming round-trip interchange. |
| 3 — Host playback alignment | Reproduce reported mobile A/V lag and verify audio activation, mute, pause/resume and frame-history behavior. | Record phone/OS/browser and ROM; distinguish emulation speed, host buffering and rendering/input delay. Do not infer a mobile performance pass from desktop or register-only tests. |
| 4 — RE audio alignment | Route supported decoded native notes/instruments/music/SFX into the existing canonical Audio model through the shared recovery boundary. | Keep register observations, inferred events and verified native-driver decoding distinct. Preview, explicit import, useful edit, save/reopen and rebuilt listening must work for the declared driver subset. |

Authored audio, MIDI/MusicXML imports and verified RE recovery converge on the same tracker/instrument/SFX data. No second song model is introduced. Raw APU-write logs remain evidence; they are not automatically editable songs or source-driver recovery. Unsupported effects/channels must retain evidence and clear diagnostics rather than disappearing.

The retained `audio-runtime180` suite reports 17/17 cases against the exact starting HTML and includes mock-DOM/bundled-emulator evidence. It does not certify browser speaker output. The next executable candidate requires focused regressions for each reproduced defect, the complete clean-extraction gate, exact hashes and separately reported listening/device evidence. This planning revision itself does not rerun or replace the frozen application reports.

### October 2 focused audit — first correction targets

These findings concern the exact starting reference above. They supplement, rather than rewrite, its retained 17/17 audio report and 895/895 overall report. No production correction is delivered by this planning update.

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

## Deliverables for each candidate

- Standalone Forge HTML and reproducible source package.
- Exact application/ROM identities and the supported input/engine contract.
- Decoder evidence, unknowns, adaptation notes and a short manual checklist.
- Complete clean-extraction automated reports plus separately labeled browser/device/listening evidence.
- Updated roadmap status and a bounded next step; no implied promotion of another milestone.

The current roadmap is `NES_Forge_ROADMAP_2026-09-15.md`. The retained filename preserves its identity; its revision date controls freshness. The local source-control handoff records actual commit/tag names and the commands needed to verify the reference.
