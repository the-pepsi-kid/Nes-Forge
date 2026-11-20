# ROM capability audit

`tools/audit/rom_audit.cjs` measures what NES Forge can actually do with each exact ROM revision. It drives the editor through `Forge.commands`, the same path as the UI, instead of trusting documentation.

```bash
node tools/audit/rom_audit.cjs --roms <folder of your .nes files> --packs <folder of extraction ZIPs> --out <private folder>
node tools/audit/rom_audit.cjs --report-only --out <private folder>     # rebuild the report from saved results
```

Each ROM runs in a fresh editor, and the audit records:

- identity: hash, header and corrected mapper
- the editor's own intake statement
- an import through `rom.import`
- every resource with its editability level (rebuild, edit copy, ownership unknown, visible, none)
- whether the unchanged import rebuilds the original ROM byte-for-byte
- save and reopen
- the native audio catalog
- which extraction packs match the ROM

The output holds titles, hashes, counts and capability states only: no ROM bytes and no decoded game data. Run it on your own ROMs and keep the per-ROM folder private.

## Reports

- [2026-11-19](2026-11-19/AUDIT.md): the 20-revision alpha.12 corpus. This is the 16 QA cartridges plus Castlevania PRG 0 and PRG 1, Gun.Smoke and Double Dragon.
