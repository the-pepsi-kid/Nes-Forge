"""Exact outer reversal to the published context-cleanup-1 checkpoint."""
from pathlib import Path
import difflib, hashlib, json, subprocess

root = Path(__file__).resolve().parents[1]
parent = 'c86b98aafd828f2f66b2f10ec068a726619ede45'
sha = lambda b: hashlib.sha256(b).hexdigest()
def old(name):
    return subprocess.check_output(['git', 'show', parent + ':app/' + name], cwd=root)

manifest = json.loads(old('source-manifest.json'))
base = json.loads(old('build-inputs.json'))
gate = json.loads(subprocess.check_output(['git', 'show', parent + ':reviews/context-cleanup-1/full-gate/Summary.json'], cwd=root))
assert base['sha256'] == gate['sha256'] == 'd377f322ee87843397d73d60838335119c16d5671bbacf7e3f48d98b6a45ad0f'
assert gate['status'] == 'passed' and gate['suiteCount'] == 118 and gate['total'] == 2061
protected = []
for full in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '--full-tree', parent], cwd=root).decode().splitlines():
    if full.startswith('app/'):
        name = full[4:]
        if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json', '-modules.json')):
            protected.append({'path': name, 'sha256': sha(old(name))})
allowed = {'src/legacy/08-world.js', 'src/re/game-re-assets.js', 'src/re/game-re-worlds.js', 'src/re/game-re-ui.js', 'src/services/scene-context.js', 'src/services/release-info.js', 'src/services/documentation.js', 'source-manifest.json', 'build-inputs.json', 'tests/context-cleanup-preservation-lib.cjs', 'tests/native-world-import-preservation-lib.cjs', 'tests/run_candidate.cjs', 'tests/services167.cjs', 'tests/spatial-re.cjs', 'tests/megaman2-audio.cjs', 'tests/README.md'}
changes = []
for name in sorted(set([i['path'] for i in base['inputs']] + [i['path'] for i in protected] + ['source-manifest.json', 'build-inputs.json'])):
    a, b = old(name), (root / name).read_bytes()
    if a == b:
        continue
    assert name in allowed, name
    aa, bb = a.decode().splitlines(True), b.decode().splitlines(True)
    edits = [{'before': ''.join(aa[g[0][1]:g[-1][2]]), 'after': ''.join(bb[g[0][3]:g[-1][4]])} for g in difflib.SequenceMatcher(None, aa, bb, autojunk=False).get_grouped_opcodes(3)]
    restored = b.decode()
    for e in edits:
        assert e['after'] and restored.count(e['after']) == 1, name
        restored = restored.replace(e['after'], e['before'])
    assert restored == a.decode(), name
    changes.append({'path': name, 'beforeSha256': sha(a), 'afterSha256': sha(b), 'replacements': edits})
current = json.loads((root / 'source-manifest.json').read_text())
added = set(current['parts']) - set(manifest['parts'])
assert added == {'src/services/stage-context.js'}
assert [p for p in current['parts'] if p not in added] == manifest['parts']
payload = {'parentCommit': parent, 'referenceHtmlSha256': base['sha256'], 'referenceParts': manifest['parts'], 'candidateParts': current['parts'], 'changes': changes, 'added': [{'path': p, 'sha256': sha((root / p).read_bytes())} for p in sorted(added)], 'protectedFiles': protected, 'retainedCounts': {s['name']: s['total'] for s in gate['suites']}}
(root / 'tests/fixtures/stage-context-source-delta.json').write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'changes': [c['path'] for c in changes], 'protectedFiles': len(protected), 'retainedSuites': len(payload['retainedCounts'])}))
