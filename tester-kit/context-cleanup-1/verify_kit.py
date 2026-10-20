"""Verify an extracted kit with Python's standard library.

Usage: python verify_kit.py PATH_TO_EXTRACTED_KIT
Prints one JSON result. Keep redirected reports outside the kit: the integrity
manifest deliberately rejects extra files. This is packaging QA, not app or
browser acceptance. Exit 0 means PASS; exit 1 means FAIL.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import argparse
import csv
import hashlib
import json
import re
import sys


class VerificationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha(path):
    return sha_bytes(path.read_bytes())


def member(root, name):
    require(isinstance(name, str) and name and "\\" not in name,
            f"Invalid portable package path: {name!r}")
    relative = Path(name)
    require(not relative.is_absolute() and ".." not in relative.parts,
            f"Package path escapes its root: {name!r}")
    path = (root / relative).resolve()
    require(path.is_relative_to(root), f"Package path leaves root: {name}")
    require(path.is_file(), f"Missing package file: {name}")
    return path


def load_json(root, name):
    return json.loads(member(root, name).read_text(encoding="utf-8"))


def verify_hash(root, name, expected):
    require(isinstance(expected, str) and re.fullmatch(r"[0-9a-f]{64}", expected),
            f"Invalid SHA-256 in record for {name}")
    actual = sha(member(root, name))
    require(actual == expected, f"SHA-256 mismatch: {name}")
    return actual


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a" and attrs.get("name"):
            self.ids.add(attrs["name"])
        for key in ("href", "src", "poster"):
            if key in attrs and attrs[key] is not None:
                self.links.append(attrs[key])

    handle_startendtag = handle_starttag


def verify(root):
    root = root.resolve()
    require(root.is_dir(), f"Kit directory not found: {root}")
    record = load_json(root, "SOURCE_RECORD.json")
    app = record["app"]
    app_path = member(root, app["path"])
    app_sha = verify_hash(root, app["path"], app["sha256"])
    examples = record["included_examples"]
    require(isinstance(examples, dict) and examples, "No example identities recorded")
    for name, digest in examples.items():
        verify_hash(root, "examples/" + name, digest)

    preservation = load_json(root, "DOCUMENTATION_PRESERVATION.json")
    require(isinstance(preservation, list) and len(preservation) == 127,
            "Preservation record must account for all 127 original documents")
    originals = set()
    preserved = set()
    for item in preservation:
        original = item["original_path"]
        target = item["preserved_path"]
        require(isinstance(original, str) and original and original not in originals,
                f"Invalid or duplicate original document: {original!r}")
        require(target not in preserved, f"Duplicate preserved document path: {target}")
        originals.add(original)
        preserved.add(target)
        verify_hash(root, target, item["sha256"])

    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    listed = set()
    manifest = member(root, "SHA256SUMS.txt").read_text(encoding="utf-8")
    for row in manifest.splitlines():
        require(bool(row), "Blank integrity-manifest entry")
        match = re.fullmatch(r"([0-9a-f]{64}) [ *](.+)", row)
        require(match is not None, f"Malformed integrity-manifest entry: {row!r}")
        digest, name = match.groups()
        require(name != "SHA256SUMS.txt", "Manifest must not hash itself")
        require(name not in listed, f"Duplicate integrity-manifest path: {name}")
        verify_hash(root, name, digest)
        listed.add(name)
    expected = actual - {"SHA256SUMS.txt"}
    require(listed == expected,
            "Manifest coverage differs: unlisted=" + repr(sorted(expected - listed))
            + "; missing=" + repr(sorted(listed - expected)))

    documents = {}
    for name in sorted(actual):
        path = member(root, name)
        if path.suffix.lower() == ".html" and path != app_path and path.name != "NES_Forge.html":
            documents[path] = Document(path.read_text(encoding="utf-8"))
    checked = 0
    for path, document in documents.items():
        for link in document.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            require(target.is_relative_to(root),
                    f"Local link leaves kit: {path.relative_to(root)}: {link}")
            require(target.is_file(), f"Broken local link: {path.relative_to(root)}: {link}")
            if url.fragment and target in documents:
                require(unquote(url.fragment) in documents[target].ids,
                        f"Missing anchor: {path.relative_to(root)}: {link}")
            checked += 1

    tutorial = member(root, "Tutorial.md").read_text(encoding="utf-8")
    for step in range(1, 10):
        require(re.search(rf"^## {step}\. ", tutorial, re.MULTILINE) is not None,
                f"Original tutorial step {step} missing")
    with member(root, "Reference/Control_Index.csv").open(encoding="utf-8", newline="") as stream:
        controls = sum(1 for _ in csv.DictReader(stream))
    require(controls == 439, f"Historical control index requires 439 rows, found {controls}")

    css_expected = record.get("launcher_inline_css_sha256", record.get("landing_css_sha256"))
    css_sha = None
    if css_expected is not None:
        landing = member(root, "START_HERE.html").read_text(encoding="utf-8")
        blocks = re.findall(r"<style\b[^>]*>(.*?)</style\s*>", landing, re.DOTALL | re.IGNORECASE)
        require(bool(blocks), "Original landing-page CSS block is missing")
        css_sha = sha_bytes("\n".join(blocks).encode("utf-8"))
        require(css_sha == css_expected, "Original landing-page CSS changed")

    return {
        "result": "PASS", "layout": "standalone kit", "package_files": len(actual),
        "manifest_payloads_verified": len(listed), "app_sha256": app_sha,
        "example_hashes_verified": len(examples), "original_documents_preserved": len(originals),
        "documentation_html_pages": len(documents), "local_links_and_assets_checked": checked,
        "broken_links": 0, "tutorial_core_steps": 9, "historical_control_rows": controls,
        "landing_css_sha256": css_sha,
        "landing_css_verified": css_expected is not None,
        "scope": "Package integrity, original-document preservation and local guide links. No application regression, browser, device or tutorial-execution acceptance is implied."
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, help="Extracted kit directory")
    args = parser.parse_args()
    try:
        result = verify(args.root)
    except (VerificationError, OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({"result": "FAIL", "error": str(error),
                          "scope": "Package verification did not complete."}, indent=2))
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
