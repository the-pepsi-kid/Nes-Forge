"""Package the alpha.11 release-candidate test kit from an unchanged source checkout.

Usage from any current working directory:
    python tester-kit/alpha11-review-1/build_kit.py --output ../NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC1.zip
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import tempfile
import zipfile
from pathlib import Path


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
APP = REPO / "app"
KIT_NAME = "NES_Forge_2.0.0-alpha.11_Alpha_Test_Kit_RC1"
APP_SHA = "11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd"
EXAMPLES = {
    "Scout_Gameplay_Core_2.0.0-alpha.11.nesforge.json": "f1e6703d9b23f9e716f421f98dd51c6a14faf0021f7bc5eba0d851b1e5db241b",
    "Scout_Gameplay_Core_2.0.0-alpha.11.nes": "7814bf08504653d3f23964d7c0a654a936b051bf5aadbbf92c4a2eeaf726f4a2",
}
DOCS = (
    "START_HERE.md", "START_HERE.html", "Tutorial.md", "Tutorial.html",
    "NEXT_STEPS.md", "NEXT_STEPS.html", "KNOWN_LIMITS.md", "KNOWN_LIMITS.html",
    "Feedback_Template.txt", "SOURCE_RECORD.json", "style.css",
)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def require(path: Path, expected: str) -> None:
    actual = digest(path)
    if actual != expected:
        raise ValueError(f"Unexpected bytes for {path}: {actual}; expected {expected}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New ZIP path; must not already exist")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        parser.error(f"Refusing to overwrite existing file: {output}")
    if not output.parent.is_dir():
        parser.error(f"Create the destination directory first: {output.parent}")
    app = APP / "mainline" / "NES_Forge_2.0.0-alpha.11.html"
    require(app, APP_SHA)
    for name, expected in EXAMPLES.items():
        require(APP / "examples" / name, expected)

    with tempfile.TemporaryDirectory(prefix="nes-forge-kit-") as scratch:
        root = Path(scratch) / KIT_NAME
        root.mkdir()
        for name in DOCS:
            shutil.copyfile(HERE / name, root / name)
        shutil.copyfile(app, root / "NES_Forge.html")
        (root / "examples").mkdir()
        for name in (*EXAMPLES, "Scout_Gameplay_Preview.png"):
            shutil.copyfile(APP / "examples" / name, root / "examples" / name)
        manifest = []
        for p in sorted(root.rglob("*")):
            if p.is_file():
                manifest.append(f"{digest(p)}  {p.relative_to(root).as_posix()}")
        (root / "SHA256SUMS.txt").write_text("\n".join(manifest) + "\n", encoding="utf-8")
        with zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for p in sorted(root.rglob("*")):
                if p.is_file():
                    info = zipfile.ZipInfo(f"{KIT_NAME}/{p.relative_to(root).as_posix()}")
                    info.date_time = (2026, 10, 18, 0, 0, 0)
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o644 << 16
                    archive.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        with zipfile.ZipFile(output) as archive:
            assert archive.testzip() is None
            for row in manifest:
                expected, name = row.split("  ", 1)
                data = archive.read(f"{KIT_NAME}/{name}")
                if hashlib.sha256(data).hexdigest() != expected:
                    raise AssertionError(f"Package receipt mismatch: {name}")
    print(f"Created {output}\nSHA-256 {digest(output)}\n{len(manifest)+1} kit files")


if __name__ == "__main__":
    main()
