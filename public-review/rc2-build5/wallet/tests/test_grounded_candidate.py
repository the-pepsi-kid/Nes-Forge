#!/usr/bin/env python3
"""Public RC2 candidate 3: release-archive and locally served HTTP acceptance.

No commercial ROM or proprietary media is used. Real EVM wallets and two
graphics-capable browser profiles are a separate owner acceptance gate.
"""
import asyncio, hashlib, json, os, stat, sys, tempfile, zipfile
from pathlib import Path
from aiohttp import ClientSession, web

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT.parent / "NES_Forge_RC2_Build_5_Grounded_Wallet_Review_Candidate_3.zip"
PREFIX = "NES_Forge_Public_Review/"
EXPECTED = {
    "NES_Forge.html", "README_GROUNDED_REVIEW.md", "START_HERE.md",
    "docs/getting-started/Your_First_NES_Game.md",
    "docs/getting-started/Your_First_NES_Game.html",
    "START_LOCALHOST_WINDOWS.cmd", "START_LOCALHOST_MAC_LINUX.sh",
    "01_START_MULTIPLAYER_SERVER_WINDOWS.cmd",
    "02_PREPARE_PRIVATE_ROM_WINDOWS.cmd",
    "03_OPEN_MULTIPLAYER_WINDOWS.cmd", "PREPARE_PRIVATE_Z2_DEMO.py",
    "requirements.txt", "host/server.py", "host/diagnose.py",
    "host/eth_verify.py", "host/native_horizontal.py", "host/native_jump.py",
    "host/native_attack.py", "host/playability.js", "host/client.js",
    "host/client.html", "host/native-link-client.js", "host/native-observer.js",
    "host/render-world.js", "WALLET_REVIEW_MANIFEST.json",
}

def read_and_extract(directory: Path):
    with zipfile.ZipFile(RELEASE) as archive:
        assert archive.testzip() is None
        names=set(archive.namelist())
        assert {PREFIX+p for p in EXPECTED} <= names, sorted({PREFIX+p for p in EXPECTED}-names)
        assert not any(n.lower().endswith((".nes",".chr",".bin",".png",".jpg",".mp4",".db",".sqlite")) for n in names)
        for info in archive.infolist():
            assert info.filename.startswith(PREFIX) and ".." not in Path(info.filename).parts
            assert stat.S_IFMT(info.external_attr>>16)!=stat.S_IFLNK
        md = json.loads(archive.read(PREFIX+"WALLET_REVIEW_MANIFEST.json"))
        assert md["version"]==3
        assert md["host_protocol"]==13
        assert hashlib.sha256(archive.read(PREFIX+"NES_Forge.html")).hexdigest()==md["editor_sha256"]
        assert b"source=ROOT.parent/'NES_Forge.html'" in archive.read(PREFIX+"host/server.py")
        assert b"HTML=ROOT/'NES_Forge.html'" in archive.read(PREFIX+"PREPARE_PRIVATE_Z2_DEMO.py")
        archive.extractall(directory)
    return directory/"NES_Forge_Public_Review"

async def check_http(release_folder: Path):
    host_dir=release_folder/"host"
    sys.path.insert(0,str(host_dir))
    try:
        from server import create_app
        app=create_app(str(release_folder/"test-review.sqlite"),"private-test-token")
        runner=web.AppRunner(app)
        await runner.setup()
        site=web.TCPSite(runner,"127.0.0.1",0)
        await site.start()
        try:
            port=site._server.sockets[0].getsockname()[1]
            async with ClientSession() as client:
                base=f"http://127.0.0.1:{port}"
                async with client.get(base+"/api/health") as r:
                    assert r.status==200
                    health=await r.json()
                    assert health["protocol"]==13 and health["public"] is False
                for path in ("/","/client.js","/render-world.js","/playability.js",
                             "/native-link-client.js","/native-observer.js","/native-editor"):
                    async with client.get(base+path) as r:
                        assert r.status==200,(path,r.status,await r.text())
                        data=await r.read()
                        assert len(data)>100,path
                async with client.post(base+"/api/auth/challenge",
                      json={"address":"not-an-address","chainId":1}) as r:
                    assert r.status==400
                async with client.get(base+"/api/admin/state") as r:
                    assert r.status in (401,403)
        finally:
            await runner.cleanup()
    finally:
        sys.path.remove(str(host_dir))

def main():
    assert RELEASE.exists(), "Candidate 3 ZIP not generated"
    with tempfile.TemporaryDirectory(prefix="forge-rc2-grounded-") as temporary:
        dest=read_and_extract(Path(temporary))
        asyncio.run(check_http(dest))
    print("PASS: grounded candidate 3: assets omitted, scripts present, localhost API and native editor served")

if __name__=="__main__":
    main()
