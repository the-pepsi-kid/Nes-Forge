"""Build this candidate's complete kit from an extracted recovery-1 kit.

Usage: python reviews/context-cleanup-1/build_documented_kit.py --base-kit PATH
The original 127 documents retain their bytes and preservation records.
"""
from pathlib import Path
import argparse, hashlib, html, json, re, shutil, subprocess, zipfile

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-kit', type=Path, required=True)
args = parser.parse_args()
base = args.base_kit.resolve()
kit = root / 'tester-kit/context-cleanup-1'
assert base != kit and (base / 'DOCUMENTATION_PRESERVATION.json').is_file()
if kit.exists():
    shutil.rmtree(kit)
shutil.copytree(base, kit)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for entry in json.loads((kit / 'DOCUMENTATION_PRESERVATION.json').read_text()):
    assert sha(kit / entry['preserved_path']) == entry['sha256']
shutil.copyfile(root / 'app/mainline/NES_Forge_2.0.0-alpha.11.html', kit / 'NES_Forge.html')
for name in ['NATIVE_RE_RESEARCH_NOTICE.md', 'NinjaGaidenNES_Apache_2.0.txt']:
    shutil.copyfile(root / 'app/docs' / name, kit / 'Reference' / name)
shutil.copyfile(root / 'LICENSE_STATUS.txt', kit / 'Reference/PROJECT_LICENSE_STATUS.txt')

def render(text, css='../style.css'):
    def inline(line):
        line = html.escape(line)
        line = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', line)
        line = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', line)
        return re.sub(r'`([^`]+)`', r'<code>\1</code>', line)
    blocks, listing = [], False
    for line in text.splitlines():
        item = re.match(r'^\d+\. (.*)', line)
        if listing and not item:
            blocks.append('</ol>'); listing = False
        if item:
            if not listing:
                blocks.append('<ol>'); listing = True
            blocks.append('<li>' + inline(item[1]) + '</li>')
        elif line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            blocks.append(f'<h{level}>' + inline(line[level:].strip()) + f'</h{level}>')
        elif line.strip():
            blocks.append('<p>' + inline(line) + '</p>')
    if listing:
        blocks.append('</ol>')
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NES Forge — Scene resources</title><link rel="stylesheet" href="' + css + '"></head><body><main>' + '\n'.join(blocks) + '</main></body></html>\n'

guide = (root / 'app/docs/SCENE_CONTEXT.md').read_text()
guide += '\nSelections made through Scene resources follow the relationships described above. Existing World and native-workbench selectors remain independently usable; full synchronization of every selector and source context remains unfinished.\n'
(kit / 'Guides/Scene_Context.md').write_text(guide)
(kit / 'Guides/Scene_Context.html').write_text(render(guide))
for name in ['START_HERE.html', 'START_HERE.md', 'README.txt']:
    p = kit / name
    s = p.read_text().replace('native-transition-edit-1', 'context-cleanup-1').replace('Kit recovery-1', 'Context cleanup-1').replace('Kit recovery-1', 'Context cleanup-1')
    if name.endswith('.html'):
        s = s.replace('</body>', '<p><a href="Guides/Scene_Context.html" target="_blank">Scene resources — World, room pages, poses and animation navigation</a></p><p><a href="Reference/NATIVE_RE_RESEARCH_NOTICE.md">Native research attribution and license notices</a></p></body>')
    else:
        s += '\nCurrent addition: Scene resources navigator. Read Guides/Scene_Context.html. Audio remains project-wide; full Stage → Scene context remains unfinished.\n'
    p.write_text(s)

# The existing native guide still describes the unchanged native adapter.
for name in ['Guides/Recover_Edit_Build.md', 'Guides/Recover_Edit_Build.html']:
    p = kit / name
    s = p.read_text()
    note = 'The current context-cleanup-1 app retains these native workflows and adds navigation over existing project scenes, room pages, Worlds, poses and clips. Full source Stage/Scene synchronization and scene-to-cue bindings remain unfinished.'
    if name.endswith('.html'):
        s = s.replace('</body>', '<p>' + note + ' <a href="Scene_Context.html">Scene resources guide</a>.</p></body>')
    else:
        s += '\n' + note + ' See [Scene resources](Scene_Context.html).\n'
    p.write_text(s)

