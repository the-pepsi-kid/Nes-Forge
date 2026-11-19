#!/usr/bin/env python3
"""One source of truth for the build identity.

app/src/services/release-info.js declares the release version and name. Every other place that shows the
identity (page title, build tag, header, the generated editors, CANDIDATE.json) must agree with it.
Other checks import release_name()/release_version() instead of hard-coding a label.

    python tools/release_identity.py            # exit 1 on any disagreement
    python tools/release_identity.py --json out.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INFO = ROOT / 'app/src/services/release-info.js'
SHELL = ROOT / 'app/src/shell-prefix.html'


def _release():
    text = INFO.read_text(encoding='utf-8')
    match = re.search(r"F\.release=Object\.freeze\(\{version:'([^']+)',name:'([^']+)',maturity:'([^']+)',candidate:'([^']+)'", text)
    if not match:
        raise SystemExit('release-info.js: release declaration not found')
    return dict(zip(('version', 'name', 'maturity', 'candidate'), match.groups()))


def release_name():
    return _release()['name']


def release_version():
    return _release()['version']


def check():
    rel, problems = _release(), []
    shell = SHELL.read_text(encoding='utf-8')
    for label, pattern in (('title', r'<title>([^<]*)</title>'),
                           ('build tag', r'<meta name="forge-build-tag" content="([^"]*)">'),
                           ('header', r'<h1>NES FORGE <small[^>]*>([^<]*)</small></h1>')):
        found = re.search(pattern, shell)
        if not found:
            problems.append(f'shell-prefix.html: {label} not found')
        elif rel['name'] not in found.group(1):
            problems.append(f'shell-prefix.html {label} says "{found.group(1)}", release-info says "{rel["name"]}"')
    header = re.search(r'<h1>NES FORGE <small[^>]*>([^<]*)</small></h1>', shell)
    if header and rel['version'] not in header.group(1):
        problems.append(f'shell-prefix.html header version "{header.group(1)}" differs from {rel["version"]}')
    for entry in ('NES_Forge.html', 'nes-forge.html'):
        path = ROOT / entry
        if path.exists():
            names = set(re.findall(r'Integrated Review \d+', path.read_text(encoding='utf-8', errors='ignore')[:200000]))
            stale = sorted(n for n in names if n != rel['name'])
            if stale:
                problems.append(f'{entry} still shows {stale} (rebuild with app/tools/bundle.py)')
    candidate = ROOT / 'CANDIDATE.json'
    if candidate.exists():
        c = json.loads(candidate.read_text(encoding='utf-8'))
        if c.get('version') != rel['version']:
            problems.append(f'CANDIDATE.json version {c.get("version")} differs from {rel["version"]} (update at release)')
    return rel, problems


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--json')
    args = parser.parse_args()
    rel, problems = check()
    report = {'release': rel, 'passed': not problems, 'problems': problems}
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    sys.exit(0 if not problems else 1)
