# NES Forge RC2 — sanitized public review candidate 1

**Status:** Experimental derivative for owner review; **not** a promoted release and **not** byte-identical to the original RC2 Build 5.

## Download

- [NES Forge RC2 Public Review Candidate 1 ZIP](../../public-review/rc2-build5/NES_Forge_RC2_Build_5_Public_Review_Candidate_1.zip)
- ZIP SHA-256: `18a2c67a390c974d8f5df32a956165a58e6fdfe5b7442d8fe5c876552550358a`
- ZIP bytes: 2,341,925
- ZIP Git blob SHA: `5c088e93ce27d2821c14743a7f20a3d46d944916`

## How this relates to private RC2 Build 5

Original owner-held RC2 archive: `NES_Forge_Consolidated_RC2_Build_5.zip` (46,302,037 bytes), SHA-256 `94b5533936851b0307ecc13dd16d08165c1618ab173ee574e9b629fc8228df5c`, packaged source commit `91d9f767a8e944ff4138790e47b87faafe41aeeb`.

This build derives from the **214 source parts** in that private archive. The generated public editor is 3,794,310 bytes with SHA-256 `c8f1871bc919adaab25c763820b3818ac61b5307bb67993f7a4ef41dae9da481`.

## Explicit redactions and consequences

1. Private `Recovery_Evidence/` results and all standalone ROM-derived images, CHR dumps, and recovery-project snapshots were **not copied** into the public package.
2. `app/src/re/external-recovery-catalog.js` was replaced with an inert catalog implementing the same three methods; the exact-match Castlevania recovered-project auto-import is **disabled**.
3. `app/src/re/recovery-evidence-catalog.js` was replaced with an empty catalog; original APU/CHR/OAM raw evidence exports from that embedded catalog are **disabled**.
4. Historical review logs, private Git bundle, hosted-world state, secrets and original commercial ROMs were **not copied**.
5. Remaining general source code and game-specific research annotations were **not subjected to a full independent rights review**. This is a sanitized review candidate, *not a blanket legal clearance*.

## Verification performed on the derivative

- Archive inspection and member inventory: 222 entries, no `.nes`, `.bin`, `.chr`, `.png`, `.jpg`, `.mp4`, `.pdf` or bundled original recovery data.
- New source manifest: 214 source modules, with the two known compressed proprietary source payloads replaced; no remaining continuous base64 payloads longer than 500 characters in the generated HTML.
- `python3 app/tools/bundle.py --check`: pass, reproducible same HTML SHA-256.
- Node VM application smoke: startup errors none; ProjectStore initializes; built-in starter project compiles to a 24,592-byte NES ROM; empty recovery evidence catalog verified.
- Chromium headless smoke **inconclusive** in this environment (did not complete before timeout). No successful full browser run, original ROM workflow, or physical console testing is claimed.
- This test record is not an RC2 test suite pass.

## How to use / rebuild

Extract the ZIP. Open `NES_Forge_Public_Review/NES_Forge.html` in recent Chrome/Edge. If file-scheme restrictions interfere, serve the folder from a local HTTP server. Regenerate the offline editor with `cd NES_Forge_Public_Review && python3 app/tools/bundle.py && python3 app/tools/bundle.py --check`.

The original, unsanitized RC2 archive is retained separately as a private owner-held checkpoint, not included in this public repository. Do not merge proprietary ROM-derived material into GitHub history.

**This public-review derivative should undergo further rights review and real-browser acceptance before any release or merge to main.**
