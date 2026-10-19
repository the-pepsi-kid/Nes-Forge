# NES Forge alpha.11 tester kit source

This is **Alpha Test Kit RC3 / user-guide-1**, containing the unchanged
`audio-tool-import-1` application from commit
`ffb57eab61d2e69ae0b92838c7b55748423b3140`, current operator guides and the
preserved first-game tutorial, long manuals, controls, illustrations and historical sources.

## Use a GitHub download

Download this branch with **Code → Download ZIP**, extract the entire ZIP, and
open `tester-kit/alpha11-review-1/START_HERE.html`. The launcher opens the full
included `NES_Forge.html`; no build or server is required. You can move the whole
kit folder and use it independently. Keep all its files and subfolders together.
On Windows use a short path such as `C:\NF\AlphaTest`.

Start with [Guide.md](Guide.md) for current instructions across all 15 main tabs
and their workflow groups. [Guides/Audio.md](Guides/Audio.md) includes composing
from scratch in a regular Forge project. A dedicated New Sound Project is still
unfinished. The nine-step [Tutorial.md](Tutorial.md) makes a playable two-screen
World from blank art. The current chapters take precedence over historical
manual statements and abbreviated older in-app help text.

## Build and verify a standalone kit

From the repository root with Python 3:

```text
python tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC3.zip
python tester-kit/alpha11-review-1/verify_kit.py --source-checkout
python tester-kit/alpha11-review-1/verify_kit.py PATH_TO_EXTRACTED_KIT_FOLDER
```

The standard-library packager checks app/example hashes, includes all material
listed in `package_files.json`, and writes a SHA-256 integrity manifest. It
refuses to overwrite an output. It explicitly supplies the full application
and Scout project/ROM/preview; those cannot be omitted by trimming the document
list. Exact input bytes produce the same ZIP.

With Playwright and Chromium available:

```text
node tester-kit/alpha11-review-1/verify_launch.cjs PATH_TO_EXTRACTED_KIT_FOLDER
```

`CHROMIUM_EXECUTABLE` can select a browser. This clicks the launcher from both
source and extracted layouts and checks that the app is ready. It does not
substitute for the complete first-game tutorial or device acceptance.

## Maintain the documentation with the application

1. Update the relevant `Guides/*.md` chapter whenever a control, workflow,
   format or refusal changes. Explain purpose, exact action, expected result,
   what is saved, and supported limits. A feature is not documented by a name
   in a changelog alone.
2. Keep `Guide.md` and `Reference/Current_Feature_Guides.md` connected to new
   workflows. Check `DOCUMENTATION_AUDIT.md` for the source-module coverage map.
3. Preserve all nine first-game steps, historical source copies, 439 original
   control rows and illustrations. Correct reading copies with visible current
   notes; never relabel an old acceptance record as a new result.
4. `START_HERE.html` is authored. **Never regenerate it from Markdown.** Preserve
   its design and the shared `style.css` while adding navigation/content.
5. Render other Markdown with `python tester-kit/alpha11-review-1/render_docs.py`
   (Pandoc required). This includes all current Guides and source snapshots.
6. Rebuild changed printable editions with
   `node tester-kit/alpha11-review-1/render_pdfs.cjs` (Playwright, Chromium and
   Python pypdf required), then inspect rendered PDF pages. The script repairs
   local PDF links to portable relative targets.
7. Add both Markdown and HTML outputs to `package_files.json`. Run source and
   extracted-kit verification and open the app from each. Check desktop and
   narrow screens, and execute representative changed tutorial steps.
8. When changing the included app, update the pinned hash in `build_kit.py` and
   `SOURCE_RECORD.json`, copy the exact canonical app, and keep its actual
   application validation evidence separate from documentation review.

## Evidence and preserved material

`SOURCE_RECORD.json` identifies this kit's app and examples. `DOCUMENTATION_REVIEW.json`
records this documentation review. `DOCUMENTATION_AUDIT.md` records coverage and
known historical discrepancies. `SOURCE_RECORD_RC2_1.json`, `VERIFICATION.json`,
`REVIEW_REPORT.md` and `PUBLIC_ENTRY_REVIEW.md` retain prior RC2/RC2.1 scope.
They do not certify the current guide or complete app/device acceptance.

All 38 original September 30 files retain explicit dispositions in
`CONTENT_INVENTORY.json`; the 17 preserved historical source/assets retain their
original bytes. Native OS save dialogs, physical phones/controllers, listening
and the complete first-game owner walkthrough remain separate acceptance work.

Submit [Feedback_Template.txt](Feedback_Template.txt) through
[GitHub Issues](https://github.com/the-pepsi-kid/Nes-Forge/issues), or return it
through the channel that supplied the kit. Nothing is submitted automatically.
This branch is a reviewable documentation update; no release is published.
