# Integrated Review 6 · public GitHub profile

Public build of **NES Forge 2.0.0-alpha.12**. Its editor is generated from the ordered source parts in `app/source-manifest.json`. `python app/tools/bundle.py --check` reproduces it byte-for-byte, and `CANDIDATE.json` records its hash.

What changed: [release notes](docs/releases/2.0.0-alpha.12.md). The previous public profile is kept in [docs/reviews/Integrated_Review_5_public_profile.md](docs/reviews/Integrated_Review_5_public_profile.md).

## Publication boundary (unchanged)

- The private embedded capture catalogs stay replaced by inert services. Native source-on-demand decoders are intact.
- No commercial ROMs, extraction ZIPs, private evidence, databases or wallet data are published. `QA/r` holds only the four authored regression cartridges.
- The audit report in `docs/audit/` contains titles, hashes, counts and capability states only.

## Checks for this build

- **On every pull request (CI):**
  - bundle check
  - launch entries
  - build identity
  - public profile
  - Agent Lab tests
  - the repository QA suite: zip limits, pack checker, command core, ROM audit, release migration, the editor/domain suites and the host suites
- **Owner-side runs with private inputs:**
  - the 18 extraction packs: intake, native rebuild, animation
  - the 16-cartridge corpus
  - the real-browser check at 1440×900 and at 390×844 with touch, including the studio layout and the spatial preview

## Remaining acceptance

These are unchanged from Review 5:

- complete native recovery and broader native writers
- original-game parity
- audible output and latency
- physical hardware
- full device acceptance, including immersive VR/AR on headsets
- two-human hosted/wallet play

The planned alpha.13 work is the larger cartridge build profile, the Castlevania → Contra crossover slice and the Punch-Out pose-layout writer.
