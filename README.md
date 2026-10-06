# NES Forge — mobile-playback review branch

This branch carries **2.0.0-alpha.2 / mobile-playback-1**, schema 12. Its bounded changes cover frame scheduling, exact native-capture work and a Play performance readout. The audio-correction candidate remains preserved as the predecessor. Phone improvement, listening and owner acceptance require their own evidence. No main merge, release promotion, hosted repository or remote push is represented here.

## Branches and identities

| Reference | Contents |
| --- | --- |
| `work/mobile-playback-1` | Current mobile review candidate. `app/` matches the final candidate ZIP exactly, including measured reports and checksums. See `CANDIDATE.json`. |
| `work/audio-correction-1` | Preserved 2.0.0-alpha.1 audio candidate at `bd1d46e5fe3eb575c22abcb377841534f197469c`, with its own 921/921-case evidence across 42 suites. |
| `main` | Preserved pre-correction application and October 4 planning history at `45d0b31bf30d67b013ce8e1cb6c4dbdfd709baec`. |
| `reference/re-runtime-1` | Annotated historical reference tag at `86fdbf4639389be01c9af8c8860a44566a62d83d`; not an accepted release. |

`REFERENCE.json` and `tools/verify_reference.py` describe the retained **1.9.0 / re-runtime-1** predecessor. Use that verifier after checking out `main` or the reference tag. The audio branch has its own `CANDIDATE.json`; the mobile branch has the current mobile candidate record.

Current roadmap and plan snapshots are in `planning/`. Application-relative paths in those documents use `app/` as their root. Review the mobile candidate through `app/docs/MOBILE_PLAYBACK_CHECKLIST.txt`, using the same unchanged ROM on the old and new HTML. Recorded Cricket Dream 5G / Chrome feedback does not by itself identify a tested build or demonstrate improvement in this candidate.

## Open and verify the mobile candidate

Open `app/mainline/NES_Forge_2.0.0-alpha.2.html`.

From the repository root:

```sh
python3 app/tools/bundle.py --check
```

This checks source-to-HTML reproduction without changing the application. **940/940 automated cases passed across 43 suites** on the tested clean extraction. Measured results are in `app/test-results/candidate/Summary.json`; clean-extraction proof is `app/checkpoints/mobile-playback-1-clean-extraction/Reproduction.json`. See `CANDIDATE.json` for final package identity and measured counts. Browser launches, phone testing, speaker output and independent-emulator listening remain separately labeled evidence.

Run further tests in a disposable copy of `app/`, because the runner rewrites reports. The full gate command inside that copy is `node tests/run_candidate.cjs`. Node.js 20+ and Python 3.9+ support the supplied tooling. The HTML application itself is standalone.

## Portable restore

The separate mobile source-control ZIP contains a complete Git bundle, handoff and verification record. Preserve all three local branches before removing the bundle-file remote:

```sh
git clone --branch work/mobile-playback-1 NES_Forge_Local_Repository.bundle NES_Forge
cd NES_Forge
git branch main origin/main
git branch work/audio-correction-1 origin/work/audio-correction-1
git remote remove origin
```

No online account or credentials are needed to clone the bundle. With a clean working tree, switch to `work/audio-correction-1` to inspect the retained audio candidate or `main` to inspect the older reference. For the original reference verification:

```sh
git switch main
python3 tools/verify_reference.py
git switch work/mobile-playback-1
```

The old planning/audio-audit probes remain historical defect evidence. Their success condition is reproduction of the predecessor's defects, so they are not the mobile candidate's acceptance suite.

## Publication and licensing

No remote is configured. Licensing remains **UNDECIDED**; existing notices remain as supplied. The owner will select any private GitHub destination and decide publication separately. The earlier planning and audio source-control kits remain dated handoffs. This mobile candidate has a separate source-control delivery and remains a review branch until accepted and deliberately promoted.
