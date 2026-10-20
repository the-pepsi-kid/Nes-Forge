# NES Forge — current status

**2.0.0-alpha.11 / stage-context-1 · unpromoted development checkpoint**

Parent: published `context-cleanup-1`, commit `c86b98aafd828f2f66b2f10ec068a726619ede45`. Branch: `implementation/stage-context-2026-10-20`. Build identity: `build-inputs.json`; repository-root `CANDIDATE.json` records this checkpoint.

Scene resources now connects explicit native area/table context → imported room → page → related World and sprite owner. Choosing an imported page aligns its World segment and relative page viewport. The existing World and Scene selectors participate. Shared poses/animations keep canonical IDs; imports record and remap their World and sprite-owner IDs independently.

New imports save catalog membership in existing source receipts. Missing rooms, unavailable slots and conflicting receipts remain explicit. Native area/table membership does not establish a playable stage, stage ordering, reachability or transition semantics. Older receipts retain room navigation without invented stage membership. Source inspection remains read-only; Use inspected room explicitly returns to a matching already-imported scene.

Audio stays project-wide. Scene/event-to-cue bindings, native art/Audio/behavior encoders and complete Stage topology remain future work. World art still uses its declared tileset scene; editing another page does not rebind or copy shared resources.

Ordinary projects write schema **12**. Native source/recipe projects write schema **13**; supported read ceiling remains 13. Native encoding still supports only the four verified Zelda II location fields. Five gameplay templates, 12 actor slots and 64 persistent bytes retain their existing contracts.

## Evidence

The parent recorded 2,061 passing cases across 118 suites with documented VM retries and 28 browser checks. Those results describe the parent only. Current results are in [the Stage context verification](../reviews/stage-context-1/Verification.json), with the exact tested HTML hash, actual execution mode and separate browser/native outcomes. A pass requires the completed current report. Native dialogs, listening, physical devices, controllers and hardware remain separate acceptance.

[Navigator guide](docs/SCENE_CONTEXT.md) · [roadmap](ROADMAP.md) · [verification policy](TEST_POLICY.md) · [previous status](docs/history/stage-context-1/CURRENT_STATUS.md).
