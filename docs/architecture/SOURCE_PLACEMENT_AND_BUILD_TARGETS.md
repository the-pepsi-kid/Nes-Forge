# Source placement ledger and classic-first build contract

Status: Agent Lab v0.3 extension, extraction-only foundation. No editor UI, runtime adapter, new native encoder, or physical console certification is added by this change.

## Why a placement ledger exists

Recovering PRG/CHR bytes is not the same as knowing the original game's scene geometry, sprite composition, mapper-dependent CPU/PPU address, enemy spawn, music trigger, collision response, or how to write the asset back.

Each ROM revision remains identified by its exact SHA-256 and mapper. The private source placement ledger records *verified physical location* separately from unknown runtime/scene placement. An unknown is serialized as null with status unverified, never guessed. This is a prerequisite for faithful import and native writeback.

Run the existing Agent Lab coordinator against a locally supplied ROM and matching editor:

    python tools/agent-lab/forge_agent.py --rom "C:\ROMs\MyGame.nes" --forge-root "." --no-ai

After independent PRG/CHR bank verification, the pipeline writes:

- private/<rom+editor>/placement.json — source bank offsets and explicit unknown placement fields
- private/<rom+editor>/inventory.json — placement ledger pointer, count, and physical-only scope
- private/<rom+editor>/NEXT_ACTIONS.json — unverified Qwen suggestions (unchanged)

All ROM-derived content remains private. The public review evidence is unchanged.

## What this first milestone verifies

- iNES/NES 2.0 header sizes, trainer offset, bank byte ranges, per-bank SHA-256 evidence and explicit source identity
- complete, unique bank-check index sets (including partial final banks)
- no fake CHR-ROM records for CHR-RAM games
- classic NES is the default *design target*, while enhanced emulator and hosted world remain optional/future; these settings **do not certify** compatibility

No CPU/PPU mapping is presumed from a physical PRG or CHR offset. Mapper bank switching and CHR-RAM uploads may change runtime placement. No source bank automatically becomes a Forge Scene, metasprite, actor or audio cue.

## What the next round must recover

For each *reconstructed resource*, independently establish:

1. Source bank, byte spans, pointer ownership, mapper and codec evidence
2. Scene/object placement (room ID, coordinates, ordering, palette, scroll context), or explicit dynamic placement recipe
3. Runtime references (spawn timing, hitboxes, animation state, audio triggers) from code or controlled emulator traces
4. Canonical editor binding and dependency graph; save/reopen without losing original source evidence
5. Native writeback capability and a verified original-ROM edit/rebuild, with unchanged unrelated bytes and tested execution

Qwen may suggest hypotheses and narrow experiments. Only deterministic tools and owner-reviewed independent comparisons can promote a field from unverified to reconstructed. The review/correction/extract cycle can iterate without blocking ongoing Forge UI, Audio, gameplay or authoring work.

## Targets

The same authored project may have distinct outputs:

- **Classic NES:** a true .nes file requiring no wallet, server, network, enhanced emulator, or console mod. Hardware compatibility needs CPU, PPU, APU, mapper, timing and independently verified execution checks.
- **Enhanced emulator:** explicit opt-in extension, not expected to run on unmodified hardware.
- **Hosted world:** explicit opt-in server-authoritative runtime for persistent multiplayer, base construction and large enemy swarms.

No crypto or hosted dependency may enter the classic NES build by default. Importing a commercial ROM locally does not grant redistribution rights.
