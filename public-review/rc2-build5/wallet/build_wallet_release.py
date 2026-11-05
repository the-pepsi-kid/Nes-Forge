#!/usr/bin/env python3
"""Build a rights-reduced, self-contained RC2 wallet/localhost review ZIP.

The original sanitized RC2 Candidate 1 archive is immutable input. The published
protocol-13 host is copied unchanged from the experimental hosted-worlds track.
Neither proprietary recovery evidence nor wallet secrets are added.
"""
from __future__ import annotations

import hashlib
import json
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

RC2_ROOT = Path(__file__).resolve().parent.parent
WALLET_DIR = Path(__file__).resolve().parent
SOURCE = RC2_ROOT / "NES_Forge_RC2_Build_5_Public_Review_Candidate_1.zip"
OUTPUT = RC2_ROOT / "NES_Forge_RC2_Build_5_Public_Wallet_Review_Candidate_2.zip"
SOURCE_SHA256 = "18a2c67a390c974d8f5df32a956165a58e6fdfe5b7442d8fe5c876552550358a"
EDITOR_SHA256 = "c8f1871bc919adaab25c763820b3818ac61b5307bb67993f7a4ef41dae9da481"
ZIP_ROOT = "NES_Forge_Public_Review/"
EXTRA = (
    "START_LOCALHOST_WINDOWS.cmd",
    "START_LOCALHOST_MAC_LINUX.sh",
    "requirements.txt",
    "README_WALLET_TEST.md",
    "host/client.html",
    "host/client.js",
    "host/diagnose.py",
    "host/eth_verify.py",
    "host/render-world.js",
    "host/server.py",
)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def check_member(info: zipfile.ZipInfo) -> None:
    raw = info.filename
    p = PurePosixPath(raw)
    if not raw.startswith(ZIP_ROOT) or p.is_absolute() or ".." in p.parts or "\\" in raw:
        raise ValueError(f"Unsafe or unexpected source ZIP member: {raw!r}")
    if stat.S_IFMT(info.external_attr >> 16) == stat.S_IFLNK:
        raise ValueError(f"Refusing ZIP symlink: {raw!r}")

def deterministic_info(path: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(path, date_time=(2026, 11, 4, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (0o100644 << 16)
    return info

def build() -> Path:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    data = SOURCE.read_bytes()
    if sha256(data) != SOURCE_SHA256:
        raise RuntimeError("Candidate 1 input ZIP SHA-256 does not match published checkpoint")
    with zipfile.ZipFile(SOURCE) as original:
        infos = original.infolist()
        for item in infos:
            check_member(item)
        editor = original.read(ZIP_ROOT + "NES_Forge.html")
        if sha256(editor) != EDITOR_SHA256:
            raise RuntimeError("RC2 HTML identity mismatch; refusing to package another build")
        source_names = {i.filename for i in infos}
        if any(ZIP_ROOT + f in source_names for f in EXTRA):
            raise RuntimeError("RC2 source ZIP unexpectedly already includes wallet components")
        wallet_data = {}
        for rel in EXTRA:
            file = WALLET_DIR / rel
            if not file.is_file():
                raise FileNotFoundError(file)
            wallet_data[rel] = file.read_bytes()

        manifest = {
            "name": "NES Forge RC2 Build 5 Public Wallet Review Candidate 2",
            "status": "experimental-localhost-compatibility-review",
            "origin": "sanitized RC2 public review candidate 1",
            "base_zip_sha256": SOURCE_SHA256,
            "editor_sha256": EDITOR_SHA256,
            "wallet_server": "protocol-13 experimental v17.1 host/client, unchanged source",
            "wallet_signing": "EVM personal_sign (test wallet), not Stellar",
            "known_limit": "Full RC2 editor-to-hosted-gameplay and browser acceptance pending",
            "wallet_files": {k: sha256(v) for k, v in sorted(wallet_data.items())},
        }
        with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
            for info in infos:
                target.writestr(info, original.read(info))
            for rel, payload in sorted(wallet_data.items()):
                target.writestr(deterministic_info(ZIP_ROOT + rel), payload)
            target.writestr(
                deterministic_info(ZIP_ROOT + "WALLET_REVIEW_MANIFEST.json"),
                (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode(),
            )
    with zipfile.ZipFile(OUTPUT) as chk:
        assert chk.testzip() is None
        assert chk.read(ZIP_ROOT + "NES_Forge.html") == editor
        assert chk.read(ZIP_ROOT + "host/server.py") == wallet_data["host/server.py"]
    print(f"Wallet review ZIP: {OUTPUT}")
    print(f"Bytes: {OUTPUT.stat().st_size}")
    print(f"SHA-256: {sha256(OUTPUT.read_bytes())}")
    print("Check: preserved RC2 editor plus wallet server, client, launchers and manifest")
    return OUTPUT

if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print(f"Wallet package build FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
