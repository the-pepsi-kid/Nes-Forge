#!/usr/bin/env python3
"""Verify the current candidate (or frozen reference), with an optional disposable gate."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile


def verify(root):
    identity_path = root / "CANDIDATE.json"
    if not identity_path.is_file():
        identity_path = root / "REFERENCE.json"
    reference = json.loads(identity_path.read_text(encoding="utf-8"))
    app = root / "app"
    manifest = app / "SHA256SUMS.txt"
    names = set()
    for line in manifest.read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or name in names:
            raise RuntimeError("Invalid checksum entry: " + name)
        names.add(name)
        path = app.joinpath(*relative.parts)
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise RuntimeError("Reference checksum failed: " + name)
    actual = {p.relative_to(app).as_posix() for p in app.rglob("*") if p.is_file()}
    expected = names | {"SHA256SUMS.txt"}
    if actual != expected:
        raise RuntimeError("Reference inventory differs: " + repr(sorted(actual ^ expected)))
    if len(names) != reference["payloadChecksums"] or len(actual) != reference["packageFiles"]:
        raise RuntimeError("Reference file counts differ")
    html = app / reference["html"]
    if hashlib.sha256(html.read_bytes()).hexdigest() != reference["htmlSha256"]:
        raise RuntimeError("Reference HTML identity differs")
    subprocess.run([sys.executable, "tools/bundle.py", "--check"], cwd=app, check=True)
    print(f"Verified {len(names)} payload checksums and exact {identity_path.name} bundle.", flush=True)
    return app


def gate(app, destination):
    if destination.resolve().is_relative_to(app.resolve()):
        raise RuntimeError("The full-gate copy must be outside the frozen app/ directory")
    if shutil.which("node") is None:
        raise RuntimeError("Node.js 20 or later is required for --full-gate")
    shutil.copytree(app, destination)
    print("Running full gate in " + str(destination), flush=True)
    subprocess.run(["node", "tests/run_candidate.cjs"], cwd=destination, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--full-gate", action="store_true")
    parser.add_argument("--keep-workdir", type=Path, help="Keep a full-gate copy in this initially absent directory")
    args = parser.parse_args()
    if args.keep_workdir is not None and not args.full_gate:
        parser.error("--keep-workdir requires --full-gate")
    root = Path(__file__).resolve().parents[1]
    app = verify(root)
    if args.full_gate:
        if args.keep_workdir is not None:
            gate(app, args.keep_workdir.resolve())
        else:
            with tempfile.TemporaryDirectory(prefix="nes-forge-reference-") as tmp:
                gate(app, Path(tmp) / "app")
            print("Disposable gate copy removed. Use --keep-workdir to retain new reports.")


if __name__ == "__main__":
    main()
