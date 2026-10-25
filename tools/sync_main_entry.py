"""Keep the convenient root HTML identical to the source-owned generated app.

Run the existing bundler first. This copies its output without changing runtime
code, schemas or assets. --check verifies both entry points without writing.
"""
from pathlib import Path
import argparse
import hashlib
import json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / 'app/source-manifest.json').read_text())
    source = root / 'app' / manifest['output']
    target = root / 'nes-forge.html'
    data = source.read_bytes()
    if args.check:
        if not target.is_file() or target.read_bytes() != data:
            raise SystemExit('Root entry differs: rebuild the app, then run tools/sync_main_entry.py.')
    else:
        target.write_bytes(data)
    print(json.dumps({'source': str(source.relative_to(root)),
                      'entry': str(target.relative_to(root)),
                      'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                      'checked': args.check}))


if __name__ == '__main__':
    main()
