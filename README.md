# NES Forge

NES/8-bit/6502-class game authoring and ROM investigation, with a standalone HTML
editor and a guided Alpha test kit.

**Current public test candidate: 2.0.0-alpha.11 / source-intake-1, schema 12.**
It remains an unpromoted Alpha. Public availability does not complete the pending
human/browser/device acceptance checks.

## Start testing

1. [Download the Alpha kit source ZIP](https://github.com/the-pepsi-kid/Nes-Forge/archive/9e78e148fc96f5a645c83e262e43b0ee89560763.zip).
   This includes the source repository and the complete kit. Extract the entire ZIP.
2. Open `tester-kit/alpha11-review-1/START_HERE.html`, then click **Open NES Forge**.
   The kit includes the editor, Scout example, tutorial, reference guides and PDFs.
   No build command or local server is required.
3. Follow tutorial steps 1–9 and save native JSON checkpoints. Test reopening your
   saved project and rebuilding it.
4. [Send Alpha feedback](https://github.com/the-pepsi-kid/Nes-Forge/issues/new?template=alpha-feedback.yml).
   Include the app/kit version, browser, named control, reproduction steps, and
   expected versus actual result. Issues are public; remove credentials and
   personal data. The editor submits nothing automatically. Testers may also
   return the included feedback form through their original delivery channel.

[Kit instructions](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/README.md)
· [Tutorial](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/Tutorial.md)
· [Known limits](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/KNOWN_LIMITS.md)
· [GitHub releases](https://github.com/the-pepsi-kid/Nes-Forge/releases)

Kit **RC2.1 / public-entry-1** updates delivery/feedback documentation only. Its
application and example bytes are unchanged. A standalone release asset, when
published, opens directly at `START_HERE.html` after extraction; GitHub's automatic
source ZIP uses the nested path above.

## Candidate identity and verification

- Application source commit: `09f2233908bc511ffe057e3f7e885a5a42ef19ac`.
- Application SHA-256: `11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd`.
- RC2.1 standalone kit ZIP SHA-256: `429a4c3ca9ed8306c8c949b7714600caa87aeeac78033f4a0fe3fa1d2abe08ed`.
- Retained application evidence: **1833/1833 cases across 93 suites**, measured
  October 13. This documentation update does not claim a new application test run.
- RC2.1 package verification: **116 files, 855 local links/assets, zero broken
  references**, with byte-identical repeat packaging. These checks do not establish
  full tutorial, file-picker/save/reopen, mobile, listening, controller or hardware
  acceptance.

See the [package receipt and remaining acceptance](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/tester-kit/alpha11-review-1/PUBLIC_ENTRY_REVIEW.md).

## Source development and historical files

The current candidate's source, tests, governance and build instructions are on
[the source-intake branch](https://github.com/the-pepsi-kid/Nes-Forge/tree/review/source-intake-1-2026-10-18).
The kit is maintained on
[the tester-kit branch](https://github.com/the-pepsi-kid/Nes-Forge/tree/docs/alpha11-tester-kit-review-1).
To work on the current source locally:

```sh
git clone --branch review/source-intake-1-2026-10-18 https://github.com/the-pepsi-kid/Nes-Forge.git
cd Nes-Forge
python3 tools/verify_reference.py
```

The app files currently in `main` (`nes-forge.html`, `nes_forge_audio_v4.html`) and
`archive/` are historical. **Code → Download ZIP on `main` does not contain the
current Alpha kit**; use the pinned download above. This public entry update does
not merge the source branches, promote the candidate or authorize later roadmap work.

The project-wide license remains undecided. Preserve existing upstream notices;
see [license status](https://github.com/the-pepsi-kid/Nes-Forge/blob/9e78e148fc96f5a645c83e262e43b0ee89560763/LICENSE_STATUS.txt).
