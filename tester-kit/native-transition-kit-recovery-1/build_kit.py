"""Assemble the complete documented kit without changing the app or original docs."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
ORIGINAL = HERE.parent / 'alpha11-review-1'
APP_SHA = 'b0ca1de0b112612c34bfc3d006e1854194a097e9ee1a4fde86fbfaf0b5b84b73'
SOURCE_COMMIT = '697a998e744c7794fae5d1063748e8d83d5ffe57'
KIT_NAME = 'NF_Kit'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

def render_guide():
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('original_renderer', ORIGINAL / 'render_docs.py')
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    renderer.HERE = HERE
    source = HERE / 'Guides/Recover_Edit_Build.md'
    result = renderer.render(source, {source.with_suffix('.html')})
    text = result.read_text(encoding='utf-8')
    text = text.replace('audio-tool-import-1 · Alpha Test Kit RC3', 'native-transition-edit-1 · Documented Kit Recovery 1')
    text = text.replace('Kit RC3', 'Documented Kit Recovery 1')
    result.write_text(text, encoding='utf-8')

def assemble(root):
    app = REPO / 'app/mainline/NES_Forge_2.0.0-alpha.11.html'
    assert sha(app) == APP_SHA, 'Application identity changed'
    original = json.loads((HERE / 'original_documents.json').read_text())
    inventory = json.loads((ORIGINAL / 'package_files.json').read_text())
    assert len(original) == 127 and set(original) == set(inventory), 'Original documentation inventory changed'
    root.mkdir(parents=True)
    preserved = []
    overrides = {'START_HERE.html', 'START_HERE.md', 'README.txt', 'SOURCE_RECORD.json'}
    for name, digest in sorted(original.items()):
        assert sha(ORIGINAL / name) == digest, f'Original document missing or changed: {name}'
        destination = ('Historical/' + name.replace('/', '_') + '.original.txt') if name in overrides else name
        copy(ORIGINAL / name, root / destination)
        preserved.append({'original_path': name, 'preserved_path': destination, 'sha256': digest})
    for name in ['START_HERE.html', 'START_HERE.md', 'README.txt', 'RECOVERY_HANDOFF.md', 'Guides/Recover_Edit_Build.md', 'Guides/Recover_Edit_Build.html', 'verify_kit.py', 'verify_launch.cjs']:
        copy(HERE / name, root / name)
    copy(app, root / 'NES_Forge.html')
    old_record = json.loads((ORIGINAL / 'SOURCE_RECORD.json').read_text())
    for name, digest in old_record['included_examples'].items():
        source = REPO / 'app/examples' / name
        assert sha(source) == digest, f'Example changed: {name}'
        copy(source, root / 'examples' / name)
    reports = {
        'CANDIDATE.json': 'CANDIDATE.json',
        'app/test-results/candidate/Summary.json': 'Application_Summary.json',
    }
    for name in ['Browser_Verification.json', 'Retained_Import_Browser_Verification.json', 'Native_Verification.json', 'Example_Receipt_Verification.json', 'Gate_Orchestration_Verification.json']:
        reports['reviews/native-transition-edit-1/' + name] = name
    for source, target in reports.items():
        copy(REPO / source, root / 'Evidence' / target)
    for source in (HERE / 'Evidence').glob('*'):
        if source.is_file():
            copy(source, root / 'Evidence' / source.name)
    write_json(root / 'DOCUMENTATION_PRESERVATION.json', preserved)
    import re
    original_css = re.findall(r'<style[^>]*>(.*?)</style>', (ORIGINAL / 'START_HERE.html').read_text(), re.S)
    current_css = re.findall(r'<style[^>]*>(.*?)</style>', (HERE / 'START_HERE.html').read_text(), re.S)
    assert current_css == original_css and original_css, 'Launcher styling changed'
    write_json(root / 'SOURCE_RECORD.json', {
        'status': 'RECOVERED_DOCUMENTED_KIT_REVIEW_CANDIDATE', 'created_utc': '2026-10-20',
        'version': 'NES Forge 2.0.0-alpha.11 / native-transition-edit-1',
        'documentation_revision': 'native-transition-kit-recovery-1',
        'source_commit': SOURCE_COMMIT,
        'source_url': 'https://github.com/the-pepsi-kid/Nes-Forge/tree/' + SOURCE_COMMIT,
        'project_schema': 12, 'native_project_schema': 13,
        'app': {'path': 'NES_Forge.html', 'sha256': APP_SHA},
        'included_examples': old_record['included_examples'],
        'launcher_inline_css_sha256': hashlib.sha256('\n'.join(original_css).encode()).hexdigest(),
        'evidence': {'application': 'Retained 2046/2046 cases in 116 suites using durable bounded workers; not rerun by this packaging recovery.',
                     'browser': 'Retained 30 matching-app checks; fresh packaging browser status is separately recorded.',
                     'kit': 'KIT_VERIFICATION.json', 'browser_recovery': 'Evidence/Recovery_Browser_Verification.json'},
        'notes': 'All 127 original documents preserved by hash. Older documentation headers and totals are historical; this record and the new guide identify the current app. No private game ROM or source-bearing native project included. No baseline promotion.'
    })
    write_json(root / 'KIT_VERIFICATION.json', {})
    def manifest():
        entries = [f'{sha(p)}  {p.relative_to(root).as_posix()}' for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt']
        (root / 'SHA256SUMS.txt').write_text('\n'.join(entries) + '\n', encoding='utf-8')
    manifest()
    verify = subprocess.check_output(['python', str(HERE / 'verify_kit.py'), str(root)], text=True)
    write_json(root / 'KIT_VERIFICATION.json', json.loads(verify))
    manifest()
    final = subprocess.check_output(['python', str(HERE / 'verify_kit.py'), str(root)], text=True)
    assert json.loads(final) == json.loads(verify)
    return json.loads(final)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        parser.error('Refusing to overwrite existing output')
    render_guide()
    with tempfile.TemporaryDirectory(prefix='forge-doc-kit-') as temp:
        root = Path(temp) / KIT_NAME
        result = assemble(root)
        with zipfile.ZipFile(output, 'x', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for p in sorted(root.rglob('*')):
                if p.is_file():
                    info = zipfile.ZipInfo(KIT_NAME + '/' + p.relative_to(root).as_posix(), (2026,10,20,0,0,0))
                    info.external_attr = 0o644 << 16
                    archive.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        with zipfile.ZipFile(output) as archive:
            assert archive.testzip() is None
            extracted = Path(temp) / 'extracted'
            archive.extractall(extracted)
            check = json.loads(subprocess.check_output(['python', str(HERE / 'verify_kit.py'), str(extracted / KIT_NAME)], text=True))
            assert check == result
    print(json.dumps({'zip': str(output), 'sha256': sha(output), 'bytes': output.stat().st_size, 'extracted_verification': result}, indent=2))

if __name__ == '__main__':
    main()
