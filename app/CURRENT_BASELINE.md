# Current review candidate — Native SFX Recovery

Release **2.0.0-alpha.11**, candidate **native-sfx-1**, schema **12**. Application: `mainline/NES_Forge_2.0.0-alpha.11.html`. Current verification status belongs to matching fresh records described below; a planned gate is not a pass.

Behavioral parent: native-map-1 at source commit `5de81d48e67a0f076ce067fbf8ca3f1c3a89baf3`; HTML SHA-256 `d7087da3100ad82ace657ec5010e70bd0e627466df89ad247a84f87775a269be`; 1,694/1,694 cases across 84 suites. Preserve `baseline/NES_Forge_2.0.0-alpha.11_Native_Map.html`, `docs/history/native-map-1/` and `checkpoints/native-map-1-reference/`.

Scope: finite source-backed FamiTone2 single-pulse SFX transcription to canonical Audio, common native music/SFX staging and guarded audio import. Import appends patterns, instruments and a named SFX with one Undo. It requires existing tempo 150 and speed 1; tempo, order, runtime switches and event bindings remain unchanged. Separate authored Scout examples may explicitly bind an effect for review.

The project schema, runtime emitters, native map/background behavior and recipe identities remain unchanged. Native timer-to-note rounding, phase/retrigger and arbitration differences are disclosed; multichannel effects, other channels, PAL, unknown state and unsupported control/timer/duration/capacity refuse conversion. This is a finite adaptation, not lossless native engine recovery.

Actual identity and measured outcomes require agreement between `build-inputs.json`, fresh `test-results/candidate/Summary.json` and `checkpoints/native-sfx-1-clean-extraction/Reproduction.json`. Retain all 84 predecessor suites and append the five declared SFX suites. Browser/device/listening and owner acceptance remain separate.

## Preserved previous record

---

# Current review candidate — Native Map Recovery

Release **2.0.0-alpha.11**, candidate **native-map-1**, schema **12**. Application: `mainline/NES_Forge_2.0.0-alpha.11.html`. This continuation is being implemented and verified; a planned gate is not a pass.

Behavioral parent: native-background-1 at source commit `6cde192eee757e677376c319045944e17c3395fa`; HTML SHA-256 `4dec7048b9fdb77bcfcd46ccde3d293313e53489f4987a7a112eced8cce6fa11`; 1,617/1,617 cases across 78 suites. Preserve `baseline/NES_Forge_2.0.0-alpha.11_Native_Background.html`, `docs/history/native-background-1/` and `checkpoints/native-background-1-reference/`.

Scope: source-backed native command-map and CHR-RAM graphics interpretation; explicit static Empty/Solid conversion; shared native-scene preview/import; separate generated single-room adaptation. The existing project schema, runtime emitters, recipe identities and five-template scope remain unchanged. Native decoration, procedural maps, special tile semantics, actors, music, scrolling and original gameplay are outside this conversion.

Current identity and measured results require agreement between `build-inputs.json`, the fresh `test-results/candidate/Summary.json` and `checkpoints/native-map-1-clean-extraction/Reproduction.json`. All 78 parent suites and six additional declared suites must run against one unchanged clean extraction. Source-intake proof and A1 results do not certify the changed editor. Browser/device/listening and owner acceptance remain separate.

## Preserved previous record

---

# Current review candidate — Native Background Recovery

Release **2.0.0-alpha.11**, candidate **native-background-1**, schema **12**. Application: `mainline/NES_Forge_2.0.0-alpha.11.html`.

Behavioral parent: compatibility-stabilization-1 at source commit `de77c105bc451f3ab7a90c00fe1c4162675ccd52`; HTML SHA-256 `b3d9b852782b1b7ebd56637bb94e4dbcb09379614b7c8577e007046db45c8e02`; 1,541/1,541 cases across 72 suites. Preserve `baseline/NES_Forge_2.0.0-alpha.11_Compatibility_Stabilization.html` and `checkpoints/compatibility-stabilization-1-reference/`.

