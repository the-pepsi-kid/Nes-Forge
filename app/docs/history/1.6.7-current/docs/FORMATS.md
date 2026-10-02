# Format compatibility — 1.6.7

## Project schema

Current project JSON uses **schema 9** and foundation/release **1.6.7**. The schema change is deliberate: unresolved authored world references now survive load/save for repair. The actual frozen 1.6.6 editor accepts schema 8 and silently clears some unresolved values, so retaining v8 would imply unsafe compatibility. That same actual baseline rejects schema 9 before changing project/history. Keep that test; do not replace it with a simulated old validator.

Supported legacy/v8 inputs migrate through validation before project replacement. Preserve values still present in the input; migration cannot restore data already deleted by an older editor. Reject malformed/future schemas, duplicate identities and unsupported required data/recognized formats atomically. Unresolved references remain editable but fail build validation until repaired.

**Downgrade to schema 8 is unsupported.** Do not silently strip data or relabel current output. Foundation is a release identifier, not a substitute for schema validation. JSON/portable ZIP are complete authoring backups; ROM reopening is bounded by existing representable metadata and build-index remapping.

## Unchanged ROM versions

| Format | Current version | Role |
| --- | --- | --- |
| Forge ROM layout / NFORGE15 marker | 3 | Packed ROM layout identification |
| NFEX payload | 1 | Authoring extension payload; not the outer layout version |
| MT16 | 1 | Metatile metadata |
| WR16 | 3 | World/room/marker metadata and stored identities |
| MS16 | 2 | Composed sprites/animations/entity metadata; retains nested v1 records |
| GP16 | 1 | Existing single-room gameplay configuration |

No ROM codec version or build target is added by 1.6.7. Readers retain CRC, bounds and strict decoding checks. Unsupported recognized formats reject before state mutation. WR16 v1/v2 files cannot recover identities that those versions never stored; preserve the explicit legacy warnings.

## Existing single-room layout

| CPU region | Use |
| --- | --- |
| `$8000–$9FFF` | Generated 6502 code, bounded to 8 KB |
| `$A000–$B7FF` | Collision, animation descriptors, poses, contacts and event masks; bounded to 6 KB |
| `$B800–$BFFF` | GP16 configuration reservation |
| `$C000–$CFFF` | Retained viewer and authoring metadata, including marker at `$CFF0` |
| `$D000 + n × $0600` | Packed scene blocks and following tile-property table |
| `$FFFA–$FFFF` | NMI/reset/IRQ vectors |

GP16 starts at `$B800`: ASCII `GP16`, version byte 1, little-endian u32 payload length, little-endian u32 CRC32, then strict UTF-8 JSON. The complete record fits its existing 2,048-byte reservation. Its `NESForgeGameplay` payload contains version 1, scene/player/target indices, movement/jump/gravity/fall speed and movement-body dimensions. `targetIndex=-1` means no target. Indices refer to packed scene/entity order, not selected editor rows.

Existing mapper-0 output, 16/32 KB PRG, 8 KB CHR and authoring-metadata allocation limits remain unchanged. Code/data and metadata capacities are checked separately; neither silently truncates data. Build phases and reservations are specified in `../ARCHITECTURE_CONTRACT.md`.

Runtime hardware pieces remain 8×8 with sprite pattern table `$1000`; authored 8×16 pieces expand into two records. Facing reflects art about the entity origin. Existing event-mask values remain attack_start=1, attack_end=2, footstep=4, sound=8 and custom=16; full ordered event records remain authoring metadata. These markers do not imply compiled music or arbitrary script execution.
