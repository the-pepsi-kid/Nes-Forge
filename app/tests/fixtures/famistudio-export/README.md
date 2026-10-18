# Official FamiStudio export fixtures

These are original, deliberately simple test scores passed through the actual
FamiStudio 4.5.3 Linux application. They are not handwritten approximations of its
export format, and they do not contain an upstream demo song or a game soundtrack.

The retained `inputs/seed-*.txt` files are the original test inputs. The official
application loaded those files into its project model and exported the two
`forge-four-channel-*.txt` files. Loading and exporting each result again produced
byte-identical output. This exercises FamiStudio's reader and writer; it does not
claim that a binary `.fms` project was saved or tested.

`forge-four-channel-famistudio.nes` was also produced by the official application.
Its player uses **mapper 5 (MMC5)**, even though the score uses only the base NES
audio channels. It is an unsupported-mapper benchmark control, not proof that an
NROM audio-driver classifier distinguishes the two engines. FamiStudio's sound
engine descends from FamiTone2; it is a distinct engine profile, not an independently
implemented engine family. The upstream player/engine license is retained in
`FamiStudio-LICENSE.txt`. This does not change NES Forge's repository-wide license.

## Independent expected score

Both scores contain 18 note starts: nine in a pattern repeated twice. A pattern's
name is scoped to its channel. The same name `Repeated` intentionally occurs in all
four channels. The pulse instrument name includes a quoted word, testing the
exporter's doubled-quote escaping.

| Channel | Instrument | Volume | Pulse duty | FamiStudio positions, durations | Tracker positions, durations |
| --- | --- | ---: | ---: | --- | --- |
| Square1 | `Pulse "lead"` | 12 | 2 | C4 at 0 for 6; E4 at 12 for 6; G4 at 24 for 12 | C4 at 0 for 2; E4 at 4 for 2; G4 at 8 for 4 |
| Square2 | `Pulse harmony` | 9 | 1 | C3 at 6 for 18; G3 at 30 for 12 | C3 at 2 for 6; G3 at 10 for 4 |
| Triangle | `Triangle bass` | 15 | — | C2 at 0 for 24; D2 at 24 for 24 | C2 at 0 for 8; D2 at 8 for 8 |
| Noise | `Noise tick` | 8 | — | C0 at 0 for 2; D0 at 24 for 2 | C0 at 0 for 1; D0 at 8 for 1 |

The FamiStudio-tempo fixture has `NoteLength=6`, constant `Groove=6`, musical
`PatternLength=8`, and two pattern instances: **48 frames per instance, 96 frames
total**. Its note positions and durations are expressed in frames. A conversion
using one tracker row per frame uses tempo 150 and speed 1.

The tracker-tempo fixture has 16 rows per instance, two instances, tempo 150, and
speed 6: **32 rows total**. This remains a **FamiStudio text file using FamiTracker
tempo**, not a FamiTracker text-export file.

The exporter sorts instruments alphabetically and omits envelopes equal to its
defaults (volume 15 and duty 0). Import tests must resolve the instrument named by
each note instead of assuming source or destination instrument indices. Noise
C0 and D0 correspond to source noise periods 14 and 12 respectively; they are not
tonal C and D pitches.

## Reproduction

Release: <https://github.com/BleuBleu/FamiStudio/releases/tag/4.5.3>

Release commit: `c09dca64788606c09fcb5e70db28b9dd1f34be78`.

Download the official Linux AMD64 ZIP or equivalent 4.5.3 application from that
release. On Linux, install a compatible .NET 8 runtime. The recorded run used
.NET 8.0.32. The application binary and .NET runtime are not stored in this repo.
Exact asset, fixture, and input hashes are recorded in `provenance.json`.

From the repository root:

```sh
python app/tools/verify_famistudio_fixture.py --executable /path/to/FamiStudio --dotnet-root /path/to/dotnet
```

With FamiStudio in your PATH, the underlying commands are:

```sh
FamiStudio inputs/seed-famistudio.txt famistudio-txt-export forge-four-channel-famistudio.txt
FamiStudio inputs/seed-famitracker-tempo.txt famistudio-txt-export forge-four-channel-famitracker-tempo.txt
FamiStudio forge-four-channel-famistudio.txt famistudio-txt-export reexport-famistudio.txt
FamiStudio forge-four-channel-famitracker-tempo.txt famistudio-txt-export reexport-famitracker-tempo.txt
FamiStudio forge-four-channel-famistudio.txt rom-export forge-four-channel-famistudio.nes -rom-export-mode:ntsc
```

The optional reproduction check compares exported text, repeat exports, ROM
bytes, and all recorded fixture hashes. It does not depend on NES Forge's parser.
