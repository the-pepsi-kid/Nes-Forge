"""Freeze reviewed survey changes against an immutable Git parent; never renew oracles.

The gate itself is Git-independent. This developer-only generator needs the
recorded parent commit in Git to obtain its original source bytes.
"""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
parent = 'ffb57eab61d2e69ae0b92838c7b55748423b3140'
pinned = '1fd884cdc1b568b72e3bc777ef3a0b1a926b6020e8b143d8110a9a9001dc821d'
inventory_pin = 'cb4c608b50c30bec3203d0bd818f38c2d57a4d2bd11b4e1abfecd8b4778357c6'
archive = root / 'docs/history/audio-tool-import-1'
inventory_bytes = (archive / 'Reference_Inventory.json').read_bytes()
assert sha(inventory_bytes) == inventory_pin, 'Committed audio tool import inventory changed'
inventory = json.loads(inventory_bytes)
assert inventory['sourceCommit'] == parent and inventory['htmlSha256'] == pinned
for item in inventory['archiveFiles']:
    data = (root / item['path']).read_bytes()
    assert sha(data) == item['sha256'] and len(data) == item['bytes'], item['path']
baseline = json.loads((archive / 'root/build-inputs.json').read_text())
manifest = json.loads((root / 'source-manifest.json').read_text())
assert baseline['sha256'] == pinned
assert manifest == json.loads((archive / 'root/source-manifest.json').read_text())
assert manifest['parts'] == [item['path'] for item in baseline['inputs']]
allowed = {'src/shell-prefix.html', 'src/services/release-info.js', 'src/re/re-runtime.js', 'src/re/re-runtime-ui.js'}
allowed_tests = {'tests/audio-tool-import-preservation-lib.cjs', 'tests/run_candidate.cjs', 'tests/services167.cjs'}


def original(name):
    return subprocess.check_output(['git', 'show', parent + ':app/' + name], cwd=root)


def exact_change(name, before, after):
    a, b = before.decode().splitlines(True), after.decode().splitlines(True)
    replacements = []
    for group in difflib.SequenceMatcher(None, a, b, autojunk=False).get_grouped_opcodes(3):
        replacements.append({'before': ''.join(a[group[0][1]:group[-1][2]]),
                             'after': ''.join(b[group[0][3]:group[-1][4]])})
    restored = after.decode()
    for edit in replacements:
        assert edit['after'] and restored.count(edit['after']) == 1, (name, 'Nonunique exact reverse patch')
        restored = restored.replace(edit['after'], edit['before'])
    assert restored == before.decode()
    return {'path': name, 'beforeSha256': sha(before), 'afterSha256': sha(after), 'replacements': replacements}


changes, originals = [], []
for item in baseline['inputs']:
    before, after = original(item['path']), (root / item['path']).read_bytes()
    assert sha(before) == item['sha256'] and len(before) == item['bytes'], item['path']
    originals.append(before)
    if before != after:
        assert item['path'] in allowed, 'Unreviewed existing-source change: ' + item['path']
        changes.append(exact_change(item['path'], before, after))
assert sha(b''.join(originals)) == pinned
test_changes = []
for item in inventory['protectedFiles']:
    name = item['path']
    after = (root / name).read_bytes()
    if sha(after) == item['sha256'] and len(after) == item['bytes']:
        continue
    assert name in allowed_tests, 'Historical fixture/test/contract changed without explicit review: ' + name
    before = original(name)
    assert sha(before) == item['sha256'] and len(before) == item['bytes']
    test_changes.append(exact_change(name, before, after))
payload = {'referenceCandidate': 'audio-tool-import-1', 'candidate': 'audio-driver-survey-1',
           'referenceHtmlSha256': pinned, 'referenceParts': manifest['parts'],
           'candidateParts': manifest['parts'], 'changes': changes, 'testChanges': test_changes}
(root / 'tests/fixtures/audio-driver-survey-source-delta.json').write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'changed': [item['path'] for item in changes],
                  'testChanges': [item['path'] for item in test_changes], 'reference': pinned}))
