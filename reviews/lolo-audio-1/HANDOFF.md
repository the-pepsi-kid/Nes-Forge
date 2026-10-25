# Lolo Audio handoff

The preceding owner test accepted Lolo's Scene appearance and reported Audio driver not found. This checkpoint adds the missing Lolo decoder to the existing catalog, method registry and isolated playback path. No new schema, CPU/APU core, runtime compiler or native audio writer was added.

The owner now requires Audio verification for every project. Read ../PROJECT_VERIFICATION.md before closing or selecting another title. Keep Scene/Audio results separate and disclose unresolved drivers or writers.

Sources: app/src/re/lolo-audio.js; four shared modules native-audio-catalog.js, native-audio-profiles.js, native-audio-machine.js and native-audio-recovery.js. The unused-FDS bus option defaults off for all existing drivers. Detection permits the exact original header/PRG with CHR-only changes, retaining the derivative's true full source hash.

Run python3 app/tools/bundle.py --check and node app/tests/lolo-audio.cjs. Private verification: node reviews/lolo-audio-1/verify_audio.cjs /path/to/your-original-Lolo.nes. It saves counts/hashes only. No commercial source ROM, recovered score, sample payload or source-bearing project belongs in Git or the kit.

The prior Lolo room codec and writer remain unchanged; its outdated Audio description now points to the ROM Audio Library. Current room and retained Metroid Audio checks must match this checkpoint's bundled HTML hash. Full release gate, real browser listening, physical devices and whole-game acceptance are separate; do not claim them from focused checks.
