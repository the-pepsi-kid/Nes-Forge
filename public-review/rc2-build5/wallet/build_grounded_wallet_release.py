#!/usr/bin/env python3
"""Build rights-reduced RC2 Build 5 Candidate 3 (grounded host + two-wallet localhost).

Never copies the owner-held RC2 archive. It takes only the already-public
Candidate 2 and an audited source-only archive of localhost host/client files.
"""
from __future__ import annotations
import hashlib, io, json, re, stat, sys, tarfile, zipfile
from pathlib import Path, PurePosixPath

RC2 = Path(__file__).resolve().parent.parent
WALLET = Path(__file__).resolve().parent
SOURCE = RC2 / "NES_Forge_RC2_Build_5_Public_Wallet_Review_Candidate_2.zip"
PATCH = WALLET / "grounded-host-sources.tar.gz"
SUPPLEMENT = WALLET / "grounded-test-sources.tar.gz"
OUTPUT = RC2 / "NES_Forge_RC2_Build_5_Grounded_Wallet_Review_Candidate_3.zip"
SOURCE_SHA256 = "e04123021acfa750eba17086e3e068207ab14b128c4a9539b9fa90babb4618e1"
PATCH_SHA256 = "d7f1098323dd6ff3d7e44e8f7fa202830d25b3b3fd927089bd7eebb2b59a02e1"
SUPPLEMENT_SHA256 = "653ac5541abeed2b2ab39d48d18ab6de4e518e58f029626ad79506a915591159"
EDITOR_SHA256 = "c8f1871bc919adaab25c763820b3818ac61b5307bb67993f7a4ef41dae9da481"
PREFIX = "NES_Forge_Public_Review/"
HOST_FILES = {
    "host/server.py", "host/client.js", "host/client.html",
    "host/playability.js", "host/native_horizontal.py", "host/native_jump.py",
    "host/native_attack.py", "host/native-observer.js", "host/native-link-client.js",
    "host/eth_verify.py", "host/diagnose.py", "host/render-world.js",
    "START_LOCALHOST_WINDOWS.cmd", "START_LOCALHOST_MAC_LINUX.sh", "requirements.txt",
}
EXTRA_FILES = {
    "PREPARE_PRIVATE_Z2_DEMO.py", "Windows_02_Prepare_Private_ROM_Demo.cmd",
    "tests/test_rev8_frame_presentation.py", "tests/test_rev3_original_floor_browser.py",
}

def hash_bytes(v):
    return hashlib.sha256(v).hexdigest()

def verify_zip_name(raw):
    p = PurePosixPath(raw)
    if not raw.startswith(PREFIX) or p.is_absolute() or ".." in p.parts or "\\" in raw:
        raise RuntimeError("Unsafe or mismatched ZIP member: " + raw)

def read_source_archive(path, expected_sha, whitelist):
    data = path.read_bytes()
    if hash_bytes(data) != expected_sha:
        raise RuntimeError("Source archive integrity mismatch: " + str(path))
    result = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member in archive:
            if not member.isfile() or member.issym() or member.islnk() or member.size > 150000:
                raise RuntimeError("Unexpected source archive member: " + member.name)
            p = PurePosixPath(member.name)
            if p.is_absolute() or ".." in p.parts or member.name not in whitelist:
                raise RuntimeError("Source archive path outside review allowlist: " + member.name)
            payload = archive.extractfile(member).read()
            payload.decode("utf-8")
            if b"\x00" in payload or re.search(rb"[A-Za-z0-9+/=]{501,}", payload):
                raise RuntimeError("Embedded binary/coded payload detected: " + member.name)
            if member.name in result:
                raise RuntimeError("Duplicate source path: " + member.name)
            result[member.name] = payload
    if set(result) != whitelist:
        raise RuntimeError("Expected source paths missing: " + repr(sorted(whitelist - set(result))))
    return result

def info(path):
    zi = zipfile.ZipInfo(path, date_time=(2026, 11, 5, 0, 0, 0))
    zi.compress_type = zipfile.ZIP_DEFLATED
    zi.external_attr = 0o100644 << 16
    return zi

