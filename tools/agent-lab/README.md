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

## Independent extraction and discovery paths

- **Physical extractor**: uses the repository's existing `tools/extract-cartridge.cjs` to hash and extract PRG and CHR banks. Binary comparison against input ROM is a hard gate. Grayscale CHR sheets are *not* reconstructed sprites or scenes.
- **Native resource adapter**: the `NativeResourceProject` adapter may reconstruct rooms for certain exact revisions. If absent, that does not imply Forge has no other title-specific work.
- **Investigated source catalog**: `forge_investigated.cjs` runs the **existing `GameRENative.inspect`** API via the matching Forge test harness. Ninja Gaiden and Zelda II are among the exact-revision profiles. `catalog.private.json` is **not for publication**. Counts represent *catalog records*, not pixels, scene parity, behavior or writable builds.
- **Runtime capture / native audio**: optional `--capture` and `--audio` use the existing Forge runtime or driver profiles. Self-consistency and sampled notes are not independent 1:1 gameplay/audio parity.
- **Qwen**: unverified tasks only. It cannot modify ROMs, run arbitrary shell commands or commit code.

Each ROM's local `private/<ROM-hash+editor-hash>/inventory.json` groups **World/Scenes, Graphics, Animations, Audio, Collision/Physics, AI/Behavior, Code/Runtime and Build/Patches** into one catalog. Domains keep separate states for extracted, catalogued, decoded, observed, editable and round-trip verified. Unsupported domains remain visible, with no fabricated assets.

`private/` contains ROM-derived dumps, rendered graphics, source-index catalogs, audio projects, snapshots and logs; **never commit or redistribute it**. `review/` is allowlisted metadata but still requires manual release approval. Generated Forge projects may contain source ROM bytes. The pipeline refuses private output directories inside a Git working tree; `AGENT_POLICY.json` is the permission contract.

## Reproducible check and present limitations

`python -m unittest discover -s tools/agent-lab/tests -v` runs seven synthetic/unit checks, including a forgery of an extracted-bank hash and a simulated loopback model. An additional local test against a user-provided Ninja Gaiden ROM (SHA-256 prefix `07d9e57e3518`) returned **48 scene/context entries, 202 poses, 83 scripts**, via `GameRENative.inspect`. This does **not** establish room pixel parity, enemy AI, scene writeback, or complete audio conversion. The public HTML's separate sanitized build still requires an end-to-end real-ROM rerun before release claims.

Next acceptance: prove an actual scene import, editing persistence and native patch/rebuild **against the original ROM**. Agent Lab is not the single-file user editor and has no automatic GitHub push. See the [architecture](../../docs/architecture/ROM_ASSET_ARCHITECTURE.md) and [delivery board](../../docs/architecture/AGENT_LAB_DELIVERY.md).
