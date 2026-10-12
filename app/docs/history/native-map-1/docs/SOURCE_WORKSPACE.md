# Multi-file source workspace

This candidate adds a bounded source migration workflow in **CODE → Open source workspace**. The workflow keeps its files separately from the active Forge project. Building source does not replace the project, load the emulator, or insert generated gameplay or Audio Runtime code.

Use **Open multi-file example** for a self-contained starting point. It has an entry file, two included source files, a macro, binary data and vectors. **Build source ROM** assembles a real mapper 0 ROM. Download the result, switch to EMULATOR and load that ROM to test it. The example deliberately displays no graphics; its reset routine reads the inserted data byte `70` into RAM `$0000` and then loops. The regression runs the resulting ROM's CPU instructions and verifies that behavior.

## Supported workflow

1. Import source files or a source folder. Folder import retains the browser's relative paths, including the selected folder name.
2. Select an entry file and 16 or 32 KiB PRG. Select mirroring and either an 8192-byte CHR file or CHR RAM.
3. Pick a file in **Edit file**. Use the native text editor. Changing files, building or exporting commits the text draft into the workspace. Original imported bytes remain preserved.
4. Build. Errors show source paths and one-based line numbers, including errors inside included source. Macro diagnostics point to the invocation line, as in the existing assembler.
5. Download the source ROM, expanded ASM, and/or symbols and source map. The source map describes preprocessing; it is not an instruction-by-instruction debugger map. Symbols are actual values published by the assembler.
6. **Save source workspace** before closing the page. Reopen its `.nesforge-source.json` through **Open saved source workspace**. This is separate from the ordinary project JSON workflow.

**Export source ZIP** contains `workspace.nesforge-source.json`, the current file tree under `current/`, and the original imported file tree under `original/`. Bytes are preserved exactly until a user edits a file; edited text is encoded as UTF-8. Exported ZIP names explicitly use UTF-8. Extract the ZIP and open its workspace JSON to restore it. ZIP import is not part of this initial source profile.

## Declared dialect and build profile

The dialect is `forge-6502-v1`: the existing Forge assembler's official 6502 instructions, constants, labels, expressions, macros and data/reserve directives. The source workspace adds deterministic preprocessing of:

```asm
.include "src/boot.asm"
.incbin "assets/data.bin"
```

Paths are case-sensitive and relative to the including file. `../` can refer to a parent inside the workspace; paths that leave its root are rejected. Absolute paths, drive prefixes, backslashes and control characters are rejected. Includes use one literal quoted path. Binary offset/length arguments and computed include paths are not supported. `.incbin` inserts bytes into PRG at the current assembly address. The separately selected CHR file becomes CHR ROM.

The profile emits an iNES mapper 0 image with 16/32 KiB PRG and either 8 KiB CHR ROM or CHR RAM. It requires all three vectors and an emitted PRG target for each vector. It rejects writes below `$8000`, PRG mirroring aliases, overlaps, and unsupported sizes. There is no battery, mapper switch, object linker, memory allocator, or generated-runtime hook in this profile.

The workspace does not translate ca65, NESASM, NESmaker-specific scripts or Lua. Foreign source is retained as files, while an unsupported statement or dialect receives an explicit build error. Lua entry files receive a host-language diagnostic. There is no source evaluation as JavaScript. No cross-engine migration or original-game behavior equivalence is claimed from the included example.

## Bounds and isolation

The workspace supports 256 files, 1 MiB per file, 4 MiB of current bytes and 4 MiB of preserved originals. Expanded source is bounded to 1 MiB / 65,536 lines, include depth 32 and 512 include visits. Individual binary insertions cannot exceed 32 KiB. Macro recursion and expansion are checked before invoking the existing assembler, including a 65,536-visit bound for empty macro fan-out, emitted macro-label accounting, and expansion-size estimates before parameter substitution.

The build adapter temporarily supplies expanded source to the existing assembler, captures its writes and symbols, and restores the project's assembly source, diagnostics and binary state in a `finally` block. The editor project and emulator remain unchanged on success and failure. UI text edits invalidate a prior build so it cannot be downloaded as the current result. File and saved-workspace imports also check the source revision after asynchronous reading: edits or build-setting changes made while an import is loading cause the replacement to be refused, retaining the current work.

Automated verification lives in `tests/source-workspace.cjs` and `tests/source-workspace-ui.cjs`. It covers ROM execution, original byte/ZIP round trips, deterministic output, alias/vector/encoding/path errors, bounded includes and macros, failure isolation, imports, native editing contracts, source configuration, exports, cancellation and stale asynchronous reads. DOM harness checks do not establish a physical mobile keyboard, visual layout or browser download-dialog pass.
