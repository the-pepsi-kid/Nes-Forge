# Alpha test kit regression review — RC2

**2026-10-18.** Compared the original September 30 revision 2 kit, alpha.11 RC1,
the user's screenshots, and the frozen alpha.11 source-intake application.

## What went wrong

RC1 rebuilt the landing page as a generic Markdown document. That replaced the
authored dark/mint design, removed the launch/navigation links and produced a
duplicate heading. Packaging also omitted useful guide material. Hash/ZIP checks
passed, but those checks did not test presentation or content completeness.

## Findings and corrections

| Finding | RC2 correction |
| --- | --- |
| Original landing design replaced | Restored original inline CSS exactly, branded hero, status card, action buttons and session/resource cards; updated version/status text. |
| Entry page and tutorial had no links | Restored functional launcher, guide navigation, chapter anchors, print links and feedback route. |
| Full manual and operator reference omitted | Restored all 152 original manual headings and 43 operator headings, with prominent alpha.11 notes and corrections. |
| 439-row control index and two illustrations omitted | Restored byte-identical historical assets; added 17 selected alpha.11 controls. |
| Three PDFs omitted | Rebuilt current Tutorial, Manual and Operator Reference PDFs (8, 76 and 44 pages). |
| Detailed reviewer/mobile guides omitted | Restored current review tasks, performance observations and reporting instructions. |
| Source Workspace described too narrowly | Distinguished lexical intake from supported source ROM assembly and separate workspace backups. |
| PDF links contained local build paths | Converted all 36 links to portable relative targets; reviewed page rendering remains identical. |
| Mobile reading overflow | Fixed wrapping of long filenames/hashes after browser verification exposed it. |

The nine core authoring steps survived RC1. Its corrections for checkbox
locations, separate World dimensions, palettes, Player selection and portable
project backups were retained. Scout examples were retained unchanged.

## Completeness and version boundaries

All **38 original files** are accounted for in `CONTENT_INVENTORY.json`.
Seventeen historical source/assets are preserved byte-for-byte. The old developer
candidate ZIP and old test-evidence JSON remain in the separately retained
original archive; they are not alpha.11 app/evidence inputs. Old status content
is replaced by current known limits, next steps, update notes and source record.

The full historical manuals are labeled as such. They are accompanied by current
feature guides and explicit corrections, including MIDI/MusicXML score export,
source-workspace builds, source intake and current mobile diagnostics. Their
control tables are not presented as an exhaustive, fully revalidated alpha.11
inventory.

## Verification

- Extracted ZIP: **116 files**, integrity manifest matches every member.
- **855 local links/asset references** checked across **42 guide pages**; zero
  missing files or fragment anchors.
- Six key guide pages checked at **1380px** and **390px** in Chromium 153; no
  horizontal page overflow or missing images after the fix.
- Tutorial chapter navigation works. The app opens and exposes New Project;
  no script errors occurred during these checks.
- PDF first, middle and last pages rendered and visually inspected.
- App SHA-256 remains
  `11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd`.
- Independent second content review found no remaining actionable preservation
  or version-labeling defects within this scope.

These are documentation, packaging and launch checks. Full app authoring,
native file dialogs/save/reopen, listening and physical devices remain pending
their own acceptance. See `VERIFICATION.json` for the recorded scope.

## Prevention

The landing page is now explicitly authored and excluded from Markdown
regeneration. The packager has a checked-in file inventory and required-guide
checks; `verify_kit.py` checks actual package links, bytes and original coverage.
Future kit revisions must review presentation as well as ZIP integrity.
