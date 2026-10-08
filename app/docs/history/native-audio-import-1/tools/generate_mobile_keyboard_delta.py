"""Reproduce only the bounded alpha.4 authoring UI delta from pinned alpha.2 bytes.

Run before the release gate, after the three authorized production files freeze.
This does not modify source files, historical fixtures, or reference checksums.
"""
from pathlib import Path
import difflib
import hashlib
import json

root = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
reference_hash = '27c436d1b7356fc8d2ce4c22396a0b768c4c2f3e6b2754f1be14e5db00389782'
reference = (root/'baseline/NES_Forge_2.0.0-alpha.2_Mobile_Playback.html').read_bytes()
assert sha(reference) == reference_hash, 'Frozen alpha.2 HTML differs from its pinned identity'
baseline = json.loads((root/'docs/history/mobile-playback-1/root/build-inputs.json').read_text())
manifest = json.loads((root/'source-manifest.json').read_text())
assert baseline['sha256'] == reference_hash
assert manifest['parts'] == [item['path'] for item in baseline['inputs']]
allowed = ['src/shell-prefix.html', 'src/services/release-info.js', 'src/audio/audio-ui.js']
changes = []
offset = 0
for item in baseline['inputs']:
    before_bytes = reference[offset:offset+item['bytes']]
    offset += item['bytes']
    assert sha(before_bytes) == item['sha256'], item['path']+' reference boundary mismatch'
    after_bytes = (root/item['path']).read_bytes()
    if before_bytes == after_bytes:
        continue
    assert item['path'] in allowed, 'Unauthorized production change: '+item['path']
    before, after = before_bytes.decode('utf-8'), after_bytes.decode('utf-8')
    old_lines, new_lines = before.splitlines(keepends=True), after.splitlines(keepends=True)
    replacements = []
    for group in difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_grouped_opcodes(3):
        old = ''.join(old_lines[group[0][1]:group[-1][2]])
        new = ''.join(new_lines[group[0][3]:group[-1][4]])
        assert new and after.count(new) == 1, item['path']+' needs more precise reverse anchors'
        replacements.append({'before': old, 'after': new})
    restored = after
    for replacement in replacements:
        assert restored.count(replacement['after']) == 1
        restored = restored.replace(replacement['after'], replacement['before'])
    assert restored == before, item['path']+' reverse delta is not exact'
    changes.append({'path': item['path'], 'beforeSha256': sha(before_bytes),
                    'afterSha256': sha(after_bytes), 'replacements': replacements})
assert offset == len(reference)
assert [change['path'] for change in changes] == allowed, 'Expected exactly the three declared UI/identity changes'
report = {'format': 'NESForgeBoundedSourceDelta', 'version': 1,
          'referenceCandidate': 'mobile-playback-1', 'referenceHtmlSha256': reference_hash,
          'candidate': 'mobile-keyboard-1',
          'scope': 'Exact direct native keyboard entry and release identity changes only. Reversed before all earlier source guards; this candidate guard is not owner acceptance.',
          'changes': changes}
target = root/'tests/fixtures/mobile-keyboard-source-delta.json'
target.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'fixture': str(target.relative_to(root)), 'referenceHtmlSha256': reference_hash,
                  'changedFiles': [change['path'] for change in changes],
                  'reverseAnchors': sum(len(change['replacements']) for change in changes)}, indent=2))
