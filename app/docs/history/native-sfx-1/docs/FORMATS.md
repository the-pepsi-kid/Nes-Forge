# Format compatibility — 1.9.0

## Project schema 12

Current project JSON uses schema **12** and foundation **1.9.0**. Top-level `gameplayCore` owns its explicit enable flag, Actor Definitions, canonical behavior tables, Actor Instances and Room/World persistent-variable declarations. Runtime Actor slots and transient state are never serialized into this authoring record.

Schema 11 cannot preserve Gameplay Core. The actual frozen 1.8 editor rejects schema 12 before mutation. Supported older projects migrate with Gameplay Core disabled and retain their supported World/Audio settings. Unknown condition/action records survive authoring but reject an enabled executable build. Explicit downgrade is unsupported.

World layout 4 / WG17 remains version 1. Its checked source record accepts schemas 10, 11 and 12. Layout-3 codecs and GP16 remain unchanged when Gameplay Core is unused.

## Retained Audio schema 11 model

Schema **11** and foundation **1.8** introduced top-level `audioRuntime` with explicit `enabled` and `musicEnabled` switches. Top-level `sfx` retains the existing collection while schema 11 gives each entry a required unique string `id`, name, channel, pattern and inclusive start/end rows. Tracker patterns, instruments, order, tempo, speed and animation `sound` events remain their existing records inside schema 12.

Schema 10 cannot preserve the new runtime switches and stable SFX routing. The actual frozen 1.7 editor rejects schema 11 before mutation. Explicit downgrade is unsupported. Supported older projects migrate with Audio Runtime disabled; schema-10 World settings remain intact. Unresolved sound values survive while authoring-only and fail when an enabled build needs them.

The schema-10 World and schema-9 unresolved-reference guarantees remain. The actual 1.6.6 schema-8 data-loss behavior is historical characterization, not supported downgrade behavior.

## ROM formats by backend

| Backend | Outer layout | Records |
| --- | --- | --- |
| World Runtime | NFORGE15 layout 4 | WG17 v1 checked compressed schema-10/11/12 source and generated world/audio/gameplay code/data |
| Packed viewer/custom, existing single-room | NFORGE15 layout 3 | NFEX v1, MT16 v1, WR16 v3, MS16 v2; single-room GP16 v1 |
| Unpacked custom | Existing custom layout | Existing assembly and direct CHR behavior |

Audio Runtime does not add or relabel an outer ROM format. Audio-enabled generated viewer/single-room code is executable data in the existing layout-3 ROM; JSON/ZIP is the complete audio-authoring backup for those paths. Audio-enabled authored custom assembly rejects.

World output remains iNES mapper 0 with 32 KB PRG and 8 KB CHR. WG17 version 1 retains its 64-byte checked header and deterministic LZSS source bytes. Its source-schema field accepts 10, 11 or 12, and decoded JSON must match that field. Lengths, bounds, header/source/engine/CHR checksums, placement, vectors and flags are validated before replacement. The source omits a prior imported ROM to avoid recursion.

Open Forge ROM restores checked World source and retains the newly opened ROM as original playback bytes. Single-room layout-3/GP16 ROMs do not embed schema-12 Gameplay Core source: reopening them is explicitly partial, leaves Gameplay Core disabled/empty, preserves the original bytes for Run Original and directs creators to native JSON/ZIP backups for complete authoring recovery. A new source-bearing single-room ROM format is not authorized by 1.9.0 stabilization. Append Import directs World ROMs to Open Forge ROM. Old supported ROMs continue through existing append/capture paths. Corrupt or unsupported recognized formats reject before state/history/runtime/identity mutation.

## Runtime allocation

The scene viewer’s generated audio code/data must fit below the existing `$CFF0` marker without overlapping packed metadata. The single-room engine keeps code below `$A000`, runtime data below `$B800`, GP16 at `$B800–$BFFF`, and the retained packed authoring bank at `$C000–$FFFF`. World code, screen resources and audio must end before `$CFF0`; WG17 is then allocated without overlap. Gameplay Core permits 12 executable Actor Instances total and 64 one-byte persistent values at `$0380–$03BF`; actor health begins at `$03C0`. Capacity failures publish no artifact.

Protected source and five whole-ROM golden comparisons remain release gates. New audio or source-schema support does not establish general reverse engineering, arbitrary recovery from foreign ROMs, or independent NES hardware verification.
