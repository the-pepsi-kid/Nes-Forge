"""Reviewable outer reversal to the pinned native-transition-edit-1 source."""
from pathlib import Path
import difflib, hashlib, json, subprocess

root = Path(__file__).resolve().parents[1]
parent = '697a998e744c7794fae5d1063748e8d83d5ffe57'
sha = lambda b: hashlib.sha256(b).hexdigest()
def old(name):
    return subprocess.check_output(['git', 'show', parent + ':app/' + name], cwd=root)

manifest = json.loads(old('source-manifest.json'))
base = json.loads(old('build-inputs.json'))
gate = json.loads(old('test-results/candidate/Summary.json'))
assert base['sha256'] == gate['sha256'] == 'b0ca1de0b112612c34bfc3d006e1854194a097e9ee1a4fde86fbfaf0b5b84b73'
assert gate['status'] == 'passed' and gate['suiteCount'] == 116 and gate['total'] == 2046
protected = []
for full in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '--full-tree', parent], cwd=root).decode().splitlines():
    if full.startswith('app/'):
        name = full[4:]
        if name.startswith('tests/') or '/' not in name and name.endswith(('-suites.json', '-modules.json')):
            b = old(name)
            protected.append({'path': name, 'sha256': sha(b)})
allowed = {'src/legacy/00-editor.js', 'src/services/project-store.js', 'src/services/release-info.js', 'src/services/documentation.js', 'src/re/game-re-ui.js', 'source-manifest.json', 'build-inputs.json', 'tests/native-transition-preservation-lib.cjs', 'tests/run_candidate.cjs', 'tests/services167.cjs', 'tests/spatial-re.cjs', 'tests/megaman2-audio.cjs', 'tests/README.md'}
changes = []
names = sorted(set([i['path'] for i in base['inputs']] + [i['path'] for i in protected] + ['source-manifest.json', 'build-inputs.json']))
for name in names:
    a, b = old(name), (root / name).read_bytes()
    if a == b:
        continue
    assert name in allowed, name
    aa, bb = a.decode().splitlines(True), b.decode().splitlines(True)
    edits = [{'before': ''.join(aa[group[0][1]:group[-1][2]]), 'after': ''.join(bb[group[0][3]:group[-1][4]])} for group in difflib.SequenceMatcher(None, aa, bb, autojunk=False).get_grouped_opcodes(3)]
    restored = b.decode()
    for edit in edits:
        assert edit['after'] and restored.count(edit['after']) == 1, name
        restored = restored.replace(edit['after'], edit['before'])
    assert restored == a.decode(), name
    changes.append({'path': name, 'beforeSha256': sha(a), 'afterSha256': sha(b), 'replacements': edits})
current = json.loads((root / 'source-manifest.json').read_text())
added = set(current['parts']) - set(manifest['parts'])
assert added == {'src/services/scene-context.js'}
assert [p for p in current['parts'] if p not in added] == manifest['parts']
payload = {'parentCommit': parent, 'referenceHtmlSha256': base['sha256'], 'referenceParts': manifest['parts'], 'candidateParts': current['parts'], 'changes': changes, 'added': [{'path': p, 'sha256': sha((root / p).read_bytes())} for p in sorted(added)], 'protectedFiles': protected, 'retainedCounts': {s['name']: s['total'] for s in gate['suites']}}
(root / 'tests/fixtures/context-cleanup-source-delta.json').write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'changes': [c['path'] for c in changes], 'protectedFiles': len(protected), 'retainedSuites': len(payload['retainedCounts'])}))
