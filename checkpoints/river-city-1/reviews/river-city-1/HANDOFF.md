# River City Ransom handoff

The owner requested the next title within the remaining usage budget. The retained queue and exact-revision lead selected River City Ransom. This checkpoint adds 13 street locations (36 cropped native backgrounds), a shared physical-tile writer and its Audio driver. The 22 compressed special/interior locations remain unavailable, not substituted. Read RIVER_CITY_REVIEW.md and Owner_Checklist.md.

The street background is native tile rows 4–23 displayed at Scene rows 0–19. Keep this crop explicit. Tile edits have one global physical owner; shared aliases update together. Thirty-two metadata-alias bytes are read-only. Attribute tables, header pointers, CHR, palettes, code, Audio and unrelated bytes are protected. Unsupported ordinary asset/runtime changes remain savable and block native output.

Audio has 19 music requests (18 unique headers), 43 SFX and one stop control. It runs original bank-5 code/data with fixed bank 7, including the original RAM APU writer. Its immutable audio-bank identity survives street rebuilding and retains the derivative's actual full hash. The existing Audio UI, finite canonical transcription and unsupported native Audio writer behavior are reused.

No schema, ProjectStore, native source owner, runtime compiler, CPU/APU/emulator core or existing native game adapter changes. One shared brush lookup adds explicit native cell mapping; four shared Audio modules add the new profile, bounded bank identity and opt-in fixed MMC3 mapping. Preserve ordinary schema 12 and reader ceiling 16. The actual preceding reader rejects this adapter before mutation.

Run python3 app/tools/bundle.py --check; node app/tests/river-city.cjs; node app/tests/native-audio-library.cjs. The focused run_checks.py requires the full recovered historical test tree. Supplied-input scripts verify_streets.cjs and verify_audio.cjs take your own ROM path and save counts/hashes only. Do not distribute original ROMs, recovered scores, samples, screenshots or source-bearing game projects.

The owner requires Scene AND Audio verification for every project. Follow ../PROJECT_VERIFICATION.md. Do not close this as full River City recovery: special/interior screens, HUD, animation, actors, collision/transition semantics, native Audio writing and whole-game acceptance remain work. Real browser listening and controllers are owner checks. No alpha promotion is implied.
