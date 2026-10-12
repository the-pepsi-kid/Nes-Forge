# NES Forge — Native SFX Recovery candidate

**2.0.0-alpha.11 / native-sfx-1**, schema 12. Open `app/mainline/NES_Forge_2.0.0-alpha.11.html`.

The next bounded Audio recovery slice transcribes source-backed FamiTone2 single-pulse SFX into ordinary editable Audio patterns, instruments and named effects. Independent HonkeyPong effects 0 and 1 fit this subset; effect 2 uses multiple channels and is refused. Structural register data controls conversion; effect IDs and ROM hashes are not recognition allowlists.

Native music and SFX share `RENativeAudioImport`, while `ProjectStore.applyAudioImport` owns guarded Audio append and one Undo. The existing five-method registry retains its default music path. SFX import requires the project already use tempo 150/speed 1 and preserves existing music orders, timing, runtime settings and event bindings. No schema, runtime emitter, recipe algorithm or gameplay template changed; native map/background workflows remain preserved.

Fresh clean-extraction gate: **1769/1769 cases across 89 suites**, retaining all **1,694 parent cases / 84 suites**. Every one of **6,034 staging payload hashes** was verified against the archive, clean extraction and unchanged working inputs. Across five retained example families, **11 generated ROMs, 1 original input ROM, 16 projects and 6 recipes remain byte-identical**; only 5 build-receipt HTML identity fields changed.

All 14 browser runners have current reports: **14 blocked with zero checks; 0 passed, with 0 measured checks in total**. Logical original/generated CPU/APU results do not establish browser layout/native dialogs, speakers, native synthesis equivalence, independent-emulator playback, phone/controller or physical NES acceptance. Owner and listening acceptance remain pending; the candidate is not promoted or published.

Read `app/docs/NATIVE_SFX_IMPORT.md`, its checklist and `app/examples/RE_Native_SFX/`. Open `HonkeyPong_SFX_0.nesforge.json` or `HonkeyPong_SFX_1.nesforge.json`, Build & Run, then press B/attack. These separate Scout projects explicitly author timing, disabled music and animation sound bindings. `HonkeyPong_SFX_0_Edited.nesforge.json` demonstrates an ordinary one-semitone tracker edit. Import itself does not recover or bind native gameplay triggers.

Conversion retains native frame zero through the final mixed frame and adds a terminal cut. Existing canonical pitch/duty/volume data remains authoritative, with cents error and phase/retrigger/arbitration differences disclosed. Multichannel effects, other channels, PAL, unknown initial state and unsupported control/timer/duration/capacity refuse. Canonical event timing and rebuilt APU evidence do not claim lossless native sound reproduction.

The application parent is `5de81d48e67a0f076ce067fbf8ca3f1c3a89baf3`. Original source, input reproduction and upstream notices remain under `app/examples/RE_Native_Audio/`; map-source research and all historical release evidence remain retained. The application license remains UNDECIDED; independent inputs retain their upstream notices.

This completes the bounded SFX implementation and automated gate, with browser/listening/owner acceptance still open. Next: supplied-source migration diagnostics for dialects/dependencies, then a documented independently tested integration hook. Remaining Audio formats/fidelity, runtime and comprehensive manual requirements precede integrated Hosted/network/wallet/deck work. The full roadmap is unfinished.

Run `python3 tools/verify_reference.py` for delivered-app verification, or `--full-gate` for disposable reproduction. `tools/package_source.py` packages clean committed source with portable Git history and retained refs. Exact identities and outcomes are in CANDIDATE.json and the clean-extraction proof.
