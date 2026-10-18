#!/usr/bin/env python3
"""Reproduce the original score fixtures with an installed FamiStudio 4.5.3 CLI.

This optional integration check uses the external application's reader/exporter,
not NES Forge's parser. It does not download or install FamiStudio.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", required=True, type=Path)
    parser.add_argument("--dotnet-root", type=Path)
    args = parser.parse_args()
    executable = args.executable.resolve(strict=True)
    fixtures = Path(__file__).resolve().parents[1] / "tests/fixtures/famistudio-export"
    manifest = json.loads((fixtures / "provenance.json").read_text(encoding="utf-8"))
    env = os.environ.copy()
    if args.dotnet_root:
        env["DOTNET_ROOT"] = str(args.dotnet_root.resolve(strict=True))

    def run(source, command, destination, *options):
        completed = subprocess.run(
            [str(executable), str(source), command, str(destination), *options],
            cwd=destination.parent, env=env, text=True, capture_output=True, check=True,
        )
        if not destination.is_file():
            raise RuntimeError("FamiStudio did not produce output: " + completed.stdout + completed.stderr)

    def check_text(actual, expected):
        # File.WriteAllLines uses platform-native newlines. No semantic content
        # or attribute ordering is normalized away.
        if actual.read_text(encoding="utf-8") != expected.read_text(encoding="utf-8"):
            raise RuntimeError("Official exporter output differs from " + expected.name)

    for item in manifest["files"]:
        path = fixtures / item["path"]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != item["sha256"]:
            raise RuntimeError("Pinned fixture hash mismatch: " + item["path"])

    with tempfile.TemporaryDirectory(prefix="forge-famistudio-fixture-") as folder:
        target = Path(folder)
        for name in ("famistudio", "famitracker-tempo"):
            reference = fixtures / ("forge-four-channel-" + name + ".txt")
            output = target / (name + ".txt")
            run(fixtures / "inputs" / ("seed-" + name + ".txt"), "famistudio-txt-export", output)
            check_text(output, reference)
            second = target / (name + "-reexport.txt")
            run(output, "famistudio-txt-export", second)
            check_text(second, reference)
            print("PASS official import, export, and reimport/export:", reference.name)
        rom = target / "fixture.nes"
        run(fixtures / "forge-four-channel-famistudio.txt", "rom-export", rom, "-rom-export-mode:ntsc")
        reference_rom = fixtures / "forge-four-channel-famistudio.nes"
        if rom.read_bytes() != reference_rom.read_bytes():
            raise RuntimeError("Official ROM export is not byte-identical to the fixture")
        print("PASS byte-identical official MMC5 ROM export:", reference_rom.name)
    print("All pinned fixture hashes match.")


if __name__ == "__main__":
    main()