historical = kit / 'Historical'
shutil.copyfile(base / 'RECOVERY_HANDOFF.md', historical / 'Recovery_1_Handoff.md')
(kit / 'RECOVERY_HANDOFF.md').write_text('''# Current handoff — context-cleanup-1

This kit contains 2.0.0-alpha.11 / context-cleanup-1, an unpromoted candidate based on source commit 697a998e744c7794fae5d1063748e8d83d5ffe57. Continue from local branch implementation/context-cleanup-2026-10-20 using the included Developer source bundle. The branch has not been pushed: automatic approval review requires explicit owner approval for publication. The source repository and exact app identity are recorded in SOURCE_RECORD.json.

The original nine-step tutorial, manuals, PDFs, illustrations, stylesheet and all 127 delivery documents retain their bytes. Scene resources is a new guide over existing project relationships. Current source governance documents now have one status; their former contents are preserved verbatim in source history.

Expand Scene resources below the app toolbar. Choose a World or recovered room and a scene/page, then open related Worlds, poses or animation clips. Source navigation requires the exact ROM already loaded in RE. Audio remains project-wide. No new Stage schema, native encoder or gameplay translation is introduced. Full Stage → Scene context and scene/event-to-audio bindings remain unfinished.

Ordinary projects write schema 12. Source-bearing native projects write schema 13. Native builds still support only the verified Zelda II location fields; other saved edits can block builds without encoders. Keep source-bearing projects private.

Fresh evidence is under Evidence/Context_Cleanup_Verification.json and matching browser reports. Retained parent application reports refer to native-transition-edit-1, not this changed app. Headless Linux browser results do not establish Windows dialogs, physical devices/controllers, listening, hardware or owner acceptance. The earlier recovery handoff is retained in Historical/Recovery_1_Handoff.md.

No prerelease publication, alpha promotion or main merge is implied. The next implementation should extend explicit context mappings and recover real scene/event-to-cue relationships within the existing architecture.
''')

