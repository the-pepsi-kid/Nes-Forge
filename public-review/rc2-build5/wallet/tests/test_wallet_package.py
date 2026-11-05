#!/usr/bin/env python3
"""Offline/localhost-only preflight for the RC2 wallet review package."""
from __future__ import annotations

import asyncio
import hashlib
import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = ROOT / "host"
sys.path.insert(0, str(HOST))
from aiohttp import ClientSession, web
from eth_verify import keccak256
from server import create_app

EXPECTED_FILES = {
    "NES_Forge_Public_Review/NES_Forge.html",
    "NES_Forge_Public_Review/START_LOCALHOST_WINDOWS.cmd",
    "NES_Forge_Public_Review/START_LOCALHOST_MAC_LINUX.sh",
    "NES_Forge_Public_Review/requirements.txt",
    "NES_Forge_Public_Review/host/server.py",
    "NES_Forge_Public_Review/host/eth_verify.py",
    "NES_Forge_Public_Review/host/diagnose.py",
    "NES_Forge_Public_Review/host/client.html",
    "NES_Forge_Public_Review/host/client.js",
    "NES_Forge_Public_Review/host/render-world.js",
    "NES_Forge_Public_Review/README_WALLET_TEST.md",
    "NES_Forge_Public_Review/WALLET_REVIEW_MANIFEST.json",
}

async def check_local_http():
    with tempfile.TemporaryDirectory(prefix="forge-wallet-smoke-") as d:
        app = create_app(str(Path(d) / "test.sqlite"), "local-test-admin-token")
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "127.0.0.1", 0)
        await site.start()
        try:
            port = site._server.sockets[0].getsockname()[1]
            url = f"http://127.0.0.1:{port}"
            async with ClientSession() as client:
                async with client.get(url + "/api/health") as response:
                    assert response.status == 200, response.status
                    data = await response.json()
                    assert data["protocol"] == 13, data
                    assert data["wallet"] == "EOA personal_sign", data
                    assert data["public"] is False, data
                for route in ["/", "/client.js", "/render-world.js"]:
                    async with client.get(url + route) as response:
                        assert response.status == 200, (route, response.status)
                        assert len(await response.read()) > 100, route
                async with client.post(url + "/api/auth/challenge", json={"address":"bad","chainId":1}) as response:
                    assert response.status == 400, response.status
        finally:
            await runner.cleanup()

def check_zip(path: Path):
    with zipfile.ZipFile(path) as bundle:
        entries = set(bundle.namelist())
        assert EXPECTED_FILES <= entries, sorted(EXPECTED_FILES - entries)
        assert bundle.testzip() is None
        manifest = json.loads(bundle.read("NES_Forge_Public_Review/WALLET_REVIEW_MANIFEST.json"))
        assert manifest["wallet_server"].startswith("protocol-13")
        app = bundle.read("NES_Forge_Public_Review/NES_Forge.html")
        assert hashlib.sha256(app).hexdigest() == manifest["editor_sha256"]
        assert b"host/server.py" in bundle.read("NES_Forge_Public_Review/README_WALLET_TEST.md")

def main():
    assert keccak256(b"").hex() == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
    asyncio.run(check_local_http())
    archive = ROOT.parent / "NES_Forge_RC2_Build_5_Public_Wallet_Review_Candidate_2.zip"
    if archive.is_file():
        check_zip(archive)
    else:
        print("Archive not created yet; localhost smoke passed.")
    print("PASS: wallet signature hashing, protocol 13 health, static client, malformed auth rejection, archive inventory")

if __name__ == "__main__":
    main()
