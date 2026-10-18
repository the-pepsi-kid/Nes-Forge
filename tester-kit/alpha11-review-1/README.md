# NES Forge alpha.11 tester kit source

This directory contains the editable kit guides, authored landing page, printable
PDFs, reference images, and packaging recipe for **Alpha Test Kit RC2**. The
application stays pinned to source commit
`09f2233908bc511ffe057e3f7e885a5a42ef19ac`.

## Build a download

From the repository root, with Python 3 installed:

```text
python tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC2.zip
```

The normal packaging command needs only Python's standard library. It verifies
the exact app and all three Scout assets, includes the checked-in documents and
PDFs listed in `package_files.json`, and writes an integrity manifest. The ZIP is
reproducible from those exact input files and refuses to overwrite an output.
The owner checklist, build tools and review records remain outside the download.

## Edit without losing the design or content

`START_HERE.html` is the authored landing page. **Never regenerate it from
`START_HERE.md`.** The Markdown file is a plain-text fallback.

Other guides are edited as Markdown. Run `python tester-kit/alpha11-review-1/render_docs.py`
to rebuild their HTML with Pandoc; this preserves the shared navigation,
chapter list and original reading style. Run
`node tester-kit/alpha11-review-1/render_pdfs.cjs` with Playwright and Chromium
and Python `pypdf` installed to rebuild the three printable PDFs. `CHROMIUM_EXECUTABLE` can select
an installed browser. The renderer automatically removes local filesystem paths from PDF hyperlinks. Check the rendered PDFs after changing them. PDF creation
metadata can differ between render runs; packaging the checked-in inputs is
deterministic.

Every original September 30 file has an explicit disposition in
`CONTENT_INVENTORY.json`. Full historical manuals, all 439 control rows and
illustrations remain available, with current alpha.11 update notes. Historical
source copies remain byte-identical; old app binaries and old acceptance evidence
stay in the original archive. Current source-document snapshots are labeled as
feature guides, not new acceptance results.

After extracting a new kit, run:

```text
python tester-kit/alpha11-review-1/verify_kit.py PATH_TO_EXTRACTED_KIT_FOLDER
```

This verifies hashes, required material, all local guide links/anchors, tutorial
steps and original inventory coverage. Check the launcher and reading pages in
desktop and mobile layouts too. `REVIEW_REPORT.md` and `VERIFICATION.json` record
the RC2 review. Complete `OWNER_REVIEW_REQUIRED.txt` before the tester handoff;
documentation checks do not complete the app tutorial or device acceptance.
