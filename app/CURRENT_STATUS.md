# NES Forge — current status

**2.0.0-alpha.11 / context-cleanup-1 · unpromoted development checkpoint**

Source parent: `697a998e744c7794fae5d1063748e8d83d5ffe57`. Branch: `implementation/context-cleanup-2026-10-20`. Build identity: `build-inputs.json`. Repository-root `CANDIDATE.json` describes this increment; older records remain under their named review folders.

Ordinary projects write schema **12**. Native projects containing the preserved ROM/recipe write schema **13**; supported read ceiling is 13. Filename changes do not establish a release.

The new Scene resources navigator groups existing Worlds and recovered rooms, selects canonical scenes/pages and opens related Worlds, poses, animations, actors, CHR and collision views. Matching-hash RE scene navigation is explicit. Audio remains project-wide; full Stage → Scene synchronization and scene/event-to-cue bindings remain unfinished.

Native rebuilding still encodes only supported Zelda II location X/Y, scene selector and packed entry code. Other authoring edits remain saved but can block native builds. A reference room is not the full overworld.

## Evidence

The parent supplied 2,046/2,046 cases across 116 suites via durable bounded workers and 30 matching-app browser checks. These are retained results. The documented kit passed 152-file integrity and 1,188 local-link checks; its browser launch was blocked in the recovery session.

Fresh results for this increment live in `../reviews/context-cleanup-1/Verification.json`, including actual run mode, exact HTML hash and browser status. Do not replace a blocked or failed outcome with a historical pass. Native dialogs, audible acceptance, Windows/phones, controllers, hardware and owner tutorial acceptance remain separate.

[Use the navigator](docs/SCENE_CONTEXT.md) · [native build](docs/NATIVE_ENGINE_EDIT_BUILD.md) · [verification policy](TEST_POLICY.md) · [next work](ROADMAP.md).
