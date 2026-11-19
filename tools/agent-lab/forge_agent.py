#!/usr/bin/env python3
"""NES Forge Agent Lab v0.3: deterministic coordinator; model suggestions never execute code.

The canonical Forge HTML and test harness are always supplied by the owner source kit.
No GitHub writes, no ROM modification, no network calls except to the loopback AI API.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent


def sha256(file: Path) -> str:
    h = hashlib.sha256()
    with file.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def canonical_identity(source_root: Path) -> tuple[Path, Path, dict]:
    html_path = source_root / 'NES_Forge.html'
    harness = source_root / 'QA' / 't' / 'u' / 'harness.cjs'
    manifest = source_root / 'app' / 'build-inputs.json'
    for file in (html_path, harness, manifest):
        if not file.is_file():
            raise ValueError(f'Missing canonical source kit file: {file}')
    meta = json.loads(manifest.read_text(encoding='utf-8'))
    observed = sha256(html_path)
    if meta.get('sha256') != observed:
        raise ValueError('STOP: NES_Forge.html differs from its matching build-inputs.json. Rebuild or select a matching source kit.')
    return html_path, harness, {'editor_sha256': observed,
        'release': meta.get('release'), 'source_part_count': len(meta.get('inputs', []))}


def rom_list(single: str | None, folder: str | None, cap: int) -> list[Path]:
    if bool(single) == bool(folder):
        raise ValueError('Choose exactly one --rom or --rom-dir.')
    if single:
        items = [Path(single).expanduser().resolve()]
    else:
        directory = Path(folder).expanduser().resolve()
        if not directory.is_dir():
            raise ValueError('ROM directory does not exist.')
        items = sorted(f.resolve() for f in directory.rglob('*') if f.is_file() and f.suffix.lower() == '.nes')
    if not items:
        raise ValueError('No .nes files found.')
    if len(items) > cap:
        raise ValueError(f'{len(items)} ROMs found; limit is {cap}. Use --max-roms deliberately to increase.')
    for file in items:
        if not file.is_file() or file.suffix.lower() != '.nes':
            raise ValueError(f'Invalid .nes file: {file}')
    # Keep duplicates by file hash from wasting the user's GPU/CPU.
    seen, out = set(), []
    for item in items:
        digest = sha256(item)
        if digest not in seen:
            seen.add(digest); out.append(item)
    return out


def write_dashboard(output_root: Path, identity: dict) -> None:
    reports = []
    for p in sorted((output_root / 'review').glob('*/evidence.json')):
        try:
            e = json.loads(p.read_text(encoding='utf-8'))
            if e.get('schema') != 'NESForgeCompatibilityEvidence/v0.3':
                continue
            if e.get('editor', {}).get('sha256') != identity['editor_sha256']:
                continue
            reports.append({'source_sha256': e['source_sha256'],
                'editor_sha256': e['editor']['sha256'],
                'mapper': e['header']['mapper'],
                'prg_bytes': e['header']['prg_bytes'], 'chr_bytes': e['header']['chr_bytes'],
                'domains': {k:v['state'] for k,v in e['domains'].items()},
                'evidence_file': p.relative_to(output_root / 'review').as_posix()})
        except (OSError, KeyError, ValueError, TypeError):
            continue
    overview = {'schema': 'NESForgeBatchEvidence/v0.3',
        'publication_status': 'manual_review_required',
        'canonical_editor': identity, 'rom_count': len(reports), 'roms': reports,
        'scope': 'Every ROM has the same domain categories; status varies independently. No complete game support implied.'}
    review = output_root / 'review'
    review.mkdir(parents=True, exist_ok=True)
    (review / 'index.json').write_text(json.dumps(overview, indent=2) + '\n', encoding='utf-8')
    rows = []
    for r in reports:
        domains = r['domains']
        columns = [r['source_sha256'][:12], str(r['mapper']),
            domains.get('physical_banks', 'unverified'), domains.get('scenes_layouts', 'unverified'),
            domains.get('audio', 'unverified'), domains.get('native_rebuild', 'unverified')]
        rows.append('<tr>' + ''.join(f'<td>{html.escape(col)}</td>' for col in columns) + '</tr>')
    page = '''<!doctype html><html><head><meta charset="utf-8"><title>NES Forge Agent Review</title>
<style>body{background:#0e1522;color:#e3ebf5;font:15px system-ui;margin:3rem auto;max-width:1100px;padding:0 1rem}table{border-collapse:collapse;width:100%;}td,th{padding:12px;border-bottom:1px solid #344155;text-align:left}small{color:#b7c6dc}</style></head><body>
<h1>Forge Agent Lab — Compatibility Evidence</h1><p><small>Source ROM data remains private. Features are independently measured. No complete support is implied.</small></p>
<table><tr><th>ROM hash</th><th>Mapper</th><th>Raw banks</th><th>Scenes</th><th>Audio</th><th>Native rebuild</th></tr>''' + ''.join(rows) + '</table></body></html>'
    (review / 'index.html').write_text(page, encoding='utf-8')


def main() -> int:
    ap = argparse.ArgumentParser(description='Run local, evidence-first ROM investigations (no source edits or GitHub pushes).')
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument('--rom', help='One local .nes cartridge')
    group.add_argument('--rom-dir', help='Directory of local .nes cartridges, recursive')
    ap.add_argument('--forge-root', required=True, help='Owner Review 5 source kit directory containing NES_Forge.html and app/')
    ap.add_argument('--output', default=str(Path.home() / 'Documents' / 'NESForge-Agent-Lab'),
                    help='Private/report work directory, preferably outside all public Git repos')
    ap.add_argument('--max-roms', type=int, default=10)
    ap.add_argument('--no-ai', action='store_true', help='Skip Qwen; perform only deterministic extraction and validation')
    ap.add_argument('--audio', action='store_true', help='Optional slow audio extraction pass')
    ap.add_argument('--capture', action='store_true', help='Optional two-frame runtime mapper/PPU capture')
    ap.add_argument('--model', help='Exact Atomic Chat model ID (defaults to current loaded model)')
    ap.add_argument('--review-workorders', help='Private, source-bound QWEN_NEXT_WORKORDERS.json from extraction_update_review.py')
    ap.add_argument('--api', default='http://127.0.0.1:1337/v1', help='Loopback Atomic Chat endpoint only')
    ap.add_argument('--timeout', type=int, default=600, help='Per native tool timeout in seconds')
    args = ap.parse_args()
    try:
        source_root = Path(args.forge_root).expanduser().resolve()
        editor, harness, identity = canonical_identity(source_root)
        output_root = Path(args.output).expanduser().resolve()
        if output_root == source_root or source_root in output_root.parents:
            raise ValueError('Private output may not be created inside the canonical Forge source repo.')
        if output_root == HERE or HERE in output_root.parents:
            raise ValueError('Private output may not be written inside the agent tool package. Choose a separate --output.')
        if any((ancestor / '.git').exists() for ancestor in (output_root, *output_root.parents)):
            raise ValueError('Private output must be outside any Git working tree.')
        if args.max_roms < 1 or args.max_roms > 800:
            raise ValueError('--max-roms must be 1–800.')
        if args.timeout < 10 or args.timeout > 3600:
            raise ValueError('--timeout must be 10–3600 seconds.')
        items = rom_list(args.rom, args.rom_dir, args.max_roms)
        output_root.mkdir(parents=True, exist_ok=True)
        # Do not let a user inadvertently commit private outputs to a Git repo.
        ignore = output_root / '.gitignore'
        if not ignore.exists():
            ignore.write_text('*\n', encoding='utf-8')
        elif '*' not in ignore.read_text(encoding='utf-8').splitlines():
            raise ValueError('Output directory has an existing .gitignore without a full private-output exclusion; use a dedicated new --output.')
        (output_root / 'REVIEW_BEFORE_SHARING.txt').write_text(
            'Everything under private/ stays local. Review review/*.json before sharing.\n'
            'Do not publish ROMs, native projects, screen captures, raw bank dumps, audio, or private logs.\n'
            'Publishing compatibility metadata requires explicit owner approval.\n', encoding='utf-8')
        print(f'Canonical Forge: {identity["release"]} / {identity["editor_sha256"][:16]}')
        print(f'Investigating {len(items)} unique ROM(s). All outputs stay local: {output_root}')
        bad = 0
        for i, rom in enumerate(items, 1):
            print(f'\n[{i}/{len(items)}] {rom.name}')
            cmd = [sys.executable, str(HERE / 'forge_pipeline.py'), str(rom), '--root', str(HERE),
                '--output-root', str(output_root), '--forge', str(editor), '--harness', str(harness),
                '--extractor', str(next((p for p in [source_root / 'tools/extract-cartridge.cjs', source_root / 'Tools/extract-cartridge.cjs', HERE.parent / 'extract-cartridge.cjs', HERE / 'tools/extract-cartridge.cjs'] if p.is_file()), HERE.parent / 'extract-cartridge.cjs')), '--timeout', str(args.timeout), '--api', args.api]
            if args.audio: cmd.append('--audio')
            if args.capture: cmd.append('--capture')
            if args.no_ai: cmd.append('--no-ai')
            if args.model: cmd.extend(['--model', args.model])
            if args.review_workorders: cmd.extend(['--review-workorders', str(Path(args.review_workorders).expanduser().resolve())])
            result = subprocess.run(cmd, check=False)
            if result.returncode: bad += 1
            write_dashboard(output_root, identity)
        print(f'\nBatch complete. {len(items)-bad}/{len(items)} with verified raw-bank extraction.')
        print('Review dashboard:', output_root / 'review/index.html')
        print('Shareable candidate metadata:', output_root / 'review/index.json')
        print('No code or data was pushed to GitHub.')
        return 0 if bad == 0 else 2
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print('STOP:', e, file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
