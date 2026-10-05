# NES Forge — audio-correction review branch

This branch carries **2.0.0-alpha.1 / audio-correction-1**, schema 12. It corrects dense music/SFX stream advancement and triangle timer values. The candidate remains subject to owner review and separate listening/device evidence. No release promotion, main-branch merge, hosted repository or remote push is represented here.

## Branches and identities

| Reference | Contents |
| --- | --- |
| `work/audio-correction-1` | Current review candidate. `app/` matches the final candidate ZIP exactly, including measured reports and its checksum manifest. See `CANDIDATE.json`. |
| `main` | Preserved pre-correction application and October 4 planning history at `45d0b31bf30d67b013ce8e1cb6c4dbdfd709baec`. |
| `reference/re-runtime-1` | Annotated historical reference tag at `86fdbf4639389be01c9af8c8860a44566a62d83d`; not an accepted release. |

`REFERENCE.json` and `tools/verify_reference.py` describe the retained **1.9.0 / re-runtime-1** predecessor. Use that verifier after checking out `main` or the reference tag. Its old expected hash/count are deliberately unchanged; they are not the identity of the audio-correction branch.

`planning/` contains candidate-era roadmap and plan snapshots. Paths within those snapshots generally use the application root. Current candidate details and review steps are in `app/docs/AUDIO_CORRECTION.md` and `app/docs/AUDIO_CORRECTION_CHECKLIST.txt`. The retained `planning/audio-audit/` probe documents the predecessor's defects; its success condition is defect reproduction and it is not the candidate's regression test.

## Open and verify the candidate

Open `app/mainline/NES_Forge_2.0.0-alpha.1.html`. Read the audio correction checklist and use the projects under `app/examples/Audio_Correction_2.0.0-alpha.1/`.

From the repository root:

```sh
python3 app/tools/bundle.py --check
```

This checks source-to-HTML reproduction without changing the application. **921/921 automated cases passed across 42 suites** on the tested clean extraction. The complete measured results are `app/test-results/candidate/Summary.json`; clean-extraction proof is `app/checkpoints/audio-correction-1-clean-extraction/Reproduction.json`. Exact identity and measured totals belong to `CANDIDATE.json` and those reports. Browser, speaker output, independent-emulator listening and mobile performance are separately labeled evidence.

The executable candidate ZIP carries `app/SHA256SUMS.txt` as its manifest inside the extracted application. Run further tests in a disposable copy of `app/`; the runner rewrites report files. The full gate command inside that copy is `node tests/run_candidate.cjs`. Node.js 20+ and Python 3.9+ are required for the supplied tooling. The HTML itself is standalone.

## Compare with the predecessor

With a clean working tree:

```sh
git switch main
python3 tools/verify_reference.py
git switch work/audio-correction-1
```

The main/reference application retains historical 895/895 evidence across 41 suites. Those earlier results and audio probes remain attached to their exact original bytes.

## Portable bundle

The separate source-control ZIP contains a complete Git bundle, handoff and verification record. Clone the candidate and retain both local branches before removing the bundle-file remote:

```sh
git clone --branch work/audio-correction-1 NES_Forge_Local_Repository.bundle NES_Forge
cd NES_Forge
git branch main origin/main
git remote remove origin
```

The `main` command preserves that branch locally; removing the bundle origin does not delete its commit or the reference tag. No online account or credentials are required to clone a bundle.

## Publication and licensing

No remote is configured. Licensing remains **UNDECIDED**; existing notices remain as supplied. The owner will select any private GitHub destination and decide publication separately. Keep candidate review, main-branch promotion and public release as explicit decisions. The historical planning/source-control kit remains a dated handoff; this candidate has a separate source-control delivery.
