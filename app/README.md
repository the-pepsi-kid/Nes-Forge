# NES Forge development

**2.0.0-alpha.11 / stage-context-1 · unpromoted development checkpoint**

Open [the standalone app](mainline/NES_Forge_2.0.0-alpha.11.html). Expand Scene resources to choose source area/table context, imported room and page. Existing Scene/World controls coordinate that context; shared sprite owners keep their canonical references. Missing rooms and unavailable slots remain explicit. Audio stays project-wide.

Build from authoritative sources:

```sh
python3 tools/bundle.py
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

[Current status](CURRENT_STATUS.md) · [navigator guide](docs/SCENE_CONTEXT.md) · [architecture](ARCHITECTURE_CONTRACT.md) · [verification policy](TEST_POLICY.md) · [roadmap](ROADMAP.md) · [native editing guide](docs/NATIVE_ENGINE_EDIT_BUILD.md).

Ordinary projects write schema **12**. Native source/recipe projects write schema **13**; supported read ceiling remains 13. Native encoding still supports only the four verified Zelda II location fields. Five gameplay templates, 12 actor slots and 64 persistent bytes retain their existing contracts.

The retained tester-kit/context-cleanup-1 is the prior documented checkpoint. Current evidence lives under ../reviews/stage-context-1/. Source publication retains the repository's existing license status and excludes original ROMs/source-bearing projects.

[Previous development README](docs/history/stage-context-1/README.md).
