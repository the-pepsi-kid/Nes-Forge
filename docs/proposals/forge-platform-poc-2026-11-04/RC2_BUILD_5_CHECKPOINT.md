# RC2 Build 5 — review checkpoint (not a promoted release)

This record identifies the owner-held **NES Forge Consolidated RC2 Build 5** package reviewed alongside the concept proposal.

- Package: `NES_Forge_Consolidated_RC2_Build_5.zip` (46,302,037 bytes)
- SHA-256 (actual archive): `94b5533936851b0307ecc13dd16d08165c1618ab173ee574e9b629fc8228df5c`
- Original local integration branch: `integration/forge-consolidated-rc2`
- Original bundled commit: `91d9f767a8e944ff4138790e47b87faafe41aeeb`
- Original public main baseline: `6d07f1875074f1b3388cd647ff6177423d45acc7`
- Standalone editor: `NES_Forge.html` (4,231,502 bytes)
- Editor SHA-256: `556d50459c31bfd28da012ec3f0a0c062896637d7d6c327c287f9680755ff7b6`
- Source manifest: 214 editor modules
- Status: local owner-review candidate; not a release and not complete native ROM recovery.

**Distribution hold:** The full ZIP is NOT included in this public repository branch. It contains `Recovery_Evidence/` and other extracted commercial-game material, including original Castlevania CHR and scene artwork. The kit is meant for private owner review and must be sanitized before publication. No commercial ROM files were found as loose `.nes` entries in the archive, but that does not make extracted proprietary graphics distributable.

The archive also includes obsolete logs and generated editor copies; historical test results are not necessarily rerun against this editor hash. The audit and review in this directory distinguish independently checked facts, retained test evidence and unverified workflows.

**Next packaging action:** Prepare a public, rights-cleared code/editor build and a separate private evidence archive. Preserve the exact original RC2 hashes as a local provenance record. Do not label a sanitized derivative as byte-identical RC2 Build 5.

See `NES_Forge_Project_Audit_2026-11-04_Rev3.md` and `NES_Forge_Audio_Image_Hardware_Stellar_Review_2026-11-04_Rev2.md`.
