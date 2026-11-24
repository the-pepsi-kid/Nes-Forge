# NES Forge licensing and third-party provenance

**Status:** Initial notice inventory; full source-by-source rights audit is
not yet complete. This inventory is intentionally separate from the Apache
License 2.0 grant for original NES Forge contributions.

## Project license

- Original NES Forge source code and documentation contributed under the
  project's open-source license: **Apache License 2.0** (root `LICENSE`).
- Rights in third-party material are governed by the original rightsholders'
  applicable licenses, rather than automatically relicensed by this repository.
- No CLA or transfer of copyright is implied: each contributor retains
  ownership of their own work, subject to grants they provide.

## Known source credits to preserve

| Source | Attribution/terms already recorded in source | Follow-up |
|---|---|---|
| `app/src/re/game-re-index.js` | NinjaGaidenNES annotations: Akop Karapetyan; Apache-2.0 | Keep the source header and confirm any upstream NOTICE requirements |
| `app/src/re/game-re-index.js` | Zelda II annotations: Trax / FiendsOfTheElements; CC0 | Retain provenance, even where attribution may not be legally mandatory |
| `QA/package.json` | `jsdom` 26.1.0 and `jsnes` 2.0.0 declared as QA-time dependencies | Review the respective package licenses and transitive dependency notices for any distribution bundling them |
| `app/src/re/metatile-finder.js`, `experiment-*.js`, `bus-observer.js` (AL-EXP-01) | Method lineage only: CadEditor/AutoCorruptor (MIT, © 2018 spiiin) and NesBlockFinder, as cited by External Recovery Intelligence Audit 02. Independent implementations; no upstream code copied or translated; NesBlockFinder (no license found) was not used as a source | Keep the method credit; re-review before copying any upstream code |
| `QA/fixtures/al-exp-01/` | Original synthetic cartridges generated from seeds by the repository's own generator; Apache-2.0 | None; `verify_public_profile.py` pins them by SHA-256 |

## Boundary: code versus games

- The **editor, investigation tools, tests, native format decoders, local AI
  support tools, and original documentation** can be open source.
- The license does **not** cover commercial NES ROMs, imported PRG/CHR/audio
  bytes, screenshots or captures derived from protected games, user-supplied
  work, third-party marks, or third-party copyrighted game assets.
- Blockchain minting, SSTORE2 storage, ERC-721/1155/6551 integration and
  NFT ownership do **not** confer copyright or redistribute permissions.
- The public editor is built from `app/source-manifest.json`; provenance
  reviews must consider both source modules and generated historical copies.

## Before a licensing release is marked complete

1. Audit embedded code, artwork, fonts, fixtures, and archived checkpoints
   for third-party provenance and compatible distribution terms.
2. Confirm any original third-party license files or upstream NOTICE text
   that need inclusion.
3. Verify contributors' authorization to license their original work
   under Apache-2.0; do not assume an AI-generated contribution is free of
   third-party rights or constraints.
4. Run the existing publication verification pipeline without changing
   the public editor bytes as part of this documentation-only change.
5. Confirm `LICENSE`, `NOTICE`, and the README license statement are
   present before calling repository-wide licensing verified.

This document is a preliminary engineering inventory, not legal advice or
a guarantee that every file has been cleared for redistribution.
