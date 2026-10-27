"""Check offline reading-file anchors without a network or runtime dependency."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[2]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.runtime = [], [], []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag in {'script', 'link', 'iframe'} and ('src' in attrs or 'href' in attrs):
            self.runtime.append(attrs)

results = []
for name in ['PROJECT_HANDBOOK.html', 'NATIVE_RECOVERY_TUTORIAL.html']:
    path = root / 'app/docs' / name
    parser = Links()
    parser.feed(path.read_text())
    assert len(parser.ids) == len(set(parser.ids)), name
    internal = [href for href in parser.links if href.startswith('#')]
    assert all(href[1:] in parser.ids for href in internal), name
    assert not [href for href in parser.links if not href.startswith(('#', 'https://', 'http://', 'mailto:'))], name
    assert not parser.runtime, name
    results.append({'file': name, 'internalLinks': len(internal), 'duplicateIds': 0,
                    'missingAnchors': 0, 'externalRuntimeDependencies': 0,
                    'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
report = {'status': 'passed', 'htmlSha256': hashlib.sha256((root / 'nes-forge.html').read_bytes()).hexdigest(), 'files': results}
Path(__file__).with_name('Documentation_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