Scope: two bounded native background decoders, shared canonical preview/import, one-scene project transaction, independent generated viewer and focused workflow evidence. Existing runtime emitters, schema, recipes and template scope remain unchanged. Actual current identity and results require agreement between `build-inputs.json`, current Summary and `checkpoints/native-background-1-clean-extraction/Reproduction.json`; previous results do not certify changed bytes. Real browser/device and owner acceptance remain separate.

## Preserved previous record

---

# Current review candidate — Compatibility Stabilization

Release **2.0.0-alpha.11**, candidate **compatibility-stabilization-1**, schema **12**. Open `mainline/NES_Forge_2.0.0-alpha.11.html`. Candidate identity distinguishes this checkpoint from the earlier movement-rules-1 build without a release bump.

The behavioral parent is original alpha.11 Movement Rules, SHA-256 `cb216a470954ac8898dcb410eadf1de0eb267287b88c4e757bec3a80284946f1`, with 1,504 passing cases across 68 suites. It is preserved in `baseline/NES_Forge_2.0.0-alpha.11_Movement_Rules.html` and its reference evidence. That historical pass does not certify changed bytes.

Current implementation scope: explicit cross-release recipe metadata migration, shared configuration validation/limits, ProjectStore-owned settings transactions, and complete detached generated-ROM preview compilation. New mechanics, schema/runtime changes and template expansion are outside this checkpoint.

The current `build-inputs.json`, `test-results/candidate/Summary.json` and `checkpoints/compatibility-stabilization-1-clean-extraction/Reproduction.json` establish actual identity/results after verification. Until those current records exist and agree, this is implementation in progress. Browser reports are separate measured or blocked evidence. Owner promotion, listening, mobile performance, controllers and hardware remain pending.

## Preserved parent record

---

# Current review candidate — Movement Rules

Release: **2.0.0-alpha.11 / movement-rules-1**. Schema: **12**.
Application: `mainline/NES_Forge_2.0.0-alpha.11.html`.
Current identity and outcomes belong to `build-inputs.json`, the fresh candidate Summary and `checkpoints/movement-rules-1-clean-extraction/Reproduction.json`; all must agree. A planned gate is not a pass.

Behavioral parent: **alpha.10 / seeded-mashup-1**, HTML SHA-256 `58e53633207e9d5c259b4cea52f1da09f113877d34a3078c5f7c3c624f98e375`. Its verified clean extraction passed **1,430/1,430 cases across 65 suites**. Nine alpha.10 browser runners were blocked with zero checks. That evidence belongs to alpha.10 and does not certify changed alpha.11 bytes.

After the exaggerated traditional-mechanics discussion, the owner's “continue” advances a bounded authoring extension: **SCENE → Movement rules**. Capture the current canonical project; choose Keep, Sprint, High jump, Slow fall, Heavy fall or Seeded mix, intensity 1–3 and four field locks; inspect the exact detached preview and explicitly apply through one project Undo. Saved recipes require the exact captured source. Only active generated World or generated single-room move/jump/gravity/fall values change, within existing bounds. Viewer/custom-ASM projects are refused and no mode is enabled automatically. The inactive configuration, body/spawn, scenes/World/collision, Audio and actors remain preserved.

The separate mashup-v1 workflow remains unchanged and can precede this step. This checkpoint adds no friction, knockback, death/timer rule, new gameplay template or raw-ROM decoder. Runtime emitter code is preserved. Build validation is not a solvability guarantee.

Keep all 1,430 predecessor cases and exact source history. A1 shared native-background recovery/import remains the next coding dependency, followed by suitable independent A2 native map/collision input and remaining Audio/migration/gameplay/runtime work. Complete A0/A1/A2/A3 acceptance and the entire roadmap remain unfinished. Browser, listening, phone performance, controllers, physical devices, full manual/PDF and promotion remain separate open acceptance areas. Earlier tutorial and alpha.5 A1–A5 feedback, including deferred A6, stay historical.
