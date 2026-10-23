# NES Forge · Punch-Out intake and capture correction

Import ROM and Open ROM / project now start with a completed pixel-validated native frame, including sprites, palettes and scroll. Source Audio recognizes 84 entries after import/reopening and accepts equivalent iNES padding bytes 12–15. Re-import the original ROM to create the corrected scene; preceding saved projects retain their original projections and recipes.

Read reviews/punch-out-fix-1/HANDOFF.md and Owner_Checklist.md. The v2 background templates use the source's physical mirroring and FD/FE fills, and retain a bounded 574-byte native writer. Complete captured-frame native writing, native Audio/sample writing, complete fights and hardware accuracy remain unsupported. MMC2 capture is exact against the existing scanline emulator's completed frame.

Current evidence: 97 public checks across nine suites, 12 actual intake/workflow groups, four full-catalog/native-template groups, and 150 unchanged predecessor bundle inputs. The older 403 supplied-input cases and historical 25-suite gate remain archived, not counted as fresh reruns. Browser listening and physical device acceptance remain owner checks.

Build: `python3 app/tools/bundle.py --check`. Public checks: `python3 reviews/punch-out-fix-1/run_checks.py`. Supplied originals: `node reviews/punch-out-fix-1/verify_intake.cjs /path/to/private-roms` and `node reviews/punch-out-fix-1/verify_catalog.cjs /path/to/private-roms`. Source preservation: `python3 tools/verify_punch_out_fix_source.py`.

No commercial ROM, music/sample payload, screenshot or source-bearing commercial project is included. Main and preceding checkpoints are preserved.
