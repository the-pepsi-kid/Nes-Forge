# NES Forge — 2.0 Alpha Development Plan

Revision: October 2, 2026 (America/Denver). Direction adopted following the owner's “Ok, proceed.” This is the bounded working plan for upcoming RE development; no 2.0 executable or release promotion is claimed.

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

## Numbering and scope

Subsequent RE candidates belong to **2.0 Alpha — RE development and required foundations**. The proposed next executable label is `2.0.0-alpha.1`; assign it when an implemented slice is ready for packaging. Preserve old candidate names, tags, source, hashes and test records. Version numbering does not itself require a schema bump.

The roadmap's original 2.0.1–2.0.5 foundation topics and 2.1–2.5 RE topics remain capability identifiers. The Alpha track can implement bounded pieces in dependency order. It does not imply the mapper-aware resource linker, complete raster model, Method Registry or live-edit architecture has already shipped.

Gameplay Expansion (1.9.1) and Behavior UX (1.9.2) remain deferred. Audio workflow verification (1.9.3), native audio-driver recovery and ASM source migration have distinct inputs and acceptance requirements. Hosted Worlds, wallets and physical hardware remain later work.

## Immediate actions

1. Complete the re-runtime-1 R1–R6 walkthrough and record the exact application, browser/device, ROM and observed results. Address reproduced defects on an isolated working branch. Preserve prior evidence against its original bytes.
2. Establish local Git history from the delivered package, with a reference tag that does not imply acceptance. Keep current planning outside the frozen `app/` snapshot. Select the private remote owner and destination before publishing to GitHub.
3. Inventory the supplied ROM corpus and define the next decoder's native layout and supported behavior. Use actual bytes, instruction origins and runtime experiments. Mark a proposed interpretation as inferred until independently checked.
4. Implement and review one end-to-end resource-recovery slice, then expand to a different engine. Additional debugger features should answer a concrete investigation need.

Current candidate review, corpus analysis, documentation and source-control preparation can overlap. An unavailable physical controller does not block independent read-only analysis. It remains an explicit device-evidence gap.

## 2.0-A — Native resource recovery into editable Forge content

**Outcome:** inspect a declared ROM, decode native resources with provenance, preview and explicitly import them into canonical Forge content, make a useful edit, save/reopen, rebuild and verify the relevant behavior.

| Slice | Concrete deliverable | Evidence required |
| --- | --- | --- |
| A1 — Additional graphics recovery | Recover the supplied Pepsi program's declared native background/palette/CHR representation through an in-app adapter, with a preview and explicit project import. | Source offsets and decoder steps explain the native construction. A Forge edit survives save/reopen and changes the rebuilt output. Runtime adaptations are declared. |
| A2 — Map/collision recovery on a different engine | Select an additional permitted ROM with actual map/collision records; decode a bounded room/map and its collision meaning. | Original behavior and decoded records agree. Editing a wall or traversable area changes the expected behavior in the rebuilt ROM. |
| A3 — Native audio recovery | Decode a declared music/SFX driver example into canonical Forge Audio, covering only its verified subset. | Decoded notes/events/instruments are justified; an audio edit changes the generated ROM, with listening results and APU evidence. Unrepresentable effects remain explicit. |

These are incremental candidates, not a promise that every slice fits in the first build. A1 alone cannot close the complete supported-RE readiness gate. A2 and A3 may use one additional ROM if its engine supplies both systems and each is independently verified.

The Pepsi investigation found a title/selection/vending/sold-out state model and credit changes. Do not invent health, enemies, levels, a collision engine or music for that file. A1 may adapt recovered graphics into a Forge runtime; it must not claim that this recreates the original vending-game logic.

## Corpus and independent checks

| Input | Role | Limitation |
| --- | --- | --- |
| `examples/RE_Bridge_Room/Bridge_Room.nes` | Retained positive control for the existing Native Room v1 decoder, collision and Pulse 1 activity. | A purpose-built fixture does not establish unfamiliar-engine recovery. |
| `tests/fixtures/re-runtime/pepsi_vending_v9e.nes` | Owner-supplied, different engine; native graphics construction and runtime state/credit evidence. SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a`. | No music/collision recovery claim follows from this input. |
| Additional independent ROM — to select | A distinct engine with actual native map/collision and/or audio data, unrelated to the existing Forge-generated or Bridge Room fixture formats. | Record exact hash, permission/source, mapper, scope, engine contract and expected behavior before accepting its adapter. |

Keep raw inspection open for unknown engines. Profile recognition may enable a decoder, but a whole-ROM hash match must not substitute for format validation. Test valid data edits within the declared format, malformed/truncated records, unsupported values and near-matching engines. User-supplied ROMs may be analyzed privately; permission to analyze is separate from permission to publish them as repository fixtures. Do not add unlicensed commercial ROM downloads.

Expected values must come from independently checked native records or original runtime behavior, not only from the decoder's own output. Distinguish original source, generated assembly, disassembly, native decoding and conversion to a different runtime.

## Per-slice acceptance contract

1. **Intake:** immutable original bytes and identity; static inspection remains independent of emulator or engine recognition.
2. **Native interpretation:** each recovered field identifies physical offsets, mapping and the decoding rule or observed construction routine. Compression/pointers/banks are interpreted only within the declared contract. Unknowns remain visible.
3. **Preview/import:** review supported assets and adaptation notes before an explicit validated, undoable import. Failure leaves the active project intact. Evidence JSON and editable project JSON remain distinct.
4. **Useful edit:** edit a meaningful graphic, collision property or musical event in Forge and verify the intended change. Preserve canonical IDs/references through native project save/reopen.
5. **Output:** build a ROM using the declared supported runtime. Verify the relevant original and rebuilt behavior; record differences caused by conversion. Bit-identical reconstruction and behavioral equivalence are separate claims.
6. **Preservation:** retain the existing regression suite and add independent checks for the new contract. Run the full gate on one cleanly extracted unchanged candidate; package source, exact hashes, commands and measured reports.
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

Mobile closeout should separately measure simulation speed, rendering, input delay and audio behavior on the reported phone/browser. Audio workflow completion should exercise existing manual authoring, MIDI and MusicXML paths through audible generated-ROM output and save/reopen; preserve the accepted 1.8 services. ASM migration needs representative source files, dialect/dependency preservation and declared integration hooks. Host Lua scripts are not automatically cartridge-executable 6502 code.

Before hosted/wallet implementation, pass the roadmap's finite audio/RE gate: a declared graphics/World recovery path and supported native audio-driver example, useful edits and rebuilt verification, working authoring/audio workflows, explicit limits and accepted evidence. Universal recovery and every hot-patch feature are not prerequisites. Server-authoritative worlds/inventories precede wallet settlement; portable software roles precede custom tech-deck hardware.

## Deliverables for each candidate

- Standalone Forge HTML and reproducible source package.
- Exact application/ROM identities and the supported input/engine contract.
- Decoder evidence, unknowns, adaptation notes and a short manual checklist.
- Complete clean-extraction automated reports plus separately labeled browser/device/listening evidence.
- Updated roadmap status and a bounded next step; no implied promotion of another milestone.

The current roadmap is `NES_Forge_ROADMAP_2026-09-15.md`. The retained filename preserves its identity; its revision date controls freshness. The local source-control handoff records actual commit/tag names and the commands needed to verify the reference.
