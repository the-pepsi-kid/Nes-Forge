"""Source-bound placement ledger for Forge Agent Lab.

A physical PRG/CHR bank has a verified position in the .nes file, but no
inferred scene coordinates, CPU/PPU mapping, actor behavior or native writer.
Never promote raw bank extraction to a reconstructed placement claim.
"""
from __future__ import annotations

import re

SHA256 = re.compile(r"^[0-9a-f]{64}$")
BANK_BYTES = {"prg": 16384, "chr": 8192}


def _digest(value: object, label: str) -> str:
    if not isinstance(value, str) or not SHA256.fullmatch(value):
        raise ValueError(f"{label} must be a lowercase SHA-256 hex digest")
    return value


def make_placement_ledger(rom_sha256: str, editor_sha256: str | None,
                          header: dict, verified_bank_checks: list[dict] | None = None) -> dict:
    """Build evidence-only source placements from *independently verified* banks.

    Pass verified_bank_checks only after comparing each extracted bank against
    the original ROM. None means verification has not passed; no source-bank
    location is marked as verified. This function never reads or alters a ROM.
    """
    _digest(rom_sha256, "ROM identity")
    if editor_sha256 is not None:
        _digest(editor_sha256, "Editor identity")
    if not isinstance(header, dict):
        raise ValueError("A validated NES header is required")
    mapper = header.get("mapper")
    trainer_bytes = header.get("trainer_bytes")
    if type(mapper) is not int or not 0 <= mapper <= 4095:
        raise ValueError("Invalid mapper number")
    if trainer_bytes not in (0, 512):
        raise ValueError("Invalid trainer length")
    sizes = {key: header.get(key + "_bytes") for key in BANK_BYTES}
    for key, size in sizes.items():
        if type(size) is not int or size < 0 or size > 128 * 1024 * 1024:
            raise ValueError(f"Invalid {key} byte length")
    starts = {"prg": 16 + trainer_bytes,
              "chr": 16 + trainer_bytes + sizes["prg"]}
    records = []
    if verified_bank_checks is not None:
        if not isinstance(verified_bank_checks, list):
            raise ValueError("Verified bank checks must be a list")
        by_key = {}
        for item in verified_bank_checks:
            if not isinstance(item, dict):
                raise ValueError("Malformed bank check")
            key, index = item.get("type"), item.get("bank")
            if key not in BANK_BYTES or type(index) is not int or index < 0:
                raise ValueError("Invalid bank type or index")
            pair = (key, index)
            if pair in by_key:
                raise ValueError("Duplicate bank check")
            by_key[pair] = item
        for key, stride in BANK_BYTES.items():
            count = (sizes[key] + stride - 1) // stride
            if {index for kind, index in by_key if kind == key} != set(range(count)):
                raise ValueError(f"Incomplete or extra verified {key} bank checks")
            for index in range(count):
                item = by_key[(key, index)]
                remaining = sizes[key] - index * stride
                length = min(stride, remaining)
                if type(item.get("size")) is not int or item["size"] != length:
                    raise ValueError(f"Verified {key} bank size mismatch")
                bank_hash = _digest(item.get("sha256"), "Verified bank")
                records.append({
                    "id": f"{key}-bank-{index:03d}",
                    "kind": "physical_bank",
                    "source": {"region": "PRG_ROM" if key == "prg" else "CHR_ROM",
                               "bank": index, "file_offset": starts[key] + index * stride,
                               "byte_length": length, "sha256": bank_hash,
                               "verification": "independent_original_byte_comparison"},
                    "rom_runtime_mapping": {"status": "unverified", "address": None,
                                            "mapper_state": None},
                    "scene_composition": {"status": "unverified", "scene_id": None,
                                          "x": None, "y": None, "palette_id": None},
                    "entity_instance": {"status": "unverified", "spawn": None,
                                        "behavior_id": None},
                    "editor_resource": {"status": "unbound", "resource_id": None},
                    "native_writeback": {"status": "unverified", "codec": None},
                })
    return {
        "schema": "NESForgeSourcePlacementLedger/v1",
        "source_sha256": rom_sha256,
        "editor_sha256": editor_sha256,
        "mapper": mapper,
        "verified_raw_banks": len(records),
        "records": records,
        "unresolved": [
            "Reconstruct scene tiles and palette placement from source tables or traces",
            "Link assembled sprites and animation order to original scene context",
            "Verify actors, spawn positions, collision and gameplay triggers",
            "Observe mapper bank-switch state before claiming CPU/PPU addresses",
            "Verify audio cue placement and event timing in gameplay",
            "Demonstrate edit, save, native rebuild, and independent execution parity",
        ],
        "build_targets": {
            "classic_nes": {"default": True, "requires_network": False,
                            "compatibility": "not_certified_by_extraction"},
            "enhanced_emulator": {"default": False, "status": "future_opt_in"},
            "hosted_world": {"default": False, "status": "future_opt_in"},
        },
        "limits": "Verified ROM byte offsets are not scene placements, runtime mappings or build support",
    }
