# Zelda II original-ROM native gameplay replay — Rauru West

**Status:** 2026-10-26, first source-observation harness; no ROM or captured Nintendo-owned artwork committed.

The project-agnostic Python replay runner is in tests/native_gameplay_replay.py and its first title-specific scenario is tests/native_scenarios/z2_rauru_west.json. The runner drives a user-provided legal NES ROM through Forge's actual built-in emulator with NES held-button inputs, records a watched memory subset and optional local screenshots, and emits a ROM-SHA-linked audit report. It makes no RAM/ROM modifications.

Original Zelda II game observation: West Hyrule → Rauru Town, area/location RAM $0748=44; eastern section scene $0561=2; moving Left at the west edge transitions to $0561=1 while area remains 44, followed by playable west scene. The private local first pass passed 35/35 configured replay steps; this does **not** attest that all original Zelda II mechanics or any hosted multiplayer scene routing have been reproduced. The Shield-teacher door/dialogue/spell unlock is **not verified** by this checkpoint.

Run in a private checkout with Python Playwright and Chromium from the v17.1 experiment folder:

    python tests/native_gameplay_replay.py --rom "/private/path/ZeldaII.nes" --html NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html --scenario tests/native_scenarios/z2_rauru_west.json --out private-rauru-evidence

The output directory is private and untracked; do not upload ROM bytes, saved states or gameplay screenshots. The observed RAM pointers are local test instrumentation, not certified cross-title semantic mappings. Next: Rauru Shield Wise Man invitation + entry + grant, with before/after state observation and no injected ability flags, then a source-verified hosted-world transition event.
