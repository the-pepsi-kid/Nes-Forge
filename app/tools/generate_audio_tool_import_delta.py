"""Freeze reviewed audio-tool imports against source intake; never renew historical oracles."""
from pathlib import Path
import difflib, hashlib, json

root = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
pinned = '11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd'
inventory_pin = 'e6a96743ab3ae49c60e1dd633805777244bc292367e86e11f67bea5e21677ada'
archive = root / 'docs/history/source-intake-1'
inventory_bytes = (archive / 'Reference_Inventory.json').read_bytes()
assert sha(inventory_bytes) == inventory_pin, 'Committed source-intake inventory changed'
inventory = json.loads(inventory_bytes)
assert inventory['sourceCommit'] == '09f2233908bc511ffe057e3f7e885a5a42ef19ac'
for item in inventory['archiveFiles']:
    data = (root / item['path']).read_bytes()
    assert sha(data) == item['sha256'] and len(data) == item['bytes'], item['path']
reference = (root / 'baseline/NES_Forge_2.0.0-alpha.11_Source_Intake.html').read_bytes()
assert sha(reference) == pinned
baseline = json.loads((archive / 'root/build-inputs.json').read_text())
assert baseline['sha256'] == pinned
modules = json.loads((root / 'audio-tool-import-modules.json').read_text())
assert modules['candidate'] == 'audio-tool-import-1'
manifest = json.loads((root / 'source-manifest.json').read_text())
assert manifest['release'] == '2.0.0-alpha.11' and manifest['output'] == 'mainline/NES_Forge_2.0.0-alpha.11.html'
parts = [item['path'] for item in baseline['inputs']]
expected, added = parts.copy(), []
for insertion in modules['insertions']:
    assert insertion['after'] in expected
    position = expected.index(insertion['after']) + 1
    expected[position:position] = insertion['parts']
    added.extend(insertion['parts'])
assert len(set(expected)) == len(expected) and manifest['parts'] == expected
allowed = {'src/shell-prefix.html', 'src/services/release-info.js'}
allowed_tests = {'tests/source-intake-preservation-lib.cjs', 'tests/run_candidate.cjs', 'tests/services167.cjs'}


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


offset, changes = 0, []
for item in baseline['inputs']:
    before = reference[offset:offset + item['bytes']]
    offset += item['bytes']
    assert sha(before) == item['sha256']
    after = (root / item['path']).read_bytes()
    if before != after:
        assert item['path'] in allowed, 'Unreviewed existing-source change: ' + item['path']
        changes.append(exact_change(item['path'], before, after))
assert offset == len(reference)
test_changes = []
for item in inventory['protectedFiles']:
    name = item['path']
    after = (root / name).read_bytes()
    if sha(after) == item['sha256'] and len(after) == item['bytes']:
        continue
    assert name in allowed_tests, 'Historical fixture/test/contract changed without explicit review: ' + name
    before = (archive / name).read_bytes()
    assert sha(before) == item['sha256'] and len(before) == item['bytes']
    test_changes.append(exact_change(name, before, after))
payload = {'referenceCandidate': 'source-intake-1', 'candidate': 'audio-tool-import-1',
           'referenceHtmlSha256': pinned, 'referenceParts': parts, 'candidateParts': expected,
           'changes': changes, 'added': [{'path': p, 'sha256': sha((root / p).read_bytes())} for p in added],
           'testChanges': test_changes}
(root / 'tests/fixtures/audio-tool-import-source-delta.json').write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'changed': [item['path'] for item in changes], 'added': added,
                  'testChanges': [item['path'] for item in test_changes], 'reference': pinned}))