def build():
    if hash_bytes(SOURCE.read_bytes()) != SOURCE_SHA256:
        raise RuntimeError("Candidate 2 ZIP identity changed")
    files = read_source_archive(PATCH, PATCH_SHA256, HOST_FILES)
    extra = read_source_archive(SUPPLEMENT, SUPPLEMENT_SHA256, EXTRA_FILES)

    # The private development tree contains a separate hosted HTML entry.
    # This rights-reduced release only contains the sanctioned public RC2 HTML.
    before = b"source=ROOT.parent/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'"
    after = b"source=ROOT.parent/'NES_Forge.html'"
    if files["host/server.py"].count(before) != 1:
        raise RuntimeError("Unexpected native-editor route; abort")
    files["host/server.py"] = files["host/server.py"].replace(before, after)

    before = b"HTML=ROOT/'NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'"
    after = b"HTML=ROOT/'NES_Forge.html'"
    if extra["PREPARE_PRIVATE_Z2_DEMO.py"].count(before) != 1:
        raise RuntimeError("Unexpected local ROM preparation editor path; abort")
    extra["PREPARE_PRIVATE_Z2_DEMO.py"] = extra["PREPARE_PRIVATE_Z2_DEMO.py"].replace(before, after)

    documentation = WALLET / "README_GROUNDED_REVIEW.md"
    additional = {
        "README_GROUNDED_REVIEW.md": documentation.read_bytes(),
        "01_START_MULTIPLAYER_SERVER_WINDOWS.cmd": (
            '@echo off\r\ncd /d "%~dp0"\r\ncall START_LOCALHOST_WINDOWS.cmd\r\n').encode(),
        "02_PREPARE_PRIVATE_ROM_WINDOWS.cmd": (
            '@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\n'
            'echo Local original-ROM asset preparation. Requires Python 3.11+ and Playwright Chromium.\r\n'
            'set /p "ROM_PATH=Full path to your private Zelda II US ROM: "\r\n'
            'set /p "ADMIN_TOKEN=Current localhost admin token: "\r\n'
            'py PREPARE_PRIVATE_Z2_DEMO.py --rom "%ROM_PATH%" --admin-token "%ADMIN_TOKEN%"\r\n'
            'pause\r\n').encode(),
        "03_OPEN_MULTIPLAYER_WINDOWS.cmd": (
            '@echo off\r\nstart "" "http://127.0.0.1:8765/"\r\n').encode(),
    }
    # Bundle the standalone beginner tutorial; keep links on the GitHub home page.
    repo_root = WALLET.parents[2]
    for relative in ("Your_First_NES_Game.md", "Your_First_NES_Game.html"):
        tutorial = repo_root / "docs" / "getting-started" / relative
        additional["docs/getting-started/" + relative] = tutorial.read_bytes()
    additional["START_HERE.md"] = documentation.read_bytes()

    additional.update({k: v for k, v in extra.items() if not k.startswith("tests/")})
    updates = {PREFIX + path: contents for path, contents in {**files, **additional}.items()}
    with zipfile.ZipFile(SOURCE) as old:
        original_names = {member.filename for member in old.infolist()}
        for entry in old.infolist():
            verify_zip_name(entry.filename)
            if entry.is_dir():
                continue
            if stat.S_IFMT(entry.external_attr >> 16) == stat.S_IFLNK:
                raise RuntimeError("No symlinks in release ZIP")
        editor = old.read(PREFIX + "NES_Forge.html")
        if hash_bytes(editor) != EDITOR_SHA256:
            raise RuntimeError("Public RC2 HTML unexpectedly changed")
        manifest = {
            "format": "nesforge.rc2.grounded-wallet-candidate",
            "version": 3,
            "status": "experimental-alpha-localhost-review",
            "editor_sha256": EDITOR_SHA256,
            "parent_zip_sha256": SOURCE_SHA256,
            "grounded_source_sha256": PATCH_SHA256,
            "test_source_sha256": SUPPLEMENT_SHA256,
            "host_protocol": 13,
            "wallet": "Ethereum EOA personal_sign local-test only",
            "verified": "source syntax, localhost HTTP, synthetic motion/ground tests only",
            "limitations": "Native Zelda II collision, full dual-browser parity, rights clearance and Stellar features remain unverified",
            "host_files": {key:hash_bytes(data) for key, data in sorted(files.items())},
        }
        updates[PREFIX + "WALLET_REVIEW_MANIFEST.json"] = (json.dumps(manifest,indent=2,sort_keys=True)+"\n").encode()
        with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as dest:
            for member in old.infolist():
                if member.is_dir() or member.filename in updates:
                    continue
                dest.writestr(member, old.read(member.filename))
            for name, data in sorted(updates.items()):
                if name not in original_names and name.lower().endswith((".nes", ".bin", ".chr", ".png", ".jpg", ".db")):
                    raise RuntimeError("Proprietary or local-state asset in release")
                dest.writestr(info(name), data)
    with zipfile.ZipFile(OUTPUT) as check:
        assert check.testzip() is None
        assert hash_bytes(check.read(PREFIX + "NES_Forge.html")) == EDITOR_SHA256
        for name, data in updates.items():
            assert check.read(name) == data
    print("Grounded multiplayer alpha review ZIP: " + str(OUTPUT))
    print("Bytes: " + str(OUTPUT.stat().st_size))
    print("SHA-256: " + hash_bytes(OUTPUT.read_bytes()))
    return OUTPUT

if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print("CANDIDATE 3 FAILED: " + str(exc),file=sys.stderr)
        sys.exit(1)
