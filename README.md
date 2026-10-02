# NES Forge — local source-control handoff

This repository preserves the delivered **1.9.0 Alpha / re-runtime-1** candidate and records the roadmap reconciliation separately. It is a local, portable Git handoff. No GitHub repository, remote, CI run, deployment, or public release was created.

## Reference and current planning

- `app/` is the exact extracted payload of `NES_Forge_1.9.0_RE_Runtime_Candidate.zip`, including its checksum manifest and historical verification evidence. Its embedded roadmap and status files describe that frozen package. Do not rewrite these files merely to make the historical package describe a later planning decision.
- `planning/` holds the revised roadmap and the bounded 2.0 plan once committed. These documents govern prospective work; they do not change the reference application's version or acceptance status.
- The annotated tag `reference/re-runtime-1` identifies the initial exact application import. It is a reference tag, **not an accepted release**. `main` contains that import followed by planning changes.
- Licensing is **UNDECIDED**. No project-wide open-source license is granted by this handoff. Existing notices in the supplied files remain as supplied. Resolve repository visibility and distribution rights before publication.

## Verify locally

Requirements: Python 3.9 or later, Node.js 20 or later for the automated suite, and Git for repository operations. The application itself is standalone HTML.

From the repository root:

```sh
python3 tools/verify_reference.py
```

This verifies all 1,009 packaged payload checksums, the exact expected file inventory and HTML hash, and invokes `python3 tools/bundle.py --check` inside `app/`. It does not rewrite the reference.

To run the complete automated candidate gate on a disposable copy:

```sh
python3 tools/verify_reference.py --full-gate
```

The helper runs `node tests/run_candidate.cjs` from the copied application. It prints the temporary report location and removes the copy afterward. Use `--keep-workdir PATH` with `--full-gate` to retain fresh reports in an initially absent directory. For example:

```sh
python3 tools/verify_reference.py --full-gate --keep-workdir local/full-gate
```

The delivered candidate includes **895/895 passed checks across 41 suites** from its earlier clean-extraction gate. This handoff does not claim a fresh full-suite rerun. Packaged browser reports are blocked because Chromium was unavailable; actual browser, device, controller, and R1–R6 acceptance remain separate pending checks. A successful checksum or bundle check does not establish browser compatibility.

Direct equivalent commands, after making a disposable copy of `app/`, are:

```sh
python3 tools/bundle.py --check
node tests/run_candidate.cjs
```

Run those commands inside the copied application directory. Running the candidate suite directly in the frozen `app/` rewrites report files and will make the packaged checksum verification fail afterward.

## Work from the reference

Create a new branch from `main` for the next authorized work. Make intentional application changes there and record the resulting version, updated tests, and evidence. Retain `reference/re-runtime-1` as the unchanged comparison point. The current source-control handoff does not authorize accepting or publishing a 2.0 release.

## Later: private GitHub remote

No account or repository owner was selected, and no credentials or authentication state were inspected. After the owner chooses an account and repository name, create an **empty private** repository in GitHub (do not initialize a second README or license). In this local clone, review the intended payload and then run:

```sh
git remote add origin <PRIVATE_REPOSITORY_URL>
git push -u origin main
git push origin reference/re-runtime-1
```

Replace the placeholder with the chosen remote URL; the commands above have not been run. GitHub authentication, repository creation, rights review, and the remote push remain later owner-controlled actions. Hosting and CI configuration are not included.

## Reference identity

- Candidate ZIP SHA-256: `8cc66184914c21422b346bcbf60af19eb5da69046e13aeeea0aa9fa65037b0d0`
- Application HTML SHA-256: `e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d`
- Project schema: 12
- Package file count: 1,010 including `SHA256SUMS.txt`
- Application entry point: `app/mainline/NES_Forge_1.9.0_Gameplay_Core.html`

The initial commit uses an explicit automated preparation identity, **Codex Handoff Preparation**, rather than impersonating the project owner or original authors.
