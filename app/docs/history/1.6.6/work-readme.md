# Source and reproduction

Current assembly uses frozen 1.6.5 plus project166.js, placement166.js, ui166.js and release166.js. The current UI is the ordinary editor, with Gameplay settings in SCENE and direct project actions.

Run assemble_release.py, the test runner, create_native_demo.cjs and package_release.py as described in the root README. The native demo script is engineering evidence; users author through the existing tabs and do not need it.

The earlier *165.js layers and CONTRACT.md document the retained generated runtime. create_demo.cjs/render_demo.py reproduce the historical scripted 1.6.5 fixture against its frozen baseline. Older popup workflow implementation/checks are superseded, not part of the current authoring UI.
