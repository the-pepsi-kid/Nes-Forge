# NES Forge — mobile audio-entry review branch

This branch carries **2.0.0-alpha.3 / mobile-audio-entry-1**, schema 12. Its bounded change adds touch-accessible Audio note and instrument editing while retaining the mobile playback corrections. Physical phone entry and owner acceptance remain pending. Main and the predecessor branches are preserved; this is an unpromoted review candidate.

| Reference | Contents |
| --- | --- |
| `work/mobile-audio-entry-1` | Current review candidate; `app/` exactly matches the final executable ZIP, including measured reports and checksums. See `CANDIDATE.json`. |
| `work/mobile-playback-1` | Preserved alpha.2 mobile playback candidate at `e85fbef07e97fb8810fe19f5a84dea7cd62b6892`; 940/940 cases across 43 suites. |
| `work/audio-correction-1` | Preserved alpha.1 audio candidate at `bd1d46e5fe3eb575c22abcb377841534f197469c`; 921/921 cases across 42 suites. |
| `main` | Preserved pre-correction application and planning at `45d0b31bf30d67b013ce8e1cb6c4dbdfd709baec`. |
| `reference/re-runtime-1` | Annotated historical reference at `86fdbf4639389be01c9af8c8860a44566a62d83d`; not an accepted release. |

Open `app/mainline/NES_Forge_2.0.0-alpha.3.html` and follow `app/docs/MOBILE_AUDIO_ENTRY_CHECKLIST.txt`. Current roadmap and plan snapshots are in `planning/`; paths in those documents generally use `app/` as their root.

**958/958 automated cases passed across 44 suites**, including all 940 retained cases. Measured results are in `app/test-results/candidate/Summary.json`; clean-extraction proof is `app/checkpoints/mobile-audio-entry-1-clean-extraction/Reproduction.json`. Browser status is `blocked` with 0 executed checks. Automated evidence does not establish physical touchscreen behavior, phone performance or speaker output.

To check source-to-HTML reproduction without changing the app, run from the repository root:

```sh
python3 app/tools/bundle.py --check
```

Run further full tests from a disposable copy of `app/`, since `node tests/run_candidate.cjs` rewrites reports. The supplied tooling uses Node.js 20+ and Python 3.9+. The HTML application itself is standalone.

The separate source-control ZIP contains a complete portable Git bundle. Restore all four local branches before removing the bundle-file remote:

```sh
git clone --branch work/mobile-audio-entry-1 NES_Forge_Local_Repository.bundle NES_Forge
cd NES_Forge
git branch main origin/main
git branch work/audio-correction-1 origin/work/audio-correction-1
git branch work/mobile-playback-1 origin/work/mobile-playback-1
git remote remove origin
```

`REFERENCE.json` and `tools/verify_reference.py` describe the retained 1.9.0 / re-runtime-1 predecessor. Use that verifier after checking out `main` or `reference/re-runtime-1`. Each later candidate branch has its own `CANDIDATE.json`. Historical planning/audio-audit probes reproduce old defects and are not this candidate's acceptance suite.

No remote, hosted repository, push, deployment, main merge or release promotion was created. Licensing remains **UNDECIDED** and existing notices are retained. Earlier planning, audio and mobile playback source-control kits remain dated handoffs.
