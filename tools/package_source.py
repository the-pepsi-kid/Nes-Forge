#!/usr/bin/env python3
"""Archive a clean committed source tree and all local Git refs for a handoff."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    run = lambda *cmd: subprocess.check_output(cmd, cwd=root)
    if run("git", "status", "--porcelain").strip():
        raise SystemExit("Commit the source handoff before packaging it.")
    target = args.output.resolve()
    if target.is_relative_to(root):
        raise SystemExit("Write the source archive outside the source tree.")
    target.parent.mkdir(parents=True, exist_ok=True)
    prefix = "NES_Forge_Source/"
    head = run("git", "rev-parse", "HEAD").decode().strip()
    archive = run("git", "archive", "--format=zip", "HEAD")
    with tempfile.TemporaryDirectory(prefix="nes-forge-history-") as temporary:
        bundle = Path(temporary) / "NES_Forge_History.bundle"
        subprocess.run(["git", "bundle", "create", str(bundle), "--all"], cwd=root, check=True)
        subprocess.run(["git", "bundle", "verify", str(bundle)], cwd=root, check=True)
        payload = {}
        with zipfile.ZipFile(io.BytesIO(archive)) as source:
            for item in source.infolist():
                if not item.is_dir():
                    payload[item.filename] = source.read(item)
        # Check committed bytes, not only the live worktree. An obsolete tracked
        # build must never slip into a source kit outside the app manifest.
        identity = json.loads(payload["CANDIDATE.json"])
        app = {name[4:]: data for name, data in payload.items() if name.startswith("app/")}
        expected = {}
        for line in app["SHA256SUMS.txt"].decode().splitlines():
            digest, name = line.split("  ", 1)
            if name in expected:
                raise RuntimeError("Duplicate committed application checksum: " + name)
            expected[name] = digest
        if set(app) != set(expected) | {"SHA256SUMS.txt"}:
            raise RuntimeError("Committed app inventory differs from the delivered manifest")
        if len(expected) != identity["payloadChecksums"] or len(app) != identity["packageFiles"]:
            raise RuntimeError("Committed app file counts differ from candidate identity")
        for name, digest in expected.items():
            if hashlib.sha256(app[name]).hexdigest() != digest:
                raise RuntimeError("Committed application bytes differ: " + name)
        if hashlib.sha256(app[identity["html"]]).hexdigest() != identity["htmlSha256"]:
            raise RuntimeError("Committed HTML differs from candidate identity")
        payload["NES_Forge_History.bundle"] = bundle.read_bytes()
        payload["SOURCE_COMMIT.txt"] = (head + "\n").encode()
        payload["SOURCE_SHA256SUMS.txt"] = "".join(
            hashlib.sha256(data).hexdigest() + "  " + name + "\n"
            for name, data in sorted(payload.items())
        ).encode()
        temporary_zip = target.with_suffix(target.suffix + ".tmp")
        with zipfile.ZipFile(temporary_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
            for name, data in sorted(payload.items()):
                output.writestr(prefix + name, data)
        with zipfile.ZipFile(temporary_zip) as output:
            assert output.testzip() is None
            for name, data in payload.items():
                assert output.read(prefix + name) == data, name
        temporary_zip.replace(target)
    print("Source commit: " + head)
    print("Verified source archive: " + str(target))
    print("Files: " + str(len(payload)))
    print("SHA-256: " + hashlib.sha256(target.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
