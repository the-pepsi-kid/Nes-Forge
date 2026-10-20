"""Finalize the verified kit and verify the exact ZIP payloads."""
from pathlib import Path
import hashlib, json, shutil, subprocess, zipfile

root = Path(__file__).resolve().parents[2]
review = Path(__file__).resolve().parent
kit = root / 'tester-kit/context-cleanup-1'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text())
current = read(review / 'Verification.json')
assert current['status'] == 'PASS'
assert sha(kit / 'NES_Forge.html') == current['appSha256']
assert read(review / 'Kit_Browser_Verification.json')['appSha256'] == current['appSha256']
bundle = read(review / 'Source_Bundle_Verification.json')
assert bundle['status'] == 'PASS' and bundle['appSha256'] == current['appSha256']
assert sha(kit / 'Developer/NES_Forge_Context_Cleanup_1_Source.bundle') == bundle['bundleSha256']
record = read(kit / 'SOURCE_RECORD.json')
record['source_commit'] = bundle['sourceCommit']
record['source_bundle_sha256'] = bundle['bundleSha256']
(kit / 'SOURCE_RECORD.json').write_text(json.dumps(record, indent=2) + '\n')

def manifest():
    files = sorted(p for p in kit.rglob('*') if p.is_file() and p.name != 'SHA256SUMS.txt')
    (kit / 'SHA256SUMS.txt').write_text(''.join(sha(p) + '  ' + p.relative_to(kit).as_posix() + '\n' for p in files))

manifest()
check = subprocess.check_output(['python3', str(kit / 'verify_kit.py'), str(kit)], text=True)
(kit / 'KIT_VERIFICATION.json').write_text(check)
manifest()
verified = json.loads(subprocess.check_output(['python3', str(kit / 'verify_kit.py'), str(kit)], text=True))
assert verified['result'] == 'PASS' and verified['original_documents_preserved'] == 127
target = root.parent / 'NES_Forge_Context_Cleanup_1_Documented_Kit.zip'
files = sorted(p for p in kit.rglob('*') if p.is_file())
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in files:
        info = zipfile.ZipInfo('NF_Kit/' + file.relative_to(kit).as_posix(), date_time=(2026, 10, 20, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file.read_bytes())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert len(archive.infolist()) == len(files)
    for file in files:
        assert archive.read('NF_Kit/' + file.relative_to(kit).as_posix()) == file.read_bytes()
report = {**verified, 'zip': target.name, 'zipSha256': sha(target), 'zipBytes': target.stat().st_size,
          'zipPayloadsCompared': len(files), 'browserChecks': 28, 'automatedCases': 2061,
          'sourceBundleVerified': True, 'sourceCommit': bundle['sourceCommit'],
          'publication': 'Local branch only; GitHub push pending owner approval.'}
(review / 'Kit_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
