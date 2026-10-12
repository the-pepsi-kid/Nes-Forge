> Historical 1.6.2.1 reference. Current application, scope and commands are in `../README.md`; this directory preserves the original stabilization codec/tests and does not identify the 1.6.7 candidate.

# NES Forge 1.6.2.1 stabilization

Open `NES_Forge_1.6.2.1_Stabilized.html` in a modern desktop browser. This is the standalone World Interaction editor with a focused ROM build/import repair. The RE branch remains separate.

## Changes

- Fixed all three metadata allocation loops (foundation, metatile, world). An occupied candidate now advances by 16 bytes; exhausted capacity produces an error rather than a hang. Invalid allocation sizes fail explicitly.
- Added WR16 v3. World, room, marker and camera IDs are now serialized, so same-world and cross-world destination links survive ROM re-import.
- Added strict world validation: supported counts, dimensions, exact map lengths, metatile byte ranges, UTF-8 capacity, object coordinates and rectangles, unique IDs, valid destination references, scene membership and linked metatile availability. Unrepresentable builds fail explicitly.
- Parse WR16 only after validated NFEX scene record boundaries. A matching byte pattern inside a scene name or entity string is never treated as a world trailer. Decode failures occur before the ROM importer changes project state.
- Continue reading WR16 v1/v2. Those formats omitted world/marker identities. Their destination strings remain intact, with an explicit warning that destinations must be reselected. v1 multi-scene tileset identity cannot be reconstructed reliably and also requires reselection. No lost world or marker identities are inferred from names or array positions.
- Preserve an exact consumed-byte boundary for later extension records. Future MS16 data may follow WR16; an optional `Forge163.build.extension(worldExt, plan)` build hook is present for the next milestone.
- Keep project schema v5. Existing project data already contains these identities; WR16 is the revised ROM representation. Emulator, exact runtime capture, Save As and the separate RE branch were not changed.

Generated ROMs still run the current single-scene viewer. World maps and destinations are authoring metadata, not generated world-streaming gameplay.

## Reproducible checks

Run with Node.js:

```sh
node tests/world_codec.test.cjs
```

The suite extracts and executes the real codec and real allocator functions from the supplied HTML. It includes 55 named checks; truncation checks additionally exercise every prefix of valid v1/v2/v3 payloads. `tests/results.json` contains the results. The suite accepts an optional HTML path to test an integrated release using the same implementation.

The handoff's historical 344 checks were not supplied as runnable tests. This package does not claim to reproduce that total. The independent full-script regression suite belongs to the combined release.

## WR16 v3 record

All multi-byte integers use little-endian encoding. Text uses a one-byte UTF-8 byte count. The header is `WR16`, version `3`, world count. Each world contains:

1. World ID, name, build-scene index, screen width/height, 16-bit map length and one byte per metatile (`255` means empty).
2. One-byte room count; each room stores ID, name and 16-bit X/Y/W/H.
3. 16-bit marker count; each marker stores ID, kind, name, 16-bit X/Y, destination world ID and destination marker ID.
4. One-byte camera count; each camera stores ID, name, 16-bit X/Y/W/H and mode.

The decoder returns the exact record end and permits subsequent extension types without scanning their contents. Exported validation/codec hooks are `ForgeWorldCodec1621` and `Forge161.build`.
