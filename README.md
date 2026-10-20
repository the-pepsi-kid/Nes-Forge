# NES Forge

Current development candidate: **2.0.0-alpha.11 / stage-context-1**, based on the published context-cleanup-1 checkpoint. This is an unpromoted development candidate.

Open [the standalone app](app/mainline/NES_Forge_2.0.0-alpha.11.html). Scene resources now connects explicit source area/table context → imported room → page → World and shared sprite owner. The existing Scene and World selectors participate. Missing/unavailable rooms remain visible; source stage ordering and routes are unresolved. Audio remains project-wide.

- [Current status](app/CURRENT_STATUS.md)
- [Navigator guide](app/docs/SCENE_CONTEXT.md)
- [Native edit/build guide](app/docs/NATIVE_ENGINE_EDIT_BUILD.md)
- [Development and verification](app/README.md)
- [Current evidence](reviews/stage-context-1/README.md)
- [Previous documented kit](tester-kit/context-cleanup-1/START_HERE.html)

Ordinary projects write schema 12; native source/recipe projects write schema 13. Native rebuilding remains limited to supported Zelda II location fields. Other native authoring changes can save but block builds until verified encoders exist.

Source publication follows the repository's existing license status. Original ROMs and source-bearing native projects are excluded. [Previous README](app/docs/history/stage-context-1/Repository_README.md).
