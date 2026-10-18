"""Check an extracted kit for missing guides, broken links, and changed app bytes.

Usage: python verify_kit.py PATH_TO_EXTRACTED_KIT
Uses Python's standard library. This is packaging QA, not app acceptance.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import csv
import hashlib
import json
import re
import sys


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.links = []
        self.ids = set()
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if key in attrs:
                self.links.append(attrs[key])


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(root):
    root = root.resolve()
    here = Path(__file__).resolve().parent
    expected = json.loads((here / "package_files.json").read_text())
    for name in expected:
        assert (root / name).is_file(), f"Missing required package file: {name}"
    record = json.loads((root / "SOURCE_RECORD.json").read_text())
    assert sha(root / "NES_Forge.html") == record["app"]["sha256"]
    for name, digest in record["included_examples"].items():
        assert sha(root / "examples" / name) == digest, name
    receipt = (root / "SHA256SUMS.txt").read_text().splitlines()
    listed = set()
    for row in receipt:
        digest, name = row.split("  ", 1)
        assert sha(root / name) == digest, f"Manifest mismatch: {name}"
        listed.add(name)
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    assert actual == listed | {"SHA256SUMS.txt"}, "Manifest coverage mismatch"
    documents = {p: Document(p.read_text()) for p in root.rglob("*.html") if p.name != "NES_Forge.html"}
    checked_links = 0
    for path, doc in documents.items():
        for link in doc.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            assert target.is_relative_to(root), f"Link leaves kit: {path.name}: {link}"
            assert target.is_file(), f"Broken link: {path.relative_to(root)}: {link}"
            if url.fragment and target in documents:
                assert unquote(url.fragment) in documents[target].ids, f"Missing anchor: {link}"
            checked_links += 1
    tutorial = (root / "Tutorial.md").read_text()
    for i in range(1, 10):
        assert re.search(rf"^## {i}\. ", tutorial, re.M), f"Tutorial step {i} missing"
    with (root / "Reference/Control_Index.csv").open(newline="") as f:
        baseline_controls = len(list(csv.DictReader(f)))
    assert baseline_controls == 439, "Historical control index lost rows"
    inventory = json.loads((here / "CONTENT_INVENTORY.json").read_text())
    assert len(inventory["files"]) == inventory["original_file_count"] == 38
    for item in inventory["files"]:
        for name in item["current_paths"]:
            assert (root / name).is_file(), f"Unaccounted original material: {item}"
    result = {"package_files": len(actual), "documentation_html_pages": len(documents),
              "local_links_and_assets_checked": checked_links, "broken_links": 0,
              "tutorial_core_steps": 9, "historical_control_rows": baseline_controls,
              "original_files_accounted": len(inventory["files"]),
              "app_sha256": record["app"]["sha256"], "result": "PASS",
              "scope": "Package, documentation coverage, links and byte integrity; not a complete app walkthrough."}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
