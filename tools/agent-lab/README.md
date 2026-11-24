# NES Forge Agent Lab v0.3 — local source investigation

A read-only **developer companion** for [NES Forge](../../README.md). This directory does not change the released HTML. The public editor works offline, without a local AI or blockchain. This worker classifies a ROM by **SHA-256 identity** (not filename) and places discovered evidence into eight consistent resource categories per game.

## Quick start (Windows)

Requires Python 3.9+, Node 20+ and a matching owner-source or repository checkout with `NES_Forge.html`, `app/build-inputs.json`, and `QA/t/u/harness.cjs`. The worker rejects mismatched HTML/manifest pairs. Prefer `C:\extraction-qwen\` or another non-Git working directory for output.

1. Open `START_FORGE_AGENTS.cmd`; select a *locally owned* `.nes` ROM and the NES Forge source folder.
2. Atomic Chat at `127.0.0.1:1337/v1` is optional; the model will only receive summarized allowlisted technical evidence, not ROM bytes.
3. Review `Documents\NESForge-Agent-Lab\private\<game>\inventory.json` and `REPORT.html`. `review\index.html` is a hash-only dashboard.

Or run:

```powershell
python tools\agent-lab\forge_agent.py --rom "C:\ROMs\Game.nes" --forge-root "." --output "C:\NESForgePrivate" --no-ai
# Add --capture and/or --audio for slower, experimental supplemental passes.
python -m unittest discover -s tools\agent-lab\tests -v
```

`--rom-dir` enables batch analysis (`--max-roms` 10 by default, 800 hard ceiling). The ceiling is **not** a statement that 800 games have working native adapters. Qwen requests run sequentially through the same local model instance. The v0.3 Qwen integration produces suggestions, **not six independently functioning LLM agents**; see [roles and work orders](../../docs/architecture/ROM_ASSET_ARCHITECTURE.md).

## Background capture worker (v0.4.1)

`capture_worker.cjs` investigates ROMs while you keep working in Forge. It runs Forge's own emulator in an isolated
headless Chromium, with its own process and profile; nothing is shared with an open Forge window. It follows a
capture plan and writes synchronized frame-evidence records with screenshots, hashes, CHR associations, sprites,
CPU/PPU/APU state and code locations. It needs Node 18+ and Playwright's Chromium.

```bash
node tools/agent-lab/capture_worker.cjs serve --root <private folder> --forge NES_Forge.html
```

The worker prints a **pairing code**. In Forge, open **Background investigation** (above Scene resources), enter the
address and the code, then click **Pair**. This happens once per browser profile; the pairing survives worker
restarts. Two remembered options make the loop hands-free:

- **Investigate ROMs I import** queues the ROM named by each import event. The project gateway (Open ROM / project /
  ZIP), Import ROM, the emulator's Load ROM and the `rom.import` command all raise one. Forge never chooses between
  the project's ROM and the emulator's ROM on its own; the manual "Investigate selected ROM" lists each candidate
  with its source and SHA-256.
- **Add verified results to the library when a job finishes** imports the job through the validated
  `library.importInvestigation` path, then registers the ROM's recovered catalog through
  `LibraryCatalog.completeCatalog`. Only ROMs with a verified Forge profile have a catalog; for others Forge says so.
  A registration interrupted by a close or crash is completed later without importing again, with the worker's copy
  of the cartridge if Forge has none open; failures are retried at most 3 times, then wait for **Retry**
  ([FRAME_EVIDENCE.md §11](../../docs/architecture/FRAME_EVIDENCE.md)).
  A notice offers **Open in Library**. Importing never changes the project, and manual Import / Import again remain.

How the worker behaves:

- **Plans** (`plans/*.json`, `NESForgeCapturePlan`) are data, not code. A target's input spans may also write RAM
  (`{from, to, ram: {address: value}}`, written before every frame of the span):
  - `generic.json`: any emulated mapper, no game knowledge.
  - `ninja-gaiden-us.json`: every area through the game's own restart; matched by SHA-256.
  - `punch-out-us-prg1.json`: the title, passcode entry and all 14 fights:
    - Glass Joe by New Game;
    - four by passcode: Mike Tyson (007 373 5963), Don Flamenco (005 737 5423), Piston Honda's rematch
      (777 807 3454) and King Hippo (135 792 4680, then Select+A+B);
    - nine by New Game with the opponent number (RAM $01) written over the frames before the bout loads.

    Each bout is captured while its fighter's full pose is on screen. Matched by the PRG 1 cartridge's SHA-256.
  - `punch-out-us-prg0.json`: the same targets for the PRG 0 cartridge, matched by its SHA-256. Every route and
    capture frame was checked on PRG 0 to show the same fighter; a unit test keeps the two plans' targets identical.
- **Queue**: `<root>/jobs/<id>/job.json`.
  - States: queued, running, paused, completed, failed, interrupted, cancelled.
  - A job left running by a stopped worker is recorded as an *interruption*, not a failure. It resumes at its first
    unfinished target and shows as "completed · recovered after N worker restart(s)". Unresolved evidence (for
    example sprites that could not be traced to one CHR location) is listed separately from failures. A frame split
    at its status bar is not unresolved when every drawn sprite has its traced location. The worker does not link
    sprites to poses; Forge does, once frames are imported, where its library has decoded poses for the ROM
    (Ninja Gaiden, Zelda II, Mike Tyson's Punch-Out!!; Resources › Library: a frame's "Sprite → pose", a pose's "Seen
    in captured frames"). A Punch-Out record also carries what the game's pose routine applied while the worker ran it
    (`poseRoutine`, digested with the record), so a frame drawn as a full pose changed by delta poses links that pose.
- **No duplicates**: a ROM already queued, running or investigated with the same plan, emulator build and
  verification returns the existing job. `rerun: true` in `POST /jobs` asks for a deliberate re-investigation.
- **Checkpoints**: `<root>/checkpoints/<key>/`, keyed by ROM SHA-256, editor SHA-256 (the emulator build), mapper,
  header and boot plan.
  - A boot checkpoint is used only if it restores to the exact state it was saved from, and was first reproduced by a
    cold boot.
  - Target checkpoints skip restart sequences, and must reproduce their recorded capture digest.
- **Limits**: one job at a time, lowered CPU priority, a time limit per job (the job is paused when reached), and
  frame limits per target.
- **Compatibility**: iNES headers are reported, never repaired. Junk in bytes 11-15 with byte 7 zero is a resolved
  note (the mapper is unaffected); junk that reaches byte 7 is "damaged header suspected", with both readings of the
  mapper. A dump Forge recognizes by SHA-256 is named. A mapper the emulator cannot run fails the job
  with that reason. A frame that does not rebuild from its trace stays marked unverified. MMC2 (Punch-Out!!) frames
  are synchronization-checked like the others: the trace keeps the bank each latch selected at every pattern fetch.
- **Security**: see [AGENT_LAB_SECURITY.md](../../docs/architecture/AGENT_LAB_SECURITY.md).
  - The API answers only on 127.0.0.1, to a loopback `Host`, and to allowed origins (`null`, plus `--allow-origin`).
  - Every Forge request is signed with a non-extractable key obtained by pairing.
  - Scripts use the admin token in `<root>/token`; browsers cannot use it.
  - Secrets and data are user-only: 0600 files, 0700 folders.
- **Commands**:
  - `run --once`
  - `enqueue --rom … [--plan generic|profile|file] [--verify cold]`
  - `status`
  - `pause|resume|cancel --job ID`
  - `pair` (a new pairing code)
  - `clients [--revoke ID]`
- **Tests**:
  - `node tools/agent-lab/tests/capture_worker.test.cjs`: no browser or ROM.
  - `QA/agent-lab-background.cjs`, owner-side.
  - `QA/one-rom-loop.cjs`, owner-side: the hands-free loop for Ninja Gaiden and SMB3, including worker restart,
    closing Forge, duplicates, checkpoint reuse and API security.

## Independent extraction and discovery paths

- **Physical extractor**: uses the repository's existing `tools/extract-cartridge.cjs` to hash and extract PRG and CHR banks. Binary comparison against input ROM is a hard gate. Grayscale CHR sheets are *not* reconstructed sprites or scenes.
- **Native resource adapter**: the `NativeResourceProject` adapter may reconstruct rooms for certain exact revisions. If absent, that does not imply Forge has no other title-specific work.
- **Investigated source catalog**: `forge_investigated.cjs` runs the **existing `GameRENative.inspect`** API via the matching Forge test harness. Ninja Gaiden and Zelda II are among the exact-revision profiles. `catalog.private.json` is **not for publication**. Counts represent *catalog records*, not pixels, scene parity, behavior or writable builds.
- **Runtime capture / native audio**: optional `--capture` and `--audio` use the existing Forge runtime or driver profiles. Self-consistency and sampled notes are not independent 1:1 gameplay/audio parity.
- **Qwen**: unverified tasks only. It cannot modify ROMs, run arbitrary shell commands or commit code.

Each ROM's local `private/<ROM-hash+editor-hash>/inventory.json` groups **World/Scenes, Graphics, Animations, Audio, Collision/Physics, AI/Behavior, Code/Runtime and Build/Patches** into one catalog. Domains keep separate states for extracted, catalogued, decoded, observed, editable and round-trip verified. Unsupported domains remain visible, with no fabricated assets.

`private/` contains ROM-derived dumps, rendered graphics, source-index catalogs, audio projects, snapshots and logs; **never commit or redistribute it**. `review/` is allowlisted metadata but still requires manual release approval. Generated Forge projects may contain source ROM bytes. The pipeline refuses private output directories inside a Git working tree; `AGENT_POLICY.json` is the permission contract.

## Experimental discovery (AL-EXP-01, slice 1)

The editor can now run controlled experiments on Forge's own synthetic fixtures. It observes the cartridge, changes
single bytes in private copies, compares the replays and freezes a candidate definition before a withheld input is
checked by an independent oracle. Experiments run in a sandboxed second copy of the standalone build, never in the
editor's emulator. This slice does not extend the worker (BL08) and runs no commercial-ROM experiment. See
[AGENT_LAB_EXPERIMENTS.md](../../docs/architecture/AGENT_LAB_EXPERIMENTS.md).

## Reproducible check and present limitations

`python -m unittest discover -s tools/agent-lab/tests -v` runs seven synthetic/unit checks, including a forgery of an extracted-bank hash and a simulated loopback model. An additional local test against a user-provided Ninja Gaiden ROM (SHA-256 prefix `07d9e57e3518`) returned **48 scene/context entries, 202 poses, 83 scripts**, via `GameRENative.inspect`. This does **not** establish room pixel parity, enemy AI, scene writeback, or complete audio conversion. The public HTML's separate sanitized build still requires an end-to-end real-ROM rerun before release claims.

Next acceptance: prove an actual scene import, editing persistence and native patch/rebuild **against the original ROM**. Agent Lab is not the single-file user editor and has no automatic GitHub push. See the [architecture](../../docs/architecture/ROM_ASSET_ARCHITECTURE.md) and [delivery board](../../docs/architecture/AGENT_LAB_DELIVERY.md).
