# Alpha kit public-entry publication handoff

## Saved work

The owner authorized public entry/feedback documentation, a verified kit
prerelease, and repository About cleanup. The application remains an unpromoted
**2.0.0-alpha.11 / source-intake-1** candidate. No implementation or milestone
advance is part of this work.

- Main entry and feedback form: commit `40761d3d87e7364be075a6e1605bd05b3fe3d372`.
- RC2.1 kit documentation: commit `9e78e148fc96f5a645c83e262e43b0ee89560763`
  on `docs/alpha11-tester-kit-review-1`.
- About saved and verified: “NES/6502 game authoring and ROM investigation,
  with a standalone HTML editor and guided Alpha test kit.”
- Application, examples, app source/tests/oracles and PDFs are unchanged.
- Source and standalone checks passed: 116 delivered files, 42 HTML documents,
  855 local links/assets and zero broken references. Two package builds matched.

## Remaining publication step

**The GitHub prerelease is not published.** GitHub's releases API returned an
empty list after the browser's native-credential protection blocked the upload
step. A release form was prepared but no saved draft or uploaded asset was
confirmed. Do not assume that form survived. Do not repeat sign-in or request
credentials in chat; use a supported secure sign-in flow when one is available.

The publication itself is already owner-authorized. Resume with these exact
values, inspecting current refs/releases before creating anything:

- Repository: `the-pepsi-kid/Nes-Forge`.
- Title: `NES Forge Alpha Test Kit RC2.1 — 2.0.0-alpha.11`.
- Proposed tag: `alpha11-kit-rc2.1`.
- Tag target: **`9e78e148fc96f5a645c83e262e43b0ee89560763`**, not main's legacy app.
- Label: **Pre-release**. Do not promote the application baseline.
- Asset: `NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC2.1.zip` (2,346,029 bytes).
- ZIP SHA-256: `429a4c3ca9ed8306c8c949b7714600caa87aeeac78033f4a0fe3fa1d2abe08ed`.
- Optional accompanying checksum file: `SHA256SUMS-RC2.1.txt`, containing the
  SHA-256 above, two spaces, then the ZIP filename.

Rebuild from that exact kit commit with:

```sh
python3 tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC2.1.zip
python3 tester-kit/alpha11-review-1/verify_kit.py --source-checkout
```

After extraction, run the same verifier against the standalone kit folder.
The builder refuses to overwrite an existing output. Verify the resulting ZIP
hash before attaching it. All sources and recipe inputs are committed, so the
download can be reproduced if the temporary working files disappear.

After publishing, verify the tag resolves to the intended commit, the release
is public and marked prerelease, and anonymous asset download matches the hash.
Then update main README's primary download to the standalone asset and its
launcher path to `START_HERE.html`; retain the pinned source ZIP as an alternative
with its distinct `tester-kit/alpha11-review-1/START_HERE.html` path. Avoid
overwriting concurrent README changes.

## Prepared release notes

Public Alpha test prerelease. The application remains an unpromoted candidate.

Download `NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC2.1.zip`, extract the entire ZIP,
then open `START_HERE.html` inside the extracted kit folder. Click **Open NES
Forge** and follow tutorial steps 1–9. No build command or local server is
required. GitHub's automatic source archives are developer downloads; the
standalone ZIP is the tester kit.

The kit includes the full editor, Scout project/ROM, tutorial, reference guides
and printable PDFs. Submit feedback through
[GitHub Issues](https://github.com/the-pepsi-kid/Nes-Forge/issues/new?template=alpha-feedback.yml)
or your original delivery channel. Issues are public; nothing is submitted
automatically.

RC2.1 / public-entry-1 updates feedback links and public-delivery wording only.
The editor, examples, tutorials, manuals, PDFs, tests and frozen oracles are
unchanged. App: **2.0.0-alpha.11 / source-intake-1**, schema 12.

- Application source commit: `09f2233908bc511ffe057e3f7e885a5a42ef19ac`.
- Kit source commit: `9e78e148fc96f5a645c83e262e43b0ee89560763`.
- App SHA-256: `11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd`.
- ZIP SHA-256: `429a4c3ca9ed8306c8c949b7714600caa87aeeac78033f4a0fe3fa1d2abe08ed`.

Fresh packaging checks passed: **116 files, 42 HTML guides, 855 local
links/assets, zero broken references**; repeat packaging produced identical ZIP
bytes. The retained **1833/1833 cases across 93 suites** is October 13 application
evidence, not a new run for this documentation update.

Human tutorial/save/reopen/rebuild, mobile, listening, controller,
independent-emulator and physical-hardware acceptance remain open as applicable.
RC2 browser layout/launch evidence is historical; this update does not establish
new app browser acceptance. Preserve native project backups. Read
`KNOWN_LIMITS.html` and `SOURCE_RECORD.json`.

The NES/8-bit/6502 boundary and milestone gates remain unchanged. Public testing
is not baseline promotion or authorization for later implementation. Project-wide
licensing remains undecided; preserve existing upstream notices.

[Reproduction instructions and receipt](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/PUBLIC_ENTRY_REVIEW.md)
