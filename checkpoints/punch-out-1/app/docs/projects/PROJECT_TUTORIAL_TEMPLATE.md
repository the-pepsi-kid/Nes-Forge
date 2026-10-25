# Project tutorial template

Copy this structure for a newly supported title. Replace the instructions with actual observed steps and source-backed facts; do not publish an unfilled template as a verified title tutorial. The template is reusable for games with different methods. It does not prescribe a common game data format.

## 1. Outcome and exact input

State one concrete learner outcome and the scope of the checkpoint. Record title, region/revision, byte length, source SHA-256, mapper/container, application SHA-256, source commit and relevant adapter IDs. List admitted derivatives separately. Explain how the learner obtains and keeps their own input. Do not embed source-bearing projects or game payloads in the tutorial.

Name each deliverable: the standalone application HTML, project JSON, native rebuilt ROM, independent patch/notes, and any separate authored ROM. Explain what is preserved in each and how to reopen it. Record the exact tested browser/tool/runtime versions when they are known; do not infer them.

## 2. First successful edit

Give numbered steps from a fresh app, using actual button labels and selectors. Include the source area/page/state, coordinate convention, valid replacement ID, expected visual change, and any aliases it also changes. Identify a route or reproducible setup for seeing it in the original engine. If that route has not been verified, say so.

Require the learner to check an unchanged native build first, then edit → Undo → Redo → Save Project As → reopen → build → reimport → inspect/play. Explain whether a reference image is derived from setup code, a bounded trace or actual live capture. Each result needs the right claim.

## 3. Every asset and its owner

Use a table with columns: domain, source format/ranges, runtime context, canonical record/editor, supported edits, native writer, evidence and gaps. Include at least:

- Background/sprite CHR, raw versus assembled views, graphics loads and bank selection.
- Tile/metatile placement, attributes, color palettes, scrolling and raster effects.
- Sprite placement/priority, metasprites, animations, duration units and state dependencies.
- Collision, actors/AI, behavior, hitboxes, entities, items and persistence.
- World layout, scene links, doors/entrances/exits, camera and travel rules.
- Menus, text, HUD, alternate states and transitions.
- Code, RAM, pointers, executable routines and source/disassembly distinctions.
- Music, SFX, instruments/envelopes, sample banks, request routing and event links.

Use explicit statuses such as source inspection only, copied editable asset, supported native field, or unresolved. A blank cell cannot stand for support. Document the actual shared-write owner and all affected views.

## 4. Source format lesson

Show the relevant container and bank windows, a verified CPU-address-to-file-offset example, endianness and pointer base. Explain compression, termination, budgets, inherited state, clipping and aliases. Separate physical tile IDs from any projected atlas indices.

Show the original loader's inputs and outputs. Explain how an independent comparison avoids reproducing the decoder's own mistake. Include a small synthetic codec exercise with no commercial asset bytes. Document fixed-capacity refusal, malformed input, unsupported state and conflicting-alias behavior.

## 5. Visual editing recipes

Write a separate worked recipe for each supported domain. Each needs prerequisites, actual control labels, an expected result, save/reopen, build path, original-engine check and failure recovery. Describe which tabs are populated on intake and which require an explicit materialization action. Never send a learner to an empty tab without explaining why.

For a blocked domain, explain what can be inspected or saved, why native rebuilding refuses, and what decoder/writer work is still needed. Explain how to preserve that experiment separately and return to a native-buildable baseline.

## 6. Audio recipe

Record the exact driver/profile, catalog counts by cue type, valid controls, default selection, source banks and request meaning. Give a native audition example and an editable-conversion example when available. Show the declared timing window, representability limits, import effect on order/tempo, Undo/Redo and reopening.

Check Audio from the rebuilt native Scene output as well. Explain whether authored tracker changes have a native writer. A finite score or APU trace does not establish lossless music recovery, game event bindings or native Audio writing. Missing Audio remains an explicit open item under `reviews/PROJECT_VERIFICATION.md`.

## 7. Independent RE, assembly and external hex work

Give a workflow that does not require Forge automation: record identities, choose an external debugger/disassembler/toolchain, map the active bank, follow source consumers, form a hypothesis and compare its outputs. Refer to capabilities rather than recommending unverified tool versions.

For a worked hex patch, record exact source hash, physical offset, expected original bytes, new bytes and every affected consumer. Write a new output, compare all changed ranges and test the original engine. Different code/palette/CHR edits may require new recognition; never disable identity checks merely to accept them.

For code edits, explain entry/callers, CPU versus file addresses, reserved space, relocations, vectors, stack, RAM and timing. The CODE editor in a preserved native project is not an unrestricted native code injector. Disassembly is not automatically complete rebuildable assembly.

## 8. Modify the app and produce standalone HTML

List exact source modules and their contracts, public APIs, manifest order, HTML module markers and transaction boundaries. Explain how UI preview stays detached, how stale materialization is rejected, how Undo/Redo and save/reopen work, and how the writer restricts bytes.

Provide deterministic bundle/check commands and a small worked application modification. Explain that direct HTML edits need to be ported back to modular source before regeneration. Verify the application contains no embedded private game/project data.

## 9. Make a separate standalone game

Name the intended output: a rebuilt original-engine ROM, a newly authored Forge ROM, or a customized Forge HTML. They are separate exercises.

For a new authored ROM, begin with a separate authored project; import only supported asset types, preserve stable IDs/references, select a supported build backend, and implement missing gameplay deliberately. List retained semantics and adaptations. Do not imply that deleting `nativeGame` converts an arbitrary imported game into an authored one. Validate the separate ROM in another emulator and explain the outstanding controller/hardware tests.

## 10. Evidence, troubleshooting and learner checklist

Link source files, commands, reports and owner acceptance. Record report identities and distinguish historical evidence from checks rerun for this checkpoint. Include likely symptoms, diagnosis and recovery. Add checks for malformed input, overflow, aliases, protected bytes, stale preview, one Undo transaction, persistence and retained features.

End with the learner's concrete outputs and remaining work, including unrecovered domains and unsupported writers. Keep a change log of documentation scope. Update this chapter whenever the title's method changes; do not call its tutorial finished because the importer recognizes a filename.
