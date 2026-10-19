# Alpha Test Kit RC2.1 — public-entry-1

Reviewed 2026-10-18. This is a documentation and delivery correction to RC2,
not an application revision or baseline promotion. The owner authorized public
Alpha test-kit distribution and public repository entry/feedback corrections.

## Identity and changes

- Application: **2.0.0-alpha.11 / source-intake-1**, schema 12.
- Application source commit: `09f2233908bc511ffe057e3f7e885a5a42ef19ac`.
- Application SHA-256: `11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd`.
- RC2.1 ZIP SHA-256: `429a4c3ca9ed8306c8c949b7714600caa87aeeac78033f4a0fe3fa1d2abe08ed`.
- Added the public GitHub Issues feedback route to the authored launcher,
  Markdown fallback and feedback template; retained the original delivery channel.
- Updated kit identity and owner/publication wording. Application, examples,
  tutorial, manuals, PDFs, tests and frozen oracles remain byte-identical.
- Preserved the authored landing-page CSS and structure. RC2 historical review
  records are retained; this file records only the RC2.1 work.

## Measured verification

Both source-checkout and extracted standalone verification passed: 42 HTML
documents, 855 local links/assets, zero broken references, nine tutorial steps,
439 historical control rows and all 38 original files accounted for. The
standalone package has 116 files. ZIP integrity and every manifest entry passed.
Two independent package builds produced byte-identical ZIPs with the hash above.
Comparison against the original source-branch archive confirmed that no existing
`app/` file, test/oracle, example or PDF changed.

Reproduce from the repository root:

```text
python3 tester-kit/alpha11-review-1/verify_kit.py --source-checkout
python3 tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC2.1.zip
```

Extract the new ZIP and run `verify_kit.py` with the extracted kit directory as
its argument. The builder refuses to overwrite an existing output.

## Evidence boundaries and remaining acceptance

No application regression total is newly claimed here. The packaged
**1833/1833 across 93 suites** is the retained October 13 application evidence.
RC2's separate Chromium documentation/launch checks are historical. In this
public-entry session, the existing launch verifier was blocked by the missing
local Chromium executable; no fresh app browser acceptance was established.
Owner tutorial, actual native save/reopen/rebuild, mobile, listening, controller,
independent-emulator and physical-hardware acceptance remain open as applicable.

Public availability and a prerelease label do not complete these gates, select a
project license, authorize another milestone or change the NES/8-bit/6502 target.
Release publication and repository About changes must be verified on GitHub;
this package receipt alone does not claim that those remote actions succeeded.
