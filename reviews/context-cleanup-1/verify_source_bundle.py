"""Restore the source bundle over a base-only Git object store, offline."""
from pathlib import Path
import hashlib, json, subprocess, tempfile

root = Path(__file__).resolve().parents[2]
bundle = root.parent / 'NES_Forge_Context_Cleanup_1_Source.bundle'
parent = '697a998e744c7794fae5d1063748e8d83d5ffe57'
branch = 'implementation/context-cleanup-2026-10-20'
def run(*args, cwd=None):
    return subprocess.check_output(args, cwd=cwd, stderr=subprocess.STDOUT, text=True)

with tempfile.TemporaryDirectory(prefix='nf-source-restore-', dir=root.parent) as directory:
    dest = Path(directory)
    run('git', 'init', '-q', str(dest))
    # Transfer only objects reachable from the documented prerequisite.
    run('git', '-C', str(dest), 'fetch', '-q', '--no-tags', str(root), parent)
    run('git', '-C', str(dest), 'bundle', 'verify', str(bundle))
    run('git', '-C', str(dest), 'fetch', '-q', str(bundle), branch)
    run('git', '-C', str(dest), 'checkout', '-q', '--detach', 'FETCH_HEAD')
    actual = run('git', '-C', str(dest), 'rev-parse', 'HEAD').strip()
    expected = run('git', 'bundle', 'list-heads', str(bundle), 'refs/heads/' + branch).split()[0]
    assert actual == expected
    build = json.loads(run('python3', str(dest / 'app/tools/bundle.py'), '--check'))
    report = {'status': 'PASS', 'sourceCommit': actual, 'requiredParent': parent,
              'bundleSha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
              'appSha256': build['sha256'], 'bundleBytes': bundle.stat().st_size,
              'method': 'Fresh Git repository received only the prerequisite parent objects, then fetched the included source bundle and reproduced its standalone HTML byte-for-byte. No network or shared object store.'}
    (root / 'reviews/context-cleanup-1/Source_Bundle_Verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
