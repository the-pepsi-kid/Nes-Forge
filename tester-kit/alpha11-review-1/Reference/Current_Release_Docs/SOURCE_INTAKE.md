# Inspect supplied source before migration

Source intake adds a read-only diagnostic report to **CODE → Open source workspace**. It helps you identify what a supplied source tree contains and what remains unresolved before attempting migration. It preserves the existing workspace, assembler and project framework.

## Try the examples

Open a `.nesforge-source.json` file from `examples/Source_Intake/` using **Open saved source workspace**. The Forge multi-file example is the existing supported build control. The DABG example preserves the independently supplied ca65 source, including binary assets and its build/linker inputs; its configured entry is `dabg.s`.

Select the source dialect before analysis. For DABG choose **ca65**. For the Forge example choose **forge-6502-v1**. Engine and version fields are declarations you supply, not inferred or authenticated facts. Leaving them unspecified keeps that uncertainty visible. A filename-based entry default is only a convenience: choose the actual entry used by the supplied build.

Choose **Analyze source** and review the report. It records current/original file identities, configured entry and build settings, literal dependency evidence, unsafe or unresolved paths, cycles, unsupported constructs and uncertainty. The on-screen inventory, dependency and diagnostic sections show bounded excerpts with omitted-row counts; exported JSON retains every recorded row. Use **Export intake report JSON** to save its JSON. This report is separate from the editable workspace and its ZIP backup.

The supplied DABG tree contains many unsupported foreign constructs. Its bounded report may reach the diagnostic cap and is then explicitly marked **incomplete**; this does not mean missing findings were validated. Check its generated Manifest for the actual measured coverage.

Whole-workspace identities include the configured entry and build settings. The original-byte workspace identity can therefore change when those settings change; each file’s original-byte hash remains the direct preservation check.

## Interpret the report

| Finding | Meaning |
|---|---|
| File inventory | The bytes currently supplied, including files outside the configured entry graph |
| Literal include or binary reference | An observed directive and its file/line; resolution uses the bounded workspace path rules |
| Missing or unresolved dependency | The referenced file was not resolved inside the supplied workspace; foreign include-search paths and generated files may still be required |
| Conditional or macro dependency | Text was observed, but this inspection did not execute the branch or macro to prove its active build dependency |
| Unsupported construct | The current Forge assembler profile does not establish support for that syntax or declared dialect |
| Linker configuration or build script | Supplied build inputs are inventoried; commands and linker semantics are not executed or reconstructed |
| No known lexical blocker | Inspection found no blocker within its scope; this is not a successful assembly, linking or gameplay-migration result |
| Incomplete inspection | A declared work/report limit was reached; omitted work is not counted as validated |

Symbols, external routines, macro expansion, relocation, linker allocation, cycle timing and total cartridge capacity require their own build/integration validation. Even a complete intake report cannot establish compatibility with every assembler or engine. Lua and host scripts remain source text, not cartridge-executable code.

## Preserve your work

Native edits continue to preserve original bytes. **Save source workspace** saves current and original files in workspace v1; **Export source ZIP** retains the established archive contents. Diagnostic declarations are session state and report metadata, so select the correct dialect again after opening a saved workspace. Successful replacement or opening the built-in example resets declarations to unspecified; a failed replacement keeps the existing document and declarations.

Editing files, changing entry/build settings or declarations, starting a replacement, or cancelling analysis invalidates the current report. A late analysis result must not overwrite newer work or become downloadable as current evidence. Report export uses the existing Save As path.

An explicitly declared foreign dialect blocks **Build source ROM** in this UI. Selecting the Forge profile is not translation: actual source must still pass the unchanged assembler and NROM builder. With unspecified declarations, the established build path remains available and checks the actual source. Source builds remain independent of the active authored game; intake never inserts generated gameplay, Audio, runtime hooks or source into the emulator.

## Evidence and remaining review

Automated cases inspect the actual standalone application, independent supplied files and exact parent behavior. Current outcomes belong to the matching candidate Summary and clean-extraction proof. Browser rendering, file pickers, keyboard interaction and native download dialogs still require browser evidence. No browser, listening, device/controller or physical NES acceptance follows from a VM test.

The next migration item requires a selected routine and an explicit integration contract: inputs/results, registers and flags, RAM/zero-page ownership, code placement, hook timing and resource budgets. This report provides intake evidence for that decision.
