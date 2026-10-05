# NES Forge 2.0.0-alpha.1 — audio-correction-1 handoff

## Delivered scope

D052 implements the owner-authorized two-defect audio correction: safe event-stream pointer carry through 128-row music/SFX patterns and channel-correct triangle pitch. Release identity changes to 2.0.0-alpha.1 while project schema remains 12. No separate Audio representation or additional feature tranche is introduced.

Open mainline/NES_Forge_2.0.0-alpha.1.html. Follow docs/AUDIO_CORRECTION_CHECKLIST.txt with the two editable examples and generated ROMs in examples/Audio_Correction_2.0.0-alpha.1/. Old generated audio ROMs retain their old code; load the project and build again to receive a fix.

## Evidence to inspect

- source-manifest.json and build-inputs.json identify the ordered sources and exact bundled HTML.
- test-results/candidate/Summary.json records the complete gate against unchanged candidate bytes, all 895 retained cases and the new audio-correction suite.
- checkpoints/audio-correction-1-clean-extraction/Reproduction.json ties the result to an independently extracted staging ZIP and verified payloads.
- Three test-results/browser-* reports separately record actual browser availability and executed checks. No speaker/device acceptance is inferred from VM or register tests.
- baseline/NES_Forge_1.9.0_RE_Runtime.html and checkpoints/re-runtime-1-reference/ preserve the predecessor; prior current documents are in docs/history/re-runtime-1/.

Regressions exercise dense music/SFX boundaries, order/loop and repeated-start behavior, and pulse/triangle timing through actual emitted routines and generated runtimes. The exact suite report gives the cases and scope; package examples are review inputs, not listening evidence.

## Reproduce

    python3 tools/bundle.py --check
    node tests/run_candidate.cjs
    node tools/build_audio_correction_examples.cjs

The example generator intentionally rewrites only current examples. Run it in a disposable copy for reproduction so the delivered provenance stays intact. All historical fixtures, reports and golden ROMs are preserved. For release reproduction, use the staging option documented in TEST_POLICY.md.

## Protected behavior and remaining work

Keep schema 12, the five gameplay templates, 12-actor and 64-persistent-byte bounds, native reference validation, Door Option B and partial single-room editable recovery. Retain emulator/capture, CHR, Save As, input, undo and RE lifecycle behavior. Audio-off legacy oracles must remain unchanged.

Broader Studio preview fidelity, imports/export semantics, the full audio workshop, mobile A/V lag and actual listening/device checks remain separate open work. Triangle notes C0–G#0 saturate at the hardware timer limit; this correction does not redesign low-note policy or browser preview. RE audio is still one limited decoder plus general observations. Sol Games, wallets, hosted Worlds, new graphics/map recovery and hardware are not implemented here.

Owner review determines acceptance of this candidate. The next work after this correction is the supported audio workflow/listening closeout under ROADMAP.md, not automatic release promotion.
