"""Declare exact alpha.5 changes against the pinned alpha.4 source boundaries."""
from pathlib import Path
import difflib
import hashlib
import json

root = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
reference_hash = '4871312c2fbedc312a89d7400d669b525732e7f9fb2965b87bf74d1d75c00e42'
reference = (root/'baseline/NES_Forge_2.0.0-alpha.4_Mobile_Keyboard.html').read_bytes()
assert sha(reference) == reference_hash
baseline = json.loads((root/'docs/history/mobile-keyboard-1/root/build-inputs.json').read_text())
manifest = json.loads((root/'source-manifest.json').read_text())
added = 'src/audio/audio-adaptive-ui.js'
parts = [x['path'] for x in baseline['inputs']]
expected = parts.copy()
expected.insert(expected.index('src/audio/audio-ui.js')+1, added)
assert manifest['parts'] == expected, 'Only the explicit Audio UI module may be added'
allowed = ['src/shell-prefix.html', 'src/services/release-info.js']
offset, changes = 0, []
for item in baseline['inputs']:
    before = reference[offset:offset+item['bytes']]
    offset += item['bytes']
    assert sha(before) == item['sha256']
    after = (root/item['path']).read_bytes()
    if before == after:
        continue
    assert item['path'] in allowed, 'Unauthorized production edit: '+item['path']
    a, b = before.decode(), after.decode()
    replacements = []
    for kind, i, j, k, l in difflib.SequenceMatcher(None,a.splitlines(True),b.splitlines(True),autojunk=False).get_opcodes():
        if kind != 'equal':
            replacements.append({'before': ''.join(a.splitlines(True)[i:j]), 'after': ''.join(b.splitlines(True)[k:l])})
    restored = b
    for change in replacements:
        assert change['after'] and restored.count(change['after']) == 1
        restored = restored.replace(change['after'],change['before'])
    assert restored == a
    changes.append({'path':item['path'],'beforeSha256':sha(before),'afterSha256':sha(after),'replacements':replacements})
assert offset == len(reference)
assert [x['path'] for x in changes] == allowed
data = {'referenceCandidate':'mobile-keyboard-1','candidate':'audio-adaptive-1','referenceHtmlSha256':reference_hash,
        'changes':changes,'added':{'path':added,'sha256':sha((root/added).read_bytes())},'referenceParts':parts}
(root/'tests/fixtures/audio-adaptive-source-delta.json').write_text(json.dumps(data,indent=2)+'\n')
print('Declared shell metadata/help, release identity and one added Audio UI module; all alpha.4 editing and engine sources unchanged.')
