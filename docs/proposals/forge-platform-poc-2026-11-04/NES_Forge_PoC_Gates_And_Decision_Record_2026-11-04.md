# NES Forge — PoC Gates & Decision Record

**Date:** November 4, 2026  
**Status:** Proposed — no implementation work, wallet issuance or purchases authorized  
**Primary specification:** `NES_Forge_Concept_Proposal_PoC_2026-11-04.md`  
**Baseline:** RC2 Build 5, editor SHA-256 `556d50459c31bfd28da012ec3f0a0c062896637d7d6c327c287f9680755ff7b6`  

## Decisions to preserve

1. No new commercial-title recovery scope before Forge's core authoring lifecycle passes.
2. First PoC uses an **original, rights-clear NES game** made with supported Forge features.
3. Use a **single shared Stellar network** with separate asset namespaces `(code, issuer)`, not a blockchain per NES game.
4. Test only with synthetic assets on **Stellar Testnet** or local Quickstart; no mainnet issuance, sale or price claims.
5. NES logic remains local; server is authoritative for shared-world or reward validation; wallet keys never touch ROM or save files.
6. Physical ROM playback is a separate accomplishment from *physical* NES networking; no claim of the latter before a verified hardware protocol.
7. The NES HUB is an expansion research target, not assumed to be a network cartridge or cart programmer.
8. Cyberdeck prototype starts as a portable existing computer; custom electrical/mechanical design is deferred.
9. Existing Zelda II Rev 8, RC2 and commercial-source research remain frozen comparison fixtures; no Git push without explicit owner approval.

## Gate checklist — owner approval required for each promotion

| Gate | Proof to gather | Initial status | Blocks |
|---|---|---|---|
| G0 — Project baseline | Confirm archive SHA, source commit and clean distribution plan | **Candidate / partially checked** | Promotion and claims |
| G1 — Forge core | Blank project → edit CHR/World/animation/audio → save/reopen → build → two-emulator play | **Not yet accepted** | Further PoC construction |
| G2 — Physical ROM | Same hashed rights-clear ROM cold boots on original NES via compatible flash cart | **Not run** | Original-console claim |
| G3 — Virtual ForgeNet bridge | `HELLO`, `PING`, event submit, malformed packet, offline and replay tests | **Not implemented** | Network feature claim |
| G4 — Authoritative validation | Accepted deterministic event, fake event rejected, idempotent processing | **Not implemented** | Token reward claim |
| G5 — Stellar Testnet | Issuer/distributor/test recipient; opt-in trustline; one transaction and no duplicate | **Not implemented** | Blockchain-backed reward claim |
| G6 — Physical CPU-visible link | Hardware registers/transport validated by scope, on-cart NES code `HELLO/PING` | **Unspecified hardware** | Connected original NES claim |
| G7 — Portable cyberdeck | Repeatable offline/local toolchain, emulator, programmer drivers and companion service | **Concept only** | Portable kit claim |

### First PoC completion criterion

A milestone covering **G1–G5** may be described as an *NES Forge build, hardware deployment, and emulator-ledger bridge demonstration* if all evidence exists. It must **not** be called a networked physical NES demonstration unless **G6** also passes.

### Evidence standard

For every item, record: test ID, exact source SHA, editor SHA, produced ROM SHA, mapper profile, device/OS/firmware, tester, observed pass/fail, date, replay command, output link, and unresolved limitation. Mark `blocked`, `not run`, `fail`, or `pass`. Historical receipts must be distinguished from new runs.

### Proposed first demonstration game

A simple **two-screen original platformer** with one visible achievement (e.g., opening an exit after a server-replayable scripted challenge). Offline play must work whether or not a crypto bridge exists. This avoids a Zelda II or Castlevania rights dependency and exercises real Forge fundamentals.

### Owner signoff space

- [ ] Accept core-first sequence and original test fixture.
- [ ] Accept Stellar Testnet as provisional experiment (no issuance implied).
- [ ] Identify existing original NES and compatible flash cartridge for G2.
- [ ] Approve a separate design sprint for virtual ForgeNet transport after G1.
- [ ] Decide whether G6 is a second independent PoC or part of a later prototype.

**Decision log:** Unapproved for implementation until the owner confirms a specific gate or task. This checklist does not modify RC2 or any stored source.