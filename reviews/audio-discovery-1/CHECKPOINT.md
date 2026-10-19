# Finalized Audio Discovery checkpoint

The unchanged application 1ffaf54d1d25e5988cfac324018711d29fee51336ac9722b9375d413d61ea1c6 passed all 103 suites / 1,948 cases, plus 10 discovery and 14 retained browser checks. CANDIDATE.json, all 7,221 payload checksums and NF_Audio_Discovery.zip are finalized. Fresh ZIP extraction verified the actual app/example recording, 341 inventoried files, 688 local links and all 164 byte-identical archived original kit files. Windows-relative paths remain short. See README.md, Review_Kit.json, Package_Verification.json and Windows_Zip_Check.json.

Earlier pending statements below are historical.

---

# Audio Discovery — final gate in progress

Local branch implementation/audio-discovery-2026-10-18, parent public a94252364b63f9271cec4b16ca4a4a43478002aa. Frozen application SHA-256: 1ffaf54d1d25e5988cfac324018711d29fee51336ac9722b9375d413d61ea1c6.

Implemented unknown-ROM physical PRG scanning, 42 derived reference contexts, guarded source/partial/unmapped evidence, runtime observation linking and bounded recording, static-only chooser for unsupported mappers, current-source navigation and JSON export. Added an independently authored NMI sound ROM and complete Audio Discovery guide. No new native-decoder acceptance or schema/compiler change.

Measured on the frozen HTML: 30/30 new feature cases; 2/2 preservation checks; 10/10 new direct-file browser checks; 14/14 retained browser workflows; retained runtime 24/24. All 58 old example files reproduced, 52 byte-identical and six receipt-only HTML hashes changed. The public comparison corpus and original three reference scans are recorded in Corpus_Probe.json.

Complete 103-suite gate is running (expected 1948 cases). Do not edit any app/ files during that run. Finalizer and Windows-short-path packager are ready in this folder but have not run. CANDIDATE.json and app/SHA256SUMS.txt still describe the parent; inherited reports are not proof of the new full gate. Final output should be NF_Audio_Discovery.zip, with the app, current discovery guide, retained guides and the new original example.

After the gate: run finalize-checkpoint.py, then build-review-kit.py; verify actual extracted launch and all links/164 archived original files; publish only the new feature branch and verify its exact remote tree. No main/release promotion is authorized. No supplied commercial ROM/sample payload is copied into the repo or kit.