record = json.loads((kit / 'SOURCE_RECORD.json').read_text())
record['status'] = 'DOCUMENTED_CONTEXT_CLEANUP_REVIEW_CANDIDATE'
record['version'] = 'NES Forge 2.0.0-alpha.11 / context-cleanup-1'
record['documentation_revision'] = 'context-cleanup-1'
record['source_parent_commit'] = record.pop('source_commit')
record['source_branch'] = 'implementation/context-cleanup-2026-10-20'
record['branch_publication'] = 'Local only; GitHub push pending explicit owner approval'
record['source_bundle'] = 'Developer/NES_Forge_Context_Cleanup_1_Source.bundle'
record['source_url'] = 'https://github.com/the-pepsi-kid/Nes-Forge/tree/697a998e744c7794fae5d1063748e8d83d5ffe57'
record['source_commit'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
record['app']['sha256'] = sha(kit / 'NES_Forge.html')
record['evidence'] = {'current': 'Evidence/Context_Cleanup_Verification.json', 'browser': 'Evidence/Scene_Context_Browser.json', 'kit_browser': 'Evidence/Recovery_Browser_Verification.json', 'parent_application': 'Retained Application_Summary.json and Native_Verification.json describe the parent app only.'}
(kit / 'SOURCE_RECORD.json').write_text(json.dumps(record, indent=2) + '\n')
for source, dest in [('Source_Bundle_Verification.json','Source_Bundle_Verification.json'), ('Governance_Verification.json','Governance_Verification.json'), ('Kit_Browser_Verification.json','Recovery_Browser_Verification.json'), ('Native_Context_Verification.json', 'Native_Context_Verification.json'), ('Example_Receipt_Verification.json','Example_Receipt_Verification.json'), ('Browser_Verification.json', 'Scene_Context_Browser.json'), ('Parent_Kit_Browser.json', 'Parent_Kit_Browser.json'), ('Verification.json', 'Context_Cleanup_Verification.json')]:
    p = root / 'reviews/context-cleanup-1' / source
    if p.exists():
        shutil.copyfile(p, kit / 'Evidence' / dest)
shutil.copyfile(base / 'Evidence/CANDIDATE.json', kit / 'Evidence/Parent_CANDIDATE.json')
if (root / 'CANDIDATE.json').is_file():
    shutil.copyfile(root / 'CANDIDATE.json', kit / 'Evidence/CANDIDATE.json')
for source in ['Summary.json', 'scene-context.json', 'context-cleanup-preservation.json']:
    p = root / 'reviews/context-cleanup-1/full-gate' / source
    if p.exists():
        shutil.copyfile(p, kit / 'Evidence' / ('Context_' + source))

(kit / 'Evidence/README.md').write_text('''# Evidence identities

Current candidate evidence: Context_Cleanup_Verification.json, Scene_Context_Browser.json, Native_Context_Verification.json, Recovery_Browser_Verification.json, Source_Bundle_Verification.json and Context_Summary.json. Match each report's app hash to SOURCE_RECORD.json. Example_Receipt_Verification.json covers unchanged saved projects and whole-ROM outputs; Governance_Verification.json covers preserved history.

Application_Summary.json, Browser_Verification.json, Native_Verification.json, Retained_Import_Browser_Verification.json, Recovery_Source_Preservation.json, Parent_CANDIDATE.json and Parent_Kit_Browser.json describe the native-transition-edit-1 parent. They do not certify the changed app. Current status is not inferred from the older records.

Headless and VM checks are separate from native dialogs, physical phones/controllers, audible acceptance, hardware and owner review. The private Zelda II source and source-bearing projects are excluded.
''')

def manifest():
    files = sorted(p for p in kit.rglob('*') if p.is_file() and p.name != 'SHA256SUMS.txt')
    (kit / 'SHA256SUMS.txt').write_text(''.join(sha(p) + '  ' + p.relative_to(kit).as_posix() + '\n' for p in files))

launch = kit / 'verify_launch.cjs'
launch.write_text(launch.read_text().replace("['Guides/Recover_Edit_Build.html', 'Recover, edit and build guide']", "['Guides/Recover_Edit_Build.html', 'Recover, edit and build guide'],\n          ['Guides/Scene_Context.html', 'Scene resources guide']"))

developer = kit / 'Developer'
developer.mkdir(exist_ok=True)
source_bundle = root.parent / 'NES_Forge_Context_Cleanup_1_Source.bundle'
if source_bundle.exists():
    shutil.copyfile(source_bundle, developer / source_bundle.name)
(developer / 'SOURCE_HANDOFF.md').write_text("""# Restore the source checkpoint

The branch is local only. Its GitHub push is pending explicit owner approval after automatic approval review rejected publication during this turn.

The bundle contains the new commits and requires source parent `697a998e744c7794fae5d1063748e8d83d5ffe57`, already in the existing public repository. Clone that repository, then fetch this included bundle:

```sh
git clone https://github.com/the-pepsi-kid/Nes-Forge.git
cd Nes-Forge
git fetch origin 697a998e744c7794fae5d1063748e8d83d5ffe57
git fetch /absolute/path/to/Developer/NES_Forge_Context_Cleanup_1_Source.bundle implementation/context-cleanup-2026-10-20
git switch -c restored-context-cleanup FETCH_HEAD
cd app
python3 tools/bundle.py --check
FORGE_TEST_WORKERS=2 node tests/run_all.cjs
```

This restores the source parts, source manifests, tests, current documentation and exact history, rather than asking the next chat to edit only a generated HTML. The complete documented user kit and matching evidence accompany it. No private ROM or native source-bearing project is included.
""")

manifest()
check = subprocess.run(['python3', str(kit / 'verify_kit.py'), str(kit)], text=True, capture_output=True, check=True)
(kit / 'KIT_VERIFICATION.json').write_text(check.stdout)
manifest()
subprocess.run(['python3', str(kit / 'verify_kit.py'), str(kit)], check=True)
print(json.dumps({'kit': str(kit), 'appSha256': sha(kit / 'NES_Forge.html'), 'zip': 'Finalize after the matching current-kit browser report is copied and the manifest is refreshed.'}))
