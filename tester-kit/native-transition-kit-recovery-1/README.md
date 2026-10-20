# Complete documented kit recovery

This folder overlays the original `../alpha11-review-1` documentation inventory
around the unchanged `native-transition-edit-1` application. It does not modify
application code, promote a baseline or implement the shared Stage → Scene workflow.

From this repository root, with Python 3 and Pandoc installed:

```sh
python tester-kit/native-transition-kit-recovery-1/build_kit.py --output ../NES_Forge_Documented_Kit_Recovery_1.zip
```

The output must not already exist. The builder checks all 127 original document
hashes, the exact application and Scout example hashes, original launcher CSS,
the delivered file manifest, local links and anchors. It then extracts the ZIP
and reruns the verifier. No private game ROM or native source-bearing project is
included. Original first-game tutorial, PDFs, illustrations and shared styles
remain byte-identical. Superseded launcher/identity files are preserved as raw
historical copies, with a complete mapping in `DOCUMENTATION_PRESERVATION.json`.

After extraction:

```sh
python NF_Kit/verify_kit.py NF_Kit
node NF_Kit/verify_launch.cjs NF_Kit
```

The browser check needs Playwright and its Chromium browser installed. It is
separate from static packaging checks and from application regression suites.
Read `Evidence/Recovery_Browser_Verification.json` for this recovery's outcome.
The previous interrupted chat's missing 155-file / 62-browser-check artifacts are
not reused as measured claims. See `RECOVERY_HANDOFF.md` for the current evidence
and remaining manual acceptance.
