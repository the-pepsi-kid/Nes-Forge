# NES Forge alpha.11 test-kit release candidate source

This directory holds the **editable documentation, feedback template, fixed
identity receipt and deterministic packaging recipe** for the alpha test kit.
It is based on application commit
`09f2233908bc511ffe057e3f7e885a5a42ef19ac` and does not change the
application or its automated evidence. The release-candidate package has a
user-facing guide; complete the separate `OWNER_REVIEW_REQUIRED.txt` before
sending it to testers.

From the repository root, with Python 3 installed:

```text
python tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC1.zip
```

The script verifies the frozen app and Scout example hashes, includes only the
standalone HTML, first-party example, guide and feedback form,
then writes a SHA-256 manifest. It refuses to overwrite an existing ZIP. The
result goes outside the repository. The owner checklist stays in Git source and
is deliberately excluded from the user download. No external packages or
network are needed.

The `.md` files are the editable source. Their corresponding `.html` files are
checked-in, browser-readable renderings for the offline ZIP. If a guide changes,
update its HTML rendering as well; `pandoc --standalone --from=gfm-tex_math_dollars
--to=html5 --css=style.css` is the current rendering recipe. Check both formats
before rebuilding. The September 30 kit is historical 1.9.0 material, not this
package's source of truth. The source-history bundle and external ROM corpora do
not belong in the tester ZIP.

The app's packaged full automated gate is 1,833/1,833, tied to its original
candidate evidence. That is not an end-to-end browser or device pass. The
source-intake review, native dialogs, listening, phone/controller and tutorial
walkthrough have their distinct statuses in `SOURCE_RECORD.json`. No source
change or baseline promotion is implied by this documentation branch.
