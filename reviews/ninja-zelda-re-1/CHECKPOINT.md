# Verified Ninja Gaiden / Zelda II checkpoint

Branch: `implementation/ninja-zelda-re-2026-10-19`.

Application SHA-256: `f12c1cac282bd081c60d25e1b62a99ddce3e578d82573ecca5e930d95af5c233`.

Review kit: `tester-kit/ninja-zelda-re-1/NF_Ninja_Zelda_RE.zip`.

ZIP SHA-256: `ce805607abf5fcb95169678077f25a6b7ef1d54d513d5aa7ceb73b646b576686` (12,517,605 bytes).

The complete gate passed 1,989/1,989 cases across 110 suites on Node 22.23.3/Linux/two workers. The source and application stayed unchanged throughout the run. All 107 earlier suites and 1,970 earlier cases are retained; the additions have 19 cases. No filters, skipped cases, widened limits or retries within the gate were used.

Native game verification compares all 48 Ninja rooms and all 561 available Zelda scene/context views against bounded original readers/builders. It also compares native palette, tile, spawn, animation and pose outputs within the guide's stated limits. The earlier four-ROM spatial verification was rerun. These harnesses share the CPU instruction core; they do not establish independent CPU or hardware timing equivalence.

Current browser evidence has 20 new workflow checks, 47 retained spatial/audio checks, and three fresh-package checks. Real file selection, downloads, source replacement, unknown-source guards, project/Undo/live-emulator isolation and the Zelda title at frame 835 were exercised. The corrected title's capture has zero pixel differences from the corrected renderer. The emulator remains scanline based.

The ZIP was built twice with identical bytes, freshly extracted, and checked against all 453 inventoried payloads. All 760 checked active documentation links resolve. Every one of the 366 predecessor files remains unchanged or is archived byte-exact; the 164 original RC3 files remain byte-identical. All 58 current example files are included. Projects, ROMs and recipes are unchanged; six receipts update only application identity. Windows names and short-path extraction lengths pass conservative checks; native Windows extraction was not performed.

The first verified ZIP exceeded the connector's 16 MiB encoded-request limit. Large text streams now use standard Deflate with Zopfli 0.4.3/five iterations. Every one of the 454 uncompressed files is byte-identical to the first ZIP; only compression changed. The final archive fits the request limit and has the hash above.

Node 24.19.0 attempts hit intermittent VM timeouts, including in unchanged code and fresh startup. Those reports and paired startup diagnostics are preserved. The cause is not established; the final Node 22 full-gate result does not claim Node 24 timeout behavior is resolved.

Start on Windows: extract the complete ZIP to `C:\NF\Ninja_Zelda_RE`, open `START_HERE.html`, then **Open NES Forge**. Read **Native RE tutorial**, and choose a source under **RE / DISASM → Open spatial RE workbench**.

This remains read-only source investigation. Full collision response, physics, AI/state transitions, combat boxes, complete scene/quest/encounter conditions, Zelda enemy animation/Link timing, dialogue/cutscenes, event-to-audio links, canonical native scene import and playable reconstruction remain open. More ROMs are not required to continue those tasks on these two games. Commercial ROMs and extracted commercial payload files are excluded.
